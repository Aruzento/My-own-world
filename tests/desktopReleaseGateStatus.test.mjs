import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDesktopReleaseGateReport,
  getDesktopReleaseGateStatus,
  parseLargeWorkspaceAdvisoryWarnings
} from '../tools/run_desktop_release_gate.mjs';


function pass(
  name
) {

  return {
    name,
    ok:
      true,
    skipped:
      false,
    durationMs:
      10,
    detail:
      ''
  };
}


function fail(
  name,
  detail =
    'failed'
) {

  return {
    name,
    ok:
      false,
    skipped:
      false,
    durationMs:
      10,
    detail
  };
}


function skipped(
  name,
  detail =
    'skipped'
) {

  return {
    name,
    ok:
      null,
    skipped:
      true,
    durationMs:
      0,
    detail
  };
}


function baseResults(
  largeWorkspaceResult
) {

  return [
    pass(
      'desktop release handoff preflight'
    ),
    pass(
      'verify'
    ),
    largeWorkspaceResult
  ];
}


test(
  'desktop release gate reports normal-workspace-only confidence when large workspace is skipped',
  () => {

    const results =
      baseResults(
        skipped(
          'large workspace desktop smoke',
          'Skipped because no --workspace path or MOW_DESKTOP_RELEASE_WORKSPACE was provided.'
        )
      );

    const status =
      getDesktopReleaseGateStatus(
        results,
        {
          workspace:
            ''
        }
      );

    assert.equal(
      status.failed,
      false
    );

    assert.equal(
      status.confidenceLabel,
      'NORMAL_WORKSPACE_VALIDATED'
    );

    assert.equal(
      status.overallLabel,
      'PASSED - NORMAL WORKSPACE ONLY'
    );

    assert.equal(
      status.largeWorkspaceLabel,
      'SKIPPED'
    );
  }
);


test(
  'desktop release gate reports large workspace confidence when a workspace smoke passes',
  () => {

    const status =
      getDesktopReleaseGateStatus(
        baseResults(
          pass(
            'large workspace desktop smoke'
          )
        ),
        {
          workspace:
            'X:\\world'
        }
      );

    assert.equal(
      status.failed,
      false
    );

    assert.equal(
      status.confidenceLabel,
      'LARGE_WORKSPACE_VALIDATED'
    );

    assert.equal(
      status.largeWorkspaceLabel,
      'VALIDATED'
    );
  }
);


test(
  'desktop release gate fails when required large workspace path is unavailable',
  () => {

    const status =
      getDesktopReleaseGateStatus(
        baseResults(
          fail(
            'large workspace desktop smoke',
            'Workspace not found.'
          )
        ),
        {
          workspace:
            'X:\\missing'
        }
      );

    assert.equal(
      status.failed,
      true
    );

    assert.equal(
      status.confidenceLabel,
      'LARGE_WORKSPACE_BLOCKED_OR_FAILED'
    );

    assert.equal(
      status.largeWorkspaceLabel,
      'FAILED'
    );
  }
);


test(
  'desktop release gate keeps advisory warnings separate from hard failures',
  () => {

    const status =
      getDesktopReleaseGateStatus(
        baseResults({
          ...pass(
            'large workspace desktop smoke'
          ),
          advisoryWarnings:
            [
              'large-assets (2): Review large image payloads.'
            ]
        }),
        {
          workspace:
            'X:\\world'
        }
      );

    assert.equal(
      status.failed,
      false
    );

    assert.equal(
      status.confidenceLabel,
      'LARGE_WORKSPACE_VALIDATED'
    );

    assert.equal(
      status.overallLabel,
      'PASSED - ADVISORY WARNINGS'
    );

    assert.deepEqual(
      status.advisoryWarnings,
      [
        'large-assets (2): Review large image payloads.'
      ]
    );
  }
);


test(
  'desktop release gate reports actual hard failures as failed',
  () => {

    const status =
      getDesktopReleaseGateStatus(
        [
          pass(
            'desktop release handoff preflight'
          ),
          fail(
            'verify',
            'tests failed'
          ),
          skipped(
            'large workspace desktop smoke',
            'Skipped because an earlier release gate step failed.'
          )
        ],
        {
          workspace:
            'X:\\world'
        }
      );

    assert.equal(
      status.failed,
      true
    );

    assert.equal(
      status.normalWorkspaceLabel,
      'FAILED'
    );

    assert.equal(
      status.confidenceLabel,
      'LARGE_WORKSPACE_BLOCKED_OR_FAILED'
    );
  }
);


test(
  'desktop release gate ignores stale advisory warnings on failed large workspace smoke',
  () => {

    const status =
      getDesktopReleaseGateStatus(
        baseResults({
          ...fail(
            'large workspace desktop smoke',
            'Workspace not found.'
          ),
          advisoryWarnings:
            [
              'stale-warning: from previous report'
            ]
        }),
        {
          workspace:
            'X:\\missing'
        }
      );

    assert.equal(
      status.failed,
      true
    );

    assert.deepEqual(
      status.advisoryWarnings,
      []
    );
  }
);


test(
  'desktop release gate report states confidence explicitly',
  () => {

    const results =
      baseResults(
        skipped(
          'large workspace desktop smoke'
        )
      );

    const status =
      getDesktopReleaseGateStatus(
        results
      );

    const markdown =
      createDesktopReleaseGateReport({
        startedAt:
          new Date('2026-08-11T00:00:00.000Z'),
        finishedAt:
          new Date('2026-08-11T00:01:00.000Z'),
        workspace:
          '',
        results,
        skipped:
          results.filter(result => result.skipped),
        status
      }).join('\n');

    assert.match(
      markdown,
      /Overall: PASSED - NORMAL WORKSPACE ONLY/
    );

    assert.match(
      markdown,
      /Confidence: NORMAL_WORKSPACE_VALIDATED/
    );

    assert.match(
      markdown,
      /Large workspace validation: SKIPPED/
    );
  }
);


test(
  'desktop release gate parses advisory warnings from the large workspace report',
  () => {

    const warnings =
      parseLargeWorkspaceAdvisoryWarnings(
        [
          '## Manual Native Targets',
          '',
          '### Diagnostics Warnings',
          '',
          '- large-assets (2): Review images.',
          '- schema-warning (1): Review pages.',
          '',
          '## Tree Probe Summary'
        ].join('\n')
      );

    assert.deepEqual(
      warnings,
      [
        'large-assets (2): Review images.',
        'schema-warning (1): Review pages.'
      ]
    );
  }
);
