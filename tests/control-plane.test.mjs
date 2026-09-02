import test from "node:test";
import assert from "node:assert/strict";
import { mayProvision } from "../dist/services/control-plane/src/index.js";

test("business provisioning is allowed only by AVAILABLE policy", () => {
  assert.equal(mayProvision({
    state: "AVAILABLE",
    reasonCodes: [],
    evidenceIds: [],
    evaluatedAt: "2026-09-02T00:00:00Z"
  }), true);

  for (const state of ["VERIFICATION_REQUIRED", "RESTRICTED", "UNAVAILABLE", "INFORMATION_ONLY"]) {
    assert.equal(mayProvision({
      state,
      reasonCodes: ["POLICY_BLOCK"],
      evidenceIds: [],
      evaluatedAt: "2026-09-02T00:00:00Z"
    }), false);
  }
});
