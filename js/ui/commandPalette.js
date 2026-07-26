import {
  openPage
} from '../editor/editor.js';

import {
  iconSvg
} from '../core/icons.js';

import {
  getRecentlyEditedPages,
  getRecentPages
} from '../repository/pageRepository.js';

import {
  normalizeSearchQuery,
  searchPageResults
} from '../search/searchPages.js';

import {
  closePopup,
  isPopupOpen,
  openPopup,
  registerPopup
} from './popupManager.js';

import {
  setStatus
} from './ui.js';


const COMMAND_LIMIT =
  6;

const PAGE_RESULT_LIMIT =
  8;

const RECENT_LIMIT =
  5;

const FIELD_LABELS = {
  title: 'название',
  alias: 'alias',
  tag: 'тег',
  content: 'текст',
  file: 'файл',
  text: 'текст'
};

let palettePopup =
  null;

let paletteInput =
  null;

let paletteResults =
  null;

let paletteController =
  null;

let activeItems =
  [];

let activeIndex =
  0;


export function setupCommandPalette() {

  palettePopup =
    document.getElementById('commandPalette');

  paletteInput =
    document.getElementById('commandPaletteInput');

  paletteResults =
    document.getElementById('commandPaletteResults');

  if (
    !palettePopup ||
    !paletteInput ||
    !paletteResults
  ) return;

  const openButtons =
    [
      ...document.querySelectorAll('[data-command-palette-open]')
    ];

  paletteController =
    registerPopup({
      popup:
        palettePopup,
      anchors:
        openButtons,
      key:
        'command-palette',
      modal:
        true,
      close:
        closeCommandPalette
    });

  openButtons.forEach(button => {

    button.addEventListener(
      'click',
      () => openCommandPalette()
    );
  });

  document
    .getElementById('commandPaletteCloseBtn')
    ?.addEventListener(
      'click',
      () => paletteController?.close()
    );

  paletteInput.addEventListener(
    'input',
    () => renderCommandPalette()
  );

  paletteInput.addEventListener(
    'keydown',
    handlePaletteInputKeydown
  );

  document.addEventListener(
    'keydown',
    handleGlobalCommandPaletteShortcut
  );

  renderCommandPalette();
}


function handleGlobalCommandPaletteShortcut(
  event
) {

  const key =
    String(event.key || '').toLowerCase();

  if (
    key !== 'k' ||
    (!event.ctrlKey && !event.metaKey) ||
    event.altKey
  ) return;

  event.preventDefault();

  if (
    isPopupOpen(
      palettePopup
    )
  ) {

    paletteController?.close();

    return;
  }

  openCommandPalette();
}


function openCommandPalette() {

  if (!palettePopup || !paletteInput) return;

  paletteInput.value =
    '';

  renderCommandPalette();

  openPopup(
    palettePopup
  );

  setCommandPaletteButtonsExpanded(
    true
  );

  window.requestAnimationFrame(
    () => paletteInput.focus({
      preventScroll:
        true
    })
  );
}


function closeCommandPalette() {

  if (!palettePopup) return;

  closePopup(
    palettePopup
  );

  setCommandPaletteButtonsExpanded(
    false
  );
}


function setCommandPaletteButtonsExpanded(
  isExpanded
) {

  document
    .querySelectorAll('[data-command-palette-open]')
    .forEach(button => {

      button.setAttribute(
        'aria-expanded',
        String(isExpanded)
      );
    });
}


function handlePaletteInputKeydown(
  event
) {

  if (
    event.key === 'ArrowDown'
  ) {

    event.preventDefault();

    moveActiveResult(
      1
    );

    return;
  }

  if (
    event.key === 'ArrowUp'
  ) {

    event.preventDefault();

    moveActiveResult(
      -1
    );

    return;
  }

  if (
    event.key !== 'Enter'
  ) return;

  const item =
    activeItems[activeIndex];

  if (!item) return;

  event.preventDefault();

  runPaletteItem(
    item
  );
}


function moveActiveResult(
  offset
) {

  if (!activeItems.length) return;

  activeIndex =
    (
      activeIndex +
      offset +
      activeItems.length
    ) % activeItems.length;

  syncActiveResult();
}


function renderCommandPalette() {

  if (!paletteResults || !paletteInput) return;

  const query =
    paletteInput.value || '';

  const normalizedQuery =
    normalizeSearchQuery(
      query
    );

  const sections =
    normalizedQuery
      ? buildQuerySections(
        query,
        normalizedQuery
      )
      : buildIdleSections();

  paletteResults.replaceChildren();

  const flatItems =
    [];

  sections
    .filter(section => section.items.length)
    .forEach(section => {

      paletteResults.appendChild(
        createSectionElement(
          section,
          flatItems
        )
      );
    });

  if (!flatItems.length) {

    paletteResults.appendChild(
      createEmptyState(
        normalizedQuery
          ? 'Ничего не найдено'
          : 'Откройте workspace, чтобы искать по миру'
      )
    );
  }

  activeItems =
    flatItems.filter(item =>
      !item.disabled
    );

  activeIndex =
    0;

  syncActiveResult();
}


function buildQuerySections(
  query,
  normalizedQuery
) {

  return [
    {
      title:
        'Команды',
      items:
        getCommandItems()
          .filter(item =>
            itemMatchesQuery(
              item,
              normalizedQuery
            )
          )
          .slice(
            0,
            COMMAND_LIMIT
          )
    },
    {
      title:
        'Страницы',
      items:
        searchPageResults(
          query,
          {
            limit:
              PAGE_RESULT_LIMIT
          }
        ).map(createPageResultItem)
    }
  ];
}


function buildIdleSections() {

  const recentItems =
    dedupePageResults(
      [
        ...getRecentPages({
          includeMetadata: true,
          limit:
            RECENT_LIMIT
        }),
        ...getRecentlyEditedPages({
          includeMetadata: true,
          limit:
            RECENT_LIMIT
        })
      ]
    ).map(result =>
      createPageResultItem(
        {
          ...result,
          matchedFields: [],
          excerpt: ''
        },
        {
          fallbackMeta:
            'недавняя страница'
        }
      )
    );

  return [
    {
      title:
        'Команды',
      items:
        getCommandItems().slice(
          0,
          COMMAND_LIMIT
        )
    },
    {
      title:
        'Недавнее',
      items:
        recentItems
    }
  ];
}


function getCommandItems() {

  const app =
    document.querySelector('.app');

  const sidebarCollapsed =
    app?.dataset.sidebarState === 'collapsed';

  const createPageButton =
    document.querySelector('.tree-root-drop-zone [data-create-page]');

  const createFolderButton =
    document.querySelector('.tree-root-drop-zone [data-create-folder]');

  const openWorkspaceButton =
    document.querySelector('[data-open-workspace]');

  return [
    {
      id:
        'open-workspace',
      kind:
        'command',
      icon:
        'folder-open',
      title:
        'Открыть папку',
      meta:
        openWorkspaceButton
          ? 'workspace'
          : 'нет доступной кнопки открытия',
      keywords:
        'workspace папка открыть проект',
      disabled:
        !openWorkspaceButton,
      action:
        () => triggerAfterClose('[data-open-workspace]')
    },
    {
      id:
        'create-page',
      kind:
        'command',
      icon:
        'plus',
      title:
        'Новая страница',
      meta:
        createPageButton
          ? 'создать в корне'
          : 'сначала откройте workspace',
      keywords:
        'создать новая страница карточка',
      disabled:
        !createPageButton,
      action:
        () => triggerAfterClose('.tree-root-drop-zone [data-create-page]')
    },
    {
      id:
        'create-folder',
      kind:
        'command',
      icon:
        'folder',
      title:
        'Новая папка',
      meta:
        createFolderButton
          ? 'type: folder'
          : 'сначала откройте workspace',
      keywords:
        'создать новая папка folder',
      disabled:
        !createFolderButton,
      action:
        () => triggerAfterClose('.tree-root-drop-zone [data-create-folder]')
    },
    {
      id:
        'toggle-tree',
      kind:
        'command',
      icon:
        'panel-left',
      title:
        sidebarCollapsed
          ? 'Показать дерево'
          : 'Скрыть дерево',
      meta:
        'левая панель',
      keywords:
        'дерево sidebar панель показать скрыть',
      action:
        () => triggerAfterClose('#appTreeRailBtn')
    },
    {
      id:
        'open-settings',
      kind:
        'command',
      icon:
        'settings',
      title:
        'Настройки',
      meta:
        'backup, диагностика, оформление',
      keywords:
        'настройки backup диагностика оформление',
      action:
        () => triggerAfterClose('#appSettingsBtn')
    },
    {
      id:
        'open-tools',
      kind:
        'command',
      icon:
        'tools',
      title:
        'Помощь и инструменты',
      meta:
        'быстрый старт и checklist',
      keywords:
        'инструменты помощь быстрый старт checklist',
      action:
        () => triggerAfterClose('#appToolsBtn')
    }
  ];
}


function itemMatchesQuery(
  item,
  normalizedQuery
) {

  const haystack =
    normalizeSearchQuery(
      [
        item.title,
        item.meta,
        item.keywords
      ].join(' ')
    );

  return haystack.includes(
    normalizedQuery
  );
}


function createPageResultItem(
  result,
  options = {}
) {

  const page =
    result.page;

  return {
    id:
      `page:${page?.id || ''}`,
    kind:
      'page',
    icon:
      getPageIconName(
        page
      ),
    title:
      getPageTitle(
        page
      ),
    meta:
      formatPageMeta(
        result,
        options.fallbackMeta
      ),
    path:
      result.path || '',
    excerpt:
      result.excerpt || '',
    page,
    action:
      () => {

        paletteController?.close();

        openPage(
          page,
          {
            source:
              'command-palette'
          }
        );

        setStatus(
          `Открыто из палитры: ${getPageTitle(page)}`
        );
      }
  };
}


function formatPageMeta(
  result,
  fallbackMeta = ''
) {

  const fields =
    (result.matchedFields || [])
      .map(field =>
        FIELD_LABELS[field] || field
      )
      .filter(Boolean);

  if (fields.length) {

    return `совпадение: ${dedupeStrings(fields).join(', ')}`;
  }

  return fallbackMeta || result.path || 'страница';
}


function createSectionElement(
  section,
  flatItems
) {

  const element =
    document.createElement('section');

  element.className =
    'command-palette-section';

  const title =
    document.createElement('div');

  title.className =
    'command-palette-section-title';

  title.textContent =
    section.title;

  element.appendChild(
    title
  );

  section.items.forEach(item => {

    const index =
      flatItems.length;

    item.paletteIndex =
      index;

    flatItems.push(
      item
    );

    element.appendChild(
      createItemButton(
        item,
        index
      )
    );
  });

  return element;
}


function createItemButton(
  item,
  index
) {

  const button =
    document.createElement('button');

  button.className =
    `command-palette-item command-palette-item-${item.kind}`;

  button.type =
    'button';

  button.id =
    `commandPaletteItem${index}`;

  button.dataset.commandPaletteIndex =
    String(index);

  button.setAttribute(
    'role',
    'option'
  );

  button.disabled =
    Boolean(
      item.disabled
    );

  if (item.disabled) {

    button.setAttribute(
      'aria-disabled',
      'true'
    );
  }

  const icon =
    document.createElement('span');

  icon.className =
    'command-palette-item-icon';

  icon.innerHTML =
    iconSvg(
      item.icon,
      'command-palette-item-icon-svg'
    );

  const text =
    document.createElement('span');

  text.className =
    'command-palette-item-text';

  const title =
    document.createElement('span');

  title.className =
    'command-palette-item-title';

  title.textContent =
    item.title;

  const meta =
    document.createElement('span');

  meta.className =
    'command-palette-item-meta';

  meta.textContent =
    [item.meta, item.path]
      .filter(Boolean)
      .join(' · ');

  text.append(
    title,
    meta
  );

  const hint =
    document.createElement('span');

  hint.className =
    'command-palette-item-hint';

  hint.textContent =
    item.kind === 'page'
      ? 'Открыть'
      : 'Выполнить';

  button.append(
    icon,
    text,
    hint
  );

  if (item.excerpt) {

    const excerpt =
      document.createElement('span');

    excerpt.className =
      'command-palette-item-excerpt';

    excerpt.textContent =
      item.excerpt;

    button.appendChild(
      excerpt
    );
  }

  button.addEventListener(
    'click',
    () => runPaletteItem(
      item
    )
  );

  return button;
}


function createEmptyState(
  text
) {

  const element =
    document.createElement('div');

  element.className =
    'command-palette-empty';

  element.textContent =
    text;

  return element;
}


function syncActiveResult() {

  if (!paletteInput || !paletteResults) return;

  paletteResults
    .querySelectorAll('.command-palette-item')
    .forEach(button => {

      button.classList.remove(
        'is-active'
      );

      button.setAttribute(
        'aria-selected',
        'false'
      );
    });

  const item =
    activeItems[activeIndex];

  if (!item) {

    paletteInput.removeAttribute(
      'aria-activedescendant'
    );

    return;
  }

  const button =
    paletteResults.querySelector(
      `[data-command-palette-index="${item.paletteIndex}"]`
    );

  if (!button) return;

  button.classList.add(
    'is-active'
  );

  button.setAttribute(
    'aria-selected',
    'true'
  );

  paletteInput.setAttribute(
    'aria-activedescendant',
    button.id
  );

  button.scrollIntoView({
    block:
      'nearest'
  });
}


function runPaletteItem(
  item
) {

  if (
    !item ||
    item.disabled
  ) return;

  item.action?.();
}


function triggerAfterClose(
  selector
) {

  const target =
    document.querySelector(
      selector
    );

  if (!target) return;

  paletteController?.close();

  window.requestAnimationFrame(
    () => target.click()
  );
}


function dedupePageResults(
  results
) {

  const seen =
    new Set();

  return results.filter(result => {

    const id =
      result?.page?.id;

    if (!id || seen.has(id)) return false;

    seen.add(
      id
    );

    return true;
  });
}


function dedupeStrings(
  values
) {

  return [
    ...new Set(
      values
    )
  ];
}


function getPageTitle(
  page
) {

  return String(
    page?.title ||
    page?.name ||
    'Без названия'
  );
}


function getPageIconName(
  page
) {

  const values =
    [
      page?.type,
      page?.template,
      ...(Array.isArray(page?.tags)
        ? page.tags
        : [])
    ].map(value =>
      String(value || '').toLowerCase()
    );

  if (
    values.includes('campaignmap') ||
    values.includes('campaign-map')
  ) return 'campaign-map';

  if (
    values.includes('tasktracker') ||
    values.includes('task-tracker')
  ) return 'task-tracker';

  if (
    values.includes('ruletree') ||
    values.includes('rule-tree')
  ) return 'lore';

  for (const [key, icon] of Object.entries({
    character: 'character',
    creature: 'creature',
    location: 'location',
    lore: 'lore',
    item: 'item',
    object: 'object',
    region: 'region',
    folder: 'folder',
    magic: 'magic',
    skill: 'skill'
  })) {

    if (
      values.includes(
        key
      )
    ) return icon;
  }

  return 'document';
}
