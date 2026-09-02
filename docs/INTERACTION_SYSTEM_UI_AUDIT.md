# RWA.MS Button, System, and Responsive UI Audit

Audit date: 2026-09-03

## Result model

Each control is classified as:

- **LIVE** — invokes a real data/runtime path.
- **UI WORKING** — navigation/state/preview operates correctly.
- **SOURCE READY / RUNTIME NOT CONNECTED** — repository exists and is mapped, but static GitHub Pages cannot execute that upstream service.
- **FAIL-CLOSED** — control intentionally refuses a real write until the secure backend/signer exists.

## Control audit

| Control group | System/path | Status |
| --- | --- | --- |
| Discover / Markets / Businesses / Portfolio / Activity navigation | RWA.MS shell | UI WORKING |
| Global search / market search | Hyperliquid live market registry | LIVE |
| Markets / Watchlist | Hyperliquid + localStorage watch set | UI WORKING |
| Top Volume / Gainers / Losers | Hyperliquid `metaAndAssetCtxs` | LIVE |
| Market rows | Hyperliquid real markets | LIVE |
| Watch star | local watch state | UI WORKING |
| 1m / 5m / 15m / 1H / 4H / 1D | Hyperliquid `candleSnapshot` + TradingView Lightweight Charts | LIVE |
| Order Book | Hyperliquid `l2Book` | LIVE |
| Live Trades | Hyperliquid WebSocket | LIVE |
| Funding | Hyperliquid `fundingHistory` | LIVE |
| Market Info | source/runtime disclosure | UI WORKING |
| Buy / Sell | order-state selection | UI WORKING |
| Limit / Market / Stop | order-state selection + price-state changes | UI WORKING |
| Price + / - | order form | UI WORKING |
| Size range / 10–100% | public account withdrawable balance when available | UI WORKING; requires account for auto sizing |
| Preview Order | Hyperliquid order preview | FAIL-CLOSED for write |
| Set account / status / avatar | Hyperliquid public-address read state | LIVE read-only |
| Notification icon | Activity view | UI WORKING |
| Mobile Buy / Sell | mobile order sheet | UI WORKING |
| Mobile Change Market | real Hyperliquid market picker | LIVE |
| Commerce | `20_BUSINESS_ENGINES/medusa` | SOURCE READY / RUNTIME NOT CONNECTED |
| Support | `20_BUSINESS_ENGINES/chatwoot` | SOURCE READY / RUNTIME NOT CONNECTED |
| Content | `20_BUSINESS_ENGINES/Ghost` | SOURCE READY / RUNTIME NOT CONNECTED |
| Billing | `20_BUSINESS_ENGINES/killbill` | SOURCE READY / RUNTIME NOT CONNECTED |
| Trust | `10_CORE_INFRA/openfga + 10_CORE_INFRA/opa` | SOURCE READY / RUNTIME NOT CONNECTED |

No engine card is allowed to pretend to be LIVE merely because its repository exists.

## Responsive audit

Desktop target: 1920×1080 full viewport.
Mobile target: 390×844.

Changes after audit:

- desktop navigation and market rows raised to readable 10–12 px controls;
- asset title/price and order controls enlarged without sacrificing terminal density;
- mobile card titles, values, action buttons and bottom navigation increased;
- mobile dashboard converted to a viewport-filling grid so the position section consumes remaining height instead of leaving a large blank region;
- drawers are full-height on desktop and bottom sheets on mobile;
- green/red/yellow remain semantic: positive/buy, negative/sell, warning/gated;
- no synthetic market or portfolio values were added.

## Automated audit

The Pages pipeline opens the artifact in Chromium with `?audit=1`, checks registered click/input handler groups, TradingView presence and real market rows, and fails deployment if `data-audit-failed` is non-zero.


## Deterministic deployment audit

The deployment gate uses `scripts/audit-ui.mjs` to classify every static button, verify its handler contract, verify dynamic market/engine control handlers, enforce Hyperliquid/TradingView source paths, reject known synthetic market labels, and enforce desktop/mobile typography/layout contracts. Chromium still renders desktop/mobile screenshots on every deployment; the DOM dump is retained as diagnostic evidence but does not block on network timing.
