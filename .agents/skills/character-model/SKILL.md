---
name: character-model
description: "Change CharacterModel calculations, persistence or page/map integration, including Character-to-initiative integration."
---

# Character Model Skill

## Когда Использовать

Использовать при изменении расчётов, persistence или интеграции CharacterModel с карточкой, картой и инициативой. Отдельная combat/action/initiative функция без изменения CharacterModel не включает этот skill.

## Что Прочитать Перед Задачей

- `AGENTS.md` и task scope; использовать его условные маршруты документации.
- `docs/02-architecture/contracts/CHARACTER_MODEL_CONTRACT.md` — текущий Character owner.
- `docs/02-architecture/contracts/PROPERTIES_MODEL_CONTRACT.md`, если затронуты свойства или расчёты.
- `docs/02-architecture/contracts/BLOCK_SYSTEM_CONTRACT.md`, если затронуты блоки или serialization.
- `docs/archive/ARCHIVED_EXPERIMENTS.md` — только opt-in historical reference, если текущих contract/code недостаточно для понимания происхождения решения.

## Что Обновить После Задачи

- Character contract — если изменились model/integration правила.
- Plan — только если изменился принятый scope/status или осталась незавершённая работа.
- Документы затронутого пользовательского сценария — если они стали неверны; DOCX только по явному запросу или release workflow.

## Проверки

- Focused tests для затронутых Character/properties calculations и persistence; проверить совместимость существующих карточек и reload при изменении сохранения.
- Targeted browser smoke при изменении UI карточки или её связи с картой.
- Task-required checks обязательны; broader verification при изменении contracts/persistence или выявленном межсистемном риске.

## Типовые Ошибки

- Не читать смысл персонажа напрямую из произвольного HTML, если можно добавить model API.
- Не расширять legacy `Стат. блок DnD` вместо новой модели.
- Не ломать существующие карточки без migration/fallback.
- Не менять карту напрямую, если изменение должно идти через character/domain model.
