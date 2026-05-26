import {
  applyTextColorWithHistory
} from './formattingService.js';

const RECENT_TEXT_COLORS_KEY =
  'myOwnWorld.recentTextColors';

const MAX_RECENT_TEXT_COLORS =
  5;

export function applyToolbarColor(
  colorPicker,
  recentColors,
  color = colorPicker?.value,
  colorButton = null
) {

  if (!color) return false;

  const applied =
    applyTextColorWithHistory(
      color
    );

  if (!applied) return false;

  const nextColors =
    rememberRecentColor(
      color
    );

  renderRecentColors(
    recentColors,
    colorPicker,
    nextColors
  );

  updateColorButton(
    colorButton,
    color
  );

  return true;
}

export function renderRecentColors(
  container,
  colorPicker,
  colors = getRecentColors()
) {

  if (!container) return;

  container.innerHTML =
    '';

  colors
    .slice(
      0,
      MAX_RECENT_TEXT_COLORS
    )
    .forEach(color => {

      const button =
        document.createElement(
          'button'
        );

      button.type =
        'button';

      button.className =
        'toolbar-color-swatch';

      button.dataset.color =
        color;

      button.title =
        `Применить ${color}`;

      button.style.setProperty(
        '--swatch-color',
        color
      );

      if (
        colorPicker?.value?.toLowerCase() === color
      ) {

        button.classList.add(
          'is-current'
        );
      }

      container.appendChild(
        button
      );
    });
}

function updateColorButton(
  button,
  color
) {

  button
    ?.querySelector('.toolbar-color-button-swatch')
    ?.style.setProperty(
      '--current-text-color',
      color
    );
}

function rememberRecentColor(
  color
) {

  const normalized =
    normalizeColor(
      color
    );

  const colors =
    getRecentColors()
      .filter(item =>
        item !== normalized
      );

  colors.unshift(
    normalized
  );

  const nextColors =
    colors.slice(
      0,
      MAX_RECENT_TEXT_COLORS
    );

  localStorage.setItem(
    RECENT_TEXT_COLORS_KEY,
    JSON.stringify(nextColors)
  );

  return nextColors;
}

function getRecentColors() {

  try {

    const parsed =
      JSON.parse(
        localStorage.getItem(
          RECENT_TEXT_COLORS_KEY
        ) || '[]'
      );

    return Array.isArray(parsed)
      ? parsed
        .map(normalizeColor)
        .filter(Boolean)
      : [];

  } catch {

    return [];
  }
}

function normalizeColor(
  color
) {

  const value =
    String(color || '')
      .trim()
      .toLowerCase();

  return /^#[0-9a-f]{6}$/.test(value)
    ? value
    : '';
}
