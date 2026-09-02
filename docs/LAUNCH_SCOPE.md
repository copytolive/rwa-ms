# Launch Scope — Existing Repositories Only

## Decision

For the current launch track, RWA.MS must not introduce a new economic engine outside the repositories already present in:

`/Users/Shared/WorkspaceBersama/RWA_MS_REPOS`

RWA.MS may still implement its own control-plane contracts, UI shell, orchestration and adapters, because those are explicitly the RWA.MS-owned layer defined by the source-of-truth.

## Required launch path

1. Keycloak — identity/session
2. OpenFGA — relationship authorization
3. OPA — policy decision
4. Medusa — commerce/order engine
5. Hyperswitch — payment routing
6. Formance Ledger — financial state/reconciliation
7. NATS — event transport
8. Temporal — durable workflow/retries
9. OpenTelemetry Collector — runtime telemetry

Optional launch capabilities from existing repositories:

- Ghost — creator/membership
- Kill Bill — recurring billing
- APISIX — API gateway
- OpenMeter — metering
- OpenSearch — search
- ClickHouse — analytics after pin review

## Held behind review

The following repositories remain in RWA_MS_REPOS but are not activated for the first commercial launch gate until their local license/deployment review is closed:

- Cal.diy
- Pretix
- Moodle
- Revive Adserver

No replacement repository is introduced. If a held engine remains blocked, that capability remains unavailable at launch rather than silently substituting a new repository.

## UI rule

The UI must distinguish:

- source exists,
- adapter ready,
- runtime connected,
- verified live.

A source repository being present is never enough to render LIVE.
