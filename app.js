"use strict";

/*
============================================================
こどもマネー・ラボ V2.2
============================================================

V2.2 変更点

・V1/V2.1からのデータ移行はしない
・LocalStorageを利用
・市場データは GitHub Pages から market.json を取得
・Yahoo Financeへスマホから直接アクセスしない
・入金ごとに、その日の指数を使って投資口数を計算
・出金時は、その日の指数で口数を売却
・現在価値 = 保有口数 × 最新指数
・指数データ取得失敗時もアプリ本体は利用可能
・iPhone Safari / GitHub Pages対応
・こどもモード対応
*/

const STORAGE_KEY = "kidsMoneyLabV22";
const MARKET_KEY = "kidsMoneyMarketV22";

const APP_VERSION = 22;

const MARKET_DATA_URL = "./data/market.json";


/* ============================================================
   ASSET MASTER
============================================================ */

const ASSETS = {
  cash: {
    name: "貯金",
    kidName: "ためる",
    icon: "🏦",
    fixedRate: 0.002,
    risk: "小",
    type: "cash"
  },
  world: {
    name: "全世界株式",
    kidName: "せかいの かぶ",
    icon: "🌎",
    fixedRate: 0.055,
    risk: "大",
    type: "index",
    marketKey: "world"
  },
  sp: {
    name: "S&P500",
    kidName: "アメリカの かぶ",
    icon: "🇺🇸",
    fixedRate: 0.06,
    risk: "大",
    type: "index",
    marketKey: "sp"
  }
};


/* ============================================================
   STATE
============================================================ */

let state = null;

let marketState = {
  version: 2,
  updated: null,
  source: "none",
  markets: {
    world: null,
    sp: null
  }
};

let selectedChildId = null;

let kidMode = localStorage.getItem("kidsMoneyKidMode") === "1";


/* ============================================================
   DOM
============================================================ */

function $(id) {
  return document.getElementById(id);
}


/* ============================================================
   SAFE ID
============================================================ */

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}


/* ============================================================
   FORMAT
============================================================ */

function yen(value) {
  const n = Number(value) || 0;
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

function signedYen(value) {
  const n = Number(value) || 0;
  if (n >= 0) {
    return "+" + yen(n);
  }
  return "-" + yen(Math.abs(n));
}

function percent(value) {
  const n = Number(value) || 0;
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* ============================================================
   DATE
============================================================ */

function today() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}


/* ============================================================
   ERROR
============================================================ */

function showError(message) {
  const box = $("errorBox");
  if (!box) {
    console.error(message);
    return;
  }

  box.textContent = message;
  box.classList.remove("hidden");

  clearTimeout(showError.timer);
  showError.timer = setTimeout(() => {
    box.classList.add("hidden");
  }, 5000);

  console.error(message);
}


/* ============================================================
   DEFAULT DATA
============================================================ */

function createDefaultState() {
  return {
    version: APP_VERSION,
    children: [
      {
        id: createId(),
        name: "こどもA",
        birthYear: 2019,
        transactions: [],
        goals: []
      }
    ]
  };
}


/* ============================================================
   LOAD / SAVE STATE
============================================================ */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.children)) {
      return createDefaultState();
    }

    return parsed;
  } catch (error) {
    console.error(error);
    return createDefaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showError("データを保存できませんでした。");
  }
}


/* ============================================================
   LOAD / SAVE MARKET
============================================================ */

function emptyMarketState() {
  return {
    version: 2,
    updated: null,
    source: "none",
    markets: {
      world: null,
      sp: null
    }
  };
}

function loadMarket() {
  try {
    const raw = localStorage.getItem(MARKET_KEY);
    if (!raw) {
      return emptyMarketState();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return emptyMarketState();
    }

    return parsed;
  } catch {
    return emptyMarketState();
  }
}

function saveMarket() {
  try {
    localStorage.setItem(MARKET_KEY, JSON.stringify(marketState));
  } catch (error) {
    console.error(error);
  }
}


/* ============================================================
   CHILD
============================================================ */

function getCurrentChild() {
  if (!state || !Array.isArray(state.children) || !state.children.length) {
    return null;
  }

  return (
    state.children.find(child => child.id === selectedChildId) ||
    state.children[0]
  );
}


/* ============================================================
   MARKET DATA
============================================================ */

function getMarket(assetKey) {
  const asset = ASSETS[assetKey];
  if (!asset || asset.type !== "index") {
    return null;
  }

  return marketState?.markets?.[asset.marketKey] || null;
}

function getLatestIndexValue(assetKey) {
  const market = getMarket(assetKey);
  if (!market || !Array.isArray(market.series) || !market.series.length) {
    return null;
  }

  const latest = market.series[market.series.length - 1];
  const value = Number(latest?.value);

  return value > 0 ? value : null;
}

function getIndexValue(assetKey, date) {
  const market = getMarket(assetKey);
  if (!market || !Array.isArray(market.series) || !market.series.length) {
    return null;
  }

  let result = null;

  for (const item of market.series) {
    if (String(item.date) <= String(date)) {
      const value = Number(item.value);
      if (value > 0) {
        result = value;
      }
    } else {
      break;
    }
  }

  return result;
}


/* ============================================================
   INDEX RETURN
============================================================ */

function getIndexReturn(assetKey, date) {
  const current = getLatestIndexValue(assetKey);
  const historical = getIndexValue(assetKey, date);

  if (!current || !historical) {
    return null;
  }

  return ((current / historical) - 1) * 100;
}


/* ============================================================
   INVESTMENT CALCULATION
============================================================ */

function calculateInvestment(child, assetKey) {
  const result = {
    units: 0,
    principal: 0,
    value: 0,
    pnl: 0,
    latestIndex: null,
    transactions: []
  };

  if (!child) {
    return result;
  }

  const transactions = Array.isArray(child.transactions)
    ? [...child.transactions]
    : [];

  const investmentTransactions = transactions
    .filter(tx => tx.asset === assetKey)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  for (const tx of investmentTransactions) {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) {
      continue;
    }

    const index = getIndexValue(assetKey, tx.date);

    if (!index || index <= 0) {
      if (tx.type === "in") {
        result.principal += amount;
      } else {
        result.principal = Math.max(0, result.principal - amount);
      }
      continue;
    }

    if (tx.type === "out") {
      const sellUnits = amount / index;
      result.units = Math.max(0, result.units - sellUnits);
      result.principal = Math.max(0, result.principal - amount);
    } else {
      const buyUnits = amount / index;
      result.units += buyUnits;
      result.principal += amount;
    }
  }

  const latest = getLatestIndexValue(assetKey);
  result.latestIndex = latest;

  if (latest && latest > 0) {
    result.value = result.units * latest;
  } else {
    result.value = result.principal;
  }

  result.pnl = result.value - result.principal;
  result.transactions = investmentTransactions;

  return result;
}


/* ============================================================
   CASH CALCULATION
============================================================ */

function calculateCash(child) {
  let balance = 0;
  if (!child) {
    return 0;
  }

  for (const tx of child.transactions || []) {
    const amount = Number(tx.amount) || 0;
    if (tx.asset !== "cash") {
      continue;
    }

    if (tx.type === "out") {
      balance = Math.max(0, balance - amount);
    } else {
      balance += amount;
    }
  }

  return balance;
}


/* ============================================================
   CALCULATE CHILD
============================================================ */

function calculateChild(child) {
  if (!child) {
    return {
      balances: { cash: 0, world: 0, sp: 0 },
      totalIn: 0,
      totalOut: 0,
      principal: 0,
      investmentValue: 0,
      total: 0,
      worldValue: 0,
      spValue: 0,
      worldPrincipal: 0,
      spPrincipal: 0,
      pnl: 0
    };
  }

  let totalIn = 0;
  let totalOut = 0;

  for (const tx of child.transactions || []) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "out") {
      totalOut += amount;
    } else {
      totalIn += amount;
    }
  }

  const cash = calculateCash(child);
  const world = calculateInvestment(child, "world");
  const sp = calculateInvestment(child, "sp");

  const investmentValue = world.value + sp.value;
  const principal = cash + world.principal + sp.principal;
  const total = cash + investmentValue;
  const pnl = investmentValue - world.principal - sp.principal;

  return {
    balances: {
      cash,
      world: world.value,
      sp: sp.value
    },
    totalIn,
    totalOut,
    principal,
    investmentValue,
    total,
    worldValue: world.value,
    spValue: sp.value,
    worldPrincipal: world.principal,
    spPrincipal: sp.principal,
    pnl
  };
}


/* ============================================================
   CHILD SELECTOR
============================================================ */

function renderChildSelector() {
  const select = $("child");
  if (!select) {
    return;
  }

  select.innerHTML = "";

  for (const child of state.children) {
    const option = document.createElement("option");
    option.value = child.id;
    option.textContent = child.name;
    select.appendChild(option);
  }

  if (!state.children.some(child => child.id === selectedChildId)) {
    selectedChildId = state.children[0]?.id || null;
  }

  select.value = selectedChildId || "";
}


/* ============================================================
   ASSET LABEL
============================================================ */

function assetName(assetKey) {
  const asset = ASSETS[assetKey];
  if (!asset) {
    return assetKey;
  }

  return kidMode ? asset.kidName : asset.name;
}


/* ============================================================
   SUMMARY
============================================================ */

function renderSummary() {
  const child = getCurrentChild();
  const result = calculateChild(child);

  if ($("total")) $("total").textContent = yen(result.total);
  if ($("cash")) $("cash").textContent = yen(result.balances.cash);
  if ($("invest")) $("invest").textContent = yen(result.investmentValue);
  if ($("ins")) $("ins").textContent = yen(result.totalIn);
  if ($("outs")) $("outs").textContent = yen(result.totalOut);
  if ($("pnl")) $("pnl").textContent = signedYen(result.pnl);

  if (kidMode) {
    if ($("totalL")) $("totalL").textContent = "ぜんぶ";
    if ($("cashL")) $("cashL").textContent = "ためている";
    if ($("investL")) $("investL").textContent = "ふやしている";
    if ($("note")) $("note").textContent = "おかねの ぜんぶ";
  } else {
    if ($("totalL")) $("totalL").textContent = "総資産";
    if ($("cashL")) $("cashL").textContent = "貯金";
    if ($("investL")) $("investL").textContent = "投資";
    if ($("note")) $("note").textContent = "投資損益 " + signedYen(result.pnl);
  }
}


/* ============================================================
   ASSET CARDS
============================================================ */

function renderAssets() {
  const child = getCurrentChild();
  const result = calculateChild(child);
  const container = $("assets");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  for (const [key, asset] of Object.entries(ASSETS)) {
    let value = 0;
    let principal = 0;

    if (key === "cash") {
      value = result.balances.cash;
    } else if (key === "world") {
      value = result.worldValue;
      principal = result.worldPrincipal;
    } else if (key === "sp") {
      value = result.spValue;
      principal = result.spPrincipal;
    }

    const card = document.createElement("article");
    card.className = "asset";

    const riskText = kidMode
      ? (asset.risk === "小" ? "へりにくい" : "へることもある")
      : "リスク：" + asset.risk;

    let meta = "";

    if (key === "cash") {
      meta = kidMode ? "いま ためている おかね" : "現在残高";
    } else {
      const pnl = value - principal;
      const indexReturn = getIndexReturn(
        key,
        getLatestInvestmentDate(child, key)
      );

      meta = kidMode
        ? ("いれた おかね " + yen(principal) + " · " + (pnl >= 0 ? "ふえた " : "へった ") + yen(Math.abs(pnl)))
        : ("元本 " + yen(principal) + " · 損益 " + signedYen(pnl));

      if (indexReturn !== null && Number.isFinite(indexReturn)) {
        meta += " · 指数 " + percent(indexReturn);
      }
    }

    card.innerHTML = `
      <div class="asset-top">
        <span class="asset-icon">${asset.icon}</span>
        <span class="meta">${riskText}</span>
      </div>
      <h3>${escapeHtml(assetName(key))}</h3>
      <div class="value">${yen(value)}</div>
      <div class="meta">${meta}</div>
    `;

    container.appendChild(card);
  }
}


/* ============================================================
   LATEST INVESTMENT DATE
============================================================ */

function getLatestInvestmentDate(child, assetKey) {
  if (!child) {
    return today();
  }

  const dates = (child.transactions || [])
    .filter(tx => tx.asset === assetKey && tx.type === "in")
    .map(tx => String(tx.date))
    .sort();

  return dates[dates.length - 1] || today();
}


/* ============================================================
   TRANSACTION FILTER
============================================================ */

function renderAssetFilter() {
  const select = $("af");
  if (!select) {
    return;
  }

  const current = select.value || "all";
  select.innerHTML = "";

  const all = document.createElement("option");
  all.value = "all";
  all.textContent = "すべて";
  select.appendChild(all);

  for (const [key, asset] of Object.entries(ASSETS)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = asset.icon + " " + assetName(key);
    select.appendChild(option);
  }

  if (Array.from(select.options).some(option => option.value === current)) {
    select.value = current;
  }
}


/* ============================================================
   TRANSACTIONS
============================================================ */

function renderTransactions() {
  const child = getCurrentChild();
  const container = $("txs");

  if (!container) {
    return;
  }

  const typeFilter = $("tf")?.value || "all";
  const assetFilter = $("af")?.value || "all";

  let transactions = [...(child?.transactions || [])];

  if (typeFilter !== "all") {
    transactions = transactions.filter(tx => tx.type === typeFilter);
  }

  if (assetFilter !== "all") {
    transactions = transactions.filter(tx => tx.asset === assetFilter);
  }

  transactions.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (!transactions.length) {
    container.innerHTML = `
      <div class="card muted">
        ${kidMode ? "まだ きろくが ありません。" : "取引履歴がありません。"}
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  for (const tx of transactions) {
    const card = document.createElement("div");
    card.className = "card";

    const sign = tx.type === "in" ? "＋" : "−";

    const marketIndex = (tx.asset === "world" || tx.asset === "sp")
      ? getIndexValue(tx.asset, tx.date)
      : null;

    let indexInfo = "";

    if (marketIndex) {
      indexInfo = `
        <div class="meta">
          ${tx.type === "in" ? "いれたとき" : "つかったとき"}の指数：${marketIndex.toLocaleString()}
        </div>
      `;
    }

    card.innerHTML = `
      <strong>
        ${escapeHtml(tx.date)} · ${sign}${yen(tx.amount)}
      </strong>
      <div>
        ${escapeHtml(tx.reason || "")} · ${ASSETS[tx.asset]?.icon || "💰"} ${escapeHtml(assetName(tx.asset))}
      </div>
      ${indexInfo}
      ${tx.memo ? `<div class="meta">${escapeHtml(tx.memo)}</div>` : ""}
    `;

    container.appendChild(card);
  }
}


/* ============================================================
   MARKET RENDER
============================================================ */

function renderMarket() {
  const container = $("market");
  if (!container) {
    return;
  }

  container.innerHTML = "";

  const markets = [
    {
      key: "world",
      icon: "🌎",
      name: kidMode ? "せかいの かぶ" : "全世界株式"
    },
    {
      key: "sp",
      icon: "🇺🇸",
      name: kidMode ? "アメリカの かぶ" : "S&P500"
    }
  ];

  for (const item of markets) {
    const data = marketState?.markets?.[item.key];
    const card = document.createElement("div");
    card.className = "market";

    if (!data || !Array.isArray(data.series) || !data.series.length) {
      card.innerHTML = `
        <div class="market-head">
          <span>${item.icon} ${item.name}</span>
          <span class="muted">まだなし</span>
        </div>
        <div class="price">-</div>
      `;
    } else {
      const latest = data.series[data.series.length - 1];
      const value = Number(latest.value);
      const change = Number(data.change) || 0;

      card.innerHTML = `
        <div class="market-head">
          <span>${item.icon} ${item.name}</span>
          <span class="${change >= 0 ? "up" : "down"}">
            ${percent(change)}
          </span>
        </div>
        <div class="price">
          ${value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}
        </div>
        <div class="meta">
          ${latest.date}
        </div>
      `;
    }

    container.appendChild(card);
  }

  const status = $("marketStatus");
  if (!status) {
    return;
  }

  if (marketState.source === "github") {
    status.textContent = "指数データを GitHub から読み込みました。";
  } else if (marketState.source === "cache") {
    status.textContent = "保存していた指数データを表示しています。";
  } else {
    status.textContent = "「更新」を押すと指数データを確認できます。";
  }
}


/* ============================================================
   FETCH MARKET JSON
============================================================ */

async function fetchMarketData() {
  const status = $("marketStatus");

  if (status) {
    status.textContent = "指数を みています…";
  }

  try {
    const response = await fetch(MARKET_DATA_URL + "?t=" + Date.now(), {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("market.json response error");
    }

    const data = await response.json();
    validateMarketData(data);

    marketState = {
      ...data,
      source: "github"
    };

    saveMarket();
    renderAll();

  } catch (error) {
    console.warn("指数取得失敗:", error);

    const cached = loadMarket();
    if (cached && cached.markets) {
      marketState = {
        ...cached,
        source: "cache"
      };
    } else {
      marketState = emptyMarketState();
    }

    renderAll();

    if (status) {
      status.textContent = "最新の指数を取得できませんでした。保存済みデータを使います。";
    }
  }
}


/* ============================================================
   VALIDATE MARKET DATA
============================================================ */

function validateMarketData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("invalid market data");
  }

  if (!data.markets || typeof data.markets !== "object") {
    throw new Error("markets not found");
  }

  for (const key of ["world", "sp"]) {
    const market = data.markets[key];
    if (!market) {
      throw new Error(key + " market not found");
    }

    if (!Array.isArray(market.series) || !market.series.length) {
      throw new Error(key + " series not found");
    }
  }
}


/* ============================================================
   GOALS
============================================================ */

function renderGoals() {
  const child = getCurrentChild();
  const container = $("goals");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const goals = child?.goals || [];

  if (!goals.length) {
    container.innerHTML = `
      <div class="card muted">
        ${kidMode ? "まだ めあてが ありません。" : "目標がありません。"}
      </div>
    `;
    return;
  }

  const current = calculateChild(child);
  const saved = current.total;

  for (const goal of goals) {
    const amount = Number(goal.amount) || 0;
    const percentValue = amount > 0
      ? Math.min(100, Math.round((saved / amount) * 100))
      : 0;

    const div = document.createElement("div");
    div.className = "goal";

    div.innerHTML = `
      <h3>${escapeHtml(goal.name)}</h3>
      <div class="goal-meta">
        <span>${yen(saved)} / ${yen(amount)}</span>
        <span>${escapeHtml(goal.date)}</span>
      </div>
      <div class="goal-bar">
        <span style="width:${percentValue}%"></span>
      </div>
      <div class="goal-meta">
        <span>${percentValue}%</span>
        <span>あと ${yen(Math.max(0, amount - saved))}</span>
      </div>
    `;

    container.appendChild(div);
  }
}


/* ============================================================
   CHART
============================================================ */

function drawChart() {
  const canvas = $("chart");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const width = canvas.clientWidth || 600;
  const height = 220;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  const child = getCurrentChild();

  if (!child || !child.transactions?.length) {
    context.fillStyle = "#687386";
    context.font = "13px sans-serif";
    context.fillText(
      kidMode
        ? "おかねを いれると うごきが みえるよ"
        : "入金・出金を登録するとグラフが表示されます。",
      15,
      35
    );
    return;
  }

  const transactions = [...child.transactions].sort((a, b) =>
    String(a.date).localeCompare(String(b.date))
  );

  let balance = 0;
  const points = [];

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "out") {
      balance -= amount;
    } else {
      balance += amount;
    }
    points.push(balance);
  }

  if (!points.length) {
    return;
  }

  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);

  const left = 30;
  const right = width - 15;
  const top = 20;
  const bottom = height - 25;

  context.strokeStyle = "#315efb";
  context.lineWidth = 3;
  context.beginPath();

  points.forEach((value, index) => {
    const x = left + (index / Math.max(1, points.length - 1)) * (right - left);
    const normalized = max === min ? 0.5 : (value - min) / (max - min);
    const y = bottom - normalized * (bottom - top);

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.stroke();

  context.fillStyle = "#687386";
  context.font = "11px sans-serif";
  context.fillText(yen(points[points.length - 1]), left, 15);
}


/* ============================================================
   RENDER ALL
============================================================ */

function renderAll() {
  try {
    renderChildSelector();
    renderSummary();
    renderAssets();
    renderAssetFilter();
    renderTransactions();
    renderMarket();
    renderGoals();
    drawChart();
    updateCrash();
  } catch (error) {
    console.error(error);
    showError("画面の表示中にエラーが発生しました。");
  }
}


/* ============================================================
   TRANSACTION MODAL
============================================================ */

function openTransactionModal(type) {
  if ($("txType")) $("txType").value = type;
  if ($("txTitle")) {
    $("txTitle").textContent = type === "in" ? "おかねを いれる" : "おかねを つかう";
  }
  if ($("date")) $("date").value = today();
  if ($("amount")) $("amount").value = "";
  if ($("memo")) $("memo").value = "";

  const assetSelect = $("asset");
  if (assetSelect) {
    assetSelect.innerHTML = "";
    for (const [key, asset] of Object.entries(ASSETS)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = asset.icon + " " + assetName(key);
      assetSelect.appendChild(option);
    }
  }

  $("txModal")?.classList.remove("hidden");
}


/* ============================================================
   CLOSE MODAL
============================================================ */

function closeModal(id) {
  const modal = $(id);
  if (modal) {
    modal.classList.add("hidden");
  }
}


/* ============================================================
   TRANSACTION SUBMIT
============================================================ */

function handleTransactionSubmit(event) {
  event.preventDefault();

  const child = getCurrentChild();
  if (!child) {
    return;
  }

  const type = $("txType")?.value || "in";
  const amount = Number($("amount")?.value);
  const asset = $("asset")?.value || "cash";

  if (!amount || amount <= 0) {
    alert("いくらかを いれてください。");
    return;
  }

  if (type === "out") {
    const current = calculateChild(child);
    const available = current.balances[asset] || 0;

    if (amount > available + 0.0001) {
      alert(
        "のこっている おかねより おおきいよ。\n\n" +
        "のこり：" + yen(available)
      );
      return;
    }
  }

  const date = $("date")?.value || today();

  let indexAtTransaction = null;
  if (asset === "world" || asset === "sp") {
    indexAtTransaction = getIndexValue(asset, date);
  }

  child.transactions.push({
    id: createId(),
    type,
    date,
    amount,
    reason: $("reason")?.value || "",
    asset,
    memo: $("memo")?.value.trim() || "",
    indexAtTransaction,
    createdAt: new Date().toISOString()
  });

  saveState();
  closeModal("txModal");
  renderAll();
}


/* ============================================================
   ADD CHILD
============================================================ */

function handleChildSubmit(event) {
  event.preventDefault();

  const name = $("childName")?.value.trim();
  const birthYear = Number($("birth")?.value);

  if (!name) {
    alert("なまえを いれてください。");
    return;
  }

  const child = {
    id: createId(),
    name,
    birthYear,
    transactions: [],
    goals: []
  };

  state.children.push(child);
  selectedChildId = child.id;

  saveState();
  closeModal("childModal");
  event.target.reset();
  renderAll();
}


/* ============================================================
   ADD GOAL
============================================================ */

function handleGoalSubmit(event) {
  event.preventDefault();

  const child = getCurrentChild();
  if (!child) {
    return;
  }

  const name = $("goalName")?.value.trim();
  const amount = Number($("goalAmount")?.value);
  const date = $("goalDate")?.value;
  const saved = Number($("goalSaved")?.value) || 0;

  if (!name || amount <= 0 || !date) {
    alert("めあてを いれてください。");
    return;
  }

  if (!Array.isArray(child.goals)) {
    child.goals = [];
  }

  child.goals.push({
    id: createId(),
    name,
    amount,
    date,
    saved
  });

  saveState();
  closeModal("goalModal");
  event.target.reset();
  renderAll();
}


/* ============================================================
   FUTURE SIMULATION
============================================================ */

function simulateFuture() {
  const child = getCurrentChild();
  const current = calculateChild(child);

  const annual = Math.max(0, Number($("annual")?.value) || 0);
  const years = Math.max(1, Number($("years")?.value) || 1);
  const saveRatio = Number($("saveRatio")?.value || 50) / 100;
  const investRatio = 1 - saveRatio;

  const cashRate = ASSETS.cash.fixedRate;
  const investRate = ASSETS.world.fixedRate;

  const initialCash = current.balances.cash;
  const initialInvest = current.investmentValue;

  function futureValue(principal, annualAmount, rate, period) {
    if (rate === 0) {
      return principal + annualAmount * period;
    }
    return (
      principal * Math.pow(1 + rate, period) +
      annualAmount * (Math.pow(1 + rate, period) - 1) / rate
    );
  }

  const futureCash = futureValue(initialCash, annual * saveRatio, cashRate, years);
  const futureInvest = futureValue(initialInvest, annual * investRatio, investRate, years);
  const total = futureCash + futureInvest;

  const resultEl = $("result");
  if (resultEl) {
    resultEl.innerHTML = `
      <div class="card">
        <h3>かんがえてみよう</h3>
        <div class="value">${yen(total)}</div>
        <p class="muted">
          ${years}ねん後 · ためる ${Math.round(saveRatio * 100)}% / ふやす ${Math.round(investRatio * 100)}%
        </p>
        <p>
          これは よそうの けいさんだよ。ほんとうの投資では、ふえることも へることも あるよ。
        </p>
      </div>
    `;
  }
}


/* ============================================================
   RATIO
============================================================ */

function updateRatioFromSave() {
  const save = Number($("saveRatio")?.value || 50);
  const invest = 100 - save;

  if ($("investRatio")) $("investRatio").value = invest;
  if ($("sr")) $("sr").textContent = save + "%";
  if ($("ir")) $("ir").textContent = invest + "%";
}

function updateRatioFromInvest() {
  const invest = Number($("investRatio")?.value || 50);
  const save = 100 - invest;

  if ($("saveRatio")) $("saveRatio").value = save;
  if ($("sr")) $("sr").textContent = save + "%";
  if ($("ir")) $("ir").textContent = invest + "%";
}


/* ============================================================
   CRASH SIMULATION
============================================================ */

function updateCrash() {
  const child = getCurrentChild();
  const result = calculateChild(child);

  const crash = Number($("crash")?.value) || 0;
  const loss = (result.investmentValue * crash) / 100;
  const after = result.total - loss;

  if ($("crashL")) $("crashL").textContent = "-" + crash + "%";

  const crashBox = $("crashBox");
  if (crashBox) {
    crashBox.innerHTML = `
      <div>${kidMode ? "とうしが へると…" : "投資部分が下落すると…"}</div>
      <strong>${yen(after)}</strong>
      <div class="muted">
        ${kidMode ? "いまより " : "現在より "}${yen(loss)}${kidMode ? " へるよ。" : " 減少します。"}
      </div>
    `;
  }
}


/* ============================================================
   EXPORT
============================================================ */

function exportData() {
  const payload = {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    children: state.children
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "kids-money-v22.json";
  anchor.click();

  URL.revokeObjectURL(url);
}


/* ============================================================
   IMPORT
============================================================ */

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);

      if (!parsed || !Array.isArray(parsed.children)) {
        throw new Error("invalid");
      }

      state = {
        version: APP_VERSION,
        children: parsed.children
      };

      selectedChildId = state.children[0]?.id || null;

      saveState();
      closeModal("settingsModal");
      renderAll();

      alert("データを よみこみました。");
    } catch (error) {
      console.error(error);
      alert("JSONが正しくありません。");
    }
  };

  reader.readAsText(file);
}


/* ============================================================
   RESET
============================================================ */

function resetData() {
  const ok = confirm("データを ぜんぶ けしていい？");
  if (!ok) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  state = createDefaultState();
  selectedChildId = state.children[0].id;

  saveState();
  renderAll();
}


/* ============================================================
   TAB
============================================================ */

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach(button => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.querySelectorAll(".panel").forEach(panel => {
    panel.classList.toggle("active", panel.id === tabName);
  });

  if (tabName === "home") {
    drawChart();
  }
}


/* ============================================================
   EVENT BINDING
============================================================ */

function bindEvents() {
  /* タブ */
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tab);
    });
  });

  /* 子ども変更 */
  $("child")?.addEventListener("change", event => {
    selectedChildId = event.target.value;
    renderAll();
  });

  /* 子ども追加 */
  $("addChild")?.addEventListener("click", () => {
    $("childModal")?.classList.remove("hidden");
  });

  /* 設定 */
  $("settings")?.addEventListener("click", () => {
    $("settingsModal")?.classList.remove("hidden");
  });

  /* 入金 */
  $("in")?.addEventListener("click", () => openTransactionModal("in"));
  $("in2")?.addEventListener("click", () => openTransactionModal("in"));

  /* 出金 */
  $("out")?.addEventListener("click", () => openTransactionModal("out"));
  $("out2")?.addEventListener("click", () => openTransactionModal("out"));

  /* 市場更新 */
  $("refresh")?.addEventListener("click", fetchMarketData);

  /* こどもモード */
  if ($("kidMode")) {
    $("kidMode").checked = kidMode;
    $("kidMode").addEventListener("change", event => {
      kidMode = event.target.checked;
      localStorage.setItem("kidsMoneyKidMode", kidMode ? "1" : "0");
      renderAll();

      if (typeof refreshLearnForModeChange === "function") {
        refreshLearnForModeChange();
      }
    });
  }

  /* Form Listener */
  $("txForm")?.addEventListener("submit", handleTransactionSubmit);
  $("childForm")?.addEventListener("submit", handleChildSubmit);

  $("addGoal")?.addEventListener("click", () => {
    $("goalModal")?.classList.remove("hidden");
  });
  $("goalForm")?.addEventListener("submit", handleGoalSubmit);

  /* Filters */
  $("tf")?.addEventListener("change", renderTransactions);
  $("af")?.addEventListener("change", renderTransactions);

  /* Simulation */
  $("simulate")?.addEventListener("click", simulateFuture);
  $("saveRatio")?.addEventListener("input", updateRatioFromSave);
  $("investRatio")?.addEventListener("input", updateRatioFromInvest);
  $("crash")?.addEventListener("input", updateCrash);

  /* Modal Close */
  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
      closeModal(button.dataset.close);
    });
  });

  /* Data Management */
  $("export")?.addEventListener("click", exportData);
  $("import")?.addEventListener("change", importData);
  $("reset")?.addEventListener("click", resetData);
}


/* ============================================================
   INIT
============================================================ */

function init() {
  state = loadState();
  marketState = loadMarket();
  selectedChildId = state.children[0]?.id || null;

  bindEvents();
  renderAll();

  /* 起動時にGitHub上の最新market.jsonを確認 */
  fetchMarketData();
}

document.addEventListener("DOMContentLoaded", init);
