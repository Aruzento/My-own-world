# Desktop Prototype Smoke

Дата создания: 02.06.2026

Этот чеклист относится к пункту плана **20.8 Desktop Prototype**. Он нужен, чтобы desktop-spike проверялся одинаково и не ломал browser-версию.

## Автоматические проверки перед ручным запуском

1. `npm run verify`
   Проверяет синтаксис JS, импортные пути, unit-тесты, zip-целостность manual и `git diff --check`.

2. `npm run test:browser`
   Проверяет browser smoke/regression suite. Desktop-правки не должны ломать браузер.

3. `npm run desktop:check`
   Проверяет Node.js, npm, Tauri CLI, Rust, Cargo, rustup, Visual Studio Build Tools C++ и Windows SDK.

4. `cargo check` в `src-tauri`
   Проверяет, что native backend Tauri компилируется.

## Ручной сценарий в Tauri-окне

1. Запустить `npm run desktop:dev`.
2. В desktop-окне выбрать существующий workspace.
3. Проверить, что дерево страниц загрузилось.
4. Создать карточку.
5. Изменить название и описание карточки.
6. Нажать `Ctrl+S` или дождаться autosave.
7. Закрыть desktop-окно и запустить снова.
8. Проверить, что карточка восстановилась из workspace.
9. Загрузить изображение в карточку.
10. Перезапустить desktop-окно и проверить, что изображение снова отображается.
11. Создать или открыть карту.
12. Сменить фон карты.
13. Перезапустить desktop-окно и проверить, что фон карты восстановился.
14. Открыть task tracker и убедиться, что задачи читаются.
15. Создать ручной backup через UI настроек.
16. Проверить, что `.my-own-world-backups/` появился внутри workspace.
17. Изменить карточку после backup.
18. Восстановить созданный backup через UI настроек.
19. Проверить, что карточка вернулась к состоянию backup.
20. Проверить русские названия карточек и текст: mojibake быть не должно.

## Критерий успеха

- Browser-версия остается зеленой по `npm run test:browser`.
- Tauri backend проходит `cargo check`.
- Desktop-окно открывает workspace, сохраняет страницы и показывает assets.
- Backup создается внутри выбранного workspace.
- Restore возвращает страницы и assets через desktop storage adapter.

## Известные ограничения

- Реальный automated Tauri UI-runner пока не подключен.
- Presentation window внутри desktop еще не выделено отдельным spike.
- Template storage и некоторые редкие сценарии дерева еще могут напрямую использовать `state.workspaceHandle`; это будущий hardening после 20.8.
- Подробный gate для backup/restore описан в `docs/DESKTOP_BACKUP_RESTORE_GATE.md`.
