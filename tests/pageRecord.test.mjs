import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPageRecordContent,
  createPageContentHash,
  createRuntimePageFromContent,
  parsePageRecordContent,
  updatePageRecordContent
} from '../js/core/pageRecord.js';


test(
  'PageRecord writes required diagnostic metadata',
  () => {

    const content =
      buildPageRecordContent({
        id:
          'metadata-page',
        parent:
          null,
        order:
          5,
        tags:
          [
            'card'
          ],
        template:
          'card',
        type:
          'note',
        aliases:
          [],
        body:
          '<h1>Metadata</h1>',
        now:
          '2026-07-19T09:00:00.000Z'
      });

    assert.match(
      content,
      /^schemaVersion: 1$/m
    );

    assert.match(
      content,
      /^updatedAt: 2026-07-19T09:00:00.000Z$/m
    );

    assert.match(
      content,
      /^contentHash: fnv1a32:[0-9a-f]{8}$/m
    );

    const record =
      parsePageRecordContent(
        content
      );

    assert.equal(
      record.pageRecordStatus.contentHashValid,
      true
    );

    assert.equal(
      record.contentHash,
      createPageContentHash(
        '<h1>Metadata</h1>\n'
      )
    );
  }
);


test(
  'PageRecord migrates missing diagnostic metadata on update',
  () => {

    const updated =
      updatePageRecordContent(
`---
id: page-a
parent: root
order: 12
tags: [card]
template: card
type: note
aliases: []
customMeta: keep-me
---

<h1>Page A</h1>
`,
        {
          parent:
            null
        },
        {
          now:
            '2026-07-19T10:00:00.000Z'
        }
      );

    assert.match(
      updated,
      /^schemaVersion: 1$/m
    );

    assert.match(
      updated,
      /^updatedAt: 2026-07-19T10:00:00.000Z$/m
    );

    assert.match(
      updated,
      /^contentHash: fnv1a32:[0-9a-f]{8}$/m
    );

    assert.match(
      updated,
      /^customMeta: keep-me$/m
    );

    const record =
      parsePageRecordContent(
        updated
      );

    assert.equal(
      record.pageRecordStatus.schemaVersionMissing,
      false
    );

    assert.equal(
      record.pageRecordStatus.updatedAtMissing,
      false
    );

    assert.equal(
      record.pageRecordStatus.contentHashValid,
      true
    );
  }
);


test(
  'PageRecord detects content hash mismatch',
  () => {

    const content =
      buildPageRecordContent({
        id:
          'hash-page',
        parent:
          null,
        order:
          1,
        tags:
          [
            'card'
          ],
        template:
          'card',
        type:
          'note',
        aliases:
          [],
        body:
          '<h1>Original</h1>',
        now:
          '2026-07-19T09:00:00.000Z'
      });

    const broken =
      content.replace(
        '<h1>Original</h1>',
        '<h1>Changed</h1>'
      );

    const record =
      parsePageRecordContent(
        broken
      );

    assert.equal(
      record.pageRecordStatus.contentHashValid,
      false
    );

    assert.equal(
      record.pageRecordStatus.expectedContentHash,
      createPageContentHash(
        '<h1>Changed</h1>\n'
      )
    );
  }
);


test(
  'PageRecord parses metadata, body, title and relationships',
  () => {

    const content =
`---
id: page-a
parent: root
order: 12
tags: [Card, Hero]
template: card
type: character
aliases: [A, B]
relationshipsJson: [{"type":"ally","targetId":"page-b","label":"Friend"}]
customMeta: keep-me
---

<h1>Hero <em>Name</em></h1>
<p>Body</p>
`;

    const record =
      parsePageRecordContent(
        content
      );

    assert.equal(
      record.id,
      'page-a'
    );

    assert.equal(
      record.parent,
      'root'
    );

    assert.deepEqual(
      record.tags,
      [
        'card',
        'hero'
      ]
    );

    assert.deepEqual(
      record.aliases,
      [
        'A',
        'B'
      ]
    );

    assert.equal(
      record.title,
      'Hero Name'
    );

    assert.deepEqual(
      record.relationships,
      [
        {
          type:
            'ally',
          targetId:
            'page-b',
          label:
            'Friend'
        }
      ]
    );
  }
);


test(
  'PageRecord updates known metadata and preserves unknown front matter',
  () => {

    const content =
`---
id: page-a
parent: root
order: 12
tags: [card]
template: card
type: note
aliases: []
customMeta: keep-me
---

<h1>Page A</h1>
<p>Body</p>
`;

    const updated =
      updatePageRecordContent(
        content,
        {
          parent:
            null,
          order:
            99,
          aliases:
            [
              'Alias One',
              'Alias Two'
            ]
        }
      );

    assert.match(
      updated,
      /^parent: null$/m
    );

    assert.match(
      updated,
      /^order: 99$/m
    );

    assert.match(
      updated,
      /^aliases: \[Alias One, Alias Two\]$/m
    );

    assert.match(
      updated,
      /^customMeta: keep-me$/m
    );

    assert.match(
      updated,
      /<p>Body<\/p>/
    );
  }
);


test(
  'PageRecord preserves explicit body whitespace while writing',
  () => {

    const updated =
      updatePageRecordContent(
`---
id: page-a
parent: root
order: 12
tags: [card]
template: card
type: note
aliases: []
---

<h1>Page A</h1>
`,
        {
          body:
            '\n<section>\n  <p>Body</p>\n</section>\n\n'
        }
      );

    assert.match(
      updated,
      /\n---\n\n\n<section>\n  <p>Body<\/p>\n<\/section>\n\n$/
    );
  }
);


test(
  'PageRecord preserves invalid relationshipsJson when unrelated metadata changes',
  () => {

    const content =
`---
id: page-a
parent: root
order: 12
tags: [card]
template: card
type: note
aliases: []
relationshipsJson: {broken
---

<h1>Page A</h1>
`;

    let updated = '';
    const originalWarn = console.warn;
    console.warn = () => {};

    try {

      updated =
        updatePageRecordContent(
          content,
          {
            parent:
              'new-parent'
          }
        );

    } finally {

      console.warn =
        originalWarn;
    }

    assert.match(
      updated,
      /^relationshipsJson: \{broken$/m
    );

    assert.match(
      updated,
      /^parent: new-parent$/m
    );
  }
);


test(
  'PageRecord builds runtime page objects from one parser',
  () => {

    const content =
      buildPageRecordContent({
        id:
          'runtime-page',
        parent:
          null,
        order:
          5,
        tags:
          [
            'card'
          ],
        template:
          'card',
        type:
          'note',
        aliases:
          [],
        relationships:
          [
            {
              type:
                'related',
              targetTitle:
                'Target'
            }
          ],
        body:
          '<h1>Runtime</h1>'
      });

    const page =
      createRuntimePageFromContent({
        content,
        name:
          'runtime.md',
        path:
          '/pages/runtime.md'
      });

    assert.equal(
      page.id,
      'runtime-page'
    );

    assert.equal(
      page.title,
      'Runtime'
    );

    assert.deepEqual(
      page.relationships,
      [
        {
          type:
            'related',
          targetTitle:
            'Target'
        }
      ]
    );
  }
);
