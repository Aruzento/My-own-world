---
summary: "architecture document for SAFE_HTML_CONTRACT.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Safe HTML Contract

Этот документ описывает границу безопасного HTML для MyOwnWorld.

Главная идея: пользовательский мир хранится как `.md`-файлы с HTML-телом, но приложение не должно сохранять случайный runtime UI, небезопасные теги, обработчики событий или временные DOM-состояния. Все, что попадает в файл, считается **persistent content**. Все, что нужно только интерфейсу, считается **runtime UI** и должно восстанавливаться при открытии страницы.

## Зачем Нужен Контракт

Сейчас проект local-first, но уже хранит сложный HTML:

- карточки с редактируемыми полями;
- wiki-links;
- таблицы;
- изображения;
- блоки предметов, заклинаний, навыков и DnD;
- campaign map;
- task tracker;
- runtime-кнопки, popup, drag handles, toolbar controls.

Без явной границы появляются риски:

- кнопки интерфейса случайно сохраняются в `.md`;
- вставленный HTML приносит чужие стили, классы и скрипты;
- runtime-элементы ломают повторное открытие карточки;
- будущая web/cloud-версия получает security-проблемы;
- sanitizer невозможно написать аккуратно, потому что не определено, что разрешено.

## Термины

**Persistent content** — HTML и JSON-данные, которые можно сохранять в `.md` и восстанавливать при открытии.

**Runtime UI** — кнопки, popup, drag handles, temporary overlays, подсказки, превью, resize handles, toolbar и любые элементы, которые приложение должно построить заново при render/open.

**Persistent editable zone** — зона, где пользователь может менять текст. В коде помечается `data-persistent-editable="true"` или контролируемым `contenteditable="true"`.

**Safe HTML boundary** — слой, который на save/load/paste пропускает только разрешенные теги, атрибуты и data-поля.

**Sanitizer** — будущий модуль, который будет приводить HTML к allowlist и удалять все запрещенное.

## Общие Правила

1. В persistent HTML нельзя сохранять `<script>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta>`, `<style>`, `<form>` и внешние executable-конструкции.

2. Нельзя сохранять inline event handlers:

```html
onclick=""
onerror=""
onload=""
oninput=""
onmouseover=""
```

3. Нельзя сохранять `javascript:` URL.

4. Нельзя сохранять runtime UI:

```html
data-runtime="true"
.block-actions
.blocks-toolbar
.add-block-row
.image-runtime-actions
.task-tracker-board
temporary drag/resize/selection overlays
popup containers
toolbar controls
```

5. Нельзя сохранять временные browser-only значения:

```html
blob:
data: image/svg+xml with script
style transforms generated during drag
selection classes
hover classes
```

6. `style` как атрибут запрещен по умолчанию. Исключения возможны только для точечно разрешенных случаев после отдельного решения. Текущая цель — хранить состояние через классы, data-атрибуты и модель.

7. `class` разрешен только для известных классов компонентов. Неизвестные классы sanitizer должен удалять.

8. `data-*` разрешены только из allowlist. Новые data-поля должны добавляться в contract вместе с feature.

9. Любые текстовые файлы, HTML strings и runtime strings — только UTF-8.

10. Не делать runtime auto-fix encoding. Если текст сломан, исправлять источник, а не декодировать в приложении.

## Persistent vs Runtime

### Persistent Content Можно Сохранять

- front matter `.md`;
- card shell;
- заголовок карточки;
- тип карточки;
- теги и aliases как metadata/front matter;
- короткое описание;
- блоки и их persistent content;
- wiki-links;
- таблицы;
- image references через asset path/id;
- campaign map data shell;
- task tracker persistent JSON model;
- значения input/select/checkbox, если они входят в модель блока и сериализуются явно.

### Runtime UI Нельзя Сохранять

- toolbar;
- popup;
- context menu;
- drag preview;
- drag placeholder;
- resize handles;
- rotation handles;
- block controls;
- add block buttons;
- upload buttons;
- image hover buttons;
- task tracker board DOM;
- campaign map toolbar;
- presentation-only clone DOM;
- hover preview wiki-link;
- profile/settings/tools popup.

Runtime UI должен восстанавливаться функциями render/setup после открытия страницы.

## Allowlist: Базовые Теги

Разрешенные текстовые теги:

```html
div
section
article
header
main
h1
h2
h3
h4
p
span
br
strong
b
em
i
u
s
ul
ol
li
blockquote
code
pre
hr
```

Разрешенные атрибуты для базовых тегов:

```text
class
data-block-type
data-block-version
data-persistent-editable
contenteditable
data-placeholder
```

Ограничения:

- `contenteditable="true"` разрешен только на persistent editable zones;
- `contenteditable="false"` разрешен на контейнерах;
- `data-persistent-editable="true"` разрешен только для пользовательского текста;
- `data-runtime="true"` на save должен удалять весь элемент.

## Allowlist: Ссылки

Обычные ссылки:

```html
<a href="https://example.com">...</a>
```

Разрешенные атрибуты:

```text
href
target
rel
class
```

Правила:

- `href` допускает `http:`, `https:`, `mailto:` и относительные якоря `#`;
- `javascript:` запрещен;
- если `target="_blank"`, должен быть `rel="noopener noreferrer"`;
- неизвестные атрибуты удаляются.

## Allowlist: Wiki-Links

Wiki-link хранится как обычный `<a>` с контролируемыми data-атрибутами:

```html
<a class="wiki-link internal-link" href="#" data-page-id="..." data-page-title="...">видимый текст</a>
```

Разрешенные атрибуты:

```text
href
class
data-page-id
data-page-title
```

Правила:

- видимый текст пользователя не перезаписывать;
- target искать по `data-page-id`, затем по `data-page-title`, title и aliases через `PageRepository`;
- `is-missing` можно сохранять как состояние отсутствующей ссылки, но refresh должен уметь убрать его при появлении target;
- запрещены вложенные interactive controls внутри wiki-link.

## Allowlist: Card Shell

Разрешенные основные контейнеры:

```html
<div class="entity-layout card-shell" data-card-shell="v1">
<section class="entity-header">
<section class="entity-main">
<div class="template-block hero-block">
<div class="template-block" data-block-type="..." data-block-version="...">
```

Разрешенные card shell атрибуты:

```text
class
data-card-shell
data-block-type
data-block-version
contenteditable
data-placeholder
data-persistent-editable
```

Запрещено сохранять:

- inline tag input;
- add tag button;
- alias input;
- add alias button;
- card type custom dropdown runtime shell;
- upload portrait button;
- image hover buttons.

Теги, aliases, type и template должны быть authoritative в front matter и runtime metadata страницы.

## Allowlist: Блоки

Каждый persistent block должен иметь:

```text
data-block-type
data-block-version
```

Разрешенные текущие block types:

```text
text
quote
note
items
spells
skills
dnd-stats
dnd-stats-v2-archived
variables-archived
table
image
```

Правила:

- block controls не сохраняются;
- add block row не сохраняется;
- block title сохраняется, если это часть persistent block;
- значения form controls должны проходить через serializer, а не случайный DOM snapshot;
- новые block types должны расширять этот allowlist.

## Allowlist: Формы Внутри Блоков

Разрешенные элементы:

```html
input
select
option
textarea
label
button
```

Ограничения:

- `button` по умолчанию runtime и сохраняется только если explicitly persistent в конкретном блоке;
- `input/select/textarea` сохраняются только внутри allowlisted block types;
- значения должны сериализоваться централизованно;
- разрешенные input types:

```text
text
number
checkbox
hidden
```

Разрешенные атрибуты form controls:

```text
class
type
value
checked
selected
name
data-*
placeholder
min
max
step
```

`data-*` для form controls должен быть ограничен contract конкретного блока.

## Allowlist: Таблицы

Разрешенные теги:

```html
table
thead
tbody
tr
th
td
colgroup
col
div
span
br
strong
em
u
a
```

Разрешенные атрибуты:

```text
class
contenteditable
data-persistent-editable
data-placeholder
data-column-width
style only если будет явно заменен на width sanitizer rule
```

Рекомендация для 7.3:

- ширину столбцов хранить не как свободный `style`, а как контролируемый `data-column-width`;
- runtime selection, handles и table toolbar не сохранять.

## Allowlist: Изображения

Разрешенные теги:

```html
figure
picture
img
figcaption
div
```

Разрешенные атрибуты:

```text
class
alt
data-asset
data-asset-path
data-crop-x
data-crop-y
data-crop-width
data-crop-height
data-image-kind
```

Правила:

- `src` не является authoritative storage для workspace assets;
- `blob:` URL не сохранять;
- asset path/id должен храниться в `data-asset` или `data-asset-path`;
- crop state хранить только в data-полях;
- hover-кнопки "удалить" и "кадрировать" runtime-only.

## Allowlist: Campaign Map

Карта должна сохраняться data-first через `CampaignMapModel`, а не через произвольный DOM.

Разрешенная persistent shell:

```html
<div class="campaign-map-document" data-campaign-map="v1">
<h1 class="campaign-map-title" contenteditable="true">
<div class="campaign-map-stage" ...>
```

Разрешенные data-поля карты:

```text
data-campaign-map
data-map-image
data-map-image-key
data-grid
data-grid-size
data-grid-color
data-fog-image
data-fog-mode
data-view-x
data-view-y
data-view-scale
```

Разрешенные token data-поля:

```text
data-token-id
data-page-id
data-token-type
data-source-mode
data-x
data-y
data-width
data-height
data-rotation
data-presentation-hidden
data-image-asset
```

Разрешенные shape data-поля:

```text
data-shape-id
data-shape-type
data-points
data-x
data-y
data-width
data-height
data-rotation
data-presentation-hidden
```

Запрещено сохранять:

- campaign map toolbar;
- popup;
- drag vector overlay;
- selection handles;
- resize/rotate handles;
- presentation window DOM;
- hover context menu;
- temporary performance classes.

## Allowlist: Task Tracker

Task tracker должен хранить persistent shell и JSON-модель, а runtime board строить заново.

Разрешенная persistent shell:

```html
<div class="task-tracker-document" data-task-tracker="v1">
<h1 class="task-tracker-title" contenteditable="true">
<script type="application/json" data-task-tracker-data>...</script>
```

Разрешенные атрибуты:

```text
class
data-task-tracker
data-task-tracker-data
type
contenteditable
```

Правила:

- `script` разрешен только с `type="application/json"` и только для task tracker model;
- любые executable `<script>` запрещены;
- runtime board `.task-tracker-board` не сохраняется;
- task cards, column controls и checklist controls восстанавливаются из JSON.

## Allowlist: Popup И Toolbar

Popup и toolbar не являются persistent content.

Запрещено сохранять:

```text
.create-menu
.tree-context-menu
.link-popup
.wiki-create-menu
.wiki-preview-popup
.toolbar-color-popup
.floating-toolbar
.campaign-map-popup
.profile-popup
.app-settings-popup
.app-tools-popup
```

Если popup создает persistent data, сохраняется только результат операции, а не DOM popup.

## Save Boundary

Будущий `sanitizePersistentHTMLOnSave(html)` должен:

1. удалить все `[data-runtime="true"]`;
2. удалить запрещенные теги;
3. удалить запрещенные атрибуты;
4. удалить event handlers;
5. удалить dangerous URLs;
6. нормализовать `target/rel` у ссылок;
7. удалить `src="blob:..."`;
8. оставить только allowlisted classes/data attrs;
9. синхронизировать form values через persistent serializer;
10. вернуть HTML, пригодный для `.md`.

Текущая реализация 7.3:

- модуль: `js/editor/safeHtmlSanitizer.js`;
- подключен к autosave, block serializer, сохранению campaign map/task tracker и созданию страницы по шаблону;
- удаляет runtime selectors, forbidden tags, inline `on*`, dangerous URLs, `blob:` sources на save и небезопасные style;
- сохраняет `script[type="application/json"][data-task-tracker-data]` как controlled JSON-модель task tracker;
- пока не вводит строгий allowlist всех классов и `data-*`, чтобы не сломать существующие блоки до расширения regression tests.

## Load/Open Boundary

Будущий `sanitizePersistentHTMLOnLoad(html)` должен:

1. защититься от старых или ручных `.md` с опасным HTML;
2. удалить runtime controls, если они попали в старые файлы;
3. сохранить пользовательский текст;
4. не чинить encoding runtime-хаками;
5. передать очищенный HTML в render/open pipeline;
6. после render восстановить runtime UI через setup/render функции.

Текущая реализация 7.4:

- `openPage()` прогоняет `parsed.body` через `sanitizePersistentHTMLOnLoad()` перед вставкой в editor;
- после этого обычный pipeline восстанавливает contenteditable policy, runtime controls, assets, wiki-links, backlinks и custom blocks.

## Paste Boundary

Будущий paste sanitizer должен:

1. вставлять plain text в обычные текстовые зоны;
2. разрешать минимальный safe inline HTML только если feature явно этого требует;
3. не переносить внешние классы и стили;
4. сохранять формат места вставки;
5. не допускать image/html/script вставку напрямую в persistent DOM без asset flow.

Текущая реализация 7.5:

- редактор и таблицы берут только `text/plain`;
- `sanitizePlainTextPaste()` нормализует line endings и удаляет control chars;
- HTML из clipboard не вставляется в persistent DOM.

## Security Regression Tests Для 7.6

Минимальный набор:

- `<script>alert(1)</script>` удаляется: **покрыто**;
- `<img onerror="...">` теряет `onerror`: **покрыто**;
- `<a href="javascript:...">` становится безопасной ссылкой или теряет `href`: **покрыто**;
- `[data-runtime="true"]` не попадает в saved HTML: **покрыто**;
- `.block-actions` не попадает в saved HTML: **покрыто**;
- `blob:` image src не сохраняется: **покрыто**;
- task tracker executable script удаляется, но JSON script сохраняется: **покрыто**;
- campaign map toolbar не сохраняется: **покрыто**;
- table selection/resize runtime не сохраняется: **частично покрыто через table runtime controls**;
- wiki-link сохраняет видимый текст и safe data attrs: **оставлено для следующего расширения wiki-specific tests**.

## Definition Of Done Для 7.1-7.2

Пункты `7.1-7.2` считаются завершенными, когда:

- описано, что можно сохранять;
- описано, что нельзя сохранять;
- описано, что является runtime UI;
- описано, что является persistent content;
- составлен allowlist для text blocks, headings, links, wiki-links, tables, images, campaign map shell и task tracker shell;
- план обновлен и следующий пункт — `7.3 Реализовать sanitizer на save`.
