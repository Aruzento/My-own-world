import {
  CampaignMapInitiativeModel,
  createParticipantFromToken
} from './campaignMapInitiativeModel.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  closeMapPopup,
  getMapPopup,
  showMapPopup
} from './campaignMapPopupController.js';

import {
  getInitiativePopupHTML
} from './campaignMapToolbar.js';


// Popup инициативы остается тонким UI над CampaignMapInitiativeModel.
export function openInitiativePopup(
  map,
  anchor,
  deps = {}
) {

  const store =
    getCampaignMapStore(
      map
    );

  const model =
    store?.getModel();

  if (!store || !model) return;

  const popup =
    getMapPopup();

  popup.innerHTML =
    getInitiativePopupHTML();

  renderInitiativeList(
    popup,
    model
  );

  popup
    .querySelector('.campaign-initiative-save-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();

        applySelectedParticipants(
          popup,
          store
        );

        await deps.saveAndSync?.();
      }
    );

  popup
    .querySelector('.campaign-initiative-roll-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();

        const initiative =
          applySelectedParticipants(
            popup,
            store
          );

        initiative.rollAll();

        store.setInitiative(
          initiative.toJSON()
        );

        renderInitiativeList(
          popup,
          store.getModel()
        );

        await deps.saveAndSync?.();
      }
    );

  popup
    .querySelector('.campaign-initiative-close-btn')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();
        closeMapPopup();
      }
    );

  showMapPopup(
    popup,
    anchor,
    'initiative'
  );
}


function renderInitiativeList(
  popup,
  model
) {

  const list =
    popup.querySelector('.campaign-initiative-list');

  const initiative =
    new CampaignMapInitiativeModel(
      model.initiative
    );

  const selectedIds =
    new Set(
      initiative.participants.map(participant =>
        participant.tokenId
      )
    );

  const tokens =
    model.tokens.filter(token =>
      token.type === 'creature'
    );

  if (!tokens.length) {

    list.innerHTML =
      '<div class="campaign-initiative-empty">На карте нет существ для инициативы</div>';

    return;
  }

  list.innerHTML =
    tokens
      .map(token =>
        getTokenRowHTML(
          token,
          selectedIds.has(
            token.tokenId
          )
        )
      )
      .join('');
}


function applySelectedParticipants(
  popup,
  store
) {

  const model =
    store.getModel();

  const selectedTokenIds =
    new Set(
      [...popup.querySelectorAll('.campaign-initiative-checkbox:checked')]
        .map(input =>
          input.value
        )
    );

  const initiative =
    new CampaignMapInitiativeModel({
      participants:
        model.tokens
          .filter(token =>
            selectedTokenIds.has(
              token.tokenId
            )
          )
          .map(createParticipantFromToken)
    });

  store.setInitiative(
    initiative.toJSON()
  );

  return initiative;
}


function getTokenRowHTML(
  token,
  isSelected
) {

  const participant =
    createParticipantFromToken(
      token
    );

  return `
    <label class="campaign-initiative-row">
      <input
        class="campaign-initiative-checkbox"
        type="checkbox"
        value="${escapeAttribute(token.tokenId)}"
        ${isSelected ? 'checked' : ''}
      >
      <span class="campaign-initiative-name">${escapeHTML(participant.name)}</span>
      <span class="campaign-initiative-meta">${participant.sourceMode === 'original' ? 'игрок' : 'дубль'}</span>
    </label>
  `;
}


function escapeHTML(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}


function escapeAttribute(
  value
) {

  return escapeHTML(
    value
  )
    .replaceAll('"', '&quot;');
}
