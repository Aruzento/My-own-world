---
summary: "Current browser/Tauri storage, asset and presentation adapter boundaries; historical migration steps are separate."
read_when:
  - "When changing desktop storage commands, asset resolution or presentation transport"
owner_zone: "architecture"
---

# Desktop Adapter Boundaries

The path is retained for existing consumers; this is the current adapter reference, not a parallel implementation plan. Current roadmap: [PROJECT_PLAN.md](../../01-delivery/PROJECT_PLAN.md).

Tauri is the current desktop target; browser mode and the workspace format remain supported. Electron is only a fallback decision if concrete WebView limitations cannot be solved within the adapter boundary. Desktop releases use [DESKTOP_RELEASE_POLICY.md](./DESKTOP_RELEASE_POLICY.md), including its mandatory gate. Backup/restore procedure: [DESKTOP_BACKUP_RESTORE_GATE.md](./DESKTOP_BACKUP_RESTORE_GATE.md). Historical design choices: [dated implementation history](../../archive/documentation-2026-09-15/DESKTOP_ADAPTER_IMPLEMENTATION_HISTORY.md).

Presentation privacy: hidden non-player entities are excluded; hidden player/original tokens remain visible with their badge. Master and presentation windows communicate model-first snapshots/patches rather than accessing each other's DOM. Runtime transport and current browser regression coverage live in `js/presentation/presentationEntry.js` and `tests/browser/campaign-map-presentation.spec.mjs`.

## StorageAdapter / AssetAdapter Design

Добавлены отдельные контракты:

- `js/storage/storageAdapterContract.js`;
- `js/storage/assetAdapterContract.js`;
- browser implementations;
- desktop implementations;
- facade-слой для выбора активного adapter.

Главное правило: код приложения не должен хаотично обращаться к browser-only `FileSystemHandle`, если операция может пройти через adapter.


## StorageAdapter

StorageAdapter закрывает:

- выбор workspace;
- восстановление workspace;
- чтение и запись текстовых файлов;
- чтение и запись binary;
- создание папок;
- удаление файлов и папок;
- list files.

Backup, restore, page writing и часть storage flow уже используют adapter-backed операции.


## AssetAdapter

AssetAdapter закрывает:

- импорт файла в workspace;
- получение renderable URL;
- проверку существования;
- удаление;
- основу для orphan detection.

Для desktop используется Tauri asset protocol / `convertFileSrc`, а для сложных случаев есть fallback через binary read и data URL.


## Tauri FS Commands

Rust backend содержит команды:

- `read_text_file`;
- `write_text_file`;
- `read_binary_file`;
- `write_binary_file`;
- `list_directory`;
- `ensure_directory`;
- `remove_file`;
- `remove_directory`;
- `path_exists`;
- `resolve_asset_url`.

Операции ограничены workspace root. Выход через `..` блокируется. Текстовые операции используют UTF-8.

Обновление 17.07.2026: boundary перенесён в Rust-managed state. После выбора workspace frontend регистрирует root через `set_workspace_root`; обычные команды `read_text_file`, `write_text_file`, `read_binary_file`, `write_binary_file`, `list_directory`, `ensure_directory`, `remove_file`, `remove_directory`, `path_exists` и `resolve_asset_url` принимают только workspace-relative `path`. `remove_directory` запрещает удаление root (`""`, `"."` и canonical root). Новые пути проверяются по ближайшему существующему родителю, чтобы symlink/junction parent не уводил запись наружу. Текстовые и бинарные записи идут через temp-файл в той же папке, flush/sync и rename.


## Presentation Runtime Transport

Добавлены:

- `presentation.html`;
- `js/presentation/presentationEntry.js`;
- `BroadcastChannel` transport;
- model-first renderer;
- собственные zoom/pan презентации;
- popup просмотра изображения.


## Desktop Map Performance

Сделано:

- renderable asset URL cache;
- delta-sync токенов и фигур;
- delta-sync drag-measure;
- delta-sync fog как отдельное сообщение;
- performance scenario `desktopPresentationLargeWorkspace`;
- стрелка расстояния поверх тумана в презентации.


## Dirty-Region Fog Sync

Кисть тумана теперь записывает dirty-region. Presentation payload отправляет `fogPatch`, если менялась только малая область canvas. Renderer презентации дорисовывает patch в canvas-поверхность и не требует полной сериализации тумана на каждый мазок.

Fog all / Unfog all остаются full-image fallback, потому что эти действия меняют весь canvas.


## Workspace Access Diagnostics

Update 2026-07-19: workspace diagnostics now include an access matrix for desktop and CLI checks:

- another disk;
- network folder;
- possible external drive;
- outside HOME;
- read-only / no write access.

The shared implementation is `js/storage/workspaceAccessDiagnostics.js`. The visible diagnostics panel shows `Location`, `Access matrix` and `Write probe`. The CLI entrypoint is:

```bash
node tools/run_workspace_diagnostics.mjs --workspace "X:\ДНД\Мастер\По кампаниям\База" --json false
```
