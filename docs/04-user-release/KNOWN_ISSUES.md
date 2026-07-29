---
summary: "Known issues for user-facing releases."
read_when:
  - "Before release handoff"
  - "When user-facing behavior changes"
owner_zone: "user-release"
---
# Known Issues

## Текущие заметки

- Desktop installed-app behavior still requires a manual pass before sending a build to another person.
- Large maps and large real workspaces can still expose subjective UI delay even when automated performance checks are green.
- Real desktop audio playback can depend on codec support and should be checked with the actual files used by the GM.
- Knowledge Graph is usable as a visual canvas workbench with selected-node edge states, a laconic inspector/overlay layer, split CSS ownership and first inspector/labels JS ownership split, but richer day-to-day relationship operations, remaining canvas/actions/context-menu JavaScript split, lifecycle hardening and concept rethink remain backlog work.
- Restore preview, partial restore, link cleanup and asset repair are still unfinished data-safety work.
