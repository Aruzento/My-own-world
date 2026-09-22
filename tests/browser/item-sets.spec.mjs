import {
  expect,
  test
} from '@playwright/test';


test(
  'list card contents keep their renderer classes after save and reopen',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            serializePersistentEditorHTML
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            applyBlockSystemContract
          } = await import('/js/editor/blocks/blockContract.js');

          const {
            renderCustomBlocks
          } = await import('/js/editor/customBlocks.js');

          const {
            editor
          } = await import('/js/editor/editorDom.js');

          editor.innerHTML = `
            <main class="entity-main">
              <div
                class="template-block item-set-block"
                data-block-type="items"
                data-block-version="1"
              >
                <h2>Инвентарь</h2>
                <div class="item-set-list">
                  <button
                    class="item-set-chip"
                    type="button"
                    data-page-id="iron-key"
                  >
                    <span class="item-set-title">Железный ключ</span>
                    <label class="item-set-quantity-label">
                      <input
                        class="item-set-quantity"
                        type="text"
                        value="2"
                      >
                    </label>
                  </button>
                </div>
              </div>

              <div
                class="template-block skill-set-block"
                data-block-type="skills"
                data-block-version="1"
              >
                <h2>Навыки</h2>
                <div class="skill-set-list">
                  <button
                    class="skill-set-chip"
                    type="button"
                    data-page-id="stealth"
                  >
                    <span class="skill-set-text">
                      <strong>Скрытность</strong>
                      <small>Тихое перемещение</small>
                    </span>
                  </button>
                </div>
              </div>

              <div
                class="template-block spell-set-block"
                data-block-type="spells"
                data-block-version="1"
              >
                <h2>Заклинания</h2>
                <div class="spell-set-list">
                  <button
                    class="spell-set-chip"
                    type="button"
                    data-page-id="light"
                  >
                    <span class="spell-set-text">
                      <strong>Свет</strong>
                      <small>Освещает пространство</small>
                    </span>
                  </button>
                </div>
              </div>
            </main>
          `;

          applyBlockSystemContract(
            editor
          );

          renderCustomBlocks(
            editor
          );

          const snapshot =
            () => {

              const itemChip =
                editor.querySelector(
                  '.item-set-chip'
                );

              const skillChip =
                editor.querySelector(
                  '.skill-set-chip'
                );

              const spellChip =
                editor.querySelector(
                  '.spell-set-chip'
                );

              return {
                itemDisplay:
                  getComputedStyle(
                    itemChip
                  ).display,
                skillDisplay:
                  getComputedStyle(
                    skillChip
                  ).display,
                spellDisplay:
                  getComputedStyle(
                    spellChip
                  ).display,
                itemClasses:
                  itemChip.className,
                skillClasses:
                  skillChip.className,
                spellClasses:
                  spellChip.className
              };
            };

          const live =
            snapshot();

          const persisted =
            serializePersistentEditorHTML(
              editor
            );

          editor.innerHTML =
            persisted;

          applyBlockSystemContract(
            editor
          );

          renderCustomBlocks(
            editor
          );

          const reopened =
            snapshot();

          editor.innerHTML =
            persisted;

          applyBlockSystemContract(
            editor
          );

          renderCustomBlocks(
            editor
          );

          const restart =
            snapshot();

          editor.innerHTML = `
            <main class="entity-main">
              <div class="template-block" data-block-type="items" data-block-version="1">
                <h2>Старый инвентарь</h2>
                <div>
                  <button type="button" data-page-id="old-key">
                    <span>Старый ключ</span>
                    <label><input type="text" value="3"></label>
                  </button>
                </div>
              </div>
              <div class="template-block" data-block-type="skills" data-block-version="1">
                <h2>Старые навыки</h2>
                <div>
                  <button type="button" data-page-id="old-stealth">
                    <span><strong>Скрытность</strong><small>Старое описание</small></span>
                  </button>
                </div>
              </div>
              <div class="template-block" data-block-type="spells" data-block-version="1">
                <h2>Старые заклинания</h2>
                <div>
                  <button type="button" data-page-id="old-light">
                    <span><strong>Свет</strong><small>Старое описание</small></span>
                  </button>
                </div>
              </div>
            </main>
          `;

          applyBlockSystemContract(
            editor
          );

          renderCustomBlocks(
            editor
          );

          const legacy =
            snapshot();

          const legacyPersisted =
            serializePersistentEditorHTML(
              editor
            );

          return {
            live,
            reopened,
            restart,
            persisted,
            legacy,
            legacyPersisted,
            controls: {
              itemAdd:
                Boolean(
                  editor.querySelector(
                    '.item-set-add-btn[data-runtime="true"]'
                  )
                ),
              skillAdd:
                Boolean(
                  editor.querySelector(
                    '.skill-set-add-btn[data-runtime="true"]'
                  )
                ),
              spellAdd:
                Boolean(
                  editor.querySelector(
                    '.spell-set-add-btn[data-runtime="true"]'
                  )
                ),
              itemRemove:
                Boolean(
                  editor.querySelector(
                    '.item-set-remove[data-runtime="true"]'
                  )
                ),
              skillRemove:
                Boolean(
                  editor.querySelector(
                    '.skill-set-remove[data-runtime="true"]'
                  )
                ),
              spellRemove:
                Boolean(
                  editor.querySelector(
                    '.spell-set-remove[data-runtime="true"]'
                  )
                )
            }
          };
        }
      );

    expect(
      result.persisted
    ).toContain(
      'item-set-block'
    );

    expect(
      result.persisted
    ).toContain(
      'skill-set-block'
    );

    expect(
      result.persisted
    ).toContain(
      'item-set-chip'
    );

    expect(
      result.persisted
    ).toContain(
      'skill-set-chip'
    );

    expect(
      result.persisted
    ).toContain(
      'spell-set-chip'
    );

    expect(
      result.legacyPersisted
    ).toContain(
      'item-set-title'
    );

    expect(
      result.legacyPersisted
    ).toContain(
      'skill-set-text'
    );

    expect(
      result.legacyPersisted
    ).toContain(
      'spell-set-text'
    );

    expect(
      result.reopened
    ).toEqual(
      result.live
    );

    expect(
      result.restart
    ).toEqual(
      result.live
    );

    expect(
      result.legacy
    ).toEqual(
      result.live
    );

    expect(
      result.live
    ).toEqual({
      itemDisplay: 'flex',
      skillDisplay: 'grid',
      spellDisplay: 'grid',
      itemClasses: 'item-set-chip',
      skillClasses: 'skill-set-chip',
      spellClasses: 'spell-set-chip'
    });

    expect(
      result.controls
    ).toEqual({
      itemAdd: true,
      skillAdd: true,
      spellAdd: true,
      itemRemove: true,
      skillRemove: true,
      spellRemove: true
    });
  }
);


async function setupItemCreationBoundaryFixture({
  heroId,
  heroTitle,
  failItemTitle = ''
}) {

  const {
    buildPageRecordContent,
    createRuntimePageFromContent,
    parsePageRecordContent
  } = await import('/js/core/pageRecord.js');

  const {
    setupItemSets
  } = await import('/js/ui/itemSets.js');

  const {
    setStorageAdapter
  } = await import('/js/storage/storage.js');

  const {
    setCurrentPage,
    setPages
  } = await import('/js/stateActions.js');

  const {
    clearPageCommandEvents
  } = await import('/js/storage/storage.js');

  const {
    editor
  } = await import('/js/editor/editorDom.js');

  const normalizePath =
    value => String(value || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/');

  const files =
    new Map();

  const writes =
    [];

  const removals =
    [];

  const createMissingFileError =
    () => {

      const error =
        new Error('not found');

      error.name =
        'NotFoundError';

      return error;
    };

  const adapter = {
    kind:
      'desktop',
    getWorkspaceRoot() {

      return `memory-item-boundary-${heroId}`;
    },
    getFiles() {

      return [
        ...files.entries()
      ];
    },
    getWrites() {

      return [
        ...writes
      ];
    },
    getRemovals() {

      return [
        ...removals
      ];
    },
    async pickWorkspace() {

      return null;
    },
    async restoreWorkspace() {

      return null;
    },
    async ensureDirectory() {},
    async getDirectoryHandle() {

      return {
        async removeEntry(name) {

          const path =
            normalizePath(name);

          if (!files.delete(path)) {

            throw createMissingFileError();
          }
        }
      };
    },
    async readText(path) {

      const key =
        normalizePath(path);

      if (!files.has(key)) {

        throw createMissingFileError();
      }

      return files.get(
        key
      );
    },
    async writeText(path, content) {

      const key =
        normalizePath(path);

      const text =
        String(content);

      writes.push({
        path:
          key,
        content:
          text
      });

      if (
        failItemTitle &&
        key.startsWith('pages/') &&
        text.includes(failItemTitle) &&
        text.includes('type: item')
      ) {

        throw new Error(
          'forced item create write failure'
        );
      }

      files.set(
        key,
        text
      );
    },
    async readBinary() {

      return new ArrayBuffer(0);
    },
    async writeBinary() {},
    async listFiles() {

      return [
        ...files.entries()
      ]
        .filter(([path]) =>
          path.startsWith('pages/')
        )
        .map(([path, content]) => ({
          path,
          name:
            path.split('/').pop(),
          text:
            content
        }));
    },
    async removeFile(path) {

      const key =
        normalizePath(path);

      removals.push(
        key
      );

      if (!files.delete(key)) {

        throw createMissingFileError();
      }
    },
    async removeDirectory() {}
  };

  setStorageAdapter(
    adapter
  );

  clearPageCommandEvents();

  const heroContent =
    buildPageRecordContent({
      id:
        heroId,
      parent:
        null,
      order:
        1,
      tags:
        [
          'card',
          'character'
        ],
      template:
        'card',
      type:
        'character',
      aliases:
        [],
      body:
        `
          <div class="entity-layout card-shell">
            <h1>${heroTitle}</h1>
            <div
              class="template-block item-set-block"
              data-block-type="items"
            >
              <div class="item-set-list"></div>
              <button class="item-set-add-btn" type="button">
                Добавить предмет
              </button>
            </div>
          </div>
        `
    });

  const heroPage =
    createRuntimePageFromContent({
      content:
        heroContent,
      name:
        `${heroId}.md`,
      path:
        `/pages/${heroId}.md`
    });

  files.set(
    `pages/${heroId}.md`,
    heroContent
  );

  setPages([
    heroPage
  ]);

  setCurrentPage(
    heroPage
  );

  editor.innerHTML =
    parsePageRecordContent(
      heroContent
    ).body;

  setupItemSets();

  window.__itemBoundaryAdapter =
    adapter;
}


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


test(
  'item-picker-create-item-uses-page-command-boundary',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      setupItemCreationBoundaryFixture,
      {
        heroId:
          'item-boundary-hero-success',
        heroTitle:
          'Герой с инвентарем'
      }
    );

    await page
      .locator('.item-set-add-btn')
      .click();

    await page
      .locator('.item-set-create-toggle')
      .click();

    await page
      .locator('.item-set-create-title')
      .fill(
        'Success Boundary Item'
      );

    await page
      .locator('.item-set-create-confirm')
      .click();

    await expect(
      page.locator('.item-set-chip .item-set-title')
    ).toContainText(
      'Success Boundary Item'
    );

    const success =
      await page.evaluate(
        async () => {

          const {
            createRuntimePageFromContent
          } = await import('/js/core/pageRecord.js');

          const {
            state
          } = await import('/js/state.js');

          const {
            setPages
          } = await import('/js/stateActions.js');

          const {
            getPageCommandEvents
          } = await import('/js/storage/storage.js');

          const {
            getPageById,
            getPagesByTag,
            getPagesByTitle,
            getPagesByType
          } = await import('/js/repository/pageRepository.js');

          const adapter =
            window.__itemBoundaryAdapter;

          const createdPage =
            getPagesByTitle(
              'Success Boundary Item'
            )[0];

          const durableItemContent =
            createdPage
              ? await adapter.readText(
                createdPage.path
              )
              : '';

          const durableParentContent =
            await adapter.readText(
              '/pages/item-boundary-hero-success.md'
            );

          const chipPageIds =
            [
              ...document.querySelectorAll(
                '.item-set-chip'
              )
            ].map(chip =>
              chip.dataset.pageId
            );

          const runtimeBeforeReload =
            state.pages.map(item => ({
              id:
                item.id,
              title:
                item.title,
              type:
                item.type,
              tags:
                item.tags
            }));

          const reloadedPages =
            adapter.getFiles()
              .filter(([path]) =>
                path.startsWith('pages/')
              )
              .map(([path, content]) =>
                createRuntimePageFromContent({
                  content,
                  name:
                    path.split('/').pop(),
                  path:
                    `/${path}`
                })
              );

          setPages(
            reloadedPages
          );

          const reloadedItem =
            getPagesByTitle(
              'Success Boundary Item'
            )[0];

          return {
            createdPage:
              createdPage
                ? {
                  id:
                    createdPage.id,
                  title:
                    createdPage.title,
                  type:
                    createdPage.type,
                  tags:
                    createdPage.tags,
                  path:
                    createdPage.path
                }
                : null,
            repositoryPageId:
              createdPage
                ? getPageById(createdPage.id)?.id || null
                : null,
            indexTypeIds:
              getPagesByType('item')
                .map(item => item.id),
            indexTagIds:
              getPagesByTag('item')
                .map(item => item.id),
            durableItemContent,
            durableParentContent,
            chipPageIds,
            runtimeBeforeReload,
            reloadedItem:
              reloadedItem
                ? {
                  id:
                    reloadedItem.id,
                  type:
                    reloadedItem.type,
                  tags:
                    reloadedItem.tags
                }
                : null,
            createEvents:
              getPageCommandEvents()
                .filter(event =>
                  event.type === 'create-page' &&
                  createdPage &&
                  event.affectedPages.includes(createdPage.id)
                )
          };
        }
      );

    expect(
      success.createdPage
    ).toEqual(
      expect.objectContaining({
        title:
          'Success Boundary Item',
        type:
          'item',
        tags:
          [
            'card',
            'item'
          ]
      })
    );

    expect(
      success.repositoryPageId
    ).toBe(
      success.createdPage.id
    );

    expect(
      success.indexTypeIds
    ).toContain(
      success.createdPage.id
    );

    expect(
      success.indexTagIds
    ).toContain(
      success.createdPage.id
    );

    expect(
      success.durableItemContent
    ).toContain(
      'type: item'
    );

    expect(
      success.durableItemContent
    ).toContain(
      'tags: [card, item]'
    );

    expect(
      success.durableItemContent
    ).toContain(
      'Success Boundary Item'
    );

    expect(
      success.durableParentContent
    ).toContain(
      `data-page-id="${success.createdPage.id}"`
    );

    expect(
      success.chipPageIds
    ).toEqual([
      success.createdPage.id
    ]);

    expect(
      success.runtimeBeforeReload
        .some(item =>
          item.id === success.createdPage.id &&
          item.type === 'item'
        )
    ).toBe(
      true
    );

    expect(
      success.reloadedItem
    ).toEqual(
      expect.objectContaining({
        id:
          success.createdPage.id,
        type:
          'item',
        tags:
          [
            'card',
            'item'
          ]
      })
    );

    expect(
      success.createEvents
    ).toHaveLength(
      1
    );

    await page.evaluate(
      setupItemCreationBoundaryFixture,
      {
        heroId:
          'item-boundary-hero-failure',
        heroTitle:
          'Герой без проваленного предмета',
        failItemTitle:
          'Failure Boundary Item'
      }
    );

    await page
      .locator('.item-set-add-btn')
      .click();

    await page
      .locator('.item-set-create-toggle')
      .click();

    await page
      .locator('.item-set-create-title')
      .fill(
        'Failure Boundary Item'
      );

    await page
      .locator('.item-set-create-confirm')
      .click();

    const failure =
      await page.evaluate(
        async () => {

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const {
            state
          } = await import('/js/state.js');

          const {
            getPageCommandEvents
          } = await import('/js/storage/storage.js');

          const {
            getPagesByTag,
            getPagesByTitle,
            getPagesByType
          } = await import('/js/repository/pageRepository.js');

          const adapter =
            window.__itemBoundaryAdapter;

          const runtimeGhosts =
            state.pages
              .filter(item =>
                String(item.title || '').includes(
                  'Failure Boundary Item'
                ) ||
                String(item.content || '').includes(
                  'Failure Boundary Item'
                )
              )
              .map(item => ({
                id:
                  item.id,
                title:
                  item.title,
                type:
                  item.type,
                path:
                  item.path
              }));

          const durableGhosts =
            adapter.getFiles()
              .filter(([path, content]) =>
                path.startsWith('pages/') &&
                String(content).includes('Failure Boundary Item')
              )
              .map(([path]) => path);

          const chipPageIds =
            [
              ...document.querySelectorAll(
                '.item-set-chip'
              )
            ].map(chip =>
              chip.dataset.pageId
            );

          const parentContent =
            await adapter.readText(
              '/pages/item-boundary-hero-failure.md'
            );

          return {
            runtimeGhosts,
            durableGhosts,
            repositoryTitleIds:
              getPagesByTitle('Failure Boundary Item')
                .map(item => item.id),
            indexTypeFailureIds:
              getPagesByType('item')
                .filter(item =>
                  String(item.title || '').includes(
                    'Failure Boundary Item'
                  )
                )
                .map(item => item.id),
            indexTagFailureIds:
              getPagesByTag('item')
                .filter(item =>
                  String(item.title || '').includes(
                    'Failure Boundary Item'
                  )
                )
                .map(item => item.id),
            chipPageIds,
            parentHasFailureReference:
              parentContent.includes(
                'Failure Boundary Item'
              ),
            failedCreateEvents:
              getPageCommandEvents()
                .filter(event =>
                  event.type === 'create-page' &&
                  event.status === 'failed'
                ),
            statusText:
              document.getElementById('statusbar')?.textContent || ''
          };
        }
      );

    expect(
      failure.runtimeGhosts
    ).toEqual([]);

    expect(
      failure.durableGhosts
    ).toEqual([]);

    expect(
      failure.repositoryTitleIds
    ).toEqual([]);

    expect(
      failure.indexTypeFailureIds
    ).toEqual([]);

    expect(
      failure.indexTagFailureIds
    ).toEqual([]);

    expect(
      failure.chipPageIds
    ).toEqual([]);

    expect(
      failure.parentHasFailureReference
    ).toBe(
      false
    );

    expect(
      failure.failedCreateEvents
    ).toHaveLength(
      1
    );

    expect(
      failure.statusText
    ).toContain(
      'Не удалось создать предмет'
    );
  }
);
