import {
  parseMarkdown
} from '../core/markdown.js';


const WIKI_LINK_PATTERN =
  /\[\[([^\]]+)\]\]/g;


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
      ...createWikiLinkEdges(nodes)
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
      content: page.content || ''
    }));
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


function normalizeLookupText(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
