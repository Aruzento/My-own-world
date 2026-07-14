---
name: character-model
description: "Работа с CharacterModel, характеристиками, хитами, навыками, инвентарем и игровыми состояниями."
---

# Character Model Skill

## Когда Использовать

Использовать для задач, где меняются персонажи, существа, хиты, навыки, проверки, инвентарь, эффекты, состояния, инициатива или связь карточки с картой.

## Что Прочитать Перед Задачей

- `AGENTS.md`
- `docs/00-product/PRODUCT_DASHBOARD.md`
- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- `docs/02-architecture/contracts/PROPERTIES_MODEL_CONTRACT.md`
- `docs/02-architecture/contracts/BLOCK_SYSTEM_CONTRACT.md`
- `docs/archive/ARCHIVED_EXPERIMENTS.md`

## Что Обновить После Задачи

- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- contract `CharacterModel`, если он создан или изменен
- manual, если изменилось пользовательское поведение
- release notes / tester instructions, если изменился видимый сценарий

## Проверки

- `npm run verify`
- релевантные tests для properties/character calculations
- browser smoke, если меняется UI карточки или карты

## Типовые Ошибки

- Не читать смысл персонажа напрямую из произвольного HTML, если можно добавить model API.
- Не расширять legacy `Стат. блок DnD` вместо новой модели.
- Не ломать существующие карточки без migration/fallback.
- Не менять карту напрямую, если изменение должно идти через character/domain model.
