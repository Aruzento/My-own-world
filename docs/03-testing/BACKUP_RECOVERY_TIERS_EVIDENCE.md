---
summary: "Recovery Step 3 production backup callers, bounded recovery and comparative structural evidence."
read_when:
  - "When validating backup copy counts, verification ownership or scoped tree recovery"
owner_zone: "testing"
---
# Backup recovery tiers — Step 3 evidence

Baseline: `7cbb922a81a2f4ffbcdb64f30204ba195dcc93d0`. Steps 1 and 2 have explicit Owner PASS. Step 3 technical checks do not grant Owner PASS; Steps 4–16 and Combat 17.7 remain blocked.

## Production caller inventory

| Owner / entrypoint | Safety creation / verification / progress |
| --- | --- |
| `backupService.createWorkspaceBackup` | Sole new-snapshot verification owner; preparing → pages/assets → checking → complete. Returned live one-use verification receipt is workspace/adapter/manifest-bound. |
| `createWorkspaceBackupBeforeRiskyOperation` / `requireWorkspaceBackupBeforeRiskyOperation` | One creation wrapper, no additional complete verification. Used by tree, repair and pre-restore safety. |
| `propertiesMigration.execute/resume/recover` | C: one full snapshot; source equivalence check separate. Resume now reuses original journal/backup, fresh verification once; restore owns recovery validation. |
| `inventoryAdoption.execute/prepareResume/recover` | C: shared Items and actor activation; one snapshot, one complete verification, original resume evidence; explicit recovery uses restore. |
| `effectsAdoption.execute/prepareResume/recover` | C: actors/extension closure; same copy/verification/resume ownership. |
| `legacySourceRetirement.preview/execute/resume/recover` | C: receipt/equivalence proof separate from new safety snapshot; same source receipt verified once per preview, no per-actor repetition. |
| `pageStorage.updatePageTreePositions/applyPageTreePositionChanges` | B ≤10 exact pages; C for wide parent/structured batches. Verified scoped journal and PageCommand for small moves and structured batches; Undo retains same boundary. |
| `repairPreview.createRepairSafetyBackup` / `workspaceDiagnosticsPanel.createSchemaRecoveryBackup` | C remains conservative; one logical repair apply creates one copy. Immediate existing status/progress plus repeat-submit guards. |
| `backupService.restoreWorkspaceBackup/Selection` | Source snapshot verification and one new verified pre-restore copy are distinct contracts. Failure retains backup id; additive definitions and Events exclusion unchanged. |
| `worldPackageManager` / `worldPackageImportService` | C: one UI-created snapshot consumed by import engine; JSON/old snapshot reverified. Immediate preparation and disabled import, no backup per page. |
| `assetHealthPanel` / `assetCleanup` | C: one v2/all-assets copy before destructive deletion, including unreferenced legacy orphans; inline preparation/backup/application; fresh orphan/incomplete-scan check is independent. |
| `backupSettings` | Manual full backup C with explicit v2/all-assets coverage even on legacy workspaces; immediate progress/disabled submit; full/partial restore busy guard and mandatory safety. |
| Routine editor/Variables/metadata, `cardTypeChange`, trash and checkpoints | No full copy for A, type change B, exact trash/Undo owners or read-only checkpoints. `schemaUpgradeGate` consumes evidence and does not create backups. |

Single-card Properties/Effects migration and one-card repair stay C: their existing crash/receipt/recovery paths depend on full backup evidence. Introducing another scoped migration/repair recovery architecture is not justified in this slice. All full-copy callers and wrappers were traced through production source branches, not only matched by name.

## Comparative probe

Run `node tools/probe_backup_recovery_tiers.mjs`. Disposable MemoryStorageAdapter fixture: 102 valid structured pages, 4 assets, 262,144 asset bytes. BEFORE replays the exact previous **create + verify caller pattern** against the current creation owner; this is not a claimed historical browser/native timing profile. AFTER consumes the single-use creation result. Small-tree measurement executes the actual production command. Observed timings are comparative evidence, not CI budgets.

| Metric | Old create + verify pattern | Single verification owner | Small scoped move (2 pages) |
| --- | ---: | ---: | ---: |
| Full snapshots | 1 | 1 | 0 |
| Backup pages copied | 102 | 102 | 0 |
| Backup assets copied | 4 | 4 | 0 |
| Complete verification passes / manifest reads | 2 | 1 | 0 |
| Workspace file enumerations | 1 | 1 | 0 |
| Text reads / writes | 516 / 104 | 310 / 104 | 18 / 4 |
| Binary reads / writes | 24 / 4 | 16 / 4 | 0 / 0 |
| Bytes read / written | 4,242,594 / 909,328 | 2,924,158 / 909,328 | 950,135 / 8,561 |
| Observed elapsed ms | 296 | 170 | 110 |

Small move's four writes are two page writes plus pending/committed journal; catalog schema validation still reads exact activated definitions. Zero full copy does not mean zero safety work. No timing budgets or retention rules changed. Historical single-card Type Switching before/after evidence remains in [its Step 2 report](./TYPE_SWITCHING_SCOPED_RECOVERY_EVIDENCE.md).

## Structural and failure acceptance

`tests/backupRecoveryTiers.test.mjs` covers routine zero-backup writes; one-use verification receipts and corrupted/reused evidence; one Tier C copy/verification; resume without hidden snapshots; restore's mandatory separate safety copy; small scoped move/recovery/reload; stale/workspace/journal/write/readback failures stopping further writes; third state blocking; wide structured batch with one copy.

`tests/browser/backup-recovery-tiers.spec.mjs` uses production Backup/Migration Settings: manual busy/progress before held async work; duplicate clicks produce one copy; visible backup failure; verified legacy orphan protection before deletion; source restore plus one pre-safety snapshot; Inventory Item-before-actor verification; scoped tree reload/recovery; Properties checkpoint resume with the original receipt/backup. Existing Type Switching, editor, portability, Combat, Map and adoption regressions remain quality gates. Native/storage-adapter implementation and persistent formats are unchanged; existing injected-Tauri contract coverage remains applicable.

## Final technical checks — 2026-10-03

- Focused unit/integration owners: 292/292 PASS; additional legacy full coverage/restore/adapter/timing slice: 140/140 PASS.
- Focused Chromium: core/type/editor/portability 41/41 PASS; backup/asset UI 14/14 PASS.
- verify:quick: 1362/1362 PASS. Final npm verify: 1362/1362 PASS, including existing large-workspace budgets and standard project checks.
- Final CI-equivalent `npm run test:browser`: 397/397 PASS, including Combat 17.6/Undo, Map, Sheet, Inventory/Effects/adoption and injected-Tauri portability/recovery.
- Existing timing and app-shell intermittent failures were repeated independently and final gates passed without relaxing budgets/timeouts. No generic native/adapter implementation or format version changed; no additional native packaging build was required.
- Step 3 remains OWNER REVIEW pending the owner's manual routine/scoped/risky/manual-backup/restore checklist. Steps 4–16 are not implemented.
