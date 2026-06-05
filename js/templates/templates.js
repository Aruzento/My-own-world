import {
  createCardShellTemplate
} from './cardShell.js';

import {
  createCampaignMapTemplate
} from './campaignMap.js';

import {
  createTaskTrackerTemplate
} from './taskTracker.js';

import {
  createRuleTreeTemplate
} from './ruleTree.js';


export const templates = {
  card:
    createCardShellTemplate(),

  campaignMap:
    createCampaignMapTemplate(),

  taskTracker:
    createTaskTrackerTemplate(),

  ruleTree:
    createRuleTreeTemplate()
};
