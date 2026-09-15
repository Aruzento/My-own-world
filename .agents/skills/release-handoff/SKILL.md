---
name: release-handoff
description: "Prepare release notes, tester instructions and known issues for a user-facing release handoff."
---

# Release Handoff Skill

## Когда Использовать

Использовать для release notes, tester instructions и known issues в user/release workflow. Правка внутренних test instructions сама по себе не запускает handoff.

## Что Прочитать Перед Задачей

- `AGENTS.md` и task scope; использовать его условные маршруты документации.
- `docs/README.md`, если меняется навигация release-документации.
- `docs/01-delivery/RELEASE_PROCESS.md`
- `docs/04-user-release/README_FOR_TESTERS.md` — для затронутого tester handoff.
- `docs/04-user-release/TEST_SCENARIOS.md` — для затронутого пользовательского smoke-маршрута.
- `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md`, если handoff включает desktop build/installer.

## Что Обновить После Задачи

- release notes
- tester instructions
- known issues
- `docs/04-user-release/README_FOR_TESTERS.md`, если поменялась структура проверки или расположение инструкций
- `docs/04-user-release/TEST_SCENARIOS.md`, если поменялся пользовательский smoke-маршрут
- `docs/01-delivery/WORK_LOG.md`, если записывается release/status решение
- `docs/01-delivery/PROJECT_PLAN.md`, если изменился статус пункта

## Проверки

- `npm run docs:index` при изменении release/user docs и `npm run check:encoding`.
- Проверить tester path, команды, known issues и соответствие заявлений evidence конкретной версии.
- Runtime changes требуют affected regression checks. Реальная передача installer/build требует gates desktop release policy; редактирование текста не запускает их заново.

## Типовые Ошибки

- Не оставлять пользователя без инструкции, что проверять.
- Не скрывать непроверенные риски.
- Не смешивать внутренние инженерные заметки и инструкции для тестировщика.
- Не считать release готовым без явного списка проверок.
- Не отправлять тестировщику архивные документы как рабочий источник правды: архив нужен только для истории решений.
