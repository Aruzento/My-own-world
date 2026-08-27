import {
  createTransactionEvent,
  EVENT_TRANSACTION_MODEL_VERSION,
  TransactionModelError
} from './transactionModel.js';


export const EVENT_TYPE_PAYLOAD_VERSION = 1;

export const EVENT_TYPES_V1 = Object.freeze({
  ROLL_PERFORMED: 'roll.performed',
  MANUAL_CORRECTION_RECORDED: 'manual.correction.recorded',
  RESOURCE_CHANGED: 'resource.changed',
  TRANSACTION_REVERSAL_RECORDED: 'transaction.reversal.recorded'
});

export const RESERVED_FUTURE_EVENT_TYPES = Object.freeze({
  ACTION: 'action.*',
  DAMAGE: 'damage.*',
  HEALING: 'healing.*',
  EFFECT: 'effect.*',
  TURN: 'turn.*',
  ROUND: 'round.*',
  REST: 'rest.*',
  MOVEMENT: 'movement.*',
  SCENE_TRANSITION: 'scene.transition.*'
});

export const EVENT_TYPE_ERROR_CODES = Object.freeze({
  UNKNOWN_TYPE: 'EVENT_TYPE_UNKNOWN',
  UNSUPPORTED_VERSION: 'EVENT_TYPE_UNSUPPORTED_VERSION',
  INVALID_PAYLOAD: 'EVENT_TYPE_INVALID_PAYLOAD'
});


export class EventTypeValidationError extends Error {

  constructor(message, {
    code = EVENT_TYPE_ERROR_CODES.INVALID_PAYLOAD,
    field = '',
    type = '',
    payloadVersion = null,
    expectedVersion = null,
    reservedFuture = false
  } = {}) {
    super(message);
    this.name = 'EventTypeValidationError';
    this.code = code;
    this.field = field;
    this.type = type;
    this.payloadVersion = payloadVersion;
    this.expectedVersion = expectedVersion;
    this.reservedFuture = Boolean(reservedFuture);
  }
}


const EVENT_INPUT_KEYS = [
  'kind',
  'version',
  'eventId',
  'transactionId',
  'type',
  'createdAt',
  'order',
  'payload',
  'payloadVersion',
  'reversesEventId',
  'reversedByEventId'
];

const ROLL_CONTEXT_KEYS = [
  'source',
  'actorId',
  'actorPageId',
  'targetId',
  'targetPageId',
  'mapPageId',
  'tokenId',
  'actionId',
  'ruleId',
  'label'
];

const EVENT_TYPE_SCHEMAS = new Map([
  [EVENT_TYPES_V1.ROLL_PERFORMED, normalizeRollPayload],
  [EVENT_TYPES_V1.MANUAL_CORRECTION_RECORDED, normalizeManualCorrectionPayload],
  [EVENT_TYPES_V1.RESOURCE_CHANGED, normalizeResourceChangePayload],
  [EVENT_TYPES_V1.TRANSACTION_REVERSAL_RECORDED, normalizeTransactionReversalPayload]
]);


export function createTypedEvent(input = {}) {
  assertAllowedKeys(input, EVENT_INPUT_KEYS, 'typed event');

  const type = requiredString(input.type, 'type');
  const schema = EVENT_TYPE_SCHEMAS.get(type);

  if (!schema) {
    const reservedFuture = isReservedFutureEventType(type);
    throw new EventTypeValidationError(
      reservedFuture
        ? `Event type ${type} is reserved for a future phase and is not implemented.`
        : `Unsupported event type: ${type}.`,
      {
        code: EVENT_TYPE_ERROR_CODES.UNKNOWN_TYPE,
        field: 'type',
        type,
        reservedFuture
      }
    );
  }

  const payloadVersion = normalizePayloadVersion(
    input.payloadVersion ?? EVENT_TYPE_PAYLOAD_VERSION,
    type
  );

  return createTransactionEvent({
    ...input,
    type,
    payloadVersion,
    payload: schema(input.payload ?? {}, type)
  });
}


export function validateTypedEvent(input = {}) {
  try {
    const event = createTypedEvent(input);
    return deepFreeze({
      kind: 'mow-event-type-validation',
      version: EVENT_TRANSACTION_MODEL_VERSION,
      ok: true,
      type: event.type,
      payloadVersion: event.payloadVersion
    });
  } catch (error) {
    if (
      error instanceof EventTypeValidationError ||
      error instanceof TransactionModelError
    ) {
      return deepFreeze({
        kind: 'mow-event-type-validation',
        version: EVENT_TRANSACTION_MODEL_VERSION,
        ok: false,
        error: createValidationErrorSummary(error)
      });
    }

    throw error;
  }
}


export function isKnownEventType(type) {
  return EVENT_TYPE_SCHEMAS.has(type);
}


export function isReservedFutureEventType(type) {
  const normalized = typeof type === 'string' ? type.trim() : '';
  return Object.values(RESERVED_FUTURE_EVENT_TYPES)
    .some(pattern => matchesFuturePattern(normalized, pattern));
}


function normalizeRollPayload(payload, eventType) {
  const record = plainRecord(payload, 'payload', eventType);
  assertAllowedKeys(record, ['roll', 'context'], 'roll payload', eventType);

  return deepFreeze({
    roll: normalizeRollResult(record.roll, 'payload.roll', eventType),
    context: normalizeOptionalStringRecord(
      record.context ?? {},
      ROLL_CONTEXT_KEYS,
      'payload.context',
      eventType
    )
  });
}


function normalizeManualCorrectionPayload(payload, eventType) {
  const record = plainRecord(payload, 'payload', eventType);
  assertAllowedKeys(
    record,
    ['subject', 'field', 'before', 'after', 'reason'],
    'manual correction payload',
    eventType
  );
  assertHasOwn(record, 'before', eventType);
  assertHasOwn(record, 'after', eventType);

  const normalized = {
    subject: normalizeSubjectReference(record.subject, 'payload.subject', eventType),
    field: requiredString(record.field, 'payload.field', eventType),
    before: normalizeAuditScalar(record.before, 'payload.before', eventType),
    after: normalizeAuditScalar(record.after, 'payload.after', eventType)
  };

  const reason = optionalString(record.reason, 'payload.reason', eventType);
  if (reason) {
    normalized.reason = reason;
  }

  return deepFreeze(normalized);
}


function normalizeResourceChangePayload(payload, eventType) {
  const record = plainRecord(payload, 'payload', eventType);
  assertAllowedKeys(
    record,
    ['resource', 'before', 'after', 'delta', 'unit', 'reason'],
    'resource change payload',
    eventType
  );

  const normalized = {
    resource: normalizeSubjectReference(record.resource, 'payload.resource', eventType),
    before: finiteNumber(record.before, 'payload.before', eventType),
    after: finiteNumber(record.after, 'payload.after', eventType),
    delta: finiteNumber(record.delta, 'payload.delta', eventType)
  };

  const unit = optionalString(record.unit, 'payload.unit', eventType);
  if (unit) {
    normalized.unit = unit;
  }

  const reason = optionalString(record.reason, 'payload.reason', eventType);
  if (reason) {
    normalized.reason = reason;
  }

  return deepFreeze(normalized);
}


function normalizeTransactionReversalPayload(payload, eventType) {
  const record = plainRecord(payload, 'payload', eventType);
  assertAllowedKeys(
    record,
    ['originalTransactionId', 'reversalTransactionId', 'reversedEventIds', 'reason'],
    'transaction reversal payload',
    eventType
  );

  const normalized = {
    originalTransactionId: requiredString(
      record.originalTransactionId,
      'payload.originalTransactionId',
      eventType
    ),
    reversalTransactionId: requiredString(
      record.reversalTransactionId,
      'payload.reversalTransactionId',
      eventType
    ),
    reversedEventIds: normalizeStringArray(
      record.reversedEventIds ?? [],
      'payload.reversedEventIds',
      eventType
    )
  };

  const reason = optionalString(record.reason, 'payload.reason', eventType);
  if (reason) {
    normalized.reason = reason;
  }

  return deepFreeze(normalized);
}


function normalizeRollResult(roll, field, eventType) {
  const record = plainRecord(roll, field, eventType);
  assertAllowedKeys(
    record,
    ['kind', 'version', 'request', 'total', 'dice', 'breakdown', 'critical'],
    'RollResult',
    eventType
  );

  if (record.kind !== 'dice-roll-result') {
    invalid(`${field}.kind`, 'RollResult kind must be dice-roll-result.', eventType);
  }

  if (record.version !== 1) {
    invalid(`${field}.version`, 'RollResult version must be 1.', eventType);
  }

  return deepFreeze({
    kind: 'dice-roll-result',
    version: 1,
    request: normalizeRollRequest(record.request, `${field}.request`, eventType),
    total: finiteNumber(record.total, `${field}.total`, eventType),
    dice: normalizeDiceTerms(record.dice, `${field}.dice`, eventType),
    breakdown: normalizeRollBreakdown(record.breakdown, `${field}.breakdown`, eventType),
    critical: normalizeCriticalResult(record.critical, `${field}.critical`, eventType)
  });
}


function normalizeRollRequest(request, field, eventType) {
  const record = plainRecord(request, field, eventType);
  assertAllowedKeys(
    record,
    ['formulaOriginal', 'formulaNormalized', 'mode', 'criticalPolicy'],
    'RollResult request',
    eventType
  );

  return deepFreeze({
    formulaOriginal: requiredString(record.formulaOriginal, `${field}.formulaOriginal`, eventType),
    formulaNormalized: requiredString(record.formulaNormalized, `${field}.formulaNormalized`, eventType),
    mode: enumValue(record.mode, ['normal', 'advantage', 'disadvantage'], `${field}.mode`, eventType),
    criticalPolicy: enumValue(
      record.criticalPolicy,
      ['none', 'd20-natural'],
      `${field}.criticalPolicy`,
      eventType
    )
  });
}


function normalizeDiceTerms(dice, field, eventType) {
  if (!Array.isArray(dice)) {
    invalid(field, 'RollResult dice must be an array.', eventType);
  }

  return deepFreeze(
    dice.map((term, index) => normalizeDiceTerm(term, `${field}[${index}]`, eventType, index))
  );
}


function normalizeDiceTerm(term, field, eventType, expectedIndex = null) {
  const record = plainRecord(term, field, eventType);
  assertAllowedKeys(
    record,
    ['kind', 'diceTermIndex', 'notation', 'count', 'sides', 'faces', 'total', 'selection'],
    'dice term',
    eventType
  );

  if (record.kind !== 'dice-term-result') {
    invalid(`${field}.kind`, 'Dice term kind must be dice-term-result.', eventType);
  }

  const diceTermIndex = safeInteger(record.diceTermIndex, `${field}.diceTermIndex`, eventType, { min: 0 });
  if (expectedIndex !== null && diceTermIndex !== expectedIndex) {
    invalid(`${field}.diceTermIndex`, 'Dice term indexes must match their array order.', eventType);
  }

  const normalized = {
    kind: 'dice-term-result',
    diceTermIndex,
    notation: requiredString(record.notation, `${field}.notation`, eventType),
    count: safeInteger(record.count, `${field}.count`, eventType, { min: 1 }),
    sides: safeInteger(record.sides, `${field}.sides`, eventType, { min: 1 }),
    faces: normalizeFaceArray(record.faces, `${field}.faces`, eventType),
    total: finiteNumber(record.total, `${field}.total`, eventType)
  };

  if (record.selection !== undefined) {
    normalized.selection = normalizeD20Selection(record.selection, `${field}.selection`, eventType);
  }

  return deepFreeze(normalized);
}


function normalizeD20Selection(selection, field, eventType) {
  const record = plainRecord(selection, field, eventType);
  assertAllowedKeys(
    record,
    [
      'mode',
      'candidateFaces',
      'keptCandidateIndexes',
      'discardedCandidateIndexes',
      'keptFaces',
      'discardedFaces',
      'selectedNatural',
      'reason'
    ],
    'd20 selection',
    eventType
  );

  return deepFreeze({
    mode: enumValue(record.mode, ['advantage', 'disadvantage'], `${field}.mode`, eventType),
    candidateFaces: normalizeFaceArray(record.candidateFaces, `${field}.candidateFaces`, eventType),
    keptCandidateIndexes: normalizeIndexArray(
      record.keptCandidateIndexes,
      `${field}.keptCandidateIndexes`,
      eventType
    ),
    discardedCandidateIndexes: normalizeIndexArray(
      record.discardedCandidateIndexes,
      `${field}.discardedCandidateIndexes`,
      eventType
    ),
    keptFaces: normalizeFaceArray(record.keptFaces, `${field}.keptFaces`, eventType),
    discardedFaces: normalizeFaceArray(record.discardedFaces, `${field}.discardedFaces`, eventType),
    selectedNatural: safeInteger(record.selectedNatural, `${field}.selectedNatural`, eventType, { min: 1 }),
    reason: enumValue(
      record.reason,
      ['higher-face', 'lower-face', 'tie-first-candidate'],
      `${field}.reason`,
      eventType
    )
  });
}


function normalizeRollBreakdown(breakdown, field, eventType, depth = 0) {
  if (depth > 64) {
    invalid(field, 'RollResult breakdown is too deeply nested.', eventType);
  }

  const record = plainRecord(breakdown, field, eventType);
  const kind = requiredString(record.kind, `${field}.kind`, eventType);

  if (kind === 'number') {
    assertAllowedKeys(record, ['kind', 'value', 'total'], 'number breakdown', eventType);
    return deepFreeze({
      kind,
      value: finiteNumber(record.value, `${field}.value`, eventType),
      total: finiteNumber(record.total, `${field}.total`, eventType)
    });
  }

  if (kind === 'dice-term') {
    assertAllowedKeys(
      record,
      ['kind', 'diceTermIndex', 'notation', 'count', 'sides', 'faces', 'total', 'selection'],
      'dice breakdown',
      eventType
    );
    const normalized = {
      kind,
      diceTermIndex: safeInteger(record.diceTermIndex, `${field}.diceTermIndex`, eventType, { min: 0 }),
      notation: requiredString(record.notation, `${field}.notation`, eventType),
      count: safeInteger(record.count, `${field}.count`, eventType, { min: 1 }),
      sides: safeInteger(record.sides, `${field}.sides`, eventType, { min: 1 }),
      faces: normalizeFaceArray(record.faces, `${field}.faces`, eventType),
      total: finiteNumber(record.total, `${field}.total`, eventType)
    };

    if (record.selection !== undefined) {
      normalized.selection = normalizeD20Selection(record.selection, `${field}.selection`, eventType);
    }

    return deepFreeze(normalized);
  }

  if (kind === 'unary-operation') {
    assertAllowedKeys(record, ['kind', 'operator', 'operand', 'total'], 'unary breakdown', eventType);
    return deepFreeze({
      kind,
      operator: enumValue(record.operator, ['+', '-'], `${field}.operator`, eventType),
      operand: normalizeRollBreakdown(record.operand, `${field}.operand`, eventType, depth + 1),
      total: finiteNumber(record.total, `${field}.total`, eventType)
    });
  }

  if (kind === 'binary-operation') {
    assertAllowedKeys(record, ['kind', 'operator', 'left', 'right', 'total'], 'binary breakdown', eventType);
    return deepFreeze({
      kind,
      operator: enumValue(record.operator, ['+', '-', '*', '/'], `${field}.operator`, eventType),
      left: normalizeRollBreakdown(record.left, `${field}.left`, eventType, depth + 1),
      right: normalizeRollBreakdown(record.right, `${field}.right`, eventType, depth + 1),
      total: finiteNumber(record.total, `${field}.total`, eventType)
    });
  }

  invalid(`${field}.kind`, `Unsupported RollResult breakdown kind: ${kind}.`, eventType);
}


function normalizeCriticalResult(critical, field, eventType) {
  const record = plainRecord(critical, field, eventType);
  assertAllowedKeys(
    record,
    ['policy', 'kind', 'selectedNatural', 'diceTermIndex'],
    'critical result',
    eventType
  );

  const normalized = {
    policy: enumValue(record.policy, ['none', 'd20-natural'], `${field}.policy`, eventType),
    kind: enumValue(record.kind, ['none', 'success', 'failure'], `${field}.kind`, eventType)
  };

  if (record.selectedNatural !== undefined) {
    normalized.selectedNatural = safeInteger(record.selectedNatural, `${field}.selectedNatural`, eventType, { min: 1 });
  }

  if (record.diceTermIndex !== undefined) {
    normalized.diceTermIndex = safeInteger(record.diceTermIndex, `${field}.diceTermIndex`, eventType, { min: 0 });
  }

  if (normalized.policy === 'none' && (record.selectedNatural !== undefined || record.diceTermIndex !== undefined)) {
    invalid(field, 'criticalPolicy none must not include natural d20 selection fields.', eventType);
  }

  if (
    normalized.policy === 'd20-natural' &&
    (record.selectedNatural === undefined || record.diceTermIndex === undefined)
  ) {
    invalid(field, 'd20-natural critical metadata requires selectedNatural and diceTermIndex.', eventType);
  }

  return deepFreeze(normalized);
}


function normalizeSubjectReference(value, field, eventType) {
  const record = plainRecord(value, field, eventType);
  assertAllowedKeys(record, ['kind', 'id', 'label'], 'subject reference', eventType);
  const normalized = {
    kind: requiredString(record.kind, `${field}.kind`, eventType),
    id: requiredString(record.id, `${field}.id`, eventType)
  };

  const label = optionalString(record.label, `${field}.label`, eventType);
  if (label) {
    normalized.label = label;
  }

  return deepFreeze(normalized);
}


function normalizeOptionalStringRecord(recordValue, keys, field, eventType) {
  const record = plainRecord(recordValue, field, eventType);
  assertAllowedKeys(record, keys, 'roll context', eventType);
  const normalized = {};

  for (const key of keys) {
    const value = optionalString(record[key], `${field}.${key}`, eventType);
    if (value) {
      normalized[key] = value;
    }
  }

  return deepFreeze(normalized);
}


function normalizePayloadVersion(value, eventType) {
  if (value !== EVENT_TYPE_PAYLOAD_VERSION) {
    throw new EventTypeValidationError(
      `Event type ${eventType} supports payloadVersion ${EVENT_TYPE_PAYLOAD_VERSION}.`,
      {
        code: EVENT_TYPE_ERROR_CODES.UNSUPPORTED_VERSION,
        field: 'payloadVersion',
        type: eventType,
        payloadVersion: value,
        expectedVersion: EVENT_TYPE_PAYLOAD_VERSION
      }
    );
  }

  return EVENT_TYPE_PAYLOAD_VERSION;
}


function requiredString(value, field, eventType = '') {
  if (typeof value !== 'string') {
    invalid(field, `${field} must be a string.`, eventType);
  }

  const normalized = value.trim();
  if (!normalized) {
    invalid(field, `${field} must not be empty.`, eventType);
  }

  return normalized;
}


function optionalString(value, field, eventType) {
  if (value === undefined || value === null) {
    return '';
  }

  return requiredString(value, field, eventType);
}


function enumValue(value, allowedValues, field, eventType) {
  const normalized = requiredString(value, field, eventType);
  if (!allowedValues.includes(normalized)) {
    invalid(field, `${field} has unsupported value ${normalized}.`, eventType);
  }

  return normalized;
}


function finiteNumber(value, field, eventType) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalid(field, `${field} must be a finite number.`, eventType);
  }

  return value;
}


function safeInteger(value, field, eventType, { min = Number.MIN_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value)) {
    invalid(field, `${field} must be a safe integer.`, eventType);
  }

  if (value < min) {
    invalid(field, `${field} must be at least ${min}.`, eventType);
  }

  return value;
}


function normalizeAuditScalar(value, field, eventType) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return finiteNumber(value, field, eventType);
  }

  invalid(field, `${field} must be a string, number, boolean or null.`, eventType);
}


function normalizeFaceArray(value, field, eventType) {
  if (!Array.isArray(value)) {
    invalid(field, `${field} must be an array.`, eventType);
  }

  return deepFreeze(
    value.map((item, index) => safeInteger(item, `${field}[${index}]`, eventType, { min: 1 }))
  );
}


function normalizeIndexArray(value, field, eventType) {
  if (!Array.isArray(value)) {
    invalid(field, `${field} must be an array.`, eventType);
  }

  return deepFreeze(
    value.map((item, index) => safeInteger(item, `${field}[${index}]`, eventType, { min: 0 }))
  );
}


function normalizeStringArray(value, field, eventType) {
  if (!Array.isArray(value)) {
    invalid(field, `${field} must be an array.`, eventType);
  }

  return deepFreeze(
    value.map((item, index) => requiredString(item, `${field}[${index}]`, eventType))
  );
}


function plainRecord(value, field, eventType) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalid(field, `${field} must be an object.`, eventType);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    invalid(field, `${field} must be a plain object.`, eventType);
  }

  return value;
}


function assertAllowedKeys(input, allowedKeys, owner, eventType = '') {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(input || {})) {
    if (!allowed.has(key)) {
      invalid(key, `${owner} does not support field ${key}.`, eventType);
    }
  }
}


function assertHasOwn(input, field, eventType) {
  if (!Object.hasOwn(input, field)) {
    invalid(`payload.${field}`, `payload.${field} is required.`, eventType);
  }
}


function matchesFuturePattern(type, pattern) {
  if (!pattern.endsWith('.*')) {
    return type === pattern;
  }

  return type.startsWith(pattern.slice(0, -1));
}


function createValidationErrorSummary(error) {
  const summary = {
    name: error.name,
    code: error.code,
    message: error.message
  };

  for (const key of ['field', 'type', 'payloadVersion', 'expectedVersion', 'reservedFuture']) {
    if (error[key] !== undefined && error[key] !== null && error[key] !== '') {
      summary[key] = error[key];
    }
  }

  return summary;
}


function invalid(field, message, eventType = '') {
  throw new EventTypeValidationError(message, {
    code: EVENT_TYPE_ERROR_CODES.INVALID_PAYLOAD,
    field,
    type: eventType
  });
}


function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return value;
  }

  seen.add(value);
  Object.freeze(value);

  for (const child of Object.values(value)) {
    deepFreeze(child, seen);
  }

  return value;
}
