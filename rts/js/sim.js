/* LEBANON FRONT — simulation only. No DOM or canvas: ready for a future 3D renderer. */
(function(root){'use strict';
var D = root.LF && root.LF.data || (typeof require === 'function' ? require('./data.js') : null);
if(!D) throw Error('Map data not loaded');
var M=D.MAP,U=D.UNITS,T=D.TERRAIN,S=D.SITE_T,DIFF=D.DIFF;
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
  trophy:spec.trophy?spec.trophy.charges:0,trophyCd:0,loiter:spec.loiter||0,ammo:spec.ammo===undefined?null:spec.ammo,flight:'',flash:0};
 if(side==='hz'&&s.diff&&DIFF[s.diff].hp){var zz=opts.site&&s.sites.find(q=>q.key===opts.site),deep=zz?zz.depth||0:0;a.hp*=DIFF[s.diff].hp*(1+deep*(spec.building?.5:.35));a.maxHp=a.hp}
 if(opts.hp!==undefined)a.hp=opts.hp;s.units.push(a);return a;}
function make(seed,diff){diff=DIFF[diff]?diff:'normal';var s={version:1,seed:seed===undefined?20261027:seed,diff,time:0,nextId:0,nextGroup:0,money:DIFF[diff].money,units:[],sites:[],hq:0,
  queue:{inf:[],veh:[],air:[]},events:[],messages:[],incomeT:0,aiT:0,aiAttackT:0,won:false,lost:false,paused:false,speed:1,kills:0,captures:0,stats:{trophy:0},fog:1};
 var h=D.toTile(D.HOME.lon,D.HOME.lat);s.hq=makeUnit(s,'hq','il',h.x,h.y).id;
 [['golani',-4,-2],['nahal',-1.5,-2.8],['givati',1.5,-2.8],['engineer',-4.5,1],['merkava',4,-1.5],['namer',4.5,1.2],['uav_recon',0,-4]].forEach(v=>makeUnit(s,v[0],'il',h.x+v[1],h.y+v[2]));
 for(var site of D.SITES){var p=D.toTile(site.lon,site.lat),rule=S[site.t];var z={key:site.key,n:site.n,t:site.t,x:p.x,y:p.y,depth:clamp((108-p.y)/95,0,1),owner:'hz',capture:0,prod:rule.prod*(.7+rand(s)*.5),droneT:rule.drones*(.8+rand(s)*.5),income:rule.income,building:0};
 s.sites.push(z);z.building=makeUnit(s,rule.bld,'hz',z.x,z.y,{site:z.key}).id;
 // Sparse starting garrisons; outpost anti-air and ATGM are real tactical threats.
 var start=rule.start.filter((_,i)=>rand(s)<(i<2?1:DIFF[diff].startMul));
 for(var j=0;j<start.length;j++){var a=(j*2.4)+rand(s),r=2.0+(j%3)*.75;var u=makeUnit(s,start[j],'hz',clamp(z.x+Math.cos(a)*r,1,M.cols-2),clamp(z.y+Math.sin(a)*r,1,M.rows-2),{site:z.key});u.hold=1;}
 }s.messages=['ברוכים הבאים לחזית לבנון — כיבוש ביירות מנצח'];return s;}
function get(s,id){return s.units.find(u=>u.id===id&&u.hp>0)}
function alive(s,side){return s.units.filter(u=>u.hp>0&&!u.carriedBy&&(!side||u.side===side))}
function emit(s,text,kind){if(s.messages[0]!==text)s.messages.unshift(text);s.messages=s.messages.slice(0,6);s.events.push({kind:kind||'message',text,time:s.time})}
function grant(s,n){s.money+=n;emit(s,'+'+n+' ₪ לתקציב המלחמה','money')}
function queue(s,type){var sp=U[type];if(!sp||sp.side!=='il'||!sp.q||s.won||s.lost||s.money<sp.cost||s.queue[sp.q].length>=D.QUEUE_MAX[sp.q])return false;
 s.money-=sp.cost;s.queue[sp.q].push({type,remaining:sp.time});emit(s,sp.n+' בייצור','queue');return true}
function buy(s,type){if(!queue(s,type))return false; // "buy" queues only, to respect one-at-a-time vehicles and aircraft.
 return true}
function setOrder(s,ids,p,attackId){p=clampPos(p);var idsToCommand=new Set(ids);for(var id of ids){var u=get(s,id);if(u&&u.side==='il'&&u.group)for(var ally of s.units)if(ally.hp>0&&ally.group===u.group)idsToCommand.add(ally.id)}
 var n=0, i=0;for(var id of idsToCommand){var u=get(s,id);if(!u||u.side!=='il'||u.carriedBy||U[u.type].building||u.flight)continue;
 var offset={x:((i%4)-1.5)*1.3,y:Math.floor(i/4)*1.3},at=clampPos({x:p.x+offset.x,y:p.y+offset.y});u.goal=at;u.target=attackId||0;u.hold=0;u.path=null;n++;i++}return n}
function group(s,ids){var a=ids.map(id=>get(s,id)).filter(u=>u&&u.side==='il'&&!u.carriedBy);if(a.length<2)return 0;var g=++s.nextGroup;a.forEach(u=>u.group=g);emit(s,a.length+' יחידות אוגדו','group');return g}
function split(s,ids){var a=ids.map(id=>get(s,id)).filter(u=>u&&u.side==='il'&&!u.carriedBy);
 if(a.length>1){var mid=Math.ceil(a.length/2),g1=++s.nextGroup,g2=++s.nextGroup;a.forEach((u,i)=>u.group=i<mid?g1:g2);emit(s,'פיצול: '+mid+' + '+(a.length-mid),'split');return [a.slice(0,mid).map(u=>u.id),a.slice(mid).map(u=>u.id)]}
 var u=a[0];if(!u||u.soldiers<2)return [];var n=Math.ceil(u.soldiers/2),m=u.soldiers-n,perHP=u.hp/u.soldiers;
 u.soldiers=n;u.maxHp=n*U[u.type].hpPer;u.hp=Math.min(u.maxHp,perHP*n);u.group=0;
 var p={x:clamp(u.x+1,0,M.cols-1),y:clamp(u.y+1,0,M.rows-1)},b=makeUnit(s,u.type,'il',p.x,p.y,{soldiers:m,hp:Math.min(m*U[u.type].hpPer,perHP*m)});
 emit(s,'מחלקה פוצלה: '+n+' + '+m,'split');return [[u.id],[b.id]]}
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
 for(var by=y0;by<=y1;by++)for(var bx=x0;bx<=x1;bx++)for(var t of b[by*BW+bx]){if(t.side===u.side||t.hp<=0||t.carriedBy)continue;var d=dist(u,t);if(d>=bd)continue;if(filter&&!filter(t))continue;best=t;bd=d}return best}
function canSee(s,u){if(u.side==='il')return true;return alive(s,'il').some(v=>dist(u,v)<(U[v.type].vision||5)*1.85)}
function bonus(a,terrainType,defending){var sp=U[a.type],atk=1,def=1;if(sp.bonus==='urban'&&['village','city'].includes(terrainType))atk=D.BONUS.urban.atk,def=D.BONUS.urban.def;
 if(sp.bonus==='forest'&&terrainType==='forest')atk=D.BONUS.forest.atk,def=D.BONUS.forest.def;
 if(sp.bonus==='hold'&&defending&&a.hold>2)atk=D.BONUS.hold.atk,def=D.BONUS.hold.def;return {atk,def}}
function inflict(s,target,damage,fx,randVal){if(target.hp<=0)return {damage:0,intercepted:false};var sp=U[target.type];
 if(fx==='atgm'&&sp.trophy&&target.trophy>0&&target.trophyCd<=0&&(randVal===undefined?rand(s):randVal)<sp.trophy.chance){target.trophy--;target.trophyCd=sp.trophy.reload;s.stats.trophy++;s.events.push({kind:'trophy',x:target.x,y:target.y,time:s.time});return {damage:0,intercepted:true}}
 var g=ground(target.x,target.y),b=bonus(target,g,true),cover=T[g].cover||0;damage*=b.def*(1-cover*.52);
 if(target.side==='hz'&&target.site&&!target.raid&&!sp.building&&target.hold>1)damage*=D.BONUS.dug.def; // dug in at their base
 target.hp=Math.max(0,target.hp-damage);target.flash=.22;
 s.events.push({kind:'hit',x:target.x,y:target.y,fx,time:s.time});if(target.hp<=0){s.events.push({kind:'explosion',x:target.x,y:target.y,time:s.time});if(target.cargo&&target.cargo.length){for(var id of target.cargo){var child=get(s,id);if(child){child.carriedBy=0;child.x=target.x+1;child.y=target.y+1;child.hp=Math.max(1,child.hp*.45)}}target.cargo=[]}
 if(target.side==='il'){s.stats.lost=s.stats.lost||{};var lk=(target.lastHit||'?');s.stats.lost[lk]=(s.stats.lost[lk]||0)+1}
 if(target.side==='hz'){s.kills++;s.money+=Math.min(75,Math.round((sp.hp||sp.soldiers*sp.hpPer)*.05))}}
 return {damage,intercepted:false}}
function attack(s,attacker,target,weapon){var a=U[attacker.type],t=U[target.type],factor=weapon.vs[t.armor]||0;if(!factor)return false;
 var n=a.soldiers?attacker.soldiers:1,terrainType=ground(attacker.x,attacker.y),power=bonus(attacker,terrainType,false).atk;
 var dmg=weapon.dmg*factor*power*(weapon.perSquad?1:n)*((attacker.side==='hz')?DIFF[s.diff].dmg:1);
 target.lastHit=attacker.type;var result=inflict(s,target,dmg,weapon.fx);s.events.push({kind:'shot',x:attacker.x,y:attacker.y,tx:target.x,ty:target.y,fx:weapon.fx,side:attacker.side,time:s.time});
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
 var vx=(way.x-u.x)/wd,vy=(way.y-u.y)/wd,mult=sp.move==='air'?1:(T[ground(u.x,u.y)][cls]||.45),step=sp.speed*dt*mult;
 var nx=u.x+vx*Math.min(wd,step),ny=u.y+vy*Math.min(wd,step);
 if(sp.move!=='air'&&!canPass(nx,ny,u.type)&&canPass(u.x,u.y,u.type)){u.direct=false;u.stuck=(u.stuck||0)+dt;if(u.stuck>8){u.goal=null;u.stuck=0;return}
  // re-centre on the current tile so the next flow-field step is clean
  var cxm=Math.floor(u.x)+.5,cym=Math.floor(u.y)+.5,cd=Math.hypot(cxm-u.x,cym-u.y);if(cd>.05){var k=Math.min(1,step/cd);u.x+=(cxm-u.x)*k;u.y+=(cym-u.y)*k}return}
 u.x=clamp(nx,0,M.cols-.01);u.y=clamp(ny,0,M.rows-.01);u.facing=Math.atan2(vy,vx);u.hold=0;u.stuck=0;
 if(dist(u,goal)<.4){u.goal=null;u.path=null;u.hold=0}}
function actUnit(s,u,dt){var sp=U[u.type];u.cool=Math.max(0,u.cool-dt);u.flash=Math.max(0,u.flash-dt);u.trophyCd=Math.max(0,u.trophyCd-dt);
 if(u.carriedBy)return;if(sp.loiter&&!u.flight){u.loiter-=dt;if(u.loiter<=0){var base=get(s,s.hq);if(base){u.goal={x:base.x+2,y:base.y-1};u.target=0;u.flight='return';emit(s,sp.n+' חוזר לבסיס לתדלוק','rtb')}else u.hp=0}}
 if(!u.built){u.buildT-=dt;if(u.buildT<=0){u.built=true;emit(s,'עמדת רואה־יורה מוכנה','post')}return}
 if(sp.engineer){var damaged=alive(s,'il').filter(v=>v.id!==u.id&&v.hp<v.maxHp&&['armor','air'].includes(U[v.type].armor)&&dist(u,v)<4.7);
  if(damaged.length){var v=damaged[0];v.hp=Math.min(v.maxHp,v.hp+7*dt*(u.soldiers/8));if(Math.floor(s.time)%5===0)s.events.push({kind:'repair',x:v.x,y:v.y,time:s.time})}}
 if(u.flight==='return'){u.goal=u.goal||(get(s,s.hq)?{x:get(s,s.hq).x+2,y:get(s,s.hq).y-1}:null);move(s,u,dt);if(!u.goal||dist(u,u.goal)<.5){u.goal=null;u.flight='rearm';u.cool=U[u.type].rearm||15}return}
 if(u.flight==='rearm'){u.cool-=dt;if(sp.engineer===undefined&&u.hp<u.maxHp)u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.04*dt);if(u.cool<=0){u.ammo=sp.ammo===undefined?null:sp.ammo;u.flight='';u.loiter=sp.loiter||0;emit(s,sp.n+' מוכן להמראה','unit')}return}
 if(u.goal)move(s,u,dt);else u.hold+=dt;
 if(u.side==='hz'&&!sp.building&&!u.goal){var threat=nearest(s,u,(sp.vision||6)*1.25,v=>v.side==='il');var home=u.site&&s.sites.find(q=>q.key===u.site),leash=home?(home.t==='outpost'?7:11):99;
  if(threat&&dist(u,threat)>(((sp.weapons||[])[0]||{}).range||3)&&(u.raid||!home||dist(threat,home)<leash+(home.t==='outpost'?0:4)))u.goal={x:threat.x,y:threat.y};
  else if(!threat){if(u.raid)u.raid=0;if(home&&home.owner==='hz'&&dist(u,home)>leash)u.goal={x:home.x+(rand(s)-.5)*4,y:home.y+(rand(s)-.5)*4}}}
 if(u.side==='il'&&u.target){var focus=get(s,u.target);if(focus&&dist(u,focus)>(sp.weapons[0]||{range:0}).range)u.goal={x:focus.x,y:focus.y};else if(!focus)u.target=0}
 if(sp.kamikaze){var victim=nearest(s,u,(sp.vision||6)*2);if(victim&&dist(u,victim)<1.3){victim.lastHit='drone';inflict(s,victim,sp.kamikaze.dmg*(sp.kamikaze.vs[U[victim.type].armor]||0), 'blast');u.hp=0;s.events.push({kind:'explosion',x:u.x,y:u.y,time:s.time})}return}
 for(var wi=0;wi<sp.weapons.length;wi++){var weapon=sp.weapons[wi];u.weaponCd[wi]=Math.max(0,(u.weaponCd[wi]||0)-dt);if(u.weaponCd[wi]>0||u.ammo===0)continue;
  var target=u.target?get(s,u.target):null;if(!target||target.side===u.side||!canHit(u,target,weapon))target=nearest(s,u,weapon.range,v=>canHit(u,v,weapon));
  if(target){attack(s,u,target,weapon);u.weaponCd[wi]=weapon.cd;if((sp.jet||sp.ammo)&&u.ammo===0){var home=get(s,s.hq);if(home){u.goal={x:home.x,y:home.y};u.flight='return'}break}}}
}
// Captured cities become forward bases: new units roll out of the northernmost one.
function forwardBase(s){var h=get(s,s.hq);if(!h)return null;var f=s.sites.filter(z=>z.owner==='il'&&(z.t==='city'||z.t==='main')).sort((a,b)=>a.y-b.y)[0];return f?{x:f.x,y:f.y+2,name:f.n}:{x:h.x,y:h.y,name:'בסיס פיקוד צפון'}}
function production(s,dt){var h0=get(s,s.hq);if(!h0)return;var h=forwardBase(s);for(var q of ['inf','veh','air']){var list=s.queue[q];if(!list.length)continue;list[0].remaining-=dt;
 if(list[0].remaining<=0){var type=list.shift().type,sp=U[type],offset=s.nextId%6;
  var p={x:h.x+(q==='air'?1:q==='veh'?4:-4)+(offset%3)*.9,y:h.y-2.5-(offset/3|0)*1.1};var u=makeUnit(s,type,'il',p.x,p.y);emit(s,sp.n+' מוכנים לפקודה','unit');s.events.push({kind:'built',id:u.id,type,time:s.time})}}}
function ai(s,dt){var hzAll=alive(s,'hz'),mobile=hzAll.filter(v=>!U[v.type].building&&v.type!=='drone').length,dif=DIFF[s.diff];
 for(var site of s.sites){if(site.owner!=='hz')continue;var rule=S[site.t],building=get(s,site.building);if(!building){site.prod=999;site.droneT=999;continue}
  site.prod-=dt;site.droneT-=dt;
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
  var ilPos=alive(s,'il').filter(u=>U[u.type].move!=='air');
  var force=hzAll.filter(u=>!U[u.type].building&&u.type!=='drone'&&!u.raid&&u.site&&(s.sites.find(q=>q.key===u.site)||{}).t!=='outpost');
  var pick=null,bd=1e9;for(var u of force)for(var v of ilPos){var d=dist(u,v);if(d<bd){bd=d;pick=v}}
  if(pick&&bd<45){var n=0;force.sort((a,b)=>dist(a,pick)-dist(b,pick)).slice(0,dif.wave).forEach((u,i)=>{u.goal={x:pick.x+(i%3)-1,y:pick.y+((i/3)|0)-1};u.raid=1;n++});if(n)emit(s,'⚠ מתקפת נגד של חיזבאללה: '+n+' כלים','counter')}}}
function capture(s,dt){for(var site of s.sites){if(site.owner==='il')continue;var rule=S[site.t];var present=alive(s,'il').filter(u=>u.soldiers>0&&dist(u,site)<rule.radius+1.2);
 var guards=alive(s,'hz').filter(u=>!U[u.type].building&&u.type!=='drone'&&dist(u,site)<rule.radius+3.4);
 // Destroy HQ + clear defenders, then hold with infantry; tanks cannot capture.
 if(!get(s,site.building)&&guards.length===0&&present.length){site.capture+=dt*(1+(present.length-1)*.2);
  if(site.capture>=rule.capture){site.owner='il';site.capture=rule.capture;s.captures++;grant(s,rule.bounty);emit(s,site.n+' נכבשה!','capture');s.events.push({kind:'city',key:site.key,name:site.n,time:s.time});
   if(site.t==='city')emit(s,site.n+' היא עכשיו בסיס קדמי: יחידות חדשות יוצאות ממנה','forward');
   if(site.key==='beirut'){s.won=true;emit(s,'ניצחון! ביירות נכבשה — חזית לבנון הוכרעה','win')}}}
 else if(site.capture>0)site.capture=Math.max(0,site.capture-dt*.38);
}}
function step(s,seconds){if(s.paused||s.won||s.lost)return;
 seconds=Math.min(seconds,.15)*s.speed;s.time+=seconds;s.events=[];production(s,seconds);
 // Avoid O(N²) with large late-game swarms; dead objects pruned on a schedule.
 var list=s.units.filter(u=>u.hp>0);for(var u of list)actUnit(s,u,seconds);
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
 for(var u of s.units)if(u.side==='il'&&u.hp>0&&!u.carriedBy)mark(u.x,u.y,(U[u.type].vision||5)*1.9);
 for(var site of s.sites)if(site.owner==='il')mark(site.x,site.y,10);VIS={s,t:s.time,g};return g}
function inFog(s,x,y){if(!s.fog)return false;if(x<0||y<0||x>=M.cols||y>=M.rows)return true;return !vision(s)[Math.floor(y)*M.cols+Math.floor(x)]}
function save(s){var o={...s,events:[]};return JSON.stringify(o)}
function restore(raw){try{var o=JSON.parse(raw);if(o.version!==1||!o.sites||!o.units||!DIFF[o.diff])return null;
 o.events=[];o.messages=o.messages||[];o.stats=o.stats||{trophy:0};return o}catch(e){return null}}
var api={forwardBase,flowField,D,terrain,ground,coast,river,bridges,tileAt,dist,clamp,canPass,make,makeUnit,get,alive,step,buy,queue,setOrder,group,split,load,unload,buildPost,bonus,inflict,attack,capture,inFog,save,restore,grant,emit};
root.LF=root.LF||{};root.LF.sim=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
