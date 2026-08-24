import {
  registerPopup,
  togglePopupNearAnchor,
  closePopup
} from './popupManager.js';

import {
  applyStoredAppearance
} from './themeManager.js';

import {
  setupComponentCatalogue
} from './componentCatalogue.js';

import {
  setupSettingsCenter
} from './settings/settingsCenter.js';


export function setupAppTopbar() {

  const settingsButton =
    document.getElementById('appSettingsBtn');

  const toolsButton =
    document.getElementById('appToolsBtn');

  const settingsPopup =
    document.getElementById('appSettingsPopup');

  const toolsPopup =
    document.getElementById('appToolsPopup');

  const settingsCloseButton =
    document.getElementById('appSettingsCloseBtn');

  applyStoredAppearance();

  if (
    !settingsButton ||
    !toolsButton ||
    !settingsPopup ||
    !toolsPopup
  ) return;

  const closeTools =
    () => {

      toolsButton.setAttribute(
        'aria-expanded',
        'false'
      );

      closePopup(
        toolsPopup
      );
    };

  const closeSettings =
    setupSettingsCenter({
      settingsButton,
      settingsPopup,
      settingsCloseButton,
      beforeOpen:
        closeTools
    });

  registerPopup({
    popup:
      toolsPopup,
    close:
      closeTools,
    anchors:
      [toolsButton]
  });

  setupComponentCatalogue({
    toolsPopup
  });

  toolsButton.addEventListener(
    'click',
    () => {

      closeSettings?.();

      const opened =
        togglePopupNearAnchor(
          toolsPopup,
          toolsButton,
          {
            fallbackWidth:
              150,
            offset:
              8
          }
        );

      toolsButton.setAttribute(
        'aria-expanded',
        String(opened)
      );
    }
  );
}
