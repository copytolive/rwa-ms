import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync(new URL("../apps/web/public/index.html",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../apps/web/public/styles.css",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../apps/web/public/app.js",import.meta.url),"utf8");
const pkg=JSON.parse(fs.readFileSync(new URL("../package.json",import.meta.url),"utf8"));

test("desktop is full viewport, not framed",()=>{
  assert.match(css,/width:100vw;height:100svh/);
  assert.doesNotMatch(css,/max-width:1480px;margin:58px auto/);
});

test("market has no synthetic RWA price fallback",()=>{
  for(const fake of ["Manhattan Office REIT","Commercial Invoice","Solar Revenue Share","Art Basel 2024 NFT","Private Credit Pool"]) {
    assert.doesNotMatch(js,new RegExp(fake));
    assert.doesNotMatch(html,new RegExp(fake));
  }
  assert.match(js,/metaAndAssetCtxs/);
  assert.match(js,/l2Book/);
  assert.match(js,/candleSnapshot/);
  assert.match(js,/fundingHistory/);
  assert.match(js,/wss:\/\/api\.hyperliquid\.xyz\/ws/);
});

test("official TradingView Lightweight Charts is pinned and used",()=>{
  assert.equal(pkg.dependencies["lightweight-charts"],"5.2.1");
  assert.match(html,/vendor\/lightweight-charts\.standalone\.production\.js/);
  assert.match(js,/LightweightCharts\.createChart/);
  assert.match(js,/LightweightCharts\.CandlestickSeries/);
  assert.match(js,/LightweightCharts\.HistogramSeries/);
  assert.doesNotMatch(js,/function drawChart/);
});

test("mobile has real chart and real account placeholders",()=>{
  assert.match(html,/id="mobileChart"/);
  assert.match(js,/clearinghouseState/);
  assert.match(js,/userFills/);
  assert.match(js,/openOrders/);
  assert.doesNotMatch(html,/\$125,430\.68/);
});

test("browser app parses and never asks for private keys",()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.doesNotMatch(js,/privateKey|mnemonic|secretKey/);
  assert.match(js,/never enter a private key/);
});

test("deploy creates a real Hyperliquid snapshot fallback and busts old PWA cache",()=>{
  const workflow=fs.readFileSync(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8");
  const sw=fs.readFileSync(new URL("../apps/web/public/sw.js",import.meta.url),"utf8");
  assert.match(workflow,/Capture real Hyperliquid deployment snapshot/);
  assert.match(workflow,/metaAndAssetCtxs/);
  assert.match(workflow,/btc-candles-1h\.json/);
  assert.match(js,/Hyperliquid Snapshot/);
  assert.match(js,/data\/hyperliquid-meta\.json/);
  assert.match(sw,/rwa-ms-real-market-v3/);
  assert.doesNotMatch(sw,/rwa-ms-option1-v1/);
});
