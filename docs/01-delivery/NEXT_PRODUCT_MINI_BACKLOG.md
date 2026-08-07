---
summary: "Plan-only mini backlog for product work that can start after the current design gate closes."
read_when:
  - "After 0.0.1.8.17 is closed"
  - "Before starting non-design feature work"
  - "When deciding whether a future idea belongs in the active plan"
owner_zone: "delivery"
---

# Next Product Mini Backlog

Updated: 2026-08-07

Status: plan-only. These items are not implemented by `0.0.1.8.17`; they are candidates for the next product planning pass after the owner reviews the finished design work.

## Rules

- Promote one item at a time into `PROJECT_PLAN.md` before implementation.
- Keep `BI-026` as the gate before adding new visible Knowledge Graph behavior.
- Do not reopen decorative shell panels or placeholder UI just to host future work.
- Prefer small, testable product slices with clear user value for a GM session.

## Future Items

| ID | Area | Idea | Notes |
| --- | --- | --- | --- |
| NF-001 | Data safety | Edit-session conflict protection | Prevent silent overwrite when multiple editing sessions touch the same page/workspace state. |
| NF-002 | Rules / dice | Safe Dice Engine | Centralize dice parsing/evaluation with clear limits, deterministic tests and no unsafe expression execution. |
| NF-003 | Session log | Event, roll and combat log plus undo | Record meaningful table events and make dangerous or accidental actions reversible. |
| NF-004 | Combat | Persistent combat session | Keep initiative, turns, combatants and temporary state alive across app reloads. |
| NF-005 | Combat | Combat action pipeline | Model attack/check/save/damage actions as structured steps instead of scattered UI handlers. |
| NF-006 | Rules / effects | Effects and conditions engine | Track conditions, durations, modifiers and expiry rules in one owner system. |
| NF-007 | Campaign map | Range, targeting and area-of-effect tools | Add measurement/targeting tools after the map editor foundation is stable. |
| NF-008 | Rules / rest | Rest workflow | Support short/long rest resource refresh with visible before/after state. |
| NF-009 | Campaign map | Adaptive token UI | Let tokens surface the right compact controls based on type, state and current tool. |
| NF-010 | Campaign map | Map pings | Add temporary GM/player attention markers without persisting noisy map objects. |
| NF-011 | Campaign map | Scene transitions | Support switching scenes cleanly for presentation and GM work. |
| NF-012 | Campaign map | Walls, doors, windows, light and vision | Treat as a dedicated map-system block, not a quick toolbar add-on. |
| NF-013 | Content | Local compendium | Add reusable local rules/items/monsters/content that can be imported into a world. |
| NF-014 | Collaboration | Local-hosted collaboration | Explore local-first multiplayer/editor sharing without cloud lock-in. |
| NF-015 | Companion | Mobile player companion | Small-screen player-facing session UI, separate from the desktop GM workbench. |
| NF-016 | Modules | Declarative module API | Allow future extensions through declared capabilities and owned contracts. |
| NF-017 | Visual / dice | Optional 3D dice visualizer | Late-stage polish only, after dice logic and session logging are useful without it. |

## Rejected For Now

| Idea | Reason |
| --- | --- |
| Ctrl+drag creature duplication | Too easy to trigger accidentally and duplicates should be designed through an explicit safe action. |
| User-configurable health-stage system | Too much rules complexity before the core combat/effects model exists. |
