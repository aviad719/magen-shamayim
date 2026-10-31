// v6 (מגן שמיים): new threats (drone swarm, hypersonic, MIRV), Air Force strike between waves, Green Pine radar, city economy + shelters, Saudi Arabia.
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
const steps=(G,sec)=>{for(let i=0;i<Math.round(sec*60);i++)G.update(1/60)};
const city=(G,n)=>G.S.cities.find(c=>c.n===n);

test('1 data: three new threats; only Arrow 60% / THAAD 40% / SM-6 30% can engage a hypersonic; MIRV and swarm have their own rows',()=>{const {G}=boot();const {TW,TT}=G;
 for(const k of ['swarm','hyper','mirv','rv'])assert.ok(TT[k]&&TT[k].n,k);
 assert.strictEqual(TW.arrow.pk.hyper,.6);assert.strictEqual(TW.thaad.pk.hyper,.4);assert.strictEqual(TW.sm6.pk.hyper,.3);
 for(const k of ['dome','sling','patriot'])assert.ok(!TW[k].pk.hyper,k+' cannot engage a hypersonic');assert.ok(!TW.beam.dwell.hyper);
 assert.ok(TW.beam.dwell.swarm<TW.beam.dwell.drone&&TW.dome.pk.swarm>=.9,'laser + Iron Dome best vs swarms');assert.ok(TW.arrow.waste.includes('swarm')&&TW.thaad.waste.includes('swarm'));
 assert.ok(TT.hyper.spd>TT.ballistic.spd*1.5,'very fast');assert.ok(TT.swarm.spd<TT.drone.spd,'slow')});

test('1 waves: swarms of 12-20 launched together from wave 3 (Iran / Iraq / Yemen), 1-2 hypersonic from wave 5 (Iran), MIRVs from wave 6',()=>{seed(3);const {G}=boot();G.newGame('normal');const L=G.S.launchers;const from=new Set();
 for(let n=1;n<=8;n++){G.S.wave=n-1;for(let r=0;r<6;r++){const q=G.buildWave(n);const sw={};
   for(const e of q){if(e.type==='swarm'){(sw[e.sw]=sw[e.sw]||[]).push(e);from.add(L[e.li].cc)}if(e.type==='hyper'||e.type==='mirv')assert.strictEqual(L[e.li].cc,'IR')}
   const hy=q.filter(e=>e.type==='hyper').length,mv=q.filter(e=>e.type==='mirv').length;
   if(n<3)assert.strictEqual(Object.keys(sw).length,0);else{assert.ok(Object.keys(sw).length>=1,'swarm in wave '+n);for(const k in sw){const g=sw[k];assert.ok(g.length>=12&&g.length<=20,'size '+g.length);
     assert.ok(Math.max(...g.map(e=>e.t))-Math.min(...g.map(e=>e.t))<=2.6,'launched together');assert.strictEqual(new Set(g.map(e=>e.li)).size,1,'one site')}}
   if(n<5)assert.strictEqual(hy,0);else assert.ok(hy>=1&&hy<=2,'hyper '+hy);if(n<6)assert.strictEqual(mv,0);else assert.ok(mv>=2)}}
 assert.ok(from.has('IR')&&from.has('IQ')&&from.has('YE'),'swarms from Iran, Iraq and Yemen: '+[...from])});

test('1 swarm: every drone of a swarm aims at the same city; a swarm drone hit is a quarter of a hit',()=>{seed(4);const {G}=boot();G.newGame('normal');G.S.wave=2;G.startWave();
 const q=G.S.queue.filter(e=>e.type==='swarm'&&e.sw===0);assert.ok(q.length>=12);for(const e of q)G.v6.spawn(e);const sw=G.S.threats.filter(t=>t.type==='swarm');
 assert.ok(sw.length>=12);assert.strictEqual(new Set(sw.map(t=>t.city.n)).size,1,'same target');
 const c=city(G,'חיפה');const hp=c.hp;G.hitTarget(c,{type:'swarm'});assert.strictEqual(c.hp,hp-.25)});

test('1 swarm: Arrow spends a round on a swarm drone only when nothing else is in reach, and the waste is counted',()=>{seed(5);const {G}=boot();G.newGame('normal');G.S.budget=5000;assert.ok(G.placeTower('arrow',35.0,31.6));const tw=G.S.towers[0];const ta=G.S.cities[0];
 const d=G.threat('swarm',tw.x+60,tw.y,ta.x,ta.y);d.spd=2;const b=G.threat('ballistic',tw.x+300,tw.y-200,ta.x,ta.y);b.s=b.len*.4;b.spd=5;
 G.update(1/60);assert.strictEqual(b.eng,1,'ballistic first');assert.strictEqual(d.eng,0);
 G.S.threats=[];G.S.shots=[];tw.cd=0;const d2=G.threat('swarm',tw.x+60,tw.y,ta.x,ta.y);d2.spd=2;const w0=G.S.stats.wasted||0;G.update(1/60);assert.strictEqual(d2.eng,1,'allowed when alone');assert.strictEqual(G.S.stats.wasted,w0+1);
 G.S.threats=[];G.S.shots=[];tw.cd=0;const far=G.threat('swarm',tw.x+300,tw.y,ta.x,ta.y);far.spd=2;G.update(1/60);assert.strictEqual(far.eng,0,'only close in (30% of range)')});

test('1 hypersonic: weaving path; Iron Dome and David\'s Sling never fire at it, Arrow does',()=>{seed(6);const {G}=boot();G.newGame('normal');G.S.budget=9000;const ta=G.S.cities[0];
 assert.ok(G.placeTower('dome',34.85,32.1));assert.ok(G.placeTower('sling',34.95,32.3));const h=G.threat('hyper',ta.x+400,ta.y-150,ta.x,ta.y);h.spd=8;
 h.s=h.len*.3;const p=G.v6.threatPos(h);const lx=h.sx+(h.tx-h.sx)*.3,ly=h.sy+(h.ty-h.sy)*.3;assert.ok(Math.hypot(p.x-lx,p.y-ly)>3,'maneuvering off the straight line');
 h.s=h.len*.75;steps(G,4);assert.strictEqual(G.S.towers[0].fired||0,0,'dome');assert.strictEqual(G.S.towers[1].fired||0,0,'sling');
 assert.ok(G.placeTower('arrow',35.0,31.6));G.S.threats=[];const h2=G.threat('hyper',ta.x+400,ta.y-150,ta.x,ta.y);h2.spd=8;h2.s=h2.len*.35;steps(G,2);assert.ok((G.S.towers[2].fired||0)>=1,'arrow engages')});

test('1 MIRV: one interceptor before the split; at 60% it becomes 3 warheads (3 targets)',()=>{seed(7);const {G}=boot();G.newGame('normal');const ta=G.S.cities[0];
 const m=G.threat('mirv',ta.x+500,ta.y-200,ta.x,ta.y);m.s=m.len*.59;m.spd=20;steps(G,.5);
 assert.ok(m.dead,'split');const rv=G.S.threats.filter(t=>t.type==='rv');assert.strictEqual(rv.length,3);assert.strictEqual(G.S.stats.splits,1);assert.ok(rv.every(t=>t.alt>.5),'warheads start high');
 G.S.threats=[];G.S.budget=5000;assert.ok(G.placeTower('arrow',35.0,31.6));const m2=G.threat('mirv',ta.x+500,ta.y-200,ta.x,ta.y);m2.spd=5;m2.s=m2.len*.3;
 const k0=G.S.stats.kills;let n=0;while(!m2.dead&&n++<60*20)G.update(1/60);if(G.S.stats.kills>k0)assert.strictEqual(G.S.threats.filter(t=>t.type==='rv').length,0,'killed before the split = no warheads');
 else assert.ok(G.S.threats.filter(t=>t.type==='rv').length===3)});

test('2 Air Force strike: between waves only, ₪800, one per break, cuts the next wave as listed',()=>{seed(8);const {G}=boot();G.newGame('normal');G.S.budget=5000;
 assert.ok(!G.v6.canStrike(),'not before wave 1');quickWave(G);assert.ok(G.v6.canStrike());const b=G.S.budget;
 const r=G.v6.strike('hodeidah');assert.ok(r);assert.strictEqual(G.S.budget,b-800);assert.ok(!G.v6.canStrike(),'one per break');assert.strictEqual(G.v6.strike('factory'),null);
 G.startWave();assert.ok(!G.v6.canStrike(),'not during a wave');G.S.queue=[];G.S.threats=[];G.step(.1);assert.ok(G.v6.canStrike(),'next break');
 // effect sizes on the wave they apply to
 G.S.iaf.mods=[{k:'launchers',from:6,to:6}];G.S.wave=5;seed(11);const bal=q=>q.filter(e=>!e.lb&&G.S.launchers[e.li].cc==='IR'&&(e.type==='ballistic'||e.type==='mirv')).length;const a=bal(G.buildWave(6));G.S.iaf.mods=[];seed(11);const b2=bal(G.buildWave(6));
 assert.strictEqual(a,b2-Math.round(b2*.25),'−25% ballistic: '+b2+'→'+a);
 const ye=q=>q.filter(e=>!e.lb&&G.S.launchers[e.li].cc==='YE').length;G.S.iaf.mods=[{k:'hodeidah',from:6,to:6}];seed(12);const y1=ye(G.buildWave(6));G.S.iaf.mods=[];seed(12);const y0=ye(G.buildWave(6));assert.strictEqual(y1,y0-Math.round(y0*.5),'−50% Houthi');
 const ir=q=>q.filter(e=>!e.lb&&G.S.launchers[e.li].cc==='IR'&&['ballistic','cruise','hyper','mirv'].includes(e.type)).length;G.S.iaf.mods=[{k:'factory',from:6,to:8}];
 for(const n of [6,7,8]){G.S.wave=n-1;seed(13);const x1=ir(G.buildWave(n));const save=G.S.iaf.mods;G.S.iaf.mods=[];seed(13);const x0=ir(G.buildWave(n));G.S.iaf.mods=save;assert.strictEqual(x1,x0-Math.round(x0*.15),'factory −15% in wave '+n)}
 G.S.wave=8;seed(13);assert.deepStrictEqual(Object.values(G.v6.iafMods(9)),[0,0,0,0],'expired after 3 waves');
});

test('2 Air Force strike: rockets −30%; 15% to lose a plane, it returns after 3 waves; no planes = no strike; saved',()=>{seed(9);const st=memStorage();let {G,win}=boot(st);G.newGame('normal');G.S.budget=9000;
 win.SHARED.launcherRockets=()=>10;win.SHARED.launchers=()=>3;G.S.iaf.mods=[{k:'hezbollah',from:2,to:2}];G.S.wave=1;assert.strictEqual(G.buildWave(2).filter(e=>e.lb).length,7,'10 → 7 rockets');G.S.iaf.mods=[];G.S.wave=0;
 quickWave(G);const R=Math.random;Math.random=()=>.05;const r=G.v6.strike('launchers');Math.random=R;assert.ok(r.lost);assert.strictEqual(G.v6.iafPlanes(),1);
 quickWave(G);Math.random=()=>.05;assert.ok(G.v6.strike('factory').lost);Math.random=R;assert.strictEqual(G.v6.iafPlanes(),0);quickWave(G);assert.ok(!G.v6.canStrike(),'no planes');assert.strictEqual(G.v6.strike('factory'),null);
 assert.ok(G.saveGame());({G}=boot(st));assert.ok(G.loadGame());assert.strictEqual(G.v6.iafPlanes(),0,'losses survive save/load');assert.ok(G.S.iaf.mods.length>=1);
 quickWave(G);assert.strictEqual(G.v6.iafPlanes(),1,'first plane back 3 waves after it was lost');quickWave(G);assert.strictEqual(G.v6.iafPlanes(),2);
 // the result toast fires when the raid animation lands
 Math.random=()=>.9;const r2=G.v6.strike('hezbollah');Math.random=R;assert.ok(r2&&!r2.lost);assert.match(r2.msg,/התקיפה הצליחה/);assert.match(r2.msg,/חזרו בשלום/);steps(G,3);assert.strictEqual(G.S.fx.filter(f=>!f.done).length,0)});

test('3 Green Pine radar: ₪600, max 3, Israel only; +20% range for own batteries in reach; ring/panel on tap',()=>{seed(10);const {G,els}=boot();G.newGame('normal');G.S.budget=9000;
 assert.ok(G.placeTower('dome',34.82,32.05));const tw=G.S.towers[0];const r0=G.eff.range(tw);const b=G.S.budget;
 assert.ok(!G.v6.placeRadar(36.5,31.5),'not in Jordan');assert.ok(G.v6.placeRadar(34.9,31.95));assert.strictEqual(G.S.budget,b-600);
 assert.ok(Math.abs(G.eff.range(tw)-r0*1.2)<1e-9,'+20%');const far=G.S.towers[G.S.towers.push({type:'dome',x:G.P(34.95,29.6).x,y:G.P(34.95,29.6).y,ammo:20,cd:0,refT:0})-1];assert.strictEqual(G.eff.range(far),G.TW.dome.range,'Eilat is out of reach');
 assert.ok(G.v6.placeRadar(35.0,32.8));assert.ok(G.v6.placeRadar(34.8,31.25));assert.ok(!G.v6.placeRadar(35.2,31.7),'max 3');assert.strictEqual(G.S.radars.length,3);
 G.camTo('israel',true);G.v6.tap(35.0,32.8);assert.ok(G.v6.v6Sel()&&G.v6.v6Sel().kind==='radar','tap opens the radar card');assert.ok(G.S.paused);G.v6.closeV6();assert.ok(!G.S.paused)});

test('3 radar: a cruise missile is sent at it; destroyed → bonus lost until repaired for ₪300; tracking range',()=>{seed(14);const {G}=boot();G.newGame('normal');G.S.budget=9000;
 assert.ok(G.placeTower('dome',34.82,32.05));const tw=G.S.towers[0];assert.ok(G.v6.placeRadar(34.9,31.95));const r=G.S.radars[0];
 let n=0;for(let k=0;k<40;k++){G.S.wave=4;if(G.buildWave(5).some(e=>e.radar))n++}assert.ok(n>8&&n<36,'occasionally ('+n+'/40)');
 G.S.wave=4;G.startWave();G.S.queue=[];const e={t:0,type:'cruise',li:G.S.launchers.findIndex(l=>l.kind==='C'),radar:true};G.v6.spawn(e);const th=G.S.threats.find(t=>t.atRadar);assert.ok(th&&th.city===r,'aimed at the radar');
 G.hitTarget(r);assert.ok(r.dead);assert.strictEqual(G.eff.range(tw),G.TW.dome.range,'bonus gone');const b=G.S.budget;assert.ok(G.v6.repairRadar(r));assert.strictEqual(G.S.budget,b-300);assert.ok(!r.dead&&G.eff.range(tw)>G.TW.dome.range);
 // tracking: without a radar own batteries ignore what is beyond DET0 of every city; a radar extends it
 G.S.threats=[];const ta=G.S.cities[0];const far={x:ta.x+G.v6.DET0+80,y:ta.y};const t1=G.threat('ballistic',far.x,far.y,ta.x,ta.y);r.dead=true;assert.ok(!G.v6.detects(t1));r.dead=false;assert.ok(G.v6.detects(t1),'radar sees further')});

test('4 city economy: income by size at the end of a wave; a hit cuts 20% for 2 waves (stacking, floor 0); shelters halve damage and cut',()=>{seed(15);const st=memStorage();let {G,win}=boot(st);G.newGame('normal');
 const inc=n=>G.v6.cityIncome(city(G,n));assert.deepStrictEqual(['תל אביב','חיפה','ירושלים','באר שבע','אילת','פרדס חנה'].map(inc),[120,80,80,50,30,30]);
 const b=G.S.budget;quickWave(G);assert.strictEqual(G.S.eco.cities,390);assert.strictEqual(G.S.budget-b,G.S.eco.total);assert.strictEqual(G.S.eco.pool,250,'the shared war pool still gets the classic bonus');assert.ok(win.SHARED.budget()>=250);
 const ta=city(G,'תל אביב');G.hitTarget(ta);assert.strictEqual(inc('תל אביב'),96);G.hitTarget(ta);assert.strictEqual(inc('תל אביב'),72,'stacks');
 quickWave(G);assert.strictEqual(G.S.eco.rows.find(r=>r.n==='תל אביב').v,72);assert.strictEqual(inc('תל אביב'),72,'still cut next wave');quickWave(G);assert.strictEqual(inc('תל אביב'),120,'back after 2 waves');
 for(let i=0;i<4;i++)G.hitTarget(city(G,'חיפה'));assert.strictEqual(inc('חיפה'),16);G.hitTarget(city(G,'חיפה'));assert.strictEqual(inc('חיפה'),0,'dead city pays 0');
 G.S.budget=1000;const j=city(G,'ירושלים');assert.ok(G.v6.buildShelter(j));assert.strictEqual(G.S.budget,700);assert.ok(!G.v6.buildShelter(j),'once');G.hitTarget(j);assert.strictEqual(j.hp,4.5,'half damage');assert.strictEqual(inc('ירושלים'),72,'half the cut (10%)');
 G.camTo('israel',true);G.v6.tap(35.21,31.77);assert.ok(G.v6.v6Sel()&&G.v6.v6Sel().kind==='city','tap a city opens its card');G.v6.closeV6();
 assert.ok(G.saveGame());({G}=boot(st));assert.ok(G.loadGame());const j2=city(G,'ירושלים');assert.ok(j2.shelter);assert.strictEqual(j2.hp,4.5);assert.strictEqual(G.v6.cityIncome(j2),72,'cuts survive save/load')});

test('4 old saves (pre-v6) load: no radars, full strike fleet, no shelters, no cuts',()=>{seed(16);const st=memStorage();let {G}=boot(st);G.newGame('normal');for(let w=1;w<=3;w++)quickWave(G);assert.ok(G.saveGame());
 const v=JSON.parse(st.getItem('magenShamayim.save.v3'));delete v.radars;delete v.iaf;v.cities=v.cities.map(c=>c.slice(0,2));v.launchers=v.launchers.slice(0,13);st.setItem('magenShamayim.save.v3',JSON.stringify(v));
 ({G}=boot(st));assert.ok(G.loadGame());assert.strictEqual(G.S.wave,3);assert.strictEqual(G.S.radars.length,0);assert.strictEqual(G.v6.iafPlanes(),2);assert.ok(G.S.cities.every(c=>!c.shelter&&c.cuts.length===0));
 quickWave(G);assert.ok(G.S.eco&&G.S.eco.cities>0)});

test('5 Saudi Arabia joins at wave 5: Patriots at Jizan and Tabuk, Houthi launches first, Houthis can hit them, purchase requests',()=>{seed(17);const {G}=boot();G.newGame('normal');G.S.budget=9000;G.placeTower('dome',34.80,32.12);G.placeTower('sling',34.95,31.95);
 const sa=G.COALITION.find(c=>c.key==='sa');assert.ok(sa&&sa.join===5&&sa.prio==='YE');
 for(let w=1;w<=4;w++){quickWave(G);if(G.coalition.offer())G.coalition.decline()}assert.ok(!G.S.towers.some(t=>t.owner==='sa'));
 G.startWave();assert.ok(G.S.coal.sa&&G.S.coal.sa.joined);const bat=G.S.towers.filter(t=>t.owner==='sa');assert.strictEqual(bat.length,2);assert.ok(bat.every(t=>t.type==='patriot'));
 assert.strictEqual(bat.map(t=>t.base).sort().join(','),'jizan,tabuk');assert.ok(G.S.cbases.filter(b=>b.country==='sa').every(b=>b.wYE>0),'Houthis aim at them');
 // priority: a Houthi drone and an Iranian drone both in range → the Houthi one first
 G.S.queue=[];G.S.threats=[];const tb=bat.find(t=>t.base==='tabuk');tb.cd=0;const ye=G.S.launchers.findIndex(l=>l.cc==='YE'),ir=G.S.launchers.findIndex(l=>l.cc==='IR');const ta=G.S.cities[0];
 const a=G.threat('uav',tb.x+20,tb.y,ta.x,ta.y);a.from=ir;a.spd=1;const h=G.threat('uav',tb.x+60,tb.y,ta.x,ta.y);h.from=ye;h.spd=1;G.update(1/60);assert.strictEqual(h.eng,1,'Houthi first');assert.strictEqual(a.eng,0);
 G.S.threats=[];G.step(.1);const offers=[];for(let w=6;w<=7;w++){if(G.S.inWave){G.S.queue=[];G.S.threats=[];G.step(.1)}else quickWave(G);const o=G.coalition.offer();if(o){offers.push(w+':'+o.country);G.coalition.decline()}}
 assert.ok(offers.some(x=>/:sa$/.test(x)),'Saudi asks to buy: '+offers.join(' '))});

test('how-to lines for every v6 item at the TOP of the intro; new buttons and panels exist',()=>{const h=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');
 const ul=h.slice(h.indexOf('<ul>'),h.indexOf('</ul>'));const items=ul.split('<li').slice(1,8);assert.ok(items.every(x=>/^ class="v6"/.test(x)),'first 7 are v6');const t=items.join(' ');
 for(const re of [/נחיל/,/היפרסוני/,/מתפצל/,/תקיפת ח״א/,/אורן ירוק/,/מרחבים מוגנים/,/ערב הסעודית/,/₪800/,/₪600/,/₪300/])assert.match(t,re);
 for(const id of ['btnIaf','ecoPanel','v6Panel','radarCnt'])assert.ok(h.includes('id="'+id+'"'),id);assert.ok(h.includes('data-t="radar"'));assert.match(h,/מקרא איומים/)});

test('balance: a scripted player still wins normal (3 seeds), city money keeps total income similar or higher',()=>{const {play}=require('./td-bot.js');let won=0;
 for(const s of [1,2,3]){const r=play(S_DIR,'normal',s,false);if(r.won)won++;assert.ok(r.cities>=3,'seed '+s+' cities '+r.cities)}assert.strictEqual(won,3)});
