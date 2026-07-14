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
