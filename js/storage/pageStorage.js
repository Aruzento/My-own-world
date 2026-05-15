import { state } from '../state.js';

import {
  parseMarkdown
} from '../core/markdown.js';

import {
  templates
} from '../templates/templates.js';


export async function createPage(
  templateKey,
  parentId = null,
  initialTitle = ''
) {

  const template =
    templates[templateKey];

  const pagesDir =
    await state.workspaceHandle
      .getDirectoryHandle(
        'pages'
      );

  const fileName =
    `${Date.now()}.md`;

  const fileHandle =
    await pagesDir.getFileHandle(
      fileName,
      { create: true }
    );

  const writable =
    await fileHandle
      .createWritable();

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

  await writable.write(
    content
  );

  await writable.close();
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
  parentId
) {

  const parsed =
    parseMarkdown(
      sourcePage.content
    );

  const content =
    buildPageContent({
      id: crypto.randomUUID(),
      parent: parentId,
      tags: parsed.tags,
      template: parsed.template || 'card',
      type: parsed.type || 'note',
      aliases: parsed.aliases || [],
      body: parsed.body
    });

  return writePageFile(
    content
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

  const writable =
    await fileHandle.createWritable();

  await writable.write(
    content
  );

  await writable.close();

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

  state.pages.push(
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


/* Удаляет страницу и все дочерние страницы */
export async function deletePageBranch(
  page
) {

  const pagesToDelete =
    collectPageBranch(page);

  await ensureWorkspaceCanWrite();

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

  state.pages =
    state.pages.filter(
      existingPage =>
        !deletedPages.includes(
          existingPage
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

  page.parent =
    parentId;

  const updatedContent =
    page.content.replace(
      /parent:\s*(.*)/i,
      `parent: ${parentId ?? 'null'}`
    );

  const writable =
    await page.handle
      .createWritable();

  await writable.write(
    updatedContent
  );

  await writable.close();

  page.content =
    updatedContent;
}


export async function updatePageTreePosition(
  page,
  parentId,
  order
) {

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


  const writable =
    await page.handle
      .createWritable();

  await writable.write(
    updatedContent
  );

  await writable.close();

  page.content =
    updatedContent;
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


  const writable =
    await page.handle
      .createWritable();

  await writable.write(
    updatedContent
  );

  await writable.close();

  page.content =
    updatedContent;
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
