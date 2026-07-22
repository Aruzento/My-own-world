import {
  registerPopup,
  togglePopupNearAnchor,
  closePopup
} from './popupManager.js';

import {
  applyStoredAppearance,
  getStoredAppearance,
  updateStoredAppearance
} from './themeManager.js';

import {
  setupComponentCatalogue
} from './componentCatalogue.js';

import {
  state
} from '../state.js';

import {
  cleanupIncompleteWorkspaceBackups,
  cleanupWorkspaceBackups,
  createWorkspaceBackup,
  getBackupRetentionLimit,
  listIncompleteWorkspaceBackups,
  listWorkspaceBackups,
  restoreWorkspaceBackup,
  setBackupRetentionLimit
} from '../storage/backupService.js';

import {
  getStorageAdapter,
  hasWorkspaceAccess
} from '../storage/storageAdapter.js';

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

import {
  renderAssetHealthPanel
} from './assetHealthPanel.js';

import {
  renderWorkspaceDiagnosticsPanel
} from './workspaceDiagnosticsPanel.js';

import {
  createProgressMessage
} from '../performance/workspacePerformance.js';

import {
  finishOperationProgress,
  showOperationProgress
} from './operationProgress.js';


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

  const closeSettings =
    () => {

      settingsButton.setAttribute(
        'aria-expanded',
        'false'
      );

      closePopup(
        settingsPopup
      );
    };

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

  setupComponentCatalogue({
    toolsPopup
  });

  settingsButton.addEventListener(
    'click',
    async () => {

      closeTools();

      await renderBackupPanel(
        settingsPopup
      );

      await renderAssetHealthPanel(
        settingsPopup
      );

      await renderWorkspaceDiagnosticsPanel(
        settingsPopup
      );

      renderAppearancePanel(
        settingsPopup
      );

      const opened =
        togglePopupNearAnchor(
        settingsPopup,
        settingsButton,
        {
          fallbackWidth: 340,
          offset: 8
        }
      );

      settingsButton.setAttribute(
        'aria-expanded',
        String(opened)
      );
    }
  );

  toolsButton.addEventListener(
    'click',
    () => {

      closeSettings();

      const opened =
        togglePopupNearAnchor(
        toolsPopup,
        toolsButton,
        {
          fallbackWidth: 150,
          offset: 8
        }
      );

      toolsButton.setAttribute(
        'aria-expanded',
        String(opened)
      );
    }
  );

  settingsCloseButton?.addEventListener(
    'click',
    closeSettings
  );
}


function renderAppearancePanel(
  popup
) {

  popup
    .querySelector('.app-appearance-panel')
    ?.remove();

  const appearance =
    getStoredAppearance();

  const panel =
    document.createElement('section');

  panel.className =
    'app-appearance-panel';

  const title =
    document.createElement('h3');

  title.textContent =
    'Оформление';

  const description =
    document.createElement('p');

  description.textContent =
    'Быстрый визуальный слой: фон, акцент и плотность интерфейса.';

  const presets =
    createAppearanceSwatchGroup({
      title: 'Акцент',
      field: 'accent',
      value: appearance.accent,
      options: [
        ['gold', 'Золото'],
        ['blue', 'Синий'],
        ['green', 'Лес'],
        ['purple', 'Аркана'],
        ['red', 'Кровь']
      ],
      onChange:
        value => updateStoredAppearance({
          accent: value
        })
    });

  const backgrounds =
    createAppearanceSwatchGroup({
      title: 'Фон',
      field: 'background',
      value: appearance.background,
      options: [
        ['stone', 'Камень'],
        ['forest', 'Лес'],
        ['arcane', 'Магия']
      ],
      onChange:
        value => updateStoredAppearance({
          background: value
        })
    });

  const scale =
    createAppearanceSegmented({
      title: 'Размер интерфейса',
      field: 'scale',
      value: appearance.scale,
      options: [
        ['compact', '80%'],
        ['normal', '100%'],
        ['large', '120%']
      ],
      onChange:
        value => updateStoredAppearance({
          scale: value
        })
    });

  panel.append(
    title,
    description,
    presets,
    backgrounds,
    scale
  );

  const closeButton =
    popup.querySelector('.app-popup-close');

  if (closeButton) {

    closeButton.insertAdjacentElement(
      'afterend',
      panel
    );

    return;
  }

  popup.prepend(
    panel
  );
}


function createAppearanceSwatchGroup({
  title,
  field,
  value,
  options,
  onChange
}) {

  const group =
    document.createElement('div');

  group.className =
    'app-appearance-group';

  const label =
    document.createElement('span');

  label.className =
    'app-appearance-label';

  label.textContent =
    title;

  const list =
    document.createElement('div');

  list.className =
    'app-appearance-swatches';

  for (const [optionValue, optionLabel] of options) {

    const button =
      document.createElement('button');

    button.type =
      'button';

    button.className =
      'app-appearance-swatch';

    button.dataset[field] =
      optionValue;

    button.title =
      optionLabel;

    button.setAttribute(
      'aria-label',
      optionLabel
    );

    if (optionValue === value) {

      button.classList.add(
        'is-selected'
      );
    }

    button.addEventListener(
      'click',
      () => {

        list
          .querySelectorAll('.app-appearance-swatch')
          .forEach(item => item.classList.remove('is-selected'));

        button.classList.add(
          'is-selected'
        );

        onChange(
          optionValue
        );
      }
    );

    list.appendChild(
      button
    );
  }

  group.append(
    label,
    list
  );

  return group;
}


function createAppearanceSegmented({
  title,
  field,
  value,
  options,
  onChange
}) {

  const group =
    document.createElement('div');

  group.className =
    'app-appearance-group';

  const label =
    document.createElement('span');

  label.className =
    'app-appearance-label';

  label.textContent =
    title;

  const control =
    document.createElement('div');

  control.className =
    'app-appearance-segmented';

  for (const [optionValue, optionLabel] of options) {

    const button =
      document.createElement('button');

    button.type =
      'button';

    button.dataset[field] =
      optionValue;

    button.textContent =
      optionLabel;

    if (optionValue === value) {

      button.classList.add(
        'is-selected'
      );
    }

    button.addEventListener(
      'click',
      () => {

        control
          .querySelectorAll('button')
          .forEach(item => item.classList.remove('is-selected'));

        button.classList.add(
          'is-selected'
        );

        onChange(
          optionValue
        );
      }
    );

    control.appendChild(
      button
    );
  }

  group.append(
    label,
    control
  );

  return group;
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

  const incomplete =
    document.createElement('div');

  incomplete.className =
    'app-backup-incomplete';

  const retention =
    createBackupRetentionControls({
      onCleanup:
        () => renderBackupList(
          list,
          confirm
        )
    });

  const incompleteControls =
    createIncompleteBackupControls({
      container:
        incomplete,
      onCleanup:
        async () => {

          await renderBackupList(
            list,
            confirm
          );

          await renderIncompleteBackupList(
            incomplete
          );
        }
    });

  panel.append(
    title,
    description,
    createButton,
    retention,
    incompleteControls,
    incomplete,
    list,
    confirm
  );

  popup.appendChild(
    panel
  );

  if (!hasWorkspaceAccess(getStorageAdapter())) {

    createButton.disabled =
      true;

    list.textContent =
      'Workspace не выбран.';

    incompleteControls
      .querySelectorAll('button')
      .forEach(button => {

        button.disabled =
          true;
      });

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
            reason: 'manual',
            onProgress:
              setProgressStatus
          });

        finishProgressStatus(
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

        finishProgressStatus(
          'Не удалось создать backup',
          {
            status:
              'failed',
            delayMs:
              3200
          }
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


function createBackupRetentionControls({
  onCleanup
}) {

  const wrapper =
    document.createElement('div');

  wrapper.className =
    'app-backup-retention';

  const label =
    document.createElement('label');

  label.textContent =
    'Хранить backup';

  const input =
    document.createElement('input');

  input.type =
    'number';

  input.min =
    '1';

  input.max =
    '200';

  input.step =
    '1';

  input.value =
    String(
      getBackupRetentionLimit()
    );

  const saveButton =
    document.createElement('button');

  saveButton.type =
    'button';

  saveButton.textContent =
    'Применить';

  const cleanupButton =
    document.createElement('button');

  cleanupButton.type =
    'button';

  cleanupButton.textContent =
    'Очистить старые';

  saveButton.addEventListener(
    'click',
    () => {

      input.value =
        String(
          setBackupRetentionLimit(
            input.value
          )
        );

      setStatus(
        `Backup retention: ${input.value}`
      );
    }
  );

  cleanupButton.addEventListener(
    'click',
    async () => {

      cleanupButton.disabled =
        true;

      setStatus(
        'Очищаю старые backup...'
      );

      try {

        const result =
          await cleanupWorkspaceBackups({
            keepLatest:
              getBackupRetentionLimit(),
            onProgress:
              setProgressStatus
          });

        finishProgressStatus(
          `Backup cleanup: удалено ${result.removed}`
        );

        await onCleanup?.();

      } catch (error) {

        console.error(
          'Не удалось очистить backup.',
          error
        );

        finishProgressStatus(
          'Не удалось очистить backup',
          {
            status:
              'failed',
            delayMs:
              3200
          }
        );

      } finally {

        cleanupButton.disabled =
          false;
      }
    }
  );

  label.appendChild(
    input
  );

  wrapper.append(
    label,
    saveButton,
    cleanupButton
  );

  return wrapper;
}


function createIncompleteBackupControls({
  container,
  onCleanup
}) {

  const wrapper =
    document.createElement('div');

  wrapper.className =
    'app-backup-retention';

  const scanButton =
    document.createElement('button');

  scanButton.type =
    'button';

  scanButton.textContent =
    'Проверить недособранные';

  const cleanupButton =
    document.createElement('button');

  cleanupButton.type =
    'button';

  cleanupButton.className =
    'app-backup-danger';

  cleanupButton.textContent =
    'Удалить найденные';

  cleanupButton.disabled =
    true;

  scanButton.addEventListener(
    'click',
    async () => {

      scanButton.disabled =
        true;

      setStatus(
        'Проверяю недособранные backup...'
      );

      try {

        const incomplete =
          await renderIncompleteBackupList(
            container
          );

        cleanupButton.disabled =
          incomplete.length === 0;

        finishProgressStatus(
          `Недособранные backup: ${incomplete.length}`
        );

      } catch (error) {

        console.error(
          'Не удалось проверить недособранные backup.',
          error
        );

        finishProgressStatus(
          'Не удалось проверить недособранные backup',
          {
            status:
              'failed',
            delayMs:
              3200
          }
        );

      } finally {

        scanButton.disabled =
          false;
      }
    }
  );

  cleanupButton.addEventListener(
    'click',
    async () => {

      const ids =
        getRenderedIncompleteBackupIds(
          container
        );

      if (ids.length === 0) return;

      const confirmed =
        window.confirm(
          `Удалить недособранные backup (${ids.length})? Валидные backup не будут затронуты.`
        );

      if (!confirmed) return;

      cleanupButton.disabled =
        true;

      setStatus(
        'Удаляю недособранные backup...'
      );

      try {

        const result =
          await cleanupIncompleteWorkspaceBackups({
            backupIds:
              ids,
            onProgress:
              setProgressStatus
          });

        finishProgressStatus(
          `Недособранные backup удалены: ${result.removed}`
        );

        await onCleanup?.();

      } catch (error) {

        console.error(
          'Не удалось удалить недособранные backup.',
          error
        );

        finishProgressStatus(
          'Не удалось удалить недособранные backup',
          {
            status:
              'failed',
            delayMs:
              3200
          }
        );

      } finally {

        cleanupButton.disabled =
          false;
      }
    }
  );

  wrapper.append(
    scanButton,
    cleanupButton
  );

  return wrapper;
}


async function renderIncompleteBackupList(
  container
) {

  container.textContent =
    'Проверка...';

  const incomplete =
    await listIncompleteWorkspaceBackups({
      onProgress:
        setProgressStatus
    });

  container.replaceChildren();

  if (incomplete.length === 0) {

    container.textContent =
      'Недособранных backup не найдено.';

    return incomplete;
  }

  const title =
    document.createElement('strong');

  title.textContent =
    'Недособранные backup';

  const list =
    document.createElement('div');

  list.className =
    'app-backup-list';

  incomplete.forEach(backup => {

    const item =
      document.createElement('div');

    item.className =
      'app-backup-item';

    item.dataset.backupId =
      backup.id;

    const meta =
      document.createElement('div');

    meta.className =
      'app-backup-meta';

    const name =
      document.createElement('strong');

    name.textContent =
      backup.id;

    const details =
      document.createElement('span');

    details.textContent =
      `${backup.fileCount || 0} файлов · ${formatBytes(backup.sizeBytes || 0)}`;

    meta.append(
      name,
      details
    );

    item.appendChild(
      meta
    );

    list.appendChild(
      item
    );
  });

  container.append(
    title,
    list
  );

  return incomplete;
}


function getRenderedIncompleteBackupIds(
  container
) {

  return [
    ...container.querySelectorAll('[data-backup-id]')
  ]
    .map(item =>
      item.dataset.backupId
    )
    .filter(Boolean);
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
            backup.id,
            null,
            {
              onProgress:
                setProgressStatus
            }
          );

        await reloadWorkspaceAfterRestore();

        finishProgressStatus(
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

        finishProgressStatus(
          'Не удалось восстановить backup',
          {
            status:
              'failed',
            delayMs:
              3200
          }
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


function formatBytes(
  value
) {

  const bytes =
    Number(value || 0);

  if (bytes < 1024) {

    return `${bytes} Б`;
  }

  if (bytes < 1024 * 1024) {

    return `${(bytes / 1024).toFixed(1)} КБ`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
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


function setProgressStatus(
  progress
) {

  const message =
    showOperationProgress(
      progress
    ) ||
    createProgressMessage(
      progress
    );

  setStatus(
    message
  );
}


function finishProgressStatus(
  message,
  options = {}
) {

  setStatus(
    message
  );

  finishOperationProgress({
    message,
    status:
      options.status || 'complete',
    delayMs:
      options.delayMs
  });
}
