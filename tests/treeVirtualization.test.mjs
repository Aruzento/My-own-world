import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVisibleTreeRows,
  getVirtualTreeRange,
  shouldVirtualizeTree,
  TREE_VIRTUALIZATION_THRESHOLD
} from '../js/tree/treeVirtualization.js';


test(
  'buildVisibleTreeRows keeps order, levels and collapsed branches',
  () => {

    const pages = [
      {
        id: 'child-b',
        name: 'child-b',
        title: 'Child B',
        parent: 'root',
        order: 2
      },
      {
        id: 'root',
        name: 'root',
        title: 'Root',
        parent: null,
        order: 1
      },
      {
        id: 'grandchild',
        name: 'grandchild',
        title: 'Grandchild',
        parent: 'child-a',
        order: 1
      },
      {
        id: 'child-a',
        name: 'child-a',
        title: 'Child A',
        parent: 'root',
        order: 1
      }
    ];

    const expanded =
      buildVisibleTreeRows(
        pages,
        new Set()
      );

    assert.deepEqual(
      expanded.rows.map(row => [
        row.page.id,
        row.level
      ]),
      [
        ['root', 0],
        ['child-a', 1],
        ['grandchild', 2],
        ['child-b', 1]
      ]
    );

    const collapsed =
      buildVisibleTreeRows(
        pages,
        new Set([
          'child-a'
        ])
      );

    assert.deepEqual(
      collapsed.rows.map(row => [
        row.page.id,
        row.level
      ]),
      [
        ['root', 0],
        ['child-a', 1],
        ['child-b', 1]
      ]
    );
  }
);


test(
  'getVirtualTreeRange renders only viewport rows with overscan',
  () => {

    const range =
      getVirtualTreeRange({
        rowCount: 1000,
        scrollTop: 38 * 200,
        viewportHeight: 38 * 10,
        rootOffset: 0,
        rowHeight: 38,
        overscan: 5
      });

    assert.equal(
      range.start,
      195
    );

    assert.equal(
      range.end,
      215
    );

    assert.equal(
      range.padTop,
      195 * 38
    );

    assert.equal(
      range.padBottom,
      (1000 - 215) * 38
    );
  }
);


test(
  'shouldVirtualizeTree starts after large workspace threshold',
  () => {

    assert.equal(
      shouldVirtualizeTree(
        TREE_VIRTUALIZATION_THRESHOLD
      ),
      false
    );

    assert.equal(
      shouldVirtualizeTree(
        TREE_VIRTUALIZATION_THRESHOLD + 1
      ),
      true
    );
  }
);
