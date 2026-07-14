---
summary: "Map of documentation zones and where each kind of project document belongs."
read_when:
  - "When looking for project documentation"
  - "When adding or moving markdown documents"
owner_zone: "delivery"
---

# Docs Map

Документация проекта разложена по зонам. Новые markdown-файлы нужно класть в одну из этих папок и добавлять metadata `summary`, `read_when`, `owner_zone`.

## Зоны

- `00-product` - продуктовый смысл: vision, roadmap, dashboard, brandbook, пользовательские сценарии.
- `01-delivery` - управление работой: активный план, work log, changelog, release process, аудит файлов.
- `02-architecture` - архитектура и contracts: модели, адаптеры, безопасность, desktop, UI, storage.
- `03-testing` - проверки: smoke checklist, browser/desktop сценарии, visual regression, code review template.
- `04-user-release` - материалы для пользователя и тестировщика: установка, known issues, tester instructions.
- `archive` - старые планы и документы, которые больше не являются активным источником правды.

## Правила

- Перед изменениями в docs запускать `node tools/docs_index.mjs`.
- Перед задачами с риском повреждения текста запускать `npm run check:encoding`.
- Не хранить активные планы в архиве и не ссылаться на архив как на главный источник правды.
- Если документ частично устарел, лучше выделить активную часть в правильную зону, а остаток перенести в архив отдельной задачей.
