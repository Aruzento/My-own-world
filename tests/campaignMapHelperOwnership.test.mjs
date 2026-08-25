import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


const POPUP_MARKUP_OWNER =
  'js/editor/campaignMapPopupMarkup.js';

const POPUP_TEMPLATE_CONSUMERS = [
  'js/editor/campaignMapToolbar.js',
  'js/editor/campaignMapMusic.js',
  'js/editor/campaignMapInitiativePopup.js'
];

const INITIATIVE_MODEL_OWNER =
  'js/editor/campaignMapInitiativeModel.js';

const INITIATIVE_POPUP_CONSUMER =
  'js/editor/campaignMapInitiativePopup.js';

const MAP_PAGE_WRITE_HELPER_CONSUMERS = [
  'js/editor/campaignMapSerializerHelpers.js',
  'js/editor/campaignMapTokenActions.js'
];


test(
  'Campaign Map popup template consumers use the shared escaping owner',
  async () => {

    const ownerSource =
      await readFile(
        POPUP_MARKUP_OWNER,
        'utf8'
      );

    assert.match(
      ownerSource,
      /export function escapeHTML\s*\(/
    );

    assert.match(
      ownerSource,
      /export function escapeAttribute\s*\(/
    );

    for (const filePath of POPUP_TEMPLATE_CONSUMERS) {

      const source =
        await readFile(
          filePath,
          'utf8'
        );

      const popupMarkupImport =
        source.match(
          /import\s*{([\s\S]*?)}\s*from '\.\/campaignMapPopupMarkup\.js';/
        );

      assert.ok(
        popupMarkupImport,
        `${filePath} should import shared popup escaping helpers`
      );

      assert.match(
        popupMarkupImport[1],
        /\bescapeHTML\b/,
        `${filePath} should import shared escapeHTML`
      );

      assert.match(
        popupMarkupImport[1],
        /\bescapeAttribute\b/,
        `${filePath} should import shared escapeAttribute`
      );

      assert.doesNotMatch(
        source,
        /function\s+escapeHTML\s*\(/,
        `${filePath} should not define a local escapeHTML duplicate`
      );

      assert.doesNotMatch(
        source,
        /function\s+escapeAttribute\s*\(/,
        `${filePath} should not define a local escapeAttribute duplicate`
      );
    }
  }
);


test(
  'Campaign Map feature helpers use the page command boundary for page writes',
  async () => {

    for (const filePath of MAP_PAGE_WRITE_HELPER_CONSUMERS) {

      const source =
        await readFile(
          filePath,
          'utf8'
        );

      assert.doesNotMatch(
        source,
        /\bwritePageContent\b/,
        `${filePath} should not import or call low-level writePageContent directly`
      );

      assert.match(
        source,
        /\bpersistPageContentCommand\b/,
        `${filePath} should route page writes through PageCommandService`
      );
    }
  }
);


test(
  'Campaign Map initiative rolls through the model owner and public Dice Engine facade',
  async () => {

    const [
      modelSource,
      popupSource
    ] =
      await Promise.all([
        readFile(
          INITIATIVE_MODEL_OWNER,
          'utf8'
        ),
        readFile(
          INITIATIVE_POPUP_CONSUMER,
          'utf8'
        )
      ]);

    assert.match(
      modelSource,
      /export function rollD20\s*\(/
    );

    assert.match(
      modelSource,
      /import\s*{[\s\S]*\brollDice\b[\s\S]*}\s*from '\.\.\/dice\/diceEngine\.js';/,
      'Initiative model should consume the public Dice Engine facade'
    );

    const initiativeModelImport =
      popupSource.match(
        /import\s*{([\s\S]*?)}\s*from '\.\/campaignMapInitiativeModel\.js';/
      );

    assert.ok(
      initiativeModelImport,
      'Initiative popup should import rollD20 from the initiative model'
    );

    assert.match(
      initiativeModelImport[1],
      /\brollD20\b/,
      'Initiative popup should import rollD20 from the initiative model'
    );

    assert.doesNotMatch(
      popupSource,
      /function\s+rollD20\s*\(/,
      'Initiative popup should not define a local rollD20 duplicate'
    );

    assert.doesNotMatch(
      popupSource,
      /diceEngine\.js/,
      'Initiative popup should not import Dice Engine internals directly'
    );
  }
);
