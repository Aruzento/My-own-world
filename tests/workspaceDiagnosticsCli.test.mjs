import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';


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
