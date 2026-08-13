import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


const REQUIRED_CHARACTER_SHEET_TOKENS =
  [
    '--mow-character-sheet-ink',
    '--mow-character-sheet-muted',
    '--mow-character-sheet-line',
    '--mow-character-sheet-line-soft',
    '--mow-character-sheet-paper',
    '--mow-character-sheet-danger'
  ];

const REQUIRED_SETTINGS_TOKENS =
  [
    '--mow-line-height-normal',
    '--mow-input-color'
  ];


test(
  'RCB-020 keeps character sheet and settings tokens owned by the design system',
  async () => {

    const [
      tokensCss,
      characterSheetCss,
      appTopbarCss
    ] =
      await Promise.all([
        readFile('styles/design-tokens.css', 'utf8'),
        readFile('styles/block-character-sheet.css', 'utf8'),
        readFile('styles/app-topbar.css', 'utf8')
      ]);

    const definedTokens =
      collectDefinedMowTokens(
        tokensCss
      );

    for (const token of [
      ...REQUIRED_CHARACTER_SHEET_TOKENS,
      ...REQUIRED_SETTINGS_TOKENS
    ]) {

      assert.ok(
        definedTokens.has(token),
        `${token} must be defined in styles/design-tokens.css.`
      );
    }

    assert.doesNotMatch(
      characterSheetCss,
      /--sheet-/,
      'Character Sheet must not own a local --sheet-* palette.'
    );

    assert.deepEqual(
      findUndefinedNoFallbackMowTokens({
        css:
          characterSheetCss,
        definedTokens
      }),
      [],
      'Character Sheet must not consume undefined no-fallback --mow-* tokens.'
    );

    assert.deepEqual(
      findUndefinedNoFallbackMowTokens({
        css:
          appTopbarCss,
        definedTokens
      }),
      [],
      'Settings/AppTopbar CSS must not consume undefined no-fallback --mow-* tokens.'
    );
  }
);


function collectDefinedMowTokens(
  css
) {

  return new Set(
    [
      ...css.matchAll(
        /(--mow-[a-z0-9-]+)\s*:/g
      )
    ].map(match =>
      match[1]
    )
  );
}


function findUndefinedNoFallbackMowTokens({
  css,
  definedTokens
}) {

  return [
    ...css.matchAll(
      /var\((--mow-[a-z0-9-]+)([^)]*)\)/g
    )
  ].filter(match =>
    !match[2].includes(',') &&
    !definedTokens.has(
      match[1]
    )
  ).map(match =>
    match[1]
  );
}
