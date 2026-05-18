import {
  registerPopup,
  togglePopupNearAnchor,
  closePopup
} from './popupManager.js';


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

  if (
    !settingsButton ||
    !toolsButton ||
    !settingsPopup ||
    !toolsPopup
  ) return;

  const closeSettings =
    () => closePopup(settingsPopup);

  const closeTools =
    () => closePopup(toolsPopup);

  registerPopup({
    popup: settingsPopup,
    close: closeSettings,
    anchors: [settingsButton]
  });

  registerPopup({
    popup: toolsPopup,
    close: closeTools,
    anchors: [toolsButton]
  });

  settingsButton.addEventListener(
    'click',
    () => {

      closeTools();

      togglePopupNearAnchor(
        settingsPopup,
        settingsButton,
        {
          fallbackWidth: 220,
          offset: 8
        }
      );
    }
  );

  toolsButton.addEventListener(
    'click',
    () => {

      closeSettings();

      togglePopupNearAnchor(
        toolsPopup,
        toolsButton,
        {
          fallbackWidth: 150,
          offset: 8
        }
      );
    }
  );

  settingsCloseButton?.addEventListener(
    'click',
    closeSettings
  );
}
