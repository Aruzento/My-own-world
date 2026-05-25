import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setPages
} from '../js/stateActions.js';

import {
  findPageByTitleOrAlias,
  getChildren,
  getPageById,
  getPagesByTag,
  getPagesByType,
  queryPages,
  rebuildPageRepository
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
