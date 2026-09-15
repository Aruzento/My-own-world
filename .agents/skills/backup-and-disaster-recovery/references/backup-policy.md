# Backup Policy

## Policy and recovery objectives

Inventory state only within the agreed systems: irreplaceable content, configs, assets and recovery keys; distinguish reconstructible caches. Name owners and existing backup coverage before proposing new infrastructure.

Set RPO (acceptable age of lost data) and RTO (acceptable recovery time) from accepted requirements; unresolved business tolerances require the affected owner's decision. Do not invent a one-hour target or a cloud requirement for MOW.

Match frequency to RPO and the tested restore procedure to RTO. Retain older recovery points because corruption can predate the latest snapshot. Assess correlated loss: source disk, account, provider, credentials and region. Choose separate/offline or immutable copies where the scoped threat model requires them; 3-2-1 is a design option, not permission to upload local workspaces.

Record encryption/key recoverability, access controls, retention and cost. A backup without its decryption key or restore metadata is insufficient. Consider hardware failure, corruption, compromise/ransomware, account loss and provider outage only as applicable to the selected architecture.

Define a tested runbook and owner. A tabletop exercise validates the plan; a partial restore into an isolated copy validates recovery; real failover/destructive restore needs explicit target authorization. Record failures, actual RPO/RTO and resulting work. Agree review/drill cadence only when policy design is requested.

## Special branches

- **Database/PITR:** verify the actual retention window, recovery point and exports; source-service PITR alone cannot cover loss of that service/account. Test the recovered schema and data.
- **Remote file storage:** evaluate versioning, replication and object lock for the actual provider and threat model. Do not assume defaults protect critical data.
- **Code/config/keys:** Git is not a backup of runtime secrets or user content. Where required, protect independent mirrors, offline exports, configs, backup credentials and encryption keys; keep secrets out of repository/report output.
- **Compliance:** establish the applicable retention/evidence obligation with its owner. Compliance retention is distinct from operational recovery speed; no generic statutory duration becomes a project requirement.

Policy output: scoped inventory, agreed objectives, backup architecture, runbook owner, verification gaps and any requested cadence. Use the existing restore-runbook template only when writing or exercising a runbook.
