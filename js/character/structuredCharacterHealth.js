import {
  canonicalJSON,
  isDataObject
} from '../core/pageVariablesCodec.js';

import {
  arePageStateIdentitiesEqual,
  createRuntimePageFromContent,
  parsePageRecordContent
} from '../core/pageRecord.js';

import * as PageRepository from '../repository/pageRepository.js';

import {
  assertStorageWorkspaceContext,
  captureStorageWorkspaceContext
} from '../storage/storageAdapter.js';

import {
  deepCloneData,
  deepFreeze
} from '../cardTypes/definitionIdentity.js';

import {
  commitVariablesChange,
  getValue,
  prepareVariablesChange,
  readEntity
} from '../variables/entityVariables.js';

import {
  applyCharacterHealthChange,
  getCharacterHealth,
  readCharacterModelFromPage
} from './characterModel.js';


export const STRUCTURED_CHARACTER_HEALTH_PLAN_KIND =
  'StructuredCharacterHealthPlan';

export const STRUCTURED_CHARACTER_HEALTH_PLAN_VERSION =
  1;

export const STRUCTURED_CHARACTER_HEALTH_REQUEST_TYPES =
  Object.freeze({
    DELTA: 'delta',
    EXACT: 'exact',
    MAXIMUM: 'maximum'
  });

export const STRUCTURED_CHARACTER_HEALTH_ERROR_CODES =
  Object.freeze({
    INVALID_REQUEST:
      'STRUCTURED_CHARACTER_HEALTH_INVALID_REQUEST',
    UNSUPPORTED_SOURCE:
      'STRUCTURED_CHARACTER_HEALTH_UNSUPPORTED_SOURCE',
    EXPLICIT_HEALTH_REQUIRED:
      'STRUCTURED_CHARACTER_HEALTH_EXPLICIT_SOURCE_REQUIRED',
    INVALID_HEALTH_STATE:
      'STRUCTURED_CHARACTER_HEALTH_STATE_INVALID',
    STALE_BASE:
      'STRUCTURED_CHARACTER_HEALTH_STALE_BASE',
    PREPARE_BLOCKED:
      'STRUCTURED_CHARACTER_HEALTH_PREPARE_BLOCKED',
    PLAN_BLOCKED:
      'STRUCTURED_CHARACTER_HEALTH_PLAN_BLOCKED',
    COMMIT_BLOCKED:
      'STRUCTURED_CHARACTER_HEALTH_COMMIT_BLOCKED',
    COMMIT_FAILED:
      'STRUCTURED_CHARACTER_HEALTH_COMMIT_FAILED',
    READBACK_UNCERTAIN:
      'STRUCTURED_CHARACTER_HEALTH_READBACK_UNCERTAIN',
    DOMAIN_READBACK_FAILED:
      'STRUCTURED_CHARACTER_HEALTH_DOMAIN_READBACK_FAILED'
  });


const SUPPORTED_TYPES =
  new Set([
    'character',
    'player'
  ]);

const HEALTH_KEY =
  'dnd.health';

const HEALTH_FIELDS =
  Object.freeze({
    current: 'dnd.hpCurrent',
    max: 'dnd.hpMax',
    temp: 'dnd.hpTemporary'
  });

const plans =
  new WeakMap();


export class StructuredCharacterHealthError extends Error {

  constructor(
    message,
    {
      code = STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.PREPARE_BLOCKED,
      pageId = '',
      reason = '',
      field = '',
      details = null
    } = {}
  ) {
    super(message);
    this.name = 'StructuredCharacterHealthError';
    this.code = code;
    this.pageId = pageId;
    this.reason = reason;
    this.field = field;
    this.details = details === null
      ? null
      : deepFreeze(deepCloneData(details));
  }
}


// Domain preparation is pure. Persistence remains wholly owned by the
// Variables/PageCommand pipeline captured in the private plan context.
export function prepareStructuredCharacterHealthChange({
  pageId,
  expectedBase,
  request = {},
  context = {}
} = {}) {
  const repository =
    context.repository || PageRepository;
  const registry =
    context.registry;
  const page =
    repository.getPageById(pageId);

  if (!registry) {
    throw healthError(
      'Structured Character health writes require the exact activated Type Registry.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.PREPARE_BLOCKED,
      pageId,
      'activated-registry-required'
    );
  }

  if (!page?.id || page.id !== pageId) {
    throw healthError(
      'Structured Character health requires an exact existing page.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.UNSUPPORTED_SOURCE,
      pageId,
      'missing-page'
    );
  }

  const normalizedRequest =
    normalizeRequest(request, pageId);
  const inspection = inspectStructuredCharacterHealthSource({
    pageId,
    expectedBase,
    context: {
      ...context,
      registry,
      repository
    }
  });
  const snapshot = inspection.snapshot;
  const storedHealth = inspection.storedHealth;
  const before = inspection.health;
  const character = inspection.character;

  const after =
    resolveAfterHealth({
      character,
      before,
      request: normalizedRequest,
      pageId
    });
  const nextStoredHealth =
    deepCloneData(storedHealth);

  nextStoredHealth[HEALTH_FIELDS.current] =
    after.current;
  nextStoredHealth[HEALTH_FIELDS.temp] =
    after.temp;
  nextStoredHealth[HEALTH_FIELDS.max] =
    after.max;

  const changedFields =
    [
      ['current', HEALTH_FIELDS.current],
      ['temp', HEALTH_FIELDS.temp],
      ['max', HEALTH_FIELDS.max]
    ]
      .filter(([property]) =>
        before[property] !== after[property]
      )
      .map(([property, field]) => ({
        field,
        before: before[property],
        after: after[property]
      }));
  const changed =
    changedFields.length > 0;
  const workspaceContext =
    context.workspaceContext ||
    captureStorageWorkspaceContext();
  let variablesPlan = null;

  if (changed) {
    try {
      variablesPlan = prepareVariablesChange({
        pageId,
        expectedBase,
        patch: [{
          op: 'set',
          key: HEALTH_KEY,
          value: nextStoredHealth
        }],
        context: {
          ...context,
          registry,
          repository,
          workspaceContext
        }
      });
    } catch (error) {
      throw new StructuredCharacterHealthError(
        'Structured Character health candidate was rejected by the Variables boundary.',
        {
          code:
            STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.PREPARE_BLOCKED,
          pageId,
          reason: 'variables-plan-rejected',
          details: {
            message: String(error?.message || error),
            issues: Array.isArray(error?.issues)
              ? error.issues
              : []
          }
        }
      );
    }
  }

  const record =
    parsePageRecordContent(page.content, {
      generateId: false
    });
  const plan =
    deepFreeze(deepCloneData({
      kind: STRUCTURED_CHARACTER_HEALTH_PLAN_KIND,
      version: STRUCTURED_CHARACTER_HEALTH_PLAN_VERSION,
      pageId,
      request: normalizedRequest,
      source: {
        mode: 'structured',
        type: snapshot.type,
        field: HEALTH_KEY,
        explicitStored: true
      },
      schema: {
        type: snapshot.type,
        version: snapshot.schemaVersion,
        digest: snapshot.schemaDigest
      },
      expectedBase,
      before,
      after,
      storedHealthBefore: storedHealth,
      storedHealthAfter: nextStoredHealth,
      changed,
      changedFields,
      guards: {
        wholePage: true,
        schemaClosure: true,
        workspace: true,
        explicitStoredHealth: true,
        hpMax: before.max,
        preserveSiblings: true,
        rebase: false
      }
    }));

  plans.set(plan, {
    used: false,
    variablesPlan,
    workspaceContext,
    registry,
    repository,
    pages: context.pages || [],
    path: page.path,
    name: page.name,
    originalBody: record.rawBody
  });

  return plan;
}


export async function commitStructuredCharacterHealthChange(
  plan,
  { validateBeforeWrite = null } = {}
) {
  const captured =
    plans.get(plan);

  if (
    !captured ||
    captured.used ||
    plan?.kind !== STRUCTURED_CHARACTER_HEALTH_PLAN_KIND
  ) {
    return commitResult({
      status: 'blocked',
      code: STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.PLAN_BLOCKED,
      reason: 'unknown-or-used-plan',
      written: false
    });
  }

  captured.used = true;

  if (!plan.changed) {
    return commitResult({
      status: 'unchanged',
      code: null,
      reason: 'health-unchanged',
      written: false,
      before: plan.before,
      after: plan.after
    });
  }

  const variablesResult =
    await commitVariablesChange(
      captured.variablesPlan,
      { validateBeforeWrite }
    );

  if (variablesResult.status !== 'saved') {
    return commitResult({
      status: variablesResult.status,
      code: commitFailureCode(variablesResult.status),
      reason: variablesResult.reason || 'variables-commit-rejected',
      written: variablesResult.written,
      before: plan.before,
      after: plan.after,
      variablesResult
    });
  }

  try {
    const verification =
      await verifyDurableCharacterHealth(plan, captured);

    return commitResult({
      status: 'saved',
      code: null,
      reason: '',
      written: true,
      before: plan.before,
      after: plan.after,
      changedFields: plan.changedFields,
      verification,
      variablesResult
    });
  } catch (error) {
    return commitResult({
      status: 'uncertain',
      code:
        STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.DOMAIN_READBACK_FAILED,
      reason: error.reason || 'domain-readback-failed',
      written: true,
      before: plan.before,
      after: plan.after,
      details: {
        message: String(error?.message || error)
      },
      variablesResult
    });
  }
}


// Read-only readiness boundary shared by Combat and future domain writers. It
// proves that HP is explicit, schema-valid and projected by CharacterModel;
// it never materializes defaults or reads legacy Properties.
export function inspectStructuredCharacterHealthSource({
  pageId,
  expectedBase = null,
  context = {}
} = {}) {
  const repository = context.repository || PageRepository;
  const registry = context.registry;
  const page = repository.getPageById(pageId);

  if (!registry) {
    throw healthError(
      'Structured Character health requires the exact activated Type Registry.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.PREPARE_BLOCKED,
      pageId,
      'activated-registry-required'
    );
  }

  if (!page?.id || page.id !== pageId) {
    throw healthError(
      'Structured Character health requires an exact existing page.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.UNSUPPORTED_SOURCE,
      pageId,
      'missing-page'
    );
  }

  const snapshot = readEntity(pageId, { registry, repository });
  assertStructuredCharacterSource(snapshot, pageId);

  if (
    expectedBase &&
    (!expectedBase.stateHash ||
      !arePageStateIdentitiesEqual(expectedBase, snapshot.pageIdentity))
  ) {
    throw healthError(
      'Structured Character health preparation requires the exact whole-page base.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.STALE_BASE,
      pageId,
      'stale-page-base'
    );
  }

  const storedHealth = readExplicitStoredHealth(snapshot, { registry, repository });
  const health = healthTuple(storedHealth, pageId);
  const character = readCharacterModelFromPage(page, {
    pages: context.pages || [], registry, repository
  });
  assertCharacterProjection(character, health, pageId);

  return Object.freeze({
    pageId,
    snapshot,
    pageIdentity: snapshot.pageIdentity,
    schema: Object.freeze({
      type: snapshot.type,
      version: snapshot.schemaVersion,
      digest: snapshot.schemaDigest
    }),
    storedHealth: deepFreeze(deepCloneData(storedHealth)),
    health: deepFreeze(deepCloneData(health)),
    character
  });
}


async function verifyDurableCharacterHealth(
  plan,
  captured
) {
  assertStorageWorkspaceContext(
    captured.workspaceContext
  );
  const content =
    await captured.workspaceContext.adapter.readText(
      captured.path
    );
  assertStorageWorkspaceContext(
    captured.workspaceContext
  );
  const record =
    parsePageRecordContent(content, {
      generateId: false
    });

  if (record.rawBody !== captured.originalBody) {
    throw readbackError(
      'properties-or-body-changed'
    );
  }

  const durablePage =
    createRuntimePageFromContent({
      content,
      path: captured.path,
      name: captured.name
    });
  const repository = {
    getPageById(id) {
      if (id === plan.pageId) return durablePage;
      return captured.repository.getPageById(id);
    }
  };
  const snapshot =
    readEntity(plan.pageId, {
      registry: captured.registry,
      repository
    });
  const stored =
    getValue(
      snapshot,
      HEALTH_KEY,
      'stored',
      {
        registry: captured.registry,
        repository
      }
    );

  if (
    stored.status !== 'value' ||
    stored.source !== 'stored' ||
    canonicalJSON(stored.value) !==
      canonicalJSON(plan.storedHealthAfter)
  ) {
    throw readbackError(
      'stored-health-mismatch'
    );
  }

  const model =
    readCharacterModelFromPage(durablePage, {
      pages: captured.pages,
      registry: captured.registry,
      repository
    });
  const health =
    getCharacterHealth(model);

  if (
    model.source !== 'entity' ||
    !health ||
    health.current !== plan.after.current ||
    health.max !== plan.after.max ||
    health.temp !== plan.after.temp
  ) {
    throw readbackError(
      'character-model-health-mismatch'
    );
  }

  return deepFreeze({
    source: model.source,
    health: {
      current: health.current,
      max: health.max,
      temp: health.temp,
      percent: health.percent,
      isDown: health.isDown
    },
    schema: plan.schema,
    bodyPreserved: true,
    siblingsPreserved: true
  });
}


function assertStructuredCharacterSource(
  snapshot,
  pageId
) {
  if (snapshot.variablesMode === 'legacy') {
    throw healthError(
      'Legacy Character health must use the Properties writer.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.UNSUPPORTED_SOURCE,
      pageId,
      'legacy-source'
    );
  }

  if (snapshot.mode !== 'structured') {
    throw healthError(
      'Structured Character health source is unavailable.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.UNSUPPORTED_SOURCE,
      pageId,
      snapshot.mode
    );
  }

  const definition =
    snapshot.definition?.definition;

  if (
    !SUPPORTED_TYPES.has(snapshot.type) ||
    definition?.capabilities?.characterProjection !== true
  ) {
    throw healthError(
      'This Card Type does not own the approved Character health projection.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.UNSUPPORTED_SOURCE,
      pageId,
      'character-health-capability-missing'
    );
  }
}


function readExplicitStoredHealth(
  snapshot,
  context
) {
  if (!Object.prototype.hasOwnProperty.call(snapshot.values, HEALTH_KEY)) {
    throw healthError(
      'Structured Character health requires an explicit stored dnd.health object.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.EXPLICIT_HEALTH_REQUIRED,
      snapshot.pageId,
      'stored-health-absent',
      HEALTH_KEY
    );
  }

  const raw =
    snapshot.values[HEALTH_KEY];

  if (!isDataObject(raw)) {
    throw invalidHealth(
      snapshot.pageId,
      HEALTH_KEY,
      'health-object-invalid'
    );
  }

  for (const field of Object.values(HEALTH_FIELDS)) {
    if (!Object.prototype.hasOwnProperty.call(raw, field)) {
      throw healthError(
        'Structured Character health requires every HP field to be explicitly stored.',
        STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.EXPLICIT_HEALTH_REQUIRED,
        snapshot.pageId,
        'stored-health-field-absent',
        field
      );
    }
  }

  const result =
    getValue(
      snapshot,
      HEALTH_KEY,
      'stored',
      context
    );

  if (
    result.status !== 'value' ||
    result.source !== 'stored'
  ) {
    throw new StructuredCharacterHealthError(
      'Stored Character health does not satisfy the exact schema definition.',
      {
        code:
          STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_HEALTH_STATE,
        pageId: snapshot.pageId,
        field: HEALTH_KEY,
        reason: 'stored-health-schema-invalid',
        details: {
          status: result.status,
          issues: result.issues || []
        }
      }
    );
  }

  return deepCloneData(result.value);
}


function healthTuple(
  stored,
  pageId
) {
  const tuple = {
    current: stored[HEALTH_FIELDS.current],
    max: stored[HEALTH_FIELDS.max],
    temp: stored[HEALTH_FIELDS.temp]
  };

  for (const [property, value] of Object.entries(tuple)) {
    if (!Number.isSafeInteger(value)) {
      throw invalidHealth(
        pageId,
        HEALTH_FIELDS[property],
        'health-value-not-safe-integer'
      );
    }

    if (
      property === 'max'
        ? value <= 0
        : value < 0
    ) {
      throw invalidHealth(
        pageId,
        HEALTH_FIELDS[property],
        'health-value-out-of-range'
      );
    }
  }

  if (tuple.current > tuple.max) {
    throw invalidHealth(
      pageId,
      HEALTH_FIELDS.current,
      'current-exceeds-max'
    );
  }

  return tuple;
}


function assertCharacterProjection(
  character,
  expected,
  pageId
) {
  const health =
    getCharacterHealth(character);

  if (
    character?.source !== 'entity' ||
    !health ||
    health.current !== expected.current ||
    health.max !== expected.max ||
    health.temp !== expected.temp
  ) {
    throw healthError(
      'CharacterModel does not project the exact explicit stored health source.',
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_HEALTH_STATE,
      pageId,
      'character-model-source-mismatch'
    );
  }
}


function resolveAfterHealth({
  character,
  before,
  request,
  pageId
}) {
  if (
    request.type ===
      STRUCTURED_CHARACTER_HEALTH_REQUEST_TYPES.DELTA
  ) {
    const next =
      getCharacterHealth(
        applyCharacterHealthChange(character, {
          delta: request.delta
        })
      );

    return {
      current: next.current,
      max: before.max,
      temp: next.temp
    };
  }

  if (request.type === STRUCTURED_CHARACTER_HEALTH_REQUEST_TYPES.MAXIMUM) {
    if (request.hpMax < before.current) {
      throw invalidHealth(pageId, HEALTH_FIELDS.max, 'max-below-current');
    }
    return { current: before.current, max: request.hpMax, temp: before.temp };
  }

  if (request.hpCurrent > before.max) {
    throw invalidHealth(
      pageId,
      HEALTH_FIELDS.current,
      'current-exceeds-max'
    );
  }

  return {
    current: request.hpCurrent,
    max: before.max,
    temp: request.hpTemp
  };
}


function normalizeRequest(
  request,
  pageId
) {
  if (!isDataObject(request)) {
    throw invalidRequest(
      pageId,
      'request-not-object'
    );
  }

  const type =
    request.type;
  const allowed =
    type === STRUCTURED_CHARACTER_HEALTH_REQUEST_TYPES.DELTA
      ? new Set(['type', 'delta'])
      : type === STRUCTURED_CHARACTER_HEALTH_REQUEST_TYPES.EXACT
        ? new Set(['type', 'hpCurrent', 'hpTemp'])
        : type === STRUCTURED_CHARACTER_HEALTH_REQUEST_TYPES.MAXIMUM
          ? new Set(['type', 'hpMax'])
          : null;

  if (!allowed) {
    throw invalidRequest(
      pageId,
      'request-type-unsupported'
    );
  }

  const extra =
    Object.keys(request).find(key =>
      !allowed.has(key)
    );

  if (extra) {
    throw invalidRequest(
      pageId,
      'request-field-unsupported',
      extra
    );
  }

  if (type === STRUCTURED_CHARACTER_HEALTH_REQUEST_TYPES.DELTA) {
    if (!Number.isSafeInteger(request.delta)) {
      throw invalidRequest(
        pageId,
        'delta-not-safe-integer',
        'delta'
      );
    }

    return deepFreeze({
      type,
      delta: request.delta
    });
  }

  if (type === STRUCTURED_CHARACTER_HEALTH_REQUEST_TYPES.MAXIMUM) {
    if (!Number.isSafeInteger(request.hpMax) || request.hpMax <= 0) {
      throw invalidRequest(pageId, 'maximum-value-invalid', 'hpMax');
    }
    return deepFreeze({ type, hpMax: request.hpMax });
  }

  for (const field of ['hpCurrent', 'hpTemp']) {
    if (
      !Number.isSafeInteger(request[field]) ||
      request[field] < 0
    ) {
      throw invalidRequest(
        pageId,
        'exact-value-invalid',
        field
      );
    }
  }

  return deepFreeze({
    type,
    hpCurrent: request.hpCurrent,
    hpTemp: request.hpTemp
  });
}


function commitFailureCode(
  status
) {
  if (status === 'blocked') {
    return STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.COMMIT_BLOCKED;
  }

  if (status === 'failed') {
    return STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.COMMIT_FAILED;
  }

  return STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.READBACK_UNCERTAIN;
}


function commitResult(
  value
) {
  return deepFreeze(deepCloneData({
    kind: 'StructuredCharacterHealthCommitResult',
    version: 1,
    ...value
  }));
}


function invalidRequest(
  pageId,
  reason,
  field = ''
) {
  return healthError(
    'Structured Character health request is invalid.',
    STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_REQUEST,
    pageId,
    reason,
    field
  );
}


function invalidHealth(
  pageId,
  field,
  reason
) {
  return healthError(
    'Structured Character health state is invalid.',
    STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_HEALTH_STATE,
    pageId,
    reason,
    field
  );
}


function healthError(
  message,
  code,
  pageId,
  reason,
  field = ''
) {
  return new StructuredCharacterHealthError(
    message,
    {
      code,
      pageId,
      reason,
      field
    }
  );
}


function readbackError(
  reason
) {
  const error =
    new Error(
      'Durable structured Character health readback failed.'
    );

  error.reason = reason;
  return error;
}
