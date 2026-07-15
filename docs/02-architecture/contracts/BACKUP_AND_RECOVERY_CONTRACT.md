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

Restore первого слоя работает осторожно:

- восстанавливает файлы страниц из snapshot;
- восстанавливает файлы assets из snapshot;
- создает отсутствующие файлы;
- перезаписывает файлы с тем же именем;
- не удаляет новые файлы, которых не было в snapshot.

Такой restore безопаснее для первого внедрения: он не уничтожает данные, созданные после backup. Полный rollback с удалением лишних файлов нужно добавлять отдельно и только с подтверждением.

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

- page branch deletion - scoped to the deleted branch pages only, not the whole workspace;
- page parent move;
- tree reorder / move.

Delete backup rule: deleting a leaf page or branch must create a restorable page snapshot for the pages that will be removed. It must not copy unrelated pages from the same workspace. Full-workspace backup is reserved for schema repair, restore, import, destructive rollback, asset cleanup, or other operations where the blast radius is not limited to one known branch.

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
