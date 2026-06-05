import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addInventoryItem,
  createInventoryModel,
  removeInventoryItem,
  updateInventoryItemQuantity
} from '../js/character/inventoryModel.js';

import {
  createCharacterModel,
  getCharacterInventory
} from '../js/character/characterModel.js';


test(
  'InventoryModel normalizes quantities and merges duplicated item pages',
  () => {

    const inventory =
      createInventoryModel({
        items: [
          {
            pageId: 'rapier',
            title: 'Рапира',
            quantity: '1'
          },
          {
            pageId: 'rapier',
            title: 'Рапира',
            quantity: '2'
          },
          {
            pageId: 'arrows',
            title: 'Стрелы',
            quantity: '20'
          }
        ],
        source: 'items-block'
      });

    assert.equal(
      inventory.source,
      'items-block'
    );

    assert.equal(
      inventory.totalQuantity,
      23
    );

    assert.deepEqual(
      inventory.items.map(item => [
        item.pageId,
        item.quantity
      ]),
      [
        ['rapier', 3],
        ['arrows', 20]
      ]
    );
  }
);


test(
  'InventoryModel supports add, update quantity and remove operations',
  () => {

    const initial =
      createInventoryModel();

    const withItem =
      addInventoryItem(
        initial,
        {
          pageId: 'potion',
          title: 'Зелье',
          quantity: '2'
        }
      );

    assert.equal(
      withItem.items[0].quantity,
      2
    );

    const updated =
      updateInventoryItemQuantity(
        withItem,
        'potion',
        5
      );

    assert.equal(
      updated.items[0].quantity,
      5
    );

    const removed =
      removeInventoryItem(
        updated,
        'potion'
      );

    assert.equal(
      removed.items.length,
      0
    );
  }
);


test(
  'CharacterModel exposes normalized inventory as a submodel',
  () => {

    const character =
      createCharacterModel({
        inventory: {
          items: [
            {
              pageId: 'rope',
              title: 'Веревка',
              quantity: '1'
            }
          ],
          source: 'items-block'
        }
      });

    assert.deepEqual(
      getCharacterInventory(
        character
      ),
      {
        kind: 'InventoryModel',
        version: 1,
        source: 'items-block',
        items: [
          {
            pageId: 'rope',
            title: 'Веревка',
            quantity: 1,
            source: 'manual'
          }
        ],
        totalQuantity: 1
      }
    );
  }
);
