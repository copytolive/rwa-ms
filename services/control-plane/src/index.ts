import type {
  AppManifest,
  PolicyDecision,
  PolicyInput,
  UniversalAction,
} from "../../../packages/contracts/src/index.js";

export interface BusinessIdentity {
  businessId: string;
  displayName: string;
  jurisdiction?: string;
  verificationState: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED" | "REVOKED";
}

export interface ProvisionRequest {
  business: BusinessIdentity;
  templateId: string;
  requestedActions: readonly UniversalAction[];
}

export type ProvisionState =
  | "REQUESTED"
  | "POLICY_CHECK"
  | "PROVISIONING"
  | "CONNECTING"
  | "HEALTH_CHECK"
  | "LIVE"
  | "FAILED";

export interface ProvisionReceipt {
  provisionId: string;
  state: ProvisionState;
  appManifest?: AppManifest;
  policyDecision?: PolicyDecision;
  traceId: string;
  createdAt: string;
  updatedAt: string;
  failureCode?: string;
}

export interface PolicyEvaluator {
  evaluate(input: PolicyInput): Promise<PolicyDecision>;
}

export function mayProvision(decision: PolicyDecision): boolean {
  return decision.state === "AVAILABLE";
}
