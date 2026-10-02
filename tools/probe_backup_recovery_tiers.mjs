// Disposable structural evidence. No user workspace or machine-specific gate.
import { performance } from 'node:perf_hooks';
import { adoptionFixture, record } from '../tests/fixtures/inventoryAdoptionFixtures.mjs';
import { setPages } from '../js/stateActions.js';
import { createWorkspaceBackup, verifyWorkspaceBackup, consumeCreatedBackupVerification } from '../js/storage/backupService.js';
import { updatePageTreePositions } from '../js/storage/pageStorage.js';

async function fixture() {
  const f = await adoptionFixture({ actors: [{ id: 'a', blocks: [] }, { id: 'b', blocks: [] }], items: [] });
  for (let index = 0; index < 100; index += 1) {
    const page = record(`unrelated-${index}`, 'lore', {}, `<h1>Unrelated ${index}</h1><p>${'text '.repeat(200)}</p>`);
    f.pages.push(page); await f.adapter.writeText(page.path, page.content);
  }
  setPages(f.pages);
  const binaries = new Map(), writeBinary = f.adapter.writeBinary.bind(f.adapter);
  f.adapter.writeBinary = async (path, bytes) => { binaries.set(path, bytes.slice(0)); await writeBinary(path, bytes); };
  f.adapter.readBinary = async path => {
    if (!binaries.has(path)) throw new Error(`Missing asset ${path}`);
    return binaries.get(path).slice(0);
  };
  for (let index = 0; index < 4; index += 1) await f.adapter.writeBinary(`assets/${index}.bin`, new Uint8Array(65536).buffer);
  const stats = { readText: 0, writeText: 0, readBinary: 0, writeBinary: 0, listFiles: 0, bytesRead: 0, bytesWritten: 0, manifestReads: 0, copies: 0, copiedPages: 0, copiedAssets: 0 };
  for (const method of ['readText', 'writeText', 'readBinary', 'writeBinary', 'listFiles']) {
    const original = f.adapter[method].bind(f.adapter);
    f.adapter[method] = async (...args) => {
      stats[method] += 1;
      const result = await original(...args), path = String(args[0]);
      if (method === 'readText') { stats.bytesRead += Buffer.byteLength(result); if (path.endsWith('/manifest.json')) stats.manifestReads += 1; }
      if (method === 'readBinary') stats.bytesRead += result.byteLength;
      if (method.startsWith('write')) {
        stats.bytesWritten += typeof args[1] === 'string' ? Buffer.byteLength(args[1]) : args[1].byteLength;
        if (path.includes('.my-own-world-backups/')) {
          if (path.endsWith('/manifest.json')) stats.copies += 1;
          if (path.includes('/pages/')) stats.copiedPages += 1;
          if (path.includes('/assets/')) stats.copiedAssets += 1;
        }
      }
      return result;
    };
  }
  return { ...f, stats };
}
const results = {};
for (const mode of ['old-caller-duplicate-verification', 'single-verification-owner', 'small-scoped-tree']) {
  const f = await fixture(), started = performance.now(), progress = [];
  if (mode === 'small-scoped-tree') await updatePageTreePositions(f.pages.slice(0, 2).map((page, index) => ({ page, parentId: 'unrelated-0', order: index + 100 })), { skipCheckpoint: true });
  else {
    const manifest = await createWorkspaceBackup({ pages: f.pages, cleanup: false, id: 'probe', onProgress: value => progress.push(value.stage) });
    if (mode === 'old-caller-duplicate-verification') await verifyWorkspaceBackup(manifest.id, { storageAdapter: f.adapter });
    else await consumeCreatedBackupVerification(manifest, { storageAdapter: f.adapter });
  }
  results[mode] = { ...f.stats, elapsedMs: Math.round(performance.now() - started), firstProgress: progress[0] || null, verificationPhases: progress.filter(value => value === 'проверка').length };
}
console.log(JSON.stringify({ fixture: { pages: 102, assets: 4, assetBytes: 262144 }, note: 'BEFORE replays the exact old create+verify caller pattern; AFTER uses the creation receipt. Tree measures the production scoped command.', results }, null, 2));
