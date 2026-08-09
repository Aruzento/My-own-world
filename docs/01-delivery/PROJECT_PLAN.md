---
summary: "Active project plan for MyOwnWorld version 1 work."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---

# Project Plan

Updated: 2026-08-09

Planning version: 1

Numbering starts at `0.0.1.0.0`.

This file contains only active and unfinished work. Completed history lives in [WORK_LOG.md](./WORK_LOG.md) and archived plans in [docs/archive](../archive/README.md).

## Rules

- Bugs and broken user flows have priority over new features.
- Completed work moves to `WORK_LOG.md` or an archive, not to the active plan.
- Partially completed work stays here as a smaller unfinished task.
- P0/P1 work needs an automated test or a clear note explaining why automation is not possible yet.
- If user-visible behavior changes, update release notes, tester instructions, or the manual.
- Future work is allowed here only when it is still actionable and should not be forgotten.
- Completed work must state a readiness level from [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md): `Foundation`, `MVP`, `Usable`, or `Release-ready`.
- Do not remove a plan item when only `Foundation` was completed and user-facing work remains.

## Active Plan

### 0.0.1.0.0. P0 Bug Triage & Stabilization

Goal: restore confidence in the core product before adding more features. MyOwnWorld must feel predictable in browser and desktop on both small and large workspaces.

Current inventory: [BUG_INVENTORY.md](./BUG_INVENTORY.md).

Deferred bugs and improvement notes: [BUGS_AND_IMPROVEMENTS_BACKLOG.md](./BUGS_AND_IMPROVEMENTS_BACKLOG.md).

Latest smoke pass: [SMOKE_PASS_2026-07-14.md](./SMOKE_PASS_2026-07-14.md).

Manual smoke checklist: [MANUAL_SMOKE_CHECKLIST.md](../03-testing/MANUAL_SMOKE_CHECKLIST.md).

No currently confirmed P0/P1 code failure remains in the small-workspace smoke pass. The external-audit security/docs cleanup for `0.0.1.0.4`-`0.0.1.0.7` is closed at usable project-process level. The next priority is page/workspace lifecycle hardening before new feature work.

### 0.0.1.1.0. Workspace Operations & Page Lifecycle Hardening

Goal: make page operations reliable, reversible and diagnosable on real large workspaces.

### 0.0.1.2.0. Desktop Product Hardening

Goal: desktop should feel like a real app, not a fragile wrapper around the browser build.

### 0.0.1.3.0. Campaign Map Stabilization & UX

Goal: map tools must be simple, fast, and usable during a live game.

### 0.0.1.6.0. Data Safety & Recovery

Goal: protect user content while the product grows.

### 0.0.1.7.0. Documentation, Manual & Release

Goal: the owner and testers should understand what changed and how to verify it.

### 0.0.1.8.0. System UI/UX Redesign

Goal: turn MyOwnWorld into a coherent professional desktop workbench for a GM: dense, readable, local-first, and calm, with dark fantasy used as accents rather than visual noise.

Source: `C:\Users\Aruko\Downloads\MyOwnWorld UI-UX Redesign.docx`.

Principles: do not rewrite the whole interface in one pass; do not create separate mini design systems for map, graph, cards, or task tracker; do not mix visual restyle with business logic changes. Every migrated area must keep browser and Tauri behavior working.

0.0.1.8.11. Migration Phase 5: core content.

Description: migrate tree, card editor, properties, templates, search, and command palette into the shared design system.

Status: closed at `Usable` by `0.0.1.8.11.7`: `BI-013` block drag-and-drop is restored, `BI-014` Add block popup is redesigned, the card editor header/runtime controls now follow shared tokens and local sprite icons, Properties use field variants/states with local sprite badges, ordinary card blocks share one visual language with runtime-only type badges/thin markers/tokenized surfaces, card-block selects use the shared dark select contract, saved page templates are reachable from the create menu, and the left rail now has a real `Поиск и команды` tool with deep PageRepository-backed page search and command execution through the shared popup lifecycle.

0.0.1.8.12. Migration Phase 6: campaign map.

Description: migrate map toolbar, scene/list surfaces, layers, token dock, map inspector, and map contextual actions without changing map business logic.

Status: closed at `Usable` by `0.0.1.8.12.10` after human post-review corrections. `0.0.1.8.12.1` closed the toolbar foundation, and `0.0.1.8.12.7`-`0.0.1.8.12.10` correct it into the current product shape: a compact title chip, a full-width top scene/session action bar, and a full-height left canvas tool rail with icon-only buttons, body-level hover/focus tooltips, Hand/pan as a real tool, stable compact buttons, no visible toolbar text, no clipped labels and no internal toolbar scrollbars. `0.0.1.8.12.2` closed the shared popup surface for add/picker, grid, drawing, fog, shapes, layers, initiative and music. `0.0.1.8.12.3`-`0.0.1.8.12.8` evolved selected-object UI from a bottom info dock into a right-side editable `Inspector`: token name, X/Y, size, rotation and player visibility; shape type, X/Y, width/height, rotation, stroke/fill colors, stroke width and player visibility. Shape rotation is now part of the map model/serializer instead of a fake UI-only field. `0.0.1.8.12.4` / `0.0.1.8.12.5` explored layer/object and scene-state stage docks, but `0.0.1.8.12.7` removes them from default map render because they duplicated the toolbar/popup workflows and made the stage feel overloaded. `0.0.1.8.12.6` closed group contextual action coverage, `0.0.1.8.12.8` adds custom right-click on map objects, `0.0.1.8.12.9` split canvas tools left / scene commands top, and `0.0.1.8.12.10` makes those zones full-size and unclipped.

0.0.1.8.13. Migration Phase 7: knowledge graph.

Description: migrate graph toolbar, canvas controls, node cards, edge states, inspector, and filters.

Status: closed at `Usable` by `0.0.1.8.13.11`. `0.0.1.8.13.1`-`0.0.1.8.13.4` migrated the visible graph surface: hidden-slice clarity, selected-node edge states, a compact inspector, darker node/connect overlays and a laconic first layer. `0.0.1.8.13.5`-`0.0.1.8.13.11` closed the maintainability/lifecycle side: graph CSS is split by owner, JS ownership now covers inspector, labels, canvas controls, renderer, canvas actions, canvas overlays, relationship/context-menu HTML and view-state helpers, and manual relationship persistence now goes through a dedicated graph command bridge using `PageRecord`, `PageCommandService` and the write queue. `BI-017` / `BI-018` are closed for Phase 7 scope. Future graph concept changes belong to `BI-026`, not another hidden Phase 7 slice.

0.0.1.8.14. Migration Phase 8: secondary screens.

Description: migrate task tracker, settings, imports, backup/restore, release/help screens, diagnostics, and support panels.

Status: closed at `Usable` by `0.0.1.8.14.7`. `0.0.1.8.14.1` closed the task tracker UI slice at `Usable`: the board now has a compact workbench toolbar, local sprite icon actions, column/task/checklist counters, checklist progress bars and tokenized column/card surfaces without changing the data model or persistence path. `0.0.1.8.14.2` fixed the task tracker icon-button click regression and migrated the existing topbar Settings maintenance popup at `Usable` level for appearance, backup, asset health and workspace diagnostics: it now has one section system, health/backup/restore/asset/danger markers, local sprite icon actions and a visual-safety screenshot. `0.0.1.8.14.3` migrated the existing Tools help/onboarding popup at `Usable` level as a Help/Support/Release guide: compact tool routes, internal help navigation, status chips and support/release cards. `0.0.1.8.14.4` added the first real user-facing World Package manager at `MVP` level: Tools opens `Пакеты мира` for branch/world export, package library preview/delete, JSON import preview and backup-gated page-only import. `0.0.1.8.14.5` upgrades that slice to a safer page-import workflow: conflicts no longer force a hard stop only; the user can block, import only new pages, or create copied pages with unique ids/titles while parent links are rewired and persistent HTML is sanitized before write.

`0.0.1.8.14.6` update: the World Package manager now applies embedded rulePackages into `rule-packages/` after backup, never overwrites an existing rule package file, and runs asset preflight before apply. Required missing asset references block import; optional missing references warn and allow page/rulePackage import.

`0.0.1.8.14.7` update: World Package export now embeds readable asset payloads from referenced workspace files, and import writes valid base64 payloads after backup through the shared storage adapter. Existing asset files are not overwritten: conflicting payloads are copied to unique asset paths and imported page bodies are rewritten to the copied references before sanitization. Invalid payload bytes are treated as unavailable required assets and block before page writes. Phase 8 secondary screens are closed; remaining design-system work continues in `0.0.1.8.15`.

0.0.1.8.15. Migration Phase 9: polish and cleanup.

Description: run accessibility audit, performance pass, visual regression, theme presets, animation review, dead CSS removal, and documentation updates.

Status: closed at `Foundation` by `0.0.1.8.15.5`: polish audit, contrast/focus/motion guard, large migrated-surface performance smoke, theme-scale visual baselines, dead CSS cleanup and final docs/release sync are in place.

Planned subpoints:

- `0.0.1.8.15.1` UI polish audit, contrast theme and motion/focus guard - closed at `Foundation`.
- `0.0.1.8.15.2` migrated-surface runtime performance smoke - closed at `Foundation`.
- `0.0.1.8.15.3` broader visual-regression/theme-scale coverage - closed at `Foundation`.
- `0.0.1.8.15.4` dead CSS and unused owner cleanup - closed at `Foundation`.
- `0.0.1.8.15.5` final documentation, release notes and Phase 9 closure sync - closed at `Foundation`.

`0.0.1.8.15.1` update: Phase 9 is started with a concrete polish/audit slice. Settings appearance now supports a `contrast` theme preset through the existing theme manager and body `data-theme` model; appearance swatches/segmented buttons expose `aria-pressed`; editor/table/property/item/wiki input focus gaps now use the warm MyOwnWorld focus ring; large campaign-map and Knowledge Graph inspectors no longer apply expensive backdrop blur; and `npm run verify` runs `tools/audit_ui_polish.mjs` to block `transition: all`, `will-change: all`, heavy blur on large workbench surfaces and `outline: none` without focus coverage.

`0.0.1.8.15.2` update: the performance pass now has a browser-level guard for the migrated UI systems. `tests/browser/ui-polish-performance.spec.mjs` renders a synthetic 420-page tree, 180-token / 80-shape campaign map, expanded Knowledge Graph canvas and 96-card task tracker, then checks DOM counts plus soft runtime budgets. This does not change visible product behavior; it makes future redesign work safer on large workspaces. Remaining `0.0.1.8.15` work: broader visual-regression/theme-scale review, dead CSS removal and final docs/release sync.

`0.0.1.8.15.3` update: broader visual-regression/theme-scale coverage now has a focused browser baseline. `tests/browser/visual-regression.spec.mjs` adds `visual-theme-scale-captures-workbench-baselines`, which builds a synthetic workspace with the left rail, open tree, hidden right-panel foundation and populated card editor, then captures dark compact, contrast large and contrast narrow workbench states while checking horizontal overflow, shell state and required theme tokens. Remaining `0.0.1.8.15` work: dead CSS/unused owner cleanup and final docs/release sync.

`0.0.1.8.15.4` update: dead CSS cleanup now removes the retired campaign-map layer/object dock and scene-state inspector from the active bundle. The removed owners are `styles/campaign-map-layer-dock.css`, `styles/campaign-map-scene-inspector.css`, `js/editor/campaignMapLayerDock.js` and `js/editor/campaignMapSceneInspector.js`; map runtime no longer calls no-op refresh hooks for those obsolete panels. The accepted default map path remains the compact top scene/session bar, full-height left tool rail, shared map popups, token hover/right-click popup and right-side selected-object Inspector. Remaining `0.0.1.8.15` work: final documentation, release notes and Phase 9 closure sync.

`0.0.1.8.15.5` update: Phase 9 closure sync is complete. Dashboard, work log, active plan, design-system contract, UI baselines, CSS inventory, UI audit plan, release notes, tester instructions, project file audit and generated manual now describe the current Phase 9 state: retired map stage panel owners are removed, active visual/performance/polish guards are green, and the follow-up design-system visual regression pass is tracked as `0.0.1.8.16`.

0.0.1.8.16. Visual regression for design system.

Description: add fixed viewport/theme/scale screenshots for shell, tree, editor, properties, map, graph, popups, empty/loading/error states, compact/comfortable density, dark and high-contrast themes.

Status: closed at `Foundation` by `0.0.1.8.16`. `tests/browser/visual-regression.spec.mjs` now captures a fixed viewport design-system matrix for empty shell/tree/error state, card editor Properties, campaign map popup plus selected-object Inspector, Knowledge Graph context overlay and empty task tracker board across dark/contrast themes and compact/large scale. `tests/uiMigrationBaselines.test.mjs` and `UI_MIGRATION_BASELINES.md` require the five new attachment names.

Design-track gate: the current `0.0.1.8` redesign plan has no next implementation item after `0.0.1.8.16`. Before moving back to non-design product work, pause for owner review and the user's pending design-completion task.

0.0.1.8.17. Owner visual completion and post-design backlog gate.

Description: complete the owner-requested final design pass before returning to non-design product work. The work is visual-system completion, not new feature delivery: inspect the accepted references and current screenshots, reduce AI-slop/noise, make the primary workbench surfaces feel coherent and premium, verify with fixed screenshots and automated tests, then create a separate future mini-backlog for owner-approved next-feature ideas without implementing those ideas in this block.

Scope:

- `0.0.1.8.17.1` - intake, active-plan setup, baseline screenshots and specialist read-only critiques.
- `0.0.1.8.17.2` - AppShell, left rail, tree/search, card editor and Properties consistency pass.
- `0.0.1.8.17.3` - shared menus/popovers/dialogs plus task tracker, Knowledge Graph and campaign map visual pass.
- `0.0.1.8.17.4` - Settings/diagnostics, empty/loading/error states, accessibility and reduced-motion checks.
- `0.0.1.8.17.5` - create `docs/01-delivery/NEXT_PRODUCT_MINI_BACKLOG.md`, synchronize project docs/release notes/manual and close the design gate only after verification evidence is recorded.

Status: closed at `Usable` by `0.0.1.8.17`. The final owner visual pass reduced visible noise across shell/tree/editor/task tracker/graph/map surfaces, hid the component catalogue from normal Tools usage behind a dev/test flag, improved tree keyboard semantics, made map popups avoid the right-side Inspector, added 1440x900 and 1280x720 owner evidence screenshots, and created `docs/01-delivery/NEXT_PRODUCT_MINI_BACKLOG.md` for future product ideas without implementing them here. Post-design gate: pause for the owner's planned task before scheduling or starting non-design work.

0.0.1.8.18. Owner Design Correction & Evidence Gate.

Description: correction gate opened after owner review found concrete quality problems left by `0.0.1.8.17`. This is not another redesign and must not add product features. The accepted visual direction stays intact; the work is limited to removing local design-system drift, correcting accessibility/keyboard contracts, centralizing duplicated popup positioning ownership, proving the result through an independent visual critic loop, and expanding the future product backlog into implementation-ready planning.

Scope:

- `0.0.1.8.18.1` - baseline and exact finding inventory for owner findings A-I; production code remains read-only.
- `0.0.1.8.18.2` - design-system correction for Add Block, Campaign Map popup surface, and tag/alias controls.
- `0.0.1.8.18.3` - Task Tracker structural icon-only cleanup without presentation hacks.
- `0.0.1.8.18.4` - Russian accessibility labels and complete desktop tree keyboard contract.
- `0.0.1.8.18.5` - shared popup positioning ownership for map Inspector avoidance.
- `0.0.1.8.18.6` - independent read-only visual critic loop and final owner evidence set.
- `0.0.1.8.18.7` - deterministic expansion of `NEXT_PRODUCT_MINI_BACKLOG.md`.
- `0.0.1.8.18.8` - final correction gate, full verification, documentation sync, and closure only if all evidence passes.

Status: active at `Foundation`; `0.0.1.8.18.1` is closed as the read-only inventory leaf, and `0.0.1.8.18.2` is closed as the A-C design-system correction leaf. Current inventory lives in [OWNER_DESIGN_CORRECTION_FINDINGS_0.0.1.8.18.md](./OWNER_DESIGN_CORRECTION_FINDINGS_0.0.1.8.18.md). Next planned leaf is `0.0.1.8.18.3`; it has not been started. Do not start `0.0.1.9.0` until this correction gate is closed.

### 0.0.1.9.0. Repository Architecture / Maintainability / AI-Slop Audit

Goal: after `0.0.1.8.18` passes, perform a repository-wide audit-only review for architecture, maintainability, duplicated ownership, accessibility debt, CSS debt, test/documentation slop, performance risks and safety issues.

Status: blocked until `0.0.1.8.18` closes. This block must create an audit report and cleanup backlog for owner review, but it must not execute the cleanup or start NF-001...NF-017 product work.
