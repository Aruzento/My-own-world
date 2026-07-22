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
  'schema-recovery-fallback-renders-grouped-malformed-workspace-issues',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            renderWorkspaceRecoveryEditor
          } = await import('/js/editor/editor.js');

          const {
            validateWorkspaceSnapshot
          } = await import('/js/schema/workspaceSchema.js');

          const {
            createWorkspaceRecoveryReport
          } = await import('/js/schema/schemaRecovery.js');

          const report =
            createWorkspaceRecoveryReport(
              validateWorkspaceSnapshot({
                pages: [
                  null,
                  {
                    id:
                      'partial-page',
                    title:
                      'Partial Page',
                    parent:
                      null,
                    tags:
                      'broken-tags',
                    aliases:
                      'broken-aliases'
                  },
                  {
                    id:
                      'orphan-child',
                    title:
                      'Orphan Child',
                    parent:
                      'missing-parent',
                    tags:
                      [],
                    aliases:
                      [],
                    pageRecordStatus: {
                      schemaVersionMissing:
                        true
                    }
                  }
                ],
                templates: {
                  version:
                    1,
                  templates:
                    'not-an-array'
                },
                assetReferences: [
                  {
                    id:
                      'asset-without-path',
                    type:
                      'image',
                    owner: {
                      pageId:
                        'partial-page'
                    }
                  }
                ]
              })
            );

          renderWorkspaceRecoveryEditor(
            report
          );

          return {
            groupCount:
              document.querySelectorAll('.workspace-recovery-group').length,
            actionCodes:
              [...document.querySelectorAll('.workspace-recovery-item strong')]
                .map(node =>
                  node.textContent
                ),
            summaryText:
              document.querySelector('.workspace-recovery-summary')
                ?.textContent || '',
            hasAssetGroup:
              document.body.textContent.includes(
                'Assets'
              ),
            hasTemplateGroup:
              document.body.textContent.includes(
                'template.invalid_templates'
              ),
            injectedRuntimeImages:
              document.querySelectorAll('.workspace-recovery-item img').length
          };
        }
      );

    expect(
      result.groupCount
    ).toBeGreaterThanOrEqual(
      5
    );

    expect(
      result.actionCodes
    ).toEqual(
      expect.arrayContaining([
        'page.missing_id',
        'page.invalid_tags',
        'page.invalid_aliases',
        'page.broken_parent',
        'template.invalid_templates',
        'asset.missing_path'
      ])
    );

    expect(
      result.summaryText
    ).toContain(
      '6'
    );

    expect(
      result.hasAssetGroup
    ).toBe(
      true
    );

    expect(
      result.hasTemplateGroup
    ).toBe(
      true
    );

    expect(
      result.injectedRuntimeImages
    ).toBe(
      0
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


test(
  'workspace-diagnostics-recovery-ui-groups-and-repairs-after-backup',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const popup =
            document.createElement('div');

          document.body.appendChild(
            popup
          );

          const pages = [
            {
              id:
                'legacy-page',
              title:
                'Legacy Page',
              parent:
                null,
              tags:
                [],
              aliases:
                [],
              pageRecordStatus: {
                schemaVersionMissing:
                  true
              }
            },
            {
              id:
                'orphan-child',
              title:
                'Orphan Child',
              parent:
                'missing-parent',
              tags:
                [],
              aliases:
                []
            }
          ];

          let backupCalls =
            0;

          let repairCalls =
            0;

          let repairDone;

          const repairPromise =
            new Promise(resolve => {

              repairDone =
                resolve;
            });

          const {
            renderWorkspaceDiagnosticsPanel
          } = await import(
            '/js/ui/workspaceDiagnosticsPanel.js'
          );

          await renderWorkspaceDiagnosticsPanel(
            popup,
            {
              hasWorkspace:
                true,
              canWriteWorkspace:
                true,
              autoRun:
                true,
              pages,
              workspacePath:
                'Test workspace',
              listAssetPaths:
                async () => [],
              backupStatus: {
                backups:
                  [],
                incomplete:
                  []
              },
              createRecoveryBackup:
                async () => {

                  backupCalls +=
                    1;

                  return {
                    id:
                      'backup-schema-ui'
                  };
                },
              applyRecoveryPageParent:
                async (pageRecord, parentId) => {

                  repairCalls +=
                    1;

                  pageRecord.parent =
                    parentId;
                },
              onRecoveryRepairComplete:
                repairDone
            }
          );

          const beforeText =
            popup.textContent;

          popup
            .querySelector('.app-workspace-recovery-repair-button')
            ?.click();

          await repairPromise;

          await new Promise(resolve =>
            setTimeout(
              resolve,
              0
            )
          );

          return {
            beforeText,
            afterText:
              popup.textContent,
            backupCalls,
            repairCalls,
            parent:
              pages[1].parent
          };
        }
      );

    expect(
      result.beforeText
    ).toContain(
      'Legacy metadata'
    );

    expect(
      result.beforeText
    ).toContain(
      'Создать backup и исправить безопасное'
    );

    expect(
      result.backupCalls
    ).toBe(
      1
    );

    expect(
      result.repairCalls
    ).toBe(
      1
    );

    expect(
      result.parent
    ).toBe(
      null
    );

    expect(
      result.afterText
    ).toContain(
      'Автоматических безопасных действий нет'
    );
  }
);


test(
  'workspace-diagnostics-recovery-ui-stops-repair-when-backup-fails',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const popup =
            document.createElement('div');

          document.body.appendChild(
            popup
          );

          const pages = [
            {
              id:
                'orphan-child',
              title:
                'Orphan Child',
              parent:
                'missing-parent',
              tags:
                [],
              aliases:
                []
            }
          ];

          let backupCalls =
            0;

          let repairCalls =
            0;

          const {
            renderWorkspaceDiagnosticsPanel
          } = await import(
            '/js/ui/workspaceDiagnosticsPanel.js'
          );

          await renderWorkspaceDiagnosticsPanel(
            popup,
            {
              hasWorkspace:
                true,
              canWriteWorkspace:
                true,
              autoRun:
                true,
              pages,
              workspacePath:
                'Test workspace',
              listAssetPaths:
                async () => [],
              backupStatus: {
                backups:
                  [],
                incomplete:
                  []
              },
              createRecoveryBackup:
                async () => {

                  backupCalls +=
                    1;

                  throw new Error(
                    'backup unavailable'
                  );
                },
              applyRecoveryPageParent:
                async pageRecord => {

                  repairCalls +=
                    1;

                  pageRecord.parent =
                    null;
                }
            }
          );

          popup
            .querySelector('.app-workspace-recovery-repair-button')
            ?.click();

          await new Promise((resolve, reject) => {

            const startedAt =
              Date.now();

            const tick =
              () => {

                if (popup.textContent.includes('backup unavailable')) {

                  resolve();
                  return;
                }

                if (Date.now() - startedAt > 2000) {

                  reject(
                    new Error('repair status did not update')
                  );
                  return;
                }

                setTimeout(
                  tick,
                  20
                );
              };

            tick();
          });

          return {
            text:
              popup.textContent,
            backupCalls,
            repairCalls,
            parent:
              pages[0].parent
          };
        }
      );

    expect(
      result.text
    ).toContain(
      'backup unavailable'
    );

    expect(
      result.backupCalls
    ).toBe(
      1
    );

    expect(
      result.repairCalls
    ).toBe(
      0
    );

    expect(
      result.parent
    ).toBe(
      'missing-parent'
    );
  }
);
