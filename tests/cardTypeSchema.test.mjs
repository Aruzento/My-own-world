import './setup.mjs';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateCardTypeDefinition,
  validateFieldSetDefinition
} from '../js/cardTypes/cardTypeSchema.js';

import {
  CardTypeRegistry
} from '../js/cardTypes/cardTypeRegistry.js';

import {
  digestDefinition
} from '../js/cardTypes/definitionIdentity.js';


test(
  'card type schema accepts the declarative Stage 2 field model',
  () => {
    const definition = typeDefinition({
      fields: [
        field('dnd.name', {
          datatype: 'string',
          format: 'multiline',
          default: ''
        }),
        field('dnd.level', {
          datatype: 'integer',
          min: 1,
          max: 20,
          default: 1,
          required: true
        }),
        field('dnd.kind', {
          datatype: 'enum',
          options: [
            { value: 'hero', label: 'Герой' },
            { value: 'npc', label: 'NPC' }
          ]
        }),
        field('dnd.race', {
          datatype: 'reference',
          targetTypes: ['race']
        }),
        field('dnd.sources', {
          datatype: 'array',
          items: {
            datatype: 'object',
            rowIdentityKey: 'core.rowId',
            properties: [
              nestedField('core.rowId', {
                datatype: 'string',
                required: true,
                readonly: true
              }),
              nestedField('core.sourceText')
            ]
          }
        }),
        field('dnd.attackFormula', {
          datatype: 'string',
          format: 'formula',
          formula: {
            grammarId: 'dnd.formula',
            version: 1
          }
        }),
        field('dnd.modifier', {
          datatype: 'integer',
          readonly: true,
          computed: {
            resolverId: 'dnd.ability-modifier',
            version: 1,
            inputs: ['dnd.level'],
            options: { rounding: 'floor' },
            allowOverride: true
          },
          visibility: {
            all: [
              { present: 'dnd.level' },
              { in: ['dnd.kind', ['hero', 'npc']] }
            ]
          }
        })
      ],
      capabilities: {
        characterProjection: true
      },
      metadata: {
        icon: 'user'
      }
    });

    assert.equal(
      validateCardTypeDefinition(definition).ok,
      true
    );
  }
);


test(
  'Field Set schema accepts reusable definitions',
  () => {
    const validation =
      validateFieldSetDefinition(
        fieldSet('dnd.health', [
          field('dnd.hpCurrent', {
            datatype: 'integer',
            min: 0,
            required: true
          }),
          field('dnd.hpMax', {
            datatype: 'integer',
            min: 1,
            required: true
          })
        ])
      );

    assert.equal(validation.ok, true);
  }
);


test(
  'malformed and executable definitions are rejected',
  () => {
    const malformed = typeDefinition({
      fields: [
        field('dnd.bad', {
          datatype: 'mystery',
          callback: 'run-me'
        })
      ],
      metadata: {
        formatter() {}
      }
    });

    const validation = validateCardTypeDefinition(malformed);

    assert.equal(validation.ok, false);
    assert.ok(validation.errors.some(entry =>
      entry.code === 'field.unknown_datatype'
    ));
    assert.ok(validation.errors.some(entry =>
      entry.code === 'definition.executable_property_forbidden'
    ));
    assert.ok(validation.errors.some(entry =>
      entry.code === 'definition.executable_value_forbidden'
    ));
  }
);


test(
  'includes require exact pinned versions and reject latest or ranges',
  () => {
    for (const include of [
      { id: 'dnd.health' },
      { id: 'dnd.health', version: 'latest' },
      { id: 'dnd.health', version: '^1' },
      { id: 'dnd.health', version: 1, latest: true }
    ]) {
      const validation = validateCardTypeDefinition(
        typeDefinition({ includes: [include] })
      );

      assert.equal(validation.ok, false);
      assert.ok(validation.errors.some(entry =>
        entry.code === 'definition.include_requires_exact_version'
      ));
    }
  }
);


test(
  'unknown datatypes and invalid nested array/object definitions are rejected',
  () => {
    const validation = validateCardTypeDefinition(
      typeDefinition({
        fields: [
          field('dnd.unknown', { datatype: 'executable' }),
          field('dnd.emptyArray', { datatype: 'array' }),
          field('dnd.emptyObject', { datatype: 'object', properties: [] }),
          field('dnd.rows', {
            datatype: 'array',
            items: {
              datatype: 'object',
              properties: [nestedField('core.name')]
            }
          })
        ]
      })
    );

    assert.equal(validation.ok, false);
    assert.ok(validation.errors.some(entry => entry.code === 'field.array_missing_items'));
    assert.ok(validation.errors.some(entry => entry.code === 'field.object_missing_properties'));
    assert.ok(validation.errors.some(entry => entry.code === 'field.repeatable_object_missing_row_identity'));
  }
);


test(
  'typed references validate target type ids',
  () => {
    const validation = validateCardTypeDefinition(
      typeDefinition({
        fields: [
          field('dnd.owner', {
            datatype: 'reference',
            targetTypes: ['Character label', 'character']
          })
        ]
      })
    );

    assert.equal(validation.ok, false);
    assert.ok(validation.errors.some(entry =>
      entry.code === 'field.invalid_reference_target_type'
    ));
  }
);


test(
  'visibility predicates are bounded and data-only',
  () => {
    let nested = { present: 'dnd.flag' };
    for (let index = 0; index < 10; index += 1) {
      nested = { not: nested };
    }

    const invalidOperator = validateCardTypeDefinition(
      typeDefinition({
        fields: [field('dnd.flag')],
        fieldOverrides: {
          'dnd.flag': {
            visibility: { javascript: 'return true' }
          }
        }
      })
    );

    const tooDeep = validateCardTypeDefinition(
      typeDefinition({
        fields: [field('dnd.flag', { visibility: nested })]
      })
    );

    assert.equal(invalidOperator.ok, false);
    assert.equal(tooDeep.ok, false);
    assert.ok(tooDeep.errors.some(entry =>
      entry.code === 'field.invalid_visibility_predicate'
    ));
  }
);


test(
  'presentation overrides are allowed and semantic overrides are blocked',
  () => {
    const allowed = validateCardTypeDefinition(
      typeDefinition({
        fields: [field('dnd.level')],
        fieldOverrides: {
          'dnd.level': {
            label: 'Уровень героя',
            help: 'Presentation only',
            section: 'main',
            order: 3,
            visibility: { present: 'dnd.level' }
          }
        }
      })
    );
    const forbidden = validateCardTypeDefinition(
      typeDefinition({
        fields: [field('dnd.level')],
        fieldOverrides: {
          'dnd.level': {
            datatype: 'integer',
            required: true
          }
        }
      })
    );

    assert.equal(allowed.ok, true);
    assert.equal(forbidden.ok, false);
    assert.ok(forbidden.errors.some(entry =>
      entry.code === 'definition.semantic_override_forbidden'
    ));
  }
);


test(
  'metadata and content bindings retain their existing owners',
  () => {
    const valid = validateCardTypeDefinition(
      typeDefinition({
        fields: [
          field('core.pageType', {
            binding: { owner: 'page', path: 'type' }
          }),
          field('core.tags', {
            datatype: 'array',
            items: { datatype: 'string' },
            binding: { owner: 'page', path: 'tags' }
          }),
          field('core.blocks', {
            datatype: 'array',
            items: {
              datatype: 'object',
              rowIdentityKey: 'core.blockId',
              properties: [
                nestedField('core.blockId', {
                  required: true,
                  readonly: true
                })
              ]
            },
            binding: { owner: 'content', path: 'blocks' }
          })
        ]
      })
    );
    const duplicateOwner = validateCardTypeDefinition(
      typeDefinition({
        fields: [
          field('core.pageType', {
            binding: { owner: 'page', path: 'type' },
            default: 'character'
          })
        ]
      })
    );

    assert.equal(valid.ok, true);
    assert.equal(duplicateOwner.ok, false);
    assert.ok(duplicateOwner.errors.some(entry =>
      entry.code === 'field.non_variable_value_owner_conflict'
    ));
  }
);


test(
  'custom type and custom field identities follow canonical namespaces',
  () => {
    const custom = typeDefinition({
      id: 'custom:123e4567-e89b-42d3-a456-426614174000',
      fields: [
        field('custom.123e4567-e89b-42d3-a456-426614174001')
      ]
    });

    assert.equal(validateCardTypeDefinition(custom).ok, true);

    custom.id = 'custom:human-name';
    assert.equal(validateCardTypeDefinition(custom).ok, false);
  }
);


test(
  'Registry rejects include cycles',
  () => {
    assert.throws(
      () => new CardTypeRegistry({
        activatedFieldSets: [
          fieldSet('core.alpha', [], [{ id: 'core.beta', version: 1 }]),
          fieldSet('core.beta', [], [{ id: 'core.alpha', version: 1 }])
        ]
      }),
      error => error.code === 'CARD_TYPE_INCLUDE_CYCLE'
    );
  }
);


test(
  'Registry deduplicates a diamond include and preserves field provenance',
  () => {
    const registry = new CardTypeRegistry({
      activatedFieldSets: [
        fieldSet('core.base', [field('core.name')]),
        fieldSet('core.left', [field('core.leftValue')], [
          { id: 'core.base', version: 1 }
        ]),
        fieldSet('core.right', [field('core.rightValue')], [
          { id: 'core.base', version: 1 }
        ])
      ],
      activatedTypes: [
        typeDefinition({
          includes: [
            { id: 'core.right', version: 1 },
            { id: 'core.left', version: 1 }
          ]
        })
      ]
    });

    const resolved = registry.getResolvedType('character', 1);

    assert.deepEqual(
      resolved.fields.map(entry => entry.key),
      ['core.leftValue', 'core.name', 'core.rightValue']
    );
    assert.equal(
      resolved.fieldsByKey['core.name'].provenance.id,
      'core.base'
    );
    assert.equal(
      resolved.closure.filter(entry => entry.identity.id === 'core.base').length,
      1
    );
  }
);


test(
  'Registry blocks duplicate field keys from different semantic owners',
  () => {
    const registry = new CardTypeRegistry({
      activatedFieldSets: [
        fieldSet('core.one', [field('dnd.level')]),
        fieldSet('core.two', [field('dnd.level')])
      ],
      activatedTypes: [
        typeDefinition({
          includes: [
            { id: 'core.one', version: 1 },
            { id: 'core.two', version: 1 }
          ]
        })
      ]
    });

    assert.throws(
      () => registry.getResolvedType('character', 1),
      error => error.code === 'CARD_TYPE_FIELD_CONFLICT'
    );
  }
);


test(
  'Registry applies presentation overrides without changing semantic provenance',
  () => {
    const registry = new CardTypeRegistry({
      activatedFieldSets: [
        fieldSet('dnd.progression', [field('dnd.level')])
      ],
      activatedTypes: [
        typeDefinition({
          includes: [{ id: 'dnd.progression', version: 1 }],
          fieldOverrides: {
            'dnd.level': {
              label: 'Уровень персонажа',
              order: 20
            }
          }
        })
      ]
    });

    const resolved = registry.getResolvedType('character', 1);
    const level = resolved.fieldsByKey['dnd.level'];

    assert.equal(level.label, 'Уровень персонажа');
    assert.equal(level.provenance.id, 'dnd.progression');
    assert.equal(level.presentationProvenance.id, 'character');
    assert.equal(Object.isFrozen(resolved), true);
    assert.equal(Object.isFrozen(level), true);
  }
);


test(
  'Registry validates computed and visibility references against flattened fields',
  () => {
    const registry = new CardTypeRegistry({
      activatedTypes: [
        typeDefinition({
          fields: [
            field('dnd.result', {
              computed: {
                resolverId: 'dnd.total',
                version: 1,
                inputs: ['dnd.missing']
              }
            })
          ]
        })
      ]
    });

    assert.throws(
      () => registry.getResolvedType('character', 1),
      error => error.code === 'CARD_TYPE_FIELD_REFERENCE_MISSING'
    );
  }
);


test(
  'definition and closure digests are deterministic across load and UI order',
  () => {
    const firstType = typeDefinition({
      fields: [field('dnd.beta'), field('dnd.alpha')],
      includes: [
        { id: 'core.two', version: 1 },
        { id: 'core.one', version: 1 }
      ]
    });
    const secondType = typeDefinition({
      label: 'Different display label',
      fields: [field('dnd.alpha'), field('dnd.beta')],
      includes: [
        { id: 'core.one', version: 1 },
        { id: 'core.two', version: 1 }
      ]
    });
    const sets = [
      fieldSet('core.one', [field('core.first')]),
      fieldSet('core.two', [field('core.second')])
    ];

    assert.equal(
      digestDefinition('type', firstType),
      digestDefinition('type', secondType)
    );

    const firstRegistry = new CardTypeRegistry({
      activatedTypes: [firstType],
      activatedFieldSets: sets
    });
    const secondRegistry = new CardTypeRegistry({
      activatedTypes: [secondType],
      activatedFieldSets: [...sets].reverse()
    });

    assert.equal(
      firstRegistry.getResolvedType('character', 1).digest,
      secondRegistry.getResolvedType('character', 1).digest
    );
    assert.deepEqual(
      firstRegistry.getResolvedType('character', 1).fields.map(entry => entry.key),
      secondRegistry.getResolvedType('character', 1).fields.map(entry => entry.key)
    );
  }
);


test(
  'same id/version may repeat identically but divergent semantics are rejected',
  () => {
    const original = typeDefinition();

    assert.doesNotThrow(() => new CardTypeRegistry({
      bundledTypes: [original],
      activatedTypes: [structuredClone(original)]
    }));

    assert.throws(
      () => new CardTypeRegistry({
        bundledTypes: [original],
        activatedTypes: [
          typeDefinition({ fields: [field('dnd.changed')] })
        ]
      }),
      error => error.code === 'CARD_TYPE_DEFINITION_CONFLICT'
    );
  }
);


test(
  'old and new definition versions coexist and Registry never selects latest implicitly',
  () => {
    const registry = new CardTypeRegistry({
      activatedTypes: [
        typeDefinition({ version: 1, fields: [field('dnd.old')] }),
        typeDefinition({ version: 2, fields: [field('dnd.new')] })
      ]
    });

    assert.deepEqual(registry.listTypeVersions('character'), [1, 2]);
    assert.ok(registry.getResolvedType('character', 1).fieldsByKey['dnd.old']);
    assert.ok(registry.getResolvedType('character', 2).fieldsByKey['dnd.new']);
    assert.equal(registry.diagnoseType('character', 3).status, 'unsupported');
    assert.equal(registry.diagnoseType('missing', 1).status, 'missing');
    assert.throws(
      () => registry.getResolvedType('character'),
      error => error.code === 'CARD_TYPE_UNSUPPORTED_VERSION'
    );
  }
);


test(
  'Registry foundation has no DOM dependency',
  () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      get() {
        throw new Error('DOM access is forbidden');
      }
    });

    try {
      const registry = new CardTypeRegistry({
        activatedTypes: [typeDefinition()]
      });
      assert.equal(registry.getResolvedType('character', 1).id, 'character');
    } finally {
      if (previous) {
        Object.defineProperty(globalThis, 'document', previous);
      } else {
        delete globalThis.document;
      }
    }
  }
);


function typeDefinition(overrides = {}) {
  return {
    id: 'character',
    version: 1,
    label: 'Персонаж',
    includes: [],
    fields: [],
    sections: [
      { id: 'main', label: 'Основное', order: 1 }
    ],
    ...overrides
  };
}


function fieldSet(
  id,
  fields = [],
  includes = []
) {
  return {
    id,
    version: 1,
    label: id,
    includes,
    fields,
    sections: []
  };
}


function field(
  key,
  overrides = {}
) {
  return {
    key,
    label: key,
    datatype: 'string',
    binding: { owner: 'variables' },
    ...overrides
  };
}


function nestedField(
  key,
  overrides = {}
) {
  return {
    key,
    label: key,
    datatype: 'string',
    ...overrides
  };
}
