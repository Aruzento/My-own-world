import {
  state
} from '../state.js';

import {
  revealPageInTree
} from '../tree/tree.js';

import {
  iconSvg
} from '../core/icons.js';

const navigationStack =
  [];

export function updateNavigationStack(
  nextPage,
  options
) {

  if (
    options.source === 'tree'
  ) {

    navigationStack.length =
      0;

    return;
  }

  if (
    options.source === 'back' ||
    !state.currentPage ||
    !nextPage ||
    state.currentPage.id === nextPage.id
  ) return;

  navigationStack.push(
    state.currentPage.id
  );
}

export function renderBackButtonIfNeeded(
  editor,
  parsed,
  openPage
) {

  editor
    .querySelectorAll('.editor-page-nav')
    .forEach(nav => nav.remove());

  if (
    !isCardPageForBackButton(
      parsed
    )
  ) return;

  const title =
    editor.querySelector('.hero-block h1');

  if (!title) return;

  const nav =
    createNavigationContainer();

  nav.appendChild(
    createFindButton()
  );

  if (
    navigationStack.length > 0
  ) {

    nav.prepend(
      createBackButton(
        openPage
      )
    );
  }

  title.parentElement.prepend(
    nav
  );
}

function createNavigationContainer() {

  const nav =
    document.createElement('div');

  nav.className =
    'editor-page-nav';

  nav.dataset.runtime =
    'true';

  nav.setAttribute(
    'contenteditable',
    'false'
  );

  return nav;
}

function createFindButton() {

  const findButton =
    document.createElement('button');

  findButton.className =
    'editor-find-tree-button';

  findButton.type =
    'button';

  findButton.innerHTML =
    iconSvg(
      'search',
      'editor-nav-icon'
    );

  findButton.title =
    'Найти в дереве';

  findButton.setAttribute(
    'aria-label',
    'Найти в дереве'
  );

  findButton.addEventListener(
    'click',
    () => {

      revealPageInTree(
        state.currentPage?.id
      );
    }
  );

  return findButton;
}

function createBackButton(
  openPage
) {

  const button =
    document.createElement('button');

  button.className =
    'editor-back-button';

  button.type =
    'button';

  button.dataset.runtime =
    'true';

  button.innerHTML =
    iconSvg(
      'arrow-left',
      'editor-nav-icon'
    );

  button.title =
    'Назад';

  button.setAttribute(
    'aria-label',
    'Назад'
  );

  button.addEventListener(
    'click',
    () => {

      const previousId =
        navigationStack.pop();

      const previousPage =
        state.pages.find(page =>
          page.id === previousId
        );

      if (previousPage) {

        openPage(
          previousPage,
          {
            source: 'back'
          }
        );
      }
    }
  );

  return button;
}

function isCardPageForBackButton(
  parsed
) {

  const template =
    parsed.template ||
    state.currentPage?.template ||
    '';

  const type =
    parsed.type ||
    state.currentPage?.type ||
    '';

  if (
    template === 'campaignMap' ||
    type === 'campaignMap' ||
    template === 'taskTracker' ||
    type === 'taskTracker' ||
    template === 'ruleTree' ||
    type === 'ruleTree' ||
    template === 'knowledgeGraph' ||
    type === 'knowledgeGraph'
  ) return false;

  return true;
}
