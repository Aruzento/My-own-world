import {
  readdir,
  readFile
} from 'node:fs/promises';

import path from 'node:path';


const DOCS_ROOT =
  path.resolve(
    'docs'
  );

const REQUIRED_FIELDS =
  [
    'summary',
    'read_when',
    'owner_zone'
  ];

const OWNER_ZONES =
  new Set([
    'product',
    'delivery',
    'architecture',
    'testing',
    'user-release',
    'archive'
  ]);

const ZONE_BY_PATH =
  [
    {
      prefix: path.join('docs', '00-product'),
      ownerZone: 'product'
    },
    {
      prefix: path.join('docs', '01-delivery'),
      ownerZone: 'delivery'
    },
    {
      prefix: path.join('docs', '02-architecture'),
      ownerZone: 'architecture'
    },
    {
      prefix: path.join('docs', '03-testing'),
      ownerZone: 'testing'
    },
    {
      prefix: path.join('docs', '04-user-release'),
      ownerZone: 'user-release'
    },
    {
      prefix: path.join('docs', 'archive'),
      ownerZone: 'archive'
    }
  ];

const SKIPPED_PATH_PREFIXES =
  [
    normalizePath(
      path.join('docs', 'sample-workspace', 'pages')
    )
  ];


const markdownFiles =
  await listMarkdownFiles(
    DOCS_ROOT
  );

const report = {
  total:
    markdownFiles.length,
  skipped: [],
  missingMetadata: [],
  invalidMetadata: [],
  wrongZone: []
};

for (const file of markdownFiles) {

  const content =
    await readFile(
      file,
      'utf8'
    );

  const metadata =
    parseMetadata(
      content
    );

  const relative =
    normalizePath(
      path.relative(
        process.cwd(),
        file
      )
    );

  if (shouldSkipDocument(relative)) {

    report.skipped.push(
      relative
    );

    continue;
  }

  if (!metadata) {

    report.missingMetadata.push(
      relative
    );

    continue;
  }

  const missingFields =
    REQUIRED_FIELDS.filter(field => !metadata[field]);

  if (
    missingFields.length ||
    !Array.isArray(metadata.read_when) ||
    !OWNER_ZONES.has(metadata.owner_zone)
  ) {

    report.invalidMetadata.push({
      file:
        relative,
      missingFields,
      readWhenIsArray:
        Array.isArray(metadata.read_when),
      ownerZone:
        metadata.owner_zone || ''
    });
  }

  const expectedZone =
    getExpectedZone(
      relative
    );

  if (
    expectedZone &&
    metadata.owner_zone &&
    metadata.owner_zone !== expectedZone
  ) {

    report.wrongZone.push({
      file:
        relative,
      ownerZone:
        metadata.owner_zone,
      expectedZone
    });
  }
}

printReport(
  report
);


async function listMarkdownFiles(
  root
) {

  const entries =
    await readdir(
      root,
      {
        withFileTypes: true
      }
    );

  const files =
    [];

  for (const entry of entries) {

    const nextPath =
      path.join(
        root,
        entry.name
      );

    if (entry.isDirectory()) {

      files.push(
        ...await listMarkdownFiles(
          nextPath
        )
      );

      continue;
    }

    if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith('.md')
    ) {

      files.push(
        nextPath
      );
    }
  }

  return files.sort();
}


function parseMetadata(
  content
) {

  if (
    !content.startsWith('---\n') &&
    !content.startsWith('---\r\n')
  ) return null;

  const end =
    content.indexOf(
      '\n---',
      4
    );

  if (end === -1) return null;

  const bodyStart =
    content.startsWith('---\r\n')
      ? 5
      : 4;

  const lines =
    content
      .slice(
        bodyStart,
        end
      )
      .split(/\r?\n/);

  const metadata =
    {};

  let activeListKey =
    null;

  for (const line of lines) {

    const listMatch =
      line.match(/^\s*-\s+"?(.+?)"?\s*$/);

    if (
      activeListKey &&
      listMatch
    ) {

      metadata[activeListKey].push(
        listMatch[1]
      );

      continue;
    }

    const fieldMatch =
      line.match(/^([a-z_]+):\s*(.*)$/);

    if (!fieldMatch) continue;

    const [, key, rawValue] =
      fieldMatch;

    activeListKey =
      null;

    if (rawValue.trim() === '') {

      metadata[key] =
        [];

      activeListKey =
        key;

      continue;
    }

    metadata[key] =
      rawValue
        .trim()
        .replace(/^"|"$/g, '');
  }

  return metadata;
}


function getExpectedZone(
  relativePath
) {

  const normalized =
    normalizePath(
      relativePath
    );

  const match =
    ZONE_BY_PATH.find(zone =>
      normalized === normalizePath(zone.prefix) ||
      normalized.startsWith(
        `${normalizePath(zone.prefix)}/`
      )
    );

  return match?.ownerZone || null;
}


function printReport(
  report
) {

  console.log(
    `Docs index: ${report.total} markdown files`
  );

  printList(
    'Skipped non-document markdown files',
    report.skipped
  );

  printList(
    'Documents without metadata',
    report.missingMetadata
  );

  printList(
    'Documents with invalid metadata',
    report.invalidMetadata.map(item =>
      `${item.file} missing=[${item.missingFields.join(', ')}] read_when_array=${item.readWhenIsArray} owner_zone=${item.ownerZone}`
    )
  );

  printList(
    'Documents outside owner zone',
    report.wrongZone.map(item =>
      `${item.file} owner_zone=${item.ownerZone} expected=${item.expectedZone}`
    )
  );

  if (
    !report.missingMetadata.length &&
    !report.invalidMetadata.length &&
    !report.wrongZone.length
  ) {

    console.log(
      'Docs metadata OK.'
    );
  }
}


function shouldSkipDocument(
  relativePath
) {

  return SKIPPED_PATH_PREFIXES.some(prefix =>
    relativePath === prefix ||
    relativePath.startsWith(
      `${prefix}/`
    )
  );
}


function printList(
  title,
  items
) {

  console.log(
    `\n${title}: ${items.length}`
  );

  for (const item of items) {

    console.log(
      `- ${item}`
    );
  }
}


function normalizePath(
  value
) {

  return value.replaceAll(
    path.sep,
    '/'
  );
}
