import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';


const ROOT =
  process.cwd();

const COMMANDS = [
  {
    name: 'verify',
    command: 'npm',
    args: [
      'run',
      'verify'
    ]
  },
  {
    name: 'browser smoke',
    command: 'npm',
    args: [
      'run',
      'test:browser'
    ]
  },
  {
    name: 'desktop frontend prepare',
    command: 'npm',
    args: [
      'run',
      'desktop:prepare'
    ]
  },
  {
    name: 'desktop packaging smoke',
    command: 'npm',
    args: [
      'run',
      'desktop:packaging-smoke'
    ]
  },
  {
    name: 'desktop environment',
    command: 'npm',
    args: [
      'run',
      'desktop:check'
    ]
  },
  {
    name: 'tauri cargo check',
    command: resolveCargoCommand(),
    args: [
      'check'
    ],
    cwd:
      path.join(
        ROOT,
        'src-tauri'
      )
  }
];


main();


function main() {

  for (const command of COMMANDS) {

    runCommand(
      command
    );
  }

  console.log(
    'Desktop release gate пройден.'
  );
}


function runCommand(
  command
) {

  console.log(
    `\n> ${command.name}`
  );

  const result =
    spawnSync(
      command.command,
      command.args,
      {
        cwd:
          command.cwd || ROOT,
        stdio: 'inherit',
        shell: process.platform === 'win32'
      }
    );

  if (result.status !== 0) {

    process.exit(
      result.status || 1
    );
  }
}


function resolveCargoCommand() {

  const localCargo =
    path.join(
      os.homedir(),
      '.cargo',
      'bin',
      process.platform === 'win32'
        ? 'cargo.exe'
        : 'cargo'
    );

  if (
    fs.existsSync(
      localCargo
    )
  ) {

    return localCargo;
  }

  return 'cargo';
}
