import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


const ITEM_SETS_PATH =
  'js/ui/itemSets.js';


test(
  'item set picker delegates outside-close lifecycle to PopupManager',
  async () => {

    const source =
      await readFile(
        ITEM_SETS_PATH,
        'utf8'
      );

    assert.match(
      source,
      /registerPopup\(\{[\s\S]*key:\s*'item-set-picker'[\s\S]*kind:\s*'popover'/,
      'item set picker should remain registered with PopupManager'
    );

    assert.match(
      source,
      /openPopupNearAnchor\(\s*picker,\s*button,/,
      'item set picker should open through the shared anchored popup path'
    );

    assert.doesNotMatch(
      source,
      /picker\.contains\(\s*event\.target\s*\)[\s\S]{0,800}closeItemSetPicker\(\s*\)/,
      'item set picker should not keep a local document-click outside-close fallback'
    );
  }
);
