# UI parity pass — full-screen + real Hyperliquid + TradingView

## Decision

The approved Neon Graphite direction remains the visual target, but the production implementation now removes two previous shortcuts:

1. the desktop is full viewport rather than a centered framed mockup;
2. the market list/chart are real, without synthetic RWA price rows.

## Chart source

The chart uses the official existing local repository:

`30_MARKETS/lightweight-charts`

The audited local package identifies itself as:

- `lightweight-charts`
- version `5.2.1`
- author `TradingView, Inc.`
- Apache-2.0
- official repository `tradingview/lightweight-charts`

Pages installs the pinned 5.2.1 package and vendors its production standalone build into the deployed artifact.

## Market source

All tradable market rows come from Hyperliquid `metaAndAssetCtxs`. The app no longer inserts synthetic examples such as office REITs, invoices, carbon credits or NFT prices.

Detail screens use:

- `l2Book`
- `candleSnapshot`
- `fundingHistory`
- WebSocket `trades`

Public account state uses:

- `clearinghouseState`
- `openOrders`
- `userFills`

## Write boundary

This deployment does not pretend browser-side trading is live. A secure signer/execution adapter is still required for write execution. The browser never asks for or stores a private key.
