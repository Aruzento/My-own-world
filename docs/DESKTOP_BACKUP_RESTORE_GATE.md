# Desktop Backup / Restore Gate

Дата: 02.06.2026

Пункт плана: **20.9 Desktop Backup / Restore Gate**.

## Цель

Проверить, что резервные копии workspace работают в desktop-прототипе через `StorageAdapter`, а не через browser-only `FileSystemHandle`.

## Что уже закрыто автоматически

1. `backupService.js` использует активный `StorageAdapter`.
   Это значит, что desktop-режим пишет backup через Tauri FS commands, а browser-режим через File System Access API.

2. `tests/storageAdapter.test.mjs` проверяет backup/restore без `FileSystemHandle`.
   Тест создает in-memory desktop-style adapter, пишет страницу и asset, создает backup, портит данные, восстанавливает backup и сверяет страницу вместе с asset.

3. `tests/backupService.test.mjs` проверяет базовый backup lifecycle.
   Там покрыты manifest, страницы, карты, task tracker, assets и cleanup старых backup.

4. `npm run desktop:check` проверяет desktop окружение.
   Проверяются Node.js, npm, Tauri CLI, Rust, Cargo, rustup, Visual Studio Build Tools C++ и Windows SDK.

5. `cargo check` проверяет Tauri backend.
   Backend должен компилироваться вместе с командами чтения, записи, удаления файлов и директорий.

## Ручной desktop-сценарий

1. Запустить `npm run desktop:dev`.
2. Нажать кнопку выбора workspace.
3. Выбрать реальную папку workspace.
4. Открыть настройки в верхней панели.
5. Нажать `Создать резервную копию`.
6. Проверить, что в workspace появилась папка `.my-own-world-backups/`.
7. Изменить одну карточку.
8. Вернуться в настройки и нажать `Восстановить` у созданного backup.
9. Подтвердить восстановление.
10. Проверить, что карточка восстановилась.
11. Проверить, что дерево перечиталось и приложение не потеряло русские названия.
12. Если в карточке или карте были изображения, проверить, что они тоже восстановились.

## Критерий успеха

- Backup создается внутри выбранного workspace.
- Restore возвращает страницы и assets.
- После restore приложение перечитывает workspace и дерево.
- Browser-версия продолжает проходить `npm run test:browser`.
- Desktop backend проходит `cargo check`.

## Оставшийся хвост

Автоматический Tauri UI-runner пока не подключен. Поэтому реальный клик по desktop popup backup/restore остается ручным smoke-сценарием до отдельного пункта по desktop UI automation.
