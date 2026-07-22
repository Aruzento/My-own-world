---
summary: "Product dashboard with current project focus and links."
read_when:
  - "Before product planning"
  - "When changing product direction"
owner_zone: "product"
---
# Product Dashboard

Updated: 2026-07-22

## Current Product

MyOwnWorld is a local-first worldbuilding OS for tabletop campaigns. It combines cards, campaign maps, presentation mode, task trackers, wiki links, assets, backups, desktop packaging and rule/character foundations in one workspace format.

The current phase is not feature expansion. The current phase is version-1 stabilization: make the app fast, safe, understandable and reliable on real large workspaces before adding another layer of features.

## Current Focus

Active plan: `docs/01-delivery/PROJECT_PLAN.md`.

Immediate direction after the external audit:

1. Finish security and data-safety fixes.
2. Harden page create, move, rename and delete through a command lifecycle.
3. Keep large workspace performance visible and measurable.
4. Stabilize campaign map workflows without adding new complexity.
5. Keep project documentation readable for the product owner, not only for Codex.

Recently closed:

- `0.0.1.0.4` runtime UI text security coverage.
- `0.0.1.0.5` desktop filesystem boundary hardening.
- `0.0.1.2.2` native desktop click-through on the real large GM workspace `X:\ДНД\Мастер\По кампаниям\База`.
- `0.0.1.4.1` Properties block constructor: live drag preview, collision pushdown and visual grid-step handling.
- `0.0.1.4.2` standard character Properties layout: compact top metrics, one-row abilities and readable skill groups for new character/creature Properties blocks.
- `0.0.1.4.3` visible DnD calculations in Properties: ability modifiers, proficiency bonus, initiative, skills/expertise, armor-based AC and manual overrides.
- `0.0.1.4.4` armor selection in Properties: the `Armor` field now lists only item cards whose own Properties mark them as armor.
- `0.0.1.4.5` Properties/CharacterModel map connection: map tokens now receive HP, AC, speed, initiative and effect/status summaries from the model snapshot.
- `0.0.1.4.6` simplified block creation: `Add block` now stays at text, list, table, image and properties, while legacy specialized blocks remain compatibility-only.
- `0.0.1.5.1` Knowledge Graph real canvas foundation: visual nodes and edges, zoom/pan/fit, selected node details and one-click page open from the node.
- `0.0.1.5.2` readable Knowledge Graph layout: the first graph screen became a canvas workbench with domain/hub layouts, compact controls and fit/zoom/pan instead of noisy statistics cards.
- `0.0.1.5.3` Knowledge Graph filters and direct canvas interaction: filter by type, relationship, search and orphan pages; right-click a node for actions; drag nodes directly on the canvas.
- `0.0.1.5.4` Knowledge Graph canvas usability polish: standard root-plus-two-level view, no tabs/lists around the canvas, no fixed background domain labels, dynamic canvas expansion near edges, non-overlapping first layout and cleaner controls.
- `0.0.1.5.4.1`-`0.0.1.5.4.3` Knowledge Graph persistence and operations polish: pinned positions, canvas relationship creation, undo/redo, context actions and relationship edit/delete.
- `0.0.1.5.5` Knowledge Graph performance gate: large-workspace graph metrics now fail if the graph build/render slice drifts over budget.
- `0.0.1.5.6` Knowledge Graph regression coverage: browser tests now cover graph canvas filters, edges and orphan paths.
- `0.0.1.6.1` Safe HTML boundary: persistent tags, attributes, project classes/data fields and dangerous URLs are now allowlisted and regression-tested.
- `0.0.1.6.2` Paste sanitization: editor and table paste now route through the clipboard sanitizer, HTML-only clipboard content becomes plain text, and rich image/file-only paste is blocked from direct persistent DOM insertion.
- `0.0.1.6.3` Schema recovery UI: workspace diagnostics now shows grouped human-readable schema issues, separates legacy warnings from unsafe errors, and can run the persisted broken-parent repair only after a backup gate.
- `0.0.1.6.4` Recovery fallback tests: malformed pages, partial data, missing asset paths, invalid workspace shape and backup-failure repair paths now have unit/browser regression coverage.
- `0.0.1.7.1`-`0.0.1.7.2` manual and encoding pass: `docs/MY_OWN_WORLD_FULL_MANUAL.docx` was regenerated, verified as a valid docx/zip, and `npm run check:encoding` stayed green without new guard patterns.
- `0.0.1.7.3` GitHub Actions verify and browser smoke maintenance: CI now has least-privilege permissions, concurrency cancellation, bounded runtime, short-lived failure artifacts, and the local browser smoke runner forwards Playwright filters/file arguments correctly.
- `0.0.1.7.4`-`0.0.1.7.5` release handoff and archive pass: `release/latest` now starts with the current stabilization summary, tester route, known risks and verification snapshot; old plans stay documented as archive-only history.
- `0.0.1.8.1` UI/CSS inventory report: the current UI/CSS file tree, duplicate control families, popup/icon/color approaches, reusable UI pieces, migration risks and redesign migration map are documented in `docs/02-architecture/ui/UI_CSS_INVENTORY_REPORT.md`.
- `0.0.1.8.2` Design system contract: AppShell zones, semantic token families, shared primitives, overlays, visual states, motion/effects/iconography rules, system ownership boundaries and UI migration gates are now documented in `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`.
- `0.0.1.8.3` Theme foundation proof of concept: semantic tokens, theme manager/provider, density aliases, reduced-motion motion aliases and the SVG icon helper foundation now exist in runtime without migrating the whole UI.
- `0.0.1.8.4` Component catalogue proof of concept: Tools now exposes `Компоненты`, a visible shared Button/Input/Panel/Popover reference with focus, keyboard close, density, disabled, invalid, pressed and loading states.
- `0.0.1.8.5` AppShell foundation: the empty workspace start screen now uses a clear tokenized action card while the existing sidebar/editor/statusbar remain active; internal workspace/inspector/diagnostics demo zones were removed after review.
- `0.0.1.8.6` Migration Phase 0 audit baselines: `UI_MIGRATION_BASELINES.md` now records UI/CSS/icon/popup/screenshot baselines and the visual smoke covers shell, tree, editor, Properties, map, graph, task tracker and shared popover surfaces.
- `0.0.1.8.7` Migration Phase 1 foundations: the current AppShell, topbar, sidebar, editor shell, statusbar and empty-workbench start surface now share semantic `--mow-shell-*` tokens for layout, density, surface, divider, elevation and control states, with a browser guard for the foundation marker.
- `0.0.1.8.8` Migration Phase 2 primitives: shared IconButton, Select, Checkbox, SegmentedControl, Toolbar and Separator primitives now exist beside Button/Input/Panel/Popover; Tools uses shared Button styling and popupManager has the first overlay contract markers for app topbar/component catalogue popovers.
- `0.0.1.8.9` Migration Phase 3 overlays: `popupManager` now owns the shared overlay lifecycle for modal focus/focus return, dropdown/context-menu keyboard behavior, tooltip/toast markers, editor feature popups, campaign map generic/token popups, item picker, onboarding help and Knowledge Graph node/connect overlays.
- `0.0.1.8.10` Migration Phase 4 AppShell: the global shell now has a real navigation rail, a primary world-tree sidebar, tree-panel show/hide, sidebar keyboard resize and updated AppShell browser coverage.
- `0.0.1.8.10.2` AppShell rail simplification: content-type entries (`Карточки`, `Карты`, `Задачи`, `Правила`, `Граф связей`) were removed from the left rail because they duplicate pages already visible in `Дерево`; follow-up `0.0.1.8.10.4` keeps `Дерево` as the tree-panel toggle until real global tools are added.
- `0.0.1.8.10.3` AppShell Explorer actions correction: workspace opening moved into the no-workspace tree area, and root-level creation moved to the `Корень` row with separate `+` and folder actions.
- `0.0.1.8.10.4` AppShell rail/profile correction: the tree sidebar no longer repeats `MyWorld` / `Дерево мира`, the user/profile bar moved into the left rail, and the `Дерево` rail button now shows/hides the tree sidebar while the editor expands.
- `0.0.1.8.11.1` AppShell right-panel reserve and core tree/search start: the page-info inspector was removed, the right-panel slot is hidden until a future real workflow owns it, and tree search now has a Phase 5 core-content marker plus local search icon.
- `0.0.1.8.11.2` Core editor blocks: block drag-and-drop is restored with pointer preview/drop placeholder behavior, and the `Add block` picker now uses local sprite icons, grouped readable copy, focus states and visual smoke coverage.
- `0.0.1.8.11.3` Card editor surface polish: header/runtime controls, card type/tags/aliases/image actions and floating toolbar placement now follow shared tokens, local sprite icons and browser visual guards.

Next active block:

- `0.0.1.8.11` Migration Phase 5 core content, unless a P0/P1 bug from the lightweight backlog is promoted first.

Closed `0.0.1.8.10` summary after user review, updated by `0.0.1.8.11.3`: AppShell navigation is now a real rail, but it does not duplicate world content types. The left rail currently exposes `Дерево` as the only content navigation entry and the profile as a global rail item; cards, maps, task trackers, rules and knowledge graphs stay inside the world tree and create flows. The `Дерево` rail button shows/hides the primary sidebar, the editor expands when the tree is hidden, and resize state remains controlled by the shell. The old page-info right inspector is removed; the right-panel slot remains hidden until a future workflow has a real purpose for it. The primary sidebar follows an Explorer model: if no workspace is open, the tree area shows `Открыть папку`; once a workspace exists, root-level creation lives on the `Корень` row through `+` and folder actions. The Phase 5 editor slice now restores block movement, cleans up the first-level Add block picker and makes the card editor header/toolbar layer visually coherent. The separate diagnostics/history bottom panel is intentionally not added as an empty surface; diagnostics/recovery bottom-panel work remains in the secondary-screens phase.

## Readiness Model

Task status must use the readiness levels from `docs/01-delivery/DEFINITION_OF_DONE.md`:

- `Foundation` - useful base exists, but the human workflow is not complete.
- `MVP` - a basic user path exists and is testable.
- `Usable` - the owner can use it in normal work, with persistence and known risks handled.
- `Release-ready` - ready for handoff after automated and manual release checks.

This prevents "done" from meaning only "a model/helper was created".

## Key Risks

- Large real workspaces can still expose UI delay, especially in map-heavy sessions; the measurable and native `X:\ДНД\Мастер\По кампаниям\База` passes are currently green.
- Page lifecycle now has `PageCommandService`, `PageRecord`, trash/undo, PageIndex lifecycle, runtime write revision protection, workspace access diagnostics and grouped schema recovery UI; richer restore/link repair remains open.
- Desktop release is functional, but installed-app and large-workspace click-through must stay part of release handoff.
- Campaign map presentation, fog/drawing/layers and music require continued regression coverage.
- Properties and CharacterModel now have a usable card-to-map path and a simpler block creation entry, but the broader character workflow still needs release-ready polish.
- Knowledge Graph has a real visual canvas foundation, but lifecycle hardening, file split and hidden-slice clarity are now tracked in the lightweight backlog before further feature expansion.
- README, dashboard, bug inventory and plan must stay synchronized so the project remains understandable to the owner.

## Where To Read Next

- Plan: `docs/01-delivery/PROJECT_PLAN.md`
- Work log: `docs/01-delivery/WORK_LOG.md`
- Bug inventory: `docs/01-delivery/BUG_INVENTORY.md`
- Bugs and improvements backlog: `docs/01-delivery/BUGS_AND_IMPROVEMENTS_BACKLOG.md`
- Definition of Done: `docs/01-delivery/DEFINITION_OF_DONE.md`
- Agent rules: `AGENTS.md`
