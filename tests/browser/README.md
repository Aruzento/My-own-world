# Browser Smoke Foundation

Эта папка хранит браузерные smoke/regression тесты и сценарии для их расширения.

В проект подключен Playwright. Сейчас автоматизирован первый smoke без workspace, а `scenarios.mjs` хранит очередь следующих сценариев.

## Цель

Browser smoke должен ловить регрессии, которые нельзя надежно проверить через `node:test`:

- клики и popup-позиционирование;
- drag and drop;
- сохранение после UI-действий;
- работу contenteditable;
- карту и presentation sync;
- визуальное состояние дерева и toolbar.

## Runner

Используется Playwright:

- хорошо работает с локальным static server;
- умеет pointer/mouse drag;
- умеет проверять console errors;
- можно делать screenshot/regression checks для карты и popup-ов.

Команда запуска:

```powershell
npm run test:browser
```

Скрипт `tools/run_browser_smoke.mjs` сам поднимает `tools/static_server.mjs`, запускает Playwright и закрывает сервер после тестов.

## Где хранить тесты

- `tests/browser/*.spec.mjs` — реальные браузерные тесты;
- `tests/browser/scenarios.mjs` — общий список сценариев и приоритетов;
- `tests/browser/fixtures/` — маленький тестовый workspace;
- `tests/browser/helpers/` — запуск приложения, выбор workspace, общие клики.

Первый тест:

- `app-shell.spec.mjs` — проверяет, что приложение открывается без workspace, показывает пустой стартовый экран и не пишет ошибки в console/pageerror.

## Первые сценарии для автоматизации

1. `tree-dnd-save-after-move` — перенос в дереве и сохранение открытой страницы после переноса.
2. `tree-collapse-persistence` — свернутые ветки сохраняются после reload.
3. `campaign-map-token-flow` — добавление существа на карту, перемещение, сохранение, reload.
4. `campaign-map-presentation-sync` — совпадение токенов/фигур между картой мастера и презентацией.
5. `toolbar-formatting-boundary` — форматирование не захватывает соседний текст.
6. `task-tracker-dnd-persistence` — перенос задач/колонок и сохранение.
7. `popup-viewport-fit` — popup не выходит за видимую область.
8. `template-create-card` — создание карточки по шаблону.

## Правила

- Browser smoke не должен использовать реальный пользовательский workspace.
- Тестовый workspace должен быть маленьким и лежать в `tests/browser/fixtures/`.
- Каждый тест должен начинаться с чистого состояния.
- В тестах нельзя полагаться на порядок файлов в реальной папке пользователя.
- Если сценарий нашел баг, он должен остаться в списке regression tests после исправления.
