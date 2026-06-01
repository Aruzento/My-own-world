import {
  expect,
  test
} from '@playwright/test';


test(
  'popup-manager-closes-by-escape-outside-and-keeps-popup-in-viewport',
  async ({ page }) => {

    await page.setViewportSize({
      width: 720,
      height: 480
    });

    await page.goto(
      '/'
    );

    const result =
      await page.evaluate(
        async () => {

          const {
            registerPopup
          } = await import('/js/ui/popupManager.js');

          const anchor =
            document.createElement('button');

          anchor.textContent =
            'anchor';

          anchor.style.position =
            'fixed';

          anchor.style.right =
            '4px';

          anchor.style.bottom =
            '4px';

          document.body.appendChild(
            anchor
          );

          const popup =
            document.createElement('div');

          popup.className =
            'ui-panel hidden';

          popup.style.position =
            'fixed';

          popup.style.width =
            '340px';

          popup.style.height =
            '260px';

          document.body.appendChild(
            popup
          );

          const controller =
            registerPopup({
              popup,
              close: () => popup.classList.add('hidden'),
              anchors: [anchor],
              key: 'test-popup-lifecycle'
            });

          controller.openNearAnchor(
            anchor,
            {
              fallbackWidth: 340,
              fallbackHeight: 260
            }
          );

          const rect =
            popup.getBoundingClientRect();

          const inside =
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= window.innerWidth &&
            rect.bottom <= window.innerHeight;

          document.dispatchEvent(
            new KeyboardEvent(
              'keydown',
              {
                key: 'Escape',
                bubbles: true
              }
            )
          );

          const closedByEscape =
            popup.classList.contains('hidden');

          controller.openNearAnchor(
            anchor
          );

          document.body.dispatchEvent(
            new PointerEvent(
              'pointerdown',
              {
                bubbles: true,
                clientX: 20,
                clientY: 20
              }
            )
          );

          const closedByOutside =
            popup.classList.contains('hidden');

          return {
            inside,
            closedByEscape,
            closedByOutside,
            zIndex: Number(popup.style.zIndex)
          };
        }
      );

    expect(
      result.inside
    ).toBe(
      true
    );

    expect(
      result.closedByEscape
    ).toBe(
      true
    );

    expect(
      result.closedByOutside
    ).toBe(
      true
    );

    expect(
      result.zIndex
    ).toBeGreaterThan(
      10_000
    );
  }
);


test(
  'popup-triggers-toggle-create-menu-tools-and-campaign-map-popup',
  async ({ page }) => {

    await page.goto(
      '/'
    );

    await page.locator('#newPageBtn').click();

    await expect(
      page.locator('#createMenu')
    ).toBeVisible();

    await page.locator('#newPageBtn').click();

    await expect(
      page.locator('#createMenu')
    ).toBeHidden();

    await page.locator('#appToolsBtn').click();

    await expect(
      page.locator('#appToolsPopup')
    ).toBeVisible();

    await page.locator('#appToolsBtn').click();

    await expect(
      page.locator('#appToolsPopup')
    ).toBeHidden();

    const mapResult =
      await page.evaluate(
        async () => {

          const {
            getMapPopup,
            showMapPopup,
            toggleMapPopupForAnchor
          } = await import('/js/editor/campaignMapPopupController.js');

          const anchor =
            document.createElement('button');

          anchor.className =
            'campaign-fog-btn';

          anchor.textContent =
            'Туман';

          document.body.appendChild(
            anchor
          );

          const controls =
            document.createElement('div');

          controls.className =
            'campaign-map-controls';

          controls.appendChild(
            anchor
          );

          document.body.appendChild(
            controls
          );

          const popup =
            getMapPopup();

          popup.textContent =
            'popup';

          showMapPopup(
            popup,
            anchor,
            'fog'
          );

          await new Promise(resolve => requestAnimationFrame(resolve));

          const opened =
            !popup.classList.contains('hidden');

          const toggled =
            toggleMapPopupForAnchor(
              anchor,
              'fog'
            );

          const closed =
            popup.classList.contains('hidden');

          return {
            opened,
            toggled,
            closed
          };
        }
      );

    expect(
      mapResult
    ).toEqual({
      opened: true,
      toggled: true,
      closed: true
    });
  }
);
