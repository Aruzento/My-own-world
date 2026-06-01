// Список будущих browser smoke сценариев.
// Файл можно импортировать из Playwright/Vitest/browser runner, когда он появится.

export const browserSmokeScenarios = [
  {
    id: 'tree-dnd-save-after-move',
    priority: 'P0',
    area: 'tree',
    title: 'Перенос в дереве не ломает сохранение открытой страницы',
    description:
      'Открыть карточку, перенести ее в дереве, изменить текст без переоткрытия, перезагрузить страницу и проверить, что изменение сохранилось.',
    automatesChecklist: [
      'Дерево: 5',
      'Дерево: 7',
      'Дерево: 8',
      'Дерево: 9'
    ]
  },
  {
    id: 'tree-collapse-persistence',
    priority: 'P0',
    area: 'tree',
    title: 'Свернутые ветки дерева сохраняются после reload',
    description:
      'Свернуть несколько родительских веток, перезагрузить страницу и проверить, что они не раскрылись самопроизвольно.',
    automatesChecklist: [
      'Дерево: 1',
      'Дерево: 2',
      'Дерево: 3',
      'Дерево: 4'
    ]
  },
  {
    id: 'campaign-map-token-flow',
    priority: 'P0',
    area: 'campaign-map',
    title: 'Существо на карте создается, двигается и сохраняется',
    description:
      'Создать карту, добавить существо из карточки, переместить его, перезагрузить страницу и проверить позицию и дочерний дубль в дереве.',
    automationStatus:
      'automated: campaign-map-data-first-save-reload и campaign-map-add-page-flow-creates-bucket-duplicate-and-token',
    automatesChecklist: [
      'Карта Кампании: 1',
      'Карта Кампании: 4',
      'Карта Кампании: 6',
      'Карта Кампании: 12',
      'Карта Кампании: 13',
      'Карта Кампании: 14'
    ]
  },
  {
    id: 'campaign-map-token-removal',
    priority: 'P0',
    area: 'campaign-map',
    title: 'Удаление дочерней карточки убирает токен с карты',
    description:
      'Удалить страницу, к которой привязан токен, и проверить, что токен исчезает с открытой карты и из сохраненного HTML закрытой карты.',
    automationStatus:
      'automated: campaign-map-token-removal-updates-open-and-closed-map-data',
    automatesChecklist: [
      'Карта Кампании: 12',
      'Карта Кампании: 13'
    ]
  },
  {
    id: 'campaign-map-presentation-sync',
    priority: 'P0',
    area: 'campaign-map',
    title: 'Презентация синхронизируется с картой мастера',
    description:
      'Открыть презентацию, переместить токен и фигуру на карте мастера, проверить совпадение размеров, координат и скрытого состояния.',
    automationStatus:
      'automated: campaign-map-presentation-syncs-token-and-shape-by-id',
    automatesChecklist: [
      'Карта Кампании: 8',
      'Карта Кампании: 15'
    ]
  },
  {
    id: 'campaign-map-performance-smoke',
    priority: 'P1',
    area: 'campaign-map',
    title: 'Большая карта не ломает presentation sync',
    description:
      'Создать синтетическую сцену с большим количеством токенов и фигур, открыть презентацию, выполнить full-sync и item-level sync, проверить количество элементов и мягкие performance budgets.',
    automationStatus:
      'automated: campaign-map-performance-smoke-keeps-heavy-presentation-sync-bounded',
    automatesChecklist: [
      'Карта Кампании: performance',
      'Карта Кампании: presentation sync'
    ]
  },
  {
    id: 'campaign-map-fog-performance-smoke',
    priority: 'P1',
    area: 'campaign-map',
    title: 'Большой туман войны остается в performance budget',
    description:
      'Создать большой canvas тумана, выполнить серию операций рисования и проверить scenario budget fog-paint-large.',
    automationStatus:
      'automated: campaign-map-fog-paint-large-stays-inside-budget',
    automatesChecklist: [
      'Карта Кампании: fog paint',
      'Карта Кампании: performance'
    ]
  },
  {
    id: 'campaign-map-initiative-popup',
    priority: 'P1',
    area: 'campaign-map',
    title: 'Инициатива выбирает участников и сохраняется в карте',
    description:
      'Открыть popup инициативы, выбрать живое существо, выполнить roll d20 и проверить, что состояние записано в CampaignMapModel и persistent dataset карты.',
    automationStatus:
      'automated: campaign-map-initiative-popup-selects-rolls-and-persists-participants',
    automatesChecklist: [
      'Карта Кампании: initiative',
      'Карта Кампании: persistence'
    ]
  },
  {
    id: 'toolbar-formatting-boundary',
    priority: 'P1',
    area: 'editor',
    title: 'Форматирование не захватывает соседний текст',
    description:
      'Выделить часть текста, применить заголовок, обычный текст, жирный и цвет, затем проверить, что соседний текст не изменился.',
    automationStatus:
      'partly-automated: formatting-service-keeps-neighbour-text-unchanged проверяет inline boundary; block formatting и color остаются для Editor History Contract.',
    automatesChecklist: [
      'Карточки: 7',
      'Popup И UI: 3'
    ]
  },
  {
    id: 'task-tracker-dnd-persistence',
    priority: 'P1',
    area: 'task-tracker',
    title: 'Task Tracker сохраняет перенос задач и колонок',
    description:
      'Создать задачу, перенести между колонками, перенести колонку, обновить страницу и проверить порядок.',
    automationStatus:
      'automated: task-tracker-model-persists-task-and-column-order',
    automatesChecklist: [
      'Task Tracker: 1',
      'Task Tracker: 2',
      'Task Tracker: 4',
      'Task Tracker: 5',
      'Task Tracker: 8'
    ]
  },
  {
    id: 'popup-viewport-fit',
    priority: 'P1',
    area: 'ui',
    title: 'Popup-ы не выходят за видимую область',
    description:
      'Открыть create menu, block popup, wiki popup, toolbar color popup и profile popup возле краев экрана.',
    automationStatus:
      'partly-automated: visual-layout-guards-common-regressions проверяет общий popup boundary и toolbar width; конкретные popup по типам остаются для Popup Lifecycle Standardization.',
    automatesChecklist: [
      'Popup И UI: 1',
      'Popup И UI: 2',
      'Popup И UI: 3',
      'Popup И UI: 4',
      'Popup И UI: 5',
      'Popup И UI: 6'
    ]
  },
  {
    id: 'visual-core-surfaces',
    priority: 'P1',
    area: 'ui',
    title: 'Ключевые поверхности сохраняются как визуальные smoke-артефакты',
    description:
      'Открыть app shell, карточку, карту и task tracker, сделать screenshot attachments и проверить базовые layout-инварианты.',
    automationStatus:
      'automated: visual-safety-captures-core-surfaces и visual-layout-guards-common-regressions',
    automatesChecklist: [
      'Visual Regression: 4.1',
      'Visual Regression: 4.2',
      'Visual Regression: 4.3',
      'Visual Regression: 4.4',
      'Visual Regression: 4.5'
    ]
  },
  {
    id: 'template-create-card',
    priority: 'P2',
    area: 'templates',
    title: 'Карточка создается по шаблону',
    description:
      'Создать шаблон из карточки, создать новую карточку по шаблону, проверить уровень в дереве, тип, title и базовый HTML.',
    automationStatus:
      'automated: page-template-create-delete-and-create-card',
    automatesChecklist: [
      'Шаблоны: 1',
      'Шаблоны: 2',
      'Шаблоны: 3',
      'Шаблоны: 4',
      'Шаблоны: 5'
    ]
  }
];


export function getBrowserSmokeScenariosByPriority(
  priority
) {

  return browserSmokeScenarios.filter(scenario =>
    scenario.priority === priority
  );
}
