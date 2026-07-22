import {
  expect,
  test
} from '@playwright/test';


test(
  'component-catalogue-exposes-shared-primitives-and-states',
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

    await page.locator('#appToolsBtn').click();

    const toolsPopup =
      page.locator('#appToolsPopup');

    await expect(
      toolsPopup
    ).toBeVisible();

    await expect(
      toolsPopup
    ).toHaveAttribute(
      'data-overlay-lifecycle',
      'popup-manager'
    );

    await expect(
      toolsPopup
    ).toHaveAttribute(
      'data-overlay-state',
      'open'
    );

    await expect(
      page.locator('#appToolsBtn')
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await expect(
      toolsPopup.locator('.mow-button')
    ).toHaveCount(
      4
    );

    await page
      .locator('[data-component-catalogue-open="true"]')
      .click();

    const popover =
      page.locator('#componentCataloguePopover');

    await expect(
      popover
    ).toBeVisible();

    await expect(
      popover
    ).toHaveAttribute(
      'data-state',
      'open'
    );

    await expect(
      popover
    ).toHaveAttribute(
      'data-overlay-lifecycle',
      'popup-manager'
    );

    await expect(
      popover
    ).toHaveAttribute(
      'data-overlay-state',
      'open'
    );

    await expect(
      page.locator('#componentCatalogueBtn')
    ).toHaveAttribute(
      'aria-expanded',
      'true'
    );

    await expect(
      popover.locator('.mow-button')
    ).toHaveCount(
      10
    );

    await expect(
      popover.locator('.mow-button[data-variant="primary"]').first()
    ).toBeFocused();

    await expect(
      popover.locator('.mow-button[data-state="pressed"]')
    ).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await expect(
      popover.locator('.mow-button[disabled]')
    ).toHaveCount(
      2
    );

    await expect(
      popover.locator('.mow-button[data-loading="true"]')
    ).toHaveAttribute(
      'aria-busy',
      'true'
    );

    await expect(
      popover.locator('.mow-icon-button')
    ).toHaveCount(
      9
    );

    await expect(
      popover.locator('.mow-icon-button[aria-pressed="true"]')
    ).toHaveCount(
      2
    );

    await expect(
      popover.locator('.mow-input[aria-invalid="true"]')
    ).toBeVisible();

    await expect(
      popover.locator('.mow-input[readonly]')
    ).toBeVisible();

    await expect(
      popover.locator('.mow-input[disabled]')
    ).toBeVisible();

    await expect(
      popover.locator('.mow-select')
    ).toBeVisible();

    await expect(
      popover.locator('.mow-checkbox')
    ).toBeChecked();

    await expect(
      popover.locator('.mow-segmented [aria-pressed="true"]')
    ).toHaveText(
      '100%'
    );

    await expect(
      popover.locator('.mow-toolbar')
    ).toBeVisible();

    await expect(
      popover.locator('.mow-separator')
    ).toBeVisible();

    await expect(
      popover.locator('.mow-component-catalogue-panel-sample[data-surface="raised"]')
    ).toBeVisible();

    await expect(
      popover.locator('.mow-popover-sample[data-state="open"]')
    ).toBeVisible();

    const primaryButton =
      popover.locator('.mow-button[data-variant="primary"]').first();

    const compactMinHeight =
      await primaryButton.evaluate(
        async element => {

          document.body.dataset.uiScale =
            'compact';

          await new Promise(
            requestAnimationFrame
          );

          return Number.parseFloat(
            getComputedStyle(element).minHeight
          );
        }
      );

    const largeMinHeight =
      await primaryButton.evaluate(
        async element => {

          document.body.dataset.uiScale =
            'large';

          await new Promise(
            requestAnimationFrame
          );

          return Number.parseFloat(
            getComputedStyle(element).minHeight
          );
        }
      );

    expect(
      largeMinHeight
    ).toBeGreaterThan(
      compactMinHeight
    );

    await popover
      .locator('.mow-input')
      .first()
      .focus();

    await expect(
      popover.locator('.mow-input').first()
    ).toBeFocused();

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      popover
    ).toBeHidden();

    await expect(
      popover
    ).toHaveAttribute(
      'data-overlay-state',
      'closed'
    );

    await expect(
      page.locator('#componentCatalogueBtn')
    ).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    expect(
      pageErrors
    ).toEqual(
      []
    );

    expect(
      consoleErrors
    ).toEqual(
      []
    );
  }
);
