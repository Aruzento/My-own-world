import * as PageRepository from '../repository/pageRepository.js';
import { createCardVariableSnapshot } from './cardVariableStore.js';
import { deepCloneData, deepFreeze } from '../cardTypes/definitionIdentity.js';
import { hasValue, validateVariableValue } from '../schema/cardVariablesSchema.js';
import { EMPTY_COMPUTED_RESOLVERS } from './computedResolvers.js';
import { isSpecialPageReferenceTarget, referenceFieldMatchesPage, referenceTargetMatchesPage } from '../cardTypes/cardReferenceTargets.js';
export { validateEntityValues } from '../schema/cardVariablesSchema.js';
export { prepareVariablesChange, commitVariablesChange } from './variableCommands.js';

export function readEntity(pageId, context = {}) {
  const repository = context.repository || PageRepository;
  return createCardVariableSnapshot(repository.getPageById(pageId), context.registry);
}
export const getTypeDefinition = snapshot => snapshot.definition;
export const getFieldDefinition = (snapshot, key) => snapshot.definition?.fieldsByKey[key] || null;

export function getValue(snapshot, key, mode = 'effective', context = {}) {
  if (!['stored', 'default', 'effective'].includes(mode)) throw new Error('Unknown value mode');
  return deepFreeze(deepCloneData(readValue(snapshot, key, mode, context, [])));
}

function readValue(snapshot, key, mode, context, path) {
  const field = getFieldDefinition(snapshot, key);
  const result = (status, extra = {}) => ({ status, key, mode, ...extra });
  if (snapshot.mode !== 'structured') return result(snapshot.mode === 'invalid' ? 'invalid' : 'unsupported', { reason: snapshot.mode });
  if (!field) return result('unsupported', { reason: 'unknown-field',
    ...(hasValue(snapshot.values, key) ? { value: snapshot.values[key], source: 'stored-unknown' } : {}) });
  if (field.binding.owner !== 'variables') {
    if (field.binding.owner === 'presentation') return result('absent', { source: 'presentation' });
    const data = field.binding.owner === 'page' ? snapshot.metadata : snapshot.freeContent;
    if (!hasValue(data, field.binding.path)) {
      return result('unresolved', { reason: 'binding-unavailable', source: field.binding.owner });
    }
    const value = projectBoundValue(field, data[field.binding.path]);
    const validation = validateVariableValue(value, field, { pageId: snapshot.pageId, key });
    return result(validation.ok ? 'value' : 'invalid', {
      value, source: field.binding.owner, issues: validation.issues, provenance: field.provenance
    });
  }
  const checked = (value, source) => {
    const validation = validateVariableValue(value, field, { pageId: snapshot.pageId, key });
    return result(validation.ok ? 'value' : 'invalid', { value, source, issues: validation.issues, provenance: field.provenance });
  };
  if (mode === 'default') return hasValue(field, 'default') ? checked(field.default, 'default') : result('absent');
  if (field.computed) {
    if (hasValue(snapshot.values, key)) return result('invalid', { reason: 'computed-result-persisted' });
    if (hasValue(snapshot.overrides, key)) return field.computed.allowOverride ? checked(snapshot.overrides[key], 'override') : result('invalid', { reason: 'override-forbidden' });
    if (mode === 'stored') return result('absent');
    if (path.includes(key)) return result('invalid', { reason: 'computed-cycle', dependencies: [...path, key] });
    if (path.length >= 32) return result('invalid', { reason: 'computed-depth-limit' });
    const inputs = {};
    const dependencies = [];
    for (const input of field.computed.inputs) {
      const resolved = readValue(snapshot, input, 'effective', context, [...path, key]);
      dependencies.push({ key: input, status: resolved.status, source: resolved.source, dependencies: resolved.dependencies });
      if (resolved.status !== 'value') return result(resolved.status === 'invalid' ? 'invalid' : 'unresolved', {
        reason: resolved.reason || 'missing-input', input, dependencies
      });
      inputs[input] = resolved.value;
    }
    const resolved = (context.resolvers || EMPTY_COMPUTED_RESOLVERS).execute(field.computed, inputs);
    if (resolved.status !== 'value') return result(resolved.status, { ...resolved, dependencies });
    return { ...checked(resolved.value, 'computed'), dependencies,
      resolver: { id: field.computed.resolverId, version: field.computed.version } };
  }
  if (hasValue(snapshot.overrides, key)) return result('invalid', { reason: 'override-forbidden' });
  if (hasValue(snapshot.values, key)) return checked(snapshot.values[key], 'stored');
  if (mode === 'effective' && hasValue(field, 'default')) return checked(field.default, 'default');
  return result('absent', { required: Boolean(field.required) });
}

// PageRecord keeps parent as a raw id and relationships as its compact v1
// records. Definitions consume canonical values through this read-only boundary;
// neither projection introduces another persistent owner.
function projectBoundValue(field, value) {
  if (field.binding?.projection === 'page-id-reference') {
    return value === null || value === undefined ? null : { pageId: value };
  }
  if (field.binding?.projection === 'page-relationships-v1') {
    if (!Array.isArray(value)) return value;
    const properties = field.items?.properties || [];
    return value.map(relationship => {
      const projected = {};
      for (const property of properties) {
        const ownerKey = property.key.split('.').at(-1);
        if (hasValue(relationship, ownerKey)) projected[property.key] = relationship[ownerKey];
      }
      return projected;
    });
  }
  return value;
}

export function getValues(snapshot, mode = 'effective', context = {}) {
  return Object.fromEntries([...new Set([
    ...Object.keys(snapshot.definition?.fieldsByKey || {}), ...Object.keys(snapshot.values || {}), ...Object.keys(snapshot.overrides || {})
  ])].sort().map(key => [key, getValue(snapshot, key, mode, context)]));
}

export function resolveReference(snapshot, key, context = {}) {
  const field = getFieldDefinition(snapshot, key);
  if (field?.datatype !== 'reference') return { status: 'unsupported', reason: 'not-reference' };
  const value = getValue(snapshot, key, 'effective', context);
  if (value.status !== 'value') return value;
  if (value.value === null) return { status: 'absent', source: value.source };
  const repository = context.repository || PageRepository;
  const target = repository.getPageById(value.value.pageId);
  if (!target) return { status: 'unresolved', reason: 'missing-target', pageId: value.value.pageId };
  const targetSnapshot = createCardVariableSnapshot(target, context.registry);
  const targetView = { ...target, type: targetSnapshot.type || target.type };
  if (!referenceFieldMatchesPage(field, targetView)) return { status: 'invalid', reason: 'wrong-target-type', pageId: target.id };
  const specialTarget = field.targetTypes.find(type => isSpecialPageReferenceTarget(type) && referenceTargetMatchesPage(type, targetView));
  if (!specialTarget && !['legacy', 'structured'].includes(targetSnapshot.mode)) return { status: 'unsupported', reason: 'target-structured-data-unavailable', pageId: target.id };
  if (!specialTarget && !context.registry?.listTypeVersions(targetSnapshot.type).length) return { status: 'unsupported', reason: 'missing-target-definition' };
  if (field.validation?.allowSelf === false && target.id === snapshot.pageId) return { status: 'invalid', reason: 'self-reference' };
  if (field.validation?.acyclic) {
    const visited = new Set([snapshot.pageId]);
    let current = targetSnapshot;
    for (let depth = 0; current; depth++) {
      if (visited.has(current.pageId)) return { status: 'invalid', reason: 'reference-cycle' };
      if (depth >= 32) return { status: 'unresolved', reason: 'reference-depth-limit' };
      visited.add(current.pageId);
      const next = getValue(current, key, 'stored', context);
      if (next.status === 'absent' || !getFieldDefinition(current, key)) break;
      if (next.status !== 'value') return { status: 'unresolved', reason: 'reference-chain-unavailable' };
      const nextPage = repository.getPageById(next.value.pageId);
      if (!nextPage) return { status: 'unresolved', reason: 'missing-target' };
      current = createCardVariableSnapshot(nextPage, context.registry);
    }
  }
  return { status: 'value', pageId: target.id, label: target.title, type: targetSnapshot.type || target.type, source: 'page-repository' };
}
