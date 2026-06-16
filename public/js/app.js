// ════════════════════════════════════════════════════════
//  Himalaya MKT EC System — Frontend
// ════════════════════════════════════════════════════════
'use strict';

// ─── State ───────────────────────────────────────────────
let TOKEN = localStorage.getItem('mkt_token') || '';
let ME    = JSON.parse(localStorage.getItem('mkt_me') || 'null');
let CURRENT_PAGE = 'dashboard';
let CURRENT_YEAR = 2026;

// ─── API ─────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type':'application/json', 'x-auth-token': TOKEN }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Lỗi server');
  return data;
}
const GET    = p      => api('GET',    p);
const POST   = (p, b) => api('POST',   p, b);
const PUT    = (p, b) => api('PUT',    p, b);
const DELETE = p      => api('DELETE', p);

// ─── Formatting ──────────────────────────────────────────
const vnd  = n => n || n===0 ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫' : '–';
const pct  = n => n != null ? (n*100).toFixed(1)+'%' : '–';
const num  = n => n != null ? new Intl.NumberFormat('vi-VN').format(n) : '–';
const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
const MONTH_NAMES = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const PLATFORMS = ['shopee','lazada','tiktok','website'];
const PLATFORM_LABELS = { shopee:'Shopee', lazada:'Lazada', tiktok:'TikTok', website:'Website' };
const SHIFTS = ['Ca sáng (10-12h)','Ca chiều (14-16h)','Ca tối (19-21h)','Ca khuya (22-24h)'];
const STAFF_COLORS = { 'Vy':'slot-vy','Hiền':'slot-hien','Liên':'slot-lien' };

// ─── Toast ───────────────────────────────────────────────
function toast(msg, type='success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── Modal ───────────────────────────────────────────────
let _modalConfirm = null;
function openModal(title, body, onConfirm, opts={}) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-confirm').textContent = opts.confirmText || 'Lưu';
  document.getElementById('modal-confirm').className = `btn btn-${opts.danger?'danger':'primary'}`;
  document.getElementById('modal-footer').style.display = opts.noFooter ? 'none' : '';
  _modalConfirm = onConfirm;
  document.getElementById('modal-confirm').onclick = async () => {
    if (_modalConfirm) { await _modalConfirm(); }
  };
  document.getElementById('modal-overlay').classList.add('open');
  setTimeout(() => { const f = document.querySelector('#modal-body input,#modal-body select'); if(f) f.focus(); }, 100);
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

// ─── Auth ─────────────────────────────────────────────────
async function doLogin() {
  const user = document.getElementById('l-user').value.trim();
  const pass = document.getElementById('l-pass').value;
  if (!user || !pass) { showLoginErr('Vui lòng nhập đầy đủ'); return; }
  try {
    const res = await POST('/login', { username: user, password: pass });
    TOKEN = res.token;
    ME    = res.user;
    localStorage.setItem('mkt_token', TOKEN);
    localStorage.setItem('mkt_me', JSON.stringify(ME));
    initApp();
  } catch(e) { showLoginErr(e.message); }
}
function showLoginErr(msg) {
  const el = document.getElementById('login-err');
  el.textContent = msg; el.style.display = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin();
});

async function doLogout() {
  try { await POST('/logout', {}); } catch(e){}
  TOKEN = ''; ME = null;
  localStorage.removeItem('mkt_token');
  localStorage.removeItem('mkt_me');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = '';
}

function initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('nav-name').textContent = ME.name;
  document.getElementById('nav-role').textContent = ME.role;
  document.getElementById('nav-avatar').textContent = ME.name[0].toUpperCase();
  if (ME.role === 'admin') {
    document.getElementById('nav-admin').style.display = '';
    document.getElementById('nav-users').style.display = '';
    document.getElementById('nav-log').style.display = '';
  }
  goto('dashboard');
}

// Auto-login if token exists
(async () => {
  if (TOKEN && ME) {
    try {
      await GET('/me');
      initApp();
    } catch(e) { TOKEN=''; ME=null; localStorage.removeItem('mkt_token'); localStorage.removeItem('mkt_me'); }
  }
})();

// ─── Navigation ───────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:'📊 Dashboard', kpi:'🎯 KPI theo tháng', branding:'🎨 Chủ đề Branding theo tháng',
  deals:'🏷️ Deal Sàn & Kết quả', tasks:'📋 Kế hoạch công việc theo tuần',
  products:'🧴 Bảng giá sản phẩm', 'ls-schedule':'📺 Lịch Livestream',
  'ls-reg':'📝 Đăng ký Livestream', koc:'🎥 KOC Booking',
  profile:'⚙️ Tài khoản của tôi', import:'📥 Nhập dữ liệu',
  users:'👥 Quản lý tài khoản', log:'📜 Nhật ký hoạt động'
};
const RENDERERS = {};

function goto(page) {
  CURRENT_PAGE = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || page;
  document.getElementById('topbar-actions').innerHTML = '';
  const c = document.getElementById('content');
  c.innerHTML = '<div style="padding:40px;text-align:center;color:#64748B">⏳ Đang tải...</div>';
  if (RENDERERS[page]) RENDERERS[page](c);
  else c.innerHTML = '<div class="empty-state"><div class="icon">🚧</div><p>Trang này đang phát triển</p></div>';
}

// ═══════════════════════════════════════════════════════════
//  PAGE: DASHBOARD
// ═══════════════════════════════════════════════════════════
RENDERERS.dashboard = async (c) => {
  try {
    const d = await GET('/dashboard?year=' + CURRENT_YEAR);
    const kpi = d.kpi;

    // Aggregate by month
    const byMonth = {};
    kpi.forEach(row => {
      const m = row.month;
      if (!byMonth[m]) byMonth[m] = { target:0, actual:0 };
      byMonth[m].target += row.target;
      byMonth[m].actual += row.actual;
    });
    const totalTarget = kpi.reduce((s,r)=>s+r.target,0);
    const totalActual = kpi.reduce((s,r)=>s+r.actual,0);
    const doneMonths  = Object.values(byMonth).filter(m=>m.actual>0).length;

    c.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card stat-blue"><div class="stat-label">Mục tiêu năm ${CURRENT_YEAR}</div><div class="stat-value">${totalTarget>=1e9?(totalTarget/1e9).toFixed(1)+'B':(totalTarget/1e6).toFixed(0)+'M'} ₫</div><div class="stat-sub">Tất cả sàn</div></div>
      <div class="stat-card stat-green"><div class="stat-label">Doanh số thực tế YTD</div><div class="stat-value">${totalActual>=1e9?(totalActual/1e9).toFixed(1)+'B':(totalActual/1e6).toFixed(0)+'M'} ₫</div><div class="stat-sub">${doneMonths} tháng có dữ liệu</div></div>
      <div class="stat-card stat-orange"><div class="stat-label">KOC Booking</div><div class="stat-value">${d.kocCount}</div><div class="stat-sub">Tổng bài đã booking</div></div>
      <div class="stat-card stat-red"><div class="stat-label">Đăng ký Livestream</div><div class="stat-value">${d.lsCount}</div><div class="stat-sub">Ứng viên</div></div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:20px">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title">📈 Doanh số theo tháng</span>
          <select onchange="CURRENT_YEAR=+this.value;goto('dashboard')" style="font-size:12px;padding:4px 8px">
            <option value="2025" ${CURRENT_YEAR===2025?'selected':''}>2025</option>
            <option value="2026" ${CURRENT_YEAR===2026?'selected':''}>2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
        <canvas id="chart-main" height="100"></canvas>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title">🏪 Theo sàn</span></div>
        <canvas id="chart-platform" height="180"></canvas>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title">🏷️ Deal gần đây</span><a href="#" onclick="goto('deals');return false" style="font-size:12px">Xem tất cả →</a></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Deal</th><th>Sàn</th><th>Tháng</th><th>Trạng thái</th></tr></thead>
            <tbody>${d.recentDeals.length ? d.recentDeals.map(r=>`<tr>
              <td>${r.name}</td><td>${PLATFORM_LABELS[r.platform]||r.platform}</td>
              <td class="td-c"><span class="badge b-blue">T${r.month}</span></td>
              <td class="td-c"><span class="badge ${statusBadge(r.status)}">${statusLabel(r.status)}</span></td>
            </tr>`).join('') : '<tr><td colspan="4" class="empty-state" style="padding:20px">Chưa có deal</td></tr>'}</tbody>
          </table>
        </div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-header"><span class="card-title">📜 Hoạt động gần đây</span></div>
        <div style="max-height:260px;overflow-y:auto">
          ${d.recentLog.length ? d.recentLog.map(l=>`
            <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:12px">
              <span style="color:var(--gray-500);flex-shrink:0">${l.ts?.split(' ')[1]?.substring(0,5)||''}</span>
              <span><strong>${l.user_name}</strong> ${actionLabel(l.action)} <span style="color:var(--gray-500)">${l.table_name}</span></span>
            </div>`).join('') : '<p class="text-muted" style="padding:12px 0">Chưa có hoạt động</p>'}
        </div>
      </div>
    </div>`;

    // Main chart
    const labels = MONTHS;
    const targetData = MONTHS.map((_,i) => byMonth[i+1]?.target||0);
    const actualData = MONTHS.map((_,i) => byMonth[i+1]?.actual||0);
    new Chart(document.getElementById('chart-main').getContext('2d'), {
      type:'bar',
      data: { labels, datasets: [
        {label:'Mục tiêu',data:targetData,backgroundColor:'rgba(29,78,216,0.15)',borderColor:'rgb(29,78,216)',borderWidth:2},
        {label:'Thực tế',data:actualData,backgroundColor:'rgba(21,128,61,0.7)',borderColor:'rgb(21,128,61)',borderWidth:2},
      ]},
      options:{ plugins:{legend:{position:'top'}}, scales:{y:{ticks:{callback:v=>(v/1e6).toFixed(0)+'M'}}} }
    });

    // Platform pie
    const platData = PLATFORMS.map(p => kpi.filter(r=>r.platform===p).reduce((s,r)=>s+r.actual,0));
    const platColors = ['#1D4ED8','#D97706','#EC4899','#059669'];
    new Chart(document.getElementById('chart-platform').getContext('2d'), {
      type:'doughnut',
      data:{ labels:PLATFORMS.map(p=>PLATFORM_LABELS[p]), datasets:[{data:platData,backgroundColor:platColors}]},
      options:{ plugins:{legend:{position:'bottom'}} }
    });
  } catch(e) { c.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`; }
};

// ═══════════════════════════════════════════════════════════
//  PAGE: KPI Monthly
// ═══════════════════════════════════════════════════════════
RENDERERS.kpi = async (c) => {
  let year = CURRENT_YEAR;
  const render = async () => {
    try {
      const { data } = await GET(`/kpi?year=${year}`);
      // Build a grid: rows=months, cols=platforms
      const byKey = {};
      data.forEach(r => { byKey[`${r.month}-${r.platform}`] = r; });

      document.getElementById('topbar-actions').innerHTML = `
        <select id="kpi-year" onchange="year=+this.value;render()" style="padding:6px 10px;border-radius:6px;border:1px solid var(--gray-300)">
          <option value="2025">2025</option><option value="2026" selected>2026</option><option value="2027">2027</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="openKPIModal()">✏️ Cập nhật KPI</button>`;

      c.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">🎯 KPI Doanh số năm ${year}</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Tháng</th>
              ${PLATFORMS.map(p=>`<th colspan="3">${PLATFORM_LABELS[p]}</th>`).join('')}
            </tr>
            <tr>
              <th></th>
              ${PLATFORMS.map(()=>'<th>Target</th><th>Thực tế</th><th>Đạt %</th>').join('')}
            </tr></thead>
            <tbody>
              ${MONTHS.map((m,i) => {
                const month = i+1;
                return `<tr>
                  <td><strong>${m}</strong></td>
                  ${PLATFORMS.map(p => {
                    const row = byKey[`${month}-${p}`];
                    const t = row?.target||0, a = row?.actual||0;
                    const rate = t>0?a/t:0;
                    const cls = a>0?(rate>=1?'b-green':rate>=0.7?'b-orange':'b-red'):'b-gray';
                    return `<td class="td-r">${t>0?vnd(t):'–'}</td>
                      <td class="td-r">${a>0?vnd(a):'–'}</td>
                      <td class="td-c">${t>0&&a>0?`<span class="badge ${cls}">${pct(rate)}</span>`:'–'}</td>`;
                  }).join('')}
                </tr>`;
              }).join('')}
              <tr style="background:var(--gray-50);font-weight:700">
                <td>Tổng</td>
                ${PLATFORMS.map(p => {
                  const t = data.filter(r=>r.platform===p).reduce((s,r)=>s+r.target,0);
                  const a = data.filter(r=>r.platform===p).reduce((s,r)=>s+r.actual,0);
                  const rate = t>0?a/t:0;
                  return `<td class="td-r">${vnd(t)}</td><td class="td-r">${vnd(a)}</td><td class="td-c">${t>0?`<span class="badge ${rate>=1?'b-green':rate>=0.7?'b-orange':'b-red'}">${pct(rate)}</span>`:'–'}</td>`;
                }).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">📋 Chi tiết theo sàn</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tháng</th><th>Sàn</th><th>Target</th><th>Thực tế</th><th>Quảng cáo</th><th>KOL Cost</th><th>Hướng sàn</th><th>Quảng bá</th><th>Ghi chú</th><th></th></tr></thead>
            <tbody>
              ${data.length ? data.map(r => `<tr>
                <td><strong>T${r.month}</strong></td>
                <td><span class="badge b-blue">${PLATFORM_LABELS[r.platform]||r.platform}</span></td>
                <td class="td-r">${r.target>0?vnd(r.target):'–'}</td>
                <td class="td-r">${r.actual>0?vnd(r.actual):'–'}</td>
                <td class="td-r">${r.ads_cost>0?vnd(r.ads_cost):'–'}</td>
                <td class="td-r">${r.kol_cost>0?vnd(r.kol_cost):'–'}</td>
                <td class="td-wrap">${r.direction||'–'}</td>
                <td class="td-wrap">${r.promotion||'–'}</td>
                <td class="td-wrap">${r.notes||'–'}</td>
                <td class="td-c"><button class="btn btn-outline btn-xs" onclick='editKPI(${JSON.stringify(r)})'>✏️</button></td>
              </tr>`).join('') : '<tr><td colspan="10" class="empty-state" style="padding:20px">Chưa có dữ liệu. Nhấn "Cập nhật KPI" để thêm.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
    } catch(e) { c.innerHTML = errHtml(e); }
  };
  window.render = render;
  window.openKPIModal = () => editKPI({ year, month:1, platform:'shopee' });
  window.editKPI = (row) => {
    openModal(row.id ? `Sửa KPI – T${row.month} ${PLATFORM_LABELS[row.platform]||row.platform}` : 'Thêm / Cập nhật KPI',
      kpiForm(row), async () => {
        const b = readForm('kpi-form');
        await POST('/kpi/upsert', b);
        toast('Đã lưu KPI'); closeModal(); render();
      });
  };
  render();
};

function kpiForm(row={}) {
  return `<div class="form-grid" id="kpi-form">
    <div class="form-group"><label>Năm</label><input name="year" type="number" value="${row.year||2026}"></div>
    <div class="form-group"><label>Tháng (1-12)</label><input name="month" type="number" min="1" max="12" value="${row.month||1}"></div>
    <div class="form-group"><label>Sàn</label>
      <select name="platform">${PLATFORMS.map(p=>`<option value="${p}" ${row.platform===p?'selected':''}>${PLATFORM_LABELS[p]}</option>`).join('')}</select></div>
    <div class="form-group"><label>Target (₫)</label><input name="target" type="number" value="${row.target||0}"></div>
    <div class="form-group"><label>Thực tế (₫)</label><input name="actual" type="number" value="${row.actual||0}"></div>
    <div class="form-group"><label>Chi phí Quảng cáo (₫)</label><input name="ads_cost" type="number" value="${row.ads_cost||0}"></div>
    <div class="form-group"><label>Chi phí KOL (₫)</label><input name="kol_cost" type="number" value="${row.kol_cost||0}"></div>
    <div class="form-group span3"><label>Hướng sàn</label><input name="direction" value="${row.direction||''}"></div>
    <div class="form-group span3"><label>Quảng bá</label><input name="promotion" value="${row.promotion||''}"></div>
    <div class="form-group span3"><label>Ghi chú</label><textarea name="notes">${row.notes||''}</textarea></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
//  PAGE: BRANDING
// ═══════════════════════════════════════════════════════════
RENDERERS.branding = async (c) => {
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="editBranding()">+ Thêm / Sửa chủ đề</button>`;
  try {
    const { data } = await GET('/branding?year=' + CURRENT_YEAR);
    const byMonth = {};
    data.forEach(r => { byMonth[r.month] = r; });
    c.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
      ${MONTHS.map((m,i) => {
        const r = byMonth[i+1];
        return `<div class="card" style="margin:0">
          <div class="card-header">
            <span class="card-title" style="font-size:14px">${m} – ${MONTH_NAMES[i]}</span>
            <button class="btn btn-outline btn-xs" onclick='editBranding(${JSON.stringify(r||{month:i+1,year:CURRENT_YEAR})})'>✏️</button>
          </div>
          ${r ? `
            <div style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:8px">"${r.theme||'–'}"</div>
            <div style="font-size:12px;color:var(--gray-500);margin-bottom:6px">💡 ${r.insight||'–'}</div>
            <div style="font-size:12px;color:var(--gray-700);margin-bottom:8px">📝 ${r.content||'–'}</div>
            <div>${(JSON.parse(r.products||'[]')).map(p=>`<span class="tag">${p}</span>`).join('')}</div>
            ${r.notes?`<div class="text-muted" style="margin-top:8px">${r.notes}</div>`:''}
          ` : `<div class="empty-state" style="padding:20px"><p>Chưa có chủ đề. <a href="#" onclick="editBranding({month:${i+1},year:${CURRENT_YEAR}});return false">Thêm ngay →</a></p></div>`}
        </div>`;
      }).join('')}
    </div>`;
    window.editBranding = (row={}) => {
      openModal(row.id ? `Sửa chủ đề T${row.month}` : 'Thêm chủ đề Branding', `
        <div class="form-grid" id="br-form">
          <div class="form-group"><label>Năm</label><input name="year" type="number" value="${row.year||CURRENT_YEAR}"></div>
          <div class="form-group"><label>Tháng (1-12)</label><input name="month" type="number" min="1" max="12" value="${row.month||1}"></div>
          <div class="form-group span2"><label>Chủ đề (Theme)</label><input name="theme" value="${row.theme||''}"></div>
          <div class="form-group span2"><label>Insight thị trường</label><textarea name="insight">${row.insight||''}</textarea></div>
          <div class="form-group span2"><label>Nội dung / Ý tưởng</label><textarea name="content">${row.content||''}</textarea></div>
          <div class="form-group span2"><label>Sản phẩm đẩy mạnh (mỗi dòng 1 sản phẩm)</label>
            <textarea name="products_raw" placeholder="Kem dưỡng neem&#10;Xà bông&#10;Sữa rửa mặt">${(JSON.parse(row.products||'[]')).join('\n')}</textarea></div>
          <div class="form-group span2"><label>Ghi chú</label><textarea name="notes">${row.notes||''}</textarea></div>
        </div>`, async () => {
        const b = readForm('br-form');
        b.products = JSON.stringify(b.products_raw?.split('\n').map(s=>s.trim()).filter(Boolean)||[]);
        delete b.products_raw;
        if (row.id) await PUT(`/branding/${row.id}`, b);
        else await POST('/branding', b);
        toast('Đã lưu'); closeModal(); RENDERERS.branding(c);
      });
    };
  } catch(e) { c.innerHTML = errHtml(e); }
};

// ═══════════════════════════════════════════════════════════
//  PAGE: DEALS
// ═══════════════════════════════════════════════════════════
RENDERERS.deals = async (c) => {
  let fMonth='', fPlat='', fStatus='';
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openDealModal()">+ Thêm deal</button>`;

  const render = async () => {
    let url = `/deals?year=${CURRENT_YEAR}`;
    if (fMonth) url += `&month=${fMonth}`;
    if (fPlat)  url += `&platform=${fPlat}`;
    if (fStatus) url += `&status=${fStatus}`;
    try {
      const { data } = await GET(url);
      const totalRev = data.reduce((s,r)=>s+(r.revenue_actual||0),0);
      const revTarget = data.reduce((s,r)=>{
        const cs = r.price_sale*(r.qty_target||0); return s+cs;
      },0);

      c.innerHTML = `
      <div class="filters">
        <div class="form-group"><label>Tháng</label>
          <select onchange="fMonth=this.value;render()"><option value="">Tất cả</option>${MONTHS.map((m,i)=>`<option value="${i+1}" ${fMonth==i+1?'selected':''}>${m}</option>`).join('')}</select></div>
        <div class="form-group"><label>Sàn</label>
          <select onchange="fPlat=this.value;render()"><option value="">Tất cả</option>${PLATFORMS.map(p=>`<option value="${p}" ${fPlat===p?'selected':''}>${PLATFORM_LABELS[p]}</option>`).join('')}</select></div>
        <div class="form-group"><label>Trạng thái</label>
          <select onchange="fStatus=this.value;render()">
            <option value="">Tất cả</option>
            <option value="planned">Đã lên kế hoạch</option>
            <option value="active">Đang chạy</option>
            <option value="done">Hoàn thành</option>
            <option value="cancelled">Đã huỷ</option>
          </select></div>
      </div>
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card stat-blue"><div class="stat-label">Doanh số dự kiến</div><div class="stat-value" style="font-size:16px">${vnd(revTarget)}</div></div>
        <div class="stat-card stat-green"><div class="stat-label">Doanh số thực tế</div><div class="stat-value" style="font-size:16px">${vnd(totalRev)}</div></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Deal</th><th>Sản phẩm</th><th>Tháng</th><th>Sàn</th>
              <th>Giá gốc</th><th>Giá sale</th><th>CK%</th>
              <th>SL target</th><th>SL thực</th>
              <th>DT dự kiến</th><th>DT thực tế</th>
              <th>Lãi/Lỗ/sp</th><th>Trạng thái</th><th></th>
            </tr></thead>
            <tbody>${data.length ? data.map(r => {
              const disc = r.price_original>0?(r.price_original-r.price_sale)/r.price_original:0;
              const profit = r.price_original*0.5;
              const platCost = r.price_sale*0.4;
              const net = profit - (r.price_original-r.price_sale) - platCost - (r.gift_cost||0);
              const revEst = r.price_sale*(r.qty_target||0);
              return `<tr>
                <td><strong>${r.name}</strong></td>
                <td class="td-wrap">${r.products_desc||'–'}</td>
                <td class="td-c"><span class="badge b-blue">T${r.month}</span></td>
                <td>${PLATFORM_LABELS[r.platform]||r.platform}</td>
                <td class="td-r">${vnd(r.price_original)}</td>
                <td class="td-r"><strong>${vnd(r.price_sale)}</strong></td>
                <td class="td-c">${pct(disc)}</td>
                <td class="td-r">${num(r.qty_target)}</td>
                <td class="td-r">${r.qty_actual?num(r.qty_actual):'–'}</td>
                <td class="td-r">${vnd(revEst)}</td>
                <td class="td-r">${r.revenue_actual>0?vnd(r.revenue_actual):'–'}</td>
                <td class="td-r"><span class="${net>=0?'pos':'neg'}">${vnd(net)}</span></td>
                <td class="td-c"><span class="badge ${statusBadge(r.status)}">${statusLabel(r.status)}</span></td>
                <td class="td-c" style="white-space:nowrap">
                  <button class="btn btn-outline btn-xs" onclick='openDealModal(${JSON.stringify(r)})'>✏️</button>
                  <button class="btn btn-danger btn-xs" onclick="deleteDeal(${r.id})">🗑</button>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="14" class="empty-state" style="padding:20px">Chưa có deal nào</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
      window.deleteDeal = async (id) => {
        openModal('Xoá deal?','<p>Bạn có chắc muốn xoá deal này?</p>',async()=>{ await DELETE(`/deals/${id}`); toast('Đã xoá'); closeModal(); render(); },{confirmText:'Xoá',danger:true});
      };
    } catch(e) { c.innerHTML = errHtml(e); }
  };

  window.openDealModal = (row={}) => {
    openModal(row.id ? `Sửa deal: ${row.name}` : 'Thêm deal mới', `
      <div class="form-grid" id="deal-form">
        <div class="form-group"><label>Năm</label><input name="year" type="number" value="${row.year||CURRENT_YEAR}"></div>
        <div class="form-group"><label>Tháng (1-12)</label><input name="month" type="number" min="1" max="12" value="${row.month||''}"></div>
        <div class="form-group span2"><label>Tên deal / Combo</label><input name="name" value="${row.name||''}"></div>
        <div class="form-group"><label>Sàn</label>
          <select name="platform">${PLATFORMS.map(p=>`<option value="${p}" ${row.platform===p?'selected':''}>${PLATFORM_LABELS[p]}</option>`).join('')}</select></div>
        <div class="form-group"><label>Trạng thái</label>
          <select name="status">
            <option value="planned" ${row.status==='planned'?'selected':''}>Đã lên kế hoạch</option>
            <option value="active" ${row.status==='active'?'selected':''}>Đang chạy</option>
            <option value="done" ${row.status==='done'?'selected':''}>Hoàn thành</option>
            <option value="cancelled" ${row.status==='cancelled'?'selected':''}>Đã huỷ</option>
          </select></div>
        <div class="form-group span2"><label>Mô tả sản phẩm</label><textarea name="products_desc">${row.products_desc||''}</textarea></div>
        <div class="form-group"><label>Giá gốc (₫)</label><input name="price_original" type="number" value="${row.price_original||0}"></div>
        <div class="form-group"><label>Giá sale (₫)</label><input name="price_sale" type="number" value="${row.price_sale||0}"></div>
        <div class="form-group"><label>SL target</label><input name="qty_target" type="number" value="${row.qty_target||0}"></div>
        <div class="form-group"><label>SL thực tế</label><input name="qty_actual" type="number" value="${row.qty_actual||0}"></div>
        <div class="form-group"><label>Doanh số thực tế (₫)</label><input name="revenue_actual" type="number" value="${row.revenue_actual||0}"></div>
        <div class="form-group"><label>Chi phí QC (₫)</label><input name="ads_cost" type="number" value="${row.ads_cost||0}"></div>
        <div class="form-group"><label>Chi phí quà tặng (₫)</label><input name="gift_cost" type="number" value="${row.gift_cost||0}"></div>
        <div class="form-group span2"><label>Ghi chú</label><textarea name="notes">${row.notes||''}</textarea></div>
      </div>`, async () => {
      const b = readForm('deal-form');
      if (row.id) await PUT(`/deals/${row.id}`, b);
      else await POST('/deals', b);
      toast('Đã lưu'); closeModal(); render();
    });
  };
  render();
};

// ═══════════════════════════════════════════════════════════
//  PAGE: PRODUCTS
// ═══════════════════════════════════════════════════════════
RENDERERS.products = async (c) => {
  let search='';
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openProdModal()">+ Thêm sản phẩm</button>`;

  const render = async () => {
    let url = '/products?orderBy=code';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    try {
      const { data } = await GET(url);
      c.innerHTML = `
      <div class="filters">
        <div class="form-group"><label>Tìm kiếm</label>
          <input type="text" placeholder="Mã SP, tên..." value="${search}" oninput="search=this.value;clearTimeout(window._st);window._st=setTimeout(render,400)" style="width:240px"></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Mã SP</th><th>Tên sản phẩm</th><th>Spec</th>
              <th>Giá gốc cũ</th><th>TMĐT cũ</th>
              <th>Giá gốc mới</th><th>TMĐT mới</th>
              <th>KM Shop (80%)</th><th>Flash Sale (75%)</th>
              <th>Lợi nhuận (50%)</th><th>Lãi/Lỗ FS</th>
              <th>Trạng thái</th><th></th>
            </tr></thead>
            <tbody>${data.length ? data.map(p => {
              const km = Math.round(p.tmdt_new*0.8), fs = Math.round(p.tmdt_new*0.75);
              const profit = Math.round(p.cost_new*0.5), fee = Math.round(fs*0.2);
              const net = profit-(p.cost_new-fs)-fee;
              return `<tr>
                <td><code>${p.code}</code></td>
                <td style="white-space:normal;max-width:200px"><strong>${p.name_vn}</strong><br><span class="text-muted">${p.name_en}</span></td>
                <td class="td-c">${p.spec} ${p.unit}</td>
                <td class="td-r text-muted" style="${p.cost_old?'text-decoration:line-through':''}">${p.cost_old?vnd(p.cost_old):'–'}</td>
                <td class="td-r text-muted" style="${p.tmdt_old?'text-decoration:line-through':''}">${p.tmdt_old?vnd(p.tmdt_old):'–'}</td>
                <td class="td-r"><strong>${p.cost_new?vnd(p.cost_new):'–'}</strong></td>
                <td class="td-r"><strong style="color:var(--primary)">${p.tmdt_new?vnd(p.tmdt_new):'–'}</strong></td>
                <td class="td-r">${p.tmdt_new?vnd(km):'–'}</td>
                <td class="td-r">${p.tmdt_new?vnd(fs):'–'}</td>
                <td class="td-r">${p.cost_new?vnd(profit):'–'}</td>
                <td class="td-r"><span class="${p.cost_new&&p.tmdt_new?(net>=0?'pos':'neg'):''}">${p.cost_new&&p.tmdt_new?vnd(net):'–'}</span></td>
                <td class="td-c"><span class="badge ${p.active?'b-green':'b-gray'}">${p.active?'Đang bán':'Ngưng'}</span></td>
                <td class="td-c" style="white-space:nowrap">
                  <button class="btn btn-outline btn-xs" onclick='openProdModal(${JSON.stringify(p)})'>✏️</button>
                  <button class="btn btn-danger btn-xs" onclick="deleteProd(${p.id})">🗑</button>
                </td>
              </tr>`;
            }).join('') : '<tr><td colspan="13" class="empty-state" style="padding:20px">Chưa có sản phẩm</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
      window.deleteProd = async (id) => {
        openModal('Xoá sản phẩm?','<p>Xác nhận xoá?</p>',async()=>{ await DELETE(`/products/${id}`); toast('Đã xoá'); closeModal(); render(); },{confirmText:'Xoá',danger:true});
      };
    } catch(e) { c.innerHTML = errHtml(e); }
  };

  window.openProdModal = (row={}) => {
    openModal(row.id ? `Sửa: ${row.name_vn}` : 'Thêm sản phẩm mới', `
      <div class="form-grid" id="prod-form">
        <div class="form-group"><label>Mã SP</label><input name="code" value="${row.code||''}"></div>
        <div class="form-group"><label>Barcode</label><input name="barcode" value="${row.barcode||''}"></div>
        <div class="form-group span2"><label>Tên tiếng Việt</label><input name="name_vn" value="${row.name_vn||''}"></div>
        <div class="form-group span2"><label>Product Name (EN)</label><input name="name_en" value="${row.name_en||''}"></div>
        <div class="form-group"><label>Spec (số lượng)</label><input name="spec" type="number" value="${row.spec||0}"></div>
        <div class="form-group"><label>Đơn vị</label><select name="unit"><option value="ml" ${row.unit==='ml'?'selected':''}>ml</option><option value="gm" ${row.unit==='gm'?'selected':''}>gm</option><option value="pcs" ${row.unit==='pcs'?'selected':''}>pcs</option></select></div>
        <div class="form-group"><label>Shipper size</label><input name="shipper_size" value="${row.shipper_size||''}"></div>
        <div class="form-group"><label>Giá gốc cũ (₫)</label><input name="cost_old" type="number" value="${row.cost_old||0}"></div>
        <div class="form-group"><label>Giá TMĐT cũ (₫)</label><input name="tmdt_old" type="number" value="${row.tmdt_old||0}"></div>
        <div class="form-group"><label>Giá gốc MỚI (₫)</label><input name="cost_new" type="number" value="${row.cost_new||0}"></div>
        <div class="form-group"><label>Giá TMĐT MỚI (₫)</label><input name="tmdt_new" type="number" value="${row.tmdt_new||0}"></div>
        <div class="form-group"><label>Trạng thái</label><select name="active"><option value="1" ${row.active!==0?'selected':''}>Đang bán</option><option value="0" ${row.active===0?'selected':''}>Ngưng bán</option></select></div>
        <div class="form-group span2"><label>Ghi chú</label><textarea name="notes">${row.notes||''}</textarea></div>
      </div>`, async () => {
      const b = readForm('prod-form');
      b.active = +b.active;
      if (row.id) await PUT(`/products/${row.id}`, b);
      else await POST('/products', b);
      toast('Đã lưu'); closeModal(); render();
    });
  };
  render();
};

// ═══════════════════════════════════════════════════════════
//  PAGE: LS SCHEDULE
// ═══════════════════════════════════════════════════════════
RENDERERS['ls-schedule'] = async (c) => {
  let viewMonth = new Date().getMonth() + 1;
  const STAFF_LIST = ['Vy','Hiền','Liên','Khác'];

  const render = async () => {
    try {
      const { data } = await GET(`/livestream?year=${CURRENT_YEAR}&month=${viewMonth}`);
      const byDayShiftPlat = {};
      data.forEach(r => { byDayShiftPlat[`${r.day}-${r.shift}-${r.platform}`] = r; });

      const year = CURRENT_YEAR;
      const daysInMonth = new Date(year, viewMonth, 0).getDate();
      const firstDay = new Date(year, viewMonth-1, 1).getDay(); // 0=Sun
      const DAYS = ['CN','T2','T3','T4','T5','T6','T7'];

      // Build weeks
      let cells=[];
      for(let i=0;i<firstDay;i++) cells.push(null);
      for(let d=1;d<=daysInMonth;d++) cells.push(d);
      while(cells.length%7) cells.push(null);
      const weeks=[];
      for(let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));

      c.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn btn-outline btn-sm" onclick="viewMonth=viewMonth>1?viewMonth-1:12;render()">◀</button>
            <span style="font-size:16px;font-weight:700">Tháng ${viewMonth} / ${year}</span>
            <button class="btn btn-outline btn-sm" onclick="viewMonth=viewMonth<12?viewMonth+1:1;render()">▶</button>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${['shopee','tiktok'].map(p=>`<label style="font-size:12px;display:flex;align-items:center;gap:4px"><input type="radio" name="cal-plat" value="${p}" onchange="calPlatform=this.value;render()" ${calPlatform===p?'checked':''}> ${PLATFORM_LABELS[p]}</label>`).join('')}
          </div>
        </div>
        <div class="cal-legend">
          ${STAFF_LIST.map(s=>`<span><span class="legend-dot ${STAFF_COLORS[s]||'slot-other'}"></span>${s}</span>`).join('')}
        </div>
        <div class="table-wrap">
          <table class="cal-table">
            <thead><tr><th style="width:90px">Ca</th>${DAYS.map(d=>`<th>${d}</th>`).join('')}</tr></thead>
            <tbody>
              ${SHIFTS.map((shift,si) =>
                weeks.map((week,wi) => `<tr>
                  ${wi===0?`<td rowspan="${weeks.length}" style="background:var(--gray-50);font-size:11px;font-weight:600;white-space:normal;text-align:center;vertical-align:top;padding:6px">${shift}</td>`:''}
                  ${week.map(day => {
                    if(!day) return `<td style="background:var(--gray-100)"></td>`;
                    const key = `${day}-${si}-${calPlatform}`;
                    const row = byDayShiftPlat[key];
                    const staff = row?.staff_name||'';
                    const cls = STAFF_COLORS[staff]||'slot-other';
                    return `<td onclick="toggleCell(${day},${si})" title="${day}/${viewMonth} – ${shift}">
                      <div class="cal-date">${day}</div>
                      ${staff?`<span class="cal-slot ${cls}">${staff}</span>`:''}
                    </td>`;
                  }).join('')}
                </tr>`).join('')
              ).join('')}
            </tbody>
          </table>
        </div>
        <p class="text-muted" style="margin-top:8px">💡 Click vào ô để gán/đổi nhân viên. Click lại để xoá.</p>
      </div>`;

      window.toggleCell = async (day, shift) => {
        const key = `${day}-${shift}-${calPlatform}`;
        const existing = byDayShiftPlat[key];
        const currentStaff = existing?.staff_name||'';
        const idx = STAFF_LIST.indexOf(currentStaff);
        const nextStaff = STAFF_LIST[(idx+1)%STAFF_LIST.length];
        try {
          if (existing?.id) {
            if (!nextStaff) await DELETE(`/livestream/${existing.id}`);
            else await PUT(`/livestream/${existing.id}`, { ...existing, staff_name: nextStaff });
          } else {
            await POST('/livestream', { year:CURRENT_YEAR, month:viewMonth, day, shift, staff_name:nextStaff||STAFF_LIST[0], platform:calPlatform });
          }
          render();
        } catch(e) { toast(e.message,'error'); }
      };
    } catch(e) { c.innerHTML = errHtml(e); }
  };

  window.calPlatform = 'shopee';
  render();
};

// ═══════════════════════════════════════════════════════════
//  PAGE: LS REGISTRATION
// ═══════════════════════════════════════════════════════════
RENDERERS['ls-reg'] = async (c) => {
  let search='';
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openLSRModal()">+ Thêm đăng ký</button>`;
  const render = async () => {
    let url = '/ls-reg';
    if (search) url += `?search=${encodeURIComponent(search)}`;
    try {
      const { data } = await GET(url);
      const hired = data.filter(r=>r.status==='hired').length;
      c.innerHTML = `
      <div class="filters">
        <div class="form-group"><label>Tìm kiếm</label>
          <input type="text" placeholder="Tên, SĐT..." value="${search}" oninput="search=this.value;clearTimeout(window._st2);window._st2=setTimeout(render,400)" style="width:220px"></div>
      </div>
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card stat-blue"><div class="stat-label">Tổng đăng ký</div><div class="stat-value">${data.length}</div></div>
        <div class="stat-card stat-green"><div class="stat-label">Đã tuyển</div><div class="stat-value">${hired}</div></div>
        <div class="stat-card stat-orange"><div class="stat-label">Có kinh nghiệm</div><div class="stat-value">${data.filter(r=>r.has_exp).length}</div></div>
      </div>
      <div class="card">
        <div style="font-size:12px;color:var(--gray-500);margin-bottom:12px">💸 Mức lương: 40,000 ₫/giờ + thưởng (chưa bao gồm 10% thuế)</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Họ tên</th><th>SĐT</th><th>Kinh nghiệm</th><th>Đồng ý lương</th><th>Ca ưa thích</th><th>Ghi chú</th><th>Trạng thái</th><th>Ngày đăng ký</th><th></th></tr></thead>
            <tbody>${data.length ? data.map((r,i)=>`<tr>
              <td class="td-c">${i+1}</td>
              <td><strong>${r.name}</strong></td>
              <td><a href="tel:${r.phone}">${r.phone||'–'}</a></td>
              <td class="td-c"><span class="badge ${r.has_exp?'b-green':'b-gray'}">${r.has_exp?'Có':'Không'}</span></td>
              <td class="td-c"><span class="badge ${r.agree_salary?'b-green':'b-red'}">${r.agree_salary?'Đồng ý':'Không'}</span></td>
              <td>${r.preferred_shift||'–'}</td>
              <td class="td-wrap">${r.notes||'–'}</td>
              <td class="td-c"><span class="badge ${lsrStatusBadge(r.status)}">${lsrStatusLabel(r.status)}</span></td>
              <td class="text-muted" style="font-size:11px">${r.registered_at?.split(' ')[0]||'–'}</td>
              <td class="td-c" style="white-space:nowrap">
                <button class="btn btn-outline btn-xs" onclick='openLSRModal(${JSON.stringify(r)})'>✏️</button>
                <button class="btn btn-danger btn-xs" onclick="deleteLSR(${r.id})">🗑</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="10" class="empty-state" style="padding:20px">Chưa có đăng ký</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
      window.deleteLSR = async (id) => {
        openModal('Xoá?','<p>Xác nhận xoá đăng ký này?</p>',async()=>{ await DELETE(`/ls-reg/${id}`); toast('Đã xoá'); closeModal(); render(); },{confirmText:'Xoá',danger:true});
      };
    } catch(e) { c.innerHTML = errHtml(e); }
  };

  window.openLSRModal = (row={}) => {
    openModal(row.id?'Sửa thông tin':'Thêm đăng ký', `
      <div class="form-grid" id="lsr-form">
        <div class="form-group span2"><label>Họ tên</label><input name="name" value="${row.name||''}"></div>
        <div class="form-group"><label>SĐT</label><input name="phone" value="${row.phone||''}"></div>
        <div class="form-group"><label>Kinh nghiệm livestream</label><select name="has_exp"><option value="1" ${row.has_exp?'selected':''}>Có</option><option value="0" ${!row.has_exp?'selected':''}>Chưa có</option></select></div>
        <div class="form-group"><label>Đồng ý mức lương 40k/h</label><select name="agree_salary"><option value="1" ${row.agree_salary?'selected':''}>Đồng ý</option><option value="0" ${!row.agree_salary?'selected':''}>Không đồng ý</option></select></div>
        <div class="form-group"><label>Ca ưa thích</label><input name="preferred_shift" value="${row.preferred_shift||''}" placeholder="VD: Ca sáng, Ca tối"></div>
        <div class="form-group"><label>Trạng thái</label>
          <select name="status">
            <option value="new" ${row.status==='new'?'selected':''}>Mới</option>
            <option value="contacted" ${row.status==='contacted'?'selected':''}>Đã liên hệ</option>
            <option value="hired" ${row.status==='hired'?'selected':''}>Đã tuyển</option>
            <option value="rejected" ${row.status==='rejected'?'selected':''}>Không phù hợp</option>
          </select></div>
        <div class="form-group span2"><label>Ghi chú</label><textarea name="notes">${row.notes||''}</textarea></div>
      </div>`, async () => {
      const b = readForm('lsr-form');
      b.has_exp = +b.has_exp; b.agree_salary = +b.agree_salary;
      if (row.id) await PUT(`/ls-reg/${row.id}`, b);
      else await POST('/ls-reg', b);
      toast('Đã lưu'); closeModal(); render();
    });
  };
  render();
};

// ═══════════════════════════════════════════════════════════
//  PAGE: KOC BOOKING
// ═══════════════════════════════════════════════════════════
RENDERERS.koc = async (c) => {
  let fMonth='', fStatus='';
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openKOCModal()">+ Thêm KOC</button>`;
  const render = async () => {
    let url = `/koc?year=${CURRENT_YEAR}`;
    if (fMonth) url += `&month=${fMonth}`;
    if (fStatus) url += `&status=${fStatus}`;
    try {
      const { data } = await GET(url);
      const free = data.filter(r=>r.cost_type==='free').length;
      const totalCost = data.reduce((s,r)=>s+(r.cost||0),0);
      c.innerHTML = `
      <div class="filters">
        <div class="form-group"><label>Tháng</label>
          <select onchange="fMonth=this.value;render()"><option value="">Tất cả</option>${MONTHS.map((m,i)=>`<option value="${i+1}" ${fMonth==i+1?'selected':''}>${m}</option>`).join('')}</select></div>
        <div class="form-group"><label>Trạng thái</label>
          <select onchange="fStatus=this.value;render()">
            <option value="">Tất cả</option><option value="pending">Chờ đăng</option>
            <option value="posted">Đã đăng</option><option value="done">Hoàn thành</option>
          </select></div>
      </div>
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card stat-blue"><div class="stat-label">Tổng KOC</div><div class="stat-value">${data.length}</div></div>
        <div class="stat-card stat-green"><div class="stat-label">Free Cast</div><div class="stat-value">${free}</div></div>
        <div class="stat-card stat-orange"><div class="stat-label">Có phí</div><div class="stat-value">${data.length-free}</div></div>
        <div class="stat-card stat-red"><div class="stat-label">Tổng chi phí</div><div class="stat-value" style="font-size:16px">${vnd(totalCost)}</div></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>KOC</th><th>Sàn</th><th>Link</th><th>Loại</th><th>Chi phí</th><th>SP gửi</th><th>Views</th><th>Likes</th><th>Tháng</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>${data.length ? data.map((r,i)=>`<tr>
              <td class="td-c">${i+1}</td>
              <td><strong>${r.koc_name}</strong></td>
              <td>${r.platform}</td>
              <td>${r.link?`<a href="${r.link}" target="_blank" style="font-size:11px">🔗 Xem bài</a>`:'–'}</td>
              <td><span class="badge ${r.cost_type==='free'?'b-green':r.cost_type==='product'?'b-blue':'b-orange'}">${r.cost_type}</span></td>
              <td class="td-r">${r.cost>0?vnd(r.cost):'–'}</td>
              <td class="td-wrap">${r.product_sent||'–'}</td>
              <td class="td-r">${r.views?num(r.views):'–'}</td>
              <td class="td-r">${r.likes?num(r.likes):'–'}</td>
              <td class="td-c"><span class="badge b-blue">T${r.month}</span></td>
              <td class="td-c"><span class="badge ${kocStatusBadge(r.status)}">${kocStatusLabel(r.status)}</span></td>
              <td class="td-c" style="white-space:nowrap">
                <button class="btn btn-outline btn-xs" onclick='openKOCModal(${JSON.stringify(r)})'>✏️</button>
                <button class="btn btn-danger btn-xs" onclick="deleteKOC(${r.id})">🗑</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="12" class="empty-state" style="padding:20px">Chưa có KOC nào</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
      window.deleteKOC = async (id) => {
        openModal('Xoá KOC?','<p>Xác nhận xoá?</p>',async()=>{ await DELETE(`/koc/${id}`); toast('Đã xoá'); closeModal(); render(); },{confirmText:'Xoá',danger:true});
      };
    } catch(e) { c.innerHTML = errHtml(e); }
  };

  window.openKOCModal = (row={}) => {
    openModal(row.id?'Sửa KOC':'Thêm KOC Booking', `
      <div class="form-grid" id="koc-form">
        <div class="form-group span2"><label>Tên KOC / Tài khoản</label><input name="koc_name" value="${row.koc_name||''}"></div>
        <div class="form-group"><label>Sàn</label>
          <select name="platform"><option value="tiktok" ${row.platform==='tiktok'?'selected':''}>TikTok</option><option value="instagram" ${row.platform==='instagram'?'selected':''}>Instagram</option><option value="youtube" ${row.platform==='youtube'?'selected':''}>YouTube</option><option value="facebook" ${row.platform==='facebook'?'selected':''}>Facebook</option></select></div>
        <div class="form-group"><label>Tháng (1-12)</label><input name="month" type="number" min="1" max="12" value="${row.month||''}"></div>
        <div class="form-group span2"><label>Link bài</label><input name="link" type="url" value="${row.link||''}" placeholder="https://..."></div>
        <div class="form-group"><label>Loại</label>
          <select name="cost_type"><option value="free" ${row.cost_type==='free'?'selected':''}>Free cast</option><option value="product" ${row.cost_type==='product'?'selected':''}>Đổi sản phẩm</option><option value="paid" ${row.cost_type==='paid'?'selected':''}>Trả phí</option></select></div>
        <div class="form-group"><label>Chi phí (₫)</label><input name="cost" type="number" value="${row.cost||0}"></div>
        <div class="form-group span2"><label>Sản phẩm gửi</label><input name="product_sent" value="${row.product_sent||''}"></div>
        <div class="form-group"><label>Views</label><input name="views" type="number" value="${row.views||0}"></div>
        <div class="form-group"><label>Likes</label><input name="likes" type="number" value="${row.likes||0}"></div>
        <div class="form-group"><label>Trạng thái</label>
          <select name="status"><option value="pending" ${row.status==='pending'?'selected':''}>Chờ đăng</option><option value="posted" ${row.status==='posted'?'selected':''}>Đã đăng</option><option value="done" ${row.status==='done'?'selected':''}>Hoàn thành</option></select></div>
        <div class="form-group span2"><label>Ghi chú</label><textarea name="notes">${row.notes||''}</textarea></div>
      </div>`, async () => {
      const b = readForm('koc-form');
      b.year = CURRENT_YEAR; b.cost = +b.cost; b.views = +b.views; b.likes = +b.likes;
      if (row.id) await PUT(`/koc/${row.id}`, b);
      else await POST('/koc', b);
      toast('Đã lưu'); closeModal(); render();
    });
  };
  render();
};

// ═══════════════════════════════════════════════════════════
//  PAGE: TASKS
// ═══════════════════════════════════════════════════════════
RENDERERS.tasks = async (c) => {
  let fMonth = new Date().getMonth()+1, fCat='';
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openTaskModal()">+ Thêm công việc</button>`;
  const CATS = { revenue:'💰 Doanh số', livestream:'📺 Livestream', content:'🎬 Video/Content', kol:'🤝 KOL/KOC', ads:'📢 Quảng cáo', other:'📌 Khác' };

  const render = async () => {
    let url = `/tasks?year=${CURRENT_YEAR}&month=${fMonth}`;
    if (fCat) url += `&category=${fCat}`;
    try {
      const { data } = await GET(url);
      const done = data.filter(r=>r.status==='done').length;
      c.innerHTML = `
      <div class="filters">
        <div class="form-group"><label>Tháng</label>
          <select onchange="fMonth=+this.value;render()">${MONTHS.map((m,i)=>`<option value="${i+1}" ${fMonth===i+1?'selected':''}>${m}</option>`).join('')}</select></div>
        <div class="form-group"><label>Hạng mục</label>
          <select onchange="fCat=this.value;render()"><option value="">Tất cả</option>${Object.entries(CATS).map(([k,v])=>`<option value="${k}" ${fCat===k?'selected':''}>${v}</option>`).join('')}</select></div>
      </div>
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card stat-blue"><div class="stat-label">Tổng việc</div><div class="stat-value">${data.length}</div></div>
        <div class="stat-card stat-green"><div class="stat-label">Hoàn thành</div><div class="stat-value">${done}</div></div>
        <div class="stat-card stat-orange"><div class="stat-label">Đang làm</div><div class="stat-value">${data.filter(r=>r.status==='in-progress').length}</div></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tuần</th><th>Hạng mục</th><th>Công việc</th><th>Mô tả</th><th>Người phụ trách</th><th>Mục tiêu</th><th>Tiến độ</th><th>Hạn</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>${data.length ? data.map(r=>`<tr>
              <td class="td-c"><strong>T${r.week}</strong></td>
              <td><span class="badge b-blue" style="font-size:10px">${CATS[r.category]||r.category}</span></td>
              <td><strong>${r.task_name}</strong></td>
              <td class="td-wrap">${r.description||'–'}</td>
              <td>${r.assignee||'–'}</td>
              <td class="td-wrap">${r.target||'–'}</td>
              <td style="min-width:100px">
                <div style="display:flex;align-items:center;gap:8px">
                  <div class="progress"><div class="progress-bar" style="width:${r.progress}%;background:${r.progress>=80?'var(--success)':r.progress>=40?'var(--warn)':'var(--primary)'}"></div></div>
                  <span style="font-size:11px;font-weight:600;flex-shrink:0">${r.progress}%</span>
                </div>
              </td>
              <td style="font-size:12px">${r.due_date||'–'}</td>
              <td class="td-c"><span class="badge ${taskStatusBadge(r.status)}">${taskStatusLabel(r.status)}</span></td>
              <td class="td-c" style="white-space:nowrap">
                <button class="btn btn-outline btn-xs" onclick='openTaskModal(${JSON.stringify(r)})'>✏️</button>
                <button class="btn btn-danger btn-xs" onclick="deleteTask(${r.id})">🗑</button>
              </td>
            </tr>`).join('') : '<tr><td colspan="10" class="empty-state" style="padding:20px">Chưa có công việc</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
      window.deleteTask = async (id) => {
        openModal('Xoá?','<p>Xoá công việc này?</p>',async()=>{ await DELETE(`/tasks/${id}`); toast('Đã xoá'); closeModal(); render(); },{confirmText:'Xoá',danger:true});
      };
    } catch(e) { c.innerHTML = errHtml(e); }
  };

  window.openTaskModal = (row={}) => {
    openModal(row.id?'Sửa công việc':'Thêm công việc', `
      <div class="form-grid" id="task-form">
        <div class="form-group"><label>Tháng (1-12)</label><input name="month" type="number" min="1" max="12" value="${row.month||fMonth}"></div>
        <div class="form-group"><label>Tuần (1-5)</label><input name="week" type="number" min="1" max="5" value="${row.week||1}"></div>
        <div class="form-group"><label>Hạng mục</label>
          <select name="category">${Object.entries(CATS).map(([k,v])=>`<option value="${k}" ${row.category===k?'selected':''}>${v}</option>`).join('')}</select></div>
        <div class="form-group"><label>Người phụ trách</label><input name="assignee" value="${row.assignee||''}"></div>
        <div class="form-group span2"><label>Tên công việc</label><input name="task_name" value="${row.task_name||''}"></div>
        <div class="form-group span2"><label>Mô tả chi tiết</label><textarea name="description">${row.description||''}</textarea></div>
        <div class="form-group span2"><label>Mục tiêu</label><input name="target" value="${row.target||''}"></div>
        <div class="form-group"><label>Tiến độ (%)</label><input name="progress" type="number" min="0" max="100" value="${row.progress||0}"></div>
        <div class="form-group"><label>Hạn chót</label><input name="due_date" type="date" value="${row.due_date||''}"></div>
        <div class="form-group"><label>Trạng thái</label>
          <select name="status">
            <option value="pending" ${row.status==='pending'?'selected':''}>Chờ làm</option>
            <option value="in-progress" ${row.status==='in-progress'?'selected':''}>Đang làm</option>
            <option value="done" ${row.status==='done'?'selected':''}>Hoàn thành</option>
            <option value="cancelled" ${row.status==='cancelled'?'selected':''}>Đã huỷ</option>
          </select></div>
        <div class="form-group span2"><label>Ghi chú</label><textarea name="notes">${row.notes||''}</textarea></div>
      </div>`, async () => {
      const b = readForm('task-form');
      b.year = CURRENT_YEAR; b.progress = +b.progress;
      if (row.id) await PUT(`/tasks/${row.id}`, b);
      else await POST('/tasks', b);
      toast('Đã lưu'); closeModal(); render();
    });
  };
  render();
};

// ═══════════════════════════════════════════════════════════
//  PAGE: PROFILE (own account)
// ═══════════════════════════════════════════════════════════
RENDERERS.profile = (c) => {
  const lanIP = location.hostname === 'localhost' ? '192.168.1.11' : location.hostname;
  c.innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:800px">

    <div class="card" style="margin:0">
      <div class="card-header"><span class="card-title">👤 Thông tin cá nhân</span></div>
      <div class="form-grid" style="margin-bottom:16px">
        <div class="form-group span2">
          <label>Tên hiển thị</label>
          <input type="text" id="p-name" value="${ME.name}">
        </div>
        <div class="form-group span2">
          <label>Tên đăng nhập</label>
          <input type="text" value="${ME.username}" readonly style="background:var(--gray-100);color:var(--gray-500)">
          <div class="form-hint">Tên đăng nhập không thể thay đổi</div>
        </div>
        <div class="form-group span2">
          <label>Vai trò</label>
          <input type="text" value="${{admin:'Quản trị viên',manager:'Quản lý',staff:'Nhân viên'}[ME.role]||ME.role}" readonly style="background:var(--gray-100);color:var(--gray-500)">
        </div>
      </div>
      <button class="btn btn-primary" onclick="saveProfile()">💾 Lưu tên</button>
    </div>

    <div class="card" style="margin:0">
      <div class="card-header"><span class="card-title">🔒 Đổi mật khẩu</span></div>
      <div class="form-grid">
        <div class="form-group span2">
          <label>Mật khẩu hiện tại</label>
          <input type="password" id="pw-old" placeholder="Nhập mật khẩu cũ">
        </div>
        <div class="form-group span2">
          <label>Mật khẩu mới</label>
          <input type="password" id="pw-new" placeholder="Tối thiểu 4 ký tự">
        </div>
        <div class="form-group span2">
          <label>Xác nhận mật khẩu mới</label>
          <input type="password" id="pw-confirm" placeholder="Nhập lại mật khẩu mới">
        </div>
      </div>
      <br>
      <button class="btn btn-primary" onclick="savePassword()">🔒 Đổi mật khẩu</button>
    </div>

    <div class="card" style="margin:0;grid-column:1/-1">
      <div class="card-header"><span class="card-title">🔗 Link đăng ký Livestream (chia sẻ cho ứng viên)</span></div>
      <p style="font-size:13px;color:var(--gray-500);margin-bottom:12px">Gửi link này cho người muốn đăng ký làm Cộng tác viên Livestream. Họ tự điền form, dữ liệu tự động vào hệ thống.</p>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="public-link" value="http://${lanIP}:3456/dang-ky-livestream" readonly style="font-family:monospace;font-size:13px;background:var(--gray-50)">
        <button class="btn btn-outline" onclick="copyLink()" style="flex-shrink:0">📋 Copy</button>
        <button class="btn btn-primary" onclick="window.open('http://${lanIP}:3456/dang-ky-livestream','_blank')" style="flex-shrink:0">🔗 Mở</button>
      </div>
      <p style="font-size:11px;color:var(--gray-500);margin-top:8px">💡 Ứng viên có thể dùng điện thoại quét QR hoặc mở link trực tiếp. Không cần đăng nhập.</p>
    </div>

  </div>`;

  window.saveProfile = async () => {
    const name = document.getElementById('p-name').value.trim();
    if (!name) { toast('Tên không được để trống','error'); return; }
    try {
      const res = await POST('/change-profile', { name });
      ME.name = res.name;
      localStorage.setItem('mkt_me', JSON.stringify(ME));
      document.getElementById('nav-name').textContent = ME.name;
      document.getElementById('nav-avatar').textContent = ME.name[0].toUpperCase();
      toast('✅ Đã cập nhật tên');
    } catch(e) { toast(e.message,'error'); }
  };

  window.savePassword = async () => {
    const old_p = document.getElementById('pw-old').value;
    const new_p = document.getElementById('pw-new').value;
    const conf  = document.getElementById('pw-confirm').value;
    if (!old_p) { toast('Vui lòng nhập mật khẩu cũ','error'); return; }
    if (!new_p) { toast('Vui lòng nhập mật khẩu mới','error'); return; }
    if (new_p !== conf) { toast('Mật khẩu xác nhận không khớp','error'); return; }
    try {
      await POST('/change-password', { old_password: old_p, new_password: new_p });
      toast('✅ Đã đổi mật khẩu thành công');
      document.getElementById('pw-old').value='';
      document.getElementById('pw-new').value='';
      document.getElementById('pw-confirm').value='';
    } catch(e) { toast(e.message,'error'); }
  };

  window.copyLink = () => {
    const el = document.getElementById('public-link');
    el.select(); document.execCommand('copy');
    toast('✅ Đã copy link!');
  };
};

// ═══════════════════════════════════════════════════════════
//  PAGE: IMPORT DATA (drag & drop CSV)
// ═══════════════════════════════════════════════════════════
RENDERERS.import = (c) => {
  c.innerHTML = `
  <div class="card" style="max-width:700px">
    <div class="card-header"><span class="card-title">📥 Nhập dữ liệu từ file CSV/Excel</span></div>
    <p style="font-size:13px;color:var(--gray-500);margin-bottom:20px">Kéo thả file CSV vào ô bên dưới, hoặc click để chọn file. Hệ thống sẽ tự nhận dạng cột dữ liệu.</p>

    <div class="form-group" style="margin-bottom:16px">
      <label>Nhập vào bảng</label>
      <select id="import-table" style="max-width:300px">
        <option value="products">🧴 Sản phẩm (products)</option>
        <option value="deals">🏷️ Deal sàn (deals)</option>
        <option value="koc_bookings">🎥 KOC Booking</option>
        <option value="ls_registrations">📝 Đăng ký Livestream</option>
        <option value="kpi_monthly">🎯 KPI theo tháng</option>
      </select>
    </div>

    <div id="drop-zone">
      <div class="drop-inner">
        <div style="font-size:48px;margin-bottom:12px">📂</div>
        <p style="font-size:15px;font-weight:600;margin-bottom:4px">Kéo thả file CSV vào đây</p>
        <p style="font-size:13px;color:var(--gray-500)">hoặc <label for="file-input" style="color:var(--primary);cursor:pointer;text-decoration:underline">click để chọn file</label></p>
        <input type="file" id="file-input" accept=".csv,.txt" style="display:none" onchange="handleFileSelect(this.files[0])">
      </div>
    </div>

    <div id="preview-section" style="display:none">
      <hr style="border:none;border-top:1px solid var(--gray-200);margin:20px 0">
      <div class="card-header">
        <span class="card-title">👁 Xem trước dữ liệu</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="resetImport()">🔄 Chọn file khác</button>
          <button class="btn btn-primary btn-sm" id="do-import-btn" onclick="doImport()">⬆️ Nhập vào hệ thống</button>
        </div>
      </div>
      <div id="preview-info" style="font-size:13px;color:var(--gray-500);margin-bottom:12px"></div>
      <div class="table-wrap" style="max-height:320px;overflow-y:auto">
        <div id="preview-table"></div>
      </div>
    </div>

    <hr style="border:none;border-top:1px solid var(--gray-200);margin:24px 0">
    <div class="card-title" style="margin-bottom:12px">📋 Hướng dẫn định dạng CSV</div>
    <div id="format-help"></div>
  </div>`;

  // CSV format hints
  const hints = {
    products: 'code, name_vn, name_en, spec, unit, cost_new, tmdt_new',
    deals: 'month, platform, name, products_desc, price_original, price_sale, qty_target',
    koc_bookings: 'month, koc_name, platform, link, cost_type, cost, product_sent',
    ls_registrations: 'name, phone, has_exp (0/1), agree_salary (0/1), preferred_shift, notes',
    kpi_monthly: 'year, month, platform, target, actual, ads_cost, direction'
  };
  const updateHint = () => {
    const t = document.getElementById('import-table').value;
    document.getElementById('format-help').innerHTML = `
      <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:14px">
        <p style="font-size:12px;margin-bottom:6px"><strong>Dòng đầu tiên phải là tên cột:</strong></p>
        <code style="font-size:12px;background:var(--gray-100);padding:4px 8px;border-radius:4px;display:block">${hints[t]}</code>
        <p style="font-size:11px;color:var(--gray-500);margin-top:8px">💡 Dùng Excel → Save As → CSV UTF-8, hoặc Google Sheets → Download → CSV</p>
      </div>`;
  };
  document.getElementById('import-table').addEventListener('change', updateHint);
  updateHint();

  // Drag & drop
  const dz = document.getElementById('drop-zone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); const f=e.dataTransfer.files[0]; if(f) handleFileSelect(f); });

  window._importRows = [];

  window.handleFileSelect = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = parseCSV(text);
      if (rows.length < 2) { toast('File không có dữ liệu','error'); return; }
      const headers = rows[0];
      const data = rows.slice(1).filter(r=>r.some(c=>c.trim())).map(r => {
        const obj = {};
        headers.forEach((h,i) => { if(h.trim()) obj[h.trim()] = (r[i]||'').trim(); });
        return obj;
      });
      window._importRows = data;
      showPreview(headers, data, file.name);
    };
    reader.readAsText(file, 'UTF-8');
  };

  window.showPreview = (headers, data, filename) => {
    document.getElementById('preview-section').style.display = '';
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('preview-info').innerHTML = `📄 <strong>${filename}</strong> — ${data.length} dòng dữ liệu, ${headers.length} cột`;
    const preview = data.slice(0, 10);
    document.getElementById('preview-table').innerHTML = `
      <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${preview.map(r=>`<tr>${headers.map(h=>`<td>${r[h]||''}</td>`).join('')}</tr>`).join('')}</tbody></table>
      ${data.length>10?`<p class="text-muted" style="padding:8px 12px">... và ${data.length-10} dòng nữa</p>`:''}`;
  };

  window.resetImport = () => {
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('drop-zone').style.display = '';
    document.getElementById('file-input').value = '';
    window._importRows = [];
  };

  window.doImport = async () => {
    if (!window._importRows?.length) return;
    const table = document.getElementById('import-table').value;
    const btn = document.getElementById('do-import-btn');
    btn.disabled = true; btn.textContent = '⏳ Đang nhập...';
    try {
      const res = await POST(`/import/${table}`, { rows: window._importRows });
      toast(`✅ Đã nhập ${res.inserted} dòng vào hệ thống`);
      if (res.errors?.length) toast(`⚠️ ${res.errors.length} dòng lỗi: ${res.errors[0]}`,'error');
      resetImport();
    } catch(e) { toast(e.message,'error'); }
    btn.disabled = false; btn.textContent = '⬆️ Nhập vào hệ thống';
  };
};

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const result = [], re = /(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      result.push(m[1].replace(/^"|"$/g,'').replace(/""/g,'"'));
    }
    return result.length ? result : [''];
  }).filter(r => r.length > 0);
}

// ═══════════════════════════════════════════════════════════
//  PAGE: USERS (admin)
// ═══════════════════════════════════════════════════════════
RENDERERS.users = async (c) => {
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-primary btn-sm" onclick="openUserModal()">+ Thêm tài khoản</button>`;
  const render = async () => {
    try {
      const { data } = await GET('/users');
      c.innerHTML = `<div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Tên đăng nhập</th><th>Họ tên</th><th>Vai trò</th><th>Ngày tạo</th><th></th></tr></thead>
            <tbody>${data.map((u,i)=>`<tr>
              <td>${i+1}</td><td><code>${u.username}</code></td><td><strong>${u.name}</strong></td>
              <td><span class="badge ${u.role==='admin'?'b-red':u.role==='manager'?'b-orange':'b-blue'}">${u.role}</span></td>
              <td class="text-muted" style="font-size:11px">${u.created_at?.split(' ')[0]||'–'}</td>
              <td class="td-c" style="white-space:nowrap">
                <button class="btn btn-outline btn-xs" onclick='openUserModal(${JSON.stringify(u)})'>✏️</button>
                <button class="btn btn-danger btn-xs" onclick="deleteUser(${u.id})">🗑</button>
              </td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
      window.deleteUser = async (id) => {
        openModal('Xoá tài khoản?','<p>Xác nhận xoá?</p>',async()=>{ await DELETE(`/users/${id}`); toast('Đã xoá'); closeModal(); render(); },{confirmText:'Xoá',danger:true});
      };
    } catch(e) { c.innerHTML = errHtml(e); }
  };
  window.openUserModal = (row={}) => {
    openModal(row.id?'Sửa tài khoản':'Thêm tài khoản', `
      <div class="form-grid" id="user-form">
        <div class="form-group"><label>Tên đăng nhập</label><input name="username" value="${row.username||''}" ${row.id?'readonly':''}></div>
        <div class="form-group"><label>Mật khẩu</label><input name="password" type="password" placeholder="${row.id?'Để trống = giữ nguyên':''}"></div>
        <div class="form-group"><label>Họ tên</label><input name="name" value="${row.name||''}"></div>
        <div class="form-group"><label>Vai trò</label>
          <select name="role"><option value="staff" ${row.role==='staff'?'selected':''}>Staff</option><option value="manager" ${row.role==='manager'?'selected':''}>Manager</option><option value="admin" ${row.role==='admin'?'selected':''}>Admin</option></select></div>
      </div>`, async () => {
      const b = readForm('user-form');
      if (!b.password) delete b.password;
      if (row.id) await PUT(`/users/${row.id}`, b);
      else await POST('/users', b);
      toast('Đã lưu'); closeModal(); render();
    });
  };
  render();
};

// ═══════════════════════════════════════════════════════════
//  PAGE: LOG
// ═══════════════════════════════════════════════════════════
RENDERERS.log = async (c) => {
  try {
    const { data } = await GET('/log');
    c.innerHTML = `<div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Bảng</th><th>ID</th><th>Chi tiết</th></tr></thead>
          <tbody>${data.map(l=>`<tr>
            <td class="text-muted" style="font-size:11px;white-space:nowrap">${l.ts}</td>
            <td><strong>${l.user_name}</strong></td>
            <td><span class="badge ${l.action==='create'?'b-green':l.action==='delete'?'b-red':l.action==='login'?'b-blue':'b-gray'}">${actionLabel(l.action)}</span></td>
            <td>${l.table_name||'–'}</td>
            <td class="td-c">${l.record_id||'–'}</td>
            <td class="td-wrap">${l.detail||'–'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
  } catch(e) { c.innerHTML = errHtml(e); }
};

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
function readForm(id) {
  const form = document.getElementById(id);
  const result = {};
  form.querySelectorAll('[name]').forEach(el => { result[el.name] = el.value; });
  return result;
}
function errHtml(e) {
  return `<div class="empty-state"><div class="icon">⚠️</div><p>${e.message}</p></div>`;
}
function statusBadge(s) { return {planned:'b-gray',active:'b-blue',done:'b-green',cancelled:'b-red'}[s]||'b-gray'; }
function statusLabel(s) { return {planned:'Kế hoạch',active:'Đang chạy',done:'Hoàn thành',cancelled:'Đã huỷ'}[s]||s; }
function lsrStatusBadge(s) { return {new:'b-blue',contacted:'b-orange',hired:'b-green',rejected:'b-red'}[s]||'b-gray'; }
function lsrStatusLabel(s) { return {new:'Mới',contacted:'Đã liên hệ',hired:'Đã tuyển',rejected:'Không phù hợp'}[s]||s; }
function kocStatusBadge(s) { return {pending:'b-orange',posted:'b-blue',done:'b-green'}[s]||'b-gray'; }
function kocStatusLabel(s) { return {pending:'Chờ đăng',posted:'Đã đăng',done:'Hoàn thành'}[s]||s; }
function taskStatusBadge(s) { return {'pending':'b-gray','in-progress':'b-blue',done:'b-green',cancelled:'b-red'}[s]||'b-gray'; }
function taskStatusLabel(s) { return {'pending':'Chờ làm','in-progress':'Đang làm',done:'Hoàn thành',cancelled:'Đã huỷ'}[s]||s; }
function actionLabel(a) { return {login:'Đăng nhập',create:'Tạo mới',update:'Cập nhật',delete:'Xoá'}[a]||a; }
