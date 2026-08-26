---
summary: "Contract for NF-003 Event, Roll, Combat Log and Transaction foundation."
read_when:
  - "Before implementing event logging or transaction persistence"
  - "Before wiring dice rolls, map actions, character actions, undo or combat into durable history"
owner_zone: "architecture"
---
# Event Transaction Contract

Status: `0.0.1.15.1` baseline and contract.

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

## Undo And Reversal

Undo must not silently delete history.

The event contract should treat reversal as a new auditable fact:

- the original transaction/event remains readable;
- a reversal transaction/event is appended;
- the original can be marked or linked as reversed by later history;
- UI may hide collapsed/reversed details, but the durable history owner must not erase the original record as the normal undo behavior.

Editor-local `Ctrl+Z` may still use `editorHistory` for local unsaved editing. Durable cross-subsystem action undo belongs to the future transaction/event owner and must coordinate through existing write/model owners.

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

## Proposed Durable Storage Decision

OWNER APPROVAL REQUIRED before implementation.

Durable event history requires a new workspace artifact because no current page, backup, operation-journal or package format is the product event log.

Proposed location:

```text
.my-own-world-events/
  transactions.v1.jsonl
```

Proposed record shape per line:

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

Version impact if approved:

- new event-log record version: `1`;
- new app-owned workspace sidecar directory: `.my-own-world-events/`;
- no page markdown/front-matter schema change;
- no Dice Engine result schema change;
- backup/restore inclusion policy must be explicitly decided before durable event writes are used for real sessions. If backups must preserve event history, `backupService` will need an additive manifest/update policy for this sidecar or a versioned backup-manifest decision.

This proposal is documented for owner review. `0.0.1.15.1` does not implement durable event storage and does not write `.my-own-world-events/`.

## Current Safe Baseline

- Safe dice rolls produce structured runtime `RollResult` with no side effects.
- Page commands already expose runtime command events and undo entries, but those are diagnostics/runtime undo, not auditable durable event history.
- Editor history can preserve local editing steps, but it does not cover cross-subsystem product facts.
- Operation journal can recover incomplete workspace operations, but it is internal recovery evidence, not player/session history.

## Current Gaps For Later Leaves

- No approved durable event-log storage exists yet.
- No append/read/reversal tests exist yet.
- No roll event consumer exists yet.
- No event UI exists yet.
- No combat/event vocabulary beyond the contract examples should be considered implemented.
