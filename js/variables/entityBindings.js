import { validateVariableValue } from '../schema/cardVariablesSchema.js';
import { parsePageRecordContent, updatePageRecordContent, updatePageRecordBoundMetadata } from '../core/pageRecord.js';
import { readPrimaryImage, writePrimaryImage } from '../editor/primaryImageBinding.js';
import { canonicalJSON } from '../core/pageVariablesCodec.js';

// Schema-selected owner/path adapters; no UI field ids or alternate store.
export function canEditEntityBinding(field) {
  if (field?.computed || field?.datatype !== 'asset') return false;
  return field.binding?.owner === 'page' && field.binding.path === 'iconJson' ||
    field.binding?.owner === 'content' && field.binding.path === 'primaryImage';
}

export function readEntityBinding(snapshot, field) {
  const data = field.binding.owner === 'page' ? snapshot.metadata : snapshot.freeContent;
  if (field.binding.owner === 'content' && field.binding.path === 'primaryImage') {
    try {
      const value = readPrimaryImage(snapshot.freeContent.content);
      return value === undefined ? { status: 'absent', source: 'content' } : { status: 'value', value, source: 'content' };
    } catch (error) { return { status: 'unresolved', source: 'content', reason: error.message }; }
  }
  if (Object.hasOwn(data, field.binding.path)) return { status: 'value', value: data[field.binding.path], source: field.binding.owner };
  const optional = canEditEntityBinding(field) || field.binding.owner === 'page' && field.binding.path === 'archived';
  return { status: optional ? 'absent' : 'unresolved', source: field.binding.owner,
    ...(optional ? {} : { reason: 'binding-unavailable' }) };
}

export function applyEntityBindingPatch(snapshot, content, patch) {
  if (new Set(patch.map(operation => operation.key)).size !== patch.length) throw new Error('One change per binding required');
  for (const operation of patch) {
    const field = snapshot.definition.fieldsByKey[operation.key];
    if (!canEditEntityBinding(field) || !['set', 'unset'].includes(operation.op)) throw new Error('Unsupported editable binding');
    const value = operation.op === 'unset' ? undefined : operation.value;
    if (operation.op === 'set' && (!Object.hasOwn(operation, 'value') || !validateVariableValue(value, field).ok)) throw new Error('Binding candidate validation failed');
    const current = readEntityBinding(snapshot, field);
    if (operation.op === 'unset' && current.status === 'absent' || operation.op === 'set' && current.status === 'value' && canonicalJSON(current.value) === canonicalJSON(value)) continue;
    if (field.binding.owner === 'page') content = updatePageRecordBoundMetadata(content, field.binding.path, value);
    else content = updatePageRecordContent(content, { body: writePrimaryImage(parsePageRecordContent(content).rawBody, value) }, { preserveUnchangedMetadata: true });
  }
  return content;
}
