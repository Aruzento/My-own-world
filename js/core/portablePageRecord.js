import { parsePageRecordContent, buildPageRecordContent } from './pageRecord.js';
import { deepCloneData } from '../cardTypes/definitionIdentity.js';
import { copyPageContent } from '../storage/structuredPageCreation.js';

// Portable data retains unknown front matter through the PageRecord codec.
export function exportPortablePageRecord(page) {
  const record = page.content ? parsePageRecordContent(page.content) : page;
  if (record.variablesStatus && !['legacy', 'structured'].includes(record.variablesStatus.mode)) throw new Error('Unavailable structured page cannot be exported lossily');
  return deepCloneData({ id: record.id, title: page.title || record.title || '', parent: record.parent ?? null,
    order: record.order, type: record.type, template: record.template, tags: record.tags || [], aliases: record.aliases || [],
    relationships: record.relationships || [], schemaVersion: record.schemaVersion,
    ...(record.variablesJson ? { variablesJson: record.variablesJson } : {}),
    frontMatter: record.frontMatter || null, invalidFrontMatter: record.invalidFrontMatter || {}, body: record.rawBody ?? record.body ?? '' });
}

export function portablePageContent(page, patch = {}, { newIdentity = false } = {}) {
  const content = buildPageRecordContent({ ...page, body: page.body, preserveBody: true });
  return newIdentity ? copyPageContent(content, patch) : buildPageRecordContent({ ...page, ...patch, preserveBody: true });
}
