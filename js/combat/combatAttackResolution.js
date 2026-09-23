import {
  getCharacterEffectiveArmorClass,
  readCharacterModelFromPage
} from '../character/characterModel.js';

import {
  rollDice
} from '../dice/diceEngine.js';

import {
  getAllPages,
  getPageById
} from '../repository/pageRepository.js';

import {
  prepareCharacterHealthMutation
} from '../properties/characterHealthMutation.js';

import {
  getPropertiesArmorClassInputSource
} from '../properties/propertiesCalculationEngine.js';

import {
  COMBAT_SESSION_STATUSES
} from './combatSessionModel.js';

import {
  COMBAT_ACTION_CRITICAL_POLICY,
  COMBAT_ACTION_OUTCOMES,
  COMBAT_ACTION_RESOLUTION_KIND,
  COMBAT_ACTION_RESOLUTION_VERSION,
  deepFreezeCombatActionData,
  resolveAcTotalOutcome,
  validateCombatActionRequest
} from './combatActionModel.js';


export const COMBAT_ATTACK_RESOLUTION_ERROR_CODES =
  Object.freeze({
    INVALID_CONTEXT:
      'COMBAT_ATTACK_INVALID_CONTEXT',
    COMBAT_NOT_ACTIVE:
      'COMBAT_ATTACK_COMBAT_NOT_ACTIVE',
    MAP_MISMATCH:
      'COMBAT_ATTACK_MAP_MISMATCH',
    SESSION_MISMATCH:
      'COMBAT_ATTACK_SESSION_MISMATCH',
    ACTOR_NOT_CURRENT:
      'COMBAT_ATTACK_ACTOR_NOT_CURRENT',
    ACTOR_NOT_IN_ROSTER:
      'COMBAT_ATTACK_ACTOR_NOT_IN_ROSTER',
    TARGET_NOT_IN_ROSTER:
      'COMBAT_ATTACK_TARGET_NOT_IN_ROSTER',
    PARTICIPANT_MISSING:
      'COMBAT_ATTACK_PARTICIPANT_MISSING',
    PARTICIPANT_AMBIGUOUS:
      'COMBAT_ATTACK_PARTICIPANT_AMBIGUOUS',
    TOKEN_MISSING:
      'COMBAT_ATTACK_TOKEN_MISSING',
    TOKEN_AMBIGUOUS:
      'COMBAT_ATTACK_TOKEN_AMBIGUOUS',
    PAGE_MISSING:
      'COMBAT_ATTACK_PAGE_MISSING',
    REFERENCE_INCONSISTENT:
      'COMBAT_ATTACK_REFERENCE_INCONSISTENT',
    SAME_CHARACTER_PAGE:
      'COMBAT_ATTACK_SAME_CHARACTER_PAGE',
    CHARACTER_UNSUPPORTED:
      'COMBAT_ATTACK_CHARACTER_UNSUPPORTED',
    DEFENSE_INVALID:
      'COMBAT_ATTACK_DEFENSE_INVALID',
    ATTACK_ROLL_FAILED:
      'COMBAT_ATTACK_ROLL_FAILED',
    DAMAGE_ROLL_FAILED:
      'COMBAT_ATTACK_DAMAGE_ROLL_FAILED',
    DAMAGE_INVALID:
      'COMBAT_ATTACK_DAMAGE_INVALID',
    HEALTH_PREPARATION_FAILED:
      'COMBAT_ATTACK_HEALTH_PREPARATION_FAILED',
    OBSERVATION_STALE:
      'COMBAT_ATTACK_OBSERVATION_STALE'
  });


export class CombatAttackResolutionError extends Error {

  constructor(
    message,
    {
      code =
        COMBAT_ATTACK_RESOLUTION_ERROR_CODES.INVALID_CONTEXT,
      phase =
        'preflight',
      participantId =
        '',
      reason =
        '',
      details =
        null,
      cause =
        null
    } = {}
  ) {

    super(
      message,
      cause
        ? {
          cause
        }
        : undefined
    );

    this.name =
      'CombatAttackResolutionError';

    this.code =
      code;

    this.phase =
      phase;

    this.participantId =
      participantId;

    this.reason =
      reason;

    this.details =
      details === null
        ? null
        : deepFreezeCombatActionData(
          clonePlainData(
            details
          )
        );
  }
}


export async function resolveSingleTargetAttack(
  request,
  {
    mapPageId,
    mapModel,
    pages =
      null,
    resolvePage =
      getPageById,
    randomInt,
    storageAdapter =
      null
  } = {}
) {

  const normalizedRequest =
    validateCombatActionRequest(
      request
    );

  assertRuntimeContext({
    mapPageId,
    mapModel,
    resolvePage,
    randomInt
  });

  const resolvedPages =
    Array.isArray(pages)
      ? [
        ...pages
      ]
      : getAllPages();

  const observation =
    resolveAttackObservation({
      request:
        normalizedRequest,
      mapPageId,
      mapModel,
      pages:
        resolvedPages,
      resolvePage
    });

  let attackRoll;

  try {

    attackRoll =
      rollDice(
        normalizedRequest.action.attackRoll,
        randomInt
          ? {
            randomInt
          }
          : {}
      );

  } catch (error) {

    throw executionError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.ATTACK_ROLL_FAILED,
      'attack-roll',
      'Attack roll failed.',
      error
    );
  }

  const outcome =
    resolveAcTotalOutcome(
      attackRoll.total,
      observation.defense.value
    );

  if (outcome === COMBAT_ACTION_OUTCOMES.MISS) {

    assertObservationCurrent({
      observation,
      mapPageId,
      mapModel,
      resolvePage
    });

    return createResolution({
      request:
        normalizedRequest,
      observation,
      attackRoll,
      outcome,
      damageComponents: [],
      health:
        null
    });
  }

  const damageDefinition =
    normalizedRequest.action.damageComponents[0];

  let damageRoll;

  try {

    damageRoll =
      rollDice(
        damageDefinition.roll,
        randomInt
          ? {
            randomInt
          }
          : {}
      );

  } catch (error) {

    throw executionError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.DAMAGE_ROLL_FAILED,
      'damage-roll',
      'Damage roll failed.',
      error
    );
  }

  if (
    !Number.isSafeInteger(damageRoll.total) ||
    damageRoll.total < 0
  ) {

    throw new CombatAttackResolutionError(
      'Damage result must be a non-negative safe integer.',
      {
        code:
          COMBAT_ATTACK_RESOLUTION_ERROR_CODES.DAMAGE_INVALID,
        phase:
          'damage-result',
        reason:
          'unsupported-damage-total',
        details: {
          total:
            damageRoll.total
        }
      }
    );
  }

  assertObservationCurrent({
    observation,
    mapPageId,
    mapModel,
    resolvePage
  });

  let mutationPlan;

  try {

    mutationPlan =
      await prepareCharacterHealthMutation(
        observation.targetPage,
        {
          type: 'delta',
          delta:
            -damageRoll.total
        },
        {
          pages:
            resolvedPages,
          storageAdapter
        }
      );

  } catch (error) {

    throw executionError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.HEALTH_PREPARATION_FAILED,
      'health-preparation',
      'Target health mutation preparation failed.',
      error
    );
  }

  assertObservationCurrent({
    observation,
    mapPageId,
    mapModel,
    resolvePage
  });

  const damageComponents = [
    {
      componentId:
        damageDefinition.componentId,
      damageType:
        damageDefinition.damageType,
      roll:
        damageRoll,
      amount:
        damageRoll.total
    }
  ];

  return createResolution({
    request:
      normalizedRequest,
    observation,
    attackRoll,
    outcome,
    damageComponents,
    health: {
      before:
        mutationPlan.before,
      after:
        mutationPlan.after,
      mutationPlan
    }
  });
}


export function readCombatAttackObservation({
  request, mapPageId, mapModel, pages = getAllPages(), resolvePage = getPageById
}) {
  const observation = resolveAttackObservation({ request: validateCombatActionRequest(request), mapPageId, mapModel, pages, resolvePage });
  return deepFreezeCombatActionData({ mapPageId: observation.mapPageId, sessionId: observation.sessionId,
    round: observation.round, actor: observation.actor, target: observation.target, defense: observation.defense,
    actorContent: observation.actorPage.content, targetContent: observation.targetPage.content,
    actorPath: observation.actorPage.path, targetPath: observation.targetPage.path });
}

function resolveAttackObservation({
  request,
  mapPageId,
  mapModel,
  pages,
  resolvePage
}) {

  const session =
    mapModel.combatSession;

  if (
    !session ||
    session.status !== COMBAT_SESSION_STATUSES.ACTIVE
  ) {

    throw new CombatAttackResolutionError(
      'Single-target attack resolution requires an active Combat Session.',
      {
        code:
          COMBAT_ATTACK_RESOLUTION_ERROR_CODES.COMBAT_NOT_ACTIVE,
        reason:
          session?.status || 'missing-session'
      }
    );
  }

  if (request.mapPageId !== mapPageId) {

    throw new CombatAttackResolutionError(
      'Combat action map identity does not match the current map.',
      {
        code:
          COMBAT_ATTACK_RESOLUTION_ERROR_CODES.MAP_MISMATCH,
        reason:
          'map-page-id-mismatch'
      }
    );
  }

  if (request.sessionId !== session.sessionId) {

    throw new CombatAttackResolutionError(
      'Combat action session identity is stale.',
      {
        code:
          COMBAT_ATTACK_RESOLUTION_ERROR_CODES.SESSION_MISMATCH,
        reason:
          'session-id-mismatch'
      }
    );
  }

  const activeParticipantId =
    String(
      mapModel.initiative?.activeParticipantId || ''
    );

  if (
    !activeParticipantId ||
    request.actor.participantId !== activeParticipantId
  ) {

    throw new CombatAttackResolutionError(
      'Combat action actor is not the canonical current Initiative participant.',
      {
        code:
          COMBAT_ATTACK_RESOLUTION_ERROR_CODES.ACTOR_NOT_CURRENT,
        participantId:
          request.actor.participantId,
        reason:
          'stale-current-participant'
      }
    );
  }

  assertRosterMembership(
    session,
    request.actor.participantId,
    COMBAT_ATTACK_RESOLUTION_ERROR_CODES.ACTOR_NOT_IN_ROSTER
  );

  assertRosterMembership(
    session,
    request.target.participantId,
    COMBAT_ATTACK_RESOLUTION_ERROR_CODES.TARGET_NOT_IN_ROSTER
  );

  const actor =
    resolveExactParticipant({
      participantId:
        request.actor.participantId,
      mapModel,
      pages,
      resolvePage
    });

  const target =
    resolveExactParticipant({
      participantId:
        request.target.participantId,
      mapModel,
      pages,
      resolvePage
    });

  if (actor.pageId === target.pageId) {

    throw new CombatAttackResolutionError(
      'Actor and target cannot resolve to the same Character page.',
      {
        code:
          COMBAT_ATTACK_RESOLUTION_ERROR_CODES.SAME_CHARACTER_PAGE,
        reason:
          'shared-character-page'
      }
    );
  }

  const defense =
    resolveTargetDefense({
      target,
      pages
    });

  return {
    mapPageId,
    sessionId:
      session.sessionId,
    round:
      session.round,
    activeParticipantId,
    actor:
      createIdentityEvidence(
        actor
      ),
    target:
      createIdentityEvidence(
        target
      ),
    defense,
    actorPage:
      actor.page,
    targetPage:
      target.page,
    targetContent:
      target.page.content
  };
}


function resolveTargetDefense({
  target,
  pages
}) {

  const input =
    getPropertiesArmorClassInputSource({
      content:
        target.page.content,
      pages,
      effectsModel:
        target.character.effects
    });

  if (input.ok !== true) {

    throw defenseError(
      target,
      input.reason
    );
  }

  const value =
    getCharacterEffectiveArmorClass(
      target.character
    );

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {

    throw defenseError(
      target,
      'invalid-effective-armor-class'
    );
  }

  return {
    kind:
      'ac',
    value
  };
}


function defenseError(
  target,
  reason
) {

  return new CombatAttackResolutionError(
    'Target Character armor class source is invalid.',
    {
      code:
        COMBAT_ATTACK_RESOLUTION_ERROR_CODES.DEFENSE_INVALID,
      participantId:
        target.participantId,
      reason
    }
  );
}


function resolveExactParticipant({
  participantId,
  mapModel,
  pages,
  resolvePage
}) {

  const initiativeMatches =
    (mapModel.initiative?.participants || [])
      .filter(participant =>
        participant.participantId === participantId
      );

  if (initiativeMatches.length === 0) {

    throw identityError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.PARTICIPANT_MISSING,
      participantId,
      'initiative-participant-missing'
    );
  }

  if (initiativeMatches.length !== 1) {

    throw identityError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.PARTICIPANT_AMBIGUOUS,
      participantId,
      'initiative-participant-ambiguous'
    );
  }

  const participant =
    initiativeMatches[0];

  if (
    typeof participant.tokenId !== 'string' ||
    !participant.tokenId ||
    typeof participant.pageId !== 'string' ||
    !participant.pageId ||
    participant.participantId !== `token:${participant.tokenId}`
  ) {

    throw identityError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.REFERENCE_INCONSISTENT,
      participantId,
      'participant-reference-invalid'
    );
  }

  const tokenMatches =
    (mapModel.tokens || [])
      .filter(token =>
        token.tokenId === participant.tokenId
      );

  if (tokenMatches.length === 0) {

    throw identityError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.TOKEN_MISSING,
      participantId,
      'token-missing'
    );
  }

  if (tokenMatches.length !== 1) {

    throw identityError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.TOKEN_AMBIGUOUS,
      participantId,
      'token-ambiguous'
    );
  }

  const token =
    tokenMatches[0];

  if (token.pageId !== participant.pageId) {

    throw identityError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.REFERENCE_INCONSISTENT,
      participantId,
      'token-page-mismatch'
    );
  }

  const pageMatches =
    pages.filter(page =>
      page?.id === participant.pageId
    );

  const page =
    pageMatches.length === 1
      ? resolvePage(
        participant.pageId
      )
      : null;

  if (
    pageMatches.length !== 1 ||
    !page ||
    typeof page !== 'object' ||
    page.id !== participant.pageId
  ) {

    throw identityError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.PAGE_MISSING,
      participantId,
      'page-missing'
    );
  }

  const character =
    readCharacterModelFromPage(
      page,
      {
        pages
      }
    );

  if (
    character?.source !== 'properties' ||
    ![
      'character',
      'creature'
    ].includes(
      character.cardType
    ) ||
    character.pageId !== page.id
  ) {

    throw identityError(
      COMBAT_ATTACK_RESOLUTION_ERROR_CODES.CHARACTER_UNSUPPORTED,
      participantId,
      'properties-character-required'
    );
  }

  return {
    participantId,
    tokenId:
      participant.tokenId,
    pageId:
      participant.pageId,
    page,
    character
  };
}


function assertRosterMembership(
  session,
  participantId,
  code
) {

  const matches =
    (session.participants || [])
      .filter(member =>
        member.participantId === participantId
      );

  if (matches.length !== 1) {

    throw identityError(
      code,
      participantId,
      matches.length === 0
        ? 'participant-outside-session'
        : 'session-membership-ambiguous'
    );
  }
}


function assertObservationCurrent({
  observation,
  mapPageId,
  mapModel,
  resolvePage
}) {

  const session =
    mapModel.combatSession;

  const actorParticipant =
    findUniqueBy(
      mapModel.initiative?.participants,
      'participantId',
      observation.actor.participantId
    );

  const targetParticipant =
    findUniqueBy(
      mapModel.initiative?.participants,
      'participantId',
      observation.target.participantId
    );

  const actorToken =
    findUniqueBy(
      mapModel.tokens,
      'tokenId',
      observation.actor.tokenId
    );

  const targetToken =
    findUniqueBy(
      mapModel.tokens,
      'tokenId',
      observation.target.tokenId
    );

  const targetPage =
    resolvePage(
      observation.target.pageId
    );

  const current =
    mapPageId === observation.mapPageId &&
    session?.status === COMBAT_SESSION_STATUSES.ACTIVE &&
    session?.sessionId === observation.sessionId &&
    session?.round === observation.round &&
    mapModel.initiative?.activeParticipantId === observation.activeParticipantId &&
    hasSessionMember(
      session,
      observation.actor.participantId
    ) &&
    hasSessionMember(
      session,
      observation.target.participantId
    ) &&
    actorParticipant?.tokenId === observation.actor.tokenId &&
    actorParticipant?.pageId === observation.actor.pageId &&
    targetParticipant?.tokenId === observation.target.tokenId &&
    targetParticipant?.pageId === observation.target.pageId &&
    actorToken?.pageId === observation.actor.pageId &&
    targetToken?.pageId === observation.target.pageId &&
    targetPage?.id === observation.target.pageId &&
    targetPage?.content === observation.targetContent;

  if (!current) {

    throw new CombatAttackResolutionError(
      'Combat attack observations became stale during resolution.',
      {
        code:
          COMBAT_ATTACK_RESOLUTION_ERROR_CODES.OBSERVATION_STALE,
        phase:
          'post-resolution',
        reason:
          'observation-changed'
      }
    );
  }
}


function createResolution({
  request,
  observation,
  attackRoll,
  outcome,
  damageComponents,
  health
}) {

  return deepFreezeCombatActionData({
    kind:
      COMBAT_ACTION_RESOLUTION_KIND,
    version:
      COMBAT_ACTION_RESOLUTION_VERSION,
    actionId:
      request.actionId,
    mapPageId:
      observation.mapPageId,
    sessionId:
      observation.sessionId,
    round:
      observation.round,
    actor:
      observation.actor,
    target:
      observation.target,
    definition: {
      definitionId:
        request.action.definitionId,
      label:
        request.action.label,
      source:
        request.action.source
    },
    policy: {
      hitPolicy:
        request.action.hitPolicy,
      criticalPolicy:
        COMBAT_ACTION_CRITICAL_POLICY
    },
    defense:
      observation.defense,
    attackRoll,
    outcome,
    damageComponents,
    health
  });
}


function createIdentityEvidence(
  resolved
) {

  return {
    participantId:
      resolved.participantId,
    tokenId:
      resolved.tokenId,
    pageId:
      resolved.pageId
  };
}


function assertRuntimeContext({
  mapPageId,
  mapModel,
  resolvePage,
  randomInt
}) {

  if (
    typeof mapPageId !== 'string' ||
    !mapPageId.trim() ||
    !mapModel ||
    typeof mapModel !== 'object' ||
    typeof resolvePage !== 'function' ||
    (
      randomInt !== undefined &&
      typeof randomInt !== 'function'
    )
  ) {

    throw new CombatAttackResolutionError(
      'Combat attack resolution requires an exact map context and page resolver.',
      {
        code:
          COMBAT_ATTACK_RESOLUTION_ERROR_CODES.INVALID_CONTEXT,
        reason:
          'invalid-runtime-context'
      }
    );
  }
}


function findUniqueBy(
  values,
  key,
  expected
) {

  const matches =
    (values || [])
      .filter(value =>
        value?.[key] === expected
      );

  return matches.length === 1
    ? matches[0]
    : null;
}


function hasSessionMember(
  session,
  participantId
) {

  return (
    session?.participants || []
  ).filter(member =>
    member.participantId === participantId
  ).length === 1;
}


function identityError(
  code,
  participantId,
  reason
) {

  return new CombatAttackResolutionError(
    'Combat participant identity could not be resolved exactly.',
    {
      code,
      participantId,
      reason
    }
  );
}


function executionError(
  code,
  phase,
  message,
  cause
) {

  return new CombatAttackResolutionError(
    message,
    {
      code,
      phase,
      reason:
        String(
          cause?.code ||
          cause?.reason ||
          cause?.message ||
          'execution-failed'
        ),
      cause
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
