---
summary: "Контракт отдельной сущности Rule Tree, bridge из legacy rule-карточек и связь с CharacterModel."
read_when:
  - "Когда менять Rule Tree"
  - "Когда подключать правила к CharacterModel"
  - "Когда мигрировать legacy rule-карточки"
owner_zone: "architecture"
---
# Rule Tree / Internal Rules Workspace Contract

## Назначение

`Rule Tree` исторически был отдельной сущностью проекта, лежащей в дереве рядом с карточками, картами и task tracker. Новое целевое направление: `Rule Tree` становится основой **внутреннего workspace правил**.

Внутренний workspace правил - это workspace внутри корня программы, который заполняется с ролью `admin` и содержит:

- системные правила DnD;
- справочники;
- homebrew;
- Rule Packages;
- пояснения к расчетам;
- страницы, на которые можно ссылаться из карточек.

Цель: хранить правила мира и системные справочники так, чтобы пользователь мог открыть нужное правило через wiki-link или через UI шестеренки, а `CharacterModel` мог получать эффекты правил через model-first API.

Важно: внутренний workspace правил **не заменяет расчетный код**. Расчеты характеристик, КЗ, навыков, хитов и эффектов реализуются внутри программы и описываются в `docs/02-architecture/contracts/DND_CALCULATION_RULES.md`.

## Product Direction

Целевое поведение:

1. В корне программы существует внутренний rules workspace.
2. Заполняет и обновляет его только `admin`-роль или поставляемый программой пакет правил.
3. Обычный пользователь не создает правила как обычные карточки мира.
4. Пользователь может открыть правило:
   - через wiki-link;
   - через шестеренку в блоке `Свойства`;
   - через будущий popup с деревом пространства правил.
5. Popup правил показывает дерево внутреннего rules workspace, а не смешивает правила с обычным деревом мира.
6. Карточки мира могут ссылаться на правила, но правила не становятся дочерними карточками мира.
7. Rule Tree как текущая сущность остается compatibility/foundation-слоем до миграции во внутренний rules workspace.

## Current Foundation Implementation

Текущий foundation-слой находится в `js/rulesWorkspace/`:

- `assets/rules/internal-rules-workspace.json` - program-owned JSON внутреннего DnD workspace, owner `admin`;
- `rulesWorkspaceContent.js` - загрузка JSON content layer, базовая нормализация, fallback на seed;
- `rulesWorkspaceSeed.js` - аварийный fallback, если program-owned JSON не загрузился;
- `rulesWorkspaceIndex.js` - нормализация, индекс title/alias, tree lookup и page-like adapter;
- `internalRulePage.js` - read-only rendering для внутреннего правила.

Правила поставляются как файл программы, а не как часть пользовательского workspace мира. Это важно: обновление справочника правил не должно создавать или менять карточки пользователя. Если JSON недоступен, приложение использует fallback seed и пишет предупреждение в консоль.

Правило lookup:

1. wiki-link сначала ищет обычную страницу мира через `PageRepository`;
2. если обычная страница не найдена, ищется internal rule по title/alias;
3. если найден internal rule, создается read-only page-like объект `template: internalRule`, `type: internalRule`, `source: internalRulesWorkspace`.

При конфликте названия мира и названия внутреннего правила текущий foundation выбирает страницу мира. Отдельный UX выбора источника запланирован позже.

Пользовательский путь:

```text
Карточка -> Свойства -> шестеренка -> Правила -> popup дерева правил
```

В popup правил должны быть:

- metadata content layer: owner, source, количество правил;
- поиск по названию, alias, summary и tags;
- открытие выбранного правила как read-only internal page.

или:

```text
Текст карточки -> [[Название правила]] -> открытие правила из internal rules workspace
```

## Расчеты И Правила

Есть два разных смысла слова "правила":

1. **Правила-справочники** - текст, дерево, объяснения, источники, DnD-описания. Они живут во внутреннем rules workspace.
2. **Правила-расчеты** - формулы и вычисления, например модификатор характеристики, бонус мастерства, КЗ, навыки. Они живут в коде приложения и описываются в `DND_CALCULATION_RULES.md`.

Нельзя смешивать эти уровни:

- текстовое правило не должно само выполнять формулу;
- расчетный код не должен читать русское описание из rules workspace;
- rules workspace может объяснять формулу и ссылаться на нее, но источник истины для расчета - программный calculation layer.

## Creation Surface

Текущий compatibility-слой все еще позволяет создать Rule Tree вручную:

- через главный popup `+` в sidebar, пункт `Правила`;
- через пустой стартовый экран, пункт `Правила`.

Если Rule Tree есть в модели, но отсутствует в этих UI-точках, подсистема считается недоступной для пользователя и задача не закрыта.

Целевой будущий слой меняет это правило: обычный пользователь не обязан вручную создавать `Правила`. Программа должна поставлять или создавать внутренний rules workspace автоматически, а админ-редактирование должно быть отдельным режимом.

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

Runtime UI Rule Tree может редактировать группу, категорию, `inheritsRuleIds`, `sourcePackageId`, условия и JSON-пакет, но источником истины после каждого действия остается только JSON в `data-rule-tree-data`.

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

## Rule Package Foundation

Rule Tree поддерживает foundation import/export JSON-пакета через `RuleTreeModel.importPackage()` и `RuleTreeModel.exportPackage()`.

Правила, импортированные из пакета без явного `sourceType`, получают `sourceType: "rulePackage"`. Это нужно, чтобы будущий World Package слой мог отличать локальные правила мира от переносимых пакетов.

UI по-прежнему может использовать textarea для быстрого JSON import/export, но storage foundation уже хранит переносимые пакеты как отдельные workspace-файлы.

## Rule Engine Foundation

`js/ruleTree/ruleTreeEngine.js` является первым исполняемым слоем Rule Tree. Он получает правила, активные rule id и контекст карточки, а возвращает:

- `applicableRules` - правила, условия которых сработали;
- `skippedRules` - активные правила, которые не применились;
- `evaluations` - объяснения по каждому условию;
- `diagnostics` - предупреждения о неизвестных условиях, missing inheritance и циклах наследования.

Поддерживаемые типы условий foundation-этапа:

- `manual` - считается истинным ручным условием;
- `level` - сравнение уровня, например `>=3`;
- `state` - проверка активного состояния персонажа, например `poisoned`;
- `card-variable` - сравнение свойства карточки, например `armorClass >= 15`;
- `formula` - безопасная простая формула вида `left >= right`, без `eval`.

`inheritsRuleIds` теперь не только metadata: engine разворачивает наследованные условия и эффекты. Циклы наследования не ломают приложение, а возвращаются в `diagnostics`.

`js/ruleTree/ruleTreePackageStorage.js` хранит переносимые rule packages в workspace-папке `rule-packages/` с расширением `.rule-package.json`.

Package-файлы имеют пользовательский manager в UI Rule Tree. Он умеет сохранять текущий набор правил в workspace, обновлять список package-файлов, импортировать выбранный файл, удалять файл и останавливать импорт при конфликте rule id.

Визуальная диагностика Rule Tree показывает:

- предупреждения engine о missing inheritance и циклах наследования;
- количество собственных и унаследованных условий;
- количество собственных и унаследованных эффектов;
- краткие chips условий, чтобы мастер видел, почему правило должно применяться только в определенном контексте.

## Что Нельзя Делать

- Не создавать Rule Tree как обычную карточку с типом `lore`.
- Не читать runtime DOM Rule Tree как источник истины.
- Не сохранять `.rule-tree-board` в markdown.
- Не считать legacy `card#rule` целевым форматом.
- Не применять arbitrary text description как правило без явного JSON/effects source.
- Не хранить персональные правила персонажа в runtime DOM. Только persistent JSON `[data-character-effects].selectedRuleIds`.

## Следующее Развитие

- Сделать полноценное визуальное объяснение применимости правила на конкретной карточке персонажа: какие условия сработали, какие нет, и какие значения использовались.
- Связать Rule Tree packages с будущей системой World Packages, чтобы один пакет мог переносить не только правила, но и связанные карточки, свойства и ассеты.
- Добавить расширенный editor формул без `eval`: подсказки переменных, проверку типов, подсветку ошибок и предпросмотр результата.
