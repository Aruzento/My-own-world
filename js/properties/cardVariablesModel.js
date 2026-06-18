import {
  getPropertySchema,
  getSchemaValueFields
} from './propertySchemas.js';

import {
  getPropertyValue,
  readPropertiesModelsFromHTML
} from './propertiesModel.js';


// CardVariablesModel закрепляет идею старого блока "Переменные":
// переменные сущности теперь живут в типизированном блоке "Свойства".
// UI может быть разным для предмета, навыка или персонажа, но расчетные
// подсистемы получают единый список стабильных ключей и значений.
export function createCardVariablesModel(
  {
    pageId = '',
    cardType = 'note',
    propertiesModel = null,
    source = 'empty'
  } = {}
) {

  const schema =
    getPropertySchema(
      cardType
    );

  const variables =
    [
      ...getSchemaValueFields(
        schema
      ),
      ...getCustomVariableFields(
        propertiesModel
      )
    ]
      .map(field =>
        createCardVariable(
          field,
          getPropertyValue(
            propertiesModel,
            field.name || field.key,
            getCustomPropertyValue(
              propertiesModel,
              field.name || field.key
            )
          )
        )
      );

  return {
    kind: 'CardVariablesModel',
    version: 1,
    pageId,
    cardType,
    source:
      variables.length
        ? source
        : 'empty',
    variables,
    byKey:
      Object.fromEntries(
        variables.map(variable => [
          variable.key,
          variable
        ])
      )
  };
}


function getCustomVariableFields(
  propertiesModel
) {

  return (propertiesModel?.customFields || [])
    .map(field => ({
      name:
        field.key,
      label:
        field.label,
      type:
        field.type,
      source:
        'custom'
    }));
}


function getCustomPropertyValue(
  propertiesModel,
  key
) {

  return propertiesModel?.customValues?.[key] ?? '';
}


export function createCardVariablesFromPropertiesModel(
  {
    pageId = '',
    cardType = '',
    propertiesModel = null
  } = {}
) {

  return createCardVariablesModel({
    pageId,
    cardType:
      cardType ||
      propertiesModel?.cardType ||
      'note',
    propertiesModel,
    source:
      propertiesModel
        ? 'properties-block'
        : 'empty'
  });
}


export function readCardVariablesFromPage(
  page
) {

  const models =
    readPropertiesModelsFromHTML(
      page?.content
    );

  const propertiesModel =
    models.find(model =>
      model.cardType === page?.type
    ) ||
    models[0] ||
    null;

  return createCardVariablesFromPropertiesModel({
    pageId:
      page?.id || '',
    cardType:
      page?.type ||
      propertiesModel?.cardType ||
      'note',
    propertiesModel
  });
}


export function getCardVariable(
  model,
  key,
  fallback = null
) {

  return model?.byKey?.[key] || fallback;
}


export function getCardVariableValue(
  model,
  key,
  fallback = ''
) {

  const variable =
    getCardVariable(
      model,
      key,
      null
    );

  return variable
    ? variable.value
    : fallback;
}


function createCardVariable(
  field,
  rawValue
) {

  return {
    key:
      field.name,
    label:
      field.label,
    type:
      field.type || 'text',
    value:
      normalizeVariableValue(
        field,
        rawValue
      ),
    rawValue:
      String(rawValue ?? ''),
    source:
      field.source || 'properties-block'
  };
}


function normalizeVariableValue(
  field,
  rawValue
) {

  if (field.type !== 'number') {

    if (field.type === 'checkbox') {

      return Boolean(
        rawValue
      );
    }

    return String(rawValue ?? '').trim();
  }

  if (
    rawValue === '' ||
    rawValue === null ||
    rawValue === undefined
  ) {

    return null;
  }

  const number =
    Number(
      rawValue
    );

  return Number.isFinite(
    number
  )
    ? number
    : null;
}
