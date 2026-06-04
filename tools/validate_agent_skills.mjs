import {
  readdir,
  readFile
} from 'node:fs/promises';

import path from 'node:path';


const SKILLS_ROOT =
  path.resolve(
    '.agents',
    'skills'
  );

const skillFiles =
  await listSkillFiles(
    SKILLS_ROOT
  );

const names =
  new Map();

const errors =
  [];

for (const file of skillFiles) {

  const content =
    await readFile(
      file,
      'utf8'
    );

  const metadata =
    parseFrontMatter(
      content
    );

  const relative =
    normalizePath(
      path.relative(
        process.cwd(),
        file
      )
    );

  if (!metadata) {

    errors.push(
      `${relative}: missing YAML front matter`
    );

    continue;
  }

  if (!metadata.name) {

    errors.push(
      `${relative}: missing name`
    );
  }

  if (!metadata.description) {

    errors.push(
      `${relative}: missing description`
    );
  }

  if (
    metadata.name &&
    names.has(
      metadata.name
    )
  ) {

    errors.push(
      `${relative}: duplicate name "${metadata.name}" also used in ${names.get(metadata.name)}`
    );
  }

  if (metadata.name) {

    names.set(
      metadata.name,
      relative
    );
  }
}

console.log(
  `Agent skills: ${skillFiles.length}`
);

for (const [name, file] of names.entries()) {

  console.log(
    `OK ${name}: ${file}`
  );
}

if (errors.length) {

  console.error(
    '\nSkill validation failed:'
  );

  for (const error of errors) {

    console.error(
      `- ${error}`
    );
  }

  process.exitCode =
    1;
}


async function listSkillFiles(
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

    if (!entry.isDirectory()) continue;

    const skillFile =
      path.join(
        root,
        entry.name,
        'SKILL.md'
      );

    files.push(
      skillFile
    );
  }

  return files.sort();
}


function parseFrontMatter(
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

  const metadata =
    {};

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

  for (const line of lines) {

    const match =
      line.match(/^([a-z_]+):\s*(.*)$/);

    if (!match) continue;

    const [, key, rawValue] =
      match;

    metadata[key] =
      rawValue
        .trim()
        .replace(/^"|"$/g, '');
  }

  return metadata;
}


function normalizePath(
  value
) {

  return value.replaceAll(
    path.sep,
    '/'
  );
}
