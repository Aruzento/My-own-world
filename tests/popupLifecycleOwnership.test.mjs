import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


const ITEM_SETS_PATH =
  'js/ui/itemSets.js';

const KNOWLEDGE_GRAPH_OVERLAYS_PATH =
  'js/wiki/knowledgeGraphCanvasOverlays.js';

const TOOLBAR_PATH =
  'js/editor/toolbar.js';

const TOOLBAR_POSITION_PATH =
  'js/editor/toolbarPosition.js';


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


test(
  'knowledge graph node menu delegates viewport positioning to popupPosition',
  async () => {

    const source =
      await readFile(
        KNOWLEDGE_GRAPH_OVERLAYS_PATH,
        'utf8'
      );

    assert.match(
      source,
      /registerPopup\(\{[\s\S]*key:\s*'knowledge-graph-node-menu'[\s\S]*kind:\s*'context-menu'/,
      'Knowledge Graph node menu should remain registered with PopupManager'
    );

    assert.match(
      source,
      /openPopupAtPoint\(\s*menu,\s*clientX,\s*clientY,/,
      'Knowledge Graph node menu should open through the shared point-positioned popup path'
    );

    assert.doesNotMatch(
      source,
      /adjustGraphNodeMenuToViewport|clampGraphCanvasPosition/,
      'Knowledge Graph node menu should not keep feature-local viewport clamp helpers'
    );
  }
);


test(
  'toolbar color popup delegates lifecycle and positioning to PopupManager',
  async () => {

    const toolbarSource =
      await readFile(
        TOOLBAR_PATH,
        'utf8'
      );

    const toolbarPositionSource =
      await readFile(
        TOOLBAR_POSITION_PATH,
        'utf8'
      );

    assert.match(
      toolbarSource,
      /registerPopup\(\{[\s\S]*key:\s*'toolbar-color-popup'[\s\S]*kind:\s*'popover'/,
      'Toolbar color popup should remain registered with PopupManager'
    );

    assert.match(
      toolbarSource,
      /controller\.toggleNearAnchor\(\s*button,/,
      'Toolbar color popup should toggle through the shared anchored popup path'
    );

    assert.doesNotMatch(
      toolbarSource,
      /positionColorPopup/,
      'Toolbar color popup should not call a feature-local positioning helper'
    );

    assert.doesNotMatch(
      toolbarSource,
      /document\.addEventListener\(\s*['"]mousedown['"]/,
      'Toolbar color popup should not keep a document-level outside-close fallback'
    );

    assert.doesNotMatch(
      toolbarPositionSource,
      /positionColorPopup/,
      'toolbarPosition should only own floating toolbar geometry, not color popup geometry'
    );
  }
);
