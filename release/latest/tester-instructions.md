# Tester Instructions

## 2026-09-14: Phase 17 Architecture Only

Phase 17 is ACTIVE, with 17.1 complete at Foundation readiness and 17.2 NEXT. There is no new attack button, targeting flow, HP automation or action Undo to test yet. The future Goblin hit/miss/history/Undo acceptance belongs to 17.6 in the Combat Action Pipeline contract. Existing Phase 16 regression routes below remain applicable; Phase 18+ is BLOCKED and AI Core LATER.

## 2026-09-13: Phase 16 Closure Handoff

Phase 16 is CLOSED / PASS at Usable readiness. The corrected Combat UI foundation has owner manual PASS; the retained routes below remain regression instructions, not a pending 16.10 approval gate. Test current source on disposable data only. Installed-desktop release acceptance is still separate.

Final verification passed: focused 232 unit/integration and 36 browser tests; `docs:index`, `verify:quick`, `verify`, `check:encoding`, `git diff --check` and one `verify:full` with 817 unit / 224 browser tests. All six approved popup screenshot comparisons passed unchanged. No native desktop smoke or real-workspace destructive operation was run.

Use the recovery/audit, realistic-roster and prepare-next routes below together. Expect exact current state from the map page, audit-only history and explicit errors, never replay or automatic repair. This is a persistent-session foundation, not attack/damage/HP gameplay. Phase 17's current architecture-only status is recorded above; AI Core remains LATER.

## 2026-09-12: 16.10 Recovery And Audit

Owner manual PASS for 16.9/16.9.1/16.9.2 is recorded; the former HOLD is resolved.
Use a disposable workspace only. The map page is current truth, event history is audit only.

1. Start a prepared battle; pause/resume, edit the active roster, toggle Ready/Delayed and change turns. Open the existing `Журнал событий`; check readable lifecycle/roster/flag/turn summaries. Combat entries must not offer resource Undo.
2. Use Next from the final participant. One transaction must contain turn then round advancement. Previous and direct selection do not advance round. Pre-combat preparation and ordinary initiative corrections add no Combat events.
3. Save state A with known id/status/round/order/totals/current/markers, then create a normal backup. Make and save later Combat B changes with audit events. Restore A through existing Settings recovery and its mandatory safety backup. Reload the map: exact state A wins; B history remains historical, never replayed.
4. Save/reload active, paused and finished examples. No reroll, resort, identity/current reset or flag reset. Full and partial restore remain existing explicit recovery operations; backup v1 does not export event history.
5. Failure injection is automated/disposable only. A failed state write must append no success event. After a successful state write and failed event append, expect `Состояние боя сохранено, но событие не записано в журнал.` Reload keeps saved state. No hidden retry/rollback or false save-failure claim. Corrupt history reports diagnostics without preventing valid map loading.

Focused checks: `node --test tests/combatSessionEventLog.test.mjs tests/combatSessionRecoveryEvents.test.mjs` and
`npm run test:browser -- tests/browser/campaign-map-combat-ui.spec.mjs`.
No new screenshot baseline or real-workspace destructive smoke. The completed 16.FINAL result is recorded above; keep this recovery route for regressions.

## 2026-09-11: 16.9.2 Prepare Next Combat Acceptance

Use only a disposable/copied workspace and current source UI. Owner acceptance is now PASS; retain this preparation/layout route for future regressions.

1. Finish a battle with known initiative/current participant and mixed Ready/Delayed. Until `Подготовить новый бой` is pressed, final state remains read-only.
2. Press `Подготовить новый бой`, also checking Enter from keyboard focus. The participant picker opens with the old roster selected and the same values. No new battle has started; no reroll, sort or current-participant reset happened.
3. Remove one participant, add another available one, use Roll d20 and enter known manual values. Press `Применить`. Review order and select the intended current participant. This still has no Combat Session.
4. Press `Начать бой`. Verify round 1, prepared roster/current/values and false Ready/Delayed markers. Set either/both markers to confirm unchanged behavior. Save/reload and compare.
5. Repeat Finish -> Prepare, then close/reload without Apply. The map opens in pre-combat order, not finished Combat. `Участники` opens the editable picker; preparation and an explicit new Start remain possible.
6. Repeat at 480x720 with long names: picker/order must stay bounded, internally scrollable and footer actions reachable. Record owner PASS or specific defects, not just automated test results.

Focused automated route: `npm run test:browser -- tests/browser/campaign-map-combat-ui.spec.mjs tests/browser/campaign-map-initiative.spec.mjs tests/browser/campaign-map-combat-integration.spec.mjs`. Disposable injected save-failure coverage verifies readable error/dirty state and reload of the last saved finished session. Never induce write failure in real campaign data.

## 2026-09-11: 16.9.1 Realistic Roster Retest

16.9 initially failed owner manual review; the subsequent owner PASS accepts the corrected 16.9.1/16.9.2 foundation. Retain this regression route on a disposable/copied workspace and current source UI, not an old installed build.

1. Repeat the existing 16.9 behavior route below with at least eight participants: `Существо3.Новая карта`, `Существо2.Новая карта`, `Громм Кровавый Торн`, `Очень Длинное Имя Персонажа Для Проверки Интерфейса`, `Лазарь`, `Рейнай`, `Азраэль`, `Страж Северных Врат`. Include varied initiative values and Ready, Delayed and both flags.
2. At 1280x900 and 480x720, read each full wrapping name and initiative value/result. The current badge has its own slot; flags and warning text must remain below the main row. No text/control may extend into the next card.
3. Scroll the roster to the bottom. Only that area should scroll, including unresolved-member warnings. Header, round/current navigation, Pause/Resume, Finish and Close must stay reachable without scrolling the browser page.
4. Use Tab through name selection, initiative input and flags, Space on Ready/Delayed, and Enter on lifecycle controls. Focus must remain visible and move into the internal scroll area normally. Escape/Close returns to the toolbar.
5. Pause and reopen: disabled states and all values remain readable. Resume/Finish remain reachable. In a disposable warning fixture, inspect the longest name with a missing-page warning and a Combat-only id with missing initiative; no repair or removal should occur.
6. Record PASS or concrete remaining defects. The owner PASS recorded above resolves the former 16.10 HOLD; a later regression must still be reported.

Focused reproduction: `npm run test:browser -- tests/browser/campaign-map-combat-ui.spec.mjs --grep realistic`. Review `combat-realistic-{active,paused,details}-{1280,480,1024}.png` attachments documented in `docs/03-testing/VISUAL_REGRESSION.md`; these are not approved pixel baselines.

## 2026-09-10: 16.9 Combat UI Owner Acceptance

Use a disposable/copied workspace, not the real campaign. The original automated/Foundation delivery now has owner acceptance and Phase 16 closure; it is not an approved desktop release. Run `npm run dev:web` for the current source UI.

1. On a map with two creatures, open `Бой и инициатива`, choose participants, enter known totals and press `Применить`. This prepares initiative only; Roll d20 and manual corrections still work before a session exists.
2. Select the intended current participant and press `Начать бой`. Check round 1, the same current participant/order/totals and cleared markers; no reroll.
3. Use Next through a full wrap: round increases once. Previous changes current participant but never reduces round. Direct participant selection does not change round; the corresponding existing token stays highlighted.
4. Set Ready, Delayed and both markers on one participant. They remain through turns and do not skip/reorder anyone. Correct a number, toggle a marker and confirm the pending number remains; save the correction before Pause or participant editing.
5. Edit participants while active. Retained members keep markers, additions start with false markers and explicit omissions leave the roster.
6. Pause, close/reopen the map and verify round/current/order/totals/markers. All mutation controls except Resume/Finish remain disabled. Resume explicitly.
7. Save an active round 3 session with a known current participant and mixed markers; close/reload the map, reopen this popup and compare all values. Next must continue from the restored current/round.
8. Finish and reload: final state is read-only. Use `Подготовить новый бой`, edit/apply initiative, then explicitly `Начать бой` as in the 16.9.2 route above. New Combat gets a new session id, round 1 and cleared markers without changing prepared initiative.
9. On disposable missing-reference fixtures, inspect token/page warnings in normal rows and Combat-only ids in `Проблемы боя`. No silent removal/replacement. Pending input + rejected Next must neither save the input nor advance the session.
10. Check keyboard focus, Escape/return to toolbar, pressed markers and popup placement in desktop and constrained windows. Record PASS or specific regressions; the former approval prerequisite for 16.10 has been satisfied.

Focused automated route:

```powershell
npm run test:browser -- tests/browser/campaign-map-combat-ui.spec.mjs tests/browser/campaign-map-initiative.spec.mjs tests/browser/campaign-map-combat-integration.spec.mjs
```

The Combat UI spec attaches `combat-active-1280.png`, `combat-paused-1280.png`, `combat-active-480.png` and `combat-paused-480.png` at deterministic 1280x900 / 480x720 viewports. These are review evidence, not new approved pixel baselines. Existing approved popup baselines are unchanged.

**Owner manual acceptance of the corrected foundation is PASS; installed-desktop release acceptance is a separate check.**

## General Handoff Smoke

This procedure is retained from the established handoff workflow. It is a checklist for the exact build under review, not a claim that the current installer or workspace has passed. For current phase/leaf use [PROJECT_PLAN.md](../../docs/01-delivery/PROJECT_PLAN.md).

Start here when you receive the current build.

### 1. Confirm Which Build You Are Testing

- Browser/dev: run from the repository with `npm run dev:web`.
- Local desktop executable for developer smoke: `src-tauri\target\release\my-own-world.exe`.
- Installer for another person: `src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe`.

Use a copied workspace for destructive checks such as create, move, delete, backup restore or repair.

### 2. Required Automated Checks Before Handoff

Run:

```powershell
npm run verify
npm run test:browser
```

For focused regression checks, use:

```powershell
npm run test:browser -- --grep schema-recovery
npm run test:browser -- tests/browser/campaign-map-initiative.spec.mjs
```

For UI redesign baseline attachments, use:

```powershell
npm run test:browser -- tests/browser/visual-regression.spec.mjs
```

Then inspect the Playwright attachments named in `docs/02-architecture/ui/UI_MIGRATION_BASELINES.md`.

For the Phase 9 theme-scale workbench visual guard, use:

```powershell
npm run test:browser -- tests/browser/visual-regression.spec.mjs --grep visual-theme-scale-captures-workbench-baselines
```

For the `0.0.1.8.16` fixed viewport design-system state matrix, use:

```powershell
npm run test:browser -- tests/browser/visual-regression.spec.mjs --grep visual-design-system-captures-fixed-viewport-state-matrix
```

For the `0.0.1.8.17` owner visual completion matrix, use:

```powershell
npm run test:browser -- tests/browser/visual-regression.spec.mjs --grep visual-owner-completion-captures-primary-secondary-evidence
```

For the Phase 9 polish/contrast/focus audit slice, use:

```powershell
npm run ui:polish:audit
node --test tests/themeManager.test.mjs
npm run test:browser -- tests/browser/app-shell.spec.mjs
```

For the Phase 9 migrated-surface performance guard, use:

```powershell
npm run test:browser -- tests/browser/ui-polish-performance.spec.mjs
```

For the Phase 9 dead CSS cleanup around retired campaign-map stage panels, use:

```powershell
npm run test:browser -- tests/browser/campaign-map-ui.spec.mjs --grep campaign-map-toolbar-uses-migrated-mode-action-groups
```

For the campaign map split toolbar/tool rail, editable property Inspector, custom right-click popup and group contextual actions redesign slice, use:

```powershell
npm run test:browser -- --grep campaign-map-toolbar-survives-page-workspace-and-presentation-lifecycle
npm run test:browser -- --grep campaign-map-token-skill-menu-renders-russian-labels-and-uses-character-model-checks
npm run test:browser -- --grep campaign-map-presentation-representative-map-workflow-stays-current
npm run test:browser -- --grep campaign-map-drawing-tools-stay-usable-through-layers-keyboard-and-reload
npm run test:browser -- --grep "campaign-map-(toolbar|contextmenu|selection-inspector)|visual-safety-captures-core-surfaces"
npm run test:browser -- tests/browser/campaign-map-ui.spec.mjs
```

For the Knowledge Graph visible-slice, selected-node inspector, edge-state, overlay-cleanup, laconic first-layer, CSS split and inspector/labels/canvas-controls/canvas-renderer/canvas-actions/canvas-overlays JS split slices, use:

```powershell
npm run test:browser -- tests/browser/knowledge-graph.spec.mjs
```

For the task tracker `0.0.1.8.14.1` / `0.0.1.8.14.2` workbench UI and icon-button regression slice, use:

```powershell
npm run test:browser -- tests/browser/task-tracker.spec.mjs
```

For the Settings maintenance `0.0.1.8.14.2` slice, use:

```powershell
npm run test:browser -- tests/browser/settings-center.spec.mjs
npm run test:browser -- tests/browser/app-shell.spec.mjs
npm run test:browser -- tests/browser/asset-health.spec.mjs
npm run test:browser -- tests/browser/visual-regression.spec.mjs --grep visual-safety-captures-core-surfaces
```

For the Help/Support/Release guide `0.0.1.8.14.3` slice, use:

```powershell
npm run test:browser -- tests/browser/app-shell.spec.mjs
npm run test:browser -- tests/browser/visual-regression.spec.mjs --grep visual-safety-captures-core-surfaces
```

For the World Package manager `0.0.1.8.14.7` import/conflict/rulePackage/asset payload slice, use:

```powershell
node --test tests/worldPackage.test.mjs
npm run test:browser -- tests/browser/world-package.spec.mjs
npm run test:browser -- tests/browser/visual-regression.spec.mjs --grep visual-safety-captures-core-surfaces
```

For the editor block DnD and Add block redesign slice, use:

```powershell
npm run test:browser -- --grep "editor-block-pointer-dnd|add-block-picker"
```

For the card editor header and floating toolbar redesign slice, use:

```powershell
npm run test:browser -- --grep "card-editor-core-content-controls|app-shell-empty-state"
```

For the AppShell foundation guard, use:

```powershell
npm run test:browser -- --grep app-shell
```

For the `0.0.1.11.1` persistent workspace switch regression, use:

```powershell
npm run test:browser -- --grep app-shell-global-workspace-switch-keeps-cancel-and-loads-next-workspace
```

For shared primitive and overlay lifecycle coverage, use:

```powershell
npm run test:browser -- component-catalogue
npm run test:browser -- popup-lifecycle
```

For shared popup drag geometry, use:

```powershell
npm run test:browser -- tests/browser/popup-drag.spec.mjs
```

Manual spot check: open `Поиск и команды` with `Ctrl+K`, drag it by a free non-input area, and confirm the grabbed point stays under the pointer. Repeat with Settings, Tools, a card popup such as `Свойства`, and a Campaign Map popup; buttons, inputs and selects inside the popup should keep their normal behavior.

For NF-001 edit-session conflict protection, use:

```powershell
node --test tests/pageWritePreconditions.test.mjs tests/pageWriteConflictBlocking.test.mjs tests/conflictDataSafetyIntegration.test.mjs
npm run test:browser -- tests/browser/editor-autosave.spec.mjs
npm run test:browser -- tests/browser/editor-navigation-conflicts.spec.mjs
npm run test:browser -- tests/browser/editor-special-conflicts.spec.mjs
```

Expected conflict result: a stale editor/session save must not overwrite newer durable content. The conflict UI should explain in Russian that the page changed after opening, keep the user's unsaved draft available, and avoid repeated autosave dialog spam. Restore/repair results should survive later stale editor saves.

For the current NF-002 Dice Engine verification slice, use:

```powershell
node --test tests/diceFormulaParser.test.mjs tests/diceCoreEvaluator.test.mjs tests/diceFormulaLimits.test.mjs tests/diceRngContract.test.mjs tests/diceStructuredRollResult.test.mjs tests/diceRollModes.test.mjs tests/diceCriticalSemantics.test.mjs tests/dicePublicConsumerApi.test.mjs tests/campaignMapInitiativeModel.test.mjs tests/campaignMapHelperOwnership.test.mjs
```

Expected Dice Engine result: formulas such as `d20`, `2d6 + 3`, `2 * (d6 + 3)` and `(d20 + 5) / 2` parse into deterministic AST data and evaluate through the public runtime `rollDice(request, { randomInt })` facade. Deterministic injected RNG sequences should produce exact totals, exact `randomInt(1, sides)` calls and structured `dice-roll-result` payloads with original/normalized formula data, grouped dice faces and arithmetic breakdown. Explicit `mode: "advantage"` / `mode: "disadvantage"` works only for one primary d20 plus deterministic arithmetic, and explicit `criticalPolicy: "d20-natural"` classifies the selected natural d20 face without adding combat effects. Code-shaped strings such as `process.exit()`, `alert(1)`, string timers, dynamic import, arrays, strings and comments must be rejected. Division by zero, invalid RNG output and provider failures must fail with structured evaluation errors. Formula length, AST nodes, parentheses depth, dice term count, total dice, per-term dice count, die sides and safe-number overflow must fail with `LIMIT_EXCEEDED` classification and should not roll any dice when the limit can be known before evaluation. Campaign Map initiative now uses the public Dice Engine facade with parity, and Phase 15 now has the first durable roll-event consumer; roll UI, dice UI, event log UI and combat behavior are still not implemented.

For the current NF-003 event vocabulary foundation, use:

```powershell
node --test tests/eventQuery.test.mjs tests/transactionReversal.test.mjs tests/pagePropertyResourceTransaction.test.mjs tests/diceRollEventLog.test.mjs tests/eventTypes.test.mjs tests/eventStore.test.mjs tests/eventTransactionModel.test.mjs tests/eventTransactionContract.test.mjs
```

Expected event foundation result: `roll.performed`, `manual.correction.recorded`, `resource.changed` and `transaction.reversal.recorded` validate only their strict v1 payloads before durable event append/read normalization. `logDiceRoll()` is the first durable roll-event consumer: it calls public `rollDice()`, stores formula/faces/total/mode/critical metadata as one completed transaction, reloads the same event from `.my-own-world-events/transactions.v1.jsonl`, and reports append failure without durable success. `logPagePropertyResourceChange()` is the first state-changing event transaction: it changes one numeric Properties-backed page field through PageCommandService, appends a completed `resource.changed` event, reloads the changed page/event, rejects invalid targets before writes, keeps page-write failures out of the event log, and rolls back the page through PageCommandService if event append fails. `undoTransaction()` now reverses that supported page-property resource transaction by appending a new compensating transaction, blocks double undo, refuses roll-only transactions as non-reversible, rejects stale current resource state and rolls failed event appends back through PageCommandService. `queryEventLog()` is the public read facade for bounded recent/chronological event items with cursor pagination and filters by transaction id, event type, entity id, timestamp range and durable log-order range; `getEventTransactionById()` returns a typed transaction or `null`. Future namespaces such as `action.*`, `damage.*`, `healing.*`, `effect.*`, `turn.*`, `round.*`, `rest.*`, `movement.*` and `scene.transition.*` are reserved names only and should be rejected until a later phase implements real contracts. Event UI, dice UI and combat behavior are still not implemented.

Before sending a desktop build, run:

```powershell
npm run desktop:gate
```

For a large GM workspace handoff, include the workspace:

```powershell
npm run desktop:gate -- --workspace "X:\ДНД\Мастер\По кампаниям\База"
```

For the current desktop real-app verification path, run the native smoke after a fresh desktop build:

```powershell
npm run desktop:build
npm run desktop:native-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"
npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"
```

Expected current native result: workspace restore passes, the tree renders, a normal image card opens with at least one visible loaded `img[data-asset]`, a heavy Campaign Map opens with a visible renderable background, presentation opens with `status: ready`, Settings diagnostics opens, there are no failed WebView resources, and schema/large-asset diagnostics are treated as advisory rather than crashes.

### 3. Manual Smoke Priority

1. Open a copied workspace.
2. With a workspace already open, use the compact topbar `Открыть папку` action. Cancel once and confirm the current workspace and open page remain unchanged. Then choose another copied workspace and confirm the tree shows the second workspace, the previous workspace page is not still open, and the workspace path/identity updates.
3. Open Settings from the topbar. It should open as a larger Settings Center, not a small linear maintenance popup. Check the sidebar groups (`ОСНОВНЫЕ`, `ДАННЫЕ И ФАЙЛЫ`, `МИР И ИГРОВЫЕ ИНСТРУМЕНТЫ`, `СИСТЕМА`), search for `резерв`, and confirm `Оформление`, `Резервные копии`, `Хранилище` and `Диагностика` open without closing the popup. Appearance changes should apply immediately, backup controls should keep their existing restore/retention behavior, Storage should show Asset Health, Diagnostics should show workspace path/write access/schema/backup status, and future sections such as `Интеграции` should show a clear `Скоро` placeholder rather than fake controls.
4. On the empty start screen, check that there is one clear action card with `Карточка`, `Карта`, `Задачи`, `Правила` and `Граф связей`. It should not show internal `Workspace`, `Context` or `Diagnostics` demo panels, and the actions should not overlap on desktop or mobile. In the sidebar tree area, when no workspace is open, there should be one clear `Открыть папку` button.
5. Check the left AppShell rail: it should show `Дерево`, `Поиск и команды`, and the profile/user button. `Карточки`, `Карты`, `Задачи`, `Правила` and `Граф связей` should remain reachable through the world tree/create flows, not as duplicated rail tabs. The tree sidebar should not repeat `MyWorld` / `Дерево мира` and should not contain workspace/open or create buttons in a header; after opening a workspace, the `Корень` row should show the root `+` create action and the folder-create action.
6. Click `Дерево` in the rail to hide and reopen the tree sidebar, then resize the visible sidebar with the separator by dragging or using Left/Right arrow keys while it is focused. The editor should expand while the tree is hidden, the workspace should stay readable, and the resize handle should be hidden on mobile.
7. Open `Поиск и команды` from the rail or press `Ctrl+K`. Search for a word that exists only in a page body; the palette should show the page title, path, matched field and excerpt, and opening the result should open the page. Reopen the palette, run `Скрыть дерево` or `Показать дерево`, and confirm it uses the same tree sidebar behavior as the rail button.
8. Open any real page and check that no right page-info inspector appears. The editor should keep the freed width; the reserved right panel is hidden until a future real workflow owns it.
Card editor design check: select text in the card title and in a normal text block; the floating format toolbar should appear as a compact overlay with accessible controls, stable width and no overlap with the card title.
9. In Settings, switch theme between `dark` and `contrast`, then switch UI scale between compact/normal/large and check that topbar, rail, sidebar controls, tree search, command palette and statusbar stay aligned instead of jumping or overlapping. Appearance controls should show a visible pressed state and warm focus ring.
10. Open Tools -> `Поддержка`. The Tools popup should show compact icon rows, then close when the Help popup opens. The Help popup should have section buttons for start/system/release/support/checklist, status chips, readable support cards, no horizontal overflow and an honest World Package status. Escape or the close button should close the Help popup. Then open Tools -> `Пакеты мира`: export the current branch or whole world, confirm the saved package appears in the library, and if the branch references an image/map asset confirm the saved package contains `contents.assets[].payload`. Preview a conflicting package and confirm the default `Стоп` mode blocks apply. Switch to `Только новые` and check the plan skips conflicts; switch to `Копии` and check apply becomes available for page conflicts after backup, creating copied pages instead of overwriting existing ones. If the package asset path already exists in the workspace, import should write a copied asset path and imported pages should reference that copied path. Then preview an external JSON package with one embedded rulePackage, one valid asset payload and one optional missing asset reference: preview should stay ready, mention `Rule packages`, asset copy and `optional missing`, create a backup, import the page, write a new file under `rule-packages/` and write the asset file under `assets/`. Preview another JSON package with a required missing asset reference and no payload, then one with invalid base64 payload bytes; both should be blocked before backup/import.
11. Open Tools -> `Компоненты`; check that the Button/Input/Panel/Popover examples appear, focus moves inside, and Escape closes the catalogue. For modal dialogs/popups in later checks, Tab/Shift+Tab should stay inside the dialog and close should return focus to the opener. Icon-only shell controls should show compact tooltip labels on hover/focus, and long operation progress should behave like a toast-style status surface.
   UI primitive note: the catalogue should now include IconButton, Select/Checkbox/Segmented field examples, Toolbar/Separator, Panel and Popover without text overlap at compact/normal/large scale.
12. Create a card, type text, save/reopen.
13. Create or open a normal card with text, list, table, image and `Properties` blocks. The blocks should share one quiet editor style with small type badges and thin colored markers; dropdowns inside these blocks, including the list type picker and Properties selects, should look like dark MyOwnWorld controls rather than default browser selects. `Properties` should keep readable field badges without a heavy filled background. For character/creature `Properties`, check HP, AC, initiative and armor picker behavior, readable compact metrics, skill groups and no overlap between lower skill groups and death-save fields. Also open Properties settings, Add block, link creation, image crop, text color and item picker popups; they should close by their normal buttons/Escape without leaving a stuck overlay or lost keyboard focus. Drag a content block by its grip handle and confirm the preview/drop placeholder are readable and the block moves.
14. Save a normal card as a template from the tree context menu, then use the root `+` menu and choose `Из шаблона`. The template picker should show a search field, local icons, readable Russian metadata and create a new card from the selected template.
15. Open a campaign map; check that the map title is a compact chip, the top scene/session toolbar is a full-width icon-only workbench zone, and the left canvas tool rail is a full-height stage dock. Neither toolbar zone should show internal scrollbars. Toolbar labels should appear as floating hover/focus tooltips outside the button bounds, with no clipping. Hand/pan should sit with the tools, not with creation. No duplicate scene/layer panels should appear over the stage. Toggle grid, pan, drawing and fog: the active button should be visibly pressed. Open add, map image, grid, layers, drawing, fog, music and initiative popups from the toolbar; the map popups should share one compact dark frame with a local icon, readable title and labeled sections, close through normal controls/Escape/repeated trigger, avoid text clipping/overlap, and return keyboard focus where the popup is modal. Then select a token or shape. A right-side `Inspector` should appear with editable concrete properties: token name/X/Y/size/rotation/player visibility, or shape type/X/Y/width/height/rotation/stroke/fill/stroke width/player visibility. Changing a field should update the object and persist after save/reopen. Right-click a token or shape and confirm the browser menu does not appear; the custom compact object action popup should open instead. Multi-select at least two tokens/shapes with mixed player visibility; the Inspector should show visible/hidden counters and offer `Скрыть` / `Показать` for the group. `Убрать` should remove the object from this map only, not delete the linked card. Then move a token, hover/open token actions and open presentation.
   Map design note: the accepted `0.0.1.8.12.10` layout is split and full-size. Canvas tools (Hand/pan, shapes, drawing, fog) must be in the left full-height rail, while scene/session actions (add, grid, map image, layers, presentation, initiative, music) stay in the top full-width bar. Clipped tooltips, internal toolbar scrollbars, a single wide mixed toolbar or decorative placeholder panels should fail visual review.
16. If music is part of the test build, add real audio files and test play/stop/next/previous in desktop.
17. Create/open `Граф связей`; check that the filterbar stays laconic: short status chip, visual slice meter and icon actions instead of permanent visible/total/hidden number cards. Detailed counts/reasons should still exist in hover/accessibility labels, and `Все связи` / search-refine actions should remain reachable as compact controls.
18. In the Knowledge Graph, click a node and confirm its connected lines become active, unrelated visible lines/nodes become muted, and the workbench inspector stays light: title, icon actions and short relation chips instead of visible stat grids.
19. In the Knowledge Graph, drag a node, undo/redo, right-click a node and check relationship actions. The context menu should open near the clicked node, stay inside the viewport, use grouped icon actions, and show editable relationship rows only after expanding `Связи`; expanded rows should not clip fields or show visible internal scrollbars.
20. In the Knowledge Graph, create a connection through the connect popup; node/connect overlays should use the same dark editor-grade icon/header/field language, stay within the viewport and close cleanly by Escape/outside click.
21. Create or open a task tracker. The board should have a compact top toolbar with local icons, quiet column/task/checklist counters and the add-column action. Click directly on the icons inside add/delete/checklist buttons: columns, tasks and checklist items should still be created or removed. Columns should be full-height work surfaces with small icon actions, task cards should feel raised but compact, checklist progress should appear only on cards that have checklist items, and drag/drop placeholders should be readable without creating internal horizontal scrollbars.
22. Run backup manually before any repair action; schema repair must stop if backup fails.

### 4. Known Risks To Watch

- Desktop installed-app behavior can still differ from browser smoke.
- Real audio codecs may fail even when playlist UI passes browser tests.
- Large workspace UI smoothness is partly subjective; report any action that feels frozen.
- Knowledge Graph is currently a useful migrated canvas workbench with visible-slice clarity, selected-node relationship clarity, a laconic node/connect overlay layer, split CSS/JS ownership and command-lifecycle relationship persistence. New visible graph features should wait for the `BI-026` concept rethink.
- Current Data Safety scope is closed for restore preview, partial restore, grouped asset/link/orphan diagnostics and backup-gated selected repair. NF-001 edit-session conflict protection is closed for the current PageRecord-backed scope. NF-002 Safe Dice Engine is closed: parser, evaluator, explicit limits, deterministic RNG, structured RollResult, advantage/disadvantage, natural d20 critical classification, universal public API and initiative parity now exist. NF-003 Event / Roll / Combat Log + Transactions is closed: it now has one durable event sidecar, strict typed events, RollResult logging, one reversible page-property resource transaction, bounded event queries and a minimal “Журнал событий” UI. Dedicated dice/roll action UI, broad undo/redo, backup/restore inclusion policy for `.my-own-world-events/` and combat behavior are still not implemented.

## Historical Feature Acceptance

Older feature-specific test records are in [dated implementation history](../../docs/archive/documentation-2026-09-15/TESTER_INSTRUCTIONS_HISTORY.md). They describe their dated delivery state; current requirements come from the active contract, current handoff above and [TEST_SCENARIOS.md](../../docs/04-user-release/TEST_SCENARIOS.md).
