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
- единая кнопка `Туман` с popup для кисти, ластика, размера кисти, `Fog all` и `Unfog all`;
- окно презентации.

Карта разделена на несколько слоёв кода:

- `js/editor/campaignMap.js` — orchestration, события, токены, фигуры и toolbar;
- `js/editor/campaignMapContract.js` — contract карты, persistent serialization, fog canvas и asset-specific настройки;
- `js/editor/campaignMapPresentation.js` — отдельное окно презентации и его pan/zoom;
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

Токен на карте хранит `data-page-id` дубля. При наведении на токен подсвечивается его карточка в дереве, двойной клик открывает дубль. Контекстное меню токена позволяет удалить, скрыть из презентации или дублировать токен вместе с дочерней карточкой в дереве.

Для игроков используется отдельный режим добавления. Если карточка типа `character` или `creature` имеет тег `player`, карта может создать токен без дочернего дубля: токен хранит `data-source-mode="original"` и ссылается на оригинальную карточку игрока. Такие токены нужны, чтобы хиты и будущий инвентарь менялись в одном источнике, а не в копии карты.

Координаты токенов хранятся в процентах от внутренней плоскости карты, чтобы позиции совпадали в обычном режиме и в презентации. Существо по умолчанию занимает одну клетку сетки. Объект рассчитан на PNG с прозрачным фоном: он отображается как чистая картинка без фоновой фигуры, может перемещаться, пропорционально масштабироваться за уголки и поворачиваться отдельной ручкой. Обычная карта и режим презентации имеют независимые pan/zoom состояния. Режим презентации открывает отдельное окно с дублем карты и объектов без интерфейса; изменения карты синхронизируются туда во время работы.

Размер сетки и туман войны сохраняются за конкретным изображением карты. При смене изображения карта получает сохранённые настройки этого изображения, а если их ещё нет — дефолтную сетку и пустой туман.

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

История редактора описана в `docs/EDITOR_HISTORY_CONTRACT.md`.

Короткое правило: любое действие приложения, которое меняет persistent content карточки, должно проходить через единый history layer. Runtime UI вроде popup, toolbar, drag preview и элементов с `data-runtime="true"` не должен попадать в undo/redo snapshot.

Текущий `js/editor/editorHistory.js` является промежуточным слоем. Следующий архитектурный шаг — перевести `Ctrl+Z / Ctrl+Y`, paste, форматирование, блоки, таблицы и wiki-links на управляемые history transactions.

## Smoke Tests

Перед изменениями в editor, storage, tree, campaign map или block system нужно пройти чеклист `docs/SMOKE_TESTS.md`.

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

Сохранение выполняется через `serializePersistentEditorHTML()` из `js/editor/blocks/blockContract.js`. Serializer копирует значения persistent form controls, удаляет runtime controls, чистит runtime-зеркала тегов и aliases, а также не сохраняет временные `src` у asset images.

## Selective Block Upgrades

Глобальной миграции всей страницы нет. Если меняется структура блока, повышается только `data-block-version` конкретного блока и добавляется точечный upgrade в `blockContract.js`.

Пример текущих upgrades:

- `dndStats` до версии `3`;
- `characterStats` до версии `2`.

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

Runtime-слой `PageRepository` описан в `docs/PAGE_REPOSITORY_CONTRACT.md`. Он уже подключен к приложению и держит живой `PageIndex`, который пересобирается после загрузки, создания, удаления, переноса и сохранения metadata страниц.

Правило для нового кода: не добавлять новые хаотичные lookup через `state.pages.find(...)`, `state.pages.filter(...)` и ручной обход parent-chain. Если подсистеме нужно найти страницу по `id`, title, alias, parent, type, tags или проверить ветку родителей, это должно проходить через `PageRepository`.

Wiki-links, sidebar search, проверка дублей названий, часть campaign map picker/player lookup, создание задач по трекеру и backlinks references уже используют `PageRepository`.

На переходном этапе прямой доступ к `state.pages` допускается только в storage, тестах, `stateActions.js` и legacy-модулях, которые еще не переведены на repository.

## Safe HTML Boundary

Граница безопасного HTML описана в `docs/SAFE_HTML_CONTRACT.md`.

Короткое правило: в `.md` должен попадать только persistent content. Runtime UI (`data-runtime="true"`, toolbar, popup, drag/resize handles, temporary overlays, block controls) должен удаляться перед сохранением и восстанавливаться при открытии через render/setup функции.

Контракт уже фиксирует allowlist для текстовых блоков, ссылок, wiki-links, таблиц, изображений, campaign map shell и task tracker shell. Следующий шаг плана — реализовать sanitizer на save.

Первый sanitizer уже подключен на save/load/paste в `js/editor/safeHtmlSanitizer.js`: он удаляет runtime UI, опасные теги, inline event handlers, dangerous URLs и временные `blob:` sources, сохраняя рабочие persistent-модели карты и task tracker.

## Asset Lifecycle

Правила работы с картинками и будущими медиа описаны в `docs/ASSET_LIFECYCLE_CONTRACT.md`.

Документ фиксирует типы ассетов (`image`, `portrait`, `mapBackground`, `mapObjectPng`, `audio`, `playlist`), будущий формат `AssetReference`, правила запрета временных `blob:` URL в сохраненных данных, missing state, broken asset checker и orphan asset detection.

## Campaign Map Performance

Стратегия производительности карты описана в `docs/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md`.

В коде есть первый измерительный слой `js/editor/campaignMapPerformance.js`: он собирает snapshot по render/sync time, видимым токенам/фигурам, fog canvas, zoom и сравнивает его со стартовыми budgets. Это база для будущих performance smoke и оптимизации presentation full-sync.

## Campaign Map Initiative

Карта получила MVP инициативы: кнопка `Иниц.` открывает popup выбора существ на карте. Выбранных участников можно применить или бросить через `Roll d20`.

Данные инициативы хранятся в `CampaignMapModel.initiative`, сохраняются в `data-initiative-state` и восстанавливаются при открытии карты. Логика инициативы находится в `js/editor/campaignMapInitiativeModel.js`, popup UI — в `js/editor/campaignMapInitiativePopup.js`.

## CI

GitHub Actions workflow лежит в `.github/workflows/verify.yml`.

Сейчас CI запускается на push в `main` и pull request, ставит зависимости через `npm ci`, выполняет `npm run verify`, устанавливает Chromium для Playwright и запускает `npm run test:browser`.

Если browser smoke падает, workflow сохраняет `playwright-report/`, `test-results/` и `debug.log` как artifact `browser-smoke-artifacts`. Перед merge/push целевой ветки CI должен быть зеленым: локальные проверки не заменяют GitHub Actions, а только ускоряют обратную связь.

## Release Process

История изменений ведется в `CHANGELOG.md`, а правила релиза описаны в `docs/RELEASE_PROCESS.md`.

Перед релизом нужно обновить changelog, manual, план/журнал работ, запустить `npm run verify`, `npm run test:browser` и дождаться зеленого GitHub Actions `Verify`.

## Sidebar Profile

Внизу sidebar есть базовая профильная секция в стиле ChatGPT: `{user.image}`, `{user.name}`, `{user.tarif}`. Сейчас это UI-заготовка без глубоких настроек. По клику открывается пустой profile popup с кнопкой `Закрыть`.

## Formatting

Toolbar больше не вызывает `document.execCommand()` напрямую и не записывает history snapshots для форматирования сам. Deprecated API, inline formatting, block formatting и состояние команд изолированы в `js/editor/formattingService.js`, чтобы позже заменить browser fallback собственным formatting layer без переписывания toolbar.

Правила форматирования описаны в `docs/FORMATTING_SERVICE_CONTRACT.md`. Коротко: форматирование работает только внутри persistent editable-зон, неизвестные команды игнорируются, paste вставляет plain text, reset format снимает только inline-формат, а toolbar обращается к состоянию форматирования через public API сервиса.

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
