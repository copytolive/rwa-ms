# ADR-0001 — Repo-first, clean-room control plane

Status: ACCEPTED

## Decision

RWA.MS owns the relationship, trust and action layers. Commodity economic engines run as isolated, replaceable upstream services.

The RWA.MS proprietary/public core owns:

- RWA ID and Business ID
- Business Graph
- Trust Graph
- Evidence/provenance model
- Payment and fee routing
- Policy state
- App Registry and Adapter Bus
- Universal Actions
- Business Provisioner
- AI orchestration
- Audit/event history

## First vertical

`Create Business -> Save -> provision -> pay/book/sell -> receipt`

The vertical is not complete until policy, evidence, payment/ledger, health checks, idempotency, failure recovery and audit are real.

## Non-decisions

- No upstream core fork in Phase 1.
- No token requirement for ordinary business operation.
- No utility-token claim on equity, debt, assets, revenue, dividends or yield.
- Financial RWA remains a separate regulated/policy-gated layer.
