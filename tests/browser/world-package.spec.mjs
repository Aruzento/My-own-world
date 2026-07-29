import {
  expect,
  test
} from '@playwright/test';


test(
  'world-package-manager-exports-previews-and-imports-page-only-package',
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
      '0.0.1.8.14.5'
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
              )
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
                  '<a href="javascript:alert(1)" onclick="window.__worldPackageUnsafe = true">Unsafe link</a>',
                  '<script>window.__worldPackageUnsafe = true</script>'
                ].join('')
            }
          ],
          assets: [],
          rulePackages: []
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
      .filter({
        hasText:
          'Предпросмотр'
      })
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
      'Импортировано страниц: 1'
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
          tags = ['card']
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
          `<h1>${title}</h1><p>Source body.</p>`
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
            return new TextEncoder().encode(
              await this.readText(path)
            ).buffer;
          },
          async writeBinary(path, content) {
            files.set(
              normalize(path),
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
            ]
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
