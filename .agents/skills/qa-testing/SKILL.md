---
name: qa-testing
description: "Perform a requested smoke, standard or release QA pass for a specified flow and runtime."
category: qa
catalog_summary: "Pre-launch QA, regression testing, cross-browser checks"
display_order: 1
---

# QA Testing

Use for a requested smoke, standard or release QA pass. A single bugfix or a unit test command does not imply a QA sweep.

## Invariants

- Select one tier, target flow/build and applicable runtime. Use disposable fixtures; do not mutate personal workspaces or submit real data without authorization.
- Run the task-required checks and actual release gates. A lower tier never certifies a higher tier or replaces release policy.
- Inspect test output, functional behavior and applicable visual evidence. Report failures, remediation/known issues and unverified areas; no invented measurements or screen-reader results.
- Local desktop QA does not inherit web SEO, public headers, analytics or arbitrary viewport requirements. Use the project's supported surfaces.

## Select the workflow

| Tier | Read only the chosen section |
| --- | --- |
| Smoke: critical path after a scoped change | [Smoke](references/qa-tiers.md#smoke) |
| Standard: changed flow and adjacent regression risks | [Standard](references/qa-tiers.md#standard) |
| Release: actual build/handoff acceptance | [Release](references/qa-tiers.md#release) |

Only for a hosted web target, use the matching tier in [web checks](references/web-checks.md). A formal standard/release report may use the applicable sections of the existing [report template](references/qa-report-template.md). Deep accessibility or performance audits remain separate requested workflows.
