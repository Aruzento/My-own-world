---
summary: "architecture document for DESKTOP_ADAPTER_PLAN.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Desktop Adapter Plan

Дата обновления: 04.06.2026

Пункт плана: **20. Desktop Adapter / Internet Resource Strategy**.

Статус: **закрыт как desktop foundation**.

Desktop-направление больше не является только идеей или spike. В проекте есть Tauri-оболочка, adapter boundary для файлов и assets, native FS commands, backup/restore gate, отдельное окно презентации, production frontend output, installer и release policy.

Browser-версия при этом остается основной совместимой веткой: desktop-доработки идут через адаптеры и не должны ломать запуск через обычный локальный сервер.

## 20.1. Desktop Target

Статус: **сделано**.

Desktop-цель зафиксирована:

- local-first приложение с workspace на диске;
- стабильная работа с локальными файлами без browser permission loops;
- поддержка больших картинок, фонов карт и будущих media-assets;
- отдельное окно презентации для второго монитора;
- сохранение текущего workspace-формата.

## 20.2. Tauri Для Первого Spike

Статус: **сделано**.

Выбран Tauri, потому что приложение уже frontend-first, а Rust backend дает контролируемый доступ к файловой системе. Electron остается fallback только если системный WebView упрется в реальные ограничения, которые нельзя обойти адаптерами.

## 20.3. StorageAdapter / AssetAdapter Design

Статус: **сделано**.

Добавлены отдельные контракты:

- `js/storage/storageAdapterContract.js`;
- `js/storage/assetAdapterContract.js`;
- browser implementations;
- desktop implementations;
- facade-слой для выбора активного adapter.

Главное правило: код приложения не должен хаотично обращаться к browser-only `FileSystemHandle`, если операция может пройти через adapter.

## 20.4. Desktop Spike Environment

Статус: **сделано**.

Добавлено:

- `src-tauri/`;
- `tauri.conf.json`;
- Rust entrypoint;
- Tauri capabilities;
- `npm run desktop:check`;
- `npm run desktop:dev`;
- `npm run desktop:build`;
- `@tauri-apps/cli`.

Текущее окружение Windows проверено: Node/npm, Rust/Cargo/rustup, Visual Studio Build Tools C++ и Windows SDK доступны через `desktop:check`.

## 20.5. StorageAdapter

Статус: **сделано foundation**.

StorageAdapter закрывает:

- выбор workspace;
- восстановление workspace;
- чтение и запись текстовых файлов;
- чтение и запись binary;
- создание папок;
- удаление файлов и папок;
- list files.

Backup, restore, page writing и часть storage flow уже используют adapter-backed операции.

## 20.6. AssetAdapter

Статус: **сделано foundation**.

AssetAdapter закрывает:

- импорт файла в workspace;
- получение renderable URL;
- проверку существования;
- удаление;
- основу для orphan detection.

Для desktop используется Tauri asset protocol / `convertFileSrc`, а для сложных случаев есть fallback через binary read и data URL.

## 20.7. Tauri FS Commands

Статус: **сделано foundation**.

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

## 20.7.1. Desktop Storage Hardening

Статус: **сделано**.

Закрыто:

- adapter-backed write layer;
- page storage без desktop pseudo-handles;
- backup/restore через adapter;
- asset import/resolve через adapter facade;
- map background и карточные картинки через renderable URL;
- storage regression tests.

## 20.8. Desktop Prototype

Статус: **сделано базово**.

Desktop prototype запускает web UI в Tauri WebView. Workspace picker работает через Tauri dialog bridge, а не через browser-only `showDirectoryPicker`.

Проверочный сценарий описан в `docs/02-architecture/desktop/DESKTOP_PROTOTYPE_SMOKE.md`.

## 20.9. Desktop Backup / Restore Gate

Статус: **сделано базово**.

Backup/restore проверяется через adapter-backed storage tests и документ `docs/02-architecture/desktop/DESKTOP_BACKUP_RESTORE_GATE.md`. `.my-own-world-backups/` остается внутри workspace.

## 20.10. Desktop Presentation Window Spike

Статус: **сделано**.

Добавлено отдельное окно презентации через Tauri `WebviewWindow`. Старый browser fallback сохранен.

## 20.10.1. Presentation Runtime Transport

Статус: **сделано базово**.

Добавлены:

- `presentation.html`;
- `js/presentation/presentationEntry.js`;
- `BroadcastChannel` transport;
- model-first renderer;
- собственные zoom/pan презентации;
- popup просмотра изображения.

## 20.11. Desktop Packaging Smoke

Статус: **сделано**.

Добавлено:

- `npm run desktop:packaging-smoke`;
- проверка Tauri config;
- проверка capabilities;
- проверка production frontend output;
- проверка desktop-документов.

## 20.12. Cloud Threat Model

Статус: **сделано как стратегический документ**.

Cloud не начинается до Safe HTML, ownership, role model, asset access policy и presentation privacy.

Документ: `docs/02-architecture/security/CLOUD_THREAT_MODEL.md`.

## 20.13. Backend Storage API Plan

Статус: **сделано как стратегический документ**.

BackendStorageAdapter, auth, ownership и sync/conflict resolution описаны как будущий путь, но не реализуются внутри desktop foundation.

Документ: `docs/02-architecture/adapters/BACKEND_STORAGE_API_PLAN.md`.

## 20.14. Desktop Transition

Статус: **сделано foundation**.

Закрыто:

- desktop image runtime parity;
- model-first presentation renderer;
- privacy rules презентации;
- manual desktop smoke checklist;
- automated desktop gate;
- production desktop frontend output;
- installer / NSIS build;
- release policy;
- desktop map performance scenario;
- dirty-region fog sync.

## 20.14.9. Desktop Map Performance

Статус: **сделано**.

Сделано:

- renderable asset URL cache;
- delta-sync токенов и фигур;
- delta-sync drag-measure;
- delta-sync fog как отдельное сообщение;
- performance scenario `desktopPresentationLargeWorkspace`;
- стрелка расстояния поверх тумана в презентации.

## 20.14.10. Dirty-Region Fog Sync

Статус: **сделано**.

Кисть тумана теперь записывает dirty-region. Presentation payload отправляет `fogPatch`, если менялась только малая область canvas. Renderer презентации дорисовывает patch в canvas-поверхность и не требует полной сериализации тумана на каждый мазок.

Fog all / Unfog all остаются full-image fallback, потому что эти действия меняют весь canvas.

## Что Вынесено Из Блока 20 В Будущее

Эти задачи больше не считаются хвостами пункта 20 и должны планироваться отдельно:

- настоящий Tauri UI click-runner;
- native image picker, если WebView file input окажется проблемным;
- audio/playlist assets;
- структурированные desktop error objects;
- desktop storage runner поверх реального Tauri окна;
- cloud/backend implementation;
- desktop updater и signing.

## Проверки Для Desktop Foundation

Минимальный gate:

```bash
npm run verify
npm run test:browser
npm run desktop:packaging-smoke
npm run desktop:check
npm run desktop:build
```

Установщик собирается в:

```text
src-tauri/target/release/bundle/nsis/MyOwnWorld_0.0.0_x64-setup.exe
```
