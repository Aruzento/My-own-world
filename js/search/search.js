import { state } from '../state.js';

import {
  parseMarkdown,
} from '../core/markdown.js';

import {
  renderFilteredTree,
} from '../tree/tree.js';


export function setupSearch() {

  const input =
    document.getElementById(
      'searchInput'
    );

  input.addEventListener(
    'input',
    () => {

      const query =
        input.value.toLowerCase();

      if (!query) {

        renderFilteredTree(
          state.pages
        );

        return;
      }

      const filtered =
        state.pages.filter(page => {

          const parsed =
            parseMarkdown(
              page.content
            );

          const aliases =
  parsed.aliases || [];

return (

  page.name
    .toLowerCase()
    .includes(query)

  ||

  parsed.title
    .toLowerCase()
    .includes(query)

  ||

  parsed.body
    .toLowerCase()
    .includes(query)

  ||

  parsed.tags.some(tag =>
    tag
      .toLowerCase()
      .includes(query)
  )

  ||

  aliases.some(alias =>
    alias
      .toLowerCase()
      .includes(query)
  )
);
        });

      renderFilteredTree(filtered);
    }
  );
}