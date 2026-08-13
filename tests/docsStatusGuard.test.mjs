import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  collectDocsStatusDrift
} from '../tools/docs_status_guard.mjs';


test(
  'docs status guard reports deterministic stale active-plan pointers',
  async () => {

    const root =
      await createDocsStatusFixture({
        planPhase:
          '0.0.1.10.0',
        planClosed:
          ['RCB-001', 'RCB-002'],
        dashboardPhase:
          '0.0.1.9.0',
        dashboardClosed:
          ['RCB-001'],
        bugInventoryPhase:
          '0.0.1.9.0',
        releasePhase:
          '0.0.1.9.0'
      });

    const drift =
      await collectDocsStatusDrift({
        root
      });

    assert.equal(
      drift.length,
      5
    );

    assert.deepEqual(
      drift.map(item =>
        item.file
      ),
      [
        'docs/00-product/PRODUCT_DASHBOARD.md',
        'docs/00-product/PRODUCT_DASHBOARD.md',
        'docs/00-product/PRODUCT_DASHBOARD.md',
        'docs/01-delivery/BUG_INVENTORY.md',
        'release/latest/release-notes.md'
      ]
    );
  }
);


test(
  'current repository active docs status is synchronized',
  async () => {

    assert.deepEqual(
      await collectDocsStatusDrift(),
      []
    );
  }
);


async function createDocsStatusFixture({
  planPhase,
  planClosed,
  dashboardPhase,
  dashboardClosed,
  bugInventoryPhase,
  releasePhase
}) {

  const root =
    await mkdtemp(
      path.join(
        os.tmpdir(),
        'mow-docs-status-'
      )
    );

  await mkdir(
    path.join(
      root,
      'docs',
      '01-delivery'
    ),
    {
      recursive: true
    }
  );

  await mkdir(
    path.join(
      root,
      'docs',
      '00-product'
    ),
    {
      recursive: true
    }
  );

  await mkdir(
    path.join(
      root,
      'release',
      'latest'
    ),
    {
      recursive: true
    }
  );

  await writeFile(
    path.join(
      root,
      'docs',
      '01-delivery',
      'PROJECT_PLAN.md'
    ),
    [
      '# Project Plan',
      '',
      `Current phase: \`${planPhase}\` Repository Cleanup & Consolidation.`,
      '',
      `Important stop note: cleanup is approved only one RCB leaf at a time. ${formatRcbList(planClosed)} are closed.`
    ].join('\n'),
    'utf8'
  );

  await writeFile(
    path.join(
      root,
      'docs',
      '00-product',
      'PRODUCT_DASHBOARD.md'
    ),
    [
      '# Product Dashboard',
      '',
      'Immediate direction:',
      '',
      `2. Continue \`${dashboardPhase}\` cleanup only one RCB leaf at a time.`,
      `3. Closed cleanup leaves so far: ${formatRcbList(dashboardClosed)}.`,
      '',
      'Next owner action:',
      '',
      `- Choose the next \`${dashboardPhase}\` RCB leaf. Do not start it automatically.`
    ].join('\n'),
    'utf8'
  );

  await writeFile(
    path.join(
      root,
      'docs',
      '01-delivery',
      'BUG_INVENTORY.md'
    ),
    [
      '# Bug Inventory',
      '',
      `Proceed with the active plan in [PROJECT_PLAN.md](./PROJECT_PLAN.md). Current next step: \`${bugInventoryPhase}\` Repository Audit.`
    ].join('\n'),
    'utf8'
  );

  await writeFile(
    path.join(
      root,
      'release',
      'latest',
      'release-notes.md'
    ),
    [
      '# Release Notes',
      '',
      `- The active project phase is \`${releasePhase}\` in \`docs/01-delivery/PROJECT_PLAN.md\`.`
    ].join('\n'),
    'utf8'
  );

  return root;
}


function formatRcbList(
  values
) {

  return values
    .map(value =>
      `\`${value}\``
    )
    .join(', ');
}
