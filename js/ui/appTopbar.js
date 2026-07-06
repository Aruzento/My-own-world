import {
  registerPopup,
  togglePopupNearAnchor,
  closePopup
} from './popupManager.js';

import {
  state
} from '../state.js';

import {
  cleanupWorkspaceBackups,
  createWorkspaceBackup,
  getBackupRetentionLimit,
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

const APPEARANCE_STORAGE_KEY =
  'myOwnWorld.appearance';

const DEFAULT_APPEARANCE =
  Object.freeze({
    theme: 'dark',
    accent: 'gold',
    background: 'stone',
    scale: 'normal'
  });


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

      await renderAssetHealthPanel(
        settingsPopup
      );

      renderAppearancePanel(
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


function updateStoredAppearance(
  patch
) {

  const next =
    {
      ...getStoredAppearance(),
      ...patch
    };

  localStorage.setItem(
    APPEARANCE_STORAGE_KEY,
    JSON.stringify(next)
  );

  applyAppearance(
    next
  );
}


function applyStoredAppearance() {

  applyAppearance(
    getStoredAppearance()
  );
}


function getStoredAppearance() {

  try {

    const parsed =
      JSON.parse(
        localStorage.getItem(APPEARANCE_STORAGE_KEY) || '{}'
      );

    return normalizeAppearance(
      parsed
    );

  } catch {

    return {
      ...DEFAULT_APPEARANCE
    };
  }
}


function normalizeAppearance(
  value
) {

  const next =
    {
      ...DEFAULT_APPEARANCE
    };

  if (['dark'].includes(value.theme)) {

    next.theme =
      value.theme;
  }

  if (['gold', 'blue', 'green', 'purple', 'red'].includes(value.accent)) {

    next.accent =
      value.accent;
  }

  if (['stone', 'forest', 'arcane'].includes(value.background)) {

    next.background =
      value.background;
  }

  if (['compact', 'normal', 'large'].includes(value.scale)) {

    next.scale =
      value.scale;
  }

  return next;
}


function applyAppearance({
  theme,
  accent,
  background,
  scale
}) {

  document.body.dataset.theme =
    theme;

  document.body.dataset.accent =
    accent;

  document.body.dataset.bg =
    background;

  document.body.dataset.uiScale =
    scale;
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

  const retention =
    createBackupRetentionControls({
      onCleanup:
        () => renderBackupList(
          list,
          confirm
        )
    });

  panel.append(
    title,
    description,
    createButton,
    retention,
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
    'РҐСЂР°РЅРёС‚СЊ backup';

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
    'РџСЂРёРјРµРЅРёС‚СЊ';

  const cleanupButton =
    document.createElement('button');

  cleanupButton.type =
    'button';

  cleanupButton.textContent =
    'РћС‡РёСЃС‚РёС‚СЊ СЃС‚Р°СЂС‹Рµ';

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
        'РћС‡РёС‰Р°СЋ СЃС‚Р°СЂС‹Рµ backup...'
      );

      try {

        const result =
          await cleanupWorkspaceBackups({
            keepLatest:
              getBackupRetentionLimit()
          });

        setStatus(
          `Backup cleanup: СѓРґР°Р»РµРЅРѕ ${result.removed}`
        );

        await onCleanup?.();

      } catch (error) {

        console.error(
          'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‡РёСЃС‚РёС‚СЊ backup.',
          error
        );

        setStatus(
          'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‡РёСЃС‚РёС‚СЊ backup'
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
