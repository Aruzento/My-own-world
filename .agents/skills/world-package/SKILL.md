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

- WORLD_PACKAGE_CONTRACT — если изменились format/import/export правила.
- Release/tester docs — если изменился описанный пользовательский import/export.
- Plan/log — при изменении принятого scope/status, незавершённой работы или значимого решения.

## Проверки

- Export/import round-trip tests и preview/conflict behavior.
- Backup/recovery tests, если import пишет в workspace; asset reference tests при наличии assets; schema/compatibility checks при изменении формата.
- Task-required checks обязательны. Broader verification при изменении persistence/contracts или межсистемном риске.

## Типовые Ошибки

- Не импортировать данные без preview.
- Не писать в workspace без backup/snapshot.
- Не терять связи parent/wiki/asset references.
- Не смешивать package metadata и runtime UI.
