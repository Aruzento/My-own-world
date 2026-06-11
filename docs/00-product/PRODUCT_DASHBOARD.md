---
summary: "Product dashboard with current project focus and links."
read_when:
  - "Before product planning"
  - "When changing product direction"
owner_zone: "product"
---
# Product Dashboard

## Сейчас

MyOwnWorld - local-first операционная система для НРИ-мира. Проект поддерживает карточки, карты кампаний, task tracker, wiki-links, свойства, backup/restore, tests и desktop foundation через Tauri.

Текущая оценка зрелости: **4.35 / 5**.

## Следующий Главный Фокус

`0.0.0.0. Unified Properties & Human-Friendly Character System`

Причина: текущий путь через отдельную сущность Rule Tree оказался слишком инженерным и непонятным для обычного пользователя. Главный пользовательский сценарий переносится в карточку: блок `Свойства`, настраиваемые параметры, понятные расчеты, ручные значения и редактируемый лист персонажа. `CharacterModel` остается важным backend-слоем, но сначала нужно сделать человеческий интерфейс, через который владелец мира реально управляет свойствами, статами, эффектами и правилами.

## Ключевые Риски

- Нет нового `Properties System Contract`, который закрепляет свойства как главный пользовательский слой параметров, эффектов и расчетов.
- `CharacterModel` есть как направление, но его нужно подчинить понятному блоку `Свойства`, а не отдельным конкурирующим stat/character/effects-блокам.
- Rule Tree существует, но больше не должен быть главным пользовательским способом настройки правил.
- Нет asset UI для broken/orphan assets.
- Нет настоящего Tauri UI click-runner.
- Release handoff еще только формируется.
- Документация пока не полностью разложена по зонам.

## Где Читать Дальше

- План: `docs/01-delivery/PROJECT_PLAN.md`
- Журнал работ: `docs/01-delivery/WORK_LOG.md`
- Правила агента: `AGENTS.md`
