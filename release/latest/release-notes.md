# Release Notes

Текущий `latest` пока является рабочей зоной release handoff, а не опубликованным релизом.

## Изменения

- Release notes будут заполняться перед передачей сборки тестировщикам.
- Добавлена структура release handoff: `release/latest/`, `release/candidates/`, `release/archive/`.
- Документация разложена по продуктовой, delivery, архитектурной, тестовой и пользовательско-релизной зонам.
- Добавлен foundation `CharacterModel`: модельный слой для HP, временных HP, характеристик, death saves и proficiency.
- Карта связана с `CharacterModel`: здоровье и инициатива токенов теперь подтягиваются из карточки персонажа/существа, включая DEX-модификатор для инициативы.
- Добавлен Design System foundation: UI audit, design system contract, phased rollout и базовый `styles/design-tokens.css`.
- Добавлен foundation `InventoryModel`: инвентарь читается из существующего блока `Предметы` как модельные данные CharacterModel.
