const KEY="kidsMoneyLabV1";
const ASSETS={
 cash:{name:"貯金",icon:"🏦",rate:.002,risk:"小",cls:"low",desc:"安全性を重視して置いておくお金"},
 world:{name:"全世界株式",icon:"🌎",rate:.05,risk:"大",cls:"high",desc:"世界中の会社に広く投資する想定"},
 sp:{name:"S&P500",icon:"🇺🇸",rate:.06,risk:"大",cls:"high",desc:"米国の代表的な株価指数に連動する想定"}
};
let state=load(),selected=state.children[0].id;
function id(){return crypto.randomUUID?.()||Date.now()+"-"+Math.random()}
function load(){try{let x=JSON.parse(localStorage.getItem(KEY));if(x?.children?.length)return x}catch(e){}let x={version:1,children:[{id:id(),name:"こどもA",birthYear:2019,transactions:[]}]};localStorage.setItem(KEY,JSON.stringify(x));return x}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function c(){return state.children.find(x=>x.id===selected)}
function yen(n){return "¥"+Math.round(n).toLocaleString("ja-JP")}
function esc(s){return String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[x]))}
function principal(x){return x.transactions.reduce((s,t)=>s+Number(t.amount),0)}
function balances(x){let b={cash:0,world:0,sp:0};x.transactions.forEach(t=>b[t.asset]+=Number(t.amount));return b}
function render(){
 let x=c(),bs=balances(x),p=principal(x),total=p;
 document.querySelector("#child").innerHTML=state.children.map(q=>`<option value="${q.id}">${esc(q.name)}</option>`).join("");document.querySelector("#child").value=selected;
 document.querySelector("#total").textContent=yen(total);document.querySelector("#gain").textContent="元本 "+yen(p);
 document.querySelector("#cash").textContent=yen(bs.cash);document.querySelector("#invest").textContent=yen(bs.world+bs.sp);
 document.querySelector("#assets").innerHTML=Object.entries(ASSETS).map(([k,a])=>`<article class="asset"><div class="assettop"><span class="asseticon">${a.icon}</span><span class="risk ${a.cls}">リスク：${a.risk}</span></div><h3>${a.name}</h3><div class="value">${yen(bs[k])}</div><div class="meta">想定 ${a.rate*100}%/年</div><div class="meta">${a.desc}</div></article>`).join("");
 let tx=[...x.transactions].sort((a,b)=>b.date.localeCompare(a.date));
 document.querySelector("#transactions").innerHTML=tx.length?tx.map(t=>`<div class="tx"><div class="txdate">${t.date}</div><div class="txmain"><b>${esc(t.reason)}</b><span>${ASSETS[t.asset].icon} ${ASSETS[t.asset].name}${t.memo?" · "+esc(t.memo):""}</span></div><div class="txamount">${yen(t.amount)}</div></div>`).join(""):'<div class="card" style="text-align:center;color:#687386">まだ入金履歴がありません。最初のお金を記録してみましょう。</div>';
 document.querySelector("#asset").innerHTML=Object.entries(ASSETS).map(([k,a])=>`<option value="${k}">${a.icon} ${a.name}</option>`).join("");
 document.querySelector("#age").value=Math.max(0,new Date().getFullYear()-x.birthYear);draw();
}
function draw(){
 let cv=document.querySelector("#chart"),ctx=cv.getContext("2d"),w=cv.clientWidth||600,h=220,d=devicePixelRatio||1;cv.width=w*d;cv.height=h*d;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);
 let tx=[...c().transactions].sort((a,b)=>a.date.localeCompare(b.date));if(!tx.length){ctx.fillStyle="#687386";ctx.font="13px sans-serif";ctx.fillText("入金すると推移が表示されます",15,35);return}
 let vals=[],n=0;tx.forEach(t=>{n+=Number(t.amount);vals.push(n)});let max=Math.max(...vals),pad=25,pw=w-pad*2,ph=h-50;
 ctx.strokeStyle="#e5e9f0";for(let i=0;i<4;i++){let y=20+i*ph/3;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke()}
 ctx.strokeStyle="#315efb";ctx.lineWidth=3;ctx.beginPath();vals.forEach((v,i)=>{let x=pad+(vals.length===1?pw/2:i*pw/(vals.length-1)),y=20+ph-v/max*ph;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()
 ctx.fillStyle="#172033";ctx.font="12px sans-serif";ctx.fillText(yen(max),pad,15)
}
function open(id){document.querySelector("#"+id).classList.remove("hidden")}function close(id){document.querySelector("#"+id).classList.add("hidden")}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));document.querySelector("#"+b.dataset.tab).classList.add("active")});
document.querySelector("#child").onchange=e=>{selected=e.target.value;render()};
document.querySelector("#addChild").onclick=()=>open("childModal");
document.querySelector("#settings").onclick=()=>open("settingsModal");
["addTx","addTx2"].forEach(x=>document.querySelector("#"+x).onclick=()=>{document.querySelector("#txDate").value=new Date().toISOString().slice(0,10);open("txModal")});
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>close(b.dataset.close));
document.querySelector("#childForm").onsubmit=e=>{e.preventDefault();let q={id:id(),name:document.querySelector("#childName").value.trim(),birthYear:+document.querySelector("#birth").value,transactions:[]};state.children.push(q);selected=q.id;save();e.target.reset();close("childModal");render()};
document.querySelector("#txForm").onsubmit=e=>{e.preventDefault();let x=c();x.transactions.push({id:id(),date:document.querySelector("#txDate").value,amount:+document.querySelector("#amount").value,reason:document.querySelector("#reason").value,asset:document.querySelector("#asset").value,memo:document.querySelector("#memo").value.trim()});save();e.target.reset();close("txModal");render()};
document.querySelector("#simulate").onclick=()=>{
 let x=c(),bs=balances(x),current=principal(x),annual=+document.querySelector("#annual").value,years=+document.querySelector("#years").value;
 let avg=current?(bs.cash*.002+bs.world*.05+bs.sp*.06)/current:.05;
 let fv=(r)=>current*Math.pow(1+r,years)+annual*((Math.pow(1+r,years)-1)/r||years);
 document.querySelector("#result").innerHTML=`<div class="card simcard"><small>RESULT</small><h3>現在の配分を続けた場合</h3><div class="simnumber">${yen(fv(avg))}</div><p class="muted">${years}年後・教育用想定平均リターン ${(avg*100).toFixed(1)}%</p><table class="simtable"><tr><th>ケース</th><th>想定</th><th>将来額</th></tr><tr><td>貯金中心</td><td>0.2% / 小</td><td>${yen(fv(.002))}</td></tr><tr><td>中間</td><td>3.5% / 中</td><td>${yen(fv(.035))}</td></tr><tr><td>投資中心</td><td>5.5% / 大</td><td>${yen(fv(.055))}</td></tr></table><p class="muted">※いずれも仮定であり、将来の成果を保証しません。</p></div>`;
};
document.querySelector("#export").onclick=()=>{let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="kids-money-backup.json";a.click()};
document.querySelector("#import").onchange=e=>{let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.children?.length)throw 0;state=x;selected=x.children[0].id;save();render();close("settingsModal");alert("読み込みました")}catch(_){alert("JSONの形式が正しくありません")}};r.readAsText(e.target.files[0])};
document.querySelector("#reset").onclick=()=>{if(confirm("すべてのデータを削除しますか？")){localStorage.removeItem(KEY);state=load();selected=state.children[0].id;render()}};
window.onresize=draw;render();
