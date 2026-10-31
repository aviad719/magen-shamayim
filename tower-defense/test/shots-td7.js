// TD v7 screenshots + browser checks at iPhone landscape 844×390 (touch). node test/shots-td7.js <outDir>
const pw=require('/home/user/node_modules/playwright-core');const http=require('http'),fs=require('fs'),path=require('path');
const SITE=path.join(process.cwd(),'site');const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,res)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const fp=path.join(SITE,f);if(!fs.existsSync(fp)){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':TYPES[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(res)});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port+'/';const b=await pw.chromium.launch({headless:true});const OUT=process.argv[2]||'/tmp/td7';fs.mkdirSync(OUT,{recursive:true});
const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
const hide=()=>p.evaluate(()=>{for(const id of ['hint','ecoPanel'])document.getElementById(id).classList.add('hidden')});
await p.goto(base);await p.waitForTimeout(500);
// save code modal from the intro
await p.tap('#btnCode');await p.waitForTimeout(300);await p.screenshot({path:OUT+'/td7-savecode.png'});const code=await p.$eval('#v7Out',e=>e.value);await p.tap('#v7Close');
await p.tap('#btnStart');await p.waitForTimeout(1200);
// territory by real taps: radar selected, tap Amman / Aqaba (outside) then Israel (inside)
const terr=await p.evaluate(async()=>{const S=GAME.S;S.budget=20000;GAME.selectType('radar');return 1});await p.waitForTimeout(900);
const pts=await p.evaluate(()=>[[35.93,31.95],[35.0,29.5],[34.45,31.5],[34.95,31.95]].map(([lo,la])=>{const w=GAME.P(lo,la);return GAME.w2s(w.x,w.y)}));
const res=[];for(const q of pts){if(q.x<5||q.y<5||q.x>839||q.y>385){res.push('offscreen');continue}await p.touchscreen.tap(q.x,q.y);await p.waitForTimeout(250);res.push(await p.evaluate(()=>GAME.S.radars.length))}
console.log('territory taps (radars after Amman, Aqaba, Gaza, Israel):',JSON.stringify(res));
// a developed defence, wave 12 in flight
await p.evaluate(()=>{const S=GAME.S;GAME.v7.lastWave;document.getElementById('v6Panel')&&document.getElementById('v6Panel').classList.add('hidden');GAME.v6.closeV6&&GAME.v6.closeV6();S.budget=40000;
  for(const [t,lo,la] of [['dome',34.82,32.05],['dome',35.0,32.75],['dome',35.18,31.78],['beam',34.85,32.15],['dome',34.82,31.3],['sling',34.95,32.3],['arrow',35.0,31.6],['dome',34.95,29.62],['beam',35.05,32.82],['arrow',34.9,32.6],['sling',35.1,31.4],['beam',35.22,31.72],['arrow',35.2,31.0],['sling',34.85,31.9]])GAME.placeTower(t,lo,la);
  for(let w=1;w<=11;w++){GAME.startWave();S.queue=[];S.threats=[];GAME.step(.1);if(GAME.coalition.offer())GAME.coalition.decline()}for(const c of S.cities){c.hp=5;c.dead=false}});
await p.evaluate(()=>{GAME.startWave();GAME.step(14);GAME.camTo('theater',true)});await hide();await p.waitForTimeout(900);await p.screenshot({path:OUT+'/td7-waves.png'});
// boss wave 15
await p.evaluate(()=>{const S=GAME.S;S.queue=[];S.threats=[];GAME.step(.1);if(GAME.coalition.offer())GAME.coalition.decline();S.wave=14;for(const c of S.cities){c.hp=5;c.dead=false}GAME.startWave();const t0=Math.min(...S.queue.filter(e=>e.boss).map(e=>e.t));GAME.step(t0+4.5);GAME.camTo('theater',true)});
await p.evaluate(()=>document.getElementById('hint').classList.add('hidden'));await p.waitForTimeout(500);await p.screenshot({path:OUT+'/td7-boss.png'});
// victory after wave 20 with score + table
await p.evaluate(()=>{const S=GAME.S;S.queue=[];S.threats=[];GAME.step(.1);if(GAME.coalition.offer())GAME.coalition.decline();
  const old=[[48210,20,'hard',0],[30550,14,'normal',0],[22100,11,'easy',0],[61200,26,'normal',1]].map(([s,w,d,e],i)=>({s,w,k:Math.round(s/40),c:4,d,e,at:Date.now()-86400000*(i+1),g:'x'+i}));localStorage.setItem(GAME.v7.SCORES_KEY,JSON.stringify(old));
  S.wave=19;S.stats.kills=3412;GAME.startWave();S.queue=[];S.threats=[];GAME.step(.1)});await p.waitForTimeout(1200);await p.screenshot({path:OUT+'/td7-scores.png'});
const vis=await p.evaluate(()=>!document.getElementById('btnEndless').classList.contains('hidden'));await p.tap('#btnEndless');await p.waitForTimeout(300);
const endl=await p.evaluate(()=>({endless:GAME.S.endless,over:GAME.S.over,wave:document.getElementById('wave').textContent,next:document.getElementById('btnNext').textContent}));console.log('endless button',vis,JSON.stringify(endl));
// import the code from the start in a fresh context (another device)
const ctx2=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});const p2=await ctx2.newPage();p2.on('pageerror',e=>errs.push(e.message));p2.on('dialog',d=>d.accept());
await p2.goto(base);await p2.waitForTimeout(400);await p2.tap('#btnCode');await p2.fill('#v7In',code);await p2.tap('#v7Load');await p2.waitForTimeout(1500);console.log('import on device 2:',await p2.evaluate(()=>!!localStorage.getItem('israelFront.shared.v1')||'none'));
// RTS still loads
const p3=await ctx.newPage();p3.on('pageerror',e=>errs.push('rts: '+e.message));p3.on('console',m=>{if(m.type()==='error')errs.push('rts: '+m.text())});await p3.goto(base+'rts/');await p3.waitForTimeout(1500);
console.log('errors:',JSON.stringify(errs));await b.close();srv.close()})().catch(e=>{console.error(e);process.exit(1)});
