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
  ACTIVE_PARTICIPANT_OUTSIDE_SESSION: 'active-participant-outside-session'
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
