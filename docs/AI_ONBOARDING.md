# AI Onboarding

Этот документ нужен для Codex и других AI-помощников, которые будут входить в проект без полной истории переписки.

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

## Обязательные Проверки Перед Изменениями

Минимум:

```bash
npm run verify
```

Если менялся UI, карта, дерево, редактор, popup, task tracker или шаблоны:

```bash
npm run test:browser
```

Если менялась архитектура или публичные правила подсистем:

- обновить `README.md`;
- обновить `docs/PLANS_AND_TECH_DEBT.md`;
- обновить `docs/WORK_LOG.md`;
- обновить `docs/MY_OWN_WORLD_FULL_MANUAL.docx` через `python tools/generate_manual_docx.py`.

## Где Смотреть

- `README.md` - обзор текущей архитектуры.
- `docs/PLANS_AND_TECH_DEBT.md` - актуальный план.
- `docs/WORK_LOG.md` - история решений.
- `docs/BLOCK_SYSTEM_CONTRACT.md` - правила блоков.
- `docs/SAFE_HTML_CONTRACT.md` - граница безопасного HTML.
- `docs/PAGE_REPOSITORY_CONTRACT.md` - PageRepository/PageIndex.
- `docs/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md` - риски карты.
- `docs/UX_ONBOARDING_CHECKLIST.md` - пользовательский onboarding.

## Формат Задач Для Codex

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
