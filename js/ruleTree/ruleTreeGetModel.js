import {
  RuleTreeModel
} from './ruleTreeModel.js';

import {
  readRuleTreeData
} from './ruleTreeReadData.js';


// Возвращает runtime-модель, привязанную к DOM-оболочке Rule Tree.

export function getRuleTreeModel(
  tree
) {

  if (tree.ruleTreeModel) {

    return tree.ruleTreeModel;
  }

  tree.ruleTreeModel =
    new RuleTreeModel(
      readRuleTreeData(
        tree
      )
    );

  return tree.ruleTreeModel;
}
