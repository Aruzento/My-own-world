import { test, expect } from '@playwright/test';

async function fixture(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    window.__tiers = await adoptionFixture({ actors: [{ id: 'a', blocks: [[['A', '3']]] }, { id: 'b', blocks: [] }] });
  });
}
async function backupPanel(page) {
  await page.locator('#appSettingsBtn').click();
  await page.locator('[data-settings-category="backup"]').click();
  return page.locator('[data-settings-page="backup"]');
}

test('manual full backup paints progress before slow phase, rejects double submit, verifies exactly one snapshot', async ({ page }) => {
  await fixture(page);
  const panel = await backupPanel(page);
  await page.evaluate(async () => {
    const f = window.__tiers, read = f.adapter.readText.bind(f.adapter);
    f.adapter.readText = async path => {
      if (path.includes('card-types') && !f.held) {
        f.held = true; await new Promise(resolve => { f.release = resolve; });
      }
      return read(path);
    };
  });
  const button = panel.getByRole('button', { name: 'Создать резервную копию' });
  await button.click();
  await expect(button).toBeDisabled();
  await expect(page.locator('.operation-progress')).toBeVisible();
  await expect(page.locator('.operation-progress-stage')).toContainText('подготовка');
  await button.evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await expect.poll(() => page.evaluate(() => Boolean(window.__tiers.release))).toBe(true);
  await page.evaluate(() => window.__tiers.release());
  await expect(button).toBeEnabled();
  await expect(page.locator('.operation-progress-stage')).toContainText('Резервная копия создана');
  const counts = await page.evaluate(async () => {
    const { getWorkspacePerformanceEvents } = await import('/js/performance/workspacePerformance.js');
    return { manifests: window.__tiers.writes.filter(write => write.path.endsWith('/manifest.json')).length,
      verification: getWorkspacePerformanceEvents().filter(event => event.operation === 'backup.verification').length };
  });
  expect(counts).toEqual({ manifests: 1, verification: 1 });
});

test('manual backup failure is visible and never reports verified success', async ({ page }) => {
  await fixture(page); const panel = await backupPanel(page);
  await page.evaluate(() => { window.__tiers.adapter.writeText = async () => { throw new Error('disk full'); }; });
  await panel.getByRole('button', { name: 'Создать резервную копию' }).click();
  await expect(page.locator('.operation-progress')).toHaveClass(/is-failed/);
  await expect(page.locator('.operation-progress-stage')).toContainText('Не удалось');
});

test('destructive orphan cleanup protects unreferenced legacy asset in one verified full snapshot', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const f = window.__tiers = await adoptionFixture({ actors: [{ id: 'legacy', values: null, blocks: [] }], items: [], noCatalog: true });
    const binaries = f.binaries = new Map(), write = f.adapter.writeBinary.bind(f.adapter);
    f.adapter.writeBinary = async (path, bytes) => { binaries.set(path, bytes.slice(0)); await write(path, bytes); };
    f.adapter.readBinary = async path => { if (!binaries.has(path)) throw new Error('Missing asset'); return binaries.get(path).slice(0); };
    await f.adapter.writeBinary('assets/orphan.bin', new Uint8Array([3, 7, 11]).buffer);
    const { renderAssetHealthPanel } = await import('/js/ui/assetHealthPanel.js');
    const host = document.createElement('div'); host.id = 'tiersAssets'; document.body.append(host);
    await renderAssetHealthPanel(host, { hasWorkspace: true, pages: f.pages,
      listAssetPaths: async () => [...binaries.keys()].filter(path => path.startsWith('assets/')),
      deleteAssetPath: async path => { await f.adapter.removeFile(path); binaries.delete(path); } });
  });
  const host = page.locator('#tiersAssets');
  await host.locator('.app-asset-health-primary').click();
  await host.locator('.app-asset-health-delete').click();
  await host.locator('.app-asset-health-danger').click();
  await expect.poll(() => page.evaluate(() => !window.__tiers.binaries.has('assets/orphan.bin'))).toBe(true);
  const result = await page.evaluate(async () => {
    const f = window.__tiers, manifestWrite = f.writes.find(write => write.path.endsWith('/manifest.json'));
    const manifest = JSON.parse(manifestWrite.content);
    const { verifyWorkspaceBackup } = await import('/js/storage/backupService.js');
    await verifyWorkspaceBackup(manifest.id, { storageAdapter: f.adapter });
    return { backups: f.writes.filter(write => write.path.endsWith('/manifest.json')).length, version: manifest.version,
      bytes: [...new Uint8Array(await f.adapter.readBinary(`.my-own-world-backups/${manifest.id}/assets/orphan.bin`))] };
  });
  expect(result).toEqual({ backups: 1, version: 2, bytes: [3, 7, 11] });
});

test('Settings restore immediately shows progress and creates one verified pre-restore safety copy', async ({ page }) => {
  await fixture(page);
  await page.evaluate(async () => {
    const f = window.__tiers;
    const { createWorkspaceBackup } = await import('/js/storage/backupService.js');
    f.original = await createWorkspaceBackup({ pages: f.pages, cleanup: false, storageAdapter: f.adapter });
    f.source = await f.adapter.readText('pages/a.md');
    const { persistPageContentCommand } = await import('/js/storage/pageCommandService.js');
    const { createPageStateIdentityFromContent } = await import('/js/core/pageRecord.js');
    const actor = f.pages.find(candidate => candidate.id === 'a');
    await persistPageContentCommand({ page: actor, content: f.source.replace(actor.title, 'Changed title'), expectedBase: createPageStateIdentityFromContent(f.source) });
  });
  const panel = await backupPanel(page);
  await panel.locator('.app-backup-restore').first().click();
  const confirm = panel.locator('.app-backup-confirm:not(.hidden)');
  await expect(confirm.getByRole('button', { name: 'Восстановить все', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const f = window.__tiers, write = f.adapter.writeText.bind(f.adapter);
    f.adapter.writeText = async (path, content) => {
      if (path.includes('.my-own-world-backups/') && !f.held) {
        f.held = true; await new Promise(resolve => { f.release = resolve; });
      }
      return write(path, content);
    };
  });
  const button = confirm.getByRole('button', { name: 'Восстановить все', exact: true });
  await button.click(); await expect(button).toBeDisabled();
  await expect(page.locator('.operation-progress')).toBeVisible();
  await button.evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await expect.poll(() => page.evaluate(() => Boolean(window.__tiers.release))).toBe(true);
  await page.evaluate(() => window.__tiers.release());
  await expect(confirm).toBeHidden();
  const result = await page.evaluate(async () => ({
    backups: window.__tiers.writes.filter(write => write.path.endsWith('/manifest.json')).length,
    same: await window.__tiers.adapter.readText('pages/a.md') === window.__tiers.source
  }));
  expect(result).toEqual({ backups: 2, same: true });
});

test('Tier C adoption confirmation immediately busy, one snapshot and verified Item before actor', async ({ page }) => {
  await fixture(page);
  await page.evaluate(async () => {
    const { renderMigrationSettings } = await import('/js/ui/settings/migrationSettings.js');
    const host = document.createElement('div'); host.id = 'tiersMigration'; document.body.append(host);
    await renderMigrationSettings(host, { pageId: 'a' });
  });
  const host = page.locator('#tiersMigration');
  await host.locator('[data-migration-step]').selectOption('inventory');
  await host.getByRole('button', { name: 'Предпросмотр', exact: true }).click();
  await expect(host.getByRole('button', { name: 'Выполнить готовые' })).toBeEnabled();
  expect(await page.evaluate(() => window.__tiers.writes.length)).toBe(0);
  await host.getByRole('button', { name: 'Выполнить готовые' }).click();
  await page.evaluate(() => {
    const f = window.__tiers, write = f.adapter.writeText.bind(f.adapter);
    f.adapter.writeText = async (path, content) => {
      if (path.includes('.my-own-world-backups/') && !f.held) {
        f.held = true; await new Promise(resolve => { f.release = resolve; });
      }
      return write(path, content);
    };
  });
  const popup = page.locator('.confirm-popup-modal:not(.hidden)'), confirm = popup.locator('.confirm-popup-confirm');
  await confirm.click();
  await expect(popup).toHaveAttribute('aria-busy', 'true'); await expect(confirm).toBeDisabled();
  await expect(popup.locator('.confirm-popup-progress')).toBeVisible();
  await confirm.evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await expect.poll(() => page.evaluate(() => Boolean(window.__tiers.release))).toBe(true);
  await page.evaluate(() => window.__tiers.release());
  await expect(popup).toBeHidden();
  const result = await page.evaluate(async () => {
    const f = window.__tiers, { parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const actual = parsePageRecordContent(await f.adapter.readText('pages/a.md'));
    return { backups: f.writes.filter(write => write.path.endsWith('/manifest.json')).length,
      pages: f.writes.filter(write => write.path.startsWith('pages/')).map(write => write.path), values: actual.variablesJson.values };
  });
  expect(result.backups).toBe(1); expect(result.pages).toEqual(['pages/A.md', 'pages/a.md']);
  expect(result.values['dnd.items']).toEqual([{ pageId: 'A' }]); expect(result.values['dnd.equippedItems']).toEqual([]);
});

test('small structured tree move has scoped durable evidence, no full copy, reload and explicit recovery', async ({ page }) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const f = window.__tiers, { updatePageTreePositions, inspectScopedTreeRecovery, recoverScopedTreeMove } = await import('/js/storage/pageStorage.js');
    const { loadWorkspace } = await import('/js/storage/workspaceStorage.js');
    const { getPageById } = await import('/js/repository/pageRepository.js');
    const sources = f.pages.filter(page => ['a', 'b'].includes(page.id)).map(page => page.content);
    const moved = await updatePageTreePositions(f.pages.filter(page => ['a', 'b'].includes(page.id)).map((page, index) => ({ page, parentId: 'A', order: index + 100 })), { skipCheckpoint: true });
    await loadWorkspace();
    const parents = ['a', 'b'].map(id => getPageById(id).parent);
    const inspection = await inspectScopedTreeRecovery(moved.operationId);
    const restored = await recoverScopedTreeMove(moved.operationId, { confirm: true });
    return { parents, status: inspection.status, restored: restored.status,
      same: await Promise.all(['a', 'b'].map(async (id, index) => await f.adapter.readText(`pages/${id}.md`) === sources[index])),
      backups: f.writes.filter(write => write.path.endsWith('/manifest.json')).length };
  });
  expect(result).toEqual({ parents: ['A', 'A'], status: 'ready', restored: 'completed', same: [true, true], backups: 0 });
});

test('Properties migration checkpoint resume retains original operation/backup and does not create hidden snapshot', async ({ page }) => {
  await fixture(page);
  const result = await page.evaluate(async () => {
    const { adoptionFixture } = await import('/tests/fixtures/inventoryAdoptionFixtures.mjs');
    const { buildPageRecordContent, createRuntimePageFromContent, parsePageRecordContent } = await import('/js/core/pageRecord.js');
    const { setPages } = await import('/js/stateActions.js');
    const { previewLegacyPropertiesMigration, executeLegacyPropertiesMigration, resumeLegacyPropertiesMigration } = await import('/js/migration/propertiesMigration.js');
    const fixtures = await (await fetch('/tests/fixtures/legacyPropertiesMigration.json')).json();
    const f = await adoptionFixture({ actors: [], items: [] });
    const pages = ['first', 'second'].map(id => createRuntimePageFromContent({ path: `pages/${id}.md`, name: `${id}.md`,
      content: buildPageRecordContent({ id, type: 'character', template: 'card', body: fixtures.character.body }) }));
    for (const page of pages) await f.adapter.writeText(page.path, page.content);
    setPages(pages); f.writes.length = 0;
    const write = f.adapter.writeText.bind(f.adapter); let crashed = false;
    f.adapter.writeText = async (path, content) => {
      await write(path, content);
      if (!crashed && path.includes('/pending/') && content.includes('"verified"')) { crashed = true; throw new Error('checkpoint crash'); }
    };
    const failed = await executeLegacyPropertiesMigration(await previewLegacyPropertiesMigration({ pageIds: pages.map(page => page.id) }), { confirm: true });
    f.adapter.writeText = write;
    const journal = JSON.parse(await f.adapter.readText(`.my-own-world-ops/pending/${failed.operationId}.json`));
    const resumed = await resumeLegacyPropertiesMigration(journal, { confirm: true });
    return { failed, resumed, backups: f.writes.filter(write => write.path.endsWith('/manifest.json')).length,
      receipts: await Promise.all(pages.map(async page => parsePageRecordContent(await f.adapter.readText(page.path)).variablesJson?.migration?.operationId)) };
  });
  expect(result.failed.status).toBe('failed'); expect(result.resumed.status).toBe('completed');
  expect(result.backups).toBe(1); expect(result.resumed.backupId).toBe(result.failed.backupId);
  expect(result.receipts).toEqual([result.failed.operationId, result.failed.operationId]);
});
