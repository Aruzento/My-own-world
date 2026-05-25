# Планы и техдолг

Этот файл является рабочим журналом архитектурных решений. После крупных изменений нужно добавлять сюда короткий анализ: что стало лучше, какие риски остались и какой следующий шаг логично сделать.

## Актуальный приоритетный план

Этот раздел — верхний навигатор проекта. При новых задачах добавлять их как подпункты в существующую структуру, а не заводить параллельный устный план.

### 1. Smoke / Regression Tests

- Статус: **в работе**.
- Текущий активный подпункт: **4.2 Ctrl+Z / Ctrl+Y через управляемую историю**.

1.1. Smoke app shell: **сделано**.

1.2. Unit-тесты дерева: drop intent / move planner: **сделано**.

1.3. Unit-тесты карты: model / serializer / store: **сделано**.

1.4. Browser smoke карты save/reload: token, shape, grid, fog, viewport: **сделано**.

1.5. Browser regression удаления токена: удалить дочернюю карточку из дерева -> токен исчезает с открытой и закрытой карты: **сделано**.

1.6. Browser UI flow карты через кнопку `+`: picker, копии, папки `Существа.Карта` / `Объекты.Карта`: **сделано**.

1.7. Browser smoke presentation sync: **сделано**.

1.8. Browser tests форматирования текста: **сделано**.

1.9. Browser tests task tracker: **сделано**.

1.10. Browser tests шаблонов: **сделано**.

### 2. Tree Pointer-Based DnD

- Статус: **архитектурно сделано**.

2.1. Pointer DnD вместо HTML5 DnD: **сделано**.

2.2. Preview / placeholder / stable drop intent: **сделано**.

2.3. Тесты расчетов drop intent и move planner: **сделано**.

2.4. Дополнительные browser regression tests дерева: **сделано**.

### 3. Campaign Map Data-First Save

- Статус: **архитектурно сделано**.

3.1. `CampaignMapModel`: **сделано**.

3.2. `CampaignMapStore`: **сделано**.

3.3. Data-first serializer: **сделано**.

3.4. Drag стартует из store, не из `dataset`: **сделано**.

3.5. Закрытые карты патчатся через model/data-first путь: **сделано**.

3.6. Browser save/reload regression: **сделано**.

3.7. Render adapter `CampaignMapModel -> DOM`: **сделано**.

3.8. Убрать compatibility helpers `commitTokenModelToElement()` / `commitShapeModelToElement()`: **сделано**.

### 4. Editor History Contract

- Статус: **в работе**.

4.1. Описать единый контракт истории: **сделано**.

4.2. Ctrl+Z / Ctrl+Y через управляемую историю: **не сделано**.

4.3. Вставка текста как history action: **не сделано**.

4.4. Форматирование как history action: **не сделано**.

4.5. Блоки / таблицы / wiki-links как structural actions: **не сделано**.

### 5. FormattingService

- Статус: **частично сделано**.

5.1. Изолировать `execCommand` как fallback: **частично сделано**.

5.2. Описать правила форматирования: **не завершено**.

5.3. Убрать прямую зависимость toolbar от deprecated API: **частично сделано**.

### 6. Шаблоны В Workspace

- Статус: **не сделано**.

6.1. Хранить шаблоны не в `localStorage`, а в файле workspace: **не сделано**.

6.2. UI удаления/создания шаблонов привязать к workspace-файлу: **не сделано**.

### 7. PageRepository / PageIndex

- Статус: **не сделано**.

7.1. Индекс по title / aliases / parent / type / tags: **не сделано**.

7.2. Перевести wiki-links, карту, поиск и проверку дублей на index: **не сделано**.

### 8. Safe HTML Boundary / Sanitizer

- Статус: **не сделано**.

8.1. Определить разрешенный HTML: **частично описано концептуально**.

8.2. Ввести sanitizer перед сохранением/открытием: **не сделано**.

### 9. Разрез Крупных Файлов

- Статус: **в работе**.

9.1. `campaignMap.js`: **сильно продвинулось**.

9.2. `blockContract.js`: **не сделано**.

9.3. `editor.js`: **не сделано**.

9.4. `toolbar.js`: **не сделано**.

9.5. `tables.js`: **не сделано**.

9.6. `campaignMapPresentation.js`: **не сделано**.

### 10. CSS Разделение

- Статус: **не сделано**.

10.1. `campaign-map.css`: **не сделано**.

10.2. `popup.css`: **не сделано**.

10.3. `block-special.css`: **не сделано**.

## 2026-05-21: Smoke/regression checklist и первый слой автотестов

### Что делаем

- Закрепляем `docs/SMOKE_TESTS.md` как обязательный checklist перед коммитами, которые затрагивают editor, tree, campaign map, task tracker, storage, block system или templates.
- Добавляем первый легкий автотестовый слой без браузерных зависимостей.
- Проверяем в автотестах только model/helper-код, чтобы тесты запускались быстро и не требовали выбранного workspace.
- Добавляем единую команду `npm run verify`, которая собирает базовые проверки в один запуск.
- Добавляем foundation для будущих browser smoke tests в `tests/browser/`.
- Подключаем Playwright как реальный browser runner и добавляем первый smoke `app-shell-empty-state`.

### Зачем это нужно

- Проект уже несколько раз ловил повторные регрессии в одних и тех же местах: tree drag/drop, сохранение после переноса, карта, презентация, форматирование, task tracker.
- Без тестового контура каждое крупное изменение требует длинной ручной проверки и все равно может пропустить старый сценарий.
- Первый слой тестов должен стать базой для дальнейшего Playwright/browser smoke, а не заменой ручного UI-чеклиста.

### Правила для тестов

- Тесты не должны изменять пользовательский workspace.
- Тесты не должны требовать реального File System Access API.
- Чистые модели и helper-слои проверяются через `node:test`.
- Перед коммитом основной командой считается `npm run verify`.
- Browser/UI-сценарии сначала описываются в checklist, затем постепенно переводятся в автоматизацию.
- Browser smoke сценарии фиксируются в `tests/browser/scenarios.mjs`, чтобы будущий Playwright runner не начинался с устной памяти.

### Browser smoke foundation

- `tests/browser/README.md` описывает правила будущих браузерных тестов, тестовый workspace и рекомендуемый runner.
- `tests/browser/scenarios.mjs` хранит приоритетный список сценариев:
  - `P0`: дерево после переноса и сохранения, свернутость дерева, карта с токеном, presentation sync;
  - `P1`: toolbar formatting boundary, task tracker DnD, popup viewport fit;
  - `P2`: создание карточки по шаблону.
- `tests/browser/app-shell.spec.mjs` уже проверяет базовый запуск приложения без workspace, пустой стартовый экран и отсутствие console/page errors.
- Browser smoke запускается командой `npm run test:browser`; она поднимает локальный static server через `tools/run_browser_smoke.mjs`.

### Следующее развитие из этой работы

- Добавить browser smoke для дерева, карты, task tracker и toolbar.
- После перевода дерева на pointer-based DnD добавить автотесты на расчет drop intent.
- После data-first save карты добавить тесты сериализации карты без DOM-клона.
- Добавить fixture workspace и начать автоматизацию `P0` сценариев из `tests/browser/scenarios.mjs`.

## 2026-05-21: Нумерация сущностей карты при добавлении через плюс

### Что сделано

- Исправлено создание дочерних дублей при добавлении существ и объектов на карту через toolbar `+`.
- Если пользователь указывает несколько копий, дубли теперь получают названия вида:
  - `Существо1.Название карты`;
  - `Существо2.Название карты`;
  - `Объект1.Название карты`;
  - `Объект2.Название карты`.
- Нумерация продолжает уже существующие дочерние сущности в папках `Существа.Название карты` и `Объекты.Название карты`, а не начинается каждый раз с `1`.
- Добавлен helper `getCampaignMapNumberedEntityTitle()` и unit-проверка формата названия.

### Риски

- Внешний drop из дерева на карту пока сохраняет старое правило с названием исходной карточки и `сущность.Название карты`; это отдельный сценарий и он не менялся.
- Если пользователь вручную переименует дочерние сущности не по шаблону, автоматическая нумерация просто пропустит такие имена.

### Следующее развитие из этой работы

- Добавить browser smoke fixture для сценария `campaign-map-token-flow`, чтобы проверить не только helper, но и реальные дочерние строки в дереве.

## 2026-05-21: Перевод дерева на pointer-based DnD

### Что сделано

- `js/tree/treeDragDrop.js` переведен с HTML5 `dragstart/dragover/drop` на pointer-based `pointerdown/pointermove/pointerup`.
- Дерево теперь использует floating preview и стабильный placeholder без зависимости от `dataTransfer`.
- Кнопки раскрытия и меню `...` не запускают перенос.
- Клик по строке после реального drag подавляется, чтобы страница не открывалась случайно после drop.
- Вынесен чистый helper `js/tree/treeDropIntent.js` для расчета `before` / `inside` / `after`.
- Добавлены unit-тесты для правил drop intent.
- Drop из дерева на карту сохранен через custom event `my-own-world:tree-page-pointer-drop`.

### Риски

- В `campaignMapExternalDrop.js` временно оставлены старые HTML5 drag/drop обработчики как fallback, но основной путь дерева теперь pointer-based.
- Для полного P0 browser regression нужен fixture workspace, чтобы автоматически проверить перенос внутри дерева и drop на карту.

### Следующее развитие из этой работы

- Добавить browser smoke для `tree-dnd-save-after-move`.
- После browser fixture проверить сортировку на одном уровне, вложение в дочернюю ветку и перенос в корень.
- Затем можно упростить fallback HTML5 drop-код карты, если pointer-based сценарий полностью покрыт тестами.

## 2026-05-21: Тестируемый planner переносов дерева

### Что сделано

- Добавлен `js/tree/treeMovePlanner.js`: чистый расчет того, какие `parent/order` нужно применить после drop.
- `treeDragDrop.js` больше не содержит собственную сортировку соседей, а применяет план из `createTreeMovePlan()`.
- Добавлены unit-тесты:
  - перенос внутрь target;
  - перенос в корень;
  - сортировка перед target на одном уровне;
  - сортировка после target на одном уровне.
- Вместе с уже добавленным `treeDropIntent.test.mjs` покрыты базовые сценарии: выше, ниже, внутрь, root и сортировка на одном уровне.

### Риски

- Это unit-покрытие расчета, а не браузерный full-flow. Реальный drag мышью по дереву всё ещё должен получить browser smoke с fixture workspace.

### Следующее развитие из этой работы

- Добавить Playwright fixture workspace и автоматизировать `tree-dnd-save-after-move`.
- После этого можно безопаснее переходить к `Campaign Map data-first save`.

## 2026-05-20: Task Tracker как третья самостоятельная сущность

### Что сделано

- Добавить отдельную сущность `taskTracker`, независимую от карточек и карты.
- В дереве Task Tracker будет жить рядом с карточками и картами, но иметь собственный editor UI.
- Делать систему model-first: persistent data хранится как структурированный JSON, а визуальный интерфейс строится runtime-рендером.
- Держать подсистему максимально detachable: отдельные файлы для модели, сериализации, шаблона, рендера, DnD, task UI и стилей.
- По умолчанию трекер создается с колонками:
  - `ИДЕИ`;
  - `В РАБОТЕ`;
  - `СДЕЛАНО`.
- В колонках можно создавать задачи с названием, описанием и чекбоксами.
- Задачи можно перетаскивать между колонками и внутри колонки.
- Колонки можно переименовывать и добавлять новые.
- Добавлена папка `js/taskTracker/` как самостоятельная подсистема.
- Добавлен шаблон `js/templates/taskTracker.js`.
- Добавлен стиль `styles/task-tracker.css`.
- Добавлен тип создания `taskTracker` в общий create menu и на пустой стартовый экран.
- Добавлена иконка `task-tracker` в общий SVG sprite.
- `editor.js` и `autosave.js` получили отдельные ветки открытия и сохранения Task Tracker.
- Persistent HTML трекера хранит только оболочку, заголовок и `<script type="application/json" class="task-tracker-data">`.
- Runtime-доска с колонками, задачами, кнопками и placeholder не является источником истины.

### Архитектурное правило для этой системы

- Не смешивать Task Tracker с карточными блоками и Campaign Map.
- Не сохранять runtime-кнопки и drag-placeholder в persistent HTML.
- Если функция может жить одна в файле и это не ухудшает понимание, выносить ее в отдельный файл.
- Если файл содержит несколько функций, они должны обслуживать одну маленькую ответственность.

### Риски

- Drag and drop больше не использует HTML5 API: задачи и колонки перенесены на pointer-based сценарий со стабильным placeholder.
- Если сохранить задачи как HTML, система быстро получит тот же долг, что старый `contenteditable`; поэтому JSON должен быть источником истины.
- Нужны smoke-сценарии: создать трекер, создать задачу, добавить чеклист, перенести задачу, переименовать колонку, сохранить и открыть заново.
- Удаление задач и колонок добавлено через model actions. При удалении колонки удаляются и задачи внутри нее.
- HTML5 drag/drop заменен на pointer-based DnD в `taskTrackerDnd.js`.
- Задачи и колонки теперь двигаются только за drag-handle `☰`, чтобы ввод текста, textarea и чекбоксы не конфликтовали с переносом.
- Добавлен floating preview и стабильные placeholder-ы для задач и колонок.
- Колонки раскладываются CSS-сеткой по 5 в ряд, затем переносятся на новую строку. На узких экранах сетка адаптивно уменьшается до 4/3/2 колонок.
- Остался UX-вопрос: нужно ли спрашивать подтверждение при удалении колонки с задачами или делать undo.

### Следующее развитие из этой работы

- После MVP связать задачи с карточками лора через wiki/page links.
- Позже добавить дедлайны, приоритеты, фильтры и архив задач.

## 2026-05-20: Campaign Map runtime и model-based presentation live-sync

### Что сделано

- Добавлен `js/editor/campaignMapRuntime.js`.
- Из `campaignMap.js` вынесены runtime-сценарии:
  - добавление токенов;
  - восстановление токенов;
  - расчет и применение состояния здоровья токена;
  - выбор токенов и фигур;
  - добавление и восстановление фигур;
  - смена изображения карты;
  - восстановление фонового изображения карты.
- `campaignMap.js` теперь ближе к роли bootstrap/orchestration:
  - подключает события;
  - связывает controllers;
  - маршрутизирует pointer/input/wheel события;
  - вызывает save/sync;
  - не хранит реализацию runtime-рендера токенов, фигур и фона.
- `scheduleLivePresentationSync()` переведен на новый контракт: `map + itemType + itemId`.
- `campaignMapTokenDrag.js` и `campaignMapShapeDrag.js` больше не передают в live-sync DOM-элемент как основной источник данных.
- `campaignMapPresentation.js` получил `syncPresentationItemById()`, который берет token/shape из `CampaignMapModel` и применяет состояние к презентации.
- Старый `syncPresentationItem(sourceItem)` оставлен как совместимый wrapper, чтобы забытый старый вызов не ломал карту, но новый рабочий путь идет через id и модель.
- `scheduleVisibleMapObjectsUpdate()` явно экспортируется из `campaignMapViewport.js`, чтобы качество фона и culling вызывались через понятный контракт.
- Добавлен `js/editor/campaignMapPointerController.js`.
- Из `campaignMap.js` вынесен pointer router:
  - pointerdown по токенам, фигурам, handles, карте и fog brush;
  - pointerover/pointerout для hover popup и подсветки дерева;
  - double click по токену;
  - wheel zoom;
  - document pointermove/pointerup lifecycle для token drag, shape drag, fog draw и pan.
- Добавлен `js/editor/campaignMapDragMeasure.js`.
- Вектор перемещения больше не синхронизируется в презентацию DOM-клоном SVG. Token drag передает данные о линии: начало, конец, позицию подписи и текст расстояния.
- `syncPresentationDragMeasure()` теперь получает payload оверлея и сам рисует/очищает measure в presentation window.

### Что стало лучше

- Presentation live-sync больше не клонирует исходный DOM-токен/фигуру при каждом drag/resize/rotate.
- Drag-слои теперь сообщают презентации только идентификатор сущности, а данные берутся из `CampaignMapModel`.
- Модель стала реальным посредником между интерактивным слоем карты и presentation window.
- `campaignMap.js` уменьшился и потерял часть ответственности за runtime DOM.
- `campaignMap.js` больше не владеет pointer router и fog drawing state.
- Последний DOM-хвост live-sync для drag-measure убран: presentation overlay строится из данных, а не из клона DOM.
- Следующие оптимизации можно делать в модели и render/controllers, не вскрывая один большой файл.

### Оставшиеся риски

- Full presentation sync всё ещё клонирует stage целиком. Это нормально для полного обновления, но не для частых операций.
- `campaignMap.js` всё ещё содержит title/input flow, save deps и сборку dependency-contracts для controllers.
- Нужен browser smoke test live-sync:
  - открыть презентацию;
  - двигать токен;
  - менять размер объекта;
  - вращать объект;
  - двигать/resize фигуру;
  - скрыть/показать token/shape.

### Следующее развитие из этой работы

1. Добавить browser smoke tests для карты и презентации.
2. Вынести title/input flow в `campaignMapTitleController.js`.
3. Когда save станет полностью data-first, рассмотреть `CampaignMapStore` как владелец model + dirty state.

## 2026-05-18: разрез Campaign Map на подсистемы

### Что сделано

- `js/editor/campaignMapGeometry.js` — вынесены геометрия, координаты, viewport helpers, расчет видимой области, spawn point, размеры токенов и базовая математика фигур.
- `js/editor/campaignMapBackground.js` — вынесены фон карты, full/low detail cache, переключение качества изображения и сброс кэша при смене картинки.
- `js/editor/campaignMapPresentationSync.js` — вынесены очереди live-sync презентации, throttling и отложенная синхронизация.
- `js/editor/campaignMapToolbar.js` — вынесены HTML-шаблоны toolbar и popup-ов карты.
- `js/editor/campaignMapShapes.js` — вынесен DOM-render фигур и применение их геометрии.
- `js/editor/campaignMapTokens.js` — вынесены DOM helpers токенов: позиция, размер, поворот, fallback-текст, картинка токена и resize/rotate handles.
- `js/editor/campaignMapFog.js` — вынесены fog canvas операции, кисть/ластик, fill/clear fog и UI-состояние fog/pan кнопок.
- `js/editor/campaignMapSerializerHelpers.js` — вынесены helpers для точечного изменения persistent HTML карты при удалении токенов из сохраненной страницы.
- `js/editor/campaignMapTreeIntegration.js` — вынесены связи карты с деревом: lookup страниц, проверка предков-карт, bucket-папки и подсветка карточек в дереве.
- `js/editor/campaignMapPicker.js` — вынесен popup добавления существ/объектов на карту, поиск, выбор нескольких карточек, количество копий и создание дочерних дублей.
- `js/editor/campaignMapTokenActions.js` — вынесены действия над токенами: открыть карточку, удалить, скрыть, дублировать, изменить хиты и создать стат-блок при необходимости.
- `js/editor/campaignMapTokenDrag.js` — вынесена state machine для drag/resize/rotate токенов и вектор перемещения.
- `js/editor/campaignMapShapeDrag.js` — вынесена state machine для drag/resize фигур.
- `js/editor/campaignMapModel.js` — добавлен первый `CampaignMapModel`: нормализованный слепок `asset`, `grid`, `fog`, `view`, `tokens`, `shapes` из текущего DOM.
- `js/editor/campaignMapConstants.js` расширен константами, которые раньше жили внутри большого файла карты.
- После коммита `v.2.0.6` модель расширена методами `addToken`, `moveToken`, `resizeToken`, `rotateToken`, `addShape`, `moveShape`, `resizeShape`, `setGrid`, `updateFog`, `setView` и commit helpers для DOM-элементов.
- Добавлены `removeToken`, `removeShape`, `replaceTokens`, `replaceShapes`.
- `js/editor/campaignMapElementFactory.js` — выделено создание DOM-токенов и DOM-фигур из записей модели.
- `js/editor/campaignMapRenderer.js` — выделено применение визуального состояния токенов и фигур к DOM.
- `js/editor/campaignMapSaveController.js` — выделен порядок save/sync: title карты, refresh модели, сохранение страницы, sync презентации.
- `js/editor/campaignMapViewport.js` — вынесены viewport structure, pan/zoom, culling offscreen-объектов и визуальные настройки сетки.
- `js/editor/campaignMapPopupController.js` — вынесен общий контейнер popup-ов карты, повторный клик по кнопке, позиционирование и закрытие по клику снаружи.
- `js/editor/campaignMapToolbarController.js` — вынесены действия тулбара карты: добавить, рука, сетка, смена карты, презентация, фигуры, туман.
- `js/editor/campaignMapTokenPopupController.js` — вынесены hover-попапы токенов/фигур, меню существа, действия и изменение хитов.

### Текущее состояние после разреза

- `campaignMap.js` уменьшен примерно с 6565 до 3199 строк.
- Главный файл всё ещё остается orchestration-центром: viewport, popups, создание сущностей, render карты, save и связывание модулей.
- Поведение токенов и фигур больше не хранит локальное состояние в `campaignMap.js`; оно управляется отдельными модулями через явные dependency-контракты.
- Добавление существ/объектов вынесено в отдельный picker, поэтому следующий шаг к `CampaignMapModel` можно делать без повторного вскрытия popup-логики.
- `CampaignMapModel` уже обновляется после render, после создания токенов/фигур и перед сохранением. Пока это совместимый слой поверх DOM, а не полная замена DOM как источника истины.
- Создание/дублирование токенов и фигур, drag/resize/rotate токенов, drag/resize фигур, сетка, fog mode/brush и viewport уже проходят через модельные методы.
- Удаление токенов/фигур теперь тоже обновляет модель перед удалением DOM.
- Presentation full-sync обновляет модель перед сборкой презентационного clone и использует модель для удаления скрытых элементов из презентации.
- Save/sync orchestration вынесен из `campaignMap.js` в отдельный controller.
- `campaignMap.js` больше не хранит состояние pan/culling и не создает общий popup-контейнер напрямую.
- `campaignMap.js` больше не хранит token popup timers и не строит popup-разметку для токенов.
- Кнопки тулбара карты теперь маршрутизируются через отдельный controller.

### Что стало лучше

- У карты появились явные технические границы: geometry, background, presentation sync, toolbar, shapes, tokens, fog.
- Производительные части карты больше не смешаны с UI-разметкой popup-ов.
- Восстановление картинки токена больше не зависит от внутреннего кэша фоновой карты и использует asset storage напрямую.
- Патчинг сохраненного HTML карты отделен от runtime UI-событий.
- Следующие изменения можно делать точечно: например менять fog без чтения token popup логики.
- Drag/resize/rotate больше изолированы как маленькие интерактивные state machines.
- Token actions отделены от pointer interactions: удалить/дублировать/HP теперь можно развивать без риска сломать перетаскивание.
- Tree integration получила отдельный слой, а значит фильтры выбора карточек и подсветка дерева больше не размазаны по карте.
- Появилась точка перехода к data-first архитектуре: новые оптимизации карты можно будет делать через `CampaignMapModel`, а не через поиск по DOM.
- У интерактивных операций появился единый путь: изменить модель, затем применить модель к DOM. Это снижает риск, что разные модули запишут несовместимые `dataset`.
- DOM creation и DOM render больше не смешаны с action/drag-логикой.
- Viewport стал отдельной подсистемой, поэтому будущая оптимизация карты может менять culling/zoom/pan без чтения popup и token action кода.
- Крупный разрез `campaignMap.js` на подсистемы завершен: основной файл стал bootstrap/orchestration, а не владельцем всех behavior-сценариев.

### Оставшиеся риски

- `campaignMap.js` всё ещё слишком большой для спокойной разработки.
- В главном файле остались крупные зоны:
  - popup rendering и позиционирование popup-ов карты;
  - создание карты, фон, grid controls и viewport/pan;
  - save orchestration и сериализация HTML;
  - часть presentation coordination;
  - поиск активных DOM-элементов при render/reload.
- Нужно прогнать ручной browser smoke test на карте, потому что разрез затронул runtime modules и import graph.
- В проекте всё ещё много `innerHTML`; для локального режима это терпимо, для web это security blocker.
- `CampaignMapModel` всё ещё восстанавливается из DOM при render/save, поэтому DOM не полностью потерял роль источника истины.
- Presentation live-sync отдельных элементов всё ещё получает source DOM item. Full-sync уже сверяется с моделью, но live-sync лучше позже перевести на `tokenId/shapeId + model`.
- Save карты теперь строит persistent HTML через `CampaignMapModel`, но runtime-события ещё частично обновляют DOM и затем освежают модель.
- Документация и некоторые старые строки в исходниках могут отображаться как mojibake в консоли Windows. Нельзя лечить это runtime-декодированием; нужно исправлять источник только при отдельной задаче на документацию/кодировку.

### Следующее развитие из этой работы

1. Перевести presentation live-sync на `tokenId/shapeId + CampaignMapModel`, чтобы drag не передавал DOM-элементы между слоями.
2. Добавить browser smoke tests для карты:
   - открыть карту;
   - добавить token;
   - переместить token;
   - сохранить/reload;
   - проверить координаты, fog и presentation sync.
3. После стабилизации карты перейти к desktop app spike: проверить Tauri/Electron как оболочку для локального приложения.

## 2026-05-25: Editor History Contract

### Что сделано

- Закрыт пункт 4.1: создан `docs/EDITOR_HISTORY_CONTRACT.md`.
- В контракте описаны `History Action`, `Snapshot`, `Transaction`, `Selection Bookmark`, page-scoped history, save/redo/selection contract.
- Зафиксировано, что runtime UI и элементы с `data-runtime="true"` не должны попадать в undo/redo snapshot.
- В README добавлена ссылка на контракт истории.
- В `editorHistory.js` уточнен комментарий: текущий модуль является временным слоем до полного history service.

### Что стало лучше

- Следующие пункты 4.2-4.5 можно делать не как набор разрозненных исправлений, а как перевод конкретных действий на один контракт.
- Появился явный список P0/P1 regression сценариев для будущего `Ctrl+Z / Ctrl+Y`.
- Граница между persistent content и runtime UI закреплена именно для history, а не только для save.

### Оставшиеся риски

- Это документационный шаг: полноценный redo, page-scoped stacks и transaction API еще не реализованы.
- Текущий `editorHistory.js` по-прежнему snapshot-based и частично зависит от браузерного undo для обычного ввода.

### Следующее развитие из этой работы

1. Делать пункт 4.2: реализовать управляемый `Ctrl+Z / Ctrl+Y` с undo/redo stack на страницу.
2. После 4.2 перевести paste на transaction как пункт 4.3.

## 2026-05-24: tree regression и render adapter карты

### Что сделано

- Закрыт пункт 2.4: добавлен browser regression test `tree-pointer-dnd-planner-keeps-stable-drop-intents-and-order`.
- Тест проверяет drop-intent дерева в браузере и сценарии `before`, `inside`, `after`, `root`, сортировку на одном уровне.
- Закрыт пункт 3.7: создан `campaignMapRenderAdapter.js`, который отражает записи `CampaignMapModel` в DOM токенов и фигур.
- Закрыт пункт 3.8: `CampaignMapModel` больше не экспортирует `commitTokenModelToElement()` и `commitShapeModelToElement()`.
- Token/shape drag и token actions теперь получают запись из `CampaignMapStore` и передают ее в render adapter.

### Что стало лучше

- `CampaignMapModel` снова отвечает только за данные карты, а не за DOM-разметку.
- DOM стал отображением model/store snapshot, что упрощает следующий переход к render adapter для всей карты.
- Browser regression дерева теперь прикрывает не только unit-расчеты, но и browser import/runtime слой.

### Оставшиеся риски

- Render adapter пока точечный: он обновляет dataset токенов и фигур, а полный `CampaignMapModel -> DOM` renderer для пересборки всей object-layer еще не выделен.
- Для треугольников resize вершин всё еще использует DOM-helper `getTrianglePoints(shape)`, потому что вершины физически редактируются в DOM.

### Следующее развитие из этой работы

1. Перейти к пункту 4.1: описать единый Editor History Contract.
2. Позже расширить render adapter до полного renderer-а object-layer, чтобы карта могла пересобираться из модели без ручных DOM-патчей.

## 2026-05-24: data-first save карты

### Что сделано

- Добавлен `js/editor/campaignMapDataSerializer.js`: отдельный сериализатор persistent HTML карты из `CampaignMapModel`.
- `serializeCampaignMapHTML()` больше не сохраняет карту через общий DOM-clone `serializePersistentEditorHTML()`, если открыта `.campaign-map-document`.
- `CampaignMapModel` теперь хранит `assetSettings`: сохраненные туман/размер сетки/цвет сетки для разных изображений одной карты.
- В HTML карты сохраняются только данные: stage dataset, токены, фигуры, fog image, grid, view и per-asset settings.
- Runtime-элементы карты вроде resize/rotate handles, popup-ов и временных классов не участвуют в сохранении карты.
- Добавлен unit-тест `tests/campaignMapDataSerializer.test.mjs`, который проверяет data-first HTML и отсутствие runtime-разметки.

### Что стало лучше

- Сохранение карты стало предсказуемее: результат зависит от модели, а не от случайного текущего состояния DOM.
- Следующая оптимизация карты может переводить drag/fog/grid на модель как источник правды без переписывания save-слоя.
- Переключение изображений карты безопаснее: настройки тумана и сетки для разных map asset теперь описаны в модели.

### Оставшиеся риски

- Drag/fog/grid ещё не являются полностью model-owned: многие операции сначала меняют DOM, затем вызывают refresh модели.
- `campaignMapSerializerHelpers.js` для точечного удаления токенов из сохраненных закрытых карт всё ещё работает через DOM-parse HTML.
- Нет browser smoke test, который создает карту, добавляет токен/фигуру, сохраняет, перезагружает и проверяет восстановление.

### Следующее развитие из этой работы

1. Перевести закрытые patch-сценарии карты на модельный serializer, начиная с удаления токенов из сохраненной страницы.
2. Добавить browser smoke test `карта -> token -> shape -> save/reload -> проверка координат/тумана/сетки`.
3. Ввести `CampaignMapStore`: единый владелец `CampaignMapModel`, dirty-state и commit/render операций.

## 2026-05-24: CampaignMapStore

### Что сделано

- Добавлен `js/editor/campaignMapStore.js`: единый владелец `CampaignMapModel`, dirty-state и commit в DOM.
- Основные операции карты переведены на store:
  - drag/resize/rotate токенов;
  - drag/resize фигур;
  - добавление токенов и фигур;
  - удаление, скрытие и дублирование токенов/фигур;
  - grid size/color/toggle;
  - fog mode/brush/fill/clear;
  - viewport pan/zoom;
  - save и presentation sync.
- `campaignMapDataSerializer.js` теперь берет модель через `refreshCampaignMapStore()`.
- Добавлены unit-тесты `tests/campaignMapStore.test.mjs` для dirty-state, токенов, фигур, сетки, тумана и viewport.

### Что стало лучше

- У карты появился явный model-owner вместо россыпи прямых обращений к `CampaignMapModel`.
- Новые операции карты можно добавлять в store и не размазывать commit/dirty-state по UI-модулям.
- Presentation sync и data-first save теперь ближе к одному источнику правды.

### Оставшиеся риски

- Store пока совместимый слой поверх текущего DOM: часть операций всё ещё читает стартовые значения из dataset перед записью в модель.
- `campaignMapModel.js` оставляет старые compatibility helpers для DOM-commit, потому что renderer/factory ещё используют их.
- Точечное изменение сохраненного HTML закрытых карт (`campaignMapSerializerHelpers.js`) всё ещё не переведено на store/model.

### Следующее развитие из этой работы

1. Добавить browser smoke test карты с save/reload и проверкой token/shape/grid/fog.
2. Начать убирать compatibility helpers из `campaignMapModel.js`, когда factory/renderer смогут работать напрямую со store snapshots.
3. Выделить model-owned render adapter для token/shape, чтобы DOM полностью стал отображением модели.

## 2026-05-24: закрепление model-owned карты

### Что сделано

- Стартовое состояние drag/resize/rotate токенов теперь берется из `CampaignMapStore`, а не из `dataset`.
- Стартовое состояние drag/resize фигур теперь берется из `CampaignMapStore`.
- `campaignMapSerializerHelpers.js` переведен на model/data-first путь:
  - закрытая карта разбирается как persistent HTML;
  - удаление токенов проходит через `CampaignMapStore.removeToken()`;
  - результат собирается через `serializeCampaignMapDocumentHTML()`, а не через `wrapper.innerHTML`.

### Что стало лучше

- Drag-слои меньше зависят от DOM как источника истины: `dataset` остается только идентификатором DOM-элемента.
- Патч закрытых карт теперь совпадает с обычным сохранением карты и не обходит data-first serializer.
- Следующий шаг по карте можно делать уже не вокруг save, а вокруг render adapter: model snapshot -> DOM.

### Оставшиеся риски

- Для треугольников точки вершин всё ещё вычисляются через DOM-helper `getTrianglePoints(shape)`, потому что shape handles физически живут в DOM.
- `commitTokenModelToElement()` и `commitShapeModelToElement()` остаются compatibility-мостами.
- Нет отдельного browser regression test на удаление карточки-токена из дерева и последующий патч закрытой карты.

### Следующее развитие из этой работы

1. Добавить regression test на удаление дочерней карточки токена и исчезновение токена с карты.
2. После тестов выделить render adapter `CampaignMapModel -> DOM` и постепенно убрать direct commit helpers.
3. Затем расширить UI-browser тесты карты: picker через `+`, дочерние дубли в дереве, презентация.

## 2026-05-24: browser smoke карты

### Что сделано

- Добавлен `tests/browser/campaign-map-data.spec.mjs`.
- Новый browser smoke проверяет полный data-cycle карты:
  - создать DOM карты в браузере;
  - изменить данные через `CampaignMapStore`;
  - добавить token и shape через официальные element factory;
  - сохранить HTML через `serializeCampaignMapDocumentHTML()`;
  - заново вставить HTML как после reload;
  - восстановить модель через `refreshCampaignMapStore()`;
  - проверить token, shape, grid, fog и viewport.
- `tests/browser/scenarios.mjs` помечает `campaign-map-token-flow` как частично автоматизированный.
- `campaign-map-token-removal-updates-open-and-closed-map-data` покрывает удаление токена с открытой карты и патч закрытой карты после удаления дочерней карточки.

### Что стало лучше

- Data-first save карты теперь защищен не только unit-тестами, но и браузерным smoke-сценарием.
- Тест ловит рассинхрон между моделью, DOM factory и serializer.
- Есть база для следующих UI-browser тестов карты.

### Что осталось не закрыто

- Тест пока не кликает реальный UI `+` и не проверяет создание дочерних дублей в дереве.
- Presentation sync всё ещё проверяется unit/архитектурно, но не отдельным browser-сценарием с popup window.

### Следующее развитие из этой работы

1. Переходить к большому пункту `4. Editor History Contract`, если не появится критичный regression.
2. При будущих изменениях карты расширять browser tests как подпункты раздела `1. Smoke / Regression Tests`.

## 2026-05-24: закрытие browser smoke подпунктов 1.6-1.10

### Что сделано

- `tests/browser/campaign-map-ui.spec.mjs` покрывает добавление карточки на карту:
  - picker показывает только допустимые карточки;
  - потомки карты исключаются;
  - создается bucket `Существа.Карта`;
  - создается дочерний дубль;
  - на карту добавляется токен дубля.
- `tests/browser/campaign-map-presentation.spec.mjs` покрывает presentation sync по `tokenId/shapeId`.
- `tests/browser/editor-formatting.spec.mjs` покрывает базовую границу inline formatting: форматируется выделенный текст, соседний текст не меняется, команда вне выделения не применяется.
- `tests/browser/task-tracker.spec.mjs` покрывает сохранение порядка колонок, перенос задачи, описание и checklist через модель Task Tracker.
- `tests/browser/page-templates.spec.mjs` покрывает создание шаблона, удаление шаблона и создание карточки по шаблону.

### Что стало лучше

- Все подпункты `1.6-1.10` получили browser smoke/regression слой.
- Основные пользовательские зоны теперь имеют хотя бы один быстрый браузерный страховочный сценарий.
- Большой переход к `Editor History Contract` можно начинать с меньшим риском повторно сломать карту, task tracker, шаблоны или базовое форматирование.

### Оставшиеся риски

- Тесты карты используют fake workspace и module-level flow, а не полностью ручной путь через реальную папку пользователя.
- Formatting smoke пока покрывает inline bold boundary, но не весь будущий history contract.
- Task Tracker smoke проверяет модель и serializer, но не pointer DnD жест мышью.

### Следующее развитие из этой работы

1. Начать `4. Editor History Contract`.
2. Внутри `4` добавлять новые regression tests на каждый исправленный сценарий Ctrl+Z / paste / formatting.

## Правила развития

- Любой новый runtime UI должен иметь `data-runtime="true"` и не попадать в persistent HTML.
- Любая новая подсистема карты должна быть отдельным файлом, если она может жить без прямого доступа к глобальному drag/save state.
- В новых файлах нужны короткие русские комментарии, которые объясняют ответственность модуля и сложные места.
- Не добавлять новые крупные функции в `campaignMap.js`, если их можно оформить как отдельный модуль.
- После каждого крупного изменения обновлять этот файл: что изменилось, что стало лучше, что осталось опасным.
- После изменения функций, подсистем или пользовательских сценариев обновлять `docs/MY_OWN_WORLD_FULL_MANUAL.docx`. Для пересборки использовать `tools/generate_manual_docx.py`.

## 2026-05-19: Полный технический мануал

### Что сделано

- Добавлен `docs/MY_OWN_WORLD_FULL_MANUAL.docx` — подробный мануал по проекту в формате Word.
- Добавлен `tools/generate_manual_docx.py` — служебный генератор мануала без внешних зависимостей.
- Мануал включает:
  - общую архитектуру проекта;
  - учебные пояснения по синтаксису JavaScript;
  - основные пользовательские и технические сценарии;
  - каталог функций и файлов;
  - построчный разбор исходников, стилей, HTML, SVG и документации.

### Оставшиеся риски

- Построчные пояснения генерируются эвристически, поэтому для особо сложных функций стоит вручную улучшать формулировки при будущих крупных изменениях.
- Документ большой; при активном развитии проекта его нужно пересобирать после каждого значимого изменения, иначе он быстро устареет.

### Следующее развитие из этой работы

- Постепенно добавлять ручные разделы по самым сложным подсистемам: Campaign Map, clean-save, wiki-links, таблицы и DnD-блоки.
- При каждом новом модуле добавлять русские комментарии в код, чтобы генератор получал больше качественного контекста.

## 2026-05-19: MVP блока "Переменные"

> Статус: архивировано. Подробности перенесены в `docs/ARCHIVED_EXPERIMENTS.md`.

### Что сделано

- Добавлен новый тип блока `variables`.
- Добавлена отдельная подсистема:
  - `js/ui/variables.js` — runtime UI блока, popup выбора, добавление/удаление переменных;
  - `js/ui/variables/variableDefinitions.js` — каталог системных переменных и саб-блоков;
  - `js/ui/variables/variableCalculations.js` — MVP расчетов переменных.
- В каталог добавлены тестовые переменные:
  - уровень, опыт, раса, класс, вид, подкласс;
  - шесть характеристик;
  - боевые поля, хиты, скорость, инициатива, кость хитов;
  - расчетные характеристики `Сила (расчет)` и аналоги.
- Добавлены 5 саб-блоков переменных:
  - `Происхождение`;
  - `Характеристики`;
  - `Характеристики (расчет)`;
  - `Боевые показатели`;
  - `Хиты`.
- Переменная `Раса` строит select по карточкам с тегом `race`.
- Расчетная характеристика персонажа складывает базовую характеристику текущей карточки и одноименную переменную выбранной расы.
- Toolbar больше не появляется во время протягивания выделения мышью: показ откладывается до `pointerup`.

### Оставшиеся риски

- Это MVP, а не финальный formula engine. Сейчас расчет захардкожен для связи `персонаж -> раса -> характеристика`.
- Нужен будущий слой формул, где переменная сможет ссылаться на цепочки вроде `race.str`, `class.proficiency`, `level.modifier`.
- Нужен единый serializer для переменных, если появятся сложные типы данных: массивы, dice formula, ссылки на несколько карточек.
- Popup выбора переменных пока простой и не поддерживает категории/избранное.

### Следующее развитие из этой работы

- Ввести `VariableModel`, который будет читать переменные карточки как данные, а не как DOM.
- Добавить формулы вида `base.str + race.str + class.str`.
- Позже заменить DnD stat block v2 на UI, который собирается из переменных и формул.

## 2026-05-19: Архивация DnD v2 и блока "Переменные"

### Что сделано

- `Стат. блок DnD v 2.0` убран из popup выбора блоков.
- Блок `Переменные` убран из popup выбора блоков.
- Runtime-подключение `setupDndStatsV2()` и `setupVariables()` отключено в `app.js`.
- Runtime-render `renderDndStatsV2()` и `renderVariables()` отключен в `editor.js`.
- CSS `dnd-stats-v2.css` и `variables-block.css` больше не импортируются в `styles/main.css`.
- Добавлен архивный документ `docs/ARCHIVED_EXPERIMENTS.md`.

### Почему

- Обе ветки оказались полезными как исследование, но не как готовая UX/архитектурная основа.
- Для продолжения нужна отдельная модель персонажа/переменных, а не усложнение HTML-блоков.

### Следующее развитие

- Сначала спроектировать `CharacterModel` или `VariableModel`.
- Только после этого возвращаться к UI листа персонажа и формулам.

## 2026-05-19: Drag карточки из дерева на карту

### Что сделано

- В режиме карты можно перетащить карточку из дерева на рабочую область карты.
- Разрешены только карточки типов `character`, `creature` и `object`, которые не находятся внутри дочерней ветки карты.
- При drop создается дочерний дубль карточки в бакете карты `Существа` или `Объекты`, а токен на карте привязывается именно к дублю.
- Точка появления токена берется из места drop на карте, а не из центра видимой области.
- Tree drag теперь допускает `copyMove`: внутри дерева карточка всё ещё перемещается, а drop на карту работает как копирование.

### Оставшиеся риски

- Drop из дерева вынесен в отдельный `campaignMapExternalDrop.js`, но пока использует DOM-события HTML5 drag/drop. Для мобильного режима позже может понадобиться pointer-based fallback.
- Нужно ручное тестирование: перетащить персонажа, существо и объект; убедиться, что исходная карточка не меняется, а дубль появляется в дочках карты.

### Следующее развитие из этой работы

- Добавить визуальный preview токена под курсором во время перетаскивания из дерева.
- Перевести этот сценарий на будущий `CampaignMapModel.addTokenFromPageDuplicate()`, когда модель станет основным источником правды.

## 2026-05-18: Стат. блок DnD v 2.0

### Что сделано

- Добавлен новый тип блока `dndStatsV2`, старый `dndStats` не мигрируется и не меняется.
- Блок содержит выбор расы, класса, вида и подкласса:
  - раса берется из карточек с тегом `race`;
  - класс берется из карточек с тегом `class`;
  - вид берется из карточек с тегом `type`, у которых parent равен выбранной расе;
  - подкласс берется из карточек с тегом `subclass`, у которых parent равен выбранному классу.
- Добавлены поля уровня, бонуса мастерства, КЗ, хитов, скорости, хитов от смерти, костей хитов, владений, характеристик и навыков/спасбросков.
- Разметка блока приведена ближе к листу персонажа:
  - происхождение и развитие идут двумя строками по три поля, где `Вид` расположен под `Расой`, а `Подкласс` под `Классом`;
  - вместо `Уровня` в происхождении добавлено `Истощение` на 6 чекбоксов;
  - боевые показатели идут двумя строками: КЗ/хиты/кость хитов и скорость/уровень с опытом/хиты от смерти/кости хитов;
  - составные поля подписывают значения `факт`, `макс`, `врем.`;
  - хиты от смерти представлены чекбоксами с иконками провалов и успехов;
  - характеристики и навыки объединены в один широкий раздел.
- Визуальный стиль блока переведен в общую темную тему приложения с мягкими панелями и пастельно-желтыми акцентами.
- Расчет DnD 5e:
  - бонус мастерства: уровни 1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6;
  - модификатор характеристики: `floor((значение характеристики - 10) / 2)`;
  - навык или спасбросок = модификатор характеристики + бонус мастерства, если отмечено владение.
- Модификатор характеристики теперь редактируемый: если пользователь меняет его вручную, значение подсвечивается и используется для навыков; если поле очистить, включается авторасчет.

### Оставшиеся риски

- Карточки `race`, `class`, `type`, `subclass` пока не имеют формального schema для автоматических бонусов. Бонусы рас/классов больше не задаются отдельным полем в характеристике, чтобы не плодить временную модель.
- Следующий шаг — описать schema бонусов в карточках расы/класса и подтягивать их автоматически.

## 2026-05-20: Дерево сущностей, уникальные названия и навигационный стек

### Что сделано

- Для дерева добавлен более плавный drag/drop: строка под курсором теперь остается видимой как floating preview, а placeholder больше не перехватывает события мыши и меньше провоцирует дрожание layout.
- Для карточек добавлен стек переходов: если пользователь попал в карточку не из дерева, рядом с заголовком появляется кнопка «Назад», которая возвращает по цепочке предыдущих карточек.
- Кнопка «Назад» усилена: она показывается для любой карточной сущности, а не только для страниц с явным `template: card`.
- В контекстное меню строки дерева добавлено действие `Дублировать`; дубль создается на том же уровне с названием вида `Копия1 - название`.
- Добавлена проверка одинаковых названий карточек, карт и таск-трекеров: конфликтующие заголовки подсвечиваются в открытой сущности и в дереве, а сохранение с дублем имени блокируется.
- Дубли сущностей, которые добавляются на карту, теперь получают название вида `название - сущность.[название карты родителя]`, а складываются в папки `Существа.Название карты` и `Объекты.Название карты`, чтобы не конфликтовать с исходной карточкой и сущностями других карт.
- В контекстное меню дерева добавлено действие `Открыть в папке`; из-за ограничений браузерного File System Access API оно показывает путь внутри workspace и копирует имя файла.

### Оставшиеся риски

- Дерево все еще использует HTML5 drag/drop. Для полной одинаковости с таск-трекером лучше позже перевести его на pointer-based controller.
- `Открыть в папке` нельзя сделать полноценным раскрытием Explorer из чистого браузера без отдельного desktop/native bridge.
- Уникальность сейчас проверяется по видимому названию. Для будущего интернет-режима понадобится серверная проверка и миграция старых конфликтов.

### Следующее развитие из этой работы

- Вынести навигационный стек в отдельный `navigationHistory`-модуль, чтобы wiki-links, карта и дерево использовали один контракт переходов.
- Перевести tree drag/drop на pointer events с тем же подходом, который уже используется в таск-трекере.
- Добавить отдельный lightweight index по названиям страниц, чтобы проверки дублей и wiki-links не проходили по всему `state.pages` при каждом вводе.

## 2026-05-20: Форматирование текста, undo и навигация карточки

### Что сделано

- Исправлен выбор цели для форматирования `Заголовок` / `Обычный текст`: toolbar больше не должен превращать весь соседний editable-контейнер, если выделена только одна внутренняя строка.
- Добавлен `editorHistory.js` — легкий слой истории для операций, где приложение само меняет DOM: вставка plain text, форматирование блоков, цвет, сброс и inline-команды toolbar.
- Ctrl+Z сначала пробует откатить внутреннюю историю редактора и затем сохраняет результат; если внутренней истории нет, браузерное undo продолжает работать штатно.
- Блок навигации карточки стал постоянной маленькой панелью: кнопка `Найти в дереве` показывается всегда на карточках, а `Назад` появляется только при переходе не из дерева.
- `Найти в дереве` раскрывает родительские ветки, скроллит к текущей карточке и временно подсвечивает строку.
- В popup `Связать с существующей` для wiki-link больше не попадают технические дубли, у которых среди родителей есть карта.

### Оставшиеся риски

- `editorHistory.js` — промежуточный слой, а не полноценная модель документа. При больших будущих изменениях лучше перейти к нормальному editor model/history contract.
- Форматирование блоков теперь ограничено внутренними блоками editable-root. Для сложных HTML-фрагментов из paste могут понадобиться дополнительные правила нормализации.

### Следующее развитие из этой работы

- Вынести toolbar formatting в полноценный `FormattingService` без прямой работы с произвольными `div`.
- Сделать единый `EditorHistoryContract`: какие операции пишутся в историю, как группируются ввод/вставка/структурные действия, нужен ли redo.
- Добавить тестовый чеклист по форматированию: частичное выделение, несколько строк, заголовки, таблицы, wiki-links и paste plain text.

## 2026-05-21: Создание задач и карточек по шаблонам

### Что сделано

- В меню `+` добавлен пункт `Задача`: он открывает выбор таск-трекера и создает задачу внутри выбранной доски.
- Новая задача попадает в колонку `Бэклог` / `Backlog`, если она есть; если такой колонки нет, используется первая колонка трекера.
- В меню `+` добавлен пункт `По шаблону`: он открывает список сохраненных шаблонов, позволяет создать карточку по шаблону или удалить шаблон.
- Шаблон можно создать из карточки через меню `...` в дереве командой `Сделать шаблоном`.
- Шаблоны не создают страниц и не появляются в дереве: они хранятся как отдельная lightweight-сущность в localStorage.
- Карточка по шаблону создается на том же уровне, что и текущая открытая карточка, и получает уникальное название по правилу копии.

### Оставшиеся риски

- Хранение шаблонов в localStorage удобно для MVP, но не переносится вместе с workspace на другой компьютер.
- Если шаблоны должны быть общими для workspace, следующим шагом нужно перенести их в отдельный файл вроде `.my-own-world-templates.json`.

### Следующее развитие из этой работы

- Сделать workspace-level template storage, чтобы шаблоны жили рядом с миром, а не в браузере.
- Добавить форму имени при создании карточки по шаблону.
- Добавить быстрый поиск по шаблонам, если их станет много.

## 2026-05-21: Исправление переносов в дереве

### Что сделано

- Drag/drop в дереве стабилизирован: сортировка идет через узкие зоны `before/after`, а центральная зона строки снова остается вложением внутрь, даже если элементы находятся на одном уровне.
- Drop по визуальной плашке `Перенести сюда` теперь определяется по координатам самой плашки, а не по `event.target`, потому что placeholder не перехватывает мышь ради плавности.
- Placeholder больше не переставляется повторно, если он уже стоит в нужной позиции; это снижает тряску layout во время dragover.
- После любого tree move открытая страница синхронизируется с обновленным объектом из `state.pages` после `loadWorkspace()`.
- Это закрывает баг, где после переноса открытой карточки или карты следующий save мог записать старый `parent/order` и фактически откатить перенос.

### Оставшиеся риски

- Дерево все еще работает на HTML5 drag/drop. Оно стало стабильнее, но для полной управляемости лучше перевести его на pointer-based controller, как таск-трекер.

### Следующее развитие из этой работы

- Вынести `reloadTreeAfterMove()` в общий tree move controller.
- Добавить ручной тест: открыть карточку, перенести ее, не переоткрывая изменить текст, обновить страницу и проверить parent/order.
