import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


test(
  'owner design corrections A-C stay on shared UI primitives',
  async () => {

    const [
      blockControlsJs,
      blocksCss,
      brandCss,
      mapControllerJs,
      mapPopupsCss,
      runtimeControlsJs,
      cardShellJs,
      tagsCss,
      tokensCss,
      uiCss
    ] = await Promise.all([
      readFile('js/editor/blocks/blockControls.js', 'utf8'),
      readFile('styles/blocks.css', 'utf8'),
      readFile('styles/brand-system.css', 'utf8'),
      readFile('js/editor/campaignMapPopupController.js', 'utf8'),
      readFile('styles/campaign-map-popups.css', 'utf8'),
      readFile('js/editor/blocks/blockRuntimeControls.js', 'utf8'),
      readFile('js/templates/cardShell.js', 'utf8'),
      readFile('styles/tags.css', 'utf8'),
      readFile('styles/design-tokens.css', 'utf8'),
      readFile('styles/ui.css', 'utf8')
    ]);

    assert.match(
      blockControlsJs,
      /class="add-block-btn mow-button"/,
      'Add Block trigger must consume the shared button primitive.'
    );

    assert.doesNotMatch(
      blocksCss,
      /\.add-block-btn\s*\{/,
      'Add Block must not recreate a local button surface.'
    );

    assert.doesNotMatch(
      blocksCss,
      /\.add-block-btn:hover|\.add-block-btn:focus-visible|\.add-block-btn:active/,
      'Add Block interaction states must come from the shared button primitive.'
    );

    assert.doesNotMatch(
      brandCss,
      /\.add-block-btn:hover/,
      'Brand hover recipes must not override the shared Add Block button state.'
    );

    assert.match(
      tokensCss,
      /--mow-surface-overlay-opaque:/,
      'Opaque overlay surface must be owned by shared design tokens.'
    );

    assert.match(
      mapControllerJs,
      /campaign-map-popup mow-popover hidden/,
      'Campaign Map popup must consume the shared popover primitive class.'
    );

    const mapRootRule =
      getCssRule(
        mapPopupsCss,
        '.campaign-map-popup'
      );

    assert.match(
      mapRootRule,
      /var\(--mow-surface-overlay-opaque\)/,
      'Campaign Map popup root must use the shared opaque overlay surface token.'
    );

    assert.doesNotMatch(
      mapRootRule,
      /linear-gradient|#11120f|#050706/,
      'Campaign Map popup root must not use the old local hardcoded gradient.'
    );

    assert.match(
      uiCss,
      /\.mow-input\[data-size="sm"\]/,
      'Small metadata inputs must be a shared input size variant, not feature CSS.'
    );

    assert.match(
      runtimeControlsJs,
      /classList\.add\(\s*'mow-input'\s*\)/,
      'Runtime tag and alias inputs must be normalized to the shared input primitive.'
    );

    assert.match(
      runtimeControlsJs,
      /classList\.add\(\s*'mow-icon-button'\s*\)/,
      'Runtime tag and alias add buttons must be normalized to the shared icon-button primitive.'
    );

    assert.match(
      cardShellJs,
      /inline-tag-input mow-input/
    );

    assert.match(
      cardShellJs,
      /inline-add-tag-btn mow-icon-button/
    );

    assert.match(
      cardShellJs,
      /inline-alias-input mow-input/
    );

    assert.match(
      cardShellJs,
      /inline-add-alias-btn mow-icon-button/
    );

    for (const selector of [
      '.inline-tag-input',
      '.inline-alias-input'
    ]) {

      const rule =
        getCssRule(
          tagsCss,
          selector
        );

      assert.match(
        rule,
        /width:/,
        `${selector} may keep feature-specific width.`
      );

      assert.doesNotMatch(
        rule,
        /background:|border:|border-radius:|box-shadow:|outline:|height:|font:|transition:/,
        `${selector} must not own generic input styling.`
      );
    }

    for (const selector of [
      '.inline-add-tag-btn',
      '.inline-add-alias-btn'
    ]) {

      const rule =
        getCssRule(
          tagsCss,
          selector
        );

      assert.doesNotMatch(
        rule,
        /background:|border:|border-radius:|box-shadow:|outline:|height:|font:|transition:|cursor:/,
        `${selector} must not own generic icon-button styling.`
      );
    }
  }
);


function getCssRule(
  css,
  selector
) {

  const expression =
    new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\n\\}`);

  const match =
    css.match(
      expression
    );

  assert.ok(
    match,
    `${selector} rule must exist`
  );

  return match[1];
}


function escapeRegExp(
  value
) {

  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
}
