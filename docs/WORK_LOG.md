# Журнал работ

## 2026-06-02: Desktop assets fix и пункты 20.10-20.14

### Что сделано

- Исправлен desktop asset URL: `resolve_asset_url` в Rust теперь возвращает абсолютный путь, а `DesktopAssetAdapter` превращает его в Tauri asset URL через `convertFileSrc`.
- Добавлен тест, который проверяет, что desktop asset path превращается в `asset://...`, а не остается прямым `file://`.
- В `tauriBridge.js` добавлены `convertTauriFileSrc()` и `openTauriWebviewWindow()` как foundation для desktop assets и будущего native presentation window.
- В Tauri capabilities добавлен label `campaign-map-presentation`.
- Добавлены документы:
  - `docs/DESKTOP_PRESENTATION_WINDOW_SPIKE.md`;
  - `docs/DESKTOP_PACKAGING_SMOKE.md`;
  - `docs/CLOUD_THREAT_MODEL.md`;
  - `docs/BACKEND_STORAGE_API_PLAN.md`;
  - `docs/DESKTOP_TRANSITION_STRATEGY.md`.
- `docs/PROJECT_PLAN.md` обновлен по пунктам 20.8-20.14.

### Что это меняет

- Картинки и фоны карты в desktop теперь должны отображаться через безопасный Tauri asset URL.
- 20.10 закрыт как честный spike: текущую browser-презентацию нельзя просто перенести в Tauri `WebviewWindow`; нужен data-first transport.
- 20.11-20.14 получили документы-решения и дальнейшую декомпозицию.

### Следующий пункт

- **20.10.1. Presentation runtime transport**: отдельная presentation page, snapshot карты, message channel и renderer из модели.

---

## 2026-06-02: Desktop workspace picker и 20.9 Backup / Restore Gate

### Что сделано

- Исправлен выбор workspace в Tauri: добавлен `js/storage/tauriBridge.js`, который использует глобальный `window.__TAURI__` в desktop WebView и оставляет dynamic import как fallback.
- В `src-tauri/tauri.conf.json` включен `withGlobalTauri`, чтобы desktop-прототип без bundler мог открывать системный dialog.
- `desktopStorageAdapter.js` переведен на `openTauriDirectoryDialog()` и `invokeTauriCommand()`.
- `desktopAssetAdapter.js` переведен на `invokeTauriCommand()`.
- Добавлен regression test на выбор workspace через глобальный Tauri dialog API.
- Добавлен `docs/DESKTOP_BACKUP_RESTORE_GATE.md`.
- `docs/DESKTOP_PROTOTYPE_SMOKE.md` расширен шагами restore.
- `docs/PROJECT_PLAN.md`, `docs/DESKTOP_ADAPTER_PLAN.md` и README обновлены по статусам 20.8 и 20.9.

### Что это меняет

- В desktop-прототипе кнопка выбора workspace больше не зависит от browser-only API и должна открывать Tauri dialog.
- Backup/restore подтвержден как adapter-backed gate: автоматические тесты проверяют страницы и assets без `FileSystemHandle`, а реальный desktop-click остается ручным smoke до появления Tauri UI-runner.

### Следующий пункт

- **20.10 Desktop Presentation Window Spike**: проверить отдельное Tauri-окно презентации и live-sync карты между окнами.

---

# ?????? ?????

## 2026-06-02: Desktop Storage Hardening 20.7.1 ? Desktop Prototype 20.8

### ??? ???????

- `StorageAdapter` ???????? ???????? `readBinary`, `writeBinary`, `removeDirectory`.
- `writeQueue.js` ????? ???????? ????? adapter-backed `page.path`; `createWritable()` ???????? fallback ??? ?????????????.
- `pageStorage.js` ????????? ? UTF-8 ? ?????? ?? ??????? desktop pseudo-handles.
- `backupService.js` ????????? ?? `StorageAdapter`: ????????, manifest, assets, restore ? cleanup ???????? ????? ?????? storage facade.
- `AssetAdapter` ??????? ??????? ?????? ??????: ????????? ??????????? ? ??? ????? ??????????? ????? `saveAssetFile()`.
- `campaignMapRuntime.js` ? `images.js` ?????? ?????? ?????? ? `state.workspaceHandle/assets`.
- ? Tauri backend ????????? `read_binary_file`, `write_binary_file`, `remove_directory`.
- ????????? regression-????? adapter-backed ?????? ? backup/restore ??? FileSystemHandle.

### ??? ????? ?????

- Browser ? desktop storage ?????? ????? ? ?????? ?????????.
- Backup/restore ?????? ?? ??????? ?? ??????????? ??????????? FileSystemHandle.
- Desktop prototype ??????? ???????? ?????? ??? ???????, ???????? ? backup, ? ?? ?????? ???????? Tauri.

### ??? ????????

- ???????? ?????? `npm run desktop:dev` checklist ???? ?????? ? ???? Tauri ?? ????????? workspace.
- ? ??????? ?????????? ????? ?????? ?????? `state.workspaceHandle` ?? template storage ? ????????? tree/open-in-folder ?????????.
- Tauri UI-runner ??? ??????????????? desktop smoke ????? ?????? ????? ?????? ???????????? prototype.

### ????????? ????????

- ????????? ????? ????? ????? 20.8: **20.9 Desktop Backup / Restore Gate**, ???? ????? ????????? desktop, ???? ??????? ? P0/P1 ????? ????? ??????? desktop-smoke.

---

# Журнал работ

Этот файл хранит исторический лог выполненных задач, старые фрагменты планов, решения, риски и заметки "что сделано". Актуальный единый backlog находится в `docs/PROJECT_PLAN.md`.

Новые подробные записи после крупных изменений добавлять сюда, а в `docs/PROJECT_PLAN.md` менять только статусы и следующие задачи.

---
## 2026-06-01: Campaign Map Performance Tail 3.5-3.7

### Что сделано

- `syncPresentationItemsById()` батчит item-level обновления по карте.
- Missing item в презентации теперь вызывает один fallback full-sync, а не серию полных перерисовок.
- Добавлен `syncPresentationFog()` и `schedulePresentationFogSync()`: при рисовании/очистке тумана presentation обновляет только fog image.
- `flushLiveFogPresentationSync()` теперь отправляет fog-only sync.
- Повторный drag locked fog zone исправлен: старт drag перечитывает актуальную зону из модели, а не stale-объект из старого render.

### Что стало лучше

- `3.5` закрыт базово: presentation live sync стал batch/fallback-aware.
- `3.7` закрыт базово: fog paint больше не требует полного sync всей карты в live-режиме.
- Поведение запретных зон стало устойчивее после нескольких переносов подряд.

### Что осталось

- Настоящий dirty-region save для тумана: сейчас dirty regions считаются и используются для diagnostics, но persistent fog image все еще сохраняется целиком на завершении рисования.
- Diff by id для структурных изменений слоев и locked fog zones можно усилить позже, когда начнем развивать слои карты.

### Следующее развитие

- Следующий пункт плана: `4. Visual Regression / UX Safety`.

---
## 2026-06-01: Campaign Map Performance Gate 3.4-3.8

### Что сделано

- `campaignMapPerformance.js` расширен scenario budgets: `smallMapBaseline`, `largeMapDrag`, `fogPaintLarge`, `presentationLiveSync`, `zoomPanHeavy`.
- Добавлены `createCampaignMapPerformanceReport()` и `assertCampaignMapPerformanceBudget()` для обязательных performance checks в тестах.
- Browser smoke карты расширен: теперь есть отдельный сценарий `campaign-map-fog-paint-large-stays-inside-budget`.
- Добавлен dev-only diagnostics panel `campaignMapPerformanceDiagnostics.js`, включается через `localStorage.setItem('myOwnWorld.debug.performance','true')`.
- Туман получил dirty-region counters для diagnostics.
- Locked fog zone drag оптимизирован: больше не пересобирает все зоны и не коммитит DOM на каждом pointermove.
- Обновлены `docs/PROJECT_PLAN.md`, `docs/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md`, browser scenarios и мануал.

### Что стало лучше

- Performance gate теперь проверяет не только presentation sync, но и fog paint.
- У карты появился включаемый debug-инструмент без шума в обычном интерфейсе.
- Один из источников лагов на fog zones убран: движение зоны стало дешевле для DOM.

### Что осталось

- `3.5`: нужен batch/diff layer для presentation sync, чтобы несколько изменений за кадр не превращались в лишние операции.
- `3.7`: нужны настоящие dirty-region save/sync для fog image, а не только counters.
- Нужен stress smoke с реальным pointer drag/painting на большой карте.

### Следующее развитие

- Следующий пункт плана: `4. Visual Regression / UX Safety`, если не продолжаем углублять подпункты `3.5` и `3.7`.

---
## 2026-06-01: Schema gate и Backup / Restore 1.7, 1.8, 2.5-2.7

### Что сделано

- Добавлен `js/schema/schemaUpgradeGate.js`: будущие schema upgrades теперь должны проходить через gate с успешной validation и backup manifest.
- Добавлен browser smoke `tests/browser/schema-recovery.spec.mjs` для fallback-экрана recovery.
- `backupService` расширен: manifest хранит `assets` / `assetCount`, backup копирует persistent assets по `AssetReference`, restore возвращает assets обратно в workspace.
- Добавлена retention-политика backup: по умолчанию сохраняются 20 последних точек, старые удаляются через `cleanupWorkspaceBackups()`.
- `tests/backupService.test.mjs` теперь проверяет восстановление карточки, карты, task tracker, assets и очистку старых backup.
- Обновлены `docs/PROJECT_PLAN.md`, `docs/BACKUP_AND_RECOVERY_CONTRACT.md` и `docs/WORKSPACE_SCHEMA_CONTRACT.md`.

### Что стало лучше

- P0 data safety стал заметно крепче: есть диагностика схемы, gate перед будущими upgrade и реальный backup/restore страниц с ассетами.
- Recovery остается осторожным: данные не чинятся автоматически, а destructive rollback по-прежнему не включен.

### Что осталось

- Для будущих repair-actions нужны отдельные browser/storage сценарии на каждое действие.
- Backup assets нужно усилить для больших файлов, audio/playlist и missing/fallback policy.
- Нужен UI для настройки retention-лимита и ручной очистки backup.

### Следующее развитие

- Следующий пункт плана: `3. Campaign Map Performance Gate`.

---
## 2026-06-01: Schema Validation / Recovery 1.2-1.5

### Что сделано

- Добавлен `js/schema/templateSchema.js` для проверки `.my-own-world-templates.json`.
- Добавлен `js/schema/assetSchema.js` для проверки `AssetReference`.
- `validateWorkspaceSnapshot()` теперь умеет принимать `templates` и `assetReferences`.
- `loadWorkspace()` собирает asset references из страниц и включает их в workspace validation.
- Добавлен `js/schema/schemaRecovery.js` с `WorkspaceRecoveryReport`.
- При критичных ошибках workspace приложение показывает fallback-экран диагностики в editor вместо молчаливого продолжения.
- `docs/WORKSPACE_SCHEMA_CONTRACT.md` обновлен: описаны templates, assets и текущий recovery flow.
- Unit tests расширены на templates, assets и recovery report.

### Что стало лучше

- Пункты `1.2-1.5` теперь закрыты базовым слоем, а не только page/map/task проверками.
- Поврежденный workspace получает понятное диагностическое состояние.
- Recovery остается безопасным: данные не исправляются автоматически без backup и явного действия.

### Что осталось

- Добавить browser/storage tests для recovery fallback.
- Подключить validation gate перед будущими schema upgrades.
- Сделать безопасные repair-actions после backup.

---
## 2026-06-01: Объединение планов проекта

### Что сделано

- Создан единый актуальный план `docs/PROJECT_PLAN.md`.
- Старые плановые документы перенесены в `docs/archive/`:
  - `PLANS_AND_TECH_DEBT.md`;
  - `PROJECT_DEVELOPMENT_AND_MATURITY_PLAN.md`.
- В новый план сведены рабочий backlog, оценка зрелости, техдолг, частично сделанные задачи и будущие отложенные пункты.
- Зафиксировано правило: частично сделанная задача остается в плане до полного закрытия, а отложенная важная задача остается в будущем плане с причиной.
- Ссылки в onboarding/release документации переведены на `docs/PROJECT_PLAN.md`.

### Что стало лучше

- У проекта снова один источник правды по плану.
- Старые документы сохранены как архив, но больше не конкурируют с актуальным backlog.
- Частичные задачи вроде schema validation, backup/restore, performance gate и locked fog zones явно не теряются.

### Следующее развитие

- Продолжать P0 data safety: пункты `1.2-1.5` и `2.5-2.7` в `docs/PROJECT_PLAN.md`.

---
## 2026-06-01: Backup / Restore, первый слой

### Что сделано

- Добавлен `docs/BACKUP_AND_RECOVERY_CONTRACT.md`.
- Добавлен `js/storage/backupService.js`.
- Backup сохраняет snapshot в `.my-own-world-backups/<snapshot-id>/`.
- Snapshot содержит `manifest.json` и копии markdown-страниц в `pages/`.
- Добавлен осторожный restore helper: он восстанавливает страницы из backup, но не удаляет новые файлы, созданные после backup.
- В popup настроек добавлена ручная команда "Создать резервную копию".
- В popup настроек добавлен список restore-точек и inline-диалог подтверждения восстановления.
- Auto snapshot подключен перед удалением ветки страниц и перед переносом страниц в дереве.
- Добавлены unit-тесты manifest/id для backup-сервиса.

### Что стало лучше

- Schema recovery теперь получает обязательную базу: перед будущей автоматической починкой можно будет создавать snapshot.
- Рискованные операции удаления/переноса получили первый защитный слой.
- Backup слой не зависит от DOM и работает на storage/page data.

### Что осталось

- Нужно добавить backup assets по `AssetReference`.
- Нужны browser/storage regression tests на реальное удаление/перенос с проверкой snapshot.

---
## 2026-06-01: Schema Validation / Recovery, первый слой

### Что сделано

- Изучен бриф `MY_OWN_WORLD_AI_ARCHITECTURE_RISK_BRIEF_01_06_2026_UPDATED.docx`.
- План развития скорректирован: backup/recovery поставлен сразу после schema validation, popup lifecycle выделен отдельным приоритетом.
- Добавлен `docs/WORKSPACE_SCHEMA_CONTRACT.md`.
- Добавлены чистые валидаторы: workspace/page, campaign map, task tracker и JSON helper.
- `loadWorkspace()` подключает validation в warning-only режиме: старые workspace не блокируются, но проблемы схемы выводятся в консоль.
- Добавлены unit-тесты на missing id, broken parent, duplicated title, broken map token, broken task reference и invalid JSON.

### Что стало лучше

- Появился первый слой защиты от поврежденных workspace-данных.
- Валидаторы не чинят данные молча, а возвращают явные `error` и `warning`.
- Следующий recovery layer теперь можно строить поверх диагностики, а не поверх догадок.

### Что осталось

- Нужен UI-экран диагностики workspace.
- Нужен backup/snapshot перед любым автоматическим recovery.
- Нужно расширить validation на templates и asset references как обязательный gate.

---
## 2026-05-31: Исправления UX карты после пункта 22

### Что сделано

- Массовое выделение токенов и фигур перенесено с `click` на `pointerdown`, чтобы `Shift` / `Ctrl` / `Cmd` работали даже при pointer-based drag.
- Popup изображения токена увеличен и получил кнопку `Показать игрокам`, которая открывает preview в окне презентации.
- Скрытые player-токены (`sourceMode="original"`) больше не удаляются из презентации: они остаются видимыми с бейджем `скрыт`.
- Рисование и стирание тумана больше не запускают тяжелую синхронизацию презентации на каждом `pointermove`; синхронизация идет после завершения мазка.
- Locked fog zones стали редактируемыми: их можно двигать, менять размер за угол и видеть в презентации.
- Добавлен `docs/PROJECT_FILE_AUDIT.md` с аудитом файлов проекта в формате `Название файла | За что отвечает | Нужно ли его оптимизировать | Можно ли удалить?`.

### Проверки

- `npm run verify`.
- `npm run test:browser`.

---
## 2026-05-31: Пункт 22 - Campaign Map UX и адаптация пункта 23 под свойства

### Что сделано

- На карте добавлено массовое выделение токенов и фигур через `Shift` / `Ctrl` / `Cmd`-клик.
- В контекстное меню токенов добавлено действие `Открыть изображение` с popup-превью.
- Скрытые на презентации токены получили бейдж `скрыт` на карте мастера.
- Popup тумана получил выбор формы кисти: круг или квадрат.
- Добавлен MVP locked fog zones: зона защищает туман от стирания кистью и удаляется отдельным кликом.
- Locked fog zones помечаются как runtime UI и очищаются sanitizer-слоем перед сохранением persistent HTML.
- Пункт 23 переработан: будущая модель персонажа теперь должна строиться вокруг type-aware блоков `Свойства`, а не вокруг архивного блока `Переменные`.

### Что стало лучше

- Карта получила недостающие быстрые UX-действия без возврата к DOM-first сохранению.
- Туман войны стал управляемее: мастер может использовать квадратную кисть и защищать отдельные зоны от случайного стирания.
- План развития персонажей стал согласован с уже добавленным блоком `Свойства`.

### Проверки

- `npm run verify`.
- `npm run test:browser`.

### Следующее развитие

- Пункт 23: описать `PropertiesModel` и слой расчетов, который читает `Свойства`, legacy `Стат. блок DnD` и будущие character-данные как model-first источник.

---
## 2026-05-27: Пункты 17-20 — шаблоны, граф, AI onboarding и desktop plan

### Что сделано

- Шаблоны страниц перенесены на workspace-level файл `.my-own-world-templates.json`.
- Добавлены serializer/parser шаблонов, migration из `localStorage`, поиск по шаблонам и browser regression.
- Добавлен `docs/KNOWLEDGE_GRAPH_MODEL.md`.
- Добавлен foundation `js/wiki/knowledgeGraph.js` с typed relationships `treeParent` и `wikiLink`, а также orphan detection.
- Добавлен `tests/knowledgeGraph.test.mjs`.
- Добавлен `docs/AI_ONBOARDING.md`.
- Добавлен `docs/DESKTOP_ADAPTER_PLAN.md` с выбором Tauri для первого spike, планом `StorageAdapter`, `AssetAdapter` и desktop smoke checklist.
- `README.md`, `docs/PLANS_AND_TECH_DEBT.md` и manual обновлены.

### Что стало лучше

- Шаблоны теперь переносятся вместе с миром, а не привязаны к браузеру.
- Knowledge Graph получил первый тестируемый model-слой, на который позже можно посадить UI.
- AI-вход в проект стал менее зависим от длинной истории переписки.
- Desktop-направление больше не абстрактная идея, а план adapter-first миграции.

### Проверки

- `npm run verify`.
- `npm run test:browser`.

### Следующее развитие

- Пункт 22: Campaign Map UX-доработки.

---

## 2026-05-27: UX / Onboarding Layer

### Что сделано

- Добавлен `docs/UX_ONBOARDING_CHECKLIST.md`.
- Добавлен пример workspace в `docs/sample-workspace` со стартовой карточкой, учебной картой, учебным task tracker и пустой папкой assets.
- Верхний popup `Инструменты` заменен с временных кнопок на `Быстрый старт`, `Как устроено`, `Checklist`.
- Добавлен `js/ui/onboardingGuide.js` с отдельной встроенной справкой.
- Добавлен `styles/onboarding.css` для мягкого onboarding-popup.
- `README.md` и `docs/PLANS_AND_TECH_DEBT.md` обновлены: пункт 16 закрыт базово, следующим пунктом стал `17. Workspace Templates`.

### Что стало лучше

- У пользователя появился встроенный путь входа без чтения истории разработки.
- Product onboarding отделен от редактора, карты и дерева, поэтому его можно развивать или удалить как самостоятельный слой.
- Sample workspace дает безопасную папку для знакомства с основными сущностями.

### Проверки

- Добавлен browser smoke на открытие onboarding из верхнего popup.

### Следующее развитие

- Пункт 17: перенести шаблоны из `localStorage` в workspace-файл, чтобы шаблоны были частью мира.

---

## 2026-05-26: CSS Separation и type-aware блоки свойств

### Что сделано

- `campaign-map.css` превращен в entrypoint, а стили карты вынесены в `campaign-map-layout.css`, `campaign-map-initiative.css`, `campaign-map-stage.css`, `campaign-map-tokens.css`, `campaign-map-shapes.css`, `campaign-map-token-popup.css`, `campaign-map-popups.css`, `campaign-map-responsive.css`.
- `popup.css` превращен в entrypoint, а popup-семейства вынесены в `popup-create.css`, `popup-link.css`, `popup-wiki.css`, `popup-block.css`, `popup-item-picker.css`, `popup-confirm-profile.css`, `popup-block-type.css`, `popup-image-crop.css`.
- `block-special.css` превращен в entrypoint, а стили специальных блоков вынесены в `block-items-inline.css`, `block-character-stats.css`, `block-dnd-stats-legacy.css`, `block-dnd-stats.css`.
- Добавлен `styles/block-properties.css` для нового блока `Свойства`.
- Добавлен `js/templates/propertyBlockDefinitions.js` со схемами свойств по типам карточек.
- Добавлен type-aware блок `Свойства`: `skill`, `magic`, `item` получают свои поля; `character` создает существующий DnD stat block как свойства персонажа.
- Popup добавления блока показывает `Свойства` только для поддержанных типов карточек.
- Добавлен unit test `tests/propertyBlocks.test.mjs`.

### Что стало лучше

- CSS больше не требует открывать один огромный файл карты или popup-системы ради маленькой правки.
- Стили получили ownership-комментарии и короткие entrypoint-файлы.
- Свойства карточек теперь зависят от типа карточки, а не выбираются пользователем как чужая схема.

### Проверки

- `npm run verify` — успешно, 52 unit/model tests passed.
- `npm run test:browser` — успешно, 19 browser tests passed.

### Следующее развитие

- Пункт 16: UX / Onboarding Layer, потому что техническая основа стала крепче, а вход пользователя в систему все еще слишком резкий.

---

## 2026-05-26: Tables Contract и regression tests

### Что сделано

- Добавлен `docs/TABLES_CONTRACT.md`.
- В контракте зафиксированы persistent/runtime правила таблиц, resize колонок, selection, paste, keyboard navigation и save/load boundary.
- Добавлен browser regression `tests/browser/tables.spec.mjs`.
- Тест проверяет resize одной колонки без изменения соседней, пересчет общей ширины таблицы, выделение диапазона 2x2, plain-text paste из tab/newline текста и Enter-переход с созданием новой строки.
- `docs/PLANS_AND_TECH_DEBT.md` обновлен: пункт 15 закрыт, следующим рекомендуемым шагом выбран CSS Separation.

### Что стало лучше

- Таблицы теперь не просто разрезаны по файлам, а имеют формальный контракт поведения.
- Следующие изменения таблиц должны расширять один конкретный browser regression, а не проверяться только вручную.
- Persistent HTML таблиц отделен от runtime UI на уровне документации и тестового ожидания.

### Проверки

- `npm run test:browser` — успешно, 19 browser tests passed.

### Следующее развитие

- Пункт 21: разрезать крупные CSS-файлы и ввести ownership-комментарии для визуальных подсистем.

---

## 2026-05-26: Завершение пункта 14 — разрез крупных JS-файлов

### Что сделано

- `blockContract.js` стал фасадом контракта блоков.
- Runtime selectors, runtime marking, table contract, selective upgrades, runtime controls и persistent serializer вынесены в отдельные файлы внутри `js/editor/blocks/`.
- `campaignMapPresentation.js` уменьшен: стили презентации вынесены в `campaignMapPresentationStyle.js`, а точечная синхронизация token/shape — в `campaignMapPresentationItemSync.js`.
- `js/ui/tables.js` стал точкой подключения событий таблиц.
- Табличная логика разнесена по модулям: `tableCells.js`, `tableColumns.js`, `tableResize.js`, `tableSelectionState.js`, `tableToolbar.js`, `tableConstants.js`, `tableRows.js`, `tableClipboard.js`.
- План `docs/PLANS_AND_TECH_DEBT.md` обновлен: 14.4, 14.5 и 14.6 отмечены как выполненные, следующим шагом выбран Tables Contract.

### Что стало лучше

- Крупные файлы на границе persistent/runtime стали проще читать и безопаснее менять.
- Таблицы получили инженерную основу для будущего `TABLES_CONTRACT.md` и regression tests.
- Презентация карты стала меньше зависеть от одного большого файла, поэтому следующие изменения sync-логики легче локализовать.

### Проверки

- `npm run verify` — успешно после разреза `blockContract.js`.
- `npm run verify` — успешно после разреза `campaignMapPresentation.js`.
- `npm run verify` — успешно после разреза `tables.js`.
- `npm run test:browser` — успешно, 18 browser tests passed.
- Проверка типичных UTF-8/mojibake-маркеров — совпадений нет.

### Следующее развитие

- Пункт 15: описать контракт таблиц и добавить regression tests для resize, selection, paste и keyboard navigation.

---

## 2026-05-26: Исправление Task Tracker и инициативы

### Что сделано

- Старые таск-трекеры снова открывают сохраненные задачи: sanitizer теперь считает безопасным legacy `<script class="task-tracker-data" type="application/json">`.
- Новые и пересохраненные таск-трекеры получают явный атрибут `data-task-tracker-data`.
- Добавлен browser regression, который открывает legacy task tracker через настоящий `openPage()` и проверяет, что задача не пропадает.
- Popup инициативы карты разделен на два окна: выбор/ручной ввод значений и отдельный `Порядок ходов`.
- Значение инициативы теперь можно редактировать вручную; `Roll d20` просто заполняет поля.
- После `Применить` открывается порядок ходов с активным участником и кнопками предыдущий/следующий.

### Проверки

- `npm run verify` — успешно.
- `npm run test:browser` — успешно, 18 browser tests passed.

### Следующее развитие

- Следующий плановый пункт остается `14.4`: разрезать `blockContract.js`.

---

## 2026-05-26: Разрез editor.js и toolbar.js

### Что сделано

- `editor.js` сокращен до фасада публичного API: `setupEditor()`, `openPage()`, `renderEmptyEditor()`, `saveCurrentPage()`, `insertImage()`.
- Открытие страниц вынесено в `js/editor/editorOpenPage.js`.
- Сохранение спец-сущностей карты и таск-трекера вынесено в `js/editor/editorSpecialSave.js`.
- Пустой экран и действия его кнопок вынесены в `js/editor/editorEmptyPage.js`.
- Навигационная панель карточки с "Назад" и "Найти в дереве" вынесена в `js/editor/editorNavigation.js`.
- Paste/plain-text логика вынесена в `js/editor/editorPastePlainText.js`.
- Отложенная нормализация wiki-links вынесена в `js/editor/editorWikiLinkNormalization.js`.
- Открытие обычных внешних ссылок вынесено в `js/editor/editorLinksRuntime.js`.
- Очистка asset images перед render вынесена в `js/editor/editorAssetSanitizer.js`.
- `toolbar.js` стал контроллером событий toolbar.
- Позиционирование toolbar/color-popup вынесено в `js/editor/toolbarPosition.js`.
- Подсветка активных кнопок toolbar вынесена в `js/editor/toolbarActiveState.js`.
- Работа с последними цветами и применением цвета вынесена в `js/editor/toolbarTextColor.js`.

### Что стало лучше

- Редактор больше не является единым комбайном для setup, open, save, paste, пустого экрана и навигации.
- Toolbar стало проще развивать: геометрия, состояние и цветовой слой разделены.
- Публичные импорты `editor.js` сохранены, поэтому остальные подсистемы не требуют массовой перепривязки.

### Проверки

- `npm run verify` — успешно.
- `npm run test:browser` — успешно, 17 browser tests passed.

### Следующее развитие

- Продолжить пункт `14.4`: разрезать `blockContract.js`, потому что это следующий крупный файл на границе persistent/runtime HTML.

---

## 2026-05-26: Доработка инициативы карты

### Что сделано

- Popup инициативы стал показывать результаты броска: итог, d20 и модификатор.
- Добавлено отображение активного хода и кнопки предыдущий/следующий участник.
- Повторное применение участников больше не стирает уже сделанные броски выбранных участников.
- Токены карты получили persistent поле `initiativeModifier` / `data-initiative-modifier`.
- Browser regression инициативы расширен: проверяет видимые строки, результаты и переключение активного хода.

### Что стало лучше

- Инициатива теперь работает как полезный боевой popup, а не как скрытая запись состояния в модель.
- Состояние боя понятнее мастеру: видно, чей ход, и можно двигаться по очереди.

### Риски / Что осталось

- Модификатор инициативы пока хранится на токене и не вычисляется автоматически из характеристик персонажа.
- Нет отдельного режима "начать/закончить бой" и ручного редактирования модификатора прямо в popup.

### Следующее развитие

- Позже связать `initiativeModifier` с будущей CharacterModel / DnD stats layer.

---

## 2026-05-26: Campaign Map Layers 13.1-13.2

### Что сделано

- Добавлен `js/editor/campaignMapLayerModel.js`.
- Введены базовые слои карты: `Объекты`, `Существа`, `Фигуры`.
- `CampaignMapModel` теперь хранит `layers`, а токены и фигуры получают `layerId` и `zIndex`.
- Data-first serializer сохраняет `data-layer-state`, `data-layer-id` и `data-z-index`.
- Render adapter применяет `style.zIndex`, чтобы порядок слоев начал работать визуально без будущего UI.
- В toolbar карты добавлена кнопка `Слои`.
- Popup слоев умеет включать/выключать слой и менять порядок слоя вверх/вниз.
- Видимость слоя применяется через `data-layer-hidden`.
- Добавлены unit-тесты `tests/campaignMapLayerModel.test.mjs` и расширены тесты модели/сериализатора карты.
- Добавлен browser regression `campaign-map-layers-control-visibility-and-z-order`.

### Что стало лучше

- У карты появился model-first контракт слоев, на который можно опереться при UI управления слоями, массовом выделении и будущей настройке видимости.
- Порядок объектов больше не является только CSS-договоренностью: он сохраняется в данных карты.

### Риски / Что осталось

- Visibility отдельного объекта/токена пока остается через существующие `presentationHidden` и будущий layer/object UI.
- Lock на уровне слоя описан в модели, но пока не подключен к pointer-контроллерам.

### Следующее развитие

- Следующий крупный долг по плану: `14.2` разрезать `editor.js`.

---

## 2026-05-26: CI fix для Linux import path case

### Что сделано

- Исправлен регистр tracked-файла `js/ui/dndStats.js`: раньше в git он был записан как `js/ui/dndstats.js`, хотя код импортировал `dndStats.js`.
- Добавлен `tools/check_import_paths.mjs`.
- `npm run verify` теперь запускает проверку точного регистра относительных и browser-absolute import-путей.
- Исправлен UTF-8 комментарий в `tools/run_checks.mjs`.

### Что стало лучше

- GitHub Actions на Ubuntu больше не должен получать 404 при загрузке `js/ui/dndStats.js`.
- Такая же ошибка не сможет тихо пройти локально на Windows: `verify` остановится до browser smoke.

### Риски / Что осталось

- Нужно дождаться нового запуска GitHub Actions после push и убедиться, что внешний `Verify` стал зеленым.

### Следующее развитие

- Продолжать усиливать CI проверками, которые ловят Windows/Linux различия до запуска браузера.

---

## 2026-05-25: GitHub Actions CI 8.1-8.2

### Что сделано

- Добавлен `.github/workflows/verify.yml`.
- Workflow запускается на push в `main` и на pull request.
- Добавлен `actions/checkout@v4`.
- Добавлен `actions/setup-node@v4` с Node.js 22 и npm cache.
- Добавлен шаг `npm ci`, чтобы зависимости ставились строго по `package-lock.json`.
- В workflow уже включен `npm run verify`, чтобы базовая проверка работала сразу.

### Что стало лучше

- У проекта появился первый CI-контур на GitHub Actions.
- Локальный `npm run verify` начинает превращаться в обязательную внешнюю проверку.

### Риски / Что осталось

- Browser smoke пока не вынесен отдельным CI-шагом с artifacts. Это следующий пункт `8.4-8.5`.
- Правило "перед merge/push зеленый CI обязателен" еще нужно зафиксировать в release/checklist документах.

### Следующее развитие

- Выполнить `8.4`: добавить `npm run test:browser` в CI.
- Затем `8.5`: сохранять Playwright traces/logs как artifacts при падении.

---

## 2026-05-25: Safe HTML Security Regression 7.6

### Что сделано

- Расширен `tests/browser/safe-html.spec.mjs` до набора security regression tests.
- Добавлены проверки forbidden tags: executable `<script>`, `iframe`, `object`, `embed`, `link`, `meta`, `style`, `form`.
- Зафиксировано исключение task tracker JSON: `script[type="application/json"][data-task-tracker-data]` сохраняется, лишние атрибуты удаляются.
- Добавлены проверки unsafe attributes and URLs: `on*`, `javascript:`, `vbscript:`, `data:text/html`, `blob:` sources.
- Добавлены проверки runtime leakage: block controls, toolbar, image controls, table controls, campaign map toolbar/popup/drag vector, task tracker runtime board.
- Добавлена проверка malformed HTML и plain text paste sanitizer.
- `safeHtmlSanitizer.js` расширен runtime selectors для campaign map и task tracker runtime UI.

### Что стало лучше

- Sanitizer теперь прикрыт browser regression tests, а не только ручной уверенностью.
- Будущие изменения сохранения, карты, task tracker и paste сразу покажут, если runtime UI или опасный HTML снова начнет попадать в persistent content.

### Риски / Что осталось

- Строгий allowlist классов и `data-*` все еще не включен, чтобы не сломать текущие legacy-блоки. Его стоит делать отдельным подпунктом после анализа реальных сохраненных `.md`.

### Следующее развитие

- Перейти к P0-блоку `8. CI На GitHub Actions`.

---

## 2026-05-25: Safe HTML Sanitizer 7.3-7.5

### Что сделано

- Добавлен `js/editor/safeHtmlSanitizer.js`.
- Реализованы `sanitizePersistentHTMLOnSave()`, `sanitizePersistentHTMLOnLoad()` и `sanitizePlainTextPaste()`.
- Sanitizer удаляет runtime UI, forbidden tags, inline `on*` handlers, `javascript:` / `vbscript:` URLs, dangerous `data:text/html`, `blob:` sources на save и небезопасные style-атрибуты.
- Task tracker JSON script сохранен как разрешенное исключение: `type="application/json"` + `data-task-tracker-data`.
- Save boundary подключен к autosave, сохранению карт, task tracker, block serializer и созданию страниц по шаблону.
- Load/open boundary подключен перед вставкой HTML в editor.
- Paste boundary подключен для редактора и таблиц.
- Добавлен browser regression `tests/browser/safe-html.spec.mjs`.

### Что стало лучше

- Persistent HTML теперь проходит через единый защитный слой перед сохранением и открытием.
- В `.md` сложнее случайно протащить runtime-кнопки, обработчики событий, `javascript:` ссылки и временные `blob:` sources.
- Вставка текста продолжает быть plain text и теперь дополнительно чистит control chars.

### Риски / Что осталось

- Sanitizer пока мягкий к `class` и большинству `data-*`, чтобы не сломать текущую разметку. Строгий allowlist классов и data-полей лучше вводить после расширения security tests.
- 7.6 остается следующим шагом: нужно добавить больше regression cases из `SAFE_HTML_CONTRACT.md`.

### Следующее развитие

- Выполнить `7.6`: forbidden tags, script injection, unsafe attributes, malformed HTML, runtime controls leakage, task tracker JSON exception, map toolbar leakage.

---

## 2026-05-25: Safe HTML Contract 7.1-7.2

### Что сделано

- Создан `docs/SAFE_HTML_CONTRACT.md`.
- Описана граница `persistent content` и `runtime UI`.
- Зафиксированы общие запреты: executable tags, inline event handlers, `javascript:` URLs, runtime DOM, временные drag/selection/toolbar элементы.
- Описан allowlist для базовых текстовых тегов, ссылок, wiki-links, card shell, блоков, form controls, таблиц, изображений, campaign map и task tracker.
- Зафиксированы будущие boundary-точки: save, load/open и paste.
- Описаны security regression scenarios для будущего пункта `7.6`.

### Что стало лучше

- Следующий sanitizer можно реализовывать по документу, а не по догадкам из текущего DOM.
- У команды появился единый язык: что считается runtime, что можно сохранять, что надо восстанавливать при open.
- Контракт уже учитывает текущую архитектуру data-first карты и JSON-модель task tracker.

### Риски / Что осталось

- Контракт пока не исполняемый: код sanitizer еще не написан.
- Некоторые текущие подсистемы могут временно хранить больше атрибутов, чем будущий sanitizer разрешит. При реализации 7.3 нужно сверять реальные сохраненные HTML-кейсы.

### Следующее развитие

- Выполнить `7.3`: реализовать sanitizer на save и добавить первые unit-тесты на удаление runtime UI и dangerous HTML.

---

## 2026-05-25: PageRepository Migration 6.6-6.8

### Что сделано

- `pageTitleValidation.js` переведен на `PageRepository`: проверка дублей идет через `getPagesByTitle()` и `findDuplicateTitles()`.
- Campaign map picker/player lookup переведен на repository API: список доступных карточек, проверка ветки карты, получение выбранных страниц и подсчет следующих индексов дублей.
- External drop из дерева на карту теперь получает страницу через `getPageById()`.
- Token actions карты используют repository lookup для удаления, открытия и дублирования карточек токенов.
- Bucket lookup карты переведен на `getChildren(mapPageId)`.
- Create menu для задач ищет task tracker через `queryPages({ type: 'taskTracker' })`.
- Создание карточки по шаблону уведомляет `PageRepository` после изменения metadata созданной страницы.
- Backlinks/future graph references читают страницы через `getAllPages()`.
- Тесты `pageTitleValidation` переведены на `setPages`, чтобы проверять актуальный lifecycle repository.

### Что поменялось для пользователя

- Проверка одинаковых названий должна работать так же, но теперь опирается на единый индекс.
- Добавление существ/объектов/игроков на карту через `+` и перетаскивание из дерева должно сохранить прежнее поведение, но lookup стал единообразнее.
- Создание задачи через `+ -> задача` и создание карточки по шаблону должны стабильнее видеть актуальные страницы после изменений.

### Риски / Что осталось

- В проекте еще остаются legacy-прямые обращения к `state.pages`, особенно в дереве, editor navigation и некоторых модулях карты. Они не входят в 6.6-6.8 и будут закрываться отдельными задачами разреза крупных файлов или repository hardening.
- Следующий P0-блок — Safe HTML Boundary / Sanitizer.

### Следующее развитие

- Начать `7.1`: описать `SAFE_HTML_CONTRACT.md`, затем реализовать sanitizer на save/load/paste.

---

## 2026-05-25: PageRepository Migration 6.4-6.5

### Что сделано

- `wikiLinkLookup.js` переведен с прямого обхода `state.pages` на `PageRepository`.
- Refresh wiki-links, клик по wiki-link, hover preview и popup "Связать с существующей" теперь ищут страницы через единый индекс.
- Popup выбора существующей wiki-link цели больше не собирает отдельный lookup ветки карты, а использует `isUnderTemplate(page.id, 'campaignMap')`.
- Sidebar search переведен на `searchPages()`, который берет страницы из `PageRepository`.
- Добавлены unit-тесты `tests/wikiLinkLookup.test.mjs` и `tests/searchPages.test.mjs`.

### Что поменялось для пользователя

- Wiki-links должны стабильнее находить карточки по названию и alias.
- В popup "Связать с существующей" не должны попадать технические дубли из веток карт.
- Поиск в sidebar визуально работает как раньше, но его логика стала единообразной и тестируемой.

### Риски / Что осталось

- В wiki/create/search еще есть локальная фильтрация и parse body. Это нормально для текущего этапа, но будущий `PageRepository` может получить отдельный full-text/search индекс.
- Следующий важный шаг — `6.6`: перевести проверку дублей названий на `PageIndex`.

---

## 2026-05-25: PageRepository Lifecycle 6.3

### Что сделано

- Создан `js/repository/pageRepository.js` как единый runtime-слой поверх `PageIndex`.
- Repository подписан на `setPages`, поэтому массовая замена списка страниц автоматически пересобирает индекс.
- `loadWorkspace()` теперь фиксирует результат сканирования через `setPages([...state.pages])`, чтобы индекс видел загруженные страницы.
- `writePageFile()` при создании страницы больше не делает только прямой `state.pages.push`, а обновляет список через `setPages`.
- Переносы, aliases, autosave, сохранение карт/таск-трекеров, создание предметов и нормализация дублей карты теперь вызывают lifecycle notify для repository.
- Добавлены unit-тесты `tests/pageRepository.test.mjs` на rebuild после `setPages`, rename/tag/type/alias update, move и delete.
- Обновлен `docs/PAGE_REPOSITORY_CONTRACT.md`: зафиксирована текущая реализация 6.3 и Definition of Done.

### Что стало лучше

- У проекта появился живой индекс страниц, а не только тестируемая структура данных.
- Новый код может обращаться к `PageRepository` сразу, не дожидаясь полного перевода всех legacy-модулей.
- Индекс меньше рискует рассинхронизироваться после загрузки, создания, удаления, переименования и переноса страниц.

### Риски / Что осталось

- Update-операции пока делают полный rebuild. Это безопасно, но в будущем можно заменить часть операций на точечное обновление индекса.
- Большая часть feature-кода все еще читает `state.pages` напрямую. Следующий пункт — перевести wiki-links на `PageRepository / PageIndex`.

### Следующее развитие

- Выполнить `6.4`: перевести wiki-links на `PageIndex`, чтобы поиск target по title/aliases шел через единый repository.

---

## 2026-05-25: PageIndex 6.2

### Что сделано

- Создан `js/repository/pageIndex.js`.
- Добавлен чистый `PageIndex` без DOM и browser API.
- Реализованы индексы по `id`, `title`, `aliases`, `parent`, `template`, `type`, `tags`.
- Добавлены методы чтения: `getPageById`, `getPageByTitle`, `findPageByTitleOrAlias`, `getChildren`, `getSiblings`, `getParentChain`, `isDescendantOf`, `isUnderTemplate`, `queryPages`, `findDuplicateTitles`.
- Добавлены unit-тесты `tests/pageIndex.test.mjs`.
- В плане пункт `6.2` отмечен как сделанный, а `6.9` как частично сделанный.

### Что стало лучше

- Появился первый кодовый слой для будущего `PageRepository`.
- Lookup по основным metadata теперь можно тестировать без UI и workspace.
- Следующие миграции wiki-links, search, duplicates и campaign map picker смогут опираться на один индекс.

### Оставшиеся риски

- `PageIndex` пока не подключен к runtime lifecycle.
- Существующий UI-код все еще напрямую обходит `state.pages`.
- Browser regression для UI-потребителей появятся после перевода первых подсистем.

### Следующее развитие из этой работы

- Выполнить `6.3`: сделать lifecycle индекса через `PageRepository` или repository singleton.
- Подключить rebuild после `setPages` / `loadWorkspace`.
- После lifecycle начать перевод `wikiLinkLookup.js` на индекс.

---

## 2026-05-25: PageRepository 6.1

### Что сделано

- Проверен актуальный план перед стартом `6.1`: пункты 1-5 не блокируют проектирование `PageRepository`.
- Создан `docs/PAGE_REPOSITORY_CONTRACT.md`.
- В контракте описаны ответственность repository, будущий public API, lifecycle, правила запрета новых хаотичных lookup по `state.pages`, исключения переходного периода и первые подсистемы для миграции.
- В `README.md` добавлен раздел `PageRepository` с кратким правилом для нового кода.
- В `docs/PLANS_AND_TECH_DEBT.md` пункт `6.1` отмечен как сделанный, а текущий следующий шаг изменен на `6.2 Создать PageIndex`.

### Что стало лучше

- У будущей миграции к `PageIndex` появился явный контракт.
- Новые фичи теперь должны добавлять недостающий метод в repository, а не писать локальный обход `state.pages`.
- Переходный период описан честно: legacy-код пока остается, но новый код должен идти через repository.

### Оставшиеся риски

- Кодового `PageRepository / PageIndex` еще нет.
- В проекте остается много прямых lookup по `state.pages`; это будет закрываться пунктами `6.2-6.8`.
- Пока нет автоматической проверки, запрещающей новые lookup по `state.pages`.

### Следующее развитие из этой работы

- Реализовать `6.2 Создать PageIndex`: индексы по `id`, `title`, `aliases`, `parent`, `type`, `tags`.
- Добавить unit tests для базовых index-операций.
- После этого начать переводить `wikiLinkLookup.js`, `search.js`, `pageTitleValidation.js` и `campaignMapPicker.js`.

---

# Архив исходного файла планов и техдолга

Этот файл является рабочим журналом архитектурных решений. После крупных изменений нужно добавлять сюда короткий анализ: что стало лучше, какие риски остались и какой следующий шаг логично сделать.

## Актуальный приоритетный план (обновлен 2026-05-25)

Этот раздел — верхний навигатор проекта. При новых задачах добавлять их как подпункты в существующую структуру, а не заводить параллельный устный план.

Оценка обновленного списка: порядок в целом правильный. Первые шесть пунктов являются фундаментом зрелости продукта: данные, безопасность, CI, assets, производительность и релизы. Фичи карты, onboarding, graph и desktop лучше делать после них или параллельно только маленькими безопасными кусками. Самый важный практический эффект даст `PageRepository / PageIndex`, потому что он разгрузит `state.pages`, ускорит lookup и станет базой для wiki-links, поиска, карты, шаблонов, проверки дублей, graph и будущих фич.

### 1. PageRepository / PageIndex

- Статус: **не сделано**.
- Приоритет: **P0**.
- Почему здесь: это главный слой данных, который должен заменить хаотичные lookup по `state.pages`.

1.1. Спроектировать `PageRepository`: **не сделано**.
Определить ответственность, описать public API, запретить хаотичные lookup по `state.pages` в новом коде.

1.2. Создать `PageIndex`: **не сделано**.
Индексы: по `id`, `title`, `aliases`, `parent`, `type`, `tags`.

1.3. Сделать lifecycle индекса: **не сделано**.
`rebuild` после load, `update` после create, rename, move, delete, tag/type change.

1.4. Перевести wiki-links на `PageIndex`: **не сделано**.

1.5. Перевести поиск на `PageIndex`: **не сделано**.

1.6. Перевести проверку дублей на `PageIndex`: **не сделано**.

1.7. Перевести campaign map picker/player lookup на `PageIndex`: **не сделано**.

1.8. Добавить unit/browser regression для `PageIndex`: **не сделано**.

### 2. Safe HTML Boundary / Sanitizer

- Статус: **не сделано**.
- Приоритет: **P0**.
- Почему здесь: это главный security blocker перед web/cloud и важная защита local workspace от мусора в HTML.

2.1. Описать Safe HTML Contract: **не сделано**.
Что можно сохранять, что нельзя сохранять, что является runtime UI, что является persistent content.

2.2. Составить allowlist HTML: **не сделано**.
Text blocks, headings, links, wiki-links, tables, images, campaign map shell, task tracker shell.

2.3. Реализовать sanitizer на save: **не сделано**.

2.4. Реализовать sanitizer на load/open: **не сделано**.

2.5. Реализовать paste sanitization: **не сделано**.

2.6. Добавить security regression tests: **не сделано**.
Forbidden tags, script injection, unsafe attributes, malformed HTML, runtime controls leakage.

### 3. CI на GitHub Actions

- Статус: **не сделано**.
- Приоритет: **P0**.
- Почему здесь: локальные проверки уже есть, но они должны стать обязательным защитным контуром.

3.1. Добавить `.github/workflows/verify.yml`: **не сделано**.

3.2. Запускать `npm ci`: **не сделано**.

3.3. Запускать `npm run verify`: **не сделано**.

3.4. Запускать browser tests: **не сделано**.

3.5. Добавить artifact/logs при падении Playwright: **не сделано**.

3.6. Зафиксировать правило: перед merge/push зеленый CI обязателен: **не сделано**.

### 4. Asset Lifecycle Contract

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: картинки уже активно используются, а новая идея про музыку локаций добавляет audio/playlist assets.

4.1. Описать `ASSET_LIFECYCLE_CONTRACT.md`: **не сделано**.

4.2. Определить типы assets: **не сделано**.
`image`, `portrait`, `map background`, `audio`, `playlist`, future media.

4.3. Ввести единый `AssetReference`: **не сделано**.
`id/path`, `type`, `owner`, `fallback`, `missing state`.

4.4. Сделать broken asset checker: **не сделано**.

4.5. Сделать orphan asset detection: **не сделано**.

4.6. Подготовить основу под музыку локаций: **не сделано**.

4.7. Добавить asset tests: **не сделано**.

### 5. Performance Strategy Для Карты

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: карта уже является тяжелой runtime-системой, оптимизации должны стать измеримыми.

5.1. Описать performance risks карты: **не сделано**.
Много токенов, много фигур, большой background, fog, presentation sync, zoom/pan.

5.2. Ввести performance scenarios: **не сделано**.

5.3. Добавить измерения: **не сделано**.
Render time, sync time, number of visible objects, background load.

5.4. Ввести performance budgets: **не сделано**.

5.5. Оптимизировать presentation full-sync: **не сделано**.

5.6. Добавить performance regression smoke: **не сделано**.

### 6. Release Process / Changelog

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: версии уже используются в коммитах, но релизный процесс не формализован.

6.1. Создать `CHANGELOG.md`: **не сделано**.

6.2. Описать release checklist: **не сделано**.

6.3. Согласовать `package.json` version с git tags: **не сделано**.

6.4. Ввести правило версий: **не сделано**.
`patch`, `minor`, `major`, `experimental`.

6.5. Добавить rollback guide: **не сделано**.

6.6. Добавить release notes template: **не сделано**.

### 7. Campaign Map Initiative

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: важная игровая фича, но лучше строить ее на `PageIndex` и текущем map model.

7.1. Спроектировать `InitiativeModel`: **не сделано**.

7.2. Подключить живые токены карты: **не сделано**.

7.3. Учесть `sourceMode="original"` для игроков: **не сделано**.

7.4. Сделать popup выбора участников: **не сделано**.

7.5. Добавить `roll d20`: **не сделано**.

7.6. Добавить initiative modifier: **не сделано**.

7.7. Сделать сортировку порядка: **не сделано**.

7.8. Сделать active turn / next / previous: **не сделано**.

7.9. Сохранение/восстановление инициативы: **не сделано**.

7.10. Browser regression initiative: **не сделано**.

### 8. Campaign Map Layers

- Статус: **не сделано**.
- Приоритет: **P1**.
- Почему здесь: слои нужны перед массовым select и сложными fog/object сценариями.

8.1. Спроектировать `LayerModel`: **не сделано**.

8.2. Ввести z-order для token/shape/object: **не сделано**.

8.3. UI управления слоями: **не сделано**.

8.4. Visibility per layer/object: **не сделано**.

8.5. Serializer/restore layers: **не сделано**.

8.6. Browser regression layers: **не сделано**.

### 9. Разрез Крупных Файлов

- Статус: **в работе**.
- Приоритет: **P1**.
- Почему здесь: проект уже большой, а крупные файлы повышают риск регрессий.

9.1. Разрезать `editor.js`: **не сделано**.

9.2. Разрезать `toolbar.js`: **не сделано**.

9.3. Разрезать `blockContract.js`: **не сделано**.

9.4. Разрезать `campaignMapPresentation.js`: **не сделано**.

9.5. Разрезать `tables.js`: **не сделано**.

9.6. После каждого разреза запускать full regression: **правило принято**.

### 10. UX / Onboarding Layer

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: продукт становится мощным, но новому пользователю нужна входная траектория.

10.1. Создать sample workspace: **не сделано**.

10.2. Сделать стартовый tutorial: **не сделано**.

10.3. Добавить "как устроен продукт" внутри приложения: **не сделано**.

10.4. Добавить onboarding для карточек, дерева, wiki-links, карты, task tracker: **не сделано**.

10.5. Добавить UX checklist: **не сделано**.

### 11. Workspace Templates

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: шаблоны должны жить вместе с миром, а не только в браузере.

11.1. Перенести templates из `localStorage` в workspace-файл: **не сделано**.

11.2. Сделать template serializer: **не сделано**.

11.3. Сделать migration старых templates: **не сделано**.

11.4. Добавить поиск по шаблонам: **не сделано**.

11.5. Добавить browser tests: **не сделано**.

### 12. Knowledge Graph

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: wiki-links уже есть, но мир пока больше tree-first, чем graph-first.

12.1. Описать graph model: **не сделано**.

12.2. Добавить typed relationships: **не сделано**.

12.3. Добавить orphan pages view: **не сделано**.

12.4. Добавить backlinks improvements: **не сделано**.

12.5. Позже — graph view: **не сделано**.

### 13. AI Onboarding Guide

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: проект активно развивается через AI, поэтому входной документ снизит риск потери контекста.

13.1. Создать `AI_ONBOARDING.md`: **не сделано**.

13.2. Кратко описать архитектуру: **не сделано**.

13.3. Описать "что нельзя ломать": **не сделано**.

13.4. Описать обязательные проверки перед изменениями: **не сделано**.

13.5. Описать формат задач для Codex: **не сделано**.

### 14. Desktop Adapter Plan

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: desktop естественно подходит local-first продукту, но сначала нужен план адаптеров.

14.1. Описать desktop target: **не сделано**.

14.2. Выбрать Tauri/Electron для spike: **не сделано**.

14.3. Спроектировать `StorageAdapter`: **не сделано**.

14.4. Спроектировать `AssetAdapter`: **не сделано**.

14.5. Сделать desktop smoke checklist: **не сделано**.

14.6. Позже — prototype: **не сделано**.

### 15. CSS Separation

- Статус: **не сделано**.
- Приоритет: **P2**.
- Почему здесь: CSS уже разросся, но лучше резать после стабилизации core-архитектуры.

15.1. Разрезать `campaign-map.css`: **не сделано**.

15.2. Разрезать `popup.css`: **не сделано**.

15.3. Разрезать `block-special.css`: **не сделано**.

15.4. Ввести CSS ownership comments: **не сделано**.

15.5. Проверить visual regression: **не сделано**.

### 16. Campaign Map UX-Доработки

- Статус: **не сделано**.
- Приоритет: **P2/P3**.
- Почему здесь: это полезные UX-фичи, но они должны идти после слоев, assets и performance strategy.

16.1. Mass select: **не сделано**.

16.2. Context menu "открыть изображение": **не сделано**.

16.3. Hidden hero visibility icon: **не сделано**.

16.4. Square fog brush: **не сделано**.

16.5. Locked fog zones: **не сделано**.

## Предыдущий рабочий план и история выполнения

### 1. Smoke / Regression Tests

- Статус: **в работе**.
- Текущий активный подпункт: **6.2 Инициатива на карте**.

1.1. Smoke app shell: **сделано**.

1.2. Unit-тесты дерева: drop intent / move planner: **сделано**.

1.3. Unit-тесты карты: model / serializer / store: **сделано**.

1.4. Browser smoke карты save/reload: token, shape, grid, fog, viewport: **сделано**.

1.5. Browser regression удаления токена: удалить дочернюю карточку из дерева -> токен исчезает с открытой и закрытой карты: **сделано**.

1.6. Browser UI flow карты через кнопку `+`: picker, копии, папки `Существа.Карта` / `Объекты.Карта`: **сделано**.

1.7. Browser smoke presentation sync: **сделано**.

1.8. Browser tests форматирования текста: **сделано**.

1.9. Browser tests task tracker: **сделано**.

1.10. Browser tests шаблонов: **сделано**.

### 2. Tree Pointer-Based DnD

- Статус: **архитектурно сделано**.

2.1. Pointer DnD вместо HTML5 DnD: **сделано**.

2.2. Preview / placeholder / stable drop intent: **сделано**.

2.3. Тесты расчетов drop intent и move planner: **сделано**.

2.4. Дополнительные browser regression tests дерева: **сделано**.

### 3. Campaign Map Data-First Save

- Статус: **архитектурно сделано**.

3.1. `CampaignMapModel`: **сделано**.

3.2. `CampaignMapStore`: **сделано**.

3.3. Data-first serializer: **сделано**.

3.4. Drag стартует из store, не из `dataset`: **сделано**.

3.5. Закрытые карты патчатся через model/data-first путь: **сделано**.

3.6. Browser save/reload regression: **сделано**.

3.7. Render adapter `CampaignMapModel -> DOM`: **сделано**.

3.8. Убрать compatibility helpers `commitTokenModelToElement()` / `commitShapeModelToElement()`: **сделано**.

### 4. Editor History Contract

- Статус: **архитектурно сделано, нужны дальнейшие regression tests по мере расширения редактора**.

4.1. Описать единый контракт истории: **сделано**.

4.2. Ctrl+Z / Ctrl+Y через управляемую историю: **сделано**.

4.3. Вставка текста как history action: **сделано**.

4.4. Форматирование как history action: **сделано**.

4.5. Блоки / таблицы / wiki-links как structural actions: **сделано**.

### 5. FormattingService

- Статус: **архитектурно сделано, deprecated fallback еще нужно заменить собственной реализацией позже**.

5.1. Изолировать `execCommand` как fallback: **сделано**.

5.2. Описать правила форматирования: **сделано**.

5.3. Убрать прямую зависимость toolbar от deprecated API: **сделано**.

### 6. Campaign Map Tactical Features

- Статус: **новый приоритетный блок, не сделано**.
- Приоритет: **средне-высокий после 5.2/5.3**, потому что это активно развивает карту, но часть пунктов лучше делать после PageRepository/PageIndex и дальнейшего укрепления map model.

6.1. Игроки на карте без дубля в дереве: **сделано**.
Приоритет: **P1**. Добавить в `+` отдельное действие "Игрок"; при выборе карточки с тегом `player` токен привязывается к оригинальной карточке, а не создает дочерний дубль. При drag из дерева карточки с тегом `player` применять тот же режим. Важно для хитов и инвентаря оригинала.

6.2. Инициатива на карте: **не сделано**.
Приоритет: **P1**. Кнопка "Инициатива", popup выбора живых существ на карте, `roll d20`, сортировка порядка. Лучше опираться на живые токены и будущий PageIndex/характеристики.

6.3. Слои карты и порядок объектов: **не сделано**.
Приоритет: **P1**. Нужен явный model-first слой для token/shape/object order, UI управления слоями и сохранение порядка в карте.

6.4. Массовый select существ и объектов: **не сделано**.
Приоритет: **P2**. Делать после слоев, потому что массовые действия должны понимать порядок, группы и типы элементов.

6.5. Контекстное меню "открыть изображение": **не сделано**.
Приоритет: **P2**. Быстрое улучшение UX: popup с картинкой существа/объекта из карточки или asset. Можно делать независимо.

6.6. Скрытый герой в презентации не исчезает, а получает значок скрытия: **не сделано**.
Приоритет: **P2**. Это меняет правило presentation visibility только для player/hero-сущностей; нужно аккуратно не сломать скрытие монстров и объектов.

6.7. Квадратная кисть тумана войны: **не сделано**.
Приоритет: **P3**. Расширение fog brush shape: circle/square. Низкий риск, но не блокирует основные сценарии.

6.8. Locked fog zones: **не сделано**.
Приоритет: **P3**. Зоны тумана, которые нельзя стереть кистью, а можно скрывать/удалять отдельно. Архитектурно ближе к shapes/fog layers, делать после слоев.

6.9. Музыкальные плейлисты локаций из workspace: **не сделано**.
Приоритет: **P2**. Идея из `docs/Новые идеи к адаптации.txt`: добавить проигрывание музыки из workspace с привязкой к локации, чтобы для выбранной локации или карты мог по кругу крутиться плейлист. Перед реализацией нужно спроектировать audio asset lifecycle, правила хранения ссылок на файлы, UI управления плейлистом и связь с карточками локаций через будущий `PageRepository / PageIndex`.

### 7. Шаблоны В Workspace

- Статус: **не сделано**.

7.1. Хранить шаблоны не в `localStorage`, а в файле workspace: **не сделано**.

7.2. UI удаления/создания шаблонов привязать к workspace-файлу: **не сделано**.

### 8. PageRepository / PageIndex

- Статус: **не сделано**.

8.1. Индекс по title / aliases / parent / type / tags: **не сделано**.

8.2. Перевести wiki-links, карту, поиск и проверку дублей на index: **не сделано**.

### 9. Safe HTML Boundary / Sanitizer

- Статус: **не сделано**.

9.1. Определить разрешенный HTML: **частично описано концептуально**.

9.2. Ввести sanitizer перед сохранением/открытием: **не сделано**.

### 10. Разрез Крупных Файлов

- Статус: **в работе**.

10.1. `campaignMap.js`: **сильно продвинулось**.

10.2. `blockContract.js`: **не сделано**.

10.3. `editor.js`: **не сделано**.

10.4. `toolbar.js`: **не сделано**.

10.5. `tables.js`: **не сделано**.

10.6. `campaignMapPresentation.js`: **не сделано**.

### 11. CSS Разделение

- Статус: **не сделано**.

11.1. `campaign-map.css`: **не сделано**.

11.2. `popup.css`: **не сделано**.

11.3. `block-special.css`: **не сделано**.

## 2026-05-21: Smoke/regression checklist и первый слой автотестов

### Что делаем

- Закрепляем `docs/SMOKE_TESTS.md` как обязательный checklist перед коммитами, которые затрагивают editor, tree, campaign map, task tracker, storage, block system или templates.
- Добавляем первый легкий автотестовый слой без браузерных зависимостей.
- Проверяем в автотестах только model/helper-код, чтобы тесты запускались быстро и не требовали выбранного workspace.
- Добавляем единую команду `npm run verify`, которая собирает базовые проверки в один запуск.
- Добавляем foundation для будущих browser smoke tests в `tests/browser/`.
- Подключаем Playwright как реальный browser runner и добавляем первый smoke `app-shell-empty-state`.

### Зачем это нужно

- Проект уже несколько раз ловил повторные регрессии в одних и тех же местах: tree drag/drop, сохранение после переноса, карта, презентация, форматирование, task tracker.
- Без тестового контура каждое крупное изменение требует длинной ручной проверки и все равно может пропустить старый сценарий.
- Первый слой тестов должен стать базой для дальнейшего Playwright/browser smoke, а не заменой ручного UI-чеклиста.

### Правила для тестов

- Тесты не должны изменять пользовательский workspace.
- Тесты не должны требовать реального File System Access API.
- Чистые модели и helper-слои проверяются через `node:test`.
- Перед коммитом основной командой считается `npm run verify`.
- Browser/UI-сценарии сначала описываются в checklist, затем постепенно переводятся в автоматизацию.
- Browser smoke сценарии фиксируются в `tests/browser/scenarios.mjs`, чтобы будущий Playwright runner не начинался с устной памяти.

### Browser smoke foundation

- `tests/browser/README.md` описывает правила будущих браузерных тестов, тестовый workspace и рекомендуемый runner.
- `tests/browser/scenarios.mjs` хранит приоритетный список сценариев:
  - `P0`: дерево после переноса и сохранения, свернутость дерева, карта с токеном, presentation sync;
  - `P1`: toolbar formatting boundary, task tracker DnD, popup viewport fit;
  - `P2`: создание карточки по шаблону.
- `tests/browser/app-shell.spec.mjs` уже проверяет базовый запуск приложения без workspace, пустой стартовый экран и отсутствие console/page errors.
- Browser smoke запускается командой `npm run test:browser`; она поднимает локальный static server через `tools/run_browser_smoke.mjs`.

### Следующее развитие из этой работы

- Добавить browser smoke для дерева, карты, task tracker и toolbar.
- После перевода дерева на pointer-based DnD добавить автотесты на расчет drop intent.
- После data-first save карты добавить тесты сериализации карты без DOM-клона.
- Добавить fixture workspace и начать автоматизацию `P0` сценариев из `tests/browser/scenarios.mjs`.

## 2026-05-21: Нумерация сущностей карты при добавлении через плюс

### Что сделано

- Исправлено создание дочерних дублей при добавлении существ и объектов на карту через toolbar `+`.
- Если пользователь указывает несколько копий, дубли теперь получают названия вида:
  - `Существо1.Название карты`;
  - `Существо2.Название карты`;
  - `Объект1.Название карты`;
  - `Объект2.Название карты`.
- Нумерация продолжает уже существующие дочерние сущности в папках `Существа.Название карты` и `Объекты.Название карты`, а не начинается каждый раз с `1`.
- Добавлен helper `getCampaignMapNumberedEntityTitle()` и unit-проверка формата названия.

### Риски

- Внешний drop из дерева на карту пока сохраняет старое правило с названием исходной карточки и `сущность.Название карты`; это отдельный сценарий и он не менялся.
- Если пользователь вручную переименует дочерние сущности не по шаблону, автоматическая нумерация просто пропустит такие имена.

### Следующее развитие из этой работы

- Добавить browser smoke fixture для сценария `campaign-map-token-flow`, чтобы проверить не только helper, но и реальные дочерние строки в дереве.

## 2026-05-21: Перевод дерева на pointer-based DnD

### Что сделано

- `js/tree/treeDragDrop.js` переведен с HTML5 `dragstart/dragover/drop` на pointer-based `pointerdown/pointermove/pointerup`.
- Дерево теперь использует floating preview и стабильный placeholder без зависимости от `dataTransfer`.
- Кнопки раскрытия и меню `...` не запускают перенос.
- Клик по строке после реального drag подавляется, чтобы страница не открывалась случайно после drop.
- Вынесен чистый helper `js/tree/treeDropIntent.js` для расчета `before` / `inside` / `after`.
- Добавлены unit-тесты для правил drop intent.
- Drop из дерева на карту сохранен через custom event `my-own-world:tree-page-pointer-drop`.

### Риски

- В `campaignMapExternalDrop.js` временно оставлены старые HTML5 drag/drop обработчики как fallback, но основной путь дерева теперь pointer-based.
- Для полного P0 browser regression нужен fixture workspace, чтобы автоматически проверить перенос внутри дерева и drop на карту.

### Следующее развитие из этой работы

- Добавить browser smoke для `tree-dnd-save-after-move`.
- После browser fixture проверить сортировку на одном уровне, вложение в дочернюю ветку и перенос в корень.
- Затем можно упростить fallback HTML5 drop-код карты, если pointer-based сценарий полностью покрыт тестами.

## 2026-05-21: Тестируемый planner переносов дерева

### Что сделано

- Добавлен `js/tree/treeMovePlanner.js`: чистый расчет того, какие `parent/order` нужно применить после drop.
- `treeDragDrop.js` больше не содержит собственную сортировку соседей, а применяет план из `createTreeMovePlan()`.
- Добавлены unit-тесты:
  - перенос внутрь target;
  - перенос в корень;
  - сортировка перед target на одном уровне;
  - сортировка после target на одном уровне.
- Вместе с уже добавленным `treeDropIntent.test.mjs` покрыты базовые сценарии: выше, ниже, внутрь, root и сортировка на одном уровне.

### Риски

- Это unit-покрытие расчета, а не браузерный full-flow. Реальный drag мышью по дереву всё ещё должен получить browser smoke с fixture workspace.

### Следующее развитие из этой работы

- Добавить Playwright fixture workspace и автоматизировать `tree-dnd-save-after-move`.
- После этого можно безопаснее переходить к `Campaign Map data-first save`.

## 2026-05-20: Task Tracker как третья самостоятельная сущность

### Что сделано

- Добавить отдельную сущность `taskTracker`, независимую от карточек и карты.
- В дереве Task Tracker будет жить рядом с карточками и картами, но иметь собственный editor UI.
- Делать систему model-first: persistent data хранится как структурированный JSON, а визуальный интерфейс строится runtime-рендером.
- Держать подсистему максимально detachable: отдельные файлы для модели, сериализации, шаблона, рендера, DnD, task UI и стилей.
- По умолчанию трекер создается с колонками:
  - `ИДЕИ`;
  - `В РАБОТЕ`;
  - `СДЕЛАНО`.
- В колонках можно создавать задачи с названием, описанием и чекбоксами.
- Задачи можно перетаскивать между колонками и внутри колонки.
- Колонки можно переименовывать и добавлять новые.
- Добавлена папка `js/taskTracker/` как самостоятельная подсистема.
- Добавлен шаблон `js/templates/taskTracker.js`.
- Добавлен стиль `styles/task-tracker.css`.
- Добавлен тип создания `taskTracker` в общий create menu и на пустой стартовый экран.
- Добавлена иконка `task-tracker` в общий SVG sprite.
- `editor.js` и `autosave.js` получили отдельные ветки открытия и сохранения Task Tracker.
- Persistent HTML трекера хранит только оболочку, заголовок и `<script type="application/json" class="task-tracker-data">`.
- Runtime-доска с колонками, задачами, кнопками и placeholder не является источником истины.

### Архитектурное правило для этой системы

- Не смешивать Task Tracker с карточными блоками и Campaign Map.
- Не сохранять runtime-кнопки и drag-placeholder в persistent HTML.
- Если функция может жить одна в файле и это не ухудшает понимание, выносить ее в отдельный файл.
- Если файл содержит несколько функций, они должны обслуживать одну маленькую ответственность.

### Риски

- Drag and drop больше не использует HTML5 API: задачи и колонки перенесены на pointer-based сценарий со стабильным placeholder.
- Если сохранить задачи как HTML, система быстро получит тот же долг, что старый `contenteditable`; поэтому JSON должен быть источником истины.
- Нужны smoke-сценарии: создать трекер, создать задачу, добавить чеклист, перенести задачу, переименовать колонку, сохранить и открыть заново.
- Удаление задач и колонок добавлено через model actions. При удалении колонки удаляются и задачи внутри нее.
- HTML5 drag/drop заменен на pointer-based DnD в `taskTrackerDnd.js`.
- Задачи и колонки теперь двигаются только за drag-handle `☰`, чтобы ввод текста, textarea и чекбоксы не конфликтовали с переносом.
- Добавлен floating preview и стабильные placeholder-ы для задач и колонок.
- Колонки раскладываются CSS-сеткой по 5 в ряд, затем переносятся на новую строку. На узких экранах сетка адаптивно уменьшается до 4/3/2 колонок.
- Остался UX-вопрос: нужно ли спрашивать подтверждение при удалении колонки с задачами или делать undo.

### Следующее развитие из этой работы

- После MVP связать задачи с карточками лора через wiki/page links.
- Позже добавить дедлайны, приоритеты, фильтры и архив задач.

## 2026-05-20: Campaign Map runtime и model-based presentation live-sync

### Что сделано

- Добавлен `js/editor/campaignMapRuntime.js`.
- Из `campaignMap.js` вынесены runtime-сценарии:
  - добавление токенов;
  - восстановление токенов;
  - расчет и применение состояния здоровья токена;
  - выбор токенов и фигур;
  - добавление и восстановление фигур;
  - смена изображения карты;
  - восстановление фонового изображения карты.
- `campaignMap.js` теперь ближе к роли bootstrap/orchestration:
  - подключает события;
  - связывает controllers;
  - маршрутизирует pointer/input/wheel события;
  - вызывает save/sync;
  - не хранит реализацию runtime-рендера токенов, фигур и фона.
- `scheduleLivePresentationSync()` переведен на новый контракт: `map + itemType + itemId`.
- `campaignMapTokenDrag.js` и `campaignMapShapeDrag.js` больше не передают в live-sync DOM-элемент как основной источник данных.
- `campaignMapPresentation.js` получил `syncPresentationItemById()`, который берет token/shape из `CampaignMapModel` и применяет состояние к презентации.
- Старый `syncPresentationItem(sourceItem)` оставлен как совместимый wrapper, чтобы забытый старый вызов не ломал карту, но новый рабочий путь идет через id и модель.
- `scheduleVisibleMapObjectsUpdate()` явно экспортируется из `campaignMapViewport.js`, чтобы качество фона и culling вызывались через понятный контракт.
- Добавлен `js/editor/campaignMapPointerController.js`.
- Из `campaignMap.js` вынесен pointer router:
  - pointerdown по токенам, фигурам, handles, карте и fog brush;
  - pointerover/pointerout для hover popup и подсветки дерева;
  - double click по токену;
  - wheel zoom;
  - document pointermove/pointerup lifecycle для token drag, shape drag, fog draw и pan.
- Добавлен `js/editor/campaignMapDragMeasure.js`.
- Вектор перемещения больше не синхронизируется в презентацию DOM-клоном SVG. Token drag передает данные о линии: начало, конец, позицию подписи и текст расстояния.
- `syncPresentationDragMeasure()` теперь получает payload оверлея и сам рисует/очищает measure в presentation window.

### Что стало лучше

- Presentation live-sync больше не клонирует исходный DOM-токен/фигуру при каждом drag/resize/rotate.
- Drag-слои теперь сообщают презентации только идентификатор сущности, а данные берутся из `CampaignMapModel`.
- Модель стала реальным посредником между интерактивным слоем карты и presentation window.
- `campaignMap.js` уменьшился и потерял часть ответственности за runtime DOM.
- `campaignMap.js` больше не владеет pointer router и fog drawing state.
- Последний DOM-хвост live-sync для drag-measure убран: presentation overlay строится из данных, а не из клона DOM.
- Следующие оптимизации можно делать в модели и render/controllers, не вскрывая один большой файл.

### Оставшиеся риски

- Full presentation sync всё ещё клонирует stage целиком. Это нормально для полного обновления, но не для частых операций.
- `campaignMap.js` всё ещё содержит title/input flow, save deps и сборку dependency-contracts для controllers.
- Нужен browser smoke test live-sync:
  - открыть презентацию;
  - двигать токен;
  - менять размер объекта;
  - вращать объект;
  - двигать/resize фигуру;
  - скрыть/показать token/shape.

### Следующее развитие из этой работы

1. Добавить browser smoke tests для карты и презентации.
2. Вынести title/input flow в `campaignMapTitleController.js`.
3. Когда save станет полностью data-first, рассмотреть `CampaignMapStore` как владелец model + dirty state.

## 2026-05-18: разрез Campaign Map на подсистемы

### Что сделано

- `js/editor/campaignMapGeometry.js` — вынесены геометрия, координаты, viewport helpers, расчет видимой области, spawn point, размеры токенов и базовая математика фигур.
- `js/editor/campaignMapBackground.js` — вынесены фон карты, full/low detail cache, переключение качества изображения и сброс кэша при смене картинки.
- `js/editor/campaignMapPresentationSync.js` — вынесены очереди live-sync презентации, throttling и отложенная синхронизация.
- `js/editor/campaignMapToolbar.js` — вынесены HTML-шаблоны toolbar и popup-ов карты.
- `js/editor/campaignMapShapes.js` — вынесен DOM-render фигур и применение их геометрии.
- `js/editor/campaignMapTokens.js` — вынесены DOM helpers токенов: позиция, размер, поворот, fallback-текст, картинка токена и resize/rotate handles.
- `js/editor/campaignMapFog.js` — вынесены fog canvas операции, кисть/ластик, fill/clear fog и UI-состояние fog/pan кнопок.
- `js/editor/campaignMapSerializerHelpers.js` — вынесены helpers для точечного изменения persistent HTML карты при удалении токенов из сохраненной страницы.
- `js/editor/campaignMapTreeIntegration.js` — вынесены связи карты с деревом: lookup страниц, проверка предков-карт, bucket-папки и подсветка карточек в дереве.
- `js/editor/campaignMapPicker.js` — вынесен popup добавления существ/объектов на карту, поиск, выбор нескольких карточек, количество копий и создание дочерних дублей.
- `js/editor/campaignMapTokenActions.js` — вынесены действия над токенами: открыть карточку, удалить, скрыть, дублировать, изменить хиты и создать стат-блок при необходимости.
- `js/editor/campaignMapTokenDrag.js` — вынесена state machine для drag/resize/rotate токенов и вектор перемещения.
- `js/editor/campaignMapShapeDrag.js` — вынесена state machine для drag/resize фигур.
- `js/editor/campaignMapModel.js` — добавлен первый `CampaignMapModel`: нормализованный слепок `asset`, `grid`, `fog`, `view`, `tokens`, `shapes` из текущего DOM.
- `js/editor/campaignMapConstants.js` расширен константами, которые раньше жили внутри большого файла карты.
- После коммита `v.2.0.6` модель расширена методами `addToken`, `moveToken`, `resizeToken`, `rotateToken`, `addShape`, `moveShape`, `resizeShape`, `setGrid`, `updateFog`, `setView` и commit helpers для DOM-элементов.
- Добавлены `removeToken`, `removeShape`, `replaceTokens`, `replaceShapes`.
- `js/editor/campaignMapElementFactory.js` — выделено создание DOM-токенов и DOM-фигур из записей модели.
- `js/editor/campaignMapRenderer.js` — выделено применение визуального состояния токенов и фигур к DOM.
- `js/editor/campaignMapSaveController.js` — выделен порядок save/sync: title карты, refresh модели, сохранение страницы, sync презентации.
- `js/editor/campaignMapViewport.js` — вынесены viewport structure, pan/zoom, culling offscreen-объектов и визуальные настройки сетки.
- `js/editor/campaignMapPopupController.js` — вынесен общий контейнер popup-ов карты, повторный клик по кнопке, позиционирование и закрытие по клику снаружи.
- `js/editor/campaignMapToolbarController.js` — вынесены действия тулбара карты: добавить, рука, сетка, смена карты, презентация, фигуры, туман.
- `js/editor/campaignMapTokenPopupController.js` — вынесены hover-попапы токенов/фигур, меню существа, действия и изменение хитов.

### Текущее состояние после разреза

- `campaignMap.js` уменьшен примерно с 6565 до 3199 строк.
- Главный файл всё ещё остается orchestration-центром: viewport, popups, создание сущностей, render карты, save и связывание модулей.
- Поведение токенов и фигур больше не хранит локальное состояние в `campaignMap.js`; оно управляется отдельными модулями через явные dependency-контракты.
- Добавление существ/объектов вынесено в отдельный picker, поэтому следующий шаг к `CampaignMapModel` можно делать без повторного вскрытия popup-логики.
- `CampaignMapModel` уже обновляется после render, после создания токенов/фигур и перед сохранением. Пока это совместимый слой поверх DOM, а не полная замена DOM как источника истины.
- Создание/дублирование токенов и фигур, drag/resize/rotate токенов, drag/resize фигур, сетка, fog mode/brush и viewport уже проходят через модельные методы.
- Удаление токенов/фигур теперь тоже обновляет модель перед удалением DOM.
- Presentation full-sync обновляет модель перед сборкой презентационного clone и использует модель для удаления скрытых элементов из презентации.
- Save/sync orchestration вынесен из `campaignMap.js` в отдельный controller.
- `campaignMap.js` больше не хранит состояние pan/culling и не создает общий popup-контейнер напрямую.
- `campaignMap.js` больше не хранит token popup timers и не строит popup-разметку для токенов.
- Кнопки тулбара карты теперь маршрутизируются через отдельный controller.

### Что стало лучше

- У карты появились явные технические границы: geometry, background, presentation sync, toolbar, shapes, tokens, fog.
- Производительные части карты больше не смешаны с UI-разметкой popup-ов.
- Восстановление картинки токена больше не зависит от внутреннего кэша фоновой карты и использует asset storage напрямую.
- Патчинг сохраненного HTML карты отделен от runtime UI-событий.
- Следующие изменения можно делать точечно: например менять fog без чтения token popup логики.
- Drag/resize/rotate больше изолированы как маленькие интерактивные state machines.
- Token actions отделены от pointer interactions: удалить/дублировать/HP теперь можно развивать без риска сломать перетаскивание.
- Tree integration получила отдельный слой, а значит фильтры выбора карточек и подсветка дерева больше не размазаны по карте.
- Появилась точка перехода к data-first архитектуре: новые оптимизации карты можно будет делать через `CampaignMapModel`, а не через поиск по DOM.
- У интерактивных операций появился единый путь: изменить модель, затем применить модель к DOM. Это снижает риск, что разные модули запишут несовместимые `dataset`.
- DOM creation и DOM render больше не смешаны с action/drag-логикой.
- Viewport стал отдельной подсистемой, поэтому будущая оптимизация карты может менять culling/zoom/pan без чтения popup и token action кода.
- Крупный разрез `campaignMap.js` на подсистемы завершен: основной файл стал bootstrap/orchestration, а не владельцем всех behavior-сценариев.

### Оставшиеся риски

- `campaignMap.js` всё ещё слишком большой для спокойной разработки.
- В главном файле остались крупные зоны:
  - popup rendering и позиционирование popup-ов карты;
  - создание карты, фон, grid controls и viewport/pan;
  - save orchestration и сериализация HTML;
  - часть presentation coordination;
  - поиск активных DOM-элементов при render/reload.
- Нужно прогнать ручной browser smoke test на карте, потому что разрез затронул runtime modules и import graph.
- В проекте всё ещё много `innerHTML`; для локального режима это терпимо, для web это security blocker.
- `CampaignMapModel` всё ещё восстанавливается из DOM при render/save, поэтому DOM не полностью потерял роль источника истины.
- Presentation live-sync отдельных элементов всё ещё получает source DOM item. Full-sync уже сверяется с моделью, но live-sync лучше позже перевести на `tokenId/shapeId + model`.
- Save карты теперь строит persistent HTML через `CampaignMapModel`, но runtime-события ещё частично обновляют DOM и затем освежают модель.
- Документация и некоторые старые строки в исходниках могут отображаться как mojibake в консоли Windows. Нельзя лечить это runtime-декодированием; нужно исправлять источник только при отдельной задаче на документацию/кодировку.

### Следующее развитие из этой работы

1. Перевести presentation live-sync на `tokenId/shapeId + CampaignMapModel`, чтобы drag не передавал DOM-элементы между слоями.
2. Добавить browser smoke tests для карты:
   - открыть карту;
   - добавить token;
   - переместить token;
   - сохранить/reload;
   - проверить координаты, fog и presentation sync.
3. После стабилизации карты перейти к desktop app spike: проверить Tauri/Electron как оболочку для локального приложения.

## 2026-05-25: Campaign Map 6.1

### Что сделано

- Закрыт пункт 6.1: в `+` карты добавлен отдельный режим `Игрок`.
- Picker игроков показывает карточки `character` / `creature` с тегом `player`, если они не лежат внутри карты.
- При добавлении игрока карта создает только токен и привязывает его к оригинальной карточке через `data-source-mode="original"`.
- Drag карточки с тегом `player` из дерева на карту использует тот же режим: без bucket и без дочернего дубля.
- Обычные существа и объекты продолжают создаваться как дочерние копии в папках карты.
- Удаление и дублирование original-linked токена не удаляет и не дублирует оригинальную карточку игрока.

### Что стало лучше

- Игроки на карте теперь могут работать с оригинальной карточкой, а значит хиты и будущий инвентарь меняются в одном источнике.
- В модели токена появился `sourceMode`, который явно разделяет дочерние копии карты и ссылки на оригинал.

### Оставшиеся риски

- Нужен отдельный UX для отображения original-linked игроков в контекстном меню и списках будущей инициативы.
- Нужно продумать, можно ли одному и тому же игроку находиться на нескольких картах одновременно и как это показывать в поиске.

### Следующее развитие из этой работы

1. Перейти к `6.2`: инициатива на карте.
2. При реализации инициативы учитывать `sourceMode="original"`, чтобы игроки брались из оригинальных карточек.

## 2026-05-25: FormattingService 5.3

### Что сделано

- Закрыт пункт 5.3: toolbar больше не записывает history snapshots для formatting actions напрямую.
- Inline-команды, reset format и применение цвета проходят через history-aware методы `formattingService.js`.
- Block formatting (`p`, `h1`-`h4`) перенесен из `toolbar.js` в `formattingService.js`.
- Логика выбора block targets, замены тега, восстановления выделения и нормализации вложенных заголовков теперь находится рядом с остальными правилами форматирования.
- `toolbar.js` стал тоньше: он восстанавливает selection, вызывает сервис и обновляет UI.

### Что стало лучше

- FormattingService теперь отвечает не только за deprecated fallback, но и за единое поведение форматирования.
- Следующие изменения toolbar меньше рискуют сломать историю редактора или границы persistent editable.
- Block formatting стало проще тестировать и заменять независимо от UI.

### Оставшиеся риски

- Inline formatting все еще использует `execCommand` как fallback внутри сервиса.
- Нужны дополнительные browser regression tests на цвет, reset format, списки и заголовки.

### Следующее развитие из этой работы

1. По основному плану можно переходить к `6.1`: игроки на карте без дубля в дереве.
2. Внутри блока тестов добавить отдельные regression tests для FormattingService, когда снова будем расширять редактор.

## 2026-05-25: FormattingService 5.2

### Что сделано

- Закрыт пункт 5.2: добавлен `docs/FORMATTING_SERVICE_CONTRACT.md`.
- В контракте зафиксированы правила для persistent editable-зон, inline formatting, block formatting, цвета, reset format, paste и состояния toolbar.
- `formattingService.js` получил allowlist поддерживаемых inline-команд, чтобы неизвестные команды не уходили в deprecated fallback.
- `queryInlineFormattingState()` и `insertPlainTextFallback()` теперь также проверяют persistent selection.
- README ссылается на новый контракт форматирования.

### Что стало лучше

- Правила форматирования больше не живут только в памяти и в поведении toolbar.
- Следующая замена `execCommand` сможет сохранить public API сервиса и не переписывать UI.
- Риск случайно применить форматирование вне editable-зоны стал ниже.

### Оставшиеся риски

- Block formatting (`p`, `h1`-`h4`) пока физически остается в `toolbar.js`.
- Deprecated fallback все еще используется внутри `formattingService.js`, пока не появится собственная Range/DOM-реализация.

### Следующее развитие из этой работы

1. Закрыть пункт 5.3: перенести block formatting и историю formatting actions из toolbar в сервисный слой.
2. После этого расширить browser regression tests на цвет, reset format, списки и заголовки.

## 2026-05-25: FormattingService 5.1

### Что сделано

- Закрыт пункт 5.1: прямые обращения к deprecated command API из редактора убраны.
- `document.execCommand()` и `document.queryCommandState()` теперь находятся только внутри `formattingService.js`.
- `toolbar.js` получает состояние форматирования через `queryInlineFormattingState()`.
- `editor.js` использует `insertPlainTextFallback()` для paste, а ручной DOM fallback остается ниже.
- Browser formatting regression расширен проверкой public API состояния форматирования.

### Что стало лучше

- Deprecated API теперь изолирован в одном сервисе, его будет проще заменить на собственный formatting layer.
- Toolbar и editor больше не знают, каким браузерным механизмом выполняется inline formatting или paste fallback.

### Оставшиеся риски

- Само форматирование все еще выполняется через browser fallback, а не через собственную модель.
- Правила форматирования еще нужно формально описать в пункте 5.2.

### Следующее развитие из этой работы

1. Делать пункт 5.2: описать правила FormattingService для заголовков, обычного текста, списков, цвета и reset format.
2. Затем закрывать 5.3: убрать оставшуюся архитектурную зависимость toolbar от деталей форматирования.

## 2026-05-25: приоритизация новых доработок карты

### Что добавлено в план

- Добавлен новый блок `6. Campaign Map Tactical Features`.
- Новые доработки карты разложены по важности:
  - P1: игроки без дубля, инициатива, слои;
  - P2: массовый select, открыть изображение, особое отображение скрытого героя;
  - P3: квадратная кисть тумана, locked fog zones.

### Почему такой порядок

- Игроки без дубля важны первыми, потому что меняют модель привязки токена к карточке и дают прямое редактирование хитов/инвентаря оригинала.
- Инициатива и слои усиливают карту как боевой инструмент, но требуют аккуратного model-first хранения порядка и участников.
- Массовый select лучше делать после слоев, иначе групповые операции быстро начнут конфликтовать с порядком и видимостью.
- Fog-улучшения полезны, но меньше влияют на базовую кампанию, поэтому они ниже.

### Следующее развитие из этой работы

1. По текущему плану сначала закрыть `5.2` и `5.3` для FormattingService.
2. Затем можно брать `6.1`: игроки на карте без создания дублей в дереве.

## 2026-05-25: Editor History 4.2-4.5

### Что сделано

- `editorHistory.js` переведен на page-scoped undo/redo stacks.
- Добавлен `redoEditorHistory()` и поддержка `Ctrl+Y` / `Ctrl+Shift+Z`.
- История теперь хранит persistent snapshots через `serializePersistentEditorHTML()` для карточек, а runtime UI восстанавливается после undo/redo.
- Добавлен transaction API: `beginHistoryTransaction()`, `commitHistoryTransaction()`, `runHistoryTransaction()`.
- Paste, toolbar formatting/link actions, block add/delete/drag, table row/width/alignment/paste и wiki-link connect теперь пишут историю через общий слой.
- Добавлен browser regression `editor-history-undo-redo-restores-persistent-html-without-runtime-ui`.

### Что стало лучше

- `Ctrl+Z` и `Ctrl+Y` больше не являются смесью случайного браузерного undo и ручных DOM-патчей для основных действий приложения.
- Undo/redo привязаны к текущей странице и не должны переносить снимки между карточками.
- Persistent snapshot защищен от runtime controls: UI может восстановиться после undo, но сохраненный HTML остается чистым.

### Оставшиеся риски

- История все еще snapshot-based, а не diff/model-based. Для больших страниц это может быть тяжелее, чем будущая модель документа.
- Обычный набор текста пока сохраняется через snapshots на `beforeinput`; группировка по паузам еще не сделана.
- Некоторые редкие подсистемы вроде image crop и variables могут потребовать отдельного подключения к transaction API при следующей работе с ними.

### Следующее развитие из этой работы

1. Перейти к пункту 5.2: описать и закрепить правила FormattingService.
2. Позже добавить дополнительные browser regression tests на реальные UI-сценарии: удалить блок -> undo, resize таблицы -> undo, wiki-link connect -> undo.

## 2026-05-25: Editor History Contract

### Что сделано

- Закрыт пункт 4.1: создан `docs/EDITOR_HISTORY_CONTRACT.md`.
- В контракте описаны `History Action`, `Snapshot`, `Transaction`, `Selection Bookmark`, page-scoped history, save/redo/selection contract.
- Зафиксировано, что runtime UI и элементы с `data-runtime="true"` не должны попадать в undo/redo snapshot.
- В README добавлена ссылка на контракт истории.
- В `editorHistory.js` уточнен комментарий: текущий модуль является временным слоем до полного history service.

### Что стало лучше

- Следующие пункты 4.2-4.5 можно делать не как набор разрозненных исправлений, а как перевод конкретных действий на один контракт.
- Появился явный список P0/P1 regression сценариев для будущего `Ctrl+Z / Ctrl+Y`.
- Граница между persistent content и runtime UI закреплена именно для history, а не только для save.

### Оставшиеся риски

- Это документационный шаг: полноценный redo, page-scoped stacks и transaction API еще не реализованы.
- Текущий `editorHistory.js` по-прежнему snapshot-based и частично зависит от браузерного undo для обычного ввода.

### Следующее развитие из этой работы

1. Делать пункт 4.2: реализовать управляемый `Ctrl+Z / Ctrl+Y` с undo/redo stack на страницу.
2. После 4.2 перевести paste на transaction как пункт 4.3.

## 2026-05-24: tree regression и render adapter карты

### Что сделано

- Закрыт пункт 2.4: добавлен browser regression test `tree-pointer-dnd-planner-keeps-stable-drop-intents-and-order`.
- Тест проверяет drop-intent дерева в браузере и сценарии `before`, `inside`, `after`, `root`, сортировку на одном уровне.
- Закрыт пункт 3.7: создан `campaignMapRenderAdapter.js`, который отражает записи `CampaignMapModel` в DOM токенов и фигур.
- Закрыт пункт 3.8: `CampaignMapModel` больше не экспортирует `commitTokenModelToElement()` и `commitShapeModelToElement()`.
- Token/shape drag и token actions теперь получают запись из `CampaignMapStore` и передают ее в render adapter.

### Что стало лучше

- `CampaignMapModel` снова отвечает только за данные карты, а не за DOM-разметку.
- DOM стал отображением model/store snapshot, что упрощает следующий переход к render adapter для всей карты.
- Browser regression дерева теперь прикрывает не только unit-расчеты, но и browser import/runtime слой.

### Оставшиеся риски

- Render adapter пока точечный: он обновляет dataset токенов и фигур, а полный `CampaignMapModel -> DOM` renderer для пересборки всей object-layer еще не выделен.
- Для треугольников resize вершин всё еще использует DOM-helper `getTrianglePoints(shape)`, потому что вершины физически редактируются в DOM.

### Следующее развитие из этой работы

1. Перейти к пункту 4.1: описать единый Editor History Contract.
2. Позже расширить render adapter до полного renderer-а object-layer, чтобы карта могла пересобираться из модели без ручных DOM-патчей.

## 2026-05-24: data-first save карты

### Что сделано

- Добавлен `js/editor/campaignMapDataSerializer.js`: отдельный сериализатор persistent HTML карты из `CampaignMapModel`.
- `serializeCampaignMapHTML()` больше не сохраняет карту через общий DOM-clone `serializePersistentEditorHTML()`, если открыта `.campaign-map-document`.
- `CampaignMapModel` теперь хранит `assetSettings`: сохраненные туман/размер сетки/цвет сетки для разных изображений одной карты.
- В HTML карты сохраняются только данные: stage dataset, токены, фигуры, fog image, grid, view и per-asset settings.
- Runtime-элементы карты вроде resize/rotate handles, popup-ов и временных классов не участвуют в сохранении карты.
- Добавлен unit-тест `tests/campaignMapDataSerializer.test.mjs`, который проверяет data-first HTML и отсутствие runtime-разметки.

### Что стало лучше

- Сохранение карты стало предсказуемее: результат зависит от модели, а не от случайного текущего состояния DOM.
- Следующая оптимизация карты может переводить drag/fog/grid на модель как источник правды без переписывания save-слоя.
- Переключение изображений карты безопаснее: настройки тумана и сетки для разных map asset теперь описаны в модели.

### Оставшиеся риски

- Drag/fog/grid ещё не являются полностью model-owned: многие операции сначала меняют DOM, затем вызывают refresh модели.
- `campaignMapSerializerHelpers.js` для точечного удаления токенов из сохраненных закрытых карт всё ещё работает через DOM-parse HTML.
- Нет browser smoke test, который создает карту, добавляет токен/фигуру, сохраняет, перезагружает и проверяет восстановление.

### Следующее развитие из этой работы

1. Перевести закрытые patch-сценарии карты на модельный serializer, начиная с удаления токенов из сохраненной страницы.
2. Добавить browser smoke test `карта -> token -> shape -> save/reload -> проверка координат/тумана/сетки`.
3. Ввести `CampaignMapStore`: единый владелец `CampaignMapModel`, dirty-state и commit/render операций.

## 2026-05-24: CampaignMapStore

### Что сделано

- Добавлен `js/editor/campaignMapStore.js`: единый владелец `CampaignMapModel`, dirty-state и commit в DOM.
- Основные операции карты переведены на store:
  - drag/resize/rotate токенов;
  - drag/resize фигур;
  - добавление токенов и фигур;
  - удаление, скрытие и дублирование токенов/фигур;
  - grid size/color/toggle;
  - fog mode/brush/fill/clear;
  - viewport pan/zoom;
  - save и presentation sync.
- `campaignMapDataSerializer.js` теперь берет модель через `refreshCampaignMapStore()`.
- Добавлены unit-тесты `tests/campaignMapStore.test.mjs` для dirty-state, токенов, фигур, сетки, тумана и viewport.

### Что стало лучше

- У карты появился явный model-owner вместо россыпи прямых обращений к `CampaignMapModel`.
- Новые операции карты можно добавлять в store и не размазывать commit/dirty-state по UI-модулям.
- Presentation sync и data-first save теперь ближе к одному источнику правды.

### Оставшиеся риски

- Store пока совместимый слой поверх текущего DOM: часть операций всё ещё читает стартовые значения из dataset перед записью в модель.
- `campaignMapModel.js` оставляет старые compatibility helpers для DOM-commit, потому что renderer/factory ещё используют их.
- Точечное изменение сохраненного HTML закрытых карт (`campaignMapSerializerHelpers.js`) всё ещё не переведено на store/model.

### Следующее развитие из этой работы

1. Добавить browser smoke test карты с save/reload и проверкой token/shape/grid/fog.
2. Начать убирать compatibility helpers из `campaignMapModel.js`, когда factory/renderer смогут работать напрямую со store snapshots.
3. Выделить model-owned render adapter для token/shape, чтобы DOM полностью стал отображением модели.

## 2026-05-24: закрепление model-owned карты

### Что сделано

- Стартовое состояние drag/resize/rotate токенов теперь берется из `CampaignMapStore`, а не из `dataset`.
- Стартовое состояние drag/resize фигур теперь берется из `CampaignMapStore`.
- `campaignMapSerializerHelpers.js` переведен на model/data-first путь:
  - закрытая карта разбирается как persistent HTML;
  - удаление токенов проходит через `CampaignMapStore.removeToken()`;
  - результат собирается через `serializeCampaignMapDocumentHTML()`, а не через `wrapper.innerHTML`.

### Что стало лучше

- Drag-слои меньше зависят от DOM как источника истины: `dataset` остается только идентификатором DOM-элемента.
- Патч закрытых карт теперь совпадает с обычным сохранением карты и не обходит data-first serializer.
- Следующий шаг по карте можно делать уже не вокруг save, а вокруг render adapter: model snapshot -> DOM.

### Оставшиеся риски

- Для треугольников точки вершин всё ещё вычисляются через DOM-helper `getTrianglePoints(shape)`, потому что shape handles физически живут в DOM.
- `commitTokenModelToElement()` и `commitShapeModelToElement()` остаются compatibility-мостами.
- Нет отдельного browser regression test на удаление карточки-токена из дерева и последующий патч закрытой карты.

### Следующее развитие из этой работы

1. Добавить regression test на удаление дочерней карточки токена и исчезновение токена с карты.
2. После тестов выделить render adapter `CampaignMapModel -> DOM` и постепенно убрать direct commit helpers.
3. Затем расширить UI-browser тесты карты: picker через `+`, дочерние дубли в дереве, презентация.

## 2026-05-24: browser smoke карты

### Что сделано

- Добавлен `tests/browser/campaign-map-data.spec.mjs`.
- Новый browser smoke проверяет полный data-cycle карты:
  - создать DOM карты в браузере;
  - изменить данные через `CampaignMapStore`;
  - добавить token и shape через официальные element factory;
  - сохранить HTML через `serializeCampaignMapDocumentHTML()`;
  - заново вставить HTML как после reload;
  - восстановить модель через `refreshCampaignMapStore()`;
  - проверить token, shape, grid, fog и viewport.
- `tests/browser/scenarios.mjs` помечает `campaign-map-token-flow` как частично автоматизированный.
- `campaign-map-token-removal-updates-open-and-closed-map-data` покрывает удаление токена с открытой карты и патч закрытой карты после удаления дочерней карточки.

### Что стало лучше

- Data-first save карты теперь защищен не только unit-тестами, но и браузерным smoke-сценарием.
- Тест ловит рассинхрон между моделью, DOM factory и serializer.
- Есть база для следующих UI-browser тестов карты.

### Что осталось не закрыто

- Тест пока не кликает реальный UI `+` и не проверяет создание дочерних дублей в дереве.
- Presentation sync всё ещё проверяется unit/архитектурно, но не отдельным browser-сценарием с popup window.

### Следующее развитие из этой работы

1. Переходить к большому пункту `4. Editor History Contract`, если не появится критичный regression.
2. При будущих изменениях карты расширять browser tests как подпункты раздела `1. Smoke / Regression Tests`.

## 2026-05-24: закрытие browser smoke подпунктов 1.6-1.10

### Что сделано

- `tests/browser/campaign-map-ui.spec.mjs` покрывает добавление карточки на карту:
  - picker показывает только допустимые карточки;
  - потомки карты исключаются;
  - создается bucket `Существа.Карта`;
  - создается дочерний дубль;
  - на карту добавляется токен дубля.
- `tests/browser/campaign-map-presentation.spec.mjs` покрывает presentation sync по `tokenId/shapeId`.
- `tests/browser/editor-formatting.spec.mjs` покрывает базовую границу inline formatting: форматируется выделенный текст, соседний текст не меняется, команда вне выделения не применяется.
- `tests/browser/task-tracker.spec.mjs` покрывает сохранение порядка колонок, перенос задачи, описание и checklist через модель Task Tracker.
- `tests/browser/page-templates.spec.mjs` покрывает создание шаблона, удаление шаблона и создание карточки по шаблону.

### Что стало лучше

- Все подпункты `1.6-1.10` получили browser smoke/regression слой.
- Основные пользовательские зоны теперь имеют хотя бы один быстрый браузерный страховочный сценарий.
- Большой переход к `Editor History Contract` можно начинать с меньшим риском повторно сломать карту, task tracker, шаблоны или базовое форматирование.

### Оставшиеся риски

- Тесты карты используют fake workspace и module-level flow, а не полностью ручной путь через реальную папку пользователя.
- Formatting smoke пока покрывает inline bold boundary, но не весь будущий history contract.
- Task Tracker smoke проверяет модель и serializer, но не pointer DnD жест мышью.

### Следующее развитие из этой работы

1. Начать `4. Editor History Contract`.
2. Внутри `4` добавлять новые regression tests на каждый исправленный сценарий Ctrl+Z / paste / formatting.

## Правила развития

- Любой новый runtime UI должен иметь `data-runtime="true"` и не попадать в persistent HTML.
- Любая новая подсистема карты должна быть отдельным файлом, если она может жить без прямого доступа к глобальному drag/save state.
- В новых файлах нужны короткие русские комментарии, которые объясняют ответственность модуля и сложные места.
- Не добавлять новые крупные функции в `campaignMap.js`, если их можно оформить как отдельный модуль.
- После каждого крупного изменения обновлять этот файл: что изменилось, что стало лучше, что осталось опасным.
- После изменения функций, подсистем или пользовательских сценариев обновлять `docs/MY_OWN_WORLD_FULL_MANUAL.docx`. Для пересборки использовать `tools/generate_manual_docx.py`.

## 2026-05-19: Полный технический мануал

### Что сделано

- Добавлен `docs/MY_OWN_WORLD_FULL_MANUAL.docx` — подробный мануал по проекту в формате Word.
- Добавлен `tools/generate_manual_docx.py` — служебный генератор мануала без внешних зависимостей.
- Мануал включает:
  - общую архитектуру проекта;
  - учебные пояснения по синтаксису JavaScript;
  - основные пользовательские и технические сценарии;
  - каталог функций и файлов;
  - построчный разбор исходников, стилей, HTML, SVG и документации.

### Оставшиеся риски

- Построчные пояснения генерируются эвристически, поэтому для особо сложных функций стоит вручную улучшать формулировки при будущих крупных изменениях.
- Документ большой; при активном развитии проекта его нужно пересобирать после каждого значимого изменения, иначе он быстро устареет.

### Следующее развитие из этой работы

- Постепенно добавлять ручные разделы по самым сложным подсистемам: Campaign Map, clean-save, wiki-links, таблицы и DnD-блоки.
- При каждом новом модуле добавлять русские комментарии в код, чтобы генератор получал больше качественного контекста.

## 2026-05-19: MVP блока "Переменные"

> Статус: архивировано. Подробности перенесены в `docs/ARCHIVED_EXPERIMENTS.md`.

### Что сделано

- Добавлен новый тип блока `variables`.
- Добавлена отдельная подсистема:
  - `js/ui/variables.js` — runtime UI блока, popup выбора, добавление/удаление переменных;
  - `js/ui/variables/variableDefinitions.js` — каталог системных переменных и саб-блоков;
  - `js/ui/variables/variableCalculations.js` — MVP расчетов переменных.
- В каталог добавлены тестовые переменные:
  - уровень, опыт, раса, класс, вид, подкласс;
  - шесть характеристик;
  - боевые поля, хиты, скорость, инициатива, кость хитов;
  - расчетные характеристики `Сила (расчет)` и аналоги.
- Добавлены 5 саб-блоков переменных:
  - `Происхождение`;
  - `Характеристики`;
  - `Характеристики (расчет)`;
  - `Боевые показатели`;
  - `Хиты`.
- Переменная `Раса` строит select по карточкам с тегом `race`.
- Расчетная характеристика персонажа складывает базовую характеристику текущей карточки и одноименную переменную выбранной расы.
- Toolbar больше не появляется во время протягивания выделения мышью: показ откладывается до `pointerup`.

### Оставшиеся риски

- Это MVP, а не финальный formula engine. Сейчас расчет захардкожен для связи `персонаж -> раса -> характеристика`.
- Нужен будущий слой формул, где переменная сможет ссылаться на цепочки вроде `race.str`, `class.proficiency`, `level.modifier`.
- Нужен единый serializer для переменных, если появятся сложные типы данных: массивы, dice formula, ссылки на несколько карточек.
- Popup выбора переменных пока простой и не поддерживает категории/избранное.

### Следующее развитие из этой работы

- Ввести `VariableModel`, который будет читать переменные карточки как данные, а не как DOM.
- Добавить формулы вида `base.str + race.str + class.str`.
- Позже заменить DnD stat block v2 на UI, который собирается из переменных и формул.

## 2026-05-19: Архивация DnD v2 и блока "Переменные"

### Что сделано

- `Стат. блок DnD v 2.0` убран из popup выбора блоков.
- Блок `Переменные` убран из popup выбора блоков.
- Runtime-подключение `setupDndStatsV2()` и `setupVariables()` отключено в `app.js`.
- Runtime-render `renderDndStatsV2()` и `renderVariables()` отключен в `editor.js`.
- CSS `dnd-stats-v2.css` и `variables-block.css` больше не импортируются в `styles/main.css`.
- Добавлен архивный документ `docs/ARCHIVED_EXPERIMENTS.md`.

### Почему

- Обе ветки оказались полезными как исследование, но не как готовая UX/архитектурная основа.
- Для продолжения нужна отдельная модель персонажа/переменных, а не усложнение HTML-блоков.

### Следующее развитие

- Сначала спроектировать `CharacterModel` или `VariableModel`.
- Только после этого возвращаться к UI листа персонажа и формулам.

## 2026-05-19: Drag карточки из дерева на карту

### Что сделано

- В режиме карты можно перетащить карточку из дерева на рабочую область карты.
- Разрешены только карточки типов `character`, `creature` и `object`, которые не находятся внутри дочерней ветки карты.
- При drop создается дочерний дубль карточки в бакете карты `Существа` или `Объекты`, а токен на карте привязывается именно к дублю.
- Точка появления токена берется из места drop на карте, а не из центра видимой области.
- Tree drag теперь допускает `copyMove`: внутри дерева карточка всё ещё перемещается, а drop на карту работает как копирование.

### Оставшиеся риски

- Drop из дерева вынесен в отдельный `campaignMapExternalDrop.js`, но пока использует DOM-события HTML5 drag/drop. Для мобильного режима позже может понадобиться pointer-based fallback.
- Нужно ручное тестирование: перетащить персонажа, существо и объект; убедиться, что исходная карточка не меняется, а дубль появляется в дочках карты.

### Следующее развитие из этой работы

- Добавить визуальный preview токена под курсором во время перетаскивания из дерева.
- Перевести этот сценарий на будущий `CampaignMapModel.addTokenFromPageDuplicate()`, когда модель станет основным источником правды.

## 2026-05-18: Стат. блок DnD v 2.0

### Что сделано

- Добавлен новый тип блока `dndStatsV2`, старый `dndStats` не мигрируется и не меняется.
- Блок содержит выбор расы, класса, вида и подкласса:
  - раса берется из карточек с тегом `race`;
  - класс берется из карточек с тегом `class`;
  - вид берется из карточек с тегом `type`, у которых parent равен выбранной расе;
  - подкласс берется из карточек с тегом `subclass`, у которых parent равен выбранному классу.
- Добавлены поля уровня, бонуса мастерства, КЗ, хитов, скорости, хитов от смерти, костей хитов, владений, характеристик и навыков/спасбросков.
- Разметка блока приведена ближе к листу персонажа:
  - происхождение и развитие идут двумя строками по три поля, где `Вид` расположен под `Расой`, а `Подкласс` под `Классом`;
  - вместо `Уровня` в происхождении добавлено `Истощение` на 6 чекбоксов;
  - боевые показатели идут двумя строками: КЗ/хиты/кость хитов и скорость/уровень с опытом/хиты от смерти/кости хитов;
  - составные поля подписывают значения `факт`, `макс`, `врем.`;
  - хиты от смерти представлены чекбоксами с иконками провалов и успехов;
  - характеристики и навыки объединены в один широкий раздел.
- Визуальный стиль блока переведен в общую темную тему приложения с мягкими панелями и пастельно-желтыми акцентами.
- Расчет DnD 5e:
  - бонус мастерства: уровни 1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6;
  - модификатор характеристики: `floor((значение характеристики - 10) / 2)`;
  - навык или спасбросок = модификатор характеристики + бонус мастерства, если отмечено владение.
- Модификатор характеристики теперь редактируемый: если пользователь меняет его вручную, значение подсвечивается и используется для навыков; если поле очистить, включается авторасчет.

### Оставшиеся риски

- Карточки `race`, `class`, `type`, `subclass` пока не имеют формального schema для автоматических бонусов. Бонусы рас/классов больше не задаются отдельным полем в характеристике, чтобы не плодить временную модель.
- Следующий шаг — описать schema бонусов в карточках расы/класса и подтягивать их автоматически.

## 2026-05-20: Дерево сущностей, уникальные названия и навигационный стек

### Что сделано

- Для дерева добавлен более плавный drag/drop: строка под курсором теперь остается видимой как floating preview, а placeholder больше не перехватывает события мыши и меньше провоцирует дрожание layout.
- Для карточек добавлен стек переходов: если пользователь попал в карточку не из дерева, рядом с заголовком появляется кнопка «Назад», которая возвращает по цепочке предыдущих карточек.
- Кнопка «Назад» усилена: она показывается для любой карточной сущности, а не только для страниц с явным `template: card`.
- В контекстное меню строки дерева добавлено действие `Дублировать`; дубль создается на том же уровне с названием вида `Копия1 - название`.
- Добавлена проверка одинаковых названий карточек, карт и таск-трекеров: конфликтующие заголовки подсвечиваются в открытой сущности и в дереве, а сохранение с дублем имени блокируется.
- Дубли сущностей, которые добавляются на карту, теперь получают название вида `название - сущность.[название карты родителя]`, а складываются в папки `Существа.Название карты` и `Объекты.Название карты`, чтобы не конфликтовать с исходной карточкой и сущностями других карт.
- В контекстное меню дерева добавлено действие `Открыть в папке`; из-за ограничений браузерного File System Access API оно показывает путь внутри workspace и копирует имя файла.

### Оставшиеся риски

- Дерево все еще использует HTML5 drag/drop. Для полной одинаковости с таск-трекером лучше позже перевести его на pointer-based controller.
- `Открыть в папке` нельзя сделать полноценным раскрытием Explorer из чистого браузера без отдельного desktop/native bridge.
- Уникальность сейчас проверяется по видимому названию. Для будущего интернет-режима понадобится серверная проверка и миграция старых конфликтов.

### Следующее развитие из этой работы

- Вынести навигационный стек в отдельный `navigationHistory`-модуль, чтобы wiki-links, карта и дерево использовали один контракт переходов.
- Перевести tree drag/drop на pointer events с тем же подходом, который уже используется в таск-трекере.
- Добавить отдельный lightweight index по названиям страниц, чтобы проверки дублей и wiki-links не проходили по всему `state.pages` при каждом вводе.

## 2026-05-20: Форматирование текста, undo и навигация карточки

### Что сделано

- Исправлен выбор цели для форматирования `Заголовок` / `Обычный текст`: toolbar больше не должен превращать весь соседний editable-контейнер, если выделена только одна внутренняя строка.
- Добавлен `editorHistory.js` — легкий слой истории для операций, где приложение само меняет DOM: вставка plain text, форматирование блоков, цвет, сброс и inline-команды toolbar.
- Ctrl+Z сначала пробует откатить внутреннюю историю редактора и затем сохраняет результат; если внутренней истории нет, браузерное undo продолжает работать штатно.
- Блок навигации карточки стал постоянной маленькой панелью: кнопка `Найти в дереве` показывается всегда на карточках, а `Назад` появляется только при переходе не из дерева.
- `Найти в дереве` раскрывает родительские ветки, скроллит к текущей карточке и временно подсвечивает строку.
- В popup `Связать с существующей` для wiki-link больше не попадают технические дубли, у которых среди родителей есть карта.

### Оставшиеся риски

- `editorHistory.js` — промежуточный слой, а не полноценная модель документа. При больших будущих изменениях лучше перейти к нормальному editor model/history contract.
- Форматирование блоков теперь ограничено внутренними блоками editable-root. Для сложных HTML-фрагментов из paste могут понадобиться дополнительные правила нормализации.

### Следующее развитие из этой работы

- Вынести toolbar formatting в полноценный `FormattingService` без прямой работы с произвольными `div`.
- Сделать единый `EditorHistoryContract`: какие операции пишутся в историю, как группируются ввод/вставка/структурные действия, нужен ли redo.
- Добавить тестовый чеклист по форматированию: частичное выделение, несколько строк, заголовки, таблицы, wiki-links и paste plain text.

## 2026-05-21: Создание задач и карточек по шаблонам

### Что сделано

- В меню `+` добавлен пункт `Задача`: он открывает выбор таск-трекера и создает задачу внутри выбранной доски.
- Новая задача попадает в колонку `Бэклог` / `Backlog`, если она есть; если такой колонки нет, используется первая колонка трекера.
- В меню `+` добавлен пункт `По шаблону`: он открывает список сохраненных шаблонов, позволяет создать карточку по шаблону или удалить шаблон.
- Шаблон можно создать из карточки через меню `...` в дереве командой `Сделать шаблоном`.
- Шаблоны не создают страниц и не появляются в дереве: они хранятся как отдельная lightweight-сущность в localStorage.
- Карточка по шаблону создается на том же уровне, что и текущая открытая карточка, и получает уникальное название по правилу копии.

### Оставшиеся риски

- Хранение шаблонов в localStorage удобно для MVP, но не переносится вместе с workspace на другой компьютер.
- Если шаблоны должны быть общими для workspace, следующим шагом нужно перенести их в отдельный файл вроде `.my-own-world-templates.json`.

### Следующее развитие из этой работы

- Сделать workspace-level template storage, чтобы шаблоны жили рядом с миром, а не в браузере.
- Добавить форму имени при создании карточки по шаблону.
- Добавить быстрый поиск по шаблонам, если их станет много.

## 2026-05-21: Исправление переносов в дереве

### Что сделано

- Drag/drop в дереве стабилизирован: сортировка идет через узкие зоны `before/after`, а центральная зона строки снова остается вложением внутрь, даже если элементы находятся на одном уровне.
- Drop по визуальной плашке `Перенести сюда` теперь определяется по координатам самой плашки, а не по `event.target`, потому что placeholder не перехватывает мышь ради плавности.
- Placeholder больше не переставляется повторно, если он уже стоит в нужной позиции; это снижает тряску layout во время dragover.
- После любого tree move открытая страница синхронизируется с обновленным объектом из `state.pages` после `loadWorkspace()`.
- Это закрывает баг, где после переноса открытой карточки или карты следующий save мог записать старый `parent/order` и фактически откатить перенос.

### Оставшиеся риски

- Дерево все еще работает на HTML5 drag/drop. Оно стало стабильнее, но для полной управляемости лучше перевести его на pointer-based controller, как таск-трекер.

### Следующее развитие из этой работы

- Вынести `reloadTreeAfterMove()` в общий tree move controller.
- Добавить ручной тест: открыть карточку, перенести ее, не переоткрывая изменить текст, обновить страницу и проверить parent/order.

---

## 2026-05-25: GitHub Actions CI 8.4-8.6

### Что сделано

- В `.github/workflows/verify.yml` добавлен отдельный шаг установки Chromium для Playwright.
- В CI добавлен запуск `npm run test:browser` после `npm run verify`.
- При падении workflow сохраняет `playwright-report/`, `test-results/` и `debug.log` как artifact `browser-smoke-artifacts`.
- В README зафиксировано правило: перед merge/push целевой ветки CI должен быть зеленым.

### Что стало лучше

- Browser smoke теперь является частью обязательной внешней проверки, а не только локальной командой.
- При падениях браузерных тестов будет проще разбирать причину по артефактам GitHub Actions.

### Следующее развитие

- Перейти к `9.1`: описать Asset Lifecycle Contract для изображений, портретов, фонов карт, object PNG и будущих медиа.

---

## 2026-05-25: Asset Lifecycle Contract 9.1-9.2

### Что сделано

- Создан `docs/ASSET_LIFECYCLE_CONTRACT.md`.
- Зафиксированы типы ассетов: `image`, `portrait`, `mapBackground`, `mapObjectPng`, `audio`, `playlist`, `futureMedia`.
- Описан будущий формат `AssetReference` с `id/path/type/owner/fallback/missing`.
- Описаны правила сохранения: не сохранять `blob:`, абсолютные локальные пути и временные browser URL.
- Описаны правила загрузки, missing state, broken asset checker и orphan asset detection без автоматического удаления.
- README и план обновлены под новый контракт.

### Что стало лучше

- Работа с изображениями получила явную архитектурную границу перед рефакторингом asset storage.
- Будущая музыка локаций теперь вписана в общий media lifecycle, а не остается отдельной неподключенной идеей.

### Следующее развитие

- Перейти к `9.3`: ввести единый `AssetReference` helper и постепенно переводить portrait, image block, map background и object PNG на один формат ссылок.

---

## 2026-05-25: AssetReference 9.3

### Что сделано

- Добавлен `js/storage/assetReference.js`.
- Введены типы `ASSET_TYPES`: `image`, `portrait`, `mapBackground`, `mapObjectPng`, `audio`, `playlist`, `futureMedia`.
- Добавлены helpers `createAssetReference()`, `normalizeAssetReference()`, `normalizeAssetPath()`, `normalizeAssetType()`, `normalizeAssetOwner()` и `isAssetReference()`.
- Добавлен re-export из `js/storage/storage.js`.
- Добавлены unit tests `tests/assetReference.test.mjs`.

### Что стало лучше

- Появился единый объект, к которому можно постепенно приводить портреты, image block, фон карты и PNG-объекты.
- Broken asset checker и orphan detection теперь можно писать не как набор частных случаев, а вокруг одного формата.

### Следующее развитие

- Перейти к `9.4`: собрать broken asset checker, который находит отсутствующие файлы и показывает владельца ссылки.

---

## 2026-05-25: Asset Checker 9.4-9.7

### Что сделано

- Добавлен `js/storage/assetReferenceScanner.js` для сбора persistent-ссылок из страниц.
- Добавлен `js/storage/assetBrokenChecker.js` для поиска отсутствующих файлов.
- Добавлен `js/storage/assetOrphanDetector.js` для поиска orphan-кандидатов без удаления.
- В scanner добавлены будущие атрибуты `data-audio-asset` и `data-playlist-asset`.
- Добавлены unit tests: `assetReferenceScanner.test.mjs`, `assetBrokenChecker.test.mjs`, `assetOrphanDetector.test.mjs`.
- `ASSET_LIFECYCLE_CONTRACT.md` дополнен основой под музыку локаций.

### Что стало лучше

- Проект теперь умеет программно отличать используемые, отсутствующие и лишние assets на уровне данных.
- Можно безопасно строить UI проверки workspace: сначала показывать список проблем, а удаление делать только после подтверждения пользователя.

### Следующее развитие

- Перейти к `10.1`: описать performance risks карты и затем добавить измеряемые performance scenarios.

---

## 2026-05-25: Campaign Map Performance Strategy 10.1-10.4

### Что сделано

- Создан `docs/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md`.
- Описаны риски: много токенов, много фигур, большой background, fog, presentation sync, zoom/pan.
- Введены performance scenarios: `small-map-baseline`, `large-map-drag`, `fog-paint-large`, `presentation-live-sync`, `zoom-pan-heavy`.
- Добавлен `js/editor/campaignMapPerformance.js` со snapshot-метриками и budgets.
- Добавлены unit tests `tests/campaignMapPerformance.test.mjs`.

### Что стало лучше

- Оптимизация карты получила измеримый ориентир: теперь можно сравнивать фактические метрики с budgets.
- Следующая оптимизация presentation full-sync будет опираться на понятные сценарии, а не только на субъективное ощущение лагов.

### Следующее развитие

- Перейти к `10.5`: оптимизировать presentation full-sync, а затем добавить performance regression smoke.

---

## 2026-05-25: Presentation Full-Sync 10.5

### Что сделано

- В `js/editor/campaignMapPresentation.js` full-sync презентации переведен с `refreshCampaignMapStore()` на `getCampaignMapStore()`.
- Презентация теперь использует уже актуальный data-first store/model и не перечитывает модель из DOM при каждом full-sync.

### Что стало лучше

- Синхронизация презентации делает меньше лишней работы на больших картах.
- Это снижает риск лагов при full-sync после изменений сетки, тумана, фона или toolbar-действий.

### Следующее развитие

- Перейти к `10.6`: добавить performance regression smoke, который проверит sync/reload на большой сцене и не даст вернуть тяжелый full DOM refresh.

---

## 2026-05-25: Campaign Map Performance Smoke 10.6

### Что сделано

- Добавлен browser smoke `tests/browser/campaign-map-performance.spec.mjs`.
- Тест создает синтетическую сцену на 120 токенов и 40 фигур.
- Тест открывает презентацию, выполняет full-sync и серию item-level sync.
- Тест проверяет количество элементов в презентации и мягкие performance budgets.
- Сценарий добавлен в `tests/browser/scenarios.mjs`.

### Что стало лучше

- У карты появился первый regression-тест не только на корректность данных, но и на грубую деградацию производительности.
- Дальнейшие оптимизации презентации теперь можно делать смелее: тест будет ловить явный откат к тяжелому full-sync поведению.

### Следующее развитие

- Перейти к `11.1`: создать CHANGELOG и формализовать release process.

---

## 2026-05-25: Release Process 11.1-11.6

### Что сделано

- Создан `CHANGELOG.md` с разделом `Unreleased` и release notes template.
- Создан `docs/RELEASE_PROCESS.md`.
- Описаны правила версий: patch, minor, major, experimental.
- Описан release checklist.
- Описано правило будущей синхронизации `package.json.version`, git tag и changelog.
- Добавлен rollback guide для code regression и workspace data regression.
- README обновлен ссылкой на release process.

### Что стало лучше

- У проекта появился формальный путь от изменения до релиза.
- Версии больше не остаются только текстом в commit message: есть место для changelog, checklist и rollback.

### Следующее развитие

- Перейти к `12.1`: спроектировать Campaign Map Initiative как model-first подсистему.

---

## 2026-05-25: Campaign Map Initiative Model 12.1-12.3, 12.5-12.8

### Что сделано

- Добавлен `js/editor/campaignMapInitiativeModel.js`.
- Модель умеет собирать участников из живых токенов карты.
- Для player/original flow сохраняется `sourceMode="original"`.
- Добавлены броски d20, initiative modifier, total, сортировка порядка и active turn / next / previous.
- Добавлены unit tests `tests/campaignMapInitiativeModel.test.mjs`.

### Что стало лучше

- Инициатива начата model-first, без смешивания боевой логики с popup UI.
- Будущий popup сможет быть тонким интерфейсом над уже проверенной моделью.

### Следующее развитие

- Закрыть `12.4`: сделать popup выбора участников инициативы, затем `12.9`: сохранить и восстановить состояние инициативы в карте.

---

## 2026-05-25: Campaign Map Initiative UI 12.4, 12.9-12.10

### Что сделано

- Добавлена кнопка `Иниц.` в toolbar карты.
- Добавлен `js/editor/campaignMapInitiativePopup.js`: popup выбора существ, `Применить`, `Roll d20`, `Закрыть`.
- `CampaignMapModel` теперь хранит `initiative`, пишет его в `data-initiative-state` и восстанавливает из HTML.
- `CampaignMapStore` получил `setInitiative()`.
- Data-first serializer сохраняет состояние инициативы.
- Добавлен browser regression `tests/browser/campaign-map-initiative.spec.mjs`.

### Что стало лучше

- Инициатива стала видимой пользовательской MVP-фичей карты, но боевые данные все еще остаются в модели, а не в DOM-popup.
- Состояние инициативы переживает save/reload карты.

### Следующее развитие

- Перейти к `13.1`: спроектировать LayerModel для карты.

---

## 2026-05-25: CI Fix - Python Setup

### Что сделано

- В `.github/workflows/verify.yml` добавлен `actions/setup-python@v5` с Python 3.12 перед `npm run verify`.
- README и план обновлены: CI теперь явно поднимает Python для проверки docx.

### Причина

- Локально `npm run verify` использует команду `python -m zipfile -t docs/MY_OWN_WORLD_FULL_MANUAL.docx`. На GitHub Actions наличие команды `python` лучше не предполагать неявно, поэтому workflow должен устанавливать Python явно.

### Следующее развитие

- После push проверить, что GitHub Actions `Verify` стал зеленым.

---

## 2026-06-01: Visual Regression / UX Safety 4.1-4.5

### Что сделано

- Создан browser smoke `tests/browser/visual-regression.spec.mjs`.
- Добавлены screenshot attachments для app shell, card editor, campaign map и task tracker.
- Добавлены layout guards: popup должен оставаться внутри viewport, floating toolbar сохраняет фиксированную ширину, selection-box карты выделяет токены и фигуры, туман находится выше токенов и locked fog zone, badge `скрыт` имеет ограниченный размер.
- Создан `docs/VISUAL_REGRESSION_CHECKLIST.md` с ручным review перед push.
- `tests/browser/scenarios.mjs` и `tests/browser/README.md` обновлены новым visual-сценарием.
- `docs/PROJECT_PLAN.md` обновлен: пункт 4 закрыт базово, а полный pointer-based group drag оставлен как расширение.

### Что стало лучше

- Визуальные баги теперь ловятся не только глазами после факта, но и browser smoke слоем.
- CI получает быстрые проверки самых болезненных UI-инвариантов: popup, toolbar, selection, fog layering и hidden badge.
- Screenshot attachments дают материал для расследования, если визуальный smoke упадет на GitHub Actions.

### Следующее развитие

- Перейти к `5. Popup Lifecycle Standardization`: унифицировать popup lifecycle и расширить boundary tests уже по конкретным popup-типам.

---

## 2026-06-01: Обновление будущего плана

### Что сделано

- В `docs/PROJECT_PLAN.md` встроены новые продуктовые идеи пользователя без создания второго плана.
- В `6.6` добавлены улучшения блоков `Свойства`: селектор, уровень навыка, вид действия и визуальный дизайн.
- В `15.11` добавлен будущий слой рисования карты: полотно, карандаш, перо, ластик, заливка, selector цвета и последние цвета.
- В `15.12` добавлено будущее контекстное меню существ на карте с выбором навыков карточки, зоной действия и расстоянием.
- В `18.5` уточнен будущий тип сущности "граф связей".
- В `19.7` добавлена идея двух рабочих областей editor.
- В `20.7` закреплен перевод в Desktop как стратегический путь после стабилизации storage/data layers.

### Следующее развитие

- Рабочий фокус плана остается `5. Popup Lifecycle Standardization`.

---

## 2026-06-01: Popup Lifecycle Standardization 5.1-5.5

### Что сделано

- Создан `docs/POPUP_LIFECYCLE_CONTRACT.md`.
- `js/ui/popupManager.js` расширен до общего lifecycle-слоя: register, open, toggle, close, destroy, z-index, Escape, outside click и controller API.
- `js/ui/popupPosition.js` получил совместимость `offset` как alias для `gap`.
- `js/ui/createModal.js` теперь создает `createMenu` в JS, если контейнера нет в `index.html`.
- `js/tree/treeContextMenu.js` теперь создает `treeContextMenu` в JS и закрывается через общий `PopupManager`.
- `index.html` очищен от static containers `createMenu` и `treeContextMenu`.
- `js/editor/links.js` переведен на общий popup lifecycle вместо собственного document click listener.
- `js/editor/campaignMapPopupController.js` переведен на общий `PopupManager` с динамическими anchors.
- Добавлен browser regression `tests/browser/popup-lifecycle.spec.mjs`.
- Обновлены `tests/browser/scenarios.mjs`, `tests/browser/README.md` и единый план.

### Что стало лучше

- Popup-ы получили единый базовый закон поведения: открытие, повторный trigger, Escape, outside click, viewport boundary и z-index.
- Часть legacy static UI убрана из `index.html`, не ломая существующий app shell.
- Новые popup-регрессии теперь можно ловить через один focused browser spec.

### Следующее развитие

- Перейти к `6. Properties Model / Character Calculations` или, если появятся UI-баги popup, расширить `popup-lifecycle.spec.mjs` конкретными сценариями block/wiki/item/template popup.

---

## 2026-06-01: Properties Model / Character Calculations 6.1-6.6

### Что сделано

- Создан `docs/PROPERTIES_MODEL_CONTRACT.md`.
- Добавлен каталог схем `js/properties/propertySchemas.js` для `character`, `creature`, `object`, `location`, `region`, `magic`, `skill`, `item`.
- Добавлен `js/properties/propertiesModel.js`: нормализация блока `Свойства` в стабильную модель данных.
- Добавлен `js/properties/characterCalculations.js`: модификаторы DnD, бонус мастерства, расчет проверок, чтение источников персонажа и хитов.
- `js/templates/propertyBlockDefinitions.js` превращен в совместимый re-export нового слоя.
- `js/templates/blockTypes.js` теперь рендерит поля `Свойств` из схем, включая select options, min/max и новые поля навыков.
- `js/editor/campaignMapHealth.js` подключен к расчетному слою: карта сначала читает хиты из `PropertiesModel`, затем из legacy `Стат. блок DnD`.
- `styles/block-properties.css` обновлен: блоки стали мягче, компактнее и ближе к визуальному языку проекта.
- `tests/propertyBlocks.test.mjs` расширен проверками схем, модели и правил DnD-расчетов.

### Что стало лучше

- Блок `Свойства` больше не является просто HTML-формой: у него появился слой схем и модель данных.
- Будущий `CharacterModel` получил точку входа, не завязанную на верстку.
- Карта начала использовать расчетный слой для хитов, поэтому новые свойства существ можно будет развивать без переписывания логики карты.

### Следующее развитие

- Следующий крупный шаг по этой линии: `CharacterModel`, который объединит свойства, legacy DnD, навыки, инвентарь, классы и расы в одну модель персонажа.

---

## 2026-06-01: FormattingService 12.7-12.8 и Desktop-план

### Что сделано

- `js/editor/formattingService.js` получил собственные Range/DOM-операции для `bold`, `italic`, `underline`, списков, цвета, reset format и plain-text insertion.
- `document.execCommand()` оставлен только как аварийный fallback внутри `formattingService.js`.
- `tests/browser/editor-formatting.spec.mjs` расширен проверками списков, цвета, reset format и plain-text insertion.
- `docs/FORMATTING_SERVICE_CONTRACT.md` обновлен: deprecated API больше не является основным механизмом форматирования.
- `docs/Новые идеи к адаптации.txt` разобран и встроен в `docs/PROJECT_PLAN.md`.
- В план добавлены будущие направления: audio/playlist assets, музыка локаций, rule tree, аккаунты/роли/admin, CharacterModel, Inventory, Effects, performance hardening, graph relationships, AI/collaboration/web.
- Переход на desktop подробно разложен в `docs/PROJECT_PLAN.md` и `docs/DESKTOP_ADAPTER_PLAN.md`: 20.4-20.11.

### Что стало лучше

- Редактор меньше зависит от deprecated browser API и стал предсказуемее для будущего desktop/WebView.
- Desktop-направление стало не абстрактным желанием, а очередью конкретных шагов: окружение, adapters, Tauri FS commands, prototype, backup/restore gate, presentation window и packaging smoke.

### Следующее развитие

- Следующий рабочий пункт: `20.4. Подготовить окружение Desktop Spike`.

---

## 2026-06-02: Desktop Adapter 20.4

### Что сделано

- Добавлен `@tauri-apps/cli` в devDependencies.
- Добавлены npm-команды `dev:web`, `desktop:check`, `desktop:dev`, `desktop:info`, `desktop:build`.
- Создана минимальная Tauri-оболочка в `src-tauri/`: конфигурация, Rust entrypoint, build script и default capability.
- Desktop-spike настроен так, чтобы открывать текущий web UI через `tools/static_server.mjs` на `127.0.0.1:5173`.
- `src-tauri/target/` добавлен в `.gitignore`.
- Добавлен `tools/check_desktop_environment.mjs`, чтобы быстро видеть, чего не хватает для desktop-сборки.
- README, `docs/PROJECT_PLAN.md` и `docs/DESKTOP_ADAPTER_PLAN.md` обновлены под реальные команды.

### Что стало лучше

- Desktop-направление перестало быть только планом: теперь в репозитории есть минимальная Tauri-структура.
- Browser mode не затронут: текущий `index.html`, smoke tests и `verify` остаются основной рабочей веткой.
- Ограничение окружения стало явным: на текущей машине есть Node/npm/Tauri CLI/WebView2, но пока нет Rust/Cargo/rustup и Visual Studio Build Tools с MSVC/Windows SDK.

### Следующее развитие

- Следующий пункт: `20.5. Создать StorageAdapter interface в JS`.

---

## 2026-06-02: Desktop Adapter 20.5-20.7

### Что сделано

- Добавлен `StorageAdapter` foundation: contract, facade, browser implementation и desktop implementation.
- `openWorkspace`, `restoreWorkspace` и создание базовых папок workspace переведены на `StorageAdapter`.
- Добавлен `AssetAdapter` foundation: contract, facade, browser implementation и desktop implementation.
- Добавлен `@tauri-apps/api` для вызова backend-команд из desktop WebView.
- В `src-tauri/src/main.rs` добавлены FS-команды: чтение/запись UTF-8 текста, список папки, создание папки, удаление файла, проверка существования и resolution asset URL.
- Rust-команды ограничивают путь workspace root и запрещают `..` в относительных путях.
- Добавлены unit tests для adapter contracts.
- Добавлен Tauri dialog plugin: desktop adapter теперь выбирает workspace root через native dialog и сохраняет путь в `localStorage`.
- Desktop page load/create/delete получили adapter bridge через lightweight file handles.
- Rust/Cargo/rustup установлены через официальный `rustup-init.exe`.
- Visual Studio Build Tools 2022 C++ и Windows SDK установлены и обнаруживаются через `desktop:check`.
- Добавлена `src-tauri/icons/icon.ico`, без которой Tauri build script не проходил Windows resource generation.
- `cargo check` в `src-tauri` проходит.

### Что стало лучше

- Browser и desktop storage получили первую общую границу, поэтому дальнейший перенос можно делать постепенно, без резкого переписывания `pageStorage`, backup и assets.
- Desktop backend перестал быть пустой оболочкой: появилась первая безопасная файловая поверхность для будущего `StorageAdapter`.
- Asset lifecycle получил отдельный adapter facade, к которому можно подключить изображения, карты, музыку и плейлисты.

### Ограничения

- `npm run desktop:info` выводит зеленый отчет, но в текущем shell может не завершаться сам; обязательным gate считаем `npm run desktop:check` и `cargo check`.
- Глубокий перевод backup/assets/writeQueue на adapter остается следующим hardening-этапом.
- Структурированные Rust error objects пока не введены: команды возвращают строки.

### Следующее развитие

- Следующий пункт: продолжить desktop foundation с переносом `writeQueue`, `backupService`, `assetStorage`, `images` и `campaignMapRuntime` на adapter-backed storage.
