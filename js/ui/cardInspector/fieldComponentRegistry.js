import { deepCloneData } from '../../cardTypes/definitionIdentity.js';
import { referenceFieldMatchesPage } from '../../cardTypes/cardReferenceTargets.js';
import { hasValue, validateVariableValue } from '../../schema/cardVariablesSchema.js';
import { createStableRowId, issueMessage, parseInspectorInput } from './inspectorModel.js';

const registry = new Map();
const ENUM_UNSET = Symbol('enum-unset');

export function registerInspectorFieldComponent(datatype, renderer) {
  if (typeof datatype !== 'string' || typeof renderer !== 'function') throw new Error('Inspector field component requires datatype and renderer');
  registry.set(datatype, renderer);
}

export function getSupportedInspectorDatatypes() {
  return [...registry.keys()].sort();
}

// Контекст значения отделён от schema field: тот же renderer работает для root,
// object property и row property. Persistent patch всегда принадлежит root field.
export function renderInspectorField(field, context) {
  const adapter = context.adapter || createRootAdapter(field, context);
  const renderer = registry.get(field.datatype);
  if (!renderer) return renderUnsupported(field);
  return renderer(field, { ...context, adapter });
}

export function createRootAdapter(field, context) {
  return {
    field,
    rootField: field,
    path: field.key,
    read: () => context.getValue(field.key),
    set: (value, operation = writeOperation(field, field)) => context.onValue(field, value, { inputKey: field.key, operation }),
    unset: () => context.onUnset(field, { inputKey: field.key }),
    reportRaw: (raw, message) => context.onRawIssue(field.key, raw, message),
    raw: () => context.rawInputs[field.key],
    context
  };
}

export function createObjectPropertyAdapter(parent, field, path = `${parent.path}.${field.key}`) {
  return {
    field,
    rootField: parent.rootField,
    path,
    read: () => readObjectProperty(parent, field, path),
    set: value => {
      const next = mutableObject(parent);
      next[field.key] = deepCloneData(value);
      parent.set(next);
    },
    unset: () => {
      const next = mutableObject(parent);
      delete next[field.key];
      parent.set(next);
    },
    reportRaw: (raw, message) => parent.context.onRawIssue(path, raw, message),
    raw: () => parent.context.rawInputs[path],
    context: parent.context
  };
}

function createRowAdapter(parent, descriptor, rowId) {
  const path = `${parent.path}[${rowId}]`;
  return {
    field: descriptor,
    rootField: parent.rootField,
    path,
    read: () => {
      const rows = currentArray(parent);
      const row = rows.find(item => item?.[descriptor.rowIdentityKey] === rowId);
      return row ? checkedValue(row, descriptor, 'stored', path) : { status: 'invalid', reason: 'missing-row', value: null };
    },
    set: value => {
      const rows = currentArray(parent);
      const index = rows.findIndex(item => item?.[descriptor.rowIdentityKey] === rowId);
      if (index < 0) return parent.context.onRawIssue(path, undefined, 'Строка больше не существует.');
      const next = deepCloneData(rows);
      next[index] = deepCloneData(value);
      parent.set(next);
    },
    unset: () => {},
    reportRaw: (raw, message) => parent.context.onRawIssue(path, raw, message),
    raw: () => parent.context.rawInputs[path],
    context: parent.context
  };
}

function scalar(field, context, input) {
  const { adapter } = context;
  const valueState = adapter.read();
  const wrapper = fieldFrame(field, adapter, valueState, context.issues);
  const control = input(valueState, adapter);
  associateControl(control, wrapper);
  control.disabled = !isWritable(adapter);
  control.addEventListener('change', () => {
    const raw = readControlValue(control, field);
    if (raw === ENUM_UNSET) return adapter.unset();
    const parsed = parseInspectorInput(field, raw);
    if (!parsed.ok) return adapter.reportRaw(raw, parsed.message);
    adapter.set(parsed.value, writeOperation(field, adapter.rootField));
  });
  wrapper.control.append(control);
  addActions(wrapper.actions, field, adapter, valueState);
  return wrapper.root;
}

registerInspectorFieldComponent('string', (field, context) => scalar(field, context, (_, adapter) => {
  const element = document.createElement(field.format === 'multiline' || field.format === 'formula' ? 'textarea' : 'input');
  if (element instanceof HTMLInputElement) element.type = 'text';
  element.value = displayValue(adapter);
  return element;
}));

for (const datatype of ['number', 'integer']) registerInspectorFieldComponent(datatype, (field, context) => scalar(field, context, (_, adapter) => {
  const element = document.createElement('input');
  element.type = 'number';
  element.step = datatype === 'integer' ? '1' : 'any';
  if (field.min !== undefined) element.min = String(field.min);
  if (field.max !== undefined) element.max = String(field.max);
  element.value = displayValue(adapter);
  return element;
}));

registerInspectorFieldComponent('boolean', (field, context) => scalar(field, context, value => {
  const element = document.createElement('input');
  element.type = 'checkbox';
  element.checked = value.status === 'value' ? value.value === true : false;
  return element;
}));

registerInspectorFieldComponent('enum', (field, context) => scalar(field, context, value => {
  const element = document.createElement('select');
  element.append(enumOption('', '— Выберите —'));
  field.options.forEach((entry, index) => {
    const item = enumOption(`enum:${index}`, entry.label);
    item.dataset.optionIndex = String(index);
    item.selected = value.status === 'value' && Object.is(entry.value, value.value);
    element.append(item);
  });
  return element;
}));

for (const datatype of ['date', 'datetime', 'color']) registerInspectorFieldComponent(datatype, (field, context) => scalar(field, context, (_, adapter) => {
  const element = document.createElement('input');
  element.type = datatype === 'date' ? 'date' : 'text';
  element.value = displayValue(adapter);
  if (datatype === 'datetime') element.placeholder = '2026-09-24T12:00:00Z';
  if (datatype === 'color') element.placeholder = '#RRGGBB';
  return element;
}));

registerInspectorFieldComponent('asset', (field, context) => scalar(field, context, (value, adapter) => {
  const element = document.createElement('input');
  element.type = 'text';
  element.placeholder = 'assets/...';
  element.value = adapter.raw() ?? (value.status === 'value' ? value.value?.path || '' : '');
  return element;
}));

registerInspectorFieldComponent('reference', (field, context) => renderReference(field, context));
registerInspectorFieldComponent('object', (field, context) => renderObject(field, context));
registerInspectorFieldComponent('array', (field, context) => field.items?.datatype === 'object' && field.items.rowIdentityKey
  ? renderRows(field, context)
  : renderJsonCollection(field, context));

function renderReference(field, context) {
  const { adapter } = context;
  const value = adapter.read();
  const wrapper = fieldFrame(field, adapter, value, context.issues);
  const resolution = resolveReferenceValue(field, value.value, context);
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Поиск карточки';
  search.setAttribute('aria-label', `Поиск: ${field.label}`);
  const select = document.createElement('select');
  associateControl(select, wrapper);
  const pages = context.referencePages(field);
  const populate = query => {
    const normalized = query.trim().toLocaleLowerCase();
    select.replaceChildren(enumOption('', '— Не выбрано —'));
    pages.filter(page => !normalized || [page.name, page.title, ...(page.aliases || [])]
      .some(text => String(text || '').toLocaleLowerCase().includes(normalized)))
      .forEach(page => select.append(enumOption(page.id, page.name || page.title || page.id)));
    const pageId = value.value?.pageId;
    if (value.status === 'value' && pageId && ![...select.options].some(item => item.value === pageId)) {
      select.append(enumOption(pageId, `Недоступная ссылка: ${pageId}`));
    }
    if (value.status === 'value') select.value = pageId || '';
  };
  populate('');
  search.addEventListener('input', () => populate(search.value));
  select.addEventListener('change', () => select.value ? adapter.set({ pageId: select.value }, writeOperation(field, adapter.rootField)) : adapter.unset());
  const disabled = !isWritable(adapter);
  search.disabled = disabled;
  select.disabled = disabled;
  if (!['value', 'absent'].includes(resolution.status)) {
    wrapper.errors.textContent = `Ссылка не разрешена: ${resolution.reason || resolution.status}.`;
    wrapper.errors.setAttribute('role', 'alert');
    select.setAttribute('aria-invalid', 'true');
  }
  wrapper.control.append(search, select);
  addActions(wrapper.actions, field, adapter, value);
  return wrapper.root;
}

function renderObject(field, context) {
  const { adapter } = context;
  const value = adapter.read();
  const wrapper = fieldFrame(field, adapter, value, context.issues);
  const group = document.createElement('fieldset');
  group.className = 'card-inspector__nested';
  group.disabled = !isWritable(adapter);
  field.properties.forEach(property => {
    const child = createObjectPropertyAdapter(adapter, property);
    group.append(renderInspectorField(property, { ...context, adapter: child }));
  });
  wrapper.control.append(group);
  addActions(wrapper.actions, field, adapter, value);
  return wrapper.root;
}

function renderRows(field, context) {
  const { adapter } = context;
  const value = adapter.read();
  const wrapper = fieldFrame(field, adapter, value, context.issues);
  const rows = Array.isArray(value.value) ? value.value : [];
  const list = document.createElement('ol');
  list.className = 'card-inspector__rows';
  rows.forEach((row, index) => {
    const rowId = row?.[field.items.rowIdentityKey];
    const item = document.createElement('li');
    item.className = 'card-inspector__row';
    item.dataset.rowId = rowId || '';
    const heading = document.createElement('strong');
    heading.textContent = rowId ? `Строка ${index + 1}` : `Некорректная строка ${index + 1}`;
    item.append(heading);
    if (!rowId || !isPlainObject(row)) {
      const diagnostic = document.createElement('p');
      diagnostic.className = 'card-inspector__error';
      diagnostic.textContent = 'Строка сохранена без изменений: отсутствует корректный stable row id.';
      item.append(diagnostic);
      list.append(item);
      return;
    }
    const rowAdapter = createRowAdapter(adapter, field.items, rowId);
    field.items.properties.forEach(property => {
      const child = createObjectPropertyAdapter(rowAdapter, property, `${rowAdapter.path}.${property.key}`);
      item.append(renderInspectorField(property, { ...context, adapter: child }));
    });
    const actions = document.createElement('div');
    actions.className = 'card-inspector__row-actions';
    actions.append(
      actionButton('Вверх', () => reorderRows(adapter, field.items.rowIdentityKey, rowId, -1), !isWritable(adapter) || index === 0),
      actionButton('Вниз', () => reorderRows(adapter, field.items.rowIdentityKey, rowId, 1), !isWritable(adapter) || index === rows.length - 1),
      actionButton('Удалить строку', () => removeRow(adapter, field.items.rowIdentityKey, rowId), !isWritable(adapter))
    );
    item.append(actions);
    list.append(item);
  });
  const add = actionButton('Добавить строку', () => {
    const rowId = createStableRowId();
    const row = { [field.items.rowIdentityKey]: rowId };
    field.items.properties.forEach(property => {
      if (property.key !== field.items.rowIdentityKey && hasValue(property, 'default')) row[property.key] = deepCloneData(property.default);
    });
    adapter.set([...currentArray(adapter), row]);
  }, !isWritable(adapter));
  wrapper.control.append(list, add);
  addActions(wrapper.actions, field, adapter, value);
  return wrapper.root;
}

function renderJsonCollection(field, context) {
  const { adapter } = context;
  const value = adapter.read();
  const wrapper = fieldFrame(field, adapter, value, context.issues);
  const input = document.createElement('textarea');
  input.value = adapter.raw() ?? (value.status === 'value' ? JSON.stringify(value.value, null, 2) : '');
  associateControl(input, wrapper);
  input.disabled = !isWritable(adapter);
  input.addEventListener('change', () => {
    let parsed;
    try { parsed = JSON.parse(input.value); }
    catch { return adapter.reportRaw(input.value, 'Введите корректный JSON-массив.'); }
    const validation = validateVariableValue(parsed, field, { key: adapter.rootField.key, path: adapter.path });
    if (!validation.ok) return adapter.reportRaw(input.value, issueMessage(validation.issues[0]));
    adapter.set(parsed);
  });
  wrapper.control.append(input);
  addActions(wrapper.actions, field, adapter, value);
  return wrapper.root;
}

function readObjectProperty(parent, field, path) {
  const object = mutableObject(parent);
  if (hasValue(object, field.key)) return checkedValue(object[field.key], field, 'stored', path);
  if (hasValue(field, 'default')) return checkedValue(deepCloneData(field.default), field, 'default', path);
  return { status: 'absent', source: 'absent', value: undefined, required: Boolean(field.required) };
}

function checkedValue(value, field, source, path) {
  const validation = validateVariableValue(value, field, { key: field.key, path });
  return validation.ok
    ? { status: 'value', value: deepCloneData(value), source }
    : { status: 'invalid', value: deepCloneData(value), source, issues: validation.issues };
}

function mutableObject(adapter) {
  const value = adapter.read()?.value;
  return isPlainObject(value) ? deepCloneData(value) : {};
}

function currentArray(adapter) {
  const value = adapter.read()?.value;
  return Array.isArray(value) ? deepCloneData(value) : [];
}

function isWritable(adapter) {
  const field = adapter.field;
  const root = adapter.rootField;
  if (root.binding?.owner !== 'variables') return false;
  if (field !== root && (field.readonly || field.computed)) return false;
  if (field === root && root.computed) return Boolean(root.computed.allowOverride);
  return !field.readonly;
}

function writeOperation(field, root) {
  return field === root && root.computed?.allowOverride ? 'override' : 'set';
}

function displayValue(adapter) {
  const raw = adapter.raw();
  if (raw !== undefined) return String(raw);
  const value = adapter.read();
  return value.status === 'value' && value.value !== null ? String(value.value) : '';
}

function readControlValue(control, field) {
  if (field.datatype === 'boolean') return control.checked;
  if (field.datatype === 'enum') {
    if (!control.value) return ENUM_UNSET;
    const index = Number.parseInt(control.selectedOptions[0]?.dataset.optionIndex || '', 10);
    return Number.isSafeInteger(index) && field.options[index] ? field.options[index].value : ENUM_UNSET;
  }
  return control.value;
}

function resolveReferenceValue(field, value, context) {
  if (value === undefined || value === null) return { status: 'absent' };
  if (!value || typeof value.pageId !== 'string') return { status: 'invalid', reason: 'invalid-reference' };
  const target = context.repository?.getPageById(value.pageId);
  if (!target) return { status: 'unresolved', reason: 'missing-target' };
  if (field.targetTypes?.length && !referenceFieldMatchesPage(field, target)) return { status: 'invalid', reason: 'wrong-target-type' };
  return { status: 'value' };
}

function addActions(container, field, adapter, value) {
  if (!isWritable(adapter)) return;
  if (field === adapter.rootField && field.computed?.allowOverride) {
    if (field.nullable) container.append(actionButton('Установить override null', () => adapter.set(null, 'override')));
    if (value.source === 'override') container.append(actionButton('Сбросить override', () => adapter.context.onResetOverride(field, adapter.path)));
    return;
  }
  container.append(actionButton('Сбросить', () => adapter.unset()));
  if (field.nullable) container.append(actionButton('Установить null', () => adapter.set(null)));
}

function removeRow(adapter, rowKey, rowId) {
  adapter.set(currentArray(adapter).filter(row => row?.[rowKey] !== rowId));
}

function reorderRows(adapter, rowKey, rowId, direction) {
  const rows = currentArray(adapter);
  const index = rows.findIndex(row => row?.[rowKey] === rowId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= rows.length) return;
  [rows[index], rows[target]] = [rows[target], rows[index]];
  adapter.set(rows);
}

function fieldFrame(field, adapter, value, issues) {
  const root = document.createElement('div');
  root.className = 'card-inspector__field';
  root.dataset.fieldKey = adapter.path;
  const id = `card-inspector-${adapter.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const label = document.createElement('label');
  label.id = `${id}-label`;
  label.textContent = `${field.label || field.key}${field.required ? ' *' : ''}`;
  const badges = document.createElement('span');
  badges.className = 'card-inspector__badges';
  badges.textContent = [value.source, field.readonly ? 'только чтение' : '', field.deprecated ? 'устарело' : ''].filter(Boolean).join(' · ');
  const help = document.createElement('div');
  help.id = `${id}-help`;
  help.className = 'card-inspector__help';
  help.textContent = field.help || '';
  const errors = document.createElement('div');
  errors.id = `${id}-error`;
  errors.className = 'card-inspector__error';
  const related = [...(value.issues || []), ...issues.filter(issue => issue.details?.key === adapter.path || String(issue.details?.path || '').includes(adapter.path))];
  errors.textContent = related.map(issueMessage).join(' ');
  if (!errors.textContent && ['invalid', 'unresolved', 'unsupported'].includes(value.status)) errors.textContent = `Значение недоступно: ${value.reason || value.status}.`;
  if (errors.textContent) errors.setAttribute('role', 'alert');
  const control = document.createElement('div');
  control.className = 'card-inspector__control';
  const actions = document.createElement('div');
  actions.className = 'card-inspector__field-actions';
  root.append(label, badges, help, control, errors, actions);
  return { root, label, help, errors, control, actions, id };
}

function associateControl(control, wrapper) {
  control.id = wrapper.id;
  control.setAttribute('aria-labelledby', wrapper.label.id);
  control.setAttribute('aria-describedby', `${wrapper.help.id} ${wrapper.errors.id}`);
  if (wrapper.errors.textContent) control.setAttribute('aria-invalid', 'true');
}

function enumOption(value, label) {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = label;
  return element;
}

function actionButton(label, action, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', action);
  return button;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function renderUnsupported(field) {
  const root = document.createElement('div');
  root.className = 'card-inspector__field card-inspector__field--unsupported';
  root.setAttribute('role', 'status');
  root.textContent = `${field.label}: datatype «${field.datatype}» не поддерживается Inspector.`;
  return root;
}
