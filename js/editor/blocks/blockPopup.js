import {
  createTypedBlock
} from './blockFactory.js';

import {
  ensureBlockControls
} from './blockControls.js';

import {
  applyBlockSystemContract
} from './blockContract.js';

import {
  renderTypePicker,
  renderDeletePrompt,
  renderNameForm,
  renderTableForm,
  getBlockPopupTitle,
  getDefaultBlockTitle,
  isVisibleBlockTypeForCardType
} from './blockPopupViews.js';

import {
  openPopupNearAnchor,
  registerPopup
} from '../../ui/popupManager.js';

import {
  runHistoryTransaction
} from '../editorHistory.js';

import {
  state
} from '../../state.js';

import {
  renderCharacterEffectsBlocks
} from '../characterEffectsBlock.js';

import {
  renderCharacterSheetBlocks
} from '../characterSheetBlock.js';


let popupState = null;
let activeAnchor = null;
let blockPopupController = null;
const popupAnchors = [];


export function setupBlockPopup() {

  if (
    document.getElementById('blockPopup')
  ) return;

  const popup =
    document.createElement('div');

  popup.id =
    'blockPopup';

  popup.className =
    'block-popup hidden';

  popup.setAttribute(
    'aria-labelledby',
    'blockPopupTitle'
  );

  popup.innerHTML = `
    <div class="block-popup-title" id="blockPopupTitle"></div>

    <div class="block-popup-body"></div>

    <div class="block-popup-actions">
      <button class="block-popup-cancel" type="button">Отмена</button>
      <button class="block-popup-confirm" type="button">Ок</button>
    </div>
  `;

  document.body.appendChild(
    popup
  );

  popup
    .querySelector('.block-popup-cancel')
    .addEventListener(
      'click',
      closeBlockPopup
    );

  popup
    .querySelector('.block-popup-confirm')
    .addEventListener(
      'click',
      applyPopupAction
    );

  blockPopupController =
    registerPopup({
    popup,
    close: hideBlockPopup,
    anchors: popupAnchors,
    key: 'block-popup',
    kind: 'dialog',
    modal: true
  });
}


export function openTypePicker(
  button,
  saveCurrentPage
) {

  const popup =
    getPopup();

  if (
    activeAnchor === button &&
    !popup.classList.contains('hidden') &&
    !popupState
  ) {

    closeBlockPopup();

    return;
  }

  renderTypePicker(
    popup,
    getCurrentCardType(
      button
    )
  );

  popup
    .querySelectorAll('.block-type-option')
    .forEach(option => {

      option.addEventListener(
        'click',
        event => {

          event.preventDefault();
          event.stopPropagation();

          openAddBlockPopup({
            type: option.dataset.blockType,
            button,
            saveCurrentPage
          });
        }
      );
    });

  popupState =
    null;

  showPopupNearButton(
    popup,
    button
  );
}


export function openDeletePopup(
  button,
  saveCurrentPage
) {

  const popup =
    getPopup();

  if (
    activeAnchor === button &&
    !popup.classList.contains('hidden') &&
    popupState?.mode === 'delete'
  ) {

    closeBlockPopup();

    return;
  }

  renderDeletePrompt(
    popup
  );

  popupState = {
    mode: 'delete',
    button,
    saveCurrentPage
  };

  showPopupNearButton(
    popup,
    button
  );
}


function openAddBlockPopup({
  type,
  button,
  saveCurrentPage
}) {

  const cardType =
    getCurrentCardType(
      button
    );

  if (
    !isVisibleBlockTypeForCardType(
      type,
      cardType
    )
  ) {

    closeBlockPopup();

    return;
  }

  if (type === 'image') {

    addImageBlock(
      button,
      saveCurrentPage
    );

    closeBlockPopup();

    return;
  }

  if (type === 'properties') {

    addPropertiesBlock(
      button,
      saveCurrentPage,
      cardType
    );

    closeBlockPopup();

    return;
  }

  /* Таблице нужны дополнительные параметры, поэтому у нее отдельная форма. */
  if (type === 'table') {

    openTableConfigPopup({
      button,
      saveCurrentPage
    });

    return;
  }

  openFormPopup({
    title: getBlockPopupTitle(type),
    inputValue: getDefaultBlockTitle(type),
    confirmText: 'Добавить',
    button,
    state: {
      mode: 'add',
      type,
      button,
      saveCurrentPage
    }
  });
}


function openFormPopup({
  title,
  inputValue,
  confirmText,
  button,
  state
}) {

  const popup =
    getPopup();

  const input =
    renderNameForm({
      popup,
      title,
      inputValue,
      confirmText
    });

  popupState =
    state;

  showPopupNearButton(
    popup,
    button
  );

  input.focus();
  input.select();
}


function openTableConfigPopup({
  button,
  saveCurrentPage
}) {

  const popup =
    getPopup();

  const titleInput =
    renderTableForm(
      popup
    );

  popupState = {
    mode: 'addTable',
    button,
    saveCurrentPage
  };

  showPopupNearButton(
    popup,
    button
  );

  titleInput?.focus();
}


async function applyPopupAction() {

  if (!popupState) return;

  const popup =
    getPopup();

  const {
    mode,
    button,
    saveCurrentPage
  } = popupState;

  if (mode === 'delete') {

    const block =
      button.closest('.template-block');

    if (!block) return;

    runHistoryTransaction(
      document.getElementById('editorArea'),
      'Удаление блока',
      () => block.remove()
    );

    saveCurrentPage();
    closeBlockPopup();
    return;
  }

  if (mode === 'addTable') {

    addConfiguredTable(
      popup,
      button,
      saveCurrentPage
    );

    closeBlockPopup();
    return;
  }

  if (mode === 'add') {

    addNamedBlock(
      popup,
      popupState,
      saveCurrentPage
    );
  }

  closeBlockPopup();
}


function addPropertiesBlock(
  button,
  saveCurrentPage,
  cardType
) {

  const main =
    button.closest('.entity-main');

  if (!main) return;

  const block =
    createTypedBlock(
      'properties',
      'Свойства',
      {
        cardType
      }
    );

  runHistoryTransaction(
    document.getElementById('editorArea'),
    `Добавление блока свойств ${cardType}`,
    () => {

      main.appendChild(
        block
      );
    }
  );

  applyBlockSystemContract(
    block
  );

  ensureBlockControls(
    block
  );

  saveCurrentPage();
}


function addImageBlock(
  button,
  saveCurrentPage
) {

  const main =
    button.closest('.entity-main');

  if (!main) return;

  const block =
    createTypedBlock(
      'image',
      ''
    );

  runHistoryTransaction(
    document.getElementById('editorArea'),
    'Добавление блока картинки',
    () => {

      main.appendChild(
        block
      );
    }
  );

  applyBlockSystemContract(
    block
  );

  ensureBlockControls(
    block
  );

  saveCurrentPage();
}


function addNamedBlock(
  popup,
  state,
  saveCurrentPage
) {

  const value =
    popup
      .querySelector('.block-popup-input')
      ?.value
      .trim();

  if (!value) return;

  const main =
    state.button.closest('.entity-main');

  if (!main) return;

  const block =
    createTypedBlock(
      state.type,
      value
    );

  runHistoryTransaction(
    document.getElementById('editorArea'),
    `Добавление блока ${state.type}`,
    () => {

      main.appendChild(
        block
      );
    }
  );

  applyBlockSystemContract(
    block
  );

  ensureBlockControls(
    block
  );

  renderCharacterEffectsBlocks(
    block
  );

  renderCharacterSheetBlocks(
    block
  );

  saveCurrentPage();
}


function addConfiguredTable(
  popup,
  button,
  saveCurrentPage
) {

  const title =
    popup
      .querySelector('.table-title-input')
      ?.value
      .trim() || 'Таблица';

  const columns =
    popup
      .querySelector('.table-columns-input')
      ?.value || 3;

  const rows =
    popup
      .querySelector('.table-rows-input')
      ?.value || 3;

  const main =
    button.closest('.entity-main');

  if (!main) return;

  const block =
    createTypedBlock(
      'table',
      title,
      {
        rows,
        columns
      }
    );

  runHistoryTransaction(
    document.getElementById('editorArea'),
    'Добавление таблицы',
    () => {

      main.appendChild(
        block
      );
    }
  );

  applyBlockSystemContract(
    block
  );

  ensureBlockControls(
    block
  );

  saveCurrentPage();
}


function getPopup() {

  return document.getElementById(
    'blockPopup'
  );
}


function showPopupNearButton(
  popup,
  button
) {

  activeAnchor =
    button;

  popupAnchors.splice(
    0,
    popupAnchors.length,
    button
  );

  openPopupNearAnchor(
    popup,
    button,
    {
      fallbackWidth: 300,
      fallbackHeight: 320
    }
  );
}


function getCurrentCardType(
  anchor
) {

  return anchor
    ?.closest('.card-shell')
    ?.querySelector('.card-type-select')
    ?.value ||
    state.currentPage?.type ||
    'note';
}


function closeBlockPopup() {

  if (blockPopupController) {

    blockPopupController.close();

    return;
  }

  hideBlockPopup();
}


function hideBlockPopup() {

  const popup =
    getPopup();

  if (popup) {

    popup.classList.add(
      'hidden'
    );
  }

  popupState =
    null;

  activeAnchor =
    null;

  popupAnchors.splice(
    0,
    popupAnchors.length
  );
}
