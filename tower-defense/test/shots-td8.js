// TD v8 screenshots + console check at iPhone landscape 844×390 (touch). node test/shots-td8.js <outDir> <scene...>
const pw=require('/home/user/node_modules/playwright-core');const http=require('http'),fs=require('fs'),path=require('path');
const SITE=path.join(process.cwd(),'site');const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const srv=http.createServer((q,res)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const fp=path.join(SITE,f);if(!fs.existsSync(fp)){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':TYPES[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(res)});
const SCENES={
 async radar(p){await p.evaluate(()=>{const S=GAME.S;S.budget=20000;for(let w=1;w<=5;w++){GAME.startWave();S.queue=[];S.threats=[];GAME.step(.1)}
   for(const [t,lo,la] of [['dome',34.82,32.05],['sling',34.95,32.3],['arrow',35.0,31.6],['dome',34.82,31.3]])GAME.placeTower(t,lo,la);
   GAME.v6.placeRadar(46.7,24.7);GAME.v6.placeRadar(42.6,33.55);GAME.v6.closeV6();
   GAME.placeTower('dome',46.95,24.95);GAME.placeTower('sling',46.4,24.4);GAME.placeTower('arrow',42.9,33.2);GAME.placeTower('dome',42.3,33.8);
   S.budget=5000;GAME.selectType('dome');GAME.camTo('theater',true);for(const id of ['hint','ecoPanel','offer','banner','upPanel'])document.getElementById(id)&&document.getElementById(id).classList.add('hidden')});
   await p.waitForTimeout(500);
   await p.evaluate(()=>{GAME.selectType('dome');const w=GAME.P(46.9,24.4);GAME.setGhost(w)});await p.waitForTimeout(700);return 'td8-radar.png'},

 async salvo(p){await p.evaluate(()=>{const S=GAME.S;S.budget=20000;for(const [t,lo,la] of [['dome',34.82,32.05],['dome',35.0,32.75],['dome',35.18,31.78],['beam',34.85,32.15],['dome',34.82,31.3],['sling',34.95,32.3],['arrow',35.0,31.6],['dome',34.95,29.62]])GAME.placeTower(t,lo,la);
   for(let w=1;w<=4;w++){GAME.startWave();S.queue=[];S.threats=[];GAME.step(.1)}let k=0;do{S.salvoLast='syria';GAME.startWave();if(!S.salvo||S.salvo.key!=='gaza'){S.queue=[];S.threats=[];GAME.step(.1);S.salvo=null}}while(!S.salvo&&k++<60);
   S.queue=S.queue.filter(e=>e.salvo||e.t>S.salvo.t0+6);GAME.camTo('israel',true);GAME.step(S.salvo.t0+1.6);for(const id of ['hint','ecoPanel','offer'])document.getElementById(id)&&document.getElementById(id).classList.add('hidden');
   const b=document.getElementById('banner');b.textContent='🚀 מטח פתע מעזה!';b.classList.remove('hidden');b.style.animation='none';b.style.opacity='1'});await p.waitForTimeout(250);return 'td8-salvo.png'},
 async saar(p){await p.evaluate(()=>{const S=GAME.S;S.budget=20000;for(const [t,lo,la] of [['dome',34.82,32.05],['dome',35.0,32.75],['beam',34.85,32.15],['sling',34.95,32.3],['arrow',35.0,31.6],['dome',34.95,29.62]])GAME.placeTower(t,lo,la);
   for(let w=1;w<=5;w++){GAME.startWave();S.queue=[];S.threats=[];GAME.step(.1)}GAME.placeTower('saar',34.25,32.25);GAME.placeTower('saar',34.93,29.35);GAME.camTo('israel',true);GAME.startWave();S.queue=S.queue.filter(e=>e.type==='cruise'||e.type==='uav'||e.type==='drone'||e.type==='rocket');GAME.step(48);
   for(const id of ['hint','ecoPanel','offer','banner'])document.getElementById(id)&&document.getElementById(id).classList.add('hidden');GAME.selectType('saar');GAME.setGhost(GAME.P(34.2,31.9));for(const id of ['hint'])document.getElementById(id).classList.add('hidden')});await p.waitForTimeout(300);return 'td8-saar.png'},
 async stock(p){await p.evaluate(()=>{const S=GAME.S;S.budget=20000;for(const [t,lo,la] of [['dome',34.82,32.05],['dome',35.0,32.75],['dome',35.18,31.78],['beam',34.85,32.15],['dome',34.82,31.3],['sling',34.95,32.3],['arrow',35.0,31.6],['dome',34.95,29.62],['sling',35.1,31.4]])GAME.placeTower(t,lo,la);
   for(let w=1;w<=8;w++){GAME.startWave();S.queue=[];S.threats=[];GAME.step(.1)}GAME.v8.factoryUpgrade();GAME.camTo('israel',true);GAME.startWave();GAME.step(30);S.stock.sling=12;S.stock.dome=143;
   for(const id of ['hint','ecoPanel','offer','banner'])document.getElementById(id)&&document.getElementById(id).classList.add('hidden');document.getElementById('btnStock').click()});await p.waitForTimeout(400);return 'td8-stock.png'},
 async airlift(p){await p.evaluate(()=>{const S=GAME.S;S.budget=20000;for(const [t,lo,la] of [['dome',34.82,32.05],['dome',35.0,32.75],['beam',34.85,32.15],['sling',34.95,32.3],['arrow',35.0,31.6],['dome',34.95,29.62]])GAME.placeTower(t,lo,la);
   for(let w=1;w<=9;w++){GAME.startWave();S.queue=[];S.threats=[];GAME.step(.1)}GAME.camTo('israel',true);GAME.startWave();GAME.step(20);GAME.v8.airlift();GAME.step(3.5);for(const id of ['ecoPanel','offer'])document.getElementById(id)&&document.getElementById(id).classList.add('hidden')});await p.waitForTimeout(150);return 'td8-airlift.png'},
};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port+'/';const b=await pw.chromium.launch({headless:true});const OUT=process.argv[2]||'/tmp/td8';fs.mkdirSync(OUT,{recursive:true});
 for(const sc of process.argv.slice(3)){const ctx=await b.newContext({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
  await p.goto(base+'?t='+Date.now());await p.waitForTimeout(500);await p.tap('#btnStart');await p.waitForTimeout(900);
  const f=await SCENES[sc](p);await p.screenshot({path:OUT+'/'+f});console.log(sc,'→',f,'errors:',JSON.stringify(errs));await ctx.close()}
 await b.close();srv.close()})().catch(e=>{console.error(e);process.exit(1)});
