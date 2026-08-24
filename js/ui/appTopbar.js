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
  restoreWorkspaceBackupSelection,
  setBackupRetentionLimit
} from '../storage/backupService.js';

import {
  buildWorkspaceRestorePreview
} from '../storage/backupRestorePreview.js';

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


let restorePreviewRequestCounter =
  0;


async function renderRestoreConfirm(
  confirm,
  backup,
  onDone
) {

  const requestId =
    String(
      restorePreviewRequestCounter += 1
    );

  confirm.dataset.restorePreviewRequest =
    requestId;

  confirm.replaceChildren();

  confirm.classList.remove(
    'hidden'
  );

  confirm.dataset.restorePreview =
    'loading';

  confirm.setAttribute(
    'aria-live',
    'polite'
  );

  const loading =
    document.createElement('p');

  loading.className =
    'app-backup-preview-note';

  loading.textContent =
    'Собираю предпросмотр восстановления. Изменения еще не применялись.';

  confirm.appendChild(
    loading
  );

  let preview;

  try {

    preview =
      await buildWorkspaceRestorePreview(
        backup.id
      );

  } catch (error) {

    console.error(
      'Не удалось собрать предпросмотр восстановления.',
      error
    );

    preview =
      createRestorePreviewError(
        backup.id,
        error
      );
  }

  if (
    confirm.dataset.restorePreviewRequest !== requestId
  ) return;

  renderRestorePreviewConfirm(
    confirm,
    backup,
    preview,
    onDone
  );
}


function renderRestorePreviewConfirm(
  confirm,
  backup,
  preview,
  onDone
) {

  confirm.replaceChildren();

  confirm.dataset.restorePreview =
    preview.status;

  const header =
    document.createElement('div');

  header.className =
    'app-backup-preview-header';

  const title =
    document.createElement('strong');

  title.textContent =
    'Предпросмотр восстановления';

  const state =
    document.createElement('span');

  state.dataset.previewStatus =
    preview.blocked
      ? 'blocked'
      : 'ready';

  state.textContent =
    preview.blocked
      ? 'Заблокировано'
      : 'Готово';

  header.append(
    title,
    state
  );

  const text =
    document.createElement('p');

  text.className =
    'app-backup-preview-note';

  text.textContent =
    preview.blocked
      ? 'Backup поврежден или неполный. Восстановление из этого окна не запускается, пока проблема не проверена.'
      : 'Изменения еще не применялись. Restore не удаляет файлы, которых нет в backup.';

  const summary =
    createRestorePreviewSummary(
      preview
    );

  const issues =
    createRestorePreviewIssueSection(
      preview
    );

  const selectedPageNames =
    new Set();

  const partialRestoreNote =
    document.createElement('p');

  partialRestoreNote.className =
    'app-backup-preview-note';

  partialRestoreNote.textContent =
    preview.blocked
      ? 'Частичное восстановление недоступно, пока backup не пройдет проверку.'
      : 'Частичное восстановление затрагивает только выбранные страницы и явно найденные ассеты этих страниц.';

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

  const partialButton =
    document.createElement('button');

  partialButton.type =
    'button';

  partialButton.className =
    'app-backup-partial';

  setButtonContent(
    partialButton,
    'check',
    'Восстановить выбранное'
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
    'Восстановить все'
  );

  const updateRestoreActionState =
    (busy = false) => {

      cancelButton.disabled =
        busy;

      partialButton.disabled =
        busy ||
        preview.blocked ||
        selectedPageNames.size === 0;

      confirmButton.disabled =
        busy ||
        preview.blocked;

      partialButton.title =
        preview.blocked
          ? 'Частичное восстановление заблокировано: backup поврежден или неполный.'
          : selectedPageNames.size === 0
            ? 'Выберите хотя бы одну страницу из backup.'
            : `${selectedPageNames.size} страниц будет восстановлено.`;

      confirmButton.title =
        preview.blocked
          ? 'Восстановление заблокировано: backup поврежден или неполный.'
          : 'Восстановить все страницы и ассеты из backup.';
    };

  const pages =
    createRestorePreviewPageSelectionSection({
      preview,
      selectedPageNames,
      onSelectionChange:
        () => updateRestoreActionState()
    });

  const assets =
    createRestorePreviewSection({
      title:
        'Ассеты',
      items:
        preview.assets,
      getTitle:
        item => item.path || 'Asset без пути',
      getMeta:
        item => item.message || '',
      emptyText:
        'Значимых изменений ассетов нет.'
    });

  cancelButton.addEventListener(
    'click',
    () => confirm.classList.add('hidden')
  );

  partialButton.addEventListener(
    'click',
    async () => {

      updateRestoreActionState(
        true
      );

      setStatus(
        'Восстанавливаю выбранные страницы...'
      );

      try {

        const result =
          await restoreWorkspaceBackupSelection(
            backup.id,
            {
              pageNames:
                [
                  ...selectedPageNames
                ]
            },
            null,
            {
              onProgress:
                setProgressStatus
            }
          );

        await reloadWorkspaceAfterRestore();

        finishProgressStatus(
          `Выбранные страницы восстановлены: ${result.restoredPages}`
        );

        confirm.classList.add(
          'hidden'
        );

        await onDone();

      } catch (error) {

        console.error(
          'Не удалось восстановить выбранные страницы.',
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
          'Не удалось восстановить выбранные страницы',
          {
            status:
              'failed',
            delayMs:
              3200
          }
        );

      } finally {

        updateRestoreActionState();
      }
    }
  );

  confirmButton.addEventListener(
    'click',
    async () => {

      updateRestoreActionState(
        true
      );

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

        updateRestoreActionState();
      }
    }
  );

  actions.append(
    cancelButton,
    partialButton,
    confirmButton
  );

  updateRestoreActionState();

  confirm.append(
    header,
    text,
    summary,
    issues,
    pages,
    partialRestoreNote,
    assets,
    actions
  );
}


function createRestorePreviewIssueSection(
  preview
) {

  const section =
    document.createElement('div');

  section.className =
    'app-backup-preview-section';

  section.hidden =
    preview.issues.length === 0;

  const header =
    document.createElement('div');

  header.className =
    'app-backup-preview-section-title';

  const heading =
    document.createElement('strong');

  heading.textContent =
    'Проверка backup';

  const count =
    document.createElement('span');

  count.textContent =
    `${preview.issues.length} замечаний`;

  header.append(
    heading,
    count
  );

  const list =
    document.createElement('div');

  list.className =
    'app-backup-preview-list';

  preview.issues
    .slice(
      0,
      6
    )
    .forEach(issue => {

      list.appendChild(
        createRestorePreviewIssueItem(
          issue
        )
      );
    });

  if (preview.issues.length > 6) {

    const more =
      document.createElement('p');

    more.className =
      'app-backup-preview-empty';

    more.textContent =
      `Еще ${preview.issues.length - 6} замечаний скрыто в кратком списке.`;

    list.appendChild(
      more
    );
  }

  section.append(
    header,
    list
  );

  return section;
}


function createRestorePreviewIssueItem(
  issue
) {

  const item =
    document.createElement('div');

  item.className =
    'app-backup-preview-item';

  item.dataset.previewStatus =
    issue.restoreBlocking
      ? 'backup-file-missing'
      : 'would-replace';

  const status =
    document.createElement('span');

  status.className =
    'app-backup-preview-state';

  status.textContent =
    issue.restoreBlocking
      ? 'Блокирует'
      : 'Предупреждение';

  const message =
    document.createElement('strong');

  message.textContent =
    issue.message || 'Проблема backup';

  const detail =
    document.createElement('span');

  detail.textContent =
    issue.path || issue.code || '';

  item.append(
    status,
    message,
    detail
  );

  return item;
}


function createRestorePreviewSummary(
  preview
) {

  const summary =
    document.createElement('div');

  summary.className =
    'app-backup-preview-summary';

  summary.append(
    createRestorePreviewStat(
      'Страницы',
      [
        `добавит ${preview.summary.pages.wouldAdd}`,
        `заменит ${preview.summary.pages.wouldReplace}`,
        `без изменений ${preview.summary.pages.unchanged}`,
        `проблем ${preview.summary.pages.backupProblems}`
      ]
    ),
    createRestorePreviewStat(
      'Ассеты',
      [
        `добавит ${preview.summary.assets.wouldAdd}`,
        `заменит ${preview.summary.assets.wouldReplace}`,
        `без изменений ${preview.summary.assets.unchanged}`,
        `доступно ${preview.summary.assets.backupAvailable}`,
        `нет сейчас ${preview.summary.assets.currentMissing}`,
        `проблем ${preview.summary.assets.backupProblems}`
      ]
    )
  );

  return summary;
}


function createRestorePreviewStat(
  title,
  lines
) {

  const item =
    document.createElement('div');

  item.className =
    'app-backup-preview-stat';

  const label =
    document.createElement('strong');

  label.textContent =
    title;

  const value =
    document.createElement('span');

  value.textContent =
    lines.join(' · ');

  item.append(
    label,
    value
  );

  return item;
}


function createRestorePreviewPageSelectionSection({
  preview,
  selectedPageNames,
  onSelectionChange
}) {

  const section =
    document.createElement('div');

  section.className =
    'app-backup-preview-section';

  const header =
    document.createElement('div');

  header.className =
    'app-backup-preview-section-title';

  const heading =
    document.createElement('strong');

  heading.textContent =
    'Страницы';

  const count =
    document.createElement('span');

  const updateCount =
    () => {

      count.textContent =
        preview.blocked
          ? `${preview.pages.length} записей`
          : `${selectedPageNames.size} выбрано из ${preview.pages.length}`;
    };

  updateCount();

  header.append(
    heading,
    count
  );

  const list =
    document.createElement('div');

  list.className =
    'app-backup-preview-list';

  if (preview.pages.length === 0) {

    const empty =
      document.createElement('p');

    empty.className =
      'app-backup-preview-empty';

    empty.textContent =
      'Страниц для выбора нет.';

    list.appendChild(
      empty
    );

  } else {

    preview.pages.forEach(item => {

      list.appendChild(
        createRestorePreviewSelectablePageItem({
          item,
          preview,
          selectedPageNames,
          onSelectionChange:
            () => {

              updateCount();
              onSelectionChange?.();
            }
        })
      );
    });
  }

  section.append(
    header,
    list
  );

  return section;
}


function createRestorePreviewSelectablePageItem({
  item,
  preview,
  selectedPageNames,
  onSelectionChange
}) {

  const title =
    item.title || item.name || 'Без названия';

  const row =
    createRestorePreviewItem({
      item,
      title,
      meta:
        item.path || item.name || ''
    });

  row.classList.add(
    'app-backup-preview-selectable'
  );

  const checkbox =
    document.createElement('input');

  checkbox.className =
    'app-backup-preview-check';

  checkbox.type =
    'checkbox';

  checkbox.disabled =
    preview.blocked ||
    item.status === 'backup-file-missing' ||
    item.status === 'backup-entry-invalid';

  checkbox.setAttribute(
    'aria-label',
    `Выбрать страницу для восстановления: ${title}`
  );

  checkbox.addEventListener(
    'change',
    () => {

      if (checkbox.checked) {

        selectedPageNames.add(
          item.name
        );

      } else {

        selectedPageNames.delete(
          item.name
        );
      }

      onSelectionChange?.();
    }
  );

  row.addEventListener(
    'click',
    event => {

      if (
        checkbox.disabled ||
        event.target === checkbox
      ) return;

      checkbox.click();
    }
  );

  row.prepend(
    checkbox
  );

  return row;
}


function createRestorePreviewSection({
  title,
  items,
  getTitle,
  getMeta,
  emptyText
}) {

  const section =
    document.createElement('div');

  section.className =
    'app-backup-preview-section';

  const header =
    document.createElement('div');

  header.className =
    'app-backup-preview-section-title';

  const heading =
    document.createElement('strong');

  heading.textContent =
    title;

  const count =
    document.createElement('span');

  count.textContent =
    `${items.length} записей`;

  header.append(
    heading,
    count
  );

  const list =
    document.createElement('div');

  list.className =
    'app-backup-preview-list';

  const meaningfulItems =
    items.filter(item =>
      item.status !== 'unchanged'
    );

  if (meaningfulItems.length === 0) {

    const empty =
      document.createElement('p');

    empty.className =
      'app-backup-preview-empty';

    empty.textContent =
      emptyText;

    list.appendChild(
      empty
    );

  } else {

    meaningfulItems
      .slice(
        0,
        8
      )
      .forEach(item => {

        list.appendChild(
          createRestorePreviewItem({
            item,
            title:
              getTitle(
                item
              ),
            meta:
              getMeta(
                item
              )
          })
        );
      });

    if (meaningfulItems.length > 8) {

      const more =
        document.createElement('p');

      more.className =
        'app-backup-preview-empty';

      more.textContent =
        `Еще ${meaningfulItems.length - 8} изменений скрыто в кратком списке.`;

      list.appendChild(
        more
      );
    }
  }

  section.append(
    header,
    list
  );

  return section;
}


function createRestorePreviewItem({
  item,
  title,
  meta
}) {

  const row =
    document.createElement('div');

  row.className =
    'app-backup-preview-item';

  row.dataset.previewStatus =
    item.status;

  const status =
    document.createElement('span');

  status.className =
    'app-backup-preview-state';

  status.textContent =
    getRestorePreviewStatusLabel(
      item.status
    );

  const name =
    document.createElement('strong');

  name.textContent =
    title;

  const detail =
    document.createElement('span');

  detail.textContent =
    meta;

  row.append(
    status,
    name,
    detail
  );

  return row;
}


function getRestorePreviewStatusLabel(
  status
) {

  switch (status) {

    case 'would-add':
      return 'Будет добавлено';

    case 'would-replace':
      return 'Будет заменено';

    case 'backup-file-missing':
      return 'Проблема backup';

    case 'backup-entry-invalid':
      return 'Проблема manifest';

    default:
      return 'Без изменений';
  }
}


function createRestorePreviewError(
  backupId,
  error
) {

  return {
    backupId,
    status:
      'blocked',
    blocked:
      true,
    message:
      'Предпросмотр заблокирован: backup поврежден или неполный.',
    manifest:
      null,
    pages:
      [],
    assets:
      [],
    summary: {
      pages: {
        total:
          0,
        wouldAdd:
          0,
        wouldReplace:
          0,
        unchanged:
          0,
        backupProblems:
          1
      },
      assets: {
        total:
          0,
        wouldAdd:
          0,
        wouldReplace:
          0,
        unchanged:
          0,
        currentPresent:
          0,
        currentMissing:
          0,
        backupAvailable:
          0,
        backupProblems:
          0
      },
      issueCount:
        1
    },
    issues: [
      {
        code:
          'preview-unavailable',
        message:
          error?.message || 'Не удалось собрать предпросмотр восстановления.'
      }
    ]
  };
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
