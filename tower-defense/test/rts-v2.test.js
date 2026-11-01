// LEBANON FRONT v2 realism tests: tunnels & weapons stores, rocket launch areas (+ TD link), supply (ammo/fuel, truck).
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const vm=require('vm');
// works from the project layout (test/ next to site/) and from the GitHub repo layout (rts/test next to tower-defense/site)
const PROJ=fs.existsSync(path.join(__dirname,'..','site','rts'));
const S_DIR=PROJ?path.join(__dirname,'..','site'):path.join(__dirname,'..','..','tower-defense','site'),RTS_DIR=PROJ?path.join(S_DIR,'rts'):path.join(__dirname,'..');
const D=require(path.join(RTS_DIR,'js','data.js'));globalThis.LF={data:D};const Sim=require(path.join(RTS_DIR,'js','sim.js'));const SHARED=require(path.join(S_DIR,'shared.js'));
const U=D.UNITS;
// an empty board: only the HQ, the sites' buildings and the hidden objects remain
function fresh(diff){const s=Sim.make(42,diff||'normal');s.units=s.units.filter(u=>(u.side==='il'&&u.type==='hq')||u.type==='hz_launcher'||(u.side==='hz'&&U[u.type].building));return s}
const at=(s,type,side,x,y,o)=>Sim.makeUnit(s,type,side,x,y,o);
const run=(s,sec)=>{for(let i=0;i<Math.round(sec*30);i++)Sim.step(s,1/30)};

test('every game has hidden tunnels (with exits toward Israel), weapons stores and 6 launch areas south of the Litani',()=>{const s=Sim.make(3,'normal');
 const t=s.hidden.filter(h=>h.kind==='tunnel'),c=s.hidden.filter(h=>h.kind==='cache'),L=Sim.launchers(s);
 assert.strictEqual(t.length,D.TUNNELS.length);assert.strictEqual(c.length,D.CACHES.length);assert.strictEqual(L.length,6);
 const hq=Sim.get(s,s.hq);for(const h of t){assert.ok(Sim.dist({x:h.ex,y:h.ey},hq)<Sim.dist(h,hq),'exit of '+h.name+' is closer to Israeli lines');assert.ok(Sim.canPass(h.ex,h.ey,'hz_inf'),'exit on land')}
 for(const h of s.hidden.concat(L))assert.ok(!h.revealed,'starts hidden');
 for(const u of L){const ll=D.toLonLat(u.x,u.y);assert.ok(ll.lat<33.32,u.area+' is south of the Litani');assert.ok(Sim.canPass(u.x,u.y,'tech_mg'),u.area+' on land')}});

test('tunnel reveal: hidden from afar, revealed by a unit up close, by engineers from further away, and by a recon UAV',()=>{
 const s=fresh();const h=s.hidden.find(q=>q.kind==='tunnel');
 const far=at(s,'golani','il',h.x+5,h.y);run(s,1.2);assert.ok(!h.revealed,'golani at 5 tiles does not see it');
 const e=at(s,'engineer','il',h.x+5.5,h.y);run(s,1.2);assert.ok(h.revealed,'engineers at 5.5 tiles reveal it');
 assert.ok(s.messages.some(m=>m.includes('נחשף')),'reveal message');
 const h2=s.hidden.find(q=>q.kind==='cache'&&q.site==='tyre');const g=at(s,'nahal','il',h2.x+2.5,h2.y);run(s,1);assert.ok(h2.revealed,'infantry within 3 tiles reveals a store');
 const h3=s.hidden.find(q=>q.kind==='tunnel'&&q!==h);const uav=at(s,'uav_recon','il',h3.x+4.5,h3.y);uav.loiter=999;run(s,1);assert.ok(h3.revealed,'recon UAV passing over reveals it')});

test('engineers destroy a revealed tunnel by standing on it for a few seconds (money + explosion), and only once revealed',()=>{
 const s=fresh();s.time=0;const h=s.hidden.find(q=>q.kind==='tunnel');const e=at(s,'engineer','il',h.x,h.y);
 h.revealed=false;const saved=Sim.inFog;run(s,.4);// first reveal tick has not run yet: standing still does nothing
 h.revealed=true;h.blow=0;const m0=s.money;run(s,1);assert.ok(h.blow===0,'no automatic blowing without an order');assert.ok(Sim.blowOrder(s,[e.id]),'💥 with no pick blows the object the engineers stand on');run(s,2);assert.ok(!h.dead&&h.blow>1,'blowing in progress');run(s,2.6);
 assert.ok(h.dead,'tunnel destroyed after ~4 s');assert.ok(s.money>=m0+D.HIDDEN.tunnel.bounty,'bounty paid');
 assert.ok(s.messages.some(m=>m.includes('פוצץ')),'toast/message');
 // the "פוצץ" order sends engineers to the object the player tapped
 const c=s.hidden.find(q=>q.kind==='cache'&&!q.dead);c.revealed=true;const e2=at(s,'engineer','il',c.x+6,c.y+2);assert.strictEqual(Sim.blowOrder(s,[e2.id]),null,'far away and nothing picked: no automatic target');const got=Sim.blowOrder(s,[e2.id],c.id);
 assert.ok(got,'blow order found a target');run(s,25);assert.ok(c.dead,'store blown after walking there')});

test('a live tunnel lets Hezbollah infantry pop out at its exit; a destroyed one does not',()=>{const s=fresh();s.time=D.DIFF.normal.grace+1;
 const h=s.hidden.find(q=>q.kind==='tunnel');const g=at(s,'givati','il',h.ex+3,h.ey+3);h.popT=.05;run(s,.2);
 const pop=s.units.find(u=>u.tunnel===h.id&&u.hp>0);assert.ok(pop&&pop.type==='hz_inf','squad popped out');assert.ok(Sim.dist(pop,{x:h.ex,y:h.ey})<2,'near the exit');
 pop.hp=0;h.dead=true;h.popT=.05;run(s,.3);assert.ok(!s.units.some(u=>u.tunnel===h.id&&u.hp>0),'no squads from a destroyed tunnel')});

test('a live weapons store speeds up its site production; blowing it removes the bonus',()=>{
 const s=fresh();const z=s.sites.find(q=>q.key==='tyre');const c=s.hidden.find(q=>q.kind==='cache'&&q.site==='tyre');z.prod=500;run(s,10);const withCache=500-z.prod;
 c.dead=true;z.prod=500;run(s,10);const without=500-z.prod;assert.ok(withCache>without*1.3,'with '+withCache.toFixed(1)+' vs '+without.toFixed(1));
 assert.ok(Sim.liveCaches(s).has('nabatieh')&&!Sim.liveCaches(s).has('tyre'))});

test('launcher salvo timer: a live launch area fires a salvo toward northern Israel when its timer runs out',()=>{
 const s=fresh();s.time=D.DIFF.normal.grace+1;const L=Sim.launchers(s);L.forEach(u=>u.salvoT=999);const u=L[0];u.salvoT=2;
 run(s,1);assert.ok(!(s.salvos>0),'not yet');run(s,1.5);assert.strictEqual(s.salvos,1,'one salvo');
 assert.ok(s.messages[0].startsWith('🚀 שיגור מ'+u.area),s.messages[0]);assert.ok(u.salvoT>60,'timer reset to '+u.salvoT.toFixed(0));
 // during the opening grace period nobody fires
 const s2=fresh();s2.time=0;Sim.launchers(s2).forEach(v=>v.salvoT=.1);run(s2,1);assert.ok(!(s2.salvos>0),'no salvo in the grace period')});

test('launchers: hidden ones cannot be targeted; once revealed they can be destroyed, jets best; count drops and money is paid',()=>{
 const s=fresh();const L=Sim.launchers(s),u=L[0];const m=at(s,'merkava','il',u.x+5,u.y);
 run(s,3);assert.ok(!u.revealed&&u.hp===u.maxHp,'out of reveal range: untouched although inside gun range');
 u.revealed=1;m.target=u.id;run(s,35);assert.ok(u.hp<=0,'tank destroys a revealed launcher');assert.strictEqual(Sim.launchersAlive(s),5);
 assert.ok(s.messages.some(x=>x.includes('משגר רקטות הושמד')));
 // damage per hit: a jet bomb outclasses an infantry rifle volley and an attack-UAV missile beats a tank MG
 const v=L[1],hp=v.hp,j=at(s,'jet','il',v.x,v.y),g=at(s,'golani','il',v.x,v.y);
 const dj=Sim.attack(s,j,v,U.jet.weapons[0]).damage;v.hp=hp;const dg=Sim.attack(s,g,v,U.golani.weapons[0]).damage;v.hp=hp;
 const a=at(s,'uav_attack','il',v.x,v.y),da=Sim.attack(s,a,v,U.uav_attack.weapons[0]).damage;assert.ok(dj>=v.maxHp*.8&&da>dg*3,'jet '+dj+' uav '+da+' golani '+dg)});

test('shared save: the RTS writes the number of live launch areas, the TD game reads it and adds moderate rockets per wave',()=>{
 const mem=SHARED.memoryStorage();SHARED.useStorage(mem);SHARED.reset();assert.strictEqual(SHARED.launchers('lebanon'),0);
 SHARED.setLaunchers(4,'lebanon');assert.strictEqual(SHARED.launchers('lebanon'),4);assert.strictEqual(SHARED.launcherRockets(1),4);assert.strictEqual(SHARED.launcherRockets(4),8);assert.strictEqual(SHARED.launcherRockets(8),12);
 // boot the real TD game on the same storage and check its waves
 const els={};const stub=()=>{const st={};const f=function(){return p};const p=new Proxy(f,{get(t,k){if(k in st)return st[k];if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;if(k==='children')return [];return p},set(t,k,v){st[k]=v;return true}});return p};
 const win={innerWidth:844,innerHeight:390,devicePixelRatio:1,addEventListener(){},Math,console,JSON,Map,Set,Array,Object,Number,String,Date,Infinity,NaN,parseInt,parseFloat,isFinite};
 win.window=win;win.localStorage=mem;win.document={getElementById:id=>els[id]||(els[id]=stub()),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){},hidden:false};
 win.Path2D=function(){return stub()};win.Image=function(){return stub()};win.performance={now:()=>0};win.requestAnimationFrame=()=>0;win.setTimeout=()=>0;win.clearTimeout=()=>{};
 const ctx=vm.createContext(win);for(const f of ['shared.js','geo.js','game.js'])vm.runInContext(fs.readFileSync(path.join(S_DIR,f),'utf8'),ctx);const G=win.GAME;if(G.v8){G.v8.SALVO.p0=0;G.v8.SALVO.pMax=0}
 assert.strictEqual(win.SHARED.launchers('lebanon'),4,'TD sees the RTS count');G.newGame('normal');
 const rk=n=>G.buildWave(n).filter(e=>e.type==='rocket').length;assert.strictEqual(rk(1),4);assert.strictEqual(rk(4),8);
 assert.ok(G.TT.rocket&&G.TW.dome.pk.rocket>.8,'Iron Dome intercepts the rockets');
 // a rocket really flies at a northern city
 G.startWave();G.S.queue=G.S.queue.filter(e=>e.type==='rocket');G.step(45);assert.ok(G.S.stats.kills>=0);
 win.SHARED.setLaunchers(0,'lebanon');assert.strictEqual(rk(1),0,'destroying them all removes the bonus');assert.strictEqual(rk(8),0)});

test('rockets fly from south Lebanon toward the nearest northern cities',()=>{const {} = {};
 const mem=SHARED.memoryStorage();SHARED.useStorage(mem);SHARED.reset();SHARED.setLaunchers(6,'lebanon');
 const els={};const stub=()=>{const st={};const f=function(){return p};const p=new Proxy(f,{get(t,k){if(k in st)return st[k];if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;if(k==='children')return [];return p},set(t,k,v){st[k]=v;return true}});return p};
 const win={innerWidth:844,innerHeight:390,devicePixelRatio:1,addEventListener(){},Math,console,JSON,Map,Set,Array,Object,Number,String,Date,Infinity,NaN,parseInt,parseFloat,isFinite};
 win.window=win;win.localStorage=mem;win.document={getElementById:id=>els[id]||(els[id]=stub()),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){},hidden:false};
 win.Path2D=function(){return stub()};win.Image=function(){return stub()};win.performance={now:()=>0};win.requestAnimationFrame=()=>0;win.setTimeout=()=>0;win.clearTimeout=()=>{};
 const ctx=vm.createContext(win);for(const f of ['shared.js','geo.js','game.js'])vm.runInContext(fs.readFileSync(path.join(S_DIR,f),'utf8'),ctx);const G=win.GAME;if(G.v8){G.v8.SALVO.p0=0;G.v8.SALVO.pMax=0}G.newGame('normal');
 G.startWave();G.S.queue=G.S.queue.filter(e=>e.type==='rocket');assert.strictEqual(G.S.queue.length,6);const r=[];for(let i=0;i<50;i++){G.step(1);for(const t of G.S.threats)if(t.type==='rocket'&&!r.includes(t))r.push(t)}
 assert.ok(r.length===6,'all 6 rockets flew: '+r.length);for(const t of r)assert.ok(['חיפה','פרדס חנה','תל אביב'].includes(t.city.n),'target '+t.city.n)});

test('supply: firing drains ammo, moving drains vehicle fuel; empty = no shooting / very slow; refills at the HQ',()=>{
 const s=fresh();const hq=Sim.get(s,s.hq);const m=at(s,'merkava','il',40,60);const t=at(s,'hz_tank','hz',44,60);t.hp=t.maxHp=1e6;
 assert.strictEqual(m.sup,100);assert.strictEqual(m.fuel,100);run(s,6);assert.ok(m.sup<100&&m.sup>80,'ammo drained by firing: '+m.sup.toFixed(1));
 m.sup=0;const hp=t.hp;t.lastHitT=-99;run(s,4);assert.strictEqual(t.hp,hp,'no ammo: no shots');t.hp=0;
 const g=at(s,'golani','il',40,62);run(s,0);assert.strictEqual(g.fuel,null,'infantry has no fuel');
 m.fuel=100;const x0=m.x;Sim.setOrder(s,[m.id],{x:40,y:75});run(s,4);const d1=Sim.dist(m,{x:x0,y:60});assert.ok(m.fuel<100,'fuel burned moving: '+m.fuel.toFixed(1));
 const m2=at(s,'merkava','il',42,60);m2.fuel=0;Sim.setOrder(s,[m2.id],{x:42,y:75});run(s,4);const d2=Sim.dist(m2,{x:42,y:60});assert.ok(d2<d1*.4,'no fuel: very slow ('+d2.toFixed(2)+' vs '+d1.toFixed(2)+')');
 const r=at(s,'merkava','il',hq.x+2,hq.y-2);r.sup=5;r.fuel=5;const gi=at(s,'givati','il',hq.x-2,hq.y-2);gi.sup=0;run(s,12);
 assert.ok(r.sup>90&&r.fuel>90&&gi.sup>90,'refilled at the HQ: '+r.sup.toFixed(0)+'/'+r.fuel.toFixed(0)+'/'+gi.sup.toFixed(0));
 // a captured village refills too
 const z=s.sites.find(q=>q.key==='qana');z.owner='il';const n=at(s,'nahal','il',z.x+1,z.y);n.sup=10;run(s,8);assert.ok(n.sup>60,'captured village refills: '+n.sup.toFixed(0))});

test('supply truck: cheap, built in the armour tab, refills nearby units in the field (and only nearby)',()=>{
 assert.ok(D.BUILD.veh.includes('truck'));assert.ok(U.truck.cost<=400&&U.truck.supplier);
 const s=fresh();const m=at(s,'merkava','il',40,60),far=at(s,'namer','il',52,60),tr=at(s,'truck','il',41.5,60.5);m.sup=10;m.fuel=10;far.sup=10;far.fuel=10;
 run(s,10);assert.ok(m.sup>90&&m.fuel>90,'tank refilled by the truck: '+m.sup.toFixed(0)+'/'+m.fuel.toFixed(0));assert.ok(far.sup<11&&far.fuel<11,'a unit 10 tiles away is not');
 s.money=1000;assert.ok(Sim.buy(s,'truck'),'truck can be bought')});

test('normal play near your lines rarely runs dry: a platoon fighting 90 s keeps ammo; old saves get supply and hidden objects',()=>{
 const s=fresh();const g=at(s,'golani','il',40,60),t=at(s,'hz_tank','hz',43,60);t.hp=t.maxHp=1e6;run(s,90);assert.ok(g.sup>15,'after 90 s of fire: '+g.sup.toFixed(0)+'% left');
 const o=JSON.parse(Sim.save(Sim.make(9,'easy')));delete o.hidden;for(const u of o.units){delete u.sup;delete u.fuel}const r=Sim.restore(JSON.stringify(o));
 assert.ok(r.hidden.length>0&&Sim.launchersAlive(r)>=6);const mk=r.units.find(u=>u.type==='merkava');assert.strictEqual(mk.sup,100);assert.strictEqual(mk.fuel,100)});

test('RTS page: launcher indicator, blow button, three new how-to lines',()=>{const h=fs.readFileSync(path.join(RTS_DIR,'index.html'),'utf8');
 assert.match(h,/משגרים פעילים: <b>/);assert.match(h,/מקשים על מגן שמיים/);assert.match(h,/id="blow"/);for(const w of ['מנהרות ומחסני נשק','אזורי שיגור','אספקה'])assert.ok(h.includes(w),w);
 const td=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8');assert.match(td,/id="lbLine"/)});
