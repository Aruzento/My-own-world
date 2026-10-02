---
summary: "Measured Type Switching responsiveness and scoped recovery evidence for owner recovery Step 2."
read_when:
  - "When verifying Type Switching backup scope or responsiveness"
owner_zone: "testing"
---

# Type Switching scoped recovery evidence

Date: 2026-10-02. Before baseline: `352e4e31d6c06353fe029aad93617a2b1d9c10a4`, with observation-only phase instrumentation added before changing behavior. After: this Step 2 corrective. This is technical evidence, **not Owner PASS** or a native large-user-workspace acceptance claim.

Reproduce with `node tools/probe_type_switching_recovery.mjs probe.json`. The disposable Chromium OPFS fixture uses the actual BrowserStorageAdapter, 1,001 physical pages (Character + 1,000 Lore), 32 assets of 64 KiB, an activated catalog initially missing Location, and the normal type-selector/confirmation/openPage workflow. Setup is excluded; no artificial storage delays are used. Measurements include preview/confirmation/UI scheduling, so parent phases and child phases must not be added together. These comparative times are observations, not absolute CI budgets.

| Wall-time phase, ms | Before | After |
| --- | ---: | ---: |
| Catalog prepare/read | 37 | 38 |
| Source/schema snapshot | 21 | 24 |
| Candidate construction/validation | 19 | 17 |
| Inbound typed-reference traversal (1,001 pages once) | 231, synchronous | 347, 28 yields |
| Full backup total | 3,913 | 0 |
| ↳ Definition capture | 41 | 0 |
| ↳ Durable page reads | 165 | 0 |
| ↳ Definition coverage validation | 234 | 0 |
| ↳ Asset enumeration / digests / copy | 3 / 21 / 67 | 0 / 0 / 0 |
| ↳ Backup page writes | 1,374 | 0 |
| ↳ Internal backup verification | 1,997 | 0 |
| Caller duplicate full verification | 1,948 | 0 |
| Verified scoped journal preparation | 0 | 56 |
| Catalog activation total | 427 | 536 |
| ↳ Repository registry refresh | 293, synchronous | 404, yielding |
| PageCommand total | 303 | 91 |
| ↳ Persist including validation/physical readback | 300 | 89 |
| ↳ Physical readback separately | included above; not separately measured | 1 |
| ↳ Incremental index update / publication | 2 / 0 | 2 / 0 |
| Verified journal completion | 0 | 29 |
| openPage / Inspector refresh | 110 | 110 |
| Whole observed workflow | **7,935.2** | **2,191.7** |
| Maximum observed main-thread long task | 296 | 54 |
| Maximum 8-ms heartbeat gap | 302.2 | 87 |

Backup + duplicated verification occupied 5,861 ms, about 74% of the before workflow. Yielding increases total traversal/registry wall time while reducing uninterrupted main-thread work. The remaining largest synchronous tasks are bounded per-page/schema/UI work; this corrective does not claim elimination of every long task or solve the separate Performance Lifecycle step.

| Structural I/O evidence | Before | After |
| --- | ---: | ---: |
| Text reads / text writes | 5,025 / 1,005 | 17 / 4 |
| Workspace enumerations | 1 | 0 |
| Binary reads / writes | 192 / 32 | 0 / 0 |
| Distinct original pages physically read / written | 1,001 / 1 | 1 / 1 |
| Backup page copies | 1,001 | 0 |
| Distinct asset source/snapshot files read / copied | 64 / 32 | 0 / 0 |
| Total bytes read / written | 32,092,994 / 6,000,631 | 6,266,663 / 2,545,629 |

After bytes include repeated exact catalog reads and the raw before/target catalog plus single-page evidence in existing pending/committed journal records; they are not unrelated page copies. I/O operation durations may overlap (parallel reads), so their sum is not wall time. Registry/reference traversals use Repository memory; no second index/cache is introduced.

Deterministic regression contracts: one affected Card; no full-backup creation or asset enumeration/copy; verified journal before catalog/page mutation; stale/no-op preservation; failure/uncertainty classification; explicit exact-state recovery; newer additive catalog preserved; busy painted before held storage; one operation under double click; fresh workspace/module restart reconstructs recovery from durable evidence. Existing Character → Location → Lore preservation and Step 1 editor-save scenarios remain acceptance gates.

Safety policy and remaining caller classification: [BACKUP_AND_RECOVERY_CONTRACT](../02-architecture/contracts/BACKUP_AND_RECOVERY_CONTRACT.md#backup--recovery-policy--recovery-step-2-corrective). Active status: [PROJECT_PLAN](../01-delivery/PROJECT_PLAN.md). Exact focused/full results are recorded in [WORK_LOG](../01-delivery/WORK_LOG.md).

Final automated desktop gate ran 2026-10-02 08:10:48–08:15:54 UTC: verify 74,724 ms, full Chromium 230,459 ms, frontend preparation 306 ms, packaging smoke 43 ms, environment 305 ms and cargo check 412 ms, all PASS. Unit/integration 1,351/1,351; Chromium 390/390. Confidence is NORMAL_WORKSPACE_VALIDATED; real large-workspace desktop smoke was not requested/provided and remains unclaimed. Injected-Tauri parity additionally proves scoped journal/type recovery with exact bytes and no unrelated asset I/O. No native adapter/Rust implementation or timing budget was changed.
