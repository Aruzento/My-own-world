import {
  spawnSync
} from 'node:child_process';

import {
  readdirSync,
  statSync
} from 'node:fs';

import {
  join,
  relative
} from 'node:path';


// Единая проверка перед коммитом: синтаксис, импорты, тесты, diff и docx.

const root =
  process.cwd();

const jsOnly =
  process.argv.includes(
    '--js-only'
  );


function run(
  command,
  args
) {

  const title =
    [command, ...args].join(' ');

  console.log(
    `\n> ${title}`
  );

  const result =
    spawnSync(
      command,
      args,
      {
        cwd: root,
        stdio: 'inherit',
        shell: false
      }
    );

  if (result.status !== 0) {

    process.exit(
      result.status || 1
    );
  }
}


function getFiles(
  directory,
  extension
) {

  const entries =
    readdirSync(
      directory
    );

  return entries.flatMap(entry => {

    const path =
      join(
        directory,
        entry
      );

    const stats =
      statSync(
        path
      );

    if (stats.isDirectory()) {

      return getFiles(
        path,
        extension
      );
    }

    return path.endsWith(extension)
      ? [path]
      : [];
  });
}


function checkJavaScriptSyntax() {

  const files =
    [
      ...getFiles(
        join(root, 'js'),
        '.js'
      ),
      ...getFiles(
        join(root, 'tests'),
        '.mjs'
      ),
      ...getFiles(
        join(root, 'tools'),
        '.mjs'
      )
    ];

  files.forEach(file => {

    run(
      process.execPath,
      [
        '--check',
        relative(
          root,
          file
        )
      ]
    );
  });
}


checkJavaScriptSyntax();

run(
  process.execPath,
  [
    'tools/check_import_paths.mjs'
  ]
);

if (!jsOnly) {

  run(
    process.execPath,
    [
      '--test',
      'tests/*.test.mjs'
    ]
  );

  run(
    'git',
    [
      'diff',
      '--check'
    ]
  );

  run(
    'python',
    [
      '-m',
      'zipfile',
      '-t',
      'docs/MY_OWN_WORLD_FULL_MANUAL.docx'
    ]
  );
}
