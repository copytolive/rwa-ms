import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../apps/web/public/index.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../apps/web/public/styles.css", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../apps/web/public/app.js", import.meta.url), "utf8");

test("selected Neon Graphite desktop terminal matches approved structure", () => {
  assert.match(html, /class="market-shell terminal"/);
  assert.match(html, /class="markets-rail market-sidebar panel"/);
  assert.match(html, /class="trade-rail"/);
  assert.match(html, /Business Engine/);
  assert.match(html, /Order Book/);
  assert.match(html, /Live Trades/);
  assert.match(html, /Your Position/);
});

test("mobile has approved portfolio-first Markets experience", () => {
  assert.match(html, /class="mobile-dashboard"/);
  assert.match(html, /Portfolio Overview/);
  assert.match(html, /My Positions/);
  assert.match(html, /id="mobileEngineIcons"/);
  assert.match(html, /class="mobile-nav"/);
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /mobile-market-actions/);
});

test("Hyperliquid read path remains real", () => {
  assert.match(js, /https:\/\/api\.hyperliquid\.xyz\/info/);
  assert.match(js, /wss:\/\/api\.hyperliquid\.xyz\/ws/);
  assert.match(js, /metaAndAssetCtxs/);
  assert.match(js, /candleSnapshot/);
  assert.match(js, /l2Book/);
  assert.match(js, /clearinghouseState/);
  assert.match(js, /openOrders/);
  assert.match(js, /userFills/);
});

test("browser application parses and never embeds a private key", () => {
  assert.doesNotThrow(() => new Function(js));
  assert.doesNotMatch(js, /privateKey|secret_key|mnemonic|seed phrase/i);
  assert.match(js, /public account address/);
});

test("PWA hooks remain present", () => {
  assert.match(html, /manifest\.webmanifest/);
  assert.match(js, /serviceWorker\.register/);
});