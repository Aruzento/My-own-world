---
summary: "Single active project plan, backlog, priorities, and technical debt."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---

# Project Plan

Дата обновления: 2026-07-11

Этот файл содержит один активный план работ. Выполненное уходит в архив внизу файла и подробно фиксируется в [WORK_LOG.md](./WORK_LOG.md). Если задача сделана частично, незакрытая часть остается в активном плане отдельным подпунктом.

## Правила Ведения Плана

- Нумерация идет как версия: `0.0.0.X`, подпункты расширяют номер.
- Пункты отмечаются как **сделано** только после реализации и проверки.
- P0/P1 задачи должны иметь автотест или явное объяснение, почему тест невозможен.
- Если задача меняет пользовательское поведение, обновляются release notes, manual или tester instructions.
- Если задача выявляет будущую работу, она добавляется как подпункт, а не теряется в комментариях.

## Активный План

### 0.0.0.7. Workspace Scale & Performance Gate

Статус: **P0, следующий крупный блок**.

Цель: MyOwnWorld должен уверенно работать как worldbuild OS на больших workspace: сотни и тысячи страниц, много картинок, большие карты, старые backup-и и крупные деревья не должны превращать операции в “кажется зависло”.

0.0.0.7.1. Измерить операции большого workspace.

Описание: добавить сценарии и метрики для workspace масштаба `X:\ДНД\Мастер\База`: загрузка, построение дерева, поиск, перенос, удаление, backup gate, cleanup, открытие карты.

Статус: **частично сделано 2026-07-14**. Добавлен общий performance layer `js/performance/workspacePerformance.js`: операции tree delete, batch tree move, backup create, backup restore и backup cleanup записывают duration/count/status в bounded in-memory history. Добавлены unit regression для successful/failed events, ограничения истории, batch move/delete метрик. Добавлен real-workspace probe `tools/probe_large_workspace_tree_performance.mjs`; на `X:\ДНД\Мастер\База` замерены 691 страница, чтение/parse ~5.3 сек, move/delete временных probe-страниц ~0 мс. Осталось: встроить постоянный desktop/browser smoke на загрузку/поиск/wiki lookup/карту.

0.0.0.7.2. Добавить progress UI для долгих операций.

Описание: перенос, удаление, backup, restore, asset scan и cleanup должны показывать понятный прогресс, текущий этап и итог. Пользователь должен понимать, что программа работает.

Статус: **частично сделано 2026-07-14**. Статусбар теперь получает progress callbacks для переноса в дереве, удаления ветки, ручного backup, restore и cleanup backup: показывается этап и счетчик страниц/assets/backups. Осталось: progress UI для asset scan/asset cleanup и более заметная desktop-индикация для очень долгих операций, если статусбара будет недостаточно.

0.0.0.7.3. Ускорить auto-backup перед рискованными операциями.

Описание: page-first auto-backup уже введен для tree delete/move. Нужно закрепить это в UI и тестах на реальном сценарии большого workspace, а полный asset-backup оставить ручной операцией.

Статус: **сделано 2026-07-14**. `includeAssets: false` для risky-operation backup закреплен для tree delete/move, UI показывает progress, а DnD дерева больше не делает полный `loadWorkspace()` после drop. Реальный probe на `X:\ДНД\Мастер\База` подтвердил, что файловый move/delete быстрый, а основной старый тормоз был в перечитывании всех markdown-страниц.

0.0.0.7.4. Сделать cleanup недособранных backup.

Описание: добавить безопасный инструмент, который находит `.my-own-world-backups/*` без `manifest.json`, показывает список и размер, затем удаляет только после подтверждения пользователя.

Статус: **сделано 2026-07-14**. Добавлены `listIncompleteWorkspaceBackups()` и `cleanupIncompleteWorkspaceBackups()`, UI-кнопки в настройках backup, повторная защита от удаления валидных backup и unit regression. В реальном workspace `X:\ДНД\Мастер\База` найдено и после подтверждения удалено 12 недособранных backup без `manifest.json`; контрольный скан пустой.

0.0.0.7.5. Сделать batch delete/move для дерева.

Описание: операции дерева должны писать минимальный набор файлов, не пересобирать лишнее, не блокироваться на карте/asset cleanup и не держать UI в подвешенном состоянии.

Статус: **частично сделано 2026-07-14**. Сбор удаляемой ветки переведен с рекурсивного `state.pages.filter(...)` на parent-index за один проход. DnD дерева теперь применяет `updatePageTreePositions()` пачкой: один risky backup на весь drop и затем минимальные записи измененных страниц; после drop дерево обновляется локально без полной перезагрузки workspace. Реальный probe на `X:\ДНД\Мастер\База` показал, что write/delete быстрые, а дорогое место - полный read/parse всех страниц. Осталось: виртуализация дерева и desktop smoke с настоящим UI-drag.

0.0.0.7.6. Виртуализировать дерево для больших workspace.

Описание: дерево не должно перерисовывать сотни DOM-узлов без нужды. Нужны lazy render, стабильный selection, сохранение раскрытых веток и быстрый DnD target calculation.

Статус: **сделано 2026-07-14**. Добавлен `js/tree/treeVirtualization.js`: дерево строит полный плоский список видимых строк, но при больших workspace рендерит в DOM только окно вокруг текущего scroll. Порог включения - 250 видимых строк; маленькие деревья остаются в старом полном рендере. `renderTree()` сохраняет collapsed state, active selection, context menu, open-page и pointer DnD через общий `createTreePageElement()`. `revealPageInTree()` умеет прокручивать виртуальное дерево к карточке, которой еще нет в DOM. Добавлены unit tests `tests/treeVirtualization.test.mjs` и browser smoke `tests/browser/tree-virtualization.spec.mjs` на 520 страниц: DOM остается коротким, дальняя страница раскрывается и видна.

0.0.0.7.7. Ускорить PageRepository / PageIndex на больших данных.

Описание: индексы должны обновляться инкрементально после create/rename/move/delete/tag/type change, а не пересобираться полностью там, где это не нужно.

Статус: **сделано 2026-07-14**. `PageIndex` получил `addPage/updatePage/deletePage/deletePages`, а `notifyPageMoved()` и `notifyPageUpdated()` обновляют индекс точечно, когда caller передает состояние страницы до/после изменения. Fallback на полный rebuild оставлен для старого кода, который пока вызывает notify без аргументов.

0.0.0.7.8. Добавить performance regression.

Описание: unit/browser сценарии на 1k+ страниц, глубокое дерево, map tokens, asset refs, search/wiki lookup, move/delete с backup gate.

Статус: **частично сделано 2026-07-14**. Добавлены unit regression: инкрементальный PageRepository без полного rebuild, удаление глубокой ветки на 750 страниц, batch tree move с одним risky backup, performance event history и progress callbacks для tree move/delete. Добавлен browser regression для виртуализации дерева на 520 страниц. Осталось: desktop сценарий на реальном большом workspace, поиск/wiki lookup и карта.

### 0.0.0.6. Knowledge Graph: Real Visual Graph

Статус: **P0, исправление ожидания продукта**.

Цель: “Граф связей” должен быть визуальной картой мира, а не списком. Список связей остается вспомогательным режимом.

0.0.0.6.12. Спроектировать настоящий graph canvas.

Описание: визуальные узлы и ребра, zoom/pan, fit-to-view, выделение узла, открытие карточки в 1 клик.

0.0.0.6.13. Сделать readable graph layout.

Описание: кластеризация по доменам: персонажи, предметы, организации, правила, карты, локации. Первичный layout должен быть понятным без ручной настройки.

0.0.0.6.14. Добавить фильтры графа.

Описание: фильтр по типам сущностей, типам связей, тегам, “только связанные с текущей карточкой”, “одинокие страницы”.

0.0.0.6.15. Добавить интерактивность графа.

Описание: hover preview, click open, drag node, pin node, focus neighborhood, breadcrumbs назад к общему графу.

0.0.0.6.16. Добавить режим “исследование мира”.

Описание: показать центры мира, плотность связей, изолированные области, важные узлы, потенциальные пробелы.

0.0.0.6.17. Добавить graph performance gate.

Описание: граф должен оставаться быстрым на больших workspace; если узлов слишком много, нужен level-of-detail и ограничение видимой области.

0.0.0.6.18. Добавить regression tests для graph model и graph UI.

Описание: typed relationships, orphan view, фильтры, focus mode, открытие карточки, сохранение связей.

### 0.0.0.8. Project File Cleanup & Documentation Order

Статус: **P0, следующий организационный блок после фикса производительности**.

Цель: навести порядок в файлах проекта, убрать мусор, восстановить читаемость документации и снизить риск случайных правок не туда.

0.0.0.8.1. Провести полный аудит файлов.

Описание: для каждого файла указать назначение, владельца подсистемы, актуальность, можно ли удалить, нужно ли оптимизировать.

Статус: **сделано 2026-07-11**. Обновлен `docs/01-delivery/PROJECT_FILE_AUDIT.md`, добавлен повторяемый инструмент `tools/audit_project_files.mjs`, аудит выполнен двумя независимыми проходами: механическая инвентаризация и смысловая сверка по ссылкам/import-цепочкам, крупным файлам, untracked/debug-файлам и признакам mojibake.

0.0.0.8.2. Починить кодировки в документации.

Описание: найти документы с mojibake, восстановить или переписать читаемо. Добавить проверку, чтобы новые повреждения кодировки не проходили незамеченными.

Статус: **сделано 2026-07-11**. Восстановлены mojibake/не-UTF-8 строки в документации и пользовательских JS-строках, добавлен `tools/check_text_encoding.mjs`, команда `npm run check:encoding`, и проверка подключена в `npm run verify`.

0.0.0.8.2.1. Переписать старые необратимые question-mark фрагменты.

Описание: часть старых release/work-log/летописных строк была не перекодирована, а уже заменена вопросительными знаками. Это нельзя восстановить автоматически как mojibake; нужно вручную переписать смысловые фрагменты или архивировать их как поврежденные заметки при следующем проходе по docs.

Статус: **сделано 2026-07-11**. Переписаны поврежденные фрагменты в `release/latest`, `docs/01-delivery/WORK_LOG.md` и `Лог особенный/Летопись королевства My own world.md`; поиск `rg "\?{4,}"` больше не находит поврежденные фрагменты, кроме отсутствующих.

0.0.0.8.3. Разложить docs по зонам.

Описание: `00-product`, `01-delivery`, `02-architecture`, `03-testing`, `04-user-release`, `archive`. Проверить metadata `summary/read_when/owner_zone`.

Статус: **сделано 2026-07-11**. Проверена текущая раскладка docs по зонам, добавлен `docs/README.md` как карта документации, `node tools/docs_index.mjs` подтверждает metadata и соответствие owner_zone.

0.0.0.8.4. Архивировать устаревшие документы.

Описание: не удалять без подтверждения. Переносить в `docs/archive/` с краткой причиной.

Статус: **сделано 2026-07-11**. `docs/02-architecture/ARCHIVED_EXPERIMENTS.md` перенесен в `docs/archive/ARCHIVED_EXPERIMENTS.md`, потому что это архив старых экспериментов, а не активный архитектурный контракт. Добавлен `docs/archive/README.md` с реестром архивных документов, причинами архивации и ссылками на актуальные источники.

0.0.0.8.5. Убрать временные и debug-файлы.

Описание: найти `debug.log`, временные отчеты, старые dist/target артефакты вне ожидаемых мест. Перед удалением показать список пользователю.

Статус: **сделано 2026-07-11**. Перед удалением проверены кандидаты: `debug.log` и старый `tools/generate_project_file_audit.py`. `debug.log` удален как локальный лог, старый Python-аудитор удален из активной зоны, потому что его заменил `tools/audit_project_files.mjs`. Повторный аудит показывает `Delete candidates: 0`, временные/debug-файлы по шаблонам не найдены.

0.0.0.8.6. Обновить AGENTS.md и skills после уборки.

Описание: правила для Codex должны ссылаться на актуальные документы и не вести в архив.

Статус: **сделано 2026-07-11**. Обновлены `AGENTS.md`, `.agents/skills/docs-restructure/SKILL.md`, `.agents/skills/release-handoff/SKILL.md`: правила теперь ведут к `docs/README.md`, `docs/archive/README.md`, `tools/audit_project_files.mjs`, `npm run check:encoding` и запрещают тащить архив/мусор обратно в активную зону без отдельной задачи.

0.0.0.8.7. Обновить manual и tester instructions.

Описание: после reorganize пользовательские инструкции должны объяснять, где что лежит и как проверять desktop/browser.

Статус: **сделано 2026-07-11**. Обновлены `README.md`, `docs/04-user-release/README_FOR_TESTERS.md`, `docs/04-user-release/TEST_SCENARIOS.md`, `release/latest/tester-instructions.md`, `release/latest/release-notes.md`. Полный `docs/MY_OWN_WORLD_FULL_MANUAL.docx` не пересобирался намеренно: генератор `tools/generate_manual_docx.py` требует отдельной чистки старых строк перед безопасной регенерацией.

### 0.0.0.9. Desktop Product Hardening

Статус: **P1**.

0.0.0.9.1. Довести desktop install flow.

Описание: понятная инструкция: какой `.exe` запускать, когда нужен installer, где workspace, где backups, как обновляться без удаления данных.

0.0.0.9.2. Desktop workspace diagnostics.

Описание: экран диагностики выбранного workspace: pages count, assets count, broken refs, invalid backups, write permission, schema status.

0.0.0.9.3. Desktop large workspace smoke.

Описание: сценарий запуска на большом workspace: открыть, найти страницу, перенести, удалить тестовую страницу, открыть карту, запустить презентацию.

0.0.0.9.4. Desktop release gate.

Описание: перед сборкой installer прогонять verify, browser smoke, packaging smoke, desktop-specific checks и сохранять tester instructions.

### 0.0.0.10. Properties & Character UX Continuation

Статус: **P1**.

0.0.0.10.1. Довести блок “Свойства” до удобного конструктора.

Описание: поля можно свободно располагать, они не накладываются, resizing стабилен, сетка понятная, стандартные layouts аккуратные.

0.0.0.10.2. Улучшить DnD character calculations.

Описание: характеристики, навыки, владение/экспертность, КЗ, хиты, доспех, ручные overrides и подсветка ручных значений.

0.0.0.10.3. Упростить список блоков.

Описание: оставить понятные базовые блоки: текст, список, таблица, картинка, свойства. Специализированные блоки должны быть режимами внутри этих блоков, а не отдельной россыпью.

0.0.0.10.4. Связать свойства с картой.

Описание: карта должна брать HP, AC, initiative, effects и статус из CharacterModel/PropertiesModel, а не из случайных HTML-полей.

### 0.0.0.11. Campaign Map UX Continuation

Статус: **P1**.

0.0.0.11.1. Довести drawing tools.

Описание: полотно, карандаш, перо как в Figma, ластик, заливка, выбор цвета, последние цвета, слои для рисунков.

0.0.0.11.2. Довести music playlists.

Описание: минималистичный AIMP-like playlist: обычная/боевая музыка, play/stop/next/prev, shuffle, loop, автозапуск первой песни карты, быстрый список треков.

0.0.0.11.3. Довести initiative UX.

Описание: живые участники карты, ручной ввод инициативы, roll d20, отдельное окно ходов, next/previous, сохранение состояния.

0.0.0.11.4. Довести map layers.

Описание: слои объектов, существ, рисунков, тумана, locked fog zones и presentation order должны быть понятны и управляемы.

### 0.0.0.12. Data Safety & Sanitizer

Статус: **P1**.

0.0.0.12.1. Safe HTML boundary.

Описание: явно описать и проверить, какой HTML разрешен в карточках, таблицах, wiki-links, task tracker, campaign map.

0.0.0.12.2. Paste sanitization.

Описание: вставка текста/HTML не должна приносить скрипты, runtime UI и опасные атрибуты.

0.0.0.12.3. Schema recovery UI.

Описание: пользователь видит проблемы workspace и может применить безопасные repair actions после backup.

### 0.0.0.13. Release & CI

Статус: **P2**.

0.0.0.13.1. Поддерживать GitHub Actions verify/browser smoke.

0.0.0.13.2. Добавить artifacts/logs при падении Playwright.

0.0.0.13.3. Довести changelog/release notes/tester instructions.

0.0.0.13.4. Зафиксировать правило: перед push/merge проверки зеленые.

## Архив Выполненного

Подробности находятся в [WORK_LOG.md](./WORK_LOG.md).

- `0.0.0.1`: CharacterModel, Effects, Rule Tree integration foundation.
- `0.0.0.2`: Project structure, docs, release handoff, agent workflow layer.
- `0.0.0.3`: Desktop transition foundation.
- `0.0.0.4`: Campaign map drawing and map UX foundation.
- `0.0.0.5`: Backup / Restore foundation, page-first risky backup added.
- `0.0.0.6.1-0.0.0.6.11`: Knowledge Graph readable foundation, typed relationships, orphan pages view, domain lists.

Важно: `0.0.0.6` не считается полностью завершенным как продуктовая идея, потому что пользователь ожидает настоящую визуальную карту связей. Поэтому визуальная часть вынесена в активные подпункты `0.0.0.6.12-0.0.0.6.18`.
