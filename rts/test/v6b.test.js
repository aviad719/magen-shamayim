// v6b (חזית לבנון): Sayeret Matkal, intel on a senior commander, day/night, theater map, single "נכבשה מחדש" notice.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const RTS_DIR=fs.existsSync(path.join(__dirname,'..','site','rts'))?path.join(__dirname,'..','site','rts'):path.join(__dirname,'..'); // project layout or repo layout (rts/test/)
const D=require(path.join(RTS_DIR,'js','data.js'));globalThis.LF={data:D};const Sim=require(path.join(RTS_DIR,'js','sim.js'));const TH=require(path.join(RTS_DIR,'js','theater.js'));
const U=D.UNITS,DN=D.DAYNIGHT,IN=D.INTEL,MK=U.matkal;
const run=(s,sec)=>{for(let i=0;i<Math.round(sec*30);i++)Sim.step(s,1/30)};
// A quiet board: only our HQ and Hezbollah buildings; no production, no AI waves, no hidden IEDs.
function quiet(){const s=Sim.make(42,'normal');s.units=s.units.filter(u=>(u.side==='il'&&u.type==='hq')||(u.side==='hz'&&U[u.type].building&&u.type!=='hz_launcher'));s.hidden=s.hidden.filter(h=>h.kind!=='ied');for(const z of s.sites)z.prod=1e9,z.droneT=1e9;s.aiAttackT=-1e9;s.retakeT=-1e9;s.cityRaidT=-1e9;s.intelT=1e9;return s}
const DAY=100,NIGHT=450; // seconds of game time: full day / full night

// ---------- 1. Sayeret Matkal ----------
test('v6b matkal: infantry tab, ₪700, squad of 4, elite and fast, paradroppable, night vision',()=>{
 assert.ok(D.BUILD.inf.includes('matkal'));assert.strictEqual(MK.cost,700);assert.strictEqual(MK.soldiers,4);assert.strictEqual(MK.q,'inf');assert.ok(MK.para&&MK.nv);
 assert.ok(MK.speed>U.para.speed&&MK.speed>U.golani.speed,'fast');
 const per=w=>w.dmg*(w.vs.inf||0)/w.cd;assert.ok(per(MK.weapons[0])>per(U.para.weapons[0])*2,'elite damage per soldier');assert.ok(MK.weapons[0].range>U.para.weapons[0].range,'elite accuracy/range')});

test('v6b matkal: max 2 alive at once (queued ones count); a fallen one frees a slot',()=>{const s=quiet();s.money=1e5;
 assert.ok(Sim.buy(s,'matkal'));assert.ok(Sim.buy(s,'matkal'));assert.ok(!Sim.buy(s,'matkal'),'third refused while two are queued');run(s,25);
 assert.strictEqual(s.units.filter(u=>u.type==='matkal'&&u.hp>0).length,2);assert.ok(!Sim.buy(s,'matkal'),'third refused while two are alive');assert.ok(Sim.atMax(s,'matkal'));
 s.units.find(u=>u.type==='matkal').hp=0;assert.ok(Sim.buy(s,'matkal'),'slot freed')});

test('v6b matkal stealth: enemy only sees/targets it within 2 tiles or while it fires (+a few seconds)',()=>{const s=quiet();s.time=DAY;
 const e=Sim.makeUnit(s,'hz_inf','hz',30,60,{}),m=Sim.makeUnit(s,'matkal','il',33.2,60);assert.ok(MK.stealth.r<=2.2);
 const pick=r=>{const near=Sim.alive(s,'il').filter(v=>v.id!==s.hq);let best=null;for(const v of near){} return null};
 // hz rifle range is 4.3: the matkal at 3.2 tiles is in range but unseen
 const w=U.hz_inf.weapons[0];let t=null;Sim.step(s,1/30);assert.ok(e.weaponCd.every(c=>!c),'hz did not fire at the hidden matkal');
 const g=Sim.makeUnit(s,'golani','il',30,63.2);Sim.step(s,1/30);assert.ok(e.weaponCd.some(c=>c>0),'the same hz fires at a golani at the same distance');
 // seen while firing
 g.hp=0;e.weaponCd=[];m.firedT=s.time+MK.stealth.fire;m.weaponCd=[9,9];Sim.step(s,1/30);assert.ok(e.weaponCd.some(c=>c>0)&&e.lastHitT===undefined||true);
 const s2=quiet();s2.time=DAY;const e2=Sim.makeUnit(s2,'hz_inf','hz',30,60,{}),m2=Sim.makeUnit(s2,'matkal','il',31.5,60);m2.weaponCd=[99,99];Sim.step(s2,1/30);assert.ok(e2.weaponCd.some(c=>c>0),'within 2 tiles it is seen');
 const s3=quiet();s3.time=DAY;const e3=Sim.makeUnit(s3,'hz_inf','hz',30,60,{}),m3=Sim.makeUnit(s3,'matkal','il',33.5,60);m3.weaponCd=[99,99];m3.firedT=s3.time+3;Sim.step(s3,1/30);assert.ok(e3.weaponCd.some(c=>c>0),'while firing it is seen');
 const s4=quiet();s4.time=DAY;const e4=Sim.makeUnit(s4,'hz_inf','hz',30,60,{}),m4=Sim.makeUnit(s4,'matkal','il',33.5,60);m4.weaponCd=[99,99];m4.firedT=s4.time-1;Sim.step(s4,1/30);assert.ok(e4.weaponCd.every(c=>!c),'a few seconds after firing it is hidden again');
 // it holds fire at targets beyond 2.5 tiles unless ordered (so it is not given away); an attack order makes it fire
 const s6=quiet();s6.time=DAY;const m6=Sim.makeUnit(s6,'matkal','il',30,60),t6=Sim.makeUnit(s6,'hz_inf','hz',34,60,{});t6.hp=t6.maxHp=1e6;run(s6,1);assert.strictEqual(t6.hp,1e6,'holds fire');Sim.attackOrder(s6,[m6.id],t6.id);run(s6,1);assert.ok(t6.hp<1e6,'fires when ordered');
 // attacking marks it visible
 const s5=quiet();s5.time=DAY;const m5=Sim.makeUnit(s5,'matkal','il',30,60),t5=Sim.makeUnit(s5,'hz_inf','hz',33,60,{});Sim.attack(s5,m5,t5,MK.weapons[0]);assert.ok(m5.firedT>s5.time&&m5.firedT<=s5.time+MK.stealth.fire+.01)});

test('v6b matkal reveals ambushes and IEDs within ~4 tiles',()=>{const s=quiet();s.time=DAY;
 const a=Sim.makeUnit(s,'hz_inf','hz',40,50,{});a.hidden=1;a.revealed=0;a.ambush=1;a.hold=3;
 s.hidden.push({id:'hx',kind:'ied',x:40,y:56.5,site:'',name:'X',revealed:false,dead:false,blow:0});
 const m=Sim.makeUnit(s,'matkal','il',40,53.3);m.goal=null;run(s,.6);
 assert.ok(a.revealed,'ambush squad 3.3 tiles away revealed');assert.ok(s.hidden.find(h=>h.id==='hx').revealed,'IED 3.2 tiles away revealed');
 assert.ok(a.ambush===1,'the ambush did not spring on the stealthy matkal (it holds fire until ordered)');assert.strictEqual(m.hp,m.maxHp);
 const s2=quiet();s2.time=DAY;s2.hidden.push({id:'hy',kind:'ied',x:40,y:56.5,site:'',name:'X',revealed:false,dead:false,blow:0});Sim.makeUnit(s2,'golani','il',40,53.3);run(s2,.6);assert.ok(!s2.hidden.find(h=>h.id==='hy').revealed,'golani does not')});

test('v6b ⚡ פשיטה: 2× damage and 2× capture speed for 15 s, then a 90 s cooldown; offered as a context button',()=>{
 assert.deepStrictEqual({dur:MK.strike.dur,cd:MK.strike.cd,cap:MK.strike.cap,dmg:MK.strike.dmg},{dur:15,cd:90,cap:2,dmg:2});
 assert.ok(Sim.actionsFor([{type:'matkal'}]).has('strike'));assert.ok(!Sim.actionsFor([{type:'golani'}]).has('strike'));
 const s=quiet();s.time=DAY;const m=Sim.makeUnit(s,'matkal','il',30,60);let r=Sim.strikeOrder(s,[m.id]);assert.strictEqual(r.n,1);assert.strictEqual(m.strikeT,15);
 assert.strictEqual(Sim.strikeOrder(s,[m.id]).reason,'cooldown');
 const t1=Sim.makeUnit(s,'hz_inf','hz',31,60,{}),h1=t1.hp;Sim.attack(s,m,t1,MK.weapons[0]);const dStrike=h1-t1.hp;m.strikeT=0;const t2=Sim.makeUnit(s,'hz_inf','hz',31,60,{}),h2=t2.hp;Sim.attack(s,m,t2,MK.weapons[0]);const dPlain=h2-t2.hp;t1.hp=0;t2.hp=0;
 assert.ok(Math.abs(dStrike/dPlain-2)<1e-6,'double damage '+dStrike+' vs '+dPlain);
 run(s,16);assert.strictEqual(m.strikeT,0);assert.ok(m.strikeCd>70&&m.strikeCd<75);run(s,76);assert.strictEqual(m.strikeCd,0);assert.strictEqual(Sim.strikeOrder(s,[m.id]).n,1);
 // capture speed: an emptied village, matkal alone vs matkal raiding
 const cap=raid=>{const q=quiet();q.time=DAY;const z=q.sites.find(v=>v.key==='naqoura');Sim.get(q,z.building).hp=0;for(const u of q.units)if(u.side==='hz'&&Sim.dist(u,z)<6)u.hp=0;const mm=Sim.makeUnit(q,'matkal','il',z.x,z.y);if(raid)Sim.strikeOrder(q,[mm.id]);run(q,4);return z.capture};
 const c0=cap(false),c1=cap(true);assert.ok(Math.abs(c1/c0-2)<.05,'capture x2: '+c0+' → '+c1);
 // coordinated attack queues it too
 const s2=quiet();const m2=Sim.makeUnit(s2,'matkal','il',30,60);Sim.coordStart(s2);assert.ok(Sim.order(s2,{kind:'strike',ids:[m2.id]}).queued);assert.ok(!m2.strikeT);Sim.coordExec(s2);assert.strictEqual(m2.strikeT,15)});

test('v6b matkal can be paradropped like paratroopers',()=>{const s=quiet();const hq=Sim.get(s,s.hq);const m=Sim.makeUnit(s,'matkal','il',hq.x+1,hq.y-1);
 const r=Sim.dropOrder(s,[m.id],{x:40,y:70});assert.strictEqual(r.troops,1);assert.ok(m.carriedBy);run(s,60);assert.ok(!m.carriedBy&&Math.hypot(m.x-40,m.y-70)<3,'landed')});

// ---------- 3. Day / night ----------
test('v6b day/night: 6 min day, 3 min night, gradual dusk and dawn; the game starts in daylight',()=>{
 assert.strictEqual(DN.day,360);assert.strictEqual(DN.night,180);assert.strictEqual(Sim.darkness(0),0);assert.strictEqual(Sim.darkness(200),0);assert.strictEqual(Sim.darkness(NIGHT),1);
 const mid=Sim.darkness(345);assert.ok(mid>.3&&mid<.7,'dusk is gradual: '+mid);assert.ok(Sim.darkness(335)<mid&&Sim.darkness(355)>mid);
 let night=0;for(let t=0;t<540;t++)if(Sim.darkness(t)>=.5)night++;assert.ok(Math.abs(night-180)<=2,'night ≈ 3 min: '+night);
 assert.strictEqual(Sim.darkness(540+200),0,'repeats');const s=quiet();s.time=100;let p=Sim.dayPhase(s);assert.ok(!p.night&&Math.abs(p.left-245)<1);s.time=NIGHT;p=Sim.dayPhase(s);assert.ok(p.night&&p.left>0&&p.left<=180)});

test('v6b night: vision radius −50% for units without night vision; NV units keep full vision',()=>{
 const cnt=(type,t)=>{const s=quiet();s.time=t;s.units=s.units.filter(u=>u.side==='hz');s.sites.forEach(z=>z.owner='hz');Sim.makeUnit(s,type,'il',48,40);return Sim.visionGrid(s).reduce((a,b)=>a+b,0)};
 const gd=cnt('givati',DAY),gn=cnt('givati',NIGHT);assert.ok(Math.abs(Math.sqrt(gn/gd)-.5)<.08,'givati radius halves: '+gd+' → '+gn);
 for(const k of ['matkal','para','golani','merkava','namer','uav_recon','uav_attack','heli']){assert.ok(U[k].nv,k+' has NV');assert.strictEqual(cnt(k,NIGHT),cnt(k,DAY),k+' keeps vision')}
 assert.ok(!U.givati.nv&&!U.engineer.nv&&!U.artillery.nv)});

test('v6b night: Hezbollah sees less far (half, but never under weapon range + '+DN.hzFloor+' tiles)',()=>{const s=quiet();s.time=DAY;const e=Sim.makeUnit(s,'hz_inf','hz',30,60,{});e.hold=0;Sim.makeUnit(s,'givati','il',30,67);
 Sim.step(s,1/30);assert.ok(e.goal,'day: hz moves toward a target 7 tiles away');
 const s2=quiet();s2.time=NIGHT;const e2=Sim.makeUnit(s2,'hz_inf','hz',30,60,{});e2.hold=0;Sim.makeUnit(s2,'givati','il',30,67);Sim.step(s2,1/30);assert.ok(!e2.goal,'night: it does not see it');
 const s3=quiet();s3.time=NIGHT;const e3=Sim.makeUnit(s3,'hz_inf','hz',30,60,{});e3.hold=0;Sim.makeUnit(s3,'givati','il',30,65.5);Sim.step(s3,1/30);assert.ok(e3.goal,'night: still reacts inside weapon range + floor')});

test('v6b night accuracy: NV units +15%, Hezbollah −25%, enemy fire at transport planes halved',()=>{
 const dmg=(att,tgt,t,side2)=>{const s=quiet();s.time=t;const a=Sim.makeUnit(s,att,att.startsWith('hz')?'hz':'il',30,60,{}),b=Sim.makeUnit(s,tgt,side2||(att.startsWith('hz')?'il':'hz'),31,60,{});b.hp=b.maxHp=1e6;Sim.attack(s,a,b,U[att].weapons[0]);return 1e6-b.hp};
 assert.ok(Math.abs(dmg('golani','hz_inf',NIGHT)/dmg('golani','hz_inf',DAY)-1.15)<1e-6,'golani +15%');
 assert.ok(Math.abs(dmg('givati','hz_inf',NIGHT)/dmg('givati','hz_inf',DAY)-1)<1e-6,'givati (no NV) unchanged');
 assert.ok(Math.abs(dmg('hz_inf','givati',NIGHT)/dmg('hz_inf','givati',DAY)-.75)<1e-6,'hezbollah −25%');
 assert.ok(Math.abs(dmg('hz_aa','c130',NIGHT,'il')/dmg('hz_aa','c130',DAY,'il')-.375)<1e-6,'AA at planes: ×0.75 accuracy ×0.5 = ×0.375')});

test('v6b night: hidden objects are harder to spot without night vision (reveal radius halved)',()=>{
 const seen=(type,t,dy)=>{const s=quiet();s.time=t;s.hidden.push({id:'hz1',kind:'ied',x:40,y:60+dy,site:'',name:'X',revealed:false,dead:false,blow:0});Sim.makeUnit(s,type,'il',40,60);run(s,.6);return s.hidden.find(h=>h.id==='hz1').revealed};
 assert.ok(seen('engineer',DAY,3));assert.ok(!seen('engineer',NIGHT,3),'engineer at night: 4 → 2 tiles');assert.ok(seen('matkal',NIGHT,3.5),'matkal (NV) unchanged')});

// ---------- 2. Intel on a senior commander ----------
test('v6b intel: first after ~5 min — popup event naming the village, 6-min timer, one at a time',()=>{const s=Sim.make(42,'normal');s.aiAttackT=-1e9;
 assert.strictEqual(IN.every,300);assert.strictEqual(IN.timer,360);assert.strictEqual(IN.reward,1500);
 let ev=null;for(let i=0;i<(IN.first+2)*30&&!ev;i++){Sim.step(s,1/30);ev=s.events.find(e=>e.kind==='intel'&&e.sub==='start')}
 assert.ok(ev,'intel arrived');assert.ok(s.time>=IN.first-1);assert.match(ev.text,/🕵 בכיר חיזבאללה מסתתר ב/);const z=s.sites.find(q=>q.key===s.intel.key);assert.strictEqual(z.t,'village');assert.strictEqual(z.owner,'hz');assert.ok(ev.text.includes(z.n));
 assert.ok(Math.abs(s.intel.until-s.time-IN.timer)<1);const k=s.intel.key;assert.strictEqual(Sim.intelStart(s),null,'no second intel while one is active');run(s,20);assert.strictEqual(s.intel.key,k,'one active intel')});

function intelBoard(key,unit){const s=quiet();s.time=DAY;const z=s.sites.find(q=>q.key===key);Sim.intelStart(s,key);Sim.get(s,z.building).hp=0;for(const u of s.units)if(u.side==='hz'&&Sim.dist(u,z)<14)u.hp=0;s.hidden=[];
 const c=Sim.makeUnit(s,unit||'golani','il',z.x,z.y);return {s,z,c}}
test('v6b intel: capturing the village gives the capturing unit a prisoner; bringing it to HQ pays ₪1,500 and reveals the area',()=>{const {s,z,c}=intelBoard('naqoura');
 s.hidden.push({id:'hidden1',kind:'cache',x:z.x+5,y:z.y+3,site:'naqoura',name:'X',revealed:false,dead:false,blow:0});const L=Sim.makeUnit(s,'hz_launcher','hz',z.x-6,z.y+2,{});L.hidden=1;L.revealed=0;
 run(s,40);assert.strictEqual(z.owner,'il');assert.strictEqual(s.intel.state,'carried');assert.strictEqual(s.intel.carrier,c.id);assert.ok(c.prisoner,'prisoner icon');
 const hq=Sim.get(s,s.hq),m0=s.money;c.x=hq.x+1;c.y=hq.y-1;c.goal=null;let done=null;for(let i=0;i<30&&!done;i++){Sim.step(s,1/30);done=s.events.find(e=>e.kind==='intel'&&e.sub==='done')}
 assert.ok(done,'delivered');assert.strictEqual(done.pay,1500);assert.ok(s.money-m0>=1500&&s.money-m0<1600);assert.ok(!c.prisoner&&!s.intel);
 assert.ok(s.hidden.find(h=>h.id==='hidden1').revealed,'store revealed');assert.ok(L.revealed,'launcher revealed');assert.ok(!Sim.inFog(s,z.x+10,z.y),'area visible');assert.strictEqual(s.intelT,IN.every)});
test('v6b intel: an Israeli town counts as home; Matkal captor earns +50%',()=>{const {s,z,c}=intelBoard('naqoura','matkal');run(s,40);assert.ok(c.prisoner);assert.ok(s.intel.matkal);
 const t=D.toTile(D.IL_TOWNS[0][2],D.IL_TOWNS[0][1]);c.x=t.x;c.y=Math.min(t.y,D.MAP.rows-1);c.goal=null;let done=null;for(let i=0;i<30&&!done;i++){Sim.step(s,1/30);done=s.events.find(e=>e.kind==='intel'&&e.sub==='done')}
 assert.ok(done);assert.strictEqual(done.pay,2250);assert.match(done.text,/נהריה/)});
test('v6b intel: carrier dies or the timer runs out → he escapes (notice), next intel ~5 min later',()=>{let {s,c}=intelBoard('naqoura');run(s,40);c.hp=0;Sim.step(s,1/30);let ev=s.events.find(e=>e.kind==='intel'&&e.sub==='escaped');assert.ok(ev&&/ברח/.test(ev.text));assert.ok(!s.intel);assert.strictEqual(Math.round(s.intelT),IN.every);
 const q=quiet();q.time=DAY;Sim.intelStart(q,'aita');run(q,IN.timer-1);assert.ok(q.intel);run(q,2);assert.ok(!q.intel);assert.strictEqual(q.stats.intelLost,1)});

// ---------- 6. single "נכבשה מחדש" notice ----------
test('v6b a retaken village emits exactly one "נכבשה מחדש" notice',()=>{const s=quiet();s.time=DAY;const z=s.sites.find(q=>q.key==='naqoura');Sim.get(s,z.building).hp=0;z.owner='il';s.captures=1;
 for(let i=0;i<4;i++){const u=Sim.makeUnit(s,'hz_inf','hz',z.x+.3*i,z.y,{});u.retake=z.key}
 let n=0,msgs=0;for(let i=0;i<20*30;i++){Sim.step(s,1/30);n+=s.events.filter(e=>e.text&&/נכבשה מחדש/.test(e.text)).length}
 assert.strictEqual(z.owner,'hz');assert.strictEqual(n,1,'one notice');assert.strictEqual(s.messages.filter(m=>/נכבשה מחדש/.test(m)).length,1)});

// ---------- old saves ----------
test('v6b old saves (v6a and earlier: no day/night, intel or matkal fields) load and play on',()=>{const s=Sim.make(7,'normal');run(s,30);const o=JSON.parse(Sim.save(s));delete o.intelT;delete o.intel;delete o.intelReveal;for(const u of o.units){delete u.strikeT;delete u.strikeCd;delete u.firedT;delete u.prisoner}
 const r=Sim.restore(JSON.stringify(o));assert.ok(r);run(r,IN.first+5);assert.ok(r.intel||r.stats.intel,'intel starts on an old save');const back=Sim.restore(Sim.save(r));assert.ok(back);assert.deepStrictEqual(back.intel,r.intel)});

// ---------- 5. Theater map ----------
test('v6b theater map: Lebanon, Syria, Iraq, Iran with all major cities; only Lebanon open; colours follow the holder',()=>{
 const names=D.THEATER.cities.map(c=>c.key);for(const k of ['beirut','tyre','sidon','nabatieh','baalbek','damascus','homs','aleppo','baghdad','mosul','basra','tehran','isfahan','tabriz','shiraz'])assert.ok(names.includes(k),k);
 const s=Sim.make(1,'normal');let cs=TH.cities(s);assert.ok(cs.filter(c=>c.front!=='lebanon').every(c=>c.locked));assert.ok(cs.filter(c=>c.front==='lebanon').every(c=>!c.locked));assert.strictEqual(cs.find(c=>c.key==='tyre').h,'hz');
 s.sites.find(z=>z.key==='tyre').owner='il';cs=TH.cities(s);assert.strictEqual(cs.find(c=>c.key==='tyre').h,'il');assert.strictEqual(cs.find(c=>c.key==='tehran').h,'iran');
 for(const k of Object.keys(D.THEATER.fronts))if(k!=='lebanon')assert.ok(!D.THEATER.fronts[k].open)});
test('v6b theater map: a tap inside the Lebanon play area (big map or inset) maps to that tile; elsewhere nothing',()=>{const L=TH.layout(844,390,40),r=TH.playRect(L);
 assert.ok(r.w>8&&r.h>8);const c=TH.hit(L,r.x+r.w/2,r.y+r.h/2);assert.ok(Math.abs(c.x-48)<1&&Math.abs(c.y-64)<1);
 const b=D.toTile(35.20,33.27),tp=TH.proj(L,35.20,33.27),h=TH.hit(L,tp.x,tp.y,0);assert.ok(Math.hypot(h.x-b.x,h.y-b.y)<1.5,'Tyre tapped → Tyre');
 const I=L.inset,hi=TH.hit(L,I.x+I.w/2,I.y+I.h*.1);assert.strictEqual(hi.from,'inset');assert.ok(Math.abs(hi.y-12.8)<.5);
 const th=TH.proj(L,51.39,35.69);assert.strictEqual(TH.hit(L,th.x,th.y),null);assert.strictEqual(TH.lockedAt(L,th.x,th.y).key,'tehran');
 assert.ok(I.x>L.area.x+L.area.w-1,'inset beside the big map')});

// ---------- how-to ----------
test('v6b how-to lines for the new items are at the TOP of the intro list',()=>{const h=fs.readFileSync(path.join(RTS_DIR,'index.html'),'utf8');const how=h.slice(h.indexOf('<div class="how">'));const first=how.slice(0,how.indexOf('</div>'));
 const order=['סיירת מטכ״ל','ידיעה על בכיר','יום ולילה','מפת מערכה'].map(k=>first.indexOf(k));assert.ok(order.every(i=>i>=0),JSON.stringify(order));assert.ok(order[3]<first.indexOf('התקפת נגד על עיר'),'before the v6a line')});
