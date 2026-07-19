import {
  renderFilteredTree,
  renderTree
} from '../tree/tree.js';

import {
  openPage
} from '../editor/editor.js';

import {
  getRecentlyEditedPages,
  getRecentPages
} from '../repository/pageRepository.js';

import {
  normalizeSearchQuery,
  searchPageResults
} from './searchPages.js';


export function setupSearch() {

  const input =
    document.getElementById(
      'searchInput'
    );

  const hintsPanel =
    createSearchHintsPanel(
      input
    );

  input.addEventListener(
    'input',
    () => {

      const query =
        input.value;

      if (
        !normalizeSearchQuery(
          query
        )
      ) {

        renderTree();
        renderSearchHints(
          input,
          hintsPanel
        );

        return;
      }

      hideSearchHints(
        hintsPanel
      );

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
    }
  );

  input.addEventListener(
    'focus',
    () => {

      renderSearchHints(
        input,
        hintsPanel
      );
    }
  );

  input.addEventListener(
    'blur',
    () => {

      setTimeout(
        () => hideSearchHints(
          hintsPanel
        ),
        120
      );
    }
  );
}


function createSearchHintsPanel(
  input
) {

  const panel =
    document.createElement('div');

  panel.className =
    'search-hints hidden';

  panel.setAttribute(
    'aria-label',
    'Recent pages'
  );

  input.insertAdjacentElement(
    'afterend',
    panel
  );

  return panel;
}


function renderSearchHints(
  input,
  panel
) {

  if (
    normalizeSearchQuery(
      input.value
    )
  ) {

    hideSearchHints(
      panel
    );

    return;
  }

  const sections =
    [
      {
        title: '\u041d\u0435\u0434\u0430\u0432\u043d\u043e',
        items:
          getRecentPages({
            includeMetadata: true,
            limit: 5
          })
      },
      {
        title: '\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u043e',
        items:
          getRecentlyEditedPages({
            includeMetadata: true,
            limit: 5
          })
      }
    ];

  panel.replaceChildren();

  let hasItems =
    false;

  sections.forEach(section => {

    const uniqueItems =
      dedupeHintItems(
        section.items
      );

    if (uniqueItems.length === 0) return;

    hasItems =
      true;

    const group =
      document.createElement('section');

    group.className =
      'search-hints-section';

    const title =
      document.createElement('div');

    title.className =
      'search-hints-title';

    title.textContent =
      section.title;

    group.appendChild(
      title
    );

    uniqueItems.forEach(result => {

      group.appendChild(
        createSearchHintButton(
          result,
          panel,
          input
        )
      );
    });

    panel.appendChild(
      group
    );
  });

  panel.classList.toggle(
    'hidden',
    !hasItems
  );
}


function createSearchHintButton(
  result,
  panel,
  input
) {

  const button =
    document.createElement('button');

  button.className =
    'search-hint-item';

  button.type =
    'button';

  const label =
    document.createElement('span');

  label.className =
    'search-hint-label';

  label.textContent =
    result.page?.title || result.page?.name || '';

  const path =
    document.createElement('span');

  path.className =
    'search-hint-path';

  path.textContent =
    result.path || '';

  button.append(
    label,
    path
  );

  button.addEventListener(
    'mousedown',
    event => {

      event.preventDefault();
    }
  );

  button.addEventListener(
    'click',
    () => {

      input.value =
        '';

      hideSearchHints(
        panel
      );

      openPage(
        result.page,
        {
          source: 'search-recent'
        }
      );
    }
  );

  return button;
}


function dedupeHintItems(
  items
) {

  const seen =
    new Set();

  return items.filter(result => {

    const id =
      result?.page?.id;

    if (!id || seen.has(id)) return false;

    seen.add(
      id
    );

    return true;
  });
}


function hideSearchHints(
  panel
) {

  panel.classList.add(
    'hidden'
  );
}
