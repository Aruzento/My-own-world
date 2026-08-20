---
summary: "Single active master roadmap for MyOwnWorld implementation work."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---

# Project Plan

Updated: 2026-08-20

Planning version: 2

This file is the only active implementation roadmap for MyOwnWorld. Completed history lives in [WORK_LOG.md](./WORK_LOG.md). Superseded plans live in [docs/archive](../archive/README.md) and are historical only.

## Current State

`0.0.1.8.18` is `DONE` by explicit owner waiver recorded on 2026-08-10.

Owner decision: the current design is accepted for this product stage. The failed Visual Critic evidence from `0.0.1.8.18.6` remains valid historical evidence and future polish debt, but it no longer blocks development. This does not mean the design is final, the critic was wrong, or every finding was fixed. It means the UI is sufficient to continue product work now.

Current phase: `0.0.1.11.0` Existing P1 Stabilization is `ACTIVE`.

Current leaf: `0.0.1.11.3` `BI-011` Creature Skills Encoding is `FIXED`. `BI-022` current human-facing P1 regression bundle is `DONE`. Next leaf is `0.0.1.11.4` Large Workspace UX.

Important stop note: `RCB-021`, `RCB-001`, `RCB-001B`, `RCB-002`, `RCB-003`, `RCB-022`, `RCB-004`, `RCB-005`, `RCB-016`, `RCB-023`, `RCB-024`, `RCB-025`, `RCB-006A`, `RCB-006B`, `RCB-006C`, `RCB-006D`, `RCB-007A`, `RCB-007B`, `RCB-007C`, `RCB-007D`, `RCB-026`, `RCB-027`, `RCB-017`, `RCB-018`, `RCB-019`, `RCB-028`, `RCB-008`, `RCB-009`, `RCB-010`, `RCB-020`, `RCB-011`, `RCB-012`, `RCB-013`, `RCB-014`, `RCB-015`, `RCB-029` and `RCB-030` are closed. `RCB-006`, `RCB-007` and `0.0.1.10.0` are closed after the corrective final gate. Work one `0.0.1.11.0` stabilization leaf at a time and stop after each focused commit.

## Execution Rules

1. Work strictly in active plan order.
2. Only one major phase may be `ACTIVE` at a time.
3. Inside a major phase, work on one leaf implementation slice at a time.
4. Do not start the next phase until the current phase exit criteria are met.
5. Do not implement `LATER` or spike-only ideas "also".
6. Adjacent bugs may be fixed only if reproduced, low-risk, inside the current subsystem and not expanding architecture scope. Otherwise, record or keep them in [BUGS_AND_IMPROVEMENTS_BACKLOG.md](./BUGS_AND_IMPROVEMENTS_BACKLOG.md).
7. Do not create a second owner for an existing system.
8. Inspect the current repository before designing new architecture.
9. Do not invent a schema, API, dependency or subsystem without evidence.
10. If an unusual action is needed, stop and ask the owner first.

Unusual actions include new production dependencies, rendering engine changes, networking/server architecture, data format migrations, destructive cleanup, mass file movement outside an explicitly authorized archive task, new external services, large binary assets, arbitrary plugin execution and architecture rewrites.

## Status Model

Allowed roadmap statuses:

- `DONE`
- `ACTIVE`
- `NEXT`
- `BLOCKED`
- `LATER`
- `SPIKE`
- `OWNER REVIEW`

Readiness levels for completed work still come from [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md): `Foundation`, `MVP`, `Usable`, `Release-ready`.

## Roadmap

### Phase 0 - 0.0.1.8.18 Owner Design Correction & Evidence Gate

ID: `0.0.1.8.18`

NAME: Owner Design Correction & Evidence Gate

STATUS: `DONE`

GOAL: close the owner design correction gate without pretending the visual quality bar is final.

WHY NOW: the blocked Visual Critic gate prevented non-design work even though the owner accepted the current design for this stage.

SCOPE: record owner waiver; keep Visual Critic report as evidence; move future design polish to a late product-polish phase; archive superseded planning files.

DEPENDENCIES: completed leaves `0.0.1.8.18.1` through `0.0.1.8.18.8`; owner waiver on 2026-08-10.

EXIT CRITERIA: owner waiver recorded; `0.0.1.9.0` unlocked; no product implementation started during closure.

### Phase 1 - 0.0.1.9.0 Repository Audit

ID: `0.0.1.9.0`

NAME: Repository Architecture / Maintainability / AI-Slop Audit

STATUS: `DONE`

GOAL: understand real repository health before new feature work.

WHY NOW: recent UI/design work touched many surfaces; the next product phases will be safer if duplicate ownership, dead code and AI-slop patterns are identified first.

SCOPE: audit-only review for dead code, duplicate ownership, mini design systems, duplicated generic utilities, god-files, over-fragmentation, listener lifecycle, CSS debt, accessibility debt, test/documentation slop, data ownership, unsafe write paths, performance risks, generated/debug artifacts and recent editor/header runtime logic. Reconcile current [BUG_INVENTORY.md](./BUG_INVENTORY.md) items as current/stale/promoted/deferred before cleanup or new product work.

DEPENDENCIES: `0.0.1.8.18` owner waiver and closure.

EXIT CRITERIA: closed at audit-only `Foundation` on 2026-08-11. Evidence: [REPOSITORY_MAINTAINABILITY_AUDIT_0.0.1.9.0.md](../02-architecture/REPOSITORY_MAINTAINABILITY_AUDIT_0.0.1.9.0.md), [REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md](../02-architecture/REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md), [REPOSITORY_CLEANUP_BACKLOG.md](./REPOSITORY_CLEANUP_BACKLOG.md). The audit classifies findings, reconciles bug/backlog state, assesses NF readiness and creates an owner-review cleanup gate. No mass cleanup or product feature implementation was performed.

### Phase 1A - 0.0.1.9.1 Audit Completeness Verification

ID: `0.0.1.9.1`

NAME: Audit Completeness Verification

STATUS: `DONE`

GOAL: prove whether the `0.0.1.9.0` audit covered the first-party repository well enough before cleanup starts.

WHY NOW: owner review found the original coverage ledger too aggregated. Cleanup should not start until the project can prove what was reviewed and whether any P1/P2 blind spots were missed.

SCOPE: docs/evidence-only completeness pass: current HEAD review, granular file/family coverage ledger, second blind sweep, previous P1 recheck, no-P0 challenge, source-of-truth map, write-path map, recent UI polish review and three read-only independent reviewers.

DEPENDENCIES: `0.0.1.9.0` audit artifacts.

EXIT CRITERIA: closed at audit-only `Foundation` on 2026-08-11. Result: `C - AUDIT HAD MATERIAL BLIND SPOTS`. Evidence was appended to [REPOSITORY_MAINTAINABILITY_AUDIT_0.0.1.9.0.md](../02-architecture/REPOSITORY_MAINTAINABILITY_AUDIT_0.0.1.9.0.md), [REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md](../02-architecture/REPOSITORY_AUDIT_COVERAGE_0.0.1.9.0.md) and [REPOSITORY_CLEANUP_BACKLOG.md](./REPOSITORY_CLEANUP_BACKLOG.md). New P1 findings RA-021 and RA-022 were recorded. No production cleanup, product functionality or real workspace mutation was performed.

### Phase 2 - 0.0.1.10.0 Repository Cleanup & Consolidation

ID: `0.0.1.10.0`

NAME: Repository Cleanup & Consolidation

STATUS: `DONE`

GOAL: perform only owner-approved cleanup from the audit.

WHY NOW: cleanup must be based on evidence, not taste. It should follow the audit and owner review.

SCOPE: correctness/data-safety ownership, dead/debug artifacts, duplicate infrastructure, duplicate utilities, CSS/design-system debt, listener lifecycle debt, god-files/over-fragmentation, tests and docs. Include `BI-024`, `BUG-012` or `BUG-014` only if the audit confirms recurring docs/status drift or owner-approved local-file cleanup.

DEPENDENCIES: Phase 1 audit; Phase 1A completeness verification; owner review approval of cleanup slices from [REPOSITORY_CLEANUP_BACKLOG.md](./REPOSITORY_CLEANUP_BACKLOG.md). Owner approved starting this cleanup phase on 2026-08-11, and the corrective final gate closed it on 2026-08-20.

EXIT CRITERIA: closed on 2026-08-20 after each approved cleanup slice received focused regression coverage, no product functionality was added, persistent format stayed unchanged, independent reviewers passed, and fresh full verification passed: unit, browser, visual evidence, `npm run verify`, UI polish, docs, encoding, desktop gate, native click-through and real large-workspace smoke on `X:\ДНД\Мастер\По кампаниям\База`.

### Phase 3 - 0.0.1.11.0 Existing P1 Stabilization

ID: `0.0.1.11.0`

NAME: Existing P1 Stabilization

STATUS: `ACTIVE`

GOAL: close or deliberately reclassify the known user-visible P1/P2 stabilization items before live-session features.

WHY NOW: new session/combat work should not sit on top of known map and regression fragility.

SCOPE: `BI-003`, `BI-008`, `BI-009`, `BI-010`, `BI-011`, `BI-022`; current P1 bug-inventory items if still reproduced after Phase 1 audit, especially `BUG-001`, `BUG-003`, `BUG-004`, `BUG-005`, `BUG-006`, `BUG-007`, `BUG-008` and `BUG-009`. Reproduce or verify current user-visible stabilization issues, close the P1 regression bundle when its real children are closed, and decide whether small Campaign Map usability fixes belong here or later. First owner-selected leaf: `0.0.1.11.1` Workspace Switch Access.

DEPENDENCIES: Phase 2 cleanup is closed. Owner started this phase on 2026-08-20. Do not start Phase `0.0.1.12.0`.

EXIT CRITERIA: each included BI has a current repro/result, root cause where applicable, regression target and final disposition; no P1 item stays indefinitely "ready" without a decision.

CURRENT LEAF RESULTS:

- `0.0.1.11.1` Workspace Switch Access - `FIXED` on 2026-08-20. The AppShell topbar now keeps a permanent compact `Открыть папку` action while a workspace is active. It reuses the existing `[data-open-workspace]` click path and workspace picker/load lifecycle, saves the current page through the existing editor save lifecycle before opening the picker, and clears the old editor view through the existing empty-editor teardown after a successful switch. Regression: `app-shell-global-workspace-switch-keeps-cancel-and-loads-next-workspace`.
- `0.0.1.11.2` `BI-010` Campaign Map Toolbar - `NOT REPRODUCED WITH STRONG EVIDENCE` on 2026-08-20. Current focused matrix verified map -> card -> same map, map A -> map B -> map A, map -> task tracker -> map, map -> rule tree -> map, map -> hide/show tree -> map, map -> presentation -> return, and workspace A map -> workspace B -> map. In every path the split toolbar had exactly one scene bar and one tool rail, both visible, with 11 expected controls, hit-testable main controls, working grid popup, correct current map identity and no stale previous page hiding the current map. Evidence guard: `campaign-map-toolbar-survives-page-workspace-and-presentation-lifecycle`.
- `0.0.1.11.3` `BI-011` Creature Skills Encoding - `FIXED` on 2026-08-20. The Campaign Map creature token skill action/submenu now renders clean UTF-8 Russian `Навыки`, skill labels still come from the existing `DND_SKILL_GROUPS` source (`Скрытность`, `Атлетика`, etc.), and the focused regression verifies visible labels, submenu opening, selected skill payload and absence of mojibake marker sequences. `BI-022` is `DONE` because its current children `BI-010` and `BI-011` are both closed.
- Next leaf: `0.0.1.11.4` Large Workspace UX.

### Phase 4 - 0.0.1.12.0 Data Safety Completion

ID: `0.0.1.12.0`

NAME: Data Safety Completion

STATUS: `BLOCKED`

GOAL: complete the remaining recovery and link-safety work before durable live-session automation.

WHY NOW: future combat/session/event systems will write more frequently; unsafe restore and link repair flows would make that risky.

SCOPE: `BI-006` restore preview, partial restore, backup manifests, asset verification. `BI-020` broken wiki links, relation links, ordinary links, orphan review, grouped diagnostics, non-destructive repair preview and deliberate persistent repair flow. Include `BUG-011` restore/recovery validation if still current after Phase 1 audit.

DEPENDENCIES: Phase 3 stabilization.

EXIT CRITERIA: recovery previews are readable and non-destructive; persistent repair flows are backup-gated where needed; asset/link verification has tests or documented smoke paths; no durable write path bypasses existing safety owners.

### Phase 5 - 0.0.1.13.0 NF-001 Edit Session Conflict Protection

ID: `0.0.1.13.0`

NAME: NF-001 Edit Session Conflict Protection

STATUS: `BLOCKED`

GOAL: prevent stale editor writes from silently overwriting newer durable state.

WHY NOW: conflict-safe writes should exist before persistent session logs, combat state and player-facing actions increase write frequency.

SCOPE: protect field/page edits; preserve unrelated changes; surface conflict state; provide safe recovery; keep PageCommandService/write lifecycle as owner.

DEPENDENCIES: Phase 4 data safety; existing `PageCommandService`, `PageRecord`, `writeQueue`, `StorageAdapter`, `PageRepository` notifications.

EXIT CRITERIA: stale writes cannot silently overwrite current state; conflict UI is understandable; recovery path is safe; regression coverage proves field/page edit protection and unrelated-change preservation.

### Phase 6 - 0.0.1.14.0 NF-002 Safe Dice Engine

ID: `0.0.1.14.0`

NAME: NF-002 Safe Dice Engine

STATUS: `BLOCKED`

GOAL: create a safe, deterministic dice/rules engine.

WHY NOW: rolls should be structured and testable before event logs and combat actions consume them.

SCOPE: safe grammar, no `eval`, no `Function`, deterministic RNG tests, limits, arithmetic, modifiers, advantage/disadvantage, critical behavior and reusable structured results. Existing initiative random rolls may move to the engine only after parity verification.

DEPENDENCIES: roadmap order follows Phase 5. Pure dice parsing has no hard technical dependency on NF-001, but durable roll logging waits for Phase 7.

EXIT CRITERIA: parser/evaluator is safe; roll results are structured; no arbitrary code execution path exists; initiative parity is either migrated with tests or explicitly deferred.

### Phase 7 - 0.0.1.15.0 NF-003 Event / Roll / Combat Log + Transactions

ID: `0.0.1.15.0`

NAME: NF-003 Event / Roll / Combat Log + Transactions

STATUS: `BLOCKED`

GOAL: create the durable live-session event foundation.

WHY NOW: combat and session actions need a coherent log and undo model before complex state changes.

SCOPE: roll, action, damage, healing, effect, resource change, turn, round, rest, movement where applicable, scene transition, manual correction and undo. One user operation equals one coherent transaction. Undo must not silently erase history.

DEPENDENCIES: Phase 5 conflict-safe durable writes; Phase 6 dice result structures; page command lifecycle; editor history; CharacterModel; CampaignMapStore.

EXIT CRITERIA: event owner and source of truth are explicit; append/read tests exist; at least one safe action type logs and undoes correctly; no log is hidden inside arbitrary card HTML without a contract.

### Phase 8 - 0.0.1.16.0 NF-004 Persistent Combat Session

ID: `0.0.1.16.0`

NAME: NF-004 Persistent Combat Session

STATUS: `BLOCKED`

GOAL: make active combat reload-safe without creating a second initiative engine.

WHY NOW: live combat must survive app close/reopen before broader action automation.

SCOPE: start, pause, resume, finish combat, participants, initiative, current turn, rounds, delayed/ready state where supported, temporary battle flags, save/reload and continue session after reopening the app.

DEPENDENCIES: Phase 5 for conflict-safe writes; Phase 7 strongly recommended for session log; existing Campaign Map initiative/model/store and CharacterModel.

EXIT CRITERIA: active combat state persists and reloads; invalid references produce readable warnings; existing initiative architecture remains owner.

### Phase 9 - 0.0.1.17.0 NF-005 Combat Action Pipeline

ID: `0.0.1.17.0`

NAME: NF-005 Combat Action Pipeline

STATUS: `BLOCKED`

GOAL: route combat operations through one safe pipeline.

WHY NOW: damage, healing and checks should not become scattered UI-specific mutations.

SCOPE: actor -> action -> targets -> range/LoS where available -> roll/save -> components -> defenses -> HP/temp HP/resources/effects -> transaction -> event log -> undo. Support attack, check, save, damage, healing, temp HP, resource cost and manual GM correction. Mixed damage components stay independently resolvable.

DEPENDENCIES: Phase 6 dice, Phase 7 event log, Phase 8 persistent combat; CharacterModel; Properties; CampaignMapStore; PageCommandService.

EXIT CRITERIA: one owner pipeline handles at least the selected first action slice; writes/logs/undo stay coherent; full DnD taxonomy remains deferred until owner chooses the next action slice.

### Phase 10 - 0.0.1.18.0 NF-006 Effects & Conditions Engine

ID: `0.0.1.18.0`

NAME: NF-006 Effects & Conditions Engine

STATUS: `BLOCKED`

GOAL: make effects and conditions a real reusable domain model.

WHY NOW: combat actions and rest flows need consistent temporary and persistent modifiers.

SCOPE: source, target, duration, stacking, refresh, modifiers, turn/round triggers, periodic damage/healing, repeated saves, resource modifications, pause/remove, concentration-like relationships where rules require, persistence, log and undo. System-neutral engine first; DnD presets later.

DEPENDENCIES: Phase 8/9 for combat expiry/application; Phase 7 for log/undo; CharacterModel; Properties; Rule Tree provider.

EXIT CRITERIA: existing effects model is hardened; at least one add/remove condition flow works and persists where intended; turn expiry and rest integration have clear follow-up boundaries.

### Phase 11 - 0.0.1.19.0 NF-007 Targeting / Range / AoE

ID: `0.0.1.19.0`

NAME: NF-007 Targeting / Range / AoE

STATUS: `BLOCKED`

GOAL: support tactical targeting and area templates through Campaign Map architecture.

WHY NOW: combat actions need range and target context, but decorative map shapes must not become tactical source of truth.

SCOPE: single/multi target, range, optional LoS, grid snap, free angle, token/caster origin, auto candidate targets and manual include/exclude. The target tactical geometry vocabulary includes circle, cone, line, rectangle and cylinder, but the first usable slice may be smaller after the spike. Persistent aura/template support is a later sub-slice and needs an explicit CampaignMapModel/serializer design before any persistent schema is added.

DEPENDENCIES: CampaignMapModel/Store/Geometry; map toolbar and Inspector; Phase 9 for combat application.

EXIT CRITERIA: measurement/target preview works; the first approved AoE shape set is testable; combat integration waits until action pipeline is ready; any saved template/aura schema is explicitly approved; decorative shape storage is not abused as tactical truth.

### Phase 12 - 0.0.1.20.0 Live Session Map Package

ID: `0.0.1.20.0`

NAME: Live Session Map Package

STATUS: `BLOCKED`

GOAL: add the next map/session slices one at a time after combat foundations exist.

WHY NOW: these features improve live play, but they should not land as one giant map rewrite.

SCOPE: sequential slices only: `NF-008` Short / Long Rest, `NF-009` Adaptive Token UI by zoom, `NF-010` Map Pings, `NF-011` Scene Transitions / Portals. NF-008 needs preview before apply plus transaction/log/undo. NF-009 defines low/mid/high zoom information density. NF-010 covers normal/danger/go/target/GM-secret pings. NF-011 covers map link, spawn, selected/players/all, relative formation and optional presentation/music transition.

DEPENDENCIES: Phase 7 event log; Phase 9 combat pipeline where rest or scene transition affects combat; CampaignMapModel/Store/presentation.

EXIT CRITERIA: each NF slice is implemented separately with owner approval, tests and no unrelated map feature bundle.

### Phase 13 - 0.0.1.21.0 NF-012 Renderer Spike + Walls / Light / Vision

ID: `0.0.1.21.0`

NAME: NF-012 Renderer Spike + Walls / Doors / Windows / Light / Vision

STATUS: `SPIKE`

GOAL: design tactical vision and barriers without confusing data model with renderer choice.

WHY NOW: walls/light/vision are high-value VTT features, but they are risky enough to require evidence first.

SCOPE: first leaf is a research/performance spike. Separate domain data model from rendering backend. Investigate PixiJS or another backend only if evidence supports it. After owner-approved spike: walls, doors, secret doors, windows, terrain barriers, open/close/lock, light sources, token light, bright/dim, cone/angle, player-specific vision, GM omniscience and fog/vision interaction.

DEPENDENCIES: CampaignMapModel/Store/serializer; fog/layers; presentation privacy; Phase 11 geometry/targeting helps but does not replace the spike.

EXIT CRITERIA: spike proves or rejects renderer direction; no persistent map rewrite happens just to adopt a renderer; production implementation starts only after owner-approved evidence.

### Phase 14 - 0.0.1.22.0 NF-013 Local Compendium

ID: `0.0.1.22.0`

NAME: NF-013 Local Compendium

STATUS: `BLOCKED`

GOAL: make local reusable rules/content searchable and safely importable.

WHY NOW: combat and character workflows will need spells, items, creatures, actions and rules without a second package ecosystem.

SCOPE: reuse Rule Workspace, Rule Packages, World Package, PageRepository and current content models. Target content categories include spells, items, creatures, actions, effects, rules, classes, species, feats, backgrounds and custom entries, but the first v1 content set remains TBD during implementation design. Search/filter/favorites/recent are allowed only if justified during implementation design. Package update must not overwrite user-owned copies.

DEPENDENCIES: Phase 5 recommended before bulk imports; Rule Workspace/Rule Packages/World Package/PageRepository/Safe HTML/backup gate.

EXIT CRITERIA: one clear Tools entry exists; preview/apply flow is safe; no second package source of truth is created.

### Phase 15 - 0.0.1.23.0 Knowledge Graph UX 2.0

ID: `0.0.1.23.0`

NAME: Knowledge Graph UX 2.0

STATUS: `BLOCKED`

GOAL: decide what the graph is for before adding more visible graph features.

WHY NOW: owner feedback says the current graph concept still feels off. More controls would hide the concept problem.

SCOPE: resolve `BI-026` and `BUG-010` first with UX research, design note and references. Answer why a GM opens Graph, navigation vs analysis, primary first-screen workflow, dominant vs hidden information, relationship creation/editing and whether the current inspector/filter model is right. After owner approval, consider remaining `BI-016` richer graph operations.

DEPENDENCIES: Phase 2 cleanup; current Knowledge Graph model and relationship persistence; owner approval of concept direction.

EXIT CRITERIA: design note is approved; `BI-026` has a disposition; no new graph feature is added to compensate for unclear purpose.

### Phase 16 - 0.0.1.24.0 Workspace Usability

ID: `0.0.1.24.0`

NAME: Workspace Usability

STATUS: `BLOCKED`

GOAL: improve everyday workbench ergonomics without decorative empty panels.

WHY NOW: the owner explicitly wants future pane support and Properties field locking, but both need deliberate interaction design.

SCOPE: `BI-023` Properties field lock toggle. `BI-025` up to three workspace panes. Multi-pane requires an interaction/design spike for focus model, split behavior, persistence, card+map, map+graph, card+card, keyboard behavior, narrow-window fallback and performance impact.

DEPENDENCIES: Phase 2 cleanup; current AppShell/tree/editor contracts.

EXIT CRITERIA: lock toggle prevents accidental layout movement without changing field values; multi-pane design is approved before runtime implementation; no placeholder panes ship.

### Phase 17 - 0.0.1.25.0 NF-014 Local-Hosted Collaborative Session

ID: `0.0.1.25.0`

NAME: NF-014 Local-Hosted Collaborative Session

STATUS: `LATER`

GOAL: let the Tauri GM app host an explicit LAN session for browser clients.

WHY NOW: collaboration/player surfaces need an authority model before mobile or writable player actions.

SCOPE: research/spike before production. Target direction: Tauri desktop GM host -> explicit LAN session -> browser clients. Roles: GM, player, viewer. Principles: GM authoritative, validated commands, filtered state, revisions/sequencing, reconnect, no direct filesystem access, no cloud requirement and disabled until explicitly started.

DEPENDENCIES: Phase 5 conflict-safe writes; Phase 7 events if client actions are accepted; presentation privacy; Tauri command boundary.

EXIT CRITERIA: owner approves networking/library architecture before production; no external service or server dependency is added without approval.

### Phase 18 - 0.0.1.26.0 NF-015 Mobile Player Companion

ID: `0.0.1.26.0`

NAME: NF-015 Mobile Player Companion

STATUS: `BLOCKED`

GOAL: create a player-facing mobile companion, not a full mobile GM app.

WHY NOW: players need a limited surface after the local-hosted session model exists.

SCOPE: character, HP/resources, actions, rolls, initiative, effects, inventory, map view, permitted own-token interaction, targeting, pings and public event feed. First usable companion should be read-only unless authority and permissions are already proven.

DEPENDENCIES: Phase 17 collaborative protocol; presentation privacy; responsive shell primitives.

EXIT CRITERIA: mobile surface consumes GM-authoritative state; first slice has clear reconnect/status behavior; writable player actions stay deferred until owner selects and approves them.

### Phase 19 - 0.0.1.27.0 NF-016 Declarative Extension API

ID: `0.0.1.27.0`

NAME: NF-016 Declarative Extension API

STATUS: `LATER`

GOAL: allow safe declarative extension definitions without arbitrary executable plugins.

WHY NOW: future content/rules/features may need extension points, but runtime code plugins are too risky early.

SCOPE: declarative definitions for compendium, Properties schemas, actions, effects, roll variables, rule presets, icons and localization. Trusted code extensions, if ever added, require versioned API, user trust, capability scopes, isolation and no raw filesystem access.

DEPENDENCIES: Phase 14 compendium/package source model; Rule Packages; World Package; Properties; CharacterIntegrationAPI; Safe HTML.

EXIT CRITERIA: one supported declarative capability previews and applies safely; unsupported capabilities block with diagnostics; no executable plugin surface is introduced.

### Phase 20 - 0.0.1.28.0 NF-017 Optional 3D Dice

ID: `0.0.1.28.0`

NAME: NF-017 Optional 3D Dice

STATUS: `LATER`

GOAL: add optional dice presentation without making visuals the source of truth.

WHY NOW: this is late polish after dice and event logs are useful on their own.

SCOPE: optional 3D visualizer receives predetermined outcomes/results from NF-002, can be disabled, respects reduced-motion and does not regress Campaign Map performance.

DEPENDENCIES: Phase 6 dice engine; Phase 7 roll/event log; presentation mode; possible future rendering spike.

EXIT CRITERIA: gameplay result always comes from NF-002; visual failure cannot affect gameplay; performance/reduced-motion tests exist.

### Phase 21 - 0.0.1.29.0 Final Product Polish

ID: `0.0.1.29.0`

NAME: Final Product Polish

STATUS: `LATER`

GOAL: return to visual quality when mature real workflows exist.

WHY NOW: owner accepted the current design for this stage, but the final visual bar still matters later.

SCOPE: full visual critic, editor polish, Graph polish, Map/live-session polish, settings, animations, atmosphere/background, accessibility, performance and consistency. Include `BI-007` and unresolved `0.0.1.8.18.6` critic findings as historical input.

DEPENDENCIES: mature real workflows from earlier phases; owner-approved polish scope.

EXIT CRITERIA: critic evaluates mature workflows, not mostly empty/pre-feature surfaces; final design issues are fixed or explicitly waived; release handoff reflects the final visual state.

## Promoted Backlog Items

These living backlog items are now represented in this master roadmap. Their detailed intake record remains in [BUGS_AND_IMPROVEMENTS_BACKLOG.md](./BUGS_AND_IMPROVEMENTS_BACKLOG.md).

| BI | Promoted To |
| --- | --- |
| `BI-003` Campaign map stabilization | Phase 3 `0.0.1.11.0` |
| `BI-006` data safety remaining work | Phase 4 `0.0.1.12.0` |
| `BI-007` UI/design future polish | Phase 21 `0.0.1.29.0` |
| `BI-008` circle center point | Phase 3 `0.0.1.11.0`, with decision gate for later Campaign Map phase if not small |
| `BI-009` shape rotation controls | Phase 3 `0.0.1.11.0`, with decision gate for later Campaign Map phase if not small |
| `BI-010` disappearing map toolbar | Phase 3 `0.0.1.11.0` |
| `BI-011` creature skills mojibake | Phase 3 `0.0.1.11.0` |
| `BI-016` richer graph operations | Phase 15 `0.0.1.23.0`, only after `BI-026` concept approval |
| `BI-020` link cleanup and repair | Phase 4 `0.0.1.12.0` |
| `BI-022` P1 regression bundle | Phase 3 `0.0.1.11.0` |
| `BI-023` Properties field lock toggle | Phase 16 `0.0.1.24.0` |
| `BI-024` documentation/status automation | Phase 2 `0.0.1.10.0`, only if confirmed by audit as recurring drift |
| `BI-025` up to three workspace panes | Phase 16 `0.0.1.24.0` |
| `BI-026` Knowledge Graph UX concept | Phase 15 `0.0.1.23.0` |

## Bug Inventory Reconciliation

[BUG_INVENTORY.md](./BUG_INVENTORY.md) remains the confirmed/high-risk bug register. Phase 1 must verify currentness before fixes. This table prevents hidden disagreement between the bug register and the active roadmap.

| Bug | Roadmap Disposition |
| --- | --- |
| `BUG-001` large workspace operations feel frozen | Phase 1 audit currentness check; Phase 3 if native UI delay is still reproduced. |
| `BUG-002` broad unknown broken functions | Watch list only; split into a concrete bug when the owner reports steps. |
| `BUG-003` desktop installed-app verification | Phase 1 audit currentness check; Phase 2/3 if release desktop coverage is still insufficient. |
| `BUG-004` campaign map presentation fragility | Phase 3 if still reproduced. |
| `BUG-005` map drawing UX verification | Phase 3 if still reproduced. |
| `BUG-006` map music desktop/audio fragility | Phase 3 if still reproduced. |
| `BUG-007` Properties real-card layout risk | Phase 3 if still reproduced; Phase 21 if only visual polish remains. |
| `BUG-008` Character calculations to map trust | Phase 3 if regression is still missing; later combat phases depend on this being trusted. |
| `BUG-009` legacy task tracker verification | Phase 3 if older workspace tracker data still needs a fixture/regression. |
| `BUG-010` Knowledge Graph daily-use concept | Phase 15 with `BI-016` and `BI-026`. |
| `BUG-011` restore and recovery validation | Phase 4 with data safety completion. |
| `BUG-012` docs readability/encoding watch | Phase 1 audit; Phase 2 only if recurring drift is confirmed. |
| `BUG-013` manual regeneration watch | Release handoff rule; no separate active implementation unless it becomes stale again. |
| `BUG-014` local `debug.log` noise | Phase 2 owner-approved policy: the exact root ignored/untracked Chromium/GPU `debug.log` is generated/local-only and not a project-file-audit blocker; do not delete unrelated logs during unrelated tasks. |

## NF Items Included

The old mini backlog has been absorbed into this roadmap and archived at [NEXT_PRODUCT_MINI_BACKLOG_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/NEXT_PRODUCT_MINI_BACKLOG_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md).

Included NF items: `NF-001`, `NF-002`, `NF-003`, `NF-004`, `NF-005`, `NF-006`, `NF-007`, `NF-008`, `NF-009`, `NF-010`, `NF-011`, `NF-012`, `NF-013`, `NF-014`, `NF-015`, `NF-016`, `NF-017`.

## Deliberately Not Planned

These ideas are explicitly rejected for now so future planning does not reintroduce them as "obvious" improvements:

1. Ctrl+drag creature duplication - rejected for now.
2. User-configurable health-stage thresholds/colors/names - rejected for now.

## Historical Planning Sources

The following files are historical only and must not be used as active implementation roadmaps:

- [PROJECT_PLAN_BEFORE_MASTER_ROADMAP_2026-08-10.md](../archive/PROJECT_PLAN_BEFORE_MASTER_ROADMAP_2026-08-10.md)
- [NEXT_PRODUCT_MINI_BACKLOG_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/NEXT_PRODUCT_MINI_BACKLOG_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md)
- [ROADMAP_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/ROADMAP_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md)
- [CURRENT_MILESTONE_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/CURRENT_MILESTONE_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md)
- [UI_AUDIT_AND_MODERNIZATION_PLAN_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md](../archive/UI_AUDIT_AND_MODERNIZATION_PLAN_SUPERSEDED_BY_PROJECT_PLAN_2026-08-10.md)
