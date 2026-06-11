---
summary: "Contract for CharacterModel, the model-first character and creature domain layer."
read_when:
  - "Before changing character, creature, HP, skills, initiative, or inventory logic"
  - "Before reading character data from card HTML"
owner_zone: "architecture"
---

# Character Model Contract

Дата обновления: 11.06.2026

## Назначение

`CharacterModel` - это доменная модель персонажа или существа. Она нужна, чтобы карта, свойства карточек, будущий инвентарь, эффекты, инициатива и проверки читали игровые данные из одного API, а не из произвольного HTML.

Модель не заменяет карточку. Карточка остается пользовательским документом. `CharacterModel` является расчетным слоем поверх:

1. `PropertiesModel` из блока `Свойства`;
2. legacy блока `Стат. блок DnD`;
3. будущих источников правил, рас, классов, эффектов и world packages.

## Файлы

- `js/character/characterModel.js` - нормализация модели, DnD-расчеты, HP/temp HP/death state.
- `js/character/inventoryModel.js` - нормализация инвентаря из блока `Предметы` и будущие чистые операции add/update/remove.
- `js/character/effectsModel.js` - нормализация активных состояний DnD, эффектов, модификаторов и флагов боевого состояния.
- `js/character/effectSourceResolver.js` - связывание эффектов с карточками-источниками: предметами, заклинаниями, навыками и будущими правилами.
- `js/character/characterIntegrationApi.js` - явный API внешних интеграций: Rule Tree, World Packages и другие будущие providers.
- `js/rules/ruleTreeProvider.js` - provider Rule Tree: читает отдельные сущности `ruleTree`, legacy страницы-правила и отдает их эффекты в `CharacterModel`.
- `js/ruleTree/` - отдельная подсистема Rule Tree: persistent JSON, runtime UI, model, renderer и serializer.
- `js/properties/cardVariablesModel.js` - общий слой переменных карточки, построенный из блока `Свойства`.
- `js/properties/propertiesCalculationEngine.js` - расчетный слой свойств: формулы, части расчета, manual override и backend-объяснения для UI.
- `js/properties/characterCalculations.js` - совместимый фасад старого кода, который теперь должен опираться на `CharacterModel`.
- `js/properties/propertiesModel.js` - чтение блока `Свойства`.
- `js/properties/propertySchemas.js` - стабильные ключи полей свойств.
- `js/editor/campaignMapHealth.js` - карта пока вызывает старый фасад, но получает данные уже через модельный слой.
- `js/editor/campaignMapCharacterBridge.js` - мост карты к `CharacterModel`: здоровье, DEX-модификатор инициативы и команда изменения HP.

## Public API

Минимальный foundation API:

```js
createCharacterModel(options)
createCharacterModelFromSources({ page, pages, propertiesModels, legacyDndHealth, integrations, selectedRuleIds })
readCharacterModelFromPage(page, { pages, integrations, selectedRuleIds })
getCharacterHealth(model)
getCharacterInitiativeModifier(model)
getCharacterEffectiveArmorClass(model)
getCharacterEffectiveSpeed(model)
getCharacterInventory(model)
getCharacterEffects(model)
getCharacterEffectsCombatSummary(model)
hasCharacterCondition(model, conditionKey)
applyCharacterHealthChange(model, options)
model.calculations
calculateAbilityModifier(score)
calculateProficiencyBonus(level)
calculateDndCheckValue(options)
```

## Структура Модели

```js
{
  kind: 'CharacterModel',
  version: 1,
  pageId: '...',
  cardType: 'character' | 'creature',
  source: 'properties' | 'legacy-dnd' | 'empty',
  level: 1,
  proficiencyBonus: 2,
  armorClass: 10,
  speed: 30,
  abilities: {
    str: { score: 10, modifier: 0 },
    dex: { score: 10, modifier: 0 },
    con: { score: 10, modifier: 0 },
    int: { score: 10, modifier: 0 },
    wis: { score: 10, modifier: 0 },
    cha: { score: 10, modifier: 0 }
  },
  health: {
    current: 10,
    max: 10,
    temp: 0,
    percent: 1,
    isDown: false
  },
  deathSaves: {
    successes: 0,
    failures: 0,
    isDead: false
  },
  inventory: {
    kind: 'InventoryModel',
    version: 1,
    source: 'items-block' | 'manual' | 'empty',
    items: [
      {
        pageId: 'item-page-id',
        title: 'Рапира',
        quantity: 1,
        source: 'items-block'
      }
    ],
    totalQuantity: 1
  },
  effects: {
    kind: 'EffectsModel',
    version: 1,
    source: 'manual' | 'effects-data' | 'empty',
    conditions: [],
    effects: [],
    modifiers: {
      armorClass: 0,
      speed: 0,
      initiative: 0,
      proficiencyBonus: 0,
      abilityScores: {},
      abilityChecks: {},
      savingThrows: {},
      skills: {}
    },
    flags: {
      isIncapacitated: false,
      speedIsZero: false,
      hasDisadvantageOnAttacks: false,
      attackersHaveAdvantage: false,
      exhaustionLevel: 0
    }
  },
  integrations: {
    kind: 'CharacterIntegrations',
    version: 1,
    effects: [],
    sources: []
  },
  calculations: {
    kind: 'PropertiesCalculationModel',
    version: 1,
    level: {},
    proficiencyBonus: {},
    abilityModifiers: {},
    armorClass: {},
    speed: {},
    initiative: {},
    health: {},
    byKey: {}
  },
  sources: {
    properties: true,
    legacyDnd: false,
    integrations: false
  }
}
```

## Правила Источников

1. `PropertiesModel` имеет приоритет над legacy HTML.
2. Если `PropertiesModel` есть, но в нем нет части полей, недостающие значения получают безопасные defaults.
3. Если `PropertiesModel` нет, `CharacterModel` может быть построен из legacy `Стат. блок DnD`.
4. Если нет ни одного источника, создается пустая модель с безопасными defaults, но она не должна сама записывать карточку.
5. Карта не должна читать HP напрямую из HTML, если может обратиться к `getPageCharacterHealth()` / `CharacterModel`.
6. Карта должна получать модификатор инициативы через `CharacterModel`, а не через ручной `modifier`, если токен создан из карточки персонажа или существа.
7. Инвентарь читается из существующего блока `Предметы`, но расчетные подсистемы должны обращаться к `InventoryModel`, а не к `.item-set-chip` напрямую.
8. Автоэффекты от предметов применяются только при явном блоке `Эффекты и состояния` на карточке предмета.
9. Описание предмета, заклинания или навыка не является формулой и не должно автоматически парситься как правило.
10. Идея старых блоков `DnD v2` и `Переменные` встроена в текущий путь: игровые переменные сущности задаются через типизированный блок `Свойства`.
11. Rule Tree и World Packages не должны мутировать `CharacterModel` напрямую. Они передают эффекты через `characterIntegrationApi.js`.
12. Целевая модель правил - отдельная сущность `ruleTree`. Карточки с тегами `rule/rules/правило/правила` остаются только backward-compatible bridge и источником импорта.
13. Активные правила `Rule Tree` (`activeRuleIds`) могут применяться глобально через provider.
14. Персональный выбор правил для конкретной карточки персонажа хранится в persistent JSON блока `Эффекты и состояния` как `selectedRuleIds`. `CharacterModel` объединяет эти ids с глобальными активными правилами Rule Tree.
15. `model.calculations` является backend-объяснением расчетов. UI может показывать формулу и части расчета из него, но не должен записывать изменения напрямую в этот объект.


## Effects / Conditions

`EffectsModel` - foundation-слой для активных состояний и эффектов персонажа. Он нужен, чтобы карта, инициатива, инвентарь, заклинания, навыки и будущий Rule Tree читали игровые модификаторы из одной модели, а не из HTML или русских подписей.

Foundation поддерживает:

- DnD-состояния: `blinded`, `charmed`, `deafened`, `frightened`, `grappled`, `incapacitated`, `invisible`, `paralyzed`, `petrified`, `poisoned`, `prone`, `restrained`, `stunned`, `unconscious`, `exhaustion`;
- операции `addCharacterCondition`, `removeCharacterCondition`, `toggleCharacterCondition`, `addCharacterEffect`, `removeCharacterEffect`;
- суммирование модификаторов `armorClass`, `speed`, `initiative`, `proficiencyBonus`, `abilityScores`, `abilityChecks`, `savingThrows`, `skills`;
- флаги `isIncapacitated`, `speedIsZero`, `hasDisadvantageOnAttacks`, `attackersHaveAdvantage`, `exhaustionLevel`;
- чтение будущего persistent JSON-источника `[data-character-effects]`.

UI для эффектов создан как foundation-блок карточки `Состояния и эффекты` (`data-block-type="characterEffects"`). Он должен быть доступен пользователю через popup `Добавить блок` и редактирует только persistent JSON `[data-character-effects]`, а расчетные подсистемы читают эффекты через `CharacterModel` / `EffectsModel`.

### Effects UI / Map Bridge

- Блок карточки `Эффекты и состояния` хранит persistent JSON в `[data-character-effects]`.
- Runtime UI блока не сохраняется как контент карточки и восстанавливается при открытии.
- Safe HTML boundary разрешает только `script type="application/json"` с `data-character-effects`; обычные `<script>` остаются запрещенными.
- Карта, инициатива и будущие проверки не читают `.character-effects-block` напрямую. Они обращаются к `CharacterModel` / `EffectsModel`.
- `sourceType`, `sourcePageId`, `sourcePackageId` и `ruleId` являются мостом к инвентарю, Rule Tree и World Packages.

### Effect Sources / Auto Effects

`effectSourceResolver.js` отвечает за выбор и связывание эффектов из внешних карточек.

Поддержанные источники foundation:

- `item` - карточки типа `Предмет`;
- `spell` - карточки типа `Магия`;
- `skill` - карточки типа `Навык`;
- `rule` - future placeholder для `Rule Tree`;
- `world-package` - future placeholder для импортированных пакетов мира.

Правила:

1. UI блока `Эффекты и состояния` может добавить эффекты из карточки-источника.
2. Если источник содержит `[data-character-effects]`, эффекты копируются как linked effects с `sourcePageId`.
3. Если источник не содержит явного блока эффектов, ручное добавление может создать информационный эффект, но автоматические расчеты его не используют.
4. `CharacterModel` автоматически объединяет собственные эффекты карточки и эффекты предметов из `InventoryModel`.
5. После появления `Rule Tree` его provider должен подключиться к тому же pipeline через `ruleId`, не меняя карту и инициативу напрямую.

### Character Integration API

`characterIntegrationApi.js` - foundation-контракт для будущих внешних систем.

Поддержанные входы:

```js
createCharacterIntegrations({
  effects: [],
  ruleEffects: [],
  worldPackageEffects: []
})

createRuleTreeCharacterEffect({
  ruleId,
  title,
  modifiers
})

createWorldPackageCharacterEffect({
  sourcePackageId,
  ruleId,
  title,
  modifiers
})
```

Правила:

1. Интеграции передают только модельные данные, обычно `EffectsModel`.
2. `CharacterModel` объединяет интеграционные эффекты с эффектами карточки и предметов.
3. Карта, инициатива и лист персонажа не должны знать, откуда пришел эффект: из карточки, Rule Tree или World Package.
4. `ruleId` и `sourcePackageId` сохраняются внутри эффекта как доказательство происхождения.
5. Если будущая система хочет изменить расчет персонажа, она должна добавить provider в этот pipeline, а не читать/переписывать DOM карточки.

### Rule Tree Provider

`ruleTreeProvider.js` - первый настоящий provider для Rule Tree.

Foundation-правила:

1. Страницей-правилом считается страница с тегом `rule`, `rules`, `правило` или `правила`.
2. Правило может содержать блок `Эффекты и состояния`; provider читает его `[data-character-effects]`.
3. `createRuleTreeCharacterIntegrations({ pages, selectedRuleIds })` отдает rule-effects только для выбранных правил.
4. `readCharacterModelFromPage(page, { pages, selectedRuleIds })` и `createCharacterModelFromSources(...)` подключают выбранные правила к итоговому `CharacterModel`.
5. На foundation-этапе UI выбора правил еще не сделан. Выбор идет через API `selectedRuleIds`.

### Full Character Sheet UX

Блок `Лист персонажа` (`data-block-type="characterSheet"`) является runtime-витриной `CharacterModel`.

Он показывает:

- уровень и бонус мастерства;
- эффективную КЗ, скорость, инициативу;
- HP, максимум HP и временные HP;
- характеристики и модификаторы;
- инвентарь;
- активные состояния и эффекты.

На foundation-этапе лист не хранит собственные игровые значения и не заменяет блок `Свойства`. Если нужен редактируемый лист, он должен стать отдельным model-first этапом.

### Entity Variables

`CharacterModel` не должен развивать старый `DnD v2` как отдельный большой HTML-блок. Его роль теперь другая:

1. карточка хранит типизированные переменные в блоке `Свойства`;
2. `PropertiesModel` читает значения этих переменных;
3. `CardVariablesModel` отдает общий список переменных сущности;
4. `CharacterModel` использует нужные переменные персонажа или существа для расчетов;
5. будущий `Rule Tree` сможет ссылаться на те же ключи переменных.

Например, `armorClass`, `hpCurrent`, `hpMax`, `dex`, `damage`, `range`, `effect` - это не отдельные ручные поля разных подсистем, а переменные сущностей с разными схемами по типу карточки.

## DnD 5e Расчеты

Модификатор характеристики считается по правилу `floor((score - 10) / 2)` с ограничением значения от 1 до 30.

Бонус мастерства:

- уровень 1-4 = +2
- уровень 5-8 = +3
- уровень 9-12 = +4
- уровень 13-16 = +5
- уровень 17-20 = +6

## HP / Temp HP / Death State

`applyCharacterHealthChange()` должен:

- при уроне сначала снимать временные хиты;
- не пополнять временные хиты при лечении;
- ограничивать текущие хиты диапазоном `0..max`;
- при `mode: 'restore'` ставить текущие хиты в максимум;
- при `mode: 'kill'` ставить текущие хиты в `0`;
- считать `health.isDown`, если `current <= 0`;
- считать `deathSaves.isDead`, если провалов death save `>= 3`.

## Что Нельзя Делать

- Нельзя искать значения по русскому тексту label.
- Нельзя расширять legacy `Стат. блок DnD` как основной путь развития.
- Нельзя автоматически мигрировать старые карточки без отдельной задачи.
- Нельзя заставлять карту напрямую менять HTML, если изменение можно провести через model/facade слой.

## Следующее Развитие

После foundation нужно:

1. расширить Inventory System до экипировки, веса, валюты и связи с эффектами;
2. подключить Rule Tree provider к pipeline автоэффектов;
3. расширить `CardVariablesModel` до зависимых и расчетных переменных, когда появится `Rule Tree`;
4. расширить Full Character Sheet UX до редактируемого листа;
5. подготовить интеграцию с `World Packages`.
