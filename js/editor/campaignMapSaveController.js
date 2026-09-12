import { state } from '../state.js';
import { getStorageAdapter } from '../storage/storageAdapter.js';

import {
  isCampaignMapRecord
} from './campaignMapContract.js';

import {
  syncPresentation
} from './campaignMapPresentation.js';

import {
  refreshCampaignMapStore
} from './campaignMapStore.js';


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

  let receipt;
  if (options.saveCurrentPage) {

    const mapPageId = state.currentPage.id;
    const storageAdapter = getStorageAdapter();

    options.syncCurrentMapTitle?.();

    refreshCampaignMapStore(
      openMap
    );

    const result = await options.saveCurrentPage();
    receipt = { ...result, mapPageId, storageAdapter };
  }

  syncPresentation();
  return receipt;
}
