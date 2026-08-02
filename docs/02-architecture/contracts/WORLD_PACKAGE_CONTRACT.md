---
summary: "Contract for portable World Package export/import foundation."
read_when:
  - "When changing World Package export/import"
  - "When adding reusable content packs"
  - "Before connecting Workshop or package import UI"
owner_zone: "architecture"
---
# World Package Contract

Date: 2026-08-02

World Package is the project-level format for moving reusable world content between workspaces. It is not the same as Rule Tree package. Rule Tree package moves rules only; World Package can carry pages, asset references with optional file payloads, rule packages, metadata, dependencies and future fork/workshop data.

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

`contents.assets` stores workspace-relative asset references. New packages may also include an optional binary payload:

```json
{
  "path": "portraits/hero.png",
  "type": "portrait",
  "owner": {
    "pageId": "hero",
    "entityId": "",
    "scope": "card"
  },
  "required": true,
  "payload": {
    "encoding": "base64",
    "mediaType": "image/png",
    "bytes": "..."
  }
}
```

`payload.encoding` must be `base64`, and `payload.bytes` must contain valid base64 data after whitespace is removed. `path` remains the persistent reference used by page HTML or JSON. If it does not start with `assets/`, storage operations still read/write the physical file under `assets/<path>`. Older reference-only packages remain valid: required missing references still block import, optional missing references still warn, and existing readable workspace files can still satisfy the reference.

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

- `Tools -> Пакеты мира` opens `#worldPackagePopup[data-world-package-ui-migration="0.0.1.8.14.7"]`.
- The UI may export a current page branch or the whole workspace page set into `world-packages/*.world-package.json`, including readable asset payloads referenced by those pages.
- The UI may apply package pages and embedded rulePackages after preview and backup.
- Page conflicts are resolved by an explicit mode:
  - `block` is the default and blocks apply when any package page conflicts by id/title.
  - `skip` imports only non-conflicting package pages. If a new imported child points to a skipped parent whose id already exists in the workspace, the child may attach to that existing parent; otherwise the parent is cleared.
  - `copy` imports conflicting package pages as new copies with unique ids, unique titles when needed and rewired parent links for imported descendants.
- No current mode overwrites or replaces an existing workspace page.
- Packages with embedded rulePackages save those packages through the existing Rule Tree package storage. Existing rule package files are not overwritten; conflicts become imported copies with unique ids.
- Packages with `contents.assets` run asset preflight before apply. Required missing assets block import only when neither the workspace nor the package payload can provide the file. Optional missing references warn and may still import pages/rules/assets.
- Invalid or unsupported asset payloads are treated as unavailable payloads. If the asset is required and the workspace cannot read the target file, apply is blocked before pages, rulePackages or assets are written.
- Asset payloads are written through `StorageAdapter.writeBinary()` only after a backup manifest exists.
- Asset import is non-destructive. If the target asset file already exists, the importer writes a copied path such as `portraits/hero-import.png` / `assets/portraits/hero-import.png` instead of overwriting the existing file.
- When an imported asset path changes because of a non-destructive copy, imported page bodies are rewritten from the source asset reference to the final reference before the persistent HTML sanitizer writes the PageRecord.
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
- asset payload export/import through `StorageAdapter.readBinary()` and `StorageAdapter.writeBinary()`;
- non-destructive asset copy with imported page reference rewrite;
- dependency report;
- schema validation;
- user-facing `Пакеты мира` manager for export, package library, JSON import preview and backup-gated page/rulePackage/asset import;
- unit and browser tests.

Not implemented yet:

- Workshop/fork publishing.
