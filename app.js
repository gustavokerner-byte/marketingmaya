/* ============================================================
   MayaApp CDC — Instagram Dashboard
   Vanilla JS. Lê data.json no mesmo diretório (site estático).
   ============================================================ */

'use strict';

/* ---------- Paleta ---------- */
const C = {
  purple: '#7C3AED',
  purpleLight: '#C4B5FD',
  gold: '#FFD84D',
  goldDeep: '#B8860B',
  blue: '#3B82F6',
  gray: '#9CA3AF',
  success: '#22C55E',
  danger: '#EF4444',
  border: '#E5E7EB',
  muted: '#9CA3AF',
  text: '#1A0A2E',
};

/* ---------- Estado ---------- */
let DATA = null;
let PERIOD = 30;                 // 7 | 30 | 90 (default 30)
let FMT_METRIC = 'reach';        // métrica ativa no bloco 4
let rankSort = { key: 'reach', dir: 'desc' };
const charts = {};               // instâncias Chart.js

/* ---------- Helpers de formatação ---------- */
const nf = new Intl.NumberFormat('pt-BR');
const fmtInt = (n) => nf.format(Math.round(n || 0));
const fmtPct = (n, d = 1) => (n == null || !isFinite(n)) ? '—' : n.toFixed(d).replace('.', ',') + '%';
const fmtDec = (n, d = 1) => (n == null || !isFinite(n)) ? '—' : nf.format(Number(n.toFixed(d)));

function parseDate(s) {
  // "2026-07-20" → Date em UTC (evita drift de fuso)
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmtDayMonth(dateStr) {
  const d = parseDate(dateStr);
  return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
function fmtPostDate(iso) {
  const d = new Date(iso);
  return String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0');
}
function fmtUpdated(iso) {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} às ${hh}:${mi}`;
}

/* ============================================================
   PERÍODOS — recorta daily_metrics em janela atual e anterior
   Baseado na data mais recente do dataset.
   ============================================================ */
function periodWindows(days) {
  const rows = DATA.daily_metrics.slice().sort((a, b) => a.date.localeCompare(b.date));
  const latest = parseDate(rows[rows.length - 1].date);

  const MS = 86400000;
  const curStart = new Date(latest.getTime() - (days - 1) * MS);
  const prevEnd = new Date(curStart.getTime() - MS);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * MS);

  const inRange = (d, a, b) => {
    const t = parseDate(d).getTime();
    return t >= a.getTime() && t <= b.getTime();
  };
  const current = rows.filter(r => inRange(r.date, curStart, latest));
  const previous = rows.filter(r => inRange(r.date, prevStart, prevEnd));
  return { current, previous, curStart, latest };
}

function sumField(rows, f) { return rows.reduce((s, r) => s + (r[f] || 0), 0); }

/* ============================================================
   BLOCO 1 — KPIs
   ============================================================ */
function deltaHTML(cur, prev, { pct = true, suffix = '', hasPrev = true } = {}) {
  if (!hasPrev || prev == null) {
    return `<span class="kpi-delta flat">—<span class="cmp">sem período anterior</span></span>`;
  }
  let cls, arrow, txt;
  if (prev === 0) {
    if (cur === 0) { return `<span class="kpi-delta flat">→ 0%<span class="cmp">vs período anterior</span></span>`; }
    cls = 'up'; arrow = '↑'; txt = 'novo';
  } else {
    const change = ((cur - prev) / prev) * 100;
    if (Math.abs(change) < 0.05) { cls = 'flat'; arrow = '→'; }
    else if (change > 0) { cls = 'up'; arrow = '↑'; }
    else { cls = 'down'; arrow = '↓'; }
    txt = fmtPct(Math.abs(change)) + suffix;
  }
  return `<span class="kpi-delta ${cls}">${arrow} ${txt}<span class="cmp">vs período anterior</span></span>`;
}

function renderKPIs() {
  const { current, previous } = periodWindows(PERIOD);
  const hasPrev = previous.length > 0;

  const reach = sumField(current, 'reach');
  const reachPrev = sumField(previous, 'reach');
  const views = sumField(current, 'views');
  const viewsPrev = sumField(previous, 'views');
  const inter = sumField(current, 'total_interactions');
  const interPrev = sumField(previous, 'total_interactions');
  const newFollowers = sumField(current, 'new_followers');

  const er = reach > 0 ? (inter / reach) * 100 : 0;
  const erPrev = reachPrev > 0 ? (interPrev / reachPrev) * 100 : null;

  const followers = DATA.account.followers_count;

  const cards = [
    {
      accent: C.purple, label: 'Seguidores', value: fmtInt(followers),
      delta: `<span class="kpi-delta ${newFollowers > 0 ? 'up' : 'flat'}">${newFollowers > 0 ? '↑ +' + fmtInt(newFollowers) : '+0'}<span class="cmp">no período</span></span>`,
    },
    {
      accent: C.blue, label: 'Reach total', value: fmtInt(reach),
      delta: deltaHTML(reach, hasPrev ? reachPrev : null, { hasPrev }),
    },
    {
      accent: C.gold, label: 'Engagement rate médio', value: fmtPct(er),
      delta: deltaHTML(er, hasPrev ? erPrev : null, { hasPrev }),
    },
    {
      accent: C.purple, label: 'Views totais', value: fmtInt(views),
      delta: deltaHTML(views, hasPrev ? viewsPrev : null, { hasPrev }),
    },
  ];

  document.getElementById('kpiGrid').innerHTML = cards.map(c => `
    <div class="kpi-card" style="--accent:${c.accent}">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      ${c.delta}
    </div>`).join('');

  const lbl = `Últimos ${PERIOD} dias`;
  document.getElementById('kpiPeriodLabel').textContent = lbl;
  document.getElementById('evoPeriodLabel').textContent = lbl;
  document.getElementById('rankPeriodLabel').textContent = lbl;
}

/* ============================================================
   BLOCO 2 — Gráficos de evolução
   ============================================================ */
const chartFont = { family: "Inter, sans-serif" };

function baseOptions(extra = {}) {
  return Object.assign({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1A0A2E',
        titleFont: chartFont, bodyFont: chartFont,
        padding: 10, cornerRadius: 8, boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { ...chartFont, size: 11 }, color: C.muted, maxRotation: 0, autoSkipPadding: 12 },
      },
    },
  }, extra);
}

function renderEvolutionCharts() {
  const { current } = periodWindows(PERIOD);
  const labels = current.map(r => fmtDayMonth(r.date));

  /* --- Gráfico A: Reach + Views (dual axis) --- */
  const dataReach = current.map(r => r.reach);
  const dataViews = current.map(r => r.views);
  if (charts.reach) charts.reach.destroy();
  charts.reach = new Chart(document.getElementById('chartReach'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Reach', data: dataReach, borderColor: C.purple, backgroundColor: 'rgba(124,58,237,0.08)',
          yAxisID: 'y', tension: 0.3, fill: true, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: C.purple },
        { label: 'Views', data: dataViews, borderColor: C.blue, backgroundColor: 'rgba(59,130,246,0.05)',
          yAxisID: 'y1', tension: 0.3, fill: false, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: C.blue, borderDash: [4, 3] },
      ],
    },
    options: baseOptions({
      scales: {
        x: { grid: { display: false }, ticks: { font: { ...chartFont, size: 11 }, color: C.muted, maxRotation: 0, autoSkipPadding: 12 } },
        y: { position: 'left', beginAtZero: true, grid: { color: '#F0EEF6' },
          ticks: { font: { ...chartFont, size: 11 }, color: C.purple, callback: v => fmtInt(v) },
          title: { display: true, text: 'Reach', font: { ...chartFont, size: 11 }, color: C.purple } },
        y1: { position: 'right', beginAtZero: true, grid: { display: false },
          ticks: { font: { ...chartFont, size: 11 }, color: C.blue, callback: v => fmtInt(v) },
          title: { display: true, text: 'Views', font: { ...chartFont, size: 11 }, color: C.blue } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A0A2E', titleFont: chartFont, bodyFont: chartFont, padding: 10, cornerRadius: 8, boxPadding: 4,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtInt(ctx.parsed.y)}` },
        },
      },
    }),
  });

  /* --- Gráfico B: Engajamento --- */
  const mk = (f) => current.map(r => r[f]);
  if (charts.eng) charts.eng.destroy();
  charts.eng = new Chart(document.getElementById('chartEngagement'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Likes', data: mk('likes'), borderColor: C.gold, tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
        { label: 'Comentários', data: mk('comments'), borderColor: C.purpleLight, tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
        { label: 'Saves', data: mk('saves'), borderColor: C.blue, tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
        { label: 'Shares', data: mk('shares'), borderColor: C.gray, tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
      ],
    },
    options: baseOptions({
      scales: {
        x: { grid: { display: false }, ticks: { font: { ...chartFont, size: 11 }, color: C.muted, maxRotation: 0, autoSkipPadding: 12 } },
        y: { beginAtZero: true, grid: { color: '#F0EEF6' }, ticks: { font: { ...chartFont, size: 11 }, color: C.muted, precision: 0 } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1A0A2E', titleFont: chartFont, bodyFont: chartFont, padding: 10, cornerRadius: 8, boxPadding: 4,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtInt(ctx.parsed.y)}` } },
      },
    }),
  });
}

/* ============================================================
   BLOCO 3 — Ranking de posts
   ============================================================ */
function postsInPeriod() {
  const { curStart, latest } = periodWindows(PERIOD);
  const endOfLatest = new Date(latest.getTime() + 86400000 - 1);
  return DATA.posts.filter(p => {
    const t = new Date(p.timestamp).getTime();
    return t >= curStart.getTime() && t <= endOfLatest.getTime();
  });
}

function postRow(p) {
  const m = p.metrics;
  const er = m.reach > 0 ? (m.engagement / m.reach) * 100 : 0;
  return {
    p, er,
    date: new Date(p.timestamp).getTime(),
    reach: m.reach, engagement: m.engagement,
    saves: m.saves || 0, shares: m.shares || 0, follows: m.follows || 0,
  };
}

const typeLabel = { IMAGE: 'Imagem', CAROUSEL_ALBUM: 'Carrossel', REELS: 'Reel' };
const typeIcon = { IMAGE: '🖼️', CAROUSEL_ALBUM: '🎠', REELS: '🎬' };

function renderRanking() {
  const rows = postsInPeriod().map(postRow);

  // Highlights (calculados sobre o conjunto do período)
  let maxReach = -1, maxEr = -1;
  rows.forEach((r) => {
    if (r.reach > maxReach) maxReach = r.reach;
    if (r.er > maxEr) maxEr = r.er;
  });

  // Sort
  const { key, dir } = rankSort;
  rows.sort((a, b) => {
    const av = a[key], bv = b[key];
    return dir === 'asc' ? av - bv : bv - av;
  });

  const body = document.getElementById('rankBody');
  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:28px;">Nenhum post no período selecionado.</td></tr>`;
    updateSortIndicators();
    return;
  }

  body.innerHTML = rows.map((r) => {
    const p = r.p;
    const isMaxReach = r.reach === maxReach && maxReach > 0;
    const isMaxEr = r.er === maxEr && maxEr > 0;
    const rowCls = [isMaxReach ? 'hl-reach' : '', isMaxEr ? 'hl-er' : ''].join(' ').trim();

    const thumb = p.media_url
      ? `<img class="thumb" src="${p.media_url}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=\\'thumb-fallback\\'>${typeIcon[p.type] || '📄'}</div>'">`
      : `<div class="thumb-fallback">${typeIcon[p.type] || '📄'}</div>`;

    const caption = (p.caption || '').replace(/\s+/g, ' ').trim();
    const short = caption.length > 80 ? caption.slice(0, 80) + '…' : caption;
    const captionCell = caption.length > 80
      ? `<div class="caption-text" data-full="${escapeAttr(caption)}" data-short="${escapeAttr(short)}" onclick="toggleCaption(this)">${escapeHtml(short)} <span class="toggle">ver mais</span></div>`
      : `<div class="caption-text">${escapeHtml(short)}</div>`;

    const tags = `${isMaxReach ? '<span class="hl-tag reach">maior reach</span>' : ''}${isMaxEr ? '<span class="hl-tag er">maior ER</span>' : ''}`;

    return `<tr class="${rowCls}">
      <td><a class="row-link" href="${p.permalink}" target="_blank" rel="noopener">${thumb}</a></td>
      <td><span class="badge ${p.type}">${typeLabel[p.type] || p.type}</span></td>
      <td>${fmtPostDate(p.timestamp)}${tags}</td>
      <td class="caption-cell">${captionCell}</td>
      <td class="num">${fmtInt(r.reach)}</td>
      <td class="num">${fmtInt(r.engagement)}</td>
      <td class="num">${fmtPct(r.er)}</td>
      <td class="num">${fmtInt(r.saves)}</td>
      <td class="num">${fmtInt(r.shares)}</td>
      <td class="num">${fmtInt(r.follows)}</td>
    </tr>`;
  }).join('');

  updateSortIndicators();
}

function updateSortIndicators() {
  document.querySelectorAll('table.ranking thead th[data-sort]').forEach(th => {
    const key = th.getAttribute('data-sort');
    const existing = th.querySelector('.arrow');
    if (existing) existing.remove();
    if (key === rankSort.key) {
      const span = document.createElement('span');
      span.className = 'arrow';
      span.textContent = rankSort.dir === 'asc' ? '▲' : '▼';
      th.appendChild(span);
    }
  });
}

function toggleCaption(el) {
  const expanded = el.dataset.expanded === '1';
  if (expanded) {
    el.innerHTML = escapeHtml(el.dataset.short) + ' <span class="toggle">ver mais</span>';
    el.dataset.expanded = '0';
  } else {
    el.innerHTML = escapeHtml(el.dataset.full) + ' <span class="toggle">ver menos</span>';
    el.dataset.expanded = '1';
  }
}
window.toggleCaption = toggleCaption;

/* ============================================================
   BLOCO 4 — Comparativo por formato (todos os posts)
   ============================================================ */
const FMT_ORDER = ['IMAGE', 'CAROUSEL_ALBUM', 'REELS'];
const FMT_COLOR = { IMAGE: C.purple, CAROUSEL_ALBUM: C.blue, REELS: C.gold };

function formatAggregates() {
  const agg = {};
  FMT_ORDER.forEach(t => agg[t] = { count: 0, reach: 0, engagement: 0, saves: 0, shares: 0, erSum: 0 });
  DATA.posts.forEach(p => {
    const t = p.type; if (!agg[t]) return;
    const m = p.metrics;
    agg[t].count++;
    agg[t].reach += m.reach || 0;
    agg[t].engagement += m.engagement || 0;
    agg[t].saves += m.saves || 0;
    agg[t].shares += m.shares || 0;
    agg[t].erSum += (m.reach > 0 ? (m.engagement / m.reach) * 100 : 0);
  });
  const out = {};
  FMT_ORDER.forEach(t => {
    const a = agg[t]; const n = a.count || 1;
    out[t] = {
      count: a.count,
      reach: a.reach / n,
      engagement: a.engagement / n,
      saves: a.saves / n,
      shares: a.shares / n,
      er: a.erSum / n,
    };
  });
  return out;
}

const METRIC_LABEL = { reach: 'Reach médio', engagement: 'Engagement médio', saves: 'Saves médio', shares: 'Shares médio', er: 'Engagement rate médio' };

function renderFormats() {
  const agg = formatAggregates();
  const labels = FMT_ORDER.map(t => typeLabel[t]);
  const values = FMT_ORDER.map(t => agg[t][FMT_METRIC]);
  const colors = FMT_ORDER.map(t => FMT_COLOR[t]);
  const isPct = FMT_METRIC === 'er';

  if (charts.fmt) charts.fmt.destroy();
  charts.fmt = new Chart(document.getElementById('chartFormats'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: METRIC_LABEL[FMT_METRIC],
        data: values,
        backgroundColor: colors.map(c => c + 'CC'),
        borderColor: colors,
        borderWidth: 1.5,
        borderRadius: 8,
        maxBarThickness: 90,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A0A2E', titleFont: chartFont, bodyFont: chartFont, padding: 10, cornerRadius: 8,
          callbacks: { label: (ctx) => `${METRIC_LABEL[FMT_METRIC]}: ${isPct ? fmtPct(ctx.parsed.y) : fmtDec(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { ...chartFont, size: 12, weight: '600' }, color: C.text } },
        y: { beginAtZero: true, grid: { color: '#F0EEF6' },
          ticks: { font: { ...chartFont, size: 11 }, color: C.muted, callback: v => isPct ? fmtPct(v, 0) : fmtInt(v) } },
      },
    },
  });

  // Tabela de apoio
  const t = document.getElementById('formatTable');
  t.innerHTML = `
    <thead><tr>
      <th>Formato</th><th>Posts</th><th>Reach méd.</th><th>Engaj. méd.</th><th>Saves méd.</th><th>Shares méd.</th><th>ER méd.</th>
    </tr></thead>
    <tbody>
      ${FMT_ORDER.map(f => {
        const a = agg[f];
        return `<tr>
          <td class="fmt-name"><span class="badge ${f}">${typeLabel[f]}</span></td>
          <td class="fmt-count">${a.count}</td>
          <td>${fmtDec(a.reach)}</td>
          <td>${fmtDec(a.engagement)}</td>
          <td>${fmtDec(a.saves, 2)}</td>
          <td>${fmtDec(a.shares, 2)}</td>
          <td>${fmtPct(a.er)}</td>
        </tr>`;
      }).join('')}
    </tbody>`;
}

/* ============================================================
   BLOCO 5 — Audiência
   ============================================================ */
function renderAudience() {
  const a = DATA.audience;
  const el = document.getElementById('audienceCard');
  const current = a.current_followers != null ? a.current_followers : DATA.account.followers_count;
  const required = a.min_followers_required || 100;

  if (!a.available) {
    const missing = Math.max(0, required - current);
    const pct = Math.min(100, (current / required) * 100);
    el.className = 'card';
    el.innerHTML = `
      <div class="audience-locked">
        <div class="lock-icon">🔒</div>
        <h3>Dados demográficos ainda indisponíveis</h3>
        <p>Os dados demográficos ficam disponíveis a partir de <strong>${required} seguidores</strong>.
        Faltam <span class="missing">${missing} seguidores</span> para desbloquear gênero, faixa etária, cidades e países.</p>
        <div class="progress">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="progress-labels"><span>${fmtInt(current)} atuais</span><span>${fmtInt(required)} necessários</span></div>
        </div>
      </div>`;
  } else {
    // Audiência disponível (≥ 100 seguidores): gênero, faixa etária, cidades, países.
    const GEN = { F: 'Feminino', M: 'Masculino', U: 'Não informado' };
    const GEN_COLOR = { F: C.purple, M: C.blue, U: C.gray };
    const COUNTRY = {
      BR: 'Brasil', PT: 'Portugal', CH: 'Suíça', US: 'Estados Unidos', AR: 'Argentina',
      ES: 'Espanha', FR: 'França', IT: 'Itália', DE: 'Alemanha', GB: 'Reino Unido',
      AO: 'Angola', MZ: 'Moçambique', UY: 'Uruguai', PY: 'Paraguai', CL: 'Chile',
    };

    el.className = 'audience-grid';
    el.innerHTML = `
      <div class="card audience-panel">
        <p class="card-title">Gênero</p>
        <div class="chart-box audience-mini"><canvas id="audGender"></canvas></div>
        <div class="audience-legend" id="audGenderLegend"></div>
      </div>
      <div class="card audience-panel">
        <p class="card-title">Faixa etária</p>
        <div class="chart-box audience-mini"><canvas id="audAge"></canvas></div>
      </div>
      <div class="card audience-panel">
        <p class="card-title">Top cidades</p>
        <ul class="audience-list" id="audCities"></ul>
      </div>
      <div class="card audience-panel">
        <p class="card-title">Países</p>
        <ul class="audience-list" id="audCountries"></ul>
      </div>`;

    // Listas (top 5) com barra proporcional
    const listHTML = (arr, labeler) => {
      const top = (arr || []).slice(0, 5);
      if (!top.length) return `<li class="audience-empty">Sem dados</li>`;
      const max = Math.max.apply(null, top.map(x => x.size).concat([1]));
      return top.map((x, i) => `
        <li>
          <span class="rank">${i + 1}</span>
          <span class="name" title="${escapeAttr(x.name)}">${escapeHtml(labeler(x.name))}</span>
          <span class="bar"><span style="width:${(x.size / max) * 100}%"></span></span>
          <span class="val">${fmtPct(x.size, 0)}</span>
        </li>`).join('');
    };
    document.getElementById('audCities').innerHTML =
      listHTML(a.cities, n => n.split(',')[0]);
    document.getElementById('audCountries').innerHTML =
      listHTML(a.countries, c => COUNTRY[c] || c);

    if (hasChart()) {
      // Donut de gênero
      const g = a.gender || [];
      if (charts.audGender) charts.audGender.destroy();
      charts.audGender = new Chart(document.getElementById('audGender'), {
        type: 'doughnut',
        data: {
          labels: g.map(x => GEN[x.name] || x.name),
          datasets: [{
            data: g.map(x => x.size),
            backgroundColor: g.map(x => GEN_COLOR[x.name] || C.muted),
            borderWidth: 2, borderColor: '#fff',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1A0A2E', titleFont: chartFont, bodyFont: chartFont, padding: 10, cornerRadius: 8,
              callbacks: { label: (ctx) => `${ctx.label}: ${fmtPct(ctx.parsed, 0)}` },
            },
          },
        },
      });
      document.getElementById('audGenderLegend').innerHTML = g.map(x =>
        `<span class="item"><span class="sw" style="background:${GEN_COLOR[x.name] || C.muted}"></span>${GEN[x.name] || x.name} · ${fmtPct(x.size, 0)}</span>`).join('');

      // Barras horizontais de faixa etária
      const ages = a.age || [];
      if (charts.audAge) charts.audAge.destroy();
      charts.audAge = new Chart(document.getElementById('audAge'), {
        type: 'bar',
        data: {
          labels: ages.map(x => x.name),
          datasets: [{
            data: ages.map(x => x.size),
            backgroundColor: C.purple + 'CC', borderColor: C.purple,
            borderWidth: 1.5, borderRadius: 6, maxBarThickness: 26,
          }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1A0A2E', titleFont: chartFont, bodyFont: chartFont, padding: 10, cornerRadius: 8,
              callbacks: { label: (ctx) => `${ctx.label}: ${fmtPct(ctx.parsed.x, 0)}` },
            },
          },
          scales: {
            x: { beginAtZero: true, grid: { color: '#F0EEF6' }, ticks: { font: { ...chartFont, size: 11 }, color: C.muted, callback: v => v + '%' } },
            y: { grid: { display: false }, ticks: { font: { ...chartFont, size: 11 }, color: C.text } },
          },
        },
      });
    }
  }
}

/* ============================================================
   Utils de escape
   ============================================================ */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

/* ============================================================
   Render geral + eventos
   ============================================================ */
const hasChart = () => typeof window.Chart !== 'undefined';

function renderPeriodDependent() {
  renderKPIs();
  renderRanking();
  // Gráficos são isolados: uma falha ao carregar o Chart.js não pode
  // derrubar KPIs, ranking ou o restante do dashboard.
  if (hasChart()) {
    try { renderEvolutionCharts(); } catch (e) { console.error('Falha ao renderizar gráficos de evolução:', e); }
  }
}
function renderAll() {
  renderPeriodDependent();
  if (hasChart()) {
    try { renderFormats(); } catch (e) { console.error('Falha ao renderizar comparativo de formato:', e); }
  } else {
    warnChartUnavailable();
  }
  renderAudience();
}

function warnChartUnavailable() {
  document.querySelectorAll('.chart-box').forEach(box => {
    box.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:13px;text-align:center;padding:16px;">Gráfico indisponível — biblioteca de charts não carregou.</div>';
  });
}

function bindEvents() {
  // Seletor de período
  document.getElementById('periodSelector').addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    PERIOD = Number(btn.dataset.period);
    document.querySelectorAll('#periodSelector button').forEach(b => b.classList.toggle('active', b === btn));
    renderPeriodDependent();
  });

  // Sort na tabela
  document.querySelectorAll('table.ranking thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      if (rankSort.key === key) {
        rankSort.dir = rankSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        rankSort.key = key;
        rankSort.dir = (key === 'date') ? 'desc' : 'desc';
      }
      renderRanking();
    });
  });

  // Toggle de métrica no bloco 4
  document.getElementById('fmtToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    FMT_METRIC = btn.dataset.metric;
    document.querySelectorAll('#fmtToggle button').forEach(b => b.classList.toggle('active', b === btn));
    renderFormats();
  });
}

/* ============================================================
   Bootstrap
   ============================================================ */
async function init() {
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    DATA = await res.json();
  } catch (err) {
    console.error(err);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    return;
  }

  // Header
  document.getElementById('updatedBadge').innerHTML =
    `<span class="dot"></span>Atualizado em ${fmtUpdated(DATA.meta.last_updated)}`;
  document.getElementById('footNote').textContent =
    `${DATA.meta.account_name} · ${DATA.posts.length} posts · ${DATA.daily_metrics.length} dias de métricas`;

  bindEvents();
  renderAll();

  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', init);
