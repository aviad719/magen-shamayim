// LEBANON FRONT unit tests: group/split, Namer capacity, terrain bonuses, Trophy, capture -> shared save -> TD city, bot playthrough.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const D=require('../js/data.js');globalThis.LF={data:D};const Sim=require('../js/sim.js');const SHARED=require('../../tower-defense/site/shared.js');const makeBot=require('./rts-bot.js');
const U=D.UNITS;
function fresh(diff){const s=Sim.make(42,diff||'normal');s.units=s.units.filter(u=>u.side==='il'&&u.type==='hq');return s}
function at(s,type,side,x,y,o){return Sim.makeUnit(s,type,side,x,y,o)}
function findTile(kind){for(let y=0;y<D.MAP.rows;y++)for(let x=0;x<D.MAP.cols;x++)if(Sim.terrain[y][x]===kind)return{x:x+.5,y:y+.5};throw Error('no '+kind)}

test('infantry is bought as a platoon of 8 soldiers',()=>{const s=fresh();s.money=5000;assert.ok(Sim.buy(s,'golani'));for(let i=0;i<30*12;i++)Sim.step(s,1/30);
 const p=Sim.alive(s,'il').find(u=>u.type==='golani');assert.ok(p,'platoon delivered');assert.strictEqual(p.soldiers,8);assert.strictEqual(p.hp,8*U.golani.hpPer)});

test('split halves a platoon 8 -> 4+4 -> 2+2, and splits a group of units half-half',()=>{const s=fresh();const p=at(s,'golani','il',30,100);
 const [a,b]=Sim.split(s,[p.id]);assert.strictEqual(Sim.get(s,a[0]).soldiers,4);assert.strictEqual(Sim.get(s,b[0]).soldiers,4);
 const [c,d]=Sim.split(s,[a[0]]);assert.strictEqual(Sim.get(s,c[0]).soldiers,2);assert.strictEqual(Sim.get(s,d[0]).soldiers,2);
 const tanks=[0,1,2,3].map(i=>at(s,'merkava','il',30+i,95).id);Sim.group(s,tanks);const halves=Sim.split(s,tanks);assert.deepStrictEqual(halves.map(h=>h.length),[2,2]);
 assert.notStrictEqual(Sim.get(s,halves[0][0]).group,Sim.get(s,halves[1][0]).group)});

test('group: one command moves every unit of the group',()=>{const s=fresh();const ids=[at(s,'golani','il',30,100).id,at(s,'nahal','il',31,100).id,at(s,'merkava','il',32,100).id];
 const g=Sim.group(s,ids);assert.ok(g);Sim.setOrder(s,[ids[0]],{x:30,y:90});for(const id of ids)assert.ok(Sim.get(s,id).goal,'unit '+id+' got the order')});

test('Namer carries at most 2 platoons; helicopter 1; unload puts them back on the ground',()=>{const s=fresh();const n=at(s,'namer','il',30,100);
 const ps=[0,1,2].map(i=>at(s,'golani','il',30.5+i*.3,100.5).id);assert.strictEqual(Sim.load(s,n.id,ps),2);assert.strictEqual(n.cargo.length,2);
 assert.ok(Sim.get(s,ps[0]).carriedBy===n.id&&!Sim.get(s,ps[2]).carriedBy);assert.ok(!Sim.alive(s,'il').some(u=>u.id===ps[0]),'carried units are off the map');
 assert.strictEqual(Sim.unload(s,n.id),2);assert.strictEqual(n.cargo.length,0);
 const h=at(s,'heli','il',31,101);assert.strictEqual(Sim.load(s,h.id,ps),1)});

test('terrain bonuses: Golani in urban, Nahal in forest, Givati when holding',()=>{
 const g={type:'golani',hold:0},n={type:'nahal',hold:0},v={type:'givati',hold:5};
 assert.ok(Sim.bonus(g,'city',false).atk>1&&Sim.bonus(g,'village',true).def<1);assert.strictEqual(Sim.bonus(g,'forest',false).atk,1);
 assert.ok(Sim.bonus(n,'forest',false).atk>1);assert.strictEqual(Sim.bonus(n,'city',false).atk,1);
 assert.ok(Sim.bonus(v,'open',true).def<1);assert.strictEqual(Sim.bonus({type:'givati',hold:0},'open',true).def,1);
 // and it changes a real fight: Nahal in a forest out-damages Golani in the same forest
 const s=fresh(),f=findTile('forest');const t1=at(s,'hz_tank','hz',f.x,f.y);t1.hp=t1.maxHp=1e6;
 const a=at(s,'nahal','il',f.x,f.y),b=at(s,'golani','il',f.x,f.y),w=U.nahal.weapons[0];
 const before=t1.hp;Sim.attack(s,a,t1,w);const dn=before-t1.hp;const b2=t1.hp;Sim.attack(s,b,t1,U.golani.weapons[0]);const dg=b2-t1.hp;assert.ok(dn>dg*1.4,'nahal '+dn+' vs golani '+dg)});

test('Trophy intercepts anti-tank missiles (and only those) while it has charges',()=>{const s=fresh();const m=at(s,'merkava','il',30,100);
 const r=Sim.inflict(s,m,120,'atgm',0.0);assert.strictEqual(r.intercepted,true);assert.strictEqual(m.hp,m.maxHp);assert.strictEqual(m.trophy,U.merkava.trophy.charges-1);
 m.trophyCd=0;const r2=Sim.inflict(s,m,120,'atgm',0.99);assert.strictEqual(r2.intercepted,false);assert.ok(m.hp<m.maxHp);
 const hp=m.hp;m.trophyCd=0;Sim.inflict(s,m,60,'shell',0.0);assert.ok(m.hp<hp,'tank shells are not intercepted');
 const n=at(s,'namer','il',31,100);assert.strictEqual(Sim.inflict(s,n,120,'atgm',0).intercepted,false)});

test('engineers build an observation/fire post and repair damaged tanks',()=>{const s=fresh();s.money=2000;const e=at(s,'engineer','il',30,100),m=at(s,'merkava','il',31,100);m.hp=100;
 const id=Sim.buildPost(s,e.id);assert.ok(id);for(let i=0;i<30*15;i++)Sim.step(s,1/30);const p=Sim.get(s,id);assert.ok(p&&p.built,'post built');assert.ok(m.hp>100,'tank repaired: '+m.hp)});

test('capturing Tyre writes the shared save and the TD map gains Tyre as an Israeli city with 5 hits',()=>{
 SHARED.useStorage(SHARED.memoryStorage());SHARED.reset();const s=fresh();const tyre=s.sites.find(z=>z.key==='tyre');
 for(const u of s.units)if(u.side==='hz'&&Sim.dist(u,tyre)<10)u.hp=0;const g=at(s,'golani','il',tyre.x,tyre.y);let ev=null;
 for(let i=0;i<30*60&&!ev;i++){Sim.step(s,1/30);ev=s.events.find(e=>e.kind==='city'&&e.key==='tyre')}
 assert.ok(ev,'Tyre captured');assert.strictEqual(tyre.owner,'il');SHARED.capture(ev.key);
 assert.deepStrictEqual(SHARED.captured(),['tyre']);const c=SHARED.capturedCities()[0];assert.strictEqual(c.n,'צור');
 // the TD game reads capturedCities() into its city list with HITS (5) like every other city
 const game=fs.readFileSync(path.join(__dirname,'../../tower-defense/site/game.js'),'utf8');assert.match(game,/SHARED\.capturedCities\(\)/);assert.match(game,/hp:HITS/);assert.match(game,/const HITS\s*=\s*5/)});

test('war budget: TD waves add to the shared budget, the RTS takes it',()=>{SHARED.useStorage(SHARED.memoryStorage());SHARED.reset();
 SHARED.addBudget(1200,'גל 3');SHARED.addBudget(800,'גל 4');assert.strictEqual(SHARED.budget(),2000);assert.strictEqual(SHARED.takeBudget(),2000);assert.strictEqual(SHARED.budget(),0);
 const game=fs.readFileSync(path.join(__dirname,'../../tower-defense/site/game.js'),'utf8');assert.match(game,/SHARED\.addBudget\(/)});

test('save and restore round-trip',()=>{const s=Sim.make(5,'easy');for(let i=0;i<300;i++)Sim.step(s,1/30);const o=Sim.restore(Sim.save(s));assert.ok(o);assert.strictEqual(o.units.length,s.units.length);assert.strictEqual(o.diff,'easy')});

test('pathing: a tank ordered across the Litani reaches the far bank via a bridge',()=>{const s=fresh();const m=at(s,'merkava','il',30,96);const goal={x:37,y:75};
 Sim.setOrder(s,[m.id],goal);for(let i=0;i<30*120&&m.goal;i++)Sim.step(s,1/30);assert.ok(Sim.dist(m,goal)<2.5,'tank at '+m.x.toFixed(1)+','+m.y.toFixed(1))});

test('bot playthrough on easy captures Beirut and wins the front',()=>{const s=Sim.make(7,'easy'),bot=makeBot(Sim,s);
 for(let i=0;i<30*60*40&&!s.won&&!s.lost;i++){Sim.step(s,1/30);bot.tick(1/30)}assert.ok(s.won,'won (captures '+s.captures+', t '+(s.time/60).toFixed(1)+'m)');assert.strictEqual(s.sites.find(z=>z.key==='beirut').owner,'il')});

test('bot on normal keeps the game moving (captures in the first 20 minutes, no stall)',()=>{const s=Sim.make(11,'normal'),bot=makeBot(Sim,s);
 for(let i=0;i<30*60*20&&!s.won&&!s.lost;i++){Sim.step(s,1/30);bot.tick(1/30)}assert.ok(s.captures>=4,'captures '+s.captures)});

test('RTS page wiring: phone viewport, Hebrew RTL, scripts present',()=>{const h=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(h,/<html lang="he" dir="rtl">/);assert.match(h,/name="viewport"/);for(const f of ['../shared.js','js/data.js','js/sim.js','js/render.js','js/main.js'])assert.ok(h.includes('src="'+f+'"'),f);
 assert.ok(!/TODO|lorem/i.test(h))});
