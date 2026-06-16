/**
 * Himalaya MKT EC Management System
 * Backend: Node.js 22 built-in SQLite + Express
 * No npm install needed
 */

'use strict';

// ─── Module paths ────────────────────────────────────────────────────────────
const BASE_MODULES = 'C:\\Users\\user\\AppData\\Roaming\\Genspark Claw\\bundled-resources\\openclaw\\node_modules';
const express = require(BASE_MODULES + '\\express');
const path    = require('path');
const fs      = require('fs');
const http    = require('http');
const { DatabaseSync } = require('node:sqlite');

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT    = 3456;
const DB_PATH = path.join(__dirname, 'data', 'himalaya.db');
const PUBLIC  = path.join(__dirname, 'public');

// ─── Database setup ───────────────────────────────────────────────────────────
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;

  -- Users / Auth
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    name      TEXT NOT NULL,
    role      TEXT NOT NULL DEFAULT 'staff', -- admin | manager | staff
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- KPI Overview per platform per month
  CREATE TABLE IF NOT EXISTS kpi_monthly (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    year          INTEGER NOT NULL DEFAULT 2026,
    month         INTEGER NOT NULL,  -- 1-12
    platform      TEXT NOT NULL,     -- shopee | lazada | tiktok | website
    target        REAL DEFAULT 0,
    actual        REAL DEFAULT 0,
    ads_cost      REAL DEFAULT 0,
    kol_cost      REAL DEFAULT 0,
    direction     TEXT DEFAULT '',
    promotion     TEXT DEFAULT '',
    notes         TEXT DEFAULT '',
    updated_by    TEXT DEFAULT '',
    updated_at    TEXT DEFAULT (datetime('now')),
    UNIQUE(year, month, platform)
  );

  -- Monthly Branding Themes
  CREATE TABLE IF NOT EXISTS branding_themes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    year       INTEGER NOT NULL DEFAULT 2026,
    month      INTEGER NOT NULL,
    theme      TEXT DEFAULT '',
    insight    TEXT DEFAULT '',
    content    TEXT DEFAULT '',
    products   TEXT DEFAULT '',  -- JSON array
    notes      TEXT DEFAULT '',
    updated_by TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(year, month)
  );

  -- Products / Price List
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT UNIQUE NOT NULL,
    barcode     TEXT DEFAULT '',
    name_vn     TEXT NOT NULL,
    name_en     TEXT DEFAULT '',
    spec        REAL DEFAULT 0,
    unit        TEXT DEFAULT 'ml',
    shipper_size TEXT DEFAULT '',
    cost_old    REAL DEFAULT 0,
    tmdt_old    REAL DEFAULT 0,
    cost_new    REAL DEFAULT 0,
    tmdt_new    REAL DEFAULT 0,
    active      INTEGER DEFAULT 1,
    notes       TEXT DEFAULT '',
    updated_by  TEXT DEFAULT '',
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  -- Promotional Deals
  CREATE TABLE IF NOT EXISTS deals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    year          INTEGER NOT NULL DEFAULT 2026,
    month         INTEGER NOT NULL,
    platform      TEXT NOT NULL,
    name          TEXT NOT NULL,
    products_desc TEXT DEFAULT '',
    price_original REAL DEFAULT 0,
    price_sale    REAL DEFAULT 0,
    qty_target    INTEGER DEFAULT 0,
    qty_actual    INTEGER DEFAULT 0,
    revenue_actual REAL DEFAULT 0,
    ads_cost      REAL DEFAULT 0,
    gift_cost     REAL DEFAULT 0,
    notes         TEXT DEFAULT '',
    status        TEXT DEFAULT 'planned', -- planned | active | done | cancelled
    created_by    TEXT DEFAULT '',
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  -- KOC Bookings
  CREATE TABLE IF NOT EXISTS koc_bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    year        INTEGER NOT NULL DEFAULT 2026,
    month       INTEGER NOT NULL,
    koc_name    TEXT NOT NULL,
    platform    TEXT DEFAULT 'tiktok',
    link        TEXT DEFAULT '',
    cost        REAL DEFAULT 0,
    cost_type   TEXT DEFAULT 'free', -- free | paid | product
    product_sent TEXT DEFAULT '',
    views       INTEGER DEFAULT 0,
    likes       INTEGER DEFAULT 0,
    status      TEXT DEFAULT 'pending', -- pending | posted | done
    notes       TEXT DEFAULT '',
    created_by  TEXT DEFAULT '',
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  -- Livestream Schedule
  CREATE TABLE IF NOT EXISTS livestream_schedule (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    year        INTEGER NOT NULL DEFAULT 2026,
    month       INTEGER NOT NULL,
    day         INTEGER NOT NULL,
    shift       INTEGER NOT NULL, -- 0=morning 1=afternoon 2=evening 3=night
    staff_name  TEXT NOT NULL,
    platform    TEXT DEFAULT 'shopee',
    notes       TEXT DEFAULT '',
    updated_by  TEXT DEFAULT '',
    UNIQUE(year, month, day, shift, platform)
  );

  -- Livestream Registrations
  CREATE TABLE IF NOT EXISTS ls_registrations (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    phone        TEXT DEFAULT '',
    has_exp      INTEGER DEFAULT 0,
    agree_salary INTEGER DEFAULT 0,
    preferred_shift TEXT DEFAULT '',
    notes        TEXT DEFAULT '',
    status       TEXT DEFAULT 'new', -- new | contacted | hired | rejected
    registered_at TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  -- Monthly Task Plans
  CREATE TABLE IF NOT EXISTS task_plans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    year        INTEGER NOT NULL DEFAULT 2026,
    month       INTEGER NOT NULL,
    week        INTEGER NOT NULL,  -- 1-5
    category    TEXT NOT NULL,     -- revenue | livestream | content | kol | ads | other
    task_name   TEXT NOT NULL,
    description TEXT DEFAULT '',
    assignee    TEXT DEFAULT '',
    target      TEXT DEFAULT '',
    status      TEXT DEFAULT 'pending', -- pending | in-progress | done | cancelled
    progress    INTEGER DEFAULT 0, -- 0-100
    due_date    TEXT DEFAULT '',
    notes       TEXT DEFAULT '',
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  -- Activity Log
  CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name  TEXT DEFAULT '',
    action     TEXT NOT NULL,
    table_name TEXT DEFAULT '',
    record_id  INTEGER DEFAULT 0,
    detail     TEXT DEFAULT '',
    ts         TEXT DEFAULT (datetime('now'))
  );
`);

// Seed default admin if not exists
const adminExists = db.prepare("SELECT id FROM users WHERE username='admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, name, role) VALUES (?,?,?,?)").run('admin','admin123','Administrator','admin');
  db.prepare("INSERT INTO users (username, password, name, role) VALUES (?,?,?,?)").run('manager','manager123','Marketing Manager','manager');
  db.prepare("INSERT INTO users (username, password, name, role) VALUES (?,?,?,?)").run('hien','hien123','Hiền','staff');
  db.prepare("INSERT INTO users (username, password, name, role) VALUES (?,?,?,?)").run('vy','vy123','Vy','staff');
  console.log('✅ Default users seeded');
}

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple session store (in-memory, good enough for LAN)
const sessions = {};
function makeToken() {
  return require('crypto').randomBytes(32).toString('hex');
}
function getUser(req) {
  const token = req.headers['x-auth-token'] || req.query._token;
  return token ? sessions[token] : null;
}
function requireAuth(req, res, next) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  req.user = user;
  next();
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username=? AND password=?").get(username, password);
  if (!user) return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  const token = makeToken();
  sessions[token] = { id: user.id, username: user.username, name: user.name, role: user.role };
  log(user.name, 'login', 'users', user.id, 'Đăng nhập thành công');
  res.json({ token, user: sessions[token] });
});

app.post('/api/logout', requireAuth, (req, res) => {
  const token = req.headers['x-auth-token'];
  delete sessions[token];
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => res.json(req.user));

// ─── Helpers ─────────────────────────────────────────────────────────────────
function log(user, action, table, id, detail) {
  try {
    db.prepare("INSERT INTO activity_log (user_name,action,table_name,record_id,detail) VALUES(?,?,?,?,?)").run(user||'',action,table||'',id||0,detail||'');
  } catch(e) {}
}

function apiRouter(table, opts = {}) {
  const r = express.Router();
  const { orderBy = 'id DESC', searchFields = [] } = opts;

  // List
  r.get('/', requireAuth, (req, res) => {
    try {
      let where = '1=1', params = [];
      const { year, month, platform, status, search } = req.query;
      if (year)     { where += ' AND year=?';     params.push(+year); }
      if (month)    { where += ' AND month=?';    params.push(+month); }
      if (platform) { where += ' AND platform=?'; params.push(platform); }
      if (status)   { where += ' AND status=?';   params.push(status); }
      if (search && searchFields.length) {
        const likeClause = searchFields.map(f => `${f} LIKE ?`).join(' OR ');
        where += ` AND (${likeClause})`;
        searchFields.forEach(() => params.push(`%${search}%`));
      }
      const rows = db.prepare(`SELECT * FROM ${table} WHERE ${where} ORDER BY ${orderBy}`).all(...params);
      res.json({ data: rows, total: rows.length });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Get one
  r.get('/:id', requireAuth, (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(+req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  // Get table columns (cached)
  const _colCache = {};
  function getCols(tbl) {
    if (_colCache[tbl]) return _colCache[tbl];
    const cols = db.prepare(`PRAGMA table_info(${tbl})`).all().map(r => r.name);
    _colCache[tbl] = cols;
    return cols;
  }

  // Create
  r.post('/', requireAuth, (req, res) => {
    try {
      const tableCols = getCols(table);
      const body = { ...req.body };
      delete body.id;
      const ts = new Date().toISOString().replace('T',' ').split('.')[0];
      if (tableCols.includes('updated_at')) body.updated_at = ts;
      if (tableCols.includes('created_by')) body.created_by = req.user.name;
      if (tableCols.includes('updated_by')) body.updated_by = req.user.name;
      // Only include fields that exist in the table
      const cols = Object.keys(body).filter(k => tableCols.includes(k));
      const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`;
      const info = db.prepare(sql).run(...cols.map(c => body[c]));
      log(req.user.name, 'create', table, info.lastInsertRowid, JSON.stringify(body).substring(0,200));
      res.json({ id: info.lastInsertRowid, ok: true });
    } catch(e) { res.status(400).json({ error: e.message }); }
  });

  // Update
  r.put('/:id', requireAuth, (req, res) => {
    try {
      const tableCols = getCols(table);
      const body = { ...req.body };
      delete body.id;
      const ts = new Date().toISOString().replace('T',' ').split('.')[0];
      if (tableCols.includes('updated_at')) body.updated_at = ts;
      if (tableCols.includes('updated_by')) body.updated_by = req.user.name;
      // Only include fields that exist in the table
      const cols = Object.keys(body).filter(k => tableCols.includes(k));
      if (cols.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      const sql = `UPDATE ${table} SET ${cols.map(c=>`${c}=?`).join(',')} WHERE id=?`;
      db.prepare(sql).run(...cols.map(c => body[c]), +req.params.id);
      log(req.user.name, 'update', table, +req.params.id, JSON.stringify(body).substring(0,200));
      res.json({ ok: true });
    } catch(e) { res.status(400).json({ error: e.message }); }
  });

  // Delete
  r.delete('/:id', requireAuth, (req, res) => {
    try {
      db.prepare(`DELETE FROM ${table} WHERE id=?`).run(+req.params.id);
      log(req.user.name, 'delete', table, +req.params.id, '');
      res.json({ ok: true });
    } catch(e) { res.status(400).json({ error: e.message }); }
  });

  return r;
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/kpi',        apiRouter('kpi_monthly',       { orderBy: 'year,month,platform', trackUser: true }));
app.use('/api/branding',   apiRouter('branding_themes',   { orderBy: 'year,month', trackUser: true }));
app.use('/api/products',   apiRouter('products',          { orderBy: 'code', searchFields: ['code','name_vn','name_en'], trackUser: true }));
app.use('/api/deals',      apiRouter('deals',             { orderBy: 'year,month,id', searchFields: ['name','products_desc'], trackUser: true }));
app.use('/api/koc',        apiRouter('koc_bookings',      { orderBy: 'year DESC,month DESC,id DESC', searchFields: ['koc_name'], trackUser: true }));
app.use('/api/livestream', apiRouter('livestream_schedule',{ orderBy: 'year,month,day,shift', trackUser: true }));
app.use('/api/ls-reg',     apiRouter('ls_registrations',  { orderBy: 'id DESC', searchFields: ['name','phone'], trackUser: true }));
app.use('/api/tasks',      apiRouter('task_plans',        { orderBy: 'year,month,week,category', searchFields: ['task_name','assignee'], trackUser: true }));

// Users management (admin only)
app.get('/api/users', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  res.json({ data: db.prepare("SELECT id,username,name,role,created_at FROM users").all() });
});
app.post('/api/users', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { username, password, name, role } = req.body;
  try {
    const info = db.prepare("INSERT INTO users (username,password,name,role) VALUES(?,?,?,?)").run(username,password,name,role||'staff');
    res.json({ id: info.lastInsertRowid, ok: true });
  } catch(e) { res.status(400).json({ error: e.message }); }
});
app.put('/api/users/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, password, role } = req.body;
  db.prepare("UPDATE users SET name=?, password=?, role=? WHERE id=?").run(name, password, role, +req.params.id);
  res.json({ ok: true });
});
app.delete('/api/users/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  if (+req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare("DELETE FROM users WHERE id=?").run(+req.params.id);
  res.json({ ok: true });
});

// Special: KPI upsert
app.post('/api/kpi/upsert', requireAuth, (req, res) => {
  try {
    const b = req.body;
    const ts = new Date().toISOString().replace('T',' ').split('.')[0];
    db.prepare(`INSERT INTO kpi_monthly (year,month,platform,target,actual,ads_cost,kol_cost,direction,promotion,notes,updated_by,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(year,month,platform) DO UPDATE SET
        target=excluded.target, actual=excluded.actual, ads_cost=excluded.ads_cost,
        kol_cost=excluded.kol_cost, direction=excluded.direction, promotion=excluded.promotion,
        notes=excluded.notes, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
    .run(b.year||2026, b.month, b.platform, b.target||0, b.actual||0, b.ads_cost||0, b.kol_cost||0,
         b.direction||'', b.promotion||'', b.notes||'', req.user.name, ts);
    res.json({ ok: true });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// Dashboard summary
app.get('/api/dashboard', requireAuth, (req, res) => {
  const year = +(req.query.year || 2026);
  const kpi  = db.prepare("SELECT * FROM kpi_monthly WHERE year=? ORDER BY month,platform").all(year);
  const recentDeals = db.prepare("SELECT * FROM deals WHERE year=? ORDER BY id DESC LIMIT 10").all(year);
  const kocCount = db.prepare("SELECT COUNT(*) as cnt FROM koc_bookings WHERE year=?").get(year);
  const lsCount  = db.prepare("SELECT COUNT(*) as cnt FROM ls_registrations").get();
  const recentLog = db.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 20").all();
  res.json({ kpi, recentDeals, kocCount: kocCount.cnt, lsCount: lsCount.cnt, recentLog });
});

// Activity log
app.get('/api/log', requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM activity_log ORDER BY id DESC LIMIT 100").all();
  res.json({ data: rows });
});

// ─── Change own password ──────────────────────────────────────────────────────
app.post('/api/change-password', requireAuth, (req, res) => {
  const { old_password, new_password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  if (user.password !== old_password) return res.status(400).json({ error: 'Mật khẩu cũ không đúng' });
  if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 4 ký tự' });
  db.prepare("UPDATE users SET password=? WHERE id=?").run(new_password, req.user.id);
  log(req.user.name, 'change-password', 'users', req.user.id, '');
  res.json({ ok: true });
});

// ─── Change own profile ───────────────────────────────────────────────────────
app.post('/api/change-profile', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Tên không được để trống' });
  db.prepare("UPDATE users SET name=? WHERE id=?").run(name.trim(), req.user.id);
  // Update session
  const token = req.headers['x-auth-token'];
  if (sessions[token]) sessions[token].name = name.trim();
  log(req.user.name, 'update-profile', 'users', req.user.id, `name=${name}`);
  res.json({ ok: true, name: name.trim() });
});

// ─── PUBLIC: Livestream Registration Form ────────────────────────────────────
// (Route defined later before static middleware)

app.post('/api/public/ls-register', (req, res) => {
  try {
    const { name, phone, has_exp, agree_salary, preferred_shift, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Vui lòng nhập họ tên' });
    if (!phone?.trim()) return res.status(400).json({ error: 'Vui lòng nhập số điện thoại' });
    const ts = new Date().toISOString().replace('T',' ').split('.')[0];
    const info = db.prepare(
      "INSERT INTO ls_registrations (name,phone,has_exp,agree_salary,preferred_shift,notes,status,registered_at,updated_at) VALUES(?,?,?,?,?,?,'new',?,?)"
    ).run(name.trim(), phone.trim(), has_exp?1:0, agree_salary?1:0, preferred_shift||'', notes||'', ts, ts);
    log('public', 'create', 'ls_registrations', info.lastInsertRowid, `name=${name}, phone=${phone}`);
    res.json({ ok: true, message: 'Đăng ký thành công! Chúng tôi sẽ liên hệ lại sớm nhất.' });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ─── Import CSV/data endpoint ─────────────────────────────────────────────────
app.post('/api/import/:table', requireAuth, (req, res) => {
  try {
    const { table } = req.params;
    const allowed = ['products','deals','koc_bookings','ls_registrations','kpi_monthly'];
    if (!allowed.includes(table)) return res.status(400).json({ error: 'Bảng không được phép import' });
    const rows = req.body.rows;
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'Không có dữ liệu' });
    let inserted = 0, errors = [];
    const ts = new Date().toISOString().replace('T',' ').split('.')[0];
    for (const row of rows) {
      try {
        const body = { ...row, updated_at: ts };
        delete body.id;
        const cols = Object.keys(body);
        db.prepare(`INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`).run(...cols.map(c=>body[c]));
        inserted++;
      } catch(e) { errors.push(e.message); }
    }
    log(req.user.name, 'import', table, 0, `${inserted} rows inserted`);
    res.json({ ok: true, inserted, errors: errors.slice(0,5) });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// ─── Static files ─────────────────────────────────────────────────────────────
// Public form MUST come BEFORE static middleware
app.get('/dang-ky-livestream', (req, res) => {
  res.sendFile(path.join(PUBLIC, 'dang-ky.html'));
});
app.use(express.static(PUBLIC));
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
http.createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🌿 Himalaya MKT EC Management System');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  ✅ Server running on port ${PORT}`);
  console.log(`  🌐 Local:   http://localhost:${PORT}`);
  // Get LAN IP
  const nets = require('os').networkInterfaces();
  for (const name of Object.values(nets)) {
    for (const net of name) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  🏢 Network: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log('═══════════════════════════════════════════════════');
  console.log('  Default accounts:');
  console.log('    admin   / admin123');
  console.log('    manager / manager123');
  console.log('    hien    / hien123');
  console.log('    vy      / vy123');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});
