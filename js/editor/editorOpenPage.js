import {
  state
} from '../state.js';

import {
  setCurrentPage
} from '../stateActions.js';

import {
  parseMarkdown
} from '../core/markdown.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  renderTags,
  setStatus
} from '../ui/ui.js';

import {
  renderAliases
} from '../ui/aliases.js';

import {
  renderBacklinks
} from '../ui/backlinks.js';

import {
  renderDndStats
} from '../ui/dndStats.js';

import {
  renderCardType
} from '../ui/cardType.js';

import {
  restoreAssetImages as restoreAssetImagesWithEditor
} from './images.js';

import {
  refreshWikiLinks,
  normalizeWikiLinksInEditor
} from './wikiLinks.js';

import {
  renderCustomBlocks
} from './customBlocks.js';

import {
  applyBlockSystemContract
} from './blocks/blockContract.js';

import {
  applyContenteditablePolicy
} from './contenteditablePolicy.js';

import {
  isCampaignMapPage,
  renderCampaignMap
} from './campaignMap.js';

import {
  isTaskTrackerPage,
  renderTaskTracker
} from '../taskTracker/taskTracker.js';

import {
  updateOpenPageTitleWarning
} from './pageTitleWarning.js';

import {
  sanitizePersistentHTMLOnLoad
} from './safeHtmlSanitizer.js';

import {
  sanitizeAssetImagesBeforeRender
} from './editorAssetSanitizer.js';

export function openPageInEditor(
  editor,
  page,
  options
) {

  options.updateNavigationStack(
    page,
    options
  );

  setCurrentPage(
    page
  );

  const parsed =
    parseMarkdown(page.content);

  applyParsedMetadataToCurrentPage(
    parsed
  );

  editor.innerHTML =
    sanitizeAssetImagesBeforeRender(
      sanitizePersistentHTMLOnLoad(
        parsed.body
      )
    );

  if (
    renderSpecialPageIfNeeded(
      editor,
      page,
      parsed
    )
  ) return;

  renderCardPage(
    editor,
    page,
    parsed,
    options
  );
}

function applyParsedMetadataToCurrentPage(
  parsed
) {

  state.currentPage.tags =
    parsed.tags;

  state.currentPage.aliases =
    parsed.aliases;

  state.currentPage.template =
    parsed.template;

  state.currentPage.type =
    parsed.type;

  state.currentPage.schemaVersion =
    parsed.schemaVersion;
}

function renderSpecialPageIfNeeded(
  editor,
  page,
  parsed
) {

  if (
    isCampaignMapPage(
      parsed
    )
  ) {

    renderCampaignMap(
      editor
    );

    completeOpenPage(
      page
    );

    return true;
  }

  if (
    isTaskTrackerPage(
      parsed
    )
  ) {

    renderTaskTracker(
      editor
    );

    completeOpenPage(
      page
    );

    return true;
  }

  return false;
}

function renderCardPage(
  editor,
  page,
  parsed,
  options
) {

  updateOpenPageTitleWarning(
    editor,
    state.currentPage
  );

  applyContenteditablePolicy(
    editor
  );

  const blockContractChanged =
    applyBlockSystemContract(
      editor
    );

  applyContenteditablePolicy(
    editor
  );

  restoreAssetImagesWithEditor(
    editor
  );

  renderTags(
    parsed.tags
  );

  renderAliases(
    parsed.aliases
  );

  renderCardType();
  refreshWikiLinks(
    editor
  );

  if (
    normalizeWikiLinksInEditor(
      editor
    )
  ) {

    options.saveCurrentPage();
  }

  if (blockContractChanged) {

    options.saveCurrentPage();
  }

  renderBacklinks();

  renderCustomBlocks(
    editor
  );

  renderDndStats();

  options.renderBackButtonIfNeeded(
    parsed
  );

  completeOpenPage(
    page
  );
}

function completeOpenPage(
  page
) {

  setStatus(
    `Открыта ${page.name}`
  );

  renderTree();
}
