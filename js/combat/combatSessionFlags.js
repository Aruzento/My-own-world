import {
  COMBAT_SESSION_STATUSES,
  CombatSessionModel
} from './combatSessionModel.js';

export const COMBAT_SESSION_FLAGS_REASONS = Object.freeze({
  NO_SESSION: 'no-session',
  FLAGS_EDIT_NOT_ALLOWED: 'flags-edit-not-allowed',
  PARTICIPANT_NOT_FOUND: 'participant-not-found',
  INVALID_PARTICIPANT: 'invalid-participant',
  INVALID_FLAGS: 'invalid-flags'
});

export function setCombatParticipantFlags(currentSession, participantId, patch) {
  const operation = 'set-participant-flags';
  const reject = reason => ({ ok: false, operation, reason });
  if (!currentSession || currentSession.status === COMBAT_SESSION_STATUSES.INACTIVE) {
    return reject(COMBAT_SESSION_FLAGS_REASONS.NO_SESSION);
  }
  if (currentSession.status !== COMBAT_SESSION_STATUSES.ACTIVE) {
    return reject(COMBAT_SESSION_FLAGS_REASONS.FLAGS_EDIT_NOT_ALLOWED);
  }
  if (typeof participantId !== 'string' || !participantId.trim()) {
    return reject(COMBAT_SESSION_FLAGS_REASONS.INVALID_PARTICIPANT);
  }

  const matches = currentSession.participants.filter(member => member.participantId === participantId);
  if (!matches.length) return reject(COMBAT_SESSION_FLAGS_REASONS.PARTICIPANT_NOT_FOUND);
  if (matches.length !== 1) return reject(COMBAT_SESSION_FLAGS_REASONS.INVALID_PARTICIPANT);

  const flags = readFlagPatch(patch);
  if (!flags) return reject(COMBAT_SESSION_FLAGS_REASONS.INVALID_FLAGS);

  const changed = Object.keys(flags).some(key => matches[0][key] !== flags[key]);
  const session = new CombatSessionModel({
    ...currentSession,
    participants: currentSession.participants.map(member => member.participantId === participantId
      ? { ...member, ...flags }
      : member)
  }, {
    generateId: () => {
      throw new TypeError('Combat flag edits require an existing sessionId.');
    }
  }).toJSON();

  return { ok: true, operation, participantId, changed, session };
}

function readFlagPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return null;
  const prototype = Object.getPrototypeOf(patch);
  if (prototype !== Object.prototype && prototype !== null) return null;

  // Explicit commands accept boolean data only, unlike permissive hydration.
  // Descriptors also reject accessors without executing them and include hidden/symbol keys.
  const descriptors = Object.getOwnPropertyDescriptors(patch);
  const keys = Reflect.ownKeys(descriptors);
  if (!keys.length || keys.some(key =>
    (key !== 'ready' && key !== 'delayed') || typeof descriptors[key].value !== 'boolean'
  )) return null;

  return Object.fromEntries(keys.map(key => [key, descriptors[key].value]));
}
