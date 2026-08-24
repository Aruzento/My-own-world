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

          for (const pageRecord of [
            alphaPage,
            betaPage,
            gammaPage
          ]) {

            files.set(
              pageRecord.path,
              pageRecord.content
            );
          }

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


test(
  'editor-open-save-captures-and-advances-page-base-identity',
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
            openPage,
            saveCurrentPage
          } = await import('/js/editor/editor.js');

          const {
            getCurrentEditorPageBase
          } = await import('/js/editor/editorSessionBase.js');

          const {
            createPageStateIdentityFromContent,
            arePageStateIdentitiesEqual
          } = await import('/js/core/pageRecord.js');

          const files =
            new Map();

          setStorageAdapter({
            kind:
              'memory',
            getWorkspaceHandle() {
              return {
                name:
                  'Editor base identity workspace'
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

          const content =
`---
id: editor-base-page
parent: null
order: 1
tags: []
template: card
type: note
aliases: []
---

<div class="entity-layout card-shell" contenteditable="false">
  <h1>Editor Base</h1>
  <div
    class="rich-text-field"
    contenteditable="true"
    data-persistent-editable="true"
  >Original base</div>
</div>`;

          const pageRecord =
            {
              id:
                'editor-base-page',
              name:
                'editor-base-page.md',
              path:
                '/pages/editor-base-page.md',
              order:
                1,
              title:
                'Editor Base',
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
              content
            };

          files.set(
            pageRecord.path,
            pageRecord.content
          );

          state.pages =
            [
              pageRecord
            ];

          await openPage(
            pageRecord
          );

          const openedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const body =
            editor.querySelector(
              '.rich-text-field'
            );

          body.textContent =
            'Saved base';

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

          await saveCurrentPage();

          const savedContent =
            files.get(
              pageRecord.path
            );

          const advancedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          await openPage(
            pageRecord
          );

          const reopenedContent =
            files.get(
              pageRecord.path
            );

          const reopenedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          return {
            openedMatchesOriginal:
              arePageStateIdentitiesEqual(
                openedBase,
                createPageStateIdentityFromContent(
                  content,
                  {
                    pageId:
                      pageRecord.id
                  }
                )
              ),
            advancedMatchesDurable:
              arePageStateIdentitiesEqual(
                advancedBase,
                createPageStateIdentityFromContent(
                  savedContent,
                  {
                    pageId:
                      pageRecord.id
                  }
                )
              ),
            reopenedMatchesDurable:
              arePageStateIdentitiesEqual(
                reopenedBase,
                createPageStateIdentityFromContent(
                  reopenedContent,
                  {
                    pageId:
                      pageRecord.id
                  }
                )
              ),
            baseChangedAfterSave:
              !arePageStateIdentitiesEqual(
                openedBase,
                advancedBase
              ),
            savedContent
          };
        }
      );

    expect(
      result.openedMatchesOriginal
    ).toBe(
      true
    );

    expect(
      result.advancedMatchesDurable
    ).toBe(
      true
    );

    expect(
      result.reopenedMatchesDurable
    ).toBe(
      true
    );

    expect(
      result.baseChangedAfterSave
    ).toBe(
      true
    );

    expect(
      result.savedContent
    ).toContain(
      'Saved base'
    );
  }
);


test(
  'editor-save-blocks-stale-write-and-keeps-draft-visible',
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
            openPage,
            saveCurrentPage
          } = await import('/js/editor/editor.js');

          const {
            persistPageContentCommand,
            snapshotPageForCommand
          } = await import('/js/storage/storage.js');

          const {
            getCurrentEditorPageBase
          } = await import('/js/editor/editorSessionBase.js');

          const {
            updatePageRecordContent
          } = await import('/js/core/pageRecord.js');

          const files =
            new Map();

          let writeCount =
            0;

          setStorageAdapter({
            kind:
              'memory',
            getWorkspaceHandle() {
              return {
                name:
                  'Editor conflict workspace'
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
              writeCount += 1;
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

          const content =
`---
id: editor-conflict-page
parent: null
order: 1
tags: []
template: card
type: note
aliases: []
---

<div class="entity-layout card-shell" contenteditable="false">
  <h1>Editor Conflict</h1>
  <div
    class="rich-text-field"
    contenteditable="true"
    data-persistent-editable="true"
  >base-a-token</div>
</div>`;

          const pageRecord =
            {
              id:
                'editor-conflict-page',
              name:
                'editor-conflict-page.md',
              path:
                '/pages/editor-conflict-page.md',
              order:
                1,
              title:
                'Editor Conflict',
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
              content
            };

          files.set(
            pageRecord.path,
            pageRecord.content
          );

          state.pages =
            [
              pageRecord
            ];

          await openPage(
            pageRecord
          );

          const openedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          const currentContent =
            updatePageRecordContent(
              pageRecord.content,
              {
                body:
`<div class="entity-layout card-shell" contenteditable="false">
  <h1>Editor Conflict</h1>
  <div
    class="rich-text-field"
    contenteditable="true"
    data-persistent-editable="true"
  >current-b-token</div>
</div>`
              },
              {
                now:
                  '2026-08-24T10:00:00.000Z'
              }
            );

          await persistPageContentCommand({
            page:
              pageRecord,
            content:
              currentContent,
            previousPage:
              snapshotPageForCommand(
                pageRecord
              ),
            reason:
              'browser-current-write',
            expectedBase:
              openedBase
          });

          const writesBeforeStaleSave =
            writeCount;

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const body =
            editor.querySelector(
              '.rich-text-field'
            );

          body.focus();

          body.textContent =
            'stale-c-draft-token';

          const saveResult =
            await saveCurrentPage();

          const writesAfterStaleSave =
            writeCount;

          const visibleDraftAfterFirstConflict =
            body.textContent || '';

          const dialog =
            document.querySelector(
              '.edit-conflict-dialog'
            );

          const openDialog =
            document.querySelector(
              '.edit-conflict-dialog:not(.hidden)'
            );

          const activeAfterOpen =
            document.activeElement?.textContent?.trim() || '';

          const viewButton =
            dialog.querySelector(
              '[data-edit-conflict-view-current]'
            );

          viewButton.click();

          await new Promise(resolve => {

            setTimeout(
              resolve,
              0
            );
          });

          const currentPreviewText =
            dialog
              .querySelector('[data-edit-conflict-versions]')
              ?.textContent || '';

          const minePreviewText =
            dialog
              .querySelector('[data-edit-conflict-mine-text]')
              ?.value || '';

          const returnButton =
            dialog.querySelector(
              '[data-edit-conflict-return]'
            );

          returnButton.click();

          const dialogHiddenAfterReturn =
            dialog.classList.contains(
              'hidden'
            );

          const activeAfterReturn =
            document.activeElement?.textContent || '';

          body.textContent =
            'stale-c-draft-token-again';

          body.dispatchEvent(
            new InputEvent(
              'input',
              {
                bubbles:
                  true,
                inputType:
                  'insertText',
                data:
                  'again'
              }
            )
          );

          await new Promise(resolve => {

            setTimeout(
              resolve,
              650
            );
          });

          const dialogCountAfterRepeatedConflict =
            document.querySelectorAll(
              '.edit-conflict-dialog'
            ).length;

          const openDialogCountAfterRepeatedConflict =
            document.querySelectorAll(
              '.edit-conflict-dialog:not(.hidden)'
            ).length;

          return {
            saveResult:
              {
                writeStatus:
                  saveResult?.writeStatus || '',
                conflict:
                  Boolean(
                    saveResult?.conflict
                  ),
                blocked:
                  Boolean(
                    saveResult?.blocked
                  ),
                written:
                  Boolean(
                    saveResult?.written
                  )
              },
            staleSaveStorageWrites:
              writesAfterStaleSave - writesBeforeStaleSave,
            durableContent:
              files.get(
                pageRecord.path
              ) || '',
            runtimeContent:
              pageRecord.content || '',
            visibleDraft:
              visibleDraftAfterFirstConflict,
            visibleDraftAfterRepeatedAutosave:
              body.textContent || '',
            statusAfterRepeatedAutosave:
              document.querySelector('#statusbar')?.textContent || '',
            dialog:
              {
                exists:
                  Boolean(
                    dialog
                  ),
                open:
                  Boolean(
                    openDialog
                  ),
                role:
                  dialog?.getAttribute('role') || '',
                ariaModal:
                  dialog?.getAttribute('aria-modal') || '',
                labelledby:
                  dialog?.getAttribute('aria-labelledby') || '',
                describedby:
                  dialog?.getAttribute('aria-describedby') || '',
                text:
                  dialog?.textContent || '',
                activeAfterOpen,
                currentPreviewText,
                minePreviewText,
                dialogHiddenAfterReturn,
                activeAfterReturn,
                dialogCountAfterRepeatedConflict,
                openDialogCountAfterRepeatedConflict
              }
          };
        }
      );

    expect(
      result.saveResult.writeStatus
    ).toBe(
      'conflict'
    );

    expect(
      result.saveResult.conflict
    ).toBe(
      true
    );

    expect(
      result.saveResult.blocked
    ).toBe(
      true
    );

    expect(
      result.saveResult.written
    ).toBe(
      false
    );

    expect(
      result.staleSaveStorageWrites
    ).toBe(
      0
    );

    expect(
      result.durableContent
    ).toContain(
      'current-b-token'
    );

    expect(
      result.durableContent
    ).not.toContain(
      'stale-c-draft-token'
    );

    expect(
      result.runtimeContent
    ).toContain(
      'current-b-token'
    );

    expect(
      result.visibleDraft
    ).toBe(
      'stale-c-draft-token'
    );

    expect(
      result.visibleDraftAfterRepeatedAutosave
    ).toBe(
      'stale-c-draft-token-again'
    );

    expect(
      result.dialog.exists
    ).toBe(
      true
    );

    expect(
      result.dialog.open
    ).toBe(
      true
    );

    expect(
      result.dialog.role
    ).toBe(
      'dialog'
    );

    expect(
      result.dialog.ariaModal
    ).toBe(
      'true'
    );

    expect(
      result.dialog.labelledby
    ).toBeTruthy();

    expect(
      result.dialog.describedby
    ).toBeTruthy();

    expect(
      result.dialog.text
    ).toContain(
      'Страница изменилась после того, как вы её открыли'
    );

    expect(
      result.dialog.text
    ).toContain(
      'Ваши текущие изменения не были записаны поверх новой версии.'
    );

    expect(
      result.dialog.text
    ).toContain(
      'Вернуться к своим изменениям'
    );

    expect(
      result.dialog.text
    ).toContain(
      'Скопировать мой черновик'
    );

    expect(
      result.dialog.text
    ).toContain(
      'Загрузить актуальную версию'
    );

    expect(
      result.dialog.activeAfterOpen
    ).toBe(
      'Вернуться к своим изменениям'
    );

    expect(
      result.dialog.currentPreviewText
    ).toContain(
      'current-b-token'
    );

    expect(
      result.dialog.currentPreviewText
    ).not.toContain(
      'stale-c-draft-token'
    );

    expect(
      result.dialog.minePreviewText
    ).toContain(
      'stale-c-draft-token'
    );

    expect(
      result.dialog.dialogHiddenAfterReturn
    ).toBe(
      true
    );

    expect(
      result.dialog.activeAfterReturn
    ).toContain(
      'stale-c-draft-token'
    );

    expect(
      result.statusAfterRepeatedAutosave
    ).toContain(
      'Сохранение остановлено'
    );

    expect(
      result.dialog.dialogCountAfterRepeatedConflict
    ).toBe(
      1
    );

    expect(
      result.dialog.openDialogCountAfterRepeatedConflict
    ).toBe(
      0
    );
  }
);


test(
  'editor-conflict-recovery-reloads-current-after-explicit-confirmation',
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
            setPages
          } = await import('/js/stateActions.js');

          const {
            openPage,
            saveCurrentPage
          } = await import('/js/editor/editor.js');

          const {
            persistPageContentCommand,
            snapshotPageForCommand
          } = await import('/js/storage/storage.js');

          const {
            getCurrentEditorPageBase
          } = await import('/js/editor/editorSessionBase.js');

          const {
            updatePageRecordContent
          } = await import('/js/core/pageRecord.js');

          const files =
            new Map();

          let writeCount =
            0;

          setStorageAdapter({
            kind:
              'memory',
            getWorkspaceHandle() {
              return {
                name:
                  'Editor conflict recovery workspace'
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
              writeCount += 1;
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

          const createBody =
            body => `<div class="entity-layout card-shell" contenteditable="false">
  <h1>Editor Conflict Recovery</h1>
  <div
    class="rich-text-field"
    contenteditable="true"
    data-persistent-editable="true"
  >${body}</div>
</div>`;

          const createContent =
            body => `---
id: editor-conflict-recovery-page
parent: null
order: 1
tags: []
template: card
type: note
aliases: []
---

${createBody(body)}`;

          const pageRecord =
            {
              id:
                'editor-conflict-recovery-page',
              name:
                'editor-conflict-recovery-page.md',
              path:
                '/pages/editor-conflict-recovery-page.md',
              order:
                1,
              title:
                'Editor Conflict Recovery',
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
                  'base-a-token'
                )
            };

          files.set(
            pageRecord.path,
            pageRecord.content
          );

          setPages(
            [
              pageRecord
            ]
          );

          await openPage(
            pageRecord
          );

          const openedBase =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          const currentContent =
            updatePageRecordContent(
              pageRecord.content,
              {
                body:
                  createBody(
                    'current-b-token'
                  )
              },
              {
                now:
                  '2026-08-24T10:00:00.000Z'
              }
            );

          await persistPageContentCommand({
            page:
              pageRecord,
            content:
              currentContent,
            previousPage:
              snapshotPageForCommand(
                pageRecord
              ),
            reason:
              'browser-current-write',
            expectedBase:
              openedBase
          });

          const writesBeforeConflict =
            writeCount;

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const body =
            editor.querySelector(
              '.rich-text-field'
            );

          body.focus();

          body.textContent =
            'stale-c-draft-token';

          const conflictResult =
            await saveCurrentPage();

          const writesAfterConflict =
            writeCount;

          const dialog =
            document.querySelector(
              '.edit-conflict-dialog'
            );

          dialog
            .querySelector('[data-edit-conflict-reload-current]')
            .click();

          await new Promise(resolve => {

            setTimeout(
              resolve,
              50
            );
          });

          const draftBeforeConfirm =
            editor.querySelector('.rich-text-field')?.textContent || '';

          const durableBeforeConfirm =
            files.get(
              pageRecord.path
            ) || '';

          const versionsText =
            dialog
              .querySelector('[data-edit-conflict-versions]')
              ?.textContent || '';

          const mineTextBeforeConfirm =
            dialog
              .querySelector('[data-edit-conflict-mine-text]')
              ?.value || '';

          const confirmVisible =
            !dialog
              .querySelector('[data-edit-conflict-confirm]')
              .classList.contains(
                'hidden'
              );

          dialog
            .querySelector('[data-edit-conflict-confirm-reload]')
            .click();

          await waitForEditorText(
            editor,
            'current-b-token'
          );

          const bodyAfterReload =
            editor.querySelector(
              '.rich-text-field'
            );

          const reloadedDraft =
            bodyAfterReload?.textContent || '';

          const baseAfterReload =
            getCurrentEditorPageBase(
              pageRecord.id
            );

          bodyAfterReload.textContent =
            'post-recovery-d-token';

          const saveAfterRecovery =
            await saveCurrentPage();

          return {
            conflictResult:
              {
                writeStatus:
                  conflictResult?.writeStatus || '',
                conflict:
                  Boolean(
                    conflictResult?.conflict
                  ),
                written:
                  Boolean(
                    conflictResult?.written
                  )
              },
            staleWriteCount:
              writesAfterConflict - writesBeforeConflict,
            draftBeforeConfirm,
            durableBeforeConfirm,
            versionsText,
            mineTextBeforeConfirm,
            confirmVisible,
            reloadedDraft,
            baseAfterReload:
              {
                pageId:
                  baseAfterReload?.pageId || '',
                stateHash:
                  baseAfterReload?.stateHash || ''
              },
            saveAfterRecovery:
              {
                conflict:
                  Boolean(
                    saveAfterRecovery?.conflict
                  ),
                written:
                  Boolean(
                    saveAfterRecovery?.written
                  ),
                writeStatus:
                  saveAfterRecovery?.writeStatus || ''
              },
            durableAfterRecovery:
              files.get(
                pageRecord.path
              ) || '',
            finalEditorText:
              editor.querySelector('.rich-text-field')?.textContent || '',
            dialogOpenAfterReload:
              Boolean(
                document.querySelector('.edit-conflict-dialog:not(.hidden)')
              )
          };

          async function waitForEditorText(
            root,
            expected
          ) {

            const startedAt =
              Date.now();

            while (Date.now() - startedAt < 1000) {

              if (
                root.querySelector('.rich-text-field')?.textContent === expected
              ) {

                return;
              }

              await new Promise(resolve => {

                setTimeout(
                  resolve,
                  10
                );
              });
            }

            throw new Error(
              `Editor did not show ${expected}`
            );
          }
        }
      );

    expect(
      result.conflictResult.writeStatus
    ).toBe(
      'conflict'
    );

    expect(
      result.conflictResult.conflict
    ).toBe(
      true
    );

    expect(
      result.conflictResult.written
    ).toBe(
      false
    );

    expect(
      result.staleWriteCount
    ).toBe(
      0
    );

    expect(
      result.confirmVisible
    ).toBe(
      true
    );

    expect(
      result.draftBeforeConfirm
    ).toBe(
      'stale-c-draft-token'
    );

    expect(
      result.durableBeforeConfirm
    ).toContain(
      'current-b-token'
    );

    expect(
      result.durableBeforeConfirm
    ).not.toContain(
      'stale-c-draft-token'
    );

    expect(
      result.versionsText
    ).toContain(
      'current-b-token'
    );

    expect(
      result.mineTextBeforeConfirm
    ).toContain(
      'stale-c-draft-token'
    );

    expect(
      result.reloadedDraft
    ).toBe(
      'current-b-token'
    );

    expect(
      result.baseAfterReload.pageId
    ).toBe(
      'editor-conflict-recovery-page'
    );

    expect(
      result.saveAfterRecovery.conflict
    ).toBe(
      false
    );

    expect(
      result.saveAfterRecovery.written
    ).toBe(
      true
    );

    expect(
      result.durableAfterRecovery
    ).toContain(
      'post-recovery-d-token'
    );

    expect(
      result.durableAfterRecovery
    ).not.toContain(
      'stale-c-draft-token'
    );

    expect(
      result.finalEditorText
    ).toBe(
      'post-recovery-d-token'
    );

    expect(
      result.dialogOpenAfterReload
    ).toBe(
      false
    );
  }
);


test(
  'editor-open-page-ignores-stale-async-campaign-map-completion',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            setAssetAdapter
          } = await import('/js/storage/assetAdapter.js');

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
                  'Async open test workspace'
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
              return new TextEncoder()
                .encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
                .buffer;
            },
            async writeBinary() {},
            async listFiles() {
              return [];
            },
            async removeFile() {},
            async removeDirectory() {}
          });

          let releaseSlowAsset;

          const slowAssetReleased =
            new Promise(resolve => {

              releaseSlowAsset =
                resolve;
            });

          setAssetAdapter({
            async importFile() {
              return {
                path:
                  'unused.png',
                url:
                  ''
              };
            },
            async resolveUrl(path) {

              if (path === 'slow-bg.png') {

                await slowAssetReleased;
              }

              return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
            },
            async exists() {
              return true;
            },
            async remove() {},
            async findOrphans() {
              return [];
            }
          });

          const createMapContent =
            title => `---
id: slow-map
parent: null
order: 1
tags: [campaign-map]
template: campaignMap
type: campaignMap
aliases: []
---

<div class="campaign-map-document" data-campaign-map="v1" contenteditable="false">
  <div class="campaign-map-topbar" contenteditable="false">
    <h1 class="campaign-map-title singleline-field" contenteditable="true">${title}</h1>
  </div>
  <div class="campaign-map-stage" data-grid="false" data-fog-mode="draw" data-fog-image="" data-map-asset="slow-bg.png" data-map-music-state="" contenteditable="false">
    <div class="campaign-map-viewport">
      <div class="campaign-map-background"></div>
      <div class="campaign-map-object-layer"></div>
      <canvas class="campaign-map-fog-canvas"></canvas>
    </div>
  </div>
</div>`;

          const createCardContent =
            title => `---
id: fast-card
parent: null
order: 2
tags: []
template: card
type: note
aliases: []
---

<div class="entity-layout card-shell" contenteditable="false">
  <h1>${title}</h1>
  <div class="rich-text-field" contenteditable="true" data-persistent-editable="true">Fast card body</div>
</div>`;

          const slowMap =
            {
              id:
                'slow-map',
              name:
                'slow-map.md',
              path:
                '/pages/slow-map.md',
              parent:
                null,
              order:
                1,
              title:
                'Slow Map',
              template:
                'campaignMap',
              type:
                'campaignMap',
              tags:
                ['campaign-map'],
              aliases:
                [],
              relationships:
                [],
              content:
                createMapContent(
                  'Slow Map'
                )
            };

          const fastCard =
            {
              id:
                'fast-card',
              name:
                'fast-card.md',
              path:
                '/pages/fast-card.md',
              parent:
                null,
              order:
                2,
              title:
                'Fast Card',
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
                createCardContent(
                  'Fast Card'
                )
            };

          state.pages =
            [
              slowMap,
              fastCard
            ];

          renderTree();

          const slowOpen =
            openPage(
              slowMap
            );

          await Promise.resolve();

          await openPage(
            fastCard
          );

          releaseSlowAsset();

          await slowOpen;

          await new Promise(resolve => {

            requestAnimationFrame(
              () => requestAnimationFrame(
                resolve
              )
            );
          });

          const editor =
            document.querySelector(
              '#editorArea'
            );

          const statusbar =
            document.querySelector(
              '#statusbar'
            );

          return {
            currentPageId:
              state.currentPage?.id || '',
            editorTitle:
              editor.querySelector('h1')?.textContent?.trim() || '',
            hasStaleCampaignMap:
              Boolean(
                editor.querySelector(
                  '.campaign-map-document'
                )
              ),
            status:
              statusbar?.textContent || '',
            currentTreeItem:
              document.querySelector(
                '[role="treeitem"][aria-current="page"]'
              )?.textContent || ''
          };
        }
      );

    expect(
      result.currentPageId
    ).toBe(
      'fast-card'
    );

    expect(
      result.editorTitle
    ).toBe(
      'Fast Card'
    );

    expect(
      result.hasStaleCampaignMap
    ).toBe(
      false
    );

    expect(
      result.status
    ).toContain(
      'fast-card.md'
    );

    expect(
      result.status
    ).not.toContain(
      'slow-map.md'
    );

    expect(
      result.currentTreeItem
    ).toContain(
      'Fast Card'
    );
  }
);
