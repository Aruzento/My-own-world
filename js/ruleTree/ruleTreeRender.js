import {
  state
} from '../state.js';

import {
  getLegacyRulePageImports
} from '../rules/ruleTreeProvider.js';

import {
  RuleTreeModel
} from './ruleTreeModel.js';

import {
  getRuleTreeBoardHTML
} from './ruleTreeHTML.js';

import {
  readRuleTreeData
} from './ruleTreeReadData.js';

import {
  writeRuleTreeData
} from './ruleTreeWriteData.js';


// Рендер пересобирает только runtime-панель. Persistent JSON остается в script-теге.

export function renderRuleTree(
  editor
) {

  const tree =
    editor.querySelector('.rule-tree-document');

  if (!tree) return;

  const data =
    readRuleTreeData(
      tree
    );

  writeRuleTreeData(
    tree,
    data
  );

  tree.ruleTreeModel =
    new RuleTreeModel(
      data
    );

  tree
    .querySelectorAll('.rule-tree-board')
    .forEach(board => board.remove());

  tree.insertAdjacentHTML(
    'beforeend',
    getRuleTreeBoardHTML(
      data,
      getLegacyRulePageImports(
        state.pages
      )
    )
  );
}
