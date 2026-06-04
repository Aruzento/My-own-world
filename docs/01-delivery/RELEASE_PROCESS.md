---
summary: "Release process, versioning, rollback, and handoff rules."
read_when:
  - "Before choosing the next task"
  - "When updating delivery status"
owner_zone: "delivery"
---
# Release Process

Этот документ описывает, как готовить релиз MyOwnWorld.

## Правило Версий

Проект использует семантическую схему `major.minor.patch`.

### Patch

Patch повышается, когда изменение исправляет баг или добавляет небольшое безопасное улучшение без смены контрактов данных.

Примеры:

- правка popup;
- исправление drag behavior;
- новый regression test;
- небольшая оптимизация без изменения формата сохранения.

### Minor

Minor повышается, когда появляется новая пользовательская возможность или новый системный contract, совместимый со старыми данными.

Примеры:

- новая сущность;
- новая подсистема карты;
- новый тип блока;
- новый storage helper;
- новый workflow проверки.

### Major

Major повышается, когда меняется формат данных или поведение, которое требует миграции, ручного обновления workspace или может сломать старые страницы.

Примеры:

- обязательная миграция `.md`;
- несовместимое изменение card shell;
- удаление старого block type;
- смена storage format.

### Experimental

Experimental-фичи можно вести без повышения версии, если они явно отключены или не подключены к пользовательскому flow.

Если experimental-фича попадает в обычный UI, она должна считаться обычным изменением версии.

## Release Checklist

1. Проверить `docs/01-delivery/PROJECT_PLAN.md`: статусы актуальны.
2. Проверить `docs/01-delivery/WORK_LOG.md`: крупные изменения описаны.
3. Обновить `docs/MY_OWN_WORLD_FULL_MANUAL.docx`.
4. Обновить `README.md`, если изменились команды, архитектура или пользовательский flow.
5. Обновить `docs/01-delivery/CHANGELOG.md`: перенести `Unreleased` в новую версию.
6. Запустить локально:

```powershell
npm run verify
npm run test:browser
```

7. Проверить кодировку:

```powershell
$pattern = ([char]0x0420 + [char]0x045C + [char]0x0420 + [char]0x00B0) + "|" + ([char]0x0421 + [char]0x0453 + [char]0x0420 + [char]0x0457 + [char]0x0420 + [char]0x00B0)
rg -n $pattern .github js tests docs README.md docs/01-delivery/CHANGELOG.md --glob "!docs/MY_OWN_WORLD_FULL_MANUAL.docx"
```

8. Сделать commit в согласованном формате.
9. Push в `main`.
10. Дождаться зеленого GitHub Actions `Verify`.

## Package Version И Git Tags

`package.json` пока остается техническим npm-манифестом, а история версий ведется через git commits и будущие git tags.

Когда появится формальный релизный цикл:

1. `package.json.version` должен совпадать с release tag.
2. Tag должен иметь формат `vX.Y.Z`.
3. `docs/01-delivery/CHANGELOG.md` должен иметь раздел `vX.Y.Z - YYYY-MM-DD`.

## Rollback Guide

Rollback нужен, если после push обнаружена критическая регрессия.

### Если Регрессия Только В Коде

1. Найти последний стабильный commit:

```powershell
git log --oneline
```

2. Создать revert commit:

```powershell
git revert <commit>
```

3. Запустить проверки:

```powershell
npm run verify
npm run test:browser
```

4. Push revert commit.

### Если Регрессия В Данных Workspace

1. Не делать автоматический runtime fix.
2. Зафиксировать, какие `.md` или assets изменены.
3. Восстановить данные из резервной копии workspace или из git, если workspace тоже версионируется.
4. Исправить источник проблемы в коде.
5. Добавить regression test.

## Release Notes Template

```markdown
## vX.Y.Z - YYYY-MM-DD

Короткое описание релиза.

### Что Добавлено

- 

### Что Изменено

- 

### Что Исправлено

- 

### Риски И Миграции

- 

### Проверки

- `npm run verify`
- `npm run test:browser`
- GitHub Actions `Verify`
```
