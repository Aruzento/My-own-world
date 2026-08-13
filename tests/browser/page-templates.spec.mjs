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
  'page-template-creation-uses-page-command-boundary',
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
            setPages,
            setCurrentPage
          } = await import('/js/stateActions.js');

          const {
            createPageFromTemplate
          } = await import('/js/templates/pageTemplateStorage.js');

          const {
            clearPageCommandEvents,
            getPageCommandEvents,
            setStorageAdapter
          } = await import('/js/storage/storage.js');

          const {
            openPage
          } = await import('/js/editor/editor.js');

          const {
            getPageById,
            getPagesByTag,
            getPagesByTitle,
            getPagesByType
          } = await import('/js/repository/pageRepository.js');

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

          let failMarker =
            '';

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

              return 'memory-template-boundary';
            },
            setFailMarker(marker) {

              failMarker =
                marker || '';
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
                key.startsWith('pages/') &&
                failMarker &&
                text.includes(failMarker)
              ) {

                throw new Error(
                  'forced template create write failure'
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

              return [];
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

          setPages(
            []
          );

          setCurrentPage(
            null
          );

          clearPageCommandEvents();

          const template = {
            id: 'template-boundary-success',
            title: 'Boundary NPC',
            createdAt: 1,
            tags: ['card', 'boundary-tag'],
            template: 'card',
            type: 'creature',
            aliases: ['Template alias must stay on template only'],
            body: '<div class="entity-layout card-shell"><h1>Boundary NPC</h1><p>template-body-marker</p></div>'
          };

          const templateBefore =
            JSON.stringify(
              template
            );

          const createdPage =
            await createPageFromTemplate(
              template,
              'parent-folder'
            );

          await openPage(
            createdPage
          );

          const durableContent =
            await adapter.readText(
              createdPage.path
            );

          const success = {
            id:
              createdPage.id,
            title:
              createdPage.title,
            parent:
              createdPage.parent,
            type:
              createdPage.type,
            tags:
              createdPage.tags,
            aliases:
              createdPage.aliases,
            durableContent,
            currentPageId:
              state.currentPage?.id || null,
            repositoryPageId:
              getPageById(createdPage.id)?.id || null,
            indexTitleIds:
              getPagesByTitle(createdPage.title)
                .map(indexedPage => indexedPage.id),
            indexTypeIds:
              getPagesByType('creature')
                .map(indexedPage => indexedPage.id),
            indexTagIds:
              getPagesByTag('boundary-tag')
                .map(indexedPage => indexedPage.id),
            templateUnchanged:
              JSON.stringify(template) === templateBefore,
            createEvents:
              getPageCommandEvents()
                .filter(event =>
                  event.type === 'create-page' &&
                  event.affectedPages.includes(createdPage.id)
                )
          };

          clearPageCommandEvents();

          const failingTemplate = {
            id: 'template-boundary-failure',
            title: 'Failure NPC',
            createdAt: 2,
            tags: ['card', 'failure-tag'],
            template: 'card',
            type: 'creature',
            aliases: [],
            body: '<div class="entity-layout card-shell"><h1>Failure NPC</h1><p>failure-template-marker</p></div>'
          };

          const failingTemplateBefore =
            JSON.stringify(
              failingTemplate
            );

          adapter.setFailMarker(
            'failure-template-marker'
          );

          let failureError =
            null;

          try {

            await createPageFromTemplate(
              failingTemplate,
              'parent-folder'
            );

          } catch (error) {

            failureError =
              String(error?.message || error);
          }

          adapter.setFailMarker(
            ''
          );

          const failureEvents =
            getPageCommandEvents();

          const failureRuntimeGhosts =
            state.pages
              .filter(candidate =>
                String(candidate.title || '').includes('Failure NPC') ||
                String(candidate.content || '').includes(
                  'failure-template-marker'
                )
              )
              .map(candidate => ({
                id:
                  candidate.id,
                title:
                  candidate.title,
                path:
                  candidate.path
              }));

          const failureDurableGhosts =
            adapter.getFiles()
              .filter(([path, content]) =>
                path.startsWith('pages/') &&
                (
                  String(content).includes('Failure NPC') ||
                  String(content).includes('failure-template-marker')
                )
              )
              .map(([path]) => path);

          const failure = {
            error:
              failureError,
            runtimeGhosts:
              failureRuntimeGhosts,
            durableGhosts:
              failureDurableGhosts,
            repositoryTitleIds:
              getPagesByTitle('Копия1 - Failure NPC')
                .map(indexedPage => indexedPage.id),
            indexTypeFailureIds:
              getPagesByType('creature')
                .filter(indexedPage =>
                  String(indexedPage.title || '').includes('Failure NPC')
                )
                .map(indexedPage => indexedPage.id),
            indexTagFailureIds:
              getPagesByTag('failure-tag')
                .map(indexedPage => indexedPage.id),
            templateUnchanged:
              JSON.stringify(failingTemplate) === failingTemplateBefore,
            failedCreateEvents:
              failureEvents.filter(event =>
                event.type === 'create-page' &&
                event.status === 'failed'
              ),
            removals:
              adapter.getRemovals()
          };

          return {
            success,
            failure,
            writes:
              adapter.getWrites()
          };
        }
      );

    expect(
      result.success.title
    ).toBe(
      'Копия1 - Boundary NPC'
    );

    expect(
      result.success.parent
    ).toBe(
      'parent-folder'
    );

    expect(
      result.success.type
    ).toBe(
      'creature'
    );

    expect(
      result.success.tags
    ).toEqual([
      'card',
      'boundary-tag'
    ]);

    expect(
      result.success.aliases
    ).toEqual([]);

    expect(
      result.success.durableContent
    ).toContain(
      '<h1>Копия1 - Boundary NPC</h1>'
    );

    expect(
      result.success.durableContent
    ).toContain(
      'type: creature'
    );

    expect(
      result.success.durableContent
    ).toContain(
      'boundary-tag'
    );

    expect(
      result.success.currentPageId
    ).toBe(
      result.success.id
    );

    expect(
      result.success.repositoryPageId
    ).toBe(
      result.success.id
    );

    expect(
      result.success.indexTitleIds
    ).toContain(
      result.success.id
    );

    expect(
      result.success.indexTypeIds
    ).toContain(
      result.success.id
    );

    expect(
      result.success.indexTagIds
    ).toContain(
      result.success.id
    );

    expect(
      result.success.templateUnchanged
    ).toBe(
      true
    );

    expect(
      result.success.createEvents
    ).toHaveLength(
      1
    );

    expect(
      result.failure.error
    ).toContain(
      'forced template create write failure'
    );

    expect(
      result.failure.runtimeGhosts
    ).toEqual([]);

    expect(
      result.failure.durableGhosts
    ).toEqual([]);

    expect(
      result.failure.repositoryTitleIds
    ).toEqual([]);

    expect(
      result.failure.indexTypeFailureIds
    ).toEqual([]);

    expect(
      result.failure.indexTagFailureIds
    ).toEqual([]);

    expect(
      result.failure.templateUnchanged
    ).toBe(
      true
    );

    expect(
      result.failure.failedCreateEvents
    ).toHaveLength(
      1
    );

    expect(
      result.failure.removals
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^pages\//)
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


test(
  'page-template-picker-reports-create-failure',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          setPages,
          setCurrentPage
        } = await import('/js/stateActions.js');

        const {
          setStorageAdapter
        } = await import('/js/storage/storage.js');

        const {
          loadPageTemplates
        } = await import('/js/templates/pageTemplateStorage.js');

        const {
          renderTree
        } = await import('/js/tree/tree.js');

        const missingFileError =
          () => {

            const error =
              new Error('not found');

            error.name =
              'NotFoundError';

            return error;
          };

        const files =
          new Map();

        setStorageAdapter({
          kind:
            'desktop',
          getWorkspaceRoot() {

            return 'memory-template-ui-failure';
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
              async removeEntry() {

                throw missingFileError();
              }
            };
          },
          async readText(path) {

            const key =
              String(path || '')
                .replace(/\\/g, '/')
                .replace(/^\/+/, '');

            if (!files.has(key)) {

              throw missingFileError();
            }

            return files.get(
              key
            );
          },
          async writeText(path, content) {

            const key =
              String(path || '')
                .replace(/\\/g, '/')
                .replace(/^\/+/, '');

            if (key.startsWith('pages/')) {

              throw new Error(
                'forced template ui create failure'
              );
            }

            files.set(
              key,
              String(content)
            );
          },
          async readBinary() {

            return new ArrayBuffer(0);
          },
          async writeBinary() {},
          async listFiles() {

            return [];
          },
          async removeFile() {

            throw missingFileError();
          },
          async removeDirectory() {}
        });

        localStorage.clear();

        localStorage.setItem(
          'my-own-world:page-templates',
          JSON.stringify([
            {
              id: 'ui-failure-template',
              title: 'Failure UI Template',
              createdAt: 1,
              tags: ['card'],
              template: 'card',
              type: 'note',
              aliases: [],
              body: '<div class="entity-layout card-shell"><h1>Failure UI Template</h1></div>'
            }
          ])
        );

        setPages(
          []
        );

        setCurrentPage(
          null
        );

        await loadPageTemplates();

        renderTree();
      }
    );

    await page
      .locator('[data-create-page]')
      .first()
      .click();

    await page
      .locator('#createMenu .create-option')
      .filter({
        hasText:
          'Из шаблона'
      })
      .click();

    await page
      .locator('.create-template-open')
      .click();

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'Не удалось создать страницу из шаблона'
    );

    const stateAfterFailure =
      await page.evaluate(
        async () => {

          const { state } =
            await import('/js/state.js');

          return state.pages.map(existingPage => existingPage.title);
        }
      );

    expect(
      stateAfterFailure
    ).toEqual([]);
  }
);
