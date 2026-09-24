import {
  assertCardTypeDefinition,
  assertFieldSetDefinition
} from './cardTypeSchema.js';

import {
  createDefinitionIdentity,
  deepCloneData,
  deepFreeze,
  digestDefinitionClosure,
  stableStringify
} from './definitionIdentity.js';

import {
  BUNDLED_CARD_TYPE_DEFINITIONS,
  BUNDLED_FIELD_SET_DEFINITIONS
} from './definitions/bundledDefinitions.js';


export class CardTypeRegistryError extends Error {
  constructor(
    code,
    message,
    details = {}
  ) {
    super(message);
    this.name = 'CardTypeRegistryError';
    this.code = code;
    this.details = details;
  }
}


export class CardTypeRegistry {
  constructor({
    bundledTypes = BUNDLED_CARD_TYPE_DEFINITIONS,
    bundledFieldSets = BUNDLED_FIELD_SET_DEFINITIONS,
    activatedTypes = [],
    activatedFieldSets = [],
    candidateTypes = [],
    candidateFieldSets = []
  } = {}) {
    this.types = new Map();
    this.fieldSets = new Map();
    this.resolvedTypes = new Map();
    this.resolvedFieldSets = new Map();

    this.addDefinitions(
      'type',
      bundledTypes,
      'bundled',
      0
    );
    this.addDefinitions(
      'fieldSet',
      bundledFieldSets,
      'bundled',
      0
    );
    this.addDefinitions(
      'type',
      activatedTypes,
      'activated',
      1
    );
    this.addDefinitions(
      'fieldSet',
      activatedFieldSets,
      'activated',
      1
    );
    this.addDefinitions(
      'type',
      candidateTypes,
      'candidate',
      2
    );
    this.addDefinitions(
      'fieldSet',
      candidateFieldSets,
      'candidate',
      2
    );

    this.assertDefinitionGraph();
  }


  getTypeDefinition(
    id,
    version
  ) {
    return this.getEntry(
      'type',
      id,
      version
    ).definition;
  }


  getFieldSetDefinition(
    id,
    version
  ) {
    return this.getEntry(
      'fieldSet',
      id,
      version
    ).definition;
  }


  getResolvedType(
    id,
    version
  ) {
    const key = identityKey(id, version);

    if (!this.resolvedTypes.has(key)) {
      const typeEntry =
        this.getEntry('type', id, version);

      this.resolvedTypes.set(
        key,
        this.resolveDefinition(typeEntry)
      );
    }

    return this.resolvedTypes.get(key);
  }


  getResolvedFieldSet(
    id,
    version
  ) {
    const key = identityKey(id, version);

    if (!this.resolvedFieldSets.has(key)) {
      const fieldSetEntry =
        this.getEntry('fieldSet', id, version);

      this.resolvedFieldSets.set(
        key,
        this.resolveDefinition(fieldSetEntry)
      );
    }

    return this.resolvedFieldSets.get(key);
  }


  diagnoseType(
    id,
    version
  ) {
    try {
      const resolved = this.getResolvedType(id, version);
      return Object.freeze({
        ok: true,
        status: 'resolved',
        definition: resolved,
        error: null
      });
    } catch (error) {
      if (!(error instanceof CardTypeRegistryError)) throw error;

      return Object.freeze({
        ok: false,
        status:
          error.code === 'CARD_TYPE_UNSUPPORTED_VERSION'
            ? 'unsupported'
            : error.code === 'CARD_TYPE_DEFINITION_MISSING'
              ? 'missing'
              : 'incompatible',
        definition: null,
        error
      });
    }
  }


  getDefinitionClosure(
    kind,
    id,
    version
  ) {
    const entry = this.getEntry(kind, id, version);
    return this.collectClosure(entry)
      .map(item => Object.freeze({
        kind: item.kind,
        source: item.source,
        identity: item.identity,
        definition: item.definition
      }));
  }


  listTypeVersions(
    id
  ) {
    return listVersions(this.types, id);
  }


  listFieldSetVersions(
    id
  ) {
    return listVersions(this.fieldSets, id);
  }


  addDefinitions(
    kind,
    definitions,
    source,
    sourcePriority
  ) {
    if (!Array.isArray(definitions)) {
      throw new CardTypeRegistryError(
        'CARD_TYPE_INVALID_COLLECTION',
        `${kind} definitions must be an array.`,
        { kind, source }
      );
    }

    definitions.forEach(definition => {
      try {
        if (kind === 'type') {
          assertCardTypeDefinition(definition);
        } else {
          assertFieldSetDefinition(definition);
        }
      } catch (error) {
        throw new CardTypeRegistryError(
          'CARD_TYPE_INVALID_DEFINITION',
          error.message,
          {
            kind,
            source,
            id: definition?.id ?? null,
            version: definition?.version ?? null,
            issues: error.issues || []
          }
        );
      }

      this.addDefinition(
        kind,
        definition,
        source,
        sourcePriority
      );
    });
  }


  addDefinition(
    kind,
    definition,
    source,
    sourcePriority
  ) {
    const target =
      kind === 'type'
        ? this.types
        : this.fieldSets;
    const key =
      identityKey(definition.id, definition.version);
    const frozenDefinition =
      deepFreeze(deepCloneData(definition));
    const identity =
      createDefinitionIdentity(kind, frozenDefinition);
    const existing = target.get(key);

    if (existing && existing.identity.digest !== identity.digest) {
      throw new CardTypeRegistryError(
        'CARD_TYPE_DEFINITION_CONFLICT',
        'The same definition id/version has different immutable semantics.',
        {
          kind,
          id: definition.id,
          version: definition.version,
          existingDigest: existing.identity.digest,
          incomingDigest: identity.digest,
          existingSource: existing.source,
          incomingSource: source
        }
      );
    }

    if (
      existing &&
      existing.sourcePriority === sourcePriority &&
      stableStringify(existing.definition) !== stableStringify(frozenDefinition)
    ) {
      throw new CardTypeRegistryError(
        'CARD_TYPE_PRESENTATION_DUPLICATE_CONFLICT',
        'One source contains divergent presentation data for the same definition id/version.',
        {
          kind,
          id: definition.id,
          version: definition.version,
          digest: identity.digest,
          source
        }
      );
    }

    if (!existing || sourcePriority > existing.sourcePriority) {
      target.set(
        key,
        Object.freeze({
          kind,
          source,
          sourcePriority,
          identity,
          definition: frozenDefinition
        })
      );
    }
  }


  assertDefinitionGraph() {
    const visiting = new Set();
    const visited = new Set();

    for (const entry of this.fieldSets.values()) {
      this.visitFieldSetGraph(
        entry,
        visiting,
        visited,
        []
      );
    }

    for (const entry of this.types.values()) {
      for (const include of sortedIncludes(entry.definition.includes)) {
        this.getEntry('fieldSet', include.id, include.version);
      }
    }
  }


  visitFieldSetGraph(
    entry,
    visiting,
    visited,
    path
  ) {
    const key = identityKey(entry.definition.id, entry.definition.version);

    if (visiting.has(key)) {
      throw new CardTypeRegistryError(
        'CARD_TYPE_INCLUDE_CYCLE',
        'Field Set includes form a cycle.',
        {
          cycle: [...path, key]
        }
      );
    }

    if (visited.has(key)) return;

    visiting.add(key);

    for (const include of sortedIncludes(entry.definition.includes)) {
      this.visitFieldSetGraph(
        this.getEntry('fieldSet', include.id, include.version),
        visiting,
        visited,
        [...path, key]
      );
    }

    visiting.delete(key);
    visited.add(key);
  }


  getEntry(
    kind,
    id,
    version
  ) {
    const target =
      kind === 'type'
        ? this.types
        : this.fieldSets;
    const entry =
      target.get(identityKey(id, version));

    if (entry) return entry;

    const availableVersions = listVersions(target, id);
    const hasKnownId = availableVersions.length > 0;

    throw new CardTypeRegistryError(
      hasKnownId
        ? 'CARD_TYPE_UNSUPPORTED_VERSION'
        : 'CARD_TYPE_DEFINITION_MISSING',
      hasKnownId
        ? `Unsupported ${kind} version: ${id}@${version}.`
        : `Missing ${kind} definition: ${id}@${version}.`,
      {
        kind,
        id,
        version,
        availableVersions
      }
    );
  }


  collectClosure(
    rootEntry
  ) {
    const collected = new Map();

    const visit = entry => {
      const key =
        `${entry.kind}:${identityKey(entry.definition.id, entry.definition.version)}`;

      if (collected.has(key)) return;

      for (const include of sortedIncludes(entry.definition.includes)) {
        visit(
          this.getEntry('fieldSet', include.id, include.version)
        );
      }

      collected.set(key, entry);
    };

    visit(rootEntry);

    return [...collected.values()];
  }


  resolveDefinition(
    rootEntry
  ) {
    const closure = this.collectClosure(rootEntry);
    const fieldsByKey = {};
    const orderedFields = [];

    closure.forEach(entry => {
      [...entry.definition.fields]
        .sort((left, right) => left.key.localeCompare(right.key))
        .forEach(field => {
          const existing = fieldsByKey[field.key];

          if (existing) {
            throw new CardTypeRegistryError(
              'CARD_TYPE_FIELD_CONFLICT',
              'Different semantic owners declare the same field key.',
              {
                key: field.key,
                existingProvenance: existing.provenance,
                incomingProvenance:
                  createFieldProvenance(entry)
              }
            );
          }

          const resolvedField = {
            ...deepCloneData(field),
            provenance:
              createFieldProvenance(entry)
          };

          fieldsByKey[field.key] = resolvedField;
          orderedFields.push(resolvedField);
        });
    });

    closure.forEach(entry => {
      applyPresentationOverrides(
        fieldsByKey,
        entry.definition.fieldOverrides,
        entry
      );
    });

    validateResolvedFieldReferences(fieldsByKey);

    const frozenFields =
      orderedFields
        .sort(compareResolvedFields)
        .map(field => deepFreeze(field));
    const frozenIndex = {};
    frozenFields.forEach(field => {
      frozenIndex[field.key] = field;
    });

    const digest =
      digestDefinitionClosure(
        closure.map(entry => ({
          kind: entry.kind,
          definition: entry.definition
        }))
      );

    return deepFreeze({
      kind: rootEntry.kind,
      id: rootEntry.definition.id,
      version: rootEntry.definition.version,
      digest,
      source: rootEntry.source,
      definition: rootEntry.definition,
      fields: frozenFields,
      fieldsByKey: frozenIndex,
      closure:
        closure.map(entry => ({
          kind: entry.kind,
          source: entry.source,
          identity: entry.identity
        }))
    });
  }
}


function applyPresentationOverrides(
  fieldsByKey,
  overrides,
  ownerEntry
) {
  if (!overrides) return;

  Object.keys(overrides)
    .sort()
    .forEach(key => {
      const field = fieldsByKey[key];

      if (!field) {
        throw new CardTypeRegistryError(
          'CARD_TYPE_OVERRIDE_TARGET_MISSING',
          'Presentation override references a field outside the resolved definition.',
          {
            key,
            owner:
              createFieldProvenance(ownerEntry)
          }
        );
      }

      Object.assign(
        field,
        deepCloneData(overrides[key]),
        {
          presentationProvenance:
            createFieldProvenance(ownerEntry)
        }
      );
    });
}


function createFieldProvenance(entry) {
  return Object.freeze({
    kind: entry.kind,
    id: entry.definition.id,
    version: entry.definition.version,
    digest: entry.identity.digest
  });
}


function validateResolvedFieldReferences(fieldsByKey) {
  const declaredKeys = new Set(Object.keys(fieldsByKey));

  Object.values(fieldsByKey).forEach(field => {
    const referencedKeys = [];

    if (field.computed) {
      referencedKeys.push(...field.computed.inputs);
    }

    collectVisibilityKeys(
      field.visibility,
      referencedKeys
    );

    const missingKeys =
      [...new Set(referencedKeys)]
        .filter(key => !declaredKeys.has(key));

    if (missingKeys.length > 0) {
      throw new CardTypeRegistryError(
        'CARD_TYPE_FIELD_REFERENCE_MISSING',
        'Field contract references keys outside the resolved definition.',
        {
          key: field.key,
          missingKeys
        }
      );
    }
  });
}


function collectVisibilityKeys(
  predicate,
  output
) {
  if (!predicate || typeof predicate !== 'object') return;

  if (typeof predicate.present === 'string') {
    output.push(predicate.present);
  }

  if (Array.isArray(predicate.equals)) {
    output.push(predicate.equals[0]);
  }

  if (Array.isArray(predicate.in)) {
    output.push(predicate.in[0]);
  }

  if (Array.isArray(predicate.all)) {
    predicate.all.forEach(item => collectVisibilityKeys(item, output));
  }

  if (Array.isArray(predicate.any)) {
    predicate.any.forEach(item => collectVisibilityKeys(item, output));
  }

  if (predicate.not) {
    collectVisibilityKeys(predicate.not, output);
  }
}


function sortedIncludes(includes) {
  return [...includes]
    .sort((left, right) =>
      identityKey(left.id, left.version)
        .localeCompare(identityKey(right.id, right.version))
    );
}


function compareResolvedFields(left, right) {
  const leftOrder = Number.isFinite(left.order) ? left.order : 0;
  const rightOrder = Number.isFinite(right.order) ? right.order : 0;

  return leftOrder - rightOrder || left.key.localeCompare(right.key);
}


function listVersions(target, id) {
  return [...target.values()]
    .filter(entry => entry.definition.id === id)
    .map(entry => entry.definition.version)
    .sort((left, right) => left - right);
}


function identityKey(id, version) {
  return `${id}@${version}`;
}
