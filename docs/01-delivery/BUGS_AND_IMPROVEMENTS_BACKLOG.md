---
summary: "Living backlog of noticed bugs, rough edges and improvements to consider when related plan blocks are touched."
read_when:
  - "Before starting a plan block"
  - "When a bug or improvement is noticed but not fixed immediately"
  - "When deciding whether to fix adjacent issues during a task"
owner_zone: "delivery"
---

# Bugs And Improvements Backlog

Updated: 2026-08-10

This file is a lightweight holding area for issues that should not interrupt the current task immediately, but should not be forgotten.

It is not a replacement for [PROJECT_PLAN.md](./PROJECT_PLAN.md) or [BUG_INVENTORY.md](./BUG_INVENTORY.md):

- `PROJECT_PLAN.md` is the active delivery queue.
- `BUG_INVENTORY.md` tracks confirmed or high-risk stabilization bugs.
- This backlog captures discovered rough edges, suspected bugs and improvement ideas until they are promoted into the active plan or fixed while working in the same area.

## Triage Rules

- If an item is `P0` or blocks normal work, promote it to `BUG_INVENTORY.md` and the active plan.
- If an item belongs to the plan block currently being worked on, check it before marking that block done.
- If the fix is small, low-risk and inside the touched subsystem, fix it together with the current task.
- If the fix would expand scope, leave it here and add or update a plan item.
- When an item is fixed, move it to `WORK_LOG.md` or mark it `Done` with the closing plan ref.
- Do not mark a plan item complete just because a related backlog item received only a foundation-level change.

## Status Values

- `New` - recorded, not yet reproduced.
- `Needs repro` - needs a manual or automated reproduction.
- `Ready for plan` - known enough to schedule.
- `Fix with block` - fix when the related plan block is active.
- `Done` - resolved and logged.

## Backlog

| ID | Priority | Area | Status | Related plan block | Note |
| --- | --- | --- | --- | --- | --- |
| BI-001 | P1 | Workspace operations | Done | `0.0.1.1.0` | Closed across `0.0.1.1.1`-`0.0.1.1.6`: PageCommandService, PageRecord, required metadata, trash/undo, PageIndex lifecycle and write revision protection are in place. |
| BI-002 | P1 | Desktop / large workspace | Done | `0.0.1.2.0` | Closed in `0.0.1.2.2`: the current real large workspace is `X:\ДНД\Мастер\По кампаниям\База`; CLI smoke and native Tauri click-through pass on the rebuilt release exe. Desktop restore now registers the selected workspace in Tauri asset protocol scope, so assets outside HOME no longer return 403 after restart. |
| BI-003 | P1 | Campaign map | Fix with block | `0.0.1.11.0` | PROMOTED TO PROJECT_PLAN PHASE 3. Map subsystems should be stabilized before new map features: presentation, fog/drawing/layers, playlists, initiative and regressions. |
| BI-004 | P1 | Properties / character | Done | `0.0.1.4.0` | Closed across `0.0.1.4.1`-`0.0.1.4.5`: constructor layout, readable default character/creature layout, visible DnD calculations, armor picker filtering and map-token CharacterModel snapshots are in place. |
| BI-005 | P2 | Knowledge graph | Done | `0.0.1.5.0` | Closed across `0.0.1.5.1`-`0.0.1.5.6`: the graph now has a real canvas foundation, readable workbench layout, filters, right-click node actions, direct node dragging, standard root view, dynamic canvas expansion, readable relationship creation, a large-graph performance gate and regression coverage for canvas filters, edges and orphan paths. |
| BI-006 | P1 | Data safety | Fix with block | `0.0.1.12.0` | PROMOTED TO PROJECT_PLAN PHASE 4. Safe HTML boundary is closed in `0.0.1.6.1`, paste sanitization is closed in `0.0.1.6.2`, schema recovery UI is closed in `0.0.1.6.3`, and recovery fallback tests are closed in `0.0.1.6.4`. Remaining data safety work: restore preview, partial restore, backup manifests and asset verification. |
| BI-007 | P2 | UI / design | Ready for plan | `0.0.1.29.0` | PROMOTED TO PROJECT_PLAN PHASE 21. Redesign requests should be handled through primitives, design contract, inventory report and visual regression, not one-off color changes. |
| BI-008 | P2 | Campaign map / shapes | Fix with block | `0.0.1.11.0` | PROMOTED TO PROJECT_PLAN PHASE 3. Add a visible center point to circle shapes so the user can easily place and align circles by their center, unless Phase 3 decides this belongs in a later Campaign Map slice. |
| BI-009 | P2 | Campaign map / shapes | Fix with block | `0.0.1.11.0` | PROMOTED TO PROJECT_PLAN PHASE 3. Add rotation controls to all map shapes, matching the existing object rotation behavior, unless Phase 3 decides this belongs in a later Campaign Map slice. |
| BI-010 | P1 | Campaign map / toolbar | Needs repro | `0.0.1.11.0` | PROMOTED TO PROJECT_PLAN PHASE 3. User-visible P1 kept from the 2026-07-20 recommendations: under unknown circumstances the top map toolbar disappears. Workaround: open a card, then reopen the map. Need reproduction, root cause and regression. |
| BI-011 | P1 | Campaign map / creature skills menu | Fix with block | `0.0.1.11.0` | PROMOTED TO PROJECT_PLAN PHASE 3. User-visible P1 kept from the 2026-07-20 recommendations: encoding is broken in the map creature context menu item/submenu for skills (`Навыки`). Fix mojibake and add an encoding/UI regression if practical. |
| BI-012 | P1 | Data safety / schema recovery | Done | `0.0.1.6.3` | Closed in `0.0.1.6.3`: diagnostics now shows a grouped human-readable schema report, separates legacy migration warnings from unsafe errors, and exposes the persisted broken-parent repair only behind a backup gate. |
| BI-013 | P1 | Editor / block drag-and-drop | Done | `0.0.1.8.11` | Closed in `0.0.1.8.11.2`: block movement now uses pointer-based drag with a real preview, drop placeholder, no-op guard and save/history only on real reorder. Browser regression moves a block with Playwright mouse input and verifies cleanup. |
| BI-014 | P2 | Editor / Add block popup design | Done | `0.0.1.8.11` | Closed in `0.0.1.8.11.2`: the first-level `Add block` popup keeps the simple allowlist but now uses local sprite icons, grouped readable copy, tokenized spacing/surfaces, focus states and visual smoke attachment coverage. |
| BI-015 | P2 | Knowledge graph / undo | Done | `0.0.1.5.4.2` | Closed in `0.0.1.5.4.2` and hardened in `0.0.1.5.4.3`: the graph toolbar now has visible Back/Forward history controls, and Ctrl+Z / Ctrl+Y handle node moves, saved position reset and manual relationship create/edit/delete when focus is not inside a text field. |
| BI-016 | P2 | Knowledge graph / operations | Ready for plan | `0.0.1.23.0` | PROMOTED TO PROJECT_PLAN PHASE 15. Partly covered in `0.0.1.5.4.3`-`0.0.1.5.5` and `0.0.1.8.13.2`: manual relationships can be edited/deleted from the node context menu, new canvas relationships ask for type/label before saving, and selected nodes now expose visible incoming/outgoing relation inspection in the graph inspector. Remaining future work waits until `BI-026` resolves the graph concept. |
| BI-017 | P2 | Knowledge graph / maintainability | Done | `0.0.1.8.13.5`-`0.0.1.8.13.11` | Closed for Phase 7: graph CSS has separate base/slice/inspector/overlay owners, and JS ownership now covers inspector, node icons, labels/options, canvas controls, renderer, canvas actions, canvas overlays, relationship/context-menu HTML and view-state helpers. `knowledgeGraphPage.js` remains the coordinator for event registration, graph history, drag/pan, selection and page lookup instead of owning every graph surface. |
| BI-018 | P1 | Knowledge graph / page lifecycle | Done | `0.0.1.8.13.11` | Closed for current graph operations: manual relationship create/update/delete/restore now persists through a dedicated graph command bridge using `PageRecord`, `PageCommandService` command events and the write queue instead of direct `knowledgeGraphPage.js` storage writes. `PageCommandService` snapshots and rollbacks now include runtime `relationships` metadata. Graph view-state remains page-body JSON and is persisted by the existing autosave/special-save command lifecycle. |
| BI-019 | P2 | Knowledge graph / visible slice clarity | Done | `0.0.1.8.13.1` | Closed in `0.0.1.8.13.1`: the graph filterbar now shows visible/total/hidden counters, the status says `показано X из Y`, hidden reasons distinguish filters, standard slice and canvas limit, and the slice notice offers direct `Все связи` / `Уточнить поиск` actions with browser coverage. |
| BI-020 | P1 | Large workspace / link cleanup | Partially covered | `0.0.1.12.0` | PROMOTED TO PROJECT_PLAN PHASE 4. `0.0.1.6.3` added the grouped schema report and one backup-gated persisted safe repair for broken page parents. `0.0.1.6.4` added fallback and backup-failure regression coverage. Remaining work: grouped broken wiki/relation/link cleanup, orphan page/link review, staged non-destructive repair preview and persistent repair flows beyond page-parent cleanup. |
| BI-021 | P1 | Documentation / status drift | Done | `0.0.1.7.0` | Closed across `0.0.1.7.3`-`0.0.1.7.5`: dashboard, active plan, Bug Inventory, release handoff and archive notes now point to the current next work instead of stale graph/data-safety tasks. |
| BI-022 | P1 | User-visible regression bundle | Ready for plan | `0.0.1.11.0` | PROMOTED TO PROJECT_PLAN PHASE 3. Tracking bundle for current human-facing P1s. `BI-013` block drag-and-drop is closed in `0.0.1.8.11.2`; remaining bundle items are `BI-010` disappearing map toolbar and `BI-011` creature skills menu encoding. |
| BI-023 | P2 | Properties / field settings | Ready for plan | `0.0.1.24.0` | PROMOTED TO PROJECT_PLAN PHASE 16. Add a lock toggle in each Properties field gear menu. When locked, the field should keep its value/editing behavior but block drag movement, with a clear visual lock state so accidental layout changes are prevented. |
| BI-024 | P2 | Documentation / status automation | Ready for plan | `0.0.1.10.0` | PROMOTED TO PROJECT_PLAN PHASE 2. Add only if the audit confirms recurring status drift: a lightweight consistency check for stale `Next active block` pointers, outdated release handoff summaries and bug inventory statements. Keep it simple and avoid turning docs into a brittle generated system. |
| BI-025 | P2 | AppShell / workspace panes | Ready for plan | `0.0.1.24.0` | PROMOTED TO PROJECT_PLAN PHASE 16. Future workbench model: allow up to 3 open work areas at once, such as card, campaign map and knowledge graph panes. Do not implement as a decorative panel; design persistence, focus, split behavior and mobile fallback deliberately before adding it to runtime. |
| BI-026 | P2 | Knowledge graph / UX concept | New | `0.0.1.23.0` | PROMOTED TO PROJECT_PLAN PHASE 15. User feedback on 2026-07-29: the current Knowledge Graph concept still feels off. Before adding another visible graph feature, run a focused UX rethink: define what the graph should help a GM decide, separate navigation from analysis, choose the primary first-screen concept, review references again, and produce a small design note/mock direction. Regression target after implementation: visual smoke plus graph browser workflow checks for the chosen concept. |

## Intake Template

Use this when adding a new item:

```text
ID:
Priority:
Area:
Status:
Related plan block:
Observed:
Expected:
How to reproduce:
Suggested fix:
Regression target:
```
