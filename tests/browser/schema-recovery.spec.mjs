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
                  'Страница без id не может безопасно сохраняться.'
              }
            ]
        });
      }
    );

    await expect(
      page.getByRole(
        'heading',
        {
          name: 'Найдены ошибки данных'
        }
      )
    ).toBeVisible();

    await expect(
      page.locator('.workspace-recovery-item')
    ).toContainText(
      'page.missing_id'
    );

    expect(
      consoleErrors
    ).toEqual(
      []
    );
  }
);
