# Release Notes

## 2026-07-20: Knowledge Graph Canvas Undo/Redo

- The Knowledge Graph canvas toolbar now has visible Back/Forward history controls for graph edits.
- Ctrl+Z and Ctrl+Y/Ctrl+Shift+Z work for graph canvas history when focus is not inside a text or select field.
- Undo/redo covers node moves, saved position reset and manual relationship creation from canvas connection mode.
- The history changes the same persisted graph view-state and page relationship data that refresh/reopen already use.
- Existing follow-up: editing/deleting an existing relationship is still planned in `0.0.1.5.4.3`.

## 2026-07-20: Knowledge Graph Persistent Positions And Canvas Relationships

- Fixed a graph drag bug where a grabbed node near the top of the canvas could drift upward while the infinite canvas expanded.
- Dragged Knowledge Graph nodes now save their manual position in the graph page and keep it after refresh/reopen.
- Right-clicking a graph node now offers `Закрепить здесь`, `Сбросить позицию` and `Связать...`.
- `Связать...` starts a simple canvas connection mode: pick a relationship type, then click the target node.
- Added readable relationship presets: `Стандартный вид`, `В дереве`, `Wiki-ссылки`, `Ручные связи`, `Все связи` and `Одинокие`.
- The graph view-state JSON is now preserved by the Safe HTML sanitizer while ordinary scripts remain blocked.
- Ctrl+Z / undo for graph edits is a planned follow-up, not part of this release slice.

## 2026-07-20: Knowledge Graph Canvas Usability Polish

- `Граф связей` now opens as a full canvas workbench without the old `Карта` / `Связи` / `Одинокие` tabs around it.
- The default view is now `Стандартный вид`: roots and two levels down through tree relationships, so the first screen explains the world from the top instead of showing a mysterious top-connected slice.
- Nodes no longer start stacked on top of each other in the standard layout.
- Fixed background domain labels and the bottom node list were removed from the first screen.
- Dragging a node near the canvas edge expands the canvas world dynamically; empty-space drag still pans the viewport.
- Toolbar controls are reorganized into layout, zoom/fit and filters.
- Relationship creation/view presets remain a planned follow-up; current node actions stay in the right-click menu.

## 2026-07-20: Knowledge Graph Filters And Node Drag

- The Knowledge Graph canvas now has simple first-screen filters for entity type, relationship type, search and orphan pages.
- The status line explains why the current nodes are visible, instead of leaving the owner to guess why the graph picked those pages.
- The selected-node side inspector was removed from the canvas. Node actions now live in a right-click context menu.
- Nodes can be dragged directly on the canvas; connected lines follow the moved node immediately.
- Dragging empty canvas space still pans the whole graph layer.
- Manual node positions are runtime-only for now. Saved/pinned positions remain a follow-up interaction task.

## 2026-07-20: Knowledge Graph Workbench Layout

- `Graph of relationships` now opens the visual tab as a cleaner canvas workbench instead of a page full of counters and helper cards.
- The toolbar now offers `Domains`, `Center`, zoom, and center/fit controls.
- This was later refined by the canvas usability polish: the default layout is now `Стандартный вид`, while `По типам` is the optional domain layout.
- Dragging empty canvas space now pans the graph layer with nodes and lines together.
- The later polish removed the bottom readable node list from the first screen.

## 2026-07-20: Knowledge Graph Visual Canvas

- `Граф связей` now has a real visual canvas above the readable node grid.
- The canvas shows page nodes and relationship lines, with simple zoom, pan and fit-to-view controls.
- Selecting a node highlights it; right-click opens node actions such as opening the page or focusing neighbors.
- The later polish removed the old fallback node grid from the first screen.

## 2026-07-20: Simplified Block Creation Menu

- The card `Add block` popup now has one explicit source of truth for the first-level block list.
- The first-level list is limited to `Text`, `List`, `Table`, `Image` and `Properties` when the current card type supports properties.
- Specialized legacy blocks such as item/spell/skill sets, character effects, character sheet, DnD stat blocks, task tracker and page-template flows stay supported for old content, but they are not offered as first-level block choices.
- The old `Effects and Conditions` block remains readable through `CharacterModel` when an existing card already contains its JSON data; new user-facing setup should go through `Properties`, universal list modes and Rule Tree paths.

## 2026-07-20: Readable Item Properties Defaults

- New item `Properties` blocks now start with readable width and height for money, weight, armor and effect fields.
- Ordinary `Properties` fields now default to 2 grid rows, so the field label and the input both fit without manual resizing.
- The generic `Properties` fallback field size now matches the model default of 4 grid columns and 2 grid rows, so newly added fields do not start as cramped controls.
- Short `Properties` fields now center their label and input vertically, removing the awkward empty bottom space.
- Long text fields in `Properties`, including `Description`-style fields, now reserve space for the field name at any grid height and keep the text editor inside the field.
- Field resize dots now render above the field border with a subtle backing ring instead of being clipped into the border.
- Added a backlog item for the separate block-level drag-and-drop regression; that scenario is not mixed into this narrow item Properties fix.

## 2026-07-20: Properties To Map Character Snapshot

- New character and creature `Properties` blocks now open with wider readable default fields instead of cramped labels.
- Item armor settings are now one compound `Armor` field containing armor type, AC and DEX limit.
- The armor compound field can be removed or restored as one unit from the Properties gear popup.
- Map tokens created from character/creature cards now receive model-backed HP, max HP, temp HP, AC, speed, initiative modifier and effect/status summary.
- Restored map tokens refresh the same CharacterModel snapshot instead of relying on scattered card HTML fields.

## 2026-07-20: Armor Picker For Character Properties

- The character/creature `Properties` block now treats `Armor` as a real item picker.
- The picker only lists item cards whose own `Properties` block marks them as armor.
- Ordinary item cards no longer appear as selectable armor and no longer affect AC if an old saved reference points to them.
- AC calculations now accept both normal Russian armor type values and legacy mojibake armor type values.

## 2026-07-20: Visible DnD Character Calculations

- Character and creature `Properties` blocks now include visible `Proficiency` and `Initiative` fields by default.
- Ability fields show a compact runtime modifier badge, so the owner can immediately see how STR/DEX/CON/INT/WIS/CHA translate into DnD modifiers.
- Skill and save rows now recalculate from the related ability, current proficiency bonus and the three-state proficiency control: none, proficient or expertise.
- Initiative recalculates from DEX unless the user types a manual value.
- Manual calculated values stay protected, are exposed to `CharacterModel` as explicit overrides and are not overwritten by the next automatic recalculation.

## 2026-07-20: Standard Character Properties Layout

- New character and creature `Properties` blocks now open with a more readable default layout.
- Level, AC, speed, armor and HP sit in a compact top row.
- Ability scores fit on one row in DnD order: STR, DEX, CON, INT, WIS, CHA.
- Skill groups are wider and arranged in two readable rows instead of six cramped columns.
- Existing cards keep their saved manual layout; this change affects newly created Properties blocks and fields without stored layout.

## 2026-07-19: Properties Constructor Drag/Resize Polish

- Properties fields now show the resulting grid layout while dragging.
- Dropping a field onto occupied cells pushes existing fields down instead of visually stacking them under the placeholder.
- Drag/drop and resize use the actual displayed grid gap, so placement follows the visible grid more predictably.
- Added browser regression coverage for live collision preview and cursor-grid placement.

## 2026-07-19: Native Large Workspace Desktop Click-Through

- The current real large GM workspace for owner validation is `X:\ДНД\Мастер\По кампаниям\База`.
- Added `npm run desktop:native-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"` to launch the real Tauri release exe and click through Settings diagnostics, tree search, heavy map open and presentation open through WebView2.
- Rebuilt and validated the release exe on that workspace: native click-through passed with 690 pages, 25 maps, 141 assets, 527 asset references and 0 missing asset references.
- Fixed desktop asset loading for restored workspaces outside HOME: Rust now registers the selected workspace root in Tauri asset protocol scope during `set_workspace_root`, so map/card assets on `X:` do not fail with 403 after restart.
- Known follow-up: the real large workspace still reports 2074 schema diagnostics issues; recovery UI must explain those before any automatic repair.

## 2026-07-19: Real Large Workspace Desktop Matrix

- The current real large GM workspace was confirmed at `X:\ДНД\Мастер\По кампаниям\База`; the older planned paths `X:\ДНД\Мастер\База` and `X:\ДНД\Мастер\По кампаниям\2` are stale for current owner validation.
- `npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"` now passes with write probe OK, 690 pages, 25 maps, 141 assets, 0 missing asset references and tree parsing under 150 ms.
- Fixed the desktop large-workspace smoke runner so Cyrillic workspace paths survive child-process calls on Windows.
- Human CLI diagnostics now print an explicit `Errors` section when a workspace path is missing or not a MyOwnWorld workspace.

## 2026-07-19: Workspace Access Diagnostics Matrix

- Workspace diagnostics now show whether the selected workspace is on the default local path, another disk, a network folder, a possible external drive, or outside HOME.
- Desktop diagnostics can run a tiny write probe and report read-only/no-permission/disconnected-path failures in plain language.
- `tools/run_workspace_diagnostics.mjs` now includes the same access matrix for CLI checks.

## 2026-07-19: Write Revision Protection

- Autosave and special page saves now reserve a write revision before writing page content.
- Older stale save intents no longer update runtime page content, search indexes or undo state after a newer save intent exists.
- The statusbar now exposes page save states: changed, saving, saved, error and conflict.
- The workspace lifecycle backlog item for PageRecord, metadata, trash/undo and revision protection is now closed.

## 2026-07-19: PageIndex Search Lifecycle

- Sidebar search now uses cached PageIndex search documents instead of reparsing every page on each typed character.
- Search results are ranked by title, alias, tag, content and file-name match strength.
- Search results show the page path under each title, making similarly named pages easier to identify.
- Empty focused search shows recent and recently edited pages; clicking a row opens that page.

## 2026-07-19: Page Trash And Undo Foundation

- Page delete now writes a scoped trash snapshot under `.my-own-world-trash/page-deletes/` instead of creating an ordinary backup entry.
- Page operation undo APIs can restore deleted page files, undo tree moves and undo page renames through the existing PageRecord write path.
- Delete failures restore already removed files from trash before reporting the error.

## 2026-07-19: Required Page Metadata

- Page front matter now includes `schemaVersion`, `updatedAt` and `contentHash` for diagnostics and incomplete-write detection.
- Older pages continue to open normally and receive the new metadata when a normal PageRecord write updates them.
- Workspace validation now reports missing page diagnostic metadata, future page schema versions and content hash mismatch without blocking legacy pages that only need migration.

## 2026-07-19: PageRecord Pipeline

- Page markdown parsing, front matter serialization and metadata updates now go through a shared `PageRecord` pipeline.
- Main page save paths preserve unknown front matter fields instead of rebuilding metadata by local string replacement.
- Added regression coverage for PageRecord parsing, relationship metadata and metadata preservation during page commands.

## 2026-07-17: PageCommandService Foundation

- Page create, title/content save, aliases update, tree move, batch move and delete branch operations now enter through a shared `PageCommandService` command boundary.
- Command events record affected pages, phase order, status, duration and errors for future diagnostics and undo/recovery work.
- Added regression coverage for command phase order, rollback and real page operation routing.

## 2026-07-17: Project Status Docs And Definition Of Done

- README and Product Dashboard now describe the current browser/desktop status instead of the older desktop spike and Python-server notes.
- Added `docs/01-delivery/DEFINITION_OF_DONE.md` with `Foundation`, `MVP`, `Usable` and `Release-ready` readiness levels.
- Updated agent workflow and verification template so completed work must name its evidence level and keep partial work in the active plan.

## 2026-07-17: Desktop Filesystem Boundary Hardening

- Desktop filesystem commands now use a Rust-managed workspace root instead of trusting `workspaceRoot` on every file operation.
- Ordinary desktop file and asset commands now send workspace-relative paths only.
- Desktop writes now use temp-file atomic writes, and `remove_directory` rejects workspace-root deletion.
- Added Rust and JS regression coverage for root registration, relative-only command payloads, root-delete rejection, path escape rejection and atomic write behavior.

## 2026-07-17: Tree Title Security Fix

- Page titles in the tree now render through safe DOM text insertion instead of user-controlled `innerHTML`.
- Titles that look like HTML are shown as plain text and cannot create runtime elements in the tree title label.
- Added a browser regression for malicious-looking tree titles.

## 2026-07-17: Runtime Label Security Audit

- Audited user-controlled runtime labels that were rendered around aliases, tags, backlinks, wiki-link picker, campaign map picker and universal lists.
- Aliases, tags and linked page titles now render as text or escaped HTML in those surfaces.
- Added regression coverage for malicious-looking aliases/tags and a static guard for the audited runtime label files.

## 2026-07-17: Runtime Text Regression Coverage

- Added browser regression coverage for task tracker text, campaign map titles and knowledge graph relationship/page labels so script-like user text stays inert.
- Added a data-only World Package import preview regression for script-like page titles and dependency names.

## 2026-07-16: Campaign Map Regression Gate

- Added a browser regression gate for campaign map persistent data.
- The gate verifies that save/reload keeps token HP/source data, grid, fog, locked fog zones, layers, drawing shapes, normal/battle playlists and initiative state together.
- Browser smoke scenario tracking now includes the new map core regression gate and points initiative coverage to the current test name.

## 2026-07-16: Campaign Map Initiative UX

- Initiative now reopens directly to the turn-order window when combat already has participants.
- Living creature tokens are selected by default; tokens with `hp <= 0` are excluded from the initiative picker.
- Manual initiative values can be edited in the turn-order window, saved, sorted and preserved while using previous/next turn controls.
- Active participant highlight stays synced with the map token.
- Campaign map tokens now preserve optional `hp` through model serialization via `data-hp`.

## 2026-07-15: Campaign Map Music Stabilization

- Campaign map music is now stabilized as a compact AIMP-like playlist popup with normal/battle playlists, play/stop/previous/next, shuffle/order, loop and copy-from-map.
- Selected audio files are imported into the workspace in parallel and added directly to the active playlist.
- Switching maps stops stale music when the new active playlist is empty, or attempts to start the first track when it is not empty.
- Playback failures are reported in the popup status without breaking the map.
- Russian labels in the map music/picker/title-validation path were hardened against encoding breakage.

## 2026-07-15: Map Layers Completion

- Campaign map layers now include a separate locked-fog-zones layer.
- Fog and locked fog zones keep a stable top render order in the GM editor and presentation mode.
- Hiding the fog or locked-fog layer now updates both the editor and presentation view.
- Campaign map schema validation now accepts the current `layerId` layer field.

## 2026-07-15: Drawing Tools Stabilization

- Campaign map drawings now preserve stroke color, fill color and stroke width after save/reload.
- Pen drawing now continues a vector only from a nearby endpoint; a far click starts a separate line.
- Drawing fills are more visible on empty maps and in presentation mode.
- Regression coverage was expanded for drawing tools, drawing layer assignment and persisted drawing style data.

## 2026-07-15: Presentation Mode Stabilization

- Browser presentation now refreshes locked fog zones during fog sync, so moved or resized locked zones update without waiting for a full presentation rerender.
- The standalone presentation window now shows a waiting state before the first map render arrives instead of staying silently blank.
- Regression coverage was added for locked fog zone sync and presentation loading state.

## 2026-07-15: Hardened Desktop Release Gate

- `npm run desktop:gate` now writes `docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md`.
- The gate validates release handoff docs, required npm scripts, docs index, agent skills, verify, browser smoke, desktop prepare, packaging smoke, desktop environment and Tauri cargo check.
- The gate can include a real large workspace smoke with `npm run desktop:gate -- --workspace "<path>"`.
- If no large workspace is provided, the report marks that part as skipped so the release is not accidentally described as large-workspace validated.

## 2026-07-15: Desktop Large Workspace Smoke Runner

- Added `npm run desktop:large-workspace-smoke` for repeatable large-workspace desktop handoff checks.
- The runner collects read-only workspace diagnostics, tree timing, desktop environment checks, packaging smoke and desktop artifact presence.
- Added `docs/01-delivery/DESKTOP_LARGE_WORKSPACE_SMOKE.md` as the current manual native desktop checklist.
- The generated report defaults to `docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md`.

## 2026-07-15: Desktop Workspace Diagnostics

- Settings now show a clearer workspace diagnostics block for desktop and browser builds.
- The diagnostics report shows runtime mode, selected workspace path, write access, schema status, last background checkpoint, backup folder, latest backup and last recorded workspace operation.
- The summary now includes backup count, incomplete backup count and pending workspace operation count.
- Warnings now call out missing write access, failed checkpoints, pending operations, incomplete backups and backup scan errors.

## 2026-07-15: Desktop Install And Update Flow

- Added a clear desktop install guide in `docs/04-user-release/HOW_TO_INSTALL.md`.
- The recommended handoff file is now explicitly documented: `src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe`.
- The guide separates app install/update from workspace data: the installer updates the app, while the workspace remains an external folder selected by the user.
- Added safe update and rollback steps for testers: close the app, back up or copy the workspace, install the new build, reopen the same workspace, then run a short smoke pass.

## 2026-07-15: Faster Tree Delete Backup

- Deleting a page or branch no longer backs up every page in the workspace.
- Automatic delete protection now creates a scoped backup containing only the pages that will be removed.
- This keeps deletion protected while avoiding large-workspace pauses when the user deletes a small branch.
- Manual full workspace backup from settings is unchanged.

## 2026-07-14: Tree Virtualization For Big Workspaces

- Дерево страниц теперь включает виртуализацию на больших workspace: вместо сотен DOM-строк приложение рендерит только видимый диапазон и небольшой запас вокруг него.
- Маленькие деревья остаются в прежнем полном рендере, поэтому поведение обычных workspace не меняется.
- Поиск карточки в дереве / `Найти в дереве` умеет прокручивать виртуальный список к далекой странице и подсвечивать ее.
- Свернутые ветки, активная карточка, контекстное меню и pointer drag-and-drop используют те же обработчики, что и раньше.
- Добавлен browser regression на большое дерево, чтобы виртуализация не сломалась незаметно.

## 2026-07-14: Backup Cleanup And Big Workspace Tree Speed

- Перенос страниц в дереве больше не запускает полную перечитку workspace после успешного drop. На большом workspace это убирает основной источник задержки после перетаскивания.
- В настройках backup появилась проверка недособранных резервных копий: приложение находит папки `.my-own-world-backups/*` без `manifest.json`, показывает список и размер, а удаляет только после отдельного подтверждения.
- Cleanup недособранных backup защищен от случайного удаления валидных snapshot: перед удалением список перепроверяется.
- Добавлен безопасный performance-probe для больших workspace: `tools/probe_large_workspace_tree_performance.mjs`.

## 2026-07-14: Workspace Scale Performance Pass 1

- Долгие операции начали показывать понятный прогресс в statusbar: перенос в дереве, удаление ветки, создание backup, restore и cleanup backup теперь показывают текущий этап и счетчик обработанных страниц/assets/backups.
- Добавлена внутренняя история performance events для workspace-операций: tree move/delete и backup create/restore/cleanup записывают длительность, статус и счетчики. Это foundation для последующих замеров на большом workspace.
- Перенос страниц в дереве стал легче для больших workspace: DnD-план теперь применяет пачку изменений за один risky backup, а не создает отдельный backup на каждый измененный соседний элемент.
- Удаление большой вложенной ветки ускорено: приложение строит индекс детей за один проход вместо повторного сканирования всех страниц на каждом узле.
- PageRepository/PageIndex обновляет moved/updated страницы точечно, если код передает состояние до/после изменения. Это снижает лишние полные rebuild на больших деревьях.
- Добавлены regression-тесты на инкрементальный PageRepository, удаление глубокой ветки и batch tree move с одним backup.

## 2026-07-11: Documentation Cleanup And Agent Workflow Refresh

- Документация получила актуальную карту `docs/README.md`: теперь видно, где лежат product, delivery, architecture, testing, user-release и archive материалы.
- Архивные документы вынесены в `docs/archive/` и снабжены реестром причин архивации.
- Локальный `debug.log` и старый Python-аудитор файлов убраны из активной зоны проекта.
- Agent workflow обновлен: `AGENTS.md` и skills теперь указывают на актуальные docs, archive и проверки `docs:index`, `check:encoding`, `audit_project_files`.
- Для тестировщика добавлен короткий сценарий проверки порядка документации и защиты от повторной поломки кодировки.

## 2026-07-10: Knowledge Graph Exploration Foundation

- `Граф связей` стал полезнее на первом экране: показывает быстрые центры мира, одинокие страницы и подсказку следующего действия.
- Добавлены доменные карточки `Персонажи`, `Предметы`, `Организации`, `Правила` с быстрым переходом в соответствующие связи.
- Rule Tree теперь явно помечен как зона будущего `admin`-редактирования: читать смогут роли `admin/player/viewer`, редактировать - `admin`.

## 2026-06-30: Desktop Audio Playback Fix

- Исправлена ошибка desktop-плейлиста карты `Failed to load because no supported source was found`.
- Причина была в Tauri CSP: изображения через asset protocol были разрешены, а audio/media источники нет. Теперь `media-src` разрешает `asset:` и `http://asset.localhost`.
- Дополнительно playback карты переведен на runtime `blob:` из `StorageAdapter.readBinary()`, чтобы музыка работала даже для workspace вне `$HOME` и не зависела от Tauri asset scope.
- Desktop packaging smoke и storage tests теперь проверяют, что audio playback через asset protocol не забыли в конфигурации.

## 2026-06-30: Campaign Map Music AIMP-Like Player

- Popup музыки карты стал компактнее: сверху теперь mini-player с текущим треком, ниже плотные controls и активный normal/battle playlist.
- Список плейлиста стал динамическим: клик по треку запускает его, активная строка подсвечивается.
- Import flow упрощен: лишний список под добавлением убран, итоговые треки видны в основном плейлисте.
- Сохранены два плейлиста на карту, copy from other map, loop/shuffle/order, play/stop/previous/next и autostart первой песни при открытии/переключении карты.

## 2026-06-23: Recovery Screen Repair-Action Foundation

- Экран диагностики workspace теперь показывает, есть ли для ошибки безопасное исправление после backup или нужна ручная правка.
- Безопасные действия пока только описываются в UI и не применяются автоматически.
- Подготовлены первые repair-action типы: broken parent, сломанный токен карты с отсутствующей карточкой, ссылка task tracker на отсутствующую задачу.

## 2026-06-23: Campaign Map Music Starts On Map Switch

- При открытии или переключении на карту приложение пытается запустить первую песню активного плейлиста этой карты.
- Если до этого играла музыка другой карты, она останавливается перед стартом нового плейлиста.
- Если у активного плейлиста нет треков или среда блокирует autoplay, карта продолжает открываться без падения.

## 2026-06-19: Campaign Map Music Popup Polish

- Popup музыки карты больше не сканирует `assets/music` при каждом открытии и не показывает второй список "доступных" песен под добавлением: виден только активный плейлист.
- Выбор файлов показывает компактную строку с количеством выбранных файлов, а добавление идет напрямую в текущий плейлист.
- Кнопка play теперь выводит статус воспроизведения или понятную ошибку, если браузер/Tauri не смог запустить аудио.
- Кнопки управления музыкой выровнены как одинаковые icon buttons.

## 2026-06-19: Campaign Map Music Playlists

- У каждой карты появились два музыкальных плейлиста: обычный и боевой.
- Popup `Музыка карты` показывает песни из `assets/music`, позволяет выбрать новые аудиофайлы, увидеть их в очереди и кнопкой `Добавить` сохранить в workspace/добавить в активный плейлист.
- Переключатель `Обычная / Бой` меняет активный плейлист и запускает первую песню.
- Добавлены controls: случайный порядок / по списку, loop, stop, play, previous и next.
- Музыка карты сохраняется в model-first состоянии карты и учитывается asset checker как audio references.

## 2026-06-18: Campaign Map v2 Hardening - initiative, drawing, token skills

- Инициатива на карте стала удобнее: ручной ввод результата, бросок d20, отдельное окно порядка ходов и сохранение состояния.
- В контекстном меню токена добавлено действие с проверкой навыка: можно выбрать навык, дистанцию, форму зоны и показать результат.
- Инструменты рисования на карте стали полноценнее: карандаш, перо, ластик, заливка, выбор цвета и последние цвета.
- Презентация карты синхронизирует движение токенов/фигур через delta-sync, без полной перерисовки сцены на каждый шаг.
- Для действий токенов добавлены browser regression tests, чтобы проверки навыков и UI не ломались незаметно.

## 2026-06-18: Campaign Map v2 Hardening - locked fog и mass select

- Locked fog zones на карте теперь устойчивее: их можно двигать, менять размер и удалять двойным кликом, а кисть тумана больше не стирает/не рисует поверх защищенной зоны при пересечении области кисти.
- Туман получил foundation для dirty-region save: приложение по-прежнему сохраняет полный `fogImage` как безопасный источник, но модель карты хранит последний измененный регион и счетчик изменений для будущей оптимизации.
- Исправлена очистка тумана: `clearFog()` больше не использует несуществующие координаты кисти и корректно помечает весь canvas как измененный.
- Mass select на карте закреплен регрессией: Shift-рамка выделяет токены и фигуры, а перенос выбранного токена двигает выделенную группу вместе.

## 2026-06-16: Asset Lifecycle UI и Media Foundation

- Панель `Проверка ассетов` теперь показывает и broken references, и orphan-файлы из `assets/`.
- Orphan-файлы можно удалить из панели только после подтверждения; перед удалением создается backup workspace.
- Если картинка не найдена или не может отрендериться в текущем окружении, приложение показывает видимый fallback-placeholder вместо пустого места.
- `audio` и `playlist` стали first-class asset types для будущей музыки локаций.
- У карточек типа `Локация` в блоке `Свойства` появились базовые поля для audio asset, playlist asset и громкости.

## 2026-06-16: UI проверки broken assets

- В настройках приложения добавлена панель `Проверка ассетов`.
- Проверка читает папку `assets/`, сверяет найденные файлы с persistent-ссылками карточек и карт и показывает потерянные пути.
- Проверка ничего не удаляет и не чинит автоматически: это безопасный диагностический шаг перед будущими repair-actions.

## 2026-06-15: Стандартная раскладка `Свойств` по живому примеру

- Стартовая раскладка блока `Свойства` для новых персонажей и существ теперь повторяет вручную собранный эталон из карточки пользователя.
- Верхняя строка стала компактной боевой панелью: уровень, КЗ, хиты, временные хиты и спасброски от смерти.
- `Скорость` и `Доспех` вынесены во вторую строку, а характеристики стоят на одной строке в порядке `СИЛ`, `ЛОВ`, `ИНТ`, `МДР`, `ТЛС`, `ХАР`.
- Группы навыков теперь по умолчанию стоят прямо под соответствующими характеристиками и используют узкие вертикальные колонки.

## 2026-06-15: UX-hotfix блока `Свойств`

- Перетаскивание полей `Свойств` теперь начинается с границы поля, без отдельной grid-кнопки, и учитывает точку захвата: поле больше не "запаздывает" относительно курсора.
- Поле `Доспех` в карточках персонажей стало выпадающим списком предметов из workspace, а не ручным текстовым вводом.
- `Состояния` и `Эффекты` убраны из стартового набора `Свойств` персонажа/существа, но остаются доступными для ручного добавления через шестеренку блока.
- Для навыков добавлено три состояния владения: нет владения, владение и экспертность. Экспертность дает двойной бонус мастерства в расчетах.
- Список навыков стал адаптивным: при сужении поля строки навыков переходят в одну колонку.
- Исправлены подписи полей в popup шестеренки и переполнение input/select/textarea внутри рамок при изменении размеров.

## 2026-06-15: Свободная layout-сетка `Свойств`

- Поля в блоке `Свойства` теперь можно переносить в любую клетку 12-колоночной сетки; пустые места и разрывы строк сохраняются, а не схлопываются автоматически.
- Если поле бросить на занятое место, соседние поля сдвигаются вниз, а не накладываются друг на друга.
- Resize слева/сверху меняет именно выбранную сторону поля, без скрытой перестановки DOM.
- Новые пользовательские поля добавляются в ближайшее свободное место сетки.
- У персонажей и существ стартовая раскладка стала аккуратнее: компактные поля сверху, HP отдельной строкой, все шесть характеристик помещаются на одной строке.

## 2026-06-15: Лист персонажа организован как DnD sheet

- `Лист персонажа` визуально перестроен под бумажную DnD-организацию: верхняя строка с именем, уровнем, КЗ, хитами и death saves, отдельная строка инициативы/скорости/пассивного восприятия/состояний, затем колонки характеристик и навыков.
- Навыки и спасброски теперь видны прямо в листе персонажа рядом с соответствующей характеристикой, а значения читаются из блока `Свойства`.
- `Свойства` остаются источником данных: лист не хранит отдельную копию параметров и продолжает записывать редактируемые значения обратно в `Свойства`.
- Пустые значения навыков в `Свойствах` больше не превращаются в `0` в листе: если поле пустое, лист показывает расчетный fallback от модификатора характеристики.

## 2026-06-15: Internal rules workspace из program-owned JSON

- Внутренние правила DnD теперь поставляются как program-owned JSON `assets/rules/internal-rules-workspace.json`, а не только как JS seed.
- JS seed остался fallback: если файл правил не загрузился, пользовательский workspace не ломается.
- В popup `Свойства` -> `Правила` добавлен поиск по внутреннему справочнику.
- Из popup правил теперь можно открыть выбранное правило как read-only страницу.

## 2026-06-15: Полный визуальный редизайн `Archive Hearth`

- Обновлена палитра приложения: вместо старого нейтрального/синего ощущения используется теплая темная система `Archive Hearth` с parchment-текстом, candle gold акцентом, moss selected-состояниями и ruby danger-действиями.
- Добавлен общий визуальный слой `styles/brand-system.css`: кнопки, popup, поля ввода, tree, блоки, task tracker, toolbar и DnD-подсветки получили единые hover/focus/active состояния.
- На клики, popup, переходы, placeholder и drag/drop добавлены мягкие микроанимации с учетом `prefers-reduced-motion`.
- Создан продуктовый брендбук `docs/00-product/BRANDBOOK.md`.
- Обновлен `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`: будущие блоки, вкладки и системы должны использовать новую палитру, motion-правила и общий contract.

## 2026-06-14: Редактируемый `Лист персонажа`

- `Лист персонажа` теперь показывает источник расчетных метрик: `авто` или `ручн.`.
- Ручные значения КЗ, скорости и инициативы можно сбросить прямо из листа, вернув авторасчет.
- Death saves стали редактируемыми в листе: три успеха и три провала записываются в блок `Свойства`.
- Добавлен foundation расчетных зависимостей между карточками: свойства карточки могут использоваться как переменные для безопасных формул без `eval`. Видимый UI конструктора формул будет отдельным этапом.
- В `Свойства` персонажа и существа добавлены широкие группы DnD-навыков и спасбросков: `Навыки СИЛ`, `Навыки ЛОВ`, `Навыки ТЛС`, `Навыки ИНТ`, `Навыки МДР`, `Навыки ХАР`.
- Каждая строка навыка хранит числовое значение и checkbox владения как стабильные переменные, например `skillAthletics`, `skillStealth`, `saveDex`, `skillAthleticsProficient`.
- Навыки и спасброски в `Свойствах` теперь пересчитываются от характеристики, уровня и checkbox владения; ручной ввод подсвечивается как override, а очистка поля возвращает авторасчет.
- Добавлено поле `Доспех` для персонажа/существа и свойства доспеха для предметов. КЗ считается по DnD-правилам из ЛОВ, выбранного предмета-доспеха и эффектов.
- Старые блоки `Статистика персонажа` и `Стат. блок DnD` больше не предлагаются при добавлении нового блока. Уже существующие карточки с такими блоками продолжают открываться через legacy-совместимость.
- Добавлен foundation внутреннего DnD rules workspace: wiki-link может найти системное правило, если такой карточки нет в мире, а шестеренка `Свойств` показывает дерево правил через кнопку `Правила`.

## 2026-06-13: Model-first layout `Свойств`

- Layout полей в блоке `Свойства` теперь сохраняется как model-first данные `x/y/w/h/order/collapsed/groupId` в `data-property-layout`.
- Размеры и порядок полей после drag/resize читаются через `PropertiesModel`, а не остаются только визуальным DOM-состоянием.
- Старые `data-property-span` / `data-property-rows` сохранены как совместимость, поэтому старые карточки продолжают открываться.

## 2026-06-12: Smooth DnD для `Свойств`

- Перетаскивание полей в блоке `Свойства` стало плавнее: поле под курсором теперь идет как runtime ghost, а сетка показывает только placeholder будущей позиции.
- Исправлена тряска layout-сетки: реальный порядок полей меняется один раз при drop, а не на каждом движении мыши.
- Добавлена browser regression проверка, что ghost и placeholder появляются во время переноса и очищаются после него.

## 2026-06-11: Hotfix layout-сетки `Свойств`

- В `Свойствах` убрана рудиментарная кнопка размера из popup шестеренки: размер теперь меняется только напрямую через точки на поле.
- Drag полей `Свойств` теперь можно завершать в пустой области сетки блока, а не только поверх другого поля.
- Resize за левую или верхнюю сторону меняет именно выбранную сторону поля; служебные grip/resize-контролы больше не перехватывают клик по текстовому полю.

Текущий `latest` пока является рабочей зоной release handoff, а не опубликованным релизом.

## Изменения

- Release notes будут заполняться перед передачей сборки тестировщикам.
- Добавлена структура release handoff: `release/latest/`, `release/candidates/`, `release/archive/`.
- Документация разложена по продуктовой, delivery, архитектурной, тестовой и пользовательско-релизной зонам.
- Добавлен foundation `CharacterModel`: модельный слой для HP, временных HP, характеристик, death saves и proficiency.
- Карта связана с `CharacterModel`: здоровье и инициатива токенов теперь подтягиваются из карточки персонажа/существа, включая DEX-модификатор для инициативы.
- Добавлен Design System foundation: UI audit, design system contract, phased rollout и базовый `styles/design-tokens.css`.
- Добавлен foundation `InventoryModel`: инвентарь читается из существующего блока `Предметы` как модельные данные CharacterModel.
- Добавлен foundation `EffectsModel`: активные состояния DnD, эффекты, модификаторы и боевые флаги теперь доступны как модельные данные CharacterModel.
- Блок `Эффекты и состояния` теперь умеет добавлять эффекты из карточек предметов, заклинаний и навыков.
- `CharacterModel` автоматически учитывает эффекты предметов из инвентаря, если у карточки предмета есть явный блок `Эффекты и состояния`.
- Добавлен блок `Лист персонажа`: расчетная сводка персонажа/существа по свойствам, инвентарю и эффектам.
- Добавлена отдельная сущность `Правила` / `Rule Tree`: правила хранятся в собственном JSON, старые карточки с тегом `rule` можно импортировать как временный bridge.
- `Правила` теперь доступны не только в архитектуре, но и в ручном UI: сущность можно создать через главный `+` и со стартового пустого экрана.
- Legacy-блок карточки `Состояния и эффекты` поддерживается для уже существующих карточек, но новый первый уровень popup `Добавить блок` больше не предлагает его как отдельный сценарий.
- Главный popup `+` упрощен: быстрые пункты `Задача` и `По шаблону` убраны из первого уровня меню, чтобы не перегружать основной вход создания сущностей.
- Направление развития `Свойств` пересобрано: блок `Свойства` становится главным человеко-понятным местом для параметров карточки, ручных значений, эффектов и будущих расчетов.
- В блок `Свойства` добавлена шестеренка настроек: она открывает мягкий runtime-popup с текущими параметрами блока.
- В настройках `Свойств` теперь можно добавить пользовательский параметр: короткий текст, число, длинный текст или да/нет. Поле сохраняется в карточке и читается `PropertiesModel` как custom-параметр.
- Popup-ы, открываемые кнопками, теперь можно перетаскивать мышью за свободное место. Кнопки, поля ввода и select внутри popup-ов продолжают работать как обычные элементы.
- Исправлено появление шестеренки `Свойств` у только что добавленного блока: контрол появляется сразу, без переоткрытия карточки.
- Добавлен backend-слой расчётов `Свойств`: уровень, бонус мастерства, модификаторы характеристик, инициатива, КЗ, скорость и хиты теперь имеют расчетную модель с формулой, частями расчёта и поддержкой будущих ручных override.
- `Лист персонажа` стал редактируемым: изменения основных чисел записываются в блок `Свойства`, а ручные override расчетных полей подсвечиваются.
- Меню `Добавить блок` упрощено до основных блоков: текст, список, таблица, картинка, свойства.
- Добавлен универсальный `Блок списка` с режимами предметов, заклинаний, навыков, персонажей, существ и объектов.
- `Свойства` получили layout MVP: поля можно переставлять встроенной grip-иконкой, удалять из конкретного блока, создавать из готовых расчетных параметров и менять размер через resize-точки по сторонам/углам. Размер хранится в 12-колоночной сетке как `data-property-span` / `data-property-rows`; метка `свой` убрана.
- Добавлен bridge для будущей миграции legacy-блоков без автоматического переписывания старых карточек.

## 2026-06-05: Effects / Conditions UI

- Добавлен блок карточки `Эффекты и состояния`: можно вручную добавлять состояния DnD, уровень истощения и эффекты с модификаторами КЗ, скорости и инициативы.
- Карта и режим презентации получают summary эффектов через `CharacterModel`: токены показывают индикатор состояний, а инициатива учитывает бонусы из EffectsModel.
- В Safe HTML boundary разрешен только безопасный JSON-источник `[data-character-effects]`; обычные скрипты по-прежнему удаляются sanitizer-ом.

## 2026-06-05: Effect sources и лист персонажа

- В блоке `Эффекты и состояния` добавлен выбор источника из карточек `Предмет`, `Магия` и `Навык`.
- Добавленные из источника эффекты сохраняют связь с `sourcePageId`, а для будущего Rule Tree и World Packages зарезервированы `ruleId` и `sourcePackageId`.
- Предметы из блока `Предметы` могут автоматически давать эффекты персонажу, если у карточки предмета есть собственный блок `Эффекты и состояния`.
- Новый блок `Лист персонажа` показывает уровень, БМ, КЗ, скорость, инициативу, HP, характеристики, инвентарь и активные эффекты.

## 2026-06-05: Rule Tree foundation

- В меню создания появилась сущность `Правила`.
- Rule Tree открывается как отдельная рабочая зона, а не как обычная карточка.
- Старые карточки с тегами `rule`, `rules`, `правило`, `правила` показываются как кандидаты на импорт.
- Активные правила Rule Tree передают эффекты в CharacterModel через общий EffectsModel pipeline.
- В карточке персонажа/существа блок `Эффекты и состояния` теперь позволяет выбрать персональные правила из Rule Tree.
- Rule Tree получил foundation-структуру дерева: группы, категории, условия, наследование и future package id.
- Rule Tree теперь позволяет редактировать условия правила, менять группу/категорию/package id, экспортировать и импортировать JSON-пакет правил и видеть предпросмотр активных эффектов.
- Rule Tree получил первый исполняемый engine: условия `level`, `state`, `card-variable`, `manual`, `formula` теперь фильтруют применимость правил, наследование подтягивает эффекты, а переносимые пакеты могут храниться в `rule-packages/*.rule-package.json`.
- Rule Tree получил пользовательский package manager и диагностику: из UI можно сохранить package-файл, обновить список, импортировать или удалить пакет, а конфликт rule id останавливает импорт с понятным статусом.

## 2026-06-23 - Data Recovery And Storage Hardening

- Recovery safe actions can now be applied at the model layer after a backup manifest exists.
- Schema versions are centralized, and future workspace/map/task schema versions now block unsafe reads.
- Desktop file commands return structured errors (`code`, `message`, `path`) for safer diagnostics.
- UI/tree/templates/page loading now rely on `StorageAdapter` helpers instead of direct browser-only workspace handles.

## 2026-07-06: Backup Retention And Risky Operation Snapshots

- Risky tree operations now require a backup snapshot before changing workspace files. If the snapshot cannot be created, delete/move stops instead of continuing unprotected.
- Settings now include a backup retention control: choose how many snapshots to keep and manually clean old backups with the same safe limit.

## 2026-07-06: Dark Fantasy Design Foundation

- Добавлен фундамент нового dark fantasy визуального слоя: MOW design tokens, glass panels, old-gold accents и theme attributes.
- В настройках появилась панель оформления для выбора акцента, фонового пресета и плотности интерфейса.
- Изменение не копирует чужие ассеты, портреты, карты, логотипы или названия из референса.

## 2026-07-07: Граф связей

- В меню `+` добавлена сущность `Граф связей`.
- Граф показывает понятную сводку мира: сколько страниц, сколько связей и какие страницы пока ни с чем не связаны.
- Historical: на этом этапе внутри графа были вкладки `Связи` и `Одинокие страницы`; текущий экран заменен canvas-first workflow из заметки 2026-07-20.
- Связи строятся из дерева, wiki-links и подготовленного typed relationships foundation.
- В `Связях` появились фокусы: `Все связи`, `Персонажи`, `Предметы`, `Организации`, `Правила`.
## 2026-07-07: Knowledge Graph relationships

- Historical: `Граф связей` получил readable graph view; текущий экран заменен canvas-first workflow из заметки 2026-07-20.
- Historical: ручное добавление typed relationship через вкладку `Связи` было доступно в старом UI; новый canvas/context-menu вариант запланирован как follow-up.
- Ручные связи сохраняются в metadata исходной карточки как `relationshipsJson` и затем отображаются в графе вместе с деревом и wiki-links.
- В контракте `KNOWLEDGE_GRAPH_ENTITY_CONTRACT.md` закреплен формат связей и правило: readable view остается обязательным fallback перед будущим canvas/explorer.

## 2026-07-07 - World Package Foundation

- Added the first safe foundation for World Packages: portable package model, workspace storage, metadata, dependencies, fork fields and import preview.
- World packages are stored in `world-packages/*.world-package.json`.
- Import preview detects page conflicts before any future workspace write and marks import as backup-required.
- No user-facing bulk import button is exposed yet; this release only prepares the safe data layer.
