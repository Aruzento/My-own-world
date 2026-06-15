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
