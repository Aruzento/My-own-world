---
summary: "Active project plan for MyOwnWorld version 1 work."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---

# Project Plan

Updated: 2026-07-22

Planning version: 1

Numbering starts at `0.0.1.0.0`.

This file contains only active and unfinished work. Completed history lives in [WORK_LOG.md](./WORK_LOG.md) and archived plans in [docs/archive](../archive/README.md).

## Rules

- Bugs and broken user flows have priority over new features.
- Completed work moves to `WORK_LOG.md` or an archive, not to the active plan.
- Partially completed work stays here as a smaller unfinished task.
- P0/P1 work needs an automated test or a clear note explaining why automation is not possible yet.
- If user-visible behavior changes, update release notes, tester instructions, or the manual.
- Future work is allowed here only when it is still actionable and should not be forgotten.
- Completed work must state a readiness level from [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md): `Foundation`, `MVP`, `Usable`, or `Release-ready`.
- Do not remove a plan item when only `Foundation` was completed and user-facing work remains.

## Active Plan

### 0.0.1.0.0. P0 Bug Triage & Stabilization

Goal: restore confidence in the core product before adding more features. MyOwnWorld must feel predictable in browser and desktop on both small and large workspaces.

Current inventory: [BUG_INVENTORY.md](./BUG_INVENTORY.md).

Deferred bugs and improvement notes: [BUGS_AND_IMPROVEMENTS_BACKLOG.md](./BUGS_AND_IMPROVEMENTS_BACKLOG.md).

Latest smoke pass: [SMOKE_PASS_2026-07-14.md](./SMOKE_PASS_2026-07-14.md).

Manual smoke checklist: [MANUAL_SMOKE_CHECKLIST.md](../03-testing/MANUAL_SMOKE_CHECKLIST.md).

No currently confirmed P0/P1 code failure remains in the small-workspace smoke pass. The external-audit security/docs cleanup for `0.0.1.0.4`-`0.0.1.0.7` is closed at usable project-process level. The next priority is page/workspace lifecycle hardening before new feature work.

### 0.0.1.1.0. Workspace Operations & Page Lifecycle Hardening

Goal: make page operations reliable, reversible and diagnosable on real large workspaces.

### 0.0.1.2.0. Desktop Product Hardening

Goal: desktop should feel like a real app, not a fragile wrapper around the browser build.

### 0.0.1.3.0. Campaign Map Stabilization & UX

Goal: map tools must be simple, fast, and usable during a live game.

### 0.0.1.6.0. Data Safety & Recovery

Goal: protect user content while the product grows.

### 0.0.1.7.0. Documentation, Manual & Release

Goal: the owner and testers should understand what changed and how to verify it.

### 0.0.1.8.0. System UI/UX Redesign

Goal: turn MyOwnWorld into a coherent professional desktop workbench for a GM: dense, readable, local-first, and calm, with dark fantasy used as accents rather than visual noise.

Source: `C:\Users\Aruko\Downloads\MyOwnWorld UI-UX Redesign.docx`.

Principles: do not rewrite the whole interface in one pass; do not create separate mini design systems for map, graph, cards, or task tracker; do not mix visual restyle with business logic changes. Every migrated area must keep browser and Tauri behavior working.

0.0.1.8.11. Migration Phase 5: core content.

Description: migrate tree, card editor, properties, templates, search, and command palette into the shared design system.

Status: advanced by `0.0.1.8.11.6`: `BI-013` block drag-and-drop is restored, `BI-014` Add block popup is redesigned, the card editor header/runtime controls now follow shared tokens and local sprite icons, Properties use field variants/states with local sprite badges, ordinary card blocks share one visual language with runtime-only type badges/thin markers/tokenized surfaces, card-block selects now use the shared dark select contract, and saved page templates are reachable from the create menu through a tokenized picker. Remaining work includes search depth and command palette migration.

0.0.1.8.12. Migration Phase 6: campaign map.

Description: migrate map toolbar, scene/list surfaces, layers, token dock, map inspector, and map contextual actions without changing map business logic.

0.0.1.8.13. Migration Phase 7: knowledge graph.

Description: migrate graph toolbar, canvas controls, node cards, edge states, inspector, and filters.

0.0.1.8.14. Migration Phase 8: secondary screens.

Description: migrate task tracker, settings, imports, backup/restore, release/help screens, diagnostics, and support panels.

0.0.1.8.15. Migration Phase 9: polish and cleanup.

Description: run accessibility audit, performance pass, visual regression, theme presets, animation review, dead CSS removal, and documentation updates.

0.0.1.8.16. Visual regression for design system.

Description: add fixed viewport/theme/scale screenshots for shell, tree, editor, properties, map, graph, popups, empty/loading/error states, compact/comfortable density, dark and high-contrast themes.
