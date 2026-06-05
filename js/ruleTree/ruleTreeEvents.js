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

    return;
  }

  if (
    event.target.classList.contains('rule-tree-add-condition') &&
    ruleElement
  ) {

    const condition =
      readConditionForm(
        ruleElement
      );

    if (!condition) return;

    model.addCondition(
      ruleElement.dataset.ruleId,
      condition
    );

    await commitRenderAndSave(
      tree,
      model,
      saveCurrentPage
    );

    return;
  }

  if (
    event.target.classList.contains('rule-tree-remove-condition') &&
    ruleElement
  ) {

    const conditionElement =
      event.target.closest('[data-condition-index]');

    if (!conditionElement) return;

    model.removeCondition(
      ruleElement.dataset.ruleId,
      conditionElement.dataset.conditionIndex
    );

    await commitRenderAndSave(
      tree,
      model,
      saveCurrentPage
    );

    return;
  }

  if (
    event.target.classList.contains('rule-tree-export-package')
  ) {

    const textarea =
      tree.querySelector(
        '.rule-tree-package-json'
      );

    if (textarea) {

      textarea.value =
        JSON.stringify(
          model.exportPackage(),
          null,
          2
        );
    }

    return;
  }

  if (
    event.target.classList.contains('rule-tree-import-package')
  ) {

    const textarea =
      tree.querySelector(
        '.rule-tree-package-json'
      );

    if (!textarea) return;

    const packageData =
      parsePackageJSON(
        textarea
      );

    if (!packageData) return;

    model.importPackage(
      packageData
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

  const ruleElement =
    event.target.closest('[data-rule-id]');

  if (!ruleElement) return;

  const model =
    getRuleTreeModel(
      tree
    );

  if (
    event.target.classList.contains('rule-tree-active-checkbox')
  ) {

    model.toggleActiveRule(
      ruleElement.dataset.ruleId,
      event.target.checked
    );

    await commitRenderAndSave(
      tree,
      model,
      saveCurrentPage
    );

    return;
  }

  if (
    isRuleEditorField(
      event.target
    )
  ) {

    model.updateRule(
      ruleElement.dataset.ruleId,
      readRuleEditorPatch(
        ruleElement
      )
    );

    await commitRenderAndSave(
      tree,
      model,
      saveCurrentPage
    );
  }
}


function readRuleEditorPatch(
  ruleElement
) {

  return {
    groupId:
      ruleElement.querySelector('.rule-tree-rule-group')?.value || 'core',
    category:
      ruleElement.querySelector('.rule-tree-rule-category')?.value || 'Общее',
    inheritsRuleIds:
      parseIdList(
        ruleElement.querySelector('.rule-tree-rule-inherits')?.value
      ),
    sourcePackageId:
      ruleElement.querySelector('.rule-tree-rule-package')?.value?.trim() || null
  };
}


function readConditionForm(
  ruleElement
) {

  const type =
    ruleElement.querySelector('.rule-tree-condition-type')?.value || 'manual';

  const value =
    ruleElement.querySelector('.rule-tree-condition-value')?.value?.trim() || '';

  const note =
    ruleElement.querySelector('.rule-tree-condition-note')?.value?.trim() || '';

  if (!value && !note) return null;

  return {
    type,
    value,
    note
  };
}


function isRuleEditorField(
  target
) {

  return [
    'rule-tree-rule-group',
    'rule-tree-rule-category',
    'rule-tree-rule-inherits',
    'rule-tree-rule-package'
  ].some(className =>
    target.classList.contains(
      className
    )
  );
}


function parseIdList(
  value
) {

  return String(value || '')
    .split(',')
    .map(item =>
      item.trim()
    )
    .filter(Boolean);
}


function parsePackageJSON(
  textarea
) {

  try {

    textarea.classList.remove(
      'is-error'
    );

    return JSON.parse(
      textarea.value || '{}'
    );

  } catch (error) {

    textarea.classList.add(
      'is-error'
    );

    console.warn(
      'Rule Tree package JSON is invalid.',
      error
    );

    return null;
  }
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
