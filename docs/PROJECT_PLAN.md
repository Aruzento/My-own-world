# Единый план проекта

Дата обновления: 01.06.2026

Этот файл является единственным актуальным источником плана работ, техдолга и развития технической зрелости проекта. Старые плановые документы перенесены в `docs/archive/` и больше не обновляются.

## Правила Ведения

- В проекте должен быть один живой план: `docs/PROJECT_PLAN.md`.
- `docs/WORK_LOG.md` хранит историю выполненных работ, решения и подробные заметки.
- Техдолг записывается не отдельной кучей, а как конкретные задачи внутри плана.
- Частично сделанная задача остается в плане до полного закрытия. Если часть работы уже выполнена, это пишется в статусе подпункта.
- Если задачу пока рано делать, но она важна, она остается в будущем плане с причиной отложенности.
- После крупных изменений обновляются `README.md`, `docs/MY_OWN_WORLD_FULL_MANUAL.docx`, релевантные contract-файлы и этот план.
- В ответах пользователю указывать номер текущего пункта плана, чтобы было понятно, где мы находимся.

## Текущая Картина

- Текущая оценка зрелости: **4.1 / 5**.
- Последняя полная оценка: `Тех. зрелость/01.06.2026 - оценка после пункта 6.md`.
- Цель ближайшего этапа: поднять проект к **4.2 / 5** через надежность данных, backup/recovery, performance gate карты и визуальные regression checks.
- Бриф `MY_OWN_WORLD_AI_ARCHITECTURE_RISK_BRIEF_01_06_2026_UPDATED.docx` подтвердил главный порядок рисков: schema validation, backup/recovery, performance gate, visual regression, popup lifecycle.

## Приоритеты Сейчас

1. **Schema Validation / Recovery Layer** - главный слой защиты данных.
2. **Backup / Restore** - защита перед любым recovery и рискованными операциями.
3. **Campaign Map Performance Gate** - карта уже тяжелая, лаги надо ловить тестами и метриками.
4. **Visual Regression / UX Safety** - базовый слой сделан, расширять при новых UI-регрессиях.
5. **Popup Lifecycle Standardization** - следующий рабочий фокус: popup-система разрослась и требует единого жизненного цикла.
6. **Properties Model / Character Calculations** - первый крупный продуктовый слой после стабилизации данных и popup lifecycle.

## План Работ

### 1. Schema Validation / Recovery Layer

Статус: **частично сделано**.
Приоритет: **P0**.
Зачем: данные workspace должны проверяться явно, без молчаливой порчи и догадок.

1.1. Описать `WORKSPACE_SCHEMA_CONTRACT.md`: **сделано**.

1.2. Ввести версии схем для page metadata, campaign map data, task tracker data, template data и asset references: **сделано базово**.
Сделан первый слой для page, campaign map, task tracker, template data и asset references. В план остается расширение версий под будущие schema upgrades.

1.3. Сделать валидаторы с понятными ошибками: **сделано базово**.
Есть чистые валидаторы для workspace/page, campaign map, task tracker, templates, asset references и JSON helper. Нужно расширять их при новых storage-форматах.

1.4. Добавить recovery screen или fallback для поврежденных страниц: **сделано базово**.
Добавлен `WorkspaceRecoveryReport` и fallback-экран editor при критичных ошибках workspace. В план остаются безопасные repair-actions.

1.5. Добавить tests: invalid JSON, missing id, broken parent, duplicated title, broken map token, broken task data: **сделано базово**.
Добавлены проверки templates, asset references и recovery report. Нужны browser/storage tests для recovery UI.

1.6. Подключить validation к загрузке workspace в warning-only режиме: **сделано**.

1.7. Добавить validation gate перед будущими schema upgrades: **сделано базово**.
Добавлен `schemaUpgradeGate`: будущие upgrade-операции должны запускаться только после успешной validation и при наличии manifest резервной копии. При критичных ошибках gate блокирует upgrade.

1.8. Добавить browser/storage tests для recovery fallback, templates/assets validation и будущих repair-actions: **сделано базово**.
Добавлен browser smoke для recovery fallback и unit/storage coverage для templates/assets validation. Когда появятся настоящие repair-actions, сюда нужно добавить отдельные сценарии на каждое действие.

### 2. Backup / Restore

Статус: **частично сделано**.
Приоритет: **P0**.
Зачем: recovery нельзя включать без возможности безопасно откатиться к snapshot.

2.1. Описать `BACKUP_AND_RECOVERY_CONTRACT.md`: **сделано**.

2.2. Добавить ручную команду "Создать резервную копию workspace": **сделано**.
Команда находится в popup настроек.

2.3. Добавить автоматический lightweight snapshot перед рискованными операциями: **частично сделано**.
Snapshot подключен перед удалением ветки страниц и переносом страниц в дереве. В план остаются import, schema upgrade, bulk operations и потенциальные asset operations.

2.4. Добавить restore flow: **частично сделано**.
Есть осторожный restore helper, UI-список backup и безопасный restore dialog. В план остаются browser/storage regression и восстановление assets.

2.5. Добавить tests на восстановление карты, карточки и таск-трекера: **сделано базово**.
Покрыты manifest/id, backup/restore карточки, карты и task tracker через storage-level in-memory workspace. Browser UI restore уже есть как smoke-слой настроек; при расширении restore UI добавлять отдельные browser-сценарии.

2.6. Добавить backup assets по `AssetReference`: **сделано базово**.
Backup собирает persistent asset references из страниц, копирует файлы из `assets/` в snapshot и восстанавливает их обратно. Нужен будущий hardening для больших файлов, audio/playlist и missing/fallback policy.

2.7. Добавить политику очистки старых backup: **сделано базово**.
Добавлена retention-политика: по умолчанию сохраняется 20 последних backup, старые точки удаляются через `cleanupWorkspaceBackups()`. Нужен будущий UI для настройки лимита и ручной очистки.

### 3. Campaign Map Performance Gate

Статус: **сделано базово, требуется дальнейшее stress-усиление**.
Приоритет: **P1**.
Зачем: карта является самой тяжелой runtime-системой проекта.

3.1. Описать performance risks карты: **сделано**.

3.2. Ввести performance scenarios: **сделано**.

3.3. Добавить измерения render time, sync time, number of visible objects, background load: **сделано**.

3.4. Ввести performance budgets: **сделано**.
Budgets вынесены в scenario-based contract: small map, large drag, fog paint, presentation live sync, zoom/pan heavy. Добавлен `assertCampaignMapPerformanceBudget()`, чтобы тесты могли падать при превышении.

3.5. Оптимизировать presentation full-sync: **сделано базово**.
Убрано лишнее чтение модели из DOM во время sync, live-sync идет item-level по id, несколько item updates в одном кадре батчатся по карте, а missing item вызывает один fallback full-sync вместо серии full repaint. Performance smoke проверяет bounded full-sync и item sync. В план остается дальнейший diff by id для слоев/fog/locked zones и запрет full repaint без причины в новых фичах.

3.6. Добавить performance regression smoke: **сделано**.
Есть browser smoke для большой сцены с presentation sync и отдельный smoke для `fog-paint-large`.

3.7. Оптимизировать туман: throttling, dirty regions, меньше sync при рисовании: **сделано базово**.
Туман получил dirty-region counters для diagnostics, live presentation sync остается throttled и обновляет только fog image в presentation, а не всю карту. Locked fog zone drag больше не пересобирает все runtime-зоны и не коммитит DOM на каждом pointermove. В план остаются настоящие dirty-region save и stress-тест с реальным pointer painting.

3.8. Добавить diagnostics UI только для dev/debug режима: **сделано базово**.
Добавлен dev-only diagnostics panel, включается через `localStorage.setItem('myOwnWorld.debug.performance','true')`.

### 4. Visual Regression / UX Safety

Статус: **сделано базово, расширять при новых UI-регрессиях**.
Приоритет: **P1**.
Зачем: визуальные баги уже много раз ломали drag/drop, popup, toolbar, badges, fog layers и selection.

4.1. Добавить Playwright screenshots для app shell, card editor, campaign map, presentation, task tracker: **сделано базово**.
Добавлен `tests/browser/visual-regression.spec.mjs`: тест сохраняет screenshot attachments для app shell, card editor, campaign map и task tracker. Presentation покрывается отдельным browser regression `campaign-map-presentation-renders-fog-above-tokens-and-locked-zones-as-fog`; если понадобится pixel-baseline, его нужно вводить отдельным устойчивым слоем.

4.2. Добавить smoke-проверки размеров: popup в viewport, toolbar не сжимается, badge не выходит за token: **сделано базово**.
Visual smoke проверяет popup boundary, фиксированную ширину floating toolbar и размер скрытого badge у токена.

4.3. Добавить checklist визуального review перед push: **сделано**.
Создан `docs/VISUAL_REGRESSION_CHECKLIST.md`.

4.4. Добавить тесты для Shift selection на карте и группового drag: **частично сделано**.
Добавлена browser-проверка selection-box: рамка выделяет токены и фигуры внутри области и не выделяет сущности вне области. Полный pointer-drag выбранной группы остается будущим расширением, потому что требует отдельного устойчивого UI-сценария с pointermove/pointerup.

4.5. Добавить visual checks для тумана над всеми слоями и locked fog zones в presentation: **сделано базово**.
Существующий presentation smoke проверяет z-index тумана и вид locked fog zone в режиме презентации. Новый visual smoke дополнительно проверяет, что fog canvas выше токенов и locked fog zone на карте мастера.

### 5. Popup Lifecycle Standardization

Статус: **сделано базово, расширять при новых popup-сценариях**.
Приоритет: **P1**.
Зачем: popup-система создавалась постепенно, поэтому разные popup живут по разным правилам.

5.1. Описать popup lifecycle contract: create, open, close, destroy, position, outside click, Escape, z-index: **сделано**.
Создан `docs/POPUP_LIFECYCLE_CONTRACT.md`.

5.2. Перевести новые popup на общий contract: **сделано базово**.
`popupManager` теперь поддерживает controller lifecycle, `open/close/toggle/destroy`, z-index, Escape, outside click и старый совместимый API. На общий lifecycle переведены/подтянуты create menu, tree context menu, link popup и campaign map popup; app topbar, confirm, block, wiki preview и image crop уже используют общий manager.

5.3. Постепенно убрать static modal UI из `index.html`, где это безопасно: **частично сделано**.
`createMenu` и `treeContextMenu` теперь создаются JS-модулями, если их нет в DOM. В `index.html` пока остаются toolbar color popup, app settings/tools/onboarding и link popup, потому что их перенос лучше делать вместе с дальнейшим app shell cleanup.

5.4. Добавить browser regression для popup boundary и повторного клика по trigger: **сделано**.
Добавлен `tests/browser/popup-lifecycle.spec.mjs`: проверяет viewport boundary, Escape, outside click, z-index, повторный trigger для create menu/tools и campaign map popup.

5.5. Проверить popup карты, инициативы, тумана, слоев, шаблонов и backup UI: **сделано базово**.
Browser suite покрывает campaign map popup, initiative, layers, page templates, settings/backup через app shell и новые popup lifecycle guards. При добавлении новых popup-типов расширять `popup-lifecycle.spec.mjs`.

### 6. Properties Model / Character Calculations

Статус: **сделано базово, развивать в сторону `CharacterModel`**.
Приоритет: **P1/P2**.
Зачем: DnD v2 и блок переменных были отложены, а практичный путь теперь идет через type-aware свойства и model-first расчеты.

6.1. Описать `PropertiesModel`: **сделано**.
Создан `docs/PROPERTIES_MODEL_CONTRACT.md`, где закреплены роли схем, модели, расчетного слоя и правило стабильных ключей.

6.2. Спроектировать calculation layer отдельно от HTML: **сделано базово**.
Добавлен `js/properties/characterCalculations.js`: модификаторы характеристик, бонус мастерства DnD 5e, расчет проверок и единая точка чтения хитов.

6.3. Научить расчетный слой читать блоки `Свойства`, legacy `Стат. блок DnD` и будущую character-модель: **сделано базово**.
`characterCalculations.js` читает `PropertiesModel`, legacy `Стат. блок DnD` и оставляет явный слот `futureCharacterModel`. Карта при чтении/изменении хитов теперь сначала обращается к расчетному слою.

6.4. Добавить schemas для новых типов `Свойства`: `creature`, `object`, `location`, `region`, `magic`, `skill`, `item`, `character`: **сделано**.
Схемы вынесены в `js/properties/propertySchemas.js`; шаблон блока `Свойства` строится из этих схем.

6.5. Сделать migration path для архивных экспериментов `DnD v2` / `Переменные`: **позже**.
Причина: сначала нужен model-first слой расчетов, иначе эксперимент снова станет HTML-блоком без архитектуры.

6.6. Улучшить UX блоков `Свойства`: **сделано базово**.
Селекторы получили единый вид, у навыков добавлены уровень навыка и вид действия (`действие`, `бонусное действие`, `реакция`, `отдых`, `пассивно`), блоки визуально подтянуты под стиль проекта. Дальше можно улучшать конкретные property-схемы вместе с `CharacterModel`.

### 7. PageRepository / PageIndex

Статус: **сделано, расширять при новых lookup-сценариях**.
Приоритет: **P1**.
Зачем: новый код не должен хаотично искать страницы по `state.pages`.

7.1. Спроектировать `PageRepository`: **сделано**.

7.2. Создать `PageIndex`: **сделано**.

7.3. Сделать lifecycle индекса: **сделано**.

7.4. Перевести wiki-links на `PageIndex`: **сделано**.

7.5. Перевести поиск на `PageIndex`: **сделано**.

7.6. Перевести проверку дублей на `PageIndex`: **сделано**.

7.7. Перевести campaign map picker/player lookup на `PageIndex`: **сделано**.

7.8. Перевести шаблоны и graph lookup на `PageIndex`: **сделано**.

7.9. Добавлять PageIndex regression при каждом новом lookup-сценарии: **постоянное правило**.

### 8. Safe HTML Boundary / Sanitizer

Статус: **сделано базово, усиливать перед web/cloud**.
Приоритет: **P1**.
Зачем: это граница безопасности между persistent HTML и runtime UI.

8.1. Описать `SAFE_HTML_CONTRACT.md`: **сделано**.

8.2. Составить allowlist HTML: **сделано**.

8.3. Реализовать sanitizer на save: **сделано**.

8.4. Реализовать sanitizer на load/open: **сделано**.

8.5. Реализовать paste sanitization: **сделано**.

8.6. Добавить security regression tests: **сделано базово**.

8.7. Расширить sanitizer под future web/cloud threat model: **позже**.

### 9. Smoke / Regression Tests

Статус: **сделано базово, расширять постоянно**.
Приоритет: **P1**.

9.1. Smoke app shell: **сделано**.

9.2. Unit-тесты дерева: drop intent / move planner: **сделано**.

9.3. Unit-тесты карты: model / serializer / store: **сделано**.

9.4. Browser smoke карты save/reload: **сделано**.

9.5. Browser regression удаления токена через дочернюю карточку дерева: **сделано**.

9.6. Browser UI flow карты через кнопку `+`: **сделано**.

9.7. Browser smoke presentation sync: **сделано**.

9.8. Browser tests форматирования текста, task tracker, шаблонов, sanitizer, layers, initiative: **сделано базово**.

9.9. Добавлять regression tests для каждого нового P0/P1 изменения: **постоянное правило**.

### 10. Tree Pointer-Based DnD

Статус: **сделано**.
Приоритет: **P1**.

10.1. Pointer DnD вместо HTML5 DnD: **сделано**.

10.2. Preview / placeholder / stable drop intent: **сделано**.

10.3. Тесты расчетов drop intent и move planner: **сделано**.

10.4. Browser regression tests дерева: **сделано**.

10.5. При изменениях дерева расширять сценарии root, внутрь, выше, ниже и сортировку на одном уровне: **постоянное правило**.

### 11. Campaign Map Data-First Save

Статус: **сделано, развивать как основу карты**.
Приоритет: **P1**.

11.1. `CampaignMapModel`: **сделано**.

11.2. `CampaignMapStore`: **сделано**.

11.3. Data-first serializer: **сделано**.

11.4. Drag стартует из store, не из `dataset`: **сделано**.

11.5. Закрытые карты патчатся через model/data-first путь: **сделано**.

11.6. Browser save/reload regression: **сделано**.

11.7. Render adapter `CampaignMapModel -> DOM`: **сделано**.

11.8. Убрать compatibility helpers `commitTokenModelToElement()` / `commitShapeModelToElement()`: **сделано**.

11.9. Игроки на карте без дубля в дереве через `sourceMode="original"`: **сделано**.

### 12. Editor History / Formatting

Статус: **сделано базово, deprecated fallback оставлен только как аварийный хвост**.
Приоритет: **P1/P2**.

12.1. Описать единый контракт истории: **сделано**.

12.2. Ctrl+Z / Ctrl+Y через управляемую историю: **сделано**.

12.3. Вставка текста как history action: **сделано**.

12.4. Форматирование как history action: **сделано**.

12.5. Блоки / таблицы / wiki-links как structural actions: **сделано**.

12.6. Изолировать `execCommand` как fallback: **сделано**.

12.7. Заменить deprecated fallback собственной реализацией основных операций: **сделано базово**.
`formattingService.js` получил собственные Range/DOM-операции для `bold`, `italic`, `underline`, списков, цвета, reset format и plain-text insertion. `execCommand` остался только аварийным fallback внутри сервиса.

12.8. Добавить дополнительные browser regression для mixed selection, headings, lists, colors, reset format: **сделано базово**.
`tests/browser/editor-formatting.spec.mjs` расширен проверками списков, цвета, reset format и plain-text insertion. Дальше добавлять более тонкие сценарии nested/mixed selection при каждом новом баге форматирования.

### 13. CI / Release Process

Статус: **сделано базово**.
Приоритет: **P2**.

13.1. GitHub Actions `Verify`: **сделано**.

13.2. `npm ci`, `npm run verify`, browser tests: **сделано**.

13.3. Artifact/logs при падении Playwright: **сделано**.

13.4. Проверка регистра import-путей для Linux CI: **сделано**.

13.5. `CHANGELOG.md`: **сделано**.

13.6. `RELEASE_PROCESS.md`, checklist, version rules, rollback guide: **сделано**.

13.7. Согласовать `package.json.version` с будущими git tags: **позже**.

### 14. Asset Lifecycle

Статус: **сделано как foundation, UI automation не сделан**.
Приоритет: **P2**.

14.1. `ASSET_LIFECYCLE_CONTRACT.md`: **сделано**.

14.2. Типы assets: image, portrait, map background, object PNG, audio, playlist: **сделано**.

14.3. `AssetReference`: **сделано**.

14.4. Broken asset checker: **сделано**.

14.5. Orphan asset detection: **сделано**.

14.6. Основа под музыку локаций: **сделано**.

14.7. Asset tests: **сделано**.

14.8. UI проверки broken/orphan assets: **не сделано**.

14.9. Безопасное удаление orphan assets после подтверждения: **не сделано**.

14.10. Audio / Playlist Assets: **позже, нужно для музыки локаций**.
Задача: расширить `AssetReference` и asset lifecycle под аудио и плейлисты как first-class media. Это должно работать одинаково в browser и desktop через будущий `AssetAdapter`.

14.11. Music by Location System: **позже, зависит от 14.10 и Desktop/AssetAdapter**.
Идея из разобранного файла адаптации: проигрывать музыку из workspace с привязкой к локации; плейлист крутится по кругу. Нужны: audio assets, playlist model, настройка связи `location -> playlist`, управление play/pause/next, сохранение состояния и browser/desktop compatibility.

### 15. Campaign Map Initiative / Layers / UX

Статус: **сделано MVP, развивать после performance/visual safety**.
Приоритет: **P2**.

15.1. InitiativeModel: **сделано**.

15.2. Popup выбора участников, ручной ввод, roll d20, порядок ходов: **сделано**.

15.3. Сохранение/восстановление инициативы: **сделано**.

15.4. LayerModel, z-order, UI слоев, serializer/restore: **сделано MVP**.

15.5. Mass select: **сделано базово**.

15.6. Context menu "открыть изображение": **сделано**.

15.7. Hidden player token visibility badge: **сделано с правками, нужен visual regression**.

15.8. Square fog brush: **сделано**.

15.9. Locked fog zones: **сделано MVP**.
Следующее развитие: изменение формы, стабильное поведение в презентации и visual regression.

15.10. Инициатива: добавить modifiers из Properties/Character calculations: **позже**.

15.11. Карта: добавить рисование поверх карты: **позже, после Popup Lifecycle и следующего performance pass**.
Идея: рядом с "Добавить изображение" добавить "Добавить полотно"; создать раздел `Рисование`; инструменты `Карандаш`, `Перо` как в Figma, `Ластик`, `Заливка`; для всех инструментов добавить selector цвета и последние цвета. Нужен отдельный model/data слой, чтобы рисунки сохранялись не как случайный DOM/canvas state.

15.12. Карта: контекстное меню существ с выбором навыков карточки: **позже, зависит от Properties Model**.
Идея: у существа на карте можно выбрать навык/способность из карточки, затем задать зону действия и расстояние. Это должно использовать `PropertiesModel`, а не читать произвольный HTML напрямую.

### 16. Разрез Крупных Файлов И CSS

Статус: **сделано на первом крупном срезе, продолжать точечно**.
Приоритет: **P2**.

16.1. Разрезать `campaignMap.js`: **сделано сильно, не возвращать новые сценарии обратно в главный файл**.

16.2. Разрезать `editor.js`: **сделано**.

16.3. Разрезать `toolbar.js`: **сделано**.

16.4. Разрезать `blockContract.js`: **сделано**.

16.5. Разрезать `campaignMapPresentation.js`: **сделано**.

16.6. Разрезать `tables.js`: **сделано**.

16.7. Разрезать `campaign-map.css`, `popup.css`, `block-special.css`: **сделано**.

16.8. Вводить ownership comments в новых CSS-файлах: **постоянное правило**.

16.9. После каждого разреза запускать full regression: **постоянное правило**.

### 17. Tables Contract

Статус: **сделано базово**.
Приоритет: **P2**.

17.1. `TABLES_CONTRACT.md`: **сделано**.

17.2. Persistent/runtime правила таблиц: **сделано**.

17.3. Tests resize столбцов: **сделано**.

17.4. Tests выделения ячеек: **сделано**.

17.5. Tests paste/plain text и keyboard navigation: **сделано**.

17.6. Расширить tables v2 под сложные таблицы и merged cells: **позже**.

### 18. Workspace Templates / Task Tracker / Knowledge Graph

Статус: **сделано базово, развивать по продуктовой необходимости**.
Приоритет: **P2/P3**.

18.1. Workspace-level templates в `.my-own-world-templates.json`: **сделано**.

18.2. Template serializer/parser/migration/search/browser tests: **сделано**.

18.3. Task tracker model-first MVP, pointer DnD, колонки, задачи: **сделано**.

18.4. Knowledge graph model, typed relationships, orphan model, backlinks contract: **сделано foundation**.

18.5. Graph entity / graph view: **позже**.
Идея: добавить отдельный тип сущности "граф связей" для визуального управления отношениями. Это не просто карточка, а будущая отдельная система поверх `KnowledgeGraph`.

18.6. Task tracker next level: дедлайны, приоритет, фильтры, архив, связь задачи с карточкой: **позже**.

18.7. Rule Tree / Rules Knowledge Base: **позже, после Account/Role foundation**.
Идея из разобранного файла адаптации: отдельное древо правил в корне приложения, доступное для ссылок как обычные карточки, но редактируемое только `admin`. Нужно отделить базу правил DnD/других НРИ от лора мира и карт кампании.

18.8. Expanded Graph Relationships: **позже**.
Расширить `KnowledgeGraph` за пределы `treeParent/wikiLink`: фракции, владение, происхождение, отношения, принадлежность предметов и richer lore model.

### 19. UX / Onboarding / AI Onboarding

Статус: **сделано базово, поддерживать**.
Приоритет: **P2/P3**.

19.1. Sample workspace: **сделано**.

19.2. Встроенный быстрый старт: **сделано**.

19.3. "Как устроен продукт" внутри приложения: **сделано**.

19.4. Onboarding checklist: **сделано**.

19.5. `AI_ONBOARDING.md`: **сделано**.

19.6. Обновлять onboarding при добавлении новых систем: **постоянное правило**.

19.7. Разделить editor на две рабочие области: **позже**.
Идея: дать возможность работать в двух карточках одновременно. Перед реализацией нужны четкий state contract для двух открытых страниц, отдельные save contexts и понятное поведение toolbar/history/wiki-links.

19.8. Extended Onboarding и sample workspace expansion: **позже**.
Идея из разобранного файла адаптации: расширить демонстрационный workspace и onboarding под реальные сценарии карточек, карт, свойств, backup, task tracker, rule tree и будущий desktop.

### 20. Desktop Adapter / Internet Resource Strategy

Статус: **следующий стратегический рабочий блок**.
Приоритет: **P1/P2**.
Зачем: проект уже local-first, а desktop-версия снимет ограничения браузерного File System Access API, сделает workspace стабильнее и подготовит путь к большим ассетам, музыке и офлайн-кампаниям.

20.1. Desktop target и `DESKTOP_ADAPTER_PLAN.md`: **сделано**.

20.2. Выбор Tauri для первого spike: **сделано**.

20.3. StorageAdapter / AssetAdapter design: **сделано**.

20.4. Подготовить окружение Desktop Spike: **сделано базово**.
Что сделано:
- добавлен dev dependency `@tauri-apps/cli`;
- добавлены отдельные npm-команды `dev:web`, `desktop:check`, `desktop:dev`, `desktop:info`, `desktop:build`;
- создана минимальная папка `src-tauri/` с `tauri.conf.json`, Rust entrypoint и минимальными capabilities;
- desktop-spike открывает текущий web UI через Tauri WebView и не меняет browser mode;
- `src-tauri/target/` добавлен в `.gitignore`;
- команды и требования зафиксированы в README и `DESKTOP_ADAPTER_PLAN.md`.

Состояние окружения на 02.06.2026:
- `@tauri-apps/cli` установлен;
- Rust/Cargo/rustup установлены;
- Visual Studio Build Tools C++ и Windows SDK установлены;
- `npm run desktop:check` проходит;
- `cargo check` в `src-tauri` проходит.

20.5. Создать `StorageAdapter` interface в JS: **сделано foundation**.
Что сделано:
- добавлены `storageAdapterContract.js`, `storageAdapter.js`, `browserStorageAdapter.js`, `desktopStorageAdapter.js`;
- описаны методы `pickWorkspace`, `restoreWorkspace`, `readText`, `writeText`, `listFiles`, `removeFile`, `ensureDirectory`;
- `openWorkspace`, `restoreWorkspace` и создание базовых папок переведены на adapter facade;
- desktop adapter умеет выбирать workspace через Tauri dialog plugin и сохранять root в `localStorage`;
- desktop load/create/delete page получили adapter bridge через lightweight file handles;
- добавлены unit tests на contract.

Что остается:
- убрать оставшиеся прямые `state.workspaceHandle` из template storage, tree open-in-folder permissions и редких future-media flows;
- добавить настоящий automated Tauri UI-runner, когда desktop prototype стабилизируется.

20.6. Создать `AssetAdapter` interface в JS: **сделано foundation**.
Что сделано:
- добавлены `assetAdapterContract.js`, `assetAdapter.js`, `browserAssetAdapter.js`, `desktopAssetAdapter.js`;
- описаны методы `importFile`, `resolveUrl`, `exists`, `remove`, `findOrphans`;
- browser adapter умеет базово резолвить asset URL и проверять наличие;
- desktop adapter подготовлен к Tauri-командам `resolve_asset_url`, `path_exists`, `remove_file`;
- добавлены unit tests на contract.

Что остается:
- реализовать native desktop file picker для картинок, если WebView ограничит browser file input;
- расширить `AssetAdapter` под будущие audio/playlist assets.

20.7. Tauri FS commands: **сделано foundation**.
Что сделано:
- добавлены Rust-команды `read_text_file`, `write_text_file`, `list_directory`, `ensure_directory`, `remove_file`, `path_exists`, `resolve_asset_url`;
- команды ограничивают операции workspace root и блокируют `..`;
- добавлена зависимость `serde`;
- JS desktop adapter вызывает команды через `@tauri-apps/api/core`.

Что остается:
- после установки Rust/Cargo и Visual Studio Build Tools проверить компиляцию Tauri;
- добавить структурированные error objects вместо строковых ошибок, когда recovery layer будет готов их принимать;
- добавить desktop storage tests после появления тестового runner для Tauri.

Состояние окружения 02.06.2026:
- Rust/Cargo/rustup установлены и видны `desktop:check`;
- Visual Studio Build Tools C++ и Windows SDK установлены и видны `desktop:check`;
- `cargo check` в `src-tauri` проходит;
- `desktop:info` выводит зеленый отчет, но может не завершаться в текущем shell, поэтому не используется как обязательный gate.

20.8. Desktop prototype: **сделано базово**.
Что сделано:
- desktop WebView запускается через `npm run desktop:dev`;
- включен `withGlobalTauri`, чтобы приложение без bundler могло использовать Tauri API;
- добавлен `tauriBridge.js`: Tauri dialog/invoke доступны через `window.__TAURI__`, а dynamic import остается fallback для будущей сборки;
- выбор workspace в desktop больше не зависит от browser-only `showDirectoryPicker`;
- desktop assets переводятся в Tauri asset URL через `convertFileSrc`, поэтому сохраненные картинки и фоны карты должны отображаться в Tauri WebView;
- добавлен `docs/DESKTOP_PROTOTYPE_SMOKE.md`.

Что остается:
- пройти ручной smoke на реальном workspace в Tauri-окне;
- при найденных ограничениях WebView добавить native file picker для image/map asset flows.

20.9. Desktop Backup / Restore Gate: **сделано базово**.
Что сделано:
- добавлен `docs/DESKTOP_BACKUP_RESTORE_GATE.md`;
- backup/restore идет через `StorageAdapter`, без прямой зависимости от `FileSystemHandle`;
- storage tests проверяют backup/restore страницы и assets через desktop-style adapter;
- desktop smoke checklist расширен проверкой restore.

Что остается:
- вручную пройти backup/restore в реальном Tauri-окне;
- позже подключить automated Tauri UI-runner, чтобы проверять реальные клики по desktop popup.

20.10. Desktop Presentation Window Spike: **сделано**.
Что сделано:
- добавлен `docs/DESKTOP_PRESENTATION_WINDOW_SPIKE.md`;
- в `tauriBridge.js` подготовлен `openTauriWebviewWindow()`;
- подтверждено, что текущая browser-презентация через `window.open` зависит от прямого DOM-доступа и не переносится один-в-один на native Tauri window.

20.10.1. Presentation runtime transport: **сделано базово**.
Что сделано:
- добавлены `presentation.html` и `js/presentation/presentationEntry.js`;
- desktop-презентация открывается через Tauri `WebviewWindow`;
- master-окно отправляет snapshot карты через `BroadcastChannel`;
- presentation runtime поддерживает собственные zoom/pan, показ карты и popup просмотра изображения;
- browser fallback через старый `window.open` сохранен.

Что остается как следующий hardening, не блокирующий 20.10.1:
- заменить HTML snapshot на полноценный JSON renderer из `CampaignMapModel`;
- добавить automated Tauri UI-runner, когда desktop prototype стабилизируется.

20.11. Desktop Packaging Smoke: **сделано**.
Что сделано:
- добавлен `docs/DESKTOP_PACKAGING_SMOKE.md`;
- добавлена команда `npm run desktop:packaging-smoke`;
- smoke проверяет desktop scripts, Tauri config, asset protocol, `protocol-asset` feature и наличие desktop-документов;
- production bundle пока не включен намеренно: текущий пункт закрывает smoke-gate, а не выпуск installer.

Будущий production packaging:
- **20.11.1. Production frontend output**;
- **20.11.2. Включить Tauri bundle**;
- **20.11.3. Проверить installer/portable build**.

20.12. Cloud threat model: **сделано как стратегический документ, реализация позже**.
Добавлен `docs/CLOUD_THREAT_MODEL.md`. Cloud нельзя начинать до Safe HTML, ownership, role model, asset access policy и presentation privacy.

20.13. Backend storage API, auth, ownership, sync/conflict resolution: **сделано как API plan, реализация позже**.
Добавлен `docs/BACKEND_STORAGE_API_PLAN.md`. BackendStorageAdapter остается будущим направлением после desktop и role foundation.

20.14. Перевод в Desktop-приложение: **сделано как стратегия, работа продолжается подпунктами**.
Добавлен `docs/DESKTOP_TRANSITION_STRATEGY.md`. Desktop остается основным практическим путем, но через adapter boundary и без удаления browser mode. Следующий desktop-фокус: hardened `CampaignMapModel` renderer для презентации и ручной smoke реального Tauri-окна на workspace с картинками.

### 22. Character Domain Model

Статус: **будущий P1 после desktop foundation или параллельно малыми кусками**.
Приоритет: **P1/P2**.

22.1. CharacterModel: **позже, но высокий приоритет**.
Единая модель персонажа: характеристики, навыки, эффекты, инвентарь, раса/класс, вычисления. Нужна для отказа от legacy stat block и превращения персонажа в доменную сущность.

22.2. Inventory System: **позже**.
Инвентарь персонажа и существ: предметы, вес, экипировка, связь с карточками предметов и будущей игровой логикой.

22.3. Effects / Conditions System: **позже**.
Эффекты, баффы, дебаффы и состояния, которые могут влиять на персонажей, карту, инициативу и свойства.

22.4. Full Character Sheet UX: **позже**.
Полноценный лист персонажа поверх `PropertiesModel` и будущего `CharacterModel`, без возврата к HTML-экспериментам `DnD v2` / `Переменные`.

### 23. Account / Roles / Permissions

Статус: **будущий стратегический блок, нужен перед Rule Tree и web/cloud**.
Приоритет: **P2/P3**.

23.1. Account System: **позже**.
Упрощенные локальные аккаунты как подготовка к ролям и будущей web/cloud модели.

23.2. Role System: **позже**.
Роли: `user`, `PRO user`, `admin`.

23.3. Admin Permission Layer: **позже**.
Ограничения редактирования защищенных зон, rule tree и будущих системных действий.

23.4. Rule Tree permissions: **после 18.7 и 23.3**.
Редактирование rule tree доступно только `admin`; чтение и ссылки доступны обычным сценариям.

### 24. Performance / Visual Hardening Future

Статус: **расширять после Desktop Spike и при новых лагах**.
Приоритет: **P2**.

24.1. Large Workspace E2E Tests: **позже**.
Реальные end-to-end сценарии на больших workspace.

24.2. Screenshot Baseline Visual Regression: **позже**.
Настоящее screenshot comparison поверх текущих visual guards.

24.3. Campaign Map Dirty Region Fog Save: **позже**.
Частичное сохранение тумана войны.

24.4. Presentation Sync Optimization: **позже**.
Дальнейшая оптимизация синхронизации окна презентации.

24.5. Campaign Map Stress Tests: **позже**.
Стресс-тесты pointer painting и больших карт.

### 25. Future AI / Collaboration / Web

Статус: **долгосрочно**.
Приоритет: **P3**.

25.1. Threat Model for Web/Cloud: **позже**.
CSP, auth, permissions, validation, server-side boundary.

25.2. Shared / Collaborative Workspace Foundation: **позже**.
Основа совместной работы после аккаунтов и permissions.

25.3. AI Integration Layer: **позже**.
AI-возможности поверх архитектурных контрактов и AI onboarding.

### 26. Documentation Maintenance

Статус: **постоянная задача**.
Приоритет: **P1**.

26.1. Обновлять `README.md` после архитектурных изменений.

26.2. Обновлять `docs/MY_OWN_WORLD_FULL_MANUAL.docx` после изменения функций.

26.3. Обновлять contract-файлы при изменении правил подсистем.

26.4. Поддерживать `docs/WORK_LOG.md` как исторический журнал.

26.5. Поддерживать `docs/PROJECT_FILE_AUDIT.md` после крупных перемещений/разрезов.

## Следующий Рекомендуемый Шаг

Следующий рабочий пункт: **20.4. Подготовить окружение Desktop Spike**.

Пункты 6 и 12 закрыты базово. Дальше логично идти в Desktop по шагам 20.4-20.11: сначала окружение и adapter boundary, затем маленький Tauri spike, затем desktop smoke/backup/presentation checks.
# Актуальный верхний блок: Desktop hardening и prototype

## 20.7.1. Desktop Storage Hardening

Статус: **сделано базово 02.06.2026**.

20.7.1.1. Adapter-backed write layer: **сделано**. `writeQueue.js` теперь умеет писать страницы через `StorageAdapter` по `page.path`; прямой `createWritable()` оставлен только как fallback для старых browser/test handles.

20.7.1.2. PageStorage без pseudo-handles: **сделано**. `pageStorage.js` больше не создает desktop lightweight file handles; desktop/browser запись идет через adapter path.

20.7.1.3. BackupService через StorageAdapter: **сделано**. `backupService.js` создает manifest, страницы и assets через `readText/writeText/readBinary/writeBinary`; cleanup удаляет snapshot-папки через `removeDirectory`.

20.7.1.4. AssetStorage через AssetAdapter: **сделано базово**. `assetStorage.js`, `browserAssetAdapter.js`, `desktopAssetAdapter.js` получили `importFile`, `resolveUrl`, `exists`, `remove` через storage facade.

20.7.1.5. CampaignMap asset flow через adapter: **сделано базово**. Загрузка фона карты и восстановление фоновых изображений больше не идут напрямую через `state.workspaceHandle`.

20.7.1.6. Desktop storage regression tests: **сделано**. `tests/storageAdapter.test.mjs` проверяет adapter-backed `writePageContent()` и backup/restore без FileSystemHandle.

20.7.1.7. Documentation/manual update: **сделано в рамках этапа**. Обновлены план, desktop-план, work log, manual и летопись.

20.7.1.8. Verification gate: **сделано**. Обязательные проверки: `npm run verify`, `npm run test:browser`, `npm run desktop:check`, `cargo check`.

Следующее развитие: убрать оставшиеся прямые `state.workspaceHandle` из template storage, tree open-in-folder permissions и будущих media-flow, но это уже отдельные подпункты после desktop prototype.

## 20.8. Desktop Prototype

Статус: **сделано как engineering smoke foundation 02.06.2026**.

20.8.1. Desktop prototype checklist: **сделано**. В `docs/DESKTOP_ADAPTER_PLAN.md` зафиксирован ручной сценарий: открыть workspace, создать/изменить карточку, перезапустить, проверить карту, assets, task tracker и UTF-8.

20.8.2. Native compile smoke: **сделано**. `cargo check` проходит в `src-tauri`.

20.8.3. Desktop environment smoke: **сделано**. `npm run desktop:check` подтверждает Node/npm/Tauri CLI/Rust/Cargo/rustup/VS Build Tools/Windows SDK.

20.8.4. Browser compatibility gate: **сделано**. Browser suite остается зеленым, desktop hardening не ломает web-версию.

Оставшийся ручной UX-хвост: запустить `npm run desktop:dev`, выбрать реальный workspace в окне Tauri и вручную пройти checklist. Автоматизировать реальный Tauri UI-runner лучше отдельным пунктом после стабилизации desktop prototype.
