import {
  createCampaignMapPerformanceReport,
  shouldShowCampaignMapPerformanceDiagnostics
} from './campaignMapPerformance.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';


// Dev-only панель. В обычном интерфейсе она не появляется, чтобы не шуметь игроку.
export function renderCampaignMapPerformanceDiagnostics(
  map,
  measurements = {}
) {

  if (
    !map ||
    !shouldShowCampaignMapPerformanceDiagnostics()
  ) {

    removeCampaignMapPerformanceDiagnostics(
      map
    );

    return null;
  }

  const store =
    getCampaignMapStore(
      map
    );

  const report =
    createCampaignMapPerformanceReport({
      scenarioId:
        'custom',
      modelData:
        store?.getModel().toJSON() || {},
      measurements
    });

  const panel =
    map.querySelector('.campaign-map-performance-diagnostics') ||
    document.createElement('div');

  panel.className =
    'campaign-map-performance-diagnostics';

  panel.dataset.runtime =
    'true';

  panel.innerHTML =
    `
      <strong>Performance</strong>
      <span>tokens: ${report.snapshot.visibleTokenCount}</span>
      <span>shapes: ${report.snapshot.visibleShapeCount}</span>
      <span>fog: ${report.snapshot.fogCanvasPixels}px</span>
      <span>warnings: ${report.warnings.length}</span>
    `;

  if (!panel.parentElement) {

    map.appendChild(
      panel
    );
  }

  return report;
}


export function removeCampaignMapPerformanceDiagnostics(
  map
) {

  map
    ?.querySelector('.campaign-map-performance-diagnostics')
    ?.remove();
}
