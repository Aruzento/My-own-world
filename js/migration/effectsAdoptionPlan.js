import { extractLegacyEffects } from './legacyEffectsExtraction.js';
import { readEntity } from '../variables/entityVariables.js';
import { createCardVariableSnapshot } from '../variables/cardVariableStore.js';
import { createPageStateIdentityFromContent, updatePageRecordContent } from '../core/pageRecord.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';
import { deepCloneData, deepFreeze, createDefinitionIdentity } from '../cardTypes/definitionIdentity.js';
import { OWN_EFFECTS_FIELD_SET, OWN_EFFECTS_FIELD_SET_ID, OWN_EFFECTS_KEY, encodeOwnEffects } from '../character/ownEffectsDefinition.js';
import { readOwnEffectsSource } from '../character/ownEffectsSource.js';

export const effectsFieldSetIdentity = createDefinitionIdentity('fieldSet', OWN_EFFECTS_FIELD_SET);
const valid = snapshot => snapshot.mode === 'structured' && !snapshot.diagnostics.some(issue => issue.severity === 'error');

export function planEffectsAdoption(pages, { registry, pageIds, ...reader } = {}) {
  const repository = { getPageById: id => pages.find(page => page.id === id) };
  const selected = [...new Set(pageIds || pages.filter(page => ['character', 'player'].includes(page.type)).map(page => page.id))];
  const plans = [];
  const actors = selected.map(pageId => {
    const page = repository.getPageById(pageId);
    if (!page) throw new Error('Missing selected actor');
    const snapshot = readEntity(pageId, { registry, repository });
    const issues = [];
    const declared = snapshot.extensions?.fields.filter(field => field.id === OWN_EFFECTS_FIELD_SET_ID) || [];
    const stored = Object.hasOwn(snapshot.values, OWN_EFFECTS_KEY);
    let status = 'ready', evidence = null, candidate = null;
    const issue = code => issues.push({ code });
    if (declared.some(field => field.version !== 1)) { status = 'blocked'; issue('own-effects-version-unsupported'); }
    else if (snapshot.variablesMode === 'structured' && Boolean(declared.length) !== stored) { status = 'partial-source'; issue('partial-own-effects-source'); }
    else if (!valid(snapshot) || !['character', 'player'].includes(snapshot.type) || snapshot.definition?.definition.capabilities?.characterProjection !== true) {
      status = 'unsupported/unavailable'; issue('structured-actor-unavailable');
    } else if (!page.path || page.path.replace(/^\//, '') !== `pages/${page.name}`) { status = 'blocked'; issue('durable-actor-path-required'); }
    else {
      try {
        const identity = createDefinitionIdentity('fieldSet', registry.getFieldSetDefinition(OWN_EFFECTS_FIELD_SET_ID, 1));
        if (canonicalJSON(identity) !== canonicalJSON(effectsFieldSetIdentity) || registry.getResolvedFieldSet(OWN_EFFECTS_FIELD_SET_ID, 1).source !== 'activated') throw new Error('exact-activated-own-effects-definition-required');
        if (declared.length) {
          if (declared.length !== 1 || declared[0].version !== 1 || readOwnEffectsSource(page, { registry, repository }).source !== 'entity') throw new Error('noncanonical-own-effects-source');
          status = 'already-adopted';
        } else {
          evidence = extractLegacyEffects(page, reader);
          issues.push(...evidence.issues);
          status = issues.length ? 'blocked' : !evidence.blocks.length && !evidence.data.length ? 'no-effects' : 'ready';
          if (status === 'ready') {
            const envelope = deepCloneData(snapshot.envelope);
            envelope.extensions = { ...(envelope.extensions || {}), revision: (envelope.extensions?.revision || 0) + 1,
              fields: [...(envelope.extensions?.fields || []), { id: OWN_EFFECTS_FIELD_SET_ID, version: 1 }] };
            envelope.values[OWN_EFFECTS_KEY] = encodeOwnEffects(evidence.canonical);
            const content = updatePageRecordContent(page.content, { variablesJson: envelope }, { preserveUnchangedMetadata: true, updateTimestamp: false });
            const after = createCardVariableSnapshot({ id: page.id, content }, registry);
            if (!valid(after) || readOwnEffectsSource({ ...page, content }, { registry }).source !== 'entity') throw new Error('invalid-own-effects-candidate');
            candidate = { pageId, path: page.path.replace(/^\//, ''), name: page.name, sourceContent: page.content, targetContent: content,
              sourceIdentity: snapshot.pageIdentity, targetIdentity: createPageStateIdentityFromContent(content),
              schema: { type: snapshot.type, version: snapshot.schemaVersion, digest: snapshot.schemaDigest, definition: after.definition },
              own: evidence.canonical, value: envelope.values[OWN_EFFECTS_KEY], fieldSet: identity };
            plans.push(candidate);
          }
        }
      } catch (error) { status = 'blocked'; issue(error.message); }
    }
    return { pageId, path: page.path, type: snapshot.type, sourceIdentity: snapshot.pageIdentity, sourceState: snapshot.mode,
      status, issues, evidence, legacyBlockCount: evidence?.blocks.length || 0, dataCount: evidence?.data.length || 0,
      explicitEmpty: evidence?.explicitEmpty || false, normalization: evidence?.normalization || [],
      counts: { conditions: evidence?.canonical?.conditions.length || 0, effects: evidence?.canonical?.effects.length || 0,
        selectedRuleIds: evidence?.canonical?.selectedRuleIds.length || 0 }, existingExtensions: snapshot.extensions,
      targetFieldSet: effectsFieldSetIdentity, targetValue: candidate?.value || null, targetIdentity: candidate?.targetIdentity || null, preservedBody: true };
  });
  const count = status => actors.filter(actor => actor.status === status).length;
  const hasIssue = pattern => actors.filter(actor => actor.issues.some(issue => pattern.test(issue.code))).length;
  return deepFreeze(deepCloneData({ kind: 'EffectsAdoptionPreview', version: 1, selectedActorIds: selected,
    actors, pages: plans, summary: { readyActors: count('ready'), blockedActors: count('blocked') + count('partial-source') + count('unsupported/unavailable'),
      explicitEmpty: actors.filter(actor => actor.status === 'ready' && actor.explicitEmpty).length,
      noEffects: count('no-effects'), alreadyAdopted: count('already-adopted'), malformed: hasIssue(/malformed|invalid|missing-effects/),
      ambiguous: hasIssue(/ambiguous|conflicting|duplicate/), unsupportedVersion: hasIssue(/version/) } }));
}
