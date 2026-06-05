import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RuleTreeModel
} from '../js/ruleTree/ruleTreeModel.js';


test(
  'RuleTreeModel imports, activates and removes rules',
  () => {

    const model =
      new RuleTreeModel();

    model.importRule({
      id: 'rule-defense',
      title: 'Защитный стиль',
      effects: [
        {
          id: 'ac',
          title: 'КЗ +1',
          modifiers: {
            armorClass: 1
          }
        }
      ]
    });

    model.toggleActiveRule(
      'rule-defense',
      true
    );

    assert.equal(
      model.data.rules.length,
      1
    );

    assert.deepEqual(
      model.data.activeRuleIds,
      [
        'rule-defense'
      ]
    );

    model.removeRule(
      'rule-defense'
    );

    assert.deepEqual(
      model.data,
      {
        version: 1,
        groups: [
          {
            id: 'core',
            title: 'Основные правила',
            parentId: null
          },
          {
            id: 'legacy',
            title: 'Импортированные правила',
            parentId: null
          },
          {
            id: 'homebrew',
            title: 'Homebrew',
            parentId: null
          }
        ],
        activeRuleIds: [],
        rules: []
      }
    );
  }
);


test(
  'RuleTreeModel supports groups and tree metadata',
  () => {

    const model =
      new RuleTreeModel();

    const group =
      model.addGroup(
        'Боевые правила'
      );

    model.importRule({
      id: 'rule-advantage',
      title: 'Преимущество',
      groupId:
        group.id,
      category:
        'Бой',
      conditions: [
        {
          type: 'state',
          value: 'target-prone',
          note: 'Цель лежит'
        }
      ],
      inheritsRuleIds: [
        'rule-attack'
      ]
    });

    assert.equal(
      group.id,
      'боевые-правила'
    );

    assert.equal(
      model.data.rules[0].category,
      'Бой'
    );

    assert.deepEqual(
      model.data.rules[0].inheritsRuleIds,
      [
        'rule-attack'
      ]
    );
  }
);
