import {
  getCharacterEffectiveArmorClass,
  getCharacterEffectiveSpeed,
  getCharacterEffectsCombatSummary,
  getCharacterHealth,
  getCharacterInitiativeModifier,
  readCharacterModelFromPage
} from '../character/characterModel.js';

import {
  updatePageCharacterHealth
} from '../properties/characterCalculations.js';

import {
  state
} from '../state.js';


// Мост карты к CharacterModel. Карта не должна сама разбирать HTML карточки:
// здесь она получает здоровье, модификатор инициативы и команду изменения HP.

export function getCampaignMapCharacterState(
  page
) {

  const model =
    readCharacterModelFromPage(
      page,
      {
        pages:
          state.pages
      }
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
    armorClass:
      getCharacterEffectiveArmorClass(
        model
      ),
    speed:
      getCharacterEffectiveSpeed(
        model
      ),
    effects:
      getCharacterEffectsCombatSummary(
        model
      ),
    source:
      model.source
  };
}


export function createCampaignMapCharacterTokenSnapshot(
  page
) {

  const characterState =
    getCampaignMapCharacterState(
      page
    );

  if (!characterState) return null;

  const health =
    characterState.health || null;

  const effects =
    characterState.effects || {};

  const conditionLabels =
    effects.conditionLabels || [];

  const effectTitles =
    effects.effectTitles || [];

  const flags =
    effects.flags || {};

  return {
    hp:
      health?.current ?? '',
    hpMax:
      health?.max ?? '',
    hpTemp:
      health?.temp ?? '',
    initiativeModifier:
      characterState.initiativeModifier,
    armorClass:
      characterState.armorClass ?? '',
    speed:
      characterState.speed ?? '',
    conditionCount:
      conditionLabels.length,
    effectCount:
      effectTitles.length,
    effectsSummary:
      [
        ...conditionLabels,
        ...effectTitles
      ].join(', '),
    incapacitated:
      Boolean(flags.isIncapacitated),
    speedZero:
      Boolean(flags.speedIsZero)
  };
}


export function getCampaignMapCharacterEffects(
  page
) {

  return getCampaignMapCharacterState(
    page
  )?.effects || null;
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
