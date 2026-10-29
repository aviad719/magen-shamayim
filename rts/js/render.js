/* LEBANON FRONT — Canvas renderer only; game rules stay in sim.js. */
(function(root){'use strict';
var D=root.LF.data,S=root.LF.sim,M=D.MAP;
function init(canvas){var ctx=canvas.getContext('2d',{alpha:false}),view={x:35,y:111,z:19,min:9,max:46,w:844,h:390,dpr:1,right:148},tile=document.createElement('canvas');
 tile.width=M.cols*24;tile.height=M.rows*24;var fog=document.createElement('canvas');fog.width=M.cols;fog.height=M.rows;var fogImg=fog.getContext('2d').createImageData(M.cols,M.rows);for(var fi=0;fi<fogImg.data.length;fi+=4){fogImg.data[fi]=5;fogImg.data[fi+1]=14;fogImg.data[fi+2]=21}var g=tile.getContext('2d');
 // ---- Map painter: smooth, organic shapes over the same tile grid the simulation uses ----
 var noise=(x,y)=>{var n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)},TS=24;
 function path(arr){g.beginPath();arr.forEach((p,i)=>{var a=D.toTile(p[1],p[0]);if(i)g.lineTo(a.x*TS,a.y*TS);else g.moveTo(a.x*TS,a.y*TS)})}
 function line(c,arr,col,w,dash){g.save();g.strokeStyle=col;g.lineWidth=w;g.lineJoin='round';g.lineCap='round';if(dash)g.setLineDash(dash);path(arr);g.stroke();g.restore()}
 // land base with gentle light/dark patches
 g.fillStyle='#55694f';g.fillRect(0,0,tile.width,tile.height);
 for(var y=0;y<M.rows;y++)for(var x=0;x<M.cols;x++){var t=S.terrain[y][x],r=noise(x,y),px=x*TS,py=y*TS;
  if(t==='hills'){g.fillStyle='rgba(150,130,90,'+(.05+r*.07)+')';g.beginPath();g.arc(px+noise(y,x*2)*24,py+r*24,10+r*14,0,7);g.fill();if(r>.6){g.strokeStyle='rgba(60,50,30,.12)';g.lineWidth=1.5;g.beginPath();g.arc(px+12,py+16,9+r*5,3.5,5.9);g.stroke()}}
  else if(t==='open'||t==='road'||t==='beach'){g.fillStyle=r>.5?'rgba(220,210,140,.04)':'rgba(10,40,10,.05)';g.beginPath();g.arc(px+r*24,py+noise(y,x)*24,4+noise(x*5,y*3)*14,0,7);g.fill()}}
 // fields near villages: soft striped patches
 for(var y=0;y<M.rows;y+=2)for(var x=0;x<M.cols;x+=2){var t=S.terrain[y][x],r=noise(x*3,y*7);if((t==='open')&&r>.82){g.save();g.translate(x*TS+12,y*TS+12);g.rotate(r*3);g.fillStyle=r>.9?'rgba(196,180,110,.22)':'rgba(120,150,80,.25)';g.fillRect(-14,-10,28,20);g.restore()}}
 // forests: overlapping canopy blobs, shadow first
 for(var pass=0;pass<2;pass++)for(var y=0;y<M.rows;y++)for(var x=0;x<M.cols;x++){if(S.terrain[y][x]!=='forest')continue;for(var j=0;j<4;j++){var ox=noise(x+j*.37,y)*TS,oy=noise(y+j*.71,x)*TS,rr=7+noise(x*j+1,y)*7;
   g.fillStyle=pass?(noise(x,y+j)>.5?'#2c5a3e':'#24503a'):'rgba(10,25,15,.35)';g.beginPath();g.arc(x*TS+ox+(pass?0:3),y*TS+oy+(pass?0:3),rr,0,7);g.fill();
   if(pass&&j===0){g.fillStyle='rgba(120,180,110,.18)';g.beginPath();g.arc(x*TS+ox-2,y*TS+oy-2,rr*.5,0,7);g.fill()}}}
 // built-up areas: clusters of roofs
 function town(cx,cy,R,count,seed){for(var k=0;k<count;k++){var a=noise(seed+k,k*1.7)*6.283,d=Math.sqrt(noise(k*2.3,seed))*R,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d,w=5+noise(k,seed*3)*8,h=5+noise(seed*5,k)*7;
   g.save();g.translate(x,y);g.rotate(noise(k*7,seed)*.6-.3);g.fillStyle='rgba(0,0,0,.28)';g.fillRect(-w/2+2,-h/2+2,w,h);g.fillStyle=noise(k,k+seed)>.55?'#c9b99a':noise(k*3,seed)>.5?'#a9876b':'#d8d0c0';g.fillRect(-w/2,-h/2,w,h);g.restore()}}
 for(var site of D.SITES){var c=D.toTile(site.lon,site.lat),R=(site.t==='main'?4.1:site.t==='city'?3.1:site.t==='village'?1.9:0)*TS;if(!R)continue;
  g.fillStyle='rgba(150,140,115,.35)';g.beginPath();g.arc(c.x*TS,c.y*TS,R*1.05,0,7);g.fill();town(c.x*TS,c.y*TS,R,site.t==='main'?260:site.t==='city'?130:40,site.lat*100)}
 for(var it of D.IL_TOWNS){var c=D.toTile(it[2],it[1]);g.fillStyle='rgba(150,150,140,.3)';g.beginPath();g.arc(c.x*TS,c.y*TS,1.7*TS,0,7);g.fill();town(c.x*TS,c.y*TS,1.6*TS,45,it[1]*100)}
 // roads, river, bridges
 for(var rd of D.ROADS){line(g,rd,'rgba(40,35,25,.45)',5);line(g,rd,'#b9ae88',2.6)}
 line(g,D.LITANI,'#1d5f6e',8);line(g,D.LITANI,'#3aa7bd',5);
 for(var bridge of D.BRIDGES){var p=D.toTile(bridge[1],bridge[0]);g.save();g.translate(p.x*TS,p.y*TS);g.fillStyle='#3a3226';g.fillRect(-9,-6,18,12);g.fillStyle='#d9c48e';g.fillRect(-8,-4.5,16,9);g.restore()}
 // sea: one smooth polygon from the real coastline, then surf and beach
 var cst=D.COAST.map(p=>D.toTile(p[1],p[0]));g.beginPath();cst.forEach((a,i)=>i?g.lineTo(a.x*TS,a.y*TS):g.moveTo(a.x*TS,a.y*TS));g.lineTo(-10,cst[cst.length-1].y*TS);g.lineTo(-10,cst[0].y*TS);g.closePath();
 var sg=g.createLinearGradient(0,0,tile.width*.4,0);sg.addColorStop(0,'#0b2233');sg.addColorStop(1,'#16465a');g.fillStyle=sg;g.fill();
 line(g,D.COAST,'rgba(214,201,150,.85)',9);line(g,D.COAST,'rgba(160,225,225,.55)',2.5);
 for(var k=1;k<4;k++){g.save();g.translate(-k*10,0);line(g,D.COAST,'rgba(140,210,220,'+(.10/k)+')',2);g.restore()}
 // Syria (out of bounds) and the blue line
 var sy=D.SYRIA.map(p=>D.toTile(p[1],p[0]));g.beginPath();sy.forEach((a,i)=>i?g.lineTo(a.x*TS,a.y*TS):g.moveTo(a.x*TS,a.y*TS));g.lineTo(tile.width+10,sy[sy.length-1].y*TS);g.lineTo(tile.width+10,sy[0].y*TS);g.closePath();g.fillStyle='rgba(30,36,40,.55)';g.fill();
 line(g,D.SYRIA,'rgba(200,90,80,.7)',2.5,[8,6]);
 line(g,D.BORDER,'rgba(73,185,236,.9)',2.5,[9,7]);
 function resize(){view.dpr=Math.min(2,devicePixelRatio||1);view.w=innerWidth;view.h=innerHeight;canvas.width=Math.floor(view.w*view.dpr);canvas.height=Math.floor(view.h*view.dpr);canvas.style.width=view.w+'px';canvas.style.height=view.h+'px';ctx.setTransform(view.dpr,0,0,view.dpr,0,0)}
 function screen(x,y){return{x:(x-view.x)*view.z+(view.w-view.right)/2,y:(y-view.y)*view.z+view.h/2}}
 function world(x,y){return{x:(x-(view.w-view.right)/2)/view.z+view.x,y:(y-view.h/2)/view.z+view.y}}
 function camera(x,y,z){if(Number.isFinite(x))view.x=Math.max(8,Math.min(M.cols-5,x));if(Number.isFinite(y))view.y=Math.max(7,Math.min(M.rows-7,y));if(Number.isFinite(z))view.z=Math.max(view.min,Math.min(view.max,z))}
 function draw(s,selected,box,showFog,ui){ui=ui||{};
  var w=view.w,h=view.h,z=view.z;ctx.fillStyle='#0d1a25';ctx.fillRect(0,0,w,h);var a=world(0,0),b=world(w,h);
  ctx.imageSmoothingEnabled=z<24;ctx.drawImage(tile,a.x*24,a.y*24,(b.x-a.x)*24,(b.y-a.y)*24,0,0,w,h);
  // Soft ocean vignette, cartographic labels, cross-front lines.
  ctx.fillStyle='rgba(8,29,38,.3)';ctx.fillRect(0,0,w,40);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='rtl';
  function label(x,y,text,col,size,bg){var p=screen(x,y);if(p.x<-70||p.x>w+70||p.y<-30||p.y>h+30)return;
    ctx.font='600 '+size+'px system-ui,Arial';if(bg){var tw=ctx.measureText(text).width;ctx.fillStyle=bg;ctx.fillRect(p.x-tw/2-6,p.y-size/2-3,tw+12,size+6)}
    ctx.fillStyle=col;ctx.shadowColor='#06131b';ctx.shadowBlur=5;ctx.fillText(text,p.x,p.y);ctx.shadowBlur=0}
  for(var t of D.IL_TOWNS){var p=D.toTile(t[2],t[1]);if(z>14)label(p.x,p.y,t[0],'#87cde3',10)}
  for(var site of s.sites){var p=screen(site.x,site.y);if(p.x<0||p.x>w||p.y<0||p.y>h)continue;var hidden=showFog&&S.inFog(s,site.x,site.y),ru=D.SITE_T[site.t];
    if(hidden&&site.owner!=='il')continue;
    var color=site.owner==='il'?'#61dcbe':site.t==='outpost'?'#d98c55':site.t==='village'?'#e3bc71':'#e75f57';
    var radius=site.t==='main'?13:site.t==='city'?10:site.t==='village'?7:5;
    var bAlive=site.owner==='hz'&&S.get(s,site.building),k=Math.max(.55,Math.min(1.6,z/22));ctx.save();ctx.translate(p.x,p.y);ctx.scale(k,k);
    if(site.t==='outpost'){ // sandbag bunker with firing slits, dug into the trees
      ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(2,2,12,0,7);ctx.fill();ctx.fillStyle=bAlive||site.owner==='il'?'#7a6a48':'#4a4234';ctx.beginPath();for(var q=0;q<8;q++){var ang=q*Math.PI/4+.39;ctx.lineTo(Math.cos(ang)*12,Math.sin(ang)*12)}ctx.closePath();ctx.fill();
      ctx.strokeStyle='#cbb98a';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#3a3125';ctx.beginPath();ctx.arc(0,0,6,0,7);ctx.fill();ctx.fillStyle='#14100b';for(var q=0;q<4;q++){ctx.save();ctx.rotate(q*Math.PI/2);ctx.fillRect(8,-1.2,4,2.4);ctx.restore()}}
    else { // compound: walls + buildings; bigger for cities and the main base
      var Wd=site.t==='main'?44:site.t==='city'?34:22;ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(-Wd/2+3,-Wd/2+3,Wd,Wd*.8);ctx.fillStyle=bAlive||site.owner==='il'?'#b7a27a':'#5b5244';ctx.fillRect(-Wd/2,-Wd/2,Wd,Wd*.8);
      ctx.strokeStyle=site.owner==='il'?'#9ff3dc':'#f0c477';ctx.lineWidth=2;ctx.strokeRect(-Wd/2,-Wd/2,Wd,Wd*.8);ctx.fillStyle=bAlive||site.owner==='il'?'#e6dccb':'#3c362e';
      var nb=site.t==='main'?6:site.t==='city'?4:2;for(var q=0;q<nb;q++){var bx=-Wd/2+4+(q%3)*(Wd-8)/3,by=-Wd/2+4+Math.floor(q/3)*(Wd*.8-8)/2;ctx.fillRect(bx,by,(Wd-8)/3-3,(Wd*.8-8)/(nb>3?2:1)-3)}}
    // flag: yellow for Hezbollah, blue-white once captured
    if(site.owner==='il'){ctx.fillStyle='#fff';ctx.fillRect(1,-30,13,9);ctx.fillStyle='#2f6fd6';ctx.fillRect(1,-29,13,1.5);ctx.fillRect(1,-24,13,1.5)}else if(bAlive){ctx.fillStyle='#f3d21a';ctx.fillRect(1,-30,13,9);ctx.fillStyle='#2f8f3a';ctx.fillRect(5,-27,5,3)}
    if(site.owner==='il'||bAlive){ctx.strokeStyle='#ddd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(1,-30);ctx.lineTo(1,-12);ctx.stroke()}
    ctx.restore();radius=(site.t==='outpost'?12:site.t==='main'?22:site.t==='city'?17:11)*k;
    if(s.hint===site.key&&site.owner==='hz'&&s.captures===0){var pulse=(s.time*2)%1;ctx.strokeStyle='rgba(255,240,140,'+(1-pulse)+')';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,radius+6+pulse*16,0,7);ctx.stroke()}
    var bu=site.owner==='hz'&&S.get(s,site.building);if(bu&&bu.hp<bu.maxHp){var bw=radius*2.6;ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(p.x-bw/2,p.y-radius-6,bw,4);ctx.fillStyle=bu.hp/bu.maxHp>.4?'#ffb35c':'#ff5a4a';ctx.fillRect(p.x-bw/2,p.y-radius-6,bw*bu.hp/bu.maxHp,4)}
    if(false){ctx.strokeStyle='#ffe48a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x-radius*.6,p.y-radius*.6);ctx.lineTo(p.x+radius*.6,p.y+radius*.6);ctx.moveTo(p.x+radius*.6,p.y-radius*.6);ctx.lineTo(p.x-radius*.6,p.y+radius*.6);ctx.stroke()}
    if(site.capture>0&&site.owner==='hz'){ctx.strokeStyle='#52ddc7';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,radius+6,-Math.PI/2,-Math.PI/2+(site.capture/ru.capture)*Math.PI*2);ctx.stroke()}
    if(z>=15||site.t==='main'||site.t==='city')label(site.x,site.y+(radius+9)/z,site.n,site.owner==='il'?'#aef7e2':'#ffdcc3',site.t==='main'?13:11,'rgba(8,20,25,.62)');
  }

  // v2: revealed tunnel shafts, weapons stores, rocket launchers, tunnel exits
  for(var hd of (s.hidden||[])){if(hd.dead)continue;if(hd.kind==='tunnel'&&!hd.exitDead&&(hd.revealed||hd.exitSeen)){var pe=screen(hd.ex,hd.ey);if(pe.x>-20&&pe.x<w+20&&pe.y>-20&&pe.y<h+20){var ke=Math.max(.6,Math.min(1.4,z/22));ctx.fillStyle='rgba(20,10,5,.85)';ctx.beginPath();ctx.ellipse(pe.x,pe.y,7*ke,4.5*ke,0,0,7);ctx.fill();ctx.strokeStyle='#ff9a5a';ctx.lineWidth=1.2;ctx.setLineDash([2,2]);ctx.beginPath();ctx.arc(pe.x,pe.y,10*ke,0,7);ctx.stroke();ctx.setLineDash([]);if(hd.exitBlow>0){ctx.strokeStyle='#ffe066';ctx.lineWidth=3;ctx.beginPath();ctx.arc(pe.x,pe.y,13*ke,-Math.PI/2,-Math.PI/2+Math.min(1,hd.exitBlow/D.HIDDEN.exit.blow)*Math.PI*2);ctx.stroke()}if(z>=14)label(hd.ex,hd.ey+14/z,'יציאת מנהרה','#ffcaa0',9,'rgba(30,10,5,.6)')}}
   if(!hd.revealed)continue;var ph=screen(hd.x,hd.y);if(ph.x<-30||ph.x>w+30||ph.y<-30||ph.y>h+30)continue;var kh=Math.max(.6,Math.min(1.5,z/22));ctx.save();ctx.translate(ph.x,ph.y);ctx.scale(kh,kh);
   ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.arc(2,2,11,0,7);ctx.fill();
   if(hd.kind==='tunnel'){ctx.fillStyle='#6b4a2a';ctx.fillRect(-10,-10,20,20);ctx.fillStyle='#120a05';ctx.beginPath();ctx.arc(0,0,7,0,7);ctx.fill();ctx.strokeStyle='#d8b27a';ctx.lineWidth=1.6;ctx.strokeRect(-10,-10,20,20);ctx.strokeStyle='#a57c45';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-3,-6);ctx.lineTo(-3,6);ctx.moveTo(3,-6);ctx.lineTo(3,6);for(var rg=-4;rg<=4;rg+=3){ctx.moveTo(-3,rg);ctx.lineTo(3,rg)}ctx.stroke()}
   else if(hd.kind==='ied'){ctx.fillStyle='#3a2f22';ctx.beginPath();ctx.arc(0,0,8,0,7);ctx.fill();ctx.strokeStyle='#ffb35a';ctx.lineWidth=1.6;ctx.stroke();ctx.strokeStyle='#ff5a4a';ctx.beginPath();ctx.moveTo(-4,-9);ctx.quadraticCurveTo(-9,-14,-12,-9);ctx.moveTo(4,-9);ctx.quadraticCurveTo(9,-14,12,-9);ctx.stroke();ctx.fillStyle='#ffd23f';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',0,1);ctx.textBaseline='alphabetic'}
   else {ctx.fillStyle='#4f5a33';ctx.fillRect(-11,-8,22,16);ctx.strokeStyle='#e8d27a';ctx.lineWidth=1.5;ctx.strokeRect(-11,-8,22,16);ctx.fillStyle='#8a6b3a';for(var cb=0;cb<4;cb++){ctx.fillRect(-9+(cb%2)*10,-6+((cb/2)|0)*7,8,5.5)}ctx.fillStyle='#ffe066';ctx.font='bold 8px system-ui';ctx.fillText('☢',0,0)}
   ctx.strokeStyle='#ff5a4a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,14,0,7);ctx.stroke();
   if(hd.blow>0){ctx.strokeStyle='#ffe066';ctx.lineWidth=3.5;ctx.beginPath();ctx.arc(0,0,17,-Math.PI/2,-Math.PI/2+Math.min(1,hd.blow/D.HIDDEN[hd.kind].blow)*Math.PI*2);ctx.stroke()}
   ctx.restore();if(z>=12)label(hd.x,hd.y-(24*kh)/z,D.HIDDEN[hd.kind].n,'#ffd2c0',10,'rgba(40,8,6,.7)')}
  for(var lu of s.units){if(lu.type!=='hz_launcher'||lu.hp<=0||!lu.revealed)continue;var pl=screen(lu.x,lu.y);if(pl.x<-30||pl.x>w+30||pl.y<-30||pl.y>h+30)continue;var kl=Math.max(.6,Math.min(1.5,z/22));
   ctx.save();ctx.translate(pl.x,pl.y);ctx.scale(kl,kl);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(-11,-6,24,15);ctx.fillStyle='#7d7350';ctx.fillRect(-12,-7,24,14);ctx.strokeStyle='#ff9a5a';ctx.lineWidth=1.3;ctx.strokeRect(-12,-7,24,14);ctx.fillStyle='#4a4430';ctx.fillRect(4,-6,7,12);
   ctx.save();ctx.rotate(-.35);ctx.fillStyle='#2d2a20';for(var tb=0;tb<3;tb++)ctx.fillRect(-11,-6+tb*4,15,2.6);ctx.fillStyle='#ff5a3c';for(var tb=0;tb<3;tb++)ctx.fillRect(3,-6+tb*4,2.5,2.6);ctx.restore();
   ctx.strokeStyle='#ff4a3a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,16,0,7);ctx.stroke();ctx.restore();
   if(lu.hp<lu.maxHp){ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(pl.x-14,pl.y-20*kl,28,4);ctx.fillStyle='#ff9a5a';ctx.fillRect(pl.x-14,pl.y-20*kl,28*lu.hp/lu.maxHp,4)}
   if(z>=12)label(lu.x,lu.y+(24*kl)/z,'משגר · '+lu.area,'#ffd2c0',10,'rgba(40,8,6,.7)')}
  var hq=S.get(s,s.hq);if(hq){var p=screen(hq.x,hq.y),k=Math.max(.6,z/22);ctx.save();ctx.translate(p.x,p.y);ctx.scale(k,k);
   ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(-25,-19,54,42);ctx.fillStyle='#8b8a6c';ctx.fillRect(-28,-22,54,42);ctx.strokeStyle='#d8e9d2';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(-28,-22,54,42);ctx.setLineDash([]);
   ctx.fillStyle='#5d6a4c';ctx.fillRect(-22,-16,18,12);ctx.fillRect(-22,0,18,12);ctx.fillStyle='#c9c4a6';ctx.fillRect(2,-16,18,10);ctx.fillStyle='#3d4a36';ctx.beginPath();ctx.arc(11,8,8,0,7);ctx.fill();ctx.strokeStyle='#e8e2b8';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(7,4);ctx.lineTo(7,12);ctx.moveTo(15,4);ctx.lineTo(15,12);ctx.moveTo(7,8);ctx.lineTo(15,8);ctx.stroke();
   ctx.fillStyle='#fff';ctx.fillRect(-1,-38,12,8);ctx.fillStyle='#2f6fd6';ctx.fillRect(-1,-37,12,1.4);ctx.fillRect(-1,-32.4,12,1.4);ctx.strokeStyle='#ddd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-1,-38);ctx.lineTo(-1,-22);ctx.stroke();
   if(hq.hp<hq.maxHp){ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(-28,24,54,4);ctx.fillStyle=hq.hp/hq.maxHp>.4?'#4ee4b5':'#ff6b5a';ctx.fillRect(-28,24,54*hq.hp/hq.maxHp,4)}ctx.restore();label(hq.x,hq.y+(32*Math.max(.6,z/22))/z,'בסיס פיקוד צפון','#b6f2ff',11,'rgba(8,20,25,.8)')}
  for(var u of s.units){if(u.hp<=0||u.carriedBy||(!u.built&&u.type!=='post'))continue;if(u.side==='hz'&&((showFog&&S.inFog(s,u.x,u.y))||(u.hidden&&!u.revealed)))continue;var p=screen(u.x,u.y),sp=D.UNITS[u.type];if(p.x<-20||p.x>w+20||p.y<-20||p.y>h+20)continue;
    var own=u.side==='il',sz=Math.max(4,Math.min(16,(sp.size||.48)*z*.75));
    if(sp.building&&u.type!=='post')continue;
    ctx.save();ctx.translate(p.x,p.y);if(sp.move==='air'){ctx.fillStyle='rgba(0,0,0,.30)';ctx.beginPath();ctx.ellipse(4,5,sz*1.1,sz*.6,0,0,7);ctx.fill()}
    if(selected.has(u.id)){ctx.strokeStyle='#fff5bc';ctx.lineWidth=1.5;ctx.setLineDash([3,2]);ctx.beginPath();ctx.arc(0,0,sz+5,0,7);ctx.stroke();ctx.setLineDash([])}
    drawUnit(u,sp,own,sz,s.time);
    if(u.type==='givati'&&u.hold>2&&!u.goal){ctx.fillStyle='rgba(190,140,255,.9)';ctx.beginPath();ctx.moveTo(0,-sz-9);ctx.lineTo(5,-sz-7);ctx.lineTo(4,-sz-2);ctx.lineTo(0,-sz);ctx.lineTo(-4,-sz-2);ctx.lineTo(-5,-sz-7);ctx.closePath();ctx.fill()}
    if(u.flash){ctx.globalAlpha=Math.min(1,u.flash/.22);ctx.fillStyle='#fff8b4';ctx.beginPath();ctx.arc(0,0,sz*.45,0,7);ctx.fill();ctx.globalAlpha=1}
    ctx.restore();
    // Health bars, enemy/Israeli IDs, group number, soldier count.
    if(u.hp<u.maxHp||selected.has(u.id)){var width=Math.max(13,sz*2);ctx.fillStyle='rgba(0,0,0,.76)';ctx.fillRect(p.x-width/2,p.y-sz-7,width,3);ctx.fillStyle=u.hp/u.maxHp>.4?'#4ee4b5':'#ff8069';ctx.fillRect(p.x-width/2,p.y-sz-7,width*Math.max(0,u.hp/u.maxHp),3)}
    if(own&&u.cg){var bx=p.x+sz+1,byy=p.y-sz-12;ctx.fillStyle='rgba(24,20,4,.92)';ctx.fillRect(bx,byy,10,11);ctx.strokeStyle='#ffe066';ctx.lineWidth=1;ctx.strokeRect(bx,byy,10,11);ctx.fillStyle='#ffe066';ctx.font='800 9px system-ui';ctx.textAlign='center';ctx.fillText(String(u.cg),bx+5,byy+8.5)}
    if(own&&sp.supply){var lv=S.supplyLevel(u),bw2=Math.max(13,sz*2),by2=p.y-sz-4;
     if(selected.has(u.id)){if(lv.ammo!==null){ctx.fillStyle='rgba(0,0,0,.76)';ctx.fillRect(p.x-bw2/2,by2,bw2,3);ctx.fillStyle=lv.ammo>D.SUPPLY.low?'#ffd84a':'#ff7a3a';ctx.fillRect(p.x-bw2/2,by2,bw2*lv.ammo,3);by2+=3.6}
      if(lv.fuel!==null){ctx.fillStyle='rgba(0,0,0,.76)';ctx.fillRect(p.x-bw2/2,by2,bw2,3);ctx.fillStyle=lv.fuel>D.SUPPLY.low?'#5ab8ff':'#ff5a8a';ctx.fillRect(p.x-bw2/2,by2,bw2*lv.fuel,3)}}
     var lowA=lv.ammo!==null&&lv.ammo<D.SUPPLY.low,lowF=lv.fuel!==null&&lv.fuel<D.SUPPLY.low;
     if(lowA||lowF){var ix=p.x+sz+4,iy=p.y-sz-4;ctx.globalAlpha=(lowA&&lv.ammo<=0.01)||(lowF&&lv.fuel<=0.01)?1:.65+.35*Math.abs(Math.sin(s.time*4));{ctx.fillStyle='rgba(10,10,10,.75)';ctx.beginPath();ctx.arc(ix+(lowA&&lowF?5:0),iy,lowA&&lowF?9:6,0,7);ctx.fill();
       if(lowA){ctx.fillStyle=lv.ammo<=0.01?'#ff4a3a':'#ffd84a';for(var bb=0;bb<3;bb++){ctx.fillRect(ix-3.5+bb*2.6,iy-3,1.8,5.5)}}
       if(lowF){var fx2=ix+(lowA?9:0);ctx.fillStyle=lv.fuel<=0.01?'#ff4a3a':'#5ab8ff';ctx.fillRect(fx2-3,iy-3.5,5.5,7);ctx.fillRect(fx2+1,iy-5,2,2);ctx.fillStyle='#0a1a24';ctx.fillRect(fx2-1.6,iy-1.5,2.8,1.4)}}ctx.globalAlpha=1}
     if(u.resup&&(s.time*3|0)%3===0){ctx.fillStyle='#8dffb0';ctx.font='bold 9px system-ui';ctx.fillText('⟳',p.x-sz-4,p.y-sz-3)}}
    if(sp.supplier&&selected.has(u.id)){ctx.strokeStyle='rgba(140,255,180,.45)';ctx.setLineDash([4,4]);ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(p.x,p.y,D.SUPPLY.truckRadius*z,0,7);ctx.stroke();ctx.setLineDash([])}
    if(sp.transportPlane&&z>9){ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#eaf6ff';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.fillText(u.drop&&u.drop.payload==='crate'?'📦 מטוס אספקה':'🪂 מטוס תובלה',p.x,p.y+sz+13);ctx.shadowBlur=0}
    if(selected.has(u.id)&&z>13&&selected.size<=3){ctx.font='bold 9px system-ui';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(sp.n+(u.soldiers?' ×'+u.soldiers:'')+(u.group?' [G'+u.group+']':''),p.x,p.y+sz+11)}
    if(u.goal&&selected.has(u.id)){var g=screen(u.goal.x,u.goal.y);ctx.strokeStyle='rgba(244,229,147,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(g.x,g.y);ctx.stroke()}
  }
  var now=s.time;for(var ev of s.events){if(ev.x===undefined)continue;var age=now-ev.time;if(age<0)age=0;var p=screen(ev.x,ev.y);
   if(ev.kind==='ambush'||ev.kind==='retake'||ev.kind==='lostsite'){ctx.save();ctx.globalAlpha=Math.max(0,1-age/3);ctx.strokeStyle=ev.kind==='ambush'?'#ff4a3a':'#ff9a4a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,14+age*26,0,7);ctx.stroke();ctx.font='800 12px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffd0c0';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.fillText(ev.kind==='ambush'?'⚠ מארב!':ev.kind==='retake'?'⚠ מתקפת נגד':'⚠ הכפר אבד',p.x,p.y-22);ctx.restore();continue}
   if(ev.kind==='salvo'){var q=screen(ev.tx,ev.ty),L=Math.hypot(q.x-p.x,q.y-p.y)||1,sd=(ev.time*7%2<1?1:-1)*.28,cx=(p.x+q.x)/2-(q.y-p.y)*sd,cy=(p.y+q.y)/2+(q.x-p.x)*sd-Math.min(200,L*.3);
    if(age<.5){ctx.fillStyle='rgba(255,200,120,'+(1-age/.5)+')';ctx.beginPath();ctx.arc(p.x,p.y,6+age*20,0,7);ctx.fill()}
    for(var ri=0;ri<ev.n;ri++){var kk=(age-ri*.22)/2.8;if(kk<=0||kk>1.15)continue;var k1=Math.min(1,kk),k0=Math.max(0,k1-.28);ctx.strokeStyle='rgba(255,170,90,'+(kk>1?(1.15-kk)/.15*.6:.6)+')';ctx.lineWidth=2;ctx.beginPath();
     for(var st=0;st<=10;st++){var tt=k0+(k1-k0)*st/10,ux=(1-tt)*(1-tt)*p.x+2*(1-tt)*tt*cx+tt*tt*q.x,uy=(1-tt)*(1-tt)*p.y+2*(1-tt)*tt*cy+tt*tt*q.y;if(st)ctx.lineTo(ux+ri*2,uy);else ctx.moveTo(ux+ri*2,uy)}ctx.stroke();
     if(kk<1){var hx=(1-k1)*(1-k1)*p.x+2*(1-k1)*k1*cx+k1*k1*q.x+ri*2,hy=(1-k1)*(1-k1)*p.y+2*(1-k1)*k1*cy+k1*k1*q.y;ctx.fillStyle='#fff3c0';ctx.shadowColor='#ff6a2a';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(hx,hy,2.4,0,7);ctx.fill();ctx.shadowBlur=0}}
    continue}
   if(ev.kind==='lzone'){if(age>9)continue;var R2=3.5*z,al=age<1?age:Math.max(0,1-(age-1)/8);ctx.strokeStyle='rgba(255,80,60,'+(.85*al)+')';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(p.x,p.y,R2,0,7);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,60,40,'+(.10*al)+')';ctx.fill();
    if(al>.15){ctx.font='bold 10px system-ui';ctx.fillStyle='rgba(255,200,180,'+al+')';ctx.fillText('אזור שיגור?',p.x,p.y-R2-6)}continue}
   if(p.x<-40||p.x>w+40||p.y<-40||p.y>h+40)continue;
   if(ev.kind==='reveal'||ev.kind==='tunnelpop'){if(age>2)continue;var t3=age/2;ctx.strokeStyle=ev.kind==='reveal'?'rgba(255,230,120,'+(1-t3)+')':'rgba(255,90,60,'+(1-t3)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,8+t3*40,0,7);ctx.stroke();continue}
   if(ev.kind==='drop'){if(age>2.5)continue;for(var pi=0;pi<5;pi++){var ox=Math.cos(pi*1.3)*(10+age*6),oy=Math.sin(pi*1.3)*(8+age*4)-18*(1-age/2.5);ctx.fillStyle='rgba(250,250,245,'+(1-age/2.5)+')';ctx.beginPath();ctx.arc(p.x+ox,p.y+oy-6,6,Math.PI,0);ctx.fill();ctx.fillStyle='rgba(60,70,40,'+(1-age/2.5)+')';ctx.fillRect(p.x+ox-1.5,p.y+oy-2,3,4)}continue}
   if(ev.kind==='resupply'||ev.kind==='sweep'){if(age>2.5)continue;var t4=age/2.5;ctx.strokeStyle=ev.kind==='sweep'?'rgba(120,230,255,'+(1-t4)+')':'rgba(140,255,170,'+(1-t4)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,(ev.r||4)*z*Math.min(1,.3+t4*1.2),0,7);ctx.stroke();continue}
   if(ev.kind==='deployed'){if(age>1.2)continue;ctx.strokeStyle='rgba(255,210,80,'+(1-age/1.2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,8+age*30,0,7);ctx.stroke();continue}
   if(ev.kind==='blown')continue;
   if(ev.kind==='shot'){if(age>.45)continue;var q=screen(ev.tx,ev.ty),k=Math.min(1,age/.18),il=ev.side==='il';
    if(ev.fx==='bullet'){var a0=Math.max(0,k-.35);ctx.strokeStyle=il?'#c8f6ff':'#ffd08a';ctx.lineWidth=1.2;ctx.globalAlpha=1-age/.45;ctx.beginPath();ctx.moveTo(p.x+(q.x-p.x)*a0,p.y+(q.y-p.y)*a0);ctx.lineTo(p.x+(q.x-p.x)*k,p.y+(q.y-p.y)*k);ctx.stroke();
     if(age<.06){ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,7);ctx.fill()}}
    else if(ev.fx==='shell'||ev.fx==='bomb'){ctx.strokeStyle='#fff0a8';ctx.lineWidth=2.4;ctx.globalAlpha=1-age/.45;ctx.beginPath();ctx.moveTo(p.x+(q.x-p.x)*Math.max(0,k-.2),p.y+(q.y-p.y)*Math.max(0,k-.2));ctx.lineTo(p.x+(q.x-p.x)*k,p.y+(q.y-p.y)*k);ctx.stroke();
     if(age<.1){ctx.fillStyle='rgba(255,230,150,.9)';ctx.beginPath();ctx.arc(p.x,p.y,5,0,7);ctx.fill()}}
    else {var kk=Math.min(1,age/.4);ctx.strokeStyle='rgba(220,220,210,.55)';ctx.lineWidth=2;ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+(q.x-p.x)*kk,p.y+(q.y-p.y)*kk);ctx.stroke();
     ctx.fillStyle=ev.fx==='atgm'?'#ff5a3c':ev.fx==='laser'?'#7fffea':'#ffe066';ctx.beginPath();ctx.arc(p.x+(q.x-p.x)*kk,p.y+(q.y-p.y)*kk,2.6,0,7);ctx.fill()}
    ctx.globalAlpha=1}
   else if(ev.kind==='hit'){if(age>.25)continue;ctx.fillStyle='rgba(255,210,120,'+(1-age/.25)+')';ctx.beginPath();ctx.arc(p.x+(Math.sin(ev.time*99)*3),p.y+(Math.cos(ev.time*77)*3),2+age*10,0,7);ctx.fill()}
   else if(ev.kind==='explosion'){if(age>1.2)continue;var t=age/1.2,R=Math.max(6,z*.9)*(ev.big?2.2:1);
    ctx.fillStyle='rgba(70,64,58,'+(.55*(1-t))+')';ctx.beginPath();ctx.arc(p.x+t*6,p.y-t*10,R*(.6+t*1.2),0,7);ctx.fill();
    if(t<.45){var f=1-t/.45;ctx.fillStyle='rgba(255,'+(140+Math.round(80*f))+',60,'+f+')';ctx.beginPath();ctx.arc(p.x,p.y,R*(.4+t*1.6),0,7);ctx.fill();ctx.fillStyle='rgba(255,250,210,'+f+')';ctx.beginPath();ctx.arc(p.x,p.y,R*.35*f,0,7);ctx.fill()}
    ctx.strokeStyle='rgba(255,220,160,'+(1-t)*.7+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,R*(.5+t*2.4),0,7);ctx.stroke()}
   else if(ev.kind==='trophy'){if(age>.6)continue;var t=age/.6;ctx.strokeStyle='rgba(110,240,255,'+(1-t)+')';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,6+t*22,0,7);ctx.stroke();ctx.fillStyle='rgba(200,255,255,'+(1-t)+')';ctx.font='bold 10px system-ui';ctx.fillText('מעיל רוח!',p.x,p.y-16-t*10)}
   else if(ev.kind==='repair'){if(age>.8)continue;ctx.fillStyle='rgba(120,255,160,'+(1-age/.8)+')';ctx.font='bold 11px system-ui';ctx.fillText('+',p.x+5,p.y-8-age*12)}
  }
  // Fog of war: one pixel per tile on a small canvas, drawn scaled with smoothing = soft edges.
  if(showFog){var fd=fog.getContext('2d'),img=fogImg,vis=S.inFog;for(var ty=0;ty<M.rows;ty++)for(var tx=0;tx<M.cols;tx++){var o=(ty*M.cols+tx)*4;img.data[o+3]=vis(s,tx+.5,ty+.5)?205:0}
    fd.putImageData(img,0,0);ctx.save();ctx.imageSmoothingEnabled=true;var A=screen(0,0),B=screen(M.cols,M.rows);ctx.drawImage(fog,0,0,M.cols,M.rows,A.x,A.y,B.x-A.x,B.y-A.y);ctx.restore()}
  // v4: smoke screens, pending barrages (warning ring), falling supply crates, artillery range circles
  for(var sm of s.smokes||[]){var ps=screen(sm.x,sm.y),R=sm.r*z,left=sm.until-s.time,al=Math.min(1,(s.time-(sm.from||s.time))*2+.2)*Math.min(1,left/2);
   for(var k=0;k<7;k++){var an=k*.9+s.time*.15,rr=R*(k?.55:0);ctx.fillStyle='rgba(210,214,212,'+(.28*al)+')';ctx.beginPath();ctx.arc(ps.x+Math.cos(an)*rr,ps.y+Math.sin(an)*rr*.8,R*(k?.55:.7),0,7);ctx.fill()}
   if(z>9){ctx.font='800 10px system-ui';ctx.fillStyle='rgba(40,50,55,'+al+')';ctx.textAlign='center';ctx.fillText('🌫 מסך עשן '+Math.ceil(left)+'ש׳',ps.x,ps.y)}}
  for(var stk of s.strikes||[]){var pk=screen(stk.x,stk.y),R=stk.r*z;
   if(stk.kind==='fire'){var pulse=.55+.45*Math.abs(Math.sin(s.time*6));ctx.save();ctx.strokeStyle='rgba(255,60,40,'+pulse+')';ctx.lineWidth=2.5;ctx.setLineDash([8,5]);ctx.beginPath();ctx.arc(pk.x,pk.y,R,0,7);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,50,30,'+(.08+.08*pulse)+')';ctx.fill();
    ctx.strokeStyle='rgba(255,90,60,.8)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(pk.x-8,pk.y);ctx.lineTo(pk.x+8,pk.y);ctx.moveTo(pk.x,pk.y-8);ctx.lineTo(pk.x,pk.y+8);ctx.stroke();
    ctx.font='800 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffd0c0';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText(stk.v===D.ARTY.fire.volleys&&stk.t>0?'⚠ מטח בעוד '+Math.ceil(stk.t)+'ש׳':'⚠ מטח!',pk.x,pk.y+R+13);ctx.restore()}
   else{ctx.save();ctx.strokeStyle='rgba(220,220,220,.8)';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(pk.x,pk.y,R,0,7);ctx.stroke();ctx.setLineDash([]);ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#eef';ctx.fillText('🌫 עשן',pk.x,pk.y+R+12);ctx.restore()}}
  for(var cr of s.crates||[]){var pc=screen(cr.x,cr.y),fall=Math.max(0,cr.t)/D.SUPPLY_DROP.fall,yo=fall*40;ctx.save();ctx.strokeStyle='rgba(140,255,170,.7)';ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(pc.x,pc.y,D.SUPPLY_DROP.radius*z,0,7);ctx.stroke();ctx.setLineDash([]);
   ctx.fillStyle='#f4f4f0';ctx.beginPath();ctx.arc(pc.x,pc.y-yo-14,9,Math.PI,0);ctx.fill();ctx.strokeStyle='#ddd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pc.x-9,pc.y-yo-14);ctx.lineTo(pc.x-3,pc.y-yo-4);ctx.moveTo(pc.x+9,pc.y-yo-14);ctx.lineTo(pc.x+3,pc.y-yo-4);ctx.stroke();
   ctx.fillStyle='#8a6b3a';ctx.fillRect(pc.x-5,pc.y-yo-5,10,8);ctx.strokeStyle='#ffe066';ctx.strokeRect(pc.x-5,pc.y-yo-5,10,8);ctx.restore()}
  for(var au of s.units){if(au.hp<=0||au.type!=='artillery'||au.side!=='il'||!selected||!selected.has(au.id))continue;var ast=(au.art&&au.art.st)||'';var aiming=ui.aim&&(ui.aim.action==='fire'||ui.aim.action==='smoke');
   if(ast!=='deployed'&&ast!=='deploying'&&!(ui.aim&&ui.aim.action==='deploy'))continue;var pa2=screen(au.x,au.y);ctx.save();
   if(ast==='deployed'||ast==='deploying'){ctx.strokeStyle=aiming?'rgba(255,200,80,.95)':'rgba(255,200,80,.6)';ctx.lineWidth=aiming?2.4:1.6;ctx.setLineDash([9,6]);ctx.beginPath();ctx.arc(pa2.x,pa2.y,D.ARTY.range*z,0,7);ctx.stroke();ctx.fillStyle=aiming?'rgba(255,200,80,.07)':'rgba(255,200,80,.03)';ctx.fill();
    ctx.setLineDash([3,4]);ctx.strokeStyle='rgba(255,120,80,.6)';ctx.beginPath();ctx.arc(pa2.x,pa2.y,D.ARTY.minRange*z,0,7);ctx.stroke();ctx.setLineDash([]);
    ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffe2a0';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.fillText('טווח תותחנים',pa2.x,pa2.y-D.ARTY.range*z+12);
    if(ast==='deploying'){var fr=1-au.art.t/D.ARTY.deploy;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(pa2.x-16,pa2.y+14,32,4);ctx.fillStyle='#ffd23f';ctx.fillRect(pa2.x-16,pa2.y+14,32*fr,4)}}
   ctx.restore()}
  if(box){ctx.strokeStyle='#b3f2e3';ctx.fillStyle='rgba(100,230,210,.16)';ctx.lineWidth=1.3;ctx.fillRect(box.x,box.y,box.w,box.h);ctx.strokeRect(box.x,box.y,box.w,box.h)}

  // v3 overlays: patrol routes (selected units + the route being drawn) and engineer demolition targets
  function routeLine(pts,col,loop,dim){if(!pts||!pts.length)return;ctx.save();ctx.globalAlpha=dim?.55:1;ctx.strokeStyle=col;ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.beginPath();pts.forEach((p,i)=>{var q=screen(p.x,p.y);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y)});if(loop&&pts.length>2){var q0=screen(pts[0].x,pts[0].y);ctx.lineTo(q0.x,q0.y)}ctx.stroke();ctx.setLineDash([]);
   pts.forEach((p,i)=>{var q=screen(p.x,p.y);ctx.fillStyle='rgba(6,20,26,.9)';ctx.beginPath();ctx.arc(q.x,q.y,9,0,7);ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=col;ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),q.x,q.y+.5)});ctx.restore()}
  var drawnRoutes=new Set();for(var ru2 of s.units){if(ru2.hp<=0||!ru2.route||!selected||!selected.has(ru2.id))continue;var rk=JSON.stringify(ru2.route);if(drawnRoutes.has(rk))continue;drawnRoutes.add(rk);routeLine(ru2.route,'#7fe3ff',true)}
  if(ui.draft)routeLine(ui.draft,'#ffe066',true);
  for(var eg of s.units){if(eg.hp<=0||eg.carriedBy||!eg.blowT||eg.side!=='il')continue;var tg=S.findHidden(s,eg.blowT);if(!tg)continue;var pa=screen(eg.x,eg.y),pb=screen(tg.x,tg.y);
   ctx.save();ctx.strokeStyle='rgba(255,170,90,.85)';ctx.lineWidth=1.6;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();ctx.setLineDash([]);
   var pulse=1+.15*Math.sin(s.time*6);ctx.strokeStyle='#ffd23f';ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(pb.x,pb.y,19*pulse,0,7);ctx.stroke();ctx.beginPath();for(var ang=0;ang<4;ang++){var c1=Math.cos(ang*Math.PI/2),s1=Math.sin(ang*Math.PI/2);ctx.moveTo(pb.x+c1*13,pb.y+s1*13);ctx.lineTo(pb.x+c1*25,pb.y+s1*25)}ctx.stroke();
   ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffd23f';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.fillText('🎯 יעד הנדסה',pb.x,pb.y-30);ctx.restore()}
  // v5: Hezbollah gathering for a counterattack (the warning toast names the village)
  if(s.retake&&s.retake.phase==='gather'){var rp=screen(s.retake.x,s.retake.y),pu=1+.12*Math.sin(s.time*5);ctx.save();ctx.strokeStyle='rgba(255,120,60,.9)';ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(rp.x,rp.y,3.2*z*pu,0,7);ctx.stroke();ctx.setLineDash([]);ctx.font='800 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#ffb48a';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.fillText('⚠ התקבצות למתקפת נגד',rp.x,rp.y-3.2*z-6);ctx.restore()}
  // v5: coordinated attack: queued orders as dashed lines and numbered markers until "✓ בצע"
  if(s.coord&&s.coord.orders.length){var CC={move:'#9ff2ff',attack:'#ff8a6a',blow:'#ffb35a',deploy:'#ffd23f',fire:'#ff5a3a',smoke:'#e3e8ee',drop:'#c9a6ff',supply:'#8dffb0',route:'#7fe3ff',pack:'#ffd23f',hold:'#d6d6d6',sweep:'#ffe066',load:'#d6d6d6',unload:'#d6d6d6',build:'#d6d6d6'},
    IC={move:'➜',attack:'⚔',blow:'💥',deploy:'📍',fire:'🔥',smoke:'🌫',drop:'🪂',supply:'📦',route:'✈',pack:'קפל',hold:'✋',sweep:'🔍',load:'⬆',unload:'⬇',build:'🏗'};
   for(var co of s.coord.orders){var col=CC[co.kind]||'#fff',tp=co.kind==='attack'&&co.tx!==undefined?{x:co.tx,y:co.ty}:co.p||(co.points&&co.points[0])||null;
    if(co.kind==='route')routeLine(co.points,col,true,true);ctx.save();ctx.strokeStyle=col;ctx.lineWidth=1.8;ctx.setLineDash([6,5]);
    for(var cid of co.ids||[]){var cu=s.units.find(v=>v.id===cid&&v.hp>0);if(!cu)continue;var a1=screen(cu.x,cu.y);if(tp){var b1=screen(tp.x,tp.y);ctx.beginPath();ctx.moveTo(a1.x,a1.y);ctx.lineTo(b1.x,b1.y);ctx.stroke()}else{ctx.beginPath();ctx.arc(a1.x,a1.y,13,0,7);ctx.stroke();ctx.font='800 9px system-ui';ctx.textAlign='center';ctx.fillStyle=col;ctx.fillText(co.n+' '+(IC[co.kind]||''),a1.x,a1.y-16)}}
    if(tp){var q=screen(tp.x,tp.y);if(co.kind==='fire'||co.kind==='smoke'){ctx.beginPath();ctx.arc(q.x,q.y,(co.kind==='fire'?D.ARTY.fire.radius:D.ARTY.smoke.radius)*z,0,7);ctx.stroke()}
     ctx.setLineDash([]);ctx.fillStyle='rgba(6,14,22,.92)';ctx.beginPath();ctx.arc(q.x,q.y,10,0,7);ctx.fill();ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=col;ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(co.n),q.x,q.y+.5);
     ctx.textBaseline='alphabetic';ctx.font='700 10px system-ui';ctx.fillText(IC[co.kind]||'',q.x,q.y-14)}ctx.restore()}}
  // The minimap is intentionally at the LEFT, outside the right-hand command dock.
  drawMinimap(s);
 }

 // Top-down procedural sprites. Israel = olive/sand with cyan outline; Hezbollah = khaki/yellow with orange outline.
 function drawUnit(u,sp,own,sz,time){var line=own?'#a8fff0':'#ffb067',body=own?'#6d7a4a':'#8a7a45',dark=own?'#3f4a2b':'#57492a';ctx.lineWidth=1.2;ctx.strokeStyle=line;
  if(sp.cls==='inf'){var n=Math.min(u.soldiers,8),r=sz*.58;for(var k=0;k<n;k++){var th=k/n*Math.PI*2+(u.id%7);var x=Math.cos(th)*r*(k%2?.75:1),y=Math.sin(th)*r*(k%2?.75:1);
     ctx.fillStyle=body;ctx.beginPath();ctx.arc(x,y,Math.max(1.7,sz*.2),0,7);ctx.fill();ctx.stroke();ctx.fillStyle=sp.beret||line;ctx.beginPath();ctx.arc(x,y,Math.max(.9,sz*.1),0,7);ctx.fill()}
   if(u.type==='engineer'){ctx.fillStyle='#ffd34d';ctx.fillRect(-sz*.18,-sz*.18,sz*.36,sz*.36)}return}
  ctx.rotate(u.facing||0);
  if(u.type==='merkava'||u.type==='hz_tank'){ctx.fillStyle=dark;ctx.fillRect(-sz*.85,-sz*.58,sz*1.7,sz*.26);ctx.fillRect(-sz*.85,sz*.32,sz*1.7,sz*.26);
   ctx.fillStyle=body;ctx.beginPath();if(u.type==='merkava'){ctx.moveTo(sz*.95,-sz*.34);ctx.lineTo(sz*.95,sz*.34);ctx.lineTo(-sz*.8,sz*.4);ctx.lineTo(-sz*.8,-sz*.4)}else ctx.rect(-sz*.75,-sz*.36,sz*1.55,sz*.72);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle=own?'#87956a':'#9c8c57';ctx.beginPath();if(u.type==='merkava'){ctx.moveTo(sz*.45,-sz*.22);ctx.lineTo(sz*.45,sz*.22);ctx.lineTo(-sz*.4,sz*.3);ctx.lineTo(-sz*.5,0);ctx.lineTo(-sz*.4,-sz*.3)}else ctx.arc(-sz*.05,0,sz*.3,0,7);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle=line;ctx.fillRect(sz*.3,-sz*.06,sz*1.0,sz*.12);
   if(u.type==='merkava'&&u.trophy>0){ctx.fillStyle='#62e8ff';ctx.fillRect(-sz*.15,-sz*.34,sz*.12,sz*.12);ctx.fillRect(-sz*.15,sz*.22,sz*.12,sz*.12)}return}
  if(u.type==='namer'||u.type==='hz_apc'){ctx.fillStyle=dark;ctx.fillRect(-sz*.8,-sz*.55,sz*1.6,sz*.22);ctx.fillRect(-sz*.8,sz*.33,sz*1.6,sz*.22);ctx.fillStyle=body;ctx.fillRect(-sz*.78,-sz*.4,sz*1.6,sz*.8);ctx.strokeRect(-sz*.78,-sz*.4,sz*1.6,sz*.8);
   ctx.fillStyle=own?'#87956a':'#9c8c57';ctx.fillRect(sz*.25,-sz*.2,sz*.4,sz*.4);ctx.fillStyle=line;ctx.fillRect(sz*.5,-sz*.04,sz*.55,sz*.08);
   if(u.cargo&&u.cargo.length){ctx.fillStyle='#fff3a0';for(var c=0;c<u.cargo.length;c++)ctx.fillRect(-sz*.55+c*sz*.35,-sz*.12,sz*.25,sz*.24)}return}
  if(u.type==='truck'){ctx.fillStyle=dark;ctx.fillRect(-sz*.9,-sz*.45,sz*1.3,sz*.9);ctx.fillStyle='#8f9a6a';ctx.fillRect(-sz*.85,-sz*.4,sz*1.2,sz*.8);ctx.strokeRect(-sz*.9,-sz*.45,sz*1.3,sz*.9);ctx.fillStyle='#c9b27a';ctx.fillRect(-sz*.75,-sz*.3,sz*.45,sz*.25);ctx.fillRect(-sz*.25,-sz*.3,sz*.45,sz*.25);ctx.fillRect(-sz*.75,sz*.05,sz*.45,sz*.25);ctx.fillRect(-sz*.25,sz*.05,sz*.45,sz*.25);
   ctx.fillStyle=body;ctx.fillRect(sz*.45,-sz*.38,sz*.5,sz*.76);ctx.strokeRect(sz*.45,-sz*.38,sz*.5,sz*.76);ctx.fillStyle='#bfe8ff';ctx.fillRect(sz*.78,-sz*.3,sz*.12,sz*.6);ctx.fillStyle='#8dffb0';ctx.fillRect(-sz*.42,-sz*.08,sz*.3,sz*.16);ctx.fillRect(-sz*.35,-sz*.15,sz*.16,sz*.3);return}
  if(sp.armor==='light'){ctx.fillStyle='#d8cfa8';ctx.fillRect(-sz*.7,-sz*.42,sz*1.4,sz*.84);ctx.strokeRect(-sz*.7,-sz*.42,sz*1.4,sz*.84);ctx.fillStyle='#333';ctx.fillRect(sz*.15,-sz*.38,sz*.3,sz*.76);
   ctx.fillStyle=u.type==='tech_aa'?'#ff6060':u.type==='tech_atgm'?'#ffcf3f':'#222';ctx.beginPath();ctx.arc(-sz*.3,0,sz*.22,0,7);ctx.fill();ctx.fillRect(-sz*.3,-sz*.05,sz*.65,sz*.1);return}
  if(u.type==='drone'){ctx.fillStyle='#ffcf6a';ctx.beginPath();ctx.moveTo(sz,0);ctx.lineTo(-sz*.6,-sz*.8);ctx.lineTo(-sz*.3,0);ctx.lineTo(-sz*.6,sz*.8);ctx.closePath();ctx.fill();ctx.stroke();return}
  if(u.type==='c130'){ctx.fillStyle='#b8c2c4';ctx.beginPath();ctx.ellipse(0,0,sz*1.1,sz*.2,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#9aa6a8';ctx.beginPath();ctx.moveTo(sz*.25,-sz*1.25);ctx.lineTo(sz*.45,-sz*1.25);ctx.lineTo(sz*.35,sz*1.25);ctx.lineTo(sz*.12,sz*1.25);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillRect(-sz*1.05,-sz*.45,sz*.22,sz*.9);ctx.fillStyle='#2f6fd6';ctx.beginPath();ctx.arc(-sz*.3,0,sz*.12,0,7);ctx.fill();ctx.fillStyle='#444';for(var e2=-1;e2<=1;e2+=2){ctx.fillRect(sz*.38,e2*sz*.5-sz*.06,sz*.22,sz*.12);ctx.fillRect(sz*.34,e2*sz*.92-sz*.06,sz*.22,sz*.12)}return}
  if(u.type==='artillery'){var st=(u.art&&u.art.st)||'',dep=st==='deployed'||st==='deploying';ctx.fillStyle=dark;ctx.fillRect(-sz*.8,-sz*.55,sz*1.6,sz*.24);ctx.fillRect(-sz*.8,sz*.31,sz*1.6,sz*.24);
   ctx.fillStyle=body;ctx.fillRect(-sz*.75,-sz*.36,sz*1.5,sz*.72);ctx.strokeRect(-sz*.75,-sz*.36,sz*1.5,sz*.72);ctx.fillStyle=own?'#87956a':'#9c8c57';ctx.fillRect(-sz*.5,-sz*.3,sz*.7,sz*.6);
   ctx.fillStyle=line;ctx.fillRect(sz*.1,-sz*.07,sz*(dep?1.55:1.15),sz*.14);ctx.fillStyle='#ffe066';ctx.fillRect(sz*(dep?1.55:1.15),-sz*.1,sz*.12,sz*.2);
   if(dep){ctx.strokeStyle='#d8d0a8';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-sz*.75,-sz*.25);ctx.lineTo(-sz*1.2,-sz*.55);ctx.moveTo(-sz*.75,sz*.25);ctx.lineTo(-sz*1.2,sz*.55);ctx.stroke()}return}
  if(u.type==='heli'){ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(sz*.15,0,sz*.55,sz*.28,0,0,7);ctx.fill();ctx.stroke();ctx.fillRect(-sz*1.0,-sz*.07,sz*.9,sz*.14);
   ctx.save();ctx.rotate(time*25);ctx.strokeStyle='rgba(230,250,240,.75)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-sz*1.1,0);ctx.lineTo(sz*1.1,0);ctx.moveTo(0,-sz*1.1);ctx.lineTo(0,sz*1.1);ctx.stroke();ctx.restore();return}
  if(u.type==='jet'){ctx.fillStyle='#9aa7a3';ctx.beginPath();ctx.moveTo(sz*1.1,0);ctx.lineTo(-sz*.1,-sz*.25);ctx.lineTo(-sz*.35,-sz*.95);ctx.lineTo(-sz*.6,-sz*.95);ctx.lineTo(-sz*.5,-sz*.2);ctx.lineTo(-sz*.9,-sz*.35);ctx.lineTo(-sz*.9,sz*.35);ctx.lineTo(-sz*.5,sz*.2);ctx.lineTo(-sz*.6,sz*.95);ctx.lineTo(-sz*.35,sz*.95);ctx.lineTo(-sz*.1,sz*.25);ctx.closePath();ctx.fill();ctx.stroke();return}
  if(sp.cls==='air'){ctx.fillStyle=u.type==='uav_attack'?'#c9c39a':'#d9e6e0';ctx.fillRect(-sz*.7,-sz*.08,sz*1.4,sz*.16);ctx.beginPath();ctx.moveTo(sz*.15,-sz*.95);ctx.lineTo(sz*.32,-sz*.95);ctx.lineTo(sz*.32,sz*.95);ctx.lineTo(sz*.15,sz*.95);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillRect(-sz*.75,-sz*.35,sz*.12,sz*.7);return}
  if(u.type==='post'){ctx.rotate(-(u.facing||0));ctx.fillStyle='#6f7b62';ctx.fillRect(-sz*.7,-sz*.7,sz*1.4,sz*1.4);ctx.strokeRect(-sz*.7,-sz*.7,sz*1.4,sz*1.4);ctx.fillStyle='#c9d7b0';ctx.beginPath();ctx.arc(0,0,sz*.32,0,7);ctx.fill();if(!u.built){ctx.fillStyle='rgba(255,220,90,.8)';ctx.fillRect(-sz*.7,sz*.75,sz*1.4*(1-u.buildT/D.UNITS.post.time),3)}return}
  ctx.fillStyle=body;ctx.beginPath();ctx.arc(0,0,sz,0,7);ctx.fill();ctx.stroke()}
 var mmFog=null,mmFogT=-9,mmFogS=null;
 function drawMinimap(s){var w=94,h=126,ox=8+(view.il||0),oy=view.h-h-8-(view.ib||0);
   ctx.fillStyle='rgba(8,20,25,.95)';ctx.fillRect(ox-2,oy-2,w+4,h+4);
   ctx.drawImage(tile,0,0,tile.width,tile.height,ox,oy,w,h);
   ctx.strokeStyle='#5cc8cc';ctx.lineWidth=1;ctx.strokeRect(ox,oy,w,h);
   for(var site of s.sites){var x=ox+site.x/M.cols*w,y=oy+site.y/M.rows*h;ctx.fillStyle=site.owner==='il'?'#65e5d0':site.t==='main'?'#ff5655':'#f3ab63';ctx.fillRect(x-1,y-1,site.t==='main'?4:2,site.t==='main'?4:2)}
   for(var hd of (s.hidden||[]))if(!hd.dead&&hd.revealed){ctx.fillStyle=hd.kind==='tunnel'?'#c58cff':hd.kind==='ied'?'#ff9a3a':'#ffe066';ctx.fillRect(ox+hd.x/M.cols*w-1,oy+hd.y/M.rows*h-1,3,3)}
   for(var lu of s.units)if(lu.type==='hz_launcher'&&lu.hp>0&&lu.revealed){ctx.fillStyle='#ff4a3a';ctx.fillRect(ox+lu.x/M.cols*w-1.5,oy+lu.y/M.rows*h-1.5,3,3)}
   // v5: fog (unseen = dark) and the enemy units we can see right now
   if(s.fog&&S.visionGrid){if(!mmFog){mmFog=document.createElement('canvas');mmFog.width=M.cols;mmFog.height=M.rows;mmFogT=-9}
    if(Math.abs(s.time-mmFogT)>.5||mmFogS!==s){mmFogT=s.time;mmFogS=s;var vg=S.visionGrid(s),fc=mmFog.getContext('2d'),img=fc.createImageData(M.cols,M.rows);for(var vi=0;vi<vg.length;vi++){img.data[vi*4+3]=vg[vi]?0:150}fc.putImageData(img,0,0)}
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(mmFog,0,0,M.cols,M.rows,ox,oy,w,h);ctx.restore()}
   for(var eu of s.units){if(eu.side!=='hz'||eu.hp<=0||eu.carriedBy||D.UNITS[eu.type].building||(eu.hidden&&!eu.revealed)||(s.fog&&S.inFog(s,eu.x,eu.y)))continue;ctx.fillStyle='#ff5a4a';ctx.fillRect(ox+eu.x/M.cols*w-1,oy+eu.y/M.rows*h-1,2.4,2.4)}
   for(var u of s.units)if(u.side==='il'&&u.hp>0&&!u.carriedBy){ctx.fillStyle='#86ffff';ctx.fillRect(ox+u.x/M.cols*w,oy+u.y/M.rows*h,2,2)}
   var r=world(0,0),b=world(view.w-view.right,view.h);ctx.strokeStyle='#f6efbf';ctx.strokeRect(ox+r.x/M.cols*w,oy+r.y/M.rows*h,(b.x-r.x)/M.cols*w,(b.y-r.y)/M.rows*h);
   ctx.font='600 9px system-ui';ctx.fillStyle='#e0f3ed';ctx.textAlign='center';ctx.fillText('מיני־מפה',ox+w/2,oy-8)
 }
 function minimapHit(x,y){var ox=8+(view.il||0),oy=view.h-126-8-(view.ib||0);if(x>=ox&&x<=ox+94&&y>=oy&&y<=oy+126)return{x:(x-ox)/94*M.cols,y:(y-oy)/126*M.rows};return null}
 resize();return{ctx,view,draw,resize,screen,world,camera,minimapHit,tile};}
 root.LF=root.LF||{};root.LF.render={init};
})(window);
