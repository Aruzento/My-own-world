import test from 'node:test';
import assert from 'node:assert/strict';

import {
  searchPageResults
} from '../js/repository/pageRepository.js';

import {
  persistPageContentCommand,
  snapshotPageForCommand
} from '../js/storage/pageCommandService.js';

import {
  readCurrentDurablePageStateIdentity
} from '../js/storage/pageWritePreconditions.js';

import {
  createEditConflictFixture,
  updateFixtureContent
} from './fixtures/editConflictFixtures.mjs';


test(
  'stale editor write is blocked and current durable page survives',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'block-stale-page-write',
        body:
          '<h1>Block Stale</h1><p>base A</p>'
      });

    const sessionBase =
      {
        previousPage:
          snapshotPageForCommand(
            page
          ),
        content:
          originalContent,
        expectedBase:
          await readCurrentDurablePageStateIdentity(
            page,
            {
              storageAdapter:
                adapter
            }
          )
      };

    const currentContent =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Block Stale</h1><p>current-b-token</p>'
        }
      );

    const currentResult =
      await persistPageContentCommand({
        page,
        content:
          currentContent,
        previousPage:
          snapshotPageForCommand(
            page
          ),
        reason:
          'current-valid-write',
        expectedBase:
          sessionBase.expectedBase
      });

    assert.equal(
      currentResult.writeStatus,
      'saved'
    );

    let staleStorageWrites =
      0;

    const originalWriteText =
      adapter.writeText.bind(
        adapter
      );

    adapter.writeText =
      async (path, content) => {

        staleStorageWrites += 1;

        return originalWriteText(
          path,
          content
        );
      };

    const staleContent =
      updateFixtureContent(
        sessionBase.content,
        {
          body:
            '<h1>Block Stale</h1><p>stale-c-token</p>'
        }
      );

    const staleResult =
      await persistPageContentCommand({
        page,
        content:
          staleContent,
        previousPage:
          sessionBase.previousPage,
        reason:
          'stale-editor-write',
        expectedBase:
          sessionBase.expectedBase
      });

    assert.equal(
      staleResult.writeStatus,
      'conflict'
    );

    assert.equal(
      staleResult.conflict,
      true
    );

    assert.equal(
      staleResult.blocked,
      true
    );

    assert.equal(
      staleResult.written,
      false
    );

    assert.equal(
      staleStorageWrites,
      0
    );

    assert.equal(
      await adapter.readText(
        page.path
      ),
      currentContent
    );

    assert.equal(
      page.content,
      currentContent
    );

    assert.equal(
      searchPageResults(
        'stale-c-token'
      ).length,
      0
    );

    assert.equal(
      searchPageResults(
        'current-b-token'
      )[0]?.page,
      page
    );

    assert.deepEqual(
      Object.keys(
        staleResult.conflictEvidence || {}
      ).sort(),
      [
        'blockReason',
        'currentBase',
        'expectedBase',
        'kind',
        'operationKind',
        'pageId',
        'preconditionStatus',
        'reason'
      ]
    );
  }
);


test(
  'two sequential normal preconditioned saves both succeed and advance through durable state',
  async () => {

    const {
      adapter,
      page
    } =
      await createEditConflictFixture({
        id:
          'sequential-precondition-save',
        body:
          '<h1>Sequential Save</h1><p>base A</p>'
      });

    const firstBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            adapter
        }
      );

    const firstContent =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Sequential Save</h1><p>saved B</p>'
        }
      );

    const firstResult =
      await persistPageContentCommand({
        page,
        content:
          firstContent,
        previousPage:
          snapshotPageForCommand(
            page
          ),
        reason:
          'sequential-first',
        expectedBase:
          firstBase
      });

    const secondBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            adapter
        }
      );

    const secondContent =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Sequential Save</h1><p>saved C</p>'
        }
      );

    const secondResult =
      await persistPageContentCommand({
        page,
        content:
          secondContent,
        previousPage:
          snapshotPageForCommand(
            page
          ),
        reason:
          'sequential-second',
        expectedBase:
          secondBase
      });

    assert.equal(
      firstResult.writeStatus,
      'saved'
    );

    assert.equal(
      secondResult.writeStatus,
      'saved'
    );

    assert.equal(
      await adapter.readText(
        page.path
      ),
      secondContent
    );

    assert.equal(
      page.content,
      secondContent
    );
  }
);


test(
  'missing current page blocks stale write without recreating the file',
  async () => {

    const {
      adapter,
      page
    } =
      await createEditConflictFixture({
        id:
          'missing-current-page-write',
        body:
          '<h1>Missing Current</h1><p>base A</p>'
      });

    const expectedBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            adapter
        }
      );

    await adapter.removeFile(
      page.path
    );

    let writeCount =
      0;

    const originalWriteText =
      adapter.writeText.bind(
        adapter
      );

    adapter.writeText =
      async (path, content) => {

        writeCount += 1;

        return originalWriteText(
          path,
          content
        );
      };

    const result =
      await persistPageContentCommand({
        page,
        content:
          updateFixtureContent(
            page.content,
            {
              body:
                '<h1>Missing Current</h1><p>stale recreate</p>'
            }
          ),
        previousPage:
          snapshotPageForCommand(
            page
          ),
        reason:
          'missing-current-stale-write',
        expectedBase
      });

    assert.equal(
      result.writeStatus,
      'precondition-blocked'
    );

    assert.equal(
      result.blockReason,
      'current-page-missing'
    );

    assert.equal(
      result.blocked,
      true
    );

    assert.equal(
      result.conflict,
      false
    );

    assert.equal(
      writeCount,
      0
    );

    await assert.rejects(
      () => adapter.readText(
        page.path
      ),
      /missing/
    );
  }
);


test(
  'queued stale-base write blocks without superseding the already accepted valid write',
  async () => {

    const {
      adapter,
      page
    } =
      await createEditConflictFixture({
        id:
          'queued-precondition-write',
        body:
          '<h1>Queued Save</h1><p>base A</p>'
      });

    const expectedBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            adapter
        }
      );

    const validContent =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Queued Save</h1><p>valid B</p>'
        }
      );

    const staleContent =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Queued Save</h1><p>stale C</p>'
        }
      );

    const originalWriteText =
      adapter.writeText.bind(
        adapter
      );

    const originalReadText =
      adapter.readText.bind(
        adapter
      );

    let releaseValidWrite;

    const validWriteRelease =
      new Promise(resolve => {

        releaseValidWrite =
          resolve;
      });

    let validWriteStarted;

    const validWriteStart =
      new Promise(resolve => {

        validWriteStarted =
          resolve;
      });

    let validWriteFinished;

    const validWriteFinish =
      new Promise(resolve => {

        validWriteFinished =
          resolve;
      });

    let readCount =
      0;

    adapter.writeText =
      async (path, content) => {

        if (
          String(content).includes(
            'valid B'
          )
        ) {

          validWriteStarted();

          await validWriteRelease;

          await originalWriteText(
            path,
            content
          );

          validWriteFinished();

          return;
        }

        await originalWriteText(
          path,
          content
        );
      };

    adapter.readText =
      async path => {

        readCount += 1;

        if (readCount === 2) {

          releaseValidWrite();

          await validWriteFinish;
        }

        return originalReadText(
          path
        );
      };

    const validSave =
      persistPageContentCommand({
        page,
        content:
          validContent,
        previousPage:
          snapshotPageForCommand(
            page
          ),
        reason:
          'queued-valid-write',
        expectedBase
      });

    await validWriteStart;

    const staleSave =
      persistPageContentCommand({
        page,
        content:
          staleContent,
        previousPage:
          snapshotPageForCommand(
            page
          ),
        reason:
          'queued-stale-write',
        expectedBase
      });

    const [
      validResult,
      staleResult
    ] =
      await Promise.all([
        validSave,
        staleSave
      ]);

    assert.equal(
      validResult.writeStatus,
      'saved'
    );

    assert.equal(
      staleResult.writeStatus,
      'conflict'
    );

    assert.equal(
      staleResult.conflict,
      true
    );

    assert.equal(
      await adapter.readText(
        page.path
      ),
      validContent
    );

    assert.equal(
      page.content,
      validContent
    );
  }
);
