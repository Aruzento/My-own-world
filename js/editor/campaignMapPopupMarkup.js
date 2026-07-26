import {
  iconSvg
} from '../core/icons.js';


export const MAP_POPUP_UI_MIGRATION =
  '0.0.1.8.12.2';


export function getMapPopupFrameHTML({
  title,
  icon = 'campaign-map',
  children = ''
}) {

  return `
    <div class="campaign-map-popup-shell" data-map-popup-ui-migration="${MAP_POPUP_UI_MIGRATION}">
      <div class="campaign-map-popup-header">
        <span class="campaign-map-popup-icon">${iconSvg(icon)}</span>
        <div class="campaign-map-popup-heading">
          <div class="campaign-map-popup-title">${escapeHTML(title)}</div>
        </div>
      </div>
      <div class="campaign-map-popup-body">
        ${children}
      </div>
    </div>
  `;
}


export function getMapPopupSectionHTML({
  label,
  key = '',
  className = '',
  children = ''
}) {

  const keyAttribute =
    key
      ? ` data-map-popup-section="${escapeAttribute(key)}"`
      : '';

  const sectionClass =
    [
      'campaign-map-popup-section',
      className
    ]
      .filter(Boolean)
      .join(' ');

  return `
    <section class="${escapeAttribute(sectionClass)}"${keyAttribute}>
      <div class="campaign-map-popup-section-label">${escapeHTML(label)}</div>
      ${children}
    </section>
  `;
}


export function escapeHTML(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}


export function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  )
    .replaceAll('"', '&quot;');
}
