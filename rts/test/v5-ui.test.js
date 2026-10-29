// v5 browser checks (real Chrome, iPhone landscape 844×390, touch): control groups (long press / tap / double tap),
// coordinated attack bar (queue → ✓ בצע / ✖ בטל), minimap tap, TD upgrade panel, no console errors. Skips when no browser is installed.
const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');const http=require('http');
const SITE=path.join(__dirname,'..','site');let pw=null;for(const p of ['/home/user/node_modules/playwright-core','playwright-core','playwright']){try{pw=require(p);break}catch(e){}}
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
function serve(){return new Promise(r=>{const srv=http.createServer((q,res)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const fp=path.join(SITE,f);if(!fp.startsWith(SITE)||!fs.existsSync(fp)){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':TYPES[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(res)});srv.listen(0,'127.0.0.1',()=>r(srv))})}
const skip=(!pw&&'no browser installed')||(!fs.existsSync(path.join(SITE,'rts','index.html'))&&'needs the built site layout (site/ with rts/ inside)');
let srv,browser,base;
test.before(async()=>{if(skip)return;srv=await serve();base='http://127.0.0.1:'+srv.address().port+'/';browser=await pw.chromium.launch({headless:true})});
test.after(async()=>{if(browser)await browser.close();if(srv)srv.close()});
async function page(url){const ctx=await browser.newContext({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});const p=await ctx.newPage();const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));await p.goto(base+url);await p.waitForTimeout(300);return {p,errs,ctx}}
async function press(p,sel,ms){const b=await p.locator(sel).boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.waitForTimeout(ms);await p.mouse.up();await p.waitForTimeout(60)}

test('RTS: long press stores group 2, tap selects it, double tap also centres the camera; badge on units',{skip},async()=>{const {p,errs,ctx}=await page('rts/');
 await p.evaluate(()=>{LEBANON.start(false)});await p.waitForTimeout(200);
 const ids=await p.evaluate(()=>{const s=LEBANON.state;const ids=s.units.filter(u=>u.side==='il'&&['golani','merkava'].includes(u.type)).map(u=>u.id);LEBANON.selectIds(ids);return ids});
 await press(p,'#cg2',750);assert.match(await p.textContent('#toast'),/קבוצה 2 נשמרה/);assert.deepStrictEqual(await p.evaluate(()=>LEBANON.state.units.filter(u=>u.cg===2).map(u=>u.id).sort()),ids.slice().sort());
 await p.evaluate(()=>LEBANON.selectIds([]));await press(p,'#cg2',60);assert.deepStrictEqual((await p.evaluate(()=>LEBANON.selected)).sort(),ids.slice().sort(),'tap selects the group');
 await p.evaluate(()=>{const s=LEBANON.state,r=LEBANON.renderer;r.camera(20,40)});const before=await p.evaluate(()=>({x:LEBANON.renderer.view.x,y:LEBANON.renderer.view.y}));
 await press(p,'#cg2',50);await p.waitForTimeout(80);await press(p,'#cg2',50);const after=await p.evaluate(()=>({x:LEBANON.renderer.view.x,y:LEBANON.renderer.view.y}));
 const c=await p.evaluate(ids=>{const us=ids.map(id=>LEBANON.state.units.find(u=>u.id===id));return {x:us.reduce((a,u)=>a+u.x,0)/us.length,y:us.reduce((a,u)=>a+u.y,0)/us.length}},ids);
 assert.ok(Math.hypot(after.x-c.x,after.y-c.y)<Math.hypot(before.x-c.x,before.y-c.y)-5,'camera moved to the group');assert.deepStrictEqual(errs,[]);await ctx.close()});

test('RTS: ⚔ coordinated attack: banner, map taps are queued (dashed), ✓ בצע runs all at once, ✖ בטל drops them',{skip},async()=>{const {p,errs,ctx}=await page('rts/');
 await p.evaluate(()=>{LEBANON.start(false)});await p.waitForTimeout(200);
 const id=await p.evaluate(()=>{const u=LEBANON.state.units.find(u=>u.side==='il'&&u.type==='golani');LEBANON.select(u.id);return u.id});
 await p.click('#coordBtn');assert.ok(await p.isVisible('#coordBar'));assert.match(await p.textContent('#coordInfo'),/תיאום התקפה/);
 const pt=await p.evaluate(id=>{const u=LEBANON.state.units.find(v=>v.id===id),q=LEBANON.renderer.screen(u.x-2,u.y-3);return q},id);
 await p.mouse.click(pt.x,pt.y);await p.waitForTimeout(80);let st=await p.evaluate(id=>{const s=LEBANON.state,u=s.units.find(v=>v.id===id);return {n:s.coord&&s.coord.orders.length,goal:!!u.goal}},id);
 assert.strictEqual(st.n,1,'queued');assert.strictEqual(st.goal,false,'not executed');assert.match(await p.textContent('#coordInfo'),/1 פקודות ממתינות/);
 await p.click('#coordGo');st=await p.evaluate(id=>{const s=LEBANON.state,u=s.units.find(v=>v.id===id);return {coord:!!s.coord,goal:!!u.goal}},id);assert.deepStrictEqual(st,{coord:false,goal:true});assert.ok(!(await p.isVisible('#coordBar')));
 await p.evaluate(id=>{const u=LEBANON.state.units.find(v=>v.id===id);u.goal=null;LEBANON.select(id)},id);await p.click('#coordBtn');await p.mouse.click(pt.x+30,pt.y);await p.click('#coordCancel');
 st=await p.evaluate(id=>{const s=LEBANON.state,u=s.units.find(v=>v.id===id);return {coord:!!s.coord,goal:!!u.goal}},id);assert.deepStrictEqual(st,{coord:false,goal:false},'cancelled');assert.deepStrictEqual(errs,[]);await ctx.close()});

test('RTS: tapping the minimap jumps the camera',{skip},async()=>{const {p,errs,ctx}=await page('rts/');await p.evaluate(()=>{LEBANON.start(false)});await p.waitForTimeout(200);
 const v0=await p.evaluate(()=>LEBANON.renderer.view.y);const box=await p.evaluate(()=>{const v=LEBANON.renderer.view;return {x:8+(v.il||0)+47,y:v.h-126-8-(v.ib||0)+10}});await p.mouse.click(box.x,box.y);await p.waitForTimeout(60);
 const v1=await p.evaluate(()=>LEBANON.renderer.view.y);assert.ok(v1<v0-30,'jumped north: '+v0+' → '+v1);assert.deepStrictEqual(errs,[]);await ctx.close()});

test('TD: tapping your battery opens the upgrade panel; the buttons upgrade and show stars',{skip},async()=>{const {p,errs,ctx}=await page('');
 await p.evaluate(()=>{const G=GAME;G.newGame('normal');G.camTo('israel',true);G.S.budget=3000;G.placeTower('dome',34.82,32.05)});await p.waitForTimeout(400);
 const q=await p.evaluate(()=>{const t=GAME.S.towers[0];return GAME.w2s(t.x,t.y)});await p.mouse.click(q.x,q.y);await p.waitForTimeout(150);
 assert.ok(await p.isVisible('#upPanel'),'panel open');assert.ok(await p.evaluate(()=>GAME.S.paused),'paused while upgrading');
 await p.click('#upPanel [data-up="range"]');await p.click('#upPanel [data-up="mag"]');assert.deepStrictEqual(await p.evaluate(()=>GAME.S.towers[0].up),{range:1,rate:0,hit:0,mag:1});
 assert.match(await p.textContent('#upPanel'),/★★/);await p.click('#upPanel [data-upx]');assert.ok(!(await p.isVisible('#upPanel')));assert.deepStrictEqual(errs,[]);await ctx.close()});
