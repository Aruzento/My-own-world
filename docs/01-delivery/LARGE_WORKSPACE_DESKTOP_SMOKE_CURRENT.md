---
summary: "Current desktop large workspace smoke report."
read_when:
  - "Before desktop release handoff"
  - "When validating a large GM workspace"
owner_zone: "delivery"
---

# Desktop Large Workspace Smoke Current

Run date: 2026-08-24T18:14:04.453Z

Plan ref: `0.0.1.11.4` (runner introduced in `0.0.1.2.2`)

Workspace: `X:\ДНД\Мастер\По кампаниям\База`

## Automated Read-Only Checks

- workspace diagnostics: passed (424 ms)

- read-only tree probe: passed (141 ms)

## Desktop Environment Checks

- desktop environment: passed (535 ms)
- desktop packaging smoke: passed (277 ms)

## Workspace Summary

- Location: different drive, possible external drive, outside HOME
- Write probe: Write probe OK.
- Access matrix: Workspace on another disk: matched; Workspace in network folder: not-detected; Workspace on external drive: possible; Workspace outside HOME: matched; Read-only / no write access: ok
- Pages: 697
- Campaign maps: 27
- Task trackers: 1
- Assets: 144
- Asset references: 528
- Missing asset references: 0
- Complete backups: 5
- Incomplete backups: 0
- Diagnostics duration: 348 ms

## Manual Native Targets

Open these first during the native Tauri click-through.

### Heavy Maps

- 1779484665129-7a321d25 - 321 KB, tokens: 52, fog zones: 7, file/id: `65424f19-be36-46b9-8a59-79f39a4fc230`
- 1779530830476-a9517dfe - 398 KB, tokens: 0, fog zones: 14, file/id: `c3717b06-5105-45e2-8271-f4ded70a83f2`
- 1779482139467-a52d5cd6 - 200 KB, tokens: 42, fog zones: 5, file/id: `84627022-32c1-4652-ac5a-35eb4d842c85`
- 1779483383627-c77aa6a2 - 204 KB, tokens: 30, fog zones: 7, file/id: `64ab9434-f525-4964-9631-c1f87b2d4f4c`
- 1778954209902-4b0ed25b - 109 KB, tokens: 50, fog zones: 8, file/id: `080c5f78-2bf1-4df8-8a7b-b1ed22eaaee0`

### Large Assets

- `Castle_01.jpg` - 36.9 MB
- `Group 1.png` - 33.7 MB
- `КорабльКаюты.png` - 15.3 MB
- `КорабльВерх.png` - 14.7 MB
- `Деревня full_01.jpg` - 10.3 MB

### Diagnostics Warnings

- large_pages (2): Some pages are larger than 250 KB. Examples: 1779484665129-7a321d25 321 KB; 1779530830476-a9517dfe 398 KB.
- large_assets (4): Some assets are larger than 12 MB. Examples: Castle_01.jpg 36.9 MB; Group 1.png 33.7 MB; КорабльВерх.png 14.7 MB.
- broken_internal_links (71): Some pages contain internal page/wiki/relationship references that cannot be resolved. Examples: {"category":"broken-internal-link","id":"09fdb47b-e87c-47dc-9698-e8b86414fdc2:wiki:0:TARGET_PAGE_MISSING","linkType":"wiki","reason":"TARGET_PAGE_MISSING","sourcePageId":"09fdb47b-e87c-47dc-9698-e8b86414fdc2","sourcePageTitle":"1778779456009","owner":{"pageId":"09fdb47b-e87c-47dc-9698-e8b86414fdc2","pageTitle":"1778779456009","scope":"wiki","entityId":"0"},"originalTarget":"очарованный","targetId":"","targetTitle":"очарованный","displayText":"очарованный","relationshipType":"","locator":{"kind":"html-anchor","index":0,"sourcePageId":"09fdb47b-e87c-47dc-9698-e8b86414fdc2","linkType":"wiki"},"index":0,"candidateCount":0}; {"category":"broken-internal-link","id":"66d2de88-7334-4170-99f5-a83be2359e2d:wiki:1:TARGET_PAGE_MISSING","linkType":"wiki","reason":"TARGET_PAGE_MISSING","sourcePageId":"66d2de88-7334-4170-99f5-a83be2359e2d","sourcePageTitle":"1778779858337","owner":{"pageId":"66d2de88-7334-4170-99f5-a83be2359e2d","pageTitle":"1778779858337","scope":"wiki","entityId":"1"},"originalTarget":"вампиризма","targetId":"","targetTitle":"вампиризма","displayText":"вампиризма","relationshipType":"","locator":{"kind":"html-anchor","index":1,"sourcePageId":"66d2de88-7334-4170-99f5-a83be2359e2d","linkType":"wiki"},"index":1,"candidateCount":0}; {"category":"broken-internal-link","id":"f26b2459-4c2b-4b55-a864-8aa27cc0f092:wiki:0:TARGET_PAGE_MISSING","linkType":"wiki","reason":"TARGET_PAGE_MISSING","sourcePageId":"f26b2459-4c2b-4b55-a864-8aa27cc0f092","sourcePageTitle":"1778781578514","owner":{"pageId":"f26b2459-4c2b-4b55-a864-8aa27cc0f092","pageTitle":"1778781578514","scope":"wiki","entityId":"0"},"originalTarget":"Рацион","targetId":"","targetTitle":"Рацион","displayText":"Рацион","relationshipType":"","locator":{"kind":"html-anchor","index":0,"sourcePageId":"f26b2459-4c2b-4b55-a864-8aa27cc0f092","linkType":"wiki"},"index":0,"candidateCount":0}.
- heavy_maps: At least one map has many render objects or a large page payload. Examples: 1779484665129-7a321d25 321 KB; 1779530830476-a9517dfe 398 KB; 1779482139467-a52d5cd6 200 KB.

## Tree Probe Summary

- Pages: 697
- Root pages: 10
- pages.readDirectory: 1 ms
- pages.readAndParse: 95 ms
- tree.buildParentIndex: 0 ms

## Desktop Artifacts

- Release executable: exists - `src-tauri/target/release/my-own-world.exe`
- Installer: exists - `src-tauri/target/release/bundle/nsis/MyOwnWorld_0.0.0_x64-setup.exe`

## Manual Native Desktop Checklist

Use a copied workspace for destructive checks.

- [ ] Start `src-tauri\target\release\my-own-world.exe` or install the latest NSIS installer.
- [ ] Select the large workspace.
- [ ] Open settings and run `Диагностика workspace`.
- [ ] Confirm the diagnostics panel shows workspace path, write access, schema, checkpoint, backups and last operation.
- [ ] Scroll the tree from top to bottom.
- [ ] Search a known page.
- [ ] Use `Найти в дереве` from an opened card.
- [ ] Open a heavy campaign map from the report.
- [ ] Confirm map background images render.
- [ ] Confirm token/object images render.
- [ ] Open presentation mode.
- [ ] Confirm fog/layer order and visible map sync.
- [ ] Play one normal playlist track and one battle playlist track if the map has music.
- [ ] Create a manual backup from settings.
- [ ] On a workspace copy only: create a temporary page, move it, then delete it.
- [ ] Close and reopen the app, then reopen the same workspace.

## Pass Rule

- Automated checks must be green.
- No missing asset references for normal release handoff.
- Any visible operation above 2 seconds must show progress or a clear status message.
- The app must not feel frozen during tree scroll, search, map open, presentation open, backup or page move/delete.
- Destructive checks must never run on the only important workspace copy.

## Native WebView Runner

This runner covers the CLI/measurable side. Run `npm run desktop:native-smoke -- --workspace "<workspace path>"` after `npm run desktop:build` to click through the real Tauri WebView, open a heavy map, open presentation, and catch failed WebView resources.
