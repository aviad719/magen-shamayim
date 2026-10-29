// v4 stage 2: artillery (deploy / fire / smoke / cooldowns / friendly fire / pack), paratroopers (drop + plane shoot-down),
// one-time supply airdrop, Golani sweep, Nahal removed from the shop (old saves keep it).
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const PROJ=fs.existsSync(path.join(__dirname,'..','site','rts'));
const S_DIR=PROJ?path.join(__dirname,'..','site'):path.join(__dirname,'..','..','tower-defense','site'),RTS_DIR=PROJ?path.join(S_DIR,'rts'):path.join(__dirname,'..');
const D=require(path.join(RTS_DIR,'js','data.js'));globalThis.LF={data:D};const Sim=require(path.join(RTS_DIR,'js','sim.js'));
const U=D.UNITS,AR=D.ARTY;
function fresh(){const s=Sim.make(42,'normal');s.units=s.units.filter(u=>(u.side==='il'&&u.type==='hq')||(u.side==='hz'&&U[u.type].building));for(const z of s.sites)z.prod=1e9,z.droneT=1e9;s.aiAttackT=-1e9;return s}
const at=(s,type,side,x,y,o)=>Sim.makeUnit(s,type,side,x,y,o);
const run=(s,sec,each)=>{for(let i=0;i<Math.round(sec*30);i++){Sim.step(s,1/30);if(each)each()}};
// an open patch of Galilee south-east of the HQ, far from Hezbollah sites
function spot(s){const hq=Sim.get(s,s.hq);return {x:hq.x+10,y:hq.y+4}}

test('artillery: cannot fire undeployed; deploy takes ~10 s; then fires inside its range only',()=>{const s=fresh();const p=spot(s);const a=at(s,'artillery','il',p.x,p.y);
 assert.strictEqual(Sim.artyFire(s,[a.id],{x:p.x,y:p.y-8},'fire').reason,'notDeployed');assert.strictEqual(U.artillery.weapons.length,0,'no direct fire');
 assert.strictEqual(Sim.deployOrder(s,[a.id],{x:p.x+2,y:p.y}),1);run(s,3);assert.strictEqual(a.art.st,'deploying','arrived and deploying');
 run(s,AR.deploy-2);assert.strictEqual(a.art.st,'deploying');run(s,2.5);assert.strictEqual(a.art.st,'deployed');
 const pos={x:a.x,y:a.y};Sim.setOrder(s,[a.id],{x:a.x-10,y:a.y});run(s,2);assert.ok(Sim.dist(a,pos)<.01,'deployed battery ignores move orders');
 assert.strictEqual(Sim.artyFire(s,[a.id],{x:a.x,y:a.y-(AR.range+3)},'fire').reason,'range');assert.strictEqual(Sim.artyFire(s,[a.id],{x:a.x+1,y:a.y},'fire').reason,'tooClose');
 assert.ok(Sim.inArtyRange(a,{x:a.x,y:a.y-10})&&!Sim.inArtyRange(a,{x:a.x,y:a.y-30}))});

test('artillery: barrage warns first, then damages everything in the radius; our units take 50%; separate cooldowns',()=>{const s=fresh();const p=spot(s);const a=at(s,'artillery','il',p.x,p.y);a.art={st:'deployed',t:0,fireCd:0,smokeCd:0};
 const tgt={x:p.x,y:p.y-10};const foe=at(s,'hz_inf','hz',tgt.x,tgt.y),foe2=at(s,'hz_inf','hz',tgt.x+.3,tgt.y),ours=at(s,'golani','il',tgt.x+.3,tgt.y+.2),farFoe=at(s,'hz_inf','hz',tgt.x+8,tgt.y);
 [foe,foe2,ours,farFoe].forEach(u=>{u.hold=1});ours.stand=1;foe.hp=foe.maxHp=1000;ours.hp=ours.maxHp=1000;const h0={foe:foe.hp,ours:ours.hp,far:farFoe.hp};
 // keep them from shooting each other so only the barrage counts
 foe.sup=0;ours.sup=0;[foe,foe2,farFoe].forEach(u=>u.weaponCd=[999,999]);ours.weaponCd=[999,999];
 const r=Sim.artyFire(s,[a.id],tgt,'fire');assert.strictEqual(r.n,1);assert.strictEqual(s.strikes.length,1,'warning ring pending');assert.ok(s.strikes[0].t>=AR.fire.warn-.01);
 run(s,AR.fire.warn-.5);assert.strictEqual(foe.hp,h0.foe,'no damage during the warning');
 run(s,AR.fire.gap*AR.fire.volleys+1.2);assert.strictEqual(s.strikes.length,0);
 const dFoe=h0.foe-Math.max(0,foe.hp),dOurs=h0.ours-ours.hp;assert.ok(dFoe>60,'enemy squad hit hard: '+dFoe);assert.ok(dOurs>0,'friendly fire hits our own platoon');
 assert.ok(Math.abs(dOurs/dFoe-AR.friendly)<.08,'ours take about half: ours '+dOurs.toFixed(1)+' vs enemy '+dFoe.toFixed(1));assert.ok(foe2.hp<=0,'an ordinary squad at the centre is wiped out');assert.strictEqual(farFoe.hp,h0.far,'outside the radius untouched');
 assert.strictEqual(Sim.artyFire(s,[a.id],tgt,'fire').reason,'cooldown','fire is on cooldown');
 assert.strictEqual(Sim.artyFire(s,[a.id],tgt,'smoke').n,1,'smoke has its own cooldown');assert.strictEqual(Sim.artyFire(s,[a.id],tgt,'smoke').reason,'cooldown');
 run(s,AR.fire.cd);assert.strictEqual(Sim.artyFire(s,[a.id],{x:tgt.x,y:tgt.y-3},'fire').n,1,'ready again after the cooldown')});

test('artillery smoke: enemies cannot see or target our units inside it for ~15 s',()=>{const s=fresh();const p=spot(s);const a=at(s,'artillery','il',p.x,p.y);a.art={st:'deployed',t:0,fireCd:0,smokeCd:0};
 const ours=at(s,'golani','il',p.x,p.y-10);ours.stand=1;ours.hold=3;ours.sup=0;const foe=at(s,'hz_mg','hz',p.x+3,p.y-10);foe.hold=1;
 Sim.artyFire(s,[a.id],{x:ours.x,y:ours.y},'smoke');run(s,AR.smoke.delay+.2);assert.strictEqual(s.smokes.length,1);assert.ok(Sim.inSmoke(s,ours));
 const h=ours.hp;run(s,10);assert.strictEqual(ours.hp,h,'not targeted inside the smoke');
 run(s,AR.smoke.dur-10+1);assert.strictEqual(s.smokes.length,0,'smoke cleared');run(s,5);assert.ok(ours.hp<h,'targeted again after the smoke')});

test('artillery: pack, then it can move again; hold on a battery on its way does not deploy it',()=>{const s=fresh();const p=spot(s);const a=at(s,'artillery','il',p.x,p.y);a.art={st:'deployed',t:0,fireCd:0,smokeCd:0};
 assert.strictEqual(Sim.packOrder(s,[a.id]),1);assert.strictEqual(a.art.st,'packing');run(s,AR.pack+.3);assert.strictEqual(a.art.st,'');
 Sim.setOrder(s,[a.id],{x:p.x-6,y:p.y});run(s,1);assert.ok(a.goal||Sim.dist(a,{x:p.x-6,y:p.y})<1,'moving');
 Sim.deployOrder(s,[a.id],{x:p.x+8,y:p.y});Sim.hold(s,[a.id]);run(s,1);assert.strictEqual(a.art.st,'','hold cancels the trip, no surprise deploy')});

test('paratroopers: board at base, plane flies out, drops them at the point; briefly vulnerable; Nahal not buyable, old Nahal saves work',()=>{const s=fresh();const hq=Sim.get(s,s.hq);
 assert.ok(!D.BUILD.inf.includes('nahal')&&D.BUILD.inf.includes('para'),'shop: paratroopers instead of Nahal');assert.ok(U.para.cost>U.golani.cost);
 const p1=at(s,'para','il',hq.x-2,hq.y-1),p2=at(s,'para','il',hq.x-1,hq.y-1),far=at(s,'para','il',hq.x+30,hq.y-30);
 assert.strictEqual(Sim.dropOrder(s,[far.id],{x:hq.x,y:hq.y-20}).reason,'notAtBase','must board at a base');
 const tgt={x:hq.x+6,y:hq.y-22};const r=Sim.dropOrder(s,[p1.id,p2.id],tgt);assert.strictEqual(r.planes,1);assert.strictEqual(r.troops,2);
 const pl=s.units.find(u=>u.type==='c130'&&u.hp>0);assert.ok(pl&&p1.carriedBy===pl.id&&p2.carriedBy===pl.id,'aboard the plane');
 let landedAt=-1;run(s,12,()=>{if(landedAt<0&&!p1.carriedBy)landedAt=s.time});assert.ok(landedAt>0,'dropped');assert.ok(Sim.dist(p1,tgt)<2.5&&Sim.dist(p2,tgt)<2.5,'landed at the point');
 run(s,10);assert.ok(pl.hp<=0&&pl.gone,'plane flew home and left the map');
 // vulnerable on landing: x1.5 damage for a few seconds
 const s2=fresh();const q=at(s2,'para','il',40,60);const q2=at(s2,'para','il',42,60);q.landT=D.PARA.landT;const d1=Sim.inflict(s2,q,10,'bullet').damage,d2=Sim.inflict(s2,q2,10,'bullet').damage;assert.ok(Math.abs(d1/d2-D.PARA.landVuln)<1e-6,'landing = vulnerable');
 // old save with a Nahal platoon still loads and fights
 const s3=Sim.make(5,'normal');const n=at(s3,'nahal','il',30,100);const raw=Sim.save(s3);const back=Sim.restore(raw);assert.ok(back.units.some(u=>u.type==='nahal'),'Nahal kept');assert.ok(back.strikes&&back.smokes&&back.crates);
 const old=JSON.parse(raw);delete old.strikes;delete old.smokes;delete old.crates;const b2=Sim.restore(JSON.stringify(old));assert.ok(Array.isArray(b2.strikes)&&Array.isArray(b2.smokes));run(b2,2)});

test('paratroopers: enemy anti-air can shoot the plane down, and the troops still aboard are lost',()=>{const s=fresh();const hq=Sim.get(s,s.hq);
 const p1=at(s,'para','il',hq.x-2,hq.y-1),p2=at(s,'para','il',hq.x-1,hq.y-1);const tgt={x:hq.x,y:hq.y-40};
 // a wall of anti-air under the flight path
 const aa=[];for(let i=0;i<8;i++){const u=at(s,'tech_aa','hz',hq.x+(i%2?1.5:-1.5),hq.y-14-i*1.5);u.hold=1;aa.push(u)}
 Sim.dropOrder(s,[p1.id,p2.id],tgt);const pl=s.units.find(u=>u.type==='c130'&&u.hp>0);run(s,10);
 assert.ok(pl.hp<=0&&!pl.gone,'shot down');assert.ok(p1.hp<=0&&p2.hp<=0,'troops aboard lost');assert.ok(s.messages.some(m=>/הופל/.test(m)))});

test('supply airdrop: one use per purchase, refills ammo/fuel and some health in the radius only',()=>{const s=fresh();const hq=Sim.get(s,s.hq);const SD=D.SUPPLY_DROP;
 const p={x:hq.x+8,y:hq.y-12};const m=at(s,'merkava','il',p.x,p.y),g=at(s,'golani','il',p.x+1,p.y),out=at(s,'golani','il',p.x+12,p.y);
 [m,g,out].forEach(u=>{u.stand=1;u.hold=3});m.sup=5;m.fuel=3;m.hp=m.maxHp*.4;g.sup=1;g.hp=g.maxHp*.5;out.sup=2;const gh=g.hp;
 s.money=SD.cost+10;assert.ok(Sim.supplyDrop(s,p));assert.strictEqual(s.money,10,'paid once');assert.ok(!Sim.supplyDrop(s,p),'cannot afford a second one');
 run(s,14);assert.ok(m.sup>=90,'ammo '+m.sup);assert.ok(m.fuel>=95,'fuel '+m.fuel);assert.ok(m.hp>=m.maxHp*.74,'heal '+m.hp/m.maxHp);assert.ok(g.sup>=90);assert.ok(g.hp>gh);
 assert.ok(out.sup<10,'outside the radius not refilled');assert.ok(!s.units.some(u=>u.type==='c130'&&u.hp>0&&!u.gone&&u.drop&&!u.drop.done),'plane done')});

test('Golani sweep: only in a village/city; reveals hidden objects nearby; +50% damage for 20 s; 60 s cooldown',()=>{const s=fresh();
 const h=s.hidden.find(x=>x.kind==='cache'&&s.sites.find(q=>q.key===x.site).t==='village');const z=s.sites.find(q=>q.key===h.site);
 const g=at(s,'golani','il',z.x,z.y);g.stand=1;const field=at(s,'golani','il',Sim.get(s,s.hq).x+10,Sim.get(s,s.hq).y+4);
 assert.strictEqual(Sim.sweepOrder(s,[field.id]).reason,'notUrban');assert.ok(!h.revealed);
 const r=Sim.sweepOrder(s,[g.id]);assert.strictEqual(r.n,1);assert.ok(h.revealed,'store revealed');assert.ok(r.found>=1);assert.strictEqual(g.sweepT,D.SWEEP.dur);
 assert.strictEqual(Sim.sweepOrder(s,[g.id]).reason,'cooldown');
 // damage +50% while the sweep lasts
 const foe=at(s,'hz_inf','hz',g.x+1,g.y),foe2=at(s,'hz_inf','hz',g.x+1,g.y);const w=U.golani.weapons[0];
 const a=Sim.attack(s,g,foe,w).damage;g.sweepT=0;const b=Sim.attack(s,g,foe2,w).damage;assert.ok(Math.abs(a/b-1.5)<1e-6,'x1.5: '+a+' / '+b);
 foe.hp=0;foe2.hp=0;g.hp=g.maxHp;g.sweepT=D.SWEEP.dur;run(s,D.SWEEP.dur+1);assert.ok(g.hp>0,'alive');assert.strictEqual(g.sweepT,0);run(s,D.SWEEP.cd-D.SWEEP.dur);assert.strictEqual(g.sweepCd,0);assert.ok(Sim.actionsFor([g]).has('sweep'))});

test('context buttons for the new units',()=>{const s=fresh();const a=at(s,'artillery','il',30,100),p=at(s,'para','il',30,100),g=at(s,'golani','il',30,100),e=at(s,'engineer','il',30,100);
 const A=Sim.actionsFor([a]);for(const k of ['deploy','fire','smoke','pack'])assert.ok(A.has(k),k);assert.ok(!A.has('drop')&&!A.has('blow')&&!A.has('sweep'));
 assert.ok(Sim.actionsFor([p]).has('drop')&&!Sim.actionsFor([p]).has('blow'));assert.ok(Sim.actionsFor([g]).has('sweep')&&!Sim.actionsFor([g]).has('drop'));
 const mix=Sim.actionsFor([p,e,a]);for(const k of ['drop','blow','build','deploy','fire'])assert.ok(mix.has(k),'union '+k);assert.ok(!mix.has('sweep'));
 assert.match(Sim.attacksText('artillery'),/רק כשפרוס/);assert.match(Sim.attacksText('c130'),/לא תוקף/)});
