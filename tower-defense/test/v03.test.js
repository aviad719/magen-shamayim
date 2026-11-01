// v0.3 tests: Judea & Samaria + Golan placeable, strike recovery (out → 50% → full), specialised launch sites, difficulty, save/continue, personal best.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const vm=require('vm');
const S_DIR=path.join(__dirname,'..','site');
function stub(){const store={};const f=function(){return p};const p=new Proxy(f,{get(t,k){if(k in store)return store[k];if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;if(k==='children')return [];if(k==='offsetParent')return null;return p},set(t,k,v){store[k]=v;return true}});return p}
function memStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
function boot(storage){const els={};const win={innerWidth:844,innerHeight:390,devicePixelRatio:1,addEventListener(){},Math,console,JSON,Map,Set,Array,Object,Number,String,Date,Infinity,NaN,parseInt,parseFloat,isFinite};
  win.window=win;win.localStorage=storage||memStorage();win.document={getElementById:id=>els[id]||(els[id]=stub()),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){},hidden:false};
  win.Path2D=function(){return stub()};win.Image=function(){return stub()};win.performance={now:()=>0};win.requestAnimationFrame=()=>0;win.setTimeout=()=>0;win.clearTimeout=()=>{};
  const ctx=vm.createContext(win);vm.runInContext(fs.readFileSync(path.join(S_DIR,'geo.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(S_DIR,'game.js'),'utf8'),ctx);if(win.GAME.v8){win.GAME.v8.SALVO.p0=0;win.GAME.v8.SALVO.pMax=0} /* v8: surprise salvos off for these composition checks */return {G:win.GAME,win}}
const seed=s=>{let x=s;Math.random=()=>{x=(x*16807)%2147483647;return x/2147483647}};
function quickWave(G){G.startWave();G.S.queue=[];G.S.threats=[];G.step(.1)}

test('Judea & Samaria and the Golan are placeable Israeli territory; Jordan, Syria and Sinai are not',()=>{
  const {G}=boot();G.newGame('normal');
  const IN={'אריאל':[35.17,32.10],'שכם':[35.26,32.22],'חברון':[35.10,31.53],'בקעת הירדן':[35.50,32.00],'יריחו/מעלה אדומים':[35.40,31.82],'גוש עציון':[35.12,31.65],'קצרין (גולן)':[35.69,32.99],'תל אביב':[34.80,32.08]};
  for(const [n,[lo,la]] of Object.entries(IN)){assert.ok(G.inIsrael(lo,la),n+' counts as Israel');G.S.budget+=1000;assert.ok(G.placeTower('dome',lo,la),'battery placed at '+n)}
  const OUT={'עמאן':[35.93,31.95],'דמשק':[36.29,33.51],'סיני':[33.8,30.3]};
  for(const [n,[lo,la]] of Object.entries(OUT))assert.ok(!G.inIsrael(lo,la),n+' is not Israel');
  // no separate West Bank outline: the PSE shape is Gaza only, Israel is one merged ring
  const geo=JSON.parse(fs.readFileSync(path.join(S_DIR,'geo.js'),'utf8').replace(/^window\.GEO=/,'').replace(/;\s*$/,''));
  const pse=geo.find(c=>c.iso==='PSE'),isr=geo.find(c=>c.iso==='ISR');assert.equal(pse.r.length,1);assert.ok(pse.r[0].every((v,i)=>i%2?v<31.7:v<34.6),'PSE ring is Gaza');assert.equal(isr.r.length,1);
});

test('13 specialised sites (10 Iran, 3 Yemen); each threat spawns only from a site that launches its type',()=>{
  const {G}=boot();seed(7);G.newGame('normal');const L=G.S.launchers;
  assert.equal(L.filter(l=>l.cc==='IR').length,10);assert.equal(L.filter(l=>l.cc==='YE').length,3);assert.equal(L.filter(l=>l.cc==='IQ').length,1,'v6: one Iraqi militia site (swarms)');
  for(const k of ['D','C','B']){assert.ok(L.some(l=>l.cc==='IR'&&l.kind===k),'Iran has '+k);assert.ok(L.some(l=>l.cc==='YE'&&l.kind===k),'Yemen has '+k)}
  /* v6: D sites also launch swarms, B sites also hypersonic + MIRV */assert.deepEqual([...G.LTYPES.D.makes],['drone','uav','swarm']);assert.deepEqual([...G.LTYPES.C.makes],['uav','cruise']);assert.deepEqual([...G.LTYPES.B.makes],['ballistic','cruise','hyper','mirv']);
  for(let n=1;n<=8;n++){G.S.wave=n-1;for(let r=0;r<5;r++)for(const e of G.buildWave(n)){if(e.lb)continue;/* v7: boss salvo rockets come from Lebanon */const l=L[e.li];assert.ok(G.LTYPES[l.kind].makes.includes(e.type),e.type+' from '+l.n+' ('+l.kind+') in wave '+n);if(n<4)assert.ok(l.cc==='IR'||(l.cc==='IQ'&&e.type==='swarm'),'no Yemen before wave 4');if(l.cc==='IQ'&&!e.boss)assert.equal(e.type,'swarm','Iraq: swarms only (outside boss salvos)')}}
  // live play: spawned threats come from matching sites
  G.S.wave=4;for(const c of G.S.cities){c.hp=99}G.startWave();let seen=0;for(let i=0;i<70*30&&G.S.inWave;i++){G.step(1/30);for(const t of G.S.threats){if(t.lb)continue;const l=L[t.from];assert.ok(G.LTYPES[l.kind].makes.includes(t.type));seen++}}assert.ok(seen>0);
});

test('air-strike recovery: out next wave → 50% the wave after → full; a re-strike resets it',()=>{
  const {G}=boot();seed(11);G.newGame('normal');const S=()=>G.S;
  for(let w=1;w<=3;w++)quickWave(G);G.S.budget+=5000;const j=G.buyJet('f35');assert.ok(j);
  const site=G.launcher('כרמאנשאה');assert.equal(site.kind,'B');assert.equal(G.capAt(site,4),1);
  // real strike between waves 3 and 4
  G.strike(j.id,'כרמאנשאה');for(let i=0;i<400*30&&site.struck<0;i++){G.step(1/30);G.S.sams.forEach(s=>s.alive=false)}assert.equal(site.struck,3,'strike landed after wave 3');
  assert.equal(G.capAt(site,4),0,'out in the next wave');assert.equal(G.capAt(site,5),.5,'50% the wave after');assert.equal(G.capAt(site,6),1,'full after that');
  assert.match(G.launcherInfo(site),/מושבת/);
  // wave plans: nothing from the site in wave 4; ~half its share in wave 5
  const share=(n,name)=>{let a=0,b=0;for(let r=0;r<300;r++)for(const e of G.buildWave(n)){if(e.lb)continue;const l=G.S.launchers[e.li];if(l.n===name)a++;if(l.n==='תבריז')b++}return a/b};
  assert.equal(share(4,'כרמאנשאה'),0);const half=share(5,'כרמאנשאה');assert.ok(half>.35&&half<.65,'about 50% in wave 5, got '+half.toFixed(2));const full=share(6,'כרמאנשאה');assert.ok(full>.8&&full<1.25,'full in wave 6, got '+full.toFixed(2));
  // play wave 4: no threat comes from the struck site; then wave 5 shows repairing
  for(const c of G.S.cities)c.hp=99;G.startWave();for(let i=0;i<120*30&&G.S.inWave;i++){G.step(1/30);for(const t of G.S.threats)if(!t.lb)assert.notEqual(G.S.launchers[t.from].n,'כרמאנשאה')}
  assert.equal(G.S.wave,4);assert.equal(G.capAt(site,G.effW()),.5);assert.match(G.launcherInfo(site),/50%/);
  // re-strike during wave 5 → fully out again in 5 (rest) and 6, 50% in 7
  G.startWave();site.struck=G.S.wave;assert.equal(G.capAt(site,5),0);assert.equal(G.capAt(site,6),0);assert.equal(G.capAt(site,7),.5);assert.equal(G.capAt(site,8),1);
});

test('difficulty scales wave size, budget and threat speed',()=>{
  const {G}=boot();const len={},bud={};
  for(const d of ['easy','normal','hard']){seed(3);G.newGame(d);bud[d]=G.S.budget;G.S.wave=7;let n=0;for(let r=0;r<20;r++)n+=G.buildWave(8).length;len[d]=n}
  assert.ok(bud.easy>bud.normal&&bud.normal>bud.hard,'budget '+JSON.stringify(bud));assert.ok(len.easy<len.normal&&len.normal<len.hard,'waves '+JSON.stringify(len));
  assert.ok(G.DIFF.easy.spd<1&&G.DIFF.hard.spd>1);
  G.newGame('hard');G.startWave();for(let i=0;i<10*30;i++)G.step(1/30);const t=G.S.threats[0];assert.ok(t&&t.spd>=G.TT[t.type].spd*.9*1.12-1e-9,'hard threats are faster');
});

test('progress saves at the end of each wave and continues after reload; best per difficulty is kept',()=>{
  const store=memStorage();let {G}=boot(store);seed(5);G.newGame('hard');G.S.budget+=2000;
  assert.ok(G.placeTower('arrow',35.17,32.10));assert.ok(G.placeTower('dome',35.10,31.53));quickWave(G);quickWave(G);
  G.launcher('איספהאן').struck=2;
  let sv=JSON.parse(store.getItem('magenShamayim.save.v3'));assert.equal(sv.wave,2);assert.equal(sv.diff,'hard');
  quickWave(G);G.launcher('איספהאן').struck=2;G.S.cities[1].hp=2; // end of wave 3 saves again (site strike after the save is not in it)
  G.S.inWave=false;G.saveGame();const score=G.S.score;assert.ok(score>0);
  // "reload": a fresh page on the same storage
  ({G}=boot(store));assert.ok(G.continueGame(),'continue works');assert.equal(G.S.wave,3);assert.equal(G.S.diff,'hard');assert.equal(G.S.towers.length,2);assert.equal(G.S.cities[1].hp,2);assert.equal(G.launcher('איספהאן').struck,2);assert.equal(G.S.score,score);
  const best=G.bestFor('hard');assert.ok(best.wave>=3&&best.score>0,'best saved '+JSON.stringify(best));assert.equal(G.bestFor('easy').wave,0);
  // game over clears the save, keeps the best
  for(const c of G.S.cities)for(let k=0;k<5;k++)G.hitTarget(c);assert.ok(G.S.over);assert.equal(store.getItem('magenShamayim.save.v3'),null);assert.ok(G.bestFor('hard').wave>=3);
  ({G}=boot(store));assert.equal(G.continueGame(),false,'nothing to continue after game over');
});
