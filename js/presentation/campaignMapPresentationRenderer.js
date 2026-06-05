import {
  canShowPresentationItem
} from './campaignMapPresentationPrivacy.js';


const WORLD_WIDTH =
  4096;

const WORLD_HEIGHT =
  4096;


// Desktop-презентация рендерит карту из модели, чтобы не зависеть от HTML-снимка окна мастера.
export function renderCampaignMapPresentationModel(
  root,
  payload
) {

  if (!root || !payload?.model) return;

  const model =
    payload.model;

  root.replaceChildren(
    createStage(
      model,
      payload
    )
  );
}


export function applyCampaignMapPresentationPatch(
  root,
  payload
) {

  if (!root || !payload) return false;

  if (payload.type === 'update-items') {

    return updatePresentationItems(
      root,
      payload
    );
  }

  if (payload.type === 'update-fog') {

    return updatePresentationFog(
      root,
      payload
    );
  }

  if (payload.type === 'drag-measure') {

    return renderPresentationDragMeasure(
      root,
      payload.measure
    );
  }

  return false;
}


function createStage(
  model,
  payload
) {

  const stage =
    document.createElement(
      'div'
    );

  stage.className =
    'campaign-map-stage';

  stage.dataset.grid =
    model.grid?.enabled
      ? 'true'
      : 'false';

  stage.style.setProperty(
    '--campaign-grid-size',
    `${Number(model.grid?.size || 48)}px`
  );

  stage.style.setProperty(
    '--campaign-grid-color',
    getPresentationGridColor(
      model.grid?.color
    )
  );

  const viewport =
    document.createElement(
      'div'
    );

  viewport.className =
    'campaign-map-viewport';

  viewport.append(
    createBackground(
      payload.assets?.background
    ),
    createObjectLayer(
      model,
      payload
    ),
    createFogImage(
      payload.fogImage
    )
  );

  renderLockedFogZones(
    viewport,
    model
  );

  stage.appendChild(
    viewport
  );

  return stage;
}


function updatePresentationItems(
  root,
  payload
) {

  const stage =
    root.querySelector(
      '.campaign-map-stage'
    );

  const objectLayer =
    root.querySelector(
      '.campaign-map-object-layer'
    );

  if (!stage || !objectLayer) return false;

  syncStageGrid(
    stage,
    payload.model?.grid
  );

  for (const entry of payload.items || []) {

    const selector =
      getItemSelector(
        entry.kind,
        entry.itemId
      );

    const existing =
      selector
        ? objectLayer.querySelector(
          selector
        )
        : null;

    if (
      !entry.record ||
      !isLayerVisible(
        payload.model,
        entry.record
      ) ||
      !canShowPresentationItem(
        entry.kind,
        entry.record
      )
    ) {

      existing?.remove();
      continue;
    }

    const nextElement =
      entry.kind === 'shape'
        ? createShape(
          entry.record,
          payload.model
        )
        : createToken(
          entry.record,
          payload
        );

    if (existing) {

      existing.replaceWith(
        nextElement
      );

    } else {

      objectLayer.appendChild(
        nextElement
      );
    }
  }

  sortObjectLayer(
    objectLayer
  );

  return true;
}


function updatePresentationFog(
  root,
  payload
) {

  const viewport =
    root.querySelector(
      '.campaign-map-viewport'
    );

  if (!viewport) return false;

  let fog =
    viewport.querySelector(
      '.campaign-map-fog-image'
    );

  if (payload.fogPatch) {

    fog =
      ensureFogCanvas(
        viewport,
        fog
      );

    applyFogPatchToCanvas(
      fog,
      payload.fogPatch
    );

    renderLockedFogZones(
      viewport,
      payload.model || {}
    );

    return true;
  }

  if (!fog) {

    fog =
      createFogImage(
        ''
      );

    viewport.appendChild(
      fog
    );
  }

  if (fog.tagName === 'CANVAS') {

    const image =
      createFogImage(
        ''
      );

    fog.replaceWith(
      image
    );

    fog =
      image;
  }

  fog.src =
    payload.fogImage || '';

  renderLockedFogZones(
    viewport,
    payload.model || {}
  );

  return true;
}


function ensureFogCanvas(
  viewport,
  fog
) {

  if (
    fog &&
    fog.tagName === 'CANVAS'
  ) {

    return fog;
  }

  const canvas =
    document.createElement(
      'canvas'
    );

  canvas.className =
    'campaign-map-fog-image';

  canvas.width =
    WORLD_WIDTH;

  canvas.height =
    WORLD_HEIGHT;

  if (fog) {

    const currentSrc =
      fog.getAttribute(
        'src'
      );

    fog.replaceWith(
      canvas
    );

    if (currentSrc) {

      drawImageOnFogCanvas(
        canvas,
        currentSrc,
        0,
        0,
        WORLD_WIDTH,
        WORLD_HEIGHT
      );
    }

    return canvas;
  }

  viewport.appendChild(
    canvas
  );

  return canvas;
}


function applyFogPatchToCanvas(
  canvas,
  patch
) {

  if (!canvas || !patch?.image) return;

  drawImageOnFogCanvas(
    canvas,
    patch.image,
    Number(patch.x || 0),
    Number(patch.y || 0),
    Number(patch.width || 1),
    Number(patch.height || 1)
  );
}


function drawImageOnFogCanvas(
  canvas,
  imageSrc,
  x,
  y,
  width,
  height
) {

  // Рисование асинхронное, потому что patch приходит как маленький PNG.
  // Это не блокирует pointermove мастера и не требует полного render-model.
  const image =
    new Image();

  image.onload =
    () => {

      canvas
        .getContext('2d')
        .drawImage(
          image,
          x,
          y,
          width,
          height
        );
    };

  image.src =
    imageSrc;
}


function renderPresentationDragMeasure(
  root,
  measure
) {

  const viewport =
    root.querySelector(
      '.campaign-map-viewport'
    );

  if (!viewport) return false;

  viewport
    .querySelectorAll('.campaign-map-drag-measure')
    .forEach(element => element.remove());

  if (!measure?.active) return true;

  const overlay =
    document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );

  overlay.classList.add(
    'campaign-map-drag-measure'
  );

  overlay.setAttribute(
    'viewBox',
    `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`
  );

  overlay.innerHTML = `
    <defs>
      <marker id="campaign-drag-arrow" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
        <path d="M2,2 L10,6 L2,10 Z"></path>
      </marker>
    </defs>
    <line x1="${Number(measure.x1 || 0)}" y1="${Number(measure.y1 || 0)}" x2="${Number(measure.x2 || 0)}" y2="${Number(measure.y2 || 0)}"></line>
    <text x="${Number(measure.labelX || 0)}" y="${Number(measure.labelY || 0)}">${escapeText(measure.label || '')}</text>
  `;

  viewport.appendChild(
    overlay
  );

  return true;
}


function createBackground(
  url
) {

  const background =
    document.createElement(
      'div'
    );

  background.className =
    'campaign-map-background';

  if (url) {

    background.style.backgroundImage =
      `url("${url}")`;
  }

  return background;
}


function createObjectLayer(
  model,
  payload
) {

  const layer =
    document.createElement(
      'div'
    );

  layer.className =
    'campaign-map-object-layer';

  const visibleLayers =
    getVisibleLayers(
      model
    );

  [
    ...(model.tokens || []).map(token => ({
      kind: 'token',
      item: token
    })),
    ...(model.shapes || []).map(shape => ({
      kind: 'shape',
      item: shape
    }))
  ]
    .filter(entry =>
      visibleLayers.has(entry.item.layerId)
    )
    .filter(entry =>
      canShowPresentationItem(
        entry.kind,
        entry.item
      )
    )
    .sort((left, right) =>
      Number(left.item.zIndex || 0) - Number(right.item.zIndex || 0)
    )
    .forEach(entry => {

      layer.appendChild(
        entry.kind === 'shape'
          ? createShape(
            entry.item,
            model
          )
          : createToken(
            entry.item,
            payload
          )
      );
    });

  return layer;
}


function createToken(
  token,
  payload
) {

  const element =
    document.createElement(
      'button'
    );

  element.className =
    `campaign-map-token is-${token.type}`;

  element.type =
    'button';

  element.dataset.tokenId =
    token.tokenId;

  element.dataset.tokenType =
    token.type;

  element.dataset.name =
    token.name || '';

  element.dataset.sourceMode =
    token.sourceMode || 'copy';

  element.dataset.playerToken =
    token.isPlayerToken
      ? 'true'
      : 'false';

  element.dataset.presentationHidden =
    token.presentationHidden
      ? 'true'
      : 'false';

  element.style.left =
    `${Number(token.x || 50)}%`;

  element.style.top =
    `${Number(token.y || 50)}%`;

  element.style.zIndex =
    String(token.zIndex || 0);

  element.style.setProperty(
    '--token-size',
    String(token.size || 1)
  );

  element.style.setProperty(
    '--token-rotation',
    `${Number(token.rotation || 0)}deg`
  );

  applyTokenHealth(
    element,
    payload.tokenView?.[token.tokenId]
  );

  const imageUrl =
    payload.assets?.tokens?.[token.tokenId];

  if (imageUrl) {

    const image =
      document.createElement(
        'img'
      );

    image.className =
      'campaign-map-token-image';

    image.src =
      imageUrl;

    image.alt =
      '';

    element.appendChild(
      image
    );

  } else {

    element.textContent =
      token.type === 'creature'
        ? 'С'
        : 'О';
  }

  return element;
}


function createShape(
  shape,
  model
) {

  const element =
    document.createElement(
      'div'
    );

  element.className =
    'campaign-map-shape';

  element.dataset.shapeId =
    shape.shapeId;

  element.dataset.shapeType =
    shape.type;

  element.style.left =
    `${Math.round(Number(shape.x || 0))}px`;

  element.style.top =
    `${Math.round(Number(shape.y || 0))}px`;

  element.style.width =
    `${Math.round(Number(shape.width || 48))}px`;

  element.style.height =
    `${Math.round(Number(shape.height || 48))}px`;

  element.style.zIndex =
    String(shape.zIndex || 0);

  element.innerHTML =
    getShapeHTML(
      shape,
      model.grid?.size || 48
    );

  return element;
}


function getShapeHTML(
  shape,
  gridSize
) {

  if (shape.type === 'circle') {

    return `
      <svg class="campaign-map-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse cx="50" cy="50" rx="48" ry="48"></ellipse>
      </svg>
      <span class="campaign-map-shape-label is-top">${getFeetLabel(shape.width, gridSize)}</span>
    `;
  }

  if (shape.type === 'triangle') {

    return `
      <svg class="campaign-map-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="${escapeAttribute(shape.points || '50,6 94,94 6,94')}"></polygon>
      </svg>
      <span class="campaign-map-shape-label is-top">${getFeetLabel(shape.width, gridSize)}</span>
      <span class="campaign-map-shape-label is-right">${getFeetLabel(shape.height, gridSize)}</span>
    `;
  }

  return `
    <svg class="campaign-map-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="2" y="2" width="96" height="96"></rect>
    </svg>
    <span class="campaign-map-shape-label is-top">${getFeetLabel(shape.width, gridSize)}</span>
    <span class="campaign-map-shape-label is-right">${getFeetLabel(shape.height, gridSize)}</span>
  `;
}


function createFogImage(
  src
) {

  const fog =
    document.createElement(
      'img'
    );

  fog.className =
    'campaign-map-fog-image';

  fog.src =
    src || '';

  fog.alt =
    '';

  return fog;
}


function renderLockedFogZones(
  viewport,
  model
) {

  viewport
    .querySelectorAll('.campaign-presentation-locked-fog-zone')
    .forEach(zone => zone.remove());

  (model.fog?.lockedZones || [])
    .forEach(zone => {

      const element =
        document.createElement(
          'div'
        );

      element.className =
        'campaign-presentation-locked-fog-zone';

      element.style.left =
        `${Number(zone.x || 0)}px`;

      element.style.top =
        `${Number(zone.y || 0)}px`;

      element.style.width =
        `${Number(zone.width || 0)}px`;

      element.style.height =
        `${Number(zone.height || 0)}px`;

      viewport.appendChild(
        element
      );
    });
}


function syncStageGrid(
  stage,
  grid = {}
) {

  stage.dataset.grid =
    grid.enabled
      ? 'true'
      : 'false';

  stage.style.setProperty(
    '--campaign-grid-size',
    `${Number(grid.size || 48)}px`
  );

  stage.style.setProperty(
    '--campaign-grid-color',
    getPresentationGridColor(
      grid.color
    )
  );
}


function getPresentationGridColor(
  value
) {

  const color =
    String(value || '').trim();

  const hexMatch =
    /^#([0-9a-f]{6})$/i.exec(
      color
    );

  if (!hexMatch) {

    return color || 'rgba(255,255,255,0.12)';
  }

  const raw =
    hexMatch[1];

  const red =
    Number.parseInt(
      raw.slice(0, 2),
      16
    );

  const green =
    Number.parseInt(
      raw.slice(2, 4),
      16
    );

  const blue =
    Number.parseInt(
      raw.slice(4, 6),
      16
    );

  return `rgba(${red},${green},${blue},0.22)`;
}


function getItemSelector(
  kind,
  itemId
) {

  const escapedId =
    CSS.escape(
      itemId || ''
    );

  if (kind === 'token') {

    return `.campaign-map-token[data-token-id="${escapedId}"]`;
  }

  if (kind === 'shape') {

    return `.campaign-map-shape[data-shape-id="${escapedId}"]`;
  }

  return '';
}


function isLayerVisible(
  model,
  item
) {

  const layers =
    model?.layers || [];

  const layer =
    layers.find(nextLayer =>
      nextLayer.layerId === item.layerId
    );

  return layer?.visible !== false;
}


function sortObjectLayer(
  objectLayer
) {

  [...objectLayer.children]
    .sort((left, right) =>
      Number(left.style.zIndex || 0) - Number(right.style.zIndex || 0)
    )
    .forEach(element =>
      objectLayer.appendChild(
        element
      )
    );
}


function applyTokenHealth(
  element,
  view
) {

  if (!view) return;

  if (view.hpPercent) {

    element.dataset.hpPercent =
      view.hpPercent;
  }

  if (view.hpState) {

    element.dataset.hpState =
      view.hpState;
  }

  if (view.conditionCount) {

    element.dataset.conditionCount =
      view.conditionCount;
  }

  if (view.effectCount) {

    element.dataset.effectCount =
      view.effectCount;
  }

  if (view.effectsSummary) {

    element.dataset.effectsSummary =
      view.effectsSummary;

    element.title =
      view.effectsSummary;
  }

  if (view.incapacitated) {

    element.dataset.incapacitated =
      view.incapacitated;
  }

  if (view.speedZero) {

    element.dataset.speedZero =
      view.speedZero;
  }

  if (view.healthColor) {

    element.style.setProperty(
      '--token-health-color',
      view.healthColor
    );
  }
}


function getVisibleLayers(
  model
) {

  return new Set(
    (model.layers || [])
      .filter(layer => layer.visible !== false)
      .map(layer => layer.layerId)
  );
}


function getFeetLabel(
  value,
  gridSize
) {

  const cells =
    Math.max(
      1,
      Math.round(Number(value || 0) / Number(gridSize || 48))
    );

  return `${cells * 5} ft`;
}


function escapeAttribute(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}


function escapeText(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
