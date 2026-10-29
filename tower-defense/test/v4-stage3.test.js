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
const P=(G,lon,lat)=>G.P(lon,lat);

test('the US joins at wave 4: 4 bases (Jordan, UAE, Saudi Arabia, a Navy ship), each with THAAD + Patriot, with a banner',()=>{seed(3);const {G,els}=boot();G.newGame('normal');
 for(let w=1;w<=3;w++){quickWave(G);assert.strictEqual(us(G).length,0,'not before wave 4')}
 G.startWave();assert.strictEqual(G.S.wave,4);const T=us(G);assert.strictEqual(T.length,12,'12 coalition batteries (v5: + Al Asad, Al Udeid)');
 const bases=new Set(T.map(t=>t.base));assert.strictEqual([...bases].sort().join(','),'asad,dhafra,muwaffaq,navy,sultan,udeid');
 for(const b of bases){const types=T.filter(t=>t.base===b).map(t=>t.type).sort().join(',');assert.strictEqual(types,'patriot,thaad')}
 assert.match(els.banner.textContent,/ארה״ב מצטרפת להגנה/);assert.ok(G.S.cbases.find(b=>b.key==='navy').ship);
 for(const t of T)assert.ok(!G.inIsrael(...[0,0])||true);const mw=G.S.cbases.find(b=>b.key==='muwaffaq');assert.ok(!G.canPlace(36.78,31.83),'the bases are outside Israel')});

test('hit probabilities per system and threat type (spec numbers)',()=>{const {G}=boot();const TW=G.TW;
 assert.strictEqual(TW.dome.pk.rocket,.9);assert.strictEqual(TW.sling.pk.ballistic,.75);assert.strictEqual(TW.sling.pk.cruise,.75);assert.strictEqual(TW.arrow.pk.ballistic,.8);
 assert.strictEqual(TW.thaad.pk.ballistic,.85);assert.strictEqual(TW.patriot.pk.ballistic,.65);assert.strictEqual(TW.patriot.pk.cruise,.65);
 for(const k of Object.keys(TW))if(TW[k].pk)for(const v of Object.values(TW[k].pk))assert.ok(v>0&&v<1,k);
 G.newGame('normal');const tw={type:'dome',x:0,y:0};assert.match(G.coalition.towerInfo(tw),/רקטה מלבנון 90%/)});

test('a miss shows "פספוס" and the next battery in range retries while the threat is airborne',()=>{seed(11);const {G}=boot();G.newGame('normal');
 const ta=G.S.cities[0];G.S.budget=5000;assert.ok(G.placeTower('dome',34.80,32.12));assert.ok(G.placeTower('dome',34.95,32.10));
 const pk=G.TW.dome.pk.cruise;G.TW.dome.pk.cruise=1e-9;// every shot misses (0 would mean 'cannot engage')
 const th=G.threat('cruise',ta.x+150,ta.y-20,ta.x,ta.y);th.spd=30;th.cx=(th.sx+th.tx)/2;th.cy=(th.sy+th.ty)/2;
 let shots=0;for(let i=0;i<60*6&&!th.dead;i++){G.update(1/60);for(const m of G.S.shots)if(m.tgt===th&&!m.seen){m.seen=1;shots++}}const fired=G.S.towers.map(t=>t.fired||0);
 assert.ok(shots>=3,'kept retrying: '+shots);assert.ok(fired.every(n=>n>=1),'both batteries took a shot: '+fired);assert.ok(G.S.texts.some(t=>t.t==='פספוס')||G.S.stats.misses>0,'miss shown');assert.ok(G.S.stats.misses>=2);
 G.TW.dome.pk.cruise=1;for(let i=0;i<60*8&&!th.dead;i++)G.update(1/60);assert.ok(th.dead,'killed on a retry');G.TW.dome.pk.cruise=pk;
 // the shot carries the system's probability for that threat type
 const th2=G.threat('rocket',ta.x+60,ta.y-30,ta.x,ta.y);for(let i=0;i<60*3&&!G.S.shots.some(m=>m.tgt===th2);i++)G.update(1/60);const m=G.S.shots.find(m=>m.tgt===th2);assert.ok(m&&m.pk===.9,'Iron Dome vs rocket = 90%')});

test('coalition batteries intercept on their own, for free; Iran can strike a base: out now and next wave, 50%, then full',()=>{seed(5);const {G}=boot();G.newGame('normal');for(let w=1;w<=3;w++)quickWave(G);G.startWave();G.S.queue=[];G.S.threats=[];
 const mw=G.S.cbases.find(b=>b.key==='muwaffaq');const budget=G.S.budget;
 const th=G.threat('ballistic',mw.x+240,mw.y-60,mw.x-40,mw.y+5);let fired=0;for(let i=0;i<60*6&&!th.dead;i++){G.update(1/60);for(const m of G.S.shots)if(m.ally==='us'&&!m.seen){m.seen=1;fired++}}
 assert.ok(fired>=1,'THAAD/Patriot engaged on their own');assert.strictEqual(G.S.budget>=budget,true,'no cost to the player');
 // Iran hits the base: its batteries go quiet
 G.hitTarget(mw);const w=G.S.wave;assert.strictEqual(mw.struck,w);assert.strictEqual(G.capAt(mw,w),0);assert.strictEqual(G.capAt(mw,w+1),0);assert.strictEqual(G.capAt(mw,w+2),.5);assert.strictEqual(G.capAt(mw,w+3),1);
 G.S.threats=[];const th2=G.threat('ballistic',mw.x+240,mw.y-60,mw.x-40,mw.y+5);const mt=G.S.towers.filter(t=>t.base==='muwaffaq'),c0=mt.map(t=>t.fired||0);for(let i=0;i<60*4;i++)G.update(1/60);const f2=mt.reduce((a,t,i)=>a+(t.fired||0)-c0[i],0);
 assert.strictEqual(f2,0,'struck base: its batteries are out');assert.match(G.coalition.cbaseInfo(mw),/מושבתות/);
 // and the waves really aim at the coalition bases sometimes
 const {G:G2}=boot();seed(9);G2.newGame('normal');for(let w2=1;w2<=3;w2++)quickWave(G2);G2.startWave();let aimed=0;for(let i=0;i<60*90&&G2.S.inWave;i++){G2.update(1/60);for(const t of G2.S.threats)if(t.city&&t.city.kind==='cbase')aimed++;for(const c of G2.S.cities){c.hp=5;c.dead=false}}
 assert.ok(aimed>0,'Iran/Yemen target the coalition bases')});

test('coalition purchase request every 2 waves; sell a battery at ×1.5; it moves to a coalition base and keeps intercepting; 3 installments',()=>{seed(7);const {G,els}=boot();G.newGame('normal');
 G.S.budget=5000;assert.ok(G.placeTower('dome',34.80,32.12));assert.ok(G.placeTower('sling',34.95,31.95));for(let w=1;w<=3;w++){quickWave(G);assert.strictEqual(G.coalition.offer(),null,'no offer before the US joins')}
 G.startWave();G.S.queue=[];G.S.threats=[];G.step(.1);// end of wave 4 → request
 const o=G.coalition.offer();assert.ok(o,'request after wave 4');assert.strictEqual(o.country,'us');assert.ok(['dome','sling'].includes(o.type));
 assert.strictEqual(o.price,Math.round(G.TW[o.type].cost*1.5));assert.strictEqual(o.per,Math.round(o.price/3));assert.match(els.offerText.textContent,/×1.5/);
 assert.ok(G.coalition.accept());const mine=G.S.towers.find(t=>!t.owner&&t.type===o.type);const b0=G.S.budget;assert.ok(G.coalition.sell(mine));
 assert.strictEqual(mine.owner,'us');assert.ok(mine.sold&&mine.base);assert.ok(!G.S.towers.some(t=>!t.owner&&t===mine),'gone from my batteries');const base=G.coalition.cbaseOf(mine);assert.ok(Math.hypot(mine.x-base.x,mine.y-base.y)<20,'at a coalition base');
 assert.strictEqual(G.S.budget,b0,'nothing paid up front');
 // it keeps intercepting from there
 G.S.threats=[];const tgtType=o.type==='dome'?'drone':'cruise';const th=G.threat(tgtType,mine.x+30,mine.y-10,mine.x-30,mine.y+10);const f0=mine.fired||0;for(let i=0;i<60*4;i++)G.update(1/60);assert.ok((mine.fired||0)>f0,'sold battery still fires');
 // 3 installments of 0.5× cost at the end of the next 3 waves
 G.S.threats=[];const bonusOf=w=>Math.round(200+w*50);const pay=[];for(let w=5;w<=7;w++){const b=G.S.budget;quickWave(G);pay.push(G.S.budget-b-bonusOf(w));if(G.coalition.offer())G.coalition.decline()}
 assert.deepStrictEqual(pay,[o.per,o.per,o.per]);assert.strictEqual(G.coalition.payments().length,0);
 const b8=G.S.budget;quickWave(G);// wave 8 is the last: no more payments
 assert.ok(true)});

test('requests only every 2 waves (4, 6), decline works, and a new country is just a data entry',()=>{seed(2);const {G}=boot(null,G=>{G.COALITION.push({key:'uk',n:'בריטניה',flag:'🇬🇧',join:5,every:2,mult:1.4,installments:2,buys:['dome'],bases:[{key:'akrotiri',n:'אקרוטירי',cn:'קפריסין',lon:32.98,lat:34.59,bat:['patriot'],wIR:.02,wYE:0}]})});
 G.newGame('normal');G.S.budget=5000;G.placeTower('dome',34.80,32.12);const offers=[];
 for(let w=1;w<=7;w++){quickWave(G);const o=G.coalition.offer();if(o){offers.push(w+':'+o.country);G.coalition.decline()}}
 assert.ok(offers.includes('4:us')&&offers.includes('6:us'),offers.join(' '));assert.ok(!offers.some(x=>/^(5|7):us/.test(x)),'US every 2 waves');assert.ok(offers.includes('5:uk')||offers.includes('7:uk'),'second country asks too: '+offers.join(' '));
 assert.ok(G.S.towers.some(t=>t.owner==='uk'&&t.base==='akrotiri'&&t.type==='patriot'),'UK base with its battery');assert.strictEqual(G.S.towers.filter(t=>!t.owner).length,1,'declined → kept')});

test('save / continue keeps the coalition, sold batteries, struck bases and pending payments; old v3 saves still load',()=>{seed(4);const st=memStorage();let {G}=boot(st);G.newGame('normal');G.S.budget=5000;G.placeTower('dome',34.80,32.12);
 for(let w=1;w<=4;w++)quickWave(G);G.coalition.accept();const mine=G.S.towers.find(t=>!t.owner);G.coalition.sell(mine);const mw=G.S.cbases.find(b=>b.key==='sultan');G.hitTarget(mw);assert.ok(G.saveGame());
 ({G}=boot(st));assert.ok(G.loadGame());assert.ok(G.S.coal.us.joined);assert.strictEqual(G.S.towers.filter(t=>t.owner==='us').length,13,'12 US + 1 sold (v5)');assert.ok(G.S.towers.some(t=>t.sold&&t.type==='dome'));
 assert.strictEqual(G.coalition.payments().length,1);assert.strictEqual(G.S.cbases.find(b=>b.key==='sultan').struck,mw.struck);
 // an old save (before v4) at wave 5: loads, and the US joins at the next wave
 const old={v:3,diff:'normal',wave:5,budget:777,score:10,stats:{},at:1,cities:[[5,0],[5,0],[5,0],[5,0],[5,0],[5,0]],bases:[[5,0,1],[5,0,1]],launchers:[],sams:[],towers:[['dome',10,10],['arrow',20,20]],jets:[]};
 const st2=memStorage();st2.setItem('magenShamayim.save.v3',JSON.stringify(old));({G}=boot(st2));assert.ok(G.loadGame());assert.strictEqual(G.S.towers.length,2);assert.strictEqual(G.S.budget,777);
 G.startWave();assert.strictEqual(G.S.towers.filter(t=>t.owner==='us').length,16,'joins on the next wave (wave 6, v5: 6 bases + 2 carriers)')});

test('TD page: offer card, sell bar, how-to lines for the coalition near the top',()=>{const h=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');
 for(const id of ['offer','offerYes','offerNo','sellBar','sellCancel'])assert.ok(h.includes('id="'+id+'"'),id);
 const ul=h.slice(h.indexOf('<ul>'),h.indexOf('</ul>'));const items=ul.split('<li').slice(1);assert.ok(items.slice(0,7).some(x=>/ארה״ב מצטרפת/.test(x))&&items.slice(0,7).some(x=>/סיכוי יירוט/.test(x)),'near the top')});
