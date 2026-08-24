import {
  expect,
  test
} from '@playwright/test';


test(
  'asset-health-panel-reports-broken-and-orphan-references',
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

          const {
            renderAssetHealthPanel
          } = await import(
            '/js/ui/assetHealthPanel.js'
          );

          const deletedPaths =
            [];

          const backupReasons =
            [];

          await renderAssetHealthPanel(
            popup,
            {
              hasWorkspace: true,
              pages: [
                {
                  id: 'page-1',
                  title: 'Карта замка',
                  type: 'campaignMap',
                  body: `
                    <div data-map-asset="assets/maps/ok.png"></div>
                    <img data-asset="assets/portraits/missing.png">
                  `
                }
              ],
              listAssetPaths: async () => [
                'assets/maps/ok.png',
                'assets/audio/orphan.mp3'
              ],
              createBackup: async input => {

                backupReasons.push(
                  input.reason
                );
              },
              deleteAssetPath: async path => {

                deletedPaths.push(
                  path
                );
              }
            }
          );

          popup
            .querySelector('.app-asset-health-primary')
            .click();

          await new Promise(resolve =>
            requestAnimationFrame(() =>
              requestAnimationFrame(resolve)
            )
          );

          const orphanButton =
            popup
              .querySelector('.app-asset-health-delete');

          const rowKindsBeforeDelete =
            [
              ...popup.querySelectorAll('[data-asset-verification-row]')
            ].map(item =>
              item.dataset.assetVerificationRow
            );

          const itemCountBeforeDelete =
            popup
              .querySelectorAll('.app-asset-health-item')
              .length;

          const textBeforeDelete =
            popup.textContent;

          const orphanButtonText =
            orphanButton?.textContent || '';

          orphanButton.click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          const dangerZone =
            popup
              .querySelector('.app-asset-health-confirm')
              ?.dataset.dangerZone || '';

          const confirmText =
            popup
              .querySelector('.app-asset-health-confirm')
              ?.textContent || '';

          popup
            .querySelector('.app-asset-health-danger')
            .click();

          await new Promise(resolve =>
            requestAnimationFrame(() =>
              requestAnimationFrame(resolve)
            )
          );

          return {
            sectionMarker:
              popup
                .querySelector('.app-asset-health-panel')
                ?.dataset.settingsSection || '',
            summaryHealth:
              popup
                .querySelector('.app-asset-health-summary')
                ?.dataset.healthBadge || '',
            rowKinds:
              rowKindsBeforeDelete,
            dangerZone,
            summary:
              popup
                .querySelector('.app-asset-health-summary')
                ?.textContent || '',
            itemCount:
              itemCountBeforeDelete,
            missingPath:
              popup
                .querySelector('[data-asset-verification-row="referenced-missing"] strong')
                ?.textContent || '',
            existingDetails:
              popup
                .querySelector('[data-asset-verification-row="referenced-exists"] span')
                ?.textContent || '',
            orphanButtonText,
            confirmText,
            text:
              textBeforeDelete,
            deletedPaths,
            backupReasons
          };
        }
      );

    expect(
      result.summary
    ).toContain(
      '1'
    );

    expect(
      result.sectionMarker
    ).toBe(
      'assets'
    );

    expect(
      result.summaryHealth
    ).toBe(
      'warning'
    );

    expect(
      result.rowKinds
    ).toEqual(
      [
        'referenced-exists',
        'referenced-missing',
        'orphan-candidate'
      ]
    );

    expect(
      result.dangerZone
    ).toBe(
      'orphan-asset-delete'
    );

    expect(
      result.itemCount
    ).toBe(
      3
    );

    expect(
      result.missingPath
    ).toBe(
      'assets/portraits/missing.png'
    );

    expect(
      result.existingDetails
    ).toContain(
      'Карта замка'
    );

    expect(
      result.orphanButtonText
    ).toBe(
      'Рассмотреть'
    );

    expect(
      result.confirmText
    ).toContain(
      'не доказательство'
    );

    expect(
      result.text
    ).toContain(
      'Кандидат на проверку'
    );

    expect(
      result.text
    ).not.toContain(
      'лишние'
    );

    expect(
      result.text
    ).not.toContain(
      'мусор'
    );

    expect(
      result.deletedPaths
    ).toEqual(
      [
        'assets/audio/orphan.mp3'
      ]
    );

    expect(
      result.backupReasons
    ).toEqual(
      [
        'orphan-assets-delete'
      ]
    );
  }
);


test(
  'asset-health-panel-reports-asset-scan-failure-without-orphan-candidates',
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

          const {
            renderAssetHealthPanel
          } = await import(
            '/js/ui/assetHealthPanel.js'
          );

          await renderAssetHealthPanel(
            popup,
            {
              hasWorkspace: true,
              pages: [
                {
                  id: 'page-1',
                  title: 'Герой',
                  type: 'card',
                  body: '<img data-asset="assets/portraits/hero.png">'
                }
              ],
              listAssetPaths: async () => {

                throw new Error(
                  'assets unavailable'
                );
              }
            }
          );

          popup
            .querySelector('.app-asset-health-primary')
            .click();

          await new Promise(resolve =>
            requestAnimationFrame(() =>
              requestAnimationFrame(resolve)
            )
          );

          return {
            summary:
              popup
                .querySelector('.app-asset-health-summary')
                ?.textContent || '',
            rowKinds:
              [
                ...popup.querySelectorAll('[data-asset-verification-row]')
              ].map(item =>
                item.dataset.assetVerificationRow
              ),
            text:
              popup.textContent
          };
        }
      );

    expect(
      result.summary
    ).toContain(
      'ошибок проверки 1'
    );

    expect(
      result.rowKinds
    ).toEqual(
      [
        'check-failed'
      ]
    );

    expect(
      result.text
    ).toContain(
      'Проверка не завершена'
    );

    expect(
      result.text
    ).toContain(
      'Не удалось прочитать папку assets.'
    );

    expect(
      result.text
    ).not.toContain(
      'Кандидат на проверку'
    );
  }
);


test(
  'workspace-diagnostics-panel-reports-heavy-map-assets-and-slow-operations',
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

          const {
            renderWorkspaceDiagnosticsPanel
          } = await import(
            '/js/ui/workspaceDiagnosticsPanel.js'
          );

          const heavyContent =
            '<p>' + 'x'.repeat(260 * 1024) + '</p>';

          await renderWorkspaceDiagnosticsPanel(
            popup,
            {
              hasWorkspace: true,
              autoRun: true,
              workspacePath: 'X:\\ДНД\\Мастер\\База',
              canWriteWorkspace: true,
              backupStatus: {
                backups: [
                  {
                    id: 'backup-1',
                    reason: 'manual',
                    createdAt: '2026-07-15T10:00:00.000Z'
                  }
                ],
                incomplete: [
                  {
                    id: 'partial-backup'
                  }
                ]
              },
              pendingOperations: [
                {
                  id: 'pending-1',
                  type: 'tree-move'
                }
              ],
              workspaceCheckpoint: {
                ok: false,
                checkedAt: '2026-07-15T10:01:00.000Z',
                schemaIssues: 0,
                treeErrors: 1,
                pendingOperations: 1
              },
              pages: [
                {
                  id: 'map-1',
                  title: 'Большая карта',
                  template: 'campaignMap',
                  body: `
                    <div class="campaign-map-stage"
                      data-map-asset="assets/maps/big.png"
                      data-fog-locked-zones="%5B%7B%22id%22%3A%22fog-1%22%7D%5D"
                      data-layer-state="%5B%7B%22id%22%3A%22layer-1%22%7D%2C%7B%22id%22%3A%22layer-2%22%7D%5D"
                      data-map-music-state="%7B%22normal%22%3A%7B%22tracks%22%3A%5B%7B%22id%22%3A%22track-1%22%7D%5D%7D%7D">
                      <button class="campaign-map-token" data-token-id="t1"></button>
                      <div class="campaign-map-shape" data-shape-id="s1"></div>
                    </div>
                    <img data-asset="assets/missing.png">
                  `
                },
                {
                  id: 'big-note',
                  title: 'Большая заметка',
                  template: 'card',
                  body: heavyContent
                }
              ],
              listAssetPaths: async () => [
                'assets/maps/big.png',
                'assets/audio/theme.mp3',
                'assets/orphan.webp'
              ],
              performanceEvents: [
                {
                  operation: 'campaign-map-presentation-open',
                  durationMs: 1400,
                  status: 'completed'
                }
              ]
            }
          );

          return {
            sectionMarker:
              popup
                .querySelector('.app-workspace-diagnostics-panel')
                ?.dataset.settingsSection || '',
            healthBadges:
              [
                ...popup.querySelectorAll('[data-health-badge]')
              ].map(item =>
                item.dataset.healthBadge
              ),
            text:
              popup.textContent,
            cardCount:
              popup.querySelectorAll(
                '.app-workspace-diagnostics-card'
              ).length,
            statusText:
              popup.querySelector(
                '.app-workspace-diagnostics-section'
              )?.textContent || '',
            warningCount:
              popup.querySelectorAll(
                '.app-workspace-diagnostics-section'
              )[1]?.querySelectorAll(
                '.app-workspace-diagnostics-item'
              ).length || 0
          };
        }
      );

    expect(
      result.cardCount
    ).toBe(
      10
    );

    expect(
      result.sectionMarker
    ).toBe(
      'diagnostics'
    );

    expect(
      result.healthBadges
    ).toEqual(
      expect.arrayContaining([
        'страниц',
        'резервные-копии',
        'операции'
      ])
    );

    expect(
      result.statusText
    ).toContain(
      'X:\\ДНД\\Мастер\\База'
    );

    expect(
      result.statusText
    ).toContain(
      'manual'
    );

    expect(
      result.text
    ).toContain(
      'Большая карта'
    );

    expect(
      result.text
    ).toContain(
      'сломанные ссылки'
    );

    expect(
      result.text
    ).toContain(
      'Кандидаты ассетов'
    );

    expect(
      result.text
    ).toContain(
      'не используемые сейчас'
    );

    expect(
      result.text
    ).toContain(
      'campaign-map-presentation-open'
    );

    expect(
      result.warningCount
    ).toBeGreaterThan(
      0
    );
  }
);


test(
  'workspace-diagnostics-panel-reports-asset-check-failure-without-orphan-warning',
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

          const {
            renderWorkspaceDiagnosticsPanel
          } = await import(
            '/js/ui/workspaceDiagnosticsPanel.js'
          );

          await renderWorkspaceDiagnosticsPanel(
            popup,
            {
              hasWorkspace: true,
              autoRun: true,
              workspacePath: 'X:\\ДНД\\Мастер\\База',
              canWriteWorkspace: true,
              backupStatus: {
                backups: [],
                incomplete: []
              },
              pendingOperations: [],
              pages: [
                {
                  id: 'page-1',
                  title: 'Герой',
                  type: 'card',
                  body: '<img data-asset="assets/portraits/hero.png">'
                }
              ],
              listAssetPaths: async () => {

                throw new Error(
                  'assets unavailable'
                );
              },
              performanceEvents: []
            }
          );

          return {
            text:
              popup.textContent,
            cardValues:
              [
                ...popup.querySelectorAll('.app-workspace-diagnostics-card')
              ].map(card => [
                card.querySelector('span')?.textContent || '',
                card.querySelector('strong')?.textContent || ''
              ])
          };
        }
      );

    expect(
      result.cardValues
    ).toContainEqual(
      [
        'Ошибки проверки ассетов',
        '1'
      ]
    );

    expect(
      result.cardValues
    ).toContainEqual(
      [
        'Кандидаты ассетов',
        '0'
      ]
    );

    expect(
      result.text
    ).toContain(
      'Проверка ассетов не завершена: 1'
    );

    expect(
      result.text
    ).not.toContain(
      'Есть ассеты, не используемые сейчас'
    );
  }
);
