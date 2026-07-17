# AGENTS.md

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

Базовые проверки:

```bash
npm run verify
npm run test:browser
node tools/docs_index.mjs
node tools/audit_project_files.mjs
node tools/validate_agent_skills.mjs
```

`npm run test:browser` можно не запускать только если задача затрагивает исключительно документы/скрипты без влияния на UI/runtime. В таком случае агент должен явно написать причину.

## Release Handoff

Если задача влияет на пользовательское поведение, релиз, установку, тестирование или видимые сценарии, обновить:

- release notes;
- tester instructions;
- known issues, если появился или снят риск;
- `docs/01-delivery/WORK_LOG.md`.

Пока release-зона не полностью создана, использовать существующие delivery-документы и планировать перенос в `0.0.0.2`.

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
