import test from 'node:test';
import assert from 'node:assert/strict';

import {
  findPageByTitleOrAlias,
  getPagesByTag,
  getPagesByType,
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
  parseFixtureContent,
  updateFixtureContent
} from './fixtures/editConflictFixtures.mjs';


test(
  'structured metadata command preserves newer disjoint durable field changes',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'structured-preserve-disjoint-fields',
        body:
          '<h1>Structured Preserve</h1><p>base body</p>',
        tags:
          [
            'card',
            'city'
          ],
        aliases:
          []
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

    page.tags =
      [
        'card',
        'city',
        'capital'
      ];

    const newerTagsContent =
      updateFixtureContent(
        page.content,
        {
          tags:
            page.tags
        }
      );

    await persistPageContentCommand({
      page,
      content:
        newerTagsContent,
      previousPage:
        snapshotPageForCommand(
          page
        ),
      reason:
        'newer-tags-command',
      expectedBase:
        sessionBase.expectedBase
    });

    page.aliases =
      [
        'Royal Alias'
      ];

    const staleAliasContent =
      updateFixtureContent(
        sessionBase.content,
        {
          aliases:
            page.aliases
        }
      );

    const result =
      await persistPageContentCommand({
        page,
        content:
          staleAliasContent,
        previousPage:
          sessionBase.previousPage,
        reason:
          'stale-alias-command',
        expectedBase:
          sessionBase.expectedBase,
        structuredMutation:
          {
            kind:
              'page-record-fields',
            fields:
              [
                'metadata.aliases'
              ]
          }
      });

    const durableParsed =
      parseFixtureContent(
        await adapter.readText(
          page.path
        )
      );

    assert.equal(
      result.writeStatus,
      'saved'
    );

    assert.equal(
      result.conflict,
      false
    );

    assert.equal(
      result.preservedUnrelatedChanges,
      true
    );

    assert.equal(
      result.precondition.status,
      'mismatch-preserved'
    );

    assert.deepEqual(
      durableParsed.tags,
      [
        'card',
        'city',
        'capital'
      ]
    );

    assert.deepEqual(
      durableParsed.aliases,
      [
        'Royal Alias'
      ]
    );

    assert.deepEqual(
      getPagesByTag(
        'capital'
      ),
      [
        page
      ]
    );

    assert.equal(
      findPageByTitleOrAlias(
        'Royal Alias'
      ),
      page
    );

    assert.equal(
      searchPageResults(
        'base body'
      )[0]?.page,
      page
    );
  }
);


test(
  'structured metadata command conflicts when its owned field changed durably',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'structured-preserve-same-field-conflict',
        body:
          '<h1>Structured Same Field</h1><p>base body</p>',
        aliases:
          [
            'base-alias'
          ]
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

    page.aliases =
      [
        'newer-alias'
      ];

    const newerAliasContent =
      updateFixtureContent(
        page.content,
        {
          aliases:
            page.aliases
        }
      );

    await persistPageContentCommand({
      page,
      content:
        newerAliasContent,
      previousPage:
        snapshotPageForCommand(
          page
        ),
      reason:
        'newer-alias-command',
      expectedBase:
        sessionBase.expectedBase
    });

    page.aliases =
      [
        'stale-alias'
      ];

    const staleAliasContent =
      updateFixtureContent(
        sessionBase.content,
        {
          aliases:
            page.aliases
        }
      );

    const result =
      await persistPageContentCommand({
        page,
        content:
          staleAliasContent,
        previousPage:
          sessionBase.previousPage,
        reason:
          'stale-alias-same-field',
        expectedBase:
          sessionBase.expectedBase,
        structuredMutation:
          {
            kind:
              'page-record-fields',
            fields:
              [
                'aliases'
              ]
          }
      });

    const durableParsed =
      parseFixtureContent(
        await adapter.readText(
          page.path
        )
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
      result.written,
      false
    );

    assert.deepEqual(
      durableParsed.aliases,
      [
        'newer-alias'
      ]
    );

    assert.equal(
      findPageByTitleOrAlias(
        'newer-alias'
      ),
      page
    );

    assert.equal(
      findPageByTitleOrAlias(
        'stale-alias'
      ),
      null
    );
  }
);


test(
  'stale full page content remains conflict-only when structural independence is unknown',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'structured-preserve-full-content-conflict',
        body:
          '<h1>Full Content Conflict</h1><p>base body A</p>',
        tags:
          [
            'card',
            'base'
          ]
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

    page.tags =
      [
        'card',
        'newer'
      ];

    const newerTagsContent =
      updateFixtureContent(
        page.content,
        {
          tags:
            page.tags
        }
      );

    await persistPageContentCommand({
      page,
      content:
        newerTagsContent,
      previousPage:
        snapshotPageForCommand(
          page
        ),
      reason:
        'newer-tags-before-full-content',
      expectedBase:
        sessionBase.expectedBase
    });

    const staleFullContent =
      updateFixtureContent(
        sessionBase.content,
        {
          body:
            '<h1>Full Content Conflict</h1><p>stale body C</p>'
        }
      );

    const result =
      await persistPageContentCommand({
        page,
        content:
          staleFullContent,
        previousPage:
          sessionBase.previousPage,
        reason:
          'stale-full-content-save',
        expectedBase:
          sessionBase.expectedBase
      });

    const durableParsed =
      parseFixtureContent(
        await adapter.readText(
          page.path
        )
      );

    assert.equal(
      result.writeStatus,
      'conflict'
    );

    assert.equal(
      result.preservedUnrelatedChanges,
      false
    );

    assert.deepEqual(
      durableParsed.tags,
      [
        'card',
        'newer'
      ]
    );

    assert.match(
      durableParsed.body,
      /base body A/
    );

    assert.doesNotMatch(
      durableParsed.body,
      /stale body C/
    );
  }
);


test(
  'structured field ownership does not overwrite durable sibling metadata',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'structured-preserve-sibling-metadata',
        body:
          '<h1>Sibling Metadata</h1><p>base body</p>',
        tags:
          [
            'card',
            'base'
          ],
        type:
          'note'
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

    page.type =
      'location';

    const newerTypeContent =
      updateFixtureContent(
        page.content,
        {
          type:
            page.type
        }
      );

    await persistPageContentCommand({
      page,
      content:
        newerTypeContent,
      previousPage:
        snapshotPageForCommand(
          page
        ),
      reason:
        'newer-type-command',
      expectedBase:
        sessionBase.expectedBase
    });

    page.tags =
      [
        'card',
        'quest'
      ];

    const staleTagsContent =
      updateFixtureContent(
        sessionBase.content,
        {
          tags:
            page.tags
        }
      );

    const result =
      await persistPageContentCommand({
        page,
        content:
          staleTagsContent,
        previousPage:
          sessionBase.previousPage,
        reason:
          'stale-tags-command',
        expectedBase:
          sessionBase.expectedBase,
        structuredMutation:
          {
            kind:
              'page-record-fields',
            fields:
              [
                'page-record.tags'
              ]
          }
      });

    const durableParsed =
      parseFixtureContent(
        await adapter.readText(
          page.path
        )
      );

    assert.equal(
      result.writeStatus,
      'saved'
    );

    assert.equal(
      result.preservedUnrelatedChanges,
      true
    );

    assert.equal(
      durableParsed.type,
      'location'
    );

    assert.deepEqual(
      durableParsed.tags,
      [
        'card',
        'quest'
      ]
    );

    assert.deepEqual(
      getPagesByType(
        'location'
      ),
      [
        page
      ]
    );

    assert.deepEqual(
      getPagesByTag(
        'quest'
      ),
      [
        page
      ]
    );
  }
);
