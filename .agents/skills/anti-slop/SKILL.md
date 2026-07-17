---
name: anti-slop
description: "Prevents AI-default code, vague completion claims, decorative UI churn, untested abstractions, and overbuilt solutions in MyOwnWorld."
---

# Anti-Slop Skill

Inspired by the public `kill-ai-slop` approach, adapted for MyOwnWorld. Do not copy external repository files directly. Use this skill as a project-specific quality gate before and after changes.

## When To Use

Use this skill when a task touches:

- UI, visual design, CSS, animation, popups, app shell or map controls.
- Architecture, services, registries, models, adapters or new abstractions.
- Documentation, plans, work logs, release notes or "done" status.
- Any feature that could look complete while being only a foundation.
- Any broad instruction such as "improve", "polish", "make beautiful", "stabilize", "finish", "refactor" or "do the whole block".

## Read Before Work

- `AGENTS.md`
- `docs/00-product/PRODUCT_DASHBOARD.md`
- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- `docs/01-delivery/DEFINITION_OF_DONE.md`
- Relevant subsystem contract in `docs/02-architecture/`
- Relevant skill for the domain, for example `map-hardening`, `character-model`, `design-system`, `desktop-release` or `minimal-change`

## Slop Signals To Reject

- A feature is called "done" but has no usable user path.
- A model, helper or registry exists, but no UI or integration uses it.
- A large abstraction is added before a repeated problem is proven.
- UI changes add decoration without improving task speed, readability or clarity.
- Text says "improved", "enhanced", "polished" or "stabilized" without naming a measurable behavior.
- Release notes describe capabilities that are only partially implemented.
- Tests only check that code exists, not that the user's workflow works.
- A bug fix lacks the root cause and regression target.
- A plan item is removed even though a future part is still needed.
- A patch introduces new colors, spacing, shadows or animation without design-system ownership.
- A task creates a new subsystem but leaves no diagnostics, migration path or fallback.

## Required Anti-Slop Pass

Before editing:

1. State the user-visible outcome in one sentence.
2. Name the smallest subsystem boundary that should change.
3. Identify whether the target is `Foundation`, `MVP`, `Usable` or `Release-ready` using `docs/01-delivery/DEFINITION_OF_DONE.md`.
4. Decide the regression target or explain why automation is not possible.

While editing:

1. Prefer existing project patterns over new abstractions.
2. Keep the write scope narrow.
3. Avoid broad visual restyles unless the task is explicitly a design-system migration.
4. Preserve existing user data and workspace compatibility.
5. Do not hide partial work by deleting plan items.

Before final response:

1. Check whether the feature is truly usable by a human in 1-2 obvious actions.
2. Check whether docs/release notes overclaim.
3. Name what remains unverified.
4. Name the exact next plan item.
5. If a task is only a foundation, say `Foundation`, not `done`.

## What To Update After Work

- `docs/01-delivery/PROJECT_PLAN.md` if scope, priority or unfinished work changes.
- `docs/01-delivery/WORK_LOG.md` with readiness level, verification and unverified behavior.
- Release notes / tester instructions if user-visible behavior changes.
- Relevant contract if a subsystem rule changes.
- Bug inventory if a new risk or regression is discovered.

## Checks

- `node tools/validate_agent_skills.mjs` when this skill changes.
- `node tools/docs_index.mjs` when docs change.
- `npm run check:encoding` when Russian text, docs or UI labels change.
- Targeted unit/browser tests for the touched workflow.
- `npm run verify` for P0/P1 work or before commit/push.

## Typical Mistakes

- Calling a plan item complete because tests pass, while the owner cannot find the button.
- Adding a "smart" helper that bypasses existing state, repository or model lifecycle.
- Using generic dashboards/cards/heroes where MyOwnWorld needs dense GM workbench UI.
- Creating a beautiful popup with unclear primary action.
- Skipping real workspace risks because a synthetic fixture is green.
- Forgetting to carry partially completed work back into the active plan.
