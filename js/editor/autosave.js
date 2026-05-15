import { state } from '../state.js';

import {
  renderTree
} from '../tree/tree.js';

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

  const writable =
    await state.currentPage.handle
      .createWritable();

  await writable.write(
    content
  );

  await writable.close();

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

  return serializePersistentEditorHTML(
    editor
  );
}
