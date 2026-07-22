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

- UI redesign Phase 5 core content advanced with `0.0.1.8.11.6`: card-block dropdowns now use the shared dark select styling, and saved page templates can be opened from the create menu through a tokenized `Из шаблона` picker.
- UI redesign Phase 5 core content advanced with `0.0.1.8.11.5`: ordinary card blocks now share the Properties-inspired visual language with runtime-only type badges, thin colored markers, tokenized block surfaces and lighter Properties fields without heavy background fill.
- UI redesign Phase 5 core content advanced with `0.0.1.8.11.4`: Properties fields now expose design-system variants/states, local sprite field badges, tokenized field surfaces/focus and a corrected character skill/death-save default layout.
- UI redesign Phase 5 core content advanced with `0.0.1.8.11.3`: the card editor header/runtime controls now use design-system tokens, local sprite navigation icons, accessible floating toolbar semantics and a browser visual guard against toolbar/title overlap.
- UI redesign Phase 5 core content advanced with `0.0.1.8.11.2`: editor block drag-and-drop now uses pointer-based preview/placeholder behavior, and the `Add block` popup uses local sprite icons, design-system spacing/focus states and a new visual smoke attachment.
- UI redesign Phase 5 core content started with `0.0.1.8.11.1`: tree/search now has a core-content marker and local search icon, while the old page-info right inspector is removed and replaced by a hidden reserved right-panel slot for future real workflows.
- UI redesign Phase 4 AppShell is closed after user-review correction: the real shell now has a left rail where `Дерево` shows/hides the primary tree sidebar, the profile sits in the rail, cards/maps/tasks/rules/graphs stay inside the world tree instead of duplicated rail tabs, and the shell keeps sidebar resize without a decorative page-info side panel.
- UI redesign Phase 3 overlays are closed at foundation level: editor popups, campaign map generic/token popups, item picker, onboarding and Knowledge Graph node/connect overlays now use the shared popupManager lifecycle and tokenized overlay/control base styling.
- Added a version-1 UI/CSS inventory report for the redesign plan, covering current CSS/UI files, duplicate controls, popup/icon/color approaches, reusable UI foundations, migration risks and the phased migration map.
- Project file audit no longer treats valid markdown documents with required metadata as cleanup candidates solely because they are still untracked before commit.
- `release/latest` теперь начинается с текущего stabilization handoff: что запускать, что тестировать, какие риски известны и какую сборку передавать.
- GitHub Actions `Verify` теперь использует минимальные права, concurrency cancellation, таймаут и короткое хранение browser smoke artifacts на падении.
- `npm run test:browser -- ...` теперь передает аргументы в Playwright, поэтому можно запускать точечный browser smoke через `--grep` или путь к spec-файлу.
- Presentation full-sync карты использует текущий data-first store/model без лишнего refresh из DOM.

### Fixed

- Fixed `npm run desktop:dev` startup when `127.0.0.1:5173` is already occupied by an existing browser preview; the static dev server now reuses the live local server instead of failing Tauri `beforeDevCommand`.
- Fixed floating text toolbar placement in the card editor by moving the toolbar to the app overlay layer and increasing the selection gap so it does not sit on top of the card title.
- Fixed the editor block drag-and-drop regression tracked as `BI-013`; blocks can be moved again and the browser regression verifies a real reorder with cleanup.

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
