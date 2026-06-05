import {
  writeRuleTreeData
} from './ruleTreeWriteData.js';


// Commit фиксирует состояние модели в persistent JSON, но не сохраняет файл сам.

export function commitRuleTreeData(
  tree,
  model
) {

  writeRuleTreeData(
    tree,
    model.data
  );
}
