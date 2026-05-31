import {
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './campaignMapConstants.js';

export function getPresentationCSS() {

  return `
    .campaign-map-stage {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #161616;
      touch-action: none;
    }

    .campaign-map-viewport {
      position: absolute;
      left: 0;
      top: 0;
      width: ${WORLD_WIDTH}px;
      height: ${WORLD_HEIGHT}px;
      transform-origin: 0 0;
    }

    .campaign-map-background,
    .campaign-map-object-layer,
    .campaign-map-fog-image {
      position: absolute;
      inset: 0;
    }

    .campaign-map-background {
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
    }

    .campaign-map-stage[data-grid="true"] .campaign-map-viewport::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(var(--campaign-grid-color, rgba(255,255,255,0.12)) 1px, transparent 1px),
        linear-gradient(90deg, var(--campaign-grid-color, rgba(255,255,255,0.12)) 1px, transparent 1px);
      background-size:
        var(--campaign-grid-size, 48px)
        var(--campaign-grid-size, 48px);
      pointer-events: none;
      z-index: 3;
    }

    .campaign-map-object-layer {
      pointer-events: none;
    }

    .campaign-map-token {
      position: absolute;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      overflow: hidden;
      transform: translate(-50%, -50%) rotate(var(--token-rotation, 0deg));
      z-index: 4;
      pointer-events: auto;
      width: calc(var(--campaign-grid-size, 48px) * var(--token-size, 1));
      height: calc(var(--campaign-grid-size, 48px) * var(--token-size, 1));
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.86);
      background: #f1d38e;
      color: #201a10;
      font: 700 13px system-ui;
    }

    .campaign-map-token.is-creature[data-hp-percent] {
      border-color: var(--token-health-color, rgba(255,255,255,0.86));
      box-shadow:
        0 0 0 4px color-mix(in srgb, var(--token-health-color, #65b96b) 32%, transparent),
        0 12px 28px rgba(0,0,0,0.36);
    }

    .campaign-map-token.is-creature[data-hp-state="dead"] {
      border-color: rgba(210,58,58,0.96);
      background: rgba(24,18,18,0.92);
      color: rgba(255,238,230,0.98);
    }

    .campaign-map-token.is-creature[data-hp-state="dead"] .campaign-map-token-image {
      filter: grayscale(1) contrast(0.92) brightness(0.72);
    }

    .campaign-map-token.is-creature[data-hp-state="dead"]::after {
      content: "X";
      position: absolute;
      inset: 10%;
      display: grid;
      place-items: center;
      border-radius: inherit;
      background:
        radial-gradient(circle, rgba(120,18,18,0.34), rgba(120,18,18,0.08) 54%, transparent 68%);
      color: rgba(255,72,72,0.94);
      font: 900 clamp(22px, calc(var(--campaign-grid-size, 48px) * 0.72), 52px)/1 system-ui, sans-serif;
      letter-spacing: 0;
      text-shadow:
        0 2px 8px rgba(0,0,0,0.52),
        0 0 16px rgba(255,54,54,0.36);
      pointer-events: none;
    }

    .campaign-map-token.is-object {
      z-index: 2;
      border-radius: 0;
      border-color: transparent;
      background: transparent;
      color: #1d1d1d;
    }

    .campaign-map-token[data-presentation-hidden="true"] {
      display: none;
    }

    .campaign-map-token[data-source-mode="original"][data-presentation-hidden="true"] {
      display: grid;
      opacity: 0.72;
    }

    .campaign-map-token[data-player-token="true"][data-presentation-hidden="true"] {
      display: grid;
      opacity: 0.72;
    }

    .campaign-map-token[data-source-mode="original"][data-presentation-hidden="true"]::before,
    .campaign-map-token[data-player-token="true"][data-presentation-hidden="true"]::before {
      content: "скрыт";
      position: absolute;
      right: -10px;
      top: -12px;
      z-index: 6;
      padding: 4px 8px;
      border: 1px solid rgba(218,72,72,0.72);
      border-radius: 999px;
      background: rgba(36,25,22,0.96);
      color: rgba(255,220,210,0.98);
      font: 900 12px/1 system-ui, sans-serif;
      pointer-events: none;
    }

    .campaign-map-token[data-layer-hidden="true"],
    .campaign-map-shape[data-layer-hidden="true"] {
      display: none;
    }

    .campaign-map-token-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      border-radius: inherit;
      object-fit: cover;
    }

    .campaign-map-token.is-object .campaign-map-token-image {
      border-radius: 0;
      object-fit: contain;
    }

    .campaign-map-shape {
      position: absolute;
      z-index: 8;
      pointer-events: none;
    }

    .presentation-image-preview {
      position: fixed;
      inset: 28px;
      z-index: 20000;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 14px;
      padding: 18px;
      border: 1px solid rgba(241,211,142,0.22);
      border-radius: 18px;
      background: rgba(10,10,10,0.94);
      box-shadow: 0 28px 90px rgba(0,0,0,0.62);
    }

    .presentation-image-preview-title {
      color: rgba(255,248,230,0.96);
      font: 900 22px/1.15 system-ui, sans-serif;
    }

    .presentation-image-preview img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      min-height: 0;
    }

    .presentation-image-preview-close {
      position: absolute;
      right: 14px;
      top: 14px;
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: 999px;
      background: rgba(218,72,72,0.2);
      color: rgba(255,230,222,0.96);
      font: 900 22px/1 system-ui, sans-serif;
      cursor: pointer;
    }

    .campaign-map-shape-svg {
      width: 100%;
      height: 100%;
      display: block;
      overflow: visible;
    }

    .campaign-map-shape-svg rect,
    .campaign-map-shape-svg polygon,
    .campaign-map-shape-svg ellipse {
      fill: rgba(241,211,142,0.15);
      stroke: rgba(255,244,214,0.92);
      stroke-width: 3;
      vector-effect: non-scaling-stroke;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.32));
    }

    .campaign-map-shape-label {
      position: absolute;
      padding: 3px 7px;
      border: 1px solid rgba(255,248,230,0.68);
      border-radius: 999px;
      background: rgba(20,18,14,0.76);
      color: rgba(255,250,236,0.96);
      font: 800 11px/1 system-ui, sans-serif;
      white-space: nowrap;
      pointer-events: none;
      transform: translate(-50%, -50%);
    }

    .campaign-map-shape-label.is-top {
      left: 50%;
      top: -10px;
    }

    .campaign-map-shape-label.is-right {
      left: calc(100% + 12px);
      top: 50%;
    }

    .campaign-map-drag-measure {
      position: absolute;
      inset: 0;
      z-index: 10;
      overflow: visible;
      pointer-events: none;
    }

    .campaign-map-drag-measure line {
      stroke: rgba(255,244,214,0.96);
      stroke-width: 4;
      stroke-linecap: round;
      marker-end: url(#campaign-drag-arrow);
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    }

    .campaign-map-drag-measure path {
      fill: rgba(255,244,214,0.96);
    }

    .campaign-map-drag-measure text {
      fill: rgba(255,250,236,0.98);
      paint-order: stroke;
      stroke: rgba(20,18,14,0.9);
      stroke-width: 5;
      font: 700 28px system-ui, sans-serif;
      text-anchor: middle;
    }

    .campaign-map-fog-image {
      width: 100%;
      height: 100%;
      object-fit: fill;
      z-index: 10000;
      opacity: 1 !important;
      pointer-events: none;
    }

    .campaign-presentation-locked-fog-zone {
      position: absolute;
      z-index: 10001;
      background: rgba(0,0,0,1);
      pointer-events: none;
    }
  `;
}
