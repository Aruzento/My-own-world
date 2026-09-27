import { CARD_TYPE_CATALOG_PATH, readCardTypeCatalog, parseCardTypeCatalog, createCardTypeRegistryFromCatalog } from './cardTypeCatalogStorage.js';
import { createCardVariableSnapshot } from '../variables/cardVariableStore.js';
import { parsePageRecordContent } from '../core/pageRecord.js';

// Part of backupService: bounded Stage 7 coverage, no second backup store.
export async function collectWorkspaceFiles(adapter, directory) {
  const files = [];
  let entries;
  try { entries = await adapter.listFiles(directory); }
  catch (error) {
    if (error.code === 'ENOENT' || error.name === 'NotFoundError' || /^missing /i.test(error.message)) return [];
    throw error;
  }
  for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    if (!entry.name || /[\\/]|^\.{1,2}$/.test(entry.name)) throw new Error('Unsafe workspace entry');
    const path = `${directory}/${entry.name}`;
    if (entry.kind === 'directory') files.push(...await collectWorkspaceFiles(adapter, path));
    else files.push({ name: entry.name, path });
  }
  return files;
}

export async function captureBackupDefinitions(adapter) {
  const current = await readCardTypeCatalog({ storageAdapter: adapter });
  const text = current.exists ? await adapter.readText(CARD_TYPE_CATALOG_PATH) : null;
  const catalog = text !== null ? parseCardTypeCatalog(text) : current.catalog;
  return { text, catalog, entry: text === null ? null : {
    path: CARD_TYPE_CATALOG_PATH, bytes: new TextEncoder().encode(text).length,
    digest: await backupBytesDigest(text)
  } };
}

export async function readBackupDefinitions(adapter, snapshotPath, manifest) {
  if (manifest.version !== 2) return null;
  const entry = manifest.cardTypes;
  if (!entry) return null;
  if (entry.path !== CARD_TYPE_CATALOG_PATH) throw new Error('Unsafe backup catalog path');
  const text = await adapter.readText(`${snapshotPath}/${CARD_TYPE_CATALOG_PATH}`);
  if (entry.bytes !== new TextEncoder().encode(text).length || entry.digest !== await backupBytesDigest(text)) throw new Error('Backup catalog integrity mismatch');
  return parseCardTypeCatalog(text);
}

export async function backupBytesDigest(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function assertBackupPageDefinitions(contents, catalog) {
  const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
  for (const content of contents) {
    const record = parsePageRecordContent(content, { generateId: false });
    if (record.variablesStatus.mode === 'legacy') continue;
    const snapshot = createCardVariableSnapshot({ id: record.id, content }, registry);
    if (snapshot.mode !== 'structured') throw new Error('Backup structured definition unavailable');
  }
}
