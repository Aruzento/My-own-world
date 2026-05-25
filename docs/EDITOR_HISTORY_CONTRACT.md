# Editor History Contract

Этот документ описывает, как должна работать история редактора: `Ctrl+Z`, `Ctrl+Y`, вставка текста, форматирование, изменение блоков, таблиц и wiki-links. Контракт нужен, чтобы следующие изменения не зависели от случайного поведения браузерного `contenteditable`.

## Цель

История редактора должна давать предсказуемый откат действий пользователя внутри карточки. Пользователь ожидает, что он может отменить ввод текста, вставку, форматирование, создание и удаление блоков, изменения таблиц и создание wiki-links.

## Термины

`History Action` — одно логическое действие пользователя. Например: "вставить текст", "сделать выделение жирным", "удалить блок", "переместить строку таблицы".

`Snapshot` — снимок persistent HTML редактора до или после действия. Snapshot не должен включать runtime UI: кнопки блоков, popup, drag handles, временные подсказки.

`Transaction` — управляемая операция, у которой есть начало, изменение DOM или модели и финальная запись в историю.

`Native Text Input` — обычный набор текста внутри `contenteditable` или поля ввода.

`Structural Action` — действие, которое меняет структуру документа, а не только символы: блоки, таблицы, wiki-links, изображения, карточные поля.

`Selection Bookmark` — сохраненное положение курсора или выделения. Оно нужно, чтобы после undo/redo курсор возвращался в понятное место.

## Главный Принцип

У редактора должен быть один слой, который решает, попадает действие в историю или нет. Этот слой не обязан сразу быть сложной моделью документа, но все точки изменения DOM должны проходить через него.

```text
Любое действие приложения, которое меняет persistent content, должно:
1. открыть history transaction;
2. записать snapshot до изменения;
3. выполнить изменение;
4. записать snapshot после изменения;
5. вызвать save/autosave.
```

Если действие меняет только runtime UI, оно должно явно оставаться вне истории.

## Что Входит В Историю

В историю входят только изменения persistent content:

- текст в `[data-persistent-editable="true"]`;
- заголовок карточки;
- краткое описание;
- HTML внутри persistent блоков;
- значения persistent form controls;
- структура блоков;
- таблицы;
- wiki-links;
- изображения и crop-state;
- card type, tags, aliases, если они сохраняются в карточку;
- persistent HTML task tracker;
- persistent HTML campaign map.

## Что Не Входит В Историю

В историю не входят runtime элементы:

- popup;
- toolbar;
- контекстные меню;
- drag preview;
- placeholder переноса;
- подсветка hover/selected;
- временные кнопки блоков;
- presentation window;
- statusbar;
- любые элементы с `data-runtime="true"`.

Если runtime элемент случайно попал в snapshot, это ошибка serializer/history boundary.

## Границы Действий

### Ввод Текста

Обычный набор текста должен группироваться. Нельзя создавать отдельный history item на каждый символ без необходимости.

Рекомендуемое правило:

- одна группа ввода длится до паузы примерно 700-1000 мс;
- `Enter`, `Backspace` на границе блока, paste, форматирование и потеря фокуса закрывают группу;
- переключение карточки всегда закрывает группу.

### Вставка Текста

Paste должен быть самостоятельным `History Action`.

Правила:

- вставляем plain text, если пользователь не вставляет специально поддерживаемый HTML;
- форматирование вставленного текста наследует место вставки;
- перед paste сохраняется snapshot;
- после paste сохраняется snapshot;
- после paste запускаются нормализация wiki-links и autosave.

### Форматирование

Форматирование должно быть самостоятельным `History Action`.

В историю входят bold, italic, underline, списки, заголовки, обычный текст, цвет, reset format и создание обычной ссылки.

`execCommand` может оставаться fallback внутри `formattingService`, но toolbar не должен напрямую принимать решение о записи истории. Toolbar должен вызывать formatting/history service.

### Блоки

Каждое структурное действие блока является отдельным `History Action`: добавить, удалить, переименовать, изменить тип, переместить блок, изменить special block data, изменить image block/crop.

Перед удалением блока snapshot обязателен, чтобы undo мог вернуть блок.

### Таблицы

Таблицы должны иметь отдельные action labels:

- изменить текст ячейки;
- вставить строки/колонки;
- удалить строки/колонки;
- изменить ширину колонки;
- изменить выравнивание выделенных ячеек;
- paste в таблицу.

Выделение ячеек само по себе не входит в историю.

### Wiki-links

Wiki-link action не должен перезаписывать видимый текст пользователя.

Правила:

- видимый текст ссылки остается таким, как ввел пользователь;
- target ищется по title и aliases;
- нормализация `[[...]]` должна попадать в историю как часть действия input/paste, а не отдельным неожиданным undo-шагом;
- refresh existing/missing не должен менять history, если меняется только runtime-класс.

## Page Scope

История должна быть привязана к `page.id`.

Правила:

- undo не должен переноситься между карточками;
- при открытии другой страницы активная text transaction закрывается;
- у каждой страницы может быть свой undo/redo stack;
- если страница удалена, ее stack очищается;
- если страница переименована, stack остается, потому что ключом является `id`.

## Save Contract

После undo/redo документ должен сохраняться так же, как после обычного действия.

Правила:

- undo/redo применяет persistent snapshot;
- после применения snapshot запускаются runtime enhancers: controls, toolbar bindings, wiki-link refresh, table bindings;
- затем вызывается save/autosave;
- statusbar показывает понятное состояние.

## Redo Contract

Redo появляется только после undo.

Правила:

- новое действие после undo очищает redo stack;
- redo восстанавливает следующий snapshot;
- redo тоже вызывает save/autosave;
- redo не должен срабатывать в campaign map presentation window.

## Selection Contract

После undo/redo редактор должен вернуть фокус в понятное место.

Минимум:

- если есть selection bookmark, восстановить его;
- если bookmark больше невалиден, сфокусировать ближайший persistent editable;
- если editable нет, оставить editor area без фокуса.

## Public API Будущего Слоя

Целевой модуль может называться `editorHistoryService.js`.

Минимальный API:

```js
beginHistoryTransaction(editor, options)
commitHistoryTransaction(editor, options)
cancelHistoryTransaction(editor)
pushHistorySnapshot(editor, options)
undoEditorHistory(editor)
redoEditorHistory(editor)
clearEditorHistory(pageId)
closeActiveTextGroup(editor)
```

`options`:

- `pageId`;
- `label`;
- `type`;
- `selectionBefore`;
- `selectionAfter`;
- `saveAfter`;
- `source`.

## Migration Plan

1. Оставить текущий `editorHistory.js` как временный слой.
2. Добавить redo stack и page-scoped stacks.
3. Перевести paste на history transaction.
4. Перевести toolbar formatting на history transaction.
5. Перевести block actions на history transaction.
6. Перевести table structural actions на history transaction.
7. Перевести wiki-link normalization на action-aware pipeline.
8. Добавить browser regression tests на каждый сценарий.

## Тестовые Сценарии

P0:

- набрать текст, нажать `Ctrl+Z`, текст откатился;
- paste plain text, `Ctrl+Z`, вставка откатилась целиком;
- выделить часть текста, сделать `H2`, `Ctrl+Z`, соседний текст не изменился;
- удалить блок, `Ctrl+Z`, блок вернулся;
- изменить ширину таблицы, `Ctrl+Z`, ширина вернулась;
- создать wiki-link, `Ctrl+Z`, ссылка вернулась в исходный текст;
- перейти в другую карточку, `Ctrl+Z` не меняет предыдущую карточку.

P1:

- redo после undo;
- новое действие после undo очищает redo;
- undo после autosave не ломает сохранение;
- undo не сохраняет runtime controls в `.md`.

## Текущий Статус

На момент выполнения пунктов 4.2-4.5 в проекте есть управляемый `editorHistory.js`. Он уже перехватывает основные операции и делает page-scoped persistent snapshots:

- есть `Ctrl+Z` и `Ctrl+Y` / `Ctrl+Shift+Z`;
- есть page-scoped undo/redo stacks;
- paste, toolbar formatting, блоки, таблицы и wiki-link connect подключены к history layer;
- runtime UI не записывается в persistent snapshot;
- selection bookmark пока примитивный;
- обычный набор текста пока snapshot-based и без группировки по паузам.

Следующий шаг по плану — закрепить FormattingService правила и затем постепенно добавлять более тонкие regression tests для history-сценариев.
