import { state } from '../state.js';

import {
  isCampaignMapRecord
} from './campaignMapContract.js';

import {
  refreshCampaignMapModel
} from './campaignMapModel.js';

import {
  syncPresentation
} from './campaignMapPresentation.js';


// Save-controller держит порядок операций сохранения карты:
// синхронизировать title, обновить модель, сохранить страницу, обновить презентацию.

export async function saveCampaignMapAndSync(
  options = {}
) {

  const openMap =
    document.querySelector(
      '#editorArea .campaign-map-document'
    );

  if (
    !openMap ||
    !isCampaignMapRecord(
      state.currentPage
    )
  ) {

    syncPresentation();
    return;
  }

  if (options.saveCurrentPage) {

    options.syncCurrentMapTitle?.();

    refreshCampaignMapModel(
      openMap
    );

    await options.saveCurrentPage();
  }

  syncPresentation();
}
