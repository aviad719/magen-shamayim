/* חזית לבנון — static game data: map frame, real geography (lon/lat), unit + site definitions.
   Pure data. Shared by the simulation, the renderer and the tests (window.LF.data / module.exports). */
(function (root) {
  'use strict';
  // ---------- map frame ----------
  // The map is a grid of tiles over real coordinates: Acre/Nahariya (south) to north of Beirut.
  // One tile ≈ 0.87 km (east-west) × 0.90 km (north-south).
  var MAP = { cols: 96, rows: 128, lon0: 35.05, lon1: 35.95, lat0: 33.97, lat1: 32.93 };
  function toTile(lon, lat) {
    return { x: (lon - MAP.lon0) / (MAP.lon1 - MAP.lon0) * MAP.cols, y: (MAP.lat0 - lat) / (MAP.lat0 - MAP.lat1) * MAP.rows };
  }
  function toLonLat(x, y) {
    return { lon: MAP.lon0 + x / MAP.cols * (MAP.lon1 - MAP.lon0), lat: MAP.lat0 - y / MAP.rows * (MAP.lat0 - MAP.lat1) };
  }

  // ---------- real geography (lat, lon), hand-traced from real coordinates ----------
  // Mediterranean coastline, south → north (Acre → Nahariya → Rosh HaNikra → Tyre → Sidon → Damour → Beirut → Jounieh)
  var COAST = [[32.90, 35.072], [32.96, 35.080], [33.005, 35.088], [33.05, 35.096], [33.093, 35.104], [33.12, 35.135],
    [33.16, 35.160], [33.21, 35.178], [33.245, 35.192], [33.262, 35.184], [33.276, 35.186], [33.285, 35.200], [33.31, 35.218],
    [33.338, 35.240], [33.37, 35.252], [33.40, 35.266], [33.45, 35.286], [33.50, 35.318], [33.545, 35.352], [33.562, 35.362],
    [33.60, 35.388], [33.65, 35.414], [33.70, 35.438], [33.75, 35.455], [33.785, 35.468], [33.82, 35.478], [33.85, 35.474],
    [33.875, 35.468], [33.895, 35.472], [33.902, 35.492], [33.900, 35.520], [33.905, 35.545], [33.92, 35.565], [33.95, 35.585], [33.99, 35.605]];
  // Litani river, mouth (Qasmiyeh) → east → north under the Beaufort (Khardali) → toward the Beqaa
  var LITANI = [[33.338, 35.244], [33.343, 35.275], [33.346, 35.305], [33.340, 35.345], [33.325, 35.385], [33.312, 35.420],
    [33.303, 35.455], [33.312, 35.495], [33.327, 35.528], [33.340, 35.548], [33.375, 35.565], [33.42, 35.585], [33.47, 35.600],
    [33.52, 35.625], [33.57, 35.655], [33.62, 35.690], [33.66, 35.710]];
  // Bridges/fords on the Litani that vehicles can use
  var BRIDGES = [[33.341, 35.258, 'גשר קסמיה'], [33.318, 35.405, 'גשר ח׳רדלה מערב'], [33.338, 35.546, 'גשר ח׳רדלה']];
  // Israel–Lebanon border ("הקו הכחול"), west → east, then up the Galilee finger to Metula and back down to Ghajar
  var BORDER = [[33.093, 35.104], [33.085, 35.160], [33.075, 35.210], [33.080, 35.260], [33.090, 35.320], [33.085, 35.365],
    [33.100, 35.410], [33.090, 35.450], [33.105, 35.500], [33.140, 35.525], [33.200, 35.545], [33.250, 35.560], [33.285, 35.575],
    [33.275, 35.600], [33.270, 35.625], [33.290, 35.660], [33.320, 35.700], [33.330, 35.760], [33.390, 35.800], [33.430, 35.840],
    [33.470, 35.880], [33.520, 35.920], [33.560, 35.960]];
  // Lebanon–Syria line (north-east of the map is Syria = out of bounds), from the Golan corner north
  var SYRIA = [[33.270, 35.625], [33.290, 35.660], [33.320, 35.700], [33.330, 35.760], [33.390, 35.800], [33.430, 35.840],
    [33.470, 35.880], [33.520, 35.920], [33.560, 35.960]];

  // Roads (lat, lon chains)
  var ROADS = [
    // coastal highway
    [[32.92, 35.09], [33.00, 35.10], [33.09, 35.115], [33.12, 35.145], [33.20, 35.19], [33.27, 35.205], [33.33, 35.25], [33.40, 35.28],
     [33.50, 35.33], [33.56, 35.375], [33.65, 35.425], [33.73, 35.455], [33.80, 35.49], [33.86, 35.495], [33.89, 35.505]],
    // Israel: Nahariya – Shlomi – base – Ma'alot – Kiryat Shmona – Metula (route 899/90)
    [[33.005, 35.100], [33.072, 35.145], [33.06, 35.22], [33.04, 35.30], [33.02, 35.27], [33.03, 35.40], [33.08, 35.50], [33.20, 35.57], [33.28, 35.575]],
    // Tyre – Qana – Tebnine – Bint Jbeil – Maroun al-Ras
    [[33.27, 35.205], [33.24, 35.27], [33.21, 35.30], [33.20, 35.40], [33.15, 35.43], [33.12, 35.43], [33.10, 35.44]],
    // Tyre – Jwaya – Nabatieh
    [[33.27, 35.205], [33.265, 35.28], [33.24, 35.33], [33.30, 35.40], [33.36, 35.46], [33.378, 35.483]],
    // Nabatieh – Khardali bridge – Marjayoun – Khiam – Metula
    [[33.378, 35.483], [33.36, 35.52], [33.338, 35.546], [33.36, 35.59], [33.33, 35.61], [33.28, 35.575]],
    // Nabatieh – Zahrani – Sidon
    [[33.378, 35.483], [33.43, 35.45], [33.50, 35.40], [33.56, 35.375]],
    // Sidon – Jezzine
    [[33.56, 35.375], [33.55, 35.47], [33.545, 35.58]],
    // Bint Jbeil – Aita al-Shaab – Naqoura
    [[33.12, 35.43], [33.10, 35.33], [33.12, 35.21], [33.12, 35.14]],
    // Damour – Choueifat – Beirut inland
    [[33.73, 35.455], [33.78, 35.52], [33.84, 35.52], [33.88, 35.52]]
  ];

  // Forest/wooded hills (lat, lon, radius in tiles, density) — Galilee and South Lebanon wadis, Jezzine pines, Chouf
  var FORESTS = [
    [33.03, 35.22, 8, .75], [33.00, 35.35, 9, .8], [33.05, 35.45, 7, .7], [32.98, 35.45, 6, .6], [33.10, 35.55, 5, .6], [33.22, 35.62, 4, .5], // Galilee
    [33.13, 35.20, 5, .7], [33.12, 35.28, 5, .75], [33.22, 35.47, 6, .85], [33.25, 35.43, 4, .7], [33.17, 35.36, 5, .6],                   // South Lebanon border wadis
    [33.31, 35.52, 4, .7], [33.40, 35.55, 5, .6], [33.45, 35.52, 5, .7], [33.50, 35.56, 7, .85], [33.56, 35.58, 6, .85], [33.48, 35.44, 4, .55], // Beaufort / Jezzine
    [33.62, 35.55, 7, .7], [33.69, 35.52, 6, .7], [33.75, 35.58, 7, .7], [33.82, 35.62, 6, .6], [33.66, 35.64, 6, .6]                     // Chouf / Mount Lebanon
  ];

  // ---------- places ----------
  // Israeli towns (friendly decoration + labels)
  var IL_TOWNS = [
    ['נהריה', 33.005, 35.098], ['שלומי', 33.075, 35.145], ['מעלות', 33.017, 35.27], ['קריית שמונה', 33.207, 35.57], ['מטולה', 33.278, 35.578],
    ['עכו', 32.925, 35.082], ['כרמיאל', 32.92, 35.30], ['צפת', 32.965, 35.50]
  ];
  // Hezbollah sites. t: 'outpost' (forest base), 'village', 'city', 'main' (Beirut)
  var SITES = [
    // forest outposts (מוצבים) — dug in, mostly defensive
    { key: 'labuna',  n: 'מוצב לבונה',      t: 'outpost', lat: 33.105, lon: 35.185 },
    { key: 'ramiye',  n: 'מוצב רמיה',       t: 'outpost', lat: 33.115, lon: 35.295 },
    { key: 'saluki',  n: 'ואדי סלוקי',      t: 'outpost', lat: 33.225, lon: 35.475 },
    { key: 'hujeir',  n: 'ואדי חוג׳יר',     t: 'outpost', lat: 33.265, lon: 35.425 },
    { key: 'beaufort',n: 'הבופור',          t: 'outpost', lat: 33.325, lon: 35.530 },
    { key: 'rihan',   n: 'ג׳בל ריחאן',      t: 'outpost', lat: 33.465, lon: 35.545 },
    { key: 'jezzinef',n: 'יערות ג׳זין',     t: 'outpost', lat: 33.535, lon: 35.600 },
    { key: 'chouf',   n: 'רכס השוף',        t: 'outpost', lat: 33.680, lon: 35.540 },
    { key: 'aramoun', n: 'גבעות עראמון',    t: 'outpost', lat: 33.790, lon: 35.580 },
    // villages (כפרים) — light infantry and technicals
    { key: 'naqoura', n: 'נאקורה',          t: 'village', lat: 33.118, lon: 35.150 },
    { key: 'aita',    n: 'עיתא א-שעב',      t: 'village', lat: 33.098, lon: 35.335 },
    { key: 'bint',    n: 'בינת ג׳בייל',     t: 'village', lat: 33.122, lon: 35.432 },
    { key: 'shamaa',  n: 'שמע',             t: 'village', lat: 33.155, lon: 35.215 },
    { key: 'qana',    n: 'קנא',             t: 'village', lat: 33.208, lon: 35.300 },
    { key: 'tebnine', n: 'תבנין',           t: 'village', lat: 33.200, lon: 35.410 },
    { key: 'khiam',   n: 'אל-ח׳יאם',        t: 'village', lat: 33.330, lon: 35.612 },
    { key: 'jwaya',   n: 'ג׳ויא',           t: 'village', lat: 33.245, lon: 35.330 },
    { key: 'marj',    n: 'מרג׳עיון',        t: 'village', lat: 33.362, lon: 35.592 },
    { key: 'sarafand',n: 'צרפנד',           t: 'village', lat: 33.450, lon: 35.300 },
    { key: 'ghazieh', n: 'ע׳אזיה',          t: 'village', lat: 33.520, lon: 35.370 },
    { key: 'jezzine', n: 'ג׳זין',           t: 'village', lat: 33.545, lon: 35.583 },
    { key: 'damour',  n: 'דאמור',           t: 'village', lat: 33.730, lon: 35.460 },
    { key: 'choueifat',n:'שוויפאת',         t: 'village', lat: 33.808, lon: 35.515 },
    // cities (ערים)
    { key: 'tyre',    n: 'צור',             t: 'city',    lat: 33.271, lon: 35.203 },
    { key: 'nabatieh',n: 'נבטייה',          t: 'city',    lat: 33.378, lon: 35.483 },
    { key: 'sidon',   n: 'צידון',           t: 'city',    lat: 33.561, lon: 35.371 },
    // the Hezbollah main base
    { key: 'beirut',  n: 'ביירות',          t: 'main',    lat: 33.885, lon: 35.505 }
  ];
  // Player home base in the Galilee (near Ma'alot-Tarshiha)
  var HOME = { key: 'home', n: 'בסיס פיקוד צפון', lat: 32.995, lon: 35.310 };

  // ---------- units ----------
  // armour classes: inf, light (jeeps), armor (tanks/APCs), air (UAV/heli/jet), drone, bld
  // weapon.vs = damage multiplier per armour class. Infantry weapons deal dmg per soldier.
  var UNITS = {
    // ===== Israel =====
    golani:   { side: 'il', n: 'גולני', cls: 'inf', armor: 'inf', soldiers: 8, hpPer: 12, speed: 1.15, vision: 6, cost: 350, time: 8, q: 'inf', move: 'foot', beret: '#8a5a2b', supply: { ammo: 100, use: [.3, 2] },
                bonus: 'urban', sweep: true, desc: 'חי״ר. הכי טובים בשטח בנוי (כפרים וערים). ״🔍 סריקה״ בכפר/עיר חושפת מנהרות ומחסנים',
                weapons: [{ n: 'רובים', range: 4.5, dmg: 1.4, cd: 1.0, fx: 'bullet', vs: { inf: 1, light: .6, armor: .08, bld: .15, drone: .3, air: .05 } },
                          { n: 'לאו', range: 4, dmg: 22, cd: 6, fx: 'rocket', vs: { inf: .3, light: 1, armor: .55, bld: .6 } }] },
    // v4: Nahal is no longer buyable (replaced by paratroopers); the type stays so old saves keep working.
    nahal:    { side: 'il', n: 'נח״ל', cls: 'inf', armor: 'inf', soldiers: 8, hpPer: 12, speed: 1.2, vision: 6, cost: 350, time: 8, q: 'inf', move: 'foot', beret: '#3e9b3e', supply: { ammo: 100, use: [.3, 2] },
                bonus: 'forest', desc: 'חי״ר. הכי טובים בשטח מיוער',
                weapons: [{ n: 'רובים', range: 4.5, dmg: 1.4, cd: 1.0, fx: 'bullet', vs: { inf: 1, light: .6, armor: .08, bld: .15, drone: .3, air: .05 } },
                          { n: 'לאו', range: 4, dmg: 22, cd: 6, fx: 'rocket', vs: { inf: .3, light: 1, armor: .55, bld: .6 } }] },
    para:     { side: 'il', n: 'צנחנים', cls: 'inf', armor: 'inf', soldiers: 8, hpPer: 12, speed: 1.2, vision: 6, cost: 420, time: 9, q: 'inf', move: 'foot', beret: '#a3263a', supply: { ammo: 100, use: [.3, 2] },
                para: true, desc: 'חי״ר מובחר. ״🪂 הצנחה״: מטוס תובלה ממריא מהבסיס ומצניח אותם בכל נקודה במפה',
                weapons: [{ n: 'רובים', range: 4.5, dmg: 1.5, cd: 1.0, fx: 'bullet', vs: { inf: 1, light: .6, armor: .08, bld: .15, drone: .3, air: .05 } },
                          { n: 'לאו', range: 4, dmg: 22, cd: 6, fx: 'rocket', vs: { inf: .3, light: 1, armor: .55, bld: .6 } }] },
    givati:   { side: 'il', n: 'גבעתי', cls: 'inf', armor: 'inf', soldiers: 8, hpPer: 12, speed: 1.1, vision: 6, cost: 350, time: 8, q: 'inf', move: 'foot', beret: '#8e3fa6', supply: { ammo: 100, use: [.3, 2] },
                bonus: 'hold', desc: 'חי״ר. הכי טובים בהגנה ובהחזקת שטח (כשהם עומדים)',
                weapons: [{ n: 'רובים', range: 4.5, dmg: 1.4, cd: 1.0, fx: 'bullet', vs: { inf: 1, light: .6, armor: .08, bld: .15, drone: .3, air: .05 } },
                          { n: 'לאו', range: 4, dmg: 22, cd: 6, fx: 'rocket', vs: { inf: .3, light: 1, armor: .55, bld: .6 } }] },
    engineer: { side: 'il', n: 'הנדסה', cls: 'inf', armor: 'inf', soldiers: 8, hpPer: 11, speed: 1.1, vision: 5, cost: 400, time: 9, q: 'inf', move: 'foot', beret: '#7d8790', supply: { ammo: 100, use: [.35] },
                engineer: true, desc: 'בונים עמדות רואה-יורה ומתקנים טנקים ונמרים פגועים',
                weapons: [{ n: 'רובים', range: 4, dmg: .9, cd: 1.1, fx: 'bullet', vs: { inf: 1, light: .5, armor: .05, bld: .1, drone: .3 } }] },
    merkava:  { side: 'il', n: 'מרכבה סימן 4', cls: 'veh', armor: 'armor', hp: 420, speed: 1.9, vision: 7, cost: 1100, time: 15, q: 'veh', move: 'track', size: 0.85, supply: { ammo: 100, use: [1.6, .1], fuel: 100, burn: .6 },
                trophy: { charges: 4, chance: 0.7, reload: 25 }, desc: 'טנק עם מעיל רוח: סיכוי ליירט טילי נ״ט',
                weapons: [{ n: 'תותח 120', range: 6.5, dmg: 70, cd: 2.4, fx: 'shell', vs: { inf: .75, light: 1.2, armor: 1, bld: 1.1 } },
                          { n: 'מקלע', range: 5, dmg: 6, cd: .5, fx: 'bullet', vs: { inf: 1, light: .5, armor: 0, drone: .7, bld: .05 } }] },
    namer:    { side: 'il', n: 'נמר', cls: 'veh', armor: 'armor', hp: 360, speed: 2.1, vision: 6, cost: 750, time: 12, q: 'veh', move: 'track', size: 0.8, supply: { ammo: 100, use: [.2], fuel: 100, burn: .5 },
                carry: 16, desc: 'נגמ״ש כבד: נושא עד 2 מחלקות (16 לוחמים)',
                weapons: [{ n: 'עמדה נשלטת', range: 5.5, dmg: 7, cd: .45, fx: 'bullet', vs: { inf: 1, light: .8, armor: .05, drone: .9, bld: .1 } }] },
    artillery:{ side: 'il', n: 'תותחנים', cls: 'veh', armor: 'armor', hp: 280, speed: 1.7, vision: 7, cost: 1050, time: 15, q: 'veh', move: 'track', size: .85, supply: { ammo: 100, use: [], fuel: 100, burn: .55 },
                barrage: { vs: { inf: 1, light: 1, armor: .45, bld: .7 } }, desc: 'סוללת תותחים מתנייעת. ״פריסה״ ← אש על אזור או מסך עשן. לא יורה כשהיא לא פרוסה', weapons: [] },
    c130:     { side: 'il', n: 'מטוס תובלה', cls: 'air', armor: 'air', hp: 320, speed: 7, vision: 5, size: 1.5, move: 'air', transportPlane: true, noSelect: true, weapons: [] },
    truck:    { side: 'il', n: 'משאית אספקה', cls: 'veh', armor: 'light', hp: 140, speed: 2.4, vision: 5, cost: 300, time: 8, q: 'veh', move: 'wheel', size: 0.6,
                supplier: true, desc: 'מחדשת תחמושת ודלק לכוחות סביבה', weapons: [] },
    uav_recon:{ side: 'il', n: 'מל״ט סיור', cls: 'air', armor: 'air', hp: 70, speed: 3.2, vision: 11, cost: 400, time: 10, q: 'air', move: 'air', size: .55,
                loiter: 160, desc: 'חושף את ערפל הקרב ומפיל רחפנים',
                weapons: [{ n: 'נגד רחפנים', range: 4.5, dmg: 12, cd: .9, fx: 'laser', vs: { drone: 1 } }] },
    uav_attack:{side: 'il', n: 'מל״ט תקיפה', cls: 'air', armor: 'air', hp: 80, speed: 2.7, vision: 7, cost: 700, time: 12, q: 'air', move: 'air', size: .65,
                loiter: 130, ammo: 6, desc: 'תוקף חי״ר רגלי וג׳יפים קלים',
                weapons: [{ n: 'טיל מכוון', range: 5.5, dmg: 55, cd: 2.2, fx: 'missile', vs: { inf: 1, light: 1.2, armor: .15, drone: 0, bld: .2 } }] },
    heli:     { side: 'il', n: 'מסוק', cls: 'air', armor: 'air', hp: 230, speed: 4.4, vision: 7, cost: 1400, time: 18, q: 'air', move: 'air', size: .9,
                loiter: 70, ammo: 10, carry: 8, desc: 'תוקף כמו מל״ט, מהיר ויקר יותר, שהייה קצרה. מוביל מחלקה אחת',
                weapons: [{ n: 'רקטות ותותח', range: 5.5, dmg: 50, cd: 1.3, fx: 'missile', vs: { inf: 1, light: 1.2, armor: .7, drone: .3, bld: .5 } }] },
    jet:      { side: 'il', n: 'מטוס קרב F-16I', cls: 'air', armor: 'air', hp: 200, speed: 10, vision: 6, cost: 1800, time: 20, q: 'air', move: 'air', size: 1.1,
                jet: true, ammo: 2, rearm: 20, desc: 'תקיפה מדויקת של מבנים ושריון. ממריא, מפציץ וחוזר',
                weapons: [{ n: 'פצצה מונחית', range: 1.2, dmg: 320, cd: .6, fx: 'bomb', splash: 1.6, vs: { inf: .6, light: 1, armor: 1, bld: 1.4 } }] },
    post:     { side: 'il', n: 'עמדת רואה-יורה', cls: 'bld', armor: 'bld', hp: 450, speed: 0, vision: 9, cost: 400, time: 12, size: .9, building: true,
                desc: 'עמדה סטטית: רואה רחוק ויורה במקלע',
                weapons: [{ n: 'מקלע כבד', range: 6.5, dmg: 9, cd: .45, fx: 'bullet', vs: { inf: 1, light: .9, armor: .05, drone: .8, bld: .1 } }] },
    hq:       { side: 'il', n: 'בסיס פיקוד צפון', cls: 'bld', armor: 'bld', hp: 5000, speed: 0, vision: 9, size: 2.4, building: true,
                weapons: [{ n: 'מקלעים', range: 6.5, dmg: 14, cd: .5, fx: 'bullet', vs: { inf: 1, light: .9, armor: .1, drone: 1 } },
                          { n: 'תותח נ״ט', range: 7, dmg: 60, cd: 3, fx: 'shell', vs: { inf: .4, light: 1, armor: 1 } }] },
    // ===== Hezbollah =====
    hz_inf:   { side: 'hz', n: 'חי״ר קל', cls: 'inf', armor: 'inf', soldiers: 6, hpPer: 10, speed: 1.15, vision: 6, beret: '#e8d23c', time: 7,
                weapons: [{ n: 'קלצ׳ניקוב', range: 4.3, dmg: 1.2, cd: 1.0, fx: 'bullet', vs: { inf: 1, light: .6, armor: .05, drone: 0, air: .04, bld: .12 } },
                          { n: 'RPG', range: 3.8, dmg: 26, cd: 7, fx: 'rocket', vs: { inf: .3, light: 1, armor: .45, bld: .5 } }] },
    hz_mg:    { side: 'hz', n: 'עמדת מקלע', cls: 'inf', armor: 'inf', soldiers: 3, hpPer: 14, speed: .9, vision: 6, beret: '#e8d23c', time: 8,
                weapons: [{ n: 'מקלע כבד', range: 5.5, dmg: 3.4, cd: .45, fx: 'bullet', vs: { inf: 1, light: .8, armor: .03, air: .25, drone: .2, bld: .1 } }] },
    hz_atgm:  { side: 'hz', n: 'חוליית נ״ט', cls: 'inf', armor: 'inf', soldiers: 3, hpPer: 11, speed: 1.0, vision: 7, beret: '#e8d23c', time: 10,
                weapons: [{ n: 'קורנט', range: 7, dmg: 120, cd: 7, fx: 'atgm', perSquad: true, vs: { inf: .2, light: 1, armor: 1, bld: .6 } }] },
    hz_aa:    { side: 'hz', n: 'חוליית נ״מ', cls: 'inf', armor: 'inf', soldiers: 3, hpPer: 11, speed: 1.0, vision: 8, beret: '#e8d23c', time: 10,
                weapons: [{ n: 'כתף נ״מ', range: 7.5, dmg: 70, cd: 5, fx: 'sam', perSquad: true, vs: { air: 1, drone: .5 } }] },
    tech_mg:  { side: 'hz', n: 'ג׳יפ מקלע', cls: 'veh', armor: 'light', hp: 110, speed: 2.7, vision: 6, size: .55, move: 'wheel', time: 9,
                weapons: [{ n: 'מקלע', range: 5, dmg: 5.5, cd: .45, fx: 'bullet', vs: { inf: 1, light: .8, armor: .04, air: .2, drone: .3, bld: .1 } }] },
    tech_atgm:{ side: 'hz', n: 'ג׳יפ נ״ט', cls: 'veh', armor: 'light', hp: 110, speed: 2.7, vision: 7, size: .55, move: 'wheel', time: 11,
                weapons: [{ n: 'טיל נ״ט', range: 7, dmg: 115, cd: 8, fx: 'atgm', vs: { inf: .2, light: 1, armor: 1, bld: .6 } }] },
    tech_aa:  { side: 'hz', n: 'ג׳יפ נ״מ', cls: 'veh', armor: 'light', hp: 110, speed: 2.7, vision: 8, size: .55, move: 'wheel', time: 11,
                weapons: [{ n: 'תותח נ״מ', range: 7, dmg: 14, cd: .6, fx: 'flak', vs: { air: 1, drone: 1, inf: .4, light: .3 } }] },
    hz_apc:   { side: 'hz', n: 'נגמ״ש BMP', cls: 'veh', armor: 'armor', hp: 260, speed: 1.9, vision: 6, size: .75, move: 'track', time: 14,
                weapons: [{ n: 'תותח 30', range: 5.5, dmg: 16, cd: .9, fx: 'bullet', vs: { inf: 1, light: 1, armor: .25, air: .3, drone: .4, bld: .3 } }] },
    hz_tank:  { side: 'hz', n: 'טנק T-72', cls: 'veh', armor: 'armor', hp: 360, speed: 1.6, vision: 6, size: .82, move: 'track', time: 18,
                weapons: [{ n: 'תותח 125', range: 6, dmg: 62, cd: 2.8, fx: 'shell', vs: { inf: .7, light: 1.2, armor: .9, bld: 1 } }] },
    drone:    { side: 'hz', n: 'רחפן נפץ', cls: 'air', armor: 'drone', hp: 22, speed: 2.6, vision: 6, size: .35, move: 'air', time: 6,
                kamikaze: { dmg: 95, splash: 1.0, vs: { inf: .6, light: 1, armor: .9, bld: .6 } } },
    // Hezbollah structures (the local HQ of each site)
    hz_launcher:{side: 'hz', n: 'משגר רקטות', cls: 'bld', armor: 'light', hp: 400, speed: 0, vision: 3, size: .7, building: true, launcher: true, weapons: [] },
    hz_outpost:{side: 'hz', n: 'מוצב מבוצר', cls: 'bld', armor: 'bld', hp: 1800, speed: 0, vision: 7, size: 1.4, building: true,
                weapons: [{ n: 'מקלע מבוצר', range: 5, dmg: 5, cd: .5, fx: 'bullet', vs: { inf: 1, light: .8, armor: .03, air: .25, drone: .3 } }] },
    hz_village:{side: 'hz', n: 'מפקדת כפר', cls: 'bld', armor: 'bld', hp: 1300, speed: 0, vision: 6, size: 1.2, building: true, weapons: [] },
    hz_city:  { side: 'hz', n: 'מפקדה עירונית', cls: 'bld', armor: 'bld', hp: 3400, speed: 0, vision: 7, size: 1.7, building: true,
                weapons: [{ n: 'מקלעים', range: 5.5, dmg: 8, cd: .5, fx: 'bullet', vs: { inf: 1, light: .8, armor: .03, air: .25, drone: .3 } }] },
    hz_main:  { side: 'hz', n: 'מפקדת חיזבאללה', cls: 'bld', armor: 'bld', hp: 6000, speed: 0, vision: 8, size: 2.2, building: true,
                weapons: [{ n: 'מקלעים', range: 6, dmg: 10, cd: .5, fx: 'bullet', vs: { inf: 1, light: .8, armor: .05, air: .3, drone: .3 } }] }
  };
  // what the player can buy, by production line. Vehicles and helis/jets are built one at a time.
  var BUILD = {
    inf: ['golani', 'para', 'givati', 'engineer'],
    veh: ['merkava', 'namer', 'artillery', 'truck'],
    air: ['uav_recon', 'uav_attack', 'heli', 'jet']
  };
  var QUEUE_MAX = { inf: 5, veh: 1, air: 1 };

  // ---------- terrain ----------
  // speed multiplier per movement class; Infinity cost = impassable
  var TERRAIN = {
    sea:    { n: 'ים',        foot: 0,   wheel: 0,   track: 0,   cover: 0 },
    beach:  { n: 'חוף',       foot: 1,   wheel: .9,  track: .9,  cover: 0 },
    open:   { n: 'שטח פתוח',  foot: 1,   wheel: 1,   track: 1,   cover: 0 },
    forest: { n: 'יער',       foot: .85, wheel: .5,  track: .6,  cover: .35 },
    village:{ n: 'כפר',       foot: 1,   wheel: .85, track: .8,  cover: .35 },
    city:   { n: 'עיר',       foot: 1,   wheel: .8,  track: .75, cover: .45 },
    road:   { n: 'כביש',      foot: 1.1, wheel: 1.5, track: 1.3, cover: 0 },
    river:  { n: 'הליטני',    foot: .35, wheel: 0,   track: 0,   cover: 0 },
    bridge: { n: 'גשר',       foot: 1.1, wheel: 1.4, track: 1.2, cover: 0 },
    hills:  { n: 'הרים',      foot: .7,  wheel: .45, track: .5,  cover: .15 },
    syria:  { n: 'סוריה',     foot: 0,   wheel: 0,   track: 0,   cover: 0 }
  };
  var BONUS = { urban: { atk: 1.6, def: .6 }, forest: { atk: 1.6, def: .6 }, hold: { atk: 1.25, def: .5, after: 2 }, dug: { def: .7 } };
  var SITE_T = {
    outpost: { droneMax: 1, droneRange: 14, bld: 'hz_outpost', radius: 2.2, capture: 6, prod: 50, cap: 6, income: 0, bounty: 300,
               start: ['hz_inf', 'hz_inf', 'hz_mg', 'hz_atgm', 'hz_aa'], make: ['hz_inf', 'hz_mg', 'hz_atgm', 'hz_aa'], drones: 55 },
    village: { droneMax: 1, droneRange: 16, bld: 'hz_village', radius: 2.6, capture: 15, prod: 38, cap: 6, income: 60, bounty: 200,
               start: ['hz_inf', 'hz_inf', 'tech_mg'], make: ['hz_inf', 'hz_inf', 'tech_mg', 'tech_atgm', 'tech_aa', 'hz_atgm'], drones: 50 },
    city:    { droneMax: 2, droneRange: 20, bld: 'hz_city', radius: 4, capture: 30, prod: 24, cap: 11, income: 150, bounty: 500,
               start: ['hz_inf', 'hz_inf', 'hz_inf', 'hz_atgm', 'hz_aa', 'tech_mg', 'hz_apc', 'hz_tank'],
               make: ['hz_inf', 'hz_inf', 'hz_atgm', 'tech_mg', 'tech_atgm', 'tech_aa', 'hz_apc', 'hz_tank'], drones: 35 },
    main:    { droneMax: 3, droneRange: 24, bld: 'hz_main', radius: 5, capture: 45, prod: 16, cap: 18, income: 300, bounty: 2000,
               start: ['hz_inf', 'hz_inf', 'hz_inf', 'hz_inf', 'hz_atgm', 'hz_atgm', 'hz_aa', 'hz_aa', 'tech_aa', 'hz_apc', 'hz_tank', 'hz_tank'],
               make: ['hz_inf', 'hz_inf', 'hz_atgm', 'hz_aa', 'tech_mg', 'tech_atgm', 'tech_aa', 'hz_apc', 'hz_tank', 'hz_tank'], drones: 25 }
  };
  var DIFF = {
    easy:   { n: 'קל',   money: 4500, hp: 1.15, prod: .95, dmg: 1.15, base: 130, counter: 260, drone: 1.4, startMul: 1, cap: 80, wave: 5, grace: 180, help: 2 },
    normal: { n: 'רגיל', money: 3500, hp: 1.2, prod: .9, dmg: 1.25, base: 110, counter: 200, drone: 1.0, startMul: 1, cap: 90, wave: 6, grace: 120, help: 2 },
    hard:   { n: 'קשה',  money: 3000, hp: 1.3, prod: .8, dmg: 1.35, base: 100, counter: 170, drone: .8, startMul: 1.25, cap: 115, wave: 7, grace: 110, help: 2 }
  };

  // ---------- v2 realism: hidden tunnels / weapons stores, rocket launch areas, supply ----------
  // Tunnel shafts (site key + offset angle). Each has an exit toward Israeli lines where Hezbollah squads pop out.
  var TUNNELS = [ ['labuna', 1.2], ['ramiye', 4.0], ['aita', 2.2], ['bint', 5.2], ['naqoura', 0.4], ['saluki', 3.1], ['khiam', 1.9] ];
  // Weapons stores (site key + offset angle): speed up the site's production and ATGM reloads while they stand.
  var CACHES = [ ['shamaa', 3.6], ['qana', 0.9], ['tebnine', 2.6], ['hujeir', 5.0], ['beaufort', 2.0], ['tyre', 4.4], ['nabatieh', 1.4], ['jezzinef', 3.3], ['sidon', 5.6] ];
  // Rocket launch areas south of the Litani: hidden launchers in orchards and fields (lat, lon, name).
  var LAUNCH_AREAS = [
    [33.222, 35.242, 'מטעי ראשידיה'], [33.170, 35.262, 'שדות מג׳דל זון'], [33.180, 35.355, 'מטעי קנא'],
    [33.235, 35.392, 'שדות תבנין'], [33.272, 35.470, 'בוסתני סלוקי'], [33.300, 35.585, 'מטעי דיר מימאס']
  ];
  var HIDDEN = {
    tunnel: { n: 'פיר מנהרה', reveal: 3, revealEng: 7, revealUav: 6, blow: 4, bounty: 250, pop: 210, exitDist: 11 },
    cache:  { n: 'מחסן נשק',  reveal: 3, revealEng: 7, revealUav: 6, blow: 4, bounty: 200, prodMul: 1.5, atgmMul: 1.4 },
    exit:   { n: 'יציאת מנהרה', blow: 3, bounty: 120 },
    launcher: { n: 'משגר רקטות', reveal: 3, revealEng: 7, revealUav: 6, bounty: 300, salvo: 105,
                // damage multiplier by attacker type: jets and attack UAVs are best, ground units get there slowly
                vsBy: { jet: 1.6, uav_attack: 1.8, heli: 1.2, merkava: .6, namer: .6, post: .25, golani: .25, nahal: .25, para: .25, artillery: .6, givati: .25, engineer: .25 } }
  };
  // Supply: max ammo / fuel, drain per shot (per weapon index) and fuel per tile moved. Refill rates are % of max per second.
  var SUPPLY = { refillAmmo: .09, refillFuel: .11, truckRadius: 4, zoneExtra: 2.5, low: .25, noFuelSpeed: .25 };
  // ---------- v4: artillery, paratroopers, supply drop, Golani sweep ----------
  // Artillery: deploy ~10 s, then barrage (area damage, our own units take 50%) or a smoke screen. Range in tiles (≈0.9 km).
  var ARTY = { deploy: 10, pack: 5, range: 20, minRange: 3,
    fire:  { radius: 2.8, dmg: 170, volleys: 3, gap: .7, warn: 3, cd: 35, ammo: 20 },
    smoke: { radius: 3.6, dur: 15, delay: 2, cd: 45, ammo: 10 },
    friendly: .5 };
  // Paratroopers: board at a base / our city / a post, a transport plane flies out and drops them; briefly vulnerable on landing.
  var PARA = { perPlane: 2, landT: 2.5, landVuln: 1.25, spread: 1.4 };
  // One-time supply airdrop (air tab): crate refills ammo, fuel and some health around it.
  var SUPPLY_DROP = { key: 'supplydrop', n: 'הצנחת אספקה', cost: 450, radius: 4.5, heal: .35, fall: 2.5,
    desc: 'חד-פעמי: מטוס מצניח ארגז שמחדש תחמושת, דלק וקצת חיים לכוחות סביבו' };
  // Golani sweep: only inside a village or city. Reveals hidden objects nearby and +50% damage for 20 s.
  var SWEEP = { radius: 8, dur: 20, cd: 60, dmg: 1.5 };
  // ---------- v5: smarter enemy ----------
  // Ambush squads hide near the roads and open fire when our units pass close; recon UAVs can spot them first.
  // Roadside IEDs (hidden on roads) hit our vehicles; engineers and recon UAVs reveal them, engineers clear them.
  // Counterattacks: Hezbollah gathers near a village we captured and tries to retake it if we left it empty.
  var SMART = {
    ambush: { count: { easy: 3, normal: 5, hard: 8 }, trigger: 4.2, uavSpot: 5.5, burst: 1.6, burstT: 5, minHq: 16, gap: 10,
              types: ['hz_inf', 'hz_atgm', 'hz_inf', 'hz_mg', 'hz_inf', 'hz_atgm', 'hz_inf', 'hz_mg'] },
    ied:    { count: { easy: 5, normal: 8, hard: 12 }, trigger: .9, radius: 1.6, dmg: { light: 150, armor: 95, inf: 18, bld: 0 }, minHq: 12, gap: 6 },
    retake: { every: { easy: 360, normal: 270, hard: 180 }, size: { easy: 3, normal: 4, hard: 6 }, gather: 18, hold: 12, range: 30, give: 100 },
    // v6a: counterattacks on CITIES we hold: a bigger force (6-8 incl. ATGM teams), 30 s warning, then the same 12 s retake rule.
    cityRaid: { every: { easy: 600, normal: 480, hard: 360 }, size: { easy: 6, normal: 7, hard: 8 }, atgm: { easy: 2, normal: 2, hard: 3 }, warn: 30, attack: 120, min: 4, spawn: 3, range: 40, rally: 8,
                fill: ['hz_inf', 'hz_atgm', 'hz_inf', 'tech_atgm', 'hz_mg', 'hz_inf', 'tech_mg', 'hz_atgm'] }
  };
  HIDDEN.ied = { n: 'מטען צד', reveal: 0, revealEng: 4, revealUav: 4.5, blow: 3, bounty: 100 };
  // v5: control groups 1-4 and coordinated attack
  var CTRL = { groups: 4, longPress: 600, doubleTap: 380 };

  // ---------- v6b: Sayeret Matkal, night, intel on a senior commander, theater map ----------
  UNITS.matkal = { side: 'il', n: 'סיירת מטכ״ל', cls: 'inf', armor: 'inf', soldiers: 4, hpPer: 24, speed: 1.5, vision: 7, cost: 700, time: 10, q: 'inf', move: 'foot', beret: '#1d1d1d', supply: { ammo: 100, use: [.25, 1.5] },
                para: true, maxAlive: 2, stealth: { r: 2, fire: 4 }, detect: 4, strike: { dur: 15, cd: 90, cap: 2, dmg: 2 },
                desc: 'כוח עילית (4 לוחמים): מדויק, קטלני ומהיר. חמקן: האויב רואה אותו רק מ-2 משבצות או כשהוא יורה. חושף מארבים ומטענים עד 4 משבצות. לא פותח באש מעצמו (כדי לא להיחשף): טאפ על אויב כדי לתקוף. ⚡ פשיטה. אפשר להצניח. עד 2 בו זמנית',
                weapons: [{ n: 'רובי סער', range: 5, dmg: 4, cd: .85, fx: 'bullet', vs: { inf: 1, light: .65, armor: .08, bld: .18, drone: .4, air: .05 } },
                          { n: 'לאו', range: 4.5, dmg: 32, cd: 5, fx: 'rocket', vs: { inf: .35, light: 1, armor: .55, bld: .7 } }] };
  BUILD.inf.push('matkal');
  // Night-vision units: full vision and +15% accuracy at night.
  var NV = ['matkal', 'para', 'golani', 'merkava', 'namer', 'uav_recon', 'uav_attack', 'heli'];
  NV.forEach(function (k) { if (UNITS[k]) UNITS[k].nv = true; });
  // Day 6 min / night 3 min, 30 s dusk and dawn. vis = vision lost at night (no NV); spot = hidden-object reveal radius lost (no NV);
  // hzFloor: at night Hezbollah's reaction radius is halved but never below its weapon range + hzFloor tiles (keeps defenders reacting).
  // nvAcc / hzAcc = accuracy (damage) at night; aa = enemy fire at transport/supply planes at night.
  var DAYNIGHT = { day: 360, night: 180, fade: 30, vis: .5, hzFloor: 2, siteVis: .6, nvAcc: 1.15, hzAcc: .75, spot: .5, aa: .5 };
  // Intel on a senior Hezbollah commander: every ~5 min, 6 min to take the village and bring the captor home.
  var INTEL = { first: 300, every: 300, timer: 360, reward: 1500, matkalBonus: .5, reveal: 14, revealT: 90, deliver: 3.5, pick: 4 };
  // Theater (campaign) map. holder: who holds the city; front: which front it belongs to (only lebanon is open).
  var THEATER = {
    box: { lon0: 32.6, lon1: 63.4, lat0: 40.6, lat1: 24.4 },
    fronts: { lebanon: { n: 'לבנון', open: true }, syria: { n: 'סוריה', open: false }, iraq: { n: 'עיראק', open: false }, iran: { n: 'איראן', open: false } },
    holders: { il: { n: 'ישראל', c: '#65e5d0' }, hz: { n: 'חיזבאללה', c: '#f3ab63' }, syria: { n: 'משטר סוריה', c: '#e0645a' }, iraq: { n: 'מיליציות עיראק', c: '#d9813e' }, iran: { n: 'איראן', c: '#c94848' } },
    cities: [
      { key: 'beirut', n: 'ביירות', lat: 33.89, lon: 35.50, front: 'lebanon', site: 'beirut', cap: 1 },
      { key: 'tyre', n: 'צור', lat: 33.27, lon: 35.20, front: 'lebanon', site: 'tyre' },
      { key: 'sidon', n: 'צידון', lat: 33.56, lon: 35.37, front: 'lebanon', site: 'sidon' },
      { key: 'nabatieh', n: 'נבטייה', lat: 33.38, lon: 35.48, front: 'lebanon', site: 'nabatieh' },
      { key: 'baalbek', n: 'בעלבכ', lat: 34.01, lon: 36.21, front: 'lebanon', holder: 'hz' },
      { key: 'damascus', n: 'דמשק', lat: 33.51, lon: 36.29, front: 'syria', holder: 'syria', cap: 1 },
      { key: 'homs', n: 'חומס', lat: 34.73, lon: 36.72, front: 'syria', holder: 'syria' },
      { key: 'aleppo', n: 'חלב', lat: 36.20, lon: 37.16, front: 'syria', holder: 'syria' },
      { key: 'baghdad', n: 'בגדאד', lat: 33.31, lon: 44.37, front: 'iraq', holder: 'iraq', cap: 1 },
      { key: 'mosul', n: 'מוסול', lat: 36.34, lon: 43.13, front: 'iraq', holder: 'iraq' },
      { key: 'basra', n: 'בצרה', lat: 30.51, lon: 47.81, front: 'iraq', holder: 'iraq' },
      { key: 'tehran', n: 'טהרן', lat: 35.69, lon: 51.39, front: 'iran', holder: 'iran', cap: 1 },
      { key: 'isfahan', n: 'אספהאן', lat: 32.65, lon: 51.67, front: 'iran', holder: 'iran' },
      { key: 'tabriz', n: 'תבריז', lat: 38.08, lon: 46.29, front: 'iran', holder: 'iran' },
      { key: 'shiraz', n: 'שיראז', lat: 29.59, lon: 52.58, front: 'iran', holder: 'iran' }
    ],
    labels: [['לבנון', 34.75, 34.35, 'lebanon'], ['סוריה', 35.0, 38.6, 'syria'], ['עיראק', 33.0, 43.2, 'iraq'], ['איראן', 32.8, 54.5, 'iran'], ['ישראל', 31.0, 34.9, '']]
  };
  var data = { NV: NV, DAYNIGHT: DAYNIGHT, INTEL: INTEL, THEATER: THEATER, SMART: SMART, CTRL: CTRL, MAP: MAP, toTile: toTile, toLonLat: toLonLat, COAST: COAST, LITANI: LITANI, BRIDGES: BRIDGES, BORDER: BORDER, SYRIA: SYRIA,
    ROADS: ROADS, FORESTS: FORESTS, IL_TOWNS: IL_TOWNS, SITES: SITES, HOME: HOME, UNITS: UNITS, BUILD: BUILD, QUEUE_MAX: QUEUE_MAX,
    TERRAIN: TERRAIN, BONUS: BONUS, SITE_T: SITE_T, DIFF: DIFF, TD_CITY: { tyre: 'tyre', sidon: 'sidon', beirut: 'beirut' },
    TUNNELS: TUNNELS, CACHES: CACHES, LAUNCH_AREAS: LAUNCH_AREAS, HIDDEN: HIDDEN, SUPPLY: SUPPLY, ARTY: ARTY, PARA: PARA, SUPPLY_DROP: SUPPLY_DROP, SWEEP: SWEEP };
  root.LF = root.LF || {}; root.LF.data = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
