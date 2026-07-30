---
summary: "Contract for portable World Package export/import foundation."
read_when:
  - "When changing World Package export/import"
  - "When adding reusable content packs"
  - "Before connecting Workshop or package import UI"
owner_zone: "architecture"
---
# World Package Contract

Date: 2026-07-30

World Package is the project-level format for moving reusable world content between workspaces. It is not the same as Rule Tree package. Rule Tree package moves rules only; World Package can carry pages, asset references, rule packages, metadata, dependencies and future fork/workshop data.

## Goals

- Export a readable, portable set of world data.
- Preview import before writing anything into workspace.
- Detect page conflicts before import.
- Require backup before future import writes data.
- Keep package metadata separate from runtime UI.
- Prepare a simple path to future Workshop and forked worlds.

## Storage

World packages are stored inside workspace:

```text
world-packages/
  starter-heroes.world-package.json
```

The storage layer is `js/worldPackage/worldPackageStorage.js`.

## Format

```json
{
  "version": 1,
  "packageId": "starter-heroes",
  "title": "Starter Heroes",
  "description": "",
  "createdAt": "2026-07-07T00:00:00.000Z",
  "updatedAt": "2026-07-07T00:00:00.000Z",
  "scope": "selection",
  "metadata": {
    "author": "",
    "tags": [],
    "license": ""
  },
  "fork": null,
  "dependencies": [],
  "contents": {
    "pages": [],
    "assets": [],
    "rulePackages": []
  }
}
```

## Contents

`contents.pages` stores portable page records:

- `id`
- `title`
- `parent`
- `order`
- `template`
- `type`
- `tags`
- `aliases`
- `body`

`contents.assets` stores workspace-relative asset references. Asset files are not duplicated by the model layer yet; future import/export UI must copy files through the Asset Lifecycle contract.

`contents.rulePackages` stores embedded Rule Tree package data for combined exports. Current import applies these packages into `rule-packages/` after backup. If a package id already exists, the importer writes a copied id such as `core-rules-import` instead of overwriting the existing file.

## Import Preview

`createWorldPackageImportPreview()` is the required first step before import.

It returns:

- package title and id;
- counts for pages, assets, rules, dependencies and conflicts;
- new pages;
- page conflicts by id/title;
- `requiresBackup: true`;
- planned actions.

No import should write to workspace before:

1. showing preview;
2. creating backup;
3. applying import;
4. running workspace validation.

Current UI apply boundary:

- `Tools -> Пакеты мира` opens `#worldPackagePopup[data-world-package-ui-migration="0.0.1.8.14.6"]`.
- The UI may export a current page branch or the whole workspace page set into `world-packages/*.world-package.json`.
- The UI may apply package pages and embedded rulePackages after preview and backup.
- Page conflicts are resolved by an explicit mode:
  - `block` is the default and blocks apply when any package page conflicts by id/title.
  - `skip` imports only non-conflicting package pages. If a new imported child points to a skipped parent whose id already exists in the workspace, the child may attach to that existing parent; otherwise the parent is cleared.
  - `copy` imports conflicting package pages as new copies with unique ids, unique titles when needed and rewired parent links for imported descendants.
- No current mode overwrites or replaces an existing workspace page.
- Packages with embedded rulePackages save those packages through the existing Rule Tree package storage. Existing rule package files are not overwritten; conflicts become imported copies with unique ids.
- Packages with `contents.assets` run asset preflight before apply. Required missing asset references block import before writing pages or rules. Optional missing references warn and may still import pages/rules. Asset file bytes are not copied by this package format yet.
- Imported page `body` must be sanitized with the persistent save sanitizer before writing PageRecord content.

## Dependencies And Forks

`dependencies` prepares packages that depend on another package, for example a campaign package depending on a core rules package.

`fork` prepares future forked worlds:

- `originPackageId`
- `originVersion`
- `forkedAt`
- `notes`

## Validation

`js/schema/worldPackageSchema.js` validates package collections when they are embedded in a workspace snapshot.

Current validation checks:

- package collection is an array;
- duplicated package ids are errors;
- package pages have ids;
- duplicated package page ids are errors;
- empty page titles are warnings;
- package parent pointing outside the package is a warning.

## Current Status

Implemented:

- package model;
- workspace storage;
- import preview;
- page conflict import strategies: block, skip and copy;
- embedded rulePackage apply without overwriting existing rule package files;
- asset preflight for required/optional asset references;
- dependency report;
- schema validation;
- user-facing `Пакеты мира` manager for export, package library, JSON import preview and backup-gated page/rulePackage import;
- unit and browser tests.

Not implemented yet:

- binary asset file copy/apply from a World Package;
- Workshop/fork publishing.
