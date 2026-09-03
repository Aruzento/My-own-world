import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises';
import {
  tmpdir
} from 'node:os';
import path from 'node:path';
import {
  spawnSync
} from 'node:child_process';
import {
  fileURLToPath
} from 'node:url';

import {
  getVerificationSteps,
  parseVerificationMode,
  VERIFICATION_MODES
} from '../tools/run_checks.mjs';


const AGENT_SKILL_VALIDATOR_PATH =
  fileURLToPath(
    new URL(
      '../tools/validate_agent_skills.mjs',
      import.meta.url
    )
  );


test(
  'quick verification gate stays focused on fast implementation checks',
  () => {

    assert.deepEqual(
      stepIds(
        VERIFICATION_MODES.QUICK
      ),
      [
        'encoding',
        'js-syntax',
        'import-paths',
        'unit-tests',
        'git-diff-check'
      ]
    );
  }
);


test(
  'normal verification gate preserves the existing npm verify behavior',
  () => {

    assert.deepEqual(
      stepIds(
        VERIFICATION_MODES.NORMAL
      ),
      [
        'encoding',
        'js-syntax',
        'import-paths',
        'ui-polish-audit',
        'unit-tests',
        'large-workspace-performance',
        'git-diff-check',
        'manual-docx-zip'
      ]
    );

    assert.equal(
      parseVerificationMode(
        []
      ),
      VERIFICATION_MODES.NORMAL
    );
  }
);


test(
  'full verification gate adds generic repository gates without desktop release checks',
  () => {

    const ids =
      stepIds(
        VERIFICATION_MODES.FULL
      );

    assert.deepEqual(
      ids.slice(
        0,
        8
      ),
      stepIds(
        VERIFICATION_MODES.NORMAL
      )
    );

    assert.deepEqual(
      ids.slice(
        8
      ),
      [
        'browser-smoke',
        'project-file-audit',
        'docs-index',
        'agent-skills',
        'agent-tasks',
        'git-diff-check'
      ]
    );

    assert.equal(
      ids.some(id =>
        id.includes(
          'desktop'
        )
      ),
      false
    );
  }
);


test(
  'legacy js-only gate remains available for the existing check:js script',
  () => {

    assert.equal(
      parseVerificationMode(
        [
          '--js-only'
        ]
      ),
      VERIFICATION_MODES.JS_ONLY
    );

    assert.deepEqual(
      stepIds(
        VERIFICATION_MODES.JS_ONLY
      ),
      [
        'encoding',
        'js-syntax',
        'import-paths',
        'ui-polish-audit'
      ]
    );
  }
);


test(
  'package scripts expose quick normal and full verification gates',
  async () => {

    const packageJson =
      JSON.parse(
        await readFile(
          'package.json',
          'utf8'
        )
      );

    assert.equal(
      packageJson.scripts['verify:quick'],
      'node tools/run_checks.mjs --mode quick'
    );

    assert.equal(
      packageJson.scripts.verify,
      'node tools/run_checks.mjs'
    );

    assert.equal(
      packageJson.scripts['verify:full'],
      'node tools/run_checks.mjs --mode full'
    );
  }
);


test(
  'unknown verification mode is rejected clearly',
  () => {

    assert.throws(
      () =>
        parseVerificationMode(
          [
            '--mode',
            'desktop'
          ]
        ),
      /Unsupported verification mode: desktop/
    );
  }
);


test(
  'agent skill validator parses LF and CRLF front matter identically',
  async t => {

    const lines =
      [
        '---',
        'name: fixture-skill',
        'description: "Valid fixture description."',
        '---',
        '',
        '# Fixture Skill',
        ''
      ];

    const lfRoot =
      await createSkillFixture(
        t,
        lines.join(
          '\n'
        )
      );

    const crlfRoot =
      await createSkillFixture(
        t,
        lines.join(
          '\r\n'
        )
      );

    const lfResult =
      runAgentSkillValidator(
        lfRoot
      );

    const crlfResult =
      runAgentSkillValidator(
        crlfRoot
      );

    assert.equal(
      lfResult.status,
      0,
      lfResult.stderr
    );

    assert.equal(
      crlfResult.status,
      0,
      crlfResult.stderr
    );

    assert.equal(
      crlfResult.stdout,
      lfResult.stdout
    );
  }
);


test(
  'agent skill validator keeps malformed metadata rejections',
  async t => {

    const malformedRoot =
      await createSkillFixture(
        t,
        '# Missing front matter\n'
      );

    const missingDescriptionRoot =
      await createSkillFixture(
        t,
        [
          '---',
          'name: fixture-skill',
          '---',
          ''
        ].join(
          '\n'
        )
      );

    const malformedResult =
      runAgentSkillValidator(
        malformedRoot
      );

    const missingDescriptionResult =
      runAgentSkillValidator(
        missingDescriptionRoot
      );

    assert.notEqual(
      malformedResult.status,
      0
    );

    assert.match(
      malformedResult.stderr,
      /missing YAML front matter/
    );

    assert.notEqual(
      missingDescriptionResult.status,
      0
    );

    assert.match(
      missingDescriptionResult.stderr,
      /missing description/
    );
  }
);


function stepIds(
  mode
) {

  return getVerificationSteps(
    mode
  ).map(step =>
    step.id
  );
}


async function createSkillFixture(
  t,
  content
) {

  const root =
    await mkdtemp(
      path.join(
        tmpdir(),
        'mow-agent-skill-validator-'
      )
    );

  const skillDirectory =
    path.join(
      root,
      '.agents',
      'skills',
      'fixture-skill'
    );

  await mkdir(
    skillDirectory,
    {
      recursive: true
    }
  );

  await writeFile(
    path.join(
      skillDirectory,
      'SKILL.md'
    ),
    content,
    'utf8'
  );

  t.after(
    () => rm(
      root,
      {
        recursive: true,
        force: true
      }
    )
  );

  return root;
}


function runAgentSkillValidator(
  root
) {

  return spawnSync(
    process.execPath,
    [
      AGENT_SKILL_VALIDATOR_PATH
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  );
}
