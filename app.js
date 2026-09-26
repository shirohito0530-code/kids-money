"use strict";

/* ============================================================
 * こどもマネー・ラボ
 * app.js
 * Version 25
 * ============================================================ */

const STORAGE_KEY = "kidsMoneyLabV22";
const MARKET_KEY = "kidsMoneyMarketV22";
const SELECTED_CHILD_KEY = "kidsMoneySelectedChildV22";
const KID_MODE_KEY = "kidsMoneyKidMode";

const APP_VERSION = 26;
const MARKET_DATA_URL = "./data/market.json";

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
 * Global state
 * ============================================================ */

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
let kidMode = localStorage.getItem(KID_MODE_KEY) === "1";

let editingChildId = null;
let editingTransactionId = null;


/* ============================================================
 * Utilities
 * ============================================================ */

function $(id) {
  return document.getElementById(id);
}


function createId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}


function yen(value) {
  const n = Number(value) || 0;
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}


function signedYen(value) {
  const n = Number(value) || 0;

  return (
    (n >= 0 ? "+" : "-") +
    yen(Math.abs(n))
  );
}


function percent(value) {
  const n = Number(value) || 0;

  return (
    (n >= 0 ? "+" : "") +
    n.toFixed(2) +
    "%"
  );
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

  const local = new Date(
    now.getTime() -
    now.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 10);
}


/* ============================================================
 * Error
 * ============================================================ */

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
 * Child state
 * ============================================================ */

function createDefaultState() {
  return {
    version: APP_VERSION,

    children: [
      {
        id: createId(),
        name: "こどもA",
        birthYear: 2019,
        transactions: [],
        goals: [],
        learning: {}
      }
    ]
  };
}


function normalizeChild(child) {
  const normalized = {
    ...child,

    transactions:
      Array.isArray(child?.transactions)
        ? child.transactions
        : [],

    goals:
      Array.isArray(child?.goals)
        ? child.goals
        : [],

    learning:
      child?.learning &&
      typeof child.learning === "object"
        ? child.learning
        : {}
  };

  if (!normalized.id) {
    normalized.id = createId();
  }

  if (!normalized.name) {
    normalized.name = "こども";
  }

  return normalized;
}


function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.children)
    ) {
      return createDefaultState();
    }

    parsed.version = APP_VERSION;

    parsed.children =
      parsed.children.map(normalizeChild);

    if (!parsed.children.length) {
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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (error) {
    showError(
      kidMode
        ? "データを ほぞんできなかったよ。"
        : "データを保存できませんでした。"
    );
  }
}


/* ============================================================
 * Selected child
 * ============================================================ */

function loadSelectedChildId() {
  try {
    const saved =
      localStorage.getItem(
        SELECTED_CHILD_KEY
      );

    if (
      saved &&
      state?.children?.some(
        child => child.id === saved
      )
    ) {
      return saved;
    }

  } catch (error) {
    console.warn(
      "選択中の子どもの読み込みに失敗:",
      error
    );
  }

  return state?.children?.[0]?.id || null;
}


function saveSelectedChildId() {
  try {
    if (selectedChildId) {
      localStorage.setItem(
        SELECTED_CHILD_KEY,
        selectedChildId
      );
    } else {
      localStorage.removeItem(
        SELECTED_CHILD_KEY
      );
    }

  } catch (error) {
    console.warn(
      "選択中の子どもの保存に失敗:",
      error
    );
  }
}


/* ============================================================
 * Public API
 *
 * education.js / learn.js から利用する
 * ============================================================ */

window.getKidsMoneyState = function () {
  return state;
};


window.getCurrentChild = function () {
  return getCurrentChild();
};


window.getCurrentChildId = function () {
  return selectedChildId;
};


window.isKidsMoneyKidMode = function () {
  return kidMode;
};


window.getKidsMoneyKidMode = function () {
  return kidMode;
};


window.setKidsMoneyChild = function (childId) {
  selectChild(childId, true);
};


window.getKidsMoneyChildren = function () {
  return Array.isArray(state?.children)
    ? state.children
    : [];
};


/*
 * 学習側から市場データを安全に取得できるようにする。
 */
window.getKidsMoneyMarketState = function () {
  return marketState;
};


/*
 * 今日のお金を学習側から利用するためのAPI。
 */
window.getKidsMoneyTodayMoney = function () {
  const child = getCurrentChild();
  return calculateTodayMoney(child);
};


/*
 * 現在の子どもの表示名を取得。
 */
window.getKidsMoneyCurrentChildName = function () {
  const child = getCurrentChild();
  return child?.name || "";
};

window.renderKidsMoneyTodayMoney = function () {
  renderTodayMoney();
};


/* ============================================================
 * Market state
 * ============================================================ */

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
    const raw =
      localStorage.getItem(MARKET_KEY);

    if (!raw) {
      return emptyMarketState();
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return emptyMarketState();
    }

    return parsed;

  } catch {
    return emptyMarketState();
  }
}


function saveMarket() {
  try {
    localStorage.setItem(
      MARKET_KEY,
      JSON.stringify(marketState)
    );
  } catch (error) {
    console.error(error);
  }
}


/* ============================================================
 * Child access
 * ============================================================ */

function getCurrentChild() {
  if (
    !state ||
    !Array.isArray(state.children) ||
    !state.children.length
  ) {
    return null;
  }

  const selected =
    state.children.find(
      child => child.id === selectedChildId
    );

  if (selected) {
    return selected;
  }

  selectedChildId =
    state.children[0].id;

  saveSelectedChildId();

  return state.children[0];
}


function getChildById(childId) {
  if (
    !state ||
    !Array.isArray(state.children)
  ) {
    return null;
  }

  return (
    state.children.find(
      child => child.id === childId
    ) || null
  );
}


/* ============================================================
 * Child change event
 * ============================================================ */

function dispatchChildChanged(
  child,
  previousChildId = null,
  reason = "change"
) {
  window.dispatchEvent(
    new CustomEvent(
      "kidsMoneyChildChanged",
      {
        detail: {
          childId: child?.id || selectedChildId,
          child: child || null,
          previousChildId,
          reason
        }
      }
    )
  );
}


/* ============================================================
 * Child selection
 * ============================================================ */

function selectChild(
  childId,
  shouldRender = true
) {
  const child = getChildById(childId);

  if (!child) {
    return;
  }

  const previousChildId =
    selectedChildId;

  const changed =
    previousChildId !== child.id;

  selectedChildId = child.id;

  saveSelectedChildId();

  if (changed) {
    /*
     * 先にイベントを発火。
     *
     * education.js はここで
     * 「前の子どもの学習記録を保存」
     * 「新しい子どもの学習記録をロード」
     * する。
     */
    dispatchChildChanged(
      child,
      previousChildId,
      "select"
    );
  }

  if (shouldRender) {
    renderAll();
  }
}


/* ============================================================
 * Market calculation
 * ============================================================ */

function getMarket(assetKey) {
  const asset = ASSETS[assetKey];

  if (
    !asset ||
    asset.type !== "index"
  ) {
    return null;
  }

  return (
    marketState?.markets?.[
      asset.marketKey
    ] || null
  );
}


function getLatestIndexValue(assetKey) {
  const market =
    getMarket(assetKey);

  if (
    !market ||
    !Array.isArray(market.series) ||
    !market.series.length
  ) {
    return null;
  }

  const latest =
    market.series[
      market.series.length - 1
    ];

  const value =
    Number(latest?.value);

  return value > 0
    ? value
    : null;
}


function getIndexValue(
  assetKey,
  date
) {
  const market =
    getMarket(assetKey);

  if (
    !market ||
    !Array.isArray(market.series) ||
    !market.series.length
  ) {
    return null;
  }

  let result = null;

  for (const item of market.series) {
    if (
      String(item.date) <=
      String(date)
    ) {
      const value =
        Number(item.value);

      if (value > 0) {
        result = value;
      }
    } else {
      break;
    }
  }

  return result;
}


function getIndexReturn(
  assetKey,
  date
) {
  if (!date) {
    return null;
  }

  const current =
    getLatestIndexValue(assetKey);

  const historical =
    getIndexValue(
      assetKey,
      date
    );

  if (
    !current ||
    !historical
  ) {
    return null;
  }

  return (
    (current / historical - 1) *
    100
  );
}


/* ============================================================
 * Investment calculation
 * ============================================================ */

function calculateInvestment(
  child,
  assetKey
) {
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

  const transactions =
    Array.isArray(child.transactions)
      ? [...child.transactions]
      : [];

  const investmentTransactions =
    transactions
      .filter(
        tx => tx.asset === assetKey
      )
      .sort(
        (a, b) =>
          String(a.date).localeCompare(
            String(b.date)
          )
      );

  for (
    const tx of investmentTransactions
  ) {
    const amount =
      Number(tx.amount) || 0;

    if (amount <= 0) {
      continue;
    }

    const index =
      getIndexValue(
        assetKey,
        tx.date
      );

    if (!index || index <= 0) {
      if (tx.type === "in") {
        result.principal += amount;
      } else {
        result.principal =
          Math.max(
            0,
            result.principal - amount
          );
      }

      continue;
    }

    if (tx.type === "out") {
      const sellUnits =
        amount / index;

      result.units =
        Math.max(
          0,
          result.units - sellUnits
        );

      result.principal =
        Math.max(
          0,
          result.principal - amount
        );

    } else {
      const buyUnits =
        amount / index;

      result.units += buyUnits;
      result.principal += amount;
    }
  }

  const latest =
    getLatestIndexValue(assetKey);

  result.latestIndex = latest;

  result.value =
    latest && latest > 0
      ? result.units * latest
      : result.principal;

  result.pnl =
    result.value -
    result.principal;

  result.transactions =
    investmentTransactions;

  return result;
}


/* ============================================================
 * Cash calculation
 * ============================================================ */

function calculateCash(child) {
  let balance = 0;

  if (!child) {
    return 0;
  }

  for (
    const tx of child.transactions || []
  ) {
    const amount =
      Number(tx.amount) || 0;

    if (tx.asset !== "cash") {
      continue;
    }

    if (tx.type === "out") {
      balance =
        Math.max(
          0,
          balance - amount
        );
    } else {
      balance += amount;
    }
  }

  return balance;
}


/* ============================================================
 * Child total
 * ============================================================ */

function calculateChild(child) {
  if (!child) {
    return {
      balances: {
        cash: 0,
        world: 0,
        sp: 0
      },

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

  for (
    const tx of child.transactions || []
  ) {
    const amount =
      Number(tx.amount) || 0;

    if (tx.type === "out") {
      totalOut += amount;
    } else {
      totalIn += amount;
    }
  }

  const cash =
    calculateCash(child);

  const world =
    calculateInvestment(
      child,
      "world"
    );

  const sp =
    calculateInvestment(
      child,
      "sp"
    );

  const investmentValue =
    world.value +
    sp.value;

  const principal =
    cash +
    world.principal +
    sp.principal;

  const total =
    cash +
    investmentValue;

  const pnl =
    investmentValue -
    world.principal -
    sp.principal;

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

    worldValue:
      world.value,

    spValue:
      sp.value,

    worldPrincipal:
      world.principal,

    spPrincipal:
      sp.principal,

    pnl
  };
}


/* ============================================================
 * Child selector rendering
 * ============================================================ */

function renderChildSelector() {
  const select = $("child");
  if (!select || !state || !Array.isArray(state.children)) return;

  if (!state.children.some(child => child.id === selectedChildId)) {
    selectedChildId = state.children[0]?.id || null;
    saveSelectedChildId();
  }

  select.innerHTML = "";

  for (const child of state.children) {
    const option = document.createElement("option");
    option.value = child.id;
    option.textContent = child.name;
    option.selected = child.id === selectedChildId;
    select.appendChild(option);
  }

  select.value = selectedChildId || "";

  const current = getCurrentChild();

  const selectedName = $("selectedChildName");
  if (selectedName) {
    selectedName.textContent = current?.name || "";
    selectedName.classList.add("selected-child");
  }

  /*
   * 編集・削除は専用領域に描画する。
   * selectと同じ行に追加しないため、
   * iPhoneでも「今の子ども」が十分な幅で表示される。
   */
  const actionContainer = $("childActions");
  const legacyParent = select.parentElement;

  if (actionContainer) {
    actionContainer.innerHTML = "";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary";
    editButton.dataset.childEdit = selectedChildId || "";
    editButton.textContent = kidMode ? "✏️ なまえを なおす" : "✏️ 名前を変更";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.dataset.childDelete = selectedChildId || "";
    deleteButton.textContent = kidMode ? "🗑️ けす" : "🗑️ 削除";

    actionContainer.appendChild(editButton);
    actionContainer.appendChild(deleteButton);
  } else if (legacyParent) {
    legacyParent.querySelectorAll("[data-child-edit], [data-child-delete]")
      .forEach(button => button.remove());

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary";
    editButton.dataset.childEdit = selectedChildId || "";
    editButton.textContent = kidMode ? "✏️ なまえ" : "✏️ 編集";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.dataset.childDelete = selectedChildId || "";
    deleteButton.textContent = kidMode ? "🗑️ けす" : "🗑️ 削除";

    legacyParent.appendChild(editButton);
    legacyParent.appendChild(deleteButton);
  }
}


/* ============================================================
 * Asset labels
 * ============================================================ */

function assetName(assetKey) {
  const asset =
    ASSETS[assetKey];

  if (!asset) {
    return assetKey;
  }

  return kidMode
    ? asset.kidName
    : asset.name;
}


/* ============================================================
 * Summary
 * ============================================================ */

function renderSummary() {
  const child =
    getCurrentChild();

  const result =
    calculateChild(child);

  if ($("total")) {
    $("total").textContent =
      yen(result.total);
  }

  if ($("cash")) {
    $("cash").textContent =
      yen(result.balances.cash);
  }

  if ($("invest")) {
    $("invest").textContent =
      yen(result.investmentValue);
  }

  if ($("ins")) {
    $("ins").textContent =
      yen(result.totalIn);
  }

  if ($("outs")) {
    $("outs").textContent =
      yen(result.totalOut);
  }

  if ($("pnl")) {
    $("pnl").textContent =
      signedYen(result.pnl);
  }


  if (kidMode) {
    if ($("totalL")) {
      $("totalL").textContent =
        "ぜんぶ";
    }

    if ($("cashL")) {
      $("cashL").textContent =
        "ためている";
    }

    if ($("investL")) {
      $("investL").textContent =
        "ふやしている";
    }

    if ($("note")) {
      $("note").textContent =
        "おかねの ぜんぶ";
    }

  } else {
    if ($("totalL")) {
      $("totalL").textContent =
        "総資産";
    }

    if ($("cashL")) {
      $("cashL").textContent =
        "貯金";
    }

    if ($("investL")) {
      $("investL").textContent =
        "投資";
    }

    if ($("note")) {
      $("note").textContent =
        "投資損益 " +
        signedYen(result.pnl);
    }
  }
}


/* ============================================================
 * Today's money
 * ============================================================ */

function getTodayTransactions(child) {
  if (!child) {
    return [];
  }

  const currentDate =
    today();

  return (
    child.transactions || []
  ).filter(
    tx =>
      String(tx.date) ===
      currentDate
  );
}


function calculateTodayMoney(child) {
  const transactions =
    getTodayTransactions(child);

  let income = 0;
  let outcome = 0;

  for (
    const tx of transactions
  ) {
    const amount =
      Number(tx.amount) || 0;

    if (tx.type === "out") {
      outcome += amount;
    } else {
      income += amount;
    }
  }

  return {
    income,
    outcome,
    net: income - outcome,
    count: transactions.length
  };
}


/*
 * 今日のお金表示。
 *
 * 重要：
 * #today が「タブ用panel」だった場合、
 * パネルそのものをinnerHTMLで上書きしない。
 *
 * その場合は内部の専用要素を探す。
 */
function renderTodayMoney() {
  const child = getCurrentChild();
  const result = calculateTodayMoney(child);

  /*
   * 今日のお金は専用コンテナだけを描画する。
   * #today のようなパネル自体を上書きしない。
   */
  const containers = [
    $("todayMoneyContent"),
    $("todayMoney"),
    $("today-money"),
    $("todayMoneyList"),
    $("todayList")
  ].filter(Boolean);

  const unique = [...new Set(containers)];

  if (!unique.length) return;

  const childName = child?.name || "";

  if ($("todayMoneyLabel")) {
    $("todayMoneyLabel").textContent = kidMode ? "きょう" : "今日";
  }
  if ($("todayMoneyTitle")) {
    $("todayMoneyTitle").textContent = kidMode
      ? "💰 きょうの おかね"
      : "💰 今日のお金";
  }

  const html = `
    <div class="today-money-header">
      <div>
        <small>${kidMode ? "いまの おともだち" : "現在の対象"}</small>
        <strong>${escapeHtml(childName)}</strong>
      </div>
      <span class="today-money-icon">💰</span>
    </div>

    <div class="today-money-grid">
      <div class="card">
        <div class="meta">${kidMode ? "はいった おかね" : "今日の入金"}</div>
        <div class="value">${yen(result.income)}</div>
      </div>

      <div class="card">
        <div class="meta">${kidMode ? "つかった おかね" : "今日の出金"}</div>
        <div class="value">${yen(result.outcome)}</div>
      </div>

      <div class="card">
        <div class="meta">${kidMode ? "きょうの さ" : "今日の差額"}</div>
        <div class="value">${signedYen(result.net)}</div>
      </div>
    </div>

    <p class="muted today-money-message">
      ${
        result.count === 0
          ? (kidMode
              ? "きょうの おかねの きろくは まだ ないよ。"
              : "今日のお金の記録はありません。")
          : (kidMode
              ? `きょうは ${result.count}けんの きろくが あるよ。`
              : `今日は${result.count}件の記録があります。`)
      }
    </p>
  `;

  unique.forEach(container => {
    container.innerHTML = html;
  });
}

/* ============================================================
 * Assets
 * ============================================================ */

function renderAssets() {
  const child =
    getCurrentChild();

  const result =
    calculateChild(child);

  const container =
    $("assets");

  if (!container) {
    return;
  }

  container.innerHTML = "";


  for (
    const [key, asset] of
    Object.entries(ASSETS)
  ) {

    let value = 0;
    let principal = 0;

    if (key === "cash") {
      value =
        result.balances.cash;

    } else if (key === "world") {
      value =
        result.worldValue;

      principal =
        result.worldPrincipal;

    } else if (key === "sp") {
      value =
        result.spValue;

      principal =
        result.spPrincipal;
    }


    const card =
      document.createElement(
        "article"
      );

    card.className =
      "asset";


    const riskText =
      kidMode
        ? (
            asset.risk === "小"
              ? "へりにくい"
              : "へることもある"
          )
        : "リスク：" +
          asset.risk;


    let meta = "";


    if (key === "cash") {

      meta =
        kidMode
          ? "いま ためている おかね"
          : "現在残高";

    } else {

      const pnl =
        value - principal;

      const indexReturn =
        getIndexReturn(
          key,
          getLatestInvestmentDate(
            child,
            key
          )
        );


      meta =
        kidMode
          ? (
              "いれた おかね " +
              yen(principal) +
              " · " +
              (
                pnl >= 0
                  ? "ふえた "
                  : "へった "
              ) +
              yen(
                Math.abs(pnl)
              )
            )
          : (
              "元本 " +
              yen(principal) +
              " · 損益 " +
              signedYen(pnl)
            );


      if (
        indexReturn !== null &&
        Number.isFinite(indexReturn)
      ) {

        meta +=
          kidMode
            ? (
                " · いままで " +
                percent(indexReturn)
              )
            : (
                " · 指数 " +
                percent(indexReturn)
              );
      }
    }


    card.innerHTML = `
      <div class="asset-top">
        <span class="asset-icon">
          ${asset.icon}
        </span>

        <span class="meta">
          ${escapeHtml(riskText)}
        </span>
      </div>

      <h3>
        ${escapeHtml(
          assetName(key)
        )}
      </h3>

      <div class="value">
        ${yen(value)}
      </div>

      <div class="meta">
        ${escapeHtml(meta)}
      </div>
    `;

    container.appendChild(card);
  }
}


/* ============================================================
 * Latest investment date
 * ============================================================ */

function getLatestInvestmentDate(
  child,
  assetKey
) {
  if (!child) {
    return today();
  }

  const dates =
    (child.transactions || [])
      .filter(
        tx =>
          tx.asset === assetKey &&
          tx.type === "in"
      )
      .map(
        tx => String(tx.date)
      )
      .sort();

  return (
    dates[dates.length - 1] ||
    today()
  );
}


/* ============================================================
 * Asset filter
 * ============================================================ */

function renderAssetFilter() {
  const select =
    $("af");

  if (!select) {
    return;
  }

  const current =
    select.value || "all";

  select.innerHTML = "";


  const all =
    document.createElement(
      "option"
    );

  all.value = "all";

  all.textContent =
    kidMode
      ? "ぜんぶ"
      : "すべて";

  select.appendChild(all);


  for (
    const [key, asset] of
    Object.entries(ASSETS)
  ) {

    const option =
      document.createElement(
        "option"
      );

    option.value = key;

    option.textContent =
      asset.icon +
      " " +
      assetName(key);

    select.appendChild(option);
  }


  if (
    Array.from(
      select.options
    ).some(
      option =>
        option.value === current
    )
  ) {
    select.value =
      current;
  }
}


/* ============================================================
 * Transactions
 * ============================================================ */

function renderTransactions() {
  const child =
    getCurrentChild();

  const container =
    $("txs");

  if (!container) {
    return;
  }

  const typeFilter =
    $("tf")?.value || "all";

  const assetFilter =
    $("af")?.value || "all";

  let transactions =
    [...(child?.transactions || [])];


  if (
    typeFilter !== "all"
  ) {
    transactions =
      transactions.filter(
        tx =>
          tx.type === typeFilter
      );
  }


  if (
    assetFilter !== "all"
  ) {
    transactions =
      transactions.filter(
        tx =>
          tx.asset ===
          assetFilter
      );
  }


  transactions.sort(
    (a, b) =>
      String(b.date).localeCompare(
        String(a.date)
      )
  );


  if (!transactions.length) {

    container.innerHTML = `
      <div class="card muted">
        ${
          kidMode
            ? "まだ きろくが ないよ。"
            : "取引履歴がありません。"
        }
      </div>
    `;

    return;
  }


  container.innerHTML = "";


  for (
    const tx of transactions
  ) {

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "card";


    const sign =
      tx.type === "in"
        ? "＋"
        : "−";


    const marketIndex =
      (
        tx.asset === "world" ||
        tx.asset === "sp"
      )
        ? getIndexValue(
            tx.asset,
            tx.date
          )
        : null;


    let indexInfo = "";


    if (marketIndex) {

      indexInfo = `
        <div class="meta">
          ${
            kidMode
              ? (
                  tx.type === "in"
                    ? "いれた とき"
                    : "つかった とき"
                )
              : (
                  tx.type === "in"
                    ? "入金時"
                    : "出金時"
                )
          }

          ${
            kidMode
              ? "の しすう"
              : "の指数"
          }：

          ${marketIndex.toLocaleString()}
        </div>
      `;
    }


    card.innerHTML = `
      <div class="section-header">

        <strong>
          ${escapeHtml(tx.date)}
          ·
          ${sign}${yen(tx.amount)}
        </strong>

        <div class="button-group">

          <button
            type="button"
            class="secondary"
            data-tx-edit="${escapeHtml(tx.id)}"
          >
            ${
              kidMode
                ? "✏️ なおす"
                : "✏️ 編集"
            }
          </button>

          <button
            type="button"
            class="secondary"
            data-tx-delete="${escapeHtml(tx.id)}"
          >
            ${
              kidMode
                ? "🗑️ けす"
                : "🗑️ 削除"
            }
          </button>

        </div>
      </div>

      <div>
        ${escapeHtml(tx.reason || "")}
        ·
        ${ASSETS[tx.asset]?.icon || "💰"}
        ${escapeHtml(
          assetName(tx.asset)
        )}
      </div>

      ${indexInfo}

      ${
        tx.memo
          ? `
            <div class="meta">
              ${escapeHtml(tx.memo)}
            </div>
          `
          : ""
      }
    `;

    container.appendChild(card);
  }
}


/* ============================================================
 * Market rendering
 * ============================================================ */

function renderMarket() {
  const container =
    $("market");

  if (!container) {
    return;
  }

  container.innerHTML = "";


  const markets = [
    {
      key: "world",
      icon: "🌎",
      name:
        kidMode
          ? "せかいの かぶ"
          : "全世界株式"
    },

    {
      key: "sp",
      icon: "🇺🇸",
      name:
        kidMode
          ? "アメリカの かぶ"
          : "S&P500"
    }
  ];


  for (
    const item of markets
  ) {

    const data =
      marketState?.markets?.[
        item.key
      ];


    const card =
      document.createElement(
        "div"
      );

    card.className =
      "market";


    if (
      !data ||
      !Array.isArray(
        data.series
      ) ||
      !data.series.length
    ) {

      card.innerHTML = `
        <div class="market-head">

          <span>
            ${item.icon}
            ${item.name}
          </span>

          <span class="muted">
            ${
              kidMode
                ? "まだ ないよ"
                : "データなし"
            }
          </span>

        </div>

        <div class="price">
          -
        </div>
      `;

    } else {

      const latest =
        data.series[
          data.series.length - 1
        ];

      const value =
        Number(latest.value);

      const change =
        Number(data.change) || 0;


      card.innerHTML = `
        <div class="market-head">

          <span>
            ${item.icon}
            ${item.name}
          </span>

          <span
            class="${
              change >= 0
                ? "up"
                : "down"
            }"
          >
            ${percent(change)}
          </span>

        </div>

        <div class="price">
          ${
            value.toLocaleString(
              "ja-JP",
              {
                maximumFractionDigits: 2
              }
            )
          }
        </div>

        <div class="meta">
          ${escapeHtml(latest.date)}
        </div>
      `;
    }


    container.appendChild(card);
  }


  const status =
    $("marketStatus");

  if (!status) {
    return;
  }


  if (
    marketState.source ===
    "github"
  ) {

    status.textContent =
      kidMode
        ? "しすうの データを よみこんだよ。"
        : "指数データを GitHub から読み込みました。";

  } else if (
    marketState.source ===
    "cache"
  ) {

    status.textContent =
      kidMode
        ? "まえの しすうを つかっているよ。"
        : "保存していた指数データを表示しています。";

  } else {

    status.textContent =
      kidMode
        ? "「こうしん」で しすうを みられるよ。"
        : "「更新」を押すと指数データを確認できます。";
  }
}


/* ============================================================
 * Market fetch
 * ============================================================ */

async function fetchMarketData() {
  const status =
    $("marketStatus");


  if (status) {
    status.textContent =
      kidMode
        ? "しすうを みているよ…"
        : "指数を確認しています…";
  }


  try {

    const response =
      await fetch(
        MARKET_DATA_URL +
        "?t=" +
        Date.now(),
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {
      throw new Error(
        "market.json response error"
      );
    }


    const data =
      await response.json();


    validateMarketData(data);


    marketState = {
      ...data,
      source: "github"
    };


    saveMarket();


    renderAll();


    /*
     * education.js の
     * 今日のお金・市場画面にも
     * 更新を通知。
     */
    window.dispatchEvent(
      new CustomEvent(
        "kidsMoneyMarketChanged",
        {
          detail: {
            marketState
          }
        }
      )
    );


  } catch (error) {

    console.warn(
      "指数取得失敗:",
      error
    );


    const cached =
      loadMarket();


    if (
      cached &&
      cached.markets
    ) {

      marketState = {
        ...cached,
        source: "cache"
      };

    } else {

      marketState =
        emptyMarketState();
    }


    /*
     * market fetch が失敗しても
     * 画面は必ず描画する。
     *
     * 「読み込み中」で止めない。
     */
    renderAll();


    if (status) {

      status.textContent =
        kidMode
          ? (
              "あたらしい しすうが みられないので、" +
              "まえの データを つかっているよ。"
            )
          : (
              "最新の指数を取得できませんでした。" +
              "保存済みデータを使います。"
            );
    }


    window.dispatchEvent(
      new CustomEvent(
        "kidsMoneyMarketChanged",
        {
          detail: {
            marketState,
            error: true
          }
        }
      )
    );
  }
}


/* ============================================================
 * Market validation
 * ============================================================ */

function validateMarketData(data) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new Error(
      "invalid market data"
    );
  }


  if (
    !data.markets ||
    typeof data.markets !== "object"
  ) {
    throw new Error(
      "markets not found"
    );
  }


  for (
    const key of [
      "world",
      "sp"
    ]
  ) {

    const market =
      data.markets[key];


    if (!market) {
      throw new Error(
        key +
        " market not found"
      );
    }


    if (
      !Array.isArray(
        market.series
      ) ||
      !market.series.length
    ) {
      throw new Error(
        key +
        " series not found"
      );
    }
  }
}


/* ============================================================
 * Goals
 * ============================================================ */

function renderGoals() {
  const child =
    getCurrentChild();

  const container =
    $("goalsList");

  if (!container) {
    return;
  }

  container.innerHTML = "";


  const goals =
    child?.goals || [];


  if (!goals.length) {

    container.innerHTML = `
      <div class="card muted">
        ${
          kidMode
            ? "まだ めあてが ないよ。"
            : "目標がありません。"
        }
      </div>
    `;

    return;
  }


  const current =
    calculateChild(child);

  const totalSaved =
    current.total;


  for (
    const goal of goals
  ) {

    const amount =
      Number(goal.amount) || 0;

    const manualSaved =
      Number(goal.saved) || 0;

    const saved =
      manualSaved > 0
        ? manualSaved
        : totalSaved;


    const percentValue =
      amount > 0
        ? Math.min(
            100,
            Math.round(
              (saved / amount) *
              100
            )
          )
        : 0;


    const div =
      document.createElement(
        "div"
      );

    div.className =
      "goal";


    div.innerHTML = `
      <h3>
        ${escapeHtml(goal.name)}
      </h3>

      <div class="goal-meta">
        <span>
          ${yen(saved)}
          /
          ${yen(amount)}
        </span>

        <span>
          ${escapeHtml(goal.date)}
        </span>
      </div>

      <div class="goal-bar">
        <span
          style="width:${percentValue}%"
        ></span>
      </div>

      <div class="goal-meta">
        <span>
          ${percentValue}%
        </span>

        <span>
          あと
          ${yen(
            Math.max(
              0,
              amount - saved
            )
          )}
        </span>
      </div>
    `;


    container.appendChild(div);
  }
}


/* ============================================================
 * Chart
 * ============================================================ */

function drawChart() {
  const canvas =
    $("chart");

  if (!canvas) {
    return;
  }


  const context =
    canvas.getContext("2d");

  if (!context) {
    return;
  }


  const width =
    canvas.clientWidth || 600;

  const height = 220;

  const ratio =
    window.devicePixelRatio || 1;


  canvas.width =
    width * ratio;

  canvas.height =
    height * ratio;


  context.setTransform(
    ratio,
    0,
    0,
    ratio,
    0,
    0
  );


  context.clearRect(
    0,
    0,
    width,
    height
  );


  const child =
    getCurrentChild();


  if (
    !child ||
    !child.transactions?.length
  ) {

    context.fillStyle =
      "#687386";

    context.font =
      "13px sans-serif";


    context.fillText(
      kidMode
        ? "おかねを いれると うごきが みえるよ"
        : "入金・出金を登録するとグラフが表示されます。",
      15,
      35
    );

    return;
  }


  const transactions =
    [...child.transactions]
      .sort(
        (a, b) =>
          String(a.date).localeCompare(
            String(b.date)
          )
      );


  let balance = 0;

  const points = [];


  for (
    const tx of transactions
  ) {

    const amount =
      Number(tx.amount) || 0;


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


  const max =
    Math.max(
      ...points,
      1
    );

  const min =
    Math.min(
      ...points,
      0
    );


  const left = 30;
  const right =
    width - 15;

  const top = 20;
  const bottom =
    height - 25;


  context.strokeStyle =
    "#315efb";

  context.lineWidth = 3;

  context.beginPath();


  points.forEach(
    (value, index) => {

      const x =
        left +
        (
          index /
          Math.max(
            1,
            points.length - 1
          )
        ) *
        (
          right - left
        );


      const normalized =
        max === min
          ? 0.5
          : (
              (value - min) /
              (max - min)
            );


      const y =
        bottom -
        normalized *
        (bottom - top);


      if (index === 0) {
        context.moveTo(
          x,
          y
        );
      } else {
        context.lineTo(
          x,
          y
        );
      }
    }
  );


  context.stroke();


  context.fillStyle =
    "#687386";

  context.font =
    "11px sans-serif";


  context.fillText(
    yen(
      points[
        points.length - 1
      ]
    ),
    left,
    15
  );
}


/* ============================================================
 * Render all
 * ============================================================ */

function renderAll() {
  try {

    if (
      state?.children?.length &&
      !state.children.some(
        child =>
          child.id ===
          selectedChildId
      )
    ) {

      selectedChildId =
        state.children[0].id;

      saveSelectedChildId();
    }


    renderChildSelector();

    renderSummary();

    renderAssets();

    renderAssetFilter();

    renderTransactions();

    renderMarket();

    renderGoals();

    renderTodayMoney();

    drawChart();

    updateCrash();


    /*
     * 他ファイルへの描画通知。
     *
     * education.js / learn.js が
     * 現在の子どもを再描画できる。
     */
    window.dispatchEvent(
      new CustomEvent(
        "kidsMoneyRendered",
        {
          detail: {
            childId:
              selectedChildId,

            child:
              getCurrentChild(),

            kidMode
          }
        }
      )
    );

  } catch (error) {

    console.error(error);

    showError(
      kidMode
        ? "ひょうじで エラーが おきました。"
        : "画面の表示中にエラーが発生しました。"
    );
  }
}


/* ============================================================
 * Child modal
 * ============================================================ */

function openChildModal(
  childId = null
) {
  editingChildId =
    childId;


  const modal =
    $("childModal");

  if (!modal) {
    return;
  }


  const title =
    modal.querySelector("h2");


  const submit =
    $("childForm")
      ?.querySelector(
        'button[type="submit"]'
      );


  if (childId) {

    const child =
      getChildById(childId);

    if (!child) {
      return;
    }


    if ($("childName")) {
      $("childName").value =
        child.name || "";
    }


    if ($("birth")) {
      $("birth").value =
        child.birthYear ?? "";
    }


    if (title) {
      title.textContent =
        kidMode
          ? "こどもを へんこう"
          : "子どもを編集";
    }


    if (submit) {
      submit.textContent =
        kidMode
          ? "ほぞん"
          : "変更を保存";
    }

  } else {

    if ($("childName")) {
      $("childName").value =
        "";
    }


    if ($("birth")) {
      $("birth").value =
        "";
    }


    if (title) {
      title.textContent =
        kidMode
          ? "こどもを ついか"
          : "子どもを追加";
    }


    if (submit) {
      submit.textContent =
        kidMode
          ? "ついか"
          : "追加";
    }
  }


  modal.classList.remove(
    "hidden"
  );
}


/* ============================================================
 * Child submit
 * ============================================================ */

function handleChildSubmit(
  event
) {
  event.preventDefault();


  const name =
    $("childName")
      ?.value
      ?.trim();


  const birthValue =
    $("birth")?.value;


  const birthYear =
    Number(birthValue);


  if (!name) {

    alert(
      kidMode
        ? "なまえを いれてね。"
        : "名前を入力してください。"
    );

    return;
  }


  if (
    birthValue === "" ||
    !Number.isFinite(
      birthYear
    )
  ) {

    alert(
      kidMode
        ? "うまれた としを いれてね。"
        : "生まれた年を入力してください。"
    );

    return;
  }


  if (editingChildId) {

    const child =
      getChildById(
        editingChildId
      );


    if (!child) {

      alert(
        kidMode
          ? "こどもの データが みつからないよ。"
          : "子どものデータが見つかりません。"
      );

      return;
    }


    child.name =
      name;

    child.birthYear =
      birthYear;


  } else {

    const child = {
      id: createId(),
      name,
      birthYear,
      transactions: [],
      goals: [],
      learning: {}
    };


    const previousChildId =
      selectedChildId;


    state.children.push(
      child
    );


    selectedChildId =
      child.id;


    saveSelectedChildId();


    /*
     * 新しい子どもを選択したことを
     * education.js に通知。
     */
    dispatchChildChanged(
      child,
      previousChildId,
      "add"
    );
  }


  saveState();


  closeModal(
    "childModal"
  );


  editingChildId =
    null;


  if (
    event.target &&
    typeof event.target.reset ===
      "function"
  ) {
    event.target.reset();
  }


  renderAll();
}


/* ============================================================
 * Delete child
 * ============================================================ */

function deleteChild(
  childId
) {
  const child =
    getChildById(childId);

  if (!child) {
    return;
  }


  if (
    state.children.length <= 1
  ) {

    alert(
      kidMode
        ? "こどもが ひとりだけのときは けせないよ。"
        : "子どもが1人だけのときは削除できません。"
    );

    return;
  }


  const transactionCount =
    Array.isArray(
      child.transactions
    )
      ? child.transactions.length
      : 0;


  const goalCount =
    Array.isArray(
      child.goals
    )
      ? child.goals.length
      : 0;


  const message =
    (
      transactionCount ||
      goalCount
    )
      ? (
          `${child.name} のデータをすべて削除します。\n\n` +
          `お金の記録：${transactionCount}件\n` +
          `目標：${goalCount}件\n\n` +
          `この操作は元に戻せません。`
        )
      : (
          `${child.name} を削除します。\n\n` +
          `この操作は元に戻せません。`
        );


  if (
    !confirm(
      kidMode
        ? `${child.name} を けしていい？`
        : message
    )
  ) {
    return;
  }


  const index =
    state.children.findIndex(
      item =>
        item.id === childId
    );


  if (index < 0) {
    return;
  }


  const previousChildId =
    selectedChildId;


  state.children.splice(
    index,
    1
  );


  /*
   * 削除した子どもが
   * 現在選択中だった場合、
   * 次の子どもへ切り替える。
   */
  if (
    selectedChildId ===
    childId
  ) {

    const newChild =
      state.children[
        Math.max(
          0,
          index - 1
        )
      ] ||
      state.children[0] ||
      null;


    selectedChildId =
      newChild?.id || null;


    saveSelectedChildId();


    dispatchChildChanged(
      newChild,
      previousChildId,
      "delete"
    );
  }


  saveState();

  renderAll();
}


/* ============================================================
 * Transaction modal
 * ============================================================ */

function openTransactionModal(
  type,
  transactionId = null
) {
  const child =
    getCurrentChild();

  if (!child) {
    return;
  }


  const isEditing =
    Boolean(transactionId);


  if (!isEditing) {

    editingTransactionId =
      null;


    if ($("txType")) {
      $("txType").value =
        type;
    }


    if ($("txTitle")) {
      $("txTitle").textContent =
        kidMode
          ? (
              type === "in"
                ? "おかねを いれる"
                : "おかねを つかう"
            )
          : (
              type === "in"
                ? "入金を追加"
                : "出金を追加"
            );
    }


    if ($("date")) {
      $("date").value =
        today();
    }


    if ($("amount")) {
      $("amount").value =
        "";
    }


    if ($("reason")) {
      $("reason").selectedIndex =
        0;
    }


    if ($("memo")) {
      $("memo").value =
        "";
    }


  } else {

    const tx =
      child.transactions?.find(
        item =>
          item.id ===
          transactionId
      );


    if (!tx) {
      return;
    }


    editingTransactionId =
      transactionId;


    if ($("txType")) {
      $("txType").value =
        tx.type;
    }


    if ($("txTitle")) {
      $("txTitle").textContent =
        kidMode
          ? "おかねを へんこう"
          : (
              tx.type === "in"
                ? "入金を編集"
                : "出金を編集"
            );
    }


    if ($("date")) {
      $("date").value =
        tx.date ||
        today();
    }


    if ($("amount")) {
      $("amount").value =
        tx.amount ?? "";
    }


    if ($("reason")) {
      $("reason").value =
        tx.reason || "";
    }


    if ($("memo")) {
      $("memo").value =
        tx.memo || "";
    }
  }


  const assetSelect =
    $("asset");


  if (assetSelect) {

    const currentAsset =
      isEditing
        ? child.transactions?.find(
            tx =>
              tx.id ===
              transactionId
          )?.asset
        : "cash";


    assetSelect.innerHTML =
      "";


    for (
      const [key, asset] of
      Object.entries(ASSETS)
    ) {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        key;


      option.textContent =
        asset.icon +
        " " +
        assetName(key);


      if (
        key === currentAsset
      ) {
        option.selected =
          true;
      }


      assetSelect.appendChild(
        option
      );
    }
  }


  const submit =
    $("txForm")
      ?.querySelector(
        'button[type="submit"]'
      );


  if (submit) {

    submit.textContent =
      isEditing
        ? (
            kidMode
              ? "ほぞん"
              : "変更を保存"
          )
        : (
            kidMode
              ? "きろくする"
              : "記録する"
          );
  }


  $("txModal")
    ?.classList.remove(
      "hidden"
    );
}


/* ============================================================
 * Transaction submit
 * ============================================================ */

function handleTransactionSubmit(
  event
) {
  event.preventDefault();


  const child =
    getCurrentChild();

  if (!child) {
    return;
  }


  const type =
    $("txType")?.value ||
    "in";


  const amount =
    Number(
      $("amount")?.value
    );


  const asset =
    $("asset")?.value ||
    "cash";


  const date =
    $("date")?.value ||
    today();


  const reason =
    $("reason")?.value ||
    "";


  const memo =
    $("memo")
      ?.value
      ?.trim() ||
    "";


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    alert(
      kidMode
        ? "いくらか いれてね。"
        : "金額を入力してください。"
    );

    return;
  }


  if (!ASSETS[asset]) {

    alert(
      kidMode
        ? "おかねの しゅるいを かくにんしてね。"
        : "資産の種類を確認してください。"
    );

    return;
  }


  let editingTx = null;
  let editingIndex = -1;


  if (editingTransactionId) {

    editingIndex =
      child.transactions.findIndex(
        tx =>
          tx.id ===
          editingTransactionId
      );


    if (editingIndex >= 0) {

      editingTx =
        child.transactions[
          editingIndex
        ];
    }
  }


  /*
   * 編集中は一旦除外して
   * 残高を正しく再計算。
   */
  if (editingIndex >= 0) {
    child.transactions.splice(
      editingIndex,
      1
    );
  }


  if (type === "out") {

    const current =
      calculateChild(child);


    const available =
      current.balances[
        asset
      ] || 0;


    if (
      amount >
      available + 0.0001
    ) {

      if (editingTx) {

        child.transactions.splice(
          editingIndex,
          0,
          editingTx
        );
      }


      alert(
        kidMode
          ? (
              "のこっている おかねより おおきいよ。\n\n" +
              "のこり：" +
              yen(available)
            )
          : (
              "残高を超える出金はできません。\n\n" +
              "残高：" +
              yen(available)
            )
      );

      return;
    }
  }


  let indexAtTransaction =
    null;


  if (
    asset === "world" ||
    asset === "sp"
  ) {

    indexAtTransaction =
      getIndexValue(
        asset,
        date
      );
  }


  const tx = {
    id:
      editingTx?.id ||
      createId(),

    type,
    date,
    amount,
    reason,
    asset,
    memo,
    indexAtTransaction,

    createdAt:
      editingTx?.createdAt ||
      new Date().toISOString()
  };


  if (
    editingIndex >= 0
  ) {

    child.transactions.splice(
      editingIndex,
      0,
      tx
    );

  } else {

    child.transactions.push(
      tx
    );
  }


  saveState();


  closeModal(
    "txModal"
  );


  editingTransactionId =
    null;


  if (
    event.target &&
    typeof event.target.reset ===
      "function"
  ) {
    event.target.reset();
  }


  renderAll();
}


/* ============================================================
 * Transaction edit/delete
 * ============================================================ */

function editTransaction(
  transactionId
) {
  openTransactionModal(
    "edit",
    transactionId
  );
}


function deleteTransaction(
  transactionId
) {
  const child =
    getCurrentChild();

  if (!child) {
    return;
  }


  const index =
    child.transactions.findIndex(
      tx =>
        tx.id ===
        transactionId
    );


  if (index < 0) {
    return;
  }


  const tx =
    child.transactions[
      index
    ];


  const label =
    tx.type === "in"
      ? "入金"
      : "出金";


  if (
    !confirm(
      kidMode
        ? (
            `${label} ${yen(tx.amount)} の きろくを けしていい？`
          )
        : (
            `${label} ${yen(tx.amount)} の記録を削除しますか？\n\n` +
            `${tx.date}\n` +
            `${tx.reason || ""}`
          )
    )
  ) {
    return;
  }


  child.transactions.splice(
    index,
    1
  );


  saveState();

  renderAll();
}


/* ============================================================
 * Modal
 * ============================================================ */

function closeModal(id) {
  const modal =
    $(id);

  if (modal) {
    modal.classList.add(
      "hidden"
    );
  }


  if (
    id === "childModal"
  ) {
    editingChildId =
      null;
  }


  if (
    id === "txModal"
  ) {
    editingTransactionId =
      null;
  }
}


/* ============================================================
 * Goals
 * ============================================================ */

function handleGoalSubmit(
  event
) {
  event.preventDefault();


  const child =
    getCurrentChild();

  if (!child) {
    return;
  }


  const name =
    $("goalName")
      ?.value
      .trim();


  const amount =
    Number(
      $("goalAmount")?.value
    );


  const date =
    $("goalDate")?.value;


  const saved =
    Number(
      $("goalSaved")?.value
    ) || 0;


  if (
    !name ||
    amount <= 0 ||
    !date
  ) {

    alert(
      kidMode
        ? "めあてを いれてね。"
        : "目標を入力してください。"
    );

    return;
  }


  if (
    !Array.isArray(
      child.goals
    )
  ) {
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


  closeModal(
    "goalModal"
  );


  if (
    event.target &&
    typeof event.target.reset ===
      "function"
  ) {
    event.target.reset();
  }


  renderAll();
}


/* ============================================================
 * Future simulation
 * ============================================================ */

function simulateFuture() {
  const child =
    getCurrentChild();

  const current =
    calculateChild(child);


  const annual =
    Math.max(
      0,
      Number(
        $("annual")?.value
      ) || 0
    );


  const years =
    Math.max(
      1,
      Number(
        $("years")?.value
      ) || 1
    );


  const saveRatio =
    Number(
      $("saveRatio")?.value ||
      50
    ) / 100;


  const investRatio =
    1 - saveRatio;


  const cashRate =
    ASSETS.cash.fixedRate;


  const investRate =
    ASSETS.world.fixedRate;


  const initialCash =
    current.balances.cash;


  const initialInvest =
    current.investmentValue;


  function futureValue(
    principal,
    annualAmount,
    rate,
    period
  ) {

    if (rate === 0) {
      return (
        principal +
        annualAmount *
        period
      );
    }


    return (
      principal *
      Math.pow(
        1 + rate,
        period
      ) +
      annualAmount *
      (
        Math.pow(
          1 + rate,
          period
        ) - 1
      ) /
      rate
    );
  }


  const futureCash =
    futureValue(
      initialCash,
      annual * saveRatio,
      cashRate,
      years
    );


  const futureInvest =
    futureValue(
      initialInvest,
      annual * investRatio,
      investRate,
      years
    );


  const total =
    futureCash +
    futureInvest;


  const resultEl =
    $("result");


  if (resultEl) {

    resultEl.innerHTML = `
      <div class="card">

        <h3>
          ${
            kidMode
              ? "かんがえてみよう"
              : "シミュレーション結果"
          }
        </h3>

        <div class="value">
          ${yen(total)}
        </div>

        <p class="muted">
          ${years}ねん後 ·
          ためる
          ${Math.round(
            saveRatio * 100
          )}%
          /
          ふやす
          ${Math.round(
            investRatio * 100
          )}%
        </p>

        <p>
          ${
            kidMode
              ? "これは よそうの けいさんだよ。とうしは ふえることも へることも あるよ。"
              : "これは予想計算です。投資では元本割れする可能性があります。"
          }
        </p>

      </div>
    `;
  }
}


/* ============================================================
 * Ratio
 * ============================================================ */

function updateRatioFromSave() {
  const save =
    Number(
      $("saveRatio")?.value ||
      50
    );


  const invest =
    100 - save;


  if ($("investRatio")) {
    $("investRatio").value =
      invest;
  }


  if ($("sr")) {
    $("sr").textContent =
      save + "%";
  }


  if ($("ir")) {
    $("ir").textContent =
      invest + "%";
  }
}


function updateRatioFromInvest() {
  const invest =
    Number(
      $("investRatio")?.value ||
      50
    );


  const save =
    100 - invest;


  if ($("saveRatio")) {
    $("saveRatio").value =
      save;
  }


  if ($("sr")) {
    $("sr").textContent =
      save + "%";
  }


  if ($("ir")) {
    $("ir").textContent =
      invest + "%";
  }
}


/* ============================================================
 * Crash simulation
 * ============================================================ */

function updateCrash() {
  const child =
    getCurrentChild();

  const result =
    calculateChild(child);


  const crash =
    Number(
      $("crash")?.value
    ) || 0;


  const loss =
    (
      result.investmentValue *
      crash
    ) / 100;


  const after =
    result.total -
    loss;


  if ($("crashL")) {
    $("crashL").textContent =
      "-" +
      crash +
      "%";
  }


  const crashBox =
    $("crashBox");


  if (crashBox) {

    crashBox.innerHTML = `
      <div>
        ${
          kidMode
            ? "とうしが へると…"
            : "投資部分が下落すると…"
        }
      </div>

      <strong>
        ${yen(after)}
      </strong>

      <div class="muted">
        ${
          kidMode
            ? "いまより "
            : "現在より "
        }

        ${yen(loss)}

        ${
          kidMode
            ? " へるよ。"
            : " 減少します。"
        }
      </div>
    `;
  }
}


/* ============================================================
 * Export
 * ============================================================ */

function exportData() {
  const payload = {
    version:
      APP_VERSION,

    exportedAt:
      new Date().toISOString(),

    children:
      state.children
  };


  const blob =
    new Blob(
      [
        JSON.stringify(
          payload,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const anchor =
    document.createElement(
      "a"
    );


  anchor.href =
    url;

  anchor.download =
    "kids-money-v26.json";


  anchor.click();


  URL.revokeObjectURL(
    url
  );
}


/* ============================================================
 * Import
 * ============================================================ */

function importData(event) {
  const file =
    event.target.files?.[0];

  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload = () => {

    try {

      const parsed =
        JSON.parse(
          reader.result
        );


      if (
        !parsed ||
        !Array.isArray(
          parsed.children
        )
      ) {
        throw new Error(
          "invalid"
        );
      }


      state = {
        version:
          APP_VERSION,

        children:
          parsed.children.map(
            normalizeChild
          )
      };


      if (!state.children.length) {
        state =
          createDefaultState();
      }


      selectedChildId =
        state.children[0]?.id ||
        null;


      saveSelectedChildId();

      saveState();


      closeModal(
        "settingsModal"
      );


      renderAll();


      dispatchChildChanged(
        getCurrentChild(),
        null,
        "import"
      );


      alert(
        kidMode
          ? "データを よみこんだよ。"
          : "データを読み込みました。"
      );


    } catch (error) {

      console.error(error);


      alert(
        kidMode
          ? "JSONが ただしくないよ。"
          : "JSONが正しくありません。"
      );
    }
  };


  reader.readAsText(file);
}


/* ============================================================
 * Reset
 * ============================================================ */

function resetData() {
  if (
    !confirm(
      kidMode
        ? "データを ぜんぶ けしていい？"
        : "データをすべて削除してよいですか？"
    )
  ) {
    return;
  }


  const previousChildId =
    selectedChildId;


  localStorage.removeItem(
    STORAGE_KEY
  );


  state =
    createDefaultState();


  selectedChildId =
    state.children[0].id;


  saveSelectedChildId();


  editingChildId =
    null;


  editingTransactionId =
    null;


  saveState();

  renderAll();


  dispatchChildChanged(
    getCurrentChild(),
    previousChildId,
    "reset"
  );
}


/* ============================================================
 * Today's money tab
 * ============================================================ */

function resolveTodayMoneyTab() {
  const candidates = [
    "todayMoney",
    "today",
    "today-money",
    "todayMoneyPanel"
  ];


  for (
    const id of candidates
  ) {

    if (
      document.getElementById(id)
    ) {
      return id;
    }
  }


  const links =
    Array.from(
      document.querySelectorAll(
        "[data-tab]"
      )
    );


  for (
    const link of links
  ) {

    const value =
      link.dataset.tab;


    if (
      value &&
      /today|money/i.test(
        value
      ) &&
      document.getElementById(
        value
      )
    ) {
      return value;
    }
  }


  return null;
}


/* ============================================================
 * Tabs
 * ============================================================ */

function switchTab(
  tabName
) {
  if (!tabName) {
    return;
  }


  if (
    /^(today-money|todaymoney|today_money)$/i.test(
      tabName
    )
  ) {

    const resolved =
      resolveTodayMoneyTab();

    if (resolved) {
      tabName =
        resolved;
    }
  }


  const panel =
    document.getElementById(
      tabName
    );


  if (!panel) {

    console.warn(
      "存在しないタブ:",
      tabName
    );

    return;
  }


  document
    .querySelectorAll(".tab")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.tab ===
          tabName
      );
    });


  document
    .querySelectorAll(".panel")
    .forEach(currentPanel => {

      currentPanel.classList.toggle(
        "active",
        currentPanel.id ===
          tabName
      );
    });


  if (
    tabName === "home"
  ) {
    drawChart();
  }


  if (
    tabName === "goals"
  ) {
    renderGoals();
  }


  if (
    /today|money/i.test(
      tabName
    )
  ) {
    renderTodayMoney();
  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* ============================================================
 * Event binding
 * ============================================================ */

function bindEvents() {

  /*
   * Main tabs
   */
  document
    .querySelectorAll(".tab")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          switchTab(
            button.dataset.tab
          );
        }
      );
    });


  /*
   * Generic data-tab buttons
   */
  document.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-tab]"
        );


      if (
        !button ||
        button.classList.contains(
          "tab"
        )
      ) {
        return;
      }


      const tabName =
        button.dataset.tab;


      if (!tabName) {
        return;
      }


      event.preventDefault();

      switchTab(tabName);
    }
  );


  /*
   * Child
   */
  $("child")?.addEventListener(
    "change",
    event => {
      selectChild(
        event.target.value,
        true
      );
    }
  );


  $("addChild")?.addEventListener(
    "click",
    () => {
      openChildModal(null);
    }
  );


  /*
   * Settings
   */
  $("settings")?.addEventListener(
    "click",
    () => {
      $("settingsModal")
        ?.classList.remove(
          "hidden"
        );
    }
  );


  /*
   * Money buttons
   */
  $("in")?.addEventListener(
    "click",
    () => {
      openTransactionModal(
        "in"
      );
    }
  );


  $("in2")?.addEventListener(
    "click",
    () => {
      openTransactionModal(
        "in"
      );
    }
  );


  $("out")?.addEventListener(
    "click",
    () => {
      openTransactionModal(
        "out"
      );
    }
  );


  $("out2")?.addEventListener(
    "click",
    () => {
      openTransactionModal(
        "out"
      );
    }
  );


  /*
   * Market refresh
   */
  $("refresh")?.addEventListener(
    "click",
    fetchMarketData
  );


  /*
   * Kid mode
   */
  if ($("kidMode")) {

    $("kidMode").checked =
      kidMode;


    $("kidMode").addEventListener(
      "change",
      event => {

        kidMode =
          event.target.checked;


        localStorage.setItem(
          KID_MODE_KEY,
          kidMode
            ? "1"
            : "0"
        );


        renderAll();


        window.dispatchEvent(
          new CustomEvent(
            "kidsMoneyKidModeChanged",
            {
              detail: {
                kidMode
              }
            }
          )
        );


        if (
          typeof refreshLearnForModeChange ===
          "function"
        ) {
          refreshLearnForModeChange();
        }


        /*
         * education.js の
         * モード切替にも通知。
         */
        if (
          typeof window.refreshEducationForModeChange ===
          "function"
        ) {
          window.refreshEducationForModeChange();
        }
      }
    );
  }


  /*
   * Forms
   */
  $("txForm")?.addEventListener(
    "submit",
    handleTransactionSubmit
  );


  $("childForm")?.addEventListener(
    "submit",
    handleChildSubmit
  );


  $("goalForm")?.addEventListener(
    "submit",
    handleGoalSubmit
  );


  /*
   * Goal
   */
  $("addGoal")?.addEventListener(
    "click",
    () => {
      $("goalModal")
        ?.classList.remove(
          "hidden"
        );
    }
  );


  $("goalsBack")?.addEventListener(
    "click",
    () => {
      switchTab("home");
    }
  );


  /*
   * Filters
   */
  $("tf")?.addEventListener(
    "change",
    renderTransactions
  );


  $("af")?.addEventListener(
    "change",
    renderTransactions
  );


  /*
   * Simulation
   */
  $("simulate")?.addEventListener(
    "click",
    simulateFuture
  );


  $("saveRatio")?.addEventListener(
    "input",
    updateRatioFromSave
  );


  $("investRatio")?.addEventListener(
    "input",
    updateRatioFromInvest
  );


  $("crash")?.addEventListener(
    "input",
    updateCrash
  );


  /*
   * Modal close
   */
  document
    .querySelectorAll(
      "[data-close]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          closeModal(
            button.dataset.close
          );
        }
      );
    });


  /*
   * Settings
   */
  $("export")?.addEventListener(
    "click",
    exportData
  );


  $("import")?.addEventListener(
    "change",
    importData
  );


  $("reset")?.addEventListener(
    "click",
    resetData
  );


  /*
   * Dynamic buttons
   *
   * 子ども編集
   * 子ども削除
   * 取引編集
   * 取引削除
   */
  document.addEventListener(
    "click",
    event => {

      const childEdit =
        event.target.closest(
          "[data-child-edit]"
        );


      if (childEdit) {

        event.preventDefault();


        if (
          childEdit.dataset.childEdit
        ) {
          openChildModal(
            childEdit.dataset.childEdit
          );
        }


        return;
      }


      const childDelete =
        event.target.closest(
          "[data-child-delete]"
        );


      if (childDelete) {

        event.preventDefault();


        if (
          childDelete.dataset.childDelete
        ) {
          deleteChild(
            childDelete.dataset.childDelete
          );
        }


        return;
      }


      const txEdit =
        event.target.closest(
          "[data-tx-edit]"
        );


      if (txEdit) {

        event.preventDefault();


        if (
          txEdit.dataset.txEdit
        ) {
          editTransaction(
            txEdit.dataset.txEdit
          );
        }


        return;
      }


      const txDelete =
        event.target.closest(
          "[data-tx-delete]"
        );


      if (txDelete) {

        event.preventDefault();


        if (
          txDelete.dataset.txDelete
        ) {
          deleteTransaction(
            txDelete.dataset.txDelete
          );
        }


        return;
      }
    }
  );
}


/* ============================================================
 * Init
 * ============================================================ */

function init() {

  state =
    loadState();


  marketState =
    loadMarket();


  selectedChildId =
    loadSelectedChildId();


  bindEvents();


  /*
   * 最初にローカルデータで
   * 画面を即時表示。
   *
   * market.json の取得を待たない。
   */
  renderAll();


  /*
   * 市場データは非同期取得。
   */
  fetchMarketData();


  /*
   * 初期子どもを education.js に通知。
   *
   * 初期化順序による問題を避けるため、
   * app.js 側からも必ず発火する。
   */
  dispatchChildChanged(
    getCurrentChild(),
    null,
    "init"
  );
}


/* ============================================================
 * DOM ready
 * ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  init
);