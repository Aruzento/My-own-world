import {
  iconSvg
} from '../core/icons.js';

import {
  PROPERTY_BLOCK_SCHEMAS
} from '../properties/propertySchemas.js';

import {
  closePopup,
  registerPopup
} from '../ui/popupManager.js';


let popup =
  null;

let controller =
  null;

const popupAnchors =
  [];

const PROPERTY_FIELD_PRESETS =
  buildPropertyFieldPresets();

const PROPERTY_GRID_COLUMNS =
  12;

const PROPERTY_DEFAULT_SPAN =
  3;

const PROPERTY_MIN_ROWS =
  1;

const PROPERTY_MAX_ROWS =
  8;


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

  document.body.appendChild(
    popup
  );

  controller =
    registerPopup({
      popup,
      close: () => closePopup(popup),
      anchors: popupAnchors,
      key: 'property-settings-popup'
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
        + Добавить параметр
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
        field.querySelector('span')
          ?.textContent
          ?.trim() ||
        'Параметр';

      const control =
        field.querySelector('input, select, textarea');

      return {
        id:
          getPropertyFieldId(
            field
          ),
        label,
        type:
          getControlType(control),
        value:
          getControlValue(control),
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
      type
    })
  );

  ensurePropertyFieldLayoutHandles(
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
    type
  }
) {

  const safeId =
    escapeAttribute(id);

  const safeLabel =
    escapeHTML(label);

  const sharedAttributes = `
      class="card-property-field card-property-custom-field"
      data-property-custom="true"
    data-property-id="${safeId}"
    data-property-label="${escapeAttribute(label)}"
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
    'checkbox'
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

      markPropertyFieldLabel(
        field
      );

      if (
        field.querySelector(
          '.card-property-drag-handle'
        )
      ) {

        ensurePropertyFieldResizeHandles(
          field
        );

        return;
      }

      const handle =
        document.createElement('span');

      handle.className =
        'card-property-drag-handle';

      handle.title =
        'Переместить поле';

      handle.role =
        'button';

      handle.dataset.runtime =
        'true';

      handle.setAttribute(
        'contenteditable',
        'false'
      );

      handle.innerHTML =
        iconSvg('grip');

      field.prepend(
        handle
      );

      ensurePropertyFieldResizeHandles(
        field
      );
    });
}


function markPropertyFieldLabel(
  field
) {

  const label =
    Array.from(
      field.children
    ).find(child =>
      child.tagName === 'SPAN' &&
      !child.classList.contains('card-property-drag-handle') &&
      !child.classList.contains('card-property-resize-dot')
    );

  if (!label) return;

  label.classList.add(
    'card-property-label'
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
        edge:
            resizeHandle.dataset.resizeEdge || 'e',
        cellWidth:
            getPropertyGridCellWidth(
              field
            ),
        rowHeight:
            getPropertyGridRowHeight(),
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

      const dragHandle =
        event.target.closest(
          '.card-property-drag-handle'
        );

      if (!dragHandle) return;

      const field =
        dragHandle.closest(
          '.card-property-field'
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
          )
      };

      field.classList.add(
        'is-property-dragging'
      );

      safelyCapturePointer(
        dragHandle,
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

        resizeState =
          null;

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
        placeholder
      } = dragState;

      placeholder?.remove();

      field.classList.remove(
        'is-property-dragging'
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

  const previousPointerEvents =
    field.style.pointerEvents;

  field.style.pointerEvents =
    'none';

  const target =
    document
      .elementFromPoint(
        clientX,
        clientY
      )
      ?.closest(
        '.card-property-field'
      );

  const gridTarget =
    document
      .elementFromPoint(
        clientX,
        clientY
      )
      ?.closest(
        '.card-properties-grid'
      );

  field.style.pointerEvents =
    previousPointerEvents;

  if (
    !target &&
    gridTarget === grid
  ) {

    grid.appendChild(
      dragState.placeholder
    );

    grid.insertBefore(
      field,
      dragState.placeholder
    );

    return;
  }

  if (
    !target ||
    target === field ||
    target === dragState.placeholder ||
    !grid.contains(target)
  ) return;

  const rect =
    target.getBoundingClientRect();

  const insertAfter =
    clientY >
    rect.top + rect.height / 2 ||
    (
      Math.abs(clientY - (rect.top + rect.height / 2)) < 8 &&
      clientX > rect.left + rect.width / 2
    );

  grid.insertBefore(
    dragState.placeholder,
    insertAfter
      ? target.nextSibling
      : target
  );

  grid.insertBefore(
    field,
    dragState.placeholder
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

  let span =
    resizeState.startSpan;

  let rows =
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

    span -= steps;

    shiftPropertyFieldBySteps(
      resizeState,
      steps,
      'x'
    );
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

    rows -= steps;

    shiftPropertyFieldBySteps(
      resizeState,
      steps,
      'y'
    );
  }

  setPropertyFieldLayout(
    resizeState.field,
    {
      span,
      rows
    }
  );
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

  return placeholder;
}


function ensurePropertyFieldLayoutState(
  field
) {

  const span =
    field.dataset.propertySpan ||
    (
      field.classList.contains(
        'card-property-field-wide'
      )
        ? PROPERTY_GRID_COLUMNS
        : PROPERTY_DEFAULT_SPAN
    );

  const rows =
    field.dataset.propertyRows ||
    (
      field.classList.contains(
        'card-property-field-wide'
      )
        ? 2
        : 1
    );

  setPropertyFieldLayout(
    field,
    {
      span,
      rows
    }
  );
}


function setPropertyFieldLayout(
  field,
  {
    span,
    rows
  }
) {

  const normalizedSpan =
    clampNumber(
      Number(span),
      1,
      PROPERTY_GRID_COLUMNS
    );

  const normalizedRows =
    clampNumber(
      Number(rows),
      PROPERTY_MIN_ROWS,
      PROPERTY_MAX_ROWS
    );

  field.dataset.propertySpan =
    String(normalizedSpan);

  field.dataset.propertyRows =
    String(normalizedRows);

  field.style.setProperty(
    '--property-field-span',
    String(normalizedSpan)
  );

  field.style.setProperty(
    '--property-field-rows',
    String(normalizedRows)
  );

  field.style.setProperty(
    '--property-field-min-height',
    `${52 + (normalizedRows - 1) * getPropertyGridRowHeight()}px`
  );

  field.classList.toggle(
    'card-property-field-wide',
    normalizedSpan >= PROPERTY_GRID_COLUMNS
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
            )
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
