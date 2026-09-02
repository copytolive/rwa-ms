import fs from "node:fs";

const html=fs.readFileSync("apps/web/public/index.html","utf8");
const js=fs.readFileSync("apps/web/public/app.js","utf8");
const css=fs.readFileSync("apps/web/public/styles.css","utf8");

const checks=[];
const add=(name,ok,detail)=>checks.push({name,ok:Boolean(ok),detail});
const has=(text,needle,name)=>add(name,text.includes(needle),needle);

const buttonTags=[...html.matchAll(/<button\b([^>]*)>/g)].map(m=>m[1]);
const knownButton=(attrs)=>/\bdata-view=|\bdata-rail-mode=|\bdata-market-sort=|\bdata-interval=|\bdata-ltab=|\bdata-side=|\bdata-order-type=|\bdata-price-step=|\bdata-pct=|\bdata-mobile-side=|\bdata-close-sheet\b|\bdata-mobile-order-side=|\bdata-mobile-order-type=|\bdata-mobile-pct=/.test(attrs)
  || /\bid="(?:walletBtn|notifyBtn|accountBtn|watchBtn|placeOrder|setAccount|mobileSetAccount|mobileMarketPicker|openBusinessesFromSheet|mobilePreviewOrder|goActivityFromPreview)"/.test(attrs);
const unknown=buttonTags.filter(attrs=>!knownButton(attrs));
add("all static buttons classified",unknown.length===0,{total:buttonTags.length,unknown});

const contracts=[
  ["data-view",'$$("[data-view]").forEach(b=>b.onclick='],
  ["data-rail-mode",'$$("[data-rail-mode]").forEach(b=>b.onclick='],
  ["data-market-sort",'$$("[data-market-sort]").forEach(b=>b.onclick='],
  ["data-interval",'$$("[data-interval]").forEach(b=>b.onclick='],
  ["data-side",'$$("[data-side]").forEach(b=>b.onclick='],
  ["data-order-type",'$$("[data-order-type]").forEach(b=>b.onclick='],
  ["data-price-step",'$$("[data-price-step]").forEach(b=>b.onclick='],
  ["data-pct",'$$("[data-pct]").forEach(b=>b.onclick='],
  ["data-ltab",'$$("[data-ltab]").forEach(b=>b.onclick='],
  ["data-close-sheet",'$$("[data-close-sheet]").forEach(b=>b.onclick=closeSheets'],
  ["data-mobile-side",'$$("[data-mobile-side]").forEach(b=>b.onclick='],
  ["data-mobile-order-side",'$$("[data-mobile-order-side]").forEach(b=>b.onclick='],
  ["data-mobile-order-type",'$$("[data-mobile-order-type]").forEach(b=>b.onclick='],
  ["data-mobile-pct",'$$("[data-mobile-pct]").forEach(b=>b.onclick='],
  ["engine cards",'$$("[data-engine]").forEach(b=>b.onclick='],
  ["dynamic market rows",'$$("[data-market]").forEach(b=>b.onclick='],
  ["dynamic market picker",'$$("[data-pick-market]").forEach(b=>b.onclick=']
];
for(const [name,needle] of contracts) has(js,needle,"handler "+name);

for(const id of ["placeOrder","walletBtn","notifyBtn","accountBtn","watchBtn","setAccount","mobileSetAccount","mobileMarketPicker","openBusinessesFromSheet","mobilePreviewOrder","goActivityFromPreview"]){
  has(js,'$("#'+id+'").onclick=',"handler #"+id);
}
for(const id of ["marketSearch","globalSearch","orderPrice","orderSize","sizeRange","mobileOrderPrice","mobileOrderSize","mobileSizeRange","mobileMarketSearch"]){
  has(js,'$("#'+id+'").oninput=',"input #"+id);
}

add("no accidental triple selector helper",!js.includes("$$$("),"$$$(");
const singleForEach=[...js.matchAll(/(^|[^$])\$\("[^"]+"\)\.forEach/g)].map(m=>m[0]);
add("no querySelector used as collection",singleForEach.length===0,singleForEach);

for(const needle of ["metaAndAssetCtxs","candleSnapshot","l2Book","fundingHistory","wss://api.hyperliquid.xyz/ws","LightweightCharts.createChart","showOrderPreview","NOT CONNECTED ON STATIC PAGES","openMobileOrder","openMarketPicker"]){
  has(js,needle,"source/control "+needle);
}

has(css,".app{width:100vw;height:100svh","desktop full viewport");
has(css,"@media(min-width:821px)","desktop type breakpoint");
has(css,".topnav button{font-size:12px}","desktop nav readable size");
has(css,".market-name b{font-size:11px}","desktop market readable size");
has(css,"@media(max-width:820px)","mobile breakpoint");
has(css,".mobile-card-title b{font-size:11px}","mobile title readable size");
has(css,".mobile-total strong{font-size:24px}","mobile primary value size");
has(css,"grid-template-rows:28px auto minmax(150px,1fr) auto auto","mobile viewport filling layout");
for(const token of ["--green:#18ef82","--red:#ff4b45","--yellow:#ffcb45"])has(css,token,"semantic color "+token);

for(const fake of ["Manhattan Office REIT","Commercial Invoice","Solar Revenue Share","Art Basel 2024 NFT","Private Credit Pool"]){
  add("no synthetic market: "+fake,!html.includes(fake)&&!js.includes(fake),fake);
}

const failed=checks.filter(x=>!x.ok);
const report={generatedAt:new Date().toISOString(),total:checks.length,passed:checks.length-failed.length,failed:failed.length,checks};
process.stdout.write(JSON.stringify(report,null,2)+"\n");
if(failed.length){console.error("UI audit failures:",failed);process.exit(1)}
