---
summary: "Audit record for user-controlled runtime innerHTML surfaces fixed and regression-tested in 0.0.1.0.4.1-0.0.1.0.4.3."
read_when:
  - "When hardening runtime UI text insertion"
  - "Before adding security regression tests for user strings"
owner_zone: "testing"
---

# InnerHTML Audit 2026-07-17

Plan refs: `0.0.1.0.4.1`, `0.0.1.0.4.2`, `0.0.1.0.4.3`

Readiness: Usable security hardening for the audited high-risk runtime labels.

## Fixed Surfaces

- Tree page title was already fixed in `0.0.1.0.4.1`.
- Inline aliases now render alias text through DOM `textContent`.
- Inline tags and old sidebar tags now render tag text through DOM `textContent`.
- Backlink chips now render page titles through DOM `textContent`.
- Wiki-link existing-page picker now renders page titles through DOM `textContent`.
- Campaign map card picker now creates checkbox and title nodes directly instead of interpolating page title into `innerHTML`.
- Universal list / item set picker and chips now escape page title and short description before inserting them into the existing HTML renderer.

## Audited As Already Escaped

- Task Tracker task title, description, checklist and column title use `escapeHTML`.
- Knowledge Graph node titles, relationship labels and page options use `escapeHTML`.
- Rule Tree rule titles, descriptions, conditions and package options use `escapeHTML` / `escapeAttribute`.
- Campaign Map music playlist and track titles use `escapeHTML` / `escapeAttribute`.
- Campaign Map token image title and presentation image preview title use escape helpers.

## Regression Coverage Added

- `tests/browser/tree-security.spec.mjs`
  - `tree-render-escapes-user-title-html`
  - `runtime-label-renderers-keep-aliases-and-tags-as-text`
  - `remaining-runtime-text-renderers-keep-user-html-inert`
- `tests/securityInnerHtmlAudit.test.mjs`
  - static guard for the audited runtime label files
  - `world package import preview keeps script-like titles as data only`

## Deliberately Deferred

- Persistent HTML parsing paths still use `innerHTML` by design and must continue to be protected by `safeHtmlSanitizer` and serializer tests.
- Internal template definitions and icon SVG helpers still render trusted project-owned markup.
