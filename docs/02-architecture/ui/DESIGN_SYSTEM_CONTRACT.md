---
summary: "Contract for MyOwnWorld design tokens, AppShell zones, shared UI primitives, overlays, motion, iconography and safe UI migration."
read_when:
  - "Before changing app UI styles"
  - "Before adding a new popup, toolbar, card block, map control, graph control or task tracker UI"
  - "Before starting any 0.0.1.8.x UI migration phase"
owner_zone: "architecture"
---

# Design System Contract

Updated: 2026-07-22

Plan ref: `0.0.1.8.2`

Readiness: `Foundation`

## Purpose

This contract defines how MyOwnWorld UI is allowed to grow during the version-1 redesign. It exists so the app becomes one coherent GM workbench instead of a set of unrelated feature skins.

The contract is intentionally strict. Future UI work must use shared tokens, shared primitives, shared overlay behavior and the same AppShell model unless a task explicitly updates this contract first.

This contract task did not migrate CSS or runtime UI by itself. The first runtime foundation now lives in `0.0.1.8.3`; later phases must still follow these rules.

## Коротко Для Владельца

Этот контракт фиксирует, каким должен быть новый UI MyOwnWorld:

- один рабочий стол мастера, а не отдельные интерфейсы для карты, графа, карточек и задач;
- сначала токены и primitives, потом визуальная миграция;
- все кнопки, поля, popup, меню, панели, toolbar и иконки должны постепенно прийти к общим правилам;
- карта и граф не получают тяжёлые blur/анимации, потому что там важнее скорость;
- уникальность дизайна должна идти от тёплого тёмного рабочего стола, аккуратных состояний, локального набора иконок, motion-токенов и понятной структуры, а не от случайных градиентов или декоративного fantasy-шума;
- current next plan step: `0.0.1.8.11` Migration Phase 5 core content; [UI_MIGRATION_BASELINES.md](./UI_MIGRATION_BASELINES.md) is now the comparison manifest for future UI migration patches.

## Source Documents

Read these before changing UI:

- [BRANDBOOK.md](../../00-product/BRANDBOOK.md) - product tone, Archive Hearth palette and visual boundaries.
- [UI_CSS_INVENTORY_REPORT.md](./UI_CSS_INVENTORY_REPORT.md) - current UI/CSS inventory, duplicate control families, popup/icon/color risks and migration map.
- [UI_MIGRATION_BASELINES.md](./UI_MIGRATION_BASELINES.md) - Phase 0 baseline manifest for UI, CSS, icon, popup and screenshot migration evidence.
- [UI_UX_COMPETITOR_REFERENCE_RESEARCH.md](./UI_UX_COMPETITOR_REFERENCE_RESEARCH.md) - reference-backed UX/UI patterns for each MyOwnWorld system.
- [UI_AUDIT_AND_MODERNIZATION_PLAN.md](./UI_AUDIT_AND_MODERNIZATION_PLAN.md) - phased UI modernization plan.
- `styles/design-tokens.css` - current token foundation and compatibility aliases.
- `styles/ui.css` - current primitive seeds.
- `styles/brand-system.css` - current compatibility skin; this file should shrink over time.
- `js/ui/popupManager.js` and `js/ui/popupPosition.js` - current popup lifecycle and viewport positioning foundation.
- `assets/icons/rpg-ui.svg` and `js/core/icons.js` - local icon sprite and icon helper foundation.

## Product Image

MyOwnWorld is a local-first worldbuilding OS for tabletop campaigns.

The UI should feel like:

- a dense professional desktop workbench for a GM;
- warm, dark and readable;
- calm during long preparation sessions;
- fast and predictable during live play;
- fantasy-flavored through restrained accents, not through decorative RPG menu chrome.

The UI should not feel like:

- a landing page;
- a SaaS marketing dashboard;
- a bright game launcher;
- a generated fantasy skin pasted over unrelated controls;
- separate applications for cards, map, graph and task tracker.

## Core Principles

1. No full-interface rewrite in one pass.
2. No separate mini design systems for map, graph, cards, properties or task tracker.
3. No visual restyle mixed with business-logic migration unless the plan item explicitly requires it.
4. No new local button, input, panel, popup or icon style when a shared primitive can cover the need.
5. Every visible UI change must name the user action it improves.
6. Every new visual value must use an existing semantic token or add a semantic token first.
7. Browser and Tauri behavior must keep working through each migration.
8. Map and graph performance matter more than decorative motion.
9. The local icon sprite remains the icon source of truth during version-1 redesign.
10. Any future exception must be documented in this contract or in the subsystem contract before code changes.

## AppShell Contract

Target AppShell zones:

| Zone | Purpose | Notes |
| --- | --- | --- |
| `app-root` | Owns global theme, density, font and app background. | No feature-specific layout here. |
| `nav-rail` | Primary workspace navigation and future global tools. Current content types stay in `Дерево` until a rail entry owns a distinct workflow. | Icon + tooltip or icon + short label. `Дерево` shows/hides the primary tree sidebar; profile/user entry belongs here, not inside the tree. Do not duplicate tree page types as rail tabs. |
| `title-context-bar` | Current workspace/card/scene context and frequent global actions. | Must stay quiet; rare actions go to command/search. |
| `primary-sidebar` | Tree, search and page navigation for the active workspace. | Dense, virtualized where needed. Feature-specific lists belong inside their owning workspace surfaces unless the rail entry is a real global tool. No-workspace state belongs inside the tree area as `Открыть папку`; root-level page creation belongs to the `Корень` row, not to the sidebar header. Do not repeat the product name or active mode label inside the tree sidebar. |
| `workspace` | Main editor, map canvas, graph canvas, task board or secondary screen. | The user's work is visually dominant here. |
| `right-panel` | Reserved secondary work panel for a future concrete tool or workflow. | Hidden by default. Do not auto-open it for selected pages, and do not use it as a decorative context/info panel. |
| `bottom-panel` | Diagnostics, logs, operation details, search results or history timeline. | Collapsible and non-modal. |
| `status-bar` | Workspace health, save/backup state, desktop/browser state, long operation status. | Short, stable, not a notification wall. |
| `overlay-layer` | Dialog, popover, dropdown, context menu, tooltip and toast portals. | One z-index and focus lifecycle model. |

Migration rule: map, graph, editor and task tracker may have feature-specific controls inside `workspace`, but they must not create their own global shell.

Future workspace-pane rule: `BI-025` tracks the possible model for up to 3 open work areas at once, such as card, campaign map and knowledge graph panes. This belongs to the `workspace` split model, not to the reserved `right-panel`, and must define persistence, focus order, resizing and mobile fallback before implementation.

## Token Contract

All new design-system tokens use the `--mow-*` namespace.

Existing `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--motion-*`, `--z-*`, `--bg`, `--panel`, `--border`, `--text`, `--accent` aliases may remain for compatibility while older CSS is migrated. Do not add new feature styles to the old namespaces unless the value is explicitly an alias.

### Token Layers

Use three layers:

| Layer | Example | Purpose |
| --- | --- | --- |
| Palette | `--mow-palette-umber-900` | Raw brand color or neutral ramp. Rarely used directly. |
| Semantic | `--mow-surface-panel`, `--mow-text-muted` | Shared UI meaning. Most CSS should use this layer. |
| Component/state | `--mow-button-bg-hover`, `--mow-map-token-selected-border` | Component-specific behavior when a semantic token is not enough. |

### Required Token Families

The `0.0.1.8.3` foundation defines or normalizes the first shared set from these families before broad migration:

| Family | Required examples |
| --- | --- |
| App | `--mow-app-bg`, `--mow-app-text`, `--mow-app-text-muted` |
| Surfaces | `--mow-surface-base`, `--mow-surface-panel`, `--mow-surface-raised`, `--mow-surface-overlay`, `--mow-surface-sunken`, `--mow-surface-embedded` |
| Text | `--mow-text-primary`, `--mow-text-secondary`, `--mow-text-muted`, `--mow-text-disabled`, `--mow-text-danger`, `--mow-text-warning` |
| Borders | `--mow-border-subtle`, `--mow-border-default`, `--mow-border-strong`, `--mow-border-focus`, `--mow-border-danger` |
| Focus | `--mow-focus-ring`, `--mow-focus-ring-offset`, `--mow-focus-shadow` |
| Accent | `--mow-accent-primary`, `--mow-accent-primary-hover`, `--mow-accent-secondary`, `--mow-accent-danger` |
| Controls | `--mow-control-bg`, `--mow-control-bg-hover`, `--mow-control-bg-active`, `--mow-control-bg-disabled`, `--mow-control-border`, `--mow-control-height-*` |
| Status | `--mow-status-success-*`, `--mow-status-warning-*`, `--mow-status-danger-*`, `--mow-status-info-*` |
| Elevation | `--mow-shadow-panel`, `--mow-shadow-overlay`, `--mow-shadow-floating`, `--mow-elevation-*` |
| Radius | `--mow-radius-xs`, `--mow-radius-sm`, `--mow-radius-md`, `--mow-radius-panel`, `--mow-radius-overlay` |
| Spacing | `--mow-space-1` through `--mow-space-8`, plus density-aware component gaps |
| Typography | `--mow-font-sans`, `--mow-font-mono`, `--mow-font-size-*`, `--mow-line-height-*`, `--mow-font-weight-*` |
| Motion | `--mow-motion-fast`, `--mow-motion-standard`, `--mow-motion-overlay`, `--mow-ease-standard`, `--mow-ease-emphasized` |
| Z-index | `--mow-z-base`, `--mow-z-sticky`, `--mow-z-dropdown`, `--mow-z-popover`, `--mow-z-modal`, `--mow-z-toast` |
| Blocks | `--mow-block-*`, `--mow-drop-indicator-*`, `--mow-selection-*` |
| Properties | `--mow-property-*`, `--mow-field-*` |
| Map | `--mow-map-canvas-*`, `--mow-map-control-*`, `--mow-map-overlay-*`, `--mow-map-selection-*`, `--mow-map-fog-*` |
| Graph | `--mow-graph-canvas-*`, `--mow-graph-node-*`, `--mow-graph-edge-*`, `--mow-graph-group-*`, `--mow-graph-hidden-*` |
| Tasks | `--mow-task-card-*`, `--mow-task-column-*`, `--mow-task-label-*` |
| Diagnostics | `--mow-health-*`, `--mow-backup-*`, `--mow-restore-*` |

### Valid Local Variables

Feature-state variables may remain local when they are real data state, not visual design drift:

- `--token-size`;
- `--token-rotation`;
- `--campaign-grid-color`;
- `--campaign-shape-fill`;
- Properties field sizing variables;
- graph layout coordinates;
- drag preview coordinates.

Local variables must not define new palette, shadows, radii, fonts or generic button/input styling.

## Theme And Density Model

The app uses the theme entry pattern implemented by `0.0.1.8.3`:

```text
body[data-theme][data-accent][data-bg][data-ui-scale]
```

Required model:

- `data-theme`: at minimum `dark`; future high-contrast variant belongs here.
- `data-accent`: warm brand accents; default must remain Candle Gold style, not system blue.
- `data-bg`: background mood/preset; must not change control semantics.
- `data-ui-scale`: compact/comfortable density; must not change saved content.

Theme changes must not rewrite user content, map data, graph data, task data or workspace schema.

## Typography, Spacing, Radius And Elevation

Typography:

- Use readable desktop UI sizes.
- Do not scale font size with viewport width.
- Do not use negative letter spacing.
- Use large headings only for true page/card titles, not compact panels.
- Use short labels inside controls and panels.

Spacing:

- Use the shared spacing scale.
- Dense work surfaces are allowed, but hit targets must remain usable.
- Stable controls need fixed or constrained dimensions so hover/focus/content changes do not resize the layout.

Radius:

- Default control and card radii should stay restrained.
- Larger radius is allowed only for overlays or existing brand surfaces that need it.
- Do not introduce round-card visual language for operational tools.

Elevation:

- Elevation is surface + border + shadow, not shadow alone.
- Large map/graph/canvas surfaces should avoid expensive blur and heavy shadows.
- Overlay elevation must clearly separate popups from panels without glowing decoration.

## Visual State Taxonomy

Every shared primitive must support the relevant states from this list:

- `default`;
- `hover`;
- `active`;
- `focus-visible`;
- `selected`;
- `pressed`;
- `disabled`;
- `readonly`;
- `invalid`;
- `danger`;
- `warning`;
- `success`;
- `linked`;
- `hidden`;
- `drag-target`;
- `loading`;
- `empty`;
- `error`.

State must not rely on color alone. Use at least one additional signal when meaning matters: icon, label, border, outline, weight, opacity, tooltip or layout position.

## Motion Contract

Motion exists to explain cause and effect. It must never delay input.

Allowed motion:

- button/icon-button press feedback;
- hover/focus transitions on controls;
- short overlay enter/exit;
- panel reveal/collapse;
- drag/drop placeholder feedback;
- selected token/node/block emphasis;
- operation progress.

Required motion tokens:

- `--mow-motion-press-duration`;
- `--mow-motion-hover-duration`;
- `--mow-motion-overlay-enter`;
- `--mow-motion-overlay-exit`;
- `--mow-motion-panel-reveal`;
- `--mow-motion-dnd-feedback`;
- `--mow-motion-canvas-feedback`;
- `--mow-motion-progress`.

Prohibited motion:

- long ambient loops in the app shell;
- animated gradient/orb backgrounds;
- transitions on map pan, zoom, fog redraw, token drag or graph pan/zoom;
- layout animations that make text jump while editing;
- hover states that resize toolbar buttons, tree rows or fixed-format controls;
- motion without `prefers-reduced-motion` fallback.

## Effect Contract

Effects must communicate product state or surface hierarchy.

Allowed effects:

- warm focus ring;
- dark elevation by surface token;
- sunken containers for repeated items;
- subtle selection outline;
- map fog/visibility veil when it represents GM/player state;
- graph edge emphasis and hidden-slice veil;
- health/status badges with semantic color and icon/label.

Allowed with extra caution:

- very subtle archival grain on passive app background only;
- low-opacity inset texture on non-text large panels.

Prohibited effects:

- heavy `backdrop-filter` on map stage, graph canvas or large scroll panes;
- decorative glowing borders on every card;
- one-off gradients per subsystem;
- generic glassmorphism stacked everywhere;
- fantasy ornament around controls;
- decorative fog outside map/presentation contexts;
- generated bitmap icons for UI commands.

## Iconography Contract

The local SVG sprite is the source of truth:

- `assets/icons/rpg-ui.svg`;
- `js/core/icons.js`;
- runtime icon helper foundation from `0.0.1.8.3`, then component-level icon primitives from `0.0.1.8.4`.

Rules:

1. Use sprite icons for command buttons where a symbol is clearer than text.
2. Keep icons stroke-like, optically centered and compatible with 16/20/24px sizes.
3. Use `currentColor` where possible.
4. Add tooltips or labels for icon-only buttons whose meaning is not obvious.
5. Do not mix sprite icons, random inline SVG, emojis, text glyphs and external icon packages in one control family.
6. Do not import icon CDN/packages for version-1 redesign without a separate contract update.
7. Custom MyOwnWorld icons are allowed for TTRPG concepts when common icons are ambiguous: scene, token, fog, layer, ruler, initiative, presentation, player view, relation, timeline, faction, source, local copy.

## Shared Primitive Contract

Allowed shared primitives:

| Primitive | Required states/behavior |
| --- | --- |
| `Button` | primary, secondary, ghost, danger, disabled, loading, focus-visible |
| `IconButton` | size, tooltip, pressed, danger, disabled, focus-visible |
| `Input` | default, focus, disabled, readonly, invalid, compact/comfortable |
| `Textarea` | same as input, plus resize rules |
| `Select` | focus, disabled, invalid, keyboard behavior |
| `SegmentedControl` | selected, hover, focus, disabled |
| `Checkbox` | checked, unchecked, indeterminate, disabled, focus |
| `Switch` | on, off, disabled, focus |
| `Slider` | value, range, disabled, focus |
| `Badge` | neutral, info, success, warning, danger |
| `Tabs` | selected, focus, keyboard navigation |
| `Separator` | horizontal/vertical, subtle/default |
| `ScrollArea` | stable scrollbars, no layout jump |
| `Toolbar` | icon groups, separators, overflow, compact density |
| `Panel` | base, raised, sunken, overlay, embedded |
| `Card` | repeated item card, selected, drag, disabled |

Migration rule: introduce a primitive only when at least two real consumers need it or the current one-off implementation is blocking safe migration.

## Overlay Contract

Allowed overlay primitives:

- `Dialog`;
- `Popover`;
- `DropdownMenu`;
- `ContextMenu`;
- `Tooltip`;
- `Toast`;
- `CommandPalette`;
- `FloatingToolbar`.

Overlay rules:

1. Use one layer/z-index model.
2. Use shared viewport-safe positioning.
3. Modal dialogs must trap focus and return focus on close.
4. Non-modal popovers/menus must define Escape, outside click and repeated-trigger behavior.
5. Keyboard navigation and ARIA roles are required for new menu/dialog work.
6. Draggable free-space popups may remain only when the workflow benefits from repositioning.
7. Do not create a new popup controller when `popupManager` and future overlay primitives can cover the case.
8. Overlay animation must use state-driven classes/attributes, not feature-specific one-off keyframes.

## System Ownership Boundaries

### AppShell

Owns: global layout zones, density/theme attributes, top-level navigation, status bar, reserved right-panel slots and bottom panel slots.

Must not own: feature business logic, map canvas state, graph layout logic, editor block persistence.

### Sidebar, Tree And Search

Owns: tree rows, active page state, duplicate/warning/link states, search results, context menu composition.

Use: virtualized rows, shared row states, shared context menu.

### Card Editor And Blocks

Owns: document surface, block frames, block handles, inline toolbar, selection toolbar, insert menu, drop indicators.

Use: persistent content stays separate from runtime controls.

### Properties And Sheets

Owns: field rows, field grid, lock/readonly/computed/invalid states, field resize handles, sheet sections.

Use: structured metadata attached to cards; avoid making the grid louder than content.

### Campaign Map

Owns: map toolbar, mode buttons, action groups, layer list, token dock, token inspector, fog controls, presentation status.

Use: mode/action split, compact controls, no heavy stage effects, no business-logic changes during visual migration.

### Knowledge Graph

Owns: graph toolbar, canvas controls, node cards, edges, groups, filters, hidden-slice state, graph inspector.

Use: same canvas-control language as map where possible; do not bypass page lifecycle.

### Task Tracker

Owns: board toolbar, columns, task cards, checklists, labels, drag previews, empty states.

Use: shared card/badge/checkbox primitives.

### Rules And Compendium

Owns: reference entries, source badges, search results, import preview, local-copy state.

Use: same tree/search/card patterns; no second navigation system.

### Settings, Backups, Recovery And Diagnostics

Owns: settings sections, diagnostics panels, health badges, backup manifest cards, restore preview, asset verification rows, operation progress and danger zones.

Use: clear preview/restore/irreversible states; no tiny hidden data-safety affordances.

## Migration Gates

Before any UI migration patch:

1. Name the exact user action that becomes easier.
2. Name the owner surface: AppShell, tree, editor, properties, map, graph, task tracker, rules or diagnostics.
3. Check [UI_CSS_INVENTORY_REPORT.md](./UI_CSS_INVENTORY_REPORT.md) for duplicate families and current risk.
4. Check [UI_UX_COMPETITOR_REFERENCE_RESEARCH.md](./UI_UX_COMPETITOR_REFERENCE_RESEARCH.md) for the system reference pattern.
5. Use an existing semantic token or add a semantic token first.
6. Use an allowed shared primitive or explain why a new primitive is necessary.
7. Do not mix visual migration with business logic unless the plan item says so.
8. Do not remove old compatibility aliases until the migrated consumers are verified.
9. Add or update tests appropriate to the surface.
10. Update docs/work log without claiming a higher readiness level than proven.

## Test Expectations

Docs-only contract changes:

- `node tools/docs_index.mjs`;
- `npm run check:encoding`.

Token/theme CSS foundation changes:

- `node --check` for changed JS, if any;
- `npm run verify`;
- focused browser smoke if loaded CSS/runtime changes.

Primitive/overlay changes:

- unit or browser test for state behavior;
- popup lifecycle browser coverage when overlay behavior changes;
- keyboard/focus checks.

Map changes:

- focused map browser smoke;
- performance smoke when stage, fog, token rendering, pan/zoom or layer rendering changes.

Graph changes:

- focused graph browser smoke;
- model/performance tests when graph canvas slicing or lifecycle changes.

Release/user-visible UI changes:

- release notes/tester instructions if the user workflow changes;
- manual update only when the human-facing workflow/documentation scope changes materially.

## Prohibited Patterns

- Full visual redesign in one large patch.
- New feature-specific design systems.
- New hardcoded palette values for ordinary UI.
- System-blue focus, checkbox, select or active accents.
- New local button/input/select/popup/menu styles when shared primitives exist.
- CDN fonts, icon packages or remote visual dependencies without contract update.
- Cards inside cards for page sections.
- Decorative orbs, gradient blobs, bokeh backgrounds or generic AI glass panels.
- Heavy blur on map, graph or large scrolling panes.
- Text that overflows buttons, cards, popups or compact panels.
- Icon-only destructive actions without label/tooltip/confirmation.
- UI screenshots/assets copied from competitors.
- Generated fantasy bitmap icons for ordinary controls.

## Acceptance Criteria For `0.0.1.8.2`

This contract satisfies `0.0.1.8.2` when it:

- defines product image and anti-patterns;
- defines AppShell/workbench zones;
- defines token layers and required token families;
- defines theme, density, typography, spacing, radii, elevation and z-index expectations;
- defines motion, effects and iconography rules;
- lists allowed shared primitives and overlay primitives;
- defines accessibility and state expectations;
- sets ownership boundaries for editor, properties, map, graph, task tracker and secondary screens;
- sets migration gates and test expectations;
- keeps broad visual migration out of the contract task and points runtime implementation to later plan items.

## Runtime Foundation Status

`0.0.1.8.3` implemented the first runtime foundation:

- normalize semantic tokens in `styles/design-tokens.css`;
- keep compatibility aliases;
- define theme/density attributes;
- add icon wrapper foundation;
- add reduced-motion handling;
- do not migrate the whole app.

## Component Catalogue Status

`0.0.1.8.4` added the first visible primitive reference surface:

- shared `.mow-button` examples for primary, secondary, ghost, danger, disabled, pressed and loading states;
- shared `.mow-input` examples for default, readonly, invalid and disabled states;
- shared `.mow-panel` raised, sunken and embedded surface examples;
- shared `.mow-popover` anatomy using the existing popup lifecycle, Escape close and state-driven overlay motion.

## AppShell Foundation Status

`0.0.1.8.5` added the first visible AppShell foundation:

- semantic shell markers for the current title/context bar, primary sidebar, workspace and status bar;
- an empty-workspace start surface with one clear action card instead of internal workspace/inspector/diagnostics demo zones;
- local sprite icons for the start-surface actions;
- responsive coverage for the narrow viewport version of the start surface.

This is not the final global AppShell migration. It is the safe surface that later migration phases should use as the first reference, but it should stay understandable to a human user.

## Migration Baseline Status

`0.0.1.8.6` added the Phase 0 migration baseline layer:

- `UI_MIGRATION_BASELINES.md` records current UI, CSS, icon, popup and screenshot ownership by system;
- `tests/browser/visual-regression.spec.mjs` attaches current screenshots for shell, tree, editor, Properties, map, graph, task tracker and shared popover surfaces;
- `tests/uiMigrationBaselines.test.mjs` keeps the manifest synchronized with the visual smoke attachment names.

This is not a visual migration. It is the evidence layer future migration phases must update intentionally.

## AppShell Foundation Status

`0.0.1.8.7` applied the Phase 1 foundation layer to app-level shell surfaces:

- added semantic `--mow-shell-*` tokens for app layout, sidebar width, topbar/statusbar height, shell gutter/padding, panel surface, divider, elevation, title, control and statusbar states;
- moved the current `.app`, `.app-topbar`, `.sidebar`, `.editor`, `.statusbar` and empty-workbench start styling toward those tokens without changing feature business logic;
- added `data-ui-foundation="0.0.1.8.7"` to the root app shell so the runtime foundation version is inspectable;
- extended `tests/browser/app-shell.spec.mjs` to guard the foundation marker, semantic shell token application and compact density behavior.

This is still Foundation readiness. It gives later migration phases a shared shell language; it does not migrate every primitive, overlay, map, graph or content surface yet.

## Primitive Migration Phase 2 Status

`0.0.1.8.8` broadened the shared primitive layer:

- added component tokens for IconButton, Select, Checkbox, SegmentedControl, Toolbar and Separator in `styles/design-tokens.css`;
- expanded `styles/ui.css` with `.mow-icon-button`, `.mow-select`, `.mow-checkbox`, `.mow-segmented`, `.mow-toolbar` and `.mow-separator`;
- extended `Tools -> Компоненты` so the component catalogue shows Button, IconButton, Field, Toolbar, Panel and Popover states;
- migrated the app Tools popup actions to shared `.mow-button` as the first real topbar consumer beyond the catalogue.

The same slice also started the `0.0.1.8.9` overlay foundation by adding `data-overlay-kind`, `data-overlay-lifecycle` and `data-overlay-state` synchronization through `popupManager` for topbar/component catalogue popovers. This is not the full overlay migration yet.

## Overlay Migration Phase 3 Status

The first 2026-07-21 `0.0.1.8.9` follow-up added the first shared modal focus lifecycle:

- `popupManager` now writes `data-overlay-modal` in addition to `data-overlay-kind`, `data-overlay-lifecycle` and `data-overlay-state`;
- registered modal popups receive dialog defaults (`role="dialog"`, `aria-modal="true"` and focusable container fallback);
- modal open moves focus to the first focusable control or explicit autofocus target;
- Tab and Shift+Tab stay inside the topmost open modal popup;
- close returns focus to the opener/anchor when possible;
- `tests/browser/popup-lifecycle.spec.mjs` covers focus trap, focus return and modal overlay markers.

The same follow-up fixed and guarded the empty-workspace AppShell start screen so starter actions no longer collapse into unreadable narrow cells.

The next 2026-07-21 `0.0.1.8.9` follow-up added shared dropdown/context-menu keyboard lifecycle:

- `registerPopup({ kind: 'dropdown-menu' })` and `registerPopup({ kind: 'context-menu' })` now opt into explicit overlay kinds;
- menu-like popups get shared menu defaults, disabled-item skipping, initial menu focus, ArrowUp/ArrowDown wrapping, Home/End jumps, Enter/Space activation and focus return when possible;
- create menu, tree context menu and wiki create menu are the first real consumers;
- `tests/browser/popup-lifecycle.spec.mjs` covers the shared menu lifecycle and the real create-menu keyboard path.

The next 2026-07-21 `0.0.1.8.9` follow-up simplified the empty-workspace start screen and added the first tooltip/toast foundation:

- the empty-workspace surface is now one clear action card instead of an internal AppShell demo grid with `Workspace`, `Context` and `Diagnostics` sections;
- the removed sections were architectural placeholders and did not help the user create the first object;
- icon-only shell controls expose shared `data-tooltip` styling while keeping `title` and `aria-label`;
- operation progress exposes toast overlay markers and uses the shared toast z-index/surface language;
- `tests/browser/app-shell.spec.mjs` covers the simplified start screen, first tooltip consumers and operation-progress toast state.

The next 2026-07-21 `0.0.1.8.9` follow-up moved the first editor feature popups onto explicit overlay semantics:

- `blockPopup`, `linkPopup`, `property-settings-popup` and `image-crop-popup` register as dialog overlays with shared modal markers, focus behavior and state synchronization;
- `toolbarColorPopup` registers as a non-modal popover overlay while keeping the existing precise toolbar positioning;
- direct close buttons now route through the popup controller path where needed so `data-overlay-state` does not get stale;
- `tests/browser/popup-lifecycle.spec.mjs` covers these real editor popup paths.

The next 2026-07-21 `0.0.1.8.9` follow-up moved the generic campaign map popup family onto the same overlay base:

- `campaignMapPopupController` registers `#campaignMapPopup` as a modal dialog overlay with shared modal markers, focus behavior and state synchronization;
- map popup close/toggle paths now go through the controller path so `data-overlay-state`, `data-popup-open` and focus return do not drift;
- `styles/campaign-map-popups.css` now uses shared overlay/control tokens for the generic popup surface, spacing, buttons, range accent, picker/search input and focus states;
- `tests/browser/popup-lifecycle.spec.mjs`, `campaign-map-ui`, `campaign-map-initiative` and visual regression cover the slice.

The closing 2026-07-21 `0.0.1.8.9` follow-up completed the overlay migration step:

- campaign map token hover/actions popup now registers as a non-modal popover while keeping delayed hover behavior local;
- item-set picker and onboarding help popup now use registered popup controllers instead of direct open paths;
- Knowledge Graph node actions and connect-details overlays now expose shared `data-overlay-*` lifecycle state;
- `popupManager` has a static `controller.open()` path for fixed-position overlays;
- campaign token, item picker, onboarding and Knowledge Graph overlay base styles now consume shared overlay/control tokens;
- `tests/browser/popup-lifecycle.spec.mjs` and `tests/browser/knowledge-graph.spec.mjs` cover the closing consumers.

`0.0.1.8.9` is closed.

## AppShell Migration Phase 4 Status

`0.0.1.8.10` migrated the real top-level shell surfaces. `0.0.1.8.10.2`-`0.0.1.8.10.4` correct the rail/sidebar model after user review so it does not duplicate tree content or tree context labels:

- `.app` now exposes `data-app-shell-migration="0.0.1.8.10"` and runtime state for active shell mode, sidebar state and reserved right-panel state.
- A `nav-rail` AppShell zone exists, but its current content navigation entry is only `Дерево`. That same rail button shows/hides the primary tree sidebar; content types such as cards, maps, task trackers, rule trees and knowledge graphs remain visible through the world tree and create flows.
- The profile/user entry lives in the rail. The primary sidebar shows the intact world tree and tree search without repeating `MyWorld` / `Дерево мира`.
- The primary sidebar must not be replaced by repository-backed content-type lists unless a future rail tool owns a distinct workflow that is not already available in `Дерево`.
- Tree-panel visibility and resizing are AppShell-owned, keyboard-accessible and clamped through `--mow-shell-sidebar-*` tokens.
- `0.0.1.8.11.1` removed the old page-info right inspector. The reserved `right-panel` slot stays hidden during normal page selection and can be opened only by an explicit future workflow.
- `0.0.1.8.11.2` migrates the first editor block interaction slice: block DnD must use pointer-controlled preview/placeholder feedback rather than browser-native drag ghosts, and the first-level Add block picker must use local sprite icons plus tokenized focus/spacing/surface rules.
- `0.0.1.8.11.3` migrates the card editor header/runtime-control slice: page navigation uses local sprite icons and accessible labels, card type/tags/aliases/image controls use shared tokens, and the floating text toolbar must live in the overlay layer with enough selection gap to avoid title overlap.
- The separate diagnostics/history bottom panel was not added as a decorative placeholder. It remains a secondary-screens migration target where it can attach to real diagnostics, backup, recovery and history data.

`0.0.1.8.10` is closed. `0.0.1.8.11` Migration Phase 5 core content is active; tree/search, block DnD, first-level Add block picker and card editor header/toolbar controls have migrated slices, while Properties, templates, deeper search and command palette remain active.
