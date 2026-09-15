# Release Notes

## 2026-09-14: Phase 17 Architecture Status

Phase 17 is ACTIVE; 17.1 is DONE at Foundation readiness and 17.2 Character Health Mutation Preparation is NEXT. This is documentation only: the first attack/history/Undo workflow is planned for 17.6. Phase 16 remains CLOSED / PASS; Phase 18+ remains BLOCKED and AI Core LATER. No user behavior, dependency or persistent format changed.

## 2026-09-13: Persistent Combat Session Closure

- Phase 16 is CLOSED / PASS at Usable readiness: lifecycle, explicit roster edits, current participant/rounds, independent Ready/Delayed, missing-reference warnings, exact reload and second-combat preparation are verified through the existing owners.
- Campaign Map page remains current-state truth; EventStore is audit-only. Backup v1 excludes event history, and restore never replays it. State-save failure adds no success event; audit failure after save remains an explicit incomplete outcome without retry/rollback or atomicity claims.
- Cumulative review: `e203a1b..895c92b`. Focused 232 unit/integration and 36 browser tests passed; final gates passed with 817 unit and 224 browser tests, including six unchanged approved popup comparisons. No runtime, test, dependency or format change was needed in FINAL; only status/testing docs were corrected.
- At Phase 16 closure, Phase 17 Combat Action Pipeline was NEXT / unblocked; its current architecture status is recorded above. AI Core remains LATER. No attacks, damage/healing, HP automation, targeting, effects, Ready Action execution or Combat Undo/replay was added. Installed-desktop acceptance remains a separate release check.

## 2026-09-12: Combat 16.10 - Recovery And Audit History

- Owner manual PASS accepted 16.9/16.9.1/16.9.2 as sufficient Combat foundation. At this leaf Phase 16 remained ACTIVE pending FINAL; the closure result above supersedes that status.
- Lifecycle, explicit active roster edits, Ready/Delayed, turns and forward round wraps now appear in the existing event history. A wrapping Next is one transaction with turn then round; no pre-combat/value-correction/dice/action events are added.
- The map page saves first. Failed or blocked saves add no successful event. If only audit append fails, the popup says `Состояние боя сохранено, но событие не записано в журнал.` The saved battle remains usable; there is no automatic rollback/retry or Combat Undo.
- Backup v1 remains pages/assets only and excludes the event sidecar. Restoring an older map does not rewind newer historical facts and never replays events into current Combat. Page, map, event-record and backup formats are unchanged.
- Disposable integration and browser coverage prove persistence/reload, exact restore, audit failure and corrupt-history independence. This is not an installed-desktop release approval; final closure is recorded above.

## 2026-09-11: Combat 16.9.2 - Prepare Before Starting Again

- A finished battle now offers `Подготовить новый бой`, not an immediate new Start. The existing participant picker opens with previous initiative intact: keep/remove/add participants, Roll d20 or edit values, then Apply.
- Apply saves initiative without starting combat. Review order/current participant, then explicitly press `Начать бой` for a fresh session id, round 1 and cleared Ready/Delayed. Ready/Delayed remain visible and independent during Combat.
- Preparation survives save/reload as normal pre-combat initiative; `Участники` remains available. A failed save remains an error and dirty state, not durable success. No persistent format change or new preparation mode.
- 16.9.1 layout is preserved. Subsequent owner manual PASS for layout and flow is recorded in the 16.10 section above; AI Core remains LATER.

## 2026-09-11: Combat UI 16.9.1 - Corrective History

- Owner manual acceptance of 16.9 failed despite automated/Foundation PASS: realistic names and controls collided in compressed rows.
- The existing popup now separates full wrapping names/current badge, initiative input/result, Ready/Delayed and warnings. A wider responsive layout gives the roster one internal scrollbar while navigation and lifecycle/footer actions remain reachable.
- Combat lifecycle, progression, flags, initiative edits, save/reload and formats are unchanged. Subsequent owner manual PASS resolves the former 16.10 HOLD; AI Core remains LATER.
- Retest the realistic 8+ member route in `release/latest/tester-instructions.md`; no new combat action mechanics are included.

## 2026-09-10: Combat UI 16.9 - Initial Delivery History

- The existing Campaign Map Initiative popup is now `Бой и инициатива`. `Применить` prepares initiative; a separate `Начать бой` starts a persistent session without rerolling or resetting the selected participant.
- Active sessions show round/current participant, independent `Готов` / `Отложен` markers, Previous/Next and Pause/Finish. Paused sessions freeze progression, values, roster and markers until explicit Resume; finished sessions retain the final state. The original `Новый бой` action is superseded by the 16.9.2 preparation flow above.
- Missing initiative/token/page references remain visible without repair. Active/paused/finished state survives the existing map save/reload path. Marker changes preserve pending numeric input; save that input before changing lifecycle or opening participant editing.
- Initial readiness was automated/Foundation; the later owner PASS and 16.10 audit integration are recorded above. This original UI leaf added no attack/damage/HP/effect mechanics or persistence migration. An unsuccessful save remains a save error, not a durable success; check page-save state before leaving.
- Manual route and screenshot evidence: the 16.9 section at the top of `release/latest/tester-instructions.md`.

## Handoff Requirements

The entries above identify the current architecture/session scope; they do not certify a newly built installer. Follow [DESKTOP_RELEASE_POLICY.md](../../docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md) and verify the exact build being handed off. Current roadmap owner: [PROJECT_PLAN.md](../../docs/01-delivery/PROJECT_PLAN.md).

### What To Run

- Browser/dev check: `npm run verify` and `npm run test:browser`.
- Focused browser check when validating one area: `npm run test:browser -- --grep <pattern>` or `npm run test:browser -- tests/browser/<file>.spec.mjs`.
- Desktop release gate before sending a build: `npm run desktop:gate`.
- Desktop installer path for handoff after a successful build: `src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe`.


### Known Risks

- Native desktop click-through, packaging smoke, desktop gate and real large-workspace smoke must stay part of release handoff before sending a build to another person.
- Large real workspaces should stay in release handoff because subjective feel can vary, but the current `BUG-001` pass did not reproduce a frozen or broken large-workspace workflow.
- Desktop audio/codec behavior still needs real-file verification.
- Knowledge Graph is usable as a migrated canvas workbench with command-lifecycle relationship persistence. The remaining graph risk is `BI-026`: rethink the graph concept before adding more visible graph features.
- The `0.0.1.8` redesign pass is accepted by the owner for the current stage. Final visual polish remains future debt. `0.0.1.11.0` Existing P1 Stabilization, `0.0.1.12.0` Data Safety Completion, `0.0.1.13.0` NF-001 Edit Session Conflict Protection, `0.0.1.14.0` NF-002 Safe Dice Engine and `0.0.1.15.0` NF-003 Event / Roll / Combat Log + Transactions are closed.
- Restore preview, partial restore, grouped asset/link/orphan diagnostics, backup-gated selected repair, edit-session conflict protection, NF-002 Dice Engine and the NF-003 durable event foundation are implemented for the current safety scope. Remaining explicit risks: backup/restore inclusion policy for `.my-own-world-events/`, broader undo/redo coverage, dice/roll action UI and future combat behavior are still not implemented.


## Previous Delivery Evidence

Consult [dated implementation history](../../docs/archive/documentation-2026-09-15/RELEASE_NOTES_HISTORY.md) only for a dated feature or verification record.
