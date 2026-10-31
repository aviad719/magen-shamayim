// v6 TD browser checks (real Chrome, iPhone landscape 844×390, touch): radar button → place → tap shows the ring card, city tap → shelter,
// ✈ strike button between waves → target picker → strike, end-of-wave income panel, new threats render; no console errors. Skips without a browser.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const http=require('http');
const SITE=path.join(__dirname,'..','site');let pw=null;for(const p of ['/home/user/node_modules/playwright-core','playwright-core','playwright']){try{pw=require(p);break}catch(e){}}
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
function serve(){return new Promise(r=>{const srv=http.createServer((q,res)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const fp=path.join(SITE,f);if(!fp.startsWith(SITE)||!fs.existsSync(fp)){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':TYPES[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(res)});srv.listen(0,'127.0.0.1',()=>r(srv))})}
const skip=!pw&&'no browser installed';let srv,browser,base;
test.before(async()=>{if(skip)return;srv=await serve();base='http://127.0.0.1:'+srv.address().port+'/';browser=await pw.chromium.launch({headless:true})});
test.after(async()=>{if(browser)await browser.close();if(srv)srv.close()});
async function page(){const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));await p.goto(base);await p.waitForTimeout(300);return {p,errs,ctx}}
const scr=(p,lon,lat)=>p.evaluate(([lo,la])=>{const q=GAME.P(lo,la);return GAME.w2s(q.x,q.y)},[lon,lat]);

test('TD v6: radar button → tap Israel places it → tap radar shows its card; tap a city → shelter; strike picker between waves; income panel',{skip},async()=>{const {p,errs,ctx}=await page();
 await p.tap('#btnStart');await p.waitForTimeout(1200);await p.evaluate(()=>{GAME.S.budget=5000});
 await p.tap('.tw[data-t="radar"]');let q=await scr(p,34.95,31.5);await p.touchscreen.tap(q.x,q.y);await p.waitForTimeout(150);
 assert.strictEqual(await p.evaluate(()=>GAME.S.radars.length),1,'placed');q=await scr(p,34.95,31.5);await p.touchscreen.tap(q.x,q.y);await p.waitForTimeout(450);
 assert.ok(await p.isVisible('#v6Panel'));assert.match(await p.textContent('#v6Panel'),/\+20% טווח/);await p.tap('#v6Panel [data-v6x]');assert.ok(!(await p.isVisible('#v6Panel')));
 q=await scr(p,35.21,31.77);await p.touchscreen.tap(q.x,q.y);await p.waitForTimeout(450);assert.ok(!(await p.evaluate(()=>GAME.S.cities.find(c=>c.n==='ירושלים').shelter)),'the opening tap does not press the button');assert.match(await p.textContent('#v6Panel'),/מרחבים מוגנים/);await p.tap('#v6Panel [data-v6="shelter"]');
 assert.ok(await p.evaluate(()=>GAME.S.cities.find(c=>c.n==='ירושלים').shelter));await p.tap('#v6Panel [data-v6x]');
 assert.ok(!(await p.isVisible('#btnIaf')),'no strike before wave 1');
 await p.evaluate(()=>{GAME.startWave();GAME.S.queue=[];GAME.S.threats=[]});await p.waitForTimeout(300);
 assert.ok(await p.isVisible('#ecoPanel'),'income summary');assert.match(await p.textContent('#ecoPanel'),/תל אביב/);assert.match(await p.textContent('#ecoPanel'),/סה״כ/);
 assert.ok(await p.isVisible('#btnIaf'));await p.tap('#btnIaf');await p.waitForTimeout(450);assert.ok(await p.isVisible('#v6Panel'));assert.strictEqual(await p.locator('#v6Panel .v6t').count(),4);
 await p.tap('#v6Panel [data-v6="strike:factory"]');await p.waitForTimeout(3500);assert.strictEqual(await p.evaluate(()=>GAME.S.iaf.last),1);assert.match(await p.textContent('#hint'),/התקיפה הצליחה/);
 assert.match(await p.textContent('#btnIaf'),/בוצעה/);
 // new threats render in flight without errors
 await p.evaluate(()=>{const S=GAME.S;S.wave=5;GAME.startWave();S.queue=[];const L=S.launchers;const ir=L.findIndex(l=>l.cc==='IR'&&l.kind==='B'),d=L.findIndex(l=>l.kind==='D');
   for(const e of [{t:0,type:'hyper',li:ir},{t:0,type:'mirv',li:ir}])GAME.v6.spawn(e);for(let i=0;i<14;i++)GAME.v6.spawn({t:0,type:'swarm',li:d,sw:0})});await p.waitForTimeout(1500);
 assert.deepStrictEqual(errs,[]);await ctx.close()});
