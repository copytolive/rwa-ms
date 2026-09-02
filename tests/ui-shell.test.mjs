import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../apps/web/public/index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../apps/web/public/styles.css", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../apps/web/public/app.js", import.meta.url), "utf8");

test("Fomo-style terminal structure is present", () => {
  assert.match(html, /class="terminal"/);
  assert.match(html, /class="market-sidebar"/);
  assert.match(html, /class="trade-rail"/);
  assert.match(html, /class="mobile-trade-bar"/);
  assert.match(html, /data-view-panel="discover"/);
  assert.match(html, /data-view-panel="portfolio"/);
});

test("mobile and desktop responsive states are explicit", () => {
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /\.mobile-nav\{/);
  assert.match(css, /grid-template-columns:300px minmax\(0,1fr\) 350px/);
  assert.match(css, /\.mobile-trade-bar/);
});

test("Hyperliquid read path is real and source aligned", () => {
  assert.match(js, /https:\/\/api\.hyperliquid\.xyz\/info/);
  assert.match(js, /wss:\/\/api\.hyperliquid\.xyz\/ws/);
  assert.match(js, /metaAndAssetCtxs/);
  assert.match(js, /candleSnapshot/);
  assert.match(js, /l2Book/);
  assert.match(js, /clearinghouseState/);
  assert.match(js, /openOrders/);
  assert.match(js, /userFills/);
});

test("browser application script parses", () => {
  assert.doesNotThrow(() => new Function(js));
});

test("real execution is fail-closed without an adapter", () => {
  assert.match(html, /execution adapter is configured/);
  assert.match(js, /preview-only/);
  assert.match(js, /adapterUrl/);
  assert.doesNotMatch(js, /privateKey|secret_key|mnemonic/i);
});

test("Option 1 Neon Graphite production shell includes existing repo engine dock and PWA", () => {
  assert.match(html, /id="marketEngineGrid"/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(css + fs.readFileSync(new URL("../apps/web/public/option1.css", import.meta.url), "utf8"), /engine-dock-grid/);
  assert.match(js, /renderEngineDocks/);
});
