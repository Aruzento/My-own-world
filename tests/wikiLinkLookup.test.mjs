import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setPages
} from '../js/stateActions.js';

import {
  findPageByTitle,
  findPageByWikiLinkId,
  normalizePageName
} from '../js/editor/wikiLinkLookup.js';


test(
  'wiki-link lookup ищет страницы через PageRepository по title, alias и id',
  () => {

    const page =
      {
        id: 'hero',
        title: 'Лазарь',
        parent: null,
        order: 1,
        template: 'card',
        type: 'character',
        tags: ['card'],
        aliases: ['Лаз'],
        content: ''
      };

    setPages([
      page
    ]);

    assert.equal(
      findPageByTitle(' лазарь '),
      page
    );

    assert.equal(
      findPageByTitle('лаз'),
      page
    );

    assert.equal(
      findPageByWikiLinkId('hero'),
      page
    );
  }
);


test(
  'normalizePageName остается совместимым helper для старого кода',
  () => {

    assert.equal(
      normalizePageName('  Имя Страницы  '),
      'имя страницы'
    );
  }
);
