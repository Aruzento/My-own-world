import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTreeDropIntentFromRatio,
  getTreeDropLevel
} from '../js/tree/treeDropIntent.js';


test(
  'getTreeDropIntentFromRatio разделяет before, inside и after',
  () => {

    assert.equal(
      getTreeDropIntentFromRatio(0.1),
      'before'
    );

    assert.equal(
      getTreeDropIntentFromRatio(0.5),
      'inside'
    );

    assert.equal(
      getTreeDropIntentFromRatio(0.9),
      'after'
    );
  }
);


test(
  'getTreeDropLevel увеличивает уровень только для inside',
  () => {

    assert.equal(
      getTreeDropLevel(2, 'before'),
      2
    );

    assert.equal(
      getTreeDropLevel(2, 'after'),
      2
    );

    assert.equal(
      getTreeDropLevel(2, 'inside'),
      3
    );
  }
);
