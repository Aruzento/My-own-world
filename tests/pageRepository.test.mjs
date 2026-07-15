import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setPages
} from '../js/stateActions.js';

import {
  findPageByTitleOrAlias,
  getChildren,
  getPageIndex,
  getPageById,
  getPagesByTag,
  getPagesByType,
  getTreeIndex,
  notifyPageMoved,
  notifyPageUpdated,
  queryPages,
  rebuildPageRepository,
  validateTreeIndex
} from '../js/repository/pageRepository.js';


function makePage(
  overrides = {}
) {

  return {
    id: overrides.id || crypto.randomUUID(),
    parent: overrides.parent ?? null,
    order: overrides.order ?? 0,
    title: overrides.title || 'Страница',
    type: overrides.type || 'note',
    tags: overrides.tags || [],
    template: overrides.template || 'card',
    aliases: overrides.aliases || [],
    content: overrides.content || '',
    ...overrides
  };
}


test(
  'PageRepository пересобирает индекс после setPages',
  () => {

    const parent =
      makePage({
        id: 'parent',
        title: 'Родитель',
        type: 'folder',
        tags: ['card', 'folder']
      });

    const child =
      makePage({
        id: 'child',
        parent: 'parent',
        title: 'Герой',
        type: 'character',
        tags: ['card', 'player'],
        aliases: ['Воин']
      });

    setPages([
      parent,
      child
    ]);

    assert.equal(
      getPageById('child'),
      child
    );

    assert.equal(
      findPageByTitleOrAlias('воин'),
      child
    );

    assert.deepEqual(
      getChildren('parent'),
      [child]
    );

    assert.deepEqual(
      getTreeIndex().getChildren('parent'),
      [child]
    );

    assert.deepEqual(
      getPagesByType('character'),
      [child]
    );

    assert.deepEqual(
      getPagesByTag('player'),
      [child]
    );
  }
);


test(
  'PageRepository обновляется после мутации страницы и ручного notify/rebuild',
  () => {

    const page =
      makePage({
        id: 'mutable',
        title: 'Старое имя',
        type: 'note',
        tags: ['card'],
        aliases: []
      });

    setPages([
      page
    ]);

    page.title =
      'Новое имя';

    page.type =
      'magic';

    page.tags =
      ['card', 'magic'];

    page.aliases =
      ['Арканум'];

    rebuildPageRepository();

    assert.equal(
      findPageByTitleOrAlias('Новое имя'),
      page
    );

    assert.equal(
      findPageByTitleOrAlias('арканум'),
      page
    );

    assert.deepEqual(
      queryPages({
        type: 'magic',
        tags: ['magic']
      }),
      [page]
    );
  }
);


test(
  'PageRepository видит удаление и перенос после lifecycle updates',
  () => {

    const firstParent =
      makePage({
        id: 'first-parent',
        title: 'Первая папка'
      });

    const secondParent =
      makePage({
        id: 'second-parent',
        title: 'Вторая папка'
      });

    const child =
      makePage({
        id: 'moving-child',
        parent: 'first-parent',
        title: 'Переносимая'
      });

    setPages([
      firstParent,
      secondParent,
      child
    ]);

    child.parent =
      'second-parent';

    rebuildPageRepository();

    assert.deepEqual(
      getChildren('first-parent'),
      []
    );

    assert.deepEqual(
      getChildren('second-parent'),
      [child]
    );

    assert.equal(
      validateTreeIndex().valid,
      true
    );

    setPages([
      firstParent,
      secondParent
    ]);

    assert.equal(
      getPageById('moving-child'),
      null
    );
  }
);


test(
  'PageRepository updates moved and changed pages without full rebuild',
  () => {

    const root =
      makePage({
        id: 'root',
        title: 'Root'
      });

    const oldParent =
      makePage({
        id: 'old-parent',
        title: 'Old Parent'
      });

    const nextParent =
      makePage({
        id: 'next-parent',
        title: 'Next Parent'
      });

    const movingPage =
      makePage({
        id: 'moving-page',
        parent: 'old-parent',
        title: 'Old Title',
        aliases: ['Old Alias'],
        type: 'note',
        tags: ['old-tag']
      });

    setPages([
      root,
      oldParent,
      nextParent,
      movingPage
    ]);

    const index =
      getPageIndex();

    const originalRebuild =
      index.rebuild;

    index.rebuild =
      () => {

        throw new Error(
          'full rebuild should not run during incremental lifecycle update'
        );
      };

    try {

      const beforeMove =
        {
          ...movingPage,
          tags: [...movingPage.tags],
          aliases: [...movingPage.aliases]
        };

      movingPage.parent =
        'next-parent';

      movingPage.order =
        10;

      notifyPageMoved(
        beforeMove,
        movingPage
      );

      assert.deepEqual(
        getChildren('old-parent'),
        []
      );

      assert.deepEqual(
        getChildren('next-parent'),
        [movingPage]
      );

      assert.deepEqual(
        getTreeIndex().getChildren('next-parent'),
        [movingPage]
      );

      const beforeUpdate =
        {
          ...movingPage,
          tags: [...movingPage.tags],
          aliases: [...movingPage.aliases]
        };

      movingPage.title =
        'New Title';

      movingPage.aliases =
        ['New Alias'];

      movingPage.type =
        'character';

      movingPage.tags =
        ['player'];

      notifyPageUpdated(
        beforeUpdate,
        movingPage
      );

      assert.equal(
        findPageByTitleOrAlias('Old Alias'),
        null
      );

      assert.equal(
        findPageByTitleOrAlias('New Alias'),
        movingPage
      );

      assert.deepEqual(
        getPagesByType('character'),
        [movingPage]
      );

      assert.deepEqual(
        getPagesByTag('player'),
        [movingPage]
      );

    } finally {

      index.rebuild =
        originalRebuild;

      rebuildPageRepository();
    }
  }
);
