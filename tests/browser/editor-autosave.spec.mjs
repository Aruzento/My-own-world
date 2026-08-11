import {
  expect,
  test
} from '@playwright/test';


test(
  'editor-autosave-flushes-pending-edit-before-page-switch',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            setStorageAdapter
          } = await import('/js/storage/storageAdapter.js');

          const {
            state
          } = await import('/js/state.js');

          const {
            openPage
          } = await import('/js/editor/editor.js');

          const {
            renderTree
          } = await import('/js/tree/tree.js');

          const files =
            new Map();

          setStorageAdapter({
            kind:
              'memory',
            getWorkspaceHandle() {
              return {
                name:
                  'Autosave test workspace'
              };
            },
            setWorkspaceHandle() {},
            async pickWorkspace() {
              return {};
            },
            async restoreWorkspace() {
              return {};
            },
            async ensureDirectory() {},
            async getDirectoryHandle() {
              return {};
            },
            async readText(path) {
              return files.get(path) || '';
            },
            async writeText(path, content) {
              files.set(
                path,
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
            async removeFile() {},
            async removeDirectory() {}
          });

          const createContent =
            (
              id,
              title,
              body
            ) => `---
id: ${id}
parent: null
order: 1
tags: []
template: card
type: note
aliases: []
---

<div class="entity-layout card-shell" contenteditable="false">
  <h1>${title}</h1>
  <div
    class="rich-text-field"
    contenteditable="true"
    data-persistent-editable="true"
  >${body}</div>
</div>`;

          const createPage =
            (
              key,
              title,
              body,
              order
            ) => ({
              id:
                `autosave-${key}`,
              name:
                `autosave-${key}.md`,
              path:
                `/pages/autosave-${key}.md`,
              order,
              title,
              parent:
                null,
              template:
                'card',
              type:
                'note',
              tags:
                [],
              aliases:
                [],
              relationships:
                [],
              content:
                createContent(
                  `autosave-${key}`,
                  title,
                  body
                )
            });

          const alphaPage =
            createPage(
              'alpha',
              'Autosave Alpha',
              'Original alpha body',
              1
            );

          const betaPage =
            createPage(
              'beta',
              'Autosave Beta',
              'Original beta body',
              2
            );

          const gammaPage =
            createPage(
              'gamma',
              'Autosave Gamma',
              'Original gamma body',
              3
            );

          state.pages = [
            alphaPage,
            betaPage,
            gammaPage
          ];

          renderTree();

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const wait =
            ms => new Promise(resolve => {

              setTimeout(
                resolve,
                ms
              );
            });

          const waitForEditorTitle =
            async title => {

              for (let attempt = 0; attempt < 30; attempt += 1) {

                const heading =
                  editor.querySelector(
                    'h1'
                  );

                if (
                  heading?.textContent?.trim() === title
                ) {

                  return true;
                }

                await wait(
                  25
                );
              }

              return false;
            };

          const openAndWait =
            async pageRecord => {

              await openPage(
                pageRecord
              );

              return waitForEditorTitle(
                pageRecord.title
              );
            };

          const getBody =
            () => editor.querySelector(
              '.rich-text-field'
            );

          const editOpenBody =
            text => {

              const body =
                getBody();

              if (!body) return false;

              body.textContent =
                text;

              body.dispatchEvent(
                new InputEvent(
                  'input',
                  {
                    bubbles:
                      true,
                    data:
                      'x',
                    inputType:
                      'insertText'
                  }
                )
              );

              return true;
            };

          const alphaOpened =
            await openAndWait(
              alphaPage
            );

          const alphaEdited =
            editOpenBody(
              'Pending alpha edit saved before navigation'
            );

          const betaOpenedAfterAlpha =
            await openAndWait(
              betaPage
            );

          await wait(
            650
          );

          const alphaReopened =
            await openAndWait(
              alphaPage
            );

          const alphaReopenedText =
            getBody()?.textContent || '';

          const betaOpened =
            await openAndWait(
              betaPage
            );

          const betaEdited =
            editOpenBody(
              'Pending beta edit saved before gamma'
            );

          const gammaOpenedAfterBeta =
            await openAndWait(
              gammaPage
            );

          const gammaEdited =
            editOpenBody(
              'Pending gamma edit saved before alpha'
            );

          const alphaOpenedAfterGamma =
            await openAndWait(
              alphaPage
            );

          await wait(
            650
          );

          return {
            alphaEdited,
            alphaOpened,
            betaOpenedAfterAlpha,
            alphaReopened,
            alphaReopenedText,
            betaOpened,
            betaEdited,
            gammaOpenedAfterBeta,
            gammaEdited,
            alphaOpenedAfterGamma,
            currentPageId:
              state.currentPage?.id || '',
            savedAlpha:
              files.get(
                '/pages/autosave-alpha.md'
              ) || '',
            savedBeta:
              files.get(
                '/pages/autosave-beta.md'
              ) || '',
            savedGamma:
              files.get(
                '/pages/autosave-gamma.md'
              ) || '',
            editorHtml:
              editor.innerHTML
          };
        }
      );

    expect(
      result.alphaOpened,
      result.editorHtml
    ).toBe(
      true
    );

    expect(
      result.alphaEdited
    ).toBe(
      true
    );

    expect(
      result.betaOpenedAfterAlpha,
      result.editorHtml
    ).toBe(
      true
    );

    expect(
      result.savedAlpha
    ).toContain(
      'Pending alpha edit saved before navigation'
    );

    expect(
      result.savedBeta
    ).not.toContain(
      'Pending alpha edit saved before navigation'
    );

    expect(
      result.alphaReopened
    ).toBe(
      true
    );

    expect(
      result.alphaReopenedText
    ).toContain(
      'Pending alpha edit saved before navigation'
    );

    expect(
      result.betaOpened
    ).toBe(
      true
    );

    expect(
      result.betaEdited
    ).toBe(
      true
    );

    expect(
      result.gammaOpenedAfterBeta
    ).toBe(
      true
    );

    expect(
      result.gammaEdited
    ).toBe(
      true
    );

    expect(
      result.alphaOpenedAfterGamma
    ).toBe(
      true
    );

    expect(
      result.currentPageId
    ).toBe(
      'autosave-alpha'
    );

    expect(
      result.savedBeta
    ).toContain(
      'Pending beta edit saved before gamma'
    );

    expect(
      result.savedGamma
    ).toContain(
      'Pending gamma edit saved before alpha'
    );

    expect(
      result.savedAlpha
    ).not.toContain(
      'Pending beta edit saved before gamma'
    );

    expect(
      result.savedAlpha
    ).not.toContain(
      'Pending gamma edit saved before alpha'
    );

    expect(
      result.savedBeta
    ).not.toContain(
      'Pending gamma edit saved before alpha'
    );
  }
);
