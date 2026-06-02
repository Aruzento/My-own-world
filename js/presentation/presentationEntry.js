// Entry point отдельного окна презентации.
// Окно не знает про editor/sidebar и получает карту сообщениями от окна мастера.

const CHANNEL_NAME =
  'my-own-world-campaign-map-presentation';

const presentationState = {
  x: 0,
  y: 0,
  zoom: 1,
  isPanning: false,
  lastX: 0,
  lastY: 0
};

const map =
  document.getElementById(
    'presentationMap'
  );

const channel =
  new BroadcastChannel(
    CHANNEL_NAME
  );

channel.addEventListener(
  'message',
  event => handlePresentationMessage(
    event.data
  )
);

document.addEventListener(
  'DOMContentLoaded',
  () => {

    channel.postMessage({
      type: 'ready'
    });
  }
);

map.addEventListener(
  'wheel',
  handleWheel,
  { passive: false }
);

map.addEventListener(
  'pointerdown',
  handlePointerDown
);

document.addEventListener(
  'pointermove',
  handlePointerMove
);

document.addEventListener(
  'pointerup',
  handlePointerUp
);


function handlePresentationMessage(
  message
) {

  if (!message) return;

  if (message.type === 'image-preview') {

    ensureStyle('');

    toggleImagePreview(
      message
    );

    return;
  }

  if (message.type !== 'render') return;

  ensureStyle(
    message.css
  );

  map.innerHTML =
    message.html || '';

  applyViewportTransform();
}


function toggleImagePreview(
  message
) {

  if (!message.imageSrc) return;

  const existingPreview =
    document.querySelector(
      '.presentation-image-preview'
    );

  if (
    existingPreview?.dataset.imageSrc === message.imageSrc
  ) {

    existingPreview.remove();
    return;
  }

  existingPreview?.remove();

  const preview =
    document.createElement(
      'div'
    );

  preview.className =
    'presentation-image-preview';

  preview.dataset.imageSrc =
    message.imageSrc;

  preview.innerHTML = `
    <button class="presentation-image-preview-close" type="button">×</button>
    <div class="presentation-image-preview-title">${escapeHtml(message.title || 'Изображение')}</div>
    <img src="${message.imageSrc}" alt="">
  `;

  preview
    .querySelector('button')
    .addEventListener(
      'click',
      () => preview.remove()
    );

  document.body.appendChild(
    preview
  );
}


function ensureStyle(
  css
) {

  let style =
    document.getElementById(
      'campaign-map-presentation-style'
    );

  if (!style) {

    style =
      document.createElement(
        'style'
      );

    style.id =
      'campaign-map-presentation-style';

    document.head.appendChild(
      style
    );
  }

  style.textContent =
    `
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #050505;
      }

      .presentation-map {
        width: 100%;
        height: 100%;
      }

      ${css || ''}
    `;
}


function handleWheel(
  event
) {

  event.preventDefault();

  const rect =
    event.currentTarget.getBoundingClientRect();

  const factor =
    event.deltaY < 0
      ? 1.08
      : 1 / 1.08;

  zoomPresentation(
    factor,
    {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  );
}


function handlePointerDown(
  event
) {

  event.preventDefault();

  presentationState.isPanning =
    true;

  presentationState.lastX =
    event.clientX;

  presentationState.lastY =
    event.clientY;
}


function handlePointerMove(
  event
) {

  if (!presentationState.isPanning) return;

  presentationState.x +=
    event.clientX - presentationState.lastX;

  presentationState.y +=
    event.clientY - presentationState.lastY;

  presentationState.lastX =
    event.clientX;

  presentationState.lastY =
    event.clientY;

  applyViewportTransform();
}


function handlePointerUp() {

  presentationState.isPanning =
    false;
}


function zoomPresentation(
  factor,
  anchor
) {

  const nextZoom =
    clamp(
      presentationState.zoom * factor,
      0.2,
      8
    );

  const worldX =
    (anchor.x - presentationState.x) /
    presentationState.zoom;

  const worldY =
    (anchor.y - presentationState.y) /
    presentationState.zoom;

  presentationState.zoom =
    nextZoom;

  presentationState.x =
    anchor.x - worldX * nextZoom;

  presentationState.y =
    anchor.y - worldY * nextZoom;

  applyViewportTransform();
}


function applyViewportTransform() {

  const viewport =
    map.querySelector(
      '.campaign-map-viewport'
    );

  if (!viewport) return;

  viewport.style.transform =
    `translate(${presentationState.x}px, ${presentationState.y}px) scale(${presentationState.zoom})`;
}


function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


function escapeHtml(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
