import test from "node:test";
import assert from "node:assert/strict";
import {
  canRenderVerifiedClaim,
  normalizeClaimState,
  assertEvidenceBacked,
} from "../dist/packages/source-policy/src/index.js";

const base = {
  claimId: "claim-1",
  subjectId: "business-1",
  claimType: "BUSINESS_VERIFIED",
  reviewedAt: "2026-09-02T00:00:00Z",
};

test("verified claim fails closed without evidence", () => {
  const claim = { ...base, state: "VERIFIED", evidence: [] };
  assert.equal(normalizeClaimState(claim), "UNVERIFIED");
  assert.equal(canRenderVerifiedClaim(claim), false);
  assert.throws(() => assertEvidenceBacked(claim), /require at least one evidence/);
});

test("verified claim renders only with evidence", () => {
  const claim = {
    ...base,
    state: "VERIFIED",
    evidence: [{
      evidenceId: "ev-1",
      sourceId: "registry-1",
      observedAt: "2026-09-02T00:00:00Z",
      sha256: "abc123"
    }]
  };
  assert.equal(normalizeClaimState(claim), "VERIFIED");
  assert.equal(canRenderVerifiedClaim(claim), true);
  assert.equal(assertEvidenceBacked(claim), claim);
});
