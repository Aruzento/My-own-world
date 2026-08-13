import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAllPages,
  rebuildPageRepository
} from '../js/repository/pageRepository.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  canMovePage
} from '../js/tree/treeUtils.js';


function page(
  id,
  parent = null
) {

  return {
    id,
    parent,
    order:
      1,
    name:
      `${id}.md`,
    title:
      id
  };
}


test(
  'tree move lookup reads the PageRepository model instead of stale runtime pages',
  () => {

    try {

      setPages([
        page(
          'dragged'
        ),
        page(
          'stale-target'
        )
      ]);

      rebuildPageRepository([
        page(
          'dragged'
        ),
        page(
          'repository-target'
        )
      ]);

      assert.equal(
        canMovePage(
          'dragged',
          'repository-target',
          getAllPages()
        ),
        true
      );

      setPages([
        page(
          'dragged'
        ),
        page(
          'repository-target'
        )
      ]);

      rebuildPageRepository([
        page(
          'dragged'
        ),
        page(
          'repository-target',
          'dragged'
        )
      ]);

      assert.equal(
        canMovePage(
          'dragged',
          'repository-target',
          getAllPages()
        ),
        false
      );

    } finally {

      setPages([]);
      rebuildPageRepository();
    }
  }
);
