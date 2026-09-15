---
summary: "Optional task-to-owner router for project documentation."
read_when:
  - "When the task does not identify its documentation owner or when placing a new document"
owner_zone: "delivery"
---

# Documentation Routes

Используйте эту карту, если owner задачи ещё не известен. Она не является обязательным pre-read: открывайте только документ затронутой границы, затем ближайший code/test. Общие правила работы находятся в [AGENTS.md](../AGENTS.md).

| Область задачи | Текущий owner / нужная процедура |
| --- | --- |
| Выбор работы и current leaf | [PROJECT_PLAN](./01-delivery/PROJECT_PLAN.md); noticed issues — [backlog](./01-delivery/BUGS_AND_IMPROVEMENTS_BACKLOG.md) |
| Executable agent task | [Task contract](./02-architecture/contracts/AGENT_TASK_CONTRACT.md) и конкретный task JSON |
| Product direction / visual intent | [Product vision](./00-product/PRODUCT_VISION.md) / [Brandbook](./00-product/BRANDBOOK.md) |
| Editor blocks / persistent HTML | [Block contract](./02-architecture/contracts/BLOCK_SYSTEM_CONTRACT.md) / [Safe HTML](./02-architecture/contracts/SAFE_HTML_CONTRACT.md) |
| Page lookup / workspace mutations | [PageRepository](./02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md) / [Workspace operations](./02-architecture/contracts/LIGHTWEIGHT_WORKSPACE_OPERATIONS_CONTRACT.md) |
| Character / source properties | [CharacterModel](./02-architecture/contracts/CHARACTER_MODEL_CONTRACT.md) / [Properties](./02-architecture/contracts/PROPERTIES_MODEL_CONTRACT.md) |
| Map / combat | [Map performance](./02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md); session state — [Combat Session](./02-architecture/contracts/COMBAT_SESSION_CONTRACT.md); planned actions — [Action Pipeline](./02-architecture/contracts/COMBAT_ACTION_PIPELINE_CONTRACT.md) |
| Backup / persistent compatibility / assets | [Recovery](./02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md) / [Schema](./02-architecture/contracts/WORKSPACE_SCHEMA_CONTRACT.md) / [Asset lifecycle](./02-architecture/contracts/ASSET_LIFECYCLE_CONTRACT.md) |
| UI controls / popup behavior | [Design contract](./02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md) / [Popup lifecycle](./02-architecture/contracts/POPUP_LIFECYCLE_CONTRACT.md) |
| Desktop adapter / build | [Adapter boundaries](./02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md) / [Release policy](./02-architecture/desktop/DESKTOP_RELEASE_POLICY.md) |
| Выбор проверок / visual evidence | [Smoke routes](./03-testing/SMOKE_TESTS.md) / [Visual policy](./03-testing/VISUAL_REGRESSION.md); screenshot names — [manifest](./02-architecture/ui/UI_MIGRATION_BASELINES.md) |
| Release / tester handoff | [Release process](./01-delivery/RELEASE_PROCESS.md) / [Tester entry](./04-user-release/README_FOR_TESTERS.md) |

Документы размещаются по существующим зонам: `00-product`, `01-delivery`, `02-architecture`, `03-testing`, `04-user-release`. Для Markdown под `docs/` нужны `summary`, точный `read_when` и соответствующий `owner_zone`; проверка — `npm run docs:index`. `owner_zone` обозначает зону документации, а не нового владельца runtime-кода.

Для происхождения конкретного решения используйте нужную запись [WORK_LOG](./01-delivery/WORK_LOG.md) или [project archive registry](./archive/README.md). Research, generated manual и старые audit reports — условные references; они не задают current roadmap и не добавляют обязательную очередь чтения.

`Тех. зрелость/` и `Лог особенный/` остаются tracked historical exceptions. Семь Markdown из них скопированы в соседний `MOW_PERSONAL_ARCHIVE_EXPORT_2026-09-15`; оригиналы пока сохранены. Они не нужны active workflow. Удаление возможно только после отдельного подтверждения владельца, что внешний архив забран и читается. Project archive в `docs/archive/` остаётся частью Git. Ignored `legacy/` не используется для tracked истории.
