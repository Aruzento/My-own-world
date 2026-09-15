---
name: backup-and-disaster-recovery
description: "Design backup policy and recovery objectives, or plan and run an explicitly scoped recovery drill."
category: operations
catalog_summary: "RPO/RTO targets, backup strategy, restoration drills"
display_order: 6
---

# Backup and Disaster Recovery

Use for backup policy/RPO-RTO decisions or an explicitly scoped recovery drill. Routine persistence fixes use the affected contract and tests.

## Invariants

- MOW recovery behavior is owned by `docs/02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md`; schema compatibility by `WORKSPACE_SCHEMA_CONTRACT.md` in that directory.
- A plan is not authorization to overwrite real workspace data, fail over a service or send incident messages. Use disposable copies for drills unless the owner explicitly authorizes a real target.
- Verify backup integrity and recovered content, not just copy/restore exit status. Preserve the source and a recovery/fallback path.
- Separate target RPO/RTO from measured results; report unavailable evidence and failures.

## Select the workflow

Read only the selected branch. Existing task scope/targets take precedence over generic examples.

| Task | Supporting reference |
| --- | --- |
| Backup coverage, retention, RPO/RTO policy | [Backup policy](references/backup-policy.md) |
| Recovery drill or restore runbook | [Restore runbook](references/restore-runbook-template.md), applicable sections only |
| Database/PITR, remote storage, key recovery or compliance | [Special recovery branches](references/backup-policy.md#special-branches), only for a system actually in scope |

Conclude with tested target, integrity/recovery evidence, actual versus required recovery objectives and unresolved risks. Schedule follow-up only when requested.
