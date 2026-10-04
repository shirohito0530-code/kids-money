"use strict";
/*
 * Kids Money Lab V32.2
 * Quiz contract:
 * - 10 questions = 1 round.
 * - No duplicate question inside the same round.
 * - Choices are shuffled for every question, so the correct answer is not always first.
 * - Score is shown only after question 10.
 * - Quiz history and statistics remain child-specific via app.js current child.
 * - Existing V32 learning data remains compatible.
 */
(function(){
  const Q = [
    {id:"save-01",level:1,title:"ためる",q:"おこづかいを すぐにつかわず、あとでつかうために のこすことは？",k:"おかねを のこして おくことは？",c:["ためる","なくす","すてる"],a:0,e:"つかわずに のこすことを 貯金（ちょきん）といいます。",ke:"おかねを のこして おくことを ためると いうよ。"},
    {id:"need-01",level:1,title:"ひつようなもの",q:"毎日の生活に必要なものは、どれ？",k:"まいにち ひつようなものは？",c:["ごはん","ゲームを100こ","おもちゃを100こ"],a:0,e:"食べものなど、生活に必要なものがあります。",ke:"ごはんなど、くらしに ひつようなものが あるよ。"},
    {id:"want-01",level:1,title:"ほしいもの",q:"ほしいものにお金を使う前に大切なことは？",k:"ほしいものを かうまえに たいせつなことは？",c:["お金があるか考える","全部買う","お金を数えない"],a:0,e:"使えるお金を確認してから考えるのが大切です。",ke:"つかえる おかねを かくにんしてから かんがえよう。"},
    {id:"risk-01",level:1,title:"とうし",q:"投資では、どうなることがある？",k:"とうしの おかねは どうなることが ある？",c:["増えることも減ることもある","必ず増える","絶対に変わらない"],a:0,e:"投資には値上がりと値下がりがあります。",ke:"とうしは ふえることも へることも あるよ。"},
    {id:"div-01",level:1,title:"わける",q:"お金をいくつかに分ける考え方は？",k:"おかねを いくつかに わける かんがえかたは？",c:["分散","全部使う","放置"],a:0,e:"分散すると、一つだけに頼るリスクを減らせます。",ke:"いくつかに わけると、ひとつだけに たよる きけんを へらせるよ。"},
    {id:"interest-01",level:1,title:"ふえる",q:"1000円をためて少しずつ増える仕組みを何という？",k:"1000えんが すこしずつ ふえる しくみは？",c:["利息","買い物","おつり"],a:0,e:"預金などでは利息がつくことがあります。",ke:"おかねを あずけると りそくが つくことが あるよ。"},
    {id:"budget-01",level:1,title:"よさん",q:"使うお金と、ためるお金を先に決めることは？",k:"つかう おかねと ためる おかねを さきに きめることは？",c:["予算を立てる","全部使う","何も考えない"],a:0,e:"予算を決めると、お金の使い方を考えやすくなります。",ke:"つかう おかねを さきに きめると かんがえやすいよ。"},
    {id:"price-01",level:1,title:"ねだん",q:"同じ商品でも店によって値段が違うときは？",k:"おなじものでも おみせで ねだんが ちがうときは？",c:["比べて選べる","必ず高い店で買う","値段を見ない"],a:0,e:"値段や内容を比べて選ぶことができます。",ke:"ねだんを くらべて えらべるよ。"},
    {id:"goal-01",level:1,title:"めあて",q:"ほしいもののために必要なお金を少しずつためるのは？",k:"ほしいもののために おかねを すこしずつ ためるのは？",c:["目標を決めてためる","全部使う","あきらめる"],a:0,e:"目標金額と期限を決めると続けやすくなります。",ke:"めあてと きげんを きめると つづけやすいよ。"},
    {id:"tax-01",level:1,title:"おかねのルール",q:"商品を買ったとき、商品代とは別にかかることがあるものは？",k:"かいものをしたとき、べつに かかることが あるものは？",c:["消費税","宿題税","ゲーム税"],a:0,e:"日本では買い物などに消費税がかかります。",ke:"にほんでは かいものなどに しょうひぜいが かかるよ。"},
    {id:"income-01",level:2,title:"もらう",q:"働いたり、お手伝いをしたりして受け取るお金を何という？",k:"はたらいたり、おてつだいをして もらう おかねを なんという？",c:["収入","値段","借金"],a:0,e:"受け取るお金を収入といいます。",ke:"もらう おかねを しゅうにゅうと いうよ。"},
    {id:"expense-01",level:2,title:"つかう",q:"商品やサービスに支払うお金を何という？",k:"ものや サービスに はらう おかねを なんという？",c:["支出","収入","利息"],a:0,e:"支払ったお金を支出といいます。",ke:"はらった おかねを ししゅつと いうよ。"},
    {id:"change-01",level:2,title:"おつり",q:"500円で300円の商品を買ったとき、おつりはいくら？",k:"500えんで 300えんのものを かったら、おつりは いくら？",c:["200円","100円","800円"],a:0,e:"500円−300円なので、おつりは200円です。",ke:"500えんから300えんを ひくと、200えんだよ。"},
    {id:"compare-01",level:2,title:"くらべる",q:"同じ予算で買うものを選ぶとき、何を比べるとよい？",k:"おなじ おかねで かうものを えらぶとき、なにを くらべると いい？",c:["値段と必要さ","色だけ","箱の大きさだけ"],a:0,e:"値段だけでなく、本当に必要かも考えるとよいです。",ke:"ねだんだけでなく、ほんとうに ひつようかも かんがえよう。"},
    {id:"scam-01",level:2,title:"あんぜん",q:"知らない人から「お金を送って」と言われたらどうする？",k:"しらないひとから「おかねを おくって」と いわれたら？",c:["大人に相談する","すぐ送る","秘密にする"],a:0,e:"困ったときは保護者など信頼できる大人に相談します。",ke:"こまったら、おうちのひとなどに そうだんしよう。"},
    {id:"borrow-01",level:2,title:"かりる",q:"お金を借りるときに大切なことは？",k:"おかねを かりるときに たいせつなことは？",c:["返す約束を確認する","返さなくてよいと思う","金額を確認しない"],a:0,e:"借りる前に返す金額や期限を確認することが大切です。",ke:"かりるまえに、かえす おかねや いつまでかを かくにんしよう。"},
    {id:"goal-date-01",level:2,title:"きげん",q:"目標を達成するために期限を決めるよさは？",k:"めあてを かなえるために きげんを きめると どうなる？",c:["計画を立てやすい","必ずすぐ達成できる","お金が自動で増える"],a:0,e:"期限があると、毎月いくら必要か考えやすくなります。",ke:"きげんが あると、いつまでに いくら ためるか かんがえやすいよ。"},
    {id:"index-01",level:3,title:"インデックス",q:"インデックスは何を表すもの？",k:"インデックスは なにを あらわす もの？",c:["市場などの値動きを表す数字","銀行の暗証番号","買い物のレシート"],a:0,e:"インデックスは、株式などの値動きをまとめて表す数字です。",ke:"インデックスは、かぶなどの うごきを まとめた すうじだよ。"},
    {id:"longterm-01",level:3,title:"ながく",q:"投資を長く続けるときに大切な考え方は？",k:"とうしを ながく するときに たいせつな かんがえかたは？",c:["短い値動きだけで決めない","毎日必ず売る","必ず利益が出ると思う"],a:0,e:"短期の値動きだけでなく、長い期間で考えることが大切です。",ke:"みじかい あいだの うごきだけでなく、ながい きかんで かんがえよう。"},
    {id:"save-02",level:1,title:"ためる 2",q:"お金をためるとき、最初に決めるとよいものは？",k:"おかねを ためるとき、さいしょに きめると いいものは？",c:["目標","秘密の暗号","ゲームの点数"],a:0,e:"何のためにいくらためるか、目標を決めると続けやすくなります。",ke:"なんのために いくら ためるか、めあてを きめると つづけやすいよ。"},
    {id:"change-02",level:1,title:"おつり 2",q:"1000円で700円のものを買ったら、おつりはいくら？",k:"1000えんで 700えんのものを かったら、おつりは いくら？",c:["300円","200円","700円"],a:0,e:"1000円から700円を引くと300円です。",ke:"1000えんから700えんを ひくと 300えんだよ。"},
    {id:"need-02",level:1,title:"ひつよう 2",q:"買う前に考えるとよいことは？",k:"かうまえに かんがえると いいことは？",c:["本当に必要か","箱の色だけ","すぐ買うことだけ"],a:0,e:"必要かどうかを考えると、むだづかいを減らせます。",ke:"ほんとうに ひつようか かんがえると、むだづかいを へらせるよ。"},
    {id:"price-02",level:1,title:"ねだん 2",q:"500円と800円なら、安いのはどちら？",k:"500えんと 800えんなら、やすいのは どっち？",c:["500円","800円","どちらも同じ"],a:0,e:"数字が小さい500円のほうが安いです。",ke:"すうじが ちいさい 500えんの ほうが やすいよ。"},
    {id:"budget-02",level:1,title:"よさん 2",q:"1000円のうち500円を使ったら、残りはいくら？",k:"1000えんのうち 500えんを つかったら、のこりは いくら？",c:["500円","100円","1500円"],a:0,e:"1000円−500円で、残りは500円です。",ke:"1000えんから500えんを ひくと、500えん のこるよ。"},
    {id:"income-02",level:2,title:"収入 2",q:"収入と支出のうち、もらったお金はどちら？",k:"しゅうにゅうと ししゅつのうち、もらった おかねは どっち？",c:["収入","支出","どちらでもない"],a:0,e:"受け取ったお金を収入といいます。",ke:"もらった おかねを しゅうにゅうと いうよ。"},
    {id:"expense-02",level:2,title:"支出 2",q:"支出を記録すると何が分かりやすくなる？",k:"ししゅつを きろくすると なにが わかりやすくなる？",c:["何にお金を使ったか","明日の天気","友だちの成績"],a:0,e:"支出を記録すると、お金を何に使ったか振り返れます。",ke:"ししゅつを きろくすると、なにに おかねを つかったか わかるよ。"},
    {id:"borrow-02",level:2,title:"かりる 2",q:"お金を借りるとき、返す期限を確認するのはなぜ？",k:"おかねを かりるとき、かえす きげんを かくにんするのは どうして？",c:["計画を立てるため","返さなくてよくするため","金額を忘れるため"],a:0,e:"いつ返すか分かると、返すための計画を立てられます。",ke:"いつ かえすか わかると、かえす けいかくを たてられるよ。"},
    {id:"scam-02",level:2,title:"あんぜん 2",q:"ネットで知らない人にお金を要求されたら？",k:"ネットで しらないひとに おかねを ちょうだいと いわれたら？",c:["大人に相談する","すぐ送る","自分だけで秘密にする"],a:0,e:"お金や個人情報に関する困りごとは信頼できる大人に相談します。",ke:"おかねや たいせつな じょうほうで こまったら、おとなに そうだんしよう。"},
    {id:"tax-02",level:2,title:"しょうひぜい 2",q:"消費税は、主に何をするときにかかる？",k:"しょうひぜいは、だいたい なにを するときに かかる？",c:["商品やサービスを買うとき","寝るとき","宿題をするとき"],a:0,e:"日本では多くの商品やサービスの購入に消費税がかかります。",ke:"にほんでは おおくの かいものに しょうひぜいが かかるよ。"},
    {id:"div-02",level:2,title:"わける 2",q:"貯金だけでなく投資などに分ける考え方を何という？",k:"ためるだけでなく、とうしなどに わける かんがえかたは？",c:["分散","全部使う","固定"],a:0,e:"資産を複数に分ける考え方を分散といいます。",ke:"おかねを いくつかに わける かんがえかたを ぶんさんと いうよ。"},
    {id:"interest-02",level:2,title:"りそく 2",q:"利息が付くと、預けたお金はどうなることがある？",k:"りそくが つくと、あずけた おかねは どうなることが ある？",c:["増える","必ずゼロになる","必ず半分になる"],a:0,e:"利息によって、受け取る金額が増えることがあります。",ke:"りそくで、もらえる おかねが ふえることが あるよ。"},
    {id:"index-02",level:3,title:"インデックス 2",q:"株価指数が上がったとき、一般にその指数が表す市場はどうなった？",k:"かぶの しすうが あがったとき、だいたい どうなった？",c:["値上がりした","必ず全部売れた","銀行の金利だけが変わった"],a:0,e:"指数が上がることは、その指数を構成する市場の値動きが上向いたことを示します。",ke:"しすうが あがるのは、その しすうが あらわす かぶなどが あがったことを しめすよ。"},
    {id:"compound-01",level:3,title:"ふくり",q:"増えた分も含めて、さらに増える仕組みを何という？",k:"ふえた おかねも ふくめて、さらに ふえる しくみは？",c:["複利","おつり","値引き"],a:0,e:"元のお金だけでなく、増えた分にも増加が生じる考え方を複利といいます。",ke:"ふえた ぶんにも ふえる かんがえかたを ふくりと いうよ。"},
    {id:"risk-return-01",level:3,title:"リスクとリターン",q:"一般に、高いリターンを期待する投資では何にも注意する？",k:"おおきな ふえかたを きたいする とうしでは、なにに きをつける？",c:["値下がりの可能性","必ずもうかること","お金が減らないこと"],a:0,e:"高いリターンを期待する投資ほど、値下がりなどのリスクにも注意が必要です。",ke:"おおきく ふえることを きたいする とうしほど、へる かのうせいにも きをつけよう。"},
    {id:"inflation-01",level:3,title:"インフレ",q:"物の値段が全体として上がり、お金で買える量が減ることを何という？",k:"ものの ねだんが あがって、おかねで かえる ものが へることは？",c:["インフレーション","おつり","分散"],a:0,e:"物価が上がり、お金の実質的な購買力が低下することをインフレーションといいます。",ke:"ものが たかくなって、おかねで かえる りょうが へることを インフレと いうよ。"},
    {id:"div-03",level:3,title:"分散 3",q:"分散投資の主な目的は？",k:"ぶんさん とうしの おもな もくてきは？",c:["一つの資産への依存を減らす","必ず利益を出す","値下がりをゼロにする"],a:0,e:"複数の資産に分けることで、一つの資産だけに依存するリスクを抑える考え方です。",ke:"いくつかに わけて、ひとつだけに たよる きけんを へらす かんがえだよ。"},
    {id:"longterm-02",level:3,title:"ながく 2",q:"長期投資で毎日の値動きだけを見て判断しない理由は？",k:"ながい とうしで、まいにちの うごきだけで きめないのは どうして？",c:["短期の変動と長期の成長は別だから","毎日同じ値段だから","投資は絶対に下がらないから"],a:0,e:"市場価格は短期で大きく動くことがあるため、長期の目的と分けて考えることが重要です。",ke:"みじかい きかんでは おおきく うごくことが あるから、ながい めあてと わけて かんがえよう。"},
    {id:"fees-01",level:3,title:"てすうりょう",q:"投資商品を買ったり持ったりするとき、かかることがある費用は？",k:"とうしを かったり もったりするとき、かかることが ある おかねは？",c:["手数料などの費用","おつり","消費した時間だけのお金"],a:0,e:"商品によっては購入・保有・売却などに手数料や信託報酬などの費用がかかります。",ke:"とうしの しゅるいによって、てすうりょうなどが かかることが あるよ。"}
    
  ];

  let current=null;
  let roundIds=[];
  let roundIndex=0;
  let roundCorrect=0;
  let answeredInRound=0;
  let roundFinished=false;
  let selectedLevel=Number(localStorage.getItem("kidsMoneyQuizLevelV32"))||1;

  const km=()=>window.KidsMoney;
  const kid=()=>km()?.isKidMode?.()||false;
  const child=()=>km()?.getCurrentChild?.();
  const esc=v=>km()?.escapeHtml?.(v)||String(v??"");

  function learning(){
    const c=child();
    if(!c)return null;
    c.learning=c.learning&&typeof c.learning==="object"?c.learning:{};
    c.learning.history=Array.isArray(c.learning.history)?c.learning.history:[];
    c.learning.seenQuizIds=Array.isArray(c.learning.seenQuizIds)?c.learning.seenQuizIds:[];
    c.learning.quizAnswered=Number(c.learning.quizAnswered||0);
    c.learning.quizCorrect=Number(c.learning.quizCorrect||0);
    c.learning.streak=Number(c.learning.streak||0);
    c.learning.bestStreak=Number(c.learning.bestStreak||0);
    return c.learning;
  }

  function shuffle(list){
    const a=[...list];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function levelQuestions(){
    return Q.filter(q=>Number(q.level||1)===selectedLevel);
  }

  function startRound(){
    const pool=levelQuestions();
    roundIds=shuffle(pool).slice(0,Math.min(10,pool.length)).map(q=>q.id);
    roundIndex=0;
    roundCorrect=0;
    answeredInRound=0;
    roundFinished=false;
    current=null;
  }

  function makeQuestion(){
    if(!roundIds.length || roundIndex>=roundIds.length)return null;
    const source=Q.find(q=>q.id===roundIds[roundIndex]);
    if(!source)return null;
    const choices=source.c.map((text,index)=>({text,index}));
    const shuffled=shuffle(choices);
    return {...source,choices:shuffled,correctChoiceIndex:shuffled.findIndex(x=>x.index===source.a)};
  }

  function progressHtml(){
    const n=Math.min(roundIndex+1,10);
    const isKid=kid();
    return `<div class="quiz-progress">
      <div class="quiz-progress-top"><strong>${isKid?`だい ${Math.ceil((roundIndex+1)/10)} かい`:`第 ${Math.ceil((roundIndex+1)/10)} 回`}</strong><span>${n} / ${Math.min(10,levelQuestions().length)}</span></div>
      <div class="quiz-progress-bar"><span style="width:${Math.min(100,(n/Math.min(10,levelQuestions().length))*100)}%"></span></div>
    </div>`;
  }

  function render(){
    const box=document.getElementById('learn');
    if(!box)return;
    const l=learning();
    if(!l)return;

    if(!roundIds.length || roundIndex>=roundIds.length && !roundFinished) startRound();

    if(roundFinished){
      renderRoundResult(box,l);
      return;
    }

    if(!current) current=makeQuestion();
    if(!current)return;

    const isKid=kid();
    const choices=current.choices.map((x,i)=>
      `<button class="quiz-choice" type="button" data-answer="${i}">${esc(isKid?kidChoice(x.text):x.text)}</button>`
    ).join('');

    const levelSelect=`<div class="quiz-level-picker card"><div><strong>${isKid?'クイズの むずかしさ':'クイズレベル'}</strong><p class="muted">${isKid?'じぶんに あった レベルを えらぼう':'レベルを選んで10問に挑戦します。'}</p></div><div class="level-buttons">${[1,2,3].map(lv=>`<button type="button" class="level-button ${selectedLevel===lv?'active':''}" data-quiz-level="${lv}">${isKid?['🌱 かんたん','🌿 ふつう','🌳 むずかしい'][lv-1]:`Lv.${lv} ${['基礎','標準','発展'][lv-1]}`}</button>`).join('')}</div></div>`;
    box.innerHTML=`
      ${levelSelect}
      <div class="section-header">
        <div><h2>${isKid?'おかね クイズ':'お金クイズ'}</h2><p class="muted">${esc(current.title)}</p></div>
        <button class="secondary" id="nextQuiz" type="button">${isKid?'🔄 ちがう もんだい':'🔄 別の問題'}</button>
      </div>
      ${progressHtml()}
      <div class="quiz-card">
        <div class="quiz-number">🎯 ${roundIndex+1}</div>
        <h3>${esc(isKid?current.k:current.q)}</h3>
        <div class="quiz-choices">${choices}</div>
        <div id="quizResult"></div>
      </div>
    `;
  }

  function renderRoundResult(box,l){
    const isKid=kid();
    const score=roundCorrect;
    const total=roundIds.length;
    const message=score===total
      ?(isKid?"ぜんもん せいかい！":"全問正解です！")
      :score>=7
        ?(isKid?"よく できたね！":"よくできました！")
        :score>=5
          ?(isKid?"あと もうすこし！":"あともう少し！")
          :(isKid?"もういちど やってみよう！":"もう一度挑戦してみましょう！");

    box.innerHTML=`
      <div class="quiz-level-picker card"><div><strong>${isKid?'つぎの レベルを えらぼう':'レベルを選ぶ'}</strong></div><div class="level-buttons">${[1,2,3].map(lv=>`<button type="button" class="level-button ${selectedLevel===lv?'active':''}" data-quiz-level="${lv}">${isKid?['🌱 かんたん','🌿 ふつう','🌳 むずかしい'][lv-1]:`Lv.${lv} ${['基礎','標準','発展'][lv-1]}`}</button>`).join('')}</div></div>
      <div class="section-header">
        <div><h2>${isKid?'クイズの けっか':'クイズ結果'}</h2><p class="muted">${isKid?'10もん おつかれさま！':'10問おつかれさまでした！'}</p></div>
      </div>
      <div class="quiz-card quiz-round-result">
        <div class="quiz-score-label">${isKid?'10もんの せいせき':'10問の成績'}</div>
        <div class="quiz-score">${score}<span> / ${total}</span></div>
        <h3>${message}</h3>
        <p class="muted">${isKid?`これまで ${l.quizCorrect}もん せいかいしたよ。`:`これまでの正解数：${l.quizCorrect}問`}</p>
        <button class="primary wide" id="startQuizRound" type="button">${isKid?'🔄 つぎの 10もん':'🔄 次の10問'}</button>
      </div>
      ${historyHtml(l)}
    `;
  }

  function historyHtml(l){
    const isKid=kid();
    return `<section class="card quiz-history">
      <div class="section-header"><h3>${isKid?'📖 こたえた きろく':'📖 クイズ履歴'}</h3><span>${l.quizAnswered}${isKid?'もん':'問'}</span></div>
      ${l.history.length
        ?l.history.slice().reverse().slice(0,20).map(h=>`<div class="study-history"><span>${esc(h.date||'')}</span><span>${esc(h.title||'クイズ')}</span><strong>${h.correct?'⭕':'❌'}</strong></div>`).join('')
        :`<p class="muted">${isKid?'まだ きろくが ないよ。':'まだクイズ履歴がありません。'}</p>`}
    </section>`;
  }

  const KID={
    "お金があるか考える":"おかねが あるか かんがえる",
    "全部買う":"ぜんぶ かう",
    "お金を数えない":"おかねを かぞえない",
    "増えることも減ることもある":"ふえることも へることも ある",
    "必ず増える":"かならず ふえる",
    "絶対に変わらない":"かわらない",
    "分散":"わける",
    "全部使う":"ぜんぶ つかう",
    "放置":"そのまま",
    "利息":"りそく",
    "買い物":"かいもの",
    "予算を立てる":"よさんを たてる",
    "何も考えない":"なにも かんがえない",
    "比べて選べる":"くらべて えらべる",
    "必ず高い店で買う":"たかい おみせで かう",
    "値段を見ない":"ねだんを みない",
    "目標を決めてためる":"めあてを きめて ためる",
    "消費税":"しょうひぜい",
    "宿題税":"しゅくだいぜい",
    "ゲーム税":"ゲームぜい",
    "収入":"しゅうにゅう",
    "値段":"ねだん",
    "借金":"しゃっきん",
    "支出":"ししゅつ",
    "200円":"200えん",
    "100円":"100えん",
    "800円":"800えん",
    "値段と必要さ":"ねだんと ひつようさ",
    "色だけ":"いろだけ",
    "箱の大きさだけ":"はこの おおきさだけ",
    "知らない人":"しらない ひと",
    "大人に相談する":"おとなに そうだんする",
    "すぐ送る":"すぐ おくる",
    "秘密にする":"ひみつに する",
    "返す約束を確認する":"かえす やくそくを かくにんする",
    "返さなくてよいと思う":"かえさなくて いいと おもう",
    "金額を確認しない":"きんがくを かくにんしない",
    "計画を立てやすい":"けいかくを たてやすい",
    "必ずすぐ達成できる":"かならず すぐ たっせいできる",
    "お金が自動で増える":"おかねが じどうで ふえる",
    "市場などの値動きを表す数字":"しじょうなどの うごきを あらわす すうじ",
    "銀行の暗証番号":"ぎんこうの あんしょうばんごう",
    "買い物のレシート":"かいものの れしーと",
    "短い値動きだけで決めない":"みじかい うごきだけで きめない",
    "毎日必ず売る":"まいにち かならず うる",
    "必ず利益が出ると思う":"かならず もうかると おもう"
  };
  Object.assign(KID,{
    "目標":"めあて","秘密の暗号":"ひみつの あんごう","ゲームの点数":"ゲームの てんすう",
    "300円":"300えん","700円":"700えん","200円":"200えん","1000円":"1000えん","500円":"500えん","1500円":"1500えん",
    "本当に必要か":"ほんとうに ひつようか","箱の色だけ":"はこの いろだけ","すぐ買うことだけ":"すぐ かうことだけ",
    "500円":"500えん","800円":"800えん","どちらも同じ":"どちらも おなじ",
    "収入":"しゅうにゅう","支出":"ししゅつ","どちらでもない":"どちらでも ない",
    "何にお金を使ったか":"なにに おかねを つかったか","明日の天気":"あしたの てんき","友だちの成績":"ともだちの せいせき",
    "返す期限を確認する":"かえす きげんを かくにんする","計画を立てるため":"けいかくを たてるため","返さなくてよくするため":"かえさなくて いいように するため","金額を忘れるため":"きんがくを わすれるため",
    "ネットで知らない人":"ネットの しらない ひと","大人に相談する":"おとなに そうだんする","自分だけで秘密にする":"じぶんだけで ひみつにする",
    "商品やサービスを買うとき":"ものや サービスを かうとき","寝るとき":"ねるとき","宿題をするとき":"しゅくだいを するとき",
    "固定":"そのままに すること","複利":"ふくり","おつり":"おつり","値引き":"ねびき",
    "値上がりした":"ねだんが あがった","銀行の金利だけが変わった":"ぎんこうの きんりだけが かわった",
    "値下がりの可能性":"ねだんが へる かのうせい","必ずもうかること":"かならず もうかること","お金が減らないこと":"おかねが へらないこと",
    "インフレーション":"インフレ","一つの資産への依存を減らす":"ひとつの しさんに たよるのを へらす","値下がりをゼロにする":"ねだんが へるのを ぜろにする",
    "短期の変動と長期の成長は別だから":"みじかい うごきと ながい せいちょうは べつだから","毎日同じ値段だから":"まいにち おなじ ねだんだから","投資は絶対に下がらないから":"とうしは ぜったいに へらないから",
    "手数料などの費用":"てすうりょうなどの おかね","おつり":"おつり","消費した時間だけのお金":"つかった じかんだけの おかね"
  });
  function kidChoice(x){return KID[x]||x;}

  function answer(i){
    if(!current)return;
    const l=learning();
    if(!l)return;

    const ok=i===current.correctChoiceIndex;
    answeredInRound++;
    if(ok){
      roundCorrect++;
      l.quizCorrect++;
      l.streak++;
      l.bestStreak=Math.max(l.bestStreak,l.streak);
    }else{
      l.streak=0;
    }
    l.quizAnswered++;
    l.lastQuizDate=km().getToday();
    l.history.push({
      date:l.lastQuizDate,
      questionId:current.id,
      title:current.title,
      correct:ok,
      round:Math.ceil((roundIndex+1)/10)
    });
    l.history=l.history.slice(-100);
    if(!l.seenQuizIds.includes(current.id))l.seenQuizIds.push(current.id);
    if(l.seenQuizIds.length>Q.length)l.seenQuizIds=l.seenQuizIds.slice(-Q.length);
    km().saveState();

    const r=document.getElementById('quizResult');
    if(r){
      r.innerHTML=`<div class="quiz-result ${ok?'correct':'wrong'}">
        <strong>${ok?(kid()?'⭕ せいかい！':'⭕ 正解です！'):(kid()?'❌ ちがうよ':'❌ 不正解です')}</strong>
        <p>${esc(kid()?current.ke:current.e)}</p>
        <p class="quiz-live-score">${kid()?`いま ${roundCorrect} / ${answeredInRound}もん`:`現在 ${roundCorrect} / ${answeredInRound}問`}</p>
        <button class="primary" id="nextQuiz2" type="button">${answeredInRound>=roundIds.length?(kid()?'けっかを みる':'結果を見る'):(kid()?'つぎへ':'次の問題')}</button>
      </div>`;
    }
    document.querySelectorAll('.quiz-choice').forEach(b=>b.disabled=true);
  }

  function nextQuestion(){
    if(answeredInRound>=roundIds.length){
      roundFinished=true;
      current=null;
    }else{
      roundIndex++;
      current=null;
    }
    render();
  }

  document.addEventListener('click',e=>{
    const lv=e.target.closest('[data-quiz-level]');
    if(lv){ selectedLevel=Number(lv.dataset.quizLevel)||1; localStorage.setItem('kidsMoneyQuizLevelV32',String(selectedLevel)); startRound(); render(); return; }
    const a=e.target.closest('[data-answer]');
    if(a){answer(Number(a.dataset.answer));return;}
    if(e.target.closest('#nextQuiz2')){
      nextQuestion();
      return;
    }
    if(e.target.closest('#nextQuiz')){
      // "別の問題" skips the current question without scoring it.
      // It is replaced inside the same round and cannot repeat.
      if(current){
        const idx=roundIds.indexOf(current.id);
        const unused=roundIds.slice(idx+1);
        if(unused.length){
          roundIndex++;
          current=null;
          render();
        }
      }
      return;
    }
    if(e.target.closest('#startQuizRound')){
      startRound();
      render();
    }
  });

  window.KidsMoneyLearn={
    render,
    next:()=>{startRound();render();},
    getQuestions:()=>Q,
    startRound:()=>{startRound();render();}
  };

  window.refreshLearnForModeChange=()=>{
    current=null;
    render();
  };

  window.addEventListener('kidsMoneyChildChanged',()=>{
    current=null;
    startRound();
    render();
  });

  window.addEventListener('kidsMoneyKidModeChanged',()=>{
    current=null;
    render();
  });
})();
