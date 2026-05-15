import {
  isSelectionInsidePersistentEditable
} from './contenteditablePolicy.js';


export function runInlineFormattingCommand(
  command,
  value = null
) {

  if (
    !command ||
    !isSelectionInsidePersistentEditable()
  ) {

    return false;
  }

  // Deprecated browser API is isolated here until the editor gets a custom formatting layer.
  document.execCommand(
    command,
    false,
    value
  );

  return true;
}


export function applyTextColor(
  color
) {

  return runInlineFormattingCommand(
    'foreColor',
    color
  );
}
