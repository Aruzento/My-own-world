# AGENTS.md

This file contains repository-wide instructions that should apply to most tasks.
Keep task-specific guidance in the task prompt or the relevant project document instead of expanding this file.

## Working style

- Complete the requested task end to end when the requirements are clear.
- Inspect only the files and documentation needed for the current task. Expand scope only when dependencies, tests, or discovered constraints require it.
- Preserve existing architecture and local patterns unless the task explicitly changes them.
- Avoid unrelated refactors, cleanup, renaming, or documentation churn.
- Do not stop after a first implementation when the requested task also includes validation or fixing regressions. Continue until the requested behavior works, a relevant check fails for an unrelated reason, or a real product/access decision is required.

## Project invariants

Preserve these unless the task explicitly changes the corresponding architecture:

- The application is local-first. User workspace data stays in the selected local workspace unless a feature explicitly requires another storage or network model.
- Persistent content and runtime UI are separate. Runtime-only DOM must not leak into saved persistent HTML.
- Campaign map state is data-first: `CampaignMapModel` and its serializers are the source of truth, not incidental DOM state.
- `TaskTrackerModel` is the source of truth for task-tracker data.
- Page lookup and page relationships should use `PageRepository` / `PageIndex` for ids, titles, aliases, parents, types, and tags.
- Do not silently rewrite user-visible wiki-link text.
- Preserve page front-matter identity and metadata such as `id`, `template`, `type`, `tags`, and `aliases`.
- Keep text files and runtime strings UTF-8.

## Read documentation only when relevant

Use project documents as contextual references, not as mandatory pre-reading:

- `README.md` — project overview or when a task crosses subsystem boundaries.
- `docs/BLOCK_SYSTEM_CONTRACT.md` — block creation, serialization, runtime controls, or clean-save behavior.
- `docs/SAFE_HTML_CONTRACT.md` — sanitization, persistent HTML, save/load, paste, or unsafe markup.
- `docs/PAGE_REPOSITORY_CONTRACT.md` — page lookup, metadata, aliases, parent relationships, or indexing.
- `docs/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md` — map performance, viewport, rendering, or performance budgets.
- `docs/ASSET_LIFECYCLE_CONTRACT.md` — asset references, broken/orphan assets, cleanup, or asset persistence.
- `docs/PLANS_AND_TECH_DEBT.md` — only when the task references the roadmap, changes planned status, or intentionally adds/removes technical debt.
- `docs/WORK_LOG.md` — only for a durable architectural decision that future work genuinely needs to understand.
- `docs/MY_OWN_WORLD_FULL_MANUAL.docx` — generated reference material; do not read or regenerate it by default.

If a narrower contract or test already defines the behavior, prefer it over loading broader documentation.

## Validation

- Validate the behavior affected by the change.
- Prefer focused tests or checks for the touched subsystem.
- `npm run verify` is a broad final check, not a prerequisite before editing every file.
- Run browser tests when browser-visible behavior changed or when an existing browser regression test directly covers the change. Do not run the full browser suite for documentation-only or unrelated changes.
- After fixing a failing check, rerun the affected check. Run broader verification once when the scope or risk justifies it.
- Non-destructive local tests and checks may be run without asking for approval.

## Code organization and comments

- Prefer cohesive modules with one clear responsibility. Split code when a responsibility can stand on its own; do not split files only to satisfy an arbitrary size target.
- Add comments for non-obvious invariants, constraints, or reasoning. Do not add comments merely to increase comment coverage.
- For new project-specific explanatory comments, prefer Russian unless the surrounding file consistently uses another language.
- Reuse established project utilities and subsystem boundaries before creating parallel abstractions.

## Documentation updates

Update documentation only when the change makes that documentation inaccurate or when the task explicitly requests a documentation update.

Do not automatically update `README.md`, `docs/PLANS_AND_TECH_DEBT.md`, `docs/WORK_LOG.md`, and the generated DOCX manual together.

Regenerate `docs/MY_OWN_WORLD_FULL_MANUAL.docx` only when explicitly requested or when a release/documentation workflow specifically requires it.

## Safety and scope

- Do not delete, migrate, or overwrite user workspace data unless the task explicitly requires it and the behavior is understood.
- Do not introduce cloud/network dependencies into local-first flows without an explicit product requirement.
- Ask for a product decision only when multiple materially different user-facing behaviors are possible and the repository does not already define the choice.
- Otherwise, make the smallest reasonable decision consistent with existing code and continue.

## Completion

A task is complete when the requested behavior is implemented, relevant validation has been performed, and any documentation directly made inaccurate by the change has been updated.

In the final report, briefly state:
- what changed;
- the important files;
- the checks that were run and their result;
- any remaining blocker or material risk, if one exists.
