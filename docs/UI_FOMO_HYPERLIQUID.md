# Responsive UI — Fomo.family interaction + Hyperliquid market layer

Status: IMPLEMENTED ON LAUNCH BRANCH

## Source basis

Visual interaction and application rhythm were derived from the existing local reference repository:

- `90_REFERENCE_ONLY/fomo/apps/web/src/app/(app)/trade/layout.tsx`
- `90_REFERENCE_ONLY/fomo/apps/web/src/app/(app)/trade/[address]/page.tsx`
- `trending-sidebar.tsx`
- `market-tabs.tsx`
- `swap-panel.tsx`
- `position-card.tsx`

The local Fomo layout explicitly uses a desktop three-column terminal:
`320px / flexible center / 360px`, with a trending sidebar, chart/tabs center, and swap/position rail. Mobile moves the token header, tabs, position and swap flow into a single-column view with a fixed Buy/Sell bar.

Market capability is aligned with the existing:
`30_MARKETS/hyperliquid-python-sdk`.

The public read path uses Hyperliquid information endpoints that correspond directly to the SDK's `Info` methods:
market metadata, candles, order book, funding, clearinghouse state, open orders, user fills and WebSocket trade subscription.

## Desktop

- persistent live ticker
- compact app topbar
- 300px market/trending rail
- flexible chart + book/trade/funding workspace
- 350px order + position rail
- no corporate hero in the primary app
- Discover, Markets, Businesses, Portfolio, Activity all share one dark application grammar

## Mobile

- same data and actions, not a reduced marketing page
- single-column market workspace
- compact market metrics
- sticky tabs
- fixed Buy/Sell action bar
- fixed five-item bottom navigation
- order entry opens as a bottom sheet
- account and search also use bottom sheets
- safe-area aware
- minimum chart height preserved

## Execution safety

Read-only market/account data is live.
Order UI is fully interactive up to preview and confirmation.

Real submission is fail-closed unless a user/operator configures a separate Hyperliquid execution adapter URL. The browser UI never requests or stores a private key.
