import {
  state
} from '../state.js';

import {
  setPages
} from '../stateActions.js';

import {
  parseMarkdown
} from '../core/markdown.js';

import {
  templates
} from '../templates/templates.js';

import {
  writePageContent
} from './writeQueue.js';

import {
  requireWorkspaceBackupBeforeRiskyOperation
} from './backupService.js';

import {
  measureWorkspaceOperation
} from '../performance/workspacePerformance.js';

import {
  getStorageAdapter,
  requestWorkspaceWritePermission
} from './storageAdapter.js';

import {
  notifyPageCreated,
  notifyPageDeleted,
  notifyPageMoved,
  notifyPageUpdated
} from '../repository/pageRepository.js';


export async function createPage(
  templateKey,
  parentId = null,
  initialTitle = ''
) {

  const template =
    templates[templateKey];

  const pageId =
    crypto.randomUUID();

  const templateContent =
    applyInitialTitle(
      template.content,
      initialTitle
    );

  const content =
`---
id: ${pageId}
parent: ${parentId ?? 'null'}
order: ${Date.now()}
tags: [${template.tags.join(', ')}]
template: ${template.template || templateKey}
type: ${template.type || 'note'}
aliases: []
---

${templateContent}
`;

  return writePageFile(
    content
  );
}


export async function createFolderPage(
  title,
  parentId
) {

  const template =
    templates.card;

  const content =
    buildPageContent({
      id: crypto.randomUUID(),
      parent: parentId,
      tags: ['card', 'folder'],
      template: 'card',
      type: 'folder',
      aliases: [],
      body: applyInitialTitle(
        template.content,
        title
      )
    });

  return writePageFile(
    content
  );
}


export async function duplicatePageAsChild(
  sourcePage,
  parentId,
  initialTitle = ''
) {

  const parsed =
    parseMarkdown(
      sourcePage.content
    );

  const body =
    initialTitle
      ? applyInitialTitle(
        parsed.body,
        initialTitle
      )
      : parsed.body;

  const content =
    buildPageContent({
      id: crypto.randomUUID(),
      parent: parentId,
      tags: parsed.tags,
      template: parsed.template || 'card',
      type: parsed.type || 'note',
      aliases: parsed.aliases || [],
      body
    });

  return writePageFile(
    content
  );
}


export async function duplicatePageAtSameLevel(
  sourcePage,
  title
) {

  return duplicatePageAsChild(
    sourcePage,
    sourcePage.parent,
    title
  );
}


async function writePageFile(
  content
) {

  const storageAdapter =
    getReadyStorageAdapter();

  await storageAdapter.ensureDirectory(
    'pages'
  );

  const fileName =
    `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.md`;

  const path =
    `/pages/${fileName}`;

  await storageAdapter.writeText(
    path,
    content
  );

  const parsed =
    parseMarkdown(
      content
    );

  const page =
    createPageRecord({
      parsed,
      name: fileName,
      path,
      content
    });

  setPages(
    [
      ...state.pages,
      page
    ]
  );

  notifyPageCreated(
    page
  );

  return page;
}


function buildPageContent({
  id,
  parent,
  tags,
  template,
  type,
  aliases,
  body
}) {

  return `---
id: ${id}
parent: ${parent ?? 'null'}
order: ${Date.now()}
tags: [${tags.join(', ')}]
template: ${template}
type: ${type}
aliases: [${aliases.join(', ')}]
---

${body}
`;
}


// Удаляет страницу и все дочерние страницы.
export async function deletePageBranch(
  page,
  options = {}
) {

  return measureWorkspaceOperation(
    'tree.deleteBranch',
    () => deletePageBranchMeasured(
      page,
      options
    ),
    {
      counts: result => ({
        pages:
          result?.deletedPages || 0,
        failed:
          result?.failedPages || 0
      })
    }
  );
}


async function deletePageBranchMeasured(
  page,
  options = {}
) {

  const livePage =
    getLivePage(
      page
    ) || page;

  if (!livePage?.id) return;

  const pagesToDelete =
    collectPageBranch(
      livePage
    );

  await ensureWorkspaceCanWrite();

  await requireWorkspaceBackupBeforeRiskyOperation(
    'delete-page-branch',
    {
      onProgress:
        options.onProgress
    }
  );

  const deletedPages =
    [];

  const failedPages =
    [];

  for (
    let index = 0;
    index < pagesToDelete.length;
    index += 1
  ) {

    const targetPage =
      pagesToDelete[index];

    try {

      await deletePageFile(
        targetPage
      );

      deletedPages.push(
        targetPage
      );

      options.onProgress?.({
        label: 'Удаление',
        stage: 'страницы',
        current: index + 1,
        total: pagesToDelete.length
      });

    } catch (error) {

      failedPages.push({
        page: targetPage,
        error
      });

      console.error(
        `Не удалось удалить ${targetPage.name}`,
        error
      );
    }
  }

  const deletedPageIds =
    new Set(
      deletedPages.map(
        deletedPage => deletedPage.id
      )
    );

  setPages(
    state.pages.filter(
      existingPage =>
        !deletedPageIds.has(
          existingPage.id
        )
    )
  );

  notifyPageDeleted(
    deletedPages
  );

  if (failedPages.length > 0) {

    throw new Error(
      `Не удалось удалить файлов: ${failedPages.length}`
    );
  }

  return {
    deletedPages:
      deletedPages.length,
    failedPages:
      failedPages.length
  };
}


async function ensureWorkspaceCanWrite() {

  const storageAdapter =
    getReadyStorageAdapter();

  const canWrite =
    await requestWorkspaceWritePermission(
      storageAdapter
    );

  if (!canWrite) {

    throw new Error(
      'Workspace не выбран или нет прав на запись'
    );
  }
}


async function deletePageFile(
  targetPage
) {

  const storageAdapter =
    getReadyStorageAdapter();

  if (targetPage.path) {

    try {

      await storageAdapter.removeFile(
        targetPage.path
      );

    } catch (error) {

      if (
        isMissingFileDeleteError(
          error
        )
      ) {

        console.warn(
          'Page file was already missing during delete.',
          targetPage.path
        );

        return;
      }

      throw error;
    }

    return;
  }

  if (!targetPage.handle) {

    throw new Error(
      'У страницы нет file handle'
    );
  }

  const parentDir =
    targetPage.parentDirHandle ||
    await storageAdapter.getDirectoryHandle(
      'pages'
    );

  await parentDir.removeEntry(
    targetPage.name
  );
}


function isMissingFileDeleteError(
  error
) {

  const name =
    String(error?.name || '');

  const code =
    String(error?.code || '');

  const message =
    String(error?.message || error || '')
      .toLowerCase();

  return name === 'NotFoundError' ||
    code === 'ENOENT' ||
    code === 'desktop.file_not_found' ||
    message.includes('not found') ||
    message.includes('cannot find') ||
    message.includes('no such file');
}


function collectPageBranch(
  rootPage
) {

  const childrenByParent =
    new Map();

  state.pages.forEach(page => {

    if (!page?.parent) return;

    if (!childrenByParent.has(page.parent)) {

      childrenByParent.set(
        page.parent,
        []
      );
    }

    childrenByParent.get(page.parent).push(
      page
    );
  });

  const result = [
    rootPage
  ];

  for (
    let index = 0;
    index < result.length;
    index += 1
  ) {

    const currentPage =
      result[index];

    const children =
      childrenByParent.get(
        currentPage.id
      ) || [];

    result.push(
      ...children
    );
  }

  return result;
}

function getLivePage(
  page
) {

  if (!page?.id) return null;

  return state.pages.find(candidate =>
    candidate.id === page.id
  ) || null;
}

export async function updatePageParent(
  page,
  parentId
) {

  const livePage =
    getLivePage(
      page
    ) || page;

  const previousPage =
    snapshotPageForIndex(
      livePage
    );

  await requireWorkspaceBackupBeforeRiskyOperation(
    'move-page-parent'
  );

  livePage.parent =
    parentId;

  const updatedContent =
    livePage.content.replace(
      /parent:\s*(.*)/i,
      `parent: ${parentId ?? 'null'}`
    );

  await writePageContent(
    livePage,
    updatedContent
  );

  livePage.content =
    updatedContent;

  notifyPageMoved(
    previousPage,
    livePage
  );
}


export async function updatePageTreePosition(
  page,
  parentId,
  order
) {

  const change =
    preparePageTreePositionChange({
      page,
      parentId,
      order
    });

  if (!change) return;

  await requireWorkspaceBackupBeforeRiskyOperation(
    'move-page-tree-position'
  );

  await applyPageTreePositionChange(
    change
  );
}


export async function updatePageTreePositions(
  updates = [],
  options = {}
) {

  return measureWorkspaceOperation(
    'tree.moveBatch',
    () => updatePageTreePositionsMeasured(
      updates,
      options
    ),
    {
      counts: result => ({
        changedPages:
          result?.changedPages || 0
      })
    }
  );
}


async function updatePageTreePositionsMeasured(
  updates = [],
  options = {}
) {

  const changes =
    updates
      .map(update =>
        preparePageTreePositionChange(
          update
        )
      )
      .filter(Boolean);

  if (changes.length === 0) return;

  await requireWorkspaceBackupBeforeRiskyOperation(
    'move-page-tree-position',
    {
      onProgress:
        options.onProgress
    }
  );

  for (
    let index = 0;
    index < changes.length;
    index += 1
  ) {

    const change =
      changes[index];

    await applyPageTreePositionChange(
      change
    );

    options.onProgress?.({
      label: 'Перенос',
      stage: 'страницы',
      current: index + 1,
      total: changes.length
    });
  }

  return {
    changedPages:
      changes.length
  };
}


function preparePageTreePositionChange({
  page,
  parentId,
  order
}) {

  const livePage =
    getLivePage(
      page
    ) || page;

  if (!livePage?.id) return null;

  const previousPage =
    snapshotPageForIndex(
      livePage
    );

  return {
    livePage,
    previousPage,
    parentId,
    order
  };
}


async function applyPageTreePositionChange({
  livePage,
  previousPage,
  parentId,
  order
}) {

  livePage.parent =
    parentId;

  livePage.order =
    order;

  let updatedContent =
    livePage.content;

  if (
    /parent:\s*(.*)/i.test(
      updatedContent
    )
  ) {

    updatedContent =
      updatedContent.replace(
        /parent:\s*(.*)/i,
        `parent: ${parentId ?? 'null'}`
      );

  } else {

    updatedContent =
      updatedContent.replace(
        /---/,
        `---\nparent: ${parentId ?? 'null'}`
      );
  }

  if (
    /order:\s*(.*)/i.test(
      updatedContent
    )
  ) {

    updatedContent =
      updatedContent.replace(
        /order:\s*(.*)/i,
        `order: ${order}`
      );

  } else {

    updatedContent =
      updatedContent.replace(
        /parent:\s*(.*)/i,
        match =>
          `${match}\norder: ${order}`
      );
  }

  await writePageContent(
    livePage,
    updatedContent
  );

  livePage.content =
    updatedContent;

  notifyPageMoved(
    previousPage,
    livePage
  );
}


export async function updatePageAliases(
  page,
  aliases
) {

  const previousPage =
    snapshotPageForIndex(
      page
    );

  page.aliases =
    aliases;

  let updatedContent =
    page.content;

  if (
    /aliases:\s*\[(.*?)\]/i.test(
      updatedContent
    )
  ) {

    updatedContent =
      updatedContent.replace(
        /aliases:\s*\[(.*?)\]/i,
        `aliases: [${aliases.join(', ')}]`
      );

  } else {

    updatedContent =
      updatedContent.replace(
        /tags:\s*\[(.*?)\]/i,
        match =>
          `${match}\naliases: [${aliases.join(', ')}]`
      );
  }

  await writePageContent(
    page,
    updatedContent
  );

  page.content =
    updatedContent;

  notifyPageUpdated(
    previousPage,
    page
  );
}


function snapshotPageForIndex(
  page
) {

  if (!page) return null;

  return {
    id: page.id,
    parent: page.parent,
    order: page.order,
    title: page.title,
    template: page.template,
    type: page.type,
    tags: Array.isArray(page.tags)
      ? [...page.tags]
      : [],
    aliases: Array.isArray(page.aliases)
      ? [...page.aliases]
      : []
  };
}


export async function scanDirectory(
  dirHandle,
  path = ''
) {

  for await (const entry of dirHandle.values()) {

    const currentPath =
      `${path}/${entry.name}`;

    if (entry.kind === 'directory') {

      await scanDirectory(
        entry,
        currentPath
      );

      continue;
    }

    if (!entry.name.endsWith('.md')) {

      continue;
    }

    const file =
      await entry.getFile();

    const content =
      await file.text();

    const parsed =
      parseMarkdown(
        content
      );

    state.pages.push(
      createPageRecord({
        parsed,
        name: entry.name,
        path: currentPath,
        handle: entry,
        parentDirHandle: dirHandle,
        content
      })
    );
  }
}


export async function scanWorkspacePagesByAdapter(
  storageAdapter
) {

  await scanAdapterDirectory(
    storageAdapter,
    'pages',
    '/pages'
  );
}


async function scanAdapterDirectory(
  storageAdapter,
  adapterPath,
  displayPath
) {

  const entries =
    await storageAdapter.listFiles(
      adapterPath
    );

  for (const entry of entries) {

    const currentAdapterPath =
      `${adapterPath}/${entry.name}`;

    const currentDisplayPath =
      `${displayPath}/${entry.name}`;

    if (entry.kind === 'directory') {

      await scanAdapterDirectory(
        storageAdapter,
        currentAdapterPath,
        currentDisplayPath
      );

      continue;
    }

    if (!entry.name.endsWith('.md')) {

      continue;
    }

    const content =
      await storageAdapter.readText(
        currentAdapterPath
      );

    const parsed =
      parseMarkdown(
        content
      );

    state.pages.push(
      createPageRecord({
        parsed,
        name: entry.name,
        path: currentDisplayPath,
        content
      })
    );
  }
}


function createPageRecord({
  parsed,
  name,
  path,
  handle = null,
  parentDirHandle = null,
  content
}) {

  return {
    id: parsed.id,
    parent: parsed.parent,
    order: parsed.order,
    name,
    title: parsed.title,
    type: parsed.type,
    tags: parsed.tags,
    template: parsed.template,
    aliases: parsed.aliases,
    path,
    handle,
    parentDirHandle,
    content
  };
}


function getReadyStorageAdapter() {

  return getStorageAdapter();
}


function applyInitialTitle(
  html,
  title
) {

  if (!title) return html;

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    html;

  const heading =
    wrapper.querySelector('h1');

  if (!heading) return html;

  heading.textContent =
    title;

  return wrapper.innerHTML;
}
