import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setPages
} from '../js/stateActions.js';

import {
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
