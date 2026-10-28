/* LEBANON FRONT — phone UI + gestures. Simulation and rendering are independent. */
(function(){'use strict';
var D=LF.data,Sim=LF.sim,ren=LF.render.init(document.getElementById('world')),$=id=>document.getElementById(id);
var KEY='lebanonFront.save.v1',s=Sim.make(20261027,'normal'),selected=new Set(),tab='inf',diff='normal',mode='pan',pointers=new Map(),gesture=null,box=null,last=performance.now(),acc=0,uiT=0,saveT=0,fx=[],noticeT=0,modal=true;
var storage={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');noticeT=performance.now()+2800}
function save(){if(!s||s.lost)return;storage.set(KEY,Sim.save(s))}
function sharedBudget(){return typeof SHARED==='undefined'?0:SHARED.budget()}
function takeWarBudget(){if(typeof SHARED==='undefined')return;var n=SHARED.takeBudget();if(n){Sim.grant(s,n);toast('₪'+n+' מגלי מגן שמיים עברו לתקציב החזית')}}
function updateIntro(){var saved=Sim.restore(storage.get(KEY));$('continueGame').classList.toggle('hidden',!saved||saved.lost||saved.won);$('sharedLine').textContent='תקציב מלחמה ממגן שמיים: ₪'+sharedBudget().toLocaleString('he-IL')+' · משחק גם ללא מימון חיצוני';document.querySelectorAll('.diff button').forEach(b=>b.classList.toggle('active',b.dataset.diff===diff))}
function begin(continueIt){if(continueIt){s=Sim.restore(storage.get(KEY));if(!s)return;toast('המשחק נשמר — ממשיכים מהנקודה שבה עצרתם')}else{s=Sim.make((Date.now()&0xffffffff)>>>0,diff);storage.set(KEY,Sim.save(s))}
 s.paused=false;selected.clear();modal=false;$('intro').classList.add('hidden');$('end').classList.add('hidden');ren.camera(s.units.find(u=>u.id===s.hq).x+1,s.units.find(u=>u.id===s.hq).y-3,22);
 takeWarBudget();save();updateUI()}
function finish(){modal=true;s.paused=true;save();$('endTitle').textContent=s.won?'ביירות נכבשה! 🎉':'בסיס הפיקוד נפל';$('endDetail').textContent='כבשת '+s.captures+' יעדים · חיסלת '+s.kills+' יחידות · תקציב נותר ₪'+Math.floor(s.money)+'. '+(s.won?'חזית לבנון הוכרעה. חזיתות סוריה, עיראק ואיראן בהמשך.':'אפשר לנסות מחדש ולשנות אסטרטגיה.');$('end').classList.remove('hidden');if(s.won&&typeof SHARED!=='undefined')SHARED.winFront('lebanon')}
function selectedUnits(){return [...selected].map(id=>Sim.get(s,id)).filter(u=>u&&u.side==='il'&&!u.carriedBy)}
function updateTicker(){var t=$('ticker');if(!t)return;t.innerHTML=s.messages.slice(0,2).map((m,i)=>'<div'+(i?' class="old"':'')+'>'+m.replace(/</g,'&lt;')+'</div>').join('')}
function updateUI(){updateTicker();selected=new Set(selectedUnits().map(u=>u.id));$('money').textContent=Math.floor(s.money).toLocaleString('he-IL');$('captured').textContent=s.captures;$('clock').textContent=String(Math.floor(s.time/60)).padStart(2,'0')+':'+String(Math.floor(s.time%60)).padStart(2,'0');$('speed').textContent='×'+s.speed;$('pause').textContent=s.paused?'▶':'Ⅱ';$('selectMode').classList.toggle('active',mode==='select');
 var units=selectedUnits(),names=units.reduce((a,u)=>(a[D.UNITS[u.type].n]=(a[D.UNITS[u.type].n]||0)+1,a),{});
 $('selection').textContent=units.length?(units.length>2?units.length+' יחידות: ':'')+Object.entries(names).map(([k,n])=>k+(n>1?' ×'+n:'')).join(' · '):'בסיס פיקוד צפון';
 $('terrainInfo').textContent=units.length===1?(Math.ceil(units[0].hp)+'/'+units[0].maxHp+' חיים · '+D.TERRAIN[Sim.ground(units[0].x,units[0].y)].n+(units[0].cargo.length?' · '+units[0].cargo.length+' בפנים':'')):'טאפ ליחידה · גרירה להזזה';
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 var list=D.BUILD[tab];$('units').innerHTML=list.map(t=>{var u=D.UNITS[t],q=s.queue[u.q],max=D.QUEUE_MAX[u.q],blocked=s.money<u.cost||q.length>=max;return '<button data-buy="'+t+'" '+(blocked?'disabled':'')+' title="'+u.desc+'"><span>'+u.n+(u.soldiers?' <small>×8</small>':'')+'</span><span class="cost">₪'+u.cost+'</span></button>'}).join('');
 $('queue').textContent=Object.values(s.queue).flat().map(q=>D.UNITS[q.type].n+' '+Math.ceil(q.remaining)+'ש׳').join(' · ')||'בחרו יחידה לבנייה';
 $('group').disabled=units.length<2;$('split').disabled=!units.some(u=>u.soldiers>=2)&&units.length<2;
 $('unload').disabled=!units.some(u=>u.cargo.length);$('load').disabled=!units.some(u=>u.soldiers>0);$('build').disabled=!units.some(u=>u.type==='engineer')||s.money<D.UNITS.post.cost;
}
function flashFocus(t){$('focus').textContent=t;$('focus').classList.remove('hidden');setTimeout(()=>$('focus').classList.add('hidden'),3500)}
function selectOne(u){selected.clear();if(u.group){for(var v of s.units)if(v.group===u.group&&v.side==='il'&&v.hp>0&&!v.carriedBy)selected.add(v.id)}else selected.add(u.id);flashFocus(D.UNITS[u.type].n+(u.soldiers?' · '+u.soldiers+' לוחמים':'')+(u.group?' · קבוצה '+u.group:''));updateUI()}
function pickUnit(p,side){var best=null,d=Infinity;for(var u of Sim.alive(s,side)){if(u.type==='hq'||(u.side==='hz'&&Sim.inFog(s,u.x,u.y)))continue;var q=ren.screen(u.x,u.y),r=Math.hypot(q.x-p.x,q.y-p.y);if(r<(D.UNITS[u.type].building?18:15)&&r<d){best=u;d=r}}return best}
function touch(p){var mini=ren.minimapHit(p.x,p.y);if(mini){ren.camera(mini.x,mini.y);return}var own=pickUnit(p,'il'),enemy=pickUnit(p,'hz'),w=ren.world(p.x,p.y);
 if(mode==='select'&&own){if(selected.has(own.id))selected.delete(own.id);else selected.add(own.id);updateUI();return}
 if(own){selectOne(own);return}
 if(selected.size){var structure=s.sites.find(z=>Math.hypot(z.x-w.x,z.y-w.y)<2.8&&z.owner==='hz'&&!Sim.inFog(s,z.x,z.y));var target=enemy||(structure&&Sim.get(s,structure.building));
  var commandPoint=structure?{x:structure.x,y:structure.y}:target?{x:target.x,y:target.y}:w;
  var n=Sim.setOrder(s,[...selected],commandPoint,target?target.id:0);
  if(n)toast(n+' יחידות קיבלו פקודה '+(target?'לתקוף':'לנוע'));return}
 var site=s.sites.find(z=>Math.hypot(z.x-w.x,z.y-w.y)<4.2);if(site)flashFocus(site.n+' · '+(site.owner==='il'?'נכבשה':'אויב')+' · '+D.SITE_T[site.t].income+'₪ ל־15 שניות');else flashFocus(D.TERRAIN[Sim.ground(w.x,w.y)].n+' · '+D.toLonLat(w.x,w.y).lat.toFixed(2)+'°N');
}
var canvas=$('world');canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===1)gesture={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dragged:false,select:mode==='select'};
 else if(pointers.size===2){var a=[...pointers.values()];gesture={pinch:true,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),z:ren.view.z,cx:ren.view.x,cy:ren.view.y};box=null}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture)return;
 if(pointers.size===2){var a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(gesture.pinch){var mx=(a[0].x+a[1].x)/2,my=(a[0].y+a[1].y)/2,before=ren.world(mx,my);ren.camera(null,null,gesture.z*d/gesture.d);var after=ren.world(mx,my);ren.camera(ren.view.x+before.x-after.x,ren.view.y+before.y-after.y)}return}
 if(gesture.pinch)return;var dx=e.clientX-gesture.lastX,dy=e.clientY-gesture.lastY;
 if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>(gesture.select?8:16))gesture.dragged=true;
 if(gesture.dragged){if(gesture.select){box={x:Math.min(gesture.x,e.clientX),y:Math.min(gesture.y,e.clientY),w:Math.abs(e.clientX-gesture.x),h:Math.abs(e.clientY-gesture.y)}}
 else ren.camera(ren.view.x-dx/ren.view.z,ren.view.y-dy/ren.view.z)}
 gesture.lastX=e.clientX;gesture.lastY=e.clientY});
function finishPointer(e){if(!pointers.has(e.pointerId))return;e.preventDefault();pointers.delete(e.pointerId);
 if(!gesture)return;if(pointers.size){gesture=null;box=null;return}
 if(gesture.select&&gesture.dragged&&box){selected.clear();for(var u of Sim.alive(s,'il')){if(u.type==='hq'||D.UNITS[u.type].building)continue;var p=ren.screen(u.x,u.y);if(p.x>=box.x&&p.x<=box.x+box.w&&p.y>=box.y&&p.y<=box.y+box.h)selected.add(u.id)}if(selected.size)mode='pan';toast(selected.size+' יחידות נבחרו · טאפ על יעד');updateUI()}
 else if(!gesture.dragged&&!gesture.pinch)touch({x:e.clientX,y:e.clientY});box=null;gesture=null}
canvas.addEventListener('pointerup',finishPointer);canvas.addEventListener('pointercancel',finishPointer);canvas.addEventListener('wheel',e=>{e.preventDefault();ren.camera(null,null,ren.view.z*(e.deltaY>0?.86:1.14))},{passive:false});
document.querySelectorAll('.diff button').forEach(b=>b.onclick=()=>{diff=b.dataset.diff;updateIntro()});
$('newGame').onclick=()=>begin(false);$('continueGame').onclick=()=>begin(true);$('restart').onclick=()=>{s.paused=false;$('end').classList.add('hidden');$('intro').classList.remove('hidden');updateIntro()};
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;updateUI()});$('units').onclick=e=>{var b=e.target.closest('[data-buy]');if(!b)return;var t=b.dataset.buy,sp=D.UNITS[t];if(Sim.buy(s,t)){toast(sp.n+' בייצור · '+sp.time+' שניות');updateUI()}};
$('speed').onclick=()=>{s.speed=s.speed===1?2:1;toast('מהירות ×'+s.speed);updateUI()};$('pause').onclick=()=>{s.paused=!s.paused;toast(s.paused?'משחק מושהה':'ממשיכים');save();updateUI()};$('help').onclick=()=>{s.paused=true;modal=true;$('intro').classList.remove('hidden');$('newGame').classList.add('hidden');$('continueGame').classList.remove('hidden');$('continueGame').textContent='חזרה למשחק ▶';save();updateIntro()};
$('selectAll').onclick=()=>{selected.clear();var vw=ren.view;for(var u of Sim.alive(s,'il')){var sp=D.UNITS[u.type];if(sp.building||sp.move==='air'||u.flight)continue;var q=ren.screen(u.x,u.y);if(q.x>=0&&q.x<=vw.w-vw.right&&q.y>=41&&q.y<=vw.h)selected.add(u.id)}if(!selected.size)for(var u of Sim.alive(s,'il'))if(!D.UNITS[u.type].building&&D.UNITS[u.type].move!=='air')selected.add(u.id);toast(selected.size+' יחידות נבחרו · טאפ על יעד');updateUI()};
$('homeBtn').onclick=()=>{var u=Sim.get(s,s.hq);if(u)ren.camera(u.x+1,u.y-5,22)};$('selectMode').onclick=()=>{mode=mode==='select'?'pan':'select';toast(mode==='select'?'גררו מלבן לבחירת כמה יחידות':'גרירה מזיזה את המפה');updateUI()};
$('group').onclick=()=>{var g=Sim.group(s,[...selected]);if(g)toast('קבוצה '+g+' אוגדה — פקודה אחת לכולם');updateUI()};
$('split').onclick=()=>{var halves=Sim.split(s,[...selected]);if(halves.length){selected=new Set(halves[0]);toast('פיצול חצי־חצי');updateUI()}};
$('load').onclick=()=>{var army=selectedUnits().filter(u=>u.soldiers);var transport=Sim.alive(s,'il').filter(u=>D.UNITS[u.type].carry).sort((a,b)=>Math.min(...army.map(v=>Sim.dist(a,v)))-Math.min(...army.map(v=>Sim.dist(b,v))))[0];
 var n=transport&&Sim.load(s,transport.id,army.map(u=>u.id));toast(n?n+' מחלקות עלו ל'+D.UNITS[transport.type].n:'קרבו את החי״ר לנמר/מסוק פנוי');updateUI()};
$('unload').onclick=()=>{var n=selectedUnits().reduce((x,u)=>x+Sim.unload(s,u.id),0);toast(n?n+' מחלקות ירדו':'בחרו נמר או מסוק עם כוחות');updateUI()};
$('build').onclick=()=>{var e=selectedUnits().find(u=>u.type==='engineer');var id=e&&Sim.buildPost(s,e.id);toast(id?'העמדה נבנית ליד ההנדסה':'בחרו מחלקת הנדסה עם תקציב פנוי');updateUI()};
$('stop').onclick=()=>{for(var u of selectedUnits()){u.goal=null;u.path=null;u.target=0;u.hold=3;u.stand=1}toast('הכוח מחזיק את השטח ולא רודף')};
window.addEventListener('resize',()=>ren.resize());document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else if(!modal)takeWarBudget()});
function frame(now){var dt=Math.min(.10,(now-last)/1000);last=now;if(!modal&&!s.paused){acc+=dt;var steps=0;while(acc>=1/30&&steps<4){Sim.step(s,1/30);acc-=1/30;steps++;
 for(var ev of s.events){if(['shot','hit','explosion','trophy','repair'].includes(ev.kind))fx.push(ev);
 else if(ev.kind==='city'){if(typeof SHARED!=='undefined'&&D.TD_CITY[ev.key])SHARED.capture(ev.key);save();toast(ev.name+' נכבשה!'+(D.TD_CITY[ev.key]?' נוספה גם למגן שמיים':''))}
 else if(ev.kind==='win'||ev.kind==='lose'){finish()}}
 }}fx=fx.filter(e=>s.time-e.time<1.25).slice(-160);uiT+=dt;saveT+=dt;if(uiT>.25){uiT=0;updateUI()}if(saveT>25){saveT=0;save()}
 if(noticeT&&now>noticeT){$('toast').classList.remove('show');noticeT=0}
 var snapshot=Object.assign({},s,{events:fx});ren.draw(snapshot,selected,box,1);requestAnimationFrame(frame)}
updateIntro();updateUI();requestAnimationFrame(frame);
// Test hook. All gameplay uses the same simulation and UI pipeline.
window.LEBANON={get state(){return s},sim:Sim,data:D,renderer:ren,select:id=>{selected=new Set([id]);updateUI()},start:begin,save,restore:()=>Sim.restore(storage.get(KEY)),command:(ids,x,y,target)=>Sim.setOrder(s,ids,{x,y},target||0)};
})();
