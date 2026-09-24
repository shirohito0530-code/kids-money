"use strict";

/*
============================================================
こどもマネー・ラボ V2.3
金融教育コンテンツ
============================================================
*/

const LEARN_DATA = {
  glossary: null,
  why: null,
  lessons: null
};

let learnMode = "overview";
let learnCategory = "all";


async function loadLearnData() {
  try {
    const [
      glossaryResponse,
      whyResponse,
      lessonsResponse
    ] = await Promise.all([
      fetch("./data/glossary.json"),
      fetch("./data/why.json"),
      fetch("./data/lessons.json")
    ]);

    if (!glossaryResponse.ok) {
      throw new Error("glossary.json を読み込めませんでした");
    }

    if (!whyResponse.ok) {
      throw new Error("why.json を読み込めませんでした");
    }

    if (!lessonsResponse.ok) {
      throw new Error("lessons.json を読み込めませんでした");
    }

    LEARN_DATA.glossary =
      await glossaryResponse.json();

    LEARN_DATA.why =
      await whyResponse.json();

    LEARN_DATA.lessons =
      await lessonsResponse.json();

    renderLearn();

  } catch (error) {
    console.error(error);

    const target =
      document.getElementById("learnContent");

    if (target) {
      target.innerHTML = `
        <div class="card error-card">
          <h3>📚 まなぶデータをよみこめませんでした</h3>
          <p>
            GitHub Pagesでデータファイルが
            正しく配置されているか確認してください。
          </p>
        </div>
      `;
    }
  }
}


function isKidMode() {
  return (
    typeof kidMode !== "undefined" &&
    kidMode === true
  );
}


function learnText(item, key) {
  if (
    isKidMode() &&
    item.kid !== undefined
  ) {
    return item.kid;
  }

  return item[key] || "";
}


function learnTitle(item) {
  if (
    isKidMode() &&
    item.kidTitle !== undefined
  ) {
    return item.kidTitle;
  }

  if (
    isKidMode() &&
    item.kidQuestion !== undefined
  ) {
    return item.kidQuestion;
  }

  return (
    item.title ||
    item.question ||
    item.term ||
    ""
  );
}


function renderLearn() {
  const target =
    document.getElementById("learnContent");

  if (!target) {
    return;
  }

  if (!LEARN_DATA.glossary) {
    target.innerHTML = `
      <div class="card">
        <p>まなぶデータを よみこんでいます…</p>
      </div>
    `;

    return;
  }

  if (learnMode === "glossary") {
    renderGlossary(target);
    return;
  }

  if (learnMode === "why") {
    renderWhy(target);
    return;
  }

  if (learnMode === "lessons") {
    renderLessons(target);
    return;
  }

  renderLearnOverview(target);
}


function renderLearnOverview(target) {
  const kid = isKidMode();

  target.innerHTML = `
    <div class="learn-menu-grid">

      <button
        type="button"
        class="learn-menu-card"
        data-learn-mode="glossary"
      >
        <span class="learn-menu-icon">📖</span>
        <strong>
          ${kid ? "ことばを しろう" : "用語集"}
        </strong>
        <span>
          ${kid
            ? "おかねの ことばを おぼえよう"
            : "お金・投資・経済の基本用語"}
        </span>
      </button>

      <button
        type="button"
        class="learn-menu-card"
        data-learn-mode="why"
      >
        <span class="learn-menu-icon">❓</span>
        <strong>
          ${kid ? "なぜなぜ？" : "なぜなぜ？"}
        </strong>
        <span>
          ${kid
            ? "おかねの ぎもんを かんがえよう"
            : "お金や経済の「なぜ？」を考える"}
        </span>
      </button>

      <button
        type="button"
        class="learn-menu-card"
        data-learn-mode="lessons"
      >
        <span class="learn-menu-icon">🌏</span>
        <strong>
          ${kid ? "おかねの しくみ" : "お金のしくみ"}
        </strong>
        <span>
          ${kid
            ? "おかねが どうやって うごくか しろう"
            : "経済・会社・投資の仕組みを学ぶ"}
        </span>
      </button>

    </div>

    <div class="card learn-message">
      <div class="learn-message-icon">💡</div>

      <h3>
        ${kid
          ? "おかねは、つかいながら おぼえよう"
          : "お金は、使いながら学ぶ"}
      </h3>

      <p>
        ${kid
          ? "じぶんの おかねが どうして ふえたり へったりするのか、すこしずつ かんがえてみよう。"
          : "自分のお金の動きをきっかけに、貯金・投資・経済の仕組みを少しずつ学んでいきましょう。"}
      </p>
    </div>
  `;

  bindLearnButtons();
}


function renderGlossary(target) {
  const items =
    LEARN_DATA.glossary.items || [];

  const categories = [
    "all",
    ...new Set(
      items.map(item => item.category)
    )
  ];

  const filtered =
    learnCategory === "all"
      ? items
      : items.filter(
          item =>
            item.category === learnCategory
        );

  target.innerHTML = `
    ${renderLearnBackButton()}

    <div class="learn-filter">
      ${categories.map(category => `
        <button
          type="button"
          class="${
            learnCategory === category
              ? "active"
              : ""
          }"
          data-learn-category="${escapeLearnHtml(category)}"
        >
          ${
            category === "all"
              ? "すべて"
              : escapeLearnHtml(category)
          }
        </button>
      `).join("")}
    </div>

    <div class="glossary-grid">
      ${
        filtered.map(renderGlossaryCard).join("")
      }
    </div>
  `;

  bindLearnButtons();
}


function renderGlossaryCard(item) {
  const title =
    isKidMode()
      ? item.kidTerm
      : item.term;

  const description =
    isKidMode()
      ? item.kid
      : item.adult;

  return `
    <article class="card glossary-card">
      <div class="learn-card-top">
        <span class="learn-icon">
          ${item.icon}
        </span>

        <span class="learn-category">
          ${escapeLearnHtml(item.category)}
        </span>
      </div>

      <h3>
        ${escapeLearnHtml(title)}
      </h3>

      <p>
        ${escapeLearnHtml(description)}
      </p>

      ${
        item.example
          ? `
            <div class="learn-example">
              <strong>💡 たとえば</strong>
              <p>
                ${escapeLearnHtml(item.example)}
              </p>
            </div>
          `
          : ""
      }
    </article>
  `;
}


function renderWhy(target) {
  const items =
    LEARN_DATA.why.items || [];

  target.innerHTML = `
    ${renderLearnBackButton()}

    <div class="why-grid">
      ${
        items.map(renderWhyCard).join("")
      }
    </div>
  `;

  bindLearnButtons();
}


function renderWhyCard(item) {
  const title =
    isKidMode()
      ? item.kidQuestion
      : item.question;

  return `
    <article
      class="card why-card"
      data-why-id="${item.id}"
    >
      <div class="why-icon">
        ${item.icon}
      </div>

      <span class="learn-category">
        ${escapeLearnHtml(item.category)}
      </span>

      <h3>
        ${escapeLearnHtml(title)}
      </h3>

      <button
        type="button"
        class="secondary wide"
        data-why-open="${item.id}"
      >
        ${
          isKidMode()
            ? "こたえを みる"
            : "答えを見る"
        }
      </button>
    </article>
  `;
}


function openWhy(id) {
  const item =
    LEARN_DATA.why.items.find(
      entry => entry.id === id
    );

  if (!item) {
    return;
  }

  const target =
    document.getElementById("learnContent");

  if (!target) {
    return;
  }

  const title =
    isKidMode()
      ? item.kidQuestion
      : item.question;

  const answer =
    isKidMode()
      ? item.kid
      : item.adult;

  target.innerHTML = `
    ${renderLearnBackButton("why")}

    <article class="card why-detail">

      <div class="why-detail-icon">
        ${item.icon}
      </div>

      <span class="learn-category">
        ${escapeLearnHtml(item.category)}
      </span>

      <h2>
        ${escapeLearnHtml(title)}
      </h2>

      <div class="why-answer">
        <h3>
          ${
            isKidMode()
              ? "こたえ"
              : "答え"
          }
        </h3>

        <p>
          ${escapeLearnHtml(answer)}
        </p>
      </div>

      ${
        item.next
          ? `
            <button
              type="button"
              class="primary wide"
              data-glossary-open="${item.next}"
            >
              📖
              ${
                isKidMode()
                  ? "ことばも しらべる"
                  : "関連する用語を見る"
              }
            </button>
          `
          : ""
      }

    </article>
  `;

  bindLearnButtons();
}


function renderLessons(target) {
  const lessons =
    LEARN_DATA.lessons.lessons || [];

  target.innerHTML = `
    ${renderLearnBackButton()}

    <div class="lesson-grid">
      ${
        lessons.map(renderLessonCard).join("")
      }
    </div>
  `;

  bindLearnButtons();
}


function renderLessonCard(item) {
  const title =
    isKidMode()
      ? item.kidTitle
      : item.title;

  const description =
    isKidMode()
      ? item.kid
      : item.adult;

  return `
    <article
      class="card lesson-card-v23"
      data-lesson-id="${item.id}"
    >
      <div class="lesson-icon">
        ${item.icon}
      </div>

      <span class="learn-category">
        ${escapeLearnHtml(item.category)}
      </span>

      <h3>
        ${escapeLearnHtml(title)}
      </h3>

      <p>
        ${escapeLearnHtml(description)}
      </p>

      <button
        type="button"
        class="secondary wide"
        data-lesson-open="${item.id}"
      >
        ${
          isKidMode()
            ? "くわしく みる"
            : "詳しく見る"
        }
      </button>
    </article>
  `;
}


function openLesson(id) {
  const item =
    LEARN_DATA.lessons.lessons.find(
      entry => entry.id === id
    );

  if (!item) {
    return;
  }

  const target =
    document.getElementById("learnContent");

  if (!target) {
    return;
  }

  const title =
    isKidMode()
      ? item.kidTitle
      : item.title;

  const description =
    isKidMode()
      ? item.kid
      : item.adult;

  const steps =
    Array.isArray(item.steps)
      ? item.steps
      : [];

  target.innerHTML = `
    ${renderLearnBackButton("lessons")}

    <article class="card lesson-detail">

      <div class="lesson-icon large">
        ${item.icon}
      </div>

      <span class="learn-category">
        ${escapeLearnHtml(item.category)}
      </span>

      <h2>
        ${escapeLearnHtml(title)}
      </h2>

      <p class="lesson-description">
        ${escapeLearnHtml(description)}
      </p>

      <div class="lesson-flow">
        ${
          steps.map(
            step => `
              <div class="lesson-flow-item">
                ${escapeLearnHtml(step)}
              </div>
            `
          ).join("")
        }
      </div>

      <div class="learn-message">
        <strong>
          ${
            isKidMode()
              ? "🌱 おぼえておこう"
              : "🌱 ポイント"
          }
        </strong>

        <p>
          ${
            isKidMode()
              ? "おかねの うごきには、いろいろな りゆうが あるよ。すぐに こたえを きめずに、「なぜ？」と かんがえてみよう。"
              : "お金の動きにはさまざまな理由があります。数字だけを見るのではなく、「なぜ動いたのか」を考えることが金融教育につながります。"
          }
        </p>
      </div>

    </article>
  `;

  bindLearnButtons();
}


function renderLearnBackButton(mode) {
  return `
    <div class="learn-back-row">
      <button
        type="button"
        class="secondary"
        data-learn-mode="${
          mode === "why" || mode === "lessons"
            ? mode
            : "overview"
        }"
      >
        ←
        ${
          isKidMode()
            ? "もどる"
            : "戻る"
        }
      </button>
    </div>
  `;
}


function openGlossary(id) {
  const item =
    LEARN_DATA.glossary.items.find(
      entry => entry.id === id
    );

  if (!item) {
    return;
  }

  const target =
    document.getElementById("learnContent");

  if (!target) {
    return;
  }

  target.innerHTML = `
    ${renderLearnBackButton("glossary")}

    <article class="card glossary-detail">

      <div class="learn-icon large">
        ${item.icon}
      </div>

      <span class="learn-category">
        ${escapeLearnHtml(item.category)}
      </span>

      <h2>
        ${
          escapeLearnHtml(
            isKidMode()
              ? item.kidTerm
              : item.term
          )
        }
      </h2>

      <p>
        ${
          escapeLearnHtml(
            isKidMode()
              ? item.kid
              : item.adult
          )
        }
      </p>

      ${
        item.example
          ? `
            <div class="learn-example">
              <strong>💡 たとえば</strong>
              <p>
                ${escapeLearnHtml(item.example)}
              </p>
            </div>
          `
          : ""
      }

    </article>
  `;

  bindLearnButtons();
}


function bindLearnButtons() {
  document
    .querySelectorAll("[data-learn-mode]")
    .forEach(button => {
      button.onclick = () => {
        learnMode =
          button.dataset.learnMode;

        if (
          learnMode !== "glossary"
        ) {
          learnCategory = "all";
        }

        renderLearn();
      };
    });

  document
    .querySelectorAll("[data-learn-category]")
    .forEach(button => {
      button.onclick = () => {
        learnCategory =
          button.dataset.learnCategory;

        renderLearn();
      };
    });

  document
    .querySelectorAll("[data-why-open]")
    .forEach(button => {
      button.onclick = () => {
        openWhy(
          button.dataset.whyOpen
        );
      };
    });

  document
    .querySelectorAll("[data-lesson-open]")
    .forEach(button => {
      button.onclick = () => {
        openLesson(
          button.dataset.lessonOpen
        );
      };
    });

  document
    .querySelectorAll("[data-glossary-open]")
    .forEach(button => {
      button.onclick = () => {
        openGlossary(
          button.dataset.glossaryOpen
        );
      };
    });
}


function escapeLearnHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function refreshLearnForModeChange() {
  if (
    document.getElementById("learnContent")
  ) {
    renderLearn();
  }
}


document.addEventListener(
  "DOMContentLoaded",
  () => {
    loadLearnData();
  }
);
