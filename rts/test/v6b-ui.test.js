// v6b browser checks (real Chrome, iPhone landscape 844×390, touch): day/night clock + darkening, Sayeret Matkal buy/limit/⚡ פשיטה,
// intel popup + chip, theater map open/close/jump, no console errors. Skips when no browser is installed.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const http=require('http');
const SITE=path.join(__dirname,'..','site');let pw=null;for(const p of ['/home/user/node_modules/playwright-core','playwright-core','playwright']){try{pw=require(p);break}catch(e){}}
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
function serve(){return new Promise(r=>{const srv=http.createServer((q,res)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const fp=path.join(SITE,f);if(!fp.startsWith(SITE)||!fs.existsSync(fp)){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':TYPES[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(res)});srv.listen(0,'127.0.0.1',()=>r(srv))})}
const skip=(!pw&&'no browser installed')||(!fs.existsSync(path.join(SITE,'rts','index.html'))&&'needs the built site layout');
let srv,browser,base;
test.before(async()=>{if(skip)return;srv=await serve();base='http://127.0.0.1:'+srv.address().port+'/';browser=await pw.chromium.launch({headless:true})});
test.after(async()=>{if(browser)await browser.close();if(srv)srv.close()});
async function page(url){const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));await p.goto(base+url);await p.waitForTimeout(300);await p.evaluate(()=>{LEBANON.start(false)});await p.waitForTimeout(250);return {p,errs,ctx}}
const bright=p=>p.evaluate(()=>{const c=document.getElementById('world'),g=c.getContext('2d'),d=g.getImageData(c.width*.25,c.height*.3,c.width*.3,c.height*.4).data;let t=0;for(let i=0;i<d.length;i+=4)t+=d[i]+d[i+1]+d[i+2];return t/(d.length/4)});

test('v6b UI: ☀/🌙 clock in the top bar; the screen darkens at night',{skip},async()=>{const {p,errs,ctx}=await page('rts/');
 await p.waitForTimeout(300);assert.match(await p.textContent('#daynight'),/☀\s*\d+:\d\d/);const day=await bright(p);
 await p.evaluate(()=>{LEBANON.state.time=450});await p.waitForTimeout(500);assert.match(await p.textContent('#daynight'),/🌙\s*\d+:\d\d/);assert.ok(await p.evaluate(()=>document.body.classList.contains('night')));
 const night=await bright(p);assert.ok(night<day*.8,'darker at night: '+day.toFixed(0)+' → '+night.toFixed(0));assert.deepStrictEqual(errs,[]);await ctx.close()});

test('v6b UI: Sayeret Matkal in the infantry tab (×4, n/2), max 2, ⚡ פשיטה context button',{skip},async()=>{const {p,errs,ctx}=await page('rts/');
 await p.evaluate(()=>{LEBANON.state.money=9000});await p.waitForTimeout(300);const btn=p.locator('[data-buy="matkal"]');assert.match(await btn.textContent(),/סיירת מטכ״ל ×4 0\/2/);assert.match(await btn.textContent(),/₪700/);
 await btn.click();await p.waitForTimeout(300);await p.locator('[data-buy="matkal"]').click();await p.waitForTimeout(300);assert.ok(await p.locator('[data-buy="matkal"]').isDisabled(),'third disabled');
 const id=await p.evaluate(()=>{const s=LEBANON.state,h=s.units.find(u=>u.id===s.hq);const u=LEBANON.sim.makeUnit(s,'matkal','il',h.x+2,h.y-3);LEBANON.select(u.id);return u.id});await p.waitForTimeout(300);
 assert.ok(await p.isVisible('#strike'),'⚡ button shown for matkal');assert.ok(await p.isVisible('#drop'),'paradrop offered');await p.click('#strike');await p.waitForTimeout(300);
 assert.strictEqual(await p.evaluate(id=>LEBANON.state.units.find(u=>u.id===id).strikeT>14,id),true);assert.match(await p.textContent('#strike'),/⚡ 1\d/);assert.ok(await p.evaluate(()=>document.getElementById('strike').classList.contains('active')));
 await p.evaluate(()=>{const s=LEBANON.state;LEBANON.select(s.units.find(u=>u.type==='golani'&&u.side==='il').id)});await p.waitForTimeout(300);assert.ok(!(await p.isVisible('#strike')),'not for golani');assert.deepStrictEqual(errs,[]);await ctx.close()});

test('v6b UI: intel popup naming the village, flashing marker, timer chip; tapping the chip moves the camera',{skip},async()=>{const {p,errs,ctx}=await page('rts/');
 await p.evaluate(()=>{LEBANON.sim.intelStart(LEBANON.state,'tebnine')});await p.waitForTimeout(400);
 assert.ok(await p.isVisible('#intelPop'));assert.match(await p.textContent('#intelPop'),/🕵 בכיר חיזבאללה מסתתר בתבנין/);assert.ok(await p.isVisible('#intelChip'));assert.match(await p.textContent('#intelChip'),/[56]:\d\d/);
 await p.click('#intelChip');await p.waitForTimeout(100);const v=await p.evaluate(()=>{const z=LEBANON.state.sites.find(q=>q.key==='tebnine'),w=LEBANON.renderer.view;return Math.hypot(w.x-z.x,w.y-z.y)});assert.ok(v<6,'camera at the village: '+v);assert.deepStrictEqual(errs,[]);await ctx.close()});

test('v6b UI: theater map shows the fronts, pauses the game, ✖ closes; a tap on a locked city says it is locked',{skip},async()=>{const {p,errs,ctx}=await page('rts/');
 await p.evaluate(()=>LEBANON.openTheater());await p.waitForTimeout(800);assert.ok(await p.isVisible('#theater'));assert.ok(await p.evaluate(()=>LEBANON.state.paused),'paused');
 const geo=await p.evaluate(()=>!!window.GEO);assert.ok(geo,'country shapes loaded');
 const pt=await p.evaluate(()=>{const L=LEBANON.theaterLayout,q=LF.theater.proj(L,51.39,35.69);return {x:q.x+(LEBANON.renderer.view.il||0),y:q.y}});await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(100);assert.match(await p.textContent('#toast'),/טהרן.*נעולה/);assert.ok(await p.isVisible('#theater'),'still open');
 await p.click('#thClose');await p.waitForTimeout(100);assert.ok(!(await p.isVisible('#theater')));assert.ok(!(await p.evaluate(()=>LEBANON.state.paused)),'resumed');assert.deepStrictEqual(errs,[]);await ctx.close()});

test('v6b UI: the same notice twice in a row shows once',{skip},async()=>{const {p,errs,ctx}=await page('rts/');const t=await p.evaluate(()=>{LEBANON.toast('בדיקה');const a=LEBANON.lastToast.t;LEBANON.toast('בדיקה');return LEBANON.lastToast.t===a});assert.ok(t);assert.deepStrictEqual(errs,[]);await ctx.close()});
