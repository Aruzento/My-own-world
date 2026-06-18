---
summary: "Campaign map performance strategy."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Campaign Map Performance Strategy

Этот документ фиксирует риски производительности карты, первые сценарии измерения, метрики и бюджеты.

Цель - перестать оптимизировать карту "на ощущениях" и перейти к измеряемым ограничениям.

## Главные Риски

### Много Токенов

Каждое существо или объект на карте - это DOM-элемент с координатами, размером, состоянием видимости, изображением и иногда health frame.

Риски:

- дорогой пересчет layout при drag;
- повторная загрузка изображений;
- лишняя синхронизация презентации при каждом движении;
- большое число hover/context-menu listeners.

### Много Фигур

Фигуры лежат выше остальных слоев и могут иметь подписи размеров.

Риски:

- много DOM-узлов для вершин/подписей;
- пересчет геометрии при resize;
- конфликт hit testing с токенами под фигурой.

### Большой Background

Большая карта грузится как изображение и масштабируется viewport-ом.

Риски:

- большой decode time;
- большие текстуры в памяти браузера;
- лаг перед первым drag, если browser поднимает изображение в GPU только в момент взаимодействия.

### Fog

Туман войны использует canvas и должен отличаться по opacity между мастер-картой и презентацией.

Риски:

- большой canvas;
- частая перерисовка кистью;
- дорогое сохранение fog image;
- рассинхрон презентации после смены background.

Текущая защита:

- `CampaignMapModel.fog` хранит `dirtyRegionCount` и `lastDirtyRegion` как foundation для patch-oriented save/sync;
- полный `fogImage` пока остается главным persistent-источником, чтобы не терять данные при reload;
- мазки тумана обновляют store с `commit: false`, чтобы не переписывать весь DOM на каждый pointer move;
- locked fog zones блокируют stroke, если область кисти пересекает защищенную зону.

### Presentation Sync

Презентация должна совпадать с мастер-картой, но full-sync дорогой.

Риски:

- полное клонирование состояния при каждом малом движении;
- лишние update для скрытых объектов;
- drag-measure overlay может синхронизироваться слишком часто.

Текущая защита:

- live token/shape sync идет по `tokenId` / `shapeId`;
- несколько item updates в одном кадре батчатся по карте;
- если один из item отсутствует в презентации, выполняется один fallback full-sync;
- fog paint обновляет только fog image в презентации, а не всю карту.

### Zoom/Pan

Zoom и pan меняют transform сцены.

Риски:

- неудачные transforms могут ломать позиционирование;
- слишком много пересчетов при wheel;
- визуальные overlay могут отставать от модели.

## Performance Scenarios

### `small-map-baseline`

- 10 токенов;
- 5 фигур;
- один background;
- fog отключен.

Цель: базовая карта должна работать без заметных задержек.

### `large-map-drag`

- 200 токенов;
- 50 фигур;
- большой background;
- активный drag одного токена.

Цель: первый захват и движение токена должны оставаться отзывчивыми.

### `large-map-stress`

- 260+ токенов;
- 120+ фигур;
- 10+ слоев;
- большой fog canvas;
- 180+ dirty fog regions.

Цель: большая карта должна собираться из `CampaignMapModel`, сохранять измеримые counts по токенам, фигурам, слоям и fog operations, а regression должен падать, если сцена снова выходит за согласованные P1-бюджеты.

### `fog-paint-large`

- большой background;
- fog включен;
- кисть 80-160 px;
- активное рисование и стирание.

Цель: кисть не должна отставать от курсора.

### `fog-pointer-paint-stress`

- карта открыта в DOM;
- активен инструмент тумана;
- pointer route проходит через `campaignMapPointerController`;
- `pointerdown` идет по stage, `pointermove` и `pointerup` идут через document;
- проверяются `fogVersion` и `dirtyFogRegionCount`.

Цель: ловить регрессы реального маршрута рисования тумана, а не только скорость прямого canvas API.

### `presentation-live-sync`

- открыта презентация;
- 100 токенов;
- 25 фигур;
- перемещение токена и фигуры.

Цель: презентация должна получать item-level sync, а не full-sync на каждый pointer move.

### `zoom-pan-heavy`

- 200 токенов;
- 100 фигур;
- zoom in/out колесом;
- pan рукой.

Цель: transform viewport не должен запускать дорогую пересборку DOM.

## Метрики

- `renderTimeMs` - время применения модели к DOM.
- `syncTimeMs` - время синхронизации презентации.
- `visibleTokenCount` - число видимых токенов.
- `visibleShapeCount` - число видимых фигур.
- `hiddenTokenCount` - число скрытых токенов.
- `hiddenShapeCount` - число скрытых фигур.
- `layerCount` - количество слоев в модели карты.
- `backgroundLoadMs` - время загрузки background.
- `fogDrawTimeMs` - время серии операций рисования тумана.
- `fogCanvasPixels` - площадь canvas тумана.
- `dirtyFogRegionCount` - количество dirty-region отметок при рисовании тумана.
- `zoom` - текущий zoom viewport.

## Первые Budgets

Budgets не являются вечным законом. Это стартовые пороги, которые нужно уточнять после реальных измерений.

- `renderTimeMs`: до 16.7 ms для обычного кадра.
- `syncTimeMs`: до 8 ms для item-level sync.
- `fullSyncTimeMs`: до 80 ms для редкого full-sync.
- `fogDrawTimeMs`: до 80 ms для synthetic `fog-paint-large` browser smoke.
- `backgroundLoadMs`: до 1000 ms для большого изображения.
- `visibleTokenCount`: до 200 без деградации drag.
- `visibleShapeCount`: до 100 без деградации hover/drag.
- `fogCanvasPixels`: до 8 000 000 px без заметного отставания кисти.
- `dirtyFogRegionCount`: до 120-160 отметок в одном сценарии рисования.

## Scenario Budgets В Коде

Budgets теперь заданы не только текстом, но и в `js/editor/campaignMapPerformance.js`:

- `smallMapBaseline`;
- `largeMapDrag`;
- `largeMapStress`;
- `fogPaintLarge`;
- `fogPointerPaintStress`;
- `presentationLiveSync`;
- `zoomPanHeavy`.

Для тестов используется `createCampaignMapPerformanceReport()` и `assertCampaignMapPerformanceBudget()`. Это важно: performance gate должен падать в regression, если сцена снова начинает превышать выбранные пороги.

## Dev Diagnostics

Для ручной диагностики можно включить легкую панель:

```js
localStorage.setItem('myOwnWorld.debug.performance', 'true');
```

После перезагрузки карты появится runtime-панель с количеством видимых токенов, фигур, размером fog canvas и числом warning. В обычном режиме она не отображается.

Отключить:

```js
localStorage.removeItem('myOwnWorld.debug.performance');
```

## Следующие Шаги

1. Добавить stress smoke с реальным pointer drag на большой карте.
2. Добавить stress smoke с реальным pointer painting тумана, а не только synthetic canvas paint.
3. Перевести fog save на настоящие dirty regions.
4. Усилить presentation sync: diff by id для слоев, locked fog zones и редких structural changes.
5. Добавить UI/CLI отчет performance diagnostics для CI artifacts.
