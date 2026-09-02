export const UNIVERSAL_ACTIONS = [
  "BUY",
  "SELL",
  "BOOK",
  "PAY",
  "TICKET",
  "ACCESS",
  "SUBSCRIBE",
  "PUBLISH",
  "LEARN",
  "PROMOTE",
  "API_USE",
  "JOIN",
  "FOLLOW",
  "SIGN",
  "CLAIM",
  "REDEEM",
] as const;

export type UniversalAction = (typeof UNIVERSAL_ACTIONS)[number];

export const POLICY_STATES = [
  "AVAILABLE",
  "VERIFICATION_REQUIRED",
  "RESTRICTED",
  "UNAVAILABLE",
  "INFORMATION_ONLY",
] as const;

export type PolicyState = (typeof POLICY_STATES)[number];

export const VERIFICATION_STATES = [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
  "REVOKED",
] as const;

export type VerificationState = (typeof VERIFICATION_STATES)[number];

export interface EvidenceRef {
  evidenceId: string;
  sourceId: string;
  issuer?: string;
  sha256?: string;
  observedAt: string;
  expiresAt?: string;
}

export interface ClaimRecord {
  claimId: string;
  subjectId: string;
  claimType: string;
  state: VerificationState;
  evidence: readonly EvidenceRef[];
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AppManifest {
  appId: string;
  version: string;
  supportedBusinessTypes: readonly string[];
  permissions: readonly string[];
  dataObjects: readonly string[];
  actions: readonly UniversalAction[];
  webhooks: readonly string[];
  requiredProviders: readonly string[];
  jurisdictionRestrictions: readonly string[];
  healthState: "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
}

export interface PolicyInput {
  userId: string;
  businessId: string;
  action: UniversalAction;
  productId?: string;
  assetId?: string;
  venueId?: string;
  jurisdiction?: string;
  verificationState: VerificationState;
  providerId?: string;
}

export interface PolicyDecision {
  state: PolicyState;
  reasonCodes: readonly string[];
  evidenceIds: readonly string[];
  evaluatedAt: string;
}
