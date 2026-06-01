import {
  getPropertyNumber,
  readPropertiesModelsFromHTML
} from './propertiesModel.js';


export const DND_ABILITY_KEYS = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha'
];


export function calculateAbilityModifier(
  score
) {

  const value =
    Number(score);

  if (!Number.isFinite(value)) return 0;

  return Math.floor(
    (Math.max(1, Math.min(30, value)) - 10) / 2
  );
}


export function calculateProficiencyBonus(
  level
) {

  const value =
    Math.max(
      1,
      Math.min(
        20,
        Math.floor(Number(level) || 1)
      )
    );

  // DnD 5e: 1-4 = +2, 5-8 = +3, 9-12 = +4, 13-16 = +5, 17-20 = +6.
  return 2 + Math.floor(
    (value - 1) / 4
  );
}


export function calculateDndCheckValue(
  {
    score = 10,
    proficient = false,
    proficiencyBonus = 2
  } = {}
) {

  return calculateAbilityModifier(score) +
    (proficient ? Number(proficiencyBonus) || 0 : 0);
}


export function getPageCharacterHealth(
  page
) {

  const propertyHealth =
    getPropertyHealth(
      page
    );

  if (propertyHealth) return propertyHealth;

  return getLegacyDndHealth(
    page
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

  return {
    properties:
      readPropertiesModelsFromHTML(
        page?.content
      ),
    legacyDnd:
      getLegacyDndHealth(
        page
      ),
    futureCharacterModel:
      null
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

  const current =
    readNumberFromField(
      currentInput
    );

  const max =
    readNumberFromField(
      maxInput
    );

  if (
    !currentInput ||
    current === null ||
    max === null ||
    max <= 0
  ) {

    return false;
  }

  let nextCurrent =
    current;

  let nextTemp =
    temp === null
      ? readNumberFromField(tempInput) || 0
      : Math.max(
        0,
        Math.floor(Number(temp) || 0)
      );

  if (mode === 'restore') {

    nextCurrent =
      max;

  } else if (mode === 'kill') {

    nextCurrent =
      0;

  } else if (delta < 0) {

    const damage =
      Math.abs(delta);

    const absorbed =
      Math.min(
        nextTemp,
        damage
      );

    nextTemp -=
      absorbed;

    nextCurrent =
      clamp(
        current - (damage - absorbed),
        0,
        max
      );

  } else {

    nextCurrent =
      clamp(
        current + delta,
        0,
        max
      );
  }

  writeFieldValue(
    currentInput,
    nextCurrent
  );

  writeFieldValue(
    tempInput,
    nextTemp
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


function clamp(
  value,
  min,
  max
) {

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}
