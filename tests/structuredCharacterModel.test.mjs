import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCharacterModelFromSources,
  getCharacterEffectiveArmorClass,
  getCharacterEffectiveSpeed,
  getCharacterHealth,
  getCharacterInitiativeModifier,
  readCharacterModelFromPage
} from '../js/character/characterModel.js';

import {
  CardTypeRegistry
} from '../js/cardTypes/cardTypeRegistry.js';

import {
  buildPageRecordContent
} from '../js/core/pageRecord.js';

import {
  createPropertiesModel
} from '../js/properties/propertiesModel.js';


const registry = new CardTypeRegistry();

const abilityScores = Object.freeze({
  str: 8,
  dex: 14,
  con: 16,
  int: 12,
  wis: 10,
  cha: 18
});


test(
  'structured CharacterModel wins over contradictory legacy Properties and keeps entity provenance',
  () => {
    const page = structuredPage(
      'hero',
      'character',
      characterValues({
        health: { current: 8, max: 20, temp: 3 }
      }),
      legacyPropertiesBody({
        hpCurrent: 99,
        hpMax: 99,
        level: 20,
        dex: 30
      })
    );
    const model = readCharacterModelFromPage(
      page,
      { registry }
    );

    assert.equal(model.source, 'entity');
    assert.equal(model.sources.entity, true);
    assert.equal(model.sources.properties, false);
    assert.equal(model.level, 9);
    assert.equal(model.abilities.dex.score, 14);
    assert.deepEqual(getCharacterHealth(model), {
      current: 8,
      max: 20,
      temp: 3,
      percent: 0.4,
      isDown: false,
      source: 'entity'
    });
    assert.equal(model.provenance.entity.pageId, 'hero');
    assert.equal(model.provenance.entity.schemaVersion, 1);
  }
);


test(
  'paired legacy Properties and structured variables have supported calculation parity',
  () => {
    const legacy = createCharacterModelFromSources({
      page: { id: 'legacy', type: 'character' },
      propertiesModels: [createPropertiesModel({
        cardType: 'character',
        values: {
          level: '9',
          hpCurrent: '12',
          hpMax: '20',
          hpTemp: '2',
          armorClass: '14',
          speed: '30',
          str: '8', dex: '14', con: '16',
          int: '12', wis: '10', cha: '18'
        }
      })]
    });
    const structured = readCharacterModelFromPage(
      structuredPage(
        'structured',
        'character',
        characterValues({
          health: { current: 12, max: 20, temp: 2 },
          armorClass: 14,
          speed: 30,
          initiativeModifier: 2
        })
      ),
      { registry }
    );

    assert.equal(structured.source, 'entity');
    assert.equal(structured.level, legacy.level);
    assert.equal(structured.proficiencyBonus, legacy.proficiencyBonus);
    assert.deepEqual(
      Object.fromEntries(Object.entries(structured.abilities).map(([key, value]) => [key, value.modifier])),
      Object.fromEntries(Object.entries(legacy.abilities).map(([key, value]) => [key, value.modifier]))
    );
    assert.deepEqual(
      structured.health,
      legacy.health
    );
    assert.equal(
      getCharacterEffectiveArmorClass(structured),
      getCharacterEffectiveArmorClass(legacy)
    );
    assert.equal(
      getCharacterInitiativeModifier(structured),
      getCharacterInitiativeModifier(legacy)
    );
    assert.equal(
      getCharacterEffectiveSpeed(structured),
      getCharacterEffectiveSpeed(legacy)
    );
  }
);


test(
  'legacy page without variables envelope keeps the existing Properties path',
  () => {
    const legacy = createCharacterModelFromSources({
      page: { id: 'legacy', type: 'character' },
      propertiesModels: [createPropertiesModel({
        cardType: 'character',
        values: {
          level: '5',
          hpCurrent: '7',
          hpMax: '11',
          dex: '16'
        }
      })]
    });

    assert.equal(legacy.source, 'properties');
    assert.equal(legacy.sources.properties, true);
    assert.equal(legacy.sources.entity, false);
    assert.equal(legacy.health.current, 7);
    assert.equal(legacy.abilities.dex.modifier, 3);
  }
);


test(
  'invalid and future structured envelopes never fall back to Properties',
  () => {
    const base = structuredPage(
      'invalid-hero',
      'character',
      characterValues({ health: { current: 8, max: 20, temp: 0 } }),
      legacyPropertiesBody({ hpCurrent: 99, hpMax: 99 })
    );
    const malformed = {
      ...base,
      content: base.content.replace(
        /^variablesJson:.*$/m,
        'variablesJson: {broken'
      )
    };
    const future = {
      ...base,
      content: base.content.replace(
        /"formatVersion":1/,
        '"formatVersion":99'
      )
    };

    for (const page of [malformed, future]) {
      const model = readCharacterModelFromPage(
        page,
        { registry }
      );
      assert.equal(model.source, 'structured-unavailable');
      assert.equal(model.sources.entity, true);
      assert.equal(model.sources.properties, false);
      assert.equal(getCharacterHealth(model), null);
      assert.ok(model.diagnostics.length > 0);
    }
  }
);


test(
  'structured player projects nested progression, abilities and death saves',
  () => {
    const model = readCharacterModelFromPage(
      structuredPage('player-one', 'player', {
        'player.progression': {
          'dnd.level': 6,
          'dnd.proficiencyBonus': 3
        },
        'player.abilities': Object.fromEntries(
          Object.entries({
            strength: 10,
            dexterity: 16,
            constitution: 12,
            intelligence: 14,
            wisdom: 8,
            charisma: 18
          }).map(([key, score]) => [
            `player.abilities.${key}`,
            { [`player.abilities.${key}.score`]: score }
          ])
        ),
        'dnd.health': {
          'dnd.hpCurrent': 4,
          'dnd.hpMax': 9,
          'dnd.hpTemporary': 0
        },
        'player.deathSaves': {
          'player.deathSaves.successes': 2,
          'player.deathSaves.failures': 1
        }
      }),
      { registry }
    );

    assert.equal(model.source, 'entity');
    assert.equal(model.cardType, 'player');
    assert.equal(model.level, 6);
    assert.equal(model.proficiencyBonus, 3);
    assert.equal(model.abilities.dex.modifier, 3);
    assert.deepEqual(model.deathSaves, {
      successes: 2,
      failures: 1,
      isDead: false
    });
  }
);


for (const armorCase of [
  ['none', 14, 2, 12],
  ['light', 11, 2, 13],
  ['medium', 14, 1, 15],
  ['heavy', 16, 2, 16],
  ['shield', 2, 2, 14]
]) {
  const [kind, baseAc, maxDexterity, expected] = armorCase;

  test(
    `structured armor ${kind} resolves exact Item reference with calculation parity`,
    () => {
      const armor = structuredPage(
        `armor-${kind}`,
        'item',
        {
          'item.armor': {
            'item.armor.type': kind,
            'item.armor.baseAc': baseAc,
            'item.armor.maxDexterity': maxDexterity
          }
        }
      );
      const hero = structuredPage(
        `hero-${kind}`,
        'character',
        characterValues({
          armorReference: armor.id
        })
      );
      const model = readCharacterModelFromPage(
        hero,
        {
          pages: [armor],
          registry
        }
      );

      assert.equal(model.source, 'entity');
      assert.equal(getCharacterEffectiveArmorClass(model), expected);
      assert.equal(
        model.provenance.fields.armorClass.pageId,
        armor.id
      );
      assert.equal(model.calculations.armorClass.source, 'entity-reference');
    }
  );
}


test(
  'broken structured armor reference stays unresolved without title or Properties fallback',
  () => {
    const legacyItem = {
      id: 'different-id',
      title: 'Armor by title',
      type: 'item',
      content: buildPageRecordContent({
        id: 'different-id',
        type: 'item',
        body: legacyPropertiesBody({
          armorKind: 'Тяжелый',
          armorBaseAc: 99
        })
      })
    };
    const hero = structuredPage(
      'broken-armor-hero',
      'character',
      characterValues({
        armorReference: 'Armor by title'
      })
    );
    const model = readCharacterModelFromPage(
      hero,
      {
        pages: [legacyItem],
        registry
      }
    );

    assert.equal(model.source, 'entity');
    assert.equal(getCharacterEffectiveArmorClass(model), 12);
    assert.equal(
      model.provenance.fields.armorClass.status,
      'unresolved'
    );
    assert.ok(model.diagnostics.some(issue =>
      issue.code === 'structured_armor_reference_missing'
    ));
  }
);


test(
  'wrong-type and legacy armor targets stay unresolved without reading target Properties',
  () => {
    const wrongType = structuredPage(
      'not-an-item',
      'character',
      characterValues({ armorClass: 77 })
    );
    const legacyItem = {
      id: 'legacy-armor',
      title: 'Legacy armor',
      type: 'item',
      content: buildPageRecordContent({
        id: 'legacy-armor',
        type: 'item',
        body: legacyPropertiesBody({
          armorKind: 'Тяжелый',
          armorBaseAc: 99
        })
      })
    };

    for (const target of [wrongType, legacyItem]) {
      const model = readCharacterModelFromPage(
        structuredPage(
          `hero-${target.id}`,
          'character',
          characterValues({ armorReference: target.id })
        ),
        {
          pages: [target],
          registry
        }
      );

      assert.equal(model.source, 'entity');
      assert.equal(getCharacterEffectiveArmorClass(model), 12);
      assert.equal(
        model.provenance.fields.armorClass.status,
        'unresolved'
      );
      assert.ok(model.diagnostics.some(issue => [
        'structured_armor_reference_wrong_type',
        'structured_armor_item_unavailable'
      ].includes(issue.code)));
    }
  }
);


test('Character saving throws use six stable check keys and the existing pure proficiency policy', () => {
  const mapping = [
    ['strength', 'str', 'saveStr'], ['dexterity', 'dex', 'saveDex'],
    ['constitution', 'con', 'saveCon'], ['intelligence', 'int', 'saveInt'],
    ['wisdom', 'wis', 'saveWis'], ['charisma', 'cha', 'saveCha']
  ];
  for (const selected of [[], ...mapping.map(([id]) => [id]), mapping.map(([id]) => id)]) {
    const page = structuredPage('saves', 'character', {
      ...characterValues(), 'character.savingThrows': selected,
      'character.skills': [{ 'character.skills.rowId': 'generic-skill', 'character.skills.name': 'Акробатика', 'character.skills.details': 'expertise +99' }]
    }, legacyPropertiesBody({ saveStr: 99, saveDex: 99, saveStrProficient: true }));
    const original = page.content;
    const model = readCharacterModelFromPage(page, { registry });
    assert.equal(model.source, 'entity');
    assert.equal(model.proficiencyBonus, 4);
    assert.deepEqual(Object.keys(model.calculations.checks.byKey).sort(), mapping.map(row => row[2]).sort());
    for (const [id, ability, key] of mapping) {
      const check = model.calculations.checks.byKey[key];
      const proficient = selected.includes(id);
      assert.equal(check.value, model.abilities[ability].modifier + (proficient ? model.proficiencyBonus : 0));
      assert.equal(check.proficient, proficient);
      assert.deepEqual(model.calculations.byKey[key], check);
    }
    assert.equal(model.calculations.checks.byKey.skillAcrobatics, undefined);
    assert.equal(page.content, original);
  }
});

test('absent savingThrows reads ability-only saves without materialization; invalid values never use Properties', () => {
  const page = structuredPage('absent-saves', 'character', characterValues(),
    legacyPropertiesBody({ saveStr: 99, saveStrProficient: true }));
  const original = page.content;
  const model = readCharacterModelFromPage(page, { registry });
  assert.equal(model.calculations.checks.byKey.saveStr.value, -1);
  assert.equal(model.calculations.checks.byKey.saveStr.proficient, false);
  assert.equal(page.content, original);
  for (const value of [['saveStr'], 'strength']) {
    const invalid = structuredPage('invalid-saves', 'character', {
      ...characterValues(), 'character.savingThrows': value
    }, legacyPropertiesBody({ saveStr: 99 }));
    assert.equal(readCharacterModelFromPage(invalid, { registry }).source, 'structured-unavailable');
  }
});

function structuredPage(
  id,
  type,
  values,
  body = '<p>Structured card</p>'
) {
  const definition = registry.getResolvedType(type, 1);

  return {
    id,
    title: id,
    type,
    path: `/pages/${id}.md`,
    content: buildPageRecordContent({
      id,
      schemaVersion: 2,
      type,
      body,
      variablesJson: {
        formatVersion: 1,
        schemaVersion: 1,
        schemaDigest: definition.digest,
        values
      },
      now: '2026-09-27T00:00:00Z'
    })
  };
}


function characterValues({
  health = { current: 12, max: 20, temp: 2 },
  armorClass = undefined,
  armorReference = null,
  speed = 30,
  initiativeModifier = 2
} = {}) {
  return {
    'dnd.level': 9,
    'dnd.proficiencyBonus': 4,
    'character.abilities': Object.fromEntries(
      Object.entries({
        strength: abilityScores.str,
        dexterity: abilityScores.dex,
        constitution: abilityScores.con,
        intelligence: abilityScores.int,
        wisdom: abilityScores.wis,
        charisma: abilityScores.cha
      }).map(([key, score]) => [
        `character.abilities.${key}`,
        score
      ])
    ),
    'dnd.health': {
      'dnd.hpCurrent': health.current,
      'dnd.hpMax': health.max,
      'dnd.hpTemporary': health.temp
    },
    'dnd.armorClass': {
      ...(armorClass === undefined
        ? {}
        : { 'dnd.armorClass.value': armorClass }),
      ...(armorReference
        ? {
          'dnd.armorClass.source': {
            'dnd.armorClass.source.reference': {
              pageId: armorReference
            }
          }
        }
        : {})
    },
    'dnd.initiative': {
      'dnd.initiative.modifier': initiativeModifier,
      'dnd.initiative.bonus': 0,
      'dnd.initiative.mode': 'normal'
    },
    'dnd.movement': [{
      'dnd.movement.rowId': 'walk-row',
      'dnd.movement.type': 'walk',
      'dnd.movement.speed': speed,
      'dnd.movement.units': 'feet'
    }]
  };
}


function legacyPropertiesBody(
  values
) {
  const controls = Object.entries(values).map(([key, value]) =>
    `<input data-property-name="${key}" value="${value}">`
  ).join('');

  return `<section class="card-properties-block" data-block-type="properties" data-card-type="character">${controls}</section>`;
}
