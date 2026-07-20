import {
  expect,
  test
} from '@playwright/test';


test(
  'safe-html-sanitizer-removes-forbidden-tags-and-keeps-json-data-blocks',
  async ({ page }) => {

    await page.goto('/');

    const result =
      await sanitizeInBrowser(
        page,
        `
          <div>
            <script>alert(1)</script>
            <script type="application/json" data-task-tracker-data data-extra="x">{"ok":true}</script>
            <script type="application/json" data-character-effects data-extra="x">{"conditions":["poisoned"]}</script>
            <script type="application/json" data-rule-tree-data data-extra="x">{"rules":[]}</script>
            <script type="application/json" data-knowledge-graph-view-state data-extra="x">{"version":1,"positions":{"hero":{"x":120,"y":80,"pinned":true}}}</script>
            <iframe src="https://example.com"></iframe>
            <object data="x"></object>
            <embed src="x">
            <link rel="stylesheet" href="x.css">
            <meta charset="utf-8">
            <style>.x { color: red; }</style>
            <form><input value="bad"></form>
          </div>
        `
      );

    expect(result.saved).not.toContain('<script>alert');
    expect(result.saved).not.toContain('<iframe');
    expect(result.saved).not.toContain('<object');
    expect(result.saved).not.toContain('<embed');
    expect(result.saved).not.toContain('<link');
    expect(result.saved).not.toContain('<meta');
    expect(result.saved).not.toContain('<style');
    expect(result.saved).not.toContain('<form');
    expect(result.saved).toContain('type="application/json"');
    expect(result.saved).toContain('data-task-tracker-data');
    expect(result.saved).toContain('data-character-effects');
    expect(result.saved).toContain('data-rule-tree-data');
    expect(result.saved).toContain('data-knowledge-graph-view-state');
    expect(result.saved).toContain('character-effects-data');
    expect(result.saved).toContain('knowledge-graph-view-state');
    expect(result.saved).not.toContain('data-extra');
  }
);


test(
  'safe-html-sanitizer-removes-unsafe-attributes-and-urls',
  async ({ page }) => {

    await page.goto('/');

    const result =
      await sanitizeInBrowser(
        page,
        `
          <div>
            <a href="javascript:alert(1)" onclick="alert(2)">bad</a>
            <a href="vbscript:msgbox(1)">bad2</a>
            <a href="data:text/html,<script>alert(1)</script>">bad3</a>
            <a href="https://example.com" target="_blank">ok</a>
            <img data-asset="portrait.png" src="blob:http://local/123" onerror="alert(3)">
            <span style="color: red;">text</span>
            <table><colgroup><col style="width: 123px; color: red;"></colgroup><tbody><tr><td>cell</td></tr></tbody></table>
          </div>
        `
      );

    expect(result.saved).not.toContain('onclick');
    expect(result.saved).not.toContain('onerror');
    expect(result.saved).not.toContain('javascript:');
    expect(result.saved).not.toContain('vbscript:');
    expect(result.saved).not.toContain('data:text/html');
    expect(result.saved).not.toContain('blob:');
    expect(result.saved).not.toContain('color: red');
    expect(result.saved).toContain('rel="noopener noreferrer"');
    expect(result.saved).toContain('style="width: 123px;"');
  }
);


test(
  'safe-html-sanitizer-removes-runtime-controls-and-map-task-ui',
  async ({ page }) => {

    await page.goto('/');

    const result =
      await sanitizeInBrowser(
        page,
        `
          <div>
            <div data-runtime="true">runtime</div>
            <div class="block-actions">block controls</div>
            <div class="blocks-toolbar">blocks toolbar</div>
            <div class="image-runtime-actions">image buttons</div>
            <div class="table-row-controls">table buttons</div>
            <div class="floating-toolbar">toolbar</div>
            <div class="wiki-preview-popup">preview</div>
            <div class="campaign-map-toolbar">map toolbar</div>
            <div class="campaign-map-popup">map popup</div>
            <div class="campaign-map-drag-measure">vector</div>
            <div class="task-tracker-board">runtime board</div>
            <button class="task-add-btn">+</button>
            <p>persistent text</p>
          </div>
        `
      );

    expect(result.saved).not.toContain('runtime');
    expect(result.saved).not.toContain('block controls');
    expect(result.saved).not.toContain('blocks toolbar');
    expect(result.saved).not.toContain('image buttons');
    expect(result.saved).not.toContain('table buttons');
    expect(result.saved).not.toContain('toolbar');
    expect(result.saved).not.toContain('preview');
    expect(result.saved).not.toContain('map toolbar');
    expect(result.saved).not.toContain('map popup');
    expect(result.saved).not.toContain('vector');
    expect(result.saved).not.toContain('runtime board');
    expect(result.saved).toContain('persistent text');
  }
);


test(
  'safe-html-sanitizer-handles-malformed-html-and-plain-text-paste',
  async ({ page }) => {

    await page.goto('/');

    const result =
      await page.evaluate(
        async () => {

          const {
            sanitizePersistentHTMLOnLoad,
            sanitizePersistentHTMLOnSave,
            sanitizePlainTextPaste
          } = await import('/js/editor/safeHtmlSanitizer.js');

          const malformed =
            '<div><p>Текст<script>alert(1)</script><a href="java\\nscript:alert(2)">x';

          return {
            saved: sanitizePersistentHTMLOnSave(malformed),
            loaded: sanitizePersistentHTMLOnLoad(malformed),
            paste: sanitizePlainTextPaste('a\u0000b\r\nc\u0007')
          };
        }
      );

    expect(result.saved).toContain('Текст');
    expect(result.saved).not.toContain('<script');
    expect(result.saved).not.toContain('javascript:');
    expect(result.loaded).not.toContain('<script');
    expect(result.paste).toBe('ab\nc');
  }
);


async function sanitizeInBrowser(
  page,
  html
) {

  return page.evaluate(
    async source => {

      const {
        sanitizePersistentHTMLOnLoad,
        sanitizePersistentHTMLOnSave
      } = await import('/js/editor/safeHtmlSanitizer.js');

      return {
        saved: sanitizePersistentHTMLOnSave(source),
        loaded: sanitizePersistentHTMLOnLoad(source)
      };
    },
    html
  );
}
