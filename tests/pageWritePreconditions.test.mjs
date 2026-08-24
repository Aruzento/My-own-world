import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPageById
} from '../js/repository/pageRepository.js';

import {
  arePageStateIdentitiesEqual,
  createPageStateIdentityFromContent,
  normalizePageStateIdentity
} from '../js/core/pageRecord.js';

import {
  persistPageContentCommand,
  snapshotPageForCommand
} from '../js/storage/pageCommandService.js';

import {
  evaluatePageWritePrecondition,
  readCurrentDurablePageStateIdentity
} from '../js/storage/pageWritePreconditions.js';

import {
  createEditConflictFixture,
  updateFixtureContent
} from './fixtures/editConflictFixtures.mjs';


test(
  'page write precondition reads current durable page identity, not stale runtime content',
  async () => {

    const {
      adapter,
      page
    } =
      await createEditConflictFixture({
        id:
          'precondition-durable-read',
        body:
          '<h1>Precondition</h1><p>A</p>'
      });

    const runtimeBase =
      createPageStateIdentityFromContent(
        page.content
      );

    const durableChanged =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Precondition</h1><p>B</p>'
        }
      );

    await adapter.writeText(
      page.path,
      durableChanged
    );

    const currentBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            adapter
        }
      );

    assert.equal(
      arePageStateIdentitiesEqual(
        runtimeBase,
        currentBase
      ),
      false
    );

    assert.equal(
      arePageStateIdentitiesEqual(
        currentBase,
        createPageStateIdentityFromContent(
          durableChanged
        )
      ),
      true
    );
  }
);


test(
  'page write precondition reports matched expected base without changing save behavior',
  async () => {

    const {
      adapter,
      page
    } =
      await createEditConflictFixture({
        id:
          'precondition-matched',
        body:
          '<h1>Precondition Matched</h1><p>A</p>'
      });

    const expectedBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            adapter
        }
      );

    const nextContent =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Precondition Matched</h1><p>B</p>'
        }
      );

    const result =
      await persistPageContentCommand({
        page,
        content:
          nextContent,
        previousPage:
          snapshotPageForCommand(
            page
          ),
        reason:
          'precondition-matched',
        expectedBase
      });

    assert.equal(
      result.precondition.status,
      'matched'
    );

    assert.equal(
      result.precondition.ok,
      true
    );

    assert.equal(
      result.writeStatus,
      'saved'
    );

    assert.equal(
      await adapter.readText(
        page.path
      ),
      nextContent
    );

    assert.equal(
      getPageById(
        page.id
      ),
      page
    );
  }
);


test(
  'page write precondition conflict blocks stale durable writes before storage mutation',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'precondition-mismatch',
        body:
          '<h1>Precondition Mismatch</h1><p>A</p>'
      });

    const expectedBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            adapter
        }
      );

    const sessionBase =
      {
        previousPage:
          snapshotPageForCommand(
            page
          ),
        content:
          originalContent
      };

    const newerDurable =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Precondition Mismatch</h1><p>B</p>'
        }
      );

    await persistPageContentCommand({
      page,
      content:
        newerDurable,
      previousPage:
        snapshotPageForCommand(
          page
        ),
      reason:
        'precondition-conflict-current-write',
      expectedBase
    });

    let staleWriteCount =
      0;

    const originalWriteText =
      adapter.writeText.bind(
        adapter
      );

    adapter.writeText =
      async (path, content) => {

        staleWriteCount += 1;

        return originalWriteText(
          path,
          content
        );
      };

    const staleSessionContent =
      updateFixtureContent(
        sessionBase.content,
        {
          body:
            '<h1>Precondition Mismatch</h1><p>C</p>'
        }
      );

    const result =
      await persistPageContentCommand({
        page,
        content:
          staleSessionContent,
        previousPage:
          sessionBase.previousPage,
        reason:
          'precondition-conflict-stale-write',
        expectedBase
      });

    assert.equal(
      result.precondition.status,
      'mismatch'
    );

    assert.equal(
      result.precondition.ok,
      false
    );

    assert.equal(
      result.writeStatus,
      'conflict'
    );

    assert.equal(
      result.conflict,
      true
    );

    assert.equal(
      result.blocked,
      true
    );

    assert.equal(
      result.written,
      false
    );

    assert.equal(
      staleWriteCount,
      0
    );

    assert.equal(
      await adapter.readText(
        page.path
      ),
      newerDurable
    );

    assert.equal(
      page.content,
      newerDurable
    );
  }
);


test(
  'page write precondition can be evaluated directly for future conflict blocking',
  async () => {

    const {
      adapter,
      page
    } =
      await createEditConflictFixture({
        id:
          'precondition-direct',
        body:
          '<h1>Precondition Direct</h1><p>A</p>'
      });

    const expectedBase =
      await readCurrentDurablePageStateIdentity(
        page,
        {
          storageAdapter:
            adapter
        }
      );

    const check =
      await evaluatePageWritePrecondition({
        page,
        expectedBase,
        storageAdapter:
          adapter
      });

    assert.deepEqual(
      check.expectedBase,
      normalizePageStateIdentity(
        expectedBase
      )
    );

    assert.equal(
      check.status,
      'matched'
    );
  }
);
