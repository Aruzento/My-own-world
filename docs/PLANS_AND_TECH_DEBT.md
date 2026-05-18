# Планы и техдолг

Этот файл является рабочим журналом архитектурных решений. После крупных изменений нужно добавлять сюда короткий анализ: что стало лучше, какие риски остались и какой следующий шаг логично сделать.

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
- Save всё ещё сериализует DOM через существующий clean-save слой. Полный data-first save потребует отдельного persistent JSON/HTML mapping слоя.
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

## Правила развития

- Любой новый runtime UI должен иметь `data-runtime="true"` и не попадать в persistent HTML.
- Любая новая подсистема карты должна быть отдельным файлом, если она может жить без прямого доступа к глобальному drag/save state.
- В новых файлах нужны короткие русские комментарии, которые объясняют ответственность модуля и сложные места.
- Не добавлять новые крупные функции в `campaignMap.js`, если их можно оформить как отдельный модуль.
- После каждого крупного изменения обновлять этот файл: что изменилось, что стало лучше, что осталось опасным.
