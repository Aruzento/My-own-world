import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TreeIndex
} from '../js/repository/treeIndex.js';


function page(
  overrides
) {

  return {
    id: overrides.id,
    parent: overrides.parent ?? null,
    order: overrides.order ?? 0,
    title: overrides.title || overrides.id,
    ...overrides
  };
}


test(
  'TreeIndex keeps parent children sorted and answers tree lookups',
  () => {

    const root =
      page({
        id: 'root',
        order: 1
      });

    const childB =
      page({
        id: 'child-b',
        parent: 'root',
        order: 20
      });

    const childA =
      page({
        id: 'child-a',
        parent: 'root',
        order: 10
      });

    const grandChild =
      page({
        id: 'grand-child',
        parent: 'child-a',
        order: 1
      });

    const index =
      new TreeIndex([
        childB,
        grandChild,
        root,
        childA
      ]);

    assert.deepEqual(
      index.getRootPages(),
      [
        root
      ]
    );

    assert.deepEqual(
      index.getChildren('root'),
      [
        childA,
        childB
      ]
    );

    assert.deepEqual(
      index.getSiblings('child-b'),
      [
        childA,
        childB
      ]
    );

    assert.equal(
      index.getParentId('grand-child'),
      'child-a'
    );

    assert.equal(
      index.isDescendantOf('grand-child', 'root'),
      true
    );

    assert.equal(
      index.isDescendantOf('root', 'grand-child'),
      false
    );
  }
);


test(
  'TreeIndex validates missing parents and cycles',
  () => {

    const index =
      new TreeIndex([
        page({
          id: 'a',
          parent: 'b'
        }),
        page({
          id: 'b',
          parent: 'a'
        }),
        page({
          id: 'orphan',
          parent: 'missing'
        })
      ]);

    const result =
      index.validate();

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.errors.some(error =>
        error.code === 'tree.missing_parent' &&
        error.pageId === 'orphan'
      )
    );

    assert.ok(
      result.errors.some(error =>
        error.code === 'tree.parent_cycle'
      )
    );
  }
);


test(
  'TreeIndex updates pages incrementally without rebuilding all callers',
  () => {

    const parentA =
      page({
        id: 'parent-a'
      });

    const parentB =
      page({
        id: 'parent-b'
      });

    const child =
      page({
        id: 'child',
        parent: 'parent-a',
        order: 1
      });

    const index =
      new TreeIndex([
        parentA,
        parentB,
        child
      ]);

    const movedChild = {
      ...child,
      parent: 'parent-b',
      order: 5
    };

    index.updatePage(
      child,
      movedChild
    );

    assert.deepEqual(
      index.getChildren('parent-a'),
      []
    );

    assert.deepEqual(
      index.getChildren('parent-b'),
      [
        movedChild
      ]
    );

    index.deletePage(
      movedChild
    );

    assert.deepEqual(
      index.getChildren('parent-b'),
      []
    );
  }
);
