import assert from 'node:assert/strict';
import {
  readFile
} from 'node:fs/promises';
import test from 'node:test';


const BASELINE_DOC_PATH =
  'docs/02-architecture/ui/UI_MIGRATION_BASELINES.md';

const VISUAL_SPEC_PATH =
  'tests/browser/visual-regression.spec.mjs';

const REQUIRED_BASELINE_ATTACHMENTS = [
  'visual-app-shell',
  'visual-app-shell-empty-workbench',
  'visual-sidebar-tree',
  'visual-card-editor',
  'visual-properties-sheet',
  'visual-properties-popup',
  'visual-campaign-map',
  'visual-knowledge-graph',
  'visual-task-tracker',
  'visual-component-catalogue-popover'
];

const REQUIRED_SYSTEM_ROWS = [
  'AppShell and workbench',
  'Sidebar, tree, search and navigation',
  'Card editor and blocks',
  'Properties and sheets',
  'Campaign map and live scene',
  'Knowledge graph and canvas',
  'Task tracker',
  'Shared primitives and overlays'
];


test(
  'UI migration baseline manifest stays aligned with visual smoke',
  async () => {

    const [
      baselineDoc,
      visualSpec
    ] = await Promise.all([
      readFile(
        BASELINE_DOC_PATH,
        'utf8'
      ),
      readFile(
        VISUAL_SPEC_PATH,
        'utf8'
      )
    ]);

    for (const attachment of REQUIRED_BASELINE_ATTACHMENTS) {

      assert.match(
        baselineDoc,
        new RegExp(`\\\`${attachment}\\.png\\\``),
        `${attachment}.png must be documented in ${BASELINE_DOC_PATH}`
      );

      assert.match(
        visualSpec,
        new RegExp(`'${attachment}'`),
        `${attachment} must be produced by ${VISUAL_SPEC_PATH}`
      );
    }

    for (const system of REQUIRED_SYSTEM_ROWS) {

      assert.match(
        baselineDoc,
        new RegExp(`\\| ${escapeRegExp(system)} \\|`),
        `${system} must have a system inventory row`
      );
    }
  }
);


function escapeRegExp(
  value
) {

  return String(value)
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
}
