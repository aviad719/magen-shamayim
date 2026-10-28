// LEBANON FRONT v3 tests: UAV/helicopter area-defence patrol routes, engineers blow only what the player picked, tunnel exits.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const PROJ=fs.existsSync(path.join(__dirname,'..','site','rts'));
const S_DIR=PROJ?path.join(__dirname,'..','site'):path.join(__dirname,'..','..','tower-defense','site'),RTS_DIR=PROJ?path.join(S_DIR,'rts'):path.join(__dirname,'..');
const D=require(path.join(RTS_DIR,'js','data.js'));globalThis.LF={data:D};const Sim=require(path.join(RTS_DIR,'js','sim.js'));
const U=D.UNITS;
function fresh(diff){const s=Sim.make(42,diff||'normal');s.units=s.units.filter(u=>(u.side==='il'&&u.type==='hq')||u.type==='hz_launcher'||(u.side==='hz'&&U[u.type].building));return s}
const at=(s,type,side,x,y,o)=>Sim.makeUnit(s,type,side,x,y,o);
const run=(s,sec,each)=>{for(let i=0;i<Math.round(sec*30);i++){Sim.step(s,1/30);if(each)each()}};
// a patrol box over the Galilee, south of the front, away from Hezbollah anti-air
function box(s){const hq=Sim.get(s,s.hq);return [{x:hq.x-8,y:hq.y-4},{x:hq.x+8,y:hq.y-4},{x:hq.x+8,y:hq.y-9}]}

test('patrol: a UAV loops its waypoints in order and keeps looping',()=>{const s=fresh();const hq=Sim.get(s,s.hq);const a=at(s,'uav_attack','il',hq.x,hq.y-4);a.loiter=9999;
 const pts=box(s);assert.strictEqual(Sim.setRoute(s,[a.id],pts),1);assert.strictEqual(a.route.length,3);
 const seen=[];run(s,60,()=>{for(let i=0;i<pts.length;i++)if(Sim.dist(a,pts[i])<.6&&seen[seen.length-1]!==i)seen.push(i)});
 assert.ok(seen.length>=5,'visited '+seen.join(','));for(let k=1;k<seen.length;k++)assert.strictEqual(seen[k],(seen[k-1]+1)%3,'order '+seen.join(','));
 assert.ok(seen.join('').includes('012')&&seen.slice(1).includes(0),'came back to the first point: loop')});

test('patrol: an enemy entering range is engaged, then the UAV resumes the route',()=>{const s=fresh();const hq=Sim.get(s,s.hq);const a=at(s,'uav_attack','il',hq.x-8,hq.y-4);a.loiter=9999;
 const pts=box(s);Sim.setRoute(s,[a.id],pts);run(s,1);
 const far=at(s,'hz_inf','hz',hq.x+20,hq.y-14);far.hold=0;// outside range: ignored
 const foe=at(s,'tech_mg','hz',hq.x+1,hq.y-7);foe.raid=1;foe.hold=0;
 let engaged=false;run(s,25,()=>{if(a.target===foe.id)engaged=true;if(a.target===far.id)assert.fail('chased an enemy far from the route')});
 assert.ok(engaged,'targeted the technical that came into range');assert.ok(foe.hp<=0,'technical destroyed, hp='+foe.hp);
 run(s,2);assert.ok(!a.pEng&&a.target===0,'engagement over');assert.ok(a.goal&&pts.some(p=>p.x===a.goal.x&&p.y===a.goal.y),'heading back to a route waypoint');
 assert.ok(a.route&&a.route.length===3,'route kept')});

test('patrol: attack UAV ignores tanks and buildings, recon UAV only hunts drones',()=>{const s=fresh();const hq=Sim.get(s,s.hq);
 const a=at(s,'uav_attack','il',hq.x,hq.y-10),r=at(s,'uav_recon','il',hq.x,hq.y-10),tank=at(s,'hz_tank','hz',hq.x,hq.y-8),inf=at(s,'hz_inf','hz',hq.x+1,hq.y-9),dr=at(s,'drone','hz',hq.x-1,hq.y-9);
 assert.ok(!Sim.patrolSuits(a,tank)&&Sim.patrolSuits(a,inf)&&!Sim.patrolSuits(a,dr));assert.ok(Sim.patrolSuits(r,dr)&&!Sim.patrolSuits(r,inf));
 const L=Sim.launchers(s)[0];assert.ok(Sim.patrolSuits(a,L),'attack UAV takes on a launcher');
 const site=s.units.find(u=>u.side==='hz'&&U[u.type].building&&!U[u.type].launcher);assert.ok(!Sim.patrolSuits(a,site),'not an HQ building');
 assert.ok(Sim.canPatrol(at(s,'heli','il',1,1))&&!Sim.canPatrol(at(s,'jet','il',1,1))&&!Sim.canPatrol(at(s,'golani','il',1,1)),'helis yes, jets/ground no')});

test('patrol: low fuel → back to base → refuel/rearm/heal → straight back to the route, again and again',()=>{const s=fresh();const hq=Sim.get(s,s.hq);const a=at(s,'uav_attack','il',hq.x,hq.y-8);
 const pts=box(s);Sim.setRoute(s,[a.id],pts);a.loiter=3;a.hp=a.maxHp*.6;a.ammo=2;const phases=[];let last='';
 for(let i=0;i<90*30&&phases.length<4;i++){Sim.step(s,1/30);const ph=a.flight||'route';if(ph!==last){phases.push(ph);last=ph}}
 assert.deepStrictEqual(phases.slice(0,4),['route','return','rearm','route'],phases.join('>'));
 assert.ok(a.hp>=a.maxHp*.9,'healed to '+Math.round(a.hp/a.maxHp*100)+'%');assert.strictEqual(a.ammo,U.uav_attack.ammo,'rearmed');assert.ok(a.loiter>20,'refuelled');
 assert.ok(a.route&&a.route.length===3,'route survives the trip home');assert.ok(s.messages.some(m=>m.includes('חזר לנתיב')),'back-on-route message');
 // badly hit: goes home early even with fuel left
 const b=at(s,'uav_attack','il',hq.x,hq.y-12);Sim.setRoute(s,[b.id],pts);b.loiter=999;b.hp=b.maxHp*.3;run(s,.2);assert.strictEqual(b.flight,'return','low health sends it home')});

test('patrol: "החזק" clears the route, a new route replaces it, a move order clears it, and it survives save/restore',()=>{const s=fresh();const hq=Sim.get(s,s.hq);
 const a=at(s,'uav_recon','il',hq.x,hq.y-6),h=at(s,'heli','il',hq.x+1,hq.y-6);const pts=box(s);
 assert.strictEqual(Sim.setRoute(s,[a.id,h.id],pts),2,'recon UAV and helicopter both take a route');
 const raw=Sim.save(s),o=Sim.restore(raw);assert.strictEqual(Sim.get(o,a.id).route.length,3,'route persisted in the save');
 Sim.setRoute(s,[a.id],[{x:hq.x,y:hq.y-20},{x:hq.x+3,y:hq.y-22}]);assert.strictEqual(a.route.length,2,'new route replaces the old one');
 assert.strictEqual(Sim.hold(s,[a.id]),1);assert.strictEqual(a.route,null,'hold clears');assert.strictEqual(a.goal,null,'and stops');run(s,3);assert.ok(Sim.dist(a,{x:hq.x,y:hq.y-6})<3,'stays put');
 Sim.setOrder(s,[h.id],{x:hq.x,y:hq.y-3});assert.strictEqual(h.route,null,'a normal move order clears the route')});

test('engineers: tapping a specific target sends them THERE (not to the nearest) and they blow that one',()=>{const s=fresh();
 const ts=s.hidden.filter(q=>q.kind==='tunnel'),A=ts[0],B=s.hidden.filter(q=>q.kind==='cache').sort((p,q)=>Sim.dist(p,A)-Sim.dist(q,A))[0];A.revealed=B.revealed=true;
 const e=at(s,'engineer','il',A.x+1.2,A.y);e.hp=e.maxHp=9999;const got=Sim.blowOrder(s,[e.id],B.id);assert.ok(got&&got.key===B.id,'target = the store the player picked');
 run(s,Sim.dist(A,B)/U.engineer.speed*2.2+12);assert.ok(B.dead,'picked store blown');assert.ok(!A.dead&&A.blow===0,'the nearer shaft was left alone')});

test('engineers do not blow anything on their own, even walking right over a revealed shaft',()=>{const s=fresh();s.units=s.units.filter(u=>u.side==='il');const A=s.hidden.find(q=>q.kind==='tunnel');A.revealed=true;
 const e=at(s,'engineer','il',A.x-3,A.y);e.hp=e.maxHp=9999;Sim.setOrder(s,[e.id],{x:A.x,y:A.y});run(s,12);assert.ok(Sim.dist(e,A)<1.5,'standing on it');assert.strictEqual(A.blow,0,'no automatic blowing');assert.ok(!A.dead);
 assert.strictEqual(Sim.blowOrder(s,[e.id],null).key,A.id,'"💥" with no pick blows what they stand on');run(s,6);assert.ok(A.dead)});

test('tunnel exits: revealed when a unit gets close, engineers can seal them; a sealed exit stops pop-outs; the shaft stays until blown',()=>{const s=fresh();s.time=D.DIFF.normal.grace+1;
 const h=s.hidden.find(q=>q.kind==='tunnel');h.popT=9999;const g=at(s,'golani','il',h.ex+2,h.ey);run(s,1);assert.ok(h.exitSeen&&!h.revealed,'exit seen, shaft still hidden');
 const t=Sim.hiddenAt(s,{x:h.ex,y:h.ey});assert.ok(t&&t.kind==='exit','the exit is a tappable target');
 const e=at(s,'engineer','il',h.ex+4,h.ey+1);const m0=s.money;assert.ok(Sim.blowOrder(s,[e.id],t.key));run(s,14);
 assert.ok(h.exitDead&&!h.dead,'exit sealed, shaft alive');assert.ok(s.money>=m0+D.HIDDEN.exit.bounty,'bounty');assert.ok(s.messages.some(m=>m.includes('נאטמה')));
 h.popT=.05;run(s,.5);assert.ok(!s.units.some(u=>u.tunnel===h.id&&u.hp>0),'no pop-outs from a sealed exit')});

test('blowing a shaft also seals its exit; every revealed object type is actionable',()=>{const s=fresh();const h=s.hidden.find(q=>q.kind==='tunnel');h.revealed=true;
 assert.ok(Sim.hiddenAt(s,h).kind==='tunnel'&&Sim.hiddenAt(s,{x:h.ex,y:h.ey}).kind==='exit','shaft + exit tappable');
 const c=s.hidden.find(q=>q.kind==='cache');c.revealed=true;assert.strictEqual(Sim.hiddenAt(s,c).kind,'cache','store tappable');
 Sim.blowUp(s,h);assert.ok(h.dead&&h.exitDead,'exit sealed with the shaft');assert.ok(!Sim.hiddenAt(s,{x:h.ex,y:h.ey}),'nothing left there');
 // launchers are handled by attack orders
 const L=Sim.launchers(s)[0];L.revealed=1;const j=at(s,'jet','il',L.x+3,L.y);Sim.setOrder(s,[j.id],{x:L.x,y:L.y},L.id);run(s,6);assert.ok(L.hp<=0,'launcher destroyed by a jet attack order')});

test('RTS page v3: route + engineer how-to, TD switch not at the bottom, safe-area insets in both games',()=>{const h=fs.readFileSync(path.join(RTS_DIR,'index.html'),'utf8'),css=fs.readFileSync(path.join(RTS_DIR,'style.css'),'utf8');
 assert.match(h,/id="route"/);assert.match(h,/id="routeDone"/);assert.ok(h.includes('נתיב')&&h.includes('יציאת מנהרה'));assert.match(h,/viewport-fit=cover/);
 for(const side of ['bottom','left','right','top'])assert.ok(css.includes('safe-area-inset-'+side),'rts css '+side);
 const td=fs.readFileSync(path.join(S_DIR,'index.html'),'utf8'),tdcss=fs.readFileSync(path.join(S_DIR,'styles.css'),'utf8');assert.match(td,/viewport-fit=cover/);assert.ok(tdcss.includes('safe-area-inset-bottom'),'td css bottom')});
