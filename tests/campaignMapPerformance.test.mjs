import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCampaignMapPerformanceBudget,
  CAMPAIGN_MAP_PERFORMANCE_BUDGETS,
  CAMPAIGN_MAP_PERFORMANCE_SCENARIOS,
  createCampaignMapPerformanceReport,
  createCampaignMapPerformanceSnapshot,
  findCampaignMapBudgetWarnings,
  getCampaignMapScenarioBudgets
} from '../js/editor/campaignMapPerformance.js';


test(
  'campaign map performance snapshot считает видимые и скрытые сущности',
  () => {

    const snapshot =
      createCampaignMapPerformanceSnapshot({
        tokens: [
          {
            tokenId: 'a'
          },
          {
            tokenId: 'b',
            presentationHidden: true
          }
        ],
        shapes: [
          {
            shapeId: 's1'
          },
          {
            shapeId: 's2',
            presentationHidden: true
          }
        ],
        view: {
          zoom: 2
        },
        fog: {
          canvasPixels: 500
        }
      });

    assert.equal(
      snapshot.visibleTokenCount,
      1
    );

    assert.equal(
      snapshot.hiddenTokenCount,
      1
    );

    assert.equal(
      snapshot.visibleShapeCount,
      1
    );

    assert.equal(
      snapshot.hiddenShapeCount,
      1
    );

    assert.equal(
      snapshot.zoom,
      2
    );

    assert.equal(
      snapshot.dirtyFogRegionCount,
      0
    );
  }
);


test(
  'campaign map performance warnings показывают превышенные budgets',
  () => {

    const warnings =
      findCampaignMapBudgetWarnings(
        {
          renderTimeMs:
            CAMPAIGN_MAP_PERFORMANCE_BUDGETS.renderTimeMs + 1,
          syncTimeMs:
            1,
          visibleTokenCount:
            CAMPAIGN_MAP_PERFORMANCE_BUDGETS.visibleTokenCount + 10
        }
      );

    assert.deepEqual(
      warnings.map(warning => warning.metric),
      [
        'renderTimeMs',
        'visibleTokenCount'
      ]
    );
  }
);


test(
  'campaign map performance scenarios задают обязательные budgets',
  () => {

    assert.ok(
      CAMPAIGN_MAP_PERFORMANCE_SCENARIOS.fogPaintLarge
    );

    assert.equal(
      getCampaignMapScenarioBudgets(
        'fogPaintLarge'
      ).fogDrawTimeMs,
      80
    );
  }
);


test(
  'campaign map performance report падает при превышении scenario budget',
  () => {

    const report =
      createCampaignMapPerformanceReport({
        scenarioId:
          'fogPaintLarge',
        measurements: {
          fogDrawTimeMs:
            120,
          dirtyFogRegionCount:
            10,
          fogCanvasPixels:
            100
        }
      });

    assert.equal(
      report.ok,
      false
    );

    assert.throws(
      () => assertCampaignMapPerformanceBudget(
        report
      ),
      /fogDrawTimeMs/
    );
  }
);
test(
  'desktop presentation scenario separates full render and delta sync budgets',
  () => {

    const budgets =
      getCampaignMapScenarioBudgets(
        'desktopPresentationLargeWorkspace'
      );

    assert.equal(
      budgets.deltaSyncTimeMs,
      32
    );

    const report =
      createCampaignMapPerformanceReport({
        scenarioId:
          'desktopPresentationLargeWorkspace',
        modelData: {
          tokens:
            Array.from(
              {
                length: 240
              },
              (_, index) => ({
                tokenId: `token-${index}`
              })
            ),
          shapes:
            Array.from(
              {
                length: 120
              },
              (_, index) => ({
                shapeId: `shape-${index}`
              })
            ),
          fog: {
            canvasPixels:
              6_500_000
          }
        },
        measurements: {
          fullSyncTimeMs:
            900,
          deltaSyncTimeMs:
            18,
          backgroundLoadMs:
            900
        }
      });

    assert.equal(
      report.ok,
      true
    );

    const failedReport =
      createCampaignMapPerformanceReport({
        scenarioId:
          'desktopPresentationLargeWorkspace',
        measurements: {
          deltaSyncTimeMs:
            64
        }
      });

    assert.throws(
      () => assertCampaignMapPerformanceBudget(
        failedReport
      ),
      /deltaSyncTimeMs/
    );
  }
);
