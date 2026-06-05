import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRuleTreeCharacterIntegrations,
  createRuleTreeModelFromPages,
  getLegacyRulePageImports,
  getRuleTreeRuleOptions
} from '../js/rules/ruleTreeProvider.js';


const RULE_PAGE = {
  id: 'rule-defense-style',
  title: 'Боевой стиль: оборона',
  type: 'lore',
  tags: [
    'rule'
  ],
  content: `
    <script type="application/json" data-character-effects>
      {
        "effects": [
          {
            "id": "defense",
            "title": "Оборона",
            "modifiers": {
              "armorClass": 1
            }
          }
        ]
      }
    </script>
  `
};

const RULE_TREE_PAGE = {
  id: 'rule-tree-core',
  title: 'Базовые правила',
  template: 'ruleTree',
  type: 'ruleTree',
  tags: [
    'rule-tree'
  ],
  content: `
    <div class="rule-tree-document">
      <script type="application/json" data-rule-tree-data>
        {
          "version": 1,
          "activeRuleIds": ["rule-speed"],
          "rules": [
            {
              "id": "rule-speed",
              "title": "Быстрый шаг",
              "groupId": "core",
              "category": "Передвижение",
              "conditions": [
                {
                  "type": "level",
                  "value": "1",
                  "note": "Персонаж выбран"
                }
              ],
              "inheritsRuleIds": [
                "rule-movement"
              ],
              "effects": [
                {
                  "id": "speed",
                  "title": "Скорость +10",
                  "modifiers": {
                    "speed": 10
                  }
                }
              ]
            }
          ]
        }
      </script>
    </div>
  `
};


test(
  'RuleTreeProvider builds rule tree model from tagged pages',
  () => {

    const model =
      createRuleTreeModelFromPages([
        RULE_PAGE,
        {
          id: 'note',
          title: 'Обычная заметка',
          tags: [],
          content: ''
        }
      ]);

    assert.equal(
      model.kind,
      'RuleTreeModel'
    );

    assert.equal(
      model.rules.length,
      1
    );

    assert.equal(
      model.byId['rule-defense-style'].effects[0].ruleId,
      'rule-defense-style'
    );
  }
);


test(
  'RuleTreeProvider imports legacy card rules for Rule Tree migration',
  () => {

    const imports =
      getLegacyRulePageImports([
        RULE_PAGE
      ]);

    assert.equal(
      imports[0].sourceType,
      'legacyRuleCard'
    );

    assert.equal(
      imports[0].sourcePageId,
      'rule-defense-style'
    );
  }
);


test(
  'RuleTreeProvider reads rules from ruleTree entity pages',
  () => {

    const model =
      createRuleTreeModelFromPages([
        RULE_TREE_PAGE
      ]);

    assert.equal(
      model.rules.length,
      1
    );

    assert.equal(
      model.byId['rule-speed'].sourceRuleTreeId,
      'rule-tree-core'
    );

    assert.equal(
      model.byId['rule-speed'].effects[0].modifiers.speed,
      10
    );

    assert.equal(
      model.byId['rule-speed'].category,
      'Передвижение'
    );

    assert.deepEqual(
      model.activeRuleIds,
      [
        'rule-speed'
      ]
    );
  }
);


test(
  'RuleTreeProvider creates CharacterModel integrations for selected rules',
  () => {

    const integrations =
      createRuleTreeCharacterIntegrations({
        pages: [
          RULE_PAGE
        ],
        selectedRuleIds: [
          'rule-defense-style'
        ]
      });

    assert.deepEqual(
      integrations.sources,
      [
        'rule'
      ]
    );

    assert.equal(
      integrations.effects[0].effects[0].sourceType,
      'rule'
    );

    assert.equal(
      integrations.effects[0].effects[0].modifiers.armorClass,
      1
    );
  }
);


test(
  'RuleTreeProvider creates integrations from selected ruleTree entity rules',
  () => {

    const integrations =
      createRuleTreeCharacterIntegrations({
        pages: [
          RULE_TREE_PAGE
        ],
        selectedRuleIds: [
          'rule-speed'
        ]
      });

    assert.equal(
      integrations.effects[0].effects[0].modifiers.speed,
      10
    );
  }
);


test(
  'RuleTreeProvider applies active ruleTree entity rules without character-local selection',
  () => {

    const integrations =
      createRuleTreeCharacterIntegrations({
        pages: [
          RULE_TREE_PAGE
        ]
      });

    assert.equal(
      integrations.effects[0].effects[0].modifiers.speed,
      10
    );
  }
);


test(
  'RuleTreeProvider exposes compact rule options for future picker UI',
  () => {

    assert.deepEqual(
      getRuleTreeRuleOptions([
        RULE_PAGE
      ]),
      [
        {
          id: 'rule-defense-style',
          title: 'Боевой стиль: оборона',
          parentId: null,
          groupId: 'legacy',
          category: 'Общее',
          effectCount: 1
        }
      ]
    );
  }
);
