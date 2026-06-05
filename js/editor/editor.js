/* EDIT */

import {
  setupLinks
} from './links.js';

import {
  setupFloatingToolbar
} from './toolbar.js';

import {
  setupAutosave,
  saveCurrentPage as saveCurrentPageWithEditor
} from './autosave.js';

import {
  setupEditorKeyboard
} from './keyboard.js';

import {
  setupPortraitUploads,
  insertImage as insertImageWithEditor
} from './images.js';

import {
  setupWikiLinks
} from './wikiLinks.js';

import {
  setupCustomBlocks
} from './customBlocks.js';

import {
  setupCharacterEffectsBlocks
} from './characterEffectsBlock.js';

import {
  setupCampaignMaps
} from './campaignMap.js';

import {
  setupTaskTrackers
} from '../taskTracker/taskTracker.js';

import {
  updateOpenPageTitleWarning
} from './pageTitleWarning.js';

import {
  setupEditorHistory
} from './editorHistory.js';

import {
  editor
} from './editorDom.js';

import {
  setupEditorWikiLinkNormalization
} from './editorWikiLinkNormalization.js';

import {
  setupEditorPlainTextPaste
} from './editorPastePlainText.js';

import {
  setupEmptyEditorActions,
  renderEmptyEditorContent,
  renderWorkspaceRecoveryEditorContent
} from './editorEmptyPage.js';

import {
  setupEditorExternalLinkOpening
} from './editorLinksRuntime.js';

import {
  updateNavigationStack,
  renderBackButtonIfNeeded as renderEditorBackButton
} from './editorNavigation.js';

import {
  openPageInEditor
} from './editorOpenPage.js';

import {
  saveCurrentSpecialPage
} from './editorSpecialSave.js';

import {
  state
} from '../state.js';

export function setupEditor() {

  setupAutosave(
    editor
  );

  setupEditorHistory(
    editor
  );

  setupPortraitUploads(
    editor
  );

  setupFloatingToolbar();

  setupLinks(
    editor
  );

  setupWikiLinks(
    editor
  );

  setupEditorKeyboard(
    saveCurrentPage
  );

  setupCustomBlocks(
    editor,
    saveCurrentPage
  );

  setupCharacterEffectsBlocks(
    editor,
    saveCurrentPage
  );

  setupCampaignMaps(
    editor,
    saveCurrentPage
  );

  setupTaskTrackers(
    editor
  );

  const wikiLinkController =
    setupEditorWikiLinkNormalization(
      editor,
      {
        saveCurrentPage,
        onInput: () => {

          updateOpenPageTitleWarning(
            editor,
            state.currentPage
          );
        }
      }
    );

  setupEditorPlainTextPaste(
    editor,
    wikiLinkController
  );

  setupEmptyEditorActions(
    editor,
    openPage
  );

  setupEditorExternalLinkOpening(
    editor
  );
}

export function openPage(
  page,
  options = {}
) {

  openPageInEditor(
    editor,
    page,
    {
      ...options,
      updateNavigationStack,
      saveCurrentPage,
      renderBackButtonIfNeeded: parsed => {

        renderEditorBackButton(
          editor,
          parsed,
          openPage
        );
      }
    }
  );
}

export function renderEmptyEditor() {

  renderEmptyEditorContent(
    editor
  );
}

export function renderWorkspaceRecoveryEditor(
  report
) {

  renderWorkspaceRecoveryEditorContent(
    editor,
    report
  );
}

export async function saveCurrentPage() {

  const savedSpecialPage =
    await saveCurrentSpecialPage(
      editor
    );

  if (savedSpecialPage) return;

  await saveCurrentPageWithEditor(
    editor
  );
}

export async function insertImage() {

  await insertImageWithEditor(
    editor
  );
}
