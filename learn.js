"use strict";
/* V32 quiz engine: question pool + per-child seen IDs + random selection. */
(function(){
  const QUESTIONS=[
    {id:"save-01",title:"ためる",question:"おこづかいを すぐにつかわず、あとでつかうために のこすことは？",kidQuestion:"おかねを のこして おくことは？",choices:["ためる","なくす","すてる"],answer:0,explain:"つかわずに のこすことを 貯金（ちょきん）といいます。"},
    {id:"need-01",title:"ひつようなもの",question:"毎日の生活に必要なものは、どれ？",kidQuestion:"まいにち ひつようなものは？",choices:["ごはん","ゲームを100こ","おもちゃを100こ"],answer:0,explain:"食べものなど、生活に必要なものがあります。"},
    {id:"want-01",title:"ほしいもの",question:"『ほしいもの』にお金を使う前に大切なことは？",kidQuestion:"ほしいものを かうまえに たいせつなことは？",choices:["お金があるか考える","全部買う","お金を数えない"],answer:0,explain:"使えるお金を確認してから考えるのが大切です。"},
    {id:"risk-01",title:"とうし",question:"投資では、どうなることがある？",kidQuestion:"とうしの おかねは どうなることが ある？",choices:["増えることも減ることもある","必ず増える","絶対に変わらない"],answer:0,explain:"投資には値上がりと値下がりがあります。"},
    {id:"div-01",title:"わける",question:"お金を一つだけではなく、いくつかに分ける考え方は？",kidQuestion:"おかねを いくつかに わける かんがえかたは？",choices:["分散","全部使う","放置"],answer:0,explain:"分散すると、一つのものだけに頼るリスクを減らせます。"},
    {id:"interest-01",title:"ふえる",question:"1000円をためて、少しずつ増える仕組みを何という？",kidQuestion:"1000えんが すこしずつ ふえる しくみは？",choices:["利息","買い物","おつり"],answer:0,explain:"預金などでは利息がつくことがあります。"},
    {id:"budget-01",title:"よさん",question:"使うお金と、ためるお金を先に決めることは？",kidQuestion:"つかう おかねと ためる おかねを さきに きめることは？",choices:["予算を立てる","全部使う","何も考えない"],answer:0,explain:"予算を決めると、お金の使い方を考えやすくなります。"},
    {id:"price-01",title:"ねだん",question:"同じ商品でも、店によって値段が違うときは？",kidQuestion:"おなじものでも おみせで ねだんが ちがうときは？",choices:["比べて選べる","必ず高い店で買う","値段を見ない"],answer:0,explain:"値段や内容を比べて選ぶことができます。"},
    {id:"goal-01",title:"めあて",question:"ほしいもののために必要なお金を少しずつためるのは？",kidQuestion:"ほしいもののために おかねを すこしずつ ためるのは？",choices:["目標を決めてためる","全部使う","あきらめる"],answer:0,explain:"目標金額と期限を決めると続けやすくなります。"},
    {id:"tax-01",title:"おかねのルール",question:"お店で商品を買ったとき、商品代とは別にかかることがあるものは？",kidQuestion:"おみせで かいものをしたとき、べつに かかることが あるものは？",choices:["消費税","宿題税","ゲーム税"],answer:0,explain:"日本では買い物などに消費税がかかります。"}
  ];
  let current=null;
  function km(){return window.KidsMoney;}
  function mode(){return km()?.isKidMode?.()||false;}
  function child(){return km()?.getCurrentChild?.();}
  function esc(v){return km()?.escapeHtml?.(v)||String(v??"");}
  function getLearning(){const c=child();if(!c)return null;c.learning=c.learning&&typeof c.learning==="object"?c.learning:{};c.learning.seenQuizIds=Array.isArray(c.learning.seenQuizIds)?c.learning.seenQuizIds:[];c.learning.history=Array.isArray(c.learning.history)?c.learning.history:[];return c.learning;}
  function pickQuestion(){const l=getLearning();if(!l)return null;let unseen=QUESTIONS.filter(q=>!l.seenQuizIds.includes(q.id));if(!unseen.length){l.seenQuizIds=[];unseen=QUESTIONS.slice();}return unseen[Math.floor(Math.random()*unseen.length)];}
  function render(){const box=document.getElementById("learn");if(!box)return;const q=current||pickQuestion();current=q;if(!q){box.innerHTML="";return;}const kid=mode();const question=kid?(q.kidQuestion||q.question):q.question;const choices=q.choices.map((x,i)=>`<button class="quiz-choice" type="button" data-answer="${i}">${esc(kid?kidChoice(x):x)}</button>`).join("");box.innerHTML=`<div class="section-header"><div><h2>${kid?"おかね クイズ":"お金クイズ"}</h2><p class="muted">${esc(q.title)}</p></div><button class="secondary" type="button" id="nextQuiz">${kid?"🔄 つぎの もんだい":"🔄 別の問題"}</button></div><div class="quiz-card"><div class="quiz-number">🎯</div><h3>${esc(question)}</h3><div class="quiz-choices">${choices}</div><div id="quizResult"></div></div>`;}
  function kidChoice(x){const m={"ためる":"ためる","なくす":"なくす","すてる":"すてる","ごはん":"ごはん","ゲームを100こ":"ゲームを 100こ","おもちゃを100こ":"おもちゃを 100こ","お金があるか考える":"おかねが あるか かんがえる","全部買う":"ぜんぶ かう","お金を数えない":"おかねを かぞえない","増えることも減ることもある":"ふえることも へることも ある","必ず増える":"かならず ふえる","絶対に変わらない":"かわらない","分散":"わける","全部使う":"ぜんぶ つかう","放置":"そのまま","利息":"りそく","買い物":"かいもの","おつり":"おつり","予算を立てる":"よさんを たてる","何も考えない":"なにも かんがえない","比べて選べる":"くらべて えらべる","必ず高い店で買う":"たかい おみせで かう","値段を見ない":"ねだんを みない","目標を決めてためる":"めあてを きめて ためる","あきらめる":"あきらめる","消費税":"しょうひぜい","宿題税":"しゅくだいぜい","ゲーム税":"ゲームぜい"};return m[x]||x;}
  function answer(index){if(!current)return;const l=getLearning();const correct=index===current.answer;if(l.seenQuizIds.indexOf(current.id)<0)l.seenQuizIds.push(current.id);l.quizAnswered=(l.quizAnswered||0)+1;if(correct){l.quizCorrect=(l.quizCorrect||0)+1;l.streak=(l.streak||0)+1;l.bestStreak=Math.max(l.bestStreak||0,l.streak);}else l.streak=0;l.history.push({date:new Date().toISOString().slice(0,10),questionId:current.id,title:current.title,correct});l.history=l.history.slice(-100);km().saveState();const r=document.getElementById("quizResult");if(r)r.innerHTML=`<div class="quiz-result ${correct?'correct':'wrong'}"><strong>${correct?(mode()?"⭕ せいかい！":"⭕ 正解です！"):(mode()?"❌ ちがうよ":"❌ 不正解です")}</strong><p>${esc(mode()?kidExplain(current.explain):current.explain)}</p><button class="primary" type="button" id="nextQuiz2">${mode()?"つぎへ":"次の問題"}</button></div>`;document.querySelectorAll(".quiz-choice").forEach(b=>b.disabled=true);}
  function kidExplain(s){return s.replace(/投資/g,"とうし").replace(/値上がり/g,"ねだんが あがる").replace(/値下がり/g,"ねだんが さがる").replace(/分散/g,"わける").replace(/利息/g,"りそく").replace(/消費税/g,"しょうひぜい").replace(/予算/g,"よさん").replace(/目標/g,"めあて").replace(/貯金/g,"ためる");}
  document.addEventListener("click",e=>{const a=e.target.closest("[data-answer]");if(a)answer(Number(a.dataset.answer));if(e.target.closest("#nextQuiz")||e.target.closest("#nextQuiz2")){current=null;render();}});
  window.KidsMoneyLearn={render,next:()=>{current=null;render();},getQuestions:()=>QUESTIONS};
  window.refreshLearnForModeChange=()=>{current=null;render();};
  window.addEventListener("kidsMoneyChildChanged",()=>{current=null;render();});
  window.addEventListener("kidsMoneyKidModeChanged",()=>{current=null;render();});
})();
