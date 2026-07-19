import {
  parseMarkdown
} from '../core/markdown.js';

import {
  updatePageRecordContent
} from '../core/pageRecord.js';

import {
  createPage,
  writePageContent
} from '../storage/storage.js';

import {
  getStorageAdapter,
  hasWorkspaceAccess
} from '../storage/storageAdapter.js';

import {
  getUniqueCopyTitle
} from '../validation/pageTitleValidation.js';

import {
  notifyPageUpdated
} from '../repository/pageRepository.js';

import {
  sanitizePersistentHTMLOnSave
} from '../editor/safeHtmlSanitizer.js';


const PAGE_TEMPLATES_KEY =
  'my-own-world:page-templates';

const WORKSPACE_TEMPLATES_FILE =
  '.my-own-world-templates.json';

let templateCache =
  null;

let templateWorkspaceKey =
  null;


export function getPageTemplates() {

  if (!templateCache) {

    templateCache =
      readLocalStorageTemplates();
  }

  return [
    ...templateCache
  ];
}


export async function loadPageTemplates() {

  const storageAdapter =
    getStorageAdapter();

  if (!hasWorkspaceAccess(storageAdapter)) {

    templateWorkspaceKey =
      null;

    templateCache =
      readLocalStorageTemplates();

    return getPageTemplates();
  }

  if (
    templateWorkspaceKey === getTemplateWorkspaceKey(storageAdapter) &&
    templateCache
  ) {

    return getPageTemplates();
  }

  templateWorkspaceKey =
    getTemplateWorkspaceKey(storageAdapter);

  const workspaceTemplates =
    await readWorkspaceTemplates();

  if (workspaceTemplates) {

    templateCache =
      workspaceTemplates;

    return getPageTemplates();
  }

  templateCache =
    readLocalStorageTemplates();

  if (templateCache.length > 0) {

    await persistPageTemplates(
      templateCache
    );

    localStorage.removeItem(
      PAGE_TEMPLATES_KEY
    );
  }

  return getPageTemplates();
}


export function searchPageTemplates(
  query
) {

  const normalizedQuery =
    normalizeSearchText(
      query
    );

  if (!normalizedQuery) {

    return getPageTemplates();
  }

  return getPageTemplates()
    .filter(template => {

      const haystack =
        [
          template.title,
          template.type,
          template.template,
          ...(template.tags || [])
        ]
          .map(normalizeSearchText)
          .join(' ');

      return haystack.includes(
        normalizedQuery
      );
    });
}


export async function savePageAsTemplate(
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
    body: sanitizePersistentHTMLOnSave(
      parsed.body
    )
  };

  const templates =
    getPageTemplates();

  templates.unshift(
    template
  );

  await savePageTemplates(
    templates
  );

  return template;
}


export async function deletePageTemplate(
  templateId
) {

  await savePageTemplates(
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
    updatePageRecordContent(
      page.content,
      {
        id:
          page.id,
        parent:
          parentId ?? null,
        order:
          Date.now(),
        tags:
          pageTemplate.tags || [],
        template:
          pageTemplate.template || 'card',
        type:
          pageTemplate.type || 'note',
        aliases:
          [],
        relationships:
          page.relationships || [],
        body:
          sanitizePersistentHTMLOnSave(
            body
          )
      }
    );

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

  notifyPageUpdated();

  return page;
}


async function savePageTemplates(
  templates
) {

  templateCache =
    normalizeTemplates(
      templates
    );

  await persistPageTemplates(
    templateCache
  );
}


async function persistPageTemplates(
  templates
) {

  const storageAdapter =
    getStorageAdapter();

  if (!hasWorkspaceAccess(storageAdapter)) {

    localStorage.setItem(
      PAGE_TEMPLATES_KEY,
      serializePageTemplates(
        templates
      )
    );

    return;
  }

  await storageAdapter.writeText(
    WORKSPACE_TEMPLATES_FILE,
    serializePageTemplates(
      templates
    )
  );
}


async function readWorkspaceTemplates() {

  try {

    return parsePageTemplatesFile(
      await getStorageAdapter()
        .readText(
          WORKSPACE_TEMPLATES_FILE
        )
    );

  } catch {

    return null;
  }
}


function getTemplateWorkspaceKey(
  storageAdapter
) {

  return storageAdapter.getWorkspaceRoot?.() ||
    storageAdapter.getWorkspaceHandle?.() ||
    null;
}


function readLocalStorageTemplates() {

  try {

    return parsePageTemplatesFile(
      localStorage.getItem(PAGE_TEMPLATES_KEY) || '[]'
    );

  } catch {

    return [];
  }
}


export function serializePageTemplates(
  templates
) {

  return `${JSON.stringify(
    {
      version: 1,
      templates: normalizeTemplates(
        templates
      )
    },
    null,
    2
  )}\n`;
}


export function parsePageTemplatesFile(
  text
) {

  try {

    const parsed =
      JSON.parse(
        text || '{}'
      );

    return normalizeTemplates(
      Array.isArray(parsed)
        ? parsed
        : parsed.templates
    );

  } catch {

    return [];
  }
}


function normalizeTemplates(
  templates
) {

  if (!Array.isArray(templates)) return [];

  return templates
    .filter(Boolean)
    .map(template => ({
      id: template.id || crypto.randomUUID(),
      title: template.title || 'Шаблон',
      createdAt: Number(template.createdAt || Date.now()),
      tags: Array.isArray(template.tags)
        ? template.tags
        : [],
      template: template.template || 'card',
      type: template.type || 'note',
      aliases: Array.isArray(template.aliases)
        ? template.aliases
        : [],
      body: String(template.body || '')
    }));
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


function normalizeSearchText(
  value
) {

  return String(value || '')
    .trim()
    .toLowerCase();
}
