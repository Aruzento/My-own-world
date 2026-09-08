---
summary: "Deferred MOW AI Core scope: full local/browser/desktop AI, providers, security and release acceptance."
read_when:
  - "When planning the future MOW AI Core block"
  - "Before choosing AI models, runtimes, tools or provider transport"
owner_zone: "delivery"
---

# MOW AI Core: будущий полный AI-блок

Updated: 2026-09-07

## Статус и происхождение требований

Статус блока и порядок его запуска задаёт только [PROJECT_PLAN.md](./PROJECT_PLAN.md#deferred-ai-block). При включении материалов статус установлен в `LATER`; реализация не начата. Этот документ описывает состав будущего блока и критерии приёмки, не создаёт отдельную очередь работ. Нумерация 0–11 и 60 подпунктов сохранена из исходного документа и не является нумерацией фаз основного roadmap.

Владелец выбрал полный объём до `Release-ready`: browser и desktop, локальный AI, внешние и пользовательские локальные providers, browser secure bridge, desktop transport, безопасность, UI, проверки и восстановление. Текущая работа над Combat Session продолжается в прежнем порядке. Место AI в исполняемой очереди и его запуск будут оформлены в основном плане после отдельного старта владельцем.

Источник: предоставленный владельцем `MOW_AI_Core_implementation_plan.docx`, изученный 2026-09-07. SHA-256 исходного файла: `f1d37db679d30c8c98969d812312ab245c5deac213964932779388760a236288`.

DOCX использует ранее подготовленный `MY_OWN_WORLD_FULL_MANUAL.docx` как внутреннюю основу. При переносе требования сопоставлены с текущим репозиторием. Инструкции и формулировки внутри DOCX являются проектными предложениями, а не разрешением устанавливать зависимости, скачивать модели, обращаться к providers, создавать bridge или менять пользовательский workspace. В этой задаче согласовано и выполнено только включение материалов в будущий план.

Упоминания моделей, runtime и внешних документов ниже сохранены как кандидаты для исследования. Заявление исходника о внешней проверке на 07.09.2026 не заменяет будущую проверку актуальной официальной документации и измерения на MOW; в этой задаче внешние технологии не проверялись.

## Цель и границы полного результата

MOW владеет знаниями мира, retrieval, инструментами, разрешениями, источниками и выполнением действий. Модель является заменяемым reasoning provider. После однократной загрузки локального AI pack пользователь работает offline без API-ключа; облачный или пользовательский локальный endpoint подключается по его выбору.

Модель получает только подготовленный контекст и описания разрешённых инструментов. Прямого доступа модели к workspace, DOM, файловой системе, секретам или произвольной сети нет. Канонические данные остаются в workspace. Индексы и AI-кэши производны; их удаление и перестроение не должны повреждать мир. История чата хранится отдельно от мира и имеет собственное управление очисткой.

Первый полный релиз предоставляет `READ` и `NAVIGATION`. Категории `WRITE`, `DESTRUCTIVE` и `EXTERNAL` учитываются в модели разрешений, но такие инструменты отключены; будущее редактирование требует отдельного пользовательского сценария подтверждений. Вызов выбранного model provider выполняет управляемый транспорт MOW, он не является инструментом произвольного сетевого доступа модели.

Целевой поток:

```text
Пользователь -> AI UI -> MOW AI Core -> Intent / Retrieval / Context
                                      -> ModelProvider
                                      -> Answer / ToolCall
                                      -> Permission & Validation
                                      -> Repository / Graph / Navigation -> UI
```

Локальные inference и embeddings работают в Worker или выделенном runtime. Внешние запросы проходят через SecureProviderTransport: browser secure bridge либо desktop backend.

## Опора на существующие владельцы данных

- [PageRepository Contract](../02-architecture/contracts/PAGE_REPOSITORY_CONTRACT.md): существующие PageRepository/PageIndex уже предоставляют поиск, title/alias/type/tag lookup и lifecycle обновления. Использовать их; недостающие публичные операции добавлять владельцу, а не обходить его через `state.pages`.
- [Knowledge Graph Model](../02-architecture/KNOWLEDGE_GRAPH_MODEL.md): строить AI-запросы связей поверх существующего graph model; не создавать вторую каноническую модель отношений.
- [Safe HTML Contract](../02-architecture/contracts/SAFE_HTML_CONTRACT.md): учитывать границу persistent content/runtime UI при проекции карточек и безопасном отображении ответов.
- [Desktop Adapter Plan](../02-architecture/desktop/DESKTOP_ADAPTER_PLAN.md) и [Cloud Threat Model](../02-architecture/security/CLOUD_THREAT_MODEL.md): учитывать платформенные границы и privacy; будущий transport AI не означает переход всего MOW на облачное хранение.
- [AI Onboarding](../02-architecture/AI_ONBOARDING.md) описывает работу агента-разработчика в репозитории. Это не существующая пользовательская AI-панель.

Названия будущих интерфейсов `ModelProvider`, `EmbeddingProvider`, `AiPlatformCapabilities`, `AiPermissionPolicy`, `AiDocumentProjection`, Tool Registry, `AnswerEvent`, `ToolCallEvent` и SecureProviderTransport задают требуемые границы. Их точные контракты, версии и реализации предстоит разработать; перенос плана не добавляет публичные API или зависимости.

## Уточнения, включённые при сопоставлении с проектом

- История, retrieval, производные индексы и разрешения облачной передачи изолируются по workspace. Смена или закрытие workspace отменяет текущие операции; поздний ответ старого запроса не попадает в новый чат и не выполняет навигацию в другом мире.
- Изменение, переименование, перемещение, удаление, импорт и восстановление карточек учитываются индексом. Перед навигацией проверяется актуальная карточка; изменённый или удалённый фрагмент нельзя показывать как действующее подтверждение без проверки.
- Политика cloud распространяется на весь исходящий контекст: фрагменты, metadata, историю диалога, результаты tools и повторы запросов. `Local only` нельзя обойти сменой provider или скрытым fallback в cloud.
- Semantic index дополняет существующий точный и текстовый поиск как перестраиваемый кэш. Он не владеет каноническими title, aliases, tags или связями.
- Модель, embedding-модель и runtime выбираются по воспроизводимым русскоязычным MOW eval и измерениям. До интеграции фиксируются целевая матрица платформ/оборудования и численные performance budgets; перенос плана не подменяет этот spike.

## Этапы будущей реализации

Все пункты ниже остаются будущей работой. Завершение документа, отдельного контракта или helper не закрывает AI-блок. Readiness оценивается по [Definition of Done](./DEFINITION_OF_DONE.md).

### Этап 0. Контракт продукта и безопасность до кода

#### 0.1. Зафиксировать AI Product Contract

Описать AI как инфраструктурный слой MOW, а не как конкретную модель. Зафиксировать роли: MOW владеет знаниями, retrieval, инструментами, разрешениями, источниками и действиями; ModelProvider только интерпретирует запрос и формирует структурированный ответ/вызов инструмента.

Локальный режим — штатный и полностью offline после загрузки модели.

Cloud/custom API — опциональный provider.

Ни одна модель не является source of truth для фактов мира.

**Результат пункта:** Документ AI_CORE_CONTRACT.md с публичными границами подсистемы.

#### 0.2. Создать threat model AI-функции

До реализации перечислить активы, доверительные границы и злоумышленнические сценарии: утечку workspace-контента и истории в cloud, кражу API-ключа, prompt injection из карточек, вредоносный custom endpoint, SSRF/localhost-доступ, HTML/Markdown injection в ответах, подмену модели/весов, чрезмерные tool permissions и DoS большими workspace/промптами. Учесть смешивание данных разных workspace и поздние ответы после переключения.

**Результат пункта:** будущий AI_SECURITY_THREAT_MODEL.md с мерами контроля и тест-кейсами. Жизненный цикл credentials оформить отдельно в SECRETS_CONTRACT.md (пункт 8.1).

#### 0.3. Определить уровни возможностей и разрешений

Ввести категории инструментов: READ (поиск/чтение), NAVIGATION (открыть/сфокусировать карточку), WRITE (создать/изменить), DESTRUCTIVE (удалить), EXTERNAL (сетевые действия). Для первого рабочего релиза AI получает READ + NAVIGATION. Архитектура должна поддерживать будущие WRITE, но они остаются отключёнными до отдельного UX подтверждений.

**Результат пункта:** AiPermissionPolicy, не зависящий от конкретной модели.

### Этап 1. Встраивание в существующую архитектуру MOW

#### 1.1. Инвентаризация текущих точек данных

Проверить текущие PageRepository/PageIndex, knowledgeGraph, page storage, search, wiki-links, editor navigation, app settings и lifecycle страниц. Составить карту, какие данные уже доступны как стабильные API и где ещё остался legacy-доступ к state.pages.

Существующие searchPages/searchPageResults и notifyPageCreated/Updated/Moved/Deleted уже есть. При будущей инвентаризации проверить покрытие всех lifecycle-путей и потребность в публичной подписке для AI; не считать текущий notify API готовым AI event stream.

**Результат пункта:** Список зависимостей AI без прямого чтения state.pages и файлов.

#### 1.2. Ввести модуль MOW AI Core

Создать самостоятельную подсистему с небольшими модулями и понятной ответственностью, в соответствии с архитектурными правилами проекта. AI Core не должен импортировать DOM/UI feature-код и не должен самостоятельно читать/писать workspace.

- `aiCore/orchestrator`
- `providers`
- `retrieval`
- `tools`
- `context`
- `security`
- `conversation`
- `evaluation`

**Результат пункта:** Стабильная внутренняя архитектура, пригодная для browser и desktop.

#### 1.3. Ввести ModelProvider contract

Определить нейтральный интерфейс модели: generate/stream, structured output, context limit, tool capability, cancellation, usage, errors. Provider-specific SDK структуры нормализуются внутри adapter.

**Результат пункта:** LocalProvider и внешние providers могут заменять друг друга без изменения AI Core.

#### 1.4. Ввести Runtime/Platform capabilities

AI Core должен спрашивать платформу о доступных возможностях: WebGPU/WASM, secure transport, desktop secret store, worker support, online/offline state. Нельзя размазывать проверки browser/Tauri по feature-коду.

**Результат пункта:** AiPlatformCapabilities + адаптеры browser/desktop.

### Этап 2. Безопасное представление знаний MOW

#### 2.1. Создать AiDocumentProjection

Преобразовывать карточку в безопасный AI-документ: id, title, aliases, type, template, tags, нормализованный текст, структурные ссылки. Runtime UI, скрипты, unsafe HTML, служебные DOM-элементы, бинарные assets и неразрешённые метаданные не передаются модели.

**Результат пункта:** Единый canonical projection для local и cloud AI.

#### 2.2. Читать данные только через PageRepository/PageIndex

Поиск сущностей, title/alias, type/tags, parent-chain и выбор страниц должен использовать текущий PageRepository/PageIndex, как требует manual. Если для AI не хватает метода, расширить repository contract, а не создавать обход через state.pages.

**Результат пункта:** AI не создаёт второй параллельный индекс правил сущностей.

#### 2.3. Интегрировать KnowledgeGraph

Использовать существующий knowledgeGraph для treeParent/wikiLink/backlinks и будущих typed relationships. Добавить AI-friendly запросы «связанные страницы», «входящие/исходящие связи», «путь связи» только поверх graph model.

**Результат пункта:** Ответы о взаимосвязях опираются на реальные связи MOW.

#### 2.4. Определить policy source grounding

Любой factual answer о мире должен формироваться из найденных источников. Если retrieval не нашёл подтверждения, ответ должен явно сообщать, что данных в workspace недостаточно. Каждая фраза ответа по возможности связывается с page id/fragment id.

**Результат пункта:** Модель не используется как источник лора.

### Этап 3. Tool Registry и выполнение действий

#### 3.1. Создать типизированный AI Tool Registry

Инструменты описываются JSON Schema/Zod-контрактами и имеют permission class. Модель возвращает только name + arguments; реальное выполнение делает MOW. Любой неизвестный tool или невалидный payload отклоняется.

- `searchPages`
- `getPage`
- `getRelatedPages`
- `getBacklinks`
- `findByTypeOrTag`
- `openPage`

**Результат пункта:** Одинаковый tool protocol для маленькой локальной и сильной API-модели.

#### 3.2. Реализовать read tools

Создать узкие read-only функции поверх repository/graph. Ограничивать максимальное число результатов и размер возвращаемого контекста. Tool result должен содержать идентификаторы источников, а не только свободный текст.

**Результат пункта:** Контролируемый и тестируемый доступ AI к знаниям.

#### 3.3. Реализовать navigation tools

openPage/openCard не должен давать модели DOM-доступ. Модель просит действие, ActionExecutor проверяет идентификатор и вызывает существующий editor/navigation API. При неоднозначном поиске сначала возвращается список кандидатов/уточнение.

**Результат пункта:** Команды «открой карточку…» работают безопасно и предсказуемо.

#### 3.4. Запретить скрытые side effects

Tool execution не должен менять карточки, настройки или файлы, если tool не классифицирован как write. Prompt или содержимое карточки не может динамически регистрировать новые инструменты.

**Результат пункта:** Prompt injection не превращается в повышение полномочий.

### Этап 4. Retrieval: сначала структура, затем семантика

#### 4.1. Реализовать exact/structural retrieval

Первый слой поиска: exact title, aliases, type, tags, parent chain, links/backlinks, существующий full-text search. Он должен использовать структурные данные MOW и иметь приоритет над семантическим поиском для точных сущностей.

**Результат пункта:** Большая доля запросов работает без embeddings и дешёво.

#### 4.2. Ввести chunking контента

Для длинных карточек строить стабильные фрагменты с page id, section/block identity и текстом. Chunking должен учитывать Markdown/блоки, а не резать текст случайно; при обновлении страницы пересчитываются только её фрагменты.

**Результат пункта:** Контекст модели остаётся ограниченным и цитируемым.

#### 4.3. Выбрать локальную embedding-модель

Провести benchmark multilingual embedding candidates на русских запросах MOW. Критерии: semantic recall, размер, CPU/WebGPU скорость, браузерная поддержка, лицензия. Не закреплять модель до измерения на реальном корпусе.

**Результат пункта:** Версионируемый EmbeddingProvider с выбранной default моделью.

#### 4.4. Создать semantic index как derived cache

Векторы не являются пользовательскими данными и не должны становиться source of truth. Хранить их в IndexedDB/OPFS или app cache, а в desktop — в app data. Индекс должен иметь schema/model version, уметь clear/rebuild и не загрязнять workspace.

Изолировать derived cache по workspace и версии модели/проекции. Миграция несовместимого AI-индекса может выполняться через clear/rebuild; она не мигрирует канонические карточки.

**Результат пункта:** Удаление AI-кэша не приводит к потере мира.

#### 4.5. Инкрементальное обновление индекса

Подписать AI index на lifecycle load/create/update/rename/move/delete/type/tag/link changes. Debounce фоновые перестроения; при массовом импорте использовать batch rebuild.

Учесть также закрытие/смену workspace и backup restore. Отменять фоновые задачи старого workspace и не публиковать их результаты в новый индекс.

**Результат пункта:** Поиск не требует полного переиндексирования после каждого autosave.

#### 4.6. Реализовать hybrid retrieval/reranking

Объединять exact/lexical/graph/semantic результаты, удалять дубли и ранжировать кандидатов. Для запроса сущности exact match должен побеждать похожие по смыслу карточки; для расплывчатого описания semantic search помогает найти кандидатов.

**Результат пункта:** Стабильный retrieval для точных и естественно-языковых запросов.

### Этап 5. Выбор и интеграция локальной модели по умолчанию

#### 5.1. Создать реальный MOW AI benchmark

Подготовить 80–150 русскоязычных тестовых запросов на реальных/синтетических workspace fixtures: поиск персонажа, aliases, навыки, связанные сущности, ambiguous names, missing data, open card, multi-tool, отказ от домыслов, prompt injection в карточке.

**Результат пункта:** Воспроизводимый eval-набор вместо выбора модели по общим benchmark-таблицам.

#### 5.2. Сравнить ultra-light candidates

Сравнить компактные модели на русском языке: tool/JSON validity, grounded answer quality, latency, RAM/VRAM, размер скачивания, лицензию и стабильность runtime. В исходнике предложены LFM2.5-230M/LFM2.5-350M и компактные Qwen-family модели. Это кандидаты, а не выбранные или проверенные в MOW зависимости; доступность, лицензии и заявленные возможности проверить по актуальной официальной документации перед benchmark.

**Результат пункта:** default модель выбирается по MOW-задачам с сохранёнными результатами сравнения. Ни одно название не фиксируется как обязательный выбор до измерений.

#### 5.3. Выбрать LocalInferenceRuntime

Сделать spike минимум Transformers.js/ONNX Runtime Web и WebLLM для выбранной модели. Проверить WebGPU, worker execution, WASM fallback, structured JSON/tool flow, browser compatibility и загрузку больших artifacts. Runtime должен быть скрыт за LocalInferenceProvider.

**Результат пункта:** Зафиксирован runtime с доказанной работой на целевых браузерах/desktop WebView.

#### 5.4. Вынести inference из main thread

Модель и embeddings работают в Worker/выделенном runtime. UI получает streaming через сообщения и остаётся отзывчивым. Предусмотреть cancel, unload model, memory pressure и повторную инициализацию после ошибки GPU.

**Результат пункта:** AI не блокирует редактор, карту и autosave.

#### 5.5. Реализовать AI Model Manager

Первый запуск AI предлагает скачать MOW Local AI pack. Нужны progress, pause/retry, контроль свободного места, версия модели, license metadata, checksum/hash verification и clear/re-download. Не исполнять модель с произвольного URL как trusted artifact.

**Результат пункта:** Безопасная и понятная доставка локальной модели.

#### 5.6. Hardware capability detection и fallback

Перед загрузкой определять WebGPU, приблизительный memory budget и поддерживаемый dtype. Если GPU недоступен — использовать поддерживаемый WASM/CPU путь или честно предложить cloud/custom provider; не зависать на попытке загрузить неподходящую модель.

**Результат пункта:** Предсказуемое поведение на слабом и старом железе.

### Этап 6. Grounded chat engine

#### 6.1. Conversation Orchestrator

Создать конечный цикл: user message → intent/retrieval → context → model → validated tool call → tool result → model final answer. Ограничить число tool iterations и общий token/context budget, чтобы исключить бесконечные циклы.

Привязать запрос и tool loop к текущему workspace и сессии разговора. При отмене, закрытии панели или смене workspace остановить зависимые задачи и отклонять поздние действия/ответы.

**Результат пункта:** Полноценный чат, а не одиночный prompt-response.

#### 6.2. Context Builder

Формировать минимальный контекст из найденных фрагментов, активной карточки, релевантных metadata/relations и предыдущей беседы. Контекст собирает MOW, а не model provider. Для cloud и local используется одинаковая semantic structure.

**Результат пункта:** Смена модели не меняет знания, доступные ассистенту.

#### 6.3. Prompt/data separation

System/tool instructions хранить отдельно от workspace content. Карточки маркировать как UNTRUSTED WORLD DATA; текст внутри них никогда не трактуется как инструкции. Даже если модель нарушит prompt, tool permission layer остаётся внешней защитой.

**Результат пункта:** Снижение риска indirect prompt injection.

#### 6.4. Structured answer protocol

Для маленьких моделей поддержать schema-constrained JSON/специальный parser; для providers с native tool calling — adapter. Результат нормализуется в MOW AnswerEvent/ToolCallEvent. Невалидный JSON не исполняется, а безопасно ретраится/отклоняется.

**Результат пункта:** Надёжность tool use не зависит от идеального текста модели.

#### 6.5. Source citations в UI

Каждый answer сохраняет использованные page/chunk ids. UI показывает «Источники» с кликабельными карточками и фрагментами. Нельзя отображать выдуманную моделью ссылку как источник — источник приходит только от retrieval/tool layer.

Проверять актуальность page/chunk перед использованием как подтверждения и при открытии источника. После редактирования или удаления показывать понятное состояние изменённого/недоступного источника; не подменять его одноимённой карточкой.

**Результат пункта:** Пользователь может проверить любой lore-ответ.

#### 6.6. Handling ambiguity и absence

Если найдено несколько одинаково подходящих карточек, чат задаёт уточняющий вопрос или показывает кандидатов. Если подтверждения нет, ассистент сообщает «в данных мира не найдено», вместо использования своих pretraining-знаний.

**Результат пункта:** Предсказуемое поведение при неполных данных.

### Этап 7. Сменные внешние providers

#### 7.1. OpenAI-compatible Provider Adapter

Создать общий adapter для endpoint/model/key + streaming + structured/tool capabilities. Он должен обслуживать совместимые API там, где это реально поддерживается, но не заставлять несовместимые providers притворяться OpenAI.

**Результат пункта:** Основа для DeepSeek, пользовательских gateways, LM Studio/Ollama-compatible серверов и других endpoints.

#### 7.2. Provider presets

Для популярных providers создать presets с base URL, auth format и capability mapping, проверяя актуальную официальную документацию при реализации. Model ID всегда конфигурируется пользователем/настройками и не зашивается навсегда.

**Результат пункта:** Удобные OpenAI/Alice/DeepSeek настройки поверх одного provider layer.

#### 7.3. Capability negotiation

Provider сообщает: streaming, native tools, JSON schema, context limit, usage. AI Core выбирает подходящий protocol; если native tools нет — использует structured JSON.

**Результат пункта:** Пользователь может подключать модели разного класса без ломки core.

#### 7.4. Custom endpoint security policy

Base URL разрешается только пользователем в Settings, хранится отдельно от workspace. Разрешить HTTPS; localhost/private local server — через явный режим. Блокировать file:// и неожиданные схемы. При смене origin ключ отвязывается и требует повторного подтверждения, чтобы секрет нельзя было тихо отправить на другой host.

**Результат пункта:** Custom provider не становится каналом для скрытой утечки API key.

### Этап 8. Secure transport и lifecycle секретов

#### 8.1. Создать SECRETS_CONTRACT.md

Определить, где секрет появляется, где хранится, кто может его читать, как он удаляется, как меняется provider origin и какие логи запрещены. API key никогда не является частью workspace, URL, query string, analytics или crash report.

**Результат пункта:** Формальный secrets lifecycle, которого сейчас в MOW ещё нет.

#### 8.2. Не хранить cloud keys в browser storage

В web-режиме не сохранять API keys в localStorage/IndexedDB/обычном app state. Полноценный cloud mode должен использовать SecureProviderTransport через локальный companion/bridge. Local AI работает без bridge.

**Результат пункта:** Компрометация browser persistent storage не раскрывает постоянный API key.

#### 8.3. Реализовать MOW AI Secure Bridge для web build

Небольшой локальный процесс слушает только loopback, хранит secrets через системный secure credential mechanism и выполняет outbound provider requests. Использовать случайный session token/handshake, строгий Origin/CORS allowlist, rate limits, body limits и отсутствие generic proxy endpoint.

**Результат пункта:** Пользователь browser-версии может безопасно подключить свой API, не отдавая ключ JavaScript-странице.

#### 8.4. Реализовать desktop SecureTransport

При Tauri-версии заменить bridge внутренним Rust backend. Использовать Tauri capabilities/permissions и защищённое secret storage (например Stronghold/OS-backed подход после security review). WebView получает только высокоуровневые команды provider request, а не сам ключ.

**Результат пункта:** Одинаковый AI provider UX в browser+bridge и desktop.

#### 8.5. Network egress policy

Cloud transport может обращаться только к origin выбранного provider. Запретить redirect секретов на другой origin, ограничить DNS/private/link-local сценарии согласно threat model, не поддерживать «передай произвольный URL» как AI tool.

**Результат пункта:** Модель или workspace-текст не могут использовать transport как SSRF/generic proxy.

#### 8.6. Privacy/data minimization

Перед cloud request отправлять только выбранные retrieval fragments, а не весь workspace. В UI показывать cloud/local badge и дать workspace-level «Local only» lock. Для cloud режима предусмотреть понятную настройку, какие данные разрешено передавать.

Применять политику ко всей исходящей нагрузке, включая историю диалога, metadata, tool results и retry. Local only блокирует также автоматическое переключение на cloud; разрешения одного workspace не переносятся в другой.

**Результат пункта:** Сохраняется local-first философия даже при опциональном облачном интеллекте.

### Этап 9. UI и пользовательский опыт

#### 9.1. AI panel как независимый UI module

Сделать чат динамическим модулем, который сам создаёт DOM, события и cleanup, не добавляя большой статический блок в index.html. Это согласуется с текущим направлением изоляции runtime UI.

**Результат пункта:** AI не увеличивает связность index.html и глобального DOM.

#### 9.2. Onboarding Local AI

Первое открытие объясняет размер download, offline/privacy преимущества, hardware check и прогресс. Пользователь может отменить и пользоваться MOW без AI. После скачивания — статус Ready/Offline.

**Результат пункта:** Локальный AI доступен без технических терминов и API-настроек.

#### 9.3. Provider Settings

Экран выбора: MOW Local / Cloud Provider / Custom local server. Для cloud — model, endpoint/preset, secure key status, Test Connection, удалить ключ. UI не должен читать сохранённый ключ обратно; только показывать «configured».

**Результат пункта:** Смена provider безопасна и понятна.

#### 9.4. Sources и actions UX

Ответ показывает источники и выполненные действия. openPage делает навигацию и отображает короткое подтверждение. Не прятать ошибки tool/retrieval/provider: пользователь должен понимать, почему ассистент не ответил.

**Результат пункта:** Прозрачный чат вместо «магии».

#### 9.5. Conversation persistence и privacy controls

Историю чата хранить локально отдельно от canonical world data; пользователь может очистить историю/AI cache/model отдельно. По умолчанию история не должна незаметно записываться в карточки.

Изолировать историю по workspace. Очистка индекса или модели не должна неявно удалять историю; удаление истории не меняет карточки. После смены workspace не показывать ответы или источники предыдущего мира.

**Результат пункта:** AI-состояние управляемо и не загрязняет workspace.

### Этап 10. Надёжность, безопасность и тестирование

#### 10.1. Unit tests contracts

Покрыть ModelProvider, AiDocumentProjection, Tool Registry, permission policy, retrieval fusion, context budgets, parser/validation, citations, index lifecycle и error normalization.

**Результат пункта:** Core тестируется без реальных LLM/API.

#### 10.2. Deterministic fake-model integration tests

Создать FakeProvider, который возвращает заранее заданные tool calls/answers. Проверять полный loop: вопрос → retrieval → tool → UI action → answer, включая invalid tool args и cancellation.

**Результат пункта:** Регрессии orchestration воспроизводимы без сетевых затрат.

#### 10.3. Security regression suite

Тесты на prompt injection внутри карточки, XSS/HTML в model output, попытку вызвать незарегистрированный tool, path traversal, oversized arguments, secret leakage в log/error, malicious endpoint/redirect, bridge CSRF/origin abuse, corrupted model artifact.

Добавить регрессии на смешивание workspace, обход Local only через историю/tool results/retry, поздний tool call после отмены и смены workspace, изменение/удаление источника до навигации.

**Результат пункта:** Threat model превращён в CI-защиту.

#### 10.4. Real-model evaluation suite

Запускать выбранные local/cloud models на MOW eval corpus и хранить результаты по версиям. Измерять tool correctness, groundedness, source precision, ambiguity handling, Russian language quality, latency и failure rate.

**Результат пункта:** Обновление локальной модели возможно только после сравнения с предыдущей.

#### 10.5. Browser E2E

Playwright сценарии: download/model ready mock, chat, open card, sources, provider unavailable, offline mode, index rebuild, reload, cancellation. Существующие npm run verify и test:browser должны оставаться зелёными.

В browser и desktop проверить reload без сети после загрузки pack, переключение workspace во время streaming/indexing, удалённые/изменённые источники и очистку отдельных видов AI-данных. Desktop transport и WebView подтвердить отдельными native-сценариями.

**Результат пункта:** AI интеграция не ломает редактор/дерево/карту/task tracker.

#### 10.6. Performance budgets

Измерить model load, first-token latency, tokens/sec, embedding/index time, memory, main-thread responsiveness и workspace scaling. Ввести ограничения на параллелизм, chunk count и context size.

До оценки соответствия зафиксировать численные бюджеты и целевую матрицу браузеров, desktop WebView и оборудования по результатам spike. Отдельно измерять влияние на редактор, карту и autosave; не объявлять performance gate пройденным без этих измерений.

**Результат пункта:** Рабочий AI на больших мирах, а не только на тестовой папке.

### Этап 11. Production hardening и релиз

#### 11.1. Model artifact supply-chain hardening

Для default AI pack использовать versioned manifest, фиксированные URLs, hash verification, license/version metadata и rollback. Проверять целостность до загрузки модели в runtime.

**Результат пункта:** Подмена веса/CDN artifact обнаруживается.

#### 11.2. CSP и platform permissions

Ужесточить CSP для UI, запретить ненужные remote scripts, минимизировать Tauri capabilities/permissions. AI-панель не должна требовать broad filesystem/network privileges.

**Результат пункта:** AI не расширяет attack surface всего приложения без необходимости.

#### 11.3. Observability без утечки данных

Локальные диагностические метрики: provider/model, latency, token counts, tool name, error class, index state. Не логировать содержимое карточек, prompts, Authorization headers и ключи по умолчанию. Debug-content режим — только явный opt-in.

**Результат пункта:** Диагностика возможна без превращения логов в копию мира пользователя.

#### 11.4. Recovery/cleanup

Добавить «Перестроить AI index», «Удалить локальную модель», «Очистить AI cache», «Удалить provider credentials», recovery после interrupted download/corrupt index и безопасный fallback на AI disabled.

**Результат пункта:** Пользователь может восстановить подсистему без ручного удаления файлов.

#### 11.5. Documentation и contracts update

Обновить README, PROJECT_PLAN.md, WORK_LOG.md, AI onboarding, security/secrets contracts и сгенерированный MY_OWN_WORLD_FULL_MANUAL.docx по правилам проекта. Обновить release notes, tester instructions и known issues по фактическим изменениям поведения. Документировать privacy matrix для Local/Cloud/Custom.

**Результат пункта:** будущий Codex/разработчик понимает архитектуру и границы AI, а пользователь видит только подтверждённые возможности. Основным roadmap остаётся PROJECT_PLAN.md.

#### 11.6. Release gate полного результата

Перед включением feature по умолчанию прогнать все project checks, security suite, local model eval, cloud/bridge tests и большие workspace fixtures. Выпускать только если локальный AI реально отвечает по данным, navigation tools надёжны, provider switching работает, secrets/egress проверены, а пользователь может полностью отключить AI.

**Результат пункта:** Production-ready MOW AI Core, а не демонстрационный прототип.

## Приёмка полного AI-блока

Целевая готовность - `Release-ready`; отдельный контракт или прототип оценивается только на фактически достигнутом уровне. Полный блок закрывается после доказательства следующих сценариев на поддерживаемых browser/desktop платформах:

| Область | Проверяемый результат |
| --- | --- |
| Local AI | После однократной загрузки pack и перезапуска без сети вопросы по миру и открытие карточек работают без API-ключа. |
| Providers | Работают локальная модель, cloud provider и пользовательский локальный endpoint; смена provider сохраняет механику tools, retrieval и sources. |
| Grounding | Ответы используют реальные page/chunk ids; отсутствие данных обозначается явно; одинаковые имена требуют выбора; удалённые/изменённые источники не выдаются за актуальное подтверждение. |
| Инструменты | Разрешены только READ и NAVIGATION. Неизвестные tools, невалидные arguments и запросы на запись/удаление/произвольную сеть отклоняются вне модели. |
| Workspace isolation | При смене workspace история и кэши не смешиваются; поздний ответ не открывает карточку и не публикуется в другом мире. |
| Privacy и secrets | Local only соблюдается для всего контекста; cloud получает только разрешённые данные; keys не попадают в workspace, browser persistent storage, URL, логи или crash reports. |
| Transport | Проверены browser bridge и desktop backend, origin/handshake, endpoint/redirect policy, доступность provider и безопасные ошибки. |
| Recovery | Прерванная загрузка, повреждённый pack/индекс, GPU/memory failure, cancel и rebuild имеют понятное восстановление; очистка AI-данных не повреждает мир. |
| Производительность | Соблюдены зафиксированные на spike бюджеты на выбранной матрице оборудования и больших fixtures; AI не блокирует редактор, карту и autosave. |
| Релиз | Пройдены актуальные project checks, FakeProvider integration, security regression, browser/native сценарии и real-model eval; доступны источники, диагностика, privacy controls и полное отключение AI. |

Модельные eval выполняются на воспроизводимых русскоязычных fixtures с явной provenance данных. Подготовка плана не читает и не изменяет реальный мир пользователя. Публикация или отправка частного корпуса внешнему provider не подразумевается наличием benchmark-пункта.

## Официальные ссылки, приведённые в исходнике

Справочный список для будущего spike. Содержимое, совместимость, лицензии, модели и API необходимо перепроверить при реализации; ссылки не являются результатами проверки в этой задаче.

- [Liquid AI: LFM2.5-350M](https://docs.liquid.ai/lfm/models/lfm25-350m)
- [Liquid AI: LFM2.5-230M](https://www.liquid.ai/blog/lfm2-5-230m)
- [Liquid AI: Tool Use](https://docs.liquid.ai/lfm/key-concepts/tool-use)
- [Transformers.js: WebGPU](https://huggingface.co/docs/transformers.js/guides/webgpu)
- [MLC: WebLLM](https://github.com/mlc-ai/web-llm)
- [Tauri: Security](https://v2.tauri.app/security/)
- [Tauri: Capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri: Stronghold](https://v2.tauri.app/reference/javascript/stronghold/)
- [Qwen3](https://qwenlm.github.io/blog/qwen3/)
