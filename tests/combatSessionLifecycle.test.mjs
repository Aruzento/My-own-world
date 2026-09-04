import './setup.mjs';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COMBAT_SESSION_STATUSES,
  CombatSessionModel
} from '../js/combat/combatSessionModel.js';

import {
  COMBAT_SESSION_LIFECYCLE_OPERATIONS,
  COMBAT_SESSION_LIFECYCLE_REASONS,
  finishCombatSession,
  pauseCombatSession,
  resumeCombatSession,
  startCombatSession
} from '../js/combat/combatSessionLifecycle.js';

import {
  CampaignMapModel
} from '../js/editor/campaignMapModel.js';

import {
  serializeCampaignMapModelHTML
} from '../js/editor/campaignMapDataSerializer.js';


test(
  'start creates an active session from null after validating explicit initiative context',
  () => {

    let generateCalls =
      0;

    const context =
      {
        participantIds: [
          'token:hero',
          'token:rival'
        ],
        activeParticipantId:
          'token:rival',
        currentIndex:
          1,
        initiativeOrder: [
          'token:hero',
          'token:rival'
        ],
        character: {
          pageId:
            'page-hero',
          hp:
            19,
          armorClass:
            16
        }
      };

    const result =
      startCombatSession(
        null,
        context,
        {
          generateId: () => {

            generateCalls += 1;

            return 'session-started';
          }
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.operation,
      COMBAT_SESSION_LIFECYCLE_OPERATIONS.START
    );

    assert.deepEqual(
      result.session,
      {
        kind:
          'CombatSession',
        version:
          1,
        sessionId:
          'session-started',
        status:
          COMBAT_SESSION_STATUSES.ACTIVE,
        round:
          1,
        participants: [
          {
            participantId:
              'token:hero',
            ready:
              false,
            delayed:
              false
          },
          {
            participantId:
              'token:rival',
            ready:
              false,
            delayed:
              false
          }
        ]
      }
    );

    assert.equal(
      generateCalls,
      1
    );

    [
      'activeParticipantId',
      'currentIndex',
      'initiativeOrder',
      'roll',
      'modifier',
      'total',
      'character'
    ].forEach(key => {

      assert.equal(
        Object.hasOwn(
          result.session,
          key
        ),
        false
      );
    });
  }
);


test(
  'start after finished creates a new identity and leaves the finished session unchanged',
  () => {

    const finished =
      createSession(
        COMBAT_SESSION_STATUSES.FINISHED,
        {
          sessionId:
            'session-finished',
          round:
            9
        }
      );

    const before =
      structuredClone(
        finished
      );

    const result =
      startCombatSession(
        finished,
        {
          participantIds: [
            'token:new-a',
            'token:new-b'
          ],
          activeParticipantId:
            'token:new-a'
        },
        {
          generateId: () =>
            'session-new'
        }
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.session.sessionId,
      'session-new'
    );

    assert.notEqual(
      result.session.sessionId,
      finished.sessionId
    );

    assert.equal(
      result.session.round,
      1
    );

    assert.deepEqual(
      result.session.participants,
      [
        {
          participantId:
            'token:new-a',
          ready:
            false,
          delayed:
            false
        },
        {
          participantId:
            'token:new-b',
          ready:
            false,
          delayed:
            false
        }
      ]
    );

    assert.deepEqual(
      finished,
      before
    );
  }
);


test(
  'start rejects invalid roster and active-participant preconditions before identity generation',
  () => {

    let generateCalls =
      0;

    const options =
      {
        generateId: () => {

          generateCalls += 1;

          return 'must-not-be-generated';
        }
      };

    const cases =
      [
        {
          context: {
            participantIds: [],
            activeParticipantId:
              'token:a'
          },
          reason:
            COMBAT_SESSION_LIFECYCLE_REASONS.EMPTY_ROSTER
        },
        {
          context: {
            participantIds: [
              ''
            ],
            activeParticipantId:
              'token:a'
          },
          reason:
            COMBAT_SESSION_LIFECYCLE_REASONS.INVALID_PARTICIPANT
        },
        {
          context: {
            participantIds: [
              {
                participantId:
                  'token:a',
                name:
                  'Character snapshot',
                hp:
                  12
              }
            ],
            activeParticipantId:
              'token:a'
          },
          reason:
            COMBAT_SESSION_LIFECYCLE_REASONS.INVALID_PARTICIPANT
        },
        {
          context: {
            participantIds: [
              'token:a',
              'token:a'
            ],
            activeParticipantId:
              'token:a'
          },
          reason:
            COMBAT_SESSION_LIFECYCLE_REASONS.INVALID_PARTICIPANT
        },
        {
          context: {
            participantIds: [
              'token:a'
            ]
          },
          reason:
            COMBAT_SESSION_LIFECYCLE_REASONS.ACTIVE_PARTICIPANT_REQUIRED
        },
        {
          context: {
            participantIds: [
              'token:a'
            ],
            activeParticipantId:
              'token:missing'
          },
          reason:
            COMBAT_SESSION_LIFECYCLE_REASONS.ACTIVE_PARTICIPANT_NOT_FOUND
        }
      ];

    cases.forEach(({ context, reason }) => {

      const before =
        structuredClone(
          context
        );

      const result =
        startCombatSession(
          null,
          context,
          options
        );

      assert.deepEqual(
        result,
        {
          ok:
            false,
          operation:
            COMBAT_SESSION_LIFECYCLE_OPERATIONS.START,
          reason,
          session:
            null
        }
      );

      assert.deepEqual(
        context,
        before
      );
    });

    assert.equal(
      generateCalls,
      0
    );
  }
);


test(
  'start rejects active and paused sessions without changing them',
  () => {

    let generateCalls =
      0;

    [
      COMBAT_SESSION_STATUSES.ACTIVE,
      COMBAT_SESSION_STATUSES.PAUSED
    ].forEach(status => {

      const session =
        createSession(
          status
        );

      const before =
        structuredClone(
          session
        );

      const result =
        startCombatSession(
          session,
          {
            participantIds: [
              'token:new'
            ],
            activeParticipantId:
              'token:new'
          },
          {
            generateId: () => {

              generateCalls += 1;

              return 'must-not-be-generated';
            }
          }
        );

      assert.equal(
        result.ok,
        false
      );

      assert.equal(
        result.reason,
        COMBAT_SESSION_LIFECYCLE_REASONS.INVALID_TRANSITION
      );

      assert.deepEqual(
        result.session,
        before
      );

      assert.deepEqual(
        session,
        before
      );
    });

    assert.equal(
      generateCalls,
      0
    );
  }
);


test(
  'pause changes only active session status',
  () => {

    const active =
      createSession(
        COMBAT_SESSION_STATUSES.ACTIVE
      );

    const before =
      structuredClone(
        active
      );

    const result =
      pauseCombatSession(
        active
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.operation,
      COMBAT_SESSION_LIFECYCLE_OPERATIONS.PAUSE
    );

    assert.deepEqual(
      result.session,
      {
        ...before,
        status:
          COMBAT_SESSION_STATUSES.PAUSED
      }
    );

    assert.deepEqual(
      active,
      before
    );
  }
);


test(
  'pause rejects inactive paused and finished states without mutation',
  () => {

    const cases =
      [
        null,
        createSession(
          COMBAT_SESSION_STATUSES.PAUSED
        ),
        createSession(
          COMBAT_SESSION_STATUSES.FINISHED
        )
      ];

    assertRejectedTransitions(
      cases,
      pauseCombatSession,
      COMBAT_SESSION_LIFECYCLE_OPERATIONS.PAUSE
    );
  }
);


test(
  'resume changes only paused session status',
  () => {

    const paused =
      createSession(
        COMBAT_SESSION_STATUSES.PAUSED
      );

    const before =
      structuredClone(
        paused
      );

    const result =
      resumeCombatSession(
        paused
      );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.operation,
      COMBAT_SESSION_LIFECYCLE_OPERATIONS.RESUME
    );

    assert.deepEqual(
      result.session,
      {
        ...before,
        status:
          COMBAT_SESSION_STATUSES.ACTIVE
      }
    );

    assert.deepEqual(
      paused,
      before
    );
  }
);


test(
  'resume rejects inactive active and finished states without mutation',
  () => {

    const cases =
      [
        null,
        createSession(
          COMBAT_SESSION_STATUSES.ACTIVE
        ),
        createSession(
          COMBAT_SESSION_STATUSES.FINISHED
        )
      ];

    assertRejectedTransitions(
      cases,
      resumeCombatSession,
      COMBAT_SESSION_LIFECYCLE_OPERATIONS.RESUME
    );
  }
);


test(
  'finish accepts active and paused sessions while preserving canonical state',
  () => {

    [
      COMBAT_SESSION_STATUSES.ACTIVE,
      COMBAT_SESSION_STATUSES.PAUSED
    ].forEach(status => {

      const session =
        createSession(
          status
        );

      const before =
        structuredClone(
          session
        );

      const result =
        finishCombatSession(
          session
        );

      assert.equal(
        result.ok,
        true
      );

      assert.equal(
        result.operation,
        COMBAT_SESSION_LIFECYCLE_OPERATIONS.FINISH
      );

      assert.deepEqual(
        result.session,
        {
          ...before,
          status:
            COMBAT_SESSION_STATUSES.FINISHED
        }
      );

      assert.deepEqual(
        session,
        before
      );
    });
  }
);


test(
  'finish rejects inactive and finished states without mutation',
  () => {

    const cases =
      [
        null,
        createSession(
          COMBAT_SESSION_STATUSES.INACTIVE
        ),
        createSession(
          COMBAT_SESSION_STATUSES.FINISHED
        )
      ];

    assertRejectedTransitions(
      cases,
      finishCombatSession,
      COMBAT_SESSION_LIFECYCLE_OPERATIONS.FINISH
    );
  }
);


test(
  'lifecycle paused and finished states remain compatible with Campaign Map persistence',
  () => {

    const started =
      startCombatSession(
        null,
        {
          participantIds: [
            'token:a',
            'token:b'
          ],
          activeParticipantId:
            'token:a'
        },
        {
          generateId: () =>
            'session-persisted-lifecycle'
        }
      );

    const paused =
      pauseCombatSession(
        started.session
      );

    const finished =
      finishCombatSession(
        paused.session
      );

    const pausedPayload =
      readCombatSessionAttribute(
        serializeCampaignMapModelHTML({
          title:
            'Paused Lifecycle',
          model:
            new CampaignMapModel({
              combatSession:
                paused.session
            })
        })
      );

    const finishedPayload =
      readCombatSessionAttribute(
        serializeCampaignMapModelHTML({
          title:
            'Finished Lifecycle',
          model:
            new CampaignMapModel({
              combatSession:
                finished.session
            })
        })
      );

    assert.equal(
      pausedPayload.status,
      COMBAT_SESSION_STATUSES.PAUSED
    );

    assert.equal(
      finishedPayload.status,
      COMBAT_SESSION_STATUSES.FINISHED
    );

    assert.equal(
      finishedPayload.sessionId,
      'session-persisted-lifecycle'
    );

    assert.deepEqual(
      finishedPayload.participants,
      started.session.participants
    );
  }
);


function createSession(
  status,
  overrides = {}
) {

  return new CombatSessionModel({
    sessionId:
      'session-existing',
    status,
    round:
      4,
    participants: [
      {
        participantId:
          'token:a',
        ready:
          true,
        delayed:
          false
      },
      {
        participantId:
          'token:b',
        ready:
          false,
        delayed:
          true
      }
    ],
    ...overrides
  }).toJSON();
}


function assertRejectedTransitions(
  sessions,
  operation,
  operationName
) {

  sessions.forEach(session => {

    const before =
      session === null
        ? null
        : structuredClone(
          session
        );

    const result =
      operation(
        session
      );

    assert.deepEqual(
      result,
      {
        ok:
          false,
        operation:
          operationName,
        reason:
          COMBAT_SESSION_LIFECYCLE_REASONS.INVALID_TRANSITION,
        session:
          statusIsInactive(
            before
          )
            ? null
            : before
      }
    );

    assert.deepEqual(
      session,
      before
    );
  });
}


function statusIsInactive(
  session
) {

  return session === null ||
    session.status === COMBAT_SESSION_STATUSES.INACTIVE;
}


function readCombatSessionAttribute(
  html
) {

  const match =
    html.match(
      /data-combat-session-state="([^"]+)"/
    );

  assert.ok(
    match
  );

  return JSON.parse(
    decodeURIComponent(
      match[1]
    )
  );
}
