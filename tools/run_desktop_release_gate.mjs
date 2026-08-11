import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const ROOT =
  process.cwd();

const DEFAULT_REPORT =
  'docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md';

const LARGE_WORKSPACE_STEP =
  'large workspace desktop smoke';


if (isMainModule()) {

  main(
    process.argv.slice(2)
  );
}


function main(
  rawArgs =
    []
) {

  const args =
    parseArgs(
      rawArgs
    );

  const workspace =
    args.workspace ||
    process.env.MOW_DESKTOP_RELEASE_WORKSPACE ||
    '';

  const requireLargeWorkspace =
    args['require-large-workspace'] === true ||
    process.env.MOW_REQUIRE_LARGE_WORKSPACE === '1';

  const output =
    args.output ||
    DEFAULT_REPORT;

  const largeWorkspaceReport =
    args['large-workspace-output'] ||
    'docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md';

  const results =
    [];

  const startedAt =
    new Date();

  results.push(
    runPreflight()
  );

  const commands =
    [
      {
        name: 'documentation index',
        command: process.execPath,
        args: [
          'tools/docs_index.mjs'
        ]
      },
      {
        name: 'agent skills validation',
        command: process.execPath,
        args: [
          'tools/validate_agent_skills.mjs'
        ]
      },
      {
        name: 'verify',
        command: process.execPath,
        args: [
          'tools/run_checks.mjs'
        ]
      },
      {
        name: 'browser smoke',
        command: process.execPath,
        args: [
          'tools/run_browser_smoke.mjs'
        ]
      },
      {
        name: 'desktop frontend prepare',
        command: process.execPath,
        args: [
          'tools/prepare_desktop_dist.mjs'
        ]
      },
      {
        name: 'desktop packaging smoke',
        command: process.execPath,
        args: [
          'tools/check_desktop_packaging_smoke.mjs'
        ]
      },
      {
        name: 'desktop environment',
        command: process.execPath,
        args: [
          'tools/check_desktop_environment.mjs'
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

  if (workspace) {

    commands.push({
      name: LARGE_WORKSPACE_STEP,
      command: process.execPath,
      args: [
        'tools/run_desktop_large_workspace_smoke.mjs',
        '--workspace',
        workspace,
        '--output',
        largeWorkspaceReport
      ],
      advisoryReport:
        largeWorkspaceReport
    });

  } else if (requireLargeWorkspace) {

    results.push({
      name: LARGE_WORKSPACE_STEP,
      ok: false,
      skipped: false,
      durationMs: 0,
      detail:
        'Required by --require-large-workspace, but no --workspace path or MOW_DESKTOP_RELEASE_WORKSPACE was provided.'
    });

  } else {

    results.push({
      name: LARGE_WORKSPACE_STEP,
      ok: null,
      skipped: true,
      durationMs: 0,
      detail:
        'Skipped because no --workspace path or MOW_DESKTOP_RELEASE_WORKSPACE was provided.'
    });
  }

  for (const command of commands) {

    if (
      hasFailure(
        results
      )
    ) {

      results.push({
        name:
          command.name,
        ok:
          null,
        skipped:
          true,
        durationMs:
          0,
        detail:
          'Skipped because an earlier release gate step failed.'
      });

      continue;
    }

    results.push(
      runCommand(
        command
      )
    );
  }

  writeReport({
    startedAt,
    finishedAt:
      new Date(),
    workspace,
    requireLargeWorkspace,
    output,
    results
  });

  if (
    getDesktopReleaseGateStatus(
      results,
      {
        workspace,
        requireLargeWorkspace
      }
    ).failed
  ) {

    console.error(
      '\nDesktop release gate failed. See docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md.'
    );

    process.exit(
      1
    );
  }

  console.log(
    '\nDesktop release gate passed. See docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md.'
  );
}


function runPreflight() {

  const requiredFiles =
    [
      'docs/04-user-release/HOW_TO_INSTALL.md',
      'docs/04-user-release/README_FOR_TESTERS.md',
      'release/latest/release-notes.md',
      'release/latest/tester-instructions.md',
      'docs/01-delivery/DESKTOP_LARGE_WORKSPACE_SMOKE.md'
    ];

  const missing =
    requiredFiles.filter(file =>
      !fs.existsSync(
        path.join(
          ROOT,
          file
        )
      )
    );

  const requiredScripts =
    [
      'verify',
      'test:browser',
      'desktop:prepare',
      'desktop:packaging-smoke',
      'desktop:check',
      'desktop:large-workspace-smoke'
    ];

  const packageJson =
    JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          'package.json'
        ),
        'utf8'
      )
    );

  const missingScripts =
    requiredScripts.filter(script =>
      !packageJson.scripts?.[script]
    );

  return {
    name:
      'desktop release handoff preflight',
    ok:
      missing.length === 0 &&
      missingScripts.length === 0,
    skipped:
      false,
    durationMs:
      0,
    detail:
      [
        missing.length
          ? `Missing files: ${missing.join(', ')}`
          : 'Required release handoff files exist.',
        missingScripts.length
          ? `Missing npm scripts: ${missingScripts.join(', ')}`
          : 'Required npm scripts exist.'
      ].join(' ')
  };
}


function runCommand(
  command
) {

  console.log(
    `\n> ${command.name}`
  );

  const startedAt =
    Date.now();

  const result =
    spawnSync(
      resolveCommand(
        command.command
      ),
      command.args,
      {
        cwd:
          command.cwd || ROOT,
        stdio:
          'inherit',
        shell:
          false
      }
    );

  const commandResult =
    {
    name:
      command.name,
    ok:
      result.status === 0,
    skipped:
      false,
    status:
      result.status,
    durationMs:
      Date.now() - startedAt,
    detail:
      result.error?.message || ''
  };

  if (
    command.advisoryReport &&
    commandResult.ok
  ) {

    commandResult.advisoryWarnings =
      readLargeWorkspaceAdvisoryWarnings(
        command.advisoryReport
      );
  }

  return commandResult;
}


function writeReport({
  startedAt,
  finishedAt,
  workspace,
  requireLargeWorkspace,
  output,
  results
}) {

  const reportPath =
    path.join(
      ROOT,
      output
    );

  fs.mkdirSync(
    path.dirname(
      reportPath
    ),
    {
      recursive: true
    }
  );

  const skipped =
    results.filter(result => result.skipped);

  const status =
    getDesktopReleaseGateStatus(
      results,
      {
        workspace,
        requireLargeWorkspace
      }
    );

  const lines =
    createDesktopReleaseGateReport({
      startedAt,
      finishedAt,
      workspace,
      results,
      skipped,
      status
    });

  fs.writeFileSync(
    reportPath,
    lines.join('\n'),
    'utf8'
  );
}


export function createDesktopReleaseGateReport({
  startedAt,
  finishedAt,
  workspace,
  results,
  skipped,
  status
}) {

  return [
    '---',
    'summary: "Current desktop release gate report."',
    'read_when:',
    '  - "Before desktop installer handoff"',
    '  - "When validating desktop release readiness"',
    'owner_zone: "delivery"',
    '---',
    '',
    '# Desktop Release Gate Current',
    '',
    `Run started: ${startedAt.toISOString()}`,
    '',
    `Run finished: ${finishedAt.toISOString()}`,
    '',
    'Plan ref: `0.0.1.2.4`',
    '',
    `Large workspace: ${workspace ? `\`${workspace}\`` : 'not provided'}`,
    '',
    `Overall: ${status.overallLabel}`,
    '',
    `Confidence: ${status.confidenceLabel}`,
    '',
    `Normal workspace validation: ${status.normalWorkspaceLabel}`,
    '',
    `Large workspace validation: ${status.largeWorkspaceLabel}`,
    '',
    `Advisory diagnostics: ${status.advisoryLabel}`,
    '',
    '## Steps',
    '',
    ...results.map(formatResult),
    '',
    '## Release Rule',
    '',
    '- Do not build or hand off a desktop installer if any required step failed.',
    '- `NORMAL_WORKSPACE_VALIDATED` is useful for local developer checks, but it is not equivalent to a large-workspace release validation.',
    '- If the large workspace smoke is skipped, the release can only be treated as a normal workspace build, not a validated large-GM-workspace build.',
    '- Advisory diagnostics warnings must be reviewed, but they are reported separately from hard gate failures.',
    '- Before sending an installer to another person, run the manual native desktop checklist from `docs/01-delivery/DESKTOP_LARGE_WORKSPACE_SMOKE.md` when the target user has a large workspace.',
    '- Keep `release/latest/release-notes.md` and `release/latest/tester-instructions.md` aligned with the build being sent.',
    '',
    '## Confidence Levels',
    '',
    '- `NORMAL_WORKSPACE_VALIDATED`: core desktop gate passed; no real large workspace was validated in this run.',
    '- `LARGE_WORKSPACE_VALIDATED`: core desktop gate and real large-workspace smoke passed.',
    '- `LARGE_WORKSPACE_SKIPPED`: large-workspace smoke did not run and must not be treated as full release confidence.',
    '- `LARGE_WORKSPACE_BLOCKED_OR_FAILED`: required large-workspace coverage was unavailable or the smoke failed.',
    '',
    '## Skipped Steps',
    '',
    skipped.length
      ? skipped.map(result => `- ${result.name}: ${result.detail}`).join('\n')
      : '- None',
    '',
    '## Advisory Diagnostics',
    '',
    ...formatAdvisoryDiagnostics(
      status.advisoryWarnings
    ),
    ''
  ];
}


function formatResult(
  result
) {

  if (result.skipped) {

    return `- ${result.name}: skipped - ${result.detail}`;
  }

  const status =
    result.ok
      ? 'passed'
      : 'failed';

  const detail =
    result.detail
      ? ` - ${result.detail}`
      : '';

  return `- ${result.name}: ${status} (${result.durationMs} ms)${detail}`;
}


export function getDesktopReleaseGateStatus(
  results,
  {
    workspace = '',
    requireLargeWorkspace = false
  } =
    {}
) {

  const failedResults =
    results.filter(result => result.ok === false);

  const largeWorkspaceResult =
    results.find(result =>
      result.name === LARGE_WORKSPACE_STEP
    );

  const advisoryWarnings =
    results.flatMap(result =>
      result.ok === true &&
      Array.isArray(result.advisoryWarnings)
        ? result.advisoryWarnings
        : []
    );

  const nonLargeFailures =
    failedResults.filter(result =>
      result.name !== LARGE_WORKSPACE_STEP
    );

  const largeWorkspaceState =
    getLargeWorkspaceState({
      workspace,
      requireLargeWorkspace,
      largeWorkspaceResult,
      nonLargeFailures
    });

  const failed =
    failedResults.length > 0;

  const normalWorkspaceState =
    nonLargeFailures.length
      ? 'failed'
      : 'validated';

  const confidence =
    getConfidenceLevel({
      failed,
      largeWorkspaceState,
      normalWorkspaceState
    });

  return {
    failed,
    confidence,
    confidenceLabel:
      formatConfidenceLabel(
        confidence
      ),
    overallLabel:
      formatOverallLabel({
        failed,
        confidence,
        advisoryWarnings
      }),
    normalWorkspaceState,
    normalWorkspaceLabel:
      normalWorkspaceState === 'validated'
        ? 'VALIDATED'
        : 'FAILED',
    largeWorkspaceState,
    largeWorkspaceLabel:
      formatLargeWorkspaceLabel(
        largeWorkspaceState
      ),
    advisoryWarnings,
    advisoryLabel:
      advisoryWarnings.length
        ? `PRESENT (${advisoryWarnings.length}, non-blocking)`
        : 'NONE'
  };
}


function getLargeWorkspaceState({
  workspace,
  requireLargeWorkspace,
  largeWorkspaceResult,
  nonLargeFailures
}) {

  if (!workspace && !requireLargeWorkspace) {

    return 'skipped';
  }

  if (!workspace && requireLargeWorkspace) {

    return 'blocked';
  }

  if (
    nonLargeFailures.length &&
    largeWorkspaceResult?.skipped
  ) {

    return 'blocked';
  }

  if (largeWorkspaceResult?.ok === true) {

    return 'validated';
  }

  if (largeWorkspaceResult?.ok === false) {

    return 'failed';
  }

  if (largeWorkspaceResult?.skipped) {

    return 'skipped';
  }

  return 'blocked';
}


function getConfidenceLevel({
  failed,
  largeWorkspaceState,
  normalWorkspaceState
}) {

  if (
    largeWorkspaceState === 'validated' &&
    !failed
  ) {

    return 'large-workspace-validated';
  }

  if (
    largeWorkspaceState === 'skipped' &&
    normalWorkspaceState === 'validated' &&
    !failed
  ) {

    return 'normal-workspace-validated';
  }

  if (
    largeWorkspaceState === 'blocked' ||
    largeWorkspaceState === 'failed'
  ) {

    return 'large-workspace-blocked-or-failed';
  }

  return 'hard-failure';
}


function formatOverallLabel({
  failed,
  confidence,
  advisoryWarnings
}) {

  if (failed) {

    return 'FAILED';
  }

  if (confidence === 'normal-workspace-validated') {

    return 'PASSED - NORMAL WORKSPACE ONLY';
  }

  if (advisoryWarnings.length) {

    return 'PASSED - ADVISORY WARNINGS';
  }

  return 'PASSED';
}


function formatConfidenceLabel(
  confidence
) {

  if (confidence === 'large-workspace-validated') {

    return 'LARGE_WORKSPACE_VALIDATED';
  }

  if (confidence === 'normal-workspace-validated') {

    return 'NORMAL_WORKSPACE_VALIDATED';
  }

  if (confidence === 'large-workspace-blocked-or-failed') {

    return 'LARGE_WORKSPACE_BLOCKED_OR_FAILED';
  }

  return 'HARD_FAILURE';
}


function formatLargeWorkspaceLabel(
  state
) {

  if (state === 'validated') {

    return 'VALIDATED';
  }

  if (state === 'skipped') {

    return 'SKIPPED';
  }

  if (state === 'blocked') {

    return 'BLOCKED';
  }

  return 'FAILED';
}


function formatAdvisoryDiagnostics(
  advisoryWarnings
) {

  if (!advisoryWarnings.length) {

    return [
      '- None'
    ];
  }

  return advisoryWarnings.map(warning =>
    `- ${warning}`
  );
}


export function readLargeWorkspaceAdvisoryWarnings(
  report
) {

  const reportPath =
    path.isAbsolute(
      report
    )
      ? report
      : path.join(
        ROOT,
        report
      );

  if (
    !fs.existsSync(
      reportPath
    )
  ) {

    return [];
  }

  return parseLargeWorkspaceAdvisoryWarnings(
    fs.readFileSync(
      reportPath,
      'utf8'
    )
  );
}


export function parseLargeWorkspaceAdvisoryWarnings(
  markdown
) {

  const lines =
    String(markdown || '').split(/\r?\n/);

  const start =
    lines.findIndex(line =>
      line.trim() === '### Diagnostics Warnings'
    );

  if (start < 0) {

    return [];
  }

  const warnings =
    [];

  for (
    let index = start + 1;
    index < lines.length;
    index += 1
  ) {

    const line =
      lines[index].trim();

    if (
      line.startsWith('## ') ||
      line.startsWith('### ')
    ) {

      break;
    }

    if (
      !line ||
      line === '- No diagnostics warnings.'
    ) {

      continue;
    }

    if (line.startsWith('- ')) {

      warnings.push(
        line.slice(2)
      );
    }
  }

  return warnings;
}


function hasFailure(
  results
) {

  return results.some(result => result.ok === false);
}


function resolveCommand(
  command
) {

  if (
    process.platform === 'win32' &&
    command === 'npm'
  ) {

    return 'npm.cmd';
  }

  return command;
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


function isMainModule() {

  return process.argv[1] &&
    path.resolve(
      process.argv[1]
    ) === fileURLToPath(
      import.meta.url
    );
}
