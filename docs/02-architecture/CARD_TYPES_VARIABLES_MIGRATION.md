---
summary: "Canonical Card Types / Variables migration architecture: audited owners, PageRecord persistence, schema lifecycle and consumer cutover."
read_when:
  - "Before implementing any Card Types / Variables migration stage"
  - "When changing structured card data, schema-driven Inspector or legacy Properties ownership"
owner_zone: "architecture"
---

# Card Types / Variables: архитектура и миграция

Дата: 2026-09-24. CTV Stage 1 `Архитектура новой системы типов`, architecture-only / `Foundation`.
Исследованный baseline: `7422c9d7957201c59eddfb1ac2e2716e1cff5d66`, ветка `main`.

Это единственный canonical design миграции. Исходный аудит разделов 2–3 описывает baseline Stage 1; разделы 5.1 и 6.1 фиксируют реализованные Stages 2/3. Остальные целевые contracts реализуются поэтапно, без автоматического переключения gameplay consumers. Очередь реализации находится только в [PROJECT_PLAN](../01-delivery/PROJECT_PLAN.md).

По текущему решению владельца 17.6 First Combat Attack Workflow — последний завершённый и принятый Combat baseline. Это supersede прежней записи «PAUSED — NOT ACCEPTED», а не утверждение о новом manual test в этом этапе. Phase 17 приостановлена; 17.7–17.FINAL остаются незавершёнными и возвращаются после миграции. Сохранение поведения 17.6 обязательно при последующем переключении источников.

## 1. Продуктовые и архитектурные инварианты

Одна универсальная карточка: формальный `type`, свободное содержимое/blocks, изображения/wiki-links, structured variables. Тип определяет структурированные поля, но не ограничивает свободные blocks и не задаёт обязательный шаблон содержимого. `template` существующей страницы выбирает renderer и не становится вторым типом карточки. Campaign Map, Task Tracker, Rule Tree и Knowledge Graph остаются существующими special-page aggregates; миграция типов не превращает их данные в CharacterModel.

Утверждённые 15 типов и стабильные технические ids нового каталога:

| Тип | id | Тип | id | Тип | id |
| --- | --- | --- | --- | --- | --- |
| Игрок | `player` | Персонаж | `character` | Локация | `location` |
| Регион | `region` | Страна | `country` | Организация | `organization` |
| Предмет | `item` | Навык | `skill` | Заклинание | `spell` |
| Эффект | `effect` | Лор | `lore` | Папка | `folder` |
| Проект | `project` | Раса | `race` | Класс | `class` |

Каталог полей не сокращается. Локальный предоставленный reference `docs/05-hypotesis/card_types.txt` проверен для формы данных: nested objects, repeatable objects, typed references, source lists, assets, dates, colors, formulas, common metadata. Он остаётся вне этого commit; сотни полей здесь не воспроизводятся. В нём «Игрок» — игровая сущность с расой/классом/характеристиками, а не учётная запись человека. Player и Character могут разделять field sets и игровую проекцию, сохраняя разные формальные типы. До отдельной задачи каталог не становится executable schema.

Для каждого значения один persistent owner. Inspector — универсальный schema-driven runtime UI. Запрещены отдельные Player/Item/Spell/Character Inspector renderers для различий, выразимых схемой и reusable field components. Доменные системы не читают Inspector/DOM, не разбирают schema сами и не знают формат variables. Custom schemas — данные: без JS, `eval`, `Function`, callback/script strings, dynamic imports или side effects при чтении.

## 2. Проверенная текущая архитектура

Ссылки в таблице — реальные owners baseline, а не предложенные будущие абстракции. Для больших файлов указаны функции/границы, чтобы исследование можно было повторить без чтения всего репозитория.

| Граница | Реальные owners и наблюдение |
| --- | --- |
| Page format | [`pageRecord.js`](../../js/core/pageRecord.js): `parsePageRecordContent`, `buildPageRecordContent`, `updatePageRecordContent`, `createRuntimePageFromContent`. `.md` = line-oriented front matter + HTML body. Это не полноценный YAML parser. Unknown front-matter lines сохраняются при update; известные поля нормализуются. `relationshipsJson` уже использует JSON в одной строке. |
| Metadata/hash | Там же: id, schemaVersion, updatedAt, contentHash, parent, order, tags, template, type, aliases, relationships. Title извлекается из `<h1>` body. `contentHash` = FNV-1a32 **body**, не всего файла. `page-state-identity` v1 включает metadataHash (включая frontMatter.entries) и stateHash всего текста; не криптографическая CAS-гарантия. |
| Load/index | [`workspaceStorage.js`](../../js/storage/workspaceStorage.js) → `scanWorkspacePagesByAdapter` в [`pageStorage.js`](../../js/storage/pageStorage.js) → PageRecord/runtime pages → `setPages` → [`PageRepository`](../../js/repository/pageRepository.js), [`PageIndex`](../../js/repository/pageIndex.js), TreeIndex. Lookup id/title/alias/parent/type/tag и cached search принадлежат этим read models. Known lifecycle updates инкрементальны. |
| Writes | [`pageCommandService.js`](../../js/storage/pageCommandService.js): validate → rollback context → apply → persist → index → event; `persistPageContentCommand` → [`pageWritePreconditions`](../../js/storage/pageWritePreconditions.js) → [`writeQueue`](../../js/storage/writeQueue.js) → active StorageAdapter. Проверяется durable target file, не только cached page. Workspace context защищает от записи после переключения workspace. |
| Structured preservation | В `SUPPORTED_STRUCTURED_PAGE_RECORD_FIELDS` только **aliases, tags, type** и их aliases. Disjoint metadata preservation не является merge произвольного JSON, HP или body. Full content save остаётся conflict-only. |
| Типы | [`cardType.js`](../../js/ui/cardType.js) содержит UI-каталог character/creature/location/region/folder/magic/skill/object/item/lore/note; смена типа сейчас перезаписывает tags на `['card', type]`, затем вызывает save. Иконки в [`icons.js`](../../js/core/icons.js) — вычисляемая таблица по типу. Создание/дублирование токенов также нормализует type/tags. Это несколько точек использования типа, не готовый Registry. |
| Properties schemas | [`propertySchemas.js`](../../js/properties/propertySchemas.js) — JS definitions и helpers; [`propertyBlockDefinitions.js`](../../js/templates/propertyBlockDefinitions.js) только re-export. `getSchemaValueFields` flatten compound/skillGroup. [`blockTypes.js`](../../js/templates/blockTypes.js), `createPropertiesBlock` строит поля; [`propertiesSettingsPopup.js`](../../js/editor/propertiesSettingsPopup.js) изменяет набор/custom/layout. |
| Значения Properties | [`propertiesModel.js`](../../js/properties/propertiesModel.js), model **v1**, читает HTML controls по `data-property-name`, block `data-card-type`; custom field metadata/value, manualOverrides и layout читаются отдельно. Нет независимого JSON variable store. Без DOM HTML reader возвращает `[]`, что нельзя трактовать как доказанное отсутствие данных. |
| Save/reload Properties | [`blockSerializer.js`](../../js/editor/blocks/blockSerializer.js) клонирует editor, синхронизирует input value/checked, textarea text, select selected; удаляет runtime и sanitizes. [`autosave.js`](../../js/editor/autosave.js) собирает PageRecord и передаёт editor expectedBase в PageCommandService. Reload снова парсит HTML. Runtime auto-calculation в [`propertiesAutoCalculations.js`](../../js/editor/propertiesAutoCalculations.js) обновляет controls; derived числа могут попадать в сохранённый HTML. |
| CardVariablesModel | [`cardVariablesModel.js`](../../js/properties/cardVariablesModel.js) — read projection: выбирает Properties с совпадающим page.type либо первый блок; отдаёт variables/byKey, schema fields + custom fields. Не store, не обязательное звено CharacterModel. [`cardVariableDependencies.js`](../../js/properties/cardVariableDependencies.js) — safe additive formula foundation, ссылки по id/title/alias; не общий работающий rule engine. |
| Calculations | [`propertiesCalculationEngine.js`](../../js/properties/propertiesCalculationEngine.js), `createPropertiesCalculationModel`: level/proficiency, ability modifiers, skill/save checks, armor, speed, initiative, health summary; manual overrides, formula/parts/source. Armor lookup читает Properties item по id/title/alias. |
| Character | [`characterModel.js`](../../js/character/characterModel.js), `readCharacterModelFromPage` читает **напрямую** Properties + legacy DnD health + Inventory + Effects. `createCharacterModelFromSources` выбирает первый character/creature Properties model независимо от page.type; затем legacy health, затем defaults. Объединяет own/item/rule/injected effects; calculations входят в нормализованную игровую проекцию. |
| Inventory | [`inventoryModel.js`](../../js/character/inventoryModel.js): `.item-set-block .item-set-chip`, pageId, title, quantity; merge одинаковых pageId. Editing items и character sheet остаётся block/DOM path. Structured quantity/reference — не обычный текст, даже если находится в block. |
| Effects/rules | [`effectsModel.js`](../../js/character/effectsModel.js) читает `[data-character-effects]` JSON (attribute либо text); conditions/effects/selectedRuleIds. [`characterEffectsBlock.js`](../../js/editor/characterEffectsBlock.js) пишет persistent JSON; [`effectSourceResolver.js`](../../js/character/effectSourceResolver.js) читает явные effects источников. [`characterIntegrationApi.js`](../../js/character/characterIntegrationApi.js), [`ruleTreeProvider.js`](../../js/rules/ruleTreeProvider.js) объединяют integrations, active/selected rules; Rule Tree и rule packages имеют собственный persistent owner. Описание предмета/заклинания не выполняется. |
| Sheet writer | [`characterSheetBlock.js`](../../js/editor/characterSheetBlock.js) через [`propertiesDomWriter.js`](../../js/properties/propertiesDomWriter.js) создаёт/обновляет Properties и `override-*`, вызывает обычный save. Sheet не самостоятельный source. |
| Строгий Combat HP | [`characterHealthMutation.js`](../../js/properties/characterHealthMutation.js), `prepareCharacterHealthMutation`: ровно один character/creature Properties block, уникальные явные numeric hpCurrent/hpMax/hpTemp, integer/range checks; detached immutable plan с expectedBase, guards, before/after и readback. Legacy-only/missing/duplicate/malformed источники отклоняются. Нет save/roll/event. |
| Combat execution/Undo | [`combatActionPipeline.js`](../../js/combat/combatActionPipeline.js) использует exact initiative→token→page, Character HP/AC, Dice, shared per-target queue, workspace/durable preconditions, один page write, затем append transaction. [`combatAttackReversal.js`](../../js/events/combatAttackReversal.js) проверяет original transaction/current HP/max/base, компенсирует одной записью. Append failure не откатывает HP автоматически. [`pagePropertyResourceTransaction.js`](../../js/events/pagePropertyResourceTransaction.js) — отдельный старый one-numeric-input consumer с иной rollback policy; его нельзя подставить как generic HP API. |
| Map | [`campaignMapCharacterBridge.js`](../../js/editor/campaignMapCharacterBridge.js) строит token snapshot через CharacterModel. Initiative roll/total/current turn принадлежат CampaignMapInitiativeModel; CombatSession хранит membership/round/flags, не HP. [`campaignMapHealth.js`](../../js/editor/campaignMapHealth.js) ещё читает/создаёт legacy DnD и fallback-пишет HTML; `changeTokenHp` в [`campaignMapTokenActions.js`](../../js/editor/campaignMapTokenActions.js) работает с draft, затем PageCommandService и map save. Это отдельный от Combat путь, без action transaction. |
| Schema/recovery | [`schemaVersions.js`](../../js/schema/schemaVersions.js): workspace/page/map/task/templates/assets сейчас v1. [`pageSchema.js`](../../js/schema/pageSchema.js) валидирует page metadata/template, future page version — error; полноценного card type/value validation нет. [`workspaceSchema.js`](../../js/schema/workspaceSchema.js), schemaRecovery и schemaUpgradeGate — diagnostics/recovery/backup gate, не автоматический importer. Workspace loader передаёт pages/assets, не durable workspace-version manifest. |
| Backup | [`backupService.js`](../../js/storage/backupService.js), [`backupRestorePreview.js`](../../js/storage/backupRestorePreview.js): v1 pages/raw content + обнаруженные assets; manifest validation, preflight, verified pre-restore backup; partial restore selected pages/assets. Не удаляет отсутствующие в backup новые страницы, не гарантирует multi-file atomicity. Events sidecar не входит и не откатывается. |
| Export/import | [`worldPackageModel.js`](../../js/worldPackage/worldPackageModel.js), `createPackagePageRecord`: переносит id/title/parent/order/template/type/tags/aliases/body; **теряет unknown front matter и даже relationships**. ImportService sanitizes body, rebuilds PageRecord, backup-gates; block/skip/copy, remap parent и asset paths. Это не lossless raw-page transport. |
| Другие copies | `duplicatePageAsChild` в pageStorage и [`pageTemplateStorage.js`](../../js/templates/pageTemplateStorage.js) rebuild через ограниченный набор полей. Templates `.my-own-world-templates.json` v1 сохраняют body/type/tags, сбрасывают aliases/relationships при создании. Их надо включить в migration gate, иначе variables исчезнут при duplicate/template/token-copy. |
| Links/search/assets | [`knowledgeGraph.js`](../../js/wiki/knowledgeGraph.js), graph relationships, PageIndex, internalLinkDiagnostics читают parent/wiki/page.relationships. [`assetReferenceScanner.js`](../../js/storage/assetReferenceScanner.js) читает HTML attributes, property assets и map music; JSON variables автоматически не обходятся. Browser/desktop используют общие модели, разные StorageAdapter, не разные persistent formats. |

Фактический текущий data flow:

```text
PageRecord.type → UI type / schema choice (также block.data-card-type)
PageRecord.body → PropertiesModel ┬→ CardVariablesModel → dependency foundation
                                └→ PropertiesCalculationModel → CharacterModel
body → InventoryModel / EffectsModel / legacy DnD ────────────────┘
Rule Tree / item sources / integrations ─────────────────────────┘
CharacterModel → Map snapshots / Initiative modifier / Combat HP, AC / sheet
UI controls or detached HP plan → body → PageRecord → PageCommand → queue → adapter
```

Нельзя буквально закрепить `page.type → CardVariablesModel → CharacterModel`: код так не работает; block type и page type могут расходиться. Также docs о PropertiesModel v2 JSON — прежняя **цель**, а не текущий формат. DND_CALCULATION_RULES перечисляет expertise как future, но `readProficiencyLevel`/checks уже поддерживают уровень 2; миграция сохраняет фактическое поведение тестов, не заново вводит это как feature.

## 3. Единственные владельцы данных

| Данные | Canonical owner после миграции | Inspector binding / ограничения |
| --- | --- | --- |
| id, type, template, tags, aliases, parent, order, schemaVersion, updatedAt | PageRecord metadata | `page.*` bindings через существующие page commands; не копировать в variables. `type` — только stable registry id; template отдельно. Order уже допускает дробные значения для reorder: не менять на integer из каталожной подсказки. |
| title, description, произвольный текст, wiki-links, blocks | PageRecord body / block models | Title по существующему h1; blocks не JSON-копия в store, не schema-шаблон. Type change не переписывает content. |
| Главное изображение | Существующий card-shell portrait asset reference в body, Asset lifecycle | `content.primaryImage` binding к существующему image owner. Не вводить второе `variables.image`. Embedded block images сохраняются как раньше. Старый fallback «первое img» — compatibility, не новый независимый owner. |
| Иконка | Сейчас derived type icon; будущий explicit override — PageRecord metadata `iconJson` | Tagged value `{kind: 'system', name}` либо `{kind: 'asset', path}`; absent = registry/type default. Не дублировать в variables; asset scanner обязан учитывать override. |
| Archive state | Сейчас canonical persisted archive field в runtime не обнаружен; будущий PageRecord `archived` boolean | Absent = false, read без записи; отдельный page command. Не активировать фильтрацию/скрытие в этом этапе. Trash/delete — другая операция. |
| Общие явные отношения | `page.relationships` / `relationshipsJson`, существующий graph command owner | Schema `page.relationships` binding, не вторая коллекция. Расширение relation shape (direction/metadata) требует версионированного расширения этого owner, текущий normalizer лишние поля не сохраняет. |
| Domain references: race, class, armor, inventory entries | Card Variables | Typed refs с семантикой поля. Graph показывает derived edges с source key; не сохраняет копии в relationshipsJson. Если поле лишь фильтр существующих explicit relations, использовать binding к relations, не ещё одно value. |
| HP, progression, abilities, costs, domain source/provenance, custom values | Card Variable Store внутри PageRecord | Через Variables API; provenance не равен PageRecord identity или package manifest metadata. |
| Manual override | Variables envelope `overrides`, одна запись на computed key | Расчётный результат не хранится; base input с иной семантикой может быть отдельным полем. |
| Inventory membership/quantity; own active Effects/selectedRuleIds | Variables как storage owner после отдельного cutover каждого набора; InventoryModel/EffectsModel остаются domain owners | До cutover их blocks — единственный source. Блоки после cutover только runtime views. Автоэффекты, rule definitions и map session не копируются в values. |
| Map positions, initiative roll/manual total/order/current participant, Combat round/flags | CampaignMapModel / Initiative / CombatSession | Остаются map-local aggregate. Character-derived HP/AC/speed/modifier — runtime projections, не writable snapshot truth. Persistent derived token snapshots подлежат retirement при map cutover; map-local значения сохраняются. |

Разделение логическое, даже если metadata и variables физически находятся в одном front matter. Common metadata field sets описывают **bindings**, а не создают дефолтные копии tags/type/blocks в values. Не всякое поле с label «Изображение» — portrait: отдельный domain asset (например иллюстрация способности) может быть самостоятельным variable только при отдельной семантике.

## 4. Решение о persistence

**Выбран один `variablesJson` envelope в front matter того же `.md` файла, принадлежащий PageRecord.** Это однострочный строго JSON payload; не вложенный YAML, не HTML, не отдельный файл значений. Card Variable Store — typed view и подготовка patches над этим envelope, не новая БД/параллельный write queue.

Пример будущего page v2 (иллюстрация wire contract, не реализация каталога):

```text
---
id: hero-1
schemaVersion: 2
type: character
template: card
variablesJson: {"formatVersion":1,"schemaVersion":1,"schemaDigest":"sha256:<definition-closure>","values":{"dnd.hpCurrent":8,"dnd.hpMax":10,"dnd.hpTemp":0},"overrides":{},"extensions":{"revision":1,"fields":[]},"inactive":[],"migration":{"id":"legacy-properties-v1","sourceStateHash":"fnv1a32:...","sourceType":"character","domains":["properties"]}}
---

<h1>Hero</h1>
...free persistent HTML...
```

Envelope не содержит pageId/type/title/tags и не хранит computed results. Schema identity = `PageRecord.type + envelope.schemaVersion + schemaDigest`; digest фиксирует transitive immutable definitions/field sets/resolver contract ids, не runtime results. `formatVersion` — wire format envelope, `schemaVersion` — версия definition типа, PageRecord.schemaVersion — формат страницы. Эти счётчики независимы. Migration receipt — provenance, не копия старых значений. `domains` перечисляет переключённые наборы данных; версия receipts привязана к migration id.

`values` — map stable key → typed JSON value; `overrides` — map computed key → explicit typed manual value, без отдельного enabled flag (наличие ключа означает override, включая 0/false/null при nullable). `extensions` содержит revision и card-owned field definitions либо exact field-set references. `inactive` — array записей `{id, key, owner:{typeId,schemaVersion,schemaDigest}, definition, value, valueKind, reason}`; `valueKind` различает stored/override, `definition` — ссылка на immutable owner либо единственное сохранённое определение удалённого card extension. Значение перемещается сюда и удаляется из active slot в том же candidate. Разные прежние семантики не сливаются по одинаковому тексту key; повтор receipt не создаёт вторую inactive запись. Required members envelope: formatVersion/schemaVersion/schemaDigest/values; absent optional collections читаются пустыми без записи, неизвестные members сохраняются opaque.

Codec owner — PageRecord: parsing/serialization/runtime projection и parseIssues. Object keys при записи сортируются детерминированно, arrays сохраняют порядок; Unicode UTF-8, JSON escapes для переносов/quotes, один physical line. Разрешён JSON data tree: null/boolean/string/finite number/array/plain object; запрет prototype keys, duplicate JSON object keys, duplicate envelope lines, invalid numbers, excessive size/depth. До активации reader должны быть заданы и протестированы общие limits в validator; для v1: 1 MiB envelope, depth 32, 10 000 элементов одной коллекции. Превышение — read-only diagnostic/raw export, не обрезание.

Absent envelope означает legacy, не пустой migrated store. Valid envelope с пустыми values означает migrated data с отсутствующими explicit values. Malformed envelope сохраняется raw для диагностики; нельзя превращать его в `{}`, fallback-читать Properties поверх ошибки или молча переписать при autosave. Missing registry, unsupported version/digest, invalid envelope блокируют обычные записи затронутой страницы, сохраняя чтение безопасного content и raw recovery/export. В Stage 3 этот write guard реализован в PageCommandService/shared write queue; warning-first workspace loader сам по себе не является разрешением записи.

Сохраняем текущую семантику `contentHash`: hash body. Новые envelope/icon/archive metadata включаются в metadataHash и full stateHash. Precondition сравнивает полную PageStateIdentity, поэтому variable-only edit конфликтует со stale body save даже при неизменном body hash. Проверка повреждений structured payload — JSON/schema/digest validation, а не body hash; hash не security boundary. Не добавляем независимую revision-систему variables.

Причины выбора и существенные альтернативы:

| Вариант | Оценка |
| --- | --- |
| **JSON в PageRecord front matter** | Уже есть precedent relationshipsJson, unknown-field preservation и full-file identity; одна страница/запись/backup unit, нет DOM/sanitizer зависимости данных. Требует явного расширения parser, projections, portability и write guards; это учтено ниже. |
| HTML inputs или JSON script в body | Inputs оставляют данные зависимыми от renderer; JSON script возможен по precedent Effects/TaskTracker, но попадает в editable/sanitizer/clipboard/block lifecycle. Store не должен удаляться как block или требовать DOM для headless domain reads. |
| Отдельный JSON рядом с каждой страницей | HP/body/type становятся multi-file commit/recovery problem; существующий PageCommand и partial restore не гарантируют атомарность двух файлов. Не нужен для объёмов каталога. |
| Общая workspace values DB/JSON | Вторая identity/index/queue, крупные конфликты, сложный partial restore, lossless page-copy невозможен без скрытого join. |
| Вложенный YAML либо поле на каждую variable | Текущий parser line-oriented, list parsing simplistic; понадобился бы новый YAML dialect/dependency. One strict JSON envelope изолирует typed domain data от legacy metadata parsing. |

## 5. Definitions, Registry и композиция

Owners в существующих зонах кода (реализованная область уточняется в 5.1 и 6.1):

| Owner | Responsibility и зависимости |
| --- | --- |
| `js/cardTypes/cardTypeRegistry.js` | Read-only resolved definitions по type/version/digest; bundled definitions + activated workspace catalog. Composition, capabilities, immutable dependency closure; не хранит значения и не пишет страницы. |
| `js/cardTypes/cardTypeSchema.js` | Чистая meta-schema, validation definitions/field sets, flatten/index полей, проверка conflicts/cycles/bindings. Только данные; не renderer/calculator. |
| `js/cardTypes/definitions/` | Bundled declarative type definitions и reusable field sets; версия не изменяется in place. Здесь позднее каталог, не switch по типам в Inspector. |
| `js/storage/cardTypeCatalogStorage.js` | Один versioned `.my-own-world-card-types.json` через StorageAdapter; immutable activated definitions/field sets, optimistic file identity, existing operationJournal/backupService для рискованных операций. Не новый page repository или values DB. |
| `js/variables/cardVariableStore.js` | Detached normalized snapshot explicit values/overrides/extensions/inactive + diagnostics; codec использует PageRecord. Reads через PageRepository; никаких самостоятельных writeText. |
| `js/variables/entityVariables.js` | Публичный Variables / Entity API: bindings к metadata/content/variables, definitions, typed refs, resolution/provenance, validation и plan/commit boundary. Домены используют этот API. |
| `js/variables/variableCommands.js` | Validate/prepare whole-page candidate → existing PageCommandService. Согласование page base, schema closure identity, workspace context; без отдельной очереди и event system. |
| `js/schema/cardVariablesSchema.js` | Pure envelope/value diagnostics, подключение к page/workspace/recovery validation. Definition validator остаётся в cardTypes; domain constraints делегируются зарегистрированным domain owners. |
| `js/variables/computedResolvers.js` | Allowlisted trusted resolver registry: id + version + input/output contract, dependency tracking, pure execution. Не хранит schema scripts и не выполняет formulas как JS. |
| `js/variables/cardVariablesMigration.js` | Explicit preview/apply orchestration через existing upgrade/backup/journal/page-command owners; legacy extraction adapter из Properties. Не самостоятельный recovery engine. |
| `js/ui/inspector/` | Один Inspector и field-component registry по datatype/presentation, source badges/errors/override/reset. Получает definitions и values из Entity API; не owner values, schema migrations или формул. |

Definitions persistence: catalog `{formatVersion:1, revision, types:[...], fieldSets:[...]}` хранит все **активированные** версии и их transitive closure, включая pinned bundled definitions. Bundled файлы — seed; для активированного `(id, version)` canonical definition — immutable запись workspace catalog. Одинаковый id/version обязан иметь одинаковый digest; divergent duplicate блокируется, не выигрывает по порядку загрузки. Registry — только cache над этим источником. Нельзя редактировать запись v1 in place: publish v2, v1 остаётся доступной для старых страниц. Удаление unused versions — только отдельный явный cleanup с backup; в миграции GC нет.

Custom type ids `custom:<uuid>`; custom field keys `custom.<uuid>`. Type labels, русский текст, порядок и UI section не identity. Общие gameplay keys квалифицированы (`dnd.hpCurrent`), специфические поля — namespace своего владельца. Legacy keys сопоставляются explicit mapping; display labels не ключи. Per-card custom fields допустимы в `extensions.fields` этой карточки, без повторения определения в workspace catalog. Повторно используемое custom field definition должно принадлежать field set/catalog; page extension ссылается на него. Extension revision входит в full page identity; rename labels не rename keys.

Definition имеет `id`, integer `version`, `label`, `includes`, `fields`, `sections`, optional data-only `capabilities`/`metadata`. Field: stable `key`, `label`, `datatype`, `binding`, optional `default`, `nullable`, `required`, `readonly`, `computed:{resolverId, version, inputs, allowOverride}`, `min/max`, `options:[{value,label}]`, `targetTypes`, `items`, `properties`, validation rules, `section/group`, `visibility`, `deprecated`. UI группы не обязаны повторять физическую вложенность. Compound armor/HP — presentation group над stable keys, не дублирующий object с теми же числами.

Datatypes: string (single/multiline), finite number/integer, boolean, enum (stable option values), date/datetime (ISO strings), color (validated string), asset (tagged workspace-relative asset path), reference, array, object. Repeatable objects = array<object> со stable row id; операции адресуют row id, не нестабильный index. `formula<string>` остаётся typed string с указанной grammar/resolver; не универсальный исполняемый язык. Source[] составляется из объектов/refs/URL/text. `relation[]` и `block[]` common fields используют existing owner bindings. Nullable явно отделяет null от absent; пустая строка не автоматически null/zero.

Visibility — bounded declarative predicates (`all/any/not`, equality, membership, presence по declared keys), без функций. Hidden не означает deleted и не обходит validation. Required проверяется после defaults, но domain mutation может требовать explicit stored value (HP). Unknown datatype/resolver/rule не рендерится как опасный editable text fallback: диагностируется и сохраняется opaque.

Field sets создаются по общей семантике: dnd abilities, character health, progression/checks, asset/source references там, где совпадают смысл и constraints. Не объединять разные «уровень» или «стоимость» только ради меньшего JSON. Общие metadata bindings — reusable presentation definitions с PageRecord owner, не values set.

Composition contract:

1. Field definition принадлежит одному type или field set; `includes` содержит exact id/version, никогда `latest`/ranges. DAG, cycles — definition error. Поле получает неизменную provenance владельца.
2. Flatten создаёт runtime view, не persisted копии definitions. Повтор одного и того же field identity/version в diamond include deduplicated; разные definitions с одним key — blocking conflict, не last-wins.
3. Consumer может override только label/help/section/order/visibility через explicit presentation overrides. Datatype, default, resolver, required, range, targets, binding нельзя незаметно переопределять: новая версия owner и новая версия consuming type. Несовместимый иной смысл требует нового key.
4. Обновление field set не меняет существующие type versions. Publish type v2 с новым include и explicit migration chain. Общий field migration исполняется один раз для field identity, даже при нескольких includes; type migration планирует порядок/зависимости и не дублирует transform.
5. Совпадение key само по себе не разрешает перенос между типами: совпасть должны semantic owner и совместимая version/constraints либо explicit converter.

### 5.1 Реализованный CTV Stage 2 contract

CTV Stage 2 реализует этот раздел как production foundation без подключения к существующим карточкам. [`cardTypeSchema.js`](../../js/cardTypes/cardTypeSchema.js) валидирует data-only Type/Field Set definitions, exact-version includes, bindings, nested datatypes, stable-row `array<object>`, pinned formula grammar, computed resolver references и bounded visibility predicates. Реализованная форма presentation override — `fieldOverrides[key]` только с `label/help/section/group/order/visibility`; semantic attributes отклоняются. Binding явно указывает owner: `variables`, существующий `page` metadata path, существующий `content` path либо `presentation`. Non-variable binding не может объявить variable default/computed owner.

[`cardTypeRegistry.js`](../../js/cardTypes/cardTypeRegistry.js) загружает bundled seeds, активированный catalog и проверяемый activation candidate с явным приоритетом источника. Registry требует exact type/Field Set version, проверяет полный include DAG, дедуплицирует diamond по definition identity, блокирует field-key conflict разных owners и отсутствующие declared inputs, сохраняет provenance, строит immutable flattened `fields/fieldsByKey/closure` view и не имеет DOM/PageRecord/domain dependencies. SHA-256 closure digest строится из отсортированной semantic projection всех exact definitions; label/help/sections/order/visibility/options labels и presentation overrides не входят в semantic identity, а datatype/binding/default/constraints/resolver/option values/capabilities и прочая семантика входят. Поэтому перевод или UI-порядок не меняют schema identity, но изменение семантики требует новой version. Полный активированный definition record всё равно immutable в workspace catalog.

[`cardTypeCatalogStorage.js`](../../js/storage/cardTypeCatalogStorage.js) владеет `.my-own-world-card-types.json` формата `{formatVersion:1,revision,types,fieldSets}`. `readCardTypeCatalog` возвращает catalog и optimistic identity `{revision,digest}`. `activateCardTypeDefinitions` работает в общей `queueWrite`, повторно читает identity внутри очереди, блокирует stale write/conflicting `(id,version)`, материализует только активируемые definitions и их transitive closure (включая bundled seeds), пишет один файл через context-bound `StorageAdapter` и проверяет readback. Это additive single-file activation, поэтому отдельный journal/backup engine в Stage 2 не создаётся; рискованные migration/restore операции остаются будущими callers существующих owners. Catalog parser требует self-contained activated closure. Bundled catalog boundary существует в [`bundledDefinitions.js`](../../js/cardTypes/definitions/bundledDefinitions.js), но production arrays намеренно пусты до каталогов Stages 5/6: test fixtures не выданы за утверждённые типы.

Stage 2 не загружает catalog при обычном открытии workspace, не выбирает latest version, не активирует definition автоматически и не меняет PageRecord/Properties/Character/Combat/Map runtime. Variable values, resolver execution, Inspector и migration остаются последующими этапами.

## 6. Variables / Entity API и запись

Целевой contract операций; точные реализованные сигнатуры Stage 3 — в 6.1:

| Операция | Результат / guarantees |
| --- | --- |
| `readEntity(pageId, context)` | Detached snapshot с page identity, exact definition identity, source mode/diagnostics. Missing page ≠ empty entity. Нет IO write/auto migration. |
| `getValue(snapshot, key, {mode})`, `getValues(snapshot)` | Явно stored/default/effective modes; результат содержит status (`value`, `absent`, `invalid`, `unresolved`, `unsupported`), source/provenance. Нельзя маскировать invalid как 0. Обычный domain read использует effective values; mutation guards проверяют stored. |
| `getTypeDefinition`, `getFieldDefinition` | Resolved immutable definitions с origin и binding; consumer не разбирает includes. Metadata bindings читаются через владельца. |
| `validateEntityValues(candidate, context)` | Structured issues: code/severity/pageId/field key/row path, исходное значение сохраняется. Чистая проверка; domain validation поверх datatype checks. |
| `resolveReference(snapshot, key, rowId?)` | `{pageId}` canonical exact target; targetTypes проверяются по Registry/PageRepository. Returned target/diagnostic, не name fallback. Labels — runtime projection. Missing, wrong-type, self/cycle restrictions дают диагностику без удаления ссылки. |
| `resolveComputed(snapshot, keys, context)` | Effective value + calculatedValue + override + formula/parts/dependencies/issues; без записи. Cycles/missing sources/unknown resolver — typed failure. |
| `prepareVariablesChange({pageId, expectedBase, patch, context})` | Immutable plan: before/after, changed keys, unchanged guards, candidate content, definition closure identity. Patch — set/unset/override/reset и stable-row operations; atomic по странице. Не executable callbacks из schema. |
| `commitVariablesChange(plan)` | Existing PageCommand receipt плюс readback outcome. Нет success до durable save; конфликт сохраняет MINE в runtime, не создаёт backup. Combat может передавать plan своему existing coordinator, не запускать вторую запись/transaction. |

Обычная single-page правка — Tier 1. Type conversion/schema upgrade/bulk extraction — Tier 3: explicit preview, verified backup, journal, validate/readback. Whole-page expectedBase обязателен для variables и override операций; никаких `expectedBase:null`, force overwrite или automatic variable-level rebase в первой реализации. Existing aliases/tags/type disjoint preservation не расширяется автоматически. На migrated card изменение type обязано идти через conversion command с variables, а старый узкий type-only rebase запрещён для этого перехода.

Commit rereads durable target через PageCommandService в существующей queue; проверяет captured workspace context и definition closure. Между preview и commit смена схемы/страницы требует новый план. After durable write — parse/readback, publish PageRepository incremental update и invalidate dependent Entity/Character/Map projections. Failed write не публикует candidate; uncertain write/readback сохраняет structured status для recovery. Нет обещания CAS против внешнего процесса между read/write и нет общей atomicity page+catalog+events.

Readback verification должна выполняться внутри существующего command lifecycle до его index/publication phase; не добавлять вторую публикацию поверх уже published candidate. Metadata/content bindings делегируют подготовку существующим owners; составная операция собирает один PageRecord candidate и делает один commit, не запускает несколько независимых saves. Registry check compares только использованную immutable closure: публикация несвязанного типа не инвалидирует все draft sessions workspace.

Inspector draft и editor body draft используют одну PageRecord edit-session base. Сохранение согласованного draft собирает metadata/variables/body один раз; если другой consumer уже записал страницу, stale editor/Inspector получает conflict, MINE остаётся доступным. Нельзя тихо брать variables из нового runtime page, а старый body из editor и выдавать это за безопасный merge. Renderer перестраивается по Registry, reusable components принимают key/path и API commands. Новое обычное поле/тип не требует изменения renderer; новый datatype/component — отдельная platform capability.

### 6.1 Реализованный CTV Stage 3 contract

Stage 3 — `DONE / Foundation`: production data boundary существует и проверен in-memory integration tests, но UI и миграции карточек нет. Baseline реализации: `54cb618a52dd4a9d28e2a21576b0a9dfdf3e0475`, `main`.

**PageRecord.** [`pageRecord.js`](../../js/core/pageRecord.js) использует внутренний [`pageVariablesCodec.js`](../../js/core/pageVariablesCodec.js), единственный codec envelope. `variablesJson` — одна physical front-matter line JSON, sorted object keys, исходный array order. Wire v1 требует `formatVersion:1`, positive integer `schemaVersion`, `schemaDigest:"sha256:<64 lowercase hex>"`, object `values`; optional `overrides`, `extensions:{revision,fields}`, `inactive`, `migration` и неизвестные members сохраняются. Нет копий id/type/title/tags/computed results. Raw malformed/future строки, включая duplicate envelope lines, остаются в `frontMatter.entries` и `variablesStatus.raw`; unrelated codec update их не заменяет. Ordinary writes invalid/future pages блокируются. Codec rejects duplicate decoded JSON keys, prototype-sensitive keys, non-JSON/accessor/function data, non-finite numbers, sparse arrays, >1 MiB UTF-8, depth >32 и collection >10000. Никакого truncation.

Новая explicit structured serialization по умолчанию использует PageRecord v2. Legacy creation/save и missing-version fallback остаются v1, без materialization envelope или eager upgrade. `SCHEMA_VERSIONS.page=2` означает supported reader ceiling; workspace и catalog formats не менялись. Envelope на page v1 доступен raw, но structured writes требуют v2. Body-only `contentHash` сохранён; `metadataHash/stateHash` уже учитывают физические front-matter entries, поэтому shared PageStateIdentity меняется при variable-only write.

**Store/API.** [`cardVariableStore.js`](../../js/variables/cardVariableStore.js) строит detached deep-frozen snapshot PageRecord: `missing`, `legacy`, `structured`, `invalid`, `unsupported`, `missing-definition`; exact page identity, type/version/digest, raw, envelope/values/overrides/extensions/inactive, resolved fields и diagnostics. Unknown value keys сохраняются с warning; invalid известное значение не заменяется default. Extensions разрешаются из inline `custom.<uuid>` definitions либо exact Field Set refs существующего Registry; conflicts/missing definitions блокируют structured доступ. `inactive`/migration/unknown envelope members пока opaque preserved data, без migration/type-switch editing.

Публичный [`entityVariables.js`](../../js/variables/entityVariables.js): `readEntity(pageId, context)`, `getValue(snapshot,key,mode='effective',context)`, `getValues(snapshot,mode,context)`, definition lookups, `validateEntityValues({envelope,definition,pageId})`, `resolveReference(snapshot,key,context)` и re-export prepare/commit. Context принимает существующие `repository`, `registry`, trusted `resolvers`; snapshots не являются cache/DB. Modes stored/default/effective возвращают status/source/provenance/issues. Defaults lazy, cloned/frozen, привязаны к pinned schema; required без valid default даёт issue. Explicit `0`, `false`, `""`, nullable `null` различимы с absent. `overrides` presence включает manual override только разрешённого computed field; effective computed outputs не сохраняются.

[`cardVariablesSchema.js`](../../js/schema/cardVariablesSchema.js) проверяет typed values, nested paths/row ids, required/defaults/constraints, ownership и overrides. Issues содержат code/severity и `details:{pageId,key,path,rowId,value}` где применимо. Поддержаны ISO date/datetime, hex color `#RRGGBB[AA]`, asset `{kind:'asset',path:'assets/...'}`, exact reference `{pageId}`, nested array/object и stable-row arrays. Дополнительные value rules этого этапа: minLength/maxLength, reference allowSelf/acyclic; неизвестное правило даёт blocking issue. Formula остаётся ограниченной строкой до 4096 символов, без execution; actual grammar/domain calculations остаются будущими registered owners.

Page/content bindings читают existing metadata/body; presentation grouping не содержит значения. Не реализованные ещё `iconJson`/archive/primaryImage projections возвращают `unresolved`, не создают новых metadata owners. Variable patches на metadata/content bindings запрещены; существующие metadata commands остаются их write owners и должны проходить тот же whole-page boundary для structured pages. Reference lookup использует exact repository id, `targetTypes` и Registry, возвращает missing/wrong type/self/cycle diagnostics без удаления или title/alias fallback. Top-level reference resolution включён; nested row references имеют typed shape validation, будущие consumers могут адресовать их отдельно.

**Resolvers.** [`computedResolvers.js`](../../js/variables/computedResolvers.js) регистрирует code-owned synchronous functions по exact id/version. Schema содержит только declarative contract. Execution получает frozen detached inputs/options; output проходит JSON/value validation. Effective resolution tracks dependencies, cycles и depth 32; unknown resolver/missing/invalid inputs возвращают typed failure. Registry не передаёт IO/DOM/network/clock/random; чистота trusted implementation — обязательство code review/tests, это не sandbox произвольного пользовательского JS. Production gameplay resolver list пуст; нет D&D cutover, effect context или cross-entity computed cache в Stage 3.

**Prepare/commit.** [`variableCommands.js`](../../js/variables/variableCommands.js) принимает только data patch `set/unset/override/resetOverride/rowAdd/rowUpdate/rowRemove/rowReorder`. Row identity передаётся отдельно как `rowId`, update не меняет readonly id, reorder перечисляет все ids один раз. Plan deep-frozen: whole-page `expectedBase`, source identity, schema identity, before/after, changed keys, candidate content, diagnostics; workspace/path/repository захвачены приватно. Plan single-use. Stage 3 изменяет уже structured entity; не создаёт её из legacy page и не активирует schemas автоматически.

Commit использует existing PageCommandService и общую write queue. До write — whole-page precondition, current workspace, reread activated catalog (без bundled fallback), exact used closure и candidate validation, затем повторный page precondition после async validation. Несвязанная catalog activation не инвалидирует plan. После write — durable exact-content reread/parse/envelope verification **до** единственной index publication. Результаты `saved/blocked/failed/uncertain` не скрывают write/readback failure; stale plan не rebases, `expectedBase:null` запрещён. Generic structured body save также проверяет catalog, неизменный envelope/type и readback. Старые direct queue callers для structured pages блокируются, если не предоставляют этот command validation/readback boundary; узкое aliases/tags/type preservation к variables не применяется. Нет CAS-гарантии против внешнего процесса между read/write, новой revision/queue или multi-file transaction.

**Safety floor.** [`structuredPagePolicy.js`](../../js/storage/structuredPagePolicy.js) используется существующими owners. Backup/restore v1 блокируются при activated catalog, structured runtime/durable page или structured source backup; manifests v2 ещё нет. Duplicate, raw page create/import через legacy owner, templates и World Package v1 import/export блокируют structured input до projection; future package/template versions блокируются до normalization, template loader не swallowing-fallback'ит эту ошибку. Raw `.md` чтение/codec serialization сохраняют envelope для recovery, но перенос одного файла без definition catalog не считается полным portable export. Page trash сохраняет исходный raw content внутри того же workspace; catalog additive, definitions не удаляются. Asset scanner помечает structured scans incomplete; orphan detection не выдаёт deletion candidates, explicit deletion перепроверяет structured pages/catalog. Typed asset/remap и portable backup/package v2 остаются обязательными последующими задачами, Stage 9 не закрыт.

Исправлен обнаруженный digest edge case в существующем Stage 2 owner: presentation исключается только на schema nodes. `label/order` внутри defaults, resolver options или metadata остаются semantic data; порядок массивов значений не сортируется как definitions. Identity contract и SHA-256 closure format не заменены.

Verification Stage 3: focused 38/38; affected PageRecord/identity/commands/preconditions/structured preservation/Repository/Index/Schema/Registry/catalog/storage/backup/package/assets suites 194/194. Полный quality gate и docs evidence фиксируются в WORK_LOG. Browser/desktop/manual gameplay suites не запускались: shared storage behavior покрыт integration tests, UI/domain и desktop-specific adapter code не переключались.

### 6.2 Реализованный CTV Stage 4 contract

Stage 4 — `DONE / Foundation`: [`universalCardInspector.js`](../../js/ui/cardInspector/universalCardInspector.js) подключает один schema-driven Inspector к штатной правой панели обычной card/editor page. Он получает detached snapshot через Entity API и resolved fields/sections Registry; Field Set `includes` и type-specific branching в UI отсутствуют. Special pages и их Campaign Map/Knowledge Graph inspectors остаются отдельными domain owners. Production catalog по-прежнему пуст: Stage 4 не активирует schemas и не мигрирует legacy pages.

[`inspectorModel.js`](../../js/ui/cardInspector/inspectorModel.js) владеет только ephemeral draft: source page identity, schema digest, data patch, raw invalid input, validation и dirty state. Snapshot остаётся immutable. Lazy defaults, explicit falsy/null, stored/computed/override provenance и bounded visibility читаются через существующий Entity API; reset удаляет explicit stored value/override. UI не materialize defaults и computed results. Invalid input остаётся в draft и блокирует commit, а existing invalid rows/values остаются видимыми.

[`fieldComponentRegistry.js`](../../js/ui/cardInspector/fieldComponentRegistry.js) dispatches по datatype, не по card type. Реализованы generic string/single-line/multiline/formula, number, integer, boolean, enum stable values, date, datetime, color, asset, exact-id reference, object, array и stable-row `array<object>` editors. Object fields строятся рекурсивно; repeatable rows используют schema `rowIdentityKey`, сохраняют identity/order и отправляют Stage 3 row operations. Custom `custom.<uuid>` field проходит тот же registry. Page/content bindings видимы read-only; raw `page.type` conversion и metadata writes через values запрещены.

Reference picker ищет repository pages по пользовательским labels/aliases и фильтрует `targetTypes`, но patch сохраняет только `{pageId}`; missing/wrong-type resolution показывается диагностикой. Computed field показывает effective state/dependencies failure; разрешённый schema override записывается в `overrides`, explicit reset удаляет его. Resolver execution остаётся Stage 3 trusted boundary; D&D calculations не перенесены.

Inspector commit использует только `prepareVariablesChange` → `commitVariablesChange`. Для построения безопасного local draft Stage 3 owner экспортирует pure `applyVariablesPatch`; он не выполняет IO и не становится вторым Store. Отдельный Inspector save допускается только если editor session base совпадает со snapshot и нет pending body autosave. Whole-page stale/schema/workspace/readback guards не ослаблены. Conflict/blocked/uncertain result оставляет draft и canonical runtime неизменными; успешный durable readback обновляет editor base и заново читает Entity snapshot. Silent merge нового variables state со старым body отсутствует.

Source modes `legacy`, `invalid`, `unsupported`, `missing-definition` и `missing` имеют явные read-only states с diagnostics. Inspector не читает Properties и не создаёт envelope для legacy card. Properties, CharacterModel, Combat 17.6, Campaign Map, Inventory, Effects, portability blocks и type conversion workflow не переключались.

Verification Stage 4: focused Inspector/Entity tests, полный unit suite, focused Chromium Inspector scenarios и project gates фиксируются в WORK_LOG. Desktop/Tauri suite не требуется: desktop-specific adapter/storage code не менялся, а общий Browser/Tauri UI path и command boundary проверены browser/integration tests.

## 7. Computed boundary и parity расчётов

Registry связывает schema resolver ids с trusted tested code. Resolver получает frozen typed inputs и injected read-only entity/effect context; не DOM, storage writer, UI, random/clock, network или global mutable state. Declared dependencies образуют DAG; cross-card cycle/depth limit диагностируется. Cache scoped to workspace + page identities + definition/resolver versions + dependency identities; notifications/restore/type/schema changes invalidируют его. Reads не создают events и не materialize defaults/results.

Будущий перенос reuse текущих calculation owners, без переписывания правил в JSON:

| Сейчас | Поздний resolver contract / обязательная parity |
| --- | --- |
| `calculateDndAbilityModifier` | `dnd.abilityModifier@1`: floor((score−10)/2), текущие clamps и explicit overrides. |
| `calculateDndProficiencyBonus` | `dnd.proficiency@1`: текущая level progression; effective level и manual proficiency priority. |
| `createDndChecksCalculation` | `dnd.check@1`: stable skill/save keys, ability + proficiency × 0/1/2; сохранить expertise и overrides. Не приписывать этому коду будущую full effects/check policy. |
| `resolveArmorCalculation` / `calculateDndArmorClass` | `dnd.armorClass@1`: item definition/ref и armorKind/base/dex cap, legacy/manual AC, effects, override precedence. Существующий shield-as-selected-item не превращать в новую equipment систему. |
| initiative / speed | DEX modifier + effect modifier; speed source/effects/speedIsZero; override behavior как baseline. Initiative **modifier** не равен map roll/total. |
| health summary / Character health | HP/max/temp inputs; percentage/down/death save state derived. `applyCharacterHealthChange` остаётся pure mutation policy, **не computed reader**. Никаких HP writes при resolve. |
| cardVariableDependencies | Только проверенная bounded additive grammar и typed resolved refs; legacy title/alias resolution находится в compatibility extraction. Расширение grammar — отдельный contract, не JS. |

Stored `overrides[key]` содержит только explicit manual value; отсутствие = auto. Computed-only key отсутствует в `values`. Если legacy armorClass является base input плюс effects, mapping переносит его в отдельный base-source field с provenance, а не ошибочно в final override. Derived HTML числа не импортируются как overrides без доказательства manual mode. Неясный источник — preview review. Эффективный computed результат никогда не становится вторым persistent source.

## 8. Schema lifecycle и безопасное открытие

| Случай | Semantics |
| --- | --- |
| Новая карточка | Exact activated type version; validate creation defaults. Записать только пользовательские/необходимые explicit inputs, включая явно подтверждённые domain defaults, а не всю resolved schema. |
| Missing value | Lazy default из **pinned** definition version, provenance `default`; read не меняет page. Defaults cloned, не shared mutable object. Required без допустимого default даёт diagnostic, не выдуманное значение. |
| Изменение default/constraints | Новая definition version; старые карточки продолжают old defaults. Upgrade preview показывает также изменение **effective absent defaults**, даже если values patch пуст. Сохранение старого effective value при необходимости materialize явно в плане. |
| v1 → v2 → v3 | Последовательная deterministic chain с declared from/to identities, pre/post validation. Trusted built-in migration functions либо ограниченные data-only операции (rename/move/explicit value mapping); custom script migrations запрещены. Нет пути — upgrade blocked, old version читается. |
| Deprecated field | Читается и сохраняется; hidden/read-only presentation не удаляет данные. Удаление пользователем — отдельная explicit action. |
| Removed/несовместимое поле | Значение переносится, а не копируется в `inactive` вместе с origin definition/key/datatype/reason. Не участвует в domain reads. Возврат — explicit validated restore. |
| Renamed key | Explicit old→new mapping; если target уже имеет иное значение — conflict review, никакого overwrite. Label rename не требует value migration. |
| Unknown fields | Сохраняются losslessly, диагностируются, не читаются gameplay/resolvers до определения. Inactive/unknown payload не «мусор» и не удаляется normalizer-ом. |
| Future envelope/page/schema/resolver | Read-only affected entity, raw content доступен; обычная запись/auto-downgrade запрещена. Missing custom definition не заменяется note/empty schema. |
| Invalid values | Raw retained, diagnostics; доменные действия на invalid dependencies блокируются. Ordinary API patches должны дать валидный результат для touched fields и required domain invariants; known untouched invalid fields не чинятся. Envelope corruption требует recovery, а не обычного patch. |

Сначала publish immutable definition closure в catalog и verify, затем migrate pages по одной. Page никогда не ссылается на ещё не durable definition. Existing operationJournal фиксирует backup id, plan/source/target identities и per-page status. После падения catalog может содержать unused v2: безопасно; старые страницы pin v1. Resume rereads каждый target: source identity → можно повторно планировать, verified target identity/receipt → skip, любое иное состояние → conflict. Journal не переигрывает значения вслепую.

Неудачная миграция не закрывается success; остановить дальнейшие записи, показать выполненные страницы/failed stage/backup id. Rollback — explicit existing recovery с pre-restore safety backup, не автоматическая перезапись потенциально новых правок. Старые и новые pages одновременно открываются через per-page source mode; startup только diagnostics. Backup старой страницы восстанавливает именно старую страницу и её schema dependencies, не запускает importer на reopen.

Compatibility с прежним приложением: PageRecord v2 и catalog version должны давать понятный unsupported/read-only gate в поддерживаемых readers. Нельзя гарантировать защиту от произвольно старого binary, который игнорирует validation. Upgrade UI сообщает minimum compatible application и путь восстановления backup до upgrade; не обещает безопасную редактируемость нового workspace старым приложением. Stage 1/2 не повышали page version. Stage 3 поддерживает structured PageRecord v2; legacy creation/save остаётся v1, без startup upgrade.

## 9. Изменение типа существующей карточки

Будущий explicit `prepareTypeChange` строит preview для нового type/version, metadata и variables в **одном** page candidate. Не использовать текущий dropdown как raw assignment.

Общие поля с одинаковым semantic field owner и совместимой схемой остаются один раз; преобразования — только declared converter. Incompatible/removed values перемещаются в inactive с origin; custom fields остаются card-scoped, при конфликте не затеняют built-in и сохраняются inactive до решения. Unknown/deprecated values сохраняются. Возврат к старому типу предлагает validated restoration, не resurrect автоматически устаревшие значения поверх новых.

Id, title, tags, aliases, parent/order, archive/icon/image, relationships и free blocks сохраняются. Больше нет implicit `tags = ['card', newType]`. Существующие inbound refs остаются по pageId; несовместимые targetTypes диагностируются, не перепривязываются и не удаляются. Consumers после conversion проверяют capabilities и тип reference. Не превращать любую карточку в CharacterModel только из-за похожих keys.

Владелец подтвердил карту legacy-типов в этой задаче 2026-09-24:

| Старый type | Новый type | Дополнительная операция |
| --- | --- | --- |
| `character`, `creature` | `character` / Персонаж | Сохранить gameplay values и overrides; не переводить автоматически в player. |
| `magic` | `spell` / Заклинание | Mapping полей по стабильным legacy keys. |
| `object`, `note` | `item` / Предмет | Записать boolean `item.isObject = true` («Является объектом»). |
| Уже совпадающий id из 15 типов | Тот же id | Versioned field mapping/validation, без смены семантики типа. |
| Неизвестный legacy/custom type | Без автоматической смены | Сохранить raw type/data; explicit preview mapping или регистрация custom type. |

`item.isObject` принадлежит item definition, datatype boolean, default false; explicit true при object/note conversion. Это не новый формальный тип и не UI-specific branch. Если уже существует custom поле с похожим label, не отождествлять его автоматически: сохранить custom identity, показать конфликт при доказанном совпадении key. «Игрок» — отдельный формальный тип игровой сущности. Нового selectable типа «Существо» не возникает; legacy ids остаются только для compatibility. Различия прежних constraints (например creature level до 30 против character до 20) нельзя решать clamping: сохранить исходное значение, показать validation conflict и отложить конкретную карточку либо применить явно одобренное versioned mapping, без потери данных.

## 10. Legacy Properties: extraction и переключение

Порядок: **legacy source → extraction → validation/migration preview → single PageRecord write → durable readback verification → domain consumer activation → retirement active Properties**. Нельзя включить Variable Store reader в gameplay раньше parity и protection gates.

1. Scan только выбранные страницы, PageRecord identities и точные raw blocks. Снять explicit source inventory: все Properties и block types, duplicate keys, custom definitions/values, override markers, legacy DnD, inventory/effects. Normalized PropertiesModel недостаточен: он теряет missing/invalid distinctions, а выбираемый «первый блок» не решение ambiguity.
2. Mapping table versioned по legacy block/type/key, не по русским labels. HP/ability/item keys имеют explicit target semantic keys; compound/group wrappers не values. Preserved proficiency level 0/1/2, missing vs false/0/empty; legacy display calculated values отделяются от base/manual. Custom key collisions получают stable mapping в `custom.<uuid>` с persisted plan mapping, не новый uuid при каждом retry.
3. Typed references: exact id принимается при корректном target type; unique title/alias может быть разрешён только в preview, фиксируя выбранный id. Ambiguous/missing не угадывать. Text не теряется; unresolved value сохраняется в inactive/recovery evidence. Plain description никогда не конвертируется в effects/action formula.
4. Несколько Properties blocks, mismatch page.type/block type, malformed/duplicate controls, unknown executable metadata или конфликт HP sources → blocked per-page review. Можно продолжить независимые валидные страницы, но итог workspace migration остаётся partial. Legacy-only DnD имеет отдельный mapping/validation и не превращается в writable Combat state через defaults.
5. Preview содержит before/after/effective changes, retired fields, source mode, definitions closure, asset/ref changes, exact source identity и backup requirement. Manual override с маркерами переносится; сомнительный auto/manual не решается сравнением числа с текущей формулой. Layout settings не domain values: сохранить как migration evidence в backup, presentation предпочтения переносить только при доказанном соответствии, без скрытого удаления custom content.
6. Перед первой mutation — verified full backup с definition coverage, schemaUpgradeGate и operationJournal. Revalidate source после backup. Write новый envelope и удалить/заменить **только доказанные активные structured source controls** в одном candidate. Сохранить пользовательские заголовки/заметки/непонятый content либо блокировать страницу, если separation недоказуемо. Старый payload не остаётся активным редактируемым block: recovery copy живёт в backup, не во втором постоянном source на карточке.
7. Readback exact durable content → PageRecord decode → typed validation → compare explicit values/override/ref/provenance + Character/calculation parity + unchanged metadata/body fragments. Только затем activate consumers и publish successful migration. Если запись уже durable, а verification не прошла, affected page read-only/incomplete; не читать stale Properties как будто записи не было.
8. Idempotency определяется migration id + page identity/receipt + target schema closure; migrated receipt с changed values не повод повторно extraction. Частично migrated workspace имеет per-page/per-domain source ownership, не глобальный boolean. `domains` не позволяет одному field одновременно читаться из HTML и variables.

Compatibility reader temporary: для отсутствующего envelope — legacy adapters; для корректного migrated domain — только Variables; для invalid/newer envelope — error, **не fallback**. Ещё не перенесённый Inventory/Effects набор может иметь единственный legacy block owner, пока его data не появились в values; переключение набора атомарно по странице. Все writers соответствующего набора должны переключаться вместе: sheet, Map HP, resource transactions, Undo, Inspector, imports/copies. Нельзя dual-write «на всякий случай».

Retirement gate проекта: нет active Properties writes/reads у migrated domains, нет persisted calculated HTML/token mirrors как truth, compatibility только для явных legacy pages/import fixtures; diagnostics показывает оставшиеся страницы и причины. Удаление runtime Properties из приложения и поддержка старых файлов — разные решения; этот этап ничего не удаляет.

## 11. Backup, restore, переносимость и adapters

Front-matter значения сохраняются raw-page backup уже по природе формата, но **этого недостаточно** для custom definitions, assets и portable copies. До первого production Variable Store write обязательны следующие изменения в существующих owners:

| Путь | Будущий обязательный contract |
| --- | --- |
| PageRecord load/save | Page v2 содержит envelope и optional icon/archive metadata; preserve unrelated unknown fields. `parseMarkdown`, runtime projections, autosave/special-save, create/duplicate/template/token-copy сохраняют structured payload явно. No accidental migration on save of legacy card. |
| Workspace catalog | Один catalog file v1 с immutable definitions, aggregate revision/identity, backed-up through backupService. Workspace schema target v2 означает поддержку этого набора; отсутствие catalog в старом workspace — legacy, не повреждение. Наличие migrated refs при missing catalog — blocking diagnostic. Никакого eager upgrade при open. |
| Backup v2 | Расширить **backupService**, не новый сервис: pages/assets + exact catalog snapshot/definition closure manifest entry (safe fixed path, byte length, SHA-256). Built-in activated definitions тоже включены. Новые manifests v2; v1 reader остаётся для старых snapshots. Event sidecar по-прежнему исключён. Validation preflights definition bytes/digests и referenced closure до mutation. |
| Full restore | Existing source validation/preflight/verified pre-restore backup сохраняются. Restore не удаляет новые pages: поэтому definitions импортируются immutable union, не wholesale overwrite текущего catalog, иначе unselected новые pages потеряют свои schemas. Same id/version + другой digest блокирует до writes. Definitions first, pages/assets next; incomplete status и backup id как сейчас, без ложной atomicity. |
| Partial restore | Dependency closure выбранных page/type/extension schemas и referenced assets определяется до safety backup. Добавить недостающие definitions, не менять существующие другие versions и unselected pages. Collision — block, не глобальный downgrade. Legacy v1 без variables валиден; v1 snapshot с migrated refs и отсутствующей closure допускает restore только если exact definitions уже доступны; иначе blocked, raw export доступен. |
| Assets | Existing scanner объединяет HTML references и typed asset values из envelope/metadata; inactive typed assets тоже удерживаются от GC. Unknown/unsupported fields/schema не дают доказательства orphan: destructive cleanup блокируется для неполного scan. Partial restore/package copy используют тот же collector и structured path rewrite, не regex по JSON. |
| World Package v2 | `contents.pages` расширяется canonical page metadata (включая relationships, icon/archive), structured variables отдельно от sanitized `body`; `contents.cardTypes` несёт immutable required definition/field-set closure. Не складывать envelope в body, чтобы пройти старый exporter. Version dispatch обязан отвергать future format **до normalization**, иначе fields потеряются. v1 читается как legacy без выдуманных variables. Export migrated data в v1 блокируется как lossy. |
| Package conflicts | Existing block/skip/copy сохраняются. Preview включает definition identity conflicts. Same id/version/digest dedup; different digest — block либо explicit custom schema fork с новыми ids и полным remap. Page copy remap использует final id table для typed refs, inactive known refs, relations и existing parent behavior; skip не привязывает доменную ссылку по title. External missing refs сохраняются unresolved, не удаляются. Wiki display text не переписывается. Unknown payload, который нельзя безопасно remap, блокирует copy affected page. |
| Templates / duplication | Page duplicate переносит envelope/extensions/overrides/inactive и type pin, меняет только identity/title/parent по existing policy. Templates format v2 хранит variables seed + definition closure references; template creation не переносит migration receipt/source page identity как доказательство новой миграции. Instance row ids уникальны внутри новой карточки; page references не превращаются в ссылки на копию без explicit mapping. |
| Raw `.md` transfer | Значения находятся в файле, но custom definitions не встроены в каждую страницу. Для self-contained обмена использовать Package v2; bare page при missing definition открывается read-only с диагностикой, не loses fields. Нет обещания, что импорт произвольного Markdown уже реализован отдельным generic importer. |
| Browser/Tauri | Общие codecs/validators/commands/limits; workspace-relative catalog/assets/page paths через StorageAdapter; desktop Rust root boundary, browser permission failures. DOM не требуется для новых variables. Старый HTML extractor остаётся isolated compatibility adapter и тестируется отдельно в browser. |

При schema upgrade rollback v2 backup должен восстанавливать и зависимые definitions; pages/assets-only v1 нельзя представлять полноценной защитой нового catalog. Перед первой установкой catalog старому workspace достаточно v1 snapshot исходных данных плюс journal операции; после активации definitions все backup-gated изменения требуют v2 coverage. Restore не replay events. Старые Combat audit resource ids (`page-property` + legacy field key) остаются историей: будущий reversal adapter через versioned key mapping адресует новые variables только при доказанном after-state/max/type/schema. Unsupported history не переписывается и получает понятный запрет Undo.

## 12. Переход доменных потребителей

Целевая зависимость: `Card Type Schema → Card Variables → Variables / Entity API → Domain Systems → Inspector / Combat / Map / other views`. Inspector также прямо читает Entity API для generic fields; он не посредник между доменом и данными.

- **CharacterModel** остаётся нормализованной игровой проекцией только для supported character capabilities; новый source adapter получает typed snapshot, effects/inventory и resolver results. Сохранить public health/AC/speed/initiative/calculations объяснения. Не универсализировать CharacterModel на локации/папки.
- **Combat** retains coordinator, request/hit policy, exact references, RNG ordering, one-page commit/audit/compensating Undo. Health preparation переводится с HTML patch на Variables plan, pure health policy остаётся Character-owned. Map/session/actor/target and explicit HP guards не ослабляются. Missing defaults не становятся Combat-ready HP. Смена source — migration project, новые checks/damage/healing leaves ждут.
- **Map** Character bridge получает Entity-backed Character; direct legacy HP helpers отводятся в compatibility, migrated writes идут domain command. HP не хранится отдельно на каждом token, несколько tokens одной page разделяют HP. Derived snapshots refresh/invalidate при card save/reopen/restore/dependency change; initiative roll/total/manual/current turn и map geometry сохраняют своих owners.
- **Inventory / Effects** domain models и integration provider chain остаются; заменяются sources/writers, а не правила применения/stacking. Existing linked effect source ids/package/rule provenance сохраняются. Никакой новой Effects Engine, expiry, concentration или equipment mechanics в migration scope.
- **Dice/checks** public Dice получает validated numeric inputs и safe grammar от domain API. Dice не читает schema/DOM, не делает variable writes при roll; 17.7 остаётся отдельной последующей задачей.
- **Knowledge Graph/search** PageIndex остаётся identity/metadata/search owner. Entity API отдаёт typed searchable scalar projections и reference edges с provenance; обновление инкрементально. Нельзя индексировать raw JSON как пользовательский текст или копировать derived edges в persistent relationships. Existing explicit links/aliases сохраняют semantics.
- **Compendium / AI retrieval** только будущие consumers explicit snapshots/definitions/provenance и free content через existing page access. Не создаются индекс/агент/сервис/сетевой канал в этом проектном этапе; не получают обход write commands.

## 13. Технический долг, который должен исчезнуть при cutover

Дубли каталогов типов в UI/icons/templates; block.data-card-type как конкурирующее определение типа; first-block selection; DOM-only Properties reader; HTML controls как domain values; persisted calculated display values; manual `override-*` hidden inputs; title/alias domain ref fallback; прямые DOM writers sheet/Map; legacy DnD block creation из Map HP; portable record field dropping; property-HTML-only asset scanning; stale PropertiesModel-v2 narrative. Устранять по owners/наборам, а не массовым рефакторингом.

Существующие расчётные defaults, effect providers, one-field resource rollback и Combat append-failure policy различаются намеренно в текущих contracts. Не «унифицировать» их в ходе data-source migration ценой изменения поведения. Old event records и recovery snapshots — история, а не второй active source.

## 14. Проверки и gates последующих этапов

Наблюдаемая база тестов: `pageRecord`, `pageRepository`, `pageIndex`, `pageCommandService`, `pageWritePreconditions`, `pageWriteConflictBlocking`, `pageStructuredChangePreservation`, `schemaValidation`, `backupManifestValidation`, `backupRestorePreview`, `backupService`, `recoveryEndToEnd`, `worldPackage`, `storageAdapter`, `assetReferenceScanner`, `propertyBlocks`, `cardVariablesModel`, `propertiesCalculationEngine`, `characterModel`, `inventoryModel`, `effectsModel`, `characterIntegrationApi`, `pagePropertyResourceTransaction`, `combatActionModel`, `combatActionEventLog`, `combatSessionRecoveryEvents`, `campaignMapCombatAttackUi` под `tests/`. Реальный HTML extraction/health write/action parity дополнительно покрывают `tests/browser/character-health-mutation.spec.mjs`, `combat-attack-resolution.spec.mjs`, `combat-action-pipeline.spec.mjs`, `combat-attack-undo.spec.mjs`, `combat-attack-workflow.spec.mjs`, `property-blocks.spec.mjs`.

Перед первым новым write implementation gates должны доказать:

1. Round-trip all datatypes, unknown/invalid/future envelope preservation, no DOM, schema digest/version correctness, no metadata duplication, no runtime serialization.
2. Body/variables/type concurrent edits conflict; restored state blocks stale editor; schema change blocks stale plan; workspace switch/failure/readback uncertainty; one target reread/no workspace scan; no variable merge by metadata loophole.
3. Registry composition diamond/cycles/conflicts, pinned old versions/defaults, per-card and shared custom definitions, no executable schema, limits, pure/cyclic computed dependencies и existing calculation parity.
4. Backup v2/full/partial restore required closure, v1 compatibility, definition collision, assets-only-in-variables/inactive, missing catalog, mid-restore failure, unchanged event sidecar.
5. Package v2 export/import, v1 reject-lossy export, copy/skip refs, custom schema closure, unknown data, duplicate/template/token-copy preservation, browser/Tauri adapter parity.
6. Extraction idempotence, partial workspace, explicit overrides vs derived numbers, multiple/malformed blocks, approved character/creature/magic/object/note mapping и unknown-type rejection, durable write/readback failure, crash/resume/rollback, preserved free content.
7. Character/Map/Combat hit/miss/temp-HP/history/reload/Undo parity с accepted 17.6; migrated card has zero legacy HTML reads/writes; dependent armor/effects/schema changes invalidate cached values; stored source absent/invalid never becomes valid HP by defaults.

Исторический CTV Stage 1 проверял documentation routing/status/links и действующие contracts/tests; эти будущие gates здесь **не объявляются выполненными**. Для documentation-only diff достаточно docs:index, relevant contract tests и verify:quick (encoding, syntax, import paths, all unit tests, diff check). Browser/desktop suites не запускаются без production изменения. Подробности фактического запуска фиксируются в handoff commit/task report.

Фактическое evidence CTV Stage 1: docs:index — metadata/status drift 0; agents:validate — 17/17; focused docs/PageRecord/structured-preconditions/schema/backup/WorldPackage tests — 71/71; verify:quick — 872/872, encoding/syntax/import paths/diff PASS. Read-only in-memory probe подтвердил сохранение неизвестного variablesJson при текущем PageRecord update, изменение metadataHash/stateHash при неизменном body contentHash и потерю envelope текущим World Package projection. Проверены 47 локальных ссылок этого документа. Никаких workspace writes или новых production abstractions для probe не создавалось. Browser/desktop и manual UI проверки в CTV Stage 1 не запускались.

## 15. Продуктовые решения и условия завершения

Открытых продуктовых вопросов нет: legacy type mapping и смысл Игрока подтверждены владельцем в разделе 9. Неразрешённые значения конкретных повреждённых/неизвестных карточек — runtime migration review, а не незавершённое проектирование. Каталог полей при реализации подключается в утверждённом объёме, без придумывания замены отсутствующим определениям.

Все определимые по репозиторию базовые boundaries выбраны выше. CTV Stage 1 завершил архитектурный фундамент. CTV Stage 2 реализовал Schema Engine, Registry, Field Set composition и immutable activated-definition catalog foundation. CTV Stage 3 реализовал PageRecord codec, Variable Store/Entity API, resolver и guarded command foundation (6.1). CTV Stage 4 подключил к ним Universal Inspector без product type schemas и legacy migration (6.2). Следующая отдельная задача — CTV Stage 5 `Каталог типов — игровое ядро`. Importer, domain cutover, Effects/Combat behavior, Compendium/AI и удаление Properties runtime этими этапами не начаты.
