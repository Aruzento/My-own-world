---
summary: "Current desktop large workspace smoke report."
read_when:
  - "Before desktop release handoff"
  - "When validating a large GM workspace"
owner_zone: "delivery"
---

# Desktop Large Workspace Smoke Current

Run date: 2026-08-09T22:45:30.927Z

Plan ref: `0.0.1.2.2`

Workspace: `X:\ДНД\Мастер\По кампаниям\2`

## Automated Read-Only Checks

- workspace diagnostics: passed (1686 ms)

- read-only tree probe: passed (75 ms)

## Desktop Environment Checks

- desktop environment: passed (473 ms)
- desktop packaging smoke: passed (250 ms)

## Workspace Summary

- Location: different drive, possible external drive, outside HOME
- Write probe: Write probe OK.
- Access matrix: Workspace on another disk: matched; Workspace in network folder: not-detected; Workspace on external drive: possible; Workspace outside HOME: matched; Read-only / no write access: ok
- Pages: 287
- Campaign maps: 15
- Task trackers: 0
- Assets: 76
- Asset references: 463
- Missing asset references: 0
- Complete backups: 20
- Incomplete backups: 0
- Diagnostics duration: 1646 ms

## Manual Native Targets

Open these first during the native Tauri click-through.

### Heavy Maps

- 1783847921808-d1f31b78 - 400 KB, tokens: 0, fog zones: 17, file/id: `9f32ba81-0bce-4b86-b66d-0c634427719d`
- 1783801969130-3f86616f - 156 KB, tokens: 32, fog zones: 9, file/id: `59e2ffdd-8492-4fa2-b9e5-cce7fb0cc1e3`
- 1783801971380-3065331b - 153 KB, tokens: 26, fog zones: 9, file/id: `71018711-d0bf-4d0b-9d88-42fb3bc583d5`
- 1783801648004-f52fe318 - 149 KB, tokens: 22, fog zones: 9, file/id: `f8f6b0a9-0f80-41e2-9634-0a53dddd4728`
- 1783808813695-5bd02537 - 148 KB, tokens: 16, fog zones: 9, file/id: `cc750c06-13ce-48a2-a99c-a8b128aecb5a`

### Large Assets

- `music/HOYO-MiX_Yu-Peng_Chen_-_Rite_of_Battle_74698732.mp3` - 10.0 MB
- `music/HOYO-MiX - Irresistible Force _audiovk.com_.mp3` - 9.6 MB
- `music/HOYO-MiX - Inevitable Conflict _audiovk.com_.mp3` - 9.5 MB
- `music/HOYO-MiX_Yu-Peng_Chen_-_Caelestinum_Finale_Termini_74698725.mp3` - 8.0 MB
- `Улица у воды.jpg` - 5.0 MB

### Diagnostics Warnings

- large_pages (1): Some pages are larger than 250 KB. Examples: 1783847921808-d1f31b78 400 KB.

## Tree Probe Summary

- Pages: 287
- Root pages: 8
- pages.readDirectory: 1 ms
- pages.readAndParse: 35 ms
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
