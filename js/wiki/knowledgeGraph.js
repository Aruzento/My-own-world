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
