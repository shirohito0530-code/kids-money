"use strict";

/*
============================================================
こどもマネー・ラボ V2.7
教育機能統合モジュール

V2.4 今日の値動き・なぜ？
V2.5 もしもシミュレーション
V2.6 目標貯金
V2.7 クイズ・学習履歴
============================================================
*/

const EDUCATION_STATE_KEY =
  "kidsMoneyEducationV27";

let educationState = {
  quizCorrect: 0,
  quizAnswered: 0,
  learnedGlossary: [],
  completedLessons: [],
  viewedScenarios: [],
  lastStudyDate: null,
  studyDays: 0
};

let educationMode = "home";


/* ============================================================
   初期化
============================================================ */

function initEducation() {

  loadEducationState();

  renderEducation();

}


/* ============================================================
   State
============================================================ */

function loadEducationState() {

  try {

    const raw =
      localStorage.getItem(
        EDUCATION_STATE_KEY
      );

    if (!raw) {
      return;
    }

    const parsed =
      JSON.parse(raw);

    educationState = {
      ...educationState,
      ...parsed
    };

  } catch (error) {

    console.error(
      "education state load error",
      error
    );

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
   学習日
============================================================ */

function recordStudy() {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  if (
    educationState.lastStudyDate ===
    today
  ) {
    return;
  }

  educationState.lastStudyDate =
    today;

  educationState.studyDays =
    Number(
      educationState.studyDays || 0
    ) + 1;

  saveEducationState();

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
    renderEducationMarket(target);
    return;
  }

  if (
    educationMode === "simulation"
  ) {
    renderEducationSimulation(target);
    return;
  }

  if (
    educationMode === "goal"
  ) {
    renderEducationGoal(target);
    return;
  }

  if (
    educationMode === "quiz"
  ) {
    renderEducationQuiz(target);
    return;
  }

  if (
    educationMode === "history"
  ) {
    renderEducationHistory(target);
    return;
  }

  renderEducationHome(target);

}


/* ============================================================
   ホーム
============================================================ */

function renderEducationHome(target) {

  const kid =
    educationIsKidMode();

  target.innerHTML = `

    <div class="education-menu">

      <button
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
        <span>学習日数</span>
      </div>

      <div>
        <strong>
          ${educationState.quizCorrect}
        </strong>
        <span>正解数</span>
      </div>

      <div>
        <strong>
          ${educationState.completedLessons.length}
        </strong>
        <span>学習済み</span>
      </div>

    </div>

  `;

  bindEducationButtons();

}


/* ============================================================
   V2.4 Market Data
============================================================ */

function renderEducationMarket(target) {

  const market =
    getEducationMarketData();

  target.innerHTML = `

    <div class="education-back">
      <button
        class="secondary"
        data-education-mode="home"
      >
        ← 戻る
      </button>
    </div>


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


    <div class="market-learning-grid">

      ${
        market.map(
          renderMarketLearningCard
        ).join("")
      }

    </div>

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

  } catch (error) {}

  try {

    const raw =
      localStorage.getItem(
        "kidsMoneyMarketData"
      );

    if (raw) {

      const parsed =
        JSON.parse(raw);

      if (
        Array.isArray(parsed)
      ) {
        return parsed;
      }

    }

  } catch (error) {}

  return [];

}


function renderMarketLearningCard(item) {

  const name =
    item.name ||
    item.symbol ||
    "インデックス";

  const value =
    Number(
      item.value ??
      item.latest ??
      item.price ??
      0
    );

  const previous =
    Number(
      item.previous ??
      item.prev ??
      value
    );

  const change =
    previous === 0
      ? 0
      : (
          (value - previous) /
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
        class="secondary wide"
        data-market-why="${educationEscape(name)}"
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


function openMarketWhy(name) {

  const target =
    document.getElementById(
      "educationContent"
    );

  if (!target) {
    return;
  }

  target.innerHTML = `

    <div class="education-back">

      <button
        class="secondary"
        data-education-mode="market"
      >
        ← 戻る
      </button>

    </div>


    <article class="card education-detail">

      <div class="education-big-icon">
        ❓
      </div>

      <h2>
        ${
          educationEscape(name)
        }
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
          💡 ${
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

  bindEducationButtons();

}


/* ============================================================
   V2.5 シミュレーション
============================================================ */

function renderEducationSimulation(target) {

  target.innerHTML = `

    <div class="education-back">
      <button
        class="secondary"
        data-education-mode="home"
      >
        ← 戻る
      </button>
    </div>


    <div class="simulation-tabs">

      <button
        class="active"
        data-simulation="compound"
      >
        🌱 複利
      </button>

      <button
        data-simulation="crash"
      >
        📉 暴落
      </button>

      <button
        data-simulation="inflation"
      >
        🛒 インフレ
      </button>

    </div>


    <div
      id="simulationContent"
    >
    </div>

  `;

  renderCompoundSimulation();

  bindEducationButtons();

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
          step="1000"
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
          step="0.1"
        > %
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
        >
        年
      </label>


      <button
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
    Number(
      document.getElementById(
        "compoundPrincipal"
      )?.value || 0
    );

  const rate =
    Number(
      document.getElementById(
        "compoundRate"
      )?.value || 0
    ) / 100;

  const years =
    Number(
      document.getElementById(
        "compoundYears"
      )?.value || 0
    );

  const result =
    principal *
    Math.pow(
      1 + rate,
      years
    );

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
        ¥${Math.round(
          result
        ).toLocaleString(
          "ja-JP"
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

  educationState.viewedScenarios.push(
    "compound"
  );

  saveEducationState();

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
          step="10000"
        >
      </label>


      <label>
        下落率

        <input
          id="crashRate"
          type="number"
          value="30"
          min="1"
          max="99"
        > %
      </label>


      <button
        class="primary wide"
        id="runCrash"
      >
        計算する
      </button>

    </div>


    <div id="crashResult"></div>

  `;

  document
    .getElementById("runCrash")
    ?.addEventListener(
      "click",
      calculateCrash
    );

}


function calculateCrash() {

  const principal =
    Number(
      document.getElementById(
        "crashPrincipal"
      )?.value || 0
    );

  const rate =
    Number(
      document.getElementById(
        "crashRate"
      )?.value || 0
    ) / 100;

  const after =
    principal * (1 - rate);

  const required =
    after === 0
      ? Infinity
      : (
          principal / after - 1
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
        ¥${principal.toLocaleString(
          "ja-JP"
        )}
        →
        ¥${after.toLocaleString(
          "ja-JP"
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

    </div>

  `;

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
          step="10000"
        >
      </label>


      <label>
        年間インフレ率

        <input
          id="inflationRate"
          type="number"
          value="2"
          step="0.1"
        > %
      </label>


      <label>
        期間

        <input
          id="inflationYears"
          type="number"
          value="10"
          min="1"
          max="50"
        >
        年
      </label>


      <button
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
    Number(
      document.getElementById(
        "inflationMoney"
      )?.value || 0
    );

  const rate =
    Number(
      document.getElementById(
        "inflationRate"
      )?.value || 0
    ) / 100;

  const years =
    Number(
      document.getElementById(
        "inflationYears"
      )?.value || 0
    );

  const futurePrice =
    money *
    Math.pow(
      1 + rate,
      years
    );

  const purchasingPower =
    money /
    Math.pow(
      1 + rate,
      years
    );

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
        ${money.toLocaleString("ja-JP")}円
        と同じものを買うには
      </p>

      <div class="simulation-number">

        ¥${Math.round(
          futurePrice
        ).toLocaleString(
          "ja-JP"
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
        現在の${money.toLocaleString(
          "ja-JP"
        )}円の購買力は、
        約${Math.round(
          purchasingPower
        ).toLocaleString(
          "ja-JP"
        )}円相当になります。
      </p>

    </div>

  `;

}


/* ============================================================
   V2.6 目標
============================================================ */

function renderEducationGoal(target) {

  target.innerHTML = `

    <div class="education-back">
      <button
        class="secondary"
        data-education-mode="home"
      >
        ← 戻る
      </button>
    </div>


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
          step="100"
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
          step="1000"
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
          step="500"
        >
      </label>


      <button
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
    .getElementById("runGoal")
    ?.addEventListener(
      "click",
      calculateGoal
    );

}


function calculateGoal() {

  const current =
    Number(
      document.getElementById(
        "goalCurrent"
      )?.value || 0
    );

  const targetAmount =
    Number(
      document.getElementById(
        "goalTarget"
      )?.value || 0
    );

  const monthly =
    Number(
      document.getElementById(
        "goalMonthly"
      )?.value || 0
    );

  if (
    monthly <= 0 ||
    targetAmount <= current
  ) {

    const target =
      document.getElementById(
        "goalResult"
      );

    if (target) {

      target.innerHTML = `
        <div class="card">
          ${
            targetAmount <= current
              ? "🎉 もう もくひょうに とうたつしているよ！"
              : "毎月の積立額を確認してください。"
          }
        </div>
      `;

    }

    return;
  }

  const months =
    Math.ceil(
      (
        targetAmount -
        current
      ) / monthly
    );

  const years =
    Math.floor(
      months / 12
    );

  const remainingMonths =
    months % 12;

  const target =
    document.getElementById(
      "goalResult"
    );

  if (!target) {
    return;
  }

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
            `毎月${monthly.toLocaleString("ja-JP")}円を積み立てた場合の単純計算です。`,
            `まいげつ ${monthly.toLocaleString("ja-JP")}えん ためると、このくらいで たまるよ。`
          )
        }
      </p>

    </div>

  `;

}


/* ============================================================
   V2.7 Quiz
============================================================ */

function renderEducationQuiz(target) {

  const questions =
    getQuizQuestions();

  if (!questions.length) {

    target.innerHTML = `
      <div class="card">
        クイズデータがありません。
      </div>
    `;

    return;
  }

  const index =
    Math.floor(
      Math.random() *
      questions.length
    );

  const question =
    questions[index];

  target.innerHTML = `

    <div class="education-back">
      <button
        class="secondary"
        data-education-mode="home"
      >
        ← 戻る
      </button>
    </div>


    <article class="card quiz-card">

      <span class="quiz-number">
        🧠 おかねクイズ
      </span>

      <h2>
        ${
          educationEscape(
            educationIsKidMode()
              ? question.kidQuestion
              : question.question
          )
        }
      </h2>


      <div class="quiz-options">

        ${
          question.options
            .map(
              (option, i) => `
                <button
                  class="quiz-option"
                  data-quiz-answer="${i}"
                >
                  ${educationEscape(
                    educationIsKidMode()
                      ? option.kid
                      : option.text
                  )}
                </button>
              `
            )
            .join("")
        }

      </div>

      <div
        id="quizResult"
      ></div>

    </article>

  `;

  target.dataset.quizAnswer =
    question.answer;

  target.dataset.quizIndex =
    index;

  bindEducationButtons();

}


function getQuizQuestions() {

  try {

    if (
      typeof QUIZ_DATA !==
      "undefined"
    ) {

      return Array.isArray(
        QUIZ_DATA
      )
        ? QUIZ_DATA
        : QUIZ_DATA.items || [];

    }

  } catch (error) {}

  return [
    {
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
      ]
    },
    {
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
      ]
    }
  ];

}


function answerQuiz(answer) {

  const target =
    document.getElementById(
      "quizResult"
    );

  if (!target) {
    return;
  }

  const correct =
    Number(answer) ===
    Number(
      document
        .getElementById(
          "educationContent"
        )
        ?.dataset.quizAnswer
    );

  educationState.quizAnswered++;

  if (correct) {
    educationState.quizCorrect++;
  }

  saveEducationState();

  target.innerHTML = `

    <div class="quiz-result">

      <div class="quiz-result-icon">
        ${correct ? "⭕" : "❌"}
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

      <button
        class="primary"
        data-education-mode="quiz"
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
        button.disabled = true;
      }
    );

}


/* ============================================================
   学習履歴
============================================================ */

function renderEducationHistory(target) {

  const answered =
    educationState.quizAnswered;

  const correct =
    educationState.quizCorrect;

  const rate =
    answered === 0
      ? 0
      : (
          correct /
          answered
        ) * 100;

  target.innerHTML = `

    <div class="education-back">
      <button
        class="secondary"
        data-education-mode="home"
      >
        ← 戻る
      </button>
    </div>


    <div class="card">

      <h2>📚 学習記録</h2>

      <div class="education-stat-grid">

        <div>
          <strong>
            ${educationState.studyDays}
          </strong>
          <span>学習日数</span>
        </div>

        <div>
          <strong>
            ${answered}
          </strong>
          <span>クイズ回答</span>
        </div>

        <div>
          <strong>
            ${correct}
          </strong>
          <span>正解</span>
        </div>

        <div>
          <strong>
            ${rate.toFixed(0)}%
          </strong>
          <span>正解率</span>
        </div>

      </div>

    </div>


    <div class="card">

      <h3>🌱 おぼえたこと</h3>

      <p>
        ${
          educationText(
            "学習を続けることで、お金の仕組みが少しずつ分かるようになります。",
            "おかねの ことを すこしずつ おぼえていこう。"
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

  document
    .querySelectorAll(
      "[data-education-mode]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            educationMode =
              button.dataset.educationMode;

            renderEducation();

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
          () => {

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
          () => {

            answerQuiz(
              button.dataset.quizAnswer
            );

          };

      }
    );


  bindSimulationButtons();

}


/* ============================================================
   ひらがなモード変更時
============================================================ */

function refreshEducationForModeChange() {

  if (
    document.getElementById(
      "educationContent"
    )
  ) {

    renderEducation();

  }

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
