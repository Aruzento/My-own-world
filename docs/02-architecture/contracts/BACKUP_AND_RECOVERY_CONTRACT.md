---
summary: "Backup creation, validation, restore and recovery safety contract."
read_when:
  - "When changing backups, restore, recovery preview or partial recovery"
owner_zone: "architecture"
---
# Backup And Recovery Contract

## Backup / Recovery Policy — Recovery Step 2 corrective

Safety covers an operation's actual persistent blast radius. A single logical operation creates at most one necessary safety copy at its chosen tier; internal steps reuse that evidence. Verification has one owner for each contract. A definition-aware full backup already verifies its snapshot before returning; repeating that same complete verification is not a separate safety guarantee. Existing bulk callers are not changed by this corrective; their rollout belongs to Recovery Step 3.

| Tier | Operations | Protection |
| --- | --- | --- |
| A — routine reversible writes | Title/body, ordinary Variables and single-card metadata edits | Whole-page expectedBase/workspace/schema guards, PageCommand rollback and durable readback; existing journal/Undo where applicable. No automatic full workspace backup. |
| B — scoped structural operations | A known bounded set of persistent owners, including one Card's type change | Verified before-image/target evidence for affected owners through existing journal/StorageAdapter, immutable command plan, guarded persistence, explicit recovery. Do not copy unrelated pages/assets. |
| C — bulk/destructive/recovery | Bulk migration, destructive retirement, multi-entity repair, restore/import, asset-wide cleanup, explicit manual full backup | Existing verified definition-aware full workspace backup is appropriate; mandatory pre-restore safety remains. No hidden automatic rollback, retry or false multi-file atomicity. |

### Single-card type-change scoped boundary

`cardTypeChange.js` uses existing operationJournal **version 1**, operation type `card-type-change`. Before any catalog/page mutation, one verified pending record captures the exact source page path/id/bytes/SHA-256 and raw catalog bytes/SHA-256, plus exact planned page/catalog targets. There is one affected Card and zero affected assets. No new workspace/backup format, storage adapter or recovery store is introduced.

Commit requires the live single-use immutable plan, current workspace, exact physical source/path/base and catalog identity, candidate validation and exact schema closure. Catalog activation uses the existing immutable additive catalog owner; it never overwrites definitions. Page persistence remains queued PageCommand with repeated stale checks and physical reread. Confirmed writes update Repository/index/runtime and editor base. The committed journal is durably verified; checkpoint/readback uncertainty is reported even if the page may already be saved. Failure retains original pending/failed evidence and classifies page/catalog as source, target, third or unreadable; subsequent writes stop. No automatic retry/rollback occurs.

Settings → Migration exposes inspection and explicit confirmed Card recovery for pending/failed/completed type operations. Recovery validates evidence digests and source/target definitions, rereads physical state and accepts only the exact original or planned page; third state, missing/moved page, stale runtime/base or invalid catalog blocks. A later valid additive catalog is acceptable only when it still validates the exact original schema closure. **Recovery never restores an older shared catalog** or removes definitions needed by other cards. Raw catalog before/target bytes remain evidence; an invalid/third catalog requiring repair is diagnosed, never blindly replayed. Exact-original state is a guarded no-op; exact-target restoration uses a fresh live PageCommand plan with a verified scoped before-image of the current state. Body, metadata, Variables and inactive evidence return to exact original page bytes.

The confirmation paints busy/progress before asynchronous work, disables repeat submit and cancellation during commit, displays failures and closes only after confirmed success/refresh. Inbound typed-reference diagnostics and catalog index refresh yield in bounded batches; index generations prevent an older refresh overwriting a newer registry/reload. No stale cache or reference rewrite is introduced.

### Remaining callers — classification, not rollout

| Caller | Persistent blast radius | Current safety copy | Intended tier / follow-up |
| --- | --- | --- | --- |
| Properties migration | Selected pages + activated definitions | Full definition-aware workspace/assets backup + journal | C for batch; evaluate bounded single-page slice and duplicate verification in Step 3. |
| Inventory adoption | Actors + shared Item quantity owners | Full definition-aware workspace/assets backup + journal | C; retain global dependency analysis, ordering and resume; audit repeated verification in Step 3. |
| Effects adoption | Selected actors + Field Set activation | Full definition-aware workspace/assets backup + journal | C for batch; evaluate scoped single-page slice in Step 3. |
| Legacy source retirement | Destructive body removal on proven selected pages | Full definition-aware workspace/assets backup + journal | C; retain backup/equivalence gate, audit one-copy/verification ownership. |
| Repair apply / diagnostics repair | Selected independent page/link entities | Full risky-operation backup gate | C for multi-entity; scope/progress audit in Step 3. |
| Multi-page tree positions | A bounded move set, potentially many pages | Threshold-based full backup + existing operation journal | B or C according to actual set; threshold/recovery evidence review in Step 3. |
| Full/partial restore | Selected/current pages, definitions, assets | Mandatory verified pre-restore full safety backup | C; preserve source verification separately from verification of the new safety copy. |
| World Package import | Imported pages/definitions/assets and conflict mapping | Full workspace backup before import | C; retain import safety, audit one-copy/progress ownership. |
| Asset cleanup | Destructive selected asset deletion | Full workspace backup | C; retain incomplete-scan safeguards. |
| Manual Backup Settings | User-requested whole workspace protection | Full backup, automatic definition coverage | C by explicit request; keep behavior, improve progress/count clarity in Step 3 if needed. |

Only single-card Type Switching changes tier in this corrective. Other callers retain their exact production safety behavior. Event History exclusion remains unchanged.

## Card Variables coverage — Stage 9 production integration, 2026-10-01

Ordinary Backup UI automatically uses manifest v2 when durable pages contain structured data or an activated catalog exists. Pure legacy workspaces retain v1. Explicit `definitionCoverage:true` remains available for migration operations; it is no longer a hidden requirement for protecting structured cards. Validation distinguishes valid, warning and invalid/incomplete snapshots.

Manifest v2 covers durable raw pages, the exact activated catalog snapshot at its fixed path (byte length/SHA-256), and workspace assets conservatively. Each page/asset has a byte digest. Source catalog closure is validated; snapshot bytes are verified before risky writes. Missing/future unsupported definitions and ambiguous page paths block protection rather than produce a lossy snapshot. Raw invalid values may be protected; structured restore validates selected values and refuses invalid domain state, retaining raw recovery/export access.

Full recovery verifies source integrity and immutable definition collisions before the mandatory verified pre-restore safety backup. Definitions merge additively and are durable before pages; versions needed by newer/unselected pages remain. Restored pages receive exact durable readback; multi-file atomicity is not claimed and failures retain existing incomplete/recovery evidence. Restoring a legacy page does not reimport it; caller reloads canonical workspace state. Catalog union can retain unused activated versions safely.

Definition-aware partial restore resolves selected type/extension/custom closure and typed body/Variable/inactive/metadata assets before the mandatory safety backup. Missing definitions add immutably; id/version/digest collisions block before writes. Unselected/newer definitions and pages remain. Incomplete typed asset scan blocks destructive assumptions. V1 structured restore requires exact existing definitions. Physical page/asset readback precedes success; repository reload follows and stale editor sessions conflict. Presentation refresh failure is separate and cannot roll back confirmed restore. Event history remains excluded. Migration safety snapshots disable retention cleanup.

Legacy retirement uses `legacy-retirement` in the existing operationJournal. Preview proves receipt-backed structured equivalence and exact inert HTML boundaries; free/unknown nested content requires review. Execution verifies a full definition-aware source backup before guarded PageCommand deletion of only proven fragments. Resume reconstructs from the original backup, accepting exact source/target only. Explicit recovery uses the existing verified pre-restore workflow. Runtime projections cannot resurrect retired owners through body autosave.

## Explicit Inventory adoption recovery — CTV Stage 8.10

`inventoryAdoption.js` reuses this same `definitionCoverage:true` full backup/verify/restore path, including assets and mandatory pre-restore safety backup. No backup format/version or second journal/store is added. Adoption backup reason is `inventory-adoption`; its unique id equals the operation id. The operation journal records exact source/target page identities and actor→Item dependencies. Backup source bytes must match the read-only preview before any Item/actor write. Items are durable verified before actor arrays activate.

Inspect the durable operation id, then explicitly confirm resume. Plans reconstruct from verified original backup evidence; exact source is pending, exact verified target is skipped, any third state conflicts. No automatic retry/rollback or blind journal replay occurs. Explicit recovery first verifies a safety backup, then restores original actor/Item bytes. Restored legacy HTML becomes migration-required evidence; open neither adopts nor enables legacy writers. Settings → Migration exposes preview, confirmation, journal inspection/resume and recovery through these existing APIs. Current newer/unrelated pages remain protected.

## Event History Exclusion (16.10 Owner Decision)

Backup manifest v1 and existing restore remain pages/assets only.
`.my-own-world-events/transactions.v1.jsonl` is NOT part of a snapshot and restore never replaces,
deletes or rewinds it. Audit history is not current-state truth. After backup A, later Combat B and
its events, restoring A restores the Campaign Map page (including exact Combat/Initiative A) while
B events remain historical facts. No EventStore replay or restore event is performed.

The mandatory pre-restore backup/verification gate is unchanged. No new manifest field, sidecar
format or version is added. This is not a promise that backup v1 can export/recover event history.
Disposable integration coverage: `tests/combatSessionRecoveryEvents.test.mjs`.

Related contract: [LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md](./LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md).

Important update: full workspace backup is no longer the default protection for every ordinary tree operation. Use the tiers above and lightweight operations contract to choose a single-file write, journal, scoped snapshot, background validation or full backup. Single-card type change uses verified scoped evidence; existing destructive/bulk schema migration, restore/import and repair gates retain full protection.

Дата: 01.06.2026

Этот контракт описывает, как проект должен защищать пользовательские данные перед рискованными операциями и перед будущим автоматическим recovery.

## Главная идея

Любое автоматическое исправление данных должно начинаться с backup. Schema validation только находит проблемы. Recovery предлагает действие. Backup сохраняет состояние до действия.

## Где хранить backup

Backups хранятся внутри workspace в папке:

```text
.my-own-world-backups/
```

Каждый snapshot хранится в отдельной папке:

```text
.my-own-world-backups/2026-06-01T12-30-00-000Z-delete-page-branch/
```

Внутри snapshot:

```text
manifest.json
pages/
  original-page-file.md
assets/
  portraits/
    hero.png
```

## Manifest

`manifest.json` хранит:

- `version` - версия формата backup;
- `id` - id snapshot;
- `createdAt` - дата создания;
- `reason` - причина создания;
- `pages` - список сохраненных страниц;
- `pageCount` - количество страниц;
- `assets` - список asset references, найденных в persistent HTML страниц;
- `assetCount` - количество файлов assets, которые удалось скопировать в snapshot.

## Manifest Integrity Validation

Since `0.0.1.12.3`, `backupService` owns structured validation for existing version-1 manifests through `validateWorkspaceBackupManifest()`. This validates the current v1 format; it does not introduce hashes, checksums, a new manifest version, a second backup format or another restore engine.

Validation returns:

- `VALID` - no known integrity issue;
- `WARNING` - recoverable legacy/partial condition; restore is not blocked by validation alone;
- `INVALID` - restore-blocking corruption.

The v1 invariants currently checked are:

- manifest text is readable and parses as JSON;
- manifest is an object;
- `version` is the supported v1 value;
- manifest `id` matches the selected backup directory when validating a selected backup;
- `pages` is an array and `pageCount` matches it;
- page backup filenames are safe single filenames, not paths;
- every valid page entry has a readable file under the snapshot `pages/` folder;
- `assets` and `assetCount` are coherent for v1;
- asset paths are workspace-relative safe paths;
- expected copied asset files are readable under the snapshot `assets/` folder.

Asset compatibility rule: v1 stores `assetCount` as the number of files actually copied, while `assets` can contain all references that were attempted. If `assetCount < assets.length`, validation reports a `WARNING` because v1 cannot prove which entries were copied. If the manifest claims every listed asset was copied and one is missing, validation reports `INVALID`.

Actual restore must reject `INVALID` manifests before the mandatory pre-restore backup is created and before any workspace page/asset restore write starts.

## Что входит в первый слой backup

Первый слой сохраняет:

- все страницы из `state.pages`;
- имя файла страницы;
- id, title, parent, type, template;
- persistent markdown content страницы.
- persistent assets по `AssetReference`, если файл найден в `assets/`.

Assets копируются в папку `assets/` внутри snapshot. Пути нормализуются относительно workspace `assets/`, поэтому `data-asset="portraits/hero.png"` и `data-asset="assets/portraits/hero.png"` приводятся к одному формату.

## Рискованные операции

Snapshot должен создаваться перед:

- удалением ветки страниц;
- переносом страницы в дереве;
- будущим schema recovery;
- будущим bulk import;
- будущим массовым изменением assets.

## Restore

Since `0.0.1.10.8`, `restoreWorkspaceBackup()` must create a fresh `pre-restore` safety backup before any page or asset restore write starts. Since `0.0.1.12.3`, the selected source backup manifest must pass restore-blocking integrity validation before that safety backup is created. The safety backup uses the existing `BackupService` format, includes assets by default, disables automatic retention cleanup for that one snapshot so the chosen restore source cannot be removed mid-restore, and must itself pass manifest validation/readback before restore proceeds. If source validation, safety backup creation or safety backup verification fails, restore is blocked and no workspace page/asset restore writes may start.

Restore первого слоя работает осторожно:

- восстанавливает файлы страниц из snapshot;
- восстанавливает файлы assets из snapshot;
- создает отсутствующие файлы;
- перезаписывает файлы с тем же именем;
- не удаляет новые файлы, которых не было в snapshot.

Такой restore безопаснее для первого внедрения: он не уничтожает данные, созданные после backup. Полный rollback с удалением лишних файлов нужно добавлять отдельно и только с подтверждением.

## Non-Destructive Restore Preview

Since `0.0.1.12.2`, `buildWorkspaceRestorePreview()` in `js/storage/backupRestorePreview.js` owns the runtime restore preview plan. It reuses the existing backup manifest shape, backup folder layout and active `StorageAdapter`; it does not introduce a second backup format or restore engine.

The preview is side-effect free. Building or viewing it must not:

- write page files;
- write asset files;
- remove files or directories;
- create a backup;
- mutate `PageRepository`;
- mutate `PageIndex`;
- imply persistent schema changes.

The preview compares real persisted content where the current contract can prove a result:

- pages are classified as would add, would replace, unchanged, invalid manifest entry or missing backup file;
- assets are classified as would add, would replace, unchanged, invalid manifest entry or missing backup file;
- damaged manifest/page/asset states produce a blocked preview instead of a misleading safe summary.

Restore preview deliberately does not claim deletion semantics. A page or asset absent from the selected backup is not described as "will be deleted" because the current full restore does not delete files created after the backup.

The Settings backup UI consumes the runtime plan only to show a human-readable summary and meaningful changed/problem items before the existing `restoreWorkspaceBackup()` path runs. The actual restore path and mandatory pre-restore safety backup remain owned by `backupService`.

## Partial Restore

Since `0.0.1.12.4`, `restoreWorkspaceBackupSelection()` in `js/storage/backupService.js` owns explicit page-level partial restore. It is not a second restore engine: it reuses the same selected-backup manifest validation, snapshot layout, active `StorageAdapter`, mandatory pre-restore safety backup and Settings post-restore reload path as full restore.

The first usable partial restore scope is intentionally narrow:

- the user selects explicit backup pages from the Settings restore preview;
- selected page files are preflight-read before the pre-restore safety backup and before workspace restore writes;
- clearly referenced selected-page assets are discovered from the selected backup page content through the existing asset-reference scanner and restored only when matching manifest asset entries exist;
- selected asset bytes are preflight-read before workspace writes;
- unselected current pages are not overwritten;
- unselected assets are not overwritten;
- nothing is deleted because it is absent from the backup.

If the selected backup manifest is restore-blocking, or a selected page/source asset cannot be read during preflight, partial restore is blocked before the safety backup and before workspace restore writes. If a selected backup page references an asset that is not present in the v1 manifest, the restore path does not guess a replacement target; it reports that unresolved reference in the runtime result and restores only the deterministic selected-page subset.

Partial restore does not claim full multi-file atomicity after writes begin. The current safety guarantee is: selected inputs are validated before writes, a pre-restore backup is mandatory, and successful Settings restore refreshes runtime state through the normal workspace load path.

## Restore Failure Safety

Since `0.0.1.12.5`, full and partial restore share a stricter failure contract inside `js/storage/backupService.js`:

- manifest validation still blocks unsafe backups before the pre-restore safety backup and before workspace writes;
- full restore preflights backup page bytes and deterministic asset bytes before the pre-restore safety backup;
- partial restore keeps selected-page and selected-asset preflight from `0.0.1.12.4`;
- legacy v1 backups whose manifest has partial or missing asset metadata remain warning-compatible, but missing legacy asset sources are skipped before mutation instead of failing after page writes begin;
- after the pre-restore backup has been created and verified, page or asset write failure stops further restore writes and throws a structured incomplete-restore error that includes the selected backup id, the pre-restore backup id, the failed stage and restored counts.

This is not an atomic restore guarantee. If a mid-restore workspace write fails after one or more files were written, MyOwnWorld reports that restore is incomplete and identifies the pre-restore backup that can be used for recovery. It does not claim success, does not silently reload the partial state as fully restored and does not recursively run an automatic rollback restore.

The Settings restore flow also distinguishes durable restore failure from runtime refresh failure. If restore writes complete but `reloadWorkspaceAfterRestore()` fails, the UI reports that restore was applied but the workspace did not refresh, includes the safety backup id and avoids the normal success message.

## Broken Internal Link Diagnostics

Since `0.0.1.12.7`, `js/storage/internalLinkDiagnostics.js` owns non-destructive diagnostics for currently supported internal references. It builds a runtime report from existing page data and PageIndex/PageRepository lookup behavior; it does not create a second global page database, repair links, delete anything, rewrite page content or change persistent format.

The current supported reference types are:

- raw wiki links such as `[[Title]]` and `[[Title|label]]`;
- converted wiki anchors with `wiki-link` / `internal-link` page metadata;
- ordinary internal page anchors with persisted page target metadata;
- relationship endpoints stored on page relationship metadata.

The report groups issues by type and reason. Current reasons include missing target page, missing/unknown target id, missing relationship endpoint, malformed internal reference and ambiguous title/alias target. Ambiguous targets are informational diagnostics only: MyOwnWorld must not guess which page the user intended. External URLs and plain unfinished text are ignored.

Settings workspace diagnostics and `tools/run_workspace_diagnostics.mjs` consume the same report. The CLI can be run read-only with `--no-write-probe` when diagnostics must not create the temporary workspace access probe.

## Orphan / Connectivity Review

Since `0.0.1.12.8`, `js/storage/orphanReview.js` owns the runtime-only review model for potentially disconnected content. It composes existing diagnostics instead of rescanning the workspace through a parallel database:

- asset candidates come from `buildAssetVerificationReport()` orphan candidates;
- internal/wiki/relationship candidates come from `buildBrokenInternalLinkReport()`;
- schema-defined disconnected records come from `validateWorkspaceSnapshot()` issues such as `page.broken_parent`.

The review model is cautious by design. A root page is not an orphan just because `parent` is empty, and a page with no inbound wiki links is not an orphan by itself. An unused asset is described as "not used right now" / "requires review", not as garbage or safe to delete. Ambiguous internal references are review candidates only; MyOwnWorld must not guess the intended target.

The report records whether each candidate is purely diagnostic or already a schema error. It does not add repair buttons, delete files/pages, rewrite links, change persistent format or weaken backup requirements for future repair.

## Repair Preview

Since `0.0.1.12.9`, `js/storage/repairPreview.js` owns the runtime-only repair preview plan for the first supported link-safety cases. It consumes the existing broken internal link diagnostics and current page snapshots; it does not create a second page database, backup format, repair engine or persisted plan schema.

The current previewable cases are:

- broken or ambiguous raw/converted wiki links and ordinary internal page anchors where the user explicitly selects an existing page target;
- broken or ambiguous relationship endpoints where the user explicitly selects an existing page target.

The model deliberately does not infer replacement targets from fuzzy title similarity. Ambiguous diagnostics stay blocked until the user chooses one target. Asset replacement is not previewed in this leaf because MyOwnWorld cannot safely invent a replacement file path.

Each ready plan records the source page, diagnostic reason, affected field path, before/after target, local text or relationship context, backup requirement for future apply and stale-plan evidence from the current source page. Since `0.0.1.13.10`, the machine-readable stale evidence uses the Phase 13 canonical `sourcePageStateIdentity`; legacy readable details (`contentHash`, `updatedAt`, content length and revision when available) remain present for UI/backward compatibility. Preview creation, target changes, cancellation and reopening are side-effect free: no page writes, asset writes/deletes, repository/index mutation or backup creation may occur.

## Persistent Repair Apply

Since `0.0.1.12.10`, `applyRepairPreviewPlan()` may apply only ready plans produced by the repair-preview contract. There is no global repair-all path in v1, and diagnostics UI must not apply hidden auto-fixes.

The current persistent repair scope is intentionally narrow:

- selected raw wiki links and converted wiki/internal page anchors are rewritten through PageRecord body updates and the existing `PageCommandService` / write queue lifecycle;
- selected relationship endpoints are rewritten through the existing Knowledge Graph relationship command bridge.

Apply validates stale evidence before creating a backup. Current plans compare the source page against `sourcePageStateIdentity`; older plans without that identity fall back to content hash, updated timestamp, content length or revision evidence. If evidence no longer matches, apply is blocked and the user must regenerate the preview. This remains operation-scoped stale protection and now uses the same semantic concept as NF-001 editor write preconditions: "this mutation was based on page state X".

Every persistent repair requires the existing backup safety owner before writes start. If backup creation or verification fails, no repair write may occur. Internal-link repair passes the preview identity to `PageCommandService` as `expectedBase`; relationship repair passes the same identity to the existing Knowledge Graph relationship command bridge. If the later page write fails or the command owner reports a conflict, blocked, stale or superseded non-durable result, the UI reports failure instead of success, and the safety backup id is preserved for recovery guidance.

Restore and partial restore are explicit recovery operations. They are not blocked merely because a user has an old editor session open. Their safety owner remains `backupService`: validated manifest, preflight where possible and mandatory pre-restore backup. After restore writes newer durable page state, any stale editor save based on the older page state must conflict at the Phase 13 page write boundary rather than overwriting the restored content.

## End-To-End Recovery Validation

`0.0.1.12.11` validates the Phase 12 safety pieces together on one deliberately damaged disposable workspace. The integration coverage lives in `tests/recoveryEndToEnd.test.mjs` and uses the Phase 12 recovery fixture builders rather than a real user workspace.

The validated scenario includes a page changed after backup, a backup suitable for partial restore, a broken wiki link, a broken relationship endpoint, a missing referenced asset and an unused asset candidate. The scenario proves:

- restore preview classifies exact page/asset changes and cancel/viewing preview performs no persistent writes;
- partial restore restores only the selected changed page and its clearly required selected-page asset, then reloads the workspace read model;
- restore write failure reports incomplete restore with the pre-restore backup id instead of false success;
- asset verification, broken internal links and orphan review group independent problems without repairing them;
- a selected supported broken wiki reference can be previewed, backup-gated, applied, reloaded and removed from diagnostics while unrelated data stays unchanged;
- a preview becomes stale after a normal page write and apply is blocked before backup creation.

Read-only confidence on the approved real workspace `X:\ДНД\Мастер\По кампаниям\База` was gathered with `node tools\run_workspace_diagnostics.mjs --workspace "X:\ДНД\Мастер\По кампаниям\База" --no-write-probe --json true`: 697 pages, 27 maps, 144 assets, 528 asset references, 0 missing asset references, 71 broken wiki links, 203 review candidates, 5 complete backups, 0 incomplete backups, 337 ms. No restore, repair, write probe or cleanup was run against the real workspace.

## Phase 12 Closure Gate

`0.0.1.12.FINAL` closed Data Safety Completion on 2026-08-24 after a cumulative safety review and independent reviewer PASS. The gate confirmed:

- restore preview remains non-destructive;
- manifest validation blocks restore-unsafe sources while keeping supported v1 backups readable;
- partial restore affects only explicit selected pages and deterministic selected-page assets;
- restore write failures report incomplete recovery with the safety backup id instead of false success or false atomicity;
- asset verification, broken-link diagnostics and orphan review are diagnostic only;
- repair preview requires explicit targets and performs no writes;
- persistent repair apply is stale-checked, backup-gated and routed through existing page/relationship command owners;
- the backup manifest format remains version `1`;
- no workspace page, asset-reference or relationship schema migration was introduced.

The approved real workspace `X:\ДНД\Мастер\По кампаниям\База` was used only for read-only confidence: diagnostics ran with `--no-write-probe` and the tree performance probe reported no mutation. No restore, repair, orphan deletion, asset cleanup, write probe, normalization or migration was run against real user content.

## Phase 12 Baseline Flow Map

`0.0.1.12.1` recorded the current recovery contract before restore preview, partial restore and link repair work. The disposable fixture source is `tests/fixtures/dataSafetyFixtures.mjs`; the baseline assertions are in `tests/dataSafetyRecoveryFixtures.test.mjs`. The fixtures are input states only and do not encode future repair behavior.

| Flow | Current owner | Current contract |
| --- | --- | --- |
| Backup create | `js/storage/backupService.js#createWorkspaceBackup` | Reads runtime pages or explicit pages, scans persistent asset references, writes snapshot files through the active `StorageAdapter`, then applies retention cleanup unless disabled. |
| Backup manifest | `backupService#createBackupManifest`, internal manifest reader and `validateWorkspaceBackupManifest` | Manifest version `1` records page metadata and asset references. A missing/corrupt manifest, unsupported version, mismatched id, unsafe page/asset path, wrong page count, missing backup page file or missing expected asset file produces structured validation issues. `INVALID` validation blocks restore; `WARNING` remains non-blocking for recoverable v1 partial asset metadata. |
| Backup list | `backupService#listWorkspaceBackups` and `listIncompleteWorkspaceBackups` | Complete backups are directories with readable `manifest.json`; incomplete backups are directories under `.my-own-world-backups/` without a readable manifest. Scanning is non-destructive. |
| Pre-restore backup | `backupService#createAndVerifyPreRestoreBackup` through `requireWorkspaceBackupBeforeRiskyOperation` | Restore must create and reread a fresh `pre-restore` backup before any restore page/asset write. Failure blocks restore before destructive writes. |
| Restore | `backupService#restoreWorkspaceBackup`, `backupService#restoreWorkspaceBackupSelection` | Full restore writes saved pages/assets through `StorageAdapter`; partial restore writes only explicitly selected pages and clearly referenced selected-page manifest assets. Both paths create/overwrite files present in the snapshot subset and do not delete files created after backup. Restore blocks before pre-restore backup/workspace writes when manifest validation is `INVALID`; full restore now preflights page/deterministic asset bytes, and partial restore preflights selected page/asset bytes. Legacy partial/missing v1 asset metadata can still validate as `WARNING`; missing legacy asset sources are skipped before mutation, and unresolved partial restore asset targets are not guessed. After-start write failures are reported as incomplete restore with the pre-restore backup id. |
| Post-restore reload/refresh | Settings backup UI in `js/ui/appTopbar.js#reloadWorkspaceAfterRestore` | UI restore calls `loadWorkspace()`, reloads page templates, restores tree expansion, renders the tree and shows empty editor if the restored workspace has no pages. Repository/index refresh is owned by the normal workspace load path. If durable restore applied but this refresh fails, Settings reports that the workspace did not refresh and does not show the normal success state. |
| Schema diagnostics | `js/schema/workspaceSchema.js` and `js/schema/schemaRecovery.js` | Validation is diagnostics-first. `WorkspaceRecoveryReport` groups issues and identifies model-level repair actions, but persistent repair requires an explicit user action and backup. |
| Asset diagnostics | `assetReferenceScanner`, `assetBrokenChecker`, `assetOrphanDetector`, `assetWorkspaceService`, Settings asset/diagnostics UI | Scanners classify persistent asset references, missing asset paths and orphan candidates. They do not repair links or delete files. Orphan deletion remains a separate user-confirmed, backup-gated UI flow. |
| Known link diagnostics | `js/storage/internalLinkDiagnostics.js`, PageIndex/PageRepository lookup behavior, current wiki/relationship metadata owners, Settings diagnostics and CLI diagnostics | Diagnostics classify broken raw/converted wiki links, ordinary internal page anchors and relationship endpoints without repair, target guessing or persistent writes. Future repair flows must consume this as evidence and still require explicit user intent plus backup-gated persistence where destructive. |
| Orphan/connectivity review | `js/storage/orphanReview.js`, composed from asset verification, internal link diagnostics and schema diagnostics | Review-only model for disconnected candidates. It distinguishes diagnostic candidates from schema errors, uses cautious language and never decides deletion or repair automatically. |

## Что нельзя делать

- Нельзя чинить данные без backup.
- Нельзя удалять orphan assets автоматически.
- Нельзя делать destructive rollback без явного подтверждения.
- Нельзя скрывать ошибки backup: если snapshot не создан, risky operation должна хотя бы вывести предупреждение.

## Очистка старых backup

По умолчанию после создания новой точки сохраняются 20 последних backup. Более старые snapshot удаляются через `cleanupWorkspaceBackups()`.

Правила:

- нельзя очищать все backup полностью одной автоматической операцией;
- минимум одна точка должна оставаться;
- будущий UI может позволить менять лимит, но должен показывать пользователю, какие snapshot будут удалены.

## Следующий этап

- Автоматический snapshot перед schema recovery.
- Browser regression на delete/move с созданием backup.
- UI-настройки retention-лимита и ручная очистка старых backup.
- Hardening backup assets для больших файлов, audio, playlist, missing/fallback state.

## Automatic Snapshots And Retention UI

`requireWorkspaceBackupBeforeRiskyOperation()` remains the required full-copy gate for its existing bulk/destructive/recovery callers. Bounded single-card type change uses the scoped journal gate above instead. If the operation's required evidence cannot be created and verified, it must stop before changing files or in-memory page metadata.

Risky-operation snapshots are page-first by default: they store page files and a manifest, but skip asset copying unless explicitly requested. This keeps tree delete/move reliable on large legacy workspaces where missing or heavy media files can make full manual backups slow or fragile. Manual backups may still include assets.

Current automatic snapshot points:

- page branch deletion uses `.my-own-world-trash/page-deletes/` as its scoped restorable page snapshot, not ordinary backup;
- page parent move;
- tree reorder / move.

Delete restore rule: deleting a leaf page or branch must create a restorable page trash snapshot for the pages that will be removed. It must not copy unrelated pages from the same workspace. Full-workspace backup is reserved for schema repair, restore, import, destructive rollback, asset cleanup, or other operations where the blast radius is not limited to one known branch.

Tree reorder/move must create one risky-operation snapshot per user drop, not one snapshot per changed sibling. Use batch tree-position writes for DnD plans so large sibling lists do not create multiple backups for a single visible action.

Long-running backup and restore operations should accept an optional `onProgress(progress)` callback. The callback payload is intentionally simple and UI-neutral:

- `label` - visible operation label, for example `Backup`;
- `stage` - current phase, for example `страницы`, `assets`, `cleanup`;
- `current` - completed item count;
- `total` - total item count when known.

The current UI may render this in the statusbar through `createProgressMessage()`. Future modal progress UI should reuse the same callback shape instead of inventing another contract.

Backup create/restore/cleanup should also be wrapped with workspace performance measurement so large workspace work can be diagnosed after the fact. Performance events are diagnostic runtime data, not persistent workspace content.

The settings popup exposes a retention limit control. The limit is persisted in local storage as `myOwnWorld.backup.retentionLimit`, clamped to `1..200`, and used by `createWorkspaceBackup()` cleanup. Manual cleanup from the settings popup must use the same limit and must never remove every backup.

## Incomplete Backup Cleanup

An incomplete backup is a directory inside `.my-own-world-backups/` that does not have a readable `manifest.json`.

Cleanup rules:

- incomplete backup cleanup must scan first and show the candidate list to the user;
- the UI must show at least id, file count and approximate size;
- deletion requires a separate confirmation after the list is visible;
- cleanup must re-check candidates before deleting and must not delete valid backups even if their ids are passed accidentally;
- this cleanup is separate from retention cleanup for valid backups.

The current API is:

- `listIncompleteWorkspaceBackups()` - scan only, no writes;
- `cleanupIncompleteWorkspaceBackups({ backupIds })` - delete only confirmed incomplete candidates.

Large workspace probe results from 2026-07-14 showed that tree move/delete file writes are fast on `X:\ДНД\Мастер\База`, while full page read/parse is expensive. Tree DnD should not call full workspace reload after a successful drop.

## Explicit Effects adoption recovery — CTV Stage 8.11

The explicit programmatic effects-adoption operation reuses full definition-aware BackupService coverage, assets policy and verified operationJournal. Backup is verified against every affected actor source before the first atomic extension/value PageCommand. Journal stores backup id, selected actors, source/target paths/identities, exact Field Set/schema closure and per-page verification/failure checkpoints; it is not executable migration data.

Resume reconstructs candidates from the verified original snapshot/catalog, accepts only exact source or domain-verified target, and rejects third states/catalog changes. It never blindly replays journal values. Recovery requires explicit confirmation and a successfully verified pre-restore safety backup through existing full restore; original body, optional extension/value state and legacy Effects owner return. Caller reloads runtime after restore; opening never auto-adopts. No new backup format, automatic rollback, cleanup or Inventory coupling.
