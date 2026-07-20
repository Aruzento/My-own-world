---
summary: "Repeatable desktop large workspace smoke procedure."
read_when:
  - "Before desktop release handoff"
  - "When testing a large GM workspace"
  - "When investigating large workspace desktop performance"
owner_zone: "delivery"
---

# Desktop Large Workspace Smoke

Plan ref: `0.0.1.2.2`

This is the repeatable smoke path for a real large GM workspace. It has three parts:

1. Automated read-only checks that can be run from the project.
2. Automated native desktop click-through through the real Tauri WebView.
3. Optional human pass for subjective smoothness and audio/output devices.

The automated runner does not change durable workspace content. It may create, read and remove one tiny `.my-own-world-write-probe-*.tmp` file to verify write access.

## Command

```powershell
cd "C:\Users\Aruko\Documents\New project\My own world"
npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"
npm run desktop:native-smoke -- --workspace "X:\ДНД\Мастер\По кампаниям\База"
```

The older planned paths `X:\ДНД\Мастер\База` and `X:\ДНД\Мастер\По кампаниям\2` are stale for the current owner pass.

Default report:

```text
docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md
docs/01-delivery/DESKTOP_NATIVE_CLICKTHROUGH_CURRENT.md
```

If the real workspace is not mounted, run the command later when the disk is available. The runner must fail fast instead of pretending that the smoke passed.

## What The Runner Checks

- workspace diagnostics;
- pages, maps, task trackers and assets count;
- missing asset references;
- complete and incomplete backups;
- read-only tree parsing and parent-index timing;
- desktop environment;
- desktop packaging smoke;
- presence of the current release executable and installer.

## What The Native Runner Checks

- launches `src-tauri\target\release\my-own-world.exe`;
- restores the selected workspace in the desktop adapter;
- opens settings and refreshes workspace diagnostics;
- scrolls/searches the tree;
- opens the heaviest campaign map target from the workspace;
- opens the Tauri presentation window;
- fails if a normal page resource returns a failed response.

## Manual Native Desktop Checklist

Use this as an owner feel-check after the automated native runner. Use a copied workspace for destructive checks.

1. Start `src-tauri\target\release\my-own-world.exe` or install the latest NSIS installer.
2. Select the large workspace.
3. Open settings and run `Диагностика workspace`.
4. Confirm the diagnostics panel shows workspace path, write access, schema, checkpoint, backups and last operation.
5. Scroll the tree from top to bottom.
6. Search a known page.
7. Use `Найти в дереве` from an opened card.
8. Open a heavy campaign map from the generated report.
9. Confirm map background images render.
10. Confirm token/object images render.
11. Open presentation mode.
12. Confirm fog/layer order and visible map sync.
13. Play one normal playlist track and one battle playlist track if the map has music.
14. Create a manual backup from settings.
15. On a workspace copy only: create a temporary page, move it, then delete it.
16. Close and reopen the app, then reopen the same workspace.

## Pass Rule

- Automated checks are green.
- No missing asset references for normal release handoff.
- The diagnostics panel can explain the current workspace state in one click.
- Any visible operation above 2 seconds shows progress or a clear status message.
- Tree scroll, search, map open, presentation open, backup and page move/delete must not feel frozen.
- Destructive checks never run on the only important workspace copy.

## Known Limit

The native runner proves the click path and resource loading through WebView2, but it does not judge subjective smoothness, speaker/output-device behavior, or destructive create/move/delete flows on the only important workspace copy.
