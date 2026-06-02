import {
  spawnSync
} from 'node:child_process';


// Легкая проверка desktop-окружения: она не собирает Tauri и не меняет файлы проекта.

const checks =
  [
    {
      name: 'Node.js',
      command: 'node',
      args: ['--version'],
      required: true
    },
    {
      name: 'npm',
      command: 'npm',
      args: ['--version'],
      required: true
    },
    {
      name: 'Tauri CLI',
      command: 'npx',
      args: ['tauri', '--version'],
      required: true
    },
    {
      name: 'Rust compiler',
      command: 'rustc',
      args: ['--version'],
      required: true
    },
    {
      name: 'Cargo',
      command: 'cargo',
      args: ['--version'],
      required: true
    },
    {
      name: 'Rustup',
      command: 'rustup',
      args: ['--version'],
      required: false
    }
  ];

let failed =
  false;

console.log(
  'Desktop environment check'
);

for (const check of checks) {

  const result =
    spawnSync(
      check.command,
      check.args,
      {
        encoding: 'utf8',
        shell: true
      }
    );

  if (result.status === 0) {

    const output =
      `${result.stdout || result.stderr}`.trim();

    console.log(
      `✓ ${check.name}: ${output || 'ok'}`
    );

    continue;
  }

  const mark =
    check.required
      ? '✗'
      : '!';

  console.log(
    `${mark} ${check.name}: not found`
  );

  if (check.required) {

    failed =
      true;
  }
}

console.log(
  ''
);

console.log(
  'Для Windows desktop-сборки также нужны Microsoft Visual Studio Build Tools 2022 с компонентом Desktop development with C++ и Windows SDK.'
);

if (failed) {

  process.exit(
    1
  );
}
