---
summary: "Large GM workspace desktop verification update for 0.0.1.1.1."
read_when:
  - "Before desktop large workspace work"
  - "Before closing 0.0.1.1.1"
owner_zone: "delivery"
---

# Large Workspace Desktop Smoke 2026-07-15

Plan ref: `0.0.1.1.1`

Workspace:

`X:\ДНД\Мастер\База`

## Result

Status: engineering pass, native desktop window launched, visible UI pass still requires owner confirmation or a future native UI runner.

What is confirmed:

- The real workspace is accessible.
- Read-only page scan is fast.
- Workspace diagnostics are fast and clean for missing assets/backups.
- Desktop environment is ready.
- Desktop packaging smoke is green.
- Full desktop release gate is green.
- The built executable starts.

What is not honestly confirmable from the current agent environment:

- visible workspace picker click-through;
- visual tree scroll/search/find-in-tree in the native Tauri window;
- real mouse drag/drop in the native Tauri window;
- real context-menu delete in the native Tauri window;
- opening a heavy map visually in desktop;
- opening presentation visually in desktop;
- listening to desktop audio playback.

The remaining checks need either manual owner pass or a future Tauri UI automation runner. The current browser automation covers the web runtime, but it cannot see or click inside the native desktop window.

## 2026-07-15 Current Run

Native executable launched from:

`C:\Users\Aruko\Documents\New project\My own world\src-tauri\target\release\my-own-world.exe`

The owner-visible desktop window was started from the current Codex session. Because the agent cannot inspect the native Tauri WebView directly, this does not by itself prove the click-through items below. It only confirms that the current release executable can be opened for the manual pass.

## Workspace Diagnostics

Command:

`npm run diagnostics:workspace -- --workspace "X:\ДНД\Мастер\База" --no-json`

Result:

- Duration: `166 ms`
- Pages: `691`
- Root pages: `4`
- Campaign maps: `24`
- Task trackers: `2`
- Rule trees: `0`
- Assets: `138`
- Asset size: `480,859,819 bytes` (`458.6 MB`)
- Asset references: `527`
- Missing asset references: `0`
- Backups: `13` complete, `0` incomplete
- Warnings: `3`

Warnings:

- `large_pages`: 2 pages above 250 KB.
- `large_assets`: 4 assets above 12 MB.
- `heavy_maps`: at least one map has many render objects or a large page payload.

Largest assets:

- `Castle_01.jpg` - `38.7 MB`
- `Group 1.png` - `35.3 MB`
- `КорабльКаюты.png` - `16.0 MB`
- `КорабльВерх.png` - `15.4 MB`
- `Деревня full_01.jpg` - `10.8 MB`

Heaviest map pages:

- `1779484665129-7a321d25.md` - `328,974 bytes`, `52` tokens, `7` fog zones
- `1779530830476-a9517dfe.md` - `407,951 bytes`, `14` fog zones
- `1779482139467-a52d5cd6.md` - `204,860 bytes`, `42` tokens, `5` fog zones
- `1779483383627-c77aa6a2.md` - `208,446 bytes`, `30` tokens, `7` fog zones

## Read-Only Tree Probe

Command:

`node tools\probe_large_workspace_tree_performance.mjs --workspace "X:\ДНД\Мастер\База"`

Result:

- `pages.readDirectory`: `1 ms`
- `pages.readAndParse`: `112 ms`
- `tree.buildParentIndex`: `0 ms`
- Mutation probe: not run.

Reason mutation was not run: this is the real owner workspace. Create/move/delete should be done only on a copy or with explicit approval.

## Desktop Checks

Commands:

- `npm run desktop:check`
- `npm run desktop:packaging-smoke`
- `npm run desktop:gate`

Result:

- Desktop environment: passed.
- Packaging smoke: passed.
- Desktop release gate: passed.
- Browser smoke inside desktop gate: `75` passed.
- Unit tests inside verify: `211` passed.
- Synthetic large workspace smoke inside verify: passed.
- Desktop frontend prepare: passed.
- Cargo check: passed.

Executable:

`C:\Users\Aruko\Documents\New project\My own world\src-tauri\target\release\my-own-world.exe`

Current native launch:

- Visible desktop process was started from Codex.
- Manual owner click-through is still pending.

## Interpretation

The large workspace does not look blocked by raw file IO or page parsing. Current measured costs are small enough that the visible slowness is more likely to come from:

1. native UI rendering or re-rendering;
2. heavy map background/image decode;
3. presentation startup and asset sync;
4. audio/media asset handling;
5. user perception when an operation is waiting without visible feedback.

The new progress panel and in-app diagnostics reduce the "nothing is happening" problem, but the final proof for `0.0.1.1.1` still needs a visible desktop pass.

## Remaining Manual Pass

Use a copy of the workspace for destructive steps.

1. Start `src-tauri\target\release\my-own-world.exe`.
2. Open `X:\ДНД\Мастер\База` or a copy.
3. Scroll the tree top to bottom.
4. Search a known page.
5. Use "find in tree".
6. Open Settings and run workspace diagnostics.
7. Open one of the heavy map pages listed above.
8. Open presentation mode.
9. Play a normal playlist track and a battle playlist track.
10. On a workspace copy only: create a temporary page, move it, delete it.

Pass rule: every operation above 2 seconds must show visible progress/status and must not feel frozen.
