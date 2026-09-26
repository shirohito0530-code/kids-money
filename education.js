"use strict";

/*
============================================================
こどもマネー・ラボ V2.7
教育機能統合モジュール

V2.4 今日の値動き・なぜ？
V2.5 もしもシミュレーション
     ・複利
     ・暴落
     ・インフレ
V2.6 目標貯金
V2.7 クイズ・学習履歴

主な改善
・JST基準の学習日管理
・localStorageデータの安全な復元
・学習履歴の記録
・シミュレーション利用履歴
・クイズ二重回答防止
・クイズ解説
・入力値バリデーション
・NaN / Infinity対策
・XSS対策
・Kidモード対応
・教育画面の直前画面へ戻るナビゲーション
・教育画面の画面履歴管理
============================================================
*/


/* ============================================================
   State
============================================================ */

const EDUCATION_STATE_KEY =
  "kidsMoneyEducationV27";


const DEFAULT_EDUCATION_STATE = {
  quizCorrect: 0,
  quizAnswered: 0,

  learnedGlossary: [],

  completedLessons: [],

  viewedScenarios: [],

  lastStudyDate: null,

  studyDays: 0,

  currentQuizAnswered: false
};


let educationState = {
  ...DEFAULT_EDUCATION_STATE
};


/*
 * 現在表示している教育画面
 *
 * home
 * market
 * simulation
 * goal
 * quiz
 * history
 */
let educationMode = "home";


/*
 * 教育画面の遷移履歴
 *
 * 例：
 *
 * home
 *   ↓
 * market
 *   ↓
 * market-detail
 *
 * 戻る
 *
 * market
 *
 *
 * ※ market-detail のような詳細画面は
 *   educationMode とは別に履歴へ保存する。
 */
let educationHistory = [];


/*
 * 履歴に保存できる最大件数
 *
 * 無制限に増えないよう安全側に制限する。
 */
const EDUCATION_HISTORY_LIMIT = 20;


/* ============================================================
   初期化
============================================================ */

function initEducation() {

  loadEducationState();

  educationHistory = [];

  educationMode = "home";

  renderEducation();

}


/* ============================================================
   State
============================================================ */

function normalizeEducationState(parsed) {

  if (
    !parsed ||
    typeof parsed !== "object"
  ) {
    return {
      ...DEFAULT_EDUCATION_STATE
    };
  }


  const state = {
    ...DEFAULT_EDUCATION_STATE,
    ...parsed
  };


  state.quizCorrect =
    normalizeNumber(
      state.quizCorrect,
      0
    );


  state.quizAnswered =
    normalizeNumber(
      state.quizAnswered,
      0
    );


  state.studyDays =
    normalizeNumber(
      state.studyDays,
      0
    );


  state.learnedGlossary =
    Array.isArray(
      state.learnedGlossary
    )
      ? state.learnedGlossary
      : [];


  state.completedLessons =
    Array.isArray(
      state.completedLessons
    )
      ? state.completedLessons
      : [];


  state.viewedScenarios =
    Array.isArray(
      state.viewedScenarios
    )
      ? state.viewedScenarios
      : [];


  state.lastStudyDate =
    typeof state.lastStudyDate === "string"
      ? state.lastStudyDate
      : null;


  state.currentQuizAnswered =
    state.currentQuizAnswered === true;


  return state;

}


function loadEducationState() {

  try {

    const raw =
      localStorage.getItem(
        EDUCATION_STATE_KEY
      );


    if (!raw) {

      educationState = {
        ...DEFAULT_EDUCATION_STATE
      };

      return;

    }


    const parsed =
      JSON.parse(raw);


    educationState =
      normalizeEducationState(
        parsed
      );


  } catch (error) {

    console.error(
      "education state load error",
      error
    );


    educationState = {
      ...DEFAULT_EDUCATION_STATE
    };

  }

}


function saveEducationState() {

  try {

    localStorage.setItem(
      EDUCATION_STATE_KEY,
      JSON.stringify(
        educationState
      )
    );

  } catch (error) {

    console.error(
      "education state save error",
      error
    );

  }

}


/* ============================================================
   Utility
============================================================ */

function normalizeNumber(
  value,
  fallback = 0
) {

  const number =
    Number(value);


  if (
    !Number.isFinite(number)
  ) {
    return fallback;
  }


  return number;

}


function clamp(
  value,
  min,
  max
) {

  return Math.min(
    Math.max(value, min),
    max
  );

}


/* ============================================================
   教育画面ナビゲーション
============================================================ */

/*
 * 教育画面を遷移する。
 *
 * 通常の画面遷移では、
 * 「現在画面」を履歴へ積んでから移動する。
 *
 * 例：
 *
 * home → market
 *
 * history:
 * ["home"]
 *
 *
 * market → simulation
 *
 * history:
 * ["home", "market"]
 */
function navigateEducationMode(
  mode
) {

  const validModes = [
    "home",
    "market",
    "simulation",
    "goal",
    "quiz",
    "history"
  ];


  if (
    !validModes.includes(
      mode
    )
  ) {

    mode = "home";

  }


  /*
   * 同じ画面への遷移は履歴へ追加しない。
   */
  if (
    mode === educationMode
  ) {

    renderEducation();

    return;

  }


  /*
   * 現在画面を履歴へ追加。
   */
  if (
    educationMode
  ) {

    educationHistory.push(
      educationMode
    );

  }


  /*
   * 履歴が大きくなりすぎないよう制限。
   */
  if (
    educationHistory.length >
    EDUCATION_HISTORY_LIMIT
  ) {

    educationHistory =
      educationHistory.slice(
        -EDUCATION_HISTORY_LIMIT
      );

  }


  educationMode =
    mode;


  renderEducation();

}


/*
 * 直前の教育画面へ戻る。
 *
 * 履歴があれば1つ取り出す。
 *
 * 履歴がない場合は home に戻す。
 */
function goBackEducation() {

  if (
    educationHistory.length > 0
  ) {

    const previousMode =
      educationHistory.pop();


    educationMode =
      previousMode;


    renderEducation();

    return;

  }


  /*
   * 履歴がない場合。
   *
   * home以外ならhomeへ戻す。
   */
  if (
    educationMode !== "home"
  ) {

    educationMode =
      "home";


    renderEducation();

    return;

  }


  /*
   * 既にhomeなら何もしない。
   */
}


/*
 * 現在画面へ戻るためのボタンを生成。
 *
 * 履歴がある場合：
 *   ← 戻る
 *
 * 履歴がない場合：
 *   ← 戻る
 *
 * 見た目は同じだが、
 * 動作は goBackEducation() に統一する。
 */
function renderEducationBackButton() {

  return `

    <div class="education-back">

      <button
        type="button"
        class="secondary"
        data-education-back="true"
      >
        ← 戻る
      </button>

    </div>

  `;

}


/* ============================================================
   JST日付
============================================================ */

function getJapanDateString() {

  const formatter =
    new Intl.DateTimeFormat(
      "ja-JP",
      {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    );


  const parts =
    formatter.formatToParts(
      new Date()
    );


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


  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }


  return `${year}-${month}-${day}`;

}


/* ============================================================
   学習日
============================================================ */

function recordStudy() {

  const today =
    getJapanDateString();


  if (!today) {
    return;
  }


  if (
    educationState.lastStudyDate ===
    today
  ) {
    return;
  }


  educationState.lastStudyDate =
    today;


  educationState.studyDays =
    normalizeNumber(
      educationState.studyDays,
      0
    ) + 1;


  saveEducationState();

}


/* ============================================================
   学習項目
============================================================ */

function markLessonCompleted(
  lessonId
) {

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

    saveEducationState();

  }

}


function markScenarioViewed(
  scenarioId
) {

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

    saveEducationState();

  }

}


/* ============================================================
   共通
============================================================ */

function educationIsKidMode() {

  return (
    typeof kidMode !== "undefined" &&
    kidMode === true
  );

}


function educationText(
  adult,
  kid
) {

  return educationIsKidMode()
    ? kid
    : adult;

}


function educationEscape(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


function educationFormatYen(
  value
) {

  const number =
    normalizeNumber(
      value,
      0
    );


  return `¥${Math.round(
    number
  ).toLocaleString(
    "ja-JP"
  )}`;

}


/* ============================================================
   メイン
============================================================ */

function renderEducation() {

  const target =
    document.getElementById(
      "educationContent"
    );


  if (!target) {
    return;
  }


  recordStudy();


  if (
    educationMode === "market"
  ) {

    renderEducationMarket(
      target
    );

    return;

  }


  if (
    educationMode === "simulation"
  ) {

    renderEducationSimulation(
      target
    );

    return;

  }


  if (
    educationMode === "goal"
  ) {

    renderEducationGoal(
      target
    );

    return;

  }


  if (
    educationMode === "quiz"
  ) {

    renderEducationQuiz(
      target
    );

    return;

  }


  if (
    educationMode === "history"
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
   ホーム
============================================================ */

function renderEducationHome(
  target
) {

  const kid =
    educationIsKidMode();


  target.innerHTML = `

    <div class="education-menu">

      <button
        type="button"
        class="education-menu-card"
        data-education-mode="market"
      >

        <span>📈</span>

        <strong>
          ${
            kid
              ? "きょうの おかね"
              : "今日のお金"
          }
        </strong>

        <small>
          ${
            kid
              ? "おかねの うごきを みよう"
              : "Market Dataから値動きを学ぶ"
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
          ${
            kid
              ? "もしも"
              : "もしもシミュレーション"
          }
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
          ${
            kid
              ? "もくひょう"
              : "お金の目標"
          }
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
          ${
            kid
              ? "おかねクイズ"
              : "お金クイズ"
          }
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
          ${
            kid
              ? "べんきょうきろく"
              : "学習記録"
          }
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
          ${educationState.completedLessons.length}
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
   V2.4 Market Data
============================================================ */

function renderEducationMarket(
  target
) {

  const market =
    getEducationMarketData();


  target.innerHTML = `

    ${renderEducationBackButton()}


    <div class="card">

      <h2>
        📈
        ${
          educationIsKidMode()
            ? "きょうの おかね"
            : "今日のお金"
        }
      </h2>

      <p>
        ${
          educationText(
            "今日の値動きを見て、「なぜ動いたのか」を考えてみよう。",
            "きょう おかねが どう うごいたか みてみよう。"
          )
        }
      </p>

    </div>


    ${
      market.length === 0

        ? `

          <div class="card">

            <p>
              ${
                educationText(
                  "現在、Market Dataを取得できません。",
                  "いまは おかねの データを みられないよ。"
                )
              }
            </p>

          </div>

        `

        : `

          <div class="market-learning-grid">

            ${
              market
                .map(
                  renderMarketLearningCard
                )
                .join("")
            }

          </div>

        `
    }

  `;


  bindEducationButtons();

}


function getEducationMarketData() {

  try {

    if (
      typeof marketData !==
      "undefined" &&
      Array.isArray(marketData)
    ) {

      return marketData;

    }

  } catch (error) {

    console.warn(
      "marketData unavailable",
      error
    );

  }


  try {

    const raw =
      localStorage.getItem(
        "kidsMoneyMarketData"
      );


    if (!raw) {
      return [];
    }


    const parsed =
      JSON.parse(raw);


    if (
      Array.isArray(parsed)
    ) {

      return parsed;

    }


  } catch (error) {

    console.warn(
      "market data load error",
      error
    );

  }


  return [];

}


function renderMarketLearningCard(
  item
) {

  const safeItem =
    item || {};


  const name =
    safeItem.name ||
    safeItem.symbol ||
    "インデックス";


  const value =
    normalizeNumber(
      safeItem.value ??
      safeItem.latest ??
      safeItem.price ??
      0,
      0
    );


  const previous =
    normalizeNumber(
      safeItem.previous ??
      safeItem.prev ??
      value,
      value
    );


  const change =
    previous === 0
      ? 0
      : (
          (
            value -
            previous
          ) /
          previous
        ) * 100;


  const sign =
    change > 0
      ? "+"
      : "";


  return `

    <article class="card market-learning-card">

      <h3>
        ${educationEscape(name)}
      </h3>

      <strong>
        ${value.toLocaleString(
          "ja-JP"
        )}
      </strong>

      <div>
        ${sign}${change.toFixed(2)}%
      </div>

      <button
        type="button"
        class="secondary wide"
        data-market-why="${educationEscape(
          name
        )}"
      >

        ❓

        ${
          educationIsKidMode()
            ? "なぜ？"
            : "なぜ動いた？"
        }

      </button>

    </article>

  `;

}


/* ============================================================
   Market Why
============================================================ */

function openMarketWhy(
  name
) {

  const target =
    document.getElementById(
      "educationContent"
    );


  if (!target) {
    return;
  }


  /*
   * 現在の market 画面を履歴へ積む。
   *
   * これにより
   *
   * 今日のお金
   *   ↓
   * なぜ？
   *   ↓
   * 戻る
   *
   * で「今日のお金」へ戻れる。
   */
  if (
    educationMode === "market"
  ) {

    educationHistory.push(
      "market"
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
          educationIsKidMode()
            ? "なぜ うごくの？"
            : "なぜ値段が動くの？"
        }
      </h3>

      <p>
        ${
          educationText(
            "株価や指数は、会社の業績、景気、金利、為替、将来への期待など、さまざまな要因によって動きます。",
            "かいしゃの ちょうしや、けいき、おかねの かりやすさなどが かわると、ねだんが かわることが あるよ。"
          )
        }
      </p>


      <div class="learn-example">

        <strong>
          💡
          ${
            educationIsKidMode()
              ? "おぼえておこう"
              : "ポイント"
          }
        </strong>

        <p>
          ${
            educationText(
              "値上がりしたから必ず良い、値下がりしたから必ず悪い、とは限りません。",
              "あがったから かならず いい、さがったから かならず わるい、とは かぎらないよ。"
            )
          }
        </p>

      </div>

    </article>

  `;


  /*
   * 詳細画面は educationMode を market のままにする。
   *
   * 戻るボタンは履歴の market を取り出す。
   */
  bindEducationButtons();

}


/* ============================================================
   V2.5 シミュレーション
============================================================ */

function renderEducationSimulation(
  target
) {

  target.innerHTML = `

    ${renderEducationBackButton()}


    <div class="simulation-tabs">

      <button
        type="button"
        class="active"
        data-simulation="compound"
      >
        🌱 複利
      </button>

      <button
        type="button"
        data-simulation="crash"
      >
        📉 暴落
      </button>

      <button
        type="button"
        data-simulation="inflation"
      >
        🛒 インフレ
      </button>

    </div>


    <div
      id="simulationContent"
    ></div>

  `;


  renderCompoundSimulation();

  bindEducationButtons();

}


/* ============================================================
   複利
============================================================ */

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

      <h2>🌱 複利シミュレーション</h2>

      <label>

        ${
          educationIsKidMode()
            ? "はじめの おかね"
            : "初期金額"
        }

        <input
          id="compoundPrincipal"
          type="number"
          value="10000"
          min="0"
          max="1000000000"
          step="1000"
          inputmode="numeric"
        >

      </label>


      <label>

        ${
          educationIsKidMode()
            ? "ねんりつ"
            : "年間利率"
        }

        <input
          id="compoundRate"
          type="number"
          value="5"
          min="-100"
          max="100"
          step="0.1"
          inputmode="decimal"
        >

        %

      </label>


      <label>

        ${
          educationIsKidMode()
            ? "なんねん？"
            : "期間"
        }

        <input
          id="compoundYears"
          type="number"
          value="10"
          min="1"
          max="50"
          step="1"
          inputmode="numeric"
        >

        年

      </label>


      <button
        type="button"
        class="primary wide"
        id="runCompound"
      >
        計算する
      </button>

    </div>


    <div
      id="compoundResult"
    ></div>

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


  if (
    principal < 0 ||
    years <= 0 ||
    rate <= -1 ||
    rate > 1
  ) {

    showEducationError(
      "compoundResult",
      educationText(
        "入力値を確認してください。",
        "いれる おかねを かくにんしてね。"
      )
    );

    return;

  }


  const result =
    principal *
    Math.pow(
      1 + rate,
      years
    );


  if (
    !Number.isFinite(result)
  ) {

    showEducationError(
      "compoundResult",
      "計算できる範囲を超えています。"
    );

    return;

  }


  const target =
    document.getElementById(
      "compoundResult"
    );


  if (!target) {
    return;
  }


  target.innerHTML = `

    <div class="card simulation-result">

      <h3>
        ${
          educationIsKidMode()
            ? "🌱 けっか"
            : "🌱 シミュレーション結果"
        }
      </h3>

      <div class="simulation-number">

        ${educationFormatYen(
          result
        )}

      </div>

      <p>
        ${
          educationText(
            `${years}年間、毎年${(rate * 100).toFixed(1)}%で複利運用した場合の計算例です。実際の投資結果を保証するものではありません。`,
            `${years}ねん、まいとし ${(rate * 100).toFixed(1)}% で おかねが ふえたと した ときの れいだよ。ほんとうに こうなるとは かぎらないよ。`
          )
        }
      </p>

    </div>

  `;


  markScenarioViewed(
    "compound"
  );

}


/* ============================================================
   暴落
============================================================ */

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

      <h2>📉 暴落シミュレーション</h2>

      <p>
        ${
          educationText(
            "投資価格が大きく下落したとき、元の金額に戻るにはどれくらい上昇が必要か計算します。",
            "おかねが おおきく さがったら、もとの おかねに もどるには どれくらい ふえれば いいかな？"
          )
        }
      </p>


      <label>

        ${
          educationIsKidMode()
            ? "はじめの おかね"
            : "初期金額"
        }

        <input
          id="crashPrincipal"
          type="number"
          value="100000"
          min="0"
          max="1000000000"
          step="10000"
          inputmode="numeric"
        >

      </label>


      <label>

        ${
          educationIsKidMode()
            ? "どれくらい さがった？"
            : "下落率"
        }

        <input
          id="crashRate"
          type="number"
          value="30"
          min="1"
          max="99.9"
          step="0.1"
          inputmode="decimal"
        >

        %

      </label>


      <button
        type="button"
        class="primary wide"
        id="runCrash"
      >
        計算する
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


  if (
    principal < 0 ||
    rate <= 0 ||
    rate >= 1
  ) {

    showEducationError(
      "crashResult",
      educationText(
        "入力値を確認してください。",
        "すうじを かくにんしてね。"
      )
    );

    return;

  }


  const after =
    principal *
    (1 - rate);


  const required =
    after === 0
      ? Infinity
      : (
          principal /
          after -
          1
        ) * 100;


  const target =
    document.getElementById(
      "crashResult"
    );


  if (!target) {
    return;
  }


  target.innerHTML = `

    <div class="card simulation-result">

      <h3>📉 結果</h3>

      <p>

        ${educationFormatYen(
          principal
        )}

        →

        ${educationFormatYen(
          after
        )}

      </p>


      <div class="simulation-number">

        ${
          Number.isFinite(required)
            ? `+${required.toFixed(1)}%`
            : "∞"
        }

      </div>


      <p>
        ${
          educationText(
            "下落後の金額から元の金額に戻るために必要な上昇率です。",
            "おかねが もとの きんがくに もどるために ひつような ふえかただよ。"
          )
        }
      </p>


      <div class="learn-example">

        <strong>
          💡 ポイント
        </strong>

        <p>
          ${
            educationText(
              `${(rate * 100).toFixed(1)}%下落した場合、元に戻るには${required.toFixed(1)}%上昇する必要があります。`,
              `${(rate * 100).toFixed(1)}% さがったら、もとに もどるには ${required.toFixed(1)}% ふえる ひつようが あるよ。`
            )
          }
        </p>

      </div>

    </div>

  `;


  markScenarioViewed(
    "crash"
  );

}


/* ============================================================
   インフレ
============================================================ */

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

      <h2>🛒 インフレシミュレーション</h2>


      <label>

        ${
          educationIsKidMode()
            ? "いまの おかね"
            : "現在の金額"
        }

        <input
          id="inflationMoney"
          type="number"
          value="100000"
          min="0"
          max="1000000000"
          step="10000"
          inputmode="numeric"
        >

      </label>


      <label>

        ${
          educationIsKidMode()
            ? "ものの ねだんが どれくらい あがる？"
            : "年間インフレ率"
        }

        <input
          id="inflationRate"
          type="number"
          value="2"
          min="0"
          max="100"
          step="0.1"
          inputmode="decimal"
        >

        %

      </label>


      <label>

        ${
          educationIsKidMode()
            ? "なんねん？"
            : "期間"
        }

        <input
          id="inflationYears"
          type="number"
          value="10"
          min="1"
          max="50"
          step="1"
          inputmode="numeric"
        >

        年

      </label>


      <button
        type="button"
        class="primary wide"
        id="runInflation"
      >
        計算する
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


  if (
    money < 0 ||
    rate < 0 ||
    rate > 1 ||
    years <= 0
  ) {

    showEducationError(
      "inflationResult",
      educationText(
        "入力値を確認してください。",
        "すうじを かくにんしてね。"
      )
    );

    return;

  }


  const multiplier =
    Math.pow(
      1 + rate,
      years
    );


  const futurePrice =
    money *
    multiplier;


  const purchasingPower =
    money /
    multiplier;


  if (
    !Number.isFinite(
      futurePrice
    ) ||
    !Number.isFinite(
      purchasingPower
    )
  ) {

    showEducationError(
      "inflationResult",
      "計算できる範囲を超えています。"
    );

    return;

  }


  const target =
    document.getElementById(
      "inflationResult"
    );


  if (!target) {
    return;
  }


  target.innerHTML = `

    <div class="card simulation-result">

      <h3>🛒 結果</h3>


      <p>
        ${years}年後に
        ${money.toLocaleString(
          "ja-JP"
        )}円
        と同じものを買うには
      </p>


      <div class="simulation-number">

        ${educationFormatYen(
          futurePrice
        )}

      </div>


      <p>
        ${
          educationText(
            `インフレ率${(rate * 100).toFixed(1)}%が続くと仮定した計算例です。`,
            `ものの ねだんが まいとし ${(rate * 100).toFixed(1)}% あがると した ときの れいだよ。`
          )
        }
      </p>


      <p>
        ${
          educationText(
            `現在の${money.toLocaleString("ja-JP")}円の購買力は、約${Math.round(purchasingPower).toLocaleString("ja-JP")}円相当になります。`,
            `いまの ${money.toLocaleString("ja-JP")}えんで かえるものは、${years}ねんごには もっと おかねが ひつように なるよ。`
          )
        }
      </p>

    </div>

  `;


  markScenarioViewed(
    "inflation"
  );

}


/* ============================================================
   シミュレーション共通エラー
============================================================ */

function showEducationError(
  elementId,
  message
) {

  const target =
    document.getElementById(
      elementId
    );


  if (!target) {
    return;
  }


  target.innerHTML = `

    <div class="card">

      <p>
        ⚠️
        ${educationEscape(
          message
        )}
      </p>

    </div>

  `;

}


/* ============================================================
   V2.6 目標
============================================================ */

function renderEducationGoal(
  target
) {

  target.innerHTML = `

    ${renderEducationBackButton()}


    <div class="card">

      <h2>
        🎯
        ${
          educationIsKidMode()
            ? "おかねの もくひょう"
            : "お金の目標"
        }
      </h2>


      <label>

        ${
          educationIsKidMode()
            ? "いまの おかね"
            : "現在の金額"
        }

        <input
          id="goalCurrent"
          type="number"
          value="0"
          min="0"
          max="1000000000"
          step="100"
          inputmode="numeric"
        >

      </label>


      <label>

        ${
          educationIsKidMode()
            ? "ほしい おかね"
            : "目標金額"
        }

        <input
          id="goalTarget"
          type="number"
          value="50000"
          min="1"
          max="1000000000"
          step="1000"
          inputmode="numeric"
        >

      </label>


      <label>

        ${
          educationIsKidMode()
            ? "まいつき いくら ためる？"
            : "毎月の積立額"
        }

        <input
          id="goalMonthly"
          type="number"
          value="5000"
          min="1"
          max="100000000"
          step="500"
          inputmode="numeric"
        >

      </label>


      <button
        type="button"
        class="primary wide"
        id="runGoal"
      >

        ${
          educationIsKidMode()
            ? "いつ たまる？"
            : "達成時期を計算"
        }

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
    current < 0 ||
    targetAmount <= 0 ||
    monthly <= 0
  ) {

    target.innerHTML = `

      <div class="card">

        ⚠️

        ${
          educationText(
            "入力値を確認してください。",
            "すうじを かくにんしてね。"
          )
        }

      </div>

    `;

    return;

  }


  if (
    targetAmount <= current
  ) {

    target.innerHTML = `

      <div class="card simulation-result">

        <h3>
          🎉
        </h3>

        <p>
          ${
            educationText(
              "すでに目標金額に到達しています。",
              "もう もくひょうに とうたつしているよ！"
            )
          }
        </p>

      </div>

    `;


    markLessonCompleted(
      "goal"
    );

    return;

  }


  const difference =
    targetAmount -
    current;


  const months =
    Math.ceil(
      difference /
      monthly
    );


  const years =
    Math.floor(
      months /
      12
    );


  const remainingMonths =
    months %
    12;


  const targetDate =
    new Date();


  targetDate.setMonth(
    targetDate.getMonth() +
    months
  );


  const dateText =
    new Intl.DateTimeFormat(
      "ja-JP",
      {
        year: "numeric",
        month: "long"
      }
    ).format(
      targetDate
    );


  target.innerHTML = `

    <div class="card simulation-result">

      <h3>

        🎯

        ${
          educationIsKidMode()
            ? "もくひょうまで"
            : "目標達成まで"
        }

      </h3>


      <div class="simulation-number">

        ${
          years > 0
            ? `${years}年${remainingMonths}か月`
            : `${remainingMonths}か月`
        }

      </div>


      <p>
        ${
          educationText(
            `毎月${monthly.toLocaleString("ja-JP")}円を積み立てると、約${dateText}に目標へ到達します。`,
            `まいげつ ${monthly.toLocaleString("ja-JP")}えん ためると、${dateText}ごろに もくひょうに たどりつくよ。`
          )
        }
      </p>


      <div class="learn-example">

        <strong>
          💡
          ${
            educationIsKidMode()
              ? "ポイント"
              : "ポイント"
          }
        </strong>

        <p>
          ${
            educationText(
              `目標までの残り金額は${difference.toLocaleString("ja-JP")}円です。`,
              `あと ${difference.toLocaleString("ja-JP")}えん ためよう。`
            )
          }
        </p>

      </div>

    </div>

  `;


  markLessonCompleted(
    "goal"
  );

}


/* ============================================================
   V2.7 Quiz
============================================================ */

function renderEducationQuiz(
  target
) {

  const questions =
    getQuizQuestions();


  if (!questions.length) {

    target.innerHTML = `

      ${renderEducationBackButton()}


      <div class="card">

        ${
          educationText(
            "クイズデータがありません。",
            "クイズが みつからないよ。"
          )
        }

      </div>

    `;


    bindEducationButtons();

    return;

  }


  const index =
    Math.floor(
      Math.random() *
      questions.length
    );


  const question =
    questions[index];


  educationState.currentQuizAnswered =
    false;


  saveEducationState();


  const questionText =
    educationIsKidMode()
      ? (
          question.kidQuestion ||
          question.question
        )
      : question.question;


  target.innerHTML = `

    ${renderEducationBackButton()}


    <article class="card quiz-card">

      <span class="quiz-number">
        🧠
        ${
          educationIsKidMode()
            ? "おかねクイズ"
            : "お金クイズ"
        }
      </span>


      <h2>
        ${educationEscape(
          questionText
        )}
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
                    i
                  ) => {

                    const optionText =
                      educationIsKidMode()
                        ? (
                            option.kid ??
                            option.text ??
                            option
                          )
                        : (
                            option.text ??
                            option
                          );


                    return `

                      <button
                        type="button"
                        class="quiz-option"
                        data-quiz-answer="${i}"
                      >

                        ${educationEscape(
                          optionText
                        )}

                      </button>

                    `;

                  }
                )
                .join("")
            : ""
        }

      </div>


      <div
        id="quizResult"
      ></div>

    </article>

  `;


  target.dataset.quizAnswer =
    String(
      normalizeNumber(
        question.answer,
        0
      )
    );


  target.dataset.quizIndex =
    String(index);


  bindEducationButtons();

}


function getQuizQuestions() {

  try {

    if (
      typeof QUIZ_DATA !==
      "undefined"
    ) {

      if (
        Array.isArray(
          QUIZ_DATA
        )
      ) {

        return QUIZ_DATA;

      }


      if (
        Array.isArray(
          QUIZ_DATA.items
        )
      ) {

        return QUIZ_DATA.items;

      }

    }

  } catch (error) {

    console.warn(
      "QUIZ_DATA unavailable",
      error
    );

  }


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

    }

  ];

}


function answerQuiz(
  answer
) {

  const target =
    document.getElementById(
      "quizResult"
    );


  const content =
    document.getElementById(
      "educationContent"
    );


  if (
    !target ||
    !content
  ) {
    return;
  }


  /*
   * 二重回答防止
   */

  if (
    educationState.currentQuizAnswered
  ) {
    return;
  }


  const questions =
    getQuizQuestions();


  const index =
    normalizeNumber(
      content.dataset.quizIndex,
      -1
    );


  const question =
    questions[index];


  if (!question) {
    return;
  }


  const correctAnswer =
    normalizeNumber(
      question.answer,
      0
    );


  const userAnswer =
    normalizeNumber(
      answer,
      -1
    );


  const correct =
    userAnswer ===
    correctAnswer;


  educationState.currentQuizAnswered =
    true;


  educationState.quizAnswered =
    normalizeNumber(
      educationState.quizAnswered,
      0
    ) + 1;


  if (correct) {

    educationState.quizCorrect =
      normalizeNumber(
        educationState.quizCorrect,
        0
      ) + 1;

  }


  if (
    question.id
  ) {

    markLessonCompleted(
      `quiz-${question.id}`
    );

  }


  saveEducationState();


  const explanation =
    educationIsKidMode()
      ? (
          question.kidExplanation ||
          question.explanation ||
          ""
        )
      : (
          question.explanation ||
          ""
        );


  target.innerHTML = `

    <div class="quiz-result">

      <div class="quiz-result-icon">

        ${
          correct
            ? "⭕"
            : "❌"
        }

      </div>


      <h3>

        ${
          correct
            ? (
                educationIsKidMode()
                  ? "せいかい！"
                  : "正解！"
              )
            : (
                educationIsKidMode()
                  ? "ざんねん！"
                  : "残念！"
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
                💡
                ${
                  educationIsKidMode()
                    ? "なぜ？"
                    : "解説"
                }
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
        class="primary"
        data-quiz-next="true"
      >

        ${
          educationIsKidMode()
            ? "つぎの クイズ"
            : "次のクイズ"
        }

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

      }
    );


  bindEducationButtons();

}


/*
 * 次のクイズ。
 *
 * 通常の navigateEducationMode("quiz") では
 * 同じmodeなので履歴を積まない。
 *
 * ただし renderEducationQuiz() を直接呼ぶことで、
 * 「次のクイズ」で不要な画面履歴を作らない。
 */
function nextQuiz() {

  educationState.currentQuizAnswered =
    false;


  saveEducationState();


  renderEducationQuiz(
    document.getElementById(
      "educationContent"
    )
  );

}


/* ============================================================
   学習履歴
============================================================ */

function renderEducationHistory(
  target
) {

  const answered =
    normalizeNumber(
      educationState.quizAnswered,
      0
    );


  const correct =
    normalizeNumber(
      educationState.quizCorrect,
      0
    );


  const rate =
    answered === 0
      ? 0
      : (
          correct /
          answered
        ) * 100;


  const scenarios =
    educationState.viewedScenarios;


  const scenarioLabels = {

    compound:
      educationIsKidMode()
        ? "ふくり"
        : "複利",

    crash:
      educationIsKidMode()
        ? "ぼうらく"
        : "暴落",

    inflation:
      educationIsKidMode()
        ? "インフレ"
        : "インフレ"

  };


  target.innerHTML = `

    ${renderEducationBackButton()}


    <div class="card">

      <h2>
        📚
        ${
          educationIsKidMode()
            ? "べんきょうきろく"
            : "学習記録"
        }
      </h2>


      <div class="education-stat-grid">

        <div>

          <strong>
            ${educationState.studyDays}
          </strong>

          <span>
            ${
              educationIsKidMode()
                ? "べんきょうしたひ"
                : "学習日数"
            }
          </span>

        </div>


        <div>

          <strong>
            ${answered}
          </strong>

          <span>
            ${
              educationIsKidMode()
                ? "クイズ"
                : "クイズ回答"
            }
          </span>

        </div>


        <div>

          <strong>
            ${correct}
          </strong>

          <span>
            ${
              educationIsKidMode()
                ? "せいかい"
                : "正解"
            }
          </span>

        </div>


        <div>

          <strong>
            ${rate.toFixed(0)}%
          </strong>

          <span>
            ${
              educationIsKidMode()
                ? "せいかいりつ"
                : "正解率"
            }
          </span>

        </div>

      </div>

    </div>


    <div class="card">

      <h3>
        🧪
        ${
          educationIsKidMode()
            ? "やってみた もしも"
            : "体験したシミュレーション"
        }
      </h3>


      ${
        scenarios.length === 0

          ? `

            <p>
              ${
                educationIsKidMode()
                  ? "まだ やっていないよ。"
                  : "まだシミュレーションを利用していません。"
              }
            </p>

          `

          : `

            <ul>

              ${
                scenarios
                  .map(
                    scenario => `
                      <li>
                        ${
                          educationEscape(
                            scenarioLabels[
                              scenario
                            ] ||
                            scenario
                          )
                        }
                      </li>
                    `
                  )
                  .join("")
              }

            </ul>

          `
      }

    </div>


    <div class="card">

      <h3>
        🌱
        ${
          educationIsKidMode()
            ? "おぼえたこと"
            : "学習済み"
        }
      </h3>


      <p>
        ${
          educationText(
            "学習を続けることで、お金の仕組みが少しずつ分かるようになります。",
            "おかねの ことを すこしずつ おぼえていこう。"
          )
        }
      </p>


      <p>
        ${
          educationText(
            `学習済み項目：${educationState.completedLessons.length}`,
            `おぼえた こと：${educationState.completedLessons.length}`
          )
        }
      </p>

    </div>

  `;


  bindEducationButtons();

}


/* ============================================================
   シミュレーション切替
============================================================ */

function bindSimulationButtons() {

  document
    .querySelectorAll(
      "[data-simulation]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            const type =
              button.dataset.simulation;


            document
              .querySelectorAll(
                "[data-simulation]"
              )
              .forEach(
                b =>
                  b.classList.remove(
                    "active"
                  )
              );


            button.classList.add(
              "active"
            );


            if (
              type === "compound"
            ) {

              renderCompoundSimulation();

            }


            if (
              type === "crash"
            ) {

              renderCrashSimulation();

            }


            if (
              type === "inflation"
            ) {

              renderInflationSimulation();

            }

          };

      }
    );

}


/* ============================================================
   Button
============================================================ */

function bindEducationButtons() {

  /*
   * 教育モード
   *
   * ここを従来の
   *
   * educationMode = ...
   * renderEducation()
   *
   * から
   *
   * navigateEducationMode(...)
   *
   * に変更。
   */
  document
    .querySelectorAll(
      "[data-education-mode]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            navigateEducationMode(
              button.dataset.educationMode
            );

          };

      }
    );


  /*
   * 直前画面へ戻る
   */
  document
    .querySelectorAll(
      "[data-education-back]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            goBackEducation();

          };

      }
    );


  /*
   * Market「なぜ？」
   */
  document
    .querySelectorAll(
      "[data-market-why]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            openMarketWhy(
              button.dataset.marketWhy
            );

          };

      }
    );


  /*
   * Quiz
   */
  document
    .querySelectorAll(
      "[data-quiz-answer]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            answerQuiz(
              button.dataset.quizAnswer
            );

          };

      }
    );


  /*
   * Quiz 次へ
   *
   * 通常の画面遷移ではなく、
   * 同じQuiz画面の問題だけ更新する。
   */
  document
    .querySelectorAll(
      "[data-quiz-next]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            nextQuiz();

          };

      }
    );


  /*
   * Simulation
   */
  bindSimulationButtons();

}


/* ============================================================
   ひらがなモード変更時
============================================================ */

function refreshEducationForModeChange() {

  const target =
    document.getElementById(
      "educationContent"
    );


  if (!target) {
    return;
  }


  renderEducation();

}


/* ============================================================
   外部から教育画面を開くためのAPI
============================================================ */

function openEducationMode(
  mode
) {

  const validModes = [
    "home",
    "market",
    "simulation",
    "goal",
    "quiz",
    "history"
  ];


  if (
    !validModes.includes(
      mode
    )
  ) {

    mode = "home";

  }


  /*
   * 外部から教育画面を開いた場合は、
   * それまでの教育画面履歴をいったんリセットする。
   *
   * 例：
   *
   * メイン画面
   *   ↓
   * お金の教育
   *   ↓
   * openEducationMode("home")
   *
   * ここから新しい教育セッションとして扱う。
   */
  educationHistory = [];


  educationMode =
    mode;


  renderEducation();

}


/* ============================================================
   起動
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initEducation();

  }
);