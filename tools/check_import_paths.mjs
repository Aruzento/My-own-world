import {
  execFileSync
} from 'node:child_process';

import {
  readFileSync
} from 'node:fs';

import {
  dirname,
  posix
} from 'node:path';


// Проверяет относительные и browser-absolute импорты так, как их увидит Linux CI.

const trackedFiles =
  execFileSync(
    'git',
    [
      'ls-files'
    ],
    {
      encoding: 'utf8'
    }
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(file => file.replaceAll('\\', '/'));

const exactPaths =
  new Set(
    trackedFiles
  );

const lowerPaths =
  new Map(
    trackedFiles.map(file => [
      file.toLowerCase(),
      file
    ])
  );

const sourceFiles =
  trackedFiles.filter(file => (
    file.endsWith('.js') ||
    file.endsWith('.mjs') ||
    file.endsWith('.html')
  ));

const importPattern =
  /(?:import\s*(?:[^'"()]*?\sfrom\s*)?|import\s*\(\s*)['"]([^'"]+)['"]|export\s+[^'";]*?\sfrom\s*['"]([^'"]+)['"]/g;

const issues =
  [];

function makeCandidates(
  target
) {

  if (
    target.endsWith('.js') ||
    target.endsWith('.mjs')
  ) {

    return [
      target
    ];
  }

  return [
    `${target}.js`,
    `${target}.mjs`,
    `${target}/index.js`
  ];
}

function resolveImport(
  file,
  specifier
) {

  if (specifier.startsWith('/')) {

    return specifier.slice(1);
  }

  return posix.normalize(
    posix.join(
      dirname(file),
      specifier
    )
  );
}

for (const file of sourceFiles) {

  const text =
    readFileSync(
      file,
      'utf8'
    );

  for (const match of text.matchAll(importPattern)) {

    const specifier =
      match[1] || match[2];

    if (
      !specifier ||
      (
        !specifier.startsWith('.') &&
        !specifier.startsWith('/')
      )
    ) {

      continue;
    }

    const target =
      resolveImport(
        file,
        specifier
      );

    const candidates =
      makeCandidates(
        target
      );

    if (candidates.some(candidate => exactPaths.has(candidate))) {

      continue;
    }

    const caseInsensitiveMatch =
      candidates
        .map(candidate => lowerPaths.get(candidate.toLowerCase()))
        .find(Boolean);

    issues.push({
      file,
      specifier,
      expected: candidates.join(' | '),
      actual: caseInsensitiveMatch || null
    });
  }
}

if (issues.length > 0) {

  console.error(
    '\nImport path case check failed:'
  );

  issues.forEach(issue => {

    const actual =
      issue.actual
        ? `, tracked as ${issue.actual}`
        : '';

    console.error(
      `- ${issue.file}: ${issue.specifier} -> ${issue.expected}${actual}`
    );
  });

  process.exit(
    1
  );
}

console.log(
  'Import path case check passed.'
);
