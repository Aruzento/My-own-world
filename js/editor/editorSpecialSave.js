import {
  state
} from '../state.js';

import {
  persistPageContentCommand,
  snapshotPageForCommand
} from '../storage/storage.js';

import {
  advanceEditorPageBase,
  getCurrentEditorPageBase
} from './editorSessionBase.js';

import {
  clearEditorSaveConflictState,
  handleEditorSaveConflictResult
} from './editConflictUi.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  setSaveStatus,
  setStatus
} from '../ui/ui.js';

import {
  hasDuplicatePageTitle
} from '../validation/pageTitleValidation.js';

import {
  updateOpenPageTitleWarning
} from './pageTitleWarning.js';

import {
  updatePageRecordContent
} from '../core/pageRecord.js';

import {
  sanitizePersistentHTMLOnSave
} from './safeHtmlSanitizer.js';

import {
  serializeCampaignMapHTML,
  syncCampaignMapPresentation
} from './campaignMap.js';

import {
  serializeTaskTrackerHTML
} from '../taskTracker/taskTracker.js';

import {
  serializeRuleTreeHTML
} from '../ruleTree/ruleTree.js';

import {
  serializeKnowledgeGraphHTML
} from '../wiki/knowledgeGraphPage.js';

import {
  isInternalRulePage
} from '../rulesWorkspace/internalRulePage.js';

export async function saveCurrentSpecialPage(
  editor,
  options = {}
) {

  if (
    isInternalRulePage(
      state.currentPage
    )
  ) {

    setStatus(
      'Внутренние правила доступны только для чтения'
    );

    return true;
  }

  if (
    state.currentPage?.template === 'campaignMap' ||
    state.currentPage?.type === 'campaignMap'
  ) {

    return await saveCurrentCampaignMap(
      editor,
      options
    ) || true;
  }

  if (
    state.currentPage?.template === 'taskTracker' ||
    state.currentPage?.type === 'taskTracker'
  ) {

    return await saveCurrentTaskTracker(
      editor,
      options
    ) || true;
  }

  if (
    state.currentPage?.template === 'ruleTree' ||
    state.currentPage?.type === 'ruleTree'
  ) {

    return await saveCurrentRuleTree(
      editor,
      options
    ) || true;
  }

  if (
    state.currentPage?.template === 'knowledgeGraph' ||
    state.currentPage?.type === 'knowledgeGraph'
  ) {

    return await saveCurrentKnowledgeGraph(
      editor,
      options
    ) || true;
  }

  return false;
}

function hasInvalidCurrentTitle(
  editor,
  title
) {

  const duplicated =
    hasDuplicatePageTitle(
      state.currentPage?.id,
      title
    );

  updateOpenPageTitleWarning(
    editor,
    state.currentPage
  );

  if (duplicated) {

    setStatus(
      'Название уже используется. Смените название.'
    );
  }

  return duplicated;
}

async function saveCurrentTaskTracker(
  editor,
  options = {}
) {

  if (!state.currentPage) return;

  const previousPage =
    snapshotPageForCommand(
      state.currentPage
    );

  const tags =
    state.currentPage.tags || ['task-tracker'];

  const aliases =
    state.currentPage.aliases || [];

  const titleElement =
    editor.querySelector('.task-tracker-title');

  state.currentPage.title =
    titleElement
      ? titleElement.textContent.trim()
      : 'Новый трекер';

  if (
    hasInvalidCurrentTitle(
      editor,
      state.currentPage.title
    )
  ) return;

  const content =
    updatePageRecordContent(
      state.currentPage.content,
      {
        id:
          state.currentPage.id,
        parent:
          state.currentPage.parent ?? null,
        order:
          state.currentPage.order ?? Date.now(),
        tags,
        template:
          'taskTracker',
        type:
          'taskTracker',
        aliases,
        relationships:
          state.currentPage.relationships || [],
        body:
          sanitizePersistentHTMLOnSave(
            serializeTaskTrackerHTML(
              editor
            )
          )
      }
    );

  return persistCurrentPage(
    editor,
    content,
    previousPage,
    options
  );
}

async function saveCurrentCampaignMap(
  editor,
  options = {}
) {

  if (!state.currentPage) return;

  const previousPage =
    snapshotPageForCommand(
      state.currentPage
    );

  const tags =
    state.currentPage.tags || [];

  const aliases =
    state.currentPage.aliases || [];

  const titleElement =
    editor.querySelector('h1');

  state.currentPage.title =
    titleElement
      ? titleElement.textContent.trim()
      : 'Без названия';

  if (
    hasInvalidCurrentTitle(
      editor,
      state.currentPage.title
    )
  ) return;

  const content =
    updatePageRecordContent(
      state.currentPage.content,
      {
        id:
          state.currentPage.id,
        parent:
          state.currentPage.parent ?? null,
        order:
          state.currentPage.order ?? Date.now(),
        tags,
        template:
          'campaignMap',
        type:
          'campaignMap',
        aliases,
        relationships:
          state.currentPage.relationships || [],
        body:
          sanitizePersistentHTMLOnSave(
            serializeCampaignMapHTML(
              editor
            )
          )
      }
    );

  const result =
    await persistCurrentPage(
      editor,
      content,
      previousPage,
      options
    );

  syncCampaignMapPresentation();

  return result;
}

async function saveCurrentRuleTree(
  editor,
  options = {}
) {

  if (!state.currentPage) return;

  const previousPage =
    snapshotPageForCommand(
      state.currentPage
    );

  const tags =
    state.currentPage.tags || ['rule-tree'];

  const aliases =
    state.currentPage.aliases || [];

  const titleElement =
    editor.querySelector('.rule-tree-title');

  state.currentPage.title =
    titleElement
      ? titleElement.textContent.trim()
      : 'Новое дерево правил';

  if (
    hasInvalidCurrentTitle(
      editor,
      state.currentPage.title
    )
  ) return;

  const content =
    updatePageRecordContent(
      state.currentPage.content,
      {
        id:
          state.currentPage.id,
        parent:
          state.currentPage.parent ?? null,
        order:
          state.currentPage.order ?? Date.now(),
        tags,
        template:
          'ruleTree',
        type:
          'ruleTree',
        aliases,
        relationships:
          state.currentPage.relationships || [],
        body:
          sanitizePersistentHTMLOnSave(
            serializeRuleTreeHTML(
              editor
            )
          )
      }
    );

  return persistCurrentPage(
    editor,
    content,
    previousPage,
    options
  );
}


async function saveCurrentKnowledgeGraph(
  editor,
  options = {}
) {

  if (!state.currentPage) return;

  const previousPage =
    snapshotPageForCommand(
      state.currentPage
    );

  const tags =
    state.currentPage.tags || ['knowledge-graph'];

  const aliases =
    state.currentPage.aliases || [];

  const titleElement =
    editor.querySelector('.knowledge-graph-title');

  state.currentPage.title =
    titleElement
      ? titleElement.textContent.trim()
      : 'Граф связей';

  if (
    hasInvalidCurrentTitle(
      editor,
      state.currentPage.title
    )
  ) return;

  const content =
    updatePageRecordContent(
      state.currentPage.content,
      {
        id:
          state.currentPage.id,
        parent:
          state.currentPage.parent ?? null,
        order:
          state.currentPage.order ?? Date.now(),
        tags,
        template:
          'knowledgeGraph',
        type:
          'knowledgeGraph',
        aliases,
        relationships:
          state.currentPage.relationships || [],
        body:
          sanitizePersistentHTMLOnSave(
            serializeKnowledgeGraphHTML(
              editor
            )
          )
      }
    );

  return persistCurrentPage(
    editor,
    content,
    previousPage,
    options
  );
}

async function persistCurrentPage(
  editor,
  content,
  previousPage = null,
  options = {}
) {

  setSaveStatus(
    'saving'
  );

  let result;

  try {

    const page =
      state.currentPage;

    result =
      await persistPageContentCommand({
        page:
          page,
        content,
        previousPage,
        type:
          previousPage?.title !== page.title
            ? 'rename-page'
            : 'update-page-content',
        reason:
          'special-save',
        expectedBase:
          getCurrentEditorPageBase(
            page?.id || null
          )
      });

  } catch (error) {

    setSaveStatus(
      'error',
      `Save error: ${error?.message || error}`
    );

    throw error;
  }

  if (result?.conflict) {

    handleEditorSaveConflictResult(
      result,
      {
        page:
          state.currentPage,
        editor,
        source:
          options.source || 'manual',
        mineContent:
          content
      }
    );

    return result;
  }

  if (result?.blocked) {

    setSaveStatus(
      'error',
      'Сохранение заблокировано: текущую версию страницы не удалось проверить.'
    );

    return result;
  }

  if (result?.stale) {

    setSaveStatus(
      'conflict',
      'Save conflict: newer change kept'
    );

    return result;
  }

  setSaveStatus(
    'Сохранено'
  );

  clearEditorSaveConflictState(
    state.currentPage?.id || null
  );

  advanceEditorPageBase(
    state.currentPage,
    content
  );

  renderTree();

  return result;
}
