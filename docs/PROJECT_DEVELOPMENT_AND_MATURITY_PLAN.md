# План развития проекта и технической зрелости

Дата обновления: 01.06.2026

Основано на новой оценке зрелости, аудите файлов, текущем `docs/PLANS_AND_TECH_DEBT.md`, стресс-проверках и последних изменениях карты.

## Цель

Поднять проект с текущего уровня **3.8 / 5** до **4.2 / 5** за счет надежности данных, производительности карты, устойчивых тестов и управляемого роста архитектуры.

## Приоритетный план

### 1. Schema Validation / Recovery Layer

Статус: **не начато**.

Зачем: сейчас данные сохраняются в файлы, но нет единого слоя, который проверяет структуру карточек, карт, таск-трекеров, assets и templates перед открытием и сохранением.

1.1. Описать `WORKSPACE_SCHEMA_CONTRACT.md`.

1.2. Ввести версии схем для page metadata, campaign map data, task tracker data, template data и asset references.

1.3. Сделать валидаторы, которые возвращают понятные ошибки, а не молча чинят данные.

1.4. Добавить recovery screen или fallback для поврежденных страниц.

1.5. Добавить tests: invalid JSON, missing id, broken parent, duplicated title, broken map token, broken task data.

### 2. Campaign Map Performance Gate

Статус: **частично начато**.

Зачем: стресс-проверка показала, что тяжелая карта уже умеет сигналить о превышении budgets, но эти budgets пока не являются полноценной защитой от регрессий.

2.1. Вынести модельный stress test карты в отдельный тест.

2.2. Добавить browser performance smoke с большим числом токенов/фигур.

2.3. Ввести budget: render time, presentation sync time, fog draw time, visible tokens, visible shapes.

2.4. Оптимизировать туман: throttling, dirty regions, снижение лишних sync при рисовании.

2.5. Оптимизировать presentation sync: batch updates, diff by id, запрет full repaint без причины.

2.6. Добавить diagnostics UI только для dev/debug режима.

### 3. Storage / Backup / Restore

Статус: **не начато**.

Зачем: проект уже хранит много пользовательских данных, поэтому нужен механизм восстановления после ошибок, плохих сохранений и ручного повреждения workspace.

3.1. Описать `BACKUP_AND_RECOVERY_CONTRACT.md`.

3.2. Добавить ручную команду `Создать резервную копию workspace`.

3.3. Добавить автоматический lightweight snapshot перед рискованными операциями: delete, bulk move, import, schema upgrade.

3.4. Добавить restore flow.

3.5. Добавить tests на восстановление карты, карточки и таск-трекера.

### 4. Разрез крупных файлов и CSS

Статус: **в работе, продолжать**.

Зачем: проект уже лучше разделен, но несколько файлов все еще тормозят безопасные изменения.

4.1. Разрезать `js/editor/toolbar.js` на controller, positioning, active state, color popup, formatting bridge.

4.2. Разрезать `js/editor/editor.js` на lifecycle, rendering, events, navigation, empty state.

4.3. Разрезать `js/editor/campaignMapPresentation.js` на window lifecycle, sync router, fog presentation, token presentation, shape presentation.

4.4. Разрезать `styles/campaign-map.css` по зонам: stage, toolbar, tokens, shapes, fog, layers, initiative, presentation.

4.5. Разрезать `styles/popup.css` по popup-системам.

### 5. Visual Regression / UX Safety

Статус: **не начато**.

Зачем: многие баги проекта были визуальными: тряска DnD, кривые popup, бейджи, слои тумана, тулбары вне экрана.

5.1. Добавить Playwright screenshots для app shell, card editor, campaign map, presentation, task tracker.

5.2. Добавить smoke-проверки размеров: popup в viewport, toolbar не сжимается, badge не выходит за token.

5.3. Добавить checklist визуального review перед push.

5.4. Добавить тесты для Shift selection на карте и группового drag.

### 6. Asset Lifecycle Automation

Статус: **частично начато**.

Зачем: изображения карточек, карты, объектов и будущая музыка должны жить по единому контракту, иначе workspace будет копить мусор и broken references.

6.1. Сделать команду проверки broken assets в UI.

6.2. Сделать отчет orphan assets без автоматического удаления.

6.3. Добавить безопасное удаление asset только после подтверждения.

6.4. Подготовить audio/playlist references для будущих локаций.

### 7. Editor / Tables Hardening

Статус: **частично начато**.

Зачем: editor уже поддерживает toolbar, history, paste, tables, wiki-links и блоки. Теперь ему нужен более строгий контракт действий.

7.1. Расширить Editor History tests на таблицы, wiki-links и structural block actions.

7.2. Убрать deprecated `execCommand` fallback для основных операций форматирования.

7.3. Ввести Tables Contract v2: selection, resize, paste, keyboard navigation, save/load.

7.4. Добавить browser regression для сложных таблиц.

### 8. Product Onboarding

Статус: **частично начато**.

Зачем: функций уже много, и без мягкого onboarding новый пользователь не поймет карту, связи, туман, таск-трекер и шаблоны.

8.1. Сделать встроенный стартовый tutorial.

8.2. Добавить режим "показать подсказки" для карты.

8.3. Добавить onboarding для task tracker.

8.4. Обновить sample workspace под реальные сценарии: кампания, карта, карточки, таски.

### 9. Desktop Adapter Spike

Статус: **план описан, реализации нет**.

Зачем: для local-first продукта desktop может быть стабильнее браузерного File System Access API.

9.1. Выбрать Tauri/Electron для короткого spike.

9.2. Спроектировать StorageAdapter и AssetAdapter.

9.3. Проверить open/save workspace без браузерных permission edge cases.

9.4. Сравнить размер, сложность сборки и безопасность.

### 10. Internet Resource Strategy

Статус: **исследование позже**.

Зачем: интернет-версия требует другого уровня безопасности, синхронизации и модели пользователей.

10.1. Описать cloud threat model.

10.2. Спроектировать backend storage API.

10.3. Спроектировать auth и ownership.

10.4. Спроектировать sync/conflict resolution.

10.5. Оценить миграцию local workspace -> cloud workspace.

## Ожидаемый рост зрелости

- После пунктов 1-3: **4.1 / 5**.
- После пунктов 4-7: **4.3 / 5**.
- После desktop spike и visual regression: **4.5 / 5**.

## Главные риски

- Карта может снова стать источником лагов, если добавлять слои, массовое выделение, инициативу и fog zones без performance gate.
- Storage без schema validation и backup остается главным риском потери пользовательских данных.
- Internet-версия без отдельного security model опасна: текущий проект проектировался как local-first.
- Документация может устареть быстрее кода, если manual и contracts не обновлять после крупных изменений.
