---
summary: "Optional cross-subsystem architecture overview; task workflow is owned by AGENTS.md."
read_when:
  - "When a task requires understanding relationships between subsystems beyond its local contract"
owner_zone: "architecture"
---
# AI Onboarding

Этот документ — справочный обзор архитектуры, когда для задачи не хватает понимания связей подсистем. Он не является обязательным pre-read: начать с task scope и `AGENTS.md`, затем открыть contract затронутого owner и ближайший code/test.

## Что Это За Проект

My own world - local-first приложение для ведения DnD/lore wiki.

Основные сущности:

- `card` - карточка лора, персонажа, предмета, навыка и т.д.;
- `campaignMap` - карта кампании с токенами, фигурами, туманом, слоями и инициативой;
- `taskTracker` - доска задач с колонками и карточками задач.

## Главные Архитектурные Правила

- Persistent content и runtime UI должны быть разделены.
- Runtime элементы должны иметь `data-runtime="true"` или жить вне persistent HTML.
- Карта должна сохраняться data-first через `CampaignMapModel` и serializer, а не через случайный DOM.
- Поиск страниц, parent chain, aliases, type и tags должны идти через PageRepository/PageIndex.
- Новые подсистемы лучше делать маленькими файлами с понятной ответственностью.
- Любые текстовые файлы и runtime strings - только UTF-8.

## Что Нельзя Ломать

- `id` страницы в front matter.
- `template`, `type`, `tags`, `aliases` в front matter.
- Clean-save boundary в `autosave.js` и `safeHtmlSanitizer.js`.
- `CampaignMapModel` как источник истины карты.
- `TaskTrackerModel` как источник истины трекера.
- Wiki-link правило: видимый текст пользователя не перезаписывать.
- Workspace local-first модель: данные пользователя лежат в выбранной папке.

## Workflow Owner

Глобальные правила scope, verification и обновления документации находятся в `AGENTS.md`. Этот обзор не добавляет обязательный pre-read, повторный verify перед edit или связку README/plan/log/DOCX. Для executable task соблюдать его verification contract; для затронутого поведения выбрать focused checks, расширяя их по риску. Release/build gates остаются обязательными в соответствующем release workflow.

## Где Смотреть

- `README.md` - обзор текущей архитектуры.
- `docs/01-delivery/PROJECT_PLAN.md` - нужный current-state/leaf при выборе или закрытии работы либо недостаточном состоянии в task prompt.
- `docs/01-delivery/WORK_LOG.md` - конкретная историческая запись, если без её решения нельзя понять текущий contract/code.
- `docs/02-architecture/contracts/BLOCK_SYSTEM_CONTRACT.md` - правила блоков.
- `docs/02-architecture/contracts/SAFE_HTML_CONTRACT.md` - граница безопасного HTML.
- `docs/02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md` - PageRepository/PageIndex.
- `docs/02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md` - риски карты.
- `docs/03-testing/UX_ONBOARDING_CHECKLIST.md` - пользовательский onboarding.

## Формат Задач Для Codex

Machine-readable задачи будущих автономных агентов описаны в [AGENT_TASK_CONTRACT.md](./contracts/AGENT_TASK_CONTRACT.md). Исполняемый формат - JSON `*.agent-task.json`, проверка - `npm run tasks:validate`, безопасное планирование - `npm run agent:task -- --dry-run <task-file>`. YAML-примеры допустимы только как человекочитаемые иллюстрации.

Хорошая задача:

- называет пункт плана;
- перечисляет ожидаемое поведение;
- говорит, нужен ли коммит/пуш;
- уточняет, какие проверки обязательны.

Пример:

```text
Делаем 17. Workspace Templates.
Нужно хранить шаблоны в workspace-файле, мигрировать localStorage,
добавить поиск и browser test. После выполнения коммит и пуш.
```

## Как Отвечать Пользователю

В конце работы сообщать:

- что изменилось;
- какие файлы важны;
- какие проверки прошли;
- какой следующий пункт плана логически следует.
