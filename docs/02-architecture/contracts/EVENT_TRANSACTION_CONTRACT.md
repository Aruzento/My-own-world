---
summary: "Contract for NF-003 Event, Roll, Combat Log and Transaction foundation."
read_when:
  - "Before implementing event logging or transaction persistence"
  - "Before wiring dice rolls, map actions, character actions, undo or combat into durable history"
owner_zone: "architecture"
---
# Event Transaction Contract

Status: `0.0.1.15.FINAL` passed on 2026-08-28; NF-003 event/transaction foundation is closed.

This document defines the current owner map and the intended Event + Transaction boundary for Phase `0.0.1.15.0`. It is deliberately a contract note, not an implementation of event storage, roll history, combat, dice UI or persistent combat sessions.

## Core Concepts

Transaction = one user intent.

Event = one fact produced inside that transaction.

Examples:

```text
transaction "roll check"
  -> roll event

future transaction "attack"
  -> attack event
  -> roll event
  -> damage event
```

The second example is vocabulary only. Phase 15 must not implement combat session logic, attack resolution, damage application, HP automation, effects, targeting or turns/rounds behavior while defining the event foundation.

## Current Owners

`PageCommandService` currently owns durable page command lifecycle:

- command phases: validate, createRollback, apply, persist, updateIndexes, publishEvent;
- write preconditions and stale write blocking at the page persistence boundary;
- rollback after failed page persistence;
- incremental `PageRepository` / `PageIndex` notification after successful page writes;
- a runtime diagnostic `pageCommandEvents` list;
- a runtime page undo stack for supported page commands.

The existing `pageCommandEvents` list is not the future product event log. It is runtime command diagnostics, uses generated command ids/timestamps inside the command service, and is not persisted as user-visible auditable history.

`editorHistory` currently owns local editor undo/redo:

- per-page runtime snapshots of persistent editor HTML;
- grouped editor transactions for text, formatting, tables, wiki-links and structural block changes;
- runtime-only restore of editor UI after undo/redo.

Editor history is not durable event history. It can explain and reverse local editor steps, but it should not become the audit log for rolls, map actions, combat vocabulary or cross-subsystem transactions.

`Dice Engine` owns safe roll computation only:

- public facade: `rollDice(request, { randomInt })` and `validateDiceRoll(request)`;
- safe parser/evaluator, explicit limits, deterministic RNG injection, structured immutable `dice-roll-result`;
- no DOM, storage, page, character, map, combat, event-log, timestamp or generated event identity.

A future roll event may use `RollResult` as payload data. The Dice Engine must not create the event, choose actor/target context, persist the log or update UI.

`CampaignMapStore` owns the open map runtime model:

- tokens, shapes, fog, layers, music, grid, view and initiative state;
- dirty state;
- commit from model to DOM.

Campaign Map events must record facts around map-owned actions without bypassing the existing map model/save owners. The event foundation must not create a second map state owner.

`CharacterModel` owns normalized character and creature domain data:

- Properties/legacy DnD/inventory/effects integration;
- derived HP, armor class, speed, initiative modifier and related summaries;
- pure calculations and normalized runtime data.

Character events must not mutate card HTML or character data behind `CharacterModel`, Properties or the approved page command owners.

`operationJournal` owns recovery journaling for workspace filesystem operations:

- `.my-own-world-ops/pending`;
- `.my-own-world-ops/committed`;
- `.my-own-world-ops/failed`;
- operation recovery evidence for lightweight workspace mutations.

The operation journal is not product event history. It is an internal safety journal for incomplete filesystem work.

Existing persistent sidecar patterns include `.my-own-world-backups/`, `.my-own-world-ops/`, `world-packages/` and `rule-packages/`. These prove that workspace sidecars are an established pattern, but they do not pre-approve an event-log sidecar.

## Minimum Runtime Transaction Fields

A runtime transaction record should carry at least:

- `kind`: stable transaction discriminator, for example `mow-transaction`;
- `version`: runtime contract version;
- `transactionId`: identity owned by the future transaction/event owner;
- `intentType`: concise user-intent type, for example `roll-check`, `map-token-update` or future `attack`;
- `label`: human-readable summary for UI/logging;
- `createdAt`: timestamp owned by the transaction owner, not by Dice Engine;
- `order`: monotonic ordering evidence within the log owner;
- `source`: optional application source, such as editor, map, properties or automation;
- `status`: lifecycle state such as pending, committed, failed or reversed;
- `events`: one or more event ids or embedded event records produced by the same user intent;
- `reversesTransactionId`: optional link to the transaction being reversed;
- `reversedByTransactionId`: optional link from an original transaction to its reversal.

This is runtime/domain contract language. It is not a committed storage schema until the owner approves a durable event format.

## Minimum Runtime Event Fields

A runtime event record should carry at least:

- `kind`: stable event discriminator, for example `mow-event`;
- `version`: runtime contract version;
- `eventId`: identity owned by the future transaction/event owner;
- `transactionId`: parent transaction identity;
- `type`: fact type, for example `roll.performed`, `page.changed`, `map.token.moved`, `manual.correction.recorded`;
- `createdAt`: timestamp/order evidence owned by the transaction/event owner;
- `order`: event order inside its transaction;
- `payload`: structured fact payload;
- `reversesEventId`: optional link to the event this event reverses;
- `reversedByEventId`: optional link from an original event to its reversal;
- `payloadVersion`: optional version for event-type-specific payload shape.

Event payloads must not contain live DOM nodes, mutable page objects, storage handles, transient popup state or raw editor widgets. Payloads should contain stable data sufficient for audit and future replay/inspection decisions.

## Roll Event Boundary

Roll events consume `RollResult`; they do not ask the Dice Engine to persist anything.

Conceptually:

```js
{
  kind: 'mow-event',
  version: 1,
  type: 'roll.performed',
  payload: {
    roll: rollDice({
      formula: 'd20 + 5',
      mode: 'advantage',
      criticalPolicy: 'd20-natural'
    }),
    context: {
      actorId: '...',
      source: 'character-sheet'
    }
  }
}
```

The `context` belongs to the event consumer/transaction owner, not the Dice Engine.

## 0.0.1.15.5 Dice Roll Event Integration

`js/events/diceRollEventLog.js` is the first real Event Log consumer of Dice Engine `RollResult`.

Public roll-event operations:

- `createDiceRollTransaction(input, options)` calls the public Dice Engine facade, wraps the resulting `dice-roll-result` in one `roll.performed` event, and completes one transaction in memory.
- `logDiceRoll(input, options)` performs the same roll/transaction assembly and appends the completed transaction through `appendTransactionRecord()`.

Flow:

```text
caller intent
  -> logDiceRoll()
  -> rollDice()
  -> RollResult
  -> transaction
  -> roll.performed event
  -> appendTransactionRecord()
  -> .my-own-world-events/transactions.v1.jsonl
```

Ownership rules:

- Dice Engine remains side-effect free. `rollDice()` still does not import the event layer, create transactions, append history, show UI or write files.
- The roll-event integration layer owns the orchestration from a caller-owned roll intent to durable event append.
- The caller still owns why the roll happened: `intentType`, `label`, `source`, `reason` and stable context such as actor/action/map/token ids.
- Transaction/event identity and timestamps are supplied by the caller/orchestration boundary. Dice Engine does not generate them.
- The durable store remains the only owner of event sidecar writes.

Persisted roll event payload:

- stores the canonical `dice-roll-result`;
- preserves formula original/normalized data, faces, total, mode and critical metadata;
- does not store parser AST, parser token offsets, DOM objects, page records, character objects, token objects or workspace handles.

Failure behavior:

- if the event append fails, `logDiceRoll()` propagates `EventStoreError`;
- no durable success is reported;
- no hidden retry/backup/UI behavior is started;
- Dice Engine state is not mutated because Dice Engine owns no durable state.

Phase `0.0.1.15.5` does not add roll UI, dice UI, event log UI, combat/session mechanics, action/damage handling, HP automation, turns/rounds or backup/restore inclusion policy for the event sidecar.

## 0.0.1.15.6 First Stateful Transaction

`js/events/pagePropertyResourceTransaction.js` is the first state-changing Event Log consumer.

The v1 slice is deliberately narrow: it changes one existing numeric Properties-backed field on one page, then logs one `resource.changed` event. It does not create a generic object mutation engine.

Flow:

```text
caller intent
  -> logPagePropertyResourceChange()
  -> read current numeric page property
  -> create transaction
  -> persist page content through PageCommandService
  -> append resource.changed event through EventStore
  -> completed durable transaction
```

Ownership rules:

- `PageCommandService` remains the owner of durable page writes, write preconditions, rollback and PageRepository/PageIndex notification.
- `eventStore` remains the owner of `.my-own-world-events/transactions.v1.jsonl` append/read behavior.
- `eventTypes` remains the owner of strict `resource.changed` payload validation.
- The stateful resource transaction layer only orchestrates one caller-owned user intent across those existing owners.

Persisted `resource.changed` payload:

- records finite numeric `before`, `after` and `delta`;
- records target/field identity through the existing strict resource reference, using `kind: "page-property"` and `id: "<pageId>:<fieldKey>"`;
- may include a human-readable resource label, unit and reason;
- does not store DOM nodes, mutable page objects, storage handles, editor widgets or arbitrary executable data.

Failure behavior:

- invalid page/field/value input is rejected before any page write or event append;
- page write failure leaves no event record;
- blocked/stale page writes are not reported as durable event success;
- event append failure triggers a compensating rollback through `PageCommandService` so the page is not left changed without a durable event;
- rollback failure is reported distinctly with the original event append failure preserved as cause.

The `eventTypes` vocabulary keeps absent optional fields absent during normalization. This makes typed events idempotent when the event store revalidates a previously normalized event.

Phase `0.0.1.15.6` does not add resource UI, event log UI, dice UI, combat/session mechanics, attacks, damage application, HP automation, effects, targeting, turns/rounds or backup/restore inclusion policy for the event sidecar.

## Undo And Reversal

Undo must not silently delete history.

The event contract should treat reversal as a new auditable fact:

- the original transaction/event remains readable;
- a reversal transaction/event is appended;
- the original can be marked or linked as reversed by later history;
- UI may hide collapsed/reversed details, but the durable history owner must not erase the original record as the normal undo behavior.

Editor-local `Ctrl+Z` may still use `editorHistory` for local unsaved editing. Durable cross-subsystem action undo belongs to the future transaction/event owner and must coordinate through existing write/model owners.

## 0.0.1.15.7 Transaction Undo / Reversal

`js/events/transactionReversal.js` is the first durable undo orchestration layer.

V1 supported reversal:

- original transaction must be completed;
- original transaction must not already be a reversal;
- original transaction must contain exactly one `resource.changed` event;
- the resource must be `kind: "page-property"` with `id: "<pageId>:<fieldKey>"`;
- current page property value must still equal the original event `after` value;
- compensation applies `after -> before` through `logPagePropertyResourceChange()` and therefore through `PageCommandService`.

The compensating transaction appends new history instead of editing old history:

- transaction metadata sets `reversesTransactionId` to the original transaction id;
- first event is a compensating `resource.changed` event with `reversesEventId` pointing to the original resource event;
- second event is `transaction.reversal.recorded`, recording the original transaction id, reversal transaction id and reversed event ids.

Double undo is blocked by reading durable event history:

- if any completed transaction already has `reversesTransactionId` for the original transaction, the undo is rejected;
- if reversal metadata already records the original transaction id, the undo is rejected;
- the original transaction record remains unchanged and readable.

Non-reversible v1 cases:

- roll-only transactions are not state-reversible;
- transactions with multiple resource changes are not auto-reversed in v1;
- unsupported resource kinds are rejected;
- stale current resource state is rejected instead of guessing a merge.

Failure behavior:

- invalid/missing target page or field is rejected before compensation writes;
- page write failure leaves no reversal event;
- event append failure rolls the compensation page write back through `PageCommandService`;
- no backup is created merely because undo was blocked or rejected.

Phase `0.0.1.15.7` does not add undo UI, redo, combat/session mechanics, HP automation, forced overwrite, generic object mutation, backup/restore inclusion policy for the event sidecar or persistent format migration.

## 0.0.1.15.8 Event Read & Query API

`js/events/eventQuery.js` is the public read/query facade for future Event Log UI and later combat/session consumers.

Public read operations:

- `queryEventLog(query, { storageAdapter, strict })` reads through `readTransactionRecords()` and returns bounded event-query items.
- `getEventTransactionById(transactionId, { storageAdapter, strict })` returns one typed transaction or `null` when the id is unknown.
- `queryEventLogFromSnapshot(snapshot, query)` and `getEventTransactionByIdFromSnapshot(snapshot, transactionId)` perform the same query/lookup shaping from an already-normalized EventStore snapshot and perform no storage reads or JSONL parsing.

The query facade owns presentation-neutral read shaping:

- recent events by default, with newest durable log items first;
- `direction: "asc"` for chronological durable log order;
- `limit` with a fixed maximum of `200`;
- cursor pagination through `nextCursor`;
- filter by `transactionId`;
- filter by `eventType`;
- filter by `entityId` for supported payload references;
- filter by event `createdAt` range;
- filter by durable `logOrder` range.

Event-query items contain:

- `logOrder`, a one-based durable event position derived from transaction append order and event order within each transaction;
- transaction summary metadata without the transaction's embedded `events` array;
- the typed event payload;
- collected `entityIds` from known v1 payload locations such as `payload.resource.id`, `payload.subject.id` and roll-event context ids.

Consumer boundary:

- consumers must not parse `.my-own-world-events/transactions.v1.jsonl` directly for normal reads;
- consumers must not import event-store normalization helpers for UI queries;
- consumers that need several query operations for one refresh should read one `readTransactionRecords()` snapshot and reuse the snapshot query operations instead of issuing one durable read per helper call;
- query API does not write pages, append events, create backups or mutate repositories;
- invalid/corrupt durable records remain owned by `eventStore`; the query result only exposes `invalidRecordCount` as read evidence.

Phase `0.0.1.15.8` does not add Event Log UI, dice UI, combat/session mechanics, attacks, damage application, HP automation, turns/rounds, query language, SQL-like filtering, replay, backup/restore event-sidecar policy or persistent format migration.

## 0.0.1.15.9 Minimal Event Log UI

`js/ui/eventHistoryPanel.js` is the first user-visible read surface for the durable event log.

UI ownership:

- the action appears in the existing AppShell `Инструменты` popup as `Журнал событий`;
- the history surface uses the existing popup-manager modal dialog lifecycle;
- focus, Escape/outside lifecycle and close behavior remain owned by `popupManager`;
- visual styling is in `styles/event-history.css` and uses shared MyOwnWorld button/panel tokens.

Read boundary:

- each explicit Event History load/refresh reads one fresh EventStore snapshot through `readTransactionRecords()`;
- the UI derives visible event rows through `queryEventLogFromSnapshot()`;
- the UI reads a full transaction only through `getEventTransactionByIdFromSnapshot()` when it needs reversibility evidence;
- filtering, pagination, transaction lookup and undo-availability shaping for the same refresh reuse that snapshot and perform no additional durable event-log reads;
- a later explicit refresh, successful undo followed by refresh or workspace/storage change reads a new active-workspace snapshot rather than reusing a previous one;
- the UI must not parse `.my-own-world-events/transactions.v1.jsonl` directly;
- the UI must not import event-store normalization internals for presentation.

Displayed v1 event facts:

- durable event order as `#N`;
- event/transaction time;
- Russian event labels for roll, manual correction, resource change and reversal metadata;
- roll formula, total and dice faces from the stored Dice Engine `RollResult`;
- resource `before -> after` values;
- undo/reversal relationship text when `reversesTransactionId`, `reversedByTransactionId` or `reversesEventId` is present.

Undo boundary:

- undo is visible only for transactions classified as reversible by `classifyTransactionReversibility()`;
- persistent undo calls `undoTransaction()` from `js/events/transactionReversal.js`;
- roll-only and reversal transactions remain non-reversible in the UI;
- the UI does not delete or edit old event records and does not create a second undo owner.

Phase `0.0.1.15.9` does not add combat/session mechanics, dice UI, dashboard cards, raw storage parsing in UI, backup/restore event-sidecar policy or persistent format migration.

## 0.0.1.15.10 Event Safety Integration

Stateful event adapters must keep durable state and durable event history from silently diverging.

Stateful adapter rule:

- do not append a successful state-change event before the state mutation is accepted by the existing state owner;
- state mutation failure or PageCommandService stale-write conflict means no successful `resource.changed` event is appended;
- event append failure after state mutation must produce an explicit runtime outcome;
- rollback, when attempted, must use the current page-command/precondition owner and must not overwrite newer durable state;
- a blocked rollback is reported as incomplete runtime evidence, not as success.

Current `page-property` resource adapter outcomes:

- `state-unchanged-event-not-written`: state was not written and no event became durable;
- `state-rolled-back-event-not-written`: state write succeeded, event append failed, rollback restored the previous content and no event became durable;
- `state-may-be-changed-event-not-written`: state write succeeded, event append failed and rollback could not prove it was safe to restore the previous content because durable state changed again.

Recovery and conflict boundary:

- restore and partial restore remain `backupService` recovery operations, not event replay;
- after restore or another recovery write changes durable state, a later undo/reversal attempt must check current durable state before appending compensation;
- conflict detection does not create backups because no durable mutation happened;
- Event Query reads through the active `StorageAdapter` and is workspace-scoped by that adapter, not by UI-level cache.

Atomicity statement:

- MyOwnWorld does not currently claim filesystem-wide atomicity between a page file write and the event sidecar append;
- Phase `0.0.1.15.10` records honest failure/recovery evidence instead of pretending those two files are one atomic storage unit.

Phase `0.0.1.15.10` does not add combat/session mechanics, dice UI, event replay, restore replay, backup format migration, event JSONL format migration or persistent workspace schema migration.

## 0.0.1.15.11 Future Event Adapter Boundary

Future domain integrations must be adapters around existing domain owners, not new duplicate state owners.

Required pattern:

```text
domain owner performs operation
  -> transaction orchestrator assembles one user intent
  -> one or more typed events
  -> appendTransactionRecord()
  -> durable Event Store
```

Adapter boundary rules:

- a future adapter must call the current domain owner first for real state changes;
- page-backed state still writes through `PageCommandService`;
- map-backed state still goes through `CampaignMapStore` and the map save owner;
- character/resource state still goes through `CharacterModel`, Properties and approved page command owners;
- Dice Engine remains side-effect free and contributes only `RollResult` data;
- the adapter owns transaction/event identity, timestamp/order, source/reason and domain context;
- event payloads must be plain typed data, not DOM nodes, mutable page objects, storage handles or executable hooks;
- the durable store must not import future adapters or branch on combat/map/character concepts;
- a future event type must be implemented in `eventTypes` with an explicit `payloadVersion` contract before the store accepts it.

Future event namespaces and expected owners:

- `action.*`: owned by the future action/combat pipeline. An action transaction may later produce an action event plus roll/resource/damage/effect events, but Phase 15 does not implement action resolution.
- `damage.*`: owned by the future damage application owner after target/resource mutation succeeds through existing character/page owners. It must not bypass `resource.changed` or page conflict rules when HP/resources change.
- `healing.*`: owned by the future healing application owner after the actual resource mutation succeeds. It must preserve the same state/event safety contract as damage.
- `effect.*`: owned by the future Effects/Conditions model. Add/remove/update events must follow the effect model's own persistence owner, not write card HTML directly.
- `turn.*`: owned by the future persistent combat/session owner. It records turn facts only after the session state owner accepts the transition.
- `round.*`: owned by the future persistent combat/session owner. It records round facts only after the session state owner accepts the transition.
- `rest.*`: owned by the future rest workflow. A rest transaction may produce rest, resource and effect events, but actual resource/effect mutations must still use their domain owners.
- `movement.*`: owned by Campaign Map movement/save owners for map token movement. It must not create a second DnD or map persistence path.
- `scene.transition.*`: owned by the future scene/presentation/map transition owner. It records transition facts after the relevant map/presentation state owner accepts the operation.

Current contract tests:

- `tests/eventFutureAdapterContract.test.mjs` proves an adapter-style transaction can be assembled with public transaction APIs and appended through `appendTransactionRecord()` without Event Store knowing the adapter.
- The same test proves `eventStore` delegates vocabulary validation to `createTypedEvent()` instead of importing concrete adapters or event-type constants.
- Reserved future namespaces still fail as `EVENT_TYPE_UNKNOWN` with `reservedFuture` evidence until a future leaf adds their typed payload contracts.

Phase `0.0.1.15.11` does not implement action, damage, healing, effect, turn, round, rest, movement, scene-transition behavior, combat sessions, dice UI, empty combat services, Character/Map schema changes or persistent format migration.

## Boundary Rules

- Page writes still go through `PageCommandService` / approved page write owners.
- Roll computation still goes through the Dice Engine public facade.
- Map state mutations still go through Campaign Map model/store/save owners.
- Character calculations still go through `CharacterModel` and current Properties/Character owners.
- Backup/recovery still goes through `backupService` and existing recovery owners.
- Event logging must record facts from those owners. It must not become a second storage adapter, second map store, second character model or second dice engine.

## 0.0.1.15.2 Transaction Model

`js/events/transactionModel.js` is the pure runtime domain model for Phase 15 transaction records.

Public model operations:

- `createTransaction(input)` creates a started transaction from caller-supplied identity, time/order and source/reason metadata.
- `appendTransactionEvent(transaction, eventInput)` returns a new transaction with one ordered event appended.
- `createTransactionEvent(input)` creates a subsystem-neutral event record.
- `completeTransaction(transaction, { completedAt })` closes a started transaction with at least one event.
- `failTransaction(transaction, { failedAt, error, code })` records a failed transaction without adding durable side effects.
- `createReversalTransaction(input)` creates a started transaction linked to the transaction it reverses.
- `markTransactionReversed(transaction, { reversedByTransactionId })` links a completed original transaction to a reversal transaction.
- `serializeTransaction(transaction)` / `serializeTransactionEvent(event)` return deterministic JSON-compatible shapes for later store work.

Pure model rules:

- the model does not import DOM, UI, storage, PageCommandService, Dice Engine, Campaign Map or CharacterModel;
- the model does not generate ids, timestamps or random values;
- the model does not persist anything;
- completed and failed transactions are immutable and cannot receive later events;
- a completed transaction must contain at least one event;
- event order is monotonic inside the parent transaction;
- payloads must be JSON-serializable data only;
- subsystem context such as actor id, token id or page id belongs inside event payloads, never as generic transaction-model fields.

The model can be consumed by the future durable event store, but it is not the store.

## 0.0.1.15.4 Event Type Vocabulary

`js/events/eventTypes.js` is the Phase 15 vocabulary owner for durable event payload contracts.

Public vocabulary operations:

- `createTypedEvent(input)` creates a `mow-event` only when `type` is known, `payloadVersion` is supported and the payload matches that event type contract.
- `validateTypedEvent(input)` returns a structured validation result for future consumers without requiring them to parse error text.
- `isKnownEventType(type)` reports whether a type is implemented in the current vocabulary.
- `isReservedFutureEventType(type)` reports whether a type belongs to a documented future namespace that is not implemented yet.

Implemented V1 event types:

- `roll.performed` with `payloadVersion: 1`. Payload contains a canonical Dice Engine `dice-roll-result` plus a small explicit `context` record owned by the event consumer. Context is limited to stable string fields such as `source`, `actorId`, `actorPageId`, `targetId`, `targetPageId`, `mapPageId`, `tokenId`, `actionId`, `ruleId` and `label`.
- `manual.correction.recorded` with `payloadVersion: 1`. Payload records a stable subject reference, field, before value, after value and optional reason. Before/after values are limited to scalar audit data: string, finite number, boolean or null.
- `resource.changed` with `payloadVersion: 1`. Payload records a stable resource reference, finite numeric before/after/delta values, optional unit and optional reason. For the first stateful page-property consumer, the resource reference records the target and field as `kind: "page-property"` and `id: "<pageId>:<fieldKey>"`.
- `transaction.reversal.recorded` with `payloadVersion: 1`. Payload records the original transaction id, reversal transaction id, optional reversed event ids and optional reason. Reversal is additive history; it does not delete the original transaction/event.

Reserved future namespaces:

- `action.*`;
- `damage.*`;
- `healing.*`;
- `effect.*`;
- `turn.*`;
- `round.*`;
- `rest.*`;
- `movement.*`;
- `scene.transition.*`.

Reserved future namespaces are documentation and naming direction only. They are not implemented event types in `0.0.1.15.4`; `createTypedEvent()` rejects them with structured `EVENT_TYPE_UNKNOWN` evidence marked as `reservedFuture`.

Vocabulary safety rules:

- each implemented event type has a stable `type`, event model `version: 1` and `payloadVersion: 1`;
- payload schemas reject unknown fields instead of accepting arbitrary JSON bags;
- executable/live values such as functions, DOM nodes, storage handles, mutable page objects and widget state are not valid payload data;
- future combat/action/damage/turn behavior must add explicit event payload contracts before it can be appended as durable history.

Durable-store relationship:

- `js/events/eventStore.js` still owns the `.my-own-world-events/transactions.v1.jsonl` append/read mechanics;
- before append/read normalization, the store validates every event through `createTypedEvent()`;
- this prevents the durable store from becoming a generic `type + anything JSON` escape hatch.

## Durable Storage Decision

Owner approved the `0.0.1.15.1` sidecar decision in the `0.0.1.15.3` task prompt. `0.0.1.15.3` implements the first durable store in `js/events/eventStore.js`.

Durable event history uses a workspace sidecar because no current page, backup, operation-journal or package format is the product event log.

Location:

```text
.my-own-world-events/
  transactions.v1.jsonl
```

Record shape per line:

```json
{
  "kind": "mow-transaction-record",
  "version": 1,
  "transaction": {
    "kind": "mow-transaction",
    "version": 1,
    "transactionId": "...",
    "intentType": "roll-check",
    "label": "...",
    "createdAt": "...",
    "order": 1,
    "source": "character-sheet",
    "status": "committed",
    "reversesTransactionId": null,
    "reversedByTransactionId": null
  },
  "events": [
    {
      "kind": "mow-event",
      "version": 1,
      "eventId": "...",
      "transactionId": "...",
      "type": "roll.performed",
      "createdAt": "...",
      "order": 1,
      "payloadVersion": 1,
      "payload": {}
    }
  ]
}
```

Store contract:

- `appendTransactionRecord(transaction, { storageAdapter })` appends one completed/failed transaction as one JSONL line.
- `readTransactionRecords({ storageAdapter, strict })` reads valid records and reports corrupt/invalid lines as structured `invalidRecords`.
- `readEventTransactions({ storageAdapter })` returns reconstructed transaction shapes for consumers that only need the transaction data.
- every durable event record must pass `js/events/eventTypes.js` vocabulary validation.
- record order is file append order; event order inside a transaction is validated by the transaction model and store.
- started transactions remain runtime-only and are not durable history records.
- corrupt/invalid old lines are not silently edited or deleted by read.
- write failure throws `EventStoreError` and must not be reported as durable success.
- the store writes only `.my-own-world-events/transactions.v1.jsonl`; it does not store hidden state inside card HTML and does not own UI.

Storage append capability:

- `appendText(path, content)` is an optional `StorageAdapter` capability, not part of `REQUIRED_STORAGE_ADAPTER_METHODS`.
- production browser and desktop adapters implement `appendText` so EventStore can append one JSONL line without loading and rewriting the existing log through JavaScript.
- browser append uses the File System Access writable stream at the current file size with existing data preserved.
- desktop append uses the workspace-scoped Tauri `append_text_file` command, backed by append/create file open semantics.
- when `appendText` is absent, EventStore keeps the compatibility read/write fallback for minimal injected adapters.
- when `appendText` exists but fails, EventStore reports `EVENT_STORE_WRITE_FAILED` and must not silently retry with the compatibility fallback.

Version impact:

- new event-log record version: `1`;
- new app-owned workspace sidecar directory: `.my-own-world-events/`;
- no page markdown/front-matter schema change;
- no Dice Engine result schema change;
- backup/restore inclusion policy is still not decided. If backups must preserve event history, `backupService` needs a later additive policy for this sidecar or a versioned backup-manifest decision.

## Current Safe Baseline

- Safe dice rolls produce structured runtime `RollResult` with no side effects.
- Durable event history has one sidecar owner: `.my-own-world-events/transactions.v1.jsonl` through `js/events/eventStore.js`.
- Completed durable transactions must contain at least one validated event; failed transactions remain auditable failure outcomes.
- The first stateful page-property resource adapter can only log the `page-property` resource it actually changed.
- Page commands already expose runtime command events and undo entries, but those are diagnostics/runtime undo, not auditable durable event history.
- Editor history can preserve local editing steps, but it does not cover cross-subsystem product facts.
- Operation journal can recover incomplete workspace operations, but it is internal recovery evidence, not player/session history.

## Current Gaps For Later Leaves

- Roll events can now be appended through `logDiceRoll()` and read in the minimal Event Log UI, but there is no dedicated dice tray or roll action UI yet.
- The first stateful page-property resource integration exists, but no broader character/map/action/damage/healing/effect integration exists yet.
- The minimal Event Log UI exists, but no combat/session panel exists yet.
- Backup/restore inclusion for `.my-own-world-events/` is not decided yet.
- Reserved future event namespaces do not implement action, damage, healing, effect, turn, round, rest, movement or scene-transition behavior yet.
