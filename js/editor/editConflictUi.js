import {
  parsePageRecordContent
} from '../core/pageRecord.js';

import {
  readCurrentDurablePageContent
} from '../storage/pageWritePreconditions.js';

import {
  registerPopup
} from '../ui/popupManager.js';

import {
  setSaveStatus
} from '../ui/ui.js';


const CONFLICT_DIALOG_TITLE_ID =
  'editConflictDialogTitle';

const CONFLICT_DIALOG_DESCRIPTION_ID =
  'editConflictDialogDescription';

const activeConflictKeys =
  new Map();

const popupAnchors =
  [];

let popup =
  null;

let popupController =
  null;

let activeConflict =
  null;


export function handleEditorSaveConflictResult(
  result,
  options = {}
) {

  if (!result?.conflict) return false;

  const page =
    options.page || result.page || null;

  const editor =
    options.editor || null;

  setSaveStatus(
    'conflict',
    'Сохранение остановлено: страница изменилась после того, как вы её открыли.'
  );

  const conflictKey =
    createConflictKey(
      result,
      page
    );

  const pageId =
    getConflictPageId(
      result,
      page
    );

  if (
    pageId &&
    activeConflictKeys.get(pageId) === conflictKey
  ) {

    return true;
  }

  if (pageId) {

    activeConflictKeys.set(
      pageId,
      conflictKey
    );
  }

  openEditConflictDialog({
    result,
    page,
    editor,
    conflictKey
  });

  return true;
}


export function clearEditorSaveConflictState(
  pageId = null
) {

  if (pageId) {

    activeConflictKeys.delete(
      pageId
    );

    if (
      activeConflict?.pageId === pageId
    ) {

      activeConflict =
        null;
    }

    return;
  }

  activeConflictKeys.clear();

  activeConflict =
    null;
}


function openEditConflictDialog({
  result,
  page,
  editor,
  conflictKey
}) {

  const element =
    getEditConflictDialog();

  activeConflict =
    {
      result,
      page,
      pageId:
        getConflictPageId(
          result,
          page
        ),
      conflictKey
    };

  resetCurrentVersionPreview(
    element
  );

  updatePopupAnchors(
    editor
  );

  popupController.open();
}


function closeEditConflictDialog() {

  if (!popup) return;

  popup.classList.add(
    'hidden'
  );
}


function closeEditConflictDialogWithFocusRestore() {

  popupController?.close();
}


function getEditConflictDialog() {

  if (popup) return popup;

  popup =
    document.createElement(
      'div'
    );

  popup.className =
    'edit-conflict-dialog hidden';

  popup.setAttribute(
    'aria-labelledby',
    CONFLICT_DIALOG_TITLE_ID
  );

  popup.setAttribute(
    'aria-describedby',
    CONFLICT_DIALOG_DESCRIPTION_ID
  );

  popup.innerHTML = `
    <div class="edit-conflict-dialog__eyebrow">Сохранение остановлено</div>
    <h2 id="${CONFLICT_DIALOG_TITLE_ID}" class="edit-conflict-dialog__title">
      Страница изменилась после того, как вы её открыли
    </h2>
    <div id="${CONFLICT_DIALOG_DESCRIPTION_ID}" class="edit-conflict-dialog__body">
      <p>
        Ваши текущие изменения не были записаны поверх новой версии.
      </p>
      <ul class="edit-conflict-dialog__facts">
        <li>Новая сохранённая версия осталась без изменений.</li>
        <li>Ваш черновик всё ещё открыт в редакторе.</li>
        <li>Выберите безопасное действие, чтобы продолжить.</li>
      </ul>
    </div>
    <section
      class="edit-conflict-dialog__current hidden"
      data-edit-conflict-current
      aria-live="polite"
    >
      <div class="edit-conflict-dialog__current-kicker">
        Актуальная сохранённая версия
      </div>
      <div class="edit-conflict-dialog__current-title" data-edit-conflict-current-title>
        Без названия
      </div>
      <p class="edit-conflict-dialog__current-excerpt" data-edit-conflict-current-excerpt>
      </p>
    </section>
    <div class="edit-conflict-dialog__actions">
      <button class="edit-conflict-dialog__secondary" type="button" data-edit-conflict-view-current>
        Посмотреть актуальную версию
      </button>
      <button
        class="edit-conflict-dialog__primary"
        type="button"
        data-edit-conflict-return
        data-overlay-autofocus="true"
      >
        Вернуться к своим изменениям
      </button>
    </div>
  `;

  document.body.appendChild(
    popup
  );

  popup
    .querySelector('[data-edit-conflict-return]')
    .addEventListener(
      'click',
      closeEditConflictDialogWithFocusRestore
    );

  popup
    .querySelector('[data-edit-conflict-view-current]')
    .addEventListener(
      'click',
      () => {

        void showCurrentDurableVersion();
      }
    );

  popupController =
    registerPopup({
      popup,
      anchors:
        popupAnchors,
      key:
        'edit-conflict-dialog',
      modal:
        true,
      close:
        closeEditConflictDialog
    });

  return popup;
}


async function showCurrentDurableVersion() {

  const element =
    getEditConflictDialog();

  const section =
    element.querySelector(
      '[data-edit-conflict-current]'
    );

  const title =
    element.querySelector(
      '[data-edit-conflict-current-title]'
    );

  const excerpt =
    element.querySelector(
      '[data-edit-conflict-current-excerpt]'
    );

  section.classList.remove(
    'hidden'
  );

  title.textContent =
    'Загрузка...';

  excerpt.textContent =
    '';

  try {

    const content =
      await readCurrentDurablePageContent(
        activeConflict?.page
      );

    const parsed =
      parsePageRecordContent(
        content || '',
        {
          generateId:
            false
        }
      );

    title.textContent =
      parsed.title || 'Без названия';

    excerpt.textContent =
      createReadableExcerpt(
        parsed.body || parsed.rawBody || ''
      ) ||
      'В актуальной версии нет текстового фрагмента для показа.';

  } catch {

    title.textContent =
      'Не удалось прочитать актуальную версию';

    excerpt.textContent =
      'Попробуйте открыть страницу заново после сохранения черновика в безопасном месте.';
  }
}


function resetCurrentVersionPreview(
  element
) {

  const section =
    element.querySelector(
      '[data-edit-conflict-current]'
    );

  const title =
    element.querySelector(
      '[data-edit-conflict-current-title]'
    );

  const excerpt =
    element.querySelector(
      '[data-edit-conflict-current-excerpt]'
    );

  section.classList.add(
    'hidden'
  );

  title.textContent =
    'Без названия';

  excerpt.textContent =
    '';
}


function updatePopupAnchors(
  editor
) {

  popupAnchors.splice(
    0,
    popupAnchors.length
  );

  const activeElement =
    document.activeElement;

  if (
    activeElement &&
    activeElement !== document.body &&
    editor?.contains?.(activeElement)
  ) {

    popupAnchors.push(
      activeElement
    );

    return;
  }

  const editable =
    editor?.querySelector?.(
      '[contenteditable="true"], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );

  if (editable) {

    popupAnchors.push(
      editable
    );
  }
}


function createConflictKey(
  result,
  page
) {

  const evidence =
    result.conflictEvidence || {};

  return [
    getConflictPageId(
      result,
      page
    ),
    evidence.operationKind || result.reason || '',
    evidence.expectedBase?.stateHash || evidence.expectedBase?.metadataHash || '',
    evidence.currentBase?.stateHash || evidence.currentBase?.metadataHash || ''
  ].join(
    ':'
  );
}


function getConflictPageId(
  result,
  page
) {

  return result?.conflictEvidence?.pageId ||
    result?.precondition?.currentBase?.pageId ||
    result?.precondition?.expectedBase?.pageId ||
    page?.id ||
    '';
}


function createReadableExcerpt(
  body
) {

  const template =
    document.createElement(
      'template'
    );

  template.innerHTML =
    String(
      body || ''
    );

  return (
    template.content.textContent || ''
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(
      0,
      420
    );
}
