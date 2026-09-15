---
name: desktop-release
description: "Prepare desktop builds, packaging or distribution and verify the applicable release gates."
---

# Desktop Release Skill

## Когда Использовать

Использовать для packaging, desktop build, installer, distribution и release gate. Обычный adapter/presentation fix требует проверок затронутой границы; этот skill нужен только если задача включает build/release workflow.

## Что Прочитать Перед Задачей

- `AGENTS.md` и task scope; использовать его условные маршруты документации.
- `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md` — при изменении adapter boundary.
- `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md` — для build/release и соответствующих обязательных gates.
- `docs/02-architecture/desktop/DESKTOP_PACKAGING_SMOKE.md` — для packaging/capabilities проверок.
- `docs/archive/desktop/DESKTOP_TRANSITION_STRATEGY.md` — только для происхождения исторического desktop transition решения; текущие границы находятся в `DESKTOP_ADAPTER_PLAN.md` выше.

## Что Обновить После Задачи

- Adapter boundary или release policy — только если изменилось соответствующее правило.
- Release notes / tester instructions — если изменились сборка, установка или передаваемый сценарий.
- Plan/log — только при изменении статуса принятого пункта или необходимости записать значимое решение.

## Проверки

- Для packaging/capabilities: `npm run desktop:packaging-smoke`; для окружения сборки: `npm run desktop:check`.
- Для build/installer/handoff соблюдать все gates `DESKTOP_RELEASE_POLICY.md`, включая нужные build/native/browser checks и ограничения confidence.
- Сохранять browser parity и adapter/asset-protocol безопасность. Полный release gate не заменять локальным smoke; уже полученное evidence повторять при изменении build/scope или по требованию gate.

## Типовые Ошибки

- Не ломать browser mode ради desktop.
- Не использовать прямой `file://`, если нужен adapter/asset protocol.
- Не коммитить `src-tauri/target/` или installer без отдельного release handoff.
- Не менять capabilities без packaging smoke.
