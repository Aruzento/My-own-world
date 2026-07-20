---
summary: "Контракт сущности Граф связей и человеко-читаемого knowledge graph."
read_when:
  - "Когда менять Knowledge Graph UI"
  - "Когда добавлять typed relationships"
  - "Когда менять связь Knowledge Graph с Rule Tree"
owner_zone: "architecture"
---
# Knowledge Graph Entity Contract

`knowledgeGraph` - special page entity для понятного обзора связей мира.

## User Contract

- Сущность создается из `+` как `Граф связей`.
- Первый экран должен быть понятен без терминов из теории графов.
- Основной сценарий должен укладываться в 1-2 действия:
  - открыть граф;
  - увидеть стандартный вид мира;
  - отфильтровать по типу сущности, типу связи, поиску или одиночным страницам;
  - перетащить node на canvas;
  - открыть действия node через правый клик.
- Первый экран не должен показывать лишние вкладки, статистические карточки, отдельный список узлов или неподвижные фоновые подписи.
- Runtime graph пересобирается из текущих страниц workspace при открытии или обновлении.
- Граф должен ощущаться как карта/доска исследования: большая рабочая зона, компактный toolbar, pan/zoom/fit и контекстные действия.

## Persistent Contract

Persistent HTML хранит только shell:

- `.knowledge-graph-document`;
- `.knowledge-graph-topbar`;
- `.knowledge-graph-title`.

Перед сохранением должны удаляться:

- `.knowledge-graph-runtime`;
- любые `[data-runtime="true"]` controls.

Runtime layout state, временные координаты node, open context menu and viewport pan/zoom не сериализуются в persistent HTML. Когда появятся pinned positions, они должны храниться как отдельная structured graph-view state model, а не как произвольные inline styles.

## Relationship Model

Граф включает:

- `treeParent`: parent -> child из дерева страниц. В UI это показывается как `В дереве`.
- `wikiLink`: source page -> linked page из `[[Wiki Links]]`.
- explicit page relationships из `page.relationships`.

Explicit relationship:

```js
{
  type: 'ally',
  targetId: 'other-page-id',
  label: 'Учитель'
}
```

Также принимаются target hints: `targetTitle`, `target`, `pageId`, `id`.

Ручные связи сохраняются в front matter исходной карточки:

```yaml
relationshipsJson: [{"type":"ally","targetId":"other-page-id","label":"Учитель"}]
```

`relationshipsJson` парсится в `page.relationships` при открытии. Обычный autosave и special-page save должны сохранять это поле.

## View Presets

View preset - это способ объяснить пользователю, почему он видит именно эти линии:

- `Стандартный вид`: корневые страницы и два уровня вниз по связи `В дереве`;
- `В дереве`: только parent/child связи;
- `Wiki-ссылки`: только связи из wiki-links;
- `Ручные связи`: только explicit typed relationships;
- `Все связи`: все known relationship types;
- `Одинокие`: страницы без входящих и исходящих graph-связей.

Пока реализован стандартный вид, фильтры и relationship type selector. Полноценные view presets и создание связей из canvas остаются в `0.0.1.5.4.1`.

## Domain Focus

Domain focus - фильтр отображения, а не изменение данных.

- `all`: все типы;
- `character`: pages с type/tag `character`, `creature`, `player`;
- `item`: pages с type/tag `item`, `object`, `magic`, `skill`;
- `organization`: pages с type/tag `organization`, `faction`, `guild`;
- `location`: pages с type/tag `location`, `region`, `place`;
- `map`: pages с type/template/tag `campaignMap`, `map`;
- `rule`: pages с type/template/tag `ruleTree`, `rule`, `rules`.

Domain labels не должны быть неподвижными фоновыми надписями на canvas. Если domain grouping нужен, он должен проявляться через layout, filters, color/accent или подвижные node groups.

## Rule Tree / Rules Knowledge Base

Rule Tree существует как отдельная сущность. Knowledge Graph не дублирует редактор правил, а показывает связи правил с персонажами, предметами, организациями и другими страницами через domain focus `rule` и typed relationships.

Пункт `0.0.0.6.5` считается закрытым на текущем уровне, если:

- Rule Tree можно создать и открыть как отдельную сущность;
- правила видны в domain focus `rule`;
- граф умеет связать правило с другой страницей через typed relationship;
- это покрыто unit/browser проверками.

## Rule Tree Access Foundation

Knowledge Graph фиксирует будущую модель доступа для Rule Tree, даже пока полноценный roles/permissions слой не включен:

- owner role: `admin`;
- read roles: `admin`, `player`, `viewer`;
- edit roles: `admin`;
- текущий UI показывает это как справочную карточку, а не как активную блокировку действий.

Когда появится полноценная система ролей, она должна использовать этот contract как начальное правило: базу правил редактирует администратор, остальные роли могут читать правила через wiki-link, свойства или граф.

## Visual Exploration Foundation

Первый экран `Графа связей` - canvas workbench, а не набор вкладок и списков.

Foundation визуального исследования мира состоит из:

- стандартного вида: roots + два уровня вниз по `treeParent`;
- tree layout, который не накладывает nodes друг на друга при первом открытии;
- кнопок layout: `Стандарт`, `По типам`, `Центр`;
- compact zoom/fit/refresh controls;
- фильтров на первом экране: тип сущности, тип связи, поиск и одиночные страницы;
- единого transform-layer для SVG edges и node cards, чтобы pan двигал весь граф вместе;
- runtime node drag внутри canvas с мгновенным пересчетом линий;
- dynamic canvas expansion near edges: если node тянут к краю, world bounds расширяются, а viewport остается управляемым;
- правого клика по node для контекстных действий: открыть страницу, показать соседей, вернуть весь граф.

## UX Rule

Canvas не должен превращаться в сложный редактор графов до завершения saved/pinned positions, relationship presets and performance gates. Первый экран должен оставаться похожим на карту: рабочая зона, понятный toolbar, контекстные действия по node и без лишней статистики вокруг.
