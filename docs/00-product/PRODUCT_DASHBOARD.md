---
summary: "Product dashboard with current project focus and links."
read_when:
  - "Before product planning"
  - "When changing product direction"
owner_zone: "product"
---
# Product Dashboard

## Сейчас

MyOwnWorld - local-first операционная система для НРИ-мира. Проект поддерживает карточки, карты кампаний, task tracker, wiki-links, свойства, backup/restore, tests и desktop foundation через Tauri.

Текущая оценка зрелости: **4.35 / 5**.

## Следующий Главный Фокус

`0.0.0.1. Character Domain Model`

Причина: персонажи, существа, хиты, навыки, инвентарь, эффекты и карта должны опираться на единую доменную модель, а не на чтение HTML-блоков.

## Ключевые Риски

- Нет полноценного `CharacterModel`.
- Нет asset UI для broken/orphan assets.
- Нет настоящего Tauri UI click-runner.
- Release handoff еще только формируется.
- Документация пока не полностью разложена по зонам.

## Где Читать Дальше

- План: `docs/01-delivery/PROJECT_PLAN.md`
- Журнал работ: `docs/01-delivery/WORK_LOG.md`
- Правила агента: `AGENTS.md`
