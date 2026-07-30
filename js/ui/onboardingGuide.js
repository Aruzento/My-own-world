import {
  closePopup,
  registerPopup
} from './popupManager.js';

import {
  iconSvg
} from '../core/icons.js';


const HELP_UI_MIGRATION =
  '0.0.1.8.14.3';

const ONBOARDING_SECTION_ORDER = [
  'quickstart',
  'product',
  'handoff',
  'support',
  'checklist'
];

const ONBOARDING_SECTIONS = {
  quickstart: {
    navLabel: 'Старт',
    triggerLabel: 'Быстрый старт',
    triggerDescription: 'Первые действия',
    kicker: 'Помощь',
    title: 'Быстрый старт',
    summary: 'Короткий маршрут от пустого окна к рабочему миру: папка, корень, первые страницы и связи.',
    iconName: 'play',
    chips: [
      ['Workspace', 'folder-open', 'ready'],
      ['Корень', 'folder', 'ready'],
      ['Создание', 'plus', 'ready']
    ],
    items: [
      {
        title: 'Открой папку мира',
        text: 'Если workspace еще не выбран, дерево показывает единственную основную кнопку открытия папки.',
        meta: '1 действие',
        iconName: 'folder-open',
        state: 'ready'
      },
      {
        title: 'Создай первую сущность',
        text: 'В строке Корень есть + для обычного создания и отдельная папка для быстрой структуры.',
        meta: 'дерево',
        iconName: 'plus',
        state: 'ready'
      },
      {
        title: 'Собери структуру',
        text: 'Перетаскивай страницы внутри дерева: порядок и вложенность сохраняются через обычный lifecycle страниц.',
        meta: 'DnD',
        iconName: 'grip',
        state: 'ready'
      },
      {
        title: 'Свяжи материалы',
        text: 'Wiki-ссылки вида [[Название]] соединяют карточки без ручного копирования путей.',
        meta: 'wiki',
        iconName: 'link',
        state: 'ready'
      }
    ]
  },
  product: {
    navLabel: 'Система',
    triggerLabel: 'Как устроено',
    triggerDescription: 'Главные поверхности',
    kicker: 'Карта системы',
    title: 'Как устроено',
    summary: 'MyOwnWorld держит все рабочие поверхности внутри одного локального workspace, а не как набор отдельных приложений.',
    iconName: 'document',
    chips: [
      ['Карточки', 'document', 'ready'],
      ['Карта', 'campaign-map', 'ready'],
      ['Задачи', 'task-tracker', 'ready']
    ],
    items: [
      {
        title: 'Карточки',
        text: 'Основной материал мира: лор, NPC, предметы, правила, изображения, свойства и обычные текстовые блоки.',
        meta: 'content',
        iconName: 'document',
        state: 'ready'
      },
      {
        title: 'Карта кампании',
        text: 'Canvas для сцены, токенов, фигур, тумана, слоев, инициативы и presentation режима.',
        meta: 'live',
        iconName: 'campaign-map',
        state: 'ready'
      },
      {
        title: 'Task Tracker',
        text: 'Доска подготовки с колонками, задачами и чеклистами; данные живут в своей JSON-модели.',
        meta: 'planning',
        iconName: 'task-tracker',
        state: 'ready'
      },
      {
        title: 'Поиск и команды',
        text: 'Редкие действия и глубокий поиск доступны через rail или Ctrl+K, чтобы topbar не превращался в склад кнопок.',
        meta: 'global',
        iconName: 'search',
        state: 'ready'
      }
    ]
  },
  handoff: {
    navLabel: 'Релиз',
    triggerLabel: 'Релиз',
    triggerDescription: 'Проверки handoff',
    kicker: 'Handoff',
    title: 'Релиз и проверка',
    summary: 'Короткая карта того, что должно быть зеленым перед передачей сборки или проверкой большого workspace.',
    iconName: 'check',
    chips: [
      ['verify', 'check', 'ready'],
      ['browser smoke', 'search', 'ready'],
      ['desktop gate', 'presentation', 'ready']
    ],
    items: [
      {
        title: 'Базовая проверка',
        text: 'npm run verify проверяет код, unit-тесты, encoding, performance smoke, diff и manual docx.',
        meta: 'required',
        iconName: 'check',
        state: 'ready'
      },
      {
        title: 'UI smoke',
        text: 'npm run test:browser проходит видимые сценарии: shell, карты, граф, задачи, попапы и visual guards.',
        meta: 'browser',
        iconName: 'search',
        state: 'ready'
      },
      {
        title: 'Desktop gate',
        text: 'npm run desktop:gate собирает frontend, проверяет Tauri окружение, упаковку и cargo check.',
        meta: 'desktop',
        iconName: 'presentation',
        state: 'ready'
      },
      {
        title: 'Большой workspace',
        text: 'Для handoff на реальном большом мире gate нужно запускать с --workspace и потом пройти native feel-check.',
        meta: 'large',
        iconName: 'folder-open',
        state: 'warning'
      }
    ]
  },
  support: {
    navLabel: 'Поддержка',
    triggerLabel: 'Поддержка',
    triggerDescription: 'Что открыть при сбое',
    kicker: 'Support',
    title: 'Поддержка и диагностика',
    summary: 'Куда смотреть, если workspace ведет себя странно: диагностика, assets, backup и честный статус import/export.',
    iconName: 'tools',
    chips: [
      ['Diagnostics', 'check', 'ready'],
      ['Backup', 'copy', 'ready'],
      ['Import/export', 'folder-open', 'ready']
    ],
    items: [
      {
        title: 'Диагностика workspace',
        text: 'Settings показывает путь, доступ на запись, schema status, backup status и pending operations.',
        meta: 'settings',
        iconName: 'settings',
        state: 'ready'
      },
      {
        title: 'Assets',
        text: 'Проверка assets отделяет broken references от orphan files и помечает опасные удаления.',
        meta: 'assets',
        iconName: 'image',
        state: 'ready'
      },
      {
        title: 'Backup / restore',
        text: 'Backup, restore preview и cleanup живут в maintenance панели; опасные действия требуют явного подтверждения.',
        meta: 'safety',
        iconName: 'copy',
        state: 'ready'
      },
      {
        title: 'Import / export',
        text: 'Tools -> Пакеты мира уже дает export, library, preview, backup-gated page/rulePackage import и asset preflight. Binary asset copy остается следующим шагом.',
        meta: 'Usable',
        iconName: 'folder-open',
        state: 'ready'
      }
    ]
  },
  checklist: {
    navLabel: 'Checklist',
    triggerLabel: 'Checklist',
    triggerDescription: 'Перед правками',
    kicker: 'Quality',
    title: 'Checklist',
    summary: 'Минимальный контроль перед изменениями UI, карт, карточек и релизных документов.',
    iconName: 'hash',
    chips: [
      ['UI', 'settings', 'ready'],
      ['Map', 'campaign-map', 'ready'],
      ['Docs', 'document', 'ready']
    ],
    items: [
      {
        title: 'UI',
        text: 'Проверь desktop, узкое окно, popup у краев экрана, фокус, hover и отсутствие наложения текста.',
        meta: 'visual',
        iconName: 'settings',
        state: 'ready'
      },
      {
        title: 'Карта',
        text: 'Проверь save/reload, presentation sync, fog, grid, zoom/pan, right-click и Inspector.',
        meta: 'map',
        iconName: 'campaign-map',
        state: 'ready'
      },
      {
        title: 'Карточки',
        text: 'Проверь clean-save, runtime controls, plain-text paste, wiki-links, undo/redo и Ctrl+S.',
        meta: 'editor',
        iconName: 'document',
        state: 'ready'
      },
      {
        title: 'Перед коммитом',
        text: 'Запусти targeted smoke, docs checks, verify; если менялся release path, обнови handoff документы.',
        meta: 'commit',
        iconName: 'check',
        state: 'warning'
      }
    ]
  }
};


export function setupOnboardingGuide() {

  const popup =
    document.getElementById('onboardingPopup');

  const mark =
    document.getElementById('onboardingMark');

  const title =
    document.getElementById('onboardingTitle');

  const summary =
    document.getElementById('onboardingSummary');

  const nav =
    document.getElementById('onboardingNav');

  const statusStrip =
    document.getElementById('onboardingStatusStrip');

  const body =
    document.getElementById('onboardingBody');

  const closeButton =
    document.getElementById('onboardingCloseBtn');

  if (
    !popup ||
    !mark ||
    !title ||
    !summary ||
    !nav ||
    !statusStrip ||
    !body ||
    !closeButton
  ) return;

  popup.setAttribute(
    'role',
    'dialog'
  );

  popup.setAttribute(
    'aria-modal',
    'false'
  );

  popup.setAttribute(
    'aria-labelledby',
    'onboardingTitle'
  );

  popup.dataset.helpUiMigration =
    HELP_UI_MIGRATION;

  enhanceToolsHelpTriggers();

  const controller =
    registerPopup({
      popup,
      close:
        () => popup.classList.add('hidden'),
      key:
        'onboarding-popup',
      kind:
        'dialog',
      modal:
        false
    });

  const elements = {
    popup,
    mark,
    title,
    summary,
    nav,
    statusStrip,
    body,
    controller
  };

  document.addEventListener(
    'click',
    event => {

      const button =
        event.target.closest('[data-onboarding-open]');

      if (!button) return;

      if (
        button.closest('#appToolsPopup')
      ) {

        closeToolsPopup();
      }

      openOnboardingSection(
        button.dataset.onboardingOpen,
        elements
      );
    }
  );

  closeButton.addEventListener(
    'click',
    () => controller.close()
  );
}


function enhanceToolsHelpTriggers() {

  const toolsPopup =
    document.getElementById('appToolsPopup');

  if (!toolsPopup) return;

  toolsPopup.dataset.toolsUiMigration =
    HELP_UI_MIGRATION;

  toolsPopup
    .querySelectorAll('[data-onboarding-open]')
    .forEach(button => {

      const section =
        ONBOARDING_SECTIONS[button.dataset.onboardingOpen] ||
        ONBOARDING_SECTIONS.quickstart;

      button.dataset.helpToolAction =
        section.navLabel.toLowerCase();

      button.innerHTML =
        `
          <span class="mow-tools-action-icon">${iconSvg(section.iconName, 'app-icon', { size: 'sm' })}</span>
          <span class="mow-tools-action-copy">
            <span>${escapeHtml(section.triggerLabel)}</span>
            <small>${escapeHtml(section.triggerDescription)}</small>
          </span>
        `;
    });
}


function closeToolsPopup() {

  const toolsPopup =
    document.getElementById('appToolsPopup');

  const toolsButton =
    document.getElementById('appToolsBtn');

  if (toolsButton) {

    toolsButton.setAttribute(
      'aria-expanded',
      'false'
    );
  }

  if (toolsPopup) {

    closePopup(
      toolsPopup
    );
  }
}


function openOnboardingSection(
  sectionKey,
  elements
) {

  const normalizedKey =
    ONBOARDING_SECTIONS[sectionKey]
      ? sectionKey
      : 'quickstart';

  const section =
    ONBOARDING_SECTIONS[normalizedKey];

  elements.popup.dataset.helpSection =
    normalizedKey;

  elements.mark.innerHTML =
    iconSvg(
      section.iconName,
      'onboarding-popup-mark-icon'
    );

  elements.title.textContent =
    section.title;

  elements.summary.textContent =
    section.summary;

  elements.nav.innerHTML =
    renderSectionNav(
      normalizedKey
    );

  elements.statusStrip.innerHTML =
    renderStatusChips(
      section.chips
    );

  elements.body.innerHTML =
    `<div class="onboarding-card-grid">${section.items
      .map(renderOnboardingItem)
      .join('')}</div>`;

  elements.controller.open();
}


function renderSectionNav(
  activeKey
) {

  return ONBOARDING_SECTION_ORDER
    .map(key => {

      const section =
        ONBOARDING_SECTIONS[key];

      const pressed =
        key === activeKey
          ? 'true'
          : 'false';

      return `
        <button class="onboarding-nav-button" type="button" data-onboarding-open="${escapeAttribute(key)}" data-help-route="${escapeAttribute(key)}" aria-pressed="${pressed}">
          ${iconSvg(section.iconName, 'onboarding-nav-icon', { size: 'sm' })}
          <span>${escapeHtml(section.navLabel)}</span>
        </button>
      `;
    })
    .join('');
}


function renderStatusChips(
  chips = []
) {

  return chips
    .map(([label, iconName, state]) => `
      <span class="onboarding-status-chip" data-help-status="${escapeAttribute(state)}">
        ${iconSvg(iconName, 'onboarding-status-icon', { size: 'sm' })}
        <span>${escapeHtml(label)}</span>
      </span>
    `)
    .join('');
}


function renderOnboardingItem(
  item
) {

  return `
    <section class="onboarding-card" data-help-card="${escapeAttribute(item.iconName)}" data-help-card-state="${escapeAttribute(item.state)}">
      <span class="onboarding-card-icon">${iconSvg(item.iconName, 'onboarding-card-icon-svg')}</span>
      <span class="onboarding-card-marker" aria-hidden="true"></span>
      <div class="onboarding-card-copy">
        <div class="onboarding-card-head">
          <h3>${escapeHtml(item.title)}</h3>
          <span>${escapeHtml(item.meta)}</span>
        </div>
        <p>${escapeHtml(item.text)}</p>
      </div>
    </section>
  `;
}


function escapeHtml(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}


function escapeAttribute(
  value
) {

  return escapeHtml(
    value
  );
}
