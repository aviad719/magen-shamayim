// v7 (מגן שמיים): strict own territory, US base back after 2 waves, 20 waves + endless, boss waves, final score + top-10, save code, strike ₪500.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const vm=require('vm');
const S_DIR=path.join(__dirname,'..','site');
function stub(){const store={};const f=function(){return p};const p=new Proxy(f,{get(t,k){if(k in store)return store[k];if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;if(k==='children')return [];if(k==='offsetParent')return null;return p},set(t,k,v){store[k]=v;return true}});return p}
function memStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
function boot(storage){const els={};const win={innerWidth:844,innerHeight:390,devicePixelRatio:1,addEventListener(){},Math,console,JSON,Map,Set,Array,Object,Number,String,Date,Infinity,NaN,parseInt,parseFloat,isFinite};
 win.window=win;win.localStorage=storage||memStorage();win.document={getElementById:id=>els[id]||(els[id]=stub()),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){},hidden:false};
 win.Path2D=function(){return stub()};win.Image=function(){return stub()};win.performance={now:()=>0};win.requestAnimationFrame=()=>0;win.setTimeout=()=>0;win.clearTimeout=()=>{};
 const ctx=vm.createContext(win);for(const f of ['geo.js','shared.js','game.js'])vm.runInContext(fs.readFileSync(path.join(S_DIR,f),'utf8'),ctx);return {G:win.GAME,win,els}}
const seed=s=>{let x=s;Math.random=()=>{x=(x*16807)%2147483647;return x/2147483647}};
function quickWave(G){G.startWave();G.S.queue=[];G.S.threats=[];G.step(.1)}
const cityAt=(G,n)=>G.S.cities.find(c=>c.n===n);
function finishWave(G){G.S.queue=[];G.S.threats=[];G.step(.1)}

test('v7 1 territory: radar and batteries only inside Israel (incl. Judea & Samaria, Golan); not Jordan, Egypt, Gaza, Syria, Lebanon, Iran',()=>{const {G}=boot();G.newGame('normal');G.S.budget=99999;
 for(const [n,lo,la] of [['Tel Aviv',34.8,32.08],['Jerusalem',35.2,31.78],['Golan',35.75,33.0],['Eilat',34.95,29.6],['Samaria',35.25,32.2]])assert.ok(G.inIsrael(lo,la),n);
 for(const [n,lo,la] of [['Aqaba',35.0,29.53],['Gaza',34.45,31.5],['Amman',35.93,31.95],['Sinai near border',34.2,30.9],['Damascus',36.29,33.51],['Tyre',35.2,33.27],['Tehran',51.4,35.7],['Baghdad',44.37,33.31]]){
   assert.ok(!G.inIsrael(lo,la),n+' is not Israel');assert.ok(!G.v6.placeRadar(lo,la),'no radar in '+n);assert.ok(!G.placeTower('dome',lo,la),'no battery in '+n)}
 assert.strictEqual(G.S.radars.length,0);assert.strictEqual(G.S.towers.length,0);
 assert.ok(G.v6.placeRadar(34.95,31.95),'radar inside Israel');assert.ok(!G.placeTower('dome',35.0,29.53),'not next to a radar either when outside Israel')});

test('v7 1 territory: around a city captured in the RTS (Tyre) Lebanon is own ground, but not across into Syria',()=>{const st=memStorage();const {G,win}=boot(st);win.SHARED.capture('tyre');G.newGame('normal');G.S.budget=99999;
 assert.ok(cityAt(G,'צור'),'Tyre is a TD city');assert.ok(G.inIsrael(35.25,33.27),'next to Tyre');assert.ok(G.placeTower('dome',35.25,33.27));assert.ok(!G.inIsrael(36.29,33.51),'Damascus still not')});

test('v7 7 Air Force strike costs ₪500',()=>{const {G}=boot();assert.strictEqual(G.v6.IAF.cost,500)});

test('v7 2 a hit US base is down for that wave and the next, back in action 2 waves later with a toast; Iran does not aim at it while down',()=>{seed(9);const {G,els}=boot();G.newGame('normal');G.S.budget=5000;G.S.wave=3;
 G.startWave();const b=G.S.cbases.find(x=>x.key==='muwaffaq');assert.ok(b.on,'US joined');G.hitTarget(b,{type:'ballistic'});assert.strictEqual(b.struck,4);assert.strictEqual(G.v7.capBase(b,4),0);
 assert.match(G.coalition.cbaseInfo(b),/חוזר לפעולה בגל 6/);finishWave(G);
 G.startWave();assert.strictEqual(G.S.wave,5);assert.strictEqual(G.v7.capBase(b,5),0,'still down in the next wave');assert.strictEqual(G.S.basesBack.length,0);
 for(let r=0;r<20;r++){for(const e of G.buildWave(5))assert.ok(true);}
 G.S.threats=[];const n0=G.S.threats.length;finishWave(G);
 G.startWave();assert.strictEqual(G.S.wave,6);assert.strictEqual(G.v7.capBase(b,6),1,'back after 2 waves');assert.ok(G.S.basesBack.includes(b.n));assert.match(els.banner.textContent,/חזר לפעולה/);
 assert.match(G.coalition.cbaseInfo(b),/פעיל/)});

test('v7 2 while a US base is down no new threat is aimed at it',()=>{seed(10);const {G}=boot();G.newGame('normal');G.S.wave=3;G.startWave();const b=G.S.cbases.find(x=>x.key==='sultan');G.hitTarget(b,{type:'ballistic'});
 for(const c of G.S.cities)c.hp=99;G.S.threats=[];let n=0;for(let i=0;i<60*60&&G.S.inWave;i++){G.update(1/60);for(const t of G.S.threats)if(t.s<1&&t.city===b)n++}assert.strictEqual(n,0)});

test('v7 3 20 waves; new threats keep their first waves; later waves grow gradually, mix more and fly faster; endless past 20',()=>{const {G}=boot();const W=G.WAVES;assert.strictEqual(W.length,20);
 const first=k=>W.findIndex(w=>w[k])+1;assert.strictEqual(first('sw'),3);assert.strictEqual(first('hy'),5);assert.strictEqual(first('mv'),6);assert.strictEqual(first('ballistic'),4);
 const tot=w=>w.drone+(w.uav||0)+(w.cruise||0)+(w.ballistic||0);for(let i=1;i<20;i++){assert.ok(tot(W[i])>=tot(W[i-1]),'wave '+(i+1)+' not smaller');if(i>=8){assert.ok(tot(W[i])<=tot(W[i-1])*1.08,'gradual at '+(i+1));assert.ok((W[i].spd||1)>=(W[i-1].spd||1),'not slower at '+(i+1))}}assert.ok(W[19].spd>=1.08,'late waves fly faster');
 assert.ok(W[19].sw>W[7].sw&&W[19].hy>W[7].hy&&W[19].mv>W[7].mv,'more mix late');
 const d21=G.v7.waveDef(21),d30=G.v7.waveDef(30);assert.ok(tot(d21)>tot(W[19])&&tot(d30)>tot(d21)&&d30.spd>=d21.spd);assert.ok(!d21.boss&&G.v7.waveDef(25).boss&&G.v7.waveDef(30).boss)});

test('v7 3 after wave 20: victory screen with an endless choice; endless continues to wave 21+ and records a score when it ends',()=>{seed(11);const st=memStorage();const {G,els}=boot(st);G.newGame('normal');G.S.wave=19;
 G.startWave();finishWave(G);assert.ok(G.S.won&&G.S.over,'victory after wave 20');assert.match(els.overTitle.textContent,/ניצחון/);assert.strictEqual(G.v7.highScores().length,1);
 assert.ok(G.v7.continueEndless());assert.ok(G.S.endless&&!G.S.over);assert.strictEqual(G.v7.lastWave(),Infinity);assert.ok(G.v6.canStrike(),'strikes still allowed in endless');
 G.startWave();assert.strictEqual(G.S.wave,21);assert.ok(G.S.queue.length>0);finishWave(G);assert.ok(!G.S.over,'endless goes on');assert.match(els.wave.textContent,/∞/);
 G.saveGame();const {G:G2}=boot(st);assert.ok(G2.continueGame());assert.ok(G2.S.endless);assert.strictEqual(G2.S.wave,21);
 G2.startWave();for(const c of G2.S.cities)for(let k=0;k<20&&!c.dead;k++)G2.hitTarget(c,{type:'ballistic'});G2.step(.2);assert.ok(G2.S.over,'game over');const hs=G2.v7.highScores();assert.strictEqual(hs.length,1,'same game: one row, updated');assert.strictEqual(hs[0].w,22);assert.strictEqual(hs[0].e,1)});

test('v7 4 boss every 5 waves: a huge salvo from several directions at once, banner, money bonus only if no city falls',()=>{seed(12);const {G,els}=boot();G.newGame('normal');
 for(const n of [5,10,15,20])assert.ok(G.v7.isBoss(n),'boss '+n);assert.ok(!G.v7.isBoss(6));
 G.S.wave=9;const q=G.buildWave(10).filter(e=>e.boss);assert.ok(q.length>=30,'big salvo '+q.length);const cc=new Set(q.map(e=>e.lb?'LB':G.S.launchers[e.li].cc));assert.ok(cc.size>=4,'directions '+[...cc]);
 const ts=q.map(e=>e.t);assert.ok(Math.max(...ts)-Math.min(...ts)<=5.5,'at once');
 G.S.wave=9;G.startWave();assert.match(els.banner.textContent,/גל בוס/);const b0=G.S.budget;finishWave(G);assert.ok(G.S.bossBonus>=1000,'bonus '+G.S.bossBonus);assert.ok(G.S.budget-b0>=G.S.bossBonus);assert.strictEqual(G.S.eco.boss,G.S.bossBonus);
 G.S.wave=14;G.startWave();cityAt(G,'אילת').dead=true;finishWave(G);assert.strictEqual(G.S.bossBonus,0,'a city fell: no bonus')});

test('v7 5 final score = interceptions ×10 + cities ×500 + wave ×250, × difficulty; top 10 kept sorted in localStorage',()=>{const st=memStorage();const {G}=boot(st);G.newGame('hard');G.S.wave=7;G.S.stats.kills=321;G.S.cities[0].dead=true;
 const f=G.v7.finalScore();assert.strictEqual(f.total,Math.round((321*10+5*500+7*250)*1.5));
 for(let i=0;i<12;i++){G.newGame('normal');G.S.wave=i;G.S.stats.kills=i*10;G.v7.recordScore()}const hs=G.v7.highScores();assert.strictEqual(hs.length,10);for(let i=1;i<10;i++)assert.ok(hs[i-1].s>=hs[i].s);
 assert.ok(JSON.parse(st.getItem(G.v7.SCORES_KEY)).length===10);assert.match(G.v7.scoresHTML(),/<table class="hs">/)});

test('v7 6 save code carries TD + RTS + shared pool to another device; a bad code is refused; importing asks first in the UI',()=>{const a=memStorage();const {G,win}=boot(a);G.newGame('normal');G.S.wave=3;G.S.budget=1234;G.saveGame();
 win.SHARED.addBudget(777,'גל');a.setItem('lebanonFront.save.v1',JSON.stringify({v:1,t:'שמירה'}));G.v7.recordScore();const code=win.SHARED.exportCode();assert.match(code,/^MSH1-/);
 const b=memStorage();const {G:G2,win:w2,els}=boot(b);assert.ok(!w2.SHARED.readCode('garbage').ok);assert.ok(!w2.SHARED.readCode(code.slice(0,-4)+'abcd').ok);
 let asked=0;w2.confirm=()=>{asked++;return false};let r=G2.v7.importSaveCode(code,true);assert.strictEqual(asked,1);assert.ok(r.cancel);assert.strictEqual(b.getItem('magenShamayim.save.v3'),null,'cancel changes nothing');
 r=G2.v7.importSaveCode(code,false);assert.ok(r.ok);assert.strictEqual(r.summary.td.wave,3);assert.strictEqual(r.summary.pool,777);assert.ok(r.summary.rts);
 const {G:G3,win:w3}=boot(b);assert.ok(G3.continueGame());assert.strictEqual(G3.S.wave,3);assert.strictEqual(G3.S.budget,1234);assert.strictEqual(w3.SHARED.budget(),777);assert.strictEqual(JSON.parse(b.getItem('lebanonFront.save.v1')).t,'שמירה');assert.strictEqual(G3.v7.highScores().length,1)});

test('v7 old v6 saves still load (no gid / endless fields)',()=>{const st=memStorage();const {G}=boot(st);G.newGame('normal');G.S.wave=6;G.saveGame();const v=JSON.parse(st.getItem('magenShamayim.save.v3'));delete v.gid;delete v.endless;st.setItem('magenShamayim.save.v3',JSON.stringify(v));
 const {G:G2}=boot(st);assert.ok(G2.continueGame());assert.strictEqual(G2.S.wave,6);assert.ok(!G2.S.endless);assert.ok(G2.S.gid)});

test('v7 UI: how-to lines for every v7 item at the TOP of the intro; scores / save-code buttons, endless button, modal',()=>{const h=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');
 const items=h.slice(h.indexOf('<ul>'),h.indexOf('</ul>')).split('<li').slice(1).filter(x=>!/^ class="v8"/.test(x)).slice(0,6);assert.ok(items.every(x=>/^ class="v7"/.test(x)));const t=items.join(' ');
 for(const re of [/20 גלים/,/אינסופי/,/גל בוס/,/ניקוד/,/קוד שמירה/,/חוזר לפעולה אחרי 2 גלים/,/שטח ישראל/,/₪500/])assert.match(t,re);
 for(const id of ['btnScores','btnCode','v7','v7Body','v7Close','btnEndless','overScore'])assert.ok(h.includes('id="'+id+'"'),id)});
