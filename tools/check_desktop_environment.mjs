import {
  spawnSync
} from 'node:child_process';

import {
  existsSync
} from 'node:fs';

import {
  dirname,
  join
} from 'node:path';


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
      command: process.execPath,
      args: [
        getNodeCliPath('npm', 'npm-cli.js'),
        '--version'
      ],
      required: true
    },
    {
      name: 'Tauri CLI',
      command: process.execPath,
      args: [
        join(
          process.cwd(),
          'node_modules',
          '@tauri-apps',
          'cli',
          'tauri.js'
        ),
        '--version'
      ],
      required: true
    },
    {
      name: 'Rust compiler',
      command: 'rustc',
      args: ['--version'],
      required: true,
      fallbackCommand: getCargoBinCommand('rustc.exe')
    },
    {
      name: 'Cargo',
      command: 'cargo',
      args: ['--version'],
      required: true,
      fallbackCommand: getCargoBinCommand('cargo.exe')
    },
    {
      name: 'Rustup',
      command: 'rustup',
      args: ['--version'],
      required: false,
      fallbackCommand: getCargoBinCommand('rustup.exe')
    },
    {
      name: 'Visual Studio Build Tools C++',
      command: getVsWherePath(),
      args: [
        '-latest',
        '-products',
        '*',
        '-requires',
        'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
        '-property',
        'installationPath'
      ],
      required: true
    },
    {
      name: 'Windows SDK',
      pathExists: 'C:/Program Files (x86)/Windows Kits/10/bin',
      required: true
    }
  ];

let failed =
  false;

console.log(
  'Desktop environment check'
);

for (const check of checks) {

  const result =
    runCheck(
      check
    );

  if (result.status === 0) {

    const output =
      `${result.stdout || result.stderr}`.trim();

    console.log(
      `[ok] ${check.name}: ${output || 'ok'}`
    );

    continue;
  }

  const mark =
    check.required
      ? '[fail]'
      : '[warn]';

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
  'Проверка Windows desktop-сборки включает Visual Studio Build Tools 2022 C++ и Windows SDK.'
);

if (failed) {

  process.exit(
    1
  );
}


function runCheck(
  check
) {

  const primaryResult =
    check.pathExists
      ? runPathExistsCheck(
        check.pathExists
      )
      :
    spawnSync(
      check.command,
      check.args,
      {
        encoding: 'utf8'
      }
    );

  if (
    primaryResult.status === 0 ||
    !check.fallbackCommand
  ) {

    return primaryResult;
  }

  return spawnSync(
    check.fallbackCommand,
    check.args,
    {
      encoding: 'utf8'
    }
  );
}


function runPathExistsCheck(
  path
) {

  if (existsSync(path)) {

    return {
      status: 0,
      stdout: path,
      stderr: ''
    };
  }

  return {
    status: 1,
    stdout: '',
    stderr: ''
  };
}


function getCargoBinCommand(
  executableName
) {

  const cargoBinPath =
    join(
      process.env.USERPROFILE || '',
      '.cargo',
      'bin',
      executableName
    );

  return existsSync(
    cargoBinPath
  )
    ? cargoBinPath
    : '';
}


function getNodeCliPath(
  packageName,
  cliFileName
) {

  return join(
    dirname(
      process.execPath
    ),
    'node_modules',
    packageName,
    'bin',
    cliFileName
  );
}


function getVsWherePath() {

  return 'C:/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe';
}
