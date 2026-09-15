---
name: map-hardening
description: "Карта кампании: токены, фигуры, туман, слои, инициатива, performance и presentation sync."
---

# Map Hardening Skill

## Когда Использовать

Использовать при изменениях карты кампании, fog, locked zones, tokens, shapes, layers, initiative, presentation sync, performance diagnostics или map save/load.

## Что Прочитать Перед Задачей

- `AGENTS.md` и task scope; использовать его условные маршруты документации.
- `docs/02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md` — нужная часть при изменении map performance/rendering.
- `docs/02-architecture/desktop/DESKTOP_MAP_PERFORMANCE_NOTES.md` — при изменении desktop map performance.
- `docs/02-architecture/contracts/BLOCK_SYSTEM_CONTRACT.md` — при изменении map block lifecycle или save/load.

## Что Обновить После Задачи

- Performance notes — если изменились измерения или бюджет.
- Затронутый contract и пользовательские инструкции — если изменение сделало их неверными.
- Plan/log — при изменении принятого scope/status, незавершённой работы или значимого решения.

## Проверки

- Targeted campaign map unit/browser tests по изменённому поведению.
- Для save/load, fog/layers и presentation sync — relevant regression/round-trip/privacy checks; performance сравнивать на одинаковом fixture.
- При изменении desktop presentation/Tauri boundary — применимые desktop проверки и gates текущей policy. Task-required и broader межсистемные проверки сохраняются.

## Типовые Ошибки

- Не сохранять карту из DOM, если изменение должно идти через `CampaignMapModel`.
- Не отправлять полный presentation sync без причины.
- Не класть runtime UI в persistent HTML.
- Не менять z-index тумана/слоев без regression.
