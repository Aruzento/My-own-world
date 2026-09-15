---
name: pm-spec-writing
description: "Turn an unspecced product request into a bounded, testable dev brief or feature specification."
category: product
catalog_summary: "PRDs, user stories, acceptance criteria, dev briefs"
display_order: 1
---

# PM Spec Writing

Take an idea (often vague) and turn it into a specification a developer or AI agent can actually build from. Stack-agnostic. Works for new features, bug fixes, content changes, or infrastructure work.

---

## When to use

Use when a product request still needs a bounded dev brief/spec, acceptance criteria or an actionable bug report. Do not activate while implementing an already accepted task/contract; do not re-open settled requirements.

---

## When NOT to use

- Quarterly or annual planning across multiple initiatives (use `roadmap-planning`)
- Code review or debugging existing code (use `code-review-web`)
- Visual review for an accepted feature (use the applicable `design-system` checklist; do not reopen its product requirements)
- User research to validate an idea (use `ux-research`)

---

## Required inputs

- The idea, request, or problem being addressed
- The audience or user affected
- Any existing constraints (stack, deadlines, dependencies)
- The success metric (how will you know it worked?)

If the idea is vague, the workflow's first step is clarification. Do not write specs around vagueness.

---

## The framework: 4 phases

Every PM workflow follows the same arc. The phases are universal even if the specific outputs vary.

### Phase 1: Clarify the idea

Resolve the following from the request, accepted contracts and current behavior. Ask only for a missing product decision that materially changes behavior, scope, persistence or public contracts. State non-blocking assumptions; do not invent requirements or require a numeric metric when an observable acceptance criterion suffices.

1. **What user problem does this solve?** Not "what does it do." The problem comes first; the feature is the proposed solution.
2. **Who specifically benefits?** Be precise. "Users" is not specific. "First-time visitors who don't convert" is.
3. **What is the success metric?** How will you know it worked? Pick one primary metric.
4. **Why now?** What changed that makes this the right time to build it? If "nothing changed," it might not be the right time.

### Phase 2: Scope by impact and effort

Plot every candidate idea on the impact/effort grid:

```
HIGH IMPACT / LOW EFFORT       Ship immediately
  Examples: copy fixes, contrast fixes, meta tags,
            broken links, missing alt text, redirects

HIGH IMPACT / HIGH EFFORT      Plan and batch
  Examples: new page type, new feature, schema overhaul,
            major redesign, new integration

LOW IMPACT / LOW EFFORT        Nice-to-have batch
  Examples: tooltip improvements, minor copy polish,
            cosmetic UX touches

LOW IMPACT / HIGH EFFORT       Skip or defer indefinitely
  Examples: rebuilding what already works, exotic
            edge case features, premature optimization
```

This is not a perfect framework. Some "low impact" things are mandatory (compliance, accessibility, security). Note exceptions.

### Phase 3: Write the spec

Three formats based on the type of work.

For a feature specification, use the needed sections of [feature-spec-template](references/feature-spec-template.md). For a tactical dev brief, use [dev-brief-template](references/dev-brief-template.md). Select one format; both require explicit scope and observable verification.

#### Format C: Bug report

```
URL or context: [Where it happens]

Symptom: [What the user sees or experiences]

Expected: [What should happen instead]

Steps to reproduce:
1. [Specific step]
2. [Specific step]
3. [Specific step]

Hypothesis: [Likely root cause if known]

Files to investigate: [Likely files involved if known]

Priority:
  P0 - blocking critical user flow, ship immediately
  P1 - degrades UX significantly, fix this sprint
  P2 - minor issue, fix when convenient
  P3 - nice-to-have improvement

Browser/device: [If reproducibility might be browser-specific]
```

### Phase 4: Sequence and ship

Specs without sequencing become dust on a shelf.

For a single feature: identify the smallest shippable increment. What is the smallest version that delivers user value? Ship that first. Then iterate.

For a backlog: order by dependencies first, then by priority, then by impact/effort. The order matters more than the priority labels.

---

## Workflow

1. **Clarify.** Reuse settled requirements; ask only the material unresolved decisions from phase 1.
2. **Scope.** Plot the work on the impact/effort grid.
3. **Pick the right format.** Feature spec for new features, dev brief for tactical work, bug report for defects.
4. **Write the spec.** Use the relevant template sections; mark unavailable evidence and non-applicable sections explicitly.
5. **Define done.** Verify steps must be unambiguous. "Test it" is not a verify step.
6. **Get buy-in.** Walk through the spec with whoever will build it before they start.
7. **Sequence.** Identify the smallest shippable increment.

---

## Failure patterns

- **Specs that describe solutions before problems.** Always start with the user problem. The solution is downstream.
- **Specs without a success metric.** Without a metric, you cannot tell if the feature worked.
- **Acceptance criteria that are not testable.** "User experience is improved" is not testable. "User completes signup in under 60 seconds" is.
- **Specs that include the "how" instead of the "what."** Implementation details belong in the dev brief, not the spec. The spec is the desired outcome.
- **No "out of scope" section.** Without explicit boundaries, scope creeps.
- **Bug reports without reproduction steps.** Cannot be acted on. Always include steps.
- **Verify steps that are vague.** "Make sure it works." Useless. Must be specific actions with observable outcomes.
- **Skipping the smallest-shippable-increment exercise.** Leads to 6-month projects that should have been 2-week experiments.

---

## Output format

Output is one of three formats based on work type, all in markdown:

- `spec-[feature-name].md` for feature specs
- `brief-[task-name].md` for dev briefs
- `bug-[summary].md` for bug reports

For larger initiatives, group related specs in a folder:
```
specs/
  initiative-name/
    spec-feature-1.md
    spec-feature-2.md
    brief-task-1.md
    README.md   (overview and sequencing)
```

---

## If required data is unavailable

This skill's output depends on data, measurements, or tool results it cannot generate on its own. When a required input, tool, or data source is unavailable or unverifiable, the sanctioned output is the deliverable with the gap stated: what was needed, what was actually obtained or verified, and which parts of the output are affected. Fabricating, estimating, or interpolating a required number to complete the deliverable is never sanctioned. A stated gap is a complete answer.

---

## Reference files

- [`references/feature-spec-template.md`](references/feature-spec-template.md) - Full feature spec template.
- [`references/dev-brief-template.md`](references/dev-brief-template.md) - Compact dev brief template for tactical work.
- [`references/prioritization-frameworks.md`](references/prioritization-frameworks.md) - Beyond impact/effort: RICE, weighted scoring, MoSCoW.
