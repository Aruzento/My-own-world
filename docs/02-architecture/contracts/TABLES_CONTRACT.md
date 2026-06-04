---
summary: "architecture document for TABLES_CONTRACT.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Tables Contract

Документ описывает правила подсистемы таблиц. Его задача - не дать таблицам снова превратиться в неявный DOM-комбайн, где resize, selection, toolbar, paste и сохранение мешают друг другу.

## Цели

- Таблица должна быть редактируемой частью карточки, а не отдельной сущностью.
- Persistent HTML должен хранить только данные таблицы и настройки, которые нужны после перезагрузки.
- Runtime UI должен восстанавливаться при открытии карточки и не попадать в `.md`.
- Поведение таблиц должно быть проверяемым regression tests.

## Владение Файлами

- `js/ui/tables.js` - точка подключения document-level событий таблиц.
- `js/ui/tables/tableRows.js` - создание, удаление и фокус строк.
- `js/ui/tables/tableClipboard.js` - plain-text paste и вставка текста в ячейку.
- `js/ui/tables/tableColumns.js` - `colgroup`, ширины столбцов и определение resize-зоны.
- `js/ui/tables/tableResize.js` - состояние активного resize столбца.
- `js/ui/tables/tableSelectionState.js` - состояние выделения диапазона ячеек.
- `js/ui/tables/tableToolbar.js` - runtime toolbar выделенных ячеек.
- `js/ui/tables/tableCells.js` - helper-функции активной ячейки и координат.
- `js/ui/tables/tableConstants.js` - общие константы таблиц.

Правило: новая логика таблиц добавляется в самый узкий модуль. `tables.js` не должен снова расти в файл, который знает все детали.

## Persistent HTML

Persistent HTML таблицы может хранить:

- `.custom-table`;
- `table`, `tbody`, `tr`, `td`;
- `.table-cell`;
- `.table-cell-content`;
- `contenteditable="true"` на `.table-cell-content`;
- текст и разрешенный inline HTML внутри ячеек;
- `colgroup` и `col`;
- `style.width` у `col`;
- `style.width` у таблицы, если оно рассчитано из ширины колонок;
- `style.textAlign` у ячеек.

Persistent HTML таблицы не должен хранить:

- `.table-selection-toolbar`;
- временные `.is-selected`;
- `.is-resizing-column`;
- document/body классы вроде `.is-table-column-resize`;
- drag/selection runtime state;
- popup, toolbar, preview или любые элементы с `data-runtime="true"`.

## Runtime UI

Runtime UI таблицы:

- controls строк создаются как runtime controls через `createTableRowControlsHTML()`;
- toolbar выделения создается динамически в `tableToolbar.js`;
- выделение ячеек живет в DOM только во время работы пользователя;
- resize-состояние живет только в `tableResize.js`;
- document cursor state живет только на время hover/drag.

Правило: если элемент нужен только для управления таблицей, он должен иметь `data-runtime="true"` или удаляться serializer/sanitizer слоем до сохранения.

## Resize Колонок

Правила resize:

- пользователь тянет только одну границу и меняет только выбранный `col`;
- соседние колонки не должны автоматически менять свою ширину;
- минимальная ширина колонки - `TABLE_MIN_COLUMN_WIDTH`, сейчас `10px`;
- общая ширина таблицы пересчитывается как сумма ширин `col`;
- если `colgroup` отсутствует, он создается через `ensureTableColumns()`;
- после resize вызывается сохранение текущей страницы.

Regression: `tests/browser/tables.spec.mjs` проверяет, что изменяется только выбранный столбец, соседний остается прежним, а ширина таблицы равна сумме колонок.

## Selection

Правила выделения:

- выделение стартует pointerdown по `.table-cell`;
- во время drag обновляется прямоугольный диапазон от стартовой ячейки до текущей;
- выделенные ячейки получают `.is-selected`;
- если пользователь кликнул без движения, toolbar не нужен;
- если пользователь выделил диапазон, появляется `.table-selection-toolbar`;
- клик вне таблицы очищает выделение.

Regression: `tests/browser/tables.spec.mjs` проверяет выделение диапазона 2x2 и корректную нормализацию координат.

## Paste

Правила paste:

- таблицы принимают только plain text;
- HTML-формат внешнего источника не переносится;
- `\t` разделяет столбцы;
- `\n` разделяет строки;
- при нехватке строк таблица создает новые строки;
- лишние значения за пределами числа колонок игнорируются;
- однострочный paste вставляется в текущий caret.

Regression: `tests/browser/tables.spec.mjs` проверяет вставку `A\tB\nC\tD` в таблицу.

## Keyboard Navigation

Правила Enter:

- `Enter` без Shift переводит фокус в ячейку ниже;
- если строки ниже нет, создается новая строка;
- `Shift+Enter` оставляет обычный перенос строки внутри текущей ячейки;
- после создания/перехода вызывается сохранение текущей страницы.

Regression: `tests/browser/tables.spec.mjs` проверяет создание новой строки и перенос фокуса.

## Save / Load Boundary

Перед сохранением таблица проходит общий persistent serializer:

- `serializePersistentEditorHTML()` из `js/editor/blocks/blockContract.js`;
- runtime controls удаляются через block runtime contract;
- sanitizer дополнительно защищает от runtime leakage и опасного HTML.

После открытия карточки runtime controls таблиц восстанавливаются через setup/render слои редактора и блоков.

## Правила Для Будущих Изменений

- Не добавлять новые document-level listeners вне `tables.js`, если они относятся к таблицам.
- Не хранить runtime state в `dataset` persistent элементов без явного решения в этом contract.
- Не менять ширину соседних колонок при resize одной колонки.
- Любая новая таблицовая функция должна иметь один из типов: persistent data, runtime UI, interaction state, serializer/sanitizer rule.
- Любое изменение resize, selection, paste или keyboard behavior должно расширять `tests/browser/tables.spec.mjs`.
