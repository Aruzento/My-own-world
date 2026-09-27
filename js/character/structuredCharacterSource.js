import {
  CardTypeRegistry
} from '../cardTypes/cardTypeRegistry.js';

import {
  getValue,
  readEntity
} from '../variables/entityVariables.js';

import {
  calculateDndAbilityModifier,
  calculateDndArmorClass,
  calculateDndProficiencyBonus
} from '../properties/propertiesCalculationEngine.js';


const DEFAULT_REGISTRY =
  new CardTypeRegistry();

const ABILITY_FIELDS = Object.freeze({
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma'
});


// Domain adapter for the Stage 8.1 read boundary. It consumes the public
// Entity API and returns gameplay inputs; it never parses variablesJson,
// Properties HTML or schema includes itself.
export function readStructuredCharacterSource(
  page,
  {
    pages = [],
    registry = DEFAULT_REGISTRY,
    repository = null,
    effectsModel = null
  } = {}
) {
  if (!page) {
    return Object.freeze({
      mode: 'legacy',
      status: 'legacy',
      snapshot: null,
      diagnostics: []
    });
  }

  const entityRepository =
    repository || createExactPageRepository(page, pages);
  const context = {
    registry,
    repository: entityRepository
  };
  const snapshot =
    readEntity(page?.id, context);

  if (snapshot.variablesMode === 'legacy') {
    return Object.freeze({
      mode: 'legacy',
      status: 'legacy',
      snapshot,
      diagnostics: []
    });
  }

  if (snapshot.mode !== 'structured') {
    return unavailableSource(
      snapshot,
      snapshot.mode
    );
  }

  if (
    snapshot.definition?.definition
      ?.capabilities?.characterProjection !== true
  ) {
    return unavailableSource(
      snapshot,
      'character-projection-unsupported'
    );
  }

  const reader = createEntityReader(snapshot, context);
  const type = snapshot.type;
  const level = readLevel(reader, type);
  const abilities = readAbilities(reader, type);
  const health = readHealth(reader);
  const deathSaves = readDeathSaves(reader, type);
  const movement = reader.value('dnd.movement');
  const initiative = reader.value('dnd.initiative');
  const proficiency = readProficiency(reader, type, level.value);
  const armor = readArmorClass({
    reader,
    snapshot,
    context,
    dexModifier:
      calculateDndAbilityModifier(
        abilities.value.dex
      ),
    effectsModel
  });
  const speed = readSpeed(
    movement,
    effectsModel
  );
  const initiativeCalculation =
    readInitiative(
      initiative,
      abilities.value.dex,
      effectsModel
    );

  const diagnostics = [
    ...snapshot.diagnostics,
    ...reader.diagnostics,
    ...armor.diagnostics
  ];
  const blockingDiagnostics = [
    ...snapshot.diagnostics,
    ...reader.diagnostics
  ];

  return Object.freeze({
    mode: 'structured',
    status: blockingDiagnostics.some(issue => issue.severity === 'error')
      ? 'invalid'
      : 'ready',
    snapshot,
    cardType: type,
    level: level.value,
    proficiencyBonus: proficiency.value,
    abilities: abilities.value,
    health: health.value,
    deathSaves: deathSaves.value,
    armorClass: armor.value,
    speed: speed.value,
    calculations: createCalculationModel({
      type,
      level,
      proficiency,
      abilities,
      health,
      armor,
      speed,
      initiative: initiativeCalculation
    }),
    provenance: Object.freeze({
      entity: Object.freeze({
        pageId: snapshot.pageId,
        type: snapshot.type,
        schemaVersion: snapshot.schemaVersion,
        schemaDigest: snapshot.schemaDigest
      }),
      fields: Object.freeze({
        level: level.provenance,
        proficiencyBonus: proficiency.provenance,
        abilities: abilities.provenance,
        health: health.provenance,
        deathSaves: deathSaves.provenance,
        armorClass: armor.provenance,
        speed: speed.provenance,
        initiative: initiativeCalculation.provenance
      })
    }),
    diagnostics: Object.freeze(diagnostics)
  });
}


function unavailableSource(
  snapshot,
  reason
) {
  return Object.freeze({
    mode: snapshot.mode,
    status: 'unavailable',
    snapshot,
    diagnostics: Object.freeze([
      ...snapshot.diagnostics,
      domainIssue(
        'structured_character_unavailable',
        { reason }
      )
    ])
  });
}


function createExactPageRepository(
  page,
  pages
) {
  const byId = new Map();

  for (const candidate of [
    ...(pages || []),
    page
  ]) {
    if (candidate?.id) byId.set(candidate.id, candidate);
  }

  return Object.freeze({
    getPageById(id) {
      return byId.get(id) || null;
    }
  });
}


function createEntityReader(
  snapshot,
  context
) {
  const diagnostics = [];
  const provenance = {};

  return {
    diagnostics,
    provenance,
    value(key) {
      const result = getValue(
        snapshot,
        key,
        'effective',
        context
      );
      provenance[key] = valueProvenance(result);

      if (result.status === 'value') {
        return {
          available: true,
          value: result.value,
          provenance: provenance[key]
        };
      }

      if (!['absent', 'unresolved'].includes(result.status)) {
        diagnostics.push(domainIssue(
          'structured_character_field_unavailable',
          {
            key,
            status: result.status,
            reason: result.reason || null
          }
        ));
      }

      return {
        available: false,
        value: undefined,
        provenance: provenance[key]
      };
    }
  };
}


function readLevel(
  reader,
  type
) {
  if (type === 'player') {
    const progression = reader.value('player.progression');
    return projectedNumber(
      progression,
      'dnd.level',
      1
    );
  }

  return projectedNumber(
    reader.value('dnd.level'),
    null,
    1
  );
}


function readProficiency(
  reader,
  type,
  level
) {
  const source = type === 'player'
    ? projectedNumber(
      reader.value('player.progression'),
      'dnd.proficiencyBonus',
      null
    )
    : projectedNumber(
      reader.value('dnd.proficiencyBonus'),
      null,
      null
    );

  if (source.value !== null) return source;

  return {
    value: calculateDndProficiencyBonus(level),
    provenance: Object.freeze({
      status: 'value',
      source: 'calculated',
      input: source.provenance
    })
  };
}


function readAbilities(
  reader,
  type
) {
  const key = type === 'player'
    ? 'player.abilities'
    : 'character.abilities';
  const result = reader.value(key);
  const value = {};

  for (const [shortKey, longKey] of Object.entries(ABILITY_FIELDS)) {
    const childKey = `${key}.${longKey}`;
    const child = result.value?.[childKey];
    value[shortKey] = type === 'player'
      ? numberOr(child?.[`${childKey}.score`], 10)
      : numberOr(child, 10);
  }

  return {
    value,
    provenance: result.provenance
  };
}


function readHealth(
  reader
) {
  const result = reader.value('dnd.health');

  return {
    value: {
      current: numberOr(
        result.value?.['dnd.hpCurrent'],
        10
      ),
      max: numberOr(
        result.value?.['dnd.hpMax'],
        10
      ),
      temp: numberOr(
        result.value?.['dnd.hpTemporary'],
        0
      )
    },
    provenance: result.provenance
  };
}


function readDeathSaves(
  reader,
  type
) {
  if (type !== 'player') {
    return {
      value: { successes: 0, failures: 0 },
      provenance: Object.freeze({
        status: 'absent',
        source: 'schema'
      })
    };
  }

  const result = reader.value('player.deathSaves');

  return {
    value: {
      successes: numberOr(
        result.value?.['player.deathSaves.successes'],
        0
      ),
      failures: numberOr(
        result.value?.['player.deathSaves.failures'],
        0
      )
    },
    provenance: result.provenance
  };
}


function readArmorClass({
  reader,
  snapshot,
  context,
  dexModifier,
  effectsModel
}) {
  const result = reader.value('dnd.armorClass');
  const diagnostics = [];
  const reference =
    result.value?.['dnd.armorClass.source']
      ?.['dnd.armorClass.source.reference'];
  const effectModifier =
    numberOr(
      effectsModel?.modifiers?.armorClass,
      0
    );

  if (reference?.pageId) {
    const target = context.repository.getPageById(
      reference.pageId
    );

    if (!target) {
      diagnostics.push(domainIssue(
        'structured_armor_reference_missing',
        { pageId: reference.pageId }
      ));
    } else {
      const targetSnapshot =
        readEntity(target.id, context);

      if (
        targetSnapshot.mode !== 'structured' ||
        targetSnapshot.type !== 'item'
      ) {
        diagnostics.push(domainIssue(
          targetSnapshot.type === 'item'
            ? 'structured_armor_item_unavailable'
            : 'structured_armor_reference_wrong_type',
          {
            pageId: target.id,
            type: targetSnapshot.type,
            mode: targetSnapshot.mode
          }
        ));
      } else {
        const armor = getValue(
          targetSnapshot,
          'item.armor',
          'effective',
          context
        );

        if (armor.status === 'value') {
          const value = calculateDndArmorClass({
            dexModifier,
            armorKind:
              armor.value?.['item.armor.type'],
            armorBaseAc:
              armor.value?.['item.armor.baseAc'],
            armorDexMax:
              armor.value?.['item.armor.maxDexterity']
          }) + effectModifier;

          return {
            value,
            formula: 'structured item armor + effects.armorClass',
            parts: [
              calculationPart('Доспех', value - effectModifier),
              calculationPart('Эффекты', effectModifier)
            ],
            source: 'entity-reference',
            provenance: Object.freeze({
              status: 'value',
              source: 'entity-reference',
              pageId: target.id,
              field: valueProvenance(armor)
            }),
            diagnostics
          };
        }

        diagnostics.push(domainIssue(
          'structured_armor_item_value_unavailable',
          {
            pageId: target.id,
            status: armor.status,
            reason: armor.reason || null
          }
        ));
      }
    }

    if (diagnostics.length) {
      const value = calculateDndArmorClass({
        dexModifier,
        armorKind: 'none'
      }) + effectModifier;

      return {
        value,
        formula: 'unresolved structured armor reference',
        parts: [
          calculationPart('Без разрешённого доспеха', 10),
          calculationPart('ЛОВ', dexModifier),
          calculationPart('Эффекты', effectModifier)
        ],
        source: 'unresolved',
        provenance: Object.freeze({
          status: 'unresolved',
          source: 'entity-reference',
          pageId: reference.pageId
        }),
        diagnostics
      };
    }
  }

  const explicit =
    result.value?.['dnd.armorClass.value'];

  if (Number.isFinite(Number(explicit))) {
    const value = Number(explicit) + effectModifier;
    return {
      value,
      formula: 'dnd.armorClass.value + effects.armorClass',
      parts: [
        calculationPart('КЗ', explicit),
        calculationPart('Эффекты', effectModifier)
      ],
      source: result.provenance.source,
      provenance: result.provenance,
      diagnostics
    };
  }

  const value = calculateDndArmorClass({
    dexModifier,
    armorKind: 'none'
  }) + effectModifier;

  return {
    value,
    formula: '10 + dexModifier + effects.armorClass',
    parts: [
      calculationPart('Без доспеха', 10),
      calculationPart('ЛОВ', dexModifier),
      calculationPart('Эффекты', effectModifier)
    ],
    source: diagnostics.length
      ? 'unresolved'
      : 'calculated',
    provenance: diagnostics.length
      ? Object.freeze({
        status: 'unresolved',
        source: 'entity-reference',
        pageId: reference?.pageId || null
      })
      : result.provenance,
    diagnostics
  };
}


function readSpeed(
  movement,
  effectsModel
) {
  const rows = Array.isArray(movement.value)
    ? movement.value
    : [];
  const walk = rows.find(row =>
    row?.['dnd.movement.type'] === 'walk'
  );
  const base = numberOr(
    walk?.['dnd.movement.speed'],
    30
  );
  const effects = numberOr(
    effectsModel?.modifiers?.speed,
    0
  );
  const value = effectsModel?.flags?.speedIsZero
    ? 0
    : base + effects;

  return {
    value,
    formula: 'walk speed + effects.speed',
    parts: [
      calculationPart('Скорость', base),
      calculationPart('Эффекты', effects)
    ],
    source: movement.provenance.source || 'calculated',
    provenance: movement.provenance
  };
}


function readInitiative(
  initiative,
  dexterity,
  effectsModel
) {
  const dexModifier =
    calculateDndAbilityModifier(dexterity);
  const storedModifier =
    initiative.value?.['dnd.initiative.modifier'];
  const bonus = numberOr(
    initiative.value?.['dnd.initiative.bonus'],
    0
  );
  const base = Number.isFinite(Number(storedModifier))
    ? Number(storedModifier)
    : dexModifier;
  const effects = numberOr(
    effectsModel?.modifiers?.initiative,
    0
  );

  return {
    value: base + bonus + effects,
    formula: 'initiative.modifier + initiative.bonus + effects.initiative',
    parts: [
      calculationPart(
        Number.isFinite(Number(storedModifier))
          ? 'Модификатор'
          : 'ЛОВ',
        base
      ),
      calculationPart('Бонус', bonus),
      calculationPart('Эффекты', effects)
    ],
    source: initiative.provenance.source || 'calculated',
    provenance: initiative.provenance
  };
}


function createCalculationModel({
  type,
  level,
  proficiency,
  abilities,
  health,
  armor,
  speed,
  initiative
}) {
  const abilityModifiers = Object.fromEntries(
    Object.entries(abilities.value).map(([key, score]) => [
      key,
      calculation(
        `${key}Modifier`,
        calculateDndAbilityModifier(score),
        'floor((score - 10) / 2)',
        [calculationPart('Характеристика', score)],
        abilities.provenance.source || 'calculated'
      )
    ])
  );
  const entries = {
    level: calculation(
      'level',
      level.value,
      'level',
      [calculationPart('Entity', level.value)],
      level.provenance.source || 'entity'
    ),
    proficiencyBonus: calculation(
      'proficiencyBonus',
      proficiency.value,
      '2 + floor((level - 1) / 4)',
      [calculationPart('Уровень', level.value)],
      proficiency.provenance.source || 'calculated'
    ),
    armorClass: calculation(
      'armorClass',
      armor.value,
      armor.formula,
      armor.parts,
      armor.source
    ),
    speed: calculation(
      'speed',
      speed.value,
      speed.formula,
      speed.parts,
      speed.source
    ),
    initiative: calculation(
      'initiative',
      initiative.value,
      initiative.formula,
      initiative.parts,
      initiative.source
    ),
    health: calculation(
      'health',
      health.value.current,
      'dnd.health',
      [],
      health.provenance.source || 'entity'
    )
  };

  return Object.freeze({
    kind: 'PropertiesCalculationModel',
    version: 1,
    cardType: type,
    source: 'entity',
    ...entries,
    abilityModifiers,
    checks: Object.freeze({
      key: 'checks',
      label: 'Навыки и спасброски',
      byKey: {}
    }),
    byKey: Object.freeze(Object.fromEntries([
      ...Object.values(entries),
      ...Object.values(abilityModifiers)
    ].map(entry => [entry.key, entry])))
  });
}


function calculation(
  key,
  value,
  formula,
  parts,
  source
) {
  return Object.freeze({
    key,
    label: key,
    value,
    calculatedValue: value,
    formula,
    parts: Object.freeze(parts),
    source
  });
}


function calculationPart(
  label,
  value
) {
  return Object.freeze({
    label,
    value: numberOr(value, 0)
  });
}


function projectedNumber(
  result,
  childKey,
  fallback
) {
  const raw = childKey
    ? result.value?.[childKey]
    : result.value;
  const value = Number(raw);

  return {
    value: Number.isFinite(value)
      ? value
      : fallback,
    provenance: result.provenance
  };
}


function numberOr(
  value,
  fallback
) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : fallback;
}


function valueProvenance(
  result
) {
  return Object.freeze({
    status: result.status,
    source: result.source || null,
    reason: result.reason || null
  });
}


function domainIssue(
  code,
  evidence = {}
) {
  return Object.freeze({
    code,
    severity: 'error',
    ...evidence
  });
}
