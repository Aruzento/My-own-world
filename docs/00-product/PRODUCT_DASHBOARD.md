---
summary: "Product overview and current roadmap pointer, with dated delivery history separated."
read_when:
  - "When reviewing product direction or cross-subsystem readiness"
owner_zone: "product"
---
# Product Dashboard

Updated: 2026-09-16

## Current Product

MyOwnWorld is a local-first worldbuilding OS for tabletop campaigns. It combines cards, campaign maps, presentation mode, task trackers, wiki links, assets, backups, desktop packaging and rule/character foundations in one workspace format.

The repository cleanup phase, existing P1 stabilization phase, Data Safety Completion phase, NF-001 Edit Session Conflict Protection phase, NF-002 Safe Dice Engine phase and NF-003 Event / Roll / Combat Log + Transactions phase are closed. NF-003 provides one durable, auditable event/transaction foundation with a canonical event store, RollResult logging, one reversible page-property resource transaction, a query API and a minimal event history UI. `0.0.1.16.0` Persistent Combat Session is CLOSED / PASS at `Usable` readiness; 16.1-16.10 are DONE and 16.FINAL is PASS. Combat current state lives in the Campaign Map page; the existing event history contains audit facts only. This is a persistent-session foundation, not full combat gameplay. Phase 17 is ACTIVE with 17.1-17.3 complete at Foundation readiness; 17.4 Durable Action Transaction is NEXT. A strict single-target attack can now resolve in memory, but it cannot persist HP, append action history or provide a usable Combat attack workflow. Phase 18+ remains BLOCKED and AI Core LATER.

## Current Focus

Active plan: `docs/01-delivery/PROJECT_PLAN.md`.

Immediate direction:

1. Use `docs/01-delivery/PROJECT_PLAN.md` as the only active implementation roadmap.
2. Treat `0.0.1.10.0` cleanup as closed after the corrective final gate.
3. Closed cleanup leaves so far: `RCB-021`, `RCB-001`, `RCB-001B`, `RCB-002`, `RCB-003`, `RCB-022`, `RCB-004`, `RCB-005`, `RCB-016`, `RCB-023`, `RCB-024`, `RCB-025`, `RCB-006A`, `RCB-006B`, `RCB-006C`, `RCB-006D`, `RCB-007A`, `RCB-007B`, `RCB-007C`, `RCB-007D`, `RCB-026`, `RCB-027`, `RCB-017`, `RCB-018`, `RCB-019`, `RCB-028`, `RCB-008`, `RCB-009`, `RCB-010`, `RCB-020`, `RCB-011`, `RCB-012`, `RCB-013`, `RCB-014`, `RCB-015`, `RCB-029` and `RCB-030`. `RCB-006` and `RCB-007` are closed.
4. Treat `0.0.1.11.0` Existing P1 Stabilization as closed after the final gate passed on 2026-08-24.
5. Treat `0.0.1.12.0` Data Safety Completion as closed after the final gate passed on 2026-08-24.
6. Treat `0.0.1.15.0` NF-003 Event / Roll / Combat Log + Transactions as closed after the final gate passed on 2026-08-28.
7. Closed phase: `0.0.1.16.0` Persistent Combat Session is `DONE` after 16.FINAL PASS on 2026-09-13.
8. Active phase: `0.0.1.17.0` Combat Action Pipeline. `17.1` architecture, `17.2` Character Health Mutation Preparation and `17.3` Single-Target Attack Resolution are `DONE` at `Foundation`; `17.4` Durable Action Transaction is `NEXT`. The first usable single-target attack with history/Undo remains planned for `17.6`.
9. Keep current design accepted for this stage; final visual polish returns later when mature workflows exist.
10. Keep project documentation readable for the product owner, not only for Codex.

Dated delivery evidence is in [dated implementation history](../archive/documentation-2026-09-15/PRODUCT_DASHBOARD_HISTORY.md); use the active plan for current state.

Next owner action:

- Continue with `0.0.1.17.4` Durable Action Transaction (NEXT); 17.1-17.3 are complete at Foundation readiness. Phase 16 remains CLOSED / PASS, Phase 17 ACTIVE, Phase 18+ BLOCKED and AI Core LATER.

## Readiness Model

Task status must use the readiness levels from `docs/01-delivery/DEFINITION_OF_DONE.md`:

- `Foundation` - useful base exists, but the human workflow is not complete.
- `MVP` - a basic user path exists and is testable.
- `Usable` - the owner can use it in normal work, with persistence and known risks handled.
- `Release-ready` - ready for handoff after automated and manual release checks.

This prevents "done" from meaning only "a model/helper was created".

## Key Risks

- Large real workspaces can still expose UI delay, especially in map-heavy sessions; the measurable and native `X:\ДНД\Мастер\По кампаниям\База` passes are currently green.
- Page lifecycle now has `PageCommandService`, `PageRecord`, trash/undo, PageIndex lifecycle, runtime write revision protection, optimistic edit-session conflict protection, workspace access diagnostics and grouped recovery/asset/link diagnostics. Dice rolls now have a canonical public facade, structured runtime results, explicit d20 advantage/disadvantage modes and natural-d20 critical metadata. Phase 15 provides typed durable history and its UI, Phase 16 provides session audit integration, and Phase 17 can resolve one strict single-target attack into a detached current/temp HP mutation plan. Durable action persistence, history, conditional Undo and UI are still required before an attack is usable.
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
