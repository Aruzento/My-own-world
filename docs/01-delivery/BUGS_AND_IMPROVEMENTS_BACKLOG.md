---
summary: "Living backlog of noticed bugs, rough edges and improvements to consider when related plan blocks are touched."
read_when:
  - "Before starting a plan block"
  - "When a bug or improvement is noticed but not fixed immediately"
  - "When deciding whether to fix adjacent issues during a task"
owner_zone: "delivery"
---

# Bugs And Improvements Backlog

Updated: 2026-07-17

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
| BI-002 | P1 | Desktop / large workspace | Needs repro | `0.0.1.1.7`, `0.0.1.2.0` | Real large GM workspace should stay part of desktop click-through: open, search, move, delete, map open, presentation, diagnostics. |
| BI-003 | P1 | Campaign map | Fix with block | `0.0.1.3.0` | Map subsystems should be stabilized before new map features: presentation, fog/drawing/layers, playlists, initiative and regressions. |
| BI-004 | P1 | Properties / character | Fix with block | `0.0.1.4.0` | Properties block still needs real character-card UX polish: constructor, default layout, armor picker, calculations and map integration. |
| BI-005 | P2 | Knowledge graph | Ready for plan | `0.0.1.5.0` | Current graph foundation is readable, but the intended feature is a real visual graph canvas with nodes, edges, filters and focus mode. |
| BI-006 | P1 | Data safety | Fix with block | `0.0.1.6.0` | Safe HTML, restore preview, partial restore, backup manifests and asset verification should stay grouped as data-safety work. |
| BI-007 | P2 | UI / design | Ready for plan | `0.0.1.9.0` | Redesign requests should be handled through primitives, design contract and visual regression, not one-off color changes. |
| BI-008 | P2 | Campaign map / shapes | Fix with block | `0.0.1.3.0` | Add a visible center point to circle shapes so the user can easily place and align circles by their center. |
| BI-009 | P2 | Campaign map / shapes | Fix with block | `0.0.1.3.0` | Add rotation controls to all map shapes, matching the existing object rotation behavior. |
| BI-010 | P1 | Campaign map / toolbar | Needs repro | `0.0.1.3.0` | Under unknown circumstances the top map toolbar disappears. Workaround: open a card, then reopen the map. Need reproduction, root cause and regression. |
| BI-011 | P1 | Campaign map / creature skills menu | Fix with block | `0.0.1.3.0` | Encoding is broken in the map creature context menu item/submenu for skills (`Навыки`). Fix mojibake and add an encoding/UI regression if practical. |

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
