// v0.2 regression: runs the real game.js headlessly in Node (DOM/canvas stubbed) and plays waves 1-8.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const vm=require('vm');
const S_DIR=path.join(__dirname,'..','site');
function stub(){const store={};const f=function(){return p};const p=new Proxy(f,{get(t,k){if(k in store)return store[k];if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;if(k==='children')return [];if(k==='offsetParent')return null;return p},set(t,k,v){store[k]=v;return true}});return p}
function boot(){const els={};const win={innerWidth:844,innerHeight:390,devicePixelRatio:1,addEventListener(){},Math,console,JSON,Map,Set,Array,Object,Number,String,Infinity,NaN,parseInt,parseFloat,isFinite};
  win.window=win;win.document={getElementById:id=>els[id]||(els[id]=stub()),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){},hidden:false};
  win.Path2D=function(){return stub()};win.Image=function(){return stub()};win.performance={now:()=>0};win.requestAnimationFrame=()=>0;win.setTimeout=()=>0;win.clearTimeout=()=>{};
  const ctx=vm.createContext(win);vm.runInContext(fs.readFileSync(path.join(S_DIR,'geo.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(S_DIR,'game.js'),'utf8'),ctx);return {G:win.GAME,els}}
const SPOTS={dome:[[34.82,32.05],[35.0,32.7],[34.82,31.3],[34.95,29.65],[35.15,31.78],[34.95,32.45]],beam:[[34.8,31.85],[35.08,32.88]],sling:[[34.95,31.95],[34.85,31.5]],arrow:[[34.95,31.65],[35.05,32.35]]};
function place(G,type,i){const [lo,la]=SPOTS[type][i];G.S.budget+=1000;assert.ok(G.placeTower(type,lo,la),'placed '+type);}
function eligible(G,tw,th){const T=G.TW[tw.type];if(th.dead)return false;if(tw.owner&&G.coalition){const b=G.coalition.cbaseOf(tw);if(b&&G.capAt(b,G.effW())<=0)return false} /* v4: a struck coalition base is out of service */const d=Math.hypot(tw.x-th.x,tw.y-th.y);if(d>T.range)return false;
  if(tw.type==='beam')return !th.beamed&&!!T.dwell[th.type]&&th.alt<=T.altMax;
  const pk=T.pk[th.type];if(!pk)return false;const ceil=th.type==='ballistic'&&T.altBal?T.altBal:T.altMax;if(ceil!==undefined&&th.alt>ceil)return false;
  if(T.altMin!==undefined&&(th.alt<T.altMin||th.s/th.len>.93))return false;return th.eng<(pk<.5?2:1)}
function runWave(G){G.startWave();const w=G.S.wave;const before=new Map(G.S.towers.map(t=>[t,t.fired||0]));let t=0;let threatTime=0;const idle=new Map();let maxIdle=0,worst='';
  while(G.S.inWave&&!G.S.over&&t<400){G.step(1/30);t+=1/30;if(G.S.threats.length)threatTime+=1/30;
    for(const tw of G.S.towers){const ready=tw.cd<=0&&(tw.ammo>0)&&!tw.tgt;const opp=ready&&G.S.threats.some(th=>eligible(G,tw,th));const n=opp?(idle.get(tw)||0)+1:0;idle.set(tw,n);if(n>maxIdle){maxIdle=n;worst=tw.type}}}
  return {w,threatTime,maxIdleSec:maxIdle/30,worst,fired:G.S.towers.map(x=>({type:x.type,n:(x.fired||0)-(before.get(x)||0)}))}}

test('batteries keep firing through waves 4-8 (with jets bought and with the budget spent to ₪0)',()=>{
  for(const scenario of ['jets','broke']){
    const {G}=boot();Math.random=(()=>{let x=42;return()=>{x=(x*16807)%2147483647;return x/2147483647}})();
    place(G,'dome',0);place(G,'dome',1);place(G,'beam',0);runWave(G);
    place(G,'dome',2);place(G,'sling',0);runWave(G);
    place(G,'arrow',0);place(G,'dome',3);runWave(G);
    G.openAir();G.S.budget+=2000;assert.ok(G.buyJet('f15'));assert.ok(G.buyJet('f35'));
    let beamShots=0;
    for(let w=4;w<=8;w++){
      // keep cities alive for the test so all 8 waves run; firing is what is under test
      for(const c of G.S.cities){c.hp=5;c.dead=false}
      if(scenario==='broke')G.S.budget=0;
      const r=runWave(G);assert.ok(r.threatTime>5,'wave '+w+' had threats');
      assert.ok(r.maxIdleSec<=0.2,scenario+': a '+r.worst+' battery sat ready with a target in range for '+r.maxIdleSec.toFixed(2)+'s in wave '+w);
      for(const type of ['dome','sling','arrow'])assert.ok(r.fired.filter(f=>f.type===type).reduce((a,f)=>a+f.n,0)>0,scenario+': '+type+' fired in wave '+w);
      beamShots+=r.fired.filter(f=>f.type==='beam').reduce((a,f)=>a+f.n,0);
      assert.ok(G.S.jets.some(j=>j.alive)||w>4,'jets flying');
    }
    assert.ok(beamShots>0,'laser fired in waves 4-8');
  }
});

test('Pardes Hanna and the two air bases exist; bases dormant until wave 4, then targetable',()=>{
  const {G}=boot();const names=G.S.cities.map(c=>c.n);assert.ok(names.includes('פרדס חנה'));assert.equal(names.length,6);
  const B=G.bases();assert.deepEqual(B.map(b=>b.n),['רמת דוד','נבטים']);assert.ok(B.every(b=>!b.active));
  // Ramat David NE of Haifa and east of Jerusalem; Nevatim between Be'er Sheva and Eilat
  const city=n=>G.S.cities.find(c=>c.n===n);const rd=B[0],nv=B[1];
  assert.ok(rd.x>city('ירושלים').x&&rd.y<city('חיפה').y,'Ramat David position');assert.ok(nv.y>city('באר שבע').y&&nv.y<city('אילת').y,'Nevatim position');
  assert.equal(G.buyJet('f15'),null,'no jets before the bases wake');
  G.S.budget+=5000;for(let w=1;w<=3;w++){G.startWave();G.S.queue=[];G.S.threats=[];G.step(.1)}
  assert.ok(B.every(b=>b.active),'bases wake when the air force unlocks');
  const j=G.buyJet('f15');assert.ok(j&&j.base.n==='רמת דוד'&&Math.hypot(j.x-rd.x,j.y-rd.y)<1,'F-15 takes off from Ramat David');
  const j2=G.buyJet('f35');assert.ok(j2&&j2.base.n==='נבטים','F-35 takes off from Nevatim');
  G.startWave();let aimed=0;for(let i=0;i<120*30&&G.S.inWave;i++){G.step(1/30);for(const t of G.S.threats)if(t.city.kind==='base')aimed++}
  assert.ok(aimed>0,'threats aim at the bases from wave 4');
  for(let k=0;k<5;k++)G.hitTarget(rd);assert.ok(rd.dead,'base destroyed after 5 hits');
  assert.ok(G.S.jets.every(j=>j.base!==rd),'no jet uses a destroyed base');
  for(let k=0;k<5;k++)G.hitTarget(nv);G.S.budget+=5000;assert.equal(G.buyJet('f15'),null,'no launches with both bases gone');
});

test('5 hits per city; a destroyed city stays and stops being a target; game over only when all cities are gone',()=>{
  const {G}=boot();const cs=G.S.cities;assert.ok(cs.every(c=>c.hp===5));
  for(let k=0;k<4;k++)G.hitTarget(cs[0]);assert.equal(cs[0].hp,1);assert.ok(!cs[0].dead);
  G.hitTarget(cs[0]);assert.ok(cs[0].dead);assert.ok(!G.S.over,'game continues after one city falls');assert.ok(G.S.cities.includes(cs[0]),'ruins stay on the map');
  G.startWave();for(let i=0;i<60*30&&G.S.inWave;i++){G.step(1/30);for(const t of G.S.threats)assert.notEqual(t.city,cs[0],'no new threat aims at a destroyed city')}
  for(const c of cs.slice(1,5))for(let k=0;k<5;k++)G.hitTarget(c);assert.ok(!G.S.over,'one city left');
  for(let k=0;k<5;k++)G.hitTarget(cs[5]);assert.ok(G.S.over&&!G.S.won,'game over when all cities are destroyed');
});
