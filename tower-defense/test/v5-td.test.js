// v4 stage 3 (מגן שמיים): the US joins from wave 4 with THAAD + Patriot at 4 bases, per-system hit probabilities with visible misses and
// retries, Iran can strike the bases (out / 50% / full), coalition purchase requests every 2 waves paid in 3 installments; data-driven; saves.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const vm=require('vm');
const PROJ=fs.existsSync(path.join(__dirname,'..','site','rts'));
const S_DIR=PROJ?path.join(__dirname,'..','site'):path.join(__dirname,'..','..','tower-defense','site');
function stub(){const store={};const f=function(){return p};const p=new Proxy(f,{get(t,k){if(k in store)return store[k];if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;if(k==='children')return [];if(k==='offsetParent')return null;return p},set(t,k,v){store[k]=v;return true}});return p}
function memStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
function boot(storage,before){const els={};const win={innerWidth:844,innerHeight:390,devicePixelRatio:1,addEventListener(){},Math,console,JSON,Map,Set,Array,Object,Number,String,Date,Infinity,NaN,parseInt,parseFloat,isFinite};
 win.window=win;win.localStorage=storage||memStorage();win.document={getElementById:id=>els[id]||(els[id]=stub()),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){},hidden:false};
 win.Path2D=function(){return stub()};win.Image=function(){return stub()};win.performance={now:()=>0};win.requestAnimationFrame=()=>0;win.setTimeout=()=>0;win.clearTimeout=()=>{};
 const ctx=vm.createContext(win);for(const f of ['geo.js','shared.js','game.js'])vm.runInContext(fs.readFileSync(path.join(S_DIR,f),'utf8'),ctx);if(before)before(win.GAME);return {G:win.GAME,win,els}}
const seed=s=>{let x=s;Math.random=()=>{x=(x*16807)%2147483647;return x/2147483647}};
function quickWave(G){G.startWave();G.S.queue=[];G.S.threats=[];G.step(.1)}
const us=G=>G.S.towers.filter(t=>t.owner==='us');
// v5 Part A (מגן שמיים): magazines + reload, battery upgrades, more US presence (Al Asad, Al Udeid, 2 carriers).

test('A1 magazine sizes and reload times per spec (US systems too, carriers like a strong Patriot)',()=>{const {G}=boot();const TW=G.TW;
 assert.deepStrictEqual([TW.dome.mag,TW.sling.mag,TW.arrow.mag,TW.thaad.mag,TW.patriot.mag],[20,8,4,6,8]);
 assert.ok(TW.dome.refill>=4.5&&TW.dome.refill<=5.5&&TW.sling.refill<=5.5&&TW.patriot.refill<=5.5);assert.ok(TW.arrow.refill>=7.5&&TW.arrow.refill<=8.5&&TW.thaad.refill>=7.5&&TW.thaad.refill<=8.5);
 assert.ok(TW.sm6&&TW.sm6.ally&&TW.sm6.range>TW.patriot.range&&TW.sm6.pk.ballistic>TW.patriot.pk.ballistic&&TW.sm6.mag>=8,'carrier interceptor = strong Patriot');
 assert.strictEqual(TW.beam.mag,Infinity,'the laser never runs out')});

test('A1 each shot uses one interceptor; empty → "טוען…" ~5 s with no shots, then a full magazine',()=>{seed(5);const {G}=boot();G.newGame('normal');G.S.budget=5000;const ta=G.S.cities[0];
 assert.ok(G.placeTower('dome',34.80,32.12));const tw=G.S.towers[0];assert.strictEqual(tw.ammo,20);
 const spawnDrone=()=>{const th=G.threat('drone',tw.x+40,tw.y-10,ta.x,ta.y);th.spd=4;return th};
 for(let k=0;k<3;k++)spawnDrone();let fired0=tw.fired||0;for(let i=0;i<60*3;i++)G.update(1/60);
 const used=(tw.fired||0)-fired0;assert.ok(used>=1,'fired');assert.strictEqual(tw.ammo,20-used,'one interceptor per shot');
 tw.ammo=1;G.S.threats=[];G.S.shots=[];for(let k=0;k<6;k++)spawnDrone();for(let i=0;i<60*2&&tw.ammo>0;i++)G.update(1/60);assert.strictEqual(tw.ammo,0,'emptied');
 const f=tw.fired;for(let i=0;i<60*4.4;i++){G.update(1/60);if(G.S.threats.length<3)spawnDrone()}assert.strictEqual(tw.fired,f,'no shots while reloading');assert.strictEqual(tw.ammo,0);
 for(let i=0;i<60*0.9;i++)G.update(1/60);assert.ok(tw.ammo>=19,'refilled after ~5 s: '+tw.ammo);
 const js=fs.readFileSync(path.join(S_DIR,'game.js'),'utf8');assert.ok(js.includes("'טוען…'"),'reload label drawn')});

test('A1 US batteries reload too (Patriot ~5 s, THAAD ~8 s)',()=>{seed(2);const {G}=boot();G.newGame('normal');for(let w=1;w<=3;w++)quickWave(G);G.startWave();G.S.queue=[{t:999,type:'drone',li:0}];
 const p=us(G).find(t=>t.type==='patriot'),th=us(G).find(t=>t.type==='thaad');p.ammo=0;th.ammo=0;p.refT=0;th.refT=0;
 for(let i=0;i<60*5.2;i++)G.update(1/60);assert.strictEqual(p.ammo,8,'patriot refilled');assert.strictEqual(th.ammo,0,'thaad still loading');
 for(let i=0;i<60*3;i++)G.update(1/60);assert.strictEqual(th.ammo,6,'thaad refilled')});

test('A2 upgrades: 4 tracks × 3 levels, rising cost, real effect, max level, money checks',()=>{const {G}=boot();G.newGame('normal');G.S.budget=5000;assert.ok(G.placeTower('dome',34.80,32.12));const tw=G.S.towers[0];
 assert.deepStrictEqual(Object.keys(G.UPG),['range','rate','hit','mag']);const costs=[];
 for(let l=0;l<3;l++){costs.push(G.upCost(tw,'range'));const b=G.S.budget;assert.ok(G.upgrade(tw,'range'));assert.strictEqual(G.S.budget,b-costs[l])}
 assert.ok(costs[0]<costs[1]&&costs[1]<costs[2],'rising: '+costs);assert.ok(!G.upgrade(tw,'range'),'max 3 levels');assert.strictEqual(G.upCost(tw,'range'),0);
 assert.ok(Math.abs(G.eff.range(tw)-75*1.45)<.01,'range +15%/level');
 const r0=G.eff.reload(tw),f0=G.eff.refill(tw);G.upgrade(tw,'rate');assert.ok(G.eff.reload(tw)<r0&&G.eff.refill(tw)<f0,'faster fire and reload');
 const p0=G.eff.pk(tw,'drone');G.upgrade(tw,'hit');assert.ok(Math.abs(G.eff.pk(tw,'drone')-(p0+.05))<1e-9,'+5% hit');assert.strictEqual(G.eff.pk(tw,'ballistic')>0,true);
 tw.ammo=10;G.upgrade(tw,'mag');assert.strictEqual(G.eff.mag(tw),25);assert.strictEqual(tw.ammo,15,'bigger magazine adds rounds now');
 assert.strictEqual(G.upTotal(tw),6);assert.strictEqual(G.upSpent(tw),costs.reduce((a,b)=>a+b,0)+G.upSpent({type:'dome',up:{rate:1,hit:1,mag:1}}));
 G.S.budget=0;assert.ok(!G.upgrade(tw,'mag'),'no money, no upgrade');
 const beam={type:'beam',x:0,y:0};assert.ok(!['mag'].some(k=>G.upgrade(beam,k)),'the laser has no magazine track')});

test('A2 tapping your battery opens the upgrade panel (pauses), coalition batteries cannot be upgraded',()=>{const {G,els}=boot();G.newGame('normal');G.S.budget=5000;assert.ok(G.placeTower('sling',34.9,31.9));const tw=G.S.towers[0];
 assert.ok(G.openUp(tw));assert.strictEqual(G.upSel(),tw);assert.ok(G.S.paused);assert.match(els.upPanel.innerHTML,/טווח/);assert.match(els.upPanel.innerHTML,/גודל מחסנית/);assert.match(els.upPanel.innerHTML,/₪120/);
 G.closeUp();assert.strictEqual(G.upSel(),null);assert.ok(!G.S.paused);
 for(let w=1;w<=3;w++)quickWave(G);G.startWave();const u=us(G)[0];assert.ok(!G.openUp(u));assert.ok(!G.upgrade(u,'range'))});

test('A2 coalition sale price = (cost + upgrades) × 1.5; upgrades survive save/load; old saves load without upgrades',()=>{seed(4);const st=memStorage();let {G}=boot(st);G.newGame('normal');G.S.budget=9000;
 assert.ok(G.placeTower('dome',34.80,32.12));const tw=G.S.towers[0];G.upgrade(tw,'range');G.upgrade(tw,'range');const spent=G.upSpent(tw);assert.strictEqual(spent,60+105);
 assert.ok(G.placeTower('dome',35.0,31.6));const plain=G.S.towers[1];G.upgrade(plain,'hit');
 for(let w=1;w<=3;w++)quickWave(G);quickWave(G);G.S.inWave=false;
 assert.ok(G.saveGame());({G}=boot(st));assert.ok(G.loadGame());const t2=G.S.towers.find(t=>!t.owner&&t.up&&t.up.range===2);assert.ok(t2,'upgrades loaded');assert.strictEqual(G.upSpent(t2),165);
 G.S.offer={country:'us',type:'dome',price:225,per:75,n:3,wave:G.S.wave};assert.ok(G.coalition.accept());assert.ok(G.coalition.sell(t2));
 const pay=G.coalition.payments().slice(-1)[0];assert.strictEqual(pay.total,Math.round((150+165)*1.5));assert.strictEqual(pay.per,Math.round(pay.total/3));assert.ok(t2.owner==='us'&&t2.up.range===2,'keeps its upgrades over there');
 // an old save (towers without the upgrade field)
 const old=JSON.parse(st.getItem('magenShamayim.save.v3'));old.towers=old.towers.map(r=>r.slice(0,6));st.setItem('magenShamayim.save.v3',JSON.stringify(old));({G}=boot(st));assert.ok(G.loadGame());assert.ok(G.S.towers.every(t=>!G.upTotal(t)))});

test('A3 Al Asad (Iraq) + Al Udeid (Qatar) at wave 4; 2 carriers (Gulf, off Israel) at wave 6 with SM-6; Iran/Yemen can hit them',()=>{seed(9);const {G,els}=boot();G.newGame('normal');
 for(let w=1;w<=3;w++)quickWave(G);G.startWave();const on=()=>G.S.cbases.filter(b=>b.on).map(b=>b.key).sort().join(',');
 assert.strictEqual(on(),'asad,dhafra,muwaffaq,navy,sultan,udeid');assert.ok(!G.S.towers.some(t=>t.type==='sm6'));
 const def=G.COALITION[0].bases;assert.strictEqual(def.find(b=>b.key==='asad').cn,'עיראק');assert.strictEqual(def.find(b=>b.key==='udeid').cn,'קטאר');
 G.S.queue=[];G.S.threats=[];G.step(.1);quickWave(G);assert.strictEqual(G.S.wave,5);assert.ok(!G.S.cbases.find(b=>b.key==='cvnGulf').on);
 G.startWave();assert.strictEqual(G.S.wave,6);const cv=G.S.cbases.filter(b=>b.carrier);assert.strictEqual(cv.length,2);assert.ok(cv.every(b=>b.on&&b.ship));
 assert.match(els.banner.textContent,/נושאות מטוסים/);for(const b of cv){const t=G.S.towers.filter(t=>t.base===b.key);assert.strictEqual(t.length,2);assert.ok(t.every(x=>x.type==='sm6'))}
 const gulf=cv.find(b=>b.key==='cvnGulf'),med=cv.find(b=>b.key==='cvnMed');const LL=G.COALITION[0].bases;
 assert.ok(LL.find(b=>b.key==='cvnGulf').lon>50&&LL.find(b=>b.key==='cvnGulf').lat<29.5,'Persian Gulf');assert.ok(LL.find(b=>b.key==='cvnMed').lon<34.4&&LL.find(b=>b.key==='cvnMed').lat>31.5,'east Med off Israel');
 assert.ok(!G.canPlace(LL.find(b=>b.key==='cvnMed').lon,LL.find(b=>b.key==='cvnMed').lat),'at sea, not in Israel');
 // targetable like bases
 assert.ok(gulf.wIR>0&&gulf.wYE>0&&med.wIR>0);G.hitTarget(med);assert.strictEqual(G.capAt(med,G.effW()),0,'struck carrier is out');
 const t=G.S.towers.find(x=>x.base==='cvnMed');const f=t.fired||0;const th=G.threat('ballistic',med.x+150,med.y,med.x,med.y);for(let i=0;i<60*2;i++)G.update(1/60);assert.strictEqual(t.fired||0,f,'out of action')});

test('A3 an old v4 save past wave 4 gets the new bases on load, and the carriers on wave 6',()=>{seed(6);const st=memStorage();let {G}=boot(st);G.newGame('normal');for(let w=1;w<=4;w++)quickWave(G);G.S.inWave=false;assert.ok(G.saveGame());
 const v=JSON.parse(st.getItem('magenShamayim.save.v3'));v.towers=v.towers.filter(r=>r[4]!=='asad'&&r[4]!=='udeid').map(r=>r.slice(0,6));v.cbases=v.cbases.filter(r=>r[0]!=='asad'&&r[0]!=='udeid'&&!/^cvn/.test(r[0])).map(r=>r.slice(0,3));st.setItem('magenShamayim.save.v3',JSON.stringify(v));
 ({G}=boot(st));assert.ok(G.loadGame());assert.strictEqual(us(G).length,12,'old save: 4 old + 2 new bases');assert.ok(G.S.cbases.find(b=>b.key==='asad').on);
 quickWave(G);quickWave(G);assert.strictEqual(G.S.wave,6);assert.strictEqual(us(G).length,16,'+2 carriers × 2 SM-6')});

test('A how-to lines for magazines, upgrades and the new US forces at the top of the TD intro',()=>{const h=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');
 const ul=h.slice(h.indexOf('<ul>'),h.indexOf('</ul>'));const items=ul.split('<li').slice(1).filter(x=>!/^ class="v[67]"/.test(x)).slice(0,3).join(' ');/* v6 lines now come first */assert.match(items,/טוען…/);assert.match(items,/שדרוג/);assert.match(items,/נושאות מטוסים/);assert.match(items,/עין אל-אסד/);assert.ok(h.includes('id="upPanel"'))});
