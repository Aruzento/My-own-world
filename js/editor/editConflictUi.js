import {
  parsePageRecordContent
} from '../core/pageRecord.js';

import {
  getPageById,
  notifyPageUpdated
} from '../repository/pageRepository.js';

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

const recoveryConfig =
  {
    reloadCurrentPage:
      null
  };

let popup =
  null;

let popupController =
  null;

let activeConflict =
  null;


export function setupEditorConflictRecovery(
  config = {}
) {

  if (
    typeof config.reloadCurrentPage === 'function'
  ) {

    recoveryConfig.reloadCurrentPage =
      config.reloadCurrentPage;
  }
}


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

  const nextConflict =
    createActiveConflict({
      result,
      page,
      editor,
      conflictKey,
      source:
        options.source || 'manual',
      mineContent:
        options.mineContent
    });

  activeConflict =
    nextConflict;

  const isEquivalentConflict =
    pageId &&
    activeConflictKeys.get(pageId) === conflictKey;

  if (
    isEquivalentConflict &&
    nextConflict.source === 'autosave'
  ) {

    return true;
  }

  if (pageId) {

    activeConflictKeys.set(
      pageId,
      conflictKey
    );
  }

  openEditConflictDialog(
    nextConflict
  );

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


function openEditConflictDialog(
  conflict
) {

  const element =
    getEditConflictDialog();

  activeConflict =
    conflict;

  resetRecoveryView(
    element
  );

  updateMinePreview(
    element,
    conflict
  );

  updatePopupAnchors(
    conflict.editor
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
        <li>Сначала сохраните черновик для себя или загрузите актуальную версию с подтверждением.</li>
      </ul>
    </div>
    <section
      class="edit-conflict-dialog__versions hidden"
      data-edit-conflict-versions
      aria-live="polite"
    >
      <article class="edit-conflict-dialog__version">
        <div class="edit-conflict-dialog__version-kicker">
          Актуальная сохранённая версия
        </div>
        <div class="edit-conflict-dialog__version-title" data-edit-conflict-current-title>
          Без названия
        </div>
        <p class="edit-conflict-dialog__version-excerpt" data-edit-conflict-current-excerpt>
        </p>
      </article>
      <article class="edit-conflict-dialog__version">
        <div class="edit-conflict-dialog__version-kicker">
          Мой черновик
        </div>
        <div class="edit-conflict-dialog__version-title" data-edit-conflict-mine-title>
          Без названия
        </div>
        <textarea
          class="edit-conflict-dialog__mine-text"
          data-edit-conflict-mine-text
          aria-label="Текст моего черновика"
          readonly
          rows="5"
          spellcheck="false"
        ></textarea>
      </article>
      <div class="edit-conflict-dialog__copy-status" data-edit-conflict-copy-status role="status"></div>
    </section>
    <section
      class="edit-conflict-dialog__confirm hidden"
      data-edit-conflict-confirm
      aria-live="polite"
    >
      <div class="edit-conflict-dialog__confirm-title">
        Загрузить актуальную версию?
      </div>
      <p>
        Редактор заменит текущий черновик сохранённой версией. Если черновик нужен, сначала скопируйте его.
      </p>
      <div class="edit-conflict-dialog__confirm-actions">
        <button class="edit-conflict-dialog__secondary" type="button" data-edit-conflict-cancel-reload>
          Остаться в черновике
        </button>
        <button class="edit-conflict-dialog__danger" type="button" data-edit-conflict-confirm-reload>
          Да, загрузить актуальную версию
        </button>
      </div>
      <div class="edit-conflict-dialog__reload-status" data-edit-conflict-reload-status role="status"></div>
    </section>
    <div class="edit-conflict-dialog__actions">
      <button class="edit-conflict-dialog__secondary" type="button" data-edit-conflict-view-current>
        Посмотреть версии
      </button>
      <button class="edit-conflict-dialog__secondary" type="button" data-edit-conflict-copy-mine>
        Скопировать мой черновик
      </button>
      <button class="edit-conflict-dialog__secondary" type="button" data-edit-conflict-reload-current>
        Загрузить актуальную версию
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

        void showVersionComparison();
      }
    );

  popup
    .querySelector('[data-edit-conflict-copy-mine]')
    .addEventListener(
      'click',
      () => {

        void copyMineDraft();
      }
    );

  popup
    .querySelector('[data-edit-conflict-reload-current]')
    .addEventListener(
      'click',
      () => {

        void requestReloadCurrentVersion();
      }
    );

  popup
    .querySelector('[data-edit-conflict-cancel-reload]')
    .addEventListener(
      'click',
      () => {

        hideReloadConfirmation();
      }
    );

  popup
    .querySelector('[data-edit-conflict-confirm-reload]')
    .addEventListener(
      'click',
      () => {

        void confirmReloadCurrentVersion();
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


async function showVersionComparison() {

  const element =
    getEditConflictDialog();

  const section =
    element.querySelector(
      '[data-edit-conflict-versions]'
    );

  const currentTitle =
    element.querySelector(
      '[data-edit-conflict-current-title]'
    );

  const currentExcerpt =
    element.querySelector(
      '[data-edit-conflict-current-excerpt]'
    );

  section.classList.remove(
    'hidden'
  );

  currentTitle.textContent =
    'Загрузка...';

  currentExcerpt.textContent =
    '';

  updateMinePreview(
    element,
    activeConflict
  );

  hideReloadConfirmation();

  try {

    const current =
      await readCurrentDurableVersionForConflict(
        activeConflict
      );

    currentTitle.textContent =
      current.title || 'Без названия';

    currentExcerpt.textContent =
      current.excerpt ||
      'В актуальной версии нет текстового фрагмента для показа.';

  } catch {

    currentTitle.textContent =
      'Не удалось прочитать актуальную версию';

    currentExcerpt.textContent =
      'Попробуйте открыть страницу заново после сохранения черновика в безопасном месте.';
  }
}


async function requestReloadCurrentVersion() {

  await showVersionComparison();

  const element =
    getEditConflictDialog();

  element
    .querySelector('[data-edit-conflict-confirm]')
    .classList.remove(
      'hidden'
    );

  element
    .querySelector('[data-edit-conflict-reload-status]')
    .textContent =
      '';

  element
    .querySelector('[data-edit-conflict-cancel-reload]')
    ?.focus();
}


function hideReloadConfirmation() {

  const element =
    getEditConflictDialog();

  element
    .querySelector('[data-edit-conflict-confirm]')
    .classList.add(
      'hidden'
    );

  element
    .querySelector('[data-edit-conflict-reload-status]')
    .textContent =
      '';
}


async function confirmReloadCurrentVersion() {

  const conflict =
    activeConflict;

  const element =
    getEditConflictDialog();

  const status =
    element.querySelector(
      '[data-edit-conflict-reload-status]'
    );

  if (!conflict) {

    status.textContent =
      'Конфликт уже закрыт. Откройте страницу заново.';

    return;
  }

  if (
    typeof recoveryConfig.reloadCurrentPage !== 'function'
  ) {

    status.textContent =
      'Не удалось загрузить актуальную версию из этого состояния.';

    return;
  }

  status.textContent =
    'Загружаю актуальную версию...';

  try {

    const current =
      await readCurrentDurableVersionForConflict(
        conflict
      );

    const page =
      applyCurrentContentToRuntimePage(
        conflict,
        current.content
      );

    popupController?.close();

    clearEditorSaveConflictState(
      conflict.pageId
    );

    await recoveryConfig.reloadCurrentPage({
      page,
      content:
        current.content,
      conflict
    });

    setSaveStatus(
      'saved',
      'Актуальная версия загружена. Черновик был заменён по вашему подтверждению.'
    );

  } catch {

    status.textContent =
      'Не удалось загрузить актуальную версию. Ваш черновик остаётся в редакторе.';
  }
}


async function copyMineDraft() {

  const element =
    getEditConflictDialog();

  const status =
    element.querySelector(
      '[data-edit-conflict-copy-status]'
    );

  const text =
    activeConflict?.mine?.text || '';

  if (!text) {

    status.textContent =
      'Черновик пуст или недоступен для копирования.';

    return;
  }

  try {

    await copyTextToClipboard(
      text
    );

    status.textContent =
      'Черновик скопирован.';

  } catch {

    status.textContent =
      'Не удалось скопировать автоматически. Текст черновика можно выделить вручную ниже.';
  }
}


function resetRecoveryView(
  element
) {

  element
    .querySelector('[data-edit-conflict-versions]')
    .classList.add(
      'hidden'
    );

  element
    .querySelector('[data-edit-conflict-confirm]')
    .classList.add(
      'hidden'
    );

  element.querySelector(
    '[data-edit-conflict-current-title]'
  ).textContent =
    'Без названия';

  element.querySelector(
    '[data-edit-conflict-current-excerpt]'
  ).textContent =
    '';

  element.querySelector(
    '[data-edit-conflict-copy-status]'
  ).textContent =
    '';

  element.querySelector(
    '[data-edit-conflict-reload-status]'
  ).textContent =
    '';
}


function updateMinePreview(
  element,
  conflict
) {

  const mine =
    conflict?.mine ||
    createReadablePageSummary(
      conflict?.mineContent || '',
      {
        fallbackText:
          conflict?.editor?.innerText || ''
      }
    );

  element.querySelector(
    '[data-edit-conflict-mine-title]'
  ).textContent =
    mine.title || 'Мой черновик';

  element.querySelector(
    '[data-edit-conflict-mine-text]'
  ).value =
    mine.text ||
    'В черновике нет текстового фрагмента для показа.';
}


async function readCurrentDurableVersionForConflict(
  conflict
) {

  if (
    conflict?.current &&
    typeof conflict.current.content === 'string'
  ) {

    return conflict.current;
  }

  const content =
    await readCurrentDurablePageContent(
      conflict?.page
    );

  const current =
    createReadablePageSummary(
      content || ''
    );

  current.content =
    content || '';

  if (conflict) {

    conflict.current =
      current;
  }

  return current;
}


function createActiveConflict({
  result,
  page,
  editor,
  conflictKey,
  source,
  mineContent
}) {

  const content =
    typeof mineContent === 'string'
      ? mineContent
      : '';

  return {
    result,
    page,
    editor,
    pageId:
      getConflictPageId(
        result,
        page
      ),
    conflictKey,
    source,
    mineContent:
      content,
    mine:
      createReadablePageSummary(
        content,
        {
          fallbackText:
            editor?.innerText || ''
        }
      ),
    baseIdentity:
      result?.conflictEvidence?.expectedBase ||
      result?.precondition?.expectedBase ||
      null,
    currentIdentity:
      result?.conflictEvidence?.currentBase ||
      result?.precondition?.currentBase ||
      null
  };
}


function applyCurrentContentToRuntimePage(
  conflict,
  content
) {

  const page =
    getPageById(
      conflict?.pageId
    ) ||
    conflict?.page;

  if (!page) {

    throw new Error(
      'Conflict page is unavailable.'
    );
  }

  const previousPage =
    snapshotRuntimePage(
      page
    );

  const parsed =
    parsePageRecordContent(
      content || '',
      {
        generateId:
          false
      }
    );

  page.schemaVersion =
    parsed.schemaVersion;

  page.updatedAt =
    parsed.updatedAt;

  page.contentHash =
    parsed.contentHash;

  page.pageRecordStatus =
    parsed.pageRecordStatus;

  page.parent =
    parsed.parent;

  page.order =
    parsed.order;

  page.title =
    parsed.title;

  page.template =
    parsed.template;

  page.type =
    parsed.type;

  page.tags =
    Array.isArray(parsed.tags)
      ? [
        ...parsed.tags
      ]
      : [];

  page.aliases =
    Array.isArray(parsed.aliases)
      ? [
        ...parsed.aliases
      ]
      : [];

  page.relationships =
    Array.isArray(parsed.relationships)
      ? parsed.relationships.map(relationship => ({
          ...relationship
        }))
      : [];

  page.content =
    content || '';

  notifyPageUpdated(
    previousPage,
    page
  );

  return page;
}


function snapshotRuntimePage(
  page
) {

  return {
    id:
      page?.id || null,
    parent:
      page?.parent ?? null,
    order:
      page?.order ?? 0,
    title:
      page?.title || '',
    template:
      page?.template || '',
    type:
      page?.type || '',
    tags:
      Array.isArray(page?.tags)
        ? [
          ...page.tags
        ]
        : [],
    aliases:
      Array.isArray(page?.aliases)
        ? [
          ...page.aliases
        ]
        : [],
    relationships:
      Array.isArray(page?.relationships)
        ? page.relationships.map(relationship => ({
            ...relationship
          }))
        : []
  };
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


function createReadablePageSummary(
  content,
  options = {}
) {

  if (!content && options.fallbackText) {

    const text =
      normalizeText(
        options.fallbackText
      );

    return {
      title:
        'Мой черновик',
      text,
      excerpt:
        createExcerpt(
          text
        )
    };
  }

  const parsed =
    parsePageRecordContent(
      content || '',
      {
        generateId:
          false
      }
    );

  const text =
    normalizeText(
      htmlToText(
        parsed.body || parsed.rawBody || ''
      )
    );

  return {
    title:
      parsed.title || 'Без названия',
    text,
    excerpt:
      createExcerpt(
        text
      )
  };
}


function htmlToText(
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

  return template.content.textContent || '';
}


function normalizeText(
  text
) {

  return String(
    text || ''
  )
    .replace(/\s+/g, ' ')
    .trim();
}


function createExcerpt(
  text
) {

  return normalizeText(
    text
  ).slice(
    0,
    420
  );
}


async function copyTextToClipboard(
  text
) {

  if (
    navigator.clipboard?.writeText
  ) {

    await navigator.clipboard.writeText(
      text
    );

    return;
  }

  const textarea =
    document.createElement(
      'textarea'
    );

  textarea.value =
    text;

  textarea.setAttribute(
    'readonly',
    'true'
  );

  textarea.style.position =
    'fixed';

  textarea.style.opacity =
    '0';

  document.body.appendChild(
    textarea
  );

  textarea.select();

  const copied =
    document.execCommand?.(
      'copy'
    );

  textarea.remove();

  if (!copied) {

    throw new Error(
      'Clipboard copy failed.'
    );
  }
}
