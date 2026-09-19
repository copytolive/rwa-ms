# RWA.MS Agent Model

## Hard rule

RWA.MS has exactly **10 active agents**:

1. NAYARA — Master Coordinator / cross-agent integration / final acceptance
2. ELARA — Global UI, discovery, marketplace, property
3. KIRANA — Games, apps, asset detail, portfolio
4. MAHIRA — Valuation, compliance, tokenization, primary market
5. TALITHA — Spot, perps, wallet/settlement, liquidity
6. SAMIRA — Social, oracle, venue adapters, AI models
7. ZAFIRA — Franchise, geo markets, business blueprints, tenancy
8. KEISHA — App factory, business runtime, telemetry, commercial/billing
9. ALINA — Security, asset registry/evidence, ingestion/search, issuer/reviewer identity
10. SORAYA — Independent final QA / release gate

No other RWA.MS agent identity may be created.

## Legacy module migration

Historical A11–A43 identifiers are **module/task identifiers only**, not agents.

Ownership is consolidated as follows:

- A11–A14 -> ELARA
- A15–A18 -> KIRANA
- A19–A22 -> MAHIRA
- A23–A26 -> TALITHA
- A27–A30 -> SAMIRA
- A31–A34 -> ZAFIRA
- A35–A38 -> KEISHA
- A39–A42 -> ALINA
- A43 -> SORAYA
- Cross-owner coordination and acceptance -> NAYARA

## Runtime rule

Do not generate, schedule, display, or launch AGENT11 through AGENT43 as independent agents.

After legacy task/evidence ownership has been migrated and verified, legacy AGENT11–AGENT43 runtime folders and launch/task records must be deleted. Historical evidence may remain only when it is stored under the owning named agent or a neutral evidence/archive path and is clearly marked as historical module evidence.

Docker/background-agent hold remains in force until the Owner explicitly releases it.
