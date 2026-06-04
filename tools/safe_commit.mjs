import {
  stat
} from 'node:fs/promises';

import {
  spawnSync
} from 'node:child_process';

import path from 'node:path';


const args =
  process.argv.slice(
    2
  );

const parsed =
  parseArgs(
    args
  );

if (
  !parsed.files.length ||
  !parsed.message
) {

  printUsage();
  process.exit(
    1
  );
}

const report =
  await validateFiles(
    parsed.files
  );

if (report.errors.length) {

  console.error(
    'safe_commit blocked:'
  );

  for (const error of report.errors) {

    console.error(
      `- ${error}`
    );
  }

  process.exit(
    1
  );
}

console.log(
  'Files selected for commit:'
);

for (const file of report.files) {

  console.log(
    `- ${file}`
  );
}

if (report.warnings.length) {

  console.warn(
    '\nWarnings:'
  );

  for (const warning of report.warnings) {

    console.warn(
      `- ${warning}`
    );
  }
}

if (!parsed.confirm) {

  console.log(
    '\nNo commit was created. Re-run with --confirm to stage and commit these explicit files.'
  );

  process.exit(
    0
  );
}

runGit(
  [
    'add',
    '--',
    ...report.files
  ]
);

runGit(
  [
    'commit',
    '-m',
    parsed.message
  ]
);


function parseArgs(
  input
) {

  const result = {
    files: [],
    message: '',
    confirm: false
  };

  for (let index = 0; index < input.length; index += 1) {

    const value =
      input[index];

    if (
      value === '--message' ||
      value === '-m'
    ) {

      result.message =
        input[index + 1] || '';

      index += 1;
      continue;
    }

    if (value === '--confirm') {

      result.confirm =
        true;

      continue;
    }

    result.files.push(
      value
    );
  }

  return result;
}


async function validateFiles(
  files
) {

  const normalized =
    files.map(normalizePath);

  const errors =
    [];

  const warnings =
    [];

  for (const file of normalized) {

    if (
      file === '.' ||
      file === './' ||
      file.endsWith('/.')
    ) {

      errors.push(
        'git add . is forbidden; pass explicit files only'
      );

      continue;
    }

    if (isForbiddenPath(file)) {

      errors.push(
        `${file} is not allowed in safe commits`
      );
    }

    if (isTempFile(file)) {

      errors.push(
        `${file} looks like a temporary file`
      );
    }

    if (
      file.startsWith('release/latest/installer/') &&
      file.toLowerCase().endsWith('.exe')
    ) {

      warnings.push(
        `${file} is an installer artifact; commit only with explicit release handoff`
      );
    }

    try {

      const info =
        await stat(
          file
        );

      if (
        info.isFile() &&
        info.size > 25 * 1024 * 1024
      ) {

        errors.push(
          `${file} is larger than 25MB`
        );
      }

    } catch {

      warnings.push(
        `${file} does not exist yet or is generated later`
      );
    }
  }

  return {
    files:
      normalized,
    errors,
    warnings
  };
}


function isForbiddenPath(
  file
) {

  return (
    file.startsWith('dist-desktop/') ||
    file.startsWith('src-tauri/target/') ||
    file.startsWith('node_modules/') ||
    file.includes('/node_modules/')
  );
}


function isTempFile(
  file
) {

  const lower =
    file.toLowerCase();

  return (
    lower.endsWith('.tmp') ||
    lower.endsWith('.temp') ||
    lower.endsWith('.log') ||
    lower.endsWith('.bak') ||
    lower.endsWith('.swp') ||
    lower.startsWith('tmp_') ||
    lower.includes('/tmp_')
  );
}


function runGit(
  gitArgs
) {

  const result =
    spawnSync(
      'git',
      gitArgs,
      {
        stdio: 'inherit'
      }
    );

  if (result.status !== 0) {

    process.exit(
      result.status || 1
    );
  }
}


function printUsage() {

  console.log(
    'Usage: node tools/safe_commit.mjs --message "commit message" [--confirm] file1 file2 ...'
  );
}


function normalizePath(
  value
) {

  return value
    .replaceAll(
      '\\',
      '/'
    )
    .replace(/^\.\//, '');
}
