import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PageIndex,
  normalizePageTitle
} from '../js/repository/pageIndex.js';


function createPages() {

  return [
    {
      id: 'world',
      title: 'Мир',
      parent: null,
      order: 1,
      template: 'card',
      type: 'folder',
      tags: ['card']
    },
    {
      id: 'map',
      title: 'Пещера',
      parent: 'world',
      order: 2,
      template: 'campaignMap',
      type: 'campaignMap',
      tags: ['map']
    },
    {
      id: 'bucket',
      title: 'Существа.Пещера',
      parent: 'map',
      order: 1,
      template: 'card',
      type: 'folder',
      tags: ['card']
    },
    {
      id: 'copy',
      title: 'Гоблин - сущность.Пещера',
      parent: 'bucket',
      order: 1,
      template: 'card',
      type: 'creature',
      tags: ['card', 'monster'],
      aliases: ['Зеленый']
    },
    {
      id: 'hero',
      title: ' Лазарь  ',
      parent: 'world',
      order: 3,
      template: 'card',
      type: 'character',
      tags: ['card', 'player'],
      aliases: ['Лаз']
    },
    {
      id: 'duplicate',
      title: 'лазарь',
      parent: null,
      order: 4,
      template: 'card',
      type: 'character',
      tags: ['card']
    }
  ];
}


test(
  'normalizePageTitle мягко сравнивает названия',
  () => {

    assert.equal(
      normalizePageTitle('  Башня   Мага  '),
      'башня мага'
    );
  }
);


test(
  'PageIndex строит индексы по id, title и aliases',
  () => {

    const index =
      new PageIndex(
        createPages()
      );

    assert.equal(
      index.getPageById('hero')?.title,
      ' Лазарь  '
    );

    assert.equal(
      index.getPageByTitle('ЛАЗАРЬ')?.id,
      'hero'
    );

    assert.equal(
      index.findPageByTitleOrAlias('лаз')?.id,
      'hero'
    );

    assert.equal(
      index.findPageByTitleOrAlias('ЗЕЛЕНЫЙ')?.id,
      'copy'
    );
  }
);


test(
  'PageIndex возвращает детей, siblings и parent-chain',
  () => {

    const index =
      new PageIndex(
        createPages()
      );

    assert.deepEqual(
      index.getChildren('map').map(page => page.id),
      ['bucket']
    );

    assert.deepEqual(
      index.getSiblings('hero').map(page => page.id),
      ['map', 'hero']
    );

    assert.deepEqual(
      index.getParentChain('copy').map(page => page.id),
      ['bucket', 'map', 'world']
    );

    assert.deepEqual(
      index.getParentChain('copy', { rootFirst: true }).map(page => page.id),
      ['world', 'map', 'bucket']
    );
  }
);


test(
  'PageIndex проверяет потомков и ветку template',
  () => {

    const index =
      new PageIndex(
        createPages()
      );

    assert.equal(
      index.isDescendantOf('copy', 'map'),
      true
    );

    assert.equal(
      index.isDescendantOf('hero', 'map'),
      false
    );

    assert.equal(
      index.isUnderTemplate('copy', 'campaignMap'),
      true
    );

    assert.equal(
      index.isUnderTemplate('hero', 'campaignMap'),
      false
    );
  }
);


test(
  'PageIndex фильтрует страницы по metadata',
  () => {

    const index =
      new PageIndex(
        createPages()
      );

    assert.deepEqual(
      index.queryPages({
        template: 'card',
        type: ['character', 'creature'],
        tags: ['player'],
        excludeUnderTemplate: 'campaignMap'
      }).map(page => page.id),
      ['hero']
    );

    assert.deepEqual(
      index.getPagesByTag('monster').map(page => page.id),
      ['copy']
    );
  }
);


test(
  'PageIndex находит дубли названий и пересобирается',
  () => {

    const index =
      new PageIndex(
        createPages()
      );

    assert.deepEqual(
      index.findDuplicateTitles().map(group => ({
        title: group.title,
        ids: group.pages.map(page => page.id).sort()
      })),
      [
        {
          title: 'лазарь',
          ids: ['duplicate', 'hero']
        }
      ]
    );

    index.rebuild([
      {
        id: 'only',
        title: 'Один'
      }
    ]);

    assert.deepEqual(
      index.findDuplicateTitles(),
      []
    );

    assert.equal(
      index.getPageById('hero'),
      null
    );
  }
);
