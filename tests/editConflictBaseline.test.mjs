import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPageById,
  getPagesByTag,
  findPageByTitleOrAlias,
  searchPageResults
} from '../js/repository/pageRepository.js';

import {
  persistPageContentCommand,
  snapshotPageForCommand
} from '../js/storage/pageCommandService.js';

import {
  createEditConflictFixture,
  parseFixtureContent,
  updateFixtureContent
} from './fixtures/editConflictFixtures.mjs';


test(
  'edit conflict baseline case 1: same-content-base save succeeds normally',
  async () => {

    const {
      adapter,
      page
    } =
      await createEditConflictFixture({
        id:
          'conflict-case-1',
        body:
          '<h1>Conflict Case 1</h1>\n<p>base body</p>'
      });

    const nextContent =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Conflict Case 1</h1>\n<p>same base edit</p>'
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
          'conflict-baseline-same-base'
      });

    assert.equal(
      result.writeStatus,
      'saved'
    );

    assert.equal(
      result.stale,
      false
    );

    assert.equal(
      page.content,
      nextContent
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
  'edit conflict baseline case 2: stale full-page save currently overwrites newer durable content',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'conflict-case-2',
        body:
          '<h1>Conflict Case 2</h1>\n<p>base A</p>'
      });

    const sessionBase =
      {
        previousPage:
          snapshotPageForCommand(
            page
          ),
        content:
          originalContent
      };

    const newerDurableContent =
      updateFixtureContent(
        page.content,
        {
          body:
            '<h1>Conflict Case 2</h1>\n<p>newer durable B</p>'
        }
      );

    await persistPageContentCommand({
      page,
      content:
        newerDurableContent,
      previousPage:
        snapshotPageForCommand(
          page
        ),
      reason:
        'conflict-baseline-newer-durable-write'
    });

    const staleEditorContent =
      updateFixtureContent(
        sessionBase.content,
        {
          body:
            '<h1>Conflict Case 2</h1>\n<p>stale editor C</p>'
        }
      );

    const result =
      await persistPageContentCommand({
        page,
        content:
          staleEditorContent,
        previousPage:
          sessionBase.previousPage,
        reason:
          'conflict-baseline-stale-full-page-save'
      });

    assert.equal(
      result.writeStatus,
      'saved'
    );

    assert.equal(
      result.stale,
      false,
      'current baseline has no edit-session base precondition'
    );

    assert.equal(
      await adapter.readText(
        page.path
      ),
      staleEditorContent
    );

    assert.equal(
      page.content,
      staleEditorContent
    );

    assert.equal(
      searchPageResults(
        'newer durable B'
      ).length,
      0
    );

    assert.equal(
      searchPageResults(
        'stale editor C'
      )[0]?.page,
      page
    );
  }
);


test(
  'edit conflict baseline case 3: stale structured different-field command can lose the newer field durably',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'conflict-case-3',
        body:
          '<h1>Conflict Case 3</h1>\n<p>base body</p>',
        tags:
          [
            'card',
            'base-tag'
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
          originalContent
      };

    page.tags =
      [
        'card',
        'field-x-tag'
      ];

    const fieldXContent =
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
        fieldXContent,
      previousPage:
        snapshotPageForCommand(
          page
        ),
      reason:
        'conflict-baseline-field-x'
    });

    page.aliases =
      [
        'field-y-alias'
      ];

    const staleFieldYContent =
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
          staleFieldYContent,
        previousPage:
          sessionBase.previousPage,
        reason:
          'conflict-baseline-stale-field-y'
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
      result.stale,
      false
    );

    assert.deepEqual(
      durableParsed.aliases,
      [
        'field-y-alias'
      ]
    );

    assert.deepEqual(
      durableParsed.tags,
      [
        'card',
        'base-tag'
      ],
      'current baseline writes the stale full PageRecord, so field X is not preserved durably'
    );

    assert.deepEqual(
      getPagesByTag(
        'field-x-tag'
      ),
      [
        page
      ],
      'runtime metadata can remain ahead of the durable stale write until reload'
    );
  }
);


test(
  'edit conflict baseline case 4: stale same-field command currently overwrites the newer field',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'conflict-case-4',
        body:
          '<h1>Conflict Case 4</h1>\n<p>base body</p>',
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
          originalContent
      };

    page.aliases =
      [
        'newer-alias-x'
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
        'conflict-baseline-same-field-x'
    });

    page.aliases =
      [
        'stale-alias-y'
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
          'conflict-baseline-same-field-y'
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

    assert.deepEqual(
      durableParsed.aliases,
      [
        'stale-alias-y'
      ]
    );

    assert.equal(
      findPageByTitleOrAlias(
        'newer-alias-x'
      ),
      null
    );

    assert.equal(
      findPageByTitleOrAlias(
        'stale-alias-y'
      ),
      page
    );
  }
);


test(
  'edit conflict baseline case 5: autosave-shaped stale content can preserve current metadata while replacing body',
  async () => {

    const {
      adapter,
      page,
      originalContent
    } =
      await createEditConflictFixture({
        id:
          'conflict-case-5',
        body:
          '<h1>Conflict Case 5</h1>\n<p>base body A</p>',
        tags:
          [
            'card',
            'base-tag'
          ]
      });

    const sessionBase =
      {
        previousPage:
          snapshotPageForCommand(
            page
          ),
        content:
          originalContent
      };

    page.tags =
      [
        'card',
        'metadata-b'
      ];

    const metadataContent =
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
        metadataContent,
      previousPage:
        snapshotPageForCommand(
          page
        ),
      reason:
        'conflict-baseline-metadata-b'
    });

    const staleContentSave =
      updateFixtureContent(
        page.content,
        {
          tags:
            page.tags,
          body:
            '<h1>Conflict Case 5</h1>\n<p>stale body C based on A</p>'
        }
      );

    const result =
      await persistPageContentCommand({
        page,
        content:
          staleContentSave,
        previousPage:
          sessionBase.previousPage,
        reason:
          'conflict-baseline-stale-body-current-metadata'
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

    assert.deepEqual(
      durableParsed.tags,
      [
        'card',
        'metadata-b'
      ]
    );

    assert.match(
      durableParsed.body,
      /stale body C/
    );

    assert.doesNotMatch(
      durableParsed.body,
      /base body A/
    );
  }
);
