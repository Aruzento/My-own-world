import { expect, test } from '@playwright/test';

test('combat integration publishes one map aggregate and reloads separated initiative/session truth', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const { CampaignMapModel } = await import('/js/editor/campaignMapModel.js');
    const { getCampaignMapStore, refreshCampaignMapStore } = await import('/js/editor/campaignMapStore.js');
    const { serializeCampaignMapModelHTML, serializeCampaignMapDocumentHTML } =
      await import('/js/editor/campaignMapDataSerializer.js');
    const { resolveCombatSessionParticipant } = await import('/js/editor/campaignMapCombatSessionIntegration.js');
    const { pauseCombatSession, resumeCombatSession, finishCombatSession } =
      await import('/js/combat/combatSessionLifecycle.js');

    const initial = new CampaignMapModel({
      initiative: {
        activeParticipantId: 'token:b',
        participants: [
          { participantId: 'token:a', tokenId: 'a', pageId: 'page-a', name: 'A', roll: 15, modifier: 3, total: 18 },
          { participantId: 'token:b', tokenId: 'b', pageId: 'page-b', name: 'B', roll: 11, modifier: 3, total: 14 }
        ]
      }
    });
    const editor = document.querySelector('#editorArea');
    editor.innerHTML = serializeCampaignMapModelHTML({ title: 'Integration Map', model: initial });
    const map = editor.querySelector('.campaign-map-document');
    const store = getCampaignMapStore(map);
    const legacySession = store.getModel().combatSession;
    const initiativeBefore = structuredClone(store.getModel().initiative);
    const start = store.startCombatSession({ generateId: () => 'session-browser-integration' });
    const initiativeAfter = structuredClone(store.getModel().initiative);
    const startedSession = structuredClone(store.getModel().combatSession);

    store.setCombatSession({
      ...startedSession, round: 5,
      participants: startedSession.participants.map(member => ({
        ...member, delayed: member.participantId === 'token:b'
      }))
    });
    store.setCombatSession(pauseCombatSession(store.getModel().combatSession).session);
    store.clearDirty();
    const pausedHTML = map.outerHTML;
    const replacement = {
      activeParticipantId: 'token:b',
      participants: [
        initiativeBefore.participants[1],
        { participantId: 'token:c', tokenId: 'c', pageId: 'page-c', name: 'C', roll: 2, modifier: 1, total: 3 }
      ]
    };
    const pausedEdit = store.setInitiativeRoster(replacement);
    const pausedUnchanged = map.outerHTML === pausedHTML && !store.isDirty();
    store.setCombatSession(resumeCombatSession(store.getModel().combatSession).session);
    const edited = store.setInitiativeRoster(replacement);
    const savedHTML = serializeCampaignMapDocumentHTML(map);
    editor.innerHTML = savedHTML;
    const reloadedMap = editor.querySelector('.campaign-map-document');
    const reloadedStore = refreshCampaignMapStore(reloadedMap);
    const reloaded = structuredClone(reloadedStore.getModel().toJSON());
    const current = resolveCombatSessionParticipant(reloadedStore.getModel());
    reloadedStore.setCombatSession(finishCombatSession(reloaded.combatSession).session);
    reloadedStore.clearDirty();
    const finishedHTML = reloadedMap.outerHTML;
    const finishedEdit = reloadedStore.setInitiativeRoster(initiativeBefore);

    return {
      legacySession, start, initiativeBefore, initiativeAfter, startedSession,
      pausedEdit, pausedUnchanged, edited, reloaded, current,
      finishedEdit,
      finishedUnchanged: reloadedMap.outerHTML === finishedHTML && !reloadedStore.isDirty()
    };
  });

  expect(result.legacySession).toBeNull();
  expect(result.start.ok).toBe(true);
  expect(result.initiativeAfter).toEqual(result.initiativeBefore);
  expect(result.startedSession.round).toBe(1);
  expect(result.pausedEdit).toMatchObject({ ok: false, reason: 'roster-edit-not-allowed', status: 'paused' });
  expect(result.pausedUnchanged).toBe(true);
  expect(result.edited.ok).toBe(true);
  expect(result.reloaded.combatSession).toEqual({
    kind: 'CombatSession', version: 1, sessionId: 'session-browser-integration', status: 'active', round: 5,
    participants: [
      { participantId: 'token:b', ready: false, delayed: true },
      { participantId: 'token:c', ready: false, delayed: false }
    ]
  });
  expect(result.reloaded.initiative.activeParticipantId).toBe('token:b');
  expect(result.current).toMatchObject({ ok: true, participantId: 'token:b', initiativeParticipant: { total: 14 } });
  expect(result.finishedEdit).toMatchObject({ ok: false, reason: 'roster-edit-not-allowed', status: 'finished' });
  expect(result.finishedUnchanged).toBe(true);
  expect(errors).toEqual([]);
});
