import {
  parseMarkdown
} from '../core/markdown.js';


const WIKI_LINK_PATTERN =
  /\[\[([^\]]+)\]\]/g;

const DOMAIN_DEFINITIONS = {
  character: {
    label: 'Персонажи',
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
        definition.label
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
        ).length
    }));
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
