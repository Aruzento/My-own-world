import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


test(
  'Knowledge Graph page reads use PageRepository instead of direct state.pages lookup',
  async () => {

    const source =
      await readFile(
        'js/wiki/knowledgeGraphPage.js',
        'utf8'
      );

    assert.doesNotMatch(
      source,
      /from '\.\.\/state\.js'/,
      'Knowledge Graph page coordinator should not import the runtime page store for read/query access.'
    );

    assert.doesNotMatch(
      source,
      /\bstate\.pages\b/,
      'Knowledge Graph page lookup/query access must go through PageRepository.'
    );

    assert.match(
      source,
      /from '\.\.\/repository\/pageRepository\.js'/,
      'Knowledge Graph page coordinator should consume the established PageRepository read owner.'
    );
  }
);
