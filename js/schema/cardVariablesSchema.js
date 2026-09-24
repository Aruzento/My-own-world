import { createValidationResult } from './schemaValidation.js';
import { isDataObject, assertJSONData, assertVariablesEnvelope } from '../core/pageVariablesCodec.js';

export const hasValue = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export function valueIssue(code, context, value, severity = 'error') {
  return { severity, code: `variables.${code}`, message: code,
    details: { ...context, value } };
}

export function validateVariableValue(value, field, context = {}) {
  const issues = [];
  const invalid = code => issues.push(valueIssue(code, context, value));
  if (value === null) {
    if (!field.nullable) invalid('null_not_allowed');
    return createValidationResult(issues);
  }
  switch (field.datatype) {
    case 'string':
      if (typeof value !== 'string') invalid('string_required');
      break;
    case 'number': case 'integer':
      if (typeof value !== 'number' || !Number.isFinite(value) ||
          (field.datatype === 'integer' && !Number.isSafeInteger(value))) invalid('number_required');
      else if ((field.min !== undefined && value < field.min) ||
          (field.max !== undefined && value > field.max)) invalid('out_of_range');
      break;
    case 'boolean':
      if (typeof value !== 'boolean') invalid('boolean_required');
      break;
    case 'enum':
      if (!field.options?.some(option => option.value === value)) invalid('invalid_option');
      break;
    case 'date':
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) invalid('invalid_date');
      break;
    case 'datetime':
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
          !Number.isFinite(Date.parse(value))) invalid('invalid_datetime');
      break;
    case 'color':
      if (typeof value !== 'string' || !/^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(value)) invalid('invalid_color');
      break;
    case 'asset':
      if (!isDataObject(value) || value.kind !== 'asset' || typeof value.path !== 'string' ||
          !/^assets\//.test(value.path) || /(?:^|\/)\.{1,2}(?:\/|$)|[\\:\u0000-\u001f]/.test(value.path) ||
          Object.keys(value).some(key => !['kind', 'path'].includes(key))) invalid('invalid_asset');
      break;
    case 'reference':
      if (!isDataObject(value) || typeof value.pageId !== 'string' || !value.pageId.trim() ||
          Object.keys(value).length !== 1) invalid('invalid_reference');
      break;
    case 'array': {
      if (!Array.isArray(value)) { invalid('array_required'); break; }
      const ids = new Set();
      value.forEach((entry, index) => {
        const rowKey = field.items?.rowIdentityKey;
        const rowId = rowKey ? entry?.[rowKey] : undefined;
        if (rowKey && (typeof rowId !== 'string' || !rowId || ids.has(rowId))) invalid('invalid_row_identity');
        ids.add(rowId);
        issues.push(...validateVariableValue(entry, field.items, {
          ...context, path: `${context.path || ''}[${rowId || index}]`, rowId
        }).issues);
      });
      break;
    }
    case 'object':
      if (!isDataObject(value)) { invalid('object_required'); break; }
      for (const property of field.properties || []) {
        const nestedContext = { ...context, path: `${context.path || ''}.${property.key}` };
        if (hasValue(value, property.key)) {
          issues.push(...validateVariableValue(value[property.key], property, nestedContext).issues);
        } else if (hasValue(property, 'default')) {
          issues.push(...validateVariableValue(property.default, property, nestedContext).issues);
        } else if (property.required) issues.push(valueIssue('required', nestedContext, undefined));
      }
      break;
    default: invalid('unsupported_datatype');
  }
  // Правила здесь ограничены данными. Неизвестное правило не игнорируется.
  for (const [rule, option] of Object.entries(field.validation || {})) {
    if (['allowSelf', 'acyclic'].includes(rule) && field.datatype === 'reference' && typeof option === 'boolean') continue;
    if (['minLength', 'maxLength'].includes(rule) && Number.isSafeInteger(option) && option >= 0) {
      if ((typeof value !== 'string' && !Array.isArray(value)) ||
          (rule === 'minLength' ? value.length < option : value.length > option)) invalid(rule);
    } else invalid('unsupported_validation_rule');
  }
  if (field.format === 'formula' && typeof value === 'string' && value.length > 4096) invalid('formula_size_limit');
  return createValidationResult(issues);
}

export function validateEntityValues({ envelope, definition, pageId }) {
  const issues = [];
  try { assertJSONData(envelope); assertVariablesEnvelope(envelope); } catch (error) {
    return createValidationResult([valueIssue(error.code, { pageId }, undefined)]);
  }
  if (!definition?.fieldsByKey) return createValidationResult([valueIssue('missing_definition', { pageId }, null)]);
  const values = envelope.values;
  const overrides = envelope.overrides || {};
  for (const [collection, data] of [['values', values], ['overrides', overrides]]) {
    for (const [key, value] of Object.entries(data)) {
      const field = definition.fieldsByKey[key];
      const context = { pageId, key, path: `${collection}.${key}` };
      if (!field) { issues.push(valueIssue('unknown_field', context, value, 'warning')); continue; }
      if (field.binding.owner !== 'variables') issues.push(valueIssue('metadata_owner_conflict', context, value));
      if (collection === 'overrides' && (!field.computed || !field.computed.allowOverride)) issues.push(valueIssue('override_forbidden', context, value));
      if (collection === 'values' && field.computed) issues.push(valueIssue('computed_result_persisted', context, value));
      issues.push(...validateVariableValue(value, field, context).issues);
    }
  }
  for (const field of definition.fields) {
    if (field.binding.owner !== 'variables' || field.computed || hasValue(values, field.key)) continue;
    const context = { pageId, key: field.key, path: `values.${field.key}` };
    if (hasValue(field, 'default')) issues.push(...validateVariableValue(field.default, field, context).issues);
    else if (field.required) issues.push(valueIssue('required', context, undefined));
  }
  return createValidationResult(issues);
}
