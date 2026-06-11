import {
  createPropertiesBlock
} from '../templates/blockTypes.js';

import {
  applyBlockSystemContract
} from '../editor/blocks/blockContract.js';


// Этот модуль записывает изменения UI обратно в блок "Свойства".
// Он не считает значения сам: его задача - сохранить один источник данных.
export function ensurePropertiesBlockForPage(
  editor,
  page
) {

  if (!editor || !page) return null;

  const cardType =
    page.type || 'note';

  const existing =
    editor.querySelector(
      `.card-properties-block[data-block-type="properties"][data-card-type="${CSS.escape(cardType)}"]`
    ) ||
    editor.querySelector(
      '.card-properties-block[data-block-type="properties"]'
    );

  if (existing) return existing;

  const main =
    editor.querySelector(
      '.entity-main'
    );

  if (!main) return null;

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    createPropertiesBlock({
      cardType,
      title:
        cardType === 'character'
          ? 'Свойства персонажа'
          : cardType === 'creature'
            ? 'Свойства существа'
            : 'Свойства'
    });

  const block =
    wrapper.firstElementChild;

  if (!block) return null;

  const toolbar =
    main.querySelector(
      '.blocks-toolbar'
    );

  if (toolbar?.nextSibling) {

    main.insertBefore(
      block,
      toolbar.nextSibling
    );

  } else {

    main.appendChild(
      block
    );
  }

  applyBlockSystemContract(
    editor
  );

  return block;
}


export function setPropertyFieldValue(
  block,
  key,
  value
) {

  const control =
    block?.querySelector(
      `[data-property-name="${CSS.escape(key)}"]`
    );

  if (!control) return false;

  if (control.type === 'checkbox') {

    control.checked =
      Boolean(value);

    control.toggleAttribute(
      'checked',
      control.checked
    );

    return true;
  }

  if (
    control.matches(
      'input, select, textarea'
    )
  ) {

    control.value =
      String(value ?? '');

    control.setAttribute(
      'value',
      String(value ?? '')
    );

    if (control.matches('select')) {

      [...control.options].forEach(option => {

        option.toggleAttribute(
          'selected',
          option.value === control.value
        );
      });
    }

    return true;
  }

  control.textContent =
    String(value ?? '');

  return true;
}


export function setCalculatedPropertyOverride(
  block,
  key,
  value
) {

  if (!block || !key) return false;

  const overrideKey =
    `override-${key}`;

  const field =
    ensureCustomHiddenNumberField(
      block,
      overrideKey,
      `Ручное значение: ${key}`
    );

  if (!field) return false;

  const input =
    field.querySelector(
      '[data-property-name]'
    );

  const normalized =
    String(value ?? '').trim();

  input.value =
    normalized;

  input.setAttribute(
    'value',
    normalized
  );

  field.classList.toggle(
    'is-manual-override',
    normalized !== ''
  );

  return true;
}


export function notifyPropertiesInput(
  block
) {

  block?.dispatchEvent(
    new Event(
      'input',
      {
        bubbles: true
      }
    )
  );
}


function ensureCustomHiddenNumberField(
  block,
  key,
  label
) {

  const existing =
    block.querySelector(
      `.card-property-field[data-property-id="${CSS.escape(key)}"]`
    );

  if (existing) return existing;

  const grid =
    block.querySelector(
      '.card-properties-grid'
    );

  if (!grid) return null;

  const field =
    document.createElement('label');

  field.className =
    'card-property-field card-property-custom-field card-property-override-field';

  field.dataset.propertyCustom =
    'true';

  field.dataset.propertyId =
    key;

  field.dataset.propertyLabel =
    label;

  field.innerHTML = `
    <span>${escapeHTML(label)}</span>
    <input
      type="number"
      data-property-name="${escapeAttribute(key)}"
      data-property-custom-value="true"
      data-property-type="number"
      placeholder="авто"
    >
  `;

  grid.appendChild(
    field
  );

  return field;
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
