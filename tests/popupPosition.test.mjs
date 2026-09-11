import assert from 'node:assert/strict';
import test from 'node:test';

import {
  positionPopupAtPoint,
  positionPopupNearAnchor,
  resolvePopupPosition
} from '../js/ui/popupPosition.js';

for (const mode of ['anchor', 'point']) {
  test(`popup ${mode} placement measures dimensions after applying viewport constraints`, () => {
    const previousWindow = globalThis.window;
    globalThis.window = { innerWidth: 1280, innerHeight: 900 };
    try {
      const popup = {
        style: {},
        get offsetWidth() { return this.style.maxWidth ? 500 : 390; },
        get offsetHeight() { return this.style.maxHeight ? 876 : 720; },
        getBoundingClientRect() {
          return { left: Number.parseFloat(this.style.left), top: Number.parseFloat(this.style.top) };
        }
      };
      if (mode === 'anchor') {
        positionPopupNearAnchor(popup, { getBoundingClientRect: () => ({ left: 1100, top: 80, bottom: 110 }) });
      } else positionPopupAtPoint(popup, 1100, 118);
      assert.equal(popup.style.left, '768px');
      assert.equal(popup.style.top, '12px');
      assert.equal(popup.style.overflow, 'auto');
    } finally {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  });
}


test(
  'resolvePopupPosition clamps ordinary popup to viewport',
  () => {

    const position =
      resolvePopupPosition({
        left: 760,
        top: 540,
        width: 220,
        height: 160,
        viewportWidth: 900,
        viewportHeight: 640,
        padding: 12
      });

    assert.deepEqual(
      position,
      {
        left: 668,
        top: 468
      }
    );
  }
);


test(
  'resolvePopupPosition leaves non-overlapping obstacle placement unchanged',
  () => {

    const position =
      resolvePopupPosition({
        left: 80,
        top: 72,
        width: 240,
        height: 180,
        viewportWidth: 960,
        viewportHeight: 640,
        padding: 12,
        avoidRect: {
          left: 720,
          top: 0,
          right: 960,
          bottom: 640
        }
      });

    assert.deepEqual(
      position,
      {
        left: 80,
        top: 72
      }
    );
  }
);


test(
  'resolvePopupPosition moves overlapping popup away from right-side obstacle',
  () => {

    const position =
      resolvePopupPosition({
        left: 800,
        top: 96,
        width: 320,
        height: 260,
        viewportWidth: 1280,
        viewportHeight: 720,
        padding: 12,
        gap: 12,
        avoidRect: {
          left: 980,
          top: 72,
          width: 280,
          height: 580
        }
      });

    assert.deepEqual(
      position,
      {
        left: 648,
        top: 96
      }
    );
  }
);
