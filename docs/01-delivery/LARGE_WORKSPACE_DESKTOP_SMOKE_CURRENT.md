---
summary: "Current desktop large workspace smoke report."
read_when:
  - "Before desktop release handoff"
  - "When validating a large GM workspace"
owner_zone: "delivery"
---

# Desktop Large Workspace Smoke Current

Run date: 2026-07-19T17:36:08.744Z

Plan ref: `0.0.1.2.2`

Workspace: `X:\ДНД\Мастер\По кампаниям\База`

## Automated Read-Only Checks

- workspace diagnostics: passed (181 ms)

- read-only tree probe: passed (135 ms)

## Desktop Environment Checks

- desktop environment: passed (511 ms)
- desktop packaging smoke: passed (282 ms)

## Workspace Summary

- Location: different drive, possible external drive, outside HOME
- Write probe: Write probe OK.
- Access matrix: Workspace on another disk: matched; Workspace in network folder: not-detected; Workspace on external drive: possible; Workspace outside HOME: matched; Read-only / no write access: ok
- Pages: 690
- Campaign maps: 25
- Task trackers: 0
- Assets: 141
- Asset references: 527
- Missing asset references: 0
- Complete backups: 5
- Incomplete backups: 0
- Diagnostics duration: 133 ms

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
- heavy_maps: At least one map has many render objects or a large page payload. Examples: 1779484665129-7a321d25 321 KB; 1779530830476-a9517dfe 398 KB; 1779482139467-a52d5cd6 200 KB.

## Tree Probe Summary

- Pages: 690
- Root pages: 3
- pages.readDirectory: 1 ms
- pages.readAndParse: 90 ms
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
