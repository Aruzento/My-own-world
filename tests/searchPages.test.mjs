import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setPages
} from '../js/stateActions.js';

import {
  searchPageResults,
  searchPages
} from '../js/search/searchPages.js';


test(
  'searchPages ищет через PageRepository по названию, alias, тегам и body',
  () => {

    const lore =
      {
        id: 'lore',
        name: 'lore.md',
        title: 'Велесская империя',
        parent: null,
        order: 1,
        template: 'card',
        type: 'lore',
        tags: ['card', 'history'],
        aliases: ['Велесса'],
        content: `---
id: lore
parent: null
order: 1
tags: [card, history]
template: card
type: lore
aliases: [Велесса]
---

<h1>Велесская империя</h1>
<p>Древняя держава на западе.</p>`
      };

    const character =
      {
        id: 'hero',
        name: 'hero.md',
        title: 'Лазарь',
        parent: null,
        order: 2,
        template: 'card',
        type: 'character',
        tags: ['card'],
        aliases: [],
        content: '<h1>Лазарь</h1>'
      };

    setPages([
      lore,
      character
    ]);

    assert.deepEqual(
      searchPages('велесса'),
      [lore]
    );

    assert.deepEqual(
      searchPages('history'),
      [lore]
    );

    assert.deepEqual(
      searchPages('держава'),
      [lore]
    );

    assert.deepEqual(
      searchPages(''),
      [
        lore,
        character
      ]
    );
  }
);


test(
  'searchPageResults returns ranked metadata while searchPages stays compatible',
  () => {

    const parent =
      {
        id: 'search-parent',
        name: 'parent.md',
        title: 'Parent',
        parent: null,
        order: 1,
        template: 'card',
        type: 'folder',
        tags: ['card'],
        aliases: [],
        content: '<h1>Parent</h1>'
      };

    const exact =
      {
        id: 'exact',
        name: 'exact.md',
        title: 'Needle',
        parent: 'search-parent',
        order: 1,
        template: 'card',
        type: 'note',
        tags: ['card'],
        aliases: [],
        content: '<h1>Needle</h1>'
      };

    const body =
      {
        id: 'body',
        name: 'body.md',
        title: 'Haystack',
        parent: 'search-parent',
        order: 2,
        template: 'card',
        type: 'note',
        tags: ['card'],
        aliases: [],
        content: '<h1>Haystack</h1><p>needle appears here.</p>'
      };

    setPages([
      parent,
      body,
      exact
    ]);

    assert.deepEqual(
      searchPages('needle').map(page => page.id),
      ['exact', 'body']
    );

    const results =
      searchPageResults(
        'needle'
      );

    assert.equal(
      results[0].score > results[1].score,
      true
    );

    assert.equal(
      results[0].path,
      'Parent / Needle'
    );
  }
);
