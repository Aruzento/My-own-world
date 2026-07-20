import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';


const ROOT =
  process.cwd();

const DEFAULT_REPORT =
  'docs/01-delivery/DESKTOP_RELEASE_GATE_CURRENT.md';

const args =
  parseArgs(
    process.argv.slice(2)
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

const results =
  [];


main();


function main() {

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
      name: 'large workspace desktop smoke',
      command: process.execPath,
      args: [
        'tools/run_desktop_large_workspace_smoke.mjs',
        '--workspace',
        workspace
      ]
    });

  } else if (requireLargeWorkspace) {

    results.push({
      name: 'large workspace desktop smoke',
      ok: false,
      skipped: false,
      durationMs: 0,
      detail:
        'Required by --require-large-workspace, but no --workspace path or MOW_DESKTOP_RELEASE_WORKSPACE was provided.'
    });

  } else {

    results.push({
      name: 'large workspace desktop smoke',
      ok: null,
      skipped: true,
      durationMs: 0,
      detail:
        'Skipped because no --workspace path or MOW_DESKTOP_RELEASE_WORKSPACE was provided.'
    });
  }

  for (const command of commands) {

    if (hasFailure()) {

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
    workspace
  });

  if (hasFailure()) {

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

  return {
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
}


function writeReport({
  startedAt,
  finishedAt,
  workspace
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

  const failed =
    results.filter(result => result.ok === false);

  const skipped =
    results.filter(result => result.skipped);

  const lines =
    [
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
      `Overall: ${failed.length ? 'FAILED' : 'PASSED'}`,
      '',
      '## Steps',
      '',
      ...results.map(formatResult),
      '',
      '## Release Rule',
      '',
      '- Do not build or hand off a desktop installer if any required step failed.',
      '- If the large workspace smoke is skipped, the release can only be treated as a normal workspace build, not a validated large-GM-workspace build.',
      '- Before sending an installer to another person, run the manual native desktop checklist from `docs/01-delivery/DESKTOP_LARGE_WORKSPACE_SMOKE.md` when the target user has a large workspace.',
      '- Keep `release/latest/release-notes.md` and `release/latest/tester-instructions.md` aligned with the build being sent.',
      '',
      '## Skipped Steps',
      '',
      skipped.length
        ? skipped.map(result => `- ${result.name}: ${result.detail}`).join('\n')
        : '- None',
      ''
    ];

  fs.writeFileSync(
    reportPath,
    lines.join('\n'),
    'utf8'
  );
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


function hasFailure() {

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
