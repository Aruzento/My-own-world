import { canonicalJSON, isDataObject } from '../core/pageVariablesCodec.js';
import { parsePageRecordContent } from '../core/pageRecord.js';
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
  WRITE_BLOCKED: 'CHARACTER_SHEET_WRITE_BLOCKED',
  WRITE_UNCERTAIN: 'CHARACTER_SHEET_WRITE_UNCERTAIN',
  DOMAIN_READBACK_FAILED: 'CHARACTER_SHEET_DOMAIN_READBACK_FAILED'
});

const ABILITY_FIELDS = Object.freeze({
  str: 'character.abilities.strength',
  dex: 'character.abilities.dexterity',
  con: 'character.abilities.constitution',
  int: 'character.abilities.intelligence',
  wis: 'character.abilities.wisdom',
  cha: 'character.abilities.charisma'
});

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
  if (model.source !== 'entity' || model.cardType !== 'character') {
    return unavailableSource(
      model.source === 'structured-unavailable'
        ? 'structured-source-unavailable'
        : 'character-sheet-capability-required',
      model
    );
  }
  return Object.freeze({ status: 'ready', source: 'structured', model, reason: '' });
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
    if (snapshot.mode !== 'structured' || snapshot.type !== 'character') {
      throw sheetError(CHARACTER_SHEET_ERROR_CODES.SOURCE_UNAVAILABLE, 'structured-source-unavailable');
    }
    if (field === 'level') {
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

    if (!sameValue(before, after)) {
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
      type: 'character', version: null, digest: null
    },
    guards: {
      wholePage: true, schemaClosure: true, workspace: true,
      source: 'entity', rebase: false
    }
  }));
  plans.set(plan, { used: false, underlying, context, pages, field });
  return plan;
}


export async function commitStructuredCharacterSheetChange(plan) {
  const captured = plans.get(plan);
  if (!captured || captured.used) {
    return result('blocked', false, CHARACTER_SHEET_ERROR_CODES.WRITE_BLOCKED, 'unknown-or-used-plan');
  }
  captured.used = true;
  if (!plan.changed) return result('unchanged', false, null, 'value-unchanged', { plan });

  const committed = plan.targetKey === 'dnd.health'
    ? await commitStructuredCharacterHealthChange(captured.underlying)
    : await commitVariablesChange(captured.underlying);
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
    const page = captured.context.repository.getPageById(plan.pageId);
    const source = readCharacterSheetCharacter(page, {
      pages: captured.pages,
      context: captured.context
    });
    if (source.status !== 'ready' || source.source !== 'structured') {
      throw new Error('CharacterModel source unavailable after write');
    }
    const actual = projectedValue(source.model, captured.field);
    const expected = plan.targetKey === 'dnd.health'
      ? projectedValue({ health: plan.after }, captured.field)
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
  if (field === 'level') return model.level;
  if (Object.hasOwn(ABILITY_FIELDS, field)) return model.abilities?.[field]?.score;
  if (field === 'hpCurrent') return model.health?.current;
  if (field === 'hpTemp') return model.health?.temp;
  if (field === 'hpMax') return model.health?.max;
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
  if (page.type !== 'character') {
    throw sheetError(CHARACTER_SHEET_ERROR_CODES.SOURCE_UNAVAILABLE, 'character-sheet-capability-required');
  }
  assertStorageWorkspaceContext(context.workspaceContext);
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
