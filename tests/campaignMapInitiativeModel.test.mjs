import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CampaignMapInitiativeModel,
  createParticipantFromToken,
  isTokenAlive,
  rollD20,
  syncInitiativeParticipantsWithTokens
} from '../js/editor/campaignMapInitiativeModel.js';


test(
  'InitiativeModel создает участников из живых токенов карты',
  () => {

    const model =
      CampaignMapInitiativeModel.fromTokens([
        {
          tokenId: 'hero',
          pageId: 'page-hero',
          sourceMode: 'original',
          name: 'Герой',
          hp: 10,
          initiativeModifier: 3
        },
        {
          tokenId: 'dead',
          name: 'Павший',
          hp: 0
        }
      ]);

    assert.deepEqual(
      model.toJSON().participants.map(participant => ({
        participantId:
          participant.participantId,
        sourceMode:
          participant.sourceMode,
        modifier:
          participant.modifier
      })),
      [
        {
          participantId: 'token:hero',
          sourceMode: 'original',
          modifier: 3
        }
      ]
    );
  }
);


test(
  'InitiativeModel бросает d20, сортирует и переключает активный ход',
  () => {

    const model =
      new CampaignMapInitiativeModel({
        participants: [
          {
            participantId: 'a',
            name: 'А',
            modifier: 1
          },
          {
            participantId: 'b',
            name: 'Б',
            modifier: 5
          }
        ]
      });

    model.rollParticipant(
      'a',
      19
    );

    model.rollParticipant(
      'b',
      10
    );

    model.sortByInitiative();

    assert.deepEqual(
      model.toJSON().participants.map(participant => [
        participant.participantId,
        participant.total
      ]),
      [
        ['a', 20],
        ['b', 15]
      ]
    );

    model.setActive(
      'a'
    );

    assert.equal(
      model.nextTurn().participantId,
      'b'
    );

    assert.equal(
      model.previousTurn().participantId,
      'a'
    );
  }
);


test(
  'Initiative helpers учитывают hp и deterministic roll',
  () => {

    assert.equal(
      isTokenAlive({
        hp: 1
      }),
      true
    );

    assert.equal(
      isTokenAlive({
        hp: 0
      }),
      false
    );

    assert.equal(
      rollD20(
        () => 0
      ),
      1
    );

    assert.equal(
      rollD20(
        () => 0.999
      ),
      20
    );

    assert.equal(
      createParticipantFromToken({
        tokenId: 'player',
        sourceMode: 'original',
        name: 'Игрок'
      }).sourceMode,
      'original'
    );
  }
);


test(
  'InitiativeModel refreshes existing token participants from current token snapshots',
  () => {

    const result =
      syncInitiativeParticipantsWithTokens(
        {
          participants: [
            {
              participantId: 'token:hero',
              tokenId: 'hero',
              pageId: 'old-page',
              sourceMode: 'copy',
              name: 'Old Hero',
              modifier: 2,
              roll: 10,
              total: 12,
              isAlive: true
            }
          ],
          activeParticipantId: 'token:hero'
        },
        [
          {
            tokenId: 'hero',
            pageId: 'new-page',
            sourceMode: 'original',
            name: 'New Hero',
            hp: 7,
            initiativeModifier: 6
          }
        ]
      );

    assert.equal(
      result.changed,
      true
    );

    assert.deepEqual(
      result.initiative.participants[0],
      {
        participantId: 'token:hero',
        tokenId: 'hero',
        pageId: 'new-page',
        sourceMode: 'original',
        name: 'New Hero',
        modifier: 6,
        roll: 10,
        total: 16,
        isAlive: true
      }
    );

    assert.equal(
      result.initiative.activeParticipantId,
      'token:hero'
    );
  }
);
