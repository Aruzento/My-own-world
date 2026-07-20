import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';


test(
  'desktop large workspace smoke preserves Cyrillic workspace paths',
  async () => {

    const root =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          'мой-мир-smoke-'
        )
      );

    const workspace =
      path.join(
        root,
        'ДНД',
        'Мастер',
        'По кампаниям',
        'База'
      );

    const pagesDir =
      path.join(
        workspace,
        'pages'
      );

    const output =
      path.join(
        root,
        'large-workspace-smoke.md'
      );

    try {

      await fs.mkdir(
        pagesDir,
        {
          recursive:
            true
        }
      );

      await fs.writeFile(
        path.join(
          pagesDir,
          'тест.md'
        ),
        [
          '---',
          'id: test-page',
          'title: Тест',
          'template: card',
          'type: note',
          'parent: null',
          'order: 0',
          '---',
          '',
          '<section data-card-shell="v1"><h1>Тест</h1></section>',
          ''
        ].join('\n'),
        'utf8'
      );

      const result =
        spawnSync(
          process.execPath,
          [
            'tools/run_desktop_large_workspace_smoke.mjs',
            '--workspace',
            workspace,
            '--skip-desktop-checks',
            '--output',
            output
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
        0,
        `${result.stdout}\n${result.stderr}`
      );

      const report =
        await fs.readFile(
          output,
          'utf8'
        );

      assert.match(
        report,
        /Plan ref: `0\.0\.1\.2\.2`/
      );

      assert.match(
        report,
        /Access matrix:/
      );

      assert.match(
        report,
        /Manual Native Targets/
      );

      assert.match(
        report,
        /desktop:native-smoke/
      );

      assert.match(
        report,
        /No heavy maps were reported by diagnostics/
      );

      assert.match(
        report,
        /Pages: 1/
      );

    } finally {

      await fs.rm(
        root,
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
