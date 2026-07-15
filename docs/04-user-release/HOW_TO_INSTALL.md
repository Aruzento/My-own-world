---
summary: "User-facing install, update, and handoff guide for desktop builds."
read_when:
  - "Before release handoff"
  - "When sending the desktop app to another person"
  - "When updating an installed desktop build"
owner_zone: "user-release"
---

# How To Install

This guide is for the desktop build of MyOwnWorld.

## What To Send

Send this file to another person when you want to share the app as a normal Windows program:

```text
src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe
```

This is the installer. It is the recommended file for testers and other users.

The raw executable is here:

```text
src-tauri\target\release\my-own-world.exe
```

Use the raw executable only for quick local checks by the developer. For another person, use the installer.

## What Is Not Inside The Installer

The installer contains the app, not your world.

Your workspace is still a separate folder that you choose inside the app. If you want another person to test with a real world, send a copy or archive of that workspace separately.

Do not ask a tester to open the only important copy of a world. Give them a copy.

## Build The Installer

From the project folder:

```powershell
cd "C:\Users\Aruko\Documents\New project\My own world"
npm run desktop:gate
npm run desktop:build
```

For a large GM workspace handoff, include that workspace in the gate before building:

```powershell
npm run desktop:gate -- --workspace "X:\ДНД\Мастер\База"
```

The gate writes:

```text
docs\01-delivery\DESKTOP_RELEASE_GATE_CURRENT.md
```

Do not send an installer if the gate report says `FAILED`.

Expected installer:

```text
C:\Users\Aruko\Documents\New project\My own world\src-tauri\target\release\bundle\nsis\MyOwnWorld_0.0.0_x64-setup.exe
```

Before sending it to someone else, open the installer build locally once and run a short smoke test.

## First Install

1. Run `MyOwnWorld_0.0.0_x64-setup.exe`.
2. Start MyOwnWorld from the Start menu or desktop shortcut.
3. Click the workspace button.
4. Select a workspace folder.
5. Wait for the tree to load.
6. Open a card and a map.

If the app asks for file access, allow it. The desktop app needs access to the workspace folder you selected.

## Update Existing Install

Use this flow when installing a newer build over an older build.

1. Close MyOwnWorld.
2. Make a manual backup in the current app, or copy the workspace folder.
3. Run the new `MyOwnWorld_0.0.0_x64-setup.exe`.
4. Open MyOwnWorld.
5. Select the same workspace.
6. Run the quick update smoke below.

The update should not move or delete the workspace. The workspace lives outside the app.

## Quick Update Smoke

After install or update, check:

1. App opens.
2. Workspace picker opens.
3. Existing workspace loads.
4. Tree scroll and search work.
5. A card opens and saves text changes.
6. A map opens with images.
7. Presentation mode opens.
8. Music playlist can play a track if the workspace has music.
9. Manual backup can be created from settings.

For a large workspace, also check one small create, move, and delete on a copy of the workspace.

## Rollback

If the new build is bad:

1. Close MyOwnWorld.
2. Install the previous known-good installer.
3. Open the same workspace.
4. If the workspace itself was changed during testing, restore from the manual backup or the copied workspace folder.

The app installer rollback and the workspace rollback are separate actions.

## Browser Version

For browser development checks:

```powershell
npm run dev:web
```

Then open:

```text
http://127.0.0.1:5173/
```

Browser mode is useful for development, but user handoff should use the desktop installer.
