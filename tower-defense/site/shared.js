// shared.js — the shared war save between "מגן שמיים" (tower defense, site root) and
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
  function blank() { return { v: 1, budget: 0, earnedTotal: 0, captured: [], fronts: {}, log: [] }; }
  function load() {
    try { var o = JSON.parse(store().getItem(KEY) || 'null'); if (o && o.v === 1) { o.captured = o.captured || []; o.fronts = o.fronts || {}; o.log = o.log || []; return o; } } catch (e) {}
    return blank();
  }
  function save(o) { try { store().setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } }
  function note(o, text) { o.log.unshift({ t: Date.now(), text: text }); if (o.log.length > 20) o.log.length = 20; }
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
    // RTS: pull the whole war budget into the field wallet (returns the amount taken)
    takeBudget: function () { var o = load(); var n = Math.floor(o.budget || 0); if (n > 0) { o.budget = 0; note(o, '-₪' + n + ' → חזית'); save(o); } return n; },
    captured: function () { return load().captured.slice(); },
    capturedCities: function () { return load().captured.map(function (k) { return CITY_INFO[k]; }).filter(Boolean); },
    capture: function (key) {
      if (!CITY_INFO[key]) return false; var o = load();
      if (o.captured.indexOf(key) < 0) { o.captured.push(key); note(o, 'נכבשה ' + CITY_INFO[key].n); save(o); }
      return true;
    },
    winFront: function (front) { var o = load(); o.fronts[front] = { won: true, at: Date.now() }; save(o); },
    frontWon: function (front) { var f = load().fronts[front]; return !!(f && f.won); },
    reset: function () { save(blank()); }
  };
  root.SHARED = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
