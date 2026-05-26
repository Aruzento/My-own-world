# Desktop Adapter Plan

Desktop-версия естественно подходит My own world, потому что продукт уже local-first и работает с папкой workspace.

## Desktop Target

Цель desktop-версии:

- убрать ограничения File System Access API в браузере;
- сделать стабильную работу с локальными файлами;
- подготовить удобный доступ к assets;
- сохранить совместимость текущего workspace-формата.

Desktop не должен менять формат данных мира без отдельной миграции.

## Выбор Для Spike

Первый spike стоит делать на Tauri.

Причины:

- приложение уже frontend-first;
- Tauri легче Electron по размеру;
- Rust backend может дать аккуратный доступ к файловой системе;
- local-first продукту не нужен тяжелый Chromium-дубликат, если можно использовать системный WebView.

Electron остается fallback, если Tauri упрется в WebView-совместимость, drag and drop assets или презентационный режим.

## StorageAdapter

`StorageAdapter` должен спрятать различия между browser и desktop.

Минимальный интерфейс:

```js
storageAdapter.pickWorkspace()
storageAdapter.restoreWorkspace()
storageAdapter.readText(path)
storageAdapter.writeText(path, content)
storageAdapter.listFiles(path)
storageAdapter.removeFile(path)
storageAdapter.ensureDirectory(path)
```

Browser implementation:

- использует File System Access API;
- сохраняет handles через IndexedDB/persistence;
- продолжает работать как сейчас.

Desktop implementation:

- хранит абсолютный путь workspace;
- читает и пишет через backend command;
- не требует user activation для каждого permission-запроса.

## AssetAdapter

`AssetAdapter` отвечает за изображения, фоны карт, будущую музыку и плейлисты.

Минимальный интерфейс:

```js
assetAdapter.importFile(file, options)
assetAdapter.resolveUrl(assetReference)
assetAdapter.exists(assetReference)
assetAdapter.remove(assetReference)
assetAdapter.findOrphans()
```

Browser implementation:

- хранит файлы в `assets/`;
- работает с blob URL/runtime preview;
- сохраняет только workspace-relative path.

Desktop implementation:

- может использовать native file copy;
- может отдавать `asset://` или локальный безопасный URL;
- должен сохранять тот же `AssetReference`.

## Desktop Smoke Checklist

- Открыть workspace.
- Создать карточку.
- Создать карту.
- Загрузить изображение в карточку.
- Загрузить фон карты.
- Перетащить токен.
- Сохранить и перезапустить приложение.
- Проверить, что tree, card, map, assets и task tracker восстановились.
- Проверить presentation window.
- Проверить отсутствие потери UTF-8.

## Prototype Later

Prototype не начинается, пока:

- `StorageAdapter` не описан и не имеет browser implementation;
- `AssetAdapter` не описан и не имеет browser implementation;
- browser regression остается зеленым;
- release checklist включает desktop smoke.
