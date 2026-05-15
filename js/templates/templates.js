import {
  createCardShellTemplate
} from './cardShell.js';

import {
  createCampaignMapTemplate
} from './campaignMap.js';


export const templates = {
  card:
    createCardShellTemplate(),

  campaignMap:
    createCampaignMapTemplate()
};
