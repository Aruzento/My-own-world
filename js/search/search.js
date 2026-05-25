import {
  renderFilteredTree
} from '../tree/tree.js';

import {
  searchPages
} from './searchPages.js';


export function setupSearch() {

  const input =
    document.getElementById(
      'searchInput'
    );

  input.addEventListener(
    'input',
    () => {

      const query =
        input.value;

      renderFilteredTree(
        searchPages(
          query
        )
      );
    }
  );
}
