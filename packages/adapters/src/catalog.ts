export const EXISTING_REPO_SYSTEMS = {
  identity: "10_CORE_INFRA/keycloak",
  authorization: "10_CORE_INFRA/openfga",
  policy: "10_CORE_INFRA/opa",
  ledger: "10_CORE_INFRA/ledger",
  payments: "10_CORE_INFRA/hyperswitch",
  events: "10_CORE_INFRA/nats-server",
  workflow: "10_CORE_INFRA/temporal",
  observability: "10_CORE_INFRA/opentelemetry-collector",
  provisioning: "10_CORE_INFRA/crossplane",
  secrets: "10_CORE_INFRA/external-secrets",
  ai: "10_CORE_INFRA/langgraph",
  commerce: "20_BUSINESS_ENGINES/medusa",
  creator: "20_BUSINESS_ENGINES/Ghost",
  billing: "20_BUSINESS_ENGINES/killbill",
  support: "20_BUSINESS_ENGINES/chatwoot",
  operations: "20_BUSINESS_ENGINES/odoo",
  businessWorkflow: "20_BUSINESS_ENGINES/corteza",
  api: "20_BUSINESS_ENGINES/apisix",
  metering: "20_BUSINESS_ENGINES/openmeter",
  hyperliquid: "30_MARKETS/hyperliquid-python-sdk",
  hummingbot: "30_MARKETS/hummingbot",
  charts: "30_MARKETS/lightweight-charts",
  search: "50_DATA/OpenSearch",
  analytics: "50_DATA/ClickHouse",
  securityAnalysis: "60_SECURITY/slither"
} as const;

export type ExistingRepoSystemId = keyof typeof EXISTING_REPO_SYSTEMS;

export interface AdapterHealth {
  systemId: ExistingRepoSystemId;
  connected: boolean;
  checkedAt: string;
  detail?: string;
}

export interface AdapterDescriptor {
  systemId: ExistingRepoSystemId;
  sourcePath: (typeof EXISTING_REPO_SYSTEMS)[ExistingRepoSystemId];
  endpointEnv: string;
  requiredForLaunch: boolean;
}

export const LAUNCH_ADAPTERS: readonly AdapterDescriptor[] = [
  { systemId: "identity", sourcePath: EXISTING_REPO_SYSTEMS.identity, endpointEnv: "KEYCLOAK_BASE_URL", requiredForLaunch: true },
  { systemId: "authorization", sourcePath: EXISTING_REPO_SYSTEMS.authorization, endpointEnv: "OPENFGA_BASE_URL", requiredForLaunch: true },
  { systemId: "policy", sourcePath: EXISTING_REPO_SYSTEMS.policy, endpointEnv: "OPA_BASE_URL", requiredForLaunch: true },
  { systemId: "ledger", sourcePath: EXISTING_REPO_SYSTEMS.ledger, endpointEnv: "FORMANCE_LEDGER_BASE_URL", requiredForLaunch: true },
  { systemId: "payments", sourcePath: EXISTING_REPO_SYSTEMS.payments, endpointEnv: "HYPERSWITCH_BASE_URL", requiredForLaunch: true },
  { systemId: "events", sourcePath: EXISTING_REPO_SYSTEMS.events, endpointEnv: "NATS_URL", requiredForLaunch: true },
  { systemId: "workflow", sourcePath: EXISTING_REPO_SYSTEMS.workflow, endpointEnv: "TEMPORAL_ADDRESS", requiredForLaunch: true },
  { systemId: "observability", sourcePath: EXISTING_REPO_SYSTEMS.observability, endpointEnv: "OTEL_EXPORTER_OTLP_ENDPOINT", requiredForLaunch: true },
  { systemId: "commerce", sourcePath: EXISTING_REPO_SYSTEMS.commerce, endpointEnv: "MEDUSA_BASE_URL", requiredForLaunch: true },
  { systemId: "billing", sourcePath: EXISTING_REPO_SYSTEMS.billing, endpointEnv: "KILLBILL_BASE_URL", requiredForLaunch: true },
  { systemId: "hyperliquid", sourcePath: EXISTING_REPO_SYSTEMS.hyperliquid, endpointEnv: "HYPERLIQUID_API_URL", requiredForLaunch: true },
  { systemId: "support", sourcePath: EXISTING_REPO_SYSTEMS.support, endpointEnv: "CHATWOOT_BASE_URL", requiredForLaunch: false },
  { systemId: "operations", sourcePath: EXISTING_REPO_SYSTEMS.operations, endpointEnv: "ODOO_BASE_URL", requiredForLaunch: false },
  { systemId: "businessWorkflow", sourcePath: EXISTING_REPO_SYSTEMS.businessWorkflow, endpointEnv: "CORTEZA_BASE_URL", requiredForLaunch: false },
  { systemId: "creator", sourcePath: EXISTING_REPO_SYSTEMS.creator, endpointEnv: "GHOST_BASE_URL", requiredForLaunch: false },
  { systemId: "api", sourcePath: EXISTING_REPO_SYSTEMS.api, endpointEnv: "APISIX_BASE_URL", requiredForLaunch: false },
  { systemId: "metering", sourcePath: EXISTING_REPO_SYSTEMS.metering, endpointEnv: "OPENMETER_BASE_URL", requiredForLaunch: false },
  { systemId: "search", sourcePath: EXISTING_REPO_SYSTEMS.search, endpointEnv: "OPENSEARCH_BASE_URL", requiredForLaunch: false },
  { systemId: "analytics", sourcePath: EXISTING_REPO_SYSTEMS.analytics, endpointEnv: "CLICKHOUSE_URL", requiredForLaunch: false },
  { systemId: "ai", sourcePath: EXISTING_REPO_SYSTEMS.ai, endpointEnv: "LANGGRAPH_BASE_URL", requiredForLaunch: false }
] as const;

export function isExistingRepoSource(path: string): boolean {
  return Object.values(EXISTING_REPO_SYSTEMS).includes(path as never);
}
