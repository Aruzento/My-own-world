# Browser Smoke Foundation

## Current UI Smoke Notes

- `component-catalogue.spec.mjs` verifies the visible Tools component catalogue route, shared Button/IconButton/Field/Toolbar/Panel/Popover states, density response, focus, Escape close, the app Tools shared Button consumer and overlay state markers.
- `app-shell.spec.mjs` guards the AppShell migration surface: empty start readability, the no-workspace tree `Открыть папку` action, root `+`/folder creation actions, the left rail with `Дерево` as the only current content navigation entry and tree-panel show/hide button, profile placement in the rail, absence of content-type rail duplicates, tree search, sidebar resize, editor expansion when the tree is hidden, hidden right-panel default state, explicit right-panel foundation open/close, density behavior and mobile layout.
- `popup-lifecycle.spec.mjs` now also verifies `data-overlay-*` state synchronization, modal focus trap and focus return in addition to viewport fit, Escape, outside click, z-index and trigger lifecycle behavior.
- `editor-formatting.spec.mjs` now includes the block-level pointer DnD regression: a real mouse drag moves a block, shows preview/placeholder feedback, writes one save, and removes runtime drag UI after drop.
- `property-blocks.spec.mjs` now guards the redesigned Add block picker: local sprite icons, option roles/labels, group labels, hidden first-step actions and focus styling.
- `visual-regression.spec.mjs` now also guards the `0.0.1.8.11.3` card editor header/toolbar contract: local nav icons, accessible toolbar labels, restrained radii, no blur, overlay-layer placement and no title overlap.

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
Аргументы после `--` передаются напрямую в Playwright, поэтому точечные проверки работают без запуска всего smoke:

```powershell
npm run test:browser -- --grep schema-recovery
npm run test:browser -- tests/browser/knowledge-graph.spec.mjs
```

## Где хранить тесты

- `tests/browser/*.spec.mjs` — реальные браузерные тесты;
- `tests/browser/scenarios.mjs` — общий список сценариев и приоритетов;
- `tests/browser/fixtures/` — маленький тестовый workspace;
- `tests/browser/helpers/` — запуск приложения, выбор workspace, общие клики.

Первый тест:

- `app-shell.spec.mjs` — проверяет, что приложение открывается без workspace, показывает читаемый пустой стартовый экран, держит tree-area `Открыть папку`, root-level `+`/folder actions, AppShell foundation/migration markers, rail with one `Дерево` entry, profile/user bar in the rail, отсутствие дублирующих content-type вкладок, отсутствие дублирующего заголовка дерева, tree search, sidebar resize, tree show/hide with editor expansion, hidden right-panel default state, explicit right-panel foundation open/close, density guard, mobile layout и не пишет ошибки в console/pageerror.
- `popup-lifecycle.spec.mjs` — проверяет общий popup lifecycle: позиционирование внутри viewport, Escape, outside click, z-index, modal focus trap/focus return и повторный клик trigger.
- `visual-regression.spec.mjs` — сохраняет screenshot attachments ключевых поверхностей из `UI_MIGRATION_BASELINES.md`, включая `visual-add-block-popup`, и проверяет базовые visual guards: popup в viewport, фиксированную ширину toolbar, selection-box карты, слой тумана и badge `скрыт`.

## Первые сценарии для автоматизации

1. `tree-dnd-save-after-move` — перенос в дереве и сохранение открытой страницы после переноса.
2. `tree-collapse-persistence` — свернутые ветки сохраняются после reload.
3. `campaign-map-token-flow` — добавление существа на карту, перемещение, сохранение, reload.
4. `campaign-map-presentation-sync` — совпадение токенов/фигур между картой мастера и презентацией.
5. `toolbar-formatting-boundary` — форматирование не захватывает соседний текст.
6. `task-tracker-dnd-persistence` — перенос задач/колонок и сохранение.
7. `popup-viewport-fit` — popup не выходит за видимую область.
8. `template-create-card` — создание карточки по шаблону.
9. `visual-core-surfaces` — screenshots AppShell, sidebar/tree, card editor, Add block popup, Properties, Properties popup, campaign map, Knowledge Graph, task tracker и shared popover плюс layout guards.
10. `popup-trigger-toggle-lifecycle` — единый lifecycle popup: open/toggle/close/Escape/outside click.
11. `popup-modal-focus-lifecycle` — modal popup keeps Tab/Shift+Tab inside and returns focus to the trigger on close.

## Правила

- Browser smoke не должен использовать реальный пользовательский workspace.
- Тестовый workspace должен быть маленьким и лежать в `tests/browser/fixtures/`.
- Каждый тест должен начинаться с чистого состояния.
- В тестах нельзя полагаться на порядок файлов в реальной папке пользователя.
- Если сценарий нашел баг, он должен остаться в списке regression tests после исправления.
