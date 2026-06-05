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


test(
  'RuleTreeModel edits conditions and imports exports rule packages',
  () => {

    const model =
      new RuleTreeModel();

    model.importRule({
      id: 'rule-defense',
      title: 'Защита',
      effects: [
        {
          id: 'armor',
          title: 'КЗ +1',
          modifiers: {
            armorClass: 1
          }
        }
      ]
    });

    model.updateRule(
      'rule-defense',
      {
        category:
          'Бой',
        inheritsRuleIds: [
          'rule-base'
        ],
        sourcePackageId:
          'core-pack'
      }
    );

    model.addCondition(
      'rule-defense',
      {
        type: 'level',
        value: '>=3',
        note: 'С третьего уровня'
      }
    );

    model.toggleActiveRule(
      'rule-defense',
      true
    );

    const exported =
      model.exportPackage();

    assert.equal(
      exported.rules[0].category,
      'Бой'
    );

    assert.deepEqual(
      exported.rules[0].conditions,
      [
        {
          type: 'level',
          value: '>=3',
          note: 'С третьего уровня'
        }
      ]
    );

    model.removeCondition(
      'rule-defense',
      0
    );

    assert.deepEqual(
      model.getRule('rule-defense').conditions,
      []
    );

    model.importPackage({
      version: 1,
      groups: [
        {
          id: 'package',
          title: 'Пакет',
          parentId: null
        }
      ],
      activeRuleIds: [
        'rule-speed'
      ],
      rules: [
        {
          id: 'rule-speed',
          title: 'Быстрый шаг',
          groupId: 'package',
          effects: [
            {
              id: 'speed',
              title: 'Скорость +5',
              modifiers: {
                speed: 5
              }
            }
          ]
        }
      ]
    });

    assert.equal(
      model.getRule('rule-speed').sourceType,
      'rulePackage'
    );

    assert.deepEqual(
      model.data.activeRuleIds,
      [
        'rule-defense',
        'rule-speed'
      ]
    );
  }
);
