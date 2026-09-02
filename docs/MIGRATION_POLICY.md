# Migration Rule

RWA.MS does **not** bulk-copy `RWA_MS_REPOS` into this public repository.

## What the local audit shows

- `00_RWA_MS_OWN_CODE` is a clean-room boundary, not a finished implementation. The inspected modules contain README-only ownership rules.
- `10_CORE_INFRA`, `20_BUSINESS_ENGINES`, `30_MARKETS`, `40_FINANCIAL_RWA`, `50_DATA`, and `60_SECURITY` contain cloned third-party projects.
- `90_REFERENCE_ONLY` explicitly forbids automatic source copying into proprietary core.
- `99_LICENSE_AUDIT` records pinned commits and preliminary license classifications.

## Migration policy

1. Build RWA.MS-owned contracts, schemas, control-plane logic and adapters clean-room in this repository.
2. Keep upstream source out of the RWA.MS core repository.
3. Deploy approved upstream engines independently at pinned versions.
4. Communicate only through stable adapters/APIs/events.
5. Preserve copyright/license notices where integration or distribution requires it.
6. Any repository marked `ISOLATE_AND_REVIEW`, `MANUAL_REVIEW`, or `REFERENCE_ONLY` is blocked from source reuse until an explicit license decision exists.
7. A user-visible VERIFIED/LIVE/COMPLIANT/PAID/SETTLED/CONNECTED claim must have backing state/evidence.
