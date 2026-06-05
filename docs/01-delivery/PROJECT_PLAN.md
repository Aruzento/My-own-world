---
summary: "Single active project plan, backlog, priorities, and technical debt."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---
# Единый план проекта

Дата обновления: 05.06.2026

Этот файл является единственным актуальным источником плана работ, техдолга и направления развития проекта.

План ведется как **версионная дорожная карта**:

- каждый пункт плана получает номер в формате версии;
- первый актуальный пункт начинается с `0.0.0.1`;
- сделанные задачи не держатся наверху, а уходят в архив внизу файла;
- частично сделанные задачи остаются в активном плане, пока не закрыты полностью;
- если задача сейчас рано реализуется, но важна, она остается в активном плане как будущая версия.

## Философия Развития Продукта

Проект развивается не как набор независимых функций, а как единая операционная система для ведения НРИ-мира.

Каждая новая подсистема должна отвечать минимум одному из вопросов:

- помогает хранить знания мира;
- помогает проводить кампанию;
- помогает управлять игровыми сущностями;
- помогает управлять правилами;
- помогает переиспользовать контент между мирами.

Если новая подсистема не усиливает ни одну из этих областей, ее приоритет должен быть пересмотрен.

## Текущее Состояние Проекта

Текущая оценка технической зрелости: **4.35 / 5**.

Последняя оценка:

`Тех. зрелость/04.06.2026 - оценка после закрытия Desktop Foundation.md`

Проект сейчас - это local-first приложение для ведения DnD/НРИ-мира. Оно умеет работать как web-приложение в браузере и как desktop-приложение через Tauri. Данные мира лежат в workspace-папке: карточки, карты, task tracker, assets, backup и служебные файлы.

## Куда Идем Дальше

Практический следующий фокус:

1. создать `CharacterModel`;
2. отделить продуктовые, релизные, тестовые и инженерные материалы через `Project Structure & Release Handoff Reorganization`;
3. связать свойства карточек, хиты, навыки, инвентарь и карту через модель, а не через HTML;
4. поднять `Knowledge Graph` и `Rule Tree` как вторую доменную опору после `CharacterModel`;
5. добавить `World Package Foundation` как базу будущего экспорта, импорта, fork-модели и Workshop;
6. усилить assets, recovery и storage hardening;
7. продолжать добавлять regression tests к каждому P0/P1 изменению;
8. развивать карту, task tracker и UX уже поверх устойчивых моделей.

## Продуктовое Видение

MyOwnWorld - это local-first операционная система для НРИ-мира.

Цель проекта - объединить в одной модели мира:

- знания;
- карту;
- персонажей;
- игровые правила;
- игровые объекты;
- кампании;
- связи между сущностями.

Ключевой принцип:

Карта, карточки, персонажи, правила и игровые данные должны существовать как единая доменная модель, а не как отдельные несвязанные инструменты.

## Продуктовые Опоры

У проекта есть четыре ключевые доменные опоры:

1. `CharacterModel` - персонажи, существа, хиты, навыки, инвентарь, эффекты и игровые состояния.
2. `Rule Tree` - правила, справочники, системные знания, homebrew и канонические базы.
3. `Knowledge Graph` - связи между сущностями мира.
4. `World Package System` - экспорт, импорт, переиспользование и будущий Workshop.

Перед добавлением любой крупной системы нужно проверить:

1. Усиливает ли она `CharacterModel`?
2. Усиливает ли она `Rule Tree`?
3. Усиливает ли она `Knowledge Graph`?
4. Усиливает ли она `World Package System`?

Если ответ "нет" на все четыре вопроса, задача должна проходить дополнительную проверку необходимости.

## Структура Проекта Простыми Словами

`index.html` - главный HTML-каркас приложения.

`presentation.html` - отдельная страница режима презентации карты.

`js/app.js` - точка входа приложения.

`js/editor/` - редактор карточек и карт: toolbar, форматирование, карта кампании, туман, слои, токены, фигуры, презентация, свойства и сохранение.

`js/editor/blocks/` - система блоков карточки: runtime/persistent, сериализация, controls и upgrades.

`js/properties/` - свойства карточек и расчеты; мост к будущему `CharacterModel`.

`js/storage/` - workspace, файлы, assets, backup/restore и adapter layer.

`js/schema/` - проверка данных workspace.

`js/repository/` - `PageRepository` и `PageIndex`.

`js/tree/` - дерево сущностей, контекстное меню, drag and drop и move planner.

`js/taskTracker/` - отдельная подсистема таск-трекера.

`js/templates/` - генераторы HTML для карточек, карт, task tracker и блоков.

`js/ui/` - общие UI-подсистемы.

`js/presentation/` - runtime отдельного окна презентации карты.

`styles/` - CSS приложения.

`assets/` - встроенные ассеты приложения.

`src-tauri/` - desktop-оболочка Tauri.

`tools/` - служебные скрипты проверок, сборок и agent workflow.

`tests/` - unit tests и browser tests.

`docs/` - документация проекта. После реструктуризации должна быть разделена на продуктовую, delivery, архитектурную, тестовую и пользовательско-релизную зоны.

`docs/00-product/` - продуктовая зона для владельца продукта: vision, strategy, roadmap, PO discovery и personas.

`docs/01-delivery/` - зона управления разработкой: project plan, work log, changelog и release process.

`docs/02-architecture/` - инженерная зона Codex: contracts, adapters, storage, desktop, security и другие технические решения.

`docs/03-testing/` - зона тестирования: smoke tests, visual regression, desktop smoke и тестовые сценарии.

`docs/04-user-release/` - материалы для внешнего тестирования: installation guide, tester readme, known issues и test scenarios.

`release/` - будущая зона релизной передачи: installer, portable build, release notes, tester instructions и known issues.

`.agents/skills/` - agent workflow маршруты для типовых задач Codex.

`Тех. зрелость/` - оценки зрелости проекта.

`Лог особенный/` - художественная летопись проекта.

## План

### 0.0.0.1. Character Domain Model

Статус: **частично сделано: foundation CharacterModel создан, карта связана с модельным слоем для HP/инициативы, InventoryModel, EffectsModel, источники эффектов и Full Character Sheet UX добавлены**.
Приоритет: **P0/P1**.

Зачем: персонажи, существа, хиты, навыки, инвентарь, эффекты и карта должны опираться на одну модель, а не на чтение HTML-блоков.

0.0.0.1.1. Спроектировать `CharacterModel`: **сделано foundation**.

0.0.0.1.2. Описать `CHARACTER_MODEL_CONTRACT.md`: **сделано foundation**.

0.0.0.1.3. Сделать чтение базовых характеристик из `PropertiesModel`: **сделано foundation**.

0.0.0.1.4. Сделать чтение legacy `Стат. блок DnD` как fallback: **сделано foundation**.

0.0.0.1.5. Вынести HP, временные HP, смерть/нокаут и proficiency в model-first API: **сделано foundation**.

0.0.0.1.6. Связать карту с `CharacterModel`: рамки здоровья, изменение хитов, инициатива: **сделано foundation**.

0.0.0.1.7. Добавить Inventory System: **сделано foundation**.

0.0.0.1.8. Добавить Effects / Conditions System: **сделано foundation**.

0.0.0.1.8.1. Сделать UI активных эффектов и состояний в карточке: **сделано foundation**.

0.0.0.1.8.2. Подключить EffectsModel к карте, инициативе и проверкам: **сделано foundation**.

0.0.0.1.8.3. Подготовить связь эффектов с инвентарем, Rule Tree и World Packages: **сделано foundation**.

0.0.0.1.8.4. Расширить Effects UI до полноценного выбора источника из карточек предметов, заклинаний, навыков и будущего Rule Tree: **сделано foundation**.

0.0.0.1.8.5. Добавить автоматическое применение эффектов от экипированных предметов и выбранных правил после появления Rule Tree: **сделано частично: автоэффекты от предметов работают, Rule Tree provider остается будущим подпунктом**.

0.0.0.1.9. Сделать Full Character Sheet UX: **сделано foundation**.

0.0.0.1.10. Решить судьбу архивных экспериментов `DnD v2` и `Переменные`: **сделано foundation: идея перенесена в `PropertiesModel` / `CardVariablesModel` / `CharacterModel`**.

0.0.0.1.11. Подготовить API интеграции `CharacterModel` с `Rule Tree`: **сделано foundation**.

0.0.0.1.12. Подготовить API интеграции `CharacterModel` с `Effects System`: **сделано foundation**.

0.0.0.1.13. Подготовить API интеграции `CharacterModel` с `World Packages`: **сделано foundation**.

0.0.0.1.14. Добавить Rule Tree provider и отдельную сущность Rule Tree для автоматических эффектов: **сделано foundation**.

Зачем: после появления `Rule Tree` выбранные правила должны отдавать эффекты в тот же pipeline, что предметы, заклинания и навыки. Целевая модель - отдельная сущность `ruleTree`, а legacy карточки с тегом `rule` остаются только мостом миграции.

0.0.0.1.14.1. Добавить отдельную сущность `Rule Tree`: **сделано foundation**.

Сделано: добавлен template `ruleTree`, special open/save, runtime UI и persistent JSON `data-rule-tree-data`.

0.0.0.1.14.2. Добавить `RuleTreeModel` и data-first save: **сделано foundation**.

Сделано: правила и активные `ruleId` хранятся в модели, runtime UI не попадает в markdown.

0.0.0.1.14.3. Подключить `Rule Tree` к `CharacterModel`: **сделано foundation**.

Сделано: provider читает активные правила из сущностей `ruleTree` и отдает эффекты в общий `EffectsModel` pipeline.

0.0.0.1.14.4. Добавить bridge миграции legacy `card#rule` в `Rule Tree`: **сделано foundation**.

Сделано: старые страницы с тегами `rule`, `rules`, `правило`, `правила` показываются как кандидаты на импорт в сущности Rule Tree.

0.0.0.1.14.5. Добавить UI выбора правил из Rule Tree для конкретной карточки персонажа: **сделано foundation**.

Сделано: блок `Эффекты и состояния` показывает select правил из Rule Tree, сохраняет выбранные правила в `selectedRuleIds`, а `CharacterModel` применяет их через provider.

0.0.0.1.14.6. Развить Rule Tree до настоящего дерева правил: **сделано foundation**.

Сделано: в Rule Tree data model добавлены группы, категории, условия, наследование и future package id; UI показывает правила по группам и умеет добавлять группы.

0.0.0.1.14.7. Добавить полноценный редактор условий применения правила: **сделано foundation**.

Сделано: Rule Tree UI позволяет менять группу, категорию, наследуемые rule id, package id и добавлять/удалять условия `level`, `state`, `card-variable`, `manual`, `formula` через `RuleTreeModel`.

0.0.0.1.14.8. Добавить Rule Package import/export и предпросмотр итоговых эффектов правил: **сделано foundation**.

Сделано: Rule Tree показывает предпросмотр активных эффектов, умеет экспортировать JSON пакета и импортировать JSON обратно с пометкой `sourceType: rulePackage`.

0.0.0.1.14.9. Усилить Rule Tree до полноценного rule engine.

Зачем: foundation закрывает редактирование и перенос правил, но следующие версии должны валидировать условия, рассчитывать наследование, связывать правила с World Packages как файлами workspace и применять условия не только как сохраненные метаданные, а как исполняемый расчетный слой.

0.0.0.1.15. Расширить Full Character Sheet UX до редактируемого листа.

Зачем: текущий лист является расчетной runtime-витриной. Следующий уровень - редактирование основных полей через модель, без ручного поиска по HTML.

0.0.0.1.16. Добавить расчетные переменные и зависимости между карточками.

Зачем: `CardVariablesModel` уже фиксирует свойства карточки как переменные сущности. Следующий уровень - формулы, зависимости от race/class/rule и просмотр цепочки расчета.

### 0.0.0.2. Project Structure & Release Handoff Reorganization

Статус: **сделано базово: docs/release разложены по зонам, agent workflow layer подключен, metadata добавлена**.
Приоритет: **P0, закрыт как foundation; дальнейшие улучшения ведутся отдельными пунктами**.

Зачем: проект уже стал понятен Codex как инженерная система, но становится сложным для владельца продукта. Этот пункт отделяет продуктовые артефакты, релизные материалы, тестовые материалы, инженерную документацию и внутренние рабочие файлы.

0.0.0.2.1. Пересобрать структуру `docs/`: **сделано базово**.

Текущая структура:

```text
docs/
├── 00-product/
├── 01-delivery/
├── 02-architecture/
│   ├── adapters/
│   ├── contracts/
│   ├── desktop/
│   ├── security/
│   └── storage/
├── 03-testing/
├── 04-user-release/
└── archive/
```

0.0.0.2.2. Создать продуктовую зону `docs/00-product/`: **сделано базово**.

Созданы или актуализированы: `PRODUCT_DASHBOARD.md`, `PRODUCT_VISION.md`, `PRODUCT_STRATEGY.md`, `ROADMAP.md`, `PO_DISCOVERY.md`, `USER_PERSONAS.md`, `CURRENT_MILESTONE.md`.

0.0.0.2.3. Создать delivery-зону `docs/01-delivery/`: **сделано базово**.

Живые источники теперь здесь: `PROJECT_PLAN.md`, `WORK_LOG.md`, `CHANGELOG.md`, `RELEASE_PROCESS.md`, `PROJECT_FILE_AUDIT.md`.

0.0.0.2.4. Создать инженерную зону `docs/02-architecture/`: **сделано базово**.

Контракты перенесены в `docs/02-architecture/contracts/`, desktop-документы - в `docs/02-architecture/desktop/`, security/adapters/storage получили отдельные зоны.

0.0.0.2.5. Создать тестовую зону `docs/03-testing/`: **сделано базово**.

Созданы или перенесены: `SMOKE_TESTS.md`, `VISUAL_REGRESSION.md`, `DESKTOP_SMOKE.md`, `CODE_REVIEW_TEMPLATE.md`, `UX_ONBOARDING_CHECKLIST.md`, `sample-workspace/`.

0.0.0.2.6. Создать пользовательско-релизную зону `docs/04-user-release/`: **сделано базово**.

Созданы: `README_FOR_TESTERS.md`, `HOW_TO_INSTALL.md`, `KNOWN_ISSUES.md`, `TEST_SCENARIOS.md`.

0.0.0.2.7. Создать отдельную папку `release/`: **сделано базово**.

Структура:

```text
release/
├── latest/
├── candidates/
└── archive/
```

0.0.0.2.8. Создать структуру `release/latest/`: **сделано базово**.

Созданы `installer/`, `portable/`, `release-notes.md`, `tester-instructions.md`, `known-issues.md`.

0.0.0.2.9. Создать `release/candidates/`: **сделано базово**.

0.0.0.2.10. Создать `release/archive/`: **сделано базово**.

0.0.0.2.11. Ввести Release Handoff Rules: **сделано базово**.

Правило: после каждой задачи, влияющей на релиз или тестирование, Codex должен обновлять `docs/01-delivery/PROJECT_PLAN.md`, `docs/01-delivery/WORK_LOG.md`, `release/latest/release-notes.md`, `release/latest/tester-instructions.md`. Если меняется пользовательское поведение, также обновлять `docs/04-user-release/KNOWN_ISSUES.md`, `docs/04-user-release/TEST_SCENARIOS.md`, `docs/04-user-release/README_FOR_TESTERS.md`.

0.0.0.2.12. Создать Product Visibility Layer: **сделано базово**.

Минимум выполнен: `PRODUCT_DASHBOARD.md`, `ROADMAP.md`, `CURRENT_MILESTONE.md`.

0.0.0.2.13. Провести аудит `docs/` и разложить файлы по зонам: **сделано базово**.

0.0.0.2.14. Обновить ссылки в README, AI onboarding, release process и plan после перемещения документов: **сделано базово**.

0.0.0.2.15. Добавить правило: новые документы нельзя класть напрямую в корень `docs/`, если для них есть целевая зона: **сделано**.

Правило закреплено в `AGENTS.md` и поддерживается через `tools/docs_index.mjs`.

0.0.0.2.16. Добавить agent workflow layer: **сделано базово**.

Создано:

- `AGENTS.md`;
- `.agents/skills/`;
- `tools/docs_index.mjs`;
- `tools/validate_agent_skills.mjs`;
- `tools/safe_commit.mjs`;
- `docs/03-testing/CODE_REVIEW_TEMPLATE.md`.

0.0.0.2.17. Добавить metadata для docs: **сделано базово**.

Все markdown-документы в `docs/`, кроме демонстрационных workspace-страниц, имеют `summary`, `read_when`, `owner_zone`; проверяется через `npm run docs:index`.

Оставшиеся хвосты после foundation:

- наполнить пользовательские release-документы перед реальным внешним релизом;
- держать `release/latest/*` синхронно с каждым user-facing изменением;
- расширять product discovery и personas по мере появления новых пользовательских сценариев;
- не добавлять новые markdown-документы в корень `docs/`.

### 0.0.0.3. Asset Lifecycle UI И Media Foundation

Статус: **частично сделано: contract/checkers/tests есть, UI не сделан**.
Приоритет: **P1**.

0.0.0.3.1. Сделать UI проверки broken assets.

0.0.0.3.2. Сделать UI проверки orphan assets.

0.0.0.3.3. Сделать безопасное удаление orphan assets после подтверждения.

0.0.0.3.4. Добавить missing/fallback UI для картинок, которые не найдены.

0.0.0.3.5. Расширить `AssetReference` под audio и playlist как first-class assets.

0.0.0.3.6. Сделать Music by Location System.

0.0.0.3.7. Проверить asset lifecycle одинаково в browser и desktop.

### 0.0.0.4. Campaign Map v2 Hardening

Статус: **частично сделано: карта функциональна, но много будущего UX/physics/performance**.
Приоритет: **P1**.

0.0.0.4.1. Добавить stress tests для больших карт, большого количества токенов, фигур, слоев и fog operations.

0.0.0.4.2. Добавить real pointer painting stress для тумана.

0.0.0.4.3. Довести locked fog zones.

0.0.0.4.4. Добавить dirty-region save для тумана, если это окажется выгоднее текущего full image save.

0.0.0.4.5. Довести mass select.

0.0.0.4.6. Улучшить инициативу.

0.0.0.4.7. Добавить рисование поверх карты.

0.0.0.4.8. Добавить выбор навыков/способностей существа на карте.

0.0.0.4.9. Продолжить оптимизацию presentation sync.

### 0.0.0.5. Data Recovery И Storage Hardening

Статус: **частично сделано: validation/recovery/backup есть, repair-actions и structured errors не сделаны**.
Приоритет: **P1**.

0.0.0.5.1. Добавить безопасные repair-actions для recovery screen.

0.0.0.5.2. Добавить browser/storage tests для каждого repair-action.

0.0.0.5.3. Расширить schema versions под будущие upgrades.

0.0.0.5.4. Добавить structured error objects в desktop/Rust commands.

0.0.0.5.5. Убрать оставшиеся прямые `state.workspaceHandle`.

0.0.0.5.6. Добавить automatic lightweight snapshots перед рискованными операциями.

0.0.0.5.7. Добавить UI настройки backup retention.

### 0.0.0.6. Knowledge Graph И Rule Tree

Статус: **частично сделано: KnowledgeGraph foundation есть, graph UI и rule tree не сделаны**.
Приоритет: **P1**.

Зачем: Knowledge Graph и Rule Tree являются ключевыми доменными системами продукта. Graph показывает связи мира, а Rule Tree превращает правила и справочники в структурированную базу знаний, которую смогут использовать CharacterModel, карта, кампании и будущие пакеты мира.

0.0.0.6.1. Добавить отдельную сущность "граф связей".

0.0.0.6.2. Сделать graph view.

0.0.0.6.3. Расширить typed relationships.

0.0.0.6.4. Сделать orphan pages view.

0.0.0.6.5. Сделать Rule Tree / Rules Knowledge Base.

0.0.0.6.6. Связать Rule Tree с будущими ролями и правами.

0.0.0.6.7. Поддержать отображение связей персонажей.

0.0.0.6.8. Поддержать отображение связей предметов.

0.0.0.6.9. Поддержать отображение связей организаций.

0.0.0.6.10. Поддержать отображение связей между правилами и сущностями.

0.0.0.6.11. Подготовить foundation для визуального исследования мира.

### 0.0.0.7. World Package Foundation

Статус: **не сделано**.
Приоритет: **P1**.

Зачем: это будущая система переиспользования контента и одна из главных продуктовых ценностей. Пользователь должен иметь возможность экспортировать и импортировать связанные наборы данных любого масштаба: персонажа, город, регион, карту, кампанию, rule module или полноценный мир.

0.0.0.7.1. Спроектировать формат `World Package`.

0.0.0.7.2. Описать `WORLD_PACKAGE_CONTRACT.md`.

0.0.0.7.3. Добавить экспорт пакетов мира.

0.0.0.7.4. Добавить импорт пакетов мира.

0.0.0.7.5. Добавить metadata пакетов.

0.0.0.7.6. Добавить проверку зависимостей пакетов.

0.0.0.7.7. Подготовить foundation для fork-модели миров.

0.0.0.7.8. Подготовить foundation для будущего Workshop.

0.0.0.7.9. Подготовить безопасный import preview перед записью в workspace.

0.0.0.7.10. Добавить backup/snapshot перед импортом пакета.

0.0.0.7.11. Добавить tests на export/import маленького пакета, кампании и полного мира.

### 0.0.0.8. Desktop Release Hardening

Статус: **частично сделано: desktop foundation закрыт, release hardening не сделан**.
Приоритет: **P2**.

Зачем: desktop foundation уже закрыт, desktop build и installer существуют. Дальнейшее desktop-направление важно, но текущий главный риск продукта находится не в desktop, а в доменной модели, управляемости проекта и подготовке контента к переиспользованию.

0.0.0.8.1. Добавить настоящий Tauri UI click-runner.

0.0.0.8.2. Добавить desktop storage runner поверх реального Tauri окна.

0.0.0.8.3. Проверить manual desktop smoke на большом workspace.

0.0.0.8.4. Добавить platform matrix.

0.0.0.8.5. Добавить signing plan.

0.0.0.8.6. Добавить updater/update flow.

0.0.0.8.7. Добавить native image/audio picker только если WebView file input подтвердит ограничения.

0.0.0.8.8. Уточнить package version и git tags.

### 0.0.0.9. Properties UX И Игровые Данные

Статус: **частично сделано: блоки свойств есть, UX и игровые поля требуют развития**.
Приоритет: **P1/P2**.

0.0.0.9.1. Улучшить селекторы в блоках `Свойства`.

0.0.0.9.2. Доработать схемы свойств.

0.0.0.9.3. Добавить уровни навыка, тип действия, дистанцию, область, форму, эффект и scaling.

0.0.0.9.4. Перевести расчеты инициативы, здоровья и способностей на `CharacterModel`.

0.0.0.9.5. Сделать migration path от property blocks к полноценному character sheet.

### 0.0.0.10. Design System & UI Modernization

Статус: **частично сделано: UI audit, design system contract и design tokens foundation подготовлены; полный редизайн не начинался**.
Приоритет: **P1/P2**.

Зачем: интерфейс должен стать цельным, современным и удобным для долгой работы. Сейчас проект функционально растет быстрее, чем визуальная система. Без дизайн-системы новые UI-фичи будут добавлять визуальный хаос.

0.0.0.10.1. Провести UI audit: **сделано foundation**.

0.0.0.10.2. Описать Design System Contract: **сделано foundation**.

0.0.0.10.3. Создать `styles/design-tokens.css`: **сделано foundation**.

0.0.0.10.4. Описать animation guidelines и `prefers-reduced-motion`: **сделано foundation**.

0.0.0.10.5. Подготовить phased rollout: **сделано foundation**.

0.0.0.10.6. Phase 2 - Popup & buttons refresh.

0.0.0.10.7. Phase 3 - App shell refresh.

0.0.0.10.8. Phase 4 - Card/editor refresh.

0.0.0.10.9. Phase 5 - Campaign map UI refresh.

0.0.0.10.10. Phase 6 - Task tracker refresh.

0.0.0.10.11. Phase 7 - Desktop polish.

0.0.0.10.12. Добавлять visual regression coverage для каждого UI-этапа.

### 0.0.0.11. Visual Regression И Large Workspace E2E

Статус: **частично сделано: smoke/guards есть, baseline и большие E2E не сделаны**.
Приоритет: **P1/P2**.

0.0.0.11.1. Добавить screenshot baseline approval flow.

0.0.0.11.2. Добавить large workspace E2E tests.

0.0.0.11.3. Добавить visual baseline для presentation window.

0.0.0.11.4. Добавить визуальные проверки для новых popup, map controls, property blocks и character sheet.

0.0.0.11.5. Поддерживать правило: каждое P0/P1 UI-изменение получает regression или visual guard.

### 0.0.0.12. Task Tracker И Templates v2

Статус: **частично сделано: MVP есть, расширение не сделано**.
Приоритет: **P2**.

0.0.0.12.1. Task tracker: дедлайны.

0.0.0.12.2. Task tracker: приоритет.

0.0.0.12.3. Task tracker: фильтры и поиск.

0.0.0.12.4. Task tracker: архив задач.

0.0.0.12.5. Task tracker: связь задачи с карточкой.

0.0.0.12.6. Templates: улучшить поиск, категории и preview.

0.0.0.12.7. Templates: добавить tests на edge cases и workspace migration.

### 0.0.0.13. UX / Workspace / Multi-Panel

Статус: **частично сделано: onboarding есть, будущие UX-системы не сделаны**.
Приоритет: **P2/P3**.

0.0.0.13.1. Расширить sample workspace.

0.0.0.13.2. Сделать разделенный editor на две рабочие области.

0.0.0.13.3. Добавить recent workspaces.

0.0.0.13.4. Добавить system menu для desktop.

0.0.0.13.5. Добавить отдельное reference-card window в desktop.

0.0.0.13.6. Поддерживать onboarding при добавлении новых систем.

### 0.0.0.14. Tables v2

Статус: **частично сделано: базовые таблицы стабильны, сложные таблицы не сделаны**.
Приоритет: **P2/P3**.

0.0.0.14.1. Поддержать сложные таблицы.

0.0.0.14.2. Поддержать merged cells.

0.0.0.14.3. Добавить tests для сложных таблиц.

0.0.0.14.4. Проверить save/load вложенного форматирования.

### 0.0.0.15. Release И Versioning

Статус: **частично сделано: release process есть, version/tag discipline и release handoff не закрыты**.
Приоритет: **P2**.

0.0.0.15.1. Согласовать `package.json.version` с git tags.

0.0.0.15.2. Ввести правило: пункт плана закрывается коммитом с номером версии пункта.

0.0.0.15.3. Добавить changelog entries под новую версионность плана.

0.0.0.15.4. Уточнить rollback guide для desktop installer.

0.0.0.15.5. Добавить release candidate checklist.

0.0.0.15.6. Связать release process с новой папкой `release/`.

0.0.0.15.7. Добавить правило подготовки `release/latest/` после успешного release candidate.

0.0.0.15.8. Добавить release handoff checklist для владельца продукта.

0.0.0.15.9. Добавить tester handoff checklist для передачи сборки другим людям.

### 0.0.0.16. Account / Roles / Permissions

Статус: **не сделано**.
Приоритет: **P3**.

Зачем: локальному продукту пока не требуется развитая ролевая система. Большинство ближайших сценариев использования остаются однопользовательскими. Роли и permissions нужны позже - перед Rule Tree hardening, protected canon data и web/cloud моделью.

0.0.0.16.1. Спроектировать локальную account system.

0.0.0.16.2. Добавить роли: `user`, `PRO user`, `admin`.

0.0.0.16.3. Сделать permission layer.

0.0.0.16.4. Ограничить редактирование защищенных зон, rule tree и будущих системных действий.

0.0.0.16.5. Подготовить роли к web/cloud модели.

### 0.0.0.17. Web / Cloud Readiness

Статус: **описано стратегически, не реализовано**.
Приоритет: **P3**.

Зачем: web/cloud направление остается стратегически важным, но сначала нужно завершить основные доменные модели, package foundation, local-first ownership и release handoff.

0.0.0.17.1. Расширить Safe HTML под cloud threat model.

0.0.0.17.2. Спроектировать auth.

0.0.0.17.3. Спроектировать ownership.

0.0.0.17.4. Спроектировать server-side validation.

0.0.0.17.5. Спроектировать BackendStorageAdapter.

0.0.0.17.6. Спроектировать sync/conflict resolution.

0.0.0.17.7. Подготовить CSP и security headers для web-версии.

### 0.0.0.18. Documentation Maintenance

Статус: **постоянная задача**.
Приоритет: **P1**.

Зачем: после Project Structure & Release Handoff Reorganization документация должна поддерживаться не только по факту изменений, но и по зонам ответственности: product, delivery, architecture, testing, user-release и archive.

0.0.0.18.1. Обновлять `README.md`.

0.0.0.18.2. Обновлять `docs/MY_OWN_WORLD_FULL_MANUAL.docx`.

0.0.0.18.3. Обновлять contract-файлы.

0.0.0.18.4. Поддерживать `docs/01-delivery/WORK_LOG.md`.

0.0.0.18.5. Поддерживать `docs/01-delivery/PROJECT_FILE_AUDIT.md`.

0.0.0.18.6. Поддерживать `Лог особенный/Летопись королевства My own world.md`.

0.0.0.18.7. Поддерживать `docs/00-product/`.

0.0.0.18.8. Поддерживать `docs/01-delivery/`.

0.0.0.18.9. Поддерживать `docs/02-architecture/`.

0.0.0.18.10. Поддерживать `docs/03-testing/`.

0.0.0.18.11. Поддерживать `docs/04-user-release/`.

0.0.0.18.12. Поддерживать `release/latest/`.

## Рекомендуемый Следующий Пункт

Следующий рабочий пункт: **0.0.0.1. Character Domain Model**.

Сразу после закрытия первого слоя `Character Domain Model` следующим рабочим пунктом становится **0.0.0.2. Project Structure & Release Handoff Reorganization**.

Причина: проекту нужна не только новая доменная модель, но и управляемая структура, в которой владелец продукта видит релизные материалы, тестовые материалы, продуктовые решения и инженерную документацию отдельно.

## Product Owner Update Notes

План обновлен с учетом Product Owner анализа:

- добавлено продуктовое видение;
- добавлена философия единой операционной системы НРИ-мира;
- поднят приоритет доменных систем;
- добавлен `Project Structure & Release Handoff Reorganization`;
- добавлен `World Package Foundation`;
- добавлен `agent workflow layer`;
- понижен приоритет roles/web/cloud до завершения доменных моделей;
- release handoff выделен как отдельная зона ответственности.

## Архив Сделанного

Этот раздел содержит закрытые задачи. Они опущены вниз, чтобы верхний план показывал только будущую работу.

### A. Block System Contract

Сделано: persistent/runtime разделение, сериализация форм, правила block types, selective upgrades, `data-runtime`.

### B. Drag and Drop

Сделано: DnD блоков, дерева и task tracker; pointer-based tree DnD; tests drop intent/move planner.

### C. UI И Popup

Сделано: popup lifecycle contract, popup manager, viewport positioning, Escape/outside click, trigger toggle, popup regression.

### D. Карточки И Редактор

Сделано: card shell, типы карточек, tags/aliases, wiki-links, image upload/crop/delete, image block, properties foundation, editor history, formatting service.

### E. Карта Кампании

Сделано: отдельная сущность карты, `CampaignMapModel`, data-first save, tokens, objects, shapes, fog, layers, initiative MVP, selection MVP, presentation mode, model-first presentation, privacy, delta-sync, dirty-region fog sync.

### F. Task Tracker

Сделано: отдельная сущность, колонки, задачи, удаление, pointer DnD, model-first save/read, tests.

### G. PageRepository / PageIndex

Сделано: repository/index по id/title/aliases/parent/type/tags, lifecycle, wiki/search/duplicates/map picker/templates lookup, tests.

### H. Safe HTML / Sanitizer

Сделано: contract, allowlist, sanitizer save/load/paste, security regression.

### I. Schema Validation / Recovery

Сделано: schema contracts, validators, recovery report, fallback screen, validation gate, tests.

### J. Backup / Restore

Сделано: backup/recovery contract, manual backup, restore dialog, assets backup, retention policy, tests.

### K. Tests / CI / Visual Safety

Сделано: GitHub Actions Verify, unit/browser tests, visual guards, smoke checklist.

### L. Tables

Сделано: contract, column resize, selection, paste/plain text, keyboard navigation, table toolbar foundation.

### M. Asset Lifecycle Foundation

Сделано: contract, `AssetReference`, scanner, broken checker, orphan detector, renderable image fallback.

### N. Desktop Foundation

Сделано: Tauri shell, StorageAdapter/AssetAdapter, FS commands, workspace picker, backup/restore gate, presentation window, production dist, installer, release policy, packaging smoke, performance notes.

### O. Documentation

Сделано: единый план, work log, manual, AI onboarding, README updates, contracts, file audit, maturity assessments, летопись.
