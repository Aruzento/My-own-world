import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getGraphCanvasHistoryActionFromKeyboardEvent,
  handleGraphCanvasHistoryAction,
  isGraphCanvasHistoryKeyboardShortcut,
  pushGraphCanvasHistoryEntry,
  setupGraphCanvasKeyboardHistory,
  teardownGraphCanvasKeyboardHistory,
  updateGraphCanvasHistoryControls
} from '../js/wiki/knowledgeGraphCanvasHistory.js';

import {
  setupKnowledgeGraphEvents,
  teardownKnowledgeGraphPage
} from '../js/wiki/knowledgeGraphPage.js';


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


function createLifecycleDocument() {

  const listeners =
    [];

  const ownerDocument =
    {
      body:
        {},
      documentElement:
        {},
      activeElement:
        null,
      addEventListener(
        type,
        handler,
        capture
      ) {

        listeners.push({
          type,
          handler,
          capture
        });
      },
      removeEventListener(
        type,
        handler,
        capture
      ) {

        const index =
          listeners.findIndex(listener =>
            listener.type === type &&
            listener.handler === handler &&
            listener.capture === capture
          );

        if (index >= 0) {

          listeners.splice(
            index,
            1
          );
        }
      }
    };

  function createGraphDocument() {

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

    return {
      ownerDocument,
      isConnected:
        true,
      contains(
        target
      ) {

        return target === this;
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
      focus() {}
    };
  }

  return {
    createGraphDocument,
    countKeydownHandlers:
      () => listeners.filter(listener =>
        listener.type === 'keydown'
      ).length,
    dispatchKeydown:
      async event => {

        for (const listener of [
          ...listeners
        ]) {

          if (listener.type === 'keydown') {

            await listener.handler(
              event
            );
          }
        }
      }
  };
}


function createGraphPageLifecycleHarness() {

  const listeners =
    [];

  const ownerDocument =
    {
      body:
        {},
      documentElement:
        {},
      activeElement:
        null,
      addEventListener(
        type,
        handler,
        options
      ) {

        listeners.push({
          type,
          handler,
          options
        });
      },
      removeEventListener(
        type,
        handler,
        options
      ) {

        const index =
          listeners.findIndex(listener =>
            listener.type === type &&
            listener.handler === handler &&
            listener.options === options
          );

        if (index >= 0) {

          listeners.splice(
            index,
            1
          );
        }
      }
    };

  function createGraphDocument() {

    const elementListeners =
      [];

    return {
      dataset:
        {},
      ownerDocument,
      isConnected:
        true,
      addEventListener(
        type,
        handler,
        options
      ) {

        elementListeners.push({
          type,
          handler,
          options
        });
      },
      querySelectorAll(
        selector
      ) {

        if (selector === '[data-knowledge-graph-history-action]') {

          return [];
        }

        if (selector === '.knowledge-graph-document') {

          return [
            this
          ];
        }

        return [];
      },
      focus() {}
    };
  }

  return {
    createGraphDocument,
    countDocumentHandlers:
      type => listeners.filter(listener =>
        listener.type === type
      ).length
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


test(
  'knowledge graph canvas history teardown removes stale document keydown ownership',
  async () => {

    const {
      createGraphDocument,
      countKeydownHandlers,
      dispatchKeydown
    } =
      createLifecycleDocument();

    const applied =
      [];

    const options =
      {
        applyEntry:
          async (
            documentElement,
            entry,
            action
          ) => {

            applied.push({
              documentElement,
              entry,
              action
            });

            return true;
          }
      };

    const graphA =
      createGraphDocument();

    setupGraphCanvasKeyboardHistory(
      graphA,
      options
    );

    setupGraphCanvasKeyboardHistory(
      graphA,
      options
    );

    assert.equal(
      countKeydownHandlers(),
      1
    );

    pushGraphCanvasHistoryEntry(
      graphA,
      {
        id:
          'a-entry'
      },
      {
        focusDocument:
          () => {}
      }
    );

    teardownGraphCanvasKeyboardHistory(
      graphA
    );

    graphA.isConnected =
      false;

    teardownGraphCanvasKeyboardHistory(
      graphA
    );

    assert.equal(
      countKeydownHandlers(),
      0
    );

    const graphB =
      createGraphDocument();

    setupGraphCanvasKeyboardHistory(
      graphB,
      options
    );

    teardownGraphCanvasKeyboardHistory(
      graphB
    );

    graphB.isConnected =
      false;

    const graphC =
      createGraphDocument();

    setupGraphCanvasKeyboardHistory(
      graphC,
      options
    );

    assert.equal(
      countKeydownHandlers(),
      1
    );

    pushGraphCanvasHistoryEntry(
      graphC,
      {
        id:
          'c-entry'
      },
      {
        focusDocument:
          () => {}
      }
    );

    await dispatchKeydown({
      defaultPrevented:
        false,
      ctrlKey:
        true,
      metaKey:
        false,
      altKey:
        false,
      code:
        'KeyZ',
      key:
        'z',
      target:
        graphC,
      preventDefault() {

        this.defaultPrevented =
          true;
      }
    });

    assert.deepEqual(
      applied.map(entry => [
        entry.entry.id,
        entry.action
      ]),
      [
        [
          'c-entry',
          'undo'
        ]
      ]
    );

    await dispatchKeydown({
      defaultPrevented:
        false,
      ctrlKey:
        true,
      metaKey:
        false,
      altKey:
        false,
      code:
        'KeyY',
      key:
        'y',
      target:
        graphC,
      preventDefault() {

        this.defaultPrevented =
          true;
      }
    });

    assert.deepEqual(
      applied.map(entry => [
        entry.entry.id,
        entry.action
      ]),
      [
        [
          'c-entry',
          'undo'
        ],
        [
          'c-entry',
          'redo'
        ]
      ]
    );
  }
);


test(
  'knowledge graph page teardown removes stale document drag and pan ownership',
  () => {

    const {
      createGraphDocument,
      countDocumentHandlers
    } =
      createGraphPageLifecycleHarness();

    const editorA =
      createGraphDocument();

    setupKnowledgeGraphEvents(
      editorA
    );

    assert.equal(
      countDocumentHandlers(
        'pointermove'
      ),
      1
    );

    assert.equal(
      countDocumentHandlers(
        'mousemove'
      ),
      1
    );

    assert.equal(
      countDocumentHandlers(
        'pointerup'
      ),
      1
    );

    assert.equal(
      countDocumentHandlers(
        'mouseup'
      ),
      1
    );

    teardownKnowledgeGraphPage(
      editorA
    );

    assert.equal(
      countDocumentHandlers(
        'pointermove'
      ),
      0
    );

    assert.equal(
      countDocumentHandlers(
        'mousemove'
      ),
      0
    );

    assert.equal(
      countDocumentHandlers(
        'pointerup'
      ),
      0
    );

    assert.equal(
      countDocumentHandlers(
        'mouseup'
      ),
      0
    );

    const editorB =
      createGraphDocument();

    setupKnowledgeGraphEvents(
      editorB
    );

    assert.equal(
      countDocumentHandlers(
        'pointermove'
      ),
      1
    );

    teardownKnowledgeGraphPage(
      editorB
    );

    assert.equal(
      countDocumentHandlers(
        'pointermove'
      ),
      0
    );
  }
);
