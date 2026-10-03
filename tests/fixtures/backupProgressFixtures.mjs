import { adoptionFixture, record } from './inventoryAdoptionFixtures.mjs';
import { setPages } from '../../js/stateActions.js';

export async function backupProgressFixture({ pageCount = 3, assetCount = 2 } = {}) {
  const f = await adoptionFixture({ actors: [], items: [] });
  for (let index = 0; index < pageCount; index += 1) {
    const page = record(`progress-${index}`, index % 4 ? 'lore' : 'character', {}, `<h1>Page ${index}</h1><p>free content</p>`);
    f.pages.push(page); await f.adapter.writeText(page.path, page.content);
  }
  setPages(f.pages);
  const binaries = new Map(), write = f.adapter.writeBinary.bind(f.adapter);
  f.adapter.writeBinary = async (path, bytes) => { binaries.set(path, bytes.slice(0)); await write(path, bytes); };
  f.adapter.readBinary = async path => { if (!binaries.has(path)) throw new Error(`Missing ${path}`); return binaries.get(path).slice(0); };
  for (let index = 0; index < assetCount; index += 1) await f.adapter.writeBinary(`assets/${index}.bin`, new Uint8Array([1, index % 256, 3]).buffer);
  return { ...f, binaries };
}
