// transfer.js — the "⇄ העברת כסף" dialog, shared by both games (מגן שמיים at the site root, חזית לבנון at /rts/).
// Moves money between this game's wallet and the shared war-budget pool in shared.js. Builds its own DOM + CSS.
(function (root) {
  'use strict';
  var doc = root.document, el = null, cfg = null, dir = 'in', choice = '50';
  var CSS = '.xfer-ov{position:fixed;inset:0;z-index:50;background:#020c12c4;display:flex;align-items:center;justify-content:center;' +
    'padding:max(6px,env(safe-area-inset-top,0px)) max(8px,env(safe-area-inset-right,0px)) max(6px,env(safe-area-inset-bottom,0px)) max(8px,env(safe-area-inset-left,0px));font-family:system-ui,-apple-system,Arial,sans-serif;direction:rtl}' +
    '.xfer-ov.hidden{display:none!important}.xfer{width:min(430px,100%);max-height:100%;overflow:auto;background:linear-gradient(135deg,#123542,#0a1f2a);border:1px solid #6fd2c0;border-radius:14px;box-shadow:0 18px 60px #000c;padding:10px 14px;color:#e8f4ed;text-align:center}' +
    '.xfer h2{margin:0 0 6px;font-size:17px}.xfer-bal{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:7px}.xfer-bal div{background:#0d2a33;border:1px solid #2f5d63;border-radius:9px;padding:4px 12px;min-width:120px}' +
    '.xfer-bal small{display:block;font-size:10px;color:#9cc7bd}.xfer-bal b{font-size:17px;color:#ffe08a;direction:ltr;display:inline-block}.xfer-bal .ar{font-size:20px;color:#6fd2c0;background:none;border:0;min-width:0;padding:0}' +
    '.xfer button{font:inherit;color:#e8f4ed;border:1px solid #3d7270;border-radius:9px;background:#183f48;padding:6px 8px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    '.xfer button.on{background:#2bb6a3;color:#06202a;border-color:#8ff0db;font-weight:800}.xfer button:disabled{opacity:.4}' +
    '.xfer-dir{display:flex;gap:6px;margin-bottom:6px}.xfer-dir button{flex:1;font-size:12px;font-weight:700}' +
    '.xfer-amt{display:flex;gap:5px;align-items:center}.xfer-amt button{flex:1;font-size:13px;font-weight:800}.xfer-amt input{flex:1.3;min-width:0;font:inherit;font-size:16px;padding:5px 6px;border-radius:9px;border:1px solid #3d7270;background:#0b242c;color:#fff;text-align:center;direction:ltr}' +
    '.xfer-amt input.on{border-color:#8ff0db;box-shadow:0 0 0 2px #2bb6a355}.xfer-sum{margin:7px 0 6px;font-size:13px;color:#d9eadf;min-height:17px}.xfer-sum b{color:#ffe08a}' +
    '.xfer-act{display:flex;gap:8px;justify-content:center}.xfer-act button{padding:8px 16px;font-size:13px;font-weight:800}.xfer-act .ok{background:#e8c13a;color:#1a1400;border-color:#ffe98a}' +
    '.xfer-note{font-size:10px;color:#9fbdb4;margin:6px 0 0;line-height:1.3}@media(max-height:330px){.xfer{padding:6px 12px}.xfer h2{font-size:15px;margin-bottom:3px}.xfer-note{display:none}}';
  function fmt(n) { return '₪' + Math.floor(n).toLocaleString('he-IL'); }
  function S() { return root.SHARED; }
  function build() {
    if (el) return el;
    var st = doc.createElement('style'); st.textContent = CSS; doc.head.appendChild(st);
    el = doc.createElement('div'); el.className = 'xfer-ov hidden'; el.id = 'xferOverlay'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'העברת כסף');
    el.innerHTML = '<div class="xfer"><h2>⇄ העברת כסף</h2>' +
      '<div class="xfer-bal"><div><small id="xHereN">כאן</small><b id="xHere">₪0</b></div><span class="ar">⇄</span><div><small>קופה משותפת</small><b id="xPool">₪0</b></div></div>' +
      '<div class="xfer-dir"><button data-dir="in" id="xIn">📥 משוך מהקופה</button><button data-dir="out" id="xOut">📤 שלח לקופה</button></div>' +
      '<div class="xfer-amt"><button data-c="25">25%</button><button data-c="50">50%</button><button data-c="all">הכל</button><input id="xCustom" type="number" inputmode="numeric" min="0" placeholder="סכום ₪"></div>' +
      '<p class="xfer-sum" id="xSum"></p><div class="xfer-act"><button class="cancel" id="xCancel">ביטול</button><button class="ok" id="xOk">אשר העברה</button></div>' +
      '<p class="xfer-note" id="xNote"></p></div>';
    doc.body.appendChild(el);
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (e.target === el) { close(false); return; } if (!b) return;
      if (b.dataset.dir) { dir = b.dataset.dir; refresh(); }
      else if (b.dataset.c) { choice = b.dataset.c; refresh(); }
      else if (b.id === 'xCancel') close(false);
      else if (b.id === 'xOk') confirm();
    });
    var inp = el.querySelector('#xCustom');
    inp.addEventListener('input', function () { choice = 'custom'; refresh(true); });
    inp.addEventListener('focus', function () { choice = 'custom'; refresh(true); });
    ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'wheel'].forEach(function (k) { el.addEventListener(k, function (e) { e.stopPropagation(); }, { passive: true }); });
    return el;
  }
  function source() { return dir === 'out' ? Math.floor(cfg.wallet.get() || 0) : S().budget(); }
  function amount() { return S().amountFor(choice, source(), el.querySelector('#xCustom').value); }
  function refresh(keepInput) {
    if (!el || !cfg) return; var q = function (s) { return el.querySelector(s); };
    q('#xHereN').textContent = cfg.here; q('#xHere').textContent = fmt(cfg.wallet.get()); q('#xPool').textContent = fmt(S().budget());
    q('#xIn').textContent = '📥 משוך מהקופה ל' + cfg.here; q('#xOut').textContent = '📤 שלח מ' + cfg.here + ' לקופה';
    el.querySelectorAll('[data-dir]').forEach(function (b) { b.classList.toggle('on', b.dataset.dir === dir); });
    el.querySelectorAll('[data-c]').forEach(function (b) { b.classList.toggle('on', b.dataset.c === choice); });
    q('#xCustom').classList.toggle('on', choice === 'custom'); if (choice !== 'custom' && !keepInput) q('#xCustom').value = '';
    var n = amount(), src = source();
    q('#xSum').innerHTML = !src ? (dir === 'out' ? 'אין כסף ב' + cfg.here + ' להעברה' : 'הקופה המשותפת ריקה') :
      n ? 'יועברו <b>' + fmt(n) + '</b> ' + (dir === 'out' ? 'מ' + cfg.here + ' לקופה' : 'מהקופה ל' + cfg.here) : 'בחרו סכום';
    q('#xOk').disabled = !n; q('#xNote').textContent = cfg.note || '';
  }
  function open(c) {
    if (!S()) return false; cfg = c; build(); dir = c.dir || (S().budget() > 0 ? 'in' : 'out'); choice = '50';
    el.querySelector('#xCustom').value = ''; refresh(); el.classList.remove('hidden'); if (cfg.onOpen) cfg.onOpen(); return true;
  }
  function confirm() {
    var n = amount(); if (!n) return 0; var moved = S().transfer(dir, n, cfg.wallet, cfg.here);
    var d = dir; close(true); if (cfg.onDone) cfg.onDone(moved, d); return moved;
  }
  function close(done) { if (!el || el.classList.contains('hidden')) return; el.classList.add('hidden'); if (cfg && cfg.onClose) cfg.onClose(!!done); }
  root.TRANSFER = { open: open, close: close, refresh: refresh, isOpen: function () { return !!el && !el.classList.contains('hidden'); },
    // test hooks: pick a direction/amount and confirm, exactly like the buttons do
    _set: function (d, c, custom) { dir = d; choice = c; if (el) el.querySelector('#xCustom').value = custom === undefined ? '' : custom; refresh(true); return amount(); }, _confirm: function () { return confirm(); } };
})(typeof window !== 'undefined' ? window : globalThis);
