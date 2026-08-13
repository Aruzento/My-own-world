import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectCssTokenLayerDrift
} from '../tools/css_token_layer_guard.mjs';


test(
  'css token layer guard reports deliberate undefined token and extreme z-index',
  () => {

    const issues =
      collectCssTokenLayerDrift({
        tokenFiles: [
          'styles/design-tokens.css'
        ],
        files: [
          'styles/command-palette.css',
          'styles/card-type.css'
        ],
        fileContents: {
          'styles/design-tokens.css': `
            :root {
              --mow-z-modal: 200;
              --mow-focus-shadow: 0 0 0 3px rgba(201, 164, 92, 0.16);
            }
          `,
          'styles/command-palette.css': `
            .command-palette {
              box-shadow: var(--mow-missing-focus);
              z-index: var(--mow-z-modal);
            }
          `,
          'styles/card-type.css': `
            .card-type-menu {
              z-index: 10020;
            }
          `
        }
      });

    assert.deepEqual(
      issues.map(issue =>
        issue.type
      ),
      [
        'undefined-mow-token',
        'hard-coded-extreme-z-index'
      ]
    );

    assert.equal(
      issues[0].token,
      '--mow-missing-focus'
    );

    assert.equal(
      issues[1].value,
      10020
    );
  }
);


test(
  'css token layer guard passes focused corrected repository targets',
  () => {

    assert.deepEqual(
      collectCssTokenLayerDrift(),
      []
    );
  }
);
