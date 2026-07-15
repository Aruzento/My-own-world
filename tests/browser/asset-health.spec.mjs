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

          orphanButton.click();

          await new Promise(resolve =>
            requestAnimationFrame(resolve)
          );

          popup
            .querySelector('.app-asset-health-danger')
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
            itemCount:
              popup
                .querySelectorAll('.app-asset-health-item')
                .length,
            missingPath:
              popup
                .querySelector('.app-asset-health-item strong')
                ?.textContent || '',
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
      result.itemCount
    ).toBe(
      1
    );

    expect(
      result.missingPath
    ).toBe(
      'assets/portraits/missing.png'
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
            text:
              popup.textContent,
            cardCount:
              popup.querySelectorAll(
                '.app-workspace-diagnostics-card'
              ).length,
            warningCount:
              popup.querySelectorAll(
                '.app-workspace-diagnostics-section'
              )[0]?.querySelectorAll(
                '.app-workspace-diagnostics-item'
              ).length || 0
          };
        }
      );

    expect(
      result.cardCount
    ).toBe(
      6
    );

    expect(
      result.text
    ).toContain(
      'Большая карта'
    );

    expect(
      result.text
    ).toContain(
      'Broken refs'
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
