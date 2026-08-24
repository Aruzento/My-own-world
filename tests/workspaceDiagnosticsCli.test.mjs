import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import {
  buildPageRecordContent
} from '../js/core/pageRecord.js';


test(
  'workspace diagnostics human output prints missing workspace errors',
  () => {

    const missingWorkspace =
      path.join(
        os.tmpdir(),
        `my-own-world-missing-workspace-${Date.now()}-${process.pid}`
      );

    const result =
      spawnSync(
        process.execPath,
        [
          'tools/run_workspace_diagnostics.mjs',
          '--workspace',
          missingWorkspace,
          '--no-write-probe',
          '--json',
          'false'
        ],
        {
          cwd:
            process.cwd(),
          encoding:
            'utf8'
        }
      );

    assert.equal(
      result.status,
      1
    );

    assert.match(
      result.stdout,
      /Errors:/
    );

    assert.match(
      result.stdout,
      /File or folder was not found/
    );
  }
);


test(
  'workspace diagnostics human output reports broken internal link count',
  async () => {

    const workspace =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          'my-own-world-link-diagnostics-'
        )
      );

    try {

      await fs.mkdir(
        path.join(
          workspace,
          'pages'
        )
      );

      await fs.writeFile(
        path.join(
          workspace,
          'pages',
          'source.md'
        ),
        buildPageRecordContent({
          id: 'source',
          parent: null,
          tags: [
            'card'
          ],
          template: 'card',
          type: 'note',
          aliases: [],
          body: '<h1>Source</h1><p>[[Missing Page]]</p>'
        }),
        'utf8'
      );

      const result =
        spawnSync(
          process.execPath,
          [
            'tools/run_workspace_diagnostics.mjs',
            '--workspace',
            workspace,
            '--no-write-probe',
            '--json',
            'false'
          ],
          {
            cwd:
              process.cwd(),
            encoding:
              'utf8'
          }
        );

      assert.equal(
        result.status,
        0
      );

      assert.match(
        result.stdout,
        /Internal link issues: 1/
      );

      assert.match(
        result.stdout,
        /Connectivity review candidates: 1/
      );

      assert.match(
        result.stdout,
        /broken_internal_links/
      );

    } finally {

      await fs.rm(
        workspace,
        {
          recursive:
            true,
          force:
            true
        }
      );
    }
  }
);
