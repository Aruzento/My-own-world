---
summary: "Phase 17 action orchestration, first single-target attack, durable health and compensating history boundaries."
read_when:
  - "Before implementing any Phase 17 combat action leaf"
  - "Before connecting attack, damage, healing, saves or resources to pages and event history"
owner_zone: "architecture"
---
# Combat Action Pipeline Contract

Updated: 2026-09-16

Status: `0.0.1.17.2` Character Health Mutation Preparation is complete at `Foundation` readiness. Phase 17 is ACTIVE; 17.3 is NEXT. No executable action, durable write, event type or UI was added. Phase 16 remains CLOSED / PASS at `Usable` readiness for persistent sessions. AI Core remains LATER.

## 1. Decision And First Product Slice

One `CombatActionPipeline`, exposed by the future `js/combat/combatActionPipeline.js`, orchestrates one explicit user intent. It coordinates existing domain and storage owners. It holds only an in-flight request/resolution, never canonical Character or session state.

```text
current Initiative participant in active Combat
  -> explicit attack definition + one target participant
  -> resolve exact token/page identities and Character reads
  -> validate requests and supported state
  -> Dice Engine attack roll -> AC comparison
  -> on hit: one damage roll -> Character health calculation
  -> prepare one target-page change -> PageCommandService
  -> append one completed action transaction through EventStore
  -> Event History -> conditional compensating Undo
```

The product target stays a simple single-target attack. The smallest prerequisite is 17.2, a composable Character/Properties health-change preparation boundary. Current APIs cannot safely be composed into an attack by simply calling the existing standalone resource logger twice. No Combat Session redesign is needed.

First manual acceptance, due in **17.6**:

- Goblin is the canonical current participant; the GM chooses an explicit attack and one target. With attack `d20 + 4`, target AC 12, injected natural 10 and damage `1d6 + 2` rolling 3, total 14 hits, damage 5 changes HP 10 to 5. One action transaction contains both rolls, resolution and the HP change. Reload preserves HP/history; Undo restores HP 10 through a new transaction.
- Natural 3 produces total 7: miss, no damage roll, no HP/temp HP write, one auditable action transaction. Miss history remains; state Undo is unavailable because nothing changed.
- The same hit against HP 10/temp HP 2 leaves HP 7/temp HP 0. Both fields save in one target-page write; one Undo restores both together.

These are future fixture/manual acceptance routes, not results achieved by 17.1. The first attack policy is explicitly `ac-total-v1`: attack total >= effective AC means hit, including equality. It uses `criticalPolicy: 'none'`; no natural-1/20 exception or doubled damage is claimed. D&D attack bonus derivation, critical attack rules and mitigation need explicit later rule contracts; Dice Engine's natural-d20 metadata alone does not implement them.

## 2. Repository Evidence And Ownership

Audited base: clean `main`, HEAD = origin/main = `62483ac511da4e02267d013e1fd8f2a3d6262711` (`Close persistent combat session phase`). There was no equivalent action pipeline contract or runtime owner.

| Responsibility | Existing production owner and observed boundary | Relevant regression owners |
| --- | --- | --- |
| Session lifecycle, roster, round, flags | `js/combat/combatSessionModel.js`, `combatSessionLifecycle.js`, `combatSessionFlags.js`; session JSON contains no active-actor pointer or Character snapshot | `tests/combatSessionModel.test.mjs`, `combatSessionLifecycle.test.mjs`, `combatSessionFlags.test.mjs` |
| Initiative/current participant and reference integrity | `js/editor/campaignMapInitiativeModel.js`; `campaignMapCombatSessionIntegration.js#resolveCombatSessionParticipant` / `deriveCombatSessionIntegrity`; membership and exact references, no name repair | `tests/campaignMapInitiativeModel.test.mjs`, `campaignMapCombatSessionIntegration.test.mjs`, `campaignMapCombatSessionIntegrity.test.mjs` |
| Map runtime and persistence | `js/editor/campaignMapModel.js`, `campaignMapStore.js`, `campaignMapDataSerializer.js`, `campaignMapSaveController.js`; aggregate/dirty/DOM and existing map-page save | `tests/combatSessionPersistence.test.mjs`, `campaignMapStore.test.mjs`; `tests/browser/campaign-map-combat-ui.spec.mjs`, `campaign-map-combat-integration.spec.mjs` |
| Character reads/calculations | `js/editor/campaignMapCharacterBridge.js#getCampaignMapCharacterState`; `js/character/characterModel.js#readCharacterModelFromPage`, `getCharacterEffectiveArmorClass`, `getCharacterHealth`, `applyCharacterHealthChange` | `tests/characterModel.test.mjs`, `propertiesCalculationEngine.test.mjs` |
| Properties and current HP write preparation | `js/properties/propertiesModel.js`, `propertySchemas.js`, `propertiesCalculationEngine.js`, `propertiesDomWriter.js`, `characterCalculations.js#updatePageCharacterHealth`; `js/editor/campaignMapTokenActions.js#changeTokenHp` already prepares a draft then calls PageCommandService | Character tests; page-command and map/browser tests above |
| Durable page writes and reads | `js/storage/pageCommandService.js#persistPageContentCommand` / `snapshotPageForCommand`, `pageWritePreconditions.js`, `writeQueue.js`; `js/repository/pageRepository.js#getPageById` / `notifyPageUpdated`; no direct action filesystem writes | `tests/pageCommandService.test.mjs`, `pagePropertyResourceTransaction.test.mjs`, `eventSafetyIntegration.test.mjs` |
| Dice | `js/dice/diceEngine.js#validateDiceRoll` / `rollDice`; immutable RollResult, no context or effects | `tests/dicePublicConsumerApi.test.mjs`, `diceCriticalSemantics.test.mjs`, `diceRollEventLog.test.mjs` |
| Typed facts and transaction assembly | `js/events/eventTypes.js`, `transactionModel.js`; explicit schemas, ordered immutable events; completed requires >= 1 event | `tests/eventTypes.test.mjs`, `eventTransactionModel.test.mjs`, `eventTransactionContract.test.mjs`, `eventFutureAdapterContract.test.mjs` |
| Audit persistence | `js/events/eventStore.js#appendTransactionRecord` / `readTransactionRecords`; one queued JSONL append, workspace-scoped id uniqueness; failed append can be uncertain | `tests/eventStore.test.mjs`, `eventSafetyIntegration.test.mjs` |
| Existing consumers and Undo | `js/events/diceRollEventLog.js`, `pagePropertyResourceTransaction.js`, `transactionReversal.js`, `combatSessionEventLog.js`; standalone roll/resource transactions and narrow conditional resource reversal | `tests/diceRollEventLog.test.mjs`, `pagePropertyResourceTransaction.test.mjs`, `transactionReversal.test.mjs`, `combatSessionEventLog.test.mjs` |
| History and recovery | `js/events/eventQuery.js`, `js/ui/eventHistoryPanel.js`; existing popup/query/reversibility path. `js/storage/backupService.js` remains recovery owner under its contract; pages/assets restore does not rewind history | `tests/eventHistoryPanel.test.mjs`, `eventSafetyIntegration.test.mjs`, `combatSessionRecoveryEvents.test.mjs`; `tests/browser/event-history.spec.mjs` |

Evidence limits that affect design:

- `readCharacterModelFromPage` reads Properties through a detached DOM parser. Pure Node domain tests use `createCharacterModelFromSources`; actual page parsing/writing needs browser integration fixtures. Do not interpret a missing DOM as a legitimate empty Character during an action.
- Current Properties persistence is existing typed HTML fields (`data-property-name`, `value`), including `hpCurrent`, `hpMax`, `hpTemp`. The Properties contract's target JSON model is not permission to migrate pages in Phase 17.
- `updatePageCharacterHealth` changes a supplied page object's content, not durable storage. It may update both HP fields and silently skip a missing temp input. The map's `changeTokenHp` wrapper also refreshes/saves the map and does not assemble action history. Neither wrapper is the new action orchestrator.
- `logPagePropertyResourceChange` reads/replaces one numeric input, builds its own completed transaction and appends it. Its content builder is private; its numeric scan is not a Character block identity validator. It is a standalone consumer, not a generic multi-field command API.
- `classifyTransactionReversibility` currently accepts exactly one `resource.changed` event, rejects multiple resource events, and does not require a resource-only transaction. Therefore a new attack with one resource event could accidentally expose old Undo unless classification is explicitly gated when action events are activated.
- PageCommandService provides optimistic content preconditions and queued writes, not filesystem compare-and-swap or cross-file atomicity. Its `structuredMutation` preservation supports selected PageRecord metadata, not an automatic merge of HP edits.

## 3. Module Boundary And Dependency Direction

Planned boundaries (names below are future modules/functions, not existing APIs):

- `js/combat/combatActionPipeline.js`: the only action execution coordinator. Owns action/transaction/event ids, clock, ordering, pending execution and honest result. Uses the public Dice facade and delegates all reads, preparation, writes and event validation.
- `js/combat/combatActionModel.js`: small pure request/resolution validation and first attack policy. No DOM, workspace, storage, UI or EventStore. Detached actor/defense/health inputs are observations for this execution, not persisted state.
- Existing `campaignMapCombatSessionIntegration.js` and Character bridge: exact actor/target read adapter over CampaignMapStore/Initiative and PageRepository. UI submits ids, never live tokens or authoritative HP/AC values.
- Narrow `js/properties/characterHealthMutation.js`: prepare/validate a detached content change using Properties and CharacterModel. No action identity, roll, history, save or alternate HP calculation. Reuse or narrowly extract the existing `characterCalculations` draft-writing logic; do not copy its parser into Combat.
- `js/events/combatActionEventLog.js`: typed event/transaction assembly from resolved facts; pipeline invokes the existing EventStore append exactly once. No Character calculation or direct page write in this adapter.
- `js/events/transactionReversal.js`: retains the public Undo entry/classifier; later add one explicit supported attack shape using the same health preparation/write boundary. No generic bus or arbitrary mutation callbacks.

UI -> pipeline -> public domain/read/preparation/page-command/event APIs. Core Combat Session/Initiative, Dice Engine, CharacterModel, PageCommandService, EventStore and BackupService never import the action coordinator. Existing standalone dice/resource consumers remain usable separately. No new production dependency, event-store rewrite, persistence service, registry or plugin framework is required.

## 4. Exact Actor And Target Resolution

For the first slice both actor and target are explicit members of the same active session on one saved Campaign Map:

1. Capture workspace identity, map page id, session id and the existing map aggregate; require active status and a confirmed saved map context. Pending preparation/value edits must finish through the existing save owner before execution.
2. Read `initiative.activeParticipantId` through the existing Initiative/integration owner. The request's actor id must equal that exact id and belong to session membership. The request actor field is an expected-current precondition, never another persistent pointer. Do not normalize a broken id into the first participant.
3. Resolve each `participantId` with `CampaignMapInitiativeModel.getParticipant`. Resolve its explicit `tokenId` with `CampaignMapModel.getToken`, and explicit `pageId` with `PageRepository.getPageById`. Require an exact, unambiguous match; if token and initiative page/source references disagree, reject as stale/inconsistent.
4. Use the resolved page with `getCampaignMapCharacterState` / `readCharacterModelFromPage(page, { pages })`. Current AC/HP comes from Character, never initiative names, `isAlive`, token HP/AC snapshots or EventStore.
5. A copy token references its copied page; an original-linked token references its original page. Preserve that existing relationship. Multiple tokens sharing one page share Character state; do not manufacture per-token HP. First slice rejects actor/target pointing to the same Character page and all ambiguous/missing mappings.

Token-less/page-less participants and legacy-only or empty Character sources remain valid session data, but are unsupported for this first action route. Reject with a precise diagnostic without removing/rebinding anyone. Unrelated broken roster members remain diagnostic and do not require repair to attack between two valid members.

Targeting here means selecting one explicit participant. No range/LoS, position, grid, candidate search or AoE decision is implied. Future Phase 19 may supply a read-only tactical validation result before rolling; without that owner the result is `not-evaluated`, never a fabricated range/LoS PASS. A request requiring unsupported tactical validation rejects.

## 5. Minimum Typed Request, Resolution And Audit

Conceptual request, to be validated in 17.3 (strict keys; no arbitrary `data` bag):

```js
{
  kind: 'CombatActionRequest', version: 1,
  actionId: 'one-execution-id',
  mapPageId: 'map-id', sessionId: 'session-id',
  actor: { participantId: 'token:goblin-token-id' },
  target: { participantId: 'token:target-token-id' },
  action: {
    type: 'attack', definitionId: 'gm-attack', label: 'Shortbow',
    source: { kind: 'manual' },
    hitPolicy: 'ac-total-v1',
    attackRoll: { formula: 'd20 + 4', mode: 'normal', criticalPolicy: 'none' },
    damageComponents: [
      { componentId: 'primary', damageType: 'piercing',
        roll: { formula: '1d6 + 2', mode: 'normal', criticalPolicy: 'none' } }
    ]
  }
}
```

`actionId` identifies one execution and is allocated once by the coordinator; `definitionId` identifies the chosen input definition, not a new persistent action entity. `source` may carry optional existing `pageId` / `ruleId` provenance, validated exactly; provenance never executes card text. There is no implemented attack catalogue/attack-bonus API. Initially the GM explicitly supplies/selects a labeled attack definition in the existing Combat flow; formula text is safe Dice input, not a rule inferred from descriptions, inventory or initiative modifier. Persistent reusable definitions are deferred.

First attack accepts a single d20 plus an explicit integer modifier, existing Dice modes, and `criticalPolicy: 'none'`. It validates through `validateDiceRoll` and applies the narrower attack shape rule without importing Dice parser internals. Damage is exactly one component, rolled only on hit with mode normal/policy none. Its resolved amount must be a non-negative safe integer; invalid/negative/fractional damage rejects before mutation, never silently rounds or heals. Damage type is an audit label; resistance, immunity and vulnerability are unsupported, never inferred. Do not merge differently typed future components into one untyped amount before resolution.

Four separate records:

| Record | Contents and lifetime |
| --- | --- |
| Definition/request | Explicit ids, source and supported roll inputs above; runtime only |
| Resolution | Detached exact actor/target references, effective AC and policy, attack RollResult, hit/miss, optional component RollResult/amount, Character before/after health; runtime, immutable |
| Mutation plan | Target page identity/base, detached next content, only changed HP fields and their before/after values, unchanged health guard values; runtime only, never stored in Combat or event payload as page HTML |
| Audit/result | One typed completed transaction after confirmed state commit (or no write for miss), stable references/roll evidence/field deltas; pipeline result separately records state and audit durability |

AC uses `getCharacterEffectiveArmorClass(model)` and existing calculation/override semantics, including Character-owned item/effect inputs. HP uses `getCharacterHealth(model)`. Require one unambiguous character/creature Properties block and explicit finite integer `hpCurrent`, positive `hpMax`, non-negative `hpTemp`, with current <= max, for writable targets. Missing/empty/duplicate/malformed fields must not become default HP or trigger block creation. Existing model defaults remain valid read compatibility but do not prove writable combat state. AC must be finite and its Character input source resolvable; unsupported/missing source state rejects instead of trusting a token fallback.

Health calculation reuses `applyCharacterHealthChange(model, { delta: -amount })`: temp HP first, then current HP clamped to zero. Do not invent max HP, modify death saves, apply conditions, auto-remove a downed participant or advance the turn. Checks/saves later use current Character calculation keys (`saveDex`, `skillStealth`, etc.); no second derived-stat table. Dedicated arbitrary resource pool, spell DC, attack catalogue and mitigation APIs are not present.

## 6. Prerequisite And Durable Write Boundary

17.2 establishes `js/properties/characterHealthMutation.js#prepareCharacterHealthMutation` for the existing HP fields as one page change. It does not create an attack runner or standalone damage button.

- Resolve the live repository page, read its durable content via `pageWritePreconditions`, and capture `snapshotPageForCommand(page).pageStateIdentity` against the same content used for Character resolution. Reject an unsaved/divergent runtime page instead of overwriting pending editor input.
- Validate the exact existing Properties source/fields before calling existing draft helpers. Prepare on a detached page; preserve PageRecord identity/front matter, unrelated blocks, field layout and overrides. Read back the draft through CharacterModel/Properties and require exact intended HP/temp HP plus unchanged max and unrelated values.
- Accept either a forward integer `delta`, calculated by `CharacterModel#applyCharacterHealthChange`, or exact non-negative `hpCurrent`/`hpTemp` values for later compensation. Require exactly one Character/Creature Properties block and explicit valid integer `hpCurrent`, positive `hpMax` and non-negative `hpTemp`, with current not above max. Do not default, migrate or choose among duplicate sources.
- Return a frozen typed mutation plan with kind/version, page id, Properties source, normalized request, expected base, previous-page snapshot, detached next content, before/after tuples, ordered changed fields, unchanged guards and an explicit changed flag. Preparation itself performs no write, event append, map dirty/DOM commit or live `page.content` assignment. This replaces neither Properties nor CharacterModel.
- The pipeline later calls `persistPageContentCommand({ page, content, previousPage, expectedBase, type: 'combat-action-health-change', reason })` once for the target page. Never call `logPagePropertyResourceChange` once per HP field. Require `writeStatus === 'saved'` and `written === true`, with no blocked/stale/conflict result, before success facts may be appended.
- Refresh token/sheet presentation through existing Character/map read paths after the page receipt. Token snapshots are derived caches; their refresh or a later normal map save cannot become another health mutation or a second action transaction. A failed presentation refresh is separate from durable action success.

Before rolls and again before commit, validate captured session/current participant, exact mappings, Character/AC inputs and target page base. Discard a stale preview; do not reroll or rebase damage automatically. Serialize overlapping action/Undo attempts for the affected page in the runtime coordinator, retaining PageCommandService preconditions for other writes.

Workspace context must stay the same through page precondition, write and append. EventStore can receive a captured adapter, while PageCommandService resolves the active storage provider internally. An adapter captured only for the event append is insufficient. 17.4 must prove the workspace-switch boundary at the existing page/write owners (a narrow context guard there if needed), reject before writes on a context mismatch, and suppress stale UI publication. It must not add an alternate writer. A switch during an already-started write is an explicit interrupted/uncertain result requiring readback, not a success in the new workspace.

These are optimistic application guarantees. External writers can still change a file between precondition read and filesystem write; there is no cross-process lock, durable action journal or crash-atomic page-plus-log commit. Any stronger guarantee needs a separate storage-owner design, not a hidden Phase 17 schema change.

## 7. One Transaction And Minimal Event Vocabulary

Allocate ids/time once, call `rollDice` directly, and use its immutable RollResult. Do **not** call `logDiceRoll` or `createDiceRollTransaction` for internal attack/damage steps: both own a standalone completed roll transaction. Do not reroll while formatting history.

One action uses transaction `intentType: 'combat-attack'`, normal transaction `status: 'completed'`, and existing EventStore append result `status: 'durable'`. Runtime `started` is not durable history. Transaction `order` is not a new global counter: durable ordering stays EventStore file/log order, with strictly increasing event order inside the action.

Planned event order:

1. `roll.performed`: attack RollResult.
2. `roll.performed`: damage RollResult on hit only.
3. `resource.changed`: each actually changed field, stable order `hpTemp` then `hpCurrent` (omit unchanged fields).
4. **`action.resolved`**: one action outcome and causal links to the preceding facts, on both hit and miss.

The full candidate transaction/payloads must validate in memory before the first write; append the completed transaction only after confirmed persistence. Miss, zero damage and fully clamped no-change hits still append a resolution transaction, with no fabricated resource change. No transaction per internal step and no early durable declaration record.

| Vocabulary | Planned use and payload ownership |
| --- | --- |
| Existing `roll.performed` v1 | Preserve canonical RollResult once. Current allowed context fields suffice: `source`, `actorId` = participantId, `actorPageId`, `targetId` = participantId, `targetPageId`, `mapPageId`, actor `tokenId`, `actionId`, optional `ruleId`/`label`. Attack/damage role uses the action's event-id links, not extra unsupported context keys. |
| Existing `resource.changed` v1 | Sole numeric mutation fact: `{ resource: { kind: 'page-property', id: '<exact-pageId>:hpCurrent' or ':hpTemp', label }, before, after, delta, unit: 'HP', reason }`. Identity must match the actual changed field; delta = after - before. |
| Planned `action.resolved` v1 | Action owner supplies `actionId`, `mapPageId`, `sessionId`, round observation, exact actor/target `{ participantId, tokenId, pageId }`, explicit definition/source, `hitPolicy`, defense `{ kind: 'ac', value }`, outcome `hit`/`miss`, `attackRollEventId`, resolved components `{ componentId, damageType, rollEventId, amount }`, ordered `resourceEventIds`, and health guard evidence below. Strict schema and cross-event validation belong to 17.4. |
| Existing `transaction.reversal.recorded` v1 | A later Undo transaction links original transaction, reversal transaction and reversed resource event ids. Original records remain unchanged. |
| Existing `manual.correction.recorded` v1 | Reserved for the later explicit manual-correction intent; no duplicate correction event for a normal attack. |
| Still reserved | `action.declared`, other `action.*`, `damage.*`, `healing.*`, `effect.*`, rest/movement/scene namespaces and unimplemented turn/round names. No `attack.roll` duplicate of `roll.performed`, nor `damage.applied` duplicating component resolution and resource deltas in this first slice. |

For Undo, reconstruct before/after HP/temp HP from linked resource events. `action.resolved.healthGuard` supplies `hpMax` and the values of any unchanged HP/temp HP fields, with explicit field names restricted to those existing keys. Together they describe the full original before/after health tuple without a duplicate mutation fact. Validate same page, unique fields, complete coverage, amount/health consistency, correct roll roles and references within the same transaction. No arbitrary JSON/HTML, Character snapshots or live handles in durable payloads.

17.1 activates **zero** event types. `action.resolved` remains rejected as `EVENT_TYPE_UNKNOWN` / `reservedFuture` until 17.4 implements its strict payloadVersion-1 schema. EventStore still delegates vocabulary validation and must not branch on Combat. The existing `eventQuery` and Event History view model must gain explicit action summaries/target filtering where needed; UI must not parse JSONL or assume new nested references are indexed automatically.

## 8. Failure Semantics And Recovery

The runtime result distinguishes `state` (unchanged, persisted, uncertain), `audit` (not-attempted, durable, unconfirmed), stage/reason, action/transaction ids and known page receipt. A resolved roll or a saved page alone is never overall action success.

| Failure | Required behavior |
| --- | --- |
| Invalid actor, non-active session, stale current participant | Reject before RNG/write/append; preserve session/initiative and report the exact reason. |
| Missing/inconsistent target/token/page, unsupported Character source | Reject before RNG/write/append; retain references and show diagnostics, no name substitution or implicit migration. |
| Invalid action, policy, damage component or required tactical check | Reject before effects. Validate both roll requests up front. No fallback attack or default HP. |
| Dice syntax/limit/RNG/evaluation failure, invalid resolved damage | No page mutation or completed success transaction; retain structured failure and any already-computed roll only as runtime evidence. No automatic reroll. |
| Target/actor/AC inputs changed while preparing; stale target base | Reject before write or accept the existing blocked command result. No success append and no automatic merge/rebase; a new user attempt must resolve fresh state. |
| Page write blocked/failed/superseded | No success append. Report command evidence. `written: true`, post-write failure or uncertain storage errors must not be described as unchanged; readback belongs to the existing page owner. |
| Event append fails after confirmed page write | State remains persisted; audit is unconfirmed. Report both, retain transaction identity, stop automatic retry/re-execution. Never report attack success or overwrite newer state with a rollback. |
| Event append fails on miss/no-change hit | State unchanged; audit unconfirmed; no successful audited action claim. Do not reroll to repair history. |
| UI refresh fails after confirmed page and audit | Durable action remains recorded; report refresh failure and reload through normal owners. Do not execute the action again. |
| Future partial multi-target/resource-cost mutation | Unsupported now: reject multi-target/multi-page requests before rolls/writes. A later leaf must preflight all writes and define per-target receipts, conditional compensation and explicit partial outcome before enabling it; no loop of independent successful attacks. |

Phase 15's honesty rules remain: write acceptance precedes success history, stale compensation may not overwrite newer state, history is additive, and current pages remain authoritative. Its standalone resource adapter attempts conditional rollback after append failure. The first action coordinator deliberately takes the conservative existing Phase 16 approach: **no automatic rollback after an append error**. EventStore can throw after bytes reached storage; rollback could leave durable success facts describing damage that was secretly reverted. A caught error is not proof that no record exists.

Readback may identify the exact transaction as durable, absent, corrupt or still unreadable; an absent record alone does not authorize applying damage again. EventStore's unique transaction/event ids protect log identity, not state-write idempotency. Do not introduce a silent retry or promise crash-safe exactly-once execution. After an interrupted page/log sequence, explicit user reconciliation uses current pages and historical evidence; the pipeline never reconstructs live state by replaying history.

BackupService remains recovery owner. Backup v1 includes pages/assets only, not the event sidecar. Restoring older HP/map pages leaves newer audit facts intact; stale Undo must fail its current-state checks. No restore event, automatic repair, action replay, schema migration or full-workspace backup on every attack is added.

## 9. Compensating Undo

17.4 must keep action transactions non-reversible in the current classifier until 17.5 installs the exact supported action reversal shape. Otherwise the existing one-resource classifier could expose premature Undo. Do not enable a generic Combat Undo.

17.5 uses the existing `undoTransaction` entry and Event History controls:

1. Read the original completed action transaction and reversal history from the same workspace through existing event APIs. Reject absent/corrupt/unsupported evidence, reversal-of-reversal and already reversed originals.
2. Validate action/roll/resource links and rebuild the complete original before/after health tuple from field facts plus guard values. Only one exact page with `hpCurrent`/`hpTemp` changes is supported; miss/no-change action has no state Undo.
3. Resolve the target page by id, read current durable Character/Properties state, and require current HP/temp HP/max to equal original after-state. Do not require the old actor to remain current or the session still active; this is conditional history compensation, not another attack. Deleted target, changed max or stale fields reject.
4. Prepare only the inverse changed fields against the current page base, preserving unrelated content. Write them together through PageCommandService with a current precondition; do not restore the old whole-page snapshot or call damage/healing math to guess the inverse.
5. Append one new transaction with inverse `resource.changed` facts (`reversesEventId`), `reversesTransactionId`, and `transaction.reversal.recorded`. No rerolls, deletion, mutation of original JSONL or second action-resolved/damage claim. Mark reversal links in the read model from additive history.

Recheck competing reversal attempts under the runtime action/Undo serialization boundary. Existing page preconditions still apply; cross-process exactly-once Undo is not promised. On failed compensation write, append no success reversal. On failed/unconfirmed reversal append after a confirmed compensation, preserve the compensated page and report uncertainty under section 8; block automatic retry. UI eligibility is advisory; execution must check durable state again.

Local editor Ctrl+Z and PageCommandService runtime undo are separate histories, not substitutes for this auditable Undo. First UI integration must not offer raw page snapshot Undo as a way to reverse an attack silently. Normal later editor changes can make action Undo stale; they never erase original facts.

## 10. Bounded Implementation Sequence

The active scheduling/status owner is [PROJECT_PLAN.md](../../01-delivery/PROJECT_PLAN.md); this table defines capability boundaries. No later leaf is implemented by 17.2.

| Leaf | Deliverable and acceptance boundary |
| --- | --- |
| 17.1 | This ownership/request/event/failure/Undo contract and Phase 17 activation; Foundation only. |
| 17.2 | **DONE / Foundation: Character health mutation preparation.** One validated frozen detached existing Properties page patch for current/temp HP, exact base/before/after/guard evidence, forward Character math, exact inverse-ready values, unchanged content preservation and parser/browser readback. No action execution, write, event append or UI. |
| 17.3 | **NEXT:** Single-target attack request and resolution. Exact current actor/target reads plus pure `ac-total-v1` hit/miss and one damage-component health plan using public Dice and Character APIs. Deterministic hit/miss/temp-HP/rejection tests; no durable action execution/UI. |
| 17.4 | One durable attack transaction. Pipeline commit orchestration, captured workspace boundary, strict `action.resolved` plus existing roll/resource events, readable Event History, failure/readback and no-double-log coverage. Keep action Undo explicitly unavailable until 17.5. |
| 17.5 | Compensating single-page attack Undo through existing reversal API. Both HP fields restored together, stale/max/deleted/double-undo/append-failure cases tested after reload. |
| 17.6 | First usable Combat attack flow in the existing popup: labeled explicit attack definition, one target, result/error/pending state, history and Undo. Both Goblin acceptance routes plus temp HP, save/reload and stale references pass browser/manual checks. No new popup layout project. |
| 17.7 | Ability/skill checks and saving throws through the same request/resolution/transaction owner, current Character calculations and explicit comparison policy; no implicit damage/effects. |
| 17.8 | Direct damage and multiple typed damage components on one target through the same health/transaction/Undo boundary. Preserve component evidence; mitigation rules require their own explicit rule support. |
| 17.9 | Healing and temporary-HP grants on one target using Character health ownership, explicit grant policy, persistence and Undo. |
| 17.10 | Existing numeric resource changes/costs and manual GM correction through the same pipeline. Start with one page; any actor-cost plus target-damage operation waits for an explicit multi-page failure/compensation contract. Reuse current correction/resource vocabulary without double logging. |
| 17.FINAL | Cumulative owner/failure/Undo/reload review and required gates. Verify the first manual attack routes, inventory supported action kinds and explicitly retain unsupported critical/mitigation/multi-page cases. Phase 18+ stays blocked until Phase 17 closure. |

Attack first is the retained product goal; 17.2 is a narrow missing composition boundary, not a substitute product milestone. Effects/conditions engine belongs to Phase 18; range/LoS/AoE to Phase 19. Reactions, readied-action execution, action economy, concentration, persistence of action catalogues and full D&D taxonomy remain outside the first slice. Ready/Delayed continue to be local markers only.

## 11. Verification And Linked Contracts

17.2 browser coverage exercises the real Properties DOM parser/writer and proves canonical temp-HP-first calculation, both fields in one plan, exact inverse-ready values, no-op, strict invalid/ambiguous/legacy rejection, stale durable-base rejection, frozen detached evidence, unchanged front matter/content and zero write/append/live DOM side effects. Focused Character/Properties/PageCommand tests and repository production gates remain required. No real user workspace is used.

Later regression targets: wrong current actor, missing exact references, copy/original-page identity, manual AC override, missing/duplicate HP fields, both HP fields in one page write, miss/no-change audit, public Dice-only dependency, zero extra standalone roll records, workspace switch/stale state, append after bytes then throw, failed/uncertain compensation, exact reload/history and manual Goblin acceptance. Tests must exercise behavior and durable fixtures, not only module names.

Related canonical contracts: [Combat Session](./COMBAT_SESSION_CONTRACT.md), [Event/Transaction](./EVENT_TRANSACTION_CONTRACT.md), [Dice Engine](./DICE_ENGINE_CONTRACT.md), [Character Model](./CHARACTER_MODEL_CONTRACT.md), [DnD calculations](./DND_CALCULATION_RULES.md), [Properties](./PROPERTIES_MODEL_CONTRACT.md), [Backup/Recovery](./BACKUP_AND_RECOVERY_CONTRACT.md), [Editor History](./EDITOR_HISTORY_CONTRACT.md).
