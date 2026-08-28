import {
  expect,
  test
} from '@playwright/test';


test(
  'world-package-manager-exports-previews-and-imports-package-contents',
  async ({ page }) => {

    const consoleErrors =
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

    const pageErrors =
      [];

    page.on(
      'pageerror',
      error => {

        pageErrors.push(
          error.message
        );
      }
    );

    await page.goto(
      '/'
    );

    await seedWorldPackageWorkspace(
      page
    );

    await page.locator('#appToolsBtn').click();

    await expect(
      page.locator('#appToolsPopup [data-world-package-tool-action]')
    ).toHaveCount(
      1
    );

    await page.locator('#worldPackageManagerBtn').click();

    const popup =
      page.locator('#worldPackagePopup');

    await expect(
      popup
    ).toBeVisible();

    await expect(
      popup
    ).toHaveAttribute(
      'data-world-package-ui-migration',
      '0.0.1.8.14.7'
    );

    await expect(
      popup.locator('[data-world-package-section]')
    ).toHaveCount(
      3
    );

    const initialLayout =
      await popup.evaluate(
        element => {

          const body =
            element.querySelector('.world-package-body');

          const panels =
            [...element.querySelectorAll('.world-package-panel')];

          return {
            noHorizontalOverflow:
              body
                ? body.scrollWidth <= body.clientWidth + 1
                : false,
            panelCount:
              panels.length,
            maxPanelRadius:
              Math.max(
                ...panels.map(panel =>
                  Number.parseFloat(
                    getComputedStyle(panel).borderRadius
                  )
                )
              )
          };
        }
      );

    expect(
      initialLayout
    ).toMatchObject({
      noHorizontalOverflow:
        true,
      panelCount:
        3
    });

    expect(
      initialLayout.maxPanelRadius
    ).toBeLessThanOrEqual(
      8
    );

    await page
      .locator('[data-world-package-export="branch"]')
      .click();

    await expect(
      page.locator('[data-world-package-file="root-package"]')
    ).toBeVisible();

    const exportedPackage =
      await page.evaluate(
        () => JSON.parse(
          window.__worldPackageTestFiles.get(
            'world-packages/root-package.world-package.json'
          )
        )
      );

    expect(
      exportedPackage.contents.assets
    ).toHaveLength(
      1
    );

    expect(
      Buffer.from(
        exportedPackage.contents.assets[0].payload.bytes,
        'base64'
      )
        .toString(
          'utf8'
        )
    ).toBe(
      'root-portrait'
    );

    await expect(
      page.locator('.world-package-preview')
    ).toHaveAttribute(
      'data-world-package-preview',
      'blocked'
    );

    await expect(
      page.locator('[data-world-package-apply-state]')
    ).toContainText(
      'конфликты'
    );

    await page
      .locator('[data-world-package-conflict-mode="copy"]')
      .click();

    await expect(
      page.locator('.world-package-preview')
    ).toHaveAttribute(
      'data-world-package-preview',
      'ready'
    );

    await expect(
      page.locator('[data-world-package-apply="true"]')
    ).toBeEnabled();

    await page
      .locator('[data-world-package-apply="true"]')
      .click();

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'копий: 2'
    );

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'assets copied: 1'
    );

    const copiedBranch =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          return {
            pageIds:
              state.pages.map(item => item.id),
            copiedRoot:
              state.pages.find(item =>
                item.id === 'root-import'
              ),
            copiedChild:
              state.pages.find(item =>
                item.id === 'child-import'
              ),
            copiedRootContent:
              [...window.__worldPackageTestFiles.values()]
                .find(content =>
                  String(content).includes('id: root-import')
                ),
            copiedAssetText:
              (() => {

                const content =
                  window.__worldPackageTestFiles.get(
                    'assets/portraits/root-import.png'
                  );

                return content instanceof ArrayBuffer
                  ? new TextDecoder().decode(content)
                  : String(content || '');
              })()
          };
        }
      );

    expect(
      copiedBranch.pageIds
    ).toEqual(
      expect.arrayContaining([
        'root-import',
        'child-import'
      ])
    );

    expect(
      copiedBranch.copiedRoot.title
    ).toBe(
      'Root (import)'
    );

    expect(
      copiedBranch.copiedChild.parent
    ).toBe(
      'root-import'
    );

    expect(
      copiedBranch.copiedRootContent
    ).toContain(
      'portraits/root-import.png'
    );

    expect(
      copiedBranch.copiedAssetText
    ).toBe(
      'root-portrait'
    );

    const requiredAssetPackage =
      {
        packageId:
          'missing-required-asset',
        title:
          'Missing Required Asset',
        contents: {
          pages: [
            {
              id:
                'blocked-asset-page',
              title:
                'Blocked Asset Page',
              parent:
                null,
              template:
                'card',
              type:
                'location',
              tags:
                [],
              aliases:
                [],
              body:
                '<h1>Blocked Asset Page</h1>'
            }
          ],
          assets: [
            {
              path:
                'assets/maps/missing-required.png',
              type:
                'mapBackground',
              required:
                true
            }
          ],
          rulePackages: []
        }
      };

    await page
      .locator('.world-package-json-input')
      .fill(
        JSON.stringify(
          requiredAssetPackage,
          null,
          2
        )
      );

    await page
      .locator('[data-world-package-section="import"] .world-package-action')
      .first()
      .click();

    await expect(
      page.locator('.world-package-preview')
    ).toHaveAttribute(
      'data-world-package-preview',
      'blocked'
    );

    await expect(
      page.locator('[data-world-package-apply-state]')
    ).toContainText(
      'required assets missing'
    );

    await expect(
      page.locator('[data-world-package-apply="true"]')
    ).toBeDisabled();

    const externalPackage =
      {
        packageId:
          'external-encounter',
        title:
          'External Encounter',
        contents: {
          pages: [
            {
              id:
                'imported-scene',
              title:
                'Imported Scene',
              parent:
                null,
              template:
                'card',
              type:
                'location',
              tags:
                [
                  'location'
                ],
              aliases:
                [],
              body:
                [
                  '<h1>Imported Scene</h1>',
                  '<p>New scene from package.</p>',
                  '<div data-map-asset="assets/maps/imported-scene.png"></div>',
                  '<a href="javascript:alert(1)" onclick="window.__worldPackageUnsafe = true">Unsafe link</a>',
                  '<script>window.__worldPackageUnsafe = true</script>'
                ].join('')
            }
          ],
          assets: [
            {
              path:
                'assets/portraits/optional-missing.png',
              type:
                'portrait',
              required:
                false
            },
            {
              path:
                'assets/maps/imported-scene.png',
              type:
                'mapBackground',
              required:
                true,
              payload: {
                encoding:
                  'base64',
                mediaType:
                  'image/png',
                bytes:
                  Buffer.from(
                    'scene-image'
                  )
                    .toString(
                      'base64'
                    )
              }
            }
          ],
          rulePackages: [
            {
              packageId:
                'external-rules',
              title:
                'External Rules',
              data: {
                version:
                  1,
                activeRuleIds:
                  [
                    'scene-rule'
                  ],
                rules:
                  [
                    {
                      id:
                        'scene-rule',
                      title:
                        'Scene Rule'
                    }
                  ]
              }
            }
          ]
        }
      };

    await page
      .locator('.world-package-json-input')
      .fill(
        JSON.stringify(
          externalPackage,
          null,
          2
        )
      );

    await page
      .locator('[data-world-package-section="import"] .world-package-action')
      .first()
      .click();

    await expect(
      page.locator('.world-package-preview')
    ).toHaveAttribute(
      'data-world-package-preview',
      'ready'
    );

    await expect(
      page.locator('.world-package-preview')
    ).toContainText(
      'Rules: 1'
    );

    await expect(
      page.locator('.world-package-preview')
    ).toContainText(
      'optional missing'
    );

    await expect(
      page.locator('[data-world-package-apply="true"]')
    ).toBeEnabled();

    await page
      .locator('[data-world-package-apply="true"]')
      .click();

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'rule packages: 1'
    );

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'assets copied: 1'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          return {
            pageIds:
              state.pages.map(page => page.id),
            importedContent:
              window.__worldPackageTestFiles.get(
                window.__worldPackageImportedPath
              ),
            backupFiles:
              [...window.__worldPackageTestFiles.keys()]
                .filter(path =>
                  path.includes('.my-own-world-backups')
                ),
            rulePackageFiles:
              [...window.__worldPackageTestFiles.keys()]
                .filter(path =>
                  path.includes('rule-packages')
                ),
            rulePackageContent:
              window.__worldPackageTestFiles.get(
                'rule-packages/external-rules.rule-package.json'
              ),
            importedAssetText:
              (() => {

                const content =
                  window.__worldPackageTestFiles.get(
                    'assets/maps/imported-scene.png'
                  );

                return content instanceof ArrayBuffer
                  ? new TextDecoder().decode(content)
                  : String(content || '');
              })(),
            packageFiles:
              [...window.__worldPackageTestFiles.keys()]
                .filter(path =>
                  path.includes('world-packages')
                )
          };
        }
      );

    expect(
      result.pageIds
    ).toContain(
      'imported-scene'
    );

    expect(
      result.importedContent
    ).toContain(
      '<h1>Imported Scene</h1>'
    );

    expect(
      result.importedContent
    ).not.toContain(
      'onclick'
    );

    expect(
      result.importedContent
    ).not.toContain(
      'javascript:'
    );

    expect(
      result.importedContent
    ).not.toContain(
      '<script'
    );

    expect(
      result.backupFiles.length
    ).toBeGreaterThan(
      0
    );

    expect(
      result.rulePackageFiles
    ).toContain(
      'rule-packages/external-rules.rule-package.json'
    );

    expect(
      result.rulePackageContent
    ).toContain(
      'scene-rule'
    );

    expect(
      result.importedAssetText
    ).toBe(
      'scene-image'
    );

    expect(
      result.packageFiles.some(path =>
        path.endsWith('root-package.world-package.json')
      )
    ).toBe(
      true
    );

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
  'world-package-manager-uses-page-repository-for-export-and-preview-page-reads',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await seedWorldPackageWorkspace(
      page
    );

    await page.evaluate(
      async () => {

        const {
          state
        } = await import('/js/state.js');

        const {
          rebuildPageRepository
        } = await import('/js/repository/pageRepository.js');

        const repositoryPages =
          state.pages.map(pageRecord => {

            if (pageRecord.id === 'root') {

              return {
                ...pageRecord,
                title:
                  'Repository Root',
                type:
                  'location',
                tags:
                  [
                    'repository-root'
                  ],
                aliases:
                  [
                    'Repo Root'
                  ],
                content:
                  pageRecord.content
                    .replace(
                      '<h1>Root</h1>',
                      '<h1>Repository Root</h1>'
                    )
                    .replace(
                      'type: folder',
                      'type: location'
                    )
                    .replace(
                      'tags: card,folder',
                      'tags: repository-root'
                    )
              };
            }

            if (pageRecord.id === 'child') {

              return {
                ...pageRecord,
                title:
                  'Repository Child',
                tags:
                  [
                    'repository-child'
                  ],
                aliases:
                  [
                    'Repo Child'
                  ],
                content:
                  pageRecord.content
                    .replace(
                      '<h1>Child</h1>',
                      '<h1>Repository Child</h1>'
                    )
                    .replace(
                      'tags: card',
                      'tags: repository-child'
                    )
              };
            }

            return pageRecord;
          });

        rebuildPageRepository(
          repositoryPages
        );
      }
    );

    await page.locator('#appToolsBtn').click();
    await page.locator('#worldPackageManagerBtn').click();

    const popup =
      page.locator('#worldPackagePopup');

    await expect(
      popup
    ).toBeVisible();

    await popup
      .locator('[data-world-package-section="export"] input')
      .fill(
        'Repository Export'
      );

    await popup
      .locator('[data-world-package-export="branch"]')
      .click();

    const exportedPackage =
      await page.evaluate(
        () => JSON.parse(
          window.__worldPackageTestFiles.get(
            'world-packages/repository-export.world-package.json'
          )
        )
      );

    expect(
      exportedPackage.contents.pages.map(packagePage => ({
        id:
          packagePage.id,
        title:
          packagePage.title,
        type:
          packagePage.type,
        tags:
          packagePage.tags
      }))
    ).toEqual([
      {
        id:
          'root',
        title:
          'Repository Root',
        type:
          'location',
        tags:
          [
            'repository-root'
          ]
      },
      {
        id:
          'child',
        title:
          'Repository Child',
        type:
          'note',
        tags:
          [
            'repository-child'
          ]
      }
    ]);

    await popup
      .locator('.world-package-json-input')
      .fill(
        JSON.stringify(
          {
            packageId:
              'repository-title-conflict',
            title:
              'Repository Title Conflict',
            contents: {
              pages: [
                {
                  id:
                    'new-id-with-existing-repository-title',
                  title:
                    'Repository Child',
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
                  body:
                    '<h1>Repository Child</h1>'
                }
              ],
              assets:
                [],
              rulePackages:
                []
            }
          },
          null,
          2
        )
      );

    await popup
      .locator('[data-world-package-section="import"] .world-package-action')
      .first()
      .click();

    await expect(
      popup.locator('.world-package-preview')
    ).toHaveAttribute(
      'data-world-package-preview',
      'blocked'
    );

    await expect(
      popup.locator('[data-world-package-apply-state]')
    ).toContainText(
      'конфликты'
    );

    await popup
      .locator('.world-package-json-input')
      .fill(
        JSON.stringify(
          {
            packageId:
              'repository-missing-safe',
            title:
              'Repository Missing Safe',
            contents: {
              pages: [
                {
                  id:
                    'missing-safe-page',
                  title:
                    'Missing Safe Page',
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
                  body:
                    '<h1>Missing Safe Page</h1>'
                }
              ],
              assets:
                [],
              rulePackages:
                []
            }
          },
          null,
          2
        )
      );

    await popup
      .locator('[data-world-package-section="import"] .world-package-action')
      .first()
      .click();

    await expect(
      popup.locator('.world-package-preview')
    ).toHaveAttribute(
      'data-world-package-preview',
      'ready'
    );
  }
);


test(
  'world-package-delete-confirmation-uses-app-popup-and-preserves-cancel-escape-confirm',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await seedWorldPackageWorkspace(
      page
    );

    await page.evaluate(
      async () => {

        const {
          getStorageAdapter
        } = await import('/js/storage/storageAdapter.js');

        const {
          saveWorldPackageFile
        } = await import('/js/worldPackage/worldPackageStorage.js');

        await saveWorldPackageFile(
          getStorageAdapter(),
          'delete-target',
          {
            packageId:
              'delete-target',
            title:
              'Delete Target',
            contents: {
              pages:
                [],
              assets:
                [],
              rulePackages:
                []
            }
          }
        );

        window.__nativeConfirmUsed =
          false;

        window.confirm =
          () => {

            window.__nativeConfirmUsed =
              true;

            throw new Error(
              'Native confirm must not be used for World Package delete.'
            );
          };
      }
    );

    await page.locator('#appToolsBtn').click();
    await page.locator('#worldPackageManagerBtn').click();

    const popup =
      page.locator('#worldPackagePopup');

    await expect(
      popup
    ).toBeVisible();

    const removeButton =
      popup.locator(
        '[data-world-package-remove-file="delete-target"]'
      );

    await expect(
      removeButton
    ).toBeVisible();

    const confirm =
      popup.locator(
        '.confirm-popup-modal'
      );

    const packageExists =
      async () => page.evaluate(
        () => window.__worldPackageTestFiles.has(
          'world-packages/delete-target.world-package.json'
        )
      );

    await removeButton.click();

    await expect(
      confirm
    ).toBeVisible();

    await expect(
      confirm
    ).toHaveAttribute(
      'data-overlay-lifecycle',
      'popup-manager'
    );

    await expect(
      confirm
    ).toHaveAttribute(
      'data-overlay-kind',
      'dialog'
    );

    await expect(
      confirm
    ).toHaveAttribute(
      'data-overlay-modal',
      'true'
    );

    await expect(
      confirm
    ).toHaveAttribute(
      'aria-modal',
      'true'
    );

    await expect(
      confirm.locator('.confirm-popup-cancel')
    ).toBeFocused();

    await page.keyboard.press(
      'Tab'
    );

    await expect(
      confirm.locator('.confirm-popup-confirm')
    ).toBeFocused();

    await page.keyboard.press(
      'Tab'
    );

    await expect(
      confirm.locator('.confirm-popup-cancel')
    ).toBeFocused();

    await confirm.locator('.confirm-popup-cancel').click();

    await expect(
      confirm
    ).toBeHidden();

    expect(
      await packageExists()
    ).toBe(
      true
    );

    await expect(
      popup
    ).toBeVisible();

    await removeButton.click();

    await expect(
      confirm
    ).toBeVisible();

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      confirm
    ).toBeHidden();

    await expect(
      popup
    ).toBeVisible();

    await expect(
      removeButton
    ).toBeFocused();

    expect(
      await packageExists()
    ).toBe(
      true
    );

    await removeButton.click();

    await expect(
      confirm
    ).toBeVisible();

    await popup.locator('.app-popup-close').click();

    await expect(
      confirm
    ).toBeHidden();

    await expect(
      popup
    ).toBeHidden();

    expect(
      await packageExists()
    ).toBe(
      true
    );

    await page.locator('#appToolsBtn').click();
    await page.locator('#worldPackageManagerBtn').click();

    await expect(
      popup
    ).toBeVisible();

    await expect(
      removeButton
    ).toBeVisible();

    await removeButton.click();

    await expect(
      confirm
    ).toBeVisible();

    await confirm.locator('.confirm-popup-confirm').click();

    await expect(
      confirm
    ).toBeHidden();

    await expect(
      popup.locator('[data-world-package-file="delete-target"]')
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'World Package удален: delete-target'
    );

    expect(
      await packageExists()
    ).toBe(
      false
    );

    expect(
      await page.evaluate(
        () => window.__nativeConfirmUsed
      )
    ).toBe(
      false
    );
  }
);


test(
  'world-package-manager-uses-modal-dialog-focus-contract',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.locator('#appToolsBtn').click();

    const trigger =
      page.locator('#worldPackageManagerBtn');

    await trigger.click();

    const popup =
      page.locator('#worldPackagePopup');

    await expect(
      popup
    ).toBeVisible();

    await expect(
      popup
    ).toHaveAttribute(
      'data-overlay-kind',
      'dialog'
    );

    await expect(
      popup
    ).toHaveAttribute(
      'data-overlay-modal',
      'true'
    );

    await expect(
      popup
    ).toHaveAttribute(
      'aria-modal',
      'true'
    );

    await expect(
      popup
    ).toHaveAttribute(
      'aria-labelledby',
      'worldPackageTitle'
    );

    await expect(
      popup.locator('#worldPackageTitle')
    ).toBeVisible();

    await expect(
      popup.locator('.world-package-form input').first()
    ).toBeFocused();

    await popup.locator('.app-popup-close').focus();

    await page.keyboard.press(
      'Shift+Tab'
    );

    expect(
      await popup.evaluate(element =>
        element.contains(
          document.activeElement
        )
      )
    ).toBe(
      true
    );

    await page.evaluate(
      () => document.getElementById('appToolsBtn')?.focus()
    );

    await page.keyboard.press(
      'Tab'
    );

    expect(
      await popup.evaluate(element =>
        element.contains(
          document.activeElement
        )
      )
    ).toBe(
      true
    );

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      popup
    ).toBeHidden();

    await expect(
      page.locator('#appToolsBtn')
    ).toBeFocused();

    await expect(
      trigger
    ).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  }
);


async function seedWorldPackageWorkspace(
  page
) {

  await page.evaluate(
    async () => {

      const {
        setPages
      } = await import('/js/stateActions.js');

      const {
        setStorageAdapter
      } = await import('/js/storage/storageAdapter.js');

      const {
        state
      } = await import('/js/state.js');

      const files =
        new Map();

      const directories =
        new Set([
          '',
          'pages'
        ]);

      const normalize =
        path => String(path || '')
          .replaceAll('\\', '/')
          .replace(/^\/+/, '')
          .replace(/\/+/g, '/');

      const makePageContent =
        ({
          id,
          title,
          parent = null,
          type = 'note',
          tags = ['card'],
          bodyExtra = ''
        }) => [
          '---',
          `id: ${id}`,
          `parent: ${parent === null ? 'null' : parent}`,
          'order: 1',
          `tags: ${tags.join(',')}`,
          'template: card',
          `type: ${type}`,
          'aliases:',
          '---',
          '',
          `<h1>${title}</h1><p>Source body.</p>${bodyExtra}`
        ].join('\n');

      const adapter =
        {
          kind:
            'browser',
          getWorkspaceHandle() {
            return {
              name:
                'World Package Test'
            };
          },
          async pickWorkspace() {
            return this.getWorkspaceHandle();
          },
          async restoreWorkspace() {
            return this.getWorkspaceHandle();
          },
          async ensureDirectory(path) {
            directories.add(
              normalize(path)
            );
          },
          async getDirectoryHandle(path) {
            directories.add(
              normalize(path)
            );

            return {};
          },
          async readText(path) {
            const normalized =
              normalize(path);

            if (!files.has(normalized)) {
              throw new Error(
                `Missing file ${normalized}`
              );
            }

            return files.get(
              normalized
            );
          },
          async writeText(path, content) {
            const normalized =
              normalize(path);

            directories.add(
              normalized.split('/').slice(0, -1).join('/')
            );

            files.set(
              normalized,
              String(content)
            );

            if (
              normalized.startsWith('pages/') &&
              String(content).includes('imported-scene')
            ) {
              window.__worldPackageImportedPath =
                normalized;
            }
          },
          async readBinary(path) {

            const content =
              await this.readText(path);

            if (content instanceof ArrayBuffer) {

              return content;
            }

            if (ArrayBuffer.isView(content)) {

              return content.buffer.slice(
                content.byteOffset,
                content.byteOffset + content.byteLength
              );
            }

            return new TextEncoder().encode(
              String(content)
            ).buffer;
          },
          async writeBinary(path, content) {
            const normalized =
              normalize(path);

            directories.add(
              normalized.split('/').slice(0, -1).join('/')
            );

            files.set(
              normalized,
              content
            );
          },
          async listFiles(path = '') {
            const normalized =
              normalize(path);

            const prefix =
              normalized
                ? `${normalized}/`
                : '';

            const entries =
              new Map();

            for (const directory of directories) {
              if (!directory.startsWith(prefix)) continue;

              const rest =
                directory.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'directory'
              );
            }

            for (const filePath of files.keys()) {
              if (!filePath.startsWith(prefix)) continue;

              const rest =
                filePath.slice(prefix.length);

              if (!rest || rest.includes('/')) continue;

              entries.set(
                rest,
                'file'
              );
            }

            return [...entries.entries()]
              .map(([name, kind]) => ({
                name,
                kind
              }));
          },
          async removeFile(path) {
            files.delete(
              normalize(path)
            );
          },
          async removeDirectory(path) {
            const normalized =
              normalize(path);

            [...files.keys()]
              .filter(filePath =>
                filePath.startsWith(`${normalized}/`)
              )
              .forEach(filePath =>
                files.delete(
                  filePath
                )
              );
          }
        };

      setStorageAdapter(
        adapter
      );

      const rootContent =
        makePageContent({
          id:
            'root',
          title:
            'Root',
          type:
            'folder',
          tags:
            [
              'card',
              'folder'
            ],
          bodyExtra:
            '<img data-asset="portraits/root.png">'
        });

      const childContent =
        makePageContent({
          id:
            'child',
          title:
            'Child',
          parent:
            'root'
        });

      files.set(
        'pages/root.md',
        rootContent
      );

      files.set(
        'pages/child.md',
        childContent
      );

      directories.add(
        'assets'
      );

      directories.add(
        'assets/portraits'
      );

      files.set(
        'assets/portraits/root.png',
        'root-portrait'
      );

      const pages =
        [
          {
            id:
              'root',
            title:
              'Root',
            parent:
              null,
            order:
              1,
            template:
              'card',
            type:
              'folder',
            tags:
              [
                'card',
                'folder'
              ],
            aliases:
              [],
            name:
              'root.md',
            path:
              '/pages/root.md',
            content:
              rootContent
          },
          {
            id:
              'child',
            title:
              'Child',
            parent:
              'root',
            order:
              2,
            template:
              'card',
            type:
              'note',
            tags:
              [
                'card'
              ],
            aliases:
              [],
            name:
              'child.md',
            path:
              '/pages/child.md',
            content:
              childContent
          }
        ];

      setPages(
        pages
      );

      state.currentPage =
        pages[0];

      window.__worldPackageTestFiles =
        files;

      window.__worldPackageImportedPath =
        '';
    }
  );
}
