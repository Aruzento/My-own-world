import {
  expect,
  test
} from '@playwright/test';


for (const theme of [
  'dark',
  'contrast'
]) {

  test(
    `design-token-consistency-renders-character-sheet-and-settings-in-${theme}`,
    async ({ page }) => {

      await page.goto(
        '/'
      );

      await page.evaluate(
        async selectedTheme => {

          const {
            applyAppearance
          } = await import('/js/ui/themeManager.js');

          applyAppearance({
            theme:
              selectedTheme,
            accent:
              'gold',
            background:
              'default',
            scale:
              'normal'
          });
        },
        theme
      );

      await page.locator('#appSettingsBtn').click();

      await expect(
        page.locator('#appSettingsPopup')
      ).toBeVisible();

      await page
        .locator('[data-settings-category="backup"]')
        .click();

      await expect(
        page.locator('[data-settings-page="backup"]')
      ).toBeVisible();

      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            createCharacterSheetBlock
          } = await import('/js/templates/blockTypes.js');

          const {
            renderCharacterSheetBlocks
          } = await import('/js/editor/characterSheetBlock.js');

          const { createPlayerSheetFixture } = await import('/tests/fixtures/playerSheetFixtures.mjs');
          const { setCurrentPage } = await import('/js/stateActions.js');
          const fixture = await createPlayerSheetFixture();
          setCurrentPage(fixture.page);

          const editor =
            document.querySelector('#editorArea');

          editor.innerHTML =
            createCharacterSheetBlock();

          await renderCharacterSheetBlocks(
            editor
          );
        }
      );

      await expect(
        page.locator('.character-sheet-page')
      ).toBeVisible();

      const result =
        await page.evaluate(
          () => {

            const rootStyle =
              getComputedStyle(
                document.documentElement
              );

            const settingsParagraph =
              document.querySelector(
                '.app-settings-content p, .app-settings-page-copy p'
              );

            const settingsInput =
              document.querySelector(
                '.app-backup-retention input'
              );

            const sheet =
              document.querySelector(
                '.character-sheet-page'
              );

            const sheetBox =
              document.querySelector(
                '.character-sheet-box, .character-sheet-metric'
              );

            const paragraphStyle =
              getComputedStyle(
                settingsParagraph
              );

            const inputStyle =
              getComputedStyle(
                settingsInput
              );

            const sheetStyle =
              getComputedStyle(
                sheet
              );

            const sheetBoxStyle =
              getComputedStyle(
                sheetBox
              );

            return {
              theme:
                document.body.dataset.theme,
              lineHeightToken:
                rootStyle.getPropertyValue(
                  '--mow-line-height-normal'
                ).trim(),
              inputColorToken:
                rootStyle.getPropertyValue(
                  '--mow-input-color'
                ).trim(),
              sheetInkToken:
                rootStyle.getPropertyValue(
                  '--mow-character-sheet-ink'
                ).trim(),
              sheetLineToken:
                rootStyle.getPropertyValue(
                  '--mow-character-sheet-line'
                ).trim(),
              settingsParagraphLineHeight:
                paragraphStyle.lineHeight,
              settingsInputColor:
                inputStyle.color,
              sheetColor:
                sheetStyle.color,
              sheetBackground:
                sheetStyle.backgroundImage,
              sheetBoxBorderColor:
                sheetBoxStyle.borderColor
            };
          }
        );

      expect(
        result.theme
      ).toBe(
        theme
      );

      for (const [
        key,
        value
      ] of Object.entries(result)) {

        expect(
          value,
          `${key} should resolve in ${theme} theme`
        ).not.toBe(
          ''
        );
      }

      expect(
        Number.parseFloat(
          result.settingsParagraphLineHeight
        )
      ).toBeGreaterThan(
        0
      );

      expect(
        result.settingsInputColor
      ).not.toBe(
        'rgba(0, 0, 0, 0)'
      );

      expect(
        result.sheetColor
      ).toBe(
        'rgb(25, 23, 20)'
      );
    }
  );
}
