---
name: desktop-release
description: "Desktop/Tauri build, installer, storage adapters, presentation window и release gate."
---

# Desktop Release Skill

## Когда Использовать

Использовать при изменениях Tauri, desktop storage, asset protocol, desktop presentation, installer, release gate или desktop smoke.

## Что Прочитать Перед Задачей

- `AGENTS.md`
- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md`
- `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md`
- `docs/02-architecture/desktop/DESKTOP_PACKAGING_SMOKE.md`
- `docs/02-architecture/desktop/DESKTOP_TRANSITION_STRATEGY.md`

## Что Обновить После Задачи

- `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md`
- `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md`
- `docs/01-delivery/WORK_LOG.md`
- release notes / tester instructions, если меняется сборка или установка

## Проверки

- `npm run verify`
- `npm run desktop:packaging-smoke`
- `npm run desktop:check`
- `npm run desktop:build`, если изменился desktop runtime или packaging
- `npm run test:browser`, чтобы не сломать browser mode

## Типовые Ошибки

- Не ломать browser mode ради desktop.
- Не использовать прямой `file://`, если нужен adapter/asset protocol.
- Не коммитить `src-tauri/target/` или installer без отдельного release handoff.
- Не менять capabilities без packaging smoke.
