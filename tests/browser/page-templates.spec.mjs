import {
  expect,
  test
} from '@playwright/test';


// P2 smoke: шаблон можно создать, удалить и использовать для новой карточки.

test(
  'page-template-create-delete-and-create-card',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const { state } =
            await import('/js/state.js');

          const {
            setWorkspaceHandle
          } = await import('/js/stateActions.js');

          const {
            createPageFromTemplate,
            deletePageTemplate,
            getPageTemplates,
            loadPageTemplates,
            searchPageTemplates,
            savePageAsTemplate
          } = await import('/js/templates/pageTemplateStorage.js');

          const setupFakeWorkspace =
            nextState => {

              nextState.__testWrittenFiles =
                [];

              const rootFiles =
                new Map();

              const createWritableFor =
                name => ({
                  async write(content) {

                    const text =
                      String(content);

                    rootFiles.set(
                      name,
                      text
                    );

                    nextState.__testWrittenFiles.push({
                      name,
                      content: text
                    });
                  },
                  async close() {}
                });

              const createDirectoryHandle =
                () => ({
                  async getDirectoryHandle() {

                    return createDirectoryHandle();
                  },
                  async getFileHandle(name) {

                    return {
                      name,
                      async createWritable() {

                        return createWritableFor(
                          name
                        );
                      }
                    };
                  }
                });

              setWorkspaceHandle({
                async getFileHandle(name, options = {}) {

                  if (
                    !rootFiles.has(name) &&
                    !options.create
                  ) {

                    throw new Error('not found');
                  }

                  return {
                    name,
                    async getFile() {

                      return {
                        async text() {

                          return rootFiles.get(name) || '';
                        }
                      };
                    },
                    async createWritable() {

                      return createWritableFor(
                        name
                      );
                    }
                  };
                },
                async getDirectoryHandle() {

                  return createDirectoryHandle();
                }
              });
            };

          setupFakeWorkspace(
            state
          );

          localStorage.clear();

          localStorage.setItem(
            'my-own-world:page-templates',
            JSON.stringify([
              {
                id: 'legacy-template',
                title: 'Legacy NPC',
                createdAt: 1,
                tags: ['card'],
                template: 'card',
                type: 'creature',
                aliases: [],
                body: '<h1>Legacy NPC</h1>'
              }
            ])
          );

          await loadPageTemplates();

          const sourcePage = {
            id: 'source-card',
            title: 'Шаблон NPC',
            type: 'creature',
            template: 'card',
            tags: ['card', 'creature'],
            aliases: [],
            content: `---
id: source-card
parent: null
order: 1
tags: [card, creature]
template: card
type: creature
aliases: []
---

<div class="entity-layout card-shell">
  <h1>Шаблон NPC</h1>
  <div class="rich-text-field">Описание шаблона</div>
</div>
`
          };

          state.pages =
            [
              sourcePage
            ];

          const template =
            await savePageAsTemplate(
              sourcePage
            );

          const templatesAfterSave =
            getPageTemplates();

          const createdPage =
            await createPageFromTemplate(
              template,
              'parent-folder'
            );

          const searchResult =
            searchPageTemplates(
              'NPC'
            );

          await deletePageTemplate(
            template.id
          );

          return {
            templatesAfterSaveCount: templatesAfterSave.length,
            templatesAfterDeleteCount: getPageTemplates().length,
            searchResultCount: searchResult.length,
            createdTitle: createdPage.title,
            createdParent: createdPage.parent,
            createdType: createdPage.type,
            createdTags: createdPage.tags,
            createdContent: createdPage.content,
            writtenFiles: state.__testWrittenFiles
          };
        }
      );

    expect(
      result.templatesAfterSaveCount
    ).toBeGreaterThanOrEqual(
      2
    );

    expect(
      result.templatesAfterDeleteCount
    ).toBeGreaterThanOrEqual(
      1
    );

    expect(
      result.searchResultCount
    ).toBeGreaterThanOrEqual(
      1
    );

    expect(
      result.createdTitle
    ).toBe(
      'Копия1 - Шаблон NPC'
    );

    expect(
      result.createdParent
    ).toBe(
      'parent-folder'
    );

    expect(
      result.createdType
    ).toBe(
      'creature'
    );

    expect(
      result.createdTags
    ).toEqual([
      'card',
      'creature'
    ]);

    expect(
      result.createdContent
    ).toContain(
      '<h1>Копия1 - Шаблон NPC</h1>'
    );

    expect(
      result.writtenFiles
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: '.my-own-world-templates.json'
        })
      ])
    );
  }
);


test(
  'page-template-picker-is-reachable-from-create-menu',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const { state } =
          await import('/js/state.js');

        const {
          setWorkspaceHandle
        } = await import('/js/stateActions.js');

        const {
          loadPageTemplates
        } = await import('/js/templates/pageTemplateStorage.js');

        const {
          renderTree
        } = await import('/js/tree/tree.js');

        const rootFiles =
          new Map();

        const createWritableFor =
          name => ({
            async write(content) {

              rootFiles.set(
                name,
                String(content)
              );
            },
            async close() {}
          });

        const createDirectoryHandle =
          () => ({
            async getDirectoryHandle() {

              return createDirectoryHandle();
            },
            async getFileHandle(name) {

              return {
                name,
                async createWritable() {

                  return createWritableFor(
                    name
                  );
                }
              };
            }
          });

        setWorkspaceHandle({
          async getFileHandle(name, options = {}) {

            if (
              !rootFiles.has(name) &&
              !options.create
            ) {

              throw new Error('not found');
            }

            return {
              name,
              async getFile() {

                return {
                  async text() {

                    return rootFiles.get(name) || '';
                  }
                };
              },
              async createWritable() {

                return createWritableFor(
                  name
                );
              }
            };
          },
          async getDirectoryHandle() {

            return createDirectoryHandle();
          }
        });

        localStorage.clear();

        localStorage.setItem(
          'my-own-world:page-templates',
          JSON.stringify([
            {
              id: 'ui-template',
              title: 'Шаблон NPC',
              createdAt: 1,
              tags: ['card', 'creature'],
              template: 'card',
              type: 'creature',
              aliases: [],
              body: '<div class="entity-layout card-shell"><h1>Шаблон NPC</h1><div class="rich-text-field">Черновик NPC</div></div>'
            }
          ])
        );

        state.pages =
          [];

        state.currentPage =
          null;

        await loadPageTemplates();

        renderTree();
      }
    );

    await page
      .locator('[data-create-page]')
      .first()
      .click();

    await expect(
      page.locator('#createMenu')
    ).toHaveAttribute(
      'data-create-menu-view',
      'root'
    );

    await page
      .locator('#createMenu .create-option')
      .filter({
        hasText:
          'Из шаблона'
      })
      .click();

    await expect(
      page.locator('#createMenu')
    ).toHaveAttribute(
      'data-create-menu-view',
      'templates'
    );

    await expect(
      page.locator('.create-template-search')
    ).toBeVisible();

    await expect(
      page.locator('.create-template-open')
    ).toContainText(
      'Шаблон NPC'
    );

    await expect(
      page.locator('.create-template-open')
    ).toContainText(
      'существо · карточка'
    );

    await expect(
      page.locator('.create-template-open-icon-svg')
    ).toHaveAttribute(
      'data-icon-name',
      'document'
    );

    await expect(
      page.locator('.create-template-delete-icon')
    ).toHaveAttribute(
      'data-icon-name',
      'trash'
    );

    await page
      .locator('.create-template-search')
      .fill(
        'NPC'
      );

    await expect(
      page.locator('.create-template-row')
    ).toHaveCount(
      1
    );

    await page
      .locator('.create-template-open')
      .click();

    await expect(
      page.locator('#createMenu')
    ).toBeHidden();

    const currentPage =
      await page.evaluate(
        async () => {

          const { state } =
            await import('/js/state.js');

          return {
            title:
              state.currentPage?.title,
            type:
              state.currentPage?.type,
            content:
              state.currentPage?.content
          };
        }
      );

    expect(
      currentPage.title
    ).toBe(
      'Копия1 - Шаблон NPC'
    );

    expect(
      currentPage.type
    ).toBe(
      'creature'
    );

    expect(
      currentPage.content
    ).toContain(
      '<h1>Копия1 - Шаблон NPC</h1>'
    );
  }
);
