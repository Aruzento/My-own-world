import {
  state
} from '../state.js';

import {
  writePageContent
} from '../storage/storage.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  setStatus
} from '../ui/ui.js';

import {
  notifyPageUpdated
} from '../repository/pageRepository.js';

import {
  hasDuplicatePageTitle
} from '../validation/pageTitleValidation.js';

import {
  updateOpenPageTitleWarning
} from './pageTitleWarning.js';

import {
  formatRelationshipsFrontMatter
} from '../core/markdown.js';

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
`---
id: ${state.currentPage.id}
parent: ${state.currentPage.parent ?? 'null'}
order: ${state.currentPage.order ?? Date.now()}
tags: [${tags.join(', ')}]
template: taskTracker
type: taskTracker
aliases: [${aliases.join(', ')}]
${formatRelationshipsFrontMatter(state.currentPage.relationships)}
---

${sanitizePersistentHTMLOnSave(
  serializeTaskTrackerHTML(editor)
)}
`;

  await persistCurrentPage(
    content
  );
}

async function saveCurrentCampaignMap(
  editor
) {

  if (!state.currentPage) return;

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
`---
id: ${state.currentPage.id}
parent: ${state.currentPage.parent ?? 'null'}
order: ${state.currentPage.order ?? Date.now()}
tags: [${tags.join(', ')}]
template: campaignMap
type: campaignMap
aliases: [${aliases.join(', ')}]
${formatRelationshipsFrontMatter(state.currentPage.relationships)}
---

${sanitizePersistentHTMLOnSave(
  serializeCampaignMapHTML(editor)
)}
`;

  await persistCurrentPage(
    content
  );

  syncCampaignMapPresentation();
}

async function saveCurrentRuleTree(
  editor
) {

  if (!state.currentPage) return;

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
`---
id: ${state.currentPage.id}
parent: ${state.currentPage.parent ?? 'null'}
order: ${state.currentPage.order ?? Date.now()}
tags: [${tags.join(', ')}]
template: ruleTree
type: ruleTree
aliases: [${aliases.join(', ')}]
${formatRelationshipsFrontMatter(state.currentPage.relationships)}
---

${sanitizePersistentHTMLOnSave(
  serializeRuleTreeHTML(editor)
)}
`;

  await persistCurrentPage(
    content
  );
}


async function saveCurrentKnowledgeGraph(
  editor
) {

  if (!state.currentPage) return;

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
`---
id: ${state.currentPage.id}
parent: ${state.currentPage.parent ?? 'null'}
order: ${state.currentPage.order ?? Date.now()}
tags: [${tags.join(', ')}]
template: knowledgeGraph
type: knowledgeGraph
aliases: [${aliases.join(', ')}]
${formatRelationshipsFrontMatter(state.currentPage.relationships)}
---

${sanitizePersistentHTMLOnSave(
  serializeKnowledgeGraphHTML(editor)
)}
`;

  await persistCurrentPage(
    content
  );
}

async function persistCurrentPage(
  content
) {

  await writePageContent(
    state.currentPage,
    content
  );

  state.currentPage.content =
    content;

  notifyPageUpdated();

  setStatus(
    'Сохранено'
  );

  renderTree();
}
