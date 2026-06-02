# Backend Storage API Plan

Дата: 02.06.2026

Пункт плана: **20.13 Backend storage API, auth, ownership, sync/conflict resolution**.

## Цель

Описать будущую серверную границу хранения, если проект пойдет в web/cloud.

## Почему это не делаем сейчас

Проект еще активно укрепляет local-first и desktop foundation. Сервер сейчас добавит сложность раньше, чем стабилизированы:

- Safe HTML boundary;
- PageRepository / PageIndex;
- desktop adapter;
- asset lifecycle;
- role model;
- presentation privacy.

## Будущий BackendStorageAdapter

Серверный слой должен быть совместим по смыслу с `StorageAdapter`, но не обязан копировать его один-в-один.

Минимальные операции:

```txt
openWorkspace(workspaceId)
listPages(workspaceId)
readPage(pageId)
writePage(pageId, content, version)
deletePage(pageId, version)
listAssets(workspaceId)
readAsset(assetId)
writeAsset(asset, metadata)
createBackup(workspaceId)
restoreBackup(workspaceId, backupId)
```

## Auth

Нужны:

- пользователь;
- session/token;
- workspace membership;
- роли;
- права на чтение/запись/удаление;
- отдельное право на GM-only данные.

## Ownership

Каждый объект должен иметь владельца или workspace scope:

- workspace;
- page;
- asset;
- backup;
- map presentation state;
- future task/comment/event.

## Conflict Resolution

Минимальный подход:

- у страницы есть версия;
- `writePage` принимает ожидаемую версию;
- если версия устарела, API возвращает conflict;
- UI показывает конфликт и предлагает вручную выбрать версию.

Для карты:

- токены и фигуры должны иметь id;
- изменения карты лучше отправлять как patches;
- position/visibility/hp/initiative можно будет синхронизировать отдельно от всего HTML.

## Sync

Первая версия sync не должна быть real-time editing для текста. Безопаснее начать с:

- live map state;
- task tracker updates;
- page-level lock или version conflict для карточек.

## Минимальный API Security Gate

1. Все HTML проходит sanitizer.
2. Все assets проверяются по ownership.
3. Игрок не получает hidden GM-only map payload.
4. Backup/restore доступен только владельцу или admin-role.
5. Все risky operations пишутся в audit log.

## Вывод

BackendStorageAdapter — важная будущая цель, но сейчас он должен оставаться планом. Ближайшая практическая работа: desktop adapter, data-first presentation и role/permission model.
