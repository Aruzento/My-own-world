---
name: performance-optimization
description: "Investigate a measured runtime or page-load bottleneck, or perform an explicitly scoped performance audit."
category: development
catalog_summary: "Core Web Vitals, asset optimization, render performance"
display_order: 4
---

# Performance Optimization

Use for a measured runtime/page-load problem or an explicit performance audit. If there is only a symptom, establish a reproducible baseline before choosing an optimization.

## Invariants

- Measure and re-measure the same fixture, runtime, hardware/conditions and interaction. Separate lab results from field evidence and targets from measurements.
- Preserve persistent data, behavior and subsystem ownership. MOW map budgets live in `docs/02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md`; desktop-specific evidence in `docs/02-architecture/desktop/DESKTOP_MAP_PERFORMANCE_NOTES.md` only when needed.
- Choose changes from the bottleneck evidence. Web hosting, RUM, SEO and CWV targets are not default requirements for local desktop runtime.
- Report tools/data unavailable and remaining regressions; do not invent timings or add telemetry/services without authorization.

## Select the workflow

| Task | Read only the relevant section |
| --- | --- |
| Runtime/render/profile bottleneck | [Runtime profiling](references/optimization-playbook.md#runtime-profiling) and affected subsystem code/tests |
| Page-load/CWV problem | [Symptom playbook](references/optimization-playbook.md), matching LCP/INP/CLS/TTFB section |
| Asset/network/bundle problem | [Symptom playbook](references/optimization-playbook.md), matching bundle/images/fonts/third-party section |
| Explicit broad performance audit | [Audit template](references/audit-template.md); [checklist](references/optimization-checklist.md) only for applicable dimensions |

Report baseline, cause, changed behavior and comparable result. A scoped fix does not automatically create an audit report, monitoring project or new performance budget.
