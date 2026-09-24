import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCombatAttackPresentation,
  createManualCombatAttackRequest
} from '../js/editor/campaignMapCombatAttackUi.js';


test('manual attack UI creates the strict canonical request', () => {
  const request = createManualCombatAttackRequest({
    actionId: 'action-1',
    definitionId: 'definition-1',
    componentId: 'damage-1',
    mapPageId: 'map-1',
    sessionId: 'session-1',
    actorParticipantId: 'token:actor',
    targetParticipantId: 'token:target',
    label: 'Shortbow',
    attackFormula: 'd20 + 4',
    damageFormula: '1d6 + 2',
    damageType: 'piercing'
  });

  assert.equal(Object.isFrozen(request), true);
  assert.deepEqual(request, {
    kind: 'CombatActionRequest', version: 1, actionId: 'action-1', mapPageId: 'map-1', sessionId: 'session-1',
    actor: { participantId: 'token:actor' }, target: { participantId: 'token:target' },
    action: { type: 'attack', definitionId: 'definition-1', label: 'Shortbow', source: { kind: 'manual' },
      hitPolicy: 'ac-total-v1', attackRoll: { formula: 'd20 + 4', mode: 'normal', criticalPolicy: 'none' },
      damageComponents: [{ componentId: 'damage-1', damageType: 'piercing',
        roll: { formula: '1d6 + 2', mode: 'normal', criticalPolicy: 'none' } }] }
  });
});


test('attack presentation distinguishes durable results and partial durability', () => {
  const durable = createCombatAttackPresentation({ ok: true, state: 'persisted', audit: 'durable', resolution: {
    outcome: 'hit', definition: { label: 'Shortbow' }, attackRoll: { total: 14 }, defense: { value: 12 },
    damageComponents: [{ amount: 5, damageType: 'piercing' }],
    health: { before: { hpCurrent: 10, hpMax: 10, hpTemp: 2 }, after: { hpCurrent: 7, hpMax: 10, hpTemp: 0 } }
  } });
  assert.deepEqual(durable, {
    tone: 'success', status: 'hit', technicalReason: '', message: 'Попадание', label: 'Shortbow',
    attackTotal: 14, armorClass: 12, damageAmount: 5, damageType: 'piercing',
    healthBefore: { hpCurrent: 10, hpMax: 10, hpTemp: 2 },
    healthAfter: { hpCurrent: 7, hpMax: 10, hpTemp: 0 }, historyDurable: true
  });
  assert.match(createCombatAttackPresentation({ state: 'persisted', audit: 'unconfirmed' }).message, /Не повторяйте атаку/);
  assert.match(createCombatAttackPresentation({ state: 'uncertain', audit: 'not-attempted' }).message, /не подтверждено/);
  assert.match(createCombatAttackPresentation({ state: 'unchanged', audit: 'not-attempted', reason: 'COMBAT_CONTEXT_STALE' }).message, /состояние боя изменилось/);
});
