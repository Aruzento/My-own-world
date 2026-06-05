import {
  setupRuleTreeEvents
} from './ruleTreeEvents.js';

export {
  isRuleTreePage,
  serializeRuleTreeHTML
} from './ruleTreeContract.js';

export {
  renderRuleTree
} from './ruleTreeRender.js';


// Входная точка подсистемы Rule Tree.

export function setupRuleTrees(
  editor,
  saveCurrentPage
) {

  setupRuleTreeEvents(
    editor,
    saveCurrentPage
  );
}
