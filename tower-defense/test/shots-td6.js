// TD v6 screenshots at iPhone landscape 844×390. node test/shots-td6.js <outDir>
const pw=require('/home/user/node_modules/playwright-core');const http=require('http'),fs=require('fs'),path=require('path');
const SITE=path.join(process.cwd(),'site');const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,res)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const fp=path.join(SITE,f);if(!fs.existsSync(fp)){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':TYPES[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(res)});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port+'/';const b=await pw.chromium.launch({headless:true});const OUT=process.argv[2]||'/tmp/td6';fs.mkdirSync(OUT,{recursive:true});
const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto(base);await p.waitForTimeout(500);await p.screenshot({path:OUT+'/intro.png'});
await p.tap('#btnStart');await p.waitForTimeout(1300);
// a developed defence
await p.evaluate(()=>{const S=GAME.S;S.budget=20000;for(const [t,lo,la] of [['dome',34.82,32.05],['dome',35.0,32.75],['dome',35.18,31.78],['beam',34.85,32.15],['dome',34.82,31.3],['sling',34.95,32.3],['arrow',35.0,31.6],['dome',34.95,29.62],['beam',35.05,32.82],['arrow',34.9,32.6],['sling',35.1,31.4],['beam',35.22,31.72]])GAME.placeTower(t,lo,la);
  for(let w=1;w<=4;w++){GAME.startWave();S.queue=[];S.threats=[];GAME.step(.1)}if(GAME.coalition.offer())GAME.coalition.decline();S.budget=3000;document.getElementById('ecoPanel').classList.add('hidden');document.getElementById('hint').classList.add('hidden')});
// 1 threats: wave 6 with swarm, hypersonic, MIRV splitting
await p.evaluate(()=>{const S=GAME.S;GAME.v6.placeRadar(35.05,31.7);S.wave=5;GAME.startWave();S.queue=[];S.threats=[];const L=S.launchers;const kerm=L.findIndex(l=>l.n==='כרמאנשאה'),isf=L.findIndex(l=>l.n==='ח׳וראמאבאד'),d=L.findIndex(l=>l.n==='אילאם');
  const mk=e=>GAME.v6.spawn(Object.assign({t:0},e));for(let i=0;i<16;i++)mk({type:'swarm',li:d,sw:0});mk({type:'hyper',li:kerm});mk({type:'mirv',li:isf});mk({type:'mirv',li:kerm});mk({type:'ballistic',li:kerm});mk({type:'ballistic',li:isf});
  for(const t of S.threats){if(t.type==='swarm')t.s=t.len*.6;if(t.type==='hyper')t.s=t.len*.5;if(t.type==='mirv')t.s=t.len*.35;if(t.type==='ballistic')t.s=t.len*.45}
  S.threats.filter(t=>t.type==='mirv')[0].s=S.threats.filter(t=>t.type==='mirv')[0].len*.58;GAME.camTo('theater',true);GAME.v6.camAt(40.3,32.4,.62);for(const id of ['banner','hint'])document.getElementById(id).classList.add('hidden')});
await p.waitForTimeout(700);await p.evaluate(()=>{GAME.S.paused=true});await p.waitForTimeout(200);await p.screenshot({path:OUT+'/td6-threats.png'});
// 2 air strike picker (between waves)
await p.evaluate(()=>{const S=GAME.S;S.paused=false;S.queue=[];S.threats=[];S.shots=[];GAME.step(.2);document.getElementById('ecoPanel').classList.add('hidden');if(GAME.coalition.offer())GAME.coalition.decline();S.budget=2400});
await p.waitForTimeout(300);await p.tap('#btnIaf');await p.waitForTimeout(900);await p.screenshot({path:OUT+'/td6-airstrike.png'});
await p.tap('#v6Panel [data-v6="strike:launchers"]');await p.waitForTimeout(1500);await p.screenshot({path:OUT+'/td6-airstrike-raid.png'});await p.waitForTimeout(2200);await p.screenshot({path:OUT+'/td6-airstrike-result.png'});
// 3 radar: two radars, one selected (ring + card), one destroyed
await p.evaluate(()=>{const S=GAME.S;S.budget=3000;GAME.v6.placeRadar(35.15,32.85);GAME.hitTarget(S.radars[1]);GAME.camTo('israel',true);GAME.v6.camAt(35.0,32.0,1.1)});
await p.waitForTimeout(2600);await p.evaluate(()=>{for(const id of ['banner','hint'])document.getElementById(id).classList.add('hidden')});{const q=await p.evaluate(()=>{const r=GAME.S.radars[0];return GAME.w2s(r.x,r.y)});await p.touchscreen.tap(q.x,q.y)}await p.waitForTimeout(800);await p.screenshot({path:OUT+'/td6-radar.png'});
await p.evaluate(()=>{GAME.v6.closeV6();GAME.closeUp()});
// 4 economy: hits + a shelter, then end a wave → summary; city card open
await p.evaluate(()=>{const S=GAME.S;const c=n=>S.cities.find(x=>x.n===n);S.budget=2000;GAME.v6.buildShelter(c('תל אביב'));GAME.startWave();S.queue=[];S.threats=[];GAME.hitTarget(c('חיפה'));GAME.hitTarget(c('חיפה'));GAME.hitTarget(c('תל אביב'));GAME.hitTarget(c('באר שבע'));GAME.step(.2);if(GAME.coalition.offer())GAME.coalition.decline();document.getElementById('hint').classList.add('hidden')});
await p.waitForTimeout(500);await p.evaluate(()=>{GAME.v6.openV6('city',GAME.S.cities.find(x=>x.n==='חיפה'));for(const id of ['banner','hint'])document.getElementById(id).classList.add('hidden')});await p.waitForTimeout(800);await p.screenshot({path:OUT+'/td6-economy.png'});
await p.evaluate(()=>{GAME.v6.closeV6();GAME.closeUp();document.getElementById('ecoPanel').classList.add('hidden')});
// 5 Saudi Arabia: wave 7 in the Red Sea area with Houthi launches being intercepted
await p.evaluate(()=>{const S=GAME.S;S.wave=6;GAME.startWave();S.queue=[];S.threats=[];const L=S.launchers;const ye=L.map((l,i)=>[l,i]).filter(x=>x[0].cc==='YE');
  for(let k=0;k<10;k++){const [l,i]=ye[k%ye.length];GAME.v6.spawn({t:0,type:l.kind==='B'?'ballistic':l.kind==='C'?'cruise':'uav',li:i})}for(let i=0;i<14;i++)GAME.v6.spawn({t:0,type:'swarm',li:ye.find(x=>x[0].kind==='D')[1],sw:1});
  for(const t of S.threats){t.s=t.len*(t.type==='swarm'?.1:t.type==='ballistic'?.25:.12);t.det=true}GAME.v6.camAt(39.6,22.6,.27);for(const id of ['banner','hint'])document.getElementById(id).classList.add('hidden')});
await p.waitForTimeout(1600);await p.evaluate(()=>{GAME.S.paused=true});await p.waitForTimeout(200);await p.screenshot({path:OUT+'/td6-saudi.png'});
console.log(JSON.stringify(errs));await b.close();srv.close()})();
