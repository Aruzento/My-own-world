import {
  getPropertySchema
} from './propertySchemas.js';


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

  (schema?.fields || [])
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
    customFields:
      normalizedCustomFields,
    customValues:
      Object.fromEntries(
        normalizedCustomFields.map(field => [
          field.key,
          field.value
        ])
      )
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

  schema.fields
    .forEach(field => {

      values[field.name] =
        readPropertyValue(
          block,
          field.name
        );
    });

  values.customFields =
    readCustomPropertyFields(
      block
    );

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

  if (
    field.matches('input, select, textarea')
  ) {

    return field.value ||
      field.getAttribute('value') ||
      '';
  }

  return field.textContent || '';
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
        source:
          'custom'
      };
    });

  return customFields;
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
