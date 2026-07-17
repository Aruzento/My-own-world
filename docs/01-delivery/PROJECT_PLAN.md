---
summary: "Active project plan for MyOwnWorld version 1 work."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---

# Project Plan

Updated: 2026-07-17

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

## Active Plan

### 0.0.1.0.0. P0 Bug Triage & Stabilization

Goal: restore confidence in the core product before adding more features. MyOwnWorld must feel predictable in browser and desktop on both small and large workspaces.

Current inventory: [BUG_INVENTORY.md](./BUG_INVENTORY.md).

Latest smoke pass: [SMOKE_PASS_2026-07-14.md](./SMOKE_PASS_2026-07-14.md).

Manual smoke checklist: [MANUAL_SMOKE_CHECKLIST.md](../03-testing/MANUAL_SMOKE_CHECKLIST.md).

No currently confirmed P0/P1 code failure remains in the small-workspace smoke pass. After the external audit received on 2026-07-16, the next concrete priority is security and filesystem boundary hardening before new feature work.

0.0.1.0.5. Desktop filesystem boundary hardening.

Description: move the trust boundary into Rust for desktop file operations.

0.0.1.0.5.1. Store allowed workspace root in Rust-managed state.

Description: after folder selection, Rust records the canonical allowed root; frontend commands pass only workspace-relative paths.

0.0.1.0.5.2. Forbid deleting the workspace root.

Description: `remove_directory` must reject empty paths, `.` and any path resolving to the canonical workspace root.

0.0.1.0.5.3. Harden symlink/junction boundary checks.

Description: when creating a new file or directory, resolve and validate the nearest existing parent and prevent path escape through symlink/junction tricks.

0.0.1.0.5.4. Add atomic writes for desktop text/binary files.

Description: write to a temporary file inside the same directory, flush/validate where practical, then rename into place.

0.0.1.0.5.5. Split desktop filesystem error codes.

Description: distinguish missing file, missing permission, disconnected disk, locked file, path escape and root-delete rejection in command errors and diagnostics.

0.0.1.0.5.6. Add Rust and JS tests for desktop filesystem boundaries.

Description: cover root deletion, path escape, symlink/junction parent validation, atomic write behavior and relative-only command usage.

0.0.1.0.6. Clean stale project status docs from the audit.

Description: update README, Product Dashboard, BUG_INVENTORY and active plan references so they match the current app status, Node version, desktop status, latest commit direction and current release process.

0.0.1.0.7. Add Definition of Done levels for Codex tasks.

Description: introduce `Foundation`, `MVP`, `Usable`, and `Release-ready` readiness labels in planning/work-log handoff so a task is not called done when only a model, temporary UI or unverified foundation exists.

### 0.0.1.1.0. Workspace Operations & Page Lifecycle Hardening

Goal: make page operations reliable, reversible and diagnosable on real large workspaces.

0.0.1.1.1. Create PageCommandService.

Description: route create, rename, move, delete and batch operations through commands with validate, rollback, apply, persist, index update and diagnostic event phases.

0.0.1.1.2. Introduce a PageRecord pipeline.

Description: centralize page parse, validate, migrate, serialize front matter, sanitize persistent body and write. Stop ad-hoc front matter line replacement.

0.0.1.1.3. Add required page metadata fields.

Description: add or migrate `schemaVersion`, `updatedAt` and content hash/checksum fields for diagnostics and incomplete-write detection.

0.0.1.1.4. Add trash and undo foundation for page operations.

Description: support restore for delete and undo for move/rename/delete before adding broader destructive workflows.

0.0.1.1.5. Improve PageIndex and search lifecycle.

Description: add content indexing, ranking, path display, recent/recently edited pages and one lifecycle for rename, alias and metadata changes; consider Web Worker indexing for large workspaces.

0.0.1.1.6. Add write revision and transaction protection.

Description: autosave/write queue should prevent older operations from overwriting newer content and expose changed/saving/saved/error/conflict states.

0.0.1.1.7. Add read-only/external workspace test matrix.

Description: verify workspaces on another disk, network folder, external drive, outside `$HOME` and read-only mode, with diagnostics that explain the failure.

### 0.0.1.2.0. Desktop Product Hardening

Goal: desktop should feel like a real app, not a fragile wrapper around the browser build.

### 0.0.1.3.0. Campaign Map Stabilization & UX

Goal: map tools must be simple, fast, and usable during a live game.

### 0.0.1.4.0. Properties & Character UX

Goal: character properties should feel like a clear editable character sheet, while staying flexible for homebrew.

0.0.1.4.1. Finish the Properties block constructor.

Description: fields can be placed freely, never overlap unintentionally, resize from any edge, keep inputs inside borders, and preserve empty grid gaps when the user wants them.

0.0.1.4.2. Improve standard character layout.

Description: make small fields like level, AC, and HP compact; keep abilities on one readable row; use the user-sorted layout from the real character card as the default.

0.0.1.4.3. Finish DnD calculations.

Description: abilities, modifiers, skills, proficiency, expertise, AC from armor and Dexterity, HP, initiative, and manual overrides should calculate predictably. Manual values should be visibly marked.

0.0.1.4.4. Make armor selection use item picker behavior.

Description: the armor field should select an existing item like item list blocks do, then feed AC calculations.

0.0.1.4.5. Connect Properties/CharacterModel to the map.

Description: map tokens should read HP, AC, initiative, effects, and statuses from the model, not from random HTML fields.

0.0.1.4.6. Simplify block creation.

Description: keep the block menu human-readable: text, list, table, image, properties. Specialized behavior should live as modes inside these blocks.

### 0.0.1.5.0. Knowledge Graph Visual Graph

Goal: "Graph of relationships" should become a real visual map of the world, not just a list.

0.0.1.5.1. Design a real graph canvas.

Description: visual nodes and edges, zoom/pan, fit to view, selected node, and one-click open page.

0.0.1.5.2. Add readable graph layout.

Description: cluster by domain: characters, items, organizations, rules, maps, and locations. Default layout should be useful without manual setup.

0.0.1.5.3. Add graph filters.

Description: filter by entity type, relationship type, tags, current-card neighborhood, and orphan pages.

0.0.1.5.4. Add graph interaction.

Description: hover preview, click open, drag node, pin node, focus neighborhood, and breadcrumbs.

0.0.1.5.5. Add graph performance gate.

Description: large worlds should render graph slices, not freeze on a huge all-world graph.

0.0.1.5.6. Add graph regression tests.

Description: typed relationships, orphan view, visual graph data generation, and opening pages from graph.

### 0.0.1.6.0. Data Safety & Recovery

Goal: protect user content while the product grows.

0.0.1.6.1. Finish Safe HTML boundary.

Description: define and enforce allowed persistent HTML for cards, tables, wiki-links, task tracker, and campaign map shells.

0.0.1.6.2. Finish paste sanitization.

Description: pasted text and HTML must not bring scripts, runtime UI, unsafe links, or dangerous attributes.

0.0.1.6.3. Finish schema recovery UI.

Description: show workspace validation issues and allow safe repair actions only after backup.

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
