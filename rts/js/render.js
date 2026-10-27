/* LEBANON FRONT — Canvas renderer only; game rules stay in sim.js. */
(function(root){'use strict';
var D=root.LF.data,S=root.LF.sim,M=D.MAP;
function init(canvas){var ctx=canvas.getContext('2d',{alpha:false}),view={x:35,y:111,z:19,min:9,max:46,w:844,h:390,dpr:1,right:148},tile=document.createElement('canvas');
 tile.width=M.cols*24;tile.height=M.rows*24;var fog=document.createElement('canvas');fog.width=M.cols;fog.height=M.rows;var fogImg=fog.getContext('2d').createImageData(M.cols,M.rows);for(var fi=0;fi<fogImg.data.length;fi+=4){fogImg.data[fi]=5;fogImg.data[fi+1]=14;fogImg.data[fi+2]=21}var g=tile.getContext('2d');
 var colors={sea:'#112738',beach:'#7b8b79',open:'#536956',forest:'#294e3f',village:'#817862',city:'#766f61',road:'#867e65',river:'#307b89',bridge:'#a9a18a',hills:'#596a54',syria:'#3a4446'};
 var noise=(x,y)=>{var n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)};
 for(var y=0;y<M.rows;y++)for(var x=0;x<M.cols;x++){
  var t=S.terrain[y][x],px=x*24,py=y*24,r=noise(x,y),c=colors[t]||'#445542';g.fillStyle=c;g.fillRect(px,py,25,25);
  if(t==='forest'){g.fillStyle=r>.3?'#1b3f34':'#3b6147';for(var j=0;j<3;j++){var ox=noise(x+j,y)*23,oy=noise(y+j,x)*23;g.beginPath();g.arc(px+ox,py+oy,4+r*3,0,7);g.fill()}}
  else if(t==='open'||t==='hills'){g.fillStyle=r>.5?'rgba(255,225,150,.075)':'rgba(0,20,5,.10)';g.fillRect(px+r*11,py+r*15,5+r*8,2+r*6)}
  else if(t==='city'||t==='village'){g.fillStyle=r>.4?'#a69b81':'#4c5148';for(var k=0;k<3;k++)g.fillRect(px+2+noise(x+k,y)*14,py+2+noise(y+k,x)*14,4+r*3,4+r*3)}
  else if(t==='sea'){g.strokeStyle='rgba(120,197,206,.075)';g.beginPath();g.moveTo(px+2,py+9);g.lineTo(px+15,py+9);g.stroke()}
 }
 function line(c,arr,col,w,dash){g.save();g.strokeStyle=col;g.lineWidth=w;g.lineJoin='round';g.lineCap='round';if(dash)g.setLineDash(dash);g.beginPath();arr.forEach((p,i)=>{var a=D.toTile(p[1],p[0]);if(i)g.lineTo(a.x*24,a.y*24);else g.moveTo(a.x*24,a.y*24)});g.stroke();g.restore()}
 line(g,D.COAST,'rgba(141,208,203,.7)',2);line(g,D.LITANI,'rgba(67,201,222,.75)',3);
 for(var r of D.ROADS)line(g,r,'rgba(190,185,143,.30)',2);
 line(g,D.BORDER,'rgba(73,185,236,.8)',2,[7,7]);
 for(var bridge of D.BRIDGES){var p=D.toTile(bridge[1],bridge[0]);g.fillStyle='#d6bc80';g.fillRect(p.x*24-5,p.y*24-3,10,6)}
 function resize(){view.dpr=Math.min(2,devicePixelRatio||1);view.w=innerWidth;view.h=innerHeight;canvas.width=Math.floor(view.w*view.dpr);canvas.height=Math.floor(view.h*view.dpr);canvas.style.width=view.w+'px';canvas.style.height=view.h+'px';ctx.setTransform(view.dpr,0,0,view.dpr,0,0)}
 function screen(x,y){return{x:(x-view.x)*view.z+(view.w-view.right)/2,y:(y-view.y)*view.z+view.h/2}}
 function world(x,y){return{x:(x-(view.w-view.right)/2)/view.z+view.x,y:(y-view.h/2)/view.z+view.y}}
 function camera(x,y,z){if(Number.isFinite(x))view.x=Math.max(8,Math.min(M.cols-5,x));if(Number.isFinite(y))view.y=Math.max(7,Math.min(M.rows-7,y));if(Number.isFinite(z))view.z=Math.max(view.min,Math.min(view.max,z))}
 function draw(s,selected,box,showFog){
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
    ctx.fillStyle='rgba(7,18,22,.85)';ctx.beginPath();ctx.arc(p.x,p.y,radius+4,0,7);ctx.fill();
    ctx.fillStyle=color;ctx.strokeStyle='#dfd4b0';ctx.lineWidth=1.3;ctx.beginPath();
    if(site.t==='outpost')ctx.rect(p.x-radius*.7,p.y-radius*.7,radius*1.4,radius*1.4);
    else if(site.t==='main'){for(var q=0;q<6;q++){var ang=q*Math.PI/3-.5;q?ctx.lineTo(p.x+Math.cos(ang)*radius,p.y+Math.sin(ang)*radius):ctx.moveTo(p.x+Math.cos(ang)*radius,p.y+Math.sin(ang)*radius)}ctx.closePath()}
    else ctx.arc(p.x,p.y,radius,0,7);ctx.fill();ctx.stroke();
    var bu=site.owner==='hz'&&S.get(s,site.building);if(bu&&bu.hp<bu.maxHp){var bw=radius*2.6;ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(p.x-bw/2,p.y+radius+5,bw,4);ctx.fillStyle=bu.hp/bu.maxHp>.4?'#ffb35c':'#ff5a4a';ctx.fillRect(p.x-bw/2,p.y+radius+5,bw*bu.hp/bu.maxHp,4)}
    if(site.owner==='hz'&&!bu){ctx.strokeStyle='#ffe48a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x-radius*.6,p.y-radius*.6);ctx.lineTo(p.x+radius*.6,p.y+radius*.6);ctx.moveTo(p.x+radius*.6,p.y-radius*.6);ctx.lineTo(p.x-radius*.6,p.y+radius*.6);ctx.stroke()}
    if(site.capture>0&&site.owner==='hz'){ctx.strokeStyle='#52ddc7';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,radius+6,-Math.PI/2,-Math.PI/2+(site.capture/ru.capture)*Math.PI*2);ctx.stroke()}
    if(z>=15||site.t==='main'||site.t==='city')label(site.x,site.y-(radius+10)/z,site.n,site.owner==='il'?'#aef7e2':'#ffdcc3',site.t==='main'?13:11,'rgba(8,20,25,.62)');
  }
  var hq=S.get(s,s.hq);if(hq){var p=screen(hq.x,hq.y);ctx.fillStyle='#21b9d4';ctx.strokeStyle='#dcf7ef';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y-14);ctx.lineTo(p.x+14,p.y+10);ctx.lineTo(p.x-14,p.y+10);ctx.closePath();ctx.fill();ctx.stroke();label(hq.x,hq.y+1.7,'בסיס פיקוד צפון','#b6f2ff',11,'rgba(8,20,25,.8)')}
  for(var u of s.units){if(u.hp<=0||u.carriedBy||(!u.built&&u.type!=='post'))continue;if(u.side==='hz'&&showFog&&S.inFog(s,u.x,u.y))continue;var p=screen(u.x,u.y),sp=D.UNITS[u.type];if(p.x<-20||p.x>w+20||p.y<-20||p.y>h+20)continue;
    var own=u.side==='il',sz=Math.max(4,Math.min(16,(sp.size||.48)*z*.75));
    if(sp.building&&u.type!=='post')continue;
    ctx.save();ctx.translate(p.x,p.y);if(sp.move==='air'){ctx.fillStyle='rgba(0,0,0,.30)';ctx.beginPath();ctx.ellipse(4,5,sz*1.1,sz*.6,0,0,7);ctx.fill()}
    if(selected.has(u.id)){ctx.strokeStyle='#fff5bc';ctx.lineWidth=1.5;ctx.setLineDash([3,2]);ctx.beginPath();ctx.arc(0,0,sz+5,0,7);ctx.stroke();ctx.setLineDash([])}
    drawUnit(u,sp,own,sz,s.time);
    if(u.flash){ctx.globalAlpha=Math.min(1,u.flash/.22);ctx.fillStyle='#fff8b4';ctx.beginPath();ctx.arc(0,0,sz*.45,0,7);ctx.fill();ctx.globalAlpha=1}
    ctx.restore();
    // Health bars, enemy/Israeli IDs, group number, soldier count.
    if(u.hp<u.maxHp||selected.has(u.id)){var width=Math.max(13,sz*2);ctx.fillStyle='rgba(0,0,0,.76)';ctx.fillRect(p.x-width/2,p.y-sz-7,width,3);ctx.fillStyle=u.hp/u.maxHp>.4?'#4ee4b5':'#ff8069';ctx.fillRect(p.x-width/2,p.y-sz-7,width*Math.max(0,u.hp/u.maxHp),3)}
    if(selected.has(u.id)&&z>13&&selected.size<=3){ctx.font='bold 9px system-ui';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(sp.n+(u.soldiers?' ×'+u.soldiers:'')+(u.group?' [G'+u.group+']':''),p.x,p.y+sz+11)}
    if(u.goal&&selected.has(u.id)){var g=screen(u.goal.x,u.goal.y);ctx.strokeStyle='rgba(244,229,147,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(g.x,g.y);ctx.stroke()}
  }
  var now=s.time;for(var ev of s.events){if(ev.x===undefined)continue;var age=now-ev.time;if(age<0)age=0;var p=screen(ev.x,ev.y);if(p.x<-40||p.x>w+40||p.y<-40||p.y>h+40)continue;
   if(ev.kind==='shot'){if(age>.45)continue;var q=screen(ev.tx,ev.ty),k=Math.min(1,age/.18),il=ev.side==='il';
    if(ev.fx==='bullet'){var a0=Math.max(0,k-.35);ctx.strokeStyle=il?'#c8f6ff':'#ffd08a';ctx.lineWidth=1.2;ctx.globalAlpha=1-age/.45;ctx.beginPath();ctx.moveTo(p.x+(q.x-p.x)*a0,p.y+(q.y-p.y)*a0);ctx.lineTo(p.x+(q.x-p.x)*k,p.y+(q.y-p.y)*k);ctx.stroke();
     if(age<.06){ctx.fillStyle='#fff2b0';ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,7);ctx.fill()}}
    else if(ev.fx==='shell'||ev.fx==='bomb'){ctx.strokeStyle='#fff0a8';ctx.lineWidth=2.4;ctx.globalAlpha=1-age/.45;ctx.beginPath();ctx.moveTo(p.x+(q.x-p.x)*Math.max(0,k-.2),p.y+(q.y-p.y)*Math.max(0,k-.2));ctx.lineTo(p.x+(q.x-p.x)*k,p.y+(q.y-p.y)*k);ctx.stroke();
     if(age<.1){ctx.fillStyle='rgba(255,230,150,.9)';ctx.beginPath();ctx.arc(p.x,p.y,5,0,7);ctx.fill()}}
    else {var kk=Math.min(1,age/.4);ctx.strokeStyle='rgba(220,220,210,.55)';ctx.lineWidth=2;ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+(q.x-p.x)*kk,p.y+(q.y-p.y)*kk);ctx.stroke();
     ctx.fillStyle=ev.fx==='atgm'?'#ff5a3c':ev.fx==='laser'?'#7fffea':'#ffe066';ctx.beginPath();ctx.arc(p.x+(q.x-p.x)*kk,p.y+(q.y-p.y)*kk,2.6,0,7);ctx.fill()}
    ctx.globalAlpha=1}
   else if(ev.kind==='hit'){if(age>.25)continue;ctx.fillStyle='rgba(255,210,120,'+(1-age/.25)+')';ctx.beginPath();ctx.arc(p.x+(Math.sin(ev.time*99)*3),p.y+(Math.cos(ev.time*77)*3),2+age*10,0,7);ctx.fill()}
   else if(ev.kind==='explosion'){if(age>1.2)continue;var t=age/1.2,R=Math.max(6,z*.9);
    ctx.fillStyle='rgba(70,64,58,'+(.55*(1-t))+')';ctx.beginPath();ctx.arc(p.x+t*6,p.y-t*10,R*(.6+t*1.2),0,7);ctx.fill();
    if(t<.45){var f=1-t/.45;ctx.fillStyle='rgba(255,'+(140+Math.round(80*f))+',60,'+f+')';ctx.beginPath();ctx.arc(p.x,p.y,R*(.4+t*1.6),0,7);ctx.fill();ctx.fillStyle='rgba(255,250,210,'+f+')';ctx.beginPath();ctx.arc(p.x,p.y,R*.35*f,0,7);ctx.fill()}
    ctx.strokeStyle='rgba(255,220,160,'+(1-t)*.7+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,R*(.5+t*2.4),0,7);ctx.stroke()}
   else if(ev.kind==='trophy'){if(age>.6)continue;var t=age/.6;ctx.strokeStyle='rgba(110,240,255,'+(1-t)+')';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,6+t*22,0,7);ctx.stroke();ctx.fillStyle='rgba(200,255,255,'+(1-t)+')';ctx.font='bold 10px system-ui';ctx.fillText('מעיל רוח!',p.x,p.y-16-t*10)}
   else if(ev.kind==='repair'){if(age>.8)continue;ctx.fillStyle='rgba(120,255,160,'+(1-age/.8)+')';ctx.font='bold 11px system-ui';ctx.fillText('+',p.x+5,p.y-8-age*12)}
  }
  // Fog of war: one pixel per tile on a small canvas, drawn scaled with smoothing = soft edges.
  if(showFog){var fd=fog.getContext('2d'),img=fogImg,vis=S.inFog;for(var ty=0;ty<M.rows;ty++)for(var tx=0;tx<M.cols;tx++){var o=(ty*M.cols+tx)*4;img.data[o+3]=vis(s,tx+.5,ty+.5)?205:0}
    fd.putImageData(img,0,0);ctx.save();ctx.imageSmoothingEnabled=true;var A=screen(0,0),B=screen(M.cols,M.rows);ctx.drawImage(fog,0,0,M.cols,M.rows,A.x,A.y,B.x-A.x,B.y-A.y);ctx.restore()}
  if(box){ctx.strokeStyle='#b3f2e3';ctx.fillStyle='rgba(100,230,210,.16)';ctx.lineWidth=1.3;ctx.fillRect(box.x,box.y,box.w,box.h);ctx.strokeRect(box.x,box.y,box.w,box.h)}
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
  if(sp.armor==='light'){ctx.fillStyle='#d8cfa8';ctx.fillRect(-sz*.7,-sz*.42,sz*1.4,sz*.84);ctx.strokeRect(-sz*.7,-sz*.42,sz*1.4,sz*.84);ctx.fillStyle='#333';ctx.fillRect(sz*.15,-sz*.38,sz*.3,sz*.76);
   ctx.fillStyle=u.type==='tech_aa'?'#ff6060':u.type==='tech_atgm'?'#ffcf3f':'#222';ctx.beginPath();ctx.arc(-sz*.3,0,sz*.22,0,7);ctx.fill();ctx.fillRect(-sz*.3,-sz*.05,sz*.65,sz*.1);return}
  if(u.type==='drone'){ctx.fillStyle='#ffcf6a';ctx.beginPath();ctx.moveTo(sz,0);ctx.lineTo(-sz*.6,-sz*.8);ctx.lineTo(-sz*.3,0);ctx.lineTo(-sz*.6,sz*.8);ctx.closePath();ctx.fill();ctx.stroke();return}
  if(u.type==='heli'){ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(sz*.15,0,sz*.55,sz*.28,0,0,7);ctx.fill();ctx.stroke();ctx.fillRect(-sz*1.0,-sz*.07,sz*.9,sz*.14);
   ctx.save();ctx.rotate(time*25);ctx.strokeStyle='rgba(230,250,240,.75)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-sz*1.1,0);ctx.lineTo(sz*1.1,0);ctx.moveTo(0,-sz*1.1);ctx.lineTo(0,sz*1.1);ctx.stroke();ctx.restore();return}
  if(u.type==='jet'){ctx.fillStyle='#9aa7a3';ctx.beginPath();ctx.moveTo(sz*1.1,0);ctx.lineTo(-sz*.1,-sz*.25);ctx.lineTo(-sz*.35,-sz*.95);ctx.lineTo(-sz*.6,-sz*.95);ctx.lineTo(-sz*.5,-sz*.2);ctx.lineTo(-sz*.9,-sz*.35);ctx.lineTo(-sz*.9,sz*.35);ctx.lineTo(-sz*.5,sz*.2);ctx.lineTo(-sz*.6,sz*.95);ctx.lineTo(-sz*.35,sz*.95);ctx.lineTo(-sz*.1,sz*.25);ctx.closePath();ctx.fill();ctx.stroke();return}
  if(sp.cls==='air'){ctx.fillStyle=u.type==='uav_attack'?'#c9c39a':'#d9e6e0';ctx.fillRect(-sz*.7,-sz*.08,sz*1.4,sz*.16);ctx.beginPath();ctx.moveTo(sz*.15,-sz*.95);ctx.lineTo(sz*.32,-sz*.95);ctx.lineTo(sz*.32,sz*.95);ctx.lineTo(sz*.15,sz*.95);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillRect(-sz*.75,-sz*.35,sz*.12,sz*.7);return}
  if(u.type==='post'){ctx.rotate(-(u.facing||0));ctx.fillStyle='#6f7b62';ctx.fillRect(-sz*.7,-sz*.7,sz*1.4,sz*1.4);ctx.strokeRect(-sz*.7,-sz*.7,sz*1.4,sz*1.4);ctx.fillStyle='#c9d7b0';ctx.beginPath();ctx.arc(0,0,sz*.32,0,7);ctx.fill();if(!u.built){ctx.fillStyle='rgba(255,220,90,.8)';ctx.fillRect(-sz*.7,sz*.75,sz*1.4*(1-u.buildT/D.UNITS.post.time),3)}return}
  ctx.fillStyle=body;ctx.beginPath();ctx.arc(0,0,sz,0,7);ctx.fill();ctx.stroke()}
 function drawMinimap(s){var w=94,h=126,ox=8,oy=view.h-h-8;
   ctx.fillStyle='rgba(8,20,25,.95)';ctx.fillRect(ox-2,oy-2,w+4,h+4);
   ctx.drawImage(tile,0,0,tile.width,tile.height,ox,oy,w,h);
   ctx.strokeStyle='#5cc8cc';ctx.lineWidth=1;ctx.strokeRect(ox,oy,w,h);
   for(var site of s.sites){var x=ox+site.x/M.cols*w,y=oy+site.y/M.rows*h;ctx.fillStyle=site.owner==='il'?'#65e5d0':site.t==='main'?'#ff5655':'#f3ab63';ctx.fillRect(x-1,y-1,site.t==='main'?4:2,site.t==='main'?4:2)}
   for(var u of s.units)if(u.side==='il'&&u.hp>0&&!u.carriedBy){ctx.fillStyle='#86ffff';ctx.fillRect(ox+u.x/M.cols*w,oy+u.y/M.rows*h,2,2)}
   var r=world(0,0),b=world(view.w-view.right,view.h);ctx.strokeStyle='#f6efbf';ctx.strokeRect(ox+r.x/M.cols*w,oy+r.y/M.rows*h,(b.x-r.x)/M.cols*w,(b.y-r.y)/M.rows*h);
   ctx.font='600 9px system-ui';ctx.fillStyle='#e0f3ed';ctx.textAlign='center';ctx.fillText('מיני־מפה',ox+w/2,oy-8)
 }
 function minimapHit(x,y){var ox=8,oy=view.h-126-8;if(x>=ox&&x<=ox+94&&y>=oy&&y<=oy+126)return{x:(x-ox)/94*M.cols,y:(y-oy)/126*M.rows};return null}
 resize();return{ctx,view,draw,resize,screen,world,camera,minimapHit,tile};}
 root.LF=root.LF||{};root.LF.render={init};
})(window);
