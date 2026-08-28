import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readFile
} from 'node:fs/promises';

import {
  getVerificationSteps,
  parseVerificationMode,
  VERIFICATION_MODES
} from '../tools/run_checks.mjs';


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


function stepIds(
  mode
) {

  return getVerificationSteps(
    mode
  ).map(step =>
    step.id
  );
}
