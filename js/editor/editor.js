/* EDIT */

import {
  setupLinks
} from './links.js';

import {
  setupFloatingToolbar
} from './toolbar.js';

import {
  setupAutosave,
  discardPendingAutosave,
  flushPendingAutosave,
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
  setupCharacterSheetBlocks
} from './characterSheetBlock.js';

import {
  setupCampaignMaps
} from './campaignMap.js';

import {
  setupTaskTrackers
} from '../taskTracker/taskTracker.js';

import {
  setupRuleTrees
} from '../ruleTree/ruleTree.js';

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
  setupEditorConflictRecovery
} from './editConflictUi.js';

import {
  saveCurrentSpecialPage
} from './editorSpecialSave.js';

import {
  teardownKnowledgeGraphPage
} from '../wiki/knowledgeGraphPage.js';

import {
  state
} from '../state.js';

let openPageGeneration =
  0;

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

  setupCharacterSheetBlocks(
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

  setupRuleTrees(
    editor,
    saveCurrentPage
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

  setupEditorConflictRecovery({
    async reloadCurrentPage({
      page
    }) {

      discardPendingAutosave(
        editor
      );

      return openPage(
        page,
        {
          source:
            'conflict-reload'
        }
      );
    }
  });
}

export function openPage(
  page,
  options = {}
) {

  const openGeneration =
    ++openPageGeneration;

  const isOpenCurrent =
    () => openGeneration === openPageGeneration;

  const open =
    () => {

      if (!isOpenCurrent()) return false;

      return openPageInEditor(
        editor,
        page,
        {
          ...options,
          isOpenCurrent,
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
    };

  const pendingFlush =
    flushPendingAutosave(
      editor
    );

  if (!pendingFlush) {

    return open();
  }

  return pendingFlush
    .then(result => {

      if (
        isEditorSaveResultBlockingTransition(
          result
        )
      ) {

        return false;
      }

      return open();
    })
    .catch(error => {

      console.error(
        'Page open stopped because pending autosave failed.',
        error
      );
    });
}

export function renderEmptyEditor() {

  teardownKnowledgeGraphPage(
    editor
  );

  renderEmptyEditorContent(
    editor
  );
}

export function renderWorkspaceRecoveryEditor(
  report
) {

  teardownKnowledgeGraphPage(
    editor
  );

  renderWorkspaceRecoveryEditorContent(
    editor,
    report
  );
}

export async function saveCurrentPage(
  options = {}
) {

  const savedSpecialPage =
    await saveCurrentSpecialPage(
      editor,
      options
    );

  if (savedSpecialPage) return savedSpecialPage;

  return saveCurrentPageWithEditor(
    editor,
    options
  );
}


export async function saveCurrentPageBeforeTransition(
  options = {}
) {

  const result =
    await saveCurrentPage(
      options
    );

  return {
    canContinue:
      !isEditorSaveResultBlockingTransition(
        result
      ),
    result
  };
}


export function isEditorSaveResultBlockingTransition(
  result
) {

  if (!result) return false;

  if (
    result.conflict ||
    result.blocked ||
    result.stale
  ) {

    return true;
  }

  const writeStatus =
    String(
      result.writeStatus || ''
    );

  return writeStatus === 'conflict' ||
    writeStatus === 'precondition-blocked' ||
    writeStatus === 'stale' ||
    writeStatus === 'superseded-after-write';
}

export async function insertImage() {

  await insertImageWithEditor(
    editor
  );
}
