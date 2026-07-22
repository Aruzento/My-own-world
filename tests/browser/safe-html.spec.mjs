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
  'safe-html-sanitizer-enforces-persistent-tag-and-attribute-allowlist',
  async ({ page }) => {

    await page.goto('/');

    const result =
      await sanitizeInBrowser(
        page,
        `
          <div
            class="entity-layout card-shell mso-normal random-class"
            data-card-shell="v1"
            data-extra="drop"
            onclick="alert(1)"
          >
            <h1
              class="card-title singleline-field unknown-title"
              contenteditable="maybe"
              data-placeholder="Название"
              data-evil="drop"
            >Hero</h1>
            <a
              class="wiki-link internal-link is-missing bad-link"
              href="#"
              data-page-id="hero"
              data-page-title="Hero"
              data-extra="drop"
            >Hero link</a>
            <table class="custom-table imported-table" data-junk="drop">
              <colgroup>
                <col style="width: 88px; background: url(javascript:alert(1));">
              </colgroup>
              <tbody><tr><td colspan="2">Cell</td></tr></tbody>
            </table>
            <div
              class="campaign-map-document"
              data-campaign-map="v1"
              data-map-model-version="1"
              data-grid="true"
              data-view-x="10"
              data-view-y="20"
              data-view-zoom="1.5"
              data-extra="drop"
            >
              <canvas class="campaign-map-fog-canvas" width="300" height="200" data-evil="drop"></canvas>
              <button
                class="campaign-map-token is-creature is-selected bad-token"
                type="submit"
                data-token-id="token-1"
                data-page-id="hero"
                data-extra="drop"
              >Token</button>
            </div>
            <x-unsafe data-extra="drop"><span class="text-block-body random-class">Keep text</span></x-unsafe>
            <math><mi>Math text</mi></math>
            <img
              class="image-block bad-image"
              data-asset="portrait.png"
              src="data:image/svg+xml,<svg onload=alert(1)>"
              data-extra="drop"
            >
          </div>
        `
      );

    expect(result.saved).toContain('class="entity-layout card-shell"');
    expect(result.saved).toContain('data-card-shell="v1"');
    expect(result.saved).toContain('data-placeholder="Название"');
    expect(result.saved).toContain('class="wiki-link internal-link is-missing"');
    expect(result.saved).toContain('data-page-id="hero"');
    expect(result.saved).toContain('data-page-title="Hero"');
    expect(result.saved).toContain('class="custom-table"');
    expect(result.saved).toContain('style="width: 88px;"');
    expect(result.saved).toContain('data-campaign-map="v1"');
    expect(result.saved).toContain('data-map-model-version="1"');
    expect(result.saved).toContain('data-view-zoom="1.5"');
    expect(result.saved).toContain('width="300"');
    expect(result.saved).toContain('height="200"');
    expect(result.saved).toContain('data-token-id="token-1"');
    expect(result.saved).toContain('type="button"');
    expect(result.saved).toContain('Keep text');
    expect(result.saved).toContain('Math text');

    expect(result.saved).not.toContain('onclick');
    expect(result.saved).not.toContain('data-extra');
    expect(result.saved).not.toContain('data-evil');
    expect(result.saved).not.toContain('data-junk');
    expect(result.saved).not.toContain('random-class');
    expect(result.saved).not.toContain('unknown-title');
    expect(result.saved).not.toContain('bad-link');
    expect(result.saved).not.toContain('imported-table');
    expect(result.saved).not.toContain('is-selected');
    expect(result.saved).not.toContain('bad-token');
    expect(result.saved).not.toContain('bad-image');
    expect(result.saved).not.toContain('contenteditable="maybe"');
    expect(result.saved).not.toContain('type="submit"');
    expect(result.saved).not.toContain('data:image/svg+xml');
    expect(result.saved).not.toContain('<x-unsafe');
    expect(result.saved).not.toContain('<math');
    expect(result.saved).not.toContain('<mi');
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
            sanitizeClipboardPaste,
            sanitizePlainTextPaste
          } = await import('/js/editor/safeHtmlSanitizer.js');

          const malformed =
            '<div><p>Текст<script>alert(1)</script><a href="java\\nscript:alert(2)">x';

          const plainPreferred =
            sanitizeClipboardPaste(
              createClipboardData({
                'text/html': '<p><img src=x onerror=alert(1)>Bad</p>',
                'text/plain': 'Good\u0000 text\r\nnext'
              })
            );

          const htmlOnly =
            sanitizeClipboardPaste(
              createClipboardData({
                'text/html': `
                  <p>Hello <img src=x onerror=alert(1)> image</p>
                  <script>alert(1)</script>
                  <div data-runtime="true">runtime</div>
                  <a href="javascript:alert(2)">Link</a>
                `
              })
            );

          const richOnly =
            sanitizeClipboardPaste({
              files: [
                {}
              ],
              getData: () => '',
              types: [
                'Files',
                'image/png'
              ]
            });

          return {
            saved: sanitizePersistentHTMLOnSave(malformed),
            loaded: sanitizePersistentHTMLOnLoad(malformed),
            paste: sanitizePlainTextPaste('a\u0000b\r\nc\u0007'),
            plainPreferred,
            htmlOnly,
            richOnly
          };

          function createClipboardData(
            entries
          ) {

            return {
              files: [],
              getData: type => entries[type] || '',
              types: Object.keys(entries)
            };
          }
        }
      );

    expect(result.saved).toContain('Текст');
    expect(result.saved).not.toContain('<script');
    expect(result.saved).not.toContain('javascript:');
    expect(result.loaded).not.toContain('<script');
    expect(result.paste).toBe('ab\nc');
    expect(result.plainPreferred).toEqual({
      shouldHandle: true,
      source: 'text',
      text: 'Good text\nnext'
    });
    expect(result.htmlOnly.shouldHandle).toBe(true);
    expect(result.htmlOnly.source).toBe('html');
    expect(result.htmlOnly.text).toContain('Hello  image');
    expect(result.htmlOnly.text).toContain('Link');
    expect(result.htmlOnly.text).not.toContain('alert');
    expect(result.htmlOnly.text).not.toContain('runtime');
    expect(result.richOnly).toEqual({
      shouldHandle: true,
      source: 'blocked-rich-data',
      text: ''
    });
  }
);


test(
  'editor-paste-handler-converts-html-only-clipboard-to-plain-text',
  async ({ page }) => {

    await page.goto('/');

    const result =
      await page.evaluate(
        async () => {

          const {
            state
          } = await import('/js/state.js');

          const {
            setupEditorPlainTextPaste
          } = await import('/js/editor/editorPastePlainText.js');

          state.currentPage = {
            id: 'paste-security-page',
            template: 'card',
            type: 'note'
          };

          const editor =
            document.querySelector('#editorArea');

          let normalizationCount =
            0;

          editor.innerHTML = `
            <div class="entity-layout card-shell" contenteditable="false">
              <div
                class="rich-text-field"
                contenteditable="true"
                data-persistent-editable="true"
              >Start </div>
            </div>
          `;

          setupEditorPlainTextPaste(
            editor,
            {
              scheduleWikiLinkNormalization: () => {

                normalizationCount += 1;
              }
            }
          );

          const field =
            editor.querySelector('.rich-text-field');

          field.focus();

          const range =
            document.createRange();

          range.selectNodeContents(
            field
          );

          range.collapse(
            false
          );

          const selection =
            window.getSelection();

          selection.removeAllRanges();
          selection.addRange(
            range
          );

          const pasteEvent =
            new Event(
              'paste',
              {
                bubbles: true,
                cancelable: true
              }
            );

          Object.defineProperty(
            pasteEvent,
            'clipboardData',
            {
              value: {
                files: [],
                getData: type =>
                  type === 'text/html'
                    ? `
                      <p>Hello <img src=x onerror=alert(1)> image</p>
                      <script>alert(2)</script>
                      <button data-runtime="true">runtime button</button>
                      <a href="javascript:alert(3)">Link</a>
                    `
                    : '',
                types: [
                  'text/html'
                ]
              }
            }
          );

          const dispatchResult =
            field.dispatchEvent(
              pasteEvent
            );

          await new Promise(resolve =>
            setTimeout(
              resolve,
              0
            )
          );

          return {
            defaultPrevented: pasteEvent.defaultPrevented,
            dispatchResult,
            html: field.innerHTML,
            normalizationCount,
            text: field.textContent
          };
        }
      );

    expect(result.defaultPrevented).toBe(true);
    expect(result.dispatchResult).toBe(false);
    expect(result.text).toContain('Start Hello  image');
    expect(result.text).toContain('Link');
    expect(result.html).not.toContain('<img');
    expect(result.html).not.toContain('<script');
    expect(result.html).not.toContain('onerror');
    expect(result.html).not.toContain('javascript:');
    expect(result.html).not.toContain('runtime button');
    expect(result.normalizationCount).toBe(1);
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
