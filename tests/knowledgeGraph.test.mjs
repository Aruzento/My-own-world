import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildKnowledgeGraph,
  getOrphanGraphPages,
  getTypedRelationships
} from '../js/wiki/knowledgeGraph.js';


test(
  'KnowledgeGraph строит tree и wiki-link связи',
  () => {

    const graph =
      buildKnowledgeGraph([
        {
          id: 'world',
          title: 'Мир',
          parent: null,
          aliases: [],
          content: ''
        },
        {
          id: 'city',
          title: 'Город',
          parent: 'world',
          aliases: ['Столица'],
          content: '[[Герой]]'
        },
        {
          id: 'hero',
          title: 'Герой',
          parent: null,
          aliases: [],
          content: ''
        }
      ]);

    assert.deepEqual(
      getTypedRelationships(
        graph,
        'treeParent'
      ),
      [
        {
          type: 'treeParent',
          from: 'world',
          to: 'city'
        }
      ]
    );

    assert.deepEqual(
      getTypedRelationships(
        graph,
        'wikiLink'
      ),
      [
        {
          type: 'wikiLink',
          from: 'city',
          to: 'hero',
          label: 'Герой'
        }
      ]
    );
  }
);


test(
  'KnowledgeGraph находит полностью одинокие страницы',
  () => {

    const graph =
      buildKnowledgeGraph([
        {
          id: 'linked',
          title: 'Связанная',
          parent: null,
          content: '[[Цель]]'
        },
        {
          id: 'target',
          title: 'Цель',
          parent: null,
          content: ''
        },
        {
          id: 'orphan',
          title: 'Одинокая',
          parent: null,
          content: ''
        }
      ]);

    assert.deepEqual(
      getOrphanGraphPages(
        graph
      ).map(page => page.id),
      [
        'orphan'
      ]
    );
  }
);
