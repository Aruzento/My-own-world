---
summary: "Plan-only staging backlog for next product feature slices after the design correction gate."
read_when:
  - "Before promoting NF-001...NF-017 into PROJECT_PLAN.md"
  - "Before starting non-design feature work"
  - "When deciding whether a future idea belongs in the active plan"
owner_zone: "delivery"
---

# Next Product Mini Backlog

Updated: 2026-08-09

Status: plan-only staging backlog. No NF product functionality is implemented here.

`0.0.1.8.18.6` remains `BLOCKED FOR OWNER REVIEW`; this file does not close the design correction gate. The owner explicitly allowed the independent planning leaf `0.0.1.8.18.7`, so this document expands the future backlog without starting `0.0.1.8.18.8` or any NF implementation.

## Rules

- Promote one NF item at a time into `PROJECT_PLAN.md` before implementation.
- Keep `BI-026` as the gate before adding new visible Knowledge Graph behavior.
- Do not reopen decorative shell panels or placeholder UI just to host future work.
- Prefer small, testable product slices with clear user value for a GM session.
- Do not create a second owner for pages, properties, campaign map data, rule packages, world packages, overlays, storage or Tauri boundaries.
- If a schema is not proven by existing architecture, mark it `TBD` during implementation design instead of inventing it in this backlog.

## Backlog Overview

### NEXT

- `NF-001 Edit-session conflict protection`: protects page writes before new durable session features increase write frequency.
- `NF-002 Safe Dice Engine`: can start as a pure rules module in parallel with data-safety planning, but persistent roll logging must wait for `NF-001`.
- `NF-003 Event / Roll / Combat Log + Undo`: should follow `NF-001` and `NF-002`, because it records roll/action events and must not create unsafe write paths.

### LATER

- `NF-004 Persistent Combat Session`
- `NF-005 Combat Action Pipeline`
- `NF-006 Effects & Conditions Engine`
- `NF-007 Range / Targeting / AoE`
- `NF-008 Short / Long Rest`
- `NF-009 Adaptive Token UI`
- `NF-010 Map Pings`
- `NF-011 Scene Transitions`
- `NF-013 Local Compendium`

### SPIKE

- `NF-012 Walls / Doors / Windows / Light / Vision`: split data-model design from renderer/backend choice.
- `NF-014 Local-hosted Collaborative Session`: Tauri/local networking and authority model need research.
- `NF-015 Mobile Player Companion`: depends on the collaboration/presentation boundary and must stay player-facing.
- `NF-016 Declarative Extension API`: needs a capability/schema design before any runtime extension surface.
- `NF-017 Optional 3D Dice Visualizer`: late presentation spike only; dice results come from `NF-002`.

### NOT NOW

- `NF-017 Optional 3D Dice Visualizer`: do not schedule before dice logic and logs are useful without visuals.
- Ctrl+drag creature duplication remains rejected.
- User-configurable health-stage system remains rejected.

## Dependency Sketch

Docs in this repository do not currently use Mermaid diagrams, so this backlog uses a plain text dependency sketch.

```text
NF-001 data safety
  -> NF-003 event / roll / combat log durable writes
  -> NF-004 persistent combat session
  -> NF-005 combat action pipeline

NF-002 safe dice engine
  -> NF-003 roll log records
  -> NF-005 structured checks / attacks / saves
  -> NF-017 optional 3D dice visualizer

NF-005 combat action pipeline
  -> NF-006 effects and conditions expiry/application
  -> NF-008 short / long rest refresh

CampaignMapModel / CampaignMapStore / serializer
  -> NF-007 range / targeting / AoE
  -> NF-009 adaptive token UI
  -> NF-010 map pings
  -> NF-011 scene transitions
  -> NF-012 walls / doors / windows / light / vision

Rule Workspace + Rule Packages + World Package + PageRepository
  -> NF-013 local compendium
  -> NF-016 declarative extension API

NF-014 local-hosted GM session
  -> NF-015 mobile player companion
```

Important dependency note: the repo does not prove a strict `NF-001 -> NF-002` implementation dependency. A pure dice parser/evaluator can be built before or beside edit conflict protection. The strict dependency starts when dice results become persisted events: `NF-003` should not add a durable event log until page/session write conflict behavior is designed through the current storage command layer.

## Existing Owner Map

- Page mutations: `js/storage/pageCommandService.js`, `js/storage/writeQueue.js`, `js/core/pageRecord.js`, `docs/02-architecture/contracts/LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md`.
- Read/index model: `js/repository/pageRepository.js`, `js/repository/pageIndex.js`, `docs/02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md`.
- Editor undo/history: `js/editor/editorHistory.js`, `docs/02-architecture/contracts/EDITOR_HISTORY_CONTRACT.md`.
- Properties and calculations: `js/properties/`, `docs/02-architecture/contracts/PROPERTIES_MODEL_CONTRACT.md`, `docs/02-architecture/contracts/DND_CALCULATION_RULES.md`.
- Character/creature domain: `js/character/`, `js/editor/campaignMapCharacterBridge.js`, `docs/02-architecture/contracts/CHARACTER_MODEL_CONTRACT.md`.
- Campaign Map data: `js/editor/campaignMapModel.js`, `js/editor/campaignMapStore.js`, `js/editor/campaignMapDataSerializer.js`, `js/editor/campaignMapGeometry.js`, `docs/02-architecture/contracts/WORKSPACE_SCHEMA_CONTRACT.md`.
- Campaign Map initiative: `js/editor/campaignMapInitiativeModel.js`, `js/editor/campaignMapInitiativePopup.js`, `tests/campaignMapInitiativeModel.test.mjs`, `tests/browser/campaign-map-initiative.spec.mjs`.
- Presentation mode: `js/presentation/presentationEntry.js`, `js/editor/campaignMapPresentation*.js`, `docs/02-architecture/desktop/DESKTOP_PRESENTATION_WINDOW_SPIKE.md`.
- Overlay lifecycle: `js/ui/popupManager.js`, `js/ui/popupPosition.js`, `docs/02-architecture/contracts/POPUP_LIFECYCLE_CONTRACT.md`.
- Rule Workspace and packages: `js/rulesWorkspace/`, `js/ruleTree/`, `js/rules/ruleTreeProvider.js`, `docs/02-architecture/contracts/RULE_TREE_CONTRACT.md`.
- World Package: `js/worldPackage/`, `js/ui/worldPackageManager.js`, `docs/02-architecture/contracts/WORLD_PACKAGE_CONTRACT.md`.
- Storage/Tauri boundary: `js/storage/storageAdapter.js`, `js/storage/desktopStorageAdapter.js`, `js/storage/tauriBridge.js`, `src-tauri/src/main.rs`.

## NF-001 — Edit-session conflict protection

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P0

COMPLEXITY:
M

SPIKE:
NO

1. USER PROBLEM

A GM can accidentally overwrite work when the same page is edited from two app sessions, two windows, or a stale runtime view.

2. FINAL USER-VISIBLE FUNCTIONALITY

When a page is opened, MyOwnWorld remembers the last known durable page revision/hash. Before autosave, special save, map save, task tracker save or metadata rename writes, the app checks whether the file has changed since that baseline. If a newer external change exists, the app stops the write, shows a clear conflict state in the status bar/dialog, and offers safe recovery actions: reload the page, keep the current edit as a copy, or cancel. After reload, the current page must show the durable version. Accidental stale writes must not silently win.

3. EXISTING FOUNDATION

`PageCommandService`, `writeQueue`, `PageRecord` diagnostic `contentHash`/`updatedAt`, `autosave.js`, `editorSpecialSave.js`, `storageAdapter`, `desktopStorageAdapter`, `tauriBridge`, `Workspace Schema Contract`, `Lightweight Workspace Operations Contract`, `pageCommandService.test.mjs`, `storageAdapter.test.mjs`.

4. REUSE

Use `persistPageContentCommand()` and write revisions for save attempts, `PageRecord` for metadata/hash, `StorageAdapter` for reading current durable content, and `setSaveStatus(..., 'conflict')` for visible state.

5. MUST NOT DUPLICATE

Do not create a second autosave system, a second page serializer, direct file writes outside `writeQueue`, or a broad workspace locking system before a single-page conflict path exists.

6. SYSTEM OWNER

Storage/page lifecycle owns conflict detection. Editor, map, task tracker and graph call into the command path.

7. DEPENDENCIES

Architecture dependencies: `PageCommandService`, `PageRecord`, `writeQueue`, `StorageAdapter`, `PageRepository` update notifications. NF dependencies: none, but `NF-003` durable logs should wait for this.

8. DATA / PERSISTENCE

Source of truth remains the page `.md` file. The conflict baseline can use `contentHash`/`updatedAt` plus a runtime opened-revision record. Durable conflict marker schema is `TBD — requires implementation design`.

9. UI SURFACE

Status bar save state, editor conflict dialog, and safe actions near the active page. Do not add a permanent right panel.

10. BROWSER / TAURI

Browser File System Access and Tauri storage must share the same high-level command contract. Tauri can read current file content through `desktopStorageAdapter`; browser behavior depends on available file handle permission.

11. FAILURE / DATA SAFETY

If current file cannot be read, fail closed and do not write. If page was deleted externally, offer copy/reload instead of recreating silently. If conflict detection itself errors, keep current runtime content unsaved and explain the next action.

12. IMPLEMENTATION ORDER

Add read-before-write conflict check in command layer. Wire autosave/special-save callers. Add conflict UI actions. Add browser/storage tests for stale file content. Add desktop smoke only after targeted tests pass.

13. DEFINITION OF USABLE

Two simulated sessions editing the same page cannot overwrite each other silently, and the GM can recover the newer file or save a safe copy without losing typed content.

14. REGRESSION PROTECTION

Unit: `pageCommandService`, `storageAdapter`, `pageRecord`. Browser: editor autosave conflict, map special-save conflict, task tracker special-save conflict. Desktop: Tauri read/write conflict smoke on a temporary workspace.

15. OPEN QUESTIONS

Exact conflict dialog copy/actions and whether "save as copy" creates a sibling page or exports an unsaved draft are TBD.

## NF-002 — Safe Dice Engine

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P0

COMPLEXITY:
M

SPIKE:
NO

1. USER PROBLEM

The app currently has initiative `rollD20()` logic, but no central safe dice parser/evaluator for checks, damage, future logs, or combat actions.

2. FINAL USER-VISIBLE FUNCTIONALITY

A GM can enter supported dice expressions such as `d20`, `2d6+3`, or future approved shorthand in a roll surface. The app validates the expression, rolls within explicit limits, shows individual dice and total, and rejects unsafe or unsupported input with a short error. Results can later be sent to the event log, but the dice engine itself must be usable and testable without UI decoration.

3. EXISTING FOUNDATION

`CampaignMapInitiativeModel.rollD20()` exists as a narrow initiative helper. `DND_CALCULATION_RULES.md` bans `eval`/arbitrary JS for game calculations. `CharacterModel` exposes DnD modifiers and check values through `calculateDndCheckValue()`.

4. REUSE

Reuse DnD calculation helpers for modifiers and keep the new dice evaluator pure enough for deterministic tests. Reuse existing Russian rules terminology when exposed in UI.

5. MUST NOT DUPLICATE

Do not leave separate random roll implementations in initiative/combat/log once the engine exists. Do not use `eval`, `Function`, user JavaScript, or arbitrary expression execution.

6. SYSTEM OWNER

A new rules/dice domain module should own parsing and evaluation. Initiative and future combat surfaces consume it.

7. DEPENDENCIES

NF dependencies: none for pure engine; `NF-003` depends on it for roll records. Architecture dependencies: `CharacterModel` modifiers, DnD calculation contract, existing initiative model.

8. DATA / PERSISTENCE

Dice expressions/results are runtime data until `NF-003`. Persistent roll event schema is `TBD — belongs to NF-003`.

9. UI SURFACE

Initial UI can be initiative/log/combat roll entry only after the engine exists. No separate permanent dice panel is required in this NF.

10. BROWSER / TAURI

Same behavior in browser and desktop. Randomness source and deterministic test injection must be explicit.

11. FAILURE / DATA SAFETY

Invalid expressions fail before rolling. Excessive dice counts/sides are blocked. Errors must not save partial roll records or mutate combat state.

12. IMPLEMENTATION ORDER

Define supported grammar and limits. Build pure parser/evaluator with injected RNG. Replace initiative `rollD20()` consumer only after tests prove parity. Add user-facing formatting helpers.

13. DEFINITION OF USABLE

Supported dice expressions produce deterministic tested structures with dice, modifiers, total, labels and readable validation errors.

14. REGRESSION PROTECTION

Unit tests for parser limits, deterministic RNG, invalid input, d20 parity and no unsafe execution. Browser tests only when a real UI consumer is promoted.

15. OPEN QUESTIONS

Which shorthand belongs in v1 beyond basic dice math is TBD. Advantage/disadvantage timing should align with combat action design.

## NF-003 — Event / Roll / Combat Log + Undo

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P0

COMPLEXITY:
L

SPIKE:
YES

1. USER PROBLEM

During a session, meaningful actions happen across dice, map, initiative, HP and effects, but the GM has no reviewable timeline or reliable undo path for session mistakes.

2. FINAL USER-VISIBLE FUNCTIONALITY

The GM sees a compact session log/timeline with roll results, combat turn changes, HP changes, effect changes and important map/combat actions. Each log item shows what happened, when, and which page/token/combatant it touched. Reversible actions expose `Undo` when a safe rollback exists. After reload, durable log entries remain available if the session is persistent; runtime-only preview noise does not appear in the log.

3. EXISTING FOUNDATION

`PageCommandService` command events and undo entries, `operationJournal`, `editorHistory`, `KnowledgeGraph` command bridge history, `CampaignMapInitiativeModel`, `CharacterModel.applyCharacterHealthChange()`, `writeQueue`, popup/status bar contracts.

4. REUSE

Reuse page command events for page mutations, editor history for page content undo, operation journal for recoverable workspace operations, and `NF-002` dice result structures.

5. MUST NOT DUPLICATE

Do not create a parallel page undo stack, a second operation journal, or a log that stores raw DOM snapshots of map/task/editor runtime UI.

6. SYSTEM OWNER

Session event/log domain should own event records. Page/storage owners still own page mutation rollback.

7. DEPENDENCIES

NF dependencies: `NF-001` for conflict-safe durable writes, `NF-002` for roll records. Architecture dependencies: page command lifecycle, editor history, CharacterModel, CampaignMapStore.

8. DATA / PERSISTENCE

Source of truth is `TBD — requires implementation design`. Candidate: workspace-level session log or combat-session-owned log. It must not be hidden inside arbitrary card HTML without a contract.

9. UI SURFACE

Bottom panel or explicit log view is the likely AppShell zone. Do not reuse the reserved right panel as a placeholder. Combat/map surfaces may show latest event snippets only when useful.

10. BROWSER / TAURI

Core log behavior should work in both. Tauri may later support file-backed append/atomic writes through the storage adapter; browser must use the same abstraction.

11. FAILURE / DATA SAFETY

If a log write fails, the user action result and log state must be clear. Undo must only appear when rollback has enough data. Failed undo creates an error event, not silent state drift.

12. IMPLEMENTATION ORDER

Design event schema and owner. Add append/read tests. Connect dice rolls. Connect HP/initiative actions. Add undo for one safe action type. Add UI only after model contract is stable.

13. DEFINITION OF USABLE

A GM can roll, change HP, advance initiative, reload the app, review those entries, and undo one supported reversible action without corrupting page/map state.

14. REGRESSION PROTECTION

Unit tests for event normalization, append ordering, rollback eligibility and failure states. Browser tests for log visibility, undo affordance and no runtime UI persistence.

15. OPEN QUESTIONS

Whether logs are workspace-wide, per combat session, or both is TBD. Retention/export behavior is TBD.

## NF-004 — Persistent Combat Session

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P1

COMPLEXITY:
L

SPIKE:
NO

1. USER PROBLEM

Current initiative can be stored in the map model, but a full encounter state with combatants, active turn and temporary session state is not yet a first-class reload-safe workflow.

2. FINAL USER-VISIBLE FUNCTIONALITY

The GM can start combat from selected map tokens or a map scene, keep participant order, active turn, round/turn position and key temporary combat state across reload, and end combat intentionally. After reload, the map and combat UI show the same active encounter. Ending combat asks what to keep or clear.

3. EXISTING FOUNDATION

`CampaignMapInitiativeModel`, `CampaignMapStore.setInitiative()`, map serializer/model `initiative` field, `campaignMapInitiativePopup.js`, `CharacterModel`, `campaignMapCharacterBridge.js`, `campaignMapDataSerializer.test.mjs`, `campaignMap-initiative.spec.mjs`.

4. REUSE

Reuse current map initiative model and token snapshots. Reuse `CampaignMapStore` for map-bound state until a separate combat owner is justified.

5. MUST NOT DUPLICATE

Do not create a second initiative model or a second combatant list unrelated to map tokens and character pages.

6. SYSTEM OWNER

Combat session domain owns combat lifecycle. Campaign Map owns map-bound persistence and visual token state.

7. DEPENDENCIES

NF dependencies: `NF-001` is required before persistent combat-session writes, because reload-safe combat state must not bypass page conflict protection. `NF-003` for session log is strongly recommended before broader combat persistence. Architecture dependencies: CampaignMapModel/Store, CharacterModel, writeQueue/PageCommandService save path.

8. DATA / PERSISTENCE

Current source of truth for initiative is the map model `initiative` JSON inside the campaign map page. Full combat session schema is `TBD — requires implementation design`; do not invent separate hidden files until owner boundary is chosen.

9. UI SURFACE

Campaign Map initiative popup/current map scene, plus a compact combat status surface. If a bottom/log panel exists from `NF-003`, it can show combat events.

10. BROWSER / TAURI

Same saved map behavior in both. Desktop does not add special combat authority yet.

11. FAILURE / DATA SAFETY

Missing token/page references must produce readable warnings and skip invalid participants, not break the whole map. Conflicts route through `NF-001`.

12. IMPLEMENTATION ORDER

Harden initiative persistence. Add combat session model wrapper. Add start/end lifecycle. Add reload tests. Connect log only after event schema exists.

13. DEFINITION OF USABLE

A GM can start combat from live map tokens, roll/set initiative, advance turns, reload, and continue from the same active participant.

14. REGRESSION PROTECTION

Unit: initiative/session model. Browser: start combat, reload, active participant, missing token behavior. Visual: combat status does not overload map toolbar.

15. OPEN QUESTIONS

Whether combat can exist without a campaign map is TBD. End-combat retention rules are TBD.

## NF-005 — Combat Action Pipeline

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P1

COMPLEXITY:
XL

SPIKE:
YES

1. USER PROBLEM

Attacks, checks, saves, damage and healing would otherwise become scattered button handlers across map popups, sheets and logs, making combat hard to test and undo.

2. FINAL USER-VISIBLE FUNCTIONALITY

The GM chooses a combatant/action, selects targets when needed, rolls or enters values, reviews the result, applies damage/healing/effects, and sees a single log entry. The pipeline shows each step clearly and allows cancel before apply. Applied actions update character/map state and participate in undo when safe.

3. EXISTING FOUNDATION

`CharacterModel`, `applyCharacterHealthChange()`, `PropertiesCalculationEngine`, `EffectsModel`, `CampaignMapTokenPopupController`, `CampaignMapSelectionInspector`, `CampaignMapStore`, initiative model, `PageCommandService`, `editorHistory`, `NF-002`, `NF-003`, `NF-004`.

4. REUSE

Reuse dice engine for rolls, CharacterModel for stat/effect reads, CampaignMapStore for target/token updates, and Event Log for audit/undo records.

5. MUST NOT DUPLICATE

Do not parse character HTML directly from map action buttons. Do not create ad hoc damage functions outside CharacterModel/Properties persistence.

6. SYSTEM OWNER

Combat action domain owns action state machine. CharacterModel owns character values. Campaign Map owns target selection and visual context.

7. DEPENDENCIES

NF dependencies: `NF-002`, `NF-003`, `NF-004`. `NF-007` can later supply richer targets/AoE. Architecture dependencies: CharacterModel, Properties, CampaignMapStore, PageCommandService.

8. DATA / PERSISTENCE

Applied results persist through affected character/card/map page saves and event log records. Action draft/transient step schema is `TBD`.

9. UI SURFACE

Combat/action panel or modal flow launched from map token/initiative/sheet surfaces. Do not add permanent dense controls to every token by default.

10. BROWSER / TAURI

Core action pipeline should match in both. Tauri-specific behavior only matters for file conflicts and future collaboration.

11. FAILURE / DATA SAFETY

If apply fails midway, rollback or recovery must be explicit. Multi-page actions require backup/journal decision under the lightweight operations contract.

12. IMPLEMENTATION ORDER

Define one action type end-to-end, likely HP damage/heal. Add action state model. Connect roll/input. Apply through CharacterModel. Log result. Add undo for that action.

13. DEFINITION OF USABLE

One real combat action can be selected, resolved, applied, logged, reloaded and undone without direct DOM mutation or hidden state drift.

14. REGRESSION PROTECTION

Unit: action state transitions, invalid target, roll integration, apply/rollback. Browser: map token action to character HP update and log. Storage: multi-write failure path.

15. OPEN QUESTIONS

Full DnD action taxonomy is TBD. Owner must choose which first action slice matters most after damage/healing foundation.

## NF-006 — Effects & Conditions Engine

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P1

COMPLEXITY:
L

SPIKE:
NO

1. USER PROBLEM

Effects and conditions already influence CharacterModel, but durations, expiry, combat timing and user-facing management are not yet a complete session workflow.

2. FINAL USER-VISIBLE FUNCTIONALITY

The GM can add/remove conditions or effects from a character/token, see how they change AC, speed, initiative and status summaries, choose duration/expiry where supported, and have them update during combat turns/rests. After reload, persistent effects remain. Temporary combat effects follow the combat session rules.

3. EXISTING FOUNDATION

`js/character/effectsModel.js`, `[data-character-effects]` JSON, `CharacterModel.getCharacterEffectsCombatSummary()`, `hasCharacterCondition()`, `PropertiesModel`, `ruleTreeProvider`, `characterIntegrationApi`, `campaignMapCharacterBridge.js`, `effectsModel.test.mjs`, `characterIntegrationApi.test.mjs`.

4. REUSE

Reuse `EffectsModel` and integration API. Reuse Rule Tree/World Package effects as sources. Reuse CharacterModel as the public read API.

5. MUST NOT DUPLICATE

Do not create a second condition store on tokens. Do not calculate effects in map UI by reading Russian labels from HTML.

6. SYSTEM OWNER

EffectsModel/CharacterModel owns effect semantics. Combat session owns temporary combat duration timing.

7. DEPENDENCIES

NF dependencies: `NF-004`/`NF-005` for combat expiry and action application, `NF-003` for log/undo. Architecture dependencies: CharacterModel, Properties, Rule Tree provider.

8. DATA / PERSISTENCE

Persistent character effects use existing `[data-character-effects]` / Properties-compatible source. Temporary combat effect schema is `TBD — tied to NF-004 session model`.

9. UI SURFACE

Properties/character sheet, map token inspector/actions, and combat action flow. Keep first layer compact; details live in inspector/popup.

10. BROWSER / TAURI

Same model behavior in both. Desktop storage conflicts still route through page save conflict handling.

11. FAILURE / DATA SAFETY

Unknown effects stay readable as diagnostics and must not be silently deleted. Invalid duration should block apply or fall back to no expiry with warning.

12. IMPLEMENTATION ORDER

Harden existing effects model. Add duration/expiry model. Add UI for add/remove one condition. Connect combat turn expiry. Add rest integration after `NF-008`.

13. DEFINITION OF USABLE

Adding a condition updates the sheet, map token summary and initiative/combat calculations, persists after reload, and can be removed or expire predictably.

14. REGRESSION PROTECTION

Unit: effects normalization, modifiers, conditions, integration sources, expiry. Browser: Properties to map token summary, add/remove effect, reload. Event log tests after `NF-003`.

15. OPEN QUESTIONS

Exact duration vocabulary and whether non-DnD custom conditions are in v1 are TBD.

## NF-007 — Range / Targeting / AoE

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P1

COMPLEXITY:
L

SPIKE:
YES

1. USER PROBLEM

The GM needs to know who can be targeted, how far objects are, and which tokens are inside an area without doing manual mental math during live play.

2. FINAL USER-VISIBLE FUNCTIONALITY

On the campaign map, the GM selects a range/target/AoE tool, chooses an origin token or point, sees distance/area preview on the existing map canvas, and gets highlighted valid targets. Applying an action can pass selected targets into the combat action pipeline. Temporary targeting previews disappear when canceled; persistent templates save only if the feature explicitly supports saved AoE objects.

3. EXISTING FOUNDATION

`campaignMapGeometry.js` has world/view rect, clamp, grid, token/shape rect and intersection helpers. `CampaignMapStore` owns tokens/shapes. `CampaignMapToolbarController` owns map tools. `CampaignMapSelectionInspector` owns selected object properties. `CampaignMapDragMeasure` and shape/drawing layers already render map overlays.

4. REUSE

Reuse existing map coordinate system, grid size, shape model where possible, toolbar sections and store mutations.

5. MUST NOT DUPLICATE

Do not create a parallel map renderer, parallel token list, or separate targeting coordinate system.

6. SYSTEM OWNER

Campaign Map owns targeting UI/geometry. Combat action pipeline consumes selected targets.

7. DEPENDENCIES

NF dependencies: can start as a map-only spike after current map stabilization; combat apply depends on `NF-005`. Architecture dependencies: CampaignMapModel/Store/Geometry, toolbar, selection inspector.

8. DATA / PERSISTENCE

Runtime targeting preview is not persistent. Saved AoE/template schema is `TBD — requires implementation design`; if persistent, it must extend current CampaignMapModel/serializer.

9. UI SURFACE

Existing map tool rail and canvas overlay, plus right-side Inspector only when a persistent template/object is selected.

10. BROWSER / TAURI

Same map UI in both. No Tauri-specific logic except storage/presentation sync when persistent objects are saved.

11. FAILURE / DATA SAFETY

Invalid or missing grid size should still show pixel/world measurement. Target selection must not mutate combat state until confirmed.

12. IMPLEMENTATION ORDER

Build measurement preview. Add token target detection. Add AoE shape preview. Connect saved template only if needed. Connect combat action targets after `NF-005`.

13. DEFINITION OF USABLE

The GM can measure range and preview an AoE on the existing map, see affected tokens, cancel without saving noise, and pass selected targets into one supported action.

14. REGRESSION PROTECTION

Unit: geometry/distance/intersection. Browser: map tool selection, preview, cancel, target highlighting, no persistent preview after reload. Visual: map toolbar remains compact.

15. OPEN QUESTIONS

Exact DnD grid/diagonal rule and which AoE shapes ship first are TBD.

## NF-008 — Short / Long Rest

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P2

COMPLEXITY:
M

SPIKE:
YES

1. USER PROBLEM

After encounters, the GM needs a safe way to refresh HP/resources/effects without manually editing many fields and losing what changed.

2. FINAL USER-VISIBLE FUNCTIONALITY

From a character sheet/combat surface, the GM chooses short rest or long rest, reviews before/after changes, confirms, and sees affected HP, temp HP, effects and future resources update. The action logs what changed and can be undone when rollback data exists. After reload, confirmed rest changes persist.

3. EXISTING FOUNDATION

`CharacterModel`, `PropertiesModel`, `PropertiesCalculationEngine`, `EffectsModel`, `InventoryModel`, `applyCharacterHealthChange()`, DnD calculation contract. No full resource/rest domain exists yet.

4. REUSE

Reuse CharacterModel and Properties. Reuse event log/undo when available. Reuse EffectsModel for expiry/removal.

5. MUST NOT DUPLICATE

Do not create rest-specific copies of HP/resource fields outside Properties/CharacterModel.

6. SYSTEM OWNER

CharacterModel/rest domain owns rest rules. Properties owns stored character inputs.

7. DEPENDENCIES

NF dependencies: `NF-006` for effect expiry, `NF-003` for log/undo. Combat-surface rest actions also require `NF-005`; the first usable slice should stay character-sheet/Properties-first until the combat action pipeline exists. Architecture dependencies: CharacterModel, Properties, EffectsModel.

8. DATA / PERSISTENCE

Source of truth remains character page Properties/effects. Resource model beyond HP/effects is `TBD`.

9. UI SURFACE

Character sheet/Properties action and optional combat session action. Preview should be a dialog or inspector-like review, not permanent text on the sheet.

10. BROWSER / TAURI

Same logic in both. Tauri only affects conflict-safe writes.

11. FAILURE / DATA SAFETY

No auto-apply without preview for multi-field changes. If a character page save fails, do not partially claim rest completed.

12. IMPLEMENTATION ORDER

Define HP/effect-only rest slice. Add preview model. Apply to one character. Add multi-character only after single-character undo/save is reliable.

13. DEFINITION OF USABLE

A GM can apply a long rest to one character, review changes first, save/reload, and undo if supported by the log/command layer.

14. REGRESSION PROTECTION

Unit: rest calculation, effect expiry, HP bounds. Browser: character sheet rest preview/apply/reload. Storage: failed save rollback.

15. OPEN QUESTIONS

Spell slots/class resources are not modeled yet; whether v1 includes them is TBD.

## NF-009 — Adaptive Token UI

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P2

COMPLEXITY:
M

SPIKE:
NO

1. USER PROBLEM

Map tokens already expose health, effects and actions, but the UI can become noisy if every possible control is shown all the time.

2. FINAL USER-VISIBLE FUNCTIONALITY

Tokens show compact controls based on current context: selected token, current map tool, combat state, player visibility, token type and health/effect state. Hover/right-click/Inspector surfaces reveal details when needed. Controls must stay icon-first and readable without permanent text clutter.

3. EXISTING FOUNDATION

`campaignMapCharacterBridge.js` creates token snapshots with HP/AC/speed/initiative/effects. `campaignMapTokenPopupController.js`, `CampaignMapSelectionInspector`, `CampaignMapToolbarController`, `CampaignMapStore`, `campaignMapHealth.js`, design-system map toolbar/Inspector contracts.

4. REUSE

Reuse existing token popup, right-click menu, selection Inspector and local sprite icon style.

5. MUST NOT DUPLICATE

Do not add a second floating token HUD independent of the current token popup/Inspector unless the existing surfaces cannot support the workflow.

6. SYSTEM OWNER

Campaign Map UI owns token adaptive presentation. CharacterModel owns token stats.

7. DEPENDENCIES

NF dependencies: benefits from `NF-004` combat session, `NF-006` effects and `NF-007` targeting. Architecture dependencies: map popup/Inspector, CampaignMapStore, CharacterModel.

8. DATA / PERSISTENCE

Mostly runtime UI state. Persistent changes still go through token/map model or character page model. UI adaptation rules are not persistent unless owner approves user preferences later.

9. UI SURFACE

Map tokens, token popup, object context menu and right-side selected-object Inspector.

10. BROWSER / TAURI

Same UI. Desktop presentation/player visibility must remain compatible with existing presentation privacy model.

11. FAILURE / DATA SAFETY

If character snapshot is missing, token falls back to safe generic controls. UI state must not save runtime controls into map HTML.

12. IMPLEMENTATION ORDER

Inventory current token controls. Define context states. Convert one noisy control group to adaptive display. Add combat/targeting states only after dependencies exist.

13. DEFINITION OF USABLE

Selecting or right-clicking a token shows the right small controls for that token/context without hiding essential actions or cluttering the map.

14. REGRESSION PROTECTION

Browser: token hover/right-click/selection, hidden player token behavior, no runtime UI persistence. Visual: toolbar/Inspector remain compact.

15. OPEN QUESTIONS

Which token states deserve first-layer controls versus details in the Inspector is TBD.

## NF-010 — Map Pings

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P2

COMPLEXITY:
S

SPIKE:
NO

1. USER PROBLEM

During live play, the GM needs to draw attention to a map point without creating a permanent map object or moving tokens.

2. FINAL USER-VISIBLE FUNCTIONALITY

The GM activates a ping command or shortcut, clicks a map point, and a temporary visible marker appears on the GM map and, when presentation is open, the player view. The ping fades/clears automatically and is not saved into the map page. Later collaboration may route pings from players through the local-hosted session.

3. EXISTING FOUNDATION

Campaign Map stage coordinate helpers in `campaignMapGeometry.js`, presentation sync/channel files, map toolbar/tool rail, runtime overlay rules, presentation privacy model.

4. REUSE

Reuse current map/presentation coordinate conversion and runtime overlay cleanup. Use local sprite/icon language if a toolbar entry is needed.

5. MUST NOT DUPLICATE

Do not create ping as a saved shape/token. Do not make a new presentation transport just for pings.

6. SYSTEM OWNER

Campaign Map runtime owns pings. Presentation mode consumes runtime ping events.

7. DEPENDENCIES

NF dependencies: none for local GM pings; player-origin pings depend on `NF-014`/`NF-015`. Architecture dependencies: Campaign Map geometry, presentation sync.

8. DATA / PERSISTENCE

Runtime-only event. No persistent map data unless owner later asks for annotations.

9. UI SURFACE

Map tool rail shortcut/button and map canvas marker. Presentation window displays synchronized marker.

10. BROWSER / TAURI

Browser and Tauri should both support GM-origin pings. Tauri-specific multi-window transport must use existing presentation channel.

11. FAILURE / DATA SAFETY

If presentation is not open, ping only appears on GM map. If sync fails, do not save ping as fallback.

12. IMPLEMENTATION ORDER

Add runtime marker model. Add map click/shortcut. Add presentation sync. Add cleanup/lifetime tests.

13. DEFINITION OF USABLE

A GM can ping a map point, see a temporary marker, have it appear in presentation, and reload without ping artifacts.

14. REGRESSION PROTECTION

Browser: ping marker lifecycle, no saved HTML/data, presentation sync. Visual: marker visible but not distracting.

15. OPEN QUESTIONS

Exact input gesture and player-origin ping permission are TBD.

## NF-011 — Scene Transitions

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P2

COMPLEXITY:
L

SPIKE:
YES

1. USER PROBLEM

Switching between scenes/maps for players is currently functional but not a deliberate GM workflow with controlled transition state.

2. FINAL USER-VISIBLE FUNCTIONALITY

The GM can prepare/switch the active presentation scene, decide what players see during the switch, and keep map state consistent. The UI shows current scene/presentation state without adding duplicate stage panels. After reload, saved scene state remains correct where it is persistent; runtime transition effects do not pollute map data.

3. EXISTING FOUNDATION

Campaign Map presentation files, `presentationEntry.js`, `CampaignMapModel` data-first direction, `DESKTOP_PRESENTATION_WINDOW_SPIKE.md`, map toolbar scene/session bar, World tree pages for maps.

4. REUSE

Reuse existing presentation window/channel and campaign map pages. Use PageRepository for map/page lookup if scene switching searches pages.

5. MUST NOT DUPLICATE

Do not recreate retired scene-state inspector panels. Do not create a parallel "scene list" if world tree/page model already owns map pages.

6. SYSTEM OWNER

Campaign Map/presentation owns scene transition workflow. PageRepository owns page lookup.

7. DEPENDENCIES

NF dependencies: `NF-004` if scene switch must preserve active combat; presentation model-first hardening is recommended. Architecture dependencies: presentation channel, CampaignMapModel, AppShell/tool rail.

8. DATA / PERSISTENCE

Persistent scene state is current map page/model. Transition runtime state is not persistent. Any saved transition preset schema is `TBD`.

9. UI SURFACE

Map scene/session bar and presentation controls. Avoid permanent duplicate panels over the stage.

10. BROWSER / TAURI

Browser popup and Tauri presentation window must both handle scene switch. Tauri window cannot rely on master DOM access; data-first payload is preferred.

11. FAILURE / DATA SAFETY

If new scene cannot load, keep current presentation stable and show a status error. Do not show hidden GM-only map state to players.

12. IMPLEMENTATION ORDER

Audit current presentation payload. Add scene switch state model. Add safe switch action. Add player-view fallback. Add transition effect only after state correctness.

13. DEFINITION OF USABLE

The GM can switch from one map scene to another in presentation without stale tokens/fog or duplicate stage UI, and reload keeps saved map data correct.

14. REGRESSION PROTECTION

Browser: presentation switch, hidden token privacy, reload. Desktop: native presentation window smoke. Visual: no retired scene/layer panels.

15. OPEN QUESTIONS

Whether transitions are simple cuts/fades or include prepared scene queue is TBD.

## NF-012 — Walls / Doors / Windows / Light / Vision

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P2

COMPLEXITY:
XL

SPIKE:
YES

1. USER PROBLEM

The map can show fog and objects, but it does not model barriers, portals, light sources or token vision, so player visibility requires manual work.

2. FINAL USER-VISIBLE FUNCTIONALITY

The GM can draw/edit walls, doors, windows and light/vision sources on the existing campaign map. Player/presentation view respects visibility rules. Doors/windows have explicit states. The GM can preview player vision without exposing hidden GM data. Reload preserves authored map visibility data.

3. EXISTING FOUNDATION

`CampaignMapModel` has map asset, grid, fog, view, layers, tokens, shapes, initiative and music. `CampaignMapGeometry` owns coordinate helpers. `CampaignMapFog` and `CampaignMapLayers` exist. Presentation mode has a separate runtime and privacy file. `WORKSPACE_SCHEMA_CONTRACT.md` validates map data shape.

4. REUSE

Reuse CampaignMapModel/Store/serializer and current layers/fog/presentation privacy. Use current map tool rail for authoring tools.

5. MUST NOT DUPLICATE

Do not plan a second campaign map or a new persistent map format just because renderer work may become hard.

6. SYSTEM OWNER

Campaign Map owns both data model and renderer integration, but those must be designed separately.

7. DEPENDENCIES

NF dependencies: benefits from `NF-007` geometry/targeting. Architecture dependencies: CampaignMapModel/Store/serializer, fog/layers, presentation privacy.

8. DATA / PERSISTENCE

DATA MODEL: `TBD — requires implementation design`, but it must extend the current CampaignMapModel/serializer contract if persisted.

RENDERER: `TBD — requires renderer spike`. New renderer choice does not automatically change persistent format.

9. UI SURFACE

Map tool rail for wall/door/window/light tools, right-side Inspector for selected visibility object, and presentation/player preview controls.

10. BROWSER / TAURI

Browser and desktop must render the same saved visibility data. Performance may differ; renderer spike must test both.

11. FAILURE / DATA SAFETY

Invalid visibility data should disable dynamic vision with diagnostics, not destroy map data. Hidden GM-only data must not leak into player view.

12. IMPLEMENTATION ORDER

Data model spike. Renderer feasibility spike. Persist one wall/door object. Add editor controls. Add vision preview. Add presentation privacy tests.

13. DEFINITION OF USABLE

One map can save/reload walls and a door, a token vision preview respects them, and presentation/player view hides what should be hidden.

14. REGRESSION PROTECTION

Unit: geometry/visibility model. Browser: author/reload, door state, player preview. Performance: large map visibility budget. Desktop: presentation smoke.

15. OPEN QUESTIONS

Renderer backend, exact visibility algorithm, diagonal/grid rules, and how much dynamic lighting ships in first usable slice are TBD.

## NF-013 — Local Compendium

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P1

COMPLEXITY:
L

SPIKE:
YES

1. USER PROBLEM

The GM needs a reusable local library of rules/items/monsters/content that can be searched, referenced and imported into a world without mixing library sources with campaign-local cards.

2. FINAL USER-VISIBLE FUNCTIONALITY

The GM opens a local compendium/search surface, browses entries with source/local-copy state, opens read-only references, and imports or copies selected entries into the current world through a preview. Imported content uses existing page/world package safety rules. Rules remain linkable through wiki-links/internal rules where appropriate.

3. EXISTING FOUNDATION

`rulesWorkspace/` provides internal read-only rules. `RuleTreeModel` and `ruleTreePackageStorage.js` handle rule packages in `rule-packages/`. `WorldPackage` handles portable world pages/assets/rulePackages in `world-packages/`. `PageRepository` handles world page lookup/search. `World Package Contract` already defines import preview, conflicts, backups and asset payloads.

4. REUSE

Reuse Rule Workspace for internal rules, Rule Packages for rule bundles, World Package for portable world content, PageRepository for world lookup, and backup-gated import preview.

5. MUST NOT DUPLICATE

Do not create a second package ecosystem unless a spike proves existing Rule/World packages cannot represent the content. Do not create a second page tree for compendium entries.

6. SYSTEM OWNER

Compendium search/import domain should coordinate existing content sources. Rule Workspace/Rule Packages/World Package keep their storage ownership.

7. DEPENDENCIES

NF dependencies: `NF-001` recommended before bulk imports. Architecture dependencies: Rule Workspace, Rule Packages, World Package, PageRepository, safe HTML, backup gate.

8. DATA / PERSISTENCE

Source of truth remains existing package/page formats where possible. Any compendium index/cache schema is `TBD — requires proof it is not duplicating packages`.

9. UI SURFACE

Initial entry path: Tools opens a local `Компендиум` manager, following the existing World Package manager pattern. Command palette/deep search integration can link to it later after the source model is stable. Imports must use preview/apply states like World Package manager.

10. BROWSER / TAURI

Browser and desktop can read local package/page sources through StorageAdapter. Tauri may have easier filesystem access, but the contract must stay storage-adapter based.

11. FAILURE / DATA SAFETY

Import conflicts, missing assets and unsafe HTML must block or warn through existing World Package rules. Read-only internal rules must not be edited as world cards.

12. IMPLEMENTATION ORDER

Inventory existing sources. Define compendium source model. Build read/search view. Add read-only entry open. Add import preview by delegating to World/Rule package paths.

13. DEFINITION OF USABLE

The GM can find a local rule/item/monster entry, open it safely, import/copy it into the world with conflict preview, and link to it afterward.

14. REGRESSION PROTECTION

Unit: source normalization/search, package delegation. Browser: search/open/import preview/apply. Storage: backup-gated import and no overwrite.

15. OPEN QUESTIONS

Which content types belong in v1 compendium and whether monsters/items are packages or ordinary page templates are TBD.

## NF-014 — Local-hosted Collaborative Session

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P2

COMPLEXITY:
XL

SPIKE:
YES

1. USER PROBLEM

The GM may want players to connect locally for presentation/companion interactions without turning MyOwnWorld into cloud SaaS.

2. FINAL USER-VISIBLE FUNCTIONALITY

The desktop GM app can start a local-hosted authoritative session. Players connect from the local network to a limited player-facing surface. The GM controls what is shared. The GM workspace remains source of truth. Session start/stop status is visible, and failure states explain network/permission problems.

3. EXISTING FOUNDATION

Tauri backend currently exposes filesystem and asset-scope commands in `src-tauri/src/main.rs`; no local web server/session authority exists. Browser storage adapter exists. Presentation mode has a BroadcastChannel-based window runtime. `BACKEND_STORAGE_API_PLAN.md` keeps cloud/server as future-only.

4. REUSE

Reuse local-first StorageAdapter/Tauri boundary and presentation privacy ideas. Reuse campaign map presentation payloads where possible.

5. MUST NOT DUPLICATE

Do not design cloud SaaS, remote account auth, or a second backend storage API for this NF. Do not bypass Tauri command security assumptions.

6. SYSTEM OWNER

Desktop/session networking owner is `TBD`. Tauri boundary must own native host capability if implemented.

7. DEPENDENCIES

NF dependencies: `NF-001` for conflict-safe writes, `NF-003` for session events if actions are accepted from clients, and presentation privacy hardening. Architecture dependencies: Tauri commands, storage adapter, presentation payloads.

8. DATA / PERSISTENCE

GM workspace remains durable source of truth. Network session state schema is `TBD — spike required`. Client state should be ephemeral unless promoted through authoritative GM actions.

9. UI SURFACE

GM session host controls in desktop Tools/Presentation/Map context. Player UI is limited and separate from GM workbench.

10. BROWSER / TAURI

Hosting is desktop/Tauri-specific unless a future browser-only local server path is proven. Browser clients may connect as players. Security and network behavior are TBD; do not claim secure multiplayer before implementation research.

11. FAILURE / DATA SAFETY

Network unavailable, firewall, stale clients, unauthorized local access and partial message delivery must fail visibly. Hidden GM data must never be sent to player clients by default.

12. IMPLEMENTATION ORDER

Spike Tauri local host capability and threat model. Define GM authority/session messages. Expose read-only player map state first. Only then consider player actions.

13. DEFINITION OF USABLE

On a local network, the GM starts a session, a player opens a limited companion surface, sees only approved state, and disconnect/reconnect does not corrupt the workspace.

14. REGRESSION PROTECTION

Spike tests for Tauri host command, message schema, privacy filtering and disconnect. Desktop manual smoke is mandatory.

15. OPEN QUESTIONS

Transport, host port selection, permissions, player identity, LAN security posture and whether non-desktop hosting exists are TBD.

## NF-015 — Mobile Player Companion

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P2

COMPLEXITY:
L

SPIKE:
YES

1. USER PROBLEM

Players need a simple mobile view for session participation, but the desktop GM app should stay a dense workbench.

2. FINAL USER-VISIBLE FUNCTIONALITY

On a phone, a player can open a companion page connected to the GM session and view only approved player-facing map/session/character snippets. The first usable companion is read-only. Player actions are deferred until `NF-014` authority, permissions and an owner-selected action are defined. The desktop GM UI does not become mobile-first.

3. EXISTING FOUNDATION

Responsive UI work exists for app shell tests, presentation mode exists, and `NF-014` is the likely local-hosted session foundation. There is no player companion app/surface yet.

4. REUSE

Reuse presentation/player visibility payloads, local-hosted session authority, and design-system responsive tokens. Reuse player privacy rules.

5. MUST NOT DUPLICATE

Do not create a full mobile GM editor. Do not fork the whole app shell into a second product.

6. SYSTEM OWNER

Player companion surface owner is `TBD`; it should consume GM-authoritative session data.

7. DEPENDENCIES

NF dependencies: `NF-014` first. `NF-010` player pings and selected combat/player actions can come later. Architecture dependencies: presentation privacy, responsive shell primitives.

8. DATA / PERSISTENCE

Companion state should be session/runtime by default. Persistent writes, if any, must route through authoritative GM session actions and existing storage commands.

9. UI SURFACE

Mobile player web surface, not desktop AppShell. Desktop keeps GM controls.

10. BROWSER / TAURI

Likely browser client connecting to Tauri-hosted local session. Offline standalone mobile is out of scope unless separately approved.

11. FAILURE / DATA SAFETY

Lost connection, stale view, denied action and hidden data filtering must be explicit. Companion must not expose GM-only pages/map objects.

12. IMPLEMENTATION ORDER

Define player data contract. Build read-only mobile presentation. Add reconnect/status. Defer writable player actions to a later promoted slice after host authority is proven and the owner chooses the first action.

13. DEFINITION OF USABLE

A player can join from a phone, see approved read-only session state clearly, reconnect safely, and never see GM-only data.

14. REGRESSION PROTECTION

Browser responsive tests, privacy payload tests, disconnect/reconnect manual smoke, no desktop layout regression.

15. OPEN QUESTIONS

Authentication/identity, character ownership and any future player actions are TBD after the read-only companion slice.

## NF-016 — Declarative Extension API

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P3

COMPLEXITY:
XL

SPIKE:
YES

1. USER PROBLEM

Future content/rules/features may need extension points, but arbitrary plugin code would be unsafe and would blur ownership across the app.

2. FINAL USER-VISIBLE FUNCTIONALITY

Users can install/import approved local declarative packages that add safe data: rule entries, property schemas, effect definitions, templates, icon/source metadata or compendium entries. The app previews declared capabilities before apply and refuses unsupported capabilities. No arbitrary JavaScript execution is available in v1.

3. EXISTING FOUNDATION

Rule Packages, World Package model/import preview, `characterIntegrationApi`, Rule Tree engine/effects, Properties schema/model, Safe HTML boundary, storage adapter, package conflict handling.

4. REUSE

Reuse Rule Package/World Package manifests and import preview. Reuse existing integration API for character effects. Reuse schema validation and backup gates.

5. MUST NOT DUPLICATE

Do not introduce arbitrary JS/plugin execution, a second package manager, or a separate unsafe extension store.

6. SYSTEM OWNER

Extension contract owner is `TBD`; package storage remains under Rule/World Package owners.

7. DEPENDENCIES

NF dependencies: `NF-013` should clarify compendium/package source model first. Architecture dependencies: Rule Packages, World Package, Properties, CharacterIntegrationAPI, Safe HTML.

8. DATA / PERSISTENCE

Declarative package manifests are source of truth. Exact capability schema is `TBD — requires implementation design`.

9. UI SURFACE

Package/compendium manager preview with capability list, warnings and apply/rollback states.

10. BROWSER / TAURI

Same declarative package behavior through StorageAdapter. Tauri does not grant extra arbitrary execution rights.

11. FAILURE / DATA SAFETY

Unsupported capabilities block. Malformed packages do not partially apply. Unsafe HTML/scripts are rejected by Safe HTML and package validation.

12. IMPLEMENTATION ORDER

Define allowed declarative capabilities. Add validator. Add preview. Support one capability end-to-end, likely rule/effect or property schema. Add rollback/import safety.

13. DEFINITION OF USABLE

A package can declare one supported capability, preview cleanly, apply safely after backup if needed, and be rejected with clear diagnostics if unsupported.

14. REGRESSION PROTECTION

Unit: manifest validation, unsupported capabilities, conflict handling. Browser: preview/apply/reject. Security: no script execution and sanitizer coverage.

15. OPEN QUESTIONS

First allowed capability, package signing/trust language and uninstall/disable behavior are TBD.

## NF-017 — Optional 3D Dice Visualizer

STATUS:
PLAN ONLY

OWNER DECISION:
ARCHITECTURE INFERENCE

PRIORITY:
P3

COMPLEXITY:
M

SPIKE:
YES

1. USER PROBLEM

Dice rolls can feel flat in presentation/live play, but visual dice must not become the source of game truth.

2. FINAL USER-VISIBLE FUNCTIONALITY

When a roll is made through the Safe Dice Engine, an optional visual layer can animate dice for the GM/presentation view and then display the already-determined result. Disabling the visualizer keeps all dice/log/combat behavior identical.

3. EXISTING FOUNDATION

No 3D dice renderer exists. `NF-002` should provide roll results. `NF-003` should log roll events. Presentation mode exists. Current dependency set has no Three.js or dice-rendering package.

4. REUSE

Reuse Dice Engine results and Event Log records. Reuse presentation/overlay surfaces for display.

5. MUST NOT DUPLICATE

Do not let the 3D visualizer generate or replace game results. Do not add a decorative dependency before dice/log foundations are stable.

6. SYSTEM OWNER

Presentation/visual layer owns animation. Dice Engine owns results.

7. DEPENDENCIES

NF dependencies: `NF-002` and `NF-003`. Architecture dependencies: presentation mode, reduced-motion design contract, possible future rendering spike.

8. DATA / PERSISTENCE

No gameplay data source of truth. User visual preference schema is `TBD` if settings are added.

9. UI SURFACE

Optional roll animation overlay in GM/presentation view. Settings toggle only if the feature ships.

10. BROWSER / TAURI

Must work or gracefully disable in both browser and Tauri. Performance/gpu availability must be checked.

11. FAILURE / DATA SAFETY

If renderer fails, roll result/log still completes. Reduced motion disables animation. No map/editor performance degradation.

12. IMPLEMENTATION ORDER

Wait for dice/log. Spike renderer performance. Add non-authoritative animation from existing result. Add setting/reduced-motion fallback.

13. DEFINITION OF USABLE

Dice rolls still resolve through NF-002, log through NF-003, and optionally display a polished animation that can fail without affecting gameplay.

14. REGRESSION PROTECTION

Unit: visualizer consumes fixed result only. Browser: animation disabled/enabled, reduced motion, failure fallback. Performance: no slow map/editor render.

15. OPEN QUESTIONS

Renderer dependency, visual style and whether this belongs in v1 are TBD.

## Rejected For Now

| Idea | Reason |
| --- | --- |
| Ctrl+drag creature duplication | Too easy to trigger accidentally and duplicates should be designed through an explicit safe action. Do not return this as a recommended shortcut. |
| User-configurable health-stage system | Too much rules complexity before the core combat/effects model exists. Do not return this as a recommended v1 health model. |
