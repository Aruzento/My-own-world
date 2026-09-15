---
name: dependency-management
description: "Evaluate adding, upgrading or removing a dependency, or audit dependency risk and update policy."
category: cross-cutting
catalog_summary: "Package updates, security patches, lockfile hygiene"
display_order: 4
---

# Dependency Management

Use for adding, upgrading, removing or auditing a dependency. A generic build failure does not require a dependency policy project.

## Invariants

- Limit changes to authorized packages and their necessary compatibility changes. New dependencies need an explicit justification/review; reuse existing session authorization instead of asking again.
- Inspect maintenance, license, transitive/supply-chain exposure and runtime/build privileges for adoption or risk review. Build-only dependencies can access code and credentials.
- Preserve reproducible lockfiles and supported browser/Node/Tauri compatibility. Do not merge known failures or silently suppress audit findings.
- Verify affected behavior first; critical/shared or major upgrades need broader tests, build and applicable release checks. Do not change CI, update cadence or rollout infrastructure unless scoped.

## Select the workflow

| Task | Read only the needed branch |
| --- | --- |
| Add a package | [Add](references/dependency-workflows.md#add) |
| Upgrade an installed package | [Upgrade](references/dependency-workflows.md#upgrade); [major upgrade checklist](references/upgrade-checklist.md) only for major/critical changes |
| Remove a package | [Remove](references/dependency-workflows.md#remove) |
| Risk/security audit or update policy | [Risk audit](references/dependency-workflows.md#risk-audit) |

Report changed versions, rationale, compatibility evidence and unresolved advisories/failures. Policy and automation are separate deliverables only when requested.
