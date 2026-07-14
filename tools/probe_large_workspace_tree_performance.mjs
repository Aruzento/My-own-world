import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';


const args =
  parseArgs(
    process.argv.slice(2)
  );

const workspace =
  args.workspace || args._[0];

const mutate =
  Boolean(args.mutate);

if (!workspace) {

  console.error(
    'Usage: node tools/probe_large_workspace_tree_performance.mjs --workspace "X:\\path\\to\\workspace" [--mutate]'
  );

  process.exit(1);
}

const pagesDir =
  path.join(
    workspace,
    'pages'
  );

const result =
  await runProbe({
    pagesDir,
    mutate
  });

console.log(
  JSON.stringify(
    result,
    null,
    2
  )
);


async function runProbe({
  pagesDir,
  mutate
}) {

  const files =
    await measure(
      'pages.readDirectory',
      () => fs.readdir(
        pagesDir,
        {
          withFileTypes: true
        }
      )
    );

  const mdFiles =
    files.value.filter(entry =>
      entry.isFile() &&
      entry.name.toLowerCase().endsWith('.md')
    );

  const pages =
    await measure(
      'pages.readAndParse',
      async () => {

        const parsed =
          [];

        for (const entry of mdFiles) {

          const filePath =
            path.join(
              pagesDir,
              entry.name
            );

          parsed.push(
            parsePage(
              entry.name,
              await fs.readFile(
                filePath,
                'utf8'
              )
            )
          );
        }

        return parsed;
      }
    );

  const parentIndex =
    await measure(
      'tree.buildParentIndex',
      () => buildParentIndex(
        pages.value
      )
    );

  const timings =
    [
      files.timing,
      pages.timing,
      parentIndex.timing
    ];

  let mutation =
    null;

  if (mutate) {

    mutation =
      await runMutationProbe({
        pagesDir
      });

    timings.push(
      ...mutation.timings
    );
  }

  return {
    workspace:
      path.dirname(pagesDir),
    pageCount:
      mdFiles.length,
    rootCount:
      parentIndex.value.get(null)?.length || 0,
    timings,
    mutation:
      mutation?.summary || null
  };
}


async function runMutationProbe({
  pagesDir
}) {

  const stamp =
    Date.now();

  const parentId =
    `perf-probe-parent-${stamp}`;

  const childId =
    `perf-probe-child-${stamp}`;

  const parentFile =
    `${parentId}.md`;

  const childFile =
    `${childId}.md`;

  const parentPath =
    path.join(
      pagesDir,
      parentFile
    );

  const childPath =
    path.join(
      pagesDir,
      childFile
    );

  const timings =
    [];

  try {

    timings.push(
      (
        await measure(
          'probe.createTempPages',
          async () => {

            await fs.writeFile(
              parentPath,
              createProbePage({
                id: parentId,
                title: 'Perf Probe Parent',
                parent: null,
                order: 999999
              }),
              'utf8'
            );

            await fs.writeFile(
              childPath,
              createProbePage({
                id: childId,
                title: 'Perf Probe Child',
                parent: null,
                order: 1000000
              }),
              'utf8'
            );
          }
        )
      ).timing
    );

    timings.push(
      (
        await measure(
          'probe.moveTempPage',
          () => fs.writeFile(
            childPath,
            createProbePage({
              id: childId,
              title: 'Perf Probe Child',
              parent: parentId,
              order: 0
            }),
            'utf8'
          )
        )
      ).timing
    );

  } finally {

    timings.push(
      (
        await measure(
          'probe.deleteTempPages',
          async () => {

            await removeIfExists(
              childPath
            );

            await removeIfExists(
              parentPath
            );
          }
        )
      ).timing
    );
  }

  return {
    timings,
    summary:
      'Temporary probe pages were created, moved by parent/order write, and removed.'
  };
}


async function measure(
  name,
  callback
) {

  const started =
    performance.now();

  const value =
    await callback();

  const durationMs =
    Math.round(
      performance.now() - started
    );

  return {
    value,
    timing:
      {
        name,
        durationMs
      }
  };
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
    id:
      fields.id || fileName.replace(/\.md$/i, ''),
    title:
      fields.title || '',
    parent:
      fields.parent || null,
    order:
      Number(fields.order || 0)
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


function buildParentIndex(
  pages
) {

  const index =
    new Map();

  for (const page of pages) {

    const parent =
      page.parent || null;

    if (!index.has(parent)) {

      index.set(
        parent,
        []
      );
    }

    index.get(parent).push(
      page.id
    );
  }

  return index;
}


function createProbePage({
  id,
  title,
  parent,
  order
}) {

  return `---\nid: ${id}\ntitle: ${title}\ntemplate: card\ntype: note\nparent: ${parent || 'null'}\norder: ${order}\n---\n\n<section data-card-shell="v1"><h1>${title}</h1></section>\n`;
}


async function removeIfExists(
  filePath
) {

  try {

    await fs.unlink(
      filePath
    );

  } catch (error) {

    if (error.code !== 'ENOENT') {

      throw error;
    }
  }
}


function parseArgs(
  values
) {

  const parsed =
    {
      _: []
    };

  for (
    let index = 0;
    index < values.length;
    index += 1
  ) {

    const value =
      values[index];

    if (!value.startsWith('--')) {

      parsed._.push(
        value
      );

      continue;
    }

    const key =
      value.slice(2);

    const next =
      values[index + 1];

    if (
      !next ||
      next.startsWith('--')
    ) {

      parsed[key] =
        true;

      continue;
    }

    parsed[key] =
      next;

    index += 1;
  }

  return parsed;
}
