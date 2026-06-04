import {
  getCharacterHealth,
  getCharacterInitiativeModifier,
  readCharacterModelFromPage
} from '../character/characterModel.js';

import {
  updatePageCharacterHealth
} from '../properties/characterCalculations.js';


// Мост карты к CharacterModel. Карта не должна сама разбирать HTML карточки:
// здесь она получает здоровье, модификатор инициативы и команду изменения HP.

export function getCampaignMapCharacterState(
  page
) {

  const model =
    readCharacterModelFromPage(
      page
    );

  if (model.source === 'empty') return null;

  return {
    model,
    health:
      getCharacterHealth(
        model
      ),
    initiativeModifier:
      getCharacterInitiativeModifier(
        model
      ),
    source:
      model.source
  };
}


export function getCampaignMapCharacterHealth(
  page
) {

  return getCampaignMapCharacterState(
    page
  )?.health || null;
}


export function getCampaignMapCharacterInitiativeModifier(
  page,
  fallback = 0
) {

  const state =
    getCampaignMapCharacterState(
      page
    );

  return state
    ? state.initiativeModifier
    : fallback;
}


export function updateCampaignMapCharacterHealth(
  page,
  options = {}
) {

  return updatePageCharacterHealth(
    page,
    options
  );
}
