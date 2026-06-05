---
summary: "UI audit and phased modernization plan for MyOwnWorld design system rollout."
read_when:
  - "Before planning visual refresh work"
  - "Before changing popup, buttons, app shell, cards, campaign map UI, or task tracker UI"
owner_zone: "architecture"
---

# UI Audit And Modernization Plan

Дата обновления: 05.06.2026

## Цель

Подготовить поэтапную модернизацию UI MyOwnWorld без хаотичного редизайна. Интерфейс должен стать цельным, современным и приятным для долгой работы, но не потерять скорость, читаемость, desktop-совместимость и существующие сценарии.

## UI Audit

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
