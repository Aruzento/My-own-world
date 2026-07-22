---
summary: "User-facing release test scenarios."
read_when:
  - "Before release handoff"
  - "When user-facing behavior changes"
owner_zone: "user-release"
---
# Test Scenarios

## Проверка Навигации По Документации

1. Открыть `docs/README.md` и убедиться, что понятно, где лежат product, delivery, architecture, testing, user-release и archive документы.
2. Открыть `docs/archive/README.md` и убедиться, что архивные документы имеют причину архивации и ссылку на актуальный рабочий источник.
3. Запустить `npm run docs:index`: проверка должна завершиться без документов без metadata и без документов вне своей зоны.
4. Запустить `npm run check:encoding`: проверка должна завершиться без mojibake/UTF-8 ошибок.
5. Запустить `node tools/audit_project_files.mjs`: в отчете не должно быть случайных `debug.log`, временных файлов или старых generated artifacts.

## Проверка Release Handoff

1. Открыть `release/latest/release-notes.md`.
2. Expected: вверху есть текущий handoff summary, команды проверки, known risks и verification snapshot.
3. Открыть `release/latest/tester-instructions.md`.
4. Expected: первый раздел объясняет, какую сборку тестировать, какие команды запустить и какой ручной smoke пройти.
5. Открыть `docs/04-user-release/KNOWN_ISSUES.md`.
6. Expected: известные риски совпадают по смыслу с release/latest и не обещают, что unfinished-зоны уже release-ready.

## Минимальный пользовательский проход

1. Открыть workspace.
2. Создать карточку.
3. Создать карту.
4. Добавить существо на карту.
5. Открыть презентацию.
6. Проверить backup/restore.
7. Создать task tracker и задачу.
8. Создать сущность `Правила`, импортировать legacy rule-карточку и проверить, что правило сохраняется после перезагрузки.
9. В карточке персонажа выбрать правило из Rule Tree в блоке `Эффекты и состояния` и проверить, что оно сохраняется.
10. В Rule Tree добавить условие к правилу, экспортировать JSON-пакет, импортировать пакет обратно и проверить предпросмотр активных эффектов.
11. Проверить Rule Tree engine: правило с `level >= 3` не должно применяться к персонажу 1 уровня и должно примениться после повышения уровня.
12. В Rule Tree сохранить package-файл в workspace, обновить список пакетов, импортировать файл без конфликта и проверить, что конфликтующий rule id показывает предупреждение вместо перезаписи.

## Paste Safety Smoke

1. Open any editable card text field.
2. Copy a formatted web fragment that contains a link and image, then paste it into the field.
3. Expected: only readable text appears. No image, script, external style, unexpected button or foreign formatting is inserted.
4. Repeat inside a table cell.
5. Expected: table paste keeps plain text/table-like text only, and the app can save/reopen the card normally.

## Schema Recovery Smoke

1. Open Settings and run workspace diagnostics.
2. Expected: schema problems are grouped by meaning, not shown as one unreadable list.
3. If the report offers `Create backup and repair safe items`, press it only on a disposable/broken fixture.
4. Expected: backup is created first, missing page parents are moved to root, diagnostics reruns, and remaining legacy warnings stay visible instead of being silently hidden.
5. If backup creation fails, expected: repair stops before changing page parents, and the diagnostics panel shows the backup error.

Подробные инженерные smoke-сценарии живут в `docs/03-testing/SMOKE_TESTS.md`.
