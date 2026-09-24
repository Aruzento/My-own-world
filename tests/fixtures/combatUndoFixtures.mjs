import { createCombatActionWorld, attackRequest } from './combatActionFixtures.mjs';
import { executeCombatAttack } from '../../js/combat/combatActionPipeline.js';
import { undoTransaction } from '../../js/events/transactionReversal.js';

export function undoInput(transactionId, suffix = '1') {
  return { transactionId, reversalTransactionId: `undo-${suffix}`, reversalEventId: `inverse-${suffix}`,
    reversalMetadataEventId: `metadata-${suffix}`, createdAt: '2026-09-23T10:00:00.000Z', reason: 'fixture-undo' };
}

export async function createCombatUndoWorld({ scenario = 'both', ...options } = {}) {
  const w = await createCombatActionWorld({ temp: scenario === 'both' ? 2 : scenario === 'temp' ? 8 : 0,
    current: scenario === 'clamped' ? 0 : 10, dice: scenario === 'miss' ? [3] : [10, 3], ...options });
  const request = attackRequest();
  if (scenario === 'zero') request.action.damageComponents[0].roll.formula = '0';
  const attack = await executeCombatAttack(request, w.options);
  if (!attack.ok) throw new Error(JSON.stringify(attack));
  w.effects.writes = w.effects.appends = w.effects.reads = 0;
  return { ...w, attack, undo: (suffix = '1', extraOptions = {}) => undoTransaction(undoInput(attack.transactionId, suffix),
    { storageAdapter: w.adapter, ...extraOptions }) };
}
