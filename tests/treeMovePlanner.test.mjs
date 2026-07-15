import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createTreeMovePlan
} from '../js/tree/treeMovePlanner.js';


function page(
  id,
  parent,
  order
) {

  return {
    id,
    parent,
    order,
    name: `${id}.md`
  };
}


test(
  'createTreeMovePlan рассчитывает перенос внутрь target',
  () => {

    const pages =
      [
        page('dragged', null, 1),
        page('target', null, 2)
      ];

    const plan =
      createTreeMovePlan({
        pages,
        draggedId: 'dragged',
        targetId: 'target',
        mode: 'inside',
        orderValue: 99
      });

    assert.deepEqual(
      plan.map(item => ({
        id: item.page.id,
        parentId: item.parentId,
        order: item.order
      })),
      [
        {
          id: 'dragged',
          parentId: 'target',
          order: 99
        }
      ]
    );
  }
);


test(
  'createTreeMovePlan рассчитывает перенос в корень',
  () => {

    const pages =
      [
        page('parent', null, 1),
        page('dragged', 'parent', 2)
      ];

    const plan =
      createTreeMovePlan({
        pages,
        draggedId: 'dragged',
        mode: 'root',
        orderValue: 77
      });

    assert.deepEqual(
      plan.map(item => ({
        id: item.page.id,
        parentId: item.parentId,
        order: item.order
      })),
      [
        {
          id: 'dragged',
          parentId: null,
          order: 77
        }
      ]
    );
  }
);


test(
  'createTreeMovePlan сортирует на одном уровне перед target',
  () => {

    const pages =
      [
        page('a', 'root', 1),
        page('b', 'root', 2),
        page('c', 'root', 3)
      ];

    const plan =
      createTreeMovePlan({
        pages,
        draggedId: 'c',
        targetId: 'a',
        mode: 'before'
      });

    assert.deepEqual(
      plan.map(item => [
        item.page.id,
        item.parentId,
        item.order
      ]),
      [
        ['c', 'root', 0]
      ]
    );
  }
);


test(
  'createTreeMovePlan сортирует на одном уровне после target',
  () => {

    const pages =
      [
        page('a', 'root', 1),
        page('b', 'root', 2),
        page('c', 'root', 3)
      ];

    const plan =
      createTreeMovePlan({
        pages,
        draggedId: 'a',
        targetId: 'c',
        mode: 'after'
      });

    assert.deepEqual(
      plan.map(item => [
        item.page.id,
        item.parentId,
        item.order
      ]),
      [
        ['a', 'root', 4]
      ]
    );
  }
);
