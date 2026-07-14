---
summary: "Active project plan for MyOwnWorld version 1 work."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---

# Project Plan

Updated: 2026-07-14

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

0.0.1.0.1. Build a current bug inventory.

Description: list broken or suspicious user flows from recent work: tree operations, delete, drag and drop, map presentation, drawing, music playlists, properties grid, desktop assets, graph view, and large workspace latency.

0.0.1.0.2. Run a manual smoke pass in browser and desktop.

Description: check workspace open, page create, rename, move, delete, search, wiki-link, card edit, save/reload, map open, map presentation, properties block, backup/restore, and playlist playback.

0.0.1.0.3. Fix P0/P1 broken flows before new features.

Description: fix any flow that blocks normal work, corrupts data, loses user edits, prevents opening a workspace, or makes a main feature unusable.

0.0.1.0.4. Add regression coverage for fixed P0/P1 bugs.

Description: every fixed critical bug should get a unit, browser, or desktop smoke scenario. If automation is not practical, document the manual check in tester instructions.

0.0.1.0.5. Update tester instructions and known issues.

Description: keep the human testing path short and understandable: what to open, what to click, what result proves the fix.

### 0.0.1.1.0. Large Workspace Performance & Reliability

Goal: the real large workspace must not feel frozen. Tree rendering, moving, deleting, search, and map opening should stay understandable and responsive.

0.0.1.1.1. Run a real desktop smoke on the known large GM workspace.

Description: open the workspace in the desktop app, scroll the virtual tree, use search, find in tree, create a test page, move it, delete it, open a map, and start presentation mode. Measure visible delays.

0.0.1.1.2. Add permanent performance smoke for large workspaces.

Description: cover load, tree render, search, wiki lookup, move, delete, and map open with repeatable metrics and budgets.

0.0.1.1.3. Finish progress UI for long operations.

Description: asset scan, asset cleanup, large delete, large move, backup, and restore should show clear progress, not just a vague statusbar message.

0.0.1.1.4. Validate batch tree move/delete through real UI drag.

Description: verify that optimized batch operations work from actual drag and context-menu delete, not only from unit probes.

0.0.1.1.5. Add workspace diagnostics for heavy workspaces.

Description: show pages count, assets count, broken refs, backup health, schema status, and recent slow operations in a readable diagnostics view.

### 0.0.1.2.0. Desktop Product Hardening

Goal: desktop should feel like a real app, not a fragile wrapper around the browser build.

0.0.1.2.1. Finalize desktop install and update flow.

Description: document which `.exe` to run, when to use the installer, where data lives, and how to update without losing a workspace.

0.0.1.2.2. Add desktop workspace diagnostics.

Description: expose permissions, selected workspace path, schema status, asset availability, backup location, and last operation status.

0.0.1.2.3. Add desktop large workspace smoke.

Description: automate or document a repeatable desktop scenario for the real large workspace, including tree, map, images, music, and backup.

0.0.1.2.4. Harden desktop release gate.

Description: before building an installer, run verify, browser smoke, packaging smoke, desktop smoke, and update tester instructions.

### 0.0.1.3.0. Campaign Map Stabilization & UX

Goal: map tools must be simple, fast, and usable during a live game.

0.0.1.3.1. Stabilize presentation mode.

Description: presentation must sync map changes quickly, preserve correct fog/layer order, show distance arrows while moving, and avoid long blank loading.

0.0.1.3.2. Finish drawing tools.

Description: canvas, pencil, Figma-like pen, eraser, fill, color picker, recent colors, deletion with `Del`, and drawing layers must work cleanly and predictably.

0.0.1.3.3. Finish map layers.

Description: objects, creatures, drawings, fog, and locked fog zones should appear in layer controls and render in the correct order in editor and presentation.

0.0.1.3.4. Stabilize music playlists.

Description: each map has normal and battle playlists with clear names, AIMP-like compact UI, play/stop/next/previous, shuffle, loop, copy from another map, and reliable autostart of the first track when opening a map.

0.0.1.3.5. Finish initiative UX.

Description: live participants, manual initiative values, roll d20, separate turn window, next/previous controls, and persistence should be easy to use in one or two clicks.

0.0.1.3.6. Add map regression coverage.

Description: cover save/reload, presentation sync, fog, layers, drawing, playlist playback where possible, and initiative persistence.

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
