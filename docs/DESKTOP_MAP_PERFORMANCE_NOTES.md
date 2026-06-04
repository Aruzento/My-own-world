# Desktop Map Performance Notes

Дата: 04.06.2026

## Почему карта в Desktop Может Рендериться Дольше, Чем В Браузере

Карта в desktop/Tauri сейчас медленнее не из-за одной причины, а из-за суммы факторов.

## 1. Asset URL И Fallback

В браузере картинка часто быстро отдается как `blob:` URL из File System Access API.

В desktop картинка проходит другой путь:

1. `data-map-asset` или `data-image-asset`;
2. `AssetAdapter`;
3. Tauri command `resolve_asset_url`;
4. Tauri asset protocol URL;
5. проверка, что `Image` реально отрисовался;
6. если asset URL не отрисовался, чтение бинарника через StorageAdapter;
7. conversion в `data:image/...;base64`.

Это надежнее, но тяжелее. Особенно тяжело для больших background-карт: `data:` URL раздувает размер примерно на треть и требует память на base64-строку.

## 2. Low-detail Background Создается Через Canvas

Оптимизация большой карты делает low-detail версию через canvas:

- грузит исходное изображение;
- считает масштаб;
- рисует уменьшенную копию;
- создает blob URL.

На больших изображениях это заметно, особенно при первом открытии карты.

## 3. Fog Canvas И Locked Fog

Туман войны хранится и синхронизируется как canvas/data image.

При presentation sync нужно:

- получить изображение fog canvas;
- учесть locked fog zones;
- держать туман поверх токенов, объектов и фигур.

Это дает дополнительные операции с пикселями.

## 4. Presentation Model Payload

После `20.14.2` desktop-презентация получает model-first payload, а не HTML snapshot.

Это правильнее архитектурно, но при полном sync нужно:

- собрать модель;
- восстановить background asset;
- восстановить token image assets;
- собрать fog image;
- передать payload через `BroadcastChannel`;
- заново построить DOM presentation window.

Дальше это нужно оптимизировать diff-sync по tokenId/shapeId/fogVersion.

## 5. WebView И IPC

В браузере все живет внутри обычного browser runtime.

В desktop добавляются:

- Tauri WebView;
- Rust command boundary;
- asset protocol;
- отдельное окно презентации;
- межоконный `BroadcastChannel`.

Каждый слой сам по себе небольшой, но на тяжелой карте сумма становится заметной.

## Что Уже Сделано

- Карта сохраняется data-first через `CampaignMapModel`.
- Presentation renderer строится из модели, а не из HTML snapshot.
- Background, portraits, image blocks и tokens получили renderable image fallback.
- Есть browser regression на background fallback.
- Есть performance smoke для большой карты и fog paint.
- `getRenderableImageURL()` кэширует успешный renderable URL или fallback `data:` URL.
- Tauri-презентация получила delta-sync: `update-items`, `update-fog`, `drag-measure`.
- Полный `render-model` больше не используется для каждого перемещения токена/фигуры.
- Hex-цвет сетки в презентации приглушается до alpha, чтобы сетка не выглядела ярче мастерской карты.
- Стрелка расстояния в презентации поднята выше тумана, чтобы движение было видно игрокам.
- Добавлен scenario `desktopPresentationLargeWorkspace`, который разделяет `fullSyncTimeMs` и `deltaSyncTimeMs`.

## Следующие Оптимизации

1. Для background использовать отдельный persistent cache low-detail preview.
2. Довести desktop presentation diff-sync до layer visibility и background-only changes.
3. Для fog обновлять dirty region, а не весь canvas.
4. Для больших background не переводить fallback в base64, если Tauri asset protocol уже стабилен.
5. Подключить реальные desktop measurements из Tauri-окна, а не только model-level scenario.

## Практический Вывод

Сейчас desktop рендер медленнее браузера, потому что мы выбрали надежность отображения assets и переносимость workspace. Следующий этап оптимизации должен уменьшить повторные чтения assets и сделать presentation sync дифференциальным.
