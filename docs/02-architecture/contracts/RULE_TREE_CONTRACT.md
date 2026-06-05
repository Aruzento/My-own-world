---
summary: "Контракт отдельной сущности Rule Tree, bridge из legacy rule-карточек и связь с CharacterModel."
read_when:
  - "Когда менять Rule Tree"
  - "Когда подключать правила к CharacterModel"
  - "Когда мигрировать legacy rule-карточки"
owner_zone: "architecture"
---
# Rule Tree Contract

## Назначение

`Rule Tree` - отдельная сущность проекта, лежащая в дереве рядом с карточками, картами и task tracker. Она не является карточкой и не должна храниться как card shell.

Цель: хранить правила мира, системные правила, homebrew, справочники и будущие Rule Packages так, чтобы CharacterModel мог получать эффекты правил через model-first API.

## Persistent HTML

Persistent оболочка Rule Tree:

```html
<div class="rule-tree-document" data-rule-tree="v1" contenteditable="false">
  <h1 class="rule-tree-title" contenteditable="true">Новое дерево правил</h1>
  <script class="rule-tree-data" type="application/json" data-rule-tree-data>
    {"version":1,"activeRuleIds":[],"rules":[]}
  </script>
</div>
```

Сохраняется только:

- `.rule-tree-document`;
- `.rule-tree-title`;
- `<script data-rule-tree-data>` с JSON-моделью.

Runtime UI (`.rule-tree-board`, кнопки, списки импорта, checkbox controls) всегда помечается как runtime и не должен попадать в `.md`.

## Data Model

```js
{
  version: 1,
  groups: [
    {
      id: "core",
      title: "Основные правила",
      parentId: null
    }
  ],
  activeRuleIds: ["rule-id"],
  rules: [
    {
      id: "rule-id",
      title: "Название правила",
      description: "Краткое описание",
      parentId: null,
      groupId: "core",
      category: "Бой",
      conditions: [
        {
          type: "level | state | card-variable | manual",
          value: "условие",
          note: "человеческое описание"
        }
      ],
      inheritsRuleIds: ["base-rule-id"],
      sourcePackageId: "future-package-id",
      sourcePageId: "legacy-card-id",
      sourceType: "ruleTree | legacyRuleCard",
      tags: [],
      effects: []
    }
  ]
}
```

`activeRuleIds` - базовый foundation-механизм выбранных правил Rule Tree. Они применяются provider-слоем глобально через `CharacterModel`.

Персональный выбор правил конкретной карточкой персонажа хранится в JSON блока `Эффекты и состояния` как `selectedRuleIds`. `CharacterModel` объединяет глобальные активные правила Rule Tree и персональные `selectedRuleIds`.

## Runtime / Save Boundary

- `ruleTreeRender.js` строит runtime UI из JSON.
- `ruleTreeEvents.js` меняет данные только через `RuleTreeModel`.
- `ruleTreeContract.js` отвечает за `isRuleTreePage()` и `serializeRuleTreeHTML()`.
- `editorSpecialSave.js` сохраняет Rule Tree как special entity с `template: ruleTree` и `type: ruleTree`.
- `safeHtmlSanitizer.js` разрешает только безопасный JSON script `data-rule-tree-data`.

## Legacy Bridge

До полноценной миграции могут существовать карточки с тегами:

- `rule`;
- `rules`;
- `правило`;
- `правила`.

`ruleTreeProvider.js` читает такие карточки как legacy source и предоставляет их как кандидатов на импорт в Rule Tree. После импорта правило сохраняется в JSON сущности Rule Tree с `sourceType: "legacyRuleCard"` и `sourcePageId`.

Это временный мост, а не целевая архитектура.

## CharacterModel Integration

`createRuleTreeCharacterIntegrations({ pages, selectedRuleIds })` читает:

- active rules из сущностей `ruleTree`;
- legacy rule-карточки для обратной совместимости;
- локально выбранные `selectedRuleIds` из карточки персонажа.

Эффекты правил превращаются в обычные `EffectsModel`-эффекты с `sourceType: "rule"` и идут в тот же pipeline, что предметы, заклинания и навыки.

## Что Нельзя Делать

- Не создавать Rule Tree как обычную карточку с типом `lore`.
- Не читать runtime DOM Rule Tree как источник истины.
- Не сохранять `.rule-tree-board` в markdown.
- Не считать legacy `card#rule` целевым форматом.
- Не применять arbitrary text description как правило без явного JSON/effects source.
- Не хранить персональные правила персонажа в runtime DOM. Только persistent JSON `[data-character-effects].selectedRuleIds`.

## Следующее Развитие

- Добавить полноценный редактор условий применения правила.
- Подготовить Rule Package import/export.
- Добавить UI наследования правил и предпросмотр итоговых эффектов.
