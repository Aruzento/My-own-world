# Tester Instructions

## 2026-07-21: Current Handoff Smoke

Start here when you receive the current build.

### 1. Confirm Which Build You Are Testing

- Browser/dev: run from the repository with `npm run dev:web`.
- Local desktop executable for developer smoke: `src-tauri\target\release\my-own-world.exe`.
- Installer for another person: `src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe`.

Use a copied workspace for destructive checks such as create, move, delete, backup restore or repair.

### 2. Required Automated Checks Before Handoff

Run:

```powershell
npm run verify
npm run test:browser
```

For focused regression checks, use:

```powershell
npm run test:browser -- --grep schema-recovery
npm run test:browser -- tests/browser/campaign-map-initiative.spec.mjs
```

For UI redesign baseline attachments, use:

```powershell
npm run test:browser -- tests/browser/visual-regression.spec.mjs
```

Then inspect the Playwright attachments named in `docs/02-architecture/ui/UI_MIGRATION_BASELINES.md`.

For the editor block DnD and Add block redesign slice, use:

```powershell
npm run test:browser -- --grep "editor-block-pointer-dnd|add-block-picker"
```

For the card editor header and floating toolbar redesign slice, use:

```powershell
npm run test:browser -- --grep "card-editor-core-content-controls|app-shell-empty-state"
```

For the AppShell foundation guard, use:

```powershell
npm run test:browser -- --grep app-shell
```

For shared primitive and overlay lifecycle coverage, use:

```powershell
npm run test:browser -- component-catalogue
npm run test:browser -- popup-lifecycle
```

Before sending a desktop build, run:

```powershell
npm run desktop:gate
```

For a large GM workspace handoff, include the workspace:

```powershell
npm run desktop:gate -- --workspace "X:\ДНД\Мастер\По кампаниям\База"
```

### 3. Manual Smoke Priority

1. Open a copied workspace.
2. Open Settings diagnostics and check that workspace path, write access, schema status and backup status are readable.
3. On the empty start screen, check that there is one clear action card with `Карточка`, `Карта`, `Задачи`, `Правила` and `Граф связей`. It should not show internal `Workspace`, `Context` or `Diagnostics` demo panels, and the actions should not overlap on desktop or mobile. In the sidebar tree area, when no workspace is open, there should be one clear `Открыть папку` button.
4. Check the left AppShell rail: it should show `Дерево` and the profile/user button only. `Карточки`, `Карты`, `Задачи`, `Правила` and `Граф связей` should remain reachable through the world tree/create flows, not as duplicated rail tabs. The tree sidebar should not repeat `MyWorld` / `Дерево мира` and should not contain workspace/open or create buttons in a header; after opening a workspace, the `Корень` row should show the root `+` create action and the folder-create action.
5. Click `Дерево` in the rail to hide and reopen the tree sidebar, then resize the visible sidebar with the separator by dragging or using Left/Right arrow keys while it is focused. The editor should expand while the tree is hidden, the workspace should stay readable, and the resize handle should be hidden on mobile.
6. Open any real page and check that no right page-info inspector appears. The editor should keep the freed width; the reserved right panel is hidden until a future real workflow owns it.
Card editor design check: select text in the card title and in a normal text block; the floating format toolbar should appear as a compact overlay with accessible controls, stable width and no overlap with the card title.
7. In Settings, switch UI scale between compact/normal/large and check that topbar, rail, sidebar controls, tree search and statusbar stay aligned instead of jumping or overlapping.
8. Open Tools -> `Компоненты`; check that the Button/Input/Panel/Popover examples appear, focus moves inside, and Escape closes the catalogue. For modal dialogs/popups in later checks, Tab/Shift+Tab should stay inside the dialog and close should return focus to the opener. Icon-only shell controls should show compact tooltip labels on hover/focus, and long operation progress should behave like a toast-style status surface.
   UI primitive note: the catalogue should now include IconButton, Select/Checkbox/Segmented field examples, Toolbar/Separator, Panel and Popover without text overlap at compact/normal/large scale.
9. Create a card, type text, save/reopen.
10. Create or open a normal card with text, list, table, image and `Properties` blocks. The blocks should share one quiet editor style with small type badges and thin colored markers; dropdowns inside these blocks, including the list type picker and Properties selects, should look like dark MyOwnWorld controls rather than default browser selects. `Properties` should keep readable field badges without a heavy filled background. For character/creature `Properties`, check HP, AC, initiative and armor picker behavior, readable compact metrics, skill groups and no overlap between lower skill groups and death-save fields. Also open Properties settings, Add block, link creation, image crop, text color and item picker popups; they should close by their normal buttons/Escape without leaving a stuck overlay or lost keyboard focus. Drag a content block by its grip handle and confirm the preview/drop placeholder are readable and the block moves.
11. Save a normal card as a template from the tree context menu, then use the root `+` menu and choose `Из шаблона`. The template picker should show a search field, local icons, readable Russian metadata and create a new card from the selected template.
12. Open a campaign map; move a token, hover/open token actions, use layers/fog/drawing/music/initiative popups, open presentation. The map popups should keep a compact dark overlay style, close through normal controls/Escape/repeated trigger, and return keyboard focus where the popup is modal.
13. If music is part of the test build, add real audio files and test play/stop/next/previous in desktop.
14. Create/open `Граф связей`; drag a node, undo/redo, right-click a node and check relationship actions.
15. In the Knowledge Graph, create a connection through the connect popup; node/connect overlays should stay within the viewport and close cleanly by Escape/outside click.
16. Run backup manually before any repair action; schema repair must stop if backup fails.

### 4. Known Risks To Watch

- Desktop installed-app behavior can still differ from browser smoke.
- Real audio codecs may fail even when playlist UI passes browser tests.
- Large workspace UI smoothness is partly subjective; report any action that feels frozen.
- Knowledge Graph is currently a useful visual workbench, not the final full relationship-management surface.
- Restore preview, partial restore, link cleanup and asset repair remain unfinished.

## 2026-07-20: Knowledge Graph Canvas Undo/Redo

1. Open a Knowledge Graph page.
2. Drag a node to a new place.
3. Expected result: the toolbar `Back` button becomes enabled.
4. Click `Back`.
5. Expected result: the node returns to the automatic graph layout and is no longer marked as pinned.
6. Click `Forward`.
7. Expected result: the node returns to the saved manual position.
8. Right-click a source node, choose the connect action, pick a relationship type and click a target node.
9. Press Ctrl+Z.
10. Expected result: the newly created relationship disappears from the graph/data.
11. Press Ctrl+Y or Ctrl+Shift+Z.
12. Expected result: the relationship returns.

## 2026-07-20: Knowledge Graph Persistent Positions And Canvas Relationships

1. Create or open `Граф связей`.
2. Grab a node near the top of the canvas and move it slightly.
3. Expected result: the node stays under the cursor and does not drift upward by itself.
4. Drag any node to a new visible place, then press `↻` in the graph toolbar or reopen the graph page.
5. Expected result: the node keeps the new position and shows a small pinned dot.
6. Right-click the same node.
7. Expected result: the context menu offers `Сбросить позицию`.
8. Click `Сбросить позицию`.
9. Expected result: the graph returns that node to the automatic layout after refresh.
10. Right-click a source node and choose `Связать...`.
11. Pick a relationship type, then click another node on the canvas.
12. Expected result: the connection is saved and the graph can show it through the `Ручные связи` preset.
13. Use the `Вид` preset selector.
14. Expected result: `Стандартный вид` shows root plus two tree levels; `Все связи` switches to the broader graph slice.

## 2026-07-20: Knowledge Graph Canvas Usability Polish

1. Create or open `Граф связей`.
2. Expected result: the first screen is a large canvas workbench, without separate `Карта`, `Связи` or `Одинокие` tabs.
3. Expected result: the status line says `Стандартный вид` and shows pages from the root plus two levels down.
4. Expected result: nodes are not stacked on top of each other on first open.
5. Check the canvas background.
6. Expected result: there are no fixed background labels such as `Персонажи` or `Предметы`, and there is no separate node list under the canvas.
7. Drag a node toward the right edge of the canvas.
8. Expected result: the node moves, connected lines follow it, and the canvas world expands instead of stopping at a small hidden boundary.
9. Drag empty canvas space.
10. Expected result: the viewport pans without moving individual nodes.
11. Use `Стандарт`, `По типам`, `Центр`, zoom and `Центр` controls.
12. Expected result: controls are grouped cleanly and the graph remains readable.
13. Right-click a node.
14. Expected result: node actions are still available from the compact context menu.

## 2026-07-20: Knowledge Graph Filters And Node Drag

Superseded by `Knowledge Graph Canvas Usability Polish` above. Use the current canvas-first checklist there.

## 2026-07-20: Knowledge Graph Workbench Layout

Superseded by `Knowledge Graph Canvas Usability Polish` above. The current screen has no graph tabs and no bottom node list.

## 2026-07-20: Knowledge Graph Visual Canvas

Superseded by `Knowledge Graph Canvas Usability Polish` above. The current graph is a canvas workbench with context-menu actions.

## 2026-07-20: Simplified Block Creation Menu

1. Open or create a normal card.
2. Press `Add block`.
3. Expected result for cards that support properties: the first-level list is exactly `Text block`, `List block`, `Table`, `Image`, `Properties`.
4. Expected result for cards without a Properties schema: the first-level list is exactly `Text block`, `List block`, `Table`, `Image`.
5. Expected result: old specialized choices such as item/spell/skill blocks, character effects, character sheet, DnD stat blocks, task tracker and templates are not shown in this popup.
6. Create a `List block`, switch its mode to items/creatures/objects and save/reopen the card.
7. Expected result: the list stays a universal `list` block and keeps the selected mode.

## 2026-07-20: Readable Item Properties Defaults

1. Open or create an item card.
2. Add a `Properties` block.
3. Expected result: money fields, `Weight`, `Armor` and `Effect` show both the field name and the input immediately without manually resizing fields.
4. Add a new custom field from the Properties gear popup.
5. Expected result: the new field starts at a readable default width and height, not as a narrow or vertically clipped control.
6. Hover a short field such as `Weight` or a money field.
7. Expected result: the label/input pair is vertically balanced inside the field, and resize dots appear above the border instead of sinking into it.
8. Resize a long text field such as `Effect`/`Description` to a taller shape.
9. Expected result: the field name stays visible at the top, the editor grows into the remaining space, and text scrolls inside the field instead of pushing the title out.

## 2026-07-20: Properties To Map Character Snapshot

1. Open or create a character/creature card and add a `Properties` block.
2. Expected result: standard fields are readable immediately; labels should not require manual resizing.
3. Open or create an item card and add `Properties`.
4. Expected result: item armor settings appear as one `Armor` group with armor type, AC and DEX limit.
5. Open the Properties gear popup for the item and delete the `Armor` row.
6. Expected result: armor type, AC and DEX limit disappear together as one field group.
7. Re-add `Armor` from the same popup, mark the item as armor, then select it in the character/creature `Armor` field.
8. Place that character/creature on a campaign map.
9. Expected result: the token receives HP, AC, speed, initiative and active effect/status data from the character model.

## 2026-07-20: Armor Picker For Character Properties

1. Create or open two item cards.
2. On the first item, add/open `Properties` and set `Armor type` to light, medium, heavy armor or shield. Set a base AC value.
3. On the second item, keep `Armor type` empty or `None`.
4. Open a character or creature card with a `Properties` block.
5. Open the `Armor` field.
6. Expected result: only the item marked as armor appears as a selectable armor item. The ordinary item is not listed.
7. Select the armor item and set DEX.
8. Expected result: AC updates from the selected item's armor properties.
9. Change that item back to `None`/empty armor type, reopen the character Properties block, and check `Armor` again.
10. Expected result: the item is no longer offered as armor and should not affect AC.

## 2026-07-20: Visible DnD Character Calculations

1. Open a character or creature card and add/create a `Properties` block.
2. Set `Level` to `5`.
3. Expected result: `Proficiency` becomes `3`.
4. Set `DEX` to `16`.
5. Expected result: DEX shows modifier `+3`, and `Initiative` becomes `3` unless it was manually edited.
6. In the STR skill group, toggle `Athletics` through none, proficient and expertise.
7. Expected result: the value changes from ability modifier only, to modifier + proficiency, to modifier + double proficiency.
8. Type a manual value into `Initiative` or a skill result.
9. Expected result: the field is marked as manual and later ability/level changes do not overwrite it until the value is cleared.
10. Create an item with armor properties, select/reference it in `Armor`, set DEX and check AC.
11. Expected result: AC follows the DnD armor rule for light, medium, heavy armor or shield.

## 2026-07-20: Standard Character Properties Layout

1. Open a character or creature card.
2. Add or create a `Properties` block if the card does not have one.
3. Expected result: the first row is compact and readable: level, AC, speed, armor, current HP, max HP and temporary HP.
4. Expected result: STR, DEX, CON, INT, WIS and CHA are on one row and do not overlap.
5. Expected result: skill groups are wider blocks below the abilities; narrow skill groups show their skills in one column instead of squeezing text.
6. Save, switch pages and reopen the card.
7. Expected result: the layout persists. Existing cards that already had a saved custom layout should keep that custom layout.

## 2026-07-19: Properties Constructor Drag/Resize Polish

1. Open a character or item card with a `Свойства` block.
2. Drag a field by its border onto a place where another field already stands.
3. Expected result: the field follows the visible grid and the occupied field moves down; fields should not stack on top of each other.
4. Drag a field into an empty lower row.
5. Expected result: the empty gap is kept after save/reopen.
6. Resize a field from a side or corner.
7. Expected result: the input stays inside the field border, and nearby fields move only when their cells are actually occupied.

## 2026-07-19: Native Large Workspace Desktop Click-Through

1. Build the current desktop release:

```bash
npm run desktop:build
```

2. Run the measurable desktop smoke:

```bash
npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"
```

3. Run the native Tauri click-through:

```bash
npm run desktop:native-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"
```

4. Expected result: both commands pass and update `docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md` and `docs/01-delivery/DESKTOP_NATIVE_CLICKTHROUGH_CURRENT.md`.
5. Expected workspace summary: write probe OK, 690 pages, 25 maps, 141 assets, 527 asset references, 0 missing asset references.
6. Expected native summary: Settings diagnostics opens, tree search works, a heavy campaign map opens, presentation opens, and the native report has no resource issues.
7. Optional owner feel-check: open the release `.exe`, select `X:\ДНД\Мастер\По кампаниям\База`, open Settings diagnostics, search/open a heavy map and presentation, then check music/audio output manually.

## 2026-07-19: Real Large Workspace Desktop Matrix

1. Run the measurable desktop smoke:

```bash
npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"
```

2. Expected result: the command passes and updates `docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md`.
3. Expected workspace summary: write probe OK, 690 pages, 25 maps, 141 assets, 0 missing asset references.
4. If using the older path `X:\ДНД\Мастер\База`, expected result: diagnostics should explain that the path was not found.
5. Native desktop UI is covered by `npm run desktop:native-smoke`; manual owner testing is still useful for subjective smoothness and audio.

## 2026-07-19: Workspace Access Diagnostics Matrix

1. Open a workspace in desktop or browser.
2. Open workspace diagnostics from the app topbar/settings diagnostics area.
3. Expected result: the diagnostics status includes `Location`, `Access matrix`, and `Write probe`.
4. In desktop, run:

```bash
node tools/run_workspace_diagnostics.mjs --workspace "X:\ДНД\Мастер\По кампаниям\База" --json false
```

5. Expected result: the report states whether the workspace is inside HOME/default disk, another disk, network folder, possible external drive, outside HOME, and whether write access is OK.
6. If testing a read-only folder, expected result: write access is reported as unavailable instead of silently passing.

## 2026-07-19: Write Revision Protection

1. Open any normal card.
2. Type in the editor.
3. Expected result: the statusbar changes to `Changed`, then `Saving...`, then `Saved`.
4. Make several quick edits in a row.
5. Expected result: the final text remains after reload; an older save should not bring back earlier text.
6. Open a campaign map or task tracker, make a small change, and wait for save.
7. Expected result: the same save states appear and the page still reloads with the latest change.

## 2026-07-19: PageIndex Search Lifecycle

1. Open a workspace with nested pages.
2. Click the sidebar search field without typing.
3. Expected result: a compact panel shows recent and recently edited pages if such pages exist.
4. Open two different pages, focus search again, and verify the recent list updates.
5. Type a title, alias, tag, or body word in search.
6. Expected result: matching pages appear as a ranked flat list, and each result shows its path under the title.
7. Clear the search field.
8. Expected result: the normal tree returns.

## 2026-07-16: Campaign Map Regression Gate

1. Open or create a campaign map with at least one creature token, fog, one locked fog zone, one drawing, and normal/battle playlists.
2. Set initiative participants and give one token a visible HP value/source binding.
3. Save, switch to another page, then reopen the map.
4. Expected result: token data, fog image/mode, locked fog zones, layer visibility, drawing style, playlists and initiative order are still present.
5. Open presentation mode and make a small token/fog/layer change.
6. Expected result: presentation still follows the map without losing fog/layer ordering.

## 2026-07-16: Campaign Map Initiative UX

1. Open a campaign map with at least two living creature tokens and one creature token with `hp = 0`.
2. Open initiative: living creatures should be selected by default, and the dead token should not be listed.
3. Type manual initiative totals and press `Начать бой`: the popup should switch to `Ходы`.
4. Edit a value in the turn window and press `Сохранить порядок`: the order should sort by the edited total.
5. Use previous/next: the active row and token highlight should move without losing edited values.
6. Close and reopen initiative: it should open directly to `Ходы`, not the participant picker.

## 2026-07-15: Campaign Map Music Stabilization

1. Open a campaign map and the map music popup.
2. Select 1-2 audio files and press `Добавить`: tracks should appear in the active playlist without a second "added files" list.
3. Click a track row or `play`: playback should start or show a clear status/error without breaking the map.
4. Check `stop`, `previous`, `next`, `loop`, and `shuffle/order`.
5. Switch `Обычная / Бой`: the active playlist should change, stale music should stop, and a non-empty new playlist should attempt to start its first track.
6. Copy a playlist from another map, open another page, then return: playlist titles and tracks should persist.

## 2026-07-15: Map Layers Completion

1. Open a campaign map with tokens, shapes, drawings, fog and at least one locked fog zone.
2. Open `Слои`.
3. Expected result: the list includes `Объекты`, `Существа`, `Фигуры`, `Рисование`, `Туман` and `Запретные зоны тумана`.
4. Toggle `Фигуры` or `Рисование` off.
5. Expected result: only that layer disappears; tokens and fog remain.
6. Toggle `Запретные зоны тумана` off.
7. Expected result: locked fog zones disappear from the GM editor but are not deleted.
8. Open presentation mode and toggle fog/locked-fog visibility.
9. Expected result: presentation updates with the same fog layer visibility and locked zones render as normal fog.

## 2026-07-15: Drawing Tools Stabilization

1. Open a campaign map and use Drawing.
2. Draw with Pencil, change color, then save/reopen the map.
3. Expected result: the drawing keeps its color.
4. Use Pen from the end of an existing line.
5. Expected result: the line continues as one vector.
6. Use Pen far away from the previous line.
7. Expected result: a separate vector is created.
8. Use Fill on a pencil shape and on an empty part of the map.
9. Expected result: fill is visible, and drawing items belong to the `Рисование` layer.

## 2026-07-15: Presentation Mode Stabilization

1. Open a campaign map with fog and at least one locked fog zone.
2. Open presentation mode.
3. Move or resize the locked fog zone in the GM map.
4. Expected result: the presentation updates the locked fog zone as normal fog without needing to close/reopen presentation.
5. Open presentation in a fresh window.
6. Expected result: before the first map appears, the window shows `Ожидание карты...` rather than a blank black screen.

## 2026-07-15: Desktop Release Gate

1. Before building or sending an installer, run `npm run desktop:gate`.
2. Open `docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md`.
3. Expected result: all required steps are `passed`.
4. If testing a large GM workspace, run `npm run desktop:gate -- --workspace "<workspace path>"`.
5. Expected result for large-workspace handoff: the large workspace desktop smoke is not skipped.
6. Do not hand off an installer if the gate report says `FAILED`.

## 2026-07-15: Desktop Large Workspace Smoke

1. Make sure the large workspace disk/folder is available.
2. Run `npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"`.
3. Open the generated report: `docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md`.
4. Start the desktop app and follow the manual checklist in `docs/01-delivery/DESKTOP_LARGE_WORKSPACE_SMOKE.md`.
5. Use a copied workspace for create/move/delete checks.
6. Expected result: automated checks pass, desktop diagnostics explain the workspace state, and no tree/map/backup action feels frozen.

## 2026-07-15: Desktop Workspace Diagnostics

1. Open MyOwnWorld desktop build.
2. Select a workspace.
3. Open app settings with the top-right gear button.
4. In `Диагностика workspace`, click `Обновить диагностику`.
5. Expected result: the first diagnostics section shows runtime mode, workspace path, write access, schema status, checkpoint status, backup folder and last operation.
6. Expected result: the summary cards include pages, maps, assets, broken refs, orphan refs, schema issues, backup count, incomplete backup count and pending operations.
7. If the workspace cannot write, has pending operations, incomplete backup folders or a failed checkpoint, the warning section should say that directly.

## 2026-07-15: Desktop Install And Update Flow

1. Build or receive `src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe`.
2. Install it as the normal desktop app.
3. Open MyOwnWorld and select a copied test workspace.
4. Check that the tree, one card, one map, images, presentation mode, music if present, and manual backup work.
5. To test update, close the app, make a manual backup or copy the workspace folder, install the new installer over the old build, then reopen the same workspace.
6. Expected result: the app updates without moving or deleting the workspace.
7. If the build is bad, reinstall the previous known-good installer. Restore the workspace backup only if the test changed workspace data.

## 2026-07-19: Faster Tree Delete Trash

1. Open a large workspace, preferably a copy of `X:\ДНД\Мастер\По кампаниям\База`.
2. Delete a small page or small branch through the tree context menu.
3. Expected result: the tree updates without a long full-workspace backup pause.
4. Open `.my-own-world-trash/page-deletes/` and inspect the newest delete manifest.
5. Expected result: `manifest.json` lists only the deleted page/branch pages, not unrelated workspace pages.
6. Manual full backup from settings should still create a full backup when explicitly requested.

## 2026-07-14: Проверка Виртуального Дерева

1. Открыть большой workspace, желательно `X:\ДНД\Мастер\По кампаниям\База` или другой мир с сотнями страниц.
2. Прокрутить дерево далеко вниз и вверх: список должен двигаться плавно, без долгих зависаний и без визуального размножения строк.
3. Открыть карточку глубоко в дереве и нажать `Найти в дереве`: дерево должно прокрутиться к карточке и подсветить ее.
4. Свернуть и раскрыть крупную папку: состояние ветки должно сохраниться, а дерево не должно перерисовываться с заметной паузой.
5. Проверить контекстное меню и drag-and-drop на видимых строках дерева: действия должны работать так же, как до виртуализации.
6. Для маленького workspace убедиться, что дерево выглядит и ведет себя как раньше.

## 2026-07-14: Проверка Производительности Дерева

1. Открыть большой workspace, желательно `X:\ДНД\Мастер\По кампаниям\База` или другой мир с большим деревом.
2. Перетащить карточку на том же уровне, где есть много соседних карточек. Операция должна завершиться без ощущения “приложение умерло”; после reload порядок должен сохраниться.
3. Перетащить карточку внутрь другой папки. Карточка должна оказаться дочерней, backup должен создаться один раз на пользовательский drop.
4. Удалить небольшую вложенную ветку через контекстное меню дерева. Удаление должно завершиться, дерево должно обновиться, а открытая удаленная карточка должна закрыться/перейти на fallback.
5. Во время переноса и удаления смотреть на нижний statusbar: должны появляться сообщения вида `Перенос: страницы 1/3`, `Удаление: страницы 20/80` или `Backup: страницы 120/500`, чтобы было понятно, что приложение работает.
6. Открыть настройки backup, нажать ручное создание backup, затем restore dialog и cleanup старых backup. Во время операций statusbar должен показывать этап и счетчик.
7. После переносов и удаления открыть настройки backup и убедиться, что один пользовательский перенос не создал пачку почти одинаковых risky backup подряд.
8. В настройках backup нажать `Проверить недособранные`: если недособранных backup нет, должен появиться понятный пустой статус. Если есть папки без `manifest.json`, должен появиться список с id, количеством файлов и размером.
9. Нажать `Удалить найденные`: приложение должно запросить подтверждение. После подтверждения удаляются только недособранные backup, валидные backup с `manifest.json` остаются.

## 2026-07-11: Проверка Порядка Документации

1. Открыть `docs/README.md`: это карта актуальной документации проекта.
2. Проверить, что рабочие инструкции для тестирования лежат в `docs/04-user-release/`, а инженерные smoke/regression сценарии — в `docs/03-testing/`.
3. Открыть `docs/archive/README.md`: архив должен объяснять, почему документ перенесен и что читать вместо него.
4. Запустить `npm run docs:index`.
5. Запустить `npm run check:encoding`.
6. Запустить `node tools/audit_project_files.mjs` и убедиться, что в отчете `Delete candidates: 0` и `Mojibake candidates: 0`.

## 2026-07-10: Проверка Knowledge Graph

Superseded by `Knowledge Graph Canvas Usability Polish` above. The old domain cards and graph tabs are no longer part of the current first-screen flow.

## 2026-06-30: Проверка desktop audio playback

1. Запустить свежий desktop build: `src-tauri\target\release\my-own-world.exe` или установить свежий `src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe`.
2. Открыть workspace, карту и popup музыки карты.
3. Добавить mp3/ogg/wav трек в плейлист и нажать на строку трека или кнопку play.
4. Ошибка `Failed to load because no supported source was found` не должна появляться; если файл сам по себе неподдерживаемый, проверить тот же файл в системном плеере.

## 2026-06-30: Проверка AIMP-like плейлиста карты

1. Открыть карту и popup музыки карты.
2. Проверить, что сверху виден компактный mini-player: текущий трек или пустое состояние, ниже кнопки play/stop/previous/next/shuffle/loop и переключатель normal/battle.
3. Выбрать 1-2 audio-файла и нажать `Добавить`: треки должны появиться в основном списке плейлиста без отдельного списка под import flow.
4. Кликнуть по строке трека: трек должен запуститься, строка должна подсветиться, а mini-player должен показать название текущего трека.
5. Переключить normal/battle: активный плейлист должен смениться и попытаться запустить первый трек выбранного режима.
6. Проверить stop, play, previous, next, loop/shuffle/order и copy playlist from other map.

## 2026-06-23: Проверка recovery screen repair-actions

1. Открыть workspace с критичной ошибкой схемы или запустить browser smoke `schema-recovery`.
2. Проверить, что экран диагностики показывает код ошибки и описание.
3. Проверить, что под ошибкой есть блок repair-action: безопасное действие после backup или пометка ручной правки.
4. Убедиться, что действие не применяет изменения автоматически без отдельной команды пользователя.

## 2026-06-23: Проверка музыки при переключении карт

1. Подготовить две карты с разными треками в активных плейлистах.
2. Открыть первую карту: должна запуститься первая песня ее активного плейлиста.
3. Переключиться на вторую карту: музыка первой карты должна остановиться, а вторая карта должна запустить первый трек своего активного плейлиста.
4. Проверить карту без песен: она должна открыться без ошибки и без зависания.

## 2026-06-19: Проверка polish музыкального popup карты

1. Открыть карту, открыть popup музыки.
2. Проверить, что под блоком добавления нет отдельного списка найденных песен: список должен быть только в секции `Плейлист`.
3. Выбрать 1-2 audio-файла: под выбором должна появиться короткая строка `Выбрано файлов: N`.
4. Нажать `Добавить`: песни должны появиться в активном плейлисте.
5. Нажать play/stop/previous/next: кнопки должны быть ровными, а popup должен показать статус воспроизведения или понятную ошибку.

## 2026-06-19: Проверка музыки карты

1. Открыть карту кампании.
2. Нажать кнопку с иконкой музыки в панели карты.
3. Если в workspace нет музыки, выбрать 1-2 audio-файла через popup: выбранные имена должны появиться под выбором файлов.
4. Нажать `Добавить`: файлы должны попасть в `assets/music` и появиться в активном плейлисте.
5. Добавить песню в обычный плейлист, переименовать плейлист и нажать play: должна запускаться выбранная музыка.
6. Переключиться на `Бой`: активный плейлист должен смениться и сразу попытаться запустить первую песню боевого плейлиста.
7. Добавить песню в боевой плейлист, проверить кнопки случайного порядка, loop, stop, play, previous и next.
8. Создать или открыть вторую карту с плейлистом, затем на первой карте скопировать плейлист из другой карты: треки и название должны перенестись в активный плейлист.
9. Сохранить карту, открыть другую страницу и вернуться: оба плейлиста, их названия, порядок и loop должны восстановиться.
10. Открыть `Проверка ассетов`: audio из плейлистов карты не должен считаться orphan, если на него есть ссылка из карты.

## 2026-06-18: Проверка Campaign Map v2 Hardening - инициатива, рисование, навыки

1. Открыть карту с несколькими токенами и фигурами.
2. Нажать `Инициатива`, выбрать участников, вручную ввести значение или нажать roll, затем применить: должно открыться отдельное окно ходов.
3. Проверить next/previous в окне ходов: активный участник должен меняться без потери введенных значений.
4. Открыть popup `Рисование`: выбрать карандаш, перо, ластик, заливку, цвет и последние цвета. Новые фигуры должны появляться на карте и сохраняться после открытия.
5. Проверить `Заливку`: она должна работать для shape-областей и быть заметной даже без фонового изображения.
6. Открыть режим презентации и проверить, что токены/фигуры видны так же, как на карте ведущего.
7. Проверить Shift-выделение нескольких токенов/фигур и перенос всей выбранной группы: объекты должны двигаться вместе и оставаться выделенными.
8. Открыть контекстное меню токена, выбрать действие в разделе `Навык / действие`. В списке должны быть навыки из `CharacterModel`; результат отображается на карте через подпись/эффект.

## 2026-06-18: Проверка Campaign Map v2 Hardening

1. Открыть карту с несколькими токенами и фигурами.
2. Включить режим выделения через Shift и протянуть рамку вокруг нескольких объектов: выбранные токены и фигуры должны получить визуальное выделение.
3. Потянуть один выбранный токен: вся выделенная группа должна двигаться вместе.
4. Добавить locked fog zone, затем перетащить ее и изменить размер за resize-точку: зона должна оставаться на новом месте и не пропадать.
5. Попробовать рисовать или стирать туман кистью поверх locked fog zone: защищенная область не должна меняться.
6. Двойной клик по locked fog zone должен удалить ее.
7. Нажать очистку тумана: туман должен очиститься без ошибок и без зависания карты.

## 2026-06-16: Проверка Asset Lifecycle UI и Media Foundation

1. Открыть workspace с папкой `assets/`, где есть хотя бы один используемый файл и один лишний файл без ссылок из карточек/карт.
2. Нажать кнопку настроек в верхней панели приложения.
3. В разделе `Проверка ассетов` нажать `Проверить assets`.
4. Проверить, что broken references и orphan files показаны отдельными списками.
5. У orphan-файла нажать `Удалить`: должен появиться confirm-блок, а файл не должен удалиться без подтверждения.
6. Нажать подтверждение удаления: перед удалением должен создаться backup workspace, orphan должен исчезнуть из списка.
7. Открыть карточку или карту со ссылкой на отсутствующую картинку: вместо пустого места должен появиться заметный placeholder `Asset missing`.
8. Создать или открыть карточку типа `Локация`, добавить/открыть блок `Свойства`: должны быть поля `Музыка: audio asset`, `Музыка: playlist asset` и `Громкость музыки`.

## 2026-06-16: Проверка broken assets

1. Открыть workspace, где есть карточки или карты с изображениями.
2. Нажать кнопку настроек в верхней панели приложения.
3. В разделе `Проверка ассетов` нажать `Проверить файлы`.
4. Если все файлы на месте, должна появиться зеленая сводка с количеством файлов в `assets/`.
5. Если ссылка сломана, должен появиться список потерянных путей. Проверка не должна удалять файлы или менять карточки.

## 2026-06-15: Проверка стандартной раскладки `Свойств`

1. Создать новую карточку типа `Персонаж` или `Существо`.
2. Добавить или открыть блок `Свойства`.
3. Проверить верхнюю строку: `Уровень` и `КЗ` маленькие, `Хиты`, `Макс хиты`, `Временные хиты` стоят рядом, `Хиты от смерти: успехи/провалы` находятся справа.
4. Проверить вторую строку: `Скорость` стоит слева, `Доспех` находится рядом и остается выпадающим списком предметов.
5. Проверить строку характеристик: `СИЛ`, `ЛОВ`, `ИНТ`, `МДР`, `ТЛС`, `ХАР` стоят на одной линии и занимают по две колонки.
6. Проверить навыки: каждая группа навыков находится под своей характеристикой; узкие группы должны быть вертикальными и не налезать друг на друга.

## 2026-06-15: Проверка UX-hotfix блока `Свойств`

1. Открыть карточку типа `Персонаж` или `Существо` с блоком `Свойства`.
2. Проверить стартовый набор: `Состояния` и `Эффекты` не должны появляться сразу, но через шестеренку блока их можно добавить вручную.
3. Навести курсор на границу любого поля и перетащить его в свободное место: поле должно идти под курсором без заметного отставания, а resize-точки не должны запускать drag.
4. Потянуть поле за resize-точки и за стороны: рамка, input/select/textarea и подпись должны оставаться внутри поля без вылезания за границы.
5. Открыть шестеренку блока: в списке должны быть видны названия всех полей.
6. В поле `Доспех` открыть список: в нем должны быть предметы из workspace и вариант `Без доспеха`.
7. В группе навыков нажать индикатор владения у навыка несколько раз: состояние должно идти `пусто` -> `+` -> `++` -> `пусто`; `++` означает экспертность и дает двойной бонус мастерства.
8. Сузить поле группы навыков: список должен перестроиться в одну колонку без обрезания текста.

## 2026-06-15: Проверка свободной сетки `Свойств`

1. Открыть карточку типа `Персонаж` или `Существо` и добавить/найти блок `Свойства`.
2. Проверить стартовую раскладку: `Уровень`, `КЗ`, `Скорость` и временные HP компактные; HP находятся отдельной строкой; `СИЛ`, `ЛОВ`, `ТЛС`, `ИНТ`, `МДР`, `ХАР` стоят на одной строке.
3. Перетащить любое поле за grip-иконку в пустую нижнюю область блока: поле должно остаться именно там, а пустые клетки выше не должны схлопнуться.
4. Перетащить поле прямо на занятое место: поле под ним должно сдвинуться вниз, наложения быть не должно.
5. Сохранить карточку, открыть другую карточку и вернуться обратно: новое положение поля и пустой разрыв должны сохраниться.
6. Добавить пользовательский параметр через шестеренку `Свойств`: новое поле должно появиться в ближайшем свободном месте, с grip-иконкой и resize-точками.
7. Потянуть поле за левую/верхнюю/правую/нижнюю сторону: должна меняться выбранная сторона, без прыжков соседних полей и без перестановки порядка.

## 2026-06-15: Проверка DnD-организации `Листа персонажа`

1. Открыть карточку типа `Персонаж` или `Существо`.
2. Убедиться, что в карточке есть блок `Свойства` и блок `Лист персонажа`; если листа нет, добавить его через `Добавить блок`.
3. Проверить верх листа: должны быть видны имя, уровень, бонус мастерства, `Класс защиты`, хиты, временные хиты, максимум HP, кость хитов и death saves.
4. Проверить строку выживания: `Инициатива`, `Скорость`, `П. восприятие`, `Состояния`.
5. Проверить характеристики: `Сила`, `Ловкость`, `Телосложение`, `Интеллект`, `Мудрость`, `Харизма` должны быть отдельными карточками с модификатором, значением и списком спасбросков/навыков.
6. В блоке `Свойства` изменить `ЛОВ` или `СИЛ`, дождаться сохранения и переоткрыть карточку: лист должен показать новые модификаторы и связанные навыки.
7. В листе изменить `Класс защиты`, `Скорость`, HP или уровень: значение должно записаться обратно в блок `Свойства`.
8. Если поле навыка в `Свойствах` пустое, лист должен показывать fallback от модификатора характеристики, а не `0`.

## 2026-06-15: Проверка internal rules workspace

1. Открыть карточку с блоком `Свойства`.
2. Нажать шестеренку блока и открыть раздел `Правила`.
3. Проверить, что в metadata указаны `workspace: internal`, `owner: admin`, `source: programFile` или fallback seed при ошибке файла.
4. Ввести в поиск `КЗ`: список должен отфильтроваться и оставить правило `Класс доспеха`.
5. Нажать правило `Класс доспеха`: редактор должен открыть read-only страницу внутреннего правила, не добавляя ее в дерево мира.
6. В обычном текстовом блоке написать `[[КЗ]]`: wiki-link должен находить внутреннее правило, если обычной карточки `КЗ` нет.

## 2026-06-15: Проверка редизайна `Archive Hearth`

1. Открыть приложение в браузере или desktop-сборке и проверить, что sidebar, editor, карточки, popup и statusbar выглядят как единая теплая темная система.
2. Навести курсор на кнопки sidebar, toolbar, popup, tree actions и controls блоков: hover должен быть мягким, без синего системного акцента.
3. Нажать несколько кнопок: должно быть короткое ощущение нажатия, без сдвига layout и без дрожания текста.
4. Открыть popup создания, popup цвета, popup `Свойств`, wiki preview и меню `+`: popup должен появляться мягко, помещаться в экран и визуально совпадать с остальным интерфейсом.
5. Перетащить блок или поле `Свойств`: placeholder должен быть теплым желтым, плавным и без тряски.
6. Открыть карту и проверить controls, popup тумана/сетки/инициативы и DnD: stage карты не должен получить тяжелую анимацию или дополнительный лаг.
7. Проверить опасные действия: удалить/закрыть должны использовать ruby-красный акцент, а не синий или кислотный цвет.
8. Проверить, что текст в кнопках, popup и карточках не обрезается и не вылезает за контейнер.

## 2026-06-14: Проверка редактируемого `Листа персонажа`

1. Открыть карточку типа `Персонаж` или `Существо`.
2. Добавить блок `Лист персонажа`.
3. Изменить КЗ, скорость или инициативу: поле должно подсветиться как ручное, а рядом должна появиться кнопка сброса.
4. Нажать кнопку сброса ручного значения: поле должно вернуться к авторасчету.
5. В `Хиты от смерти` отметить успех или провал, сохранить и открыть карточку заново: отмеченное значение должно восстановиться через блок `Свойства`.
6. Открыть или добавить блок `Свойства` на карточке `Персонаж` или `Существо` и проверить, что есть группы `Навыки СИЛ`, `Навыки ЛОВ`, `Навыки ТЛС`, `Навыки ИНТ`, `Навыки МДР`, `Навыки ХАР`.
7. Изменить СИЛ на `18`: `Атлетика` должна стать `4`. Включить checkbox владения у `Атлетика`: значение должно увеличиться на бонус мастерства. Вручную вписать другое число: строка должна подсветиться как ручная и не перезаписываться, пока поле не очищено.
8. Создать или открыть предмет, добавить ему `Свойства`, выставить `Тип доспеха = Легкий`, `Базовая КЗ доспеха = 12`. В карточке персонажа указать этот предмет в поле `Доспех` и ЛОВ `16`: КЗ должна стать `15`.
9. Открыть `Добавить блок` в карточке персонажа: в списке не должно быть старых вариантов `Статистика персонажа` и `Стат. блок DnD`; новые параметры нужно добавлять через `Свойства`.
10. Открыть шестеренку блока `Свойства`, нажать `Правила`: должно раскрыться дерево внутреннего справочника с разделами `DND 5e`, `Класс доспеха`, `Хиты`.
11. В текстовом блоке написать `[[КЗ]]`: ссылка должна стать существующей, даже если карточки `КЗ` нет в дереве мира. При открытии ссылка должна показать read-only справку `Класс доспеха`.

## 2026-06-13: Проверка model-first layout `Свойств`

1. Открыть карточку с блоком `Свойства`.
2. Перетащить несколько полей и изменить размер хотя бы одного поля за resize-точки.
3. Дождаться сохранения, перейти на другую карточку и вернуться обратно.
4. Проверить, что порядок и размер полей остались такими же.
5. Добавить пользовательский параметр через шестеренку и повторить resize/drag: новое поле тоже должно сохранить положение и размер.

## 2026-06-12: Проверка плавного DnD `Свойств`

1. Открыть карточку с блоком `Свойства`.
2. Взять поле за grip-иконку и двигать по сетке, включая пустые области блока.
3. Во время переноса должно быть видно поле-призрак под курсором и placeholder будущей позиции.
4. Соседние поля должны мягко раздвигаться без мигания, дрожания и резких перескоков.
5. После отпускания мыши поле должно встать в выбранную позицию, а ghost/placeholder должны исчезнуть.

## 2026-06-11: Проверка layout-сетки `Свойств`

1. Открыть карточку с блоком `Свойства`, нажать шестеренку и убедиться, что в popup нет отдельной кнопки размера.
2. Кликнуть в input или textarea внутри поля `Свойств`: фокус должен остаться в поле, grip/resize не должны перехватывать ввод.
3. Перетащить поле за встроенную grip-иконку в пустую область сетки блока: поле должно переехать туда с видимым placeholder.
4. Потянуть поле за левую или верхнюю resize-точку: должна двигаться именно выбранная сторона поля, без ощущения что меняется только правая/нижняя граница.

Текущая папка `release/latest/` подготовлена как место для будущей передачи сборок.

Перед тестом сверяйтесь с:

- `docs/04-user-release/README_FOR_TESTERS.md`;
- `docs/04-user-release/TEST_SCENARIOS.md`;
- `docs/04-user-release/KNOWN_ISSUES.md`.

Для проверки структуры проекта дополнительно:

1. Запустить `npm run docs:index`.
2. Запустить `npm run agents:validate`.
3. Убедиться, что новые markdown-документы не добавлены прямо в корень `docs/`.

Для проверки CharacterModel foundation:

0. Открыть `+` в строке `Корень` дерева и проверить, что первый уровень меню не показывает быстрые пункты `Задача` и `По шаблону`. В меню должны остаться основные сущности создания.
1. Создать карточку типа `Персонаж` или `Существо`.
2. Добавить блок `Свойства`.
3. Проверить, что в свойствах есть HP и характеристики.
3.1. Нажать шестеренку в блоке `Свойства`: должен открыться мягкий popup настроек со списком текущих параметров и кнопкой `Добавить параметр`.
3.2. Нажать `Добавить параметр`, ввести название `Радиус`, выбрать тип `Число` и нажать `Создать`. В блоке `Свойства` должно появиться новое поле.
3.3. Ввести значение `15`, дождаться сохранения, открыть другую карточку и вернуться обратно: пользовательское поле и значение должны остаться.
3.4. Снова открыть шестеренку и удалить пользовательский параметр: поле должно исчезнуть из блока.
3.5. Открыть любой popup кнопкой и потянуть его за свободное место: popup должен перемещаться, но не уходить за границы экрана. При попытке тянуть за кнопку, input или select внутри popup обычное действие элемента не должно ломаться.
4. Добавить такое существо на карту и проверить, что старые сценарии изменения хитов не сломались.
5. У карточки существа выставить `ЛОВ` / `dex` = 16, добавить существо на карту и открыть `Инициатива`.
6. Проверить, что у существа в инициативе применяется модификатор `+3`.
6.1. Для этой версии расчетный backend не добавляет новый видимый UI, но старые проверки инициативы, КЗ, скорости и HP должны работать как раньше. Если эти числа изменились без ручного изменения карточки, это баг.
6.2. Добавить блок `Лист персонажа`, изменить в нем уровень, КЗ, скорость или HP. После сохранения открыть карточку заново: значение должно остаться в блоке `Свойства`, а лист должен показать то же число.
6.3. Если на карточке персонажа не было блока `Свойства`, изменение значения в `Листе персонажа` должно создать блок `Свойства` автоматически.
6.4. Открыть `Добавить блок`: в первом уровне должны быть только `Текстовый блок`, `Блок списка`, `Таблица`, `Картинка`, `Свойства` для карточек с поддержкой `Свойств`; у карточек без схемы `Свойства` этот пункт не показывается.
6.5. Создать `Блок списка`, переключить тип списка на `Существа` или `Объекты`, добавить элемент и проверить, что после сохранения выбранный тип списка не сбросился.
6.6. В блоке `Свойства` перетащить поле за маленькую grip-иконку внутри поля. Поле должно поменять порядок без тряски и без открытия popup; во время переноса должен быть виден placeholder будущей позиции.
6.7. Навести курсор на поле `Свойств`: должны появиться мягкая граница и маленькие resize-точки по сторонам/углам.
6.7.1. Потянуть поле за правую/левую сторону: ширина должна меняться по нескольким шагам, а не только между двумя состояниями.
6.7.2. Потянуть поле за верхнюю/нижнюю сторону или угол: высота должна меняться по шагам.
6.8. Открыть шестеренку `Свойств`, удалить стандартное поле, например `Уровень`: оно должно исчезнуть только из текущего блока.
6.9. В добавлении параметра выбрать готовый параметр, например `Инициатива`: название и тип должны подставиться автоматически.
6.10. Создать новый параметр и сразу проверить, что у него появились grip-иконка и resize-точки без переоткрытия карточки.
6.11. Проверить, что на пользовательских параметрах больше нет метки `свой`, а блок визуально похож на обычные блоки редактора.
7. Создать `Блок списка`, выбрать режим `Предметы`, положить туда предмет с количеством больше 1 и проверить, что карточка сохраняется и открывается без потери количества.

8. Для legacy-карточек, где уже есть блок `Состояния и эффекты`, проверить сохранение и повторное открытие: выбранные состояния и эффекты должны восстановиться. Новый первый уровень `Добавить блок` этот специализированный блок больше не предлагает.
9. Если legacy-блок эффектов уже есть у существа, добавить это существо на карту, открыть `Иниц.` и проверить, что бонус инициативы из блока эффектов прибавляется к модификатору ЛОВ. На токене должен появиться маленький индикатор количества состояний.
10. Для новых карточек использовать `Свойства`, `Блок списка` и Rule Tree-путь вместо создания отдельного блока эффектов из первого уровня popup.
11. Если карточка уже содержит `Лист персонажа`, проверить, что он показывает HP, КЗ, скорость, инициативу, характеристики, инвентарь и эффекты. Новые проверки основного сценария должны идти через `Свойства`.
12. Создать сущность `Правила` через главный `+`; если открыт пустой стартовый экран, проверить создание и через кнопку `Правила` на этом экране.
13. Создать или найти legacy-карточку с тегом `rule` и уже существующим блоком `Эффекты и состояния`.
14. Открыть `Правила`, импортировать legacy rule-карточку, включить checkbox активности и сохранить.
15. Проверить, что после повторного открытия Rule Tree список правил и активный checkbox восстановились.
16. В Rule Tree добавить новую группу и проверить, что она остается после сохранения.
17. Если у карточки персонажа или существа уже есть legacy-блок `Эффекты и состояния`, открыть его, выбрать правило из Rule Tree и нажать `Добавить правило`.
18. Сохранить и открыть карточку заново: выбранное правило должно остаться в списке `Правила`, а расчетные эффекты должны попасть в `Лист персонажа`.
19. В Rule Tree у импортированного правила изменить категорию, добавить условие `level` и убедиться, что после сохранения условие остается в списке.
20. Нажать `Обновить JSON`, затем `Импортировать JSON` с валидным пакетом: правила из пакета должны появиться в Rule Tree и получить источник `rulePackage`.
21. Включить checkbox активности правила и проверить, что в блоке предпросмотра активных эффектов появляется эффект этого правила.
22. Создать правило с условием `level >= 3`, добавить его персонажу 1 уровня и убедиться, что эффект не применяется в `Листе персонажа`.
23. Повысить уровень персонажа до 3 или выше и проверить, что эффект правила начинает применяться.
24. Проверить, что после открытия workspace существует папка `rule-packages`; package-файлы должны иметь расширение `.rule-package.json`.
25. В Rule Tree нажать `Сохранить файл`, затем `Обновить список`: сохраненный package-файл должен появиться в списке.
26. Выбрать package-файл и нажать `Импорт файла`: новые правила должны появиться в Rule Tree, а конфликтующие rule id должны показать статус `Конфликт id` и не перезаписать существующее правило.
27. Проверить панель `Диагностика правил`: при отсутствующем наследуемом rule id должно появиться предупреждение, а для нормальных правил должны отображаться условия и количество эффектов.

Для проверки Design System foundation:

1. Запустить приложение и убедиться, что резкого изменения визуала не произошло.
2. Проверить основные поверхности: sidebar, editor, popup создания, карту и task tracker.
3. Убедиться, что popup и toolbar не получили новых синих focus/hover состояний.

## 2026-06-23 - Data Recovery And Storage Hardening Checks

1. Open a normal workspace in browser and desktop; pages and tree expansion state should load normally.
2. Trigger backup list in the topbar; it should be available only when a workspace is selected.
3. Run schema recovery browser smoke; safe repair action must apply only with a backup manifest.
4. In desktop, invalid workspace file paths should surface structured errors with stable codes in logs/devtools.

## 2026-07-06: Проверка Backup Retention

1. Открыть Settings через верхнюю кнопку шестеренки.
2. В блоке backup изменить лимит хранения, нажать `Применить` и закрыть/открыть Settings снова: значение должно сохраниться.
3. Создать несколько backup и нажать `Очистить старые`: старые точки удаляются только сверх указанного лимита.
4. Проверить перенос/удаление страницы в дереве: перед операцией должна создаваться точка в `.my-own-world-backups/`.

## 2026-07-06: Проверка Dark Fantasy Appearance Panel

1. Откройте приложение.
2. Нажмите кнопку настроек в верхней панели.
3. Убедитесь, что сверху popup есть блок `Оформление`.
4. Переключите accent color, фон и размер интерфейса.
5. Проверьте, что shell/sidebar/editor визуально остаются читаемыми, popup не ломается, backup panel ниже продолжает работать.

## 2026-07-07: Проверка `Графа связей`

Superseded by `Knowledge Graph Canvas Usability Polish` above. Create/open still matters, but the current verification is canvas-first and has no `Связи` / `Одинокие страницы` tabs.

## 2026-07-07: Проверка ручных связей в `Графе связей`

Superseded by `Knowledge Graph Canvas Usability Polish` above. Manual relationship creation is now planned as `0.0.1.5.4.1` through canvas/context-menu tools, not the old tab form.

## 2026-07-07 - World Package Foundation

Manual UI testing is not required yet because World Package export/import UI is not exposed. Verification for this layer is automated:

- `node --test tests/worldPackage.test.mjs`
- `npm run verify`
- `npm run test:browser`

Expected result: all checks pass. Future tester instructions will add click-by-click export/import scenarios when the UI is introduced.
