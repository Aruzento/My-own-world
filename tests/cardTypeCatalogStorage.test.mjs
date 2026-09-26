import './setup.mjs';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CARD_TYPE_CATALOG_PATH,
  activateCardTypeDefinitions,
  createCardTypeRegistryFromCatalog,
  parseCardTypeCatalog,
  readCardTypeCatalog,
  serializeCardTypeCatalog
} from '../js/storage/cardTypeCatalogStorage.js';


test(
  'card type catalog round-trips deterministically',
  () => {
    const catalog = {
      formatVersion: 1,
      revision: 3,
      types: [typeDefinition()],
      fieldSets: [healthFieldSet()]
    };

    const serialized = serializeCardTypeCatalog(catalog);
    const parsed = parseCardTypeCatalog(serialized);

    assert.equal(serialized, serializeCardTypeCatalog(parsed));
    assert.equal(Object.isFrozen(parsed), true);
    assert.equal(parsed.revision, 3);
  }
);


test(
  'activation persists bundled transitive closure and makes catalog canonical',
  async () => {
    const adapter = createMemoryAdapter();
    const initial = await readCardTypeCatalog({ storageAdapter: adapter });
    const activated = await activateCardTypeDefinitions({
      storageAdapter: adapter,
      expectedIdentity: initial.identity,
      bundledTypes: [],
      bundledFieldSets: [healthFieldSet()],
      types: [typeDefinition()]
    });

    assert.equal(activated.catalog.revision, 1);
    assert.deepEqual(
      activated.catalog.fieldSets.map(entry => entry.id),
      ['dnd.health']
    );
    assert.deepEqual(
      activated.catalog.types.map(entry => entry.id),
      ['test-character']
    );
    assert.equal(
      adapter.files.has(CARD_TYPE_CATALOG_PATH),
      true
    );

    const registry = createCardTypeRegistryFromCatalog(activated.catalog);
    assert.equal(
      registry.getResolvedType('test-character', 1).fieldsByKey['dnd.hpCurrent'].provenance.id,
      'dnd.health'
    );
  }
);


test(
  'catalog mutation rejects stale optimistic identity',
  async () => {
    const adapter = createMemoryAdapter();
    const initial = await readCardTypeCatalog({ storageAdapter: adapter });

    await activateCardTypeDefinitions({
      storageAdapter: adapter,
      expectedIdentity: initial.identity,
      fieldSets: [healthFieldSet()]
    });

    await assert.rejects(
      activateCardTypeDefinitions({
        storageAdapter: adapter,
        expectedIdentity: initial.identity,
        fieldSets: [
          {
            ...healthFieldSet(),
            id: 'dnd.progression',
            fields: [field('dnd.level')]
          }
        ]
      }),
      error => error.code === 'CARD_TYPE_CATALOG_STALE_WRITE'
    );
  }
);


test(
  'activated id/version is immutable even when candidate reuses it',
  async () => {
    const adapter = createMemoryAdapter();
    const initial = await readCardTypeCatalog({ storageAdapter: adapter });
    const first = await activateCardTypeDefinitions({
      storageAdapter: adapter,
      expectedIdentity: initial.identity,
      fieldSets: [healthFieldSet()]
    });

    await assert.rejects(
      activateCardTypeDefinitions({
        storageAdapter: adapter,
        expectedIdentity: first.identity,
        fieldSets: [
          {
            ...healthFieldSet(),
            fields: [
              field('dnd.hpCurrent', { datatype: 'number' })
            ]
          }
        ]
      }),
      error =>
        error.code === 'CARD_TYPE_CATALOG_DEFINITION_ERROR' &&
        error.details.registryCode === 'CARD_TYPE_DEFINITION_CONFLICT'
    );
  }
);


test(
  'catalog parser rejects missing activated closure and conflicting duplicates',
  () => {
    const missingClosure = JSON.stringify({
      formatVersion: 1,
      revision: 1,
      types: [typeDefinition()],
      fieldSets: []
    });
    const duplicate = JSON.stringify({
      formatVersion: 1,
      revision: 1,
      types: [],
      fieldSets: [healthFieldSet(), healthFieldSet()]
    });

    assert.throws(
      () => parseCardTypeCatalog(missingClosure),
      error => error.code === 'CARD_TYPE_CATALOG_DEFINITION_ERROR'
    );
    assert.throws(
      () => parseCardTypeCatalog(duplicate),
      error => error.code === 'CARD_TYPE_CATALOG_INVALID'
    );
  }
);


function typeDefinition() {
  return {
    id: 'test-character',
    version: 1,
    label: 'Персонаж',
    includes: [
      { id: 'dnd.health', version: 1 }
    ],
    fields: [],
    sections: []
  };
}


function healthFieldSet() {
  return {
    id: 'dnd.health',
    version: 1,
    label: 'Health',
    includes: [],
    fields: [
      field('dnd.hpCurrent', {
        datatype: 'integer',
        min: 0
      })
    ],
    sections: []
  };
}


function field(key, overrides = {}) {
  return {
    key,
    label: key,
    datatype: 'string',
    binding: { owner: 'variables' },
    ...overrides
  };
}


function createMemoryAdapter() {
  const files = new Map();

  return {
    files,

    async readText(path) {
      return files.get(path);
    },

    async writeText(path, content) {
      files.set(path, String(content));
    }
  };
}
