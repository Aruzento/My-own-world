import { parsePageRecordContent, createPageStateIdentityFromContent } from '../core/pageRecord.js';
import { isDataObject, assertJSONData, canonicalJSON, parseStrictVariablesJSON } from '../core/pageVariablesCodec.js';
import { CHARACTER_CONDITION_KEYS, createSerializableEffectsData } from '../character/effectsModel.js';
import { deepFreeze } from '../cardTypes/definitionIdentity.js';

// Migration evidence comes from inert persisted HTML, never the forgiving UI reader.
export function extractLegacyEffects(page, { DOMParser: Parser = globalThis.DOMParser } = {}) {
  const evidence = { sourceIdentity: createPageStateIdentityFromContent(page.content), blocks: [], data: [],
    payload: null, canonical: null, normalization: [], explicitEmpty: false, issues: [] };
  const issue = code => evidence.issues.push({ code });
  if (!Parser) { issue('html-reader-unavailable'); return deepFreeze(evidence); }
  try {
    const document = new Parser().parseFromString('', 'text/html');
    const template = document.createElement('template');
    template.innerHTML = parsePageRecordContent(page.content, { generateId: false }).rawBody;
    const blocks = [...template.content.querySelectorAll('.character-effects-block')];
    const data = [...template.content.querySelectorAll('[data-character-effects]')];
    evidence.blocks = blocks.map((block, index) => ({ index, identity: block.getAttribute('data-block-id'),
      html: block.outerHTML, dataIndexes: data.flatMap((element, index) => block.contains(element) ? [index] : []) }));
    evidence.data = data.map((element, index) => ({ index, rawText: element.textContent,
      rawAttribute: element.getAttribute('data-character-effects'), blockIndexes: blocks.flatMap((block, index) => block.contains(element) ? [index] : []) }));
    if (!blocks.length && !data.length) return deepFreeze(evidence);
    if (blocks.length > 1 || data.length > 1 || data.some(element => blocks.filter(block => block.contains(element)).length !== 1)) issue('ambiguous-effects-owner');
    if (blocks.length && !data.length) issue('missing-effects-data');
    if (blocks.length !== 1 || data.length !== 1 || evidence.issues.length) return deepFreeze(evidence);
    const raw = evidence.data[0];
    const text = raw.rawText?.trim(), attribute = raw.rawAttribute?.trim();
    // The historical reader selects raw text first. Whitespace text shadows an
    // attribute payload; choosing that attribute would change observable state.
    if (raw.rawText && !text && attribute) issue('ambiguous-effects-payload-source');
    if (text && attribute && canonicalJSON(parseStrictVariablesJSON(text)) !== canonicalJSON(parseStrictVariablesJSON(attribute))) issue('conflicting-effects-payloads');
    raw.payloadSource = text ? 'text' : 'attribute';
    evidence.payload = parseStrictVariablesJSON(text || attribute || '');
    const validated = validateLegacyEffectsPayload(evidence.payload);
    evidence.issues.push(...validated.issues);
    evidence.canonical = validated.canonical;
    evidence.normalization = validated.normalization;
    evidence.explicitEmpty = Boolean(validated.canonical && !validated.canonical.conditions.length &&
      !validated.canonical.effects.length && !validated.canonical.selectedRuleIds.length);
  } catch (error) { issue(error.code || 'malformed-effects-json'); }
  return deepFreeze(evidence);
}

export function validateLegacyEffectsPayload(payload) {
  const issues = [], normalization = [];
  const bad = (code, path) => issues.push({ code, path });
  const keys = (value, allowed, path) => {
    if (!isDataObject(value)) { bad('invalid-effects-object', path); return false; }
    for (const key of Object.keys(value)) if (!allowed.includes(key)) bad('unsupported-effects-field', `${path}.${key}`);
    return true;
  };
  const text = (value, path, nonempty = false) => {
    if (typeof value !== 'string' || value !== value.trim() || (nonempty && !value)) bad('invalid-effects-string', path);
  };
  const integer = (value, path) => { if (!Number.isSafeInteger(value)) bad('invalid-effects-integer', path); };
  try { assertJSONData(payload); } catch (error) { bad(error.code || 'invalid-effects-data', '$'); }
  if (!keys(payload, ['version', 'conditions', 'effects', 'selectedRuleIds'], '$')) return { issues, normalization, canonical: null };
  if (Object.hasOwn(payload, 'version') && payload.version !== 1) bad('unsupported-effects-version', '$.version');
  for (const key of ['conditions', 'effects']) if (!Array.isArray(payload[key])) bad('missing-effects-collection', key);
  const conditionIds = new Set(), effectIds = new Set();
  for (const [index, condition] of (Array.isArray(payload.conditions) ? payload.conditions : []).entries()) {
    const path = `conditions[${index}]`;
    const key = typeof condition === 'string' ? condition : condition?.key;
    if (typeof condition !== 'string' && !keys(condition, ['key', 'label', 'level', 'source', 'note'], path)) continue;
    if (!CHARACTER_CONDITION_KEYS.includes(key)) bad('unsupported-condition', path);
    if (conditionIds.has(key)) bad('duplicate-condition', path);
    conditionIds.add(key);
    if (typeof condition === 'string') continue;
    for (const name of ['label', 'source', 'note']) if (Object.hasOwn(condition, name)) text(condition[name], `${path}.${name}`);
    if (key === 'exhaustion' && Object.hasOwn(condition, 'level') && (!Number.isSafeInteger(condition.level) || condition.level < 1 || condition.level > 6)) bad('invalid-exhaustion', path);
    if (key !== 'exhaustion' && Object.hasOwn(condition, 'level') && condition.level !== null) bad('unsupported-condition-level', path);
  }
  for (const [index, effect] of (Array.isArray(payload.effects) ? payload.effects : []).entries()) {
    const path = `effects[${index}]`;
    if (!keys(effect, ['id', 'title', 'sourceType', 'sourcePageId', 'sourcePackageId', 'ruleId', 'duration', 'note', 'modifiers', 'flags'], path)) continue;
    text(effect.id, `${path}.id`, true);
    if (effectIds.has(effect.id)) bad('duplicate-effect-id', path);
    effectIds.add(effect.id);
    for (const name of ['title', 'sourcePageId', 'sourcePackageId', 'ruleId', 'duration', 'note']) if (Object.hasOwn(effect, name)) text(effect[name], `${path}.${name}`);
    if (Object.hasOwn(effect, 'sourceType') && !['manual', 'condition', 'item', 'spell', 'skill', 'feature', 'rule', 'world-package'].includes(effect.sourceType)) bad('unsupported-effect-source', path);
    if (Object.hasOwn(effect, 'modifiers') && keys(effect.modifiers, ['armorClass', 'speed', 'initiative', 'proficiencyBonus', 'abilityScores', 'abilityChecks', 'savingThrows', 'skills'], `${path}.modifiers`)) {
      for (const [name, value] of Object.entries(effect.modifiers)) {
        if (['armorClass', 'speed', 'initiative', 'proficiencyBonus'].includes(name)) integer(value, `${path}.${name}`);
        else if (isDataObject(value)) for (const [key, number] of Object.entries(value)) { text(key, `${path}.${name}.key`, true); integer(number, `${path}.${name}.${key}`); }
        else bad('invalid-modifier-map', `${path}.${name}`);
      }
    }
    if (Object.hasOwn(effect, 'flags') && keys(effect.flags, ['concentration', 'magical', 'harmful'], `${path}.flags`)) {
      for (const [key, value] of Object.entries(effect.flags)) if (typeof value !== 'boolean') bad('invalid-effect-flag', `${path}.${key}`);
    }
  }
  if (Object.hasOwn(payload, 'selectedRuleIds')) {
    if (!Array.isArray(payload.selectedRuleIds)) bad('invalid-rule-selections', 'selectedRuleIds');
    else for (const value of payload.selectedRuleIds) if (typeof value !== 'string' || !value.trim()) bad('invalid-rule-selection', 'selectedRuleIds');
  }
  if (issues.length) return { issues, normalization, canonical: null };
  const canonical = createSerializableEffectsData(payload);
  // Only known optional/default representations and approved id-list normalization.
  if (canonicalJSON(payload) !== canonicalJSON(canonical)) normalization.push({ code: 'existing-effects-model-optional-defaults',
    before: payload, after: canonical });
  return { issues, normalization, canonical };
}
