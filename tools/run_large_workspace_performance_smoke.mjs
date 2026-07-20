import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  buildKnowledgeGraph,
  buildKnowledgeGraphCanvasModel
} from '../js/wiki/knowledgeGraph.js';


const PAGE_COUNT =
  900;

const MAP_COUNT =
  30;

const ASSET_COUNT =
  160;

const budgets =
  {
    'fixture.create': 4000,
    'pages.readDirectory': 300,
    'pages.readAndParse': 2500,
    'index.build': 300,
    'search.titleAndBody': 300,
    'wiki.lookup': 100,
    'tree.buildVisibleRows': 500,
    'tree.virtualRange': 100,
    'knowledgeGraph.model': 1200,
    'knowledgeGraph.canvasSlice': 500,
    'assets.scanReferences': 800,
    'assets.checkExisting': 1200,
    'map.openParse': 300,
    'mutation.createMoveDelete': 800,
    total: 8500
  };


const startedAt =
  performance.now();

const workspace =
  await fs.mkdtemp(
    path.join(
      os.tmpdir(),
      'my-own-world-large-workspace-'
    )
  );

try {

  const result =
    await runSmoke(
      workspace
    );

  const failed =
    result.timings.filter(timing =>
      timing.durationMs > budgets[timing.name]
    );

  if (result.totalDurationMs > budgets.total) {

    failed.push({
      name:
        'total',
      durationMs:
        result.totalDurationMs,
      budgetMs:
        budgets.total
    });
  }

  console.log(
    JSON.stringify(
      {
        ...result,
        budgets,
        status:
          failed.length
            ? 'failed'
            : 'passed',
        failed
      },
      null,
      2
    )
  );

  if (failed.length) {

    process.exitCode =
      1;
  }

} finally {

  await fs.rm(
    workspace,
    {
      force: true,
      recursive: true
    }
  );
}


async function runSmoke(
  root
) {

  const pagesDir =
    path.join(
      root,
      'pages'
    );

  const assetsDir =
    path.join(
      root,
      'assets'
    );

  const timings =
    [];

  await timed(
    timings,
    'fixture.create',
    () => createFixture({
      pagesDir,
      assetsDir
    })
  );

  const entries =
    await timed(
      timings,
      'pages.readDirectory',
      () => fs.readdir(
        pagesDir,
        {
          withFileTypes: true
        }
      )
    );

  const pages =
    await timed(
      timings,
      'pages.readAndParse',
      async () => {

        const parsed =
          [];

        for (const entry of entries) {

          if (
            !entry.isFile() ||
            !entry.name.endsWith('.md')
          ) continue;

          const content =
            await fs.readFile(
              path.join(
                pagesDir,
                entry.name
              ),
              'utf8'
            );

          parsed.push(
            parsePage(
              entry.name,
              content
            )
          );
        }

        return parsed;
      }
    );

  const index =
    await timed(
      timings,
      'index.build',
      () => buildIndex(
        pages
      )
    );

  await timed(
    timings,
    'search.titleAndBody',
    () => searchPages(
      pages,
      'ancient'
    )
  );

  await timed(
    timings,
    'wiki.lookup',
    () => lookupPage(
      index,
      'map alias 10'
    )
  );

  const visibleRows =
    await timed(
      timings,
      'tree.buildVisibleRows',
      () => buildVisibleRows(
        pages
      )
    );

  await timed(
    timings,
    'tree.virtualRange',
    () => getVirtualRange({
      rows:
        visibleRows,
      scrollTop:
        12000,
      viewportHeight:
        700,
      rowHeight:
        32,
      overscan:
        8
    })
  );

  const knowledgeGraph =
    await timed(
      timings,
      'knowledgeGraph.model',
      () => buildKnowledgeGraph(
        pages
      )
    );

  const knowledgeGraphCanvas =
    await timed(
      timings,
      'knowledgeGraph.canvasSlice',
      () => buildKnowledgeGraphCanvasModel(
        knowledgeGraph,
        {
          filters: {
            viewPreset:
              'all'
          },
          maxNodes:
            96
        }
      )
    );

  const assetReferences =
    await timed(
      timings,
      'assets.scanReferences',
      () => scanAssetReferences(
        pages
      )
    );

  await timed(
    timings,
    'assets.checkExisting',
    () => checkAssetsExist({
      assetsDir,
      assetReferences
    })
  );

  await timed(
    timings,
    'map.openParse',
    () => parseFirstMap(
      pages
    )
  );

  await timed(
    timings,
    'mutation.createMoveDelete',
    () => createMoveDeleteProbePage(
      pagesDir
    )
  );

  return {
    workspace:
      root,
    pageCount:
      pages.length,
    mapCount:
      pages.filter(page => page.template === 'campaignMap').length,
    assetReferenceCount:
      assetReferences.length,
    visibleRowCount:
      visibleRows.length,
    knowledgeGraphNodeCount:
      knowledgeGraph.nodes.length,
    knowledgeGraphEdgeCount:
      knowledgeGraph.edges.length,
    knowledgeGraphVisibleNodeCount:
      knowledgeGraphCanvas.nodes.length,
    knowledgeGraphVisibleEdgeCount:
      knowledgeGraphCanvas.edges.length,
    knowledgeGraphHiddenNodeCount:
      knowledgeGraphCanvas.hiddenNodeCount,
    totalDurationMs:
      Math.round(
        performance.now() - startedAt
      ),
    timings:
      timings.map(timing => ({
        ...timing,
        budgetMs:
          budgets[timing.name]
      }))
  };
}


async function createFixture({
  pagesDir,
  assetsDir
}) {

  await fs.mkdir(
    pagesDir,
    {
      recursive: true
    }
  );

  await fs.mkdir(
    assetsDir,
    {
      recursive: true
    }
  );

  for (
    let index = 0;
    index < ASSET_COUNT;
    index += 1
  ) {

    await fs.writeFile(
      path.join(
        assetsDir,
        `asset-${index}.txt`
      ),
      `asset ${index}\n`
    );
  }

  const writes =
    [];

  for (
    let index = 0;
    index < PAGE_COUNT;
    index += 1
  ) {

    const isMap =
      index < MAP_COUNT;

    const id =
      `page-${index}`;

    const parent =
      index < 6
        ? null
        : `page-${Math.floor((index - 1) / 6)}`;

    const fileName =
      `${id}.md`;

    writes.push(
      fs.writeFile(
        path.join(
          pagesDir,
          fileName
        ),
        createPageContent({
          id,
          index,
          parent,
          isMap
        }),
        'utf8'
      )
    );
  }

  await Promise.all(
    writes
  );
}


function createPageContent({
  id,
  index,
  parent,
  isMap
}) {

  const assetPath =
    `asset-${index % ASSET_COUNT}.txt`;

  const mapJson =
    isMap
      ? `<script type="application/json" data-campaign-map-model>{
        "version": 1,
        "background": { "assetPath": "${assetPath}" },
        "tokens": ${JSON.stringify(createTokens(index))},
        "shapes": ${JSON.stringify(createShapes(index))},
        "fog": { "enabled": true, "dirtyRegions": [] }
      }</script>`
      : '';

  return `---
id: ${id}
title: ${isMap ? `Ancient Map ${index}` : `Ancient Page ${index}`}
template: ${isMap ? 'campaignMap' : 'card'}
type: ${isMap ? 'campaignMap' : 'note'}
parent: ${parent || 'null'}
order: ${index}
tags: [large, smoke, ${isMap ? 'map' : 'page'}]
aliases: [map alias ${index}, smoke alias ${index}]
---

<section data-card-shell="v1">
  <h1>${isMap ? `Ancient Map ${index}` : `Ancient Page ${index}`}</h1>
  <p>Large workspace smoke body ${index}. Ancient searchable text.</p>
  <div data-asset="${assetPath}">Asset ref</div>
  ${mapJson}
</section>
`;
}


function createTokens(
  seed
) {

  return Array.from(
    {
      length: 40
    },
    (_, index) => ({
      id:
        `token-${seed}-${index}`,
      pageId:
        `page-${(seed + index) % PAGE_COUNT}`,
      x:
        index * 12,
      y:
        index * 9,
      layerId:
        'tokens'
    })
  );
}


function createShapes(
  seed
) {

  return Array.from(
    {
      length: 20
    },
    (_, index) => ({
      id:
        `shape-${seed}-${index}`,
      type:
        'rect',
      x:
        index * 18,
      y:
        index * 11,
      width:
        64,
      height:
        64,
      layerId:
        'drawings'
    })
  );
}


async function timed(
  timings,
  name,
  callback
) {

  const started =
    performance.now();

  const value =
    await callback();

  timings.push({
    name,
    durationMs:
      Math.round(
        performance.now() - started
      )
  });

  return value;
}


function parsePage(
  fileName,
  content
) {

  const frontmatter =
    content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  const fields =
    {};

  if (frontmatter) {

    for (const line of frontmatter[1].split(/\r?\n/)) {

      const match =
        line.match(/^([^:]+):\s*(.*)$/);

      if (!match) continue;

      fields[match[1].trim()] =
        normalizeFrontmatterValue(
          match[2]
        );
    }
  }

  return {
    fileName,
    content,
    id:
      fields.id || fileName.replace(/\.md$/i, ''),
    title:
      fields.title || '',
    parent:
      fields.parent || null,
    order:
      Number(fields.order || 0),
    template:
      fields.template || '',
    type:
      fields.type || '',
    aliases:
      parseList(
        fields.aliases
      ),
    tags:
      parseList(
        fields.tags
      )
  };
}


function normalizeFrontmatterValue(
  value
) {

  const trimmed =
    String(value || '').trim();

  if (
    trimmed === 'null' ||
    trimmed === ''
  ) {

    return null;
  }

  return trimmed.replace(/^["']|["']$/g, '');
}


function parseList(
  value
) {

  const raw =
    String(value || '').trim();

  if (!raw.startsWith('[')) return [];

  return raw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}


function buildIndex(
  pages
) {

  const byId =
    new Map();

  const byTitle =
    new Map();

  const byAlias =
    new Map();

  const byParent =
    new Map();

  for (const page of pages) {

    byId.set(
      page.id,
      page
    );

    byTitle.set(
      normalize(page.title),
      page
    );

    for (const alias of page.aliases) {

      byAlias.set(
        normalize(alias),
        page
      );
    }

    const parent =
      page.parent || null;

    if (!byParent.has(parent)) {

      byParent.set(
        parent,
        []
      );
    }

    byParent.get(parent).push(
      page
    );
  }

  return {
    byId,
    byTitle,
    byAlias,
    byParent
  };
}


function searchPages(
  pages,
  query
) {

  const normalizedQuery =
    normalize(
      query
    );

  return pages.filter(page =>
    normalize(page.title).includes(normalizedQuery) ||
    normalize(page.content).includes(normalizedQuery)
  );
}


function lookupPage(
  index,
  value
) {

  const key =
    normalize(
      value
    );

  return index.byTitle.get(key) ||
    index.byAlias.get(key) ||
    null;
}


function buildVisibleRows(
  pages
) {

  const index =
    buildIndex(
      pages
    );

  const rows =
    [];

  const visit =
    (parent, level) => {

      const children =
        [
          ...(index.byParent.get(parent) || [])
        ].sort((a, b) =>
          a.order - b.order
        );

      for (const child of children) {

        rows.push({
          id:
            child.id,
          level
        });

        visit(
          child.id,
          level + 1
        );
      }
    };

  visit(
    null,
    0
  );

  return rows;
}


function getVirtualRange({
  rows,
  scrollTop,
  viewportHeight,
  rowHeight,
  overscan
}) {

  const start =
    Math.max(
      0,
      Math.floor(scrollTop / rowHeight) - overscan
    );

  const end =
    Math.min(
      rows.length,
      Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
    );

  return rows.slice(
    start,
    end
  );
}


function scanAssetReferences(
  pages
) {

  const references =
    [];

  const assetPattern =
    /data-asset="([^"]+)"/g;

  const mapBackgroundPattern =
    /"assetPath"\s*:\s*"([^"]+)"/g;

  for (const page of pages) {

    for (const pattern of [
      assetPattern,
      mapBackgroundPattern
    ]) {

      pattern.lastIndex =
        0;

      let match;

      while (
        (match = pattern.exec(page.content))
      ) {

        references.push({
          pageId:
            page.id,
          path:
            match[1]
        });
      }
    }
  }

  return references;
}


async function checkAssetsExist({
  assetsDir,
  assetReferences
}) {

  let existing =
    0;

  for (const reference of assetReferences) {

    try {

      await fs.stat(
        path.join(
          assetsDir,
          reference.path
        )
      );

      existing += 1;

    } catch {

      // Missing assets are counted by the caller's diagnostics in the app.
    }
  }

  return existing;
}


function parseFirstMap(
  pages
) {

  const page =
    pages.find(candidate =>
      candidate.template === 'campaignMap'
    );

  if (!page) return null;

  const match =
    page.content.match(
      /<script type="application\/json" data-campaign-map-model>([\s\S]*?)<\/script>/
    );

  return match
    ? JSON.parse(
      match[1]
    )
    : null;
}


async function createMoveDeleteProbePage(
  pagesDir
) {

  const id =
    `mutation-${Date.now()}`;

  const filePath =
    path.join(
      pagesDir,
      `${id}.md`
    );

  await fs.writeFile(
    filePath,
    createPageContent({
      id,
      index:
        PAGE_COUNT + 1,
      parent:
        null,
      isMap:
        false
    }),
    'utf8'
  );

  await fs.writeFile(
    filePath,
    createPageContent({
      id,
      index:
        PAGE_COUNT + 1,
      parent:
        'page-1',
      isMap:
        false
    }),
    'utf8'
  );

  await fs.unlink(
    filePath
  );
}


function normalize(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
