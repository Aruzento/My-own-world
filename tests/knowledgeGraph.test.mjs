import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildKnowledgeGraph,
  buildKnowledgeGraphCanvasModel,
  getKnowledgeGraphAccessPolicy,
  getKnowledgeGraphDomainEdges,
  getKnowledgeGraphDomainInsights,
  getKnowledgeGraphDomainSummary,
  getKnowledgeGraphExplorationHints,
  getKnowledgeGraphSummary,
  getOrphanGraphPages,
  getTypedRelationships
} from '../js/wiki/knowledgeGraph.js';

import {
  formatRelationshipsFrontMatter,
  parseMarkdown
} from '../js/core/markdown.js';


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
  'KnowledgeGraph supports explicit typed relationships',
  () => {

    const graph =
      buildKnowledgeGraph([
        {
          id: 'hero',
          title: 'Hero',
          relationships: [
            {
              type: 'ally',
              targetId: 'mentor',
              label: 'Teacher'
            },
            {
              type: 'rival faction',
              targetTitle: 'Guild'
            }
          ],
          content: ''
        },
        {
          id: 'mentor',
          title: 'Mentor',
          content: ''
        },
        {
          id: 'guild',
          title: 'Guild',
          content: ''
        }
      ]);

    assert.deepEqual(
      getTypedRelationships(
        graph,
        'ally'
      ),
      [
        {
          type: 'ally',
          from: 'hero',
          to: 'mentor',
          label: 'Teacher',
          source: 'manual'
        }
      ]
    );

    assert.equal(
      getTypedRelationships(
        graph,
        'rival-faction'
      )[0].to,
      'guild'
    );
  }
);


test(
  'KnowledgeGraph stores explicit relationships in page front matter',
  () => {

    const relationships =
      [
        {
          type: 'ally',
          targetId: 'mentor',
          label: 'Teacher'
        }
      ];

    const parsed =
      parseMarkdown(
`---
id: hero
parent: null
order: 1
tags: [card, character]
template: card
type: character
aliases: []
${formatRelationshipsFrontMatter(relationships)}---

<h1>Hero</h1>`
      );

    assert.deepEqual(
      parsed.relationships,
      relationships
    );
  }
);


test(
  'KnowledgeGraph groups relationships by readable domains',
  () => {

    const graph =
      buildKnowledgeGraph([
        {
          id: 'hero',
          title: 'Hero',
          type: 'character',
          relationships: [
            {
              type: 'equipped',
              targetId: 'sword',
              label: 'Main hand'
            },
            {
              type: 'ruleEffect',
              targetId: 'rules',
              label: 'Rage'
            }
          ],
          content: ''
        },
        {
          id: 'sword',
          title: 'Sword',
          type: 'item',
          content: ''
        },
        {
          id: 'guild',
          title: 'Guild',
          type: 'note',
          tags: [
            'organization'
          ],
          content: ''
        },
        {
          id: 'rules',
          title: 'Rules',
          template: 'ruleTree',
          type: 'ruleTree',
          content: ''
        }
      ]);

    assert.equal(
      getKnowledgeGraphDomainEdges(
        graph,
        'character'
      ).length,
      2
    );

    assert.equal(
      getKnowledgeGraphDomainEdges(
        graph,
        'item'
      ).length,
      1
    );

    assert.equal(
      getKnowledgeGraphDomainEdges(
        graph,
        'rule'
      ).length,
      1
    );

    assert.deepEqual(
      getKnowledgeGraphDomainSummary(
        graph
      ).map(item => [
        item.key,
        item.nodeCount
      ]),
      [
        [
          'character',
          1
        ],
        [
          'item',
          1
        ],
        [
          'organization',
          1
        ],
        [
          'rule',
          1
        ]
      ]
    );
  }
);


test(
  'KnowledgeGraph exposes domain insights for readable world exploration',
  () => {

    const graph =
      buildKnowledgeGraph([
        {
          id: 'hero',
          title: 'Hero',
          type: 'character',
          relationships: [
            {
              type: 'ally',
              targetId: 'guild',
              label: 'Member'
            },
            {
              type: 'equipped',
              targetId: 'sword',
              label: 'Main hand'
            }
          ],
          content: ''
        },
        {
          id: 'guild',
          title: 'Guild',
          type: 'note',
          tags: [
            'organization'
          ],
          content: ''
        },
        {
          id: 'sword',
          title: 'Sword',
          type: 'item',
          content: ''
        },
        {
          id: 'rules',
          title: 'Rules',
          template: 'ruleTree',
          type: 'ruleTree',
          relationships: [
            {
              type: 'ruleEffect',
              targetId: 'hero',
              label: 'Rage'
            }
          ],
          content: ''
        },
        {
          id: 'loose',
          title: 'Loose note',
          type: 'note',
          content: ''
        }
      ]);

    const insights =
      getKnowledgeGraphDomainInsights(
        graph
      );

    assert.deepEqual(
      insights.map(item => [
        item.key,
        item.nodeCount,
        item.edgeCount
      ]),
      [
        [
          'character',
          1,
          3
        ],
        [
          'item',
          1,
          1
        ],
        [
          'organization',
          1,
          1
        ],
        [
          'rule',
          1,
          1
        ]
      ]
    );

    const hints =
      getKnowledgeGraphExplorationHints(
        graph
      );

    assert.equal(
      hints.hubs[0].id,
      'hero'
    );

    assert.equal(
      hints.orphanCount,
      1
    );

    assert.match(
      hints.nextAction,
      /одинокие/i
    );
  }
);


test(
  'KnowledgeGraph declares Rule Tree access policy foundation',
  () => {

    const policy =
      getKnowledgeGraphAccessPolicy();

    assert.equal(
      policy.ruleTree.ownerRole,
      'admin'
    );

    assert.deepEqual(
      policy.ruleTree.editRoles,
      [
        'admin'
      ]
    );

    assert.ok(
      policy.ruleTree.readRoles.includes(
        'player'
      )
    );
  }
);


test(
  'KnowledgeGraph canvas model positions readable nodes and edges',
  () => {

    const graph =
      buildKnowledgeGraph([
        {
          id: 'hero',
          title: 'Hero',
          type: 'character',
          relationships: [
            {
              type: 'ally',
              targetId: 'guild',
              label: 'Member'
            },
            {
              type: 'equipped',
              targetId: 'sword',
              label: 'Main hand'
            }
          ],
          content: ''
        },
        {
          id: 'guild',
          title: 'Guild',
          type: 'organization',
          content: ''
        },
        {
          id: 'sword',
          title: 'Sword',
          type: 'item',
          content: ''
        },
        {
          id: 'loose',
          title: 'Loose',
          type: 'note',
          content: ''
        }
      ]);

    const canvas =
      buildKnowledgeGraphCanvasModel(
        graph,
        {
          width: 900,
          height: 500,
          maxNodes: 3
        }
      );

    assert.equal(
      canvas.width,
      900
    );

    assert.equal(
      canvas.layout,
      'tree'
    );

    assert.equal(
      canvas.nodes.length,
      3
    );

    assert.equal(
      canvas.nodes[0].id,
      'hero'
    );

    assert.equal(
      canvas.nodes[0].domain,
      'character'
    );

    assert.ok(
      canvas.domains.some(domain =>
        domain.key === 'item'
      )
    );

    assert.equal(
      canvas.edges.length,
      2
    );

    assert.equal(
      canvas.hiddenNodeCount,
      1
    );

    assert.ok(
      canvas.nodes.every(node =>
        Number.isFinite(node.x) &&
        Number.isFinite(node.y)
      )
    );

    assert.ok(
      canvas.edges.every(edge =>
        Number.isFinite(edge.x1) &&
        Number.isFinite(edge.y1) &&
        Number.isFinite(edge.x2) &&
        Number.isFinite(edge.y2)
      )
    );

    const hubCanvas =
      buildKnowledgeGraphCanvasModel(
        graph,
        {
          width: 900,
          height: 500,
          maxNodes: 3,
          layout: 'hub'
        }
      );

    assert.equal(
      hubCanvas.layout,
      'hub'
    );

    assert.equal(
      hubCanvas.nodes[0].x,
      450
    );

    const itemCanvas =
      buildKnowledgeGraphCanvasModel(
        graph,
        {
          width: 900,
          height: 500,
          filters: {
            domain: 'item'
          }
        }
      );

    assert.deepEqual(
      itemCanvas.nodes.map(node => node.id).sort(),
      [
        'hero',
        'sword'
      ]
    );

    assert.equal(
      itemCanvas.edges.length,
      1
    );

    const allyCanvas =
      buildKnowledgeGraphCanvasModel(
        graph,
        {
          width: 900,
          height: 500,
          filters: {
            relationshipType: 'ally'
          }
        }
      );

    assert.deepEqual(
      allyCanvas.nodes.map(node => node.id).sort(),
      [
        'guild',
        'hero'
      ]
    );

    const manualCanvas =
      buildKnowledgeGraphCanvasModel(
        graph,
        {
          width: 900,
          height: 500,
          filters: {
            relationshipType: 'manual'
          }
        }
      );

    assert.deepEqual(
      manualCanvas.edges.map(edge => edge.source),
      [
        'manual',
        'manual'
      ]
    );

    const pinnedCanvas =
      buildKnowledgeGraphCanvasModel(
        graph,
        {
          width: 900,
          height: 500,
          positions: {
            hero: {
              x: 240,
              y: 180,
              pinned: true
            }
          }
        }
      );

    const pinnedHero =
      pinnedCanvas.nodes.find(node =>
        node.id === 'hero'
      );

    assert.equal(
      pinnedHero.x,
      240
    );

    assert.equal(
      pinnedHero.y,
      180
    );

    assert.equal(
      pinnedHero.isPinned,
      true
    );

    const orphanCanvas =
      buildKnowledgeGraphCanvasModel(
        graph,
        {
          width: 900,
          height: 500,
          filters: {
            orphanOnly: true
          }
        }
      );

    assert.deepEqual(
      orphanCanvas.nodes.map(node => node.id),
      [
        'loose'
      ]
    );

    assert.equal(
      orphanCanvas.edges.length,
      0
    );
  }
);


test(
  'KnowledgeGraph canvas default view starts at roots and stops after two levels',
  () => {

    const graph =
      buildKnowledgeGraph([
        {
          id: 'world',
          title: 'World',
          parent: null,
          content: ''
        },
        {
          id: 'region',
          title: 'Region',
          parent: 'world',
          content: ''
        },
        {
          id: 'city',
          title: 'City',
          parent: 'region',
          content: ''
        },
        {
          id: 'inn',
          title: 'Inn',
          parent: 'city',
          content: ''
        }
      ]);

    const canvas =
      buildKnowledgeGraphCanvasModel(
        graph
      );

    assert.deepEqual(
      canvas.nodes.map(node => node.id),
      [
        'world',
        'region',
        'city'
      ]
    );

    assert.equal(
      canvas.layout,
      'tree'
    );

    assert.match(
      canvas.filterSummary.text,
      /Стандартный вид/
    );
  }
);


test(
  'KnowledgeGraph summary counts nodes edges and orphans',
  () => {

    const graph =
      buildKnowledgeGraph([
        {
          id: 'root',
          title: 'Root',
          content: '[[Child]]'
        },
        {
          id: 'child',
          title: 'Child',
          content: ''
        },
        {
          id: 'draft',
          title: 'Draft',
          content: ''
        }
      ]);

    assert.deepEqual(
      getKnowledgeGraphSummary(
        graph
      ),
      {
        nodeCount: 3,
        edgeCount: 1,
        orphanCount: 1,
        typeCounts: {
          wikiLink: 1
        }
      }
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
