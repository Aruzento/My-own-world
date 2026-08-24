import {
  state
} from '../state.js';

import {
  getWorkspacePerformanceEvents
} from '../performance/workspacePerformance.js';

import {
  BACKUP_ROOT_DIR,
  requireWorkspaceBackupBeforeRiskyOperation,
  listIncompleteWorkspaceBackups,
  listWorkspaceBackups
} from '../storage/backupService.js';

import {
  buildAssetVerificationReport,
  buildBrokenInternalLinkReport,
  buildOrphanReviewReport,
  buildRepairPreviewModel,
  createRepairPreviewPlan,
  updatePageParent
} from '../storage/storage.js';

import {
  listWorkspaceAssetPaths
} from '../storage/assetWorkspaceService.js';

import {
  getStorageAdapter,
  hasWorkspaceAccess,
  queryWorkspaceWritePermission
} from '../storage/storageAdapter.js';

import {
  collectWorkspaceAccessDiagnostics
} from '../storage/workspaceAccessDiagnostics.js';

import {
  listPendingWorkspaceOperations
} from '../storage/operationJournal.js';

import {
  validateWorkspaceSnapshot
} from '../schema/workspaceSchema.js';

import {
  applyWorkspaceRepairActions,
  createWorkspaceRecoveryReport
} from '../schema/schemaRecovery.js';

import {
  renderTree
} from '../tree/tree.js';

import {
  createSettingsSectionHeader,
  setButtonContent
} from './settingsPanelUI.js';

const LARGE_PAGE_BYTES =
  250 * 1024;

const SLOW_OPERATION_MS =
  1000;


export async function renderWorkspaceDiagnosticsPanel(
  popup,
  options = {}
) {

  popup
    .querySelector('.app-workspace-diagnostics-panel')
    ?.remove();

  const panel =
    document.createElement('section');

  panel.className =
    'app-workspace-diagnostics-panel';

  panel.dataset.settingsSection =
    'diagnostics';

  const header =
    createSettingsSectionHeader({
      iconName:
        'check',
      title:
        'Диагностика рабочей папки',
      description:
        'Размер мира, ассеты, тяжелые карты, схема и операции.'
    });

  const refreshButton =
    document.createElement('button');

  refreshButton.className =
    'app-workspace-diagnostics-primary';

  refreshButton.type =
    'button';

  setButtonContent(
    refreshButton,
    'check',
    'Обновить диагностику'
  );

  const result =
    document.createElement('div');

  result.className =
    'app-workspace-diagnostics-result';

  panel.append(
    header,
    refreshButton,
    result
  );

  popup.appendChild(
    panel
  );

  const hasWorkspace =
    options.hasWorkspace ??
    hasWorkspaceAccess(
      getStorageAdapter()
    );

  if (!hasWorkspace) {

    refreshButton.disabled =
      true;

    result.textContent =
      'Рабочая папка не выбрана.';

    return;
  }

  const refresh =
    async () => {

      refreshButton.disabled =
        true;

      result.textContent =
        'Собираю диагностику...';

      try {

        const diagnostics =
          await collectWorkspaceDiagnostics(
            options
          );

        renderDiagnosticsResult(
          result,
          diagnostics,
          {
            ...options,
            refreshDiagnostics:
              refresh
          }
        );

      } catch (error) {

        console.error(
          'Не удалось собрать диагностику рабочей папки.',
          error
        );

        result.textContent =
          'Не удалось собрать диагностику рабочей папки.';

      } finally {

        refreshButton.disabled =
          false;
      }
    };

  refreshButton.addEventListener(
    'click',
    refresh
  );

  if (options.autoRun) {

    await refresh();
  }
}


export async function collectWorkspaceDiagnostics(
  options = {}
) {

  const pages =
    options.pages ||
    state.pages ||
    [];

  let assetPaths =
    [];

  let assetScanError =
    null;

  try {

    assetPaths =
      await getAssetPaths(
        options
      );

  } catch (error) {

    assetScanError =
      error;
  }

  const schema =
    validateWorkspaceSnapshot({
      schemaVersion:
        options.schemaVersion,
      pages
    });

  const recoveryReport =
    createWorkspaceRecoveryReport(
      schema
    );

  const workspace =
    await createWorkspaceStatus(
      options
    );

  const backup =
    await createBackupStatus(
      options
    );

  const pendingOperations =
    await getPendingOperations(
      options
    );

  const checkpoint =
    normalizeCheckpoint(
      options.workspaceCheckpoint ??
      state.workspaceCheckpoint
    );

  const assetVerification =
    buildAssetVerificationReport({
      pages,
      assetPaths,
      assetScanError
    });

  const brokenAssets =
    assetVerification.referencedMissing;

  const orphanAssets =
    assetVerification.orphanCandidates;

  const internalLinkDiagnostics =
    buildBrokenInternalLinkReport({
      pages
    });

  const brokenInternalLinks =
    internalLinkDiagnostics.issues;

  const orphanReview =
    buildOrphanReviewReport({
      assetVerification,
      internalLinkDiagnostics,
      schema
    });

  const repairPreview =
    buildRepairPreviewModel({
      pages,
      internalLinkDiagnostics
    });

  const pageStats =
    createPageStats(
      pages
    );

  const heavyMaps =
    pages
      .filter(isCampaignMapPage)
      .map(inspectCampaignMapPage)
      .sort((a, b) =>
        b.score - a.score
      )
      .slice(
        0,
        8
      );

  const performanceEvents =
    (
      options.performanceEvents ||
      getWorkspacePerformanceEvents()
    )
      .slice(
        0,
        8
      );

  const slowOperations =
    performanceEvents.filter(event =>
      Number(event.durationMs || 0) >= SLOW_OPERATION_MS
    );

  const warnings =
    createWarnings({
      workspace,
      schema,
      checkpoint,
      backup,
      pendingOperations,
      brokenAssets,
      orphanAssets,
      assetCheckFailures:
        assetVerification.checkFailures,
      brokenInternalLinks,
      pageStats,
      heavyMaps,
      slowOperations
    });

  return {
    summary: {
      pages:
        pages.length,
      campaignMaps:
        pages.filter(isCampaignMapPage).length,
      taskTrackers:
        pages.filter(page => page.template === 'taskTracker').length,
      ruleTrees:
        pages.filter(page => page.template === 'ruleTree').length,
      assets:
        assetPaths.length,
      brokenAssets:
        brokenAssets.length,
      orphanAssets:
        orphanAssets.length,
      assetCheckFailures:
        assetVerification.summary.checkFailures,
      brokenInternalLinks:
        brokenInternalLinks.length,
      orphanReviewCandidates:
        orphanReview.summary.candidateCount,
      schemaIssues:
        schema.issues.length,
      schemaErrors:
        schema.errors.length,
      backups:
        backup.completeCount,
      incompleteBackups:
        backup.incompleteCount,
      pendingOperations:
        pendingOperations.length,
      warnings:
        warnings.length
    },
    workspace,
    schema,
    recoveryReport,
    checkpoint,
    backup,
    pendingOperations,
    pageStats,
    assetGroups:
      groupAssetPaths(
        assetPaths
      ),
    brokenAssets:
      brokenAssets.slice(
        0,
        8
      ),
    orphanAssets:
      orphanAssets.slice(
        0,
        8
      ),
    assetCheckFailures:
      assetVerification.checkFailures.slice(
        0,
        8
      ),
    internalLinkDiagnostics,
    orphanReview,
    repairPreview,
    heavyMaps,
    performanceEvents,
    warnings
  };
}


async function createWorkspaceStatus(
  options
) {

  const adapter =
    options.storageAdapter ||
    getStorageAdapter();

  const hasAccess =
    options.hasWorkspace ??
    hasWorkspaceAccess(
      adapter
    );

  let canWrite =
    options.canWriteWorkspace;

  if (canWrite === undefined) {

    try {

      canWrite =
        await queryWorkspaceWritePermission(
          adapter
        );

    } catch (error) {

      canWrite =
        false;
    }
  }

  const handle =
    adapter.getWorkspaceHandle?.();

  const path =
    options.workspacePath ||
    adapter.getWorkspaceRoot?.() ||
    handle?.name ||
    '';

  const access =
    await collectWorkspaceAccessDiagnostics({
      storageAdapter:
        adapter,
      workspacePath:
        path,
      hasWorkspace:
        hasAccess,
      canWriteWorkspace:
        canWrite,
      homePath:
        options.homePath,
      platform:
        options.platform,
      writeProbe:
        options.writeProbe ??
        adapter.kind === 'desktop'
    });

  canWrite =
    access.canWriteKnown
      ? access.canWrite
      : canWrite;

  return {
    mode:
      adapter.kind || 'неизвестно',
    path:
      path || 'Рабочая папка не выбрана',
    hasAccess:
      Boolean(hasAccess),
    canWrite:
      Boolean(canWrite),
    access,
    backupPath:
      path && adapter.kind === 'desktop'
        ? `${path}\\${BACKUP_ROOT_DIR}`
        : `${BACKUP_ROOT_DIR} в выбранной рабочей папке`
  };
}


async function createBackupStatus(
  options
) {

  if (options.backupStatus) {

    return normalizeBackupStatus(
      options.backupStatus
    );
  }

  if (options.listBackups) {

    const backups =
      await options.listBackups();

    const incomplete =
      options.listIncompleteBackups
        ? await options.listIncompleteBackups()
        : [];

    return normalizeBackupStatus({
      backups,
      incomplete
    });
  }

  try {

    const adapter =
      options.storageAdapter ||
      getStorageAdapter();

    const backups =
      await listWorkspaceBackups(
        adapter
      );

    const incomplete =
      await listIncompleteWorkspaceBackups(
        {
          storageAdapter:
            adapter
        }
      );

    return normalizeBackupStatus({
      backups,
      incomplete
    });

  } catch (error) {

    return normalizeBackupStatus({
      backups: [],
      incomplete: [],
      error:
        error?.message || String(error)
    });
  }
}


function normalizeBackupStatus({
  backups = [],
  incomplete = [],
  error = ''
} = {}) {

  const latest =
    backups[0] || null;

  return {
    completeCount:
      backups.length,
    incompleteCount:
      incomplete.length,
    latestId:
      latest?.id || '',
    latestReason:
      latest?.reason || '',
    latestAt:
      latest?.createdAt || '',
    error
  };
}


async function getPendingOperations(
  options
) {

  if (Array.isArray(options.pendingOperations)) {

    return options.pendingOperations;
  }

  if (options.listPendingOperations) {

    return options.listPendingOperations();
  }

  try {

    return await listPendingWorkspaceOperations(
      options.storageAdapter ||
      getStorageAdapter()
    );

  } catch (error) {

    return [];
  }
}


function normalizeCheckpoint(
  checkpoint
) {

  if (!checkpoint) {

    return {
      ok: null,
      checkedAt: '',
      schemaIssues: null,
      treeErrors: null,
      pendingOperations: null
    };
  }

  return {
    ok:
      checkpoint.ok === true,
    checkedAt:
      checkpoint.checkedAt || '',
    schemaIssues:
      checkpoint.schemaIssues ?? null,
    treeErrors:
      checkpoint.treeErrors ?? null,
    pendingOperations:
      checkpoint.pendingOperations ?? null
  };
}


async function getAssetPaths(
  options
) {

  if (options.listAssetPaths) {

    return options.listAssetPaths();
  }

  return listWorkspaceAssetPaths(
    options
  );
}


function createPageStats(
  pages
) {

  const pagesWithSize =
    pages.map(page => {

      const sizeBytes =
        getTextSizeBytes(
          getPageHTML(
            page
          )
        );

      return {
        id:
          page.id,
        title:
          page.title || page.name || page.id,
        template:
          page.template || 'card',
        type:
          page.type || '',
        sizeBytes
      };
    });

  return {
    largest:
      pagesWithSize
        .slice()
        .sort((a, b) =>
          b.sizeBytes - a.sizeBytes
        )
        .slice(
          0,
          6
        ),
    largeCount:
      pagesWithSize.filter(page =>
        page.sizeBytes >= LARGE_PAGE_BYTES
      ).length
  };
}


function inspectCampaignMapPage(
  page
) {

  const html =
    getPageHTML(
      page
    );

  const doc =
    new DOMParser()
      .parseFromString(
        html,
        'text/html'
      );

  const stage =
    doc.querySelector('.campaign-map-stage');

  const tokenCount =
    doc.querySelectorAll('.campaign-map-token').length;

  const shapeCount =
    doc.querySelectorAll('.campaign-map-shape').length;

  const lockedFogZones =
    parseEncodedJSON(
      stage?.dataset.fogLockedZones,
      []
    ).length;

  const layers =
    parseEncodedJSON(
      stage?.dataset.layerState,
      []
    ).length;

  const music =
    parseEncodedJSON(
      stage?.dataset.mapMusicState,
      {}
    );

  const trackCount =
    countPlaylistTracks(
      music
    );

  const sizeBytes =
    getTextSizeBytes(
      html
    );

  const score =
    tokenCount * 2 +
    shapeCount +
    lockedFogZones * 3 +
    layers * 4 +
    Math.round(sizeBytes / 50000);

  return {
    id:
      page.id,
    title:
      page.title || page.name || page.id,
    tokenCount,
    shapeCount,
    lockedFogZones,
    layers,
    trackCount,
    hasBackground:
      Boolean(stage?.dataset.mapAsset),
    sizeBytes,
    score
  };
}


function renderDiagnosticsResult(
  container,
  diagnostics,
  options = {}
) {

  container.replaceChildren();

  container.appendChild(
    createWorkspaceStatusSection(
      diagnostics
    )
  );

  container.appendChild(
    createSummaryGrid(
      diagnostics.summary
    )
  );

  if (diagnostics.warnings.length) {

    container.appendChild(
      createListSection(
        'Что требует внимания',
        diagnostics.warnings,
        item => item
      )
    );

  } else {

    const ok =
      document.createElement('div');

    ok.className =
      'app-workspace-diagnostics-summary is-ok';

    ok.dataset.healthBadge =
      'ok';

    ok.textContent =
      'Критичных предупреждений не найдено.';

    container.appendChild(
      ok
    );
  }

  container.appendChild(
    createSchemaRecoverySection(
      diagnostics,
      {
        ...options,
        container
      }
    )
  );

  container.appendChild(
    createListSection(
      'Внутренние ссылки',
      diagnostics.internalLinkDiagnostics?.groups || [],
      formatInternalLinkGroup
    )
  );

  container.appendChild(
    createListSection(
      'Проверка связности',
      diagnostics.orphanReview?.groups || [],
      formatOrphanReviewGroup
    )
  );

  container.appendChild(
    createRepairPreviewSection(
      diagnostics.repairPreview
    )
  );

  container.appendChild(
    createListSection(
      'Тяжелые карты',
      diagnostics.heavyMaps,
      map => `${map.title}: tokens ${map.tokenCount}, shapes ${map.shapeCount}, fog zones ${map.lockedFogZones}, ${formatBytes(map.sizeBytes)}`
    )
  );

  container.appendChild(
    createListSection(
      'Самые большие страницы',
      diagnostics.pageStats.largest,
      page => `${page.title}: ${formatBytes(page.sizeBytes)}`
    )
  );

  container.appendChild(
    createListSection(
      'Ассеты по типам',
      Object.entries(diagnostics.assetGroups),
      ([group, count]) => `${group}: ${count}`
    )
  );

  container.appendChild(
    createListSection(
      'Последние операции',
      diagnostics.performanceEvents,
      event => `${event.operation}: ${event.durationMs} ms (${event.status})`
    )
  );
}


function createSchemaRecoverySection(
  diagnostics,
  options = {}
) {

  const report =
    diagnostics.recoveryReport ||
    createWorkspaceRecoveryReport(
      diagnostics.schema
    );

  const section =
    document.createElement('div');

  section.className =
    'app-workspace-diagnostics-section app-workspace-recovery-section';

  const heading =
    document.createElement('h4');

  heading.textContent =
    'Проблемы схемы и восстановление';

  section.appendChild(
    heading
  );

  if (!report.issueCount) {

    const ok =
      document.createElement('div');

    ok.className =
      'app-workspace-diagnostics-summary is-ok';

    ok.dataset.healthBadge =
      'schema-ok';

    ok.textContent =
      'Схема рабочей папки выглядит нормально. Исправления не нужны.';

    section.appendChild(
      ok
    );

    return section;
  }

  const intro =
    document.createElement('p');

  intro.className =
    'app-workspace-recovery-intro';

  intro.textContent =
    `Найдено ${report.issueCount} проблем: ${report.errorCount} ошибок и ${report.warningCount} предупреждений. Ниже они сгруппированы по смыслу, чтобы не чинить большой workspace вслепую.`;

  section.appendChild(
    intro
  );

  section.appendChild(
    createRecoveryStatsGrid(
      report
    )
  );

  section.appendChild(
    createRecoveryGroupList(
      report.issueGroups || []
    )
  );

  const repairControls =
    createRecoveryRepairControls(
      report,
      options
    );

  if (repairControls) {

    section.appendChild(
      repairControls
    );
  }

  return section;
}


function createRepairPreviewSection(
  model = null
) {

  const section =
    document.createElement('div');

  section.className =
    'app-workspace-diagnostics-section app-workspace-repair-preview-section';

  section.dataset.repairPreviewSection =
    'true';

  const heading =
    document.createElement('h4');

  heading.textContent =
    'Предпросмотр плана правки';

  const intro =
    document.createElement('p');

  intro.className =
    'app-workspace-repair-preview-intro';

  intro.textContent =
    'Только предпросмотр: выберите проблему и конкретную страницу-цель. Записи, резервные копии и изменения репозитория здесь не выполняются.';

  section.append(
    heading,
    intro
  );

  if (!model?.diagnostics?.length) {

    const empty =
      document.createElement('div');

    empty.className =
      'app-workspace-diagnostics-summary is-ok';

    empty.dataset.repairPreviewState =
      'empty';

    empty.textContent =
      'Поддерживаемых предпросмотров правки для текущих диагностик нет.';

    section.appendChild(
      empty
    );

    return section;
  }

  const controls =
    document.createElement('div');

  controls.className =
    'app-workspace-repair-preview-controls';

  const diagnosticSelect =
    createRepairPreviewSelect({
      label:
        'Проблема',
      dataName:
        'diagnostic',
      placeholder:
        'Выберите ссылку или отношение',
      options:
        model.diagnostics.map(diagnostic => ({
          value:
            diagnostic.id,
          label:
            diagnostic.label
        }))
    });

  const targetSelect =
    createRepairPreviewSelect({
      label:
        'Новая цель',
      dataName:
        'target',
      placeholder:
        'Выберите страницу-цель',
      options:
        model.targets.map(target => ({
          value:
            target.id,
          label:
            formatRepairPreviewTargetOption(
              target
            )
        }))
    });

  const actionRow =
    document.createElement('div');

  actionRow.className =
    'app-workspace-repair-preview-actions';

  const previewButton =
    document.createElement('button');

  previewButton.type =
    'button';

  previewButton.dataset.repairPreviewShow =
    'true';

  previewButton.textContent =
    'Показать план';

  const cancelButton =
    document.createElement('button');

  cancelButton.type =
    'button';

  cancelButton.dataset.repairPreviewCancel =
    'true';

  cancelButton.textContent =
    'Сбросить';

  actionRow.append(
    previewButton,
    cancelButton
  );

  const status =
    document.createElement('div');

  status.className =
    'app-workspace-repair-preview-status';

  status.dataset.repairPreviewStatus =
    'waiting';

  status.setAttribute(
    'role',
    'status'
  );

  status.textContent =
    'План не создан. Сначала выберите проблему и цель.';

  const output =
    document.createElement('div');

  output.className =
    'app-workspace-repair-preview-output';

  output.dataset.repairPreviewOutput =
    'empty';

  const renderCurrentPlan =
    () => {

      const plan =
        createRepairPreviewPlan({
          model,
          diagnosticId:
            diagnosticSelect.select.value,
          targetPageId:
            targetSelect.select.value
        });

      renderRepairPreviewPlan(
        output,
        status,
        plan
      );
    };

  const updateButtonState =
    () => {

      previewButton.disabled =
        !diagnosticSelect.select.value ||
        !targetSelect.select.value;
    };

  diagnosticSelect.select.addEventListener(
    'change',
    () => {

      output.replaceChildren();

      output.dataset.repairPreviewOutput =
        'empty';

      status.dataset.repairPreviewStatus =
        'waiting';

      status.textContent =
        diagnosticSelect.select.value
          ? 'Выберите страницу-цель. Неоднозначные совпадения не выбираются автоматически.'
          : 'План не создан. Сначала выберите проблему и цель.';

      updateButtonState();
    }
  );

  targetSelect.select.addEventListener(
    'change',
    () => {

      updateButtonState();

      if (
        output.dataset.repairPreviewOutput === 'ready' &&
        diagnosticSelect.select.value
      ) {

        renderCurrentPlan();
      }
    }
  );

  previewButton.addEventListener(
    'click',
    renderCurrentPlan
  );

  cancelButton.addEventListener(
    'click',
    () => {

      diagnosticSelect.select.value =
        '';

      targetSelect.select.value =
        '';

      output.replaceChildren();

      output.dataset.repairPreviewOutput =
        'empty';

      status.dataset.repairPreviewStatus =
        'cancelled';

      status.textContent =
        'Предпросмотр закрыт. Изменения не применялись.';

      updateButtonState();
    }
  );

  updateButtonState();

  controls.append(
    diagnosticSelect.wrap,
    targetSelect.wrap,
    actionRow
  );

  section.append(
    controls,
    status,
    output
  );

  return section;
}


function createRepairPreviewSelect({
  label,
  dataName,
  placeholder,
  options
}) {

  const wrap =
    document.createElement('label');

  wrap.className =
    'app-workspace-repair-preview-field';

  const caption =
    document.createElement('span');

  caption.textContent =
    label;

  const select =
    document.createElement('select');

  select.dataset[`repairPreview${capitalizeDataName(dataName)}`] =
    'true';

  const empty =
    document.createElement('option');

  empty.value =
    '';

  empty.textContent =
    placeholder;

  select.appendChild(
    empty
  );

  options.forEach(option => {

    const item =
      document.createElement('option');

    item.value =
      option.value;

    item.textContent =
      option.label;

    select.appendChild(
      item
    );
  });

  wrap.append(
    caption,
    select
  );

  return {
    wrap,
    select
  };
}


function renderRepairPreviewPlan(
  output,
  status,
  plan
) {

  output.replaceChildren();

  if (plan.status !== 'ready') {

    output.dataset.repairPreviewOutput =
      'blocked';

    status.dataset.repairPreviewStatus =
      'blocked';

    status.textContent =
      plan.conflicts?.[0]?.message ||
      'План заблокирован.';

    return;
  }

  output.dataset.repairPreviewOutput =
    'ready';

  output.dataset.repairPreviewSideEffects =
    'none';

  status.dataset.repairPreviewStatus =
    'ready';

  status.textContent =
    'План готов. Это только предпросмотр: запись и резервная копия не запускались.';

  const title =
    document.createElement('strong');

  title.textContent =
    `${plan.source.title}: ${formatRepairPreviewAction(plan.action.kind)}`;

  const rows =
    [
      [
        'Поле',
        plan.action.fieldPath
      ],
      [
        'До',
        formatRepairPreviewBefore(
          plan.before
        )
      ],
      [
        'После',
        `${plan.after.targetTitle} (${plan.after.targetId})`
      ],
      [
        'Контекст',
        plan.after.context || plan.before.context || 'контекст не найден'
      ],
      [
        'Резервная копия',
        plan.action.backupRequired
          ? 'потребуется перед применением'
          : 'не требуется'
      ],
      [
        'Свежесть',
        formatRepairPreviewEvidence(
          plan.staleEvidence
        )
      ]
    ];

  const list =
    document.createElement('div');

  list.className =
    'app-workspace-repair-preview-plan';

  rows.forEach(([label, value]) => {

    const row =
      document.createElement('div');

    const name =
      document.createElement('span');

    name.textContent =
      label;

    const detail =
      document.createElement('b');

    detail.textContent =
      value;

    row.append(
      name,
      detail
    );

    list.appendChild(
      row
    );
  });

  output.append(
    title,
    list
  );
}


function formatRepairPreviewTargetOption(
  target
) {

  return [
    target.title,
    target.id,
    target.type
  ]
    .filter(Boolean)
    .join(' · ');
}


function formatRepairPreviewAction(
  kind
) {

  if (kind === 'replace-relationship-target') return 'замена цели отношения';
  if (kind === 'replace-internal-link-target') return 'замена цели ссылки';

  return 'план правки';
}


function formatRepairPreviewBefore(
  before
) {

  return before.targetTitle ||
    before.targetId ||
    before.displayText ||
    'цель не указана';
}


function formatRepairPreviewEvidence(
  evidence = {}
) {

  return [
    evidence.sourceContentHash || 'contentHash: нет',
    evidence.sourceUpdatedAt
      ? `updatedAt ${evidence.sourceUpdatedAt}`
      : '',
    Number.isFinite(Number(evidence.sourceContentLength))
      ? `${evidence.sourceContentLength} байт`
      : ''
  ]
    .filter(Boolean)
    .join(' · ');
}


function capitalizeDataName(
  value
) {

  const text =
    String(value || '');

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}


function createRecoveryStatsGrid(
  report
) {

  const grid =
    document.createElement('div');

  grid.className =
    'app-workspace-recovery-stats';

  [
    [
      'Всего',
      report.issueCount
    ],
    [
      'Ошибки',
      report.errorCount
    ],
    [
      'Устаревшие',
      report.legacyWarningCount
    ],
    [
      'После копии',
      report.safeActionCount
    ]
  ].forEach(([label, value]) => {

    const item =
      document.createElement('div');

    const number =
      document.createElement('strong');

    number.textContent =
      String(value || 0);

    const caption =
      document.createElement('span');

    caption.textContent =
      label;

    item.append(
      number,
      caption
    );

    grid.appendChild(
      item
    );
  });

  return grid;
}


function createRecoveryGroupList(
  groups
) {

  const list =
    document.createElement('div');

  list.className =
    'app-workspace-recovery-groups';

  const visibleGroups =
    groups.length
      ? groups
      : [
        {
          label:
            'Нет групп',
          description:
            'Проверка схемы не вернула группируемых проблем.',
          issueCount:
            0,
          examples:
            []
        }
      ];

  visibleGroups.forEach(group => {

    const item =
      document.createElement('article');

    item.className =
      'app-workspace-recovery-group';

    const title =
      document.createElement('strong');

    title.textContent =
      `${group.label}: ${group.issueCount}`;

    const description =
      document.createElement('p');

    description.textContent =
      group.description || '';

    const meta =
      document.createElement('span');

    meta.className =
      'app-workspace-recovery-group-meta';

    meta.textContent =
      formatRecoveryGroupMeta(
        group
      );

    item.append(
      title,
      description,
      meta
    );

    const examples =
      createRecoveryExamplesList(
        group.examples || []
      );

    if (examples) {

      item.appendChild(
        examples
      );
    }

    list.appendChild(
      item
    );
  });

  return list;
}


function createRecoveryExamplesList(
  examples
) {

  if (!examples.length) return null;

  const list =
    document.createElement('div');

  list.className =
    'app-workspace-recovery-examples';

  examples.forEach(example => {

    const row =
      document.createElement('span');

    row.textContent =
      `${example.code}: ${formatRecoveryExampleDetails(example)}`;

    list.appendChild(
      row
    );
  });

  return list;
}


function createRecoveryRepairControls(
  report,
  options
) {

  const actions =
    getPersistableRecoveryActions(
      report.actions || []
    );

  const wrap =
    document.createElement('div');

  wrap.className =
    'app-workspace-recovery-actions';

  const status =
    document.createElement('span');

  status.className =
    'app-workspace-recovery-status';

  if (!actions.length) {

    status.textContent =
      report.safeActionCount
        ? 'Есть безопасные исправления модели, но для них еще нет надежной записи в рабочую папку. Сейчас они оставлены как предпросмотр.'
        : 'Автоматических безопасных действий нет. Эти проблемы нужно разбирать вручную или через отдельный repair-сценарий.';

    wrap.appendChild(
      status
    );

    return wrap;
  }

  const button =
    document.createElement('button');

  button.className =
    'app-workspace-recovery-repair-button';

  button.type =
    'button';

  button.textContent =
    `Создать копию и исправить безопасное (${actions.length})`;

  status.textContent =
    'Сейчас можно безопасно очистить отсутствующих родителей страниц и вывести такие страницы в корень дерева.';

  button.addEventListener(
    'click',
    () => applySchemaRecoveryRepairs({
      actions,
      options,
      status,
      button
    })
  );

  wrap.append(
    button,
    status
  );

  return wrap;
}


async function applySchemaRecoveryRepairs({
  actions,
  options,
  status,
  button
}) {

  if (!actions.length) return;

  button.disabled =
    true;

  try {

    status.textContent =
      'Создаю резервную копию перед исправлением схемы...';

    const backupManifest =
      await createSchemaRecoveryBackup(
        options,
        progress => {

          status.textContent =
            formatRecoveryProgress(
              progress
            );
        }
      );

    applyWorkspaceRepairActions(
      {
        pages:
          getRecoveryPages(
            options
          )
      },
      actions,
      {
        backupManifest
      }
    );

    const result =
      await persistSchemaRecoveryActions(
        actions,
        options
      );

    await options.onRecoveryRepairComplete?.({
      backupManifest,
      result
    });

    const validation =
      validateWorkspaceSnapshot({
        pages:
          getRecoveryPages(
            options
          )
      });

    state.workspaceValidation =
      validation;

    state.workspaceRecoveryReport =
      createWorkspaceRecoveryReport(
        validation
      );

    renderTree();

    status.textContent =
      `Готово: применено ${result.applied}, пропущено ${result.skipped}. Повторяю диагностику...`;

    if (typeof options.refreshDiagnostics === 'function') {

      await options.refreshDiagnostics();
    }

  } catch (error) {

    console.error(
      'Не удалось применить schema recovery repair actions.',
      error
    );

    status.textContent =
      `Repair остановлен: ${error?.message || String(error)}`;

  } finally {

    button.disabled =
      false;
  }
}


async function createSchemaRecoveryBackup(
  options,
  onProgress
) {

  if (typeof options.createRecoveryBackup === 'function') {

    return options.createRecoveryBackup({
      reason:
        'schema-recovery-safe-repair',
      onProgress
    });
  }

  return requireWorkspaceBackupBeforeRiskyOperation(
    'schema-recovery-safe-repair',
    {
      onProgress
    }
  );
}


async function persistSchemaRecoveryActions(
  actions,
  options
) {

  const pages =
    getRecoveryPages(
      options
    );

  let applied =
    0;

  let skipped =
    0;

  for (const action of actions) {

    if (action.repairAction?.id !== 'detach-page-parent-to-root') {

      skipped +=
        1;

      continue;
    }

    const page =
      pages.find(candidate =>
        candidate?.id === action.details?.pageId
      );

    if (!page) {

      skipped +=
        1;

      continue;
    }

    const applyPageParent =
      options.applyRecoveryPageParent ||
      updatePageParent;

    await applyPageParent(
      page,
      null,
      action
    );

    applied +=
      1;
  }

  return {
    applied,
    skipped
  };
}


function getPersistableRecoveryActions(
  actions
) {

  return actions.filter(action =>
    action?.repairAction?.safety === 'safe-after-backup' &&
    action.repairAction?.id === 'detach-page-parent-to-root'
  );
}


function getRecoveryPages(
  options
) {

  return Array.isArray(options.pages)
    ? options.pages
    : state.pages || [];
}


function formatRecoveryProgress(
  progress = {}
) {

  const total =
    Number(progress.total || 0);

  const current =
    Number(progress.current || 0);

  const count =
    total
      ? `${current}/${total}`
      : String(current || '');

  return [
    progress.label || 'Резервная копия',
    progress.stage || '',
    count
  ]
    .filter(Boolean)
    .join(' · ');
}


function formatRecoveryGroupMeta(
  group
) {

  const parts =
    [
      [
        group.errorCount,
        'ошибок'
      ],
      [
        group.warningCount,
        'предупреждений'
      ],
      [
        group.safeActionCount,
        'можно после копии'
      ],
      [
        group.manualActionCount,
        'вручную'
      ],
      [
        group.legacyWarningCount,
        'legacy'
      ]
    ]
      .filter(([value]) =>
        Number(value || 0) > 0
      )
      .map(([value, label]) =>
        `${value} ${label}`
      );

  return parts.join(' · ') ||
    'Нет дополнительных деталей.';
}


function formatRecoveryExampleDetails(
  example
) {

  const details =
    example.details || {};

  const target =
    details.pageId ||
    details.templateId ||
    details.id ||
    details.path ||
    details.title ||
    details.parent ||
    details.index;

  if (target !== undefined && target !== null && target !== '') {

    return `${example.message} (${target})`;
  }

  return example.message || example.severity || '';
}


function formatInternalLinkGroup(
  group
) {

  const examples =
    (group.examples || [])
      .slice(
        0,
        3
      )
      .map(formatInternalLinkIssue)
      .join(' / ');

  return [
    formatInternalLinkType(
      group.linkType
    ),
    formatInternalLinkReason(
      group.reason
    ),
    `${group.count} шт.`,
    examples
  ]
    .filter(Boolean)
    .join(' · ');
}


function formatInternalLinkIssue(
  issue
) {

  const target =
    issue.originalTarget ||
    issue.targetTitle ||
    issue.targetId ||
    'цель не указана';

  const ambiguity =
    issue.candidateCount
      ? ` (${issue.candidateCount} совпадения)`
      : '';

  return `${issue.sourcePageTitle || issue.sourcePageId || 'Без названия'} -> ${target}${ambiguity}`;
}


function formatInternalLinkType(
  type
) {

  if (type === 'wiki') return 'Wiki-ссылки';
  if (type === 'relationship') return 'Связи графа';
  if (type === 'internal-page') return 'Внутренние page-ссылки';

  return 'Внутренние ссылки';
}


function formatInternalLinkReason(
  reason
) {

  const labels =
    {
      TARGET_PAGE_MISSING:
        'страница не найдена',
      TARGET_ID_UNKNOWN:
        'цель не указана',
      RELATION_ENDPOINT_MISSING:
        'цель связи не найдена',
      MALFORMED_INTERNAL_REFERENCE:
        'ссылка повреждена',
      TARGET_AMBIGUOUS:
        'несколько совпадений'
    };

  return labels[reason] ||
    reason ||
    'причина неизвестна';
}


function formatOrphanReviewGroup(
  group
) {

  const examples =
    (group.examples || [])
      .slice(
        0,
        3
      )
      .map(formatOrphanReviewCandidate)
      .join(' / ');

  return [
    group.label || 'Проверка связности',
    formatOrphanReviewClassification(
      group.classification
    ),
    `${group.count} шт.`,
    examples
  ]
    .filter(Boolean)
    .join(' · ');
}


function formatOrphanReviewCandidate(
  candidate
) {

  const source =
    candidate.source?.pageTitle ||
    candidate.source?.pageId ||
    '';

  const referenceCount =
    Number.isFinite(
      Number(candidate.sourceReferenceCount)
    )
      ? `, ссылок: ${candidate.sourceReferenceCount}`
      : '';

  const prefix =
    source
      ? `${source} -> `
      : '';

  return `${prefix}${candidate.item}: ${candidate.why}${referenceCount}`;
}


function formatOrphanReviewClassification(
  classification
) {

  if (classification === 'schema-error') {

    return 'уже ошибка схемы';
  }

  return 'диагностика, требует проверки';
}


function createSummaryGrid(
  summary
) {

  const grid =
    document.createElement('div');

  grid.className =
    'app-workspace-diagnostics-summary-grid';

  [
    ['Страниц', summary.pages],
    ['Карт', summary.campaignMaps],
    ['Ассетов', summary.assets],
    ['Сломанные ссылки', summary.brokenAssets],
    ['Кандидаты ассетов', summary.orphanAssets],
    ['Ошибки проверки ассетов', summary.assetCheckFailures],
    ['Внутренние ссылки', summary.brokenInternalLinks],
    ['Связность', summary.orphanReviewCandidates],
    ['Проблем схемы', summary.schemaIssues],
    ['Резервные копии', summary.backups],
    ['Незавершённые копии', summary.incompleteBackups],
    ['Операции', summary.pendingOperations]
  ].forEach(([label, value]) => {

    const item =
      document.createElement('div');

    item.className =
      'app-workspace-diagnostics-card';

    item.dataset.healthBadge =
      normalizeHealthBadgeName(
        label
      );

    const number =
      document.createElement('strong');

    number.textContent =
      String(value);

    const caption =
      document.createElement('span');

    caption.textContent =
      label;

    item.append(
      number,
      caption
    );

    grid.appendChild(
      item
    );
  });

  return grid;
}


function normalizeHealthBadgeName(
  value
) {

  return String(value || 'status')
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '') ||
    'status';
}


function createWorkspaceStatusSection(
  diagnostics
) {

  const latestOperation =
    diagnostics.performanceEvents[0];

  const rows =
    [
      [
        'Режим',
        diagnostics.workspace.mode
      ],
      [
        'Рабочая папка',
        diagnostics.workspace.path
      ],
      [
        'Расположение',
        diagnostics.workspace.access?.location?.summary || 'неизвестно'
      ],
      [
        'Матрица доступа',
        diagnostics.workspace.access?.matrixSummary || 'не проверялась'
      ],
      [
        'Запись',
        diagnostics.workspace.canWrite
          ? 'OK'
          : 'Нет доступа на запись'
      ],
      [
        'Проба записи',
        diagnostics.workspace.access?.writeProbe?.message || 'не проверялась'
      ],
      [
        'Схема',
        diagnostics.schema.ok
          ? 'OK'
          : `${diagnostics.summary.schemaIssues} проблем, ${diagnostics.summary.schemaErrors} ошибок`
      ],
      [
        'Проверка',
        diagnostics.checkpoint.ok === null
          ? 'Еще не запускался'
          : diagnostics.checkpoint.ok
            ? `OK (${formatDateTime(diagnostics.checkpoint.checkedAt)})`
            : `Есть проблемы (${formatDateTime(diagnostics.checkpoint.checkedAt)})`
      ],
      [
        'Резервные копии',
        diagnostics.backup.latestId
          ? `${diagnostics.backup.completeCount} шт., последний: ${diagnostics.backup.latestReason || diagnostics.backup.latestId}`
          : `${diagnostics.backup.completeCount} шт.`
      ],
      [
        'Папка резервных копий',
        diagnostics.workspace.backupPath
      ],
      [
        'Последняя операция',
        latestOperation
            ? `${latestOperation.operation}: ${latestOperation.durationMs} мс (${latestOperation.status})`
            : 'Нет данных'
      ]
    ];

  return createListSection(
    'Состояние рабочей папки',
    rows,
    ([label, value]) => `${label}: ${value}`
  );
}


function createListSection(
  title,
  items,
  format
) {

  const section =
    document.createElement('div');

  section.className =
    'app-workspace-diagnostics-section';

  const heading =
    document.createElement('h4');

  heading.textContent =
    title;

  const list =
    document.createElement('div');

  list.className =
    'app-workspace-diagnostics-list';

  const visibleItems =
    items.length
      ? items
      : ['Нет данных'];

  visibleItems.forEach(item => {

    const row =
      document.createElement('div');

    row.className =
      'app-workspace-diagnostics-item';

    row.textContent =
      typeof item === 'string'
        ? item
        : format(item);

    list.appendChild(
      row
    );
  });

  section.append(
    heading,
    list
  );

  return section;
}


function createWarnings({
  workspace,
  schema,
  checkpoint,
  backup,
  pendingOperations,
  brokenAssets,
  orphanAssets,
  assetCheckFailures = [],
  brokenInternalLinks = [],
  pageStats,
  heavyMaps,
  slowOperations
}) {

  const warnings =
    [];

  if (!workspace.hasAccess) {

    warnings.push(
      'Рабочая папка не выбрана.'
    );
  }

  if (
    workspace.hasAccess &&
    !workspace.canWrite
  ) {

    warnings.push(
      'Нет доступа на запись в рабочую папку.'
    );
  }

  if (!schema.ok) {

    warnings.push(
      `Схема рабочей папки содержит ошибки: ${schema.issues.length}`
    );
  }

  if (checkpoint.ok === false) {

    warnings.push(
      'Последняя фоновая проверка нашла проблемы.'
    );
  }

  if (pendingOperations.length) {

    warnings.push(
      `Есть незавершённые операции рабочей папки: ${pendingOperations.length}`
    );
  }

  if (backup.incompleteCount) {

    warnings.push(
      `Есть незавершённые резервные копии: ${backup.incompleteCount}`
    );
  }

  if (backup.error) {

    warnings.push(
      `Не удалось проверить резервные копии: ${backup.error}`
    );
  }

  if (brokenAssets.length) {

    warnings.push(
      `Есть сломанные ссылки на ассеты: ${brokenAssets.length}`
    );
  }

  if (orphanAssets.length) {

    warnings.push(
      `Есть ассеты, не используемые сейчас: ${orphanAssets.length}`
    );
  }

  if (assetCheckFailures.length) {

    warnings.push(
      `Проверка ассетов не завершена: ${assetCheckFailures.length}`
    );
  }

  if (brokenInternalLinks.length) {

    warnings.push(
      `Есть проблемные внутренние ссылки: ${brokenInternalLinks.length}`
    );
  }

  if (pageStats.largeCount) {

    warnings.push(
      `Большие страницы: ${pageStats.largeCount}`
    );
  }

  if (heavyMaps.some(map => map.score >= 200)) {

    warnings.push(
      'Есть тяжелые карты: много токенов, фигур, слоев или fog zones.'
    );
  }

  if (slowOperations.length) {

    warnings.push(
      `Медленные операции за сессию: ${slowOperations.length}`
    );
  }

  return warnings;
}


function groupAssetPaths(
  assetPaths
) {

  return assetPaths.reduce(
    (accumulator, path) => {

      const group =
        getAssetGroup(
          path
        );

      accumulator[group] =
        (accumulator[group] || 0) + 1;

      return accumulator;
    },
    {}
  );
}


function getAssetGroup(
  path
) {

  const normalized =
    String(path || '').toLowerCase();

  if (/\.(png|jpe?g|webp|gif|bmp|avif)$/.test(normalized)) {

    return 'images';
  }

  if (/\.(mp3|ogg|wav|flac|m4a)$/.test(normalized)) {

    return 'audio';
  }

  if (/\.(json|m3u|m3u8)$/.test(normalized)) {

    return 'playlists';
  }

  return 'other';
}


function countPlaylistTracks(
  music
) {

  const playlists =
    [
      music?.normal,
      music?.battle
    ];

  return playlists.reduce(
    (total, playlist) =>
      total + (
        Array.isArray(playlist?.tracks)
          ? playlist.tracks.length
          : 0
      ),
    0
  );
}


function isCampaignMapPage(
  page
) {

  return page?.template === 'campaignMap' ||
    page?.type === 'campaignMap';
}


function getPageHTML(
  page
) {

  return String(
    page?.body ||
    page?.content ||
    page?.html ||
    ''
  );
}


function getTextSizeBytes(
  value
) {

  return new TextEncoder()
    .encode(
      String(value || '')
    )
    .length;
}


function parseEncodedJSON(
  value,
  fallback
) {

  if (!value) return fallback;

  try {

    return JSON.parse(
      decodeURIComponent(
        value
      )
    );

  } catch (error) {

    return fallback;
  }
}


function formatDateTime(
  value
) {

  if (!value) return 'no date';

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {

    return String(value);
  }

  return date.toLocaleString(
    'ru-RU'
  );
}


function formatBytes(
  value
) {

  const bytes =
    Number(value) || 0;

  if (bytes < 1024) {

    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {

    return `${Math.round(bytes / 102.4) / 10} KB`;
  }

  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`;
}
