---
summary: "architecture document for FORMATTING_SERVICE_CONTRACT.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# FormattingService Contract

Этот документ фиксирует правила текстового форматирования в редакторе. Цель контракта — чтобы toolbar, история редактора и сохранение карточки работали по одному набору правил, а deprecated browser API оставался только аварийным fallback внутри одного файла.

## Главный Принцип

`js/editor/formattingService.js` является единственной точкой входа для inline-форматирования persistent-текста.

Toolbar, paste-логика и будущие UI-компоненты не должны напрямую вызывать:

- `document.execCommand()`;
- `document.queryCommandState()`;
- низкоуровневые DOM-команды форматирования, если для них уже есть метод сервиса.

Если нужно добавить новую команду форматирования, сначала добавляется public-метод или разрешенная команда в `formattingService.js`, затем toolbar вызывает именно этот слой.

## Область Действия

Форматирование разрешено только внутри persistent editable-зон:

- `.rich-text-field`;
- `.singleline-field`;
- `.table-cell-content`;
- элементы с `data-persistent-editable="true"`.

Форматирование не должно применяться к runtime UI:

- toolbar;
- popup;
- кнопки блоков;
- drag handles;
- элементы с `data-runtime="true"`;
- контейнеры карточек, блоков, карт и task tracker, если они сами не являются persistent editable.

Проверка границы выполняется через `isSelectionInsidePersistentEditable()`.

## Inline Formatting

Inline formatting — это изменение выделенного фрагмента текста без замены блочной структуры документа.

Основные команды выполняются собственной Range/DOM-реализацией в `formattingService.js`:

- `bold` — жирный текст;
- `italic` — курсив;
- `underline` — подчеркивание;
- `insertUnorderedList` — маркированный список;
- `insertOrderedList` — нумерованный список;
- `foreColor` — цвет текста;
- `removeFormat` — сброс inline-формата;
- `insertText` — только как fallback для plain-text paste.

Любая неизвестная команда должна возвращать `false` и ничего не менять.

`document.execCommand()` больше не является основным механизмом этих операций. Он остается только последней аварийной попыткой внутри `formattingService.js`, если собственная операция не смогла выполниться в конкретной браузерной ситуации.

## Block Formatting

Block formatting — это перевод выбранных текстовых блоков в:

- обычный текст `p`;
- `h1`;
- `h2`;
- `h3`;
- `h4`.

Текущее поведение вызывается из toolbar, но исполняется через `formatSelectedBlockWithHistory()` в `formattingService.js`.

- менять можно только блоки внутри одного persistent editable root;
- нельзя захватывать соседние блоки вне выделения;
- нельзя создавать вложенные заголовки вроде `h2` внутри `h1`;
- если выделение пересекает несколько блоков, меняются только пересеченные блоки;
- после изменения выделение восстанавливается вокруг измененных блоков;
- действие должно попасть в Editor History как отдельная history action.

Toolbar не должен самостоятельно менять теги блоков или записывать историю для block formatting.

## Text Color

Цвет текста применяется через `applyTextColor(color)`.

Правила:

- цвет применяется только к текущему выделению;
- цвет не применяется без persistent selection;
- последние цвета являются runtime UI и не сохраняются в карточку как отдельные данные;
- в persistent HTML сохраняется только результат форматирования текста.

## Reset Format

`clearInlineFormatting()` снимает только inline-форматирование выделенного текста.

Он не должен:

- удалять блоки;
- менять тип карточки;
- удалять wiki-links как сущности;
- трогать runtime controls;
- чистить весь editable root, если выделен только фрагмент.

## Plain-Text Paste

Paste должен вставлять plain text и наследовать стиль места вставки.

`insertPlainTextFallback(text)`:

- принимает только строку;
- работает только внутри persistent editable-зоны;
- сначала вставляет текст собственной Range/DOM-операцией;
- использует deprecated `insertText` только как аварийный fallback;
- возвращает `true`, если вставка выполнена;
- возвращает `false`, если выделение не подходит.

Приложение не должно переносить внешний HTML-формат при обычной вставке текста.

## Состояние Toolbar

Toolbar подсвечивает активные кнопки через public API:

- `queryInlineFormattingState(command)` для inline-команд;
- локальную проверку выбранного block tag для `p`, `h1`, `h2`, `h3`, `h4`;
- локальную проверку ссылки для кнопки link.

Toolbar не должен напрямую читать `document.queryCommandState()`.

## Editor History

Форматирование считается отдельным действием истории.

Перед изменением persistent content нужно создать snapshot, затем выполнить команду, затем сохранить страницу. Runtime UI не должен попадать в snapshot.

Связанный документ: `docs/02-architecture/contracts/EDITOR_HISTORY_CONTRACT.md`.

## Fallback И Будущая Замена

Deprecated API остается только как аварийный fallback внутри `formattingService.js`.

Сделано:

1. Добавлены собственные операции над Range/DOM для основных inline-команд.
2. Public API сервиса сохранен, toolbar не переписан.
3. Browser regression tests расширены на списки, цвет, reset format и plain-text insertion.

Следующее развитие:

1. Разбить большой `formattingService.js` на маленькие модули: inline formatting, block formatting, list formatting, query state.
2. Добавить более тонкие tests для mixed nested selection и сложных таблиц.
3. После накопления покрытия удалить аварийный `execCommand` fallback полностью.
