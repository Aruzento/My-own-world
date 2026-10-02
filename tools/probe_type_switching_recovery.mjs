import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { getStaticServerArgs } from './run_browser_smoke.mjs';

// Comparative evidence only; structural assertions are the regression gate.
const server = spawn(process.execPath, getStaticServerArgs(5183), { stdio: 'ignore', windowsHide: true });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:5183/')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch();
  const page = await browser.newPage(); await page.goto('http://127.0.0.1:5183/');
  await page.evaluate(async () => {
    const { setupTypeSwitchingProbe } = await import('/tests/fixtures/typeSwitchingProbe.mjs');
    window.__typeProbe = await setupTypeSwitchingProbe();
  });
  await page.locator('.card-type-trigger').click();
  await page.locator('.card-type-option[data-value="location"]').click();
  await page.getByRole('button', { name: 'Изменить тип', exact: true }).waitFor({ timeout: 120000 });
  await page.getByRole('button', { name: 'Изменить тип', exact: true }).click();
  await page.locator('.card-type-current').filter({ hasText: 'Локация' }).waitFor({ timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('#statusbar')?.textContent === 'Тип карточки сохранён и проверен', null, { timeout: 120000 });
  const result = await page.evaluate(() => window.__typeProbe.finish());
  await writeFile(process.argv[2] || '.type-switching-probe.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await browser?.close(); server.kill(); }
