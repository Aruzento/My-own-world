---
summary: "Contract for fast workspace mutations, lightweight rollback snapshots, indexes, and background validation."
read_when:
  - "Before changing tree create/move/delete/rename"
  - "Before changing backup, recovery, workspace load, or large-workspace performance"
owner_zone: "architecture"
---

# Lightweight Workspace Operations Contract

Date: 2026-07-19

Plan refs: workspace operation hardening and active page lifecycle work.

Implementation status:

- `0.0.1.1.1`: implemented `PageCommandService` as the explicit command boundary for create, rename/update-content, aliases, single move, batch move and delete branch operations.
- `0.0.1.1.2`: implemented `PageRecord` as the shared page markdown parser/serializer/update boundary for main page creation, scanning, save and metadata update paths.
- `0.0.1.1.3`: implemented required PageRecord metadata fields: `schemaVersion`, `updatedAt` and diagnostic `contentHash`.
- `0.0.1.1.4`: implemented page trash and undo foundation for delete, move and rename operations.
- `0.0.1.1.6`: implemented write revisions for page content saves and visible save states for autosave/special-save flows.
- Historical lightweight operations work already implemented `TreeIndex`, `.my-own-world-ops/` operation journal, lightweight create/move journal entries, background checkpoint queue, tree order compaction and performance gates.
- Remaining: recovery UI for pending journal entries.

## Goal

MyOwnWorld is a local-first desktop workspace. User actions must feel immediate even on a large world.

The application must not pay the cost of a full workspace backup, full workspace parse, or full tree rebuild for ordinary local operations like reordering a page, renaming one page, or creating one page.

The safety model is layered:

1. In-memory indexes for fast reads.
2. Atomic or queued single-file writes for local mutations.
3. Lightweight operation journal for recoverable metadata changes.
4. Small rollback snapshots and page trash for directly affected pages.
5. Full workspace backup only for destructive bulk, schema, restore, import, repair, and asset-wide operations.
6. Background validation and checkpointing outside the pointer/click hot path.

## Non-Goals

- This contract does not remove manual backup/restore.
- This contract does not make risky recovery automatic without confirmation.
- This contract does not introduce sync or multi-device collaboration.
- This contract does not require SQLite or a database migration.
- This contract does not allow silent repair of user data.

## Hot Path Rule

The hot path is the direct user action between pointer/key/click and visible UI completion.

The hot path must not:

- scan every page file;
- parse the whole workspace;
- create a full workspace backup;
- copy all assets;
- rebuild every UI row when a smaller update is enough;
- run schema recovery;
- run asset orphan detection;
- run order compaction;
- block on diagnostic work that can run later.

The hot path may:

- update in-memory state;
- update `PageRepository` / `PageIndex`;
- update `TreeIndex`;
- write one changed page file;
- append one small operation journal record;
- write one small rollback snapshot for the directly affected page or relationship;
- show a progress panel if the operation crosses a visible threshold.

## Operation Safety Tiers

## PageCommandService Contract

`PageCommandService` is the command boundary for page mutations.

Command phases:

1. `validate`
2. `createRollback`
3. `apply`
4. `persist`
5. `updateIndexes`
6. `publishEvent`

Rules:

- user-facing create, rename/update-content, aliases, tree move, batch move and delete branch operations must enter through the service;
- command events record type, affected page ids, phase order, status, duration and error;
- command rollback hooks must restore in-memory state when a command fails before durable recovery takes over;
- existing operation journal and full/scoped backup rules still apply inside the command;
- undo entries record type, affected page ids, label and a callable rollback action for the current session;
- `rename-page` undo restores the previous metadata and file content;
- tree move undo restores the previous `parent` and `order` through the PageRecord/write queue path;
- page delete must write a durable trash manifest before removing files.

## Page Trash Contract

Page trash is the scoped restorable snapshot for ordinary page deletion.

Rules:

- delete branch writes `.my-own-world-trash/page-deletes/<trashId>/manifest.json`;
- trashed page files are copied under `.my-own-world-trash/page-deletes/<trashId>/pages/`;
- manifest entries keep `id`, `path`, `name`, `parent`, `order`, `title`, `template`, `type`, `originalPath` and `trashPath`;
- restore writes trashed files back to their original workspace paths and rehydrates runtime page records through `PageRecord`;
- restore must refuse to overwrite an existing page id or existing target file unless explicitly called as internal rollback;
- ordinary page delete should not create `.my-own-world-backups`; trash is the page-scoped rollback artifact;
- full backup is still required for schema repair, package import, restore, asset cleanup and other operations whose blast radius is wider than the known deleted branch.

## PageRecord Pipeline Contract

`PageRecord` is the serialization boundary for workspace page markdown files.

Rules:

- page front matter parsing, serialization and known metadata updates should go through `js/core/pageRecord.js`;
- compatibility callers may use `parseMarkdown`, but new write paths should use PageRecord APIs directly;
- known fields are `id`, `schemaVersion`, `updatedAt`, `contentHash`, `parent`, `order`, `tags`, `template`, `type`, `aliases` and `relationshipsJson`;
- unknown front matter fields must be preserved unless a migration explicitly removes or replaces them;
- new or rewritten pages must stamp the current page `schemaVersion` and `updatedAt`;
- `contentHash` must be recomputed from the persistent page body on PageRecord writes;
- `contentHash` is an incomplete-write diagnostic checksum, not a cryptographic security boundary;
- relationships must serialize through one formatter so typed graph data keeps a stable front matter shape;
- invalid `relationshipsJson` must not be silently erased by unrelated metadata edits;
- persistent body sanitization should be supplied as a PageRecord serialization step when a caller writes user HTML;
- write paths must not rebuild page front matter with ad-hoc string templates or local regexp replacements for known metadata.

Current coverage:

- page creation;
- workspace scan runtime page creation;
- title/body autosave;
- aliases update;
- tree parent/order updates;
- special entity saves for campaign map, task tracker, Rule Tree and Knowledge Graph;
- template-created pages;
- task tracker quick-created pages;
- map token conversion metadata updates.

Known follow-up work:

- move remaining body-only helpers into PageRecord if body serialization becomes fully centralized;
- add migrations and diagnostics for impossible page metadata.

## Write Revision Contract

Every page content save that enters through `persistPageContentCommand()` must reserve a write revision for the page write key before it reaches the queue.

Rules:

- a newer revision for the same page write key supersedes older pending revisions;
- a stale revision must not write the file if it has not started yet;
- if an older revision already wrote before it noticed a newer intent, it must not update runtime `page.content`, PageRepository/PageIndex, undo entries or user-facing "saved" status;
- autosave and special entity save flows should expose `changed`, `saving`, `saved`, `error` and `conflict` through the statusbar;
- write revision state is runtime protection, not durable workspace metadata;
- direct low-level `writePageContent()` callers may omit a revision only when the write is not an autosave/page content race path.

Regression target:

- queued stale writes skip file mutation;
- racing page content commands keep the newest write as runtime and file truth.

### Tier 0: Read And Index Only

No persistent writes.

Examples:

- open workspace;
- build `PageIndex`;
- build `TreeIndex`;
- search;
- wiki-link lookup;
- tree render;
- diagnostics scan.

Rules:

- allowed during startup;
- can run background after startup;
- must not mutate user data;
- may report warnings/errors.
- PageIndex search must use cached search documents and incremental lifecycle updates instead of per-keypress page body parsing.
- Search result rendering may show paths, excerpts and recent/recently edited pages, but these are read-only navigation views.

### Tier 1: Atomic Single-File Write

One user action changes one file and can be rebuilt from the file itself.

Examples:

- autosave current card body;
- same-level tree reorder after fractional order planning;
- map save when the map is stored in one page file;
- task tracker save when stored in one page file;
- simple metadata edit on one page when parent does not change.

Rules:

- no full workspace backup;
- no whole-workspace reload;
- write through the existing write queue;
- update indexes incrementally after the write;
- schedule background validation if needed.

### Tier 2: Lightweight Journal And Rollback Snapshot

The operation changes relationships or metadata where rollback should be available, but the blast radius is small.

Examples:

- move one page to another parent;
- rename one page;
- create one page;
- duplicate one page;
- add one map token that creates or links one page;
- update one asset reference in one page.

Rules:

- append an operation journal record before writing;
- record before/after values for affected page ids and paths;
- write only affected files;
- mark the journal record committed after writes succeed;
- update indexes incrementally;
- on startup, detect incomplete journal entries and offer recovery.

Full workspace backup is not required unless the operation becomes bulk/destructive.

### Tier 3: Full Backup Gate

The operation can delete data, rewrite many files, change schema, or make recovery hard without a complete snapshot.

Examples:

- delete page branch;
- bulk move;
- bulk rename;
- schema upgrade;
- schema repair actions;
- restore;
- world package import;
- asset cleanup/orphan deletion;
- destructive rollback;
- migration that rewrites many page files;
- order compaction that rewrites many siblings, if it cannot be bounded and reversible.

Rules:

- create full backup or scoped backup before mutation;
- stop the operation if backup fails;
- show progress for long-running work;
- repeat validation after mutation;
- write a work log / release note if user behavior changes.

### Tier 4: Background Checkpoint Work

Work that improves consistency, diagnostics, or performance but should not block a normal action.

Examples:

- schema validation after create/move;
- asset broken/orphan scan;
- order compaction;
- backup retention cleanup;
- incomplete backup cleanup scan;
- index consistency check;
- large workspace diagnostics;
- performance report aggregation.

Rules:

- run after the UI action completes;
- run during idle time or in a queue;
- show status only if slow or if an issue is found;
- never silently repair data;
- do not start multiple copies of the same expensive background job.

## Operation Matrix

| Operation | Required tier | Hot-path writes | Backup | Background follow-up |
| --- | --- | --- | --- | --- |
| Open workspace | Tier 0 | none | none | full diagnostics if needed |
| Build `PageIndex` | Tier 0 | none | none | none |
| Build `TreeIndex` | Tier 0 | none | none | detect invalid parent/order |
| Search / wiki lookup | Tier 0 | none | none | none |
| Create page | Tier 2 | one new page file + journal | no full backup | index update, validation |
| Rename page | Tier 2 | one page file + journal | no full backup | index update, duplicate-title check |
| Same-level reorder | Tier 1 | one page file | no full backup | optional order density check |
| Move page to another parent | Tier 2 | one page file + journal | no full backup by default | tree validation |
| Order compaction for one parent | Tier 4 | one sibling set after action | no full backup when bounded to one parent | validation |
| Move many pages | Tier 3 | many page files | full/scoped backup | validation, progress report |
| Delete leaf page | Tier 3 if destructive | trash copy + remove one page file | page trash required; no ordinary backup | validation |
| Delete branch | Tier 3 | trash copy + many deletes | page trash required; no ordinary backup | validation, progress report |
| Card autosave | Tier 1 | one page file | none | none or lightweight validation |
| Map save | Tier 1 | one page file | none | map schema validation |
| Task tracker save | Tier 1 | one page file | none | task schema validation |
| Asset import | Tier 2 | one asset file + owner page | no full backup by default | asset index update |
| Asset cleanup | Tier 3 | deletes assets | full/scoped backup | orphan report |
| Schema repair | Tier 3 | affected files | full/scoped backup | repeat validation |
| Schema upgrade | Tier 3 | affected files | full backup | repeat validation |
| Restore backup | Tier 3 | many files | pre-restore backup | repeat validation |
| World package import | Tier 3 | many files/assets | full/scoped backup | validation, index update |

## Index Contract

### PageIndex

`PageIndex` remains the read model for page metadata:

- by id;
- by title;
- by alias;
- by parent;
- by template;
- by type;
- by tag.

### TreeIndex

`TreeIndex` is the read model for tree operations:

- `childrenByParent`;
- `siblingsByPageId`;
- `rootPages`;
- `orderByPageId`;
- `parentByPageId`;
- `descendantsByPageId` or fast descendant checks.

`TreeIndex` should be built on workspace open and updated after create, move, delete, and reorder.

New tree code should not scan `state.pages` for every pointer move.

## Operation Journal Contract

Journal root:

```text
.my-own-world-ops/
```

Journal entry path:

```text
.my-own-world-ops/pending/{operationId}.json
.my-own-world-ops/committed/{operationId}.json
.my-own-world-ops/failed/{operationId}.json
```

Minimum entry shape:

```json
{
  "version": 1,
  "id": "2026-07-15T12-00-00-000Z-move-page",
  "type": "move-page",
  "createdAt": "2026-07-15T12:00:00.000Z",
  "status": "pending",
  "affectedPages": ["page-id"],
  "before": {
    "page-id": {
      "parent": "old-parent",
      "order": 10,
      "path": "/pages/page.md"
    }
  },
  "after": {
    "page-id": {
      "parent": "new-parent",
      "order": 12,
      "path": "/pages/page.md"
    }
  }
}
```

Rules:

- write pending entry before the first affected page write;
- move or rewrite entry to committed only after all writes and index updates finish;
- if the app starts and finds pending entries, show a recovery notice;
- do not auto-rollback without user confirmation;
- committed entries may be compacted or deleted by retention cleanup later.

## Rollback Snapshot Contract

A lightweight rollback snapshot stores only affected metadata and, when needed, original content for the affected files.

Use it when the operation is too small for full backup but should be reversible.

Minimum shape:

```json
{
  "version": 1,
  "operationId": "2026-07-15T12-00-00-000Z-move-page",
  "createdAt": "2026-07-15T12:00:00.000Z",
  "pages": [
    {
      "id": "page-id",
      "path": "/pages/page.md",
      "parent": "old-parent",
      "order": 10,
      "content": "--- original page content when needed ---"
    }
  ]
}
```

Rules:

- same-level reorder does not need content snapshot if it writes one metadata field and the journal has before/after metadata;
- parent-changing move should have at least metadata snapshot;
- rename should have metadata and title/body boundary snapshot;
- delete should use page trash because full content restore is required;
- create should have a delete-on-rollback marker for the new file;
- duplicate should have a delete-on-rollback marker for the duplicate file.

## Full Backup Gate Contract

Full backup stays mandatory when an operation can cause broad or irreversible loss.

The existing `BACKUP_AND_RECOVERY_CONTRACT.md` remains authoritative for full backups.

This contract narrows when full backup is required:

- ordinary tree reorder: no;
- ordinary create/rename: no full backup, use journal;
- one-page parent move: no full backup by default, use journal + rollback snapshot;
- delete branch: no ordinary backup, use page trash scoped to the deleted branch;
- schema repair/upgrade: yes;
- restore/import/bulk migration: yes;
- asset cleanup: yes.

## Background Queue Contract

Background jobs must be deduplicated by job type and workspace.

Minimum job shape:

```json
{
  "type": "schema-validation",
  "workspaceId": "current-workspace",
  "reason": "after-tree-move",
  "createdAt": "2026-07-15T12:00:00.000Z"
}
```

Rules:

- only one active job of the same type per workspace unless explicitly allowed;
- jobs must be cancellable or safely ignorable if workspace changes;
- jobs must report warnings/errors in diagnostics, not interrupt normal editing unless data safety is at risk;
- jobs must not silently write repairs.

Order compaction is the one allowed background maintenance write in this contract. It is not a data repair: it preserves the same parent/visual order and only replaces dense `order` metadata with wider gaps for one sibling set. It must not run during pointer drag.

## Performance Budget

Initial targets for large workspace work:

- pointer move/drop UI feedback: under 100 ms before visible response;
- same-level tree reorder hot path: one page write, no backup, no full reload;
- parent-changing one-page move: one journal write, one page write, no full reload;
- startup index build: bounded and measured;
- background diagnostics: allowed to be slower, but visible as background work if it takes noticeable time.

Budgets must be tested with synthetic large workspace scenarios and, when possible, the known GM workspace.

## Failure Handling

If a Tier 1 write fails:

- keep in-memory state consistent with the last successful persistent state;
- show a clear error;
- do not trigger full reload unless recovery needs it.

If a Tier 2 operation fails:

- keep the journal entry as failed or pending;
- offer rollback/retry;
- do not hide the incomplete operation.

If a Tier 3 backup fails:

- stop before mutation;
- show why backup failed;
- do not continue by "best effort".

## Testing Requirements

Required tests for implementation:

- startup index build on a large fixture;
- same-level reorder writes one page and creates no backup;
- parent-changing move writes journal + one page and can recover from pending journal;
- create page updates `PageIndex` and `TreeIndex` without full reload;
- rename updates title/alias indexes;
- delete branch writes page trash and can restore deleted page files;
- schema repair still requires backup;
- background validation does not block tree drop;
- order compaction rewrites only one sibling set and never runs during drag.
- lightweight operations gate covers create, same-level reorder, parent-changing move, pending journal visibility, background checkpointing, and large read-model budgets.

## Definition Of Done For `0.0.1.1.2`

- Operation tiers are defined.
- Operation matrix covers tree move, create, rename, delete, schema repair, import, restore, asset import, and map save.
- Index responsibilities are defined.
- Operation journal shape is defined.
- Rollback snapshot shape is defined.
- Full backup gate rules are narrowed and explicit.
- Background validation/checkpointing rules are defined.
- Performance budget is stated.
- Follow-up implementation tasks remain in `PROJECT_PLAN.md`.
