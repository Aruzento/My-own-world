export const CAMPAIGN_MAP_PERFORMANCE_BUDGETS =
  Object.freeze({
    renderTimeMs: 16.7,
    syncTimeMs: 8,
    deltaSyncTimeMs: 16,
    fullSyncTimeMs: 80,
    fogDrawTimeMs: 6,
    backgroundLoadMs: 1000,
    visibleTokenCount: 200,
    visibleShapeCount: 100,
    fogCanvasPixels: 8_000_000,
    dirtyFogRegionCount: 120
  });

export const CAMPAIGN_MAP_PERFORMANCE_SCENARIOS =
  Object.freeze({
    smallMapBaseline: {
      id: 'small-map-baseline',
      budgets: {
        renderTimeMs: 16.7,
        syncTimeMs: 8,
        visibleTokenCount: 50,
        visibleShapeCount: 25
      }
    },
    largeMapDrag: {
      id: 'large-map-drag',
      budgets: {
        syncTimeMs: 16,
        visibleTokenCount: 250,
        visibleShapeCount: 120
      }
    },
    fogPaintLarge: {
      id: 'fog-paint-large',
      budgets: {
        fogDrawTimeMs: 80,
        fogCanvasPixels: 8_000_000,
        dirtyFogRegionCount: 160
      }
    },
    presentationLiveSync: {
      id: 'presentation-live-sync',
      budgets: {
        fullSyncTimeMs: 1000,
        deltaSyncTimeMs: 24,
        syncTimeMs: 50,
        visibleTokenCount: 250,
        visibleShapeCount: 120
      }
    },
    desktopPresentationLargeWorkspace: {
      id: 'desktop-presentation-large-workspace',
      budgets: {
        fullSyncTimeMs: 1200,
        deltaSyncTimeMs: 32,
        backgroundLoadMs: 1200,
        visibleTokenCount: 300,
        visibleShapeCount: 160,
        fogCanvasPixels: 8_000_000
      }
    },
    zoomPanHeavy: {
      id: 'zoom-pan-heavy',
      budgets: {
        renderTimeMs: 24,
        syncTimeMs: 16
      }
    }
  });


// Snapshot хранит дешевые метрики карты, которые можно сравнивать в тестах и diagnostics UI.
export function createCampaignMapPerformanceSnapshot(
  modelData = {},
  measurements = {}
) {

  const tokens =
    Array.isArray(
      modelData.tokens
    )
      ? modelData.tokens
      : [];

  const shapes =
    Array.isArray(
      modelData.shapes
    )
      ? modelData.shapes
      : [];

  const fog =
    modelData.fog || {};

  return {
    renderTimeMs:
      normalizeMetric(
        measurements.renderTimeMs
      ),
    syncTimeMs:
      normalizeMetric(
        measurements.syncTimeMs
      ),
    fullSyncTimeMs:
      normalizeMetric(
        measurements.fullSyncTimeMs
      ),
    deltaSyncTimeMs:
      normalizeMetric(
        measurements.deltaSyncTimeMs
      ),
    fogDrawTimeMs:
      normalizeMetric(
        measurements.fogDrawTimeMs
      ),
    backgroundLoadMs:
      normalizeMetric(
        measurements.backgroundLoadMs
      ),
    visibleTokenCount:
      tokens.filter(isVisibleMapItem).length,
    visibleShapeCount:
      shapes.filter(isVisibleMapItem).length,
    hiddenTokenCount:
      tokens.filter(isHiddenMapItem).length,
    hiddenShapeCount:
      shapes.filter(isHiddenMapItem).length,
    fogCanvasPixels:
      normalizeMetric(
        measurements.fogCanvasPixels || fog.canvasPixels
      ),
    dirtyFogRegionCount:
      normalizeMetric(
        measurements.dirtyFogRegionCount || fog.dirtyRegionCount
      ),
    zoom:
      normalizeMetric(
        modelData.view?.zoom,
        1
      )
  };
}


export function findCampaignMapBudgetWarnings(
  snapshot,
  budgets = CAMPAIGN_MAP_PERFORMANCE_BUDGETS
) {

  return Object
    .entries(budgets)
    .filter(([metric, budget]) =>
      Number.isFinite(
        snapshot?.[metric]
      ) &&
      snapshot[metric] > budget
    )
    .map(([metric, budget]) => ({
      metric,
      value:
        snapshot[metric],
      budget
    }));
}


export function getCampaignMapScenarioBudgets(
  scenarioId
) {

  return CAMPAIGN_MAP_PERFORMANCE_SCENARIOS[scenarioId]?.budgets ||
    CAMPAIGN_MAP_PERFORMANCE_BUDGETS;
}


export function createCampaignMapPerformanceReport({
  scenarioId = 'custom',
  modelData = {},
  measurements = {},
  budgets = getCampaignMapScenarioBudgets(
    scenarioId
  )
} = {}) {

  const snapshot =
    createCampaignMapPerformanceSnapshot(
      modelData,
      measurements
    );

  const warnings =
    findCampaignMapBudgetWarnings(
      snapshot,
      budgets
    );

  return {
    scenarioId,
    ok:
      warnings.length === 0,
    snapshot,
    budgets,
    warnings
  };
}


export function assertCampaignMapPerformanceBudget(
  report
) {

  if (report?.ok) return report;

  const summary =
    (report?.warnings || [])
      .map(warning =>
        `${warning.metric}: ${warning.value} > ${warning.budget}`
      )
      .join(', ');

  throw new Error(
    `Campaign map performance budget exceeded (${report?.scenarioId || 'custom'}): ${summary}`
  );
}


export function shouldShowCampaignMapPerformanceDiagnostics() {

  return globalThis.localStorage?.getItem(
    'myOwnWorld.debug.performance'
  ) === 'true';
}


function isVisibleMapItem(
  item
) {

  return !isHiddenMapItem(
    item
  );
}


function isHiddenMapItem(
  item
) {

  return item?.presentationHidden === true;
}


function normalizeMetric(
  value,
  fallback = 0
) {

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}
