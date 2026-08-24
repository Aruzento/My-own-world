---
summary: "architecture document for BACKUP_AND_RECOVERY_CONTRACT.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Backup And Recovery Contract

Related contract: [LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md](./LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md).

Important update: full workspace backup is no longer the default protection for every ordinary tree operation. Use the lightweight operations contract to decide whether an action needs a single-file write, operation journal, rollback snapshot, background validation, or full backup gate. Full backup remains mandatory for destructive, bulk, schema, restore, import, and repair operations.

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

## Phase 12 Baseline Flow Map

`0.0.1.12.1` recorded the current recovery contract before restore preview, partial restore and link repair work. The disposable fixture source is `tests/fixtures/dataSafetyFixtures.mjs`; the baseline assertions are in `tests/dataSafetyRecoveryFixtures.test.mjs`. The fixtures are input states only and do not encode future repair behavior.

| Flow | Current owner | Current contract |
| --- | --- | --- |
| Backup create | `js/storage/backupService.js#createWorkspaceBackup` | Reads runtime pages or explicit pages, scans persistent asset references, writes snapshot files through the active `StorageAdapter`, then applies retention cleanup unless disabled. |
| Backup manifest | `backupService#createBackupManifest`, internal manifest reader and `validateWorkspaceBackupManifest` | Manifest version `1` records page metadata and asset references. A missing/corrupt manifest, unsupported version, mismatched id, unsafe page/asset path, wrong page count, missing backup page file or missing expected asset file produces structured validation issues. `INVALID` validation blocks restore; `WARNING` remains non-blocking for recoverable v1 partial asset metadata. |
| Backup list | `backupService#listWorkspaceBackups` and `listIncompleteWorkspaceBackups` | Complete backups are directories with readable `manifest.json`; incomplete backups are directories under `.my-own-world-backups/` without a readable manifest. Scanning is non-destructive. |
| Pre-restore backup | `backupService#createAndVerifyPreRestoreBackup` through `requireWorkspaceBackupBeforeRiskyOperation` | Restore must create and reread a fresh `pre-restore` backup before any restore page/asset write. Failure blocks restore before destructive writes. |
| Restore | `backupService#restoreWorkspaceBackup` | Full restore writes saved pages/assets through `StorageAdapter`, creates/overwrites files present in the snapshot and does not delete files created after backup. Restore now blocks before pre-restore backup/workspace writes when selected-source manifest validation is `INVALID`. Legacy partial v1 asset backups can still validate as `WARNING` and keep the existing non-blocking asset behavior. |
| Post-restore reload/refresh | Settings backup UI in `js/ui/appTopbar.js#reloadWorkspaceAfterRestore` | UI restore calls `loadWorkspace()`, reloads page templates, restores tree expansion, renders the tree and shows empty editor if the restored workspace has no pages. Repository/index refresh is owned by the normal workspace load path. |
| Schema diagnostics | `js/schema/workspaceSchema.js` and `js/schema/schemaRecovery.js` | Validation is diagnostics-first. `WorkspaceRecoveryReport` groups issues and identifies model-level repair actions, but persistent repair requires an explicit user action and backup. |
| Asset diagnostics | `assetReferenceScanner`, `assetBrokenChecker`, `assetOrphanDetector`, `assetWorkspaceService`, Settings asset/diagnostics UI | Scanners classify persistent asset references, missing asset paths and orphan candidates. They do not repair links or delete files. Orphan deletion remains a separate user-confirmed, backup-gated UI flow. |
| Known link diagnostics | Current wiki/graph owners: `wikiLinkLookup`, backlinks and Knowledge Graph relationship model | Wiki lookup and graph relationship rendering exist, but there is no dedicated broken wiki/ordinary/relation link repair scanner yet. Phase 12 fixtures include broken wiki-link and broken relationship-target inputs so future link-safety leaves can add diagnostics without guessing targets. |

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

`requireWorkspaceBackupBeforeRiskyOperation()` is the required gate for risky operations that mutate or delete workspace data. If the snapshot cannot be created, the operation must stop before changing files or in-memory page metadata.

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
