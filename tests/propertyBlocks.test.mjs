import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPropertiesBlock
} from '../js/templates/blockTypes.js';

import {
  hasPropertyBlockDefinition
} from '../js/templates/propertyBlockDefinitions.js';


test(
  'property block creates type-specific skill fields',
  () => {

    const html =
      createPropertiesBlock({
        title: 'Свойства',
        cardType: 'skill'
      });

    assert.match(
      html,
      /data-block-type="properties"/
    );

    assert.match(
      html,
      /data-card-type="skill"/
    );

    assert.match(
      html,
      /data-property-name="damage"/
    );

    assert.match(
      html,
      /data-property-name="effect"/
    );
  }
);


test(
  'property block definitions are available only for supported card types',
  () => {

    assert.equal(
      hasPropertyBlockDefinition('character'),
      true
    );

    assert.equal(
      hasPropertyBlockDefinition('item'),
      true
    );

    assert.equal(
      hasPropertyBlockDefinition('location'),
      false
    );
  }
);
