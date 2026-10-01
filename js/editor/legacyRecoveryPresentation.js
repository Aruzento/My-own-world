// Recovery HTML is retained by the serializer, but is never a live editor owner.
const originals = new WeakMap();
let sequence = 0;
export function presentLegacyRecoverySources(editor) {
  const entries = new Map();
  for (const block of editor.querySelectorAll('.card-properties-block, [data-block-type="properties"], .dnd-stats-block, [data-block-type="dnd"]')) {
    const id = String(++sequence); entries.set(id, block.outerHTML);
    block.dataset.legacyRecoveryId = id;
    block.replaceChildren();
    const notice = document.createElement('div'); notice.dataset.runtime = 'true'; notice.setAttribute('role', 'status');
    notice.textContent = 'Legacy данные сохранены для migration/recovery. Откройте Настройки → Миграция карточек.';
    block.append(notice);
  }
  originals.set(editor, entries);
}

export function restoreLegacyRecoverySources(editor, clone) {
  for (const block of clone.querySelectorAll('[data-legacy-recovery-id]')) {
    const original = originals.get(editor)?.get(block.dataset.legacyRecoveryId);
    if (!original) throw new Error('Recovery HTML source missing; body save blocked');
    block.outerHTML = original;
  }
}
