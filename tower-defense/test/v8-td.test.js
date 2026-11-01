// v8 (מגן שמיים): radar in friendly countries + defenses around it, surprise rocket salvos, Sa'ar 6, national interceptor stock + Rafael factory, US airlift.
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


test('v8 1 radar: anywhere in Israel, Saudi Arabia, the UAE or near a US base; not Iran, Iraq, Syria, Jordan, Egypt, Yemen',()=>{const {G}=boot();G.newGame('normal');G.S.budget=99999;G.v6.RADAR.max=99;
 for(const [n,lo,la] of [['Riyadh',46.7,24.7],['Tabuk',36.6,28.4],['Abu Dhabi',54.4,24.4],['near Al Asad',42.6,33.6],['near Al Udeid',51.3,25.3],['Tel Aviv',34.8,32.0]])assert.ok(G.v6.placeRadar(lo,la),'radar ok in '+n);
 for(const [n,lo,la] of [['Tehran',51.4,35.7],['Baghdad',44.37,33.31],['Damascus',36.29,33.51],['Amman',35.93,31.95],['Cairo',31.2,30.0],['Sanaa',44.2,15.35],['Gaza',34.45,31.5]])assert.ok(!G.v6.placeRadar(lo,la),'no radar in '+n)});

test('v8 1 defenses within 120 km of a living friendly radar, even outside Israel; none once it is destroyed (old ones stay) until repaired',()=>{const {G}=boot();G.newGame('normal');G.S.budget=99999;
 assert.ok(!G.placeTower('dome',46.9,24.9),'no Iron Dome in Saudi without a radar');
 assert.ok(G.v6.placeRadar(46.7,24.7),'radar at Riyadh');
 assert.ok(G.placeTower('dome',46.9,24.9),'Iron Dome in Saudi near the radar');
 for(const t of ['beam','sling','arrow'])assert.ok(G.placeTower(t,46.7+0.3*['beam','sling','arrow'].indexOf(t),25.4),t+' near the radar');
 assert.ok(!G.placeTower('dome',49.0,24.7),'beyond 120 km: no');
 const r=G.S.radars[0];r.dead=true;const n=G.S.towers.length;
 assert.ok(!G.placeTower('dome',46.5,24.4),'radar down: no new battery there');assert.strictEqual(G.S.towers.length,n,'old ones stay');
 assert.ok(G.v6.repairRadar(r));assert.ok(G.placeTower('dome',46.5,24.4),'repaired: allowed again');
 assert.ok(G.placeTower('dome',34.8,32.0),'Israel still fine');
 // a radar's ring that crosses into Iraq/Jordan counts (the radar itself stands on friendly ground)
 assert.ok(G.v6.placeRadar(36.6,28.4));assert.ok(G.placeTower('dome',36.0,29.2),'Jordan side of a Tabuk radar ring')});

test('v8 1 how-to line for the radar sits at the top of the intro list',()=>{const h=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');const i=h.indexOf('class="v8"');assert.ok(i>0);assert.ok(i<h.indexOf('class="v7"'));assert.ok(h.includes('מכ״ם במדינות ידידותיות'))});

test('v8 2 surprise salvos: chance by wave (none in wave 1, ~35% from wave 2, more later), 8-25 rockets, never the same source twice in a row',()=>{const {G}=boot();seed(7);G.newGame('normal');const V=G.v8;
 assert.strictEqual(V.salvoP(1),0);assert.ok(Math.abs(V.salvoP(2)-.35)<1e-9);assert.ok(V.salvoP(15)>V.salvoP(5)&&V.salvoP(40)<=.55);
 let hits=0;for(let i=0;i<400;i++)if(V.surpriseSalvo(3).s)hits++;assert.ok(hits>100&&hits<180,'about 35%: '+hits);
 let last=null;const seen=new Set();for(let n=2;n<=30;n++){const {s,q}=V.surpriseSalvo(n,true);assert.ok(s.key!==last,'no repeat');last=s.key;seen.add(s.key);
   assert.ok(q.length>=8&&q.length<=25,'count '+q.length);assert.ok(q.every(e=>e.type==='rocket'&&e.salvo===s.key))}
 assert.deepStrictEqual([...seen].sort(),['gaza','jordan','lebanon','syria'])});

test('v8 2 a salvo in a real wave: warning banner ~3 s before, rockets come from the source and are real threats; saved source survives a reload',()=>{const st=memStorage();const {G,els}=boot(st);seed(3);G.newGame('normal');
 let tries=0;do{G.S.salvoLast=null;tries++;if(G.S.inWave){G.S.queue=[];G.S.threats=[];G.step(.1)}G.startWave()}while(!G.S.salvo&&tries<30);assert.ok(G.S.salvo,'a salvo came within 30 waves');
 const s=G.S.salvo,src=G.v8.SALVO.src.find(x=>x.key===s.key);assert.ok(G.S.queue.filter(e=>e.salvo).length===s.n,'all rockets survive the launcher pass');
 G.S.queue=G.S.queue.filter(e=>e.salvo);G.step(Math.max(0,s.t0-3.2));assert.ok(!s.warned);G.step(.5);assert.ok(s.warned,'warned before the salvo');assert.ok(String(els.banner.textContent).includes('מטח פתע מ'+src.n));
 assert.strictEqual(G.S.threats.length,0,'no rocket yet');G.step(3.5);const th=G.S.threats.filter(t=>t.salvo===s.key);assert.ok(th.length>0,'rockets in the air');const o=G.P(src.lon,src.lat);assert.ok(th.every(t=>Math.hypot(t.sx-o.x,t.sy-o.y)<30));
 const key=s.key;G.S.queue=[];G.S.threats=[];G.step(.1);assert.ok(!G.S.inWave);G.saveGame();const {G:G2}=boot(st);G2.continueGame();assert.strictEqual(G2.S.salvoLast,key)});

test('v8 3 Sa\'ar 6: ₪900, max 2, sea only (Mediterranean off Israel, Gulf of Eilat, Red Sea); fires like a battery',()=>{const {G}=boot();seed(5);G.newGame('normal');G.S.budget=99999;const T=G.TW.saar;
 assert.strictEqual(T.cost,900);assert.strictEqual(T.max,2);
 for(const [n,lo,la] of [['Tel Aviv (land)',34.8,32.08],['Jerusalem',35.2,31.78],['Persian Gulf',51,27],['Cyprus side, far',32.5,35.5],['Riyadh',46.7,24.7]])assert.ok(!G.placeTower('saar',lo,la),'no ship at '+n);
 assert.ok(G.v8.atSea(34.3,32.3)&&G.v8.atSea(34.93,29.3)&&G.v8.atSea(36,26),'Med, Gulf of Eilat, Red Sea are sea');
 assert.ok(G.placeTower('saar',34.4,32.3),'off Tel Aviv');assert.ok(G.placeTower('saar',36,26),'Red Sea');assert.ok(!G.placeTower('saar',34.2,32.6),'max 2');
 assert.ok(!G.placeTower('dome',34.4,32.6),'a land battery is not placed at sea');
 const s=G.S.towers[0];assert.strictEqual(s.kind,'ship');const th=G.spawnThreat?null:null;
 G.startWave();G.S.queue=[];G.S.threats=[];const o=G.P(34.6,32.3);const c=G.S.cities[0];G.S.threats.push({type:'cruise',sx:o.x-300,sy:o.y,tx:c.x,ty:c.y,city:c,s:250,len:400,spd:1,alt:.3,x:o.x-40,y:o.y,vx:0,vy:0,eng:0,trail:[],wob:0,dead:false,det:true});
 const a0=s.ammo;G.step(1.5);assert.ok(s.ammo<a0,'the ship fired')});

test('v8 3 a cruise missile can hit the ship: it stops firing, tap → repair (₪400); state survives a reload',()=>{const st=memStorage();const {G}=boot(st);seed(8);G.newGame('normal');G.S.budget=99999;
 assert.ok(G.placeTower('saar',34.4,32.3));const s=G.S.towers[0];assert.ok(G.v8.asTargets().includes(s),'Iran can aim at it');
 let got=false;for(let i=0;i<40&&!got;i++){G.S.wave=4;const q=G.buildWave(5);got=q.some(e=>e.radar)}assert.ok(got,'a cruise missile is planned at it');
 G.hitTarget(s,{type:'cruise'});assert.ok(s.dead);G.startWave();G.S.queue=[];G.S.threats=[];const o=G.P(34.6,32.3),c=G.S.cities[0];G.S.threats.push({type:'cruise',sx:o.x-300,sy:o.y,tx:c.x,ty:c.y,city:c,s:250,len:400,spd:1,alt:.3,x:o.x-40,y:o.y,vx:0,vy:0,eng:0,trail:[],wob:0,dead:false,det:true});
 G.step(1);assert.strictEqual(s.ammo,0,'a hit ship does not fire');G.S.queue=[];G.S.threats=[];G.step(.1);G.saveGame();
 const {G:G2}=boot(st);G2.continueGame();const s2=G2.S.towers[0];assert.ok(s2.dead&&s2.kind==='ship','still hit after reload');const b=G2.S.budget;assert.ok(G2.v8.repairShip(s2));assert.strictEqual(G2.S.budget,b-400);assert.ok(!s2.dead&&s2.ammo>0)});

test('v8 3 how-to + button',()=>{const h=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');assert.ok(h.includes('data-t="saar"'));assert.ok(/class="v8">🚢/.test(h))});

test('v8 4 national stock: each family starts full-ish; a magazine reload draws from it; empty → no reload ("אין מלאי"); laser needs none; coalition batteries untouched',()=>{const {G}=boot();seed(4);G.newGame('normal');G.S.budget=99999;const V=G.v8;
 assert.deepStrictEqual(Object.keys(G.S.stock).sort(),['arrow','barak','dome','sling']);assert.strictEqual(V.famOf({type:'beam'}),null);assert.strictEqual(V.famOf({type:'thaad',owner:'us'}),null);
 assert.ok(G.placeTower('dome',34.82,32.05));const tw=G.S.towers[0];G.startWave();G.S.queue=[{t:9999,type:'drone',li:0}];G.S.threats=[];
 const s0=G.S.stock.dome;tw.ammo=0;tw.refT=0;G.step(G.TW.dome.refill+.2);assert.strictEqual(tw.ammo,G.TW.dome.mag,'reloaded');assert.strictEqual(G.S.stock.dome,s0-G.TW.dome.mag,'from the national stock');
 G.S.stock.dome=7;tw.ammo=0;tw.refT=0;G.step(G.TW.dome.refill+.2);assert.strictEqual(tw.ammo,7,'partial reload from what is left');assert.strictEqual(G.S.stock.dome,0);
 tw.ammo=0;tw.refT=0;G.step(G.TW.dome.refill+1);assert.strictEqual(tw.ammo,0,'empty family: no reload');assert.ok(tw.noStock)});

test('v8 4 Rafael factory: refills between waves up to the cap; 3 upgrade levels raise production and cap; saved',()=>{const st=memStorage();const {G}=boot(st);seed(9);G.newGame('normal');G.S.budget=99999;const V=G.v8,F=V.STOCK.factory;
 G.startWave();G.S.queue=[];G.S.threats=[];G.S.stock.dome=0;G.S.stock.arrow=0;G.step(.1);assert.ok(!G.S.inWave);
 assert.strictEqual(G.S.stock.dome,V.stockProd('dome'));assert.strictEqual(G.S.stock.arrow,V.stockProd('arrow'));assert.ok(G.S.eco.made.dome>0,'shown in the end-of-wave summary');
 const p0=V.stockProd('dome'),c0=V.stockCap('dome');const b=G.S.budget;assert.ok(V.factoryUpgrade());assert.strictEqual(G.S.budget,b-F.cost[0]);assert.ok(V.stockProd('dome')>p0&&V.stockCap('dome')>c0);
 assert.ok(V.factoryUpgrade()&&V.factoryUpgrade());assert.ok(!V.factoryUpgrade(),'max 3');assert.strictEqual(G.S.factory,3);assert.strictEqual(V.stockProd('dome'),Math.round(V.STOCK.fam.dome.prod*(1+3*F.k)));
 G.S.stock.dome=V.stockCap('dome')-5;G.startWave();G.S.queue=[];G.S.threats=[];G.step(.1);assert.strictEqual(G.S.stock.dome,V.stockCap('dome'),'never above the cap');
 G.S.stock.sling=33;G.saveGame();const {G:G2}=boot(st);G2.continueGame();assert.strictEqual(G2.S.factory,3);assert.strictEqual(G2.S.stock.sling,33)});

test('v8 4 an old (v7) save loads with default stocks and no factory',()=>{const st=memStorage();const {G}=boot(st);G.newGame('normal');G.startWave();G.S.queue=[];G.S.threats=[];G.step(.1);G.saveGame();
 const k=[...st._m.keys()].find(k=>{try{return JSON.parse(st._m.get(k)).v===3}catch(e){return false}});const v=JSON.parse(st._m.get(k));delete v.v8;st.setItem(k,JSON.stringify(v));
 const {G:G2}=boot(st);G2.continueGame();assert.strictEqual(G2.S.wave,1);assert.strictEqual(G2.S.factory,0);assert.strictEqual(G2.S.stock.dome,G2.v8.STOCK.fam.dome.start);assert.strictEqual(G2.S.airlift,0)});

test('v8 4 HUD stock button + panel with factory upgrade; low-stock warning',()=>{const {G,els}=boot();G.newGame('normal');G.updateUI&&G.updateUI();const h=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');assert.ok(h.includes('id="btnStock"')&&h.includes('id="stockTxt"'));
 G.v8.openStock();assert.ok(String(els.v6Panel.innerHTML).includes('מפעל רפאל'));assert.ok(String(els.v6Panel.innerHTML).includes('data-v6="factory"'));G.v6.closeV6();
 assert.ok(G.placeTower('dome',34.82,32.05));const tw=G.S.towers[0];G.startWave();G.S.queue=[{t:9999,type:'drone',li:0}];G.S.threats=[];G.S.stock.dome=25;tw.ammo=0;tw.refT=0;G.step(G.TW.dome.refill+.2);assert.ok(String(els.hint.textContent).includes('נמוך'),'low-stock warning')});

test('v8 5 US airlift: once per game, any time: all stocks to max, every magazine full, C-17 + toast; saved',()=>{const st=memStorage();const {G,els}=boot(st);seed(2);G.newGame('normal');G.S.budget=99999;const V=G.v8;
 assert.ok(G.placeTower('dome',34.82,32.05)&&G.placeTower('arrow',35.0,31.6));G.startWave();for(const k in G.S.stock)G.S.stock[k]=1;for(const t of G.S.towers)t.ammo=0;
 assert.ok(V.airlift(),'during a wave');for(const k in G.S.stock)assert.strictEqual(G.S.stock[k],V.stockCap(k));for(const t of G.S.towers)assert.strictEqual(t.ammo,G.eff.mag(t));
 assert.ok(G.S.c17,'C-17 animation');assert.ok(String(els.banner.textContent).includes('רכבת אווירית'));assert.ok(!V.airlift(),'only once');
 G.S.queue=[];G.S.threats=[];G.step(.1);G.saveGame();const {G:G2}=boot(st);G2.continueGame();assert.strictEqual(G2.S.airlift,1);assert.ok(!G2.v8.airlift(),'still used after reload');
 const {G:G3}=boot();G3.newGame('normal');assert.strictEqual(G3.S.airlift,0,'a new game gets a new airlift');assert.ok(!G3.S.inWave);assert.ok(G3.v8.airlift(),'between waves too')});

test('v8 how-to lines for every v8 item at the TOP of the intro',()=>{const h=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');const ul=h.slice(h.indexOf('<ul>'),h.indexOf('</ul>'));const items=ul.split('<li').slice(1,6);
 assert.ok(items.every(x=>/^ class="v8"/.test(x)));const t=items.join(' ');for(const re of [/מדינות ידידותיות/,/מטחי פתע/,/סע״ר 6/,/מלאי מיירטים ארצי/,/רכבת אווירית/])assert.match(t,re)});
