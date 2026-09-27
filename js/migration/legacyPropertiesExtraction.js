import { deepFreeze } from '../cardTypes/definitionIdentity.js';
import { parsePageRecordContent, createPageStateIdentityFromContent } from '../core/pageRecord.js';

// A template in a detached document keeps scripts, handlers and resource loading
// inert. No extracted node is inserted into the application or serialized back.
export function extractLegacyProperties(page, { DOMParser: Parser = globalThis.DOMParser } = {}) {
  const record = parsePageRecordContent(page.content, { generateId: false });
  const result = { version: 1, pageId: record.id, sourceType: record.type,
    sourceIdentity: createPageStateIdentityFromContent(page.content), mode: record.variablesStatus.mode,
    blocks: [], issues: [] };
  if (result.mode !== 'legacy') return deepFreeze(result);
  if (!Parser) { result.issues.push({ code: 'html-reader-unavailable' }); return deepFreeze(result); }
  let root;
  try {
    const document = new Parser().parseFromString('', 'text/html');
    const template = document.createElement('template');
    template.innerHTML = record.rawBody;
    root = template.content;
  }
  catch (error) { result.issues.push({ code: 'html-reader-failed', message: String(error.message) }); return deepFreeze(result); }
  const blocks = [...root.querySelectorAll('[data-block-type="properties"], .card-properties-block')];
  for (const [index, block] of blocks.entries()) {
    const entry = { index, cardType: block.getAttribute('data-card-type'), controls: [], issues: [] };
    const keys = new Set();
    for (const control of block.querySelectorAll('[data-property-name]')) {
      const key = control.getAttribute('data-property-name');
      const wrapper = control.closest('[data-property-custom="true"]');
      const tag = control.tagName.toLowerCase();
      const type = control.getAttribute('data-property-type') || control.getAttribute('type') || (control.hasAttribute('contenteditable') ? 'textarea' : tag);
      const manual = control.getAttribute('data-property-manual');
      if (!key || keys.has(key)) entry.issues.push({ code: 'duplicate-or-empty-key', key });
      keys.add(key);
      if (manual !== null && !['true', 'false'].includes(manual)) entry.issues.push({ code: 'invalid-manual-marker', key });
      let raw = null;
      let present = true;
      if (tag === 'input') {
        present = type === 'checkbox' || control.hasAttribute('value');
        raw = type === 'checkbox' ? control.hasAttribute('checked') : control.getAttribute('value');
      } else if (tag === 'textarea' || control.hasAttribute('contenteditable')) raw = control.textContent;
      else if (tag === 'select') {
        const selected = [...control.querySelectorAll('option[selected]')];
        if (selected.length > 1 || control.multiple) entry.issues.push({ code: 'ambiguous-select', key });
        present = selected.length === 1;
        raw = present ? selected[0].getAttribute('value') ?? selected[0].textContent : null;
      } else entry.issues.push({ code: 'unsupported-control', key });
      entry.controls.push({ key, tag, type, raw, present, manual: manual === 'true', manualState: manual,
        custom: Boolean(wrapper), label: wrapper?.getAttribute('data-property-label') || key,
        html: control.outerHTML, customMetadata: wrapper ? [...wrapper.attributes].map(a => [a.name, a.value]) : [] });
    }
    if (!entry.cardType || !entry.controls.length) entry.issues.push({ code: 'malformed-properties-block' });
    result.blocks.push(entry);
  }
  if (blocks.length > 1) result.issues.push({ code: 'multiple-properties-blocks' });
  // Detect damaged/unfinished markers that the tolerant HTML parser discarded.
  if (!blocks.length && /card-properties-block|data-block-type\s*=\s*["']?properties/i.test(record.rawBody)) {
    result.issues.push({ code: 'malformed-properties-marker' });
  }
  if (root.querySelector('[data-block-type="dnd"], .dnd-block, .dnd-stats-block, [data-dnd-hp]')) {
    result.issues.push({ code: 'legacy-dnd-source-requires-review' });
  }
  return deepFreeze(result);
}
