---
summary: "architecture document for BLOCK_SYSTEM_CONTRACT.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Block System Contract

Этот документ фиксирует правила для всех блоков редактора. Его цель: отделить HTML, который хранится в `.md`, от элементов интерфейса, которые нужны только во время работы приложения.

Campaign Map не является блоком и не является карточкой. Она использует те же правила persistent/runtime разделения, но открывается отдельным renderer-ом `js/editor/campaignMap.js`.

## Persistent HTML

Persistent HTML сохраняется в тело страницы и должен быть достаточным, чтобы восстановить блок после повторного открытия.

Каждый блок обязан иметь:

```html
<div
  class="template-block"
  data-block-type="text"
  data-block-version="1"
  contenteditable="false"
>
</div>
```

Правила:

- `data-block-type` задаёт тип блока и связывает его с поведением.
- `data-block-version` задаёт версию конкретного блока, а не всей страницы.
- Редактируемые области явно получают `contenteditable="true"`.
- Нередактируемый каркас блока получает `contenteditable="false"`.
- Persistent HTML не должен содержать кнопки управления, drag handles, popup-элементы и временные списки.

## Contenteditable Policy

Редактируемость задаётся явно через `js/editor/contenteditablePolicy.js`.

Правила:

- `#editorArea`, `.card-shell`, `.template-block`, таблицы, meta-зоны и runtime UI по умолчанию `contenteditable="false"`;
- пользовательский текст редактируется только внутри `.rich-text-field`, `.singleline-field`, `.table-cell-content` или элемента с `data-persistent-editable="true"`;
- такие поля получают `data-persistent-editable="true"` при open и после восстановления runtime controls;
- toolbar и wiki-link normalizer работают только внутри persistent editable fields;
- новые блоки не должны полагаться на наследование `contenteditable` от родителя.

При открытии страницы приложение:

1. вставляет сохранённый HTML в editor;
2. применяет contenteditable policy;
3. применяет Block System Contract и selective upgrades;
4. снова применяет contenteditable policy для восстановленных runtime controls;
5. восстанавливает assets, card type, tags, aliases, backlinks и поведение блоков.

## Runtime Controls

Runtime controls создаются приложением при открытии страницы или рендере блока. Они не сохраняются в `.md`.

Любой runtime-элемент обязан иметь:

```html
data-runtime="true"
contenteditable="false"
```

Сейчас runtime-слой включает:

- панель добавления блоков;
- кнопки блока: перенос, переименование, удаление;
- кнопки строк таблицы;
- кнопку добавления предмета в item set;
- кнопку удаления предмета из item set;
- drag handles полей блока `Свойства`;
- кастомный dropdown типа карты;
- controls карты кампании;
- окно презентации карты;
- popup добавления существ/объектов;
- popup тумана карты;
- resize/rotate handles PNG-объектов карты;
- token action popup карты;
- popup подтверждения удаления;
- preview wiki-links;
- нижнюю секцию профиля и profile popup;
- backlinks и другие информационные панели интерфейса.

Новые popup’ы должны использовать `js/ui/popupManager.js`, если нет явной причины оставить локальную реализацию. Popup manager обеспечивает единые outside click, Escape close, повторное закрытие по anchor-кнопке и viewport-safe positioning. Уже переведены create menu, block popup, wiki create menu, wiki preview, confirm popup и profile popup.

## UI Style Contract

Новые runtime controls должны опираться на базовые классы из `styles/ui.css`:

- `.ui-panel` для popup/panel контейнеров;
- `.ui-button` для compact-кнопок;
- `.ui-button.danger` для destructive-действий;
- `.ui-input` для текстовых полей;
- `.ui-chip` для маленьких меток.

Если компоненту нужен особый вид, компонентный CSS расширяет эти классы или повторно использует те же CSS-переменные. Не нужно заново копировать базовые hover/focus/background правила в новый файл без причины.

## Save Serialization

Сохранение идёт через `serializePersistentEditorHTML()` из `js/editor/blocks/blockContract.js`.

Serializer обязан:

- скопировать значения `input`, `textarea`, `select` в clone;
- пропустить поля внутри runtime controls;
- удалить все элементы с `data-runtime="true"`;
- удалить legacy runtime selectors только как fallback для старых страниц;
- очистить runtime-зеркала тегов и aliases;
- удалить runtime `src` у `img[data-asset]`, оставив стабильный `data-asset`.

Новый form control должен быть либо persistent и корректно сериализоваться, либо runtime и иметь `data-runtime="true"`.

## Campaign Map Serialization

Карта кампании сохраняет persistent HTML через общий serializer, но имеет отдельный save path в `editor.js`.

Код карты разделён по contract-границам:

- `campaignMapContract.js` отвечает за persistent serialization карты, fog canvas, asset-specific grid/fog state и проверку `campaignMap`;
- `campaignMapPresentation.js` отвечает только за отдельное окно презентации и его pan/zoom;
- `campaignMapHealth.js` отвечает только за чтение/изменение DnD-хитов дочерних карточек токенов;
- `campaignMapConstants.js` хранит общие константы карты.

Persistent данные карты:

- `data-map-asset` на `.campaign-map-stage`;
- `data-grid` на `.campaign-map-stage`;
- `data-grid-size` на `.campaign-map-stage`;
- asset-specific `data-grid*` и `data-fog*` на `.campaign-map-stage`;
- `data-fog-image` на `.campaign-map-stage`;
- `data-brush-size` на `.campaign-map-stage`;
- `data-view-x`, `data-view-y`, `data-view-zoom` на `.campaign-map-stage`;
- `.campaign-map-token` с `data-token-id`, `data-token-type`, `data-page-id`, `data-name`, `data-x`, `data-y`, `data-size`, `data-rotation`, `data-presentation-hidden`.

Runtime данные карты:

- `.campaign-map-controls`;
- popup выбора существ/объектов;
- popup размера сетки;
- popup тумана с кистью, ластиком, размером кисти, `Fog all` и `Unfog all`;
- resize/rotate handles объектов;
- popup действий токена;
- blob `background-image` на `.campaign-map-background`;
- presentation window и его независимый pan/zoom state.

Blob URL изображения карты не сохраняется: перед сохранением serializer удаляет runtime `style` у `.campaign-map-background`, оставляя стабильный `data-map-asset`.

Существа и объекты на карте являются дублями карточек, а не переносом исходных страниц. Дочерняя карточка токена остаётся обычной `template: card`; дублирование токена создаёт новый дубль карточки и новый токен. Для объектных токенов тип дубля нормализуется как `type: object`, чтобы карта не могла случайно записаться в карточку.

Объекты на карте рассчитаны на PNG с прозрачным фоном. Их визуальное состояние сохраняется через `data-size` и `data-rotation`; рамки выделения, уголки resize и ручка поворота являются runtime controls и не должны попадать в `.md`.

Autosave карты должен выполняться только когда открытый DOM и `state.currentPage` оба относятся к `campaignMap`. Если editor содержит карту, а `state.currentPage` уже указывает на карточку, сохранение пропускается, чтобы HTML карты не перезаписал карточку.

Запись `.md` карты и связанных карточек должна идти через `writePageContent()` из `js/storage/writeQueue.js`. Прямой `createWritable()` вне write queue запрещён, потому что карта может быстро запускать несколько сохранений подряд: autosave, изменение fog, изменение хитов, drag token, duplicate/delete.

## Wiki-link Policy

Wiki-links идут по pipeline: raw `[[...]]` в редактируемом поле превращается в `<a class="wiki-link">`, затем ссылка обновляется через title/aliases.

Правила:

- `[[...]]` нормализуется только внутри persistent editable fields;
- visible text пользователя не перезаписывается при refresh;
- `data-page-title` хранит каноническое название найденной страницы;
- target ищется по `page.title` и `page.aliases`;
- если target найден по alias, видимый текст остаётся таким, каким его ввёл пользователь;
- если target пропал, ссылка получает `is-missing`, но её текст остаётся нетронутым.

## Block Upgrades

Миграции должны быть точечными: только для конкретного типа блока и только при необходимости.

Пример:

```js
if (type === 'dndStats' && currentVersion < 2) {
  upgradeDndStatsToV2(block);
}
```

Нельзя возвращать глобальную миграцию всей страницы ради одного блока. Если меняется структура блока, повышается только `data-block-version` этого блока.

## New Block Checklist

Для нового типа блока нужно добавить:

- generator persistent HTML в `js/templates/blockTypes.js` или отдельном generator-файле;
- `data-block-type` и `data-block-version`;
- creator в `js/editor/blocks/blockFactory.js`;
- поведение в отдельном UI-модуле, если оно нужно;
- CSS в отдельном файле или тематическом CSS;
- runtime controls через `markRuntime()`;
- upgrade-функцию в `blockContract.js`, если структура может меняться;
- ручной smoke-тест: создать, заполнить, сохранить, открыть заново.

Image block использует `data-block-type="image"` и не имеет заголовка. Persistent HTML хранит только `.image-block-frame` и `img[data-asset]` с `data-crop-x`, `data-crop-y`, `data-crop-zoom`; кнопки загрузки, удаления и кадрирования являются runtime controls.

Основной пользовательский список блоков после упрощения:

- `text` - текстовый блок;
- `list` - универсальный блок списка;
- `table` - таблица;
- `image` - картинка;
- `properties` - свойства карточки.

Source of truth для первого уровня popup `Добавить блок` - `getVisibleBlockTypesForCardType()` в `js/editor/blocks/blockPopupViews.js`. Тесты должны проверять точный список, чтобы `items`, `spells`, `skills`, `characterEffects`, `characterSheet`, `taskTracker`, page templates и другие специализированные сценарии не возвращались в меню случайно.

Legacy-блоки `items`, `spells`, `skills`, `characterEffects`, `characterSheet`, `characterStats`, `dndStats`, `dndStatsV2` остаются поддерживаемыми при открытии старых карточек, но не должны возвращаться в первый уровень popup `Добавить блок` без отдельного продуктового решения.

Universal list block использует `data-block-type="list"` и `data-list-kind`. Его режимы меняют picker и подписи, но не меняют тип блока. Runtime-кнопка добавления удаляется при сохранении, а выбранный режим должен сохраняться в persistent HTML.

## Encoding Rule

Любые текстовые файлы и runtime strings хранятся только в UTF-8.

Правила:

- при чтении или записи файлов явно указывать `utf8` / `UTF-8`;
- не использовать ANSI, `cp1251`, `latin1`;
- не делать `Buffer -> string` без явного encoding;
- не добавлять runtime auto-fix encoding в приложение;
- если текст сломался, исправлять источник, а не декодировать его во время работы;
- перед merge/review проверять diff на mojibake-маркеры через `npm run check:encoding` и не добавлять примеры битой кодировки прямо в документацию.
