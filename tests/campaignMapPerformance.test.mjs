import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAMPAIGN_MAP_PERFORMANCE_BUDGETS,
  createCampaignMapPerformanceSnapshot,
  findCampaignMapBudgetWarnings
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
