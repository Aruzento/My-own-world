# Desktop Presentation Window Spike

Дата: 02.06.2026

Пункт плана: **20.10 Desktop Presentation Window Spike**.

## Цель

Проверить путь к отдельному окну презентации в desktop-версии, не ломая текущий browser popup `window.open`.

## Текущий статус

В browser-версии презентация карты открывается через `window.open()` и работает как прямой DOM-клон текущей карты:

- мастерское окно имеет ссылку на `presentationWindow`;
- `syncPresentation()` очищает `.presentation-map` и вставляет клон `.campaign-map-stage`;
- live-sync токенов, фигур, тумана и вектора движения работает через прямой доступ к DOM второго окна.

Этот подход хорошо работает для browser popup, но не является полноценной desktop-архитектурой.

## Что показал spike

Tauri может открывать отдельное native webview window через `WebviewWindow`, и для этого уже подготовлен bridge:

- `js/storage/tauriBridge.js`;
- `openTauriWebviewWindow(label, options)`.

Но native Tauri window не дает мастерскому окну прямой доступ к DOM так же, как browser `window.open`. Поэтому простой перенос текущего `syncPresentation()` невозможен без отдельного transport-слоя.

## Правильная архитектура следующего шага

Нужно сделать отдельный presentation runtime:

1. `presentation.html`
   Отдельная страница презентации без sidebar и editor.

2. `js/presentation/presentationEntry.js`
   Точка входа презентационного окна.

3. `CampaignMapPresentationChannel`
   Канал сообщений между окном мастера и окном презентации.
   В browser можно использовать `BroadcastChannel`.
   В Tauri можно использовать `@tauri-apps/api/event` или тот же `BroadcastChannel`, если WebView стабильно поддерживает его между окнами.

4. Data-first payload
   Мастерское окно должно отправлять не DOM-клон, а JSON-снимок:
   - map id;
   - background asset;
   - tokens;
   - shapes;
   - fog image/state;
   - layers;
   - viewport;
   - drag measure overlay.

5. Presentation renderer
   Презентационное окно должно отрисовывать карту из `CampaignMapModel`, а не из DOM мастера.

## Почему не делать быстрый хак

Хак "открыть Tauri окно и попытаться писать в него DOM" приведет к нестабильному поведению:

- нет надежной ссылки на DOM нового native окна;
- lifecycle окна отличается от browser popup;
- fullscreen/second monitor сценарии потребуют отдельного состояния;
- live-sync станет еще хрупче.

## Ручной smoke текущего состояния

До перехода на native presentation runtime проверять текущую презентацию так:

1. Открыть карту.
2. Нажать кнопку презентации.
3. Убедиться, что открылось отдельное окно/popup.
4. Переместить токен.
5. Проверить live-sync токена и вектора движения.
6. Нарисовать туман.
7. Проверить, что туман находится над токенами.
8. Открыть изображение токена через контекстное меню и проверить показ в презентации.

## Критерий завершения будущего native шага

- Tauri открывает отдельное presentation webview.
- Presentation window получает JSON-снимок карты.
- Токены, фигуры, фон, туман, слои и drag measure отрисовываются из модели.
- Live-sync работает через message channel.
- Закрытие презентации не ломает мастерскую карту.
- Browser popup fallback остается рабочим.
