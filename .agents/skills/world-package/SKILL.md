---
name: world-package
description: "Экспорт, импорт, переиспользование и будущий Workshop для связанных наборов мира."
---

# World Package Skill

## Когда Использовать

Использовать при задачах экспорта/импорта мира, кампании, региона, карты, персонажа, rule module или любых связанных наборов данных.

## Что Прочитать Перед Задачей

- `AGENTS.md` и task scope; использовать его условные маршруты документации.
- `docs/02-architecture/contracts/ASSET_LIFECYCLE_CONTRACT.md`, если затронуты asset references/payloads.
- `docs/02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md`, если import пишет в workspace или меняет backup/restore boundary.
- `docs/02-architecture/contracts/WORKSPACE_SCHEMA_CONTRACT.md`, если затронуты schema/compatibility boundaries.
- `docs/02-architecture/contracts/WORLD_PACKAGE_CONTRACT.md`

## Что Обновить После Задачи

- `docs/02-architecture/contracts/WORLD_PACKAGE_CONTRACT.md`
- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- release notes / tester instructions, если появляется пользовательский импорт/экспорт

## Проверки

- `npm run verify`
- tests на export/import
- backup/recovery tests, если импорт пишет в workspace
- asset reference tests, если пакет содержит assets

## Типовые Ошибки

- Не импортировать данные без preview.
- Не писать в workspace без backup/snapshot.
- Не терять связи parent/wiki/asset references.
- Не смешивать package metadata и runtime UI.
