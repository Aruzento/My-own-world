export const SETTINGS_GROUPS = Object.freeze([
  {
    id: 'main',
    title: 'ОСНОВНЫЕ'
  },
  {
    id: 'data',
    title: 'ДАННЫЕ И ФАЙЛЫ'
  },
  {
    id: 'world',
    title: 'МИР И ИГРОВЫЕ ИНСТРУМЕНТЫ'
  },
  {
    id: 'system',
    title: 'СИСТЕМА'
  }
]);


export const SETTINGS_SECTIONS = Object.freeze([
  {
    id: 'general',
    group: 'main',
    title: 'Общие',
    icon: 'settings',
    description:
      'Базовые настройки приложения появятся здесь, когда у них будет реальный workflow.',
    status: 'future',
    keywords: [
      'общие',
      'general',
      'основные',
      'приложение'
    ]
  },
  {
    id: 'appearance',
    group: 'main',
    title: 'Оформление',
    icon: 'magic',
    description:
      'Настройте внешний вид интерфейса MyOwnWorld.',
    renderer: 'appearance',
    keywords: [
      'оформление',
      'appearance',
      'тема',
      'theme',
      'контраст',
      'акцент',
      'цвет',
      'фон',
      'размер',
      'scale',
      'interface'
    ],
    searchItems: [
      'Тема',
      'Акцентный цвет',
      'Фон',
      'Размер интерфейса'
    ]
  },
  {
    id: 'profile',
    group: 'main',
    title: 'Профиль',
    icon: 'character',
    description:
      'Здесь появятся настройки пользователя и локального профиля.',
    status: 'future',
    keywords: [
      'профиль',
      'profile',
      'пользователь',
      'user'
    ]
  },
  {
    id: 'import',
    group: 'data',
    title: 'Файлы и импорт',
    icon: 'folder-open',
    description:
      'Здесь появятся настройки импорта, экспорта и файловых операций.',
    status: 'future',
    keywords: [
      'файлы',
      'импорт',
      'import',
      'export',
      'папка'
    ]
  },
  {
    id: 'storage',
    group: 'data',
    title: 'Хранилище',
    icon: 'folder',
    description:
      'Проверьте рабочую папку, ассеты и файлы, которые сейчас не используются.',
    renderer: 'storage',
    keywords: [
      'хранилище',
      'storage',
      'ассеты',
      'assets',
      'файлы',
      'сломанные ссылки',
      'orphan',
      'неиспользуемые',
      'удалить asset'
    ],
    searchItems: [
      'Проверить ассеты',
      'Сломанные ссылки',
      'Неиспользуемые файлы',
      'Удаление orphan-файла'
    ]
  },
  {
    id: 'backup',
    group: 'data',
    title: 'Резервные копии',
    icon: 'copy',
    description:
      'Создавайте, проверяйте и восстанавливайте резервные копии workspace.',
    renderer: 'backup',
    keywords: [
      'резерв',
      'backup',
      'копии',
      'восстановить',
      'restore',
      'retention',
      'хранить',
      'незавершенные',
      'незавершённые'
    ],
    searchItems: [
      'Создать резервную копию',
      'Восстановить резервную копию',
      'Количество хранимых копий',
      'Очистка старых копий',
      'Незавершённые резервные копии'
    ]
  },
  {
    id: 'game-system',
    group: 'world',
    title: 'Игровая система',
    icon: 'skill',
    description:
      'Здесь появятся настройки правил, бросков и систем кампании.',
    status: 'future',
    keywords: [
      'игровая система',
      'game',
      'rules',
      'dice',
      'правила',
      'кубики'
    ]
  },
  {
    id: 'maps',
    group: 'world',
    title: 'Карты',
    icon: 'campaign-map',
    description:
      'Здесь появятся настройки карт, сцены и презентации.',
    status: 'future',
    keywords: [
      'карты',
      'карта',
      'maps',
      'map',
      'сцена',
      'presentation',
      'тяжелые карты',
      'тяжёлые карты'
    ]
  },
  {
    id: 'graph',
    group: 'world',
    title: 'Граф связей',
    icon: 'link',
    description:
      'Здесь появятся настройки визуального графа и анализа связей.',
    status: 'future',
    keywords: [
      'граф',
      'связи',
      'graph',
      'link',
      'relations'
    ]
  },
  {
    id: 'integrations',
    group: 'world',
    title: 'Интеграции',
    icon: 'tools',
    description:
      'Здесь появятся настройки подключения внешних сервисов и инструментов.',
    status: 'future',
    keywords: [
      'интеграции',
      'integrations',
      'plugin',
      'external',
      'сервисы'
    ]
  },
  {
    id: 'system',
    group: 'system',
    title: 'Системные настройки',
    icon: 'settings',
    description:
      'Здесь появятся системные параметры приложения и окружения.',
    status: 'future',
    keywords: [
      'система',
      'system',
      'настройки',
      'окружение'
    ]
  },
  {
    id: 'diagnostics',
    group: 'system',
    title: 'Диагностика',
    icon: 'check',
    description:
      'Проверьте состояние workspace, схемы данных, ассетов, backup и производительности.',
    renderer: 'diagnostics',
    keywords: [
      'диагностика',
      'diagnostics',
      'workspace',
      'рабочая папка',
      'доступ',
      'схема',
      'schema',
      'recovery',
      'предупреждения',
      'performance',
      'медленные операции',
      'тяжёлые карты',
      'тяжелые карты',
      'самые большие страницы'
    ],
    searchItems: [
      'Состояние рабочей папки',
      'Доступ на чтение и запись',
      'Состояние схемы данных',
      'Schema recovery',
      'Незавершённые операции',
      'Статистика мира',
      'Самые большие страницы',
      'Тяжёлые карты',
      'Состояние ассетов',
      'Состояние резервных копий',
      'Performance events',
      'Recovery actions'
    ]
  },
  {
    id: 'experimental',
    group: 'system',
    title: 'Экспериментальные функции',
    icon: 'magic',
    description:
      'Здесь появятся экспериментальные настройки, когда они будут готовы к проверке.',
    status: 'future',
    keywords: [
      'экспериментальные',
      'experimental',
      'lab',
      'future',
      'ранний доступ'
    ]
  }
]);


export const DEFAULT_SETTINGS_SECTION_ID =
  'appearance';


export function getSettingsSection(
  id
) {

  return SETTINGS_SECTIONS.find(section =>
    section.id === id
  ) || null;
}


export function getSettingsSectionsByGroup(
  groupId
) {

  return SETTINGS_SECTIONS.filter(section =>
    section.group === groupId
  );
}


export function searchSettingsSections(
  query
) {

  const normalized =
    normalizeSettingsSearchText(
      query
    );

  if (!normalized) return [];

  return SETTINGS_SECTIONS
    .map(section => {

      const haystack =
        [
          section.title,
          section.description,
          ...(section.keywords || []),
          ...(section.searchItems || [])
        ]
          .map(normalizeSettingsSearchText)
          .join(' ');

      if (!haystack.includes(normalized)) {

        return null;
      }

      const matchedItem =
        (section.searchItems || []).find(item =>
          normalizeSettingsSearchText(item).includes(normalized)
        );

      return {
        section,
        match:
          matchedItem || section.title
      };
    })
    .filter(Boolean);
}


export function normalizeSettingsSearchText(
  value
) {

  return String(value || '')
    .trim()
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е');
}
