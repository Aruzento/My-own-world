# Dependency Workflows

## Add

Compare the concrete need with native APIs, existing owners/dependencies and alternatives. Review maintainer health, API replaceability, license, security history, install/bundle size, transitive packages and requested privileges. Explain value versus ongoing integration/maintenance cost. Confirm the scoped adoption approval before changing manifests; authorization already in the task counts.

## Upgrade

Identify current/target versions and reason. Read official changelog/migration guidance for the actual version gap and related peer dependencies. Review manifest and lockfile diff; reproduce the affected workflow. Patch/minor updates still require compatibility checks. Major or critical runtime changes use the existing upgrade checklist, full relevant suite/build and the actual deployment/release policy. Never call an update green when the test command ran zero tests or has known failures.

## Remove

Find all imports/usages, config, CI hooks and transitives; replace needed behavior before removal. Update manifest and lockfile through the existing package manager. Verify affected tests/build and bundle impact where relevant. Update only documentation made inaccurate. Do not remove another dependency just because it looks old.

## Risk audit

Choose scoped inventory or an explicitly broad audit. Classify critical runtime, supporting runtime and dev/build exposure. Include transitive/vendored packages, advisories, maintenance, license terms, permissions, replaceability and costs. Record exact versions, source/date, exploitability in this product, severity and available fixes; uncertainty is not a clean result.

Prioritize critical/high reachable findings; agree remediation deadlines with the owner rather than importing a generic SLA. False positives need evidence and explicit disposition; do not disable audit wholesale. Escalate a necessary major upgrade instead of hiding it in a security patch. Forks need an upstream/rebase or ownership plan.

Only a requested policy task defines cadence, pinning, approval/removal criteria, automation and monitoring. Do not automatically install bots, edit CI or subscribe services during a package fix.
