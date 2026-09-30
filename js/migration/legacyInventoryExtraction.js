import { parsePageRecordContent, createPageStateIdentityFromContent } from '../core/pageRecord.js';
import { deepFreeze } from '../cardTypes/definitionIdentity.js';

// Migration evidence is read from an inert template, never from editor/runtime
// controls or the normalizing InventoryModel. A missing reader is not empty data.
export function extractLegacyInventory(page, { DOMParser: Parser = globalThis.DOMParser } = {}) {
  const record = parsePageRecordContent(page.content, { generateId: false });
  const result = { version: 1, pageId: record.id, sourceIdentity: createPageStateIdentityFromContent(page.content),
    blocks: [], issues: [] };
  if (!Parser) return deepFreeze({ ...result, issues: [{ code: 'html-reader-unavailable' }] });
  try {
    const document = new Parser().parseFromString('', 'text/html');
    const template = document.createElement('template');
    template.innerHTML = record.rawBody;
    for (const [index, block] of [...template.content.querySelectorAll('.item-set-block, .universal-list-block')].entries()) {
      const universal = block.classList.contains('universal-list-block');
      const kind = block.getAttribute('data-list-kind');
      const selected = [...(block.querySelector('.universal-list-kind-select')?.querySelectorAll('option[selected]') || [])];
      const selectedKind = selected.length === 1 ? selected[0].getAttribute('value') : null;
      const ambiguousKind = universal && (!selectedKind && !kind || selected.length > 1 ||
        kind && selectedKind && kind !== selectedKind ||
        [kind, selectedKind].some(value => value && !['items', 'skills', 'spells'].includes(value)));
      if (universal && !ambiguousKind && (selectedKind || kind) !== 'items') continue;
      const entry = { index, id: block.getAttribute('data-block-id') || block.getAttribute('id'),
        type: universal ? 'universal-items' : 'items', html: block.outerHTML, chips: [], issues: [] };
      if (ambiguousKind) {
        entry.issues.push({ code: 'ambiguous-inventory-kind' });
      }
      for (const [chipIndex, chip] of [...block.querySelectorAll('.item-set-chip')].entries()) {
        const fields = [...chip.querySelectorAll('.item-set-quantity')];
        const pageId = chip.getAttribute('data-page-id');
        const rawQuantity = fields.length === 1 ? fields[0].getAttribute('value') : null;
        const issues = [];
        if (!pageId || pageId.trim() !== pageId) issues.push({ code: 'invalid-exact-page-id' });
        const quantity = typeof rawQuantity === 'string' && /^[1-9]\d*$/.test(rawQuantity) ? Number(rawQuantity) : null;
        if (!Number.isSafeInteger(quantity) || quantity < 1 || fields.length !== 1) issues.push({ code: 'malformed-quantity' });
        entry.chips.push({ index: chipIndex, pageId, rawQuantity, quantity, html: chip.outerHTML, issues });
      }
      result.blocks.push(entry);
    }
    if (result.blocks.length > 1) result.issues.push({ code: 'multiple-inventory-blocks' });
    if (!result.blocks.length && /item-set-block|universal-list-block/.test(record.rawBody) &&
        !template.content.querySelector('.item-set-block, .universal-list-block')) result.issues.push({ code: 'malformed-inventory-marker' });
  } catch (error) { result.issues.push({ code: 'html-reader-failed', message: String(error.message) }); }
  return deepFreeze(result);
}
