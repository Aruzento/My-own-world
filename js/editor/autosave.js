import { state } from '../state.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  persistPageContentCommand,
  snapshotPageForCommand
} from '../storage/storage.js';

import {
  setSaveStatus,
  setStatus
} from '../ui/ui.js';

import {
  updatePageRecordContent
} from '../core/pageRecord.js';

import {
  serializePersistentEditorHTML
} from './blocks/blockContract.js';

import {
  serializeCampaignMapHTML,
  syncCampaignMapPresentation
} from './campaignMap.js';

import {
  serializeTaskTrackerHTML
} from '../taskTracker/taskTracker.js';

import {
  serializeKnowledgeGraphHTML
} from '../wiki/knowledgeGraphPage.js';

import {
  hasDuplicatePageTitle
} from '../validation/pageTitleValidation.js';

import {
  updateOpenPageTitleWarning
} from './pageTitleWarning.js';

import {
  sanitizePersistentHTMLOnSave
} from './safeHtmlSanitizer.js';


export function setupAutosave(
  editor
) {

  let timeout =
    null;

  editor.addEventListener(
    'input',
    () => {

      setSaveStatus(
        'changed'
      );

      clearTimeout(
        timeout
      );

      timeout =
        setTimeout(
          () => {

            saveCurrentPage(
              editor
            );
          },
          500
        );
    }
  );
}


export async function saveCurrentPage(
  editor
) {

  const page =
    state.currentPage;

  if (!page) return;

  if (
    isCampaignMapEditorMismatch(
      editor,
      page
    )
  ) {

    console.warn(
      'Autosave skipped: current page and campaign map editor state are out of sync.'
    );

    return;
  }

  if (
    isTaskTrackerEditorMismatch(
      editor,
      page
    )
  ) {

    console.warn(
      'Autosave skipped: current page and task tracker editor state are out of sync.'
    );

    return;
  }

  if (
    isKnowledgeGraphEditorMismatch(
      editor,
      page
    )
  ) {

    console.warn(
      'Autosave skipped: current page and knowledge graph editor state are out of sync.'
    );

    return;
  }

  const tags =
    page.tags || [];

  const aliases =
    page.aliases || [];

  const template =
    page.template || '';

  const type =
    page.type || 'note';

  const titleElement =
    editor.querySelector('h1');

  const previousPage =
    snapshotPageForCommand(
      page
    );

  page.title =
    titleElement
      ? titleElement.textContent.trim()
      : 'Без названия';

  /* Не сохраняем конфликтующие названия: дерево, wiki-links и быстрый поиск должны видеть одну сущность на одно имя. */
  if (
    hasDuplicatePageTitle(
      page.id,
      page.title
    )
  ) {

    updateOpenPageTitleWarning(
      editor,
      page
    );

    setStatus(
      'Название уже используется. Смените название.'
    );

    renderTree();

    return;
  }

  updateOpenPageTitleWarning(
    editor,
    page
  );

  setSaveStatus(
    'saving'
  );

  const content =
    updatePageRecordContent(
      page.content,
      {
        id:
          page.id,
        parent:
          page.parent ?? null,
        order:
          page.order ?? Date.now(),
        tags,
        template,
        type,
        aliases,
        relationships:
          page.relationships || [],
        body:
          getSerializedEditorHTML(
            editor,
            page
          )
      }
    );

  let result;

  try {

    result =
      await persistPageContentCommand({
        page,
        content,
        previousPage,
        type:
          previousPage?.title !== page.title
            ? 'rename-page'
            : 'update-page-content',
        reason:
          'autosave'
      });

  } catch (error) {

    setSaveStatus(
      'error',
      `Save error: ${error?.message || error}`
    );

    throw error;
  }

  if (result?.stale) {

    setSaveStatus(
      'conflict',
      'Save conflict: newer change kept'
    );

    return;
  }

  if (state.currentPage?.id === page.id) {

  setSaveStatus(
    'Сохранено'
  );

  }

  renderTree();

  syncCampaignMapPresentation();
}


function isCampaignMapEditorMismatch(
  editor,
  page = state.currentPage
) {

  const editorHasMap =
    Boolean(
      editor.querySelector('.campaign-map-document')
    );

  const currentIsMap =
    page?.template === 'campaignMap' ||
    page?.type === 'campaignMap';

  return editorHasMap !== currentIsMap;
}


function isTaskTrackerEditorMismatch(
  editor,
  page = state.currentPage
) {

  const editorHasTracker =
    Boolean(
      editor.querySelector('.task-tracker-document')
    );

  const currentIsTracker =
    page?.template === 'taskTracker' ||
    page?.type === 'taskTracker';

  return editorHasTracker !== currentIsTracker;
}


function isKnowledgeGraphEditorMismatch(
  editor,
  page = state.currentPage
) {

  const editorHasGraph =
    Boolean(
      editor.querySelector('.knowledge-graph-document')
    );

  const currentIsGraph =
    page?.template === 'knowledgeGraph' ||
    page?.type === 'knowledgeGraph';

  return editorHasGraph !== currentIsGraph;
}


function getSerializedEditorHTML(
  editor,
  page = state.currentPage
) {

  if (
    page?.template === 'campaignMap' ||
    page?.type === 'campaignMap'
  ) {

    return sanitizePersistentHTMLOnSave(
      serializeCampaignMapHTML(
        editor
      )
    );
  }

  if (
    page?.template === 'taskTracker' ||
    page?.type === 'taskTracker'
  ) {

    return sanitizePersistentHTMLOnSave(
      serializeTaskTrackerHTML(
        editor
      )
    );
  }

  if (
    page?.template === 'knowledgeGraph' ||
    page?.type === 'knowledgeGraph'
  ) {

    return sanitizePersistentHTMLOnSave(
      serializeKnowledgeGraphHTML(
        editor
      )
    );
  }

  return sanitizePersistentHTMLOnSave(
    serializePersistentEditorHTML(
      editor
    )
  );
}
