---
summary: "Контракт сущности Граф связей и человеко-читаемого knowledge graph."
read_when:
  - "Когда менять Knowledge Graph UI"
  - "Когда добавлять typed relationships"
  - "Когда менять связь Knowledge Graph с Rule Tree"
owner_zone: "architecture"
---
# Knowledge Graph Entity Contract

`knowledgeGraph` - это special page entity для понятного обзора связей мира.

## User Contract

- Сущность создается из `+` как `Граф связей`.
- Первый экран должен быть понятен без терминов из теории графов.
- Основные действия должны укладываться в 1-2 клика:
  - открыть граф;
  - посмотреть `Карту связей`;
  - перейти во вкладку `Связи`;
  - добавить простую typed relationship;
  - перейти во вкладку `Одинокие страницы`;
  - открыть страницу из списка.
- Runtime graph rows пересобираются из текущих страниц workspace при открытии или обновлении.
- Граф не должен превращаться в сложный canvas-first инструмент, пока readable view не доказал пользу.

## Persistent Contract

Persistent HTML хранит только shell:

- `.knowledge-graph-document`;
- `.knowledge-graph-topbar`;
- `.knowledge-graph-title`.

Перед сохранением должны удаляться:

- `.knowledge-graph-runtime`;
- любые `[data-runtime="true"]` controls.

## Relationship Model

Граф включает:

- `treeParent`: parent -> child из дерева страниц;
- `wikiLink`: source page -> linked page из `[[Wiki Links]]`;
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

Ручные связи из UI графа сохраняются в front matter исходной карточки:

```yaml
relationshipsJson: [{"type":"ally","targetId":"other-page-id","label":"Учитель"}]
```

`relationshipsJson` парсится в `page.relationships` при открытии. Обычный autosave и special-page save должны сохранять это поле.

## Domain Focus

Domain focus - это фильтр отображения, а не изменение данных.

- `all`: все связи;
- `character`: pages с type/tag `character`, `creature`, `player`;
- `item`: pages с type/tag `item`, `object`, `magic`, `skill`;
- `organization`: pages с type/tag `organization`, `faction`, `guild`;
- `rule`: pages с type/template/tag `ruleTree`, `rule`, `rules`.

## Rule Tree / Rules Knowledge Base

Rule Tree уже существует как отдельная сущность. Knowledge Graph не дублирует редактор правил, а показывает связи правил с персонажами, предметами, организациями и другими страницами через domain focus `rule` и typed relationships.

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

## Domain Exploration Scenarios

На первом экране `Графа связей` должны быть человеко-читаемые сценарии исследования:

- `Персонажи`: кто связан с персонажем, какие предметы, организации и правила на него влияют;
- `Предметы`: кто владеет предметом, где он лежит и какие правила/эффекты с ним связаны;
- `Организации`: союзники, враги, участники и связанные локации;
- `Правила`: какие правила влияют на сущности мира.

Каждый домен должен иметь быстрый переход в отфильтрованный список связей. Это не меняет данные, а только помогает исследовать мир в 1-2 клика.

## Visual Exploration Foundation

Foundation визуального исследования мира остается readable-first:

- сверху показываются самые связанные узлы мира;
- показывается количество одиноких страниц и простая подсказка следующего действия;
- компактная сетка узлов остается fallback вместо сложного canvas;
- canvas/freeform graph можно добавить позже как дополнительный режим, но нельзя удалять readable overview.

## UX Rule

Визуальный слой по умолчанию - компактная readable node grid. Canvas/freeform graph можно добавлять позже только как дополнительный режим, сохраняя readable list как обязательный fallback.
