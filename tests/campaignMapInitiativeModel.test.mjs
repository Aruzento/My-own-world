import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CampaignMapInitiativeModel,
  createParticipantFromToken,
  isTokenAlive,
  rollD20
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
