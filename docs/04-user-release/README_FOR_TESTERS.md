---
summary: "Tester-facing release readme."
read_when:
  - "Before release handoff"
  - "When user-facing behavior changes"
owner_zone: "user-release"
---
# README For Testers

## Где Лежат Инструкции

Рабочая пользовательская документация находится в `docs/04-user-release/`.

- `README_FOR_TESTERS.md` — с чего начать проверку.
- `TEST_SCENARIOS.md` — пользовательские сценарии.
- `KNOWN_ISSUES.md` — известные проблемы.
- `HOW_TO_INSTALL.md` — установка и запуск.

Инженерные проверки лежат в `docs/03-testing/`. Карта всей документации лежит в `docs/README.md`. Документы в `docs/archive/` нужны только для истории решений и не являются актуальной инструкцией.

## Проверка Порядка В Документации

Если перед тестом менялись документы или release handoff, попросите разработчика подтвердить:

1. `npm run docs:index`
2. `npm run check:encoding`
3. `node tools/audit_project_files.mjs`

Перед тестом проверьте:

1. Какую сборку вы получили: browser, desktop dev или installer.
2. Где лежит тестовый workspace.
3. Какие сценарии нужно пройти в первую очередь.
4. Какие известные проблемы уже описаны в `KNOWN_ISSUES.md`.

Тестировщик не должен использовать основной рабочий мир без резервной копии.
