---
summary: "architecture document for PAGE_REPOSITORY_CONTRACT.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# PageRepository Contract

`PageRepository` — будущий единый слой доступа к страницам проекта. Его задача — убрать хаотичные `state.pages.find(...)`, `state.pages.filter(...)` и ручные обходы parent-chain из feature-кода.

## Зачем Нужен PageRepository

Сейчас разные подсистемы сами ищут страницы:

- wiki-links ищут target по title и aliases;
- search проходит по `state.pages`;
- проверка дублей смотрит на названия напрямую;
- campaign map picker ищет карточки по type, tags и parent-chain;
- tree context menu и drag/drop читают родителя и детей вручную;
- item/spell/skill blocks фильтруют карточки по type;
- будущий graph будет нуждаться в быстрых связях.

Такой подход работает на маленьком мире, но при росте workspace создает три проблемы:

- lookup-код дублируется и расходится по правилам;
- трудно понять, кто и зачем обходит `state.pages`;
- производительность падает, потому что одни и те же индексы пересчитываются в разных местах.

`PageRepository` должен стать public API для чтения страниц, а `PageIndex` — его внутренним ускорителем.

## Ответственность

`PageRepository` отвечает за:

- хранение текущего списка страниц как read-only представления;
- доступ к странице по `id`;
- поиск по `title`;
- поиск по `aliases`;
- получение детей и siblings;
- получение parent-chain;
- фильтрацию по `template`, `type`, `tags`;
- проверку, находится ли страница внутри ветки карты;
- проверку дублей названий;
- единый lifecycle индекса после load/create/rename/move/delete/tag/type change.

`PageRepository` не отвечает за:

- запись файлов в workspace;
- создание HTML карточек;
- autosave;
- render дерева;
- render редактора;
- изменение DOM;
- UI popup;
- бизнес-логику конкретной подсистемы.

## Source Of Truth

На этапе внедрения `state.pages` остается физическим хранилищем runtime-страниц.

Правило: новый feature-код не должен напрямую делать lookup через `state.pages`. Он должен обращаться к `PageRepository`.

Исключения на переходный период:

- низкоуровневые storage-модули, которые загружают и записывают страницы;
- `stateActions.js`, который обновляет `state.pages`;
- тесты, которые явно подготавливают fixture через `state.pages`;
- временные legacy-модули до их перевода на repository.

## Public API

Планируемый минимальный API:

```js
getAllPages()
```

Возвращает все страницы в стабильном порядке. Не должен отдавать mutable ссылку, если вызывающий код может случайно изменить массив.

```js
getPageById(id)
```

Возвращает страницу по `id` или `null`.

```js
getPageByTitle(title)
```

Ищет страницу по нормализованному title. Используется для точного поиска, а не для полнотекстового search.

```js
findPageByTitleOrAlias(value)
```

Ищет страницу по title или aliases. Главный API для wiki-links.

```js
getChildren(parentId)
```

Возвращает прямых детей страницы. Для корневых страниц `parentId` равен `null`.

```js
getSiblings(pageId)
```

Возвращает страницы того же уровня, что и выбранная страница.

```js
getParentChain(pageId)
```

Возвращает цепочку родителей от ближайшего родителя к корню или от корня к ближайшему родителю. Направление нужно зафиксировать при реализации и не менять без миграции tests.

```js
isDescendantOf(pageId, ancestorId)
```

Проверяет, находится ли страница внутри ветки другого элемента.

```js
isUnderTemplate(pageId, template)
```

Проверяет, есть ли среди родителей страница с указанным `template`. Нужен, например, чтобы исключать технические дубли карты из wiki picker и map picker.

```js
queryPages(query)
```

Единый фильтр по metadata:

```js
queryPages({
  template: 'card',
  type: ['character', 'creature'],
  tags: ['player'],
  excludeUnderTemplate: 'campaignMap',
  parent: null
})
```

```js
findDuplicateTitles()
```

Возвращает группы страниц с одинаковым видимым названием. Главный API для проверки дублей.

```js
normalizeTitle(value)
```

Единая нормализация названий для индекса, wiki-links, поиска дублей и проверки create/rename.

## PageIndex

`PageIndex` — внутренняя структура `PageRepository`.

Минимальные индексы:

- `byId`;
- `byTitle`;
- `byAlias`;
- `byParent`;
- `byTemplate`;
- `byType`;
- `byTag`.

Индекс должен пересобираться после загрузки workspace и точечно обновляться после изменений.

## Lifecycle

`PageRepository` должен поддерживать такие события:

- `rebuild(pages)` после `loadWorkspace`;
- `pageCreated(page)` после создания;
- `pageUpdated(previousPage, nextPage)` после rename, tag/type change и изменения metadata;
- `pageMoved(previousPage, nextPage)` после изменения `parent/order`;
- `pageDeleted(page)` после удаления;
- `clear()` при закрытии workspace или сбросе состояния.

На первом этапе допустимо реализовать все update-операции через `rebuild(state.pages)`, если это проще и безопаснее. После стабилизации можно оптимизировать точечные updates.

Текущая реализация:

- `js/repository/pageRepository.js` создает единый runtime `PageIndex`;
- repository подписывается на `setPages`, поэтому загрузка workspace и полная замена массива страниц автоматически пересобирают индекс;
- `PageIndex` поддерживает точечные операции `addPage()`, `updatePage()`, `deletePage()` и `deletePages()`;
- storage/editor точки, которые мутируют существующую страницу без замены массива, должны вызывать `notifyPageUpdated(previousPage, nextPage)` или `notifyPageMoved(previousPage, nextPage)`;
- если legacy-код вызывает notify без аргументов, repository оставляет fallback на полный rebuild. Это переходный защитный слой, а не желательное поведение для новых операций.

## Правила Для Нового Кода

Новый код должен:

- использовать `PageRepository` для чтения страниц;
- не делать новые `state.pages.find(...)` и `state.pages.filter(...)` вне storage/test/legacy-зон;
- не хранить собственные долгоживущие копии массива pages;
- не нормализовать title/alias локально, если есть repository helper;
- не обходить parent-chain вручную.

Если подсистеме не хватает метода, нужно добавить метод в repository, а не писать локальный обход.

## Первые Подсистемы Для Перевода

Порядок миграции:

1. `wikiLinkLookup.js` и `wikiLinkCreateMenu.js`: **сделано**;
2. `search/search.js`: **сделано**;
3. `pageTitleValidation.js`: **сделано**;
4. `campaignMapPicker.js`: **сделано**;
5. `campaignMapExternalDrop.js`: **сделано**;
6. `itemSets.js`, `dndStatsV2.js`, future spell/skill blocks: **частично сделано**;
7. `treeUtils.js` и tree context menu: **не сделано**;
8. будущий Knowledge Graph: **частично сделано**, backlinks references уже читают страницы через repository.

## Тесты

Минимальный набор unit tests для `PageRepository / PageIndex`:

- поиск по `id`;
- поиск по title с нормализацией;
- поиск по aliases;
- children/root lookup;
- parent-chain;
- `isDescendantOf`;
- `isUnderTemplate`;
- фильтр по type/tags;
- duplicate titles;
- rebuild после изменения списка страниц.

Browser regression tests добавлять после перевода первых UI-подсистем:

- wiki-link находит страницу по alias;
- search находит карточку по title/alias/content;
- проверка дублей подсвечивает конфликт;
- campaign map picker не показывает технические дубли под картой;
- player picker показывает только `player` и не создает дубль.

## Definition Of Done Для 6.1

Пункт `6.1` считается завершенным, когда:

- описана ответственность `PageRepository`;
- описан public API;
- зафиксировано правило против новых хаотичных lookup по `state.pages`;
- определены исключения переходного периода;
- определены первые подсистемы миграции;
- план обновлен и следующий пункт — `6.2 Создать PageIndex`.

## Definition Of Done Для 6.3

Пункт `6.3` считается завершенным, когда:

- `PageRepository` подключен в runtime приложения;
- индекс пересобирается после `loadWorkspace`;
- создание страницы обновляет индекс;
- удаление страницы обновляет индекс через `setPages`;
- перенос страницы обновляет индекс после изменения `parent/order`;
- переименование, aliases, tags и type обновляют индекс после сохранения;
- добавлены unit-тесты на lifecycle repository;
- план обновлен и следующий пункт — `6.4 Перевести wiki-links на PageIndex`.

## Definition Of Done Для 6.4-6.8

Пункты `6.4-6.8` считаются завершенными, когда:

- wiki-links ищут target по title/aliases через `PageRepository`;
- sidebar search получает страницы через `PageRepository`;
- проверка дублей названий использует `PageIndex`;
- campaign map picker, player lookup и external tree-drop на карту используют repository API;
- создание задач по трекеру, создание по шаблону и backlinks/future graph references не добавляют новых прямых lookup по `state.pages`;
- план обновлен и следующий P0-пункт — Safe HTML Boundary / Sanitizer.
