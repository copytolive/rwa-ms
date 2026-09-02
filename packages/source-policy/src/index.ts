import type { ClaimRecord, VerificationState } from "../../contracts/src/index.js";

const EVIDENCE_REQUIRED: ReadonlySet<VerificationState> = new Set([
  "VERIFIED",
]);

export function normalizeClaimState(claim: ClaimRecord): VerificationState {
  if (EVIDENCE_REQUIRED.has(claim.state) && claim.evidence.length === 0) {
    return "UNVERIFIED";
  }
  return claim.state;
}

export function canRenderVerifiedClaim(claim: ClaimRecord): boolean {
  return normalizeClaimState(claim) === "VERIFIED" && claim.evidence.length > 0;
}

export function assertEvidenceBacked(claim: ClaimRecord): ClaimRecord {
  if (claim.state === "VERIFIED" && claim.evidence.length === 0) {
    throw new Error("VERIFIED claims require at least one evidence record");
  }
  return claim;
}
