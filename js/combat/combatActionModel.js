import {
  validateDiceRoll
} from '../dice/diceEngine.js';


export const COMBAT_ACTION_REQUEST_KIND =
  'CombatActionRequest';

export const COMBAT_ACTION_REQUEST_VERSION =
  1;

export const COMBAT_ACTION_RESOLUTION_KIND =
  'CombatActionResolution';

export const COMBAT_ACTION_RESOLUTION_VERSION =
  1;

export const COMBAT_ACTION_TYPES =
  Object.freeze({
    ATTACK:
      'attack'
  });

export const COMBAT_ACTION_HIT_POLICIES =
  Object.freeze({
    AC_TOTAL_V1:
      'ac-total-v1'
  });

export const COMBAT_ACTION_OUTCOMES =
  Object.freeze({
    HIT:
      'hit',
    MISS:
      'miss'
  });

export const COMBAT_ACTION_CRITICAL_POLICY =
  'none';

export const COMBAT_ACTION_REQUEST_ERROR_CODES =
  Object.freeze({
    INVALID_REQUEST:
      'COMBAT_ACTION_INVALID_REQUEST',
    UNSUPPORTED_POLICY:
      'COMBAT_ACTION_UNSUPPORTED_POLICY',
    INVALID_ATTACK_ROLL:
      'COMBAT_ACTION_INVALID_ATTACK_ROLL',
    INVALID_DAMAGE_ROLL:
      'COMBAT_ACTION_INVALID_DAMAGE_ROLL'
  });


export class CombatActionRequestError extends Error {

  constructor(
    message,
    {
      code =
        COMBAT_ACTION_REQUEST_ERROR_CODES.INVALID_REQUEST,
      field =
        '',
      reason =
        '',
      details =
        null
    } = {}
  ) {

    super(
      message
    );

    this.name =
      'CombatActionRequestError';

    this.code =
      code;

    this.field =
      field;

    this.reason =
      reason;

    this.details =
      details === null
        ? null
        : deepFreeze(
          clonePlainData(
            details
          )
        );
  }
}


export function validateCombatActionRequest(
  request
) {

  assertPlainObject(
    request,
    'request'
  );

  assertAllowedKeys(
    request,
    [
      'kind',
      'version',
      'actionId',
      'mapPageId',
      'sessionId',
      'actor',
      'target',
      'action'
    ],
    'request'
  );

  if (request.kind !== COMBAT_ACTION_REQUEST_KIND) {

    throw requestError(
      'kind',
      'unsupported-kind'
    );
  }

  if (request.version !== COMBAT_ACTION_REQUEST_VERSION) {

    throw requestError(
      'version',
      'unsupported-version'
    );
  }

  const actor =
    normalizeParticipantReference(
      request.actor,
      'actor'
    );

  const target =
    normalizeParticipantReference(
      request.target,
      'target'
    );

  const action =
    normalizeAttackDefinition(
      request.action
    );

  return deepFreeze({
    kind:
      COMBAT_ACTION_REQUEST_KIND,
    version:
      COMBAT_ACTION_REQUEST_VERSION,
    actionId:
      readIdentity(
        request.actionId,
        'actionId'
      ),
    mapPageId:
      readIdentity(
        request.mapPageId,
        'mapPageId'
      ),
    sessionId:
      readIdentity(
        request.sessionId,
        'sessionId'
      ),
    actor,
    target,
    action
  });
}


export function resolveAcTotalOutcome(
  attackTotal,
  armorClass
) {

  if (
    !Number.isFinite(attackTotal) ||
    !Number.isFinite(armorClass)
  ) {

    throw new TypeError(
      'Attack total and armor class must be finite numbers.'
    );
  }

  return attackTotal >= armorClass
    ? COMBAT_ACTION_OUTCOMES.HIT
    : COMBAT_ACTION_OUTCOMES.MISS;
}


function normalizeParticipantReference(
  value,
  field
) {

  assertPlainObject(
    value,
    field
  );

  assertAllowedKeys(
    value,
    [
      'participantId'
    ],
    field
  );

  return {
    participantId:
      readIdentity(
        value.participantId,
        `${field}.participantId`
      )
  };
}


function normalizeAttackDefinition(
  value
) {

  assertPlainObject(
    value,
    'action'
  );

  assertAllowedKeys(
    value,
    [
      'type',
      'definitionId',
      'label',
      'source',
      'hitPolicy',
      'attackRoll',
      'damageComponents'
    ],
    'action'
  );

  if (value.type !== COMBAT_ACTION_TYPES.ATTACK) {

    throw requestError(
      'action.type',
      'unsupported-action-type'
    );
  }

  if (value.hitPolicy !== COMBAT_ACTION_HIT_POLICIES.AC_TOTAL_V1) {

    throw new CombatActionRequestError(
      'Only the ac-total-v1 hit policy is supported.',
      {
        code:
          COMBAT_ACTION_REQUEST_ERROR_CODES.UNSUPPORTED_POLICY,
        field:
          'action.hitPolicy',
        reason:
          'unsupported-hit-policy'
      }
    );
  }

  if (
    !Array.isArray(value.damageComponents) ||
    value.damageComponents.length !== 1
  ) {

    throw requestError(
      'action.damageComponents',
      'requires-one-damage-component'
    );
  }

  const attackRoll =
    normalizeRollRequest(
      value.attackRoll,
      {
        field:
          'action.attackRoll',
        errorCode:
          COMBAT_ACTION_REQUEST_ERROR_CODES.INVALID_ATTACK_ROLL,
        requireD20Modifier:
          true,
        requireNormalMode:
          false
      }
    );

  const damageComponent =
    normalizeDamageComponent(
      value.damageComponents[0]
    );

  return {
    type:
      COMBAT_ACTION_TYPES.ATTACK,
    definitionId:
      readIdentity(
        value.definitionId,
        'action.definitionId'
      ),
    label:
      readIdentity(
        value.label,
        'action.label'
      ),
    source:
      normalizeDefinitionSource(
        value.source
      ),
    hitPolicy:
      COMBAT_ACTION_HIT_POLICIES.AC_TOTAL_V1,
    attackRoll,
    damageComponents: [
      damageComponent
    ]
  };
}


function normalizeDefinitionSource(
  value
) {

  assertPlainObject(
    value,
    'action.source'
  );

  assertAllowedKeys(
    value,
    [
      'kind',
      'pageId',
      'ruleId'
    ],
    'action.source'
  );

  if (value.kind !== 'manual') {

    throw requestError(
      'action.source.kind',
      'unsupported-source-kind'
    );
  }

  const source = {
    kind:
      'manual'
  };

  for (const key of [
    'pageId',
    'ruleId'
  ]) {

    if (value[key] !== undefined) {

      source[key] =
        readIdentity(
          value[key],
          `action.source.${key}`
        );
    }
  }

  return source;
}


function normalizeDamageComponent(
  value
) {

  assertPlainObject(
    value,
    'action.damageComponents[0]'
  );

  assertAllowedKeys(
    value,
    [
      'componentId',
      'damageType',
      'roll'
    ],
    'action.damageComponents[0]'
  );

  return {
    componentId:
      readIdentity(
        value.componentId,
        'action.damageComponents[0].componentId'
      ),
    damageType:
      readIdentity(
        value.damageType,
        'action.damageComponents[0].damageType'
      ),
    roll:
      normalizeRollRequest(
        value.roll,
        {
          field:
            'action.damageComponents[0].roll',
          errorCode:
            COMBAT_ACTION_REQUEST_ERROR_CODES.INVALID_DAMAGE_ROLL,
          requireD20Modifier:
            false,
          requireNormalMode:
            true
        }
      )
  };
}


function normalizeRollRequest(
  value,
  {
    field,
    errorCode,
    requireD20Modifier,
    requireNormalMode
  }
) {

  assertPlainObject(
    value,
    field,
    errorCode
  );

  assertAllowedKeys(
    value,
    [
      'formula',
      'mode',
      'criticalPolicy'
    ],
    field,
    errorCode
  );

  const roll = {
    formula:
      readIdentity(
        value.formula,
        `${field}.formula`,
        errorCode
      ),
    mode:
      readIdentity(
        value.mode,
        `${field}.mode`,
        errorCode
      ),
    criticalPolicy:
      readIdentity(
        value.criticalPolicy,
        `${field}.criticalPolicy`,
        errorCode
      )
  };

  if (roll.criticalPolicy !== COMBAT_ACTION_CRITICAL_POLICY) {

    throw new CombatActionRequestError(
      'The first Combat attack slice requires criticalPolicy none.',
      {
        code:
          COMBAT_ACTION_REQUEST_ERROR_CODES.UNSUPPORTED_POLICY,
        field:
          `${field}.criticalPolicy`,
        reason:
          'unsupported-critical-policy'
      }
    );
  }

  if (
    requireNormalMode &&
    roll.mode !== 'normal'
  ) {

    throw new CombatActionRequestError(
      'The first damage component requires normal roll mode.',
      {
        code:
          COMBAT_ACTION_REQUEST_ERROR_CODES.UNSUPPORTED_POLICY,
        field:
          `${field}.mode`,
        reason:
          'unsupported-damage-mode'
      }
    );
  }

  if (
    requireD20Modifier &&
    !/^1?d20\s*[+-]\s*\d+$/i.test(
      roll.formula
    )
  ) {

    throw new CombatActionRequestError(
      'The first attack requires one d20 plus an explicit integer modifier.',
      {
        code:
          errorCode,
        field:
          `${field}.formula`,
        reason:
          'unsupported-attack-formula-shape'
      }
    );
  }

  const validation =
    validateDiceRoll(
      roll
    );

  if (validation.ok !== true) {

    throw new CombatActionRequestError(
      'Combat action contains an invalid Dice request.',
      {
        code:
          errorCode,
        field,
        reason:
          'dice-validation-failed',
        details: {
          validation
        }
      }
    );
  }

  return roll;
}


function readIdentity(
  value,
  field,
  code =
    COMBAT_ACTION_REQUEST_ERROR_CODES.INVALID_REQUEST
) {

  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {

    throw new CombatActionRequestError(
      `Combat action field ${field} must be a non-empty string.`,
      {
        code,
        field,
        reason:
          'value-required'
      }
    );
  }

  return value.trim();
}


function assertPlainObject(
  value,
  field,
  code =
    COMBAT_ACTION_REQUEST_ERROR_CODES.INVALID_REQUEST
) {

  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![
      Object.prototype,
      null
    ].includes(
      Object.getPrototypeOf(value)
    )
  ) {

    throw new CombatActionRequestError(
      `Combat action field ${field} must be a plain object.`,
      {
        code,
        field,
        reason:
          'plain-object-required'
      }
    );
  }
}


function assertAllowedKeys(
  value,
  allowedKeys,
  field,
  code =
    COMBAT_ACTION_REQUEST_ERROR_CODES.INVALID_REQUEST
) {

  const allowed =
    new Set(
      allowedKeys
    );

  const invalid =
    Reflect.ownKeys(
      value
    ).find(key =>
      typeof key !== 'string' ||
      !allowed.has(key)
    );

  if (invalid !== undefined) {

    throw new CombatActionRequestError(
      `Combat action field ${field} contains an unsupported key.`,
      {
        code,
        field:
          typeof invalid === 'string'
            ? `${field}.${invalid}`
            : field,
        reason:
          'unsupported-key'
      }
    );
  }
}


function requestError(
  field,
  reason
) {

  return new CombatActionRequestError(
    `Combat action request field ${field} is invalid.`,
    {
      field,
      reason
    }
  );
}


function clonePlainData(
  value
) {

  return JSON.parse(
    JSON.stringify(value)
  );
}


export function deepFreezeCombatActionData(
  value,
  seen =
    new WeakSet()
) {

  if (
    value === null ||
    typeof value !== 'object' ||
    seen.has(value)
  ) {

    return value;
  }

  seen.add(
    value
  );

  Object.freeze(
    value
  );

  for (const child of Object.values(value)) {

    deepFreezeCombatActionData(
      child,
      seen
    );
  }

  return value;
}


const deepFreeze =
  deepFreezeCombatActionData;
