"use strict";
/* V32 learning dashboard. Per-child learning is stored only in child.learning. */
(function(){
  const JP={
    title:"お金のべんきょう", kidTitle:"おかねの おべんきょう",
    stats:"べんきょうの記録", kidStats:"べんきょうの きろく",
    answered:"こたえた数", kidAnswered:"こたえた かず", correct:"せいかい", kidCorrect:"せいかい",
    streak:"れんぞく正解", kidStreak:"れんぞく せいかい", empty:"まだ記録がありません。", kidEmpty:"まだ きろくが ないよ。"
  };
  function km(){return window.KidsMoney;}
  function child(){return km()?.getCurrentChild?.();}
  function mode(){return km()?.isKidMode?.()||false;}
  function learning(){const c=child(); if(!c)return null; if(!c.learning||typeof c.learning!=="object")c.learning={}; return c.learning;}
  function normalize(){const l=learning();if(!l)return null;l.quizAnswered=Number(l.quizAnswered||0);l.quizCorrect=Number(l.quizCorrect||0);l.streak=Number(l.streak||0);l.bestStreak=Number(l.bestStreak||0);l.history=Array.isArray(l.history)?l.history:[];l.lessons=Array.isArray(l.lessons)?l.lessons:[];l.seenQuizIds=Array.isArray(l.seenQuizIds)?l.seenQuizIds:[];return l;}
  function render(){const box=document.getElementById("education");if(!box)return;const l=normalize();if(!l)return;const kid=mode();const rate=l.quizAnswered?Math.round(l.quizCorrect/l.quizAnswered*100):0;box.innerHTML=`<div class="section-header"><div><h2>${kid?JP.kidTitle:JP.title}</h2><p class="muted">${escapeText(child()?.name||"")}</p></div><button class="primary" type="button" data-tab="learn">${kid?"🎯 クイズをする":"🎯 クイズを始める"}</button></div><div class="study-stats"><div class="stat"><span>${kid?JP.kidAnswered:JP.answered}</span><strong>${l.quizAnswered}</strong></div><div class="stat"><span>${kid?JP.kidCorrect:JP.correct}</span><strong>${l.quizCorrect} <small>(${rate}%)</small></strong></div><div class="stat"><span>${kid?JP.kidStreak:JP.streak}</span><strong>${l.streak}</strong></div><div class="stat"><span>${kid?"さいこう":"最高連続"}</span><strong>${l.bestStreak}</strong></div></div><div class="card"><h3>${kid?"さいきんの べんきょう":"最近の学習"}</h3>${l.history.length?l.history.slice().reverse().slice(0,8).map(h=>`<div class="study-history"><span>${escapeText(h.date||"")}</span><span>${escapeText(h.title||"クイズ")}</span><strong>${h.correct?"⭕":"❌"}</strong></div>`).join(""):`<p class="muted">${kid?JP.kidEmpty:JP.empty}</p>`}</div>`;}
  function escapeText(v){return km()?.escapeHtml?.(v)||String(v??"");}
  window.KidsMoneyEducation={render,normalize};
  window.addEventListener("kidsMoneyChildChanged",render);
  window.addEventListener("kidsMoneyKidModeChanged",render);
  window.addEventListener("kidsMoneyRendered",render);
})();
