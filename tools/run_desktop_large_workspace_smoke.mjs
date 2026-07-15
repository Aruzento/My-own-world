import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';


const args =
  parseArgs(
    process.argv.slice(2)
  );

const workspace =
  args.workspace || args._[0];

const output =
  args.output ||
  'docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md';

const skipDesktopChecks =
  args.desktopChecks === false ||
  args['skip-desktop-checks'] === true;

if (!workspace) {

  console.error(
    'Usage: node tools/run_desktop_large_workspace_smoke.mjs --workspace "X:\\path\\to\\workspace" [--output docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md]'
  );

  process.exit(1);
}

const workspacePath =
  path.resolve(
    workspace
  );

const workspaceExists =
  await exists(
    workspacePath
  );

if (!workspaceExists) {

  console.error(
    `Workspace not found: ${workspacePath}`
  );

  process.exit(1);
}

const runStartedAt =
  new Date();

const diagnostics =
  runJsonCommand({
    name: 'workspace diagnostics',
    command: process.execPath,
    args: [
      'tools/run_workspace_diagnostics.mjs',
      '--workspace',
      workspacePath
    ]
  });

const treeProbe =
  runJsonCommand({
    name: 'read-only tree probe',
    command: process.execPath,
    args: [
      'tools/probe_large_workspace_tree_performance.mjs',
      '--workspace',
      workspacePath
    ]
  });

const desktopChecks =
  skipDesktopChecks
    ? [
      {
        name: 'desktop checks',
        skipped: true,
        ok: null,
        durationMs: 0
      }
    ]
    : [
      runTextCommand({
        name: 'desktop environment',
        command: 'npm',
        args: [
          'run',
          'desktop:check'
        ]
      }),
      runTextCommand({
        name: 'desktop packaging smoke',
        command: 'npm',
        args: [
          'run',
          'desktop:packaging-smoke'
        ]
      })
    ];

const artifacts =
  await inspectDesktopArtifacts();

const report =
  createMarkdownReport({
    runStartedAt,
    workspacePath,
    diagnostics,
    treeProbe,
    desktopChecks,
    artifacts
  });

await fs.mkdir(
  path.dirname(
    output
  ),
  {
    recursive: true
  }
);

await fs.writeFile(
  output,
  report,
  'utf8'
);

console.log(
  `Desktop large workspace smoke report written: ${output}`
);

if (
  !diagnostics.ok ||
  !treeProbe.ok ||
  desktopChecks.some(check => check.ok === false)
) {

  process.exitCode =
    1;
}


function runJsonCommand({
  name,
  command,
  args
}) {

  const result =
    runCommand({
      name,
      command,
      args,
      stdio: 'pipe'
    });

  let data =
    null;

  try {

    data =
      JSON.parse(
        result.stdout || '{}'
      );

  } catch (error) {

    result.parseError =
      error?.message || String(error);
  }

  return {
    ...result,
    data
  };
}


function runTextCommand({
  name,
  command,
  args
}) {

  return runCommand({
    name,
    command,
    args,
    stdio: 'pipe'
  });
}


function runCommand({
  name,
  command,
  args,
  stdio
}) {

  const startedAt =
    Date.now();

  const result =
    spawnSync(
      command,
      args,
      {
        cwd:
          process.cwd(),
        encoding:
          'utf8',
        shell:
          process.platform === 'win32',
        stdio
      }
    );

  const durationMs =
    Date.now() - startedAt;

  return {
    name,
    command:
      [command, ...args].join(' '),
    ok:
      result.status === 0,
    status:
      result.status,
    durationMs,
    stdout:
      result.stdout || '',
    stderr:
      result.stderr || '',
    error:
      result.error?.message || ''
  };
}


async function inspectDesktopArtifacts() {

  const executable =
    'src-tauri/target/release/my-own-world.exe';

  const installer =
    'src-tauri/target/release/bundle/nsis/MyOwnWorld_0.0.0_x64-setup.exe';

  return {
    executable: {
      path:
        executable,
      exists:
        await exists(
          executable
        )
    },
    installer: {
      path:
        installer,
      exists:
        await exists(
          installer
        )
    }
  };
}


function createMarkdownReport({
  runStartedAt,
  workspacePath,
  diagnostics,
  treeProbe,
  desktopChecks,
  artifacts
}) {

  const diagnosticData =
    diagnostics.data || {};

  const treeData =
    treeProbe.data || {};

  const summary =
    diagnosticData.summary || {};

  return [
    '---',
    'summary: "Current desktop large workspace smoke report."',
    'read_when:',
    '  - "Before desktop release handoff"',
    '  - "When validating a large GM workspace"',
    'owner_zone: "delivery"',
    '---',
    '',
    '# Desktop Large Workspace Smoke Current',
    '',
    `Run date: ${runStartedAt.toISOString()}`,
    '',
    `Plan ref: \`0.0.1.2.3\``,
    '',
    `Workspace: \`${workspacePath}\``,
    '',
    '## Automated Read-Only Checks',
    '',
    createCommandSummary(
      diagnostics
    ),
    '',
    createCommandSummary(
      treeProbe
    ),
    '',
    '## Desktop Environment Checks',
    '',
    ...desktopChecks.map(createCommandSummary),
    '',
    '## Workspace Summary',
    '',
    `- Pages: ${summary.pageCount ?? 'unknown'}`,
    `- Campaign maps: ${summary.campaignMapCount ?? 'unknown'}`,
    `- Task trackers: ${summary.taskTrackerCount ?? 'unknown'}`,
    `- Assets: ${summary.assetFileCount ?? 'unknown'}`,
    `- Asset references: ${summary.assetReferenceCount ?? 'unknown'}`,
    `- Missing asset references: ${summary.missingAssetReferenceCount ?? 'unknown'}`,
    `- Complete backups: ${summary.completeBackupCount ?? 'unknown'}`,
    `- Incomplete backups: ${summary.incompleteBackupCount ?? 'unknown'}`,
    `- Diagnostics duration: ${diagnosticData.durationMs ?? 'unknown'} ms`,
    '',
    '## Tree Probe Summary',
    '',
    `- Pages: ${treeData.pageCount ?? 'unknown'}`,
    `- Root pages: ${treeData.rootCount ?? 'unknown'}`,
    ...formatTimings(
      treeData.timings || []
    ),
    '',
    '## Desktop Artifacts',
    '',
    `- Release executable: ${artifacts.executable.exists ? 'exists' : 'missing'} - \`${artifacts.executable.path}\``,
    `- Installer: ${artifacts.installer.exists ? 'exists' : 'missing'} - \`${artifacts.installer.path}\``,
    '',
    '## Manual Native Desktop Checklist',
    '',
    'Use a copied workspace for destructive checks.',
    '',
    '- [ ] Start `src-tauri\\target\\release\\my-own-world.exe` or install the latest NSIS installer.',
    '- [ ] Select the large workspace.',
    '- [ ] Open settings and run `Диагностика workspace`.',
    '- [ ] Confirm the diagnostics panel shows workspace path, write access, schema, checkpoint, backups and last operation.',
    '- [ ] Scroll the tree from top to bottom.',
    '- [ ] Search a known page.',
    '- [ ] Use `Найти в дереве` from an opened card.',
    '- [ ] Open a heavy campaign map from the report.',
    '- [ ] Confirm map background images render.',
    '- [ ] Confirm token/object images render.',
    '- [ ] Open presentation mode.',
    '- [ ] Confirm fog/layer order and visible map sync.',
    '- [ ] Play one normal playlist track and one battle playlist track if the map has music.',
    '- [ ] Create a manual backup from settings.',
    '- [ ] On a workspace copy only: create a temporary page, move it, then delete it.',
    '- [ ] Close and reopen the app, then reopen the same workspace.',
    '',
    '## Pass Rule',
    '',
    '- Automated checks must be green.',
    '- No missing asset references for normal release handoff.',
    '- Any visible operation above 2 seconds must show progress or a clear status message.',
    '- The app must not feel frozen during tree scroll, search, map open, presentation open, backup or page move/delete.',
    '- Destructive checks must never run on the only important workspace copy.',
    '',
    '## Known Automation Limit',
    '',
    'This runner cannot click inside the native Tauri WebView. It prepares the measurable part and a manual checklist; a future Tauri UI runner should automate the visible click-through.',
    ''
  ].join('\n');
}


function createCommandSummary(
  result
) {

  if (result.skipped) {

    return `- ${result.name}: skipped`;
  }

  const status =
    result.ok
      ? 'passed'
      : 'failed';

  return `- ${result.name}: ${status} (${result.durationMs} ms)`;
}


function formatTimings(
  timings
) {

  if (!timings.length) {

    return [
      '- Timings: no data'
    ];
  }

  return timings.map(timing =>
    `- ${timing.name}: ${Math.round(Number(timing.durationMs || 0))} ms`
  );
}


async function exists(
  target
) {

  try {

    await fs.access(
      target
    );

    return true;

  } catch (error) {

    return false;
  }
}


function parseArgs(
  rawArgs
) {

  const parsed =
    {
      _: []
    };

  for (
    let index = 0;
    index < rawArgs.length;
    index += 1
  ) {

    const arg =
      rawArgs[index];

    if (arg.startsWith('--no-')) {

      parsed[arg.slice(5)] =
        false;

      continue;
    }

    if (arg.startsWith('--')) {

      const key =
        arg.slice(2);

      const next =
        rawArgs[index + 1];

      if (
        next &&
        !next.startsWith('--')
      ) {

        parsed[key] =
          next;

        index += 1;

      } else {

        parsed[key] =
          true;
      }

      continue;
    }

    parsed._.push(
      arg
    );
  }

  return parsed;
}
