import { state } from '../../state.js';


// Расчеты переменных пока MVP: персонаж может выбрать расу, а расчетная
// характеристика складывает базовое значение персонажа и бонус из карточки расы.

export function calculateVariableValue(
  block,
  definition
) {

  if (
    definition?.type !== 'calculation'
  ) return '';

  const ability =
    definition.ability;

  const base =
    getLocalAbilityValue(
      block,
      ability
    );

  const raceBonus =
    getLinkedPageVariableValue(
      block,
      'race',
      ability
    );

  return String(
    base + raceBonus
  );
}


export function getVariableValueFromHTML(
  html,
  key
) {

  if (!html || !key) return '';

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    html;

  const row =
    wrapper.querySelector(
      `.variable-row[data-variable-key="${key}"]`
    );

  if (!row) return '';

  return row.dataset.value ||
    row.querySelector('.variable-input')?.value ||
    '';
}


function getLocalAbilityValue(
  block,
  ability
) {

  const ownValue =
    getVariableValue(
      block,
      ability
    );

  if (ownValue !== '') {

    return numberOrZero(
      ownValue
    );
  }

  return getLegacyDndStatValue(
    ability
  );
}


function getLinkedPageVariableValue(
  block,
  linkKey,
  variableKey
) {

  const pageId =
    getVariableValue(
      block,
      linkKey
    );

  const page =
    state.pages.find(candidate =>
      candidate.id === pageId
    );

  if (!page) return 0;

  return numberOrZero(
    getVariableValueFromHTML(
      page.content,
      variableKey
    )
  );
}


function getVariableValue(
  block,
  key
) {

  const row =
    block.querySelector(
      `.variable-row[data-variable-key="${key}"]`
    );

  if (!row) return '';

  return row.dataset.value ||
    row.querySelector('.variable-input')?.value ||
    '';
}


function getLegacyDndStatValue(
  ability
) {

  const oldStat =
    document.querySelector(
      `.dnd-stat-row[data-stat="${ability}"] .dnd-stat-score`
    );

  if (oldStat) {

    return numberOrZero(
      oldStat.value
    );
  }

  const v2Stat =
    document.querySelector(
      `.dnd2-ability-card[data-ability="${ability}"] .dnd2-ability-score`
    );

  return numberOrZero(
    v2Stat?.value
  );
}


function numberOrZero(
  value
) {

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}
