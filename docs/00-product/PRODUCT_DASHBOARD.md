---
summary: "Product dashboard with current project focus and links."
read_when:
  - "Before product planning"
  - "When changing product direction"
owner_zone: "product"
---
# Product Dashboard

Updated: 2026-07-20

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
- `0.0.1.2.2` native desktop click-through on the real large GM workspace `X:\ДНД\Мастер\По кампаниям\База`.
- `0.0.1.4.1` Properties block constructor: live drag preview, collision pushdown and visual grid-step handling.
- `0.0.1.4.2` standard character Properties layout: compact top metrics, one-row abilities and readable skill groups for new character/creature Properties blocks.
- `0.0.1.4.3` visible DnD calculations in Properties: ability modifiers, proficiency bonus, initiative, skills/expertise, armor-based AC and manual overrides.

Next active block:

- `0.0.1.4.4` Make armor selection use item picker behavior, unless a campaign-map bug from the lightweight backlog is promoted first.

## Readiness Model

Task status must use the readiness levels from `docs/01-delivery/DEFINITION_OF_DONE.md`:

- `Foundation` - useful base exists, but the human workflow is not complete.
- `MVP` - a basic user path exists and is testable.
- `Usable` - the owner can use it in normal work, with persistence and known risks handled.
- `Release-ready` - ready for handoff after automated and manual release checks.

This prevents "done" from meaning only "a model/helper was created".

## Key Risks

- Large real workspaces can still expose UI delay, especially in map-heavy sessions; the measurable and native `X:\ДНД\Мастер\По кампаниям\База` passes are currently green.
- Page lifecycle now has `PageCommandService`, `PageRecord`, trash/undo, PageIndex lifecycle, runtime write revision protection and workspace access diagnostics; richer recovery remains open.
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
