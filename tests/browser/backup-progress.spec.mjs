import { test, expect } from '@playwright/test';

async function setup(page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const { backupProgressFixture } = await import('/tests/fixtures/backupProgressFixtures.mjs');
    const f = window.__progressBackup = await backupProgressFixture();
    f.held = {}; f.release = {};
    f.hold = async phase => { if (f.held[phase]) return; f.held[phase] = true; await new Promise(resolve => { f.release[phase] = resolve; }); };
  });
  await page.locator('#appSettingsBtn').click();
  await page.locator('[data-settings-category="backup"]').click();
  return page.locator('[data-settings-page="backup"]').getByRole('button', { name: 'Создать резервную копию' });
}

test('manual backup exposes held read/hash/copy/verification phases with correct counters and one submit', async ({ page }) => {
  const button = await setup(page);
  await page.evaluate(() => {
    const f = window.__progressBackup, text = f.adapter.readText.bind(f.adapter), binary = f.adapter.readBinary.bind(f.adapter),
      writeText = f.adapter.writeText.bind(f.adapter), writeBinary = f.adapter.writeBinary.bind(f.adapter);
    f.adapter.readText = async path => {
      if (path === 'pages/progress-0.md') await f.hold('read');
      if (path.includes('.my-own-world-backups/') && path.endsWith('/pages/progress-0.md')) await f.hold('verify');
      return text(path);
    };
    f.adapter.readBinary = async path => { if (path === 'assets/1.bin') await f.hold('digest'); return binary(path); };
    f.adapter.writeText = async (path, content) => { if (path.includes('.my-own-world-backups/') && path.endsWith('/pages/progress-0.md')) await f.hold('pages'); return writeText(path, content); };
    f.adapter.writeBinary = async (path, content) => { if (path.includes('.my-own-world-backups/') && path.endsWith('/assets/0.bin')) await f.hold('assets'); return writeBinary(path, content); };
  });
  await button.click();
  await expect(button).toBeDisabled();
  await button.evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  for (const [phase, label, count] of [['read', 'чтение страниц', '0/3'], ['digest', 'проверка файлов', '1/2'],
    ['pages', 'копирование страниц', '0/3'], ['assets', 'копирование файлов', '0/2'], ['verify', 'проверка резервной копии', '0/5']]) {
    await expect.poll(() => page.evaluate(key => Boolean(window.__progressBackup.release[key]), phase)).toBe(true);
    await expect(page.locator('.operation-progress-stage')).toContainText(label);
    await expect(page.locator('.operation-progress-count')).toHaveText(count);
    await expect(page.locator('.operation-progress')).not.toHaveClass(/is-complete|is-failed/);
    await expect(button).toBeDisabled();
    // Event loop is accepting input while storage is deliberately pending.
    expect(await page.evaluate(() => new Promise(resolve => setTimeout(() => resolve('heartbeat'), 0)))).toBe('heartbeat');
    await page.evaluate(key => window.__progressBackup.release[key](), phase);
  }
  await expect(button).toBeEnabled();
  await expect(page.locator('.operation-progress-stage')).toContainText('Резервная копия создана');
  expect(await page.evaluate(() => window.__progressBackup.writes.filter(write => write.path.endsWith('/manifest.json')).length)).toBe(1);
});

test('asset digest exception visibly fails manual backup, reenables submit and retains incomplete evidence', async ({ page }) => {
  const button = await setup(page);
  await page.evaluate(() => {
    const f = window.__progressBackup, read = f.adapter.readBinary.bind(f.adapter);
    f.adapter.readBinary = async path => { if (path === 'assets/1.bin') throw new Error('digest read failed'); return read(path); };
  });
  await button.click();
  await expect(button).toBeEnabled();
  await expect(page.locator('.operation-progress')).toHaveClass(/is-failed/);
  await expect(page.locator('.operation-progress-stage')).toContainText('Не удалось');
  const result = await page.evaluate(async () => {
    const { listIncompleteWorkspaceBackups } = await import('/js/storage/backupService.js');
    return { manifests: window.__progressBackup.writes.filter(write => write.path.endsWith('/manifest.json')).length,
      incomplete: (await listIncompleteWorkspaceBackups()).length };
  });
  expect(result).toEqual({ manifests: 0, incomplete: 1 });
});

test('indeterminate progress has no fake zero percent or page denominator', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => { const { showOperationProgress } = await import('/js/ui/operationProgress.js');
    showOperationProgress({ label: 'Backup', stage: 'поиск файлов', total: 0 }); });
  await expect(page.locator('.operation-progress-count')).toHaveText('');
  await expect(page.locator('.operation-progress-percent')).toHaveText('…');
  await expect(page.locator('.operation-progress')).not.toHaveAttribute('aria-valuenow');
});
