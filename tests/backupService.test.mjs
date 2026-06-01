import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBackupId,
  createBackupManifest
} from '../js/storage/backupService.js';


test(
  'createBackupId создает безопасное имя snapshot',
  () => {

    const id =
      createBackupId(
        'Delete Page Branch!',
        new Date('2026-06-01T10:20:30.000Z')
      );

    assert.equal(
      id,
      '2026-06-01T10-20-30-000Z-delete-page-branch'
    );
  }
);


test(
  'createBackupManifest сохраняет метаданные страниц',
  () => {

    const manifest =
      createBackupManifest({
        id: 'backup-1',
        reason: 'test',
        createdAt: '2026-06-01T10:20:30.000Z',
        pages: [
          {
            id: 'page-1',
            title: 'Остров',
            parent: null,
            type: 'location',
            template: 'card',
            name: 'page.md',
            path: '/pages/page.md'
          }
        ]
      });

    assert.equal(
      manifest.version,
      1
    );

    assert.equal(
      manifest.pageCount,
      1
    );

    assert.deepEqual(
      manifest.pages[0],
      {
        id: 'page-1',
        title: 'Остров',
        parent: null,
        type: 'location',
        template: 'card',
        name: 'page.md',
        path: '/pages/page.md'
      }
    );
  }
);
