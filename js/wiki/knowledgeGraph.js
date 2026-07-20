import {
  parseMarkdown
} from '../core/markdown.js';


const WIKI_LINK_PATTERN =
  /\[\[([^\]]+)\]\]/g;

const DOMAIN_DEFINITIONS = {
  character: {
    label: 'Персонажи',
    description: 'Кто участвует в истории, бою и сценах.',
    question: 'С кем связан персонаж?',
    types: [
      'character',
      'creature'
    ],
    tags: [
      'character',
      'creature',
      'player',
      'персонаж',
      'существо',
      'игрок'
    ]
  },
  item: {
    label: 'Предметы',
    description: 'Что принадлежит героям, лежит в мире или влияет на правила.',
    question: 'Кто владеет предметом или использует его?',
    types: [
      'item',
      'object',
      'magic',
      'skill'
    ],
    tags: [
      'item',
      'object',
      'magic',
      'skill',
      'предмет',
      'объект',
      'магия',
      'навык'
    ]
  },
  organization: {
    label: 'Организации',
    description: 'Фракции, гильдии, дома и любые группы мира.',
    question: 'С кем дружит, спорит или конфликтует организация?',
    types: [
      'organization',
      'faction',
      'guild'
    ],
    tags: [
      'organization',
      'faction',
      'guild',
      'организация',
      'фракция',
      'гильдия'
    ]
  },
  rule: {
    label: 'Правила',
    description: 'Правила, источники расчетов и будущая база знаний.',
    question: 'На кого влияет правило?',
    types: [
      'ruletree',
      'rule',
      'rules'
    ],
    templates: [
      'ruletree'
    ],
    tags: [
      'rule',
      'rules',
      'rule-tree',
      'правило',
      'правила'
    ]
  }
};

const KNOWLEDGE_GRAPH_ACCESS_POLICY = {
  ruleTree: {
    label: 'Правила',
    ownerRole: 'admin',
    readRoles: [
      'admin',
      'player',
      'viewer'
    ],
    editRoles: [
      'admin'
    ],
    note:
      'Сейчас роли еще не включены в интерфейс, но Rule Tree уже помечен как зона будущего admin-редактирования.'
  }
};

const KNOWLEDGE_GRAPH_CANVAS_WIDTH =
  1600;

const KNOWLEDGE_GRAPH_CANVAS_HEIGHT =
  960;

const KNOWLEDGE_GRAPH_CANVAS_PADDING =
  180;

const KNOWLEDGE_GRAPH_CANVAS_NODE_GAP_X =
  250;

const KNOWLEDGE_GRAPH_CANVAS_NODE_GAP_Y =
  170;

const KNOWLEDGE_GRAPH_CANVAS_DEFAULT_DEPTH =
  2;

const KNOWLEDGE_GRAPH_CANVAS_LAYOUTS =
  [
    {
      key: 'character',
      label: 'Персонажи',
      x: 0.18,
      y: 0.34,
      types: [
        'character',
        'creature'
      ],
      tags: [
        'character',
        'creature',
        'player',
        'персонаж',
        'существо',
        'игрок'
      ]
    },
    {
      key: 'item',
      label: 'Предметы',
      x: 0.5,
      y: 0.26,
      types: [
        'item',
        'object',
        'magic',
        'skill'
      ],
      tags: [
        'item',
        'object',
        'magic',
        'skill',
        'предмет',
        'объект',
        'магия',
        'навык'
      ]
    },
    {
      key: 'organization',
      label: 'Организации',
      x: 0.82,
      y: 0.34,
      types: [
        'organization',
        'faction',
        'guild'
      ],
      tags: [
        'organization',
        'faction',
        'guild',
        'организация',
        'фракция',
        'гильдия'
      ]
    },
    {
      key: 'location',
      label: 'Локации',
      x: 0.24,
      y: 0.74,
      types: [
        'location',
        'region',
        'place'
      ],
      tags: [
        'location',
        'region',
        'place',
        'локация',
        'регион',
        'место'
      ]
    },
    {
      key: 'map',
      label: 'Карты',
      x: 0.5,
      y: 0.78,
      types: [
        'campaignmap',
        'map'
      ],
      templates: [
        'campaignmap'
      ],
      tags: [
        'campaignmap',
        'map',
        'карта'
      ]
    },
    {
      key: 'rule',
      label: 'Правила',
      x: 0.76,
      y: 0.74,
      types: [
        'ruletree',
        'rule',
        'rules'
      ],
      templates: [
        'ruletree'
      ],
      tags: [
        'rule',
        'rules',
        'rule-tree',
        'правило',
        'правила'
      ]
    },
    {
      key: 'note',
      label: 'Заметки',
      x: 0.5,
      y: 0.54,
      types: [
        'note',
        'card'
      ],
      tags: [
        'note',
        'заметка'
      ],
      fallback: true
    }
  ];


export function buildKnowledgeGraph(
  pages
) {

  const nodes =
    normalizePages(
      pages
    );

  const edges =
    [
      ...createTreeEdges(nodes),
      ...createWikiLinkEdges(nodes),
      ...createManualRelationshipEdges(nodes)
    ];

  return {
    nodes,
    edges
  };
}


export function getOrphanGraphPages(
  graph
) {

  const connectedIds =
    new Set();

  graph.edges.forEach(edge => {

    connectedIds.add(
      edge.from
    );

    connectedIds.add(
      edge.to
    );
  });

  return graph.nodes
    .filter(node =>
      !connectedIds.has(
        node.id
      )
    );
}


export function getTypedRelationships(
  graph,
  type
) {

  return graph.edges
    .filter(edge =>
      edge.type === type
    );
}


export function getKnowledgeGraphSummary(
  graph
) {

  return {
    nodeCount:
      graph.nodes.length,
    edgeCount:
      graph.edges.length,
    orphanCount:
      getOrphanGraphPages(
        graph
      ).length,
    typeCounts:
      graph.edges.reduce(
        (counts, edge) => {
          counts[edge.type] =
            (counts[edge.type] || 0) + 1;

          return counts;
        },
        {}
      )
  };
}


export function getKnowledgeGraphDomainDefinitions() {

  return Object.entries(
    DOMAIN_DEFINITIONS
  )
    .map(([key, definition]) => ({
      key,
      label:
        definition.label,
      description:
        definition.description,
      question:
        definition.question
    }));
}


export function getKnowledgeGraphCanvasDomainDefinitions() {

  return KNOWLEDGE_GRAPH_CANVAS_LAYOUTS
    .map(domain => ({
      key:
        domain.key,
      label:
        domain.label
    }));
}


export function getKnowledgeGraphDomainSummary(
  graph
) {

  return getKnowledgeGraphDomainDefinitions()
    .map(domain => ({
      ...domain,
      nodeCount:
        getKnowledgeGraphDomainNodes(
          graph,
          domain.key
        ).length,
      edgeCount:
        getKnowledgeGraphDomainEdges(
          graph,
          domain.key
        ).length,
      nodes:
        getKnowledgeGraphDomainNodes(
          graph,
          domain.key
        )
          .slice(0, 6)
    }));
}


export function getKnowledgeGraphDomainInsights(
  graph
) {

  const nodesById =
    createNodeLookup(
      graph
    );

  return getKnowledgeGraphDomainDefinitions()
    .map(domain => {

      const nodes =
        getKnowledgeGraphDomainNodes(
          graph,
          domain.key
        );

      const edges =
        getKnowledgeGraphDomainEdges(
          graph,
          domain.key
        );

      return {
        ...domain,
        nodeCount:
          nodes.length,
        edgeCount:
          edges.length,
        nodes:
          nodes.slice(0, 6),
        relationships:
          edges
            .slice(0, 6)
            .map(edge => ({
              ...edge,
              fromTitle:
                nodesById.get(edge.from)?.title || edge.from,
              toTitle:
                nodesById.get(edge.to)?.title || edge.to
            }))
      };
    });
}


export function getKnowledgeGraphExplorationHints(
  graph
) {

  const edgeCounts =
    createEdgeCountMap(
      graph
    );

  const hubs =
    (graph?.nodes || [])
      .filter(node =>
        node.type !== 'knowledgeGraph' &&
        node.template !== 'knowledgeGraph'
      )
      .map(node => ({
        id:
          node.id,
        title:
          node.title,
        type:
          node.type || node.template || 'note',
        edgeCount:
          edgeCounts.get(node.id) || 0
      }))
      .sort((left, right) =>
        right.edgeCount - left.edgeCount ||
        String(left.title || '').localeCompare(
          String(right.title || ''),
          'ru'
        )
      )
      .slice(0, 5);

  const orphans =
    getOrphanGraphPages(
      graph
    )
      .filter(node =>
        node.type !== 'knowledgeGraph' &&
        node.template !== 'knowledgeGraph'
      );

  return {
    hubs,
    orphanCount:
      orphans.length,
    nextAction:
      orphans.length > 0
        ? 'Есть одинокие страницы: их стоит связать wiki-link или ручной связью.'
        : 'Мир связан. Дальше можно исследовать домены персонажей, предметов, организаций и правил.'
  };
}


export function getKnowledgeGraphAccessPolicy() {

  return {
    ...KNOWLEDGE_GRAPH_ACCESS_POLICY,
    ruleTree: {
      ...KNOWLEDGE_GRAPH_ACCESS_POLICY.ruleTree,
      readRoles: [
        ...KNOWLEDGE_GRAPH_ACCESS_POLICY.ruleTree.readRoles
      ],
      editRoles: [
        ...KNOWLEDGE_GRAPH_ACCESS_POLICY.ruleTree.editRoles
      ]
    }
  };
}


export function buildKnowledgeGraphCanvasModel(
  graph,
  options = {}
) {

  const width =
    Number(options.width) ||
    KNOWLEDGE_GRAPH_CANVAS_WIDTH;

  const height =
    Number(options.height) ||
    KNOWLEDGE_GRAPH_CANVAS_HEIGHT;

  const maxNodes =
    Number(options.maxNodes) ||
    96;

  const layout =
    options.layout === 'hub'
      ? 'hub'
      : options.layout === 'domain'
        ? 'domain'
        : 'tree';

  const filters =
    normalizeCanvasFilters(
      options.filters || {}
    );

  const filteredGraph =
    getFilteredCanvasGraph(
      graph,
      filters
    );

  const canvasGraph =
    !hasActiveCanvasFilters(filters) &&
    filters.viewPreset !== 'all' &&
    layout === 'tree'
      ? getDefaultRootCanvasGraph(
        filteredGraph,
        KNOWLEDGE_GRAPH_CANVAS_DEFAULT_DEPTH
      )
      : filteredGraph;

  const edgeCounts =
    createEdgeCountMap(
      canvasGraph
    );

  const candidates =
    getCanvasNodeCandidates(
      canvasGraph,
      edgeCounts,
      layout
    );

  const visibleNodes =
    candidates.slice(
      0,
      maxNodes
    );

  const visibleIds =
    new Set(
      visibleNodes.map(node => node.id)
    );

  const positionedNodes =
    layout === 'tree'
      ? positionTreeCanvasNodes(
        visibleNodes,
        canvasGraph.edges || [],
        edgeCounts
      )
      : layout === 'hub'
        ? positionHubCanvasNodes(
          visibleNodes,
          edgeCounts,
          width,
          height
        )
        : positionDomainCanvasNodes(
          visibleNodes,
          edgeCounts,
          width,
          height
        );

  const positionOverrides =
    normalizeCanvasPositionOverrides(
      options.positions || {}
    );

  const finalPositionedNodes =
    positionedNodes.map(node => {

      const override =
        positionOverrides.get(
          node.id
        );

      if (!override) return node;

      return {
        ...node,
        x:
          override.x,
        y:
          override.y,
        isPinned:
          override.pinned
      };
    });

  const worldBounds =
    getCanvasWorldBounds(
      finalPositionedNodes,
      width,
      height
    );

  const nodesById =
    new Map(
      finalPositionedNodes.map(node => [
        node.id,
        node
      ])
    );

  const visibleEdges =
    (canvasGraph.edges || [])
      .filter(edge =>
        visibleIds.has(edge.from) &&
        visibleIds.has(edge.to)
      )
      .map(edge => {

        const source =
          nodesById.get(edge.from);

        const target =
          nodesById.get(edge.to);

        return {
          ...edge,
          x1:
            source.x,
          y1:
            source.y,
          x2:
            target.x,
          y2:
            target.y,
          midX:
            Math.round((source.x + target.x) / 2),
          midY:
            Math.round((source.y + target.y) / 2)
        };
      });

  return {
    width:
      worldBounds.width,
    height:
      worldBounds.height,
    layout,
    filters,
    filterSummary:
      getCanvasFilterSummary(
        graph,
        filters,
        positionedNodes.length,
        {
          isDefaultRootView:
            !hasActiveCanvasFilters(filters) &&
            filters.viewPreset !== 'all' &&
            layout === 'tree',
          defaultDepth:
            KNOWLEDGE_GRAPH_CANVAS_DEFAULT_DEPTH
        }
      ),
    nodes:
      finalPositionedNodes,
    edges:
      visibleEdges,
    domains:
      getCanvasDomainSummary(
        finalPositionedNodes,
        worldBounds.width,
        worldBounds.height
      ),
    hiddenNodeCount:
      Math.max(
        0,
        candidates.length - visibleNodes.length
      ),
    hiddenEdgeCount:
      Math.max(
        0,
        (canvasGraph.edges || []).length - visibleEdges.length
      )
  };
}


export function getKnowledgeGraphDomainNodes(
  graph,
  domain
) {

  return (graph?.nodes || [])
    .filter(node =>
      nodeBelongsToDomain(
        node,
        domain
      )
    );
}


export function getKnowledgeGraphDomainEdges(
  graph,
  domain
) {

  const nodesById =
    new Map(
      (graph?.nodes || []).map(node => [
        node.id,
        node
      ])
    );

  return (graph?.edges || [])
    .filter(edge =>
      nodeBelongsToDomain(
        nodesById.get(edge.from),
        domain
      ) ||
      nodeBelongsToDomain(
        nodesById.get(edge.to),
        domain
      )
    );
}


function normalizePages(
  pages
) {

  return (pages || [])
    .filter(page => page?.id)
    .map(page => ({
      id: page.id,
      title: page.title || 'Без названия',
      parent: page.parent || null,
      type: page.type || 'note',
      template: page.template || 'card',
      tags: Array.isArray(page.tags)
        ? page.tags
        : [],
      aliases: Array.isArray(page.aliases)
        ? page.aliases
        : [],
      relationships: Array.isArray(page.relationships)
        ? page.relationships
        : [],
      content: page.content || ''
    }));
}


function nodeBelongsToDomain(
  node,
  domain
) {

  if (!node) return false;

  const definition =
    DOMAIN_DEFINITIONS[domain];

  if (!definition) return false;

  const type =
    normalizeLookupText(
      node.type
    );

  const template =
    normalizeLookupText(
      node.template
    );

  const tags =
    (node.tags || [])
      .map(tag =>
        normalizeLookupText(
          tag
        )
      );

  return (
    (definition.types || []).includes(type) ||
    (definition.templates || []).includes(template) ||
    tags.some(tag =>
      (definition.tags || []).includes(tag)
    )
  );
}


function createTreeEdges(
  nodes
) {

  const ids =
    new Set(
      nodes.map(node => node.id)
    );

  return nodes
    .filter(node =>
      node.parent &&
      ids.has(node.parent)
    )
    .map(node => ({
      type: 'treeParent',
      from: node.parent,
      to: node.id
    }));
}


function createWikiLinkEdges(
  nodes
) {

  const titleIndex =
    createTitleIndex(
      nodes
    );

  return nodes
    .flatMap(node => {

      const parsed =
        parseMarkdown(
          node.content
        );

      return extractWikiLinkTargets(
        parsed.body
      )
        .map(targetTitle => {

          const target =
            titleIndex.get(
              normalizeLookupText(
                targetTitle
              )
            );

          if (!target) return null;

          return {
            type: 'wikiLink',
            from: node.id,
            to: target.id,
            label: targetTitle
          };
        })
        .filter(Boolean);
    });
}


function createManualRelationshipEdges(
  nodes
) {

  const lookup =
    createRelationshipLookup(
      nodes
    );

  return nodes.flatMap(node =>
    node.relationships
      .map(relationship =>
        createManualRelationshipEdge(
          node,
          relationship,
          lookup
        )
      )
      .filter(Boolean)
  );
}


function createManualRelationshipEdge(
  node,
  relationship,
  lookup
) {

  const target =
    findRelationshipTarget(
      relationship,
      lookup
    );

  if (!target) return null;

  return {
    type:
      normalizeRelationshipType(
        relationship.type
      ),
    from:
      node.id,
    to:
      target.id,
    label:
      relationship.label ||
      relationship.title ||
      relationship.type ||
      'Связь',
    source:
      'manual'
  };
}


function extractWikiLinkTargets(
  html
) {

  const targets =
    [];

  for (
    const match
    of String(html || '').matchAll(WIKI_LINK_PATTERN)
  ) {

    targets.push(
      match[1].split('|')[0].trim()
    );
  }

  return targets;
}


function createTitleIndex(
  nodes
) {

  const index =
    new Map();

  nodes.forEach(node => {

    [
      node.title,
      ...node.aliases
    ].forEach(value => {

      const key =
        normalizeLookupText(
          value
        );

      if (key && !index.has(key)) {

        index.set(
          key,
          node
        );
      }
    });
  });

  return index;
}


function createNodeLookup(
  graph
) {

  return new Map(
    (graph?.nodes || []).map(node => [
      node.id,
      node
    ])
  );
}


function createEdgeCountMap(
  graph
) {

  const edgeCounts =
    new Map();

  (graph?.edges || []).forEach(edge => {

    edgeCounts.set(
      edge.from,
      (edgeCounts.get(edge.from) || 0) + 1
    );

    edgeCounts.set(
      edge.to,
      (edgeCounts.get(edge.to) || 0) + 1
    );
  });

  return edgeCounts;
}


function normalizeCanvasPositionOverrides(
  positions
) {

  const entries =
    positions instanceof Map
      ? [...positions.entries()]
      : Object.entries(
        positions || {}
      );

  const normalized =
    new Map();

  entries.forEach(([nodeId, value]) => {

    if (value?.pinned === false) return;

    const x =
      Number(value?.x);

    const y =
      Number(value?.y);

    if (
      !nodeId ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {

      return;
    }

    normalized.set(
      String(nodeId),
      {
        x:
          Math.round(x),
        y:
          Math.round(y),
        pinned:
          true
      }
    );
  });

  return normalized;
}


function edgePassesCanvasRelationshipFilter(
  edge,
  relationshipType
) {

  if (relationshipType === 'manual') {

    return edge?.source === 'manual';
  }

  return normalizeLookupText(
    edge?.type
  ) === relationshipType;
}


function getCanvasNodeCandidates(
  graph,
  edgeCounts,
  layout
) {

  const nodes =
    [...(graph?.nodes || [])];

  if (layout === 'tree') {

    return nodes;
  }

  return nodes.sort((left, right) =>
    (edgeCounts.get(right.id) || 0) -
      (edgeCounts.get(left.id) || 0) ||
    String(left.title || '').localeCompare(
      String(right.title || ''),
      'ru'
    )
  );
}


function hasActiveCanvasFilters(
  filters
) {

  return (
    filters.domain !== 'all' ||
    filters.relationshipType !== 'all' ||
    Boolean(filters.search) ||
    Boolean(filters.orphanOnly) ||
    Boolean(filters.focusNodeId)
  );
}


function getDefaultRootCanvasGraph(
  graph,
  depth
) {

  const nodes =
    graph?.nodes || [];

  const treeEdges =
    (graph?.edges || [])
      .filter(edge =>
        edge.type === 'treeParent'
      );

  if (nodes.length === 0) {

    return {
      nodes: [],
      edges: []
    };
  }

  const nodesById =
    new Map(
      nodes.map(node => [
        node.id,
        node
      ])
    );

  const childIds =
    new Set(
      treeEdges.map(edge =>
        edge.to
      )
    );

  const rootIds =
    nodes
      .filter(node =>
        !node.parent ||
        !nodesById.has(node.parent) ||
        !childIds.has(node.id)
      )
      .map(node =>
        node.id
      );

  const roots =
    rootIds.length > 0
      ? rootIds
      : [
        nodes[0].id
      ];

  const childrenByParent =
    new Map();

  treeEdges.forEach(edge => {

    if (!childrenByParent.has(edge.from)) {

      childrenByParent.set(
        edge.from,
        []
      );
    }

    childrenByParent
      .get(edge.from)
      .push(edge.to);
  });

  childrenByParent.forEach(children => {

    children.sort((leftId, rightId) =>
      String(nodesById.get(leftId)?.title || leftId).localeCompare(
        String(nodesById.get(rightId)?.title || rightId),
        'ru'
      )
    );
  });

  const visibleIds =
    new Set();

  const queue =
    roots.map(id => ({
      id,
      level: 0
    }));

  while (queue.length > 0) {

    const item =
      queue.shift();

    if (
      !item ||
      visibleIds.has(item.id) ||
      !nodesById.has(item.id)
    ) {

      continue;
    }

    visibleIds.add(item.id);

    if (item.level >= depth) continue;

    (childrenByParent.get(item.id) || [])
      .forEach(childId => {

        queue.push({
          id:
            childId,
          level:
            item.level + 1
        });
      });
  }

  const visibleNodes =
    nodes.filter(node =>
      visibleIds.has(node.id)
    );

  return {
    nodes:
      visibleNodes,
    edges:
      (graph?.edges || [])
        .filter(edge =>
          visibleIds.has(edge.from) &&
          visibleIds.has(edge.to)
        )
  };
}


function positionTreeCanvasNodes(
  nodes,
  edges,
  edgeCounts
) {

  if (nodes.length === 0) return [];

  const nodeIds =
    new Set(
      nodes.map(node =>
        node.id
      )
    );

  const nodesById =
    new Map(
      nodes.map(node => [
        node.id,
        node
      ])
    );

  const treeEdges =
    (edges || [])
      .filter(edge =>
        edge.type === 'treeParent' &&
        nodeIds.has(edge.from) &&
        nodeIds.has(edge.to)
      );

  const childIds =
    new Set(
      treeEdges.map(edge =>
        edge.to
      )
    );

  const roots =
    nodes
      .filter(node =>
        !childIds.has(node.id)
      )
      .sort((left, right) =>
        String(left.title || '').localeCompare(
          String(right.title || ''),
          'ru'
        )
      );

  const childrenByParent =
    new Map();

  treeEdges.forEach(edge => {

    if (!childrenByParent.has(edge.from)) {

      childrenByParent.set(
        edge.from,
        []
      );
    }

    childrenByParent
      .get(edge.from)
      .push(edge.to);
  });

  childrenByParent.forEach(children => {

    children.sort((leftId, rightId) =>
      String(nodesById.get(leftId)?.title || leftId).localeCompare(
        String(nodesById.get(rightId)?.title || rightId),
        'ru'
      )
    );
  });

  const levels =
    new Map();

  const visited =
    new Set();

  const queue =
    (roots.length > 0 ? roots : nodes)
      .map(node => ({
        id:
          node.id,
        level:
          0
      }));

  while (queue.length > 0) {

    const item =
      queue.shift();

    if (
      !item ||
      visited.has(item.id) ||
      !nodesById.has(item.id)
    ) {

      continue;
    }

    visited.add(item.id);

    if (!levels.has(item.level)) {

      levels.set(
        item.level,
        []
      );
    }

    levels
      .get(item.level)
      .push(item.id);

    (childrenByParent.get(item.id) || [])
      .forEach(childId => {

        queue.push({
          id:
            childId,
          level:
            item.level + 1
        });
      });
  }

  nodes.forEach(node => {

    if (visited.has(node.id)) return;

    if (!levels.has(0)) {

      levels.set(
        0,
        []
      );
    }

    levels
      .get(0)
      .push(node.id);
  });

  const maxColumns =
    Math.max(
      1,
      ...[...levels.values()].map(levelNodes =>
        levelNodes.length
      )
    );

  const positions =
    new Map();

  [...levels.entries()]
    .sort((left, right) =>
      left[0] - right[0]
    )
    .forEach(([level, levelNodeIds]) => {

      const rowWidth =
        Math.max(
          maxColumns,
          levelNodeIds.length
        ) * KNOWLEDGE_GRAPH_CANVAS_NODE_GAP_X;

      const startX =
        KNOWLEDGE_GRAPH_CANVAS_PADDING +
        Math.round((rowWidth - levelNodeIds.length * KNOWLEDGE_GRAPH_CANVAS_NODE_GAP_X) / 2);

      const y =
        KNOWLEDGE_GRAPH_CANVAS_PADDING +
        level * KNOWLEDGE_GRAPH_CANVAS_NODE_GAP_Y;

      levelNodeIds.forEach((nodeId, index) => {

        positions.set(
          nodeId,
          {
            x:
              startX + index * KNOWLEDGE_GRAPH_CANVAS_NODE_GAP_X,
            y
          }
        );
      });
    });

  return nodes.map(node => {

    const position =
      positions.get(node.id) || {
        x:
          KNOWLEDGE_GRAPH_CANVAS_PADDING,
        y:
          KNOWLEDGE_GRAPH_CANVAS_PADDING
      };

    return createPositionedCanvasNode(
      node,
      edgeCounts,
      position.x,
      position.y,
      roots.some(root =>
        root.id === node.id
      ),
      getCanvasDomainForNode(
        node
      )
    );
  });
}


function getCanvasWorldBounds(
  nodes,
  minWidth,
  minHeight
) {

  if (!nodes.length) {

    return {
      width:
        minWidth,
      height:
        minHeight
    };
  }

  const maxX =
    Math.max(
      ...nodes.map(node =>
        node.x
      )
    );

  const maxY =
    Math.max(
      ...nodes.map(node =>
        node.y
      )
    );

  return {
    width:
      Math.max(
        minWidth,
        Math.ceil(maxX + KNOWLEDGE_GRAPH_CANVAS_PADDING)
      ),
    height:
      Math.max(
        minHeight,
        Math.ceil(maxY + KNOWLEDGE_GRAPH_CANVAS_PADDING)
      )
  };
}


function positionHubCanvasNodes(
  nodes,
  edgeCounts,
  width,
  height
) {

  if (nodes.length === 0) return [];

  const centerX =
    Math.round(width / 2);

  const centerY =
    Math.round(height / 2);

  if (nodes.length === 1) {

    return [
      createPositionedCanvasNode(
        nodes[0],
        edgeCounts,
        centerX,
        centerY,
        true,
        getCanvasDomainForNode(
          nodes[0]
        )
      )
    ];
  }

  const hub =
    nodes[0];

  const ringNodes =
    nodes.slice(1);

  const radiusX =
    Math.max(
      240,
      Math.round(width * 0.36)
    );

  const radiusY =
    Math.max(
      150,
      Math.round(height * 0.32)
    );

  return [
    createPositionedCanvasNode(
      hub,
      edgeCounts,
      centerX,
      centerY,
      true,
      getCanvasDomainForNode(
        hub
      )
    ),
    ...ringNodes.map((node, index) => {

      const angle =
        -Math.PI / 2 +
        (Math.PI * 2 * index) /
          Math.max(
            1,
            ringNodes.length
          );

      return createPositionedCanvasNode(
        node,
        edgeCounts,
        Math.round(centerX + Math.cos(angle) * radiusX),
        Math.round(centerY + Math.sin(angle) * radiusY),
        false,
        getCanvasDomainForNode(
          node
        )
      );
    })
  ];
}


function positionDomainCanvasNodes(
  nodes,
  edgeCounts,
  width,
  height
) {

  if (nodes.length === 0) return [];

  const groups =
    new Map();

  nodes.forEach(node => {

    const domain =
      getCanvasDomainForNode(
        node
      );

    if (!groups.has(domain.key)) {

      groups.set(
        domain.key,
        {
          domain,
          nodes: []
        }
      );
    }

    groups.get(domain.key).nodes.push(
      node
    );
  });

  return KNOWLEDGE_GRAPH_CANVAS_LAYOUTS
    .map(domain =>
      groups.get(domain.key)
    )
    .filter(Boolean)
    .flatMap(group =>
      positionCanvasDomainGroup(
        group.nodes,
        group.domain,
        edgeCounts,
        width,
        height
      )
    );
}


function positionCanvasDomainGroup(
  nodes,
  domain,
  edgeCounts,
  width,
  height
) {

  const centerX =
    Math.round(width * domain.x);

  const centerY =
    Math.round(height * domain.y);

  if (nodes.length === 1) {

    return [
      createPositionedCanvasNode(
        nodes[0],
        edgeCounts,
        centerX,
        centerY,
        false,
        domain
      )
    ];
  }

  const radiusX =
    Math.max(
      92,
      Math.min(
        156,
        62 + nodes.length * 14
      )
    );

  const radiusY =
    Math.max(
      66,
      Math.min(
        118,
        46 + nodes.length * 11
      )
    );

  return nodes.map((node, index) => {

    if (index === 0) {

      return createPositionedCanvasNode(
        node,
        edgeCounts,
        centerX,
        centerY,
        true,
        domain
      );
    }

    const angle =
      -Math.PI / 2 +
      (Math.PI * 2 * (index - 1)) /
        Math.max(
          1,
          nodes.length - 1
        );

    const ring =
      1 + Math.floor((index - 1) / 7) * 0.34;

    return createPositionedCanvasNode(
      node,
      edgeCounts,
      Math.round(centerX + Math.cos(angle) * radiusX * ring),
      Math.round(centerY + Math.sin(angle) * radiusY * ring),
      false,
      domain
    );
  });
}


function createPositionedCanvasNode(
  node,
  edgeCounts,
  x,
  y,
  isHub,
  domain = getCanvasDomainForNode(node)
) {

  const edgeCount =
    edgeCounts.get(node.id) || 0;

  return {
    id:
      node.id,
    title:
      node.title,
    type:
      node.type || node.template || 'note',
    domain:
      domain.key,
    domainLabel:
      domain.label,
    edgeCount,
    x,
    y,
    isHub,
    weight:
      Math.min(
        4,
        Math.max(
          1,
          Math.ceil(edgeCount / 2)
        )
      )
  };
}


function getCanvasDomainSummary(
  nodes,
  width,
  height
) {

  const counts =
    nodes.reduce(
      (map, node) => {

        map.set(
          node.domain,
          (map.get(node.domain) || 0) + 1
        );

        return map;
      },
      new Map()
    );

  return KNOWLEDGE_GRAPH_CANVAS_LAYOUTS
    .filter(domain =>
      counts.has(domain.key)
    )
    .map(domain => ({
      key:
        domain.key,
      label:
        domain.label,
      x:
        Math.round(width * domain.x),
      y:
        Math.round(height * domain.y),
      nodeCount:
        counts.get(domain.key) || 0
    }));
}


function getCanvasDomainForNode(
  node
) {

  return KNOWLEDGE_GRAPH_CANVAS_LAYOUTS.find(domain =>
    nodeBelongsToCanvasDomain(
      node,
      domain
    )
  ) ||
    KNOWLEDGE_GRAPH_CANVAS_LAYOUTS.find(domain =>
      domain.fallback
    );
}


function normalizeCanvasFilters(
  filters
) {

  const domain =
    String(filters.domain || 'all')
      .trim();

  const knownDomains =
    new Set(
      getKnowledgeGraphCanvasDomainDefinitions()
        .map(item => item.key)
    );

  const relationshipType =
    normalizeLookupText(
      filters.relationshipType || 'all'
    );

  return {
    domain:
      knownDomains.has(domain)
        ? domain
        : 'all',
    relationshipType:
      relationshipType && relationshipType !== 'all'
        ? relationshipType
        : 'all',
    search:
      normalizeLookupText(
        filters.search
      ),
    focusNodeId:
      String(filters.focusNodeId || '')
        .trim(),
    orphanOnly:
      Boolean(filters.orphanOnly),
    viewPreset:
      normalizeLookupText(
        filters.viewPreset || 'standard'
      ) === 'all'
        ? 'all'
        : 'standard'
  };
}


function getFilteredCanvasGraph(
  graph,
  filters
) {

  const nodes =
    (graph?.nodes || [])
      .filter(node =>
        node.type !== 'knowledgeGraph' &&
        node.template !== 'knowledgeGraph'
      );

  const nodesById =
    new Map(
      nodes.map(node => [
        node.id,
        node
      ])
    );

  const sourceEdges =
    (graph?.edges || [])
      .filter(edge =>
        nodesById.has(edge.from) &&
        nodesById.has(edge.to)
      );

  const relationshipEdges =
    filters.relationshipType === 'all'
      ? sourceEdges
      : sourceEdges.filter(edge =>
        edgePassesCanvasRelationshipFilter(
          edge,
          filters.relationshipType
        )
      );

  if (filters.orphanOnly) {

    const orphanIds =
      new Set(
        getOrphanGraphPages({
          nodes,
          edges:
            sourceEdges
        })
          .map(node => node.id)
      );

    return {
      nodes:
        nodes.filter(node =>
          orphanIds.has(node.id) &&
          nodePassesCanvasFilters(node, filters)
        ),
      edges: []
    };
  }

  const hasNodeFilters =
    filters.domain !== 'all' ||
    Boolean(filters.search);

  let candidateIds =
    new Set(
      nodes
        .filter(node =>
          nodePassesCanvasFilters(
            node,
            filters
          )
        )
        .map(node => node.id)
    );

  if (
    !hasNodeFilters &&
    filters.relationshipType !== 'all'
  ) {

    candidateIds =
      getEdgeEndpointIds(
        relationshipEdges
      );
  } else if (hasNodeFilters) {

    const seedIds =
      new Set(
        candidateIds
      );

    relationshipEdges.forEach(edge => {

      if (
        seedIds.has(edge.from) ||
        seedIds.has(edge.to)
      ) {

        candidateIds.add(edge.from);
        candidateIds.add(edge.to);
      }
    });
  }

  if (filters.focusNodeId) {

    const focusIds =
      getFocusNeighborhoodIds(
        filters.focusNodeId,
        relationshipEdges,
        nodesById
      );

    candidateIds =
      new Set(
        [...candidateIds].filter(id =>
          focusIds.has(id)
        )
      );
  }

  const visibleNodes =
    nodes.filter(node =>
      candidateIds.has(node.id)
    );

  const visibleIds =
    new Set(
      visibleNodes.map(node => node.id)
    );

  return {
    nodes:
      visibleNodes,
    edges:
      relationshipEdges.filter(edge =>
        visibleIds.has(edge.from) &&
        visibleIds.has(edge.to)
      )
  };
}


function nodePassesCanvasFilters(
  node,
  filters
) {

  if (
    filters.domain !== 'all' &&
    getCanvasDomainForNode(node).key !== filters.domain
  ) {

    return false;
  }

  if (
    filters.search &&
    !nodeMatchesCanvasSearch(
      node,
      filters.search
    )
  ) {

    return false;
  }

  return true;
}


function nodeMatchesCanvasSearch(
  node,
  search
) {

  const values =
    [
      node.id,
      node.title,
      node.type,
      node.template,
      ...(node.tags || []),
      ...(node.aliases || [])
    ];

  return values.some(value =>
    normalizeLookupText(value)
      .includes(search)
  );
}


function getEdgeEndpointIds(
  edges
) {

  const ids =
    new Set();

  edges.forEach(edge => {

    ids.add(edge.from);
    ids.add(edge.to);
  });

  return ids;
}


function getFocusNeighborhoodIds(
  focusNodeId,
  edges,
  nodesById
) {

  const ids =
    new Set();

  if (nodesById.has(focusNodeId)) {

    ids.add(focusNodeId);
  }

  edges.forEach(edge => {

    if (edge.from === focusNodeId) {

      ids.add(edge.to);
      ids.add(edge.from);
    }

    if (edge.to === focusNodeId) {

      ids.add(edge.from);
      ids.add(edge.to);
    }
  });

  return ids;
}


function getCanvasFilterSummary(
  graph,
  filters,
  candidateCount,
  options = {}
) {

  const parts =
    [];

  if (filters.orphanOnly) {

    parts.push('одинокие страницы');
  }

  if (filters.domain !== 'all') {

    parts.push(
      getCanvasDomainLabel(filters.domain)
    );
  }

  if (filters.relationshipType !== 'all') {

    parts.push(
      `связь: ${filters.relationshipType}`
    );
  }

  if (filters.search) {

    parts.push(
      `поиск: ${filters.search}`
    );
  }

  if (filters.focusNodeId) {

    const focusTitle =
      (graph?.nodes || [])
        .find(node =>
          node.id === filters.focusNodeId
        )
        ?.title ||
      filters.focusNodeId;

    parts.push(
      `соседи: ${focusTitle}`
    );
  }

  if (options.isDefaultRootView) {

    return {
      text:
        `Стандартный вид: от корня на ${options.defaultDepth || KNOWLEDGE_GRAPH_CANVAS_DEFAULT_DEPTH} уровня`,
      nodeCount:
        candidateCount
    };
  }

  return {
    text:
      parts.length > 0
        ? `Показано: ${parts.join(' · ')}`
        : filters.viewPreset === 'all'
          ? 'Показано: все связи'
          : 'Показано: самые связанные страницы мира',
    nodeCount:
      candidateCount
  };
}


function getCanvasDomainLabel(
  domainKey
) {

  return getKnowledgeGraphCanvasDomainDefinitions()
    .find(domain =>
      domain.key === domainKey
    )
    ?.label ||
    domainKey;
}


function nodeBelongsToCanvasDomain(
  node,
  domain
) {

  if (!node) return false;

  if (domain.fallback) return false;

  const type =
    normalizeLookupText(
      node.type
    );

  const template =
    normalizeLookupText(
      node.template
    );

  const tags =
    (node.tags || [])
      .map(tag =>
        normalizeLookupText(
          tag
        )
      );

  return (
    (domain.types || []).includes(type) ||
    (domain.templates || []).includes(template) ||
    tags.some(tag =>
      (domain.tags || []).includes(tag)
    )
  );
}


function createRelationshipLookup(
  nodes
) {

  return {
    byId:
      new Map(
        nodes.map(node => [
          node.id,
          node
        ])
      ),
    byTitle:
      createTitleIndex(
        nodes
      )
  };
}


function findRelationshipTarget(
  relationship,
  lookup
) {

  const targetId =
    relationship.targetId ||
    relationship.pageId ||
    relationship.id;

  if (
    targetId &&
    lookup.byId.has(targetId)
  ) {

    return lookup.byId.get(
      targetId
    );
  }

  const targetTitle =
    relationship.targetTitle ||
    relationship.target ||
    relationship.title;

  if (!targetTitle) return null;

  return lookup.byTitle.get(
    normalizeLookupText(
      targetTitle
    )
  );
}


function normalizeRelationshipType(
  value
) {

  const normalized =
    String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  return normalized || 'manualRelation';
}


function normalizeLookupText(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
