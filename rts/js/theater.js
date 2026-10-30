/* LEBANON FRONT — v6b theater (campaign) map: Lebanon, Syria, Iraq, Iran with the major cities, coloured by holder.
   Only the Lebanon front is open; the others are locked. Pure layout math is exported for the tests; drawing needs a canvas. */
(function(root){'use strict';
var D=root.LF&&root.LF.data||(typeof require==='function'?require('./data.js'):null);
var TH=D.THEATER,M=D.MAP,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
var K=Math.cos(32.5*Math.PI/180);
// Big map area (x,y,w,h) and the Lebanon inset area. The inset shows the play area itself, so a tap lands precisely.
function layout(W,H,top){top=top||40;var insetH=Math.min(H-top-14,Math.max(140,(H-top-14))),insetW=Math.round(insetH*(M.cols*.87)/(M.rows*.9));
 var inset={x:W-insetW-12,y:top+4,w:insetW,h:insetH-8};var area={x:8,y:top,w:W-insetW-32,h:H-top-8};
 var b=TH.box,gw=(b.lon1-b.lon0)*K,gh=b.lat0-b.lat1,sc=Math.min(area.w/gw,area.h/gh);
 return {W,H,sc,ox:area.x+(area.w-gw*sc)/2,oy:area.y+(area.h-gh*sc)/2,area,inset}}
function proj(L,lon,lat){return {x:L.ox+(lon-TH.box.lon0)*K*L.sc,y:L.oy+(TH.box.lat0-lat)*L.sc}}
function unproj(L,x,y){return {lon:(x-L.ox)/(K*L.sc)+TH.box.lon0,lat:TH.box.lat0-(y-L.oy)/L.sc}}
function playRect(L){var a=proj(L,M.lon0,M.lat0),b=proj(L,M.lon1,M.lat1);return {x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y}}
function holder(s,c){if(c.site){var z=s&&s.sites&&s.sites.find(q=>q.key===c.site);return z&&z.owner==='il'?'il':'hz'}return c.holder||'hz'}
function cities(s){return TH.cities.map(c=>Object.assign({},c,{h:holder(s,c),locked:!TH.fronts[c.front].open}))}
// A tap: inside the inset (the play area itself) → that tile; on the big map inside (or within pad px of) the Lebanon play area → that tile; else null.
function hit(L,x,y,pad){var I=L.inset;if(x>=I.x&&x<=I.x+I.w&&y>=I.y&&y<=I.y+I.h)return {x:clamp((x-I.x)/I.w*M.cols,1,M.cols-1),y:clamp((y-I.y)/I.h*M.rows,1,M.rows-1),from:'inset'};
 var r=playRect(L);pad=pad===undefined?10:pad;if(x<r.x-pad||x>r.x+r.w+pad||y<r.y-pad||y>r.y+r.h+pad)return null;var ll=unproj(L,x,y),t=D.toTile(ll.lon,ll.lat);return {x:clamp(t.x,1,M.cols-1),y:clamp(t.y,1,M.rows-1),from:'map'}}
function lockedAt(L,x,y){var best=null,bd=22;for(var c of TH.cities){if(TH.fronts[c.front].open)continue;var p=proj(L,c.lon,c.lat),d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best=c}}return best}
var COUNTRY={ISR:'#2c6a62',LBN:'#6b5232',SYR:'#5a2f2f',IRQ:'#5a3a26',IRN:'#4d2626',PSE:'#2c6a62'},NEUTRAL='#2b3a3f';
function draw(ctx,L,s,opts){opts=opts||{};var W=L.W,H=L.H;ctx.fillStyle='#0b2533';ctx.fillRect(0,0,W,H);
 var geo=root.GEO;ctx.save();ctx.beginPath();ctx.rect(L.area.x,L.area.y,L.area.w,L.area.h);ctx.clip();ctx.fillStyle='#0f3346';ctx.fillRect(L.area.x,L.area.y,L.area.w,L.area.h);
 if(geo){for(var c of geo){if(c.iso==='-99'&&!/Cyprus/.test(c.name))continue;ctx.fillStyle=COUNTRY[c.iso]||NEUTRAL;ctx.strokeStyle='rgba(190,230,230,.35)';ctx.lineWidth=.8;
   for(var ring of c.r){ctx.beginPath();for(var i=0;i<ring.length;i+=2){var p=proj(L,ring[i],ring[i+1]);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)}ctx.closePath();ctx.fill();ctx.stroke()}}}
 else{ctx.fillStyle='#9fc';ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.fillText('טוען מפה…',L.area.x+L.area.w/2,L.area.y+L.area.h/2)}
 // front labels
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(var lb of TH.labels){var p=proj(L,lb[2],lb[1]),f=lb[3]&&TH.fronts[lb[3]];ctx.font='800 '+(lb[3]==='lebanon'?11:14)+'px system-ui';ctx.fillStyle=f&&!f.open?'rgba(255,190,180,.75)':'rgba(220,255,245,.85)';ctx.fillText(lb[0]+(f&&!f.open?' 🔒':''),p.x,p.y)}
 // play area
 var r=playRect(L);ctx.strokeStyle=(Date.now()/400|0)%2?'#ffe066':'#fff6c8';ctx.lineWidth=2;ctx.strokeRect(r.x-2,r.y-2,r.w+4,r.h+4);
 // cities
 for(var ct of cities(s)){var q=proj(L,ct.lon,ct.lat),col=TH.holders[ct.h].c,rad=ct.cap?4.5:3.2;ctx.fillStyle=col;ctx.strokeStyle='#071820';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(q.x,q.y,rad,0,7);ctx.fill();ctx.stroke();
  if(ct.front==='lebanon'&&ct.site)continue; // named inside the inset; the big map is too small there
  ctx.font=(ct.cap?'800 11px':'600 10px')+' system-ui';ctx.fillStyle='#f1f7f5';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.fillText(ct.n+(ct.locked?' 🔒':''),q.x,q.y-10);ctx.shadowBlur=0}
 ctx.restore();
 // inset: the Lebanon front itself
 var I=L.inset;ctx.fillStyle='rgba(6,16,22,.95)';ctx.fillRect(I.x-4,I.y-18,I.w+8,I.h+22);if(opts.tile)ctx.drawImage(opts.tile,0,0,opts.tile.width,opts.tile.height,I.x,I.y,I.w,I.h);
 var ix=x=>I.x+x/M.cols*I.w,iy=y=>I.y+y/M.rows*I.h;
 if(s&&s.sites)for(var z of s.sites){var big=z.t==='city'||z.t==='main';ctx.fillStyle=z.owner==='il'?'#65e5d0':z.t==='main'?'#ff5655':'#f3ab63';ctx.fillRect(ix(z.x)-(big?2.5:1.5),iy(z.y)-(big?2.5:1.5),big?5:3,big?5:3);
  if(big){ctx.font='700 10px system-ui';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=3;ctx.fillText(z.n,ix(z.x),iy(z.y)-9);ctx.shadowBlur=0}}
 if(s&&s.units)for(var u of s.units)if(u.side==='il'&&u.hp>0&&!u.carriedBy&&!D.UNITS[u.type].building){ctx.fillStyle='#86ffff';ctx.fillRect(ix(u.x)-1,iy(u.y)-1,2.5,2.5)}
 if(s&&s.intel&&s.intel.state==='hiding'){ctx.strokeStyle='#ffd23f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ix(s.intel.x),iy(s.intel.y),6,0,7);ctx.stroke()}
 if(opts.view){var v=opts.view;ctx.strokeStyle='#f6efbf';ctx.lineWidth=1;ctx.strokeRect(ix(v.x0),iy(v.y0),(v.x1-v.x0)/M.cols*I.w,(v.y1-v.y0)/M.rows*I.h)}
 ctx.strokeStyle='#ffe066';ctx.lineWidth=1.5;ctx.strokeRect(I.x,I.y,I.w,I.h);ctx.font='800 11px system-ui';ctx.fillStyle='#ffe066';ctx.fillText('חזית לבנון · טאפ = קפיצה לשם',I.x+I.w/2,I.y-9);
 // legend
 var lx=L.area.x+10,ly=H-14;ctx.textAlign='right';ctx.font='600 10px system-ui';var items=['il','hz','syria','iraq','iran'],xx=L.area.x+L.area.w-6;
 for(var k of items){var hd=TH.holders[k];ctx.fillStyle=hd.c;ctx.beginPath();ctx.arc(xx-4,ly,4,0,7);ctx.fill();ctx.fillStyle='#dfeee9';ctx.fillText(hd.n,xx-12,ly+.5);xx-=ctx.measureText(hd.n).width+28}
}
var api={layout,proj,unproj,playRect,cities,holder,hit,lockedAt,draw};
root.LF=root.LF||{};root.LF.theater=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
