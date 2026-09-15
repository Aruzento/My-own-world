---
name: documentation-strategy
description: "Design documentation ownership or maintenance, or perform an explicitly scoped documentation audit."
category: process-and-team
catalog_summary: "Documentation systems, what to document, maintenance cadence"
display_order: 2
---

# Documentation Strategy

Use for a documentation audit, ownership/structure decision or maintenance policy. A point edit to README or an accepted roadmap status needs no strategy workflow.

## Invariants

- Current code/contracts and the accepted task define truth; historical narrative and generated manuals are conditional references.
- Keep one current owner per fact/rule. Routes point to that owner rather than restating its contract.
- Audit scope is explicit. Preserve unique current content and check incoming links before a move/merge; deleting or exporting documents requires task authorization.
- Update documents made inaccurate; do not mandate README + plan + log + DOCX or introduce a new mandatory pre-read.

## Select the workflow

| Task | Supporting reference |
| --- | --- |
| Explicit documentation audit | [Audit](references/documentation-workflows.md#audit) |
| Ownership and architecture | [Ownership](references/documentation-workflows.md#ownership) |
| Maintenance/cadence policy | [Maintenance](references/documentation-workflows.md#maintenance) |
| A document type/template decision | [Doc types guide](references/doc-types-guide.md), selected type only |

For implementing MOW moves/zones/metadata, use the existing `docs-restructure` workflow only for those operations; `docs/README.md` resolves an unknown owner. Report evidence and remaining decisions, not invented readership analytics.
