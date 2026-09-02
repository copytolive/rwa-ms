import fs from "node:fs";

const html=fs.readFileSync("apps/web/public/index.html","utf8");
const js=fs.readFileSync("apps/web/public/app.js","utf8");
const css=fs.readFileSync("apps/web/public/styles.css","utf8");

const checks=[];
const add=(name,ok,detail)=>checks.push({name,ok:Boolean(ok),detail});
const must=(text,re,name)=>add(name,re.test(text),String(re));

const buttonTags=[...html.matchAll(/<button\b([^>]*)>/g)].map(m=>m[1]);
const knownButton=(attrs)=>{
  return /\bdata-view=|\bdata-rail-mode=|\bdata-market-sort=|\bdata-interval=|\bdata-ltab=|\bdata-side=|\bdata-order-type=|\bdata-price-step=|\bdata-pct=|\bdata-mobile-side=|\bdata-close-sheet\b|\bdata-mobile-order-side=|\bdata-mobile-order-type=|\bdata-mobile-pct=/.test(attrs)
    || /\bid="(?:walletBtn|notifyBtn|accountBtn|watchBtn|placeOrder|setAccount|mobileSetAccount|mobileMarketPicker|openBusinessesFromSheet|mobilePreviewOrder|goActivityFromPreview)"/.test(attrs);
};
const unknown=buttonTags.filter(attrs=>!knownButton(attrs));
add("all static buttons classified",unknown.length===0,{total:buttonTags.length,unknown});

const handlerContracts=[
  ["data-view",/\$\$\("\[data-view\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-rail-mode",/\$\$\("\[data-rail-mode\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-market-sort",/\$\$\("\[data-market-sort\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-interval",/\$\$\("\[data-interval\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-side",/\$\$\("\[data-side\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-order-type",/\$\$\("\[data-order-type\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-price-step",/\$\$\("\[data-price-step\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-pct",/\$\$\("\[data-pct\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-ltab",/\$\$\("\[data-ltab\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-close-sheet",/\$\$\("\[data-close-sheet\]"\)\.forEach\(b=>b\.onclick=closeSheets/],
  ["data-mobile-side",/\$\$\("\[data-mobile-side\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-mobile-order-side",/\$\$\("\[data-mobile-order-side\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-mobile-order-type",/\$\$\("\[data-mobile-order-type\]"\)\.forEach\(b=>b\.onclick=/],
  ["data-mobile-pct",/\$\$\("\[data-mobile-pct\]"\)\.forEach\(b=>b\.onclick=/],
  ["engine cards",/\$\$\("\[data-engine\]"\)\.forEach\(b=>b\.onclick=/],
  ["dynamic market rows",/\$\$\("\[data-market\]"\)\.forEach\(b=>b\.onclick=/],
  ["dynamic market picker",/\$\$\("\[data-pick-market\]"\)\.forEach\(b=>b\.onclick=/]
];
for(const [name,re] of handlerContracts) must(js,re,"handler "+name);

for(const id of ["placeOrder","walletBtn","notifyBtn","accountBtn","watchBtn","setAccount","mobileSetAccount","mobileMarketPicker","openBusinessesFromSheet","mobilePreviewOrder","goActivityFromPreview"]){
  must(js,new RegExp('\\$\\("#'+id+'"\\)\\.onclick='),"handler #"+id);
}
for(const id of ["marketSearch","globalSearch","orderPrice","orderSize","sizeRange","mobileOrderPrice","mobileOrderSize","mobileSizeRange","mobileMarketSearch"]){
  must(js,new RegExp('\\$\\("#'+id+'"\\)\\.oninput='),"input #"+id);
}

must(js,/metaAndAssetCtxs/,"real Hyperliquid market registry");
must(js,/candleSnapshot/,"real Hyperliquid candles");
must(js,/l2Book/,"real Hyperliquid order book");
must(js,/fundingHistory/,"real Hyperliquid funding");
must(js,/wss:\/\/api\.hyperliquid\.xyz\/ws/,"real Hyperliquid WebSocket");
must(js,/LightweightCharts\.createChart/,"TradingView Lightweight Charts");
must(js,/showOrderPreview/,"fail-closed order preview");
must(js,/NOT CONNECTED ON STATIC PAGES/,"honest upstream runtime disclosure");
must(js,/openMobileOrder/,"mobile order sheet");
must(js,/openMarketPicker/,"mobile live market picker");

must(css,/\.app\{width:100vw;height:100svh/,"desktop full viewport");
must(css,/@media\(min-width:821px\)/,"desktop type breakpoint");
must(css,/\.topnav button\{font-size:12px\}/,"desktop nav readable size");
must(css,/\.market-name b\{font-size:11px\}/,"desktop market readable size");
must(css,/@media\(max-width:820px\)/,"mobile breakpoint");
must(css,/\.mobile-card-title b\{font-size:11px\}/,"mobile title readable size");
must(css,/\.mobile-total strong\{font-size:24px\}/,"mobile primary value size");
must(css,/grid-template-rows:28px auto minmax\(150px,1fr\) auto auto/,"mobile viewport filling layout");
must(css,/--green:#18ef82/,"semantic green");
must(css,/--red:#ff4b45/,"semantic red");
must(css,/--yellow:#ffcb45/,"semantic warning yellow");

for(const fake of ["Manhattan Office REIT","Commercial Invoice","Solar Revenue Share","Art Basel 2024 NFT","Private Credit Pool"]){
  add("no synthetic market: "+fake,!html.includes(fake)&&!js.includes(fake),fake);
}

const failed=checks.filter(x=>!x.ok);
const report={generatedAt:new Date().toISOString(),total:checks.length,passed:checks.length-failed.length,failed:failed.length,checks};
process.stdout.write(JSON.stringify(report,null,2)+"\n");
if(failed.length){
  console.error("UI audit failures:",failed);
  process.exit(1);
}
