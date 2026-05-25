import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findOrphanAssetPaths,
  findOrphanPaths
} from '../js/storage/assetOrphanDetector.js';


test(
  'orphan detector находит файлы без persistent-ссылок',
  () => {

    const orphanPaths =
      findOrphanAssetPaths(
        [
          {
            id: 'page-1',
            body: '<img data-asset="used.png">'
          }
        ],
        [
          'used.png',
          'unused.png'
        ]
      );

    assert.deepEqual(
      orphanPaths,
      [
        'unused.png'
      ]
    );
  }
);


test(
  'orphan detector не удаляет данные и возвращает только список кандидатов',
  () => {

    const paths =
      [
        'assets/used.png',
        'assets/free.png'
      ];

    const orphanPaths =
      findOrphanPaths(
        [
          {
            path: 'assets/used.png'
          }
        ],
        paths
      );

    assert.deepEqual(
      orphanPaths,
      [
        'assets/free.png'
      ]
    );

    assert.deepEqual(
      paths,
      [
        'assets/used.png',
        'assets/free.png'
      ]
    );
  }
);
