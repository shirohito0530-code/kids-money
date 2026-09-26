"use strict";

/*
============================================================
こどもマネー・ラボ V3.0
教育機能統合モジュール

主な修正
------------------------------------------------------------
・子どもごとの学習履歴を完全分離
・子ども切替時の旧状態保存 → 新状態ロードを修正
・子ども切替時にクイズ状態も完全リセット
・クイズをシャッフルデッキ方式に変更
・同じ問題の連続出題を防止
・QUIZ_DATA が少ない場合でも内蔵問題を利用
・Kidモードの表示をひらがな中心に統一
・今日のお金を app.js のデータから取得
・子ども切替イベントに対応
・Kidモード変更イベントに対応
・Market変更イベントに対応
・現在の学習対象の子どもを大きく表示
・既存V2.7/V2.8/V2.9教育データを引き継ぎ
============================================================
*/


/* ============================================================
   CONSTANTS
============================================================ */

const EDUCATION_STATE_KEY = "kidsMoneyEducationV29";
const EDUCATION_STATE_VERSION = 30;

const DEFAULT_EDUCATION_STATE = {
  quizCorrect: 0,
  quizAnswered: 0,
  learnedGlossary: [],
  completedLessons: [],
  viewedScenarios: [],
  lastStudyDate: null,
  studyDays: 0
};


/* ============================================================
   EDUCATION STATE
============================================================ */

let educationStatesByChild = {};
let educationState = createEducationState();

/*
現在education.jsが保持している「実際に読み込んでいる子ども」
selectedChildIdとは別に保持する。

これが重要。

子ども切替イベントが発生した時点では
app.js側のselectedChildIdはすでに新しい子どもになっている。

そのため、

旧activeEducationChildId → 保存
新selectedChildId → ロード

という順番にする。
*/
let activeEducationChildId = null;


/* ============================================================
   VIEW / HISTORY
============================================================ */

let educationMode = "home";
let educationHistory = [];

const EDUCATION_HISTORY_LIMIT = 20;


/* ============================================================
   QUIZ STATE
============================================================ */

let currentQuizQuestionId = null;
let currentQuizQuestionIndex = -1;
let currentQuizAnswered = false;

/*
子どもごとにクイズデッキを持つ。

例：
Aさん
  Q5 → Q2 → Q9 → Q1 ...

Bさん
  Q3 → Q8 → Q4 ...

子どもを切り替えても、
それぞれ独立した出題状態になる。
*/
let quizDecksByChild = {};

const QUIZ_DECK_STORAGE_KEY = "kidsMoneyQuizDecksV31";
const QUIZ_DECK_VERSION = 31;
let recentQuizQuestionIdsByChild = {};


/* ============================================================
   CHILD HELPERS
============================================================ */

function getEducationChildId() {
  try {
    if (
      typeof selectedChildId !== "undefined" &&
      selectedChildId !== null &&
      selectedChildId !== ""
    ) {
      return String(selectedChildId);
    }
  } catch (error) {
    console.warn("selectedChildId unavailable", error);
  }

  return "default";
}


function getEducationChildName() {
  try {
    if (typeof getCurrentChild === "function") {
      const child = getCurrentChild();

      if (child && child.name) {
        return String(child.name);
      }
    }
  } catch (error) {
    console.warn("getCurrentChild unavailable", error);
  }

  return educationIsKidMode()
    ? "おともだち"
    : "学習者";
}


function createEducationState() {
  return {
    quizCorrect: 0,
    quizAnswered: 0,
    learnedGlossary: [],
    completedLessons: [],
    viewedScenarios: [],
    lastStudyDate: null,
    studyDays: 0
  };
}


function normalizeEducationState(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return createEducationState();
  }

  const state = {
    ...createEducationState(),
    ...parsed
  };

  state.quizCorrect = Math.max(
    0,
    Math.floor(normalizeNumber(state.quizCorrect, 0))
  );

  state.quizAnswered = Math.max(
    0,
    Math.floor(normalizeNumber(state.quizAnswered, 0))
  );

  state.studyDays = Math.max(
    0,
    Math.floor(normalizeNumber(state.studyDays, 0))
  );

  state.learnedGlossary = Array.isArray(state.learnedGlossary)
    ? [...new Set(state.learnedGlossary)]
    : [];

  state.completedLessons = Array.isArray(state.completedLessons)
    ? [...new Set(state.completedLessons)]
    : [];

  state.viewedScenarios = Array.isArray(state.viewedScenarios)
    ? [...new Set(state.viewedScenarios)]
    : [];

  state.lastStudyDate =
    typeof state.lastStudyDate === "string"
      ? state.lastStudyDate
      : null;

  return state;
}


/* ============================================================
   LOAD / SAVE EDUCATION STATE
============================================================ */

function getAppChildren() {
  try {
    if (typeof window.getKidsMoneyChildren === "function") {
      return window.getKidsMoneyChildren();
    }
  } catch (error) {
    console.warn("children API unavailable", error);
  }
  return [];
}

function saveEducationToCurrentChild() {
  const childId = activeEducationChildId;
  if (!childId || childId === "default") return;

  const child = getAppChildren().find(
    item => String(item.id) === String(childId)
  );

  if (!child) return;

  if (!child.learning || typeof child.learning !== "object") {
    child.learning = {};
  }

  child.learning.education =
    normalizeEducationState(educationState);

  /*
   * app.jsのstateを正本として保存する。
   * これにより「子どもAの学習記録」が
   * 子どもBへ混ざることを防ぐ。
   */
  try {
    if (typeof saveState === "function") {
      saveState();
    }
  } catch (error) {
    console.warn("app state save failed", error);
  }
}

function loadEducationState() {
  educationStatesByChild = {};

  const children = getAppChildren();

  /*
   * まずapp.jsの子どもデータ内に保存された学習記録を使用。
   */
  for (const child of children) {
    const childId = String(child.id);
    const saved =
      child?.learning?.education &&
      typeof child.learning.education === "object"
        ? child.learning.education
        : null;

    educationStatesByChild[childId] =
      normalizeEducationState(saved);
  }

  /*
   * 既存V2.9/V3.0のlocalStorageからも移行する。
   * app.js側にまだ学習記録がない子どもだけを補完する。
   */
  try {
    const raw = localStorage.getItem(EDUCATION_STATE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.children &&
        typeof parsed.children === "object"
      ) {
        for (const [childId, childState] of Object.entries(parsed.children)) {
          if (!educationStatesByChild[String(childId)]) {
            educationStatesByChild[String(childId)] =
              normalizeEducationState(childState);
          }
        }
      } else if (parsed && typeof parsed === "object") {
        const currentId = getEducationChildId();
        if (!educationStatesByChild[currentId]) {
          educationStatesByChild[currentId] =
            normalizeEducationState(parsed);
        }
      }
    }
  } catch (error) {
    console.warn("legacy education state migration failed", error);
  }

  const currentId = getEducationChildId();

  if (!educationStatesByChild[currentId]) {
    educationStatesByChild[currentId] = createEducationState();
  }

  activeEducationChildId = currentId;
  educationState =
    normalizeEducationState(educationStatesByChild[currentId]);

  /*
   * 移行後はapp.js側にも保存。
   */
  saveEducationToCurrentChild();
  saveAllEducationStates();

  return educationState;
}

function loadCurrentChildEducationState(childId = null) {
  const targetChildId =
    childId !== null && childId !== undefined
      ? String(childId)
      : getEducationChildId();

  if (!educationStatesByChild[targetChildId]) {
    educationStatesByChild[targetChildId] =
      createEducationState();
  }

  educationState =
    normalizeEducationState(
      educationStatesByChild[targetChildId]
    );

  activeEducationChildId = targetChildId;

  /*
   * app.js側の現在の子どもにも同期。
   */
  saveEducationToCurrentChild();

  return educationState;
}

function saveActiveEducationState() {
  if (!activeEducationChildId || activeEducationChildId === "default") {
    return;
  }

  educationStatesByChild[activeEducationChildId] =
    normalizeEducationState(educationState);

  saveEducationToCurrentChild();
  saveAllEducationStates();
}

function saveAllEducationStates() {
  try {
    localStorage.setItem(
      EDUCATION_STATE_KEY,
      JSON.stringify({
        version: EDUCATION_STATE_VERSION,
        children: educationStatesByChild
      })
    );
  } catch (error) {
    console.error("education state save error", error);
  }
}

function saveEducationState() {
  saveActiveEducationState();
}


/* ============================================================
   CHILD CHANGE
============================================================ */

function refreshEducationForChildChange(eventDetail = null) {
  const oldChildId = activeEducationChildId;
  const newChildId = getEducationChildId();

  /*
  まず旧子どもの学習状態を保存。
  ここを逆にすると子どもAの記録が
  子どもBへコピーされる。
  */
  if (
    oldChildId &&
    oldChildId !== "default"
  ) {
    educationStatesByChild[oldChildId] =
      normalizeEducationState(educationState);

    /* 現在の子どもの記録をapp.js側にも確定保存 */
    saveEducationToCurrentChild();
  }

  saveAllEducationStates();

  /*
  新しい子どもの学習状態をロード。
  */
  loadCurrentChildEducationState(newChildId);

  /*
  子どもが変わったらクイズ途中状態を完全リセット。
  */
  resetCurrentQuizState();

  /*
  クイズデッキも新しい子ども用に切り替える。
  */
  ensureQuizDeckForChild(newChildId);

  educationHistory = [];
  educationMode = "home";

  const target =
    document.getElementById("educationContent");

  if (target) {
    renderEducation();
  }

  /*
  今日のお金も子どもごとに更新。
  */
  renderTodayMoneyEducation();

  /*
  学習対象表示も更新。
  */
  renderEducationCurrentChild();
}


/* ============================================================
   QUIZ RESET
============================================================ */

function resetCurrentQuizState() {
  currentQuizQuestionId = null;
  currentQuizQuestionIndex = -1;
  currentQuizAnswered = false;
}


/* ============================================================
   UTILITY
============================================================ */

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function educationEscape(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function educationFormatYen(value) {
  const number =
    normalizeNumber(value, 0);

  return (
    "¥" +
    Math.round(number)
      .toLocaleString("ja-JP")
  );
}


/* ============================================================
   KID MODE
============================================================ */

function educationIsKidMode() {
  try {
    if (
      typeof kidMode !== "undefined" &&
      kidMode === true
    ) {
      return true;
    }
  } catch (error) {
    console.warn(error);
  }

  return false;
}


function educationText(adult, kid) {
  return educationIsKidMode()
    ? kid
    : adult;
}


/*
Kidモードで使う固定文言。

漢字が残りやすい箇所をここに集約する。
*/
const EDUCATION_LABELS = {
  home: ["おかねを まなぼう", "お金を学ぼう"],
  market: ["きょうの おかね", "今日のお金"],
  simulation: ["もしも", "もしもシミュレーション"],
  goal: ["もくひょう", "お金の目標"],
  quiz: ["おかねクイズ", "お金クイズ"],
  history: ["べんきょうきろく", "学習記録"],
  back: ["← もどる", "← 戻る"],
  calculate: ["けいさんする", "計算する"],
  result: ["けっか", "結果"],
  explanation: ["せつめい", "解説"],
  next: ["つぎの クイズ", "次のクイズ"]
};


function educationLabel(key) {
  const item =
    EDUCATION_LABELS[key];

  if (!item) {
    return "";
  }

  return educationIsKidMode()
    ? item[0]
    : item[1];
}


/* ============================================================
   JST
============================================================ */

function getJapanDateString() {
  const formatter =
    new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

  const parts =
    formatter.formatToParts(new Date());

  const year =
    parts.find(
      part => part.type === "year"
    )?.value;

  const month =
    parts.find(
      part => part.type === "month"
    )?.value;

  const day =
    parts.find(
      part => part.type === "day"
    )?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}


/* ============================================================
   STUDY RECORD
============================================================ */

function recordStudy() {
  const today =
    getJapanDateString();

  if (!today) {
    return;
  }

  if (
    educationState.lastStudyDate === today
  ) {
    return;
  }

  educationState.lastStudyDate = today;

  educationState.studyDays =
    Math.max(
      0,
      Math.floor(
        normalizeNumber(
          educationState.studyDays,
          0
        )
      )
    ) + 1;

  saveActiveEducationState();
}


function markLessonCompleted(lessonId) {
  if (!lessonId) {
    return;
  }

  if (
    !educationState.completedLessons.includes(
      lessonId
    )
  ) {
    educationState.completedLessons.push(
      lessonId
    );

    saveActiveEducationState();
  }
}


function markScenarioViewed(scenarioId) {
  if (!scenarioId) {
    return;
  }

  if (
    !educationState.viewedScenarios.includes(
      scenarioId
    )
  ) {
    educationState.viewedScenarios.push(
      scenarioId
    );

    saveActiveEducationState();
  }
}


/* ============================================================
   NAVIGATION
============================================================ */

function navigateEducationMode(mode) {
  const validModes = [
    "home",
    "market",
    "simulation",
    "goal",
    "quiz",
    "history"
  ];

  if (!validModes.includes(mode)) {
    mode = "home";
  }

  if (mode === educationMode) {
    renderEducation();
    return;
  }

  if (educationMode) {
    educationHistory.push(
      educationMode
    );
  }

  if (
    educationHistory.length >
    EDUCATION_HISTORY_LIMIT
  ) {
    educationHistory =
      educationHistory.slice(
        -EDUCATION_HISTORY_LIMIT
      );
  }

  educationMode = mode;

  resetCurrentQuizState();

  renderEducation();
}


function goBackEducation() {
  resetCurrentQuizState();

  if (educationHistory.length) {
    educationMode =
      educationHistory.pop();

    renderEducation();

    return;
  }

  educationMode = "home";

  renderEducation();
}


function renderEducationBackButton() {
  return `
    <div class="education-back">
      <button
        type="button"
        class="secondary"
        data-education-back="true"
      >
        ${educationLabel("back")}
      </button>
    </div>
  `;
}


/* ============================================================
   TODAY MONEY
============================================================ */

function getTodayMoneyEducationData() {
  try {
    if (
      typeof window.getKidsMoneyTodayMoney ===
      "function"
    ) {
      const result =
        window.getKidsMoneyTodayMoney();

      if (result) {
        return {
          income:
            normalizeNumber(
              result.income,
              0
            ),
          outcome:
            normalizeNumber(
              result.outcome,
              0
            ),
          net:
            normalizeNumber(
              result.net,
              0
            ),
          count:
            normalizeNumber(
              result.count,
              0
            )
        };
      }
    }
  } catch (error) {
    console.warn(
      "today money API error",
      error
    );
  }

  /*
  app.jsのAPIがまだ無い場合のフォールバック。
  */
  try {
    if (
      typeof getCurrentChild ===
      "function" &&
      typeof getTodayTransactions ===
      "function"
    ) {
      const child =
        getCurrentChild();

      const transactions =
        getTodayTransactions(child);

      let income = 0;
      let outcome = 0;

      for (const tx of transactions) {
        const amount =
          normalizeNumber(
            tx.amount,
            0
          );

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
  } catch (error) {
    console.warn(
      "today money fallback error",
      error
    );
  }

  return {
    income: 0,
    outcome: 0,
    net: 0,
    count: 0
  };
}


function renderTodayMoneyEducation() {
  const data =
    getTodayMoneyEducationData();

  /*
  専用のtoday money領域を探す。
  */
  const targets = [];

  const ids = [
    "todayMoneyContent",
    "today-money-content",
    "todayMoneyList",
    "today-money",
    "todayMoney"
  ];

  for (const id of ids) {
    const element =
      document.getElementById(id);

    if (element) {
      targets.push(element);
    }
  }

  /*
  #todayがパネルの場合は、
  そのパネルそのものを上書きしない。
  専用コンテンツだけ探す。
  */
  const todayPanel =
    document.getElementById("today");

  if (todayPanel) {
    const nested =
      todayPanel.querySelector(
        "[data-today-money-content], .today-money-content, #todayMoneyContent"
      );

    if (nested) {
      targets.push(nested);
    }
  }

  /*
  重複除去
  */
  const uniqueTargets =
    [...new Set(targets)];

  if (!uniqueTargets.length) {
    return;
  }

  const childName =
    getEducationChildName();

  let html = "";

  if (data.count === 0) {
    html = `
      <div
        class="card today-money-empty"
        data-today-money-rendered="true"
      >
        <div class="education-big-icon">💰</div>

        <h3>
          ${
            educationIsKidMode()
              ? "きょうの おかねは まだ ないよ"
              : "今日のお金の記録はありません"
          }
        </h3>

        <p>
          ${
            educationIsKidMode()
              ? "おかねを いれると、ここに でてくるよ。"
              : "今日の入金・出金を記録すると、ここに表示されます。"
          }
        </p>
      </div>
    `;
  } else {
    html = `
      <div
        class="today-money-education"
        data-today-money-rendered="true"
      >

        <div class="education-current-child today-money-child">
          <div class="education-current-child-icon">
            👤
          </div>

          <div>
            <small>
              ${
                educationIsKidMode()
                  ? "いまの おともだち"
                  : "現在の対象"
              }
            </small>

            <strong>
              ${educationEscape(childName)}
            </strong>
          </div>
        </div>

        <div class="education-summary today-money-summary">

          <div>
            <strong>
              ${educationFormatYen(data.income)}
            </strong>

            <span>
              ${
                educationIsKidMode()
                  ? "はいった おかね"
                  : "今日の入金"
              }
            </span>
          </div>

          <div>
            <strong>
              ${educationFormatYen(data.outcome)}
            </strong>

            <span>
              ${
                educationIsKidMode()
                  ? "つかった おかね"
                  : "今日の出金"
              }
            </span>
          </div>

          <div>
            <strong>
              ${
                data.net >= 0
                  ? educationFormatYen(data.net)
                  : "-" +
                    educationFormatYen(
                      Math.abs(data.net)
                    )
              }
            </strong>

            <span>
              ${
                educationIsKidMode()
                  ? "きょうの さ"
                  : "今日の差額"
              }
            </span>
          </div>

        </div>

        <div class="card">
          <p>
            ${
              educationIsKidMode()
                ? "きょうの おかねの うごきだよ。"
                : "今日のお金の動きを確認できます。"
            }
          </p>
        </div>

      </div>
    `;
  }

  for (const target of uniqueTargets) {
    /*
    パネルそのものは上書きしない。
    */
    if (
      target.id === "today" &&
      target.classList.contains("panel")
    ) {
      continue;
    }

    target.innerHTML = html;
  }
}


/* ============================================================
   MARKET DATA
============================================================ */

function getEducationMarketData() {
  const result = [];

  try {
    let sourceState = null;

    if (
      typeof window.getKidsMoneyMarketState ===
      "function"
    ) {
      sourceState =
        window.getKidsMoneyMarketState();
    }

    if (
      !sourceState &&
      typeof marketState !== "undefined"
    ) {
      sourceState = marketState;
    }

    if (
      !sourceState ||
      !sourceState.markets
    ) {
      return result;
    }

    const markets =
      sourceState.markets;

    const definitions = [
      {
        key: "world",
        symbol: "WORLD",
        nameAdult: "全世界株式",
        nameKid: "せかいの かぶ"
      },
      {
        key: "sp",
        symbol: "S&P500",
        nameAdult: "S&P500",
        nameKid: "アメリカの かぶ"
      }
    ];

    for (const definition of definitions) {
      const data =
        markets[definition.key];

      if (
        !data ||
        !Array.isArray(data.series) ||
        data.series.length === 0
      ) {
        continue;
      }

      const latest =
        data.series[
          data.series.length - 1
        ];

      const previous =
        data.series.length >= 2
          ? data.series[
              data.series.length - 2
            ]
          : null;

      const value =
        Number(latest?.value);

      const previousValue =
        Number(previous?.value);

      if (!Number.isFinite(value)) {
        continue;
      }

      const change =
        Number.isFinite(previousValue) &&
        previousValue !== 0
          ? (
              (value - previousValue) /
              previousValue
            ) * 100
          : 0;

      result.push({
        key: definition.key,
        symbol: definition.symbol,
        name:
          educationIsKidMode()
            ? definition.nameKid
            : definition.nameAdult,
        value,
        previous:
          Number.isFinite(previousValue)
            ? previousValue
            : value,
        change,
        date:
          latest?.date || null
      });
    }

  } catch (error) {
    console.warn(
      "education market error",
      error
    );
  }

  return result;
}


function renderEducationMarket(target) {
  const market =
    getEducationMarketData();

  target.innerHTML = `
    ${renderEducationBackButton()}

    <div class="card">

      <h2>
        📈 ${educationLabel("market")}
      </h2>

      <p>
        ${
          educationText(
            "今日の値動きを見て、なぜ動いたのかを考えてみよう。",
            "きょう おかねが どう うごいたか みてみよう。"
          )
        }
      </p>

    </div>

    ${
      market.length === 0
        ? `
          <div class="card">

            <div class="education-empty-icon">
              📊
            </div>

            <h3>
              ${
                educationText(
                  "今日のデータはまだありません",
                  "きょうの データが まだ ないよ"
                )
              }
            </h3>

            <p>
              ${
                educationText(
                  "「お金」画面の「更新」を押すと最新データを取得できます。",
                  "「おかね」の がめんで「こうしん」を おしてみてね。"
                )
              }
            </p>

          </div>
        `
        : `
          <div class="market-learning-grid">
            ${market
              .map(
                renderMarketLearningCard
              )
              .join("")}
          </div>
        `
    }
  `;

  bindEducationButtons();
}


function renderMarketLearningCard(item) {
  const change =
    normalizeNumber(
      item.change,
      0
    );

  const sign =
    change > 0
      ? "+"
      : "";

  return `
    <article class="card market-learning-card">

      <div class="market-learning-symbol">
        ${educationEscape(item.symbol)}
      </div>

      <h3>
        ${educationEscape(item.name)}
      </h3>

      <strong>
        ${
          normalizeNumber(
            item.value,
            0
          ).toLocaleString("ja-JP")
        }
      </strong>

      <div class="market-change">
        ${sign}${change.toFixed(2)}%
      </div>

      <button
        type="button"
        class="secondary wide"
        data-market-why="${educationEscape(item.name)}"
      >
        ❓ ${
          educationText(
            "なぜ動いた？",
            "なぜ うごいたの？"
          )
        }
      </button>

    </article>
  `;
}


function openMarketWhy(name) {
  const target =
    document.getElementById(
      "educationContent"
    );

  if (!target) {
    return;
  }

  markLessonCompleted(
    `market-why-${name}`
  );

  target.innerHTML = `
    ${renderEducationBackButton()}

    <article class="card education-detail">

      <div class="education-big-icon">
        ❓
      </div>

      <h2>
        ${educationEscape(name)}
      </h2>

      <h3>
        ${
          educationText(
            "なぜ値段が動くの？",
            "なぜ うごくの？"
          )
        }
      </h3>

      <p>
        ${
          educationText(
            "会社の業績、景気、金利、世界のニュースなど、さまざまな理由で買いたい人と売りたい人のバランスが変わり、値段が動きます。",
            "かいしゃの ちょうしや ニュースなどで、ほしい ひとと いらない ひとが かわると ねだんが うごくよ。"
          )
        }
      </p>

      <div class="learn-example">

        <strong>
          💡 ${
            educationText(
              "ポイント",
              "おぼえておこう"
            )
          }
        </strong>

        <p>
          ${
            educationText(
              "上がったり下がったりしながら、長期的には成長していく特徴があります。",
              "あがったり さがったり しながら、ながい めで みると ふえていく ことが あるよ。"
            )
          }
        </p>

      </div>

    </article>
  `;

  bindEducationButtons();
}


/* ============================================================
   HOME
============================================================ */

function renderEducationHome(target) {
  const kid =
    educationIsKidMode();

  target.innerHTML = `

    <div
      class="education-current-child education-current-child-large"
      data-current-education-child="true"
    >

      <div class="education-current-child-icon">
        👤
      </div>

      <div class="education-current-child-info">

        <small>
          ${
            kid
              ? "いま べんきょうする ひと"
              : "現在の学習対象"
          }
        </small>

        <strong>
          ${educationEscape(
            getEducationChildName()
          )}
        </strong>

      </div>

    </div>


    <div class="education-menu">

      <button
        type="button"
        class="education-menu-card"
        data-education-mode="market"
      >
        <span>📈</span>

        <strong>
          ${educationLabel("market")}
        </strong>

        <small>
          ${
            kid
              ? "きょうの おかねを みよう"
              : "今日の値動きから学ぶ"
          }
        </small>

      </button>


      <button
        type="button"
        class="education-menu-card"
        data-education-mode="simulation"
      >
        <span>🧪</span>

        <strong>
          ${educationLabel("simulation")}
        </strong>

        <small>
          ${
            kid
              ? "おかねが どうなるか やってみよう"
              : "複利・暴落・インフレを体験"
          }
        </small>

      </button>


      <button
        type="button"
        class="education-menu-card"
        data-education-mode="goal"
      >
        <span>🎯</span>

        <strong>
          ${educationLabel("goal")}
        </strong>

        <small>
          ${
            kid
              ? "いつ たまるかな？"
              : "目標金額までの期間を計算"
          }
        </small>

      </button>


      <button
        type="button"
        class="education-menu-card"
        data-education-mode="quiz"
      >
        <span>🧠</span>

        <strong>
          ${educationLabel("quiz")}
        </strong>

        <small>
          ${
            kid
              ? "クイズで おぼえよう"
              : "金融知識をクイズで復習"
          }
        </small>

      </button>


      <button
        type="button"
        class="education-menu-card"
        data-education-mode="history"
      >
        <span>📚</span>

        <strong>
          ${educationLabel("history")}
        </strong>

        <small>
          ${
            kid
              ? "どれだけ まなんだかな"
              : "これまでの学習状況"
          }
        </small>

      </button>

    </div>


    <div class="education-summary">

      <div>
        <strong>
          ${educationState.studyDays}
        </strong>

        <span>
          ${
            kid
              ? "べんきょうしたひ"
              : "学習日数"
          }
        </span>
      </div>


      <div>
        <strong>
          ${educationState.quizCorrect}
        </strong>

        <span>
          ${
            kid
              ? "せいかい"
              : "正解数"
          }
        </span>
      </div>


      <div>
        <strong>
          ${
            educationState.completedLessons.length
          }
        </strong>

        <span>
          ${
            kid
              ? "まなんだこと"
              : "学習済み"
          }
        </span>
      </div>

    </div>
  `;

  bindEducationButtons();
}


/* ============================================================
   CURRENT CHILD DISPLAY
============================================================ */

function renderEducationCurrentChild() {
  const elements =
    document.querySelectorAll(
      "[data-current-education-child]"
    );

  if (!elements.length) {
    return;
  }

  const name =
    getEducationChildName();

  const kid =
    educationIsKidMode();

  for (const element of elements) {
    const nameElement =
      element.querySelector(
        "strong"
      );

    const labelElement =
      element.querySelector(
        "small"
      );

    if (nameElement) {
      nameElement.textContent =
        name;
    }

    if (labelElement) {
      labelElement.textContent =
        kid
          ? "いま べんきょうする ひと"
          : "現在の学習対象";
    }
  }
}


/* ============================================================
   QUIZ DATA
============================================================ */

function getBuiltInQuizQuestions() {
  return [

    {
      id: "percent-decrease",

      question:
        "10,000円が8,000円になりました。何％減った？",

      kidQuestion:
        "10000えんが 8000えんに なったよ。なん％ へった？",

      answer: 1,

      options: [
        {
          text: "10%",
          kid: "10%"
        },
        {
          text: "20%",
          kid: "20%"
        },
        {
          text: "30%",
          kid: "30%"
        }
      ],

      explanation:
        "2,000円減っているので、2,000 ÷ 10,000 = 20%です。",

      kidExplanation:
        "2000えん へったので、10000えんの 20%だよ。"
    },


    {
      id: "investment-risk",

      question:
        "投資したお金は減ることがある？",

      kidQuestion:
        "とうしした おかねは へることが ある？",

      answer: 1,

      options: [
        {
          text: "絶対に減らない",
          kid: "ぜったいに へらない"
        },
        {
          text: "減ることがある",
          kid: "へることが ある"
        },
        {
          text: "必ず半分になる",
          kid: "かならず はんぶんになる"
        }
      ],

      explanation:
        "投資には価格変動があるため、元本を下回ることがあります。",

      kidExplanation:
        "とうしは ねだんが うごくので、へることも あるよ。"
    },


    {
      id: "compound",

      question:
        "複利とはどんな仕組み？",

      kidQuestion:
        "ふくりって どんな しくみ？",

      answer: 1,

      options: [
        {
          text: "お金を使う仕組み",
          kid: "おかねを つかう しくみ"
        },
        {
          text: "増えた分も次の計算に使う仕組み",
          kid: "ふえた おかねも つぎの けいさんに つかう"
        },
        {
          text: "必ずお金が減る仕組み",
          kid: "かならず おかねが へる しくみ"
        }
      ],

      explanation:
        "複利では、元本だけでなく、それまでに増えた利益も次の運用に使われます。",

      kidExplanation:
        "ふえた おかねも つぎに ふえるために つかわれる しくみだよ。"
    },


    {
      id: "inflation",

      question:
        "インフレになると、同じ100円で買えるものはどうなる？",

      kidQuestion:
        "インフレに なると、100えんで かえるものは どうなる？",

      answer: 1,

      options: [
        {
          text: "増える",
          kid: "ふえる"
        },
        {
          text: "少なくなる",
          kid: "すくなくなる"
        },
        {
          text: "必ず2倍になる",
          kid: "かならず 2ばいになる"
        }
      ],

      explanation:
        "物価が上がると、同じ金額で買える量が少なくなります。",

      kidExplanation:
        "ものの ねだんが あがると、100えんで かえるものが すくなくなるよ。"
    },


    {
      id: "saving",

      question:
        "お金を貯めるときに大切なのは？",

      kidQuestion:
        "おかねを ためるときに たいせつなのは？",

      answer: 2,

      options: [
        {
          text: "全部使う",
          kid: "ぜんぶ つかう"
        },
        {
          text: "何も考えない",
          kid: "なにも かんがえない"
        },
        {
          text: "目的を決めて少しずつ貯める",
          kid: "もくひょうを きめて すこしずつ ためる"
        }
      ],

      explanation:
        "目的と金額を決めると、貯金を続けやすくなります。",

      kidExplanation:
        "なんのために いくら ためるか きめると つづけやすいよ。"
    },


    {
      id: "risk-return",

      question:
        "一般に、リスクが高い投資にはどんな特徴がある？",

      kidQuestion:
        "リスクが おおきい とうしには どんな とくちょうが ある？",

      answer: 1,

      options: [
        {
          text: "値段が絶対に動かない",
          kid: "ねだんが ぜったいに うごかない"
        },
        {
          text: "大きく増えることも減ることもある",
          kid: "おおきく ふえることも へることも ある"
        },
        {
          text: "必ず利益が出る",
          kid: "かならず もうかる"
        }
      ],

      explanation:
        "リスクが高い資産では、価格の変動幅が大きくなることがあります。",

      kidExplanation:
        "リスクが おおきいと、おかねが おおきく ふえたり へったりすることが あるよ。"
    },


    {
      id: "diversification",

      question:
        "分散投資の目的として近いものは？",

      kidQuestion:
        "ぶんさん とうしは なんのため？",

      answer: 1,

      options: [
        {
          text: "必ず利益を出す",
          kid: "かならず もうける"
        },
        {
          text: "一つのものに集中するリスクを減らす",
          kid: "ひとつに ぜんぶ かける リスクを へらす"
        },
        {
          text: "投資をしなくてよくする",
          kid: "とうしを しなくて よくする"
        }
      ],

      explanation:
        "複数の資産などに分けることで、一つの対象に集中するリスクを抑える考え方です。",

      kidExplanation:
        "いろいろな ものに わけると、ひとつが へったときの えいきょうを へらせるよ。"
    },


    {
      id: "interest",

      question:
        "金利が上がると、一般にお金を借りるコストはどうなる？",

      kidQuestion:
        "きんりが あがると、おかねを かりる おかねは どうなる？",

      answer: 1,

      options: [
        {
          text: "下がる",
          kid: "さがる"
        },
        {
          text: "上がりやすい",
          kid: "あがりやすい"
        },
        {
          text: "必ずゼロになる",
          kid: "かならず 0に なる"
        }
      ],

      explanation:
        "金利が上昇すると、一般に借入にかかる利息負担が増える方向に働きます。",

      kidExplanation:
        "きんりが あがると、おかねを かりるときの りそくが ふえることが あるよ。"
    },


    {
      id: "budget",

      question:
        "家計管理で最初に確認するとよいものは？",

      kidQuestion:
        "おかねの かんりで まず なにを みる？",

      answer: 0,

      options: [
        {
          text: "入ってくるお金と使うお金",
          kid: "はいってくる おかねと つかう おかね"
        },
        {
          text: "欲しいものだけ",
          kid: "ほしいものだけ"
        },
        {
          text: "値段の高いものだけ",
          kid: "たかいものだけ"
        }
      ],

      explanation:
        "収入と支出を把握すると、どれくらい貯められるか考えやすくなります。",

      kidExplanation:
        "はいってくる おかねと つかう おかねを しると、いくら ためられるか わかるよ。"
    },


    {
      id: "goal",

      question:
        "貯金の目標を立てるときに大切なのは？",

      kidQuestion:
        "おかねを ためる もくひょうで たいせつなのは？",

      answer: 2,

      options: [
        {
          text: "いつでも変更できないようにする",
          kid: "ぜったいに かえない"
        },
        {
          text: "金額を決めない",
          kid: "きんがくを きめない"
        },
        {
          text: "何のためにいくら必要か決める",
          kid: "なんのために いくら ひつようか きめる"
        }
      ],

      explanation:
        "目的と必要金額を具体的にすると、行動計画を作りやすくなります。",

      kidExplanation:
        "なんのために いくら ひつようか きめると、ためやすくなるよ。"
    },


    {
      id: "loss-recovery",

      question:
        "30%下落した資産が元の価格に戻るには、下落後から何%上昇が必要？",

      kidQuestion:
        "30% さがった おかねが もとに もどるには、なん％ ふえれば いい？",

      answer: 2,

      options: [
        {
          text: "30%",
          kid: "30%"
        },
        {
          text: "40%",
          kid: "40%"
        },
        {
          text: "約42.9%",
          kid: "やく42.9%"
        }
      ],

      explanation:
        "100が70になった場合、100に戻すには30÷70＝約42.9%の上昇が必要です。",

      kidExplanation:
        "100が70に なったら、70から100に もどすには やく42.9% ふえる ひつようが あるよ。"
    },


    {
      id: "cash-vs-investment",

      question:
        "使う予定が近いお金を管理するときに重要なのは？",

      kidQuestion:
        "すぐに つかう おかねを かんりするときに たいせつなのは？",

      answer: 0,

      options: [
        {
          text: "必要なときに使えるようにする",
          kid: "ひつような ときに つかえるように する"
        },
        {
          text: "必ず大きなリスクを取る",
          kid: "かならず おおきな リスクを とる"
        },
        {
          text: "全部投資する",
          kid: "ぜんぶ とうしする"
        }
      ],

      explanation:
        "近いうちに使う予定のお金は、必要なときに使えることが重要です。",

      kidExplanation:
        "すぐ つかう おかねは、ひつような ときに つかえるように しておくことが たいせつだよ。"
    }

  ];
}


/*
外部QUIZ_DATAがある場合も、
それだけを使わない。

現在の不具合では、
外部QUIZ_DATAの内容によっては1問しか
出題候補にならない可能性がある。

そのため、

1. 内蔵12問
2. 外部QUIZ_DATA

をID単位で統合する。
*/
function getQuizQuestions() {
  const builtIn =
    getBuiltInQuizQuestions();

  const questionMap =
    new Map();

  for (const question of builtIn) {
    if (!question) {
      continue;
    }

    const id =
      String(
        question.id ??
        `builtin-${questionMap.size}`
      );

    questionMap.set(
      id,
      question
    );
  }

  try {
    if (
      typeof QUIZ_DATA !== "undefined"
    ) {
      let external = [];

      if (
        Array.isArray(QUIZ_DATA)
      ) {
        external = QUIZ_DATA;
      } else if (
        Array.isArray(QUIZ_DATA.items)
      ) {
        external =
          QUIZ_DATA.items;
      }

      for (let i = 0; i < external.length; i++) {
        const question =
          external[i];

        if (!question) {
          continue;
        }

        const id =
          String(
            question.id ??
            `external-${i}`
          );

        /*
         * 外部データは既存の内蔵問題を壊さないように
         * マージする。特にkidQuestion / option.kid /
         * kidExplanationを保持する。
         */
        const builtInQuestion = questionMap.get(id);

        if (builtInQuestion) {
          const merged = {
            ...builtInQuestion,
            ...question,
            options: Array.isArray(question.options)
              ? question.options.map((option, optionIndex) => {
                  const baseOption = builtInQuestion.options?.[optionIndex];
                  if (
                    option &&
                    typeof option === "object" &&
                    baseOption &&
                    typeof baseOption === "object"
                  ) {
                    return {
                      ...baseOption,
                      ...option,
                      kid: option.kid ?? baseOption.kid
                    };
                  }
                  return option;
                })
              : builtInQuestion.options
          };

          questionMap.set(id, merged);
        } else {
          questionMap.set(id, question);
        }
      }
    }
  } catch (error) {
    console.warn(
      "QUIZ_DATA unavailable",
      error
    );
  }

  return Array.from(
    questionMap.values()
  );
}


/* ============================================================
   QUIZ DECK
============================================================ */

function loadQuizDecks() {
  try {
    const raw = localStorage.getItem(QUIZ_DECK_STORAGE_KEY);

    if (!raw) {
      quizDecksByChild = {};
      recentQuizQuestionIdsByChild = {};
      return;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      quizDecksByChild = {};
      recentQuizQuestionIdsByChild = {};
      return;
    }

    quizDecksByChild =
      parsed.children && typeof parsed.children === "object"
        ? parsed.children
        : {};

    recentQuizQuestionIdsByChild =
      parsed.recent && typeof parsed.recent === "object"
        ? parsed.recent
        : {};
  } catch (error) {
    console.warn("quiz deck load error", error);
    quizDecksByChild = {};
    recentQuizQuestionIdsByChild = {};
  }
}

function saveQuizDecks() {
  try {
    localStorage.setItem(
      QUIZ_DECK_STORAGE_KEY,
      JSON.stringify({
        version: QUIZ_DECK_VERSION,
        children: quizDecksByChild,
        recent: recentQuizQuestionIdsByChild
      })
    );
  } catch (error) {
    console.warn("quiz deck save error", error);
  }
}

function shuffleArray(array) {
  const result =
    Array.isArray(array)
      ? [...array]
      : [];

  /*
  Fisher-Yates
  */
  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      result[i],
      result[j]
    ] = [
      result[j],
      result[i]
    ];
  }

  return result;
}


function getQuizIds() {
  return getQuizQuestions().map((question, index) =>
    String(question?.id ?? `question-${index}`)
  );
}

function ensureQuizDeckForChild(childId = null, forceReset = false) {
  const id = String(childId ?? getEducationChildId());
  const ids = getQuizIds();

  if (!ids.length) {
    quizDecksByChild[id] = [];
    return [];
  }

  const valid = new Set(ids);
  const existing = Array.isArray(quizDecksByChild[id])
    ? quizDecksByChild[id].map(String).filter(qid => valid.has(qid))
    : [];

  const unique = [...new Set(existing)];
  const missing = ids.filter(qid => !unique.includes(qid));

  let deck = forceReset ? [] : unique;

  if (!deck.length) {
    deck = shuffleArray(ids);
  } else if (missing.length) {
    deck = [...deck, ...shuffleArray(missing)];
  }

  quizDecksByChild[id] = deck;
  saveQuizDecks();
  return deck;
}

function takeNextQuizQuestion() {
  const childId = String(getEducationChildId());
  const questions = getQuizQuestions();

  if (!questions.length) return null;

  let deck = ensureQuizDeckForChild(childId);
  const recent = Array.isArray(recentQuizQuestionIdsByChild[childId])
    ? recentQuizQuestionIdsByChild[childId].map(String)
    : [];

  /*
   * 直前に出した問題を最優先で避ける。
   * 問題が2問以上あれば、同じ問題の連続出題を必ず防止。
   */
  const lastId = recent[recent.length - 1] || null;

  if (!deck.length) {
    deck = shuffleArray(getQuizIds());
  }

  let position = deck.findIndex(id => String(id) !== String(lastId));

  /*
   * デッキ内に別問題がない場合のみ同一問題を許可。
   * 通常の12問構成ではここには到達しない。
   */
  if (position < 0) position = 0;

  const questionId = String(deck.splice(position, 1)[0]);

  /*
   * 1周分を使い切ったら、全問題を再シャッフル。
   * 今出した問題は次周の先頭候補から外す。
   */
  if (!deck.length) {
    deck = shuffleArray(
      getQuizIds().filter(id => String(id) !== questionId)
    );
  }

  quizDecksByChild[childId] = deck;

  const nextRecent = [...recent.filter(id => id !== questionId), questionId]
    .slice(-5);
  recentQuizQuestionIdsByChild[childId] = nextRecent;

  saveQuizDecks();

  const index = questions.findIndex(
    question => String(question?.id) === questionId
  );

  if (index < 0) return null;

  return {
    index,
    question: questions[index]
  };
}


/* ============================================================
   QUIZ RENDER
============================================================ */

function renderEducationQuiz(target) {
  const questions =
    getQuizQuestions();

  if (
    !Array.isArray(questions) ||
    questions.length === 0
  ) {
    target.innerHTML = `
      ${renderEducationBackButton()}

      <div class="card">

        <p>
          ${
            educationText(
              "クイズデータがありません。",
              "クイズが みつからないよ。"
            )
          }
        </p>

      </div>
    `;

    bindEducationButtons();
    return;
  }

  const selected =
    takeNextQuizQuestion();

  if (!selected) {
    target.innerHTML = `
      ${renderEducationBackButton()}

      <div class="card">

        <p>
          ${
            educationText(
              "クイズを読み込めませんでした。",
              "クイズを よみこめなかったよ。"
            )
          }
        </p>

      </div>
    `;

    bindEducationButtons();
    return;
  }

  const question =
    selected.question;

  const index =
    selected.index;

  const questionId =
    String(
      question.id ??
      `question-${index}`
    );

  currentQuizQuestionId =
    questionId;

  currentQuizQuestionIndex =
    index;

  currentQuizAnswered =
    false;

  const questionText =
    educationIsKidMode()
      ? (
          question.kidQuestion ??
          "この もんだいの せつめいは じゅんびちゅうだよ。"
        )
      : (
          question.question ??
          ""
        );

  target.innerHTML = `

    ${renderEducationBackButton()}

    <article
      class="card quiz-card"
      data-current-quiz-id="${educationEscape(questionId)}"
    >

      <span class="quiz-number">
        🧠 ${educationLabel("quiz")}
      </span>

      <div class="quiz-progress">
        ${
          educationText(
            "次々といろいろな問題に挑戦しよう",
            "いろんな クイズに ちょうせんしよう"
          )
        }
      </div>

      <h2>
        ${educationEscape(questionText)}
      </h2>

      <div class="quiz-options">

        ${
          Array.isArray(
            question.options
          )
            ? question.options
                .map(
                  (
                    option,
                    optionIndex
                  ) => {

                    const text =
                      educationIsKidMode()
                        ? (
                            option?.kid ??
                            "こたえを えらんでね"
                          )
                        : (
                            option?.text ??
                            option
                          );

                    return `
                      <button
                        type="button"
                        class="quiz-option"
                        data-quiz-answer="${optionIndex}"
                        data-quiz-question-id="${educationEscape(questionId)}"
                      >
                        ${educationEscape(text)}
                      </button>
                    `;
                  }
                )
                .join("")
            : ""
        }

      </div>

      <div id="quizResult"></div>

    </article>
  `;

  target.dataset.quizIndex =
    String(index);

  target.dataset.quizQuestionId =
    questionId;

  bindEducationButtons();
}


/* ============================================================
   NEXT QUIZ
============================================================ */

function nextQuiz() {
  resetCurrentQuizState();

  const target =
    document.getElementById(
      "educationContent"
    );

  if (target) {
    renderEducationQuiz(target);
  }
}


/* ============================================================
   QUIZ ANSWER
============================================================ */

function answerQuiz(answer) {
  const resultTarget =
    document.getElementById(
      "quizResult"
    );

  const content =
    document.getElementById(
      "educationContent"
    );

  if (
    !resultTarget ||
    !content ||
    currentQuizAnswered
  ) {
    return;
  }

  const questions =
    getQuizQuestions();

  const questionId =
    content.dataset.quizQuestionId ||
    currentQuizQuestionId;

  const question =
    questions.find(
      item =>
        String(
          item?.id ?? ""
        ) ===
        String(questionId)
    );

  if (!question) {
    const index =
      Number(
        content.dataset.quizIndex
      );

    if (
      Number.isInteger(index) &&
      questions[index]
    ) {
      processQuizAnswer(
        answer,
        questions[index],
        resultTarget
      );
    }

    return;
  }

  processQuizAnswer(
    answer,
    question,
    resultTarget
  );
}


function processQuizAnswer(
  answer,
  question,
  target
) {
  if (currentQuizAnswered) {
    return;
  }

  currentQuizAnswered =
    true;

  const correctAnswer =
    normalizeNumber(
      question.answer,
      -999
    );

  const userAnswer =
    normalizeNumber(
      answer,
      -999
    );

  const correct =
    userAnswer ===
    correctAnswer;

  educationState.quizAnswered =
    Math.max(
      0,
      Math.floor(
        normalizeNumber(
          educationState.quizAnswered,
          0
        )
      )
    ) + 1;

  if (correct) {
    educationState.quizCorrect =
      Math.max(
        0,
        Math.floor(
          normalizeNumber(
            educationState.quizCorrect,
            0
          )
        )
      ) + 1;
  }

  if (question.id) {
    markLessonCompleted(
      `quiz-${question.id}`
    );
  }

  saveActiveEducationState();

  const explanation =
    educationIsKidMode()
      ? (
          question.kidExplanation ??
          "せつめいを じゅんびしているよ。"
        )
      : (
          question.explanation ??
          ""
        );

  target.innerHTML = `

    <div class="quiz-result">

      <div class="quiz-result-icon">
        ${correct ? "⭕" : "❌"}
      </div>

      <h3>
        ${
          correct
            ? "せいかい！"
            : educationText(
                "残念！",
                "ざんねん！"
              )
        }
      </h3>

      <p>
        ${
          correct
            ? educationText(
                "正解です。少しずつ金融知識を身につけていきましょう。",
                "せいかい！すこしずつ おかねの ことを おぼえていこう。"
              )
            : educationText(
                "間違っても大丈夫です。解説を読んで覚えましょう。",
                "まちがえても だいじょうぶ。せつめいを よんで おぼえよう。"
              )
        }
      </p>

      ${
        explanation
          ? `
            <div class="learn-example">

              <strong>
                💡 ${educationLabel("explanation")}
              </strong>

              <p>
                ${educationEscape(
                  explanation
                )}
              </p>

            </div>
          `
          : ""
      }

      <button
        type="button"
        class="primary wide"
        id="nextQuizButton"
      >
        ${educationLabel("next")}
      </button>

    </div>
  `;

  document
    .querySelectorAll(
      ".quiz-option"
    )
    .forEach(
      button => {
        button.disabled =
          true;

        const optionIndex =
          Number(
            button.dataset.quizAnswer
          );

        if (
          optionIndex ===
          correctAnswer
        ) {
          button.classList.add(
            "correct"
          );
        }

        if (
          optionIndex ===
            userAnswer &&
          !correct
        ) {
          button.classList.add(
            "incorrect"
          );
        }
      }
    );

  document
    .getElementById(
      "nextQuizButton"
    )
    ?.addEventListener(
      "click",
      nextQuiz
    );
}


/* ============================================================
   SIMULATION
============================================================ */

function renderEducationSimulation(target) {
  target.innerHTML = `

    ${renderEducationBackButton()}

    <div class="simulation-tabs">

      <button
        type="button"
        class="active"
        data-simulation="compound"
      >
        🌱 ${
          educationText(
            "複利",
            "ふくり"
          )
        }
      </button>

      <button
        type="button"
        data-simulation="crash"
      >
        📉 ${
          educationText(
            "暴落",
            "ぼうらく"
          )
        }
      </button>

      <button
        type="button"
        data-simulation="inflation"
      >
        🛒 ${
          educationText(
            "インフレ",
            "インフレ"
          )
        }
      </button>

    </div>

    <div id="simulationContent"></div>
  `;

  renderCompoundSimulation();

  bindEducationButtons();
}


function bindSimulationButtons() {
  document
    .querySelectorAll(
      "[data-simulation]"
    )
    .forEach(
      button => {

        button.onclick =
          event => {

            event.preventDefault();

            document
              .querySelectorAll(
                "[data-simulation]"
              )
              .forEach(
                currentButton =>
                  currentButton.classList.remove(
                    "active"
                  )
              );

            button.classList.add(
              "active"
            );

            const mode =
              button.dataset.simulation;

            if (
              mode ===
              "compound"
            ) {
              renderCompoundSimulation();

            } else if (
              mode ===
              "crash"
            ) {
              renderCrashSimulation();

            } else if (
              mode ===
              "inflation"
            ) {
              renderInflationSimulation();
            }
          };
      }
    );
}


function renderCompoundSimulation() {
  const target =
    document.getElementById(
      "simulationContent"
    );

  if (!target) {
    return;
  }

  target.innerHTML = `

    <div class="card">

      <h2>
        🌱 ${
          educationText(
            "複利シミュレーション",
            "ふくり けいさん"
          )
        }
      </h2>

      <label>
        ${
          educationText(
            "初期金額",
            "はじめの おかね"
          )
        }

        <input
          id="compoundPrincipal"
          type="number"
          value="10000"
          min="0"
          step="1000"
        >
      </label>

      <label>
        ${
          educationText(
            "年間利率 (%)",
            "ねんりつ (%)"
          )
        }

        <input
          id="compoundRate"
          type="number"
          value="5"
          min="-100"
          max="100"
          step="0.1"
        >
      </label>

      <label>
        ${
          educationText(
            "期間 (年)",
            "なんねん (ねん)"
          )
        }

        <input
          id="compoundYears"
          type="number"
          value="10"
          min="1"
          max="50"
        >
      </label>

      <button
        type="button"
        class="primary wide"
        id="runCompound"
      >
        ${educationLabel("calculate")}
      </button>

    </div>

    <div id="compoundResult"></div>
  `;

  document
    .getElementById(
      "runCompound"
    )
    ?.addEventListener(
      "click",
      calculateCompound
    );
}


function calculateCompound() {
  const principal =
    normalizeNumber(
      document.getElementById(
        "compoundPrincipal"
      )?.value,
      0
    );

  const rate =
    normalizeNumber(
      document.getElementById(
        "compoundRate"
      )?.value,
      0
    ) / 100;

  const years =
    normalizeNumber(
      document.getElementById(
        "compoundYears"
      )?.value,
      0
    );

  const target =
    document.getElementById(
      "compoundResult"
    );

  if (!target) {
    return;
  }

  if (
    principal < 0 ||
    years <= 0 ||
    rate <= -1 ||
    rate > 1
  ) {
    target.innerHTML = `
      <div class="card">

        <p>
          ⚠️ ${
            educationText(
              "入力値を確認してください。",
              "すうじを かくにんしてね。"
            )
          }
        </p>

      </div>
    `;

    return;
  }

  const result =
    principal *
    Math.pow(
      1 + rate,
      years
    );

  target.innerHTML = `
    <div class="card simulation-result">

      <h3>
        🌱 ${educationLabel("result")}
      </h3>

      <div class="simulation-number">
        ${educationFormatYen(result)}
      </div>

      <p>
        ${
          educationText(
            `${years}年間、毎年${(rate * 100).toFixed(1)}%で運用できた場合の計算結果です。`,
            `${years}ねんで おかねが どう ふえるかの れいだよ。`
          )
        }
      </p>

    </div>
  `;

  markScenarioViewed(
    "compound"
  );
}


function renderCrashSimulation() {
  const target =
    document.getElementById(
      "simulationContent"
    );

  if (!target) {
    return;
  }

  target.innerHTML = `

    <div class="card">

      <h2>
        📉 ${
          educationText(
            "暴落シミュレーション",
            "ぼうらく けいさん"
          )
        }
      </h2>

      <label>
        ${
          educationText(
            "元のお金",
            "はじめの おかね"
          )
        }

        <input
          id="crashPrincipal"
          type="number"
          value="100000"
          min="0"
          step="10000"
        >
      </label>

      <label>
        ${
          educationText(
            "下落率 (%)",
            "どれくらい さがった？ (%)"
          )
        }

        <input
          id="crashRate"
          type="number"
          value="30"
          min="1"
          max="99"
          step="1"
        >
      </label>

      <button
        type="button"
        class="primary wide"
        id="runCrash"
      >
        ${educationLabel("calculate")}
      </button>

    </div>

    <div id="crashResult"></div>
  `;

  document
    .getElementById(
      "runCrash"
    )
    ?.addEventListener(
      "click",
      calculateCrash
    );
}


function calculateCrash() {
  const principal =
    normalizeNumber(
      document.getElementById(
        "crashPrincipal"
      )?.value,
      0
    );

  const rate =
    normalizeNumber(
      document.getElementById(
        "crashRate"
      )?.value,
      0
    ) / 100;

  const target =
    document.getElementById(
      "crashResult"
    );

  if (!target) {
    return;
  }

  if (
    principal <= 0 ||
    rate <= 0 ||
    rate >= 1
  ) {
    target.innerHTML = `
      <div class="card">

        <p>
          ⚠️ ${
            educationText(
              "入力値を確認してください。",
              "すうじを かくにんしてね。"
            )
          }
        </p>

      </div>
    `;

    return;
  }

  const after =
    principal *
    (1 - rate);

  const required =
    (
      (principal / after) -
      1
    ) * 100;

  target.innerHTML = `
    <div class="card simulation-result">

      <h3>
        📉 ${educationLabel("result")}
      </h3>

      <p>
        ${educationFormatYen(principal)}
        →
        <strong>
          ${educationFormatYen(after)}
        </strong>
      </p>

      <p>
        ${
          educationText(
            "元に戻るために必要な上昇率",
            "もとに もどるために ひつような あがりはば"
          )
        }:
      </p>

      <div class="simulation-number">
        +${required.toFixed(1)}%
      </div>

    </div>
  `;

  markScenarioViewed(
    "crash"
  );
}


function renderInflationSimulation() {
  const target =
    document.getElementById(
      "simulationContent"
    );

  if (!target) {
    return;
  }

  target.innerHTML = `

    <div class="card">

      <h2>
        🛒 ${
          educationText(
            "インフレシミュレーション",
            "インフレ けいさん"
          )
        }
      </h2>

      <label>
        ${
          educationText(
            "現在の金額",
            "いまの おかね"
          )
        }

        <input
          id="inflationMoney"
          type="number"
          value="100000"
          min="0"
          step="10000"
        >
      </label>

      <label>
        ${
          educationText(
            "年間インフレ率 (%)",
            "ものの ねだんの あがりはば (%)"
          )
        }

        <input
          id="inflationRate"
          type="number"
          value="2"
          min="0"
          max="100"
          step="0.1"
        >
      </label>

      <label>
        ${
          educationText(
            "期間 (年)",
            "なんねんご？ (ねん)"
          )
        }

        <input
          id="inflationYears"
          type="number"
          value="10"
          min="1"
          max="50"
        >
      </label>

      <button
        type="button"
        class="primary wide"
        id="runInflation"
      >
        ${educationLabel("calculate")}
      </button>

    </div>

    <div id="inflationResult"></div>
  `;

  document
    .getElementById(
      "runInflation"
    )
    ?.addEventListener(
      "click",
      calculateInflation
    );
}


function calculateInflation() {
  const money =
    normalizeNumber(
      document.getElementById(
        "inflationMoney"
      )?.value,
      0
    );

  const rate =
    normalizeNumber(
      document.getElementById(
        "inflationRate"
      )?.value,
      0
    ) / 100;

  const years =
    normalizeNumber(
      document.getElementById(
        "inflationYears"
      )?.value,
      0
    );

  const target =
    document.getElementById(
      "inflationResult"
    );

  if (!target) {
    return;
  }

  const multiplier =
    Math.pow(
      1 + rate,
      years
    );

  const futurePrice =
    money * multiplier;

  target.innerHTML = `
    <div class="card simulation-result">

      <h3>
        🛒 ${educationLabel("result")}
      </h3>

      <p>
        ${
          educationText(
            `${years}年後に同じものを買うために必要な金額`,
            `${years}ねんごに おなじ ものを かうのに ひつような おかね`
          )
        }:
      </p>

      <div class="simulation-number">
        ${educationFormatYen(futurePrice)}
      </div>

    </div>
  `;

  markScenarioViewed(
    "inflation"
  );
}


/* ============================================================
   GOAL
============================================================ */

function renderEducationGoal(target) {
  target.innerHTML = `

    ${renderEducationBackButton()}

    <div class="card">

      <h2>
        🎯 ${educationLabel("goal")}
      </h2>

      <label>
        ${
          educationText(
            "現在の貯金額",
            "いまの おかね"
          )
        }

        <input
          id="goalCurrent"
          type="number"
          value="0"
          min="0"
          step="1000"
        >
      </label>

      <label>
        ${
          educationText(
            "目標金額",
            "ほしい おかね"
          )
        }

        <input
          id="goalTarget"
          type="number"
          value="50000"
          min="1"
          step="1000"
        >
      </label>

      <label>
        ${
          educationText(
            "毎月の積立額",
            "まいつき ためられる おかね"
          )
        }

        <input
          id="goalMonthly"
          type="number"
          value="5000"
          min="1"
          step="500"
        >
      </label>

      <button
        type="button"
        class="primary wide"
        id="runGoal"
      >
        ${educationLabel("calculate")}
      </button>

    </div>

    <div id="goalResult"></div>
  `;

  document
    .getElementById(
      "runGoal"
    )
    ?.addEventListener(
      "click",
      calculateGoal
    );

  bindEducationButtons();
}


function calculateGoal() {
  const current =
    normalizeNumber(
      document.getElementById(
        "goalCurrent"
      )?.value,
      0
    );

  const targetAmount =
    normalizeNumber(
      document.getElementById(
        "goalTarget"
      )?.value,
      0
    );

  const monthly =
    normalizeNumber(
      document.getElementById(
        "goalMonthly"
      )?.value,
      0
    );

  const target =
    document.getElementById(
      "goalResult"
    );

  if (!target) {
    return;
  }

  if (
    targetAmount <= current
  ) {
    target.innerHTML = `
      <div class="card">

        🎉 ${
          educationText(
            "すでに目標金額に到達しています！",
            "もう もくひょうを たっせい しているよ！"
          )
        }

      </div>
    `;

    markLessonCompleted(
      "goal"
    );

    return;
  }

  if (monthly <= 0) {
    target.innerHTML = `
      <div class="card">

        ⚠️ ${
          educationText(
            "毎月の積立額を入力してください。",
            "まいつき ためる おかねを いれてね。"
          )
        }

      </div>
    `;

    return;
  }

  const diff =
    targetAmount -
    current;

  const months =
    Math.ceil(
      diff / monthly
    );

  const years =
    Math.floor(
      months / 12
    );

  const remMonths =
    months % 12;

  let durationText = "";

  if (years > 0) {
    durationText +=
      educationIsKidMode()
        ? `${years}ねん`
        : `${years}年`;
  }

  if (remMonths > 0) {
    durationText +=
      educationIsKidMode()
        ? `${remMonths}かげつ`
        : `${remMonths}か月`;
  }

  if (!durationText) {
    durationText =
      educationIsKidMode()
        ? "すぐ"
        : "すぐ";
  }

  target.innerHTML = `

    <div class="card simulation-result">

      <h3>
        🎯 ${
          educationText(
            "達成までの期間",
            "たっせいするまでの じかん"
          )
        }
      </h3>

      <div class="simulation-number">
        ${durationText}
      </div>

      <p>
        ${
          educationIsKidMode()
            ? `あと ${diff.toLocaleString("ja-JP")}えん ためよう！`
            : `あと ${diff.toLocaleString("ja-JP")}円 貯める必要があります。`
        }
      </p>

    </div>
  `;

  markLessonCompleted(
    "goal"
  );
}


/* ============================================================
   HISTORY
============================================================ */

function renderEducationHistory(target) {
  const kid =
    educationIsKidMode();

  const answered =
    Math.max(
      0,
      normalizeNumber(
        educationState.quizAnswered,
        0
      )
    );

  const correct =
    Math.max(
      0,
      normalizeNumber(
        educationState.quizCorrect,
        0
      )
    );

  target.innerHTML = `

    ${renderEducationBackButton()}

    <div class="card">

      <h2>
        📚 ${educationLabel("history")}
      </h2>

      <p>
        ${
          educationText(
            "これまでの学習実績です。",
            "これまでに まなんだ きろくだよ。"
          )
        }
      </p>

      <div
        class="education-summary"
        style="margin-top:16px;"
      >

        <div>

          <strong>
            ${educationState.studyDays}
          </strong>

          <span>
            ${
              kid
                ? "べんきょうしたひ"
                : "学習日数"
            }
          </span>

        </div>


        <div>

          <strong>
            ${correct} / ${answered}
          </strong>

          <span>
            ${
              kid
                ? "せいかい / といたかず"
                : "正解数 / 回答数"
            }
          </span>

        </div>


        <div>

          <strong>
            ${
              educationState
                .completedLessons
                .length
            }
          </strong>

          <span>
            ${
              kid
                ? "まなんだこと"
                : "完了レッスン"
            }
          </span>

        </div>

      </div>

    </div>
  `;

  bindEducationButtons();
}


/* ============================================================
   BINDING
============================================================ */

function bindEducationButtons() {

  document
    .querySelectorAll(
      "[data-education-mode]"
    )
    .forEach(
      button => {

        button.onclick =
          event => {

            event.preventDefault();
            event.stopPropagation();

            navigateEducationMode(
              button.dataset
                .educationMode
            );
          };
      }
    );


  document
    .querySelectorAll(
      "[data-education-back]"
    )
    .forEach(
      button => {

        button.onclick =
          event => {

            event.preventDefault();
            event.stopPropagation();

            goBackEducation();
          };
      }
    );


  document
    .querySelectorAll(
      "[data-market-why]"
    )
    .forEach(
      button => {

        button.onclick =
          event => {

            event.preventDefault();
            event.stopPropagation();

            openMarketWhy(
              button.dataset.marketWhy
            );
          };
      }
    );


  document
    .querySelectorAll(
      "[data-quiz-answer]"
    )
    .forEach(
      button => {

        button.onclick =
          event => {

            event.preventDefault();
            event.stopPropagation();

            const qId =
              button.dataset
                .quizQuestionId;

            /*
            古い問題のボタンから
            回答されるのを防止。
            */
            if (
              qId &&
              currentQuizQuestionId &&
              String(qId) !==
                String(
                  currentQuizQuestionId
                )
            ) {
              return;
            }

            answerQuiz(
              button.dataset
                .quizAnswer
            );
          };
      }
    );


  bindSimulationButtons();
}


/* ============================================================
   RENDER
============================================================ */

function renderEducation() {
  const target =
    document.getElementById(
      "educationContent"
    );

  if (!target) {
    return;
  }

  /*
  selectedChildIdと
  education側のactiveChildIdが
  一致していない場合は、
  新しい子どもの状態をロードする。

  ただし旧状態保存は
  refreshEducationForChildChange()
  で先に実施する。
  */
  const currentChildId =
    getEducationChildId();

  if (
    activeEducationChildId !==
    currentChildId
  ) {
    loadCurrentChildEducationState(
      currentChildId
    );

    resetCurrentQuizState();
  }

  recordStudy();

  if (
    educationMode ===
    "market"
  ) {
    renderEducationMarket(
      target
    );

    return;
  }

  if (
    educationMode ===
    "simulation"
  ) {
    renderEducationSimulation(
      target
    );

    return;
  }

  if (
    educationMode ===
    "goal"
  ) {
    renderEducationGoal(
      target
    );

    return;
  }

  if (
    educationMode ===
    "quiz"
  ) {
    renderEducationQuiz(
      target
    );

    return;
  }

  if (
    educationMode ===
    "history"
  ) {
    renderEducationHistory(
      target
    );

    return;
  }

  renderEducationHome(
    target
  );
}


/* ============================================================
   OPEN EDUCATION MODE
============================================================ */

function openEducationMode(mode) {
  resetCurrentQuizState();

  educationHistory = [];

  educationMode =
    mode;

  renderEducation();
}


/* ============================================================
   GLOBAL API
============================================================ */

window.getKidsMoneyEducationState =
  function () {
    return educationState;
  };


window.getKidsMoneyEducationStates =
  function () {
    return educationStatesByChild;
  };


window.getKidsMoneyEducationChildId =
  function () {
    return activeEducationChildId;
  };


window.getKidsMoneyTodayEducation =
  function () {
    return getTodayMoneyEducationData();
  };


window.renderKidsMoneyTodayEducation =
  function () {
    renderTodayMoneyEducation();
  };


window.renderKidsMoneyEducation =
  function () {
    renderEducation();
  };


window.openKidsMoneyEducationMode =
  function (mode) {
    openEducationMode(mode);
  };


/* ============================================================
   APP.JS EVENT CONNECTION
============================================================ */

/*
子ども切替。

重要：
app.js側でselectedChildIdが変更された後に
このイベントが来る。

そのためeducation.jsでは
activeEducationChildIdを使って
旧状態を保存する。
*/
window.addEventListener(
  "kidsMoneyChildChanged",
  event => {

    try {
      const detail = event?.detail || null;

      if (
        detail.reason === "delete" &&
        detail.previousChildId
      ) {
        delete educationStatesByChild[String(detail.previousChildId)];
        saveQuizDecks();
        saveAllEducationStates();
      }

      refreshEducationForChildChange(detail);
    } catch (error) {
      console.error(
        "education child change error",
        error
      );
    }
  }
);


/*
Kidモード切替。
*/
window.addEventListener(
  "kidsMoneyKidModeChanged",
  () => {

    try {
      /*
      表示だけ変更。
      学習記録は変更しない。
      */
      renderEducation();

      renderTodayMoneyEducation();

      renderEducationCurrentChild();

    } catch (error) {
      console.error(
        "education kid mode change error",
        error
      );
    }
  }
);


/*
Marketデータ更新。
*/
window.addEventListener(
  "kidsMoneyMarketChanged",
  () => {

    try {

      if (
        educationMode ===
        "market"
      ) {
        renderEducation();
      }

    } catch (error) {
      console.error(
        "education market change error",
        error
      );
    }
  }
);


/*
app.jsのkidsMoneyRenderedにも対応。

既存app.jsとの互換性を高める。
*/
window.addEventListener(
  "kidsMoneyRendered",
  () => {

    try {
      renderTodayMoneyEducation();
      renderEducationCurrentChild();
    } catch (error) {
      console.warn(
        "education rendered sync error",
        error
      );
    }
  }
);


/* ============================================================
   INITIALIZATION
============================================================ */

function initEducation() {

  /*
  教育状態をロード。
  */
  loadEducationState();

  /*
  クイズデッキをロード。
  */
  loadQuizDecks();

  /*
  現在の子どものクイズデッキを確保。
  */
  ensureQuizDeckForChild(
    getEducationChildId()
  );

  /*
  初期クイズ状態。
  */
  resetCurrentQuizState();

  /*
  初期表示。
  */
  renderEducation();

  /*
  今日のお金。
  */
  renderTodayMoneyEducation();

  /*
  現在の子ども表示。
  */
  renderEducationCurrentChild();

  /*
  app.js側にreadyイベントを通知。
  */
  window.dispatchEvent(
    new CustomEvent(
      "kidsMoneyEducationReady",
      {
        detail: {
          childId:
            getEducationChildId()
        }
      }
    )
  );
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
    initEducation,
    {
      once: true
    }
  );
} else {
  initEducation();
}