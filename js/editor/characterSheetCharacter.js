import { readCharacterGameplay } from '../character/characterGameplaySource.js';
import { DND_CHECKS, DND_ABILITIES } from '../character/dndCheckContract.js';
import { CHARACTER_SKILLS_KEY, CHARACTER_DEATH_KEY } from '../character/characterGameplayDefinition.js';
import { prepareCharacterGameplayActivation, commitCharacterGameplayActivation } from '../character/characterGameplayCommands.js';
import { canonicalJSON, isDataObject } from '../core/pageVariablesCodec.js';
import { createRuntimePageFromContent, parsePageRecordContent, createPageStateIdentityFromContent, arePageStateIdentitiesEqual } from '../core/pageRecord.js';
import {
  commitStructuredCharacterHealthChange,
  inspectStructuredCharacterHealthSource,
  prepareStructuredCharacterHealthChange
} from '../character/structuredCharacterHealth.js';
import { readCharacterModelFromPage } from '../character/characterModel.js';
import {
  commitVariablesChange,
  getValue,
  prepareVariablesChange,
  readEntity
} from '../variables/entityVariables.js';
import {
  createCardTypeRegistryFromCatalog,
  readCardTypeCatalog
} from '../storage/cardTypeCatalogStorage.js';
import {
  assertStorageWorkspaceContext,
  captureStorageWorkspaceContext
} from '../storage/storageAdapter.js';
import { deepCloneData, deepFreeze } from '../cardTypes/definitionIdentity.js';


export const CHARACTER_SHEET_ERROR_CODES = Object.freeze({
  SOURCE_UNAVAILABLE: 'CHARACTER_SHEET_SOURCE_UNAVAILABLE',
  CATALOG_UNAVAILABLE: 'CHARACTER_SHEET_CATALOG_UNAVAILABLE',
  INVALID_FIELD: 'CHARACTER_SHEET_FIELD_INVALID',
  INVALID_VALUE: 'CHARACTER_SHEET_VALUE_INVALID',
  EXPLICIT_ABILITIES_REQUIRED: 'CHARACTER_SHEET_EXPLICIT_ABILITIES_REQUIRED',
  EXPLICIT_SOURCE_REQUIRED: 'CHARACTER_SHEET_EXPLICIT_SOURCE_REQUIRED',
  WRITE_BLOCKED: 'CHARACTER_SHEET_WRITE_BLOCKED',
  WRITE_UNCERTAIN: 'CHARACTER_SHEET_WRITE_UNCERTAIN',
  DOMAIN_READBACK_FAILED: 'CHARACTER_SHEET_DOMAIN_READBACK_FAILED'
});

const ABILITY_FIELDS = Object.freeze(Object.fromEntries(Object.entries(DND_ABILITIES).map(([key, id]) => [key, `character.abilities.${id}`])));

const plans = new WeakMap();


export function createLegacyCharacterSheetContext({ page, pages = [] } = {}) {
  return Object.freeze({
    kind: 'CharacterSheetContext', version: 1, mode: 'legacy-only',
    pageId: page?.id || '', registry: null, repository: createRepository(page, pages),
    workspaceContext: null, catalogIdentity: null, reason: ''
  });
}


export async function prepareCharacterSheetContext({
  page,
  pages = [],
  storageAdapter = null,
  workspaceContext = null
} = {}) {
  if (!page?.id) return unavailableContext(page, pages, null, 'missing-page');
  if (!isStructuredPage(page)) return createLegacyCharacterSheetContext({ page, pages });

  let captured = workspaceContext;
  try {
    captured ||= captureStorageWorkspaceContext();
    assertStorageWorkspaceContext(captured);
    const current = await readCardTypeCatalog({
      storageAdapter: storageAdapter || captured.adapter
    });
    if (!current.exists) return unavailableContext(page, pages, captured, 'activated-catalog-missing');
    const registry = createCardTypeRegistryFromCatalog(current.catalog, {
      bundledTypes: [], bundledFieldSets: []
    });
    const context = Object.freeze({
      kind: 'CharacterSheetContext', version: 1, mode: 'source-aware',
      pageId: page.id, registry, repository: createRepository(page, pages),
      workspaceContext: captured, catalogIdentity: current.identity, reason: ''
    });
    const source = readCharacterSheetCharacter(page, { pages, context });
    return source.status === 'ready'
      ? context
      : unavailableContext(page, pages, captured, source.reason || 'structured-source-unavailable');
  } catch (error) {
    return unavailableContext(
      page, pages, captured,
      error?.code || error?.message || 'catalog-unavailable'
    );
  }
}


export function readCharacterSheetCharacter(page, { pages = [], context } = {}) {
  if (!page?.id) return unavailableSource('missing-page');
  const structured = isStructuredPage(page);
  if (!structured && !['character', 'creature'].includes(page.type)) return unavailableSource('legacy-sheet-type-unsupported');
  if (structured && !context?.registry) return unavailableSource(context?.reason || 'activated-catalog-required');

  const model = readCharacterModelFromPage(page, {
    pages,
    ...(structured ? {
      registry: context.registry,
      repository: context.repository
    } : {})
  });

  if (!structured) {
    return Object.freeze({
      status: 'ready', source: 'legacy', model, reason: ''
    });
  }
  if (model.source !== 'entity' || !['character', 'player'].includes(model.cardType)) {
    return unavailableSource(
      model.source === 'structured-unavailable'
        ? 'structured-source-unavailable'
        : 'character-sheet-capability-required',
      model
    );
  }
  const snapshot = readEntity(page.id, context);
  return Object.freeze({ status: 'ready', source: 'structured', model, reason: '',
    presentation: readSheetPresentation(snapshot, context) });
}


export function prepareStructuredCharacterSheetChange({
  page,
  field,
  value,
  expectedBase,
  pages = [],
  context
} = {}) {
  assertStructuredContext(page, context);
  const normalized = normalizeFieldValue(field, value);
  let underlying = null;
  let before;
  let after;
  let targetKey;
  let activation = false;

  if (field === 'hpCurrent' || field === 'hpTemp' || field === 'hpMax') {
    const inspection = inspectStructuredCharacterHealthSource({
      pageId: page.id,
      expectedBase,
      context: structuredContext(context, pages)
    });
    before = inspection.health;
    after = {
      current: field === 'hpCurrent' ? normalized : before.current,
      max: field === 'hpMax' ? normalized : before.max,
      temp: field === 'hpTemp' ? normalized : before.temp
    };
    underlying = sameValue(before, after)
      ? null
      : prepareStructuredCharacterHealthChange({
        pageId: page.id,
        expectedBase,
        request: field === 'hpMax'
          ? { type: 'maximum', hpMax: after.max }
          : { type: 'exact', hpCurrent: after.current, hpTemp: after.temp },
        context: structuredContext(context, pages)
      });
    targetKey = 'dnd.health';
  } else {
    const snapshot = readEntity(page.id, {
      registry: context.registry,
      repository: context.repository
    });
    if (snapshot.mode !== 'structured' || !['character', 'player'].includes(snapshot.type) ||
        snapshot.definition?.definition?.capabilities?.characterProjection !== true) {
      throw sheetError(CHARACTER_SHEET_ERROR_CODES.SOURCE_UNAVAILABLE, 'structured-source-unavailable');
    }
    if (snapshot.type === 'character' && (checkField(field) || ['deathSaveSuccesses', 'deathSaveFailures'].includes(field))) {
      ({ targetKey, before, after } = prepareCharacterGameplayField(snapshot, field, normalized, context));
      if (readCharacterGameplay(snapshot, context).status === 'absent') {
        underlying = prepareCharacterGameplayActivation({ page, expectedBase, key: targetKey, value: after, context });
        activation = true;
      }
    } else if (snapshot.type === 'player') {
      const patch = preparePlayerField(snapshot, field, normalized, context);
      ({ targetKey, before, after } = patch);
    } else if (field === 'level') {
      targetKey = 'dnd.level';
      const stored = getValue(snapshot, targetKey, 'stored', {
        registry: context.registry,
        repository: context.repository
      });
      before = stored.status === 'value' ? stored.value : undefined;
      after = normalized;
    } else if (Object.hasOwn(ABILITY_FIELDS, field)) {
      targetKey = 'character.abilities';
      const stored = getValue(snapshot, targetKey, 'stored', {
        registry: context.registry,
        repository: context.repository
      });
      if (stored.status !== 'value' || !isDataObject(stored.value)) {
        throw sheetError(
          CHARACTER_SHEET_ERROR_CODES.EXPLICIT_ABILITIES_REQUIRED,
          'explicit-abilities-required'
        );
      }
      before = deepCloneData(stored.value);
      after = deepCloneData(stored.value);
      after[ABILITY_FIELDS[field]] = normalized;
    } else {
      throw sheetError(CHARACTER_SHEET_ERROR_CODES.INVALID_FIELD, 'field-not-editable');
    }

    if (!activation && !sameValue(before, after)) {
      underlying = prepareVariablesChange({
        pageId: page.id,
        expectedBase,
        patch: [{ op: 'set', key: targetKey, value: after }],
        context: structuredContext(context, pages)
      });
    }
  }

  const plan = deepFreeze(deepCloneData({
    kind: 'StructuredCharacterSheetChangePlan', version: 1,
    pageId: page.id, field, targetKey, before, after,
    expectedBase, changed: Boolean(underlying),
    schema: underlying?.schema || {
      type: page.type, version: null, digest: null
    },
    guards: {
      wholePage: true, schemaClosure: true, workspace: true,
      source: 'entity', rebase: false
    }
  }));
  plans.set(plan, { used: false, underlying, activation, context, pages, field, type: page.type,
    path: page.path, name: page.name });
  return plan;
}


export async function commitStructuredCharacterSheetChange(plan) {
  const captured = plans.get(plan);
  if (!captured || captured.used) {
    return result('blocked', false, CHARACTER_SHEET_ERROR_CODES.WRITE_BLOCKED, 'unknown-or-used-plan');
  }
  captured.used = true;
  if (!plan.changed) {
    try { await validateNoop(plan, captured); return result('unchanged', false, null, 'value-unchanged', { plan }); }
    catch (error) { return result('blocked', false, CHARACTER_SHEET_ERROR_CODES.WRITE_BLOCKED, error.message); }
  }

  const committed = captured.activation ? await commitCharacterGameplayActivation(captured.underlying) : plan.targetKey === 'dnd.health'
    ? await commitStructuredCharacterHealthChange(captured.underlying)
    : await commitVariablesChange(captured.underlying, { validateBeforeWrite: async () => {
      const current = await readCardTypeCatalog({ storageAdapter: captured.context.workspaceContext.adapter });
      if (!current.exists || canonicalJSON(current.identity) !== canonicalJSON(captured.context.catalogIdentity)) throw new Error('Catalog changed');
    } });
  if (committed.status !== 'saved') {
    return result(
      committed.status,
      committed.written,
      committed.written === true
        ? CHARACTER_SHEET_ERROR_CODES.WRITE_UNCERTAIN
        : CHARACTER_SHEET_ERROR_CODES.WRITE_BLOCKED,
      committed.reason || 'structured-write-unconfirmed',
      { plan, underlyingResult: committed }
    );
  }

  try {
    assertStorageWorkspaceContext(captured.context.workspaceContext);
    const content = await captured.context.workspaceContext.adapter.readText(captured.path);
    assertStorageWorkspaceContext(captured.context.workspaceContext);
    const page = createRuntimePageFromContent({ content, path: captured.path, name: captured.name });
    const context = { ...captured.context, repository: {
      getPageById(id) { return id === plan.pageId ? page : captured.context.repository.getPageById(id); }
    } };
    const source = readCharacterSheetCharacter(page, {
      pages: captured.pages,
      context
    });
    if (source.status !== 'ready' || source.source !== 'structured') {
      throw new Error('CharacterModel source unavailable after write');
    }
    const actual = projectedValue(source.model, captured.field);
    const expected = checkField(captured.field) || plan.targetKey === CHARACTER_DEATH_KEY
      ? patchedValue(plan.after, captured.field, captured.type)
      : plan.targetKey === 'dnd.health'
      ? projectedValue({ health: plan.after }, captured.field)
      : captured.type === 'player'
        ? playerPatchedValue(plan.after, captured.field)
        : captured.field === 'level'
        ? plan.after
        : plan.after[ABILITY_FIELDS[captured.field]];
    if (!sameValue(actual, expected)) throw new Error('CharacterModel value mismatch after write');
    return result('saved', true, null, '', {
      plan,
      underlyingResult: committed,
      verification: {
        source: source.model.source,
        field: captured.field,
        value: actual
      }
    });
  } catch (error) {
    return result(
      'uncertain', true,
      CHARACTER_SHEET_ERROR_CODES.DOMAIN_READBACK_FAILED,
      String(error?.message || error),
      { plan, underlyingResult: committed }
    );
  }
}


export function isStructuredCharacterSheetPage(page) {
  return isStructuredPage(page);
}


function normalizeFieldValue(field, raw) {
  const check = checkField(field);
  if (check && ['proficient', 'expertise'].includes(check.member)) {
    if (typeof raw !== 'boolean') throw sheetError(CHARACTER_SHEET_ERROR_CODES.INVALID_VALUE, 'boolean-required');
    return raw;
  }
  if (check?.member === 'bonus') {
    const text = String(raw ?? '').trim();
    if (!text || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || !Number.isFinite(Number(text))) throw sheetError(CHARACTER_SHEET_ERROR_CODES.INVALID_VALUE, 'number-required');
    return Number(text);
  }
  const text = String(raw ?? '').trim();
  if (!/^-?\d+$/.test(text)) {
    throw sheetError(CHARACTER_SHEET_ERROR_CODES.INVALID_VALUE, 'integer-required');
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value)) {
    throw sheetError(CHARACTER_SHEET_ERROR_CODES.INVALID_VALUE, 'safe-integer-required');
  }
  if (Object.hasOwn(ABILITY_FIELDS, field) && (value < 1 || value > 30)) {
    throw sheetError(CHARACTER_SHEET_ERROR_CODES.INVALID_VALUE, 'ability-out-of-range');
  }
  if ((field === 'hpCurrent' || field === 'hpTemp') && value < 0) {
    throw sheetError(CHARACTER_SHEET_ERROR_CODES.INVALID_VALUE, 'health-out-of-range');
  }
  return value;
}


function projectedValue(model, field) {
  const check = checkField(field);
  if (check) return model.calculations?.checks?.byKey?.[check.key]?.inputs?.[check.member];
  if (field === 'level') return model.level;
  if (Object.hasOwn(ABILITY_FIELDS, field)) return model.abilities?.[field]?.score;
  if (field === 'hpCurrent') return model.health?.current;
  if (field === 'hpTemp') return model.health?.temp;
  if (field === 'hpMax') return model.health?.max;
  if (field === 'deathSaveSuccesses') return model.deathSaves?.successes;
  if (field === 'deathSaveFailures') return model.deathSaves?.failures;
  return undefined;
}


function structuredContext(context, pages) {
  return {
    registry: context.registry,
    repository: context.repository,
    workspaceContext: context.workspaceContext,
    pages
  };
}


function assertStructuredContext(page, context) {
  if (!page?.id || !isStructuredPage(page) || context?.mode !== 'source-aware' || !context.registry) {
    throw sheetError(CHARACTER_SHEET_ERROR_CODES.SOURCE_UNAVAILABLE, 'structured-context-required');
  }
  if (!['character', 'player'].includes(page.type) || readCharacterSheetCharacter(page, { context }).status !== 'ready') {
    throw sheetError(CHARACTER_SHEET_ERROR_CODES.SOURCE_UNAVAILABLE, 'character-sheet-capability-required');
  }
  assertStorageWorkspaceContext(context.workspaceContext);
}

// Player objects keep their own nested identities. A Sheet edit patches an
// explicit owner; presentation defaults never become writable evidence.
function preparePlayerField(snapshot, field, value, context) {
  const check = checkField(field);
  const targetKey = check ? (check.isSave ? 'player.abilities' : 'player.skills') : field === 'level' ? 'player.progression'
    : Object.hasOwn(ABILITY_FIELDS, field) ? 'player.abilities'
    : ['deathSaveSuccesses', 'deathSaveFailures'].includes(field) ? 'player.deathSaves' : null;
  if (!targetKey) throw sheetError(CHARACTER_SHEET_ERROR_CODES.INVALID_FIELD, 'field-not-editable');
  const stored = getValue(snapshot, targetKey, 'stored', context);
  if (!check && (stored.status !== 'value' || !isDataObject(stored.value))) {
    throw sheetError(CHARACTER_SHEET_ERROR_CODES.EXPLICIT_SOURCE_REQUIRED, `explicit-${targetKey}-required`);
  }
  const before = stored.status === 'value' ? deepCloneData(stored.value) : undefined;
  const after = deepCloneData(before || {});
  if (check) {
    const key = check.isSave ? `player.abilities.${check.abilityId}` : `player.skills.${check.id}`;
    after[key] ||= {};
    after[key][`${key}.${check.isSave ? check.member === 'proficient' ? 'saveProficient' : 'saveBonus' : check.member}`] = value;
  } else if (field === 'level') {
    after['dnd.level'] = value;
  } else if (Object.hasOwn(ABILITY_FIELDS, field)) {
    const key = ABILITY_FIELDS[field].replace('character.', 'player.');
    if (!isDataObject(after[key]) || !Object.hasOwn(after[key], `${key}.score`)) {
      throw sheetError(CHARACTER_SHEET_ERROR_CODES.EXPLICIT_ABILITIES_REQUIRED, 'explicit-ability-score-required');
    }
    after[key][`${key}.score`] = value;
  } else {
    if (!['successes', 'failures'].every(key => Number.isSafeInteger(after[`player.deathSaves.${key}`]))) {
      throw sheetError(CHARACTER_SHEET_ERROR_CODES.EXPLICIT_SOURCE_REQUIRED, 'explicit-death-saves-required');
    }
    after[`player.deathSaves.${field === 'deathSaveSuccesses' ? 'successes' : 'failures'}`] = value;
  }
  return { targetKey, before, after };
}

function playerPatchedValue(value, field) {
  if (checkField(field)) return patchedValue(value, field, 'player');
  if (field === 'level') return value['dnd.level'];
  if (Object.hasOwn(ABILITY_FIELDS, field)) {
    const key = ABILITY_FIELDS[field].replace('character.', 'player.');
    return value[key][`${key}.score`];
  }
  return value[`player.deathSaves.${field === 'deathSaveSuccesses' ? 'successes' : 'failures'}`];
}

function readSheetPresentation(snapshot, context) {
  const health = getValue(snapshot, 'dnd.health', 'stored', context);
  const hitDice = snapshot.type === 'player'
    ? (health.value?.['player.health.hitDice'] || []).map(row => row['player.health.hitDice.die']).filter(Boolean).join(', ')
    : health.value?.['character.health.hitDice'];
  if (snapshot.type !== 'player') return { hitDice, writable: { checks: readCharacterGameplay(snapshot, context).status !== 'unavailable', deathSaves: readCharacterGameplay(snapshot, context).status !== 'unavailable' } };
  const stored = key => getValue(snapshot, key, 'stored', context);
  const progression = stored('player.progression');
  const abilities = stored('player.abilities');
  const death = stored('player.deathSaves');
  const identity = stored('player.identity');
  const labels = {};
  const diagnostics = [];
  let healthWritable = false;
  try {
    inspectStructuredCharacterHealthSource({ pageId: snapshot.pageId, context });
    healthWritable = true;
  } catch { /* Presentation defaults remain read-only health evidence. */ }
  for (const [id, type] of [['race', 'race'], ['subrace', 'race'], ['class', 'class'], ['subclass', 'class']]) {
    const reference = identity.status === 'value' ? identity.value?.[`player.identity.${id}`] : null;
    if (!reference) continue;
    const target = readEntity(reference.pageId, context);
    if (['legacy', 'structured'].includes(target.mode) && target.type === type &&
        !target.diagnostics?.some(issue => issue.severity === 'error') && context.registry.listTypeVersions(type).length) {
      labels[id] = context.repository.getPageById(reference.pageId)?.title || '—';
    } else diagnostics.push({ field: `player.identity.${id}`, reason: 'reference-unavailable', pageId: reference.pageId });
  }
  return deepFreeze({ identity: labels, diagnostics, hitDice, writable: {
    checks: true,
    health: healthWritable,
    level: progression.status === 'value' && isDataObject(progression.value),
    ...Object.fromEntries(Object.entries(ABILITY_FIELDS).map(([field, characterKey]) => {
      const key = characterKey.replace('character.', 'player.');
      return [field, abilities.status === 'value' && isDataObject(abilities.value?.[key]) && Object.hasOwn(abilities.value[key], `${key}.score`)];
    })),
    deathSaves: death.status === 'value' && ['successes', 'failures'].every(key => Number.isSafeInteger(death.value?.[`player.deathSaves.${key}`]))
  } });
}


function createRepository(page, pages) {
  const byId = new Map(
    [...(pages || []), page].filter(candidate => candidate?.id).map(candidate => [candidate.id, candidate])
  );
  return Object.freeze({
    getPageById(id) { return byId.get(id) || null; }
  });
}


function unavailableContext(page, pages, workspaceContext, reason) {
  return Object.freeze({
    kind: 'CharacterSheetContext', version: 1, mode: 'structured-unavailable',
    pageId: page?.id || '', registry: null, repository: createRepository(page, pages),
    workspaceContext: workspaceContext || null, catalogIdentity: null,
    reason: String(reason || 'structured-source-unavailable')
  });
}


function unavailableSource(reason, model = null) {
  return Object.freeze({
    status: 'unavailable', source: 'structured-unavailable', model,
    reason: String(reason || 'structured-source-unavailable')
  });
}


function isStructuredPage(page) {
  if (!page?.content) return false;
  return parsePageRecordContent(page.content, { generateId: false })
    .variablesStatus.mode !== 'legacy';
}


function sameValue(left, right) {
  return canonicalJSON(left) === canonicalJSON(right);
}


function sheetError(code, reason) {
  const error = new Error(reason);
  error.name = 'CharacterSheetError';
  error.code = code;
  error.reason = reason;
  return error;
}


function result(status, written, code, reason, details = {}) {
  return deepFreeze(deepCloneData({
    kind: 'CharacterSheetCommitResult', version: 1,
    status, written, code, reason, ...details
  }));
}

export function checkField(field) {
  const [key, member, extra] = String(field).split('.');
  const check = DND_CHECKS.find(item => item.key === key);
  return check && !extra && (check.isSave ? ['proficient', 'bonus'] : ['proficient', 'expertise', 'bonus']).includes(member) ? { ...check, member } : null;
}
function prepareCharacterGameplayField(snapshot, field, value, context) {
  const gameplay = readCharacterGameplay(snapshot, context);
  const check = checkField(field);
  if (gameplay.status === 'unavailable' || check?.isSave) throw sheetError(CHARACTER_SHEET_ERROR_CODES.SOURCE_UNAVAILABLE, 'character-gameplay-unavailable');
  const targetKey = check ? CHARACTER_SKILLS_KEY : CHARACTER_DEATH_KEY;
  const stored = getValue(snapshot, targetKey, 'stored', context);
  const before = stored.status === 'value' ? deepCloneData(stored.value) : undefined;
  const after = deepCloneData(before || (check ? {} : { [`${CHARACTER_DEATH_KEY}.successes`]: 0, [`${CHARACTER_DEATH_KEY}.failures`]: 0 }));
  if (check) {
    const key = `${CHARACTER_SKILLS_KEY}.${check.id}`;
    after[key] ||= {};
    after[key][`${key}.${check.member}`] = value;
  } else after[`${CHARACTER_DEATH_KEY}.${field === 'deathSaveSuccesses' ? 'successes' : 'failures'}`] = value;
  return { targetKey, before, after };
}
function patchedValue(value, field, type) {
  const check = checkField(field);
  if (!check) return value[`${CHARACTER_DEATH_KEY}.${field === 'deathSaveSuccesses' ? 'successes' : 'failures'}`];
  const key = check.isSave ? `player.abilities.${check.abilityId}` : `${type === 'player' ? 'player.skills' : CHARACTER_SKILLS_KEY}.${check.id}`;
  return value[key][`${key}.${check.isSave ? check.member === 'proficient' ? 'saveProficient' : 'saveBonus' : check.member}`];
}
async function validateNoop(plan, captured) {
  const { context } = captured;
  assertStorageWorkspaceContext(context.workspaceContext);
  const page = context.repository.getPageById(plan.pageId);
  if (!page || page.path !== captured.path) throw new Error('Missing/moved page');
  const content = await context.workspaceContext.adapter.readText(captured.path);
  if (!arePageStateIdentitiesEqual(plan.expectedBase, createPageStateIdentityFromContent(content))) throw new Error('Stale Sheet no-op');
  const current = await readCardTypeCatalog({ storageAdapter: context.workspaceContext.adapter });
  if (!current.exists || canonicalJSON(current.identity) !== canonicalJSON(context.catalogIdentity)) throw new Error('Catalog changed');
  assertStorageWorkspaceContext(context.workspaceContext);
}

export const validateStructuredCharacterSheetInput = normalizeFieldValue;
