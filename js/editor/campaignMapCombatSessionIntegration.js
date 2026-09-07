import {
  COMBAT_SESSION_STATUSES,
  CombatSessionModel
} from '../combat/combatSessionModel.js';
import {
  COMBAT_SESSION_LIFECYCLE_REASONS,
  startCombatSession
} from '../combat/combatSessionLifecycle.js';
import {
  CampaignMapInitiativeModel
} from './campaignMapInitiativeModel.js';

export const CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS = Object.freeze({
  NO_SESSION: 'no-session',
  INVALID_ROSTER_EDIT: 'invalid-roster-edit',
  ROSTER_EDIT_NOT_ALLOWED: 'roster-edit-not-allowed',
  ACTIVE_PARTICIPANT_OUTSIDE_SESSION: 'active-participant-outside-session',
  TURN_PROGRESSION_NOT_ALLOWED: 'turn-progression-not-allowed',
  ROSTER_MISMATCH: 'roster-mismatch',
  ROUND_LIMIT_EXCEEDED: 'round-limit-exceeded'
});

// Pure coordination over the canonical map aggregate. Only the store publishes results.
export function startCombatSessionFromInitiative(mapModel, options = {}) {
  const initiative = new CampaignMapInitiativeModel(mapModel.initiative);

  return startCombatSession(
    mapModel.combatSession,
    {
      participantIds: initiative.participants.map(participant => participant.participantId),
      activeParticipantId: initiative.activeParticipantId
    },
    options
  );
}

export function resolveCombatSessionParticipant(mapModel) {
  const session = mapModel.combatSession;
  if (!session || session.status === COMBAT_SESSION_STATUSES.INACTIVE) {
    return { ok: false, reason: CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.NO_SESSION };
  }

  const initiative = new CampaignMapInitiativeModel(mapModel.initiative);
  const participantId = initiative.activeParticipantId;
  const initiativeParticipant = initiative.getParticipant(participantId);
  if (!initiativeParticipant) {
    return {
      ok: false,
      reason: COMBAT_SESSION_LIFECYCLE_REASONS.ACTIVE_PARTICIPANT_NOT_FOUND,
      participantId
    };
  }

  if (!session.participants.some(member => member.participantId === participantId)) {
    return {
      ok: false,
      reason: CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.ACTIVE_PARTICIPANT_OUTSIDE_SESSION,
      participantId
    };
  }

  return { ok: true, participantId, initiativeParticipant };
}

// This is an explicit roster-edit boundary, never a hydration or integrity repair hook.
export function reconcileCombatSessionRoster(mapModel, initiativeData) {
  const current = mapModel.combatSession;
  const operation = 'reconcile-roster';
  if (!current || current.status === COMBAT_SESSION_STATUSES.INACTIVE) {
    return {
      ok: false,
      operation,
      reason: CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.NO_SESSION
    };
  }

  // Reject before even preparing a replacement initiative: paused/finished state is frozen.
  if (current.status !== COMBAT_SESSION_STATUSES.ACTIVE) {
    return {
      ok: false,
      operation,
      reason: CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.ROSTER_EDIT_NOT_ALLOWED,
      status: current.status
    };
  }

  if (!Array.isArray(initiativeData?.participants)) {
    return {
      ok: false,
      operation,
      reason: CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.INVALID_ROSTER_EDIT
    };
  }

  const initiative = new CampaignMapInitiativeModel(initiativeData);
  const nextIds = new Set(initiative.participants.map(participant => participant.participantId));
  if (nextIds.size !== initiative.participants.length) {
    return {
      ok: false,
      operation,
      reason: COMBAT_SESSION_LIFECYCLE_REASONS.INVALID_PARTICIPANT
    };
  }

  if (initiative.activeParticipantId && !initiative.getParticipant(initiative.activeParticipantId)) {
    return {
      ok: false,
      operation,
      reason: COMBAT_SESSION_LIFECYCLE_REASONS.ACTIVE_PARTICIPANT_NOT_FOUND,
      participantId: initiative.activeParticipantId
    };
  }

  const currentIds = new Set(current.participants.map(member => member.participantId));
  const membershipChanged = currentIds.size !== nextIds.size ||
    [...currentIds].some(id => !nextIds.has(id));

  // Retain the existing membership representation, not the new initiative sort order.
  const participants = current.participants.filter(member => nextIds.has(member.participantId));
  for (const participantId of nextIds) {
    if (!currentIds.has(participantId)) {
      participants.push({ participantId, ready: false, delayed: false });
    }
  }

  const session = new CombatSessionModel({ ...current, participants }).toJSON();
  return {
    ok: true,
    operation,
    initiative: initiative.toJSON(),
    session,
    membershipChanged
  };
}

export function advanceCombatTurn(mapModel) {
  return planCombatTurn(mapModel, true);
}

export function retreatCombatTurn(mapModel) {
  return planCombatTurn(mapModel, false);
}

function planCombatTurn(mapModel, forward) {
  const operation = forward ? 'next-turn' : 'previous-turn';
  const reject = reason => ({ ok: false, operation, reason });
  const current = mapModel.combatSession;
  if (!current || current.status === COMBAT_SESSION_STATUSES.INACTIVE) {
    return reject(CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.NO_SESSION);
  }
  if (current.status !== COMBAT_SESSION_STATUSES.ACTIVE) {
    return reject(CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.TURN_PROGRESSION_NOT_ALLOWED);
  }

  const initiative = new CampaignMapInitiativeModel(mapModel.initiative);
  if (!initiative.participants.length || !current.participants.length) {
    return reject(COMBAT_SESSION_LIFECYCLE_REASONS.EMPTY_ROSTER);
  }

  // Check the observed current id before the initiative owner's defensive fallback can run.
  const previousParticipantId = mapModel.initiative.activeParticipantId;
  const previousIndex = initiative.participants.findIndex(member => member.participantId === previousParticipantId);
  if (previousIndex < 0) {
    return reject(COMBAT_SESSION_LIFECYCLE_REASONS.ACTIVE_PARTICIPANT_NOT_FOUND);
  }
  const memberIds = new Set(current.participants.map(member => member.participantId));
  if (!memberIds.has(previousParticipantId)) {
    return reject(CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.ACTIVE_PARTICIPANT_OUTSIDE_SESSION);
  }
  const initiativeIds = new Set(initiative.participants.map(member => member.participantId));
  if (memberIds.size !== current.participants.length ||
      initiativeIds.size !== initiative.participants.length ||
      memberIds.size !== initiativeIds.size ||
      [...memberIds].some(id => !initiativeIds.has(id))) {
    return reject(CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.ROSTER_MISMATCH);
  }

  const participant = forward ? initiative.nextTurn() : initiative.previousTurn();
  const participantId = initiative.activeParticipantId;
  if (!participant || participant.participantId !== participantId || !initiative.getParticipant(participantId)) {
    return reject(COMBAT_SESSION_LIFECYCLE_REASONS.ACTIVE_PARTICIPANT_NOT_FOUND);
  }
  if (!memberIds.has(participantId)) {
    return reject(CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.ACTIVE_PARTICIPANT_OUTSIDE_SESSION);
  }

  // The single participant is both last and first; unchanged identity still counts as a wrap.
  const wrapped = forward && previousIndex === initiative.participants.length - 1 &&
    participantId === initiative.participants[0].participantId;
  const previousRound = current.round;
  const round = previousRound + (wrapped ? 1 : 0);
  if (!Number.isSafeInteger(round) || round < 1) {
    return reject(CAMPAIGN_MAP_COMBAT_INTEGRATION_REASONS.ROUND_LIMIT_EXCEEDED);
  }
  const session = new CombatSessionModel({ ...current, round }).toJSON();
  return {
    ok: true,
    operation,
    initiative: initiative.toJSON(),
    session,
    wrapped,
    previousParticipantId,
    participantId,
    previousRound,
    round
  };
}
