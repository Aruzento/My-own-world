---
summary: "Living backlog of noticed bugs, rough edges and improvements to consider when related plan blocks are touched."
read_when:
  - "Before starting a plan block"
  - "When a bug or improvement is noticed but not fixed immediately"
  - "When deciding whether to fix adjacent issues during a task"
owner_zone: "delivery"
---

# Bugs And Improvements Backlog

Updated: 2026-07-20

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
| BI-003 | P1 | Campaign map | Fix with block | `0.0.1.3.0` | Map subsystems should be stabilized before new map features: presentation, fog/drawing/layers, playlists, initiative and regressions. |
| BI-004 | P1 | Properties / character | Done | `0.0.1.4.0` | Closed across `0.0.1.4.1`-`0.0.1.4.5`: constructor layout, readable default character/creature layout, visible DnD calculations, armor picker filtering and map-token CharacterModel snapshots are in place. |
| BI-005 | P2 | Knowledge graph | Fix with block | `0.0.1.5.0` | `0.0.1.5.1`-`0.0.1.5.4` add the real canvas foundation, readable workbench layout, filters, right-click node actions, direct node dragging, standard root view, dynamic canvas expansion and removal of noisy tabs/lists. Saved/pinned positions and readable relationship creation/view presets remain in `0.0.1.5.4.1`; performance slices remain in `0.0.1.5.5`-`0.0.1.5.6`. |
| BI-006 | P1 | Data safety | Fix with block | `0.0.1.6.0` | Safe HTML, restore preview, partial restore, backup manifests and asset verification should stay grouped as data-safety work. |
| BI-007 | P2 | UI / design | Ready for plan | `0.0.1.9.0` | Redesign requests should be handled through primitives, design contract and visual regression, not one-off color changes. |
| BI-008 | P2 | Campaign map / shapes | Fix with block | `0.0.1.3.0` | Add a visible center point to circle shapes so the user can easily place and align circles by their center. |
| BI-009 | P2 | Campaign map / shapes | Fix with block | `0.0.1.3.0` | Add rotation controls to all map shapes, matching the existing object rotation behavior. |
| BI-010 | P1 | Campaign map / toolbar | Needs repro | `0.0.1.3.0` | Under unknown circumstances the top map toolbar disappears. Workaround: open a card, then reopen the map. Need reproduction, root cause and regression. |
| BI-011 | P1 | Campaign map / creature skills menu | Fix with block | `0.0.1.3.0` | Encoding is broken in the map creature context menu item/submenu for skills (`Навыки`). Fix mojibake and add an encoding/UI regression if practical. |
| BI-012 | P1 | Data safety / schema recovery | Ready for plan | `0.0.1.6.3` | The real large workspace `X:\ДНД\Мастер\По кампаниям\База` reports 2074 schema issues in desktop diagnostics. Before any automatic repair, add a grouped human-readable report that explains which issues are legacy/migration noise and which are unsafe. |
| BI-013 | P1 | Editor / block drag-and-drop | Needs repro | `0.0.1.8.11` | Blocks appear to have stopped moving. Reproduce the block-level drag-and-drop regression, restore moving blocks, and modernize the block DnD UX so it matches the smoother Properties field drag/resize behavior. |
| BI-014 | P2 | Editor / Add block popup design | Ready for plan | `0.0.1.8.11` | Redesign the `Add block` popup: current first-level menu has AI-slop icons, weak alignment and rough visual hierarchy. Keep the simple block list, but migrate the popup to native-looking design-system primitives with clean icons, spacing, focus states and visual regression coverage. |
| BI-015 | P2 | Knowledge graph / undo | Done | `0.0.1.5.4.2` | Closed in `0.0.1.5.4.2` and hardened in `0.0.1.5.4.3`: the graph toolbar now has visible Back/Forward history controls, and Ctrl+Z / Ctrl+Y handle node moves, saved position reset and manual relationship create/edit/delete when focus is not inside a text field. |
| BI-016 | P2 | Knowledge graph / operations | Ready for plan | `0.0.1.5.x` | Partly covered in `0.0.1.5.4.3`: manual relationships can now be edited/deleted from the node context menu. Remaining future work: richer context actions, relation source/type inspection, filters/actions that turn the graph into a daily world tool, and no permanent noisy panels. |

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
