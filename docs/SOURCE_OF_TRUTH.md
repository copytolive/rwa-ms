# RWA.MS Source of Truth

## Canonical inputs

The build reconciles these sources instead of inventing requirements:

- Local workspace: `/Users/Shared/WorkspaceBersama/RWA_MS_REPOS`
- Product blueprint: `RWA.MS.docx`
- Economic/model workbook: `rwa.ms.xlsx`
- Master execution board: 1,500 synchronized jobs, immutable IDs `RWA-0001..RWA-1500`

## Product thesis

RWA.MS is a business-first trust + transaction network.

A business can exist without a token. Business utility tokens remain separate from business ownership, equity, debt, revenue share, dividends, promised yield, or company valuation. Financial RWA is a separate regulated layer.

## Repo-first rule

Mature engines run as isolated upstream services. Preferred integration mechanisms are documented APIs, official plugins/extensions, SSO, webhooks, reverse proxy, containers, and adapter services.

Permanent upstream core forks are disallowed unless a documented product or security requirement cannot be met otherwise.

## RWA.MS-owned control plane

- RWA ID
- Business ID + Business Graph
- Trust Graph
- payment/wallet routing
- fee engine
- policy/compliance state
- App Registry + Adapter Bus
- universal actions
- provisioning
- AI operator/orchestration
- analytics
- audit/event history
- governance

## Evidence rule

Any user-visible state such as Verified, Live, Compliant, Audited, Paid, Filled, Settled, Connected, or Available must reference a real backing system state and, when applicable, evidence/provenance.

Fallback is fail-closed: Pending, Unverified, Restricted, Unavailable, or Information Only.

## Public-source rule

Local DOCX/XLSX files are reference inputs. They are not automatically copied into this public repository. Only approved specifications, schemas, formulas, and requirements safe for public disclosure should be extracted.
