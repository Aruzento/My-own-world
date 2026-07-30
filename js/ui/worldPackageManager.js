import {
  closePopup,
  registerPopup
} from './popupManager.js';

import {
  iconSvg
} from '../core/icons.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  createWorkspaceBackup
} from '../storage/backupService.js';

import {
  getStorageAdapter,
  hasWorkspaceAccess
} from '../storage/storageAdapter.js';

import {
  state
} from '../state.js';

import {
  applyWorldPackagePageImport,
  createWorldPackageAssetImportReport
} from '../worldPackage/worldPackageImportService.js';

import {
  createWorldPackageFromPages,
  createWorldPackageImportPreview,
  normalizeWorldPackageData
} from '../worldPackage/worldPackageModel.js';

import {
  listWorldPackageFiles,
  loadWorldPackageFile,
  removeWorldPackageFile,
  saveWorldPackageFile
} from '../worldPackage/worldPackageStorage.js';

import {
  finishOperationProgress,
  showOperationProgress
} from './operationProgress.js';

import {
  createProgressMessage
} from '../performance/workspacePerformance.js';


const WORLD_PACKAGE_UI_MIGRATION =
  '0.0.1.8.14.6';


export function setupWorldPackageManager() {

  const trigger =
    document.getElementById('worldPackageManagerBtn');

  const popup =
    document.getElementById('worldPackagePopup');

  if (
    !trigger ||
    !popup
  ) return;

  enhanceToolsTrigger(
    trigger
  );

  const closeManager =
    () => {

      trigger.setAttribute(
        'aria-expanded',
        'false'
      );

      closePopup(
        popup
      );
    };

  const controller =
    registerPopup({
      popup,
      close:
        closeManager,
      anchors:
        [
          trigger
        ],
      key:
        'world-package-popup',
      kind:
        'dialog',
      modal:
        false
    });

  trigger.addEventListener(
    'click',
    async () => {

      closeToolsPopup();

      renderWorldPackagePopup({
        popup,
        controller
      });

      controller.open();

      trigger.setAttribute(
        'aria-expanded',
        'true'
      );
    }
  );
}


function enhanceToolsTrigger(
  trigger
) {

  trigger.dataset.worldPackageToolAction =
    'true';

  trigger.innerHTML =
    `
      <span class="mow-tools-action-icon">${iconSvg('folder-open', 'app-icon', { size: 'sm' })}</span>
      <span class="mow-tools-action-copy">
        <span>Пакеты мира</span>
        <small>Экспорт и import preview</small>
      </span>
    `;
}


function closeToolsPopup() {

  const toolsPopup =
    document.getElementById('appToolsPopup');

  const toolsButton =
    document.getElementById('appToolsBtn');

  if (toolsButton) {

    toolsButton.setAttribute(
      'aria-expanded',
      'false'
    );
  }

  if (toolsPopup) {

    closePopup(
      toolsPopup
    );
  }
}


function renderWorldPackagePopup({
  popup,
  controller
}) {

  popup.dataset.worldPackageUiMigration =
    WORLD_PACKAGE_UI_MIGRATION;

  const model = {
    packageData:
      null,
    preview:
      null,
    assetReport:
      null,
    conflictStrategy:
      'block'
  };

  popup.replaceChildren();

  const header =
    createHeader(
      controller
    );

  const statusStrip =
    createStatusStrip();

  const body =
    document.createElement('div');

  body.className =
    'world-package-body';

  const previewPanel =
    createPreviewPanel({
      model
    });

  const exportPanel =
    createExportPanel({
      model,
      previewPanel
    });

  const libraryPanel =
    createLibraryPanel({
      model,
      previewPanel
    });

  const leftColumn =
    document.createElement('div');

  leftColumn.className =
    'world-package-column';

  leftColumn.append(
    exportPanel.element,
    libraryPanel.element
  );

  body.append(
    leftColumn,
    previewPanel.element
  );

  popup.append(
    header,
    statusStrip,
    body
  );

  void libraryPanel.refresh();
}


function createHeader(
  controller
) {

  const header =
    document.createElement('div');

  header.className =
    'world-package-header';

  const mark =
    document.createElement('span');

  mark.className =
    'world-package-mark';

  mark.innerHTML =
    iconSvg(
      'folder-open',
      'world-package-mark-icon'
    );

  const text =
    document.createElement('div');

  text.className =
    'world-package-title-block';

  const kicker =
    document.createElement('div');

  kicker.className =
    'world-package-kicker';

  kicker.textContent =
    'Import / Export';

  const title =
    document.createElement('h2');

  title.id =
    'worldPackageTitle';

  title.textContent =
    'Пакеты мира';

  const summary =
    document.createElement('p');

  summary.className =
    'world-package-summary';

  summary.textContent =
    'Сохраняйте ветки страниц в package-файлы, проверяйте импорт до записи и применяйте страницы с embedded rule packages через backup.';

  text.append(
    kicker,
    title,
    summary
  );

  const closeButton =
    document.createElement('button');

  closeButton.className =
    'app-popup-close';

  closeButton.type =
    'button';

  closeButton.title =
    'Закрыть';

  closeButton.innerHTML =
    iconSvg(
      'x',
      'app-icon'
    );

  closeButton.addEventListener(
    'click',
    () => controller.close()
  );

  header.append(
    mark,
    text,
    closeButton
  );

  return header;
}


function createStatusStrip() {

  const strip =
    document.createElement('div');

  strip.className =
    'world-package-status-strip';

  [
    ['Export', 'copy', 'ready'],
    ['Preview before write', 'search', 'ready'],
    ['Backup gated', 'check', 'warning'],
    ['Rule packages', 'grid', 'ready'],
    ['Asset preflight', 'search', 'warning']
  ].forEach(([label, iconName, state]) => {

    const item =
      document.createElement('span');

    item.className =
      'world-package-status-chip';

    item.dataset.worldPackageStatus =
      state;

    item.innerHTML =
      `${iconSvg(iconName, 'world-package-status-icon', { size: 'sm' })}<span>${escapeHtml(label)}</span>`;

    strip.appendChild(
      item
    );
  });

  return strip;
}


function createExportPanel({
  model,
  previewPanel
}) {

  const panel =
    createPanel({
      section:
        'export',
      iconName:
        'copy',
      title:
        'Экспорт',
      description:
        'Создает page-only package из текущей ветки или всего workspace.'
    });

  const form =
    document.createElement('div');

  form.className =
    'world-package-form';

  const titleInput =
    document.createElement('input');

  titleInput.type =
    'text';

  titleInput.value =
    createDefaultPackageTitle();

  titleInput.placeholder =
    'Название package';

  titleInput.dataset.overlayAutofocus =
    'true';

  const descriptionInput =
    document.createElement('textarea');

  descriptionInput.rows =
    3;

  descriptionInput.placeholder =
    'Короткое описание для будущего импорта';

  const actionRow =
    document.createElement('div');

  actionRow.className =
    'world-package-actions';

  const branchButton =
    createActionButton({
      iconName:
        'document',
      label:
        'Ветка'
    });

  branchButton.dataset.worldPackageExport =
    'branch';

  const allButton =
    createActionButton({
      iconName:
        'folder-open',
      label:
        'Весь мир'
    });

  allButton.dataset.worldPackageExport =
    'world';

  const result =
    document.createElement('div');

  result.className =
    'world-package-inline-status';

  actionRow.append(
    branchButton,
    allButton
  );

  form.append(
    titleInput,
    descriptionInput,
    actionRow,
    result
  );

  panel.body.appendChild(
    form
  );

  const refreshButtons =
    () => {

      const hasAccess =
        hasWorkspaceAccess(
          getStorageAdapter()
        );

      branchButton.disabled =
        !hasAccess ||
        !state.currentPage;

      allButton.disabled =
        !hasAccess ||
        state.pages.length === 0;

      if (!hasAccess) {

        result.textContent =
          'Откройте workspace, чтобы сохранять package-файлы.';
      }
    };

  const exportPages =
    async pages => {

      if (!pages.length) return;

      branchButton.disabled =
        true;

      allButton.disabled =
        true;

      result.textContent =
        'Сохраняю package...';

      try {

        const title =
          titleInput.value.trim() ||
          createDefaultPackageTitle();

        const packageData =
          createWorldPackageFromPages(
            pages,
            {
              title,
              description:
                descriptionInput.value,
              scope:
                pages.length === state.pages.length
                  ? 'world'
                  : 'selection'
            }
          );

        const path =
          await saveWorldPackageFile(
            getStorageAdapter(),
            packageData.packageId,
            packageData
          );

        model.packageData =
          packageData;

        model.preview =
          createWorldPackageImportPreview({
            packageData,
            existingPages:
              state.pages
          });

        result.textContent =
          `Сохранено: ${path}`;

        setStatus(
          `World Package сохранен: ${packageData.title}`
        );

        await previewPanel.showPackage(
          packageData
        );

        await model.refreshLibrary?.();

      } catch (error) {

        console.error(
          'Не удалось сохранить World Package.',
          error
        );

        result.textContent =
          'Не удалось сохранить package.';

        setStatus(
          'Не удалось сохранить World Package'
        );

      } finally {

        refreshButtons();
      }
    };

  branchButton.addEventListener(
    'click',
    () => exportPages(
      collectCurrentBranchPages()
    )
  );

  allButton.addEventListener(
    'click',
    () => exportPages(
      state.pages
    )
  );

  refreshButtons();

  return {
    element:
      panel.element,
    refresh:
      refreshButtons
  };
}


function createLibraryPanel({
  model,
  previewPanel
}) {

  const panel =
    createPanel({
      section:
        'library',
      iconName:
        'folder-open',
      title:
        'Библиотека',
      description:
        'Package-файлы внутри текущего workspace.'
    });

  const actions =
    document.createElement('div');

  actions.className =
    'world-package-actions';

  const refreshButton =
    createActionButton({
      iconName:
        'search',
      label:
        'Обновить'
    });

  const list =
    document.createElement('div');

  list.className =
    'world-package-library-list';

  actions.appendChild(
    refreshButton
  );

  panel.body.append(
    actions,
    list
  );

  const refresh =
    async () => {

      list.textContent =
        'Загрузка...';

      if (
        !hasWorkspaceAccess(
          getStorageAdapter()
        )
      ) {

        list.textContent =
          'Workspace не выбран.';

        return;
      }

      const files =
        await listWorldPackageFiles(
          getStorageAdapter()
        );

      list.replaceChildren();

      if (files.length === 0) {

        list.textContent =
          'Package-файлов пока нет.';

        return;
      }

      files.forEach(file => {

        const item =
          document.createElement('div');

        item.className =
          'world-package-library-item';

        item.dataset.worldPackageFile =
          file.id;

        const meta =
          document.createElement('div');

        meta.className =
          'world-package-library-meta';

        const title =
          document.createElement('strong');

        title.textContent =
          file.id;

        const path =
          document.createElement('span');

        path.textContent =
          file.path;

        meta.append(
          title,
          path
        );

        const previewButton =
          createIconOnlyButton({
            iconName:
              'search',
            label:
              'Предпросмотр'
          });

        previewButton.dataset.worldPackagePreviewFile =
          file.id;

        previewButton.addEventListener(
          'click',
          async () => {

            const packageData =
              await loadWorldPackageFile(
                getStorageAdapter(),
                file.id
              );

            model.packageData =
              packageData;

            await previewPanel.showPackage(
              packageData
            );
          }
        );

        const removeButton =
          createIconOnlyButton({
            iconName:
              'trash',
            label:
              'Удалить package-файл'
          });

        removeButton.dataset.worldPackageRemoveFile =
          file.id;

        removeButton.addEventListener(
          'click',
          async () => {

            const confirmed =
              window.confirm(
                `Удалить package-файл ${file.id}? Workspace pages не будут затронуты.`
              );

            if (!confirmed) return;

            await removeWorldPackageFile(
              getStorageAdapter(),
              file.id
            );

            setStatus(
              `World Package удален: ${file.id}`
            );

            await refresh();
          }
        );

        item.append(
          meta,
          previewButton,
          removeButton
        );

        list.appendChild(
          item
        );
      });
    };

  model.refreshLibrary =
    refresh;

  refreshButton.addEventListener(
    'click',
    refresh
  );

  return {
    element:
      panel.element,
    refresh
  };
}


function createPreviewPanel({
  model
}) {

  const panel =
    createPanel({
      section:
        'import',
      iconName:
        'search',
      title:
        'Import Preview',
      description:
        'Вставьте JSON package или выберите файл из библиотеки.'
    });

  const textarea =
    document.createElement('textarea');

  textarea.className =
    'world-package-json-input';

  textarea.rows =
    8;

  textarea.spellcheck =
    false;

  textarea.placeholder =
    '{ "packageId": "starter", "title": "Starter", "contents": { "pages": [] } }';

  const actions =
    document.createElement('div');

  actions.className =
    'world-package-actions';

  const previewButton =
    createActionButton({
      iconName:
        'search',
      label:
        'Предпросмотр'
    });

  const applyButton =
    createActionButton({
      iconName:
        'check',
      label:
        'Backup и импорт'
    });

  applyButton.dataset.worldPackageApply =
    'true';

  applyButton.disabled =
    true;

  const preview =
    document.createElement('div');

  preview.className =
    'world-package-preview';

  preview.dataset.worldPackagePreview =
    'empty';

  preview.textContent =
    'Выберите package-файл или вставьте JSON, чтобы увидеть preview до записи.';

  const conflictResolution =
    createConflictResolutionControl({
      model,
      onChange() {

        if (model.packageData) {

          void renderPreview(
            model.packageData
          );
        }
      }
    });

  actions.append(
    previewButton,
    applyButton
  );

  panel.body.append(
    textarea,
    conflictResolution.element,
    actions,
    preview
  );

  const renderPreview =
    async packageData => {

      const normalized =
        normalizeWorldPackageData(
          packageData
        );

      const previewData =
        createWorldPackageImportPreview({
          packageData:
            normalized,
          existingPages:
            state.pages
        });

      model.packageData =
        normalized;

      model.preview =
        previewData;

      model.assetReport =
        null;

      textarea.value =
        JSON.stringify(
          normalized,
          null,
          2
        );

      applyButton.disabled =
        true;

      preview.dataset.worldPackagePreview =
        'blocked';

      preview.textContent =
        'Проверяю package, assets и план импорта...';

      const assetReport =
        await createWorldPackageAssetImportReport({
          packageData:
            normalized,
          storageAdapter:
            getStorageAdapter()
        });

      model.assetReport =
        assetReport;

      renderPreviewResult({
        preview,
        applyButton,
        packageData:
          normalized,
        previewData,
        assetReport,
        conflictStrategy:
          model.conflictStrategy
      });
    };

  const showPackage =
    async packageData => {

      await renderPreview(
        packageData
      );
    };

  previewButton.addEventListener(
    'click',
    async () => {

      try {

        await renderPreview(
          JSON.parse(
            textarea.value
          )
        );

      } catch (error) {

        model.packageData =
          null;

        model.preview =
          null;

        model.assetReport =
          null;

        applyButton.disabled =
          true;

        preview.dataset.worldPackagePreview =
          'invalid';

        preview.textContent =
          'JSON package не читается. Проверьте скобки и кавычки.';

        console.warn(
          'World Package JSON preview failed.',
          error
        );
      }
    }
  );

  applyButton.addEventListener(
    'click',
    async () => {

      if (
        !model.packageData ||
        !canApplyPreview(
          model.preview,
          model.conflictStrategy,
          model.assetReport
        )
      ) return;

      applyButton.disabled =
        true;

      setStatus(
        'Создаю backup перед импортом...'
      );

      try {

        const backupManifest =
          await createWorkspaceBackup({
            reason:
              'world-package-import',
            onProgress:
              setProgressStatus
          });

        const result =
          await applyWorldPackagePageImport({
            packageData:
              model.packageData,
            backupManifest,
            conflictStrategy:
              model.conflictStrategy
          });

        renderTree();

        finishProgressStatus(
          createImportResultMessage(
            result
          )
        );

        await renderPreview(
          model.packageData
        );

      } catch (error) {

        console.error(
          'World Package import failed.',
          error
        );

        finishProgressStatus(
          'Импорт World Package не выполнен',
          {
            status:
              'failed',
            delayMs:
              3200
          }
        );

      } finally {

        applyButton.disabled =
          !canApplyPreview(
            model.preview,
            model.conflictStrategy,
            model.assetReport
          );
      }
    }
  );

  return {
    element:
      panel.element,
    showPackage
  };
}


function createConflictResolutionControl({
  model,
  onChange
}) {

  const element =
    document.createElement('div');

  element.className =
    'world-package-conflict-control';

  element.dataset.worldPackageResolution =
    'true';

  const label =
    document.createElement('span');

  label.className =
    'world-package-conflict-label';

  label.textContent =
    'Конфликты';

  const options =
    document.createElement('div');

  options.className =
    'world-package-conflict-options';

  const modes =
    [
      {
        value:
          'block',
        iconName:
          'stop',
        label:
          'Стоп',
        description:
          'Блокировать импорт, если страницы уже есть в мире.'
      },
      {
        value:
          'skip',
        iconName:
          'skip-forward',
        label:
          'Только новые',
        description:
          'Импортировать только страницы без конфликтов.'
      },
      {
        value:
          'copy',
        iconName:
          'copy',
        label:
          'Копии',
        description:
          'Создать новые страницы для конфликтующих карточек.'
      }
    ];

  const buttons =
    modes.map(mode => {

      const button =
        document.createElement('button');

      button.type =
        'button';

      button.className =
        'world-package-conflict-mode';

      button.dataset.worldPackageConflictMode =
        mode.value;

      button.title =
        mode.description;

      button.setAttribute(
        'aria-label',
        mode.description
      );

      button.innerHTML =
        `${iconSvg(mode.iconName, 'world-package-action-icon', { size: 'sm' })}<span>${escapeHtml(mode.label)}</span>`;

      button.addEventListener(
        'click',
        () => {

          model.conflictStrategy =
            mode.value;

          refresh();

          onChange?.();
        }
      );

      options.appendChild(
        button
      );

      return button;
    });

  const refresh =
    () => {

      buttons.forEach(button => {

        const isActive =
          button.dataset.worldPackageConflictMode ===
          model.conflictStrategy;

        button.dataset.worldPackageConflictActive =
          isActive
            ? 'true'
            : 'false';

        button.setAttribute(
          'aria-pressed',
          String(isActive)
        );
      });
    };

  element.append(
    label,
    options
  );

  refresh();

  return {
    element,
    refresh
  };
}


function renderPreviewResult({
  preview,
  applyButton,
  packageData,
  previewData,
  assetReport = null,
  conflictStrategy = 'block'
}) {

  const reasons =
    getPreviewBlockers(
      previewData,
      conflictStrategy,
      assetReport
    );

  const canApply =
    reasons.length === 0;

  const planCounts =
    getPreviewPlanCounts(
      previewData,
      conflictStrategy
    );

  applyButton.disabled =
    !canApply;

  preview.dataset.worldPackagePreview =
    canApply
      ? 'ready'
      : 'blocked';

  preview.replaceChildren();

  const summary =
    document.createElement('div');

  summary.className =
    'world-package-preview-summary';

  const title =
    document.createElement('strong');

  title.textContent =
    packageData.title;

  const meta =
    document.createElement('span');

  meta.textContent =
    `${previewData.counts.pages} стр. · ${previewData.counts.rulePackages} rules · ${previewData.counts.assets} assets · ${previewData.counts.conflicts} конфликтов · ${getConflictStrategyLabel(conflictStrategy)}`;

  summary.append(
    title,
    meta
  );

  const meters =
    document.createElement('div');

  meters.className =
    'world-package-preview-meters';

  [
    ['Новые', previewData.newPages.length, 'ready'],
    ['Конфликты', previewData.counts.conflicts, previewData.counts.conflicts ? 'danger' : 'ready'],
    ['План', planCounts.pagesToImport, planCounts.pagesToImport || planCounts.rulePackages ? 'ready' : 'warning'],
    ['Rules', planCounts.rulePackages, planCounts.rulePackages ? 'ready' : 'warning'],
    ['Assets', previewData.counts.assets, getAssetMeterState(previewData, assetReport)]
  ].forEach(([label, value, stateName]) => {

    const meter =
      document.createElement('span');

    meter.dataset.worldPackageMeter =
      stateName;

    meter.textContent =
      `${label}: ${value}`;

    meters.appendChild(
      meter
    );
  });

  const blockers =
    document.createElement('div');

  blockers.className =
    'world-package-preview-blockers';

  blockers.dataset.worldPackageApplyState =
    canApply
      ? 'ready'
      : 'blocked';

  blockers.textContent =
    canApply
      ? createPreviewReadyText(
        planCounts,
        conflictStrategy,
        assetReport
      )
      : `Применение заблокировано: ${reasons.join('; ')}.`;

  preview.append(
    summary,
    meters,
    blockers
  );

  appendPreviewList({
    preview,
    title:
      'План импорта',
    items:
      createPreviewPlanItems(
        planCounts,
        conflictStrategy,
        assetReport
      ),
    emptyText:
      'Нет действий для импорта.'
  });

  appendPreviewList({
    preview,
    title:
      'Новые страницы',
    items:
      previewData.newPages.map(page => page.title),
    emptyText:
      'Новых страниц нет.'
  });

  appendPreviewList({
    preview,
    title:
      'Rule packages',
    items:
      createRulePackagePreviewItems(
        packageData
      ),
    emptyText:
      'Rule packages нет.'
  });

  appendPreviewList({
    preview,
    title:
      'Assets',
    items:
      createAssetPreviewItems(
        packageData,
        assetReport
      ),
    emptyText:
      'Asset references нет.'
  });

  appendPreviewList({
    preview,
    title:
      'Конфликты',
    items:
      previewData.conflicts.pages.map(conflict =>
        `${conflict.title} (${conflict.reason})`
      ),
    emptyText:
      'Конфликтов нет.'
  });
}


function getAssetMeterState(
  previewData,
  assetReport
) {

  if (!previewData?.counts?.assets) {

    return 'ready';
  }

  if (!assetReport) {

    return 'warning';
  }

  if (assetReport.missingRequired.length > 0) {

    return 'danger';
  }

  if (assetReport.missingOptional.length > 0) {

    return 'warning';
  }

  return 'ready';
}


function createRulePackagePreviewItems(
  packageData
) {

  return normalizeWorldPackageData(
    packageData
  )
    .contents
    .rulePackages
    .map(rulePackage =>
      `${rulePackage.title} · ${rulePackage.packageId}`
    );
}


function createAssetPreviewItems(
  packageData,
  assetReport
) {

  const reportByPath =
    new Map(
      (assetReport?.entries || [])
        .map(asset => [
          asset.path,
          asset
        ])
    );

  return normalizeWorldPackageData(
    packageData
  )
    .contents
    .assets
    .map(asset => {

      const report =
        reportByPath.get(
          asset.path
        );

      const stateLabel =
        report?.available
          ? 'found'
          : (
            asset.required === false
              ? 'optional missing'
              : 'required missing'
          );

      return `${asset.path} · ${stateLabel}`;
    });
}


function appendPreviewList({
  preview,
  title,
  items,
  emptyText
}) {

  const section =
    document.createElement('div');

  section.className =
    'world-package-preview-list';

  const heading =
    document.createElement('strong');

  heading.textContent =
    title;

  const list =
    document.createElement('div');

  list.className =
    'world-package-preview-items';

  const visibleItems =
    items.slice(
      0,
      5
    );

  if (visibleItems.length === 0) {

    const empty =
      document.createElement('span');

    empty.textContent =
      emptyText;

    list.appendChild(
      empty
    );

  } else {

    visibleItems.forEach(item => {

      const chip =
        document.createElement('span');

      chip.textContent =
        item;

      list.appendChild(
        chip
      );
    });
  }

  if (items.length > visibleItems.length) {

    const more =
      document.createElement('span');

    more.textContent =
      `еще ${items.length - visibleItems.length}`;

    list.appendChild(
      more
    );
  }

  section.append(
    heading,
    list
  );

  preview.appendChild(
    section
  );
}


function getPreviewPlanCounts(
  preview,
  conflictStrategy
) {

  if (!preview) {

    return {
      pagesToImport:
        0,
      copied:
        0,
      skipped:
        0,
      rulePackages:
        0,
      assets:
        0
    };
  }

  const baseCounts = {
    rulePackages:
      preview.counts.rulePackages,
    assets:
      preview.counts.assets
  };

  if (conflictStrategy === 'skip') {

    return {
      ...baseCounts,
      pagesToImport:
        preview.newPages.length,
      copied:
        0,
      skipped:
        preview.counts.conflicts
    };
  }

  if (conflictStrategy === 'copy') {

    return {
      ...baseCounts,
      pagesToImport:
        preview.counts.pages,
      copied:
        preview.counts.conflicts,
      skipped:
        0
    };
  }

  return {
    ...baseCounts,
    pagesToImport:
      preview.counts.pages,
    copied:
      0,
    skipped:
      0
  };
}


function getConflictStrategyLabel(
  conflictStrategy
) {

  if (conflictStrategy === 'skip') {

    return 'только новые';
  }

  if (conflictStrategy === 'copy') {

    return 'копии конфликтов';
  }

  return 'стоп при конфликте';
}


function createPreviewReadyText(
  planCounts,
  conflictStrategy,
  assetReport = null
) {

  const parts =
    [
      `Страницы: ${planCounts.pagesToImport}`
    ];

  if (planCounts.rulePackages > 0) {

    parts.push(
      `Rule packages: ${planCounts.rulePackages}`
    );
  }

  if (assetReport?.total > 0) {

    parts.push(
      `Assets: ${assetReport.available.length}/${assetReport.total}`
    );
  }

  if (assetReport?.missingOptional.length > 0) {

    parts.push(
      `optional missing: ${assetReport.missingOptional.length}`
    );
  }

  if (planCounts.copied > 0) {

    parts.push(
      `копий: ${planCounts.copied}`
    );
  }

  if (planCounts.skipped > 0) {

    parts.push(
      `пропущено: ${planCounts.skipped}`
    );
  }

  parts.push(
    'backup обязателен'
  );

  if (conflictStrategy === 'block') {

    parts.push(
      'без конфликтов'
    );
  }

  return parts.join(
    ' · '
  );
}


function createPreviewPlanItems(
  planCounts,
  conflictStrategy,
  assetReport = null
) {

  const items =
    [
      `Импорт: ${planCounts.pagesToImport}`
    ];

  if (planCounts.rulePackages > 0) {

    items.push(
      `Rule packages: ${planCounts.rulePackages}`
    );
  }

  if (assetReport?.total > 0) {

    items.push(
      `Asset preflight: ${assetReport.available.length}/${assetReport.total}`
    );
  }

  if (conflictStrategy === 'copy') {

    items.push(
      `Копии конфликтов: ${planCounts.copied}`
    );
  }

  if (conflictStrategy === 'skip') {

    items.push(
      `Пропуск конфликтов: ${planCounts.skipped}`
    );
  }

  return items;
}


function getPreviewBlockers(
  preview,
  conflictStrategy = 'block',
  assetReport = null
) {

  if (!preview) {

    return [
      'preview не построен'
    ];
  }

  const blockers =
    [];

  if (!preview.ok) {

    blockers.push(
      'validation errors'
    );
  }

  if (
    preview.counts.conflicts > 0 &&
    conflictStrategy === 'block'
  ) {

    blockers.push(
      'есть конфликты страниц'
    );
  }

  if (
    conflictStrategy === 'skip' &&
    preview.counts.conflicts > 0 &&
    preview.newPages.length === 0 &&
    preview.counts.rulePackages === 0
  ) {

    blockers.push(
      'в режиме "только новые" нечего импортировать'
    );
  }

  if (
    preview.counts.assets > 0 &&
    !assetReport
  ) {

    blockers.push(
      'asset preflight еще не завершен'
    );
  }

  if (assetReport?.missingRequired.length > 0) {

    blockers.push(
      `required assets missing: ${assetReport.missingRequired.length}`
    );
  }

  if (
    preview.counts.pages === 0 &&
    preview.counts.rulePackages === 0
  ) {

    blockers.push(
      'нет страниц для импорта'
    );
  }

  return blockers;
}


function canApplyPreview(
  preview,
  conflictStrategy = 'block',
  assetReport = null
) {

  return getPreviewBlockers(
    preview,
    conflictStrategy,
    assetReport
  ).length === 0;
}


function createPanel({
  section,
  iconName,
  title,
  description
}) {

  const element =
    document.createElement('section');

  element.className =
    'world-package-panel';

  element.dataset.worldPackageSection =
    section;

  const header =
    document.createElement('div');

  header.className =
    'world-package-panel-head';

  const icon =
    document.createElement('span');

  icon.className =
    'world-package-panel-icon';

  icon.innerHTML =
    iconSvg(
      iconName,
      'world-package-panel-icon-svg'
    );

  const copy =
    document.createElement('div');

  copy.className =
    'world-package-panel-copy';

  const heading =
    document.createElement('h3');

  heading.textContent =
    title;

  const text =
    document.createElement('p');

  text.textContent =
    description;

  copy.append(
    heading,
    text
  );

  header.append(
    icon,
    copy
  );

  const body =
    document.createElement('div');

  body.className =
    'world-package-panel-body';

  element.append(
    header,
    body
  );

  return {
    element,
    body
  };
}


function createActionButton({
  iconName,
  label
}) {

  const button =
    document.createElement('button');

  button.className =
    'world-package-action';

  button.type =
    'button';

  button.innerHTML =
    `${iconSvg(iconName, 'world-package-action-icon', { size: 'sm' })}<span>${escapeHtml(label)}</span>`;

  return button;
}


function createIconOnlyButton({
  iconName,
  label
}) {

  const button =
    document.createElement('button');

  button.className =
    'world-package-icon-button';

  button.type =
    'button';

  button.title =
    label;

  button.setAttribute(
    'aria-label',
    label
  );

  button.innerHTML =
    iconSvg(
      iconName,
      'world-package-action-icon',
      {
        size:
          'sm'
      }
    );

  return button;
}


function collectCurrentBranchPages() {

  if (!state.currentPage?.id) return [];

  const result =
    [];

  const visit =
    pageId => {

      const page =
        state.pages.find(candidate =>
          candidate.id === pageId
        );

      if (!page) return;

      result.push(
        page
      );

      state.pages
        .filter(candidate =>
          candidate.parent === pageId
        )
        .forEach(child =>
          visit(
            child.id
          )
        );
    };

  visit(
    state.currentPage.id
  );

  return result;
}


function createDefaultPackageTitle() {

  const title =
    state.currentPage?.title ||
    'World Package';

  return `${title} package`;
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


function createImportResultMessage(
  result
) {

  const parts =
    [
      `Импортировано страниц: ${result.importedPages}`
    ];

  if (result.copiedPages > 0) {

    parts.push(
      `копий: ${result.copiedPages}`
    );
  }

  if (result.skippedPages > 0) {

    parts.push(
      `пропущено: ${result.skippedPages}`
    );
  }

  if (result.importedRulePackages > 0) {

    parts.push(
      `rule packages: ${result.importedRulePackages}`
    );
  }

  if (result.validatedAssets > 0) {

    parts.push(
      `assets checked: ${result.validatedAssets}`
    );
  }

  if (result.missingOptionalAssets > 0) {

    parts.push(
      `optional assets missing: ${result.missingOptionalAssets}`
    );
  }

  return parts.join(
    ' · '
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


function escapeHtml(
  value
) {

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
