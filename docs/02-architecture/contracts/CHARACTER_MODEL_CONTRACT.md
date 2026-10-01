---
summary: "Contract for CharacterModel, the model-first character and creature domain layer."
read_when:
  - "When changing CharacterModel calculations, persistence, inventory or Character-to-initiative integration"
  - "Before reading character data from card HTML"
owner_zone: "architecture"
---

# Character Model Contract

## Current source boundary — CTV Stage 9 integration, 2026-10-01

[Card Types / Variables migration](../CARD_TYPES_VARIABLES_MIGRATION.md#stage-9-production-integration) is authoritative. CharacterModel is the normalized gameplay projection for structured Character/Player, not persistence/Inspector/DOM/schema parser. Exact activated Registry is mandatory; invalid/future/missing definition/catalog is unavailable. Old-format Character/Creature parsing remains for historical evidence/tests, but normal Sheet/Map/Combat requires migration and never enables Properties/DnD writers. Inventory/own Effects with absent state and preserved legacy evidence are migration-required; absence without legacy evidence is canonical empty Entity projection. Activated Entity state never reads legacy owner HTML. New actors explicitly store empty domains. Item/Rule/integration Effects remain independent approved providers.

CTV Stage 8.2 adds `structuredCharacterHealth.js` as the only structured Character/Player HP domain-write boundary. Preparation requires explicit stored `dnd.health`, exact whole-page identity and activated schema closure; defaults, Properties and inactive evidence are never writable proof. The boundary preserves every nested health sibling, delegates persistence to the Variables/PageCommand pipeline and verifies durable output through a newly read Stage 8.1 CharacterModel. Stage 8.3 wires Combat to it; Stage 8.4 wires generic Campaign Map HP through a separate Map orchestration boundary. Stage 8.5 wires the Character Sheet only for exact structured Character level, ability scores and current/temp HP. Stage 8.6 connects per-domain Inventory reads/writes; Stage 8.7 adds explicit opt-in own Effects persistence, preserving Item/provider owners. Stage 8.8 adds maximum HP editing through the same health boundary and read-only Character saving throw calculation projection; Stage 8 closure adds Player save/skill writes and optional typed Character standard skills/death saves; effective totals remain deliberately derived/read-only.

Дата обновления: 30.09.2026

## Назначение

`CharacterModel` - это доменная модель персонажа или существа. Она нужна, чтобы карта, свойства карточек, будущий инвентарь, эффекты, инициатива и проверки читали игровые данные из одного API, а не из произвольного HTML.

Модель не заменяет карточку. Карточка остается пользовательским документом. Structured model строится через Entity/domain APIs. Для legacy compatibility модель является расчетным слоем поверх:

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
- `js/editor/characterSheetCharacter.js` - bounded Sheet source/mutation boundary: catalog-independent legacy Properties path, exact activated Registry for structured Character, Variables level/abilities and canonical health current/temp/maximum HP commands.

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
    source: 'entity' | 'structured-unavailable' | 'items-block' | 'manual' | 'empty',
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
    source: 'entity' | 'manual' | 'effects-data' | 'empty',
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

Rules 1–4 and legacy Properties dependencies below describe only no-envelope compatibility. Structured projection selects Entity before any Properties/DOM access.

1. `PropertiesModel` имеет приоритет над legacy HTML.
2. Если `PropertiesModel` есть, но в нем нет части полей, недостающие значения получают безопасные defaults.
3. Если `PropertiesModel` нет, `CharacterModel` может быть построен из legacy `Стат. блок DnD`.
4. Если нет ни одного источника, создается пустая модель с безопасными defaults, но она не должна сама записывать карточку.
5. Карта не должна читать HP напрямую из HTML, если может обратиться к `getPageCharacterHealth()` / `CharacterModel`.
6. Карта должна получать модификатор инициативы через `CharacterModel`, а не через ручной `modifier`, если токен создан из карточки персонажа или существа.
7. Inventory owner выбирается per-domain: legacy Item Set либо explicit `dnd.items` + `dnd.equippedItems`; все consumers обращаются к InventoryModel, не к chips напрямую.
8. Автоэффекты от предметов применяются только при явном блоке `Эффекты и состояния` на карточке предмета.
9. Описание предмета, заклинания или навыка не является формулой и не должно автоматически парситься как правило.
10. Идея старых блоков `DnD v2` и `Переменные` встроена в текущий путь: для legacy variables используется блок `Свойства`; structured values имеют Entity/Variables owner.
11. Rule Tree и World Packages не должны мутировать `CharacterModel` напрямую. Они передают эффекты через `characterIntegrationApi.js`.
12. Целевая модель правил - отдельная сущность `ruleTree`. Карточки с тегами `rule/rules/правило/правила` остаются только backward-compatible bridge и источником импорта.
13. Активные правила `Rule Tree` (`activeRuleIds`) могут применяться глобально через provider.
14. Персональный выбор правил хранится в own Effects domain: Entity `dnd.ownEffects` после activation; legacy persistent JSON только до explicit adoption. `CharacterModel` объединяет эти ids с глобальными активными правилами Rule Tree.
15. `model.calculations` является backend-объяснением расчетов. UI может показывать формулу и части расчета из него, но не должен записывать изменения напрямую в этот объект.
16. Structured HP mutation разрешена только для exact valid `character`/`player` с `characterProjection` и явно stored complete `dnd.health`; schema defaults и presentation fallback не являются write source.
17. Structured health `delta/exact` меняет только current/temp и использует max как guard. Stage 8.8 добавляет отдельный `maximum` request: только safe-integer max > 0 и >= current, без clamp current; равный max — no-op. Полный `dnd.health` object и все siblings сохраняются. Plan одноразовый, data-only и всегда проходит через Variables/PageCommand whole-page guards.
18. Successful Variables commit подтверждается durable reread и повторной CharacterModel projection. Properties body не dual-write'ится.
19. Campaign Map Stage 8.4 читает structured Character/Player только с exact activated workspace Registry. Legacy-only map catalog-independent; invalid structured source не fallback'ится и не materialize'ит DnD block.
20. Map `delta/restore/kill/temp` переводится в Stage 8.2 `delta/exact`. Character page пишется максимум один раз, затем все linked token snapshots reread'ятся через CharacterModel. Map save сохраняет только derived cache и не пишет HP обратно.
21. Existing Sheet supports exact structured Character and Player; no-envelope Player does not acquire an invented legacy owner. Source is selected before Properties access.
22. Structured Sheet пишет `dnd.level` и один nested ability score через Variables, сохраняя весь abilities object; current/temp HP пишет только health exact command, max — отдельным health maximum command. Confirmed durable page становится новым editor expected base до следующего body autosave.
23. Effective AC/initiative/speed and arbitrary manual check totals remain derived/read-only. Preserved hidden overrides and inactive migration evidence are ignored by structured calculations and never reverse-mapped to base fields; this is final structured policy, not unfinished Stage 8 work.
24. Structured Character saving throws читаются из `character.savingThrows`: strength/dexterity/constitution/intelligence/wisdom/charisma → saveStr/saveDex/saveCon/saveInt/saveWis/saveCha. `calculations.checks.byKey` и `calculations.byKey` содержат pure ability modifier + proficiency bonus при membership; proficiency read-only. Absent list не материализуется, invalid source не fallback'ится. Generic `character.skills` не является стандартным D&D skill owner.


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
- source-aware чтение legacy JSON `[data-character-effects]` или explicit own Entity state.

Legacy UI для эффектов существует как блок карточки `Состояния и эффекты` (`data-block-type="characterEffects"`) и остается читаемым для старых карточек. Первый уровень popup `Добавить блок` больше не должен предлагать этот специализированный блок: новый пользовательский путь идет через `Свойства`, универсальный `Блок списка`, Rule Tree и будущие режимы внутри этих базовых блоков. Расчетные подсистемы продолжают читать persistent JSON `[data-character-effects]` через `CharacterModel` / `EffectsModel`, если такой legacy-источник уже есть в карточке.

### Effects UI / Map Bridge

- При legacy Effects owner блок хранит persistent JSON в `[data-character-effects]`; Entity owner использует Variables и не переписывает recovery JSON.
- Runtime UI блока не сохраняется как контент карточки и восстанавливается при открытии.
- Safe HTML boundary разрешает только `script type="application/json"` с `data-character-effects`; обычные `<script>` остаются запрещенными.
- Карта, инициатива и будущие проверки не читают `.character-effects-block` напрямую. Они обращаются к `CharacterModel` / `EffectsModel`.
- `sourceType`, `sourcePageId`, `sourcePackageId` и `ruleId` являются мостом к инвентарю, Rule Tree и World Packages.

### Own Effects source boundary — CTV Stage 8.7

`readOwnEffectsSource(page, {registry, repository})` и `readEffectsModelFromPage(page, context)` выбирают owner per-domain. Legacy actor не требует catalog. Valid structured Character/Player использует exact activated Registry: absent `dnd.ownEffects` сохраняет legacy domain, а explicit complete state с exact per-page extension `dnd.own-effects@1` активирует `source: entity`, включая empty collections. Partial/malformed/future/unsupported state — unavailable без HTML fallback. CharacterModel публикует source/status/identity в `provenance.ownEffects` и domain diagnostics.

Optional Field Set хранит own conditions (включая exhaustion), active effect instances с существующими source metadata/modifiers/flags и selectedRuleIds. Fully qualified nested keys и reversible numeric-map rows сохраняют existing EffectsModel payload. Historical source ids — metadata; Rule Tree selections используют existing rule ids. Immutable Player/Character v1 и reference-based `dnd.effects`/`dnd.conditions` не меняются. Нет automatic adoption/upgrade.

`prepareStructuredEffectsChange` / `commitStructuredEffectsChange` сохраняют только own state через Variables/PageCommand, exact whole-page/catalog/schema/workspace guards, single-use, no-write no-op и durable domain verification. Runtime block не сериализуется; confirmed write обновляет editor base, subsequent body autosave сохраняет envelope. Recovery JSON/Properties/body не dual-write'ятся. Uncertain/presentation failure не повторяет и не откатывает write.

Own + Inventory Item + Rule Tree/integration merge сохраняет existing effective AC/speed/initiative/flags. Providers и auto Item effects не становятся actor-owned persisted instances. Explicit user capture из source card сохраняет прежний контракт captured instance, при Entity owner с exact id/type validation. Item Effects persistence остаётся legacy compatibility domain. Duration/stacking/expiration/concentration engine и legacy adoption не входят в Foundation.

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

Structured Character foundation (CTV Stages 8.5 / 8.8):

1. exact activated workspace Registry обязателен; bundled fallback запрещён;
2. level, six ability scores, current/max/temporary HP являются editable approved owners;
3. current/temp HP используют explicit stored-health exact command; maximum использует тот же boundary через `maximum`, сохраняет current/temp/siblings и блокирует max < current;
4. saving throws показывают calculated number/proficiency из CharacterModel, read-only; effective AC, initiative, speed, Character death saves, standard skills и legacy manual overrides read-only/unavailable;
5. Properties body не является fallback или write target; после durable command Sheet rereads CharacterModel и advances editor whole-page base;
6. Inventory/Effects продолжают отображаться через CharacterModel, но их persistence этим leaf не меняется.

Лист персонажа не должен напрямую менять legacy DnD-блоки.

Structured Player core foundation (CTV Stage 8.9) использует этот же Sheet/context и CharacterModel, exact activated Registry и capability `characterProjection`. Player без envelope unsupported; malformed/future/missing catalog никогда не получает Properties fallback. Level принадлежит nested `player.progression['dnd.level']`; scores — nested `player.abilities.<ability>.score`. Explicit stored owner обязателен; progression siblings и ability modifier/save metadata не меняются. Score-derived modifier остаётся gameplay policy, stored modifier не является override.

Player current/temp/max HP используют существующий health domain command. `player.deathSaves.successes/failures` (0..3) используют guarded Variables patch explicit complete object с preservation другого count; absent source показывает 0/0 read-only без materialization. Generic Variables durable readback дополняется durable Entity-backed CharacterModel verification; confirmed write advances editor base перед body autosave. Properties/recovery, own Effects, Inventory, metadata и unrelated values preserved; no-op не пишет, uncertain не retry/rollback.

Player saving throws имеют stable keys strength→saveStr, dexterity→saveDex, constitution→saveCon, intelligence→saveInt, wisdom→saveWis, charisma→saveCha. Значение = score-derived modifier + proficiency bonus при `.saveProficient` + `.saveBonus`. Все 18 Player skills используют canonical `DND_SKILL_GROUPS` key/ability mapping и `calculateDndCheckValue`, proficiency level 0/1/2 (expertise) + `.bonus`. Optional absent members false/0 не materialize'ятся. `calculations.checks.byKey` и `calculations.byKey` содержат те же entries; renderer только отображает value/proficiency/expertise, не считает отдельно. Новые Effects save/skill modifiers не включаются.

Player saves/skills editable через exact nested Variables owners; effective AC/initiative/speed остаются derived/read-only, legacy overrides не активируются. Player identity refs — Sheet-specific read projection через Entity/exact pageId/type validation, не gameplay identity expansion. Non-core Player domains остаются Inspector-owned. Character standard skills/death saves имеют optional typed gameplay owner; generic character.skills остаётся независимым content. Existing schema versions/digests и Inventory/Effects owners не меняются; Stage 8 DONE / Foundation, Stage 9 DONE / Foundation.

### Legacy variable compatibility (historical Properties layer)

The following Properties/CardVariablesModel dependencies apply only to no-envelope legacy cards. Structured gameplay uses Entity API/domain owners described above; it does not consume Properties expressions or title/alias dependency lookup.

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

## Explicit Inventory adoption — CTV Stage 8.10

InventoryModel ownership из Stage 8.6 не меняется. Новый explicit programmatic `js/migration/inventoryAdoption.js` переводит только valid structured Character/Player с both absent actor arrays и одним proven legacy Item Set/universal items block. Strict raw extraction не использует normalized runtime InventoryModel как migration truth. Duplicate chips в одном block суммируются по accepted legacy policy; malformed/multiple/unproven evidence блокируется.

Workspace-global quantity analysis защищает shared Item owner: conflicting claims/stored quantity и missing quantity с existing Entity consumer блокируются. Exact structured Item quantity dependencies durable verified прежде actor activation. Actor atomically получает unique exact refs и empty equipped array; no equipped inference/mechanics. Durable Entity InventoryModel и CharacterModel должны показать те же membership/quantities. Body/old chips/Effects/inactive/metadata сохраняются; runtime projection не dual-write'ится.

Verified full backup, existing journal, exact source/target resume и explicit full recovery принадлежат migration/storage owners. Model остаётся read projection. No automatic adoption, Item Properties migration, Effects adoption или schema change. Caller refresh/reopen после verified write использует existing Sheet/Inventory rendering, editor base принимает durable state; stale/pending body save блокирует competing adoption.


## Structured checks and Character gameplay extension

Player writers patch nested player.abilities.<ability>.saveProficient/saveBonus and player.skills.<skill>.proficient/expertise/bonus through the same bounded Sheet Variables owner. Explicit edit can minimally create absent optional members; read never materializes defaults. Score/modifier/save siblings are preserved; stored modifier is not an effective override.

Character optional dnd.character-gameplay@1 owns character.standardSkills and character.deathSaves, without modifying Character@1. First explicit edit atomically adds the exact declaration/revision and requested root through a bounded PageCommand after exact catalog activation; normal edits use Variables. At least one root is required with the declaration. Other domain can be absent until its explicit edit; malformed/partial/unsupported never fallback. Existing extensions/own Effects/inactive/raw body/meta survive. Death counters are required integers 0..3 when stored, and edits preserve the other counter.

One neutral dndCheckContract maps six abilities and 18 skills; dndCalculations contains the accepted pure policy. Both actors expose all stable skill/save keys in calculations.checks.byKey and calculations.byKey. Value = score-derived modifier + proficiency bonus × effective level + explicit numeric bonus. Expertise independently gives level 2, else proficient gives 1, else 0; flags are orthogonal, preserving accepted Player semantics. Absent means untrained/zero without writes. Character saves continue using character.savingThrows membership. Generic character.skills is independent content and never parsed. No new Effects save/skill modifiers are applied.

Structured passive perception = 10 + skillPerception calculation. Typed hit-dice presentation comes from health through Entity, not preserved Properties. Model never reads inactive override evidence. Sheet updates editor base only after durable domain verification; no-op verifies durable source/catalog, failure/uncertain never retries or rolls back. Stage 8 owner matrix and leak audit evidence are in the canonical migration closure section.

## Future product enhancements (not Stage 8 gaps)

После foundation нужно:

1. расширить Inventory System до экипировки, веса, валюты и связи с эффектами;
2. подключить Rule Tree provider к pipeline автоэффектов;
3. сделать человеко-понятный picker доспеха и экипировки вместо текстового `armorItem`;
4. расширить `CardVariablesModel` до зависимых и расчетных переменных, когда появится `Rule Tree`;
5. расширить Full Character Sheet UX до редактируемого листа;
6. подготовить интеграцию с `World Packages`.

## Explicit own Effects adoption — CTV Stage 8.11

Only valid activated Character/Player with absent own-effects declaration/value may explicitly adopt one proven legacy Effects block. Strict persisted evidence, never CharacterModel aggregate, becomes exact dnd.own-effects@1 + encoded dnd.ownEffects in one PageCommand. Empty is explicit; absent block skips; partial/malformed/ambiguous/richer/unsupported sources block. Captured historical source metadata stays own data; Inventory/Rule/integration contributions remain external and follow existing merge precedence without double counting.

Exact immutable Field Set identity, full backup verification, operation journal, source/target resume and explicit safety-backup recovery precede adoption success. Durable own Effects + CharacterModel provenance are verified; raw body/legacy JSON and unrelated extensions/Variables stay unchanged. Active editor base advances and Effects/Sheet refreshes; normal Stage 8.7 UI edits and body autosave use the new owner. Definition/schema versions/digests do not change; automatic adoption and a new Effects Engine are not enabled. Stage 8 DONE / Foundation; Stage 9 DONE / Foundation.
