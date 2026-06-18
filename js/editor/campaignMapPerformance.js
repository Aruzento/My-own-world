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
    layerCount: 8,
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
    largeMapStress: {
      id: 'large-map-stress',
      budgets: {
        renderTimeMs: 1500,
        syncTimeMs: 32,
        visibleTokenCount: 320,
        visibleShapeCount: 180,
        layerCount: 12,
        fogCanvasPixels: 8_000_000,
        dirtyFogRegionCount: 240
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
    fogPointerPaintStress: {
      id: 'fog-pointer-paint-stress',
      budgets: {
        fogDrawTimeMs: 2000,
        fogCanvasPixels: 8_000_000,
        dirtyFogRegionCount: 220
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

  const layers =
    Array.isArray(
      modelData.layers
    )
      ? modelData.layers
      : [];

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
    layerCount:
      layers.length,
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


export function createCampaignMapStressModelData({
  tokenCount = 260,
  shapeCount = 120,
  layerCount = 10,
  dirtyFogRegionCount = 180,
  fogCanvasPixels = 6_500_000
} = {}) {

  const layers =
    Array.from(
      {
        length:
          Math.max(
            1,
            layerCount
          )
      },
      (_, index) =>
        createStressLayer(
          index
        )
    );

  const tokens =
    Array.from(
      {
        length:
          Math.max(
            0,
            tokenCount
          )
      },
      (_, index) => ({
        tokenId:
          `stress-token-${index}`,
        pageId:
          `stress-page-${index}`,
        type:
          index % 5 === 0
            ? 'object'
            : 'creature',
        name:
          `Stress Token ${index + 1}`,
        x:
          40 + (index % 26) * 44,
        y:
          56 + Math.floor(index / 26) * 44,
        size:
          index % 7 === 0
            ? 2
            : 1,
        rotation:
          (index % 8) * 45,
        layerId:
          layers[index % layers.length]?.layerId,
        zIndex:
          20 + index,
        presentationHidden:
          false
      })
    );

  const shapes =
    Array.from(
      {
        length:
          Math.max(
            0,
            shapeCount
          )
      },
      (_, index) => ({
        shapeId:
          `stress-shape-${index}`,
        type:
          index % 3 === 0
            ? 'circle'
            : index % 3 === 1
              ? 'square'
              : 'line',
        x:
          120 + (index % 18) * 72,
        y:
          520 + Math.floor(index / 18) * 64,
        width:
          54 + (index % 4) * 12,
        height:
          54 + (index % 3) * 10,
        color:
          index % 2 === 0
            ? '#f59e0b'
            : '#38bdf8',
        layerId:
          layers[(index + 3) % layers.length]?.layerId,
        zIndex:
          100 + index,
        presentationHidden:
          false
      })
    );

  return {
    title:
      'Large Stress Map',
    version:
      1,
    grid: {
      enabled:
        true,
      size:
        48,
      color:
        'rgba(255,255,255,0.22)'
    },
    view: {
      zoom:
        1.1,
      x:
        -240,
      y:
        -160
    },
    fog: {
      enabled:
        true,
      mode:
        'draw',
      brushShape:
        'square',
      brushSize:
        96,
      canvasPixels:
        fogCanvasPixels,
      dirtyRegionCount:
        dirtyFogRegionCount,
      lockedZones:
        [
          {
            id:
              'stress-locked-zone-1',
            x:
              320,
            y:
              260,
            width:
              220,
            height:
              180,
            visible:
              true
          },
          {
            id:
              'stress-locked-zone-2',
            x:
              860,
            y:
              620,
            width:
              260,
            height:
              220,
            visible:
              true
          }
        ]
    },
    layers,
    tokens,
    shapes
  };
}


function createStressLayer(
  index
) {

  const defaults =
    [
      {
        layerId:
          'map-objects',
        title:
          'Objects',
        kind:
          'object',
        zIndex:
          20,
        visible:
          true,
        locked:
          false
      },
      {
        layerId:
          'map-creatures',
        title:
          'Creatures',
        kind:
          'creature',
        zIndex:
          40,
        visible:
          true,
        locked:
          false
      },
      {
        layerId:
          'map-shapes',
        title:
          'Shapes',
        kind:
          'shape',
        zIndex:
          80,
        visible:
          true,
        locked:
          false
      },
      {
        layerId:
          'map-fog',
        title:
          'Fog',
        kind:
          'fog',
        zIndex:
          120,
        visible:
          true,
        locked:
          true
      }
    ];

  if (defaults[index]) {

    return {
      ...defaults[index]
    };
  }

  return {
    layerId:
      `stress-layer-${index}`,
    title:
      `Stress Layer ${index + 1}`,
    kind:
      'custom',
    zIndex:
      140 + index * 20,
    visible:
      true,
    locked:
      false
  };
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
