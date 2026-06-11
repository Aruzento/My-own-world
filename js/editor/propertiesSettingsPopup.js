import {
  iconSvg
} from '../core/icons.js';

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


export function ensurePropertySettingsControls(
  editor
) {

  setupPropertySettingsDelegation(
    editor
  );

  editor
    .querySelectorAll('.card-properties-block')
    .forEach(block => {

      ensurePropertySettingsButton(
        block
      );
    });
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

          removeCustomPropertyField(
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
          )
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

      ${field.custom
        ? `
          <button
            class="property-settings-delete"
            type="button"
            data-field-id="${escapeAttribute(field.id)}"
            title="Удалить параметр"
          >
            ${iconSvg('x')}
          </button>
        `
        : ''}
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

  const typeSelect =
    settingsPopup.querySelector(
      '.property-settings-new-type'
    );

  const label =
    String(labelInput?.value || '')
      .trim();

  const type =
    normalizeCustomFieldType(
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
    createCustomPropertyId(
      block,
      label
    );

  grid.insertAdjacentHTML(
    'beforeend',
    createCustomPropertyFieldHTML({
      id: fieldId,
      label,
      type
    })
  );

  notifyPropertiesChanged(
    editor,
    block
  );

  return true;
}


function removeCustomPropertyField(
  block,
  fieldId,
  editor
) {

  if (!fieldId) return;

  const field =
    block.querySelector(
      `.card-property-field[data-property-custom="true"][data-property-id="${CSS.escape(fieldId)}"]`
    );

  if (!field) return;

  field.remove();

  notifyPropertiesChanged(
    editor,
    block
  );
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


function createCustomPropertyId(
  block,
  label
) {

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


function isCustomPropertyField(
  field
) {

  return field.dataset.propertyCustom === 'true';
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
