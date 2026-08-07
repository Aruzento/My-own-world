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
  'visual-knowledge-graph-node-menu',
  'visual-task-tracker',
  'visual-help-support',
  'visual-world-packages',
  'visual-component-catalogue-popover',
  'visual-theme-dark-compact-workbench',
  'visual-theme-contrast-large-workbench',
  'visual-theme-contrast-narrow-workbench',
  'visual-ds-dark-compact-shell-states',
  'visual-ds-contrast-large-editor-properties',
  'visual-ds-dark-normal-map-popup',
  'visual-ds-contrast-large-graph-overlay',
  'visual-ds-dark-compact-task-empty',
  'visual-owner-1440-shell-states',
  'visual-owner-1280-shell-states',
  'visual-owner-1440-editor-properties',
  'visual-owner-1280-editor-properties',
  'visual-owner-1440-map-popup',
  'visual-owner-1280-map-popup',
  'visual-owner-1440-graph-overlay',
  'visual-owner-1280-graph-overlay',
  'visual-owner-1440-task-empty',
  'visual-owner-1280-task-empty',
  'visual-owner-1440-settings-diagnostics',
  'visual-owner-1280-settings-diagnostics'
];

const REQUIRED_SYSTEM_ROWS = [
  'AppShell and workbench',
  'Sidebar, tree, search and navigation',
  'Card editor and blocks',
  'Properties and sheets',
  'Campaign map and live scene',
  'Knowledge graph and canvas',
  'Task tracker',
  'Help, support and release guide `0.0.1.8.14.3`',
  'World Package manager `0.0.1.8.14.7`',
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
