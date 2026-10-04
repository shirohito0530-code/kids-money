"use strict";

/* Kids Money Lab V32.3 - single application contract
 * app.js owns state, child switching, money records, goals and global UI events.
 * education.js owns learning data normalization and rendering of the study dashboard.
 * learn.js owns quiz/lesson UI and writes learning results through the app API.
 */
const APP_VERSION = 32;
const STORAGE_KEY = "kidsMoneyLabV32";
const LEGACY_KEYS = ["kidsMoneyLabV31", "kidsMoneyLabV30", "kidsMoneyLabV29", "kidsMoneyLabV28", "kidsMoneyLabV27", "kidsMoneyLabV26", "kidsMoneyLabV25", "kidsMoneyLabV24", "kidsMoneyLabV23", "kidsMoneyLabV22"];
const SELECTED_CHILD_KEY = "kidsMoneySelectedChildV32";
const LEGACY_SELECTED_KEYS = ["kidsMoneySelectedChildV31", "kidsMoneySelectedChildV30", "kidsMoneySelectedChildV29", "kidsMoneySelectedChildV28", "kidsMoneySelectedChildV27", "kidsMoneySelectedChildV26", "kidsMoneySelectedChildV25", "kidsMoneySelectedChildV24", "kidsMoneySelectedChildV23", "kidsMoneySelectedChildV22"];
const KID_MODE_KEY = "kidsMoneyKidMode";
const MARKET_DATA_URL = "./data/market.json";
let marketState = { markets: { world: null, sp: null }, source: "none" };

const ASSETS = {
  cash: { name: "貯金", kidName: "ためる", icon: "🏦", fixedRate: 0.002, risk: "小", type: "cash" },
  world: { name: "全世界株式", kidName: "せかいの かぶ", icon: "🌎", fixedRate: 0.055, risk: "大", type: "index" },
  sp: { name: "S&P500", kidName: "アメリカの かぶ", icon: "🇺🇸", fixedRate: 0.06, risk: "大", type: "index" }
};

let state = null;
let selectedChildId = null;
let kidMode = localStorage.getItem(KID_MODE_KEY) === "1";
let editingChildId = null;
let editingTransactionId = null;

function $(id) { return document.getElementById(id); }
function createId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}
function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function yen(value) { return "¥" + Math.round(Number(value) || 0).toLocaleString("ja-JP"); }
function signedYen(value) { const n = Number(value) || 0; return (n >= 0 ? "+" : "-") + yen(Math.abs(n)); }
function percent(value) { const n = Number(value) || 0; return (n >= 0 ? "+" : "") + n.toFixed(2) + "%"; }
function escapeHtml(value) { return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
function showError(message) {
  const box = $("errorBox");
  if (box) { box.textContent = message; box.classList.remove("hidden"); setTimeout(() => box.classList.add("hidden"), 6000); }
  console.error(message);
}

function createDefaultState() {
  return { version: APP_VERSION, children: [{ id: createId(), name: "こどもA", birthYear: 2019, transactions: [], goals: [], learning: {} }] };
}
function normalizeLearning(learning) {
  if (!learning || typeof learning !== "object") return {};
  return {
    quizAnswered: Number(learning.quizAnswered || 0),
    quizCorrect: Number(learning.quizCorrect || 0),
    streak: Number(learning.streak || 0),
    bestStreak: Number(learning.bestStreak || 0),
    lastQuizDate: learning.lastQuizDate || null,
    history: Array.isArray(learning.history) ? learning.history.slice(-100) : [],
    lessons: Array.isArray(learning.lessons) ? learning.lessons : [],
    seenQuizIds: Array.isArray(learning.seenQuizIds) ? learning.seenQuizIds : []
  };
}
function normalizeChild(child) {
  const c = child && typeof child === "object" ? { ...child } : {};
  c.id = c.id || createId();
  c.name = String(c.name || "こども");
  c.birthYear = Number(c.birthYear) || 2019;
  c.transactions = Array.isArray(c.transactions) ? c.transactions.map(tx => ({
    id: tx.id || createId(), type: tx.type === "out" ? "out" : "in", date: tx.date || today(),
    amount: Number(tx.amount) || 0, reason: String(tx.reason || ""), asset: ASSETS[tx.asset] ? tx.asset : "cash",
    memo: String(tx.memo || ""), indexAtTransaction: Number(tx.indexAtTransaction) || null, createdAt: tx.createdAt || new Date().toISOString()
  })) : [];
  c.goals = Array.isArray(c.goals) ? c.goals.map(g => ({ id: g.id || createId(), name: String(g.name || "目標"), amount: Number(g.amount)||0, date: g.date || today(), saved: Number(g.saved)||0 })) : [];
  c.learning = normalizeLearning(c.learning);
  return c;
}
function parseState(raw) {
  try {
    const p = JSON.parse(raw);
    if (!p || !Array.isArray(p.children)) return null;
    return { version: APP_VERSION, children: p.children.map(normalizeChild) };
  } catch { return null; }
}
function loadState() {
  const keys = [STORAGE_KEY, ...LEGACY_KEYS];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = parseState(raw);
      if (parsed && parsed.children.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    } catch (e) { console.warn("state migration", key, e); }
  }
  return createDefaultState();
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { showError(kidMode ? "データを ほぞんできないよ。" : "データを保存できませんでした。"); }
}
function getCurrentChild() {
  if (!state?.children?.length) return null;
  let child = state.children.find(c => c.id === selectedChildId);
  if (!child) { child = state.children[0]; selectedChildId = child.id; saveSelectedChildId(); }
  return child;
}
function getChildById(id) { return state?.children?.find(c => c.id === id) || null; }
function loadSelectedChildId() {
  for (const key of [SELECTED_CHILD_KEY, ...LEGACY_SELECTED_KEYS]) {
    const v = localStorage.getItem(key);
    if (v && getChildById(v)) return v;
  }
  return state?.children?.[0]?.id || null;
}
function saveSelectedChildId() { if (selectedChildId) localStorage.setItem(SELECTED_CHILD_KEY, selectedChildId); }
function selectChild(id, render = true) {
  const child = getChildById(id); if (!child) return;
  if (selectedChildId === id && render) { renderAll(); return; }
  selectedChildId = id; saveSelectedChildId();
  window.dispatchEvent(new CustomEvent("kidsMoneyChildChanged", { detail: { childId: id, child } }));
  if (render) renderAll();
}

window.KidsMoney = {
  APP_VERSION,
  getState: () => state,
  getCurrentChild,
  getCurrentChildId: () => selectedChildId,
  getChildren: () => state?.children || [],
  isKidMode: () => kidMode,
  selectChild,
  saveState,
  createId,
  yen,
  escapeHtml,
  renderAll,
  getToday: today
};
window.getKidsMoneyState = () => state;
window.getCurrentChild = getCurrentChild;
window.getCurrentChildId = () => selectedChildId;
window.getKidsMoneyChildren = () => state?.children || [];
window.setKidsMoneyChild = id => selectChild(id, true);
window.isKidsMoneyKidMode = () => kidMode;
window.getKidsMoneyKidMode = () => kidMode;

function getMarket(assetKey) { return marketState?.markets?.[assetKey] || null; }
function getIndexValue(assetKey, date) {
  const m=getMarket(assetKey); if(!m || !Array.isArray(m.series)) return null;
  let value=null;
  for(const p of m.series){ if(String(p.date)<=String(date)){ const n=Number(p.value); if(n>0)value=n; } else break; }
  return value;
}
function getLatestIndexValue(assetKey) {
  const m=getMarket(assetKey); if(!m || !Array.isArray(m.series) || !m.series.length)return null;
  const n=Number(m.series[m.series.length-1]?.value); return n>0?n:null;
}
function getIndexChangeToday(assetKey) {
  const m=getMarket(assetKey); if(!m || !Array.isArray(m.series) || m.series.length<2)return null;
  const latest=m.series[m.series.length-1]; let prev=null;
  for(let i=m.series.length-1;i>=0;i--){ const p=m.series[i]; if(String(p.date)<String(latest.date)){prev=Number(p.value);break;} }
  if(m.change!=null && String(latest.date)!==today()) return Number(m.change);
  const cur=Number(latest.value); return cur>0&&prev>0?(cur/prev-1)*100:null;
}
function calculateInvestment(child, asset) {
  const txs=(child?.transactions||[]).filter(tx=>tx.asset===asset).sort((a,b)=>String(a.date).localeCompare(String(b.date)) || String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
  let principal=0, units=0;
  for(const tx of txs){
    const amount=Number(tx.amount)||0; if(amount<=0)continue;
    const liveIndex=getIndexValue(asset,tx.date);
    const index=Number(liveIndex)>0?Number(liveIndex):(Number(tx.indexAtTransaction)>0?Number(tx.indexAtTransaction):1);
    if(tx.type==='out'){ units=Math.max(0,units-amount/index); principal=Math.max(0,principal-amount); }
    else { units+=amount/index; principal+=amount; }
  }
  const latest=getLatestIndexValue(asset); const value=latest?units*latest:principal;
  return {principal,value,pnl:value-principal,units,latestIndex:latest};
}

function calculateCash(child) {
  return (child?.transactions || []).reduce((sum, tx) => sum + (tx.asset === "cash" ? (tx.type === "out" ? -Number(tx.amount||0) : Number(tx.amount||0)) : 0), 0);
}
function calculateAsset(child, asset) {
  if(asset==='cash') { const c=calculateCash(child); return {principal:c,value:c,pnl:0,units:0}; }
  return calculateInvestment(child,asset);
}
function calculateChild(child) {
  const cash = Math.max(0, calculateCash(child));
  let totalIn = 0, totalOut = 0;
  for (const tx of child?.transactions || []) { const a=Number(tx.amount)||0; tx.type === "out" ? totalOut += a : totalIn += a; }
  const world = calculateAsset(child, "world"), sp = calculateAsset(child, "sp");
  const investmentValue = world.value + sp.value;
  return { balances: { cash, world: world.value, sp: sp.value }, totalIn, totalOut, investmentValue, total: cash + investmentValue, principal: cash + world.principal + sp.principal, pnl: world.pnl + sp.pnl, worldValue: world.value, spValue: sp.value, worldPrincipal: world.principal, spPrincipal: sp.principal };
}
function assetName(key) { return kidMode ? ASSETS[key].kidName : ASSETS[key].name; }

function renderChildSelector() {
  const select = $("child"); if (!select) return;
  select.innerHTML = "";
  for (const child of state.children) { const o=document.createElement("option"); o.value=child.id; o.textContent=child.name; o.selected=child.id===selectedChildId; select.appendChild(o); }
  select.value=selectedChildId;
  const name = $("selectedChildName"); if (name) name.textContent=getCurrentChild()?.name || "";
  document.querySelectorAll("[data-child-edit],[data-child-delete]").forEach(e=>e.remove());
  const wrap = select.closest(".child-actions") || select.parentElement;
  if (wrap) {
    const edit=document.createElement("button"); edit.type="button"; edit.className="secondary"; edit.dataset.childEdit=selectedChildId; edit.textContent=kidMode?"✏️ なまえ":"✏️ 編集";
    const del=document.createElement("button"); del.type="button"; del.className="secondary"; del.dataset.childDelete=selectedChildId; del.textContent=kidMode?"🗑️ けす":"🗑️ 削除";
    wrap.append(edit,del);
  }
}
function renderSummary() {
  const r=calculateChild(getCurrentChild());
  ["total","cash","invest","ins","outs","pnl"].forEach((id,i)=>{ const el=$(id); if(el) el.textContent=yen([r.total,r.balances.cash,r.investmentValue,r.totalIn,r.totalOut,r.pnl][i]); });
  if($("totalL")) $("totalL").textContent=kidMode?"ぜんぶ":"総資産";
  if($("cashL")) $("cashL").textContent=kidMode?"ためている":"貯金";
  if($("investL")) $("investL").textContent=kidMode?"ふやしている":"投資";
  if($("note")) $("note").textContent=kidMode?"おかねの ぜんぶ":"投資損益 "+signedYen(r.pnl);
}
function renderTodayMoney() {
  const child=getCurrentChild(); const txs=(child?.transactions||[]).filter(tx=>String(tx.date)===today());
  const income=txs.filter(tx=>tx.type!=='out').reduce((s,t)=>s+Number(t.amount||0),0);
  const outcome=txs.filter(tx=>tx.type==='out').reduce((s,t)=>s+Number(t.amount||0),0);
  const worldChange=getIndexChangeToday('world'), spChange=getIndexChangeToday('sp');
  const investmentValue=calculateChild(child).investmentValue;
  const changes=[worldChange,spChange].filter(v=>Number.isFinite(v));
  const indexText=changes.length?changes.reduce((a,b)=>a+b,0)/changes.length:null;
  const indexImpact=indexText!==null?investmentValue*indexText/100:0;
  const box=$("todayMoney"); if(!box)return;
  box.innerHTML=`<div class="today-grid"><div class="today-card"><span>${kidMode?"はいった おかね":"今日の入金"}</span><strong>${yen(income)}</strong></div><div class="today-card"><span>${kidMode?"つかった おかね":"今日の出金"}</span><strong>${yen(outcome)}</strong></div><div class="today-card"><span>${kidMode?"きょうの さ":"今日の差額"}</span><strong>${signedYen(income-outcome)}</strong></div></div>
  <div class="today-index card"><div class="section-header"><strong>${kidMode?"📈 しすうの うごき":"📈 インデックスの今日の動き"}</strong><span class="meta">${indexText!==null?percent(indexText):"-"}</span></div><div class="today-index-grid"><div>🌎 ${kidMode?"せかいの かぶ":"全世界株式"}<strong>${worldChange!==null?percent(worldChange):"-"}</strong></div><div>🇺🇸 ${kidMode?"アメリカの かぶ":"S&P500"}<strong>${spChange!==null?percent(spChange):"-"}</strong></div><div>${kidMode?"とうしの えいきょう":"投資評価額への目安"}<strong>${indexText!==null?signedYen(indexImpact):"-"}</strong></div></div></div>
  <div class="today-list">${txs.length?txs.map(tx=>`<div class="card"><strong>${tx.type==='out'?'−':'＋'}${yen(tx.amount)}</strong>　${escapeHtml(tx.reason||assetName(tx.asset))}</div>`).join(""):`<div class="muted">${kidMode?"きょうの おかねは まだ ないよ。":"今日のお金の記録はありません。"}</div>`}</div>`;
}
function renderAssets() {
  const box=$("assets"); if(!box)return; const r=calculateChild(getCurrentChild()); box.innerHTML="";
  for(const [key,a] of Object.entries(ASSETS)){
    const value=r.balances[key]||0; const principal=key==='cash'?value:(key==='world'?r.worldPrincipal:r.spPrincipal); const pnl=value-principal;
    const d=document.createElement("article"); d.className="asset card";
    let detail=key==='cash'?(kidMode?"いま ためている おかね":"現在残高"):(kidMode?`いれた おかね ${yen(principal)} · ${pnl>=0?'ふえた':'へった'} ${yen(Math.abs(pnl))}`:`元本 ${yen(principal)} · 損益 ${signedYen(pnl)}`);
    if(key!=='cash'){ const idx=getLatestIndexValue(key); if(idx)detail+=` · ${kidMode?'いまの しすう':'現在指数'} ${idx.toLocaleString('ja-JP',{maximumFractionDigits:2})}`; }
    d.innerHTML=`<div class="asset-icon">${a.icon}</div><h3>${escapeHtml(assetName(key))}</h3><div class="value">${yen(value)}</div><div class="meta">${escapeHtml(detail)}</div><div class="meta">${kidMode?(a.risk==='小'?"へりにくい":"へることも あるよ"):"リスク："+a.risk}</div>`; box.appendChild(d);
  }
}
function transactionHtml(txs){ return txs.length?txs.map(tx=>`<div class="card tx-row"><div><strong>${tx.type==='out'?'−':'＋'}${yen(tx.amount)}</strong><div>${escapeHtml(tx.date)} · ${escapeHtml(tx.reason||"")} · ${ASSETS[tx.asset].icon} ${escapeHtml(assetName(tx.asset))}</div>${tx.memo?`<div class="meta">${escapeHtml(tx.memo)}</div>`:""}</div><div class="button-group"><button type="button" class="secondary" data-tx-edit="${tx.id}">${kidMode?"✏️ なおす":"✏️ 編集"}</button><button type="button" class="secondary danger" data-tx-delete="${tx.id}">${kidMode?"🗑️ けす":"🗑️ 削除"}</button></div></div>`).join(""):`<div class="card muted">${kidMode?"まだ きろくが ないよ。":"取引履歴がありません。"}</div>`; }
function renderTransactions() {
  const child=getCurrentChild(); let txs=[...(child?.transactions||[])]; const tf=$("tf")?.value||"all", af=$("af")?.value||"all";
  const filtered=txs.filter(t=>(tf==="all"||t.type===tf)&&(af==="all"||t.asset===af)).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const moneyBox=$("moneyTxs"); if(moneyBox) moneyBox.innerHTML=transactionHtml(filtered);
  const homeBox=$("homeTxs"); if(homeBox) homeBox.innerHTML=transactionHtml(txs.sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,10));
}
function renderGoals(){ const box=$("goalsList");if(!box)return;const child=getCurrentChild();box.innerHTML=(child?.goals||[]).length?(child.goals.map(g=>`<div class="card goal"><h3>${escapeHtml(g.name)}</h3><div>${yen(g.saved)} / ${yen(g.amount)}</div><div class="goal-bar"><span style="width:${g.amount?Math.min(100,g.saved/g.amount*100):0}%"></span></div><div class="meta">${escapeHtml(g.date)}</div></div>`).join("")):`<div class="card muted">${kidMode?"まだ めあてが ないよ。":"目標がありません。"}</div>`; }
function renderFilters(){ const af=$("af");if(af){const cur=af.value||"all";af.innerHTML=`<option value="all">${kidMode?"ぜんぶ":"すべて"}</option>`;for(const [k,a] of Object.entries(ASSETS))af.insertAdjacentHTML("beforeend",`<option value="${k}">${a.icon} ${escapeHtml(assetName(k))}</option>`);af.value=[...af.options].some(o=>o.value===cur)?cur:"all";} }

function applyKidModeUI() {
  const k = kidMode;
  const set = (id, text) => { const el=$(id); if(el) el.textContent=text; };
  const tabTexts = k ? {home:"🏠 おうち",money:"💰 おかね",education:"📚 おべんきょう",learn:"🎯 クイズ",goals:"⭐ めあて"}
                        : {home:"🏠 ホーム",money:"💰 お金",education:"📚 学習",learn:"🎯 クイズ",goals:"⭐ 目標"};
  document.querySelectorAll('.tab').forEach(t=>{ if(tabTexts[t.dataset.tab]) t.textContent=tabTexts[t.dataset.tab]; });
  const labels = k ? {
    childLabel:"たいしょうの こども", addChild:"＋ こどもを ついか", homeToday:"きょうの おかね", todaySub:"えらんだ こどもの きろく",
    assets:"もっている おかね", recent:"さいきんの きろく", moneyTitle:"おかねの きろく", moneySub:"こどもごとに おかねを きろくするよ。",
    in:"＋ おかねを いれる", out:"− おかねを つかう", settings:"⚙️ せってい", mode:"こどもモード", goals:"めあて", addGoal:"＋ めあてを つくる",
    simulation:"これからの おかね", annual:"1ねんで ふやす おかね", years:"なんねん", ratio:"ためる わりあい", simulate:"けいさん",
    childName:"なまえ", birth:"うまれた とし", date:"ひづけ", amount:"おかね", asset:"しゅるい", reason:"りゆう", memo:"メモ",
    goalName:"めあての なまえ", goalAmount:"ひつような おかね", goalDate:"いつまで", goalSaved:"いま たまった おかね",
    export:"データを ほぞん", import:"データを よみこむ", reset:"データを ぜんぶ けす", tf:"しゅるい", af:"おかねの しゅるい"
  } : {
    childLabel:"対象の子ども", addChild:"＋ 子どもを追加", homeToday:"今日のお金", todaySub:"選択中の子どもの記録",
    assets:"資産", recent:"最近の記録", moneyTitle:"お金の記録", moneySub:"入金・出金を子どもごとに管理します。",
    in:"＋ 入金", out:"− 出金", settings:"⚙️ 設定", mode:"こどもモード", goals:"目標", addGoal:"＋ 目標を追加",
    simulation:"将来シミュレーション", annual:"年間追加額", years:"年数", ratio:"ためる割合", simulate:"計算",
    childName:"名前", birth:"生まれた年", date:"日付", amount:"金額", asset:"種類", reason:"理由", memo:"メモ",
    goalName:"目標名", goalAmount:"金額", goalDate:"期限", goalSaved:"いま貯めた金額",
    export:"データを書き出す", import:"データを読み込む", reset:"データをすべて削除", tf:"種類", af:"資産"
  };
  const textById={addChild:labels.addChild,settings:labels.settings,in:labels.in,in2:labels.in,out:labels.out,out2:labels.out,addGoal:labels.addGoal,simulate:labels.simulate,export:labels.export,reset:labels.reset,childModalTitle:k?"こどもを ついか":"子どもを追加",txTitle:k?"おかねを いれる":"入金を追加",txSubmit:k?"きろくする":"記録する"};
  Object.entries(textById).forEach(([id,text])=>set(id,text));
  const childLabel=document.querySelector('.child-title .label'); if(childLabel) childLabel.textContent=labels.childLabel;
  const todayHead=document.querySelector('#home .section-header h2'); if(todayHead) todayHead.textContent=labels.homeToday;
  const todaySub=document.querySelector('#home .section-header .muted'); if(todaySub) todaySub.textContent=labels.todaySub;
  const assetHeads=document.querySelectorAll('#home .section-header h2'); if(assetHeads[1]) assetHeads[1].textContent=labels.assets;
  if(assetHeads[2]) assetHeads[2].textContent=labels.recent;
  const moneyH=document.querySelector('#money .section-header h2'); if(moneyH) moneyH.textContent=labels.moneyTitle;
  const moneySub=document.querySelector('#money .section-header .muted'); if(moneySub) moneySub.textContent=labels.moneySub;
  const modeLabel=document.querySelector('.mode-switch span'); if(modeLabel) modeLabel.textContent=labels.mode;
  const simSummary=document.querySelector('.panel-tools details > summary'); if(simSummary) simSummary.textContent=labels.simulation;
  const filterLabels=document.querySelectorAll('#money .filters label'); if(filterLabels[0]) filterLabels[0].firstChild.textContent=labels.tf; if(filterLabels[1]) filterLabels[1].firstChild.textContent=labels.af;
  const modalLabels=[['childName',labels.childName],['birth',labels.birth],['date',labels.date],['amount',labels.amount],['asset',labels.asset],['reason',labels.reason],['memo',labels.memo],['goalName',labels.goalName],['goalAmount',labels.goalAmount],['goalDate',labels.goalDate],['goalSaved',labels.goalSaved],['annual',labels.annual],['years',labels.years],['saveRatio',labels.ratio]];
  modalLabels.forEach(([id,text])=>{const el=$(id);if(el&&el.parentElement?.tagName==='LABEL')el.parentElement.childNodes[0].textContent=text;});
  const settingsTitle=document.querySelector('#settingsModal h2'); if(settingsTitle) settingsTitle.textContent=k?'せってい':'設定';
  const goalsTitle=document.querySelector('#goals .section-header h2'); if(goalsTitle) goalsTitle.textContent=labels.goals;
}

function renderAll(){ try{applyKidModeUI();renderChildSelector();renderSummary();renderAssets();renderFilters();renderTransactions();renderGoals();renderTodayMoney();window.dispatchEvent(new CustomEvent("kidsMoneyRendered",{detail:{childId:selectedChildId,child:getCurrentChild(),kidMode}}));}catch(e){console.error(e);showError(kidMode?"ひょうじで エラーが おきたよ。":"画面の表示中にエラーが発生しました。");} }

function openChildModal(id=null){ editingChildId=id; const m=$("childModal");if(!m)return;const c=id?getChildById(id):null;$("childName").value=c?.name||"";$("birth").value=c?.birthYear||"";$("childModalTitle").textContent=id?(kidMode?"こどもを なおす":"子どもを編集"):(kidMode?"こどもを ついか":"子どもを追加");$("childSubmit").textContent=id?(kidMode?"ほぞん":"変更を保存"):(kidMode?"ついか":"追加");m.classList.remove("hidden"); }
function closeModal(id){$(id)?.classList.add("hidden");if(id==="childModal")editingChildId=null;if(id==="txModal")editingTransactionId=null;}
function handleChildSubmit(e){e.preventDefault();const name=$("childName").value.trim(),birth=Number($("birth").value);if(!name||!birth){alert(kidMode?"なまえと うまれた としを いれてね。":"名前と生まれた年を入力してください。");return;}if(editingChildId){const c=getChildById(editingChildId);c.name=name;c.birthYear=birth;}else{const c=normalizeChild({id:createId(),name,birthYear:birth,transactions:[],goals:[],learning:{}});state.children.push(c);selectedChildId=c.id;saveSelectedChildId();}saveState();closeModal("childModal");e.target.reset();renderAll();window.dispatchEvent(new CustomEvent("kidsMoneyChildChanged",{detail:{childId:selectedChildId,child:getCurrentChild()}}));}
function deleteChild(id){if(state.children.length<=1){alert(kidMode?"ひとりだけは けせないよ。":"子どもが1人だけのときは削除できません。");return;}const c=getChildById(id);if(!c)return;if(!confirm(kidMode?c.name+" を けしていい？":c.name+" とその記録を削除しますか？"))return;const i=state.children.findIndex(x=>x.id===id);state.children.splice(i,1);if(id===selectedChildId)selectedChildId=state.children[Math.max(0,i-1)].id;saveSelectedChildId();saveState();renderAll();window.dispatchEvent(new CustomEvent("kidsMoneyChildChanged",{detail:{childId:selectedChildId,child:getCurrentChild()}}));}
function openTransactionModal(type,id=null){const c=getCurrentChild();if(!c)return;editingTransactionId=id;const tx=id?c.transactions.find(t=>t.id===id):null;$("txType").value=tx?.type||type;$("txTitle").textContent=tx?(kidMode?"おかねを なおす":(tx.type==='in'?"入金を編集":"出金を編集")):(kidMode?(type==='in'?"おかねを いれる":"おかねを つかう"):(type==='in'?"入金を追加":"出金を追加"));$("date").value=tx?.date||today();$("amount").value=tx?.amount||"";$("reason").value=tx?.reason||"";$("memo").value=tx?.memo||"";$("asset").innerHTML=Object.entries(ASSETS).map(([k,a])=>`<option value="${k}">${a.icon} ${escapeHtml(assetName(k))}</option>`).join("");$("asset").value=tx?.asset||"cash";$("txSubmit").textContent=tx?(kidMode?"ほぞん":"変更を保存"):(kidMode?"きろくする":"記録する");$("txModal").classList.remove("hidden");}
function handleTransactionSubmit(e){e.preventDefault();const c=getCurrentChild();if(!c)return;const type=$("txType").value==='out'?'out':'in',amount=Number($("amount").value),asset=$("asset").value,date=$("date").value||today();if(!(amount>0)||!ASSETS[asset]){alert(kidMode?"ただしい おかねを いれてね。":"金額と資産を確認してください。");return;}let tx=editingTransactionId?c.transactions.find(t=>t.id===editingTransactionId):null;if(tx){tx.type=type;tx.amount=amount;tx.asset=asset;tx.date=date;tx.reason=$("reason").value||"";tx.memo=$("memo").value.trim();tx.indexAtTransaction=(asset!=="cash"?(getIndexValue(asset,date)||tx.indexAtTransaction||null):null);}else c.transactions.push({id:createId(),type,amount,asset,date,reason:$("reason").value||"",memo:$("memo").value.trim(),indexAtTransaction:(asset!=="cash"?getIndexValue(asset,date):null),createdAt:new Date().toISOString()});saveState();closeModal("txModal");e.target.reset();editingTransactionId=null;renderAll();}
function deleteTransaction(id){const c=getCurrentChild();const i=c?.transactions?.findIndex(t=>t.id===id);if(i<0)return;const tx=c.transactions[i];if(!confirm(kidMode?"この きろくを けしていい？":"この取引記録を削除しますか？"))return;c.transactions.splice(i,1);saveState();renderAll();}
function handleGoalSubmit(e){e.preventDefault();const c=getCurrentChild();const name=$("goalName").value.trim(),amount=Number($("goalAmount").value),date=$("goalDate").value||today();if(!name||!(amount>0)){alert(kidMode?"めあてを いれてね。":"目標名と金額を入力してください。");return;}c.goals.push({id:createId(),name,amount,date,saved:Number($("goalSaved").value)||0});saveState();closeModal("goalModal");e.target.reset();renderAll();}
function simulateFuture(){const c=calculateChild(getCurrentChild()),annual=Number($("annual")?.value)||0,years=Number($("years")?.value)||1,ratio=(Number($("saveRatio")?.value)||50)/100;const fv=(p,a,r)=>p*Math.pow(1+r,years)+a*((Math.pow(1+r,years)-1)/r);const total=fv(c.balances.cash,annual*ratio,ASSETS.cash.fixedRate)+fv(c.investmentValue,annual*(1-ratio),ASSETS.world.fixedRate);$("result").innerHTML=`<div class="card"><h3>${kidMode?"かんがえてみよう":"シミュレーション結果"}</h3><div class="value">${yen(total)}</div><p>${years}${kidMode?"ねん":"年"}${kidMode?"ご":"後"}</p></div>`;}
function exportData(){const blob=new Blob([JSON.stringify({version:APP_VERSION,exportedAt:new Date().toISOString(),children:state.children},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kids-money-v32.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function importData(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const p=parseState(r.result);if(!p){alert(kidMode?"データが ただしくないよ。":"JSONが正しくありません。");return;}state=p;selectedChildId=state.children[0].id;saveSelectedChildId();saveState();renderAll();alert(kidMode?"データを よみこんだよ。":"データを読み込みました。");};r.readAsText(f);}
function resetData(){if(!confirm(kidMode?"ぜんぶ けしていい？":"データをすべて削除しますか？"))return;state=createDefaultState();selectedChildId=state.children[0].id;saveSelectedChildId();saveState();renderAll();}

function bindEvents(){
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  $("child")?.addEventListener("change",e=>selectChild(e.target.value));
  $("addChild")?.addEventListener("click",()=>openChildModal());
  $("in")?.addEventListener("click",()=>openTransactionModal("in")); $("in2")?.addEventListener("click",()=>openTransactionModal("in"));
  $("out")?.addEventListener("click",()=>openTransactionModal("out")); $("out2")?.addEventListener("click",()=>openTransactionModal("out"));
  $("childForm")?.addEventListener("submit",handleChildSubmit); $("txForm")?.addEventListener("submit",handleTransactionSubmit); $("goalForm")?.addEventListener("submit",handleGoalSubmit);
  $("tf")?.addEventListener("change",renderTransactions); $("af")?.addEventListener("change",renderTransactions); $("simulate")?.addEventListener("click",simulateFuture);
  $("addGoal")?.addEventListener("click",()=>$("goalModal")?.classList.remove("hidden")); $("settings")?.addEventListener("click",()=>$("settingsModal")?.classList.remove("hidden"));
  $("export")?.addEventListener("click",exportData); $("import")?.addEventListener("change",importData); $("reset")?.addEventListener("click",resetData);
  $("kidMode")?.addEventListener("change",e=>{kidMode=e.target.checked;localStorage.setItem(KID_MODE_KEY,kidMode?"1":"0");renderAll();window.dispatchEvent(new CustomEvent("kidsMoneyKidModeChanged",{detail:{kidMode}}));});
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
  document.addEventListener("click",e=>{
    const ce=e.target.closest("[data-child-edit]"); if(ce){openChildModal(ce.dataset.childEdit);return;}
    const cd=e.target.closest("[data-child-delete]"); if(cd){deleteChild(cd.dataset.childDelete);return;}
    const te=e.target.closest("[data-tx-edit]"); if(te){openTransactionModal("in",te.dataset.txEdit);return;}
    const td=e.target.closest("[data-tx-delete]"); if(td){deleteTransaction(td.dataset.txDelete);return;}
    const tab=e.target.closest("[data-tab]:not(.tab)"); if(tab){e.preventDefault();switchTab(tab.dataset.tab);}
  });
}
function switchTab(id){const panel=$(id);if(!panel)return;document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active",p.id===id));document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===id));window.scrollTo({top:0,behavior:"smooth"});if(id==="learn"&&window.KidsMoneyLearn?.render)window.KidsMoneyLearn.render();if(id==="education"&&window.KidsMoneyEducation?.render)window.KidsMoneyEducation.render();}
async function loadMarket(){ try { const r=await fetch(MARKET_DATA_URL+"?t="+Date.now(),{cache:"no-store"}); if(!r.ok)throw new Error("market"); const data=await r.json(); if(data?.markets){marketState={...data,source:"github"};localStorage.setItem("kidsMoneyMarketV32",JSON.stringify(marketState));} } catch(e){ try{const raw=localStorage.getItem("kidsMoneyMarketV32");if(raw)marketState={...JSON.parse(raw),source:"cache"};}catch(_){ } } renderAll(); }
function init(){state=loadState();selectedChildId=loadSelectedChildId();const km=$("kidMode");if(km)km.checked=kidMode;bindEvents();renderAll();loadMarket();window.dispatchEvent(new CustomEvent("kidsMoneyChildChanged",{detail:{childId:selectedChildId,child:getCurrentChild()}}));}
document.addEventListener("DOMContentLoaded",init);
