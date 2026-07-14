import {
  readdirSync,
  readFileSync
} from 'node:fs';

import {
  extname,
  join,
  relative
} from 'node:path';

import {
  TextDecoder
} from 'node:util';

const root =
  process.cwd();

const textDecoder =
  new TextDecoder(
    'utf-8',
    {
      fatal: true
    }
  );

const textExtensions =
  new Set([
    '.css',
    '.html',
    '.js',
    '.json',
    '.md',
    '.mjs',
    '.rs',
    '.toml',
    '.txt',
    '.yaml',
    '.yml'
  ]);

const ignoredDirectories =
  new Set([
    '.git',
    'dist-desktop',
    'node_modules',
    'target'
  ]);

const ignoredFiles =
  new Set([
    'package-lock.json'
  ]);

function char(
  code
) {

  return String.fromCharCode(
    code
  );
}

const replacementMarker =
  char(
    0xfffd
  );

const strongMojibakePattern =
  new RegExp(
    [
      `${char(0x0420)}[\\u045f\\u045e\\u045c\\u0491\\u00b5\\u00b0\\u0451\\u0455\\u0412\\u045a\\u0403]`,
      `${char(0x0421)}[\\u0403\\u201a\\u0453\\u201e\\u2026\\u2020\\u2021\\u20ac\\u2030\\u040f]`,
      `${char(0x0432)}\\u0402`,
      replacementMarker,
      char(0x00d0),
      char(0x00d1)
    ].join('|')
  );

function listTextFiles(
  directory,
  files = []
) {

  const entries =
    readdirSync(
      directory,
      {
        withFileTypes: true
      }
    );

  entries.forEach(entry => {

    const path =
      join(
        directory,
        entry.name
      );

    if (entry.isDirectory()) {

      if (!ignoredDirectories.has(entry.name)) {

        listTextFiles(
          path,
          files
        );
      }

      return;
    }

    if (!entry.isFile()) {

      return;
    }

    const relativePath =
      relative(
        root,
        path
      ).replaceAll(
        '\\',
        '/'
      );

    if (
      ignoredFiles.has(relativePath) ||
      !textExtensions.has(extname(entry.name).toLowerCase())
    ) {

      return;
    }

    files.push(
      path
    );
  });

  return files;
}

function hasLikelyMojibake(
  line
) {

  return strongMojibakePattern.test(line);
}

const problems =
  [];

listTextFiles(
  root
).forEach(file => {

  const relativePath =
    relative(
      root,
      file
    );

  const buffer =
    readFileSync(
      file
    );

  let text;

  try {

    text =
      textDecoder.decode(
        buffer
      );
  } catch {

    problems.push({
      file: relativePath,
      line: 0,
      reason: 'file is not valid UTF-8'
    });

    return;
  }

  text.split(/\r?\n/).forEach((line, index) => {

    if (hasLikelyMojibake(line)) {

      problems.push({
        file: relativePath,
        line: index + 1,
        reason: 'likely mojibake text'
      });
    }
  });
});

if (problems.length > 0) {

  console.error(
    'Text encoding check failed:'
  );

  problems.slice(
    0,
    80
  ).forEach(problem => {

    const location =
      problem.line > 0
        ? `${problem.file}:${problem.line}`
        : problem.file;

    console.error(
      `- ${location} - ${problem.reason}`
    );
  });

  if (problems.length > 80) {

    console.error(
      `...and ${problems.length - 80} more`
    );
  }

  process.exit(
    1
  );
}

console.log(
  'Text encoding check passed.'
);
