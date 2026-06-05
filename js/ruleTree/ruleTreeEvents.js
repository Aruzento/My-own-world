import {
  state
} from '../state.js';

import {
  getLegacyRulePageImports
} from '../rules/ruleTreeProvider.js';

import {
  commitRuleTreeData
} from './ruleTreeDirty.js';

import {
  getRuleTreeModel
} from './ruleTreeGetModel.js';

import {
  renderRuleTree
} from './ruleTreeRender.js';


// Все пользовательские действия Rule Tree проходят через модель, а не через чтение DOM.

export function setupRuleTreeEvents(
  editor,
  saveCurrentPage
) {

  editor.addEventListener(
    'click',
    event => handleRuleTreeClick(
      event,
      saveCurrentPage
    )
  );

  editor.addEventListener(
    'change',
    event => handleRuleTreeChange(
      event,
      saveCurrentPage
    )
  );
}


async function handleRuleTreeClick(
  event,
  saveCurrentPage
) {

  const tree =
    event.target.closest('.rule-tree-document');

  if (!tree) return;

  const model =
    getRuleTreeModel(
      tree
    );

  const ruleElement =
    event.target.closest('[data-rule-id]');

  if (
    event.target.classList.contains('rule-tree-import-rule') &&
    ruleElement
  ) {

    const candidate =
      getLegacyRulePageImports(
        state.pages
      )
        .find(rule =>
          rule.id === ruleElement.dataset.ruleId
        );

    if (!candidate) return;

    model.importRule(
      candidate
    );

    await commitRenderAndSave(
      tree,
      model,
      saveCurrentPage
    );

    return;
  }

  if (
    event.target.classList.contains('rule-tree-add-group')
  ) {

    const input =
      tree.querySelector(
        '.rule-tree-group-title-input'
      );

    const title =
      input?.value?.trim();

    if (!title) return;

    model.addGroup(
      title
    );

    await commitRenderAndSave(
      tree,
      model,
      saveCurrentPage
    );

    return;
  }

  if (
    event.target.classList.contains('rule-tree-remove-rule') &&
    ruleElement
  ) {

    model.removeRule(
      ruleElement.dataset.ruleId
    );

    await commitRenderAndSave(
      tree,
      model,
      saveCurrentPage
    );
  }
}


async function handleRuleTreeChange(
  event,
  saveCurrentPage
) {

  const tree =
    event.target.closest('.rule-tree-document');

  if (!tree) return;

  if (
    !event.target.classList.contains('rule-tree-active-checkbox')
  ) return;

  const ruleElement =
    event.target.closest('[data-rule-id]');

  if (!ruleElement) return;

  const model =
    getRuleTreeModel(
      tree
    );

  model.toggleActiveRule(
    ruleElement.dataset.ruleId,
    event.target.checked
  );

  await commitRenderAndSave(
    tree,
    model,
    saveCurrentPage
  );
}


async function commitRenderAndSave(
  tree,
  model,
  saveCurrentPage
) {

  commitRuleTreeData(
    tree,
    model
  );

  renderRuleTree(
    tree.closest('#editorArea')
  );

  if (typeof saveCurrentPage === 'function') {

    await saveCurrentPage();
  }
}
