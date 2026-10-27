// Scripted player ("bot") for LEBANON FRONT: buys a balanced force and takes sites nearest-first.
// Uses only the public simulation API, the same calls the phone UI makes.
function makeBot(Sim,s,opts){opts=opts||{};var D=Sim.D,U=D.UNITS,t=0,log=[];
 function army(){return Sim.alive(s,'il').filter(u=>!U[u.type].building&&U[u.type].move!=='air')}
 function target(){var hq=Sim.get(s,s.hq)||{x:30,y:110};return s.sites.filter(z=>z.owner==='hz').sort((a,b)=>Sim.dist(a,hq)-Sim.dist(b,hq))[0]}
 return {log,tick:function(dt){t+=dt;if(t<2)return;t=0;
  // spend: infantry platoons first, then armour, keep a UAV up
  var order=['golani','merkava','nahal','namer','givati','golani','uav_attack','merkava','engineer','uav_recon'];
  for(var k=0;k<3;k++){var ty=order[(s.time|0)%order.length];if(s.money>U[ty].cost+200)Sim.buy(s,ty)}
  var z=target();if(!z)return;var b=Sim.get(s,z.building),force=army();
  var idle=force.filter(u=>!u.goal);var ready=force.length>=(opts.wave||6);
  if(ready)Sim.setOrder(s,idle.map(u=>u.id),{x:z.x,y:z.y},b?b.id:0);
  for(var a of Sim.alive(s,'il').filter(u=>U[u.type].move==='air'&&!u.goal&&!u.flight))Sim.setOrder(s,[a.id],{x:z.x,y:z.y},b?b.id:0);
 }}}
if(typeof module!=='undefined')module.exports=makeBot;
