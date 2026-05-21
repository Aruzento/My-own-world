import test from 'node:test';
import assert from 'node:assert/strict';

import {
  state
} from '../js/state.js';

import {
  getCampaignMapEntityTitle,
  getDuplicatePageTitleIds,
  getUniqueCopyTitle,
  hasDuplicatePageTitle,
  normalizePageTitle
} from '../js/validation/pageTitleValidation.js';


test(
  'normalizePageTitle сравнивает названия мягко',
  () => {

    assert.equal(
      normalizePageTitle('  Башня   Мага  '),
      'башня мага'
    );
  }
);


test(
  'pageTitleValidation находит дубли с учетом регистра и пробелов',
  () => {

    state.pages =
      [
        {
          id: 'a',
          title: 'Замок Лорда'
        },
        {
          id: 'b',
          title: ' замок   лорда '
        },
        {
          id: 'c',
          title: 'Лес'
        }
      ];

    assert.equal(
      hasDuplicatePageTitle(
        'c',
        'ЗАМОК ЛОРДА'
      ),
      true
    );

    assert.deepEqual(
      [...getDuplicatePageTitleIds()].sort(),
      ['a', 'b']
    );
  }
);


test(
  'pageTitleValidation создает безопасные названия копий и сущностей карты',
  () => {

    state.pages =
      [
        {
          id: 'a',
          title: 'Копия1 - Меч'
        }
      ];

    assert.equal(
      getUniqueCopyTitle('Меч'),
      'Копия2 - Меч'
    );

    assert.equal(
      getCampaignMapEntityTitle(
        'Гоблин',
        'Пещера'
      ),
      'Гоблин - сущность.Пещера'
    );
  }
);
