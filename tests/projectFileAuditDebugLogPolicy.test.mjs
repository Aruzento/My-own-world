import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  deleteNote,
  isAllowedGeneratedLocalDebugLog
} from '../tools/audit_project_files.mjs';


const CHROMIUM_GPU_LOG =
  '[0818/122643.213:ERROR:gpu\\command_buffer\\service\\shared_image\\shared_image_manager.cc:386] SharedImageManager::ProduceMemory: Trying to Produce a Memory representation from a non-existent mailbox.';


function gitState({
  tracked = [],
  untracked = [],
  ignored = []
} = {}) {

  return {
    tracked:
      new Set(
        tracked
      ),
    untracked:
      new Set(
        untracked
      ),
    ignored:
      new Set(
        ignored
      )
  };
}


test(
  'project file audit allows only the known root Chromium debug log',
  () => {

    assert.equal(
      isAllowedGeneratedLocalDebugLog(
        'debug.log',
        gitState({
          ignored:
            [
              'debug.log'
            ]
        }),
        CHROMIUM_GPU_LOG
      ),
      true
    );

    assert.equal(
      deleteNote(
        'debug.log',
        gitState({
          ignored:
            [
              'debug.log'
            ]
        }),
        CHROMIUM_GPU_LOG
      ).startsWith(
        'Нет: allowed generated/local-only'
      ),
      true
    );
  }
);


test(
  'git ignore rule keeps debug log exemption root-only',
  () => {

    const gitignorePath =
      path.join(
        process.cwd(),
        '.gitignore'
      );

    const activeRules =
      fs.readFileSync(
        gitignorePath,
        'utf8'
      )
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line =>
          line &&
          !line.startsWith('#')
        );

    assert.ok(
      activeRules.includes(
        '/debug.log'
      )
    );

    assert.equal(
      activeRules.includes(
        'debug.log'
      ),
      false
    );
  }
);


test(
  'project file audit does not exempt tracked or unexpected log files',
  () => {

    assert.equal(
      isAllowedGeneratedLocalDebugLog(
        'debug.log',
        gitState({
          tracked:
            [
              'debug.log'
            ],
          ignored:
            [
              'debug.log'
            ]
        }),
        CHROMIUM_GPU_LOG
      ),
      false
    );

    assert.equal(
      isAllowedGeneratedLocalDebugLog(
        'logs/debug.log',
        gitState({
          ignored:
            [
              'logs/debug.log'
            ]
        }),
        CHROMIUM_GPU_LOG
      ),
      false
    );

    assert.equal(
      isAllowedGeneratedLocalDebugLog(
        'debug.log',
        gitState({
          ignored:
            [
              'debug.log'
            ]
        }),
        'application log from a product feature'
      ),
      false
    );

    assert.equal(
      deleteNote(
        'debug.log',
        gitState({
          tracked:
            [
              'debug.log'
            ],
          ignored:
            [
              'debug.log'
            ]
        }),
        CHROMIUM_GPU_LOG
      ).startsWith(
        'Нет: allowed generated/local-only'
      ),
      false
    );
  }
);
