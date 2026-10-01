import { assertLegacyPortability } from '../storage/structuredPagePolicy.js';
import { exportPortablePageRecord, portablePageContent } from '../core/portablePageRecord.js';
import { collectPageDefinitionClosure } from '../variables/typedPageTraversal.js';
import { readCardTypeCatalog, createCardTypeRegistryFromCatalog, activateCardTypeDefinitions } from '../storage/cardTypeCatalogStorage.js';
import { prepareNewCardEnvelope, validateNewPageContent } from '../storage/structuredPageCreation.js';
import { LEGACY_TYPE_MAPPING } from '../migration/legacyPropertiesMapping.js';
import { collectAssetReferencesFromPages } from '../storage/assetReferenceScanner.js';
import { backupBytesDigest } from '../storage/backupDefinitionCoverage.js';
import { normalizeWorkspacePath } from '../storage/storageAdapterContract.js';
import {
  parseMarkdown
} from '../core/markdown.js';

import {
  buildPageRecordContent
} from '../core/pageRecord.js';

import {
  createPageFromRecordContent
} from '../storage/storage.js';

import {
  getStorageAdapter,
  hasWorkspaceAccess, captureStorageWorkspaceContext, assertStorageWorkspaceContext
} from '../storage/storageAdapter.js';

import {
  getUniqueCopyTitle
} from '../validation/pageTitleValidation.js';

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
    version: 2,
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

  const current = await readCardTypeCatalog();
  const registry = createCardTypeRegistryFromCatalog(current.catalog, { bundledTypes: [], bundledFieldSets: [] });
  template.seed = exportPortablePageRecord(page);
  template.seed.body = template.body;
  template.cardTypes = collectPageDefinitionClosure([page], registry);
  const references = collectAssetReferencesFromPages([page], { registry });
  if (references.some(reference => reference.incomplete)) throw new Error('Template asset closure is incomplete');
  template.assets = [];
  for (const path of [...new Set(references.map(reference => reference.path).filter(Boolean))].sort()) {
    const bytes = new Uint8Array(await getStorageAdapter().readBinary(path));
    template.assets.push({ path, bytes: Array.from(bytes), digest: await backupBytesDigest(bytes) });
  }

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
  if (pageTemplate.version && ![1, 2].includes(pageTemplate.version)) throw new Error('Unsupported template version');
  const workspace = captureStorageWorkspaceContext();
  const guard = () => assertStorageWorkspaceContext(workspace);

  const title =
    getUniqueCopyTitle(
      pageTemplate.title
    );

  const body =
    applyTemplateTitle(
      pageTemplate.body,
      title
    );

  if (pageTemplate.version === 2 && pageTemplate.seed?.variablesJson) {
    const current = await readCardTypeCatalog();
    guard();
    // Immutable activation detects collisions before any instance write.
    await activateCardTypeDefinitions({ ...pageTemplate.cardTypes, expectedIdentity: current.identity });
    guard();
    const adapter = getStorageAdapter();
    const content = portablePageContent(pageTemplate.seed, {
      id: crypto.randomUUID(), parent: parentId ?? null, order: Date.now(), body
    }, { newIdentity: true });
    await validateNewPageContent(content, adapter);
    // Verify every embedded asset before any writes; a path collision never overwrites user data.
    const missingAssets = [];
    for (const asset of pageTemplate.assets || []) {
      guard();
      if (!asset.path.startsWith('assets/') || normalizeWorkspacePath(asset.path) !== asset.path ||
          !Array.isArray(asset.bytes) || asset.bytes.some(value => !Number.isInteger(value) || value < 0 || value > 255) ||
          await backupBytesDigest(new Uint8Array(asset.bytes)) !== asset.digest) throw new Error('Invalid template asset');
      let existing;
      try { existing = await adapter.readBinary(asset.path); }
      catch (error) {
        if (error.code !== 'ENOENT' && error.name !== 'NotFoundError' && !/^missing /i.test(error.message)) throw error;
        missingAssets.push(asset);
      }
      if (existing && await backupBytesDigest(existing) !== asset.digest) throw new Error('Template asset collision');
    }
    for (const asset of missingAssets) {
      guard();
      await adapter.ensureDirectory(asset.path.slice(0, asset.path.lastIndexOf('/')));
      await adapter.writeBinary(asset.path, new Uint8Array(asset.bytes));
      if (await backupBytesDigest(await adapter.readBinary(asset.path)) !== asset.digest) throw new Error('Template asset readback mismatch');
    }
    guard();
    return createPageFromRecordContent(content);
  }

  // An explicit old-template instance can reuse free content, but never create a new legacy owner.
  if (/card-properties-block|data-block-type\s*=\s*["'](?:properties|dnd)["']|item-set-block|data-character-effects/.test(body)) {
    throw Object.assign(new Error('Template requires explicit source migration/adoption before creating a structured instance'), { code: 'STRUCTURED_PORTABILITY_BLOCKED' });
  }
  const formalType = LEGACY_TYPE_MAPPING[pageTemplate.type || 'note'];
  const envelope = await prepareNewCardEnvelope(formalType, getStorageAdapter());
  guard();
  if (['object', 'note'].includes(pageTemplate.type || 'note')) envelope.values['item.isObject'] = true;

  const content =
    (pageTemplate.seed ? (patch => portablePageContent(pageTemplate.seed, patch, { newIdentity: true })) : buildPageRecordContent)(
      {
        id:
          crypto.randomUUID(),
        parent:
          parentId ?? null,
        order:
          Date.now(),
        tags:
          pageTemplate.tags || [],
        template:
          pageTemplate.template || 'card',
        type:
          formalType,
        schemaVersion: 2,
        variablesJson: envelope,
        ...(pageTemplate.seed ? {} : { aliases: [], relationships: [] }),
        body:
          sanitizePersistentHTMLOnSave(
            body
          )
      }
    );

  return createPageFromRecordContent(
    content
  );
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

  } catch (error) {

    if (error.name === 'NotFoundError' || error.code === 'ENOENT' || /^(?:missing\b|(?:file )?not found\b)/i.test(error.message)) return null;
    throw error;
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

  } catch (error) {

    if (error.code === 'STRUCTURED_PORTABILITY_BLOCKED' || /Unsupported/.test(error.message)) throw error;
    return [];
  }
}


export function serializePageTemplates(
  templates
) {

  return `${JSON.stringify(
    {
      version: 2,
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

  let raw;
  try { raw = JSON.parse(text || '{}'); } catch { return []; }
  if (raw?.version !== undefined && ![1, 2].includes(raw.version)) {
    const error = new Error('Unsupported template format');
    error.code = 'STRUCTURED_PORTABILITY_BLOCKED';
    throw error;
  }
  const records = Array.isArray(raw) ? raw : raw?.templates;
  if (raw.version !== 2) for (const template of (Array.isArray(records) ? records : [])) assertLegacyPortability(template, 'Legacy template load');

  return normalizeTemplates(records);
}


function normalizeTemplates(
  templates
) {

  if (!Array.isArray(templates)) return [];
  for (const template of templates) {
    if (template.version !== undefined && ![1, 2].includes(template.version)) throw Object.assign(new Error('Unsupported template version'), { code: 'STRUCTURED_PORTABILITY_BLOCKED' });
    if (template.version === 2 && (!template.seed || !template.cardTypes)) throw Object.assign(new Error('Incomplete template v2 seed'), { code: 'STRUCTURED_PORTABILITY_BLOCKED' });
    if (template.version !== 2) assertLegacyPortability(template, 'Legacy template serialization');
  }

  return templates
    .filter(Boolean)
    .map(template => ({
      ...(template.version === 2 ? { version: 2, seed: structuredClone(template.seed), cardTypes: structuredClone(template.cardTypes), assets: structuredClone(template.assets || []) } : {}),
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
