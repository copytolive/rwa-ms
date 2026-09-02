import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const profile = JSON.parse(fs.readFileSync(new URL("../apps/web/public/launch-profile.json", import.meta.url), "utf8"));

test("launch profile uses only local existing-repo roots", () => {
  const allowed = ["10_CORE_INFRA/", "20_BUSINESS_ENGINES/", "50_DATA/"];
  const active = [...profile.core, ...profile.launchEngines, ...profile.data];
  for (const item of active) {
    assert.equal(allowed.some(root => item.sourcePath.startsWith(root)), true, item.sourcePath);
    assert.equal(item.sourcePath.startsWith("90_REFERENCE_ONLY/"), false);
  }
});

test("all launch engine pins are immutable SHAs", () => {
  for (const item of profile.launchEngines) {
    assert.match(item.commit, /^[0-9a-f]{40}$/);
  }
});

test("held engines are not marked ready", () => {
  for (const item of profile.heldEngines) {
    assert.notEqual(item.state, "READY_FOR_ADAPTER");
    assert.ok(item.reason);
  }
});
