---
name: design-system
description: "Change or review MOW visual tokens, themes and shared UI primitives, including design-system migrations."
---

# Design System Skill

## Когда Использовать

Использовать для MOW visual tokens, тем, общих UI primitives, их review или design-system migration. Одиночный функциональный UI bug исправляется по ближайшему code/test; он сам по себе не требует design workflow.

## Что Прочитать Перед Задачей

- `AGENTS.md` и task scope; использовать его условные маршруты документации.
- `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`
- `docs/02-architecture/ui/UI_CSS_INVENTORY_REPORT.md` — нужная поверхность при migration или проверке duplicate families.
- `docs/02-architecture/ui/UI_MIGRATION_BASELINES.md` — при сравнении migration/screenshot evidence.
- `docs/02-architecture/ui/UI_UX_COMPETITOR_REFERENCE_RESEARCH.md` — нужный pattern, только если задача требует design research.

## Выбор Reference

- Для visual/pre-ship review затронутых primitives: [preship checklist](references/preship-checklist.md). Он сохраняет contrast, hierarchy, states и viewport checks; MOW contract определяет реальные tokens, поверхности и плотность UI.
- Для явного проектирования набора tokens: [token template](references/design-tokens-template.md), только нужные поля; не создавать параллельный owner существующих `--mow-*`.
- [Tailwind patterns](references/tailwind-patterns.md) — только для явно заданной Tailwind-поверхности; не вводить Tailwind в MOW ради reference.

Открывать только нужный reference. Не включать все checklist-файлы в обычный functional UI fix.

## Что Обновить После Задачи

- `styles/design-tokens.css`, если появились новые цвета, размеры, motion или theme variables.
- `styles/brand-system.css`, если меняется общий визуальный слой.
- Релевантные CSS-файлы подсистемы, если меняется конкретный UI.
- `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`, если меняется правило дизайн-системы.
- `docs/01-delivery/WORK_LOG.md` — если требуется запись значимого решения или статуса.

## Проверки

- Focused checks изменённых tokens/primitives и обязательные проверки design contract.
- Functional и visual verification затронутой поверхности: keyboard/focus, popup lifecycle, themes/states. Сравнивать screenshot evidence, когда оно требуется visual policy.
- Полный browser suite — по contract/release gate или межсистемному риску, не повторно вслед за тем же focused smoke без причины. Непроверенное явно указать.

## Типовые Ошибки

- Не хардкодить новые цвета, если можно использовать `--mow-*`.
- Не копировать чужие ассеты, логотипы, названия, портреты или карты из референсов.
- Не делать полный редизайн одним хаотичным патчем.
- Не добавлять тяжелый blur или постоянные анимации на карту.
- Не ломать popup lifecycle и draggable popup behavior.
- Не возвращать синий системный focus/accent.
- Не добавлять внешние CDN для шрифтов без отдельного решения.
