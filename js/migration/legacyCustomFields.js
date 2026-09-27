// UUIDv5, standard URL namespace. Identity uses the persisted legacy key + page
// identity, never the display label, current order, or a new random id on retry.
export async function createLegacyCustomIdentities(pageId, extraction) {
  const mapping = {};
  const namespace = Uint8Array.from('6ba7b8119dad11d180b400c04fd430c8'.match(/../g), byte => parseInt(byte, 16));
  for (const block of extraction.blocks) {
    for (const control of block.controls) {
      if (!control.custom || !control.key || control.key.startsWith('override-')) continue;
      const name = new TextEncoder().encode(JSON.stringify(['mow-properties-v1', pageId, block.index, control.key]));
      const bytes = new Uint8Array(namespace.length + name.length);
      bytes.set(namespace); bytes.set(name, namespace.length);
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)).slice(0, 16);
      hash[6] = (hash[6] & 15) | 80; hash[8] = (hash[8] & 63) | 128;
      const hex = [...hash].map(byte => byte.toString(16).padStart(2, '0')).join('');
      mapping[`${block.index}:${control.key}`] = `custom.${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }
  return mapping;
}
