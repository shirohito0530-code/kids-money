"use strict";
/* V32.1 education: reference learning, separate from quiz history. */
(function(){
  const WHY=[
    {q:"なぜ、お金をためるの？",kid:"どうして おかねを ためるの？",a:"ほしいものや、こまったときに使えるようにするためです。",kidA:"ほしいものや、こまったときに つかえるようにするためだよ。"},
    {q:"なぜ、使う前に考えるの？",kid:"どうして つかうまえに かんがえるの？",a:"使えるお金には限りがあるので、大切なものから使うためです。",kidA:"つかえる おかねには かぎりが あるからだよ。"},
    {q:"なぜ、投資は増えたり減ったりするの？",kid:"どうして とうしの おかねは ふえたり へったりするの？",a:"株などの値段が毎日変わるからです。",kidA:"かぶなどの ねだんが かわるからだよ。"}
  ];
  const TERMS=[
    ["貯金（ちょきん）","お金をすぐ使わずに残しておくこと。","おかねを のこして おくこと。"],
    ["投資（とうし）","お金を使って、将来の成長を期待すること。値下がりすることもあります。","おかねを つかって、ふえることを きたいすること。へることも あるよ。"],
    ["インデックス","株式などの値動きをまとめて表す数字。","かぶなどの うごきを まとめた すうじ。"],
    ["利息（りそく）","お金を預けたときなどに、受け取ることがある増加分。","おかねを あずけたときなどに つくことが ある おかね。"],
    ["分散（ぶんさん）","一つだけに集中せず、いくつかに分ける考え方。","ひとつだけに せず、いくつかに わける かんがえかた。"]
  ];
  const K={title:"お金のべんきょう",kidTitle:"おかねの おべんきょう",why:"なぜなぜ",terms:"用語集",kidTerms:"ことばの ほん"};
  const km=()=>window.KidsMoney, mode=()=>km()?.isKidMode?.()||false, esc=v=>km()?.escapeHtml?.(v)||String(v??"");
  function render(){const box=document.getElementById('education');if(!box)return;const kid=mode();box.innerHTML=`<div class="section-header"><div><h2>${kid?K.kidTitle:K.title}</h2><p class="muted">${esc(km()?.getCurrentChild?.()?.name||'')}</p></div><button class="primary" type="button" data-tab="learn">${kid?'🎯 クイズをする':'🎯 クイズをする'}</button></div>
    <div class="education-grid"><section class="card"><h3>💡 ${kid?K.why:'なぜなぜ'}</h3>${WHY.map(x=>`<details class="why-item"><summary>${esc(kid?x.kid:x.q)}</summary><p>${esc(kid?x.kidA:x.a)}</p></details>`).join('')}</section>
    <section class="card"><h3>📚 ${kid?K.kidTerms:K.terms}</h3><div class="term-list">${TERMS.map(x=>`<details class="term-item"><summary>${esc(kid?x[0].replace(/（.*?）/g,''):x[0])}</summary><p>${esc(kid?x[2]:x[1])}</p></details>`).join('')}</div></section></div>`;}
  window.KidsMoneyEducation={render}; window.addEventListener('kidsMoneyChildChanged',render);window.addEventListener('kidsMoneyKidModeChanged',render);window.addEventListener('kidsMoneyRendered',render);
})();
