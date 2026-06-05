---
summary: "User-facing release test scenarios."
read_when:
  - "Before release handoff"
  - "When user-facing behavior changes"
owner_zone: "user-release"
---
# Test Scenarios

## Минимальный пользовательский проход

1. Открыть workspace.
2. Создать карточку.
3. Создать карту.
4. Добавить существо на карту.
5. Открыть презентацию.
6. Проверить backup/restore.
7. Создать task tracker и задачу.
8. Создать сущность `Правила`, импортировать legacy rule-карточку и проверить, что правило сохраняется после перезагрузки.
9. В карточке персонажа выбрать правило из Rule Tree в блоке `Эффекты и состояния` и проверить, что оно сохраняется.

Подробные инженерные smoke-сценарии живут в `docs/03-testing/SMOKE_TESTS.md`.
