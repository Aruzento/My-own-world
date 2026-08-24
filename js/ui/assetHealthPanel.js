import {
  state
} from '../state.js';

import {
  buildAssetVerificationReport
} from '../storage/storage.js';

import {
  createWorkspaceBackup
} from '../storage/backupService.js';

import {
  getStorageAdapter,
  hasWorkspaceAccess
} from '../storage/storageAdapter.js';

import {
  deleteWorkspaceAssetPath,
  listWorkspaceAssetPaths
} from '../storage/assetWorkspaceService.js';

import {
  createSettingsSectionHeader,
  setButtonContent
} from './settingsPanelUI.js';

const ASSET_HEALTH_VISIBLE_ROWS =
  8;


export async function renderAssetHealthPanel(
  popup,
  options = {}
) {

  popup
    .querySelector('.app-asset-health-panel')
    ?.remove();

  const panel =
    document.createElement('section');

  panel.className =
    'app-asset-health-panel';

  panel.dataset.settingsSection =
    'assets';

  const header =
    createSettingsSectionHeader({
      iconName:
        'image',
      title:
        'Проверка ассетов',
      description:
        'Ссылки, отсутствующие файлы и ассеты, не используемые сейчас.'
    });

  const checkButton =
    document.createElement('button');

  checkButton.className =
    'app-asset-health-primary';

  checkButton.type =
    'button';

  setButtonContent(
    checkButton,
    'search',
    'Проверить ассеты'
  );

  const result =
    document.createElement('div');

  result.className =
    'app-asset-health-result';

  panel.append(
    header,
    checkButton,
    result
  );

  popup.appendChild(
    panel
  );

  const pages =
    options.pages ||
    state.pages ||
    [];

  const hasWorkspace =
    options.hasWorkspace ??
    hasWorkspaceAccess(
      getStorageAdapter()
    );

  if (!hasWorkspace) {

    checkButton.disabled =
      true;

    result.textContent =
      'Рабочая папка не выбрана.';

    return;
  }

  checkButton.addEventListener(
    'click',
    async () => {

      checkButton.disabled =
        true;

      result.textContent =
        'Проверяю ассеты...';

      try {

        const report =
          await createAssetVerificationReport(
            pages,
            options
          );

        renderAssetHealthResult(
          result,
          report,
          options
        );

      } catch (error) {

        console.error(
          'Не удалось проверить ассеты.',
          error
        );

        result.textContent =
          'Не удалось проверить ассеты.';

      } finally {

        checkButton.disabled =
          false;
      }
    }
  );
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


async function createAssetVerificationReport(
  pages,
  options
) {

  try {

    const assetPaths =
      await getAssetPaths(
        options
      );

    return buildAssetVerificationReport({
      pages,
      assetPaths
    });

  } catch (error) {

    return buildAssetVerificationReport({
      pages,
      assetScanError:
        error
    });
  }
}


function renderAssetHealthResult(
  container,
  report,
  options
) {

  container.replaceChildren();

  const {
    summary: counts
  } =
    report;

  const summary =
    document.createElement('div');

  summary.className =
    report.status === 'ok'
      ? 'app-asset-health-summary is-ok'
      : 'app-asset-health-summary is-warning';

  summary.dataset.healthBadge =
    report.status === 'ok'
      ? 'ok'
      : 'warning';

  summary.textContent =
    report.status === 'ok'
      ? `Ассеты в порядке. Подтверждено ссылок: ${counts.referencedExisting}. Файлов: ${counts.assetFiles}.`
      : `Проверка: подтверждено ${counts.referencedExisting}, отсутствует ${counts.referencedMissing}, кандидаты на проверку ${counts.orphanCandidates}, ошибок проверки ${counts.checkFailures}.`;

  container.appendChild(
    summary
  );

  if (report.checkFailures.length > 0) {

    container.appendChild(
      createAssetCheckFailureList(
        report.checkFailures
      )
    );
  }

  if (report.referencedExisting.length > 0) {

    container.appendChild(
      createAssetReferenceList({
        title:
          'Подтвержденные ссылки',
        references:
          report.referencedExisting,
        rowKind:
          'referenced-exists'
      })
    );
  }

  if (report.referencedMissing.length > 0) {

    container.appendChild(
      createAssetReferenceList({
        title:
          'Отсутствующие ассеты',
        references:
          report.referencedMissing,
        rowKind:
          'referenced-missing'
      })
    );
  }

  if (report.orphanCandidates.length > 0) {

    container.appendChild(
      createOrphanAssetList(
        report.orphanCandidates,
        options,
        () => options.onRefresh?.()
      )
    );
  }
}


function createAssetReferenceList({
  title,
  references,
  rowKind
}) {

  const section =
    document.createElement('div');

  section.className =
    'app-asset-health-section';

  const heading =
    document.createElement('h4');

  heading.textContent =
    title;

  const list =
    document.createElement('div');

  list.className =
    'app-asset-health-list';

  references
    .slice(
      0,
      ASSET_HEALTH_VISIBLE_ROWS
    )
    .forEach(reference => {

      const item =
        document.createElement('div');

      item.className =
        'app-asset-health-item';

      item.dataset.assetVerificationRow =
        rowKind;

      const path =
        document.createElement('strong');

      path.textContent =
        reference.path;

      const details =
        document.createElement('span');

      details.textContent =
        formatAssetReferenceDetails(
          reference
        );

      item.append(
        path,
        details
      );

      list.appendChild(
        item
      );
    });

  appendHiddenCount(
    list,
    references.length,
    ASSET_HEALTH_VISIBLE_ROWS
  );

  section.append(
    heading,
    list
  );

  return section;
}


function createAssetCheckFailureList(
  failures
) {

  const section =
    document.createElement('div');

  section.className =
    'app-asset-health-section';

  const heading =
    document.createElement('h4');

  heading.textContent =
    'Проверка не завершена';

  const list =
    document.createElement('div');

  list.className =
    'app-asset-health-list';

  failures.forEach(failure => {

    const item =
      document.createElement('div');

    item.className =
      'app-asset-health-item';

    item.dataset.assetVerificationRow =
      'check-failed';

    const path =
      document.createElement('strong');

    path.textContent =
      failure.path || 'assets';

    const details =
      document.createElement('span');

    details.textContent =
      failure.message ||
      'Не удалось завершить проверку ассетов.';

    item.append(
      path,
      details
    );

    list.appendChild(
      item
    );
  });

  section.append(
    heading,
    list
  );

  return section;
}


function appendHiddenCount(
  list,
  total,
  visible
) {

  if (total <= visible) return;

  const item =
    document.createElement('div');

  item.className =
    'app-asset-health-item';

  item.dataset.assetVerificationRow =
    'more';

  item.textContent =
    `Еще ${total - visible} записей скрыто, чтобы список оставался читаемым.`;

  list.appendChild(
    item
  );
}


function createOrphanAssetList(
  orphan,
  options,
  onRefresh
) {

  const section =
    document.createElement('div');

  section.className =
    'app-asset-health-section';

  const heading =
    document.createElement('h4');

  heading.textContent =
    'Не используется сейчас';

  const list =
    document.createElement('div');

  list.className =
    'app-asset-health-list';

  orphan
    .slice(
      0,
      ASSET_HEALTH_VISIBLE_ROWS
    )
    .forEach(candidate => {

      const path =
        candidate.path || '';

      const item =
        document.createElement('div');

      item.className =
        'app-asset-health-item app-asset-health-item-with-action';

      item.dataset.assetVerificationRow =
        'orphan-candidate';

      const meta =
        document.createElement('div');

      meta.className =
        'app-asset-health-meta';

      const title =
        document.createElement('strong');

      title.textContent =
        path;

      const details =
        document.createElement('span');

      details.textContent =
        'Кандидат на проверку: файл есть в assets, но persistent-ссылок сейчас не найдено';

      meta.append(
        title,
        details
      );

      const deleteButton =
        document.createElement('button');

      deleteButton.type =
        'button';

      deleteButton.className =
        'app-asset-health-delete';

      deleteButton.textContent =
        'Рассмотреть';

      deleteButton.addEventListener(
        'click',
        () => renderOrphanDeleteConfirm(
          item,
          path,
          options,
          onRefresh
        )
      );

      item.append(
        meta,
        deleteButton
      );

      list.appendChild(
        item
      );
    });

  appendHiddenCount(
    list,
    orphan.length,
    ASSET_HEALTH_VISIBLE_ROWS
  );

  section.append(
    heading,
    list
  );

  return section;
}


function renderOrphanDeleteConfirm(
  item,
  path,
  options,
  onRefresh
) {

  item
    .querySelector('.app-asset-health-confirm')
    ?.remove();

  const confirm =
    document.createElement('div');

  confirm.className =
    'app-asset-health-confirm';

  confirm.dataset.dangerZone =
    'orphan-asset-delete';

  const text =
    document.createElement('p');

  text.textContent =
    `Файл "${path}" сейчас не найден в persistent-ссылках. Это не доказательство, что удаление не затронет работу. Удалить после создания резервной копии?`;

  const actions =
    document.createElement('div');

  actions.className =
    'app-asset-health-confirm-actions';

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
    'app-asset-health-danger';

  confirmButton.textContent =
    'Удалить после backup';

  cancelButton.addEventListener(
    'click',
    () => confirm.remove()
  );

  confirmButton.addEventListener(
    'click',
    async () => {

      confirmButton.disabled =
        true;

      try {

        if (options.createBackupBeforeDelete !== false) {

          await (options.createBackup ||
            createWorkspaceBackup)({
            reason: 'orphan-assets-delete'
          });
        }

        await deleteOrphanAsset(
          path,
          options
        );

        item.remove();

        onRefresh?.();

      } catch (error) {

        console.error(
          'Не удалось удалить файл-кандидат.',
          error
        );

        text.textContent =
          'Не удалось удалить файл. Проверьте доступ к рабочей папке.';

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

  item.appendChild(
    confirm
  );
}


async function deleteOrphanAsset(
  path,
  options
) {

  if (options.deleteAssetPath) {

    await options.deleteAssetPath(
      path
    );

    return;
  }

  await deleteWorkspaceAssetPath(
    path,
    options
  );
}


function formatAssetReferenceDetails(
  reference
) {

  const parts =
    [];

  if (reference.type) {

    parts.push(
      reference.type
    );
  }

  const owner =
    reference.ownerDisplay ||
    reference.owner ||
    {};

  if (owner.pageTitle) {

    parts.push(
      owner.pageTitle
    );
  } else if (owner.pageId) {

    parts.push(
      owner.pageId
    );
  }

  if (owner.scope) {

    parts.push(
      owner.scope
    );
  }

  if (owner.entityId) {

    parts.push(
      owner.entityId
    );
  }

  return parts.join(' · ') ||
    'asset reference';
}
