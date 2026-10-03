// Disposable adapter probe; timings are evidence, never machine-specific CI budgets.
import { performance } from 'node:perf_hooks';
import { adoptionFixture, record } from '../tests/fixtures/inventoryAdoptionFixtures.mjs';
import { createWorkspaceBackup } from '../js/storage/backupService.js';
import { clearWorkspacePerformanceEvents, getWorkspacePerformanceEvents } from '../js/performance/workspacePerformance.js';

const pageCount = Number(process.env.BACKUP_PROBE_PAGES || 1326);
const assetCount = Number(process.env.BACKUP_PROBE_ASSETS || 64);
const f = await adoptionFixture({ actors: [], items: [] });
for (let index = 0; index < pageCount; index += 1) {
  const page = record(`probe-${index}`, index % 4 ? 'lore' : 'character', {}, `<h1>Page ${index}</h1><p>${'ordinary text '.repeat(500)}</p>`);
  f.pages.push(page); await f.adapter.writeText(page.path, page.content);
}
const binaries = new Map(), originalWrite = f.adapter.writeBinary.bind(f.adapter);
f.adapter.writeBinary = async (path, bytes) => { binaries.set(path, bytes.slice(0)); await originalWrite(path, bytes); };
f.adapter.readBinary = async path => { if (!binaries.has(path)) throw new Error(`Missing ${path}`); return binaries.get(path).slice(0); };
for (let index = 0; index < assetCount; index += 1) await f.adapter.writeBinary(`assets/${index}.bin`, new Uint8Array(262144).buffer);
let activePageReads = 0, peakPageReads = 0, heartbeats = 0, lastBeat = performance.now(), maxGapMs = 0;
const read = f.adapter.readText.bind(f.adapter);
f.adapter.readText = async path => {
  if (!path.startsWith('pages/')) return read(path);
  activePageReads += 1; peakPageReads = Math.max(peakPageReads, activePageReads);
  try { await new Promise(resolve => setTimeout(resolve, 1)); return await read(path); }
  finally { activePageReads -= 1; }
};
const progress = [], started = performance.now();
clearWorkspacePerformanceEvents();
const timer = setInterval(() => { const now = performance.now(); heartbeats += 1; maxGapMs = Math.max(maxGapMs, now - lastBeat); lastBeat = now; }, 0);
try { await createWorkspaceBackup({ pages: f.pages, id: 'progress-probe', cleanup: false, onProgress: event => progress.push({ ...event, at: performance.now() }) }); }
finally { clearInterval(timer); }
const phases = getWorkspacePerformanceEvents().filter(event => event.operation.startsWith('backup.')).reverse();
console.log(JSON.stringify({ fixture: { pages: pageCount, assets: assetCount, assetBytes: assetCount * 262144, durablePageReadLatencyMs: 1 },
  elapsedMs: Math.round(performance.now() - started), heartbeats, maxHeartbeatGapMs: Math.round(maxGapMs), peakPageReads,
  phases: phases.map(event => ({ operation: event.operation, durationMs: event.durationMs,
    progressEvents: progress.filter(item => item.at >= event.startedAt && item.at <= event.endedAt).length })),
  progressStages: Object.fromEntries([...new Set(progress.map(event => event.stage))].map(stage => [stage, progress.filter(event => event.stage === stage).length])) }, null, 2));
