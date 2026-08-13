import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


const VISUAL_POLICY_DOC_PATH =
  'docs/03-testing/VISUAL_REGRESSION.md';

const UI_BASELINE_DOC_PATH =
  'docs/02-architecture/ui/UI_MIGRATION_BASELINES.md';

const VISUAL_SPEC_PATH =
  'tests/browser/visual-regression.spec.mjs';

const STRICT_PIXEL_MATCHER_PATTERN =
  /\b(?:toHaveScreenshot|toMatchSnapshot)\s*\(|\bpixelmatch\b/;


test(
  'visual evidence policy does not overstate strict pixel coverage',
  async () => {

    const [
      policyDoc,
      baselineDoc,
      visualSpec
    ] = await Promise.all([
      readFile(
        VISUAL_POLICY_DOC_PATH,
        'utf8'
      ),
      readFile(
        UI_BASELINE_DOC_PATH,
        'utf8'
      ),
      readFile(
        VISUAL_SPEC_PATH,
        'utf8'
      )
    ]);

    assert.match(
      policyDoc,
      /Current policy:\s*`EVIDENCE SMOKE`, not `STRICT PIXEL BASELINE`/,
      'visual testing policy must name the current guarantee exactly'
    );

    for (const requiredSection of [
      'Structured Browser UI Regression',
      'Screenshot Evidence',
      'Human Visual Review',
      'Strict Pixel Regression'
    ]) {

      assert.match(
        policyDoc,
        new RegExp(requiredSection),
        `${VISUAL_POLICY_DOC_PATH} must distinguish ${requiredSection}`
      );
    }

    assert.doesNotMatch(
      visualSpec,
      STRICT_PIXEL_MATCHER_PATTERN,
      `${VISUAL_SPEC_PATH} must not use strict pixel snapshot tooling while the policy says evidence smoke`
    );

    assert.match(
      baselineDoc,
      /evidence smoke/i,
      `${UI_BASELINE_DOC_PATH} must describe screenshot baselines as evidence smoke`
    );

    assert.match(
      baselineDoc,
      /not automatically pixel-compare/i,
      `${UI_BASELINE_DOC_PATH} must not imply automatic pixel comparison`
    );
  }
);
