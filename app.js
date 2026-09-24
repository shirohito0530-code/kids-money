"use strict";

/*
============================================================
こどもマネー・ラボ V2.1
============================================================

重要：
・V1からのデータ移行はしません
・LocalStorageを利用します
・インデックス取得に失敗してもアプリ本体は動きます
・GitHub Pages / iPhone Safariを想定
*/

const STORAGE_KEY = "kidsMoneyLabV21";
const MARKET_KEY = "kidsMoneyMarketV21";

const APP_VERSION = 21;


/* ============================================================
   ASSET MASTER
============================================================ */

const ASSETS = {

  cash: {
    name: "貯金",
    kidName: "ためる",
    icon: "🏦",
    fixedRate: 0.002,
    risk: "小"
  },

  world: {
    name: "全世界株式",
    kidName: "せかいの かぶ",
    icon: "🌎",
    fixedRate: 0.055,
    risk: "大"
  },

  sp: {
    name: "S&P500",
    kidName: "アメリカの かぶ",
    icon: "🇺🇸",
    fixedRate: 0.06,
    risk: "大"
  }

};


/* ============================================================
   STATE
============================================================ */

let state = null;

let marketState = {
  world: null,
  sp: null,
  updated: null,
  source: "none"
};

let selectedChildId = null;

let kidMode =
  localStorage.getItem("kidsMoneyKidMode") === "1";


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


/* ============================================================
   FORMAT
============================================================ */

function yen(value) {

  const n = Number(value) || 0;

  return (
    "¥" +
    Math.round(n).toLocaleString("ja-JP")
  );
}


function signedYen(value) {

  const n = Number(value) || 0;

  if (n >= 0) {
    return "+" + yen(n);
  }

  return "-" + yen(Math.abs(n));
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

  return new Date()
    .toISOString()
    .slice(0, 10);

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
   LOAD / SAVE
============================================================ */

function loadState() {

  try {

    const raw =
      localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return createDefaultState();
    }

    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      !Array.isArray(parsed.children)
    ) {
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
      "データを保存できませんでした。"
    );

  }

}


/* ============================================================
   MARKET
============================================================ */

function loadMarket() {

  try {

    const raw =
      localStorage.getItem(MARKET_KEY);

    if (!raw) {
      return {
        world: null,
        sp: null,
        updated: null,
        source: "none"
      };
    }

    return JSON.parse(raw);

  } catch {

    return {
      world: null,
      sp: null,
      updated: null,
      source: "none"
    };

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
   CHILD
============================================================ */

function getCurrentChild() {

  if (!state || !state.children.length) {
    return null;
  }

  return (
    state.children.find(
      child => child.id === selectedChildId
    ) ||
    state.children[0]
  );

}


/* ============================================================
   CALCULATION
============================================================ */

function calculateChild(child) {

  const balances = {
    cash: 0,
    world: 0,
    sp: 0
  };

  let totalIn = 0;
  let totalOut = 0;

  let worldPrincipal = 0;
  let spPrincipal = 0;

  if (!child) {

    return {
      balances,
      totalIn: 0,
      totalOut: 0,
      principal: 0,
      investmentValue: 0,
      total: 0,
      worldValue: 0,
      spValue: 0,
      pnl: 0
    };

  }


  const transactions =
    Array.isArray(child.transactions)
      ? child.transactions
      : [];


  for (const tx of transactions) {

    const amount =
      Number(tx.amount) || 0;

    const asset =
      ASSETS[tx.asset]
        ? tx.asset
        : "cash";


    if (tx.type === "out") {

      balances[asset] =
        Math.max(
          0,
          balances[asset] - amount
        );

      totalOut += amount;

    } else {

      balances[asset] += amount;

      totalIn += amount;

      if (asset === "world") {
        worldPrincipal += amount;
      }

      if (asset === "sp") {
        spPrincipal += amount;
      }

    }

  }


  let worldValue =
    worldPrincipal;

  let spValue =
    spPrincipal;


  /*
  インデックス取得成功時
  ------------------------------------
  元本 × 現在指数 / 基準指数
  ------------------------------------
  */

  if (
    marketState.world &&
    Number(marketState.world.baseIndex) > 0 &&
    Number(marketState.world.indexValue) > 0
  ) {

    worldValue =
      worldPrincipal *
      marketState.world.indexValue /
      marketState.world.baseIndex;

  }


  if (
    marketState.sp &&
    Number(marketState.sp.baseIndex) > 0 &&
    Number(marketState.sp.indexValue) > 0
  ) {

    spValue =
      spPrincipal *
      marketState.sp.indexValue /
      marketState.sp.baseIndex;

  }


  const investmentValue =
    worldValue + spValue;

  const total =
    balances.cash +
    investmentValue;

  const principal =
    balances.cash +
    worldPrincipal +
    spPrincipal;

  const pnl =
    investmentValue -
    worldPrincipal -
    spPrincipal;


  return {

    balances,

    totalIn,

    totalOut,

    principal,

    investmentValue,

    total,

    worldValue,

    spValue,

    pnl

  };

}


/* ============================================================
   RENDER CHILD SELECTOR
============================================================ */

function renderChildSelector() {

  const select =
    $("child");

  if (!select) {
    return;
  }


  select.innerHTML = "";


  for (const child of state.children) {

    const option =
      document.createElement("option");

    option.value = child.id;
    option.textContent = child.name;

    select.appendChild(option);

  }


  if (
    !state.children.some(
      child => child.id === selectedChildId
    )
  ) {

    selectedChildId =
      state.children[0]?.id || null;

  }


  select.value =
    selectedChildId || "";

}


/* ============================================================
   ASSET LABEL
============================================================ */

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
   RENDER SUMMARY
============================================================ */

function renderSummary() {

  const child =
    getCurrentChild();

  const result =
    calculateChild(child);


  $("total").textContent =
    yen(result.total);

  $("cash").textContent =
    yen(result.balances.cash);

  $("invest").textContent =
    yen(result.investmentValue);

  $("ins").textContent =
    yen(result.totalIn);

  $("outs").textContent =
    yen(result.totalOut);

  $("pnl").textContent =
    signedYen(result.pnl);


  if (kidMode) {

    $("totalL").textContent =
      "ぜんぶ";

    $("cashL").textContent =
      "ためている";

    $("investL").textContent =
      "ふやしている";

    $("note").textContent =
      "おかねの ぜんぶ";

  } else {

    $("totalL").textContent =
      "総資産";

    $("cashL").textContent =
      "貯金";

    $("investL").textContent =
      "投資";

    $("note").textContent =
      "投資損益 " +
      signedYen(result.pnl);

  }

}


/* ============================================================
   RENDER ASSETS
============================================================ */

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
    const [key, asset]
    of Object.entries(ASSETS)
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
        calculatePrincipal(
          child,
          key
        );

    } else if (key === "sp") {

      value =
        result.spValue;

      principal =
        calculatePrincipal(
          child,
          key
        );

    }


    const card =
      document.createElement("article");

    card.className = "asset";


    const riskText =
      kidMode
        ? (
          asset.risk === "小"
            ? "へりにくい"
            : "へることもある"
        )
        : "リスク：" + asset.risk;


    let meta = "";


    if (key === "cash") {

      meta =
        kidMode
          ? "いま ためている おかね"
          : "現在残高";

    } else {

      const pnl =
        value - principal;

      meta =
        kidMode
          ? (
            "いれた おかね " +
            yen(principal) +
            " · " +
            (pnl >= 0
              ? "ふえた "
              : "へった ") +
            yen(Math.abs(pnl))
          )
          : (
            "元本 " +
            yen(principal) +
            " · 損益 " +
            signedYen(pnl)
          );

    }


    card.innerHTML = `

      <div class="asset-top">

        <span class="asset-icon">
          ${asset.icon}
        </span>

        <span class="meta">
          ${riskText}
        </span>

      </div>

      <h3>
        ${escapeHtml(
          kidMode
            ? asset.kidName
            : asset.name
        )}
      </h3>

      <div class="value">
        ${yen(value)}
      </div>

      <div class="meta">
        ${meta}
      </div>

    `;


    container.appendChild(card);

  }

}


function calculatePrincipal(
  child,
  assetKey
) {

  if (!child) {
    return 0;
  }

  let value = 0;


  for (
    const tx
    of child.transactions || []
  ) {

    if (
      tx.asset !== assetKey
    ) {
      continue;
    }

    const amount =
      Number(tx.amount) || 0;

    if (tx.type === "out") {

      value =
        Math.max(
          0,
          value - amount
        );

    } else {

      value += amount;

    }

  }


  return value;

}


/* ============================================================
   RENDER TRANSACTIONS
============================================================ */

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
    document.createElement("option");

  all.value = "all";
  all.textContent = "すべて";

  select.appendChild(all);


  for (
    const [key, asset]
    of Object.entries(ASSETS)
  ) {

    const option =
      document.createElement("option");

    option.value = key;

    option.textContent =
      asset.icon +
      " " +
      assetName(key);

    select.appendChild(option);

  }


  if (
    Array.from(select.options)
      .some(option => option.value === current)
  ) {

    select.value = current;

  }

}


function renderTransactions() {

  const child =
    getCurrentChild();

  const container =
    $("txs");

  if (!container) {
    return;
  }


  const typeFilter =
    $("tf").value;

  const assetFilter =
    $("af").value;


  let transactions =
    [...(child?.transactions || [])];


  if (typeFilter !== "all") {

    transactions =
      transactions.filter(
        tx => tx.type === typeFilter
      );

  }


  if (assetFilter !== "all") {

    transactions =
      transactions.filter(
        tx => tx.asset === assetFilter
      );

  }


  transactions.sort(
    (a, b) =>
      String(b.date)
        .localeCompare(
          String(a.date)
        )
  );


  if (!transactions.length) {

    container.innerHTML = `

      <div class="card muted">
        ${kidMode
          ? "まだ きろくが ありません。"
          : "取引履歴がありません。"}
      </div>

    `;

    return;

  }


  container.innerHTML = "";


  for (const tx of transactions) {

    const card =
      document.createElement("div");

    card.className = "card";


    const sign =
      tx.type === "in"
        ? "＋"
        : "−";


    const typeText =
      tx.type === "in"
        ? "いれた"
        : "つかった";


    card.innerHTML = `

      <strong>
        ${escapeHtml(tx.date)}
        ·
        ${sign}${yen(tx.amount)}
      </strong>

      <div>
        ${escapeHtml(tx.reason || "")}
        ·
        ${ASSETS[tx.asset]?.icon || "💰"}
        ${escapeHtml(assetName(tx.asset))}
      </div>

      ${
        tx.memo
          ? `<div class="meta">
              ${escapeHtml(tx.memo)}
             </div>`
          : ""
      }

    `;

    container.appendChild(card);

  }

}


/* ============================================================
   RENDER MARKET
============================================================ */

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


  for (const item of markets) {

    const data =
      marketState[item.key];


    const card =
      document.createElement("div");

    card.className = "market";


    if (!data) {

      card.innerHTML = `

        <div class="market-head">

          <span>
            ${item.icon}
            ${item.name}
          </span>

          <span class="muted">
            まだなし
          </span>

        </div>

        <div class="price">
          -
        </div>

      `;

    } else {

      const change =
        Number(data.change) || 0;


      card.innerHTML = `

        <div class="market-head">

          <span>
            ${item.icon}
            ${item.name}
          </span>

          <span class="${
            change >= 0
              ? "up"
              : "down"
          }">

            ${
              change >= 0
                ? "+"
                : ""
            }${change.toFixed(2)}%

          </span>

        </div>

        <div class="price">
          ${Number(data.indexValue).toLocaleString()}
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


  if (marketState.source === "live") {

    status.textContent =
      "指数データを 取得しました。";

  } else if (
    marketState.source === "fixed"
  ) {

    status.textContent =
      "指数を取得できないため、教育用の固定率で計算しています。";

  } else {

    status.textContent =
      "「更新」を押すと指数データを確認できます。";

  }

}


/* ============================================================
   INDEX FETCH
============================================================ */

/*
  Yahoo Financeの取得に失敗しても
  アプリ全体を止めない。
*/

async function fetchMarketData() {

  const status =
    $("marketStatus");


  if (status) {

    status.textContent =
      "指数を みています…";

  }


  try {

    const [
      worldResponse,
      spResponse
    ] = await Promise.all([

      fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/ACWI?range=5d&interval=1d",
        {
          method: "GET",
          cache: "no-store"
        }
      ),

      fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=5d&interval=1d",
        {
          method: "GET",
          cache: "no-store"
        }
      )

    ]);


    if (
      !worldResponse.ok ||
      !spResponse.ok
    ) {

      throw new Error(
        "market api response error"
      );

    }


    const worldJson =
      await worldResponse.json();

    const spJson =
      await spResponse.json();


    const world =
      parseYahooResult(
        worldJson
      );

    const sp =
      parseYahooResult(
        spJson
      );


    /*
      基準指数は最初に取得した値を維持。
      これにより「最初にいれた時から
      どれだけ指数が動いたか」を教育用に表現。
    */

    world.baseIndex =
      marketState.world?.baseIndex ||
      world.indexValue;


    sp.baseIndex =
      marketState.sp?.baseIndex ||
      sp.indexValue;


    marketState = {

      world,
      sp,

      updated:
        new Date().toISOString(),

      source:
        "live"

    };


    saveMarket();

    renderAll();


  } catch (error) {

    console.warn(
      "指数取得失敗:",
      error
    );


    /*
      API取得に失敗しても
      家計機能は利用できるようにする。
    */

    marketState.source =
      "fixed";


    if (!marketState.world) {

      marketState.world = {

        indexValue: 100,
        baseIndex: 100,
        change: 0

      };

    }


    if (!marketState.sp) {

      marketState.sp = {

        indexValue: 100,
        baseIndex: 100,
        change: 0

      };

    }


    saveMarket();

    renderAll();


    if (status) {

      status.textContent =
        "指数を取得できませんでした。教育用の固定率で動きます。";

    }

  }

}


/* ============================================================
   PARSE YAHOO
============================================================ */

function parseYahooResult(json) {

  const result =
    json?.chart?.result?.[0];


  if (!result) {

    throw new Error(
      "invalid market data"
    );

  }


  const closes =
    result.indicators?.quote?.[0]?.close
      ?.filter(
        value =>
          typeof value === "number"
      );


  if (
    !closes ||
    !closes.length
  ) {

    throw new Error(
      "no closing price"
    );

  }


  const current =
    closes[closes.length - 1];

  const previous =
    closes.length >= 2
      ? closes[closes.length - 2]
      : current;


  const change =
    previous === 0
      ? 0
      : (
        current / previous - 1
      ) * 100;


  return {

    indexValue: current,

    change,

    updated:
      new Date().toISOString()

  };

}


/* ============================================================
   RENDER GOALS
============================================================ */

function renderGoals() {

  const child =
    getCurrentChild();

  const container =
    $("goals");


  if (!container) {
    return;
  }


  const goals =
    child?.goals || [];


  if (!goals.length) {

    container.innerHTML = `

      <div class="card muted">
        ${
          kidMode
            ? "めあてを つくってみよう。"
            : "目標を登録してみましょう。"
        }
      </div>

    `;

    return;

  }


  container.innerHTML = "";


  for (const goal of goals) {

    const amount =
      Number(goal.amount) || 0;

    const saved =
      Number(goal.saved) || 0;


    const percent =
      amount > 0
        ? Math.min(
            100,
            Math.round(
              saved / amount * 100
            )
          )
        : 0;


    const div =
      document.createElement("div");

    div.className = "goal";


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
          style="width:${percent}%"
        ></span>

      </div>

      <div class="goal-meta">

        <span>
          ${percent}%
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
   CHART
============================================================ */

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

  const height =
    220;

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


  context.fillStyle =
    "#687386";

  context.font =
    "13px sans-serif";


  const child =
    getCurrentChild();


  if (
    !child ||
    !child.transactions?.length
  ) {

    context.fillText(
      kidMode
        ? "おかねを いれると うごきが みえるよ"
        : "入金・出金を登録するとグラフが表示されます。",
      15,
      35
    );

    return;

  }


  /*
    簡易残高推移
  */

  const transactions =
    [...child.transactions]
      .sort(
        (a, b) =>
          String(a.date)
            .localeCompare(
              String(b.date)
            )
      );


  let balance = 0;

  const points = [];


  for (const tx of transactions) {

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
    Math.max(...points, 1);

  const min =
    Math.min(...points, 0);


  const left = 30;
  const right = width - 15;
  const top = 20;
  const bottom = height - 25;


  context.strokeStyle =
    "#315efb";

  context.lineWidth =
    3;

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
        (right - left);


      const normalized =
        max === min
          ? 0.5
          : (
            value - min
          ) /
          (
            max - min
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
    yen(points[points.length - 1]),
    left,
    15
  );

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

    showError(
      "画面の表示中にエラーが発生しました。"
    );

  }

}


/* ============================================================
   TRANSACTION MODAL
============================================================ */

function openTransactionModal(type) {

  $("txType").value =
    type;

  $("txTitle").textContent =
    type === "in"
      ? "おかねを いれる"
      : "おかねを つかう";


  $("date").value =
    today();


  $("amount").value =
    "";


  $("memo").value =
    "";


  $("asset").innerHTML =
    "";


  for (
    const [key, asset]
    of Object.entries(ASSETS)
  ) {

    const option =
      document.createElement("option");

    option.value = key;

    option.textContent =
      asset.icon +
      " " +
      assetName(key);

    $("asset").appendChild(
      option
    );

  }


  $("txModal")
    .classList.remove("hidden");

}


/* ============================================================
   CLOSE MODAL
============================================================ */

function closeModal(id) {

  const modal =
    $(id);

  if (modal) {

    modal.classList.add(
      "hidden"
    );

  }

}


/* ============================================================
   ADD TRANSACTION
============================================================ */

function handleTransactionSubmit(event) {

  event.preventDefault();


  const child =
    getCurrentChild();


  if (!child) {

    showError(
      "子どもを選んでください。"
    );

    return;

  }


  const type =
    $("txType").value;


  const amount =
    Number(
      $("amount").value
    );


  const asset =
    $("asset").value;


  if (
    !amount ||
    amount <= 0
  ) {

    alert(
      "いくらかを いれてください。"
    );

    return;

  }


  const current =
    calculateChild(child);


  if (type === "out") {

    const available =
      current.balances[asset] || 0;


    if (amount > available) {

      alert(
        "のこっている おかねより おおきいよ。\n\n" +
        "のこり：" +
        yen(available)
      );

      return;

    }

  }


  child.transactions.push({

    id: createId(),

    type,

    date:
      $("date").value ||
      today(),

    amount,

    reason:
      $("reason").value,

    asset,

    memo:
      $("memo").value.trim()

  });


  saveState();

  closeModal(
    "txModal"
  );


  renderAll();

}


/* ============================================================
   ADD CHILD
============================================================ */

function handleChildSubmit(event) {

  event.preventDefault();


  const name =
    $("childName")
      .value
      .trim();


  const birthYear =
    Number(
      $("birth").value
    );


  if (!name) {

    alert(
      "なまえを いれてください。"
    );

    return;

  }


  const child = {

    id: createId(),

    name,

    birthYear,

    transactions: [],

    goals: []

  };


  state.children.push(
    child
  );


  selectedChildId =
    child.id;


  saveState();

  closeModal(
    "childModal"
  );


  event.target.reset();

  renderAll();

}


/* ============================================================
   ADD GOAL
============================================================ */

function handleGoalSubmit(event) {

  event.preventDefault();


  const child =
    getCurrentChild();


  if (!child) {
    return;
  }


  const name =
    $("goalName")
      .value
      .trim();


  const amount =
    Number(
      $("goalAmount").value
    );


  const date =
    $("goalDate").value;


  const saved =
    Number(
      $("goalSaved").value
    ) || 0;


  if (
    !name ||
    amount <= 0 ||
    !date
  ) {

    alert(
      "めあてを いれてください。"
    );

    return;

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


  event.target.reset();

  renderAll();

}


/* ============================================================
   FUTURE SIMULATION
============================================================ */

function simulateFuture() {

  const child =
    getCurrentChild();


  const current =
    calculateChild(child);


  const annual =
    Math.max(
      0,
      Number(
        $("annual").value
      ) || 0
    );


  const years =
    Math.max(
      1,
      Number(
        $("years").value
      ) || 1
    );


  const saveRatio =
    Number(
      $("saveRatio").value
    ) / 100;


  const investRatio =
    1 -
    saveRatio;


  const cashRate =
    ASSETS.cash.fixedRate;


  const investRate =
    0.055;


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
      )
      +
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


  $("result").innerHTML = `

    <div class="card">

      <h3>
        かんがえてみよう
      </h3>

      <div class="value">
        ${yen(total)}
      </div>

      <p class="muted">
        ${years}ねん後
        ·
        ためる ${Math.round(saveRatio * 100)}%
        /
        ふやす ${Math.round(investRatio * 100)}%
      </p>

      <p>
        これは よそうの けいさんだよ。
        ほんとうの投資では、
        ふえることも へることも あるよ。
      </p>

    </div>

  `;

}


/* ============================================================
   RATIO
============================================================ */

function updateRatioFromSave() {

  const save =
    Number(
      $("saveRatio").value
    );


  const invest =
    100 - save;


  $("investRatio").value =
    invest;


  $("sr").textContent =
    save + "%";

  $("ir").textContent =
    invest + "%";

}


function updateRatioFromInvest() {

  const invest =
    Number(
      $("investRatio").value
    );


  const save =
    100 - invest;


  $("saveRatio").value =
    save;


  $("sr").textContent =
    save + "%";

  $("ir").textContent =
    invest + "%";

}


/* ============================================================
   CRASH SIMULATION
============================================================ */

function updateCrash() {

  const child =
    getCurrentChild();


  const result =
    calculateChild(child);


  const crash =
    Number(
      $("crash").value
    ) || 0;


  $("crashL").textContent =
    "-" + crash + "%";


  const after =
    result.balances.cash +
    result.investmentValue *
    (
      1 -
      crash / 100
    );


  $("crashBox").innerHTML = `

    <strong>
      ${yen(result.total)}
      →
      ${yen(after)}
    </strong>

    <div class="muted">
      投資部分が ${crash}% 下がった場合
    </div>

  `;

}


/* ============================================================
   EXPORT
============================================================ */

function exportData() {

  try {

    const blob =
      new Blob(
        [
          JSON.stringify(
            state,
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


    const link =
      document.createElement("a");

    link.href =
      url;

    link.download =
      "kids-money-v21-backup.json";


    document.body.appendChild(
      link
    );


    link.click();


    link.remove();


    setTimeout(
      () =>
        URL.revokeObjectURL(
          url
        ),
      1000
    );

  } catch (error) {

    showError(
      "バックアップを作れませんでした。"
    );

  }

}


/* ============================================================
   IMPORT
============================================================ */

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


      state =
        parsed;


      selectedChildId =
        state.children[0]?.id ||
        null;


      saveState();

      closeModal(
        "settingsModal"
      );


      renderAll();


      alert(
        "データを よみこみました。"
      );


    } catch (error) {

      alert(
        "JSONが正しくありません。"
      );

    }

  };


  reader.readAsText(file);

}


/* ============================================================
   RESET
============================================================ */

function resetData() {

  const ok =
    confirm(
      "データを ぜんぶ けしていい？"
    );


  if (!ok) {
    return;
  }


  localStorage.removeItem(
    STORAGE_KEY
  );


  state =
    createDefaultState();


  selectedChildId =
    state.children[0].id;


  saveState();

  renderAll();

}


/* ============================================================
   TAB
============================================================ */

function switchTab(tabName) {

  document
    .querySelectorAll(".tab")
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.tab ===
          tabName
        );

      }
    );


  document
    .querySelectorAll(".panel")
    .forEach(
      panel => {

        panel.classList.toggle(
          "active",
          panel.id === tabName
        );

      }
    );


  /*
    タブ移動時に表示を更新
  */

  if (tabName === "home") {

    drawChart();

  }

}


/* ============================================================
   EVENT BINDING
============================================================ */

function bindEvents() {

  /*
    タブ
  */

  document
    .querySelectorAll(".tab")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            switchTab(
              button.dataset.tab
            );

          }
        );

      }
    );


  /*
    子ども変更
  */

  $("child")
    .addEventListener(
      "change",
      event => {

        selectedChildId =
          event.target.value;

        renderAll();

      }
    );


  /*
    子ども追加
  */

  $("addChild")
    .addEventListener(
      "click",
      () =>
        $("childModal")
          .classList
          .remove("hidden")
    );


  /*
    設定
  */

  $("settings")
    .addEventListener(
      "click",
      () =>
        $("settingsModal")
          .classList
          .remove("hidden")
    );


  /*
    入金
  */

  $("in")
    .addEventListener(
      "click",
      () =>
        openTransactionModal(
          "in"
        )
    );


  $("in2")
    .addEventListener(
      "click",
      () =>
        openTransactionModal(
          "in"
        )
    );


  /*
    出金
  */

  $("out")
    .addEventListener(
      "click",
      () =>
        openTransactionModal(
          "out"
        )
    );


  $("out2")
    .addEventListener(
      "click",
      () =>
        openTransactionModal(
          "out"
        )
    );


  /*
    市場更新
  */

  $("refresh")
    .addEventListener(
      "click",
      fetchMarketData
    );


  /*
    こどもモード
  */

  $("kidMode")
    .checked =
      kidMode;


  $("kidMode")
    .addEventListener(
      "change",
      event => {

        kidMode =
          event.target.checked;


        localStorage.setItem(
          "kidsMoneyKidMode",
          kidMode ? "1" : "0"
        );


        renderAll();

      }
    );


  /*
    transaction
  */

  $("txForm")
    .addEventListener(
      "submit",
      handleTransactionSubmit
    );


  /*
    child
  */

  $("childForm")
    .addEventListener(
      "submit",
      handleChildSubmit
    );


  /*
    goal
  */

  $("addGoal")
    .addEventListener(
      "click",
      () =>
        $("goalModal")
          .classList
          .remove("hidden")
    );


  $("goalForm")
    .addEventListener(
      "submit",
      handleGoalSubmit
    );


  /*
    filters
  */

  $("tf")
    .addEventListener(
      "change",
      renderTransactions
    );


  $("af")
    .addEventListener(
      "change",
      renderTransactions
    );


  /*
    simulation
  */

  $("simulate")
    .addEventListener(
      "click",
      simulateFuture
    );


  $("saveRatio")
    .addEventListener(
      "input",
      updateRatioFromSave
    );


  $("investRatio")
    .addEventListener(
      "input",
      updateRatioFromInvest
    );


  $("crash")
    .addEventListener(
      "input",
      updateCrash
    );


  /*
    modal close
  */

  document
    .querySelectorAll(
      "[data-close]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            closeModal(
              button.dataset.close
            );

          }
        );

      }
    );


  /*
    export
  */

  $("export")
    .addEventListener(
      "click",
      exportData
    );


  /*
    import
  */

  $("import")
    .addEventListener(
      "change",
      importData
    );


  /*
    reset
  */

  $("reset")
    .addEventListener(
      "click",
      resetData
    );


  /*
    resize
  */

  window.addEventListener(
    "resize",
    drawChart
  );

}


/* ============================================================
   INITIALIZE
============================================================ */

function initialize() {

  try {

    /*
      データロード
    */

    state =
      loadState();


    marketState =
      loadMarket();


    selectedChildId =
      state.children[0]?.id ||
      null;


    /*
      イベント登録
    */

    bindEvents();


    /*
      初期画面
    */

    renderAll();


    /*
      比率表示
    */

    updateRatioFromSave();


    /*
      開発時確認用
    */

    console.log(
      "Kids Money Lab V2.1 initialized."
    );


  } catch (error) {

    console.error(
      "Initialization error:",
      error
    );


    showError(
      "アプリの起動中にエラーが発生しました。"
    );

  }

}


/* ============================================================
   DOM READY
============================================================ */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initialize,
    {
      once: true
    }
  );

} else {

  initialize();

}