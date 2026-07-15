---
summary: "Repeatable desktop large workspace smoke procedure."
read_when:
  - "Before desktop release handoff"
  - "When testing a large GM workspace"
  - "When investigating large workspace desktop performance"
owner_zone: "delivery"
---

# Desktop Large Workspace Smoke

Plan ref: `0.0.1.2.3`

This is the repeatable smoke path for a real large GM workspace. It has two parts:

1. Automated read-only checks that can be run from the project.
2. Manual native desktop click-through that must be done in the Tauri window.

The automated runner never mutates the workspace.

## Command

```powershell
cd "C:\Users\Aruko\Documents\New project\My own world"
npm run desktop:large-workspace-smoke -- --workspace "X:\ДНД\Мастер\База"
```

Default report:

```text
docs/01-delivery/LARGE_WORKSPACE_DESKTOP_SMOKE_CURRENT.md
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

## Manual Native Desktop Checklist

Use a copied workspace for destructive checks.

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

This procedure still needs a human for native Tauri UI clicks. Browser Playwright cannot inspect the native desktop WebView. A future Tauri UI automation runner can replace the manual part, but until then the generated report plus this checklist is the source of truth.
