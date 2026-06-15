import {
  state
} from '../state.js';

import {
  findBrokenAssetReferences,
  findOrphanAssetPaths
} from '../storage/storage.js';

import {
  createWorkspaceBackup
} from '../storage/backupService.js';

import {
  deleteWorkspaceAssetPath,
  listWorkspaceAssetPaths
} from '../storage/assetWorkspaceService.js';


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

  const title =
    document.createElement('h3');

  title.textContent =
    'Проверка ассетов';

  const description =
    document.createElement('p');

  description.textContent =
    'Проверяет сломанные ссылки и orphan-файлы в workspace assets.';

  const checkButton =
    document.createElement('button');

  checkButton.className =
    'app-asset-health-primary';

  checkButton.type =
    'button';

  checkButton.textContent =
    'Проверить assets';

  const result =
    document.createElement('div');

  result.className =
    'app-asset-health-result';

  panel.append(
    title,
    description,
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
    Boolean(state.workspaceHandle);

  if (!hasWorkspace) {

    checkButton.disabled =
      true;

    result.textContent =
      'Workspace не выбран.';

    return;
  }

  checkButton.addEventListener(
    'click',
    async () => {

      checkButton.disabled =
        true;

      result.textContent =
        'Проверяю assets...';

      try {

        const assetPaths =
          await getAssetPaths(
            options
          );

        const broken =
          findBrokenAssetReferences(
            pages,
            assetPaths
          );

        const orphan =
          findOrphanAssetPaths(
            pages,
            assetPaths
          );

        renderAssetHealthResult(
          result,
          broken,
          orphan,
          assetPaths,
          options
        );

      } catch (error) {

        console.error(
          'Не удалось проверить assets.',
          error
        );

        result.textContent =
          'Не удалось проверить assets.';

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


function renderAssetHealthResult(
  container,
  broken,
  orphan,
  assetPaths,
  options
) {

  container.replaceChildren();

  const summary =
    document.createElement('div');

  summary.className =
    broken.length > 0 ||
    orphan.length > 0
      ? 'app-asset-health-summary is-warning'
      : 'app-asset-health-summary is-ok';

  summary.textContent =
    broken.length > 0 ||
    orphan.length > 0
      ? `Проблемы: broken ${broken.length}, orphan ${orphan.length}`
      : `Assets в порядке. Файлов в assets: ${assetPaths.length}`;

  container.appendChild(
    summary
  );

  if (broken.length > 0) {

    container.appendChild(
      createBrokenAssetList(
        broken
      )
    );
  }

  if (orphan.length > 0) {

    container.appendChild(
      createOrphanAssetList(
        orphan,
        options,
        () => options.onRefresh?.()
      )
    );
  }
}


function createBrokenAssetList(
  broken
) {

  const section =
    document.createElement('div');

  section.className =
    'app-asset-health-section';

  const heading =
    document.createElement('h4');

  heading.textContent =
    'Сломанные ссылки';

  const list =
    document.createElement('div');

  list.className =
    'app-asset-health-list';

  broken.forEach(reference => {

    const item =
      document.createElement('div');

    item.className =
      'app-asset-health-item';

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

  section.append(
    heading,
    list
  );

  return section;
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
    'Orphan-файлы';

  const list =
    document.createElement('div');

  list.className =
    'app-asset-health-list';

  orphan.forEach(path => {

    const item =
      document.createElement('div');

    item.className =
      'app-asset-health-item app-asset-health-item-with-action';

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
      'Файл есть в assets, но persistent-ссылок на него не найдено';

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
      'Удалить';

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

  const text =
    document.createElement('p');

  text.textContent =
    `Удалить orphan-файл "${path}"? Перед удалением будет создан backup.`;

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
    'Удалить файл';

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
          'Не удалось удалить orphan asset.',
          error
        );

        text.textContent =
          'Не удалось удалить файл. Проверьте доступ к workspace.';

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

  if (reference.owner?.pageTitle) {

    parts.push(
      reference.owner.pageTitle
    );
  } else if (reference.owner?.pageId) {

    parts.push(
      reference.owner.pageId
    );
  }

  if (reference.owner?.source) {

    parts.push(
      reference.owner.source
    );
  }

  return parts.join(' · ') ||
    'asset reference';
}
