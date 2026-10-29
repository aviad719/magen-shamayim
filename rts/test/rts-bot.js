// Scripted player ("bot") for LEBANON FRONT: buys a balanced force, masses it, and takes sites nearest to the army first.
// Uses only the public simulation API, the same calls the phone UI makes.
function makeBot(Sim,s,opts){opts=opts||{};var D=Sim.D,U=D.UNITS,t=0,log=[],buyI=0,attacking=false;
 function army(){return Sim.alive(s,'il').filter(u=>!U[u.type].building&&U[u.type].move!=='air'&&!u.flight)}
 function centroid(a){var x=0,y=0;a.forEach(u=>{x+=u.x;y+=u.y});return a.length?{x:x/a.length,y:y/a.length}:(Sim.get(s,s.hq)||{x:30,y:115})}
 return {log,tick:function(dt){t+=dt;if(t<2)return;t=0;
  var order=['golani','merkava','golani','golani','namer','givati','merkava','uav_attack','golani','engineer','uav_recon','para'];
  for(var k=0;k<3;k++){var ty=order[buyI%order.length];if(s.money>=U[ty].cost){if(Sim.buy(s,ty))buyI++}else break}
  var force=army();if(!force.length)return;var c=centroid(force);
  var z=s.sites.filter(q=>q.owner==='hz').sort((a,b)=>Sim.dist(a,c)-Sim.dist(b,c))[0];if(!z)return;var b=Sim.get(s,z.building);
  var need=opts.mass||(z.t==='main'?16:z.t==='city'?12:8);
  if(!attacking&&force.length>=need)attacking=true;if(attacking&&force.length<Math.max(3,need/3))attacking=false;
  if(attacking)Sim.setOrder(s,force.filter(u=>!u.goal||Sim.dist(u.goal,z)>6).map(u=>u.id),{x:z.x,y:z.y},b?b.id:0);
  else{var hq=Sim.forwardBase(s)||c;var rally={x:hq.x+(z.x-hq.x)*.15,y:hq.y+(z.y-hq.y)*.15-3};Sim.setOrder(s,force.filter(u=>!u.goal&&Sim.dist(u,rally)>5).map(u=>u.id),rally)}
  for(var a of Sim.alive(s,'il').filter(u=>U[u.type].move==='air'&&!u.goal&&!u.flight))Sim.setOrder(s,[a.id],{x:z.x,y:z.y},b?b.id:0);
 }}}
if(typeof module!=='undefined')module.exports=makeBot;
