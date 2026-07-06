import {
  expect,
  test
} from '@playwright/test';


test(
  'schema-recovery-fallback-renders-blocking-workspace-errors',
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

    await page.goto(
      '/'
    );

    await page.evaluate(
      async () => {

        const {
          renderWorkspaceRecoveryEditor
        } = await import('/js/editor/editor.js');

        renderWorkspaceRecoveryEditor({
          blocking:
            true,
          actions:
            [
              {
                code:
                  'page.missing_id',
                message:
                  'Страница без id не может безопасно сохраняться.',
                repairAction: {
                  label:
                    'Требуется ручная правка',
                  description:
                    'Для этой проблемы пока нет безопасного автоматического исправления.',
                  safety:
                    'manual',
                  requiresBackup:
                    true
                }
              },
              {
                code:
                  'page.broken_parent',
                message:
                  'Родитель страницы не найден.',
                repairAction: {
                  label:
                    'Перенести страницу в корень',
                  description:
                    'После backup можно очистить отсутствующего родителя.',
                  safety:
                    'safe-after-backup',
                  requiresBackup:
                    true
                }
              }
            ]
        });
      }
    );

    await expect(
      page.locator('.empty-editor-page h1')
    ).toBeVisible();

    await expect(
      page.locator('.workspace-recovery-item')
        .first()
    ).toContainText(
      'page.missing_id'
    );

    await expect(
      page.locator('.workspace-recovery-repair')
    ).toContainText([
      'Требуется ручная правка',
      'Перенести страницу в корень'
    ]);

    expect(
      consoleErrors
    ).toEqual(
      []
    );
  }
);


test(
  'schema-recovery-browser-applies-safe-repair-actions-after-backup',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            validateWorkspaceSnapshot
          } = await import('/js/schema/workspaceSchema.js');

          const {
            applyWorkspaceRepairActions,
            createWorkspaceRecoveryReport
          } = await import('/js/schema/schemaRecovery.js');

          const snapshot = {
            pages: [
              {
                id:
                  'child',
                title:
                  'Child',
                parent:
                  'missing',
                tags:
                  [],
                aliases:
                  []
              }
            ]
          };

          const report =
            createWorkspaceRecoveryReport(
              validateWorkspaceSnapshot(
                snapshot
              )
            );

          return applyWorkspaceRepairActions(
            snapshot,
            report.actions,
            {
              backupManifest: {
                id:
                  'backup-browser'
              }
            }
          );
        }
      );

    expect(
      result.repairedSnapshot.pages[0].parent
    ).toBe(
      null
    );

    expect(
      result.appliedActions[0].repairActionId
    ).toBe(
      'detach-page-parent-to-root'
    );
  }
);
