---
name: release-handoff
description: "Подготовка release notes, tester instructions, known issues и понятной передачи версии владельцу продукта."
---

# Release Handoff Skill

## Когда Использовать

Использовать при любых задачах, которые меняют пользовательское поведение, установку, проверку, тестовые инструкции, известные риски или release candidate.

## Что Прочитать Перед Задачей

- `AGENTS.md`
- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- `docs/RELEASE_PROCESS.md`
- `docs/DESKTOP_RELEASE_POLICY.md`

## Что Обновить После Задачи

- release notes
- tester instructions
- known issues
- `docs/01-delivery/WORK_LOG.md`
- `docs/01-delivery/PROJECT_PLAN.md`, если изменился статус пункта

## Проверки

- `npm run verify`
- `npm run test:browser`, если менялся UI/runtime
- desktop gate, если менялся installer/desktop path

## Типовые Ошибки

- Не оставлять пользователя без инструкции, что проверять.
- Не скрывать непроверенные риски.
- Не смешивать внутренние инженерные заметки и инструкции для тестировщика.
- Не считать release готовым без явного списка проверок.
