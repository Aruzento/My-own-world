---
summary: "UI audit and phased modernization plan for MyOwnWorld design system rollout."
read_when:
  - "Before planning visual refresh work"
  - "Before changing popup, buttons, app shell, cards, campaign map UI, or task tracker UI"
owner_zone: "architecture"
---

# UI Audit And Modernization Plan

Дата обновления: 22.07.2026

Подробный инвентаризационный снимок для версии 1: [UI_CSS_INVENTORY_REPORT.md](./UI_CSS_INVENTORY_REPORT.md).

Референсы конкурентов и visual craft для систем MyOwnWorld: [UI_UX_COMPETITOR_REFERENCE_RESEARCH.md](./UI_UX_COMPETITOR_REFERENCE_RESEARCH.md).

## Цель

Подготовить поэтапную модернизацию UI MyOwnWorld без хаотичного редизайна. Интерфейс должен стать цельным, современным и приятным для долгой работы, но не потерять скорость, читаемость, desktop-совместимость и существующие сценарии.

## UI Audit

### 2026-07-21 Inventory Baseline

- Подтверждено: в `styles/` сейчас 52 CSS-файла и 22,646 строк CSS; редизайн нельзя делать одним массовым патчем.
- Подтверждено: `styles/design-tokens.css`, `styles/ui.css`, `styles/brand-system.css`, `js/ui/popupManager.js` и локальный SVG sprite уже являются reusable foundation.
- Основной риск: крупные feature-файлы (`block-properties.css`, `campaign-map-popups.css`, `knowledge-graph.css`, `knowledgeGraphPage.js`, `propertiesSettingsPopup.js`) держат слишком много локальных визуальных и поведенческих решений.
- Next action completed by `0.0.1.8.7`; the current AppShell now has a runtime shell-token foundation before primitive migration.

### 2026-07-21 Theme Foundation POC

- Confirmed: `0.0.1.8.3` added runtime theme management through `js/ui/themeManager.js` without changing workspace data or moving large UI systems.
- Confirmed: `styles/design-tokens.css` now has semantic aliases for surfaces, text, accent, focus, controls, density, typography, spacing, status, elevation, motion, z-index, icons and the first map/graph/block/property/task/diagnostics seeds.
- Confirmed: the shared `styles/ui.css` seed layer now proves those tokens on icons, generic buttons, generic inputs and operation-progress motion.
- Confirmed: `js/core/icons.js` keeps the old helper API, but supports normalized icon names, escaped attributes/text, optional labels and size metadata.
- Next action completed by `0.0.1.8.4`; the first visible shared primitives now exist before broad screen migration.

### 2026-07-21 Component Catalogue POC

- Confirmed: `0.0.1.8.4` added `Tools -> Компоненты` as a visible proof-of-concept catalogue for shared Button, Input, Panel and Popover primitives.
- Confirmed: the catalogue uses the existing popup lifecycle instead of creating another overlay controller.
- Confirmed: the samples cover focus, keyboard close, disabled, readonly, invalid, pressed, loading, compact/large density and reduced-motion-safe overlay behavior.
- Confirmed: this is a reference surface only; feature screens are not migrated in this step.
- Next action completed by `0.0.1.8.5`; the empty workspace start screen now carries the first visible AppShell foundation.

### 2026-07-21 AppShell Foundation

- Confirmed: `0.0.1.8.5` added semantic AppShell zone markers to the current shell without moving feature business logic.
- Confirmed after review: the empty workspace start screen is a single clear action card using shared tokens and the local icon sprite, not an internal workspace/inspector/diagnostics demo.
- Confirmed: the start-screen actions keep the existing create-template behavior instead of inventing a new global router.
- Confirmed: the POC has desktop and mobile browser coverage.
- Next action completed by `0.0.1.8.6`; screenshot and inventory baselines are now collected before broader migration.

### 2026-07-21 Migration Phase 0 Baselines

- Confirmed: `0.0.1.8.6` added [UI_MIGRATION_BASELINES.md](./UI_MIGRATION_BASELINES.md) as the UI/CSS/icon/popup/screenshot baseline manifest for future migration phases.
- Confirmed: `tests/browser/visual-regression.spec.mjs` now attaches baseline screenshots for AppShell, empty workspace start, sidebar/tree, card editor, Properties, Properties popup, campaign map, Knowledge Graph, task tracker and shared component catalogue popover.
- Confirmed: `tests/uiMigrationBaselines.test.mjs` keeps the baseline manifest synchronized with the visual smoke attachment names and required system inventory rows.
- Confirmed: this phase makes no broad visual migration; it is the controlled comparison layer for `0.0.1.8.7+`.
- Next action completed by `0.0.1.8.7`; semantic AppShell foundation tokens are now applied to app-level surfaces.

### 2026-07-21 Migration Phase 1 Foundations

- Confirmed: `0.0.1.8.7` added `--mow-shell-*` tokens for app shell layout, density, topbar/statusbar height, panel surface, divider, elevation and shell control states.
- Confirmed: `.app`, `.app-topbar`, `.sidebar`, `.editor`, `.statusbar` and the empty-workbench start surface now consume those tokens instead of keeping their own local shell values.
- Confirmed: `data-ui-foundation="0.0.1.8.7"` marks the root shell, and `tests/browser/app-shell.spec.mjs` verifies the marker, tokenized shell surfaces and compact density response.
- Confirmed: this phase does not migrate feature systems or shared primitives beyond the app-level foundation.
- Next action completed by `0.0.1.8.8`; shared control primitives now exist beyond Button/Input/Panel/Popover.

### 2026-07-21 Migration Phase 2 Primitives

- Confirmed: `0.0.1.8.8` added shared IconButton, Select, Checkbox, SegmentedControl, Toolbar and Separator tokens/styles without touching map, graph, editor, Properties or task-tracker business logic.
- Confirmed: `Tools -> Компоненты` now exposes Button, IconButton, Field, Toolbar, Panel and Popover states as a living primitive reference.
- Confirmed: the app Tools popup is a real consumer of shared `.mow-button`, so the primitive layer is not catalogue-only.
- Confirmed: the same slice started the overlay foundation with `data-overlay-kind`, `data-overlay-lifecycle` and `data-overlay-state` on topbar/component catalogue popovers through `popupManager`.
- Next action completed by `0.0.1.8.10` and corrected by `0.0.1.8.10.2`-`0.0.1.8.10.4`; the real AppShell now has a rail that keeps `Дерево` as the only current content navigation entry and tree-panel show/hide control, tree-preserving sidebar behavior, Explorer-style root actions and resize without adding fake content-type tabs or bottom-panel placeholders.

### 2026-07-21 Migration Phase 3 Overlays Closed

- Confirmed: `popupManager` now owns the shared lifecycle for modal focus/focus return, menu keyboard behavior, tooltip/toast markers and the high-risk feature overlay families touched in `0.0.1.8.9`.
- Confirmed: direct runtime JS popup opening through `positionPopup*` or manual `.hidden` removal is gone outside `popupManager`/`popupPosition`.
- Confirmed: remaining visual work belongs to the later owner phases, not to a reopened overlay infrastructure phase.

### 2026-07-21 Migration Phase 4 AppShell Closed

- Confirmed: `0.0.1.8.10` adds a left `nav-rail` using existing local sprite icons; `0.0.1.8.10.2` corrects it so content types are not duplicated as rail tabs, and `0.0.1.8.10.4` makes `Дерево` the show/hide control for the tree panel. The visible rail currently contains `Дерево` plus the profile/user bar; future additions should be distinct global tools.
- Confirmed: the primary sidebar keeps the tree intact; cards, maps, task trackers, rule trees and knowledge graphs remain normal world pages reachable through `Дерево` and create flows until a future rail entry owns a distinct tool workflow.
- Confirmed: `0.0.1.8.10.3` moves workspace opening into the no-workspace tree area and moves root-level creation to the `Корень` row with separate `+` and folder actions.
- Confirmed: `0.0.1.8.10.4` removes the duplicate sidebar `MyWorld` / `Дерево мира` header and moves profile out of the tree sidebar into the rail.
- Confirmed: tree-panel visibility and sidebar resize are owned by AppShell, are keyboard-accessible and persist local UI state without touching workspace schema.
- Confirmed by `0.0.1.8.11.1`: the old page-info right inspector is removed. The reserved `right-panel` slot stays hidden until a future workflow has a clear purpose for it.
- Confirmed by `0.0.1.8.11.1`: the tree/search surface now carries the first Phase 5 core-content marker and local search icon foundation.
- Confirmed by `0.0.1.8.11.2`: block-level DnD (`BI-013`) is restored with pointer preview/placeholder behavior, and Add block (`BI-014`) uses local sprite icons, tokenized type-picker styling, focus states and visual smoke coverage.
- Confirmed by `0.0.1.8.11.3`: card editor header/runtime controls now consume shared tokens, page nav uses local sprite icons, title typography avoids negative/viewport-scaled sizing, and the floating text toolbar is an overlay-layer accessible toolbar with visual overlap coverage.
- Next action updated: continue with `0.0.1.8.11` Migration Phase 5 core content for Properties, templates, deeper search and command palette.

### Общий Layout

- Устарело: часть зон выглядит как набор локальных решений, а не единая система поверхностей.
- Перегружено: много подсистем имеют собственные размеры, радиусы и плотность.
- Иерархия: topbar, sidebar и editor иногда конкурируют за внимание.
- Отступы: нет единой шкалы spacing во всех поверхностях.
- Состояния: hover/focus есть не везде одинаково.
- Анимации: допустимы только мягкие transitions для popup/controls. Нельзя анимировать большие рабочие поверхности.

### Sidebar

- Устарело: дерево стало функциональным, но визуально накопило много специальных состояний.
- Перегружено: вложенность, duplicate warnings, linked-token highlights и actions требуют единого style contract.
- Иерархия: активная сущность должна быть заметнее, но без яркого цвета.
- Отступы: уровни дерева требуют более спокойного ритма.
- Состояния: hover/focus/active должны быть одинаковыми для карточек, карт и task tracker.
- Анимации: можно мягко подсвечивать найденную/активную строку; нельзя анимировать DnD так, чтобы была тряска.

### Editor

- Устарело: editor surface и документ местами выглядят как разные эпохи UI.
- Перегружено: floating toolbar, table toolbar, back button и card header нуждаются в общей системе слоев.
- Иерархия: название карточки, тип, теги, aliases и blocks actions должны иметь более ясный visual order.
- Отступы: блоки и секции требуют общей шкалы.
- Состояния: focus в contenteditable должен быть мягким и читаемым.
- Анимации: toolbar/popup можно показывать мягко; нельзя показывать toolbar до завершения выделения.

### Карточки

- Устарело: часть блоков выглядит современнее других.
- Перегружено: свойства, DnD-блоки, таблицы, image blocks и item chips используют разные правила плотности.
- Иерархия: действия блока должны быть доступными, но не спорить с контентом.
- Отступы: блоки свойств и special blocks требуют выравнивания по сетке.
- Состояния: image hover actions, delete/drag handles и inputs должны быть унифицированы.
- Анимации: можно мягко подсвечивать active block; нельзя анимировать layout так, чтобы текст прыгал.

### Блоки Свойств

- Устарело: селекторы и поля пока выглядят технически.
- Перегружено: свойства разных типов карточек могут быстро стать плотными и шумными.
- Иерархия: поля с несколькими input должны иметь ясные подписи.
- Отступы: нужна компактная, но ровная grid-система.
- Состояния: focus/invalid/readonly должны отличаться.
- Анимации: только focus/hover, без раскрывающихся тяжелых эффектов.

### Campaign Map

- Устарело: toolbar и popup карты выросли быстрее, чем единая визуальная система.
- Перегружено: fog, grid, layers, shapes, initiative, token menu и presentation controls конкурируют за место.
- Иерархия: режим карты должен отделять действия мастера от состояния сцены.
- Отступы: toolbar должен быть компактнее и стабильнее.
- Состояния: selected, hidden, player, dead, layer states должны быть визуально согласованы.
- Анимации: нельзя анимировать stage, fog canvas, drag/pan/zoom тяжелыми transitions.

### Popup

- Устарело: часть popup уже мягкие, часть все еще специализированные и плотные.
- Перегружено: item picker, campaign map popup, create menu, color popup и type selector используют разные паттерны.
- Иерархия: title, body, actions должны быть одинаковыми.
- Отступы: нужен единый popup padding и max-size.
- Состояния: Escape/outside/reopen/toggle должны работать одинаково.
- Анимации: разрешено короткое появление; обязательно учитывать reduced motion.

### Task Tracker

- Устарело: MVP стал полезным, но визуально пока слабее карты и карточек.
- Перегружено: при росте количества колонок нужен лучший rhythm.
- Иерархия: колонка, задача, чеклист и actions должны иметь четкий порядок.
- Отступы: 5 колонок в ряд требуют стабильной сетки.
- Состояния: drag preview уже хороший ориентир, но нужны единые selected/hover/focus.
- Анимации: drag preview можно сохранять плавным; нельзя добавлять длительные перестройки колонок.

### Toolbar

- Устарело: текстовый toolbar функционален, но требует единого размера и popup-паттерна.
- Перегружено: цвет, формат, заголовки, списки и link actions должны быть сгруппированы яснее.
- Иерархия: active state должен быть заметен.
- Отступы: toolbar должен иметь фиксированную ширину и не сжиматься от выделения.
- Состояния: active/focus/hover должны быть одинаковыми.
- Анимации: можно мягко показывать toolbar после mouseup; нельзя показывать во время выделения.

### Settings / Topbar

- Устарело: настройки пока пустые и могут выглядеть как заглушка.
- Перегружено: нет, зона пока легкая.
- Иерархия: topbar должен быть тонким и не спорить с workspace.
- Отступы: кнопки справа должны быть стабильными.
- Состояния: hover/focus нужны единые.
- Анимации: можно мягко открывать popup.

### Desktop Presentation Window

- Устарело: презентация пока техническая.
- Перегружено: UI должен оставаться минимальным.
- Иерархия: карта важнее controls.
- Отступы: controls должны быть компактными.
- Состояния: zoom/pan и image popup должны быть предсказуемыми.
- Анимации: нельзя ухудшать sync/performance.

## Design System Plan

Основой становится `styles/design-tokens.css`.

Будущие группы:

- цветовая палитра;
- фоновые уровни;
- surface / panel / card;
- border;
- shadow;
- radius;
- typography;
- spacing scale;
- z-index scale;
- animation tokens;
- button states;
- input states;
- popup states;
- card states;
- map controls states.

## Phased Rollout

### Phase 1 - Design Tokens Foundation

- Создать `styles/design-tokens.css`.
- Подключить к `styles/main.css`.
- Не менять визуал резко.
- Проверки: `npm run verify`, `npm run test:browser`.

### Phase 2 - Popup & Buttons Refresh

- Унифицировать popup base.
- Привести кнопки к состояниям default/hover/focus/active/disabled/danger.
- Проверить popup boundary и repeated trigger close.
- Проверки: popup lifecycle browser tests.

### Phase 3 - App Shell Refresh

- Sidebar.
- Topbar.
- Editor surface.
- Spacing.
- Typography.
- Проверки: visual smoke, app shell, tree.

### Phase 4 - Card / Editor Refresh

- Карточки.
- Блоки.
- Свойства.
- Таблицы.
- Image blocks.
- Проверки: editor formatting, tables, property blocks, visual regression.

### Phase 5 - Campaign Map UI Refresh

- Toolbar карты.
- Popup карты.
- Controls.
- Badges.
- Fog/layers UI.
- Проверки: browser tests карты и performance smoke.

### Phase 6 - Task Tracker Refresh

- Колонки.
- Карточки задач.
- Drag states.
- Empty states.
- Проверки: task tracker browser tests.

### Phase 7 - Desktop Polish

- Presentation window.
- Installer-facing docs.
- App icon / window polish позже.
- Проверки: desktop smoke checklist и browser presentation tests.

## Test Protection

Для каждого этапа:

- `npm run verify`;
- `npm run test:browser`;
- visual smoke / screenshots для ключевых поверхностей;
- popup boundary check, если меняется popup;
- hover/focus checks, если возможно;
- отдельные tests карты, если меняются стили карты;
- отдельные popup lifecycle tests, если меняются popup.

## Что Не Делать Сейчас

- Не менять весь дизайн сразу.
- Не переписывать CSS без design tokens.
- Не менять карту визуально без performance smoke.
- Не делать декоративную RPG-менюшку.
- Не ломать desktop.
