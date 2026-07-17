# MyOwnWorld

MyOwnWorld is a local-first workspace app for tabletop campaigns and worldbuilding. It stores cards, maps, task boards, assets, backups and rules in a user-selected workspace so the same world can be opened in the browser build or the Tauri desktop app.

The project is in version-1 stabilization. Browser workflows remain supported, and desktop is now a real product path with packaging checks and an installer build. Some release-hardening work is still active, especially large-workspace desktop verification, page lifecycle commands and map reliability.

## Quick Start

Install dependencies:

```powershell
npm install
```

Run the browser app:

```powershell
npm run dev:web
```

Open `http://127.0.0.1:5173/`.

Run the desktop app in development:

```powershell
npm run desktop:dev
```

Build the desktop installer:

```powershell
npm run desktop:build
```

After a successful build, the Windows installer is created under `src-tauri/target/release/bundle/nsis/`.

## Checks

Core verification:

```powershell
npm run verify
npm run test:browser
```

Desktop release gate:

```powershell
npm run desktop:check
npm run desktop:packaging-smoke
npm run desktop:gate
```

Documentation and agent workflow:

```powershell
npm run docs:index
npm run agents:validate
npm run check:encoding
```

For a real release candidate, run `npm run desktop:gate` and then test the built desktop app on a real workspace with images, maps, presentation mode and music.

## Workspace Data

A workspace is a normal folder outside the project. It contains markdown pages, assets, backups, rules and package files. Keep real campaign workspaces outside the repository so dev tools do not watch or commit campaign data.

Desktop file access is bounded by a Rust-managed workspace root. Frontend code should pass workspace-relative paths to desktop commands, not arbitrary absolute roots.

## Documentation

Current project truth lives in:

- `docs/00-product/PRODUCT_DASHBOARD.md` - current product focus.
- `docs/01-delivery/PROJECT_PLAN.md` - active unfinished plan.
- `docs/01-delivery/WORK_LOG.md` - completed work history.
- `docs/01-delivery/BUG_INVENTORY.md` - current stabilization risks.
- `docs/01-delivery/DEFINITION_OF_DONE.md` - readiness levels for task completion.
- `docs/04-user-release/` - user-facing release and installer notes.
- `docs/archive/` - old plans and retired material, not current truth.

## AI / Codex Workflow

Before a task, Codex should read `AGENTS.md`, the product dashboard, the active plan, the work log and relevant architecture contracts.

Typical scenarios live in `.agents/skills/`. Documentation should include `summary`, `read_when` and `owner_zone` metadata. Use:

```powershell
node tools/docs_index.mjs
node tools/validate_agent_skills.mjs
node tools/safe_commit.mjs
```

Task completion must name a readiness level: `Foundation`, `MVP`, `Usable` or `Release-ready`. Do not remove partial work from the active plan; split the remaining work into the next actionable item.
