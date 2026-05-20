import { state } from '../state.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  writePageContent
} from '../storage/storage.js';

import {
  setStatus
} from '../ui/ui.js';

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
  hasDuplicatePageTitle
} from '../validation/pageTitleValidation.js';

import {
  updateOpenPageTitleWarning
} from './pageTitleWarning.js';


export function setupAutosave(
  editor
) {

  let timeout =
    null;

  editor.addEventListener(
    'input',
    () => {

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

  if (!state.currentPage) return;

  if (
    isCampaignMapEditorMismatch(
      editor
    )
  ) {

    console.warn(
      'Autosave skipped: current page and campaign map editor state are out of sync.'
    );

    return;
  }

  if (
    isTaskTrackerEditorMismatch(
      editor
    )
  ) {

    console.warn(
      'Autosave skipped: current page and task tracker editor state are out of sync.'
    );

    return;
  }

  const tags =
    state.currentPage.tags || [];

  const aliases =
    state.currentPage.aliases || [];

  const template =
    state.currentPage.template || '';

  const type =
    state.currentPage.type || 'note';

  const titleElement =
    editor.querySelector('h1');

  state.currentPage.title =
    titleElement
      ? titleElement.textContent.trim()
      : 'Без названия';

  /* Не сохраняем конфликтующие названия: дерево, wiki-links и быстрый поиск должны видеть одну сущность на одно имя. */
  if (
    hasDuplicatePageTitle(
      state.currentPage.id,
      state.currentPage.title
    )
  ) {

    updateOpenPageTitleWarning(
      editor,
      state.currentPage
    );

    setStatus(
      'Название уже используется. Смените название.'
    );

    renderTree();

    return;
  }

  updateOpenPageTitleWarning(
    editor,
    state.currentPage
  );

  const content =
`---
id: ${state.currentPage.id}
parent: ${state.currentPage.parent ?? 'null'}
order: ${state.currentPage.order ?? Date.now()}
tags: [${tags.join(', ')}]
template: ${template}
type: ${type}
aliases: [${aliases.join(', ')}]
---

${getSerializedEditorHTML(editor)}
`;

  await writePageContent(
    state.currentPage,
    content
  );

  state.currentPage.content =
    content;

  setStatus(
    'Сохранено'
  );

  renderTree();

  syncCampaignMapPresentation();
}


function isCampaignMapEditorMismatch(
  editor
) {

  const editorHasMap =
    Boolean(
      editor.querySelector('.campaign-map-document')
    );

  const currentIsMap =
    state.currentPage?.template === 'campaignMap' ||
    state.currentPage?.type === 'campaignMap';

  return editorHasMap !== currentIsMap;
}


function isTaskTrackerEditorMismatch(
  editor
) {

  const editorHasTracker =
    Boolean(
      editor.querySelector('.task-tracker-document')
    );

  const currentIsTracker =
    state.currentPage?.template === 'taskTracker' ||
    state.currentPage?.type === 'taskTracker';

  return editorHasTracker !== currentIsTracker;
}


function getSerializedEditorHTML(
  editor
) {

  if (
    state.currentPage?.template === 'campaignMap' ||
    state.currentPage?.type === 'campaignMap'
  ) {

    return serializeCampaignMapHTML(
      editor
    );
  }

  if (
    state.currentPage?.template === 'taskTracker' ||
    state.currentPage?.type === 'taskTracker'
  ) {

    return serializeTaskTrackerHTML(
      editor
    );
  }

  return serializePersistentEditorHTML(
    editor
  );
}
