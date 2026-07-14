---
summary: "Project file audit with ownership, cleanup candidates, and two independent review passes."
read_when:
  - "Before deleting or moving project files"
  - "When navigating project ownership"
owner_zone: "delivery"
---

# Аудит файлов проекта

Дата: 2026-07-11

Исключены из построчного аудита как generated/dependency зоны: `.git/`, `node_modules/`, `dist-desktop/`, `src-tauri/target/`, `test-results/`, `playwright-report/`.

Всего файлов в аудите: 480.

## Два Независимых Прохода

**Проход 1: механическая инвентаризация.** Файлы перечислены по фактическому дереву проекта, каждому назначена зона владения, назначение, риск оптимизации и возможность удаления.

**Проход 2: смысловая сверка.** Дополнительно проверены ссылки/import-цепочки, крупные файлы, untracked/debug-файлы, признаки битой кодировки и generated-зоны. Этот проход независим от классификации первого прохода и нужен, чтобы не удалить редкий, но нужный файл.

## Итоги По Зонам

| Зона | Файлов |
|---|---:|
| agent workflow | 8 |
| assets | 4 |
| browser tests | 22 |
| campaign map | 47 |
| character | 5 |
| ci | 1 |
| desktop | 11 |
| docs/architecture | 32 |
| docs/archive | 4 |
| docs/delivery | 5 |
| docs/product | 8 |
| docs/root | 3 |
| docs/testing | 10 |
| docs/user-release | 4 |
| editor | 45 |
| knowledge graph | 3 |
| maturity | 7 |
| page repository | 2 |
| presentation | 3 |
| properties | 9 |
| release handoff | 7 |
| root | 17 |
| rules | 19 |
| schema | 12 |
| storage | 22 |
| story log | 1 |
| styles | 52 |
| tables | 8 |
| task tracker | 17 |
| templates | 9 |
| tools | 14 |
| tree | 9 |
| ui | 20 |
| unit tests | 38 |
| world packages | 2 |

## Кандидаты На Уборку

Явных кандидатов на удаление не найдено.

Удалять эти файлы можно только после отдельного подтверждения владельца продукта.

## Сигналы Второго Прохода

### Крупные Файлы

| Файл | Размер | Что сделать |
|---|---:|---|
| `docs/MY_OWN_WORLD_FULL_MANUAL.docx` | 3324829 | Проверить актуальность и место хранения; бинарные документы тяжелее навигации по markdown. |
| `assets/background.jpg` | 2910769 | Да: большой файл, нужен отдельный взгляд на назначение и размер. |
| `docs/01-delivery/WORK_LOG.md` | 334171 | Да: держать metadata, актуальность и кодировку под контролем. |

### Возможная Битая Кодировка

Признаков mojibake в текстовых файлах не найдено.

### Потенциально Неподключенные JS/CSS Файлы

Это не список на удаление. В проекте есть dynamic imports, runtime selectors и тестовые входы, поэтому список используется только как навигационная подсказка для второго прохода.

| Файл | Зона | Решение |
|---|---|---|
| `js/ui/dndStatsV2.js` | ui | Проверить при уборке подсистемы; не удалять автоматически. |
| `js/ui/variables.js` | ui | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/app-topbar.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/backlinks.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/block-character-effects.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/block-character-sheet.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/block-character-stats.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/block-dnd-stats-legacy.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/block-dnd-stats.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/block-items-inline.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/block-properties.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/block-special.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/block-table.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/blocks.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/brand-system.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/campaign-map-initiative.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/campaign-map-layout.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/campaign-map-popups.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/campaign-map-responsive.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/campaign-map-shapes.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/campaign-map-stage.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/campaign-map-token-popup.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/campaign-map-tokens.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/campaign-map.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/card-type.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/design-tokens.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/dnd-stats-v2.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/document.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/editor.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/internal-rules-workspace.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/knowledge-graph.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/layout.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/legacy-fields.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/onboarding.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/popup-block-type.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/popup-block.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/popup-confirm-profile.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/popup-create.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/popup-image-crop.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/popup-item-picker.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/popup-link.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/popup-wiki.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/popup.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/rule-tree.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/scrollbar.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/sidebar.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/tags.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/task-tracker.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/toolbar.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/tree.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/ui.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/variables-block.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |
| `styles/variables.css` | styles | Проверить при уборке подсистемы; не удалять автоматически. |

### Неразрешенные Относительные Ссылки

Неразрешенных относительных ссылок/import-ов не найдено.

## Полная Инвентаризация

| Название файла | Зона | За что отвечает | Нужно ли оптимизировать | Можно ли удалить? |
|---|---|---|---|---|
| `.agents/skills/character-model/SKILL.md` | agent workflow | Описание AI-skill для повторяемого рабочего сценария Codex. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.agents/skills/design-system/SKILL.md` | agent workflow | Описание AI-skill для повторяемого рабочего сценария Codex. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.agents/skills/desktop-release/SKILL.md` | agent workflow | Описание AI-skill для повторяемого рабочего сценария Codex. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.agents/skills/docs-restructure/SKILL.md` | agent workflow | Описание AI-skill для повторяемого рабочего сценария Codex. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.agents/skills/map-hardening/SKILL.md` | agent workflow | Описание AI-skill для повторяемого рабочего сценария Codex. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.agents/skills/minimal-change/SKILL.md` | agent workflow | Описание AI-skill для повторяемого рабочего сценария Codex. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.agents/skills/release-handoff/SKILL.md` | agent workflow | Описание AI-skill для повторяемого рабочего сценария Codex. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.agents/skills/world-package/SKILL.md` | agent workflow | Описание AI-skill для повторяемого рабочего сценария Codex. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.gitattributes` | root | Правила текстовой кодировки и поведения Git для исходников. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.github/workflows/verify.yml` | ci | GitHub Actions workflow для проверки проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `.gitignore` | root | Правила исключения локальных, generated и тяжелых файлов из Git. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `Лог особенный/Летопись королевства My own world.md` | story log | Нарративная летопись проекта для легкого понимания изменений. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `Тех. зрелость/01.06.2026 - оценка после пункта 6.md` | maturity | Материал или результат оценки технической зрелости. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `Тех. зрелость/01.06.2026 - оценка.md` | maturity | Материал или результат оценки технической зрелости. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `Тех. зрелость/02.06.2026 - оценка после desktop image parity.md` | maturity | Материал или результат оценки технической зрелости. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `Тех. зрелость/04.06.2026 - оценка после закрытия Desktop Foundation.md` | maturity | Материал или результат оценки технической зрелости. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `Тех. зрелость/25.05.2026 - оценка.md` | maturity | Материал или результат оценки технической зрелости. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `Тех. зрелость/26.05.2026 - оценка.md` | maturity | Материал или результат оценки технической зрелости. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `Тех. зрелость/Strict_Product_Maturity_Model_v4_Evidence_Based.docx` | maturity | Материал или результат оценки технической зрелости. | Проверить актуальность и место хранения; бинарные документы тяжелее навигации по markdown. | Нет. |
| `AGENTS.md` | root | Главные правила работы Codex/AI-агента в проекте. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `assets/background.jpg` | assets | Статический asset приложения. | Да: большой файл, нужен отдельный взгляд на назначение и размер. | Нет. |
| `assets/icons/README.md` | assets | Главная инструкция и обзор проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `assets/icons/rpg-ui.svg` | assets | Иконки и sprite приложения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `assets/rules/internal-rules-workspace.json` | assets | Seed-данные внутреннего пространства правил. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `docs/00-product/BRANDBOOK.md` | docs/product | Документация зоны docs/product. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/00-product/CURRENT_MILESTONE.md` | docs/product | Документация зоны docs/product. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/00-product/PO_DISCOVERY.md` | docs/product | Документация зоны docs/product. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/00-product/PRODUCT_DASHBOARD.md` | docs/product | Документация зоны docs/product. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/00-product/PRODUCT_STRATEGY.md` | docs/product | Документация зоны docs/product. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/00-product/PRODUCT_VISION.md` | docs/product | Документация зоны docs/product. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/00-product/ROADMAP.md` | docs/product | Документация зоны docs/product. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/00-product/USER_PERSONAS.md` | docs/product | Документация зоны docs/product. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/01-delivery/CHANGELOG.md` | docs/delivery | Документация зоны docs/delivery. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/01-delivery/PROJECT_FILE_AUDIT.md` | docs/delivery | Документация зоны docs/delivery. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/01-delivery/PROJECT_PLAN.md` | docs/delivery | Документация зоны docs/delivery. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/01-delivery/RELEASE_PROCESS.md` | docs/delivery | Документация зоны docs/delivery. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/01-delivery/WORK_LOG.md` | docs/delivery | Документация зоны docs/delivery. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/adapters/BACKEND_STORAGE_API_PLAN.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/AI_ONBOARDING.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/CAMPAIGN_MAP_PERFORMANCE_STRATEGY.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/ASSET_LIFECYCLE_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/BLOCK_SYSTEM_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/CHARACTER_MODEL_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/DND_CALCULATION_RULES.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/EDITOR_HISTORY_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/FORMATTING_SERVICE_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/POPUP_LIFECYCLE_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/PROPERTIES_MODEL_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/RULE_TREE_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/SAFE_HTML_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/TABLES_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/WORKSPACE_SCHEMA_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/contracts/WORLD_PACKAGE_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/desktop/DESKTOP_BACKUP_RESTORE_GATE.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/desktop/DESKTOP_MAP_PERFORMANCE_NOTES.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/desktop/DESKTOP_PACKAGING_SMOKE.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/desktop/DESKTOP_PRESENTATION_WINDOW_SPIKE.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/desktop/DESKTOP_PROTOTYPE_SMOKE.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/desktop/DESKTOP_RELEASE_POLICY.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/desktop/DESKTOP_TRANSITION_STRATEGY.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/KNOWLEDGE_GRAPH_ENTITY_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/KNOWLEDGE_GRAPH_MODEL.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/security/CLOUD_THREAT_MODEL.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/storage/.gitkeep` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/02-architecture/ui/UI_AUDIT_AND_MODERNIZATION_PLAN.md` | docs/architecture | Документация зоны docs/architecture. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/CODE_REVIEW_TEMPLATE.md` | docs/testing | Документация зоны docs/testing. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/DESKTOP_SMOKE.md` | docs/testing | Документация зоны docs/testing. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/sample-workspace/assets/.gitkeep` | docs/testing | Документация зоны docs/testing. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/sample-workspace/pages/0001-welcome.md` | docs/testing | Документация зоны docs/testing. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/sample-workspace/pages/0002-campaign-map.md` | docs/testing | Документация зоны docs/testing. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/sample-workspace/pages/0003-task-tracker.md` | docs/testing | Документация зоны docs/testing. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/sample-workspace/README.md` | docs/testing | Главная инструкция и обзор проекта. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/SMOKE_TESTS.md` | docs/testing | Документация зоны docs/testing. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/UX_ONBOARDING_CHECKLIST.md` | docs/testing | Документация зоны docs/testing. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/03-testing/VISUAL_REGRESSION.md` | docs/testing | Документация зоны docs/testing. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/04-user-release/HOW_TO_INSTALL.md` | docs/user-release | Документация зоны docs/user-release. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/04-user-release/KNOWN_ISSUES.md` | docs/user-release | Документация зоны docs/user-release. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/04-user-release/README_FOR_TESTERS.md` | docs/user-release | Документация зоны docs/user-release. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/04-user-release/TEST_SCENARIOS.md` | docs/user-release | Документация зоны docs/user-release. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/archive/ARCHIVED_EXPERIMENTS.md` | docs/archive | Архивный документ, сохранен для истории и трассировки решений. | Не оптимизировать: архив не должен быть рабочим источником правды. | Нет: архив хранит историю решений. |
| `docs/archive/PLANS_AND_TECH_DEBT.md` | docs/archive | Архивный документ, сохранен для истории и трассировки решений. | Не оптимизировать: архив не должен быть рабочим источником правды. | Нет: архив хранит историю решений. |
| `docs/archive/PROJECT_DEVELOPMENT_AND_MATURITY_PLAN.md` | docs/archive | Архивный документ, сохранен для истории и трассировки решений. | Не оптимизировать: архив не должен быть рабочим источником правды. | Нет: архив хранит историю решений. |
| `docs/archive/README.md` | docs/archive | Главная инструкция и обзор проекта. | Не оптимизировать: архив не должен быть рабочим источником правды. | Нет: архив хранит историю решений. |
| `docs/MY_OWN_WORLD_FULL_MANUAL.docx` | docs/root | Документация зоны docs/root. | Проверить актуальность и место хранения; бинарные документы тяжелее навигации по markdown. | Нет. |
| `docs/PROJECT_STRATEGY_PRESENTATION.html` | docs/root | Документация зоны docs/root. | Да: держать metadata, актуальность и кодировку под контролем. | Нет. |
| `docs/README.md` | docs/root | Главная инструкция и обзор проекта. | Да: держать metadata, актуальность и кодировку под контролем. | Нет: карта документации нужна после разделения docs по зонам. |
| `index.html` | root | Главная browser-точка входа приложения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/app.js` | root | JavaScript модуль подсистемы: root. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/character/characterIntegrationApi.js` | character | JavaScript модуль подсистемы: character. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/character/characterModel.js` | character | JavaScript модуль подсистемы: character. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/character/effectsModel.js` | character | JavaScript модуль подсистемы: character. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/character/effectSourceResolver.js` | character | JavaScript модуль подсистемы: character. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/character/inventoryModel.js` | character | JavaScript модуль подсистемы: character. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/core/icons.js` | root | JavaScript модуль подсистемы: root. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/core/markdown.js` | root | JavaScript модуль подсистемы: root. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/editor/autosave.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockContract.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockControls.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockFactory.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockPopup.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockPopupViews.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockRuntime.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockRuntimeControls.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockRuntimeSelectors.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockSerializer.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockTableContract.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/blocks/blockUpgrades.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/campaignMap.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapBackground.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapCharacterBridge.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapConstants.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapContract.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapDataSerializer.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapDragMeasure.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapDrawing.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapElementFactory.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapExternalDrop.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapFog.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapGeometry.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapHealth.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapInitiativeModel.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapInitiativePopup.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapLayerModel.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapLayers.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapModel.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapMusic.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapMusicModel.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPerformance.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPerformanceDiagnostics.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPicker.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPointerController.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPopupController.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPresentation.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPresentationItemSync.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPresentationPayload.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPresentationStyle.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapPresentationSync.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapRenderAdapter.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapRenderer.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapRuntime.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapSaveController.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapSelectionBox.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapSerializerHelpers.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapShapeDrag.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapShapes.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapStore.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapTokenActions.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapTokenDrag.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapTokenPopupController.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapTokens.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapToolbar.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapToolbarController.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapTreeIntegration.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/campaignMapViewport.js` | campaign map | JavaScript модуль подсистемы: campaign map. | Да: карта остается крупной зоной, важны performance и дальнейшее разбиение. | Нет. |
| `js/editor/characterEffectsBlock.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/characterSheetBlock.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/contenteditablePolicy.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/customBlocks.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editor.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorAssetSanitizer.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorDom.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorEmptyPage.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorHistory.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorLinksRuntime.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorNavigation.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorOpenPage.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorPastePlainText.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorSpecialSave.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/editorWikiLinkNormalization.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/formattingService.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/images.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/keyboard.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/links.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/pageTitleWarning.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/propertiesAutoCalculations.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/propertiesSettingsPopup.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/safeHtmlSanitizer.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/toolbar.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/toolbarActiveState.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/toolbarPosition.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/toolbarTextColor.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/wikiLinkCreateMenu.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/wikiLinkDom.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/wikiLinkLookup.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/wikiLinkNormalizer.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/wikiLinkPreview.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/editor/wikiLinks.js` | editor | JavaScript модуль подсистемы: editor. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/presentation/campaignMapPresentationPrivacy.js` | presentation | JavaScript модуль подсистемы: presentation. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/presentation/campaignMapPresentationRenderer.js` | presentation | JavaScript модуль подсистемы: presentation. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/presentation/presentationEntry.js` | presentation | JavaScript модуль подсистемы: presentation. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/properties/cardVariableDependencies.js` | properties | JavaScript модуль подсистемы: properties. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/properties/cardVariablesModel.js` | properties | JavaScript модуль подсистемы: properties. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/properties/characterCalculations.js` | properties | JavaScript модуль подсистемы: properties. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/properties/propertiesCalculationEngine.js` | properties | JavaScript модуль подсистемы: properties. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/properties/propertiesDomWriter.js` | properties | JavaScript модуль подсистемы: properties. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/properties/propertiesLegacyBridge.js` | properties | JavaScript модуль подсистемы: properties. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/properties/propertiesModel.js` | properties | JavaScript модуль подсистемы: properties. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/properties/propertyLayoutModel.js` | properties | JavaScript модуль подсистемы: properties. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/properties/propertySchemas.js` | properties | JavaScript модуль подсистемы: properties. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/repository/pageIndex.js` | page repository | JavaScript модуль подсистемы: page repository. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/repository/pageRepository.js` | page repository | JavaScript модуль подсистемы: page repository. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/rules/ruleTreeProvider.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/rulesWorkspace/internalRulePage.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/rulesWorkspace/rulesWorkspaceContent.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/rulesWorkspace/rulesWorkspaceIndex.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/rulesWorkspace/rulesWorkspaceSeed.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTree.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeContract.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeDefaults.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeDirty.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeEngine.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeEvents.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeGetModel.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeHTML.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeModel.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeNormalize.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreePackageStorage.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeReadData.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeRender.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ruleTree/ruleTreeWriteData.js` | rules | JavaScript модуль подсистемы: rules. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/assetSchema.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/campaignMapSchema.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/pageSchema.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/schemaJson.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/schemaRecovery.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/schemaUpgradeGate.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/schemaValidation.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/schemaVersions.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/taskTrackerSchema.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/templateSchema.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/workspaceSchema.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/schema/worldPackageSchema.js` | schema | JavaScript модуль подсистемы: schema. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/search/search.js` | root | JavaScript модуль подсистемы: root. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/search/searchPages.js` | root | JavaScript модуль подсистемы: root. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/state.js` | root | JavaScript модуль подсистемы: root. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/stateActions.js` | root | JavaScript модуль подсистемы: root. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/assetAdapter.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/assetAdapterContract.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/assetBrokenChecker.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/assetOrphanDetector.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/assetReference.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/assetReferenceScanner.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/assetStorage.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/assetWorkspaceService.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/backupService.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/browserAssetAdapter.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/browserStorageAdapter.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/desktopAssetAdapter.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/desktopStorageAdapter.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/locationMusic.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/pageStorage.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/persistence.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/storage.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/storageAdapter.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/storageAdapterContract.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/tauriBridge.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/workspaceStorage.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/storage/writeQueue.js` | storage | JavaScript модуль подсистемы: storage. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTracker.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerBoardHTML.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerColumnHTML.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerContract.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerDefaults.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerDirty.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerDnd.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerEscapeHTML.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerEvents.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerGetModel.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerModel.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerNormalize.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerPageActions.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerReadData.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerRender.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerTaskHTML.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/taskTracker/taskTrackerWriteData.js` | task tracker | JavaScript модуль подсистемы: task tracker. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/templates/blockTypes.js` | templates | JavaScript модуль подсистемы: templates. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/templates/campaignMap.js` | templates | JavaScript модуль подсистемы: templates. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/templates/cardShell.js` | templates | JavaScript модуль подсистемы: templates. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/templates/knowledgeGraph.js` | templates | JavaScript модуль подсистемы: templates. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/templates/pageTemplateStorage.js` | templates | JavaScript модуль подсистемы: templates. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/templates/propertyBlockDefinitions.js` | templates | JavaScript модуль подсистемы: templates. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/templates/ruleTree.js` | templates | JavaScript модуль подсистемы: templates. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/templates/taskTracker.js` | templates | JavaScript модуль подсистемы: templates. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/templates/templates.js` | templates | JavaScript модуль подсистемы: templates. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/tree/tree.js` | tree | JavaScript модуль подсистемы: tree. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/tree/treeContextMenu.js` | tree | JavaScript модуль подсистемы: tree. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/tree/treeDragDrop.js` | tree | JavaScript модуль подсистемы: tree. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/tree/treeDropIntent.js` | tree | JavaScript модуль подсистемы: tree. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/tree/treeKeys.js` | tree | JavaScript модуль подсистемы: tree. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/tree/treeMovePlanner.js` | tree | JavaScript модуль подсистемы: tree. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/tree/treeRender.js` | tree | JavaScript модуль подсистемы: tree. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/tree/treeRootDropZone.js` | tree | JavaScript модуль подсистемы: tree. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/tree/treeUtils.js` | tree | JavaScript модуль подсистемы: tree. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/ui/aliases.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/appTopbar.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/assetHealthPanel.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/backlinks.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/cardType.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/confirmPopup.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/createModal.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/dndStats.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/dndStatsV2.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/itemSets.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/onboardingGuide.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/popupManager.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/popupPosition.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/profile.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tables.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tables/tableCells.js` | tables | JavaScript модуль подсистемы: tables. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tables/tableClipboard.js` | tables | JavaScript модуль подсистемы: tables. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tables/tableColumns.js` | tables | JavaScript модуль подсистемы: tables. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tables/tableConstants.js` | tables | JavaScript модуль подсистемы: tables. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tables/tableResize.js` | tables | JavaScript модуль подсистемы: tables. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tables/tableRows.js` | tables | JavaScript модуль подсистемы: tables. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tables/tableSelectionState.js` | tables | JavaScript модуль подсистемы: tables. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tables/tableToolbar.js` | tables | JavaScript модуль подсистемы: tables. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/tags.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/ui.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/variables.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/variables/variableCalculations.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/ui/variables/variableDefinitions.js` | ui | JavaScript модуль подсистемы: ui. | Проверять при росте файла и дублировании поведения. | Нет. |
| `js/validation/pageTitleValidation.js` | root | JavaScript модуль подсистемы: root. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/wiki/knowledgeGraph.js` | knowledge graph | JavaScript модуль подсистемы: knowledge graph. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/wiki/knowledgeGraphPage.js` | knowledge graph | JavaScript модуль подсистемы: knowledge graph. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/wiki/references.js` | knowledge graph | JavaScript модуль подсистемы: knowledge graph. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/worldPackage/worldPackageModel.js` | world packages | JavaScript модуль подсистемы: world packages. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `js/worldPackage/worldPackageStorage.js` | world packages | JavaScript модуль подсистемы: world packages. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `package-lock.json` | root | Зафиксированное дерево npm-зависимостей. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `package.json` | root | NPM scripts, зависимости и метаданные приложения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `playwright.config.mjs` | root | Конфигурация browser smoke/regression tests. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `presentation.html` | root | Отдельная точка входа режима презентации карты. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `README.md` | root | Главная инструкция и обзор проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `release/archive/.gitkeep` | release handoff | Материалы handoff для пользователя, тестирования и релиза. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `release/candidates/.gitkeep` | release handoff | Материалы handoff для пользователя, тестирования и релиза. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `release/latest/installer/.gitkeep` | release handoff | Материалы handoff для пользователя, тестирования и релиза. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `release/latest/known-issues.md` | release handoff | Материалы handoff для пользователя, тестирования и релиза. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `release/latest/portable/.gitkeep` | release handoff | Материалы handoff для пользователя, тестирования и релиза. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `release/latest/release-notes.md` | release handoff | Материалы handoff для пользователя, тестирования и релиза. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `release/latest/tester-instructions.md` | release handoff | Материалы handoff для пользователя, тестирования и релиза. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/build.rs` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/capabilities/default.json` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/Cargo.lock` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/Cargo.toml` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/gen/schemas/acl-manifests.json` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/gen/schemas/capabilities.json` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/gen/schemas/desktop-schema.json` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/gen/schemas/windows-schema.json` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/icons/icon.ico` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/src/main.rs` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `src-tauri/tauri.conf.json` | desktop | Desktop/Tauri оболочка, Rust backend или desktop capability. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `styles/app-topbar.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/backlinks.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/block-character-effects.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/block-character-sheet.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/block-character-stats.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/block-dnd-stats-legacy.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/block-dnd-stats.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/block-items-inline.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/block-properties.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/block-special.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/block-table.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/blocks.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/brand-system.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/campaign-map-initiative.css` | styles | CSS слой: styles. | Да: CSS карты дробить по зонам ответственности и проверять визуально. | Нет. |
| `styles/campaign-map-layout.css` | styles | CSS слой: styles. | Да: CSS карты дробить по зонам ответственности и проверять визуально. | Нет. |
| `styles/campaign-map-popups.css` | styles | CSS слой: styles. | Да: CSS карты дробить по зонам ответственности и проверять визуально. | Нет. |
| `styles/campaign-map-responsive.css` | styles | CSS слой: styles. | Да: CSS карты дробить по зонам ответственности и проверять визуально. | Нет. |
| `styles/campaign-map-shapes.css` | styles | CSS слой: styles. | Да: CSS карты дробить по зонам ответственности и проверять визуально. | Нет. |
| `styles/campaign-map-stage.css` | styles | CSS слой: styles. | Да: CSS карты дробить по зонам ответственности и проверять визуально. | Нет. |
| `styles/campaign-map-token-popup.css` | styles | CSS слой: styles. | Да: CSS карты дробить по зонам ответственности и проверять визуально. | Нет. |
| `styles/campaign-map-tokens.css` | styles | CSS слой: styles. | Да: CSS карты дробить по зонам ответственности и проверять визуально. | Нет. |
| `styles/campaign-map.css` | styles | CSS слой: styles. | Да: CSS карты дробить по зонам ответственности и проверять визуально. | Нет. |
| `styles/card-type.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/design-tokens.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/dnd-stats-v2.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/document.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/editor.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/internal-rules-workspace.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/knowledge-graph.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/layout.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/legacy-fields.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/main.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/onboarding.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/popup-block-type.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/popup-block.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/popup-confirm-profile.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/popup-create.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/popup-image-crop.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/popup-item-picker.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/popup-link.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/popup-wiki.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/popup.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/rule-tree.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/scrollbar.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/sidebar.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/tags.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/task-tracker.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/toolbar.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/tree.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/ui.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/variables-block.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `styles/variables.css` | styles | CSS слой: styles. | Проверять при росте файла и дублировании поведения. | Нет. |
| `tests/assetBrokenChecker.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/assetOrphanDetector.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/assetReference.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/assetReferenceScanner.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/assetWorkspaceService.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/backupService.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/app-shell.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/asset-health.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/campaign-map-data.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/campaign-map-initiative.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/campaign-map-performance.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/campaign-map-presentation.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/campaign-map-ui.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/editor-formatting.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/knowledge-graph.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/page-templates.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/popup-lifecycle.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/property-blocks.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/README.md` | browser tests | Главная инструкция и обзор проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/rule-tree.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/safe-html.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/scenarios.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/schema-recovery.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/tables.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/task-tracker.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/tree-delete.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/tree-dnd-regression.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/browser/visual-regression.spec.mjs` | browser tests | Browser regression/smoke сценарий пользовательского поведения. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/campaignMapDataSerializer.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/campaignMapInitiativeModel.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/campaignMapLayerModel.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/campaignMapModel.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/campaignMapPerformance.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/campaignMapStore.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/cardVariablesModel.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/characterIntegrationApi.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/characterModel.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/effectsModel.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/inventoryModel.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/knowledgeGraph.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/locationMusic.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/pageIndex.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/pageRepository.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/pageTitleValidation.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/propertiesCalculationEngine.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/propertyBlocks.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/rulesWorkspace.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/ruleTreeEngine.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/ruleTreeModel.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/ruleTreePackageStorage.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/ruleTreeProvider.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/schemaValidation.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/searchPages.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/setup.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/storageAdapter.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/taskTrackerModel.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/treeDropIntent.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/treeMovePlanner.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/wikiLinkLookup.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tests/worldPackage.test.mjs` | unit tests | Unit/contract regression test. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/audit_project_files.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет: новый повторяемый инструмент аудита, нужен для будущих уборок. |
| `tools/check_desktop_environment.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/check_desktop_packaging_smoke.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/check_import_paths.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/check_text_encoding.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет: проверка кодировки подключена к npm run verify. |
| `tools/docs_index.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/generate_manual_docx.py` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/prepare_desktop_dist.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/run_browser_smoke.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/run_checks.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/run_desktop_release_gate.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/safe_commit.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/static_server.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |
| `tools/validate_agent_skills.mjs` | tools | Служебный инструмент проекта. | Нет срочно: поддерживать через обычные проверки и контракт подсистемы. | Нет. |

## Результат

- `0.0.0.8.1` закрывает инвентаризацию, но не выполняет удаление.
- Удаление/архивация начинается только после подтвержденного списка из раздела “Кандидаты На Уборку”.
- Следующий логичный подпункт: `0.0.0.8.2` — починить кодировки в документации и добавить защиту от повторного mojibake.
