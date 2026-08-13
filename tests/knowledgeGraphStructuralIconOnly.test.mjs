import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


test(
  'knowledge graph icon-only controls are structural, not CSS-hidden text buttons',
  async () => {

    const [
      pageHtml,
      controlsHtml,
      inspectorHtml,
      menuHtml,
      graphCss,
      overlayCss
    ] = await Promise.all([
      readFile('js/wiki/knowledgeGraphPage.js', 'utf8'),
      readFile('js/wiki/knowledgeGraphCanvasControls.js', 'utf8'),
      readFile('js/wiki/knowledgeGraphCanvasInspector.js', 'utf8'),
      readFile('js/wiki/knowledgeGraphRelationshipMenu.js', 'utf8'),
      readFile('styles/knowledge-graph.css', 'utf8'),
      readFile('styles/knowledge-graph-overlays.css', 'utf8')
    ]);

    assert.doesNotMatch(
      graphCss,
      /font-size\s*:\s*0\b/,
      'Knowledge Graph must not use font-size: 0 as an icon-only workaround.'
    );

    assert.doesNotMatch(
      graphCss,
      /knowledge-graph-canvas-scale[\s\S]*?color\s*:\s*transparent/,
      'Graph scale status must render meaningful text instead of hiding it.'
    );

    for (const source of [
      pageHtml,
      controlsHtml,
      inspectorHtml,
      menuHtml,
      graphCss,
      overlayCss
    ]) {

      assert.doesNotMatch(
        source,
        /knowledge-graph-toolbar-label|knowledge-graph-node-menu-action-label/,
        'Graph icon-only controls must not render old label spans and hide them with CSS.'
      );
    }

    assert.match(
      pageHtml,
      /class="knowledge-graph-canvas-scale"[\s\S]*?aria-label="Масштаб 100%"/,
      'Graph scale status keeps a visible value with an accessible label.'
    );

    for (const source of [
      pageHtml,
      controlsHtml,
      inspectorHtml,
      menuHtml
    ]) {

      assert.match(
        source,
        /mow-icon-button/,
        'Touched graph icon-only controls consume the shared icon-button primitive.'
      );

      assert.match(
        source,
        /aria-label=/,
        'Touched graph icon-only controls keep explicit accessible names.'
      );
    }
  }
);
