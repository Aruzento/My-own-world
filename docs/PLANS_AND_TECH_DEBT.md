# Планы и техдолг

Этот файл теперь является **единым рабочим backlog-планом** проекта. Исторический лог выполненных работ вынесен в `docs/WORK_LOG.md`.

Правила ведения:

- держать здесь один список задач, без параллельных старых планов;
- техдолг не писать отдельной кучей, а превращать в конкретные задачи внутри плана;
- после выполнения менять статус пункта на **сделано** и добавлять короткий результат;
- подробный лог "что сделано / что стало лучше / какие риски остались" добавлять в `docs/WORK_LOG.md`;
- после крупных изменений обновлять `README.md`, `docs/MY_OWN_WORLD_FULL_MANUAL.docx` и релевантные contract-файлы.

## Актуальный Приоритетный План

### 1. Smoke / Regression Tests

- Статус: **сделано, расширять по мере новых систем**.
- Приоритет: **P0**.
- Зачем: тесты защищают проект от повторных поломок при активном рефакторинге.

1.1. Smoke app shell: **сделано**.

1.2. Unit-тесты дерева: drop intent / move planner: **сделано**.

1.3. Unit-тесты карты: model / serializer / store: **сделано**.

1.4. Browser smoke карты save/reload: token, shape, grid, fog, viewport: **сделано**.

1.5. Browser regression удаления токена через дочернюю карточку дерева: **сделано**.

1.6. Browser UI flow карты через кнопку `+`: picker, копии, папки `Существа.Карта` / `Объекты.Карта`: **сделано**.

1.7. Browser smoke presentation sync: **сделано**.

1.8. Browser tests форматирования текста: **сделано**.

1.9. Browser tests task tracker: **сделано**.

1.10. Browser tests шаблонов: **сделано**.

1.11. Добавлять regression tests для каждого нового P0/P1 изменения: **постоянное правило**.

### 2. Tree Pointer-Based DnD

- Статус: **сделано**.
- Приоритет: **P0**.
- Зачем: дерево было источником повторных drag/drop регрессий.

2.1. Pointer DnD вместо HTML5 DnD: **сделано**.

2.2. Preview / placeholder / stable drop intent: **сделано**.

2.3. Тесты расчетов drop intent и move planner: **сделано**.

2.4. Browser regression tests дерева: **сделано**.

2.5. При изменениях дерева расширять сценарии на root, внутрь, выше, ниже и сортировку на одном уровне: **постоянное правило**.

### 3. Campaign Map Data-First Save

- Статус: **сделано, развивать как основу карты**.
- Приоритет: **P0**.
- Зачем: карта должна сохраняться из модели, а не из случайного состояния DOM.

3.1. `CampaignMapModel`: **сделано**.

3.2. `CampaignMapStore`: **сделано**.

3.3. Data-first serializer: **сделано**.

3.4. Drag стартует из store, не из `dataset`: **сделано**.

3.5. Закрытые карты патчатся через model/data-first путь: **сделано**.

3.6. Browser save/reload regression: **сделано**.

3.7. Render adapter `CampaignMapModel -> DOM`: **сделано**.

3.8. Убрать compatibility helpers `commitTokenModelToElement()` / `commitShapeModelToElement()`: **сделано**.

3.9. Игроки на карте без дубля в дереве через `sourceMode="original"`: **сделано**.

### 4. Editor History Contract

- Статус: **сделано, нужны новые regression tests при расширении редактора**.
- Приоритет: **P0**.
- Зачем: Ctrl+Z, paste, formatting и structural actions должны идти через управляемую историю.

4.1. Описать единый контракт истории: **сделано**.

4.2. Ctrl+Z / Ctrl+Y через управляемую историю: **сделано**.

4.3. Вставка текста как history action: **сделано**.

4.4. Форматирование как history action: **сделано**.

4.5. Блоки / таблицы / wiki-links как structural actions: **сделано**.

4.6. Добавлять regression tests для новых editor actions: **постоянное правило**.

### 5. FormattingService

- Статус: **архитектурно сделано, deprecated fallback остается техдолгом**.
- Приоритет: **P0/P1**.
- Зачем: редактор не должен напрямую зависеть от `document.execCommand()`.

5.1. Изолировать `execCommand` как fallback: **сделано**.

5.2. Описать правила форматирования: **сделано**.

5.3. Убрать прямую зависимость toolbar от deprecated API: **сделано**.

5.4. Заменить deprecated fallback собственной реализацией для основных операций: **не сделано**.

5.5. Добавить дополнительные browser regression для mixed selection, headings, lists, colors, reset format: **не сделано**.

### 6. PageRepository / PageIndex

- Статус: **в работе**.
- Приоритет: **P0**.
- Зачем: это главный слой данных, который должен заменить хаотичные lookup по `state.pages`.

6.1. Спроектировать `PageRepository`: **сделано**.
Определить ответственность, описать public API, запретить хаотичные lookup по `state.pages` в новом коде.

6.2. Создать `PageIndex`: **сделано**.
Индексы: по `id`, `title`, `aliases`, `parent`, `type`, `tags`.

6.3. Сделать lifecycle индекса: **сделано**.
Добавлен runtime `PageRepository`, который подписывается на `setPages`, пересобирает `PageIndex` после загрузки и явно обновляется после create, rename, move, delete, alias/tag/type change. На первом этапе update-операции безопасно идут через полный rebuild.

6.4. Перевести wiki-links на `PageIndex`: **сделано**.
`wikiLinkLookup`, refresh существующих wiki-links, hover preview и popup "связать с существующей" переведены на `PageRepository / PageIndex`.

6.5. Перевести поиск на `PageIndex`: **сделано**.
Sidebar search берет страницы через `PageRepository`, а логика поиска вынесена в `searchPages()` и покрыта unit-тестом.

6.6. Перевести проверку дублей на `PageIndex`: **сделано**.
`pageTitleValidation` использует `getPagesByTitle()` и `findDuplicateTitles()` из `PageRepository`.

6.7. Перевести campaign map picker/player lookup на `PageIndex`: **сделано**.
Picker карты, player lookup, external drop из дерева, действия токенов и bucket lookup переведены на `PageRepository`.

6.8. Перевести шаблоны и будущий graph lookup на `PageIndex`: **сделано**.
Создание задач по трекеру, сохранение страниц по шаблону и backlinks/future graph references используют repository API.

6.9. Добавить unit/browser regression для `PageIndex`: **сделано, расширять по мере новых систем**.
Unit-тесты базового `PageIndex`, lifecycle `PageRepository`, wiki-link lookup, sidebar search и duplicate title validation добавлены. Browser regression уже покрывают карту, task tracker, шаблоны, дерево и редактор.

### 7. Safe HTML Boundary / Sanitizer

- Статус: **в работе**.
- Приоритет: **P0**.
- Зачем: это главный security blocker перед web/cloud и защита local workspace от мусора в HTML.

7.1. Описать `SAFE_HTML_CONTRACT.md`: **сделано**.
Описано, что можно сохранять, что нельзя сохранять, что является runtime UI и что является persistent content.

7.2. Составить allowlist HTML: **сделано**.
Allowlist составлен для text blocks, headings, links, wiki-links, card shell, block types, tables, images, campaign map shell, task tracker shell, popup/toolbar runtime.

7.3. Реализовать sanitizer на save: **сделано**.
Добавлен `safeHtmlSanitizer.js`; autosave, сохранение карты/таск-трекера, block serializer и создание по шаблону прогоняют persistent HTML через sanitizer.

7.4. Реализовать sanitizer на load/open: **сделано**.
Открытие карточки очищает HTML перед вставкой в editor и затем восстанавливает runtime UI штатными render/setup функциями.

7.5. Реализовать paste sanitization: **сделано**.
Paste в редактор и таблицы использует plain text sanitizer: формат внешнего источника не переносится, control chars удаляются.

7.6. Добавить security regression tests: **сделано, расширять при усилении sanitizer**.
Добавлены browser regression на forbidden tags, task tracker JSON exception, unsafe attributes, dangerous URLs, malformed HTML, runtime controls leakage, map toolbar leakage и task tracker runtime board leakage.

### 8. CI На GitHub Actions

- Статус: **сделано на уровне процесса**.
- Приоритет: **P0**.
- Зачем: локальные проверки уже есть, но они должны стать обязательным защитным контуром.

8.1. Добавить `.github/workflows/verify.yml`: **сделано**.
Workflow `Verify` запускается на push в `main` и pull request.

8.2. Запускать `npm ci`: **сделано**.
CI устанавливает зависимости строго по `package-lock.json`.

8.3. Запускать `npm run verify`: **сделано**.
Workflow запускает базовую проверку синтаксиса, unit tests, `git diff --check` и проверку docx.
Для проверки docx workflow явно ставит Python 3.12 через `actions/setup-python@v5`, потому что `tools/run_checks.mjs` вызывает `python -m zipfile -t`.

8.4. Запускать browser tests: **сделано**.
CI устанавливает Chromium через `npx playwright install --with-deps chromium` и запускает `npm run test:browser`.

8.5. Добавить artifact/logs при падении Playwright: **сделано**.
При падении workflow сохраняет `playwright-report/`, `test-results/` и `debug.log` как artifact `browser-smoke-artifacts`.

8.6. Зафиксировать правило: перед merge/push зеленый CI обязателен: **сделано**.
Правило добавлено в README: локальные проверки ускоряют обратную связь, но не заменяют зеленый GitHub Actions.

8.7. Проверять регистр import-путей для Linux CI: **сделано**.
Добавлен `tools/check_import_paths.mjs`, который входит в `npm run verify` и ловит ситуацию, когда Windows открывает файл из-за case-insensitive FS, а GitHub Actions на Ubuntu получает 404.

### 9. Asset Lifecycle Contract

- Статус: **сделано, расширять при развитии assets**.
- Приоритет: **P1**.
- Зачем: картинки уже активно используются, а новая идея про музыку локаций добавляет audio/playlist assets.

9.1. Описать `ASSET_LIFECYCLE_CONTRACT.md`: **сделано**.
Контракт создан в `docs/ASSET_LIFECYCLE_CONTRACT.md`: описывает цели, правила сохранения/загрузки, `AssetReference`, broken assets и orphan assets.

9.2. Определить типы assets: **сделано**.
`image`, `portrait`, `map background`, `audio`, `playlist`, future media.
Дополнительно зафиксирован отдельный тип `mapObjectPng` для PNG-объектов карты с прозрачным фоном.

9.3. Ввести единый `AssetReference`: **сделано**.
Добавлен `js/storage/assetReference.js` с `ASSET_TYPES`, `createAssetReference()`, `normalizeAssetReference()` и helper-функциями нормализации. Добавлены unit tests в `tests/assetReference.test.mjs`.
`id/path`, `type`, `owner`, `fallback`, `missing state`.

9.4. Сделать broken asset checker: **сделано**.
Добавлен `js/storage/assetBrokenChecker.js`: он сравнивает persistent-ссылки страниц со списком файлов assets и возвращает отсутствующие ссылки с `missing: true`.

9.5. Сделать orphan asset detection: **сделано**.
Добавлен `js/storage/assetOrphanDetector.js`: он возвращает список файлов-кандидатов, на которые нет persistent-ссылок. Удаление не выполняется автоматически.

9.6. Подготовить основу под музыку локаций из workspace: **сделано**.
В `ASSET_LIFECYCLE_CONTRACT.md`, `ASSET_TYPES` и `assetReferenceScanner` зафиксированы `audio`, `playlist`, `data-audio-asset` и `data-playlist-asset`.

9.7. Добавить asset tests: **сделано**.
Добавлены tests для `AssetReference`, сканера persistent-ссылок, broken asset checker и orphan asset detection.

### 10. Performance Strategy Для Карты

- Статус: **не сделано**.
- Приоритет: **P1**.
- Зачем: карта уже является тяжелой runtime-системой, оптимизации должны стать измеримыми.

10.1. Описать performance risks карты: **сделано**.
Много токенов, много фигур, большой background, fog, presentation sync, zoom/pan.
Риски описаны в `docs/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md`.

10.2. Ввести performance scenarios: **сделано**.
В strategy-документ добавлены сценарии `small-map-baseline`, `large-map-drag`, `fog-paint-large`, `presentation-live-sync`, `zoom-pan-heavy`.

10.3. Добавить измерения: **сделано**.
Render time, sync time, number of visible objects, background load.
Добавлен `js/editor/campaignMapPerformance.js` с performance snapshot: render/sync/fullSync/background time, visible/hidden token/shape count, fog canvas pixels, zoom.

10.4. Ввести performance budgets: **сделано**.
Введены стартовые budgets в `CAMPAIGN_MAP_PERFORMANCE_BUDGETS` и документе стратегии.

10.5. Оптимизировать presentation full-sync: **сделано частично**.
`syncPresentation()` больше не вызывает `refreshCampaignMapStore()` на каждый full-sync и использует уже существующий data-first store/model через `getCampaignMapStore()`. Это убирает лишнее чтение модели из DOM во время синхронизации презентации. Дальше нужно измерить эффект в browser performance smoke.

10.6. Добавить performance regression smoke: **сделано**.
Добавлен browser smoke `tests/browser/campaign-map-performance.spec.mjs`: он создает сцену на 120 токенов и 40 фигур, проверяет full-sync презентации, item-level sync и мягкие performance budgets.

### 11. Release Process / Changelog

- Статус: **не сделано**.
- Приоритет: **P1**.
- Зачем: версии уже используются в коммитах, но релизный процесс не формализован.

11.1. Создать `CHANGELOG.md`: **сделано**.
Файл создан, добавлен раздел `Unreleased` и шаблон release notes.

11.2. Описать release checklist: **сделано**.
Checklist описан в `docs/RELEASE_PROCESS.md`.

11.3. Согласовать `package.json` version с git tags: **сделано на уровне правила**.
В `docs/RELEASE_PROCESS.md` зафиксировано: при формальном релизном цикле `package.json.version`, git tag `vX.Y.Z` и раздел changelog должны совпадать.

11.4. Ввести правило версий: **сделано**.
`patch`, `minor`, `major`, `experimental`.
Правила описаны в `docs/RELEASE_PROCESS.md`.

11.5. Добавить rollback guide: **сделано**.
Rollback guide добавлен в `docs/RELEASE_PROCESS.md`.

11.6. Добавить release notes template: **сделано**.
Шаблон добавлен в `CHANGELOG.md` и `docs/RELEASE_PROCESS.md`.

### 12. Campaign Map Initiative

- Статус: **не сделано**.
- Приоритет: **P1**.
- Зачем: важная игровая фича, но строить ее нужно на `PageIndex` и текущем map model.

12.1. Спроектировать `InitiativeModel`: **сделано на уровне модели**.
Добавлен `js/editor/campaignMapInitiativeModel.js`.

12.2. Подключить живые токены карты: **сделано на уровне модели**.
`CampaignMapInitiativeModel.fromTokens()` собирает участников из живых токенов и по умолчанию исключает токены с `hp <= 0`.

12.3. Учесть `sourceMode="original"` для игроков: **сделано на уровне модели**.
`createParticipantFromToken()` сохраняет `sourceMode`, чтобы будущий UI мог отличать игроков, привязанных к оригинальной карточке.

12.4. Сделать popup выбора участников: **сделано MVP**.
Добавлен `js/editor/campaignMapInitiativePopup.js`, кнопка `Иниц.` в toolbar карты и popup выбора существ с действиями `Применить`, `Roll d20`, `Закрыть`.
Popup доработан: показывает результаты бросков, формулу `d20 + modifier`, активный ход и переключение предыдущий/следующий участник.

12.5. Добавить `roll d20`: **сделано на уровне модели**.
Добавлены `rollD20()`, `rollParticipant()` и `rollAll()`.

12.6. Добавить initiative modifier: **сделано на уровне модели**.
Участник хранит `modifier`, а `total = roll + modifier`.
Токен карты хранит `initiativeModifier`, значение сохраняется в persistent HTML через `data-initiative-modifier`.

12.7. Сделать сортировку порядка: **сделано на уровне модели**.
`sortByInitiative()` сортирует по total, modifier и имени.

12.8. Сделать active turn / next / previous: **сделано на уровне модели**.
Добавлены `setActive()`, `nextTurn()` и `previousTurn()`.

12.9. Сохранение/восстановление инициативы: **сделано**.
`CampaignMapModel` хранит `initiative`, пишет состояние в `data-initiative-state`, восстанавливает его из HTML и сериализует через data-first save.

12.10. Browser regression initiative: **сделано**.
Добавлен `tests/browser/campaign-map-initiative.spec.mjs`.

### 13. Campaign Map Layers

- Статус: **в работе**.
- Приоритет: **P1**.
- Зачем: слои нужны перед массовым select и сложными fog/object сценариями.

13.1. Спроектировать `LayerModel`: **сделано**.
Добавлен `js/editor/campaignMapLayerModel.js`: базовые слои `Объекты`, `Существа`, `Фигуры`, нормализация, назначение default layer и z-index.

13.2. Ввести z-order для token/shape/object: **сделано на уровне модели и render adapter**.
`CampaignMapModel` хранит `layers`, `layerId` и `zIndex` у токенов/фигур; serializer пишет `data-layer-state`, `data-layer-id`, `data-z-index`, render adapter применяет `style.zIndex`.

13.3. UI управления слоями: **сделано MVP**.
В toolbar карты добавлена кнопка `Слои`; popup показывает базовые слои, переключатель видимости и кнопки поднять/опустить слой.

13.4. Visibility per layer/object: **сделано на уровне слоя**.
Видимость слоя хранится в `layers.visible` и применяется к токенам/фигурам через `data-layer-hidden`. Видимость отдельного объекта остается будущим расширением.

13.5. Serializer/restore layers: **сделано**.
Состояние слоев сохраняется в `data-layer-state`, восстанавливается в `CampaignMapModel` и применяется при render карты.

13.6. Browser regression layers: **сделано**.
Добавлен browser regression `campaign-map-layers-control-visibility-and-z-order`.

### 14. Разрез Крупных Файлов

- Статус: **сделано на текущий крупный JS-срез, продолжать точечно при росте файлов**.
- Приоритет: **P1**.
- Зачем: крупные файлы повышают риск регрессий и мешают человеку понимать проект.

14.1. Разрезать `campaignMap.js`: **сделано частично / сильно продвинулось**.
Результат: основная карта уже разнесена по model/store/render/pointer/token/shape/fog/toolbar/presentation/layers/initiative подсистемам. Оставшийся долг — не добавлять новые большие сценарии обратно в главный файл.

14.2. Разрезать `editor.js`: **сделано**.
Результат: `editor.js` стал фасадом setup/open/save, а логика вынесена в `editorOpenPage.js`, `editorSpecialSave.js`, `editorEmptyPage.js`, `editorNavigation.js`, `editorPastePlainText.js`, `editorWikiLinkNormalization.js`, `editorLinksRuntime.js`, `editorAssetSanitizer.js`, `editorDom.js`.

14.3. Разрезать `toolbar.js`: **сделано**.
Результат: геометрия toolbar вынесена в `toolbarPosition.js`, активные состояния — в `toolbarActiveState.js`, память и применение цветов — в `toolbarTextColor.js`. `toolbar.js` остался контроллером событий.

14.4. Разрезать `blockContract.js`: **сделано**.
Результат: runtime selectors, runtime marking, table contract, selective upgrades, runtime controls и serializer вынесены в `js/editor/blocks/blockRuntimeSelectors.js`, `blockRuntime.js`, `blockTableContract.js`, `blockUpgrades.js`, `blockRuntimeControls.js`, `blockSerializer.js`. `blockContract.js` остался фасадом контракта блоков.

14.5. Разрезать `campaignMapPresentation.js`: **сделано**.
Результат: CSS презентации вынесен в `campaignMapPresentationStyle.js`, синхронизация отдельных token/shape — в `campaignMapPresentationItemSync.js`; главный файл отвечает за окно презентации, full-sync, viewport и fog cache.

14.6. Разрезать `tables.js`: **сделано**.
Результат: логика таблиц разделена на `tableCells.js`, `tableColumns.js`, `tableResize.js`, `tableSelectionState.js`, `tableToolbar.js`, `tableConstants.js`, `tableRows.js`, `tableClipboard.js`. `tables.js` остался точкой подключения событий.

14.7. После каждого разреза запускать full regression: **постоянное правило**.

### 15. Tables Contract И Укрепление Таблиц

- Статус: **сделано, расширять при развитии таблиц**.
- Приоритет: **P1/P2**.
- Зачем: таблицы стали сложной подсистемой с resize, selection, toolbar, paste и keyboard behavior.

15.1. Описать `TABLES_CONTRACT.md`: **сделано**.
Результат: добавлен `docs/TABLES_CONTRACT.md` с правилами persistent HTML, runtime UI, resize, selection, paste, keyboard navigation и save/load boundary.

15.2. Зафиксировать model/persistent/runtime правила таблиц: **сделано**.
Результат: зафиксировано, что сохраняются структура таблицы, содержимое ячеек, `colgroup`, ширины колонок и выравнивание; runtime toolbar, selection state и resize state не сохраняются.

15.3. Добавить tests для resize столбцов: **сделано**.
Результат: `tests/browser/tables.spec.mjs` проверяет изменение только выбранной колонки, неизменность соседней и пересчет общей ширины таблицы.

15.4. Добавить tests для выделения ячеек: **сделано**.
Результат: browser regression проверяет диапазон 2x2, нормализацию координат и DOM-классы выделенных ячеек.

15.5. Добавить tests для paste/plain text и keyboard navigation: **сделано**.
Результат: browser regression проверяет вставку `A/B/C/D` из tab/newline plain text и Enter-переход с созданием новой строки.

15.6. Разнести `js/ui/tables.js` на подсистемы: **сделано в рамках 14.6**.

### 16. UX / Onboarding Layer

- Статус: **сделано на базовом уровне, расширять по мере UX-исследований**.
- Приоритет: **P2**.
- Зачем: продукт становится мощным, но новому пользователю нужна входная траектория.

16.1. Создать sample workspace: **сделано**.
Результат: добавлен `docs/sample-workspace` со стартовой карточкой, учебной картой, учебным task tracker и пустой папкой assets.

16.2. Сделать стартовый tutorial: **сделано**.
Результат: верхний popup `Инструменты -> Быстрый старт` объясняет workspace, первую сущность, дерево и wiki-links.

16.3. Добавить "как устроен продукт" внутри приложения: **сделано**.
Результат: popup `Инструменты -> Как устроено` объясняет карточки, карту кампании, task tracker и runtime UI.

16.4. Добавить onboarding для карточек, дерева, wiki-links, карты, task tracker: **сделано базово**.
Результат: основные системы описаны в `docs/UX_ONBOARDING_CHECKLIST.md` и частично во встроенной справке.

16.5. Добавить UX checklist: **сделано**.
Результат: добавлен `docs/UX_ONBOARDING_CHECKLIST.md`, а краткий checklist доступен из popup `Инструменты`.

### 17. Workspace Templates

- Статус: **сделано, расширять при развитии шаблонов**.
- Приоритет: **P2**.
- Зачем: шаблоны должны жить вместе с миром, а не только в браузере.

17.1. Перенести templates из `localStorage` в workspace-файл: **сделано**.
Результат: шаблоны сохраняются в `.my-own-world-templates.json` в корне workspace.

17.2. Сделать template serializer: **сделано**.
Результат: добавлены `serializePageTemplates()` и `parsePageTemplatesFile()` в `js/templates/pageTemplateStorage.js`.

17.3. Сделать migration старых templates: **сделано**.
Результат: при первом `loadPageTemplates()` старые записи `localStorage` переносятся в workspace-файл.

17.4. Добавить поиск по шаблонам: **сделано**.
Результат: popup создания по шаблону получил строку поиска, а storage слой - `searchPageTemplates()`.

17.5. Добавить browser tests: **сделано**.
Результат: `tests/browser/page-templates.spec.mjs` проверяет workspace storage, migration, search, создание и удаление шаблона.

### 18. Knowledge Graph

- Статус: **сделано как foundation, graph view позже**.
- Приоритет: **P2**.
- Зачем: wiki-links и backlinks уже есть, но мир пока больше tree-first, чем graph-first.

18.1. Описать graph model: **сделано**.
Результат: добавлен `docs/KNOWLEDGE_GRAPH_MODEL.md`.

18.2. Добавить typed relationships: **сделано базово**.
Результат: `js/wiki/knowledgeGraph.js` строит `treeParent` и `wikiLink` relationships.

18.3. Добавить orphan pages view: **сделано на model-уровне**.
Результат: добавлен `getOrphanGraphPages()`. UI-view остается будущей UX-задачей.

18.4. Добавить backlinks improvements: **сделано как контракт**.
Результат: в `KNOWLEDGE_GRAPH_MODEL.md` описан переход backlinks к graph-backed типам связей.

18.5. Позже — graph view: **отложено осознанно**.
Результат: graph view оставлен будущей задачей после стабилизации graph model и UX.

### 19. AI Onboarding Guide

- Статус: **сделано, поддерживать при архитектурных изменениях**.
- Приоритет: **P2**.
- Зачем: проект активно развивается через AI, поэтому входной документ снизит риск потери контекста.

19.1. Создать `AI_ONBOARDING.md`: **сделано**.

19.2. Кратко описать архитектуру: **сделано**.

19.3. Описать "что нельзя ломать": **сделано**.

19.4. Описать обязательные проверки перед изменениями: **сделано**.

19.5. Описать формат задач для Codex: **сделано**.

### 20. Desktop Adapter Plan

- Статус: **сделано как план, prototype позже**.
- Приоритет: **P2**.
- Зачем: desktop естественно подходит local-first продукту, но сначала нужен план адаптеров.

20.1. Описать desktop target: **сделано**.

20.2. Выбрать Tauri/Electron для spike: **сделано**.
Результат: первым spike выбран Tauri, Electron оставлен fallback.

20.3. Спроектировать `StorageAdapter`: **сделано**.

20.4. Спроектировать `AssetAdapter`: **сделано**.

20.5. Сделать desktop smoke checklist: **сделано**.

20.6. Позже — prototype: **отложено осознанно**.
Результат: prototype не начинается до выделения browser implementations `StorageAdapter` и `AssetAdapter`.

### 21. CSS Separation

- Статус: **сделано на первом крупном срезе, расширять при росте UI**.
- Приоритет: **P2**.
- Зачем: CSS уже разросся, но лучше резать после стабилизации core-архитектуры.

21.1. Разрезать `campaign-map.css`: **сделано**.
Результат: файл стал entrypoint с imports в `campaign-map-layout.css`, `campaign-map-initiative.css`, `campaign-map-stage.css`, `campaign-map-tokens.css`, `campaign-map-shapes.css`, `campaign-map-token-popup.css`, `campaign-map-popups.css`, `campaign-map-responsive.css`.

21.2. Разрезать `popup.css`: **сделано**.
Результат: файл стал entrypoint с imports в `popup-create.css`, `popup-link.css`, `popup-wiki.css`, `popup-block.css`, `popup-item-picker.css`, `popup-confirm-profile.css`, `popup-block-type.css`, `popup-image-crop.css`.

21.3. Разрезать `block-special.css`: **сделано**.
Результат: файл стал entrypoint с imports в `block-items-inline.css`, `block-character-stats.css`, `block-dnd-stats-legacy.css`, `block-dnd-stats.css`.

21.4. Ввести CSS ownership comments: **сделано**.
Результат: новые CSS-файлы получили ownership-комментарии, entrypoint-файлы описывают, куда добавлять новые стили.

21.5. Проверить visual regression: **сделано базово**.
Результат: `npm run test:browser` прошел после разреза CSS. Отдельного screenshot visual regression пока нет.

### 22. Campaign Map UX-Доработки

- Статус: **сделано базово, расширять по обратной связи**.
- Приоритет: **P2/P3**.
- Зачем: полезные UX-фичи карты, которые должны идти после слоев, assets и performance strategy.

22.1. Mass select: **сделано**.
Результат: `Shift`/`Ctrl`/`Cmd`-клик по токенам и фигурам добавляет или убирает их из текущего выделения без сброса соседних выбранных сущностей.

22.2. Context menu "открыть изображение": **сделано**.
Результат: контекстное меню токена умеет открывать popup-превью изображения существа или объекта.

22.3. Hidden hero visibility icon: **сделано**.
Результат: скрытые на презентации токены остаются видимыми мастеру на карте и получают отдельный бейдж "скрыт".

22.4. Square fog brush: **сделано**.
Результат: popup тумана поддерживает форму кисти `Круг` / `Квадрат`, выбор сохраняется в данных карты.

22.5. Locked fog zones: **сделано как MVP**.
Результат: на карте можно добавить locked fog zone. Кисть тумана не стирает такие зоны, а сама зона удаляется отдельным кликом. Следующее развитие: ручное изменение размера и формы locked-зоны.

### 23. Properties Model / Character Calculations

- Статус: **переформулировано под новые блоки `Свойства`**.
- Приоритет: **P3**.
- Зачем: DnD v2 и блок переменных были полезным экспериментом, но текущий практичный путь — развивать type-aware блоки `Свойства` и поверх них строить будущий расчет персонажа.

23.1. Описать `PropertiesModel`: **не сделано**.
Результат должен определить, как читать значения из блоков `Свойства` без прямой зависимости расчетов от DOM-разметки.

23.2. Спроектировать calculation layer отдельно от HTML: **не сделано**.
Результат должен заменить идею сырого блока переменных на слой расчетов, который умеет брать данные из `Свойства`, legacy `Стат. блок DnD` и будущих моделей персонажа.

23.3. Адаптировать `Стат. блок DnD` к Properties/Character расчетам: **не сделано**.
Результат должен сохранить старые карточки, но дать новому коду единый способ получить хиты, КЗ, характеристики и модификаторы.

23.4. Добавить schemas для новых типов `Свойства`: **не сделано**.
Результат: `creature`, `object`, `location` и другие типы получают расширяемые схемы свойств без копирования HTML вручную.

23.5. Сделать migration path для старых экспериментов `DnD v2` / `Переменные`: **отложено осознанно**.
Результат: не возвращать архивные блоки в UI, пока нет отдельного model-first расчетного слоя.

### 24. Documentation Maintenance

- Статус: **постоянная задача**.
- Приоритет: **P1**.
- Зачем: проект должен оставаться понятным человеку и следующей AI-сессии.

24.1. Обновлять `README.md` после архитектурных изменений: **постоянное правило**.

24.2. Обновлять `docs/MY_OWN_WORLD_FULL_MANUAL.docx` после изменения функций: **постоянное правило**.

24.3. Обновлять contract-файлы при изменении правил подсистем: **постоянное правило**.

24.4. Поддерживать `docs/WORK_LOG.md` как исторический журнал: **постоянное правило**.

## Текущий Следующий Шаг

Следующий рекомендуемый пункт: **23. Properties Model / Character Calculations**.

Причина: пункт 22 закрыт как базовый UX-срез карты. Следующий первый несделанный крупный пункт - адаптировать будущую модель персонажа и расчеты под новые type-aware блоки `Свойства`.
