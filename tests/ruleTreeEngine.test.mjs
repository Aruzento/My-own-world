import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRuleEvaluationContext,
  evaluateRuleCondition,
  evaluateRuleTreeRules,
  resolveRuleInheritance
} from '../js/ruleTree/ruleTreeEngine.js';


test(
  'RuleTreeEngine evaluates level, state and variable conditions',
  () => {

    const context =
      createRuleEvaluationContext({
        variablesModel: {
          byKey: {
            level: {
              value: 5
            },
            armorClass: {
              value: 16
            }
          }
        },
        effectsModel: {
          conditions: [
            {
              key: 'poisoned'
            }
          ]
        }
      });

    assert.equal(
      evaluateRuleCondition(
        {
          type: 'level',
          value: '>=3'
        },
        context
      ).passed,
      true
    );

    assert.equal(
      evaluateRuleCondition(
        {
          type: 'state',
          value: 'poisoned'
        },
        context
      ).passed,
      true
    );

    assert.equal(
      evaluateRuleCondition(
        {
          type: 'card-variable',
          value: 'armorClass >= 15'
        },
        context
      ).passed,
      true
    );

    assert.equal(
      evaluateRuleCondition(
        {
          type: 'formula',
          value: 'level >= 6'
        },
        context
      ).passed,
      false
    );
  }
);


test(
  'RuleTreeEngine resolves inherited effects and filters inactive conditions',
  () => {

    const result =
      evaluateRuleTreeRules({
        activeRuleIds: [
          'advanced'
        ],
        context:
          createRuleEvaluationContext({
            variablesModel: {
              byKey: {
                level: {
                  value: 2
                }
              }
            }
          }),
        rules: [
          {
            id: 'base',
            title: 'Base',
            conditions: [],
            effects: [
              {
                id: 'base-ac',
                title: 'AC +1',
                modifiers: {
                  armorClass: 1
                }
              }
            ]
          },
          {
            id: 'advanced',
            title: 'Advanced',
            inheritsRuleIds: [
              'base'
            ],
            conditions: [
              {
                type: 'level',
                value: '>=3'
              }
            ],
            effects: [
              {
                id: 'advanced-speed',
                title: 'Speed +5',
                modifiers: {
                  speed: 5
                }
              }
            ]
          }
        ]
      });

    assert.equal(
      result.applicableRules.length,
      0
    );

    assert.equal(
      result.skippedRules[0].effects.length,
      2
    );
  }
);


test(
  'RuleTreeEngine reports inheritance cycles without throwing',
  () => {

    const resolved =
      resolveRuleInheritance([
        {
          id: 'a',
          inheritsRuleIds: [
            'b'
          ],
          effects: []
        },
        {
          id: 'b',
          inheritsRuleIds: [
            'a'
          ],
          effects: []
        }
      ]);

    assert.equal(
      resolved.diagnostics.length > 0,
      true
    );
  }
);
