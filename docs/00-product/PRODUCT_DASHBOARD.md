---
summary: "Product dashboard with current project focus and links."
read_when:
  - "Before product planning"
  - "When changing product direction"
owner_zone: "product"
---
# Product Dashboard

Updated: 2026-07-19

## Current Product

MyOwnWorld is a local-first worldbuilding OS for tabletop campaigns. It combines cards, campaign maps, presentation mode, task trackers, wiki links, assets, backups, desktop packaging and rule/character foundations in one workspace format.

The current phase is not feature expansion. The current phase is version-1 stabilization: make the app fast, safe, understandable and reliable on real large workspaces before adding another layer of features.

## Current Focus

Active plan: `docs/01-delivery/PROJECT_PLAN.md`.

Immediate direction after the external audit:

1. Finish security and data-safety fixes.
2. Harden page create, move, rename and delete through a command lifecycle.
3. Keep large workspace performance visible and measurable.
4. Stabilize campaign map workflows without adding new complexity.
5. Keep project documentation readable for the product owner, not only for Codex.

Recently closed:

- `0.0.1.0.4` runtime UI text security coverage.
- `0.0.1.0.5` desktop filesystem boundary hardening.

Next active block:

- `0.0.1.1.0` Workspace Operations & Page Lifecycle Hardening.

## Readiness Model

Task status must use the readiness levels from `docs/01-delivery/DEFINITION_OF_DONE.md`:

- `Foundation` - useful base exists, but the human workflow is not complete.
- `MVP` - a basic user path exists and is testable.
- `Usable` - the owner can use it in normal work, with persistence and known risks handled.
- `Release-ready` - ready for handoff after automated and manual release checks.

This prevents "done" from meaning only "a model/helper was created".

## Key Risks

- Large real workspaces can still expose UI delay, especially in tree operations and map-heavy sessions.
- Page lifecycle now has `PageCommandService`, `PageRecord`, trash/undo, PageIndex lifecycle and runtime write revision protection; richer recovery remains open.
- Desktop release is functional, but installed-app and large-workspace click-through must stay part of release handoff.
- Campaign map presentation, fog/drawing/layers and music require continued regression coverage.
- Properties and CharacterModel are promising, but the character workflow still needs a clearer release-ready path.
- README, dashboard, bug inventory and plan must stay synchronized so the project remains understandable to the owner.

## Where To Read Next

- Plan: `docs/01-delivery/PROJECT_PLAN.md`
- Work log: `docs/01-delivery/WORK_LOG.md`
- Bug inventory: `docs/01-delivery/BUG_INVENTORY.md`
- Bugs and improvements backlog: `docs/01-delivery/BUGS_AND_IMPROVEMENTS_BACKLOG.md`
- Definition of Done: `docs/01-delivery/DEFINITION_OF_DONE.md`
- Agent rules: `AGENTS.md`
