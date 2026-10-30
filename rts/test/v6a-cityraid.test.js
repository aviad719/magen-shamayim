// v6a (חזית לבנון): Hezbollah counterattacks on CITIES we hold — bigger force with ATGM teams, 30 s warning, same 12 s retake rule.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const PROJ=fs.existsSync(path.join(__dirname,'..','site','rts'));
const S_DIR=PROJ?path.join(__dirname,'..','site'):path.join(__dirname,'..','..','tower-defense','site'),RTS_DIR=PROJ?path.join(S_DIR,'rts'):path.join(__dirname,'..');
const D=require(path.join(RTS_DIR,'js','data.js'));globalThis.LF={data:D};const Sim=require(path.join(RTS_DIR,'js','sim.js'));
const U=D.UNITS,C=D.SMART.cityRaid,R=D.SMART.retake;
function fresh(diff){const s=Sim.make(42,diff||'normal');s.units=s.units.filter(u=>(u.side==='il'&&u.type==='hq')||(u.side==='hz'&&U[u.type].building&&u.type!=='hz_launcher'));s.hidden=s.hidden.filter(h=>h.kind!=='ied');for(const z of s.sites)z.prod=1e9,z.droneT=1e9;s.aiAttackT=-1e9;s.retakeT=-1e9;return s}
const run=(s,sec)=>{for(let i=0;i<Math.round(sec*30);i++)Sim.step(s,1/30)};
function takeCity(s,key){const z=s.sites.find(q=>q.key===key);const b=Sim.get(s,z.building);if(b)b.hp=0;z.owner='il';s.captures=1;
 const home=s.sites.filter(q=>q.owner==='hz').sort((a,c)=>Sim.dist(a,z)-Sim.dist(c,z))[0];for(let i=0;i<8;i++)Sim.makeUnit(s,i%3?'hz_inf':'hz_mg','hz',home.x+(i%4)*.5,home.y+((i/4)|0)*.5,{site:home.key});return z}

test('v6a data: city counterattack every 10/8/6 min, 6-8 units, 30 s warning, rarer than village counterattacks',()=>{
 assert.deepStrictEqual(C.every,{easy:600,normal:480,hard:360});assert.deepStrictEqual(C.size,{easy:6,normal:7,hard:8});assert.strictEqual(C.warn,30);
 for(const d of ['easy','normal','hard'])assert.ok(C.every[d]>R.every[d]&&C.size[d]>R.size[d],d)});

test('v6a a worn-down Hezbollah (no units nearby, reserve capped) sends nothing smaller than '+C.min,()=>{const s=fresh();s.time=500;const z=s.sites.find(q=>q.key==='tyre');Sim.get(s,z.building).hp=0;z.owner='il';s.cityRaidT=1e9;Sim.cityRaidTick(s,1/30);assert.ok(!s.cityRaid);assert.ok(C.spawn<C.min)});

test('v6a no city held = no city counterattack',()=>{const s=fresh();s.time=500;s.cityRaidT=1e9;Sim.cityRaidTick(s,1/30);assert.ok(!s.cityRaid)});

test('v6a city counterattack: 30 s warning with toast and marker, 6-8 units incl. ATGM teams, then retakes an empty city after 12 s',()=>{const s=fresh();s.time=500;const z=takeCity(s,'tyre');
 s.cityRaidT=C.every.normal-.01;Sim.cityRaidTick(s,1/30);assert.ok(s.cityRaid&&s.cityRaid.key==='tyre'&&s.cityRaid.phase==='gather');
 assert.strictEqual(s.cityRaid.t,C.warn);assert.ok(s.messages.some(m=>m.includes('⚠ חיזבאללה מתקבץ להתקפת נגד על צור')),'toast');
 assert.ok(s.events.some(e=>e.kind==='retake'&&e.text.includes('צור')),'marker event');
 const force=s.cityRaid.ids.map(id=>Sim.get(s,id));assert.ok(force.length>=6&&force.length<=8,'size '+force.length);assert.strictEqual(force.length,C.size.normal);
 assert.ok(force.filter(u=>u.type==='hz_atgm'||u.type==='tech_atgm').length>=2,'ATGM teams');
 for(const u of force)u.hp=u.maxHp=1e6;
 run(s,C.warn-1);assert.strictEqual(s.cityRaid.phase,'gather','still warning before 30 s');assert.strictEqual(z.owner,'il');run(s,2);assert.ok(!s.cityRaid||s.cityRaid.phase==='attack','attack after the warning');
 run(s,90);assert.strictEqual(z.owner,'hz','empty city retaken');assert.ok(Sim.get(s,z.building),'their HQ is back');assert.ok(s.messages.some(m=>/צור נכבשה מחדש/.test(m)));assert.ok(!s.cityRaid);assert.strictEqual(s.stats.cityRaids,1)});

test('v6a a city with an Israeli ground unit inside is NOT retaken (same rule as villages)',()=>{const s=fresh();s.time=500;const z=takeCity(s,'tyre');
 const def=Sim.makeUnit(s,'merkava','il',z.x,z.y);def.hp=def.maxHp=1e7;def.trophy=999;
 const home=s.sites.filter(q=>q.owner==='hz').sort((a,b)=>Sim.dist(a,z)-Sim.dist(b,z))[0];
 for(let i=0;i<7;i++){const u=Sim.makeUnit(s,i<2?'hz_atgm':'hz_inf','hz',z.x+1+i*.3,z.y+.6,{site:home.key});u.hp=u.maxHp=1e7;u.retake=z.key;u.raid=1}
 run(s,40);assert.strictEqual(z.owner,'il','held')});

test('v6a city counterattacks scale by difficulty and survive save/restore',()=>{for(const d of ['easy','hard']){const s=fresh(d);s.time=500;takeCity(s,'tyre');s.cityRaidT=1e9;Sim.cityRaidTick(s,1/30);assert.strictEqual(s.cityRaid.ids.length,C.size[d],d)}
 const s=fresh();s.time=500;takeCity(s,'tyre');s.cityRaidT=1e9;Sim.cityRaidTick(s,1/30);const r=Sim.restore(Sim.save(s));assert.ok(r.cityRaid&&r.cityRaid.key==='tyre');run(r,C.warn+1);assert.ok(!r.cityRaid||r.cityRaid.phase==='attack')});
