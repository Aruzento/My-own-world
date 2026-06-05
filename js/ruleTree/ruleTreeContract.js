import {
  readRuleTreeData
} from './ruleTreeReadData.js';

import {
  writeRuleTreeData
} from './ruleTreeWriteData.js';


// Contract изолирует определение сущности Rule Tree и ее clean-save.

export function isRuleTreePage(
  parsedOrPage
) {

  return (
    parsedOrPage?.template === 'ruleTree' ||
    parsedOrPage?.type === 'ruleTree' ||
    (parsedOrPage?.tags || []).includes('rule-tree')
  );
}


export function serializeRuleTreeHTML(
  editor
) {

  const tree =
    editor.querySelector('.rule-tree-document');

  if (!tree) return '';

  const clone =
    tree.cloneNode(true);

  clone
    .querySelectorAll('[data-runtime="true"]')
    .forEach(element => element.remove());

  writeRuleTreeData(
    clone,
    readRuleTreeData(
      tree
    )
  );

  return clone.outerHTML;
}
