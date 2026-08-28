import {
  expect,
  test
} from '@playwright/test';


async function openBackupSettings(
  page
) {

  await page.locator('#appSettingsBtn').click();

  const popup =
    page.locator('#appSettingsPopup');

  await expect(
    popup
  ).toHaveAttribute(
    'data-settings-ui-migration',
    'settings-center'
  );

  await page
    .locator('[data-settings-category="backup"]')
    .click();

  const backupPage =
    page.locator('[data-settings-page="backup"]');

  await expect(
    backupPage
  ).toBeVisible();

  return {
    popup,
    backupPage
  };
}


async function scanIncompleteBackups(
  backupPage,
  backupId
) {

  await backupPage
    .getByRole(
      'button',
      {
        name:
          'Проверить недособранные'
      }
    )
    .click();

  await expect(
    backupPage.locator(
      `[data-backup-id="${backupId}"]`
    )
  ).toBeVisible();

  const deleteButton =
    backupPage.getByRole(
      'button',
      {
        name:
          'Удалить найденные'
      }
    );

  await expect(
    deleteButton
  ).toBeEnabled();

  return deleteButton;
}


async function seedIncompleteBackupWorkspace(
  page,
  {
    backupId,
    failDelete = false
  }
) {

  await page.evaluate(
    async ({
      backupId,
      failDelete
    }) => {

      const {
        setStorageAdapter
      } = await import('/js/storage/storageAdapter.js');

      const files =
        new Map();

      const directories =
        new Set([
          ''
        ]);

      const operations =
        {
          removeDirectory:
            []
        };

      const flags =
        {
          failDelete
        };

      const backupRoot =
        '.my-own-world-backups';

      const normalize =
        path => String(path || '')
          .replace(/\\/g, '/')
          .replace(/^\/+/, '')
          .replace(/\/+/g, '/');

      const ensureDirectoryPath =
        path => {

          const parts =
            normalize(path)
              .split('/')
              .filter(Boolean);

          let current =
            '';

          for (const part of parts) {

            current =
              current
                ? `${current}/${part}`
                : part;

            directories.add(
              current
            );
          }
        };

      const getParentPath =
        path => {

          const parts =
            normalize(path).split('/');

          parts.pop();

          return parts.join('/');
        };

      const listFiles =
        path => {

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

          return [...entries]
            .sort(([left], [right]) =>
              left.localeCompare(
                right
              )
            )
            .map(([name, kind]) => ({
              name,
              kind
            }));
        };

      const hasBackup =
        id => {

          const backupPath =
            `${backupRoot}/${id}`;

          return directories.has(
            backupPath
          ) ||
          [...files.keys()].some(filePath =>
            filePath === backupPath ||
            filePath.startsWith(`${backupPath}/`)
          );
        };

      const seedIncompleteBackup =
        id => {

          const backupPath =
            `${backupRoot}/${id}`;

          ensureDirectoryPath(
            `${backupPath}/pages`
          );

          files.set(
            `${backupPath}/pages/partial.md`,
            'partial backup data'
          );
        };

      seedIncompleteBackup(
        backupId
      );

      const adapter =
        {
          kind:
            'desktop',
          getWorkspaceRoot() {
            return 'memory-workspace';
          },
          async pickWorkspace() {
            return 'memory-workspace';
          },
          async restoreWorkspace() {
            return 'memory-workspace';
          },
          async ensureDirectory(path) {
            ensureDirectoryPath(
              path
            );
          },
          async getDirectoryHandle(path) {
            return {
              kind:
                'directory',
              path:
                normalize(path)
            };
          },
          async readText(path) {

            const normalized =
              normalize(path);

            if (!files.has(normalized)) {

              throw new Error(
                `File not found: ${path}`
              );
            }

            const value =
              files.get(normalized);

            return typeof value === 'string'
              ? value
              : new TextDecoder().decode(value);
          },
          async writeText(path, content) {

            const normalized =
              normalize(path);

            ensureDirectoryPath(
              getParentPath(normalized)
            );

            files.set(
              normalized,
              String(content)
            );
          },
          async readBinary(path) {

            const text =
              await this.readText(path);

            return new TextEncoder()
              .encode(text)
              .buffer;
          },
          async writeBinary(path, content) {

            const normalized =
              normalize(path);

            ensureDirectoryPath(
              getParentPath(normalized)
            );

            files.set(
              normalized,
              content
            );
          },
          async listFiles(path = '') {
            return listFiles(
              path
            );
          },
          async removeFile(path) {
            files.delete(
              normalize(path)
            );
          },
          async removeDirectory(path) {

            const normalized =
              normalize(path);

            operations.removeDirectory.push(
              normalized
            );

            if (flags.failDelete) {

              throw new Error(
                'Injected backup delete failure'
              );
            }

            for (const filePath of [...files.keys()]) {

              if (
                filePath === normalized ||
                filePath.startsWith(`${normalized}/`)
              ) {

                files.delete(
                  filePath
                );
              }
            }

            for (const directory of [...directories]) {

              if (
                directory &&
                (
                  directory === normalized ||
                  directory.startsWith(`${normalized}/`)
                )
              ) {

                directories.delete(
                  directory
                );
              }
            }
          }
        };

      setStorageAdapter(
        adapter
      );

      window.__nativeConfirmUsed =
        false;

      window.confirm =
        () => {

          window.__nativeConfirmUsed =
            true;

          throw new Error(
            'Native confirm must not be used for Backup delete.'
          );
        };

      window.__backupDeleteConfirmTest =
        {
          setFailDelete(value) {
            flags.failDelete =
              Boolean(value);
          },
          snapshot() {
            return {
              backupExists:
                hasBackup(
                  backupId
                ),
              nativeConfirmUsed:
                window.__nativeConfirmUsed,
              removeDirectory:
                [
                  ...operations.removeDirectory
                ]
            };
          }
        };
    },
    {
      backupId,
      failDelete
    }
  );
}


async function expectBackupStillExists(
  page
) {

  const snapshot =
    await page.evaluate(
      () => window.__backupDeleteConfirmTest.snapshot()
    );

  expect(
    snapshot.backupExists
  ).toBe(
    true
  );

  expect(
    snapshot.nativeConfirmUsed
  ).toBe(
    false
  );

  return snapshot;
}


test(
  'backup-delete-confirmation-uses-app-popup-and-preserves-cancel-escape-close-confirm',
  async ({ page }) => {

    const backupId =
      'backup-incomplete-delete';

    await page.goto(
      '/'
    );

    await seedIncompleteBackupWorkspace(
      page,
      {
        backupId
      }
    );

    const {
      popup,
      backupPage
    } = await openBackupSettings(
      page
    );

    let deleteButton =
      await scanIncompleteBackups(
        backupPage,
        backupId
      );

    const confirm =
      popup.locator(
        '.confirm-popup-modal'
      );

    await deleteButton.click();

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

    await confirm
      .locator('.confirm-popup-cancel')
      .click();

    await expect(
      confirm
    ).toHaveClass(
      /hidden/
    );

    await expectBackupStillExists(
      page
    );

    await deleteButton.click();

    await expect(
      confirm
    ).toBeVisible();

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      confirm
    ).toHaveClass(
      /hidden/
    );

    await expect(
      popup
    ).toBeVisible();

    await expect(
      deleteButton
    ).toBeFocused();

    await expectBackupStillExists(
      page
    );

    await deleteButton.click();

    await expect(
      confirm
    ).toBeVisible();

    await popup.locator('#appSettingsCloseBtn').click();

    await expect(
      confirm
    ).toHaveClass(
      /hidden/
    );

    await expect(
      popup
    ).toBeHidden();

    await expectBackupStillExists(
      page
    );

    const reopened =
      await openBackupSettings(
        page
      );

    deleteButton =
      await scanIncompleteBackups(
        reopened.backupPage,
        backupId
      );

    await deleteButton.click();

    await expect(
      confirm
    ).toBeVisible();

    await confirm
      .locator('.confirm-popup-confirm')
      .click();

    await expect(
      confirm
    ).toHaveClass(
      /hidden/
    );

    await expect(
      reopened.backupPage.locator(
        `[data-backup-id="${backupId}"]`
      )
    ).toHaveCount(
      0
    );

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'Незавершённые резервные копии удалены: 1'
    );

    const snapshot =
      await page.evaluate(
        () => window.__backupDeleteConfirmTest.snapshot()
      );

    expect(
      snapshot
    ).toEqual({
      backupExists:
        false,
      nativeConfirmUsed:
        false,
      removeDirectory:
        [
          '.my-own-world-backups/backup-incomplete-delete'
        ]
    });
  }
);


test(
  'backup-delete-confirmation-reports-delete-failure-without-removing-backup',
  async ({ page }) => {

    const backupId =
      'backup-incomplete-delete-failure';

    await page.goto(
      '/'
    );

    await seedIncompleteBackupWorkspace(
      page,
      {
        backupId,
        failDelete:
          true
      }
    );

    const {
      popup,
      backupPage
    } = await openBackupSettings(
      page
    );

    const deleteButton =
      await scanIncompleteBackups(
        backupPage,
        backupId
      );

    const confirm =
      popup.locator(
        '.confirm-popup-modal'
      );

    await deleteButton.click();

    await expect(
      confirm
    ).toBeVisible();

    await confirm
      .locator('.confirm-popup-confirm')
      .click();

    await expect(
      confirm
    ).toHaveClass(
      /hidden/
    );

    await expect(
      page.locator('#statusbar')
    ).toContainText(
      'Не удалось удалить незавершённые резервные копии'
    );

    await expect(
      deleteButton
    ).toBeEnabled();

    const snapshot =
      await expectBackupStillExists(
        page
      );

    expect(
      snapshot.removeDirectory
    ).toEqual([
      '.my-own-world-backups/backup-incomplete-delete-failure'
    ]);
  }
);
