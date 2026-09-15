---
summary: "Current UI token, primitive, AppShell and interaction ownership contract."
read_when:
  - "When changing UI tokens, shared controls, AppShell boundaries or accepted interaction behavior"
owner_zone: "architecture"
---

# Design System Contract

Current normative contract. Original contract-task readiness and dated rollout evidence are kept in the linked migration history.

## Purpose

This contract defines how MyOwnWorld UI is allowed to grow during the version-1 redesign. It exists so the app becomes one coherent GM workbench instead of a set of unrelated feature skins.

The contract is intentionally strict. Future UI work must use shared tokens, shared primitives, shared overlay behavior and the same AppShell model unless a task explicitly updates this contract first.

Runtime changes must follow these rules; the active project plan owns implementation status and future scope.

## Коротко Для Владельца

Этот контракт фиксирует, каким должен быть новый UI MyOwnWorld:

- один рабочий стол мастера, а не отдельные интерфейсы для карты, графа, карточек и задач;
- сначала токены и primitives, потом визуальная миграция;
- все кнопки, поля, popup, меню, панели, toolbar и иконки должны постепенно прийти к общим правилам;
- карта и граф не получают тяжёлые blur/анимации, потому что там важнее скорость;
- уникальность дизайна должна идти от тёплого тёмного рабочего стола, аккуратных состояний, локального набора иконок, motion-токенов и понятной структуры, а не от случайных градиентов или декоративного fantasy-шума;
- current design status: `0.0.1.8.18` is closed by explicit owner waiver on 2026-08-10. The independent Visual Critic FAIL from `0.0.1.8.18.6` remains historical evidence and future polish debt, and the waiver permits continued product work without claiming that every finding was fixed. The active roadmap is [PROJECT_PLAN.md](../../01-delivery/PROJECT_PLAN.md).

## Source Documents

Choose only the sources needed for the UI boundary being changed; this is not a pre-read checklist:

- [BRANDBOOK.md](../../00-product/BRANDBOOK.md) - when changing product visual direction or palette.
- [UI_CSS_INVENTORY_REPORT.md](./UI_CSS_INVENTORY_REPORT.md) - the relevant surface when planning a shared-control migration or investigating duplicate families.
- [UI_MIGRATION_BASELINES.md](./UI_MIGRATION_BASELINES.md) - when comparing migration or screenshot evidence.
- [UI_UX_COMPETITOR_REFERENCE_RESEARCH.md](./UI_UX_COMPETITOR_REFERENCE_RESEARCH.md) - the relevant pattern when the task explicitly needs design research.
- [PROJECT_PLAN.md](../../01-delivery/PROJECT_PLAN.md) - current leaf when selecting/closing roadmap work or task state is missing.
- `styles/design-tokens.css` - token/theme changes and compatibility aliases.
- `styles/ui.css` - shared primitive changes.
- `styles/brand-system.css` - compatibility skin changes; this file should shrink over time.
- `js/ui/popupManager.js` and `js/ui/popupPosition.js` - popup lifecycle or positioning changes.
- `assets/icons/rpg-ui.svg` and `js/core/icons.js` - icon changes.

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
| Surfaces | `--mow-surface-base`, `--mow-surface-panel`, `--mow-surface-raised`, `--mow-surface-overlay`, `--mow-surface-overlay-opaque`, `--mow-surface-sunken`, `--mow-surface-embedded` |
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

`0.0.1.10.24` token correction: Settings text and inputs may consume `--mow-line-height-normal` and `--mow-input-color` as shared semantic tokens. Character Sheet is an intentional light paper component inside the dark workbench, so its used paper/ink/line/danger roles belong to the compact `--mow-character-sheet-*` component token family in `styles/design-tokens.css`. Do not reintroduce a local `--sheet-*` palette in `styles/block-character-sheet.css`; unused sheet palette entries should be removed instead of promoted to shared tokens.

`0.0.1.10.28` token/layer guard: `npm run ui:polish:audit` runs a focused static guard over the command palette, Settings/topbar and card type menu CSS. Those surfaces must not reference undefined `--mow-*` tokens without a deliberate fallback, and overlay layering must use the shared `--mow-z-dropdown`, `--mow-z-popover`, `--mow-z-modal` or `--mow-z-toast` tokens instead of hard-coded extreme numeric z-index values.

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

- `data-theme`: `dark` and `contrast`. `contrast` strengthens text, borders and workbench surfaces without changing saved content, workspace schema or the selected background mood.
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

`0.0.1.8.18.5` correction: generic popup geometry belongs to `js/ui/popupPosition.js`. The shared positioning layer may clamp a popup to the viewport and, for an existing use case, avoid one visible element or rectangle supplied by the feature owner. Feature controllers must not duplicate generic rectangle overlap, visible-element geometry or clamp helpers just to position a popup. Campaign Map may pass its current Inspector as the avoid target, but it does not own the collision math.

## System Ownership Boundaries

### AppShell

Owns: global layout zones, density/theme attributes, top-level navigation, status bar, reserved right-panel slots and bottom panel slots.

Must not own: feature business logic, map canvas state, graph layout logic, editor block persistence.

### Sidebar, Tree And Search

Owns: tree rows, active page state, duplicate/warning/link states, search results, context menu composition.

Use: virtualized rows, shared row states, shared context menu.

`0.0.1.8.18.4` correction: the world tree is a real Russian-language desktop tree contract, not ARIA-only markup. `#tree` uses `aria-label="Дерево мира"`; every page row is the roving `role="treeitem"` focus target with a meaningful Russian accessible name, `aria-level`, current `aria-expanded` for parents and `aria-current="page"` for the active page. ArrowDown/ArrowUp move through visible rows, ArrowRight expands collapsed parents or enters the first visible child, ArrowLeft collapses expanded parents or returns to the visible parent, Home/End jump to visible boundaries, and Enter opens the focused page. Leaf toggles stay out of the focus model; row actions remain reachable from the current roving row and keep Russian accessible names. Keyboard navigation must not start pointer-DnD, and virtualized rows must preserve boundary focus behavior.

### Card Editor And Blocks

Owns: document surface, block frames, block handles, inline toolbar, selection toolbar, insert menu, drop indicators.

Use: persistent content stays separate from runtime controls.

### Properties And Sheets

Owns: field rows, field grid, lock/readonly/computed/invalid states, field resize handles, sheet sections.

Use: structured metadata attached to cards; avoid making the grid louder than content.

`0.0.1.10.22` ownership correction: `propertyLayoutModel.js` owns pure layout overlap and collision-resolution decisions. `propertiesSettingsPopup.js` remains the UI/orchestration owner for popup controls, drag/resize pointer events, placeholder/ghost DOM and applying resolved layout data back to fields. Do not change persisted `data-property-layout` schema when maintaining this boundary.

### Campaign Map

Owns: map toolbar, mode buttons, action groups, layer list, object property Inspector, fog controls, presentation status.

Use: mode/action split, compact controls, no heavy stage effects, no business-logic changes during visual migration.

`0.0.1.8.18.5` correction: Campaign Map popup controllers own only map-specific context, such as "the active object Inspector should be avoided." The shared popup positioning layer owns viewport fit, overlap detection and alternate placement for that avoid target. Map popup styling and map workflows must stay unchanged when this ownership boundary is maintained.

`0.0.1.8.18.6` gate: visual owner evidence was reviewed by an independent read-only critic sub-agent using the six required surfaces, `1440x900` and `1280x720` viewports, and the owner scorecard. All six final surfaces failed, so the gate correctly stopped for owner review instead of continuing indefinite polishing. On 2026-08-10 the owner accepted the current design for this stage; unresolved critic findings remain future polish debt. Knowledge Graph concept concerns from this gate stay `DEFERRED TO BI-026`.

### Knowledge Graph

Owns: graph toolbar, canvas controls, node cards, edges, groups, filters, hidden-slice state, graph inspector.

Use: same canvas-control language as map where possible; do not bypass page lifecycle.

`0.0.1.8.13.1` starts the graph migration at hidden-slice clarity level: graph status must say `показано X из Y`, visible/total/hidden counters must be present near filters, hidden reasons must distinguish filter, standard-slice and canvas-limit states, and graph node cards should use compact domain markers/icons without turning the canvas into a bright whiteboard.

`0.0.1.8.13.2` adds the selected-node foundation: graph selection must change edge/node states visibly (`active`, `related`, `muted`) and the graph inspector must stay inside the Knowledge Graph workbench, not the global AppShell right panel. The inspector uses the same compact dock/stat language as the map inspectors: small local icons, thin colored markers, readable incoming/outgoing counts, relationship rows and direct actions. It must not cover the canvas in a way that blocks node drag/right-click.

`0.0.1.8.13.3` adds the overlay visual cleanup foundation: the graph node context menu and connection-details popup must use the shared popup lifecycle, dark editor-grade surfaces, local sprite icons, clear grouped actions and compact editable fields. Relationship rows must fit common three-link cases without clipped text or visible internal scrollbars. These overlays are graph workbench tools, not a replacement for the reserved global right-panel slot.

`0.0.1.8.13.4` corrects the graph visual density: the first layer must prefer short status chips, meters, icons and selection states over permanent explanatory copy and numeric cards. Detailed counts and relationship metadata may live in `aria-label`, `title`, linked pages or an explicitly expanded editor, but should not fill the canvas by default.

`0.0.1.8.13.5` starts the graph maintainability split on the CSS side: graph base canvas styles, slice state, selected-node inspector and node/connect overlays must stay in their owning CSS files instead of returning to one `knowledge-graph.css` monolith. This does not close the `BI-017` JavaScript split or the `BI-018` lifecycle bridge.

`0.0.1.8.13.6` starts the graph maintainability split on the JavaScript side: selected-node inspector rendering/update helpers, graph node icon mapping and relationship labels/editable type options must stay in their owning JS modules instead of drifting back into `knowledgeGraphPage.js`. This does not close the remaining canvas renderer/actions/context-menu split or the `BI-018` lifecycle bridge.

`0.0.1.8.13.7` continues the graph JavaScript ownership split: graph filterbar controls, readable view presets, slice-meter helpers, hidden-reason labels and layout-button HTML must stay in `knowledgeGraphCanvasControls.js`. The page module may pass in page-title lookup, but the controls module must not read global `state` or mutate graph persistence.

`0.0.1.8.13.8` continues the graph JavaScript ownership split: graph canvas visible-node fallback, empty state, SVG edge/label HTML and node-card HTML must stay in `knowledgeGraphCanvasRenderer.js`. The renderer module may consume the canvas model, connect state, local icon mapping and relationship labels, but it must not read global `state`, register events or mutate graph persistence.

`0.0.1.8.13.9` continues the graph JavaScript ownership split: runtime filter reads, layout/filter/slice actions and zoom/fit toolbar actions must stay in `knowledgeGraphCanvasActions.js`. The actions module may receive render/transform callbacks from the page layer, but it must not read global `state`, register DOM listeners, edit relationships or write graph view-state persistence.

`0.0.1.8.13.10` continues the graph JavaScript ownership split: connect-state reads, node/connect popup controller registration, node-menu show/hide, node-menu actions and connect-popup actions must stay in `knowledgeGraphCanvasOverlays.js`. The overlays module may receive page opening, relationship creation, render and view-state callbacks from the page layer, but it must not import global `state`, register page-level event listeners or write graph persistence directly.

`0.0.1.8.13.11` closes the Phase 7 graph migration: relationship/context-menu HTML must stay in `knowledgeGraphRelationshipMenu.js`, graph view-state script helpers must stay in `knowledgeGraphViewState.js`, and manual relationship persistence must stay behind `knowledgeGraphCommandBridge.js` using `PageRecord`, `PageCommandService` command events and the write queue. `knowledgeGraphPage.js` remains the coordinator for graph events/history/drag/pan/selection/page lookup, not the owner of every graph menu or persistence write.

`0.0.1.10.21` updates the graph ownership boundary: canvas history state, history button enablement and Ctrl/Cmd+Z/Y shortcut handling must stay in `knowledgeGraphCanvasHistory.js`. The page coordinator may pass explicit callbacks for graph-specific entry application, focus restoration and status messages, but it should not re-own the undo/redo stacks or shortcut contract.

`0.0.1.10.23` corrects the graph icon-only control structure: toolbar, filterbar, inspector, node-menu, relationship-menu, connect-popup and slice-note icon actions must render as real icon-only buttons with an icon, Russian `aria-label` / `title` names and the shared `.mow-icon-button` contract where the touched control is icon-only. Do not render old visible text spans and hide them with `font-size: 0`, transparent text, offscreen menu-label CSS or local dimension tricks. The canvas scale indicator remains visible text and keeps its accessible name synchronized with the displayed scale.

### Task Tracker

Owns: board toolbar, columns, task cards, checklists, labels, drag previews, empty states.

Use: shared card/badge/checkbox primitives.

`0.0.1.8.18.3` correction: Task Tracker icon-only actions must be rendered structurally as icon-only controls using the shared `.mow-icon-button` contract while keeping the existing task action selector classes for behavior. Do not render old text spans and hide them with CSS. Board stats are meaningful dynamic values and must remain visible/readable, not hidden with `font-size: 0`. Empty column state should stay visually quiet, but keep an accessible status name.

### Rules And Compendium

Owns: reference entries, source badges, search results, import preview, local-copy state.

Use: same tree/search/card patterns; no second navigation system.

### Settings, Backups, Recovery And Diagnostics

Owns: settings sections, diagnostics panels, health badges, backup manifest cards, restore preview, asset verification rows, operation progress and danger zones.

Use: clear preview/restore/irreversible states; no tiny hidden data-safety affordances.

`0.0.1.8.14.2` baseline: the topbar Settings popup exposes `data-settings-ui-migration="0.0.1.8.14.2"`. Existing appearance, backup, asset health and workspace diagnostics panels must render as `[data-settings-section]` children inside `.app-settings-body`; health, backup, restore, asset verification and danger states should keep explicit data markers instead of relying only on free-form text.

### Help, Support And Release Handoff

Owns: Tools help routes, embedded help/onboarding guide, support cards, release-check cards, visual support status chips and honest status for secondary workflows that are either ready, MVP-limited or still planned.

Use: short route labels, local sprite icons, honest status markers and direct references to real existing surfaces. Do not turn Help into a marketing page, and do not present import/export or release tooling as usable when only model/storage foundations exist.

`0.0.1.8.14.3` baseline: the Tools popup exposes `data-tools-ui-migration="0.0.1.8.14.3"` for compact help route rows, and the Help popup exposes `data-help-ui-migration="0.0.1.8.14.3"`. Internal help tabs must use `[data-help-route]`; support/release status chips must use `[data-help-status]`; cards must use `[data-help-card-state]`. After `0.0.1.8.14.7`, import/export status should point to the World Package page/rulePackage/asset payload flow and avoid describing completed asset payload copy as future work.

### World Package Manager

Owns: World Package export, saved package library, external JSON import preview, page/rulePackage/asset payload import apply, backup requirement, conflict handling and asset preflight blockers.

Use: a single compact dialog surface with clear source/target language, preview before write, local sprite icons, status chips and destructive delete controls that stay secondary to preview/apply. Do not expose a package import path that writes workspace data without first showing preview and creating a backup.

`0.0.1.8.14.7` baseline: Tools exposes `[data-world-package-tool-action]`, and the manager exposes `#worldPackagePopup[data-world-package-ui-migration="0.0.1.8.14.7"]`. Sections must use `[data-world-package-section]`, preview state must use `[data-world-package-preview]`, apply readiness must use `[data-world-package-apply-state]`, saved package rows must use `[data-world-package-file]`, and conflict choices must use `[data-world-package-resolution]` plus `[data-world-package-conflict-mode]`. Conflict modes are non-destructive: block, skip new-only import, or copy conflicts with unique ids/titles. Embedded rulePackages may apply into `rule-packages/` without overwriting existing files. Required missing asset references block apply only when neither target workspace nor package payload can provide the file; optional missing references warn. Asset payloads write through the shared storage adapter after backup, never overwrite existing files, and copied asset paths rewrite imported page references before sanitization.

## Migration Gates

Before any UI migration patch:

1. Name the exact user action that becomes easier.
2. Name the owner surface: AppShell, tree, editor, properties, map, graph, task tracker, rules or diagnostics.
3. Check the relevant surface in [UI_CSS_INVENTORY_REPORT.md](./UI_CSS_INVENTORY_REPORT.md) when migrating shared control families.
4. Check the relevant pattern in [UI_UX_COMPETITOR_REFERENCE_RESEARCH.md](./UI_UX_COMPETITOR_REFERENCE_RESEARCH.md) when the migration includes design research.
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

## Current AppShell And Editor Interaction Details

These adopted details remain active. Shared modal/menu focus, overlay markers and controller ownership follow [POPUP_LIFECYCLE_CONTRACT.md](../contracts/POPUP_LIFECYCLE_CONTRACT.md); do not infer current behavior from the sequence of migration steps.

- `.app` now exposes `data-app-shell-migration="0.0.1.8.10"` and runtime state for active shell mode, sidebar state and reserved right-panel state.
- A `nav-rail` AppShell zone exists, but its current content navigation entry is only `Дерево`. That same rail button shows/hides the primary tree sidebar; content types such as cards, maps, task trackers, rule trees and knowledge graphs remain visible through the world tree and create flows.
- The profile/user entry lives in the rail. The primary sidebar shows the intact world tree and tree search without repeating `MyWorld` / `Дерево мира`.
- The primary sidebar must not be replaced by repository-backed content-type lists unless a future rail tool owns a distinct workflow that is not already available in `Дерево`.
- Tree-panel visibility and resizing are AppShell-owned, keyboard-accessible and clamped through `--mow-shell-sidebar-*` tokens.
- `0.0.1.8.11.1` removed the old page-info right inspector. The reserved `right-panel` slot stays hidden during normal page selection and can be opened only by an explicit future workflow.
- block DnD must use pointer-controlled preview/placeholder feedback rather than browser-native drag ghosts, and the first-level Add block picker must use local sprite icons plus tokenized focus/spacing/surface rules.
- page navigation uses local sprite icons and accessible labels, card type/tags/aliases/image controls use shared tokens, and the floating text toolbar must live in the overlay layer with enough selection gap to avoid title overlap.
- the visible custom picker is a select-only combobox/listbox, not a command menu. DOM focus remains on `.card-type-trigger`; the popup options are tracked with `aria-activedescendant`; Escape cancels without changing type; Enter/Space commit the active option; and the listbox belongs to the shared `popupManager` popover layer for viewport placement and z-order.
- Properties blocks expose `data-property-ui-migration="0.0.1.8.11.4"`, fields get semantic `data-property-variant`, `data-property-state` and `data-property-kind-icon` markers, visible field badges are runtime-only local sprite icons, and compact character/creature layouts must avoid skill/death-save overlap.
- ordinary `.template-block[data-block-type]` surfaces use `--mow-block-*` tokens, thin type markers and runtime-only `.block-kind-badge` icons/labels; block-specific content may stay specialized, but the outer editor block frame must not introduce another local card style.
- native selects inside card blocks must use `--mow-select-*` tokens, dark option colors, custom arrow styling and warm focus states; saved page templates must be reachable from the existing create menu through the shared popup lifecycle, local sprite icons and human-readable metadata.
- the rail may expose `Поиск и команды` as a real global tool, but it must not become a content-type tab or tree filter. The command palette must use `popupManager` modal lifecycle, local sprite icons, tokenized command/result rows, `PageRepository` search metadata, `Ctrl+K`, and existing app action hooks rather than a parallel command registry until command complexity proves that registry necessary.
- `.campaign-map-controls[data-map-ui-migration="0.0.1.8.12.8"]` must be an accessible toolbar with semantic action groups for creation, scene/view, map tools and live-session actions, but the visible surface should be a thin Photoshop-like icon-only strip with compact separators, no visible button text and no oversized section labels. It must keep existing action selectors, use local sprite icons, shared control/map tokens, hover/focus tooltips, `aria-pressed` for active grid/pan/drawing/fog states and responsive behavior that prevents toolbar overflow inside the editor workspace. Pan/`Рука` is a map tool. Future tools should extend the existing compact groups or add another icon group; they must not introduce a second large toolbar panel over the canvas.
- `#campaignMapPopup[data-map-popup-ui-migration="0.0.1.8.12.2"]` and `.campaign-map-popup-shell[data-map-popup-ui-migration="0.0.1.8.12.2"]` must provide one compact map overlay frame for add/picker, grid, drawing, fog, shapes, layers, initiative and music. The surface must keep legacy action selectors, use local sprite icons, expose readable section labels and keep per-popup aria labels through `campaignMapPopupController`.
- `.campaign-map-selection-dock[data-map-selection-ui-migration="0.0.1.8.12.3"]` must be runtime-only, live inside `.campaign-map-stage`, update from selection events, show identity/position/visibility/key token stats and use local sprite actions. `Убрать` means remove from the current map only; destructive card/page deletion must stay in the existing token popup/action layer.
- do not recreate the always-visible layer/object dock or scene-state inspector as default stage panels. Layers, grid, fog and map-image state stay reachable through the compact toolbar and shared map popups; selected object details stay in the right-side property Inspector.
- multi-selected tokens and shapes may show visible/hidden counters and group `Скрыть` / `Показать` actions, but must update the existing `CampaignMapStore`, reuse render adapters, perform a single save/sync per group action and remain runtime-only.
- the default map render must not auto-create duplicate scene/layer panels over the canvas. Scene, grid, fog and layer actions should be reachable through the compact toolbar and existing shared popups unless a future concrete workflow justifies a new always-visible surface.
- normal click selects a token/shape and opens a right-side property Inspector with editable name/type, position, size, rotation, visibility and style fields. It is a runtime-only stage panel inspired by Unity/Godot property inspectors, not a decorative object label popup. Right-click on a map object must suppress the browser context menu and open the compact custom object action popup at the pointer.
- `.campaign-map-controls[data-map-toolbar-region="scene-bar"][data-map-ui-migration="0.0.1.8.12.10"]` owns scene/session actions in a full-width top bar, while `.campaign-map-tool-rail[data-map-toolbar-region="tool-rail"][data-map-ui-migration="0.0.1.8.12.10"]` owns canvas tools in a full-height stage rail. Both zones must be icon-only, runtime-only where applicable, sectioned by real `data-map-tool-section` groups, free of internal scrollbars and ready to grow with future tools. Map toolbar labels must use the body-level `.campaign-map-toolbar-tooltip` runtime overlay instead of pseudo-labels clipped inside button boxes.
- The separate diagnostics/history bottom panel was not added as a decorative placeholder. It remains a secondary-screens migration target where it can attach to real diagnostics, backup, recovery and history data.
- contrast theme support, pressed appearance controls, focus coverage for older editable/select/search fields, removal of heavy blur from large map/graph inspectors and `tools/audit_ui_polish.mjs` inside `npm run verify`.
- the retired campaign-map layer/object dock and scene-state inspector CSS/JS owner files are removed, and future map work should extend the existing toolbar/popup/selected-object Inspector surfaces before adding another visible stage panel.
- polish, performance, theme-scale visual baselines, dead CSS cleanup and documentation/release sync are in place.
- fixed viewport screenshot attachments now cover empty shell/tree/error state, editor Properties, campaign map popup plus Inspector, Knowledge Graph context overlay and empty task tracker board across dark/contrast themes and compact/large scale.
- the component catalogue is dev/test-only, tree rows have stronger keyboard/ARIA semantics, editor controls and empty Task Tracker are quieter, Knowledge Graph first-layer noise is reduced without adding new graph features, campaign map popups avoid the right-side Inspector, and primary/secondary owner evidence screenshots cover the accepted design direction.
- `0.0.1.8.18.6` produced real independent visual critic evidence. The FAIL result was not erased; it is now future polish debt by owner waiver.
- `0.0.1.8.18.7` closed a plan-only backlog expansion leaf. That source material is now absorbed into [PROJECT_PLAN.md](../../01-delivery/PROJECT_PLAN.md), and the former mini backlog is archived for history.
- `0.0.1.8.18.8` ran the final verification gate with focused leaf tests, full browser smoke, visual regression, UI polish audit, `npm run verify`, real large-workspace desktop smoke and `npm run desktop:gate` green. `0.0.1.8.18` is closed by the 2026-08-10 owner waiver, and `0.0.1.9.0` is unlocked as the next audit-only phase.
- Add Block uses the shared `.mow-button`, generic Campaign Map popups use `.mow-popover` plus `--mow-surface-overlay-opaque`, and tag/alias metadata controls use shared `.mow-input[data-size="sm"]` / `.mow-icon-button[data-size="sm"]` instead of local generic styling.

## Historical Evidence

Read [dated implementation history](../../archive/documentation-2026-09-15/DESIGN_SYSTEM_MIGRATION_HISTORY.md) only for the origin of an adopted rule or a dated migration decision. Current work is selected in the active project plan.
