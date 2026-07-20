import {
  getPropertySchema,
  getSchemaValueFields
} from './propertySchemas.js';

import {
  normalizePropertyLayout,
  readPropertyLayoutFromField
} from './propertyLayoutModel.js';


// PropertiesModel — легкая модель данных блока "Свойства".
// Она не зависит от конкретной верстки карточки, кроме data-property-name.

export function createPropertiesModel(
  {
    cardType = 'note',
    values = {},
    source = 'manual'
  } = {}
) {

  const schema =
    getPropertySchema(cardType);

  const normalizedValues = {};
  const normalizedCustomFields =
    [];
  const normalizedManualOverrides =
    normalizeManualOverrides(
      values.manualOverrides || {}
    );

  getSchemaValueFields(
    schema
  )
    .forEach(field => {

      normalizedValues[field.name] =
        normalizePropertyValue(
          field,
          values[field.name]
        );
    });

  Object.values(
    values.customFields || {}
  )
    .forEach(field => {

      const normalizedField =
        normalizeCustomPropertyField(
          field
        );

      if (!normalizedField) return;

      normalizedCustomFields.push(
        normalizedField
      );
    });

  return {
    kind: 'PropertiesModel',
    version: 1,
    cardType,
    source,
    schema,
    values: normalizedValues,
    layout:
      normalizePropertiesLayout(
        values.layout || {}
      ),
    customFields:
      normalizedCustomFields,
    manualOverrides:
      normalizedManualOverrides,
    customValues:
      {
        ...Object.fromEntries(
          normalizedCustomFields.map(field => [
            field.key,
            field.value
          ])
        ),
        ...normalizedManualOverrides
      }
  };
}


export function readPropertiesModelFromElement(
  block
) {

  if (!block) return null;

  const cardType =
    block.dataset.cardType || 'note';

  const schema =
    getPropertySchema(cardType);

  if (!schema) return null;

  const values = {};
  const layout = {};

  getSchemaValueFields(
    schema
  )
    .forEach(field => {

      values[field.name] =
        readPropertyValue(
          block,
          field.name
        );

      layout[field.name] =
        readPropertyFieldLayout(
          block,
          field.name
        );
    });

  values.customFields =
    readCustomPropertyFields(
      block
    );

  values.manualOverrides =
    readManualPropertyOverrides(
      block,
      schema
    );

  values.layout =
    {
      ...layout,
      ...readCustomPropertyLayout(
        block
      )
    };

  return createPropertiesModel({
    cardType,
    values,
    source: 'properties-block'
  });
}


export function readPropertiesModelsFromRoot(
  root
) {

  if (!root?.querySelectorAll) return [];

  return [
    ...root.querySelectorAll(
      '.card-properties-block[data-block-type="properties"]'
    )
  ]
    .map(readPropertiesModelFromElement)
    .filter(Boolean);
}


export function readPropertiesModelsFromHTML(
  html
) {

  if (
    typeof document === 'undefined' ||
    !html
  ) {

    return [];
  }

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    String(html || '');

  return readPropertiesModelsFromRoot(
    wrapper
  );
}


export function getPropertyValue(
  model,
  key,
  fallback = ''
) {

  if (!model?.values) return fallback;

  return Object.hasOwn(
    model.values,
    key
  )
    ? model.values[key]
    : fallback;
}


export function getPropertyNumber(
  model,
  key,
  fallback = 0
) {

  const value =
    Number(
      getPropertyValue(
        model,
        key,
        fallback
      )
    );

  return Number.isFinite(value)
    ? value
    : fallback;
}


export function normalizePropertyValue(
  field,
  value
) {

  if (field?.type === 'checkbox') {

    return Boolean(
      value
    );
  }

  if (field?.type === 'number') {

    if (
      value === '' ||
      value === null ||
      value === undefined
    ) {

      return '';
    }

    const number =
      Number(value);

    if (!Number.isFinite(number)) {

      return '';
    }

    return String(number);
  }

  return String(value ?? '').trim();
}


function readPropertyValue(
  block,
  name
) {

  const field =
    block.querySelector(
      `[data-property-name="${CSS.escape(name)}"]`
    );

  if (!field) return '';

  return readControlValue(
    field
  );
}


function readCustomPropertyFields(
  block
) {

  const customFields = {};

  block
    .querySelectorAll(
      '.card-property-field[data-property-custom="true"]'
    )
    .forEach(field => {

      const control =
        field.querySelector(
          '[data-property-name]'
        );

      const key =
        control?.dataset.propertyName ||
        field.dataset.propertyId ||
        '';

      if (!key) return;

      customFields[key] = {
        key,
        label:
          field.dataset.propertyLabel ||
          field.querySelector('span')?.textContent?.trim() ||
          key,
        type:
          control?.dataset.propertyType ||
          getControlType(
            control
          ),
        value:
          readControlValue(
            control
          ),
        layout:
          readPropertyLayoutFromField(
            field
          ),
        source:
          'custom'
      };
    });

  return customFields;
}


function readManualPropertyOverrides(
  block,
  schema
) {

  const overrides = {};

  getSchemaValueFields(
    schema
  )
    .forEach(field => {

      const control =
        block.querySelector(
          `[data-property-name="${CSS.escape(field.name)}"]`
        );

      if (
        !control ||
        control.dataset.propertyManual !== 'true'
      ) return;

      const value =
        readControlValue(
          control
        );

      if (
        value === '' ||
        value === null ||
        value === undefined
      ) return;

      overrides[`override-${field.name}`] =
        String(value);
    });

  return overrides;
}


function readCustomPropertyLayout(
  block
) {

  const layout = {};

  block
    .querySelectorAll(
      '.card-property-field[data-property-custom="true"]'
    )
    .forEach((field, order) => {

      const key =
        field.querySelector('[data-property-name]')
          ?.dataset
          ?.propertyName ||
        field.dataset.propertyId ||
        '';

      if (!key) return;

      layout[key] =
        readPropertyLayoutFromField(
          field,
          {
            order
          }
        );
    });

  return layout;
}


function readPropertyFieldLayout(
  block,
  name
) {

  const control =
    block.querySelector(
      `[data-property-name="${CSS.escape(name)}"]`
    );

  const field =
    control?.closest(
      '.card-property-field'
    );

  return readPropertyLayoutFromField(
    field,
    {
      order:
        getPropertyFieldOrder(
          field
        )
    }
  );
}


function normalizePropertiesLayout(
  layout
) {

  return Object.fromEntries(
    Object.entries(
      layout || {}
    )
      .filter(([
        key
      ]) => key)
      .map(([
        key,
        value
      ]) => [
        key,
        normalizePropertyLayout(
          value
        )
      ])
  );
}


function normalizeManualOverrides(
  overrides
) {

  return Object.fromEntries(
    Object
      .entries(
        overrides || {}
      )
      .filter(([
        key,
        value
      ]) =>
        key &&
        String(value ?? '').trim() !== ''
      )
      .map(([
        key,
        value
      ]) => [
        key,
        String(value ?? '').trim()
      ])
  );
}


function getPropertyFieldOrder(
  field
) {

  if (!field?.parentElement) return 0;

  return [
    ...field.parentElement.querySelectorAll(
      '.card-property-field'
    )
  ].indexOf(
    field
  );
}


function normalizeCustomPropertyField(
  field
) {

  if (!field?.key) return null;

  const type =
    normalizeCustomPropertyType(
      field.type
    );

  return {
    key:
      String(field.key || '')
        .trim(),
    label:
      String(field.label || field.key || '')
        .trim(),
    type,
    value:
      normalizeCustomPropertyValue(
        type,
        field.value
      ),
    layout:
      normalizePropertyLayout(
        field.layout || {}
      ),
    source:
      'custom'
  };
}


function normalizeCustomPropertyType(
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


function normalizeCustomPropertyValue(
  type,
  value
) {

  if (type === 'checkbox') {

    return Boolean(value);
  }

  if (type === 'number') {

    if (
      value === '' ||
      value === null ||
      value === undefined
    ) {

      return '';
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? String(number)
      : '';
  }

  return String(value ?? '').trim();
}


function readControlValue(
  control
) {

  if (!control) return '';

  if (
    control.type === 'checkbox'
  ) {

    return control.checked ||
      control.hasAttribute('checked');
  }

  if (
    control.matches('input, select, textarea')
  ) {

    if (control.type === 'checkbox') {

      return Boolean(
        control.checked ||
        control.hasAttribute('checked')
      );
    }

    return control.value ||
      control.getAttribute('value') ||
      '';
  }

  return control.textContent || '';
}


function getControlType(
  control
) {

  if (!control) return 'text';

  if (
    control.dataset.propertyType
  ) {

    return control.dataset.propertyType;
  }

  if (
    control.type === 'number'
  ) return 'number';

  if (
    control.type === 'checkbox'
  ) return 'checkbox';

  if (
    control.matches('[contenteditable="true"], textarea')
  ) return 'textarea';

  return 'text';
}
