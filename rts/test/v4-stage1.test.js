// v4 stage 1: shared money pool with manual transfers (both directions, no auto-take), context-sensitive order buttons,
// "what it attacks" info and the invalid-attack warning.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const vm=require('vm');
const PROJ=fs.existsSync(path.join(__dirname,'..','site','rts'));
const S_DIR=PROJ?path.join(__dirname,'..','site'):path.join(__dirname,'..','..','tower-defense','site'),RTS_DIR=PROJ?path.join(S_DIR,'rts'):path.join(__dirname,'..');
const D=require(path.join(RTS_DIR,'js','data.js'));globalThis.LF={data:D};const Sim=require(path.join(RTS_DIR,'js','sim.js'));
const SH=require(path.join(S_DIR,'shared.js'));const U=D.UNITS;
function fresh(){SH.useStorage(SH.memoryStorage());SH.reset();return SH}

test('transfer amounts: 25% / 50% / all / custom (capped at the source balance)',()=>{
 assert.strictEqual(SH.amountFor('25',1000),250);assert.strictEqual(SH.amountFor('50',1001),500);assert.strictEqual(SH.amountFor('all',777),777);
 assert.strictEqual(SH.amountFor('custom',500,'120'),120);assert.strictEqual(SH.amountFor('custom',500,'9000'),500);assert.strictEqual(SH.amountFor('custom',500,'-5'),0);assert.strictEqual(SH.amountFor('custom',500,'abc'),0);
 assert.strictEqual(SH.amountFor('all',0),0)});

test('transfer both directions between a game wallet and the shared pool',()=>{fresh();let td=900,rts=3500;const tdW={get:()=>td,set:v=>{td=v}},rtsW={get:()=>rts,set:v=>{rts=v}};
 SH.addBudget(400,'גל 1');assert.strictEqual(SH.budget(),400);
 // TD → pool (25% of 900)
 assert.strictEqual(SH.transfer('out',SH.amountFor('25',td),tdW,'מגן שמיים'),225);assert.strictEqual(td,675);assert.strictEqual(SH.budget(),625);
 // pool → RTS (50% of pool)
 assert.strictEqual(SH.transfer('in',SH.amountFor('50',SH.budget()),rtsW,'חזית לבנון'),312);assert.strictEqual(rts,3812);assert.strictEqual(SH.budget(),313);
 // RTS → pool (custom 1000), pool → TD (all)
 assert.strictEqual(SH.transfer('out',1000,rtsW,'חזית לבנון'),1000);assert.strictEqual(rts,2812);assert.strictEqual(SH.budget(),1313);
 assert.strictEqual(SH.transfer('in',SH.amountFor('all',SH.budget()),tdW,'מגן שמיים'),1313);assert.strictEqual(td,1988);assert.strictEqual(SH.budget(),0);
 // can't move more than you have, nothing from an empty pool
 assert.strictEqual(SH.transfer('out',99999,tdW),1988);assert.strictEqual(td,0);assert.strictEqual(SH.transfer('in',50,tdW),50);
 SH.withdraw(SH.budget());assert.strictEqual(SH.transfer('in',50,tdW),0);assert.strictEqual(SH.transfer('out',10,{get:()=>0,set:()=>{}}),0);
 assert.ok(SH.load().log.some(l=>/מגן שמיים/.test(l.text)),'logged')});

test('no automatic take: the RTS never pulls the pool on start / return, and old saves keep their pool',()=>{
 const main=fs.readFileSync(path.join(RTS_DIR,'js','main.js'),'utf8');assert.ok(!/takeBudget\s*\(/.test(main),'main.js does not call takeBudget');assert.ok(!/takeWarBudget\s*\(/.test(main));
 assert.ok(/TRANSFER\.open/.test(main)&&/id="xfer"/.test(fs.readFileSync(path.join(RTS_DIR,'index.html'),'utf8')),'RTS has the transfer button');
 const td=fs.readFileSync(path.join(S_DIR,'game.js'),'utf8'),tdh=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');assert.ok(/TRANSFER\.open/.test(td)&&/id="btnXfer"/.test(tdh)&&/transfer\.js/.test(tdh));
 // an old v1 save with a budget keeps it in the pool
 const st=SH.memoryStorage();st.setItem(SH.KEY,JSON.stringify({v:1,budget:850,earnedTotal:850,captured:['tyre'],fronts:{},log:[]}));SH.useStorage(st);
 assert.strictEqual(SH.budget(),850);assert.deepStrictEqual(SH.captured(),['tyre']);let w=0;SH.transfer('in',SH.amountFor('50',SH.budget()),{get:()=>w,set:v=>{w=v}});assert.strictEqual(w,425)});

function stub(){const store={};const f=function(){return p};const p=new Proxy(f,{get(t,k){if(k in store)return store[k];if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;if(k==='children')return [];if(k==='offsetParent')return null;return p},set(t,k,v){store[k]=v;return true}});return p}
function bootTD(storage){const els={};const win={innerWidth:844,innerHeight:390,devicePixelRatio:1,addEventListener(){},Math,console,JSON,Map,Set,Array,Object,Number,String,Date,Infinity,NaN,parseInt,parseFloat,isFinite};
 win.window=win;win.localStorage=storage;win.document={getElementById:id=>els[id]||(els[id]=stub()),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){},hidden:false};
 win.Path2D=function(){return stub()};win.Image=function(){return stub()};win.performance={now:()=>0};win.requestAnimationFrame=()=>0;win.setTimeout=()=>0;win.clearTimeout=()=>{};
 const ctx=vm.createContext(win);for(const f of ['geo.js','shared.js','game.js'])vm.runInContext(fs.readFileSync(path.join(S_DIR,f),'utf8'),ctx);return {G:win.GAME,SHARED:win.SHARED}}
test('TD: wave bonuses still accrue to the shared pool, and the TD wallet can send / pull',()=>{const st=SH.memoryStorage();const {G,SHARED}=bootTD(st);G.newGame('normal');
 const b0=G.S.budget;G.startWave();G.S.queue=[];G.S.threats=[];G.step(.1);assert.ok(!G.S.inWave);const pool=SHARED.budget();assert.ok(pool>=250,'bonus in pool: '+pool);assert.ok(G.S.budget>b0,'TD keeps its own bonus too');
 const w={get:()=>G.S.budget,set:v=>{G.S.budget=v}};const before=G.S.budget;assert.strictEqual(SHARED.transfer('out',100,w),100);assert.strictEqual(G.S.budget,before-100);assert.strictEqual(SHARED.budget(),pool+100);
 assert.strictEqual(SHARED.transfer('in',SHARED.amountFor('all',SHARED.budget()),w),pool+100);assert.strictEqual(SHARED.budget(),0)});

test('context buttons: only what fits the selected unit types (union for mixed)',()=>{const s=Sim.make(3,'normal');const mk=t=>Sim.makeUnit(s,t,'il',30,100);
 const has=(u,a)=>Sim.actionsFor(u).has(a);const eng=mk('engineer'),gol=mk('golani'),uav=mk('uav_recon'),nam=mk('namer'),mer=mk('merkava'),heli=mk('heli');
 for(const u of [eng,gol,uav,nam,mer])for(const a of ['stop','group','split'])assert.ok(has([u],a),a+' always');
 assert.ok(has([eng],'blow')&&has([eng],'build'));assert.ok(!has([gol],'blow')&&!has([gol],'build')&&!has([mer],'blow'),'no engineer buttons without engineers');
 assert.ok(has([uav],'route')&&has([heli],'route')&&!has([gol],'route')&&!has([mer],'route'));
 assert.ok(has([nam],'unload')&&has([nam],'load')&&has([heli],'unload')&&!has([mer],'unload')&&!has([gol],'unload'));
 const mix=Sim.actionsFor([eng,uav]);assert.ok(mix.has('blow')&&mix.has('route')&&mix.has('build')&&!mix.has('unload'),'union');
 assert.deepStrictEqual([...Sim.actionsFor([mer])].sort(),['group','split','stop'])});

test('what each unit attacks: recon UAV only drones; every unit type has an info line; invalid targets detected',()=>{
 assert.ok(!Sim.canDamage('uav_recon','hz_inf')&&Sim.canDamage('uav_recon','drone'),'recon UAV');assert.ok(Sim.canDamage('uav_attack','hz_inf')&&!Sim.canDamage('uav_attack','drone'));
 assert.ok(!Sim.canDamage('truck','hz_inf')&&Sim.canDamage('jet','hz_village')&&Sim.canDamage('merkava','hz_tank')&&!Sim.canDamage('hz_aa','golani'));
 assert.ok(Sim.canDamage('golani','hz_launcher'),'launchers are light targets');
 for(const t of Object.keys(U)){const line=Sim.attacksText(t);assert.ok(line.startsWith('🎯'),t+': '+line)}
 assert.match(Sim.attacksText('uav_recon'),/תוקף: רחפנים/);assert.match(Sim.attacksText('uav_recon'),/לא: חי״ר/);assert.match(Sim.attacksText('truck'),/לא תוקף/);
 const main=fs.readFileSync(path.join(RTS_DIR,'js','main.js'),'utf8');assert.ok(/(warnAttack|attackPlan)\(sel,target\)/.test(main)&&/attackInfo/.test(main))});
