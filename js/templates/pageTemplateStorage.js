import {
  parseMarkdown
} from '../core/markdown.js';

import {
  createPage,
  writePageContent
} from '../storage/storage.js';

import {
  getUniqueCopyTitle
} from '../validation/pageTitleValidation.js';


const PAGE_TEMPLATES_KEY =
  'my-own-world:page-templates';


export function getPageTemplates() {

  try {

    const parsed =
      JSON.parse(
        localStorage.getItem(PAGE_TEMPLATES_KEY) || '[]'
      );

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch {

    return [];
  }
}


export function savePageAsTemplate(
  page
) {

  if (!page) return null;

  const parsed =
    parseMarkdown(
      page.content
    );

  const template = {
    id: crypto.randomUUID(),
    title: page.title || parsed.title || 'Шаблон',
    createdAt: Date.now(),
    tags: parsed.tags || [],
    template: parsed.template || 'card',
    type: parsed.type || 'note',
    aliases: [],
    body: parsed.body
  };

  const templates =
    getPageTemplates();

  templates.unshift(
    template
  );

  savePageTemplates(
    templates
  );

  return template;
}


export function deletePageTemplate(
  templateId
) {

  savePageTemplates(
    getPageTemplates()
      .filter(template =>
        template.id !== templateId
      )
  );
}


export async function createPageFromTemplate(
  pageTemplate,
  parentId
) {

  if (!pageTemplate) return null;

  const title =
    getUniqueCopyTitle(
      pageTemplate.title
    );

  const page =
    await createPage(
      'card',
      parentId,
      title
    );

  if (!page) return null;

  const body =
    applyTemplateTitle(
      pageTemplate.body,
      title
    );

  const content =
`---
id: ${page.id}
parent: ${parentId ?? 'null'}
order: ${Date.now()}
tags: [${(pageTemplate.tags || []).join(', ')}]
template: ${pageTemplate.template || 'card'}
type: ${pageTemplate.type || 'note'}
aliases: []
---

${body}
`;

  await writePageContent(
    page,
    content
  );

  Object.assign(
    page,
    {
      title,
      tags: pageTemplate.tags || [],
      template: pageTemplate.template || 'card',
      type: pageTemplate.type || 'note',
      aliases: [],
      content
    }
  );

  return page;
}


function savePageTemplates(
  templates
) {

  localStorage.setItem(
    PAGE_TEMPLATES_KEY,
    JSON.stringify(
      templates
    )
  );
}


function applyTemplateTitle(
  html,
  title
) {

  const wrapper =
    document.createElement('div');

  wrapper.innerHTML =
    html || '';

  const heading =
    wrapper.querySelector('h1');

  if (heading) {

    heading.textContent =
      title;
  }

  return wrapper.innerHTML;
}
