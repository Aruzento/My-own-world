import {
  state
} from '../state.js';

import {
  getWorkspacePerformanceEvents
} from '../performance/workspacePerformance.js';

import {
  BACKUP_ROOT_DIR,
  listIncompleteWorkspaceBackups,
  listWorkspaceBackups
} from '../storage/backupService.js';

import {
  findBrokenAssetReferences,
  findOrphanAssetPaths
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

  const title =
    document.createElement('h3');

  title.textContent =
    'Диагностика workspace';

  const description =
    document.createElement('p');

  description.textContent =
    'Короткая проверка размера мира, ассетов, тяжелых карт, схемы и последних медленных операций.';

  const refreshButton =
    document.createElement('button');

  refreshButton.className =
    'app-workspace-diagnostics-primary';

  refreshButton.type =
    'button';

  refreshButton.textContent =
    'Обновить диагностику';

  const result =
    document.createElement('div');

  result.className =
    'app-workspace-diagnostics-result';

  panel.append(
    title,
    description,
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
      'Workspace не выбран.';

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
          diagnostics
        );

      } catch (error) {

        console.error(
          'Не удалось собрать диагностику workspace.',
          error
        );

        result.textContent =
          'Не удалось собрать диагностику workspace.';

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

  const assetPaths =
    await getAssetPaths(
      options
    );

  const schema =
    validateWorkspaceSnapshot({
      schemaVersion:
        options.schemaVersion,
      pages
    });

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

  const brokenAssets =
    findBrokenAssetReferences(
      pages,
      assetPaths
    );

  const orphanAssets =
    findOrphanAssetPaths(
      pages,
      assetPaths
    );

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
      adapter.kind || 'unknown',
    path:
      path || 'Workspace not selected',
    hasAccess:
      Boolean(hasAccess),
    canWrite:
      Boolean(canWrite),
    access,
    backupPath:
      path && adapter.kind === 'desktop'
        ? `${path}\\${BACKUP_ROOT_DIR}`
        : `${BACKUP_ROOT_DIR} inside selected workspace`
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

  try {

    return await listWorkspaceAssetPaths(
      options
    );

  } catch (error) {

    return [];
  }
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
  diagnostics
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

    ok.textContent =
      'Критичных предупреждений не найдено.';

    container.appendChild(
      ok
    );
  }

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
    ['Broken refs', summary.brokenAssets],
    ['Orphan refs', summary.orphanAssets],
    ['Проблем схемы', summary.schemaIssues],
    ['Backup', summary.backups],
    ['Недособр. backup', summary.incompleteBackups],
    ['Pending ops', summary.pendingOperations]
  ].forEach(([label, value]) => {

    const item =
      document.createElement('div');

    item.className =
      'app-workspace-diagnostics-card';

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
        'Workspace',
        diagnostics.workspace.path
      ],
      [
        'Location',
        diagnostics.workspace.access?.location?.summary || 'unknown'
      ],
      [
        'Access matrix',
        diagnostics.workspace.access?.matrixSummary || 'not checked'
      ],
      [
        'Запись',
        diagnostics.workspace.canWrite
          ? 'OK'
          : 'Нет доступа на запись'
      ],
      [
        'Write probe',
        diagnostics.workspace.access?.writeProbe?.message || 'not checked'
      ],
      [
        'Схема',
        diagnostics.schema.ok
          ? 'OK'
          : `${diagnostics.summary.schemaIssues} issues, ${diagnostics.summary.schemaErrors} errors`
      ],
      [
        'Checkpoint',
        diagnostics.checkpoint.ok === null
          ? 'Еще не запускался'
          : diagnostics.checkpoint.ok
            ? `OK (${formatDateTime(diagnostics.checkpoint.checkedAt)})`
            : `Есть проблемы (${formatDateTime(diagnostics.checkpoint.checkedAt)})`
      ],
      [
        'Backup',
        diagnostics.backup.latestId
          ? `${diagnostics.backup.completeCount} шт., последний: ${diagnostics.backup.latestReason || diagnostics.backup.latestId}`
          : `${diagnostics.backup.completeCount} шт.`
      ],
      [
        'Папка backup',
        diagnostics.workspace.backupPath
      ],
      [
        'Последняя операция',
        latestOperation
          ? `${latestOperation.operation}: ${latestOperation.durationMs} ms (${latestOperation.status})`
          : 'Нет данных'
      ]
    ];

  return createListSection(
    'Desktop workspace status',
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
  pageStats,
  heavyMaps,
  slowOperations
}) {

  const warnings =
    [];

  if (!workspace.hasAccess) {

    warnings.push(
      'Workspace не выбран.'
    );
  }

  if (
    workspace.hasAccess &&
    !workspace.canWrite
  ) {

    warnings.push(
      'Нет доступа на запись в workspace.'
    );
  }

  if (!schema.ok) {

    warnings.push(
      `Схема workspace содержит ошибки: ${schema.issues.length}`
    );
  }

  if (checkpoint.ok === false) {

    warnings.push(
      'Последний background checkpoint нашел проблемы.'
    );
  }

  if (pendingOperations.length) {

    warnings.push(
      `Есть незавершенные операции workspace: ${pendingOperations.length}`
    );
  }

  if (backup.incompleteCount) {

    warnings.push(
      `Есть недособранные backup: ${backup.incompleteCount}`
    );
  }

  if (backup.error) {

    warnings.push(
      `Не удалось проверить backup: ${backup.error}`
    );
  }

  if (brokenAssets.length) {

    warnings.push(
      `Есть сломанные ссылки на ассеты: ${brokenAssets.length}`
    );
  }

  if (orphanAssets.length) {

    warnings.push(
      `Есть orphan assets: ${orphanAssets.length}`
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
