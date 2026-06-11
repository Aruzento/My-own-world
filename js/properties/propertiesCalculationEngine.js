import {
  getPropertyValue
} from './propertiesModel.js';


export const PROPERTY_CALCULATION_ABILITY_KEYS = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha'
];


// Расчетный слой "Свойств" не меняет DOM и не сохраняет карточку.
// Его задача - вернуть число, источник и понятное объяснение расчета.

export function createPropertiesCalculationModel(
  {
    propertiesModel = null,
    effectsModel = null,
    overrides = {}
  } = {}
) {

  const level =
    resolveCalculatedProperty({
      key: 'level',
      label: 'Уровень',
      calculatedValue:
        getNumericProperty(
          propertiesModel,
          'level',
          1
        ),
      formula: 'level',
      parts: [
        createCalculationPart(
          'Свойства',
          getPropertyValue(
            propertiesModel,
            'level',
            ''
          ) || 1
        )
      ],
      override:
        getCalculationOverride(
          propertiesModel,
          overrides,
          'level'
        )
    });

  const proficiencyBonus =
    resolveCalculatedProperty({
      key: 'proficiencyBonus',
      label: 'Бонус мастерства',
      calculatedValue:
        calculateDndProficiencyBonus(
          level.value
        ),
      formula: '2 + floor((level - 1) / 4)',
      parts: [
        createCalculationPart(
          'Уровень',
          level.value
        )
      ],
      override:
        getCalculationOverride(
          propertiesModel,
          overrides,
          'proficiencyBonus'
        )
    });

  const abilityModifiers =
    Object.fromEntries(
      PROPERTY_CALCULATION_ABILITY_KEYS.map(key => {

        const score =
          getNumericProperty(
            propertiesModel,
            key,
            10
          );

        return [
          key,
          resolveCalculatedProperty({
            key:
              `${key}Modifier`,
            label:
              getAbilityLabel(
                key
              ),
            calculatedValue:
              calculateDndAbilityModifier(
                score
              ),
            formula:
              'floor((score - 10) / 2)',
            parts: [
              createCalculationPart(
                'Характеристика',
                score
              )
            ],
            override:
              getCalculationOverride(
                propertiesModel,
                overrides,
                `${key}Modifier`
              )
          })
        ];
      })
    );

  const armorClass =
    resolveCalculatedProperty({
      key: 'armorClass',
      label: 'КЗ',
      calculatedValue:
        getNumericProperty(
          propertiesModel,
          'armorClass',
          10
        ) +
        getEffectModifier(
          effectsModel,
          'armorClass'
        ),
      formula: 'armorClass + effects.armorClass',
      parts: [
        createCalculationPart(
          'Свойства',
          getNumericProperty(
            propertiesModel,
            'armorClass',
            10
          )
        ),
        createCalculationPart(
          'Эффекты',
          getEffectModifier(
            effectsModel,
            'armorClass'
          )
        )
      ],
      override:
        getCalculationOverride(
          propertiesModel,
          overrides,
          'armorClass'
        )
    });

  const speed =
    resolveCalculatedProperty({
      key: 'speed',
      label: 'Скорость',
      calculatedValue:
        effectsModel?.flags?.speedIsZero
          ? 0
          : getNumericProperty(
            propertiesModel,
            'speed',
            30
          ) +
          getEffectModifier(
            effectsModel,
            'speed'
          ),
      formula: 'speed + effects.speed',
      parts: [
        createCalculationPart(
          'Свойства',
          getNumericProperty(
            propertiesModel,
            'speed',
            30
          )
        ),
        createCalculationPart(
          'Эффекты',
          getEffectModifier(
            effectsModel,
            'speed'
          )
        )
      ],
      override:
        getCalculationOverride(
          propertiesModel,
          overrides,
          'speed'
        )
    });

  const initiative =
    resolveCalculatedProperty({
      key: 'initiative',
      label: 'Инициатива',
      calculatedValue:
        abilityModifiers.dex.value +
        getEffectModifier(
          effectsModel,
          'initiative'
        ),
      formula: 'dexModifier + effects.initiative',
      parts: [
        createCalculationPart(
          'ЛОВ',
          abilityModifiers.dex.value
        ),
        createCalculationPart(
          'Эффекты',
          getEffectModifier(
            effectsModel,
            'initiative'
          )
        )
      ],
      override:
        getCalculationOverride(
          propertiesModel,
          overrides,
          'initiative'
        )
    });

  const health =
    createHealthCalculation(
      propertiesModel
    );

  return {
    kind: 'PropertiesCalculationModel',
    version: 1,
    cardType:
      propertiesModel?.cardType || 'note',
    source:
      propertiesModel
        ? 'properties'
        : 'empty',
    level,
    proficiencyBonus,
    abilityModifiers,
    armorClass,
    speed,
    initiative,
    health,
    byKey:
      createCalculationIndex({
        level,
        proficiencyBonus,
        armorClass,
        speed,
        initiative,
        health,
        abilityModifiers
      })
  };
}


export function resolveCalculatedProperty(
  {
    key,
    label = key,
    calculatedValue = 0,
    formula = '',
    parts = [],
    override = null
  } = {}
) {

  const normalizedOverride =
    normalizeOverride(
      override
    );

  const hasOverride =
    normalizedOverride.enabled &&
    normalizedOverride.value !== '';

  return {
    key,
    label,
    value:
      hasOverride
        ? normalizedOverride.value
        : normalizeNumber(
          calculatedValue,
          0
        ),
    calculatedValue:
      normalizeNumber(
        calculatedValue,
        0
      ),
    source:
      hasOverride
        ? 'manual'
        : 'calculated',
    formula,
    parts,
    override:
      normalizedOverride
  };
}


export function createManualOverride(
  value
) {

  return {
    enabled:
      value !== '' &&
      value !== null &&
      value !== undefined,
    value:
      value === '' ||
      value === null ||
      value === undefined
        ? ''
        : normalizeNumber(
          value,
          0
        )
  };
}


export function calculateDndAbilityModifier(
  score
) {

  const value =
    clamp(
      normalizeNumber(
        score,
        10
      ),
      1,
      30
    );

  return Math.floor(
    (value - 10) / 2
  );
}


export function calculateDndProficiencyBonus(
  level
) {

  const value =
    clamp(
      normalizeNumber(
        level,
        1
      ),
      1,
      20
    );

  return 2 + Math.floor(
    (value - 1) / 4
  );
}


function createHealthCalculation(
  propertiesModel
) {

  const current =
    getNumericProperty(
      propertiesModel,
      'hpCurrent',
      10
    );

  const max =
    Math.max(
      1,
      getNumericProperty(
        propertiesModel,
        'hpMax',
        10
      )
    );

  const temp =
    Math.max(
      0,
      getNumericProperty(
        propertiesModel,
        'hpTemp',
        0
      )
    );

  return {
    key: 'health',
    label: 'Хиты',
    value: {
      current:
        clamp(
          current,
          0,
          max
        ),
      max,
      temp,
      percent:
        clamp(
          current / max,
          0,
          1
        ),
      isDown:
        current <= 0
    },
    source: 'calculated',
    formula: 'hpCurrent / hpMax',
    parts: [
      createCalculationPart(
        'Факт',
        current
      ),
      createCalculationPart(
        'Макс',
        max
      ),
      createCalculationPart(
        'Временные',
        temp
      )
    ]
  };
}


function getCalculationOverride(
  propertiesModel,
  overrides,
  key
) {

  const explicit =
    overrides?.[key];

  if (explicit) {

    return explicit;
  }

  const customOverride =
    propertiesModel?.customValues?.[`override-${key}`] ??
    propertiesModel?.customValues?.[`${key}Override`];

  return createManualOverride(
    customOverride ?? ''
  );
}


function createCalculationPart(
  label,
  value
) {

  return {
    label,
    value:
      normalizeNumber(
        value,
        0
      )
  };
}


function createCalculationIndex(
  calculations
) {

  const flat = [
    calculations.level,
    calculations.proficiencyBonus,
    calculations.armorClass,
    calculations.speed,
    calculations.initiative,
    calculations.health,
    ...Object.values(
      calculations.abilityModifiers || {}
    )
  ];

  return Object.fromEntries(
    flat.map(calculation => [
      calculation.key,
      calculation
    ])
  );
}


function getEffectModifier(
  effectsModel,
  key
) {

  return normalizeNumber(
    effectsModel?.modifiers?.[key],
    0
  );
}


function getNumericProperty(
  propertiesModel,
  key,
  fallback
) {

  const value =
    getPropertyValue(
      propertiesModel,
      key,
      ''
    );

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {

    return fallback;
  }

  return normalizeNumber(
    value,
    fallback
  );
}


function getAbilityLabel(
  key
) {

  return {
    str: 'СИЛ',
    dex: 'ЛОВ',
    con: 'ТЛС',
    int: 'ИНТ',
    wis: 'МДР',
    cha: 'ХАР'
  }[key] || key;
}


function normalizeOverride(
  override
) {

  if (!override) {

    return {
      enabled: false,
      value: ''
    };
  }

  return {
    enabled:
      Boolean(
        override.enabled
      ),
    value:
      override.value === '' ||
      override.value === null ||
      override.value === undefined
        ? ''
        : normalizeNumber(
          override.value,
          0
        )
  };
}


function normalizeNumber(
  value,
  fallback
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? Math.floor(number)
    : fallback;
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
