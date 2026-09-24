import {
  captureStorageWorkspaceContext,
  createContextBoundStorageAdapter,
  getStorageAdapter
} from './storageAdapter.js';

import {
  queueWrite
} from './writeQueue.js';

import {
  CardTypeRegistry,
  CardTypeRegistryError
} from '../cardTypes/cardTypeRegistry.js';

import {
  validateCardTypeCatalogData
} from '../cardTypes/cardTypeSchema.js';

import {
  deepCloneData,
  deepFreeze,
  digestCanonicalData,
  stableStringify
} from '../cardTypes/definitionIdentity.js';

import {
  BUNDLED_CARD_TYPE_DEFINITIONS,
  BUNDLED_FIELD_SET_DEFINITIONS
} from '../cardTypes/definitions/bundledDefinitions.js';


export const CARD_TYPE_CATALOG_PATH =
  '.my-own-world-card-types.json';

export const CARD_TYPE_CATALOG_FORMAT_VERSION =
  1;


export class CardTypeCatalogError extends Error {
  constructor(
    code,
    message,
    details = {}
  ) {
    super(message);
    this.name = 'CardTypeCatalogError';
    this.code = code;
    this.details = details;
  }
}


export function createEmptyCardTypeCatalog() {
  return {
    formatVersion: CARD_TYPE_CATALOG_FORMAT_VERSION,
    revision: 0,
    types: [],
    fieldSets: []
  };
}


export function parseCardTypeCatalog(
  text
) {
  let parsed;

  try {
    parsed = JSON.parse(String(text));
  } catch (error) {
    throw new CardTypeCatalogError(
      'CARD_TYPE_CATALOG_INVALID_JSON',
      'Card type catalog is not valid JSON.',
      { cause: String(error?.message || error) }
    );
  }

  assertValidCatalog(parsed);

  try {
    // The catalog itself must contain the complete activated closure.
    new CardTypeRegistry({
      bundledTypes: [],
      bundledFieldSets: [],
      activatedTypes: parsed.types,
      activatedFieldSets: parsed.fieldSets
    });
  } catch (error) {
    throw catalogRegistryError(error);
  }

  return deepFreeze(deepCloneData(parsed));
}


export function serializeCardTypeCatalog(
  catalog
) {
  assertValidCatalog(catalog);
  assertCatalogClosure(catalog);

  const normalized = normalizeCatalog(catalog);

  return `${JSON.stringify(normalized, null, 2)}\n`;
}


export async function readCardTypeCatalog({
  storageAdapter = getStorageAdapter()
} = {}) {
  let text;

  try {
    text = await storageAdapter.readText(
      CARD_TYPE_CATALOG_PATH
    );
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }

  const exists =
    typeof text === 'string';
  const catalog =
    exists
      ? parseCardTypeCatalog(text)
      : deepFreeze(createEmptyCardTypeCatalog());

  return Object.freeze({
    exists,
    catalog,
    identity:
      createCatalogIdentity(catalog)
  });
}


export async function activateCardTypeDefinitions({
  types = [],
  fieldSets = [],
  expectedIdentity,
  storageAdapter = null,
  workspaceContext = null,
  bundledTypes = BUNDLED_CARD_TYPE_DEFINITIONS,
  bundledFieldSets = BUNDLED_FIELD_SET_DEFINITIONS
} = {}) {
  if (!expectedIdentity) {
    throw new CardTypeCatalogError(
      'CARD_TYPE_CATALOG_EXPECTED_IDENTITY_REQUIRED',
      'Catalog mutation requires the revision and digest returned by readCardTypeCatalog().'
    );
  }

  const mutationAdapter =
    resolveMutationStorageAdapter(
      storageAdapter,
      workspaceContext
    );

  return queueWrite(
    CARD_TYPE_CATALOG_PATH,
    async () => {
      const current =
        await readCardTypeCatalog({ storageAdapter: mutationAdapter });

      assertExpectedIdentity(
        expectedIdentity,
        current.identity
      );

      if (types.length === 0 && fieldSets.length === 0) {
        return current;
      }

      let registry;

      try {
        registry = new CardTypeRegistry({
          bundledTypes,
          bundledFieldSets,
          activatedTypes: current.catalog.types,
          activatedFieldSets: current.catalog.fieldSets,
          candidateTypes: types,
          candidateFieldSets: fieldSets
        });
      } catch (error) {
        throw catalogRegistryError(error);
      }

      const activatedTypes =
        new Map(
          current.catalog.types.map(definition => [
            definitionKey(definition),
            definition
          ])
        );
      const activatedFieldSets =
        new Map(
          current.catalog.fieldSets.map(definition => [
            definitionKey(definition),
            definition
          ])
        );

      for (const definition of fieldSets) {
        addClosureToCatalogMaps(
          registry.getDefinitionClosure(
            'fieldSet',
            definition.id,
            definition.version
          ),
          activatedTypes,
          activatedFieldSets
        );
      }

      for (const definition of types) {
        addClosureToCatalogMaps(
          registry.getDefinitionClosure(
            'type',
            definition.id,
            definition.version
          ),
          activatedTypes,
          activatedFieldSets
        );
      }

      const candidate = normalizeCatalog({
        formatVersion: CARD_TYPE_CATALOG_FORMAT_VERSION,
        revision: current.catalog.revision + 1,
        types: [...activatedTypes.values()],
        fieldSets: [...activatedFieldSets.values()]
      });

      // Reparse before write so the persisted catalog is independently valid
      // and contains no unresolved bundled-only dependency.
      parseCardTypeCatalog(
        serializeCardTypeCatalog(candidate)
      );

      await mutationAdapter.writeText(
        CARD_TYPE_CATALOG_PATH,
        serializeCardTypeCatalog(candidate)
      );

      const readback =
        await readCardTypeCatalog({ storageAdapter: mutationAdapter });

      if (
        readback.catalog.revision !== candidate.revision ||
        readback.identity.digest !== createCatalogIdentity(candidate).digest
      ) {
        throw new CardTypeCatalogError(
          'CARD_TYPE_CATALOG_READBACK_FAILED',
          'Card type catalog readback does not match the written candidate.',
          {
            expectedRevision: candidate.revision,
            actualRevision: readback.catalog.revision,
            expectedDigest: createCatalogIdentity(candidate).digest,
            actualDigest: readback.identity.digest
          }
        );
      }

      return readback;
    }
  );
}


export function createCardTypeRegistryFromCatalog(
  catalog,
  {
    bundledTypes = BUNDLED_CARD_TYPE_DEFINITIONS,
    bundledFieldSets = BUNDLED_FIELD_SET_DEFINITIONS
  } = {}
) {
  assertValidCatalog(catalog);
  assertCatalogClosure(catalog);

  return new CardTypeRegistry({
    bundledTypes,
    bundledFieldSets,
    activatedTypes: catalog.types,
    activatedFieldSets: catalog.fieldSets
  });
}


export function createCatalogIdentity(
  catalog
) {
  const normalized = normalizeCatalog(catalog);

  return Object.freeze({
    revision: normalized.revision,
    digest:
      digestCanonicalData(normalized)
  });
}


function addClosureToCatalogMaps(
  closure,
  types,
  fieldSets
) {
  closure.forEach(entry => {
    const target =
      entry.kind === 'type'
        ? types
        : fieldSets;
    const key = definitionKey(entry.definition);
    const existing = target.get(key);

    if (
      existing &&
      stableStringify(existing) !== stableStringify(entry.definition)
    ) {
      throw new CardTypeCatalogError(
        'CARD_TYPE_CATALOG_IMMUTABLE_DEFINITION_CONFLICT',
        'An activated definition cannot be changed in place.',
        {
          kind: entry.kind,
          id: entry.definition.id,
          version: entry.definition.version
        }
      );
    }

    target.set(
      key,
      deepCloneData(entry.definition)
    );
  });
}


function assertExpectedIdentity(
  expected,
  actual
) {
  if (
    expected.revision !== actual.revision ||
    expected.digest !== actual.digest
  ) {
    throw new CardTypeCatalogError(
      'CARD_TYPE_CATALOG_STALE_WRITE',
      'Card type catalog changed after it was read.',
      {
        expected,
        actual
      }
    );
  }
}


function assertValidCatalog(catalog) {
  const validation = validateCardTypeCatalogData(catalog);

  if (!validation.ok) {
    throw new CardTypeCatalogError(
      'CARD_TYPE_CATALOG_INVALID',
      validation.errors[0].message,
      { issues: validation.issues }
    );
  }
}


function assertCatalogClosure(catalog) {
  try {
    new CardTypeRegistry({
      bundledTypes: [],
      bundledFieldSets: [],
      activatedTypes: catalog.types,
      activatedFieldSets: catalog.fieldSets
    });
  } catch (error) {
    throw catalogRegistryError(error);
  }
}


function resolveMutationStorageAdapter(
  storageAdapter,
  workspaceContext
) {
  if (storageAdapter) return storageAdapter;

  const context =
    workspaceContext || captureStorageWorkspaceContext();

  return createContextBoundStorageAdapter(context);
}


function normalizeCatalog(catalog) {
  return {
    formatVersion: CARD_TYPE_CATALOG_FORMAT_VERSION,
    revision: catalog.revision,
    types:
      [...catalog.types]
        .map(deepCloneData)
        .sort(compareDefinitions),
    fieldSets:
      [...catalog.fieldSets]
        .map(deepCloneData)
        .sort(compareDefinitions)
  };
}


function compareDefinitions(left, right) {
  return definitionKey(left)
    .localeCompare(definitionKey(right));
}


function definitionKey(definition) {
  return `${definition.id}@${definition.version}`;
}


function catalogRegistryError(error) {
  if (error instanceof CardTypeCatalogError) return error;

  if (error instanceof CardTypeRegistryError) {
    return new CardTypeCatalogError(
      'CARD_TYPE_CATALOG_DEFINITION_ERROR',
      error.message,
      {
        registryCode: error.code,
        ...error.details
      }
    );
  }

  return error;
}


function isMissingFileError(error) {
  const code = String(error?.code || error?.name || '');
  const message = String(error?.message || error || '');

  return code === 'ENOENT' ||
    code === 'NotFoundError' ||
    /not found|cannot find|не найден/i.test(message);
}
