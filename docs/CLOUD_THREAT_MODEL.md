# Cloud Threat Model

Дата: 02.06.2026

Пункт плана: **20.12 Cloud threat model**.

## Цель

Описать риски будущей web/cloud-версии, не смешивая их с текущим desktop-spike.

## Текущий продуктовый режим

Сейчас My own world — local-first приложение:

- пользователь сам выбирает workspace;
- данные лежат в `.md` и assets внутри локальной папки;
- нет аккаунтов;
- нет серверного API;
- нет сетевой синхронизации между пользователями.

## Главные риски при переходе в cloud

### 1. HTML Injection

Карточки сохраняют HTML. Для cloud-версии это главный риск.

Уже есть основа:

- `docs/SAFE_HTML_CONTRACT.md`;
- `js/editor/safeHtmlSanitizer.js`;
- browser regression tests на forbidden tags, unsafe attributes и runtime leakage.

Что нужно усилить:

- sanitizer должен быть обязательным и на save, и на load;
- runtime controls не должны попадать в persistent HTML;
- cloud API не должен принимать HTML вне allowlist.

### 2. Ownership

В local-first режиме файл принадлежит пользователю, потому что он в его папке. В cloud нужно явно знать:

- кто владелец workspace;
- кто может читать;
- кто может редактировать;
- кто может удалять;
- кто может видеть hidden GM-only данные карты.

### 3. Presentation Privacy

Карта содержит мастерскую и презентационную видимость:

- туман войны;
- скрытые токены;
- скрытые объекты;
- player-token exceptions;
- будущие слои.

В cloud нельзя отдавать игрокам мастерские данные “и просто скрывать CSS”.

### 4. Asset Access

Изображения, карты, future audio и playlists должны иметь access policy.

Риск: ссылка на asset может раскрыть скрытую карту, портрет NPC или GM-only handout.

### 5. Sync Conflicts

В cloud появятся одновременные изменения:

- два пользователя редактируют карточку;
- мастер двигает токен, игрок открывает карточку;
- backup/restore конфликтует с текущими изменениями;
- task tracker меняется несколькими пользователями.

### 6. Abuse / Rate Limits

Если появятся публичные аккаунты, нужны:

- лимиты размера assets;
- лимиты workspace;
- защита от массовой загрузки файлов;
- логирование risky operations.

## Минимальный Cloud Security Gate

Перед cloud-версией должны быть закрыты:

1. Safe HTML Boundary P0.
2. PageRepository / PageIndex как единый lookup layer.
3. StorageAdapter / BackendStorageAdapter contract.
4. Account / Role / Permission model.
5. Asset access contract.
6. Presentation privacy contract.
7. Audit log для risky operations.
8. Backup/restore на серверном уровне.

## Решение

Cloud пока остается будущим направлением. Ближайший инженерный путь — укреплять desktop/local-first архитектуру через adapter boundary, model-first данные и тесты. Это подготовит проект к cloud без преждевременного server rewrite.
