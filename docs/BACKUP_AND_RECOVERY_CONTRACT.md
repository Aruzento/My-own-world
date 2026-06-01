# Backup And Recovery Contract

Дата: 01.06.2026

Этот контракт описывает, как проект должен защищать пользовательские данные перед рискованными операциями и перед будущим автоматическим recovery.

## Главная идея

Любое автоматическое исправление данных должно начинаться с backup. Schema validation только находит проблемы. Recovery предлагает действие. Backup сохраняет состояние до действия.

## Где хранить backup

Backups хранятся внутри workspace в папке:

```text
.my-own-world-backups/
```

Каждый snapshot хранится в отдельной папке:

```text
.my-own-world-backups/2026-06-01T12-30-00-000Z-delete-page-branch/
```

Внутри snapshot:

```text
manifest.json
pages/
  original-page-file.md
```

## Manifest

`manifest.json` хранит:

- `version` - версия формата backup;
- `id` - id snapshot;
- `createdAt` - дата создания;
- `reason` - причина создания;
- `pages` - список сохраненных страниц;
- `pageCount` - количество страниц.

## Что входит в первый слой backup

Первый слой сохраняет:

- все страницы из `state.pages`;
- имя файла страницы;
- id, title, parent, type, template;
- persistent markdown content страницы.

Первый слой пока не сохраняет assets физически. Это осознанное ограничение: для assets нужен отдельный Asset Lifecycle / Backup этап, чтобы не копировать тяжелые файлы без политики хранения.

## Рискованные операции

Snapshot должен создаваться перед:

- удалением ветки страниц;
- переносом страницы в дереве;
- будущим schema recovery;
- будущим bulk import;
- будущим массовым изменением assets.

## Restore

Restore первого слоя работает осторожно:

- восстанавливает файлы страниц из snapshot;
- создает отсутствующие файлы;
- перезаписывает файлы с тем же именем;
- не удаляет новые файлы, которых не было в snapshot.

Такой restore безопаснее для первого внедрения: он не уничтожает данные, созданные после backup. Полный rollback с удалением лишних файлов нужно добавлять отдельно и только с подтверждением.

## Что нельзя делать

- Нельзя чинить данные без backup.
- Нельзя удалять orphan assets автоматически.
- Нельзя делать destructive rollback без явного подтверждения.
- Нельзя скрывать ошибки backup: если snapshot не создан, risky operation должна хотя бы вывести предупреждение.

## Следующий этап

- UI-команда "Создать резервную копию workspace".
- UI-список backups и кнопка restore.
- Backup assets по `AssetReference`.
- Автоматический snapshot перед schema recovery.
- Browser regression на delete/move с созданием backup.
