// browser-bench test site
// Single Express server hosting 6 scenarios with per-session isolation.
// Listens on port 3000. Start with: node server.js

const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Per-sid state store. Each entry is a plain object with sub-keys per scenario.
// ---------------------------------------------------------------------------
const sessions = new Map();

function getSession(sid) {
  if (!sid) sid = 'default';
  if (!sessions.has(sid)) {
    sessions.set(sid, {
      form: null,
      location: null,
      total: null,
      secret: null,
      auth: { loggedIn: false },
      booking: null,
      visual: { deleteClicked: false, confirmed: false, lastClick: null },
    });
  }
  return sessions.get(sid);
}

function requireSid(req, res) {
  const sid = req.query.sid;
  if (!sid || typeof sid !== 'string') {
    res.status(400).json({ error: 'missing sid' });
    return null;
  }
  return sid;
}

// Deterministic secret for virtualized-scroll scenario.
function secretFor(sid, n) {
  return crypto.createHash('sha1').update(`${sid}:${n}`).digest('hex').slice(0, 8);
}

// ---------------------------------------------------------------------------
// Health + reset
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/reset', (req, res) => {
  const sid = requireSid(req, res);
  if (!sid) return;
  sessions.delete(sid);
  res.json({ ok: true, reset: sid });
});

// ---------------------------------------------------------------------------
// Scenario 1: form-fill
// ---------------------------------------------------------------------------
app.get('/form', (req, res) => {
  const sid = req.query.sid || '';
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Registration form</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:1rem}
label{display:block;margin:.75rem 0 .25rem;font-weight:600}
input,select{width:100%;padding:.5rem;font-size:1rem}
button{margin-top:1rem;padding:.6rem 1.2rem;font-size:1rem}</style></head>
<body>
<h1>Registration</h1>
<form id="regform" method="post" action="/api/form-submit?sid=${encodeURIComponent(sid)}">
  <label for="first_name">First name</label>
  <input id="first_name" name="first_name" type="text" required>

  <label for="last_name">Last name</label>
  <input id="last_name" name="last_name" type="text" required>

  <label for="email">Email</label>
  <input id="email" name="email" type="email" required>

  <label for="phone">Phone</label>
  <input id="phone" name="phone" type="tel" required>

  <label for="country">Country</label>
  <select id="country" name="country" required>
    <option value="">Select a country</option>
    <option value="US">United States</option>
    <option value="GB">United Kingdom</option>
    <option value="CA">Canada</option>
    <option value="DE">Germany</option>
    <option value="JP">Japan</option>
  </select>

  <label><input id="subscribe" name="subscribe" type="checkbox" value="on"> Subscribe to newsletter</label>

  <button id="submit_btn" type="submit">Submit</button>
</form>
</body></html>`);
});

app.post('/api/form-submit', (req, res) => {
  const sid = requireSid(req, res);
  if (!sid) return;
  const s = getSession(sid);
  s.form = {
    first_name: (req.body.first_name || '').trim(),
    last_name: (req.body.last_name || '').trim(),
    email: (req.body.email || '').trim(),
    phone: (req.body.phone || '').trim(),
    country: (req.body.country || '').trim(),
    subscribe: req.body.subscribe === 'on' || req.body.subscribe === true || req.body.subscribe === 'true',
  };
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Scenario 2: cascading-dropdowns
// ---------------------------------------------------------------------------
const GEO = {
  'United States': {
    California: ['San Francisco', 'Los Angeles', 'San Diego'],
    Texas: ['Austin', 'Houston', 'Dallas'],
    'New York': ['New York City', 'Buffalo', 'Albany'],
  },
  Canada: {
    Ontario: ['Toronto', 'Ottawa'],
    Quebec: ['Montreal', 'Quebec City'],
  },
  Germany: {
    Bavaria: ['Munich', 'Nuremberg'],
    Berlin: ['Berlin'],
  },
};

app.get('/dropdowns', (req, res) => {
  const sid = req.query.sid || '';
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Location picker</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:1rem}
.dd{position:relative;margin:1rem 0;border:1px solid #ccc;border-radius:4px}
.dd-toggle{padding:.6rem;cursor:pointer;user-select:none;background:#f7f7f7}
.dd-menu{display:none;border-top:1px solid #ccc;max-height:220px;overflow:auto}
.dd.open .dd-menu{display:block}
.dd-item{padding:.5rem .75rem;cursor:pointer}
.dd-item:hover{background:#eef}
.dd.disabled{opacity:.4;pointer-events:none}
button{margin-top:1rem;padding:.6rem 1.2rem;font-size:1rem}
.loading{padding:.5rem;color:#888}
</style></head>
<body>
<h1>Pick a location</h1>

<label>Country</label>
<div id="dd-country" class="dd" data-name="country">
  <div class="dd-toggle" id="country-toggle">Select country</div>
  <div class="dd-menu" id="country-menu"></div>
</div>

<label>State</label>
<div id="dd-state" class="dd disabled" data-name="state">
  <div class="dd-toggle" id="state-toggle">Select state</div>
  <div class="dd-menu" id="state-menu"></div>
</div>

<label>City</label>
<div id="dd-city" class="dd disabled" data-name="city">
  <div class="dd-toggle" id="city-toggle">Select city</div>
  <div class="dd-menu" id="city-menu"></div>
</div>

<button id="submit_location">Submit location</button>
<p id="status"></p>

<script>
const SID = ${JSON.stringify(sid)};
const selection = { country: null, state: null, city: null };

function openOnly(id) {
  document.querySelectorAll('.dd').forEach(el => {
    if (el.id === id) el.classList.toggle('open');
    else el.classList.remove('open');
  });
}

function closeAll() {
  document.querySelectorAll('.dd').forEach(el => el.classList.remove('open'));
}

function renderMenu(menuEl, items, onPick) {
  menuEl.innerHTML = '';
  items.forEach(v => {
    const d = document.createElement('div');
    d.className = 'dd-item';
    d.textContent = v;
    d.setAttribute('role', 'option');
    d.addEventListener('click', () => onPick(v));
    menuEl.appendChild(d);
  });
}

async function loadStates(country) {
  const menu = document.getElementById('state-menu');
  menu.innerHTML = '<div class="loading">Loading...</div>';
  const r = await fetch('/api/states?sid=' + encodeURIComponent(SID) + '&country=' + encodeURIComponent(country));
  const data = await r.json();
  renderMenu(menu, data.states, pickState);
}

async function loadCities(state) {
  const menu = document.getElementById('city-menu');
  menu.innerHTML = '<div class="loading">Loading...</div>';
  const r = await fetch('/api/cities?sid=' + encodeURIComponent(SID) + '&country=' + encodeURIComponent(selection.country) + '&state=' + encodeURIComponent(state));
  const data = await r.json();
  renderMenu(menu, data.cities, pickCity);
}

function pickCountry(v) {
  selection.country = v; selection.state = null; selection.city = null;
  document.getElementById('country-toggle').textContent = v;
  document.getElementById('state-toggle').textContent = 'Select state';
  document.getElementById('city-toggle').textContent = 'Select city';
  document.getElementById('dd-state').classList.remove('disabled');
  document.getElementById('dd-city').classList.add('disabled');
  document.getElementById('city-menu').innerHTML = '';
  loadStates(v);
  closeAll();
}

function pickState(v) {
  selection.state = v; selection.city = null;
  document.getElementById('state-toggle').textContent = v;
  document.getElementById('city-toggle').textContent = 'Select city';
  document.getElementById('dd-city').classList.remove('disabled');
  loadCities(v);
  closeAll();
}

function pickCity(v) {
  selection.city = v;
  document.getElementById('city-toggle').textContent = v;
  closeAll();
}

document.getElementById('country-toggle').addEventListener('click', () => openOnly('dd-country'));
document.getElementById('state-toggle').addEventListener('click', () => {
  if (document.getElementById('dd-state').classList.contains('disabled')) return;
  openOnly('dd-state');
});
document.getElementById('city-toggle').addEventListener('click', () => {
  if (document.getElementById('dd-city').classList.contains('disabled')) return;
  openOnly('dd-city');
});

document.getElementById('submit_location').addEventListener('click', async () => {
  const r = await fetch('/api/location?sid=' + encodeURIComponent(SID), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(selection),
  });
  const data = await r.json();
  document.getElementById('status').textContent = data.ok ? 'Submitted' : 'Error';
});

// Seed country options on load.
(async () => {
  const r = await fetch('/api/countries?sid=' + encodeURIComponent(SID));
  const data = await r.json();
  renderMenu(document.getElementById('country-menu'), data.countries, pickCountry);
})();
</script>
</body></html>`);
});

app.get('/api/countries', (req, res) => {
  res.json({ countries: Object.keys(GEO) });
});

app.get('/api/states', (req, res) => {
  const country = req.query.country;
  setTimeout(() => {
    const states = country && GEO[country] ? Object.keys(GEO[country]) : [];
    res.json({ states });
  }, 400);
});

app.get('/api/cities', (req, res) => {
  const country = req.query.country;
  const state = req.query.state;
  setTimeout(() => {
    const cities = country && state && GEO[country] && GEO[country][state] ? GEO[country][state] : [];
    res.json({ cities });
  }, 400);
});

app.post('/api/location', (req, res) => {
  const sid = requireSid(req, res);
  if (!sid) return;
  const s = getSession(sid);
  s.location = {
    country: (req.body.country || '').toString(),
    state: (req.body.state || '').toString(),
    city: (req.body.city || '').toString(),
  };
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Scenario 3: multi-tab
// ---------------------------------------------------------------------------
const PRODUCTS = [
  { id: 1, name: 'Widget Alpha', price: 9.99 },
  { id: 2, name: 'Widget Beta', price: 14.50 },
  { id: 3, name: 'Widget Gamma', price: 22.00 },
  { id: 4, name: 'Widget Delta', price: 7.25 },
  { id: 5, name: 'Widget Epsilon', price: 33.10 },
];
const PRODUCT_TOTAL = Math.round(PRODUCTS.reduce((a, p) => a + p.price, 0) * 100) / 100; // 86.84

app.get('/products', (req, res) => {
  const sid = req.query.sid || '';
  const links = PRODUCTS.map(p =>
    `<li><a href="/products/${p.id}?sid=${encodeURIComponent(sid)}">${p.name}</a></li>`
  ).join('');
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Products</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:1rem}
li{margin:.5rem 0}</style></head>
<body>
<h1>Product catalog</h1>
<p>Visit each product page to see its price.</p>
<ul>${links}</ul>
</body></html>`);
});

app.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) { res.status(404).send('not found'); return; }
  const sid = req.query.sid || '';
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${p.name}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:1rem}
.price{font-size:1.5rem;font-weight:700}</style></head>
<body>
<h1>${p.name}</h1>
<p>Product ID: <span id="pid">${p.id}</span></p>
<p>Price: <span id="price" class="price">$${p.price.toFixed(2)}</span></p>
<p><a href="/products?sid=${encodeURIComponent(sid)}">Back to catalog</a></p>
</body></html>`);
});

app.post('/api/total', (req, res) => {
  const sid = requireSid(req, res);
  if (!sid) return;
  const s = getSession(sid);
  const t = Number(req.body.total);
  s.total = Number.isFinite(t) ? t : null;
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Scenario 4: virtualized-scroll
// ---------------------------------------------------------------------------
const VS_TARGET = 173;
const VS_COUNT = 200;

app.get('/scroll', (req, res) => {
  const sid = req.query.sid || '';
  const secret = secretFor(sid, VS_TARGET);
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Virtualized list</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:1rem}
#viewport{height:400px;overflow-y:auto;border:1px solid #ccc;position:relative}
#spacer{position:relative}
.row{position:absolute;left:0;right:0;height:40px;display:flex;align-items:center;padding:0 .75rem;border-bottom:1px solid #eee}
button{margin-top:1rem;padding:.6rem 1.2rem;font-size:1rem}
</style></head>
<body>
<h1>Virtualized list (${VS_COUNT} items, ~10 in DOM)</h1>
<p>A target index is stored at <code>window.__TARGET_INDEX</code>. Find that item and read its <code>data-secret</code>.</p>
<div id="viewport">
  <div id="spacer" style="height:${VS_COUNT * 40}px"></div>
</div>
<p id="status"></p>
<script>
const SID = ${JSON.stringify(sid)};
const COUNT = ${VS_COUNT};
const ROW_H = 40;
const TARGET = ${VS_TARGET};
const TARGET_SECRET = ${JSON.stringify(secret)};
window.__TARGET_INDEX = TARGET;

const viewport = document.getElementById('viewport');
const spacer = document.getElementById('spacer');

function render() {
  // remove existing rows
  spacer.querySelectorAll('.row').forEach(r => r.remove());
  const start = Math.max(0, Math.floor(viewport.scrollTop / ROW_H) - 1);
  const end = Math.min(COUNT, start + 11);
  for (let i = start; i < end; i++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.style.top = (i * ROW_H) + 'px';
    row.setAttribute('role', 'listitem');
    row.setAttribute('data-index', String(i));
    // Only the target index carries the real secret attribute.
    if (i === TARGET) {
      row.setAttribute('data-secret', TARGET_SECRET);
    }
    row.textContent = 'Item ' + i;
    spacer.appendChild(row);
  }
}
viewport.addEventListener('scroll', render);
render();
</script>
</body></html>`);
});

app.post('/api/secret', (req, res) => {
  const sid = requireSid(req, res);
  if (!sid) return;
  const s = getSession(sid);
  s.secret = (req.body.secret || '').toString();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Scenario 5: auth-modal
// ---------------------------------------------------------------------------
const AUTH_USER = 'admin';
const AUTH_PASS = 'hunter2';

app.get('/auth', (req, res) => {
  const sid = req.query.sid || '';
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Login</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:2rem auto;padding:1rem}
label{display:block;margin:.75rem 0 .25rem;font-weight:600}
input{width:100%;padding:.5rem;font-size:1rem}
button{margin-top:1rem;padding:.6rem 1.2rem;font-size:1rem}
.err{color:#c00;margin-top:.5rem}</style></head>
<body>
<h1>Login</h1>
<form id="loginform" method="post" action="/api/login?sid=${encodeURIComponent(sid)}">
  <label for="username">Username</label>
  <input id="username" name="username" type="text" required>
  <label for="password">Password</label>
  <input id="password" name="password" type="password" required>
  <button id="login_btn" type="submit">Log in</button>
</form>
</body></html>`);
});

app.post('/api/login', (req, res) => {
  const sid = requireSid(req, res);
  if (!sid) return;
  const s = getSession(sid);
  const u = (req.body.username || '').trim();
  const p = (req.body.password || '').trim();
  if (u === AUTH_USER && p === AUTH_PASS) {
    s.auth.loggedIn = true;
    // form-submit: redirect to the dashboard.
    res.redirect(302, `/dashboard?sid=${encodeURIComponent(sid)}`);
  } else {
    res.status(401).type('html').send(`<p class="err">Invalid credentials.</p><p><a href="/auth?sid=${encodeURIComponent(sid)}">Back</a></p>`);
  }
});

app.get('/dashboard', (req, res) => {
  const sid = req.query.sid || '';
  const s = getSession(sid);
  if (!s.auth.loggedIn) {
    res.redirect(302, `/auth?sid=${encodeURIComponent(sid)}`);
    return;
  }
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Dashboard</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:1rem}
button{padding:.6rem 1.2rem;font-size:1rem}
#modal{position:fixed;inset:0;background:rgba(0,0,0,.4);display:none;align-items:center;justify-content:center}
#modal.open{display:flex}
.dialog{background:#fff;padding:1.5rem;border-radius:6px;min-width:320px}
label{display:block;margin:.75rem 0 .25rem;font-weight:600}
input{width:100%;padding:.5rem;font-size:1rem}
.row{margin-top:1rem;display:flex;gap:.5rem;justify-content:flex-end}
#status{margin-top:1rem;color:#0a0}
</style></head>
<body>
<h1>Dashboard</h1>
<p>Welcome, admin.</p>
<button id="open_modal">Book appointment</button>
<p id="status"></p>

<div id="modal" role="dialog" aria-modal="true" aria-labelledby="modal_title">
  <div class="dialog">
    <h2 id="modal_title">Book appointment</h2>
    <label for="appt_date">Date (YYYY-MM-DD)</label>
    <input id="appt_date" name="appt_date" type="text" placeholder="2026-05-20">
    <div class="row">
      <button id="cancel_modal" type="button">Cancel</button>
      <button id="confirm_modal" type="button">Confirm</button>
    </div>
  </div>
</div>

<script>
const SID = ${JSON.stringify(sid)};
const modal = document.getElementById('modal');
document.getElementById('open_modal').addEventListener('click', () => modal.classList.add('open'));
document.getElementById('cancel_modal').addEventListener('click', () => modal.classList.remove('open'));
document.getElementById('confirm_modal').addEventListener('click', async () => {
  const date = document.getElementById('appt_date').value;
  const r = await fetch('/api/book?sid=' + encodeURIComponent(SID), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  const data = await r.json();
  document.getElementById('status').textContent = data.ok ? ('Booked for ' + date) : 'Error';
  modal.classList.remove('open');
});
</script>
</body></html>`);
});

app.post('/api/book', (req, res) => {
  const sid = requireSid(req, res);
  if (!sid) return;
  const s = getSession(sid);
  if (!s.auth.loggedIn) { res.status(401).json({ error: 'not logged in' }); return; }
  s.booking = { date: (req.body.date || '').toString() };
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Scenario 6: visual-mismatch
// ---------------------------------------------------------------------------
app.get('/visual', (req, res) => {
  const sid = req.query.sid || '';
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Action panel</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:1rem}
.row{display:flex;gap:.5rem;margin:1rem 0}
button{padding:.6rem 1.2rem;font-size:1rem}
/* Save: visually disabled via CSS only, aria-disabled NOT set */
#btn_save{opacity:.3;pointer-events:none}
/* Cancel: visually fine, but aria-disabled via attribute */
#btn_cancel[aria-disabled="true"]{ /* no visual change */ }
#confirm_row{display:none;margin-top:1rem}
#confirm_row.visible{display:flex}
#status{margin-top:1rem;color:#0a0}
</style></head>
<body>
<h1>Actions</h1>
<p>Pick the action that is both visually enabled and not aria-disabled.</p>
<div class="row">
  <button id="btn_save" type="button">Save</button>
  <button id="btn_cancel" type="button" aria-disabled="true">Cancel</button>
  <button id="btn_delete" type="button">Delete</button>
</div>
<div id="confirm_row" class="row">
  <button id="btn_confirm" type="button">I'm sure</button>
</div>
<p id="status"></p>

<script>
const SID = ${JSON.stringify(sid)};

async function post(name) {
  const r = await fetch('/api/visual-click?sid=' + encodeURIComponent(SID), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ button: name }),
  });
  return r.json();
}

document.getElementById('btn_save').addEventListener('click', async () => {
  await post('save');
});
document.getElementById('btn_cancel').addEventListener('click', async (e) => {
  // If aria-disabled, refuse.
  if (e.currentTarget.getAttribute('aria-disabled') === 'true') {
    await post('cancel_blocked');
    return;
  }
  await post('cancel');
});
document.getElementById('btn_delete').addEventListener('click', async () => {
  await post('delete');
  document.getElementById('confirm_row').classList.add('visible');
});
document.getElementById('btn_confirm').addEventListener('click', async () => {
  const r = await post('confirm');
  document.getElementById('status').textContent = r.ok ? 'Deleted.' : 'Error';
});
</script>
</body></html>`);
});

app.post('/api/visual-click', (req, res) => {
  const sid = requireSid(req, res);
  if (!sid) return;
  const s = getSession(sid);
  const btn = (req.body.button || '').toString();
  s.visual.lastClick = btn;
  if (btn === 'delete') {
    s.visual.deleteClicked = true;
  } else if (btn === 'confirm') {
    if (s.visual.deleteClicked) s.visual.confirmed = true;
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Verify endpoints
// ---------------------------------------------------------------------------
function verifyFormFill(s) {
  const f = s.form;
  const ev = f ? { ...f } : {};
  const passed = !!f
    && f.first_name === 'Ada'
    && f.last_name === 'Lovelace'
    && f.email === 'ada@example.com'
    && f.phone === '+1-555-0100'
    && f.country === 'GB'
    && f.subscribe === true;
  return { passed, evidence: ev, score: passed ? 1.0 : 0.0 };
}

function verifyCascading(s) {
  const l = s.location;
  const ev = l ? { ...l } : {};
  const passed = !!l
    && l.country === 'United States'
    && l.state === 'California'
    && l.city === 'San Francisco';
  return { passed, evidence: ev, score: passed ? 1.0 : 0.0 };
}

function verifyMultiTab(s) {
  const ev = { total_submitted: s.total, total_expected: PRODUCT_TOTAL };
  const passed = s.total !== null && Math.abs(s.total - PRODUCT_TOTAL) < 0.005;
  return { passed, evidence: ev, score: passed ? 1.0 : 0.0 };
}

function verifyVirtualized(sid, s) {
  const expected = secretFor(sid, VS_TARGET);
  const ev = { secret_submitted: s.secret, secret_expected: expected, target_index: VS_TARGET };
  const passed = !!s.secret && s.secret === expected;
  return { passed, evidence: ev, score: passed ? 1.0 : 0.0 };
}

function verifyAuthModal(s) {
  const ev = { logged_in: s.auth.loggedIn, booking: s.booking };
  const passed = !!s.auth.loggedIn && !!s.booking && s.booking.date === '2026-05-20';
  return { passed, evidence: ev, score: passed ? 1.0 : 0.0 };
}

function verifyVisual(s) {
  const ev = { last_click: s.visual.lastClick, delete_clicked: s.visual.deleteClicked, confirmed: s.visual.confirmed };
  const passed = s.visual.deleteClicked && s.visual.confirmed;
  return { passed, evidence: ev, score: passed ? 1.0 : 0.0 };
}

const VERIFIERS = {
  'form-fill': (sid, s) => verifyFormFill(s),
  'cascading-dropdowns': (sid, s) => verifyCascading(s),
  'multi-tab': (sid, s) => verifyMultiTab(s),
  'virtualized-scroll': (sid, s) => verifyVirtualized(sid, s),
  'auth-modal': (sid, s) => verifyAuthModal(s),
  'visual-mismatch': (sid, s) => verifyVisual(s),
};

app.get('/verify/:task_id', (req, res) => {
  const sid = requireSid(req, res);
  if (!sid) return;
  const fn = VERIFIERS[req.params.task_id];
  if (!fn) { res.status(404).json({ error: 'unknown task_id' }); return; }
  const s = getSession(sid);
  res.json(fn(sid, s));
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`browser-bench test-site listening on http://localhost:${PORT}`);
});
