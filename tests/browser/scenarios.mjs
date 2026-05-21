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
    id: 'campaign-map-presentation-sync',
    priority: 'P0',
    area: 'campaign-map',
    title: 'Презентация синхронизируется с картой мастера',
    description:
      'Открыть презентацию, переместить токен и фигуру на карте мастера, проверить совпадение размеров, координат и скрытого состояния.',
    automatesChecklist: [
      'Карта Кампании: 8',
      'Карта Кампании: 15'
    ]
  },
  {
    id: 'toolbar-formatting-boundary',
    priority: 'P1',
    area: 'editor',
    title: 'Форматирование не захватывает соседний текст',
    description:
      'Выделить часть текста, применить заголовок, обычный текст, жирный и цвет, затем проверить, что соседний текст не изменился.',
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
    id: 'template-create-card',
    priority: 'P2',
    area: 'templates',
    title: 'Карточка создается по шаблону',
    description:
      'Создать шаблон из карточки, создать новую карточку по шаблону, проверить уровень в дереве, тип, title и базовый HTML.',
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
