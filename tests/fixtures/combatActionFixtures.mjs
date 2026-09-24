import { createDataSafetyPage, createMemoryWorkspaceAdapter } from './dataSafetyFixtures.mjs';
import { CampaignMapModel } from '../../js/editor/campaignMapModel.js';
import { serializeCampaignMapModelHTML } from '../../js/editor/campaignMapDataSerializer.js';
import { createPropertiesBlock } from '../../js/templates/blockTypes.js';
import { setStorageAdapter } from '../../js/storage/storageAdapter.js';
import { rebuildPageRepository } from '../../js/repository/pageRepository.js';
import { createDiceSequenceRandomInt } from './diceSequenceRandomInt.mjs';

export function attackRequest() {
  return { kind: 'CombatActionRequest', version: 1, actionId: 'action-1', mapPageId: 'map-1', sessionId: 'session-1',
    actor: { participantId: 'token:actor' }, target: { participantId: 'token:target' },
    action: { type: 'attack', definitionId: 'shortbow', label: 'Shortbow', source: { kind: 'manual' },
      hitPolicy: 'ac-total-v1', attackRoll: { formula: 'd20 + 4', mode: 'normal', criticalPolicy: 'none' },
      damageComponents: [{ componentId: 'piercing-1', damageType: 'piercing',
        roll: { formula: '1d6 + 2', mode: 'normal', criticalPolicy: 'none' } }] } };
}

// Disposable real Properties + PageRecord + map serializer fixtures; memory storage uses the shared owner fixture.
export async function createCombatActionWorld({ current = 10, temp = 0, dice = [10, 3],
  actorName = 'actor', targetName = 'target', status = 'active' } = {}) {
  const characterPage = (id, health) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = createPropertiesBlock({ cardType: 'character', title: id });
    for (const [field, value] of Object.entries({ hpCurrent: health.current, hpMax: 10, hpTemp: health.temp, armorClass: 12 })) {
      const control = wrapper.querySelector(`[data-property-name="${field}"]`);
      control.value = String(value);
      control.setAttribute('value', String(value));
    }
    return createDataSafetyPage({ id, type: 'character', body: wrapper.innerHTML + '<p>Preserved unrelated text</p>' });
  };
  const actor = characterPage('actor-page', { current: 10, temp: 0 });
  const target = characterPage('target-page', { current, temp });
  const names = { actor: actorName, target: targetName };
  const tokens = ['actor', 'target'].map(tokenId => ({ tokenId, pageId: `${tokenId}-page`, name: names[tokenId], sourceMode: 'original' }));
  const mapModel = new CampaignMapModel({ tokens,
    initiative: { participants: tokens.map(t => ({ ...t, participantId: `token:${t.tokenId}` })), activeParticipantId: 'token:actor' },
    combatSession: { sessionId: 'session-1', status, round: 3,
      participants: [{ participantId: 'token:actor' }, { participantId: 'token:target' }, { participantId: 'token:broken' }] } });
  const map = createDataSafetyPage({ id: 'map-1', type: 'campaignMap', template: 'campaignMap',
    body: serializeCampaignMapModelHTML({ title: 'Map', model: mapModel }) });
  const pages = [actor, target, map];
  const adapter = createMemoryWorkspaceAdapter();
  for (const p of pages) await adapter.writeText(p.path, p.content);
  const original = { readText: adapter.readText.bind(adapter), writeText: adapter.writeText.bind(adapter) };
  const effects = { writes: 0, appends: 0, reads: 0 };
  adapter.readText = async path => { effects.reads++; return original.readText(path); };
  adapter.writeText = async (path, content) => { effects.writes++; return original.writeText(path, content); };
  adapter.appendText = async (path, content) => {
    effects.appends++;
    let previous = '';
    try { previous = await original.readText(path); } catch { /* New fixture log. */ }
    await original.writeText(path, previous + content);
  };
  setStorageAdapter(adapter);
  rebuildPageRepository(pages);
  const rng = createDiceSequenceRandomInt(dice);
  let sequence = 0;
  const context = { mapPageId: map.id, mapModel, dirty: false };
  return { actor, target, map, pages, mapModel, context, adapter, original, effects, rng,
    options: { getMapContext: () => context, randomInt: rng.randomInt,
      createId: () => `fixture-${++sequence}`, now: () => '2026-09-22T10:00:00.000Z' } };
}
