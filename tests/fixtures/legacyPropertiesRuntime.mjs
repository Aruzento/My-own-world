// Explicit historical fixture support. No normal application path imports this module.
import { applyBlockSystemContract as applyCurrent } from '../../js/editor/blocks/blockContract.js';
import { ensurePropertySettingsControls } from '../../js/editor/propertiesSettingsPopup.js';
import { setupPropertiesAutoCalculations, refreshPropertiesAutoCalculations } from '../../js/editor/propertiesAutoCalculations.js';
export * from '../../js/editor/blocks/blockContract.js';
export function applyBlockSystemContract(root) {
  applyCurrent(root);
  ensurePropertySettingsControls(root);
  setupPropertiesAutoCalculations(root);
  refreshPropertiesAutoCalculations(root);
}
