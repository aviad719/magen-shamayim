/* LEBANON FRONT — simulation only. No DOM or canvas: ready for a future 3D renderer. */
(function(root){'use strict';
var D = root.LF && root.LF.data || (typeof require === 'function' ? require('./data.js') : null);
if(!D) throw Error('Map data not loaded');
var M=D.MAP,U=D.UNITS,T=D.TERRAIN,S=D.SITE_T,DIFF=D.DIFF,H=D.HIDDEN,SUP=D.SUPPLY,AR=D.ARTY,PA=D.PARA,SD=D.SUPPLY_DROP,SWP=D.SWEEP,SM=D.SMART,DN=D.DAYNIGHT,IN=D.INTEL;
var clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y), rand=s=>{s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296};
var clampPos=(p)=>({x:clamp(p.x,0,M.cols-.01),y:clamp(p.y,0,M.rows-.01)});
var latlonToCoords=arr=>arr.map(p=>D.toTile(p[1],p[0]));
function distanceToLine(p,a,b){var dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
function nearLine(p,line,width){for(var i=1;i<line.length;i++)if(distanceToLine(p,line[i-1],line[i])<width)return true;return false}
var coast=latlonToCoords(D.COAST),river=latlonToCoords(D.LITANI),roads=D.ROADS.map(latlonToCoords),bridges=D.BRIDGES.map(b=>D.toTile(b[1],b[0])),syria=latlonToCoords(D.SYRIA);
function coastlineX(y){var k=0;while(k<coast.length-1&&coast[k+1].y>y)k++;var a=coast[k],b=coast[Math.min(coast.length-1,k+1)];return a.x+(b.x-a.x)*clamp((y-a.y)/(b.y-a.y||1),0,1)}
// Stable stylised real-coordinate tile map. Sea, forest, built-up cover, Litani and crossings affect movement/combat.
function tileAt(x,y){if(x<0||y<0||x>=M.cols||y>=M.rows)return 'sea';var p={x,y};if(x<coastlineX(y)-.6)return 'sea';
 if(nearLine(p,syria,.48) && x>70)return 'syria';
 for(var q of bridges)if(dist(p,q)<1.5)return 'bridge';
 if(nearLine(p,river,.64))return 'river';
 for(var site of D.SITES){var c=D.toTile(site.lon,site.lat);if(dist(c,p)<(site.t==='main'?4.1:site.t==='city'?3.1:site.t==='village'?1.9:1.4))return site.t==='outpost'?'forest':site.t==='village'?'village':'city'}
 for(var city of D.IL_TOWNS){var c=D.toTile(city[2],city[1]);if(dist(c,p)<1.7)return 'city'}
 for(var road of roads)if(nearLine(p,road,.31))return 'road';
 if(x<coastlineX(y)+1.9)return 'beach';
 for(var f of D.FORESTS){var c=D.toTile(f[1],f[0]);if(dist(c,p)<f[2]*(.8+.2*Math.sin(x*.3+y*.19)))return 'forest'}
 if(x>70&&Math.sin(x*.21+y*.13)*Math.sin(y*.09)>.43)return 'hills';return 'open';}
var terrain=Array.from({length:M.rows},(_,y)=>Array.from({length:M.cols},(_,x)=>tileAt(x+.5,y+.5)));
function ground(x,y){return terrain[clamp(Math.floor(y),0,M.rows-1)][clamp(Math.floor(x),0,M.cols-1)]}
function canPass(x,y,unitType){var d=U[unitType]||U.golani;if(d.move==='air')return x>=0&&x<M.cols&&y>=0&&y<M.rows;return !!T[ground(x,y)][d.move||'foot']}
function makeUnit(s,type,side,x,y,opts){var spec=U[type];if(!spec)throw Error('unknown unit '+type);opts=opts||{};var n=opts.soldiers===undefined?(spec.soldiers||0):opts.soldiers;
 var a={id:++s.nextId,type,side,x,y,hp:spec.hp||n*spec.hpPer,maxHp:spec.hp||n*spec.hpPer,soldiers:n,group:0,cargo:[],carriedBy:0,
  goal:null,path:null,target:0,hold:0,cool:0,weaponCd:[],facing:0,site:opts.site||'',built:opts.built!==false,buildT:0,
  trophy:spec.trophy?spec.trophy.charges:0,trophyCd:0,loiter:spec.loiter||0,ammo:spec.ammo===undefined?null:spec.ammo,flight:'',flash:0,sup:spec.supply&&spec.supply.ammo?spec.supply.ammo:null,fuel:spec.supply&&spec.supply.fuel?spec.supply.fuel:null};
 if(side==='hz'&&s.diff&&DIFF[s.diff].hp){var zz=opts.site&&s.sites.find(q=>q.key===opts.site),deep=zz?zz.depth||0:0;a.hp*=DIFF[s.diff].hp*(1+deep*(spec.building?.5:.35));a.maxHp=a.hp}
 if(opts.hp!==undefined)a.hp=opts.hp;s.units.push(a);return a;}
function make(seed,diff){diff=DIFF[diff]?diff:'normal';var s={version:1,seed:seed===undefined?20261027:seed,diff,time:0,nextId:0,nextGroup:0,money:DIFF[diff].money,units:[],sites:[],hq:0,
  queue:{inf:[],veh:[],air:[]},strikes:[],smokes:[],crates:[],events:[],messages:[],incomeT:0,aiT:0,aiAttackT:0,won:false,lost:false,paused:false,speed:1,kills:0,captures:0,stats:{trophy:0},fog:1};
 var h=D.toTile(D.HOME.lon,D.HOME.lat);s.hq=makeUnit(s,'hq','il',h.x,h.y).id;
 [['golani',-4,-2],['para',-1.5,-2.8],['givati',1.5,-2.8],['engineer',-4.5,1],['merkava',4,-1.5],['namer',4.5,1.2],['uav_recon',0,-4]].forEach(v=>makeUnit(s,v[0],'il',h.x+v[1],h.y+v[2]));
 for(var site of D.SITES){var p=D.toTile(site.lon,site.lat),rule=S[site.t];var z={key:site.key,n:site.n,t:site.t,x:p.x,y:p.y,depth:clamp((108-p.y)/95,0,1),owner:'hz',capture:0,prod:rule.prod*(.7+rand(s)*.5),droneT:rule.drones*(.8+rand(s)*.5),income:rule.income,building:0};
 s.sites.push(z);z.building=makeUnit(s,rule.bld,'hz',z.x,z.y,{site:z.key}).id;
 // Sparse starting garrisons; outpost anti-air and ATGM are real tactical threats.
 var start=rule.start.filter((_,i)=>rand(s)<(i<2?1:DIFF[diff].startMul));
 for(var j=0;j<start.length;j++){var a=(j*2.4)+rand(s),r=2.0+(j%3)*.75;var u=makeUnit(s,start[j],'hz',clamp(z.x+Math.cos(a)*r,1,M.cols-2),clamp(z.y+Math.sin(a)*r,1,M.rows-2),{site:z.key});u.hold=1;}
 }setupHidden(s);var first=s.sites.filter(z=>z.t==='village').sort((a,b)=>dist(a,h)-dist(b,h))[0];s.hint=first.key;
 s.messages=['יעד ראשון: '+first.n+' — כבשו אותו עם חי״ר כדי להרוויח הכנסה','ברוכים הבאים לחזית לבנון — כיבוש ביירות מנצח'];return s;}
function get(s,id){return s.units.find(u=>u.id===id&&u.hp>0)}
function alive(s,side){return s.units.filter(u=>u.hp>0&&!u.carriedBy&&(!side||u.side===side))}
function emit(s,text,kind){if(s.messages[0]!==text)s.messages.unshift(text);s.messages=s.messages.slice(0,6);s.events.push({kind:kind||'message',text,time:s.time})}
function note(s,text){if(s.messages[0]!==text)s.messages.unshift(text);s.messages=s.messages.slice(0,6)}
// ===== v6b: day/night. darkness 0 (day) … 1 (night). Game time 0 = morning; 6 min day, 3 min night, 30 s dusk/dawn. =====
function darkness(t){var c=DN.day+DN.night,f=DN.fade,h=f/2,p=(((t||0)+h)%c+c)%c,sm=x=>x*x*(3-2*x);
 if(p<h)return 1-sm((p+h)/f);if(p<DN.day-h)return 0;if(p<DN.day+h)return sm((p-(DN.day-h))/f);if(p<c-h)return 1;return 1-sm((p-(c-h))/f)}
function dayPhase(s){var c=DN.day+DN.night,h=DN.fade/2,p=((s.time+h)%c+c)%c,night=p>=DN.day;return {night,dark:darkness(s.time),left:night?c-p:DN.day-p,len:night?DN.night:DN.day}}
function nightVis(s,u){var dk=darkness(s.time);return dk&&!(U[u.type]||{}).nv?1-DN.vis*dk:1}
function grant(s,n){s.money+=n;emit(s,'+'+n+' ₪ לתקציב המלחמה','money')}
function aliveOf(s,type){return s.units.filter(u=>u.type===type&&u.side==='il'&&u.hp>0).length+(s.queue[(U[type]||{}).q]||[]).filter(q=>q.type===type).length}
function atMax(s,type){var sp=U[type];return !!(sp&&sp.maxAlive&&aliveOf(s,type)>=sp.maxAlive)}
function queue(s,type){var sp=U[type];if(!sp||sp.side!=='il'||!sp.q||s.won||s.lost||s.money<sp.cost||s.queue[sp.q].length>=D.QUEUE_MAX[sp.q]||atMax(s,type))return false;
 s.money-=sp.cost;s.queue[sp.q].push({type,remaining:sp.time});emit(s,sp.n+' בייצור','queue');return true}
function buy(s,type){if(!queue(s,type))return false; // "buy" queues only, to respect one-at-a-time vehicles and aircraft.
 return true}
function setOrder(s,ids,p,attackId,noExpand){p=clampPos(p);var idsToCommand=new Set(ids);if(!noExpand)for(var id of ids){var u=get(s,id);if(u&&u.side==='il'&&u.group)for(var ally of s.units)if(ally.hp>0&&ally.group===u.group)idsToCommand.add(ally.id)}
 var list=[];for(var id of idsToCommand){var u=get(s,id);if(u&&u.side==='il'){u.route=null;u.blowT=null}if(!u||u.side!=='il'||u.carriedBy||U[u.type].building||u.flight||u.landT>0)continue;if(u.art){if(ARTY_FIXED.has(u.art.st))continue;u.art.st=''}list.push(u)}
 var cols=Math.min(4,list.length)||1,rows=Math.ceil(list.length/cols);
 list.forEach((u,i)=>{var offset={x:((i%cols)-(cols-1)/2)*1.3,y:(Math.floor(i/cols)-(rows-1)/2)*1.3},at=clampPos({x:p.x+offset.x,y:p.y+offset.y});u.goal=at;u.target=attackId||0;u.hold=0;u.path=null;u.stand=0});return list.length}
function group(s,ids){var a=ids.map(id=>get(s,id)).filter(u=>u&&u.side==='il'&&!u.carriedBy);if(a.length<2)return 0;var g=++s.nextGroup;a.forEach(u=>u.group=g);emit(s,a.length+' יחידות אוגדו','group');return g}
function split(s,ids){var a=ids.map(id=>get(s,id)).filter(u=>u&&u.side==='il'&&!u.carriedBy);
 if(a.length>1){var mid=Math.ceil(a.length/2),g1=++s.nextGroup,g2=++s.nextGroup;a.forEach((u,i)=>u.group=i<mid?g1:g2);emit(s,'פיצול: '+mid+' + '+(a.length-mid),'split');return [a.slice(0,mid).map(u=>u.id),a.slice(mid).map(u=>u.id)]}
 var u=a[0];if(!u||u.soldiers<2)return [];var n=Math.ceil(u.soldiers/2),m=u.soldiers-n,perHP=u.hp/u.soldiers;
 u.soldiers=n;u.maxHp=n*U[u.type].hpPer;u.hp=Math.min(u.maxHp,perHP*n);u.group=0;
 var p={x:clamp(u.x+1,0,M.cols-1),y:clamp(u.y+1,0,M.rows-1)},b=makeUnit(s,u.type,'il',p.x,p.y,{soldiers:m,hp:Math.min(m*U[u.type].hpPer,perHP*m)});
 b.sup=u.sup;b.fuel=u.fuel;emit(s,'מחלקה פוצלה: '+n+' + '+m,'split');return [[u.id],[b.id]]}
function load(s,transportId,ids){var v=get(s,transportId),sp=v&&U[v.type];if(!v||v.side!=='il'||!sp.carry)return 0;var loaded=0;
 for(var id of ids){var u=get(s,id);if(!u||!u.soldiers||u.side!=='il'||u.carriedBy||dist(u,v)>8||v.cargo.reduce((sum,k)=>sum+(get(s,k)||{soldiers:0}).soldiers,0)+u.soldiers>sp.carry)continue;
 // Namer = at most TWO platoon objects, heli = ONE; splitting may fit the same soldier cap.
 if(v.cargo.length>=(v.type==='namer'?2:1))break;v.cargo.push(u.id);u.carriedBy=v.id;u.goal=null;loaded++}
 if(loaded)emit(s,loaded+' מחלקות עלו ל'+sp.n,'load');return loaded}
function unload(s,transportId){var v=get(s,transportId);if(!v||!v.cargo||!v.cargo.length)return 0;var n=0;
 for(var id of v.cargo){var u=get(s,id);if(u){u.carriedBy=0;u.x=clamp(v.x+1.6+n*.8,0,M.cols-1);u.y=clamp(v.y+2+n*.6,0,M.rows-1);n++}}v.cargo=[];if(n)emit(s,n+' מחלקות ירדו','unload');return n}
function buildPost(s,engineerId){var a=get(s,engineerId);if(!a||a.type!=='engineer'||a.side!=='il'||a.carriedBy||s.money<U.post.cost)return false;
 s.money-=U.post.cost;var p=makeUnit(s,'post','il',clamp(a.x+1.5,1,M.cols-1),clamp(a.y-1,1,M.rows-1),{built:false});p.buildT=U.post.time;emit(s,'בונים עמדת רואה־יורה','post');return p.id}
// Spatial buckets (8×8 tiles), rebuilt once per simulation time stamp: keeps target search fast with big armies.
var GRID={s:null,t:-1,b:null},BS=8,BW=Math.ceil(M.cols/BS),BH=Math.ceil(M.rows/BS);
function buckets(s){if(GRID.s===s&&GRID.t===s.time&&GRID.n===s.units.length)return GRID.b;var b=Array.from({length:BW*BH},()=>[]);
 for(var t of s.units){if(t.hp<=0||t.carriedBy)continue;b[clamp(Math.floor(t.y/BS),0,BH-1)*BW+clamp(Math.floor(t.x/BS),0,BW-1)].push(t)}GRID={s,t:s.time,n:s.units.length,b};return b}
function nearest(s,u,radius,filter){var b=buckets(s),best=null,bd=radius,x0=clamp(Math.floor((u.x-radius)/BS),0,BW-1),x1=clamp(Math.floor((u.x+radius)/BS),0,BW-1),y0=clamp(Math.floor((u.y-radius)/BS),0,BH-1),y1=clamp(Math.floor((u.y+radius)/BS),0,BH-1);
 for(var by=y0;by<=y1;by++)for(var bx=x0;bx<=x1;bx++)for(var t of b[by*BW+bx]){if(t.side===u.side||t.hp<=0||t.carriedBy||(t.hidden&&!t.revealed))continue;if(smokeOn&&u.side==='hz'&&inSmoke(s,t))continue;var d=dist(u,t);if(d>=bd)continue;if(u.side==='hz'&&U[t.type].stealth&&d>U[t.type].stealth.r&&!(t.firedT>s.time))continue;if(filter&&!filter(t))continue;best=t;bd=d}return best}
function canSee(s,u){if(u.side==='il')return true;return alive(s,'il').some(v=>dist(u,v)<(U[v.type].vision||5)*1.85)}
function bonus(a,terrainType,defending){var sp=U[a.type],atk=1,def=1;if(sp.bonus==='urban'&&['village','city'].includes(terrainType))atk=D.BONUS.urban.atk,def=D.BONUS.urban.def;
 if(sp.bonus==='forest'&&terrainType==='forest')atk=D.BONUS.forest.atk,def=D.BONUS.forest.def;
 if(sp.bonus==='hold'&&defending&&a.hold>2)atk=D.BONUS.hold.atk,def=D.BONUS.hold.def;return {atk,def}}
function inflict(s,target,damage,fx,randVal){if(target.hp<=0)return {damage:0,intercepted:false};var sp=U[target.type];
 if(fx==='atgm'&&sp.trophy&&target.trophy>0&&target.trophyCd<=0&&(randVal===undefined?rand(s):randVal)<sp.trophy.chance){target.trophy--;target.trophyCd=sp.trophy.reload;s.stats.trophy++;s.events.push({kind:'trophy',x:target.x,y:target.y,time:s.time});return {damage:0,intercepted:true}}
 var g=ground(target.x,target.y),b=bonus(target,g,true),cover=T[g].cover||0;damage*=b.def*(1-cover*.52);if(target.landT>0)damage*=PA.landVuln;
 if(target.side==='hz'&&target.site&&!target.raid&&!sp.building&&target.hold>1)damage*=D.BONUS.dug.def; // dug in at their base
 target.hp=Math.max(0,target.hp-damage);target.flash=.22;
 s.events.push({kind:'hit',x:target.x,y:target.y,fx,time:s.time});if(target.hp<=0){s.events.push({kind:'explosion',x:target.x,y:target.y,time:s.time});if(sp.transportPlane){planeDown(s,target)}else if(target.cargo&&target.cargo.length){for(var id of target.cargo){var child=get(s,id);if(child){child.carriedBy=0;child.x=target.x+1;child.y=target.y+1;child.hp=Math.max(1,child.hp*.45)}}target.cargo=[]}
 if(target.side==='il'){s.stats.lost=s.stats.lost||{};var lk=(target.lastHit||'?');s.stats.lost[lk]=(s.stats.lost[lk]||0)+1}
 if(target.side==='hz'){s.kills++;if(sp.launcher)launcherDown(s,target);else s.money+=Math.min(75,Math.round((sp.hp||sp.soldiers*sp.hpPer)*.05))}}
 return {damage,intercepted:false}}
function attack(s,attacker,target,weapon){var a=U[attacker.type],t=U[target.type],factor=weapon.vs[t.armor]||0;if(!factor)return false;if(t.launcher){var vb=H.launcher.vsBy[attacker.type];factor*=vb===undefined?.4:vb}
 var n=a.soldiers?attacker.soldiers:1,terrainType=ground(attacker.x,attacker.y),power=bonus(attacker,terrainType,false).atk*(attacker.sweepT>0?SWP.dmg:1);
 var dmg=weapon.dmg*factor*power*(weapon.perSquad?1:n)*((attacker.side==='hz')?DIFF[s.diff].dmg:1)*(attacker.burstT>0?SM.ambush.burst:1)*(attacker.strikeT>0&&a.strike?a.strike.dmg:1);
 var dk=darkness(s.time);if(dk){if(attacker.side==='il'&&a.nv)dmg*=1+(DN.nvAcc-1)*dk;else if(attacker.side==='hz'){dmg*=1-(1-DN.hzAcc)*dk;if(t.transportPlane)dmg*=1-(1-DN.aa)*dk}}
 if(a.stealth)attacker.firedT=s.time+a.stealth.fire;
 target.lastHit=attacker.type;target.lastBy=attacker.id;target.lastHitT=s.time;var result=inflict(s,target,dmg,weapon.fx);
 if(target.id===s.hq&&s.time-(s.hqAlertT||-99)>25){s.hqAlertT=s.time;emit(s,'⚠ בסיס פיקוד צפון תחת מתקפה!','alert')}s.events.push({kind:'shot',x:attacker.x,y:attacker.y,tx:target.x,ty:target.y,fx:weapon.fx,side:attacker.side,time:s.time});
 if(attacker.ammo!==null&&weapon.fx!=='bullet')attacker.ammo=Math.max(0,attacker.ammo-1);return result}
function canHit(u,t,weapon){return !!(weapon.vs[U[t.type].armor]&&dist(u,t)<=weapon.range)}
// Movement: a Dijkstra flow field per (goal cell, movement class), cached, so units route around the sea,
// the Litani (vehicles use bridges; infantry fords slowly) and the Syrian line. Cheap: 12k cells, computed once per order.
var FIELDS=new Map();
function heapPush(h,c,v){h.push([v,c]);var i=h.length-1;while(i>0){var p=(i-1)>>1;if(h[p][0]<=h[i][0])break;var t=h[p];h[p]=h[i];h[i]=t;i=p}}
function heapPop(h){var top=h[0],last=h.pop();if(h.length){h[0]=last;var i=0;for(;;){var l=2*i+1,r=l+1,m=i;if(l<h.length&&h[l][0]<h[m][0])m=l;if(r<h.length&&h[r][0]<h[m][0])m=r;if(m===i)break;var t=h[m];h[m]=h[i];h[i]=t;i=m}}return top}
function nearestPassableCell(gx,gy,cls){for(var r=0;r<8;r++)for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){var x=gx+dx,y=gy+dy;if(x<0||y<0||x>=M.cols||y>=M.rows)continue;if(T[terrain[y][x]][cls])return y*M.cols+x}return -1}
function flowField(gx,gy,cls){var key=cls+':'+gx+':'+gy;var f=FIELDS.get(key);if(f){FIELDS.delete(key);FIELDS.set(key,f);return f}
 var N=M.cols*M.rows;f=new Float64Array(N).fill(Infinity);var start=T[terrain[gy][gx]][cls]?gy*M.cols+gx:nearestPassableCell(gx,gy,cls);if(start<0)return null;
 f[start]=0;var h=[[0,start]];var nb=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
 var guard=0;while(h.length){if(++guard>2e6)throw Error('dijkstra runaway '+key+' h='+h.length);var top=heapPop(h),v=top[0],c=top[1];if(v>f[c])continue;var cx=c%M.cols,cy=(c/M.cols)|0,sc=T[terrain[cy][cx]][cls]||.3;
  for(var k=0;k<8;k++){var x=cx+nb[k][0],y=cy+nb[k][1];if(x<0||y<0||x>=M.cols||y>=M.rows)continue;var sp=T[terrain[y][x]][cls];if(!sp)continue;
   if(k>3&&(!T[terrain[cy][x]][cls]||!T[terrain[y][cx]][cls]))continue;var n=y*M.cols+x,nv=v+nb[k][2]*2/(sp+sc);if(nv<f[n]){f[n]=nv;heapPush(h,n,nv)}}}
 FIELDS.set(key,f);if(FIELDS.size>48)FIELDS.delete(FIELDS.keys().next().value);return f}
function steer(u,goal,cls){var gx=clamp(Math.floor(goal.x),0,M.cols-1),gy=clamp(Math.floor(goal.y),0,M.rows-1),cx=clamp(Math.floor(u.x),0,M.cols-1),cy=clamp(Math.floor(u.y),0,M.rows-1);
 if(Math.abs(gx-cx)<=1&&Math.abs(gy-cy)<=1)return goal;var f=flowField(gx,gy,cls);if(!f)return goal;var here=f[cy*M.cols+cx];
 var best=null,bv=here;for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;var x=cx+dx,y=cy+dy;if(x<0||y<0||x>=M.cols||y>=M.rows)continue;var v=f[y*M.cols+x];if(v<bv){bv=v;best={x:x+.5,y:y+.5}}}
 if(!best&&here===Infinity){// standing on an impassable cell (spawned on a shore): head to the nearest passable cell
  var c=nearestPassableCell(cx,cy,cls);if(c>=0)return{x:c%M.cols+.5,y:((c/M.cols)|0)+.5}}
 return best||goal}
function lineClear(a,b,cls){var d=dist(a,b),n=Math.ceil(d/.5);for(var i=1;i<=n;i++){var x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;if(!T[ground(x,y)][cls])return false}return true}
function move(s,u,dt){var sp=U[u.type],goal=u.goal;if(!goal||!sp.speed)return;
 var d=dist(u,goal);if(d<.35){u.goal=null;u.hold=0;u.stuck=0;return}
 var cls=sp.move||'foot';if(u._g!==goal){u._g=goal;u.direct=sp.move==='air'||lineClear(u,goal,cls)}
 var way=u.direct?goal:steer(u,goal,cls),wd=dist(u,way)||1;
 var vx=(way.x-u.x)/wd,vy=(way.y-u.y)/wd,mult=sp.move==='air'?1:(T[ground(u.x,u.y)][cls]||.45),step=sp.speed*dt*mult*(u.fuel!==null&&u.fuel!==undefined&&u.fuel<=0?SUP.noFuelSpeed:1);
 var nx=u.x+vx*Math.min(wd,step),ny=u.y+vy*Math.min(wd,step);
 if(sp.move!=='air'&&!canPass(nx,ny,u.type)&&canPass(u.x,u.y,u.type)){u.direct=false;u.stuck=(u.stuck||0)+dt;if(u.stuck>8){u.goal=null;u.stuck=0;return}
  // re-centre on the current tile so the next flow-field step is clean
  var cxm=Math.floor(u.x)+.5,cym=Math.floor(u.y)+.5,cd=Math.hypot(cxm-u.x,cym-u.y);if(cd>.05){var k=Math.min(1,step/cd);u.x+=(cxm-u.x)*k;u.y+=(cym-u.y)*k}return}
 if(u.fuel>0){u.fuel=Math.max(0,u.fuel-sp.supply.burn*Math.hypot(nx-u.x,ny-u.y));if(u.fuel<=0&&u.side==='il')emit(s,sp.n+': נגמר הדלק! מחכה למשאית אספקה','supply')}u.x=clamp(nx,0,M.cols-.01);u.y=clamp(ny,0,M.rows-.01);u.facing=Math.atan2(vy,vx);u.hold=0;u.stuck=0;
 if(dist(u,goal)<.4){u.goal=null;u.path=null;u.hold=0}}
function inHealZone(s,u){var hq=get(s,s.hq);if(hq&&dist(u,hq)<6)return true;for(var p of alive(s,'il'))if(p.type==='post'&&p.built!==false&&dist(u,p)<3.5)return true;for(var z of s.sites)if(z.owner==='il'&&dist(u,z)<((S[z.t]&&S[z.t].radius)||3)+1.2)return true;return false}
function actUnit(s,u,dt){var sp=U[u.type];u.cool=Math.max(0,u.cool-dt);u.flash=Math.max(0,u.flash-dt);u.trophyCd=Math.max(0,u.trophyCd-dt);
 if(u.carriedBy)return;if(sp.transportPlane){planeTick(s,u,dt);return}
 if(u.strikeT>0)u.strikeT=Math.max(0,u.strikeT-dt);if(u.strikeCd>0)u.strikeCd=Math.max(0,u.strikeCd-dt);if(u.sweepT>0)u.sweepT=Math.max(0,u.sweepT-dt);if(u.sweepCd>0)u.sweepCd=Math.max(0,u.sweepCd-dt);if(sp.barrage&&u.side==='il')artTick(s,u,dt);
 if(sp.loiter&&!u.flight){u.loiter-=dt;if(u.loiter<=0||(u.route&&u.side==='il'&&u.hp<u.maxHp*PATROL.lowHp)){var base=get(s,s.hq);if(base){u.goal={x:base.x+2,y:base.y-1};u.target=0;u.flight='return';emit(s,sp.n+' חוזר לבסיס לתדלוק','rtb')}else u.hp=0}}
 if(!u.built){u.buildT-=dt;if(u.buildT<=0){u.built=true;emit(s,'עמדת רואה־יורה מוכנה','post')}return}
 if(u.side==='il'&&u.soldiers>0&&u.hp<u.maxHp&&inHealZone(s,u)){u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.035*dt);u.healing=1;if(Math.floor(s.time*2)%6===0&&Math.floor((s.time-dt)*2)%6!==0)s.events.push({kind:'repair',x:u.x,y:u.y,time:s.time})}else u.healing=0;
 if(u.side==='il'&&sp.supply)resupply(s,u,sp,dt);
 if(sp.engineer&&u.side==='il')blowTick(s,u,dt);
 if(sp.engineer){var damaged=alive(s,'il').filter(v=>v.id!==u.id&&v.hp<v.maxHp&&['armor','air'].includes(U[v.type].armor)&&dist(u,v)<4.7);
  if(damaged.length){var v=damaged[0];v.hp=Math.min(v.maxHp,v.hp+7*dt*(u.soldiers/8));if(Math.floor(s.time)%5===0)s.events.push({kind:'repair',x:v.x,y:v.y,time:s.time})}}
 if(u.flight==='return'){u.goal=u.goal||(get(s,s.hq)?{x:get(s,s.hq).x+2,y:get(s,s.hq).y-1}:null);move(s,u,dt);if(!u.goal||dist(u,u.goal)<.5){u.goal=null;u.flight='rearm';u.cool=U[u.type].rearm||15}return}
 if(u.flight==='rearm'){u.cool-=dt;if(sp.engineer===undefined&&u.hp<u.maxHp)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.04*dt);if(u.cool<=0&&(!u.route||u.hp>=u.maxHp*PATROL.readyHp)){u.ammo=sp.ammo===undefined?null:sp.ammo;u.flight='';u.loiter=sp.loiter||0;if(u.route&&u.route.length){u.goal=u.route[u.routeI%u.route.length];u.target=0;emit(s,sp.n+' חזר לנתיב הסיור','patrol')}else emit(s,sp.n+' מוכן להמראה','unit')}return}
 if(u.ambush===1){ambushTick(s,u);return}if(u.burstT>0)u.burstT=Math.max(0,u.burstT-dt);
 if(u.landT>0){u.landT=Math.max(0,u.landT-dt);if(u.landT>0){u.goal=null;return}}
 if(u.route&&u.side==='il')patrolTick(s,u,sp);
 if(u.goal)move(s,u,dt);else u.hold+=dt;
 if(u.side==='hz'&&!sp.building&&!u.goal){var vr=(sp.vision||6)*1.25,nv0=nightVis(s,u);if(nv0<1)vr=Math.max(vr*nv0,Math.min(vr,(((sp.weapons||[])[0]||{}).range||3)+(DN.hzFloor||0)));var threat=nearest(s,u,vr,v=>v.side==='il');var home=u.site&&s.sites.find(q=>q.key===u.site),leash=home?(home.t==='outpost'?7:11):99;
  if(threat&&dist(u,threat)>(((sp.weapons||[])[0]||{}).range||3)&&(u.raid||!home||dist(threat,home)<leash+(home.t==='outpost'?0:4)))u.goal={x:threat.x,y:threat.y};
  else if(!threat){if(u.raid)u.raid=0;if(home&&home.owner==='hz'&&dist(u,home)>leash)u.goal={x:home.x+(rand(s)-.5)*4,y:home.y+(rand(s)-.5)*4}}}
 // v5 (B1): default stance = hold the sector. Units without orders never chase or charge: they fire at what is inside their own range from where they stand.
 if(u.side==='il'&&u.target){var focus=get(s,u.target);if(focus&&dist(u,focus)>(sp.weapons[0]||{range:0}).range)u.goal={x:focus.x,y:focus.y};else if(!focus)u.target=0}
 if(sp.kamikaze){var victim=nearest(s,u,(sp.vision||6)*2);if(victim&&dist(u,victim)<1.3){victim.lastHit='drone';inflict(s,victim,sp.kamikaze.dmg*(sp.kamikaze.vs[U[victim.type].armor]||0), 'blast');u.hp=0;s.events.push({kind:'explosion',x:u.x,y:u.y,time:s.time})}return}
 for(var wi=0;wi<sp.weapons.length;wi++){var weapon=sp.weapons[wi];u.weaponCd[wi]=Math.max(0,(u.weaponCd[wi]||0)-dt*(u.side==='hz'&&weapon.fx==='atgm'&&u.site&&CACHE_ON.has(u.site)?H.cache.atgmMul:1));if(u.weaponCd[wi]>0||u.ammo===0)continue;
  var use=u.sup!==null&&u.sup!==undefined?((sp.supply.use||[])[wi]||.3):0;if(use&&u.sup<use)continue;
  var target=u.target?get(s,u.target):null;if(target&&smokeOn&&u.side==='hz'&&inSmoke(s,target))target=null;if(!target||target.side===u.side||!canHit(u,target,weapon)){var hush=sp.stealth&&u.side==='il'&&!(u.firedT>s.time)&&!(u.strikeT>0)&&!(u.lastHitT&&s.time-u.lastHitT<sp.stealth.fire);target=nearest(s,u,hush?Math.min(weapon.range,sp.stealth.r+.5):weapon.range,v=>canHit(u,v,weapon)&&(!u.route||patrolSuits(u,v)))}
  if(target){attack(s,u,target,weapon);u.weaponCd[wi]=weapon.cd;if(use){u.sup=Math.max(0,u.sup-use);if(u.sup<.3&&!u.outA){u.outA=1;emit(s,sp.n+': נגמרה התחמושת! חזרו לבסיס או הביאו משאית','supply')}}if((sp.jet||sp.ammo)&&u.ammo===0){var home=get(s,s.hq);if(home){u.goal={x:home.x,y:home.y};u.flight='return'}break}}}
}

// ===== v2 realism: tunnels & weapons stores, rocket launch areas, supply =====
var CACHE_ON=new Set();
function landNear(x,y,cls){var gx=clamp(Math.floor(x),0,M.cols-1),gy=clamp(Math.floor(y),0,M.rows-1);if(T[terrain[gy][gx]][cls])return{x:clamp(x,0,M.cols-.01),y:clamp(y,0,M.rows-.01)};var c=nearestPassableCell(gx,gy,cls||'foot');return c<0?{x:gx+.5,y:gy+.5}:{x:c%M.cols+.5,y:((c/M.cols)|0)+.5}}
function setupHidden(s){s.hidden=[];var hq=get(s,s.hq)||{x:40,y:112},n=0;
 function place(list,kind){for(var e of list){var z=s.sites.find(q=>q.key===e[0]);if(!z)continue;var r=((S[z.t]||{}).radius||2)+1.1,p=landNear(z.x+Math.cos(e[1])*r,z.y+Math.sin(e[1])*r,'foot');
  var h={id:'h'+(++n),kind,x:p.x,y:p.y,site:z.key,name:z.n,revealed:false,dead:false,blow:0};
  if(kind==='tunnel'){var q=landNear(p.x+(rand(s)-.5)*6,Math.min(M.rows-2,p.y+H.tunnel.exitDist*(.8+rand(s)*.3)),'foot');if(dist(q,hq)<8)q=landNear(q.x+(q.x<hq.x?-8:8),q.y,'foot');h.ex=q.x;h.ey=q.y;h.popT=H.tunnel.pop*(.6+rand(s)*.8)}
  s.hidden.push(h)}}
 place(D.TUNNELS,'tunnel');place(D.CACHES,'cache');setupSmart(s,n);
 for(var a of D.LAUNCH_AREAS){var p=landNear(D.toTile(a[1],a[0]).x,D.toTile(a[1],a[0]).y,'wheel'),u=makeUnit(s,'hz_launcher','hz',p.x,p.y,{});u.hidden=1;u.revealed=0;u.area=a[2];u.salvoT=H.launcher.salvo*(.45+rand(s)*.6)+(DIFF[s.diff].grace||0)*.5}
 s.v2=1}
function launchers(s){return s.units.filter(u=>u.hp>0&&u.type==='hz_launcher')}
function launchersAlive(s){return launchers(s).length}
function liveCaches(s){var c=new Set();for(var h of s.hidden||[])if(h.kind==='cache'&&!h.dead)c.add(h.site);return c}
function revealRadius(v,H0,dk){var sp=U[v.type],r=sp.engineer?H0.revealEng:v.type==='uav_recon'?H0.revealUav:sp.move==='air'?H0.reveal*.8:H0.reveal;if(sp.detect)r=Math.max(r,sp.detect);if(dk&&!sp.nv)r*=1-DN.spot*dk;return r}
function reveal(s){var dk=darkness(s.time),il=alive(s,'il').filter(v=>!U[v.type].building||v.type==='post'),list=(s.hidden||[]).filter(h=>!h.dead&&!h.revealed).concat(launchers(s).filter(u=>!u.revealed));
 for(var h of list){var kind=h.kind||'launcher',H0=H[kind];for(var v of il)if(Math.hypot(v.x-h.x,v.y-h.y)<revealRadius(v,H0,dk)){h.revealed=1;var text='נחשף '+H0.n+(h.area?' ב'+h.area:' ליד '+h.name)+(kind==='launcher'?' · תקפו אותו (מטוס/מל״ט תקיפה הכי טובים)':kind==='ied'?' · רכבים: לא לעבור! הנדסה תנטרל אותו':' · הנדסה תפוצץ אותו');emit(s,text,'reveal');s.events.push({kind:'reveal',hk:kind,x:h.x,y:h.y,text,time:s.time});break}}
 for(var e of (s.hidden||[])){if(e.kind!=='tunnel'||e.dead||e.exitDead||e.exitSeen||e.revealed)continue;for(var v of il)if(Math.hypot(v.x-e.ex,v.y-e.ey)<revealRadius(v,H.tunnel,dk)){e.exitSeen=1;var tx='נחשפה יציאת מנהרה (הפיר ליד '+e.name+') · הנדסה יכולה לאטום אותה';emit(s,tx,'reveal');s.events.push({kind:'reveal',hk:'exit',x:e.ex,y:e.ey,text:tx,time:s.time});break}}}
// Engineers blow ONLY the object the player picked (shaft, store or tunnel exit). Nothing automatic.
function hiddenTargets(s){var out=[];for(var h of s.hidden||[]){if(h.dead)continue;if(h.revealed)out.push({key:h.id,kind:h.kind,x:h.x,y:h.y,name:h.name,h});
  if(h.kind==='tunnel'&&!h.exitDead&&(h.revealed||h.exitSeen))out.push({key:h.id+'x',kind:'exit',x:h.ex,y:h.ey,name:h.name,h})}return out}
function findHidden(s,key){if(!key)return null;return hiddenTargets(s).find(t=>t.key===key)||null}
function hiddenAt(s,p,r){var best=null,bd=r||1.6;for(var t of hiddenTargets(s)){var d=Math.hypot(t.x-p.x,t.y-p.y);if(d<bd){bd=d;best=t}}return best}
function blowTick(s,u,dt){if(!u.blowT&&!u.goal){for(var c of s.hidden||[])if(c.kind==='ied'&&c.revealed&&!c.dead&&Math.hypot(u.x-c.x,u.y-c.y)<1.8){u.blowT=c.id;break}}if(!u.blowT){u.blowing=0;return}var t=findHidden(s,u.blowT);if(!t){u.blowT=null;u.blowing=0;return}
 if(Math.hypot(u.x-t.x,u.y-t.y)>1.5){u.blowing=0;if(!u.goal)u.goal={x:t.x,y:t.y};return}
 var rate=dt*Math.max(.5,u.soldiers/8);u.blowing=t.key;
 if(t.kind==='exit'){t.h.exitBlow=(t.h.exitBlow||0)+rate;if(t.h.exitBlow>=H.exit.blow)sealExit(s,t.h)}
 else{t.h.blow+=rate;if(t.h.blow>=H[t.kind].blow)blowUp(s,t.h)}
 if(!findHidden(s,u.blowT)){u.blowT=null;u.blowing=0}}
function blowUp(s,h){if(h.dead)return;if(h.kind==='ied'){h.dead=true;h.cleared=1;s.money+=H.ied.bounty;var tx='🛠 מטען הצד ליד '+h.name+' נוטרל · +'+H.ied.bounty+' ₪';emit(s,tx,'blown');s.events.push({kind:'blown',x:h.x,y:h.y,text:tx,time:s.time});return}h.dead=true;var sealed=h.kind==='tunnel'&&!h.exitDead;if(h.kind==='tunnel')h.exitDead=true;var b=H[h.kind].bounty;s.money+=b;var text='💥 '+H[h.kind].n+' ליד '+h.name+' פוצץ! +'+b+' ₪'+(sealed?' · היציאה נאטמה':'');emit(s,text,'blown');
 s.events.push({kind:'explosion',x:h.x,y:h.y,big:1,time:s.time},{kind:'explosion',x:h.x+.6,y:h.y-.4,big:1,time:s.time},{kind:'blown',x:h.x,y:h.y,text,time:s.time});
 if(sealed)s.events.push({kind:'explosion',x:h.ex,y:h.ey,big:1,time:s.time});
 if(h.kind==='cache')for(var u of s.units)if(u.side==='hz'&&u.site===h.site&&u.hp>0&&!U[u.type].building&&dist(u,h)<4)inflict(s,u,40,'blast')}
function sealExit(s,h){if(h.exitDead||h.dead)return;h.exitDead=true;var b=H.exit.bounty;s.money+=b;var text='💥 יציאת המנהרה (הפיר ליד '+h.name+') נאטמה! +'+b+' ₪ · אין יותר הגחות ממנה';emit(s,text,'blown');
 s.events.push({kind:'explosion',x:h.ex,y:h.ey,big:1,time:s.time},{kind:'blown',x:h.ex,y:h.ey,text,time:s.time})}
// "פוצץ" order: key = the object the player tapped. Without a key, only an object the engineers are already standing at (≤2.5 tiles).
function blowOrder(s,ids,key){var eng=ids.map(id=>get(s,id)).filter(u=>u&&u.side==='il'&&U[u.type].engineer&&!u.carriedBy);if(!eng.length)return null;var t=null;
 if(key)t=findHidden(s,key);else{var bd=2.5;for(var u of eng)for(var c of hiddenTargets(s)){var d=Math.hypot(u.x-c.x,u.y-c.y);if(d<bd){bd=d;t=c}}}
 if(!t)return null;eng.forEach((u,i)=>{u.goal={x:t.x+(i%2)*.4,y:t.y+((i/2)|0)*.4};u.blowT=t.key;u.target=0;u.hold=0;u.stand=0;u.route=null});return t}
// ===== v3: UAV / helicopter area-defence patrol route =====
var PATROL={lowHp:.35,readyHp:.9,extra:1.5,leash:4};
function canPatrol(u){var sp=U[u.type];return !!(sp&&u.side==='il'&&sp.move==='air'&&!sp.jet&&!sp.building&&(sp.weapons||[]).length)}
function patrolSuits(u,v){var sp=U[u.type],tv=U[v.type];if(!tv||(tv.building&&!tv.launcher))return false;return (sp.weapons||[]).some(w=>(w.vs[tv.armor]||0)>=.5)}
function routeDist(route,p){if(route.length===1)return dist(route[0],p);var m=1e9;for(var i=0;i<route.length;i++)m=Math.min(m,distanceToLine(p,route[i],route[(i+1)%route.length]));return m}
function setRoute(s,ids,points){var pts=(points||[]).map(clampPos);if(!pts.length)return 0;var all=new Set(ids);for(var id of ids){var u=get(s,id);if(u&&u.side==='il'&&u.group)for(var a of s.units)if(a.hp>0&&a.group===u.group)all.add(a.id)}
 var n=0;for(var id of all){var u=get(s,id);if(!u||u.carriedBy||!canPatrol(u))continue;u.route=pts.map(p=>({x:p.x,y:p.y}));u.routeI=n%pts.length;u.target=0;u.stand=0;u.pEng=0;u.blowT=null;if(!u.flight)u.goal=u.route[u.routeI];n++}
 if(n)emit(s,n+' כלי טיס בנתיב הגנת שטח ('+pts.length+' נקודות)','patrol');return n}
function hold(s,ids){var n=0;for(var id of ids){var u=get(s,id);if(!u||u.side!=='il')continue;if(u.art&&u.art.st==='goto')u.art.st='';if(u.route)n++;u.route=null;u.pEng=0;u.blowT=null;if(!u.flight){u.goal=null;u.path=null}u.target=0;u.hold=3;u.stand=1}return n}
function patrolTick(s,u,sp){if(u.flight||u.ammo===0||!u.route.length)return;var range=Math.max(0,...(sp.weapons||[]).map(w=>w.range)),acq=range+PATROL.extra;
 var t=u.target?get(s,u.target):null;if(t&&(!patrolSuits(u,t)||routeDist(u.route,t)>acq+PATROL.leash))t=null;
 if(!t)t=nearest(s,u,acq,v=>patrolSuits(u,v));
 if(t){if(!u.pEng&&u.side==='il')s.events.push({kind:'engage',x:t.x,y:t.y,time:s.time});u.target=t.id;u.pEng=1;u.goal=dist(u,t)>range*.85?{x:t.x,y:t.y}:null;return}
 u.target=0;if(u.pEng){u.pEng=0;u.goal=u.route[u.routeI%u.route.length];return}
 if(!u.goal){u.routeI=(u.routeI+1)%u.route.length;u.goal=u.route[u.routeI]}}
function launcherDown(s,u){var b=H.launcher.bounty,n=launchersAlive(s);s.money+=b;var text='💥 משגר רקטות הושמד ב'+(u.area||'')+' · +'+b+' ₪ · '+(n?'נותרו '+n:'כל המשגרים הושמדו! מגן שמיים חוזר לרגיל');emit(s,text,'blown');s.events.push({kind:'blown',x:u.x,y:u.y,text,time:s.time})}
function hiddenTick(s,dt){if(!s.hidden)return;var dif=DIFF[s.diff];s.revealT=(s.revealT||0)+dt;if(s.revealT>=.5){s.revealT=0;reveal(s)}
 if(s.time<=dif.grace)return;
 // tunnels: a squad pops out at the exit now and then, while Israeli forces are around
 for(var h of s.hidden){if(h.kind!=='tunnel'||h.dead||h.exitDead)continue;h.popT-=dt;if(h.popT>0)continue;h.popT=H.tunnel.pop*(dif.prod||1)*(.75+rand(s)*.5);
  if(s.units.some(u=>u.hp>0&&u.tunnel===h.id))continue;var ilNear=alive(s,'il').filter(v=>U[v.type].move!=='air'&&dist(v,{x:h.ex,y:h.ey})<26);if(!ilNear.length)continue;
  var a=makeUnit(s,'hz_inf','hz',h.ex+(rand(s)-.5)*1.5,h.ey+(rand(s)-.5)*1.5,{});a.tunnel=h.id;a.raid=1;var prey=ilNear.filter(v=>!U[v.type].building).sort((p,q)=>dist(p,a)-dist(q,a))[0];if(prey&&dist(prey,a)<16)a.goal={x:prey.x,y:prey.y};
  h.exitSeen=1;var text='⚠ חוליית חיזבאללה יצאה ממנהרה מאחורי הקווים (הפיר ליד '+h.name+')';emit(s,text,'tunnelpop');s.events.push({kind:'tunnelpop',x:h.ex,y:h.ey,text,time:s.time})}
 // rocket launch areas: each live launcher fires a salvo toward northern Israel every so often
 for(var u of launchers(s)){u.salvoT-=dt;if(u.salvoT>0)continue;u.salvoT=H.launcher.salvo*(dif.drone||1)*(.8+rand(s)*.5);
  var town=D.IL_TOWNS[Math.floor(rand(s)*D.IL_TOWNS.length)],tt=D.toTile(town[2],town[1]),n=3+Math.floor(rand(s)*4);
  var text='🚀 שיגור מ'+u.area+' לעבר '+town[0];emit(s,text,'salvo');s.salvos=(s.salvos||0)+1;
  s.events.push({kind:'salvo',x:u.x,y:u.y,tx:tt.x,ty:tt.y,n,text,time:s.time},{kind:'lzone',x:u.x+(rand(s)-.5)*3,y:u.y+(rand(s)-.5)*3,time:s.time})}}
// Supply zones: HQ, captured sites (forward bases), built posts and supply trucks. Rebuilt once per time stamp.
var ZONES={s:null,t:-1,z:null};
function supplyZones(s){if(ZONES.s===s&&ZONES.t===s.time)return ZONES.z;var z=[],hq=get(s,s.hq);if(hq)z.push({x:hq.x,y:hq.y,r:6+SUP.zoneExtra});
 for(var p of s.units)if(p.side==='il'&&p.hp>0&&!p.carriedBy){if(p.type==='post'&&p.built!==false)z.push({x:p.x,y:p.y,r:3.5+SUP.zoneExtra});else if(U[p.type].supplier)z.push({x:p.x,y:p.y,r:SUP.truckRadius,truck:p.id})}
 for(var q of s.sites)if(q.owner==='il')z.push({x:q.x,y:q.y,r:((S[q.t]&&S[q.t].radius)||3)+1.2+SUP.zoneExtra});ZONES={s,t:s.time,z};return z}
function inSupplyZone(s,u){for(var z of supplyZones(s))if(Math.hypot(u.x-z.x,u.y-z.y)<z.r)return z;return null}
function resupply(s,u,sp,dt){var mA=sp.supply.ammo||0,mF=sp.supply.fuel||0;if((u.sup===null||u.sup>=mA)&&(u.fuel===null||u.fuel>=mF)){u.resup=0;return}var z=inSupplyZone(s,u);if(!z){u.resup=0;return}
 if(u.sup!==null&&u.sup<mA){u.sup=Math.min(mA,u.sup+mA*SUP.refillAmmo*dt);if(u.sup>5)u.outA=0}if(u.fuel!==null&&u.fuel<mF)u.fuel=Math.min(mF,u.fuel+mF*SUP.refillFuel*dt);u.resup=z.truck?2:1}
function supplyLevel(u){var sp=U[u.type];if(!sp.supply)return null;return{ammo:u.sup===null?null:u.sup/sp.supply.ammo,fuel:u.fuel===null?null:u.fuel/sp.supply.fuel}}
// Captured cities become forward bases: new units roll out of the northernmost one.
function forwardBase(s){var h=get(s,s.hq);if(!h)return null;var f=s.sites.filter(z=>z.owner==='il'&&(z.t==='city'||z.t==='main')).sort((a,b)=>a.y-b.y)[0];return f?{x:f.x,y:f.y+2,name:f.n}:{x:h.x,y:h.y,name:'בסיס פיקוד צפון'}}
function production(s,dt){var h0=get(s,s.hq);if(!h0)return;var h=forwardBase(s);for(var q of ['inf','veh','air']){var list=s.queue[q];if(!list.length)continue;list[0].remaining-=dt;
 if(list[0].remaining<=0){var type=list.shift().type,sp=U[type],offset=s.nextId%6;
  var p={x:h.x+(q==='air'?1:q==='veh'?4:-4)+(offset%3)*.9,y:h.y-2.5-(offset/3|0)*1.1};var u=makeUnit(s,type,'il',p.x,p.y);emit(s,sp.n+' מוכנים לפקודה','unit');s.events.push({kind:'built',id:u.id,type,time:s.time})}}}
function ai(s,dt){var hzAll=alive(s,'hz'),mobile=hzAll.filter(v=>!U[v.type].building&&v.type!=='drone').length,dif=DIFF[s.diff];
 for(var site of s.sites){if(site.owner!=='hz')continue;var rule=S[site.t],building=get(s,site.building);if(!building){site.prod=999;site.droneT=999;continue}
  site.prod-=dt*(CACHE_ON.has(site.key)?H.cache.prodMul:1);site.droneT-=dt;
  var mine=hzAll.filter(v=>v.site===site.key&&!U[v.type].building),troops=mine.filter(v=>v.type!=='drone'),drones=mine.length-troops.length;
  if(site.prod<=0){site.prod=rule.prod*dif.prod*(.75+rand(s)*.5);if(troops.length<rule.cap+Math.round((site.depth||0)*3)&&mobile<dif.cap){var list=rule.make,type=list[Math.floor(rand(s)*list.length)],a=makeUnit(s,type,'hz',site.x+(rand(s)-.5)*5,site.y+(rand(s)-.5)*5,{site:site.key});a.hold=1;mobile++;
   if(site.t!=='outpost'&&rand(s)<.2&&['tech_mg','tech_atgm','tech_aa','hz_apc','hz_tank'].includes(type)){var target=alive(s,'il').filter(v=>!U[v.type].building&&dist(v,site)<30).sort((a,b)=>dist(a,site)-dist(b,site))[0];if(target){a.goal={x:target.x,y:target.y};a.raid=1}}}}
  if(site.droneT<=0&&s.time>dif.grace){site.droneT=rule.drones*dif.drone*(.8+rand(s)*.5);var prey=alive(s,'il').filter(v=>!U[v.type].building&&dist(v,site)<rule.droneRange).sort((a,b)=>dist(a,site)-dist(b,site))[0];
   if(prey&&drones<rule.droneMax){var drone=makeUnit(s,'drone','hz',site.x+2,site.y-2,{site:site.key});drone.goal={x:prey.x,y:prey.y};drone.raid=1;emit(s,'רחפן נפץ שוגר מ'+site.n,'drone')}}
 }
 // Reinforcements: a base under attack calls mobile units from friendly villages and cities within reach.
 s.aiHelpT=(s.aiHelpT||0)+dt;if(s.aiHelpT>8&&s.time>dif.grace*.5){s.aiHelpT=0;var ilGround=alive(s,'il').filter(u=>U[u.type].move!=='air');
  for(var z of s.sites){if(z.owner!=='hz'||!get(s,z.building))continue;var r=S[z.t].radius+4.5;if(!ilGround.some(u=>dist(u,z)<r))continue;
   var helpers=hzAll.filter(u=>!U[u.type].building&&u.type!=='drone'&&!u.raid&&u.site&&u.site!==z.key&&dist(u,z)<26&&(s.sites.find(q=>q.key===u.site)||{}).t!=='outpost').sort((a,b)=>dist(a,z)-dist(b,z)).slice(0,dif.help||2);
   if(helpers.length){helpers.forEach(u=>{u.goal={x:z.x+(rand(s)-.5)*3,y:z.y+(rand(s)-.5)*3};u.raid=1});emit(s,'חיזבאללה מתגבר את '+z.n,'reinforce')}}}
 if(s.time>dif.grace)s.aiAttackT+=dt;if(s.aiAttackT>dif.counter){s.aiAttackT=0;
  // Counterattack: the nearest enemy-held village/city sends its mobile force at the closest Israeli position.
  var ilPos=alive(s,'il').filter(u=>U[u.type].move!=='air'&&!(smokeOn&&inSmoke(s,u)));
  var force=hzAll.filter(u=>!U[u.type].building&&u.type!=='drone'&&!u.raid&&u.site&&(s.sites.find(q=>q.key===u.site)||{}).t!=='outpost');
  var pick=null,bd=1e9;for(var u of force)for(var v of ilPos){var d=dist(u,v);if(d<bd){bd=d;pick=v}}
  if(pick&&bd<45){var n=0;force.sort((a,b)=>dist(a,pick)-dist(b,pick)).slice(0,dif.wave).forEach((u,i)=>{u.goal={x:pick.x+(i%3)-1,y:pick.y+((i/3)|0)-1};u.raid=1;n++});if(n)emit(s,'⚠ מתקפת נגד של חיזבאללה: '+n+' כלים','counter')}}}
function capture(s,dt){for(var site of s.sites){if(site.owner==='il')continue;var rule=S[site.t];var present=alive(s,'il').filter(u=>u.soldiers>0&&dist(u,site)<rule.radius+1.2);
 var guards=alive(s,'hz').filter(u=>!U[u.type].building&&u.type!=='drone'&&dist(u,site)<rule.radius+3.4);
 // Destroy HQ + clear defenders, then hold with infantry; tanks cannot capture.
 if(!get(s,site.building)&&guards.length===0&&present.length){site.capture+=dt*(1+(present.length-1)*.2)*(present.some(u=>u.strikeT>0&&U[u.type].strike)?Math.max(...present.filter(u=>u.strikeT>0&&U[u.type].strike).map(u=>U[u.type].strike.cap)):1);
  if(site.capture>=rule.capture){site.owner='il';site.capture=rule.capture;s.captures++;grant(s,rule.bounty);emit(s,site.n+' נכבשה!','capture');s.events.push({kind:'city',key:site.key,name:site.n,time:s.time});
   if(site.t==='city')emit(s,site.n+' היא עכשיו בסיס קדמי: יחידות חדשות יוצאות ממנה','forward');
   if(site.key==='beirut'){s.won=true;emit(s,'ניצחון! ביירות נכבשה — חזית לבנון הוכרעה','win')}}}
 else if(site.capture>0)site.capture=Math.max(0,site.capture-dt*.38);
}}
function step(s,seconds){if(s.paused||s.won||s.lost)return;
 seconds=Math.min(seconds,.15)*s.speed;s.time+=seconds;s.events=[];production(s,seconds);
 // Avoid O(N²) with large late-game swarms; dead objects pruned on a schedule.
 CACHE_ON=liveCaches(s);smokeOn=!!(s.smokes&&s.smokes.length);var list=s.units.filter(u=>u.hp>0);for(var u of list)actUnit(s,u,seconds);
 v4Tick(s,seconds);
 hiddenTick(s,seconds);v5Tick(s,seconds);
 ai(s,seconds);capture(s,seconds);
 s.incomeT+=seconds;if(s.incomeT>=15){s.incomeT-=15;var n=(get(s,s.hq)?DIFF[s.diff].base||0:0)+s.sites.filter(z=>z.owner==='il').reduce((sum,z)=>sum+z.income,0);if(n){s.money+=n;s.income=n}}
 if(!get(s,s.hq)){s.lost=true;emit(s,'בסיס פיקוד צפון הושמד. נסו שוב!','lose')}
 if(s.units.length>650)s.units=s.units.filter(u=>u.hp>0||u.id===s.hq);
}
// Fog of war: a per-tile visibility grid refreshed four times a second of game time.
var VIS={s:null,t:-9,g:null};
function vision(s){if(VIS.s===s&&Math.abs(s.time-VIS.t)<.25&&VIS.g)return VIS.g;var g=VIS.s===s&&VIS.g?VIS.g.fill(0):new Uint8Array(M.cols*M.rows);
 function mark(cx,cy,r){var x0=Math.max(0,Math.floor(cx-r)),x1=Math.min(M.cols-1,Math.ceil(cx+r)),y0=Math.max(0,Math.floor(cy-r)),y1=Math.min(M.rows-1,Math.ceil(cy+r)),r2=r*r;
  for(var y=y0;y<=y1;y++)for(var x=x0;x<=x1;x++){var dx=x+.5-cx,dy=y+.5-cy;if(dx*dx+dy*dy<r2)g[y*M.cols+x]=1}}
 var dk=darkness(s.time),sv=10*(1-(1-DN.siteVis)*dk);
 for(var u of s.units)if(u.side==='il'&&u.hp>0&&!u.carriedBy)mark(u.x,u.y,(U[u.type].vision||5)*1.9*(dk&&!U[u.type].nv?1-DN.vis*dk:1));
 for(var site of s.sites)if(site.owner==='il')mark(site.x,site.y,sv);
 if(s.intelReveal&&s.time<s.intelReveal.until)mark(s.intelReveal.x,s.intelReveal.y,s.intelReveal.r);VIS={s,t:s.time,g};return g}
function inFog(s,x,y){if(!s.fog)return false;if(x<0||y<0||x>=M.cols||y>=M.rows)return true;return !vision(s)[Math.floor(y)*M.cols+Math.floor(x)]}
function upgrade(o){if(o.hidden&&!o.v5)setupSmart(o,o.hidden.length+100);o.strikes=o.strikes||[];o.smokes=o.smokes||[];o.crates=o.crates||[];for(var u of o.units){var sp=U[u.type];if(!sp)continue;if(u.sup===undefined)u.sup=sp.supply&&sp.supply.ammo?sp.supply.ammo:null;if(u.fuel===undefined)u.fuel=sp.supply&&sp.supply.fuel?sp.supply.fuel:null}if(!o.hidden)setupHidden(o);return o}
function save(s){var o={...s,events:[],units:s.units.filter(u=>u.hp>0||u.id===s.hq)};return JSON.stringify(o)}
function restore(raw){try{var o=JSON.parse(raw);if(o.version!==1||!o.sites||!o.units||!DIFF[o.diff])return null;
 o.events=[];o.messages=o.messages||[];o.stats=o.stats||{trophy:0};upgrade(o);return o}catch(e){return null}}

// ===== v4 stage 2: artillery battery, paratroopers + transport planes, supply airdrop, Golani sweep =====
var smokeOn=false,ARTY_FIXED=new Set(['deploying','deployed','packing']);
function inSmoke(s,u){for(var c of s.smokes||[])if(c.until>s.time&&Math.hypot(u.x-c.x,u.y-c.y)<c.r)return true;return false}
function art(u){return u.art||(u.art={st:'',t:0,fireCd:0,smokeCd:0})}
function isArty(u){return !!(u&&u.side==='il'&&U[u.type].barrage&&!u.carriedBy&&u.hp>0)}
function artTick(s,u,dt){var a=art(u);a.fireCd=Math.max(0,a.fireCd-dt);a.smokeCd=Math.max(0,a.smokeCd-dt);
 if(a.st==='goto'){if(!u.goal){a.st='deploying';a.t=AR.deploy;emit(s,'תותחנים נפרסים · '+AR.deploy+' שניות','arty')}return}
 if(a.st==='deploying'){u.goal=null;a.t-=dt;if(a.t<=0){a.st='deployed';a.t=0;emit(s,'🎯 התותחנים פרוסים: ״אש״ או ״עשן״ ואז נקודה בתוך העיגול','arty');s.events.push({kind:'deployed',x:u.x,y:u.y,time:s.time})}return}
 if(a.st==='deployed'){u.goal=null;return}
 if(a.st==='packing'){u.goal=null;a.t-=dt;if(a.t<=0){a.st='';a.t=0;emit(s,'התותחנים קופלו · אפשר לזוז','arty')}}}
// "פריסה": drive to p (or deploy where they stand when p is omitted). Returns how many batteries took the order.
function deployOrder(s,ids,p){var n=0;for(var id of ids){var u=get(s,id);if(!isArty(u))continue;var a=art(u);if(ARTY_FIXED.has(a.st))continue;u.route=null;u.target=0;u.hold=0;u.stand=0;
  if(p){var q=landNear(clamp(p.x,0,M.cols-.01),clamp(p.y,0,M.rows-.01),'track');q.x+=(n%2)*1.1;q.y+=((n/2)|0)*1.1;u.goal=q;u.path=null;a.st='goto'}else{u.goal=null;a.st='deploying';a.t=AR.deploy}n++}
 if(n&&p)emit(s,n>1?n+' סוללות בדרך לפריסה':'התותחנים בדרך לנקודת הפריסה','arty');return n}
function packOrder(s,ids){var n=0;for(var id of ids){var u=get(s,id);if(!isArty(u))continue;var a=art(u);if(a.st==='deployed'||a.st==='deploying'){a.st='packing';a.t=AR.pack;n++}else if(a.st==='goto'){a.st='';u.goal=null;n++}}if(n)emit(s,'מקפלים את הסוללה · '+AR.pack+' שניות','arty');return n}
function inArtyRange(u,p){var d=dist(u,p);return d<=AR.range&&d>=AR.minRange}
// "אש" / "עשן" at point p: every selected deployed battery in range with the shot ready fires. Returns {n, reason}.
function artyFire(s,ids,p,kind){kind=kind==='smoke'?'smoke':'fire';var K=AR[kind],n=0,reason='notDeployed';
 for(var id of ids){var u=get(s,id);if(!isArty(u))continue;var a=art(u);if(a.st!=='deployed'){continue}
  if(!inArtyRange(u,p)){if(reason!=='cooldown'&&reason!=='ammo')reason=dist(u,p)<AR.minRange?'tooClose':'range';continue}
  var cd=kind==='fire'?a.fireCd:a.smokeCd;if(cd>0){reason='cooldown';continue}if(u.sup!==null&&u.sup!==undefined&&u.sup<K.ammo){reason='ammo';continue}
  if(u.sup!==null&&u.sup!==undefined)u.sup=Math.max(0,u.sup-K.ammo);if(kind==='fire')a.fireCd=K.cd;else a.smokeCd=K.cd;
  var j=n?{x:p.x+(rand(s)-.5)*1.2,y:p.y+(rand(s)-.5)*1.2}:{x:p.x,y:p.y};
  s.strikes.push(kind==='fire'?{kind:'fire',x:j.x,y:j.y,r:K.radius,t:K.warn,warn:K.warn,v:K.volleys,by:u.id,started:s.time}:{kind:'smoke',x:j.x,y:j.y,r:K.radius,t:K.delay,by:u.id,started:s.time});
  s.events.push({kind:'shot',x:u.x,y:u.y,tx:j.x,ty:j.y,fx:'shell',side:'il',time:s.time});n++}
 if(n)emit(s,kind==='fire'?'💥 מטח ארטילרי בדרך · '+AR.fire.warn+' שניות עד הפגיעה (פוגע גם בכוחות שלנו!)':'🌫 פגזי עשן בדרך · מסך עשן ל-'+AR.smoke.dur+' שניות','arty');
 return {n,reason:n?'':reason}}
function barrageImpact(s,st){var K=AR.fire,per=K.dmg/K.volleys,hit=0;
 for(var u of s.units){if(u.hp<=0||u.carriedBy)continue;var sp=U[u.type];if(sp.move==='air')continue;var d=Math.hypot(u.x-st.x,u.y-st.y);if(d>st.r*1.05)continue;
  var vs=U.artillery.barrage.vs[sp.armor]||0;if(!vs)continue;var dmg=per*vs*(1-.5*Math.min(1,d/st.r))*(u.side==='il'?AR.friendly:1);u.lastHit='artillery';u.lastBy=st.by;u.lastHitT=s.time;inflict(s,u,dmg,'shell');hit++}
 for(var k=0;k<3;k++){var a=rand(s)*6.283,r=rand(s)*st.r*.85;s.events.push({kind:'explosion',x:st.x+Math.cos(a)*r,y:st.y+Math.sin(a)*r,big:k===0?1:0,time:s.time})}return hit}
// Paratroopers: board where they stand (HQ, our city/village or a post) → a transport plane drops them at p.
function canBoard(s,u){return inHealZone(s,u)}
function dropOrder(s,ids,p){var all=new Set(ids);for(var id of ids){var u=get(s,id);if(u&&u.side==='il'&&u.group)for(var a of s.units)if(a.hp>0&&a.group===u.group)all.add(a.id)}
 var paras=[],far=0;for(var id of all){var u=get(s,id);if(!u||u.side!=='il'||!U[u.type].para||u.carriedBy||u.landT>0)continue;if(!canBoard(s,u)){far++;continue}paras.push(u)}
 if(!paras.length)return {planes:0,troops:0,reason:far?'notAtBase':'none'};p=clampPos(p);var planes=0;
 for(var i=0;i<paras.length;i+=PA.perPlane){var batch=paras.slice(i,i+PA.perPlane),o=batch[0];var pl=makeUnit(s,'c130','il',o.x-.5-planes*.8,o.y+.8+planes*.6);pl.flight='drop';
  pl.drop={x:p.x+(planes%2)*1.2,y:p.y+((planes/2)|0)*1.2,hx:o.x,hy:o.y,done:false,payload:'para'};pl.goal={x:pl.drop.x,y:pl.drop.y};
  for(var u of batch){u.carriedBy=pl.id;u.goal=null;u.route=null;u.target=0;u.blowT=null;pl.cargo.push(u.id)}planes++}
 emit(s,'🪂 '+planes+' מטוס'+(planes>1?'י':'')+' תובלה המריאו עם '+paras.length+' מחלקות צנחנים','drop');return {planes,troops:paras.length,reason:far?'someNotAtBase':''}}
function planeTick(s,u,dt){var dr=u.drop;if(!dr){u.hp=0;return}var goal=dr.done?{x:dr.hx,y:dr.hy}:{x:dr.x,y:dr.y};u.goal=goal;move(s,u,dt);
 if(!dr.done&&dist(u,goal)<.8){dr.done=true;if(dr.payload==='crate'){s.crates.push({x:dr.x,y:dr.y,t:SD.fall,by:u.id});emit(s,'📦 הארגז בדרך למטה','supplydrop')}
   else{var n=0;for(var id of u.cargo){var c=get(s,id);if(!c)continue;var a=n*2.1+.4,r=n?PA.spread:0,q=landNear(dr.x+Math.cos(a)*r,dr.y+Math.sin(a)*r,'foot');c.carriedBy=0;c.x=q.x;c.y=q.y;c.landT=PA.landT;c.goal=null;c.hold=0;n++}
    u.cargo=[];emit(s,'🪂 '+n+' מחלקות צנחנים נחתו · פגיעים כמה שניות','drop');s.events.push({kind:'drop',x:dr.x,y:dr.y,time:s.time})}}
 if(dr.done&&dist(u,{x:dr.hx,y:dr.hy})<1){u.hp=0;u.gone=1}}
function planeDown(s,pl){var lost=0;for(var id of pl.cargo||[]){var c=get(s,id);if(c){c.carriedBy=0;c.hp=0;lost++}}pl.cargo=[];
 var text=pl.drop&&pl.drop.payload==='crate'?'✈ מטוס האספקה הופל! הארגז אבד':'✈ מטוס התובלה הופל!'+(lost?' '+lost+' מחלקות צנחנים אבדו':'');emit(s,text,'planedown');s.events.push({kind:'blown',x:pl.x,y:pl.y,text,time:s.time})}
// One-time supply airdrop: pays now, a plane from the forward base drops a crate at p.
function supplyDrop(s,p){if(s.won||s.lost||s.money<SD.cost)return false;var b=forwardBase(s);if(!b)return false;s.money-=SD.cost;p=clampPos(p);
 var pl=makeUnit(s,'c130','il',b.x-1,b.y+1);pl.flight='drop';pl.drop={x:p.x,y:p.y,hx:b.x,hy:b.y,done:false,payload:'crate'};pl.goal={x:p.x,y:p.y};emit(s,'📦 מטוס אספקה המריא','supplydrop');return pl.id}
function crateLand(s,c){var n=0;for(var u of s.units){if(u.side!=='il'||u.hp<=0||u.carriedBy)continue;var sp=U[u.type];if(sp.building||sp.transportPlane)continue;if(Math.hypot(u.x-c.x,u.y-c.y)>SD.radius)continue;
  if(sp.supply){if(sp.supply.ammo)u.sup=sp.supply.ammo;if(sp.supply.fuel)u.fuel=sp.supply.fuel;u.outA=0}if(sp.ammo!==undefined)u.ammo=sp.ammo;u.hp=Math.min(u.maxHp,u.hp+u.maxHp*SD.heal);n++}
 var text='📦 אספקה נחתה: '+n+' יחידות קיבלו תחמושת, דלק וחיים';emit(s,text,'supplydrop');s.events.push({kind:'resupply',x:c.x,y:c.y,r:SD.radius,text,time:s.time});return n}
// Golani "סריקה": only inside a village/city. Reveals tunnels/stores/exits/launchers in radius, +50% damage for 20 s.
function isUrban(s,u){var g=ground(u.x,u.y);if(g==='village'||g==='city')return true;for(var z of s.sites)if(z.t!=='outpost'&&Math.hypot(u.x-z.x,u.y-z.y)<((S[z.t]||{}).radius||2)+1)return true;return false}
function sweepOrder(s,ids){var n=0,found=0,reason='none';for(var id of ids){var u=get(s,id);if(!u||u.side!=='il'||!U[u.type].sweep||u.carriedBy)continue;
  if(u.sweepCd>0){if(reason!=='notUrban')reason='cooldown';continue}if(!isUrban(s,u)){reason='notUrban';continue}
  u.sweepT=SWP.dur;u.sweepCd=SWP.cd;n++;s.events.push({kind:'sweep',x:u.x,y:u.y,r:SWP.radius,time:s.time});
  for(var h of s.hidden||[]){if(h.dead)continue;if(!h.revealed&&Math.hypot(h.x-u.x,h.y-u.y)<SWP.radius){h.revealed=1;found++;s.events.push({kind:'reveal',hk:h.kind,x:h.x,y:h.y,time:s.time})}
   if(h.kind==='tunnel'&&!h.exitDead&&!h.exitSeen&&Math.hypot(h.ex-u.x,h.ey-u.y)<SWP.radius){h.exitSeen=1;found++}}
  for(var l of launchers(s))if(!l.revealed&&Math.hypot(l.x-u.x,l.y-u.y)<SWP.radius){l.revealed=1;found++;s.events.push({kind:'reveal',hk:'launcher',x:l.x,y:l.y,time:s.time})}}
 if(n)emit(s,'🔍 סריקת גולני: '+(found?'נחשפו '+found+' יעדים · ':'לא נמצאו מנהרות או מחסנים · ')+'+50% כוח אש ל-'+SWP.dur+' שניות','sweep');return {n,found,reason:n?'':reason}}
function v4Tick(s,dt){if(!s.strikes)s.strikes=[];if(!s.smokes)s.smokes=[];if(!s.crates)s.crates=[];
 for(var st of s.strikes){st.t-=dt;if(st.t>0)continue;if(st.kind==='smoke'){s.smokes.push({x:st.x,y:st.y,r:st.r,until:s.time+AR.smoke.dur,from:s.time});st.done=1;emit(s,'🌫 מסך עשן: האויב לא רואה את הכוחות שבתוכו','smoke');continue}
  barrageImpact(s,st);st.v--;if(st.v<=0)st.done=1;else st.t=AR.fire.gap}
 s.strikes=s.strikes.filter(x=>!x.done);if(s.smokes.length)s.smokes=s.smokes.filter(c=>c.until>s.time);
 for(var c of s.crates){c.t-=dt;if(c.t<=0){crateLand(s,c);c.done=1}}if(s.crates.length)s.crates=s.crates.filter(c=>!c.done)}

// ===== v5: smarter enemy (ambushes, roadside IEDs, counterattacks that retake villages), control groups, coordinated attack =====
var BORDER_T=D.BORDER.map(b=>({lon:b[1],lat:b[0]}));
function inLebanon(p){var ll=D.toLonLat(p.x,p.y),B=BORDER_T;if(ll.lon<B[0].lon)return ll.lat>B[0].lat+.01;for(var i=1;i<B.length;i++)if(ll.lon<=B[i].lon){var t=(ll.lon-B[i-1].lon)/(B[i].lon-B[i-1].lon);return ll.lat>B[i-1].lat+(B[i].lat-B[i-1].lat)*t+.01}return false}
function setupSmart(s,n0){if(!s.hidden)s.hidden=[];var hq=get(s,s.hq)||{x:40,y:112},n=n0||0,ie=SM.ied,am=SM.ambush,dif=s.diff;s.v5=1;
 var siteNear=(p,r)=>s.sites.some(z=>dist(z,p)<r),onRoad=()=>{var road=roads[Math.floor(rand(s)*roads.length)];if(!road||road.length<2)return null;var i=1+Math.floor(rand(s)*(road.length-1)),t=rand(s),a=road[i-1],b=road[i];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,dx:b.x-a.x,dy:b.y-a.y}};
 var want=ie.count[dif]||8,tries=0,placed=[];
 while(placed.length<want&&tries++<5000){var p=onRoad();if(!p||ground(p.x,p.y)!=='road'||!inLebanon(p)||dist(p,hq)<ie.minHq||p.y>hq.y-4||siteNear(p,3)||placed.some(q=>dist(q,p)<ie.gap))continue;
  var z=s.sites.slice().sort((x,y)=>dist(x,p)-dist(y,p))[0];s.hidden.push({id:'h'+(++n),kind:'ied',x:p.x,y:p.y,site:z?z.key:'',name:z?z.n:'',revealed:false,dead:false,blow:0});placed.push(p)}
 var wa=am.count[dif]||5,pl=[];tries=0;
 while(pl.length<wa&&tries++<5000){var p=onRoad();if(!p)continue;var L=Math.hypot(p.dx,p.dy)||1,side=rand(s)<.5?-1:1,off=1.5+rand(s)*.8,q={x:p.x-p.dy/L*off*side,y:p.y+p.dx/L*off*side};
  var g=ground(q.x,q.y);if(!['forest','village','hills','open','beach'].includes(g)||!canPass(q.x,q.y,'hz_inf')||!inLebanon(q)||dist(q,hq)<am.minHq||q.y>hq.y-6||siteNear(q,4.5)||pl.some(o=>dist(o,q)<am.gap))continue;
  var type=am.types[pl.length%am.types.length],u=makeUnit(s,type,'hz',q.x,q.y,{});u.hidden=1;u.revealed=0;u.ambush=1;u.hold=3;pl.push(q)}}
function ambushTick(s,u){var near=nearest(s,u,SM.ambush.trigger,v=>U[v.type].move!=='air'&&!U[v.type].building),hit=u.lastHitT&&s.time-u.lastHitT<1.5;
 if(!near&&!hit){if(!u.revealed){var eye=nearest(s,u,SM.ambush.uavSpot,v=>v.type==='uav_recon'),mk=eye?null:spotter(s,u);if(eye||mk){u.revealed=1;var t0=mk?'👁 סיירת מטכ״ל זיהתה מארב של חיזבאללה ליד הדרך':'👁 מל״ט סיור זיהה מארב של חיזבאללה ליד הדרך';emit(s,t0,'reveal');s.events.push({kind:'reveal',hk:'ambush',x:u.x,y:u.y,text:t0,time:s.time})}}return}
 var t1='⚠ מארב! חוליית חיזבאללה פתחה באש מהשטח';emit(s,t1,'ambush');s.events.push({kind:'ambush',x:u.x,y:u.y,text:t1,time:s.time});s.stats.ambushes=(s.stats.ambushes||0)+1;
 for(var o of s.units)if(o.ambush===1&&o.hp>0&&dist(o,u)<6){o.ambush=2;o.revealed=1;o.burstT=SM.ambush.burstT;o.weaponCd=[]}}
// Units with sp.detect (Sayeret Matkal) spot hidden ambush squads within that radius (they are not seen by them, so no nearest()).
function spotter(s,u){for(var v of s.units){if(v.side!=='il'||v.hp<=0||v.carriedBy)continue;var sp=U[v.type];if(sp.detect&&dist(u,v)<sp.detect)return v}return null}
function iedTick(s,dt){s.iedT=(s.iedT||0)+dt;if(s.iedT<.2)return;s.iedT=0;
 for(var h of s.hidden||[]){if(h.kind!=='ied'||h.dead||h.revealed)continue;var v=null;
  for(var u of s.units){if(u.side!=='il'||u.hp<=0||u.carriedBy)continue;var sp=U[u.type];if(sp.cls!=='veh'||sp.move==='air'||sp.building||sp.transportPlane)continue;if(Math.hypot(u.x-h.x,u.y-h.y)<SM.ied.trigger){v=u;break}}
  if(!v)continue;h.dead=true;h.blewUp=1;s.stats.ieds=(s.stats.ieds||0)+1;
  for(var u of s.units){if(u.side!=='il'||u.hp<=0||u.carriedBy)continue;var sp=U[u.type];if(sp.move==='air')continue;var d=Math.hypot(u.x-h.x,u.y-h.y);if(d>SM.ied.radius)continue;var dm=(SM.ied.dmg[sp.armor]||0)*(1-.4*d/SM.ied.radius);if(dm>0){u.lastHit='ied';inflict(s,u,dm,'blast')}}
  var tx='💥 מטען צד התפוצץ ליד '+h.name+' · '+U[v.type].n+' נפגע. הנדסה ומל״ט סיור חושפים מטענים';emit(s,tx,'ied');s.events.push({kind:'explosion',x:h.x,y:h.y,big:1,time:s.time},{kind:'blown',x:h.x,y:h.y,text:tx,time:s.time})}}
function retakeTick(s,dt){var R=SM.retake,dif=DIFF[s.diff];if(s.time<=dif.grace)return;var rt=s.retake;
 if(rt){rt.t-=dt;var force=rt.ids.map(id=>get(s,id)).filter(Boolean),z=s.sites.find(q=>q.key===rt.key);if(!z||z.owner!=='il'||!force.length){s.retake=null;return}
  if(rt.phase==='gather'&&rt.t<=0){rt.phase='attack';rt.t=100;force.forEach((u,i)=>{u.goal={x:z.x+(i%3)-1,y:z.y+((i/3)|0)-1};u.raid=1});var tx='⚠ מתקפת נגד: חיזבאללה מסתער על '+z.n+'! השאירו שם כוח כדי להחזיק בו';emit(s,tx,'counter');s.events.push({kind:'retake',x:z.x,y:z.y,text:tx,time:s.time})}
  else if(rt.phase==='attack'){for(var u of force)if(!u.goal&&dist(u,z)>2.5&&!nearest(s,u,5))u.goal={x:z.x,y:z.y};if(rt.t<=0)s.retake=null}return}
 s.retakeT=(s.retakeT||0)+dt;if(s.retakeT<(R.every[s.diff]||240))return;s.retakeT=0;
 var hz=alive(s,'hz').filter(u=>!U[u.type].building&&u.type!=='drone'&&!u.raid&&!u.ambush&&U[u.type].move!=='air'&&u.site),ilG=alive(s,'il').filter(u=>U[u.type].move!=='air'&&!U[u.type].building);
 var cands=s.sites.filter(z=>z.owner==='il'&&(z.t==='village'||z.t==='outpost')).map(z=>({z,g:hz.filter(u=>dist(u,z)<R.range),def:ilG.filter(u=>dist(u,z)<(S[z.t].radius||3)+6).length})).filter(c=>c.g.length>=2).sort((a,b)=>(a.def-b.def)||(b.g.length-a.g.length));
 var c=cands[0];if(!c)return;var force=c.g.sort((a,b)=>dist(a,c.z)-dist(b,c.z)).slice(0,R.size[s.diff]||4);
 var cx=force.reduce((a,u)=>a+u.x,0)/force.length,cy=force.reduce((a,u)=>a+u.y,0)/force.length,dd=Math.hypot(cx-c.z.x,cy-c.z.y)||1,k=Math.min(1,7/dd),rally=landNear(c.z.x+(cx-c.z.x)*k,c.z.y+(cy-c.z.y)*k,'foot');
 force.forEach((u,i)=>{u.goal={x:rally.x+(i%3)-1,y:rally.y+((i/3)|0)*.8};u.raid=1;u.retake=c.z.key});s.stats.counters=(s.stats.counters||0)+1;
 s.retake={key:c.z.key,phase:'gather',t:R.gather,ids:force.map(u=>u.id),x:rally.x,y:rally.y};
 var tx='⚠ חיזבאללה מתקבץ ליד '+c.z.n+' למתקפת נגד ('+force.length+' כוחות)';emit(s,tx,'counter');s.events.push({kind:'retake',x:rally.x,y:rally.y,text:tx,time:s.time})}
// v6a: city counterattacks. Every ~8 min (normal) while we hold a city, Hezbollah masses 6-8 units incl. ATGM teams
// at a rally point near one of our cities, warns 30 s ahead, then storms it. Same retake rule as villages (recapture()).
function cityRaidTick(s,dt){var C=SM.cityRaid,dif=DIFF[s.diff];if(!C||s.time<=dif.grace)return;var cr=s.cityRaid;
 if(cr){cr.t-=dt;var force=cr.ids.map(id=>get(s,id)).filter(u=>u&&u.hp>0),z=s.sites.find(q=>q.key===cr.key);if(!z||z.owner!=='il'||!force.length){s.cityRaid=null;return}
  if(cr.phase==='gather'&&cr.t<=0){cr.phase='attack';cr.t=C.attack;force.forEach((u,i)=>{u.goal={x:z.x+(i%3)-1,y:z.y+((i/3)|0)-1};u.raid=1});var tx='⚠ התקפת נגד: חיזבאללה מסתער על '+z.n+'! השאירו בעיר כוח כדי להחזיק בה';emit(s,tx,'counter');s.events.push({kind:'retake',x:z.x,y:z.y,text:tx,time:s.time})}
  else if(cr.phase==='attack'){for(var u of force)if(!u.goal&&dist(u,z)>3&&!nearest(s,u,5))u.goal={x:z.x,y:z.y};if(cr.t<=0){for(var u of force)u.retake=0;s.cityRaid=null}}return}
 var cities=s.sites.filter(z=>z.owner==='il'&&z.t==='city');if(!cities.length)return;
 s.cityRaidT=(s.cityRaidT||0)+dt;if(s.cityRaidT<(C.every[s.diff]||480))return;s.cityRaidT=0;
 var ilG=alive(s,'il').filter(u=>U[u.type].move!=='air'&&!U[u.type].building);
 var z=cities.map(c=>({c,def:ilG.filter(u=>dist(u,c)<S.city.radius+6).length})).sort((a,b)=>a.def-b.def||a.c.y-b.c.y)[0].c;
 var size=C.size[s.diff]||7,needAtgm=C.atgm[s.diff]||2;
 var pool=alive(s,'hz').filter(u=>!U[u.type].building&&u.type!=='drone'&&!u.raid&&!u.ambush&&!u.retake&&U[u.type].move!=='air'&&u.site&&dist(u,z)<C.range).sort((a,b)=>dist(a,z)-dist(b,z));
 var force=pool.slice(0,size),isAtgm=u=>u.type==='hz_atgm'||u.type==='tech_atgm';
 var home=s.sites.filter(q=>q.owner==='hz'&&q.key!==z.key).sort((a,b)=>dist(a,z)-dist(b,z))[0]||{x:z.x,y:Math.max(2,z.y-14),key:''};
 // Top-ups (incl. the ATGM teams) come from Hezbollah's reserve and respect its mobile-unit cap, so a worn-down enemy sends what it has left.
 var mobile=alive(s,'hz').filter(u=>!U[u.type].building&&u.type!=='drone').length,room=Math.min(C.spawn,Math.max(0,(dif.cap||90)-mobile));
 var spawn=t=>{if(room<=0)return null;room--;var p=landNear(home.x+(rand(s)-.5)*4,home.y+(rand(s)-.5)*4,'foot'),u=makeUnit(s,t,'hz',p.x,p.y,{site:home.key});force.push(u);return u},k=0;
 while(force.filter(isAtgm).length<needAtgm&&room>0){var drop=force.length>=size?force.filter(u=>!isAtgm(u)).pop():null;if(drop)force.splice(force.indexOf(drop),1);spawn('hz_atgm')}
 while(force.length<size&&room>0)spawn(C.fill[k++%C.fill.length]);
 if(force.length<C.min)return;
 var cx=home.x,cy=home.y,dd=Math.hypot(cx-z.x,cy-z.y)||1,kk=Math.min(1,C.rally/dd),rally=landNear(z.x+(cx-z.x)*kk,z.y+(cy-z.y)*kk,'foot');
 force.forEach((u,i)=>{u.goal={x:rally.x+(i%3)-1,y:rally.y+((i/3)|0)*.8};u.raid=1;u.retake=z.key;u.hold=0});s.stats.cityRaids=(s.stats.cityRaids||0)+1;s.stats.counters=(s.stats.counters||0)+1;
 s.cityRaid={key:z.key,name:z.n,phase:'gather',t:C.warn,ids:force.map(u=>u.id),x:rally.x,y:rally.y};
 var tx='⚠ חיזבאללה מתקבץ להתקפת נגד על '+z.n;emit(s,tx,'counter');s.events.push({kind:'retake',x:rally.x,y:rally.y,text:tx,time:s.time})}
function recapture(s,dt){var R=SM.retake,hz=null,il=null;for(var z of s.sites){if(z.owner!=='il'||!(z.t==='village'||z.t==='outpost'||z.t==='city'))continue;var r=(S[z.t].radius||2.5)+1.2;
  hz=hz||alive(s,'hz').filter(u=>u.retake&&!U[u.type].building&&u.type!=='drone'&&U[u.type].move!=='air');
  if(!hz.some(u=>u.retake===z.key&&dist(u,z)<r)){if(z.lostT)z.lostT=Math.max(0,z.lostT-dt);continue}
  il=il||alive(s,'il').filter(u=>U[u.type].move!=='air'&&!U[u.type].building);if(il.some(u=>dist(u,z)<r+2)){if(z.lostT)z.lostT=Math.max(0,z.lostT-dt);continue}
  z.lostT=(z.lostT||0)+dt;if(z.lostT<R.hold)continue;z.lostT=0;z.owner='hz';z.capture=0;s.captures=Math.max(0,s.captures-1);var rule=S[z.t];z.prod=rule.prod;
  var b=makeUnit(s,rule.bld,'hz',z.x,z.y,{site:z.key});b.hp*=.5;z.building=b.id;s.stats.lostSites=(s.stats.lostSites||0)+1;
  for(var u of hz)if(dist(u,z)<r+3||u.retake===z.key){u.site=z.key;u.raid=0;u.retake=0;u.goal=null;u.hold=1}if(s.retake&&s.retake.key===z.key)s.retake=null;if(s.cityRaid&&s.cityRaid.key===z.key)s.cityRaid=null;
  var tx='⚠ '+z.n+' נכבשה מחדש בידי חיזבאללה! צריך לכבוש אותה שוב';note(s,tx);s.events.push({kind:'lostsite',key:z.key,x:z.x,y:z.y,text:tx,time:s.time})}}
function v5Tick(s,dt){if(!s.v5&&s.hidden)setupSmart(s,s.hidden.length+100);iedTick(s,dt);retakeTick(s,dt);cityRaidTick(s,dt);v6Tick(s,dt);s.recT=(s.recT||0)+dt;if(s.recT>=.5){recapture(s,s.recT);s.recT=0}}
// ===== v6b: Sayeret Matkal "⚡ פשיטה" (2× capture speed and 2× damage for 15 s, cooldown 90 s) =====
function strikeOrder(s,ids){var n=0,cd=0,none=0;for(var id of ids||[]){var u=get(s,id);if(!u||u.side!=='il'||u.hp<=0||!U[u.type].strike){continue}if(u.carriedBy){none++;continue}if(u.strikeCd>0){cd++;continue}var st=U[u.type].strike;u.strikeT=st.dur;u.strikeCd=st.cd;n++}
 if(n){var tx='⚡ פשיטה! '+U.matkal.n+': כיבוש פי '+U.matkal.strike.cap+' מהר ונזק כפול ל-'+U.matkal.strike.dur+' שניות';emit(s,tx,'strike');s.events.push({kind:'strike',n,time:s.time})}
 return {n,reason:n?'':cd?'cooldown':'none'}}
// ===== v6b: intel on a senior Hezbollah commander hiding in a village =====
function intelFront(s){var pts=alive(s,'il').filter(u=>!U[u.type].building&&U[u.type].move!=='air').map(u=>({x:u.x,y:u.y}));for(var z of s.sites)if(z.owner==='il')pts.push(z);var hq=get(s,s.hq);if(hq)pts.push(hq);return pts}
function intelStart(s,key){if(s.intel)return null;var z=key?s.sites.find(q=>q.key===key):null;
 if(!z){var front=intelFront(s),cand=s.sites.filter(q=>q.owner==='hz'&&q.t==='village');if(!cand.length)return null;
  var score=q=>Math.min(...front.map(p=>dist(p,q)));cand.sort((a,b)=>score(a)-score(b));cand=cand.slice(0,IN.pick);z=cand[Math.floor(rand(s)*cand.length)]}
 if(!z||z.owner!=='hz')return null;
 s.intel={key:z.key,n:z.n,x:z.x,y:z.y,state:'hiding',t0:s.time,until:s.time+IN.timer,carrier:0,matkal:false};s.stats.intel=(s.stats.intel||0)+1;
 var tx='🕵 בכיר חיזבאללה מסתתר ב'+z.n+' · '+Math.round(IN.timer/60)+' דק׳ לכבוש את הכפר ולהחזיר את הכוח שתפס אותו לבסיס או לעיר בארץ';
 s.intel.text=tx;note(s,tx);s.events.push({kind:'intel',sub:'start',key:z.key,x:z.x,y:z.y,text:tx,time:s.time});return s.intel}
function intelCaptor(s,z){var r=(S[z.t].radius||2.5)+1.2,best=null,bd=1e9;for(var u of alive(s,'il')){if(!(u.soldiers>0)||u.carriedBy||U[u.type].building)continue;var d=dist(u,z)-(U[u.type].stealth?100:0);if(dist(u,z)<r+3&&d<bd){bd=d;best=u}}
 if(!best)for(var u of alive(s,'il')){if(!(u.soldiers>0)||U[u.type].building)continue;var d=dist(u,z);if(d<9&&d<bd){bd=d;best=u}}return best}
function intelHome(s,p){var hq=get(s,s.hq);if(hq&&dist(p,hq)<IN.deliver+1)return 'בסיס פיקוד צפון';for(var t of D.IL_TOWNS){var q=D.toTile(t[2],t[1]);q={x:clamp(q.x,0,M.cols-.5),y:clamp(q.y,0,M.rows-.5)};if(dist(p,q)<IN.deliver)return t[0]}return ''}
function intelEnd(s,why){var it=s.intel;if(!it)return;var c=it.carrier&&get(s,it.carrier);if(c)c.prisoner=0;s.intel=null;s.intelT=IN.every;
 var tx=why==='dead'?'🏃 הכוח שהחזיק את הבכיר נפגע · הבכיר ברח':'🏃 הזמן נגמר · הבכיר מ'+it.n+' ברח';note(s,tx);s.stats.intelLost=(s.stats.intelLost||0)+1;s.events.push({kind:'intel',sub:'escaped',key:it.key,x:it.x,y:it.y,text:tx,time:s.time})}
function intelReveal(s,x,y,r){var n=0;for(var h of s.hidden||[]){if(h.dead)continue;if(!h.revealed&&Math.hypot(h.x-x,h.y-y)<r){h.revealed=true;n++}if(h.kind==='tunnel'&&!h.exitDead&&!h.exitSeen&&(h.revealed&&Math.hypot(h.x-x,h.y-y)<r||Math.hypot(h.ex-x,h.ey-y)<r)){h.exitSeen=1;n++}}
 for(var u of s.units)if(u.side==='hz'&&u.hp>0&&u.hidden&&!u.revealed&&Math.hypot(u.x-x,u.y-y)<r){u.revealed=1;n++}
 s.intelReveal={x,y,r,until:s.time+IN.revealT};VIS.t=-9;return n}
function intelTick(s,dt){if(s.won||s.lost)return;if(s.intelT===undefined)s.intelT=IN.first;var it=s.intel;
 if(!it){s.intelT-=dt;if(s.intelT<=0){if(!intelStart(s))s.intelT=30}return}
 var z=s.sites.find(q=>q.key===it.key);if(!z){s.intel=null;s.intelT=IN.every;return}
 if(it.state==='hiding'){if(s.time>=it.until)return intelEnd(s,'timeout');
  if(z.owner==='il'){var c=intelCaptor(s,z);if(!c)return;c.prisoner=1;it.state='carried';it.carrier=c.id;it.matkal=!!U[c.type].stealth;
   var tx='⛓ הבכיר נתפס ב'+z.n+' בידי '+U[c.type].n+'! החזירו אותם לבסיס או לעיר בארץ לפני שהזמן נגמר';note(s,tx);s.events.push({kind:'intel',sub:'caught',id:c.id,x:c.x,y:c.y,text:tx,time:s.time})}return}
 var c=get(s,it.carrier);if(!c||c.hp<=0)return intelEnd(s,'dead');if(s.time>=it.until)return intelEnd(s,'timeout');
 var p=c.carriedBy?(get(s,c.carriedBy)||c):c,home=intelHome(s,p);if(!home)return;
 var pay=Math.round(IN.reward*(it.matkal?1+IN.matkalBonus:1));s.money+=pay;c.prisoner=0;var found=intelReveal(s,it.x,it.y,IN.reveal);s.intel=null;s.intelT=IN.every;s.stats.intelWon=(s.stats.intelWon||0)+1;
 var tx='🎖 הבכיר נמסר ב'+home+'! +'+pay.toLocaleString('en-US')+' ₪'+(it.matkal?' (כולל בונוס מטכ״ל +50%)':'')+' · המודיעין חשף את האזור סביב '+it.n+(found?' ('+found+' יעדים)':'');
 note(s,tx);s.events.push({kind:'intel',sub:'done',pay,x:it.x,y:it.y,text:tx,time:s.time})}
function v6Tick(s,dt){intelTick(s,dt)}
// Control groups 1-4 (stored on the units, so they survive saves). A unit belongs to one group at a time.
function setCtrlGroup(s,n,ids){n=n|0;if(n<1||n>D.CTRL.groups)return 0;var set=new Set(ids),k=0;for(var u of s.units){if(u.side!=='il')continue;if(set.has(u.id)&&u.hp>0&&!U[u.type].building){u.cg=n;k++}else if(u.cg===n)u.cg=0}return k}
function ctrlGroup(s,n){return s.units.filter(u=>u.side==='il'&&u.hp>0&&!u.carriedBy&&u.cg===n).map(u=>u.id)}
// Attack order (B6): units that cannot damage the target do not move; a deployed battery in range fires its barrage at the enemy.
function attackOrder(s,ids,targetId,p){var t=get(s,targetId),all=new Set(ids);for(var id of ids){var u=get(s,id);if(u&&u.side==='il'&&u.group)for(var a of s.units)if(a.hp>0&&a.group===u.group&&a.side==='il')all.add(a.id)}
 var list=[...all].map(id=>get(s,id)).filter(u=>u&&u.side==='il'&&!u.carriedBy&&!U[u.type].building);
 if(!t||t.side==='il')return {n:p?setOrder(s,list.filter(u=>!U[u.type].barrage).map(u=>u.id),p,0,true):0,cant:[],fired:0,arty:0,artyReason:''};
 var ok=[],cant=[],arty=[];for(var u of list){if(U[u.type].barrage)arty.push(u);else if(canDamage(u.type,t.type))ok.push(u);else cant.push(u)}
 var dep=arty.filter(u=>art(u).st==='deployed'),fr=dep.length?artyFire(s,dep.map(u=>u.id),{x:t.x,y:t.y},'fire'):{n:0,reason:'notDeployed'};
 var n=ok.length?setOrder(s,ok.map(u=>u.id),p||{x:t.x,y:t.y},t.id,true):0;
 return {n,cant:cant.map(u=>u.id),fired:fr.n,arty:arty.length,artyReason:arty.length&&!fr.n?fr.reason:''}}
// Coordinated attack: while s.coord is open every order is queued; coordExec fires them all in the same instant.
function command(s,o){var ids=o.ids||[];switch(o.kind){
 case 'move':return setOrder(s,ids,o.p,0);case 'attack':return attackOrder(s,ids,o.target,o.p);case 'blow':return blowOrder(s,ids,o.key);
 case 'deploy':return deployOrder(s,ids,o.p||null);case 'fire':case 'smoke':return artyFire(s,ids,o.p,o.kind);case 'drop':return dropOrder(s,ids,o.p);
 case 'supply':return supplyDrop(s,o.p);case 'route':return setRoute(s,ids,o.points);case 'pack':return packOrder(s,ids);case 'hold':return hold(s,ids);
 case 'sweep':return sweepOrder(s,ids);case 'load':return load(s,o.tid,ids);case 'unload':return ids.reduce((a,id)=>a+unload(s,id),0);case 'build':return buildPost(s,ids[0]);case 'strike':return strikeOrder(s,ids)}return null}
function coordStart(s){if(!s.coord)s.coord={orders:[],t0:s.time};return s.coord}
function coordCancel(s){var n=s.coord?s.coord.orders.length:0;s.coord=null;return n}
function coordExec(s){if(!s.coord)return [];var list=s.coord.orders;s.coord=null;var out=list.map(o=>command(s,o));if(list.length){emit(s,'⚔ התקפה מתואמת: '+list.length+' פקודות יצאו בבת אחת','coord');s.events.push({kind:'coord',n:list.length,time:s.time})}return out}
function order(s,o){if(s.coord){o.n=s.coord.orders.length+1;s.coord.orders.push(o);return {queued:o.n}}return command(s,o)}
function visionGrid(s){return vision(s)}

// ===== v4: what each unit can attack, and which order buttons fit the selection =====
var ARMOR_N={inf:'חי״ר',light:'רכב קל',armor:'שריון',bld:'מבנים',drone:'רחפנים',air:'כלי טיס'},ARMOR_ORDER=['inf','light','armor','bld','drone','air'];
function vsTable(type){var sp=U[type],t={};if(!sp)return t;if(sp.kamikaze){for(var k in sp.kamikaze.vs)t[k]=sp.kamikaze.vs[k];return t}
 for(var w of sp.weapons||[])for(var k in w.vs)t[k]=Math.max(t[k]||0,w.vs[k]);if(sp.barrage)for(var k of ['inf','light','armor','bld'])t[k]=Math.max(t[k]||0,sp.barrage.vs[k]||0);return t}
function canDamage(attType,tgtType){var ts=U[tgtType];if(!ts)return false;return (vsTable(attType)[ts.armor]||0)>0}
function attacksText(type){var sp=U[type];if(!sp)return '';if(sp.supplier)return '🎯 לא תוקף · מחדשת תחמושת ודלק';if(sp.transportPlane)return '🎯 לא תוקף · מצניח כוחות';
 var t=vsTable(type),good=[],weak=[],no=[];for(var k of ARMOR_ORDER){var v=t[k]||0;(v>=.3?good:v>0?weak:no).push(ARMOR_N[k])}
 if(!good.length&&!weak.length)return '🎯 לא תוקף';
 return (sp.barrage?'🎯 מטח (רק כשפרוס): ':'🎯 תוקף: ')+good.join(', ')+(weak.length?' · חלש נגד: '+weak.join(', '):'')+(no.length?' · לא: '+no.join(', '):'')}
// Order buttons for a selection (union over the unit types). hold/group/split are always offered.
function actionsFor(units){var a=new Set(['stop','group','split']);for(var u of units||[]){var sp=U[u.type];if(!sp)continue;
  if(sp.engineer){a.add('blow');a.add('build')}if(sp.para){a.add('drop')}if(sp.barrage){a.add('deploy');a.add('fire');a.add('smoke');a.add('pack')}
  if(sp.carry){a.add('load');a.add('unload')}if(u.soldiers>0)a.add('load');if(canPatrol(u))a.add('route');if(sp.sweep)a.add('sweep');if(sp.strike)a.add('strike')}return a}
var api={darkness,dayPhase,nightVis,note,strikeOrder,intelStart,intelTick,intelEnd,intelHome,intelReveal,intelCaptor,v6Tick,spotter,aliveOf,atMax,inLebanon,setupSmart,ambushTick,iedTick,retakeTick,cityRaidTick,recapture,setCtrlGroup,ctrlGroup,attackOrder,command,coordStart,coordCancel,coordExec,order,visionGrid,SM,inSmoke,art,isArty,deployOrder,packOrder,artyFire,inArtyRange,barrageImpact,dropOrder,canBoard,supplyDrop,crateLand,isUrban,sweepOrder,vsTable,canDamage,attacksText,actionsFor,ARMOR_N,setRoute,hold,canPatrol,patrolSuits,hiddenTargets,findHidden,hiddenAt,sealExit,PATROL,setupHidden,launchers,launchersAlive,blowOrder,blowUp,supplyZones,inSupplyZone,supplyLevel,liveCaches,upgrade,forwardBase,flowField,D,terrain,ground,coast,river,bridges,tileAt,dist,clamp,canPass,make,makeUnit,get,alive,step,buy,queue,setOrder,group,split,load,unload,buildPost,bonus,inflict,attack,capture,inFog,save,restore,grant,emit};
root.LF=root.LF||{};root.LF.sim=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
