import {
  getPropertyNumber,
  readPropertiesModelsFromHTML
} from './propertiesModel.js';

import {
  applyCharacterHealthChange,
  calculateAbilityModifier,
  calculateDndCheckValue,
  calculateProficiencyBonus,
  getCharacterHealth,
  readCharacterModelFromPage
} from '../character/characterModel.js';


export const DND_ABILITY_KEYS = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha'
];


export {
  calculateAbilityModifier,
  calculateDndCheckValue,
  calculateProficiencyBonus
};


export function getPageCharacterHealth(
  page
) {

  const model =
    readCharacterModelFromPage(
      page
    );

  if (model.source === 'empty') return null;

  return getCharacterHealth(
    model
  );
}


export function updatePageCharacterHealth(
  page,
  options = {}
) {

  if (
    updatePropertyHealth(
      page,
      options
    )
  ) {

    return getPropertyHealth(
      page
    );
  }

  return null;
}


export function readCharacterCalculationSources(
  page
) {

  const properties =
    readPropertiesModelsFromHTML(
      page?.content
    );

  const legacyDnd =
    getLegacyDndHealth(
      page
    );

  return {
    properties,
    legacyDnd,
    futureCharacterModel:
      readCharacterModelFromPage(
        page
      )
  };
}


function getPropertyHealth(
  page
) {

  const model =
    readPropertiesModelsFromHTML(
      page?.content
    )
      .find(candidate =>
        candidate.cardType === 'creature' ||
        candidate.cardType === 'character'
      );

  if (!model) return null;

  const current =
    getPropertyNumber(
      model,
      'hpCurrent',
      NaN
    );

  const max =
    getPropertyNumber(
      model,
      'hpMax',
      NaN
    );

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(max) ||
    max <= 0
  ) {

    return null;
  }

  return {
    current,
    max,
    temp:
      getPropertyNumber(
        model,
        'hpTemp',
        0
      ),
    source:
      'properties'
  };
}


function updatePropertyHealth(
  page,
  {
    delta = 0,
    temp = null,
    mode = 'delta'
  } = {}
) {

  if (
    typeof document === 'undefined' ||
    !page?.content
  ) {

    return false;
  }

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    stripFrontMatter(
      page.content
    );

  const block =
    wrapper.querySelector(
      '.card-properties-block[data-block-type="properties"][data-card-type="creature"], .card-properties-block[data-block-type="properties"][data-card-type="character"]'
    );

  if (!block) return false;

  const currentInput =
    block.querySelector(
      '[data-property-name="hpCurrent"]'
    );

  const maxInput =
    block.querySelector(
      '[data-property-name="hpMax"]'
    );

  const tempInput =
    block.querySelector(
      '[data-property-name="hpTemp"]'
    );

  if (
    !currentInput ||
    !maxInput
  ) {

    return false;
  }

  const nextModel =
    applyCharacterHealthChange(
      readCharacterModelFromPage(
        page
      ),
      {
        delta,
        temp,
        mode
      }
    );

  writeFieldValue(
    currentInput,
    nextModel.health.current
  );

  writeFieldValue(
    tempInput,
    nextModel.health.temp
  );

  page.content =
    replaceMarkdownBody(
      page.content,
      wrapper.innerHTML
    );

  return true;
}


function getLegacyDndHealth(
  page
) {

  if (
    typeof document === 'undefined' ||
    !page?.content
  ) {

    return null;
  }

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    stripFrontMatter(
      page.content
    );

  const block =
    wrapper.querySelector(
      '.dnd-stats-block'
    );

  if (!block) return null;

  const current =
    readNumberFromField(
      block.querySelector('.dnd-current-hp')
    );

  const max =
    readNumberFromField(
      block.querySelector('.dnd-max-hp')
    );

  if (
    current === null ||
    max === null ||
    max <= 0
  ) {

    return null;
  }

  return {
    current,
    max,
    temp:
      readDatasetNumber(
        block,
        'tempHp'
      ),
    source:
      'legacy-dnd'
  };
}


function readNumberFromField(
  field
) {

  if (!field) return null;

  const raw =
    field.value ||
    field.getAttribute('value') ||
    field.textContent ||
    '';

  const match =
    String(raw)
      .replace(',', '.')
      .match(/-?\d+(\.\d+)?/);

  if (!match) return null;

  const value =
    Number(match[0]);

  return Number.isFinite(value)
    ? value
    : null;
}


function readDatasetNumber(
  element,
  key
) {

  const value =
    Number(
      element?.dataset?.[key] || 0
    );

  return Number.isFinite(value)
    ? Math.max(
      0,
      Math.floor(value)
    )
    : 0;
}


function writeFieldValue(
  field,
  value
) {

  if (!field) return;

  const next =
    String(
      Math.max(
        0,
        Math.floor(Number(value) || 0)
      )
    );

  field.setAttribute(
    'value',
    next
  );

  if ('value' in field) {

    field.value =
      next;
  }
}


function stripFrontMatter(
  content
) {

  return String(content || '')
    .replace(/^---[\s\S]*?---/, '')
    .trim();
}


function replaceMarkdownBody(
  content,
  body
) {

  const frontMatter =
    String(content || '')
      .match(/^---[\s\S]*?---/);

  if (!frontMatter) return body;

  return `${frontMatter[0]}\n\n${body}\n`;
}
