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
type: note
aliases: []
---

${templateContent}
`;

  await writable.write(
    content
  );

  await writable.close();
}


/* Удаляет страницу и все дочерние страницы */
export async function deletePageBranch(
  page
) {

  /* Собирает всю ветку страниц */
  const pagesToDelete =
    collectPageBranch(page);

  /* Проверяет права workspace */
  const permission =
    await state.workspaceHandle.requestPermission({
      mode: 'readwrite'
    });

  /* Если прав нет — выходим */
  if (permission !== 'granted') {

    console.warn(
      'Нет прав на изменение workspace'
    );

    return;
  }

  /* Проходит по каждой странице ветки */
  for (const targetPage of pagesToDelete) {

    /* Если у страницы нет handle — пропускаем */
    if (!targetPage.handle) continue;

    try {

  /* Если FileSystemFileHandle поддерживает прямое удаление */
  if (
    targetPage.handle &&
    typeof targetPage.handle.remove === 'function'
  ) {

    /* Удаляем сам файл напрямую через его handle */
    await targetPage.handle.remove();

    /* Переходим к следующей странице */
    continue;
  }


  /* Fallback: получаем папку pages */
  const pagesDir =
    await state.workspaceHandle
      .getDirectoryHandle(
        'pages'
      );

  /* Fallback: удаляем файл по имени */
  await pagesDir.removeEntry(
    targetPage.name
  );

} catch (error) {

  /* Логируем ошибку удаления */
  console.error(
    `Не удалось удалить ${targetPage.name}`,
    error
  );
}
  }

  /* Удаляет страницы из global state */
  state.pages =
    state.pages.filter(
      existingPage =>
        !pagesToDelete.includes(
          existingPage
        )
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