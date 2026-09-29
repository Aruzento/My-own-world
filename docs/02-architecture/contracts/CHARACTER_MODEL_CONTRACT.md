---
summary: "Contract for CharacterModel, the model-first character and creature domain layer."
read_when:
  - "When changing CharacterModel calculations, persistence, inventory or Character-to-initiative integration"
  - "Before reading character data from card HTML"
owner_zone: "architecture"
---

# Character Model Contract

## Implemented source boundary — CTV Stage 8.1, 2026-09-27

[Card Types / Variables migration](../CARD_TYPES_VARIABLES_MIGRATION.md) supersedes the future Properties-owned Entity Variables and sheet-write targets below. CharacterModel remains a normalized game projection. CTV Stage 8.1 implements deterministic source selection: a page without `variablesJson` keeps the existing Properties/legacy reader; a valid structured Player/Character with `characterProjection` capability reads gameplay fields through Variables / Entity API; any present malformed/future/unsupported envelope is diagnostic and never falls back to Properties. Inventory, Effects and integration providers retain their current owners. Combat/Map/Character Sheet writers are not cut over by this leaf. Preserve behavior without a second HP owner, and do not convert every card into CharacterModel.

CTV Stage 8.2 adds `structuredCharacterHealth.js` as the only structured Character/Player HP domain-write boundary. Preparation requires explicit stored `dnd.health`, exact whole-page identity and activated schema closure; defaults, Properties and inactive evidence are never writable proof. The boundary preserves every nested health sibling, delegates persistence to the Variables/PageCommand pipeline and verifies durable output through a newly read Stage 8.1 CharacterModel. Stage 8.3 wires Combat to it; Stage 8.4 wires generic Campaign Map HP through a separate Map orchestration boundary. Stage 8.5 wires the Character Sheet only for exact structured Character level, ability scores and current/temp HP. Stage 8.6 connects per-domain Inventory reads/writes; Effects persistence is still not cut over.

Дата обновления: 14.06.2026

## Назначение

`CharacterModel` - это доменная модель персонажа или существа. Она нужна, чтобы карта, свойства карточек, будущий инвентарь, эффекты, инициатива и проверки читали игровые данные из одного API, а не из произвольного HTML.

Модель не заменяет карточку. Карточка остается пользовательским документом. `CharacterModel` является расчетным слоем поверх:

1. `PropertiesModel` из блока `Свойства`;
2. legacy блока `Стат. блок DnD`;
3. будущих источников правил, рас, классов, эффектов и world packages.

## Файлы

- `js/character/characterModel.js` - нормализация модели, DnD-расчеты, HP/temp HP/death state.
- `js/character/structuredCharacterSource.js` - typed Entity API adapter for structured Player/Character reads, provenance and exact Item armor references.
- `js/character/structuredCharacterHealth.js` - immutable prepare/commit boundary for explicit stored structured HP; delegates writes to Variables/PageCommand and performs domain readback.
- `js/character/inventoryModel.js` - source-aware Inventory projection from legacy Item Set or explicit actor Entity arrays.
- `js/character/structuredInventory.js` - guarded actor membership / Item quantity Variables commands.
- `js/ui/inventoryItemSets.js` - runtime Item Set projection and source-aware UI integration.
- `js/character/effectsModel.js` - нормализация активных состояний DnD, эффектов, модификаторов и флагов боевого состояния.
- `js/character/effectSourceResolver.js` - связывание эффектов с карточками-источниками: предметами, заклинаниями, навыками и будущими правилами.
- `js/character/characterIntegrationApi.js` - явный API внешних интеграций: Rule Tree, World Packages и другие будущие providers.
- `js/rules/ruleTreeProvider.js` - provider Rule Tree: читает отдельные сущности `ruleTree`, legacy страницы-правила и отдает их эффекты в `CharacterModel`.
- `js/ruleTree/` - отдельная подсистема Rule Tree: persistent JSON, runtime UI, model, renderer и serializer.
- `js/properties/cardVariablesModel.js` - общий слой переменных карточки, построенный из блока `Свойства`.
- `js/properties/cardVariableDependencies.js` - foundation зависимостей между карточками и безопасных additive-формул.
- `js/properties/propertiesCalculationEngine.js` - расчетный слой свойств: формулы, части расчета, manual override и backend-объяснения для UI.
- `js/properties/propertiesDomWriter.js` - запись изменений runtime UI обратно в блок `Свойства`.
- `js/properties/propertiesLegacyBridge.js` - безопасное обнаружение legacy-блоков без автоматической миграции.
- `js/properties/characterCalculations.js` - совместимый фасад старого кода, который теперь должен опираться на `CharacterModel`.
- `js/properties/propertiesModel.js` - чтение блока `Свойства`.
- `js/properties/propertySchemas.js` - стабильные ключи полей свойств.
- `js/editor/campaignMapHealth.js` - сохранённый legacy Properties/DnD health reader/writer; structured card через него не проходит.
- `js/editor/campaignMapCharacterBridge.js` - source-aware мост карты к `CharacterModel`, bounded lifecycle context и derived token projection.
- `js/editor/campaignMapCharacterHealth.js` - source-aware Map HP orchestration: legacy PageCommand либо Stage 8.2 Variables command; token snapshot публикуется только после confirmed Character write.
- `js/editor/characterSheetCharacter.js` - bounded Sheet source/mutation boundary: catalog-independent legacy Properties path, exact activated Registry for structured Character, Variables level/abilities and Stage 8.2 current/temp HP.

## Public API

Минимальный foundation API:

```js
createCharacterModel(options)
createCharacterModelFromSources({ page, pages, propertiesModels, legacyDndHealth, integrations, selectedRuleIds })
readCharacterModelFromPage(page, { pages, integrations, selectedRuleIds, registry, repository })
getCharacterHealth(model)
getCharacterInitiativeModifier(model)
getCharacterEffectiveArmorClass(model)
getCharacterEffectiveSpeed(model)
getCharacterInventory(model)
getCharacterEffects(model)
getCharacterEffectsCombatSummary(model)
hasCharacterCondition(model, conditionKey)
createCampaignMapCharacterTokenSnapshot(page)
applyCharacterHealthChange(model, options)
prepareStructuredCharacterHealthChange({ pageId, expectedBase, request, context })
commitStructuredCharacterHealthChange(plan)
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
  cardType: 'character' | 'creature' | 'player',
  source: 'entity' | 'structured-unavailable' | 'properties' | 'legacy-dnd' | 'empty',
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
  sources: {
    entity: false,
    properties: false,
    legacyDnd: false,
    integrations: false
  },
  provenance: {},
  diagnostics: [],
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
7. Inventory owner выбирается per-domain: legacy Item Set либо explicit `dnd.items` + `dnd.equippedItems`; все consumers обращаются к InventoryModel, не к chips напрямую.
8. Автоэффекты от предметов применяются только при явном блоке `Эффекты и состояния` на карточке предмета.
9. Описание предмета, заклинания или навыка не является формулой и не должно автоматически парситься как правило.
10. Идея старых блоков `DnD v2` и `Переменные` встроена в текущий путь: игровые переменные сущности задаются через типизированный блок `Свойства`.
11. Rule Tree и World Packages не должны мутировать `CharacterModel` напрямую. Они передают эффекты через `characterIntegrationApi.js`.
12. Целевая модель правил - отдельная сущность `ruleTree`. Карточки с тегами `rule/rules/правило/правила` остаются только backward-compatible bridge и источником импорта.
13. Активные правила `Rule Tree` (`activeRuleIds`) могут применяться глобально через provider.
14. Персональный выбор правил для конкретной карточки персонажа хранится в persistent JSON блока `Эффекты и состояния` как `selectedRuleIds`. `CharacterModel` объединяет эти ids с глобальными активными правилами Rule Tree.
15. `model.calculations` является backend-объяснением расчетов. UI может показывать формулу и части расчета из него, но не должен записывать изменения напрямую в этот объект.
16. Structured HP mutation разрешена только для exact valid `character`/`player` с `characterProjection` и явно stored complete `dnd.health`; schema defaults и presentation fallback не являются write source.
17. Structured health plan меняет только current/temp, использует max как guard и сохраняет весь остальной `dnd.health` object. Он одноразовый, data-only и всегда проходит через Variables/PageCommand whole-page guards.
18. Successful Variables commit подтверждается durable reread и повторной CharacterModel projection. Properties body не dual-write'ится.
19. Campaign Map Stage 8.4 читает structured Character/Player только с exact activated workspace Registry. Legacy-only map catalog-independent; invalid structured source не fallback'ится и не materialize'ит DnD block.
20. Map `delta/restore/kill/temp` переводится в Stage 8.2 `delta/exact`. Character page пишется максимум один раз, затем все linked token snapshots reread'ятся через CharacterModel. Map save сохраняет только derived cache и не пишет HP обратно.
21. Character Sheet Stage 8.5 определяет source до Properties access. Valid structured `character` читает только Entity-backed CharacterModel; malformed/future/missing-catalog structured source unavailable и никогда не fallback'ится. Отдельный `player` Sheet не активируется.
22. Structured Sheet пишет `dnd.level` и один nested ability score через Variables, сохраняя весь abilities object; current/temp HP пишет только Stage 8.2 exact command. Confirmed durable page становится новым editor expected base до следующего body autosave.
23. Structured hpMax, effective AC/initiative/speed, death saves, skills/saves и manual calculated overrides остаются read-only/unavailable до отдельных approved contracts. Preserved Properties не читаются, не dual-write'ятся и не очищаются.


## Inventory source boundary — CTV Stage 8.6

`readInventoryModelFromPage(page, { registry, repository, pages })` is the sole inventory projection owner. Valid approved Character/Player with both explicit `dnd.items` and `dnd.equippedItems` uses `source: entity`, including empty arrays. Both absent retain the legacy Item Set domain; partial/invalid/future state is unavailable, never a merge or fallback. Production UI prepares an exact activated Registry context at open/refresh/picker boundaries.

Entity items retain exact page ids and canonical titles. Item-owned stored `item.quantity` preserves zero; missing quantity has presentation-only `1`, provenance and disabled quantity control. Actor-owned equipped membership is additive projection, not an Item write or new equipment rule. Missing/wrong-type/invalid Item cannot provide effects. The existing effects resolver still consumes ALL eligible inventory Item pages and their explicit legacy Effects payloads.

`structuredInventory.js` delegates immutable add/remove/quantity plans to Variables/PageCommand with whole-page, workspace, catalog/schema and readback guards. Remove clears both actor arrays in one write; quantity writes only Item with Item expectedBase. Runtime Item Set chips are excluded from serialization; parent Variables commits advance the editor base, Item commits do not replace it. No chip-quantity adoption, automatic migration, schema changes or Effects persistence cutover occurs.

## Map Snapshot Boundary

Campaign map code must use `createCampaignMapCharacterTokenSnapshot(page, { map })` when a token is created from a character or creature page, and when saved map tokens are restored. The map lifecycle prepares one bounded Character context; only a map with structured links reads the exact activated catalog.

The snapshot may expose only model-backed values:

- current/max/temp HP;
- effective AC;
- effective speed;
- initiative modifier;
- active condition/effect counts;
- readable effect/status summary;
- combat flags such as incapacitated or speed-zero.

Map UI may render these values on the token or store them in `CampaignMapModel`, but it must not parse arbitrary card HTML for combat stats when the snapshot is available.

Token data is a derived cache. A Map HP action first commits the authoritative Character owner, rereads CharacterModel, refreshes every visible token linked by the same exact page id and only then saves the map. A Map save failure after confirmed Character persistence never rolls health back or retries it; reload reconstructs the cache from CharacterModel. Generic Map HP actions do not emit Combat/EventStore transactions.

## Effects / Conditions

`EffectsModel` - foundation-слой для активных состояний и эффектов персонажа. Он нужен, чтобы карта, инициатива, инвентарь, заклинания, навыки и будущий Rule Tree читали игровые модификаторы из одной модели, а не из HTML или русских подписей.

Foundation поддерживает:

- DnD-состояния: `blinded`, `charmed`, `deafened`, `frightened`, `grappled`, `incapacitated`, `invisible`, `paralyzed`, `petrified`, `poisoned`, `prone`, `restrained`, `stunned`, `unconscious`, `exhaustion`;
- операции `addCharacterCondition`, `removeCharacterCondition`, `toggleCharacterCondition`, `addCharacterEffect`, `removeCharacterEffect`;
- суммирование модификаторов `armorClass`, `speed`, `initiative`, `proficiencyBonus`, `abilityScores`, `abilityChecks`, `savingThrows`, `skills`;
- флаги `isIncapacitated`, `speedIsZero`, `hasDisadvantageOnAttacks`, `attackersHaveAdvantage`, `exhaustionLevel`;
- чтение будущего persistent JSON-источника `[data-character-effects]`.

Legacy UI для эффектов существует как блок карточки `Состояния и эффекты` (`data-block-type="characterEffects"`) и остается читаемым для старых карточек. Первый уровень popup `Добавить блок` больше не должен предлагать этот специализированный блок: новый пользовательский путь идет через `Свойства`, универсальный `Блок списка`, Rule Tree и будущие режимы внутри этих базовых блоков. Расчетные подсистемы продолжают читать persistent JSON `[data-character-effects]` через `CharacterModel` / `EffectsModel`, если такой legacy-источник уже есть в карточке.

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

### Editable Character Sheet UX

Блок `Лист персонажа` (`data-block-type="characterSheet"`) является runtime-режимом просмотра и редактирования `CharacterModel`.

Он показывает:

- уровень и бонус мастерства;
- эффективную КЗ, скорость, инициативу;
- HP, максимум HP и временные HP;
- death saves: три успеха и три провала;
- характеристики и модификаторы;
- инвентарь;
- активные состояния и эффекты.

Текущая визуальная организация листа должна быть близка к бумажному DnD sheet:

1. верхний блок личности: имя, предыстория, класс, вид, подкласс;
2. отдельные компактные блоки уровня/БМ, КЗ, HP и death saves;
3. строка быстрых боевых метрик: инициатива, скорость, пассивное восприятие, состояния;
4. карточки характеристик с модификатором, значением, спасброском и связанными навыками;
5. боковые панели инвентаря и эффектов.

Это только runtime-композиция. Она не должна становиться отдельной схемой хранения и не должна дублировать данные блока `Свойства`.

Legacy MVP:

1. лист не хранит собственные игровые значения;
2. редактируемые поля листа записываются в блок `Свойства`;
3. если блока `Свойства` на карточке еще нет, он создается при первом изменении значения;
4. ручное изменение рассчитанных полей, например инициативы, КЗ или скорости, сохраняется как `override-*`;
5. ручные override подсвечиваются в листе и могут быть очищены из листа, чтобы вернуть авторасчет;
6. расчетные метрики показывают краткий источник `авто` / `ручн.` и формулу в подсказке;
7. death saves редактируются как contiguous DnD-трек: выбранная третья точка означает значение `3`, снятая вторая точка означает значение `1`;
8. старые `Стат. блок DnD` и `Состояния и эффекты` остаются fallback-источниками.

Structured Character foundation (CTV Stage 8.5):

1. exact activated workspace Registry обязателен; bundled fallback запрещён;
2. level, six ability scores, current HP и temporary HP являются editable approved owners;
3. current/temp HP используют Stage 8.2 explicit stored-health boundary; hpMax остаётся read-only guard;
4. effective AC, initiative, speed, death saves, skills/saves и legacy manual overrides read-only/unavailable;
5. Properties body не является fallback или write target; после durable command Sheet rereads CharacterModel и advances editor whole-page base;
6. Inventory/Effects продолжают отображаться через CharacterModel, но их persistence этим leaf не меняется.

Лист персонажа не должен напрямую менять legacy DnD-блоки.

### Entity Variables

`CharacterModel` не должен развивать старый `DnD v2` как отдельный большой HTML-блок. Его роль теперь другая:

1. карточка хранит типизированные переменные в блоке `Свойства`;
2. `PropertiesModel` читает значения этих переменных;
3. `CardVariablesModel` отдает общий список переменных сущности;
4. `CharacterModel` использует нужные переменные персонажа или существа для расчетов;
5. будущий `Rule Tree` сможет ссылаться на те же ключи переменных.

Например, `armorClass`, `hpCurrent`, `hpMax`, `dex`, `damage`, `range`, `effect` - это не отдельные ручные поля разных подсистем, а переменные сущностей с разными схемами по типу карточки.

Для персонажей и существ блок `Свойства` также хранит DnD-навыки и спасброски как мульти-поля по характеристикам: `Навыки СИЛ`, `Навыки ЛОВ`, `Навыки ТЛС`, `Навыки ИНТ`, `Навыки МДР`, `Навыки ХАР`. Внутренние ключи результата и владения доступны как переменные, например `skillAthletics`, `skillStealth`, `saveDex`, `skillAthleticsProficient`. `PropertiesCalculationModel` считает эти проверки по формуле `abilityModifier + proficiencyBonus`, если checkbox владения включен; ручной override остается выше авторасчета.

КЗ считается через `PropertiesCalculationModel`. Если выбран `armorItem`, модель находит карточку-предмет по `id`, `title` или `aliases`, читает ее `Свойства` и применяет правила DnD для легкого, среднего, тяжелого доспеха или щита. Если доспех не выбран, но в старой карточке уже записана `armorClass`, это значение сохраняется как legacy/manual совместимость.

### Card Variable Dependencies

`cardVariableDependencies.js` является foundation-слоем для зависимостей между карточками.

Поддержано:

1. контекст переменных текущей карточки: `self.str`, `self.level`, `self.hpCurrent`;
2. зависимые карточки через значения переменных, например поле `race = human` позволяет читать `race.str`;
3. lookup зависимой карточки по `id`, `title` или `aliases`;
4. безопасные additive-формулы вроде `self.str + race.str + 2`;
5. результат расчета с `parts`, `sourcePageId`, `sourceKey` и `diagnostics`.

Запрещено:

1. использовать `eval`, `Function` или произвольный JavaScript в формулах;
2. читать значения по русским подписям в HTML;
3. автоматически записывать результат формулы в карточку без отдельного UI/contract этапа;
4. применять такие формулы на карте, пока они явно не подключены через `CharacterModel`.

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
3. сделать человеко-понятный picker доспеха и экипировки вместо текстового `armorItem`;
4. расширить `CardVariablesModel` до зависимых и расчетных переменных, когда появится `Rule Tree`;
5. расширить Full Character Sheet UX до редактируемого листа;
6. подготовить интеграцию с `World Packages`.
