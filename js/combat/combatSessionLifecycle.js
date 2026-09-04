import {
  COMBAT_SESSION_STATUSES,
  CombatSessionModel
} from './combatSessionModel.js';


export const COMBAT_SESSION_LIFECYCLE_OPERATIONS =
  Object.freeze({
    START:
      'start',
    PAUSE:
      'pause',
    RESUME:
      'resume',
    FINISH:
      'finish'
  });

export const COMBAT_SESSION_LIFECYCLE_REASONS =
  Object.freeze({
    INVALID_TRANSITION:
      'invalid-transition',
    EMPTY_ROSTER:
      'empty-roster',
    ACTIVE_PARTICIPANT_REQUIRED:
      'active-participant-required',
    ACTIVE_PARTICIPANT_NOT_FOUND:
      'active-participant-not-found',
    INVALID_PARTICIPANT:
      'invalid-participant'
  });


export function startCombatSession(
  currentSession,
  startContext = {},
  options = {}
) {

  const operation =
    COMBAT_SESSION_LIFECYCLE_OPERATIONS.START;

  const current =
    normalizeCurrentSession(
      currentSession
    );

  if (
    current &&
    current.status !== COMBAT_SESSION_STATUSES.FINISHED
  ) {

    return createRejectedResult(
      operation,
      COMBAT_SESSION_LIFECYCLE_REASONS.INVALID_TRANSITION,
      current
    );
  }

  const rosterResult =
    normalizeStartRoster(
      startContext?.participantIds
    );

  if (!rosterResult.ok) {

    return createRejectedResult(
      operation,
      rosterResult.reason,
      current
    );
  }

  const activeParticipantId =
    normalizeText(
      startContext?.activeParticipantId
    );

  if (!activeParticipantId) {

    return createRejectedResult(
      operation,
      COMBAT_SESSION_LIFECYCLE_REASONS.ACTIVE_PARTICIPANT_REQUIRED,
      current
    );
  }

  if (
    !rosterResult.participantIds.includes(
      activeParticipantId
    )
  ) {

    return createRejectedResult(
      operation,
      COMBAT_SESSION_LIFECYCLE_REASONS.ACTIVE_PARTICIPANT_NOT_FOUND,
      current
    );
  }

  const session =
    new CombatSessionModel(
      {
        status:
          COMBAT_SESSION_STATUSES.ACTIVE,
        round:
          1,
        participants:
          rosterResult.participantIds.map(participantId => ({
            participantId,
            ready:
              false,
            delayed:
              false
          }))
      },
      {
        generateId:
          options.generateId
      }
    ).toJSON();

  return createSuccessResult(
    operation,
    session
  );
}


export function pauseCombatSession(
  currentSession
) {

  return transitionCombatSession(
    currentSession,
    COMBAT_SESSION_LIFECYCLE_OPERATIONS.PAUSE,
    [
      COMBAT_SESSION_STATUSES.ACTIVE
    ],
    COMBAT_SESSION_STATUSES.PAUSED
  );
}


export function resumeCombatSession(
  currentSession
) {

  return transitionCombatSession(
    currentSession,
    COMBAT_SESSION_LIFECYCLE_OPERATIONS.RESUME,
    [
      COMBAT_SESSION_STATUSES.PAUSED
    ],
    COMBAT_SESSION_STATUSES.ACTIVE
  );
}


export function finishCombatSession(
  currentSession
) {

  return transitionCombatSession(
    currentSession,
    COMBAT_SESSION_LIFECYCLE_OPERATIONS.FINISH,
    [
      COMBAT_SESSION_STATUSES.ACTIVE,
      COMBAT_SESSION_STATUSES.PAUSED
    ],
    COMBAT_SESSION_STATUSES.FINISHED
  );
}


function transitionCombatSession(
  currentSession,
  operation,
  allowedStatuses,
  nextStatus
) {

  const current =
    normalizeCurrentSession(
      currentSession
    );

  if (
    !current ||
    !allowedStatuses.includes(
      current.status
    )
  ) {

    return createRejectedResult(
      operation,
      COMBAT_SESSION_LIFECYCLE_REASONS.INVALID_TRANSITION,
      current
    );
  }

  const session =
    new CombatSessionModel(
      {
        ...current,
        status:
          nextStatus
      },
      {
        generateId:
          rejectMissingLifecycleSessionId
      }
    ).toJSON();

  return createSuccessResult(
    operation,
    session
  );
}


function normalizeCurrentSession(
  currentSession
) {

  if (
    currentSession === null ||
    currentSession === undefined ||
    currentSession?.status === COMBAT_SESSION_STATUSES.INACTIVE
  ) return null;

  return new CombatSessionModel(
    currentSession,
    {
      generateId:
        rejectMissingLifecycleSessionId
    }
  ).toJSON();
}


function normalizeStartRoster(
  participantIds
) {

  if (
    !Array.isArray(
      participantIds
    ) ||
    !participantIds.length
  ) {

    return {
      ok:
        false,
      reason:
        COMBAT_SESSION_LIFECYCLE_REASONS.EMPTY_ROSTER
    };
  }

  const normalizedIds =
    participantIds.map(
      normalizeText
    );

  if (
    normalizedIds.some(participantId =>
      !participantId
    ) ||
    new Set(
      normalizedIds
    ).size !== normalizedIds.length
  ) {

    return {
      ok:
        false,
      reason:
        COMBAT_SESSION_LIFECYCLE_REASONS.INVALID_PARTICIPANT
    };
  }

  return {
    ok:
      true,
    participantIds:
      normalizedIds
  };
}


function createSuccessResult(
  operation,
  session
) {

  return {
    ok:
      true,
    operation,
    session
  };
}


function createRejectedResult(
  operation,
  reason,
  session
) {

  return {
    ok:
      false,
    operation,
    reason,
    session
  };
}


function rejectMissingLifecycleSessionId() {

  throw new TypeError(
    'Combat Session lifecycle requires an existing sessionId.'
  );
}


function normalizeText(
  value
) {

  return typeof value === 'string'
    ? value.trim()
    : '';
}
