---
summary: "architecture document for WORKSPACE_SCHEMA_CONTRACT.md."
read_when:
  - "Before changing the related subsystem"
  - "When updating architecture decisions"
owner_zone: "architecture"
---
# Workspace Schema Contract

Дата: 01.06.2026

Этот документ описывает первый слой проверки данных проекта. Его цель - не чинить данные молча, а явно находить поврежденные страницы, карты, таск-трекеры, связи и assets до того, как ошибка станет потерей пользовательской работы.

## Главный принцип

Schema validation работает в режиме **diagnostics first**:

- валидатор возвращает список ошибок и предупреждений;
- валидатор не меняет данные сам;
- нормализация и recovery должны быть отдельными явными действиями;
- старые страницы не должны ломаться только потому, что появился новый валидатор;
- критичные ошибки должны быть понятны человеку: где ошибка, что сломано, почему это опасно.

## Уровни строгости

- `error` - данные повреждены или опасны для сохранения. Пример: нет `id`, родитель указывает на несуществующую страницу, карта содержит токен без `tokenId`.
- `warning` - данные открываются, но требуют внимания. Пример: неизвестная версия схемы, дубли названий, пустой title, неизвестный тип страницы.
- `info` - диагностическая подсказка без риска для данных.

## Workspace

Workspace считается валидным, если:

- есть массив страниц;
- у каждой страницы есть стабильный `id`;
- `id` не дублируется;
- `parent` равен `null` или указывает на существующую страницу;
- нет циклов parent-chain;
- порядок `order` является числом или может быть восстановлен отдельно;
- title не пустой;
- template/type принадлежат известным системам или явно считаются legacy.

## Page Metadata

Минимальный persistent contract страницы:

```yaml
---
id: string
schemaVersion: number
updatedAt: ISO timestamp
contentHash: "fnv1a32:<8 hex chars>"
parent: string | null
order: number
tags: string[]
template: string
type: string
aliases: string[]
---
```

Правила:

- `id` обязан быть непустой строкой;
- `parent` может быть `null`, иначе должен ссылаться на существующую страницу;
- `tags` и `aliases` должны быть массивами строк;
- `template` определяет основной renderer;
- `type` определяет пользовательский тип карточки или системную сущность;
- title берется из persistent body и не должен быть пустым.

PageRecord diagnostic metadata:

- `schemaVersion` is the page schema version from `js/schema/schemaVersions.js`.
- `updatedAt` is refreshed by normal PageRecord writes and can later support diagnostics/recently edited.
- `contentHash` is computed from the persistent body and detects incomplete/manual write mismatch.
- `contentHash` is not a cryptographic security boundary.
- Legacy pages without these fields remain readable and migrate on the next normal PageRecord write.
- Future page schema versions must produce a blocking validation error.
- Missing diagnostic metadata and hash mismatch are validation warnings unless a later recovery step explicitly promotes them.

## Campaign Map Data

Карта должна хранить данные через `CampaignMapModel`.

Минимальный contract:

- `version`: число;
- `asset`: строка;
- `grid`: объект с `enabled`, `size`, `color`;
- `fog`: объект с `mode`, `brushSize`, `brushShape`, `lockedZones`;
- `view`: объект с `x`, `y`, `zoom`;
- `layers`: массив слоев;
- `tokens`: массив токенов;
- `shapes`: массив фигур;
- `initiative`: объект инициативы.

Критичные ошибки:

- токен без `tokenId`;
- токен без `pageId`, кроме будущих специальных transient-сущностей;
- фигура без `shapeId`;
- отрицательный или нулевой размер токена/фигуры;
- некорректная locked fog zone без `id`;
- слой без `id`.

## Task Tracker Data

Task tracker хранит JSON в persistent script-теге.

Минимальный contract:

- `version`: число;
- `columns`: массив колонок;
- `tasks`: массив задач.

Правила:

- колонка обязана иметь `id`, `title`, `taskIds`;
- задача обязана иметь `id`, `title`, `description`, `checklist`;
- `taskIds` должны ссылаться только на существующие задачи;
- checklist item должен иметь `id`, `text`, `done`.

## Assets

AssetReference должен описывать:

- `id` или путь;
- `type`;
- `owner`;
- missing state.

Schema validation не удаляет orphan assets. Удаление возможно только через отдельный asset lifecycle flow.

## Page Templates

Шаблоны страниц хранятся в `.my-own-world-templates.json`.

Минимальный contract:

- `version`: число, текущая версия `1`;
- `templates`: массив шаблонов;
- каждый шаблон имеет `id`, `title`, `template`, `type`, `tags`, `aliases`, `body`;
- `tags` и `aliases` являются массивами;
- `body` является строкой persistent HTML.

Критичные ошибки:

- отсутствует `id`;
- дублируется `id`;
- `templates` не массив;
- `tags` или `aliases` не массив;
- `body` не строка.

## Recovery

Recovery должен появиться отдельным слоем после diagnostics:

1. Найти проблему.
2. Показать понятное описание.
3. Предложить безопасное действие.
4. Создать backup/snapshot перед изменением.
5. Применить исправление.
6. Повторить validation.

Текущий recovery-слой:

- строит `WorkspaceRecoveryReport` из validation result;
- показывает fallback-экран в editor, если есть критичные ошибки;
- не исправляет данные автоматически;
- объясняет, какие ошибки требуют ручного исправления;
- требует backup перед будущими автоматическими recovery actions;
- использует `schemaUpgradeGate`, чтобы будущие schema upgrades запускались только после успешной validation и созданного backup manifest.

## Текущий статус

Первый этап:

- добавлены чистые валидаторы workspace/page/map/task/templates/assets;
- validation пока warning-only при загрузке workspace;
- fallback-экран диагностики показывается при критичных ошибках workspace;
- тесты проверяют invalid JSON, missing id, broken parent, duplicated title, broken map token, broken task data, template errors, asset reference errors, recovery report и schema upgrade gate;
- browser smoke проверяет recovery fallback screen.

Следующий этап:

- расширить recovery actions до безопасных ручных команд;
- подключить schema validation к рискованным операциям: import, schema upgrade, bulk operations;
- добавить browser/storage tests для будущих repair-actions.
## Repair-Action Foundation

`createWorkspaceRecoveryReport()` добавляет к каждой критичной ошибке поле `repairAction`.

Правила:

- `repairAction.safety = "safe-after-backup"` означает, что действие можно будет применить только после backup и отдельной команды пользователя;
- `repairAction.safety = "manual"` означает, что автоматического исправления пока нет;
- первый набор безопасных действий: очистить отсутствующего parent и вывести страницу в корень, убрать токен карты с отсутствующей карточкой, очистить ссылку task tracker на отсутствующую задачу;
- текущий UI только показывает repair-action. Запись изменений в workspace должна появиться отдельным шагом с backup gate, storage/browser tests и повторной validation.

## Repair-Action Application And Schema Versions

`applyWorkspaceRepairActions()` is the approved model-level entrypoint for automatic recovery repairs. It accepts a workspace snapshot, recovery report actions, and a `backupManifest`. Safe repairs are blocked when the backup manifest is absent.

Current safe repair actions:

- `detach-page-parent-to-root`: clears a missing parent and moves the page to root.
- `remove-map-token-with-missing-page`: removes a map token that references no page.
- `remove-missing-task-reference`: removes a task id from a column when the task is absent.

Schema versions are centralized in `js/schema/schemaVersions.js`. Future schema versions must produce blocking errors instead of being silently read by older code. Legacy versions may warn and later route through explicit upgrade gates.
