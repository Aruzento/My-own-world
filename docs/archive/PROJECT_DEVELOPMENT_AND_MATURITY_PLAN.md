---
summary: "archive document for PROJECT_DEVELOPMENT_AND_MATURITY_PLAN.md."
read_when:
  - "When historical context is needed"
  - "Do not update as active source"
owner_zone: "archive"
---
# План развития проекта и технической зрелости

Дата обновления: 01.06.2026

Основано на новой оценке зрелости, аудите файлов, текущем `docs/PLANS_AND_TECH_DEBT.md`, стресс-проверках и последних изменениях карты.

## Цель

Поднять проект с текущего уровня **3.8 / 5** до **4.2 / 5** за счет надежности данных, производительности карты, устойчивых тестов и управляемого роста архитектуры.

## Приоритетный план

### 1. Schema Validation / Recovery Layer

Статус: **в работе**.

Зачем: сейчас данные сохраняются в файлы, но нет единого слоя, который проверяет структуру карточек, карт, таск-трекеров, assets и templates перед открытием и сохранением.

1.1. Описать `WORKSPACE_SCHEMA_CONTRACT.md`: **сделано**.

1.2. Ввести версии схем для page metadata, campaign map data, task tracker data, template data и asset references: **частично сделано**. Первый слой проверяет page, campaign map и task tracker.

1.3. Сделать валидаторы, которые возвращают понятные ошибки, а не молча чинят данные: **частично сделано**.

1.4. Добавить recovery screen или fallback для поврежденных страниц.

1.5. Добавить tests: invalid JSON, missing id, broken parent, duplicated title, broken map token, broken task data: **сделано для первого слоя**.

1.6. Подключить validation к загрузке workspace в warning-only режиме: **сделано**.

### 2. Backup / Restore

Статус: **частично сделано**.

Зачем: бриф от 01.06.2026 прямо фиксирует backup/restore как соседний P0/P1-риск к schema validation. Recovery нельзя включать без snapshot перед изменением данных.

2.1. Описать `BACKUP_AND_RECOVERY_CONTRACT.md`: **сделано**.

2.2. Добавить ручную команду `Создать резервную копию workspace`: **сделано**. Команда находится в popup настроек.

2.3. Добавить автоматический lightweight snapshot перед рискованными операциями: delete, bulk move, import, schema upgrade: **частично сделано**. Snapshot подключен перед удалением ветки и переносом страниц в дереве.

2.4. Добавить restore flow: **частично сделано**. Добавлен осторожный restore helper и UI-список backup с безопасным restore dialog.

2.5. Добавить tests на восстановление карты, карточки и таск-трекера: **частично сделано**. Покрыты manifest и безопасный id snapshot, нужны интеграционные browser/storage tests.

### 3. Campaign Map Performance Gate

Статус: **частично начато**.

Зачем: стресс-проверка показала, что тяжелая карта уже умеет сигналить о превышении budgets, но эти budgets пока не являются полноценной защитой от регрессий.

3.1. Вынести модельный stress test карты в отдельный тест.

3.2. Добавить browser performance smoke с большим числом токенов/фигур.

3.3. Ввести budget: render time, presentation sync time, fog draw time, visible tokens, visible shapes.

3.4. Оптимизировать туман: throttling, dirty regions, снижение лишних sync при рисовании.

3.5. Оптимизировать presentation sync: batch updates, diff by id, запрет full repaint без причины.

3.6. Добавить diagnostics UI только для dev/debug режима.

### 4. Visual Regression / UX Safety

Статус: **не начато**.

Зачем: многие баги проекта были визуальными: тряска DnD, кривые popup, бейджи, слои тумана, тулбары вне экрана.

4.1. Добавить Playwright screenshots для app shell, card editor, campaign map, presentation, task tracker.

4.2. Добавить smoke-проверки размеров: popup в viewport, toolbar не сжимается, badge не выходит за token.

4.3. Добавить checklist визуального review перед push.

4.4. Добавить тесты для Shift selection на карте и группового drag.

### 5. Popup Lifecycle Standardization

Статус: **не начато**.

Зачем: в брифе уточнено, что `popupManager` и `popupPosition` уже есть, но lifecycle popup еще не полностью стандартизирован.

5.1. Описать popup lifecycle contract: create, open, close, destroy, position, outside click, Escape, z-index.

5.2. Перевести новые popup на общий contract.

5.3. Постепенно убрать static modal UI из `index.html`, где это безопасно.

5.4. Добавить browser regression для popup boundary и повторного клика по trigger.

### 6. Разрез крупных файлов и CSS

Статус: **в работе, продолжать**.

Зачем: проект уже лучше разделен, но несколько файлов все еще тормозят безопасные изменения.

6.1. Разрезать `js/editor/toolbar.js` на controller, positioning, active state, color popup, formatting bridge.

6.2. Разрезать `js/editor/editor.js` на lifecycle, rendering, events, navigation, empty state.

6.3. Разрезать `js/editor/campaignMapPresentation.js` на window lifecycle, sync router, fog presentation, token presentation, shape presentation.

6.4. Разрезать `styles/campaign-map.css` по зонам: stage, toolbar, tokens, shapes, fog, layers, initiative, presentation.

6.5. Разрезать `styles/popup.css` по popup-системам.

### 7. Asset Lifecycle Automation

Статус: **частично начато**.

Зачем: изображения карточек, карты, объектов и будущая музыка должны жить по единому контракту, иначе workspace будет копить мусор и broken references.

7.1. Сделать команду проверки broken assets в UI.

7.2. Сделать отчет orphan assets без автоматического удаления.

7.3. Добавить безопасное удаление asset только после подтверждения.

7.4. Подготовить audio/playlist references для будущих локаций.

### 8. Editor / Tables Hardening

Статус: **частично начато**.

Зачем: editor уже поддерживает toolbar, history, paste, tables, wiki-links и блоки. Теперь ему нужен более строгий контракт действий.

8.1. Расширить Editor History tests на таблицы, wiki-links и structural block actions.

8.2. Убрать deprecated `execCommand` fallback для основных операций форматирования.

8.3. Ввести Tables Contract v2: selection, resize, paste, keyboard navigation, save/load.

8.4. Добавить browser regression для сложных таблиц.

### 9. Product Onboarding

Статус: **частично начато**.

Зачем: функций уже много, и без мягкого onboarding новый пользователь не поймет карту, связи, туман, таск-трекер и шаблоны.

9.1. Сделать встроенный стартовый tutorial.

9.2. Добавить режим "показать подсказки" для карты.

9.3. Добавить onboarding для task tracker.

9.4. Обновить sample workspace под реальные сценарии: кампания, карта, карточки, таски.

### 10. Desktop Adapter Spike

Статус: **план описан, реализации нет**.

Зачем: для local-first продукта desktop может быть стабильнее браузерного File System Access API.

10.1. Выбрать Tauri/Electron для короткого spike.

10.2. Спроектировать StorageAdapter и AssetAdapter.

10.3. Проверить open/save workspace без браузерных permission edge cases.

10.4. Сравнить размер, сложность сборки и безопасность.

### 11. Internet Resource Strategy

Статус: **исследование позже**.

Зачем: интернет-версия требует другого уровня безопасности, синхронизации и модели пользователей.

11.1. Описать cloud threat model.

11.2. Спроектировать backend storage API.

11.3. Спроектировать auth и ownership.

11.4. Спроектировать sync/conflict resolution.

11.5. Оценить миграцию local workspace -> cloud workspace.

## Ожидаемый рост зрелости

- После пунктов 1-3: **4.1 / 5**.
- После пунктов 4-7: **4.3 / 5**.
- После desktop spike и visual regression: **4.5 / 5**.

## Главные риски

- Карта может снова стать источником лагов, если добавлять слои, массовое выделение, инициативу и fog zones без performance gate.
- Storage без schema validation и backup остается главным риском потери пользовательских данных.
- Internet-версия без отдельного security model опасна: текущий проект проектировался как local-first.
- Документация может устареть быстрее кода, если manual и contracts не обновлять после крупных изменений.
