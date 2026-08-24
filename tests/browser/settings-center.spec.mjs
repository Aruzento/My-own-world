import {
  expect,
  test
} from '@playwright/test';


const EXPECTED_CATEGORIES = [
  'Общие',
  'Оформление',
  'Профиль',
  'Файлы и импорт',
  'Хранилище',
  'Резервные копии',
  'Игровая система',
  'Карты',
  'Граф связей',
  'Интеграции',
  'Системные настройки',
  'Диагностика',
  'Экспериментальные функции'
];


async function openSettings(
  page
) {

  await page.locator('#appSettingsBtn').click();

  await expect(
    page.locator('#appSettingsPopup')
  ).toHaveAttribute(
    'data-settings-ui-migration',
    'settings-center'
  );
}


async function openSettingsSection(
  page,
  sectionId
) {

  await page
    .locator(
      `[data-settings-category="${sectionId}"]`
    )
    .click();

  await expect(
    page.locator(
      `[data-settings-page="${sectionId}"]`
    )
  ).toBeVisible();
}


test(
  'settings-center-opens-system-layout-and-preserves-existing-sections',
  async ({ page }) => {

    const consoleErrors = [];
    const pageErrors = [];

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

    page.on(
      'pageerror',
      error => pageErrors.push(
        error.message
      )
    );

    await page.goto(
      '/'
    );

    await openSettings(
      page
    );

    await expect(
      page.locator('.app-settings-shell')
    ).toBeVisible();

    await expect(
      page.locator('.app-settings-sidebar')
    ).toBeVisible();

    await expect(
      page.locator('.app-settings-content')
    ).toBeVisible();

    await expect(
      page.locator('[data-settings-category]')
    ).toHaveCount(
      EXPECTED_CATEGORIES.length
    );

    await expect(
      page.locator('[data-settings-category]')
    ).toHaveText(
      EXPECTED_CATEGORIES
    );

    await expect(
      page.locator('[data-settings-category="appearance"]')
    ).toHaveAttribute(
      'aria-current',
      'page'
    );

    await expect(
      page.locator('[data-settings-page="appearance"]')
    ).toBeVisible();

    await page
      .locator('.app-appearance-segmented button[data-theme="contrast"]')
      .click();

    await page
      .locator('.app-appearance-swatch[data-accent="purple"]')
      .click();

    await page
      .locator('.app-appearance-swatch[data-background="forest"]')
      .click();

    await page
      .locator('.app-appearance-segmented button[data-scale="large"]')
      .click();

    await expect(
      page.locator('body')
    ).toHaveAttribute(
      'data-theme',
      'contrast'
    );

    await expect(
      page.locator('body')
    ).toHaveAttribute(
      'data-accent',
      'purple'
    );

    await expect(
      page.locator('body')
    ).toHaveAttribute(
      'data-bg',
      'forest'
    );

    await expect(
      page.locator('body')
    ).toHaveAttribute(
      'data-ui-scale',
      'large'
    );

    await expect(
      page.locator('[data-settings-page="appearance"]')
    ).toBeVisible();

    await openSettingsSection(
      page,
      'backup'
    );

    await expect(
      page.locator('.app-backup-panel')
    ).toBeVisible();

    await expect(
      page.locator('.app-backup-primary')
    ).toBeDisabled();

    await expect(
      page.locator('.app-backup-retention input')
    ).toHaveValue(
      '20'
    );

    await openSettingsSection(
      page,
      'storage'
    );

    await expect(
      page.locator('.app-asset-health-panel')
    ).toBeVisible();

    await openSettingsSection(
      page,
      'diagnostics'
    );

    await expect(
      page.locator('.app-workspace-diagnostics-panel')
    ).toBeVisible();

    await openSettingsSection(
      page,
      'integrations'
    );

    await expect(
      page.locator('[data-settings-page="integrations"]')
    ).toContainText(
      'Скоро'
    );

    await page
      .locator('[data-settings-search-input]')
      .fill(
        'резерв'
      );

    await expect(
      page.locator('[data-settings-search-result="backup"]')
    ).toBeVisible();

    await page
      .locator('[data-settings-search-result="backup"]')
      .click();

    await expect(
      page.locator('[data-settings-page="backup"]')
    ).toBeVisible();

    await expect(
      page.locator('[data-settings-category="backup"]')
    ).toHaveAttribute(
      'aria-current',
      'page'
    );

    await page.keyboard.press(
      'Escape'
    );

    await expect(
      page.locator('#appSettingsPopup')
    ).toHaveClass(
      /hidden/
    );

    for (let index = 0; index < 3; index++) {

      await openSettings(
        page
      );

      await page
        .locator('#appSettingsCloseBtn')
        .click();
    }

    await expect(
      page.locator('.app-settings-shell')
    ).toHaveCount(
      1
    );

    await expect(
      page.locator('[data-settings-category]')
    ).toHaveCount(
      EXPECTED_CATEGORIES.length
    );

    const storageValue =
      await page.evaluate(
        () => JSON.parse(
          localStorage.getItem('myOwnWorld.appearance') || '{}'
        )
      );

    expect(
      storageValue
    ).toMatchObject({
      theme:
        'contrast',
      accent:
        'purple',
      background:
        'forest',
      scale:
        'large'
    });

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
  'settings-center-keeps-readable-responsive-layout',
  async ({ page }) => {

    await page.setViewportSize({
      width:
        560,
      height:
        760
    });

    await page.goto(
      '/'
    );

    await openSettings(
      page
    );

    await openSettingsSection(
      page,
      'maps'
    );

    const metrics =
      await page.locator('#appSettingsPopup').evaluate(
        popup => {

          const content =
            popup.querySelector('.app-settings-content');

          const closeButton =
            popup.querySelector('#appSettingsCloseBtn');

          const rect =
            popup.getBoundingClientRect();

          const contentRect =
            content.getBoundingClientRect();

          const closeRect =
            closeButton.getBoundingClientRect();

          return {
            popupWithinViewport:
              rect.left >= 0 &&
              rect.top >= 0 &&
              rect.right <= window.innerWidth + 1 &&
              rect.bottom <= window.innerHeight + 1,
            contentHasHorizontalOverflow:
              content.scrollWidth > content.clientWidth + 1,
            closeVisible:
              closeRect.width > 0 &&
              closeRect.height > 0 &&
              closeRect.right <= window.innerWidth + 1,
            contentReadableWidth:
              contentRect.width
          };
        }
      );

    expect(
      metrics.popupWithinViewport
    ).toBe(
      true
    );

    expect(
      metrics.contentHasHorizontalOverflow
    ).toBe(
      false
    );

    expect(
      metrics.closeVisible
    ).toBe(
      true
    );

    expect(
      metrics.contentReadableWidth
    ).toBeGreaterThan(
      280
    );
  }
);
