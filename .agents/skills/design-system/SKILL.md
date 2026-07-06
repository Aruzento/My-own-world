---
name: design-system
description: "UI, visual style, design tokens, shell refresh, popups, buttons, panels, map controls, appearance themes, and accessibility."
---

# Design System Skill

## Когда Использовать

Использовать при изменении визуального стиля MyOwnWorld: design tokens, темы, shell/sidebar/topbar/statusbar, popup, кнопки, поля, карточки, блоки, task tracker, map UI, appearance panel и hover/focus/animation states.

## Что Прочитать Перед Задачей

- `AGENTS.md`
- `docs/00-product/PRODUCT_DASHBOARD.md`
- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`
- `docs/02-architecture/ui/UI_AUDIT_AND_MODERNIZATION_PLAN.md`

## Что Обновить После Задачи

- `styles/design-tokens.css`, если появились новые цвета, размеры, motion или theme variables.
- `styles/brand-system.css`, если меняется общий визуальный слой.
- Релевантные CSS-файлы подсистемы, если меняется конкретный UI.
- `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`, если меняется правило дизайн-системы.
- `docs/01-delivery/WORK_LOG.md`.
- `release/latest/release-notes.md` и `release/latest/tester-instructions.md`, если меняется пользовательское поведение или видимый UI.

## Проверки

- `node --check` для измененных JS-файлов.
- `npm run verify`.
- `npm run test:browser`, если меняется UI/runtime.
- Targeted browser smoke для затронутой зоны: app shell, popup, campaign map, properties или task tracker.

## Типовые Ошибки

- Не хардкодить новые цвета, если можно использовать `--mow-*`.
- Не копировать чужие ассеты, логотипы, названия, портреты или карты из референсов.
- Не делать полный редизайн одним хаотичным патчем.
- Не добавлять тяжелый blur или постоянные анимации на карту.
- Не ломать popup lifecycle и draggable popup behavior.
- Не возвращать синий системный focus/accent.
- Не добавлять внешние CDN для шрифтов без отдельного решения.
