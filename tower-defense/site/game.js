(()=>{'use strict';
// ---------- projection (km) ----------
const KX=111.32*Math.cos(30*Math.PI/180), KY=111.2, LON0=35, LAT0=31.5;
const P=(lon,lat)=>({x:(lon-LON0)*KX,y:(LAT0-lat)*KY});
const LB0=P(35.38,33.25); // south Lebanon launch areas (rockets from the RTS link)
const IMG={lon0:22,lon1:66,lat0:45,lat1:8};
const W0=P(IMG.lon0,IMG.lat0), W1=P(IMG.lon1,IMG.lat1);
const rnd=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>v<a?a:v>b?b:v, dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pick=a=>a[(Math.random()*a.length)|0];
function wpick(items){let s=0;for(const i of items)s+=i[1];let r=Math.random()*s;for(const i of items){r-=i[1];if(r<=0)return i[0]}return items[0][0]}

// ---------- canvas ----------
const cv=document.getElementById('cv'), ctx=cv.getContext('2d');
let DPR=1,SW=0,SH=0;
const $=id=>document.getElementById(id);
const mapImg=new Image(); let mapReady=false; mapImg.onload=()=>{mapReady=true;mapDirty=true}; mapImg.src='map.jpg';

// ---------- geo ----------
const countries=(window.GEO||[]).map(c=>{
  const path=new Path2D(); const rings=[];
  for(const r of c.r){const pts=[];for(let i=0;i<r.length;i+=2){const p=P(r[i],r[i+1]);pts.push(p);i===0?path.moveTo(p.x,p.y):path.lineTo(p.x,p.y)}path.closePath();rings.push(pts)}
  return {iso:c.iso,path,rings};
});
const ISR=countries.find(c=>c.iso==='ISR');
function inPoly(pt,pts){let ins=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j];if(((a.y>pt.y)!==(b.y>pt.y))&&(pt.x<(b.x-a.x)*(pt.y-a.y)/(b.y-a.y)+a.x))ins=!ins}return ins}
function segD(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy||1;const t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
const nearIsrael=(p,buf)=>ISR&&ISR.rings.some(r=>r.some((q,i)=>segD(p,q,r[(i+1)%r.length])<buf));
// v7: own territory is strict. Inside Israel's polygon (incl. Judea & Samaria and the Golan); a 3 km coastal tolerance only where the point is in no
// other country (i.e. at sea along the shore); and around a captured Lebanese city (24 km) only inside Lebanon. The old 9 km border buffer let
// batteries and Green Pine radars sit in Jordan, Egypt, Gaza, Syria and Lebanon.
const bboxOf=c=>{let a=1e9,b=1e9,x=-1e9,y=-1e9;for(const r of c.rings)for(const q of r){if(q.x<a)a=q.x;if(q.y<b)b=q.y;if(q.x>x)x=q.x;if(q.y>y)y=q.y}return [a,b,x,y]};
for(const c of countries)c.bb=bboxOf(c);
const inCountry=(c,p)=>!!c&&p.x>=c.bb[0]&&p.x<=c.bb[2]&&p.y>=c.bb[1]&&p.y<=c.bb[3]&&c.rings.some(r=>inPoly(p,r));
const LBN=countries.find(c=>c.iso==='LBN');
const inForeign=(p,except)=>countries.some(c=>c!==ISR&&c!==except&&inCountry(c,p));
const capturedNear=p=>S&&S.cities.some(c=>!CITIES.some(v=>v[0]===c.n)&&!c.dead&&dist(c,p)<24);
const inIsrael=p=>!!ISR&&(inCountry(ISR,p)||(nearIsrael(p,3)&&!inForeign(p))||(capturedNear(p)&&(inCountry(LBN,p)||!inForeign(p,LBN))));
const LABELS=[['ישראל',34.9,30.02,1],['איראן',54,32.6,0],['עיראק',43.4,33.2,0],['סוריה',38.6,35.1,0],['ירדן',36.9,30.9,0],['ערב הסעודית',44,25,0],['טורקיה',35,39.2,0],['מצרים',29.8,27.2,0],['תימן',47,15.9,0],['לבנון',35.9,34.05,2],['הים התיכון',30.8,33.4,3],['הים האדום',38.6,21.4,3],['המפרץ הפרסי',51.2,27.2,3],['הים הכספי',50.8,39.6,3]].map(l=>({t:l[0],...P(l[1],l[2]),k:l[3]}));

// ---------- static data ----------
const CITIES=[['תל אביב',34.78,32.08,.3,-1],['ירושלים',35.21,31.77,.16,1],['חיפה',34.99,32.79,.18,-1],['פרדס חנה',34.97,32.47,.12,-1],['באר שבע',34.79,31.25,.14,-1],['אילת',34.95,29.56,.08,-1]];
// air-force bases: deliberately not exact (spread the map), per Aviad
const AIRBASES=[['רמת דוד',35.42,32.92,1],['נבטים',34.95,30.45,1]];
const HITS=5;
// v0.3: specialised launch sites. kind D = drones+UAVs, C = UAVs+cruise, B = ballistic+cruise
const LTYPES={
  D:{n:'רחפנים ומל״טים',short:'רחפנים+מל״טים',makes:['drone','uav','swarm'],c:'#ffa53c',sym:'◆'},
  C:{n:'מל״טים וטילי שיוט',short:'מל״טים+שיוט',makes:['uav','cruise'],c:'#ffe45c',sym:'■'},
  B:{n:'טילים בליסטיים וטילי שיוט',short:'בליסטי+שיוט',makes:['ballistic','cruise','hyper','mirv'],c:'#ff3b3b',sym:'▲'}};
const LAUNCH=[['תבריז',46.29,38.07,'IR','B'],['אורמיה',45.07,37.55,'IR','D'],['כרמאנשאה',47.06,34.31,'IR','B',-14],['אילאם',46.42,33.64,'IR','D'],
  ['המדאן',48.51,34.80,'IR','D',-14],['ח׳וראמאבאד',48.35,33.49,'IR','B'],['דזפול',48.40,32.38,'IR','C'],['אהוואז',48.67,31.32,'IR','C'],
  ['איספהאן',51.67,32.65,'IR','C'],['שיראז',52.58,29.59,'IR','B'],
  ['צעדה',43.76,16.94,'YE','D'],['צנעא',44.2,15.35,'YE','B'],['חודיידה',42.95,14.8,'YE','C'],
  // v6: Iraqi militias launch drone swarms only (appended last so old saves keep their launcher order)
  ['אל-קאים',41.05,34.38,'IQ','D']];
// air-strike recovery: struck in wave N (or just before wave N+1) → out in wave N+1, 50% in N+2, full from N+3
function capAt(l,w){const k=w-l.struck;return k<=1?0:k===2?.5:1}
// v7: a coalition base that was hit is out for the rest of that wave and the next one, then back in full (2 waves); Iran stops aiming at it while it is down
const BASE_BACK=2;function capBase(b,w){return w-b.struck<BASE_BACK?0:1}
const effW=()=>S.inWave?S.wave:S.wave+1;
const DIFF={easy:{n:'קל',wave:.72,budget:1.35,bonus:1.3,spd:.88,score:.75},normal:{n:'רגיל',wave:1,budget:1,bonus:1,spd:1,score:1},hard:{n:'קשה',wave:1.15,budget:.92,bonus:.9,spd:1.08,score:1.5}};
const PTS={drone:10,uav:15,cruise:25,ballistic:40,rocket:15,swarm:5,hyper:90,mirv:60,rv:25};
let diff='normal';
const SAMPOS=[[46.0,34.6],[48.9,33.1],[51.2,32.4],[45.6,37.6],[51.4,35.7],[52.2,30.0]];
const TT={ // threat types
  drone:{n:'רחפן',spd:30,dmg:5,rw:8,c:'#ffa53c',sz:5},
  uav:{n:'מל״ט',spd:46,dmg:8,rw:12,c:'#ff7d3c',sz:7},
  cruise:{n:'טיל שיוט',spd:92,dmg:15,rw:22,c:'#fff1a8',sz:7},
  ballistic:{n:'טיל בליסטי',spd:190,dmg:20,rw:35,c:'#ff4040',sz:4},
  rocket:{n:'רקטה מלבנון',spd:12,dmg:10,rw:10,c:'#ff9a4a',sz:4}, // v0.4: from launch areas still alive on the Lebanon front (RTS)
  // v6: new threats (data-driven: a threat is its row here + the pk/dwell rows of the systems that can engage it + its wave counts)
  swarm:{n:'נחיל כטב״מים',spd:22,dmg:4,rw:8,c:'#ffd36a',sz:4.2},  // Shahed-type, launched together in groups of 12-20
  hyper:{n:'טיל היפרסוני',spd:340,dmg:25,rw:70,c:'#ff5cf0',sz:4}, // very fast, weaving glide path; only Arrow / THAAD / SM-6
  mirv:{n:'בליסטי מתפצל',spd:180,dmg:20,rw:60,c:'#ff2f6d',sz:5},  // splits into 3 warheads at 60% of its path
  rv:{n:'ראש קרב מתפצל',spd:200,dmg:15,rw:20,c:'#ff86b0',sz:3}
};
const BAL={ballistic:1,hyper:1,mirv:1,rv:1}; // ballistic-like: fast interceptors, jets can't engage, launch alert
const MIRV_SPLIT=.6,MIRV_N=3;
const HITW={swarm:.25}; // v6: a swarm drone's small warhead: a quarter of a hit (city damage and income cut)
const TW={
  dome:{n:'כיפת ברזל',cost:150,shot:5,range:75,reload:.85,mag:20,refill:5,spd:280,pk:{drone:.85,uav:.85,cruise:.8,ballistic:.3,rocket:.9,swarm:.92,mirv:.25,rv:.3},altMax:.35,altBal:.5,c:'#38d6ff'},
  beam:{n:'מגן אור',cost:250,shot:1,range:48,reload:.3,mag:Infinity,refill:0,dwell:{drone:.7,uav:1,cruise:2,rocket:.8,swarm:.45},altMax:.25,c:'#5dff9a'},
  sling:{n:'שרביט קסמים',cost:300,shot:12,range:210,reload:1.4,mag:8,refill:5,spd:340,pk:{uav:.75,cruise:.75,ballistic:.75,rocket:.7,swarm:.6,mirv:.7,rv:.7},altMax:.75,altBal:.9,c:'#b98cff'},
  arrow:{n:'חץ',cost:450,shot:30,range:650,reload:1.6,mag:4,refill:8,spd:600,pk:{ballistic:.8,hyper:.6,mirv:.8,rv:.75,swarm:.9},waste:['swarm'],altMin:.25,c:'#ffc94a'},
  // v4: coalition systems (not for sale to the player; they stand at coalition bases and fire for free)
  thaad:{n:'THAAD',cost:900,shot:0,range:260,reload:2.2,mag:6,refill:8,spd:620,pk:{ballistic:.85,cruise:.4,hyper:.4,mirv:.85,rv:.8,swarm:.9},waste:['swarm'],altMin:.22,c:'#7fb2ff',ally:true},
  patriot:{n:'פטריוט',cost:700,shot:0,range:140,reload:1.3,mag:8,refill:5,spd:430,pk:{ballistic:.65,cruise:.65,uav:.6,drone:.45,rocket:.55,swarm:.5,mirv:.55,rv:.6},altMax:.9,altBal:.95,c:'#a9c8ff',ally:true},
  // v5: ship-based interceptors on the US aircraft carriers (a strong Patriot)
  sm6:{n:'יירוט ימי SM-6',cost:900,shot:0,range:190,reload:1.0,mag:10,refill:5,spd:520,pk:{ballistic:.75,cruise:.8,uav:.75,drone:.6,rocket:.65,hyper:.3,mirv:.7,rv:.7,swarm:.6},altMax:.95,altBal:.98,c:'#8fe0ff',ally:true}
};
// v5: battery upgrades: 4 tracks × 3 levels (own batteries only); a sold battery keeps its upgrades
const UPG={range:{n:'טווח',ic:'📡'},rate:{n:'קצב ירי וטעינה',ic:'⚡'},hit:{n:'סיכוי פגיעה',ic:'🎯'},mag:{n:'גודל מחסנית',ic:'📦'}};
const UPG_COST=[.4,.7,1.1],UPG_MAX=3;
const upLv=(tw,k)=>(tw.up&&tw.up[k])||0;
const tRange=tw=>TW[tw.type].range*(1+.15*upLv(tw,'range'))*(radarBoost(tw)?1+RADAR.boost:1); // v6: +20% under a Green Pine radar
const tReload=tw=>TW[tw.type].reload*(1-.15*upLv(tw,'rate'));
const tRefill=tw=>TW[tw.type].refill*(1-.15*upLv(tw,'rate'));
const tMag=tw=>{const m=TW[tw.type].mag;return m===Infinity?m:Math.round(m*(1+.25*upLv(tw,'mag')))};
const tPk=(tw,ty)=>{const p=TW[tw.type].pk&&TW[tw.type].pk[ty];return p?Math.min(.98,p+.05*upLv(tw,'hit')):0};
const tDwell=(tw,ty)=>{const d=TW[tw.type].dwell&&TW[tw.type].dwell[ty];return d?d*(1-.15*upLv(tw,'hit')):0};
const upTracks=tw=>Object.keys(UPG).filter(k=>!(k==='mag'&&TW[tw.type].mag===Infinity));
const upStepCost=(tw,l)=>Math.round(TW[tw.type].cost*UPG_COST[l]/5)*5;
const upCost=(tw,k)=>upLv(tw,k)>=UPG_MAX?0:upStepCost(tw,upLv(tw,k));
function upSpent(tw){let s=0;for(const k of Object.keys(UPG))for(let l=0;l<upLv(tw,k);l++)s+=upStepCost(tw,l);return s}
const upTotal=tw=>Object.keys(UPG).reduce((a,k)=>a+upLv(tw,k),0);
const TWL={dome:'כ',beam:'ל',sling:'ש',arrow:'ח',thaad:'T',patriot:'P',sm6:'S'};
// v4: the coalition, data-driven — another country is one more entry: its bases, the batteries there, what it asks to buy and on what terms.
const COALITION=[
  {key:'us',n:'ארה״ב',flag:'🇺🇸',join:4,every:2,mult:1.5,installments:3,buys:['dome','sling','arrow','beam'],
   bases:[{key:'muwaffaq',n:'מוופק סלטי',cn:'ירדן',lon:36.78,lat:31.83,bat:['thaad','patriot'],wIR:.04,wYE:.01},
          {key:'dhafra',n:'אל-דפרה',cn:'איחוד האמירויות',lon:54.55,lat:24.25,bat:['thaad','patriot'],wIR:.04,wYE:.02},
          {key:'sultan',n:'פרינס סולטאן',cn:'ערב הסעודית',lon:47.58,lat:24.06,bat:['thaad','patriot'],wIR:.04,wYE:.05},
          {key:'navy',n:'משחתת הצי',cn:'הים האדום',lon:37.2,lat:24.8,bat:['thaad','patriot'],ship:true,wIR:.02,wYE:.08},
          // v5: more US presence: two more bases with the others at wave 4, two aircraft carriers at wave 6
          {key:'asad',n:'עין אל-אסד',cn:'עיראק',lon:42.44,lat:33.79,bat:['thaad','patriot'],wIR:.05,wYE:.01},
          {key:'udeid',n:'אל-עודייד',cn:'קטאר',lon:51.31,lat:25.12,bat:['thaad','patriot'],wIR:.04,wYE:.02},
          {key:'cvnGulf',n:'נושאת המטוסים במפרץ',cn:'המפרץ הפרסי',lon:50.3,lat:28.1,bat:['sm6','sm6'],ship:true,carrier:true,join:6,wIR:.05,wYE:.02},
          {key:'cvnMed',n:'נושאת המטוסים מול ישראל',cn:'מול חופי ישראל',lon:32.7,lat:32.9,bat:['sm6','sm6'],ship:true,carrier:true,join:6,wIR:.03,wYE:.02}]},
  // v6: Saudi Arabia joins at wave 5, mainly against the Houthis: its Patriots prefer threats launched from Yemen (prio), and the Houthis aim at its bases (wYE)
  {key:'sa',n:'ערב הסעודית',flag:'🇸🇦',join:5,every:2,mult:1.5,installments:3,buys:['dome','sling'],prio:'YE',
   joinMsg:'🇸🇦 ערב הסעודית מצטרפת: 2 סוללות פטריוט בג׳יזאן ובתבוק שמיירטות קודם כל את מה שהחותים משגרים דרכן. החותים יכולים לתקוף גם אותן.',
   bases:[{key:'jizan',n:'ג׳יזאן',cn:'ערב הסעודית',lon:42.55,lat:16.89,bat:['patriot'],wIR:0,wYE:.07},
          {key:'tabuk',n:'תבוק',cn:'ערב הסעודית',lon:36.57,lat:28.38,bat:['patriot'],wIR:.01,wYE:.04}]}
];
const COAL=k=>COALITION.find(c=>c.key===k);
const JT={
  f15:{n:'F-15',cost:350,spd:115,ammo:8,detect:.6,hit:.7,c:'#cfe3f5'},
  f35:{n:'F-35',cost:600,spd:155,ammo:4,detect:.12,hit:.45,c:'#9ef0ff'}
};
const WAVES=[ // v0.2 rebalance: 6 cities × 5 hits is more forgiving, so waves are bigger and bonuses smaller
  // v6: sw = drone swarms (12-20 each, from wave 3), hy = hypersonic missiles (from wave 5), mv = MIRV ballistic (from wave 6)
  {drone:18},
  {drone:26,uav:8},
  {drone:28,uav:10,cruise:8,sw:1},
  {drone:34,uav:14,cruise:12,ballistic:8,ye:true,sw:1},
  {drone:40,uav:18,cruise:16,ballistic:13,ye:true,sw:2,hy:1,boss:true},
  {drone:46,uav:22,cruise:20,ballistic:19,ye:true,sw:2,hy:1,mv:2},
  {drone:54,uav:26,cruise:24,ballistic:26,ye:true,sw:2,hy:2,mv:3},
  {drone:66,uav:30,cruise:30,ballistic:37,ye:true,sw:3,hy:2,mv:4},
  // v7: 20 waves. 9-20 grow ~3% a wave, mix more swarms / hypersonics / MIRVs and fly faster (spd); boss = a huge salvo from several directions at once
  {drone:68,uav:31,cruise:31,ballistic:38,ye:true,sw:3,hy:2,mv:4,spd:1.01},
  {drone:70,uav:32,cruise:32,ballistic:39,ye:true,sw:3,hy:2,mv:4,spd:1.02,boss:true},
  {drone:72,uav:33,cruise:33,ballistic:40,ye:true,sw:3,hy:2,mv:5,spd:1.02},
  {drone:74,uav:34,cruise:34,ballistic:41,ye:true,sw:4,hy:2,mv:5,spd:1.03},
  {drone:76,uav:34,cruise:34,ballistic:43,ye:true,sw:4,hy:3,mv:5,spd:1.04},
  {drone:78,uav:35,cruise:35,ballistic:44,ye:true,sw:4,hy:3,mv:6,spd:1.05},
  {drone:80,uav:36,cruise:36,ballistic:45,ye:true,sw:4,hy:3,mv:6,spd:1.06,boss:true},
  {drone:82,uav:37,cruise:37,ballistic:46,ye:true,sw:5,hy:3,mv:6,spd:1.06},
  {drone:84,uav:38,cruise:38,ballistic:47,ye:true,sw:5,hy:3,mv:7,spd:1.07},
  {drone:86,uav:39,cruise:39,ballistic:48,ye:true,sw:5,hy:4,mv:7,spd:1.08},
  {drone:88,uav:40,cruise:40,ballistic:49,ye:true,sw:5,hy:4,mv:7,spd:1.09},
  {drone:90,uav:41,cruise:41,ballistic:50,ye:true,sw:6,hy:4,mv:8,spd:1.10,boss:true}
];
// v6: Green Pine radar, Air Force strike between waves, city economy (incomes, hits cut income, shelters)
const RADAR={n:'מכ״ם אורן ירוק',cost:600,max:3,R:120,boost:.2,det:900,repair:300};
let DET0=420; // km from a living Israeli city: what is tracked without a radar (own batteries engage tracked threats only)
const IAF={cost:500,fleet:2,loss:.15,back:3,base:[34.95,30.45],
  targets:[{key:'launchers',n:'משגרים במערב איראן',ic:'🚀',lon:47.06,lat:34.31,fx:'−25% טילים בליסטיים בגל הבא',waves:1,cut:{bal:.25}},
           {key:'factory',n:'מפעל טילים',ic:'🏭',lon:51.77,lat:35.52,fx:'−15% מכל הטילים מאיראן ל-3 גלים',waves:3,cut:{ir:.15}},
           {key:'hodeidah',n:'נמל חודיידה',ic:'⚓',lon:42.93,lat:14.83,fx:'−50% מכל האיומים מתימן בגל הבא',waves:1,cut:{ye:.5}},
           {key:'hezbollah',n:'משגרי חיזבאללה',ic:'🎯',lon:35.38,lat:33.25,fx:'−30% רקטות מלבנון בגל הבא',waves:1,cut:{lb:.3}}]};
const IAFT=k=>IAF.targets.find(t=>t.key===k);
const CITY_INC={'תל אביב':120,'חיפה':80,'ירושלים':80,'באר שבע':50},CITY_INC0=30,CUT=.2,CUT_WAVES=2,SHELTER={cost:300,k:.5};
let ECON_BONUSW=35; // the TD wallet's own wave bonus is now small (cities pay the rest); the shared war pool still gets the full classic bonus
const AIR_WAVE=4;
let BONUS0=200,BONUSW=50;

// ---------- state ----------
let S;
function newState(d){d=DIFF[d]?d:diff;
  return {gid:Date.now().toString(36)+'-'+(window.__gidn=(window.__gidn||0)+1),endless:false,diff:d,score:0,budget:Math.round(900*DIFF[d].budget),wave:0,inWave:false,over:false,won:false,paused:false,speed:1,time:0,
    cities:[...CITIES,...(window.SHARED?window.SHARED.capturedCities().map(c=>[c.n,c.lon,c.lat,c.w,-1]):[])].map(c=>({n:c[0],...P(c[1],c[2]),w:c[3],side:c[4],hp:HITS,flash:0,kind:'city',dead:false})),
    bases:AIRBASES.map(b=>({n:b[0],...P(b[1],b[2]),side:b[3],hp:HITS,flash:0,kind:'base',dead:false,active:false,wake:0})),
    launchers:LAUNCH.map(l=>({n:l[0],...P(l[1],l[2]),cc:l[3],kind:l[4],ly:l[5]||15,struck:-99,smoke:0})),
    sams:SAMPOS.map(s=>({...P(s[0],s[1]),alive:true,cd:rnd(0,2),range:170,ang:rnd(0,6)})),
    cbases:COALITION.flatMap(c=>c.bases.map(b=>({key:b.key,n:b.n,cn:b.cn,country:c.key,...P(b.lon,b.lat),kind:'cbase',ship:!!b.ship,carrier:!!b.carrier,join:b.join||c.join,on:false,struck:-99,hits:0,flash:0,wIR:b.wIR,wYE:b.wYE}))),coal:{},offer:null,sellMode:null,payments:[],
    towers:[],threats:[],shots:[],jets:[],samMissiles:[],bombs:[],parts:[],rings:[],texts:[],beams:[],radars:[],iaf:{lost:[],last:-1,mods:[],n:0},fx:[],eco:null,radarSeq:0,
    queue:[],stats:{kills:0,leaks:0,jetsLost:0,strikes:0,shots:0},shake:0,alertT:0,jetSeq:0};
}

// ---------- camera ----------
const cam={x:500,y:0,s:.3,tx:500,ty:0,ts:.3,anim:false};
let mapDirty=true, view='theater';
function viewRect(){const land=SW>SH;const top=40,right=land?96:0,bottom=land?0:66;return {x:0,y:top,w:SW-right,h:SH-top-bottom}}
function fitBox(lon0,lat0,lon1,lat1){const a=P(lon0,lat1),b=P(lon1,lat0),r=viewRect();const s=Math.min(r.w/(b.x-a.x),r.h/(b.y-a.y));
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,s,r}}
function camTo(v,instant){view=v;const f=v==='israel'?fitBox(33.2,29.3,36.6,S&&S.cities.some(c=>c.n==='ביירות')?34.1:S&&S.cities.some(c=>c.n==='צידון')?33.75:33.4):fitBox(30.5,S&&S.coal&&Object.keys(S.coal).length?21.9:23.5,61,39.8);
  const r=viewRect();cam.tx=f.x-(r.x+r.w/2-SW/2)/f.s;cam.ty=f.y-(r.y+r.h/2-SH/2)/f.s;cam.ts=f.s;cam.anim=true;
  if(instant){cam.x=cam.tx;cam.y=cam.ty;cam.s=cam.ts;cam.anim=false}mapDirty=true}
const w2s=(x,y)=>({x:(x-cam.x)*cam.s+SW/2,y:(y-cam.y)*cam.s+SH/2});
const s2w=(x,y)=>({x:(x-SW/2)/cam.s+cam.x,y:(y-SH/2)/cam.s+cam.y});
function clampCam(){const mn=Math.max(SW/(W1.x-W0.x),SH/(W1.y-W0.y));cam.s=clamp(cam.s,mn,4);
  const hw=SW/2/cam.s,hh=SH/2/cam.s;cam.x=clamp(cam.x,W0.x+hw,W1.x-hw);cam.y=clamp(cam.y,W0.y+hh,W1.y-hh)}

function resize(){DPR=Math.min(window.devicePixelRatio||1,2);SW=window.innerWidth;SH=window.innerHeight;cv.width=SW*DPR|0;cv.height=SH*DPR|0;
  mapLayer.width=cv.width;mapLayer.height=cv.height;camTo(view,true);clampCam();
  $('rotate').classList.toggle('hidden',!(SW<SH&&SW<700)||rotateDismissed);}
let rotateDismissed=false;
const mapLayer=document.createElement('canvas'), mctx=mapLayer.getContext('2d');

// ---------- audio (off by default) ----------
let AC=null,soundOn=false;
function sfx(kind){if(!soundOn)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime;
  const len=kind==='boom'?.7:kind==='hit'?.35:.18;const b=AC.createBuffer(1,AC.sampleRate*len,AC.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,kind==='launch'?1:2.5);
  const src=AC.createBufferSource();src.buffer=b;const f=AC.createBiquadFilter();f.type=kind==='launch'?'bandpass':'lowpass';
  f.frequency.value=kind==='boom'?380:kind==='hit'?900:1800;const g=AC.createGain();g.gain.value=kind==='boom'?.5:kind==='hit'?.25:.06;
  src.connect(f);f.connect(g);g.connect(AC.destination);src.start(t)}catch(e){}}

// ---------- effects ----------
function boom(x,y,size,color,alt=0){const n=Math.min(40,10+size*3|0);
  for(let i=0;i<n;i++){const a=rnd(0,6.283),v=rnd(.2,1)*size*9;S.parts.push({x,y,alt,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rnd(.4,1.1),t:0,c:Math.random()<.5?color:'#fff6c8',sz:rnd(1,2.6)})}
  S.rings.push({x,y,alt,r:0,R:size*7,t:0,life:.5,c:color});
  if(S.parts.length>700)S.parts.splice(0,S.parts.length-700)}
function floatText(x,y,t,c){S.texts.push({x,y,t,c,life:1.2,age:0})}

// ---------- waves ----------
function launchersFor(type,ye){return S.launchers.filter(l=>LTYPES[l.kind].makes.includes(type)&&(l.cc==='IR'||ye))}
function pickLauncher(ls,yeP){const ir=ls.filter(l=>l.cc==='IR'),ye=ls.filter(l=>l.cc==='YE');if(!ir.length)return pick(ye);if(ye.length&&Math.random()<yeP)return pick(ye);return pick(ir)}
function lebanonRockets(n){return window.SHARED&&window.SHARED.launcherRockets?window.SHARED.launcherRockets(n):0}
function lebanonAreas(){return window.SHARED&&window.SHARED.launchers?window.SHARED.launchers('lebanon'):0}
// v7: endless mode past wave 20 — wave 20 scaled up 7% a wave, one more swarm every 3 waves, one more hypersonic every 4, one more MIRV every 2, faster (cap ×1.4)
const MAXW=20,BOSS_EVERY=5;
function waveDef(n){if(n<=WAVES.length)return WAVES[n-1];const b=WAVES[WAVES.length-1],e=n-WAVES.length,k=1+.07*e,o={ye:true};
  for(const t of ['drone','uav','cruise','ballistic'])o[t]=Math.round(b[t]*k);o.sw=b.sw+Math.floor(e/3);o.hy=b.hy+Math.floor(e/4);o.mv=b.mv+Math.floor(e/2);o.spd=Math.min(1.4,b.spd+.012*e);o.boss=n%BOSS_EVERY===0;return o}
const isBoss=n=>!!waveDef(n).boss;
const lastWave=()=>S.endless?Infinity:WAVES.length;
const wspd=()=>DIFF[S.diff].spd*((S&&S.wdef&&S.wdef.spd)||1);
// boss salvo: several directions at once (Iran ballistic, Yemen cruise + drones, Iraq drones + UAVs, Lebanon rockets), all within ~5 s
function bossSalvo(n,q){const D=DIFF[S.diff],N=Math.round((8+3*n)*D.wave),t0=rnd(20,26),bal=Math.min(.25,.02*n);
  const part=(cc,type,share)=>{const c=Math.round(N*share);for(let i=0;i<c;i++)q.push({t:t0+rnd(0,5),type,li:'B'+cc+type,bcc:cc,boss:true})};
  part('IR','ballistic',bal);part('IR','cruise',.1);part('YE','cruise',.12);part('YE','drone',.14+(.25-bal)/2);part('IQ','drone',.14+(.25-bal)/2);part('IQ','uav',.1);
  const nr=Math.round(N*.15);for(let k=0;k<nr;k++)q.push({t:t0+rnd(0,5),type:'rocket',lb:true,boss:true});return N}
function buildWave(n){const W=waveDef(n),D=DIFF[S.diff],q=[];
  const cnt=k=>Math.round((W[k]||0)*D.wave);
  const add=(type,count,t0,t1,group)=>{let i=0;while(i<count){const g=Math.min(group,count-i);const tt=rnd(t0,t1);for(let k=0;k<g;k++)q.push({t:tt+k*rnd(.25,.6),type,li:-1});i+=g}};
  add('drone',cnt('drone'),1,42,5);add('uav',cnt('uav'),8,45,2);add('cruise',cnt('cruise'),14,48,2);
  // v6: drone swarms — each one launched together (within ~2.5 s) from one site, all aimed at the same place
  for(let k=0;k<(W.sw||0);k++){const size=clamp(Math.round(rnd(12,20)*D.wave),8,24),tt=rnd(4,34),li='W'+k;for(let i=0;i<size;i++)q.push({t:tt+rnd(0,2.5),type:'swarm',li,sw:k})}
  for(let k=0;k<(W.hy||0);k++)q.push({t:rnd(18,46),type:'hyper',li:'H'+k});
  for(let k=0;k<(W.mv||0);k++)q.push({t:rnd(16,44),type:'mirv',li:'M'+k});
  // v6: now and then Iran sends a cruise missile at a Green Pine radar
  if(S.radars.some(r=>!r.dead)&&n>=3&&Math.random()<({easy:.35,normal:.55,hard:.75})[S.diff])q.push({t:rnd(10,40),type:'cruise',li:-1,radar:true});
  const nb=cnt('ballistic');if(nb){const salvos=Math.max(1,Math.ceil(nb/7));let left=nb;for(let s=0;s<salvos;s++){const c=Math.min(7,Math.ceil(left/(salvos-s)));left-=c;const tt=20+s*(30/salvos)+rnd(0,4);const li='S'+s;for(let k=0;k<c;k++)q.push({t:tt+k*.35,type:'ballistic',li})}}
  // v0.4: Hezbollah rockets from launch areas still alive in the RTS (shared save); small salvos of up to 4
  if(W.boss)S.bossN=bossSalvo(n,q);
  const nr=lebanonRockets(n);for(let s=0;s<nr;s+=4){const tt=rnd(5,40);for(let k=0;k<Math.min(4,nr-s);k++)q.push({t:tt+k*.4,type:'rocket',lb:true})}
  // every event gets a site that launches its type (planned share), then the site's capacity this wave decides whether it really launches
  const salvoL={};
  for(const e of q){if(e.lb)continue;const ls=launchersFor(e.type,W.ye);if(!ls.length){e.cancel=true;continue}
    let L;if(e.bcc){if(salvoL[e.li]===undefined){const lc=ls.filter(l=>l.cc===e.bcc);salvoL[e.li]=pick(lc.length?lc:ls)}L=salvoL[e.li]}
    else if(e.type==='swarm'){if(salvoL[e.li]===undefined)salvoL[e.li]=pick(S.launchers.filter(l=>LTYPES[l.kind].makes.includes('swarm')&&(l.cc!=='YE'||W.ye)));L=salvoL[e.li]}
    else if(e.type==='hyper'||e.type==='mirv'){const ir=ls.filter(l=>l.cc==='IR');if(salvoL[e.li]===undefined)salvoL[e.li]=pick(ir.length?ir:ls);L=salvoL[e.li]}
    else if(typeof e.li==='string'){if(salvoL[e.li]===undefined)salvoL[e.li]=pickLauncher(ls,n>=5?.18:0);L=salvoL[e.li]}else L=pickLauncher(ls,.2);
    e.li=S.launchers.indexOf(L);const cap=capAt(L,n);if(cap<=0||(cap<1&&Math.random()>cap))e.cancel=true}
  // a Yemen swarm has the longest flight: it launches at the start of the wave so the wave doesn't drag on
  {const g={};for(const e of q)if(e.type==='swarm'&&(S.launchers[e.li]||{}).cc==='YE')(g[e.li+':'+e.sw]=g[e.li+':'+e.sw]||[]).push(e);for(const k in g){const m=Math.min(...g[k].map(e=>e.t));for(const e of g[k])e.t=e.t-m+1}}
  iafCut(q,n);q.sort((a,b)=>a.t-b.t);return q.filter(e=>!e.cancel)}
// v6: Air Force strike effects on a wave: each active cut removes that share of the matching launches (rounded, picked at random)
function iafMods(n){const m={bal:0,ir:0,ye:0,lb:0};for(const x of (S.iaf&&S.iaf.mods)||[])if(n>=x.from&&n<=x.to){const t=IAFT(x.k);if(t)for(const k in t.cut)m[k]=Math.min(.9,m[k]+t.cut[k])}return m}
function iafCut(q,n){const m=iafMods(n),cc=e=>e.lb?'LB':(S.launchers[e.li]||{}).cc;
  const groups={bal:e=>!e.lb&&cc(e)==='IR'&&(e.type==='ballistic'||e.type==='mirv'),ir:e=>cc(e)==='IR'&&(e.type==='ballistic'||e.type==='cruise'||e.type==='hyper'||e.type==='mirv'),ye:e=>cc(e)==='YE',lb:e=>!!e.lb};
  const out={};for(const k in groups){if(!m[k])continue;const g=q.filter(e=>!e.cancel&&groups[k](e));let cut=Math.round(g.length*m[k]);out[k]=cut;
    while(cut>0&&g.length){const i=(Math.random()*g.length)|0;g[i].cancel=true;g.splice(i,1);cut--}}
  return out}
function syncCapturedCities(){if(!window.SHARED)return;for(const c of window.SHARED.capturedCities()){if(!S.cities.some(city=>city.n===c.n))S.cities.push({n:c.n,...P(c.lon,c.lat),w:c.w,side:-1,hp:HITS,flash:0,kind:'city',dead:false});}}
function startWave(){if(S.inWave||S.over)return;syncCapturedCities();if(S.offer||S.sellMode)closeOffer(false,true);S.started=true;S.wave++;S.inWave=true;S.waveT=0;const joinedNow=coalitionJoin();
  if(S.wave>=AIR_WAVE)for(const b of S.bases)if(!b.active&&!b.dead){b.active=true;b.wake=1;boom(b.x,b.y,4,'#3cc8ff')}S.wdef=waveDef(S.wave);S.bossDead0=S.cities.filter(c=>c.dead).length;S.bossN=0;S.queue=buildWave(S.wave);S.waveTotal=S.queue.length;
  const back=S.cbases.filter(b=>cbOn(b)&&b.struck===S.wave-BASE_BACK);S.basesBack=back.map(b=>b.n);for(const b of back){b.flash=1;floatText(b.x,b.y-10,b.n+' חזר לפעולה','#7db8ff')}
  $('btnNext').classList.add('hidden');const nRk=S.queue.filter(e=>e.type==='rocket'&&!e.boss).length;banner((S.wdef.boss?'👑 גל '+S.wave+' · גל בוס! מטח ענק מכמה כיוונים':'גל '+S.wave)+(back.length?' · '+back.map(b=>COAL(b.country).flag+' '+b.n).join(', ')+' חזר לפעולה':'')+(joinedNow.length?' · '+joinedNow.map(c=>c.flag+' '+c.n).join(', ')+' מצטרפת להגנה!':'')+(S.wave===AIR_WAVE&&!joinedNow.length?' · בסיסי רמת דוד ונבטים התעוררו ✈':'')+(nRk?' · 🚀 +'+nRk+' רקטות מלבנון':'')+((S.basesJoined||[]).length?' · '+COAL(S.basesJoined[0].country).flag+' '+(S.basesJoined.every(b=>b.carrier)?S.basesJoined.length+' נושאות מטוסים הגיעו!':'בסיסים חדשים: '+S.basesJoined.map(b=>b.n).join(', ')):''));
  S.swarmT={};hideEl('ecoPanel');closeV6();
  if(joinedNow.length)hint(joinedNow.map(c=>{if(c.joinMsg)return c.joinMsg;const bs=S.cbases.filter(b=>b.country===c.key&&b.on);return c.flag+' '+c.n+' מצטרפת: '+bs.length+' בסיסים ('+bs.map(b=>b.n).join(', ')+') עם THAAD ופטריוט שמיירטים לבד. איראן יכולה לתקוף גם אותם.'+(c.bases.some(b=>b.join>S.wave)?' בגל '+Math.min(...c.bases.filter(b=>b.join>S.wave).map(b=>b.join))+' יגיעו גם נושאות מטוסים.':'')}).join(' '),6500);
  else if(back.length)hint(back.map(b=>COAL(b.country).flag+' בסיס '+b.n+' ('+b.cn+') חזר לפעולה אחרי '+BASE_BACK+' גלים: הסוללות שם מיירטות שוב').join(' '),4500);
  else if((S.basesJoined||[]).length)hint(COAL(S.basesJoined[0].country).flag+' '+S.basesJoined.map(b=>b.n+' ('+b.cn+')').join(' ו')+(S.basesJoined.every(b=>b.carrier)?': יירוט מהים עם SM-6. איראן ותימן יכולות לתקוף גם אותן.':' הצטרפו להגנה.'),6000);
  if(S.wave>=AIR_WAVE)$('airLock').textContent='פתוח';updateUI()}
function endWave(){S.inWave=false;const bonus=Math.round((BONUS0+S.wave*BONUSW)*DIFF[S.diff].bonus);const own=Math.round(S.wave*ECON_BONUSW*DIFF[S.diff].bonus);S.budget+=own;const inc=payCities();const paid=payInstallments();if(window.SHARED)window.SHARED.addBudget(bonus,'גל '+S.wave);addScore(100*S.wave);
  S.eco={wave:S.wave,rows:inc.rows,cities:inc.sum,bonus:own,pool:bonus,coal:paid,total:inc.sum+own+paid};S.stats.income=(S.stats.income||0)+inc.sum;
  for(const t of S.towers){t.ammo=tMag(t);t.refT=0}
  // v7 boss: a big money bonus when no city fell during it
  S.bossBonus=0;if(S.wdef&&S.wdef.boss){const lost=S.cities.filter(c=>c.dead).length-(S.bossDead0||0);if(lost<=0){S.bossBonus=Math.round((600+60*S.wave)*DIFF[S.diff].bonus);S.budget+=S.bossBonus;S.stats.bossWins=(S.stats.bossWins||0)+1;addScore(500)}}
  if(S.eco){S.eco.boss=S.bossBonus;S.eco.total+=S.bossBonus}
  if(!S.endless&&S.wave>=WAVES.length){S.won=true;victory();return}
  recordBest();saveGame();
  banner((S.wdef&&S.wdef.boss?(S.bossBonus?'👑 גל הבוס נהדף! בונוס ₪'+S.bossBonus+' · ':'👑 שרדתם את גל הבוס (עיר נפלה, אין בונוס) · '):'הגל נהדף! ')+'🏙 +₪'+inc.sum+' מהערים'+(paid?' · 💵 ₪'+paid+' מהקואליציה':''));showEco();coalitionOffer();$('btnNext').textContent='התחל גל '+(S.wave+1)+(isBoss(S.wave+1)?' 👑 בוס':'')+' ▶';$('btnNext').classList.remove('hidden');
  if(isBoss(S.wave+1))setTimeout(()=>hint('👑 הגל הבא הוא גל בוס: מטח ענק מאיראן, תימן, עיראק ולבנון בבת אחת. אם אף עיר לא נופלת: בונוס ₪'+Math.round((600+60*(S.wave+1))*DIFF[S.diff].bonus),5000),2600);
  if(S.wave+1>=AIR_WAVE)for(const b of S.bases)if(!b.active&&!b.dead){b.active=true;b.wake=1;boom(b.x,b.y,4,'#3cc8ff')}
  if(S.wave+1===AIR_WAVE)setTimeout(()=>hint('בסיסי רמת דוד ונבטים התעוררו: חיל האוויר זמין ✈ (מעכשיו איראן תוקפת גם אותם)',4500),2300);updateUI()}
function targetList(ye){const l=S.cities.filter(c=>!c.dead).map(c=>[c,ye?(c.n==='אילת'?1.2:c.w*.6):c.w]);
  for(const b of S.bases)if(b.active&&!b.dead)l.push([b,ye?(b.n==='נבטים'?.5:.04):(b.n==='רמת דוד'?.12:.08)]);
  for(const b of S.cbases)if(cbOn(b)&&capBase(b,S.wave)>0)l.push([b,ye?b.wYE:b.wIR]);return l}
function spawnRocket(e){const tl=S.cities.filter(c=>!c.dead);if(!tl.length)return;const sx=LB0.x+rnd(-14,14),sy=LB0.y+rnd(-8,8);tl.sort((a,b)=>Math.hypot(a.x-sx,a.y-sy)-Math.hypot(b.x-sx,b.y-sy));const city=tl[Math.random()<.65?0:Math.min(1,tl.length-1)];
  const tx=city.x+rnd(-6,6),ty=city.y+rnd(-6,6);const th={type:'rocket',sx,sy,tx,ty,city,s:0,alt:0,x:sx,y:sy,vx:0,vy:0,eng:0,trail:[],wob:0,dead:false,lb:true};th.len=Math.hypot(tx-sx,ty-sy);th.spd=TT.rocket.spd*rnd(.9,1.1)*wspd();th.from=-1;S.threats.push(th)}
function spawn(e){if(e.lb)return spawnRocket(e);const L=S.launchers[e.li];if(!L||capAt(L,S.wave)<=0)return; // struck this wave → remaining launches cancelled
  const tp=TT[e.type];const tl=targetList(L.cc==='YE');if(!tl.length)return;let city=wpick(tl),spread=7;
  if(e.type==='swarm'){S.swarmT=S.swarmT||{};const key=S.wave+':'+e.sw;const c0=S.swarmT[key];if(c0&&(!c0.dead||c0.kind!=='city'))city=c0;else S.swarmT[key]=city;spread=11}
  if(e.radar){const rs=S.radars.filter(r=>!r.dead);if(rs.length){city=pick(rs);spread=1.5}}
  const tx=city.x+rnd(-spread,spread),ty=city.y+rnd(-spread,spread);const j=e.type==='swarm'?8:15;
  const th={type:e.type,sx:L.x+rnd(-j,j),sy:L.y+rnd(-j,j),tx,ty,city,s:0,alt:0,x:L.x,y:L.y,vx:0,vy:0,eng:0,trail:[],wob:rnd(0,6),dead:false};
  if(e.type==='hyper'){th.amp=rnd(22,34)*(Math.random()<.5?1:-1);th.ph=rnd(0,6.283)}
  const dx=tx-th.sx,dy=ty-th.sy,len=Math.hypot(dx,dy);
  if(e.type==='cruise'){const side=Math.random()<.5?1:-1,off=rnd(.15,.35)*len*side;th.cx=(th.sx+tx)/2-dy/len*off;th.cy=(th.sy+ty)/2+dx/len*off;th.len=len*(1+Math.abs(off/len)*.5)}else th.len=len;
  th.spd=tp.spd*rnd(.9,1.1)*wspd();th.from=e.li;S.threats.push(th);
  if(BAL[e.type])sfx('launch');if(e.radar)th.atRadar=true;th.det=detects(th);if(th.det)onDetect(th)}
// v6: tracking — a threat is tracked once it is within DET0 km of a living Israeli city, or within a Green Pine radar's reach; own batteries engage tracked threats only
function detects(th){for(const c of S.cities)if(!c.dead&&Math.abs(c.x-th.x)<DET0&&dist(c,th)<DET0)return true;for(const r of S.radars)if(!r.dead&&dist(r,th)<RADAR.det)return true;return false}
function onDetect(th){th.det=true;if(BAL[th.type]&&th.type!=='rv'){S.alertT=3;S.alertTxt=th.type==='hyper'?'⚠ טיל היפרסוני!':th.type==='mirv'?'⚠ בליסטי מתפצל':'⚠ שיגור בליסטי'}}
function radarBoost(tw){if(!S||tw.owner||!S.radars.length)return false;for(const r of S.radars)if(!r.dead&&dist(r,tw)<=RADAR.R)return true;return false}
function threatPos(th){const t=clamp(th.s/th.len,0,1);
  if(th.type==='cruise'){const u=1-t;return {x:u*u*th.sx+2*u*t*th.cx+t*t*th.tx,y:u*u*th.sy+2*u*t*th.cy+t*t*th.ty,alt:.06}}
  let x=th.sx+(th.tx-th.sx)*t,y=th.sy+(th.ty-th.sy)*t,alt=.04;
  if(th.type==='ballistic'||th.type==='mirv')alt=4*t*(1-t)*.98+.02;
  else if(th.type==='rv')alt=th.alt0*(1-t*t)+.02*t;
  else if(th.type==='hyper'){alt=4*t*(1-t)*.6+.08;const w=th.amp*Math.sin(Math.PI*t)*Math.sin(t*Math.PI*3+th.ph);const dx=th.tx-th.sx,dy=th.ty-th.sy,l=th.len||1;x+=-dy/l*w;y+=dx/l*w}
  else if(th.type==='rocket')alt=4*t*(1-t)*.3+.02;
  else{const w=Math.sin(th.s/60+th.wob)*6;const dx=th.tx-th.sx,dy=th.ty-th.sy,l=th.len||1;x+=-dy/l*w;y+=dx/l*w}
  return {x,y,alt}}

// ---------- update ----------
function update(dt){
  if(S.paused||S.over)return;S.time+=dt;
  if(S.inWave){S.waveT+=dt;while(S.queue.length&&S.queue[0].t<=S.waveT)spawn(S.queue.shift());
    if(!S.queue.length&&!S.threats.length)endWave()}
  if(S.alertT>0)S.alertT-=dt;
  // threats
  for(const th of S.threats){if(th.dead)continue;const ox=th.x,oy=th.y;th.s+=th.spd*dt;const p=threatPos(th);th.x=p.x;th.y=p.y;th.alt=p.alt;th.vx=(th.x-ox)/dt;th.vy=(th.y-oy)/dt;
    th.trail.push({x:th.x,y:th.y,alt:th.alt});if(th.trail.length>(BAL[th.type]?36:th.type==='cruise'||th.type==='rocket'?18:th.type==='swarm'?5:8))th.trail.shift();
    if(!th.det&&detects(th))onDetect(th);
    if(th.type==='mirv'&&th.s/th.len>=MIRV_SPLIT){splitMirv(th);continue}
    if(th.s>=th.len){th.dead=true;boom(th.x,th.y,BAL[th.type]?6:4,'#ff6a2a');S.shake=Math.min(1,S.shake+(BAL[th.type]?.6:.25));sfx('boom');hitTarget(th.city,th)}}
  if(S.newThreats&&S.newThreats.length){for(const t of S.newThreats)S.threats.push(t);S.newThreats=[]}
  // towers
  for(const tw of S.towers){const T=TW[tw.type];tw.cd-=dt;const cb=tw.owner?cbaseOf(tw):null,ccap=cb?capBase(cb,effW()):1;if(cb&&(ccap<=0||!(S.coal[tw.owner]||{}).joined))continue;
    if(tw.ammo<=0&&T.mag!==Infinity){tw.refT+=dt;if(tw.refT>=tRefill(tw)){tw.ammo=tMag(tw);tw.refT=0}continue}
    if(tw.type==='beam'){beamUpdate(tw,T,dt);continue}
    if(tw.cd>0)continue; // v0.2: batteries never idle for lack of budget (cost floors at ₪0)
    const rng=tRange(tw),prio=tw.owner&&COAL(tw.owner)?COAL(tw.owner).prio:null;
    let best=null,bs=1e9;for(const th of S.threats){if(th.dead)continue;if(!tw.owner&&!th.det)continue;const pk=tPk(tw,th.type);if(!pk)continue;
      const waste=T.waste&&T.waste.includes(th.type);
      if(T.altMax!==undefined&&th.alt>(BAL[th.type]&&T.altBal?T.altBal:T.altMax))continue;if(T.altMin!==undefined&&!waste&&(th.alt<T.altMin||th.s/th.len>.93))continue;
      const d=dist(tw,th);if(d>(waste?rng*.3:rng))continue;const need=pk<.5?2:1;if(th.eng>=need)continue;
      // v6: Arrow / THAAD only spend a round on a swarm drone when nothing else is in reach (allowed, but a waste of ₪); Saudi batteries put Houthi launches first
      const score=(th.len-th.s)/th.spd - (BAL[th.type]?2:0) + (waste?1000:0) - (prio&&th.from>=0&&(S.launchers[th.from]||{}).cc===prio?50:0);if(score<bs){bs=score;best=th}}
    if(best){tw.cd=tReload(tw)/ccap;tw.ammo--;if(!tw.owner)S.budget=Math.max(0,S.budget-T.shot);best.eng++;S.stats.shots++;tw.fired=(tw.fired||0)+1;tw.flash=.35;if(T.waste&&T.waste.includes(best.type))S.stats.wasted=(S.stats.wasted||0)+1;
      S.shots.push({x:tw.x,y:tw.y,alt:0,tgt:best,spd:BAL[best.type]?T.spd*2.4:T.spd,pk:tPk(tw,best.type),c:T.c,trail:[],life:0,from:'tw',kind:tw.type,ally:tw.owner||''});sfx('launch')}}
  // interceptors & jet missiles
  for(const m of S.shots){if(m.done)continue;m.life+=dt;const t=m.tgt;
    if(t.dead||m.life>8){m.done=true;if(!t.dead)t.eng=Math.max(0,t.eng-1);continue}
    const d=dist(m,t);const lead=d/m.spd;const ax=t.x+t.vx*lead,ay=t.y+t.vy*lead;const dx=ax-m.x,dy=ay-m.y,l=Math.hypot(dx,dy)||1;
    const step=m.spd*dt;m.alt+=(t.alt-m.alt)*Math.min(1,dt*3);
    if(d<=step*1.2+3){m.done=true;t.eng=Math.max(0,t.eng-1);
      if(Math.random()<m.pk){kill(t,m.from==='jet',m.ally);boom(t.x,t.y,BAL[t.type]?5:3,m.c,t.alt);sfx('hit')}
      else{boom(m.x,m.y,1.2,'#bbbbbb',m.alt);floatText(m.x,m.y,'פספוס','#cccccc');S.stats.misses=(S.stats.misses||0)+1}continue}
    m.x+=dx/l*step;m.y+=dy/l*step;m.trail.push({x:m.x,y:m.y,alt:m.alt});if(m.trail.length>14)m.trail.shift()}
  S.shots=S.shots.filter(m=>!m.done);
  jetsUpdate(dt);samUpdate(dt);fxUpdate(dt);
  S.threats=S.threats.filter(t=>!t.dead);
  for(const p of S.parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96}S.parts=S.parts.filter(p=>p.t<p.life);
  for(const r of S.rings){r.t+=dt}S.rings=S.rings.filter(r=>r.t<r.life);
  for(const t of S.texts){t.age+=dt}S.texts=S.texts.filter(t=>t.age<t.life);
  for(const c of S.cities)c.flash=Math.max(0,c.flash-dt*1.5);for(const b of S.bases){b.flash=Math.max(0,b.flash-dt*1.5);b.wake=Math.max(0,b.wake-dt*.5)}
  for(const t of S.towers)if(t.flash)t.flash=Math.max(0,t.flash-dt);
  for(const l of S.launchers){l.smoke+=dt;if(l.hitFlash)l.hitFlash=Math.max(0,l.hitFlash-dt*.6)}
  for(const s of S.sams)s.ang+=dt*1.6;
  S.shake=Math.max(0,S.shake-dt*1.8);
}
// v6: a MIRV releases 3 warheads at 60% of its path: one keeps the original aim, two pick their own targets
function splitMirv(th){th.dead=true;S.stats.splits=(S.stats.splits||0)+1;const L=S.launchers[th.from];const tl=targetList(!!(L&&L.cc==='YE'));
  boom(th.x,th.y,3.5,'#ff86b0',th.alt);S.rings.push({x:th.x,y:th.y,alt:th.alt,r:0,R:42,t:0,life:.9,c:'#ff2f6d'});floatText(th.x,th.y,'התפצל! ×'+MIRV_N,'#ff9ec0');S.shake=Math.min(1,S.shake+.15);
  S.newThreats=S.newThreats||[];const out=[];
  for(let i=0;i<MIRV_N;i++){const city=i===0||!tl.length?th.city:wpick(tl);const tx=city.x+rnd(-9,9),ty=city.y+rnd(-9,9);
    const rv={type:'rv',sx:th.x,sy:th.y,tx,ty,city,s:0,alt:th.alt,alt0:th.alt,x:th.x,y:th.y,vx:th.vx,vy:th.vy,eng:0,trail:[],wob:0,dead:false,from:th.from,det:th.det,split:true};
    rv.len=Math.hypot(tx-rv.sx,ty-rv.sy)||1;rv.spd=TT.rv.spd*rnd(.95,1.05)*wspd();S.newThreats.push(rv);out.push(rv)}
  return out}
// v6: city economy — income by size at the end of every wave; a hit cuts that city's income by 20% for 2 waves (stacking, floor 0); shelters halve the cut and the damage
function cityBase(c){return CITY_INC[c.n]!==undefined?CITY_INC[c.n]:CITY_INC0}
function cityCut(c){return Math.min(1,(c.cuts||[]).reduce((a,x)=>a+x[0],0))}
function cityIncome(c){if(c.dead)return 0;return Math.round(cityBase(c)*(1-cityCut(c))*DIFF[S.diff].bonus)}
function payCities(){const rows=[];let sum=0;for(const c of S.cities){const v=cityIncome(c);rows.push({n:c.n,v,base:Math.round(cityBase(c)*DIFF[S.diff].bonus),cut:Math.round(cityCut(c)*100),dead:c.dead,shelter:!!c.shelter});sum+=v;
    c.cuts=(c.cuts||[]).map(x=>[x[0],x[1]-1]).filter(x=>x[1]>0)}S.budget+=sum;return {rows,sum}}
function hitTarget(c,th){const hw=th&&HITW[th.type]||1;if(c.kind==='radar'){if(c.dead){floatText(c.x,c.y-10,'פגיעה בהריסות','#bbbbbb');return}c.dead=true;c.flash=1;S.stats.radarsLost=(S.stats.radarsLost||0)+1;boom(c.x,c.y,5,'#5dff9a');
    banner('📡 מכ״ם אורן ירוק נפגע! הבונוס שלו אבד');hint('המכ״ם נפגע מטיל שיוט: אין יותר +20% טווח ואין התרעה מוקדמת סביבו. הקישו עליו ← תיקון ב-₪'+RADAR.repair,4500);return}
  if(c.kind==='cbase'){c.struck=effW();c.hits=(c.hits||0)+1;c.flash=1;S.stats.allyHits=(S.stats.allyHits||0)+1;floatText(c.x,c.y-10,'פגיעה ב'+c.n+' · הסוללות שם מושבתות','#ffb36b');return}if(c.dead){floatText(c.x,c.y-10,'פגיעה בהריסות','#bbbbbb');return}
  const sh=c.kind==='city'&&c.shelter,k=hw*(sh?SHELTER.k:1);c.hp=Math.max(0,Math.round((c.hp-k)*100)/100);c.flash=1;S.stats.leaks++;
  if(c.kind==='city'){c.cuts=c.cuts||[];c.cuts.push([Math.round(CUT*k*1000)/1000,CUT_WAVES])}
  if(c.hp>0){floatText(c.x,c.y-10,'פגיעה ב'+c.n+' ('+(Math.round(c.hp*10)/10)+'/'+HITS+')'+(c.kind==='city'?' · הכנסה −'+Math.round(CUT*k*100)+'%'+(sh?' 🛡':''):''),'#ff7070');return}
  c.dead=true;boom(c.x,c.y,9,'#ff4a1a');S.shake=1;
  if(c.kind==='base'){banner('בסיס '+c.n+' הושמד ✈✕');for(const j of S.jets)if(j.alive&&j.base===c){if(j.state==='rearm'){j.state='rtb';j.rearmT=0}j.base=null}renderJets()}
  else{const left=S.cities.filter(x=>!x.dead).length;banner(c.n+' הושמדה · נותרו '+left+' ערים');if(!left)gameOver(false)}}
function addScore(p){S.score=Math.round(S.score+p*DIFF[S.diff].score)}
function kill(t,byJet,ally){if(t.dead)return;t.dead=true;S.stats.kills++;addScore(PTS[t.type]||10);if(ally){const c=COAL(ally);S.stats.allyKills=(S.stats.allyKills||0)+1;floatText(t.x,t.y,(c?c.flag:'')+' יירוט','#a9c8ff');return}const rw=TT[t.type].rw;S.budget+=rw;floatText(t.x,t.y,'+₪'+rw,'#7dffb2')}
function beamUpdate(tw,T,dt){
  if(tw.tgt&&(tw.tgt.dead||dist(tw,tw.tgt)>tRange(tw)||tw.tgt.alt>T.altMax)){tw.tgt.beamed=false;tw.tgt=null;tw.dw=0}
  if(!tw.tgt){if(tw.cd>0)return;let best=null,bs=1e9;
    for(const th of S.threats){if(th.dead||th.beamed||!T.dwell[th.type]||th.alt>T.altMax)continue;const d=dist(tw,th);if(d>tRange(tw))continue;const sc=d;if(sc<bs){bs=sc;best=th}}
    if(best){tw.tgt=best;best.beamed=true;tw.dw=0;if(!tw.owner)S.budget=Math.max(0,S.budget-T.shot);S.stats.shots++;tw.fired=(tw.fired||0)+1;tw.flash=.35}return}
  tw.dw+=dt;if(Math.random()<dt*12)S.parts.push({x:tw.tgt.x,y:tw.tgt.y,alt:tw.tgt.alt,vx:rnd(-20,20),vy:rnd(-20,20),life:.3,t:0,c:'#b6ffd0',sz:1.4});
  if(tw.dw>=tDwell(tw,tw.tgt.type)){kill(tw.tgt,false,tw.owner||'');boom(tw.tgt.x,tw.tgt.y,2.5,T.c,tw.tgt.alt);sfx('hit');tw.tgt.beamed=false;tw.tgt=null;tw.dw=0;tw.cd=tReload(tw)}}

// ---------- v6: Green Pine radar / Air Force strike / shelters ----------
function hideEl(id){const e=$(id);if(e&&e.classList)e.classList.add('hidden')}
function showEl(id){const e=$(id);if(e&&e.classList)e.classList.remove('hidden')}
function placeRadar(p){if(S.radars.length>=RADAR.max){hint('אפשר עד '+RADAR.max+' מכ״מים',1800);return false}if(S.budget<RADAR.cost){hint('אין מספיק תקציב',1500);return false}
  if(!canPlace(p)){hint('אפשר להציב רק בתוך שטח ישראל',1500);return false}
  S.budget-=RADAR.cost;const r={id:++S.radarSeq,kind:'radar',n:RADAR.n,x:p.x,y:p.y,dead:false,flash:0};S.radars.push(r);boom(p.x,p.y,1.5,'#5dff9a');S.stats.radars=(S.stats.radars||0)+1;
  const n=S.towers.filter(t=>!t.owner&&dist(t,r)<=RADAR.R).length;hint('📡 מכ״ם הוצב: '+n+' סוללות בטווח '+RADAR.R+' ק״מ מקבלות +20% טווח, ואיומים מזוהים מוקדם יותר',3500);radSel=r;updateUI();return true}
function repairRadar(r){if(!r||!r.dead)return false;if(S.budget<RADAR.repair){hint('אין מספיק תקציב לתיקון (₪'+RADAR.repair+')',1600);return false}S.budget-=RADAR.repair;r.dead=false;r.flash=1;boom(r.x,r.y,2,'#5dff9a');hint('📡 המכ״ם תוקן והבונוס חזר',2200);updateUI();renderV6();return true}
function buildShelter(c){if(!c||c.kind!=='city'||c.dead||c.shelter)return false;if(S.budget<SHELTER.cost){hint('אין מספיק תקציב (₪'+SHELTER.cost+')',1600);return false}S.budget-=SHELTER.cost;c.shelter=true;S.stats.shelters=(S.stats.shelters||0)+1;boom(c.x,c.y,2,'#7dffb2');hint('🛡 מרחבים מוגנים ב'+c.n+': פגיעה שם מורידה חצי מהנזק וחצי מאובדן ההכנסה',3000);updateUI();renderV6();if(!S.inWave)saveGame();return true}
// Air Force strike: one per break between waves, ₪500 (v7; was ₪800), 2 F-35s; each strike risks one plane (15%), which returns after 3 waves
function iafPlanes(){return Math.max(0,IAF.fleet-S.iaf.lost.filter(w=>S.wave<w+IAF.back).length)}
function canStrike(){return !S.inWave&&!S.over&&S.wave>=1&&S.wave<lastWave()&&S.iaf.last!==S.wave&&iafPlanes()>0}
function iafStrike(key){const t=IAFT(key);if(!t||!canStrike())return null;if(S.budget<IAF.cost){hint('אין מספיק תקציב לתקיפה (₪'+IAF.cost+')',1800);return null}
  S.budget-=IAF.cost;S.iaf.last=S.wave;S.iaf.n=(S.iaf.n||0)+1;S.iaf.mods.push({k:key,from:S.wave+1,to:S.wave+t.waves});S.iaf.mods=S.iaf.mods.filter(m=>m.to>=S.wave+1);
  const lost=Math.random()<IAF.loss;if(lost)S.iaf.lost.push(S.wave);S.stats.iafStrikes=(S.stats.iafStrikes||0)+1;if(lost)S.stats.iafLost=(S.stats.iafLost||0)+1;
  const from=P(IAF.base[0],IAF.base[1]),to=P(t.lon,t.lat);S.fx.push({kind:'raid',fx:from.x,fy:from.y,tx:to.x,ty:to.y,t:0,dur:2.6,lost,done:false});
  closeV6();camTo('theater');
  const res={target:key,lost,planes:iafPlanes()};S.iaf.lastRes=res;
  res.msg='✈ התקיפה הצליחה: '+t.fx+'.'+(lost?' F-35 אחד הופל, יחזור בעוד '+IAF.back+' גלים (נשארו '+iafPlanes()+').':' שני המטוסים חזרו בשלום.');S.fx[S.fx.length-1].msg=res.msg;S.fx[S.fx.length-1].title='✈ תקיפת ח״א: '+t.n+' נפגעו!';
  hint('✈ שני מטוסי F-35 בדרך אל '+t.n+'…',2400);updateUI();saveGame();return res}
function fxUpdate(dt){for(const f of S.fx){f.t+=dt;if(f.kind==='raid'&&!f.done&&f.t>=f.dur){f.done=true;boom(f.tx,f.ty,8,'#ffb040');S.shake=Math.min(1,S.shake+.3);if(f.lost)floatText(f.tx,f.ty,'F-35 הופל','#ff7070');else floatText(f.tx,f.ty,'פגיעה!','#ffd08a');if(f.title){banner(f.title);hint(f.msg,6000)}}}
  S.fx=S.fx.filter(f=>f.t<f.dur+1.5)}
let radSel=null,v6Sel=null,v6WasPaused=false,v6At=-1e9;
function openV6(kind,o){v6At=performance.now();if(!v6Sel){v6WasPaused=S.paused;S.paused=true;$('btnPause').textContent='▶'}v6Sel={kind,o};if(kind==='radar')radSel=o;renderV6();showEl('v6Panel');return true}
function closeV6(){if(!v6Sel)return;v6Sel=null;hideEl('v6Panel');S.paused=v6WasPaused;$('btnPause').textContent=S.paused?'▶':'❚❚'}
function renderV6(){const el=$('v6Panel');if(!el||!v6Sel)return;let h='';const k=v6Sel.kind,o=v6Sel.o;
  if(k==='city'){const base=Math.round(cityBase(o)*DIFF[S.diff].bonus),cut=Math.round(cityCut(o)*100);
    h='<div class="v6h"><b>🏙 '+o.n+'</b><button class="upx" data-v6x="1" aria-label="סגור">✕</button></div>'+
      '<p>הכנסה בסוף כל גל: <b>₪'+cityIncome(o)+'</b>'+(cut?' <span class="bad">(−'+cut+'% מפגיעות)</span>':'')+' מתוך ₪'+base+' · '+(o.dead?'העיר הושמדה':'עמידות '+o.hp+'/'+HITS)+'</p>'+
      (o.shelter?'<p class="ok">🛡 יש מרחבים מוגנים: פגיעה כאן מורידה חצי עמידות ו-10% הכנסה (במקום 20%).</p>':
       o.dead?'':'<p>🛡 <b>מרחבים מוגנים</b>: כל פגיעה מורידה רק חצי מהעמידות וחצי מאובדן ההכנסה.</p><button class="v6b'+(S.budget<SHELTER.cost?' poor':'')+'" data-v6="shelter">בנה מרחבים מוגנים · ₪'+SHELTER.cost+'</button>')}
  else if(k==='radar'){h='<div class="v6h"><b>📡 '+RADAR.n+'</b><button class="upx" data-v6x="1" aria-label="סגור">✕</button></div>'+
      (o.dead?'<p class="bad">המכ״ם נפגע מטיל שיוט: אין בונוס עד שיתוקן.</p><button class="v6b'+(S.budget<RADAR.repair?' poor':'')+'" data-v6="repair">תקן · ₪'+RADAR.repair+'</button>':
       '<p>סוללות שלכם בטווח '+RADAR.R+' ק״מ (הטבעת הירוקה): <b>+20% טווח</b> · עכשיו '+S.towers.filter(t=>!t.owner&&dist(t,o)<=RADAR.R).length+' סוללות.</p><p>זיהוי מוקדם של איומים עד '+RADAR.det+' ק״מ. איראן עלולה לשלוח טיל שיוט על המכ״ם.</p>')}
  else if(k==='iaf'){const pl=iafPlanes(),ok=canStrike();
    h='<div class="v6h"><b>✈ תקיפת ח״א · ₪'+IAF.cost+'</b><button class="upx" data-v6x="1" aria-label="סגור">✕</button></div>'+
      '<p>מטוסי F-35: '+'✈'.repeat(pl)+'<span class="dim">'+'✈'.repeat(IAF.fleet-pl)+'</span> ('+pl+'/'+IAF.fleet+') · סיכון '+Math.round(IAF.loss*100)+'% לאבד מטוס · תקיפה אחת בכל הפסקה</p>'+
      IAF.targets.map(t=>'<button class="v6t'+(!ok||S.budget<IAF.cost?' poor':'')+'" data-v6="strike:'+t.key+'"><b>'+t.ic+' '+t.n+'</b><small>'+t.fx+(t.key==='hezbollah'?' ('+lebanonRockets(S.wave+1)+' בגל הבא)':'')+'</small></button>').join('')+
      (pl?'':'<p class="bad">אין מטוסים זמינים: מטוס שהופל חוזר אחרי '+IAF.back+' גלים.</p>')}
  el.innerHTML=h}
function iafBtn(){const b=$('btnIaf');if(!b||!b.classList)return;const show=!S.inWave&&!S.over&&S.started&&S.wave>=1&&S.wave<lastWave();b.classList.toggle('hidden',!show);
  b.classList.toggle('used',S.iaf.last===S.wave||!iafPlanes());b.textContent=S.iaf.last===S.wave?'✈ תקיפה בוצעה':!iafPlanes()?'✈ אין מטוסים':'✈ תקיפת ח״א ₪'+IAF.cost}
function showEco(){const e=S.eco,el=$('ecoPanel');if(!e||!el||!el.classList)return;
  el.innerHTML='<div class="v6h"><b>💰 סיכום גל '+e.wave+'</b><button class="upx" data-ecox="1" aria-label="סגור">✕</button></div>'+
    e.rows.filter(r=>!r.dead||r.base).map(r=>'<div class="erow'+(r.dead?' dead':'')+'"><span>'+(r.shelter?'🛡':'')+r.n+'</span><b>'+(r.dead?'—':'₪'+r.v)+'</b>'+(r.cut&&!r.dead?'<i>−'+r.cut+'%</i>':'')+'</div>').join('')+
    '<div class="erow sum"><span>🏙 ערים</span><b>₪'+e.cities+'</b></div><div class="erow"><span>בונוס גל</span><b>₪'+e.bonus+'</b></div>'+(e.coal?'<div class="erow"><span>💵 קואליציה</span><b>₪'+e.coal+'</b></div>':'')+
    '<div class="erow tot"><span>סה״כ לתקציב</span><b>₪'+e.total+'</b></div><div class="enote">לקופה המשותפת: ₪'+e.pool+'</div>';el.classList.remove('hidden')}

// ---------- v4: coalition (US joins defensively, buys batteries, pays in installments) ----------
function cbaseOf(tw){return S.cbases.find(b=>b.key===tw.base)}
// coalition batteries are drawn as a small row under their base marker (their world position is next to the base)
function towerScreen(t){if(!t.owner)return w2s(t.x,t.y);const b=cbaseOf(t);if(!b)return w2s(t.x,t.y);const row=S.towers.filter(x=>x.base===t.base),i=row.indexOf(t),p=w2s(b.x,b.y);return {x:p.x+(i-(row.length-1)/2)*17,y:p.y+19}}
// v5: bases activate one by one (each base has its own join wave: the carriers come at wave 6)
const cbOn=b=>b.on&&(S.coal[b.country]||{}).joined;
function activateBase(b){const c=COAL(b.country),def=c.bases.find(x=>x.key===b.key);b.on=true;
  if(!S.towers.some(t=>t.base===b.key&&!t.sold))def.bat.forEach((type,i)=>{const a=i*2.4+.6;S.towers.push({type,x:b.x+Math.cos(a)*7,y:b.y+Math.sin(a)*7,ammo:TW[type].mag,cd:0,refT:0,tgt:null,dw:0,owner:c.key,base:b.key})});
  b.flash=1;boom(b.x,b.y,4,'#3c78ff')}
function coalitionJoin(){const now=[],later=[];for(const c of COALITION){if(!(S.coal[c.key]||{}).joined&&S.wave>=c.join){S.coal[c.key]={joined:true,at:S.wave};now.push(c)}
    if(!(S.coal[c.key]||{}).joined)continue;
    for(const b of S.cbases.filter(b=>b.country===c.key&&!b.on&&S.wave>=b.join)){activateBase(b);if(!now.includes(c))later.push(b)}}
  S.basesJoined=later;return now}function payInstallments(){let sum=0;for(const p of S.payments){if(p.left<=0)continue;S.budget+=p.per;sum+=p.per;p.left--;p.paid=(p.paid||0)+1}S.payments=S.payments.filter(p=>p.left>0);return sum}
function offerText(o){const c=COAL(o.country),T=TW[o.type];return c.flag+' '+c.n+' מבקשת לקנות סוללת '+T.n+' ב-×'+c.mult+' מהמחיר: ₪'+o.price+' (עלתה לכם ₪'+T.cost+'; סוללה משודרגת שווה יותר: המחיר + השדרוגים ×'+c.mult+'). התשלום ב-'+o.n+' פעימות של ₪'+o.per+' בסוף כל אחד מ-'+o.n+' הגלים הבאים. הסוללה עוברת לאחד הבסיסים שלהם וממשיכה ליירט משם.'}
function coalitionOffer(){if(S.over||S.offer||S.wave>=lastWave())return null;
  // v6: with several countries due in the same break, the one asked least recently goes first
  const order=COALITION.map((c,i)=>[c,i]).sort((a,b)=>(((S.coal[a[0].key]||{}).lastOffer??-1)-((S.coal[b[0].key]||{}).lastOffer??-1))||a[1]-b[1]).map(x=>x[0]);
  for(const c of order){const st=S.coal[c.key];if(!st||!st.joined||S.wave<c.join||(S.wave-c.join)%c.every!==0||st.lastOffer===S.wave)continue;
    const owned=c.buys.filter(t=>S.towers.some(tw=>!tw.owner&&tw.type===t));if(!owned.length)continue;st.lastOffer=S.wave;
    const type=owned.sort((a,b)=>S.towers.filter(t=>!t.owner&&t.type===b).length-S.towers.filter(t=>!t.owner&&t.type===a).length)[0];
    const price=Math.round(TW[type].cost*c.mult);S.offer={country:c.key,type,price,per:Math.round(price/c.installments),n:c.installments,wave:S.wave};showOffer();return S.offer}return null}
function showOffer(){const o=S.offer,el=$('offer');if(!o||!el||!el.classList)return;const c=COAL(o.country);$('offerTitle').textContent=c.flag+' בקשת רכש מ'+c.n;$('offerText').textContent=offerText(o);el.classList.remove('hidden')}
function closeOffer(accepted,quiet){const el=$('offer');if(el&&el.classList)el.classList.add('hidden');const sb=$('sellBar');if(sb&&sb.classList)sb.classList.add('hidden');
  if(!accepted&&S.offer&&!quiet)hint(COAL(S.offer.country).n+': הבנו, אולי בפעם הבאה',2000);if(!accepted){S.offer=null;S.sellMode=null}}
function acceptOffer(){if(!S.offer)return false;S.sellMode=S.offer;const el=$('offer');if(el&&el.classList)el.classList.add('hidden');const sb=$('sellBar');if(sb&&sb.classList){$('sellText').textContent='הקישו על סוללת '+TW[S.offer.type].n+' שתרצו למכור ('+COAL(S.offer.country).flag+' ₪'+S.offer.price+(S.towers.some(t=>!t.owner&&t.type===S.offer.type&&upTotal(t))?', משודרגת: יותר':'')+')';sb.classList.remove('hidden')}
  if(view!=='israel')camTo('israel');return true}
function sellTower(tw){const o=S.sellMode||S.offer;if(!o||!tw||tw.owner||tw.type!==o.type)return false;const c=COAL(o.country);
  const bases=S.cbases.filter(b=>b.country===c.key&&b.on&&!b.carrier).sort((a,b)=>S.towers.filter(t=>t.base===a.key&&t.sold).length-S.towers.filter(t=>t.base===b.key&&t.sold).length||(a.hits-b.hits));const b=bases[0];
  const k=S.towers.filter(t=>t.base===b.key).length;const a=k*1.25+.3;tw.x=b.x+Math.cos(a)*(9+k);tw.y=b.y+Math.sin(a)*(9+k);tw.owner=c.key;tw.base=b.key;tw.sold=true;tw.tgt=null;if(tw.type==='beam')tw.dw=0;
  const price=salePrice(tw,c),per=Math.round(price/o.n);S.payments.push({country:c.key,type:tw.type,per,left:o.n,total:price});if(upSel===tw)closeUp();S.stats.sold=(S.stats.sold||0)+1;S.offer=null;S.sellMode=null;closeOffer(true);boom(b.x,b.y,3,'#3c78ff');
  banner(c.flag+' '+TW[tw.type].n+' נמכרה ל'+c.n+' · מוצבת ב'+b.n+' · ₪'+per+' × '+o.n+' בסוף הגלים הבאים'+(upTotal(tw)?' (כולל שדרוגים)':''));updateUI();saveGame();return true}
function salePrice(tw,c){return Math.round((TW[tw.type].cost+upSpent(tw))*c.mult)}
function towerInfo(tw){const T=TW[tw.type],c=tw.owner?COAL(tw.owner):null,b=c?cbaseOf(tw):null,cap=b?capBase(b,effW()):1;
  const pk=T.pk?Object.keys(T.pk).map(k=>TT[k].n+' '+Math.round(tPk(tw,k)*100)+'%').join(', '):Object.keys(T.dwell||{}).map(k=>TT[k].n).join(', ')+' (לייזר: יירוט ודאי אחרי זמן חימום)';
  return (c?c.flag+' ':'')+T.n+(b?' · '+b.n+(cap<=0?' · מושבתת':cap<1?' · 50%':''):'')+' · טווח '+Math.round(tRange(tw))+' ק״מ · סיכוי יירוט: '+pk+(T.mag===Infinity?'':' · מחסנית '+tMag(tw)+' (טעינה '+tRefill(tw).toFixed(1)+' שנ׳)')+(upTotal(tw)?' · '+'★'.repeat(Math.min(4,upTotal(tw)))+(upTotal(tw)>4?upTotal(tw):''):'')+(c?'':' · '+(T.mag===Infinity?'₪1 לירייה':'₪'+T.shot+' ליירוט'))}
function cbaseInfo(b){const c=COAL(b.country),cap=capBase(b,effW());return c.flag+' '+b.n+' ('+b.cn+') · '+(cap<=0?'נפגע: הסוללות מושבתות, חוזר לפעולה בגל '+(b.struck+BASE_BACK):'פעיל')+' · '+S.towers.filter(t=>t.base===b.key).map(t=>TW[t.type].n).join(', ')}

// ---------- v5: upgrade panel (tap one of your batteries) ----------
let upSel=null,upWasPaused=false;
function upValue(tw,k,lv,nx){const save=tw.up;tw.up=Object.assign({range:0,rate:0,hit:0,mag:0},save||{});tw.up[k]=lv;const T=TW[tw.type];let v;
  if(k==='range')v=Math.round(tRange(tw))+' ק״מ';
  else if(k==='rate')v='ירי '+tReload(tw).toFixed(2)+' שנ׳'+(T.mag===Infinity?'':' · טעינה '+tRefill(tw).toFixed(1));
  else if(k==='hit')v=T.pk?(nx?'עוד 5% לכל איום':Object.keys(T.pk).sort((a,b)=>T.pk[b]-T.pk[a]).slice(0,2).map(t=>TT[t].n+' '+Math.round(tPk(tw,t)*100)+'%').join(' · ')):'חימום '+Math.round((1-.15*lv)*100)+'%';
  else v=tMag(tw)+' מיירטים';tw.up=save;return v}
function upgrade(tw,k){if(!tw||tw.owner||!upTracks(tw).includes(k))return false;const l=upLv(tw,k);
  if(l>=UPG_MAX){hint('המסלול הזה כבר ברמה המקסימלית',1500);return false}const c=upCost(tw,k);if(S.budget<c){hint('אין מספיק תקציב לשדרוג (₪'+c+')',1600);return false}
  const oldMag=tMag(tw);S.budget-=c;tw.up=Object.assign({range:0,rate:0,hit:0,mag:0},tw.up||{});tw.up[k]=l+1;if(k==='mag'&&tw.ammo>0)tw.ammo+=tMag(tw)-oldMag;
  S.stats.upgrades=(S.stats.upgrades||0)+1;boom(tw.x,tw.y,1.4,'#ffd84a');updateUI();renderUp();if(!S.inWave)saveGame();return true}
function renderUp(){const el=$('upPanel');if(!el||!upSel)return;const tw=upSel,T=TW[tw.type];
  let h='<div class="uphead"><b>'+T.n+'</b> '+(upTotal(tw)?'<span class="upstars">'+'★'.repeat(upTotal(tw))+'</span>':'')+'<button class="upx" data-upx="1" aria-label="סגור">✕</button></div>';
  for(const k of upTracks(tw)){const l=upLv(tw,k),c=upCost(tw,k),max=l>=UPG_MAX;
    h+='<div class="uprow"><span class="upn">'+UPG[k].ic+' '+(k==='hit'&&!T.pk?'זמן חימום':UPG[k].n)+'</span><span class="uppips">'+'●'.repeat(l)+'○'.repeat(UPG_MAX-l)+'</span>'+
      '<span class="upv">'+upValue(tw,k,l)+(max?'':'<br><i>← '+upValue(tw,k,l+1,1)+'</i>')+'</span>'+
      '<button class="upb'+(max?' max':S.budget<c?' poor':'')+'" data-up="'+k+'"'+(max?' disabled':'')+'>'+(max?'מקס׳':'₪'+c)+'</button></div>'}
  const us=COAL('us');h+='<div class="upfoot">הושקע בשדרוגים: ₪'+upSpent(tw)+' · שווי במכירה לקואליציה: ₪'+salePrice(tw,us)+'</div>';el.innerHTML=h}
function openUp(tw){if(!tw||tw.owner)return false;{const p=w2s(tw.x,tw.y);if(p.x<SW*.58){cam.tx=cam.x-(SW*.66-p.x)/cam.s;cam.ty=cam.y;cam.ts=cam.s;cam.anim=true}}if(!upSel){upWasPaused=S.paused;S.paused=true;$('btnPause').textContent='▶'}upSel=tw;selType=null;renderUp();const el=$('upPanel');if(el&&el.classList)el.classList.remove('hidden');updateUI();return true}
function closeUp(){if(!upSel)return;upSel=null;const el=$('upPanel');if(el&&el.classList)el.classList.add('hidden');S.paused=upWasPaused;$('btnPause').textContent=S.paused?'▶':'❚❚'}

// ---------- air force ----------
function aliveBases(){return S.bases.filter(b=>b.active&&!b.dead)}
function baseFor(type){const pref=S.bases[type==='f15'?0:1];if(pref&&pref.active&&!pref.dead)return pref;return aliveBases()[0]||null}
function nearestBase(j){let best=null,bd=1e9;for(const b of aliveBases()){const d=dist(j,b);if(d<bd){bd=d;best=b}}return best}
function buyJet(type){const J=JT[type];if(S.wave<AIR_WAVE&&!(S.wave===AIR_WAVE-1&&!S.inWave)){hint('חיל האוויר נפתח בגל '+AIR_WAVE,2000);return null}
  const b=baseFor(type);if(!b){hint('אין בסיס חיל אוויר פעיל להמראה',2000);return null}
  if(S.budget<J.cost){hint('אין מספיק תקציב',1500);return null}S.budget-=J.cost;
  const j={id:++S.jetSeq,type,base:b,x:b.x,y:b.y,h:-Math.PI/4,ammo:J.ammo,state:'patrol',px:P(37.6,32.2).x+rnd(-40,40),py:P(37.6,32.2).y+rnd(-40,40),orb:rnd(0,6),tgt:null,cd:0,trail:[],alive:true,rearmT:0,detected:0};
  S.jets.push(j);selJet=j.id;renderJets();hint(J.n+' המריא מ'+b.n+'. הקישו על המפה לסיור, או על אתר אויב לתקיפה',3500);updateUI();return j}
function steer(j,gx,gy,dt,spd){const want=Math.atan2(gy-j.y,gx-j.x);let da=want-j.h;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;j.h+=clamp(da,-2.6*dt,2.6*dt);
  j.x+=Math.cos(j.h)*spd*dt;j.y+=Math.sin(j.h)*spd*dt}
function jetsUpdate(dt){
  for(const j of S.jets){if(!j.alive)continue;const J=JT[j.type];if(!j.base||j.base.dead)j.base=nearestBase(j);const base=j.base;j.cd-=dt;
    if(!base&&(j.state==='rtb'||j.state==='rearm')){j.state='patrol';j.next='patrol';renderJets()}
    if(j.state==='rearm'){j.rearmT+=dt;if(j.rearmT>=4){j.ammo=J.ammo;j.rearmT=0;j.state=j.next||'patrol';renderJets()}continue}
    if(j.state==='rtb'){steer(j,base.x,base.y,dt,J.spd);if(dist(j,base)<12){j.state='rearm';j.x=base.x;j.y=base.y;renderJets()}}
    else if(j.state==='patrol'){j.orb+=dt*J.spd/40;const gx=j.px+Math.cos(j.orb)*35,gy=j.py+Math.sin(j.orb)*35;steer(j,gx,gy,dt,J.spd);
      if(j.ammo<=0){if(base){j.state='rtb';j.next='patrol';renderJets()}}
      else if(j.cd<=0){let best=null,bd=140;for(const th of S.threats){if(th.dead||BAL[th.type]||th.eng>=1)continue;const d=dist(j,th);if(d<bd){bd=d;best=th}}
        if(best){j.cd=1.1;j.ammo--;best.eng++;S.shots.push({x:j.x,y:j.y,alt:.1,tgt:best,spd:320,pk:best.type==='cruise'?.75:.9,c:'#e8f4ff',trail:[],life:0,from:'jet'});renderJets();sfx('launch')}}}
    else if(j.state==='strike'){const t=j.tgt;const gone=!t||(t.kind==='sam'&&!t.o.alive);
      if(gone){j.state='rtb';j.next='patrol';renderJets()}
      else{if(j.ammo<2){if(base){j.state='rtb';j.next='strike'}else{j.state='patrol';j.tgt=null}renderJets()}else{steer(j,t.o.x,t.o.y,dt,J.spd);
        if(dist(j,t.o)<45&&!t.released){t.released=true;j.ammo-=2;S.bombs.push({x:j.x,y:j.y,t:t,trail:[]});renderJets()}
        if(t.released){j.state='rtb';j.next='patrol';renderJets()}}}}
    j.trail.push({x:j.x,y:j.y});if(j.trail.length>22)j.trail.shift();j.detected=Math.max(0,j.detected-dt)}
  for(const b of S.bombs){if(b.done)continue;const o=b.t.o;const dx=o.x-b.x,dy=o.y-b.y,l=Math.hypot(dx,dy);const st=230*dt;
    if(l<=st+2){b.done=true;boom(o.x,o.y,7,'#ffb040');sfx('boom');S.stats.strikes++;
      if(b.t.kind==='sam'){o.alive=false;S.budget+=200;floatText(o.x,o.y,'סוללת נ״מ הושמדה +₪200','#7dffb2')}
      else{o.struck=S.wave;o.hitFlash=1;S.budget+=150;addScore(50);floatText(o.x,o.y,'אתר '+o.n+' הושמד +₪150','#7dffb2')}continue}
    b.x+=dx/l*st;b.y+=dy/l*st;b.trail.push({x:b.x,y:b.y});if(b.trail.length>10)b.trail.shift()}
  S.bombs=S.bombs.filter(b=>!b.done)}
function samUpdate(dt){if(S.wave<AIR_WAVE)return;
  for(const s of S.sams){if(!s.alive)continue;s.cd-=dt;
    for(const j of S.jets){if(!j.alive||j.state==='rearm')continue;if(dist(s,j)>s.range)continue;
      if(Math.random()<JT[j.type].detect*dt*1.2){j.detected=1.2}
      if(j.detected>0&&s.cd<=0){s.cd=3.2;S.samMissiles.push({x:s.x,y:s.y,j,life:0,trail:[]});sfx('launch')}}}
  for(const m of S.samMissiles){if(m.done)continue;m.life+=dt;const j=m.j;if(!j.alive||m.life>5){m.done=true;continue}
    const dx=j.x-m.x,dy=j.y-m.y,l=Math.hypot(dx,dy),st=240*dt;
    if(l<=st+3){m.done=true;if(Math.random()<JT[j.type].hit){j.alive=false;S.stats.jetsLost++;boom(j.x,j.y,6,'#ff5a2a',.1);floatText(j.x,j.y,JT[j.type].n+' הופל','#ff7070');sfx('boom');if(selJet===j.id)selJet=null;renderJets()}
      else{boom(j.x,j.y,1.5,'#fff',.1);floatText(j.x,j.y,'התחמק','#cfe3f5')}continue}
    m.x+=dx/l*st;m.y+=dy/l*st;m.trail.push({x:m.x,y:m.y});if(m.trail.length>12)m.trail.shift()}
  S.samMissiles=S.samMissiles.filter(m=>!m.done)}

// ---------- drawing ----------
function altOff(alt){return alt*clamp(110*cam.s,18,80)}
function drawMap(){const c=mctx;c.setTransform(DPR,0,0,DPR,0,0);c.fillStyle='#04101c';c.fillRect(0,0,SW,SH);
  c.save();c.translate(SW/2,SH/2);c.scale(cam.s,cam.s);c.translate(-cam.x,-cam.y);
  if(mapReady){c.drawImage(mapImg,W0.x,W0.y,W1.x-W0.x,W1.y-W0.y)}
  c.fillStyle='rgba(2,8,16,.32)';c.fillRect(W0.x,W0.y,W1.x-W0.x,W1.y-W0.y);
  const lw=1/cam.s;
  // grid
  c.strokeStyle='rgba(120,200,255,.07)';c.lineWidth=lw;c.beginPath();
  for(let lo=25;lo<=65;lo+=5){const a=P(lo,45),b=P(lo,8);c.moveTo(a.x,a.y);c.lineTo(b.x,b.y)}
  for(let la=10;la<=45;la+=5){const a=P(22,la),b=P(66,la);c.moveTo(a.x,a.y);c.lineTo(b.x,b.y)}c.stroke();
  for(const k of countries){if(k.iso==='ISR'){c.fillStyle='rgba(40,150,255,.30)';c.fill(k.path)}else if(k.iso==='IRN'){c.fillStyle='rgba(255,40,40,.07)';c.fill(k.path)}else if(k.iso==='PSE'){c.fillStyle='rgba(40,150,255,.10)';c.fill(k.path)}}
  c.lineJoin='round';
  for(const k of countries){c.strokeStyle='rgba(110,200,255,.18)';c.lineWidth=3.2*lw;c.stroke(k.path);c.strokeStyle='rgba(150,220,255,.55)';c.lineWidth=.8*lw;c.stroke(k.path)}
  if(ISR){c.strokeStyle='rgba(80,190,255,.45)';c.lineWidth=5*lw;c.stroke(ISR.path);c.strokeStyle='#bfe9ff';c.lineWidth=1.4*lw;c.stroke(ISR.path)}
  const irn=countries.find(k=>k.iso==='IRN');if(irn){c.strokeStyle='rgba(255,90,90,.35)';c.lineWidth=4*lw;c.stroke(irn.path)}
  c.restore();
  // labels
  c.textAlign='center';c.textBaseline='middle';c.direction='rtl';
  for(const L of LABELS){const p=w2s(L.x,L.y);if(L.k===2&&cam.s<.6)continue;
    const fs=L.k===1?Math.max(12,Math.min(20,cam.s*30)):L.k===3?12:Math.max(11,Math.min(18,cam.s*40));
    c.font=(L.k===3?'italic ':'600 ')+fs+'px system-ui,sans-serif';c.fillStyle=L.k===3?'rgba(140,200,255,.45)':L.k===1?'rgba(190,235,255,.9)':'rgba(220,235,250,.55)';
    c.fillText(L.t,p.x,p.y)}
  // vignette
  const g=c.createRadialGradient(SW/2,SH/2,Math.min(SW,SH)*.35,SW/2,SH/2,Math.max(SW,SH)*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,4,10,.55)');c.fillStyle=g;c.fillRect(0,0,SW,SH);
  mapDirty=false}
function drawPips(c,p,far){const n=HITS,gap=far?4:5.5,r=far?1.3:1.8,y=p.y+(far?9:12);const x0=p.x-(n-1)*gap/2;
  for(let i=0;i<n;i++){ctx.beginPath();ctx.arc(x0+i*gap,y,r,0,6.283);ctx.fillStyle=i<c.hp?(c.hp>3?'#7dffb2':c.hp>1?'#ffd04a':'#ff5050'):'rgba(255,255,255,.18)';ctx.fill()}}
function glowLine(pts,color,w,raise){if(pts.length<2)return;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=1;i<pts.length;i++){const a=w2s(pts[i-1].x,pts[i-1].y),b=w2s(pts[i].x,pts[i].y);const ao=raise?altOff(pts[i-1].alt||0):0,bo=raise?altOff(pts[i].alt||0):0;
    ctx.globalAlpha=i/pts.length*.9;ctx.lineWidth=w*(.4+.6*i/pts.length);ctx.beginPath();ctx.moveTo(a.x,a.y-ao);ctx.lineTo(b.x,b.y-bo);ctx.stroke()}ctx.globalAlpha=1}
function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(mapDirty)drawMap();
  const sh=S.shake*6;ctx.save();if(sh>0)ctx.translate(rnd(-sh,sh),rnd(-sh,sh));
  ctx.drawImage(mapLayer,0,0,SW,SH);
  ctx.textAlign='center';ctx.textBaseline='middle';
  // radar sweep around Israel
  const ta=w2s(S.cities[0].x,S.cities[0].y);const ang=(S.time*0.9)%6.283;
  if(ctx.createConicGradient){const R=Math.max(SW,SH)*1.2;const g=ctx.createConicGradient(ang,ta.x,ta.y);g.addColorStop(0,'rgba(60,200,255,.10)');g.addColorStop(.06,'rgba(60,200,255,0)');g.addColorStop(1,'rgba(60,200,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(ta.x,ta.y,R,0,6.283);ctx.fill()}
  // SAM sites
  if(S.wave>=AIR_WAVE-1||selJet){for(const s of S.sams){const p=w2s(s.x,s.y);const r=s.range*cam.s;
    if(!s.alive){ctx.fillStyle='rgba(120,120,120,.8)';ctx.font='12px sans-serif';ctx.fillText('✕',p.x,p.y);continue}
    ctx.strokeStyle='rgba(255,80,80,.35)';ctx.setLineDash([4,5]);ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,r,0,6.283);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(255,60,60,.05)';ctx.fill();
    ctx.strokeStyle='rgba(255,90,90,.5)';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(s.ang)*r,p.y+Math.sin(s.ang)*r);ctx.stroke();
    ctx.fillStyle='#ff5050';ctx.beginPath();ctx.moveTo(p.x,p.y-6);ctx.lineTo(p.x+5,p.y+4);ctx.lineTo(p.x-5,p.y+4);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#ffd0d0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y-8,4,Math.PI*1.1,Math.PI*1.9);ctx.stroke()}}
  // launchers (v0.3: specialised, with strike recovery state)
  const ew=effW();
  for(const l of S.launchers){const p=w2s(l.x,l.y);const LT=LTYPES[l.kind];const cap=capAt(l,ew);const z=4.6;
    const sym=(col)=>{ctx.beginPath();if(l.kind==='B'){ctx.moveTo(p.x,p.y-z);ctx.lineTo(p.x+z*.95,p.y+z*.75);ctx.lineTo(p.x-z*.95,p.y+z*.75)}else if(l.kind==='C'){ctx.rect(p.x-z*.75,p.y-z*.75,z*1.5,z*1.5)}else{ctx.moveTo(p.x,p.y-z);ctx.lineTo(p.x+z*.85,p.y);ctx.lineTo(p.x,p.y+z);ctx.lineTo(p.x-z*.85,p.y)}ctx.closePath();ctx.fillStyle=col;ctx.fill()};
    const disc=(stroke,glow)=>{ctx.beginPath();ctx.arc(p.x,p.y,8.5,0,6.283);ctx.fillStyle='rgba(12,10,14,.88)';if(glow){ctx.shadowColor=stroke;ctx.shadowBlur=10}ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()};
    if(l.hitFlash>0){ctx.strokeStyle='rgba(255,180,80,'+l.hitFlash+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,10+(1-l.hitFlash)*30,0,6.283);ctx.stroke()}
    if(cap<=0){disc('#777',false);sym('#888');ctx.strokeStyle='#ff9b5a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-6,p.y-6);ctx.lineTo(p.x+6,p.y+6);ctx.moveTo(p.x+6,p.y-6);ctx.lineTo(p.x-6,p.y+6);ctx.stroke();
      ctx.fillStyle='rgba(60,60,60,.35)';for(let k=0;k<3;k++){const a=(l.smoke*0.5+k/3)%1;ctx.beginPath();ctx.arc(p.x+a*8,p.y-8-a*20,3+a*7,0,6.283);ctx.fill()}}
    else if(cap<1){disc('#ffb347',false);ctx.globalAlpha=.65;sym(LT.c);ctx.globalAlpha=1;
      ctx.strokeStyle='#ffb347';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,12.5,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.strokeStyle='rgba(255,179,71,.25)';ctx.beginPath();ctx.arc(p.x,p.y,12.5,Math.PI/2,Math.PI*1.5);ctx.stroke()}
    else{const pu=(S.time*2+p.x)%1;ctx.strokeStyle=LT.c;ctx.globalAlpha=(1-pu)*.7;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,9+pu*12,0,6.283);ctx.stroke();ctx.globalAlpha=1;
      disc(LT.c,true);sym(LT.c)}
    const zoomed=cam.s>.3;let y=p.y+l.ly;
    if(zoomed){ctx.font='600 11px system-ui,sans-serif';ctx.fillStyle='rgba(255,215,205,.92)';ctx.strokeStyle='rgba(0,0,0,.7)';ctx.lineWidth=3;const t=l.n+' · '+LT.short;ctx.strokeText(t,p.x,y);ctx.fillText(t,p.x,y);y+=(l.ly<0?-13:13)}
    if(cap<1){const t=cap<=0?(zoomed?'מושבת · 50% בגל '+(l.struck+2):'מושבת'):(zoomed?'בשיקום · 50% שיגורים':'בשיקום 50%');
      ctx.font='700 10px system-ui,sans-serif';ctx.fillStyle=cap<=0?'#ff9b7a':'#ffc46b';ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=3;const yy=zoomed?y:p.y+(l.ly<0?-15:16);ctx.strokeText(t,p.x,yy);ctx.fillText(t,p.x,yy)}}
  // tower ranges
  for(const t of S.towers){const T=TW[t.type];const p=towerScreen(t);const r=tRange(t)*cam.s;if(r>2000)continue;
    ctx.strokeStyle=T.c;ctx.globalAlpha=selType===t.type?.55:t.owner?.1:.18;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,r,0,6.283);ctx.stroke();ctx.globalAlpha=selType===t.type?.07:.03;ctx.fillStyle=T.c;ctx.fill();ctx.globalAlpha=1}
  // cities & air bases
  const far=cam.s<.42;
  for(const c of S.cities){const p=w2s(c.x,c.y);
    if(c.dead){ctx.fillStyle='rgba(70,60,55,.95)';ctx.strokeStyle='#ff6a3a';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(p.x,p.y,5,0,6.283);ctx.fill();
      ctx.beginPath();ctx.moveTo(p.x-4,p.y-4);ctx.lineTo(p.x+4,p.y+4);ctx.moveTo(p.x+4,p.y-4);ctx.lineTo(p.x-4,p.y+4);ctx.stroke();
      ctx.fillStyle='rgba(60,60,60,.35)';for(let k=0;k<3;k++){const a=(S.time*.4+k/3)%1;ctx.beginPath();ctx.arc(p.x+a*6,p.y-5-a*16,2+a*5,0,6.283);ctx.fill()}}
    else{const hpC=c.hp>3?'#7dffb2':c.hp>1?'#ffd04a':'#ff5050';
      ctx.fillStyle=c.flash>0?'rgba(255,80,40,'+c.flash+')':'rgba(255,255,255,.95)';ctx.shadowColor=hpC;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,4,0,6.283);ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle=hpC;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,7,0,6.283);ctx.stroke()}
    drawPips(c,p,far);
    if(!c.dead&&(c.shelter||(c.cuts&&c.cuts.length))){ctx.font='700 9px system-ui,sans-serif';ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=2.5;const cu=Math.round(cityCut(c)*100);const t=(c.shelter?'🛡':'')+(cu?' −'+cu+'%':'');ctx.fillStyle=cu?'#ff9a7a':'#9dffc0';ctx.strokeText(t,p.x,p.y+(far?17:21));ctx.fillText(t,p.x,p.y+(far?17:21))}
    const showLbl=!far||c.n==='תל אביב'||c.n==='אילת'||c.n==='ירושלים';
    if(showLbl){ctx.font='600 '+(far?10:cam.s>.5?13:11)+'px system-ui,sans-serif';ctx.textAlign=c.side<0?'right':'left';ctx.fillStyle=c.dead?'#ff9a7a':'#fff';ctx.strokeStyle='rgba(0,0,0,.75)';ctx.lineWidth=3;
      const lx=p.x+c.side*11;ctx.strokeText(c.n,lx,p.y);ctx.fillText(c.n,lx,p.y);ctx.textAlign='center'}}
  for(const b of S.bases){const p=w2s(b.x,b.y);const on=b.active&&!b.dead;
    if(b.wake>0){ctx.strokeStyle='rgba(60,200,255,'+b.wake+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,10+(1-b.wake)*40,0,6.283);ctx.stroke()}
    ctx.save();ctx.translate(p.x,p.y);
    ctx.fillStyle=b.dead?'rgba(70,60,55,.95)':on?'rgba(10,40,70,.95)':'rgba(30,40,50,.85)';ctx.strokeStyle=b.dead?'#ff6a3a':on?(b.flash>0?'#ff6a3a':'#3cc8ff'):'#6c7f90';ctx.lineWidth=1.6;
    if(on){ctx.shadowColor='#3cc8ff';ctx.shadowBlur=10}
    ctx.beginPath();ctx.rect(-7,-7,14,14);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    // runway
    ctx.strokeStyle=b.dead?'#776':on?'#cfefff':'#8899aa';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-5,4);ctx.lineTo(5,-4);ctx.stroke();
    if(b.dead){ctx.strokeStyle='#ff6a3a';ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(5,5);ctx.moveTo(5,-5);ctx.lineTo(-5,5);ctx.stroke()}
    ctx.restore();
    if(b.active||b.dead)drawPips(b,p,far);
    if(!far||b.wake>0){ctx.font='600 '+(far?10:11)+'px system-ui,sans-serif';ctx.textAlign='left';ctx.fillStyle=b.dead?'#ff9a7a':on?'#9fe3ff':'rgba(190,205,220,.8)';ctx.strokeStyle='rgba(0,0,0,.75)';ctx.lineWidth=3;
      const t=b.n+(b.dead?' (הושמד)':on?' ✈':' · רדום');ctx.strokeText(t,p.x+11,p.y);ctx.fillText(t,p.x+11,p.y);ctx.textAlign='center'}}
  // v4: coalition bases (out / 50% / full like the launch sites)
  for(const b of S.cbases){if(!cbOn(b))continue;const p=w2s(b.x,b.y),c=COAL(b.country),cap=capBase(b,ew);
    if(b.flash>0){b.flash=Math.max(0,b.flash-.02);ctx.strokeStyle='rgba(60,120,255,'+b.flash+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,10+(1-b.flash)*36,0,6.283);ctx.stroke()}
    ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=cap<=0?'rgba(70,60,55,.95)':'rgba(10,25,70,.95)';ctx.strokeStyle=cap<=0?'#ff8a5a':cap<1?'#ffb347':'#5d8cff';ctx.lineWidth=1.8;
    if(cap>=1){ctx.shadowColor='#3c78ff';ctx.shadowBlur=10}
    if(b.carrier){ctx.beginPath();ctx.moveTo(-15,-4);ctx.lineTo(13,-4);ctx.lineTo(16,0);ctx.lineTo(13,4);ctx.lineTo(-13,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#cfe0ff';ctx.lineWidth=1;ctx.setLineDash([3,2]);ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(11,0);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#cfe0ff';ctx.fillRect(5,-8,4,4)}
    else if(b.ship){ctx.beginPath();ctx.moveTo(-10,-3);ctx.lineTo(10,-3);ctx.lineTo(7,4);ctx.lineTo(-7,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#cfe0ff';ctx.fillRect(-2,-7,4,4)}
    else{ctx.beginPath();ctx.rect(-8,-8,16,16);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 10px system-ui';ctx.fillText('★',0,.5)}
    ctx.shadowBlur=0;if(cap<=0){ctx.strokeStyle='#ff8a5a';ctx.beginPath();ctx.moveTo(-6,-6);ctx.lineTo(6,6);ctx.moveTo(6,-6);ctx.lineTo(-6,6);ctx.stroke()}ctx.restore();
    {ctx.font='600 '+(far?10:11)+'px system-ui,sans-serif';ctx.fillStyle=cap<=0?'#ff9a7a':cap<1?'#ffc46b':'#b8ccff';ctx.strokeStyle='rgba(0,0,0,.75)';ctx.lineWidth=3;
      const t=c.flag+' '+b.n+(cap<=0?' · מושבת':cap<1?' · 50%':'');ctx.strokeText(t,p.x,p.y-15);ctx.fillText(t,p.x,p.y-15)}}
  // v6: Green Pine radars (coverage ring: faint, bright when selected) and Air Force strike animation
  for(const r of S.radars){const p=w2s(r.x,r.y),sel=radSel===r||selType==='radar',R=RADAR.R*cam.s;
    if(!r.dead){ctx.strokeStyle='#5dff9a';ctx.globalAlpha=sel?.7:.22;ctx.lineWidth=sel?2:1;ctx.setLineDash(sel?[]:[5,5]);ctx.beginPath();ctx.arc(p.x,p.y,R,0,6.283);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=sel?.08:.03;ctx.fillStyle='#5dff9a';ctx.fill();ctx.globalAlpha=1;
      const a=S.time*2.2;ctx.strokeStyle='rgba(93,255,154,.5)';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(a)*Math.min(R,60),p.y+Math.sin(a)*Math.min(R,60));ctx.stroke()}
    ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=r.dead?'rgba(70,60,55,.95)':'rgba(6,30,18,.95)';ctx.strokeStyle=r.dead?'#ff8a5a':'#5dff9a';ctx.lineWidth=2;if(!r.dead){ctx.shadowColor='#5dff9a';ctx.shadowBlur=10}
    ctx.beginPath();ctx.rect(-8,-6,16,12);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.beginPath();ctx.moveTo(-6,3);ctx.lineTo(6,-4);ctx.moveTo(-6,0);ctx.lineTo(6,-1);ctx.stroke();
    if(r.dead){ctx.strokeStyle='#ff8a5a';ctx.beginPath();ctx.moveTo(-7,-7);ctx.lineTo(7,7);ctx.moveTo(7,-7);ctx.lineTo(-7,7);ctx.stroke()}ctx.restore();
    if(r.dead||cam.s>.6){ctx.font='700 10px system-ui,sans-serif';ctx.fillStyle=r.dead?'#ff9a7a':'#9dffc0';ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=3;const t=r.dead?'מכ״ם פגוע · תקן ₪'+RADAR.repair:'אורן ירוק';ctx.strokeText(t,p.x,p.y+16);ctx.fillText(t,p.x,p.y+16)}}
  for(const f of S.fx){if(f.kind!=='raid')continue;const k=clamp(f.t/f.dur,0,1),back=f.t>f.dur?clamp((f.t-f.dur)/1.4,0,1):0;const a=w2s(f.fx,f.fy),b=w2s(f.tx,f.ty);
    ctx.strokeStyle='rgba(158,240,255,.35)';ctx.setLineDash([4,6]);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
    const ang=Math.atan2(b.y-a.y,b.x-a.x)+(back?Math.PI:0),u=back?1-back:k;
    for(let i=0;i<(back&&f.lost?1:2);i++){const off=(i-.5)*10;const x=a.x+(b.x-a.x)*u-Math.sin(ang)*off,y=a.y+(b.y-a.y)*u+Math.cos(ang)*off;ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.fillStyle='#9ef0ff';ctx.shadowColor='#9ef0ff';ctx.shadowBlur=8;
      ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-6,-6);ctx.lineTo(-3,0);ctx.lineTo(-6,6);ctx.closePath();ctx.fill();ctx.restore();ctx.shadowBlur=0}}
  // towers
  for(const t of S.towers){const T=TW[t.type];const p=towerScreen(t);
    ctx.fillStyle='rgba(5,15,25,.85)';ctx.strokeStyle=T.c;ctx.lineWidth=2;ctx.shadowColor=T.c;ctx.shadowBlur=10;ctx.beginPath();
    for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;ctx.lineTo(p.x+Math.cos(a)*8,p.y+Math.sin(a)*8)}ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle=T.c;ctx.font='bold 9px system-ui,sans-serif';ctx.fillText(TWL[t.type]||'?',p.x,p.y+.5);if(t.owner){ctx.fillStyle='#3c78ff';ctx.beginPath();ctx.arc(p.x+7,p.y-7,3,0,6.283);ctx.fill()}
    if(S.sellMode&&!t.owner&&t.type===S.sellMode.type){const pu=.5+.5*Math.sin(S.time*7);ctx.strokeStyle='rgba(255,224,80,'+(.5+.5*pu)+')';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,13+pu*4,0,6.283);ctx.stroke()}
    if(t.flash>0){ctx.globalAlpha=t.flash/.35;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,9+(.35-t.flash)*40,0,6.283);ctx.stroke();ctx.globalAlpha=1}
    if(T.mag!==Infinity){const f=t.ammo>0?t.ammo/tMag(t):t.refT/tRefill(t);ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(p.x-10,p.y-14,20,4);ctx.fillStyle=t.ammo>0?(f<.25?'#ffd04a':T.c):'#ff8a50';ctx.fillRect(p.x-10,p.y-14,20*f,4);
      if(t.ammo<=0){ctx.font='700 10px system-ui,sans-serif';ctx.fillStyle='#ffb070';ctx.strokeStyle='rgba(0,0,0,.85)';ctx.lineWidth=3;ctx.strokeText('טוען…',p.x,p.y-21);ctx.fillText('טוען…',p.x,p.y-21)}}
    if(!t.owner&&radarBoost(t)){ctx.fillStyle='#5dff9a';ctx.beginPath();ctx.arc(p.x-8,p.y-7,2.6,0,6.283);ctx.fill()}
    {const n=upTotal(t);if(n){ctx.font='700 9px system-ui,sans-serif';ctx.fillStyle='#ffd84a';ctx.strokeStyle='rgba(0,0,0,.85)';ctx.lineWidth=2.5;const st=n<=4?'★'.repeat(n):'★'+n;ctx.strokeText(st,p.x,p.y+14);ctx.fillText(st,p.x,p.y+14)}}
    if(upSel===t){ctx.strokeStyle='#ffe066';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(p.x,p.y,14,0,6.283);ctx.stroke();ctx.setLineDash([])}
    if(t.tgt){const q=w2s(t.tgt.x,t.tgt.y);const o=altOff(t.tgt.alt);ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(93,255,154,.35)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y-o);ctx.stroke();ctx.strokeStyle='#eafff1';ctx.lineWidth=1.3;ctx.stroke();ctx.globalCompositeOperation='source-over'}}
  ctx.globalCompositeOperation='lighter';
  // threats
  const BTR={ballistic:'rgba(255,90,60,.9)',mirv:'rgba(255,47,109,.95)',rv:'rgba(255,134,176,.9)',hyper:'rgba(255,92,240,.95)'},BSH={ballistic:'#ff4030',mirv:'#ff2f6d',rv:'#ff86b0',hyper:'#ff5cf0'};
  for(const th of S.threats){const T=TT[th.type];const p=w2s(th.x,th.y);const o=altOff(th.alt);
    if(!th.det){ctx.globalAlpha=.35;ctx.fillStyle='#ffb0a0';ctx.beginPath();ctx.arc(p.x,p.y-o,1.6,0,6.283);ctx.fill();ctx.globalAlpha=1;continue} // v6: not tracked yet (no radar reach): a faint blip
    if(BAL[th.type]){glowLine(th.trail,BTR[th.type],th.type==='rv'?2.2:3,true);ctx.fillStyle='rgba(0,0,0,.35)';ctx.globalCompositeOperation='source-over';ctx.beginPath();ctx.arc(p.x,p.y,2,0,6.283);ctx.fill();ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='#fff';ctx.shadowColor=BSH[th.type];ctx.shadowBlur=14;ctx.beginPath();ctx.arc(p.x,p.y-o,th.type==='mirv'?4.2:th.type==='rv'?2.6:3.2,0,6.283);ctx.fill();ctx.shadowBlur=0;
      if(th.type==='mirv'){ctx.strokeStyle='#ff2f6d';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(p.x,p.y-o,7+Math.sin(S.time*10)*1.5,0,6.283);ctx.stroke()}
      if(th.type==='hyper'){ctx.strokeStyle='rgba(255,92,240,.7)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-6,p.y-o);ctx.lineTo(p.x+6,p.y-o);ctx.moveTo(p.x,p.y-o-6);ctx.lineTo(p.x,p.y-o+6);ctx.stroke()}}
    else{glowLine(th.trail,th.type==='cruise'?(th.atRadar?'rgba(120,255,160,.7)':'rgba(255,240,180,.6)'):th.type==='swarm'?'rgba(255,211,106,.3)':'rgba(255,160,60,.35)',th.type==='cruise'?2:1.2,true);
      const a=Math.atan2(th.vy,th.vx);ctx.save();ctx.translate(p.x,p.y-o);ctx.rotate(a);ctx.fillStyle=T.c;const z=T.sz;
      if(th.type==='cruise'){ctx.fillRect(-z,-1.3,z*2,2.6);ctx.fillRect(-z*.2,-z*.55,z*.35,z*1.1)}else if(th.type==='swarm'){ctx.beginPath();ctx.moveTo(z,0);ctx.lineTo(-z*.6,-z);ctx.lineTo(-z*.6,z);ctx.closePath();ctx.fill()}else{ctx.beginPath();ctx.moveTo(z,0);ctx.lineTo(-z*.7,-z*.8);ctx.lineTo(-z*.35,0);ctx.lineTo(-z*.7,z*.8);ctx.closePath();ctx.fill()}
      ctx.restore()}}
  // interceptors
  for(const m of S.shots){glowLine(m.trail,m.c,2.4,true);const p=w2s(m.x,m.y);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y-altOff(m.alt),2.4,0,6.283);ctx.fill()}
  for(const m of S.samMissiles){glowLine(m.trail,'rgba(255,90,90,.9)',2,false);const p=w2s(m.x,m.y);ctx.fillStyle='#ffdddd';ctx.beginPath();ctx.arc(p.x,p.y,2,0,6.283);ctx.fill()}
  for(const b of S.bombs){glowLine(b.trail,'rgba(255,200,120,.9)',2,false)}
  // particles
  for(const q of S.parts){const p=w2s(q.x,q.y);const a=1-q.t/q.life;ctx.globalAlpha=a;ctx.fillStyle=q.c;ctx.beginPath();ctx.arc(p.x,p.y-altOff(q.alt||0),q.sz*(1+cam.s*.5),0,6.283);ctx.fill()}
  for(const r of S.rings){const p=w2s(r.x,r.y);const k=r.t/r.life;ctx.globalAlpha=(1-k);ctx.strokeStyle=r.c;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y-altOff(r.alt||0),Math.max(2,r.R*k*(.6+cam.s)),0,6.283);ctx.stroke();
    if(k<.25){ctx.fillStyle='#fff';ctx.globalAlpha=(.25-k)*3;ctx.beginPath();ctx.arc(p.x,p.y-altOff(r.alt||0),r.R*.5*(.6+cam.s),0,6.283);ctx.fill()}}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  // jets
  for(const j of S.jets){if(!j.alive)continue;const J=JT[j.type];glowLine(j.trail,'rgba(200,230,255,.35)',1.5,false);const p=w2s(j.x,j.y);
    if(j.state==='rearm'){ctx.font='10px system-ui';ctx.fillStyle='#cfe3f5';ctx.fillText('חימוש…',p.x,p.y-12)}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(j.h);ctx.fillStyle=J.c;ctx.shadowColor=selJet===j.id?'#3cc8ff':J.c;ctx.shadowBlur=selJet===j.id?14:6;const z=j.type==='f35'?8:9;
    ctx.beginPath();ctx.moveTo(z,0);ctx.lineTo(-z*.2,-z*.25);ctx.lineTo(-z*.35,-z*.9);ctx.lineTo(-z*.6,-z*.9);ctx.lineTo(-z*.55,-z*.2);ctx.lineTo(-z,-z*.4);ctx.lineTo(-z,z*.4);ctx.lineTo(-z*.55,z*.2);ctx.lineTo(-z*.6,z*.9);ctx.lineTo(-z*.35,z*.9);ctx.lineTo(-z*.2,z*.25);ctx.closePath();ctx.fill();ctx.restore();ctx.shadowBlur=0;
    if(j.detected>0){ctx.strokeStyle='rgba(255,80,80,'+(.4+.4*Math.sin(S.time*20))+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,13,0,6.283);ctx.stroke()}
    if(selJet===j.id&&j.state==='strike'&&j.tgt){const q=w2s(j.tgt.o.x,j.tgt.o.y);ctx.strokeStyle='rgba(255,200,120,.6)';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.setLineDash([])}
    if(selJet===j.id&&j.state==='patrol'){const q=w2s(j.px,j.py);ctx.strokeStyle='rgba(60,200,255,.5)';ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(q.x,q.y,35*cam.s,0,6.283);ctx.stroke();ctx.setLineDash([])}}
  // texts
  ctx.font='bold 12px system-ui,sans-serif';ctx.direction='rtl';
  for(const t of S.texts){const p=w2s(t.x,t.y);ctx.globalAlpha=1-t.age/t.life;ctx.fillStyle=t.c;ctx.fillText(t.t,p.x,p.y-18-t.age*18)}ctx.globalAlpha=1;
  // placement ghost
  if(selType&&ghost){const T=selType==='radar'?{c:'#5dff9a',range:RADAR.R}:TW[selType];const p=w2s(ghost.x,ghost.y);const ok=canPlace(ghost);ctx.strokeStyle=ok?T.c:'#ff5050';ctx.setLineDash([6,4]);ctx.beginPath();ctx.arc(p.x,p.y,Math.min(T.range*cam.s,3000),0,6.283);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(p.x,p.y,8,0,6.283);ctx.stroke()}
  ctx.restore();
  // threat counter
  if(S.inWave){ctx.font='12px system-ui,sans-serif';ctx.textAlign='left';ctx.fillStyle='rgba(200,225,250,.8)';const r=viewRect();
    ctx.fillText('איומים באוויר: '+S.threats.length+'   בדרך: '+S.queue.length,r.x+10,r.y+r.h-12);ctx.textAlign='center'}
}

// ---------- UI ----------
let selType=null,selJet=null,ghost=null,hintTimer=0;
function hint(t,ms){const h=$('hint');h.textContent=t;h.classList.remove('hidden');clearTimeout(hintTimer);if(ms)hintTimer=setTimeout(()=>h.classList.add('hidden'),ms)}
function banner(t){const b=$('banner');b.textContent=t;b.classList.remove('hidden');b.style.animation='none';void b.offsetWidth;b.style.animation=''}
function canPlace(p){return inIsrael(p)&&S.towers.every(t=>dist(t,p)>9)&&S.radars.every(r=>dist(r,p)>9)}
const costOf=t=>t==='radar'?RADAR.cost:TW[t].cost,nameOf=t=>t==='radar'?RADAR.n:TW[t].n;
function selectType(t){if(selType===t){selType=null}else{selType=t;selJet=null;if(view!=='israel')camTo('israel');hint('הקישו בתוך ישראל כדי להציב '+nameOf(t)+' (₪'+costOf(t)+')'+(t==='radar'?' · עד '+RADAR.max+', סוללות בטווח '+RADAR.R+' ק״מ מקבלות +20% טווח':''),3500)}renderJets();updateUI()}
function placeTower(type,p){if(type==='radar')return placeRadar(p);const T=TW[type];if(S.budget<T.cost){hint('אין מספיק תקציב',1500);return false}
  if(!canPlace(p)){hint('אפשר להציב רק בתוך שטח ישראל',1500);return false}
  S.budget-=T.cost;S.towers.push({type,x:p.x,y:p.y,ammo:T.mag,cd:0,refT:0,tgt:null,dw:0});boom(p.x,p.y,1.5,T.c);updateUI();return true}
function assignJet(j,p){if(!j||!j.alive)return;
  // strike target?
  let best=null,bd=1e9;const tol=28/cam.s;
  for(const l of S.launchers){const d=dist(l,p);if(d<tol&&d<bd){bd=d;best={kind:'launch',o:l}}}
  for(const s of S.sams){const d=dist(s,p);if(s.alive&&d<tol&&d<bd&&S.wave>=AIR_WAVE-1){bd=d;best={kind:'sam',o:s}}}
  if(best){j.state=j.state==='rearm'?'rearm':'strike';if(j.state==='rearm')j.next='strike';j.tgt=best;hint(JT[j.type].n+' יוצא לתקוף את '+(best.kind==='sam'?'סוללת הנ״מ':'אתר השיגור '+best.o.n),2500)}
  else{j.px=p.x;j.py=p.y;j.tgt=null;if(j.state!=='rearm')j.state=j.ammo>0?'patrol':'rtb';j.next='patrol';hint(JT[j.type].n+' יוצא לסיור באזור',1800)}
  renderJets();
  if(autoZoomFrom){const v=autoZoomFrom;autoZoomFrom=null;setTimeout(()=>{if(!selType)camTo(v)},1400)}}
let autoZoomFrom=null;
function renderJets(){const box=$('jets');box.innerHTML='';
  for(const j of S.jets){const b=document.createElement('button');b.className='jetb'+(selJet===j.id?' sel':'')+(j.alive?'':' dead');
    const st=!j.alive?'הופל':{patrol:'סיור',strike:'תקיפה',rtb:'חוזר לבסיס',rearm:'חימוש'}[j.state];
    b.innerHTML='<b>'+JT[j.type].n+' #'+j.id+'</b><small>'+st+' · '+j.ammo+'/'+JT[j.type].ammo+'</small>';
    if(j.alive)b.onclick=()=>{selJet=selJet===j.id?null:j.id;selType=null;if(selJet){if(view!=='theater'){autoZoomFrom=view;camTo('theater')}hint('הקישו על המפה לסיור, או על אתר שיגור / נ״מ לתקיפה',3000)}renderJets();updateUI()};
    box.appendChild(b)}}
function lbLine(){const el=$('lbLine'),n=lebanonAreas();if(!el||!el.classList)return;if(n>0&&!S.inWave&&!S.over){el.textContent='🚀 '+n+' אזורי שיגור פעילים בחזית לבנון: +'+lebanonRockets(S.wave+1)+' רקטות בגל הבא';el.classList.remove('hidden')}else el.classList.add('hidden')}
function updateUI(){lbLine();$('budget').textContent='₪'+Math.floor(S.budget);$('warBudget').textContent='₪'+(window.SHARED?window.SHARED.budget():0);$('score').textContent=S.score.toLocaleString('he-IL');$('wave').textContent=S.endless?S.wave+' ∞':S.wave+'/'+WAVES.length;
  const alive=S.cities.filter(c=>!c.dead).length;$('cities').textContent=alive+'/'+S.cities.length;$('cities').className=alive<=2?'low':alive<S.cities.length?'mid':'';
  document.querySelectorAll('.tw[data-t]').forEach(b=>{b.classList.toggle('sel',selType===b.dataset.t);b.classList.toggle('poor',S.budget<costOf(b.dataset.t)||(b.dataset.t==='radar'&&S.radars.length>=RADAR.max))});
  {const rc=$('radarCnt');if(rc&&rc.classList)rc.textContent='₪'+RADAR.cost+' · '+S.radars.length+'/'+RADAR.max}iafBtn();
  {const a=$('alert');if(a&&a.classList){a.classList.toggle('hidden',!(S.alertT>0&&S.inWave));if(S.alertT>0&&S.alertTxt&&a.textContent!==S.alertTxt)a.textContent=S.alertTxt}}
  document.querySelectorAll('.buy').forEach(b=>b.classList.toggle('poor',S.budget<JT[b.dataset.j].cost));
  const unlocked=S.wave>=AIR_WAVE||(S.wave===AIR_WAVE-1&&!S.inWave);$('btnAir').classList.toggle('locked',!unlocked);$('airLock').textContent=unlocked?'פתוח ✈':'🔒 גל '+AIR_WAVE}
// v7: final score + local top-10 high-score table
const SCORES_KEY='magenShamayim.scores.v7',SC={kill:10,city:500,wave:250};
function finalScore(){const k=S.stats.kills||0,c=S.cities.filter(x=>!x.dead).length,w=S.wave,m=DIFF[S.diff].score;
  return {kills:k,cities:c,wave:w,mult:m,endless:!!S.endless,total:Math.round((k*SC.kill+c*SC.city+w*SC.wave)*m)}}
function highScores(){const a=lsGet(SCORES_KEY);return Array.isArray(a)?a:[]}
function recordScore(){const f=finalScore(),e={s:f.total,w:f.wave,k:f.kills,c:f.cities,d:S.diff,e:f.endless?1:0,at:Date.now(),g:S.gid};
  let a=highScores().filter(x=>x.g!==S.gid);a.push(e);a.sort((x,y)=>y.s-x.s||y.w-x.w);a=a.slice(0,10);lsSet(SCORES_KEY,a);const rank=a.findIndex(x=>x.g===S.gid);return {f,rank}}
function scoresHTML(hl){const a=highScores();if(!a.length)return '<p class="best">עוד אין שיאים. שחקו משחק אחד כדי להיכנס לטבלה.</p>';
  return '<table class="hs"><tr><th>#</th><th>ניקוד</th><th>גל</th><th>רמה</th><th>ערים</th><th>תאריך</th></tr>'+a.map((x,i)=>'<tr'+(x.g===hl?' class="me"':'')+'><td>'+(i+1)+'</td><td>'+x.s.toLocaleString('he-IL')+'</td><td>'+x.w+(x.e?' ∞':'')+'</td><td>'+((DIFF[x.d]||{}).n||'')+'</td><td>'+x.c+'</td><td>'+new Date(x.at).toLocaleDateString('he-IL',{day:'numeric',month:'numeric'})+'</td></tr>').join('')+'</table>'}
function scoreLines(f,rank){return '🎯 '+f.kills+' יירוטים ×'+SC.kill+' + 🏙 '+f.cities+' ערים ×'+SC.city+' + 🌊 גל '+f.wave+' ×'+SC.wave+(f.mult!==1?' · ×'+f.mult+' ('+DIFF[S.diff].n+')':'')+' = <b>'+f.total.toLocaleString('he-IL')+'</b>'+(rank>=0?' · מקום '+(rank+1)+' בטבלה'+(rank===0?' 🏆':''):'')}
function showOver(title,text,won,endlessBtn){const rec=recordBest();const {f,rank}=recordScore();
  $('overTitle').textContent=title;$('overText').textContent=text;
  const b=bestFor(S.diff);$('overBest').textContent='רמה: '+DIFF[S.diff].n+(rec?' · שיא אישי חדש! 🏆':'')+' · השיא שלך: גל '+b.wave;
  const sc=$('overScore');if(sc)sc.innerHTML='<p class="best">'+scoreLines(f,rank)+'</p>'+scoresHTML(S.gid);
  const eb=$('btnEndless');if(eb&&eb.classList)eb.classList.toggle('hidden',!endlessBtn);
  setTimeout(()=>$('over').classList.remove('hidden'),won?600:1200);return {f,rank}}
function victory(){if(S.over)return;S.over=true;lsDel(SAVE_KEY);
  return showOver('ניצחון! 🎉 כל '+WAVES.length+' הגלים','הדפתם את כל '+WAVES.length+' הגלים. ערים שנשארו: '+S.cities.filter(c=>!c.dead).length+'/'+S.cities.length+', יירוטים: '+S.stats.kills+', פגיעות: '+S.stats.leaks+'. רוצים להמשיך? במצב אינסופי הגלים ממשיכים להתחזק עד שהערים נופלות.',true,true)}
function continueEndless(){if(!S.won||S.endless)return false;S.over=false;S.won=false;S.endless=true;$('over').classList.add('hidden');saveGame();
  $('btnNext').textContent='התחל גל '+(S.wave+1)+' ∞ ▶';$('btnNext').classList.remove('hidden');hint('∞ מצב אינסופי: כל גל חזק יותר, גל בוס כל 5. הניקוד נשמר כשהמשחק נגמר.',4500);updateUI();return true}
function gameOver(won,city){if(S.over)return;S.over=true;lsDel(SAVE_KEY);
  showOver(won?'ניצחון! 🎉':'המשחק נגמר',won?('הדפתם את כל '+WAVES.length+' הגלים.'):S.endless?('כל הערים הושמדו. במצב אינסופי הגעתם לגל '+S.wave+', עם '+S.stats.kills+' יירוטים.'):('כל הערים הושמדו. שרדתם עד גל '+S.wave+', עם '+S.stats.kills+' יירוטים.'),won,false)}
// ---------- v0.3: save / continue / personal best (localStorage) ----------
const SAVE_KEY='magenShamayim.save.v3',BEST_KEY='magenShamayim.best.v3';
function lsGet(k){try{return JSON.parse(window.localStorage.getItem(k)||'null')}catch(e){return null}}
function lsSet(k,v){try{window.localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function lsDel(k){try{window.localStorage.removeItem(k)}catch(e){}}
function bestFor(d){const b=lsGet(BEST_KEY)||{};return b[d]||{wave:0,score:0}}
function recordBest(){const all=lsGet(BEST_KEY)||{};const cur=all[S.diff]||{wave:0,score:0};let rec=false;
  if(S.wave>cur.wave){cur.wave=S.wave;rec=true}if(S.score>cur.score){cur.score=S.score;rec=true}all[S.diff]=cur;lsSet(BEST_KEY,all);return rec}
function saveGame(){if(S.over||S.inWave)return false;return lsSet(SAVE_KEY,{v:3,gid:S.gid,endless:S.endless?1:0,diff:S.diff,wave:S.wave,budget:Math.floor(S.budget),score:S.score,stats:S.stats,at:Date.now(),
  cities:S.cities.map(c=>[c.hp,c.dead?1:0,c.shelter?1:0,c.cuts||[]]),radars:S.radars.map(r=>[Math.round(r.x*10)/10,Math.round(r.y*10)/10,r.dead?1:0]),iaf:{lost:S.iaf.lost,last:S.iaf.last,mods:S.iaf.mods,n:S.iaf.n||0},bases:S.bases.map(b=>[b.hp,b.dead?1:0,b.active?1:0]),launchers:S.launchers.map(l=>l.struck),sams:S.sams.map(x=>x.alive?1:0),
  towers:S.towers.map(t=>[t.type,Math.round(t.x*10)/10,Math.round(t.y*10)/10,t.owner||0,t.base||0,t.sold?1:0,t.up?Object.keys(UPG).map(k=>upLv(t,k)):0]),coal:S.coal,payments:S.payments,offer:S.offer,cbases:S.cbases.map(b=>[b.key,b.struck,b.hits,b.on?1:0]),jets:S.jets.filter(j=>j.alive).map(j=>[j.type,S.bases.indexOf(j.base)])})}
function loadGame(){const v=lsGet(SAVE_KEY);if(!v||v.v!==3||!DIFF[v.diff])return false;diff=v.diff;S=newState(v.diff);S.started=true;
  S.wave=v.wave;S.budget=v.budget;S.score=v.score||0;if(v.gid)S.gid=v.gid;S.endless=!!v.endless;Object.assign(S.stats,v.stats||{});
  (v.cities||[]).forEach((c,i)=>{if(S.cities[i]){S.cities[i].hp=c[0];S.cities[i].dead=!!c[1];S.cities[i].shelter=!!c[2];S.cities[i].cuts=Array.isArray(c[3])?c[3].filter(x=>Array.isArray(x)&&x.length===2):[]}});
  // v6 fields (older saves have none: no radars, a full F-35 strike fleet)
  for(const r of v.radars||[])if(Array.isArray(r))S.radars.push({id:++S.radarSeq,kind:'radar',n:RADAR.n,x:r[0],y:r[1],dead:!!r[2],flash:0});
  if(v.iaf&&Array.isArray(v.iaf.lost))S.iaf={lost:v.iaf.lost.slice(0,IAF.fleet),last:v.iaf.last===undefined?-1:v.iaf.last,mods:Array.isArray(v.iaf.mods)?v.iaf.mods.filter(m=>IAFT(m.k)):[],n:v.iaf.n||0};
  (v.bases||[]).forEach((b,i)=>{if(S.bases[i]){S.bases[i].hp=b[0];S.bases[i].dead=!!b[1];S.bases[i].active=!!b[2]}});
  (v.launchers||[]).forEach((st,i)=>{if(S.launchers[i])S.launchers[i].struck=st});(v.sams||[]).forEach((a,i)=>{if(S.sams[i])S.sams[i].alive=!!a});
  for(const t of v.towers||[])if(TW[t[0]]){const tw={type:t[0],x:t[1],y:t[2],ammo:TW[t[0]].mag,cd:0,refT:0,tgt:null,dw:0};if(t[3]){tw.owner=t[3];tw.base=t[4];tw.sold=!!t[5]}if(Array.isArray(t[6])){tw.up={};Object.keys(UPG).forEach((k,i)=>tw.up[k]=Math.max(0,Math.min(UPG_MAX,t[6][i]|0)));tw.ammo=tMag(tw)}S.towers.push(tw)}
  // v4 fields (absent in older saves: the coalition simply joins when its wave comes)
  if(v.coal)S.coal=v.coal;if(Array.isArray(v.payments))S.payments=v.payments;for(const r of v.cbases||[]){const b=S.cbases.find(x=>x.key===r[0]);if(b){b.struck=r[1];b.hits=r[2]||0;if(r[3])b.on=true}}
  // older saves: a joined country's bases are on where its batteries stand; bases added since (v5) open now if their wave has come
  for(const b of S.cbases)if((S.coal[b.country]||{}).joined&&(b.on||S.towers.some(t=>t.base===b.key&&!t.sold)||S.wave>=b.join)){b.on=false;activateBase(b)}
  if(v.offer&&COAL(v.offer.country)){S.offer=v.offer;setTimeout(showOffer,600)}
  for(const j of v.jets||[]){const b=S.bases[j[1]];const base=b&&b.active&&!b.dead?b:aliveBases()[0];if(!base||!JT[j[0]])continue;
    S.jets.push({id:++S.jetSeq,type:j[0],base,x:base.x,y:base.y,h:-Math.PI/4,ammo:JT[j[0]].ammo,state:'patrol',px:P(37.6,32.2).x+rnd(-40,40),py:P(37.6,32.2).y+rnd(-40,40),orb:rnd(0,6),tgt:null,cd:0,trail:[],alive:true,rearmT:0,detected:0})}
  return true}
function bestLine(){return 'שיאים · '+['easy','normal','hard'].map(d=>{const b=bestFor(d);return DIFF[d].n+': '+(b.wave?'גל '+b.wave+', '+b.score.toLocaleString('he-IL')+' נק׳':'—')}).join(' · ')}
let introMode='start';
function openIntro(mode){introMode=mode;const st=mode==='start';$('diffRow').classList.toggle('hidden',!st);$('bestLine').classList.toggle('hidden',!st);
  const sv=st&&lsGet(SAVE_KEY);$('btnContinue').classList.toggle('hidden',!sv);if(sv)$('btnContinue').textContent='המשך משחק ▶ (גל '+(sv.wave+1)+' · '+DIFF[sv.diff].n+')';
  $('btnStart').textContent=st?'משחק חדש ▶':'המשך ▶';$('bestLine').textContent=bestLine();
  document.querySelectorAll('.dbtn').forEach(b=>{b.classList.toggle('sel',b.dataset.d===diff);b.setAttribute('aria-checked',b.dataset.d===diff?'true':'false')});
  $('intro').classList.remove('hidden')}
function resetUI(){selType=null;selJet=null;upSel=null;v6Sel=null;radSel=null;hideEl('v6Panel');hideEl('ecoPanel');{const u=$('upPanel');if(u&&u.classList)u.classList.add('hidden')}$('over').classList.add('hidden');$('pAir').classList.add('hidden');$('pDefense').classList.remove('hidden');S.paused=false;$('btnPause').textContent='❚❚';$('btnPause').classList.remove('on');renderJets();updateUI()}

// ---------- input ----------
const ptrs=new Map();let drag=null,pinch=null;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===1)drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,moved:false};
  else if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),s:cam.s,mid:s2w((a.x+b.x)/2,(a.y+b.y)/2)};drag=null}});
cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&selType)ghost=s2w(e.clientX,e.clientY);
  if(!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);cam.s=pinch.s*d/pinch.d;cam.anim=false;
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;cam.x=pinch.mid.x-(mx-SW/2)/cam.s;cam.y=pinch.mid.y-(my-SH/2)/cam.s;clampCam();mapDirty=true}
  else if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>8)drag.moved=true;if(drag.moved){cam.anim=false;cam.x=drag.cx-dx/cam.s;cam.y=drag.cy-dy/cam.s;clampCam();mapDirty=true}}});
function endPtr(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
  if(drag&&!drag.moved&&ptrs.size===0)tap(e.clientX,e.clientY);if(ptrs.size<2)pinch=null;if(ptrs.size===0)drag=null}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);drag=null;pinch=null});
cv.addEventListener('wheel',e=>{e.preventDefault();const w=s2w(e.clientX,e.clientY);cam.s*=Math.exp(-e.deltaY*.0015);cam.anim=false;clampCam();cam.x=w.x-(e.clientX-SW/2)/cam.s;cam.y=w.y-(e.clientY-SH/2)/cam.s;clampCam();mapDirty=true},{passive:false});
function tap(sx,sy){if(S.over)return;const p=s2w(sx,sy);if(v6Sel){const rd=S.radars.find(r=>dist(r,p)<16/cam.s);if(rd&&rd!==v6Sel.o){openV6('radar',rd)}else{closeV6();radSel=null}return}if(upSel){const o=S.towers.find(t=>!t.owner&&dist(t,p)<16/cam.s);if(o&&o!==upSel){upSel=o;renderUp()}else closeUp();return}
  if(S.sellMode){const tw=S.towers.filter(t=>!t.owner&&t.type===S.sellMode.type).sort((a,b)=>dist(a,p)-dist(b,p))[0];if(tw&&dist(tw,p)<26/cam.s){sellTower(tw)}else hint('הקישו על סוללת '+TW[S.sellMode.type].n+' שלכם (מסומנות בצהוב) כדי למכור אותה',2500);return}
  {const own=S.towers.filter(t=>!t.owner&&dist(t,p)<16/cam.s).sort((a,b)=>dist(a,p)-dist(b,p))[0],rd=S.radars.filter(r=>dist(r,p)<16/cam.s).sort((a,b)=>dist(a,p)-dist(b,p))[0];
    if(rd&&(!own||dist(rd,p)<=dist(own,p))){selType=null;openV6('radar',rd);updateUI();return}if(own){openUp(own);return}}
  if(selType){ghost=p;if(placeTower(selType,p)){if(selType==='radar'||S.budget<costOf(selType)){selType=null}updateUI()}return}
  // tap a jet on map?
  const tol=22/cam.s;const hit=S.jets.find(j=>j.alive&&dist(j,p)<tol);
  if(hit&&hit.id!==selJet){selJet=hit.id;renderJets();hint('הקישו על המפה לסיור, או על אתר אויב לתקיפה',2500);return}
  if(selJet){assignJet(S.jets.find(j=>j.id===selJet),p);return}
  {const c=S.cities.find(c=>dist(c,p)<14/cam.s);if(c){openV6('city',c);return}}
  // tap a tower → info
  const tw=S.towers.find(t=>dist(t,p)<16/cam.s);if(tw){hint(towerInfo(tw),4000);return}
  const cb=S.cbases.find(b=>dist(b,p)<18/cam.s&&cbOn(b));if(cb){hint(cbaseInfo(cb),3500);return}
  const l=S.launchers.find(l=>dist(l,p)<20/cam.s);if(l){hint(launcherInfo(l)+(S.wave>=AIR_WAVE?' · בחרו מטוס כדי לתקוף':''),3000)}}
function launcherInfo(l){const c=capAt(l,effW());return 'אתר '+LTYPES[l.kind].n+': '+l.n+' · '+(c<=0?'מושבת (חוזר ל-50% בגל '+(l.struck+2)+')':c<1?'בשיקום, 50% מהשיגורים (מלא בגל '+(l.struck+3)+')':'פעיל')}

document.querySelectorAll('.tw[data-t]').forEach(b=>b.addEventListener('click',()=>selectType(b.dataset.t)));
$('btnAir').onclick=()=>{const unlocked=S.wave>=AIR_WAVE||(S.wave===AIR_WAVE-1&&!S.inWave);if(!unlocked){hint('חיל האוויר נפתח בגל '+AIR_WAVE,1800);return}
  $('pDefense').classList.add('hidden');$('pAir').classList.remove('hidden');selType=null;renderJets();updateUI()}; // v0.2: no forced zoom-out
$('btnBack').onclick=()=>{$('pAir').classList.add('hidden');$('pDefense').classList.remove('hidden');selJet=null;renderJets()};
document.querySelectorAll('.buy').forEach(b=>b.addEventListener('click',()=>{buyJet(b.dataset.j)}));
$('btnNext').onclick=()=>{startWave()};
$('btnPause').onclick=()=>{S.paused=!S.paused;$('btnPause').textContent=S.paused?'▶':'❚❚';$('btnPause').classList.toggle('on',S.paused)};
$('btnSpeed').onclick=()=>{S.speed=S.speed===1?2:1;$('btnSpeed').textContent='x'+S.speed;$('btnSpeed').classList.toggle('on',S.speed===2)};
$('btnSound').onclick=()=>{soundOn=!soundOn;$('btnSound').textContent=soundOn?'🔊':'🔇';$('btnSound').classList.toggle('on',soundOn);if(soundOn)sfx('hit')};
$('btnView').onclick=()=>camTo(view==='israel'?'theater':'israel');
// v4: manual money transfer between this game's budget and the shared war pool (both directions)
function openTransfer(){if(!window.TRANSFER||!S)return false;const was=S.paused;S.paused=true;
  return window.TRANSFER.open({here:'מגן שמיים',wallet:{get:()=>S.budget,set:v=>{S.budget=Math.max(0,v)}},
    note:'הקופה המשותפת עוברת בין מגן שמיים לחזית לבנון. בונוס כל גל נכנס אליה, ומשם מושכים לאן שרוצים.',
    onClose:()=>{S.paused=was;$('btnPause').textContent=S.paused?'▶':'❚❚';updateUI();if(!S.inWave)saveGame()},
    onDone:(n,d)=>{if(n)hint(d==='out'?'₪'+n+' הועברו לקופה המשותפת':'₪'+n+' מהקופה נכנסו לתקציב',2200)}})}
$('btnXfer').onclick=openTransfer;
$('v6Panel').onclick=e=>{const t=e.target&&e.target.closest?e.target.closest('[data-v6],[data-v6x]'):null;if(!t||!v6Sel)return;if(performance.now()-v6At<350)return;/* the tap that opened the card must not also press a button in it */if(t.dataset.v6x){closeV6();return}const a=t.dataset.v6,o=v6Sel.o;
  if(a==='shelter')buildShelter(o);else if(a==='repair')repairRadar(o);else if(a.indexOf('strike:')===0)iafStrike(a.slice(7))};
$('ecoPanel').onclick=e=>{const t=e.target&&e.target.closest?e.target.closest('[data-ecox]'):null;if(t)hideEl('ecoPanel')};
$('btnIaf').onclick=()=>{if(!canStrike()){hint(S.iaf.last===S.wave?'כבר בוצעה תקיפה בהפסקה הזאת':!iafPlanes()?'אין מטוסים זמינים: מטוס שהופל חוזר אחרי '+IAF.back+' גלים':'תקיפה אפשרית רק בין גלים',2200);return}if(view!=='theater')camTo('theater');openV6('iaf',null)};
$('upPanel').onclick=e=>{const t=e.target&&e.target.closest?e.target.closest('[data-up],[data-upx]'):null;if(!t)return;if(t.dataset.upx){closeUp();return}if(upSel)upgrade(upSel,t.dataset.up)};
$('offerYes').onclick=()=>{if(acceptOffer())hint('הקישו על הסוללה שתרצו למכור (מסומנות בצהוב)',3500)};$('offerNo').onclick=()=>closeOffer(false);$('sellCancel').onclick=()=>closeOffer(false);
$('btnHelp').onclick=()=>{if(S.started&&!S.over){S.paused=true;$('btnPause').textContent='▶';openIntro('help')}else openIntro('start')};
document.querySelectorAll('.dbtn').forEach(b=>b.addEventListener('click',()=>{diff=b.dataset.d;openIntro('start')}));
function newGame(d){diff=DIFF[d]?d:diff;S=newState(diff);resetUI();$('intro').classList.add('hidden');$('btnNext').textContent='התחל גל 1 ▶';$('btnNext').classList.remove('hidden');
  hint('רמה: '+DIFF[diff].n+'. בחרו מערכת הגנה מהתפריט והציבו אותה בישראל (כולל יהודה ושומרון והגולן)',4500);camTo('israel')}
function continueGame(){if(!loadGame())return false;resetUI();$('intro').classList.add('hidden');$('btnNext').textContent='התחל גל '+(S.wave+1)+' ▶';$('btnNext').classList.remove('hidden');
  hint('המשחק נטען: '+DIFF[S.diff].n+', אחרי גל '+S.wave,3500);camTo('israel');return true}
$('btnContinue').onclick=()=>{continueGame()};
$('btnStart').onclick=()=>{if(introMode==='start'){newGame(diff)}else{$('intro').classList.add('hidden');S.paused=false;$('btnPause').textContent='❚❚'}};
$('btnRestart').onclick=()=>{$('over').classList.add('hidden');openIntro('start')};
// v7: endless, high scores, save code
$('btnEndless').onclick=()=>continueEndless();
function openV7(kind){const B=$('v7Body');$('v7Title').textContent=kind==='scores'?'🏆 טבלת שיאים':'💾 קוד שמירה';
  if(kind==='scores'){B.innerHTML='<p class="best">ניקוד = יירוטים ×'+SC.kill+' + ערים ששרדו ×'+SC.city+' + גל ×'+SC.wave+', כפול הקושי (קל ×0.75, קשה ×1.5)</p>'+scoresHTML()}
  else{const code=window.SHARED?window.SHARED.exportCode():'';
    B.innerHTML='<p class="best">הקוד הזה מכיל את ההתקדמות במגן שמיים ובחזית לבנון ואת הקופה המשותפת. העתיקו אותו, ובמכשיר השני הדביקו למטה.</p><textarea id="v7Out" readonly></textarea><div class="startRow"><button id="v7Copy" class="ghostBtn">📋 העתק קוד</button></div>'+
      '<p class="best">טעינת קוד ממכשיר אחר (מחליפה את ההתקדמות כאן):</p><textarea id="v7In" dir="ltr"></textarea><div class="startRow"><button id="v7Load" class="ghostBtn">📥 טען קוד</button></div><p id="v7Msg" class="msg"></p>';
    $('v7Out').value=code;
    $('v7Copy').onclick=()=>{const t=$('v7Out');try{t.focus();t.select();t.setSelectionRange(0,code.length)}catch(e){}
      const ok=()=>{$('v7Msg').className='msg ok';$('v7Msg').textContent='הקוד הועתק ✅'};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(code).then(ok,()=>{try{document.execCommand('copy');ok()}catch(e){}});else{try{document.execCommand('copy');ok()}catch(e){}}};
    $('v7Load').onclick=()=>importSaveCode($('v7In').value,true)}
  $('v7').classList.remove('hidden')}
function importSaveCode(code,ask){const m=$('v7Msg'),r=window.SHARED.readCode(code);if(!r.ok){m.className='msg err';m.textContent='❌ '+r.error;return r}
  const s=r.summary,txt='לטעון את הקוד?\n'+(s.td?'מגן שמיים: אחרי גל '+s.td.wave+' ('+((DIFF[s.td.diff]||{}).n||'')+')':'מגן שמיים: אין משחק שמור')+'\nחזית לבנון: '+(s.rts?'יש משחק שמור':'אין משחק שמור')+'\nקופה משותפת: ₪'+s.pool+(s.scores?'\nשיאים: '+s.scores:'')+'\n\nההתקדמות הנוכחית במכשיר הזה תוחלף.';
  if(ask&&!window.confirm(txt))return {ok:false,cancel:true};
  const out=window.SHARED.importCode(code);if(out.ok){m.className='msg ok';m.textContent='✅ נטען! טוען מחדש...';if(ask)setTimeout(()=>location.reload(),700)}return out}
$('btnScores').onclick=()=>openV7('scores');$('btnCode').onclick=()=>openV7('code');$('v7Close').onclick=()=>$('v7').classList.add('hidden');
$('rotate').onclick=()=>{rotateDismissed=true;$('rotate').classList.add('hidden')};
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.inWave){S.paused=true;$('btnPause').textContent='▶'}});

// ---------- loop ----------
let last=performance.now(),uiT=0;
function frame(now){const real=Math.min(.05,(now-last)/1000);last=now;
  if(cam.anim){const k=1-Math.pow(.0015,real);cam.x+=(cam.tx-cam.x)*k;cam.y+=(cam.ty-cam.y)*k;cam.s+=(cam.ts-cam.s)*k;mapDirty=true;if(Math.abs(cam.s-cam.ts)<cam.ts*.002&&Math.abs(cam.x-cam.tx)<.5/cam.s){cam.x=cam.tx;cam.y=cam.ty;cam.s=cam.ts;cam.anim=false}clampCam()}
  const steps=S.speed;for(let i=0;i<steps;i++)update(real);
  draw();uiT+=real;if(uiT>.25){uiT=0;updateUI();if($('pAir').offsetParent&&S.jets.length)renderJetsLite()}
  requestAnimationFrame(frame)}
function renderJetsLite(){const bs=$('jets').children;S.jets.forEach((j,i)=>{const b=bs[i];if(!b)return;const st=!j.alive?'הופל':{patrol:'סיור',strike:'תקיפה',rtb:'חוזר לבסיס',rearm:'חימוש'}[j.state];const sm=b.querySelector('small');const txt=st+' · '+j.ammo+'/'+JT[j.type].ammo;if(sm&&sm.textContent!==txt)sm.textContent=txt})}

S=newState();resize();camTo('theater',true);updateUI();openIntro('start');requestAnimationFrame(frame);
// test/automation hook
window.GAME={get S(){return S},P,w2s,placeTower:(t,lon,lat)=>placeTower(t,P(lon,lat)),startWave,buyJet,assignJet:(id,lon,lat)=>assignJet(S.jets.find(j=>j.id===id),P(lon,lat)),camTo,
  strike:(id,launcherName)=>{const j=S.jets.find(j=>j.id===id),l=S.launchers.find(l=>l.n===launcherName);if(j&&l){j.state='strike';j.tgt={kind:'launch',o:l};renderJets()}},
  strikeSam:(id,i)=>{const j=S.jets.find(j=>j.id===id);if(j){j.state='strike';j.tgt={kind:'sam',o:S.sams[i]};renderJets()}},
  TW,TT,LTYPES,DIFF,capAt,effW:()=>effW(),launcherInfo,saveGame,loadGame,recordBest,bestFor,newGame,continueGame,openIntro,setDiff:d=>{diff=d},inIsrael:(lon,lat)=>inIsrael(P(lon,lat)),canPlace:(lon,lat)=>canPlace(P(lon,lat)),launcher:n=>S.launchers.find(l=>l.n===n),buildWave:n=>buildWave(n),bases:()=>S.bases,setBonus:(a,b)=>{BONUS0=a;BONUSW=b},WAVES,hitTarget:(c,th)=>hitTarget(c,th),step:(sec)=>{const n=Math.round(sec*60);for(let i=0;i<n;i++)update(1/60)},closeIntro:()=>$('btnStart').click(),UPG,upgrade,openUp,closeUp,upSel:()=>upSel,upCost,upSpent,upTotal,salePrice,eff:{range:tRange,reload:tReload,refill:tRefill,mag:tMag,pk:tPk,dwell:tDwell},renderUp,openAir:()=>$('btnAir').click(),selectType,select:(id)=>{selJet=id;renderJets()},openTransfer,endWave:()=>endWave(),COALITION,coalition:{offer:()=>S.offer,accept:acceptOffer,decline:()=>closeOffer(false),sell:tw=>sellTower(tw),makeOffer:()=>{for(const c of COALITION)if(S.coal[c.key])S.coal[c.key].lastOffer=-1;return coalitionOffer()},join:coalitionJoin,cbaseOf,payments:()=>S.payments,towerInfo,cbaseInfo},
  threat:(type,sx,sy,tx,ty,city)=>{const th={type,sx,sy,tx,ty,city:city||S.cities[0],s:0,alt:0,x:sx,y:sy,vx:0,vy:0,eng:0,trail:[],wob:0,dead:false,from:-1};th.len=Math.hypot(tx-sx,ty-sy);th.spd=TT[type].spd;if(type==='hyper'){th.amp=28;th.ph=0}if(type==='rv')th.alt0=.9;th.det=detects(th);S.threats.push(th);return th},update:dt=>update(dt),
  v7:{MAXW,BOSS_EVERY,BASE_BACK,capBase,waveDef,isBoss,lastWave,bossSalvo,finalScore,highScores,recordScore,scoresHTML,victory,continueEndless,openV7,importSaveCode,SC,SCORES_KEY,IAF},
  // v6
  v6:{tune:o=>{if(o.DET0)DET0=o.DET0;if(o.ECON_BONUSW!==undefined)ECON_BONUSW=o.ECON_BONUSW;if(o.swarmRw)TT.swarm.rw=o.swarmRw},get DET0(){return DET0},RADAR,IAF,CITY_INC,SHELTER,BAL,MIRV_SPLIT,placeRadar:(lon,lat)=>placeRadar(P(lon,lat)),repairRadar,buildShelter,cityIncome,cityBase,canStrike,strike:iafStrike,iafPlanes,iafMods,iafCut,splitMirv,detects,radarBoost,openV6,closeV6,v6Sel:()=>v6Sel,showEco,iafBtn,renderV6,threatPos,
    camAt:(lon,lat,sc)=>{const q=P(lon,lat);cam.x=cam.tx=q.x;cam.y=cam.ty=q.y;cam.s=cam.ts=sc||cam.s;cam.anim=false;clampCam();mapDirty=true},
    spawn:e=>spawn(e),tap:(lon,lat)=>{const q=w2s(P(lon,lat).x,P(lon,lat).y);tap(q.x,q.y)}}};
})();
