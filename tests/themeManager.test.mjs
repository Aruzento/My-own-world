import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  applyAppearance,
  applyStoredAppearance,
  getStoredAppearance,
  normalizeAppearance,
  updateStoredAppearance
} from '../js/ui/themeManager.js';


function createStorage(
  initial = {}
) {

  const entries =
    new Map(
      Object.entries(initial)
    );

  return {
    getItem:
      key => entries.get(key) ?? null,
    setItem:
      (key, value) => entries.set(key, String(value)),
    getRaw:
      key => entries.get(key)
  };
}


function createRoot() {

  return {
    dataset: {}
  };
}


test(
  'normalizeAppearance keeps only supported appearance values',
  () => {

    assert.deepEqual(
      normalizeAppearance({
        theme: 'light',
        accent: 'green',
        background: 'forest',
        scale: 'huge'
      }),
      {
        ...DEFAULT_APPEARANCE,
        accent: 'green',
        background: 'forest'
      }
    );
  }
);


test(
  'applyAppearance writes normalized body dataset attributes',
  () => {

    const root =
      createRoot();

    const appearance =
      applyAppearance(
        {
          theme: 'dark',
          accent: 'purple',
          background: 'arcane',
          scale: 'large'
        },
        root
      );

    assert.deepEqual(
      appearance,
      {
        theme: 'dark',
        accent: 'purple',
        background: 'arcane',
        scale: 'large'
      }
    );

    assert.deepEqual(
      root.dataset,
      {
        theme: 'dark',
        accent: 'purple',
        bg: 'arcane',
        uiScale: 'large'
      }
    );
  }
);


test(
  'stored appearance falls back to defaults after invalid JSON',
  () => {

    const storage =
      createStorage({
        [APPEARANCE_STORAGE_KEY]: '{bad'
      });

    assert.deepEqual(
      getStoredAppearance(storage),
      DEFAULT_APPEARANCE
    );
  }
);


test(
  'updateStoredAppearance persists and applies the merged appearance',
  () => {

    const storage =
      createStorage({
        [APPEARANCE_STORAGE_KEY]: JSON.stringify({
          theme: 'dark',
          accent: 'gold',
          background: 'stone',
          scale: 'normal'
        })
      });

    const root =
      createRoot();

    const next =
      updateStoredAppearance(
        {
          accent: 'red',
          scale: 'compact'
        },
        {
          storage,
          root
        }
      );

    assert.deepEqual(
      next,
      {
        theme: 'dark',
        accent: 'red',
        background: 'stone',
        scale: 'compact'
      }
    );

    assert.equal(
      root.dataset.accent,
      'red'
    );

    assert.equal(
      JSON.parse(storage.getRaw(APPEARANCE_STORAGE_KEY)).scale,
      'compact'
    );
  }
);


test(
  'applyStoredAppearance reads storage and applies dataset',
  () => {

    const storage =
      createStorage({
        [APPEARANCE_STORAGE_KEY]: JSON.stringify({
          theme: 'dark',
          accent: 'blue',
          background: 'forest',
          scale: 'large'
        })
      });

    const root =
      createRoot();

    assert.deepEqual(
      applyStoredAppearance({
        storage,
        root
      }),
      {
        theme: 'dark',
        accent: 'blue',
        background: 'forest',
        scale: 'large'
      }
    );

    assert.deepEqual(
      root.dataset,
      {
        theme: 'dark',
        accent: 'blue',
        bg: 'forest',
        uiScale: 'large'
      }
    );
  }
);
