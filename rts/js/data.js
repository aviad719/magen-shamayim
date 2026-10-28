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
                bonus: 'urban', desc: 'חי״ר. הכי טובים בשטח בנוי (כפרים וערים)',
                weapons: [{ n: 'רובים', range: 4.5, dmg: 1.4, cd: 1.0, fx: 'bullet', vs: { inf: 1, light: .6, armor: .08, bld: .15, drone: .3, air: .05 } },
                          { n: 'לאו', range: 4, dmg: 22, cd: 6, fx: 'rocket', vs: { inf: .3, light: 1, armor: .55, bld: .6 } }] },
    nahal:    { side: 'il', n: 'נח״ל', cls: 'inf', armor: 'inf', soldiers: 8, hpPer: 12, speed: 1.2, vision: 6, cost: 350, time: 8, q: 'inf', move: 'foot', beret: '#3e9b3e', supply: { ammo: 100, use: [.3, 2] },
                bonus: 'forest', desc: 'חי״ר. הכי טובים בשטח מיוער',
                weapons: [{ n: 'רובים', range: 4.5, dmg: 1.4, cd: 1.0, fx: 'bullet', vs: { inf: 1, light: .6, armor: .08, bld: .15, drone: .3, air: .05 } },
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
    inf: ['golani', 'nahal', 'givati', 'engineer'],
    veh: ['merkava', 'namer', 'truck'],
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
                vsBy: { jet: 1.6, uav_attack: 1.8, heli: 1.2, merkava: .6, namer: .6, post: .25, golani: .25, nahal: .25, givati: .25, engineer: .25 } }
  };
  // Supply: max ammo / fuel, drain per shot (per weapon index) and fuel per tile moved. Refill rates are % of max per second.
  var SUPPLY = { refillAmmo: .09, refillFuel: .11, truckRadius: 4, zoneExtra: 2.5, low: .25, noFuelSpeed: .25 };
  var data = { MAP: MAP, toTile: toTile, toLonLat: toLonLat, COAST: COAST, LITANI: LITANI, BRIDGES: BRIDGES, BORDER: BORDER, SYRIA: SYRIA,
    ROADS: ROADS, FORESTS: FORESTS, IL_TOWNS: IL_TOWNS, SITES: SITES, HOME: HOME, UNITS: UNITS, BUILD: BUILD, QUEUE_MAX: QUEUE_MAX,
    TERRAIN: TERRAIN, BONUS: BONUS, SITE_T: SITE_T, DIFF: DIFF, TD_CITY: { tyre: 'tyre', sidon: 'sidon', beirut: 'beirut' },
    TUNNELS: TUNNELS, CACHES: CACHES, LAUNCH_AREAS: LAUNCH_AREAS, HIDDEN: HIDDEN, SUPPLY: SUPPLY };
  root.LF = root.LF || {}; root.LF.data = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
