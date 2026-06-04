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

  (schema?.fields || [])
    .forEach(field => {

      normalizedValues[field.name] =
        normalizePropertyValue(
          field,
          values[field.name]
        );
    });

  return {
    kind: 'PropertiesModel',
    version: 1,
    cardType,
    source,
    schema,
    values: normalizedValues
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
