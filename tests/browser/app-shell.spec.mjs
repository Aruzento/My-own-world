import {
  expect,
  test
} from '@playwright/test';


// P0 smoke: приложение должно открываться без workspace и без ошибок модулей.

test(
  'app-shell-empty-state',
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

    await expect(
      page.locator('.sidebar-title')
    ).toHaveText(
      'MyWorld'
    );

    await expect(
      page.locator('.empty-editor-kicker')
    ).toHaveText(
      'Добро пожаловать'
    );

    await expect(
      page.getByRole(
        'heading',
        {
          name: 'Создайте свой мир'
        }
      )
    ).toBeVisible();

    await expect(
      page.locator('.empty-create-option')
    ).toHaveCount(
      3
    );

    await page.locator('#appToolsBtn').click();

    await page
      .getByRole(
        'button',
        {
          name: 'Быстрый старт'
        }
      )
      .click();

    await expect(
      page.locator('#onboardingTitle')
    ).toHaveText(
      'Быстрый старт'
    );

    await expect(
      page.locator('.onboarding-card')
    ).toHaveCount(
      4
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
