import { BUNDLED_CARD_TYPE_DEFINITIONS as types, BUNDLED_FIELD_SET_DEFINITIONS as fieldSets } from '../../js/cardTypes/definitions/bundledDefinitions.js';
import { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } from '../../js/core/pageRecord.js';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog, createCardTypeRegistryFromCatalog } from '../../js/storage/cardTypeCatalogStorage.js';
import { createEditConflictFixture } from './editConflictFixtures.mjs';
import { setPages, setCurrentPage } from '../../js/stateActions.js';

export const catalog = { formatVersion: 1, revision: 1, types, fieldSets };
export const registry = createCardTypeRegistryFromCatalog(catalog, { bundledTypes: [], bundledFieldSets: [] });
export const refs = ids => ids.map(pageId => ({ pageId }));
export function inventoryBody(blocks = [[['A', '3']]]) {
  return '<h1>Inventory</h1><p data-persistent-editable="true">Recovery evidence</p>' + blocks.map(chips =>
    '<div class="template-block item-set-block" data-block-type="items" data-block-version="1"><div class="item-set-list">' +
    chips.map(([id, quantity]) => `<button class="item-set-chip" type="button"${id === null ? '' : ` data-page-id="${id}"`}>
      <span class="item-set-title">Exact Item</span><label class="item-set-quantity-label"><input class="item-set-quantity" type="text"${quantity === null ? '' : ` value="${quantity}"`}></label>
      <span class="item-set-remove">×</span></button>`).join('') + '</div></div>').join('') +
    '<script type="application/json" data-character-effects>{"conditions":[],"effects":[]}</script>';
}
export function record(id, type, values = {}, body = '<h1>Item</h1>') {
  const content = buildPageRecordContent({ id, type, schemaVersion: values ? 2 : 1, template: 'card', body,
    now: '2026-09-30T00:00:00Z', ...(values ? { variablesJson: { formatVersion: 1, schemaVersion: 1,
      schemaDigest: registry.getResolvedType(type, 1).digest, values, overrides: {}, inactive: [{ key: 'preserved', raw: 'keep' }] } } : {})
  }).replace('type:', 'unknownFutureMetadata: keep\ntype:');
  return createRuntimePageFromContent({ content, path: `pages/${id}.md`, name: `${id}.md` });
}

// A fixture DOM double for Node (which has no DOM). Actual persisted HTML
// parsing/inertness and universal forms are exercised with Chromium DOMParser.
export function fixtureParser(pages, blockSpecs) {
  const bodies = new Map(pages.map(page => [parsePageRecordContent(page.content).rawBody, blockSpecs[page.id] || []]));
  const node = (attrs, children = []) => ({ outerHTML: '<fixture-node>', getAttribute: key => attrs[key] ?? null,
    classList: { contains: value => (attrs.class || '').split(' ').includes(value) },
    querySelectorAll: () => children, querySelector: () => null });
  return class FixtureParser {
    parseFromString() { return { createElement() { return {
      set innerHTML(body) {
        if (!bodies.has(body)) throw new Error('Unregistered persisted body');
        const blocks = bodies.get(body).map(chips => node({ class: 'item-set-block' }, chips.map(([id, quantity]) =>
          node({ 'data-page-id': id }, [node({ value: quantity })]))));
        this.content = { querySelectorAll: () => blocks, querySelector: () => blocks[0] || null };
      }
    }; } }; }
  };
}

export async function adoptionFixture({ actors = [{ id: 'actor', blocks: [[['A', '3']]] }], items = [{ id: 'A', values: {} }], noCatalog = false } = {}) {
  const base = await createEditConflictFixture();
  // Remove fixture's unrelated bootstrap page from durable workspace too.
  await base.adapter.removeFile(base.page.path);
  const pages = actors.map(actor => record(actor.id, actor.type || 'character', actor.values === null ? null : actor.values || {}, inventoryBody(actor.blocks)))
    .concat(items.map(item => record(item.id, item.type || 'item', item.values === null ? null : item.values || {})));
  for (const page of pages) await base.adapter.writeText(page.path, page.content);
  if (!noCatalog) await base.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalog));
  setCurrentPage(null); setPages(pages);
  const writes = [];
  const write = base.adapter.writeText.bind(base.adapter);
  base.adapter.writeText = async (path, content) => { writes.push({ path, content }); return write(path, content); };
  const Parser = fixtureParser(pages, Object.fromEntries(actors.map(actor => [actor.id, actor.blocks || []])));
  return { ...base, pages, actor: pages[0], item: pages.find(page => page.type === 'item'), writes, Parser,
    options: { pageIds: actors.map(actor => actor.id), DOMParser: Parser } };
}
