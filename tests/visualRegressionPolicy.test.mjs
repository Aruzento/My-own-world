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

const POPUP_BASELINE_SPEC_PATH =
  'tests/browser/popup-visual-baselines.spec.mjs';

const STRICT_PIXEL_MATCHER_PATTERN =
  /\b(?:toHaveScreenshot|toMatchSnapshot)\s*\(|\bpixelmatch\b/;


test(
  'visual evidence policy does not overstate strict pixel coverage',
  async () => {

    const [
      policyDoc,
      baselineDoc,
      visualSpec,
      popupBaselineSpec
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
      ),
      readFile(
        POPUP_BASELINE_SPEC_PATH,
        'utf8'
      )
    ]);

    assert.match(
      policyDoc,
      /Current policy:\s*`EVIDENCE SMOKE` for the broad UI suite, with a narrow `APPROVED POPUP BASELINE` layer/,
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
      popupBaselineSpec,
      STRICT_PIXEL_MATCHER_PATTERN,
      `${POPUP_BASELINE_SPEC_PATH} must use Playwright screenshot assertions for approved popup baselines`
    );

    assert.match(
      popupBaselineSpec,
      /hasApprovedPopupSnapshot/,
      `${POPUP_BASELINE_SPEC_PATH} must guard screenshot assertions by an existing owner-approved platform snapshot`
    );

    assert.match(
      policyDoc,
      /Approved Popup Baselines/i,
      `${VISUAL_POLICY_DOC_PATH} must document the narrow approved popup baseline layer`
    );

    assert.match(
      policyDoc,
      /not a repository-wide `STRICT PIXEL BASELINE`/i,
      `${VISUAL_POLICY_DOC_PATH} must not present approved popup baselines as repository-wide strict visual policy`
    );

    assert.match(
      policyDoc,
      /visually approved by the owner on 2026-08-28/i,
      `${VISUAL_POLICY_DOC_PATH} must record the owner approval date for popup baselines`
    );

    assert.match(
      policyDoc,
      /chromium-win32/i,
      `${VISUAL_POLICY_DOC_PATH} must document the current approved popup snapshot platform`
    );

    assert.match(
      baselineDoc,
      /Linux CI therefore acts as popup lifecycle\/layout smoke/i,
      `${UI_BASELINE_DOC_PATH} must document non-approved-platform behavior`
    );

    for (const snapshotName of [
      'add-block-desktop',
      'add-block-constrained',
      'properties-desktop',
      'properties-constrained',
      'campaign-map-grid-desktop',
      'campaign-map-grid-constrained'
    ]) {

      assert.match(
        baselineDoc,
        new RegExp(snapshotName),
        `${UI_BASELINE_DOC_PATH} must list approved popup snapshot ${snapshotName}`
      );
    }

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
