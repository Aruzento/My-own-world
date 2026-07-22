---
summary: "Tester-facing release readme."
read_when:
  - "Before release handoff"
  - "When user-facing behavior changes"
owner_zone: "user-release"
---
# README For Testers

## Start Here

For desktop testing, start with [HOW_TO_INSTALL.md](./HOW_TO_INSTALL.md).

Use the installer for handoff:

```text
src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe
```

The installer updates the app only. The workspace is a separate folder selected inside MyOwnWorld, so test on a copied workspace when possible.

After install or update, run the short smoke from [HOW_TO_INSTALL.md](./HOW_TO_INSTALL.md), then continue with [TEST_SCENARIOS.md](./TEST_SCENARIOS.md).

For the current stabilization handoff, also read:

- `release/latest/release-notes.md` - short current summary, verification snapshot and known risks.
- `release/latest/tester-instructions.md` - current first-pass smoke route before the historical detailed sections.

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
