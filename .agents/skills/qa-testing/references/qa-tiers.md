# QA Tiers

Choose one tier and runtime from the task. Use existing acceptance criteria and relevant sections of `docs/03-testing/SMOKE_TESTS.md` when selecting MOW checks. Broaden only for contract requirements or evidenced risk.

## Smoke

Check that the named surface opens, its primary action works, relevant assets render and no blocking console/runtime error occurs. If the action persists content, check save/reload on a disposable fixture. Record exact build/runtime, commands/manual actions and failures; a blocking failure must be fixed or reported, not hidden by deeper checks. Web metadata checks belong only to the hosted-web reference and selected target.

## Standard

Verify the affected user flow, adjacent integration, error/empty/loading/disabled states, keyboard/focus and persistence/reload where applicable. Use relevant existing unit/browser regressions and functional/visual checks on supported viewport/theme/runtime combinations. `docs/03-testing/VISUAL_REGRESSION.md` owns required MOW visual evidence; do not certify appearance from source inspection. Record each result and remediation/known issue. Do not run all specialist audits automatically.

## Release

Identify the exact candidate and user handoff path. Follow `docs/01-delivery/RELEASE_PROCESS.md` and, for desktop builds/installers, `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md`. Run all their applicable automated/manual gates, compatibility/recovery/performance/security checks and tester steps. Evidence for another build is insufficient. Include relevant smoke/standard behavior within this single release pass; do not repeat the same check merely because several checklists mention it.

Report scope, exact runtime/build, evidence, failures and known unverified behavior; never promote a partially tested candidate to release-ready. Public web headers/SEO/schema/cross-browser/analytics checks apply only to an actual hosted target with those requirements.
