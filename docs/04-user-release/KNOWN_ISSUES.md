---
summary: "Known issues for user-facing releases."
read_when:
  - "Before release handoff"
  - "When user-facing behavior changes"
owner_zone: "user-release"
---
# Known Issues

## Текущие заметки

- Corrective 16.9.2 replaces immediate post-finish Start with explicit preparation through the existing picker. Its automated preparation/Apply/Start, reload and failure checks do not constitute owner manual acceptance. A failed prepare save leaves dirty runtime state and an error; reload reads the last saved state. Retest both 16.9.1 layout and 16.9.2 flow before removing the 16.10 NEXT/HOLD.

- Combat UI 16.9 automated/Foundation passed, but owner manual acceptance FAILED due to realistic-roster layout collisions. Corrective 16.9.1 provides structured wrapping cards, one internal roster scrollbar and reachable footer; automated coverage is not an owner acceptance decision. Manual retest is required and 16.10 remains NEXT/HOLD. Missing-reference warnings never repair data; Combat-only missing initiative members block ordinary roster editing rather than silently removing them. Save manual initiative inputs before lifecycle/participant-editor changes. Real desktop and recovery/EventStore integration acceptance is not claimed by this leaf.

- Desktop installed-app behavior still requires a manual pass before sending a build to another person.
- Large maps and large real workspaces can still expose subjective UI delay even when automated performance checks are green.
- Real desktop audio playback can depend on codec support and should be checked with the actual files used by the GM.
- Knowledge Graph is usable as a migrated visual canvas workbench with selected-node edge states, a laconic inspector/overlay layer, split CSS/JS ownership and command-lifecycle relationship persistence. The remaining graph issue is product direction: `BI-026` should rethink the graph concept before new visible graph features.
- Data Safety Completion is closed for the current v1 safety scope: restore preview, partial restore, grouped asset/link/orphan diagnostics and selected backup-gated link/relationship repair passed the final gate on disposable damaged data plus read-only real-workspace diagnostics. It still does not include repair-all, automatic orphan deletion, asset replacement guessing or bulk cleanup.
