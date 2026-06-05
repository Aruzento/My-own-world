export const CHARACTER_CONDITION_KEYS = [
  'blinded',
  'charmed',
  'deafened',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
  'exhaustion'
];

export const CONDITION_LABELS = {
  blinded: 'Ослеплен',
  charmed: 'Очарован',
  deafened: 'Оглох',
  frightened: 'Испуган',
  grappled: 'Схвачен',
  incapacitated: 'Недееспособен',
  invisible: 'Невидим',
  paralyzed: 'Парализован',
  petrified: 'Окаменел',
  poisoned: 'Отравлен',
  prone: 'Лежит',
  restrained: 'Опутан',
  stunned: 'Ошеломлен',
  unconscious: 'Без сознания',
  exhaustion: 'Истощение'
};

const CONDITIONS_THAT_INCAPACITATE = new Set([
  'incapacitated',
  'paralyzed',
  'petrified',
  'stunned',
  'unconscious'
]);

const SPEED_ZERO_CONDITIONS = new Set([
  'grappled',
  'paralyzed',
  'petrified',
  'restrained',
  'stunned',
  'unconscious'
]);

const DEFAULT_MODIFIERS = {
  armorClass: 0,
  speed: 0,
  initiative: 0,
  proficiencyBonus: 0,
  abilityScores: {},
  abilityChecks: {},
  savingThrows: {},
  skills: {}
};

const EFFECT_SOURCE_TYPES = [
  'manual',
  'condition',
  'item',
  'spell',
  'skill',
  'feature',
  'rule',
  'world-package'
];


// EffectsModel хранит активные состояния и эффекты как данные, а не как HTML.
// UI, карта и будущий Rule Tree читают этот слой, не разбирая подписи в карточке.
export function createEffectsModel(
  options = {}
) {

  const {
    conditions = [],
    effects = [],
    selectedRuleIds = [],
    source = 'empty'
  } = options || {};

  const normalizedConditions =
    normalizeConditions(
      conditions
    );

  const normalizedEffects =
    normalizeEffects(
      effects
    );

  return {
    kind: 'EffectsModel',
    version: 1,
    source:
      normalizedConditions.length ||
      normalizedEffects.length
        ? source
        : 'empty',
    conditions:
      normalizedConditions,
    effects:
      normalizedEffects,
    selectedRuleIds:
      normalizeIdList(
        selectedRuleIds
      ),
    modifiers:
      calculateEffectModifiers(
        normalizedEffects
      ),
    flags:
      calculateConditionFlags(
        normalizedConditions
      )
  };
}


export function readEffectsModelFromPage(
  page
) {

  return readEffectsModelFromHTML(
    page?.content
  );
}


export function readEffectsModelFromHTML(
  html
) {

  if (
    typeof document === 'undefined' ||
    !html
  ) {

    return createEffectsModel();
  }

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    stripFrontMatter(
      html
    );

  const dataElement =
    wrapper.querySelector(
      '[data-character-effects]'
    );

  if (!dataElement) {

    return createEffectsModel();
  }

  return createEffectsModel({
    ...readJSON(
      dataElement.textContent ||
      dataElement.getAttribute('data-character-effects') ||
      ''
    ),
    source:
      'effects-data'
  });
}


export function addCharacterCondition(
  effectsModel,
  condition
) {

  const model =
    createEffectsModel(
      effectsModel
    );

  const normalized =
    normalizeCondition(
      condition
    );

  if (!normalized) return model;

  return createEffectsModel({
    conditions: [
      ...model.conditions.filter(item =>
        item.key !== normalized.key
      ),
      normalized
    ],
    effects:
      model.effects,
    selectedRuleIds:
      model.selectedRuleIds,
    source:
      model.source === 'empty'
        ? 'manual'
        : model.source
  });
}


export function removeCharacterCondition(
  effectsModel,
  conditionKey
) {

  const normalizedKey =
    normalizeConditionKey(
      conditionKey
    );

  return createEffectsModel({
    conditions:
      createEffectsModel(
        effectsModel
      )
        .conditions
        .filter(condition =>
          condition.key !== normalizedKey
        ),
    effects:
      effectsModel?.effects || [],
    selectedRuleIds:
      effectsModel?.selectedRuleIds || [],
    source:
      effectsModel?.source || 'manual'
  });
}


export function toggleCharacterCondition(
  effectsModel,
  condition
) {

  const model =
    createEffectsModel(
      effectsModel
    );

  const normalized =
    normalizeCondition(
      condition
    );

  if (!normalized) return model;

  return model.conditions.some(item => item.key === normalized.key)
    ? removeCharacterCondition(
      model,
      normalized.key
    )
    : addCharacterCondition(
      model,
      normalized
    );
}


export function addCharacterEffect(
  effectsModel,
  effect
) {

  const model =
    createEffectsModel(
      effectsModel
    );

  const normalized =
    normalizeEffect(
      effect
    );

  if (!normalized) return model;

  return createEffectsModel({
    conditions:
      model.conditions,
    effects: [
      ...model.effects.filter(item =>
        item.id !== normalized.id
      ),
      normalized
    ],
    selectedRuleIds:
      model.selectedRuleIds,
    source:
      model.source === 'empty'
        ? 'manual'
        : model.source
  });
}


export function removeCharacterEffect(
  effectsModel,
  effectId
) {

  const normalizedId =
    normalizeText(
      effectId
    );

  return createEffectsModel({
    conditions:
      effectsModel?.conditions || [],
    effects:
      createEffectsModel(
        effectsModel
      )
        .effects
        .filter(effect =>
          effect.id !== normalizedId
        ),
    selectedRuleIds:
      effectsModel?.selectedRuleIds || [],
    source:
      effectsModel?.source || 'manual'
  });
}


export function hasCharacterCondition(
  effectsModel,
  conditionKey
) {

  const normalizedKey =
    normalizeConditionKey(
      conditionKey
    );

  return createEffectsModel(
    effectsModel
  )
    .conditions
    .some(condition =>
      condition.key === normalizedKey
    );
}


export function createSerializableEffectsData(
  effectsModel
) {

  const model =
    createEffectsModel(
      effectsModel
    );

  return {
    version:
      model.version,
    conditions:
      model.conditions.map(condition => ({
        ...condition
      })),
    effects:
      model.effects.map(effect => ({
        ...effect,
        modifiers: {
          ...effect.modifiers,
          abilityScores: {
            ...effect.modifiers.abilityScores
          },
          abilityChecks: {
            ...effect.modifiers.abilityChecks
          },
          savingThrows: {
            ...effect.modifiers.savingThrows
          },
          skills: {
            ...effect.modifiers.skills
          }
        },
        flags: {
          ...effect.flags
        }
      })),
    selectedRuleIds:
      [
        ...model.selectedRuleIds
      ]
  };
}


export function getCharacterEffectsSummary(
  effectsModel
) {

  const model =
    createEffectsModel(
      effectsModel
    );

  return {
    conditionLabels:
      model.conditions.map(condition =>
        condition.level
          ? `${condition.label} ${condition.level}`
          : condition.label
      ),
    effectTitles:
      model.effects.map(effect =>
        effect.title
      ),
    modifiers:
      model.modifiers,
    flags:
      model.flags
  };
}


export function createLinkedEffectSource(
  {
    sourceType = 'manual',
    sourcePageId = '',
    sourcePackageId = '',
    ruleId = ''
  } = {}
) {

  return {
    sourceType:
      normalizeEffectSourceType(
        sourceType
      ),
    sourcePageId:
      normalizeText(
        sourcePageId
      ),
    sourcePackageId:
      normalizeText(
        sourcePackageId
      ),
    ruleId:
      normalizeText(
        ruleId
      )
  };
}


export function createLinkedCharacterEffect(
  effect = {},
  source = {}
) {

  return normalizeEffect({
    ...effect,
    ...createLinkedEffectSource(
      source
    )
  });
}


export function getCharacterEffectSources(
  effectsModel
) {

  return createEffectsModel(
    effectsModel
  )
    .effects
    .map(effect =>
      createLinkedEffectSource(
        effect
      )
    );
}


function normalizeConditions(
  conditions
) {

  const byKey =
    new Map();

  (Array.isArray(conditions) ? conditions : [])
    .map(normalizeCondition)
    .filter(Boolean)
    .forEach(condition => {

      byKey.set(
        condition.key,
        condition
      );
    });

  return [...byKey.values()];
}


function normalizeCondition(
  condition
) {

  const key =
    normalizeConditionKey(
      typeof condition === 'string'
        ? condition
        : condition?.key
    );

  if (!key) return null;

  const level =
    key === 'exhaustion'
      ? normalizeInteger(
        condition?.level,
        1,
        {
          min: 1,
          max: 6
        }
      )
      : null;

  return {
    key,
    label:
      normalizeText(
        condition?.label
      ) ||
      CONDITION_LABELS[key] ||
      key,
    level,
    source:
      normalizeText(
        condition?.source
      ) || 'manual',
    note:
      normalizeText(
        condition?.note
      )
  };
}


function normalizeEffects(
  effects
) {

  const byId =
    new Map();

  (Array.isArray(effects) ? effects : [])
    .map(normalizeEffect)
    .filter(Boolean)
    .forEach(effect => {

      byId.set(
        effect.id,
        effect
      );
    });

  return [...byId.values()];
}


function normalizeEffect(
  effect
) {

  const title =
    normalizeText(
      effect?.title
    );

  const id =
    normalizeText(
      effect?.id
    ) ||
    createEffectId(
      title
    );

  if (!id) return null;

  return {
    id,
    title:
      title || id,
    sourceType:
      normalizeEffectSourceType(
        effect?.sourceType
      ),
    sourcePageId:
      normalizeText(
        effect?.sourcePageId
      ),
    sourcePackageId:
      normalizeText(
        effect?.sourcePackageId
      ),
    ruleId:
      normalizeText(
        effect?.ruleId
      ),
    duration:
      normalizeText(
        effect?.duration
      ),
    note:
      normalizeText(
        effect?.note
      ),
    modifiers:
      normalizeModifiers(
        effect?.modifiers
      ),
    flags:
      normalizeEffectFlags(
        effect?.flags
      )
  };
}


function calculateEffectModifiers(
  effects
) {

  return effects.reduce(
    (summary, effect) =>
      mergeModifiers(
        summary,
        effect.modifiers
      ),
    normalizeModifiers()
  );
}


function calculateConditionFlags(
  conditions
) {

  const keys =
    new Set(
      conditions.map(condition => condition.key)
    );

  const exhaustion =
    conditions.find(condition => condition.key === 'exhaustion')
      ?.level || 0;

  return {
    isIncapacitated:
      [...keys].some(key =>
        CONDITIONS_THAT_INCAPACITATE.has(
          key
        )
      ),
    speedIsZero:
      [...keys].some(key =>
        SPEED_ZERO_CONDITIONS.has(
          key
        )
      ),
    hasDisadvantageOnAttacks:
      keys.has('blinded') ||
      keys.has('poisoned') ||
      keys.has('prone') ||
      keys.has('restrained'),
    attackersHaveAdvantage:
      keys.has('blinded') ||
      keys.has('paralyzed') ||
      keys.has('petrified') ||
      keys.has('prone') ||
      keys.has('restrained') ||
      keys.has('stunned') ||
      keys.has('unconscious'),
    exhaustionLevel:
      exhaustion
  };
}


function mergeModifiers(
  left,
  right
) {

  return {
    armorClass:
      left.armorClass + right.armorClass,
    speed:
      left.speed + right.speed,
    initiative:
      left.initiative + right.initiative,
    proficiencyBonus:
      left.proficiencyBonus + right.proficiencyBonus,
    abilityScores:
      mergeNumericMaps(
        left.abilityScores,
        right.abilityScores
      ),
    abilityChecks:
      mergeNumericMaps(
        left.abilityChecks,
        right.abilityChecks
      ),
    savingThrows:
      mergeNumericMaps(
        left.savingThrows,
        right.savingThrows
      ),
    skills:
      mergeNumericMaps(
        left.skills,
        right.skills
      )
  };
}


function normalizeModifiers(
  modifiers = {}
) {

  return {
    armorClass:
      normalizeInteger(
        modifiers?.armorClass,
        DEFAULT_MODIFIERS.armorClass
      ),
    speed:
      normalizeInteger(
        modifiers?.speed,
        DEFAULT_MODIFIERS.speed
      ),
    initiative:
      normalizeInteger(
        modifiers?.initiative,
        DEFAULT_MODIFIERS.initiative
      ),
    proficiencyBonus:
      normalizeInteger(
        modifiers?.proficiencyBonus,
        DEFAULT_MODIFIERS.proficiencyBonus
      ),
    abilityScores:
      normalizeNumericMap(
        modifiers?.abilityScores
      ),
    abilityChecks:
      normalizeNumericMap(
        modifiers?.abilityChecks
      ),
    savingThrows:
      normalizeNumericMap(
        modifiers?.savingThrows
      ),
    skills:
      normalizeNumericMap(
        modifiers?.skills
      )
  };
}


function normalizeEffectFlags(
  flags = {}
) {

  return {
    concentration:
      Boolean(
        flags?.concentration
      ),
    magical:
      Boolean(
        flags?.magical
      ),
    harmful:
      Boolean(
        flags?.harmful
      )
  };
}


function normalizeNumericMap(
  value
) {

  const entries =
    Object.entries(
      value || {}
    )
      .map(([key, raw]) => [
        normalizeText(
          key
        ),
        normalizeInteger(
          raw,
          0
        )
      ])
      .filter(([key]) =>
        Boolean(
          key
        )
      );

  return Object.fromEntries(
    entries
  );
}


function normalizeIdList(
  values
) {

  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map(value =>
          normalizeText(
            value
          )
        )
        .filter(Boolean)
    )
  ];
}


function mergeNumericMaps(
  left = {},
  right = {}
) {

  const merged =
    {
      ...left
    };

  Object.entries(
    right
  )
    .forEach(([key, value]) => {

      merged[key] =
        (merged[key] || 0) + value;
    });

  return merged;
}


function normalizeConditionKey(
  value
) {

  const key =
    normalizeText(
      value
    )
      .toLowerCase();

  return CHARACTER_CONDITION_KEYS.includes(
    key
  )
    ? key
    : '';
}


function normalizeEffectSourceType(
  value
) {

  const normalized =
    normalizeText(
      value
    )
      .toLowerCase();

  return EFFECT_SOURCE_TYPES.includes(
    normalized
  )
    ? normalized
    : 'manual';
}


function createEffectId(
  title
) {

  return normalizeText(
    title
  )
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/giu, '-')
    .replace(/^-+|-+$/g, '');
}


function readJSON(
  raw
) {

  try {

    return JSON.parse(
      raw
    );

  } catch {

    return {};
  }
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


function normalizeText(
  value
) {

  return typeof value === 'string'
    ? value.trim()
    : '';
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
