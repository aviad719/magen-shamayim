// shared.js — the shared war save (v4: the war budget is a shared pool; money moves only by the player's own transfers) between "מגן שמיים" (tower defense, site root) and
// "חזית לבנון" (RTS, /rts/). Both pages live on the same origin, so they share localStorage.
// Pure data + localStorage; no DOM. Works in the browser (window.SHARED) and in Node tests.
(function (root) {
  'use strict';
  var KEY = 'israelFront.shared.v1';
  // Cities that, once captured on the RTS fronts, join the tower-defense map as Israeli cities.
  var CITY_INFO = {
    tyre:   { key: 'tyre',   n: 'צור',    lon: 35.203, lat: 33.271, w: 0.10, front: 'lebanon' },
    sidon:  { key: 'sidon',  n: 'צידון',  lon: 35.371, lat: 33.561, w: 0.10, front: 'lebanon' },
    beirut: { key: 'beirut', n: 'ביירות', lon: 35.502, lat: 33.888, w: 0.12, front: 'lebanon' }
  };
  var mem = null; // fallback / test storage
  function store() {
    if (mem) return mem;
    try { if (root.localStorage) return root.localStorage; } catch (e) {}
    mem = memoryStorage(); return mem;
  }
  function memoryStorage() {
    var d = {};
    return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
             setItem: function (k, v) { d[k] = String(v); }, removeItem: function (k) { delete d[k]; }, _d: d };
  }
  function blank() { return { v: 1, budget: 0, earnedTotal: 0, captured: [], fronts: {}, launchers: {}, log: [] }; }
  function load() {
    try { var o = JSON.parse(store().getItem(KEY) || 'null'); if (o && o.v === 1) { o.captured = o.captured || []; o.fronts = o.fronts || {}; o.log = o.log || []; return o; } } catch (e) {}
    return blank();
  }
  function save(o) { try { store().setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function note(o, text) { o.log.unshift({ t: Date.now(), text: text }); if (o.log.length > 20) o.log.length = 20; }
  // v7 save code helpers: utf-8 base64 (no btoa/Buffer needed) + a short checksum
  var SAVE_KEYS = ['magenShamayim.save.v3', 'magenShamayim.best.v3', 'magenShamayim.scores.v7', 'israelFront.shared.v1', 'lebanonFront.save.v1'];
  var CODE_TAG = 'MSH1-';
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function utf8(str) { var out = []; for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i);
      if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) { c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00); }
      if (c < 0x80) out.push(c); else if (c < 0x800) out.push(0xc0 | c >> 6, 0x80 | c & 63);
      else if (c < 0x10000) out.push(0xe0 | c >> 12, 0x80 | c >> 6 & 63, 0x80 | c & 63);
      else out.push(0xf0 | c >> 18, 0x80 | c >> 12 & 63, 0x80 | c >> 6 & 63, 0x80 | c & 63); } return out; }
  function unutf8(b) { var s = ''; for (var i = 0; i < b.length;) { var c = b[i++];
      if (c >= 0xf0) c = (c & 7) << 18 | (b[i++] & 63) << 12 | (b[i++] & 63) << 6 | b[i++] & 63;
      else if (c >= 0xe0) c = (c & 15) << 12 | (b[i++] & 63) << 6 | b[i++] & 63;
      else if (c >= 0xc0) c = (c & 31) << 6 | b[i++] & 63;
      if (c >= 0x10000) { c -= 0x10000; s += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023)); } else s += String.fromCharCode(c); } return s; }
  function b64enc(str) { var b = utf8(str), o = ''; for (var i = 0; i < b.length; i += 3) { var n = b[i] << 16 | (b[i + 1] || 0) << 8 | (b[i + 2] || 0);
      o += B64[n >> 18 & 63] + B64[n >> 12 & 63] + (i + 1 < b.length ? B64[n >> 6 & 63] : '') + (i + 2 < b.length ? B64[n & 63] : ''); } return o; }
  function b64dec(s) { var b = [], buf = 0, bits = 0; for (var i = 0; i < s.length; i++) { var v = B64.indexOf(s[i]); if (v < 0) throw new Error('bad');
      buf = buf << 6 | v; bits += 6; if (bits >= 8) { bits -= 8; b.push(buf >> bits & 255); } } return unutf8(b); }
  function sum(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  var api = {
    KEY: KEY, CITY_INFO: CITY_INFO,
    useStorage: function (s) { mem = s; }, memoryStorage: memoryStorage,
    load: load, save: save,
    budget: function () { return Math.floor(load().budget || 0); },
    // tower defense: money earned in a wave accrues to the shared war budget ("תקציב מלחמה")
    addBudget: function (n, source) {
      n = Math.max(0, Math.floor(n || 0)); if (!n) return api.budget();
      var o = load(); o.budget = (o.budget || 0) + n; o.earnedTotal = (o.earnedTotal || 0) + n;
      note(o, '+₪' + n + (source ? ' (' + source + ')' : '')); save(o); return o.budget;
    },
    // legacy (v1–v3 auto-transfer). No longer called by either game; kept for old code paths.
    takeBudget: function () { var o = load(); var n = Math.floor(o.budget || 0); if (n > 0) { o.budget = 0; note(o, '-₪' + n + ' → חזית'); save(o); } return n; },
    // v4 manual transfers. The war budget is a shared pool ("קופה משותפת") between the two games.
    // deposit: a game's wallet pays n into the pool. withdraw: a game pulls up to n out of it (returns what it got).
    deposit: function (n, from) {
      n = Math.max(0, Math.floor(n || 0)); if (!n) return 0;
      var o = load(); o.budget = (o.budget || 0) + n; note(o, '+₪' + n + (from ? ' מ' + from : '')); save(o); return n;
    },
    withdraw: function (n, to) {
      var o = load(); n = Math.max(0, Math.min(Math.floor(n || 0), Math.floor(o.budget || 0))); if (!n) return 0;
      o.budget -= n; note(o, '-₪' + n + (to ? ' → ' + to : '')); save(o); return n;
    },
    // how much a transfer choice moves: '25' | '50' | 'all' | 'custom' (custom capped at the source balance)
    amountFor: function (choice, balance, custom) {
      balance = Math.max(0, Math.floor(balance || 0));
      if (choice === '25') return Math.floor(balance * 0.25);
      if (choice === '50') return Math.floor(balance * 0.5);
      if (choice === 'all') return balance;
      var c = Math.floor(Number(custom) || 0); return Math.max(0, Math.min(balance, c));
    },
    // move money between a game wallet and the pool. dir 'out' = wallet → pool, 'in' = pool → wallet.
    // wallet = { get: fn → number, set: fn(number) }. Returns the amount moved (0 when nothing moved).
    transfer: function (dir, n, wallet, name) {
      n = Math.max(0, Math.floor(n || 0)); if (!n || !wallet) return 0;
      if (dir === 'out') { var have = Math.floor(wallet.get() || 0); n = Math.min(n, have); if (!n) return 0; wallet.set(wallet.get() - n); return api.deposit(n, name); }
      var got = api.withdraw(n, name); if (got) wallet.set(wallet.get() + got); return got;
    },
    // v7 save code: one text code that carries both games' progress (TD save + best + high scores, RTS save, shared pool) to another device.
    SAVE_KEYS: SAVE_KEYS,
    exportCode: function () {
      var s = store(), d = {}, n = 0;
      for (var i = 0; i < SAVE_KEYS.length; i++) { var v = s.getItem(SAVE_KEYS[i]); if (v != null) { d[SAVE_KEYS[i]] = v; n++; } }
      var body = b64enc(JSON.stringify({ v: 1, at: Date.now(), d: d }));
      return CODE_TAG + body + '.' + sum(body);
    },
    // check a code without touching anything: { ok, error?, data?, summary? }
    readCode: function (code) {
      code = String(code || '').replace(/\s+/g, '');
      if (code.indexOf(CODE_TAG) !== 0) return { ok: false, error: 'זה לא קוד שמירה של המשחק' };
      var rest = code.slice(CODE_TAG.length), dot = rest.lastIndexOf('.');
      if (dot < 1) return { ok: false, error: 'הקוד חתוך או פגום' };
      var body = rest.slice(0, dot);
      if (sum(body) !== rest.slice(dot + 1)) return { ok: false, error: 'הקוד פגום (בדיקת תקינות נכשלה). העתיקו אותו שוב במלואו' };
      var o; try { o = JSON.parse(b64dec(body)); } catch (e) { return { ok: false, error: 'הקוד פגום' }; }
      if (!o || o.v !== 1 || !o.d || typeof o.d !== 'object') return { ok: false, error: 'הקוד פגום' };
      var d = {};
      for (var k in o.d) { if (SAVE_KEYS.indexOf(k) < 0 || typeof o.d[k] !== 'string') continue; try { JSON.parse(o.d[k]); } catch (e) { return { ok: false, error: 'הקוד פגום' }; } d[k] = o.d[k]; }
      var td = null, rts = null, pool = 0;
      try { td = JSON.parse(d['magenShamayim.save.v3'] || 'null'); } catch (e) {}
      try { rts = JSON.parse(d['lebanonFront.save.v1'] || 'null'); } catch (e) {}
      try { pool = Math.floor((JSON.parse(d[KEY] || 'null') || {}).budget || 0); } catch (e) {}
      var hs = []; try { hs = JSON.parse(d['magenShamayim.scores.v7'] || '[]') || []; } catch (e) {}
      return { ok: true, data: d, at: o.at, summary: { td: td ? { wave: td.wave, diff: td.diff } : null, rts: !!rts, pool: pool, scores: hs.length } };
    },
    // replace this device's progress with the code's (whitelisted keys only). Returns readCode's answer.
    importCode: function (code) {
      var r = api.readCode(code); if (!r.ok) return r;
      var s = store();
      for (var i = 0; i < SAVE_KEYS.length; i++) { try { s.removeItem(SAVE_KEYS[i]); } catch (e) {} }
      for (var k in r.data) s.setItem(k, r.data[k]);
      return r;
    },
    captured: function () { return load().captured.slice(); },
    capturedCities: function () { return load().captured.map(function (k) { return CITY_INFO[k]; }).filter(Boolean); },
    capture: function (key) {
      if (!CITY_INFO[key]) return false; var o = load();
      if (o.captured.indexOf(key) < 0) { o.captured.push(key); note(o, 'נכבשה ' + CITY_INFO[key].n); save(o); }
      return true;
    },
    // RTS → TD link: how many rocket launch areas are still alive on a front. Each live area makes TD waves harder.
    setLaunchers: function (n, front) {
      front = front || 'lebanon'; n = Math.max(0, Math.floor(n || 0)); var o = load(); o.launchers = o.launchers || {};
      var prev = o.launchers[front] ? o.launchers[front].n : -1; if (prev === n) return n;
      o.launchers[front] = { n: n, at: Date.now() }; if (prev >= 0) note(o, 'משגרים פעילים ב' + (front === 'lebanon' ? 'לבנון' : front) + ': ' + n); save(o); return n;
    },
    launchers: function (front) {
      var l = load().launchers || {}; if (front) return l[front] ? l[front].n : 0;
      var t = 0; for (var k in l) if (l[k] && l[k].n > 0) t += l[k].n; return t;
    },
    // extra short-range rockets per tower-defense wave: +1 per live area, +2 from wave 4, +3 from wave 7 (moderate)
    launcherRockets: function (wave) { var n = api.launchers(); return n * (1 + Math.floor(Math.max(0, (wave || 1) - 1) / 3)); },
    winFront: function (front) { var o = load(); o.fronts[front] = { won: true, at: Date.now() }; save(o); },
    frontWon: function (front) { var f = load().fronts[front]; return !!(f && f.won); },
    reset: function () { save(blank()); }
  };
  root.SHARED = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
