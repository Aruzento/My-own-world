# Desktop Transition Strategy

Дата: 02.06.2026

Пункт плана: **20.14 Перевод в Desktop-приложение**.

## Решение

Desktop — основной практический путь развития после стабилизации local-first ядра.

Причина: проект уже работает с локальным workspace, картами, assets, backup и будущими большими медиа. Desktop снимает ограничения браузерного File System Access API и лучше подходит для кампаний мастера.

## Что важно сохранить

- Browser mode не удалять.
- Workspace format не менять без миграции.
- `.md` страницы и `assets/` остаются переносимыми.
- Storage идет через `StorageAdapter`.
- Assets идут через `AssetAdapter`.
- Backup/restore остается общим для browser и desktop.

## Этапы Перехода

### Этап 1. Desktop Foundation

Статус: **сделано базово**.

- Tauri project создан.
- Desktop environment проверяется.
- Workspace открывается через Tauri dialog.
- FS commands читают/пишут workspace.
- Backup/restore работает через adapter.
- Asset display переведен на Tauri asset URL.

### Этап 2. Desktop Presentation Runtime

Статус: **следующий крупный шаг**.

Нужно:

- создать отдельную presentation page;
- передавать карту через data-first payload;
- сделать channel master window -> presentation window;
- сохранить browser popup fallback.

### Этап 3. Desktop Packaging

Статус: **позже**.

Нужно:

- подготовить production frontend output;
- включить Tauri bundle;
- проверить installer/portable build;
- добавить release checklist.

### Этап 4. Desktop Asset Hardening

Статус: **позже**.

Нужно:

- native file picker для image/map/audio;
- обработка missing assets;
- orphan assets UI;
- большие карты без лагов;
- future audio/playlist support.

### Этап 5. Desktop-First UX

Статус: **позже**.

Нужно:

- системное меню приложения;
- hotkeys;
- recent workspaces;
- отдельные окна: карта, презентация, reference card;
- backup/recovery UI как полноценный раздел настроек.

## Что Может Заставить Вернуться к Electron

Tauri остается первым выбором. Electron рассматривать только если:

- WebView ограничит presentation multi-window;
- будут проблемы с canvas/fog/assets;
- потребуются сложные devtools/in-app plugins;
- native file/media APIs окажутся слишком дорогими в Tauri.

## Следующий Практический Пункт

После текущего desktop gate следующий инженерный пункт:

**20.10.1. Presentation runtime transport**:

1. создать data snapshot карты;
2. создать presentation channel;
3. сделать browser popup renderer из snapshot;
4. потом подключить Tauri WebviewWindow.
