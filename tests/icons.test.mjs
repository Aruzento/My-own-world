import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readFileSync
} from 'node:fs';

import {
  getPageIcon,
  iconSvg
} from '../js/core/icons.js';


test(
  'iconSvg keeps the decorative default markup contract',
  () => {

    const markup =
      iconSvg(
        'campaign-map'
      );

    assert.match(
      markup,
      /class="app-icon"/
    );

    assert.match(
      markup,
      /aria-hidden="true"/
    );

    assert.match(
      markup,
      /data-icon-name="campaign-map"/
    );

    assert.match(
      markup,
      /#icon-campaign-map/
    );
  }
);


test(
  'iconSvg supports labeled and sized icons',
  () => {

    const markup =
      iconSvg(
        'Magic Rune!',
        'tool-icon',
        {
          ariaLabel: 'Open magic tools',
          size: 'lg'
        }
      );

    assert.match(
      markup,
      /class="tool-icon"/
    );

    assert.match(
      markup,
      /role="img" aria-label="Open magic tools"/
    );

    assert.match(
      markup,
      /data-icon-size="lg"/
    );

    assert.match(
      markup,
      /#icon-magicrune/
    );
  }
);


test(
  'getPageIcon preserves entity icon wrapper and class',
  () => {

    const markup =
      getPageIcon([
        'Location'
      ]);

    assert.match(
      markup,
      /class="entity-icon"/
    );

    assert.match(
      markup,
      /class="entity-icon-svg"/
    );

    assert.match(
      markup,
      /#icon-location/
    );
  }
);


test(
  'local sprite exposes property field state icons',
  () => {

    const sprite =
      readFileSync(
        new URL(
          '../assets/icons/rpg-ui.svg',
          import.meta.url
        ),
        'utf8'
      );

    [
      'icon-calculator',
      'icon-hash',
      'icon-check'
    ].forEach(id => {

      assert.match(
        sprite,
        new RegExp(`id="${id}"`)
      );
    });
  }
);
