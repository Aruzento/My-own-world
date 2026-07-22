import {
  iconSvg
} from '../core/icons.js';

import {
  PROPERTY_BLOCK_SCHEMAS
} from '../properties/propertySchemas.js';

import {
  PROPERTY_LAYOUT_COLUMNS,
  PROPERTY_LAYOUT_DEFAULT_WIDTH,
  PROPERTY_LAYOUT_MAX_HEIGHT,
  PROPERTY_LAYOUT_MIN_HEIGHT,
  normalizePropertyLayout,
  readPropertyLayoutFromField,
  serializePropertyLayout,
  writePropertyLayoutToField
} from '../properties/propertyLayoutModel.js';

import {
  closePopup,
  registerPopup
} from '../ui/popupManager.js';

import {
  createInternalRulePage,
  createInternalRulePageId,
  findInternalRuleByPageId,
  getInternalRuleEntries,
  getInternalRulesWorkspaceMeta
} from '../rulesWorkspace/rulesWorkspaceIndex.js';

import {
  state
} from '../state.js';


let popup =
  null;

let controller =
  null;

const popupAnchors =
  [];

const PROPERTY_FIELD_PRESETS =
  buildPropertyFieldPresets();

const PROPERTY_GRID_COLUMNS =
  PROPERTY_LAYOUT_COLUMNS;

const PROPERTY_DEFAULT_SPAN =
  PROPERTY_LAYOUT_DEFAULT_WIDTH;

const PROPERTY_MIN_ROWS =
  PROPERTY_LAYOUT_MIN_HEIGHT;

const PROPERTY_MAX_ROWS =
  PROPERTY_LAYOUT_MAX_HEIGHT;

const PROPERTY_METRIC_FIELD_IDS = new Set([
  'level',
  'proficiencyBonus',
  'initiative',
  'armorClass',
  'speed',
  'hpCurrent',
  'hpMax',
  'hpTemp',
  'deathSaveSuccesses',
  'deathSaveFailures'
]);

const PROPERTY_ABILITY_FIELD_IDS = new Set([
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha'
]);

const PROPERTY_COMPUTED_FIELD_IDS = new Set([
  'proficiencyBonus',
  'initiative',
  'armorClass'
]);


export function ensurePropertySettingsControls(
  editor
) {

  setupPropertySettingsDelegation(
    editor
  );

  setupPropertyFieldLayoutDelegation(
    editor
  );

  editor
    .querySelectorAll?.('.card-properties-block')
    .forEach(block => {

      block.dataset.propertyUiMigration =
        '0.0.1.8.11.4';

      ensurePropertySettingsButton(
        block
      );

      ensurePropertyFieldLayoutHandles(
        block
      );
    });

  if (
    editor.matches?.('.card-properties-block')
  ) {

    editor.dataset.propertyUiMigration =
      '0.0.1.8.11.4';

    ensurePropertySettingsButton(
      editor
    );

    ensurePropertyFieldLayoutHandles(
      editor
    );
  }
}


function ensurePropertySettingsButton(
  block
) {

  const title =
    block.querySelector('h2');

  if (!title) return;

  if (
    title.querySelector('.card-properties-settings-btn')
  ) return;

  const button =
    document.createElement('button');

  button.className =
    'card-properties-settings-btn';

  button.type =
    'button';

  button.title =
    'Настройки свойств';

  button.dataset.runtime =
    'true';

  button.setAttribute(
    'contenteditable',
    'false'
  );

  button.setAttribute(
    'aria-label',
    'Настройки свойств'
  );

  button.innerHTML =
    iconSvg('settings');

  title.appendChild(
    button
  );
}


function setupPropertySettingsDelegation(
  editor
) {

  if (
    editor.dataset.propertiesSettingsReady === 'true'
  ) return;

  editor.dataset.propertiesSettingsReady =
    'true';

  editor.addEventListener(
    'click',
    event => {

      const button =
        event.target.closest(
          '.card-properties-settings-btn'
        );

      if (!button) return;

      const block =
        button.closest(
          '.card-properties-block'
        );

      if (!block) return;

      event.preventDefault();
      event.stopPropagation();

      openPropertySettingsPopup(
        block,
        button,
        editor
      );
    }
  );
}


function openPropertySettingsPopup(
  block,
  anchor,
  editor
) {

  const settingsPopup =
    ensurePropertySettingsPopup();

  settingsPopup.innerHTML =
    createPropertySettingsHTML(
      block
    );

  bindPropertySettingsEvents(
    settingsPopup,
    block,
    editor,
    anchor
  );

  popupAnchors.splice(
    0,
    popupAnchors.length,
    anchor
  );

  controller.toggleNearAnchor(
    anchor,
    {
      fallbackWidth: 380,
      fallbackHeight: 520
    }
  );
}


function bindPropertySettingsEvents(
  settingsPopup,
  block,
  editor,
  anchor
) {

  settingsPopup
    .querySelector('.property-settings-close')
    ?.addEventListener(
      'click',
      () => controller?.close()
    );

  settingsPopup
    .querySelector('.property-settings-add')
    ?.addEventListener(
      'click',
      event => {

        event.preventDefault();

        settingsPopup
          .querySelector('.property-settings-new')
          ?.classList
          .remove('hidden');

        settingsPopup
          .querySelector('.property-settings-new-label')
          ?.focus();
      }
    );

  settingsPopup
    .querySelector('.property-settings-rules-toggle')
    ?.addEventListener(
      'click',
      event => {

        event.preventDefault();

        settingsPopup
          .querySelector('.property-settings-rules')
          ?.classList
          .toggle('hidden');
      }
    );

  settingsPopup
    .querySelector('.property-settings-rules-search')
    ?.addEventListener(
      'input',
      event => {

        filterInternalRulesTree(
          settingsPopup,
          event.currentTarget.value
        );
      }
    );

  settingsPopup
    .querySelectorAll('.property-settings-rule-open')
    .forEach(button => {

      button.addEventListener(
        'click',
        async event => {

          event.preventDefault();

          await openInternalRuleFromSettings(
            button.dataset.ruleId
          );
        }
      );
    });

  settingsPopup
    .querySelector('.property-settings-preset')
    ?.addEventListener(
      'change',
      event => {

        applyPropertyPresetToNewField(
          settingsPopup,
          event.currentTarget.value
        );
      }
    );

  settingsPopup
    .querySelector('.property-settings-create')
    ?.addEventListener(
      'click',
      () => {

        const created =
          addCustomPropertyFieldFromPopup(
            settingsPopup,
            block,
            editor
          );

        if (!created) return;

        openPropertySettingsPopup(
          block,
          anchor,
          editor
        );
      }
    );

  settingsPopup
    .querySelector('.property-settings-cancel-new')
    ?.addEventListener(
      'click',
      () => {

        settingsPopup
          .querySelector('.property-settings-new')
          ?.classList
          .add('hidden');
      }
    );

  settingsPopup
    .querySelectorAll('.property-settings-delete')
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          const fieldId =
            button.dataset.fieldId;

          removePropertyField(
            block,
            fieldId,
            editor
          );

          openPropertySettingsPopup(
            block,
            anchor,
            editor
          );
        }
      );
    });

}


function ensurePropertySettingsPopup() {

  if (popup) return popup;

  popup =
    document.createElement('div');

  popup.className =
    'property-settings-popup ui-panel hidden';

  popup.dataset.runtime =
    'true';

  popup.setAttribute(
    'contenteditable',
    'false'
  );

  popup.setAttribute(
    'aria-label',
    'Настройки свойств'
  );

  document.body.appendChild(
    popup
  );

  controller =
    registerPopup({
      popup,
      close: () => closePopup(popup),
      anchors: popupAnchors,
      key: 'property-settings-popup',
      kind: 'dialog',
      modal: true
    });

  return popup;
}


function createPropertySettingsHTML(
  block
) {

  const title =
    block.querySelector('h2')
      ?.textContent
      ?.replace('Настройки свойств', '')
      ?.trim() ||
    'Свойства';

  const fields =
    getVisiblePropertyFields(
      block
    );

  return `
    <div class="property-settings-header">
      <div>
        <p class="property-settings-kicker">Свойства карточки</p>
        <h3>${escapeHTML(title)}</h3>
      </div>

      <button
        class="property-settings-close"
        type="button"
        title="Закрыть"
      >
        ${iconSvg('x')}
      </button>
    </div>

    <div class="property-settings-body">
      <p class="property-settings-note">
        Базовые параметры зависят от типа карточки. Если карточке нужно
        больше данных, добавьте пользовательский параметр - он сохранится
        прямо в блоке.
      </p>

      <section class="property-settings-rules-section">
        <button
          class="property-settings-rules-toggle"
          type="button"
        >
          ${iconSvg('lore', 'property-settings-action-icon')}
          <span>Правила</span>
        </button>

        <div class="property-settings-rules hidden">
          ${createInternalRulesTreeHTML()}
        </div>
      </section>

      <div class="property-settings-list">
        ${fields.length > 0
          ? fields
            .map(createPropertySettingsFieldHTML)
            .join('')
          : `
            <div class="property-settings-empty">
              В этом блоке пока нет параметров.
            </div>
          `}
      </div>
    </div>

    <div class="property-settings-actions">
      <button
        class="property-settings-add"
        type="button"
        title="Добавить пользовательский параметр"
      >
        ${iconSvg('plus', 'property-settings-action-icon')}
        <span>Добавить параметр</span>
      </button>

      <div class="property-settings-new hidden">
        <label>
          <span>Готовый параметр</span>
          <select class="property-settings-preset">
            <option value="">Свое название</option>
            ${PROPERTY_FIELD_PRESETS
              .map(preset => `
                <option value="${escapeAttribute(preset.key)}">
                  ${escapeHTML(preset.label)}
                </option>
              `)
              .join('')}
          </select>
        </label>

        <label>
          <span>Название</span>
          <input
            class="property-settings-new-label"
            type="text"
            placeholder="Например: Радиус"
          >
        </label>

        <label>
          <span>Тип</span>
          <select class="property-settings-new-type">
            <option value="text">Короткий текст</option>
            <option value="number">Число</option>
            <option value="textarea">Длинный текст</option>
            <option value="checkbox">Да / нет</option>
          </select>
        </label>

        <div class="property-settings-new-actions">
          <button class="property-settings-create" type="button">
            Создать
          </button>

          <button class="property-settings-cancel-new" type="button">
            Отмена
          </button>
        </div>
      </div>
    </div>
  `;
}


function getVisiblePropertyFields(
  block
) {

  return [
    ...block.querySelectorAll('.card-property-field')
  ]
    .filter(field =>
      !field.classList.contains(
        'card-property-override-field'
      )
    )
    .map(field => {

      const label =
        field.querySelector('.card-property-label')
          ?.textContent
          ?.trim() ||
        Array.from(
          field.children
        ).find(child =>
          child.tagName === 'SPAN' &&
          !child.classList.contains(
            'card-property-drag-handle'
          ) &&
          !child.classList.contains(
            'card-property-resize-dot'
          )
        )
          ?.textContent
          ?.trim() ||
        'Параметр';

      const control =
        field.querySelector('input, select, textarea');

      const compound =
        field.dataset.propertyCompoundName;

      return {
        id:
          getPropertyFieldId(
            field
          ),
        label,
        type:
          compound
            ? 'составное'
            : getControlType(control),
        value:
          compound
            ? getCompoundControlValue(field)
            : getControlValue(control),
        custom:
          isCustomPropertyField(
            field
          ),
        wide:
          getPropertyFieldSpan(field) >= PROPERTY_GRID_COLUMNS
      };
    });
}


function createPropertySettingsFieldHTML(
  field
) {

  return `
    <article class="property-settings-row">
      <div>
        <strong>${escapeHTML(field.label)}</strong>
        <span>${escapeHTML(field.type)}</span>
      </div>

      <code>${escapeHTML(field.value || 'пусто')}</code>

      <button
        class="property-settings-delete"
        type="button"
        data-field-id="${escapeAttribute(field.id)}"
        title="Удалить параметр"
      >
        ${iconSvg('x')}
      </button>

    </article>
  `;
}


function createInternalRulesTreeHTML() {

  const meta =
    getInternalRulesWorkspaceMeta();

  const entries =
    getInternalRuleEntries();

  const childrenByParent =
    new Map();

  entries.forEach(entry => {

    const key =
      entry.parentId || '';

    if (!childrenByParent.has(key)) {

      childrenByParent.set(
        key,
        []
      );
    }

    childrenByParent
      .get(key)
      .push(entry);
  });

  const roots =
    childrenByParent.get('') || [];

  return `
    <div class="property-settings-rules-meta">
      <span>workspace: internal</span>
      <span>owner: ${escapeHTML(meta.owner)}</span>
      <span>source: ${escapeHTML(meta.source)}</span>
      <span>rules: ${meta.entries}</span>
    </div>

    <input
      class="property-settings-rules-search"
      type="search"
      placeholder="Найти правило..."
    >

    <div class="property-settings-rules-tree">
      ${roots
        .map(entry =>
          createInternalRuleNodeHTML(
            entry,
            childrenByParent,
            0
          )
        )
        .join('')}
    </div>
  `;
}


function createInternalRuleNodeHTML(
  entry,
  childrenByParent,
  level
) {

  const children =
    childrenByParent.get(
      entry.id
    ) || [];

  return `
    <article
      class="property-settings-rule-node"
      data-rule-search="${escapeAttribute(createRuleSearchText(entry))}"
      style="--rule-level: ${level}"
    >
      <button
        class="property-settings-rule-open"
        type="button"
        data-rule-id="${escapeAttribute(entry.id)}"
        title="Открыть правило"
      >
        <strong>${escapeHTML(entry.title)}</strong>
        <span>${escapeHTML(entry.summary || 'Справочный раздел')}</span>
      </button>
    </article>
    ${children
      .map(child =>
        createInternalRuleNodeHTML(
          child,
          childrenByParent,
          level + 1
        )
      )
      .join('')}
  `;
}


function createRuleSearchText(
  entry
) {

  return [
    entry.title,
    entry.summary,
    ...entry.aliases,
    ...entry.tags
  ]
    .join(' ')
    .toLowerCase();
}


function filterInternalRulesTree(
  settingsPopup,
  value
) {

  const query =
    String(value || '')
      .trim()
      .toLowerCase();

  settingsPopup
    .querySelectorAll('.property-settings-rule-node')
    .forEach(node => {

      const matches =
        !query ||
        node.dataset.ruleSearch?.includes(
          query
        );

      node.classList.toggle(
        'hidden',
        !matches
      );
    });
}


async function openInternalRuleFromSettings(
  ruleId
) {

  const entry =
    findInternalRuleByPageId(
      createInternalRulePageId(
        ruleId
      )
    );

  const page =
    createInternalRulePage(
      entry
    );

  if (!page) return;

  controller?.close();

  const {
    openPage
  } = await import('./editor.js');

  openPage(
    page
  );
}


function getControlType(
  control
) {

  if (!control) return 'поле';

  if (
    control.tagName === 'SELECT'
  ) return 'выбор';

  if (
    control.tagName === 'TEXTAREA'
  ) return 'текст';

  if (
    control.type === 'number'
  ) return 'число';

  if (
    control.type === 'checkbox'
  ) return 'да / нет';

  return 'строка';
}


function addCustomPropertyFieldFromPopup(
  settingsPopup,
  block,
  editor
) {

  const labelInput =
    settingsPopup.querySelector(
      '.property-settings-new-label'
    );

  const presetSelect =
    settingsPopup.querySelector(
      '.property-settings-preset'
    );

  const typeSelect =
    settingsPopup.querySelector(
      '.property-settings-new-type'
    );

  const preset =
    findPropertyFieldPreset(
      presetSelect?.value
    );

  const label =
    String(labelInput?.value || '')
      .trim() ||
    preset?.label ||
    '';

  const type =
    normalizeCustomFieldType(
      preset?.type ||
      typeSelect?.value
    );

  if (!label) {

    labelInput?.classList.add(
      'is-invalid'
    );

    return false;
  }

  const grid =
    block.querySelector(
      '.card-properties-grid'
    );

  if (!grid) return false;

  const fieldId =
    createPropertyFieldId(
      block,
      label,
      preset?.key
    );

  if (!fieldId) {

    labelInput?.classList.add(
      'is-invalid'
    );

    return false;
  }

  grid.insertAdjacentHTML(
    'beforeend',
    createCustomPropertyFieldHTML({
      id: fieldId,
      label,
      type,
      fields:
        preset?.fields || [],
      layout:
        findNextPropertyFreeLayout(
          block,
          type
        )
    })
  );

  ensurePropertyFieldLayoutHandles(
    block
  );

  synchronizePropertyBlockLayout(
    block
  );

  notifyPropertiesChanged(
    editor,
    block
  );

  return true;
}


function removePropertyField(
  block,
  fieldId,
  editor
) {

  if (!fieldId) return;

  const field =
    findPropertyFieldById(
      block,
      fieldId
    );

  if (!field) return;

  field.remove();

  synchronizePropertyBlockLayout(
    block
  );

  notifyPropertiesChanged(
    editor,
    block
  );
}


function findPropertyFieldById(
  block,
  fieldId
) {

  return [
    ...block.querySelectorAll('.card-property-field')
  ].find(field =>
    getPropertyFieldId(
      field
    ) === fieldId
  ) || null;
}


function createCustomPropertyFieldHTML(
  {
    id,
    label,
    type,
    fields = [],
    layout
  }
) {

  const safeId =
    escapeAttribute(id);

  const safeLabel =
    escapeHTML(label);

  if (type === 'compound') {

    return createCompoundPropertyFieldHTML({
      id:
        safeId,
      label:
        safeLabel,
      fields,
      layout:
        layout ||
        createDefaultPropertyLayout({
          type
        })
    });
  }

  const sharedClassName =
    [
      'card-property-field',
      'card-property-custom-field',
      type === 'textarea'
        ? 'card-property-textarea-field'
        : ''
    ]
      .filter(Boolean)
      .join(' ');

  const sharedAttributes = `
      class="${sharedClassName}"
      data-property-custom="true"
    data-property-id="${safeId}"
    data-property-label="${escapeAttribute(label)}"
    ${createPropertyLayoutAttributes(
      layout ||
      createDefaultPropertyLayout({
        type
      })
    )}
  `;

  if (type === 'textarea') {

    return `
      <label ${sharedAttributes}>
        <span>${safeLabel}</span>
        <div
          class="card-property-textarea rich-text-field"
          contenteditable="true"
          data-persistent-editable="true"
          data-property-name="${safeId}"
          data-property-custom-value="true"
          data-property-type="textarea"
          data-placeholder="Введите значение"
        ></div>
      </label>
    `;
  }

  if (type === 'checkbox') {

    return `
      <label ${sharedAttributes}>
        <span>${safeLabel}</span>
        <input
          type="checkbox"
          data-property-name="${safeId}"
          data-property-custom-value="true"
          data-property-type="checkbox"
        >
      </label>
    `;
  }

  return `
    <label ${sharedAttributes}>
      <span>${safeLabel}</span>
      <input
        type="${type === 'number' ? 'number' : 'text'}"
        data-property-name="${safeId}"
        data-property-custom-value="true"
        data-property-type="${escapeAttribute(type)}"
        placeholder="Значение"
      >
    </label>
  `;
}


function createCompoundPropertyFieldHTML(
  {
    id,
    label,
    fields,
    layout
  }
) {

  return `
    <section
      class="card-property-field card-property-compound-field"
      data-property-id="${id}"
      data-property-compound-name="${id}"
      ${createPropertyLayoutAttributes(layout)}
    >
      <span>${label}</span>
      <div class="card-property-compound-grid">
        ${(fields || [])
          .map(createCompoundPropertyControlHTML)
          .join('')}
      </div>
    </section>
  `;
}


function createCompoundPropertyControlHTML(
  field
) {

  const safeName =
    escapeAttribute(
      field.name || ''
    );

  const safeLabel =
    escapeHTML(
      field.label || field.name || ''
    );

  if (field.type === 'select') {

    return `
      <label class="card-property-subfield">
        <span>${safeLabel}</span>
        <select class="card-property-select" data-property-name="${safeName}">
          ${(field.options || [])
            .map(option => `
              <option value="${escapeAttribute(option)}">${escapeHTML(option)}</option>
            `)
            .join('')}
        </select>
      </label>
    `;
  }

  return `
    <label class="card-property-subfield">
      <span>${safeLabel}</span>
      <input
        type="${field.type === 'number' ? 'number' : 'text'}"
        data-property-name="${safeName}"
        data-property-type="${escapeAttribute(field.type || 'text')}"
        placeholder="${escapeAttribute(field.placeholder || '')}"
        ${field.min !== undefined ? `min="${escapeAttribute(field.min)}"` : ''}
        ${field.max !== undefined ? `max="${escapeAttribute(field.max)}"` : ''}
      >
    </label>
  `;
}


function createDefaultPropertyLayout(
  {
    type = 'text'
  } = {}
) {

  return normalizePropertyLayout({
    x: 0,
    y: 0,
    w:
      type === 'compound'
        ? 6
        : PROPERTY_DEFAULT_SPAN,
    h:
      type === 'compound'
        ? 2
        : 2,
    order:
      0,
    collapsed:
      false,
    groupId:
      null
  });
}


function findNextPropertyFreeLayout(
  block,
  type = 'text'
) {

  const width =
    type === 'compound'
      ? 6
      : PROPERTY_DEFAULT_SPAN;

  const height =
    type === 'compound'
      ? 2
      : 2;

  const occupied =
    [
      ...block.querySelectorAll(
        '.card-property-field'
      )
    ].map(field =>
      readPropertyLayoutFromField(
        field
      )
    );

  const maxY =
    occupied.reduce(
      (max, layout) =>
        Math.max(
          max,
          layout.y + layout.h
        ),
      0
    ) + 8;

  for (
    let y = 0;
    y <= maxY;
    y += 1
  ) {

    for (
      let x = 0;
      x <= PROPERTY_GRID_COLUMNS - width;
      x += 1
    ) {

      const candidate =
        normalizePropertyLayout({
          x,
          y,
          w:
            width,
          h:
            height,
          order:
            occupied.length
        });

      if (
        !occupied.some(layout =>
          propertyLayoutsOverlap(
            layout,
            candidate
          )
        )
      ) {

        return candidate;
      }
    }
  }

  return normalizePropertyLayout({
    x: 0,
    y:
      maxY + 1,
    w:
      width,
    h:
      height,
    order:
      occupied.length
  });
}


function propertyLayoutsOverlap(
  first,
  second
) {

  return !(
    first.x + first.w <= second.x ||
    second.x + second.w <= first.x ||
    first.y + first.h <= second.y ||
    second.y + second.h <= first.y
  );
}


function createPropertyLayoutAttributes(
  layout
) {

  return `
    data-property-layout='${escapeAttribute(
      serializePropertyLayout(
        layout
      )
    )}'
    data-property-x="${layout.x}"
    data-property-y="${layout.y}"
    data-property-span="${layout.w}"
    data-property-rows="${layout.h}"
    data-property-order="${layout.order}"
    data-property-collapsed="false"
  `;
}


function createPropertyFieldId(
  block,
  label,
  preferredKey
) {

  const preferred =
    String(preferredKey || '')
      .trim();

  if (
    preferred &&
    !block.querySelector(
      `[data-property-name="${CSS.escape(preferred)}"]`
    ) &&
    !block.querySelector(
      `.card-property-field[data-property-id="${CSS.escape(preferred)}"]`
    )
  ) {

    return preferred;
  }

  const base =
    slugifyPropertyLabel(
      label
    ) || 'custom';

  let index =
    1;

  let id =
    `custom-${base}`;

  while (
    block.querySelector(
      `[data-property-name="${CSS.escape(id)}"]`
    )
  ) {

    index += 1;
    id =
      `custom-${base}-${index}`;
  }

  return id;
}


function slugifyPropertyLabel(
  label
) {

  return String(label || '')
    .trim()
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}


function normalizeCustomFieldType(
  value
) {

  return [
    'text',
    'number',
    'textarea',
    'checkbox',
    'compound'
  ].includes(value)
    ? value
    : 'text';
}


function notifyPropertiesChanged(
  editor,
  block
) {

  block.dispatchEvent(
    new Event(
      'input',
      {
        bubbles: true
      }
    )
  );
}


function ensurePropertyFieldLayoutHandles(
  block
) {

  block
    .querySelectorAll('.card-property-field')
    .forEach(field => {

      ensurePropertyFieldLayoutState(
        field
      );

      classifyPropertyFieldContent(
        field
      );

      markPropertyFieldLabel(
        field
      );

      classifyPropertyFieldDesign(
        field
      );

      field
        .querySelectorAll('.card-property-drag-handle')
        .forEach(handle =>
          handle.remove()
        );

      ensurePropertyFieldResizeHandles(
        field
      );
    });

  ensurePropertyEntitySelects(
    block
  );

  ensurePropertySkillProficiencyControls(
    block
  );

  synchronizePropertyBlockLayout(
    block
  );
}


function ensurePropertyEntitySelects(
  block
) {

  block
    .querySelectorAll(
      'select[data-property-filter-type="item"]'
    )
    .forEach(select => {

      if (
        select.dataset.propertyName === 'armorItem'
      ) return;

      let currentValue =
        select.value ||
        select.getAttribute('value') ||
        '';

      const itemPages =
        state.pages
          .filter(page =>
            page.type === 'item'
          )
          .sort((left, right) =>
            String(left.title || '')
              .localeCompare(
                String(right.title || ''),
                'ru'
              )
          );

      const currentPage =
        itemPages.find(page =>
          page.id === currentValue ||
          page.title === currentValue
        );

      if (currentPage) {

        currentValue =
          currentPage.id;
      }

      const hasCurrent =
        !currentValue ||
        Boolean(currentPage);

      select.innerHTML = [
        '<option value="">Без доспеха</option>',
        !hasCurrent
          ? `<option value="${escapeAttribute(currentValue)}">${escapeHTML(currentValue)}</option>`
          : '',
        ...itemPages.map(page =>
          `<option value="${escapeAttribute(page.id)}">${escapeHTML(page.title || page.id)}</option>`
        )
      ].join('');

      select.value =
        currentValue;

      select.setAttribute(
        'value',
        currentValue
      );
    });
}


function ensurePropertySkillProficiencyControls(
  block
) {

  block
    .querySelectorAll(
      '.card-property-skill-proficiency'
    )
    .forEach(input => {

      if (
        input.previousElementSibling?.classList?.contains(
          'card-property-skill-proficiency-toggle'
        )
      ) {

        updateSkillProficiencyToggle(
          input.previousElementSibling,
          input
        );

        return;
      }

      const button =
        document.createElement('button');

      button.className =
        'card-property-skill-proficiency-toggle';

      button.type =
        'button';

      button.dataset.runtime =
        'true';

      button.setAttribute(
        'contenteditable',
        'false'
      );

      button.addEventListener(
        'click',
        event => {

          event.preventDefault();
          event.stopPropagation();

          const nextLevel =
            (readSkillProficiencyLevel(input) + 1) % 3;

          writeSkillProficiencyLevel(
            input,
            nextLevel
          );

          updateSkillProficiencyToggle(
            button,
            input
          );

          input.dispatchEvent(
            new Event(
              'input',
              {
                bubbles: true
              }
            )
          );

          input.dispatchEvent(
            new Event(
              'change',
              {
                bubbles: true
              }
            )
          );
        }
      );

      input.before(
        button
      );

      updateSkillProficiencyToggle(
        button,
        input
      );
    });
}


function readSkillProficiencyLevel(
  input
) {

  const level =
    Number(
      input.value ||
      input.dataset.skillProficiencyLevel ||
      0
    );

  return Number.isFinite(level)
    ? clampNumber(
      level,
      0,
      2
    )
    : 0;
}


function writeSkillProficiencyLevel(
  input,
  level
) {

  const normalized =
    clampNumber(
      Number(level) || 0,
      0,
      2
    );

  input.value =
    String(normalized);

  input.setAttribute(
    'value',
    String(normalized)
  );

  input.dataset.skillProficiencyLevel =
    String(normalized);
}


function updateSkillProficiencyToggle(
  button,
  input
) {

  const level =
    readSkillProficiencyLevel(
      input
    );

  button.dataset.level =
    String(level);

  button.title =
    level === 2
      ? 'Экспертность'
      : level === 1
      ? 'Владение'
      : 'Без владения';

  button.setAttribute(
    'aria-label',
    button.title
  );

  button.textContent =
    level === 2
      ? '++'
      : level === 1
      ? '+'
      : '';
}


function markPropertyFieldLabel(
  field
) {

  const label =
    Array.from(
      field.children
    ).find(child =>
      child.tagName === 'SPAN' &&
      !child.classList.contains('card-property-kind-badge') &&
      !child.classList.contains('card-property-drag-handle') &&
      !child.classList.contains('card-property-resize-dot')
    );

  if (!label) return;

  label.classList.add(
    'card-property-label'
  );
}


function classifyPropertyFieldDesign(
  field
) {

  const meta =
    getPropertyFieldDesignMeta(
      field
    );

  field.dataset.propertyVariant =
    meta.variant;

  field.dataset.propertyKindIcon =
    meta.iconName;

  if (meta.states.length > 0) {

    field.dataset.propertyState =
      meta.states.join(' ');

  } else {

    delete field.dataset.propertyState;
  }

  [
    'ability',
    'asset',
    'choice',
    'compound',
    'computed',
    'custom',
    'longform',
    'metric',
    'number',
    'relation',
    'skill-group',
    'text',
    'toggle'
  ].forEach(name => {

    field.classList.toggle(
      `card-property-field-${name}`,
      meta.variant === name ||
      meta.states.includes(name)
    );
  });

  ensurePropertyFieldKindBadge(
    field,
    meta
  );
}


function getPropertyFieldDesignMeta(
  field
) {

  const id =
    field.dataset.propertyId || '';

  const control =
    field.querySelector(
      '[data-property-name]'
    );

  const controlType =
    control?.dataset?.propertyType ||
    control?.getAttribute?.('type') ||
    control?.tagName?.toLowerCase() ||
    '';

  const custom =
    field.dataset.propertyCustom === 'true';

  const asset =
    Boolean(
      field.querySelector(
        '[data-property-asset-type]'
      )
    );

  const relation =
    Boolean(
      field.querySelector(
        '[data-property-filter-type], [data-property-type="entity"]'
      )
    );

  let variant =
    custom
      ? 'custom'
      : 'text';

  if (field.dataset.propertyGroupName) {

    variant =
      'skill-group';

  } else if (field.dataset.propertyCompoundName) {

    variant =
      'compound';

  } else if (asset) {

    variant =
      'asset';

  } else if (relation) {

    variant =
      'relation';

  } else if (field.classList.contains('card-property-textarea-field')) {

    variant =
      'longform';

  } else if (
    PROPERTY_ABILITY_FIELD_IDS.has(
      id
    )
  ) {

    variant =
      'ability';

  } else if (
    PROPERTY_METRIC_FIELD_IDS.has(
      id
    )
  ) {

    variant =
      'metric';

  } else if (control?.tagName === 'SELECT') {

    variant =
      'choice';

  } else if (controlType === 'checkbox') {

    variant =
      'toggle';

  } else if (controlType === 'number') {

    variant =
      'number';
  }

  const states = [];

  if (
    PROPERTY_COMPUTED_FIELD_IDS.has(
      id
    ) ||
    variant === 'skill-group'
  ) {

    states.push(
      'computed'
    );
  }

  if (custom) {

    states.push(
      'custom'
    );
  }

  if (
    asset ||
    relation
  ) {

    states.push(
      'asset'
    );
  }

  return {
    variant,
    states,
    iconName:
      getPropertyFieldIconName(
        variant,
        states
      ),
    title:
      getPropertyFieldKindTitle(
        variant,
        states
      )
  };
}


function getPropertyFieldIconName(
  variant,
  states
) {

  if (variant === 'skill-group') return 'skill';

  if (
    states.includes(
      'computed'
    )
  ) return 'calculator';

  if (
    variant === 'ability' ||
    variant === 'metric' ||
    variant === 'number'
  ) return 'hash';

  if (variant === 'compound') return 'grid';
  if (variant === 'longform') return 'document';
  if (variant === 'choice') return 'more';
  if (variant === 'relation' || variant === 'asset') return 'link';
  if (variant === 'toggle') return 'check';
  if (variant === 'custom') return 'edit';

  return 'edit';
}


function getPropertyFieldKindTitle(
  variant,
  states
) {

  if (
    states.includes(
      'computed'
    ) &&
    variant !== 'skill-group'
  ) return 'Расчетное поле';

  const titles = {
    ability: 'Характеристика',
    asset: 'Связанное поле',
    choice: 'Выбор',
    compound: 'Группа полей',
    custom: 'Пользовательский параметр',
    longform: 'Длинный текст',
    metric: 'Показатель',
    number: 'Число',
    relation: 'Связь',
    'skill-group': 'Группа навыков',
    text: 'Текст',
    toggle: 'Да / нет'
  };

  return titles[variant] || 'Параметр';
}


function ensurePropertyFieldKindBadge(
  field,
  meta
) {

  const label =
    field.querySelector(
      '.card-property-label'
    );

  if (!label) return;

  let badge =
    field.querySelector(
      '.card-property-kind-badge[data-runtime="true"]'
    );

  if (!badge) {

    badge =
      document.createElement(
        'span'
      );

    badge.className =
      'card-property-kind-badge';

    badge.dataset.runtime =
      'true';

    badge.setAttribute(
      'contenteditable',
      'false'
    );

    badge.setAttribute(
      'aria-hidden',
      'true'
    );

    label.insertAdjacentElement(
      'afterend',
      badge
    );
  }

  badge.dataset.propertyKind =
    meta.variant;

  badge.title =
    meta.title;

  badge.innerHTML =
    iconSvg(
      meta.iconName,
      'card-property-kind-icon'
    );
}


function classifyPropertyFieldContent(
  field
) {

  field.classList.toggle(
    'card-property-textarea-field',
    Boolean(
      field.querySelector(
        '.card-property-textarea'
      )
    )
  );
}


function ensurePropertyFieldResizeHandles(
  field
) {

  if (
    field.querySelector(
      '.card-property-resize-dot'
    )
  ) return;

  [
    'n',
    'e',
    's',
    'w',
    'ne',
    'nw',
    'se',
    'sw'
  ].forEach(edge => {

    const handle =
      document.createElement('span');

    handle.className =
      `card-property-resize-dot card-property-resize-dot-${edge}`;

    handle.title =
      'Изменить размер поля';

    handle.role =
      'button';

    handle.dataset.runtime =
      'true';

    handle.dataset.resizeEdge =
      edge;

    handle.setAttribute(
      'contenteditable',
      'false'
    );

    field.appendChild(
      handle
    );
  });
}


function setupPropertyFieldLayoutDelegation(
  editor
) {

  if (
    editor.dataset.propertiesLayoutReady === 'true'
  ) return;

  editor.dataset.propertiesLayoutReady =
    'true';

  let dragState =
    null;

  let resizeState =
    null;

  editor.addEventListener(
    'pointerdown',
    event => {

      const resizeHandle =
        event.target.closest(
          '.card-property-resize-dot'
        );

      if (resizeHandle) {

        const field =
          resizeHandle.closest(
            '.card-property-field'
          );

        if (!field) return;

        resizeState = {
          field,
          block:
            field.closest(
              '.card-properties-block'
            ),
          startX:
            event.clientX,
          startY:
            event.clientY,
          startSpan:
            getPropertyFieldSpan(
              field
            ),
          startRows:
            getPropertyFieldRows(
              field
            ),
          startLayout:
            readPropertyLayoutFromField(
              field
            ),
        edge:
            resizeHandle.dataset.resizeEdge || 'e',
        cellWidth:
            getPropertyGridColumnStep(
              field
            ),
        rowHeight:
            getPropertyGridRowStep(
              field
            ),
          appliedShiftX:
            0,
          appliedShiftY:
            0
        };

        field.classList.add(
          'is-property-resizing'
        );

        safelyCapturePointer(
          resizeHandle,
          event.pointerId
        );

        event.preventDefault();
        event.stopPropagation();

        return;
      }

      const field =
        getPropertyBorderDragField(
          event
        );

      if (!field) return;

      dragState = {
        field,
        block:
          field.closest(
            '.card-properties-block'
          ),
        grid:
          field.closest(
            '.card-properties-grid'
          ),
        placeholder:
          createPropertyDragPlaceholder(
            field
          ),
        ghost:
          createPropertyDragGhost(
            field
          ),
        pointerOffsetX:
          event.clientX - field.getBoundingClientRect().left,
        pointerOffsetY:
          event.clientY - field.getBoundingClientRect().top,
        currentIndex:
          getPropertyFieldIndex(
            field
          ),
        currentLayout:
          readPropertyLayoutFromField(
            field
          ),
        dropLayout:
          readPropertyLayoutFromField(
            field
          ),
        pendingIndex:
          null,
        animationFrame:
          null,
        originalDisplay:
          field.style.display,
        moved:
          false
      };

      dragState.grid?.insertBefore(
        dragState.placeholder,
        field
      );

      document.body.appendChild(
        dragState.ghost
      );

      movePropertyDragGhost(
        dragState,
        event.clientX,
        event.clientY
      );

      field.classList.add(
        'is-property-dragging'
      );

      field.style.display =
        'none';

      safelyCapturePointer(
        field,
        event.pointerId
      );

      event.preventDefault();
      event.stopPropagation();
    }
  );

  editor.addEventListener(
    'pointermove',
    event => {

      if (resizeState) {

        updatePropertyFieldResize(
          resizeState,
          event.clientX,
          event.clientY
        );

        event.preventDefault();
        return;
      }

      if (!dragState) return;

      updatePropertyFieldDrag(
        dragState,
        event.clientX,
        event.clientY
      );

      event.preventDefault();
    }
  );

  editor.addEventListener(
    'pointerup',
    () => {

      if (resizeState) {

        const {
          field,
          block
        } = resizeState;

        field.classList.remove(
          'is-property-resizing'
        );

        resolvePropertyBlockLayoutCollisions(
          block,
          field
        );

        resizeState =
          null;

        synchronizePropertyBlockLayout(
          block
        );

        notifyPropertiesChanged(
          editor,
          block
        );

        return;
      }

      if (!dragState) return;

      const {
        field,
        block,
        grid,
        placeholder,
        ghost,
        originalDisplay
      } = dragState;

      if (dragState.animationFrame) {

        cancelAnimationFrame(
          dragState.animationFrame
        );

        dragState.animationFrame =
          null;
      }

      flushPropertyPlaceholderMove(
        dragState
      );

      field.style.display =
        originalDisplay || '';

      if (grid) {

        setPropertyFieldLayout(
          field,
          {
            layout:
              dragState.dropLayout
          }
        );

        resolvePropertyBlockLayoutCollisions(
          block,
          field
        );
      }

      placeholder?.remove();
      ghost?.remove();

      field.classList.remove(
        'is-property-dragging'
      );

      synchronizePropertyBlockLayout(
        block
      );

      dragState =
        null;

      notifyPropertiesChanged(
        editor,
        block
      );
    }
  );
}


function getPropertyBorderDragField(
  event
) {

  if (
    event.button !== undefined &&
    event.button !== 0
  ) return null;

  if (
    event.target.closest(
      '.card-property-resize-dot'
    )
  ) return null;

  if (
    event.target.closest(
      'input, select, textarea, button, [contenteditable="true"]'
    )
  ) return null;

  const field =
    event.target.closest(
      '.card-property-field'
    );

  if (!field) return null;

  const rect =
    field.getBoundingClientRect();

  const edgeSize =
    12;

  const nearEdge =
    event.clientX - rect.left <= edgeSize ||
    rect.right - event.clientX <= edgeSize ||
    event.clientY - rect.top <= edgeSize ||
    rect.bottom - event.clientY <= edgeSize;

  return nearEdge
    ? field
    : null;
}


function updatePropertyFieldDrag(
  dragState,
  clientX,
  clientY
) {

  const {
    field,
    grid
  } = dragState;

  if (!grid) return;

  movePropertyDragGhost(
    dragState,
    clientX,
    clientY
  );

  const nextLayout =
    getPropertyDropLayoutFromPoint(
      grid,
      field,
      clientX,
      clientY
    );

  const layoutChanged =
    nextLayout.x !== dragState.dropLayout.x ||
    nextLayout.y !== dragState.dropLayout.y;

  if (
    !layoutChanged
  ) return;

  dragState.dropLayout =
    nextLayout;

  dragState.moved =
    true;

  setPropertyFieldLayout(
    dragState.placeholder,
    {
      layout:
        nextLayout
    }
  );

  previewPropertyDragLayout(
    dragState,
    nextLayout
  );
}


function previewPropertyDragLayout(
  dragState,
  nextLayout
) {

  const {
    grid,
    field,
    placeholder
  } = dragState;

  if (
    !grid ||
    !placeholder
  ) return;

  const previewNodes =
    getPropertyLayoutNodes(
      grid,
      field
    );

  const resolvedLayouts =
    createResolvedPropertyLayouts(
      previewNodes,
      placeholder
    );

  animatePropertyLayoutNodes(
    previewNodes,
    () => {

      previewNodes.forEach(node => {

        const layout =
          node === placeholder
            ? nextLayout
            : resolvedLayouts.get(
              node
            );

        if (!layout) return;

        applyPropertyFieldLayoutStyles(
          node,
          layout
        );
      });
    }
  );
}


function updatePropertyFieldResize(
  resizeState,
  clientX,
  clientY
) {

  const deltaX =
    clientX - resizeState.startX;

  const deltaY =
    clientY - resizeState.startY;

  let x =
    resizeState.startLayout.x;

  let y =
    resizeState.startLayout.y;

  let span =
    resizeState.startLayout.w ||
    resizeState.startSpan;

  let rows =
    resizeState.startLayout.h ||
    resizeState.startRows;

  if (
    resizeState.edge.includes('e')
  ) {

    span += Math.round(
      deltaX / resizeState.cellWidth
    );
  }

  if (
    resizeState.edge.includes('w')
  ) {

    const steps =
      Math.round(
        deltaX / resizeState.cellWidth
      );

    x +=
      steps;

    span -= steps;
  }

  if (
    resizeState.edge.includes('s')
  ) {

    rows += Math.round(
      deltaY / resizeState.rowHeight
    );
  }

  if (
    resizeState.edge.includes('n')
  ) {

    const steps =
      Math.round(
        deltaY / resizeState.rowHeight
      );

    y +=
      steps;

    rows -= steps;
  }

  const normalizedLayout =
    normalizePropertyLayout(
      {
        ...resizeState.startLayout,
        x,
        y,
        w:
          span,
        h:
          rows
      },
      resizeState.startLayout
    );

  setPropertyFieldLayout(
    resizeState.field,
    {
      layout:
        normalizedLayout
    }
  );
}


function createPropertyDragGhost(
  field
) {

  const rect =
    field.getBoundingClientRect();

  const ghost =
    field.cloneNode(
      true
    );

  ghost.classList.add(
    'card-property-drag-ghost'
  );

  ghost.dataset.runtime =
    'true';

  ghost.style.width =
    `${rect.width}px`;

  ghost.style.height =
    `${rect.height}px`;

  ghost
    .querySelectorAll(
      'input, select, textarea, [contenteditable="true"]'
    )
    .forEach(control => {

      control.setAttribute(
        'tabindex',
        '-1'
      );

      control.setAttribute(
        'aria-hidden',
        'true'
      );
    });

  return ghost;
}


function movePropertyDragGhost(
  dragState,
  clientX,
  clientY
) {

  const ghost =
    dragState.ghost;

  if (!ghost) return;

  ghost.style.transform =
    `translate3d(${clientX - dragState.pointerOffsetX}px, ${clientY - dragState.pointerOffsetY}px, 0)`;
}


function movePropertyPlaceholderToIndex(
  dragState
) {

  const {
    grid,
    field,
    placeholder
  } = dragState;

  if (
    !grid ||
    !placeholder
  ) return;

  const referenceNode =
    getPropertyNodeAtIndex(
      grid,
      dragState.currentIndex,
      field,
      placeholder
    );

  animatePropertyGridReflow(
    grid,
    () => {

      grid.insertBefore(
        placeholder,
        referenceNode
      );
    }
  );
}


function schedulePropertyPlaceholderMove(
  dragState
) {

  if (
    dragState.animationFrame
  ) return;

  dragState.animationFrame =
    requestAnimationFrame(
      () => {

        dragState.animationFrame =
          null;

        flushPropertyPlaceholderMove(
          dragState
        );
      }
    );
}


function flushPropertyPlaceholderMove(
  dragState
) {

  if (
    dragState.pendingIndex === null ||
    dragState.pendingIndex === undefined
  ) return;

  dragState.currentIndex =
    dragState.pendingIndex;

  dragState.pendingIndex =
    null;

  movePropertyPlaceholderToIndex(
    dragState
  );
}


function getPropertyDropIndexFromPoint(
  grid,
  field,
  placeholder,
  clientX,
  clientY
) {

  const fields =
    getPropertyLayoutNodes(
      grid,
      field,
      placeholder
    );

  if (fields.length === 0) return 0;

  const gridRect =
    grid.getBoundingClientRect();

  if (clientY <= gridRect.top) return 0;

  const ordered =
    fields.map((node, index) => ({
      index,
      rect:
        node.getBoundingClientRect()
    }));

  const rowTolerance =
    Math.max(
      10,
      Math.min(
        28,
        gridRect.height / 12
      )
    );

  for (const item of ordered) {

    const sameRow =
      clientY >= item.rect.top - rowTolerance &&
      clientY <= item.rect.bottom + rowTolerance;

    if (!sameRow) {

      if (
        clientY < item.rect.top + item.rect.height / 2
      ) {

        return item.index;
      }

      continue;
    }

    if (
      clientX < item.rect.left + item.rect.width / 2
    ) {

      return item.index;
    }
  }

  return fields.length;
}


function getPropertyDropLayoutFromPoint(
  grid,
  field,
  clientX,
  clientY
) {

  const rect =
    grid.getBoundingClientRect();

  const current =
    readPropertyLayoutFromField(
      field
    );

  const cellWidth =
    getPropertyGridColumnStep(
      grid
    );

  const rowHeight =
    getPropertyGridRowStep(
      grid
    );

  const x =
    Math.floor(
      (clientX - rect.left) / cellWidth
    );

  const y =
    Math.floor(
      (clientY - rect.top) / rowHeight
    );

  return normalizePropertyLayout(
    {
      ...current,
      x,
      y
    },
    current
  );
}


function getPropertyFieldIndex(
  field
) {

  const grid =
    field.closest(
      '.card-properties-grid'
    );

  if (!grid) return 0;

  return getPropertyLayoutNodes(
    grid
  ).indexOf(
    field
  );
}


function getPropertyFieldAtIndex(
  grid,
  index,
  ignoredField,
  ignoredPlaceholder
) {

  return getPropertyNodeAtIndex(
    grid,
    index,
    ignoredField,
    ignoredPlaceholder
  );
}


function getPropertyNodeAtIndex(
  grid,
  index,
  ignoredField,
  ignoredPlaceholder
) {

  const nodes =
    getPropertyLayoutNodes(
      grid,
      ignoredField,
      ignoredPlaceholder
    );

  return nodes[
    clampNumber(
      index,
      0,
      nodes.length
    )
  ] || null;
}


function getPropertyLayoutNodes(
  grid,
  ignoredField,
  ignoredPlaceholder
) {

  return [
    ...grid.children
  ].filter(node =>
    node !== ignoredField &&
    node !== ignoredPlaceholder &&
    (
      node.classList?.contains(
        'card-property-field'
      ) ||
      node.classList?.contains(
        'card-property-drop-placeholder'
      )
    )
  );
}


function animatePropertyGridReflow(
  grid,
  mutate
) {

  const nodes =
    getPropertyLayoutNodes(
      grid
    );

  const previousRects =
    new Map(
      nodes.map(node => [
        node,
        node.getBoundingClientRect()
      ])
    );

  mutate();

  nodes.forEach(node => {

    const previous =
      previousRects.get(
        node
      );

    if (!previous) return;

    const next =
      node.getBoundingClientRect();

    const deltaX =
      previous.left - next.left;

    const deltaY =
      previous.top - next.top;

    if (
      Math.abs(deltaX) < 1 &&
      Math.abs(deltaY) < 1
    ) return;

    node.style.transition =
      'none';

    node.style.transform =
      `translate3d(${deltaX}px, ${deltaY}px, 0)`;

    requestAnimationFrame(
      () => {

        node.style.transition =
          '';

        node.style.transform =
          '';
      }
    );
  });
}


function animatePropertyLayoutNodes(
  nodes,
  mutate
) {

  const previousRects =
    new Map(
      nodes.map(node => [
        node,
        node.getBoundingClientRect()
      ])
    );

  mutate();

  nodes.forEach(node => {

    const previous =
      previousRects.get(
        node
      );

    if (!previous) return;

    const next =
      node.getBoundingClientRect();

    const deltaX =
      previous.left - next.left;

    const deltaY =
      previous.top - next.top;

    if (
      Math.abs(deltaX) < 1 &&
      Math.abs(deltaY) < 1
    ) return;

    node.style.transition =
      'none';

    node.style.transform =
      `translate3d(${deltaX}px, ${deltaY}px, 0)`;

    requestAnimationFrame(
      () => {

        node.style.transition =
          '';

        node.style.transform =
          '';
      }
    );
  });
}


function shiftPropertyFieldBySteps(
  resizeState,
  steps,
  axis
) {

  const key =
    axis === 'x'
      ? 'appliedShiftX'
      : 'appliedShiftY';

  const diff =
    steps - resizeState[key];

  if (!diff) return;

  resizeState[key] =
    steps;

  movePropertyFieldInDom(
    resizeState.field,
    diff
  );
}


function movePropertyFieldInDom(
  field,
  steps
) {

  const grid =
    field.closest(
      '.card-properties-grid'
    );

  if (!grid) return;

  if (steps < 0) {

    for (
      let index = 0;
      index < Math.abs(steps);
      index += 1
    ) {

      const previous =
        getPreviousPropertyField(
          field
        );

      if (!previous) break;

      grid.insertBefore(
        field,
        previous
      );
    }

    return;
  }

  for (
    let index = 0;
    index < steps;
    index += 1
  ) {

    const next =
      getNextPropertyField(
        field
      );

    if (!next) break;

    grid.insertBefore(
      field,
      next.nextSibling
    );
  }
}


function getPreviousPropertyField(
  field
) {

  let node =
    field.previousElementSibling;

  while (node) {

    if (
      node.classList?.contains(
        'card-property-field'
      )
    ) return node;

    node =
      node.previousElementSibling;
  }

  return null;
}


function getNextPropertyField(
  field
) {

  let node =
    field.nextElementSibling;

  while (node) {

    if (
      node.classList?.contains(
        'card-property-field'
      )
    ) return node;

    node =
      node.nextElementSibling;
  }

  return null;
}


function createPropertyDragPlaceholder(
  field
) {

  const placeholder =
    document.createElement('div');

  placeholder.className =
    'card-property-drop-placeholder';

  placeholder.dataset.runtime =
    'true';

  placeholder.style.setProperty(
    '--property-field-span',
    String(
      getPropertyFieldSpan(field)
    )
  );

  placeholder.style.setProperty(
    '--property-field-min-height',
    `${Math.max(
      42,
      field.getBoundingClientRect().height
    )}px`
  );

  applyPropertyFieldLayoutStyles(
    placeholder,
    readPropertyLayoutFromField(
      field
    )
  );

  return placeholder;
}


function ensurePropertyFieldLayoutState(
  field
) {

  const layout =
    readPropertyLayoutFromField(
      field,
      {
        w:
          field.classList.contains(
            'card-property-field-wide'
          )
            ? PROPERTY_GRID_COLUMNS
            : PROPERTY_DEFAULT_SPAN,
        h:
          field.classList.contains(
            'card-property-field-wide'
          )
            ? 2
            : 2
      }
    );

  setPropertyFieldLayout(
    field,
    {
      span:
        layout.w,
      rows:
        layout.h,
      layout
    }
  );
}


function setPropertyFieldLayout(
  field,
  {
    span,
    rows,
    layout
  }
) {

  const nextLayout =
    {
      ...layout
    };

  if (span !== undefined) {

    nextLayout.w =
      span;
  }

  if (rows !== undefined) {

    nextLayout.h =
      rows;
  }

  const normalizedLayout =
    normalizePropertyLayout(
      nextLayout,
      readPropertyLayoutFromField(
        field
      )
    );

  writePropertyLayoutToField(
    field,
    normalizedLayout
  );

  applyPropertyFieldLayoutStyles(
    field,
    normalizedLayout
  );
}


function synchronizePropertyBlockLayout(
  block
) {

  const fields =
    [
      ...block.querySelectorAll(
        '.card-property-field'
      )
    ];

  const resolvedLayouts =
    createResolvedPropertyLayouts(
      fields
    );

  fields.forEach((field, order) => {

    const current =
      resolvedLayouts.get(
        field
      ) ||
      readPropertyLayoutFromField(
        field,
        {
          order
        }
      );

    const nextLayout =
      normalizePropertyLayout({
        ...current,
        order
      });

    writePropertyLayoutToField(
      field,
      nextLayout
    );

    applyPropertyFieldLayoutStyles(
      field,
      nextLayout
    );

  });
}


function resolvePropertyBlockLayoutCollisions(
  block,
  activeField
) {

  if (!block) return;

  const fields =
    [
      ...block.querySelectorAll(
        '.card-property-field'
      )
    ];

  const resolvedLayouts =
    createResolvedPropertyLayouts(
      fields,
      activeField
    );

  fields.forEach(field => {

    const layout =
      resolvedLayouts.get(
        field
      );

    if (!layout) return;

    writePropertyLayoutToField(
      field,
      layout
    );

    applyPropertyFieldLayoutStyles(
      field,
      layout
    );
  });
}


function createResolvedPropertyLayouts(
  fields,
  activeField = null
) {

  const original =
    new Map(
      fields.map((field, order) => [
        field,
        readPropertyLayoutFromField(
          field,
          {
            order
          }
        )
      ])
    );

  const ordered =
    [
      ...fields
    ].sort((first, second) => {

      if (first === activeField) return -1;
      if (second === activeField) return 1;

      const firstLayout =
        original.get(
          first
        );

      const secondLayout =
        original.get(
          second
        );

      return (
        firstLayout.y - secondLayout.y ||
        firstLayout.x - secondLayout.x ||
        firstLayout.order - secondLayout.order
      );
    });

  const placed =
    [];

  const resolved =
    new Map();

  ordered.forEach(field => {

    let layout =
      normalizePropertyLayout(
        original.get(
          field
        )
      );

    let changed =
      true;

    while (changed) {

      changed =
        false;

      for (const placedLayout of placed) {

        if (
          !propertyLayoutsOverlap(
            layout,
            placedLayout
          )
        ) continue;

        layout =
          normalizePropertyLayout(
            {
              ...layout,
              y:
                placedLayout.y + placedLayout.h
            },
            layout
          );

        changed =
          true;
      }
    }

    placed.push(
      layout
    );

    resolved.set(
      field,
      layout
    );
  });

  return resolved;
}


function applyPropertyFieldLayoutStyles(
  field,
  layout
) {

  field.style.setProperty(
    '--property-field-span',
    String(
      layout.w
    )
  );

  field.style.setProperty(
    '--property-field-rows',
    String(
      layout.h
    )
  );

  field.style.setProperty(
    '--property-field-min-height',
    `${52 + (layout.h - 1) * getPropertyGridRowHeight()}px`
  );

  field.style.gridColumn =
    `${layout.x + 1} / span ${layout.w}`;

  field.style.gridRow =
    `${layout.y + 1} / span ${layout.h}`;

  field.classList.toggle(
    'card-property-field-wide',
    layout.w >= PROPERTY_GRID_COLUMNS
  );
}


function getPropertyFieldSpan(
  field
) {

  return clampNumber(
    Number(
      field.dataset.propertySpan ||
      (
        field.classList.contains(
          'card-property-field-wide'
        )
          ? PROPERTY_GRID_COLUMNS
          : PROPERTY_DEFAULT_SPAN
      )
    ),
    1,
    PROPERTY_GRID_COLUMNS
  );
}


function getPropertyFieldRows(
  field
) {

  return clampNumber(
    Number(
      field.dataset.propertyRows || 1
    ),
    PROPERTY_MIN_ROWS,
    PROPERTY_MAX_ROWS
  );
}


function getPropertyGridCellWidth(
  field
) {

  const grid =
    field.closest(
      '.card-properties-grid'
    );

  if (!grid) return 64;

  const rect =
    grid.getBoundingClientRect();

  return Math.max(
    32,
    rect.width / PROPERTY_GRID_COLUMNS
  );
}


function getPropertyGridColumnStep(
  source
) {

  const grid =
    getPropertyGridElement(
      source
    );

  if (!grid) return 64;

  const rect =
    grid.getBoundingClientRect();

  const gap =
    getPropertyGridGap(
      grid,
      'column'
    );

  const trackWidth =
    (
      rect.width -
      gap * (PROPERTY_GRID_COLUMNS - 1)
    ) / PROPERTY_GRID_COLUMNS;

  return Math.max(
    32,
    trackWidth + gap
  );
}


function getPropertyGridRowStep(
  source
) {

  const grid =
    getPropertyGridElement(
      source
    );

  const gap =
    grid
      ? getPropertyGridGap(
        grid,
        'row'
      )
      : 0;

  return getPropertyGridRowHeight() + gap;
}


function getPropertyGridGap(
  grid,
  axis
) {

  const style =
    window.getComputedStyle(
      grid
    );

  const raw =
    axis === 'row'
      ? style.rowGap
      : style.columnGap;

  const value =
    Number.parseFloat(
      raw
    );

  return Number.isFinite(
    value
  )
    ? value
    : 0;
}


function getPropertyGridElement(
  source
) {

  if (
    source?.classList?.contains(
      'card-properties-grid'
    )
  ) return source;

  return source?.closest?.(
    '.card-properties-grid'
  ) || null;
}


function getPropertyGridRowHeight() {

  return 42;
}


function clampNumber(
  value,
  min,
  max
) {

  if (
    !Number.isFinite(value)
  ) return min;

  return Math.max(
    min,
    Math.min(
      max,
      Math.round(value)
    )
  );
}


function isCustomPropertyField(
  field
) {

  return field.dataset.propertyCustom === 'true';
}


function safelyCapturePointer(
  element,
  pointerId
) {

  try {

    element.setPointerCapture?.(
      pointerId
    );
  } catch {

    // Синтетические pointer-события в тестах не всегда имеют активный pointer.
  }
}


function buildPropertyFieldPresets() {

  const map =
    new Map();

  Object.values(
    PROPERTY_BLOCK_SCHEMAS
  ).forEach(schema => {

    schema.fields.forEach(field => {

      if (
        !field?.name ||
        map.has(field.name)
      ) return;

      map.set(
        field.name,
        {
          key:
            field.name,
          label:
            field.label,
          type:
            normalizeCustomFieldType(
              field.type
            ),
          fields:
            field.fields || []
        }
      );
    });
  });

  [
    {
      key: 'proficiencyBonus',
      label: 'Бонус мастерства',
      type: 'number'
    },
    {
      key: 'initiative',
      label: 'Инициатива',
      type: 'number'
    },
    {
      key: 'hitDice',
      label: 'Кости хитов',
      type: 'text'
    },
    {
      key: 'temporaryModifier',
      label: 'Временный модификатор',
      type: 'number'
    },
    {
      key: 'conditions',
      label: 'Состояния',
      type: 'textarea'
    },
    {
      key: 'effects',
      label: 'Эффекты',
      type: 'textarea'
    }
  ].forEach(preset => {

    if (!map.has(preset.key)) {

      map.set(
        preset.key,
        preset
      );
    }
  });

  return [
    ...map.values()
  ].sort((left, right) =>
    left.label.localeCompare(
      right.label,
      'ru'
    )
  );
}


function findPropertyFieldPreset(
  key
) {

  return PROPERTY_FIELD_PRESETS.find(preset =>
    preset.key === key
  ) || null;
}


function applyPropertyPresetToNewField(
  settingsPopup,
  key
) {

  const preset =
    findPropertyFieldPreset(
      key
    );

  if (!preset) return;

  const labelInput =
    settingsPopup.querySelector(
      '.property-settings-new-label'
    );

  const typeSelect =
    settingsPopup.querySelector(
      '.property-settings-new-type'
    );

  if (labelInput) {

    labelInput.value =
      preset.label;

    labelInput.classList.remove(
      'is-invalid'
    );
  }

  if (typeSelect) {

    typeSelect.value =
      normalizeCustomFieldType(
        preset.type
      );
  }
}


function getPropertyFieldId(
  field
) {

  return field.dataset.propertyId ||
    field.querySelector('[data-property-name]')
      ?.dataset.propertyName ||
    '';
}


function getControlValue(
  control
) {

  if (!control) return '';

  if (
    control.type === 'checkbox'
  ) {

    return control.checked ||
      control.hasAttribute('checked')
      ? 'да'
      : 'нет';
  }

  return control.value ||
    control.textContent ||
    '';
}


function getCompoundControlValue(
  field
) {

  return [
    ...field.querySelectorAll('[data-property-name]')
  ]
    .map(control =>
      getControlValue(
        control
      )
    )
    .map(value =>
      String(value || '').trim()
    )
    .filter(Boolean)
    .join(' / ');
}


function escapeHTML(
  value
) {

  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  );
}
