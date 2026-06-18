import {
  getPropertyValue,
  readPropertiesModelsFromHTML
} from './propertiesModel.js';

import {
  DND_SKILL_GROUPS
} from './propertySchemas.js';


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
    pages = [],
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

  const armor =
    resolveArmorCalculation({
      propertiesModel,
      pages,
      dexModifier:
        abilityModifiers.dex.value
    });

  const armorClass =
    resolveCalculatedProperty({
      key: 'armorClass',
      label: 'КЗ',
      calculatedValue:
        armor.value +
        getEffectModifier(
          effectsModel,
          'armorClass'
        ),
      formula:
        `${armor.formula} + effects.armorClass`,
      parts: [
        ...armor.parts,
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

  const checks =
    createDndChecksCalculation({
      propertiesModel,
      abilityModifiers,
      proficiencyBonus
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
    checks,
    health,
    byKey:
      createCalculationIndex({
        level,
        proficiencyBonus,
        armorClass,
        speed,
        initiative,
        health,
        abilityModifiers,
        checks
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


export function calculateDndCheckValue(
  {
    abilityModifier = 0,
    proficient = false,
    proficiencyLevel = null,
    proficiencyBonus = 2
  } = {}
) {

  const level =
    proficiencyLevel === null ||
    proficiencyLevel === undefined
      ? (
        proficient
          ? 1
          : 0
      )
      : clampNumber(
        Number(proficiencyLevel) || 0,
        0,
        2
      );

  return normalizeNumber(
    abilityModifier,
    0
  ) + (
    level > 0
      ? normalizeNumber(
        proficiencyBonus,
        2
      ) * level
      : 0
  );
}


export function calculateDndArmorClass(
  {
    dexModifier = 0,
    armorKind = 'Нет',
    armorBaseAc = '',
    armorDexMax = ''
  } = {}
) {

  const dex =
    normalizeNumber(
      dexModifier,
      0
    );

  const base =
    normalizeOptionalNumber(
      armorBaseAc
    );

  const kind =
    normalizeArmorKind(
      armorKind
    );

  if (kind === 'Легкий') {

    return (base ?? 11) + dex;
  }

  if (kind === 'Средний') {

    return (base ?? 12) + Math.min(
      dex,
      normalizeOptionalNumber(
        armorDexMax
      ) ?? 2
    );
  }

  if (kind === 'Тяжелый') {

    return base ?? 16;
  }

  if (kind === 'Щит') {

    return 10 + dex + (base ?? 2);
  }

  return 10 + dex;
}


function createDndChecksCalculation(
  {
    propertiesModel,
    abilityModifiers,
    proficiencyBonus
  }
) {

  const byKey = {};

  DND_SKILL_GROUPS.forEach(group => {

    const abilityModifier =
      abilityModifiers?.[group.ability]?.value || 0;

    (group.items || [])
      .forEach(item => {

        const proficiencyLevel =
          readProficiencyLevel(
            propertiesModel,
            item.proficientName
          );

        byKey[item.name] =
          resolveCalculatedProperty({
            key:
              item.name,
            label:
              item.label,
            calculatedValue:
              calculateDndCheckValue({
                abilityModifier,
                proficiencyLevel,
                proficiencyBonus:
                  proficiencyBonus.value
              }),
            formula:
              `${group.ability}Modifier + ${proficiencyLevel > 0 ? `proficiencyBonus * ${proficiencyLevel}` : '0'}`,
            parts: [
              createCalculationPart(
                getAbilityLabel(
                  group.ability
                ),
                abilityModifier
              ),
              createCalculationPart(
                'Владение',
                proficiencyLevel > 0
                  ? proficiencyBonus.value * proficiencyLevel
                  : 0
              )
            ],
            override:
              getCalculationOverride(
                propertiesModel,
                {},
                item.name
              )
          });
      });
  });

  return {
    key: 'checks',
    label: 'Навыки и спасброски',
    byKey
  };
}


function resolveArmorCalculation(
  {
    propertiesModel,
    pages,
    dexModifier
  }
) {

  const armorReference =
    getPropertyValue(
      propertiesModel,
      'armorItem',
      ''
    );

  const armorPage =
    findArmorPage(
      pages,
      armorReference
    );

  const armorProperties =
    armorPage
      ? (armorPage.propertiesModels || readPropertiesModelsFromHTML(
        armorPage.content
      )).find(model => model.cardType === 'item')
      : null;

  const armorKind =
    getPropertyValue(
      armorProperties,
      'armorKind',
      'Нет'
    );

  const armorBaseAc =
    getPropertyValue(
      armorProperties,
      'armorBaseAc',
      ''
    );

  const armorDexMax =
    getPropertyValue(
      armorProperties,
      'armorDexMax',
      ''
    );

  const value =
    calculateDndArmorClass({
      dexModifier,
      armorKind,
      armorBaseAc,
      armorDexMax
    });

  if (!armorPage) {

    const legacyArmorClass =
      getPropertyValue(
        propertiesModel,
        'armorClass',
        ''
      );

    if (
      legacyArmorClass !== '' &&
      legacyArmorClass !== null &&
      legacyArmorClass !== undefined
    ) {

      return {
        value:
          normalizeNumber(
            legacyArmorClass,
            value
          ),
        formula: 'armorClass',
        parts: [
          createCalculationPart(
            'КЗ',
            legacyArmorClass
          )
        ]
      };
    }

    return {
      value,
      formula: '10 + dexModifier',
      parts: [
        createCalculationPart(
          'Без доспеха',
          10
        ),
        createCalculationPart(
          'ЛОВ',
          dexModifier
        )
      ]
    };
  }

  return {
    value,
    formula:
      `${armorKind || 'Доспех'} + dexModifier`,
    parts: [
      createCalculationPart(
        armorPage.title || 'Доспех',
        normalizeOptionalNumber(
          armorBaseAc
        ) ?? 0
      ),
      createCalculationPart(
        'ЛОВ',
        getArmorDexPartValue({
          armorKind,
          armorDexMax,
          dexModifier
        })
      )
    ]
  };
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


function findArmorPage(
  pages,
  reference
) {

  const normalized =
    normalizeLookup(
      reference
    );

  if (!normalized) return null;

  return (pages || [])
    .find(page => {

      if (page?.type !== 'item') return false;

      const candidates = [
        page.id,
        page.title,
        ...(page.aliases || [])
      ];

      return candidates.some(candidate =>
        normalizeLookup(
          candidate
        ) === normalized
      );
    }) || null;
}


function getArmorDexPartValue(
  {
    armorKind,
    armorDexMax,
    dexModifier
  }
) {

  const kind =
    normalizeArmorKind(
      armorKind
    );

  if (kind === 'Тяжелый') return 0;

  if (kind === 'Средний') {

    return Math.min(
      dexModifier,
      normalizeOptionalNumber(
        armorDexMax
      ) ?? 2
    );
  }

  return dexModifier;
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
    ),
    ...Object.values(
      calculations.checks?.byKey || {}
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


function readProficiencyLevel(
  propertiesModel,
  key
) {

  const value =
    getPropertyValue(
      propertiesModel,
      key,
      0
    );

  if (
    value === true
  ) return 1;

  if (
    value === false ||
    value === ''
  ) return 0;

  return clampNumber(
    normalizeNumber(
      value,
      0
    ),
    0,
    2
  );
}


function clampNumber(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


function normalizeOptionalNumber(
  value
) {

  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {

    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? Math.floor(number)
    : null;
}


function normalizeArmorKind(
  value
) {

  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();

  if (normalized.includes('лег')) return 'Легкий';
  if (normalized.includes('сред')) return 'Средний';
  if (normalized.includes('тяж')) return 'Тяжелый';
  if (normalized.includes('щит')) return 'Щит';

  return 'Нет';
}


function normalizeLookup(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
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
