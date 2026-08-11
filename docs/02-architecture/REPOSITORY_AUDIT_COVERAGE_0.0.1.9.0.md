---
summary: "Coverage ledger for the 0.0.1.9.0 repository maintainability audit."
read_when:
  - "When checking what the repository audit actually reviewed"
  - "Before challenging or extending 0.0.1.9.0 findings"
  - "Before starting 0.0.1.10.0 cleanup"
owner_zone: "architecture"
---

# Repository Audit Coverage 0.0.1.9.0

Audit date: 2026-08-11

Head audited: `11c0ce2`

Working tree at start: clean.

## Scope

Included:

- tracked first-party source, styles, tests, docs, release handoff, tools, desktop code and agent workflow files;
- architecture and delivery contracts;
- active docs and archived-plan pointers only enough to verify current source-of-truth ownership;
- ignored local artifacts only enough to identify whether they are tracked or product truth.

Excluded from first-party inventory:

- `.git/`
- `node_modules/`
- `dist-desktop/`
- `src-tauri/target/`
- `test-results/`
- `playwright-report/`
- local ignored `legacy/` and `legasy/`

No real user workspace was opened or mutated.

## Inventory Snapshot

Tracked first-party files at audited head: `581`.

By top-level zone:

| Zone | Files |
| --- | ---: |
| `.agents` | 9 |
| `.github` | 1 |
| `assets` | 4 |
| `docs` | 95 |
| `js` | 271 |
| `release` | 7 |
| root config/docs | 9 |
| `src-tauri` | 11 |
| `styles` | 58 |
| `tests` | 88 |
| `tools` | 20 |
| historical story log | 1 |
| technical maturity evidence | 7 |

By extension:

| Extension | Files |
| --- | ---: |
| `.js` | 271 |
| `.mjs` | 107 |
| `.md` | 108 |
| `.css` | 58 |
| `.json` | 9 |
| `.png` | 6 |
| `.gitkeep` | 6 |
| `.docx` | 2 |
| other tracked project files | 14 |

Largest active files reviewed as debt signals, not automatic delete candidates:

| File | Lines | Audit note |
| --- | ---: | --- |
| `docs/01-delivery/WORK_LOG.md` | 6687 | Historical source; large but intentional. |
| `tests/browser/campaign-map-ui.spec.mjs` | 4226 | Large browser suite; not a cleanup target without test-split plan. |
| `tests/browser/property-blocks.spec.mjs` | 3925 | Large browser suite; useful as Properties regression surface. |
| `js/wiki/knowledgeGraphPage.js` | 3650 | Major coordinator/god-file risk. |
| `tests/browser/visual-regression.spec.mjs` | 3312 | Evidence smoke suite; not strict pixel baseline. |
| `js/editor/propertiesSettingsPopup.js` | 3205 | Popup/layout ownership concentration. |
| `js/wiki/knowledgeGraph.js` | 2019 | Graph model/rendering size risk. |
| `js/storage/pageStorage.js` | 1914 | Storage-critical; contains batch tree-position risk. |
| `tests/storageAdapter.test.mjs` | 1883 | High-value storage regression suite. |
| `js/ui/worldPackageManager.js` | 1783 | Large UI manager; reviewed for data-boundary drift. |

## Specialist Coverage

| Reviewer | Agent id | Coverage | Output used |
| --- | --- | --- | --- |
| A | `019fea5d-d0ad-7951-af56-1f63397e8326` | Page command service, repository/index, feature write boundaries | RA-001, RA-006, RA-007 |
| B | `019fea5d-d608-75f3-9a57-2d598f7c3cfc` | UI architecture, Knowledge Graph, Properties, CSS/helper duplication | RA-008, RA-009, RA-010, RA-011 |
| C | `019fef99-bc9b-7361-9941-970d8e5af9bf` | Source-of-truth/data/domain boundary pass after initial C reviewer 403 | RA-001B, RA-006, RA-007, RA-016 |
| D | `019fea5d-d707-7321-9405-ee31eb985b2e` | Test, release, CI, desktop gate | RA-003, RA-004, RA-014 |
| E | `019fea5d-d782-7160-a083-04f786265668` | Data safety, Tauri/browser storage, large workspace, performance | RA-002, RA-005, RA-012, RA-013 |
| Extra UI/accessibility pass | `019fef97-91d8-7501-bd6a-bdf551ef76c1` | Tables, graph tabs, World Package overlay semantics and token checks | RA-017, RA-018, RA-019, RA-020 |

The initial Reviewer C failed with `403 Forbidden`, so the C slot was replaced instead of being counted as complete.

## Coverage Matrix

| Area | Coverage level | Notes |
| --- | --- | --- |
| AppShell/tree contracts | Read/referenced | No new Tree feature audit finding beyond existing state/page lookup constraints. |
| PageRepository/PageIndex | Deep | Rollback/index desync and direct lookup debt identified. |
| Storage/write queue/page commands | Deep | Batch tree-position rollback and feature low-level writes identified. |
| Backup/restore | Targeted | Restore pre-backup gate mismatch identified. |
| Tauri filesystem boundary | Targeted | No material path escape/root delete finding; Rust boundary looked intentionally constrained. |
| Browser storage adapter | Targeted | Noted as lower-level write owner; no standalone P1 finding beyond command/write-boundary drift. |
| Campaign Map | Broad | Popup/helper duplication, async map render risk and selection/performance risks reviewed; no new product feature recommended. |
| Knowledge Graph | Deep | Coordinator size, CSS icon-only hack, direct state lookup, tab semantics and visual-regression limits identified. |
| Properties | Deep | Popup layout ownership risk identified; character sheet local-token debt identified. |
| Tables | Targeted | Toolbar/keyboard accessibility contract gap identified. |
| Task Tracker | Targeted | Structural icon-only cleanup considered closed; page-action write boundary remains. |
| Popup lifecycle/positioning | Targeted | Shared ownership improved; World Package modality ambiguity remains a cleanup candidate. |
| Safe HTML | Targeted | No confirmed unsafe input-to-sink chain found. |
| CSS/design system | Broad | Remaining token/hack debt identified; no broad rewrite recommended. |
| Tests/browser smoke | Deep | Native smoke/gate/visual-regression semantics risks identified. |
| Docs/plan/archive | Broad | Active source-of-truth reviewed; old plans archive-only; new cleanup docs created. |
| Local artifacts | Targeted | `debug.log` exists locally, ignored and untracked. |

## Searches And Evidence Inputs

Representative searches used:

- tracked inventory via `git ls-files`;
- direct write/read boundary search for `state.pages`, `writePageContent`, `persistPageContentCommand`, `notifyPageUpdated`;
- rollback and tree-position storage inspection;
- restore and backup-gate contract inspection;
- editor open-page async lifecycle inspection;
- CSS hack search for `font-size: 0`, `opacity: 0`, `text-indent`, `outline: none`;
- design-token search for undefined `--mow-*` variables and feature-local palettes;
- duplicate helper search for `escapeHTML`, `escapeHtml`, `rollD20`, `clamp`;
- accessibility search for toolbar/tablist/dialog semantics in table, graph and World Package surfaces;
- desktop gate/smoke search for skipped status, console/page errors and diagnostics warnings;
- stale planning pointer search for archived plan names and old next-block docs.

## Limitations

- This was not a production-code change task.
- Runtime browser/unit/desktop tests were not required for finding validation because no production code was changed.
- The audit did not open a real external large workspace.
- The audit did not use old `PROJECT_FILE_AUDIT.md` as authoritative truth.
- Some older Russian text appears mojibake in PowerShell output; validation uses repository encoding tools instead of terminal rendering.

## Closure Criteria Coverage

| Requirement | Status |
| --- | --- |
| First-party inventory exists | Done |
| Coverage ledger exists | Done |
| Five specialist passes used | Done |
| Findings consolidated and prioritized | Done |
| Cleanup backlog exists | Done |
| Bug inventory reconciled | Done in audit report |
| Source-of-truth maps reviewed | Done |
| No cleanup implemented | Confirmed |
| No product functionality implemented | Confirmed |
| Owner review gate ready | Done |
