---
summary: "Visual regression checklist."
read_when:
  - "Before verification"
  - "When adding or changing tests"
owner_zone: "testing"
---
# Visual Regression / UX Safety Checklist

Дата создания: 01.06.2026.

Этот чеклист нужен перед push и перед крупными UI-изменениями. Он дополняет browser smoke: тесты ловят часть визуальных регрессий автоматически, а человек быстро проверяет то, что пока нельзя надежно оценить без глаз.

## Автоматические Проверки

Запуск:

```powershell
npm run test:browser
```

В состав visual smoke входит `tests/browser/visual-regression.spec.mjs`.

Он проверяет:

- app shell открывается и может быть снят как screenshot-артефакт;
- card editor рендерится без развала основной поверхности;
- campaign map рендерит компактный title chip, full-width scene/session bar, full-height icon-only canvas tool rail, unclipped floating toolbar tooltip, правый property Inspector, токены, объект, фигуру, сетку и locked fog zone без duplicate scene/layer stage panels;
- knowledge graph visual smoke captures both the whole workbench and `visual-knowledge-graph-node-menu`, so the CSS-split slice meter, inspector, node right-click overlays, grouped icon actions and collapsed relationship editing remain visible during UI review;
- task tracker рендерится как отдельная поверхность;
- popup позиционируется внутри viewport;
- floating toolbar сохраняет фиксированную ширину и не сжимается от выделения;
- Shift/selection-box на карте выделяет токены и фигуры в области;
- туман находится выше токенов и locked fog zone;
- бейдж `скрыт` у токена имеет ограниченный размер.

Скриншоты сохраняются как Playwright attachments. Они не являются pixel-perfect эталоном, чтобы CI не падал от мелких различий шрифтов и рендера, но дают быстрый визуальный след при разборе падений.

## Ручной Review Перед Push

1. Открыть пустой экран: виден текст приветствия, сетка создания не налезает на sidebar.
2. Открыть карточку: заголовок, тип, теги, портрет, блоки и toolbar не перекрывают друг друга.
3. Проверить popup возле краев окна: create menu, block popup, wiki popup, color popup, map popup, profile/settings/tools.
4. Проверить карту мастера: компактный title chip, full-width scene/session bar, full-height canvas tool rail без внутренних scrollbar, floating tooltip без обрезания, сетка, туман, locked fog zone, токены, фигуры, правый property Inspector, Layers popup и кастомное ПКМ-меню объекта; duplicate scene/layer panels не должны появляться поверх stage.
5. Проверить презентацию: туман над токенами, locked fog zone выглядит как туман, скрытые player-токены показывают бейдж.
6. Проверить массовое выделение на карте: Shift/selection-box выделяет сущности, обычный клик снимает выделение.
7. Проверить task tracker: 5 колонок в ряд, перенос колонок/задач, компактность карточек задач.
8. Проверить Knowledge Graph: после reload slice-meter, selected-node inspector и node/connect overlays должны сохранить один визуальный язык после CSS split.
9. Проверить узкое окно: toolbar, popup и кнопки не выходят за видимую область.

## Правило Расширения

Каждый новый визуальный P0/P1 баг после исправления должен получить одно из двух:

- автоматическую проверку в `tests/browser/visual-regression.spec.mjs`;
- пункт ручного checklist, если автоматизация пока слишком хрупкая.
