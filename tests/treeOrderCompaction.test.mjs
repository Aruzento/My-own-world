import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOrderCompactionPlan,
  getOrderCompactionNeed
} from '../js/tree/treeOrderCompaction.js';


test(
  'order compaction detects dense sibling values',
  () => {

    const pages =
      [
        createPage(
          'a',
          'parent',
          1
        ),
        createPage(
          'b',
          'parent',
          1.0000000001
        ),
        createPage(
          'c',
          'parent',
          2
        )
      ];

    const need =
      getOrderCompactionNeed(
        pages,
        'parent'
      );

    assert.equal(
      need.needed,
      true
    );

    assert.equal(
      need.reason,
      'dense-order-values'
    );
  }
);


test(
  'order compaction rewrites only the affected sibling set',
  () => {

    const pages =
      [
        createPage(
          'a',
          'parent',
          1
        ),
        createPage(
          'b',
          'parent',
          1.0000000001
        ),
        createPage(
          'c',
          'parent',
          2
        ),
        createPage(
          'other',
          'other-parent',
          1.00000000001
        )
      ];

    const plan =
      createOrderCompactionPlan(
        pages,
        'parent'
      );

    assert.deepEqual(
      plan.map(update => update.page.id),
      [
        'a',
        'b',
        'c'
      ]
    );

    assert.deepEqual(
      plan.map(update => update.order),
      [
        1000,
        2000,
        3000
      ]
    );
  }
);


test(
  'order compaction skips healthy gaps',
  () => {

    const pages =
      [
        createPage(
          'a',
          null,
          1000
        ),
        createPage(
          'b',
          null,
          2000
        ),
        createPage(
          'c',
          null,
          3000
        )
      ];

    assert.equal(
      getOrderCompactionNeed(
        pages,
        null
      ).needed,
      false
    );

    assert.deepEqual(
      createOrderCompactionPlan(
        pages,
        null
      ),
      []
    );
  }
);


function createPage(
  id,
  parent,
  order
) {

  return {
    id,
    parent,
    order,
    name:
      `${id}.md`
  };
}
