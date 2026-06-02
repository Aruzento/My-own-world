# Desktop Adapter Plan

## Актуальный статус на 02.06.2026

### 20.8 Desktop Prototype

Статус: **сделано базово**.

- В Tauri включен `withGlobalTauri`, чтобы приложение без bundler могло обращаться к desktop API через `window.__TAURI__`.
- Добавлен `js/storage/tauriBridge.js`: он выбирает глобальный Tauri API в desktop WebView и оставляет dynamic import как fallback для будущей bundler-сборки.
- Выбор workspace в desktop больше не зависит от browser-only `showDirectoryPicker` и bare import `@tauri-apps/plugin-dialog`.
- `desktopStorageAdapter.js` использует Tauri dialog через bridge.
- `desktopAssetAdapter.js` использует Tauri invoke через bridge.
- Добавлен unit regression на выбор workspace через глобальный Tauri dialog API.

### 20.9 Desktop Backup / Restore Gate

Статус: **сделано базово**.

- Backup/restore уже идет через `StorageAdapter`, поэтому desktop-сценарий не требует `FileSystemHandle`.
- Добавлен `docs/DESKTOP_BACKUP_RESTORE_GATE.md`.
- `docs/DESKTOP_PROTOTYPE_SMOKE.md` расширен ручным сценарием restore.
- Storage tests проверяют backup/restore страницы и assets через desktop-style adapter.

Оставшийся хвост: пройти ручной smoke в реальном Tauri-окне и позже подключить automated Tauri UI-runner.

## ?????????? ?????? ?? 02.06.2026

### 20.7.1. Desktop Storage Hardening: ??????? ??????

- `StorageAdapter` ?????? ???????????? ????????? ? ???????? ????????: `readText`, `writeText`, `readBinary`, `writeBinary`.
- ??? ???????? backup snapshot ???????? `removeDirectory`.
- `writeQueue.js` ????? ???????? ????? `page.path` ? active `StorageAdapter`.
- `pageStorage.js` ?????? ?? ?????????? ????????? desktop pseudo-handles.
- `backupService.js` ???????? ????? adapter ? ????? ??????????/??????????????? assets.
- `assetStorage.js`, `browserAssetAdapter.js`, `desktopAssetAdapter.js` ???????????? `importFile` ? `resolveUrl`.
- `images.js` ? `campaignMapRuntime.js` ????????? ??????????? ????? `saveAssetFile()`.
- Tauri backend ??????? ??????? `read_binary_file`, `write_binary_file`, `remove_directory`.
- ????????? regression-????? adapter-backed ?????? ? backup/restore ??? FileSystemHandle.

### 20.8. Desktop Prototype: engineering smoke foundation ??????

??????????? ???????:

1. `npm run desktop:check` ???????????? ?????????.
2. `cargo check` ? `src-tauri` ???????????? ?????????? Tauri backend.
3. `npm run verify` ? `npm run test:browser` ????????????, ??? browser-?????? ?? ???????.
4. ?????? ????????? ???: `npm run desktop:dev`, ??????? ???????? workspace, ???????/???????? ????????, ??????? ?????, ????????? asset ? task tracker.

### ????????? ????????

- **20.9 Desktop Backup / Restore Gate**: ?????? backup/restore ?????? ????????? Tauri ???? ? ???????? desktop smoke checklist.
- ????? **20.10 Desktop Presentation Window Spike**, ???? ?????? prototype ????????.

---

# Desktop Adapter Plan

Дата обновления: 01.06.2026

Desktop-версия естественно подходит My own world, потому что продукт уже local-first и работает с папкой workspace. Следующий этап проекта — не переписывание приложения, а аккуратный desktop spike через adapter boundary.

## Цель Desktop-Версии

- убрать ограничения браузерного File System Access API;
- сделать стабильную работу с локальными файлами без повторных permission-запросов;
- подготовить надежную работу с большими assets: изображения, карты, музыка, плейлисты;
- сохранить текущий workspace-формат;
- использовать существующие schema validation, backup/restore и tests;
- проверить отдельное окно презентации для второго монитора.

Desktop не должен менять формат данных мира без отдельной миграции.

## Выбор Для Spike

Первый spike делаем на **Tauri**.

Причины:

- приложение уже frontend-first;
- Tauri легче Electron по размеру;
- Rust backend дает аккуратный доступ к файловой системе;
- local-first продукту не нужен тяжелый Chromium-дубликат, если можно использовать системный WebView;
- desktop spike можно сделать без изменения основного UI.

Electron остается fallback, если Tauri упрется в WebView-совместимость, drag and drop assets или презентационный режим.

## Пошаговый План

### 20.4. Подготовить Окружение Desktop Spike

Статус: **сделано базово**.

Что добавлено в проект:

1. Dev dependency `@tauri-apps/cli`.
2. Команды:
   - `npm run dev:web`;
   - `npm run desktop:check`;
   - `npm run desktop:dev`;
   - `npm run desktop:info`;
   - `npm run desktop:build`.
3. Минимальная папка `src-tauri/`:
   - `tauri.conf.json`;
   - `Cargo.toml`;
   - `build.rs`;
   - `src/main.rs`;
   - `capabilities/default.json`.
4. `.gitignore` для `src-tauri/target/`.
5. README с командами и системными требованиями.

Текущий desktop-spike намеренно не добавляет native file system commands и не меняет workspace-формат. Он открывает существующий web UI в Tauri WebView через локальный static server.

Состояние текущей машины:

- Node.js/npm: есть.
- Tauri CLI: есть.
- WebView2: обнаружен.
- Rust/Cargo/rustup: не установлены.
- Visual Studio Build Tools с MSVC/Windows SDK: не обнаружены.

Критерий готовности:

- проект содержит desktop-оболочку, которую можно запустить после установки системных зависимостей;
- текущая browser-версия продолжает работать и проверяться обычными тестами;
- `npm run verify` и `npm run test:browser` остаются зелеными.

Первый реальный запуск после установки Rust и Visual Studio Build Tools:

```bash
npm run desktop:check
npm run desktop:dev
```

### 20.5. Создать StorageAdapter

`StorageAdapter` должен спрятать различия между browser и desktop.

Статус: **сделано foundation**.

Минимальный интерфейс:

```js
storageAdapter.pickWorkspace()
storageAdapter.restoreWorkspace()
storageAdapter.readText(path)
storageAdapter.writeText(path, content)
storageAdapter.listFiles(path)
storageAdapter.removeFile(path)
storageAdapter.ensureDirectory(path)
```

Browser implementation:

- использует File System Access API;
- сохраняет handles через IndexedDB/persistence;
- продолжает работать как сейчас.

Desktop implementation:

- хранит абсолютный путь workspace;
- читает и пишет через backend command;
- не требует user activation для каждого permission-запроса;
- запрещает выход за пределы workspace root.

Критерий готовности:

- storage-модули идут через adapter facade;
- есть unit tests adapter contract;
- старый browser flow не сломан.

Текущий результат:

- создан `js/storage/storageAdapterContract.js`;
- создан facade `js/storage/storageAdapter.js`;
- создан `BrowserStorageAdapter`;
- создан `DesktopStorageAdapter`;
- workspace open/restore и базовые папки переведены на adapter;
- desktop workspace root выбирается через Tauri dialog plugin;
- desktop pages load/create/delete получили adapter bridge через lightweight file handles;
- глубокий перенос backup/assets/writeQueue остается следующим hardening-этапом.

### 20.6. Создать AssetAdapter

`AssetAdapter` отвечает за изображения, фоны карт, будущую музыку и плейлисты.

Статус: **сделано foundation**.

Минимальный интерфейс:

```js
assetAdapter.importFile(file, options)
assetAdapter.resolveUrl(assetReference)
assetAdapter.exists(assetReference)
assetAdapter.remove(assetReference)
assetAdapter.findOrphans()
```

Browser implementation:

- хранит файлы в `assets/`;
- работает с blob URL/runtime preview;
- сохраняет только workspace-relative path.

Desktop implementation:

- использует native file copy;
- может отдавать `asset://` или локальный безопасный URL;
- должен сохранять тот же `AssetReference`.

Критерий готовности:

- карточные изображения, фон карты и object PNG работают через adapter;
- asset references остаются совместимыми;
- broken/orphan checks продолжают проходить.

Текущий результат:

- создан `js/storage/assetAdapterContract.js`;
- создан facade `js/storage/assetAdapter.js`;
- создан browser adapter с базовым `resolveUrl` и `exists`;
- создан desktop adapter для `resolve_asset_url`, `path_exists` и `remove_file`;
- перенос текущих image/media flows на adapter остается следующим этапом.

### 20.7. Tauri FS Commands

Статус: **сделано foundation**.

Нужны backend-команды:

- read text file;
- write text file;
- list directory;
- create directory;
- remove file;
- copy/import asset;
- check exists.

Правила безопасности:

- все операции только внутри выбранного workspace;
- путь нормализуется до выполнения операции;
- ошибки возвращаются структурированно: code, message, path, operation;
- UTF-8 используется явно для текстовых файлов.

Текущий результат:

- добавлены команды `read_text_file`, `write_text_file`, `list_directory`, `ensure_directory`, `remove_file`, `path_exists`, `resolve_asset_url`;
- операции ограничены workspace root;
- `..` в относительном пути запрещен;
- текстовые операции используют UTF-8 через Rust `read_to_string` / `write`;
- ошибки пока возвращаются строками, структурированные error objects остаются следующим hardening-пунктом.
- `cargo check` проходит после установки Rust/Cargo/rustup, Visual Studio Build Tools C++ и Windows SDK.

### 20.8. Desktop Prototype

Минимальный ручной сценарий:

1. Открыть существующий workspace.
2. Создать карточку.
3. Изменить карточку и сохранить.
4. Перезапустить desktop-приложение.
5. Проверить, что карточка восстановилась.
6. Создать карту.
7. Добавить токен.
8. Загрузить изображение в карточку.
9. Загрузить фон карты.
10. Проверить task tracker.
11. Проверить UTF-8 в русских строках.

### 20.9. Desktop Backup / Restore Gate

Проверки:

- создать backup;
- проверить manifest;
- восстановить карточку;
- восстановить карту;
- восстановить task tracker;
- восстановить assets;
- проверить, что `.my-own-world-backups/` находится внутри workspace.

### 20.10. Desktop Presentation Window Spike

Проверки:

- открыть отдельное окно презентации;
- синхронизировать токены, фигуры, туман и фон карты;
- проверить скрытые player-токены;
- проверить fullscreen/second monitor сценарий;
- убедиться, что закрытие презентации не ломает карту мастера.

### 20.11. Desktop Packaging Smoke

Проверки:

- dev build запускается;
- production build собирается;
- приложение открывается после установки/распаковки;
- workspace можно открыть без dev server;
- README содержит инструкции запуска;
- release checklist содержит desktop smoke.

## Что Не Делаем На Первом Spike

- не меняем workspace format;
- не добавляем аккаунты;
- не делаем cloud sync;
- не переносим всю storage-архитектуру за один коммит;
- не добавляем музыку до появления `AssetAdapter`;
- не удаляем browser mode.

## Что Нужно Скачать Для Проверки

Для проверки desktop-направления пользователю понадобится:

1. **Node.js LTS** — уже нужен проекту для `npm`.
2. **Git** — для получения обновлений и проверки ветки.
3. **Rust stable + Cargo** — требуется Tauri backend.
4. **Microsoft Visual Studio Build Tools 2022** с компонентом **Desktop development with C++** — требуется для сборки Tauri на Windows.
5. **Microsoft Edge WebView2 Runtime** — обычно уже установлен в Windows 10/11, но для Tauri нужен актуальный runtime.
6. **Playwright Chromium** — ставится через `npx playwright install chromium`, нужен для browser smoke.

Точные команды будут добавлены после 20.4, когда появится реальная Tauri-конфигурация проекта.
