import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NATIVE_SMOKE_RUNTIME_ALLOWLIST,
  createMarkdownReport,
  getNativeSmokeStatus
} from '../tools/run_desktop_native_clickthrough.mjs';


function createReport(
  overrides =
    {}
) {

  return {
    runStartedAt:
      new Date('2026-08-11T00:00:00.000Z'),
    workspacePath:
      'C:\\test-workspace',
    exePath:
      'C:\\app\\my-own-world.exe',
    steps:
      [
        {
          name:
            'open native app',
          ok:
            true,
          durationMs:
            10
        }
      ],
    metrics:
      {},
    targets:
      {
        heavyMaps:
          []
      },
    consoleErrors:
      [],
    pageErrors:
      [],
    resourceIssues:
      [],
    ...overrides
  };
}


test(
  'desktop native smoke status passes a clean run',
  () => {

    const status =
      getNativeSmokeStatus(
        createReport()
      );

    assert.equal(
      status.ok,
      true
    );

    assert.deepEqual(
      status.runtimeIssues,
      []
    );
  }
);


test(
  'desktop native smoke status fails on unexpected page errors',
  () => {

    const status =
      getNativeSmokeStatus(
        createReport({
          pageErrors:
            [
              'Cannot read properties of undefined'
            ]
        })
      );

    assert.equal(
      status.ok,
      false
    );

    assert.equal(
      status.runtimeIssues[0].source,
      'pageerror'
    );
  }
);


test(
  'desktop native smoke status fails on unexpected console errors',
  () => {

    const status =
      getNativeSmokeStatus(
        createReport({
          consoleErrors:
            [
              {
                type:
                  'error',
                text:
                  'Failed to initialize campaign map'
              }
            ]
        })
      );

    assert.equal(
      status.ok,
      false
    );

    assert.equal(
      status.runtimeIssues[0].source,
      'console'
    );
  }
);


test(
  'desktop native smoke keeps console warnings diagnostic instead of fatal',
  () => {

    const status =
      getNativeSmokeStatus(
        createReport({
          consoleErrors:
            [
              {
                type:
                  'warning',
                text:
                  'Workspace schema: schema issues found: 2'
              }
            ]
        })
      );

    assert.equal(
      status.ok,
      true
    );

    assert.equal(
      status.diagnosticConsoleWarnings.length,
      1
    );
  }
);


test(
  'desktop native smoke status allows an exact documented harmless runtime event',
  () => {

    const allowlisted =
      NATIVE_SMOKE_RUNTIME_ALLOWLIST[0];

    const status =
      getNativeSmokeStatus(
        createReport({
          pageErrors:
            [
              allowlisted.text
            ]
        })
      );

    assert.equal(
      allowlisted.source,
      'pageerror'
    );

    assert.match(
      allowlisted.reason,
      /Chromium/
    );

    assert.equal(
      status.ok,
      true
    );

    assert.equal(
      status.allowlistedRuntimeEvents.length,
      1
    );
  }
);


test(
  'desktop native markdown report marks unexpected runtime errors as failed',
  () => {

    const report =
      createReport({
        consoleErrors:
          [
            {
              type:
                'error',
              text:
                'Renderer crashed'
            }
          ]
      });

    const markdown =
      createMarkdownReport(
        report
      );

    assert.match(
      markdown,
      /Status: failed/
    );

    assert.match(
      markdown,
      /Unexpected Runtime Errors/
    );
  }
);


test(
  'desktop native markdown report records image-card and map asset coverage',
  () => {

    const markdown =
      createMarkdownReport(
        createReport({
          targets:
            {
              cards:
                [],
              imageCards:
                [
                  {
                    title:
                      'Portrait Card',
                    file:
                      'portrait-card.md',
                    sizeBytes:
                      2048,
                    tokens:
                      0,
                    shapes:
                      0,
                    fogZones:
                      0,
                    imageCount:
                      1,
                    imageAssets:
                      [
                        'portraits/hero.png'
                      ]
                  }
                ],
              heavyMaps:
                [
                  {
                    title:
                      'Loaded Map',
                    file:
                      'loaded-map.md',
                    sizeBytes:
                      4096,
                    tokens:
                      2,
                    shapes:
                      1,
                    fogZones:
                      0,
                    imageCount:
                      0,
                    imageAssets:
                      [],
                    mapAsset:
                      'maps/castle.png'
                  }
                ]
            }
        })
      );

    assert.match(
      markdown,
      /Plan ref: `0\.0\.1\.11\.5`/
    );

    assert.match(
      markdown,
      /### Image Cards/
    );

    assert.match(
      markdown,
      /images: 1, image assets: 1/
    );

    assert.match(
      markdown,
      /map asset: `maps\/castle\.png`/
    );
  }
);
