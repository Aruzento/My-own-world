import {
  CampaignMapInitiativeModel,
  createParticipantFromToken,
  isTokenAlive
} from './campaignMapInitiativeModel.js';

import {
  getCampaignMapStore
} from './campaignMapStore.js';

import {
  closeMapPopup,
  getMapPopup,
  showMapPopup
} from './campaignMapPopupController.js';


const INITIATIVE_TEXT = {
  title:
    '\u0418\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u0430',
  turnTitle:
    '\u0425\u043e\u0434\u044b',
  noCreatures:
    '\u041d\u0430 \u043a\u0430\u0440\u0442\u0435 \u043d\u0435\u0442 \u0436\u0438\u0432\u044b\u0445 \u0441\u0443\u0449\u0435\u0441\u0442\u0432',
  noParticipants:
    '\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438 \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d\u044b',
  activePrefix:
    '\u0425\u043e\u0434',
  noActive:
    '\u041d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0433\u043e \u0445\u043e\u0434\u0430',
  apply:
    '\u041d\u0430\u0447\u0430\u0442\u044c \u0431\u043e\u0439',
  saveOrder:
    '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u043f\u043e\u0440\u044f\u0434\u043e\u043a',
  rollAll:
    'Roll d20',
  edit:
    '\u0423\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u0438',
  close:
    '\u0417\u0430\u043a\u0440\u044b\u0442\u044c',
  previous:
    '\u041d\u0430\u0437\u0430\u0434',
  next:
    '\u0414\u0430\u043b\u044c\u0448\u0435',
  player:
    '\u0438\u0433\u0440\u043e\u043a',
  duplicate:
    '\u0434\u0443\u0431\u043b\u044c',
  initiative:
    '\u0418\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u0430',
  setActive:
    '\u0421\u0434\u0435\u043b\u0430\u0442\u044c \u0445\u043e\u0434\u043e\u043c'
};


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

  const initiative =
    new CampaignMapInitiativeModel(
      model.initiative
    );

  if (initiative.participants.length) {

    renderOrderPopup(
      popup,
      store,
      deps,
      anchor
    );

  } else {

    renderPickerPopup(
      popup,
      model
    );

    bindPickerActions(
      popup,
      store,
      deps,
      anchor
    );
  }

  showMapPopup(
    popup,
    anchor,
    'initiative'
  );
}


function renderPickerPopup(
  popup,
  model
) {

  popup.innerHTML =
    getPickerHTML();

  renderPickerList(
    popup,
    model
  );
}


function bindPickerActions(
  popup,
  store,
  deps,
  anchor
) {

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

        renderOrderPopup(
          popup,
          store,
          deps,
          anchor
        );
      }
    );

  popup
    .querySelector('.campaign-initiative-roll-btn')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();

        fillRolls(
          popup
        );
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
}


function renderPickerList(
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
      token.type === 'creature' &&
      isTokenAlive(
        token
      )
    );

  if (!tokens.length) {

    list.innerHTML =
      `<div class="campaign-initiative-empty">${INITIATIVE_TEXT.noCreatures}</div>`;

    return;
  }

  list.innerHTML =
    tokens
      .map(token => {

        const participantId =
          `token:${token.tokenId}`;

        return getPickerRowHTML(
          token,
          initiative.getParticipant(
            participantId
          ),
          {
            selected:
              selectedIds.size
                ? selectedIds.has(
                    token.tokenId
                  )
                : true
          }
        );
      })
      .join('');
}


function fillRolls(
  popup
) {

  popup
    .querySelectorAll('.campaign-initiative-row')
    .forEach(row => {

      const checkbox =
        row.querySelector('.campaign-initiative-checkbox');

      const input =
        row.querySelector('.campaign-initiative-value');

      const modifier =
        Number(
          input?.dataset.modifier || 0
        );

      if (!checkbox?.checked || !input) return;

      input.value =
        String(
          rollD20() + modifier
        );
    });
}


function applySelectedParticipants(
  popup,
  store
) {

  const previous =
    new CampaignMapInitiativeModel(
      store.getModel().initiative
    );

  const participants =
    [...popup.querySelectorAll('.campaign-initiative-row')]
      .map(row =>
        createParticipantFromRow(
          row,
          store.getModel(),
          previous
        )
      )
      .filter(Boolean);

  const initiative =
    new CampaignMapInitiativeModel({
      participants,
      activeParticipantId:
        getNextActiveParticipantId(
          previous.activeParticipantId,
          participants
        )
    });

  initiative.sortByInitiative();

  store.setInitiative(
    initiative.toJSON()
  );

  syncActiveTokenHighlights(
    store.map,
    initiative
  );

  return initiative;
}


function createParticipantFromRow(
  row,
  model,
  previous
) {

  const checkbox =
    row.querySelector('.campaign-initiative-checkbox');

  if (!checkbox?.checked) return null;

  const token =
    model.tokens.find(item =>
      item.tokenId === checkbox.value
    );

  if (!token) return null;

  const next =
    createParticipantFromToken(
      token
    );

  const existing =
    previous.getParticipant(
      next.participantId
    );

  const input =
    row.querySelector('.campaign-initiative-value');

  const total =
    normalizeNumber(
      input?.value,
      existing?.total ?? next.total
    );

  return {
    ...next,
    roll:
      total - next.modifier,
    total
  };
}


function renderOrderPopup(
  popup,
  store,
  deps,
  anchor
) {

  popup.innerHTML =
    getOrderHTML();

  renderOrderList(
    popup,
    store.getModel()
  );

  syncActiveTokenHighlights(
    store.map,
    new CampaignMapInitiativeModel(
      store.getModel().initiative
    )
  );

  bindOrderActions(
    popup,
    store,
    deps,
    anchor
  );
}


function bindOrderActions(
  popup,
  store,
  deps,
  anchor
) {

  popup
    .querySelector('.campaign-initiative-prev-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();

        shiftInitiativeTurn(
          popup,
          store,
          deps,
          anchor,
          -1
        );

        await deps.saveAndSync?.();
      }
    );

  popup
    .querySelector('.campaign-initiative-next-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();

        shiftInitiativeTurn(
          popup,
          store,
          deps,
          anchor,
          1
        );

        await deps.saveAndSync?.();
      }
    );

  popup
    .querySelector('.campaign-initiative-save-order-btn')
    .addEventListener(
      'click',
      async event => {

        event.preventDefault();

        saveOrderValues(
          popup,
          store,
          {
            sort:
              true
          }
        );

        renderOrderPopup(
          popup,
          store,
          deps,
          anchor
        );

        await deps.saveAndSync?.();
      }
    );

  bindOrderListActions(
    popup,
    store,
    deps,
    anchor
  );

  popup
    .querySelector('.campaign-initiative-edit-btn')
    .addEventListener(
      'click',
      event => {

        event.preventDefault();

        renderPickerPopup(
          popup,
          store.getModel()
        );

        bindPickerActions(
          popup,
          store,
          deps,
          anchor
        );
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
}


function renderOrderList(
  popup,
  model
) {

  const initiative =
    new CampaignMapInitiativeModel(
      model.initiative
    );

  renderActiveTurn(
    popup,
    initiative
  );

  const list =
    popup.querySelector('.campaign-initiative-order-list');

  if (!initiative.participants.length) {

    list.innerHTML =
      `<div class="campaign-initiative-empty">${INITIATIVE_TEXT.noParticipants}</div>`;

    return;
  }

  list.innerHTML =
    initiative.participants
      .map(participant =>
        getOrderRowHTML(
          participant,
          {
            active:
              initiative.activeParticipantId === participant.participantId
          }
        )
      )
      .join('');
}


function renderActiveTurn(
  popup,
  initiative
) {

  const label =
    popup.querySelector('.campaign-initiative-active');

  const active =
    initiative.getParticipant(
      initiative.activeParticipantId
    );

  if (!label) return;

  label.textContent =
    active
      ? `${INITIATIVE_TEXT.activePrefix}: ${active.name}`
      : INITIATIVE_TEXT.noActive;
}


function shiftInitiativeTurn(
  popup,
  store,
  deps,
  anchor,
  direction
) {

  saveOrderValues(
    popup,
    store
  );

  const initiative =
    new CampaignMapInitiativeModel(
      store.getModel().initiative
    );

  if (direction > 0) {

    initiative.nextTurn();

  } else {

    initiative.previousTurn();
  }

  store.setInitiative(
    initiative.toJSON()
  );

  syncActiveTokenHighlights(
    store.map,
    initiative
  );

  renderOrderPopup(
    popup,
    store,
    deps,
    anchor
  );
}


function bindOrderListActions(
  popup,
  store,
  deps,
  anchor
) {

  popup
    .querySelectorAll('.campaign-initiative-order-row')
    .forEach(row => {

      row.addEventListener(
        'click',
        async event => {

          if (
            event.target.closest(
              '.campaign-initiative-value'
            )
          ) return;

          event.preventDefault();

          saveOrderValues(
            popup,
            store
          );

          const initiative =
            new CampaignMapInitiativeModel(
              store.getModel().initiative
            );

          initiative.setActive(
            row.dataset.participantId
          );

          store.setInitiative(
            initiative.toJSON()
          );

          renderOrderPopup(
            popup,
            store,
            deps,
            anchor
          );

          await deps.saveAndSync?.();
        }
      );
    });

  popup
    .querySelectorAll('.campaign-initiative-order-row .campaign-initiative-value')
    .forEach(input => {

      input.addEventListener(
        'keydown',
        async event => {

          if (event.key !== 'Enter') return;

          event.preventDefault();

          saveOrderValues(
            popup,
            store,
            {
              sort:
                true
            }
          );

          renderOrderPopup(
            popup,
            store,
            deps,
            anchor
          );

          await deps.saveAndSync?.();
        }
      );
    });
}


function saveOrderValues(
  popup,
  store,
  options = {}
) {

  const initiative =
    new CampaignMapInitiativeModel(
      store.getModel().initiative
    );

  popup
    .querySelectorAll('.campaign-initiative-order-row')
    .forEach(row => {

      const participant =
        initiative.getParticipant(
          row.dataset.participantId
        );

      const input =
        row.querySelector('.campaign-initiative-value');

      if (!participant || !input) return;

      const total =
        normalizeNumber(
          input.value,
          participant.total
        );

      participant.total =
        total;

      participant.roll =
        total - participant.modifier;
    });

  if (options.sort) {

    initiative.sortByInitiative();
  }

  store.setInitiative(
    initiative.toJSON()
  );

  syncActiveTokenHighlights(
    store.map,
    initiative
  );

  return initiative;
}


function getNextActiveParticipantId(
  currentActiveId,
  participants
) {

  if (
    participants.some(participant =>
      participant.participantId === currentActiveId
    )
  ) {

    return currentActiveId;
  }

  return participants[0]?.participantId || '';
}


function getPickerHTML() {

  return `
    <div class="campaign-map-popup-title">${INITIATIVE_TEXT.title}</div>
    <div class="campaign-initiative-list"></div>
    <div class="campaign-map-popup-actions campaign-initiative-actions">
      <button class="campaign-initiative-save-btn" type="button">${INITIATIVE_TEXT.apply}</button>
      <button class="campaign-initiative-roll-btn" type="button">${INITIATIVE_TEXT.rollAll}</button>
      <button class="campaign-initiative-close-btn" type="button">${INITIATIVE_TEXT.close}</button>
    </div>
  `;
}


function getOrderHTML() {

  return `
    <div class="campaign-map-popup-title">${INITIATIVE_TEXT.turnTitle}</div>
    <div class="campaign-initiative-turn">
      <button class="campaign-initiative-prev-btn" type="button" title="${INITIATIVE_TEXT.previous}">&lsaquo;</button>
      <span class="campaign-initiative-active">${INITIATIVE_TEXT.noActive}</span>
      <button class="campaign-initiative-next-btn" type="button" title="${INITIATIVE_TEXT.next}">&rsaquo;</button>
    </div>
    <div class="campaign-initiative-order-list"></div>
    <div class="campaign-map-popup-actions campaign-initiative-actions campaign-initiative-order-actions">
      <button class="campaign-initiative-save-order-btn" type="button">${INITIATIVE_TEXT.saveOrder}</button>
      <button class="campaign-initiative-edit-btn" type="button">${INITIATIVE_TEXT.edit}</button>
      <button class="campaign-initiative-close-btn" type="button">${INITIATIVE_TEXT.close}</button>
    </div>
  `;
}


function getPickerRowHTML(
  token,
  participant,
  options = {}
) {

  const nextParticipant =
    participant ||
    createParticipantFromToken(
      token
    );

  return `
    <label class="campaign-initiative-row">
      <input
        class="campaign-initiative-checkbox"
        type="checkbox"
        value="${escapeAttribute(token.tokenId)}"
        ${options.selected ? 'checked' : ''}
      >
      <span class="campaign-initiative-name">${escapeHTML(nextParticipant.name)}</span>
      <span class="campaign-initiative-meta">${escapeHTML(getParticipantMetaText(nextParticipant))}</span>
      <input
        class="campaign-initiative-value"
        type="number"
        value="${escapeAttribute(getParticipantTotal(nextParticipant))}"
        data-modifier="${escapeAttribute(nextParticipant.modifier)}"
        title="${INITIATIVE_TEXT.initiative}"
      >
    </label>
  `;
}


function getOrderRowHTML(
  participant,
  options = {}
) {

  return `
    <div
      class="${getOrderRowClass(options)}"
      data-participant-id="${escapeAttribute(participant.participantId)}"
      title="${INITIATIVE_TEXT.setActive}"
    >
      <span class="campaign-initiative-name">${escapeHTML(participant.name)}</span>
      <span class="campaign-initiative-meta">${escapeHTML(getParticipantMetaText(participant))}</span>
      <input
        class="campaign-initiative-value"
        type="number"
        value="${escapeAttribute(participant.total)}"
        data-modifier="${escapeAttribute(participant.modifier)}"
        title="${INITIATIVE_TEXT.initiative}"
      >
      <span class="campaign-initiative-result">${escapeHTML(getParticipantResultText(participant))}</span>
    </div>
  `;
}


function getOrderRowClass(
  options
) {

  return [
    'campaign-initiative-row',
    'campaign-initiative-order-row',
    options.active
      ? 'is-active'
      : ''
  ]
    .filter(Boolean)
    .join(' ');
}


function getParticipantMetaText(
  participant
) {

  return participant.sourceMode === 'original'
    ? INITIATIVE_TEXT.player
    : INITIATIVE_TEXT.duplicate;
}


function getParticipantTotal(
  participant
) {

  return Number.isFinite(
    participant?.total
  )
    ? participant.total
    : '';
}


function getParticipantResultText(
  participant
) {

  const modifier =
    participant.modifier >= 0
      ? `+${participant.modifier}`
      : String(participant.modifier);

  return `${participant.roll}${modifier}`;
}


function syncActiveTokenHighlights(
  map,
  initiative
) {

  map
    ?.querySelectorAll('.campaign-map-token[data-initiative-active="true"]')
    .forEach(token => {

      delete token.dataset.initiativeActive;

      token.classList.remove(
        'is-initiative-active'
      );
    });

  const active =
    initiative.getParticipant(
      initiative.activeParticipantId
    );

  if (!active?.tokenId) return;

  const token =
    map?.querySelector(
      `.campaign-map-token[data-token-id="${CSS.escape(active.tokenId)}"]`
    );

  if (!token) return;

  token.dataset.initiativeActive =
    'true';

  token.classList.add(
    'is-initiative-active'
  );
}


function rollD20() {

  return Math.floor(
    Math.random() * 20
  ) + 1;
}


function normalizeNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
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
