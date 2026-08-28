---
summary: "Targeted audit of current PopupManager adoption and remaining popup lifecycle exceptions."
read_when:
  - "Before migrating popup or overlay lifecycle behavior"
  - "Before adding a new popup, menu, dialog or popover"
  - "When choosing a pilot for PopupManager adoption cleanup"
owner_zone: "architecture"
---

# PopupManager Adoption Audit

Date: 2026-08-28.

Audited HEAD: `93d3aec` (`Add approved popup visual regression baselines`).

This is an owner-directed off-plan maintenance audit. It does not change roadmap state, does not start `0.0.1.16.0`, and does not change production JS/CSS/HTML behavior.

## Scope

Inspected current shared popup owners:

- `js/ui/popupManager.js`;
- `js/ui/popupPosition.js`;
- popup-related JS modules in `js/ui`, `js/editor`, `js/tree`, `js/wiki`, `js/presentation`;
- static popup nodes in `index.html`;
- popup CSS entry files and overlay z-index usage in `styles`;
- popup browser coverage in `tests/browser`.

Not counted as popups:

- ordinary application panels such as `#appRightPanel`, sidebars, inspectors and Settings section pages;
- `.floating-toolbar` and `.table-selection-toolbar` as toolbars with their own toolbar semantics;
- inline confirmation blocks inside Settings, such as `.app-backup-confirm` and `.app-asset-health-confirm`;
- tooltip/toast surfaces, which use shared overlay tokens but are not PopupManager popups.

## Classification

- **A - already canonical**: uses the existing PopupManager lifecycle for open/close state, Escape/outside handling and z-order, with product-specific behavior kept in its feature owner.
- **B - small adapter needed**: PopupManager is present or an existing shared popup primitive exists, but a local legacy behavior still bypasses a part of the shared contract.
- **C - genuine lifecycle exception**: not a normal app popup, or a separate window/tool surface where PopupManager ownership is not currently the correct boundary.
- **D - unclear / owner decision required**: current code is inactive/archived or product direction is unclear enough that migration should wait for owner decision.

## Owner Decisions After Audit

- Variables picker: do not migrate while the Variables block remains archived/inactive. Revisit only if the feature is explicitly restored.
- Presentation image preview: accepted exception; keep the separate presentation-window lifecycle.
- Lifecycle pilots: item set picker was selected as the simple pilot, and Knowledge Graph node menu was selected as the complex pilot. World Package package-file delete and Backup incomplete-cleanup delete confirmations were later migrated through the shared `confirmPopup` owner.

## Adoption Matrix

| Popup | Owner/module | DOM | PopupManager registered? | Position owner | Escape | Outside click | Focus behavior | Overlay kind | Custom z-index/listeners | Migration needed? | Reason | Class |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| App Tools popup (`#appToolsPopup`) | `js/ui/appTopbar.js` | Static in `index.html` | Yes | `togglePopupNearAnchor` / `popupPosition` | Shared | Shared | Non-modal; no forced initial focus | `popover` | Static CSS uses token layer | No | Topbar only owns product trigger and `aria-expanded`; lifecycle is shared. | A |
| Settings center (`#appSettingsPopup`) | `js/ui/settings/settingsCenter.js` | Static in `index.html` | Yes | `togglePopupNearAnchor` / `popupPosition` | Shared | Shared | Local initial focus to settings search after open | `dialog`, non-modal | Static CSS uses token layer | No | Settings owns content/navigation; PopupManager owns popup state and close lifecycle. | A |
| Command palette (`#commandPalette`) | `js/ui/commandPalette.js` | Static in `index.html` | Yes | Static/fixed CSS; opened through controller `open()` | Shared | Shared | Modal focus trap; local input focus | `dialog`, modal | Global `Ctrl+K` listener is product trigger, not lifecycle bypass | No | Centered modal intentionally uses fixed layout while PopupManager owns modal lifecycle. | A |
| Event history (`#eventHistoryPopup`) | `js/ui/eventHistoryPanel.js` | Static in `index.html` | Yes | Static/fixed CSS; opened through controller `open()` | Shared | Shared | Modal focus trap; header actions rendered locally | `dialog`, modal | None material | No | Event query/rendering is feature-owned; dialog lifecycle is shared. | A |
| World Package manager (`#worldPackagePopup`) | `js/ui/worldPackageManager.js` | Static in `index.html` | Yes | Static/fixed CSS; opened through controller `open()` | Shared | Shared | Modal focus trap and focus return to Tools trigger; package delete confirm uses the shared modal confirm path | `dialog`, modal | None material | No | Main manager dialog is canonical; package-file delete confirmation now uses the existing PopupManager-backed `confirmPopup` owner without changing the delete operation. | A |
| Onboarding/help popup (`#onboardingPopup`) | `js/ui/onboardingGuide.js` | Static in `index.html` | Yes | Static/fixed CSS; opened through controller `open()` | Shared | Shared | Non-modal dialog; local route focus | `dialog`, non-modal | Local document click routes help links | No | Help routing is product content; close/open lifecycle is shared. | A |
| Profile popup | `js/ui/profile.js` | Dynamic body node | Yes | `togglePopupNearAnchor` / `popupPosition` | Shared | Shared | Non-modal; returns through anchor behavior where possible | `popover` | None material | No | Simple dynamic popover already uses shared owner. | A |
| Component catalogue popover | `js/ui/componentCatalogue.js` | Dynamic body node, dev/test gated | Yes | `openPopupNearAnchor` / `popupPosition` | Shared | Shared | Local autofocus to catalogue sample | `popover` | Dev-only trigger gate | No | Dev/test surface is gated and uses shared lifecycle. | A |
| Create menu / template picker (`#createMenu`) | `js/ui/createModal.js` | Dynamic body node | Yes | `openPopupNearAnchor` or `openPopupAtPoint` / `popupPosition` | Shared | Shared | Menu keyboard via PopupManager for enabled command items | `dropdown-menu` | Local document click only detects create triggers | No | Feature owns menu contents; PopupManager owns dropdown behavior. | A |
| Tree context menu (`#treeContextMenu`) | `js/tree/treeContextMenu.js` | Dynamic body node | Yes | `openPopupAtPoint` / `popupPosition` | Shared | Shared | Context-menu keyboard via PopupManager | `context-menu` | CSS still has old hard-coded fallback `z-index: 10000` | No functional migration; token cleanup later | Registered lifecycle is canonical; CSS fallback is visual/token debt, not an ownership bypass. | A |
| Confirm popup | `js/ui/confirmPopup.js` | Dynamic body node or nested in current modal owner | Yes | `openNearAnchor` / `popupPosition` | Shared | Shared | Anchored popover for ordinary confirms; modal focus trap for destructive app confirmations inside modal workflows | `popover` or `dialog`, modal when requested | None material | No | Existing shared confirm primitive is PopupManager-backed; World Package package-file delete and Backup incomplete-cleanup delete use its modal variant. | A |
| Block/Add popup (`#blockPopup`) | `js/editor/blocks/blockPopup.js` | Dynamic body node | Yes | `openPopupNearAnchor` / `popupPosition` | Shared | Shared | Modal focus trap; feature focuses specific form input where needed | `dialog`, modal | None material | No | Add/delete/table form modes share one registered dialog container. | A |
| External link popup (`#linkPopup`) | `js/editor/links.js` | Static in `index.html` | Yes | `openPopupAtPoint` / `popupPosition` | Shared plus local input-level Escape | Shared | Modal focus trap; URL input autofocus | `dialog`, modal | Local keydown handles Enter and a redundant Escape close | No urgent migration | Local Enter is feature action; local Escape duplication is harmless cleanup material, not a contract bypass. | A |
| Wiki create menu | `js/editor/wikiLinkCreateMenu.js` | Dynamic body node | Yes | `openPopupAtPoint` / `popupPosition` | Shared | Shared | Dropdown-menu keyboard through manager | `dropdown-menu` | None material | No | Canonical dropdown-menu lifecycle. | A |
| Wiki preview popup | `js/editor/wikiLinkPreview.js` | Dynamic body node | Yes | `openPopupNearAnchor` / `popupPosition` | Shared | Shared | Hover preview; no command focus required | `popover` | Hover timers local | No | Hover delay is product behavior; lifecycle is shared. | A |
| Image crop popup | `js/editor/images.js` | Dynamic body node | Yes | `openPopupNearAnchor` / `popupPosition` | Shared | Shared | Modal focus trap; range input autofocus | `dialog`, modal | Autosave timer local to crop model | No | Crop state/save behavior is feature-owned; popup lifecycle is shared. | A |
| Properties settings popup | `js/editor/propertiesSettingsPopup.js` | Dynamic body node | Yes | Controller/PopupManager position | Shared | Shared | Modal focus trap | `dialog`, modal | Feature-local drag/resize for fields, not popup lifecycle | No | Popup shell is canonical; Properties grid behavior remains feature-owned. | A |
| Toolbar color popup (`#toolbarColorPopup`) | `js/editor/toolbar.js` | Static in `index.html`, moved to body | Yes | `controller.toggleNearAnchor` / `popupPosition` | Shared | Shared | Non-modal; color picker behavior local | `popover` | None material | No | The toolbar color pilot removed local popup geometry, document-level outside close and hard-coded popup z-index; color selection remains toolbar-owned. | A |
| Card Type listbox | `js/ui/cardType.js` | Dynamic from card shell, moved to body | Yes | Controller `openNearAnchor` / `popupPosition` | Shared plus combobox-specific Escape handling | Shared; global click closes all card-type menus | Focus remains on combobox trigger with `aria-activedescendant` | `popover` | Custom keyboard belongs to combobox semantics | No | The popup is a select/listbox control, not a generic menu; current split matches the accessibility contract. | A |
| Item set picker | `js/ui/itemSets.js` | Dynamic body node | Yes | `openPopupNearAnchor` / `popupPosition` | Shared | Shared | Search field focused locally | `popover` | None material | No | The simple pilot removed the legacy document-click outside-close fallback; PopupManager now owns the picker close lifecycle. | A |
| Campaign Map shared popup (`#campaignMapPopup`) | `js/editor/campaignMapPopupController.js` and map toolbar modules | Dynamic body node when absent | Yes | `openPopupNearAnchor` / `popupPosition` with Inspector `avoid` target | Shared | Shared | Modal focus trap | `dialog`, modal | CSS uses overlay tokens; product key/anchor data local | No | Campaign Map passes only the Inspector avoid target; generic geometry stays shared. | A |
| Campaign Map token popup (`#campaignTokenPopup`) | `js/editor/campaignMapTokenPopupController.js` | Dynamic body node | Yes | `openPopupNearAnchor` / `popupPosition` | Shared | Shared | Hover/action popover; button labels applied locally | `popover` | Hover timers and pointerenter/leave are product behavior | No | Delayed hover is local by design; open/close/z-order are shared. | A |
| Knowledge Graph connect popup | `js/wiki/knowledgeGraphPage.js`, `js/wiki/knowledgeGraphCanvasOverlays.js` | Dynamic inside graph document | Yes | PopupManager for lifecycle; placement follows graph render state | Shared | Shared | Non-modal dialog; graph focus rerender local | `dialog`, non-modal | None material | No | Connect state is graph-owned; popup lifecycle is registered. | A |
| Knowledge Graph node menu | `js/wiki/knowledgeGraphCanvasOverlays.js` | Dynamic inside graph document | Yes | `openPopupAtPoint` / `popupPosition` | Shared | Shared | Context-menu keyboard via manager | `context-menu` | None material | No | The complex pilot moved viewport/offset correction into shared `popupPosition`; graph code now owns only node menu content/action context. | A |
| Variable picker popup | `js/ui/variables.js` | Dynamic body node | No | Local `positionVariablePopup` | No shared Escape | Local `mousedown` outside listener | Search input focused locally | Local popover | Local clamp, local outside close, no overlay markers | Owner decision before migration | The Variables block is an archived/inactive experiment; do not migrate until the feature is explicitly revived. | D |
| Presentation image preview | `js/editor/campaignMapPresentation.js`, `js/presentation/presentationEntry.js` | Dynamic in separate presentation window | No | Presentation window local DOM/CSS | No shared Escape | Close button only | Presentation window focus | Separate preview overlay | Separate-window DOM, not AppShell PopupManager | No main-app migration | This runs in `presentation.html`, outside the main AppShell popup lifecycle. A future presentation overlay contract may be appropriate, but not PopupManager adoption by default. | C |
| Backup incomplete-cleanup delete confirm | `js/ui/settings/backupSettings.js` | Nested dynamic confirm inside Settings backup panel | Yes, through `confirmPopup` | `openNearAnchor` / `popupPosition` | Shared | Shared | Modal focus trap and focus return to delete trigger; Settings close also closes the nested confirm | `dialog`, modal | None material | No | Backup Settings still owns incomplete-backup cleanup and error reporting; confirmation lifecycle is delegated to the existing PopupManager-backed `confirmPopup` owner. | A |

## Current Browser Coverage

Existing browser coverage already exercises the shared contract rather than only static ARIA markers:

- `tests/browser/popup-lifecycle.spec.mjs` covers viewport fit, Escape, outside click, z-index, modal focus trap/return, menu keyboard lifecycle, editor feature popups, Campaign Map popups, token popup, item picker and onboarding.
- `tests/browser/popup-drag.spec.mjs` covers the shared draggable popup behavior.
- `tests/browser/popup-visual-baselines.spec.mjs` now gives approved screenshot baselines for Add block, Properties and Campaign Map grid popups at `1440x900` and `960x640`.
- `tests/browser/knowledge-graph.spec.mjs`, `tests/browser/world-package.spec.mjs`, `tests/browser/backup-settings.spec.mjs`, `tests/browser/event-history.spec.mjs`, `tests/browser/card-type-accessibility.spec.mjs`, `tests/browser/settings-center.spec.mjs` and `tests/browser/tree-accessibility.spec.mjs` cover feature-specific overlay behavior.

## Findings

No second popup service is present.

The main shared owner remains:

- lifecycle: `js/ui/popupManager.js`;
- geometry: `js/ui/popupPosition.js`;
- feature-specific product behavior: the owning feature module.

Remaining adoption gaps are narrow:

1. `variables.js` has a full local picker popup, but the whole Variables block is currently archived/inactive and explicitly not selected for migration.
2. Presentation image preview is a separate-window overlay and is now an accepted lifecycle exception.

CSS note: several historical popup CSS files still contain hard-coded fallback z-index values (`popup-create.css`, `popup-link.css`, `tree.css`). Runtime z-order for registered popups is still owned by PopupManager inline style. Treat the hard-coded values as token-cleanup debt, not as proof of a second lifecycle owner.

## Pilot Recommendation

Completed simple pilot: item set picker now delegates outside-close lifecycle to `PopupManager` without the local document-click fallback.

Completed complex pilot: Knowledge Graph node menu now delegates point positioning, viewport clamp and offset/transform compensation to `popupPosition`; graph overlay code no longer keeps local viewport clamp helpers.

Completed toolbar pilot: toolbar color popup now delegates anchor positioning, viewport clamp, Escape/outside close and overlay z-order to `PopupManager` / `popupPosition`; toolbar code still owns only selected-color behavior and recent-color rendering.

Completed native-confirm pilots: World Package package-file delete and Backup incomplete-cleanup delete now use the existing `confirmPopup` owner as modal PopupManager-backed confirmations. Cancel, Escape and close do not delete; explicit confirm still delegates deletion to the owning feature storage operation.

Do not use the archived Variables picker as a pilot unless the owner explicitly revives the Variables block. Any future confirmation workflow should reuse `confirmPopup` rather than adding a second confirmation owner.
