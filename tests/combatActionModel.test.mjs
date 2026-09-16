import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COMBAT_ACTION_REQUEST_ERROR_CODES,
  CombatActionRequestError,
  resolveAcTotalOutcome,
  validateCombatActionRequest
} from '../js/combat/combatActionModel.js';


function validRequest() {

  return {
    kind: 'CombatActionRequest',
    version: 1,
    actionId: 'action-1',
    mapPageId: 'map-1',
    sessionId: 'session-1',
    actor: {
      participantId: 'token:actor'
    },
    target: {
      participantId: 'token:target'
    },
    action: {
      type: 'attack',
      definitionId: 'gm-shortbow',
      label: 'Shortbow',
      source: {
        kind: 'manual',
        pageId: 'rules-page',
        ruleId: 'shortbow'
      },
      hitPolicy: 'ac-total-v1',
      attackRoll: {
        formula: 'd20 + 4',
        mode: 'normal',
        criticalPolicy: 'none'
      },
      damageComponents: [
        {
          componentId: 'piercing-1',
          damageType: 'piercing',
          roll: {
            formula: '1d6 + 2',
            mode: 'normal',
            criticalPolicy: 'none'
          }
        }
      ]
    }
  };
}


function clone(value) {

  return structuredClone(value);
}


test(
  'single-target attack request is strict, normalized and immutable',
  () => {

    const request =
      validRequest();

    const normalized =
      validateCombatActionRequest(
        request
      );

    assert.deepEqual(
      normalized,
      request
    );

    assert.equal(
      Object.isFrozen(normalized),
      true
    );

    assert.equal(
      Object.isFrozen(normalized.action.damageComponents[0].roll),
      true
    );

    request.action.label =
      'Changed outside';

    assert.equal(
      normalized.action.label,
      'Shortbow'
    );
  }
);


test(
  'ac-total-v1 treats equality as a hit and lower totals as misses',
  () => {

    assert.equal(
      resolveAcTotalOutcome(12, 12),
      'hit'
    );

    assert.equal(
      resolveAcTotalOutcome(13, 12),
      'hit'
    );

    assert.equal(
      resolveAcTotalOutcome(11, 12),
      'miss'
    );
  }
);


test(
  'request rejects unknown keys, multi-target shapes and extra damage components',
  () => {

    const cases = [];

    const unknownRoot =
      validRequest();

    unknownRoot.metadata = {};
    cases.push(unknownRoot);

    const unknownAction =
      validRequest();

    unknownAction.action.callback =
      'execute';
    cases.push(unknownAction);

    const multiTarget =
      validRequest();

    multiTarget.target = [
      multiTarget.target,
      {
        participantId: 'token:other'
      }
    ];
    cases.push(multiTarget);

    const multiDamage =
      validRequest();

    multiDamage.action.damageComponents.push(
      clone(
        multiDamage.action.damageComponents[0]
      )
    );
    cases.push(multiDamage);

    for (const request of cases) {

      assert.throws(
        () => validateCombatActionRequest(request),
        CombatActionRequestError
      );
    }
  }
);


test(
  'request validates attack and damage Dice inputs before execution',
  () => {

    const malformedAttack =
      validRequest();

    malformedAttack.action.attackRoll.formula =
      '2d20 + 4';

    assert.throws(
      () => validateCombatActionRequest(malformedAttack),
      error =>
        error.code === COMBAT_ACTION_REQUEST_ERROR_CODES.INVALID_ATTACK_ROLL
    );

    const malformedDamage =
      validRequest();

    malformedDamage.action.damageComponents[0].roll.formula =
      'not dice';

    assert.throws(
      () => validateCombatActionRequest(malformedDamage),
      error =>
        error.code === COMBAT_ACTION_REQUEST_ERROR_CODES.INVALID_DAMAGE_ROLL
    );

    for (const mutate of [
      request => {
        request.action.hitPolicy = 'natural-d20';
      },
      request => {
        request.action.attackRoll.criticalPolicy = 'd20-natural';
      },
      request => {
        request.action.damageComponents[0].roll.mode = 'advantage';
      }
    ]) {

      const request =
        validRequest();

      mutate(request);

      assert.throws(
        () => validateCombatActionRequest(request),
        error =>
          error.code === COMBAT_ACTION_REQUEST_ERROR_CODES.UNSUPPORTED_POLICY
      );
    }
  }
);
