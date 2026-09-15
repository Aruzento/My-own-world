---
name: docs-restructure
description: "Move project documents or change documentation zones, metadata or navigation; not ordinary text/status edits."
---

# Docs Restructure Skill

## Когда Использовать

Использовать для moves, docs zones, metadata и navigation architecture. Обычная правка текста или статуса принятой фазы не включает этот skill.

## Что Прочитать Перед Задачей

- `AGENTS.md` и task scope; использовать его условные маршруты документации.
- `docs/README.md`
- `docs/02-architecture/AI_ONBOARDING.md`, только если нужен обзор связей подсистем, которого нет в task/contract.
- `docs/01-delivery/RELEASE_PROCESS.md`, если меняется release workflow.
- `docs/archive/README.md`, если задача касается старых или перенесенных документов

## Что Обновить После Задачи

- Входящие ссылки и metadata перемещённых документов.
- docs/README, archive registry или README — если изменились их зоны, маршруты или команды.
- AGENTS — только при изменении действительно глобального правила.
- Plan/log — только если затронут принятый scope/status или нужна запись решения; не связкой с DOCX.

## Проверки

- `npm run docs:index`, `npm run check:encoding` и проверка изменённых входящих/исходящих ссылок.
- `npm run agents:validate`, если затронуты skills или их пути.
- При изменении tooling — его targeted tests; task-required checks сохраняются. File audit запускать только если нужен пересчёт inventory, не как побочный generated diff после каждого move.

## Типовые Ошибки

- Не перемещать документы массово без обновления ссылок.
- Не создавать новые md-файлы без metadata, если задача как раз про docs-зоны.
- Не удалять старые документы без архивной причины.
- Не оставлять активные skills или README со ссылками на старые пути после переноса документа.
- Не считать untracked файл мусором автоматически: сначала проверить, не является ли он новым нужным документом или инструментом.
- Не смешивать product, delivery, architecture, testing и user-release материалы.
