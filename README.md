# RWA.MS

Repo-first economic network.

This is the independent public source repository for **RWA.MS**.

## Build authority

Implementation is governed by three synchronized sources:

1. Local source workspace: `/Users/Shared/WorkspaceBersama/RWA_MS_REPOS`
2. Product blueprint: `RWA.MS.docx`
3. Economic/model workbook: `rwa.ms.xlsx`
4. Master execution board: 1,500 synchronized jobs (`RWA-0001` through `RWA-1500`)

The DOCX/XLSX reference files are inputs to the build and are not automatically published to this public repository.

## Product architecture

RWA.MS is a business-first trust + transaction network. Mature upstream engines are integrated as isolated services without permanent core forks.

Initial upstream engine families:

- Commerce / Marketplace — Medusa
- Services / Booking — Cal.com / Cal.diy
- Events / Ticketing — pretix
- Creator / Membership — Ghost
- Education / Courses — Moodle
- Recurring Billing — Kill Bill
- Ads / Promotion — Revive Adserver
- API / Agent Economy — Apache APISIX + OpenMeter

RWA.MS owns the common control plane:

- RWA ID + Business ID
- Business Graph
- Trust Graph
- Payment / Wallet / Fee Engine
- Policy Engine
- App Registry + Adapter Bus
- Universal Actions
- Business Provisioner
- AI Operator
- Audit / Event infrastructure

## Build rule

`SPEC -> CONTRACT -> BUILD -> VERIFY -> RELEASE`

No production claim such as **Verified**, **Live**, **Compliant**, **Audited**, **Paid**, **Filled**, **Settled**, or **Connected** may be emitted without a real backing system state or evidence record.

## Public repository safety

Never commit:

- secrets, API keys, private keys, seed phrases
- `.env` files
- credentials or service-account JSON
- customer/user identity documents
- unredacted KYC/KYB data
- private commercial/legal source documents
- local caches, build output, databases, backups

See `docs/SOURCE_OF_TRUTH.md` and `scripts/audit-local-source.sh`.
