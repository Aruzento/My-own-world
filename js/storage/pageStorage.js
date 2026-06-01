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
  writePageContent,
  writeTextFile
} from './writeQueue.js';

import {
  createWorkspaceBackupBeforeRiskyOperation
} from './backupService.js';

import {
  notifyPageCreated,
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

  const pagesDir =
    await state.workspaceHandle
      .getDirectoryHandle(
        'pages'
      );

  const fileName =
    `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.md`;

  const fileHandle =
    await pagesDir.getFileHandle(
      fileName,
      { create: true }
    );

  await writeTextFile(
    fileHandle,
    content,
    fileName
  );

  const parsed =
    parseMarkdown(
      content
    );

  const page = {
    id: parsed.id,
    parent: parsed.parent,
    order: parsed.order,
    name: fileName,
    title: parsed.title,
    type: parsed.type,
    tags: parsed.tags,
    template: parsed.template,
    aliases: parsed.aliases,
    path: `/pages/${fileName}`,
    parentDirHandle: pagesDir,
    handle: fileHandle,
    content
  };

  setPages(
    [
      ...state.pages,
      page
    ]
  );

  notifyPageCreated();

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


/* Удаляет страницу и все дочерние страницы */
export async function deletePageBranch(
  page
) {

  const pagesToDelete =
    collectPageBranch(page);

  await ensureWorkspaceCanWrite();

  await createWorkspaceBackupBeforeRiskyOperation(
    'delete-page-branch'
  );

  const deletedPages =
    [];

  const failedPages =
    [];

  for (const targetPage of pagesToDelete) {

    try {

      await deletePageFile(
        targetPage
      );

      deletedPages.push(
        targetPage
      );

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

  setPages(
    state.pages.filter(
      existingPage =>
        !deletedPages.includes(
          existingPage
        )
    )
  );

  if (failedPages.length > 0) {

    throw new Error(
      `Не удалось удалить файлов: ${failedPages.length}`
    );
  }
}


async function ensureWorkspaceCanWrite() {

  if (!state.workspaceHandle) {

    throw new Error(
      'Workspace не выбран'
    );
  }

  if (!state.workspaceHandle.queryPermission) return;

  const permission =
    await state.workspaceHandle.queryPermission({
      mode: 'readwrite'
    });

  if (permission !== 'granted') {

    throw new Error(
      'Нет прав на изменение workspace'
    );
  }
}


async function deletePageFile(
  targetPage
) {

  if (!targetPage.handle) {

    throw new Error(
      'У страницы нет file handle'
    );
  }

  const parentDir =
    targetPage.parentDirHandle ||
    await state.workspaceHandle.getDirectoryHandle(
      'pages'
    );

  await parentDir.removeEntry(
    targetPage.name
  );
}


function collectPageBranch(
  rootPage
) {

  const result = [
    rootPage
  ];

  const children =
    state.pages.filter(
      page =>
        page.parent === rootPage.id
    );

  children.forEach(child => {

    result.push(
      ...collectPageBranch(child)
    );
  });

  return result;
}


export async function updatePageParent(
  page,
  parentId
) {

  await createWorkspaceBackupBeforeRiskyOperation(
    'move-page-parent'
  );

  page.parent =
    parentId;

  const updatedContent =
    page.content.replace(
      /parent:\s*(.*)/i,
      `parent: ${parentId ?? 'null'}`
    );

  await writePageContent(
    page,
    updatedContent
  );

  page.content =
    updatedContent;

  notifyPageMoved();
}


export async function updatePageTreePosition(
  page,
  parentId,
  order
) {

  await createWorkspaceBackupBeforeRiskyOperation(
    'move-page-tree-position'
  );

  page.parent =
    parentId;

  page.order =
    order;

  let updatedContent =
    page.content;


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
    page,
    updatedContent
  );

  page.content =
    updatedContent;

  notifyPageMoved();
}

export async function updatePageAliases(
  page,
  aliases
) {

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

  notifyPageUpdated();
}

export async function scanDirectory(
  dirHandle,
  path = ''
) {

  for await (
    const entry
    of dirHandle.values()
  ) {

    const currentPath =
      `${path}/${entry.name}`;

    if (
      entry.kind === 'directory'
    ) {

      await scanDirectory(
        entry,
        currentPath
      );

      continue;
    }

    if (
      !entry.name.endsWith('.md')
    ) {

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

    state.pages.push({

      id: parsed.id,

      parent:
        parsed.parent,

      order:
        parsed.order,

      name:
        entry.name,

      title:
        parsed.title,
      
      type:
  parsed.type,

      tags:
        parsed.tags,

      template:
  parsed.template,

      aliases:
        parsed.aliases,

      path:
        currentPath,

      handle:
        entry,

      parentDirHandle:
        dirHandle,

      content,
    });
  }
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
