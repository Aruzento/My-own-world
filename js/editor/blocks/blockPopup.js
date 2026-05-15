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
  getDefaultBlockTitle
} from './blockPopupViews.js';


let popupState = null;


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

  popup.innerHTML = `
    <div class="block-popup-title"></div>

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

  document.addEventListener(
    'click',
    event => {

      if (
        popup.classList.contains('hidden')
      ) return;

      if (
        popup.contains(event.target)
      ) return;

      if (
        event.target.closest('.add-block-btn, .block-delete-btn')
      ) return;

      closeBlockPopup();
    }
  );
}


export function openTypePicker(
  button,
  saveCurrentPage
) {

  const popup =
    getPopup();

  renderTypePicker(
    popup
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

  /* Таблице нужны дополнительные параметры, поэтому у неё отдельная форма. */
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

    block.remove();
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

  main.appendChild(
    block
  );

  applyBlockSystemContract(
    block
  );

  ensureBlockControls(
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

  main.appendChild(
    block
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

  popup.classList.remove(
    'hidden'
  );

  requestAnimationFrame(
    () => {
      positionPopupNearButton(
        popup,
        button
      );
    }
  );
}


function positionPopupNearButton(
  popup,
  button
) {

  const rect =
    button.getBoundingClientRect();

  const popupWidth =
    popup.offsetWidth || 260;

  const popupHeight =
    popup.offsetHeight || 260;

  const left =
    Math.min(
      rect.left,
      window.innerWidth - popupWidth - 12
    );

  let top =
    rect.bottom + 8;

  if (
    top + popupHeight > window.innerHeight - 12
  ) {

    top =
      rect.top - popupHeight - 8;
  }

  popup.style.left =
    `${Math.max(12, left)}px`;

  popup.style.top =
    `${Math.max(12, top)}px`;
}


function closeBlockPopup() {

  const popup =
    getPopup();

  if (popup) {

    popup.classList.add(
      'hidden'
    );
  }

  popupState =
    null;
}
