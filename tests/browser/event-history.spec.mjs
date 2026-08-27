import {
  expect,
  test
} from '@playwright/test';


async function openEventHistory(
  page
) {

  await page.locator('#appToolsBtn').click();

  await page
    .getByRole(
      'button',
      {
        name:
          /Журнал событий/
      }
    )
    .click();

  const popup =
    page.locator('#eventHistoryPopup');

  await expect(
    popup
  ).toHaveAttribute(
    'data-event-history-ui',
    '0.0.1.15.9'
  );

  await expect(
    popup
  ).toHaveAttribute(
    'data-overlay-state',
    'open'
  );

  return popup;
}


async function installEmptyEventWorkspace(
  page
) {

  await page.evaluate(
    async () => {

      const {
        setStorageAdapter
      } = await import('/js/storage/storageAdapter.js');

      const {
        setPages
      } = await import('/js/stateActions.js');

      const {
        createMemoryStorageAdapter
      } = await import('/tests/fixtures/editConflictFixtures.mjs');

      const adapter =
        createMemoryStorageAdapter();

      window.__eventHistoryTestAdapter =
        adapter;

      setStorageAdapter(
        adapter
      );

      setPages(
        []
      );
    }
  );
}


async function installPopulatedEventWorkspace(
  page
) {

  await page.evaluate(
    async () => {

      const {
        setStorageAdapter
      } = await import('/js/storage/storageAdapter.js');

      const {
        setPages
      } = await import('/js/stateActions.js');

      const {
        createRuntimePage,
        createMemoryStorageAdapter
      } = await import('/tests/fixtures/editConflictFixtures.mjs');

      const {
        logDiceRoll
      } = await import('/js/events/diceRollEventLog.js');

      const {
        logPagePropertyResourceChange
      } = await import('/js/events/pagePropertyResourceTransaction.js');

      const adapter =
        createMemoryStorageAdapter();

      setStorageAdapter(
        adapter
      );

      const page =
        createRuntimePage({
          id:
            'stateful-item',
          title:
            'Stateful Item',
          type:
            'item',
          template:
            'card',
          tags:
            [
              'item'
            ],
          body:
            `
              <section class="entity-main">
                <h1>Stateful Item</h1>
                <div
                  class="template-block card-properties-block card-properties-item"
                  data-block-type="properties"
                  data-block-version="1"
                  data-card-type="item"
                  contenteditable="false"
                >
                  <h2 contenteditable="false">Свойства предмета</h2>
                  <div class="card-properties-grid">
                    <label class="card-property-field" data-property-id="gold">
                      <span class="card-property-label">ЗМ</span>
                      <input
                        type="number"
                        data-property-name="gold"
                        data-property-type="number"
                        value="8"
                      >
                    </label>
                  </div>
                </div>
              </section>
            `
        });

      await adapter.writeText(
        page.path,
        page.content
      );

      setPages(
        [
          page
        ]
      );

      await logDiceRoll(
        {
          request:
            {
              formula:
                '2d6 + 3',
              mode:
                'normal',
              criticalPolicy:
                'none'
            },
          transactionId:
            'txn-roll',
          eventId:
            'evt-roll',
          createdAt:
            '2026-08-27T09:00:00.000Z',
          completedAt:
            '2026-08-27T09:00:01.000Z',
          order:
            1,
          label:
            'Проверка ловкости',
          source:
            'browser-test',
          context:
            {
              label:
                'Проверка ловкости'
            }
        },
        {
          storageAdapter:
            adapter,
          randomInt:
            (() => {

              const values =
                [
                  2,
                  5
                ];

              return () => values.shift();
            })()
        }
      );

      await logPagePropertyResourceChange(
        {
          page,
          field:
            'gold',
          after:
            5,
          transactionId:
            'txn-resource',
          eventId:
            'evt-resource',
          createdAt:
            '2026-08-27T09:05:00.000Z',
          completedAt:
            '2026-08-27T09:05:01.000Z',
          order:
            2,
          label:
            'Потратить золото',
          source:
            'browser-test',
          reason:
            'Покупка',
          unit:
            'зм',
          resource:
            {
              kind:
                'page-property',
              id:
                'stateful-item:gold',
              label:
                'Золото'
            }
        },
        {
          storageAdapter:
            adapter
        }
      );

      window.__eventHistoryTestAdapter =
        adapter;
    }
  );
}


test(
  'event-history-renders-empty-state-from-query-api',
  async ({ page }) => {

    const consoleErrors =
      [];

    const pageErrors =
      [];

    page.on(
      'console',
      message => {

        if (message.type() === 'error') {

          consoleErrors.push(
            message.text()
          );
        }
      }
    );

    page.on(
      'pageerror',
      error => pageErrors.push(
        error.message
      )
    );

    await page.goto(
      '/'
    );

    await installEmptyEventWorkspace(
      page
    );

    const popup =
      await openEventHistory(
        page
      );

    await expect(
      popup
    ).toContainText(
      'История пока пустая'
    );

    await expect(
      popup
    ).toContainText(
      '0 из 0 событий'
    );

    await expect(
      popup.getByRole(
        'button',
        {
          name:
            'Обновить журнал событий'
        }
      )
    ).toBeVisible();

    await expect(
      popup.getByRole(
        'button',
        {
          name:
            'Закрыть журнал событий'
        }
      )
    ).toBeVisible();

    expect(
      consoleErrors
    ).toEqual(
      []
    );

    expect(
      pageErrors
    ).toEqual(
      []
    );
  }
);


test(
  'event-history-renders-roll-resource-and-reversal-undo',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installPopulatedEventWorkspace(
      page
    );

    const popup =
      await openEventHistory(
        page
      );

    await expect(
      popup.locator('[data-event-history-item="true"]')
    ).toHaveCount(
      2
    );

    await expect(
      popup
    ).toContainText(
      'Проверка ловкости'
    );

    await expect(
      popup
    ).toContainText(
      'Формула 2d6 + 3; итог 10; 2d6: [2, 5].'
    );

    await expect(
      popup
    ).toContainText(
      'Потратить золото'
    );

    await expect(
      popup
    ).toContainText(
      'Золото: 8 -> 5 зм.'
    );

    await expect(
      popup
        .locator('[data-event-type="roll.performed"]')
        .locator('[data-event-history-undo="true"]')
    ).toHaveCount(
      0
    );

    await popup
      .getByRole(
        'button',
        {
          name:
            'Отменить изменение ресурса'
        }
      )
      .click();

    await expect(
      popup
    ).toContainText(
      'Отмена изменения ресурса'
    );

    await expect(
      popup
    ).toContainText(
      'Отменяет транзакцию txn-resource.'
    );

    await expect(
      popup
    ).toContainText(
      'Записана отмена транзакции txn-resource.'
    );

    await expect(
      popup.locator('[data-event-history-undo="true"]')
    ).toHaveCount(
      0
    );

    const restoredValue =
      await page.evaluate(
        async () => {

          const {
            getPageById
          } = await import('/js/repository/pageRepository.js');

          const {
            readPageNumericPropertyResource
          } = await import('/js/events/pagePropertyResourceTransaction.js');

          return readPageNumericPropertyResource(
            getPageById(
              'stateful-item'
            ),
            {
              field:
                'gold'
            }
          ).value;
        }
      );

    expect(
      restoredValue
    ).toBe(
      8
    );
  }
);


test(
  'event-history-refresh-reloads-durable-log-query',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await installEmptyEventWorkspace(
      page
    );

    const popup =
      await openEventHistory(
        page
      );

    await expect(
      popup
    ).toContainText(
      'История пока пустая'
    );

    await page.evaluate(
      async () => {

        const {
          logDiceRoll
        } = await import('/js/events/diceRollEventLog.js');

        await logDiceRoll(
          {
            request:
              {
                formula:
                  'd100',
                mode:
                  'normal',
                criticalPolicy:
                  'none'
              },
            transactionId:
              'txn-random-table',
            eventId:
              'evt-random-table',
            createdAt:
              '2026-08-27T09:10:00.000Z',
            completedAt:
              '2026-08-27T09:10:01.000Z',
            order:
              3,
            label:
              'Таблица слухов',
            source:
              'browser-test'
          },
          {
            storageAdapter:
              window.__eventHistoryTestAdapter,
            randomInt:
              () => 42
          }
        );
      }
    );

    await popup
      .getByRole(
        'button',
        {
          name:
            'Обновить журнал событий'
        }
      )
      .click();

    await expect(
      popup
    ).toContainText(
      'Таблица слухов'
    );

    await expect(
      popup
    ).toContainText(
      'Формула d100; итог 42; 1d100: [42].'
    );
  }
);
