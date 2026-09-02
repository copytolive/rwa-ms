# RWA.MS 1,500-Job Execution Map

Master board: 30 workstreams × 10 capabilities × 5 stages = exactly 1,500 immutable jobs.

Stage discipline: `SPEC -> CONTRACT -> BUILD -> VERIFY -> RELEASE`.

| WS | Task range | Workstream | Primary implementation/source mapping |
|---|---|---|---|
| WS01 | RWA-0001..RWA-0050 | Source of Truth & Requirements | RWA.MS.docx, rwa.ms.xlsx, local repo inventory, evidence policy |
| WS02 | RWA-0051..RWA-0100 | Git & Repository Safety | copytolive/rwa-ms, branch protection, CODEOWNERS, secret/license rules |
| WS03 | RWA-0101..RWA-0150 | CI/CD & Delivery Gates | GitHub Actions, typecheck/test/build, Pages, rollback |
| WS04 | RWA-0151..RWA-0200 | Monorepo & Platform Foundation | apps/*, packages/*, services/*, shared TypeScript contracts |
| WS05 | RWA-0201..RWA-0250 | Design System & Frontend Core | apps/web + packages/ui |
| WS06 | RWA-0251..RWA-0300 | Routing & Navigation | apps/web/admin/merchant/reviewer route contracts |
| WS07 | RWA-0301..RWA-0350 | Identity & Authentication | RWA ID, Business ID, Keycloak adapter, OpenFGA/OPA policy |
| WS08 | RWA-0351..RWA-0400 | User Profile & Account | profile/account service + permissions |
| WS09 | RWA-0401..RWA-0450 | Wallet & Web3 Connectivity | wallet adapter; Safe/OZ only after explicit policy/license/security review |
| WS10 | RWA-0451..RWA-0500 | Asset Registry | RWA-owned canonical asset registry |
| WS11 | RWA-0501..RWA-0550 | Evidence & Provenance Registry | RWA-owned evidence registry; EAS may be an isolated adapter |
| WS12 | RWA-0551..RWA-0600 | Business & Merchant Registry | Business Graph + Medusa merchant adapter |
| WS13 | RWA-0601..RWA-0650 | KYC Identity Verification | provider-neutral KYC contracts; evidence/audit state |
| WS14 | RWA-0651..RWA-0700 | KYB AML & Compliance | OPA policy + business/UBO graph + provider adapters |
| WS15 | RWA-0701..RWA-0750 | Documents & Data Room | object-storage/document service; evidence hash/versioning |
| WS16 | RWA-0751..RWA-0800 | Market Data Platform | provider registry, Hyperliquid SDK adapter, Lightweight Charts display |
| WS17 | RWA-0801..RWA-0850 | Portfolio & Positions | RWA-owned position/valuation model |
| WS18 | RWA-0851..RWA-0900 | Ledger & Treasury | double-entry RWA contracts + isolated Formance Ledger adapter |
| WS19 | RWA-0901..RWA-0950 | Deposits & Withdrawals | policy-gated transfer service + ledger reconciliation |
| WS20 | RWA-0951..RWA-1000 | Trading Engine Integration | execution adapter, Hummingbot/Hyperliquid integration where permitted |
| WS21 | RWA-1001..RWA-1050 | Commerce Buyer & Merchant Flow | isolated Medusa engine + RWA identity/trust/payment contracts |
| WS22 | RWA-1051..RWA-1100 | Payments & Settlement | Hyperswitch adapter + fee engine + ledger idempotency/reconciliation |
| WS23 | RWA-1101..RWA-1150 | Rewards & Loyalty | RWA-owned rewards ledger; utility only |
| WS24 | RWA-1151..RWA-1200 | Community & Content | Ghost/community adapters + RWA identity/trust |
| WS25 | RWA-1201..RWA-1250 | Tokenization Engine | RWA-owned eligibility/policy; OZ/EAS adapters; reference repos cannot be copied |
| WS26 | RWA-1251..RWA-1300 | Notifications Jobs & AI | NATS + Temporal + LangGraph adapters; AI is orchestrator, not authority |
| WS27 | RWA-1301..RWA-1350 | Security & Privacy | secrets/IAM/supply-chain gates; Slither only after license review |
| WS28 | RWA-1351..RWA-1400 | Observability Performance & Capacity | OpenTelemetry + ClickHouse/OpenSearch adapters |
| WS29 | RWA-1401..RWA-1450 | QA Release Certification | unit/contract/integration/E2E/security/recovery evidence |
| WS30 | RWA-1451..RWA-1500 | Publish Production & Operations | Pages/production infra, backups, runbooks, canary, post-launch validation |

## Source-to-task rules

- A local repository is **not** automatically a BUILD input because it exists in `RWA_MS_REPOS`.
- `00_RWA_MS_OWN_CODE` defines the clean-room ownership boundary. Inspected modules are README-only at the current checkpoint, so production logic must be implemented here.
- Upstream repositories are deployed or consumed behind adapters at pinned versions; their source is not bulk-migrated into this repository.
- `90_REFERENCE_ONLY` is architecture/behavior research only until explicit license clearance.
- Economic spreadsheet values are planning assumptions, not production prices, forecasts, token promises or appraisals.
- Any production claim such as VERIFIED, LIVE, COMPLIANT, AUDITED, PAID, FILLED, SETTLED or CONNECTED must be backed by real state/evidence.
