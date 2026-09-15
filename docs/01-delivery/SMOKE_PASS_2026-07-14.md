---
summary: "Historical stabilization smoke evidence from 2026-07-14."
read_when:
  - "When investigating the dated 0.0.1.0.2 stabilization evidence"
owner_zone: "delivery"
---

# Smoke Pass 2026-07-14

Plan ref: `0.0.1.0.2`

## Result

Status: passed with limitations.

The browser and desktop release gate are green. A real installed-app workspace walkthrough on the large GM workspace is still not completed and remains in the plan as `0.0.1.1.1`.

## Browser

### Automated Browser Smoke

Command: `npm run test:browser`

Result: passed as part of `npm run desktop:gate`.

Coverage snapshot:

- app shell;
- tree delete, DnD planning, and virtualization;
- campaign map save/reload, presentation sync, fog, layers, drawing, selection, music, and initiative;
- editor formatting and history;
- properties block settings, drag/resize, calculations, effects, and character sheet edits;
- task tracker persistence and legacy JSON preservation;
- safe HTML and schema recovery;
- knowledge graph creation and orphan view;
- popup lifecycle and visual layout guards.

### Manual Browser Probe

Method: temporary local static server plus Playwright probe.

Checked:

- app shell exists;
- sidebar exists;
- topbar exists;
- `+` create menu opens;
- create menu shows `Карточка`, `Карта`, `Таски`, `Правила`, `Граф связей`;
- statusbar renders;
- no browser console errors were captured during the probe.

Limitation: the Codex in-app browser refused `http://127.0.0.1:5173/` with `ERR_BLOCKED_BY_CLIENT`, so the manual browser probe used Playwright instead.

## Desktop

### Desktop Gate

Command: `npm run desktop:gate`

Result: passed.

Included checks:

- `npm run verify`;
- browser smoke: 72 passed;
- `npm run desktop:prepare`;
- `npm run desktop:packaging-smoke`;
- `npm run desktop:check`;
- `cargo check` in `src-tauri`.

Desktop environment detected:

- Node.js: `v24.15.0`;
- npm: `11.12.1`;
- Tauri CLI: `2.11.2`;
- Rust/Cargo: `1.96.0`;
- Visual Studio Build Tools C++;
- Windows SDK.

### Executable Launch Probe

Executable:

`C:\Users\Aruko\Documents\New project\My own world\src-tauri\target\release\my-own-world.exe`

Result: the executable started and stayed alive for 5 seconds. It was then stopped by the smoke command.

Limitation: this was a launch probe, not a full desktop click-through with a real workspace.

## Not Fully Verified Yet

- real desktop UI workflow on `X:\ДНД\Мастер\База`;
- installed-app update path;
- real map presentation in a visible desktop window;
- real desktop audio playback from user-selected files;
- real legacy task tracker pages from the user's workspace;
- old `WORK_LOG.md` entries still display as mojibake in terminal output and should be cleaned separately.

## Next

Continue with `0.0.1.0.3`: fix confirmed P0/P1 broken flows before new feature work.
