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

import {
  createKnowledgeGraphTemplate
} from './knowledgeGraph.js';


export const templates = {
  card:
    createCardShellTemplate(),

  campaignMap:
    createCampaignMapTemplate(),

  taskTracker:
    createTaskTrackerTemplate(),

  ruleTree:
    createRuleTreeTemplate(),

  knowledgeGraph:
    createKnowledgeGraphTemplate()
};
