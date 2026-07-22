import {
  renderFilteredTree,
  renderTree
} from '../tree/tree.js';

import {
  normalizeSearchQuery,
  searchPageResults
} from '../search/searchPages.js';

import {
  setStatus
} from './ui.js';


const SIDEBAR_STATE_STORAGE_KEY =
  'my-own-world:app-shell-sidebar-state';

const SIDEBAR_WIDTH_STORAGE_KEY =
  'my-own-world:app-shell-sidebar-width';

const SIDEBAR_MIN_WIDTH =
  220;

const SIDEBAR_MAX_WIDTH =
  380;

const SIDEBAR_KEYBOARD_STEP =
  16;

const SHELL_TABS = {
  tree: {
    label: 'Дерево',
    sidebarLabel: 'Дерево',
    placeholder: 'Поиск по миру...',
    status: 'Открыто дерево мира'
  }
};

export function setupAppShell() {

  const app =
    document.querySelector('.app');

  if (!app) return;

  const tabButtons =
    [
      ...app.querySelectorAll('[data-shell-tab]')
    ];

  const treeRailButton =
    app.querySelector('[data-shell-tab="tree"]');

  const sidebarResizeHandle =
    document.getElementById('appSidebarResizeHandle');

  const rightPanel =
    document.getElementById('appRightPanel');

  const searchInput =
    document.getElementById('searchInput');

  tabButtons.forEach(button => {

    button.addEventListener(
      'click',
      () => handleShellTabClick(
        app,
        button
      )
    );
  });

  setupSidebarResize(
    app,
    sidebarResizeHandle
  );

  searchInput?.addEventListener(
    'input',
    () => renderActiveShell(
      app,
      {
        preserveSearch: true
      }
    )
  );

  applyRightPanelState(
    app,
    rightPanel,
    {
      visible: false
    }
  );

  applySidebarWidth(
    app,
    sidebarResizeHandle,
    readStoredSidebarWidth()
  );

  applyShellTab(
    app.dataset.appShellMode || 'tree',
    {
      updateStatus: false
    }
  );

  applySidebarState(
    app,
    treeRailButton,
    readStoredSidebarState()
  );
}


function handleShellTabClick(
  app,
  button
) {

  const tabName =
    normalizeShellTab(
      button.dataset.shellTab || 'tree'
    );

  const isCurrentTab =
    getActiveShellTab(
      app
    ) === tabName;

  if (tabName === 'tree' && isCurrentTab) {

    toggleSidebarState(
      app,
      button
    );

    return;
  }

  applyShellTab(
    tabName,
    {
      updateStatus: true
    }
  );

  if (tabName === 'tree') {

    applySidebarState(
      app,
      button,
      'expanded'
    );

    storeSidebarState(
      'expanded'
    );
  }
}


function applyShellTab(
  tabName,
  options = {}
) {

  const app =
    document.querySelector('.app');

  if (!app) return;

  const normalizedTabName =
    normalizeShellTab(
      tabName
    );

  app.dataset.appShellMode =
    normalizedTabName;

  const searchInput =
    document.getElementById('searchInput');

  const tab =
    SHELL_TABS[normalizedTabName];

  if (searchInput) {

    if (!options.preserveSearch) {

      searchInput.value =
        '';
    }

    searchInput.placeholder =
      tab.placeholder;

    searchInput.setAttribute(
      'aria-label',
      `Поиск: ${tab.sidebarLabel}`
    );
  }

  updateTabButtons(
    app,
    normalizedTabName
  );

  renderActiveShell(
    app,
    {
      updateStatus:
        options.updateStatus,
      preserveSearch:
        options.preserveSearch
    }
  );
}


function renderActiveShell(
  app,
  options = {}
) {

  const searchInput =
    document.getElementById('searchInput');

  const query =
    options.preserveSearch
      ? searchInput?.value || ''
      : '';

  renderTreeSidebar(
    app,
    query
  );

  if (options.updateStatus) {

    setStatus(
      getShellStatusText(
        query
      )
    );
  }
}


function renderTreeSidebar(
  app,
  query
) {

  const normalizedQuery =
    normalizeSearchQuery(
      query
    );

  if (normalizedQuery) {

    const results =
      searchPageResults(
        query
      );

    renderFilteredTree(
      results.map(result =>
        result.page
      ),
      {
        mode: 'search',
        searchResults:
          results
      }
    );

    setShellModeMetadata(
      app,
      'tree',
      {
        label: 'Поиск'
      }
    );

    return;
  }

  renderTree();

  setShellModeMetadata(
    app,
    'tree',
    {
      label:
        SHELL_TABS.tree.label
    }
  );
}


export function showAppRightPanel(
  {
    content = null,
    label = 'Правая панель'
  } = {}
) {

  applyRightPanelState(
    document.querySelector('.app'),
    document.getElementById('appRightPanel'),
    {
      content,
      label,
      visible: true
    }
  );
}


export function hideAppRightPanel() {

  applyRightPanelState(
    document.querySelector('.app'),
    document.getElementById('appRightPanel'),
    {
      visible: false
    }
  );
}


function applyRightPanelState(
  app,
  panel,
  {
    content = null,
    label = 'Правая панель',
    visible = false
  } = {}
) {

  if (!app || !panel) return;

  const isVisible =
    Boolean(visible);

  app.dataset.rightPanelState =
    isVisible
      ? 'visible'
      : 'hidden';

  panel.classList.toggle(
    'hidden',
    !isVisible
  );

  panel.setAttribute(
    'aria-hidden',
    String(!isVisible)
  );

  panel.setAttribute(
    'aria-label',
    label
  );

  if (!isVisible || !isPanelContentNode(content)) {

    panel.replaceChildren();

    return;
  }

  panel.replaceChildren(
    content
  );
}


function isPanelContentNode(
  value
) {

  return typeof Node !== 'undefined' && value instanceof Node;
}


function getShellStatusText(
  query
) {

  const normalizedQuery =
    normalizeSearchQuery(
      query
    );

  if (normalizedQuery) {

    const count =
      searchPageResults(
        query
      ).length;

    return `Поиск в дереве: ${count}`;
  }

  return SHELL_TABS.tree.status;
}


function updateTabButtons(
  app,
  activeTabName
) {

  app
    .querySelectorAll('[data-shell-tab]')
    .forEach(button => {

      const isActive =
        button.dataset.shellTab === activeTabName;

      button.classList.toggle(
        'is-active',
        isActive
      );

      button.setAttribute(
        'aria-pressed',
        String(isActive)
      );
    });
}


function setShellModeMetadata(
  app,
  tabName,
  {
    label
  }
) {

  app.dataset.appShellMode =
    tabName;

  const topbarModeLabel =
    document.getElementById('appTopbarModeLabel');

  if (topbarModeLabel) {

    topbarModeLabel.textContent =
      label;
  }
}


function getActiveShellTab(
  app
) {

  return normalizeShellTab(
    app?.dataset.appShellMode
  );
}


function normalizeShellTab(
  tabName
) {

  if (tabName === 'all') return 'tree';

  return SHELL_TABS[tabName]
    ? tabName
    : 'tree';
}


function toggleSidebarState(
  app,
  button
) {

  const nextState =
    app.dataset.sidebarState === 'collapsed'
      ? 'expanded'
      : 'collapsed';

  applySidebarState(
    app,
    button,
    nextState
  );

  storeSidebarState(
    nextState
  );
}


function storeSidebarState(
  state
) {

  try {

    localStorage.setItem(
      SIDEBAR_STATE_STORAGE_KEY,
      state
    );

  } catch (error) {

    // Local storage can be unavailable in hardened browser modes.
  }
}


function setupSidebarResize(
  app,
  handle
) {

  if (!handle) return;

  handle.addEventListener(
    'pointerdown',
    event => {

      if (
        event.button !== 0 ||
        app.dataset.sidebarState === 'collapsed'
      ) {

        return;
      }

      event.preventDefault();

      const startX =
        event.clientX;

      const startWidth =
        getCurrentSidebarWidth(
          app
        );

      app.dataset.sidebarResizing =
        'true';

      handle.setPointerCapture?.(
        event.pointerId
      );

      const onPointerMove =
        moveEvent => {

          applySidebarWidth(
            app,
            handle,
            startWidth + moveEvent.clientX - startX
          );
        };

      const onPointerEnd =
        endEvent => {

          handle.releasePointerCapture?.(
            endEvent.pointerId
          );

          delete app.dataset.sidebarResizing;

          storeSidebarWidth(
            getCurrentSidebarWidth(
              app
            )
          );

          handle.removeEventListener(
            'pointermove',
            onPointerMove
          );

          handle.removeEventListener(
            'pointerup',
            onPointerEnd
          );

          handle.removeEventListener(
            'pointercancel',
            onPointerEnd
          );
        };

      handle.addEventListener(
        'pointermove',
        onPointerMove
      );

      handle.addEventListener(
        'pointerup',
        onPointerEnd
      );

      handle.addEventListener(
        'pointercancel',
        onPointerEnd
      );
    }
  );

  handle.addEventListener(
    'keydown',
    event => {

      if (
        ![
          'ArrowLeft',
          'ArrowRight'
        ].includes(event.key)
      ) {

        return;
      }

      if (app.dataset.sidebarState === 'collapsed') return;

      event.preventDefault();

      const direction =
        event.key === 'ArrowLeft'
          ? -1
          : 1;

      const width =
        getCurrentSidebarWidth(
          app
        ) + direction * SIDEBAR_KEYBOARD_STEP;

      applySidebarWidth(
        app,
        handle,
        width
      );

      storeSidebarWidth(
        getCurrentSidebarWidth(
          app
        )
      );
    }
  );
}


function applySidebarWidth(
  app,
  handle,
  width
) {

  const normalizedWidth =
    normalizeSidebarWidth(
      width
    );

  app.style.setProperty(
    '--mow-shell-sidebar-width',
    `${normalizedWidth}px`
  );

  handle?.setAttribute(
    'aria-valuenow',
    String(normalizedWidth)
  );
}


function getCurrentSidebarWidth(
  app
) {

  return normalizeSidebarWidth(
    Number.parseFloat(
      getComputedStyle(
        app
      ).getPropertyValue(
        '--mow-shell-sidebar-width'
      )
    )
  );
}


function normalizeSidebarWidth(
  width
) {

  if (
    width === null ||
    width === undefined ||
    width === ''
  ) {

    return 270;
  }

  const numericWidth =
    Number(width);

  if (!Number.isFinite(numericWidth)) {

    return 270;
  }

  return Math.min(
    SIDEBAR_MAX_WIDTH,
    Math.max(
      SIDEBAR_MIN_WIDTH,
      Math.round(
        numericWidth
      )
    )
  );
}


function storeSidebarWidth(
  width
) {

  try {

    localStorage.setItem(
      SIDEBAR_WIDTH_STORAGE_KEY,
      String(
        normalizeSidebarWidth(
          width
        )
      )
    );

  } catch (error) {

    // Local storage can be unavailable in hardened browser modes.
  }
}


function readStoredSidebarWidth() {

  try {

    return localStorage.getItem(
      SIDEBAR_WIDTH_STORAGE_KEY
    );

  } catch (error) {

    return null;
  }
}


function applySidebarState(
  app,
  button,
  state
) {

  const normalizedState =
    state === 'collapsed'
      ? 'collapsed'
      : 'expanded';

  app.dataset.sidebarState =
    normalizedState;

  if (!button) return;

  const isCollapsed =
    normalizedState === 'collapsed';

  const label =
    isCollapsed
      ? 'Показать дерево'
      : 'Скрыть дерево';

  button.classList.toggle(
    'is-active',
    !isCollapsed
  );

  button.setAttribute(
    'aria-pressed',
    String(!isCollapsed)
  );

  button.setAttribute(
    'aria-expanded',
    String(!isCollapsed)
  );

  button.setAttribute(
    'aria-label',
    label
  );

  button.title =
    label;

  button.dataset.tooltip =
    label;
}


function readStoredSidebarState() {

  try {

    return localStorage.getItem(
      SIDEBAR_STATE_STORAGE_KEY
    );

  } catch (error) {

    return null;
  }
}
