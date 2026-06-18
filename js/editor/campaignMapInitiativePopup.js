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

// Popup инициативы разделен на выбор/ввод значений и отдельное окно порядка ходов.
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
      token.type === 'creature'
    );

  if (!tokens.length) {

    list.innerHTML =
      '<div class="campaign-initiative-empty">На карте нет существ для инициативы</div>';

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
              selectedIds.has(
                token.tokenId
              )
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

  bindOrderRowActions(
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
      '<div class="campaign-initiative-empty">Участники не выбраны</div>';

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
      ? `Ход: ${active.name}`
      : 'Нет активного хода';
}

function shiftInitiativeTurn(
  popup,
  store,
  deps,
  anchor,
  direction
) {

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

  renderOrderList(
    popup,
    store.getModel()
  );

  bindOrderRowActions(
    popup,
    store,
    deps,
    anchor
  );
}


function bindOrderRowActions(
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

          event.preventDefault();

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

          renderOrderList(
            popup,
            store.getModel()
          );

          syncActiveTokenHighlights(
            store.map,
            initiative
          );

          bindOrderActions(
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
    <div class="campaign-map-popup-title">Инициатива</div>
    <div class="campaign-initiative-list"></div>
    <div class="campaign-map-popup-actions campaign-initiative-actions">
      <button class="campaign-initiative-save-btn" type="button">Применить</button>
      <button class="campaign-initiative-roll-btn" type="button">Roll d20</button>
      <button class="campaign-initiative-close-btn" type="button">Закрыть</button>
    </div>
  `;
}

function getOrderHTML() {

  return `
    <div class="campaign-map-popup-title">Порядок ходов</div>
    <div class="campaign-initiative-turn">
      <button class="campaign-initiative-prev-btn" type="button">←</button>
      <span class="campaign-initiative-active">Нет активного хода</span>
      <button class="campaign-initiative-next-btn" type="button">→</button>
    </div>
    <div class="campaign-initiative-order-list"></div>
    <div class="campaign-map-popup-actions campaign-initiative-actions">
      <button class="campaign-initiative-edit-btn" type="button">Изменить</button>
      <button class="campaign-initiative-close-btn" type="button">Закрыть</button>
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
        title="Инициатива"
      >
    </label>
  `;
}

function getOrderRowHTML(
  participant,
  options = {}
) {

  return `
    <div class="${getOrderRowClass(options)}" data-participant-id="${escapeAttribute(participant.participantId)}">
      <span class="campaign-initiative-name">${escapeHTML(participant.name)}</span>
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
    ? 'игрок'
    : 'дубль';
}

function getParticipantTotal(
  participant
) {

  return participant?.total || '';
}

function getParticipantResultText(
  participant
) {

  const modifier =
    participant.modifier >= 0
      ? `+${participant.modifier}`
      : String(participant.modifier);

  return `${participant.total} (${participant.roll}${modifier})`;
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
