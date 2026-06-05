import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createRulePackagePath,
  listRulePackageFiles,
  loadRulePackageFile,
  removeRulePackageFile,
  saveRulePackageFile
} from '../js/ruleTree/ruleTreePackageStorage.js';


test(
  'Rule Tree package storage saves, lists, loads and removes workspace files',
  async () => {

    const adapter =
      createMemoryStorageAdapter();

    const path =
      await saveRulePackageFile(
        adapter,
        'Core Rules',
        {
          version: 1,
          activeRuleIds: [
            'rule-ac'
          ],
          rules: [
            {
              id: 'rule-ac',
              title: 'Armor',
              effects: [
                {
                  id: 'ac',
                  title: 'AC +1',
                  modifiers: {
                    armorClass: 1
                  }
                }
              ]
            }
          ]
        }
      );

    assert.equal(
      path,
      'rule-packages/core-rules.rule-package.json'
    );

    assert.deepEqual(
      await listRulePackageFiles(
        adapter
      ),
      [
        {
          id: 'core-rules',
          name: 'core-rules.rule-package.json',
          path: 'rule-packages/core-rules.rule-package.json'
        }
      ]
    );

    const loaded =
      await loadRulePackageFile(
        adapter,
        'core-rules'
      );

    assert.equal(
      loaded.rules[0].id,
      'rule-ac'
    );

    await removeRulePackageFile(
      adapter,
      'core-rules'
    );

    assert.deepEqual(
      await listRulePackageFiles(
        adapter
      ),
      []
    );
  }
);


test(
  'createRulePackagePath keeps package path workspace-relative',
  () => {

    assert.equal(
      createRulePackagePath('../Bad Package'),
      'rule-packages/bad-package.rule-package.json'
    );
  }
);


function createMemoryStorageAdapter() {

  const files =
    new Map();

  const directories =
    new Set([
      ''
    ]);

  return {
    async ensureDirectory(path) {

      directories.add(
        normalize(path)
      );
    },

    async writeText(path, content) {

      const normalized =
        normalize(path);

      directories.add(
        normalized.split('/').slice(0, -1).join('/')
      );

      files.set(
        normalized,
        String(content)
      );
    },

    async readText(path) {

      return files.get(
        normalize(path)
      );
    },

    async listFiles(path) {

      const prefix =
        `${normalize(path)}/`;

      return [...files.keys()]
        .filter(filePath =>
          filePath.startsWith(
            prefix
          )
        )
        .map(filePath => ({
          kind: 'file',
          name:
            filePath.slice(
              prefix.length
            )
        }));
    },

    async removeFile(path) {

      files.delete(
        normalize(path)
      );
    }
  };
}


function normalize(
  path
) {

  return String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replaceAll('..', '')
    .replace(/^-+|-+$/g, '');
}
