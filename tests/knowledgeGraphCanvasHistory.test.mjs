import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getGraphCanvasHistoryActionFromKeyboardEvent,
  handleGraphCanvasHistoryAction,
  isGraphCanvasHistoryKeyboardShortcut,
  pushGraphCanvasHistoryEntry,
  updateGraphCanvasHistoryControls
} from '../js/wiki/knowledgeGraphCanvasHistory.js';


function createHistoryButton(
  action
) {

  return {
    dataset:
      {
        knowledgeGraphHistoryAction:
          action
      },
    disabled:
      false,
    attributes:
      new Map(),
    setAttribute(
      name,
      value
    ) {

      this.attributes.set(
        name,
        value
      );
    }
  };
}


function createHistoryDocument() {

  const buttons =
    {
      undo:
        createHistoryButton(
          'undo'
        ),
      redo:
        createHistoryButton(
          'redo'
        )
    };

  let focusCount =
    0;

  const documentElement =
    {
      ownerDocument:
        {
          activeElement:
            null
        },
      querySelectorAll(
        selector
      ) {

        if (selector !== '[data-knowledge-graph-history-action]') {

          return [];
        }

        return [
          buttons.undo,
          buttons.redo
        ];
      },
      focus() {

        focusCount +=
          1;
      }
    };

  return {
    buttons,
    documentElement,
    getFocusCount:
      () => focusCount
  };
}


test(
  'knowledge graph canvas history owns undo redo stacks and controls',
  async () => {

    const {
      buttons,
      documentElement,
      getFocusCount
    } =
      createHistoryDocument();

    const appliedEntries =
      [];

    const options =
      {
        applyEntry:
          async (
            targetDocument,
            entry,
            action
          ) => {

            appliedEntries.push({
              targetDocument,
              entry,
              action
            });

            return true;
          }
      };

    updateGraphCanvasHistoryControls(
      documentElement
    );

    assert.equal(
      buttons.undo.disabled,
      true
    );

    assert.equal(
      buttons.redo.disabled,
      true
    );

    pushGraphCanvasHistoryEntry(
      documentElement,
      {
        type:
          'node-position',
        nodeId:
          'hero'
      }
    );

    assert.equal(
      getFocusCount(),
      1
    );

    assert.equal(
      buttons.undo.disabled,
      false
    );

    assert.equal(
      buttons.undo.attributes.get(
        'aria-disabled'
      ),
      'false'
    );

    assert.equal(
      buttons.redo.disabled,
      true
    );

    assert.equal(
      await handleGraphCanvasHistoryAction(
        documentElement,
        'undo',
        options
      ),
      true
    );

    assert.equal(
      appliedEntries[0].action,
      'undo'
    );

    assert.equal(
      appliedEntries[0].entry.nodeId,
      'hero'
    );

    assert.equal(
      buttons.undo.disabled,
      true
    );

    assert.equal(
      buttons.redo.disabled,
      false
    );

    assert.equal(
      await handleGraphCanvasHistoryAction(
        documentElement,
        'redo',
        options
      ),
      true
    );

    assert.equal(
      appliedEntries[1].action,
      'redo'
    );

    assert.equal(
      buttons.undo.disabled,
      false
    );

    assert.equal(
      buttons.redo.disabled,
      true
    );
  }
);


test(
  'knowledge graph canvas history keyboard shortcut contract is layout safe',
  () => {

    const target =
      {
        closest:
          () => null
      };

    assert.equal(
      isGraphCanvasHistoryKeyboardShortcut({
        altKey:
          false,
        ctrlKey:
          true,
        metaKey:
          false,
        code:
          'KeyZ',
        key:
          '\u044f',
        target
      }),
      true
    );

    assert.equal(
      getGraphCanvasHistoryActionFromKeyboardEvent({
        code:
          'KeyZ',
        key:
          '\u044f',
        shiftKey:
          false
      }),
      'undo'
    );

    assert.equal(
      getGraphCanvasHistoryActionFromKeyboardEvent({
        code:
          'KeyZ',
        key:
          'z',
        shiftKey:
          true
      }),
      'redo'
    );

    assert.equal(
      getGraphCanvasHistoryActionFromKeyboardEvent({
        code:
          'KeyY',
        key:
          'н',
        shiftKey:
          false
      }),
      'redo'
    );

    assert.equal(
      isGraphCanvasHistoryKeyboardShortcut({
        altKey:
          false,
        ctrlKey:
          true,
        metaKey:
          false,
        code:
          'KeyZ',
        key:
          'z',
        target:
          {
            closest:
              () => ({})
          }
      }),
      false
    );
  }
);
