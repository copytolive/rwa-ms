(()=>{"use strict";

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const API="https://api.hyperliquid.xyz/info";
const WS="wss://api.hyperliquid.xyz/ws";

const engines=[
  {id:"commerce",name:"Commerce",sub:"Medusa · sell / checkout",icon:"▣",source:"20_BUSINESS_ENGINES/medusa"},
  {id:"support",name:"Support",sub:"Chatwoot · chat / helpdesk",icon:"◉",source:"20_BUSINESS_ENGINES/chatwoot"},
  {id:"content",name:"Content",sub:"Ghost · publish / subscribe",icon:"▤",source:"20_BUSINESS_ENGINES/Ghost"},
  {id:"billing",name:"Billing",sub:"Kill Bill · billing / subscription",icon:"▥",source:"20_BUSINESS_ENGINES/killbill"},
  {id:"trust",name:"Trust",sub:"OpenFGA + OPA · authorization / policy",icon:"⬡",source:"10_CORE_INFRA/openfga + 10_CORE_INFRA/opa"}
];

const state={
  markets:[],
  selected:"BTC",
  sort:"volume",
  railMode:"markets",
  side:"buy",
  orderType:"limit",
  interval:"1h",
  orderPercent:25,
  orderPriceDirty:false,
  book:null,
  candles:[],
  fundingRows:[],
  trades:[],
  ws:null,
  account:localStorage.getItem("rwa_account")||"",
  accountState:null,
  orders:[],
  fills:[],
  watch:new Set(JSON.parse(localStorage.getItem("rwa_watch")||"[]")),
  chart:null,
  candleSeries:null,
  volumeSeries:null,
  mobileChart:null,
  mobileSeries:null,
  modalRestore:null
};

const fmt=n=>Number.isFinite(Number(n))?Number(n).toLocaleString("en-US",{maximumFractionDigits:6}):"—";
const compact=n=>Number.isFinite(Number(n))?Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:2}).format(Number(n)):"—";
const money=n=>Number.isFinite(Number(n))?"$"+Number(n).toLocaleString("en-US",{maximumFractionDigits:2}):"—";
const pct=(n,d=2)=>Number.isFinite(Number(n))?(Number(n)>=0?"+":"")+Number(n).toFixed(d)+"%":"—";

function setStatus(mode,label){
  $("#statusDot").className=mode==="live"?"online":mode==="snapshot"?"snapshot":"offline";
  $("#statusText").textContent=label;
}

async function postInfo(body,timeout=6000){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const r=await fetch(API,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body),
      signal:ctrl.signal
    });
    if(!r.ok)throw new Error("HTTP "+r.status);
    return await r.json();
  }finally{
    clearTimeout(timer);
  }
}

async function staticJson(path){
  const r=await fetch(path,{cache:"no-store"});
  if(!r.ok)throw new Error("Snapshot HTTP "+r.status);
  return r.json();
}

function toast(message,tone="info"){
  const el=$("#toast");
  el.textContent=message;
  el.dataset.tone=tone;
  el.hidden=false;
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>{el.hidden=true},2600);
}

function closeModal(){
  if(state.modalRestore){
    state.modalRestore();
    state.modalRestore=null;
  }
  $("#appModal").hidden=true;
  $("#modalBody").innerHTML="";
  $("#modalActions").innerHTML="";
}

function openModal(title,body,actions=[]){
  if(state.modalRestore){
    state.modalRestore();
    state.modalRestore=null;
  }
  $("#modalTitle").textContent=title;
  $("#modalBody").innerHTML=body;
  $("#modalActions").innerHTML=actions.map(a=>
    '<button class="'+(a.primary?"modal-primary":"modal-secondary")+'" data-modal-action="'+a.id+'">'+a.label+'</button>'
  ).join("");
  $("#appModal").hidden=false;
}

function configureAccount(){
  openModal(
    "Public Hyperliquid account",
    '<label class="modal-field">Public address<input id="modalAccountInput" autocomplete="off" placeholder="0x…" value="'+state.account+'"></label>'+
    '<p class="modal-note">Read-only public address only. never enter a private key, seed phrase, or any signing secret.</p>',
    [{id:"clear-account",label:"Clear"},{id:"save-account",label:"Save",primary:true}]
  );
  setTimeout(()=>$("#modalAccountInput")?.focus(),0);
}

async function saveAccountFromModal(){
  const address=($("#modalAccountInput")?.value||"").trim();
  if(address&&!/^0x[a-fA-F0-9]{40}$/.test(address)){
    toast("Invalid Hyperliquid public address.","error");
    return;
  }
  state.account=address;
  localStorage.setItem("rwa_account",address);
  closeModal();
  await loadAccount();
  toast(address?"Public account loaded.":"Public account cleared.");
}

function clearAccount(){
  state.account="";
  state.accountState=null;
  state.orders=[];
  state.fills=[];
  localStorage.removeItem("rwa_account");
  closeModal();
  renderAccount();
  toast("Public account cleared.");
}

function engineDetail(id){
  const e=engines.find(x=>x.id===id);
  if(!e)return;
  openModal(
    e.name,
    '<div class="system-detail">'+
      '<div><span>Repository source</span><b>'+e.source+'</b></div>'+
      '<div><span>Capability</span><b>'+e.sub+'</b></div>'+
      '<div><span>Source state</span><b class="positive">REPO READY</b></div>'+
      '<div><span>Runtime state</span><b class="warning">NOT CONNECTED ON GITHUB PAGES</b></div>'+
    '</div>'+
    '<p class="modal-note">The source is present in RWA_MS_REPOS. A deployed service endpoint/adapter is still required before this engine can execute production actions.</p>',
    [{id:"close",label:"Close",primary:true}]
  );
}

function current(){
  return state.markets.find(x=>x.code===state.selected)||state.markets[0]||null;
}

function parseMarkets(payload){
  const meta=payload?.[0]?.universe||[];
  const ctx=payload?.[1]||[];
  return meta.map((a,i)=>{
    const c=ctx[i]||{};
    const mark=Number(c.markPx||c.midPx||0);
    const prev=Number(c.prevDayPx||mark);
    const change=prev?((mark-prev)/prev)*100:0;
    return {
      code:a.name,
      name:a.name+" Perpetual",
      price:mark,
      change,
      volume:Number(c.dayNtlVlm||0),
      funding:Number(c.funding||0)*100,
      oi:Number(c.openInterest||0),
      oracle:Number(c.oraclePx||0),
      maxLeverage:Number(a.maxLeverage||1)
    };
  }).filter(x=>x.price>0);
}

function sortMarkets(arr){
  const rows=[...arr];
  if(state.sort==="gainers")return rows.sort((a,b)=>b.change-a.change);
  if(state.sort==="losers")return rows.sort((a,b)=>a.change-b.change);
  return rows.sort((a,b)=>b.volume-a.volume);
}

function renderTicker(){
  const rows=sortMarkets(state.markets).slice(0,14);
  if(!rows.length){
    $("#ticker").innerHTML='<div class="ticker-loading">No live markets returned.</div>';
    return;
  }
  const segment=rows.map(m=>
    '<span class="ticker-item"><b>'+m.code+'</b><span>'+fmt(m.price)+'</span><strong class="'+(m.change>=0?"positive":"negative")+'">'+pct(m.change)+'</strong></span>'
  ).join("");
  $("#ticker").innerHTML='<div class="ticker-track">'+segment+segment+'</div>';
  $("#mobileTicker").innerHTML=rows.slice(0,5).map(m=>
    '<span><b>'+m.code+'</b>&nbsp; '+fmt(m.price)+' <strong class="'+(m.change>=0?"positive":"negative")+'">'+pct(m.change)+'</strong></span>'
  ).join("");
}

function renderMarkets(){
  const q=($("#marketSearch")?.value||"").trim().toLowerCase();
  let rows=sortMarkets(state.markets).filter(m=>!q||(m.code+" "+m.name).toLowerCase().includes(q));
  if(state.railMode==="watchlist")rows=rows.filter(m=>state.watch.has(m.code));
  $("#marketRows").innerHTML=rows.length?rows.slice(0,120).map(m=>
    '<button class="market-row '+(m.code===state.selected?"active":"")+'" data-market="'+m.code+'" aria-label="Open '+m.code+' perpetual market">'+
      '<span class="market-name"><span class="round">'+m.code.slice(0,1)+'</span><span><b>'+m.code+'</b><small>Hyperliquid Perp</small></span></span>'+
      '<span>'+fmt(m.price)+'</span>'+
      '<span class="'+(m.change>=0?"positive":"negative")+'">'+pct(m.change)+'</span>'+
      '<span>$'+compact(m.volume)+'</span>'+
      '<span class="star">'+(state.watch.has(m.code)?"★":"☆")+'</span>'+
    '</button>'
  ).join(""):'<div class="empty">No live markets match this filter.</div>';
  $$("[data-market]").forEach(b=>b.onclick=()=>selectMarket(b.dataset.market));
}

function renderEngines(){
  $("#engineCards").innerHTML=engines.map(e=>
    '<button class="engine-card" data-engine-id="'+e.id+'" aria-label="Open '+e.name+' source status">'+
      '<div class="engine-card-head"><div class="engine-icon">'+e.icon+'</div><div><h4>'+e.name+'</h4><p>'+e.sub+'</p></div></div>'+
      '<span class="engine-state">REPO READY</span>'+
    '</button>'
  ).join("");
  $("#mobileEngineIcons").innerHTML=engines.map(e=>
    '<button class="mobile-engine-icon" data-engine-id="'+e.id+'" aria-label="Open '+e.name+' source status"><i>'+e.icon+'</i><b>'+e.name+'</b></button>'
  ).join("");
  $("#businessGrid").innerHTML=engines.map(e=>
    '<button class="business-box" data-engine-id="'+e.id+'" aria-label="Open '+e.name+' source status">'+
      '<div class="engine-card-head"><div class="engine-icon">'+e.icon+'</div><div><h3>'+e.name+'</h3><p>'+e.sub+'</p></div></div>'+
      '<p style="margin-top:12px;font:9px ui-monospace,SFMono-Regular,monospace">'+e.source+'</p>'+
    '</button>'
  ).join("");
  $$("[data-engine-id]").forEach(x=>x.onclick=()=>engineDetail(x.dataset.engineId));
}

function initCharts(){
  if(!window.LightweightCharts){
    setStatus("offline","Chart library missing");
    return;
  }
  const options={
    layout:{background:{type:"solid",color:"#061012"},textColor:"#758985",fontSize:10},
    grid:{vertLines:{color:"rgba(40,75,68,.22)"},horzLines:{color:"rgba(40,75,68,.22)"}},
    crosshair:{mode:window.LightweightCharts.CrosshairMode.Normal},
    rightPriceScale:{borderColor:"#17272a"},
    timeScale:{borderColor:"#17272a",timeVisible:true,secondsVisible:false},
    handleScroll:true,
    handleScale:true
  };
  state.chart=window.LightweightCharts.createChart($("#priceChart"),{
    ...options,width:$("#priceChart").clientWidth,height:$("#priceChart").clientHeight
  });
  state.candleSeries=state.chart.addSeries(window.LightweightCharts.CandlestickSeries,{
    upColor:"#18ef82",downColor:"#ff4b45",borderVisible:false,wickUpColor:"#18ef82",wickDownColor:"#ff4b45"
  });
  state.volumeSeries=state.chart.addSeries(window.LightweightCharts.HistogramSeries,{
    priceFormat:{type:"volume"},priceScaleId:"",lastValueVisible:false,priceLineVisible:false
  });
  state.volumeSeries.priceScale().applyOptions({scaleMargins:{top:.82,bottom:0}});
  state.mobileChart=window.LightweightCharts.createChart($("#mobileChart"),{
    ...options,
    width:$("#mobileChart").clientWidth,
    height:$("#mobileChart").clientHeight,
    rightPriceScale:{visible:false},
    timeScale:{visible:false},
    grid:{vertLines:{visible:false},horzLines:{visible:false}},
    crosshair:{mode:window.LightweightCharts.CrosshairMode.Hidden}
  });
  state.mobileSeries=state.mobileChart.addSeries(window.LightweightCharts.LineSeries,{
    color:"#18ef82",lineWidth:2,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false
  });
  const ro=new ResizeObserver(()=>{
    if(state.chart)state.chart.applyOptions({width:$("#priceChart").clientWidth,height:$("#priceChart").clientHeight});
    if(state.mobileChart)state.mobileChart.applyOptions({width:$("#mobileChart").clientWidth,height:$("#mobileChart").clientHeight});
  });
  ro.observe($("#priceChart"));
  ro.observe($("#mobileChart"));
}

function renderCharts(){
  if(!state.candleSeries)return;
  const candles=state.candles.map(c=>({
    time:Math.floor(Number(c.t)/1000),
    open:Number(c.o),high:Number(c.h),low:Number(c.l),close:Number(c.c)
  })).filter(c=>Number.isFinite(c.time)&&Number.isFinite(c.close));
  state.candleSeries.setData(candles);
  state.volumeSeries.setData(state.candles.map(c=>({
    time:Math.floor(Number(c.t)/1000),
    value:Number(c.v||0),
    color:Number(c.c)>=Number(c.o)?"rgba(24,239,130,.28)":"rgba(255,75,69,.24)"
  })));
  if(candles.length){
    state.chart.timeScale().fitContent();
    state.mobileSeries.setData(candles.slice(-50).map(c=>({time:c.time,value:c.close})));
    state.mobileChart.timeScale().fitContent();
  }else{
    state.mobileSeries.setData([]);
  }
}

function renderHeader(){
  const m=current();
  if(!m)return;
  $("#assetIcon").textContent=m.code.slice(0,1);
  $("#assetName").textContent=m.name;
  $("#assetCode").textContent=m.code;
  $("#assetPrice").textContent=fmt(m.price);
  $("#assetChange").textContent=pct(m.change);
  $("#assetChange").className=m.change>=0?"positive":"negative";
  $("#volume24").textContent="$"+compact(m.volume);
  $("#openInterest").textContent="$"+compact(m.oi*m.price);
  $("#funding").textContent=pct(m.funding,4);
  $("#funding").className=m.funding>=0?"positive":"negative";
  $("#orderMarket").textContent=m.code;
  if(state.orderType==="market"||!state.orderPriceDirty)$("#orderPrice").value=String(m.price);
  $("#watchBtn").textContent=state.watch.has(m.code)?"★":"☆";
  $("#watchBtn").classList.toggle("active",state.watch.has(m.code));
  $("#mobileMarketCode").textContent=m.code;
  $("#mobileMarketName").textContent=m.name;
  $("#mobileMarketPrice").textContent=fmt(m.price);
  $("#mobileBuyPrice").textContent=fmt(m.price);
  $("#mobileSellPrice").textContent=fmt(m.price);
  updateOrder();
}

function renderOrderBook(){
  const levels=state.book?.levels;
  if(!Array.isArray(levels)){
    $("#asks").innerHTML='<div class="empty">Live order book unavailable.</div>';
    $("#bids").innerHTML="";
    $("#spread").textContent="Spread —";
    return;
  }
  const bids=(levels[0]||[]).slice(0,12);
  const asks=(levels[1]||[]).slice(0,12).reverse();
  const all=[...bids,...asks];
  const max=Math.max(1,...all.map(x=>Number(x.sz||0)));
  const rows=(list,type)=>list.map(x=>{
    const px=Number(x.px),sz=Number(x.sz);
    return '<div class="ob-row '+type+'"><i class="depth" style="width:'+Math.min(100,sz/max*100)+'%"></i><span>'+fmt(px)+'</span><span>'+fmt(sz)+'</span><span>'+fmt(px*sz)+'</span></div>';
  }).join("");
  $("#asks").innerHTML=rows(asks,"ask");
  $("#bids").innerHTML=rows(bids,"bid");
  const bestBid=Number(bids[0]?.px||0);
  const bestAsk=Number((levels[1]||[])[0]?.px||0);
  $("#spread").textContent=bestBid&&bestAsk?"Spread "+fmt(bestAsk-bestBid):"Spread —";
}

function renderTrades(){
  const rows=state.trades.slice(0,60);
  $("#liveTrades").innerHTML=rows.length?rows.map(t=>
    '<div class="trade-row"><span class="'+(t.side==="B"?"positive":"negative")+'">'+fmt(t.px)+'</span><span>'+fmt(t.sz)+'</span><span>'+new Date(t.time).toLocaleTimeString()+'</span></div>'
  ).join(""):'<div class="empty">Waiting for WebSocket trades…</div>';
  renderActivity();
}

function renderFunding(){
  const rows=state.fundingRows.slice(-30).reverse();
  $("#fundingRows").innerHTML=rows.length?rows.map(r=>
    '<div class="funding-row"><span>'+new Date(r.time).toLocaleString()+'</span><span>'+pct(Number(r.fundingRate||0)*100,4)+'</span><span>'+pct(Number(r.premium||0)*100,4)+'</span><span>'+state.selected+'</span></div>'
  ).join(""):'<div class="empty">No funding history returned.</div>';
}

function renderHighLow(){
  const highs=state.candles.map(c=>Number(c.h)).filter(Number.isFinite);
  const lows=state.candles.map(c=>Number(c.l)).filter(Number.isFinite);
  $("#high24").textContent=highs.length?fmt(Math.max(...highs.slice(-24))):"—";
  $("#low24").textContent=lows.length?fmt(Math.min(...lows.slice(-24))):"—";
}

function connectWs(coin){
  try{
    if(state.ws)state.ws.close();
    const ws=new WebSocket(WS);
    state.ws=ws;
    ws.onopen=()=>ws.send(JSON.stringify({method:"subscribe",subscription:{type:"trades",coin}}));
    ws.onmessage=e=>{
      try{
        const msg=JSON.parse(e.data);
        if(msg.channel==="trades"&&Array.isArray(msg.data)){
          msg.data.forEach(t=>state.trades.unshift({side:t.side,px:Number(t.px),sz:Number(t.sz),time:Number(t.time)}));
          state.trades=state.trades.slice(0,100);
          renderTrades();
        }
      }catch{}
    };
  }catch{}
}

async function loadDetail(){
  const m=current();
  if(!m)return;
  const step={"1m":60e3,"5m":300e3,"15m":900e3,"1h":3600e3,"4h":14400e3,"1d":86400e3}[state.interval]||3600e3;
  const end=Date.now();
  const start=end-step*180;
  try{
    const [book,candles,funding]=await Promise.all([
      postInfo({type:"l2Book",coin:m.code,nSigFigs:5}),
      postInfo({type:"candleSnapshot",req:{coin:m.code,interval:state.interval,startTime:start,endTime:end}}),
      postInfo({type:"fundingHistory",coin:m.code,startTime:end-24*3600e3,endTime:end})
    ]);
    state.book=book;
    state.candles=Array.isArray(candles)?candles:[];
    state.fundingRows=Array.isArray(funding)?funding:[];
    renderOrderBook();renderFunding();renderHighLow();renderCharts();connectWs(m.code);
  }catch(e){
    console.warn(e);
    if(m.code==="BTC"&&state.interval==="1h"){
      try{
        const [book,candles,funding]=await Promise.all([
          staticJson("./data/btc-book.json"),
          staticJson("./data/btc-candles-1h.json"),
          staticJson("./data/btc-funding.json")
        ]);
        state.book=book;
        state.candles=Array.isArray(candles)?candles:[];
        state.fundingRows=Array.isArray(funding)?funding:[];
        renderOrderBook();renderFunding();renderHighLow();renderCharts();
        return;
      }catch(snapshotError){
        console.warn(snapshotError);
      }
    }
    state.book=null;state.candles=[];state.fundingRows=[];
    renderOrderBook();renderFunding();renderCharts();
  }
}

async function selectMarket(code){
  if(!state.markets.some(m=>m.code===code))return;
  state.selected=code;
  state.trades=[];
  state.orderPriceDirty=false;
  renderMarkets();
  renderHeader();
  renderTrades();
  await loadDetail();
}

async function loadMarkets(){
  let payload;
  let mode="live";
  try{
    payload=await postInfo({type:"metaAndAssetCtxs"});
  }catch(liveError){
    console.warn("Live Hyperliquid unavailable; using real deploy snapshot",liveError);
    payload=await staticJson("./data/hyperliquid-meta.json");
    mode="snapshot";
  }
  try{
    state.markets=parseMarkets(payload);
    if(!state.markets.length)throw new Error("No markets");
    if(!state.markets.some(m=>m.code===state.selected)){
      state.selected=state.markets.find(m=>m.code==="BTC")?.code||sortMarkets(state.markets)[0].code;
    }
    setStatus(mode,mode==="live"?"Hyperliquid Live":"Hyperliquid Snapshot");
    renderTicker();renderMarkets();renderHeader();renderDiscover();
    await loadDetail();
  }catch(e){
    console.error(e);
    setStatus("offline","Market Offline");
    $("#marketRows").innerHTML='<div class="empty">Real Hyperliquid market data is unavailable. No synthetic fallback is shown.</div>';
  }
}

function renderDiscover(){
  const top=sortMarkets(state.markets).slice(0,8);
  $("#discoverGrid").innerHTML=[
    ...top.map(m=>
      '<button class="discover-card" data-open-market="'+m.code+'"><h3>'+m.code+' Perpetual</h3><p>Hyperliquid · $'+compact(m.volume)+' 24h volume</p><b class="'+(m.change>=0?"positive":"negative")+'" style="display:block;margin-top:10px">'+pct(m.change)+'</b></button>'
    ),
    ...engines.slice(0,4).map(e=>
      '<button class="discover-card" data-engine-id="'+e.id+'"><h3>'+e.name+'</h3><p>'+e.sub+'</p><b style="display:block;margin-top:10px;color:var(--green)">REPO SOURCE</b></button>'
    )
  ].join("");
  $$("[data-open-market]",$("#discoverGrid")).forEach(x=>x.onclick=()=>{
    selectMarket(x.dataset.openMarket);
    setView("market");
  });
  $$("[data-engine-id]",$("#discoverGrid")).forEach(x=>x.onclick=()=>engineDetail(x.dataset.engineId));
}

function renderOrderType(){
  const market=state.orderType==="market";
  $("#orderPrice").disabled=market;
  $("#orderPriceLabel").textContent=market?"Market price":state.orderType==="stop"?"Trigger price (USD)":"Limit price (USD)";
  if(market&&current()){
    $("#orderPrice").value=String(current().price);
    state.orderPriceDirty=false;
  }
  updateOrder();
}

function priceStep(){
  const p=Number(current()?.price||0);
  if(p>=1000)return 1;
  if(p>=100)return .1;
  if(p>=1)return .01;
  return .0001;
}

function setOrderPercent(value,calculate=true){
  state.orderPercent=Math.max(0,Math.min(100,Number(value)||0));
  $("#sizeRange").value=String(state.orderPercent);
  $$("[data-pct]").forEach(x=>x.classList.toggle("active",Number(x.dataset.pct)===state.orderPercent));
  if(!calculate)return;
  const available=Number(state.accountState?.withdrawable||0);
  const m=current();
  const price=state.orderType==="market"?Number(m?.price||0):Number($("#orderPrice").value||m?.price||0);
  if(available>0&&price>0){
    $("#orderSize").value=((available*state.orderPercent/100)/price).toFixed(6).replace(/0+$/,"").replace(/\.$/,"");
    updateOrder();
  }else{
    toast("Set a public account to calculate size from withdrawable balance.");
  }
}

function updateOrder(){
  const m=current();
  const price=state.orderType==="market"?Number(m?.price||0):Number(String($("#orderPrice").value||"").replace(/,/g,""));
  const size=Number($("#orderSize").value||0);
  $("#orderValue").textContent=price>0&&size>0?money(price*size):"—";
  const button=$("#placeOrder");
  button.textContent="Preview "+(state.side==="buy"?"Buy":"Sell")+" Order";
  button.classList.toggle("sell",state.side==="sell");
}

function orderPreviewHtml(){
  const m=current();
  const price=state.orderType==="market"?Number(m?.price||0):Number($("#orderPrice").value||0);
  const size=Number($("#orderSize").value||0);
  const value=price>0&&size>0?price*size:0;
  return '<div class="preview-grid">'+
    '<div><span>Market</span><b>'+String(m?.code||"—")+'</b></div>'+
    '<div><span>Side</span><b class="'+(state.side==="buy"?"positive":"negative")+'">'+state.side.toUpperCase()+'</b></div>'+
    '<div><span>Order type</span><b>'+state.orderType.toUpperCase()+'</b></div>'+
    '<div><span>Price</span><b>'+fmt(price)+'</b></div>'+
    '<div><span>Size</span><b>'+fmt(size)+'</b></div>'+
    '<div><span>Notional</span><b>'+money(value)+'</b></div>'+
    '<div><span>Execution</span><b class="warning">LOCKED — SIGNER ADAPTER REQUIRED</b></div>'+
  '</div><p class="modal-note">Market data and chart are real. This preview does not submit a trade.</p>';
}

function showOrderPreview(){
  const size=Number($("#orderSize").value||0);
  if(!(size>0)){
    toast("Enter an order size first.","error");
    return;
  }
  if(state.modalRestore){
    state.modalRestore();
    state.modalRestore=null;
  }
  openModal(
    "Review "+(state.side==="buy"?"Buy":"Sell")+" order",
    orderPreviewHtml(),
    [{id:"close",label:"Close",primary:true}]
  );
}

function openMobileOrder(side){
  closeModal();
  state.side=side;
  $$("[data-side]").forEach(x=>x.classList.toggle("active",x.dataset.side===side));
  updateOrder();
  const entry=$(".order-entry");
  const rail=$(".trade-rail");
  $("#modalTitle").textContent=(side==="buy"?"Buy ":"Sell ")+(current()?.code||"");
  $("#modalBody").innerHTML="";
  $("#modalActions").innerHTML="";
  $("#appModal").hidden=false;
  $("#modalBody").appendChild(entry);
  entry.classList.add("mobile-order-entry");
  state.modalRestore=()=>{
    entry.classList.remove("mobile-order-entry");
    rail.insertBefore(entry,rail.firstElementChild);
  };
}

function renderActivity(){
  const fillRows=state.fills.slice(0,20).map(f=>
    '<div class="activity-row"><span>'+String(f.dir||f.side)+" "+f.coin+'</span><span>'+fmt(f.px)+'</span><span>'+fmt(f.sz)+'</span><span>'+new Date(Number(f.time)).toLocaleString()+'</span></div>'
  );
  const marketRows=state.trades.slice(0,20).map(t=>
    '<div class="activity-row"><span>'+(t.side==="B"?"BUY ":"SELL ")+state.selected+'</span><span>'+fmt(t.px)+'</span><span>'+fmt(t.sz)+'</span><span>'+new Date(t.time).toLocaleTimeString()+'</span></div>'
  );
  $("#activityList").innerHTML=[...fillRows,...marketRows].join("")||'<div class="empty">No account fills or live market trades yet.</div>';
}

function renderAccount(){
  const s=state.accountState;
  const positions=s?.assetPositions?.map(x=>x.position).filter(p=>Number(p.szi||0)!==0)||[];
  const value=Number(s?.marginSummary?.accountValue);
  const withdrawable=Number(s?.withdrawable);
  const margin=Number(s?.marginSummary?.totalMarginUsed);
  $("#portfolioSummary").innerHTML=
    '<div class="summary-card"><span>Account Value</span><strong>'+money(value)+'</strong></div>'+
    '<div class="summary-card"><span>Withdrawable</span><strong>'+money(withdrawable)+'</strong></div>'+
    '<div class="summary-card"><span>Margin Used</span><strong>'+money(margin)+'</strong></div>'+
    '<div class="summary-card"><span>Positions</span><strong>'+positions.length+'</strong></div>';
  $("#mobilePortfolioValue").textContent=money(value);
  $("#mobileWithdrawable").textContent=money(withdrawable);
  $("#mobileMarginUsed").textContent=money(margin);
  $("#mobilePositionCount").textContent=String(positions.length);
  $("#mobilePortfolioPnl").textContent=state.account?state.account.slice(0,6)+"…"+state.account.slice(-4):"Public account not set";
  const rows=positions.length?positions.map(p=>
    '<div class="portfolio-row"><span><b>'+p.coin+' Perpetual</b><small style="display:block;color:#82938f">Hyperliquid</small></span><span>'+fmt(p.szi)+'</span><span class="'+(Number(p.unrealizedPnl)>=0?"positive":"negative")+'">'+money(p.unrealizedPnl)+'</span><span>'+String(p.leverage?.value||"—")+'x</span></div>'
  ).join(""):'<div class="empty">No open positions.</div>';
  $("#portfolioList").innerHTML=rows;
  $("#mobilePositions").innerHTML=positions.length?positions.slice(0,4).map(p=>
    '<div class="mobile-position-row"><span><b>'+p.coin+' Perp</b></span><em>'+fmt(p.szi)+'</em><strong class="'+(Number(p.unrealizedPnl)>=0?"positive":"negative")+'">'+money(p.unrealizedPnl)+'</strong></div>'
  ).join(""):'<div class="empty">No open positions.</div>';
  const cp=positions.find(p=>p.coin===state.selected);
  $("#positionBody").innerHTML=cp?
    '<div class="position-grid"><div><span>Size</span><b>'+fmt(cp.szi)+'</b></div><div><span>Entry</span><b>'+fmt(cp.entryPx)+'</b></div><div><span>Unrealized P&L</span><b class="'+(Number(cp.unrealizedPnl)>=0?"positive":"negative")+'">'+money(cp.unrealizedPnl)+'</b></div><div><span>Leverage</span><b>'+String(cp.leverage?.value||"—")+'x</b></div></div>':
    '<div class="empty">No active '+state.selected+' position.</div>';
  $("#tradeHistory").innerHTML=state.fills.length?state.fills.slice(0,50).map(f=>
    '<div class="fill-row"><span>'+String(f.dir||f.side)+'</span><span>'+f.coin+'</span><span>'+fmt(f.px)+'</span><span>'+fmt(f.sz)+'</span></div>'
  ).join(""):'<div class="empty">No fills returned.</div>';
  renderActivity();
}

async function loadAccount(){
  if(!/^0x[a-fA-F0-9]{40}$/.test(state.account)){
    state.accountState=null;
    state.orders=[];
    state.fills=[];
    renderAccount();
    return;
  }
  try{
    const [clearing,orders,fills]=await Promise.all([
      postInfo({type:"clearinghouseState",user:state.account,dex:""}),
      postInfo({type:"openOrders",user:state.account,dex:""}),
      postInfo({type:"userFills",user:state.account})
    ]);
    state.accountState=clearing;
    state.orders=Array.isArray(orders)?orders:[];
    state.fills=Array.isArray(fills)?fills:[];
    renderAccount();
  }catch(e){
    console.warn(e);
    toast("Unable to load public account state.","error");
  }
}

function setView(view){
  $$(".view").forEach(x=>x.classList.toggle("active",x.dataset.viewPanel===view));
  $$("[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  history.replaceState(null,"","#"+view);
}

function wire(){
  $$("[data-view]").forEach(b=>b.onclick=()=>setView(b.dataset.view));
  $("#marketSearch").oninput=renderMarkets;
  $("#globalSearch").oninput=e=>{
    $("#marketSearch").value=e.target.value;
    renderMarkets();
    setView("market");
  };
  $$("[data-market-sort]").forEach(b=>b.onclick=()=>{
    state.sort=b.dataset.marketSort;
    $$("[data-market-sort]").forEach(x=>x.classList.toggle("active",x===b));
    renderMarkets();
  });
  $$("[data-rail-mode]").forEach(b=>b.onclick=()=>{
    state.railMode=b.dataset.railMode;
    $$("[data-rail-mode]").forEach(x=>x.classList.toggle("active",x===b));
    renderMarkets();
  });
  $("#watchBtn").onclick=()=>{
    state.watch.has(state.selected)?state.watch.delete(state.selected):state.watch.add(state.selected);
    localStorage.setItem("rwa_watch",JSON.stringify([...state.watch]));
    renderHeader();
    renderMarkets();
  };
  $$("[data-interval]").forEach(b=>b.onclick=()=>{
    state.interval=b.dataset.interval;
    $$("[data-interval]").forEach(x=>x.classList.toggle("active",x===b));
    loadDetail();
  });
  $$("[data-side]").forEach(b=>b.onclick=()=>{
    state.side=b.dataset.side;
    $$("[data-side]").forEach(x=>x.classList.toggle("active",x===b));
    updateOrder();
  });
  $$("[data-order-type]").forEach(b=>b.onclick=()=>{
    state.orderType=b.dataset.orderType;
    state.orderPriceDirty=false;
    $$("[data-order-type]").forEach(x=>x.classList.toggle("active",x===b));
    renderOrderType();
  });
  $("#orderPrice").oninput=()=>{
    state.orderPriceDirty=true;
    updateOrder();
  };
  $("#orderSize").oninput=updateOrder;
  $$("[data-price-step]").forEach(b=>b.onclick=()=>{
    if(state.orderType==="market")return;
    const base=Number($("#orderPrice").value||current()?.price||0);
    $("#orderPrice").value=String(Math.max(0,base+Number(b.dataset.priceStep)*priceStep()));
    state.orderPriceDirty=true;
    updateOrder();
  });
  $$("[data-pct]").forEach(b=>b.onclick=()=>setOrderPercent(b.dataset.pct));
  $("#sizeRange").oninput=e=>setOrderPercent(e.target.value);
  $$("[data-ltab]").forEach(b=>b.onclick=()=>{
    $$("[data-ltab]").forEach(x=>x.classList.toggle("active",x===b));
    $$("[data-lpanel]").forEach(x=>x.classList.toggle("active",x.dataset.lpanel===b.dataset.ltab));
  });
  $("#placeOrder").onclick=showOrderPreview;
  $("#walletBtn").onclick=configureAccount;
  $("#accountBtn").onclick=configureAccount;
  $("#setAccount").onclick=configureAccount;
  $("#mobileSetAccount").onclick=configureAccount;
  $("#notifyBtn").onclick=()=>{
    setView("activity");
    openModal(
      "Notifications & activity",
      '<p class="modal-note">Activity is live from Hyperliquid market trades and public-account fills. A separate push-notification runtime is not connected on GitHub Pages.</p>',
      [{id:"close",label:"Open Activity",primary:true}]
    );
  };
  $$("[data-mobile-side]").forEach(b=>b.onclick=()=>openMobileOrder(b.dataset.mobileSide));
  $("#modalClose").onclick=closeModal;
  $$("[data-modal-close]").forEach(x=>x.onclick=closeModal);
  $("#modalActions").onclick=e=>{
    const action=e.target.closest("[data-modal-action]")?.dataset.modalAction;
    if(!action)return;
    if(action==="save-account")saveAccountFromModal();
    else if(action==="clear-account")clearAccount();
    else closeModal();
  };
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&!$("#appModal").hidden)closeModal();
  });
}

async function boot(){
  renderEngines();
  wire();
  renderOrderType();
  if(window.LightweightCharts)initCharts();
  else setStatus("offline","TradingView missing");
  renderAccount();
  const initial=location.hash.replace("#","");
  if(["discover","market","businesses","portfolio","activity"].includes(initial))setView(initial);
  await loadMarkets();
  if(state.account)await loadAccount();
  setInterval(()=>loadMarkets(),15000);
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

boot();
})();