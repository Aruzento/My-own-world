---
summary: "architecture document for DESKTOP_RELEASE_POLICY.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Desktop Release Policy

Дата: 04.06.2026

Пункты плана: **20.14.4-20.14.8**.

## Статус

Desktop-переход переведен из spike в управляемый release-контур:

- есть ручной smoke checklist для реального Tauri-окна;
- есть production frontend output `dist-desktop`;
- Tauri build берет frontend из `dist-desktop`, а не из сырого корня проекта;
- `bundle.active` включен;
- installer target ограничен `nsis`, чтобы не требовать лишний MSI/WiX backend;
- добавлен автоматический gate `npm run desktop:gate`;
- `npm run desktop:build` успешно собирает release `.exe` и NSIS installer.
- окно презентации разрешено через `core:webview:allow-create-webview-window` в `src-tauri/capabilities/default.json`.

## Обязательный Gate Перед Desktop Build

Перед `npm run desktop:build` выполнить:

```powershell
npm run desktop:gate
```

The command writes `docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md`.

Команда последовательно запускает:

1. release handoff preflight
2. `npm run docs:index`
3. `npm run agents:validate`
4. `npm run verify`
5. `npm run test:browser`
6. `npm run desktop:prepare`
7. `npm run desktop:packaging-smoke`
8. `npm run desktop:check`
9. `cargo check` в `src-tauri`

Если gate красный, desktop build делать нельзя.

For large GM workspace handoff, pass the workspace into the same gate:

```powershell
npm run desktop:gate -- --workspace "X:\ДНД\Мастер\База"
```

If no workspace is provided, the large workspace smoke is explicitly marked as skipped in the report.

## Production Frontend Output

`npm run desktop:prepare` создает `dist-desktop/`.

В dist попадают только runtime-файлы:

- `index.html`
- `presentation.html`
- `assets/`
- `js/`
- `styles/`
- `desktop-build-manifest.json`

В dist не попадают:

- `docs/`
- `tests/`
- `tools/`
- `src-tauri/`
- `node_modules/`
- `test-results/`
- workspace пользователя

Это важно для скорости, размера installer и безопасности.

## Build

```powershell
npm run desktop:build
```

Tauri сам вызывает `npm run desktop:prepare` через `beforeBuildCommand`.

Проверенный результат:

- release `.exe`: `src-tauri/target/release/my-own-world.exe`;
- NSIS installer: `src-tauri/target/release/bundle/nsis/MyOwnWorld_0.0.0_x64-setup.exe`.

Важно: первый NSIS build может скачать bundler из GitHub. В restricted sandbox это может падать с ошибкой сокета; вне sandbox сборка проходит.

## Install And Update Flow

The NSIS installer is the user handoff artifact. The raw release executable is only for local developer smoke checks.

User data is not bundled into the installer. A workspace is an external folder selected by the user, so installing or updating the app must not move, rewrite, or delete a workspace by itself.

Before sending an installer to another person:

1. Run `npm run desktop:gate`.
2. Run `npm run desktop:build`.
3. Start the freshly built app locally.
4. Open a test workspace.
5. Check workspace picker, tree, a card, a map, presentation, images, music, and manual backup.

Safe update flow:

1. Close the app.
2. Create a manual workspace backup or copy the workspace folder.
3. Install the new `MyOwnWorld_0.0.0_x64-setup.exe`.
4. Reopen the same workspace.
5. Run the quick update smoke from `docs/04-user-release/HOW_TO_INSTALL.md`.

Rollback has two separate parts: reinstall the previous app installer, and restore the workspace backup only if the workspace data was changed during testing.

## Workspace Diagnostics In Settings

The app settings popup must expose a short workspace diagnostics panel for desktop hardening.

The panel should answer the user's first support questions without reading source code:

- which runtime is active: browser or desktop;
- which workspace path is selected;
- whether the app has write access;
- whether schema validation is clean;
- whether the last background checkpoint was clean;
- where backups are stored;
- how many complete and incomplete backups exist;
- whether there are pending operation journal entries;
- what the last recorded workspace operation was.

Diagnostics are read-only. They may scan pages, assets, backups and operation journals, but they must not repair or delete anything by themselves.

## Large Workspace Desktop Smoke

Before handing a desktop build to a GM with a large workspace, run the repeatable large workspace smoke:

```powershell
npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\База"
```

The runner writes `docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md` by default. It covers the measurable part: workspace diagnostics, tree parsing, asset/backups health, desktop environment and packaging smoke.

The visible native Tauri click-through remains manual and is described in `docs/01-delivery/DESKTOP_LARGE_WORKSPACE_SMOKE.md`.

## Ручной Release Smoke

После сборки:

1. Запустить release `.exe` или installer build.
2. Открыть существующий workspace.
3. Проверить дерево, карточки, карту и task tracker.
4. Открыть карточку с портретом.
5. Открыть image block.
6. Открыть карту с background.
7. Открыть карту с токенами и объектами.
8. Открыть presentation window.
9. Проверить privacy: скрытые NPC не видны, hidden player виден с badge `скрыт`, туман поверх сущностей.
10. Создать backup.
11. Изменить карточку.
12. Восстановить backup.
13. Перезапустить приложение.
14. Убедиться, что workspace и assets восстановились.

## Rollback

Если release build сломан:

1. Не использовать новый installer.
2. Вернуться к предыдущему git tag или commit.
3. Запустить предыдущую desktop/dev версию.
4. Перед любым ручным восстановлением сделать копию workspace.
5. Если workspace уже менялся новой версией, восстановить snapshot из `.my-own-world-backups/`.

## Правило Версий

- `patch`: баги, совместимые фиксы, документация, тесты.
- `minor`: новые пользовательские функции без изменения формата workspace.
- `major`: изменение формата workspace, требующее migration/recovery.
- `desktop-experimental`: desktop build, который еще не прошел полный ручной release smoke.

## Что Еще Не Закрыто Полностью

- Нет настоящего автоматизированного Tauri UI runner с кликами по нативному окну.
- Installer smoke пока требует ручной проверки.
- Production dist не минифицирует JS/CSS, потому что проект пока работает как static app без bundler.
- Большие карты могут рендериться медленнее в desktop из-за asset fallback, canvas/fog нагрузки и WebView/IPC overhead.
