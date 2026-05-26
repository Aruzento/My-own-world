import {
  markRuntime
} from './blockRuntime.js';

import {
  createTableRowControlsHTML
} from './blockTableContract.js';

import {
  BLOCK_VERSIONS,
  upgradePersistentBlocks
} from './blockUpgrades.js';

import {
  ensureRuntimeControls
} from './blockRuntimeControls.js';

import {
  removeRuntimeControls,
  serializePersistentEditorHTML
} from './blockSerializer.js';

export {
  BLOCK_VERSIONS,
  createTableRowControlsHTML,
  markRuntime,
  serializePersistentEditorHTML
};

export function applyBlockSystemContract(
  editor
) {

  if (!editor) return false;

  let changed =
    false;

  changed =
    removeRuntimeControls(
      editor
    ) || changed;

  changed =
    upgradePersistentBlocks(
      editor
    ) || changed;

  ensureRuntimeControls(
    editor
  );

  return changed;
}
