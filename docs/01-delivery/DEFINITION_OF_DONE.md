---
summary: "Definition of Done and readiness levels for MyOwnWorld tasks."
read_when:
  - "Before marking a plan item complete"
  - "Before writing work log or final task summary"
owner_zone: "delivery"
---
# Definition of Done

Every completed task must state one readiness level. The level is evidence-based: do not claim a higher level than the user workflow, tests and handoff support.

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

Every completed task summary or work-log entry should include:

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
