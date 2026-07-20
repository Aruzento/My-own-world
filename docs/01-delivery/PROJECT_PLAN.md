---
summary: "Active project plan for MyOwnWorld version 1 work."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---

# Project Plan

Updated: 2026-07-20

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

### 0.0.1.5.0. Knowledge Graph Visual Graph

Goal: "Graph of relationships" should become a real visual map of the world, not just a list.

0.0.1.5.6. Add graph regression tests.

Description: typed relationships, orphan view, visual graph data generation, and opening pages from graph.

### 0.0.1.6.0. Data Safety & Recovery

Goal: protect user content while the product grows.

0.0.1.6.1. Finish Safe HTML boundary.

Description: define and enforce allowed persistent HTML for cards, tables, wiki-links, task tracker, and campaign map shells.

0.0.1.6.2. Finish paste sanitization.

Description: pasted text and HTML must not bring scripts, runtime UI, unsafe links, or dangerous attributes.

0.0.1.6.3. Finish schema recovery UI.

Description: show workspace validation issues and allow safe repair actions only after backup. The real large workspace `X:\ДНД\Мастер\По кампаниям\База` currently reports 2074 schema issues in diagnostics, so this task must include a readable grouped report before any repair action.

0.0.1.6.4. Add recovery fallback tests.

Description: test invalid schema, partial data, malformed pages, missing assets, and backup-before-repair behavior.

### 0.0.1.7.0. Documentation, Manual & Release

Goal: the owner and testers should understand what changed and how to verify it.

0.0.1.7.1. Regenerate the full manual safely.

Description: clean `tools/generate_manual_docx.py` if needed, then regenerate `docs/MY_OWN_WORLD_FULL_MANUAL.docx` without broken encoding.

0.0.1.7.2. Keep docs encoding protected.

Description: keep `npm run check:encoding` green and extend it when new mojibake patterns appear.

0.0.1.7.3. Maintain GitHub Actions verify and browser smoke.

Description: keep CI green, update Node/action versions when needed, and preserve useful artifacts on failure.

0.0.1.7.4. Finish release notes and tester instructions.

Description: release handoff should tell what changed, what to test, known risks, and which desktop/browser build to run.

0.0.1.7.5. Preserve old plans as archives only.

Description: active plan stays clean; history and completed details go to `docs/archive` and `WORK_LOG.md`.

### 0.0.1.8.0. System UI/UX Redesign

Goal: turn MyOwnWorld into a coherent professional desktop workbench for a GM: dense, readable, local-first, and calm, with dark fantasy used as accents rather than visual noise.

Source: `C:\Users\Aruko\Downloads\MyOwnWorld UI-UX Redesign.docx`.

Principles: do not rewrite the whole interface in one pass; do not create separate mini design systems for map, graph, cards, or task tracker; do not mix visual restyle with business logic changes. Every migrated area must keep browser and Tauri behavior working.

0.0.1.8.1. UI/CSS inventory report.

Description: produce the first Codex report requested by the redesign brief: current UI/CSS file tree, existing components, duplicate controls, popup/modal implementations, icon approaches, hardcoded colors, proposed UI structure, proposed semantic token schema, migration map, browser/Tauri risks, reusable current UI, and any proposed dependencies.

0.0.1.8.2. Design system contract.

Description: create or update the design contract for MyOwnWorld UI: product image, AppShell/workbench zones, semantic design tokens, theme model, typography, spacing, density, radii, elevation, z-index scale, accessibility rules, and prohibited implementation patterns.

0.0.1.8.3. Theme foundation proof of concept.

Description: implement semantic tokens, theme manager/provider, typography scale, spacing scale, density modes, elevation levels, icon wrapper, and reduced motion foundation without migrating the whole app.

0.0.1.8.4. Component catalogue proof of concept.

Description: implement the first shared primitives only: one button, one input, one panel, one popover, and their hover/active/focus/disabled/keyboard states. Add usage examples and tests before broader migration.

0.0.1.8.5. AppShell proof of concept.

Description: create a minimal workbench layout with title/context bar, main navigation, primary sidebar, workspace, optional inspector, bottom panel, and status bar. Migrate only one safe section first.

0.0.1.8.6. Migration Phase 0: audit baselines.

Description: collect UI inventory, CSS inventory, icon inventory, popup inventory, and screenshot baseline. No large visual changes in this phase.

0.0.1.8.7. Migration Phase 1: foundations.

Description: apply semantic tokens, theme model, typography, spacing, density, elevation, and icon wrapper to app-level surfaces and shared layout rules.

0.0.1.8.8. Migration Phase 2: primitives.

Description: migrate buttons, icon buttons, inputs, selects, checkboxes, switches, sliders, badges, tabs, separators, and scroll areas to shared primitives.

0.0.1.8.9. Migration Phase 3: overlays.

Description: migrate dialog, popover, dropdown, context menu, tooltip, toast, and popup manager to one shared overlay lifecycle.

0.0.1.8.10. Migration Phase 4: AppShell.

Description: migrate main navigation, primary sidebar, workspace, inspector, bottom panel, status bar, resizing, and collapsing behavior.

0.0.1.8.11. Migration Phase 5: core content.

Description: migrate tree, card editor, properties, templates, search, and command palette into the shared design system.

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
