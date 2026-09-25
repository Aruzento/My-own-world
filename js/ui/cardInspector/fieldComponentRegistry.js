import { hasValue } from '../../schema/cardVariablesSchema.js';
import { createStableRowId, issueMessage } from './inspectorModel.js';

const registry = new Map();

export function registerInspectorFieldComponent(datatype, renderer) {
  if (typeof datatype !== 'string' || typeof renderer !== 'function') throw new Error('Inspector field component requires datatype and renderer');
  registry.set(datatype, renderer);
}

export function getSupportedInspectorDatatypes() {
  return [...registry.keys()].sort();
}

export function renderInspectorField(field, context) {
  const renderer = registry.get(field.datatype);
  if (!renderer) return renderUnsupported(field);
  return renderer(field, context);
}

function scalar(field, context, input) {
  const valueState = context.getValue(field.key);
  const wrapper = fieldFrame(field, valueState, context.issues);
  const control = input(valueState);
  associateControl(control, wrapper);
  const canOverride = Boolean(field.computed?.allowOverride);
  if ((!canOverride && (field.readonly || field.computed)) || field.binding.owner !== 'variables') control.disabled = true;
  control.addEventListener('change', () => context.onInput(field, readControlValue(control, field), canOverride ? 'override' : 'set'));
  wrapper.control.append(control);
  addActions(wrapper.actions, field, context, valueState);
  return wrapper.root;
}

registerInspectorFieldComponent('string', (field, context) => scalar(field, context, () => {
  const element = document.createElement(field.format === 'multiline' || field.format === 'formula' ? 'textarea' : 'input');
  if (element instanceof HTMLInputElement) element.type = 'text';
  element.value = displayValue(context, field);
  return element;
}));

for (const datatype of ['number', 'integer']) registerInspectorFieldComponent(datatype, (field, context) => scalar(field, context, () => {
  const element = document.createElement('input');
  element.type = 'number';
  element.step = datatype === 'integer' ? '1' : 'any';
  if (field.min !== undefined) element.min = String(field.min);
  if (field.max !== undefined) element.max = String(field.max);
  element.value = displayValue(context, field);
  return element;
}));

registerInspectorFieldComponent('boolean', (field, context) => scalar(field, context, value => {
  const element = document.createElement('input');
  element.type = 'checkbox';
  element.checked = value.status === 'value' ? Boolean(value.value) : false;
  return element;
}));

registerInspectorFieldComponent('enum', (field, context) => scalar(field, context, value => {
  const element = document.createElement('select');
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '— Выберите —';
  element.append(blank);
  field.options.forEach((option, index) => {
    const item = document.createElement('option');
    item.value = String(index);
    item.textContent = option.label;
    item.selected = value.status === 'value' && option.value === value.value;
    element.append(item);
  });
  element.dataset.enum = 'true';
  return element;
}));

for (const datatype of ['date', 'datetime', 'color']) registerInspectorFieldComponent(datatype, (field, context) => scalar(field, context, () => {
  const element = document.createElement('input');
  element.type = datatype === 'date' ? 'date' : 'text';
  element.value = displayValue(context, field);
  if (datatype === 'datetime') element.placeholder = '2026-09-24T12:00:00Z';
  if (datatype === 'color') element.placeholder = '#RRGGBB';
  return element;
}));

registerInspectorFieldComponent('asset', (field, context) => scalar(field, context, value => {
  const element = document.createElement('input');
  element.type = 'text';
  element.placeholder = 'assets/...';
  element.value = value.status === 'value' ? value.value?.path || '' : '';
  return element;
}));

registerInspectorFieldComponent('reference', (field, context) => {
  const value = context.getValue(field.key);
  const wrapper = fieldFrame(field, value, context.issues);
  const resolution = context.resolveReference(field.key);
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Поиск карточки';
  search.setAttribute('aria-label', `Поиск: ${field.label}`);
  const select = document.createElement('select');
  associateControl(select, wrapper);
  const pages = context.referencePages(field);
  const populate = query => {
    const normalized = query.trim().toLocaleLowerCase();
    select.replaceChildren(option('', '— Не выбрано —'));
    pages.filter(page => !normalized || [page.name, page.title, ...(page.aliases || [])].some(text => String(text || '').toLocaleLowerCase().includes(normalized)))
      .forEach(page => select.append(option(page.id, page.name || page.title || page.id)));
    if (value.status === 'value' && ![...select.options].some(item => item.value === value.value.pageId)) {
      select.append(option(value.value.pageId, `Недоступная ссылка: ${value.value.pageId}`));
    }
    if (value.status === 'value') select.value = value.value.pageId;
  };
  populate('');
  search.addEventListener('input', () => populate(search.value));
  select.addEventListener('change', () => {
    if (select.value) context.onOperation({ op: field.computed?.allowOverride ? 'override' : 'set', key: field.key, value: { pageId: select.value } });
  });
  const disabled = (!field.computed?.allowOverride && (field.readonly || field.computed)) || field.binding.owner !== 'variables';
  search.disabled = disabled;
  select.disabled = disabled;
  if (!['value', 'absent'].includes(resolution.status)) {
    wrapper.errors.textContent = `Ссылка не разрешена: ${resolution.reason || resolution.status}.`;
    wrapper.errors.setAttribute('role', 'alert');
    select.setAttribute('aria-invalid', 'true');
  }
  wrapper.control.append(search, select);
  addActions(wrapper.actions, field, context, value);
  return wrapper.root;
});

registerInspectorFieldComponent('object', (field, context) => renderObject(field, context));
registerInspectorFieldComponent('array', (field, context) => field.items?.datatype === 'object' && field.items.rowIdentityKey
  ? renderRows(field, context)
  : renderJsonCollection(field, context));

function renderObject(field, context) {
  const value = context.getValue(field.key);
  const wrapper = fieldFrame(field, value, context.issues);
  const objectValue = value.status === 'value' && value.value && typeof value.value === 'object' ? value.value : {};
  const group = document.createElement('fieldset');
  group.className = 'card-inspector__nested';
  group.disabled = field.readonly || field.binding.owner !== 'variables';
  field.properties.forEach(property => {
    const nested = { ...property, key: `${field.key}.${property.key}`, label: property.label || property.key, binding: { owner: 'variables' } };
    const nestedContext = {
      ...context,
      getValue: () => hasValue(objectValue, property.key) ? { status: 'value', value: objectValue[property.key], source: 'stored' } : { status: 'absent' },
      onInput: (_, raw) => {
        const next = { ...objectValue };
        next[property.key] = normalizePrimitive(property, raw);
        context.onOperation({ op: 'set', key: field.key, value: next });
      },
      onOperation: operation => {
        const next = { ...objectValue };
        if (operation.op === 'unset') delete next[property.key];
        else next[property.key] = operation.value;
        context.onOperation({ op: 'set', key: field.key, value: next });
      }
    };
    group.append(renderInspectorField(nested, nestedContext));
  });
  wrapper.control.append(group);
  addActions(wrapper.actions, field, context, value);
  return wrapper.root;
}

function renderRows(field, context) {
  const value = context.getValue(field.key);
  const wrapper = fieldFrame(field, value, context.issues);
  const rows = Array.isArray(value.value) ? value.value : [];
  const list = document.createElement('ol');
  list.className = 'card-inspector__rows';
  rows.forEach((row, index) => {
    const rowId = row[field.items.rowIdentityKey];
    const item = document.createElement('li');
    item.className = 'card-inspector__row';
    item.dataset.rowId = rowId || '';
    const heading = document.createElement('strong');
    heading.textContent = `Строка ${index + 1}`;
    item.append(heading);
    field.items.properties.filter(property => property.key !== field.items.rowIdentityKey).forEach(property => {
      const label = document.createElement('label');
      label.textContent = property.label || property.key;
      const input = document.createElement('input');
      input.type = property.datatype === 'number' || property.datatype === 'integer' ? 'number' : 'text';
      input.value = row[property.key] ?? '';
      input.disabled = field.readonly || property.readonly || property.computed;
      input.addEventListener('change', () => context.onOperation({
        op: 'rowUpdate', key: field.key, rowId,
        value: { [property.key]: normalizePrimitive(property, input.value) }
      }));
      label.append(input);
      item.append(label);
    });
    const actions = document.createElement('div');
    actions.className = 'card-inspector__row-actions';
    actions.append(
      actionButton('Вверх', () => reorder(context, field, rows, index, index - 1), field.readonly || index === 0),
      actionButton('Вниз', () => reorder(context, field, rows, index, index + 1), field.readonly || index === rows.length - 1),
      actionButton('Удалить строку', () => context.onOperation({ op: 'rowRemove', key: field.key, rowId }), field.readonly)
    );
    item.append(actions);
    list.append(item);
  });
  const add = actionButton('Добавить строку', () => {
    const rowId = createStableRowId();
    const row = { [field.items.rowIdentityKey]: rowId };
    for (const property of field.items.properties) if (property.key !== field.items.rowIdentityKey && hasValue(property, 'default')) row[property.key] = structuredClone(property.default);
    context.onOperation({ op: 'rowAdd', key: field.key, rowId, value: row });
  }, field.readonly || field.binding.owner !== 'variables');
  wrapper.control.append(list, add);
  addActions(wrapper.actions, field, context, value);
  return wrapper.root;
}

function renderJsonCollection(field, context) {
  const value = context.getValue(field.key);
  const wrapper = fieldFrame(field, value, context.issues);
  const input = document.createElement('textarea');
  input.value = value.status === 'value' ? JSON.stringify(value.value, null, 2) : '';
  associateControl(input, wrapper);
  input.disabled = field.readonly || Boolean(field.computed) || field.binding.owner !== 'variables';
  input.addEventListener('change', () => {
    try { context.onOperation({ op: 'set', key: field.key, value: JSON.parse(input.value) }); }
    catch { context.onRawIssue(field.key, input.value, 'Введите корректный JSON-массив.'); }
  });
  wrapper.control.append(input);
  addActions(wrapper.actions, field, context, value);
  return wrapper.root;
}

function fieldFrame(field, value, issues) {
  const root = document.createElement('div');
  root.className = 'card-inspector__field';
  root.dataset.fieldKey = field.key;
  const id = `card-inspector-${field.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const label = document.createElement('label');
  label.id = `${id}-label`;
  label.textContent = `${field.label}${field.required ? ' *' : ''}`;
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
  errors.textContent = issues.filter(issue => issue.details?.key === field.key || String(issue.details?.path || '').includes(field.key)).map(issueMessage).join(' ');
  if (!errors.textContent && ['invalid', 'unresolved', 'unsupported'].includes(value.status)) {
    errors.textContent = `Значение недоступно: ${value.reason || value.status}.`;
  }
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

function addActions(container, field, context, value) {
  if (field.binding.owner !== 'variables') return;
  if (field.computed?.allowOverride) {
    if (field.nullable) container.append(actionButton('Установить override null', () => context.onOperation({ op: 'override', key: field.key, value: null })));
    if (value.source === 'override') container.append(actionButton('Сбросить override', () => context.onOperation({ op: 'resetOverride', key: field.key })));
    return;
  }
  if (!field.readonly && !field.computed) {
    container.append(actionButton('Сбросить', () => context.onOperation({ op: 'unset', key: field.key })));
    if (field.nullable) container.append(actionButton('Установить null', () => context.onOperation({ op: 'set', key: field.key, value: null })));
  }
}

function displayValue(context, field) {
  const raw = context.rawInputs[field.key];
  if (raw !== undefined) return String(raw);
  const value = context.getValue(field.key);
  return value.status === 'value' && value.value !== null ? String(value.value) : '';
}

function readControlValue(control, field) {
  if (field.datatype === 'boolean') return control.checked;
  if (field.datatype === 'enum') return field.options[Number(control.value)]?.value;
  return control.value;
}

function normalizePrimitive(field, raw) {
  if (field.datatype === 'boolean') return Boolean(raw);
  if (field.datatype === 'number' || field.datatype === 'integer') return Number(raw);
  return raw;
}

function option(value, label) {
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

function reorder(context, field, rows, from, to) {
  if (to < 0 || to >= rows.length) return;
  const ids = rows.map(row => row[field.items.rowIdentityKey]);
  const [id] = ids.splice(from, 1);
  ids.splice(to, 0, id);
  context.onOperation({ op: 'rowReorder', key: field.key, rowIds: ids });
}

function renderUnsupported(field) {
  const root = document.createElement('div');
  root.className = 'card-inspector__field card-inspector__field--unsupported';
  root.setAttribute('role', 'status');
  root.textContent = `${field.label}: datatype «${field.datatype}» не поддерживается Inspector.`;
  return root;
}
