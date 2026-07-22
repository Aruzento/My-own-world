---
summary: "Registry of archived project documents."
read_when:
  - "When investigating why a document was removed from active docs"
  - "When checking whether an old idea can be restored"
owner_zone: "archive"
---

# Documentation Archive

This folder stores documents that are no longer the active source of truth. Do not delete or restore them without a separate task: they preserve history, decisions, and old ideas.

## Documents

| Document | Why archived | Active source instead |
| --- | --- | --- |
| `PLANS_AND_TECH_DEBT.md` | Old combined plan replaced by the versioned project plan. | `docs/01-delivery/PROJECT_PLAN.md` |
| `PROJECT_DEVELOPMENT_AND_MATURITY_PLAN.md` | Old maturity plan merged into the active project plan and product dashboard. | `docs/01-delivery/PROJECT_PLAN.md`, `docs/00-product/PRODUCT_DASHBOARD.md` |
| `ARCHIVED_EXPERIMENTS.md` | The document itself is an archive of old experiments and should not live in active architecture docs. | `docs/02-architecture/contracts/PROPERTIES_MODEL_CONTRACT.md`, `docs/02-architecture/contracts/CHARACTER_MODEL_CONTRACT.md`, `docs/02-architecture/contracts/DND_CALCULATION_RULES.md` |
| `PROJECT_PLAN_BEFORE_0.0.1.0.0_2026-07-14.md` | Previous active plan archived before starting version 1 numbering from `0.0.1.0.0`. | `docs/01-delivery/PROJECT_PLAN.md` |

## Rule

If part of an archived document is still useful, copy only the relevant idea into the active plan or a contract. Do not move archived files back into active docs without updating references and metadata.

## 2026-07-21 Archive Check

The active plan for version 1 remains `docs/01-delivery/PROJECT_PLAN.md`. Old combined plans and pre-`0.0.1.0.0` planning material stay in this archive as history only.

Current working documents should link to archived plans only for historical context. If an archived idea becomes active again, copy the actionable task into `PROJECT_PLAN.md` or the relevant contract instead of restoring the old plan body.
