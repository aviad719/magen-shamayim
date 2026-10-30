/* LEBANON FRONT — phone UI + gestures. Simulation and rendering are independent. */
(function(){'use strict';
var D=LF.data,Sim=LF.sim,ren=LF.render.init(document.getElementById('world')),$=id=>document.getElementById(id);
var aim=null,KEY='lebanonFront.save.v1',s=Sim.make(20261027,'normal'),selected=new Set(),tab='inf',diff='normal',mode='pan',pointers=new Map(),gesture=null,box=null,last=performance.now(),acc=0,uiT=0,saveT=0,fx=[],noticeT=0,modal=true,lastL=-1,draft=null;
var storage={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
var lastToast={text:'',t:0};
// v6b: the same text within 3 s is shown once (the sim used to emit some notices twice: message + map event)
function toast(text){var now=performance.now();if(text===lastToast.text&&now-lastToast.t<3000)return;lastToast={text,t:now};$('toast').textContent=text;$('toast').classList.add('show');noticeT=performance.now()+2800}
function save(){if(!s||s.lost)return;storage.set(KEY,Sim.save(s))}
// v5: every order goes through run(): executed now, or queued while "⚔ תיאום התקפה" is on (shown as dashed lines until "✓ בצע").
var ORD_N={strike:'⚡ פשיטה',move:'תנועה',attack:'תקיפה',blow:'פיצוץ',deploy:'פריסה',fire:'🔥 אש',smoke:'🌫 עשן',drop:'🪂 הצנחה',supply:'📦 אספקה',route:'✈ נתיב',pack:'קיפול',hold:'החזק',sweep:'🔍 סריקה',load:'העלאה',unload:'הורדה',build:'בנייה'};
function run(o){var r=Sim.order(s,o);if(r&&r.queued){toast('📝 '+ORD_N[o.kind]+' נשמרה לתיאום ('+r.queued+' פקודות) · ״✓ בצע״ מוציא את כולן יחד');updateCoord()}return r}
function queued(r){return !!(r&&r.queued)}
function updateCoord(){var on=!!s.coord,b=$('coordBar');document.body.classList.toggle('coord',on);if(b)b.classList.toggle('hidden',!on);var btn=$('coordBtn');if(btn)btn.classList.toggle('active',on);
 if(on){var n=s.coord.orders.length;$('coordInfo').textContent='⚔ מצב תיאום התקפה · '+(n?n+' פקודות ממתינות':'תנו פקודות: הן נשמרות ולא מתבצעות');$('coordGo').disabled=!n}}
function coordToggle(){if(s.coord){toast('כבר במצב תיאום · ״✓ בצע״ או ״✖ בטל״');return}if(mode==='route')endRoute(false);if(mode==='aim')endAim();Sim.coordStart(s);updateCoord();toast('⚔ תיאום התקפה: כל פקודה נשמרת כקו מקווקו. ״✓ בצע״ מוציא את כולן בבת אחת')}
function coordGo(){if(mode==='aim')endAim();if(mode==='route')endRoute(false);var n=s.coord?s.coord.orders.length:0;Sim.coordExec(s);updateCoord();toast(n?'⚔ בצע! '+n+' פקודות יצאו בבת אחת':'אין פקודות ממתינות');updateUI()}
function coordCancel(){if(mode==='aim')endAim();if(mode==='route')endRoute(false);var n=Sim.coordCancel(s);updateCoord();toast(n?'✖ '+n+' הפקודות שניתנו בתיאום בוטלו':'יצאתם ממצב תיאום');updateUI()}
// v5: control groups 1-4: long press stores the selection, tap selects, double tap also centres the camera
var cgTap={n:0,t:0},cgPress=null;
function cgSave(n){var ids=selectedUnits().filter(u=>!D.UNITS[u.type].building).map(u=>u.id);if(!ids.length){toast('בחרו יחידות ואז לחיצה ארוכה על '+n+' כדי לשמור קבוצה');return 0}var k=Sim.setCtrlGroup(s,n,ids);toast('קבוצה '+n+' נשמרה ('+k+' יחידות)');updateGroups();return k}
function cgSelect(n,center){var ids=Sim.ctrlGroup(s,n);if(!ids.length){toast('קבוצה '+n+' ריקה · בחרו יחידות ולחיצה ארוכה על '+n);return 0}selected=new Set(ids);
 if(center){var us=ids.map(id=>Sim.get(s,id)).filter(Boolean),cx=us.reduce((a,u)=>a+u.x,0)/us.length,cy=us.reduce((a,u)=>a+u.y,0)/us.length;ren.camera(cx,cy)}
 flashFocus('קבוצה '+n+' · '+ids.length+' יחידות'+(center?' · המצלמה עליה':''));updateUI();return ids.length}
function cgTapped(n){var now=performance.now();var dbl=cgTap.n===n&&now-cgTap.t<D.CTRL.doubleTap;cgTap={n,t:dbl?0:now};return cgSelect(n,dbl)}
function updateGroups(){for(var n=1;n<=D.CTRL.groups;n++){var b=$('cg'+n);if(!b)continue;var k=Sim.ctrlGroup(s,n).length;b.classList.toggle('has',k>0);var sm=b.querySelector('small');if(sm)sm.textContent=k?k:''}}
function sharedBudget(){return typeof SHARED==='undefined'?0:SHARED.budget()}
// v4: no automatic take of the war budget. Money moves only through the "⇄ קופה" transfer dialog (both directions).
var xferWas=false;function openTransfer(){if(typeof TRANSFER==='undefined'||typeof SHARED==='undefined')return false;xferWas=s.paused;s.paused=true;
 return TRANSFER.open({here:'חזית לבנון',wallet:{get:()=>s.money,set:v=>{s.money=Math.max(0,v)}},note:'הקופה המשותפת עוברת בין חזית לבנון למגן שמיים. בונוס כל גל במגן שמיים נכנס אליה.',
  onClose:()=>{s.paused=xferWas;save();updateUI()},onDone:(n,d)=>{if(n)toast(d==='out'?'₪'+n+' נשלחו לקופה המשותפת (למגן שמיים)':'₪'+n+' מהקופה המשותפת נכנסו לתקציב החזית')}})}
function updateIntro(){var saved=Sim.restore(storage.get(KEY));$('continueGame').classList.toggle('hidden',!saved||saved.lost||saved.won);$('sharedLine').textContent='קופה משותפת עם מגן שמיים: ₪'+sharedBudget().toLocaleString('he-IL')+' · מעבירים כסף בכפתור ״⇄ קופה״ למעלה, לשני הכיוונים';document.querySelectorAll('.diff button').forEach(b=>b.classList.toggle('active',b.dataset.diff===diff))}
function begin(continueIt){if(continueIt){s=Sim.restore(storage.get(KEY));if(!s)return;toast('המשחק נשמר — ממשיכים מהנקודה שבה עצרתם')}else{s=Sim.make((Date.now()&0xffffffff)>>>0,diff);storage.set(KEY,Sim.save(s))}
 s.paused=false;selected.clear();modal=false;$('intro').classList.add('hidden');$('end').classList.add('hidden');ren.camera(s.units.find(u=>u.id===s.hq).x+1,s.units.find(u=>u.id===s.hq).y-3,22);
 lastL=-1;save();insets();updateCoord();updateUI()}
function finish(){lastL=-1;updateLaunchers();modal=true;s.paused=true;save();$('endTitle').textContent=s.won?'ביירות נכבשה! 🎉':'בסיס הפיקוד נפל';$('endDetail').textContent='כבשת '+s.captures+' יעדים · חיסלת '+s.kills+' יחידות · תקציב נותר ₪'+Math.floor(s.money)+'. '+(s.won?'חזית לבנון הוכרעה. חזיתות סוריה, עיראק ואיראן בהמשך.':'אפשר לנסות מחדש ולשנות אסטרטגיה.');$('end').classList.remove('hidden');if(s.won&&typeof SHARED!=='undefined')SHARED.winFront('lebanon')}
function selectedUnits(){return [...selected].map(id=>Sim.get(s,id)).filter(u=>u&&u.side==='il'&&!u.carriedBy)}
function updateTicker(){var t=$('ticker');if(!t)return;t.innerHTML=s.messages.slice(0,2).map((m,i)=>'<div'+(i?' class="old"':'')+'>'+m.replace(/</g,'&lt;')+'</div>').join('')}
function updateLaunchers(){var n=s.won?0:Sim.launchersAlive(s),el=$('launchers');if(el){el.querySelector('b').textContent=n;el.classList.toggle('none',!n);el.title=n?'כל אזור שיגור פעיל מוסיף רקטות לגלים במגן שמיים':'כל המשגרים הושמדו'}
 if(n!==lastL&&!modal){lastL=n;if(typeof SHARED!=='undefined'&&SHARED.setLaunchers)SHARED.setLaunchers(n,'lebanon')}}
function supText(u){var l=Sim.supplyLevel(u);if(!l)return '';return (l.ammo!==null?' · תחמ׳ '+Math.round(l.ammo*100)+'%':'')+(l.fuel!==null?' · דלק '+Math.round(l.fuel*100)+'%':'')}
function updateUI(){updateTicker();var pl=$('pool');if(pl)pl.textContent='₪'+sharedBudget().toLocaleString('he-IL');updateLaunchers();selected=new Set(selectedUnits().map(u=>u.id));$('money').textContent=Math.floor(s.money).toLocaleString('he-IL');$('captured').textContent=s.captures;$('clock').textContent=String(Math.floor(s.time/60)).padStart(2,'0')+':'+String(Math.floor(s.time%60)).padStart(2,'0');$('speed').textContent='×'+s.speed;$('pause').textContent=s.paused?'▶':'Ⅱ';$('selectMode').classList.toggle('active',mode==='select');
 var units=selectedUnits(),names=units.reduce((a,u)=>(a[D.UNITS[u.type].n]=(a[D.UNITS[u.type].n]||0)+1,a),{});
 $('selection').textContent=units.length?(units.length>2?units.length+' יחידות: ':'')+Object.entries(names).map(([k,n])=>k+(n>1?' ×'+n:'')).join(' · '):'בסיס פיקוד צפון';
 $('terrainInfo').textContent=units.length===1?(Math.ceil(units[0].hp)+'/'+units[0].maxHp+' חיים · '+D.TERRAIN[Sim.ground(units[0].x,units[0].y)].n+(units[0].cargo.length?' · '+units[0].cargo.length+' בפנים':'')+supText(units[0])+(units[0].route?' · ✈ בנתיב':'')+(units[0].blowT?' · 🎯 בדרך ליעד':'')+v4Info(units[0])):'טאפ ליחידה · גרירה להזזה';
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 var list=D.BUILD[tab];$('units').innerHTML=list.map(t=>{var u=D.UNITS[t],q=s.queue[u.q],max=D.QUEUE_MAX[u.q],full=Sim.atMax&&Sim.atMax(s,t),blocked=s.money<u.cost||q.length>=max||full;return '<button data-buy="'+t+'" '+(blocked?'disabled':'')+' title="'+u.desc+(full?' · כבר יש '+u.maxAlive+' (המקסימום)':'')+'"><span>'+u.n+(u.soldiers?' <small>×'+u.soldiers+'</small>':'')+(u.maxAlive?' <small>'+Sim.aliveOf(s,t)+'/'+u.maxAlive+'</small>':'')+'</span><span class="cost">₪'+u.cost+'</span></button>'}).join('')+(tab==='air'?'<button class="support" data-support="supplydrop" '+(s.money<D.SUPPLY_DROP.cost?'disabled':'')+' title="'+D.SUPPLY_DROP.desc+'"><span>📦 '+D.SUPPLY_DROP.n+'</span><span class="cost">₪'+D.SUPPLY_DROP.cost+'</span></button>':'');
 $('queue').textContent=Object.values(s.queue).flat().map(q=>D.UNITS[q.type].n+' '+Math.ceil(q.remaining)+'ש׳').join(' · ')||'בחרו יחידה לבנייה';
 $('group').disabled=units.length<2;$('split').disabled=!units.some(u=>u.soldiers>=2)&&units.length<2;
 $('unload').disabled=!units.some(u=>u.cargo.length);$('load').disabled=!units.some(u=>u.soldiers>0);$('build').disabled=!units.some(u=>u.type==='engineer')||s.money<D.UNITS.post.cost;$('blow').disabled=!units.some(u=>u.type==='engineer');$('route').disabled=!units.some(u=>Sim.canPatrol(u));updateActions(units);v4Buttons(units);updateGroups();updateCoord();if(mode==='aim'&&aim&&aim.action!=='supply'&&!aim.ids.some(id=>selected.has(id)))endAim();$('route').classList.toggle('active',mode==='route');if(mode==='route'&&!units.some(u=>Sim.canPatrol(u)))endRoute(false);v6UI(units);
}

// ===== v6b UI: day/night clock, intel chip + popup, "⚡ פשיטה", theater map =====
function mmss(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
function v6UI(units){var dp=Sim.dayPhase(s),dn=$('daynight');if(dn){dn.innerHTML=(dp.night?'🌙':'☀')+' <b>'+mmss(dp.left)+'</b>';dn.classList.toggle('night',dp.night);dn.title=dp.night?'לילה: רואים חצי (חוץ מיחידות עם אמצ״ל) · עוד '+mmss(dp.left)+' עד הזריחה':'יום · עוד '+mmss(dp.left)+' עד הלילה'}
 document.body.classList.toggle('night',dp.night);
 var it=s.intel,chip=$('intelChip');if(chip){chip.classList.toggle('hidden',!it);if(it){var left=it.until-s.time;chip.innerHTML='🕵 '+(it.state==='carried'?'⛓ החזירו לבסיס/עיר בארץ':'בכיר ב'+it.n)+' · <b>'+mmss(left)+'</b>';chip.classList.toggle('urgent',left<60)}}
 var sb=$('strike');if(sb){var mk=(units||[]).filter(u=>D.UNITS[u.type].strike),ready=mk.filter(u=>!(u.strikeCd>0));sb.disabled=!ready.length;
  var act=mk.some(u=>u.strikeT>0);sb.classList.toggle('active',act);sb.textContent=act?'⚡ '+Math.ceil(Math.max(...mk.map(u=>u.strikeT||0)))+'ש׳':mk.length&&!ready.length?'⏳ '+Math.ceil(Math.min(...mk.map(u=>u.strikeCd)))+'ש׳':'⚡ פשיטה'}
 var ik=it&&it.state==='hiding'?it.key+'@'+Math.round(it.t0):'';if(ik&&ik!==lastIntel){lastIntel=ik;showPop(it.text||('🕵 בכיר חיזבאללה מסתתר ב'+it.n),it.x,it.y,'start')}}
var popT=0,lastIntel='';function showPop(text,x,y,sub){var p=$('intelPop');if(!p)return;p.querySelector('.txt').textContent=text;p.className='intelPop '+sub;clearTimeout(popT);popT=setTimeout(()=>p.classList.add('hidden'),sub==='start'?6500:4500)}
function intelEvent(ev){if(ev.sub!=='start')toast(ev.text);if(ev.sub==='start'){lastIntel=ev.key+'@'+Math.round(s.intel?s.intel.t0:0);showPop(ev.text,ev.x,ev.y,'start')}else if(ev.sub==='done'||ev.sub==='escaped')showPop(ev.text,ev.x,ev.y,ev.sub)}
function intelJump(){var it=s.intel;if(!it)return;var c=it.carrier&&Sim.get(s,it.carrier);if(c&&it.state==='carried'){var q=c.carriedBy?Sim.get(s,c.carriedBy)||c:c;ren.camera(q.x,q.y);selected=new Set([c.id]);updateUI()}else ren.camera(it.x,it.y)}
var thWas=null,thL=null;
function thView(){var a=ren.world(0,0),b=ren.world(ren.view.w-ren.view.right,ren.view.h);return {x0:a.x,y0:a.y,x1:b.x,y1:b.y}}
function drawTheater(){var c=$('thCanvas');if(!c||$('theater').classList.contains('hidden'))return;var dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px';var g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
 var top=Math.max(40,(ren.view.it||0)+36);thL=LF.theater.layout(W-(ren.view.ir||0)-(ren.view.il||0),H-(ren.view.ib||0),top);g.translate(ren.view.il||0,0);LF.theater.draw(g,thL,s,{tile:ren.tile,view:thView()})}
var thTimer=0;
function openTheater(){if(!LF.theater)return false;if(!window.GEO&&!document.getElementById('geoScript')){var sc=document.createElement('script');sc.id='geoScript';sc.src='../geo.js';sc.onload=()=>drawTheater();document.body.appendChild(sc)}
 if($('theater').classList.contains('hidden')){thWas=s.paused;s.paused=true}$('theater').classList.remove('hidden');drawTheater();clearInterval(thTimer);thTimer=setInterval(drawTheater,500);return true}
function closeTheater(){if($('theater').classList.contains('hidden'))return;$('theater').classList.add('hidden');clearInterval(thTimer);s.paused=!!thWas;updateUI()}
function theaterTap(x,y){if(!thL)return null;var lx=x-(ren.view.il||0),h=LF.theater.hit(thL,lx,y);if(h){closeTheater();ren.camera(h.x,h.y);toast('🗺 קפיצה ל'+(nearSite(h)||'חזית לבנון'));return h}
 var lk=LF.theater.lockedAt(thL,lx,y);if(lk){toast('🔒 '+lk.n+' · חזית '+D.THEATER.fronts[lk.front].n+' נעולה. נפתחת אחרי הניצחון בלבנון');return null}return null}
function nearSite(p){var b=null,bd=6;for(var z of s.sites){var d=Sim.dist(z,p);if(d<bd){bd=d;b=z.n}}return b}

// v4: the order grid shows only the buttons that fit the selected unit types (union for a mixed selection)
var ACTIONS=['stop','group','split','load','unload','build','blow','route','drop','deploy','fire','smoke','pack','sweep','strike'];
function updateActions(units){var a=Sim.actionsFor(units);for(var id of ACTIONS){var b=$(id);if(b)b.classList.toggle('hidden',!a.has(id))}
 var types=[...new Set(units.map(u=>u.type))];$('attackInfo').textContent=types.length===1?Sim.attacksText(types[0]):types.length>1&&types.length<=2?types.map(t=>D.UNITS[t].n+': '+Sim.attacksText(t).replace('🎯 ','')).join(' | '):''}
// v5 (B6): an attack order: units that cannot damage the target get a warning and stay put; a deployed battery in range fires at the enemy.
function attackPlan(sel,target){var tsp=D.UNITS[target.type],ok=[],cant=[],arty=[];for(var u of sel){if(D.UNITS[u.type].barrage)arty.push(u);else if(Sim.canDamage(u.type,target.type))ok.push(u);else cant.push(u)}
 var warn='';if(cant.length){var names=[...new Set(cant.map(u=>D.UNITS[u.type].n))].join(', '),first=cant[0].type,what=Sim.attacksText(first).replace(/^🎯 (תוקף: )?/,'').split(' · ')[0];
  warn='⚠ '+names+' לא יכול'+(cant.length>1?'ים':'')+' לפגוע ב'+tsp.n+' ולכן לא יוצא'+(cant.length>1?'ים':'')+' · '+D.UNITS[first].n+' תוקף רק: '+what}
 return {ok,cant,arty:arty.filter(u=>(u.art&&u.art.st)==='deployed'),allArty:arty,warn}}
function attackText(sel,target,r,plan){var parts=[];if(r.n)parts.push(r.n+' יחידות קיבלו פקודה לתקוף');
 if(r.fired)parts.push('🔥 התותחנים יורים על '+D.UNITS[target.type].n+' · '+AR.fire.warn+' שניות עד הפגיעה');
 else if(r.arty)parts.push({range:'💥 המטרה מחוץ לטווח התותחנים',tooClose:'💥 המטרה קרובה מדי לתותחנים',cooldown:'💥 האש של התותחנים בטעינה',ammo:'💥 לתותחנים אין תחמושת',notDeployed:'💥 תותחנים יורים רק כשהם פרוסים (״פריסה״)'}[r.artyReason]||'💥 התותחנים לא יכולים לירות לשם');
 if(plan.warn)parts.push(plan.warn);return parts.join(' · ')||'אין יחידה שיכולה לתקוף את המטרה'}

// ===== v4 stage 2: artillery / paratroopers / supply drop / Golani sweep controls =====
var AR=D.ARTY;
function arties(){return selectedUnits().filter(u=>D.UNITS[u.type].barrage)}
function paras(){return selectedUnits().filter(u=>D.UNITS[u.type].para)}
function golanis(){return selectedUnits().filter(u=>D.UNITS[u.type].sweep)}
function artSt(u){return (u.art&&u.art.st)||''}
function v4Info(u){var sp=D.UNITS[u.type],t='';if(sp.barrage){var a=u.art||{},st=a.st||'';t+=st==='deployed'?' · פרוס':st==='deploying'?' · נפרס '+Math.ceil(a.t)+'ש׳':st==='packing'?' · מתקפל':st==='goto'?' · בדרך לפריסה':' · לא פרוס';
  if(st==='deployed')t+=' · אש '+(a.fireCd>0?Math.ceil(a.fireCd)+'ש׳':'✓')+' · עשן '+(a.smokeCd>0?Math.ceil(a.smokeCd)+'ש׳':'✓')}
 if(u.landT>0)t+=' · 🪂 נוחתים';if(u.sweepT>0)t+=' · 🔍 +50% '+Math.ceil(u.sweepT)+'ש׳';else if(u.sweepCd>0&&sp.sweep)t+=' · סריקה בעוד '+Math.ceil(u.sweepCd)+'ש׳';return t}
function v4Buttons(units){var A=units.filter(u=>D.UNITS[u.type].barrage),dep=A.filter(u=>artSt(u)==='deployed'),mob=A.filter(u=>!['deployed','deploying','packing'].includes(artSt(u)));
 $('deploy').disabled=!mob.length;$('pack').disabled=!A.some(u=>['deployed','deploying','goto'].includes(artSt(u)));
 var fcd=dep.length?Math.min(...dep.map(u=>u.art.fireCd)):0,scd=dep.length?Math.min(...dep.map(u=>u.art.smokeCd)):0;
 $('fire').disabled=!dep.length||fcd>0;$('fire').textContent=fcd>0?'🔥 '+Math.ceil(fcd):'🔥 אש';$('smoke').disabled=!dep.length||scd>0;$('smoke').textContent=scd>0?'🌫 '+Math.ceil(scd):'🌫 עשן';
 var P=units.filter(u=>D.UNITS[u.type].para);$('drop').disabled=!P.length;var G=units.filter(u=>D.UNITS[u.type].sweep),gcd=G.length?Math.min(...G.map(u=>u.sweepCd||0)):0;$('sweep').disabled=!G.length||gcd>0;$('sweep').textContent=gcd>0?'🔍 '+Math.ceil(gcd):'🔍סריקה'}
var AIM_TEXT={deploy:'טאפ על נקודת הפריסה של התותחנים',fire:'🔥 טאפ על נקודה בתוך העיגול: מטח על אזור (פוגע גם בשלנו!)',smoke:'🌫 טאפ על נקודה בתוך העיגול: מסך עשן',drop:'🪂 טאפ על נקודת ההצנחה',supply:'📦 טאפ על נקודה להצנחת ארגז אספקה (₪'+D.SUPPLY_DROP.cost+')'};
function startAim(action){if(mode==='route')endRoute(false);var ids=[];
 if(action==='deploy'){ids=arties().filter(u=>!['deployed','deploying','packing'].includes(artSt(u))).map(u=>u.id);if(!ids.length){toast('בחרו סוללת תותחנים לא פרוסה');return false}}
 else if(action==='fire'||action==='smoke'){var dep=arties().filter(u=>artSt(u)==='deployed');if(!dep.length){toast('צריך קודם ״פריסה״: הסוללה יורה רק כשהיא פרוסה');return false}
  var ready=dep.filter(u=>(action==='fire'?u.art.fireCd:u.art.smokeCd)<=0);if(!ready.length){toast((action==='fire'?'האש':'העשן')+' בטעינה');return false}ids=ready.map(u=>u.id)}
 else if(action==='drop'){var P=paras();if(!P.length){toast('בחרו מחלקת צנחנים');return false}var ok=P.filter(u=>Sim.canBoard(s,u));if(!ok.length){toast('צנחנים עולים למטוס רק בבסיס, בעיר או כפר שכבשנו, או ליד עמדה');return false}ids=P.map(u=>u.id)}
 else if(action==='supply'){if(s.money<D.SUPPLY_DROP.cost){toast('אין מספיק תקציב להצנחת אספקה');return false}}
 aim={action,ids};mode='aim';document.body.classList.add('aiming');$('aimBar').classList.remove('hidden');$('aimInfo').textContent=AIM_TEXT[action];$('aimHere').classList.toggle('hidden',action!=='deploy');updateUI();return true}
function endAim(){aim=null;if(mode==='aim')mode='pan';document.body.classList.remove('aiming');$('aimBar').classList.add('hidden');updateUI()}
function aimAt(w){var a=aim;if(!a)return;var p={x:w.x,y:w.y};
 if(s.coord){if((a.action==='fire'||a.action==='smoke')&&!a.ids.some(id=>{var u=Sim.get(s,id);return u&&Sim.inArtyRange(u,p)})){toast('הנקודה מחוץ לטווח הסוללה (העיגול המקווקו)');return}
  if(a.action==='supply'&&s.money<D.SUPPLY_DROP.cost){toast('אין מספיק תקציב');endAim();return}
  run({kind:a.action,ids:a.ids,p});endAim();return}
 if(a.action==='deploy'){var n=Sim.deployOrder(s,a.ids,p);toast(n?'התותחנים בדרך לפריסה · עוד '+AR.deploy+' שניות פריסה במקום':'אין סוללה פנויה לפריסה');endAim();return}
 if(a.action==='fire'||a.action==='smoke'){var r=Sim.artyFire(s,a.ids,p,a.action);if(r.n){toast(a.action==='fire'?'🔥 מטח בדרך · '+AR.fire.warn+' שניות עד הפגיעה. כוחות שלנו בעיגול האדום ייפגעו בחצי עוצמה':'🌫 פגזי עשן בדרך · האויב לא יראה את הכוחות בתוך הענן '+AR.smoke.dur+' שניות');endAim();return}
  toast({range:'הנקודה מחוץ לטווח הסוללה (העיגול המקווקו)',tooClose:'קרוב מדי לסוללה',cooldown:'בטעינה',ammo:'אין מספיק תחמושת לסוללה (משאית אספקה / בסיס)',notDeployed:'הסוללה לא פרוסה'}[r.reason]||'אי אפשר לירות לשם');return}
 if(a.action==='drop'){var d=Sim.dropOrder(s,a.ids,p);toast(d.planes?'🪂 '+d.planes+' מטוס'+(d.planes>1?'י':'')+' תובלה בדרך עם '+d.troops+' מחלקות'+(d.reason==='someNotAtBase'?' · מי שלא בבסיס נשאר':'')+' · נ״מ של האויב יכול להפיל אותם':d.reason==='notAtBase'?'הצנחנים צריכים להיות בבסיס, בעיר/כפר שכבשנו או ליד עמדה':'אין צנחנים זמינים');endAim();return}
 if(a.action==='supply'){var id=Sim.supplyDrop(s,p);toast(id?'📦 מטוס אספקה המריא · הארגז ימלא תחמושת, דלק וחיים ברדיוס '+D.SUPPLY_DROP.radius+' משבצות':'אין מספיק תקציב');endAim();return}}
function patrollers(){return selectedUnits().filter(u=>Sim.canPatrol(u))}
function setRouteUI(){document.body.classList.toggle('routing',mode==='route');$('routeBar').classList.toggle('hidden',mode!=='route');if(mode==='route'){var n=draft.length;$('routeInfo').textContent=n?'נקודות נתיב: '+n+' · עוד טאפ מוסיף נקודה':'טאפ על המפה להוספת נקודות נתיב';$('routeDone').disabled=!n;$('routeUndo').disabled=!n}}
function startRoute(){if(!patrollers().length){toast('בחרו מל״ט סיור, מל״ט תקיפה או מסוק כדי להגדיר נתיב');return}mode='route';draft=[];setRouteUI();toast('טאפ על כמה נקודות במפה, ואז ״✓ סיים נתיב״')}
function endRoute(apply){var n=0;if(apply&&draft&&draft.length&&s.coord){run({kind:'route',ids:patrollers().map(u=>u.id),points:draft.slice()});mode='pan';draft=null;setRouteUI();updateUI();return}if(apply&&draft&&draft.length)n=Sim.setRoute(s,patrollers().map(u=>u.id),draft);mode='pan';var pts=draft?draft.length:0;draft=null;setRouteUI();if(apply)toast(n?n+' כלי טיס מסיירים בנתיב של '+pts+' נקודות · תוקפים אויב בטווח וחוזרים לבד לתדלוק':'אין כלי טיס זמין לנתיב (אולי בדרך לתדלוק)');updateUI()}
function flashFocus(t){$('focus').textContent=t;$('focus').classList.remove('hidden');setTimeout(()=>$('focus').classList.add('hidden'),3500)}
function selectOne(u){selected.clear();if(u.group){for(var v of s.units)if(v.group===u.group&&v.side==='il'&&v.hp>0&&!v.carriedBy)selected.add(v.id)}else selected.add(u.id);flashFocus(D.UNITS[u.type].n+(u.soldiers?' · '+u.soldiers+' לוחמים':'')+(u.group?' · קבוצה '+u.group:''));updateUI()}
function pickUnit(p,side){var best=null,d=Infinity;for(var u of Sim.alive(s,side)){if(u.type==='hq'||D.UNITS[u.type].noSelect||(u.side==='hz'&&((u.hidden&&!u.revealed)||(!u.revealed&&Sim.inFog(s,u.x,u.y)))))continue;var q=ren.screen(u.x,u.y),r=Math.hypot(q.x-p.x,q.y-p.y);if(r<(D.UNITS[u.type].building?18:15)&&r<d){best=u;d=r}}return best}
function touch(p){var mini=ren.minimapHit(p.x,p.y);if(mini){openTheater();return}var w=ren.world(p.x,p.y);if(mode==='aim'){aimAt(w);return}if(mode==='route'){if(draft.length>=12){toast('מקסימום 12 נקודות · ״✓ סיים נתיב״');return}draft.push({x:w.x,y:w.y});setRouteUI();return}
 var own=pickUnit(p,'il'),enemy=pickUnit(p,'hz');
 if(mode==='select'&&own){if(selected.has(own.id))selected.delete(own.id);else selected.add(own.id);updateUI();return}
 if(own){selectOne(own);return}
 if(selected.size){var hid=Sim.hiddenAt(s,w,Math.max(1.3,24/ren.view.z)),sel=selectedUnits(),engs=sel.filter(u=>D.UNITS[u.type].engineer);
  if(hid&&engs.length){var others=sel.filter(u=>!D.UNITS[u.type].engineer).map(u=>u.id);
   if(s.coord){run({kind:'blow',ids:engs.map(u=>u.id),key:hid.key,p:{x:hid.x,y:hid.y}});if(others.length)run({kind:'move',ids:others,p:{x:hid.x+1.5,y:hid.y+1.5}});updateUI();return}
   var hh=Sim.blowOrder(s,engs.map(u=>u.id),hid.key);if(others.length)Sim.setOrder(s,others,{x:hid.x+1.5,y:hid.y+1.5});
   if(hh){toast('🎯 הנדסה בדרך לנטרל את '+D.HIDDEN[hh.kind].n+' (ליד '+hh.name+')'+(others.length?' · השאר מאבטחים':''));updateUI();return}}
  var structure=s.sites.find(z=>Math.hypot(z.x-w.x,z.y-w.y)<2.8&&z.owner==='hz'&&!Sim.inFog(s,z.x,z.y));var target=enemy||(structure&&Sim.get(s,structure.building));
  var commandPoint=structure?{x:structure.x,y:structure.y}:target?{x:target.x,y:target.y}:w;
  if(target){var plan=attackPlan(sel,target);
   if(!plan.ok.length&&!plan.allArty.length){toast(plan.warn||'אין יחידה שיכולה לתקוף את המטרה');return}
   if(s.coord){var qids=plan.ok.concat(plan.arty).map(u=>u.id);if(!qids.length){toast('💥 תותחנים יורים רק כשהם פרוסים (״פריסה״)'+(plan.warn?' · '+plan.warn:''));return}run({kind:'attack',ids:qids,target:target.id,p:commandPoint,tx:target.x,ty:target.y});if(plan.warn)setTimeout(()=>toast(plan.warn),900);return}
   var r=Sim.attackOrder(s,[...selected],target.id,commandPoint);toast(attackText(sel,target,r,plan));updateUI();return}
  var r=run({kind:'move',ids:[...selected],p:w});if(!queued(r)&&r)toast(r+' יחידות קיבלו פקודה לנוע');return}
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
 if(gesture.select&&gesture.dragged&&box){selected.clear();for(var u of Sim.alive(s,'il')){if(u.type==='hq'||D.UNITS[u.type].building||D.UNITS[u.type].noSelect)continue;var p=ren.screen(u.x,u.y);if(p.x>=box.x&&p.x<=box.x+box.w&&p.y>=box.y&&p.y<=box.y+box.h)selected.add(u.id)}if(selected.size)mode='pan';toast(selected.size+' יחידות נבחרו · טאפ על יעד');updateUI()}
 else if(!gesture.dragged&&!gesture.pinch)touch({x:e.clientX,y:e.clientY});box=null;gesture=null}
canvas.addEventListener('pointerup',finishPointer);canvas.addEventListener('pointercancel',finishPointer);canvas.addEventListener('wheel',e=>{e.preventDefault();ren.camera(null,null,ren.view.z*(e.deltaY>0?.86:1.14))},{passive:false});
document.querySelectorAll('.diff button').forEach(b=>b.onclick=()=>{diff=b.dataset.diff;updateIntro()});
$('newGame').onclick=()=>begin(false);$('continueGame').onclick=()=>begin(true);$('restart').onclick=()=>{s.paused=false;$('end').classList.add('hidden');$('intro').classList.remove('hidden');updateIntro()};
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;updateUI()});$('units').onclick=e=>{var sb=e.target.closest('[data-support]');if(sb){startAim('supply');return}var b=e.target.closest('[data-buy]');if(!b)return;var t=b.dataset.buy,sp=D.UNITS[t];if(Sim.buy(s,t)){toast(sp.n+' בייצור · '+sp.time+' שניות');updateUI()}};
$('speed').onclick=()=>{s.speed=s.speed===1?2:1;toast('מהירות ×'+s.speed);updateUI()};$('pause').onclick=()=>{s.paused=!s.paused;toast(s.paused?'משחק מושהה':'ממשיכים');save();updateUI()};$('help').onclick=()=>{s.paused=true;modal=true;$('intro').classList.remove('hidden');$('newGame').classList.add('hidden');$('continueGame').classList.remove('hidden');$('continueGame').textContent='חזרה למשחק ▶';save();updateIntro()};
$('selectAll').onclick=()=>{selected.clear();var vw=ren.view;for(var u of Sim.alive(s,'il')){var sp=D.UNITS[u.type];if(sp.building||sp.move==='air'||u.flight)continue;var q=ren.screen(u.x,u.y);if(q.x>=0&&q.x<=vw.w-vw.right&&q.y>=41&&q.y<=vw.h)selected.add(u.id)}if(!selected.size)for(var u of Sim.alive(s,'il'))if(!D.UNITS[u.type].building&&D.UNITS[u.type].move!=='air')selected.add(u.id);toast(selected.size+' יחידות נבחרו · טאפ על יעד');updateUI()};
$('homeBtn').onclick=()=>{var u=Sim.get(s,s.hq);if(u)ren.camera(u.x+1,u.y-5,22)};$('selectMode').onclick=()=>{if(mode==='route')endRoute(false);if(mode==='aim')endAim();mode=mode==='select'?'pan':'select';toast(mode==='select'?'גררו מלבן לבחירת כמה יחידות':'גרירה מזיזה את המפה');updateUI()};
$('group').onclick=()=>{var g=Sim.group(s,[...selected]);if(g)toast('קבוצה '+g+' אוגדה — פקודה אחת לכולם');updateUI()};
$('split').onclick=()=>{var halves=Sim.split(s,[...selected]);if(halves.length){selected=new Set(halves[0]);toast('פיצול חצי־חצי');updateUI()}};
$('load').onclick=()=>{var army=selectedUnits().filter(u=>u.soldiers);var transport=Sim.alive(s,'il').filter(u=>D.UNITS[u.type].carry).sort((a,b)=>Math.min(...army.map(v=>Sim.dist(a,v)))-Math.min(...army.map(v=>Sim.dist(b,v))))[0];
 if(s.coord&&transport){run({kind:'load',tid:transport.id,ids:army.map(u=>u.id)});return}var n=transport&&Sim.load(s,transport.id,army.map(u=>u.id));toast(n?n+' מחלקות עלו ל'+D.UNITS[transport.type].n:'קרבו את החי״ר לנמר/מסוק פנוי');updateUI()};
$('unload').onclick=()=>{if(s.coord){run({kind:'unload',ids:selectedUnits().map(u=>u.id)});return}var n=selectedUnits().reduce((x,u)=>x+Sim.unload(s,u.id),0);toast(n?n+' מחלקות ירדו':'בחרו נמר או מסוק עם כוחות');updateUI()};
$('build').onclick=()=>{var e=selectedUnits().find(u=>u.type==='engineer');if(s.coord&&e){run({kind:'build',ids:[e.id]});return}var id=e&&Sim.buildPost(s,e.id);toast(id?'העמדה נבנית ליד ההנדסה':'בחרו מחלקת הנדסה עם תקציב פנוי');updateUI()};
$('blow').onclick=()=>{if(s.coord){toast('בתיאום: טאפ על הפיר / המחסן / המטען שההנדסה תנטרל');return}var h=Sim.blowOrder(s,[...selected]);toast(h?'💥 הנדסה מפוצצת את '+D.HIDDEN[h.kind].n+' שלידה':'🎯 טאפ על פיר, מחסן נשק, יציאת מנהרה או מטען צד חשופים כדי לבחור יעד להנדסה');updateUI()};
$('xfer').onclick=()=>openTransfer();
$('strike').onclick=()=>{var ids=selectedUnits().filter(u=>D.UNITS[u.type].strike).map(u=>u.id);if(s.coord){run({kind:'strike',ids});return}var r=Sim.strikeOrder(s,ids);toast(r.n?'⚡ פשיטה! כיבוש פי 2 מהר ונזק כפול ל-'+D.UNITS.matkal.strike.dur+' שניות':r.reason==='cooldown'?'⚡ הפשיטה בטעינה':'בחרו סיירת מטכ״ל');updateUI()};
$('intelChip').onclick=()=>intelJump();$('intelPop').onclick=()=>{$('intelPop').classList.add('hidden');intelJump()};
$('thClose').onclick=e=>{e.stopPropagation();closeTheater()};$('thCanvas').addEventListener('pointerup',e=>{e.preventDefault();theaterTap(e.clientX,e.clientY)});
window.addEventListener('resize',()=>drawTheater());
$('coordBtn').onclick=()=>coordToggle();$('coordGo').onclick=()=>coordGo();$('coordCancel').onclick=()=>coordCancel();
for(let n=1;n<=D.CTRL.groups;n++){let b=$('cg'+n);if(!b)continue;
 b.addEventListener('pointerdown',e=>{e.preventDefault();clearTimeout(cgPress&&cgPress.timer);cgPress={n,long:false,timer:setTimeout(()=>{cgPress.long=true;cgSave(n);if(navigator.vibrate)try{navigator.vibrate(30)}catch(_){}},D.CTRL.longPress)}});
 b.addEventListener('pointerup',e=>{e.preventDefault();if(!cgPress||cgPress.n!==n)return;clearTimeout(cgPress.timer);var wasLong=cgPress.long;cgPress=null;if(!wasLong)cgTapped(n)});
 b.addEventListener('pointerleave',()=>{if(cgPress&&cgPress.n===n&&!cgPress.long){clearTimeout(cgPress.timer);cgPress=null}});b.addEventListener('contextmenu',e=>e.preventDefault())}
['deploy','fire','smoke','drop'].forEach(k=>$(k).onclick=()=>{if(mode==='aim'&&aim&&aim.action===k)endAim();else startAim(k)});$('aimCancel').onclick=()=>{endAim();toast('בוטל')};
$('aimHere').onclick=()=>{if(aim&&aim.action==='deploy'){if(s.coord){run({kind:'deploy',ids:aim.ids,p:null});endAim();return}var n=Sim.deployOrder(s,aim.ids,null);toast(n?'נפרסים כאן · '+AR.deploy+' שניות':'אין סוללה פנויה');endAim()}};
$('pack').onclick=()=>{if(s.coord){run({kind:'pack',ids:arties().map(u=>u.id)});return}var n=Sim.packOrder(s,arties().map(u=>u.id));toast(n?'מקפלים · '+AR.pack+' שניות ואז אפשר לזוז':'אין סוללה פרוסה');updateUI()};
$('sweep').onclick=()=>{if(s.coord){run({kind:'sweep',ids:golanis().map(u=>u.id)});return}var r=Sim.sweepOrder(s,golanis().map(u=>u.id));toast(r.n?(r.found?'🔍 נחשפו '+r.found+' יעדים · ':'🔍 לא נמצאו מנהרות או מחסנים · ')+'+50% כוח אש ל-'+D.SWEEP.dur+' שניות':r.reason==='notUrban'?'סריקה עובדת רק בתוך כפר או עיר':r.reason==='cooldown'?'הסריקה בטעינה':'בחרו גולני');updateUI()};$('route').onclick=()=>{if(mode==='route')endRoute(false);else startRoute();updateUI()};$('routeDone').onclick=()=>endRoute(true);$('routeCancel').onclick=()=>{endRoute(false);toast('הגדרת הנתיב בוטלה')};$('routeUndo').onclick=()=>{if(draft&&draft.length){draft.pop();setRouteUI()}};
$('stop').onclick=()=>{if(mode==='route')endRoute(false);if(mode==='aim')endAim();if(s.coord){run({kind:'hold',ids:selectedUnits().map(u=>u.id)});updateUI();return}var n=Sim.hold(s,selectedUnits().map(u=>u.id));toast(n?'הנתיב בוטל · '+(n>1?n+' כלי טיס מחזיקים':'מחזיק במקום'):'הכוח מחזיק את השטח ולא רודף');updateUI()};
function insets(){var p=getComputedStyle($('safeProbe')),side=$('side').getBoundingClientRect();ren.view.it=parseFloat(p.paddingTop)||0;ren.view.ir=parseFloat(p.paddingRight)||0;ren.view.ib=parseFloat(p.paddingBottom)||0;ren.view.il=parseFloat(p.paddingLeft)||0;if(side.width)ren.view.right=Math.round(innerWidth-side.left)}
function relayout(){ren.resize();insets()}window.addEventListener('resize',relayout);window.addEventListener('orientationchange',()=>setTimeout(relayout,250));relayout();document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
function frame(now){var dt=Math.min(.10,(now-last)/1000);last=now;if(!modal&&!s.paused){acc+=dt;var steps=0;while(acc>=1/30&&steps<4){Sim.step(s,1/30);acc-=1/30;steps++;
 for(var ev of s.events){if(['shot','hit','explosion','trophy','repair','salvo','lzone','reveal','blown','tunnelpop','drop','resupply','sweep','deployed','ambush','retake','lostsite','coord'].includes(ev.kind)&&ev.x!==undefined)fx.push(ev);if(ev.kind==='resupply'&&ev.text)toast(ev.text);
 if(['salvo','reveal','blown','tunnelpop','ambush','retake','lostsite','strike'].includes(ev.kind)&&ev.text)toast(ev.text);if(ev.kind==='intel'){intelEvent(ev)}if(ev.kind==='blown')updateLaunchers();
 else if(ev.kind==='city'){if(typeof SHARED!=='undefined'&&D.TD_CITY[ev.key])SHARED.capture(ev.key);save();toast(ev.name+' נכבשה!'+(D.TD_CITY[ev.key]?' נוספה גם למגן שמיים':''))}
 else if(ev.kind==='win'||ev.kind==='lose'){finish()}}
 }}fx=fx.filter(e=>s.time-e.time<(e.kind==='lzone'?9:e.kind==='salvo'?4:e.kind==='reveal'||e.kind==='tunnelpop'||e.kind==='blown'||e.kind==='drop'||e.kind==='resupply'||e.kind==='sweep'||e.kind==='ambush'||e.kind==='retake'||e.kind==='lostsite'?3:1.25)).slice(-200);uiT+=dt;saveT+=dt;if(uiT>.25){uiT=0;updateUI()}if(saveT>25){saveT=0;save()}
 if(noticeT&&now>noticeT){$('toast').classList.remove('show');noticeT=0}
 var snapshot=Object.assign({},s,{events:fx});ren.draw(snapshot,selected,box,1,{draft:mode==='route'?draft:null,aim:mode==='aim'?aim:null});requestAnimationFrame(frame)}
updateIntro();updateUI();requestAnimationFrame(frame);
// Test hook. All gameplay uses the same simulation and UI pipeline.
window.LEBANON={get state(){return s},openTransfer,sim:Sim,data:D,renderer:ren,select:id=>{selected=new Set([id]);updateUI()},selectIds:ids=>{selected=new Set(ids);updateUI()},start:begin,save,restore:()=>Sim.restore(storage.get(KEY)),command:(ids,x,y,target)=>Sim.setOrder(s,ids,{x,y},target||0),tap:(x,y)=>touch({x,y}),aim:a=>startAim(a),get aimState(){return aim},get mode(){return mode},get draft(){return draft},get selected(){return [...selected]},coordToggle,coordGo,coordCancel,cgSave,cgSelect,cgTapped,run,openTheater,closeTheater,theaterTap,get theaterLayout(){return thL},toast,get lastToast(){return lastToast},intelJump};
})();
