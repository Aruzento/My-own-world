import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  DEFAULT_BROWSER_SMOKE_PORT,
  getPlaywrightCliArgs,
  getStaticServerArgs
} from '../tools/run_browser_smoke.mjs';


test(
  'browser smoke runner forwards Playwright CLI arguments',
  () => {

    const extraArgs =
      [
        '--grep',
        'schema-recovery',
        'tests/browser/schema-recovery.spec.mjs'
      ];

    const args =
      getPlaywrightCliArgs(
        extraArgs
      );

    assert.deepEqual(
      args,
      [
        join(
          'node_modules',
          '@playwright',
          'test',
          'cli.js'
        ),
        'test',
        ...extraArgs
      ]
    );
  }
);


test(
  'browser smoke runner keeps a stable static server port',
  () => {

    assert.deepEqual(
      getStaticServerArgs(),
      [
        'tools/static_server.mjs',
        '--port',
        String(DEFAULT_BROWSER_SMOKE_PORT)
      ]
    );
  }
);
