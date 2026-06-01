import {
  registerPopup,
  togglePopupNearAnchor,
  closePopup
} from './popupManager.js';

import {
  state
} from '../state.js';

import {
  createWorkspaceBackup,
  listWorkspaceBackups,
  restoreWorkspaceBackup
} from '../storage/backupService.js';

import {
  loadWorkspace
} from '../storage/storage.js';

import {
  loadPageTemplates
} from '../templates/pageTemplateStorage.js';

import {
  renderEmptyEditor
} from '../editor/editor.js';

import {
  renderTree,
  restoreWorkspaceTreeExpansionState
} from '../tree/tree.js';


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
    async () => {

      closeTools();

      await renderBackupPanel(
        settingsPopup
      );

      togglePopupNearAnchor(
        settingsPopup,
        settingsButton,
        {
          fallbackWidth: 340,
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


async function renderBackupPanel(
  popup
) {

  popup
    .querySelector('.app-backup-panel')
    ?.remove();

  const panel =
    document.createElement('section');

  panel.className =
    'app-backup-panel';

  const title =
    document.createElement('h3');

  title.textContent =
    'Резервные копии';

  const description =
    document.createElement('p');

  description.textContent =
    'Snapshot сохраняет текущие markdown-страницы workspace перед восстановлением или рискованными операциями.';

  const createButton =
    document.createElement('button');

  createButton.className =
    'app-backup-primary';

  createButton.type =
    'button';

  createButton.textContent =
    'Создать резервную копию';

  const list =
    document.createElement('div');

  list.className =
    'app-backup-list';

  const confirm =
    document.createElement('div');

  confirm.className =
    'app-backup-confirm hidden';

  panel.append(
    title,
    description,
    createButton,
    list,
    confirm
  );

  popup.appendChild(
    panel
  );

  if (!state.workspaceHandle) {

    createButton.disabled =
      true;

    list.textContent =
      'Workspace не выбран.';

    return;
  }

  createButton.addEventListener(
    'click',
    async () => {

      createButton.disabled =
        true;

      setStatus(
        'Создаю резервную копию...'
      );

      try {

        const manifest =
          await createWorkspaceBackup({
            reason: 'manual'
          });

        setStatus(
          `Backup создан: ${manifest.pageCount} страниц`
        );

        await renderBackupList(
          list,
          confirm
        );

      } catch (error) {

        console.error(
          'Не удалось создать backup.',
          error
        );

        setStatus(
          'Не удалось создать backup'
        );

      } finally {

        createButton.disabled =
          false;
      }
    }
  );

  await renderBackupList(
    list,
    confirm
  );
}


async function renderBackupList(
  list,
  confirm
) {

  list.textContent =
    'Загрузка...';

  const backups =
    await listWorkspaceBackups();

  list.replaceChildren();

  confirm.classList.add(
    'hidden'
  );

  if (backups.length === 0) {

    list.textContent =
      'Резервных копий пока нет.';

    return;
  }

  backups.forEach(backup => {

    const item =
      document.createElement('div');

    item.className =
      'app-backup-item';

    const meta =
      document.createElement('div');

    meta.className =
      'app-backup-meta';

    const name =
      document.createElement('strong');

    name.textContent =
      formatBackupDate(
        backup.createdAt
      );

    const details =
      document.createElement('span');

    details.textContent =
      `${backup.reason || 'manual'} · ${backup.pageCount || 0} стр.`;

    meta.append(
      name,
      details
    );

    const restoreButton =
      document.createElement('button');

    restoreButton.type =
      'button';

    restoreButton.className =
      'app-backup-restore';

    restoreButton.textContent =
      'Восстановить';

    restoreButton.addEventListener(
      'click',
      () => renderRestoreConfirm(
        confirm,
        backup,
        () => renderBackupList(
          list,
          confirm
        )
      )
    );

    item.append(
      meta,
      restoreButton
    );

    list.appendChild(
      item
    );
  });
}


function renderRestoreConfirm(
  confirm,
  backup,
  onDone
) {

  confirm.replaceChildren();

  confirm.classList.remove(
    'hidden'
  );

  const text =
    document.createElement('p');

  text.textContent =
    'Восстановить страницы из этой резервной копии? Новые файлы, созданные после backup, не удаляются.';

  const actions =
    document.createElement('div');

  actions.className =
    'app-backup-confirm-actions';

  const cancelButton =
    document.createElement('button');

  cancelButton.type =
    'button';

  cancelButton.textContent =
    'Отмена';

  const confirmButton =
    document.createElement('button');

  confirmButton.type =
    'button';

  confirmButton.className =
    'app-backup-danger';

  confirmButton.textContent =
    'Восстановить';

  cancelButton.addEventListener(
    'click',
    () => confirm.classList.add('hidden')
  );

  confirmButton.addEventListener(
    'click',
    async () => {

      confirmButton.disabled =
        true;

      setStatus(
        'Восстанавливаю backup...'
      );

      try {

        const result =
          await restoreWorkspaceBackup(
            backup.id
          );

        await reloadWorkspaceAfterRestore();

        setStatus(
          `Backup восстановлен: ${result.restoredPages} страниц`
        );

        confirm.classList.add(
          'hidden'
        );

        await onDone();

      } catch (error) {

        console.error(
          'Не удалось восстановить backup.',
          error
        );

        setStatus(
          'Не удалось восстановить backup'
        );

      } finally {

        confirmButton.disabled =
          false;
      }
    }
  );

  actions.append(
    cancelButton,
    confirmButton
  );

  confirm.append(
    text,
    actions
  );
}


async function reloadWorkspaceAfterRestore() {

  await loadWorkspace();

  await loadPageTemplates();

  await restoreWorkspaceTreeExpansionState();

  renderTree();

  if (state.pages.length === 0) {

    renderEmptyEditor();
  }
}


function formatBackupDate(
  value
) {

  const date =
    new Date(
      value
    );

  if (Number.isNaN(date.getTime())) {

    return 'Backup';
  }

  return date.toLocaleString(
    'ru-RU'
  );
}


function setStatus(
  text
) {

  const statusbar =
    document.getElementById('statusbar');

  if (statusbar) {

    statusbar.textContent =
      text;
  }
}
