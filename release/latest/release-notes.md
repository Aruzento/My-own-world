# Release Notes

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
- Блок карточки `Состояния и эффекты` явно доступен в popup `Добавить блок` и создается с таким названием для новых карточек.
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
- Внутри графа есть вкладки `Связи` и `Одинокие страницы`; из списка можно открыть страницу.
- Связи строятся из дерева, wiki-links и подготовленного typed relationships foundation.
- В `Связях` появились фокусы: `Все связи`, `Персонажи`, `Предметы`, `Организации`, `Правила`.
## 2026-07-07: Knowledge Graph relationships

- `Граф связей` получил readable graph view: первая вкладка показывает компактную карту узлов мира.
- Во вкладке `Связи` теперь можно вручную добавить typed relationship между двумя существующими страницами.
- Ручные связи сохраняются в metadata исходной карточки как `relationshipsJson` и затем отображаются в графе вместе с деревом и wiki-links.
- В контракте `KNOWLEDGE_GRAPH_ENTITY_CONTRACT.md` закреплен формат связей и правило: readable view остается обязательным fallback перед будущим canvas/explorer.

## 2026-07-07 - World Package Foundation

- Added the first safe foundation for World Packages: portable package model, workspace storage, metadata, dependencies, fork fields and import preview.
- World packages are stored in `world-packages/*.world-package.json`.
- Import preview detects page conflicts before any future workspace write and marks import as backup-required.
- No user-facing bulk import button is exposed yet; this release only prepares the safe data layer.
