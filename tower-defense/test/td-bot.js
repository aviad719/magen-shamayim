// TD scripted balance run (v6). node test/td-bot.js <siteDir> <diff> <seeds...> [--v6]
const fs=require('fs'),path=require('path'),vm=require('vm');
function stub(){const store={};const f=function(){return p};const p=new Proxy(f,{get(t,k){if(k in store)return store[k];if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;if(k==='children')return [];if(k==='offsetParent')return null;return p},set(t,k,v){store[k]=v;return true}});return p}
function memStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),_m:m}}
function boot(dir){const els={};const win={innerWidth:844,innerHeight:390,devicePixelRatio:1,addEventListener(){},Math,console,JSON,Map,Set,Array,Object,Number,String,Date,Infinity,NaN,parseInt,parseFloat,isFinite};
 win.window=win;win.localStorage=memStorage();win.document={getElementById:id=>els[id]||(els[id]=stub()),querySelectorAll:()=>[],createElement:()=>stub(),addEventListener(){},hidden:false};
 win.Path2D=function(){return stub()};win.Image=function(){return stub()};win.performance={now:()=>0};win.requestAnimationFrame=()=>0;win.setTimeout=()=>0;win.clearTimeout=()=>{};
 const ctx=vm.createContext(win);for(const f of ['geo.js','shared.js','game.js'])vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx);return win.GAME}
const seedR=s=>{let x=s;Math.random=()=>{x=(x*16807)%2147483647;return x/2147483647}};
const SLOTS=[['dome',34.82,32.05],['dome',35.0,32.75],['dome',35.18,31.78],['beam',34.85,32.15],['dome',34.82,31.3],['sling',34.95,32.3],['arrow',35.0,31.6],
 ['dome',34.95,29.62],['beam',35.05,32.82],['sling',35.1,31.4],['arrow',34.9,32.6],['dome',34.98,32.47],['beam',35.22,31.72],['sling',34.85,31.9],['arrow',35.2,31.0],
 ['dome',34.75,31.9],['beam',34.9,31.25],['sling',35.15,32.6],['dome',35.1,32.95],['arrow',34.85,30.8],
 // v7: 20 waves — a reasonable player keeps building past 20 batteries
 ['sling',34.8,32.25],['dome',35.05,31.75],['arrow',35.05,32.35],['beam',35.0,32.6],['sling',34.9,31.15],['dome',34.95,32.9],['arrow',34.95,31.85],['beam',34.8,31.95]];
function play(dir,diff,seed,v6,tune){seedR(seed);const G=boot(dir);if(tune&&G.v6)G.v6.tune(tune);G.newGame(diff);let slot=0,money=0,iaf=0,spentShots=0;const log=[];
 for(let w=1;w<=G.WAVES.length;w++){
  if(v6&&G.v6){ // use the new features the way a reasonable player would
    const F=process.env.FEAT||'rsi';
    if(F.includes('r')&&w>=4&&G.S.radars.length<1&&G.S.budget>=600)G.v6.placeRadar(34.95,31.95);
    if(F.includes('R')&&w===6&&G.S.radars.length<2&&G.S.budget>=600)G.v6.placeRadar(35.1,32.75);
    if(F.includes('s')&&w===3){const ta=G.S.cities.find(c=>c.n==='תל אביב');if(ta&&!ta.dead&&!ta.shelter&&G.S.budget>=300)G.v6.buildShelter(ta)}
    for(const r of G.S.radars)if(r.dead&&G.S.budget>=300)G.v6.repairRadar(r);
    if(F.includes('i')&&w===7&&G.S.budget>=800&&G.v6.canStrike()){const r=G.v6.strike('launchers');if(r)iaf++}}
  const keep=v6&&(process.env.FEAT||'rsi').includes('i')&&w===6?800:0;
  let guard=0;while(slot<SLOTS.length&&G.S.budget-keep>=G.TW[SLOTS[slot][0]].cost&&guard++<30){const [t,lo,la]=SLOTS[slot];if(G.placeTower(t,lo,la))slot++;else slot++}
  // leftover → upgrades round-robin
  const mine=G.S.towers.filter(t=>!t.owner);let k=0;guard=0;while(guard++<60){const tw=mine[k%mine.length];const tr=['rate','hit','range','mag'][(k/mine.length|0)%4];k++;if(!tw)break;const c=G.upCost(tw,tr);if(c&&G.S.budget>=c+150+keep)G.upgrade(tw,tr);if(k>mine.length*4)break}
  let pre=G.S.budget;G.startWave();let n=0;while(G.S.inWave&&!G.S.over&&n<60*400){const a=G.S.budget;G.update(1/60);n++;const d=G.S.budget-a;if(d>0)money+=d;else spentShots-=d}
  if(process.env.DBG)console.log(w,G.S.cities.map(c=>c.n+':'+c.hp+(c.shelter?'S':'')).join(' '),'| towers',G.S.towers.filter(t=>!t.owner).map(t=>t.type[0]).join(''),'| ₪',Math.floor(G.S.budget));
  log.push(w+':'+G.S.cities.filter(c=>!c.dead).length+'c/'+G.S.stats.leaks+'L/₪'+Math.floor(G.S.budget));
  if(G.S.over)break}
 return {won:!!G.S.won,cities:G.S.cities.filter(c=>!c.dead).length,of:G.S.cities.length,leaks:G.S.stats.leaks,rl:G.S.stats.radarsLost||0,kills:G.S.stats.kills,towers:G.S.towers.filter(t=>!t.owner).length,iaf,earned:Math.round(money),shotsCost:Math.round(spentShots),log:log.join(' ')}}
if(require.main===module){const a=process.argv.slice(2);const v6=a.includes('--v6');const args=a.filter(x=>x!=='--v6');const dir=args[0],diff=args[1]||'normal',seeds=(args.slice(2).length?args.slice(2):['1','2','3']).map(Number);
 for(const s of seeds){const r=play(dir,diff,s,v6,process.env.TUNE?JSON.parse(process.env.TUNE):null);console.log(diff,'seed',s,JSON.stringify(r))}}
module.exports={play};
