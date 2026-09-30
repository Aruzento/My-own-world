import './setup.mjs';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUNDLED_CARD_TYPE_DEFINITIONS,
  BUNDLED_FIELD_SET_DEFINITIONS
} from '../js/cardTypes/definitions/bundledDefinitions.js';

import {
  STRUCTURED_CHARACTER_HEALTH_ERROR_CODES,
  commitStructuredCharacterHealthChange,
  prepareStructuredCharacterHealthChange
} from '../js/character/structuredCharacterHealth.js';

import {
  getCharacterHealth,
  readCharacterModelFromPage
} from '../js/character/characterModel.js';
import { encodeOwnEffects, OWN_EFFECTS_KEY } from '../js/character/ownEffectsDefinition.js';
import { createSerializableEffectsData } from '../js/character/effectsModel.js';

import {
  buildPageRecordContent,
  createPageStateIdentityFromContent,
  parsePageRecordContent,
  updatePageRecordContent
} from '../js/core/pageRecord.js';

import {
  updatePageCharacterHealth
} from '../js/properties/characterCalculations.js';

import {
  CARD_TYPE_CATALOG_PATH,
  createCardTypeRegistryFromCatalog,
  serializeCardTypeCatalog
} from '../js/storage/cardTypeCatalogStorage.js';

import {
  persistPageContentCommand
} from '../js/storage/pageCommandService.js';

import {
  captureStorageWorkspaceContext,
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  createEditConflictFixture,
  createMemoryStorageAdapter
} from './fixtures/editConflictFixtures.mjs';


const catalog = {
  formatVersion: 1,
  revision: 1,
  types: BUNDLED_CARD_TYPE_DEFINITIONS,
  fieldSets: BUNDLED_FIELD_SET_DEFINITIONS
};

const registry =
  createCardTypeRegistryFromCatalog(catalog);

const OMIT_HEALTH =
  Symbol('omit-health');

const propertiesBody = `
  <section class="card-properties-block" data-block-type="properties" data-card-type="character">
    <input type="number" data-property-name="hpCurrent" value="99">
    <input type="number" data-property-name="hpMax" value="99">
    <input type="number" data-property-name="hpTemp" value="0">
  </section>
  <p>Persistent body marker</p>
`;


test(
  'delta and exact requests preserve existing Character health semantics',
  async t => {
    const cases = [
      ['damage without temp', health(10, 20, 0), { type: 'delta', delta: -4 }, health(6, 20, 0)],
      ['damage with temp', health(10, 20, 3), { type: 'delta', delta: -5 }, health(8, 20, 0)],
      ['damage absorbed by temp', health(10, 20, 8), { type: 'delta', delta: -5 }, health(10, 20, 3)],
      ['healing', health(5, 20, 3), { type: 'delta', delta: 7 }, health(12, 20, 3)],
      ['healing clamp', health(18, 20, 0), { type: 'delta', delta: 10 }, health(20, 20, 0)],
      ['exact', health(8, 20, 3), { type: 'exact', hpCurrent: 6, hpTemp: 2 }, health(6, 20, 2)]
    ];

    for (const [name, before, request, after] of cases) {
      await t.test(name, async () => {
        const fixture =
          await structuredFixture({ storedHealth: before });
        const plan =
          prepare(fixture, request);

        assert.deepEqual(plan.before, tuple(before));
        assert.deepEqual(plan.after, tuple(after));
        assert.equal(plan.changed, true);
        assert.equal(plan.guards.hpMax, 20);
        assert.equal(plan.storedHealthAfter['dnd.hpMax'], 20);
        assert.equal(fixture.page.content, fixture.originalContent);
      });
    }
  }
);


test(
  'zero delta is a reusable-policy no-op with no durable write',
  async () => {
    const fixture =
      await structuredFixture({
        storedHealth: health(10, 20, 3)
      });
    const plan =
      prepare(fixture, {
        type: 'delta',
        delta: 0
      });
    let writes = 0;
    const write = fixture.adapter.writeText.bind(fixture.adapter);

    fixture.adapter.writeText = async (...args) => {
      writes += 1;
      return write(...args);
    };

    assert.equal(plan.changed, false);
    assert.deepEqual(plan.changedFields, []);
    assert.equal(
      (await commitStructuredCharacterHealthChange(plan)).status,
      'unchanged'
    );
    assert.equal(writes, 0);
    assert.equal(
      (await commitStructuredCharacterHealthChange(plan)).code,
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.PLAN_BLOCKED
    );
  }
);


test(
  'exact current above max and malformed requests are rejected before a Variables plan',
  async () => {
    const fixture =
      await structuredFixture({
        storedHealth: health(8, 20, 3)
      });

    assertHealthError(
      () => prepare(fixture, {
        type: 'exact',
        hpCurrent: 21,
        hpTemp: 0
      }),
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_HEALTH_STATE
    );

    for (const request of [
      { type: 'delta', delta: 1.5 },
      { type: 'delta', delta: 1, hpMax: 30 },
      { type: 'exact', hpCurrent: 1 },
      { type: 'restore' }
    ]) {
      assertHealthError(
        () => prepare(fixture, request),
        STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_REQUEST
      );
    }
  }
);


test(
  'only explicit complete valid stored health is writable',
  async t => {
    const cases = [
      ['absent', OMIT_HEALTH, [], STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.EXPLICIT_HEALTH_REQUIRED],
      ['inactive-only', OMIT_HEALTH, [{ key: 'hpCurrent', raw: '9' }], STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.EXPLICIT_HEALTH_REQUIRED],
      ['incomplete', { 'dnd.hpCurrent': 5, 'dnd.hpMax': 20 }, [], STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.EXPLICIT_HEALTH_REQUIRED],
      ['string-number', health('5', 20, 0), [], STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_HEALTH_STATE],
      ['zero-max', health(0, 0, 0), [], STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_HEALTH_STATE],
      ['current-over-max', health(21, 20, 0), [], STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_HEALTH_STATE]
    ];

    for (const [name, storedHealth, inactive, code] of cases) {
      await t.test(name, async () => {
        const fixture =
          await structuredFixture({ storedHealth, inactive });

        assertHealthError(
          () => prepare(fixture, {
            type: 'delta',
            delta: -1
          }),
          code
        );
      });
    }
  }
);


test(
  'legacy, future and unrelated structured sources never fall back to Properties',
  async () => {
    const legacy =
      await createEditConflictFixture({
        id: 'legacy-health',
        type: 'character',
        body: propertiesBody
      });
    const legacyContext = {
      registry,
      workspaceContext: captureStorageWorkspaceContext()
    };

    assertHealthError(
      () => prepareStructuredCharacterHealthChange({
        pageId: legacy.page.id,
        expectedBase:
          createPageStateIdentityFromContent(legacy.page.content),
        request: { type: 'delta', delta: -1 },
        context: legacyContext
      }),
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.UNSUPPORTED_SOURCE
    );

    const future =
      await structuredFixture({
        storedHealth: health(10, 20, 0)
      });
    future.page.content = future.page.content.replace(
      '"formatVersion":1',
      '"formatVersion":99'
    );
    await future.adapter.writeText(
      future.page.path,
      future.page.content
    );

    assertHealthError(
      () => prepare(future, { type: 'delta', delta: -1 }),
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.UNSUPPORTED_SOURCE
    );

    const malformed =
      await structuredFixture({
        storedHealth: health(10, 20, 0)
      });
    malformed.page.content = malformed.page.content.replace(
      /^variablesJson:.*$/m,
      'variablesJson: {broken'
    );
    await malformed.adapter.writeText(
      malformed.page.path,
      malformed.page.content
    );

    assertHealthError(
      () => prepare(malformed, { type: 'delta', delta: -1 }),
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.UNSUPPORTED_SOURCE
    );

    const item =
      await structuredFixture({
        type: 'item',
        storedHealth: health(10, 20, 0)
      });

    assertHealthError(
      () => prepare(item, { type: 'delta', delta: -1 }),
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.UNSUPPORTED_SOURCE
    );
  }
);


test(
  'Character commit preserves health siblings, unrelated variables and contradictory Properties body',
  async () => {
    const siblings = {
      'character.health.formula': '8d8 + 16',
      'character.health.hitDice': '8d8'
    };
    const fixture =
      await structuredFixture({
        storedHealth: {
          ...health(8, 20, 0),
          ...siblings
        },
        values: {
          'dnd.level': 8,
          'character.category': 'npc'
        }
      });
    const originalBody =
      parsePageRecordContent(fixture.page.content).rawBody;
    const result =
      await commitStructuredCharacterHealthChange(
        prepare(fixture, {
          type: 'delta',
          delta: -3
        })
      );

    assert.equal(result.status, 'saved', JSON.stringify(result));
    assert.deepEqual(result.verification.health, {
      current: 5,
      max: 20,
      temp: 0,
      percent: 0.25,
      isDown: false
    });
    const durable =
      await fixture.adapter.readText(fixture.page.path);
    const parsed =
      parsePageRecordContent(durable);

    assert.equal(parsed.rawBody, originalBody);
    assert.match(parsed.rawBody, /value="99"/);
    assert.deepEqual(parsed.variablesJson.values['dnd.health'], {
      ...health(5, 20, 0),
      ...siblings
    });
    assert.equal(parsed.variablesJson.values['dnd.level'], 8);
    assert.equal(parsed.variablesJson.values['character.category'], 'npc');
    assert.equal(updatePageCharacterHealth(fixture.page, { delta: -1 }), null);
  }
);


test(
  'Player exact commit preserves hit dice rows and critical threshold',
  async () => {
    const hitDice = [{
      'player.health.hitDice.rowId': 'fighter-die',
      'player.health.hitDice.die': 'd10',
      'player.health.hitDice.current': 3,
      'player.health.hitDice.maximum': 5
    }];
    const fixture =
      await structuredFixture({
        type: 'player',
        storedHealth: {
          ...health(8, 20, 3),
          'player.health.hitDice': hitDice,
          'player.health.criticalThreshold': 4
        }
      });
    const result =
      await commitStructuredCharacterHealthChange(
        prepare(fixture, {
          type: 'exact',
          hpCurrent: 6,
          hpTemp: 2
        })
      );

    assert.equal(result.status, 'saved', JSON.stringify(result));
    const stored =
      parsePageRecordContent(
        await fixture.adapter.readText(fixture.page.path)
      ).variablesJson.values['dnd.health'];

    assert.equal(stored['dnd.hpCurrent'], 6);
    assert.equal(stored['dnd.hpMax'], 20);
    assert.equal(stored['dnd.hpTemporary'], 2);
    assert.deepEqual(stored['player.health.hitDice'], hitDice);
    assert.equal(stored['player.health.criticalThreshold'], 4);
  }
);


test(
  'whole-page stale state and a changed schema closure block commit without rebase',
  async t => {
    await t.test('page changed', async () => {
      const fixture =
        await structuredFixture({
          storedHealth: health(10, 20, 0)
        });
      const plan =
        prepare(fixture, { type: 'delta', delta: -1 });
      const changed =
        updatePageRecordContent(fixture.page.content, {
          body: '<p>new durable body</p>'
        });
      const receipt =
        await persistPageContentCommand({
          page: fixture.page,
          content: changed,
          expectedBase: plan.expectedBase
        });

      assert.equal(receipt.writeStatus, 'saved');
      const result =
        await commitStructuredCharacterHealthChange(plan);

      assert.notEqual(result.status, 'saved');
      assert.notEqual(result.code, null);
    });

    await t.test('schema changed', async () => {
      const fixture =
        await structuredFixture({
          storedHealth: health(10, 20, 0)
        });
      const plan =
        prepare(fixture, { type: 'delta', delta: -1 });
      const changedCatalog =
        structuredClone(catalog);
      changedCatalog.types.find(type =>
        type.id === 'character'
      ).label = 'Changed closure';
      await fixture.adapter.writeText(
        CARD_TYPE_CATALOG_PATH,
        serializeCardTypeCatalog(changedCatalog)
      );
      const result =
        await commitStructuredCharacterHealthChange(plan);

      assert.notEqual(result.status, 'saved');
      assert.equal(
        result.code,
        STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.COMMIT_FAILED
      );
    });
  }
);


test(
  'workspace switch, missing durable page and write failure return typed non-success results',
  async t => {
    await t.test('workspace switch', async () => {
      const fixture = await structuredFixture({ storedHealth: health(10, 20, 0) });
      const plan = prepare(fixture, { type: 'delta', delta: -1 });
      setStorageAdapter(createMemoryStorageAdapter());
      const result = await commitStructuredCharacterHealthChange(plan);
      assert.equal(result.status, 'blocked');
      assert.equal(result.code, STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.COMMIT_BLOCKED);
    });

    await t.test('missing durable page', async () => {
      const fixture = await structuredFixture({ storedHealth: health(10, 20, 0) });
      const plan = prepare(fixture, { type: 'delta', delta: -1 });
      await fixture.adapter.removeFile(fixture.page.path);
      const result = await commitStructuredCharacterHealthChange(plan);
      assert.notEqual(result.status, 'saved');
      assert.notEqual(result.code, null);
    });

    await t.test('write failure', async () => {
      const fixture = await structuredFixture({ storedHealth: health(10, 20, 0) });
      const plan = prepare(fixture, { type: 'delta', delta: -1 });
      const write = fixture.adapter.writeText.bind(fixture.adapter);
      fixture.adapter.writeText = async (path, content) => {
        if (path === fixture.page.path) throw new Error('injected write failure');
        return write(path, content);
      };
      const result = await commitStructuredCharacterHealthChange(plan);
      assert.notEqual(result.status, 'saved');
      assert.notEqual(result.code, null);
    });
  }
);


test(
  'readback mismatch is uncertain and a committed plan cannot be reused',
  async () => {
    const fixture =
      await structuredFixture({
        storedHealth: health(10, 20, 0)
      });
    const plan =
      prepare(fixture, { type: 'delta', delta: -1 });
    const write =
      fixture.adapter.writeText.bind(fixture.adapter);

    fixture.adapter.writeText = async (path, content) => {
      if (path !== fixture.page.path) return write(path, content);
      const parsed = parsePageRecordContent(content);
      const altered = structuredClone(parsed.variablesJson);
      altered.values['dnd.health']['dnd.hpCurrent'] = 7;
      return write(
        path,
        updatePageRecordContent(content, {
          variablesJson: altered
        })
      );
    };

    const result =
      await commitStructuredCharacterHealthChange(plan);

    assert.equal(result.status, 'uncertain');
    assert.equal(
      result.code,
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.READBACK_UNCERTAIN
    );
    assert.equal(
      (await commitStructuredCharacterHealthChange(plan)).code,
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.PLAN_BLOCKED
    );
  }
);


test(
  'stale expectedBase is rejected during side-effect-free preparation',
  async () => {
    const fixture =
      await structuredFixture({
        storedHealth: health(10, 20, 0)
      });
    const stale = {
      ...createPageStateIdentityFromContent(fixture.page.content),
      stateHash: 'fnv1a32:00000000'
    };

    assertHealthError(
      () => prepareStructuredCharacterHealthChange({
        pageId: fixture.page.id,
        expectedBase: stale,
        request: { type: 'delta', delta: -1 },
        context: fixture.context
      }),
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.STALE_BASE
    );
    assert.equal(
      await fixture.adapter.readText(fixture.page.path),
      fixture.originalContent
    );
  }
);


test(
  'prepare requires the exact activated registry instead of an implicit schema source',
  async () => {
    const fixture =
      await structuredFixture({
        storedHealth: health(10, 20, 0)
      });

    assertHealthError(
      () => prepareStructuredCharacterHealthChange({
        pageId: fixture.page.id,
        expectedBase:
          createPageStateIdentityFromContent(
            fixture.page.content
          ),
        request: { type: 'delta', delta: -1 },
        context: {
          repository: fixture.context.repository,
          workspaceContext:
            fixture.context.workspaceContext
        }
      }),
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.PREPARE_BLOCKED
    );
    assert.equal(
      await fixture.adapter.readText(fixture.page.path),
      fixture.originalContent
    );
  }
);


test('maximum request preserves the complete health object, body and unrelated values with durable model verification', async t => {
  for (const [type, siblings] of [
    ['character', { 'character.health.formula': '2d8', 'character.health.hitDice': '2d8' }],
    ['player', { 'player.health.hitDice': [{
      'player.health.hitDice.rowId': 'maximum-die', 'player.health.hitDice.die': 'd10',
      'player.health.hitDice.current': 1, 'player.health.hitDice.maximum': 2
    }], 'player.health.criticalThreshold': 19 }]
  ]) {
    await t.test(type, async () => {
      const fixture = await structuredFixture({ type, storedHealth: { ...health(8, 20, 3), ...siblings } });
      const original = parsePageRecordContent(fixture.page.content);
      for (const max of [30, 8]) {
        const plan = prepare(fixture, { type: 'maximum', hpMax: max });
        assert.deepEqual(plan.after, { current: 8, max, temp: 3 });
        assert.deepEqual(plan.changedFields.map(change => change.field), ['dnd.hpMax']);
        const result = await commitStructuredCharacterHealthChange(plan);
        assert.equal(result.status, 'saved', JSON.stringify(result));
        const durable = parsePageRecordContent(await fixture.adapter.readText(fixture.page.path));
        assert.deepEqual(durable.variablesJson.values['dnd.health'], { ...health(8, max, 3), ...siblings });
        assert.equal(durable.rawBody, original.rawBody);
        assert.deepEqual(durable.variablesJson.inactive, original.variablesJson.inactive);
        assert.deepEqual(readCharacterModelFromPage(fixture.page, { registry }).health,
          { current: 8, max, temp: 3, percent: 8 / max, isDown: false });
        assert.equal((await commitStructuredCharacterHealthChange(plan)).status, 'blocked');
      }
      let writes = 0;
      fixture.adapter.writeText = async () => { writes += 1; };
      assert.equal((await commitStructuredCharacterHealthChange(
        prepare(fixture, { type: 'maximum', hpMax: 8 })
      )).status, 'unchanged');
      assert.equal(writes, 0);
    });
  }
});

test('maximum preserves active own Effects extension, Inventory, recovery and metadata alongside health', async () => {
  const fixture = await structuredFixture({
    storedHealth: { ...health(8, 20, 3), 'character.health.formula': '2d8' },
    values: {
      [OWN_EFFECTS_KEY]: encodeOwnEffects(createSerializableEffectsData({
        conditions: ['poisoned'], selectedRuleIds: ['selected-rule'],
        effects: [{ id: 'own-effect', modifiers: { savingThrows: { str: 99 } } }]
      })),
      'dnd.items': [], 'dnd.equippedItems': [], 'character.category': 'npc'
    },
    extensions: { revision: 1, fields: [{ id: 'dnd.own-effects', version: 1 }] },
    inactive: [{ key: 'hpMax', raw: 'legacy recovery max' }]
  });
  const original = parsePageRecordContent(fixture.page.content);
  const result = await commitStructuredCharacterHealthChange(prepare(fixture, { type: 'maximum', hpMax: 30 }));
  assert.equal(result.status, 'saved', JSON.stringify(result));
  const after = parsePageRecordContent(await fixture.adapter.readText(fixture.page.path));
  const expected = structuredClone(original.variablesJson);
  expected.values['dnd.health']['dnd.hpMax'] = 30;
  assert.deepEqual(after.variablesJson, expected);
  assert.deepEqual(after.tags, original.tags);
  assert.equal(after.rawBody, original.rawBody);
  assert.equal(readCharacterModelFromPage(fixture.page, { registry }).calculations.checks.byKey.saveStr.value, 0);
});

test('maximum rejects unsafe requests and below-current max without clamping or writing', async () => {
  const fixture = await structuredFixture({ storedHealth: health(8, 20, 3) });
  for (const hpMax of [0, -1, 1.5, '30', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assertHealthError(() => prepare(fixture, { type: 'maximum', hpMax }),
      STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_REQUEST);
  }
  assertHealthError(() => prepare(fixture, { type: 'maximum', hpMax: 7 }),
    STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_HEALTH_STATE);
  assertHealthError(() => prepare(fixture, { type: 'exact', hpCurrent: 8, hpTemp: 3, hpMax: 30 }),
    STRUCTURED_CHARACTER_HEALTH_ERROR_CODES.INVALID_REQUEST);
  assert.equal(await fixture.adapter.readText(fixture.page.path), fixture.originalContent);
});

test('maximum inherits Variables stale/workspace/closure/durable failure guards without retry', async t => {
  for (const scenario of ['stale', 'workspace', 'catalog', 'missing', 'moved', 'write', 'readback']) {
    await t.test(scenario, async () => {
      const fixture = await structuredFixture({ storedHealth: health(8, 20, 3) });
      const plan = prepare(fixture, { type: 'maximum', hpMax: 30 });
      const write = fixture.adapter.writeText.bind(fixture.adapter);
      if (scenario === 'stale') {
        await write(fixture.page.path, updatePageRecordContent(fixture.page.content, { body: '<p>external edit</p>' }));
      } else if (scenario === 'workspace') {
        setStorageAdapter(createMemoryStorageAdapter());
      } else if (scenario === 'catalog') {
        const changed = structuredClone(catalog);
        changed.types.find(definition => definition.id === 'character').label = 'Changed closure';
        await write(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(changed));
      } else if (scenario === 'missing' || scenario === 'moved') {
        await fixture.adapter.removeFile(fixture.page.path);
        if (scenario === 'moved') await write('/pages/moved.md', fixture.originalContent);
      } else {
        fixture.adapter.writeText = async (path, content) => {
          if (path !== fixture.page.path) return write(path, content);
          if (scenario === 'write') throw new Error('injected failure');
          const envelope = structuredClone(parsePageRecordContent(content).variablesJson);
          envelope.values['dnd.health']['dnd.hpMax'] = 25;
          return write(path, updatePageRecordContent(content, { variablesJson: envelope }));
        };
      }
      const result = await commitStructuredCharacterHealthChange(plan);
      assert.notEqual(result.status, 'saved', JSON.stringify(result));
      assert.ok(result.code);
      if (scenario === 'readback') assert.equal(result.status, 'uncertain');
      assert.equal((await commitStructuredCharacterHealthChange(plan)).status, 'blocked');
    });
  }
});

async function structuredFixture({
  type = 'character',
  storedHealth = health(10, 20, 0),
  values = {},
  inactive = [],
  extensions = undefined
} = {}) {
  const base =
    await createEditConflictFixture({
      id: `${type}-structured-health`,
      type,
      body: propertiesBody
    });
  const definition =
    registry.getResolvedType(type, 1);
  const structuredValues = {
    ...values
  };

  if (storedHealth !== OMIT_HEALTH) {
    structuredValues['dnd.health'] = storedHealth;
  }

  base.page.content = buildPageRecordContent({
    id: base.page.id,
    schemaVersion: 2,
    type,
    template: 'card',
    tags: ['keep'],
    body: propertiesBody,
    variablesJson: {
      formatVersion: 1,
      schemaVersion: 1,
      schemaDigest: definition.digest,
      values: structuredValues,
      overrides: {},
      inactive,
      ...(extensions ? { extensions } : {})
    },
    now: '2026-09-27T00:00:00Z'
  });
  base.page.type = type;
  base.page.schemaVersion = 2;
  await base.adapter.writeText(
    base.page.path,
    base.page.content
  );
  await base.adapter.writeText(
    CARD_TYPE_CATALOG_PATH,
    serializeCardTypeCatalog(catalog)
  );
  setPages([base.page]);

  return {
    ...base,
    originalContent: base.page.content,
    context: {
      registry,
      workspaceContext:
        captureStorageWorkspaceContext()
    }
  };
}


function prepare(
  fixture,
  request
) {
  return prepareStructuredCharacterHealthChange({
    pageId: fixture.page.id,
    expectedBase:
      createPageStateIdentityFromContent(
        fixture.page.content
      ),
    request,
    context: fixture.context
  });
}


function health(
  current,
  max,
  temp
) {
  return {
    'dnd.hpCurrent': current,
    'dnd.hpMax': max,
    'dnd.hpTemporary': temp
  };
}


function tuple(
  value
) {
  return {
    current: value['dnd.hpCurrent'],
    max: value['dnd.hpMax'],
    temp: value['dnd.hpTemporary']
  };
}


function assertHealthError(
  operation,
  code
) {
  assert.throws(
    operation,
    error => {
      assert.equal(error.code, code);
      return true;
    }
  );
}
