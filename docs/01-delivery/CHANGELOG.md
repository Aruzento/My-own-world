---
summary: "Release-oriented changelog."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---
# Changelog

Все заметные изменения проекта фиксируются в этом файле.

Формат основан на Keep a Changelog, но адаптирован под локальный проект MyOwnWorld.

## Unreleased

### Added

- GitHub Actions workflow с `npm run verify` и `npm run test:browser`.
- Asset lifecycle contract, `AssetReference`, broken asset checker и orphan asset detection.
- Campaign map performance strategy, performance snapshot и browser performance smoke.

### Changed

- Presentation full-sync карты использует текущий data-first store/model без лишнего refresh из DOM.

### Fixed

- Нет записей.

### Notes

- Перед релизом этот раздел нужно перенести в конкретную версию.

## Release Notes Template

```markdown
## vX.Y.Z - YYYY-MM-DD

### Added

- 

### Changed

- 

### Fixed

- 

### Migration Notes

- 

### Verification

- `npm run verify`
- `npm run test:browser`
- GitHub Actions `Verify` зеленый
```
