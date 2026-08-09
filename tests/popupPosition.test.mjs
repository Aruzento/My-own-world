import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolvePopupPosition
} from '../js/ui/popupPosition.js';


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
