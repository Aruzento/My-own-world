---
summary: "Canonical ownership, lifecycle, identity and persistence contract for Persistent Combat Session."
read_when:
  - "Before implementing Phase 16 Persistent Combat Session"
  - "Before changing Campaign Map initiative, current-turn, round or combat-session persistence"
owner_zone: "architecture"
---
# Persistent Combat Session Contract

Status: `0.0.1.16.1` architecture contract, resolved on 2026-09-04.

Readiness: `Foundation`. This document fixes the ownership and persistence decisions for Phase 16. It does not implement a Combat Session runtime, storage field, lifecycle command, UI or event type.

## 1. Scope

Persistent Combat Session is the reload-safe state surrounding an encounter on one Campaign Map. It owns session identity, lifecycle, roster membership, round number, combat-local participant flags and integrity status.

It does not own initiative calculation/order/current participant, Character calculations, map-page persistence or event history. Those responsibilities already have canonical owners.

Phase 16 implementation order is model first, then existing map persistence, lifecycle, initiative integration, turn/round progression, integrity, local flags, UI/reload and final recovery/event integration.

## 2. Canonical Owners

### Combat Session

`CombatSessionModel` is the one dedicated owner of Combat Session state. It will be a pure domain model aggregated by `CampaignMapModel`, not a second map store or persistence service.

It owns:

- session identity and lifecycle status;
- membership of initiative participants in the current session;
- round number and forward-wrap round semantics;
- `ready` / `delayed` combat-local markers;
- runtime integrity classification for unresolved participant references.

It must not parse card HTML, calculate Character values, roll/sort initiative, persist files directly, append EventStore records or own another current-turn index.

### Initiative

`CampaignMapInitiativeModel` is the canonical initiative owner. Current code proves that it owns:

- normalized initiative participants;
- participant `roll`, `modifier` and `total`;
- initiative sorting and tie behavior;
- `activeParticipantId`;
- `setActive()`, `nextTurn()` and `previousTurn()` progression.

`CampaignMapModel.initiative` stores its normalized JSON shape, and `CampaignMapStore.setInitiative()` is the current runtime mutation path. Combat Session must reuse these owners. It must not introduce another initiative array, roll implementation, sort implementation, modifier calculation, `currentIndex` or independently mutable active participant.

### Character

`CharacterModel` is the canonical source of Character and creature truth. It owns normalized Properties/legacy/inventory/effects inputs and derived HP, AC, speed, initiative modifier and combat summaries.

`campaignMapCharacterBridge.js` is the existing map-facing adapter. Combat Session may resolve a referenced page through that boundary, but it must not copy an entire `CharacterModel`, recalculate Character data or treat token snapshots as a second Character source of truth.

### Round

`CombatSessionModel` is the sole round owner. Current Campaign Map and initiative models have no round field or round behavior. Round is surrounding encounter lifecycle state, not initiative position.

### Campaign Map Persistence

`CampaignMapModel` / `CampaignMapStore` own open map state. `campaignMapDataSerializer` owns model-to-persistent HTML serialization. The existing editor save path sends that serialized map page through `persistPageContentCommand()` and `PageCommandService`, which owns write preconditions, durable page writes, rollback and PageRepository/PageIndex notification.

Combat Session must use this path. It must not write a sidecar, call `StorageAdapter` directly or add a second save controller.

### Event History

`transactionModel`, `eventTypes` and `eventStore` remain the transaction/event-history owners. `.my-own-world-events/transactions.v1.jsonl` is append-only audit history, not live Combat Session state.

Combat Session state must reload from the Campaign Map page without replaying events. Future meaningful operations may append typed facts only after their domain mutation succeeds. `turn.*` and `round.*` remain reserved and rejected until a later leaf defines explicit payload contracts.

## 3. State Model

The Phase 16 runtime contract is conceptually:

```js
{
  kind: 'CombatSession',
  version: 1,
  sessionId: 'opaque-stable-id',
  status: 'active' | 'paused' | 'finished',
  round: 1,
  participants: [
    {
      participantId: 'token:<tokenId>',
      ready: false,
      delayed: false
    }
  ]
}
```

This is a contract for later implementation, not a schema added by 16.1.

Rules:

- no current-turn field exists in Combat Session;
- no initiative order, roll, modifier or total is copied into Combat Session;
- no Character data is copied into Combat Session;
- participant order is resolved from `CampaignMapInitiativeModel.participants`;
- participant display/reference details are resolved from the initiative participant (`tokenId`, `pageId`, `sourceMode`, `name`) and then through existing token/page/Character owners;
- integrity is derived at load/use time from persisted identities. The model may expose structured runtime issues, but stale diagnostic text is not a new source of truth;
- only explicit typed combat-local fields are accepted. V1 must not contain a generic arbitrary flags/data bag.

## 4. Lifecycle

Application lifecycle states are:

- `inactive`: no current persisted Combat Session exists for the map;
- `active`: the session accepts explicit participant/initiative progression operations;
- `paused`: identity, roster, initiative, current participant, round and flags are retained, but session progression is suspended;
- `finished`: the session is terminal and retained for deterministic reload until an explicit new-session action replaces it.

Valid operations and transitions:

| From | Operation | To | Contract |
| --- | --- | --- | --- |
| inactive | start | active | Create a new `sessionId`; use the current canonical initiative state; do not reroll implicitly. |
| active | pause | paused | Preserve initiative/current participant/round/flags exactly. |
| paused | resume | active | Resume the same session identity and state. |
| active | finish | finished | Freeze session progression; preserve final state. |
| paused | finish | finished | Finish without an implicit resume or progression. |
| finished | start new | active | Create a new session identity; this is not resuming or mutating the finished session. |

All other same-session transitions are invalid. In particular, inactive cannot pause/resume/finish, active cannot resume, paused cannot pause again, and finished cannot pause/resume/advance.

The later lifecycle owner must return a structured rejected result for invalid transitions. It must not silently coerce status or reset initiative.

## 5. Participant Identity

The project already has a durable initiative participant identity. For map-token participants, `createParticipantFromToken()` creates `participantId` as `token:<tokenId>` and retains `tokenId`, optional `pageId`, `sourceMode` and `name` in the initiative participant.

Combat Session therefore stores that canonical `participantId` as a foreign reference and roster key. It does not generate a second combat-participant id for the same participant.

Ownership is distinct even though the identity value is shared:

- Combat Session owns whether the `participantId` belongs to this session and its combat-local flags;
- `CampaignMapInitiativeModel` owns the participant record, order and initiative values for that id;
- `CampaignMapModel` owns the referenced token identified by `tokenId`;
- page/Character owners own the optional source entity identified by `pageId`.

Session participants must never serialize an entire token, page or Character. If future non-token participants are added, their identity must first be supported by the canonical initiative owner rather than invented inside Combat Session.

## 6. Initiative Relationship

Combat Session references the existing initiative model; it does not mirror it.

The required relationship is:

```text
CombatSessionModel participant membership/local flags
                    |
                    v participantId reference
CampaignMapInitiativeModel participants/order/rolls/activeParticipantId
                    |
                    v tokenId/pageId reference
CampaignMapModel token + Page/Character owners
```

Initiative rolling, manual initiative edits, sorting and participant synchronization remain unchanged and outside `CombatSessionModel`.

Any operation that intentionally adds/removes an initiative participant while a session is active must later coordinate roster integrity through existing map owners. Accidental loss or unresolved references must not be treated as an intentional remove.

## 7. Current-Turn Ownership

`CampaignMapInitiativeModel.activeParticipantId` is the only persisted current-participant truth.

An index is derived when needed by looking up `activeParticipantId` in the current initiative order. Combat Session must not persist `currentIndex`, `currentParticipantId`, a duplicate pointer or a cached independently mutable position.

Future Combat UI reads the active participant from the initiative model. Future turn progression asks the initiative owner to advance and asks the Combat Session owner only whether a forward wrap increments round.

## 8. Round Semantics

- A successfully started session begins at round `1` with the current initiative participant selected by the initiative owner.
- Starting requires a non-empty canonical initiative roster and a resolvable `activeParticipantId`; start does not roll or sort initiative implicitly.
- The explicit forward `next turn` operation advances through `CampaignMapInitiativeModel.nextTurn()`.
- A forward transition from the last ordered initiative participant to the first is wraparound and increments Combat Session round by one.
- Selecting a participant directly, editing initiative, sorting, or moving backward does not increment or decrement round.
- Pause/resume does not alter round.
- Reload preserves round exactly.
- Finish freezes round; a finished session cannot advance.
- Round updates and the corresponding initiative update must be serialized in the same Campaign Map page save so reload cannot observe two independently durable truths.

The round owner may inspect initiative order and before/after active ids to prove wraparound, but it does not take ownership of initiative progression.

## 9. Persistence

Classification: **B - small extension of the existing Campaign Map persistence boundary**.

Current evidence:

- `CampaignMapModel` version 1 already aggregates persisted map state, including initiative;
- `CampaignMapStore` owns runtime mutation/dirty/DOM commit;
- `campaignMapDataSerializer` serializes normalized model state into the Campaign Map page;
- editor autosave selects the Campaign Map serializer and calls `persistPageContentCommand()`;
- `PageCommandService` owns precondition checking, durable write, rollback and repository/index notification.

Phase 16.3 may add an optional normalized `combatSession` field to the existing `CampaignMapModel`/serializer boundary. Maps without that field load as `inactive`. The extension must be backward-compatible and lazily written only through normal map saves; no eager workspace migration is required.

No separate database, sidecar, storage owner, migration subsystem or EventStore replay is allowed. The exact HTML attribute/encoding and compatibility tests belong to 16.3, but the storage location and owner do not remain open decisions.

## 10. Missing References

Mandatory rule: missing reference is not silent deletion.

When a persisted session participant cannot resolve its initiative participant, token or page/Character reference:

- the Campaign Map and Combat Session remain loadable;
- the roster entry and original `participantId` remain intact;
- existing initiative order and `activeParticipantId` are not silently rebuilt;
- no different token/page is substituted by title, alias or position;
- runtime integrity reports the exact missing layer (`initiative-participant`, `token`, or `page`);
- known initiative snapshot fields such as `name` remain display fallback only and do not become Character truth;
- only an explicit user/domain operation may remove or relink the participant.

Current `syncInitiativeParticipantsWithTokens()` already leaves an initiative participant unchanged when its token is absent. Phase 16.7 must preserve that behavior and add Combat Session-level diagnostics rather than filtering the participant away.

## 11. Reload Behavior

On Campaign Map reload:

- absent Combat Session data means `inactive`;
- `active`, `paused` and `finished` status reload unchanged;
- `sessionId`, roster references, round and combat-local flags reload unchanged;
- initiative participants/order/rolls and `activeParticipantId` reload through `CampaignMapInitiativeModel`;
- Character-derived values resolve through current page/Character owners when available;
- unresolved references produce integrity state while preserving original identities.

Reload must not reroll or resort initiative, select a replacement current participant, reset round/flags, delete missing participants or reconstruct current state from EventStore.

## 12. Event Integration

EventStore records auditable facts; Campaign Map persistence records current Combat Session state.

The later integration order is:

```text
explicit combat-session operation
  -> existing domain owner(s) accept and persist state
  -> transaction orchestrator creates typed fact(s)
  -> EventStore appends durable audit history
```

No Phase 16 operation may be reported as successful history when its state mutation failed. If event append fails after state persistence, the result must use the honest Phase 15 incomplete-outcome contract rather than claim filesystem-wide atomicity.

16.1 does not activate `turn.*`, `round.*`, action, damage, healing or effect payloads. Exact event vocabulary and restore/backup interaction are deferred to 16.10.

## 13. Deferred Functionality

Implementation remains divided into these leaves:

1. `0.0.1.16.2` Combat Session Model.
2. `0.0.1.16.3` Persistent Combat Storage.
3. `0.0.1.16.4` Lifecycle.
4. `0.0.1.16.5` Initiative Integration.
5. `0.0.1.16.6` Turn & Round Progression.
6. `0.0.1.16.7` Missing Reference Integrity.
7. `0.0.1.16.8` Ready / Delayed / Temporary Flags.
8. `0.0.1.16.9` Combat UI + Reload Workflow.
9. `0.0.1.16.10` Persistence / Recovery / Event Integration.
10. `0.0.1.16.FINAL` closure gate.

Each leaf must reuse the owners fixed by this contract. A later leaf may refine validation details but must not introduce a parallel source of truth without a separate owner decision.

## 14. Explicit Non-Goals

Phase 16.1 neither designs nor implements:

- CombatAction pipeline;
- damage or healing engine;
- HP automation;
- effects or conditions automation;
- targeting, range, line-of-sight or AoE;
- rest mechanics;
- movement, walls or vision;
- network collaboration or player client;
- dice UI or 3D dice;
- full Ready Action mechanics;
- reaction/interrupt pipeline;
- automatic action execution.

These systems must retain or define their own future domain owners. Combat Session must not absorb them speculatively.

## 15. Phase 16 Implementation Leaves

The non-negotiable implementation boundaries for 16.2-16.10 are:

- one `CombatSessionModel` for lifecycle/roster/round/local flags;
- existing `CampaignMapInitiativeModel` for initiative and current participant;
- existing `CharacterModel` for Character truth;
- existing `CampaignMapModel` / serializer / page command path for persistence;
- existing EventStore for audit history only;
- no second IDs, indexes, stores, save systems or replay-derived live state;
- no silent loss, replacement or reordering of unresolved participants.

Any leaf that cannot satisfy these boundaries with the existing owners must stop and request an architecture decision rather than create a parallel subsystem.
