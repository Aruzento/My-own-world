---
summary: "Knowledge graph model and visual graph view foundation."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Knowledge Graph Model

Knowledge Graph - слой, который смотрит на мир не только как на дерево папок, а как на сеть связей.

## Цель

Граф нужен для:

- typed relationships;
- поиска сиротских страниц;
- улучшения backlinks;
- визуального исследования мира.

## Nodes

Каждая node соответствует странице workspace.

Минимальные поля:

- `id` - стабильный идентификатор страницы;
- `title` - человекочитаемое название;
- `parent` - родитель в дереве или `null`;
- `type` - тип карточки или сущности;
- `template` - `card`, `campaignMap`, `taskTracker`, `knowledgeGraph` and other special templates;
- `tags` - пользовательские и системные теги;
- `aliases` - альтернативные названия.

## Typed Relationships

Текущий набор типов:

- `treeParent` - связь родитель -> ребенок из дерева. В UI называется `В дереве`;
- `wikiLink` - связь страница -> цель wiki-link;
- explicit relationship types from `page.relationships`, such as `ally`, `enemy`, `owner`, `equipped`, `ruleEffect`.

Позже можно добавить:

- `mapTokenSource` - токен карты связан с карточкой-источником;
- `taskReference` - задача ссылается на карточку;
- richer `manualRelation` records with ids, direction, label, description and visibility.

## Orphan Pages

Orphan page - страница, у которой нет входящих и исходящих graph-связей.

Это не всегда ошибка. Иногда это черновик или заготовка. Но фильтр одиночных страниц полезен для чистки мира.

## Backlinks Improvements

Backlinks должны перейти от простого списка "кто ссылается" к graph-backed представлению:

- показывать тип связи;
- отделять tree-parent от wiki-link;
- позже показывать карту/задачи как отдельные источники отношений.

## Текущий Код

Минимальный foundation находится в `js/wiki/knowledgeGraph.js`.

Покрытие:

- `tests/knowledgeGraph.test.mjs` проверяет `treeParent`, `wikiLink`, explicit relationships and orphan pages.
- `buildKnowledgeGraphCanvasModel` строит lightweight visual canvas model из готового graph: видимые nodes, edges, координаты, счетчики связей, количество скрытых узлов/связей and filter summary.

## Visual Graph View

Visual canvas есть как usable workbench:

- default layout - `tree`: корневые страницы и два уровня вниз по `treeParent`;
- alternate `domain` layout группирует nodes по readable domains: characters, items, organizations, locations, maps, rules and notes;
- alternate `hub` layout оставляет центральное представление для быстрого обзора связанных узлов;
- UI показывает nodes, SVG edges, zoom/pan/fit, filters and right-click node actions;
- runtime node drag меняет координаты node на текущем canvas и сразу обновляет связанные SVG edges;
- moved nodes can be saved as pinned positions in the Knowledge Graph page view state;
- graph view state is stored as a safe `application/json` script inside the graph page and contains presentation state only;
- right-click node actions can start a simple canvas connection mode for creating manual relationships;
- graph canvas has local undo/redo for node moves, saved position reset and manual relationship creation;
- readable view presets separate `Стандартный вид`, `В дереве`, `Wiki-ссылки`, `Ручные связи`, `Все связи` and `Одинокие`;
- canvas world dynamically expands when a node is dragged near an edge;
- canvas transform-layer общий для SVG edges and node cards, поэтому pan двигает граф целиком;
- fixed background domain labels, bottom node list and visual tabs are not part of the current first screen.

## Infinite Canvas Rule

Canvas должен разделять:

- world coordinates: logical node positions and edge endpoints;
- viewport: pan/zoom transform;
- visible stage: the DOM area available to the user.

Dragging empty space changes viewport pan. Dragging a node changes node world coordinates. When a node approaches the edge, world bounds expand and the SVG viewBox/world element resize with it.

This follows the same practical pattern used by infinite-canvas tools: a pan/zoom viewport over a larger coordinate space, not a fixed tiny panel that only looks endless.

## Next Model Work

Следующие задачи должны добавить:

- hover preview and breadcrumbs;
- edit/delete tools for existing manual relationships;
- graph performance slices for large worlds.

Do not duplicate Relationship Model in UI. UI should call graph/model helpers and store only explicit structured state.
