---
summary: "Audit of skill activation and documentation reading costs after the supplied AGENTS.md replacement."
read_when:
  - "When reviewing or implementing the context-routing recommendations from this audit"
owner_zone: "architecture"
---
# MOW — Astra Context and Skills Audit

## 1. Executive Summary

Аудит от 2026-09-14, **без реализации рекомендаций**. Исследован текущий local worktree после замены `AGENTS.md`:

| Проверка | Результат до изменений |
|---|---|
| `git status --short` | Пусто; рабочее дерево чистое |
| `git branch --show-current` | `main` |
| `git rev-parse HEAD` | `975db7916c26f9be2f47b8d2bd9b52a12d0f2722` |
| `git rev-parse origin/main` | `62483ac511da4e02267d013e1fd8f2a3d6262711` — локальная tracking ref, без fetch |

Основа оценки — [официальное руководство OpenAI от 2026-09-11](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra): точные короткие триггеры, выборочное чтение, раскрытие дополнительных workflow по необходимости и завершение разрешённой работы. Это критерии оценки, а не основание удалять проверенные safety-границы. Предлагаемые проектные правила не требуют конкретной модели.

**Главный результат:** новый root уже устранил обязательное предварительное чтение документов. Однако старые требования сохранились в `README.md`, девяти skills и некоторых документах второго уровня. Их буквальное выполнение может добавить **1,21 МБ / 139 246 слов** только из dashboard, плана и журнала. Это стоимость возможного чтения, не измеренное потребление токенов текущим запуском.

Из 19 локальных skills: **KEEP 3, NARROW 9, ROUTER 5, MERGE CANDIDATE 1, REMOVE CANDIDATE 1**. Последние две категории — предложения для отдельного решения, не выполненные удаления. Восемь рекомендаций: **P0 — 2, P1 — 5, P2 — 1**.

Метод: скриптом извлечены metadata, размеры, заголовки, ссылки и trigger vocabulary всех 19 `SKILL.md`, frontmatter 96 Markdown-файлов в `docs/`; затем прочитаны только подозрительные секции. Проверены чтение runner prompt и task JSON. Старые наблюдения этой задачи использованы повторно, без нового обхода глобальных skills и без чтения DOCX, полной истории или всех контрактов. Skills здесь исследуются как данные, а не активируются как инструкции аудита.

## 2. Effective Current Reading Flow

Обозначения: **→** — явное указание после входа в документ/skill; **⇢** — возможный выбор по триггеру; обычная ссылка сама по себе не означает обязательное чтение.

```text
AGENTS.md (единственный repository AGENTS; 5 549 bytes)
  → только релевантные документы / ближайший contract или test
  → README при обзоре проекта или пересечении subsystem boundaries
      → README:84: dashboard + plan + work log + relevant contracts

Каталог skills ⇢ выбранный skill
  → 9 project-specific skills: plan + work log
  → 6 из этих 9: также dashboard
  → design-system: design contract + inventory + baselines + competitor research
      → design contract:39: те же материалы + brandbook + plan + общие UI owners
  → docs-restructure: docs map + AI_ONBOARDING + release process
      → AI_ONBOARDING:41–60: verify перед изменениями; связка README/plan/log/DOCX
  → character-model: Properties + Block contract + archived experiments
      (сам CHARACTER_MODEL_CONTRACT.md в read-list отсутствует)
```

**Всегда:** repository root instructions; каталог доступных skills зависит от host/CWD. Новый `AGENTS.md` не требует ни одного дополнительного документа всегда и не предписывает выбирать skill перед каждой задачей. Не обнаружены nested `AGENTS.md`.

**Часто при неудачном выборе:** общий onboarding через `README`, план/журнал через skills, design research даже для маленького UI-исправления, общий docs audit вместо правки статуса. Наследованные требования расходятся с новым root; это конфликт маршрутизации, а не доказательство, что агент обязательно исполнит все ветви.

**Только условно:** состояние roadmap, конкретная историческая запись с нужным решением, контракт изменяемого owner, release/testing workflow, migration baselines и дизайн-исследования. Архив — только для явно нужной истории. Не найден обязательный общий путь через «индекс всех contracts».

`read_when` — metadata-подсказка. `tools/docs_index.mjs` читает документы для проверки metadata/status; он не передаёт их полные тексты модели и не исполняет `read_when`. Сам факт файлового чтения валидатором не равен context pollution. В 23 документах одинаковое `Before changing the related subsystem`, в шести — `Before verification`; это слабые указатели, но не подтверждённый автозагрузчик.

Runner уже делает нужное: `tools/agent_task_runner.mjs:2198` направляет к root и запрещает предварительную загрузку DOCX; task JSON встроен в prompt. `AGENT_TASK_CONTRACT.md` сохраняет scope, verification и approval, но не требует читать весь план/журнал. В четырёх task JSON нет дополнительных обязательных read-lists; упоминание плана в `scope.exclude` — запрет изменений, не указание читать его. Runner/schema/worktree workflow менять ради этого аудита не требуется.

## 3. Skill Trigger Findings

В таблице **каждое имя означает точный путь `.agents/skills/<имя>/SKILL.md`**. `L/W/B` — строки / слова по whitespace / bytes; `D` — символы description без YAML-кавычек. Это одна основная классификация на skill; изменение pre-read списков возможно и для KEEP.

| Skill | Класс | L / W / B; D | Текущий триггер → риск | Минимальное предложение; что сохранить |
|---|---|---|---|---|
| `accessibility-audit` | NARROW | 245 / 1601 / 11456; 641 | `fix accessibility`, `keyboard navigation` вызывают полный аудит для одного control; body отдельно исключает component implementation | `Audit keyboard, screen-reader and WCAG behavior across a specified UI flow; not a single-control fix.` Сохранить keyboard/screen-reader проверку, severity и честные ограничения evidence. |
| `anti-slop` | REMOVE CANDIDATE | 92 / 618 / 4248; 133 | Description про любой AI-default код; body §When To Use включает UI, architecture, docs, планы, «improve/refactor/finish» | После сохранения closure-ссылки на DoD убрать generic gate как отдельный skill. Уникальные обязательства: readiness, незакрытые хвосты, P0/P1 regression, отсутствие overclaim — уже есть в DoD; owner/минимальный scope — в root. Не удалять эти гарантии. |
| `backup-and-disaster-recovery` | ROUTER | 268 / 1655 / 10870; 528 | `backup`, `restore` могут перевести локальный bugfix в inventory всех систем, RPO/RTO и drill | `Design backup policy or run an explicitly scoped recovery drill; not routine persistence code changes.` Сохранить проверяемую восстанавливаемость и запрет незапрошенной работы с реальными данными. |
| `character-model` | NARROW | 41 / 160 / 1989; 95 | Character, HP, skills, inventory; body добавляет effects, initiative и states: достаточно пересечения терминов с Combat | `Modify CharacterModel calculations or its page/map integration; not unrelated combat or initiative logic.` Сохранить Character owner, совместимость карточек, model-first доступ; исправить маршрут к каноническому contract. |
| `code-review-web` | NARROW | 213 / 1564 / 10703; 560 | `debug`, `broken`, `not working`, `refactor`, build failures: почти любое исправление становится пятиаспектным review/incident workflow | `Review a scoped diff or investigate a reproduced runtime failure; not every edit or refactor.` Сохранить root-cause evidence, security/trust boundaries и regression verification; hosting/cache процедуры — только для соответствующего incident. |
| `dependency-management` | ROUTER | 326 / 1683 / 11002; 537 | Описание смешивает add/upgrade/security audit/cadence; root предлагает inventory, policy и automation последовательно | `Evaluate adding, upgrading or removing a dependency, or audit dependency risk.` Сохранить explicit approval, alternatives/license/supply-chain review, совместимость и запрет merge известных failures. |
| `design-standards` | MERGE CANDIDATE | 213 / 1425 / 9597; 570 | `design system`, `design tokens`, `spacing`, `build a page`, `review the UI` совпадают с design-system; workflow повторяет tokens/contrast/hierarchy | Перенести только полезный generic pre-ship checklist за `design-system`, затем рассмотреть снятие второго trigger. Сохранить contrast, hierarchy, состояния и viewport checks для целевых MOW поверхностей; generic mobile-first не становится новым продуктовым требованием. |
| `design-system` | NARROW | 47 / 225 / 2701; 124 | `UI`, `buttons`, `popups`, `accessibility`: даже функциональный баг открывает migration/research документы | `Change or review MOW visual tokens, themes or shared UI primitives; not every functional UI fix.` Сохранить `--mow-*`, визуальное ownership, popup lifecycle, запрет случайных CDN/assets. |
| `desktop-release` | NARROW | 42 / 148 / 1656; 85 | `storage adapters`, `presentation window` рядом с installer/release заставляют adapter fix проходить release reading chain | `Prepare a desktop build/release or change packaging; adapter fixes need only relevant desktop checks.` Сохранить browser parity, capabilities/asset protocol и обязательные настоящие release gates. |
| `docs-restructure` | NARROW | 47 / 216 / 2660; 86 | Description про структуру; body запускает skill также при обычном обновлении plan/work log/release handoff | `Move project docs or change documentation zones, metadata or navigation; not ordinary status edits.` Сохранить metadata, исправление ссылок при перемещении, архивную историю и запрет считать untracked мусором. |
| `documentation-strategy` | ROUTER | 428 / 2044 / 13060; 529 | `docs`, `README`, `stale docs`: точечная правка ведёт к десяти шагам inventory/ownership/cadence/tooling | `Design documentation ownership, structure or maintenance, or perform an explicit documentation audit.` Сохранить canonical owner и контекст решения; не запускать удаление/архивирование вне scope. |
| `frontend-component-build` | KEEP | 184 / 1200 / 8657; 557 | Создание/рефакторинг reusable component с API, states и accessibility — отдельный связный workflow | Не объединять с visual design или accessibility audit. Возможное сокращение без смены scope: `Build or refactor a reusable frontend component with explicit states, accessibility and API behavior.` Сохранить semantic markup, focus, keyboard, states и доступность. |
| `map-hardening` | KEEP | 40 / 148 / 1630; 89 | Явная Campaign Map область: tokens, fog, layers, initiative, performance, presentation | Оставить description и компактный skill; сделать чтение performance/desktop notes условным. Сохранить data-first save, runtime/persistent separation и bounded presentation sync. |
| `minimal-change` | NARROW | 101 / 651 / 8287; 192 | `senior-review перед реализацией` шире полезного выбора новой архитектуры | `Compare existing owners with a proposed abstraction before a new subsystem or substantial refactor.` Сохранить лестницу reuse/платформа/patch и §Что Нельзя Упрощать; это не разрешение недоделать scope. |
| `performance-optimization` | ROUTER | 280 / 1582 / 10763; 635 | `performance`, `slow renders`, assets, conversion: root всегда начинает с Core Web Vitals | `Investigate a measured performance problem or perform an explicitly scoped performance audit.` Сохранить baseline/re-measure на одинаковом fixture; для MOW runtime использовать его метрики, не выдумывать RUM/hosting evidence. |
| `pm-spec-writing` | NARROW | 232 / 1344 / 8907; 597 | `I want to add`, `how do we implement`, `bug to file` подходят и к готовому contract; §Phase 1 требует возврата к владельцу при любом неизвестном из четырёх вопросов | `Turn an unspecced product request into a dev brief; not implementation of an accepted task or contract.` Сохранить реальные product decisions, scope и acceptance; не спрашивать заново то, что уже задано task/contract. |
| `qa-testing` | ROUTER | 302 / 1628 / 12894; 743 | `broken link`, `404`, `image not loading` шире QA-запроса; root загружает сразу три tiers и console snippets | `Perform a requested smoke, standard or release QA pass; select one tier and the applicable runtime.` Сохранить явную глубину проверки, failures и отчёт о недоступных данных; full web SEO/headers не обязательны для local desktop. |
| `release-handoff` | NARROW | 47 / 181 / 2347; 106 | Description точнее body: body включает любые изменения проверки/тестовых инструкций, даже внутренних | `Prepare or update release notes, tester instructions and known issues for a changed user/release workflow.` Сохранить tester path, known issues, unverified risks и реальный installer gate. |
| `world-package` | KEEP | 42 / 136 / 1714; 81 | Связанный export/import мира, кампании, региона и сущностей — определённый workflow | Оставить description; условно выбирать связанные contracts вместо общих delivery документов. Сохранить preview, backup/snapshot, ссылки и неразрушительные import boundaries. |

Подтверждены пересечения **выбора**, но не тождественность всех workflow: design-standards/design-system; docs-restructure/documentation-strategy; anti-slop/minimal-change/code-review-web; accessibility-audit/frontend-component-build/qa-testing. Единственная merge-кандидатура — generic design standards: одинаковы и триггер visual tokens/spacing/review, и checklist. `UPSTREAM.md:31–39` уже признаёт MOW design-system owner и приоритет local правил. Остальные разделяются по результату: структура файлов, стратегия документации, компонент, независимый audit, review diff.

## 4. Progressive Disclosure Findings

Не требуется дробить короткие MOW skills. У пяти ROUTER-кандидатов общий размер roots **58 589 bytes / 8 592 слова**. Для выбора ветки нужны цель, точный trigger, 2–5 safety/invariant правил и ссылки; большая часть справки нужна после выбора.

| Root skill и секции | Что открыть только по выбранной ветке | Точные supporting paths относительно skill directory |
|---|---|---|
| `backup-and-disaster-recovery`: framework :45, drill :108, special topics :180 | Политика/RPO-RTO отдельно от scoped recovery drill; database/compliance — только при соответствующем owner | Существующий `references/restore-runbook-template.md`; предлагаемый `references/backup-policy.md` |
| `dependency-management`: frameworks :45/:93, workflow :145, add/remove :249/:267 | Risk inventory/policy, evaluation/removal или upgrade; не все последовательно | Существующий `references/upgrade-checklist.md`; предлагаемый `references/dependency-workflows.md` |
| `documentation-strategy`: categories :45, tiers :103, workflow :158, patterns :276 | Docs audit, ownership/cadence или конкретный шаблон; обычной правке README это не нужно | Существующий `references/doc-types-guide.md`; предлагаемый `references/documentation-workflows.md` |
| `performance-optimization`: CWV :45, other optimizations :121, workflow :205 | Runtime profiling отдельно от page-load/CWV; инструменты выбираются по наблюдаемому bottleneck | Существующие `references/optimization-playbook.md`, `references/optimization-checklist.md`, `references/audit-template.md` |
| `qa-testing`: tiers :43, snippets :169, workflow :264 | Один tier; только его применимые snippets/матрица | Существующий `references/qa-report-template.md`; предлагаемый `references/qa-tiers.md` |

Это места будущего переноса, не новые обязательные чтения. Сначала переиспользовать имеющиеся references и не копировать туда уже существующую информацию.

Остальные крупные roots: `code-review-web` — incident appendix :177 можно читать отдельно от diff review; `pm-spec-writing` — большие примеры :82–166 лучше заменить переходом к уже имеющимся `references/feature-spec-template.md` и `references/dev-brief-template.md`. Их первичная проблема — trigger, поэтому класс NARROW. `accessibility-audit` после точного выбора системного аудита остаётся одним coherent workflow; подробности WCAG/ARIA уже имеют references. `frontend-component-build` — цельный lifecycle компонента; отдельные skills на каждый state/API/accessibility шаг не нужны. `design-standards` рассматривается для merge; `minimal-change` — цельная лестница выбора, а не пять разных workflow.

## 5. Documentation Routing Findings

**Неверные маршруты нового root.** Семь ссылок не существуют. Исправления должны указывать на owner, не возвращать blanket read-list:

| Сейчас в `AGENTS.md` | Канонический маршрут |
|---|---|
| `docs/BLOCK_SYSTEM_CONTRACT.md` | `docs/02-architecture/contracts/BLOCK_SYSTEM_CONTRACT.md` |
| `docs/SAFE_HTML_CONTRACT.md` | `docs/02-architecture/contracts/SAFE_HTML_CONTRACT.md` |
| `docs/PAGE_REPOSITORY_CONTRACT.md` | `docs/02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md` |
| `docs/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md` | `docs/02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md` |
| `docs/ASSET_LIFECYCLE_CONTRACT.md` | `docs/02-architecture/contracts/ASSET_LIFECYCLE_CONTRACT.md` |
| `docs/PLANS_AND_TECH_DEBT.md` | Для состояния roadmap: `docs/01-delivery/PROJECT_PLAN.md`; нет оснований автоматически подменять им все виды debt |
| `docs/WORK_LOG.md` | `docs/01-delivery/WORK_LOG.md`, только найденная релевантная запись |

**Конфликт очередей чтения:** `README.md:84`, девять skill pre-read sections и `AI_ONBOARDING.md:41–60` сохраняют старый workflow. Новый root, напротив, запрещает обязательную стопку документов и default regeneration DOCX. `docs-restructure → AI_ONBOARDING` — реальная косвенная цепь к широкому gate и связке обновлений; это не требование самого нового root.

**UI:** `DESIGN_SYSTEM_CONTRACT.md:39–51` требует пять source docs и общие token/popup/icon файлы перед любым UI изменением. Его §Migration Gates :480 уже имеет более точную область — UI migration. Исследование конкурентов, inventory и baselines должны входить по этой области; для исправления одной позиции popup нужны его owner/test. §Test Expectations :493–525 уже различает docs, CSS, overlays, map, graph и release — это полезное существующее решение, его сохранять.

**Character:** skill требует `docs/archive/ARCHIVED_EXPERIMENTS.md`, но пропускает существующий `docs/02-architecture/contracts/CHARACTER_MODEL_CONTRACT.md`. Историческая идея не заменяет актуального владельца HP/AC/calculations. В `CHARACTER_MODEL_CONTRACT.md:4` общий trigger «initiative» стоит уточнить до Character-initiative integration, не заставляя чистую turn-progression функцию читать весь Character contract.

**История в contracts:** `COMBAT_ACTION_PIPELINE_CONTRACT.md:240` описывает проверки docs-only leaf 17.1 по прежнему AGENTS. Это не общий gate для каждой будущей функции и не дополнительный gate данного аудита. Аналогично ссылки на соседние contracts описывают ownership/dependencies, а не команду прочитать их все. Реальный переход обязателен, когда изменение затрагивает этот boundary.

**Metadata и счётчики:** 27 разных doc pointers находятся в девяти pre-read sections, включая несколько уже условных ссылок. Все девять требуют plan/log, шесть — dashboard. Это не «27 глобально обязательных docs». Из четырёх `Before choosing the next task` правильный общий вход — PROJECT_PLAN; WORK_LOG, CHANGELOG, RELEASE_PROCESS нужны только по своей причине. Одинаковые metadata в шести testing docs не делают их обязательными перед каждым unit test.

## 6. Current vs Proposed Reading Matrix

Таблица — симуляция по текстам, **не trace семи реальных запусков**. `⇢` не означает, что все перечисленные skills будут загружены. Исходники/ближайшие tests нужны в обеих колонках и не считаются лишним чтением.

| Задача | CURRENT вероятная ветка | PROPOSED минимальная ветка |
|---|---|---|
| A. Один очевидный CSS/UI bug | Root → affected code; ⇢ design-system → dashboard/plan/log + design contract/inventory/baselines/research; ⇢ design-standards по `fix layout` | Root → affected CSS/component и regression. Design contract/skill — при изменении token/theme/shared primitive; popup lifecycle — если баг затрагивает его. Без competitor/migration материалов по умолчанию. |
| B. Узкая Combat Action Pipeline domain function | Root → `COMBAT_ACTION_PIPELINE_CONTRACT.md` по точному `read_when`; ⇢ pm-spec-writing по `how do we implement`, anti-slop по architecture; README при cross-boundary работе возвращает общую стопку | Root → принятый task + релевантные sections Action Pipeline → ближайший domain/test. Combat Session только при session/turn ownership; Character/Dice/Event только при изменении их boundary. Условия следующего leaf сверить с планом, если prompt не задаёт актуальный scope. |
| C. Изменение Character HP persistence | Root ⇢ character-model → dashboard/plan/log + Properties/Block + archived experiments; root SAFE_HTML pointer сломан | Root → Character contract + HP/Properties и затронутый persistent write boundary/tests. Action Pipeline §6 — если меняется его HP prerequisite. Сохранить conflict/rollback/clean-save проверки; архив и весь журнал не нужны. |
| D. Только roadmap/docs после принятой фазы | Root → нужный roadmap (старый путь не работает); ⇢ docs-restructure → общая стопка + AI_ONBOARDING + release process; ⇢ documentation-strategy → docs inventory | Root → точный leaf/current state PROJECT_PLAN + evidence принятия + DoD для closure; нужная запись WORK_LOG, если фиксируется результат/решение. Docs map только при создании/перемещении docs. Без discovery всей документации. |
| E. Backup/recovery behavior | Root → relevant contract; ⇢ backup-and-disaster-recovery по `restore` → all-state inventory/RPO-RTO/drill; ⇢ anti-slop/minimal-change → общая стопка | Root → `BACKUP_AND_RECOVERY_CONTRACT.md` + изменяемый adapter/recovery owner/tests. Lightweight operations contract — для выбора защиты операции; schema/asset contracts — если затронуты. DR skill только для политики или явно scoped drill. |
| F. Desktop release | Root ⇢ desktop-release/release-handoff → plan/log + desktop policy/adapter/transition/packaging + release docs | Root → release task → desktop-release, `DESKTOP_RELEASE_POLICY.md`, `RELEASE_PROCESS.md`, применимые packaging/native gates и актуальные release/tester/known-issues документы. Plan — версия/closure, log — соответствующее evidence. Широкие release проверки сохранить. |
| G. Accessibility audit | Root ⇢ accessibility-audit → scoped audit stages + report; ⇢ design-system/standards по accessibility → design/history ветка | Root → accessibility-audit → нужный UI flow + scoped WCAG/ARIA references + keyboard/screen-reader/visual evidence. Design contract только для затронутых tokens/primitives. Недоступную assistive-tech проверку явно отметить; automated scan её не заменяет. |

Общая модель: **root → task-state lookup при необходимости → contract затронутого owner → точный skill, если нужен workflow → relevant code/tests**. Testing/release docs подключаются по операции или реальному handoff. Завершение означает также validation и исправление внесённых регрессий; для продолжения не нужно повторное разрешение на уже scoped безопасный шаг.

## 7. Estimated Context Savings

Метод измерения: UTF-8 размер на диске; слова = `text.split()`; description symbols = длина извлечённой строки без YAML. CRLF bytes включены. Ссылки и namespaces host в description totals не входят. **Токены, billing, cache hits и время модели не измерялись.**

| Метрика | CURRENT | PROPOSED / смысл сравнения |
|---|---|---|
| Локальные skills | 19, все с name/description | 19 после routing/trigger правок; 17 только при принятии merge/removal |
| Все root `SKILL.md` | 135 141 bytes / 18 209 слов | Не грузить суммой; installed size не равно context cost |
| Все descriptions | 6 888 символов / 991 слово | Тексты предложений §3 для 17 retained skills: 1 647 / 234 (**−76,1% символов**). Если два кандидата пока оставить с прежними descriptions: 2 350 / 337 (**−65,9%**). Это draft comparison, не выполненная конфигурация |
| Пять priority router roots | 58 589 bytes / 8 592 слова | Ориентир 2–3 КБ на root: 10–15 КБ суммарно, **−74–83%** текста этих roots до выбора reference. Это design estimate, не лимит и не итог после чтения нужной ветки |
| Dashboard + plan + log | 1 210 702 bytes / 139 246 слов | 0 дополнительных bytes для routine task с достаточным prompt; иначе конкретный state/decision fragment. Документы сохраняются |
| Выбран design-system: root AGENTS + skill + прямые doc pre-reads | 1 403 414 bytes | Root + полный design contract: 62 929 bytes (**−95,5%**). Одинаково исключены source/tests; current не включает дополнительные переходы из contract. Для тривиального CSS багфикса contract тоже может не понадобиться |
| Выбран character-model: root AGENTS + skill + прямые doc pre-reads | 1 271 451 bytes | Root + полные Character/Properties/Block contracts: 80 149 bytes (**−93,7%**). Консервативный пример; дополнительные реально затронутые write/recovery boundaries всё равно надо проверить |

Наибольшие roots: `documentation-strategy` 13 060 B, `qa-testing` 12 894 B, `accessibility-audit` 11 456 B, `dependency-management` 11 002 B, `backup-and-disaster-recovery` 10 870 B. Размер сам по себе не означает лишний skill: accessibility audit может требовать всю методику.

Семь descriptions содержат `whenever`; простой lowercase word-set поиск с удалением служебных слов нашёл семь пар с ≥6 общими словами. Это только screening: он не понимает русско-английские синонимы и не доказывает duplication. Семантический review дал девять NARROW и пять ROUTER с необходимостью точнее сформулировать activation; у docs/release/desktop часть расширения находится в body, а не frontmatter.

**Global discovery отдельно.** В этой же задаче 2026-09-07 журнал Codex подтвердил `omitted_skills=722` и traversal limit для пользовательского `.codex/skills`; инвентаризация 2026-09-06 нашла 832 пользовательских `SKILL.md`, 818 под `cybersecurity-skills`, включая вложенный upstream repository в `references/`. Это датированное внешнее evidence, не новая проверка состояния 2026-09-14 и не число локальных MOW skills. Предыдущий host CLI probe из MOW показывал все 19 local skills среди 132 видимых entries, тогда как sandbox profile отличался. Репозиторные правки не доказывают устранение глобального лимита. Отдельная owner-задача может вынести внешнюю библиотеку за auto-discovery root, сохранив доступ через router; здесь глобальные файлы не изменяются.

## 8. Safety Rules That Must Stay

| Сокращаемая инструкция | Какой сбой она предотвращала | Где сохранить защиту |
|---|---|---|
| Общие pre-read stacks | Работа по устаревшему плану/неверному owner | Task/current leaf lookup при выборе/closure; точный owner contract, а не вся история |
| Anti-slop/дубли closure | «Foundation» назван готовой функцией, исчез незакрытый scope, tests переоценены | `docs/01-delivery/DEFINITION_OF_DONE.md`; условная closure-ссылка; evidence-based report и P0/P1 regression obligation |
| Общие architecture recipes | Новый параллельный owner, DOM становится источником сохраняемых данных | Root invariants + Character/Combat/Properties/Page/Block contracts по изменяемой границе |
| Blanket backup/drill | Потеря реальных данных, неработающий restore | Scoped disposable fixtures; explicit owner decisions для real workspace/destructive/schema действий. `BACKUP_AND_RECOVERY_CONTRACT.md:18–32`: pre-restore verification сохраняется; обычные операции используют lightweight protection, destructive/bulk/schema/restore/import/repair — полный gate |
| Универсальные review/security checks | Ослабленный sanitizer/trust boundary, новый риск зависимости | Safe HTML/persistence contracts; dependency approval, совместимость, supply-chain/license checks по задаче |
| Повторные verify/manual commands | Непроверенная регрессия или неподготовленный release | Task-required checks, focused regression, более широкий gate по риску и настоящий desktop release policy. Проверки не обходятся из-за economy цели |
| Generic web UI recipes | Недоступный keyboard/focus flow, component drift | MOW tokens, popup lifecycle, semantic markup, keyboard/screen-reader и функциональное/visual evidence для затронутой поверхности |
| Runner constraints | Scope escape, unapproved operation, повреждение shared checkout | `.agent-task.json`, validator, dedicated worktree, changed-file scope check, bounded timeout/repair, отсутствие commit/merge/push внутри runner — без изменений |

Сокращение чтения не даёт разрешения менять persistent formats, реальный workspace, dependencies, architecture ownership или owner-only решения. Не нужно увеличивать контекстное окно, подавлять warning или привязывать safety к «модель сама догадается».

## 9. Minimal Recommended Changes

Рекомендации для следующей задачи; здесь не реализованы. Обозначение **S(name)** ниже разворачивается в точный `.agents/skills/name/SKILL.md`, как в §3; supporting paths разворачиваются относительно указанного skill directory.

| ID | Приоритет | Минимальное изменение | Точные затронутые файлы |
|---|---|---|---|
| R1 | P0 | Убрать конфликт blanket pre-reading; заменить его условиями task-state/owner/migration/исторического решения. Не переписывать сам план или журнал | `README.md`; `docs/02-architecture/AI_ONBOARDING.md`; `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md`; S(anti-slop), S(character-model), S(design-system), S(desktop-release), S(docs-restructure), S(map-hardening), S(minimal-change), S(release-handoff), S(world-package) |
| R2 | P0 | Исправить семь root pointers; в Character skill дать canonical contract и сделать архив историческим opt-in | `AGENTS.md`; S(character-model) |
| R3 | P1 | Сузить девять NARROW descriptions/When To Use до формулировок §3; не добавлять новые универсальные stop/approval шаги | S(accessibility-audit), S(character-model), S(code-review-web), S(design-system), S(desktop-release), S(docs-restructure), S(minimal-change), S(pm-spec-writing), S(release-handoff) |
| R4 | P1 | Превратить пять многоцелевых roots в task routers; переносить только выбранные ветки и переиспользовать существующие references | S(backup-and-disaster-recovery), S(dependency-management), S(documentation-strategy), S(performance-optimization), S(qa-testing); точные существующие/предлагаемые supporting files перечислены в §4 |
| R5 | P1 | Проверить merge generic design checklist в MOW design workflow; не сливать с component build или accessibility audit | S(design-standards), его `references/preship-checklist.md`; S(design-system), предлагаемый `references/preship-checklist.md`; `.agents/skills/UPSTREAM.md`; перенаправить ссылки в S(accessibility-audit), S(frontend-component-build), S(pm-spec-writing) |
| R6 | P1 | Рассмотреть снятие anti-slop как отдельного auto-trigger только после сопоставления всех его полезных правил с root/DoD и устранения входящих ссылок | S(anti-slop); `AGENTS.md` — только conditional DoD pointer при необходимости; `docs/01-delivery/DEFINITION_OF_DONE.md` — сохранить правила, не переписывать без пробела; перед удалением проверить входящие ссылки targeted search |
| R7 | P1 | Согласовать docs updates и verification clauses с новым root: не запускать verify до каждого изменения и не обновлять README/plan/log/DOCX связкой. Уже точные design-contract test expectations сохранить | `docs/02-architecture/AI_ONBOARDING.md`; S(anti-slop), S(character-model), S(design-system), S(desktop-release), S(docs-restructure), S(map-hardening), S(minimal-change), S(release-handoff), S(world-package). `tools/run_checks.mjs`, runner и task verification **не менять** |
| R8 | P2 | Уточнить наиболее заметные широкие metadata и сократить KEEP component description без смены смысла; не массово исправлять все 23 одинаковых metadata | S(frontend-component-build); `docs/02-architecture/contracts/CHARACTER_MODEL_CONTRACT.md`; `docs/01-delivery/WORK_LOG.md`; `docs/01-delivery/CHANGELOG.md`; `docs/01-delivery/RELEASE_PROCESS.md`; `docs/03-testing/CODE_REVIEW_TEMPLATE.md`; `docs/03-testing/DESKTOP_SMOKE.md`; `docs/03-testing/SMOKE_TESTS.md`; `docs/03-testing/UX_ONBOARDING_CHECKLIST.md`; `docs/03-testing/VISUAL_REGRESSION.md`; `docs/03-testing/sample-workspace/README.md` |

Не нужны сейчас новые nested AGENTS, repository-wide skill loader, массовое перемещение docs, отключение полезных внешних skills или экспериментальная Codex config. Самые большие локальные потери устраняются адресной правкой существующих входов. Уменьшение глобального skill catalog — отдельная внешняя задача, не включённая в восемь repo-рекомендаций.

## 10. Implementation Order

1. **R2 + R1:** исправить ссылки и устранить конфликт очередей чтения. Сохранить scope, owner contracts и отдельные safety условия. Это первый минимальный implementation slice.
2. **R3 + R7:** точные activation boundaries и условия validation/docs updates. Снова проверить семь archetypes; не считать изменение текста доказанным поведением модели.
3. **R4:** последовательно router skills с независимыми ветками; не дробить coherent навыки. Сначала переиспользовать references.
4. **R5/R6:** отдельное решение по каждому кандидату после сохранения safety и проверки входящих ссылок. Без такого решения оставить skills доступными. **R8** — затем по необходимости.
5. После реализации сравнить metadata и доступные instruction/skill catalog probes; на реальных задачах наблюдать выбранные skills, прочитанные документы и повторные gates. До этого экономия остаётся static estimate, а не подтверждённым снижением runtime context/billing.

Этот pass изменяет только данный аудит. Проверки для него: `npm run docs:index`, `npm run check:encoding`, `git diff --check`. Production, tests, skills, root, contracts и обычные docs не изменяются; full/browser/native suites не запускаются; push запрещён. Итог проверок и commit SHA фиксируются в сообщении завершения, а не в самоссылочном SHA внутри документа.
