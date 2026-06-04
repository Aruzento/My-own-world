# Desktop Packaging Smoke

Дата: 04.06.2026

Пункты плана: **20.14.4-20.14.8**.

## Цель

Зафиксировать минимальный контролируемый путь к desktop build, чтобы Tauri не собирал сырой корень проекта и чтобы browser-версия оставалась независимой.

## Текущее Состояние

- `npm run desktop:prepare` создает `dist-desktop/`.
- `src-tauri/tauri.conf.json` использует `frontendDist: "../dist-desktop"`.
- `beforeBuildCommand` вызывает `npm run desktop:prepare`.
- `bundle.active` включен.
- Bundle target ограничен `nsis`.
- `npm run desktop:gate` является обязательным gate перед desktop build.
- `npm run desktop:build` успешно собирает release `.exe` и NSIS installer.

## Production Dist

В `dist-desktop/` попадают только runtime-файлы:

- `index.html`
- `presentation.html`
- `assets/`
- `js/`
- `styles/`
- `desktop-build-manifest.json`

В `dist-desktop/` не попадают docs, tests, tools, src-tauri, node_modules и workspace пользователя.

## Команды

Проверить production frontend:

```powershell
npm run desktop:prepare
npm run desktop:packaging-smoke
```

Полный desktop gate:

```powershell
npm run desktop:gate
```

Production build:

```powershell
npm run desktop:build
```

## Что Проверяет `desktop:packaging-smoke`

- package scripts: `verify`, `test:browser`, `desktop:check`, `desktop:prepare`, `desktop:gate`, `desktop:dev`, `desktop:build`;
- Tauri берет frontend из `dist-desktop`;
- Tauri вызывает `desktop:prepare` перед build;
- bundle включен;
- asset protocol включен;
- Cargo содержит feature `protocol-asset`;
- capability содержит permission `core:webview:allow-create-webview-window`;
- capability привязан к окну `campaign-map-presentation`;
- в `dist-desktop` есть ключевые runtime-файлы;
- существуют desktop docs.

## Ручной Smoke После Build

1. Запустить release `.exe` или NSIS installer.
2. Открыть существующий workspace.
3. Проверить дерево.
4. Открыть карточку с портретом.
5. Открыть image block.
6. Открыть карту с background.
7. Открыть карту с токенами/объектами.
8. Открыть presentation window.
9. Проверить privacy rules presentation.
10. Создать backup.
11. Восстановить backup.
12. Перезапустить приложение.
13. Убедиться, что workspace, assets, карта и backup доступны.

## Известные Ограничения

- Нет настоящего автоматизированного Tauri UI click-runner.
- Production dist пока не минифицирует JS/CSS.
- Installer smoke требует ручной проверки.
- Большие карты в desktop могут открываться медленнее из-за asset fallback, canvas/fog и WebView/IPC overhead.
