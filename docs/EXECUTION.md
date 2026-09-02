# Execution Control

Master planning contains exactly 1,500 synchronized jobs:

- IDs: `RWA-0001` through `RWA-1500`
- 30 workstreams
- 10 capabilities per workstream
- 5 stages per capability:
  - SPEC
  - CONTRACT
  - BUILD
  - VERIFY
  - RELEASE

## Wave order

- W0 Stabilize: WS01-WS04
- W1 Core: WS05-WS11
- W2 Business: WS12-WS15
- W3 Financial: WS16-WS20
- W4 Product: WS21-WS26
- W5 Harden/Launch: WS27-WS30

## Synchronization requirements

- BUILD cannot bypass accepted CONTRACT.
- RELEASE cannot bypass VERIFY.
- Monetary movement must reconcile through the ledger.
- External facts require provenance, freshness, and status.
- Compliance decisions require auditable state transitions.
- Async jobs require retries, idempotency, trace IDs, and dead-letter handling.
- Every production feature requires monitoring, alerts, rollback, and operational ownership.

## Immediate sequence

1. WS01 source-of-truth inventory
2. WS02 repository safety
3. WS03 CI/CD
4. WS04 platform/monorepo foundation
5. Import and classify local workspace source
6. Reconcile local code against DOCX/XLSX requirements
7. Build the first vertical end-to-end gate
