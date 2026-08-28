import {
  spawnSync
} from 'node:child_process';

import {
  readdirSync,
  statSync
} from 'node:fs';

import {
  join,
  resolve,
  relative
} from 'node:path';

import {
  fileURLToPath
} from 'node:url';


// Единый runner проверок: quick для рабочего цикла, normal для совместимости verify, full для закрывающих gates.

export const VERIFICATION_MODES =
  Object.freeze({
    QUICK:
      'quick',
    NORMAL:
      'normal',
    FULL:
      'full',
    JS_ONLY:
      'js-only'
  });

const SUPPORTED_MODES =
  new Set(
    Object.values(
      VERIFICATION_MODES
    )
  );

const STEP_DEFINITIONS =
  Object.freeze({
    encoding:
      commandStep(
        'encoding',
        process.execPath,
        [
          'tools/check_text_encoding.mjs'
        ]
      ),
    jsSyntax:
      Object.freeze({
        id:
          'js-syntax',
        kind:
          'js-syntax'
      }),
    importPaths:
      commandStep(
        'import-paths',
        process.execPath,
        [
          'tools/check_import_paths.mjs'
        ]
      ),
    uiPolish:
      commandStep(
        'ui-polish-audit',
        process.execPath,
        [
          'tools/audit_ui_polish.mjs'
        ]
      ),
    unitTests:
      commandStep(
        'unit-tests',
        process.execPath,
        [
          '--test',
          'tests/*.test.mjs'
        ]
      ),
    largeWorkspace:
      commandStep(
        'large-workspace-performance',
        process.execPath,
        [
          'tools/run_large_workspace_performance_smoke.mjs'
        ]
      ),
    gitDiff:
      commandStep(
        'git-diff-check',
        'git',
        [
          'diff',
          '--check'
        ]
      ),
    manualDocx:
      commandStep(
        'manual-docx-zip',
        'python',
        [
          '-m',
          'zipfile',
          '-t',
          'docs/MY_OWN_WORLD_FULL_MANUAL.docx'
        ]
      ),
    browserSmoke:
      commandStep(
        'browser-smoke',
        process.execPath,
        [
          'tools/run_browser_smoke.mjs'
        ]
      ),
    projectFileAudit:
      commandStep(
        'project-file-audit',
        process.execPath,
        [
          'tools/audit_project_files.mjs'
        ]
      ),
    docsIndex:
      commandStep(
        'docs-index',
        process.execPath,
        [
          'tools/docs_index.mjs'
        ]
      ),
    agentSkills:
      commandStep(
        'agent-skills',
        process.execPath,
        [
          'tools/validate_agent_skills.mjs'
        ]
      ),
    agentTasks:
      commandStep(
        'agent-tasks',
        process.execPath,
        [
          'tools/validate_agent_tasks.mjs'
        ]
      )
  });


export function parseVerificationMode(
  args = []
) {

  if (
    args.includes(
      '--js-only'
    )
  ) {

    return VERIFICATION_MODES.JS_ONLY;
  }

  const modeFlagIndex =
    args.indexOf(
      '--mode'
    );

  if (modeFlagIndex === -1) {

    return VERIFICATION_MODES.NORMAL;
  }

  const mode =
    args[modeFlagIndex + 1];

  if (
    !SUPPORTED_MODES.has(
      mode
    ) ||
    mode === VERIFICATION_MODES.JS_ONLY
  ) {

    throw new Error(
      `Unsupported verification mode: ${mode || '<missing>'}`
    );
  }

  return mode;
}


export function getVerificationSteps(
  mode = VERIFICATION_MODES.NORMAL
) {

  if (
    !SUPPORTED_MODES.has(
      mode
    )
  ) {

    throw new Error(
      `Unsupported verification mode: ${mode}`
    );
  }

  if (mode === VERIFICATION_MODES.QUICK) {

    return [
      STEP_DEFINITIONS.encoding,
      STEP_DEFINITIONS.jsSyntax,
      STEP_DEFINITIONS.importPaths,
      STEP_DEFINITIONS.unitTests,
      STEP_DEFINITIONS.gitDiff
    ];
  }

  if (mode === VERIFICATION_MODES.JS_ONLY) {

    return [
      STEP_DEFINITIONS.encoding,
      STEP_DEFINITIONS.jsSyntax,
      STEP_DEFINITIONS.importPaths,
      STEP_DEFINITIONS.uiPolish
    ];
  }

  const normalSteps =
    [
      STEP_DEFINITIONS.encoding,
      STEP_DEFINITIONS.jsSyntax,
      STEP_DEFINITIONS.importPaths,
      STEP_DEFINITIONS.uiPolish,
      STEP_DEFINITIONS.unitTests,
      STEP_DEFINITIONS.largeWorkspace,
      STEP_DEFINITIONS.gitDiff,
      STEP_DEFINITIONS.manualDocx
    ];

  if (mode === VERIFICATION_MODES.NORMAL) {

    return normalSteps;
  }

  return [
    ...normalSteps,
    STEP_DEFINITIONS.browserSmoke,
    STEP_DEFINITIONS.projectFileAudit,
    STEP_DEFINITIONS.docsIndex,
    STEP_DEFINITIONS.agentSkills,
    STEP_DEFINITIONS.agentTasks,
    STEP_DEFINITIONS.gitDiff
  ];
}


export function runCli(
  args = [],
  {
    root =
      process.cwd()
  } = {}
) {

  const mode =
    parseVerificationMode(
      args
    );

  for (const step of getVerificationSteps(mode)) {

    runStep(
      step,
      root
    );
  }
}


function commandStep(
  id,
  command,
  args
) {

  return Object.freeze({
    id,
    command,
    args:
      Object.freeze(
        [...args]
      )
  });
}


function runStep(
  step,
  root
) {

  if (step.kind === 'js-syntax') {

    checkJavaScriptSyntax(
      root
    );

    return;
  }

  run(
    step.command,
    step.args,
    root
  );
}


function run(
  command,
  args,
  root
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


function checkJavaScriptSyntax(
  root
) {

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
      ],
      root
    );
  });
}


if (
  process.argv[1] &&
  resolve(
    process.argv[1]
  ) === fileURLToPath(
    import.meta.url
  )
) {

  try {

    runCli(
      process.argv.slice(
        2
      )
    );

  } catch (error) {

    console.error(
      error.message
    );

    process.exit(
      1
    );
  }
}
