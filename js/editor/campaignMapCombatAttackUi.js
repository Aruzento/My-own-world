import {
  validateCombatActionRequest
} from '../combat/combatActionModel.js';


export function createManualCombatAttackRequest({
  actionId,
  definitionId,
  componentId,
  mapPageId,
  sessionId,
  actorParticipantId,
  targetParticipantId,
  label,
  attackFormula,
  damageFormula,
  damageType
}) {

  return validateCombatActionRequest({
    kind: 'CombatActionRequest',
    version: 1,
    actionId,
    mapPageId,
    sessionId,
    actor: {
      participantId: actorParticipantId
    },
    target: {
      participantId: targetParticipantId
    },
    action: {
      type: 'attack',
      definitionId,
      label,
      source: {
        kind: 'manual'
      },
      hitPolicy: 'ac-total-v1',
      attackRoll: {
        formula: attackFormula,
        mode: 'normal',
        criticalPolicy: 'none'
      },
      damageComponents: [
        {
          componentId,
          damageType,
          roll: {
            formula: damageFormula,
            mode: 'normal',
            criticalPolicy: 'none'
          }
        }
      ]
    }
  });
}


export function createCombatAttackPresentation(result) {

  const resolution = result?.resolution || null;
  const technicalReason = String(result?.reason || '');

  if (result?.ok && result.audit === 'durable' && resolution) {

    const damage = resolution.damageComponents?.[0] || null;
    const health = resolution.health || null;

    return Object.freeze({
      tone: resolution.outcome === 'hit' ? 'success' : 'neutral',
      status: resolution.outcome,
      technicalReason,
      message: resolution.outcome === 'hit'
        ? '\u041f\u043e\u043f\u0430\u0434\u0430\u043d\u0438\u0435'
        : '\u041f\u0440\u043e\u043c\u0430\u0445',
      label: resolution.definition.label,
      attackTotal: resolution.attackRoll.total,
      armorClass: resolution.defense.value,
      damageAmount: damage?.amount ?? null,
      damageType: damage?.damageType || '',
      healthBefore: health?.before || null,
      healthAfter: health?.after || null,
      historyDurable: true
    });
  }

  if (result?.state === 'persisted' && result.audit === 'unconfirmed') {

    return Object.freeze({
      tone: 'warning',
      status: 'audit-unconfirmed',
      technicalReason,
      message: '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u0437\u0434\u043e\u0440\u043e\u0432\u044c\u044f \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e, \u043d\u043e \u0437\u0430\u043f\u0438\u0441\u044c \u0432 \u0436\u0443\u0440\u043d\u0430\u043b\u0435 \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430. \u041d\u0435 \u043f\u043e\u0432\u0442\u043e\u0440\u044f\u0439\u0442\u0435 \u0430\u0442\u0430\u043a\u0443: \u043f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435 \u0438 \u0438\u0441\u0442\u043e\u0440\u0438\u044e.'
    });
  }

  if (result?.state === 'uncertain') {

    return Object.freeze({
      tone: 'warning',
      status: 'state-uncertain',
      technicalReason,
      message: '\u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0430\u0442\u0430\u043a\u0438 \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e. \u041e\u0431\u043d\u043e\u0432\u0438\u0442\u0435 \u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0443 \u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0437\u0434\u043e\u0440\u043e\u0432\u044c\u0435 \u0438 \u0438\u0441\u0442\u043e\u0440\u0438\u044e \u0434\u043e \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0433\u043e \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f.'
    });
  }

  if (result?.audit === 'unconfirmed') {

    return Object.freeze({
      tone: 'warning',
      status: 'audit-unconfirmed',
      technicalReason,
      message: '\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0430\u0442\u0430\u043a\u0438 \u043f\u043e\u043b\u0443\u0447\u0435\u043d, \u043d\u043e \u0437\u0430\u043f\u0438\u0441\u044c \u0432 \u0436\u0443\u0440\u043d\u0430\u043b\u0435 \u043d\u0435 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430. \u041d\u0435 \u043f\u043e\u0432\u0442\u043e\u0440\u044f\u0439\u0442\u0435 \u0430\u0442\u0430\u043a\u0443 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438.'
    });
  }

  return Object.freeze({
    tone: 'warning',
    status: 'rejected',
    technicalReason,
    message: '\u0410\u0442\u0430\u043a\u0430 \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430: \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0431\u043e\u044f \u0438\u0437\u043c\u0435\u043d\u0438\u043b\u043e\u0441\u044c. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u0442\u0435\u043a\u0443\u0449\u0435\u0433\u043e \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0430 \u0438 \u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435.'
  });
}
