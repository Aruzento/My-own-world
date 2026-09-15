# Repo-Local Agent Skills Upstream

This file records third-party skills installed into this repository's local
`.agents/skills/` directory.

Source repository: https://github.com/rampstackco/claude-skills
Upstream commit: `0479242522549dfdb389bb9b7807ad4d6016ffb7`
Installed on: 2026-08-24
Installation scope: repository-local only
Installer: Codex `skill-installer` using sparse git mode

## Installed

| Skill | Upstream path | MOW reason |
|---|---|---|
| `frontend-component-build` | `skills/frontend-component-build` | Reusable UI controls, popups, menus, forms, focus states, and accessible component contracts. |
| `design-system` supporting references | `skills/design-standards` | Merged locally on 2026-09-15: pre-ship guarantees and all three references retained under MOW design-system; separate generic trigger retired. |
| `code-review-web` | `skills/code-review-web` | Code review discipline for vanilla web/Tauri UI, persistence boundaries, browser failures, and regressions. |
| `qa-testing` | `skills/qa-testing` | Smoke/regression QA structure for browser and desktop verification gates. |
| `accessibility-audit` | `skills/accessibility-audit` | WCAG/ARIA/keyboard review for tree, modals, menus, card controls, and desktop workbench flows. |
| `performance-optimization` | `skills/performance-optimization` | Render/runtime performance discipline for large maps, graph, editor surface, assets, and event handlers. |
| `dependency-management` | `skills/dependency-management` | Conservative dependency evaluation and upgrade checklist for npm/Tauri/Playwright/tooling changes. |
| `documentation-strategy` | `skills/documentation-strategy` | Source-of-truth, stale-doc, runbook, and delivery-doc organization for the existing docs-heavy project workflow. |
| `pm-spec-writing` | `skills/pm-spec-writing` | Converts owner ideas and large feature requests into bounded, testable implementation briefs. |
| `backup-and-disaster-recovery` | `skills/backup-and-disaster-recovery` | Backup/restore drill thinking for the upcoming data-safety phase and existing local-first restore workflows. |

## Reviewed But Not Installed

| Skill | Decision | Reason |
|---|---|---|
| `design-system` | Not installed from upstream | MOW already has `.agents/skills/design-system`, a project-specific owner for the actual MyOwnWorld design-system contract. The generic upstream skill must not overwrite it. |
| `security-baseline` | Not installed now | The upstream skill is mostly public HTTP headers, HTTPS, auth, and hosted-site hardening. MOW is currently a local-first Tauri/browser workbench; security tasks should use existing project contracts and targeted cybersecurity skills until a public/hosted security baseline is in scope. |

## Notes

- No installed upstream candidate contained `scripts/` or `assets/`.
- Generic web references must be adapted to MOW's actual stack: vanilla ES modules, CSS tokens, Playwright browser tests, Node scripts, and Tauri 2 desktop runtime.
- Framework-specific references such as Tailwind, Next.js, WordPress, SEO, public-site headers, or Core Web Vitals are secondary checklists only when relevant; they are not MOW architecture contracts.
- The local project-specific skills and `AGENTS.md` remain higher priority than these generic upstream skills.

## Documented Optional Upstream Cross-References

Some installed upstream skills mention related skills or references that are not
installed in MOW because they are outside the current product scope:

| Upstream reference | Mentioned by | MOW decision |
|---|---|---|
| `brand-identity` / former contrast reference | Imported design guidance | Not installed. The former unavailable path is replaced by the MOW design contract, design-system preship checklist and existing accessibility-audit WCAG reference. |
| `seo-technical` | `qa-testing` | Not installed. MOW is a local-first desktop/workbench app, not a public SEO-targeted website. |
| `after-action-report` | `backup-and-disaster-recovery` | Not installed. Future data-safety work can use MOW's existing work log/status docs unless an incident-report skill is explicitly needed later. |

## Local Workflow Adaptation — 2026-09-15

Activation boundaries are scoped to the actual MOW workflow. The five multi-workflow roots now select references by branch; generic hosting, mobile, compliance and cadence examples do not create product requirements or authorize external actions. Upstream provenance above is retained for moved/adapted references.
