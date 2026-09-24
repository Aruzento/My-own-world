import {
  createSchemaIssue,
  createValidationResult,
  isNonEmptyString,
  isPlainObject
} from '../schema/schemaValidation.js';


export const CARD_TYPE_DATATYPES = Object.freeze([
  'string',
  'number',
  'integer',
  'boolean',
  'enum',
  'date',
  'datetime',
  'color',
  'asset',
  'reference',
  'array',
  'object'
]);

export const CARD_FIELD_BINDING_OWNERS = Object.freeze([
  'variables',
  'page',
  'content',
  'presentation'
]);

export const CARD_FIELD_PRESENTATION_OVERRIDE_KEYS = Object.freeze([
  'label',
  'help',
  'section',
  'group',
  'order',
  'visibility'
]);

export const CARD_TYPE_VISIBILITY_LIMITS = Object.freeze({
  maxDepth: 8,
  maxNodes: 64,
  maxMembershipValues: 64
});

const CARD_TYPE_ID_PATTERN =
  /^(?:[a-z][a-z0-9-]*|custom:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

const FIELD_KEY_PATTERN =
  /^(?:[a-z][a-zA-Z0-9-]*(?:\.[a-z][a-zA-Z0-9-]*)+|custom\.[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

const FIELD_SET_ID_PATTERN =
  /^(?:[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+|custom:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

const RESOLVER_ID_PATTERN =
  /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;

const PAGE_BINDING_PATHS = new Set([
  'id',
  'type',
  'template',
  'tags',
  'aliases',
  'parent',
  'order',
  'relationships',
  'iconJson',
  'archived'
]);

const CONTENT_BINDING_PATHS = new Set([
  'title',
  'primaryImage',
  'blocks',
  'content'
]);

const EXECUTABLE_PROPERTY_NAMES = new Set([
  'script',
  'callback',
  'handler',
  'function',
  'eval',
  'import',
  'dynamicImport',
  'module'
]);

const VISIBILITY_OPERATORS = new Set([
  'all',
  'any',
  'not',
  'equals',
  'in',
  'present'
]);

const RESERVED_OBJECT_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype'
]);

const DEFINITION_KEYS = new Set([
  'id',
  'version',
  'label',
  'includes',
  'fields',
  'sections',
  'fieldOverrides',
  'capabilities',
  'metadata'
]);

const FIELD_KEYS = new Set([
  'key',
  'label',
  'help',
  'datatype',
  'binding',
  'default',
  'nullable',
  'required',
  'readonly',
  'computed',
  'min',
  'max',
  'options',
  'targetTypes',
  'items',
  'properties',
  'rowIdentityKey',
  'validation',
  'section',
  'group',
  'order',
  'visibility',
  'deprecated',
  'format',
  'formula'
]);

const VALUE_DESCRIPTOR_KEYS = new Set([
  'datatype',
  'nullable',
  'min',
  'max',
  'options',
  'targetTypes',
  'items',
  'properties',
  'rowIdentityKey',
  'validation',
  'format',
  'formula'
]);


export function validateCardTypeDefinition(
  definition
) {
  return validateDefinition(
    definition,
    'type'
  );
}


export function validateFieldSetDefinition(
  definition
) {
  return validateDefinition(
    definition,
    'fieldSet'
  );
}


export function validateCardTypeCatalogData(
  catalog
) {
  const issues = [];

  if (!isPlainObject(catalog)) {
    return createValidationResult([
      issue(
        'catalog.invalid_data',
        'Card type catalog must be a plain object.'
      )
    ]);
  }

  if (catalog.formatVersion !== 1) {
    issues.push(issue(
      'catalog.unsupported_format_version',
      'Card type catalog formatVersion must be 1.',
      { formatVersion: catalog.formatVersion }
    ));
  }

  if (!Number.isInteger(catalog.revision) || catalog.revision < 0) {
    issues.push(issue(
      'catalog.invalid_revision',
      'Card type catalog revision must be a non-negative integer.',
      { revision: catalog.revision }
    ));
  }

  validateDefinitionCollection(
    catalog.types,
    'type',
    issues
  );

  validateDefinitionCollection(
    catalog.fieldSets,
    'fieldSet',
    issues
  );

  validateDataOnlyTree(
    catalog,
    '$',
    issues
  );

  validateKnownKeys(
    catalog,
    new Set(['formatVersion', 'revision', 'types', 'fieldSets']),
    'catalog.unknown_property',
    'Card type catalog contains an unsupported property.',
    issues,
    {}
  );

  return createValidationResult(issues);
}


export function assertCardTypeDefinition(
  definition
) {
  return assertDefinition(
    definition,
    'type'
  );
}


export function assertFieldSetDefinition(
  definition
) {
  return assertDefinition(
    definition,
    'fieldSet'
  );
}


export function isCardTypeId(value) {
  return typeof value === 'string' &&
    CARD_TYPE_ID_PATTERN.test(value);
}


export function isCardFieldKey(value) {
  return typeof value === 'string' &&
    FIELD_KEY_PATTERN.test(value);
}


export function isFieldSetId(value) {
  return typeof value === 'string' &&
    FIELD_SET_ID_PATTERN.test(value);
}


function validateDefinition(
  definition,
  kind
) {
  const issues = [];

  if (!isPlainObject(definition)) {
    return createValidationResult([
      issue(
        'definition.invalid_data',
        `${kind} definition must be a plain object.`,
        { kind }
      )
    ]);
  }

  validateDataOnlyTree(
    definition,
    '$',
    issues
  );

  validateKnownKeys(
    definition,
    DEFINITION_KEYS,
    'definition.unknown_property',
    'Definition contains an unsupported property.',
    issues,
    { kind, id: definition.id ?? null }
  );

  const validId =
    kind === 'type'
      ? isCardTypeId(definition.id)
      : isFieldSetId(definition.id);

  if (!validId) {
    issues.push(issue(
      'definition.invalid_id',
      `${kind} definition has an invalid stable id.`,
      { kind, id: definition.id ?? null }
    ));
  }

  if (!Number.isInteger(definition.version) || definition.version < 1) {
    issues.push(issue(
      'definition.invalid_version',
      'Definition version must be a positive integer.',
      { id: definition.id ?? null, version: definition.version }
    ));
  }

  if (!isNonEmptyString(definition.label)) {
    issues.push(issue(
      'definition.invalid_label',
      'Definition label must be a non-empty string.',
      { id: definition.id ?? null }
    ));
  }

  validateIncludes(
    definition.includes,
    issues,
    definition.id
  );

  validateFields(
    definition.fields,
    issues,
    definition.id
  );

  validateSections(
    definition.sections,
    issues,
    definition.id
  );

  validatePresentationOverrides(
    definition.fieldOverrides,
    issues,
    definition.id
  );

  for (const key of ['capabilities', 'metadata']) {
    if (
      definition[key] !== undefined &&
      !isPlainObject(definition[key])
    ) {
      issues.push(issue(
        `definition.invalid_${key}`,
        `Definition ${key} must be a plain data object.`,
        { id: definition.id ?? null }
      ));
    }
  }

  return createValidationResult(issues);
}


function assertDefinition(
  definition,
  kind
) {
  const validation =
    kind === 'type'
      ? validateCardTypeDefinition(definition)
      : validateFieldSetDefinition(definition);

  if (!validation.ok) {
    const error = new Error(
      `Invalid ${kind} definition: ${validation.errors[0].message}`
    );
    error.code = 'CARD_TYPE_DEFINITION_INVALID';
    error.issues = validation.issues;
    throw error;
  }

  return definition;
}


function validateDefinitionCollection(
  definitions,
  kind,
  issues
) {
  if (!Array.isArray(definitions)) {
    issues.push(issue(
      `catalog.invalid_${kind === 'type' ? 'types' : 'field_sets'}`,
      `Catalog ${kind === 'type' ? 'types' : 'fieldSets'} must be an array.`
    ));
    return;
  }

  const identities = new Set();

  definitions.forEach((definition, index) => {
    const validation =
      kind === 'type'
        ? validateCardTypeDefinition(definition)
        : validateFieldSetDefinition(definition);

    validation.issues.forEach(entry => {
      issues.push({
        ...entry,
        details: {
          ...entry.details,
          collection: kind,
          index
        }
      });
    });

    const identity =
      `${definition?.id || ''}@${definition?.version || ''}`;

    if (identities.has(identity)) {
      issues.push(issue(
        'catalog.duplicate_definition_identity',
        'Catalog contains a duplicate definition id/version.',
        { kind, identity, index }
      ));
    }

    identities.add(identity);
  });
}


function validateIncludes(
  includes,
  issues,
  ownerId
) {
  if (!Array.isArray(includes)) {
    issues.push(issue(
      'definition.invalid_includes',
      'Definition includes must be an array.',
      { ownerId: ownerId ?? null }
    ));
    return;
  }

  const identities = new Set();

  includes.forEach((include, index) => {
    if (!isPlainObject(include)) {
      issues.push(issue(
        'definition.invalid_include',
        'Each include must be an object with exact id and version.',
        { ownerId: ownerId ?? null, index }
      ));
      return;
    }

    const keys = Object.keys(include);
    if (
      keys.some(key => !['id', 'version'].includes(key)) ||
      !isFieldSetId(include.id) ||
      !Number.isInteger(include.version) ||
      include.version < 1
    ) {
      issues.push(issue(
        'definition.include_requires_exact_version',
        'Include must pin one Field Set by exact id and positive integer version.',
        { ownerId: ownerId ?? null, index, include }
      ));
      return;
    }

    const identity = `${include.id}@${include.version}`;
    if (identities.has(identity)) {
      issues.push(issue(
        'definition.duplicate_include',
        'Definition repeats the same exact include.',
        { ownerId: ownerId ?? null, identity }
      ));
    }
    identities.add(identity);
  });
}


function validateFields(
  fields,
  issues,
  ownerId
) {
  if (!Array.isArray(fields)) {
    issues.push(issue(
      'definition.invalid_fields',
      'Definition fields must be an array.',
      { ownerId: ownerId ?? null }
    ));
    return;
  }

  const keys = new Set();

  fields.forEach((field, index) => {
    validateField(
      field,
      issues,
      {
        path: `fields[${index}]`,
        ownerId,
        nested: false
      }
    );

    if (isCardFieldKey(field?.key)) {
      if (keys.has(field.key)) {
        issues.push(issue(
          'definition.duplicate_field_key',
          'Definition contains the same field key more than once.',
          { ownerId: ownerId ?? null, key: field.key }
        ));
      }
      keys.add(field.key);
    }
  });
}


function validateField(
  field,
  issues,
  context
) {
  if (!isPlainObject(field)) {
    issues.push(issue(
      'field.invalid_data',
      'Field definition must be a plain object.',
      context
    ));
    return;
  }

  validateKnownKeys(
    field,
    FIELD_KEYS,
    'field.unknown_property',
    'Field contains an unsupported property.',
    issues,
    context
  );

  if (!isCardFieldKey(field.key)) {
    issues.push(issue(
      'field.invalid_key',
      'Field key must be a stable qualified key.',
      { ...context, key: field.key ?? null }
    ));
  }

  if (!isNonEmptyString(field.label)) {
    issues.push(issue(
      'field.invalid_label',
      'Field label must be a non-empty string.',
      { ...context, key: field.key ?? null }
    ));
  }

  validateValueShape(
    field,
    issues,
    context
  );

  if (!context.nested) {
    validateBinding(
      field,
      issues,
      context
    );
  } else if (field.binding !== undefined) {
    issues.push(issue(
      'field.nested_binding_forbidden',
      'Nested object properties inherit the top-level field owner and cannot bind independently.',
      { ...context, key: field.key ?? null }
    ));
  }

  for (const flag of [
    'nullable',
    'required',
    'readonly',
    'deprecated'
  ]) {
    if (field[flag] !== undefined && typeof field[flag] !== 'boolean') {
      issues.push(issue(
        `field.invalid_${flag}`,
        `Field ${flag} must be boolean.`,
        { ...context, key: field.key ?? null }
      ));
    }
  }

  if (field.help !== undefined && typeof field.help !== 'string') {
    issues.push(issue(
      'field.invalid_help',
      'Field help must be a string.',
      { ...context, key: field.key ?? null }
    ));
  }

  for (const attribute of ['section', 'group']) {
    if (field[attribute] !== undefined && typeof field[attribute] !== 'string') {
      issues.push(issue(
        `field.invalid_${attribute}`,
        `Field ${attribute} must be a string.`,
        { ...context, key: field.key ?? null }
      ));
    }
  }

  if (field.order !== undefined && !Number.isFinite(field.order)) {
    issues.push(issue(
      'field.invalid_order',
      'Field order must be a finite number.',
      { ...context, key: field.key ?? null }
    ));
  }

  if (field.computed !== undefined) {
    validateComputed(
      field.computed,
      issues,
      context,
      field.key
    );
  }

  if (field.visibility !== undefined) {
    validateVisibility(
      field.visibility,
      issues,
      context,
      field.key
    );
  }

  if (field.default !== undefined) {
    validateDefaultValue(
      field,
      issues,
      context
    );
  }

  if (
    field.min !== undefined &&
    !Number.isFinite(field.min)
  ) {
    issues.push(issue(
      'field.invalid_min',
      'Field min must be a finite number.',
      { ...context, key: field.key ?? null }
    ));
  }

  if (
    field.max !== undefined &&
    !Number.isFinite(field.max)
  ) {
    issues.push(issue(
      'field.invalid_max',
      'Field max must be a finite number.',
      { ...context, key: field.key ?? null }
    ));
  }

  if (
    Number.isFinite(field.min) &&
    Number.isFinite(field.max) &&
    field.min > field.max
  ) {
    issues.push(issue(
      'field.invalid_range',
      'Field min cannot be greater than max.',
      { ...context, key: field.key ?? null }
    ));
  }

  if (
    field.validation !== undefined &&
    !isPlainObject(field.validation)
  ) {
    issues.push(issue(
      'field.invalid_validation',
      'Field validation metadata must be a plain data object.',
      { ...context, key: field.key ?? null }
    ));
  }
}


function validateValueShape(
  descriptor,
  issues,
  context
) {
  if (!CARD_TYPE_DATATYPES.includes(descriptor.datatype)) {
    issues.push(issue(
      'field.unknown_datatype',
      'Field datatype is not supported.',
      { ...context, key: descriptor.key ?? null, datatype: descriptor.datatype ?? null }
    ));
    return;
  }

  if (
    descriptor.format !== undefined &&
    !['singleline', 'multiline', 'formula'].includes(descriptor.format)
  ) {
    issues.push(issue(
      'field.invalid_format',
      'String format must be singleline, multiline or formula.',
      { ...context, key: descriptor.key ?? null, format: descriptor.format }
    ));
  }

  if (descriptor.format !== undefined && descriptor.datatype !== 'string') {
    issues.push(issue(
      'field.format_datatype_mismatch',
      'Field format is only valid for string fields.',
      { ...context, key: descriptor.key ?? null }
    ));
  }

  if (descriptor.format === 'formula') {
    if (
      !isPlainObject(descriptor.formula) ||
      !RESOLVER_ID_PATTERN.test(descriptor.formula.grammarId || '') ||
      !Number.isInteger(descriptor.formula.version) ||
      descriptor.formula.version < 1
    ) {
      issues.push(issue(
        'field.invalid_formula_contract',
        'Formula strings must pin a bounded grammar id and version.',
        { ...context, key: descriptor.key ?? null }
      ));
    }

    if (isPlainObject(descriptor.formula)) {
      validateKnownKeys(
        descriptor.formula,
        new Set(['grammarId', 'version', 'options']),
        'field.invalid_formula_contract',
        'Formula contract contains an unsupported property.',
        issues,
        { ...context, key: descriptor.key ?? null }
      );

      if (
        descriptor.formula.options !== undefined &&
        !isPlainObject(descriptor.formula.options)
      ) {
        issues.push(issue(
          'field.invalid_formula_contract',
          'Formula grammar options must be a plain data object.',
          { ...context, key: descriptor.key ?? null }
        ));
      }
    }
  } else if (descriptor.formula !== undefined) {
    issues.push(issue(
      'field.unexpected_formula_contract',
      'Formula contract is only valid for string fields with formula format.',
      { ...context, key: descriptor.key ?? null }
    ));
  }

  if (descriptor.datatype === 'enum') {
    validateEnumOptions(descriptor, issues, context);
  } else if (descriptor.options !== undefined) {
    issues.push(issue(
      'field.unexpected_options',
      'Options are only valid for enum fields.',
      { ...context, key: descriptor.key ?? null }
    ));
  }

  if (descriptor.datatype === 'reference') {
    validateTargetTypes(descriptor, issues, context);
  } else if (descriptor.targetTypes !== undefined) {
    issues.push(issue(
      'field.unexpected_target_types',
      'targetTypes are only valid for reference fields.',
      { ...context, key: descriptor.key ?? null }
    ));
  }

  if (descriptor.datatype === 'array') {
    if (!isPlainObject(descriptor.items)) {
      issues.push(issue(
        'field.array_missing_items',
        'Array field must declare an items descriptor.',
        { ...context, key: descriptor.key ?? null }
      ));
    } else {
      validateNestedDescriptor(
        descriptor.items,
        issues,
        {
          ...context,
          path: `${context.path}.items`,
          nested: true
        }
      );

      if (descriptor.items.datatype === 'object') {
        validateStableRowIdentity(
          descriptor.items,
          issues,
          context,
          descriptor.key
        );
      }
    }
  } else if (descriptor.items !== undefined) {
    issues.push(issue(
      'field.unexpected_items',
      'items are only valid for array fields.',
      { ...context, key: descriptor.key ?? null }
    ));
  }

  if (descriptor.datatype === 'object') {
    validateNestedProperties(
      descriptor.properties,
      issues,
      context,
      descriptor.key
    );
  } else if (descriptor.properties !== undefined) {
    issues.push(issue(
      'field.unexpected_properties',
      'properties are only valid for object fields.',
      { ...context, key: descriptor.key ?? null }
    ));
  }
}


function validateNestedDescriptor(
  descriptor,
  issues,
  context
) {
  if (!isPlainObject(descriptor)) {
    issues.push(issue(
      'field.invalid_nested_descriptor',
      'Nested value descriptor must be a plain object.',
      context
    ));
    return;
  }

  validateKnownKeys(
    descriptor,
    VALUE_DESCRIPTOR_KEYS,
    'field.invalid_nested_descriptor',
    'Nested value descriptor contains an unsupported property.',
    issues,
    context
  );

  validateValueShape(descriptor, issues, context);
}


function validateNestedProperties(
  properties,
  issues,
  context,
  parentKey
) {
  if (!Array.isArray(properties) || properties.length === 0) {
    issues.push(issue(
      'field.object_missing_properties',
      'Object field must declare at least one property.',
      { ...context, key: parentKey ?? null }
    ));
    return;
  }

  const keys = new Set();
  properties.forEach((property, index) => {
    validateField(
      property,
      issues,
      {
        ...context,
        path: `${context.path}.properties[${index}]`,
        nested: true
      }
    );

    if (isCardFieldKey(property?.key)) {
      if (keys.has(property.key)) {
        issues.push(issue(
          'field.duplicate_object_property',
          'Object field contains a duplicate property key.',
          { ...context, key: property.key, parentKey: parentKey ?? null }
        ));
      }
      keys.add(property.key);
    }
  });
}


function validateStableRowIdentity(
  itemDescriptor,
  issues,
  context,
  key
) {
  if (!isNonEmptyString(itemDescriptor.rowIdentityKey)) {
    issues.push(issue(
      'field.repeatable_object_missing_row_identity',
      'Array<object> must declare a stable rowIdentityKey.',
      { ...context, key: key ?? null }
    ));
    return;
  }

  const identityProperty =
    Array.isArray(itemDescriptor.properties)
      ? itemDescriptor.properties.find(property =>
          property?.key === itemDescriptor.rowIdentityKey
        )
      : null;

  if (
    !identityProperty ||
    identityProperty.datatype !== 'string' ||
    identityProperty.required !== true ||
    identityProperty.readonly !== true
  ) {
    issues.push(issue(
      'field.invalid_row_identity',
      'rowIdentityKey must reference a required readonly string property.',
      { ...context, key: key ?? null, rowIdentityKey: itemDescriptor.rowIdentityKey }
    ));
  }
}


function validateEnumOptions(
  field,
  issues,
  context
) {
  if (!Array.isArray(field.options) || field.options.length === 0) {
    issues.push(issue(
      'field.enum_missing_options',
      'Enum field must declare stable options.',
      { ...context, key: field.key ?? null }
    ));
    return;
  }

  const values = new Set();
  field.options.forEach((option, index) => {
    if (
      !isPlainObject(option) ||
      !['string', 'number', 'boolean'].includes(typeof option.value) ||
      (typeof option.value === 'number' && !Number.isFinite(option.value)) ||
      !isNonEmptyString(option.label)
    ) {
      issues.push(issue(
        'field.invalid_enum_option',
        'Enum option must contain a finite stable value and a label.',
        { ...context, key: field.key ?? null, index }
      ));
      return;
    }

    const identity = `${typeof option.value}:${String(option.value)}`;
    if (values.has(identity)) {
      issues.push(issue(
        'field.duplicate_enum_value',
        'Enum option values must be unique.',
        { ...context, key: field.key ?? null, value: option.value }
      ));
    }
    values.add(identity);
  });
}


function validateTargetTypes(
  field,
  issues,
  context
) {
  if (!Array.isArray(field.targetTypes) || field.targetTypes.length === 0) {
    issues.push(issue(
      'field.reference_missing_target_types',
      'Reference field must declare at least one target type.',
      { ...context, key: field.key ?? null }
    ));
    return;
  }

  const seen = new Set();
  field.targetTypes.forEach((typeId, index) => {
    if (!isCardTypeId(typeId)) {
      issues.push(issue(
        'field.invalid_reference_target_type',
        'Reference target type must be a stable type id.',
        { ...context, key: field.key ?? null, typeId, index }
      ));
    } else if (seen.has(typeId)) {
      issues.push(issue(
        'field.duplicate_reference_target_type',
        'Reference target type must not be repeated.',
        { ...context, key: field.key ?? null, typeId }
      ));
    }
    seen.add(typeId);
  });
}


function validateBinding(
  field,
  issues,
  context
) {
  const binding = field.binding;

  if (
    !isPlainObject(binding) ||
    !CARD_FIELD_BINDING_OWNERS.includes(binding.owner)
  ) {
    issues.push(issue(
      'field.invalid_binding',
      'Field binding must declare a supported persistent owner.',
      { ...context, key: field.key ?? null }
    ));
    return;
  }

  validateKnownKeys(
    binding,
    new Set(['owner', 'path']),
    'field.invalid_binding',
    'Field binding contains an unsupported property.',
    issues,
    { ...context, key: field.key ?? null }
  );

  if (binding.owner === 'variables') {
    if (binding.path !== undefined) {
      issues.push(issue(
        'field.variable_binding_path_forbidden',
        'Variable fields are addressed by their stable key and cannot declare another path.',
        { ...context, key: field.key ?? null }
      ));
    }
    return;
  }

  if (binding.owner === 'page' && !PAGE_BINDING_PATHS.has(binding.path)) {
    issues.push(issue(
      'field.invalid_page_binding',
      'Page binding must reference an existing PageRecord metadata owner.',
      { ...context, key: field.key ?? null, path: binding.path ?? null }
    ));
  }

  if (binding.owner === 'content' && !CONTENT_BINDING_PATHS.has(binding.path)) {
    issues.push(issue(
      'field.invalid_content_binding',
      'Content binding must reference an existing content owner.',
      { ...context, key: field.key ?? null, path: binding.path ?? null }
    ));
  }

  if (binding.owner === 'presentation' && binding.path !== undefined) {
    issues.push(issue(
      'field.presentation_binding_path_forbidden',
      'Presentation-only fields cannot declare a persistence path.',
      { ...context, key: field.key ?? null }
    ));
  }

  if (field.default !== undefined || field.computed !== undefined) {
    issues.push(issue(
      'field.non_variable_value_owner_conflict',
      'A field bound outside Card Variables cannot declare a variable default or computed value.',
      { ...context, key: field.key ?? null, owner: binding.owner }
    ));
  }
}


function validateComputed(
  computed,
  issues,
  context,
  key
) {
  if (
    !isPlainObject(computed) ||
    !RESOLVER_ID_PATTERN.test(computed.resolverId || '') ||
    !Number.isInteger(computed.version) ||
    computed.version < 1 ||
    !Array.isArray(computed.inputs) ||
    computed.inputs.some(input => !isCardFieldKey(input)) ||
    (computed.allowOverride !== undefined && typeof computed.allowOverride !== 'boolean') ||
    (computed.options !== undefined && !isPlainObject(computed.options))
  ) {
    issues.push(issue(
      'field.invalid_computed_contract',
      'Computed field must pin resolver id/version and declare stable input keys using data only.',
      { ...context, key: key ?? null }
    ));
  }


  if (isPlainObject(computed)) {
    validateKnownKeys(
      computed,
      new Set(['resolverId', 'version', 'inputs', 'options', 'allowOverride']),
      'field.invalid_computed_contract',
      'Computed contract contains an unsupported property.',
      issues,
      { ...context, key: key ?? null }
    );
  }
}


function validateVisibility(
  predicate,
  issues,
  context,
  key
) {
  let nodes = 0;

  function visit(value, depth) {
    nodes += 1;

    if (
      nodes > CARD_TYPE_VISIBILITY_LIMITS.maxNodes ||
      depth > CARD_TYPE_VISIBILITY_LIMITS.maxDepth
    ) {
      return false;
    }

    if (!isPlainObject(value)) return false;

    const operators =
      Object.keys(value)
        .filter(candidate => VISIBILITY_OPERATORS.has(candidate));

    if (operators.length !== 1 || Object.keys(value).length !== 1) {
      return false;
    }

    const operator = operators[0];
    const operand = value[operator];

    if (operator === 'all' || operator === 'any') {
      return Array.isArray(operand) &&
        operand.length > 0 &&
        operand.every(child => visit(child, depth + 1));
    }

    if (operator === 'not') {
      return visit(operand, depth + 1);
    }

    if (operator === 'present') {
      return isCardFieldKey(operand);
    }

    if (operator === 'equals') {
      return Array.isArray(operand) &&
        operand.length === 2 &&
        isCardFieldKey(operand[0]) &&
        isJsonScalar(operand[1]);
    }

    return Array.isArray(operand) &&
      operand.length === 2 &&
      isCardFieldKey(operand[0]) &&
      Array.isArray(operand[1]) &&
      operand[1].length <= CARD_TYPE_VISIBILITY_LIMITS.maxMembershipValues &&
      operand[1].every(isJsonScalar);
  }

  if (!visit(predicate, 1)) {
    issues.push(issue(
      'field.invalid_visibility_predicate',
      'Visibility must use the bounded declarative predicate grammar.',
      { ...context, key: key ?? null }
    ));
  }
}


function validateDefaultValue(
  field,
  issues,
  context
) {
  if (field.default === null && field.nullable === true) return;

  const valid =
    isValueCompatibleWithDescriptor(
      field.default,
      field
    );

  if (!valid) {
    issues.push(issue(
      'field.invalid_default',
      'Field default does not match its declared datatype.',
      { ...context, key: field.key ?? null, datatype: field.datatype }
    ));
  }


  if (
    typeof field.default === 'number' &&
    (
      (Number.isFinite(field.min) && field.default < field.min) ||
      (Number.isFinite(field.max) && field.default > field.max)
    )
  ) {
    issues.push(issue(
      'field.default_out_of_range',
      'Numeric field default must stay inside its declared range.',
      { ...context, key: field.key ?? null }
    ));
  }
}


function isValueCompatibleWithDescriptor(
  value,
  descriptor
) {
  switch (descriptor.datatype) {
    case 'string':
    case 'date':
    case 'datetime':
    case 'color':
      return typeof value === 'string';
    case 'number':
      return Number.isFinite(value);
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'enum':
      return Array.isArray(descriptor.options) &&
        descriptor.options.some(option => option?.value === value);
    case 'asset':
      return isPlainObject(value) &&
        typeof value.path === 'string';
    case 'reference':
      return isPlainObject(value) &&
        isNonEmptyString(value.pageId);
    case 'array':
      return Array.isArray(value) &&
        value.every(item =>
          isValueCompatibleWithDescriptor(item, descriptor.items || {})
        );
    case 'object':
      return isPlainObject(value);
    default:
      return false;
  }
}


function validateSections(
  sections,
  issues,
  ownerId
) {
  if (!Array.isArray(sections)) {
    issues.push(issue(
      'definition.invalid_sections',
      'Definition sections must be an array.',
      { ownerId: ownerId ?? null }
    ));
    return;
  }

  const ids = new Set();
  sections.forEach((section, index) => {
    if (
      !isPlainObject(section) ||
      !/^[a-z][a-zA-Z0-9.-]*$/.test(section.id || '') ||
      !isNonEmptyString(section.label) ||
      (section.order !== undefined && !Number.isFinite(section.order))
    ) {
      issues.push(issue(
        'definition.invalid_section',
        'Section must have a stable id, label and optional finite order.',
        { ownerId: ownerId ?? null, index }
      ));
      return;
    }

    if (ids.has(section.id)) {
      issues.push(issue(
        'definition.duplicate_section',
        'Section ids must be unique inside a definition.',
        { ownerId: ownerId ?? null, sectionId: section.id }
      ));
    }
    ids.add(section.id);
  });
}


function validatePresentationOverrides(
  overrides,
  issues,
  ownerId
) {
  if (overrides === undefined) return;

  if (!isPlainObject(overrides)) {
    issues.push(issue(
      'definition.invalid_field_overrides',
      'fieldOverrides must be an object keyed by stable field key.',
      { ownerId: ownerId ?? null }
    ));
    return;
  }

  for (const [key, override] of Object.entries(overrides)) {
    if (!isCardFieldKey(key) || !isPlainObject(override)) {
      issues.push(issue(
        'definition.invalid_field_override',
        'Each field override must use a stable field key and a plain object.',
        { ownerId: ownerId ?? null, key }
      ));
      continue;
    }

    const invalidKeys =
      Object.keys(override)
        .filter(attribute =>
          !CARD_FIELD_PRESENTATION_OVERRIDE_KEYS.includes(attribute)
        );

    if (invalidKeys.length > 0) {
      issues.push(issue(
        'definition.semantic_override_forbidden',
        'Field overrides may change presentation attributes only.',
        { ownerId: ownerId ?? null, key, invalidKeys }
      ));
    }

    if (override.visibility !== undefined) {
      validateVisibility(
        override.visibility,
        issues,
        { ownerId, path: `fieldOverrides.${key}` },
        key
      );
    }


    validatePresentationAttributeValues(
      override,
      issues,
      ownerId,
      key
    );
  }
}


function validatePresentationAttributeValues(
  attributes,
  issues,
  ownerId,
  key
) {
  for (const attribute of ['label', 'help', 'section', 'group']) {
    if (
      attributes[attribute] !== undefined &&
      typeof attributes[attribute] !== 'string'
    ) {
      issues.push(issue(
        'definition.invalid_presentation_override',
        `Presentation override ${attribute} must be a string.`,
        { ownerId: ownerId ?? null, key, attribute }
      ));
    }
  }

  if (
    attributes.order !== undefined &&
    !Number.isFinite(attributes.order)
  ) {
    issues.push(issue(
      'definition.invalid_presentation_override',
      'Presentation override order must be a finite number.',
      { ownerId: ownerId ?? null, key, attribute: 'order' }
    ));
  }
}


function validateKnownKeys(
  value,
  allowedKeys,
  code,
  message,
  issues,
  details
) {
  const unknownKeys =
    Object.keys(value)
      .filter(key => !allowedKeys.has(key));

  if (unknownKeys.length > 0) {
    issues.push(issue(
      code,
      message,
      { ...details, unknownKeys }
    ));
  }
}


function validateDataOnlyTree(
  value,
  path,
  issues,
  seen = new Set()
) {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    issues.push(issue(
      'definition.executable_value_forbidden',
      'Definitions may contain JSON data only.',
      { path, valueType: typeof value }
    ));
    return;
  }

  if (value === undefined) {
    issues.push(issue(
      'definition.undefined_value_forbidden',
      'Definitions may not contain undefined values.',
      { path }
    ));
    return;
  }

  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      issues.push(issue(
        'definition.non_finite_number_forbidden',
        'Definitions may contain finite numbers only.',
        { path }
      ));
    }
    return;
  }

  if (seen.has(value)) {
    issues.push(issue(
      'definition.circular_data_forbidden',
      'Definitions must be serializable data without object cycles.',
      { path }
    ));
    return;
  }

  if (!Array.isArray(value) && !isStrictPlainObject(value)) {
    issues.push(issue(
      'definition.non_plain_object_forbidden',
      'Definitions may contain arrays and plain objects only.',
      { path }
    ));
    return;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateDataOnlyTree(entry, `${path}[${index}]`, issues, seen)
    );
  } else {
    for (const [key, entry] of Object.entries(value)) {
      if (RESERVED_OBJECT_KEYS.has(key)) {
        issues.push(issue(
          'definition.unsafe_object_key',
          'Definitions may not contain prototype-sensitive object keys.',
          { path: `${path}.${key}` }
        ));
      }

      if (EXECUTABLE_PROPERTY_NAMES.has(key)) {
        issues.push(issue(
          'definition.executable_property_forbidden',
          'Definitions may not declare scripts, callbacks or dynamic modules.',
          { path: `${path}.${key}` }
        ));
      }

      validateDataOnlyTree(
        entry,
        `${path}.${key}`,
        issues,
        seen
      );
    }
  }

  seen.delete(value);
}


function isStrictPlainObject(value) {
  if (!isPlainObject(value)) return false;

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}


function isJsonScalar(value) {
  return value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    Number.isFinite(value);
}


function issue(
  code,
  message,
  details = {}
) {
  return createSchemaIssue(
    'error',
    code,
    message,
    details
  );
}
