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
            createPageFromTemplate,
            deletePageTemplate,
            getPageTemplates,
            savePageAsTemplate
          } = await import('/js/templates/pageTemplateStorage.js');

          const setupFakeWorkspace =
            nextState => {

              nextState.__testWrittenFiles =
                [];

              nextState.workspaceHandle = {
                async getDirectoryHandle() {

                  return {
                    async getFileHandle(name) {

                      return {
                        name,
                        async createWritable() {

                          return {
                            async write(content) {

                              nextState.__testWrittenFiles.push({
                                name,
                                content: String(content)
                              });
                            },
                            async close() {}
                          };
                        }
                      };
                    }
                  };
                }
              };
            };

          setupFakeWorkspace(
            state
          );

          localStorage.clear();

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
            savePageAsTemplate(
              sourcePage
            );

          const templatesAfterSave =
            getPageTemplates();

          const createdPage =
            await createPageFromTemplate(
              template,
              'parent-folder'
            );

          deletePageTemplate(
            template.id
          );

          return {
            templatesAfterSaveCount: templatesAfterSave.length,
            templatesAfterDeleteCount: getPageTemplates().length,
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
    ).toBe(
      1
    );

    expect(
      result.templatesAfterDeleteCount
    ).toBe(
      0
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
    ).toHaveLength(
      2
    );
  }
);
