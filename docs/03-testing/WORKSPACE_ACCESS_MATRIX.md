---
summary: "Workspace access matrix for local, external, network and read-only workspace diagnostics."
read_when:
  - "When testing desktop workspace access"
  - "When checking read-only or external workspace failures"
owner_zone: "testing"
---

# Workspace Access Matrix

Purpose: make workspace access problems understandable to a human. The app should say what kind of workspace path is open and whether it can actually write there.

Run the CLI check:

```bash
node tools/run_workspace_diagnostics.mjs --workspace "X:\ДНД\Мастер\База" --json false
```

Use this when you only want read diagnostics and do not want the tiny write probe:

```bash
node tools/run_workspace_diagnostics.mjs --workspace "X:\ДНД\Мастер\База" --no-write-probe --json false
```

The write probe creates a tiny `.my-own-world-write-probe-*.tmp` file in the workspace root, reads it back, and removes it. If the workspace is read-only, disconnected or blocked by permissions, the report should explain that directly.

## Matrix

| Scenario | What should be checked | Expected result |
| --- | --- | --- |
| Standard local workspace | Path inside user HOME on the main drive | Location says `inside HOME/default disk`; write probe says `OK` if writable. |
| Another disk | Path drive differs from HOME drive, for example `X:\...` while HOME is `C:\Users\...` | Location says `different drive`, `possible external drive`, and `outside HOME`. |
| Network folder | UNC path like `\\server\share\world` | Location says `network folder` and `outside HOME`. |
| External drive | Real removable drive path | Location should usually match `different drive` / `possible external drive`; manual tester records the real device used. |
| Outside HOME | Any workspace outside the user home folder | Location says `outside HOME`, but this is allowed if write probe succeeds. |
| Read-only workspace | Folder without write permission | Write probe says `No write permission for this workspace`; app should not pretend the workspace is fully writable. |
| Disconnected path | External/network path unavailable | Diagnostics should report that the file or folder was not found or the disk/path changed. |

## Current Automated Coverage

- `tests/workspaceAccessDiagnostics.test.mjs` covers another disk, network path, successful write probe, read-only write failure and disconnected-path error text.
- Browser workspace diagnostics panel shows `Location`, `Access matrix` and `Write probe` in the existing diagnostics popup.
- `tools/run_workspace_diagnostics.mjs` includes the same access matrix in JSON and human output.

## Manual Coverage Still Needed

The current automated tests simulate path classes and write errors. Before an external handoff, run the CLI or desktop diagnostics popup on:

- the known large GM workspace;
- one real external drive, if available;
- one real network folder, if available;
- one deliberately read-only test folder.

Record exact paths and outcomes in `WORK_LOG.md` or the release checklist.
