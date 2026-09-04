import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COMBAT_SESSION_INTEGRITY_STATUSES,
  COMBAT_SESSION_KIND,
  COMBAT_SESSION_REFERENCE_TYPES,
  COMBAT_SESSION_VERSION,
  CombatSessionModel
} from '../js/combat/combatSessionModel.js';

import {
  serializeCampaignMapModelHTML
} from '../js/editor/campaignMapDataSerializer.js';

import {
  CampaignMapModel
} from '../js/editor/campaignMapModel.js';

import {
  CampaignMapStore
} from '../js/editor/campaignMapStore.js';


test(
  'legacy Campaign Map remains without a Combat Session through load and serialization',
  () => {

    const stage =
      createStage({
        mapAsset:
          'maps/legacy.png',
        grid:
          'true',
        gridSize:
          '72'
      });

    const model =
      CampaignMapModel.fromElement(
        createMap(
          stage
        )
      );

    assert.equal(
      model.combatSession,
      null
    );

    assert.equal(
      model.asset,
      'maps/legacy.png'
    );

    assert.equal(
      model.grid.enabled,
      true
    );

    assert.equal(
      model.grid.size,
      72
    );

    assert.equal(
      model.toJSON().combatSession,
      null
    );

    const html =
      serializeCampaignMapModelHTML({
        title:
          'Legacy Map',
        model
      });

    assert.doesNotMatch(
      html,
      /data-combat-session-state/
    );

    const inactiveModel =
      new CampaignMapModel({
        combatSession: {
          sessionId:
            'session-inactive',
          status:
            'inactive',
          round:
            1,
          participants:
            []
        }
      });

    assert.equal(
      inactiveModel.combatSession,
      null
    );

    assert.doesNotMatch(
      serializeCampaignMapModelHTML({
        title:
          'Inactive Map',
        model:
          inactiveModel
      }),
      /data-combat-session-state/
    );
  }
);


test(
  'Campaign Map serializes only canonical durable Combat Session state',
  () => {

    const combatSession =
      new CombatSessionModel({
        sessionId:
          'session-durable',
        status:
          'paused',
        round:
          4,
        participants: [
          {
            participantId:
              'token:hero',
            ready:
              true,
            delayed:
              false,
            name:
              'Copied hero',
            hp:
              14,
            armorClass:
              18,
            modifier:
              3,
            roll:
              17,
            total:
              20,
            currentIndex:
              0,
            activeParticipantId:
              'token:hero'
          }
        ],
        integrity: {
          status:
            COMBAT_SESSION_INTEGRITY_STATUSES.UNRESOLVED,
          issues: [
            {
              participantId:
                'token:hero',
              referenceType:
                COMBAT_SESSION_REFERENCE_TYPES.PAGE
            }
          ]
        }
      });

    const model =
      new CampaignMapModel({
        combatSession,
        initiative: {
          activeParticipantId:
            'token:hero',
          participants: [
            {
              participantId:
                'token:hero',
              tokenId:
                'hero',
              name:
                'Canonical hero',
              modifier:
                3,
              roll:
                17,
              total:
                20
            }
          ]
        }
      });

    const html =
      serializeCampaignMapModelHTML({
        title:
          'Combat Map',
        model
      });

    const payload =
      readEncodedAttribute(
        html,
        'data-combat-session-state'
      );

    assert.deepEqual(
      payload,
      {
        kind:
          COMBAT_SESSION_KIND,
        version:
          COMBAT_SESSION_VERSION,
        sessionId:
          'session-durable',
        status:
          'paused',
        round:
          4,
        participants: [
          {
            participantId:
              'token:hero',
            ready:
              true,
            delayed:
              false
          }
        ]
      }
    );

    assert.equal(
      model.initiative.activeParticipantId,
      'token:hero'
    );

    assert.equal(
      model.initiative.participants[0].total,
      20
    );
  }
);


test(
  'Combat Session survives Campaign Map serialize and hydrate with stable identity',
  () => {

    const model =
      new CampaignMapModel({
        combatSession: {
          sessionId:
            'session-round-trip',
          status:
            'active',
          round:
            8,
          participants: [
            {
              participantId:
                'token:a',
              ready:
                false,
              delayed:
                true
            },
            {
              participantId:
                'token:missing',
              ready:
                true,
              delayed:
                false
            }
          ]
        }
      });

    const html =
      serializeCampaignMapModelHTML({
        title:
          'Round Trip',
        model
      });

    const encodedState =
      readRawAttribute(
        html,
        'data-combat-session-state'
      );

    const stage =
      createStage({
        combatSessionState:
          encodedState
      });

    const reloaded =
      CampaignMapModel.fromElement(
        createMap(
          stage
        )
      );

    assert.deepEqual(
      reloaded.combatSession,
      model.combatSession
    );

    assert.equal(
      reloaded.combatSession.sessionId,
      'session-round-trip'
    );
  }
);


test(
  'malformed Combat Session payload keeps the containing Campaign Map loadable and inactive',
  () => {

    const brokenJsonStage =
      createStage({
        combatSessionState:
          encodeURIComponent(
            '{broken-json'
          ),
        grid:
          'true'
      });

    const brokenJsonModel =
      CampaignMapModel.fromElement(
        createMap(
          brokenJsonStage
        )
      );

    assert.equal(
      brokenJsonModel.combatSession,
      null
    );

    assert.equal(
      brokenJsonModel.grid.enabled,
      true
    );

    const missingIdentityStage =
      createStage({
        combatSessionState:
          encodeURIComponent(
            JSON.stringify({
              status:
                'active',
              round:
                2,
              participants:
                []
            })
          )
      });

    const missingIdentityModel =
      CampaignMapModel.fromElement(
        createMap(
          missingIdentityStage
        )
      );

    assert.equal(
      missingIdentityModel.combatSession,
      null
    );
  }
);


test(
  'CampaignMapStore clears stale Combat Session DOM state through the aggregate setter',
  () => {

    const stage =
      createStage({
        combatSessionState:
          encodeURIComponent(
            JSON.stringify({
              kind:
                COMBAT_SESSION_KIND,
              version:
                COMBAT_SESSION_VERSION,
              sessionId:
                'session-stale',
              status:
                'finished',
              round:
                5,
              participants:
                []
            })
          )
      });

    const store =
      new CampaignMapStore(
        createMap(
          stage
        )
      );

    store.refreshFromDOM();
    store.clearDirty();

    assert.equal(
      store.getModel().combatSession.sessionId,
      'session-stale'
    );

    store.setCombatSession(
      null
    );

    assert.equal(
      store.getModel().combatSession,
      null
    );

    assert.equal(
      Object.hasOwn(
        stage.dataset,
        'combatSessionState'
      ),
      false
    );

    assert.equal(
      store.isDirty(),
      true
    );
  }
);


function createStage(
  dataset = {}
) {

  return {
    dataset: {
      ...dataset
    }
  };
}


function createMap(
  stage
) {

  return {
    querySelector(selector) {

      return selector === '.campaign-map-stage'
        ? stage
        : null;
    },
    querySelectorAll() {

      return [];
    }
  };
}


function readEncodedAttribute(
  html,
  name
) {

  return JSON.parse(
    decodeURIComponent(
      readRawAttribute(
        html,
        name
      )
    )
  );
}


function readRawAttribute(
  html,
  name
) {

  const match =
    html.match(
      new RegExp(
        `${name}="([^"]+)"`
      )
    );

  assert.ok(
    match,
    `${name} must exist`
  );

  return match[1];
}
