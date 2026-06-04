# My own world

## Актуальный запуск и проверки

### Browser

```powershell
cd "C:\Users\Aruko\Documents\New project\My own world"
npm run dev:web
```

После запуска открыть `http://127.0.0.1:5173/`.

### Desktop Spike

Desktop-прототип работает на Tauri и не должен ломать browser-версию. Перед ручной проверкой desktop-окна выполнить:

```powershell
npm run verify
npm run test:browser
npm run desktop:check
npm run desktop:packaging-smoke
cd src-tauri
cargo check
```

Запуск desktop-прототипа:

```powershell
npm run desktop:dev
```

Ручные сценарии:

- `docs/02-architecture/desktop/DESKTOP_PROTOTYPE_SMOKE.md` — общий desktop smoke.
- `docs/02-architecture/desktop/DESKTOP_BACKUP_RESTORE_GATE.md` — проверка backup/restore в desktop.
- `docs/02-architecture/desktop/DESKTOP_PRESENTATION_WINDOW_SPIKE.md` — решение по отдельному окну презентации.
- `docs/02-architecture/desktop/DESKTOP_PACKAGING_SMOKE.md` — будущий smoke packaged-сборки.

### Storage / Backup / Assets

Страницы, backup и assets проходят через adapter boundary:

- `StorageAdapter` отвечает за выбор workspace, чтение/запись текста, чтение/запись бинарных файлов и удаление директорий.
- `AssetAdapter` отвечает за импорт файлов, URL изображений и будущую проверку missing/orphan assets.
- `backupService` сохраняет страницы и assets через `StorageAdapter`, поэтому browser и desktop используют один контракт.
- `tauriBridge.js` изолирует доступ к Tauri API: в desktop WebView используется `window.__TAURI__`, а dynamic import остается fallback для будущей сборки.
- В desktop картинки и фоны карты должны отображаться через Tauri asset URL (`convertFileSrc`), а не через прямой `file://`.

### AI / Codex Workflow

Перед задачей Codex должен прочитать `AGENTS.md`.

Типовые сценарии лежат в `.agents/skills/`.

Документация должна иметь metadata:

- `summary`;
- `read_when`;
- `owner_zone`.

Проверки agent workflow:

```powershell
npm run docs:index
npm run agents:validate
```

Для безопасного commit использовать:

```powershell
node tools/safe_commit.mjs --message "commit message" file1 file2
```

`tools/safe_commit.mjs` не делает commit без `--confirm` и запрещает случайный `git add .`.

---

# My own world

Локальная веб-вики для создания лора DnD. Приложение работает в браузере, хранит карточки в выбранном workspace и сохраняет каждую страницу как `.md` с front matter и HTML-телом редактора.

## Как Запустить

Запусти локальный static server из папки проекта и открой `index.html` через браузер:

```powershell
cd "C:\Users\Aruko\Documents\New project\My own world"
python -m http.server 5173
```

После этого приложение доступно по адресу `http://127.0.0.1:5173/`.

Workspace с `.md` лучше держать вне папки приложения. Если workspace лежит внутри проекта, Live Server или похожие инструменты могут перезагружать страницу при каждом сохранении карточки.

## Модель Данных

Карточка хранится как markdown-файл:

```md
---
id: page-id
parent: null
order: 1710000000000
tags: [card, character]
template: card
type: character
aliases: [алиас]
---

<div class="entity-layout card-shell">...</div>
```

Front matter хранит системные поля страницы. HTML ниже front matter является persistent content и должен быть достаточным для восстановления карточки или другой сущности при открытии.

## Editor Architecture

`js/editor/editor.js` — публичный фасад редактора. Через него остальные подсистемы продолжают импортировать `setupEditor()`, `openPage()`, `renderEmptyEditor()`, `saveCurrentPage()` и `insertImage()`.

Внутренняя логика редактора разнесена по отдельным модулям:

- `editorOpenPage.js` открывает карточки, карты и таск-трекеры;
- `editorSpecialSave.js` сохраняет спец-сущности: карту и таск-трекер;
- `editorEmptyPage.js` отвечает за пустой стартовый экран;
- `editorNavigation.js` управляет кнопками "Назад" и "Найти в дереве";
- `editorPastePlainText.js` вставляет текст без чужого форматирования;
- `editorWikiLinkNormalization.js` откладывает нормализацию `[[wiki-links]]`;
- `editorLinksRuntime.js` открывает обычные внешние ссылки;
- `editorAssetSanitizer.js` очищает asset images перед render;
- `editorDom.js` хранит единую DOM-ссылку на `#editorArea`.

Toolbar также разделен: `toolbar.js` остается контроллером событий, `toolbarPosition.js` отвечает за позиционирование, `toolbarActiveState.js` — за подсветку активных команд, `toolbarTextColor.js` — за последние цвета и применение цвета.

Task Tracker хранит задачи не в runtime-доске, а в JSON-модели внутри `<script class="task-tracker-data" type="application/json" data-task-tracker-data>`. Старые трекеры с одним только `class="task-tracker-data"` поддерживаются на load, а при следующем сохранении получают явный `data-task-tracker-data`.

## Entity Types

В дереве могут лежать разные сущности. Сейчас есть:

- `card`: обычная карточка лора через Unified Card Shell;
- `campaignMap`: отдельная карта кампании, не карточка и не card shell.

Обе сущности хранятся как `.md`, но открываются разными renderer-ами.

## Unified Card Shell

Все типы, включая `Персонаж`, `Существо`, `Локация`, `Регион`, `Папка`, `Магия`, `Объект`, `Предмет`, `Лор` и `Заметка`, остаются одной сущностью: карточкой. Тип сохраняется в `page.type`, а не создаёт отдельную модель данных.

Системные теги могут использоваться для отображения иконок и совместимости, но пользовательские теги не должны становиться заменой `page.type`.

## Campaign Map

`campaignMap` — отдельная сущность для ведения кампании на карте. Она лежит в дереве рядом с карточками, но использует собственный интерфейс рабочей зоны.

Persistent HTML карты хранит:

- заголовок карты;
- stage карты;
- ссылку на изображение карты в `data-map-asset`;
- флаг сетки в `data-grid`;
- туман войны в `data-fog-image`;
- форму кисти тумана в `data-brush-shape`;
- locked fog zones в `data-fog-locked-zones`;
- существ и объекты как `.campaign-map-token`;
- координаты каждого токена в `data-x` / `data-y`;
- размер токена в `data-size`;
- поворот PNG-объекта в `data-rotation`;
- состояние скрытия из презентации в `data-presentation-hidden`.

Runtime UI карты создаётся в `js/editor/campaignMap.js` и не сохраняется:

- кнопка `+`, открывающая выбор добавления существа или объекта;
- picker карточек со строкой поиска и множественным выбором;
- переключатель сетки;
- настройка размера сетки;
- смена изображения карты;
- сдвиг карты и приближение через колесо мыши;
- единая кнопка `Туман` с popup для кисти, ластика, размера кисти, формы кисти, locked fog zone, `Fog all` и `Unfog all`;
- окно презентации.

Карта разделена на несколько слоёв кода:

- `js/editor/campaignMap.js` — orchestration карты и точка сборки подсистем;
- `js/editor/campaignMapModel.js` / `campaignMapStore.js` — data-first модель и runtime store карты;
- `js/editor/campaignMapRenderAdapter.js` / `campaignMapRenderer.js` — перенос модели в DOM;
- `js/editor/campaignMapLayers.js` / `campaignMapLayerModel.js` — модель и UI слоев карты;
- `js/editor/campaignMapInitiativePopup.js` / `campaignMapInitiativeModel.js` — инициатива и порядок ходов;
- `js/editor/campaignMapContract.js` — contract карты, persistent serialization, fog canvas и asset-specific настройки;
- `js/editor/campaignMapPresentation.js` — отдельное окно презентации и его pan/zoom;
- `js/editor/campaignMapPresentationStyle.js` — стили окна презентации;
- `js/editor/campaignMapPresentationItemSync.js` — точечная синхронизация token/shape в презентации;
- `js/editor/campaignMapHealth.js` — чтение и изменение DnD-хитов токенов;
- `js/editor/campaignMapConstants.js` — общие размеры, zoom и дефолтные значения.

Добавление на карту не переносит исходную карточку. Приложение создаёт дубль выбранной карточки и кладёт его в дерево под карту:

```text
Карта
| Существа
| | Существо 1
| | Существо 2
| Объекты
| | Объект 1
```

Токен на карте хранит `data-page-id` дубля. При наведении на токен подсвечивается его карточка в дереве, двойной клик открывает дубль. Контекстное меню токена позволяет удалить, скрыть из презентации, дублировать токен вместе с дочерней карточкой в дереве или открыть изображение токена в отдельном popup. Скрытый токен на карте мастера получает бейдж `скрыт`, чтобы мастер видел его состояние без открытия презентации.

Выделение на карте поддерживает массовый режим: обычный клик выбирает один токен или фигуру, а `Shift`/`Ctrl`/`Cmd`-клик добавляет или убирает сущность из текущего выделения. Это подготовка под будущие групповые действия.

Для игроков используется отдельный режим добавления. Если карточка типа `character` или `creature` имеет тег `player`, карта может создать токен без дочернего дубля: токен хранит `data-source-mode="original"` и ссылается на оригинальную карточку игрока. Такие токены нужны, чтобы хиты и будущий инвентарь менялись в одном источнике, а не в копии карты.

Координаты токенов хранятся в процентах от внутренней плоскости карты, чтобы позиции совпадали в обычном режиме и в презентации. Существо по умолчанию занимает одну клетку сетки. Объект рассчитан на PNG с прозрачным фоном: он отображается как чистая картинка без фоновой фигуры, может перемещаться, пропорционально масштабироваться за уголки и поворачиваться отдельной ручкой. Обычная карта и режим презентации имеют независимые pan/zoom состояния. Режим презентации открывает отдельное окно с дублем карты и объектов без интерфейса; изменения карты синхронизируются туда во время работы.

Размер сетки и туман войны сохраняются за конкретным изображением карты. При смене изображения карта получает сохранённые настройки этого изображения, а если их ещё нет — дефолтную сетку и пустой туман. Кисть тумана может быть круглой или квадратной. Locked fog zones защищают выбранные области тумана от стирания кистью; сейчас это MVP-зоны, которые можно добавить и удалить кликом.

Слои карты устроены так, чтобы объекты не перекрывали сетку визуально: туман находится над всем, существа над сеткой, сетка над объектами. При этом pointer events остаются на токенах, поэтому объекты и существа можно двигать как интерактивные элементы верхнего слоя.

Перед сохранением карта защищается от разъезда state и DOM: autosave пропускает запись, если текущая страница и открытый редактор не совпадают по типу. Парсер front matter читает `template`, `type`, `tags` и другие системные поля только из блока `---`, чтобы строки внутри HTML не могли случайно изменить тип страницы.

## Tree State

Дерево запоминает свернутые родительские ветки в `localStorage` и дополнительно в workspace-файле `.my-own-world-ui.json`. Workspace state нужен, чтобы состояние раскрытия переживало жёсткий reload, смену origin/порта и особенности кеширования браузера.

`.my-own-world-ui.json` хранит только UI-состояние приложения, не является карточкой и не должен попадать в `pages/`.

## Save Queue

Все записи файлов должны идти через `js/storage/writeQueue.js`.

Правила:

- для текстовых файлов использовать `writeTextFile()`;
- для страниц использовать `writePageContent()`;
- для бинарных asset-файлов использовать `writeFile()`;
- не вызывать `createWritable()` напрямую вне write queue.

Очередь сериализует записи по ключу страницы или файла, чтобы быстрые autosave, действия карты, изменение хитов и загрузка изображений не перетирали друг друга.

## Editor History Contract

История редактора описана в `docs/02-architecture/contracts/EDITOR_HISTORY_CONTRACT.md`.

Короткое правило: любое действие приложения, которое меняет persistent content карточки, должно проходить через единый history layer. Runtime UI вроде popup, toolbar, drag preview и элементов с `data-runtime="true"` не должен попадать в undo/redo snapshot.

Текущий `js/editor/editorHistory.js` является промежуточным слоем. Следующий архитектурный шаг — перевести `Ctrl+Z / Ctrl+Y`, paste, форматирование, блоки, таблицы и wiki-links на управляемые history transactions.

## Smoke Tests

Перед изменениями в editor, storage, tree, campaign map или block system нужно пройти чеклист `docs/03-testing/SMOKE_TESTS.md`.

Минимум перед коммитом:

- загрузка приложения без ошибок в консоли;
- создание и повторное открытие карточки;
- сохранение состояния свернутого дерева после `Ctrl + F5`;
- создание карты, добавление токена, изменение fog, reload;
- проверка diff на UTF-8 mojibake-маркеры.

## Contenteditable Policy

Политика редактируемости живёт в `js/editor/contenteditablePolicy.js`.

Можно редактировать только:

- `.rich-text-field`;
- `.singleline-field`;
- `.table-cell-content`;
- элементы с `data-persistent-editable="true"`.

Нельзя редактировать напрямую:

- `.card-shell`;
- `.template-block`;
- meta-зоны карточки;
- runtime controls;
- таблицу как контейнер;
- popup и toolbar UI.

При открытии страницы приложение вставляет HTML, применяет contenteditable policy, запускает Block System Contract, повторно применяет policy и затем восстанавливает runtime-поведение.

## Block System Contract

Блок состоит из двух слоёв:

- persistent HTML: сохраняется в `.md`;
- runtime controls: создаётся приложением и удаляется перед сохранением.

Каждый блок должен иметь:

```html
<div
  class="template-block"
  data-block-type="text"
  data-block-version="1"
  contenteditable="false"
>
</div>
```

Runtime-элементы обязаны иметь:

```html
data-runtime="true"
contenteditable="false"
```

Сохранение выполняется через `serializePersistentEditorHTML()` из `js/editor/blocks/blockContract.js`. `blockContract.js` является фасадом: runtime selectors лежат в `blockRuntimeSelectors.js`, runtime marking — в `blockRuntime.js`, table contract — в `blockTableContract.js`, selective upgrades — в `blockUpgrades.js`, runtime controls — в `blockRuntimeControls.js`, serializer — в `blockSerializer.js`. Serializer копирует значения persistent form controls, удаляет runtime controls, чистит runtime-зеркала тегов и aliases, а также не сохраняет временные `src` у asset images.

## Selective Block Upgrades

Глобальной миграции всей страницы нет. Если меняется структура блока, повышается только `data-block-version` конкретного блока и добавляется точечный upgrade в `blockContract.js`.

Пример текущих upgrades:

- `dndStats` до версии `3`;
- `characterStats` до версии `2`.

## Tables Runtime

Правила таблиц описаны в `docs/02-architecture/contracts/TABLES_CONTRACT.md`.

Таблицы подключаются через `js/ui/tables.js`, но сама логика разделена на маленькие подсистемы:

- `js/ui/tables/tableRows.js` — добавление, удаление и фокус строк;
- `js/ui/tables/tableClipboard.js` — plain-text paste в ячейки;
- `js/ui/tables/tableColumns.js` — `colgroup`, ширины столбцов и resize-cursor;
- `js/ui/tables/tableResize.js` — состояние перетаскивания границы столбца;
- `js/ui/tables/tableSelectionState.js` — выделение диапазона ячеек;
- `js/ui/tables/tableToolbar.js` — toolbar выделенных ячеек;
- `js/ui/tables/tableCells.js` и `tableConstants.js` — общие helper-функции и константы.

Persistent HTML таблицы хранит только содержимое, структуру строк/ячеек и размеры `col`. Runtime-кнопки строк, toolbar выделения и transient selection не должны попадать в сохраненный HTML.

## Card Properties Blocks

Блок `Свойства` создается с учетом текущего типа карточки. Пользователь не выбирает схему вручную: popup добавления блока показывает `Свойства` только для поддержанных типов.

Текущие варианты:

- `skill` - уровень навыка, вид действия, урон, диапазон, размер, форма, эффект;
- `magic` - уровень, вид действия, урон, диапазон, размер, форма, эффект;
- `item` - стоимость в ЗМ/СМ/ММ, вес и эффект;
- `creature` - КЗ, хиты, скорость, чувства и особенности;
- `object` - размер, материал, прочность, взаимодействие и эффект;
- `location` - масштаб, климат, опасность и особенности;
- `region` - рельеф, центр, фракции и особенности;
- `character` - использует существующий `Стат. блок DnD` как свойства персонажа.

Схемы свойств описаны в `js/properties/propertySchemas.js`, совместимый экспорт находится в `js/templates/propertyBlockDefinitions.js`, HTML создается через `createPropertiesBlock()` в `js/templates/blockTypes.js`, а выбор текущего типа карточки выполняется в `js/editor/blocks/blockPopup.js`.

Правило: нельзя создавать блок свойств одного типа карточки на карточке другого типа. Если понадобится новый вариант, сначала добавляется схема в `propertySchemas.js`, затем тест.

`PropertiesModel` уже вынесен в `js/properties/propertiesModel.js`, а DnD-расчеты — в `js/properties/characterCalculations.js`. Карта при чтении и изменении хитов сначала обращается к этому расчетному слою и только затем к legacy `Стат. блок DnD`. Архивные эксперименты `Стат. блок DnD v2` и `Переменные` не возвращаются в интерфейс до появления полноценного `CharacterModel`.

## CSS Ownership

Большие CSS-файлы разделены на entrypoint-файлы и ownership-файлы:

- `styles/campaign-map.css` импортирует `campaign-map-*.css`;
- `styles/popup.css` импортирует `popup-*.css`;
- `styles/block-special.css` импортирует специализированные `block-*.css`;
- `styles/block-properties.css` отвечает за type-aware блоки свойств.

Правило: новые стили добавляются в самый узкий ownership-файл. EntryPoint-файлы должны оставаться короткими списками imports.

## UX / Onboarding

Правила onboarding описаны в `docs/03-testing/UX_ONBOARDING_CHECKLIST.md`.

В приложении есть встроенная справка:

- верхняя кнопка `Инструменты` открывает popup;
- `Быстрый старт` объясняет первый сценарий;
- `Как устроено` объясняет карточки, карту, task tracker и runtime UI;
- `Checklist` напоминает, что проверять перед изменениями.

Пример workspace находится в `docs/03-testing/sample-workspace`. Его можно открыть через кнопку папки в sidebar как обычный workspace.

## Wiki-links

Pipeline wiki-links:

1. пользователь вводит `[[текст]]` в persistent editable field;
2. raw syntax превращается в `<a class="wiki-link">`;
3. target ищется по `page.title` и `page.aliases`;
4. refresh обновляет `data-page-id`, `data-page-title` и `is-missing`.

Правило: видимый текст пользователя не перезаписывается. Если ссылка ведёт на страницу через alias или склонение, текст остаётся таким, каким он был введён.

При наведении на существующий wiki-link открывается runtime preview с названием карточки и кратким описанием из `.card-short-description`. Preview не сохраняется в `.md` и создаётся через `js/editor/wikiLinkPreview.js`.

## Runtime UI

Интерфейсные элементы, которые не являются контентом страницы, создаются отдельно и не попадают в сохранённый HTML.

К таким элементам относятся:

- controls блоков и таблиц;
- controls карты кампании;
- popup подтверждения удаления;
- preview wiki-links;
- backlinks;
- custom dropdown типа карточки;
- нижняя секция профиля в sidebar и её popup.

Удаление карточек не использует браузерные `confirm()` / `alert()`. Подтверждение идёт через `js/ui/confirmPopup.js`, а ошибки показываются в statusbar.

Popup-инфраструктура постепенно переводится на `js/ui/popupManager.js`. Manager отвечает за общие правила открытия, закрытия по outside click, закрытия по Escape, повторного клика по anchor-кнопке и позиционирования через `popupPosition.js`. Сейчас через manager уже проходят create menu, block popup, wiki create menu, wiki preview, confirm popup и profile popup. Новые popup’ы нужно добавлять через popup manager, а старые переводить на него при ближайшем изменении.

## UI Style Contract

Новые небольшие UI-элементы должны использовать базовые классы из `styles/ui.css`, если нет более конкретного компонента:

- `.ui-panel` для мягких popup/panel контейнеров;
- `.ui-button` для обычных compact-кнопок;
- `.ui-button.danger` для действий удаления;
- `.ui-input` для текстовых полей;
- `.ui-chip` для компактных меток.

Компонентные CSS-файлы могут расширять эти классы, но не должны заново копировать базовую палитру, focus state и hover state без причины.

## State API

Глобальный объект `state` остаётся единым runtime store, но новые изменения должны идти через helpers из `js/stateActions.js`:

- `setWorkspaceHandle(handle)`;
- `setCurrentPage(page)`;
- `setPages(pages)`;
- `subscribeState(key, listener)`.

Прямое присваивание `state.currentPage = ...`, `state.pages = ...`, `state.workspaceHandle = ...` не использовать в новом коде. Это нужно, чтобы позже подключить историю, debug events и реактивное обновление UI без поиска мутаций по всему проекту.

## PageRepository

Runtime-слой `PageRepository` описан в `docs/02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md`. Он уже подключен к приложению и держит живой `PageIndex`, который пересобирается после загрузки, создания, удаления, переноса и сохранения metadata страниц.

Правило для нового кода: не добавлять новые хаотичные lookup через `state.pages.find(...)`, `state.pages.filter(...)` и ручной обход parent-chain. Если подсистеме нужно найти страницу по `id`, title, alias, parent, type, tags или проверить ветку родителей, это должно проходить через `PageRepository`.

Wiki-links, sidebar search, проверка дублей названий, часть campaign map picker/player lookup, создание задач по трекеру и backlinks references уже используют `PageRepository`.

На переходном этапе прямой доступ к `state.pages` допускается только в storage, тестах, `stateActions.js` и legacy-модулях, которые еще не переведены на repository.

## Workspace Templates

Шаблоны страниц хранятся в workspace-файле `.my-own-world-templates.json`.

`js/templates/pageTemplateStorage.js` отвечает за загрузку шаблонов из workspace, миграцию старых шаблонов из `localStorage`, сериализацию, поиск по названию/типу/тегам и создание карточки из шаблона.

## Safe HTML Boundary

Граница безопасного HTML описана в `docs/02-architecture/contracts/SAFE_HTML_CONTRACT.md`.

Короткое правило: в `.md` должен попадать только persistent content. Runtime UI (`data-runtime="true"`, toolbar, popup, drag/resize handles, temporary overlays, block controls) должен удаляться перед сохранением и восстанавливаться при открытии через render/setup функции.

Контракт уже фиксирует allowlist для текстовых блоков, ссылок, wiki-links, таблиц, изображений, campaign map shell и task tracker shell. Следующий шаг плана — реализовать sanitizer на save.

Первый sanitizer уже подключен на save/load/paste в `js/editor/safeHtmlSanitizer.js`: он удаляет runtime UI, опасные теги, inline event handlers, dangerous URLs и временные `blob:` sources, сохраняя рабочие persistent-модели карты и task tracker.

## Asset Lifecycle

Правила работы с картинками и будущими медиа описаны в `docs/02-architecture/contracts/ASSET_LIFECYCLE_CONTRACT.md`.

Документ фиксирует типы ассетов (`image`, `portrait`, `mapBackground`, `mapObjectPng`, `audio`, `playlist`), будущий формат `AssetReference`, правила запрета временных `blob:` URL в сохраненных данных, missing state, broken asset checker и orphan asset detection.

## Campaign Map Performance

Стратегия производительности карты описана в `docs/02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md`.

В коде есть первый измерительный слой `js/editor/campaignMapPerformance.js`: он собирает snapshot по render/sync time, видимым токенам/фигурам, fog canvas, zoom и сравнивает его со стартовыми budgets. Это база для будущих performance smoke и оптимизации presentation full-sync.

## Campaign Map Initiative

Карта получила MVP инициативы: кнопка `Иниц.` открывает popup выбора существ на карте. Выбранных участников можно применить или бросить через `Roll d20`. После броска popup показывает итог инициативы, формулу `d20 + модификатор`, активный ход и кнопки перехода к предыдущему/следующему участнику.

Данные инициативы хранятся в `CampaignMapModel.initiative`, сохраняются в `data-initiative-state` и восстанавливаются при открытии карты. Модификатор инициативы токена хранится как `initiativeModifier`. Логика инициативы находится в `js/editor/campaignMapInitiativeModel.js`, popup UI — в `js/editor/campaignMapInitiativePopup.js`.

## Campaign Map Layers

Слои карты описаны в `js/editor/campaignMapLayerModel.js`. Есть базовые слои `Объекты`, `Существа`, `Фигуры`, а токены и фигуры сохраняют `data-layer-id` и `data-z-index`.

В toolbar карты есть кнопка `Слои`: popup позволяет включать/выключать слой и менять его порядок вверх/вниз. Состояние сохраняется в `data-layer-state`, восстанавливается через `CampaignMapModel` и применяется через `data-layer-hidden` и `style.zIndex`.

## Knowledge Graph

Правила графа описаны в `docs/02-architecture/KNOWLEDGE_GRAPH_MODEL.md`.

Первый foundation находится в `js/wiki/knowledgeGraph.js`: он строит nodes по страницам, typed relationships `treeParent` и `wikiLink`, а также список orphan pages.

## CI

GitHub Actions workflow лежит в `.github/workflows/verify.yml`.

Сейчас CI запускается на push в `main` и pull request, ставит Node.js 22 и Python 3.12, устанавливает зависимости через `npm ci`, выполняет `npm run verify`, устанавливает Chromium для Playwright и запускает `npm run test:browser`.

`npm run verify` дополнительно проверяет точный регистр import-путей через `tools/check_import_paths.mjs`. Это важно, потому что Windows может открыть `dndStats.js` даже при неверном регистре, а Ubuntu в GitHub Actions вернет 404.

Если browser smoke падает, workflow сохраняет `playwright-report/`, `test-results/` и `debug.log` как artifact `browser-smoke-artifacts`. Перед merge/push целевой ветки CI должен быть зеленым: локальные проверки не заменяют GitHub Actions, а только ускоряют обратную связь.

## Release Process

История изменений ведется в `docs/01-delivery/CHANGELOG.md`, а правила релиза описаны в `docs/01-delivery/RELEASE_PROCESS.md`.

Перед релизом нужно обновить changelog, manual, план/журнал работ, запустить `npm run verify`, `npm run test:browser` и дождаться зеленого GitHub Actions `Verify`.

## AI Onboarding

Для будущих AI-заходов есть `docs/02-architecture/AI_ONBOARDING.md`: там описана архитектура, что нельзя ломать, обязательные проверки и формат задач для Codex.

## Desktop Adapter

Desktop-направление описано в `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md`. Следующий большой маршрут проекта — Tauri spike через `StorageAdapter` и `AssetAdapter`, без изменения workspace-формата и без удаления browser mode.

Desktop-подготовка живет отдельно от браузерной версии:

- `npm run dev:web` — запускает текущую browser-версию через локальный static server на `http://127.0.0.1:5173/`;
- `npm run desktop:check` — проверяет, установлены ли Node.js, npm, Tauri CLI, Rust/Cargo и rustup;
- `npm run desktop:packaging-smoke` — проверяет desktop packaging smoke без включения production installer;
- `npm run desktop:dev` — запускает Tauri WebView поверх текущего web UI;
- `npm run desktop:info` — показывает диагностику Tauri;
- `npm run desktop:build` — будущая desktop-сборка.

Для проверки desktop-сборки понадобятся Node.js LTS, Git, Rust stable/Cargo, Microsoft Visual Studio Build Tools 2022 с `Desktop development with C++`, Microsoft Edge WebView2 Runtime и Playwright Chromium. На Windows также нужен Windows SDK, который ставится через Visual Studio Build Tools.

Важно: пока `StorageAdapter` и `AssetAdapter` не введены, desktop-spike открывает ту же browser-версию приложения в WebView. Это безопасная оболочка для проверки окружения, а не перенос storage-логики.

Storage/asset boundary уже вынесен в отдельные модули:

- `js/storage/storageAdapter.js` — facade выбора browser/desktop storage adapter;
- `js/storage/browserStorageAdapter.js` — обертка над текущим File System Access API;
- `js/storage/desktopStorageAdapter.js` — JS-мост к Tauri FS commands;
- `js/storage/assetAdapter.js` — facade будущего asset lifecycle;
- `src-tauri/src/main.rs` — минимальные команды `read_text_file`, `write_text_file`, `list_directory`, `ensure_directory`, `remove_file`, `path_exists`, `resolve_asset_url`.

Desktop-команды ограничивают операции выбранным workspace root. В desktop-режиме `DesktopStorageAdapter` выбирает workspace через Tauri dialog plugin и сохраняет путь в `localStorage`.

Проверки desktop foundation:

- `npm run desktop:check` — проверяет Node/npm/Tauri CLI/Rust/Cargo/rustup/Build Tools/Windows SDK;
- `npm run desktop:packaging-smoke` — проверяет Tauri config, asset protocol, scripts и desktop-документы;
- `cargo check` из папки `src-tauri` — проверяет Rust/Tauri-код;
- `npm run desktop:info` может долго не завершаться на текущей машине после вывода отчета, поэтому сейчас reliable gate — `desktop:check` + `cargo check`.

## Sidebar Profile

Внизу sidebar есть базовая профильная секция в стиле ChatGPT: `{user.image}`, `{user.name}`, `{user.tarif}`. Сейчас это UI-заготовка без глубоких настроек. По клику открывается пустой profile popup с кнопкой `Закрыть`.

## Formatting

Toolbar больше не вызывает `document.execCommand()` напрямую и не записывает history snapshots для форматирования сам. Основные операции форматирования (`bold`, `italic`, `underline`, списки, цвет, сброс формата и plain-text insertion) выполняются через собственные Range/DOM-операции в `js/editor/formattingService.js`. Deprecated API остался только как аварийный fallback внутри этого сервиса.

Правила форматирования описаны в `docs/02-architecture/contracts/FORMATTING_SERVICE_CONTRACT.md`. Коротко: форматирование работает только внутри persistent editable-зон, неизвестные команды игнорируются, paste вставляет plain text, reset format снимает только inline-формат, а toolbar обращается к состоянию форматирования через public API сервиса.

## Новые Block Types

Для нового типа блока нужно добавить:

- generator persistent HTML в `js/templates/blockTypes.js` или отдельном generator-файле;
- `data-block-type`;
- `data-block-version`;
- creator в `js/editor/blocks/blockFactory.js`;
- поведение в `js/ui/*`, если оно нужно;
- стили в тематическом CSS;
- runtime controls через `markRuntime()`;
- serializer/upgrade логику, если есть form controls или меняется структура;
- ручной smoke-тест: создать, заполнить, сохранить, открыть заново.

`image` block — отдельный блок без заголовка: хранит `img[data-asset]` и настройки кадрирования в `data-crop-x`, `data-crop-y`, `data-crop-zoom`. Кнопки загрузки, удаления и кадрирования остаются runtime UI.

## UTF-8

Любые текстовые файлы и runtime strings только UTF-8.

Правила:

- при чтении или записи файлов явно указывать `utf8` / `UTF-8`;
- не использовать ANSI, `cp1251`, `latin1`;
- не делать `Buffer -> string` без явного encoding;
- не добавлять runtime auto-fix encoding в приложение;
- если текст сломался, исправлять источник, а не декодировать его во время работы.

Перед merge/review проверять diff на mojibake-маркеры из пользовательского чеклиста: `Рќ` + `Р°`, `СЃ` + `Рї` + `Р°`.
