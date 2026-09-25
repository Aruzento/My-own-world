import { deepCloneData, deepFreeze } from '../../cardTypes/definitionIdentity.js';
import { hasValue, validateEntityValues, validateVariableValue } from '../../schema/cardVariablesSchema.js';
import { applyVariablesPatch } from '../../variables/variableCommands.js';
import { getValue } from '../../variables/entityVariables.js';

export const INSPECTOR_EDITABLE_MODE = 'structured';

export function describeInspectorSource(snapshot) {
  const messages = {
    missing: ['Карточка недоступна', 'Страница не найдена в текущем рабочем пространстве.'],
    legacy: ['Legacy-карточка', 'Карточка ещё использует legacy data source. Structured Inspector станет доступен после миграции.'],
    invalid: ['Повреждённые structured data', 'Данные variablesJson сохранены без изменений. Исправление требует recovery workflow.'],
    unsupported: ['Неподдерживаемые structured data', 'Версия или schema новее доступной. Редактирование отключено без downgrade.'],
    'missing-definition': ['Definition недоступна', 'Exact schema definition отсутствует в workspace catalog.']
  };
  const [title, message] = messages[snapshot?.mode] || ['Inspector недоступен', 'Structured data нельзя безопасно редактировать.'];
  return deepFreeze({ editable: snapshot?.mode === INSPECTOR_EDITABLE_MODE, title, message });
}

export function createInspectorDraft(snapshot) {
  if (snapshot?.mode !== INSPECTOR_EDITABLE_MODE) throw new Error('Structured entity snapshot required');
  return deepFreeze({
    pageId: snapshot.pageId,
    sourceIdentity: snapshot.pageIdentity,
    schemaDigest: snapshot.schemaDigest,
    snapshot,
    envelope: deepCloneData(snapshot.envelope),
    patch: [],
    rawInputs: {},
    inputIssues: [],
    dirty: false
  });
}

export function updateInspectorDraft(draft, operation, options = {}) {
  const snapshot = projectDraftSnapshot(draft);
  let result;
  try {
    result = applyVariablesPatch(snapshot, [operation]);
  } catch (error) {
    return withInputIssue(draft, operation.key, String(error.message || error), options.raw);
  }
  const inputKey = options.inputKey || operation.key;
  const candidate = { ...draft, envelope: result.envelope, patch: compactPatch(draft.patch, operation), dirty: true };
  const validation = validateEntityValues({ envelope: candidate.envelope, definition: snapshot.definition, pageId: snapshot.pageId });
  return deepFreeze(deepCloneData({
    ...candidate,
    rawInputs: withoutKey(draft.rawInputs, inputKey),
    inputIssues: [...draft.inputIssues.filter(issue => issue.details?.key !== inputKey), ...validation.issues]
  }));
}

export function updateInspectorDraftFromInput(draft, field, raw, operation = 'set') {
  const parsed = parseInspectorInput(field, raw);
  if (!parsed.ok) return withInputIssue(draft, field.key, parsed.message, raw);
  return updateInspectorDraft(draft, { op: operation, key: field.key, value: parsed.value }, { raw });
}

export function validateInspectorDraft(draft) {
  const validation = validateEntityValues({
    envelope: draft.envelope,
    definition: draft.snapshot.definition,
    pageId: draft.pageId
  });
  const issues = [...draft.inputIssues, ...validation.issues];
  return deepFreeze({ ok: issues.every(issue => issue.severity !== 'error'), issues });
}

export function projectDraftSnapshot(draft) {
  return deepFreeze(deepCloneData({
    ...draft.snapshot,
    envelope: draft.envelope,
    values: draft.envelope.values,
    overrides: draft.envelope.overrides || {}
  }));
}

export function readDraftValue(draft, key, mode = 'effective', context = {}) {
  return getValue(projectDraftSnapshot(draft), key, mode, context);
}

export function setInspectorDraftInputIssue(draft, key, raw, message) {
  return withInputIssue(draft, key, message, raw);
}

export function parseInspectorInput(field, raw) {
  if (raw === null && field.nullable) return { ok: true, value: null };
  let value = raw;
  if (field.datatype === 'number' || field.datatype === 'integer') {
    if (typeof raw === 'string' && raw.trim() === '') return { ok: false, message: 'Введите число или используйте «Сбросить».' };
    value = Number(raw);
  } else if (field.datatype === 'asset' && typeof raw === 'string') {
    value = { kind: 'asset', path: raw };
  } else if (field.datatype === 'reference' && typeof raw === 'string') {
    value = { pageId: raw };
  }
  const checked = validateVariableValue(value, field, { key: field.key, path: `values.${field.key}` });
  return checked.ok ? { ok: true, value } : { ok: false, message: issueMessage(checked.issues[0]) };
}

export function createStableRowId() {
  return globalThis.crypto?.randomUUID?.() || `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function buildInspectorSections(definition, valueForKey) {
  const sections = [...(definition?.definition?.sections || definition?.sections || [])]
    .sort(comparePresentation);
  const byId = new Map(sections.map(section => [section.id, { ...section, fields: [] }]));
  const ungrouped = { id: 'general', label: 'Поля', order: Number.MAX_SAFE_INTEGER, fields: [] };
  for (const field of definition?.fields || []) {
    if (!evaluateVisibility(field.visibility, valueForKey)) continue;
    const target = byId.get(field.section) || ungrouped;
    target.fields.push(field);
  }
  const output = [...byId.values(), ...(ungrouped.fields.length ? [ungrouped] : [])]
    .map(section => ({ ...section, fields: section.fields.sort(comparePresentation) }))
    .filter(section => section.fields.length);
  return deepFreeze(deepCloneData(output));
}

export function evaluateVisibility(predicate, valueForKey) {
  if (!predicate) return true;
  if (predicate.all) return predicate.all.every(item => evaluateVisibility(item, valueForKey));
  if (predicate.any) return predicate.any.some(item => evaluateVisibility(item, valueForKey));
  if (predicate.not) return !evaluateVisibility(predicate.not, valueForKey);
  if (predicate.present) return valueForKey(predicate.present)?.status === 'value';
  if (predicate.equals) return valueForKey(predicate.equals[0])?.value === predicate.equals[1];
  if (predicate.in) return predicate.in[1].some(value => value === valueForKey(predicate.in[0])?.value);
  return false;
}

export function issueMessage(issue) {
  const code = String(issue?.code || issue?.message || 'invalid').replace(/^variables\./, '');
  const labels = {
    required: 'Обязательное значение отсутствует.',
    number_required: 'Введите корректное число.',
    out_of_range: 'Значение выходит за допустимый диапазон.',
    invalid_option: 'Выберите допустимый вариант.',
    invalid_reference: 'Выберите существующую карточку.',
    invalid_row_identity: 'Строка имеет некорректный stable id.',
    computed_cycle: 'Обнаружен цикл вычислений.',
    missing_input: 'Не хватает входного значения для вычисления.'
  };
  return labels[code] || `Некорректное значение: ${code}.`;
}

function withInputIssue(draft, key, message, raw) {
  const issue = { severity: 'error', code: 'inspector.invalid_input', message, details: { key, value: raw } };
  return deepFreeze(deepCloneData({
    ...draft,
    rawInputs: { ...draft.rawInputs, [key]: raw },
    inputIssues: [...draft.inputIssues.filter(item => item.details?.key !== key), issue],
    dirty: true
  }));
}

function compactPatch(patch, operation) {
  if (operation.op.startsWith('row')) return [...patch, deepCloneData(operation)];
  return [...patch.filter(item => item.key !== operation.key || item.op.startsWith('row')), deepCloneData(operation)];
}

function withoutKey(object, key) {
  const result = { ...object };
  delete result[key];
  return result;
}

function comparePresentation(left, right) {
  return (left.order ?? 0) - (right.order ?? 0) || String(left.label || left.key).localeCompare(String(right.label || right.key));
}
