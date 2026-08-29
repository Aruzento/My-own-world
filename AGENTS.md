# AGENTS.md

## Local Legacy Hub

- `legacy/` is a local-only ignored holding area for obsolete or accidental files.
- Do not commit `legacy/` or `legasy/`.
- Do not use files from `legacy/` as product truth, source code, documentation, test fixtures or design references unless the owner explicitly asks to inspect that folder.
- Intentional historical project documents stay in tracked `docs/archive/`, not in local `legacy/`.
- Root historical evidence folders `Тех. зрелость/` and `Лог особенный/` are tracked intentional exceptions. Treat them as historical evidence only, not as active source of truth, and do not move them to `legacy/` or `docs/archive/` without a separate owner-approved placement task.

Этот файл - главный вход для Codex/AI-агента в проект MyOwnWorld.

Проект растет через AI-разработку, поэтому агент обязан работать не только быстро, но и объяснимо: читать план, проверять контракты, не ломать release handoff и оставлять понятный след выполненной задачи.

## Перед Любой Задачей

Перед изменениями прочитать:

1. `docs/00-product/PRODUCT_DASHBOARD.md`;
2. `docs/01-delivery/PROJECT_PLAN.md`;
3. `docs/01-delivery/WORK_LOG.md`;
4. `docs/README.md`, если задача касается документации, навигации по файлам или release handoff;
5. релевантные contract-файлы из `docs/02-architecture/`;
6. `docs/archive/README.md` только если задача прямо просит восстановить или проверить старую идею.

Если нужного contract-файла нет, сначала создать или обновить contract, затем менять код.

Если владелец продукта говорит "делай весь пункт", агент обязан закрывать все подпункты внутри этого пункта, а не только ближайший незакрытый подпункт. Если часть подпунктов нельзя завершить безопасно в текущем проходе, это нужно явно записать в план как оставшийся хвост.

## Git И Файлы

- Не делать `git add .`.
- Стадировать только явный список файлов.
- Не делать destructive operations без явного разрешения владельца.
- Не удалять и не перемещать крупные зоны `docs/` и `release/` без отдельной задачи.
- Не коммитить `dist-desktop/`, `src-tauri/target/`, `node_modules/`, временные файлы, случайные логи и большие бинарники.
- Не возвращать файлы из `docs/archive/` в активные зоны без отдельной задачи и обновления ссылок.
- Не добавлять `debug.log`, временные отчеты, старые generated artifacts и локальные test outputs в commit.
- Для безопасной подготовки коммита использовать `node tools/safe_commit.mjs`.

## Тесты И Проверки

- Для P0/P1 задач добавлять test или явно объяснять, почему test невозможен.
- Если меняется пользовательское поведение, обновлять release notes и tester instructions.
- Если меняется подсистема, сначала проверить ее contract.
- Если меняется документация, проверить `node tools/docs_index.mjs`.
- Если меняется структура файлов или docs, проверить `node tools/audit_project_files.mjs`.
- Если меняется текстовая документация или пользовательские строки, проверить `npm run check:encoding`.
- Если меняются skills, проверить `node tools/validate_agent_skills.mjs`.
- Если добавляются machine-readable agent tasks, проверить `npm run tasks:validate`.

Verification tiers:

- `npm run verify:quick` - рабочий цикл во время реализации: text/encoding, JS syntax, import path case, unit tests и `git diff --check`.
- `npm run verify` - обычный совместимый gate перед коммитом; поведение этой команды сохраняется как раньше.
- `npm run verify:full` - широкий generic gate перед closure/release-like задачами: обычный verify, browser smoke, docs index, project file audit, agent skill validation и task validation.

Desktop build/native smoke/destructive workspace checks остаются контекстными release gates и не входят в `verify:full` автоматически.

Базовые команды:

```bash
npm run verify:quick
npm run verify
npm run verify:full
```

`npm run verify:full` можно не запускать только если задача затрагивает исключительно документы/скрипты без влияния на UI/runtime и владелец не просил полный gate. В таком случае агент должен явно написать причину и минимум запустить релевантный focused check плюс `npm run verify`.

## Release Handoff

Если задача влияет на пользовательское поведение, релиз, установку, тестирование или видимые сценарии, обновить:

- release notes;
- tester instructions;
- known issues, если появился или снят риск;
- `docs/01-delivery/WORK_LOG.md`.

Пока release-зона не полностью создана, использовать существующие delivery-документы и планировать перенос в `0.0.0.2`.

## Machine-Readable Agent Tasks

Для будущих автономных задач использовать JSON contract из `docs/02-architecture/contracts/AGENT_TASK_CONTRACT.md`.

- Исполняемые task-файлы имеют suffix `.agent-task.json`.
- Валидировать их через `npm run tasks:validate`.
- Строить безопасный dry-run план через `npm run agent:task -- --dry-run <task-file>`.
- Один локальный Codex-проход для path-scoped задач запускать только через `npm run agent:task -- --execute <task-file>`; runner создает отдельный worktree/branch, но не коммитит, не мержит и не пушит task-branch.
- YAML-примеры в документации считаются только человекочитаемой иллюстрацией, не исполняемым форматом.

Этот contract не заменяет `docs/01-delivery/PROJECT_PLAN.md`, Definition of Done или явное owner approval для рискованных действий.

Dry-run runner только валидирует задачу, проверяет clean worktree, рассчитывает branch/worktree, scope, verification и approval gates. Он не создает branch/worktree, не коммитит, не пушит, не запускает Codex и не выполняет саму задачу.

Для autonomous execution readiness `path:` include scope обязателен: prose-only scope требует human review. `requiresApproval` в dry-run считается armed safeguard и блокирует только когда защищенное действие реально triggered.

Execution runner использует существующий `codex exec` CLI, вызывает Codex ровно один раз в dedicated worktree, затем запускает `verify:quick`, task verification и changed-file scope check. Scope violation, Codex failure или triggered unapproved approval gate останавливают task без merge/push/repair retry.

## Summary После Задачи

В конце задачи написать:

- что изменено;
- какие файлы затронуты;
- какие проверки прошли;
- какие проверки не запускались и почему;
- что осталось рискованным;
- следующий пункт плана.

## Skills

## Anti-Slop Gate

Use `.agents/skills/anti-slop/SKILL.md` when a task can produce vague AI-default work: broad UI polish, architecture, docs, plans, "finish the whole block", "stabilize", "improve", or any task where a foundation could be mistaken for a usable feature.

## Definition Of Done

Use `docs/01-delivery/DEFINITION_OF_DONE.md` before marking a plan item complete.

Every completed task must state one readiness level:

- `Foundation`: model, contract, helper or technical base exists, but the human workflow is not complete.
- `MVP`: a basic user path exists and can be tested.
- `Usable`: the owner can use the workflow in normal work, with persistence/reload/error handling considered.
- `Release-ready`: the workflow is ready for handoff after automated checks, manual checks, docs, release notes, compatibility, performance and security review.

Do not remove active plan work when only `Foundation` was delivered. Split the remaining work into the next active item instead.

Before calling work done, check:

- the user-visible workflow exists and is reachable;
- the solution is not decorative churn or unnecessary abstraction;
- release notes and work log do not overclaim;
- P0/P1 work has a regression test or a clear reason why it cannot;
- partial work stays in the active plan with a smaller next task;
- the final answer names what changed, what was verified, what remains risky, and the next plan item.

Сценарии работы лежат в `.agents/skills/`.

Перед задачей выбирать релевантный skill:

- `anti-slop`;
- `character-model`;
- `docs-restructure`;
- `release-handoff`;
- `desktop-release`;
- `map-hardening`;
- `minimal-change`;
- `world-package`.

Проверка skills:

```bash
node tools/validate_agent_skills.mjs
```
