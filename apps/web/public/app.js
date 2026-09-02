(() => {
  "use strict";

  const API_URL = "https://api.hyperliquid.xyz/info";
  const WS_URL = "wss://api.hyperliquid.xyz/ws";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    profile: null,
    markets: [],
    filteredMarkets: [],
    selected: "BTC",
    interval: "15m",
    discoverFilter: "trending",
    marketFilter: "trending",
    orderSide: "buy",
    orderType: "market",
    marginMode: "cross",
    leverage: 5,
    candles: [],
    book: null,
    liveTrades: [],
    account: localStorage.getItem("rwa_account") || "",
    adapterUrl: localStorage.getItem("rwa_adapter_url") || "",
    accountState: null,
    openOrders: [],
    fills: [],
    ws: null,
    wsCoin: null,
    lastMarketLoad: 0,
    watched: new Set(JSON.parse(localStorage.getItem("rwa_watchlist") || "[]")),
    currentOrderPreview: null
  };

  function money(value, compact = false) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    if (compact) {
      return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
    }
    const abs = Math.abs(n);
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n);
  }

  function pct(value, digits = 2) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return (n >= 0 ? "+" : "") + n.toFixed(digits) + "%";
  }

  function shortAddress(value) {
    if (!value || value.length < 12) return value || "—";
    return value.slice(0, 6) + "…" + value.slice(-4);
  }

  function timeText(ms) {
    if (!ms) return "—";
    return new Date(Number(ms)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  async function postInfo(body) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("Hyperliquid HTTP " + res.status);
    return res.json();
  }

  function showToast(message, tone = "neutral") {
    const el = $("#toast");
    el.textContent = message;
    el.hidden = false;
    el.style.borderColor = tone === "error" ? "rgba(246,70,93,.35)" : "rgba(22,226,123,.25)";
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  function setConnection(online, label = "Hyperliquid") {
    $("#connectionDot").className = "connection-dot " + (online ? "online" : "offline");
    $("#connectionLabel").textContent = label;
    $("#marketDataStatus").textContent = online ? "LIVE" : "OFFLINE";
    $("#marketDataStatus").className = online ? "good" : "neg";
  }

  async function loadProfile() {
    try {
      const res = await fetch("./launch-profile.json", { cache: "no-store" });
      if (!res.ok) throw new Error("profile unavailable");
      state.profile = await res.json();
      renderBusinessCards();
      renderDiscoverBusinesses();
    } catch (error) {
      console.error(error);
      renderBusinessCards();
    }
  }

  async function loadMarkets(force = false) {
    if (!force && Date.now() - state.lastMarketLoad < 12000 && state.markets.length) return;
    try {
      const result = await postInfo({ type: "metaAndAssetCtxs" });
      const meta = Array.isArray(result) ? result[0] : null;
      const ctxs = Array.isArray(result) ? result[1] : null;
      const universe = meta?.universe || [];
      if (!Array.isArray(ctxs)) throw new Error("unexpected market payload");

      state.markets = universe.map((asset, index) => {
        const ctx = ctxs[index] || {};
        const mark = Number(ctx.markPx ?? ctx.midPx ?? 0);
        const prev = Number(ctx.prevDayPx ?? mark);
        const change = prev ? ((mark - prev) / prev) * 100 : 0;
        return {
          symbol: asset.name,
          name: asset.name + " perpetual",
          maxLeverage: Number(asset.maxLeverage || 1),
          onlyIsolated: Boolean(asset.onlyIsolated),
          mark,
          prev,
          change,
          volume: Number(ctx.dayNtlVlm || 0),
          funding: Number(ctx.funding || 0) * 100,
          oi: Number(ctx.openInterest || 0),
          oracle: Number(ctx.oraclePx || 0)
        };
      }).filter(m => m.symbol && Number.isFinite(m.mark) && m.mark > 0);

      state.lastMarketLoad = Date.now();
      setConnection(true);
      applyMarketFilters();
      renderTicker();
      renderDiscoverMarkets();
      const selected = getSelectedMarket();
      if (!selected && state.markets.length) state.selected = state.markets[0].symbol;
      updateMarketHeader();
    } catch (error) {
      console.error(error);
      setConnection(false, "Market offline");
      if (!state.markets.length) {
        $("#marketList").innerHTML = '<div class="empty-state">Live Hyperliquid market data is unavailable.</div>';
        $("#discoverMarkets").innerHTML = '<div class="empty-state">Live Hyperliquid market data is unavailable.</div>';
      }
    }
  }

  function sortedMarkets(mode) {
    const rows = [...state.markets];
    if (mode === "gainers") return rows.sort((a, b) => b.change - a.change);
    if (mode === "volume") return rows.sort((a, b) => b.volume - a.volume);
    return rows.sort((a, b) => (b.volume * (1 + Math.abs(b.change) / 100)) - (a.volume * (1 + Math.abs(a.change) / 100)));
  }

  function applyMarketFilters() {
    const query = ($("#marketSearch")?.value || "").trim().toLowerCase();
    state.filteredMarkets = sortedMarkets(state.marketFilter).filter(m =>
      !query || m.symbol.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)
    );
    renderMarketList();
  }

  function renderMarketList() {
    const root = $("#marketList");
    if (!root) return;
    const rows = state.filteredMarkets.slice(0, 80);
    root.innerHTML = rows.map((m, index) => {
      const cls = m.symbol === state.selected ? "market-row active" : "market-row";
      const changeClass = m.change >= 0 ? "pos" : "neg";
      return '<button class="' + cls + '" data-market="' + escapeHtml(m.symbol) + '">' +
        '<span class="market-rank">' + String(index + 1).padStart(2, "0") + '</span>' +
        '<span class="market-row-main"><b>' + escapeHtml(m.symbol) + '</b><span>Perp · ' + m.maxLeverage + '× max</span></span>' +
        '<span class="market-row-right"><b>' + money(m.mark) + '</b><span class="' + changeClass + '">' + pct(m.change) + '</span></span>' +
      '</button>';
    }).join("");

    $$("[data-market]", root).forEach(btn => btn.addEventListener("click", () => selectMarket(btn.dataset.market)));
  }

  function renderTicker() {
    if (!state.markets.length) return;
    const items = sortedMarkets("volume").slice(0, 18);
    const segment = items.map(m =>
      '<span class="ticker-item"><b>' + escapeHtml(m.symbol) + '</b><span>' + money(m.mark) + '</span><span class="' + (m.change >= 0 ? "up" : "down") + '">' + pct(m.change) + '</span></span>'
    ).join("");
    const track = '<div class="ticker-track">' + segment + segment + '</div>';
    $("#topTicker").innerHTML = track;
    $("#bottomTicker").innerHTML = track;
  }

  function renderDiscoverMarkets() {
    const root = $("#discoverMarkets");
    if (!root) return;
    const rows = sortedMarkets(state.discoverFilter).slice(0, 12);
    root.innerHTML = rows.map(m =>
      '<button class="market-card button-reset" data-discover-market="' + escapeHtml(m.symbol) + '">' +
        '<div class="market-card-top"><span class="market-card-symbol"><span class="coin-dot">' + escapeHtml(m.symbol.slice(0,1)) + '</span>' + escapeHtml(m.symbol) + '</span><span class="' + (m.change >= 0 ? "pos" : "neg") + '">' + pct(m.change) + '</span></div>' +
        '<div class="market-card-price">$' + money(m.mark) + '</div>' +
        '<div class="market-card-meta"><span>Vol $' + money(m.volume, true) + '</span><span>Funding ' + pct(m.funding, 4) + '</span></div>' +
      '</button>'
    ).join("");
    $$("[data-discover-market]", root).forEach(btn => btn.addEventListener("click", () => {
      selectMarket(btn.dataset.discoverMarket);
      setView("market");
    }));
  }


  function engineIcon(id) {
    const icons = { commerce:"▣", support:"◌", creator:"✦", billing:"▤", api:"⌁", meter:"∿", operations:"◇", "workflow-app":"↻" };
    return icons[id] || "◆";
  }

  function renderEngineDocks() {
    const engines = state.profile?.launchEngines || [];
    const preferred = ["commerce","support","creator","billing","operations","api","meter","workflow-app"];
    const ordered = preferred.map(id => engines.find(x => x.id === id)).filter(Boolean);
    const desktop = $("#marketEngineGrid");
    if (desktop) {
      desktop.innerHTML = ordered.slice(0, 6).map(item =>
        '<button class="engine-tile button-reset" data-view="businesses" title="' + escapeHtml(item.sourcePath) + '">' +
          '<span class="engine-icon">' + engineIcon(item.id) + '</span>' +
          '<span class="engine-copy"><b>' + escapeHtml(item.label) + '</b><small>' + escapeHtml(item.action || item.sourcePath) + '</small></span>' +
          '<span class="engine-state">READY</span>' +
        '</button>'
      ).join("");
      $$("[data-view]", desktop).forEach(bindViewButton);
    }
    const mobile = $("#mobileEngineGrid");
    if (mobile) {
      mobile.innerHTML = ordered.slice(0, 5).map(item =>
        '<button class="mobile-engine-tile button-reset" data-view="businesses" title="' + escapeHtml(item.sourcePath) + '">' +
          '<span class="engine-icon">' + engineIcon(item.id) + '</span><b>' + escapeHtml(item.label.replace(" / Membership","")) + '</b>' +
        '</button>'
      ).join("");
      $$("[data-view]", mobile).forEach(bindViewButton);
    }
  }

  function renderDiscoverBusinesses() {
    const root = $("#discoverBusinesses");
    if (!root) return;
    const engines = state.profile?.launchEngines || [];
    if (!engines.length) {
      root.innerHTML = '<div class="stack-item"><div><strong>Existing engines</strong><span>Profile loading</span></div><span class="tiny-state">SOURCE</span></div>';
      return;
    }
    root.innerHTML = engines.slice(0, 7).map(item =>
      '<button class="stack-item button-reset" data-view="businesses"><div><strong>' + escapeHtml(item.label) + '</strong><span>' + escapeHtml(item.action || item.sourcePath) + '</span></div><span class="tiny-state">READY</span></button>'
    ).join("");
    $$("[data-view]", root).forEach(bindViewButton);
  }

  function renderBusinessCards() {
    const root = $("#businessGrid");
    if (!root) return;
    const ready = state.profile?.launchEngines || [];
    const held = state.profile?.heldEngines || [];
    const all = [...ready.map(x => ({...x, group:"Launch"})), ...held.map(x => ({...x, group:"Held"}))];
    if (!all.length) {
      root.innerHTML = '<div class="empty-state">Launch profile has not loaded.</div>';
      return;
    }
    root.innerHTML = all.map(item =>
      '<article class="business-card">' +
        '<div class="business-card-top"><div><h3>' + escapeHtml(item.label) + '</h3><p>' + escapeHtml(item.action || item.reason || "Existing repository engine") + '</p></div><span class="tiny-state">' + escapeHtml(item.group.toUpperCase()) + '</span></div>' +
        '<dl><div><dt>Source</dt><dd>' + escapeHtml(item.sourcePath) + '</dd></div>' +
        (item.commit ? '<div><dt>Pin</dt><dd><code>' + escapeHtml(item.commit.slice(0, 12)) + '</code></dd></div>' : '') +
        '<div><dt>Status</dt><dd>' + escapeHtml(item.state || "HELD") + '</dd></div></dl>' +
        '<div class="business-actions"><button class="secondary-button" data-business-action="view">View</button><button class="primary-compact" data-business-action="launch"' + (item.group === "Held" ? ' disabled title="Review gate not closed"' : '') + '>Use engine</button></div>' +
      '</article>'
    ).join("");

    $$("[data-business-action='view']", root).forEach(btn => btn.addEventListener("click", () => showToast("Engine details are source-backed; runtime adapter status is shown separately.")));
    $$("[data-business-action='launch']", root).forEach(btn => btn.addEventListener("click", () => showToast("Provisioning adapter is not connected yet.")));
  }

  function getSelectedMarket() {
    return state.markets.find(m => m.symbol === state.selected) || null;
  }

  async function selectMarket(symbol) {
    if (!symbol || symbol === state.selected && state.candles.length) return;
    state.selected = symbol;
    updateMarketHeader();
    renderMarketList();
    state.liveTrades = [];
    renderLiveTrades();
    await Promise.allSettled([loadBook(), loadCandles(), loadFunding(), loadAccountState()]);
    connectMarketWs();
  }

  function updateMarketHeader() {
    const m = getSelectedMarket();
    if (!m) return;
    $("#marketSymbol").textContent = m.symbol;
    $("#marketName").textContent = m.name;
    $("#marketSymbolIcon").textContent = m.symbol.slice(0,1);
    $("#markPrice").textContent = "$" + money(m.mark);
    $("#change24h").textContent = pct(m.change);
    $("#change24h").className = m.change >= 0 ? "pos" : "neg";
    $("#volume24h").textContent = "$" + money(m.volume, true);
    $("#fundingRate").textContent = pct(m.funding, 4);
    $("#openInterest").textContent = money(m.oi, true);
    $("#mobileVolume").textContent = "$" + money(m.volume, true);
    $("#mobileFunding").textContent = pct(m.funding, 4);
    $("#mobileOi").textContent = money(m.oi, true);
    $("#orderMarket").textContent = m.symbol;
    $("#sizeUnit").textContent = m.symbol;
    $("#summaryMark").textContent = "$" + money(m.mark);
    $("#mobileBuySymbol").textContent = m.symbol;
    $("#watchButton").classList.toggle("active", state.watched.has(m.symbol));
    $("#watchButton").textContent = state.watched.has(m.symbol) ? "★" : "☆";
    if ($("#limitPrice") && !$("#limitPrice").value) $("#limitPrice").placeholder = money(m.mark);
    updateOrderSummary();
  }

  async function loadBook() {
    const m = getSelectedMarket();
    if (!m) return;
    try {
      state.book = await postInfo({ type: "l2Book", coin: m.symbol, nSigFigs: 5 });
      renderBook();
    } catch (error) {
      console.error(error);
      $("#asksBook").innerHTML = '<div class="empty-state">Book unavailable.</div>';
      $("#bidsBook").innerHTML = '';
    }
  }

  function renderBook() {
    const levels = state.book?.levels;
    if (!Array.isArray(levels) || levels.length < 2) return;
    const bids = (levels[0] || []).slice(0, 12);
    const asks = (levels[1] || []).slice(0, 12).reverse();
    const maxSize = Math.max(1, ...bids.map(x => Number(x.sz)), ...asks.map(x => Number(x.sz)));
    function rows(list) {
      let total = 0;
      return list.map(row => {
        const size = Number(row.sz || 0); total += size;
        const width = Math.min(100, size / maxSize * 100);
        return '<div class="book-row"><i class="depth" style="width:' + width + '%"></i><span>' + money(row.px) + '</span><span>' + money(size) + '</span><span>' + money(total) + '</span></div>';
      }).join("");
    }
    $("#asksBook").innerHTML = rows(asks);
    $("#bidsBook").innerHTML = rows(bids);
    const bid = Number(bids[0]?.px || 0), ask = Number((levels[1] || [])[0]?.px || 0);
    $("#midBookPrice").textContent = bid && ask ? money((bid + ask) / 2) : "—";
  }

  function intervalMs(interval) {
    const map = { "5m":300000, "15m":900000, "1h":3600000, "4h":14400000, "1d":86400000 };
    return map[interval] || 900000;
  }

  async function loadCandles() {
    const m = getSelectedMarket();
    if (!m) return;
    const step = intervalMs(state.interval);
    const end = Date.now();
    const points = state.interval === "1d" ? 90 : state.interval === "4h" ? 120 : 160;
    const start = end - step * points;
    try {
      const data = await postInfo({ type: "candleSnapshot", req: { coin: m.symbol, interval: state.interval, startTime: start, endTime: end } });
      state.candles = Array.isArray(data) ? data : [];
      drawChart();
    } catch (error) {
      console.error(error);
      state.candles = [];
      drawChart();
    }
  }

  function drawChart() {
    const canvas = $("#priceChart");
    const empty = $("#chartEmpty");
    const candles = state.candles;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (!candles.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    const pad = { left:10, right:58, top:15, bottom:22 };
    const w = rect.width - pad.left - pad.right, h = rect.height - pad.top - pad.bottom;
    const highs = candles.map(c => Number(c.h)), lows = candles.map(c => Number(c.l));
    let max = Math.max(...highs), min = Math.min(...lows);
    const range = Math.max(1e-9, max - min);
    max += range * .06; min -= range * .06;

    ctx.strokeStyle = "rgba(255,255,255,.055)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#6f7d78";
    ctx.font = "9px SFMono-Regular, monospace";
    for (let i=0;i<=5;i++) {
      const y = pad.top + h * i / 5;
      ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(pad.left+w,y);ctx.stroke();
      const price = max - (max-min)*i/5;
      ctx.fillText(money(price), pad.left+w+8, y+3);
    }

    const slot = w / candles.length;
    const body = Math.max(1, Math.min(7, slot * .62));
    const yOf = p => pad.top + (max-p)/(max-min)*h;
    candles.forEach((c,i) => {
      const open=Number(c.o), close=Number(c.c), high=Number(c.h), low=Number(c.l);
      const x=pad.left + slot*i + slot/2;
      const color = close >= open ? "#16e27b" : "#f6465d";
      ctx.strokeStyle=color;ctx.fillStyle=color;
      ctx.beginPath();ctx.moveTo(x,yOf(high));ctx.lineTo(x,yOf(low));ctx.stroke();
      const y1=yOf(open), y2=yOf(close);
      ctx.fillRect(x-body/2,Math.min(y1,y2),body,Math.max(1,Math.abs(y2-y1)));
    });

    const last = candles[candles.length-1];
    const lastPrice = Number(last?.c);
    if (Number.isFinite(lastPrice)) {
      const y = yOf(lastPrice);
      ctx.strokeStyle = "rgba(22,226,123,.55)";
      ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(pad.left+w,y);ctx.stroke();ctx.setLineDash([]);
    }
  }

  async function loadFunding() {
    const m = getSelectedMarket();
    if (!m) return;
    const end = Date.now(), start = end - 24 * 3600000;
    try {
      const rows = await postInfo({ type: "fundingHistory", coin: m.symbol, startTime: start, endTime: end });
      const list = Array.isArray(rows) ? rows.slice(-18).reverse() : [];
      $("#fundingTable").innerHTML = list.length ? list.map(row =>
        '<div class="funding-row"><span>' + new Date(row.time).toLocaleString() + '</span><span>' + pct(Number(row.fundingRate || 0) * 100, 4) + '</span><span>' + pct(Number(row.premium || 0) * 100, 4) + '</span></div>'
      ).join("") : '<div class="empty-state">No funding rows returned.</div>';
    } catch (error) {
      $("#fundingTable").innerHTML = '<div class="empty-state">Funding history unavailable.</div>';
    }
  }

  function connectMarketWs() {
    const coin = state.selected;
    if (!coin) return;
    if (state.ws) {
      try { state.ws.close(); } catch {}
    }
    state.wsCoin = coin;
    try {
      const ws = new WebSocket(WS_URL);
      state.ws = ws;
      ws.addEventListener("open", () => {
        ws.send(JSON.stringify({ method:"subscribe", subscription:{ type:"trades", coin } }));
      });
      ws.addEventListener("message", event => {
        let msg; try { msg = JSON.parse(event.data); } catch { return; }
        if (state.wsCoin !== coin) return;
        const channel = msg.channel || msg.data?.channel;
        const payload = msg.data;
        if (channel === "trades" && Array.isArray(payload)) {
          payload.forEach(tr => {
            state.liveTrades.unshift({
              side: tr.side === "B" ? "buy" : "sell",
              px: Number(tr.px),
              sz: Number(tr.sz),
              time: tr.time || Date.now(),
              hash: tr.hash || ""
            });
          });
          state.liveTrades = state.liveTrades.slice(0, 80);
          renderLiveTrades();
          renderActivityTrades();
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  function renderLiveTrades() {
    const rows = state.liveTrades.slice(0, 40);
    const html = rows.length ? rows.map(tr =>
      '<div class="trade-row"><span class="' + (tr.side === "buy" ? "pos" : "neg") + '">' + tr.side.toUpperCase() + '</span><span>' + money(tr.px) + '</span><span>' + money(tr.sz) + '</span><span>' + timeText(tr.time) + '</span></div>'
    ).join("") : '<div class="empty-state">Waiting for live trade stream…</div>';
    $("#liveTrades").innerHTML = html;
  }

  function renderActivityTrades() {
    const root = $("#activityTrades");
    const rows = state.liveTrades.slice(0, 30);
    root.innerHTML = rows.length ? rows.map(tr =>
      '<div class="activity-item"><time>' + timeText(tr.time) + '</time><span><b class="' + (tr.side === "buy" ? "pos" : "neg") + '">' + tr.side.toUpperCase() + '</b> ' + escapeHtml(state.selected) + ' · ' + money(tr.sz) + '</span><b>$' + money(tr.px) + '</b></div>'
    ).join("") : '<div class="empty-state">Waiting for live market stream…</div>';
  }

  async function loadAccountState() {
    if (!state.account || !/^0x[a-fA-F0-9]{40}$/.test(state.account)) {
      state.accountState = null;
      renderAccount();
      return;
    }
    try {
      const [accountState, openOrders, fills] = await Promise.all([
        postInfo({ type:"clearinghouseState", user:state.account, dex:"" }),
        postInfo({ type:"openOrders", user:state.account, dex:"" }),
        postInfo({ type:"userFills", user:state.account })
      ]);
      state.accountState = accountState;
      state.openOrders = Array.isArray(openOrders) ? openOrders : [];
      state.fills = Array.isArray(fills) ? fills : [];
      renderAccount();
    } catch (error) {
      console.error(error);
      showToast("Account state unavailable.", "error");
    }
  }

  function renderAccount() {
    const s = state.accountState;
    const positions = s?.assetPositions || [];
    const selectedPosition = positions.map(x => x.position).find(p => p.coin === state.selected && Number(p.szi) !== 0);
    if (!state.account) {
      $("#positionBody").className = "position-empty";
      $("#positionBody").textContent = "Add an address to view live Hyperliquid positions.";
    } else if (!selectedPosition) {
      $("#positionBody").className = "position-empty";
      $("#positionBody").textContent = "No active " + state.selected + " position for " + shortAddress(state.account) + ".";
    } else {
      $("#positionBody").className = "";
      $("#positionBody").innerHTML = '<div class="position-values">' +
        metric("Size", money(selectedPosition.szi)) +
        metric("Value", "$" + money(selectedPosition.positionValue)) +
        metric("Entry", "$" + money(selectedPosition.entryPx)) +
        metric("PnL", "$" + money(selectedPosition.unrealizedPnl), Number(selectedPosition.unrealizedPnl) >= 0 ? "pos" : "neg") +
        metric("Leverage", selectedPosition.leverage?.value ? selectedPosition.leverage.value + "×" : "—") +
        metric("Liq.", selectedPosition.liquidationPx ? "$" + money(selectedPosition.liquidationPx) : "—") +
      '</div>';
    }

    $("#portfolioValue").textContent = s ? "$" + money(s.marginSummary?.accountValue) : "—";
    $("#portfolioMargin").textContent = s ? "$" + money(s.marginSummary?.totalMarginUsed) : "—";
    $("#portfolioWithdrawable").textContent = s ? "$" + money(s.withdrawable) : "—";
    $("#portfolioPositionsCount").textContent = s ? String(positions.filter(x => Number(x.position?.szi || 0) !== 0).length) : "—";

    renderPositionsTable(positions);
    renderOrdersTable(state.openOrders);
    renderAccountFills();
    renderMarketActivity();
  }

  function metric(label, value, cls = "") {
    return '<div><span>' + label + '</span><b class="' + cls + '">' + value + '</b></div>';
  }

  function renderPositionsTable(items) {
    const root = $("#portfolioPositions");
    const rows = (items || []).map(x=>x.position).filter(p=>Number(p.szi||0)!==0);
    if (!rows.length) {
      root.innerHTML = '<div class="empty-state">' + (state.account ? "No active positions." : "Set an account address to load positions.") + '</div>';
      return;
    }
    root.innerHTML = '<div class="position-table-head"><span>Market</span><span>Size</span><span>Entry</span><span>Mark value</span><span>PnL</span><span>Liq.</span></div>' +
      rows.map(p => '<div class="position-table-row"><span>' + escapeHtml(p.coin) + '</span><span>' + money(p.szi) + '</span><span>$' + money(p.entryPx) + '</span><span>$' + money(p.positionValue) + '</span><span class="' + (Number(p.unrealizedPnl)>=0?"pos":"neg") + '">$' + money(p.unrealizedPnl) + '</span><span>' + (p.liquidationPx ? "$"+money(p.liquidationPx) : "—") + '</span></div>').join("");
  }

  function renderOrdersTable(items) {
    const root = $("#portfolioOrders");
    if (!items?.length) {
      root.innerHTML = '<div class="empty-state">' + (state.account ? "No open orders." : "Set an account address to load open orders.") + '</div>';
      return;
    }
    root.innerHTML = '<div class="position-table-head"><span>Market</span><span>Side</span><span>Price</span><span>Size</span><span>OID</span><span>Time</span></div>' +
      items.map(o => '<div class="position-table-row"><span>' + escapeHtml(o.coin) + '</span><span class="' + (o.side==="B"?"pos":"neg") + '">' + (o.side==="B"?"BUY":"SELL") + '</span><span>$' + money(o.limitPx) + '</span><span>' + money(o.sz) + '</span><span>' + o.oid + '</span><span>' + timeText(o.timestamp) + '</span></div>').join("");
  }

  function renderAccountFills() {
    const root = $("#accountFills");
    if (!state.account) {
      root.innerHTML = '<div class="empty-state">Set an account address to load fills.</div>';
      return;
    }
    const rows = state.fills.slice(0, 40);
    root.innerHTML = rows.length ? rows.map(f =>
      '<div class="activity-item"><time>' + timeText(f.time) + '</time><span><b class="' + (f.side==="B"?"pos":"neg") + '">' + escapeHtml(f.dir || (f.side==="B"?"BUY":"SELL")) + '</b> ' + escapeHtml(f.coin) + ' · ' + money(f.sz) + '</span><b>$' + money(f.px) + '</b></div>'
    ).join("") : '<div class="empty-state">No recent fills returned.</div>';
  }

  function renderMarketActivity() {
    const root = $("#marketActivity");
    if (!state.account) {
      root.innerHTML = 'Add an account address to load open orders and fills.<button class="secondary-button" data-open-account>Set account</button>';
      $$("[data-open-account]", root).forEach(btn=>btn.addEventListener("click",openAccountSheet));
      return;
    }
    const orders = state.openOrders.filter(o => o.coin === state.selected);
    const fills = state.fills.filter(f => f.coin === state.selected).slice(0,15);
    root.innerHTML = '<div style="width:100%"><strong style="font-size:10px;color:#f2fff7">Open orders: ' + orders.length + '</strong><div style="margin-top:8px">' +
      (fills.length ? fills.map(f => '<div class="trade-row"><span class="' + (f.side==="B"?"pos":"neg") + '">' + escapeHtml(f.dir || "") + '</span><span>' + money(f.px) + '</span><span>' + money(f.sz) + '</span><span>' + timeText(f.time) + '</span></div>').join("") : '<span style="color:#7d8b86;font-size:9px">No recent fills for this market.</span>') +
    '</div></div>';
  }

  function updateOrderSummary() {
    const m = getSelectedMarket();
    if (!m) return;
    const size = Number($("#orderSize")?.value || 0);
    const price = state.orderType === "limit" ? Number($("#limitPrice")?.value || m.mark) : m.mark;
    $("#summaryMark").textContent = "$" + money(m.mark);
    $("#summaryValue").textContent = size > 0 ? "$" + money(size * price) : "—";
    $("#executionMode").textContent = state.adapterUrl ? "Adapter configured" : "Preview only";
    const btn = $("#placeOrderButton");
    btn.textContent = (state.adapterUrl ? "Review " : "Preview ") + (state.orderSide === "buy" ? "Buy" : "Sell");
    btn.className = "primary-action " + (state.orderSide === "buy" ? "buy-action" : "sell-action");
  }

  function buildOrderPreview() {
    const m = getSelectedMarket();
    const size = Number($("#orderSize").value || 0);
    if (!m || !Number.isFinite(size) || size <= 0) {
      showToast("Enter a valid order size.", "error");
      return null;
    }
    const limitPrice = state.orderType === "limit" ? Number($("#limitPrice").value || 0) : null;
    if (state.orderType === "limit" && (!Number.isFinite(limitPrice) || limitPrice <= 0)) {
      showToast("Enter a valid limit price.", "error");
      return null;
    }
    const preview = {
      source: "30_MARKETS/hyperliquid-python-sdk",
      market: m.symbol,
      side: state.orderSide,
      type: state.orderType,
      size,
      limitPrice,
      marginMode: state.marginMode,
      leverage: state.leverage,
      reduceOnly: $("#reduceOnly").checked,
      takeProfit: $("#tpslToggle").checked && $("#takeProfit").value ? Number($("#takeProfit").value) : null,
      stopLoss: $("#tpslToggle").checked && $("#stopLoss").value ? Number($("#stopLoss").value) : null,
      account: state.account || null,
      execution: state.adapterUrl ? "adapter" : "preview-only",
      createdAt: new Date().toISOString()
    };
    state.currentOrderPreview = preview;
    return preview;
  }

  function openOrderPreview() {
    const preview = buildOrderPreview();
    if (!preview) return;
    $("#orderPreview").textContent = JSON.stringify(preview, null, 2);
    $("#confirmOrderButton").textContent = state.adapterUrl ? "Submit to adapter" : "Close preview";
    openSheet("confirmSheet");
  }

  async function confirmOrder() {
    const preview = state.currentOrderPreview;
    if (!preview) return;
    if (!state.adapterUrl) {
      closeSheets();
      showToast("Preview generated. Configure an execution adapter for real submission.");
      return;
    }
    try {
      const base = state.adapterUrl.replace(/\/$/, "");
      const res = await fetch(base + "/orders", {
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify(preview)
      });
      const body = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(body?.message || "Adapter HTTP " + res.status);
      closeSheets();
      showToast("Order submitted to configured adapter.");
      setTimeout(loadAccountState, 1200);
    } catch (error) {
      console.error(error);
      showToast("Order adapter rejected or is unavailable.", "error");
    }
  }

  function setView(name) {
    $$(".view").forEach(v => v.classList.toggle("active", v.dataset.viewPanel === name));
    $$("[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));
    if (name !== "market") $(".mobile-trade-bar").style.display = "none";
    else if (window.matchMedia("(max-width:900px)").matches) $(".mobile-trade-bar").style.display = "grid";
    history.replaceState(null,"","#"+name);
    if (name === "market") {
      loadMarkets().then(() => selectMarket(state.selected));
    } else if (name === "portfolio") loadAccountState();
  }

  function bindViewButton(btn) {
    btn.addEventListener("click", () => {
      const name = btn.dataset.view;
      if (name) setView(name);
    });
  }

  function openSheet(id) {
    const el = $("#" + id);
    if (!el) return;
    el.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeSheets() {
    $$(".sheet").forEach(s => s.hidden = true);
    document.body.style.overflow = "";
    restoreOrderPanel();
  }

  function openAccountSheet() {
    $("#accountAddress").value = state.account;
    $("#adapterUrl").value = state.adapterUrl;
    openSheet("accountSheet");
  }

  function saveAccount() {
    const account = $("#accountAddress").value.trim();
    const adapter = $("#adapterUrl").value.trim();
    if (account && !/^0x[a-fA-F0-9]{40}$/.test(account)) {
      showToast("Hyperliquid account address must be a 42-character 0x address.", "error");
      return;
    }
    state.account = account;
    state.adapterUrl = adapter;
    localStorage.setItem("rwa_account", account);
    localStorage.setItem("rwa_adapter_url", adapter);
    closeSheets();
    updateOrderSummary();
    loadAccountState();
    showToast(account ? "Account saved." : "Account cleared.");
  }

  function openMobileOrder(side) {
    state.orderSide = side;
    syncOrderSide();
    const panel = $(".order-panel");
    const mount = $("#mobileOrderMount");
    mount.appendChild(panel);
    $("#mobileOrderTitle").textContent = (side === "buy" ? "Buy " : "Sell ") + state.selected;
    openSheet("orderSheet");
  }

  function restoreOrderPanel() {
    const panel = $(".order-panel");
    const rail = $(".trade-rail");
    if (panel && rail && panel.parentElement !== rail) rail.insertBefore(panel, rail.firstChild);
  }

  function syncOrderSide() {
    $$("[data-side]").forEach(btn => btn.classList.toggle("active", btn.dataset.side === state.orderSide));
    updateOrderSummary();
  }

  function globalSearchResults(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const markets = state.markets.filter(m => m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)).slice(0,8)
      .map(m=>({type:"Market",title:m.symbol,sub:"$"+money(m.mark),market:m.symbol}));
    const engines = [...(state.profile?.launchEngines||[]),...(state.profile?.heldEngines||[])]
      .filter(x => x.label.toLowerCase().includes(q) || x.sourcePath.toLowerCase().includes(q)).slice(0,6)
      .map(x=>({type:"Business engine",title:x.label,sub:x.sourcePath}));
    return [...markets,...engines];
  }

  function renderGlobalSearch(query) {
    const root = $("#globalSearchResults");
    const results = globalSearchResults(query);
    root.innerHTML = results.length ? results.map((r,index)=>
      '<button class="search-result button-reset" data-search-index="'+index+'"><span><b>'+escapeHtml(r.title)+'</b><small style="display:block;color:#7d8b86;margin-top:3px">'+escapeHtml(r.type)+'</small></span><span style="color:#7d8b86;font-size:9px">'+escapeHtml(r.sub)+'</span></button>'
    ).join("") : '<div class="empty-state">No results.</div>';
    $$("[data-search-index]",root).forEach(btn=>btn.addEventListener("click",()=>{
      const r=results[Number(btn.dataset.searchIndex)];
      if(r.market){selectMarket(r.market);setView("market")}else setView("businesses");
      closeSheets();
    }));
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
  }

  function wireEvents() {
    $$("[data-view]").forEach(bindViewButton);
    $$("[data-close-sheet]").forEach(el=>el.addEventListener("click",closeSheets));
    $$("[data-open-account]").forEach(el=>el.addEventListener("click",openAccountSheet));
    $("#accountButton").addEventListener("click",openAccountSheet);
    $("#connectionButton").addEventListener("click",openAccountSheet);
    $("#saveAccountButton").addEventListener("click",saveAccount);
    $("#globalSearchButton").addEventListener("click",()=>{openSheet("searchSheet");setTimeout(()=>$("#globalSearch").focus(),50)});
    $("#globalSearch").addEventListener("input",e=>renderGlobalSearch(e.target.value));
    $("#marketSearch").addEventListener("input",applyMarketFilters);

    $$("#marketFilter [data-market-filter]").forEach(btn=>btn.addEventListener("click",()=>{
      state.marketFilter=btn.dataset.marketFilter;
      $$("#marketFilter button").forEach(x=>x.classList.toggle("active",x===btn));
      applyMarketFilters();
    }));
    $$("[data-discover-filter]").forEach(btn=>btn.addEventListener("click",()=>{
      state.discoverFilter=btn.dataset.discoverFilter;
      $$("[data-discover-filter]").forEach(x=>x.classList.toggle("active",x===btn));
      renderDiscoverMarkets();
    }));

    $$("#timeframes [data-interval]").forEach(btn=>btn.addEventListener("click",()=>{
      state.interval=btn.dataset.interval;
      $$("#timeframes button").forEach(x=>x.classList.toggle("active",x===btn));
      loadCandles();
    }));
    $("#refreshMarket").addEventListener("click",()=>Promise.allSettled([loadMarkets(true),loadBook(),loadCandles(),loadFunding()]));
    $("#fullscreenChart").addEventListener("click",()=>$(".chart-panel").classList.toggle("fullscreen"));
    $("#watchButton").addEventListener("click",()=>{
      if(state.watched.has(state.selected))state.watched.delete(state.selected);else state.watched.add(state.selected);
      localStorage.setItem("rwa_watchlist",JSON.stringify([...state.watched]));updateMarketHeader();
    });

    $$("#marketTabs [data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
      const tab=btn.dataset.tab;
      $$("#marketTabs button").forEach(x=>x.classList.toggle("active",x===btn));
      $$(".tab-panel").forEach(p=>p.classList.toggle("active",p.dataset.tabPanel===tab));
    }));

    $$("#sideTabs [data-side]").forEach(btn=>btn.addEventListener("click",()=>{
      state.orderSide=btn.dataset.side;syncOrderSide();
    }));
    $$("#orderTypes [data-order-type]").forEach(btn=>btn.addEventListener("click",()=>{
      state.orderType=btn.dataset.orderType;
      $$("#orderTypes button").forEach(x=>x.classList.toggle("active",x===btn));
      $("#limitPriceField").hidden=state.orderType!=="limit";
      updateOrderSummary();
    }));
    $$("#marginMode [data-margin]").forEach(btn=>btn.addEventListener("click",()=>{
      state.marginMode=btn.dataset.margin;$$("#marginMode button").forEach(x=>x.classList.toggle("active",x===btn));
    }));
    $("#leverageButton").addEventListener("click",()=>{
      const values=[1,2,3,5,10,20,25,50];
      const idx=values.indexOf(state.leverage);
      const m=getSelectedMarket();
      let next=values[(idx+1)%values.length];
      if(m) next=Math.min(next,m.maxLeverage||next);
      state.leverage=next;$("#leverageValue").textContent=String(next);
    });
    $("#tpslToggle").addEventListener("change",e=>$("#tpslFields").hidden=!e.target.checked);
    $("#orderSize").addEventListener("input",updateOrderSummary);
    $("#limitPrice").addEventListener("input",updateOrderSummary);
    $$("#quickSize [data-size-pct]").forEach(btn=>btn.addEventListener("click",()=>{
      const pctv=Number(btn.dataset.sizePct);
      const m=getSelectedMarket();
      const available=Number(state.accountState?.withdrawable||0);
      if(!m||!available){showToast("Load an account with withdrawable balance first.");return}
      const notional=available*pctv/100*state.leverage;
      $("#orderSize").value=(notional/m.mark).toFixed(6).replace(/0+$/,"").replace(/\.$/,"");
      updateOrderSummary();
    }));
    $("#placeOrderButton").addEventListener("click",openOrderPreview);
    $("#confirmOrderButton").addEventListener("click",confirmOrder);
    $$("[data-mobile-side]").forEach(btn=>btn.addEventListener("click",()=>openMobileOrder(btn.dataset.mobileSide)));

    $("#refreshPortfolio").addEventListener("click",loadAccountState);
    $("#createBusinessButton").addEventListener("click",()=>showToast("Create Business will use the existing-engine provisioner once its runtime adapter is connected."));
    $("#businessSearch").addEventListener("input",e=>{
      const q=e.target.value.toLowerCase();
      $$("#businessGrid .business-card").forEach(card=>card.hidden=q&&!card.textContent.toLowerCase().includes(q));
    });

    window.addEventListener("resize",()=>{drawChart();if(window.innerWidth>900)restoreOrderPanel()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheets()});
  }

  async function boot() {
    if ("serviceWorker" in navigator) { navigator.serviceWorker.register("./sw.js").catch(()=>{}); }
    wireEvents();
    await Promise.allSettled([loadProfile(),loadMarkets(true)]);
    if (!state.markets.find(m=>m.symbol===state.selected) && state.markets.length) state.selected=state.markets[0].symbol;
    applyMarketFilters();
    updateMarketHeader();
    await Promise.allSettled([loadBook(),loadCandles(),loadFunding(),loadAccountState()]);
    connectMarketWs();
    const hash=location.hash.replace("#","");
    setView(["discover","market","businesses","portfolio","activity"].includes(hash)?hash:"market");
    setInterval(()=>loadMarkets(true),15000);
    setInterval(()=>{if(document.visibilityState==="visible"&&$(".view[data-view-panel='market']").classList.contains("active"))loadBook()},12000);
  }

  boot();
})();
