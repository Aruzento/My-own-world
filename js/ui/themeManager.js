export const APPEARANCE_STORAGE_KEY =
  'myOwnWorld.appearance';

export const DEFAULT_APPEARANCE =
  Object.freeze({
    theme: 'dark',
    accent: 'gold',
    background: 'stone',
    scale: 'normal'
  });

export const SUPPORTED_APPEARANCE =
  Object.freeze({
    themes: Object.freeze(['dark']),
    accents: Object.freeze(['gold', 'blue', 'green', 'purple', 'red']),
    backgrounds: Object.freeze(['stone', 'forest', 'arcane']),
    scales: Object.freeze(['compact', 'normal', 'large'])
  });


export function normalizeAppearance(
  value = {}
) {

  const source =
    value && typeof value === 'object'
      ? value
      : {};

  const next =
    {
      ...DEFAULT_APPEARANCE
    };

  if (SUPPORTED_APPEARANCE.themes.includes(source.theme)) {

    next.theme =
      source.theme;
  }

  if (SUPPORTED_APPEARANCE.accents.includes(source.accent)) {

    next.accent =
      source.accent;
  }

  if (SUPPORTED_APPEARANCE.backgrounds.includes(source.background)) {

    next.background =
      source.background;
  }

  if (SUPPORTED_APPEARANCE.scales.includes(source.scale)) {

    next.scale =
      source.scale;
  }

  return next;
}


export function getStoredAppearance(
  storage = globalThis.localStorage
) {

  try {

    const parsed =
      JSON.parse(
        storage?.getItem(APPEARANCE_STORAGE_KEY) || '{}'
      );

    return normalizeAppearance(
      parsed
    );

  } catch {

    return {
      ...DEFAULT_APPEARANCE
    };
  }
}


export function applyAppearance(
  value,
  root = globalThis.document?.body
) {

  const appearance =
    normalizeAppearance(
      value
    );

  if (!root?.dataset) {

    return appearance;
  }

  root.dataset.theme =
    appearance.theme;

  root.dataset.accent =
    appearance.accent;

  root.dataset.bg =
    appearance.background;

  root.dataset.uiScale =
    appearance.scale;

  return appearance;
}


export function applyStoredAppearance({
  storage = globalThis.localStorage,
  root = globalThis.document?.body
} = {}) {

  const appearance =
    getStoredAppearance(
      storage
    );

  applyAppearance(
    appearance,
    root
  );

  return appearance;
}


export function updateStoredAppearance(
  patch,
  {
    storage = globalThis.localStorage,
    root = globalThis.document?.body
  } = {}
) {

  const next =
    normalizeAppearance({
      ...getStoredAppearance(storage),
      ...patch
    });

  storage?.setItem(
    APPEARANCE_STORAGE_KEY,
    JSON.stringify(next)
  );

  applyAppearance(
    next,
    root
  );

  return next;
}
