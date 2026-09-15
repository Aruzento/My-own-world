---
summary: "Definition of Done and readiness levels for MyOwnWorld tasks."
read_when:
  - "Before marking a plan item complete"
  - "When assigning feature readiness or reviewing closure/handoff evidence"
owner_zone: "delivery"
---
# Definition of Done

Feature/plan closure must state an evidence-based readiness level. Routine edits to an accepted task use its acceptance criteria and the root completion rules; they do not require reading this document or inventing a plan item. Do not claim a higher feature level than the user workflow, tests and handoff support.

## Readiness Levels

### Foundation

A model, contract, helper, adapter, prototype or narrow technical base exists.

Use this when the work is valuable but not yet a complete user workflow. A Foundation item must leave the remaining user-facing work in the active plan.

### MVP

A basic user path exists and can be reached in the app.

Use this when the owner can try the feature, the main happy path works, and at least one targeted automated or manual check exists. Known gaps must be listed.

### Usable

The workflow is practical for normal project work.

Use this when the feature is discoverable, persists correctly, survives reload where relevant, handles common errors, and has regression coverage or a documented manual smoke path.

### Release-ready

The workflow is ready for external handoff.

Use this only when automated checks, manual release checks, documentation, release notes, compatibility, data migration, performance and security impact have all been considered.

## Task Handoff Checklist

For feature/plan closure, include the applicable evidence below. Reuse known task context; mark irrelevant items N/A rather than inventing a plan, migration or performance claim. This checklist does not require a work-log edit for every task.

- Plan ref.
- Readiness level.
- Acceptance criteria that were met.
- Changed files or touched subsystem.
- Automated tests.
- Manual tests.
- Backward compatibility or data migration notes.
- Performance effect.
- Security effect.
- Docs and release impact.
- Known unverified behavior.
- Next plan item.

## Rules

- Do not remove an active plan item if only Foundation work was completed and the user workflow is still missing.
- If a plan item was partially completed, split the remaining work into a smaller active item.
- P0/P1 work needs a regression test or a clear explanation for why automation is not possible yet.
- Do not describe release notes, work log or final answer beyond the proven readiness level.
- If a feature is not reachable in one or two obvious user actions, it is not `Usable`.

## Closure Evidence

- Name the observable outcome and acceptance criteria, not vague claims such as improved, polished or stabilized. A helper/model without the required integration is Foundation.
- Verify behavior through the affected user/integration path, not only that code exists. A passing synthetic fixture proves its covered behavior; state real-workspace or environment limits.
- For a bug fix, identify the supported root cause and regression target. Preserve P0/P1 regression responsibility above; an unavailable automated check needs a concrete explanation and available manual evidence.
- Keep unfinished scope and the next accepted plan item visible when closing planned work. Do not call partial work done or delete its remaining obligations.
- Use existing subsystem owners for implementation/design and diagnostics, migration/fallback when introducing a subsystem. Do not imply broader readiness from a passing local test or an old release result.
