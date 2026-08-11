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
  createSettingsSectionHeader,
  setButtonContent
} from './settingsPanelUI.js';

import {
  iconSvg
} from '../core/icons.js';

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

      const settingsBody =
        renderSettingsChrome(
          settingsPopup
        );

      await renderBackupPanel(
        settingsBody
      );

      await renderAssetHealthPanel(
        settingsBody
      );

      await renderWorkspaceDiagnosticsPanel(
        settingsBody
      );

      renderAppearancePanel(
        settingsBody
      );

      const opened =
        togglePopupNearAnchor(
        settingsPopup,
        settingsButton,
        {
          fallbackWidth: 440,
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


function renderSettingsChrome(
  popup
) {

  popup.setAttribute(
    'data-settings-ui-migration',
    '0.0.1.8.14.2'
  );

  popup
    .querySelector('.app-settings-chrome')
    ?.remove();

  const chrome =
    document.createElement('div');

  chrome.className =
    'app-settings-chrome';

  const header =
    document.createElement('div');

  header.className =
    'app-settings-header';

  const mark =
    document.createElement('span');

  mark.className =
    'app-settings-header-mark';

  mark.innerHTML =
    iconSvg(
      'settings',
      'app-settings-header-icon'
    );

  const text =
    document.createElement('div');

  text.className =
    'app-settings-header-text';

  const kicker =
    document.createElement('span');

  kicker.className =
    'app-settings-kicker';

  kicker.textContent =
    'Обслуживание';

  const title =
    document.createElement('h2');

  title.textContent =
    'Настройки';

  text.append(
    kicker,
    title
  );

  header.append(
    mark,
    text
  );

  const statusStrip =
    document.createElement('div');

  statusStrip.className =
    'app-settings-status-strip';

  [
    ['Оформление', 'settings'],
    ['Резервные копии', 'copy'],
    ['Ассеты', 'image'],
    ['Диагностика', 'check']
  ].forEach(([label, iconName]) => {

    const item =
      document.createElement('span');

    item.className =
      'app-settings-status-chip';

    item.innerHTML =
      `${iconSvg(iconName, 'app-settings-chip-icon', { size: 'sm' })}<span>${label}</span>`;

    statusStrip.appendChild(
      item
    );
  });

  const body =
    document.createElement('div');

  body.className =
    'app-settings-body';

  chrome.append(
    header,
    statusStrip,
    body
  );

  popup.appendChild(
    chrome
  );

  return body;
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

  panel.dataset.settingsSection =
    'appearance';

  const header =
    createSettingsSectionHeader({
      iconName:
        'settings',
      title:
        'Оформление',
      description:
        'Фон, акцент и плотность интерфейса.'
    });

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

  const theme =
    createAppearanceSegmented({
      title: 'Тема',
      field: 'theme',
      value: appearance.theme,
      options: [
        ['dark', 'Темная'],
        ['contrast', 'Контраст']
      ],
      onChange:
        value => updateStoredAppearance({
          theme: value
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
    header,
    theme,
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

    button.setAttribute(
      'aria-pressed',
      optionValue === value
        ? 'true'
        : 'false'
    );

    button.addEventListener(
      'click',
      () => {

        list
          .querySelectorAll('.app-appearance-swatch')
          .forEach(item => {

            item.classList.remove(
              'is-selected'
            );

            item.setAttribute(
              'aria-pressed',
              'false'
            );
          });

        button.classList.add(
          'is-selected'
        );

        button.setAttribute(
          'aria-pressed',
          'true'
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

    button.setAttribute(
      'aria-pressed',
      optionValue === value
        ? 'true'
        : 'false'
    );

    button.addEventListener(
      'click',
      () => {

        control
          .querySelectorAll('button')
          .forEach(item => {

            item.classList.remove(
              'is-selected'
            );

            item.setAttribute(
              'aria-pressed',
              'false'
            );
          });

        button.classList.add(
          'is-selected'
        );

        button.setAttribute(
          'aria-pressed',
          'true'
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

  panel.dataset.settingsSection =
    'backup';

  const header =
    createSettingsSectionHeader({
      iconName:
        'copy',
      title:
        'Резервные копии',
      description:
        'Точки восстановления перед рискованными действиями.'
    });

  const createButton =
    document.createElement('button');

  createButton.className =
    'app-backup-primary';

  createButton.type =
    'button';

  setButtonContent(
    createButton,
    'plus',
    'Создать резервную копию'
  );

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
    header,
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
      'Рабочая папка не выбрана.';

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
          `Резервная копия создана: ${manifest.pageCount} страниц`
        );

        await renderBackupList(
          list,
          confirm
        );

      } catch (error) {

        console.error(
          'Не удалось создать резервную копию.',
          error
        );

        finishProgressStatus(
          'Не удалось создать резервную копию',
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

  wrapper.dataset.settingsControl =
    'backup-retention';

  const label =
    document.createElement('label');

  label.textContent =
    'Хранить копий';

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

  setButtonContent(
    saveButton,
    'check',
    'Применить'
  );

  const cleanupButton =
    document.createElement('button');

  cleanupButton.type =
    'button';

  setButtonContent(
    cleanupButton,
    'trash',
    'Очистить старые'
  );

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
        `Хранение копий: ${input.value}`
      );
    }
  );

  cleanupButton.addEventListener(
    'click',
    async () => {

      cleanupButton.disabled =
        true;

      setStatus(
        'Очищаю старые резервные копии...'
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
          `Очистка резервных копий: удалено ${result.removed}`
        );

        await onCleanup?.();

      } catch (error) {

        console.error(
          'Не удалось очистить резервные копии.',
          error
        );

        finishProgressStatus(
          'Не удалось очистить резервные копии',
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

  wrapper.dataset.settingsControl =
    'incomplete-backups';

  const scanButton =
    document.createElement('button');

  scanButton.type =
    'button';

  setButtonContent(
    scanButton,
    'search',
    'Проверить недособранные'
  );

  const cleanupButton =
    document.createElement('button');

  cleanupButton.type =
    'button';

  cleanupButton.className =
    'app-backup-danger';

  setButtonContent(
    cleanupButton,
    'trash',
    'Удалить найденные'
  );

  cleanupButton.disabled =
    true;

  scanButton.addEventListener(
    'click',
    async () => {

      scanButton.disabled =
        true;

      setStatus(
        'Проверяю незавершённые резервные копии...'
      );

      try {

        const incomplete =
          await renderIncompleteBackupList(
            container
          );

        cleanupButton.disabled =
          incomplete.length === 0;

        finishProgressStatus(
          `Незавершённые резервные копии: ${incomplete.length}`
        );

      } catch (error) {

        console.error(
          'Не удалось проверить незавершённые резервные копии.',
          error
        );

        finishProgressStatus(
          'Не удалось проверить незавершённые резервные копии',
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
          `Удалить незавершённые резервные копии (${ids.length})? Валидные копии не будут затронуты.`
        );

      if (!confirmed) return;

      cleanupButton.disabled =
        true;

      setStatus(
        'Удаляю незавершённые резервные копии...'
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
          `Незавершённые резервные копии удалены: ${result.removed}`
        );

        await onCleanup?.();

      } catch (error) {

        console.error(
          'Не удалось удалить незавершённые резервные копии.',
          error
        );

        finishProgressStatus(
          'Не удалось удалить незавершённые резервные копии',
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
      'Незавершённых резервных копий не найдено.';

    return incomplete;
  }

  const title =
    document.createElement('strong');

  title.textContent =
    'Незавершённые резервные копии';

  const list =
    document.createElement('div');

  list.className =
    'app-backup-list';

  incomplete.forEach(backup => {

    const item =
      document.createElement('div');

    item.className =
      'app-backup-item';

    item.dataset.backupManifestCard =
      'incomplete';

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

    item.dataset.backupManifestCard =
      'complete';

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

    setButtonContent(
      restoreButton,
      'arrow-left',
      'Восстановить'
    );

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

  confirm.dataset.restorePreview =
    'true';

  const text =
    document.createElement('p');

  text.textContent =
    'Восстановить страницы из этой резервной копии? Новые файлы, созданные после неё, не удаляются.';

  const actions =
    document.createElement('div');

  actions.className =
    'app-backup-confirm-actions';

  const cancelButton =
    document.createElement('button');

  cancelButton.type =
    'button';

  setButtonContent(
    cancelButton,
    'x',
    'Отмена'
  );

  const confirmButton =
    document.createElement('button');

  confirmButton.type =
    'button';

  confirmButton.className =
    'app-backup-danger';

  setButtonContent(
    confirmButton,
    'arrow-left',
    'Восстановить'
  );

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
        'Восстанавливаю резервную копию...'
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
          `Резервная копия восстановлена: ${result.restoredPages} страниц`
        );

        confirm.classList.add(
          'hidden'
        );

        await onDone();

      } catch (error) {

        console.error(
          'Не удалось восстановить резервную копию.',
          error
        );

        if (
          isPreRestoreBackupFailure(
            error
          )
        ) {

          finishProgressStatus(
            'Восстановление не начато: не удалось создать страховочную резервную копию.',
            {
              status:
                'failed',
              delayMs:
                4200
            }
          );

          return;
        }

        finishProgressStatus(
          'Не удалось восстановить резервную копию',
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


function isPreRestoreBackupFailure(
  error
) {

  const message =
    [
      error?.message,
      error?.cause?.message
    ]
      .filter(Boolean)
      .join(' ');

  return /pre-restore|safety backup|backup was not created/i.test(
    message
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

    return 'Резервная копия';
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
