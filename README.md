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

Front matter хранит системные поля страницы. HTML ниже front matter является persistent content и должен быть достаточным для восстановления карточки при открытии.

## Unified Card Shell

Все типы, включая `Персонаж`, `Локация`, `Регион`, `Папка`, `Магия`, `Предмет`, `Лор` и `Заметка`, остаются одной сущностью: карточкой. Тип сохраняется в `page.type`, а не создаёт отдельную модель данных.

Системные теги могут использоваться для отображения иконок и совместимости, но пользовательские теги не должны становиться заменой `page.type`.

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
- popup подтверждения удаления;
- preview wiki-links;
- backlinks;
- custom dropdown типа карточки;
- нижняя секция профиля в sidebar и её popup.

Удаление карточек не использует браузерные `confirm()` / `alert()`. Подтверждение идёт через `js/ui/confirmPopup.js`, а ошибки показываются в statusbar.

## Sidebar Profile

Внизу sidebar есть базовая профильная секция в стиле ChatGPT: `{user.image}`, `{user.name}`, `{user.tarif}`. Сейчас это UI-заготовка без глубоких настроек. По клику открывается пустой profile popup с кнопкой `Закрыть`.

## Formatting

Toolbar больше не вызывает `document.execCommand()` напрямую. Deprecated API изолирован в `js/editor/formattingService.js`, чтобы позже заменить его собственным formatting layer без переписывания toolbar.

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

## UTF-8

Любые текстовые файлы и runtime strings только UTF-8.

Правила:

- при чтении или записи файлов явно указывать `utf8` / `UTF-8`;
- не использовать ANSI, `cp1251`, `latin1`;
- не делать `Buffer -> string` без явного encoding;
- не добавлять runtime auto-fix encoding в приложение;
- если текст сломался, исправлять источник, а не декодировать его во время работы.

Перед merge/review проверять diff на mojibake-маркеры из пользовательского чеклиста: `Рќ` + `Р°`, `СЃ` + `Рї` + `Р°`.
