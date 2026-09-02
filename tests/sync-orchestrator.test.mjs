import test from "node:test";
import assert from "node:assert/strict";
import { requiredSyncStages, runSynchronizedAction } from "../dist/packages/adapters/src/sync.js";

function ports(failStage) {
  const stages = ["IDENTITY","AUTHORIZATION","POLICY","ENGINE","PAYMENT","LEDGER","EVENT","WORKFLOW","OBSERVABILITY"];
  return new Map(stages.map(stage => [stage, {
    stage,
    async execute() {
      if (stage === failStage) return { ok:false, detail:"blocked" };
      return { ok:true, reference:stage.toLowerCase()+"-ref" };
    }
  }]));
}

test("money flow synchronizes identity to observability in order", async () => {
  const request = { requestId:"req-1", actorId:"u-1", businessId:"b-1", action:"SELL", engineId:"commerce", amountMinor:1000n, currency:"USD" };
  assert.deepEqual(requiredSyncStages(request), ["IDENTITY","AUTHORIZATION","POLICY","ENGINE","PAYMENT","LEDGER","EVENT","WORKFLOW","OBSERVABILITY"]);
  const receipt = await runSynchronizedAction(request, ports());
  assert.equal(receipt.state, "COMPLETED");
  assert.equal(receipt.completedStages.length, 9);
});

test("policy failure blocks before engine/payment", async () => {
  const receipt = await runSynchronizedAction(
    { requestId:"req-2", actorId:"u-1", businessId:"b-1", action:"SELL", engineId:"commerce", amountMinor:1000n, currency:"USD" },
    ports("POLICY")
  );
  assert.equal(receipt.state, "BLOCKED");
  assert.equal(receipt.failedStage, "POLICY");
  assert.deepEqual(receipt.completedStages, ["IDENTITY","AUTHORIZATION"]);
});
