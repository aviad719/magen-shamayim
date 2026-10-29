// v5 Part B (חזית לבנון): hold-sector default stance, control groups 1-4, minimap fog/enemies, smarter enemy
// (ambushes, roadside IEDs, counterattacks that retake villages), coordinated attack, artillery-on-tap and no-move on invalid attacks.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const PROJ=fs.existsSync(path.join(__dirname,'..','site','rts'));
const S_DIR=PROJ?path.join(__dirname,'..','site'):path.join(__dirname,'..','..','tower-defense','site'),RTS_DIR=PROJ?path.join(S_DIR,'rts'):path.join(__dirname,'..');
const D=require(path.join(RTS_DIR,'js','data.js'));globalThis.LF={data:D};const Sim=require(path.join(RTS_DIR,'js','sim.js'));
const U=D.UNITS,AR=D.ARTY,SM=D.SMART;
function fresh(diff){const s=Sim.make(42,diff||'normal');s.units=s.units.filter(u=>(u.side==='il'&&u.type==='hq')||(u.side==='hz'&&U[u.type].building&&u.type!=='hz_launcher'));s.hidden=s.hidden.filter(h=>h.kind!=='ied');for(const z of s.sites)z.prod=1e9,z.droneT=1e9;s.aiAttackT=-1e9;s.retakeT=-1e9;return s}
const at=(s,type,side,x,y,o)=>Sim.makeUnit(s,type,side,x,y,o);
const run=(s,sec,each)=>{for(let i=0;i<Math.round(sec*30);i++){Sim.step(s,1/30);if(each)each()}};
function spot(s){const hq=Sim.get(s,s.hq);return {x:hq.x+10,y:hq.y+4}}
const moved=(u,p)=>Math.hypot(u.x-p.x,u.y-p.y);

test('B1 hold sector: an idle unit never charges an enemy; it fires only at what is inside its own range',()=>{const s=fresh();const p=spot(s);
 const g=at(s,'golani','il',p.x,p.y),e=at(s,'hz_inf','hz',p.x,p.y-6.5);const g0={x:g.x,y:g.y};let maxMove=0;
 run(s,20,()=>{maxMove=Math.max(maxMove,moved(g,g0))});assert.ok(maxMove<.05,'golani stayed put: '+maxMove.toFixed(3));assert.ok(e.hp<e.maxHp,'enemy was shot once it came into range')});

test('B1 hold sector: a tank hit from beyond its range by an ATGM stays put (no chase) until ordered',()=>{const s=fresh();const p=spot(s);
 const m=at(s,'merkava','il',p.x,p.y),a=at(s,'tech_atgm','hz',p.x,p.y-6.9);m.trophy=0;const m0={x:m.x,y:m.y},a0={x:a.x,y:a.y};let maxMove=0;
 run(s,15,()=>{a.x=a0.x;a.y=a0.y;a.goal=null;maxMove=Math.max(maxMove,moved(m,m0))});assert.ok(m.hp<m.maxHp,'the tank was hit');assert.ok(maxMove<.05,'no charge: '+maxMove.toFixed(3));
 Sim.setOrder(s,[m.id],{x:a.x,y:a.y},a.id);run(s,3);assert.ok(moved(m,m0)>1,'an ordered attack still moves')});

test('B2 control groups 1-4: save, select, reassign (one group per unit), survive save/restore, dead units drop out',()=>{const s=fresh();const p=spot(s);
 const a=at(s,'golani','il',p.x,p.y),b=at(s,'merkava','il',p.x+1,p.y),c=at(s,'para','il',p.x+2,p.y);
 assert.strictEqual(Sim.setCtrlGroup(s,1,[a.id,b.id]),2);assert.deepStrictEqual(Sim.ctrlGroup(s,1).sort(),[a.id,b.id].sort());assert.strictEqual(a.cg,1);
 Sim.setCtrlGroup(s,2,[b.id,c.id]);assert.deepStrictEqual(Sim.ctrlGroup(s,1),[a.id]);assert.deepStrictEqual(Sim.ctrlGroup(s,2).sort(),[b.id,c.id].sort());
 Sim.setCtrlGroup(s,1,[c.id]);assert.deepStrictEqual(Sim.ctrlGroup(s,1),[c.id],'storing again replaces the group');assert.strictEqual(a.cg,0);
 assert.strictEqual(Sim.setCtrlGroup(s,5,[a.id]),0,'only 1-4');assert.strictEqual(D.CTRL.groups,4);assert.ok(D.CTRL.longPress>=500&&D.CTRL.longPress<=700);
 const r=Sim.restore(Sim.save(s));assert.deepStrictEqual(Sim.ctrlGroup(r,2),[b.id]);b.hp=0;assert.deepStrictEqual(Sim.ctrlGroup(s,2),[])});

test('B2/B3/B5 UI wiring: group buttons with long press, minimap with fog + enemies, coordinated-attack bar',()=>{const h=fs.readFileSync(path.join(RTS_DIR,'index.html'),'utf8'),m=fs.readFileSync(path.join(RTS_DIR,'js','main.js'),'utf8'),r=fs.readFileSync(path.join(RTS_DIR,'js','render.js'),'utf8');
 for(const id of ['cg1','cg2','cg3','cg4','coordBtn','coordBar','coordGo','coordCancel'])assert.ok(h.includes('id="'+id+'"'),id);assert.match(h,/⚔ תיאום התקפה/);assert.match(h,/✓ בצע/);assert.match(h,/✖ בטל/);
 assert.match(m,/קבוצה '\+n\+' נשמרה/);assert.match(m,/D\.CTRL\.longPress/);assert.match(m,/D\.CTRL\.doubleTap/);assert.match(r,/visionGrid/);assert.match(r,/u\.cg/);assert.match(r,/s\.coord/);
 const s=fresh();const g=Sim.visionGrid(s),hq=Sim.get(s,s.hq);assert.strictEqual(g.length,D.MAP.cols*D.MAP.rows);assert.strictEqual(g[Math.floor(hq.y)*D.MAP.cols+Math.floor(hq.x)],1,'seen around HQ');assert.strictEqual(g[5*D.MAP.cols+40],0,'fog far north')});

test('B4 setup scales with difficulty: hidden IEDs on roads and hidden ambush squads beside them, away from the HQ',()=>{for(const d of ['easy','normal','hard']){const s=Sim.make(9,d),hq=Sim.get(s,s.hq);
  const ieds=s.hidden.filter(h=>h.kind==='ied'),amb=s.units.filter(u=>u.ambush===1);assert.strictEqual(ieds.length,SM.ied.count[d],d+' ieds '+ieds.length);assert.strictEqual(amb.length,SM.ambush.count[d],d+' ambush '+amb.length);
  for(const h of ieds){assert.strictEqual(Sim.ground(h.x,h.y),'road');assert.ok(!h.revealed&&Sim.dist(h,hq)>=SM.ied.minHq)}for(const u of amb){assert.ok(u.hidden&&!u.revealed&&u.side==='hz');assert.ok(Sim.dist(u,hq)>=SM.ambush.minHq)}}
 assert.ok(SM.retake.every.hard<SM.retake.every.normal&&SM.retake.every.normal<SM.retake.every.easy&&SM.retake.size.hard>SM.retake.size.easy)});

test('B4 ambush: hidden and untargetable until our units pass close, then it opens fire with a first-burst bonus',()=>{const s=fresh();const p=spot(s);
 const am=at(s,'hz_inf','hz',p.x,p.y-12);am.hidden=1;am.revealed=0;am.ambush=1;const g=at(s,'golani','il',p.x,p.y);
 run(s,2);assert.strictEqual(am.ambush,1,'still hidden');assert.strictEqual(am.hp,am.maxHp,'not targetable while hidden');
 Sim.setOrder(s,[g.id],{x:p.x,y:p.y-9});let sprang=null;run(s,14,()=>{if(am.ambush===2&&!sprang)sprang={d:Sim.dist(g,am),burst:am.burstT,ev:s.events.find(e=>e.kind==='ambush')}});
 assert.ok(sprang,'sprang');assert.ok(sprang.d<=SM.ambush.trigger+.2,'when we came close: '+sprang.d.toFixed(2));assert.ok(sprang.ev&&/מארב/.test(sprang.ev.text));assert.ok(am.revealed);assert.ok(g.hp<g.maxHp,'it opened fire')});

test('B4 ambush: a recon UAV spots it from the air (revealed) without springing it',()=>{const s=fresh();const p=spot(s);const am=at(s,'hz_inf','hz',p.x,p.y-12);am.hidden=1;am.revealed=0;am.ambush=1;
 const v=at(s,'uav_recon','il',p.x,p.y-12+SM.ambush.uavSpot-1);run(s,1);assert.ok(am.revealed,'spotted');assert.strictEqual(am.ambush,1,'not sprung by a UAV')});

test('B4 IEDs: a vehicle over a hidden IED is hit; infantry is not a trigger; engineers / recon UAV reveal; engineers clear',()=>{const s=fresh();const p=spot(s);
 const ied={id:'hx1',kind:'ied',x:p.x,y:p.y-5,site:'x',name:'בדיקה',revealed:false,dead:false,blow:0};s.hidden.push(ied);
 const g=at(s,'golani','il',p.x,p.y-3);Sim.setOrder(s,[g.id],{x:p.x,y:p.y-7});run(s,6);assert.ok(!ied.dead,'infantry walked over: no blast');assert.ok(!ied.revealed,'and did not spot it');
 g.hp=0;const m=at(s,'merkava','il',p.x,p.y-1);Sim.setOrder(s,[m.id],{x:p.x,y:p.y-9});run(s,6);assert.ok(ied.dead&&ied.blewUp,'tank set it off');assert.ok(m.hp<m.maxHp&&m.hp>0,'tank damaged, not destroyed: '+Math.round(m.hp));
 const ied2={id:'hx2',kind:'ied',x:p.x+6,y:p.y-5,site:'x',name:'בדיקה',revealed:false,dead:false,blow:0};s.hidden.push(ied2);
 const e=at(s,'engineer','il',p.x+6,p.y-5+D.HIDDEN.ied.revealEng-.6);run(s,1);assert.ok(ied2.revealed,'engineers reveal');
 const money=s.money;const t=Sim.blowOrder(s,[e.id],'hx2');assert.ok(t,'engineers can be sent to clear it');run(s,10);assert.ok(ied2.dead&&ied2.cleared,'cleared');assert.ok(s.money>money,'bounty');
 const ied3={id:'hx3',kind:'ied',x:p.x-6,y:p.y-5,site:'x',name:'בדיקה',revealed:false,dead:false,blow:0};s.hidden.push(ied3);at(s,'uav_recon','il',p.x-6,p.y-5+D.HIDDEN.ied.revealUav-.6);run(s,1);assert.ok(ied3.revealed,'recon UAV reveals');
 const tr=at(s,'merkava','il',p.x-6,p.y-3);Sim.setOrder(s,[tr.id],{x:p.x-6,y:p.y-8});run(s,5);assert.ok(!ied3.dead,'a revealed IED does not catch our vehicles')});

test('B4 counterattack: Hezbollah gathers and retakes a captured village we left empty; a defended one holds',()=>{const s=fresh();s.time=500;const z=s.sites.find(q=>q.t==='village'&&q.key==='qana')||s.sites.find(q=>q.t==='village');
 const b=Sim.get(s,z.building);if(b)b.hp=0;z.owner='il';s.captures=1;const home=s.sites.filter(q=>q.owner==='hz'&&q!==z).sort((a,c)=>Sim.dist(a,z)-Sim.dist(c,z))[0];
 const force=[0,1,2,3].map(i=>at(s,'hz_inf','hz',z.x+6+i*.6,z.y-5,{site:home.key}));s.retakeT=1e9;Sim.retakeTick(s,1/30);assert.ok(s.retake&&s.retake.key===z.key&&s.retake.phase==='gather','gathering at '+z.n);
 assert.ok(s.messages.some(m=>/מתקבץ/.test(m)));run(s,SM.retake.gather+1);assert.ok(!s.retake||s.retake.phase==='attack','attack phase');run(s,40);
 assert.strictEqual(z.owner,'hz','retaken');assert.ok(Sim.get(s,z.building),'their HQ is back (half strength)');assert.ok(s.messages.some(m=>/נכבשה מחדש/.test(m)));assert.strictEqual(s.captures,0);
 // a defended village is not retaken
 const s2=fresh();s2.time=500;const z2=s2.sites.find(q=>q.key===z.key);const b2=Sim.get(s2,z2.building);if(b2)b2.hp=0;z2.owner='il';const def=at(s2,'merkava','il',z2.x,z2.y);def.trophy=99;def.hp=def.maxHp=99999;
 [0,1,2].forEach(i=>{const u=at(s2,'hz_inf','hz',z2.x+1+i*.3,z2.y+.5,{site:home.key});u.hp=u.maxHp=1e6;u.retake=z2.key;u.raid=1});run(s2,30);assert.strictEqual(z2.owner,'il','held while our unit is there')});

test('B4 old saves (before v5) get the IEDs and ambushes on load',()=>{const s=Sim.make(5,'normal');s.hidden=s.hidden.filter(h=>h.kind!=='ied');s.units=s.units.filter(u=>!u.ambush);delete s.v5;
 const r=Sim.restore(Sim.save(s));assert.ok(r.v5);assert.strictEqual(r.hidden.filter(h=>h.kind==='ied').length,SM.ied.count.normal);assert.strictEqual(r.units.filter(u=>u.ambush===1).length,SM.ambush.count.normal);
 const ids=r.hidden.map(h=>h.id);assert.strictEqual(new Set(ids).size,ids.length,'unique ids')});

test('B5 coordinated attack: orders are queued (nothing moves), "בצע" fires all at once, "בטל" drops them all',()=>{const s=fresh();const p=spot(s);
 const g=at(s,'golani','il',p.x,p.y),m=at(s,'merkava','il',p.x+2,p.y),a=at(s,'artillery','il',p.x+4,p.y);a.art={st:'deployed',t:0,fireCd:0,smokeCd:0};
 Sim.coordStart(s);assert.ok(s.coord);const r1=Sim.order(s,{kind:'move',ids:[g.id],p:{x:p.x,y:p.y-6}}),r2=Sim.order(s,{kind:'move',ids:[m.id],p:{x:p.x+2,y:p.y-6}}),r3=Sim.order(s,{kind:'fire',ids:[a.id],p:{x:p.x+4,y:p.y-12}});
 assert.deepStrictEqual([r1.queued,r2.queued,r3.queued],[1,2,3]);run(s,3);assert.ok(!g.goal&&!m.goal&&moved(g,{x:p.x,y:p.y})<.01,'nothing executed');assert.strictEqual(s.strikes.length,0,'no barrage yet');
 const t0=s.time;const out=Sim.coordExec(s);assert.strictEqual(out.length,3);assert.ok(!s.coord,'mode closed');assert.ok(g.goal&&m.goal,'both moving');assert.strictEqual(s.strikes.length,1,'barrage in the same instant');assert.strictEqual(s.time,t0);
 Sim.coordStart(s);Sim.order(s,{kind:'move',ids:[g.id,m.id],p:{x:p.x,y:p.y+3}});Sim.order(s,{kind:'deploy',ids:[],p:{x:0,y:0}});assert.strictEqual(Sim.coordCancel(s),2);assert.ok(!s.coord);assert.ok(g.goal.y<p.y,'cancelled orders never ran');
 const r4=Sim.order(s,{kind:'move',ids:[g.id],p:{x:p.x,y:p.y+2}});assert.ok(!r4.queued&&r4===1,'outside coordination an order runs at once')});

test('B5 coordinated attack covers every order kind (attack, deploy, smoke, drop, supply, route, hold, sweep, pack)',()=>{const s=fresh();const p=spot(s);s.money=9999;const hq=Sim.get(s,s.hq);
 const a=at(s,'artillery','il',p.x,p.y),pa=at(s,'para','il',hq.x+1,hq.y-1),uav=at(s,'uav_attack','il',p.x,p.y-2),e=at(s,'hz_inf','hz',p.x+1,p.y-14),gl=at(s,'golani','il',p.x-3,p.y);
 Sim.coordStart(s);for(const o of [{kind:'deploy',ids:[a.id],p:null},{kind:'drop',ids:[pa.id],p:{x:p.x,y:p.y-8}},{kind:'supply',p:{x:p.x,y:p.y}},{kind:'route',ids:[uav.id],points:[{x:p.x,y:p.y-4},{x:p.x+3,y:p.y-4}]},{kind:'attack',ids:[gl.id],target:e.id,p:{x:e.x,y:e.y}}])Sim.order(s,o);
 assert.strictEqual(s.coord.orders.length,5);assert.strictEqual(s.money,9999,'nothing paid yet');Sim.coordExec(s);assert.strictEqual(a.art.st,'deploying');assert.ok(pa.carriedBy,'boarded the plane');assert.ok(s.money<9999,'supply drop paid');assert.ok(uav.route&&uav.route.length===2);assert.strictEqual(gl.target,e.id)});

test('B6 a deployed battery in range fires on a tapped enemy; units that cannot hurt the target get no order and stay',()=>{const s=fresh();const p=spot(s);
 const a=at(s,'artillery','il',p.x,p.y),g=at(s,'golani','il',p.x+1,p.y),v=at(s,'uav_recon','il',p.x+2,p.y),e=at(s,'hz_inf','hz',p.x,p.y-12);a.art={st:'deployed',t:0,fireCd:0,smokeCd:0};
 const v0={x:v.x,y:v.y},a0={x:a.x,y:a.y};const r=Sim.attackOrder(s,[a.id,g.id,v.id],e.id);
 assert.strictEqual(r.fired,1,'barrage on the enemy');assert.strictEqual(s.strikes.length,1);assert.ok(Math.hypot(s.strikes[0].x-e.x,s.strikes[0].y-e.y)<.01,'at the enemy position');
 assert.strictEqual(r.n,1,'golani ordered');assert.deepStrictEqual(r.cant,[v.id],'the recon UAV cannot damage infantry');run(s,3);assert.ok(moved(v,v0)<.01,'recon UAV did not move');assert.ok(!v.goal&&!v.target);assert.ok(moved(a,a0)<.01);
 // out of range / not deployed: no fire, a reason
 const far=at(s,'hz_inf','hz',p.x,p.y-(AR.range+6));a.art.fireCd=0;const r2=Sim.attackOrder(s,[a.id],far.id);assert.strictEqual(r2.fired,0);assert.strictEqual(r2.artyReason,'range');
 const b=at(s,'artillery','il',p.x+3,p.y);const r3=Sim.attackOrder(s,[b.id],e.id);assert.strictEqual(r3.artyReason,'notDeployed');assert.ok(!b.goal,'an undeployed battery does not drive at the enemy');
 const only=Sim.attackOrder(s,[v.id],e.id);assert.strictEqual(only.n,0);assert.ok(!v.goal)});

test('B how-to lines for every new RTS feature at the top of the intro list',()=>{const h=fs.readFileSync(path.join(RTS_DIR,'index.html'),'utf8');const how=h.slice(h.indexOf('<div class="how">'));const first=how.slice(0,how.indexOf('</div>')+6);
 for(const k of ['תיאום התקפה','הגנה בגזרה','קבוצות 1-4','מיני-מפה','מארבים','מטעני צד','מתקפות נגד','תותחנים על אויב'])assert.ok(first.includes(k),k)});

test('bot on normal still wins the front with ambushes, IEDs and counterattacks on',()=>{const makeBot=require('./rts-bot.js');const s=Sim.make(42,'normal'),bot=makeBot(Sim,s);
 for(let i=0;i<45*60*30&&!s.won&&!s.lost;i++){Sim.step(s,1/30);bot.tick(1/30)}assert.ok(s.won,'won at '+(s.time/60).toFixed(1)+' min');assert.ok((s.stats.ambushes||0)+(s.stats.counters||0)>0,'the smarter enemy was active')});
