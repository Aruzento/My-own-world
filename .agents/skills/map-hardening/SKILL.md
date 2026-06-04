---
name: map-hardening
description: "Карта кампании: токены, фигуры, туман, слои, инициатива, performance и presentation sync."
---

# Map Hardening Skill

## Когда Использовать

Использовать при изменениях карты кампании, fog, locked zones, tokens, shapes, layers, initiative, presentation sync, performance diagnostics или map save/load.

## Что Прочитать Перед Задачей

- `AGENTS.md`
- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- `docs/02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md`
- `docs/02-architecture/desktop/DESKTOP_MAP_PERFORMANCE_NOTES.md`
- `docs/02-architecture/contracts/BLOCK_SYSTEM_CONTRACT.md`

## Что Обновить После Задачи

- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- performance notes, если меняется производительность
- release notes / tester instructions, если меняется поведение карты

## Проверки

- `npm run verify`
- `npm run test:browser`
- targeted campaign map unit/browser tests
- desktop build, если меняется presentation window или Tauri path

## Типовые Ошибки

- Не сохранять карту из DOM, если изменение должно идти через `CampaignMapModel`.
- Не отправлять полный presentation sync без причины.
- Не класть runtime UI в persistent HTML.
- Не менять z-index тумана/слоев без regression.
