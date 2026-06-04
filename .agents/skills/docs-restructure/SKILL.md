---
name: docs-restructure
description: "Реструктуризация документации, metadata, зоны docs и навигация для владельца продукта."
---

# Docs Restructure Skill

## Когда Использовать

Использовать при изменении структуры `docs/`, добавлении metadata, переносе документов по зонам, обновлении product dashboard, plan, work log или release handoff.

## Что Прочитать Перед Задачей

- `AGENTS.md`
- `docs/00-product/PRODUCT_DASHBOARD.md`
- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- `docs/02-architecture/AI_ONBOARDING.md`
- `docs/01-delivery/RELEASE_PROCESS.md`

## Что Обновить После Задачи

- `docs/01-delivery/PROJECT_PLAN.md`
- `docs/01-delivery/WORK_LOG.md`
- `README.md`, если изменились команды или входные точки
- `AGENTS.md`, если изменились правила для агента

## Проверки

- `node tools/docs_index.mjs`
- `node tools/validate_agent_skills.mjs`
- `npm run verify`, если изменены scripts или ссылки, влияющие на проверки

## Типовые Ошибки

- Не перемещать документы массово без обновления ссылок.
- Не создавать новые md-файлы без metadata, если задача как раз про docs-зоны.
- Не удалять старые документы без архивной причины.
- Не смешивать product, delivery, architecture, testing и user-release материалы.
