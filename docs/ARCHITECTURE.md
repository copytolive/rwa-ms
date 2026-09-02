# RWA.MS Architecture Baseline

## Core control plane

1. Identity
   - RWA ID
   - Business ID
   - organization roles/permissions
   - SSO/session
   - device/account security
   - optional KYC/KYB state

2. Business Graph
   - business profile
   - owners/authorized representatives
   - customers/followers
   - business relationships
   - products/services/events/APIs
   - activity history
   - token/RWA eligibility state

3. Trust Graph
   - verification evidence
   - completed transactions
   - disputes/refunds
   - reviews
   - relationship history
   - suspicious-behavior signals
   - explainable reputation evidence

4. Payment / Wallet / Fee Engine
   - payment initiation
   - settlement state
   - fee calculation
   - provider routing
   - permitted wallet actions
   - ledger/audit events
   - refund/dispute hooks

5. Policy Engine

   Evaluates:
   `user x business x product x asset x venue x jurisdiction x verification x provider`

   Output:
   - Available
   - Verification Required
   - Restricted
   - Unavailable
   - Information Only

6. App Registry + Adapter Bus

   Every engine manifest includes:
   - app/engine ID
   - supported business types
   - permissions
   - data objects
   - actions
   - webhooks/events
   - required providers
   - jurisdiction restrictions
   - health/version state

7. Universal Actions

   `BUY SELL BOOK PAY TICKET ACCESS SUBSCRIBE PUBLISH LEARN PROMOTE API_USE JOIN FOLLOW SIGN CLAIM REDEEM`

8. Business Provisioner

   `Create Business -> Verify if required -> Choose template -> Configure -> Save -> Provision engine -> Connect RWA services -> Health check -> LIVE`

## Upstream economic engines

| Engine | Upstream | Universal action | Core fork |
|---|---|---|---|
| Commerce | medusajs/medusa | SELL / CHECKOUT | No |
| Booking | calcom/cal.diy | BOOK / PAY | No |
| Ticketing | pretix/pretix | TICKET / ACCESS | No |
| Creator | TryGhost/Ghost | PUBLISH / SUBSCRIBE | No |
| Education | moodle/moodle | LEARN / ENROLL | No |
| Billing | killbill/killbill | BILL / SUBSCRIBE | No |
| Ads | revive-adserver/revive-adserver | PROMOTE | No |
| API / Agent | apache/apisix + openmeterio/openmeter | API USE / METER | No |

## First engineering exit gate

The first end-to-end release is:

`Create Business -> Save -> provision -> pay/book/sell works end-to-end`

with real identity, policy, trust, payment, audit, health, and failure recovery.
