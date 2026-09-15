---
summary: "Desktop adapter implementation and migration history"
read_when:
  - "When investigating the dated implementation evidence extracted from DESKTOP_ADAPTER_PLAN.md"
owner_zone: "archive"
---

# Desktop adapter implementation and migration history

Historical snapshot extracted from source HEAD `650507d2458c5a205cd34a6d555f296c56c3c9d9` on 2026-09-15. Current owner: [DESKTOP_ADAPTER_PLAN.md](../../02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md). Statements such as current, next, future and passed below describe their original dates; they are not current implementation instructions or release approval.

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



## Что Вынесено Из Блока 20 В Будущее

Эти задачи больше не считаются хвостами пункта 20 и должны планироваться отдельно:

- расширение native smoke до installed-app и destructive-flow проверки на копии workspace;
- native image picker, если WebView file input окажется проблемным;
- audio/playlist assets;
- структурированные desktop error objects;
- desktop storage runner поверх реального Tauri окна для create/move/delete сценариев;
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
