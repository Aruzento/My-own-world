---
summary: "Real large workspace desktop smoke and performance probe results."
read_when:
  - "Before large workspace performance work"
  - "Before desktop release verification"
owner_zone: "delivery"
---

# Large Workspace Desktop Smoke 2026-07-14

Plan ref: `0.0.1.1.1`

Workspace:

`X:\ДНД\Мастер\База`

## Result

Status: partially passed.

The real workspace is accessible, file-level load/move/delete operations are fast, backup health is clean, and the desktop executable starts. A full visible Tauri click-through is still not completed because the project does not yet have an automated Tauri UI runner and the current agent cannot confirm visual desktop interactions inside the native window.

## Workspace Shape

- Pages: `691`
- Root pages: `4`
- Campaign maps detected: `24`
- Task trackers detected: `2`
- Properties blocks detected: `8`
- Pages with image refs: `669`
- Pages with music refs: `3`
- Pages over 200 KB: `5`
- Assets: `138` files
- Assets size: `458.6 MB`
- Backups: `13` complete, `0` incomplete

Largest assets:

- `Castle_01.jpg` - `38.7 MB`
- `Group 1.png` - `35.3 MB`
- `КорабльКаюты.png` - `16.0 MB`
- `КорабльВерх.png` - `15.4 MB`
- `Деревня full_01.jpg` - `10.8 MB`

Largest pages:

- `1779530830476-a9517dfe.md` - `407951` bytes
- `1779484665129-7a321d25.md` - `328974` bytes
- `1779500977373-e5559b78.md` - `212823` bytes
- `1779483383627-c77aa6a2.md` - `208446` bytes
- `1779482139467-a52d5cd6.md` - `204860` bytes

## File-Level Probe

Command:

`node tools\probe_large_workspace_tree_performance.mjs --workspace "X:\ДНД\Мастер\База" --mutate`

Result:

- `pages.readDirectory`: `1 ms`
- `pages.readAndParse`: `108 ms`
- `tree.buildParentIndex`: `0 ms`
- `probe.createTempPages`: `1 ms`
- `probe.moveTempPage`: `0 ms`
- `probe.deleteTempPages`: `0 ms`

The probe created temporary `perf-probe-*` pages, moved one by changing parent/order, and removed them. No `perf-probe-*.md` files remained afterward.

## Desktop Probe

Prepared desktop frontend:

`npm run desktop:prepare`

Executable:

`C:\Users\Aruko\Documents\New project\My own world\src-tauri\target\release\my-own-world.exe`

Result:

- executable started;
- executable was still alive after 8 seconds;
- process was stopped after the launch probe.

## Interpretation

The earlier feeling that move/delete "does not work" is unlikely to be caused by raw file writes. On the real workspace, direct page create/move/delete is effectively instant.

Most likely bottlenecks:

1. UI tree render/re-render around a large tree.
2. Asset checks or image URL resolving on pages with many image refs.
3. Map opening with large background images.
4. Presentation startup and asset sync.
5. Backup creation around risky operations, especially if it copies many assets.
6. Missing progress feedback while any of the above runs.

## Still Not Verified

- visible desktop workspace picker;
- visible tree scroll/search/find-in-tree in the native window;
- real drag/drop move from the native desktop UI;
- real context-menu delete from the native desktop UI;
- opening one of the heavy maps in the native desktop UI;
- opening presentation mode from a heavy map;
- real audio playback in desktop.

## Next

Continue with targeted large-workspace hardening:

1. Add a permanent large-workspace performance smoke with fixture generation and budgets.
2. Add progress UI for long operations.
3. Add a desktop-visible manual checklist or future Tauri UI runner for the native window.
4. Add image/map asset performance diagnostics.
