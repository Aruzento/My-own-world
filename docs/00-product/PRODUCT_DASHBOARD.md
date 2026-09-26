---
summary: "Product overview and current roadmap pointer, with dated delivery history separated."
read_when:
  - "When reviewing product direction or cross-subsystem readiness"
owner_zone: "product"
---
# Product Dashboard

Updated: 2026-09-26

## Current Product

MyOwnWorld is a local-first worldbuilding OS for tabletop campaigns. It combines cards, campaign maps, presentation mode, task trackers, wiki links, assets, backups, desktop packaging and rule/character foundations in one workspace format.

The earlier foundation phases and Phase 16 remain closed. Phase 17 is PAUSED after `17.6` First Combat Attack Workflow, now DONE and accepted by the current owner instruction on 2026-09-24; this supersedes the earlier not-accepted status without claiming a new manual run. The active project is the nine-stage `CTV` Card Types / Variables Migration. Stages 1–6 Architecture, Schema/Registry, Variable Store/Entity API, Universal Inspector and both type-catalog stages are DONE / Foundation; Stage 7 safe Properties migration is the only NEXT task and requires a separate task. Preserve 17.6 behavior, complete all nine stages and parity, then resume at 17.7. Phase 18+ remains BLOCKED and AI Core LATER.

## Current Focus

Active plan: `docs/01-delivery/PROJECT_PLAN.md`.

Immediate direction:

1. Use `docs/01-delivery/PROJECT_PLAN.md` as the only active implementation roadmap.
2. Treat `0.0.1.10.0` cleanup as closed after the corrective final gate.
3. Closed cleanup leaves so far: `RCB-021`, `RCB-001`, `RCB-001B`, `RCB-002`, `RCB-003`, `RCB-022`, `RCB-004`, `RCB-005`, `RCB-016`, `RCB-023`, `RCB-024`, `RCB-025`, `RCB-006A`, `RCB-006B`, `RCB-006C`, `RCB-007A`, `RCB-007B`, `RCB-007C`, `RCB-007D`, `RCB-026`, `RCB-027`, `RCB-017`, `RCB-018`, `RCB-019`, `RCB-028`, `RCB-008`, `RCB-009`, `RCB-010`, `RCB-020`, `RCB-011`, `RCB-012`, `RCB-013`, `RCB-014`, `RCB-015`, `RCB-029` and `RCB-030`.
4. Treat `0.0.1.11.0` Existing P1 Stabilization as closed after the final gate passed on 2026-08-24.
5. Treat `0.0.1.12.0` Data Safety Completion as closed after the final gate passed on 2026-08-24.
6. Treat `0.0.1.15.0` NF-003 Event / Roll / Combat Log + Transactions as closed after the final gate passed on 2026-08-28.
7. Closed phase: `0.0.1.16.0` Persistent Combat Session is `DONE` after 16.FINAL PASS on 2026-09-13.
8. Paused phase: `0.0.1.17.0` Combat Action Pipeline after accepted `17.6`; 17.7 through 17.FINAL remain unfinished, blocked on the active `CTV` migration project.
9. Keep current design accepted for this stage; final visual polish returns later when mature workflows exist.
10. Keep project documentation readable for the product owner, not only for Codex.

Dated delivery evidence is in [dated implementation history](../archive/documentation-2026-09-15/PRODUCT_DASHBOARD_HISTORY.md); use the active plan for current state.

Next owner action:

- Assign CTV Stage 7 separately using the [canonical migration design](../02-architecture/CARD_TYPES_VARIABLES_MIGRATION.md) and the nine-stage order in [PROJECT_PLAN](../01-delivery/PROJECT_PLAN.md). After CTV Stage 9 closure and 17.6 parity, resume Phase 17 at 17.7. Stage 7 is not started by the Stage 6 foundation. Structured-card backup/copy/templates/packages remain explicitly blocked until lossless portability is implemented; legacy workspaces continue unchanged.

## Readiness Model

Task status must use the readiness levels from `docs/01-delivery/DEFINITION_OF_DONE.md`:

- `Foundation` - useful base exists, but the human workflow is not complete.
- `MVP` - a basic user path exists and is testable.
- `Usable` - the owner can use it in normal work, with persistence and known risks handled.
- `Release-ready` - ready for handoff after automated and manual release checks.

This prevents "done" from meaning only "a model/helper was created".

## Key Risks

- Large real workspaces can still expose UI delay, especially in map-heavy sessions; the measurable and native `X:\ДНД\Мастер\По кампаниям\База` passes are currently green.
- Page lifecycle now has `PageCommandService`, `PageRecord`, trash/undo, PageIndex lifecycle, runtime write revision protection, optimistic edit-session conflict protection, workspace access diagnostics and grouped recovery/asset/link diagnostics. Dice rolls have a canonical public facade. Phase 15 provides typed durable history, Phase 16 provides session audit integration, and Phase 17 retains durable single-target attack execution, supported compensation and the first popup workflow as Foundation work. Its manual acceptance is deferred while the new declarative card-type, Variables and universal Inspector architecture is built.
- Desktop release/native verification is currently green, but native click-through, packaging smoke and large-workspace smoke must stay part of release handoff.
- Campaign map presentation and drawing tools are currently verified for their focused matrices; fog/layers and music still require continued regression coverage.
- Properties and CharacterModel now have a usable card-to-map path and a simpler block creation entry, but the broader character workflow still needs release-ready polish.
- Knowledge Graph Phase 7 is now usable as a migrated canvas workbench with CSS/JS ownership split and command-lifecycle relationship persistence. The remaining risk is product direction, not hidden migration plumbing: `BI-026` should rethink what the graph helps a GM decide before new visible graph features.
- The active plan owns phase/leaf status; update a product summary or bug record only when its own scope becomes inaccurate.

## Where To Read Next

- Plan: `docs/01-delivery/PROJECT_PLAN.md`
- Specific historical decision: `docs/01-delivery/WORK_LOG.md`, only when the current contract does not explain its origin.
- Bug inventory: `docs/01-delivery/BUG_INVENTORY.md`
- Bugs and improvements backlog: `docs/01-delivery/BUGS_AND_IMPROVEMENTS_BACKLOG.md`
- Definition of Done: `docs/01-delivery/DEFINITION_OF_DONE.md`
- Agent rules: `AGENTS.md`
