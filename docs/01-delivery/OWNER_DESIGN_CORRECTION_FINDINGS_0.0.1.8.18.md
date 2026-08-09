---
summary: "Baseline inventory for owner design correction findings A-I in 0.0.1.8.18."
read_when:
  - "Before implementing 0.0.1.8.18.2-0.0.1.8.18.8"
  - "When verifying that owner findings A-I were resolved"
owner_zone: "delivery"
---

# Owner Design Correction Findings 0.0.1.8.18

Updated: 2026-08-09

## Baseline

- Owner-accepted historical baseline in the task: `454a3f0dcdde919753c21191b3ae7930f77e5d55` (`Close owner visual completion gate`).
- Current HEAD before the correction inventory: `dec5438` (`Create local legacy hub policy`).
- Changes after `454a3f0`: one local legacy-hub policy commit (`dec5438`) touching `.gitignore`, `AGENTS.md`, delivery docs, generated manual and `tools/audit_project_files.mjs`. No production UI code changed after `454a3f0`.
- Working tree before inventory edits: clean.

## Inspected Sources

- Plan and delivery docs: `docs/01-delivery/PROJECT_PLAN.md`, `docs/01-delivery/WORK_LOG.md`, `docs/01-delivery/NEXT_PRODUCT_MINI_BACKLOG.md`.
- UI contract docs: `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`, `docs/02-architecture/ui/UI_CSS_INVENTORY_REPORT.md`, `docs/02-architecture/ui/UI_MIGRATION_BASELINES.md`, `docs/02-architecture/ui/UI_AUDIT_AND_MODERNIZATION_PLAN.md`.
- Shared design owners: `styles/design-tokens.css`, `styles/ui.css`, `styles/variables.css`.
- Popup owners: `js/ui/popupManager.js`, `js/ui/popupPosition.js`.
- Tree owners: `js/tree/tree.js`, `js/tree/treeRender.js`, `js/tree/treeKeys.js`, `js/tree/treeDragDrop.js`, `styles/tree.css`, `tests/browser/app-shell.spec.mjs`, tree browser/unit tests.
- Card/editor tag and alias controls: `styles/tags.css`, `js/ui/tags.js`, `js/ui/aliases.js`.
- Task Tracker: `styles/task-tracker.css`, `js/taskTracker/taskTrackerBoardHTML.js`, `js/taskTracker/taskTrackerColumnHTML.js`, `tests/browser/task-tracker.spec.mjs`.
- Campaign Map popup positioning: `styles/campaign-map-popups.css`, `js/editor/campaignMapPopupController.js`, `tests/browser/campaign-map-ui.spec.mjs`.
- Visual evidence system: `tests/browser/visual-regression.spec.mjs`, `tests/browser/scenarios.mjs`, `tests/uiMigrationBaselines.test.mjs`, `docs/03-testing/VISUAL_REGRESSION.md`, `docs/02-architecture/ui/UI_MIGRATION_BASELINES.md`.

## Finding Inventory

| Finding | Status | Evidence | Required next leaf |
| --- | --- | --- | --- |
| A. Add Block uses a decorative local gradient / local visual recipe. | CONFIRMED | `styles/blocks.css:488` defines `.add-block-btn` locally; `styles/blocks.css:510` uses a local `linear-gradient(...)`; `styles/blocks.css:524` adds local inset elevation; `styles/blocks.css:513` / `styles/blocks.css:527` use raw rgba values instead of shared button/popover primitives. | `0.0.1.8.18.2` |
| B. Campaign Map popup surface uses hardcoded dark gradient values. | CONFIRMED | `styles/campaign-map-popups.css:42` starts the popup `linear-gradient`; `styles/campaign-map-popups.css:44` / `styles/campaign-map-popups.css:45` hardcode `#11120f` and `#050706`; shared popovers use `--mow-popover-bg` in `styles/ui.css:1142`. | `0.0.1.8.18.2` |
| C. `tags.css` owns generic-looking tag/alias input and button styling. | CONFIRMED | `styles/tags.css:540` starts local `.inline-tag-input, .inline-alias-input`; `styles/tags.css:546`, `styles/tags.css:552`, `styles/tags.css:555`, `styles/tags.css:558`, `styles/tags.css:580` duplicate generic control height/border/radius/background/focus behavior; `styles/tags.css:594` starts local `.inline-add-tag-btn, .inline-add-alias-btn` generic icon-button styling; `js/ui/tags.js:47` / `js/ui/aliases.js:47` still target local classes only. | `0.0.1.8.18.2` |
| D. Task Tracker icon-only UI relies on presentation hacks. | CONFIRMED | `styles/task-tracker.css:178` hides the boardbar title text span with `display: none`; `styles/task-tracker.css:318` sets `.task-tracker-stat` `font-size: 0`; `styles/task-tracker.css:1107` hides `.task-column-empty span`; `js/taskTracker/taskTrackerBoardHTML.js:51` still renders the hidden boardbar text and `js/taskTracker/taskTrackerColumnHTML.js:89` renders a hidden empty-state span; `tests/browser/task-tracker.spec.mjs:435`-`tests/browser/task-tracker.spec.mjs:454` assert the hidden-display and `0px` font behavior. | `0.0.1.8.18.3` |
| E. New accessibility labels contain English strings inside the Russian product. | CLOSED | `0.0.1.8.18.4` changes Tree labels to Russian: `Дерево мира`, `Без названия`, `Развернуть: ...`, `Свернуть: ...`, `Действия страницы: ...`. Task Tracker `Empty column` was already corrected in `0.0.1.8.18.3` to `Колонка пуста` and was not touched by this Tree leaf. | `0.0.1.8.18.4` |
| F. Tree semantics improved, but complete ARIA tree keyboard evidence is missing. | CLOSED | `0.0.1.8.18.4` makes `role="treeitem"` the roving focus target, keeps `aria-expanded` and `aria-current` on the actual treeitem, removes leaf toggle from the focus model, and adds browser coverage for ArrowUp/Down, ArrowLeft/Right, Home, End, Enter, current page state, visible focus, virtualization and pointer-DnD non-regression. | `0.0.1.8.18.4` |
| G. Campaign Map has local geometry helpers while shared popup positioning already owns viewport positioning. | CLOSED | `0.0.1.8.18.5` moves the generic avoid-target contract into `js/ui/popupPosition.js`: shared positioning now owns viewport clamp, overlap checks and alternate placement. `js/editor/campaignMapPopupController.js` only passes the current `.campaign-map-properties-panel` as the map-specific avoid target and no longer defines local rectangle overlap, visibility or clamp helpers. Coverage now includes pure positioning tests, popup lifecycle regression, Campaign Map popup regression at `1280x720`, and owner visual evidence for map popup/Inspector non-overlap. | `0.0.1.8.18.5` |
| H. `0.0.1.8.17` lacks a real independent visual critic report with first-pass failures and final scores. | CONFIRMED | Existing evidence is automated screenshot-oriented: `tests/browser/visual-regression.spec.mjs:41`-`tests/browser/visual-regression.spec.mjs:52` lists owner screenshot attachments; `docs/02-architecture/ui/UI_MIGRATION_BASELINES.md:94` documents the owner visual matrix; `docs/01-delivery/WORK_LOG.md:68` points to screenshots outside the repo. `rg --files docs | rg "UI_OWNER_VISUAL_CRITIC|OWNER_VISUAL_CRITIC|VISUAL_CRITIC|visual-evidence"` found no critic/evidence report, and `docs/03-testing/UI_OWNER_VISUAL_CRITIC_0.0.1.8.18.md` does not exist. | `0.0.1.8.18.6` |
| I. `NEXT_PRODUCT_MINI_BACKLOG.md` is an idea index, not deterministic implementation-ready planning. | CONFIRMED | `docs/01-delivery/NEXT_PRODUCT_MINI_BACKLOG.md:23` starts `Future Items`; `docs/01-delivery/NEXT_PRODUCT_MINI_BACKLOG.md:27`-`docs/01-delivery/NEXT_PRODUCT_MINI_BACKLOG.md:43` contain only the NF table; no per-item sections exist for user problem, reuse, owner, data model, Definition of Usable, regression protection, spike, or decision source. | `0.0.1.8.18.7` |

## Stop Gate For This Leaf

- Production code was not modified in `0.0.1.8.18.1`.
- The next implementation leaf is `0.0.1.8.18.2`, limited to findings A-C.
- `0.0.1.9.0` remains blocked until all `0.0.1.8.18` correction/evidence leaves pass.
