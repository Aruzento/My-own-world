import {
  state
} from '../state.js';

import {
  persistPageContentCommand,
  snapshotPageForCommand
} from '../storage/storage.js';

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
  editor
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

    await saveCurrentCampaignMap(
      editor
    );

    return true;
  }

  if (
    state.currentPage?.template === 'taskTracker' ||
    state.currentPage?.type === 'taskTracker'
  ) {

    await saveCurrentTaskTracker(
      editor
    );

    return true;
  }

  if (
    state.currentPage?.template === 'ruleTree' ||
    state.currentPage?.type === 'ruleTree'
  ) {

    await saveCurrentRuleTree(
      editor
    );

    return true;
  }

  if (
    state.currentPage?.template === 'knowledgeGraph' ||
    state.currentPage?.type === 'knowledgeGraph'
  ) {

    await saveCurrentKnowledgeGraph(
      editor
    );

    return true;
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
  editor
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

  await persistCurrentPage(
    content,
    previousPage
  );
}

async function saveCurrentCampaignMap(
  editor
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

  await persistCurrentPage(
    content,
    previousPage
  );

  syncCampaignMapPresentation();
}

async function saveCurrentRuleTree(
  editor
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

  await persistCurrentPage(
    content,
    previousPage
  );
}


async function saveCurrentKnowledgeGraph(
  editor
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

  await persistCurrentPage(
    content,
    previousPage
  );
}

async function persistCurrentPage(
  content,
  previousPage = null
) {

  setSaveStatus(
    'saving'
  );

  const result =
    await persistPageContentCommand({
    page:
      state.currentPage,
    content,
    previousPage,
    type:
      previousPage?.title !== state.currentPage.title
        ? 'rename-page'
        : 'update-page-content',
    reason:
      'special-save'
  });

  if (result?.stale) {

    setSaveStatus(
      'conflict',
      'Save conflict: newer change kept'
    );

    return;
  }

  setSaveStatus(
    'Сохранено'
  );

  renderTree();
}
