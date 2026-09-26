"use strict";

/*
============================================================
こどもマネー・ラボ V2.9
メインアプリケーションロジック
============================================================
*/

const STORAGE_KEY = "kidsMoneyLabV22";
const MARKET_KEY = "kidsMoneyMarketV22";
const APP_VERSION = 23;
const MARKET_DATA_URL = "./data/market.json";

const ASSETS = {
  cash: { name: "貯金", kidName: "ためる", icon: "🏦", fixedRate: 0.002, risk: "小", type: "cash" },
  world: { name: "全世界株式", kidName: "せかいの かぶ", icon: "🌎", fixedRate: 0.055, risk: "大", type: "index", marketKey: "world" },
  sp: { name: "S&P500", kidName: "アメリカの かぶ", icon: "🇺🇸", fixedRate: 0.06, risk: "大", type: "index", marketKey: "sp" }
};

let state = null;
let marketState = {
  version: 2,
  updated: null,
  source: "none",
  markets: { world: null, sp: null }
};

let selectedChildId = null;
let kidMode = localStorage.getItem("kidsMoneyKidMode") === "1";
let editingChildId = null;
let editingTransactionId = null;

function $(id) { return document.getElementById(id); }

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function yen(value) {
  const n = Number(value) || 0;
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

function signedYen(value) {
  const n = Number(value) || 0;
  return (n >= 0 ? "+" : "-") + yen(Math.abs(n));
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

function today() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function showError(message) {
  const box = $("errorBox");
  if (!box) { console.error(message); return; }
  box.textContent = message;
  box.classList.remove("hidden");
  clearTimeout(showError.timer);
  showError.timer = setTimeout(() => { box.classList.add("hidden"); }, 5000);
  console.error(message);
}

function createDefaultState() {
  return {
    version: APP_VERSION,
    children: [
      { id: createId(), name: "こどもA", birthYear: 2017, transactions: [], goals: [] }
    ]
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.children)) return createDefaultState();
    parsed.version = APP_VERSION;
    parsed.children = parsed.children.map(child => ({
      ...child,
      transactions: Array.isArray(child.transactions) ? child.transactions : [],
      goals: Array.isArray(child.goals) ? child.goals : []
    }));
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

function emptyMarketState() {
  return { version: 2, updated: null, source: "none", markets: { world: null, sp: null } };
}

function loadMarket() {
  try {
    const raw = localStorage.getItem(MARKET_KEY);
    if (!raw) return emptyMarketState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyMarketState();
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

function getCurrentChild() {
  if (!state || !Array.isArray(state.children) || !state.children.length) return null;
  const selected = state.children.find(child => child.id === selectedChildId);
  return selected || state.children[0];
}

function getChildById(childId) {
  if (!state || !Array.isArray(state.children)) return null;
  return state.children.find(child => child.id === childId) || null;
}

function getMarket(assetKey) {
  const asset = ASSETS[assetKey];
  if (!asset || asset.type !== "index") return null;
  return marketState?.markets?.[asset.marketKey] || null;
}

function getLatestIndexValue(assetKey) {
  const market = getMarket(assetKey);
  if (!market || !Array.isArray(market.series) || !market.series.length) return null;
  const latest = market.series[market.series.length - 1];
  const value = Number(latest?.value);
  return value > 0 ? value : null;
}

function getIndexValue(assetKey, date) {
  const market = getMarket(assetKey);
  if (!market || !Array.isArray(market.series) || !market.series.length) return null;
  let result = null;
  for (const item of market.series) {
    if (String(item.date) <= String(date)) {
      const value = Number(item.value);
      if (value > 0) result = value;
    } else {
      break;
    }
  }
  return result;
}

function getIndexReturn(assetKey, date) {
  const current = getLatestIndexValue(assetKey);
  const historical = getIndexValue(assetKey, date);
  if (!current || !historical) return null;
  return ((current / historical) - 1) * 100;
}

function calculateInvestment(child, assetKey) {
  const result = { units: 0, principal: 0, value: 0, pnl: 0, latestIndex: null, transactions: [] };
  if (!child) return result;
  const transactions = Array.isArray(child.transactions) ? [...child.transactions] : [];
  const investmentTransactions = transactions
    .filter(tx => tx.asset === assetKey)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  for (const tx of investmentTransactions) {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) continue;
    const index = getIndexValue(assetKey, tx.date);
    if (!index || index <= 0) {
      if (tx.type === "in") result.principal += amount;
      else result.principal = Math.max(0, result.principal - amount);
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
  result.value = (latest && latest > 0) ? result.units * latest : result.principal;
  result.pnl = result.value - result.principal;
  result.transactions = investmentTransactions;
  return result;
}

function calculateCash(child) {
  let balance = 0;
  if (!child) return 0;
  for (const tx of child.transactions || []) {
    const amount = Number(tx.amount) || 0;
    if (tx.asset !== "cash") continue;
    if (tx.type === "out") balance = Math.max(0, balance - amount);
    else balance += amount;
  }
  return balance;
}

function calculateChild(child) {
  if (!child) {
    return { balances: { cash: 0, world: 0, sp: 0 }, totalIn: 0, totalOut: 0, principal: 0, investmentValue: 0, total: 0, worldValue: 0, spValue: 0, worldPrincipal: 0, spPrincipal: 0, pnl: 0 };
  }
  let totalIn = 0, totalOut = 0;
  for (const tx of child.transactions || []) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "out") totalOut += amount;
    else totalIn += amount;
  }
  const cash = calculateCash(child);
  const world = calculateInvestment(child, "world");
  const sp = calculateInvestment(child, "sp");
  const investmentValue = world.value + sp.value;
  const principal = cash + world.principal + sp.principal;
  const total = cash + investmentValue;
  const pnl = investmentValue - world.principal - sp.principal;

  return {
    balances: { cash, world: world.value, sp: sp.value },
    totalIn, totalOut, principal, investmentValue, total,
    worldValue: world.value, spValue: sp.value,
    worldPrincipal: world.principal, spPrincipal: sp.principal, pnl
  };
}

/* 子ども選択カード V2.9 対応 */
function renderChildSelector() {
  const select = $("child");
  const cards = $("childSelectorCards");
  if (!state || !Array.isArray(state.children)) return;

  if (select) {
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

  if (!cards) return;
  cards.innerHTML = "";
  for (const child of state.children) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "child-card" + (child.id === selectedChildId ? " active" : "");
    button.dataset.childSelect = child.id;

    const name = document.createElement("strong");
    name.textContent = child.name;
    const age = document.createElement("small");
    if (child.birthYear) {
      const currentYear = new Date().getFullYear();
      const calculatedAge = Math.max(0, currentYear - Number(child.birthYear));
      age.textContent = kidMode ? `${calculatedAge}さい` : `${calculatedAge}歳`;
    }

    button.appendChild(document.createTextNode("👤 "));
    button.appendChild(name);
    button.appendChild(age);
    cards.appendChild(button);
  }
}

function assetName(assetKey) {
  const asset = ASSETS[assetKey];
  if (!asset) return assetKey;
  return kidMode ? asset.kidName : asset.name;
}

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

function getLatestInvestmentDate(child, assetKey) {
  if (!child) return today();
  const dates = (child.transactions || [])
    .filter(tx => tx.asset === assetKey && tx.type === "in")
    .map(tx => String(tx.date))
    .sort();
  return dates[dates.length - 1] || today();
}

function renderAssets() {
  const child = getCurrentChild();
  const result = calculateChild(child);
  const container = $("assets");
  if (!container) return;
  container.innerHTML = "";

  for (const [key, asset] of Object.entries(ASSETS)) {
    let value = 0, principal = 0;
    if (key === "cash") value = result.balances.cash;
    else if (key === "world") { value = result.worldValue; principal = result.worldPrincipal; }
    else if (key === "sp") { value = result.spValue; principal = result.spPrincipal; }

    const card = document.createElement("article");
    card.className = "asset";
    const riskText = kidMode ? (asset.risk === "小" ? "へりにくい" : "へることもある") : "リスク：" + asset.risk;
    let meta = "";

    if (key === "cash") {
      meta = kidMode ? "いま ためている おかね" : "現在残高";
    } else {
      const pnl = value - principal;
      const indexReturn = getIndexReturn(key, getLatestInvestmentDate(child, key));
      meta = kidMode
        ? "いれた おかね " + yen(principal) + " · " + (pnl >= 0 ? "ふえた " : "へった ") + yen(Math.abs(pnl))
        : "元本 " + yen(principal) + " · 損益 " + signedYen(pnl);
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

function renderAssetFilter() {
  const select = $("af");
  if (!select) return;
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
  if (Array.from(select.options).some(o => o.value === current)) {
    select.value = current;
  }
}

function renderTransactions() {
  const child = getCurrentChild();
  const container = $("txs");
  if (!container) return;

  const typeFilter = $("tf")?.value || "all";
  const assetFilter = $("af")?.value || "all";
  let transactions = [...(child?.transactions || [])];

  if (typeFilter !== "all") transactions = transactions.filter(tx => tx.type === typeFilter);
  if (assetFilter !== "all") transactions = transactions.filter(tx => tx.asset === assetFilter);
  transactions.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  if (!transactions.length) {
    container.innerHTML = `<div class="card muted">${kidMode ? "まだ きろくが ありません。" : "取引履歴がありません。"}</div>`;
    return;
  }

  container.innerHTML = "";
  for (const tx of transactions) {
    const card = document.createElement("div");
    card.className = "card";
    const sign = tx.type === "in" ? "＋" : "−";
    const marketIndex = (tx.asset === "world" || tx.asset === "sp") ? getIndexValue(tx.asset, tx.date) : null;
    const indexInfo = marketIndex ? `<div class="meta">${tx.type === "in" ? "いれたとき" : "つかったとき"}の指数：${marketIndex.toLocaleString()}</div>` : "";

    card.innerHTML = `
      <div class="section-header">
        <strong>${escapeHtml(tx.date)} · ${sign}${yen(tx.amount)}</strong>
        <div class="button-group">
          <button type="button" class="secondary small" data-tx-edit="${escapeHtml(tx.id)}">✏️ 編集</button>
          <button type="button" class="secondary small" data-tx-delete="${escapeHtml(tx.id)}">🗑️ 削除</button>
        </div>
      </div>
      <div>${escapeHtml(tx.reason || "")} · ${ASSETS[tx.asset]?.icon || "💰"} ${escapeHtml(assetName(tx.asset))}</div>
      ${indexInfo}
      ${tx.memo ? `<div class="meta">${escapeHtml(tx.memo)}</div>` : ""}
    `;
    container.appendChild(card);
  }
}

function renderMarket() {
  const container = $("market");
  if (!container) return;
  container.innerHTML = "";

  const markets = [
    { key: "world", icon: "🌎", name: kidMode ? "せかいの かぶ" : "全世界株式" },
    { key: "sp", icon: "🇺🇸", name: kidMode ? "アメリカの かぶ" : "S&P500" }
  ];

  for (const item of markets) {
    const data = marketState?.markets?.[item.key];
    const card = document.createElement("div");
    card.className = "market";

    if (!data || !Array.isArray(data.series) || !data.series.length) {
      card.innerHTML = `<div class="market-head"><span>${item.icon} ${item.name}</span><span class="muted">まだなし</span></div><div class="price">-</div>`;
    } else {
      const latest = data.series[data.series.length - 1];
      const value = Number(latest.value);
      const change = Number(data.change) || 0;
      card.innerHTML = `
        <div class="market-head">
          <span>${item.icon} ${item.name}</span>
          <span class="${change >= 0 ? "up" : "down"}">${percent(change)}</span>
        </div>
        <div class="price">${value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}</div>
        <div class="meta">${latest.date}</div>
      `;
    }
    container.appendChild(card);
  }

  const status = $("marketStatus");
  if (!status) return;
  if (marketState.source === "github") status.textContent = "指数データを取得しました。";
  else if (marketState.source === "cache") status.textContent = "保存していた指数データを表示しています。";
  else status.textContent = "「更新」を押すと指数データを確認できます。";
}

async function fetchMarketData() {
  const status = $("marketStatus");
  if (status) status.textContent = "指数を みています…";
  try {
    const response = await fetch(MARKET_DATA_URL + "?t=" + Date.now(), { method: "GET", cache: "no-store" });
    if (!response.ok) throw new Error("market.json fetch error");
    const data = await response.json();
    marketState = { ...data, source: "github" };
    saveMarket();
    renderAll();
  } catch (error) {
    console.warn("指数取得失敗:", error);
    const cached = loadMarket();
    marketState = (cached && cached.markets) ? { ...cached, source: "cache" } : emptyMarketState();
    renderAll();
    if (status) status.textContent = "最新の指数を取得できませんでした。保存済みデータを使います。";
  }
}

function renderGoals() {
  const child = getCurrentChild();
  const container = $("goalsList");
  if (!container) return;
  container.innerHTML = "";

  const goals = child?.goals || [];
  if (!goals.length) {
    container.innerHTML = `<div class="card muted">${kidMode ? "まだ めあてが ありません。" : "目標がありません。"}</div>`;
    return;
  }

  const current = calculateChild(child);
  const totalSaved = current.total;

  for (const goal of goals) {
    const amount = Number(goal.amount) || 0;
    const manualSaved = Number(goal.saved) || 0;
    const saved = manualSaved > 0 ? manualSaved : totalSaved;
    const percentValue = amount > 0 ? Math.min(100, Math.round((saved / amount) * 100)) : 0;

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="section-header">
        <h3>${escapeHtml(goal.name)}</h3>
        <button type="button" class="secondary small" data-goal-delete="${escapeHtml(goal.id)}">🗑️ 削除</button>
      </div>
      <div class="meta" style="margin-bottom:8px;">${yen(saved)} / ${yen(amount)} (${escapeHtml(goal.date)}まで)</div>
      <div style="background:#e2e8f0; height:12px; border-radius:6px; overflow:hidden; margin-bottom:8px;">
        <div style="background:var(--blue); height:100%; width:${percentValue}%;"></div>
      </div>
      <div class="meta">達成率: ${percentValue}% · あと ${yen(Math.max(0, amount - saved))}</div>
    `;
    container.appendChild(div);
  }
}

function drawChart() {
  const canvas = $("chart");
  if (!canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;

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
    context.fillText(kidMode ? "おかねを いれると うごきが みえるよ" : "入金・出金を登録するとグラフが表示されます。", 15, 35);
    return;
  }

  const transactions = [...child.transactions].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  let balance = 0;
  const points = [];
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "out") balance -= amount;
    else balance += amount;
    points.push(balance);
  }

  if (!points.length) return;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const left = 30, right = width - 15, top = 20, bottom = height - 25;

  context.strokeStyle = "#315efb";
  context.lineWidth = 3;
  context.beginPath();

  points.forEach((value, index) => {
    const x = left + (index / Math.max(1, points.length - 1)) * (right - left);
    const normalized = (max === min) ? 0.5 : ((value - min) / (max - min));
    const y = bottom - normalized * (bottom - top);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  context.fillStyle = "#687386";
  context.font = "11px sans-serif";
  context.fillText(yen(points[points.length - 1]), left, 15);
}

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
  } catch (error) {
    console.error(error);
    showError("画面の表示中にエラーが発生しました。");
  }
}

function openModal(id) { $(id)?.classList.remove("hidden"); }
function closeModal(id) { $(id)?.classList.add("hidden"); }

function openChildModal(childId = null) {
  editingChildId = childId;
  const modal = $("childModal");
  if (!modal) return;
  const title = $("childModalTitle");

  if (childId) {
    const child = getChildById(childId);
    if (!child) return;
    if ($("childName")) $("childName").value = child.name || "";
    if ($("birth")) $("birth").value = child.birthYear ?? "";
    if (title) title.textContent = "こどもを へんこう";
  } else {
    if ($("childName")) $("childName").value = "";
    if ($("birth")) $("birth").value = "";
    if (title) title.textContent = "こどもを ついか";
  }
  openModal("childModal");
}

function handleChildSubmit(event) {
  event.preventDefault();
  const name = $("childName")?.value?.trim();
  const birthYear = Number($("birth")?.value);

  if (!name || !Number.isFinite(birthYear)) {
    alert("なまえと うまれた年を いれてください。");
    return;
  }

  if (editingChildId) {
    const child = getChildById(editingChildId);
    if (child) {
      child.name = name;
      child.birthYear = birthYear;
    }
  } else {
    const child = { id: createId(), name, birthYear, transactions: [], goals: [] };
    state.children.push(child);
    selectedChildId = child.id;
  }

  saveState();
  closeModal("childModal");
  editingChildId = null;
  renderAll();
  if (typeof refreshEducationForChildChange === "function") refreshEducationForChildChange();
  if (typeof refreshLearnForChildChange === "function") refreshLearnForChildChange();
}

function deleteChild(childId) {
  if (state.children.length <= 1) {
    alert("こどもが ひとりだけのときは けせません。");
    return;
  }
  const child = getChildById(childId);
  if (!child) return;
  if (!confirm(`${child.name} のデータを 削除しますか？`)) return;

  const index = state.children.findIndex(c => c.id === childId);
  if (index >= 0) {
    state.children.splice(index, 1);
    selectedChildId = state.children[0]?.id || null;
    saveState();
    renderAll();
    if (typeof refreshEducationForChildChange === "function") refreshEducationForChildChange();
    if (typeof refreshLearnForChildChange === "function") refreshLearnForChildChange();
  }
}

function openTransactionModal(type, transactionId = null) {
  const child = getCurrentChild();
  if (!child) return;

  editingTransactionId = transactionId;
  if ($("txType")) $("txType").value = type;
  if ($("txTitle")) $("txTitle").textContent = type === "in" ? "おかねを いれる" : "おかねを つかう";

  if (transactionId) {
    const tx = child.transactions.find(t => t.id === transactionId);
    if (tx) {
      if ($("amount")) $("amount").value = tx.amount;
      if ($("date")) $("date").value = tx.date;
      if ($("reason")) $("reason").value = tx.reason;
      if ($("memo")) $("memo").value = tx.memo || "";
    }
  } else {
    if ($("amount")) $("amount").value = "";
    if ($("date")) $("date").value = today();
    if ($("reason")) $("reason").selectedIndex = 0;
    if ($("memo")) $("memo").value = "";
  }

  const assetSelect = $("asset");
  if (assetSelect) {
    assetSelect.innerHTML = "";
    const currentAsset = transactionId ? child.transactions.find(t => t.id === transactionId)?.asset : "cash";
    for (const [key, asset] of Object.entries(ASSETS)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = asset.icon + " " + assetName(key);
      if (key === currentAsset) option.selected = true;
      assetSelect.appendChild(option);
    }
  }
  openModal("txModal");
}

function handleTransactionSubmit(event) {
  event.preventDefault();
  const child = getCurrentChild();
  if (!child) return;

  const type = $("txType")?.value || "in";
  const amount = Number($("amount")?.value);
  const asset = $("asset")?.value || "cash";
  const date = $("date")?.value || today();
  const reason = $("reason")?.value || "";
  const memo = $("memo")?.value?.trim() || "";

  if (!Number.isFinite(amount) || amount <= 0) {
    alert("いくらかを いれてください。");
    return;
  }

  let editingTx = null;
  let editingIndex = -1;
  if (editingTransactionId) {
    editingIndex = child.transactions.findIndex(t => t.id === editingTransactionId);
    if (editingIndex >= 0) editingTx = child.transactions[editingIndex];
  }

  if (editingIndex >= 0) child.transactions.splice(editingIndex, 1);

  if (type === "out") {
    const current = calculateChild(child);
    const available = current.balances[asset] || 0;
    if (amount > available + 0.0001) {
      if (editingTx) child.transactions.splice(editingIndex, 0, editingTx);
      alert("のこっている おかねより おおきいよ。\nのこり：" + yen(available));
      return;
    }
  }

  const tx = {
    id: editingTx?.id || createId(),
    type, date, amount, reason, asset, memo,
    indexAtTransaction: (asset === "world" || asset === "sp") ? getIndexValue(asset, date) : null,
    createdAt: editingTx?.createdAt || new Date().toISOString()
  };

  child.transactions.push(tx);
  saveState();
  closeModal("txModal");
  editingTransactionId = null;
  renderAll();
}

function deleteTransaction(txId) {
  const child = getCurrentChild();
  if (!child) return;
  if (!confirm("この記録を削除しますか？")) return;
  child.transactions = child.transactions.filter(t => t.id !== txId);
  saveState();
  renderAll();
}

function openGoalModal() {
  if ($("goalName")) $("goalName").value = "";
  if ($("goalAmount")) $("goalAmount").value = "";
  if ($("goalDate")) $("goalDate").value = today();
  openModal("goalModal");
}

function handleGoalSubmit(event) {
  event.preventDefault();
  const child = getCurrentChild();
  if (!child) return;

  const name = $("goalName")?.value?.trim();
  const amount = Number($("goalAmount")?.value);
  const date = $("goalDate")?.value || today();

  if (!name || !Number.isFinite(amount) || amount <= 0) {
    alert("めあてと きんがくを いれてください。");
    return;
  }

  child.goals.push({ id: createId(), name, amount, date, saved: 0 });
  saveState();
  closeModal("goalModal");
  renderAll();
}

function deleteGoal(goalId) {
  const child = getCurrentChild();
  if (!child) return;
  if (!confirm("この めあてを けしますか？")) return;
  child.goals = child.goals.filter(g => g.id !== goalId);
  saveState();
  renderAll();
}

function toggleKidMode() {
  kidMode = !kidMode;
  localStorage.setItem("kidsMoneyKidMode", kidMode ? "1" : "0");
  const btn = $("toggleKidModeBtn");
  if (btn) btn.textContent = kidMode ? "👶 こどもモード: ON" : "👶 こどもモード: OFF";
  renderAll();
  if (typeof refreshEducationForModeChange === "function") refreshEducationForModeChange();
  if (typeof refreshLearnForChildChange === "function") refreshLearnForChildChange();
}

function bindEvents() {
  // 子ども選択カードのクリックイベント（イベント委譲）
  document.addEventListener("click", event => {
    const card = event.target.closest("[data-child-select]");
    if (card) {
      const childId = card.dataset.childSelect;
      if (childId && childId !== selectedChildId) {
        selectedChildId = childId;
        renderAll();
        if (typeof refreshEducationForChildChange === "function") refreshEducationForChildChange();
        if (typeof refreshLearnForChildChange === "function") refreshLearnForChildChange();
      }
      return;
    }

    const editBtn = event.target.closest("[data-child-edit]");
    if (editBtn) { openChildModal(editBtn.dataset.childEdit); return; }

    const deleteBtn = event.target.closest("[data-child-delete]");
    if (deleteBtn) { deleteChild(deleteBtn.dataset.childDelete); return; }

    const txEditBtn = event.target.closest("[data-tx-edit]");
    if (txEditBtn) { openTransactionModal("in", txEditBtn.dataset.txEdit); return; }

    const txDeleteBtn = event.target.closest("[data-tx-delete]");
    if (txDeleteBtn) { deleteTransaction(txDeleteBtn.dataset.txDelete); return; }

    const goalDeleteBtn = event.target.closest("[data-goal-delete]");
    if (goalDeleteBtn) { deleteGoal(goalDeleteBtn.dataset.goalDelete); return; }
  });

  // タブ切り替え
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.dataset.tab + "Section";
      if ($(targetId))$(targetId).classList.add("active");
    };
  });

  $("addChild")?.addEventListener("click", () => openChildModal(null));
  $("btnDeposit")?.addEventListener("click", () => openTransactionModal("in"));
  $("btnWithdraw")?.addEventListener("click", () => openTransactionModal("out"));
  $("btnAddGoal")?.addEventListener("click", openGoalModal);
  $("btnRefreshMarket")?.addEventListener("click", fetchMarketData);
  $("toggleKidModeBtn")?.addEventListener("click", toggleKidMode);

  $("childForm")?.addEventListener("submit", handleChildSubmit);
  $("txForm")?.addEventListener("submit", handleTransactionSubmit);
  $("goalForm")?.addEventListener("submit", handleGoalSubmit);

  $("tf")?.addEventListener("change", renderTransactions);
  $("af")?.addEventListener("change", renderTransactions);
}

function init() {
  state = loadState();
  marketState = loadMarket();
  if (state.children.length) selectedChildId = state.children[0].id;
  const btn = $("toggleKidModeBtn");
  if (btn) btn.textContent = kidMode ? "👶 こどもモード: ON" : "👶 こどもモード: OFF";

  bindEvents();
  renderAll();
  fetchMarketData();
}

document.addEventListener("DOMContentLoaded", init);
