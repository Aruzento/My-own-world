export const COMBAT_SESSION_KIND =
  'CombatSession';

export const COMBAT_SESSION_VERSION =
  1;

export const COMBAT_SESSION_STATUSES =
  Object.freeze({
    INACTIVE:
      'inactive',
    ACTIVE:
      'active',
    PAUSED:
      'paused',
    FINISHED:
      'finished'
  });

export const COMBAT_SESSION_INTEGRITY_STATUSES =
  Object.freeze({
    UNCHECKED:
      'unchecked',
    VALID:
      'valid',
    UNRESOLVED:
      'unresolved'
  });

export const COMBAT_SESSION_REFERENCE_TYPES =
  Object.freeze({
    INITIATIVE_PARTICIPANT:
      'initiative-participant',
    TOKEN:
      'token',
    PAGE:
      'page'
  });


export class CombatSessionModel {

  constructor(
    data = {},
    {
      generateId =
        generateCombatSessionId
    } = {}
  ) {

    this.kind =
      COMBAT_SESSION_KIND;

    this.version =
      COMBAT_SESSION_VERSION;

    this.sessionId =
      normalizeSessionId(
        data.sessionId,
        generateId
      );

    this.status =
      normalizeStatus(
        data.status
      );

    this.round =
      normalizeRound(
        data.round
      );

    this.participants =
      normalizeParticipants(
        data.participants
      );

    this.integrity =
      normalizeIntegrity(
        data.integrity
      );
  }


  toJSON() {

    return {
      kind:
        this.kind,
      version:
        this.version,
      sessionId:
        this.sessionId,
      status:
        this.status,
      round:
        this.round,
      participants:
        this.participants.map(participant => ({
          ...participant
        }))
    };
  }
}


function generateCombatSessionId() {

  if (!globalThis.crypto?.randomUUID) {

    throw new Error(
      'Combat Session identity generation is unavailable.'
    );
  }

  return globalThis.crypto.randomUUID();
}


function normalizeSessionId(
  value,
  generateId
) {

  const existingId =
    normalizeText(
      value
    );

  if (existingId) return existingId;

  if (typeof generateId !== 'function') {

    throw new TypeError(
      'Combat Session generateId must be a function.'
    );
  }

  const generatedId =
    normalizeText(
      generateId()
    );

  if (!generatedId) {

    throw new TypeError(
      'Combat Session generateId must return a non-empty identity.'
    );
  }

  return generatedId;
}


function normalizeStatus(
  value
) {

  return Object
    .values(
      COMBAT_SESSION_STATUSES
    )
    .includes(
      value
    )
      ? value
      : COMBAT_SESSION_STATUSES.ACTIVE;
}


function normalizeRound(
  value
) {

  const round =
    Number(value ?? 1);

  return Number.isSafeInteger(
    round
  ) && round >= 1
    ? round
    : 1;
}


function normalizeParticipants(
  participants = []
) {

  if (!Array.isArray(participants)) return [];

  return participants.map(
    normalizeParticipant
  );
}


function normalizeParticipant(
  data = {}
) {

  const participantId =
    normalizeText(
      data.participantId
    );

  if (!participantId) {

    throw new TypeError(
      'Combat Session participantId must be a non-empty identity.'
    );
  }

  return {
    participantId,
    ready:
      Boolean(
        data.ready
      ),
    delayed:
      Boolean(
        data.delayed
      )
  };
}


function normalizeIntegrity(
  integrity = {}
) {

  const issues =
    Array.isArray(integrity?.issues)
      ? integrity.issues.map(
        normalizeIntegrityIssue
      )
      : [];

  return {
    status:
      issues.length
        ? COMBAT_SESSION_INTEGRITY_STATUSES.UNRESOLVED
        : normalizeIntegrityStatus(
          integrity?.status
        ),
    issues
  };
}


function normalizeIntegrityIssue(
  issue = {}
) {

  const participantId =
    normalizeText(
      issue.participantId
    );

  if (!participantId) {

    throw new TypeError(
      'Combat Session integrity issue participantId must be a non-empty identity.'
    );
  }

  if (
    !Object
      .values(
        COMBAT_SESSION_REFERENCE_TYPES
      )
      .includes(
        issue.referenceType
      )
  ) {

    throw new TypeError(
      'Combat Session integrity issue referenceType is invalid.'
    );
  }

  return {
    participantId,
    referenceType:
      issue.referenceType
  };
}


function normalizeIntegrityStatus(
  value
) {

  return Object
    .values(
      COMBAT_SESSION_INTEGRITY_STATUSES
    )
    .includes(
      value
    )
      ? value
      : COMBAT_SESSION_INTEGRITY_STATUSES.UNCHECKED;
}


function normalizeText(
  value
) {

  return typeof value === 'string'
    ? value.trim()
    : '';
}
