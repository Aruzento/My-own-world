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

- UI redesign Phase 7 Knowledge Graph advanced with `0.0.1.8.13.10`: graph connect-state reads, node/connect popup controllers, node-menu actions and connect-popup actions now live in a dedicated canvas-overlays JS owner module.
- UI redesign Phase 7 Knowledge Graph advanced with `0.0.1.8.13.7`: graph canvas filterbar, view presets, slice-meter helpers, hidden-reason labels and layout-button HTML now live in a dedicated canvas-controls JS owner module.
- UI redesign Phase 7 Knowledge Graph advanced with `0.0.1.8.13.8`: graph canvas visible-node fallback, empty state, SVG edges, edge labels and node-card HTML now live in a dedicated canvas-renderer JS owner module.
- UI redesign Phase 7 Knowledge Graph advanced with `0.0.1.8.13.9`: graph runtime filters, layout/filter/slice actions and zoom/fit toolbar actions now live in a dedicated canvas-actions JS owner module.
- UI redesign Phase 7 Knowledge Graph advanced with `0.0.1.8.13.6`: selected-node inspector rendering/update logic, graph canvas node icon mapping and relationship labels/editable type options now live in dedicated JS owner modules instead of staying in the graph page monolith.
- UI redesign Phase 7 Knowledge Graph advanced with `0.0.1.8.13.5`: graph styles are now split into base canvas, slice state, selected-node inspector and node/connect overlay owner files, while the remaining Phase 7 work stays on JavaScript split and lifecycle hardening.
- UI redesign Phase 7 Knowledge Graph corrected with `0.0.1.8.13.4`: the graph first layer now uses compact status chips, a visual slice meter, icon-first actions, a lighter selected-node inspector and collapsed relationship editing instead of always-visible explanatory counters and rows.
- UI redesign Phase 7 Knowledge Graph advanced with `0.0.1.8.13.3`: node right-click actions and connection creation now use darker editor-grade overlays, grouped icon actions, compact editable relationship rows and visual-regression coverage for the node menu.
- UI redesign Phase 6 campaign map corrected with `0.0.1.8.12.10`: the split scene/session bar and left canvas tool rail are now full-size workbench zones without internal scrollbars, and map toolbar labels use a body-level floating tooltip layer so hover text is not clipped inside buttons.
- UI redesign Phase 6 campaign map corrected with `0.0.1.8.12.9`: the map toolbar now follows a graphic-editor split layout, with canvas tools in a left vertical rail and scene/session actions in the compact top bar. Existing map actions keep their selectors and behavior, while the new rail is runtime-only and guarded by browser layout tests.

- UI redesign Phase 7 Knowledge Graph advanced with `0.0.1.8.13.2`: selecting a graph node now applies active/muted edge states, related/muted node states and a compact workbench-local inspector with incoming/outgoing counts, relationship rows and `Открыть` / `Соседи` actions. The graph node context menu also now compensates for transformed shell offsets when anchoring to a right-click point.
- UI redesign Phase 7 Knowledge Graph started with `0.0.1.8.13.1`: the graph canvas now exposes visible/total/hidden slice counters, explains hidden-by-filter/slice/limit states, offers `Все связи` / `Уточнить поиск` actions, and uses local sprite icons plus tokenized domain markers in toolbar and node cards.
- UI redesign Phase 6 campaign map corrected with `0.0.1.8.12.8`: selecting a map token or shape now opens a right-side editable Inspector for concrete properties such as position, size, rotation, visibility and shape style; shape rotation is saved in the map model, and right-click on map objects now opens the custom compact action popup instead of the browser context menu.
- UI redesign Phase 6 campaign map corrected with `0.0.1.8.12.7`: the default map screen now uses a thin icon-only toolbar with hover/focus tooltips, treats `Рука` as a tool, and no longer auto-renders duplicate scene/layer panels over the stage.
- UI redesign Phase 6 campaign map closed at `Usable` with `0.0.1.8.12.6`: multi-selected map tokens and shapes now show visible/hidden counters and support group `Скрыть` / `Показать` actions through the existing map store.
- UI redesign Phase 6 campaign map advanced with `0.0.1.8.12.5`: the map stage now has a runtime scene-state inspector for map background, grid and fog status, with direct actions into the existing map-image, Grid and Fog flows and no saved HTML/runtime leakage.
- UI redesign Phase 6 campaign map advanced with `0.0.1.8.12.4`: the map stage now has a runtime layer/object dock with token, shape and hidden-object counters, per-layer summaries, quick visibility toggles and a direct path into the existing Layers popup without changing map business logic.
- UI redesign Phase 6 campaign map advanced with `0.0.1.8.12.3`: selected tokens and shapes now open a compact runtime inspector dock with identity, position, visibility, key token stats, local sprite actions and safe remove-from-map behavior that does not delete the card.
- UI redesign Phase 6 campaign map advanced with `0.0.1.8.12.2`: map add/picker, grid, drawing, fog, shapes, layers, initiative and music popups now use one shared map popup frame with local icons, readable sections, migration markers and preserved legacy action selectors.
- UI redesign Phase 6 campaign map started with `0.0.1.8.12.1`: the map toolbar now has grouped creation, scene, tools and live-session actions, local sprite icons, shared-token styling, accessible labels and active-state coverage without changing map business logic.
- UI redesign Phase 5 core content closed at usable level with `0.0.1.8.11.7`: the left rail now has `Поиск и команды`, `Ctrl+K` opens a shared command palette, deep page results show paths/matched fields/excerpts, and commands reuse existing app actions.
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
