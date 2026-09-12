---
summary: "Known issues for user-facing releases."
read_when:
  - "Before release handoff"
  - "When user-facing behavior changes"
owner_zone: "user-release"
---
# Known Issues

## Текущие заметки

- Owner manual acceptance of Combat UI 16.9/16.9.1/16.9.2 is PASS as sufficient foundation. Phase 16 remains ACTIVE pending 16.FINAL; this is not installed-desktop release acceptance.

- Combat 16.10 saves the page before appending audit history. If append fails, the saved state remains valid and the popup says `Состояние боя сохранено, но событие не записано в журнал.` There is no automatic retry/rollback or atomic page-plus-event guarantee. Backup v1 excludes event history: restore may show an older current battle alongside newer historical facts. A filesystem failure after bytes were written can leave an uncertain audit outcome; do not retry blindly.
- Missing-reference warnings never repair data. Combat-only missing initiative members block ordinary roster editing; save pending initiative inputs before lifecycle/participant-editor changes. No Combat undo, replay or attack/damage/HP automation is included.

- Desktop installed-app behavior still requires a manual pass before sending a build to another person.
- Large maps and large real workspaces can still expose subjective UI delay even when automated performance checks are green.
- Real desktop audio playback can depend on codec support and should be checked with the actual files used by the GM.
- Knowledge Graph is usable as a migrated visual canvas workbench with selected-node edge states, a laconic inspector/overlay layer, split CSS/JS ownership and command-lifecycle relationship persistence. The remaining graph issue is product direction: `BI-026` should rethink the graph concept before new visible graph features.
- Data Safety Completion is closed for the current v1 safety scope: restore preview, partial restore, grouped asset/link/orphan diagnostics and selected backup-gated link/relationship repair passed the final gate on disposable damaged data plus read-only real-workspace diagnostics. It still does not include repair-all, automatic orphan deletion, asset replacement guessing or bulk cleanup.
