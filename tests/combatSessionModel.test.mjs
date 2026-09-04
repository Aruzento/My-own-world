import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COMBAT_SESSION_INTEGRITY_STATUSES,
  COMBAT_SESSION_KIND,
  COMBAT_SESSION_REFERENCE_TYPES,
  COMBAT_SESSION_STATUSES,
  COMBAT_SESSION_VERSION,
  CombatSessionModel
} from '../js/combat/combatSessionModel.js';


test(
  'CombatSessionModel creates the canonical default session shape',
  () => {

    const model =
      new CombatSessionModel(
        {},
        {
          generateId: () =>
            'session-created'
        }
      );

    assert.deepEqual(
      model.toJSON(),
      {
        kind:
          COMBAT_SESSION_KIND,
        version:
          COMBAT_SESSION_VERSION,
        sessionId:
          'session-created',
        status:
          COMBAT_SESSION_STATUSES.ACTIVE,
        round:
          1,
        participants:
          []
      }
    );

    assert.deepEqual(
      model.integrity,
      {
        status:
          COMBAT_SESSION_INTEGRITY_STATUSES.UNCHECKED,
        issues:
          []
      }
    );
  }
);


test(
  'CombatSessionModel creates unique normal identities and preserves supplied identity',
  () => {

    const first =
      new CombatSessionModel();

    const second =
      new CombatSessionModel();

    assert.ok(
      first.sessionId
    );

    assert.notEqual(
      first.sessionId,
      second.sessionId
    );

    let generateCalls =
      0;

    const loaded =
      new CombatSessionModel(
        {
          sessionId:
            'session-existing'
        },
        {
          generateId: () => {

            generateCalls += 1;

            return 'session-replacement';
          }
        }
      );

    assert.equal(
      loaded.sessionId,
      'session-existing'
    );

    assert.equal(
      generateCalls,
      0
    );
  }
);


test(
  'CombatSessionModel accepts canonical lifecycle states and safely defaults invalid input',
  () => {

    Object
      .values(
        COMBAT_SESSION_STATUSES
      )
      .forEach(status => {

        const model =
          new CombatSessionModel({
            sessionId:
              `session-${status}`,
            status
          });

        assert.equal(
          model.status,
          status
        );
      });

    assert.equal(
      new CombatSessionModel({
        sessionId:
          'session-invalid-status',
        status:
          'waiting'
      }).status,
      COMBAT_SESSION_STATUSES.ACTIVE
    );
  }
);


test(
  'CombatSessionModel preserves valid round state without advancing it',
  () => {

    const model =
      new CombatSessionModel({
        sessionId:
          'session-round',
        round:
          7
      });

    assert.equal(
      model.round,
      7
    );

    assert.equal(
      model.toJSON().round,
      7
    );

    [
      0,
      -1,
      1.5,
      Number.POSITIVE_INFINITY,
      'not-a-round'
    ].forEach(round => {

      assert.equal(
        new CombatSessionModel({
          sessionId:
            `session-invalid-round-${String(round)}`,
          round
        }).round,
        1
      );
    });
  }
);


test(
  'CombatSessionModel keeps participant references and combat-local flags only',
  () => {

    const model =
      new CombatSessionModel({
        sessionId:
          'session-participants',
        participants: [
          {
            participantId:
              'token:hero',
            ready:
              true,
            delayed:
              true,
            tokenId:
              'hero',
            pageId:
              'page-hero',
            name:
              'Hero snapshot',
            hp:
              12,
            ac:
              17,
            stats:
              {
                strength:
                  18
              },
            initiativeModifier:
              4,
            initiativeRoll:
              16,
            currentIndex:
              0,
            conditions:
              ['hidden']
          },
          {
            participantId:
              'token:unresolved'
          }
        ]
      });

    assert.deepEqual(
      model.participants,
      [
        {
          participantId:
            'token:hero',
          ready:
            true,
          delayed:
            true
        },
        {
          participantId:
            'token:unresolved',
          ready:
            false,
          delayed:
            false
        }
      ]
    );

    assert.throws(
      () =>
        new CombatSessionModel({
          sessionId:
            'session-no-index-identity',
          participants: [
            {
              ready:
                true
            }
          ]
        }),
      /participantId/
    );
  }
);


test(
  'CombatSessionModel retains structured unresolved-reference integrity without persisting diagnostics',
  () => {

    const model =
      new CombatSessionModel({
        sessionId:
          'session-integrity',
        participants: [
          {
            participantId:
              'token:missing'
          }
        ],
        integrity: {
          status:
            COMBAT_SESSION_INTEGRITY_STATUSES.UNRESOLVED,
          issues: [
            {
              participantId:
                'token:missing',
              referenceType:
                COMBAT_SESSION_REFERENCE_TYPES.TOKEN
            }
          ]
        }
      });

    assert.deepEqual(
      model.integrity,
      {
        status:
          COMBAT_SESSION_INTEGRITY_STATUSES.UNRESOLVED,
        issues: [
          {
            participantId:
              'token:missing',
            referenceType:
              COMBAT_SESSION_REFERENCE_TYPES.TOKEN
          }
        ]
      }
    );

    assert.equal(
      model.participants[0].participantId,
      'token:missing'
    );

    assert.equal(
      Object.hasOwn(
        model.toJSON(),
        'integrity'
      ),
      false
    );
  }
);


test(
  'CombatSessionModel normalizes compatible state deterministically without aliasing input',
  () => {

    const input =
      {
        sessionId:
          'session-compatible',
        status:
          COMBAT_SESSION_STATUSES.PAUSED,
        round:
          3,
        participants: [
          {
            participantId:
              'token:a',
            ready:
              true
          }
        ]
      };

    const first =
      new CombatSessionModel(
        input
      );

    const second =
      new CombatSessionModel(
        input
      );

    assert.deepEqual(
      first.toJSON(),
      second.toJSON()
    );

    input.participants[0].participantId =
      'token:changed-outside';

    assert.equal(
      first.participants[0].participantId,
      'token:a'
    );

    const output =
      first.toJSON();

    output.participants[0].ready =
      false;

    assert.equal(
      first.participants[0].ready,
      true
    );
  }
);
