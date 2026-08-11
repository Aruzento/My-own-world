import {
  expect,
  test
} from '@playwright/test';


test(
  'item-set-picker-reads-pages-through-repository-boundary',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            setupItemSets
          } = await import('/js/ui/itemSets.js');

          const {
            state
          } = await import('/js/state.js');

          const {
            setCurrentPage,
            setPages
          } = await import('/js/stateActions.js');

          const waitFrame =
            () => new Promise(resolve =>
              requestAnimationFrame(resolve)
            );

          setupItemSets();

          const currentPage = {
            id:
              'hero',
            title:
              'Герой',
            type:
              'character',
            tags:
              ['card', 'character'],
            aliases:
              [],
            content:
              ''
          };

          const itemByType = {
            id:
              'silver-sword',
            title:
              'Серебряный меч',
            type:
              'item',
            tags:
              ['card'],
            aliases:
              ['Blade'],
            content:
              ''
          };

          const itemByTag = {
            id:
              'lantern',
            title:
              'Лампа',
            type:
              'card',
            tags:
              ['card', 'item'],
            aliases:
              [],
            content:
              ''
          };

          const creature = {
            id:
              'wolf',
            title:
              'Волк',
            type:
              'creature',
            tags:
              ['card', 'creature'],
            aliases:
              [],
            content:
              ''
          };

          setPages([
            currentPage,
            itemByType,
            itemByTag,
            creature
          ]);

          setCurrentPage(
            currentPage
          );

          const block =
            document.createElement('div');

          block.className =
            'template-block item-set-block';

          block.innerHTML = `
            <div class="item-set-list">
              <button
                class="item-set-chip"
                type="button"
                data-page-id="missing-page"
              >
                <span class="item-set-title">Пропавшая страница</span>
              </button>
            </div>
            <button class="item-set-add-btn" type="button">
              Добавить предмет
            </button>
          `;

          document.body.appendChild(
            block
          );

          const addButton =
            block.querySelector(
              '.item-set-add-btn'
            );

          const clickElement =
            element => {

              element.dispatchEvent(
                new MouseEvent(
                  'click',
                  {
                    bubbles:
                      true,
                    cancelable:
                      true
                  }
                )
              );
            };

          clickElement(
            addButton
          );

          await waitFrame();

          const picker =
            document.getElementById(
              'itemSetPicker'
            );

          const getOptionTitles =
            () => [
              ...picker.querySelectorAll(
                '.item-set-option-title'
              )
            ].map(element =>
              element.textContent.trim()
            );

          const initialTitles =
            getOptionTitles();

          const search =
            picker.querySelector(
              '.item-set-search'
            );

          search.value =
            'blade';

          search.dispatchEvent(
            new Event(
              'input',
              {
                bubbles:
                  true
              }
            )
          );

          const aliasSearchTitles =
            getOptionTitles();

          setCurrentPage(
            currentPage
          );

          clickElement(
            block.querySelector(
              '[data-page-id="missing-page"]'
            )
          );

          await waitFrame();

          const currentAfterMissingClick =
            state.currentPage?.id || null;

          const validChip =
            document.createElement('button');

          validChip.type =
            'button';

          validChip.className =
            'item-set-chip';

          validChip.dataset.pageId =
            'silver-sword';

          validChip.textContent =
            'Серебряный меч';

          document.body.appendChild(
            validChip
          );

          clickElement(
            validChip
          );

          await waitFrame();
          await waitFrame();

          const currentAfterValidClick =
            state.currentPage?.id || null;

          setCurrentPage(
            currentPage
          );

          setPages([
            currentPage,
            {
              ...itemByType,
              title:
                'Серебряный меч переименован',
              type:
                'creature',
              tags:
                ['card', 'creature']
            },
            {
              ...itemByTag,
              title:
                'Лампа переименована'
            },
            creature
          ]);

          search.value =
            '';

          search.dispatchEvent(
            new Event(
              'input',
              {
                bubbles:
                  true
              }
            )
          );

          const updatedTitles =
            getOptionTitles();

          return {
            initialTitles,
            aliasSearchTitles,
            currentAfterMissingClick,
            currentAfterValidClick,
            updatedTitles
          };
        }
      );

    expect(
      result.initialTitles
    ).toContain(
      'Лампа'
    );

    expect(
      result.initialTitles
    ).not.toContain(
      'Волк'
    );

    expect(
      result.initialTitles
    ).not.toContain(
      'Герой'
    );

    expect(
      result.aliasSearchTitles
    ).toEqual([
      'Серебряный меч'
    ]);

    expect(
      result.currentAfterMissingClick
    ).toBe(
      'hero'
    );

    expect(
      result.currentAfterValidClick
    ).toBe(
      'silver-sword'
    );

    expect(
      result.updatedTitles
    ).toContain(
      'Лампа переименована'
    );

    expect(
      result.updatedTitles
    ).not.toContain(
      'Серебряный меч переименован'
    );
  }
);
