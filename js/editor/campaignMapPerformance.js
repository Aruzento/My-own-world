export const CAMPAIGN_MAP_PERFORMANCE_BUDGETS =
  Object.freeze({
    renderTimeMs: 16.7,
    syncTimeMs: 8,
    fullSyncTimeMs: 80,
    backgroundLoadMs: 1000,
    visibleTokenCount: 200,
    visibleShapeCount: 100,
    fogCanvasPixels: 8_000_000
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
