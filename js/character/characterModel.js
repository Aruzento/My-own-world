import {
  getPropertyValue,
  readPropertiesModelsFromHTML
} from '../properties/propertiesModel.js';


export const CHARACTER_ABILITY_KEYS = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha'
];


// CharacterModel - первый доменный слой персонажа/существа.
// Он нормализует игровые числа так, чтобы карта и будущие системы не читали HTML напрямую.

export function createCharacterModel(
  {
    pageId = '',
    cardType = 'character',
    source = 'empty',
    level = 1,
    armorClass = 10,
    speed = 30,
    abilities = {},
    health = {},
    deathSaves = {},
    sources = {}
  } = {}
) {

  const normalizedLevel =
    normalizeInteger(
      level,
      1,
      {
        min: 1,
        max: 20
      }
    );

  const normalizedHealth =
    normalizeHealth(
      health
    );

  const normalizedDeathSaves =
    normalizeDeathSaves(
      deathSaves
    );

  return {
    kind: 'CharacterModel',
    version: 1,
    pageId,
    cardType,
    source,
    level: normalizedLevel,
    proficiencyBonus:
      calculateProficiencyBonus(
        normalizedLevel
      ),
    armorClass:
      normalizeInteger(
        armorClass,
        10,
        {
          min: 0
        }
      ),
    speed:
      normalizeInteger(
        speed,
        30,
        {
          min: 0
        }
      ),
    abilities:
      normalizeAbilities(
        abilities
      ),
    health: normalizedHealth,
    deathSaves: normalizedDeathSaves,
    sources: {
      properties:
        Boolean(
          sources.properties
        ),
      legacyDnd:
        Boolean(
          sources.legacyDnd
        )
    }
  };
}


export function createCharacterModelFromSources(
  {
    page = null,
    propertiesModels = [],
    legacyDndHealth = null
  } = {}
) {

  const propertyModel =
    propertiesModels.find(model =>
      model?.cardType === 'character' ||
      model?.cardType === 'creature'
    );

  if (propertyModel) {

    return createCharacterModelFromProperties({
      page,
      propertyModel,
      legacyDndHealth
    });
  }

  if (legacyDndHealth) {

    return createCharacterModel({
      pageId:
        page?.id || '',
      cardType:
        normalizeCardType(
          page?.type
        ),
      source:
        'legacy-dnd',
      health:
        legacyDndHealth,
      sources: {
        legacyDnd: true
      }
    });
  }

  return createCharacterModel({
    pageId:
      page?.id || '',
    cardType:
      normalizeCardType(
        page?.type
      )
  });
}


export function readCharacterModelFromPage(
  page
) {

  return createCharacterModelFromSources({
    page,
    propertiesModels:
      readPropertiesModelsFromHTML(
        page?.content
      ),
    legacyDndHealth:
      readLegacyDndHealthFromPage(
        page
      )
  });
}


export function getCharacterHealth(
  model
) {

  if (!model?.health) return null;

  return {
    current:
      model.health.current,
    max:
      model.health.max,
    temp:
      model.health.temp,
    percent:
      model.health.percent,
    isDown:
      model.health.isDown,
    source:
      model.source
  };
}


export function applyCharacterHealthChange(
  model,
  {
    delta = 0,
    temp = null,
    mode = 'delta'
  } = {}
) {

  const base =
    createCharacterModel(
      model
    );

  const max =
    base.health.max;

  let current =
    base.health.current;

  let nextTemp =
    temp === null
      ? base.health.temp
      : normalizeInteger(
        temp,
        0,
        {
          min: 0
        }
      );

  if (mode === 'restore') {

    current =
      max;

  } else if (mode === 'kill') {

    current =
      0;

  } else if (delta < 0) {

    const damage =
      Math.abs(
        normalizeInteger(
          delta,
          0
        )
      );

    const absorbed =
      Math.min(
        nextTemp,
        damage
      );

    nextTemp -=
      absorbed;

    current =
      clamp(
        current - (damage - absorbed),
        0,
        max
      );

  } else {

    current =
      clamp(
        current + normalizeInteger(
          delta,
          0
        ),
        0,
        max
      );
  }

  return createCharacterModel({
    ...base,
    health: {
      ...base.health,
      current,
      temp: nextTemp
    }
  });
}


export function calculateAbilityModifier(
  score
) {

  const value =
    Number(score);

  if (!Number.isFinite(value)) return 0;

  return Math.floor(
    (clamp(value, 1, 30) - 10) / 2
  );
}


export function calculateProficiencyBonus(
  level
) {

  const value =
    normalizeInteger(
      level,
      1,
      {
        min: 1,
        max: 20
      }
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

  return calculateAbilityModifier(
    score
  ) + (
    proficient
      ? normalizeInteger(
        proficiencyBonus,
        0
      )
      : 0
  );
}


export function readLegacyDndHealthFromPage(
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
      normalizeInteger(
        block.dataset.tempHp,
        0,
        {
          min: 0
        }
      )
  };
}


function createCharacterModelFromProperties(
  {
    page,
    propertyModel,
    legacyDndHealth
  }
) {

  return createCharacterModel({
    pageId:
      page?.id || '',
    cardType:
      normalizeCardType(
        propertyModel.cardType ||
        page?.type
      ),
    source:
      'properties',
    level:
      getModelNumber(
        propertyModel,
        'level',
        1
      ),
    armorClass:
      getModelNumber(
        propertyModel,
        'armorClass',
        10
      ),
    speed:
      getModelNumber(
        propertyModel,
        'speed',
        30
      ),
    abilities:
      readAbilitiesFromProperties(
        propertyModel
      ),
    health: {
      current:
        getModelNumber(
          propertyModel,
          'hpCurrent',
          legacyDndHealth?.current ?? 10
        ),
      max:
        getModelNumber(
          propertyModel,
          'hpMax',
          legacyDndHealth?.max ?? 10
        ),
      temp:
        getModelNumber(
          propertyModel,
          'hpTemp',
          legacyDndHealth?.temp ?? 0
        )
    },
    deathSaves: {
      successes:
        getModelNumber(
          propertyModel,
          'deathSaveSuccesses',
          0
        ),
      failures:
        getModelNumber(
          propertyModel,
          'deathSaveFailures',
          0
        )
    },
    sources: {
      properties: true,
      legacyDnd:
        Boolean(
          legacyDndHealth
        )
    }
  });
}


function readAbilitiesFromProperties(
  propertyModel
) {

  return Object.fromEntries(
    CHARACTER_ABILITY_KEYS.map(key => [
      key,
      getModelNumber(
        propertyModel,
        key,
        10
      )
    ])
  );
}


function getModelNumber(
  model,
  key,
  fallback = 0
) {

  const raw =
    getPropertyValue(
      model,
      key,
      null
    );

  // Пустое поле свойства означает "нет значения", а не число 0.
  if (
    raw === '' ||
    raw === null ||
    raw === undefined
  ) {

    return fallback;
  }

  const value =
    Number(
      raw
    );

  return Number.isFinite(
    value
  )
    ? value
    : fallback;
}


function normalizeAbilities(
  abilities
) {

  return Object.fromEntries(
    CHARACTER_ABILITY_KEYS.map(key => {

      const raw =
        typeof abilities[key] === 'object'
          ? abilities[key]?.score
          : abilities[key];

      const score =
        normalizeInteger(
          raw,
          10,
          {
            min: 1,
            max: 30
          }
        );

      return [
        key,
        {
          score,
          modifier:
            calculateAbilityModifier(
              score
            )
        }
      ];
    })
  );
}


function normalizeHealth(
  health
) {

  const max =
    normalizeInteger(
      health.max,
      10,
      {
        min: 1
      }
    );

  const current =
    clamp(
      normalizeInteger(
        health.current,
        max,
        {
          min: 0
        }
      ),
      0,
      max
    );

  const temp =
    normalizeInteger(
      health.temp,
      0,
      {
        min: 0
      }
    );

  return {
    current,
    max,
    temp,
    percent:
      max > 0
        ? current / max
        : 0,
    isDown:
      current <= 0
  };
}


function normalizeDeathSaves(
  deathSaves
) {

  const successes =
    normalizeInteger(
      deathSaves.successes,
      0,
      {
        min: 0,
        max: 3
      }
    );

  const failures =
    normalizeInteger(
      deathSaves.failures,
      0,
      {
        min: 0,
        max: 3
      }
    );

  return {
    successes,
    failures,
    isDead:
      failures >= 3
  };
}


function normalizeCardType(
  value
) {

  return value === 'creature'
    ? 'creature'
    : 'character';
}


function normalizeInteger(
  value,
  fallback,
  {
    min = -Infinity,
    max = Infinity
  } = {}
) {

  const number =
    Math.floor(
      Number(value)
    );

  if (!Number.isFinite(number)) {

    return clamp(
      fallback,
      min,
      max
    );
  }

  return clamp(
    number,
    min,
    max
  );
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


function stripFrontMatter(
  content
) {

  return String(content || '')
    .replace(/^---[\s\S]*?---/, '')
    .trim();
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
