import { catalog, registry, record } from './inventoryAdoptionFixtures.mjs';
import { createEditConflictFixture } from './editConflictFixtures.mjs';
import { setPages, setCurrentPage } from '../../js/stateActions.js';
import { parsePageRecordContent, updatePageRecordContent } from '../../js/core/pageRecord.js';
import { CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog } from '../../js/storage/cardTypeCatalogStorage.js';
export { catalog, registry };
export const ownPayload = { version: 1, conditions: [{ key: 'poisoned', label: 'Poisoned', source: 'manual', note: 'keep' },
  { key: 'exhaustion', level: 2 }], effects: [{ id: 'own', title: 'Own buff', sourceType: 'item', sourcePageId: 'historical-missing',
  modifiers: { armorClass: 2, speed: 5, initiative: 1, abilityChecks: { str: 1 }, savingThrows: { dex: 0 } },
  flags: { magical: true } }], selectedRuleIds: ['r1'] };
export const effectsBody = raw => '<h1>Effects Actor</h1><p data-persistent-editable="true">Recovery evidence</p>' +
  `<div class="template-block character-effects-block" data-block-type="characterEffects" data-block-version="1"><script type="application/json" data-character-effects>${raw}</script></div>`;

// Node DOM double; Chromium tests exercise actual inert parsing and DOM structure.
export function effectsParser(pages, specifications = {}) {
  const bodies = new Map(pages.map(page => [parsePageRecordContent(page.content).rawBody, specifications[page.id] || {}]));
  return class FixtureParser {
    parseFromString() { return { createElement() { return { set innerHTML(body) {
      const spec = bodies.get(body); if (!spec) throw new Error('Unregistered body');
      const entries = spec.noData || spec.noBlock && !spec.orphan ? [] : [{ textContent: spec.raw ?? JSON.stringify(ownPayload),
        getAttribute: () => spec.attribute ?? '', outerHTML: '<script>' }];
      if (spec.multiData) entries.push({ ...entries[0] });
      const blocks = spec.noBlock ? [] : [{ contains: element => entries.includes(element), getAttribute: () => 'block', outerHTML: '<block>' }];
      if (spec.multiBlock) blocks.push({ ...blocks[0], contains: () => false });
      this.content = { querySelectorAll: selector => selector === '.character-effects-block' ? blocks : entries };
    } }; } }; }
  };
}
export async function effectsAdoptionFixture({ actors = [{ id: 'actor' }], noCatalog = false, catalogOverride = catalog } = {}) {
  const base = await createEditConflictFixture(); await base.adapter.removeFile(base.page.path);
  const pages = actors.map(actor => {
    const page = record(actor.id, actor.type || 'character', actor.values === null ? null : actor.values || {},
      actor.body ?? (actor.noBlock ? '<h1>No effects</h1>' : effectsBody(actor.raw ?? JSON.stringify(ownPayload))));
    if (actor.envelope || actor.extensions) {
      const envelope = { ...parsePageRecordContent(page.content).variablesJson, ...actor.envelope,
        ...(actor.extensions ? { extensions: actor.extensions } : {}) };
      page.content = updatePageRecordContent(page.content, { variablesJson: envelope }, { preserveUnchangedMetadata: true, updateTimestamp: false });
    }
    return page;
  });
  for (const page of pages) await base.adapter.writeText(page.path, page.content);
  if (!noCatalog) await base.adapter.writeText(CARD_TYPE_CATALOG_PATH, serializeCardTypeCatalog(catalogOverride));
  setCurrentPage(null); setPages(pages);
  const writes = [], write = base.adapter.writeText.bind(base.adapter);
  base.adapter.writeText = async (path, content) => { writes.push({ path, content }); return write(path, content); };
  return { ...base, pages, actor: pages[0], writes, options: { pageIds: actors.map(actor => actor.id),
    DOMParser: effectsParser(pages, Object.fromEntries(actors.map(actor => [actor.id, actor]))) } };
}
