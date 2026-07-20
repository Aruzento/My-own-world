import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { chromium } from '@playwright/test';


const args =
  parseArgs(
    process.argv.slice(2)
  );

const workspace =
  args.workspace || args._[0];

const exePath =
  path.resolve(
    args.exe ||
    'src-tauri/target/release/my-own-world.exe'
  );

const output =
  args.output ||
  'docs/01-delivery/DESKTOP_NATIVE_CLICKTHROUGH_CURRENT.md';

const timeoutMs =
  Number(args.timeout || 90000);

if (!workspace) {

  console.error(
    'Usage: node tools/run_desktop_native_clickthrough.mjs --workspace "X:\\path\\to\\workspace" [--exe src-tauri/target/release/my-own-world.exe]'
  );

  process.exit(1);
}

const workspacePath =
  path.resolve(
    workspace
  );

if (!await exists(workspacePath)) {

  console.error(
    `Workspace not found: ${workspacePath}`
  );

  process.exit(1);
}

if (!await exists(exePath)) {

  console.error(
    `Desktop executable not found: ${exePath}`
  );

  process.exit(1);
}

const runStartedAt =
  new Date();

const report =
  {
    runStartedAt,
    workspacePath,
    exePath,
    steps: [],
    metrics: {},
    targets:
      await inspectWorkspaceTargets(
        workspacePath
      ),
    consoleErrors: [],
    pageErrors: [],
    resourceIssues: []
  };

let appProcess =
  null;

let browser =
  null;

let context =
  null;

let page =
  null;

let fatalError =
  null;

try {

  const port =
    await getFreePort();

  await runStep(
    report,
    'launch native desktop app with WebView2 remote debugging',
    async () => {

      appProcess =
        launchDesktopApp({
          exePath,
          port
        });

      const endpoint =
        await waitForCdpEndpoint({
          port,
          timeoutMs:
            Math.min(
              timeoutMs,
              30000
            )
        });

      browser =
        await chromium.connectOverCDP(
          endpoint
        );

      context =
        browser.contexts()[0];

      if (!context) {

        throw new Error(
          'Connected to WebView2 CDP, but no browser context was available.'
        );
      }

      page =
        await getFirstPage(
          context
        );

      wirePageDiagnostics(
        page,
        report
      );

      await page.waitForLoadState(
        'domcontentloaded',
        {
          timeout:
            30000
        }
      );

      report.metrics.cdpEndpoint =
        endpoint;
    }
  );

  await runStep(
    report,
    'restore workspace through desktop adapter',
    async () => {

      const previousWorkspace =
        await getLocalStorageWithRetry(
          page,
          'myOwnWorld.desktop.workspaceRoot'
        ).catch(() => '');

      await setLocalStorageWithRetry(
        page,
        'myOwnWorld.desktop.workspaceRoot',
        workspacePath
      );

      const alreadyLoaded =
        previousWorkspace === workspacePath &&
        await page.evaluate(
          () => document.querySelectorAll('#tree .tree-item[data-page-id]').length > 0
        ).catch(() => false);

      if (!alreadyLoaded) {

        await page.reload({
          waitUntil:
            'domcontentloaded',
          timeout:
            timeoutMs
        });
      }

      await page.waitForFunction(
        () => document.querySelectorAll('#tree .tree-item[data-page-id]').length > 0,
        null,
        {
          timeout:
            timeoutMs
        }
      );

      report.metrics.workspace =
        await collectAppWorkspaceMetrics(
          page
        );
    }
  );

  await runStep(
    report,
    'open settings workspace diagnostics panel',
    async () => {

      await page.locator('#appSettingsBtn').click({
        timeout:
          15000
      });

      await page.locator('.app-workspace-diagnostics-panel').waitFor({
        state:
          'visible',
        timeout:
          30000
      });

      await page.locator('.app-workspace-diagnostics-primary').click({
        timeout:
          15000
      });

      await page.waitForFunction(
        () => {

          const result =
            document.querySelector('.app-workspace-diagnostics-result');

          return Boolean(
            result?.querySelector('.app-workspace-diagnostics-summary-grid') ||
            /failed|error|не удалось/i.test(result?.textContent || '')
          );
        },
        null,
        {
          timeout:
            timeoutMs
        }
      );

      report.metrics.diagnostics =
        await collectDiagnosticsMetrics(
          page
        );
    }
  );

  await runStep(
    report,
    'scroll and search the large tree',
    async () => {

      const target =
        report.targets.heavyMaps[0] ||
        report.targets.pages[0];

      await page.evaluate(
        () => {

          const tree =
            document.querySelector('#tree');

          if (tree) {

            tree.scrollTop =
              tree.scrollHeight;
          }
        }
      );

      await page.waitForTimeout(
        150
      );

      await page.locator('#searchInput').fill(
        target?.title || target?.id || ''
      );

      await page.waitForFunction(
        () => document.querySelectorAll('#tree .tree-item[data-page-id]').length > 0,
        null,
        {
          timeout:
            30000
        }
      );

      report.metrics.treeAfterSearch =
        await collectTreeMetrics(
          page
        );
    }
  );

  await runStep(
    report,
    'open heavy campaign map',
    async () => {

      const mapTarget =
        report.targets.heavyMaps[0];

      if (!mapTarget) {

        throw new Error(
          'No campaign map target was found in the workspace.'
        );
      }

      const clicked =
        await page.evaluate(
          pageId => {

            const item =
              document.querySelector(
                `.tree-item[data-page-id="${CSS.escape(pageId)}"]`
              );

            item?.click();

            return Boolean(item);
          },
          mapTarget.id
        );

      if (!clicked) {

        throw new Error(
          `Could not find tree item for heavy map ${mapTarget.id}.`
        );
      }

      await page.locator('.campaign-map-document').waitFor({
        state:
          'visible',
        timeout:
          timeoutMs
      });

      report.metrics.map =
        await collectMapMetrics(
          page
        );
    }
  );

  await runStep(
    report,
    'open presentation window from the heavy map',
    async () => {

      const presentationPromise =
        context.waitForEvent(
          'page',
          {
            timeout:
              30000
          }
        ).catch(() => null);

      await page.locator('.campaign-open-presentation-btn').click({
        timeout:
          15000
      });

      const presentationPage =
        await presentationPromise;

      if (!presentationPage) {

        throw new Error(
          'Presentation WebView did not appear in the CDP context.'
        );
      }

      wirePageDiagnostics(
        presentationPage,
        report
      );

      await presentationPage.locator('#presentationMap[data-presentation-status="ready"]').waitFor({
        state:
          'visible',
        timeout:
          30000
      });

      report.metrics.presentation =
        await collectPresentationMetrics(
          presentationPage
        );

      await presentationPage.close()
        .catch(() => {});
    }
  );

} catch (error) {

  fatalError =
    error;

  report.fatalError =
    error?.message || String(error);

} finally {

  await browser?.close()
    .catch(() => {});

  await stopDesktopApp(
    appProcess
  );
}

await fs.mkdir(
  path.dirname(
    output
  ),
  {
    recursive:
      true
  }
);

await fs.writeFile(
  output,
  createMarkdownReport(
    report
  ),
  'utf8'
);

console.log(
  `Desktop native click-through report written: ${output}`
);

if (
  fatalError ||
  report.steps.some(step => !step.ok) ||
  report.resourceIssues.length > 0
) {

  process.exitCode =
    1;
}


async function runStep(
  report,
  name,
  callback
) {

  const startedAt =
    Date.now();

  try {

    await callback();

    report.steps.push({
      name,
      ok:
        true,
      durationMs:
        Date.now() - startedAt
    });

  } catch (error) {

    report.steps.push({
      name,
      ok:
        false,
      durationMs:
        Date.now() - startedAt,
      error:
        error?.message || String(error)
    });

    throw error;
  }
}


function launchDesktopApp({
  exePath,
  port
}) {

  const existingArgs =
    process.env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS || '';

  const debugArgs =
    `${existingArgs} --remote-debugging-port=${port}`.trim();

  return spawn(
    exePath,
    [],
    {
      cwd:
        path.dirname(
          exePath
        ),
      env:
        {
          ...process.env,
          WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:
            debugArgs
        },
      stdio:
        'ignore',
      windowsHide:
        false
    }
  );
}


async function waitForCdpEndpoint({
  port,
  timeoutMs
}) {

  const startedAt =
    Date.now();

  const endpoint =
    `http://127.0.0.1:${port}`;

  while (Date.now() - startedAt < timeoutMs) {

    try {

      const response =
        await fetch(
          `${endpoint}/json/version`
        );

      if (response.ok) {

        return endpoint;
      }

    } catch {

      // WebView2 is still starting.
    }

    await sleep(
      250
    );
  }

  throw new Error(
    `Timed out waiting for WebView2 CDP endpoint on port ${port}.`
  );
}


async function getFirstPage(
  context
) {

  const existing =
    context?.pages?.()[0];

  if (existing) {

    return existing;
  }

  return context.waitForEvent(
    'page',
    {
      timeout:
        30000
    }
  );
}


function wirePageDiagnostics(
  page,
  report
) {

  page.on(
    'console',
    message => {

      if (['error', 'warning'].includes(message.type())) {

        report.consoleErrors.push({
          type:
            message.type(),
          text:
            message.text()
        });
      }
    }
  );

  page.on(
    'pageerror',
    error => {

      report.pageErrors.push(
        error?.message || String(error)
      );
    }
  );

  page.on(
    'response',
    response => {

      if (response.status() < 400) return;
      if (isIgnoredResourceIssueUrl(response.url())) return;

      report.resourceIssues.push({
        status:
          response.status(),
        url:
          response.url()
      });
    }
  );

  page.on(
    'requestfailed',
    request => {

      if (isIgnoredResourceIssueUrl(request.url())) return;

      report.resourceIssues.push({
        status:
          'failed',
        url:
          request.url(),
        error:
          request.failure()?.errorText || ''
      });
    }
  );
}


async function collectAppWorkspaceMetrics(
  page
) {

  return page.evaluate(
    () => ({
      title:
        document.title,
      treeItems:
        document.querySelectorAll('#tree .tree-item[data-page-id]').length,
      virtualized:
        document.querySelector('#tree')?.classList.contains('is-virtualized') || false,
      statusbar:
        document.querySelector('#statusbar')?.textContent?.trim() || ''
    })
  );
}


async function collectDiagnosticsMetrics(
  page
) {

  return page.evaluate(
    () => {

      const result =
        document.querySelector('.app-workspace-diagnostics-result');

      return {
        cards:
          result?.querySelectorAll('.app-workspace-diagnostics-card').length || 0,
        sections:
          result?.querySelectorAll('.app-workspace-diagnostics-section').length || 0,
        hasWriteProbe:
          /Write probe/i.test(result?.textContent || ''),
        textSample:
          (result?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500)
      };
    }
  );
}


async function collectTreeMetrics(
  page
) {

  return page.evaluate(
    () => {

      const tree =
        document.querySelector('#tree');

      return {
        renderedItems:
          tree?.querySelectorAll('.tree-item[data-page-id]').length || 0,
        scrollTop:
          tree?.scrollTop || 0,
        scrollHeight:
          tree?.scrollHeight || 0,
        clientHeight:
          tree?.clientHeight || 0,
        virtualized:
          tree?.classList.contains('is-virtualized') || false
      };
    }
  );
}


async function collectMapMetrics(
  page
) {

  return page.evaluate(
    () => {

      const map =
        document.querySelector('.campaign-map-document');

      return {
        title:
          map?.querySelector('.campaign-map-title')?.textContent?.trim() || '',
        toolbar:
          Boolean(map?.querySelector('.campaign-map-controls')),
        stage:
          Boolean(map?.querySelector('.campaign-map-stage')),
        tokens:
          map?.querySelectorAll('.campaign-map-token').length || 0,
        shapes:
          map?.querySelectorAll('.campaign-map-shape').length || 0,
        fogCanvas:
          Boolean(map?.querySelector('.campaign-map-fog-canvas')),
        backgroundElement:
          Boolean(map?.querySelector('.campaign-map-background'))
      };
    }
  );
}


async function collectPresentationMetrics(
  page
) {

  return page.evaluate(
    () => {

      const map =
        document.querySelector('#presentationMap');

      return {
        url:
          location.href,
        map:
          Boolean(map),
        status:
          map?.dataset.presentationStatus || '',
        tokens:
          map?.querySelectorAll('.campaign-map-token').length || 0,
        shapes:
          map?.querySelectorAll('.campaign-map-shape').length || 0,
        fogCanvas:
          Boolean(map?.querySelector('.campaign-map-fog-canvas'))
      };
    }
  );
}


async function inspectWorkspaceTargets(
  workspacePath
) {

  const pagesDir =
    path.join(
      workspacePath,
      'pages'
    );

  const entries =
    await fs.readdir(
      pagesDir,
      {
        withFileTypes:
          true
      }
    );

  const pages =
    [];

  for (const entry of entries) {

    if (
      !entry.isFile() ||
      !entry.name.toLowerCase().endsWith('.md')
    ) {

      continue;
    }

    const filePath =
      path.join(
        pagesDir,
        entry.name
      );

    const content =
      await fs.readFile(
        filePath,
        'utf8'
      );

    pages.push(
      inspectPageFile(
        entry.name,
        content
      )
    );
  }

  const heavyMaps =
    pages
      .filter(page =>
        page.template === 'campaignMap' ||
        page.type === 'campaignMap'
      )
      .sort((a, b) =>
        b.score - a.score
      )
      .slice(
        0,
        5
      );

  return {
    pages,
    heavyMaps
  };
}


function inspectPageFile(
  fileName,
  content
) {

  const fields =
    parseFrontMatterFields(
      content
    );

  const body =
    content.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');

  const tokens =
    countMatches(
      body,
      'campaign-map-token'
    );

  const shapes =
    countMatches(
      body,
      'campaign-map-shape'
    );

  const fogZones =
    countMatches(
      body,
      'fogZones'
    ) +
    countMatches(
      body,
      'fogLockedZones'
    );

  const sizeBytes =
    Buffer.byteLength(
      body,
      'utf8'
    );

  return {
    id:
      fields.id || fileName.replace(/\.md$/i, ''),
    title:
      fields.title || fileName.replace(/\.md$/i, ''),
    template:
      fields.template || '',
    type:
      fields.type || '',
    file:
      fileName,
    sizeBytes,
    tokens,
    shapes,
    fogZones,
    score:
      sizeBytes +
      tokens * 3000 +
      shapes * 1000 +
      fogZones * 5000
  };
}


function parseFrontMatterFields(
  content
) {

  const match =
    content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  const fields =
    {};

  if (!match) {

    return fields;
  }

  for (const line of match[1].split(/\r?\n/)) {

    const fieldMatch =
      line.match(/^([^:]+):\s*(.*)$/);

    if (!fieldMatch) continue;

    fields[fieldMatch[1].trim()] =
      fieldMatch[2].trim().replace(/^["']|["']$/g, '');
  }

  return fields;
}


function countMatches(
  value,
  pattern
) {

  return String(value || '').split(pattern).length - 1;
}


function createMarkdownReport(
  report
) {

  const ok =
    report.steps.every(step => step.ok) &&
    report.resourceIssues.length === 0;

  return [
    '---',
    'summary: "Current native desktop click-through report."',
    'read_when:',
    '  - "Before desktop release handoff"',
    '  - "When validating the native Tauri window"',
    'owner_zone: "delivery"',
    '---',
    '',
    '# Desktop Native Click-Through Current',
    '',
    `Run date: ${report.runStartedAt.toISOString()}`,
    '',
    'Plan ref: `0.0.1.2.2`',
    '',
    `Workspace: \`${report.workspacePath}\``,
    '',
    `Executable: \`${report.exePath}\``,
    '',
    `Status: ${ok ? 'passed' : 'failed'}`,
    '',
    `Fatal error: ${report.fatalError ? report.fatalError : 'none'}`,
    '',
    '## Steps',
    '',
    ...report.steps.map(step =>
      `- ${step.name}: ${step.ok ? 'passed' : 'failed'} (${step.durationMs} ms)${step.error ? ` - ${step.error}` : ''}`
    ),
    '',
    '## Targets',
    '',
    ...formatTargetList(
      report.targets.heavyMaps
    ),
    '',
    '## Metrics',
    '',
    codeBlock(
      JSON.stringify(
        report.metrics,
        null,
        2
      )
    ),
    '',
    '## Console And Page Errors',
    '',
    ...formatErrors(
      report
    ),
    '',
    '## Resource Issues',
    '',
    ...formatResourceIssues(
      report
    ),
    '',
    '## Notes',
    '',
    '- The runner uses WebView2 remote debugging to click the real Tauri WebView.',
    '- It does not create, move or delete workspace pages.',
    '- It sets only `myOwnWorld.desktop.workspaceRoot` in the app WebView localStorage so the desktop adapter can restore the selected workspace.',
    ''
  ].join('\n');
}


function formatTargetList(
  targets
) {

  if (!targets.length) {

    return [
      '- No campaign map target was found.'
    ];
  }

  return targets.map(target =>
    `- ${target.title} - ${formatBytes(target.sizeBytes)}, tokens: ${target.tokens}, shapes: ${target.shapes}, fog markers: ${target.fogZones}, file: \`${target.file}\``
  );
}


function formatErrors(
  report
) {

  const entries =
    [
      ...report.consoleErrors.map(error =>
        `${error.type}: ${error.text}`
      ),
      ...report.pageErrors.map(error =>
        `pageerror: ${error}`
      )
    ];

  if (!entries.length) {

    return [
      '- No console/page errors captured.'
    ];
  }

  return entries.slice(
    0,
    20
  ).map(entry =>
    `- ${entry}`
  );
}


function formatResourceIssues(
  report
) {

  if (!report.resourceIssues.length) {

    return [
      '- No failed resource responses captured.'
    ];
  }

  return report.resourceIssues.slice(
    0,
    30
  ).map(issue =>
    `- ${issue.status}: ${issue.url}${issue.error ? ` - ${issue.error}` : ''}`
  );
}


function codeBlock(
  content
) {

  return [
    '```json',
    content,
    '```'
  ].join('\n');
}


function formatBytes(
  value
) {

  const bytes =
    Number(value || 0);

  if (bytes >= 1024 * 1024) {

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {

    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}


async function stopDesktopApp(
  appProcess
) {

  if (!appProcess?.pid) {

    return;
  }

  if (process.platform === 'win32') {

    spawnSync(
      'taskkill',
      [
        '/PID',
        String(appProcess.pid),
        '/T',
        '/F'
      ],
      {
        stdio:
          'ignore'
      }
    );

    return;
  }

  appProcess.kill(
    'SIGTERM'
  );
}


async function getFreePort() {

  return new Promise((resolve, reject) => {

    const server =
      net.createServer();

    server.once(
      'error',
      reject
    );

    server.listen(
      0,
      '127.0.0.1',
      () => {

        const address =
          server.address();

        server.close(
          () => resolve(
            address.port
          )
        );
      }
    );
  });
}


async function exists(
  target
) {

  try {

    await fs.access(
      target
    );

    return true;

  } catch {

    return false;
  }
}


function sleep(
  ms
) {

  return new Promise(resolve =>
    setTimeout(
      resolve,
      ms
    )
  );
}


async function setLocalStorageWithRetry(
  page,
  key,
  value
) {

  const startedAt =
    Date.now();

  let lastError =
    null;

  while (Date.now() - startedAt < 10000) {

    try {

      await page.waitForLoadState(
        'domcontentloaded',
        {
          timeout:
            3000
        }
      ).catch(() => {});

      await page.evaluate(
        ({ key, value }) => {

          localStorage.setItem(
            key,
            value
          );
        },
        {
          key,
          value
        }
      );

      return;

    } catch (error) {

      lastError =
        error;

      if (
        !/Execution context was destroyed|navigation|Target closed/i.test(
          error?.message || String(error)
        )
      ) {

        throw error;
      }

      await sleep(
        250
      );
    }
  }

  throw lastError ||
    new Error(
      'Timed out writing localStorage in the desktop WebView.'
    );
}


async function getLocalStorageWithRetry(
  page,
  key
) {

  const startedAt =
    Date.now();

  let lastError =
    null;

  while (Date.now() - startedAt < 10000) {

    try {

      await page.waitForLoadState(
        'domcontentloaded',
        {
          timeout:
            3000
        }
      ).catch(() => {});

      return page.evaluate(
        key => localStorage.getItem(
          key
        ) || '',
        key
      );

    } catch (error) {

      lastError =
        error;

      if (
        !/Execution context was destroyed|navigation|Target closed/i.test(
          error?.message || String(error)
        )
      ) {

        throw error;
      }

      await sleep(
        250
      );
    }
  }

  throw lastError ||
    new Error(
      'Timed out reading localStorage in the desktop WebView.'
    );
}


function isIgnoredResourceIssueUrl(
  url
) {

  return /^https?:\/\/ipc\.localhost\//i.test(
    String(url || '')
  ) ||
  /^ipc:/i.test(
    String(url || '')
  );
}


function parseArgs(
  rawArgs
) {

  const parsed =
    {
      _: []
    };

  for (
    let index = 0;
    index < rawArgs.length;
    index += 1
  ) {

    const arg =
      rawArgs[index];

    if (arg.startsWith('--')) {

      const key =
        arg.slice(2);

      const next =
        rawArgs[index + 1];

      if (
        next &&
        !next.startsWith('--')
      ) {

        parsed[key] =
          next;

        index += 1;

      } else {

        parsed[key] =
          true;
      }

      continue;
    }

    parsed._.push(
      arg
    );
  }

  return parsed;
}
