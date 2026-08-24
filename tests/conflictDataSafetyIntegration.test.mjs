import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRuntimePageFromContent,
  updatePageRecordContent
} from '../js/core/pageRecord.js';

import {
  getPageById
} from '../js/repository/pageRepository.js';

import {
  setPages
} from '../js/stateActions.js';

import {
  restoreWorkspaceBackupSelection
} from '../js/storage/backupService.js';

import {
  clearPageCommandEvents,
  clearPageUndoEntries,
  persistPageContentCommand,
  snapshotPageForCommand
} from '../js/storage/pageCommandService.js';

import {
  readCurrentDurablePageStateIdentity
} from '../js/storage/pageWritePreconditions.js';

import {
  applyRepairPreviewPlan,
  buildRepairPreviewModel,
  createRepairPreviewPlan,
  REPAIR_PREVIEW_CONFLICTS
} from '../js/storage/repairPreview.js';

import {
  setStorageAdapter
} from '../js/storage/storageAdapter.js';

import {
  clearWriteRevisions
} from '../js/storage/writeQueue.js';

import {
  persistKnowledgeGraphRelationshipsCommand
} from '../js/wiki/knowledgeGraphCommandBridge.js';

import {
  createDataSafetyPage,
  createMemoryWorkspaceAdapter,
  seedBackupSnapshot,
  seedWorkspace
} from './fixtures/dataSafetyFixtures.mjs';


test(
  'partial restore updates durable state and later stale editor save is blocked without extra backup',
  async () => {

    resetCommandState();

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const editorPage =
      createDataSafetyPage({
        id:
          'hero',
        title:
          'Hero',
        body:
          '<h1>Hero</h1><p>Editor base A.</p>'
      });

    const restoredPage =
      createDataSafetyPage({
        id:
          'hero',
        title:
          'Hero',
        body:
          '<h1>Hero</h1><p>Restored durable B.</p>'
      });

    await seedBackupSnapshot(
      adapter,
      {
        id:
          'integration-partial-restore-source',
        pages:
          [
            restoredPage
          ]
      }
    );

    await seedWorkspace(
      adapter,
      {
        pages:
          [
            editorPage
          ]
      }
    );

    setPages([
      editorPage
    ]);

    const editorSession =
      await captureEditorSessionBase(
        editorPage,
        adapter
      );

    await restoreWorkspaceBackupSelection(
      'integration-partial-restore-source',
      {
        pageNames:
          [
            'hero.md'
          ]
      },
      adapter,
      {
        preRestoreBackupId:
          'integration-pre-restore'
      }
    );

    const reloadedPage =
      await reloadPageFromDisk(
        adapter,
        editorPage
      );

    setPages([
      reloadedPage
    ]);

    const backupsAfterRestore =
      countBackupManifests(
        adapter
      );

    const staleEditorContent =
      updatePageRecordContent(
        editorSession.content,
        {
          body:
            '<h1>Hero</h1><p>Stale editor C.</p>'
        }
      );

    const result =
      await persistPageContentCommand({
        page:
          editorPage,
        content:
          staleEditorContent,
        previousPage:
          editorSession.previousPage,
        reason:
          'integration-stale-editor-after-restore',
        expectedBase:
          editorSession.expectedBase
      });

    assert.equal(
      result.writeStatus,
      'conflict'
    );

    assert.equal(
      result.written,
      false
    );

    assert.equal(
      await adapter.readText(
        'pages/hero.md'
      ),
      restoredPage.content
    );

    assert.equal(
      getPageById(
        'hero'
      )?.content,
      restoredPage.content
    );

    assert.equal(
      countBackupManifests(
        adapter
      ),
      backupsAfterRestore
    );

    setPages([]);
  }
);


test(
  'persistent repair updates durable state and later stale editor save is blocked without extra backup',
  async () => {

    resetCommandState();

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const sourcePage =
      createDataSafetyPage({
        id:
          'source',
        title:
          'Source',
        body:
          '<h1>Source</h1><p>[[Missing Page|lost gate]]</p>'
      });

    const targetPage =
      createDataSafetyPage({
        id:
          'target',
        title:
          'Target'
      });

    const editorPage =
      createRuntimePageFromContent({
        content:
          sourcePage.content,
        name:
          sourcePage.name,
        path:
          sourcePage.path
      });

    await seedWorkspace(
      adapter,
      {
        pages:
          [
            sourcePage,
            targetPage
          ]
      }
    );

    setPages([
      sourcePage,
      targetPage
    ]);

    const editorSession =
      await captureEditorSessionBase(
        editorPage,
        adapter
      );

    const plan =
      createFirstRepairPlan({
        pages:
          [
            sourcePage,
            targetPage
          ],
        targetPageId:
          'target'
      });

    assert.ok(
      plan.staleEvidence.sourcePageStateIdentity?.stateHash
    );

    const applyResult =
      await applyRepairPreviewPlan({
        plan,
        pages:
          [
            sourcePage,
            targetPage
          ]
      });

    assert.equal(
      applyResult.status,
      'applied'
    );

    const repairedContent =
      await adapter.readText(
        sourcePage.path
      );

    const backupsAfterRepair =
      countBackupManifests(
        adapter
      );

    const staleEditorContent =
      updatePageRecordContent(
        editorSession.content,
        {
          body:
            '<h1>Source</h1><p>Stale editor C still points to [[Missing Page|lost gate]].</p>'
        }
      );

    const result =
      await persistPageContentCommand({
        page:
          editorPage,
        content:
          staleEditorContent,
        previousPage:
          editorSession.previousPage,
        reason:
          'integration-stale-editor-after-repair',
        expectedBase:
          editorSession.expectedBase
      });

    assert.equal(
      result.writeStatus,
      'conflict'
    );

    assert.equal(
      result.written,
      false
    );

    assert.equal(
      await adapter.readText(
        sourcePage.path
      ),
      repairedContent
    );

    assert.match(
      repairedContent,
      /\[\[Target\|lost gate\]\]/
    );

    assert.equal(
      getPageById(
        'source'
      )?.content,
      repairedContent
    );

    assert.equal(
      countBackupManifests(
        adapter
      ),
      backupsAfterRepair
    );

    setPages([]);
  }
);


test(
  'normal editor save makes repair preview stale through the canonical page state identity before backup',
  async () => {

    resetCommandState();

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const sourcePage =
      createDataSafetyPage({
        id:
          'source',
        title:
          'Source',
        body:
          '<h1>Source</h1><p>[[Missing Page]]</p>'
      });

    const targetPage =
      createDataSafetyPage({
        id:
          'target',
        title:
          'Target'
      });

    await seedWorkspace(
      adapter,
      {
        pages:
          [
            sourcePage,
            targetPage
          ]
      }
    );

    setPages([
      sourcePage,
      targetPage
    ]);

    const plan =
      createFirstRepairPlan({
        pages:
          [
            sourcePage,
            targetPage
          ],
        targetPageId:
          'target'
      });

    const editorBase =
      await readCurrentDurablePageStateIdentity(
        sourcePage,
        {
          storageAdapter:
            adapter
        }
      );

    const normalEditorContent =
      updatePageRecordContent(
        sourcePage.content,
        {
          body:
            '<h1>Source</h1><p>Normal editor B. [[Missing Page]]</p>'
        }
      );

    const editResult =
      await persistPageContentCommand({
        page:
          sourcePage,
        content:
          normalEditorContent,
        previousPage:
          snapshotPageForCommand(
            sourcePage
          ),
        reason:
          'integration-editor-before-repair-preview',
        expectedBase:
          editorBase
      });

    assert.equal(
      editResult.writeStatus,
      'saved'
    );

    let backupCalls =
      0;

    await assert.rejects(
      () => applyRepairPreviewPlan({
        plan,
        pages:
          [
            sourcePage,
            targetPage
          ],
        createSafetyBackup: async () => {

          backupCalls += 1;

          return {
            id:
              'unexpected-backup'
          };
        }
      }),
      error =>
        error.code === REPAIR_PREVIEW_CONFLICTS.staleSource &&
        error.details?.mismatches?.includes(
          'pageStateIdentity'
        )
    );

    assert.equal(
      backupCalls,
      0
    );

    assert.equal(
      await adapter.readText(
        sourcePage.path
      ),
      normalEditorContent
    );

    setPages([]);
  }
);


test(
  'relationship repair command shares page precondition identity and blocks stale durable writes',
  async () => {

    resetCommandState();

    const adapter =
      createMemoryWorkspaceAdapter();

    setStorageAdapter(
      adapter
    );

    const sourcePage =
      createDataSafetyPage({
        id:
          'hero',
        title:
          'Hero',
        relationships:
          [
            {
              type:
                'ally',
              targetId:
                'missing-ally',
              label:
                'Lost ally'
            }
          ]
      });

    const targetPage =
      createDataSafetyPage({
        id:
          'ally',
        title:
          'Ally'
      });

    await seedWorkspace(
      adapter,
      {
        pages:
          [
            sourcePage,
            targetPage
          ]
      }
    );

    setPages([
      sourcePage,
      targetPage
    ]);

    const expectedBase =
      await readCurrentDurablePageStateIdentity(
        sourcePage,
        {
          storageAdapter:
            adapter
        }
      );

    const staleCommandPage =
      createRuntimePageFromContent({
        content:
          sourcePage.content,
        name:
          sourcePage.name,
        path:
          sourcePage.path
      });

    const newerContent =
      updatePageRecordContent(
        sourcePage.content,
        {
          body:
            '<h1>Hero</h1><p>Current durable B.</p>'
        }
      );

    await persistPageContentCommand({
      page:
        sourcePage,
      content:
        newerContent,
      previousPage:
        snapshotPageForCommand(
          sourcePage
        ),
      reason:
        'integration-editor-before-relationship-command',
      expectedBase
    });

    let staleStorageWrites =
      0;

    const originalWriteText =
      adapter.writeText.bind(
        adapter
      );

    adapter.writeText =
      async (path, content) => {

        if (
          path === sourcePage.path ||
          path === 'pages/hero.md'
        ) {

          staleStorageWrites += 1;
        }

        return originalWriteText(
          path,
          content
        );
      };

    const result =
      await persistKnowledgeGraphRelationshipsCommand({
        page:
          staleCommandPage,
        relationships:
          [
            {
              type:
                'ally',
              targetId:
                'ally',
              label:
                'Lost ally'
            }
          ],
        reason:
          'integration-stale-relationship-command',
        expectedBase
      });

    assert.equal(
      result.writeStatus,
      'conflict'
    );

    assert.equal(
      result.written,
      false
    );

    assert.equal(
      staleStorageWrites,
      0
    );

    assert.equal(
      await adapter.readText(
        sourcePage.path
      ),
      newerContent
    );

    assert.equal(
      staleCommandPage.content,
      createDataSafetyPage({
        id:
          'hero',
        title:
          'Hero',
        relationships:
          [
            {
              type:
                'ally',
              targetId:
                'missing-ally',
              label:
                'Lost ally'
            }
          ]
      }).content
    );

    setPages([]);
  }
);


function resetCommandState() {

  clearPageCommandEvents();
  clearPageUndoEntries();
  clearWriteRevisions();
}


async function captureEditorSessionBase(
  page,
  adapter
) {

  return {
    previousPage:
      snapshotPageForCommand(
        page
      ),
    content:
      page.content,
    expectedBase:
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            adapter
        }
      )
  };
}


async function reloadPageFromDisk(
  adapter,
  page
) {

  const content =
    await adapter.readText(
      page.path
    );

  return createRuntimePageFromContent({
    content,
    name:
      page.name,
    path:
      page.path
  });
}


function createFirstRepairPlan({
  pages,
  targetPageId
}) {

  const model =
    buildRepairPreviewModel({
      pages
    });

  return createRepairPreviewPlan({
    model,
    diagnosticId:
      model.diagnostics[0].id,
    targetPageId
  });
}


function countBackupManifests(
  adapter
) {

  return [
    ...adapter.snapshotFiles().keys()
  ].filter(path =>
    String(path).startsWith(
      '.my-own-world-backups/'
    ) &&
    String(path).endsWith(
      '/manifest.json'
    )
  ).length;
}
