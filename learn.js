/* Kids Money Lab V33.0 - Quiz / 300 questions (100 x 3 levels) */
"use strict";
(function () {
  const QUESTIONS = [];
  const add = (level, category, title, q, k, choices, kidChoices, answer, explanation, kidExplanation) => {
    QUESTIONS.push({
      id: `v33-${level}-${QUESTIONS.length + 1}`,
      level, cat: category, title, q, k,
      c: choices, ck: kidChoices, a: answer,
      e: explanation, ke: kidExplanation
    });
  };

  // Level 1: 基礎。10カテゴリ × 10問 = 100問
  const basic = [
    {
      cat:"ためる", title:"ためる", make:(i)=>({
        q:`${(i+1)*100}円をもらったとき、あとでつかうために のこすことは？`,
        k:`${(i+1)*100}えんを もらったとき、あとで つかうために のこすことは？`,
        c:["貯金","全部使う","捨てる"], ck:["ためる","ぜんぶ つかう","すてる"], a:0,
        e:"すぐにつかわず、あとでつかえるようにのこすことを貯金といいます。",
        ke:"すぐに つかわず、あとで つかえるように のこすことを ためると いうよ。"
      })
    },
    {
      cat:"つかう", title:"つかいかた", make:(i)=>({
        q:`${i+1}つだけ買うなら、まず何を考えるとよい？`,
        k:`ひとつだけ かうなら、まず なにを かんがえると いい？`,
        c:["本当に必要か","一番高いものか","箱が大きいか"], ck:["ほんとうに ひつようか","いちばん たかいか","はこが おおきいか"], a:0,
        e:"必要かどうかを考えてから買うと、お金を大切に使えます。",
        ke:"ひつようか どうかを かんがえてから かうと、おかねを たいせつに つかえるよ。"
      })
    },
    {
      cat:"よさん", title:"よさん", make:(i)=>{
        const budget=500+(i*100), use=200+(i*20);
        return {q:`${budget}円のよさんで、${use}円つかった。のこりはいくら？`,k:`${budget}えんの よさんで、${use}えん つかった。のこりは？`,
          c:[`${budget-use}円`,`${budget+use}円`,`${use}円`],ck:[`${budget-use}えん`,`${budget+use}えん`,`${use}えん`],a:0,
          e:`${budget}−${use}なので、残りは${budget-use}円です。`,ke:`${budget}−${use}なので、のこりは ${budget-use}えんだよ。`};
      }
    },
    {
      cat:"おかね", title:"しゅうにゅう", make:(i)=>{
        const allowance=300+i*50;
        return {q:`${allowance}円のおこづかいをもらった。これは？`,k:`${allowance}えんの おこづかいを もらった。これは？`,
          c:["収入","支出","値段"],ck:["はいってきた おかね","でていった おかね","ねだん"],a:0,
          e:"入ってくるお金は収入です。",ke:"はいってくる おかねは しゅうにゅうだよ。"};
      }
    },
    {
      cat:"おかね", title:"ししゅつ", make:(i)=>{
        const price=100+i*50;
        return {q:`${price}円のおかしを買った。これは？`,k:`${price}えんの おかしを かった。これは？`,
          c:["支出","収入","貯金"],ck:["つかった おかね","もらった おかね","ためた おかね"],a:0,
          e:"支払って出ていくお金は支出です。",ke:"はらって でていく おかねは ししゅつだよ。"};
      }
    },
    {
      cat:"くらべる", title:"ねだん", make:(i)=>{
        const a=300+i*10,b=350+i*10;
        return {q:`${a}円と${b}円なら、同じものを買うとき安いのは？`,k:`${a}えんと ${b}えんなら、やすいのは？`,
          c:[`${a}円`,`同じ`,`${b}円`],ck:[`${a}えん`,`おなじ`,`${b}えん`],a:0,
          e:"同じ商品なら、価格が低い方が安いです。",ke:"おなじ ものなら、ねだんが ひくい ほうが やすいよ。"};
      }
    },
    {
      cat:"とうし", title:"リスク", make:(i)=>({
        q:`投資をすると、お金はどうなることがある？`,k:`とうしを すると、おかねは どうなることが ある？`,
        c:["増えることも減ることもある","必ず増える","絶対に変わらない"],ck:["ふえることも へることも ある","かならず ふえる","ぜったい かわらない"],a:0,
        e:"投資の価格は動くため、利益も損失もありえます。",ke:"とうしの ねだんは うごくので、ふえることも へることも あるよ。"
      })},
    {
      cat:"ぎんこう", title:"あんぜん", make:(i)=>({
        q:"暗証番号はどうする？",k:"あんしょうばんごうは どうする？",
        c:["人に教えない","友だちに教える","紙に大きく書いて見せる"],ck:["ひとに おしえない","ともだちに おしえる","みんなに みせる"],a:0,
        e:"暗証番号は大切な情報なので、人に教えません。",ke:"あんしょうばんごうは たいせつだから、ひとに おしえないよ。"
      })},
    {
      cat:"しゃかい", title:"ねだん", make:(i)=>({
        q:"同じ商品でも値段が変わることがあるのはなぜ？",k:"おなじ ものでも ねだんが かわることが あるのは なぜ？",
        c:["作る費用や人気などが変わるから","いつも同じだから","値札が関係ないから"],ck:["つくる おかねや にんきが かわるから","いつも おなじだから","ねふだは かんけいないから"],a:0,
        e:"材料費、需要、供給などが変わると価格も変わることがあります。",ke:"つくる おかねや、ほしい ひとの りょうなどが かわると ねだんも かわるよ。"
      })},
    {
      cat:"あんぜん", title:"あやしいおねがい", make:(i)=>({
        q:"知らない人からお金やカードの情報を求められたら？",k:"しらない ひとから おかねや カードの じょうほうを もとめられたら？",
        c:["大人に相談する","すぐ教える","一人で決める"],ck:["おとなに そうだんする","すぐ おしえる","ひとりで きめる"],a:0,
        e:"お金や個人情報に関する不審な依頼は、信頼できる大人に相談します。",ke:"おかねや じょうほうの あやしい おねがいは、おとなに そうだんしよう。"
      })}
  ];
  for (const family of basic) for (let i=0;i<10;i++) { const x=family.make(i); add(1,family.cat,family.title,x.q,x.k,x.c,x.ck,x.a,x.e,x.ke); }

  // Level 2: 標準。10カテゴリ × 10問 = 100問
  const standard = [
    {cat:"計算",title:"おつり",make:i=>{const p=500+i*100, q=120+i*10;return {
      q:`${p}円で${q}円のものを買った。おつりはいくら？`,k:`${p}えんで ${q}えんのものを かった。おつりは？`,
      c:[`${p-q}円`,`${p+q}円`,`${q}円`],ck:[`${p-q}えん`,`${p+q}えん`,`${q}えん`],a:0,
      e:`${p}−${q}=${p-q}円です。`,ke:`${p}−${q}=${p-q}えんだよ。`};}},
    {cat:"ためる",title:"目標",make:i=>{const goal=1000+i*200, saved=200+i*20;return {
      q:`${goal}円の目標までに${saved}円たまっている。あといくら？`,k:`${goal}えんの めあてまで ${saved}えん たまった。あと いくら？`,
      c:[`${goal-saved}円`,`${goal+saved}円`,`${saved}円`],ck:[`${goal-saved}えん`,`${goal+saved}えん`,`${saved}えん`],a:0,
      e:`目標額から今ある金額を引いて${goal-saved}円です。`,ke:`めあてから たまった おかねを ひくと ${goal-saved}えんだよ。`};}},
    {cat:"予算",title:"配分",make:i=>{const total=2000+i*100;return {
      q:`${total}円を「ためる」と「つかう」に半分ずつ分けるなら、ためるのはいくら？`,k:`${total}えんを「ためる」と「つかう」に はんぶんずつ わける。ためるのは？`,
      c:[`${total/2}円`,`${total}円`,`0円`],ck:[`${total/2}えん`,`${total}えん`,`0えん`],a:0,
      e:`${total}÷2=${total/2}円です。`,ke:`${total}÷2=${total/2}えんだよ。`};}},
    {cat:"投資",title:"分散",make:i=>({
      q:"投資先をいくつかに分ける考え方は？",k:"とうしさきを いくつかに わける かんがえかたは？",
      c:["分散投資","一つだけに集中","全部現金化"],ck:["ぶんさん とうし","ひとつだけに あつめる","ぜんぶ おかねにする"],a:0,
      e:"複数の資産に分けることで、一つの値下がりの影響を抑える考え方です。",ke:"いくつかに わけると、ひとつの ねだんが さがったときの えいきょうを へらせるよ。"
    })},
    {cat:"投資",title:"インデックス",make:i=>({
      q:"インデックス投資の説明として近いものは？",k:"インデックス とうしの せつめいに ちかいものは？",
      c:["市場全体などの動きを目標にする","必ず利益が出る","価格が動かない"],ck:["たくさんの かぶの うごきに あわせる","かならず もうかる","ねだんが うごかない"],a:0,
      e:"特定の指数の動きに連動することを目指す商品があります。",ke:"ある しすうの うごきに あわせる とうしが あるよ。"
    })},
    {cat:"おかね",title:"利息",make:i=>{const principal=1000+i*100,rate=0.01;const interest=principal*rate;return {
      q:`${principal}円に年1%の利息がつくと、1年分はいくら？`,k:`${principal}えんに ねん1%の りそくが つくと、1ねんぶんは？`,
      c:[`${interest}円`,`${principal}円`,`${principal+100}円`],ck:[`${interest}えん`,`${principal}えん`,`${principal+100}えん`],a:0,
      e:`${principal}×1%= ${interest}円です。`,ke:`${principal}×1% = ${interest}えんだよ。`};}},
    {cat:"社会",title:"インフレ",make:i=>({
      q:"物の値段が全体として上がり、お金で買える量が減ることを何という？",k:"ものの ねだんが あがって、おかねで かえる りょうが へることは？",
      c:["インフレーション","デフレーション","おつり"],ck:["インフレ","デフレ","おつり"],a:0,
      e:"物価が上がると、同じ金額で買える量が減ることがあります。",ke:"ものが たかくなると、おなじ おかねで かえる ものが へることが あるよ。"
    })},
    {cat:"買い物",title:"必要と欲しい",make:i=>({
      q:"予算が足りないとき、最初に見直しやすいのは？",k:"おかねが たりないとき、さいしょに みなおしやすいのは？",
      c:["欲しいものの優先順位","必要な薬や食事","安全に必要な費用"],ck:["ほしいものの じゅんばん","ひつような くすりや ごはん","あんぜんに ひつような おかね"],a:0,
      e:"必要性を保ちながら、欲しいものの優先順位を考える方法があります。",ke:"ひつような ものを まもりながら、ほしいものの じゅんばんを かんがえよう。"
    })},
    {cat:"安全",title:"詐欺",make:i=>({
      q:"「今日中に払わないと困る」と急がせる知らない連絡が来たら？",k:"「きょう はらわないと こまる」と いそがせる しらない れんらくが きたら？",
      c:["大人や公式窓口に確認する","すぐ送金する","暗証番号を伝える"],ck:["おとなや ほんものの まどぐちに かくにんする","すぐ おかねを おくる","あんしょうばんごうを おしえる"],a:0,
      e:"急がせる連絡は詐欺の可能性もあるため、公式の連絡先などで確認します。",ke:"いそがせる れんらくは あやしいことも あるよ。ほんものの まどぐちに かくにんしよう。"
    })},
    {cat:"働く",title:"収入と支出",make:i=>{const inc=3000+i*100, out=1800+i*50;return {
      q:`${inc}円の収入があり、${out}円使った。残りはいくら？`,k:`${inc}えん もらって、${out}えん つかった。のこりは？`,
      c:[`${inc-out}円`,`${inc+out}円`,`${out}円`],ck:[`${inc-out}えん`,`${inc+out}えん`,`${out}えん`],a:0,
      e:`${inc}−${out}=${inc-out}円です。`,ke:`${inc}−${out}=${inc-out}えんだよ。`};}}
  ];
  for (const family of standard) for (let i=0;i<10;i++) { const x=family.make(i); add(2,family.cat,family.title,x.q,x.k,x.c,x.ck,x.a,x.e,x.ke); }

  // Level 3: 発展。10カテゴリ × 10問 = 100問
  const advanced = [
    {cat:"複利",title:"複利",make:i=>{const p=1000+i*100;const one=p*1.1, two=p*1.1*1.1;return {
      q:`${p}円を年10%で運用し、増えた分もそのまま運用すると、2年後はいくら？（税金などは考えない）`,
      k:`${p}えんを ねん10%で ふやして、ふえた ぶんも つかうと、2ねんごは いくら？`,
      c:[`${two.toFixed(0)}円`,`${(p+2*p*.1).toFixed(0)}円`,`${p}円`],ck:[`${two.toFixed(0)}えん`,`${(p+2*p*.1).toFixed(0)}えん`,`${p}えん`],a:0,
      e:`1年目は${one.toFixed(0)}円、2年目はその金額に10%をかけるので${two.toFixed(0)}円です。`,ke:`1ねんめの おかねに もういちど 10%が つくので ${two.toFixed(0)}えんだよ。`};}},
    {cat:"投資",title:"下落と回復",make:i=>{const p=10000+i*1000;return {
      q:`${p}円が20%下がった。元の${p}円に戻るには、下がった後の金額から何%上がる必要がある？`,
      k:`${p}えんが 20% さがった。もとの ${p}えんに もどすには、あと 何% ふえる？`,
      c:["25%","20%","40%"],ck:["25%","20%","40%"],a:0,
      e:`${p}円→${p*.8}円。${p*.2}/${p*.8}=25%なので25%上昇が必要です。`,ke:`20%さがると ${p*.8}えん。もどすには 25% ふやす ひつようが あるよ。`};}},
    {cat:"分散",title:"リスク",make:i=>({
      q:"3つの資産のうち1つが大きく下がったとき、分散している場合の考え方として近いものは？",k:"3つの しさんの うち 1つが おおきく さがったとき、わけて もっていると？",
      c:["他の資産の影響で全体の変化が小さくなることがある","必ず損失がゼロになる","必ず利益になる"],ck:["ほかの しさんの おかげで ぜんたいの へんかが ちいさくなる ことが ある","かならず そんが なくなる","かならず もうかる"],a:0,
      e:"分散は損失をなくすものではなく、一つの資産への依存を小さくする考え方です。",ke:"ぶんさんは そんを なくす ものではなく、ひとつだけに たよらない ための かんがえだよ。"
    })},
    {cat:"インフレ",title:"実質的な価値",make:i=>{const price=1000+i*100;return {
      q:`物価が10%上がったとき、${price}円で買える量は、以前よりどうなる？`,
      k:`ものの ねだんが 10% あがったら、${price}えんで かえる りょうは どうなる？`,
      c:["少なくなる","多くなる","必ず同じ"],ck:["すくなくなる","おおくなる","かならず おなじ"],a:0,
      e:"同じ金額で買える量は減る方向になります。",ke:"おなじ おかねでも、たかくなると かえる りょうは へるよ。"};}},
    {cat:"機会費用",title:"選ぶ",make:i=>({
      q:"1000円で本を買ったため、お菓子を買えなかった。このとき、お菓子を買えなかったことは何を考える材料になる？",k:"1000えんで ほんを かったので、おかしを かえなかった。かえなかった ほうは？",
      c:["機会費用を考える材料","収入そのもの","利息"],ck:["ほかの えらべた ものを かんがえる ざいりょう","もらった おかね そのもの","りそく"],a:0,
      e:"一つを選んだことであきらめた別の選択肢を考えるのが機会費用の考え方です。",ke:"ひとつを えらんだことで、あきらめた ほかの えらびかたを かんがえるよ。"
    })},
    {cat:"ローン",title:"借りる",make:i=>({
      q:"お金を借りるとき、元本以外に確認したいものは？",k:"おかねを かりるとき、もともとの おかね いがいに かくにんするものは？",
      c:["金利や手数料などの費用","好きな色","天気だけ"],ck:["きんりや てすうりょうなどの おかね","すきな いろ","てんきだけ"],a:0,
      e:"借入では、利息や手数料を含む総返済額を確認することが大切です。",ke:"かりるときは、りそくや てすうりょうを ふくめて、さいごに いくら はらうか みよう。"
    })},
    {cat:"契約",title:"契約",make:i=>({
      q:"サービスを申し込む前に確認したいものは？",k:"サービスを もうしこむ まえに かくにんしたいものは？",
      c:["料金・期間・解約条件","広告の色だけ","名前の長さだけ"],ck:["ねだん・きかん・やめる ときの ルール","こうこくの いろだけ","なまえの ながさだけ"],a:0,
      e:"契約では、料金、期間、解約条件などを確認します。",ke:"もうしこむ まえに、ねだんや きかん、やめる ときの ルールを みよう。"
    })},
    {cat:"安全",title:"個人情報",make:i=>({
      q:"お金に関する個人情報を知らない相手に送る前にすることは？",k:"おかねに かかわる じょうほうを しらない ひとに おくる まえに することは？",
      c:["相手と目的を確認し、大人にも相談する","すぐ送る","SNSに公開する"],ck:["あいてと りゆうを かくにんして、おとなにも そうだんする","すぐ おくる","SNSに だす"],a:0,
      e:"必要性と相手を確認し、不安があれば信頼できる大人に相談します。",ke:"だれに、なんのために おくるか かくにんして、ふあんなら おとなに そうだんしよう。"
    })},
    {cat:"税金",title:"社会",make:i=>({
      q:"税金の役割として近いものは？",k:"ぜいきんの やくわりに ちかいものは？",
      c:["道路や教育など社会のサービスを支える","個人の貯金を必ず増やす","すべての商品を無料にする"],ck:["みちや がっこうなどを ささえる","ひとの ちょきんを かならず ふやす","ぜんぶの ものを ただにする"],a:0,
      e:"税金は社会全体で使う公共サービスなどを支える財源になります。",ke:"ぜいきんは、みんなで つかう ものや サービスを ささえる おかねだよ。"
    })},
    {cat:"家計",title:"優先順位",make:i=>{const income=10000,need=6000,want=3500;return {
      q:`月の収入が${income}円、必要な支出が${need}円、欲しいものが${want}円。全部買える？`,
      k:`つきの しゅうにゅうが ${income}えん、ひつような おかねが ${need}えん、ほしいものが ${want}えん。ぜんぶ かえる？`,
      c:["買えない。残りは${income-need}円なので優先順位が必要","買える。${income+need+want}円ある","必ず買える"],ck:[`かえない。のこりは ${income-need}えんだから じゅんばんが ひつよう`,`かえる。おかねは たくさん ある`,`かならず かえる`],a:0,
      e:`必要な支出の後に残るのは${income-need}円なので、欲しいものは全部買えません。`,ke:`ひつような おかねを はらうと のこりは ${income-need}えん。ほしいものの じゅんばんを かんがえよう。`};}}
  ];
  for (const family of advanced) for (let i=0;i<10;i++) { const x=family.make(i); add(3,family.cat,family.title,x.q,x.k,x.c,x.ck,x.a,x.e,x.ke); }

  // Safety checks: the product contract is exactly 100 questions per level.
  const counts = [1,2,3].map(l => QUESTIONS.filter(q => q.level === l).length);
  if (counts.some(n => n !== 100)) throw new Error("Quiz dataset must contain exactly 100 questions per level.");

  let selectedLevel = Number(localStorage.getItem("kidsMoneyQuizLevelV33") || localStorage.getItem("kidsMoneyQuizLevelV32") || 1);
  if (![1,2,3].includes(selectedLevel)) selectedLevel = 1;
  let roundIds=[], roundIndex=0, roundCorrect=0, answeredInRound=0, roundFinished=false, current=null;

  const km=()=>window.KidsMoney;
  const isKid=()=>km()?.isKidMode?.()===true;
  const child=()=>km()?.getCurrentChild?.();
  const esc=v=>km()?.escapeHtml?.(v)||String(v??"");
  const levels={1:"基礎",2:"標準",3:"発展"};
  const levelKid={1:"かんたん",2:"ふつう",3:"むずかしい"};

  function learning(){
    const c=child(); if(!c) return null;
    c.learning=(c.learning&&typeof c.learning==="object")?c.learning:{};
    c.learning.history=Array.isArray(c.learning.history)?c.learning.history:[];
    c.learning.seenQuizIds=Array.isArray(c.learning.seenQuizIds)?c.learning.seenQuizIds:[];
    c.learning.quizAnswered=Number(c.learning.quizAnswered)||0;
    c.learning.quizCorrect=Number(c.learning.quizCorrect)||0;
    c.learning.streak=Number(c.learning.streak)||0;
    c.learning.bestStreak=Number(c.learning.bestStreak)||0;
    return c.learning;
  }
  function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function pool(){return QUESTIONS.filter(q=>q.level===selectedLevel);}
  function startRound(){
    roundIds=shuffle(pool()).slice(0,10).map(q=>q.id);
    roundIndex=0;roundCorrect=0;answeredInRound=0;roundFinished=false;current=null;
  }
  function makeQuestion(){
    const src=QUESTIONS.find(q=>q.id===roundIds[roundIndex]); if(!src)return null;
    const raw=isKid()?src.ck:src.c;
    const choices=shuffle(raw.map((text,index)=>({text,index})));
    return {...src,choices,correctChoiceIndex:choices.findIndex(x=>x.index===src.a)};
  }
  function levelPicker(){
    const k=isKid();
    return `<div class="quiz-level-picker card"><div><strong>${k?"クイズの むずかしさ":"クイズレベル"}</strong><p class="muted">${k?"それぞれ 100もん。レベルを えらべるよ":"各レベル100問。レベルごとに10問ずつ挑戦できます。"}</p></div><div class="level-buttons">${[1,2,3].map(l=>`<button type="button" class="level-button ${selectedLevel===l?"active":""}" data-quiz-level="${l}">${k?`🌱 ${levelKid[l]}`:`Lv.${l} ${levels[l]}`}</button>`).join("")}</div></div>`;
  }
  function progressHtml(){
    const k=isKid(),n=roundIndex+1;
    return `<div class="quiz-progress"><div class="quiz-progress-top"><strong>${k?"10もん チャレンジ":"10問チャレンジ"}</strong><span>${n} / 10</span></div><div class="quiz-progress-bar"><span style="width:${n*10}%"></span></div></div>`;
  }
  function render(){
    const box=document.getElementById("learn"); if(!box)return;
    const l=learning(); if(!l)return;
    if(!roundIds.length&&!roundFinished)startRound();
    if(roundFinished){renderRoundResult(box,l);return;}
    if(!current)current=makeQuestion(); if(!current)return;
    const k=isKid();
    const choices=current.choices.map((x,i)=>`<button class="quiz-choice" type="button" data-answer="${i}">${esc(x.text)}</button>`).join("");
    box.innerHTML=`${levelPicker()}<div class="section-header"><div><h2>${k?"おかね クイズ":"お金クイズ"}</h2><p class="muted">${esc(current.title)}</p></div><button class="secondary" id="nextQuiz" type="button">${k?"🔄 ちがう もんだい":"🔄 別の問題"}</button></div>${progressHtml()}<div class="quiz-card"><div class="quiz-number">🎯 ${roundIndex+1}</div><h3>${esc(k?current.k:current.q)}</h3><div class="quiz-choices">${choices}</div><div id="quizResult"></div></div>`;
  }
  function historyHtml(l){
    const k=isKid();
    return `<section class="card quiz-history"><div class="section-header"><h3>${k?"📖 こたえた きろく":"📖 クイズ履歴"}</h3><span>${l.quizAnswered}${k?"もん":"問"}</span></div>${l.history.length?l.history.slice().reverse().slice(0,20).map(h=>`<div class="study-history"><span>${esc(h.date||"")}</span><span>${esc(h.title||"クイズ")}</span><strong>${h.correct?"⭕":"❌"}</strong></div>`).join(""):`<p class="muted">${k?"まだ きろくが ないよ。":"まだクイズ履歴がありません。"}</p>`}</section>`;
  }
  function renderRoundResult(box,l){
    const k=isKid(),score=roundCorrect;
    const msg=score===10?(k?"ぜんもん せいかい！":"全問正解です！"):score>=7?(k?"よく できたね！":"よくできました！"):score>=5?(k?"あと もうすこし！":"あともう少し！"):(k?"もういちど やってみよう！":"もう一度挑戦してみましょう！");
    box.innerHTML=`${levelPicker()}<div class="section-header"><div><h2>${k?"クイズの けっか":"クイズ結果"}</h2><p class="muted">${k?"10もん おつかれさま！":"10問おつかれさまでした！"}</p></div></div><div class="quiz-card quiz-round-result"><div class="quiz-score-label">${k?"10もんの せいせき":"10問の成績"}</div><div class="quiz-score">${score}<span> / 10</span></div><h3>${msg}</h3><p class="muted">${k?`これまで ${l.quizCorrect}もん せいかいしたよ。`:`これまでの正解数：${l.quizCorrect}問`}</p><button class="primary wide" id="startQuizRound" type="button">${k?"🔄 つぎの 10もん":"🔄 次の10問"}</button></div>${historyHtml(l)}`;
  }
  function answer(i){
    if(!current)return; const l=learning();if(!l)return;
    const ok=i===current.correctChoiceIndex;
    answeredInRound++;
    if(ok){roundCorrect++;l.quizCorrect++;l.streak++;l.bestStreak=Math.max(l.bestStreak,l.streak);}else l.streak=0;
    l.quizAnswered++;l.lastQuizDate=km().getToday();
    l.history.push({date:l.lastQuizDate,questionId:current.id,title:current.title,correct:ok,level:current.level,category:current.cat});
    l.history=l.history.slice(-200);
    if(!l.seenQuizIds.includes(current.id))l.seenQuizIds.push(current.id);
    km().saveState();
    const r=document.getElementById("quizResult");
    if(r)r.innerHTML=`<div class="quiz-result ${ok?"correct":"wrong"}"><strong>${ok?(isKid()?"⭕ せいかい！":"⭕ 正解です！"):(isKid()?"❌ ちがうよ":"❌ 不正解です")}</strong><p>${esc(isKid()?current.ke:current.e)}</p><p class="quiz-live-score">${isKid()?`いま ${roundCorrect} / ${answeredInRound}もん`:`現在 ${roundCorrect} / ${answeredInRound}問`}</p><button class="primary" id="nextQuiz2" type="button">${answeredInRound>=10?(isKid()?"けっかを みる":"結果を見る"):(isKid()?"つぎへ":"次の問題")}</button></div>`;
    document.querySelectorAll(".quiz-choice").forEach(b=>b.disabled=true);
  }
  function nextQuestion(){if(answeredInRound>=10){roundFinished=true;current=null;}else{roundIndex++;current=null;}render();}
  document.addEventListener("click",e=>{
    const lv=e.target.closest("[data-quiz-level]");if(lv){selectedLevel=Number(lv.dataset.quizLevel)||1;localStorage.setItem("kidsMoneyQuizLevelV33",String(selectedLevel));startRound();render();return;}
    const a=e.target.closest("[data-answer]");if(a){answer(Number(a.dataset.answer));return;}
    if(e.target.closest("#nextQuiz2")){nextQuestion();return;}
    if(e.target.closest("#nextQuiz")){startRound();render();return;}
    if(e.target.closest("#startQuizRound")){startRound();render();}
  });
  window.KidsMoneyLearn={render,next:()=>{startRound();render();},getQuestions:()=>QUESTIONS,startRound:()=>{startRound();render();}};
  window.refreshLearnForModeChange=()=>{current=null;render();};
  window.addEventListener("kidsMoneyChildChanged",()=>{current=null;startRound();render();});
  window.addEventListener("kidsMoneyKidModeChanged",()=>{current=null;render();});
})();
