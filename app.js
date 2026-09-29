/* =====================================================
 * 训练记录 — app.js
 * 结构: ①常量 ②存储层 ③工具 ④路由与状态 ⑤记录视图
 *       ⑥历史视图 ⑦动作库视图 ⑧分析·进步趋势
 *       ⑨分析·增肌 ⑩设置 ⑪初始化
 * ===================================================== */
'use strict';

const $ = id => document.getElementById(id);

/* ===== ① 常量 ===== */
const STORAGE_KEY = 'trainingLog.data';
const CURRENT_VERSION = 1;

const MUSCLE_GROUPS = ['胸', '背', '腿', '臀', '肩', '手臂', '核心', '其他'];

const PRESET_EXERCISES = [
  { name: '杠铃卧推', groups: ['胸'] },
  { name: '哑铃卧推', groups: ['胸'] },
  { name: '上斜杠铃卧推', groups: ['胸'] },
  { name: '上斜哑铃卧推', groups: ['胸'] },
  { name: '绳索夹胸', groups: ['胸'] },
  { name: '蝴蝶机夹胸', groups: ['胸'] },
  { name: '俯卧撑', groups: ['胸'] },
  { name: '双杠臂屈伸', groups: ['胸', '手臂'] },
  { name: '引体向上', groups: ['背', '手臂'] },
  { name: '高位下拉', groups: ['背'] },
  { name: '杠铃划船', groups: ['背'] },
  { name: '哑铃单臂划船', groups: ['背'] },
  { name: '坐姿划船', groups: ['背'] },
  { name: '直臂下压', groups: ['背'] },
  { name: '硬拉', groups: ['背', '腿'] },
  { name: '杠铃深蹲', groups: ['腿'] },
  { name: '前蹲', groups: ['腿'] },
  { name: '腿举', groups: ['腿'] },
  { name: '哈克深蹲', groups: ['腿'] },
  { name: '弓步蹲', groups: ['腿'] },
  { name: '腿屈伸', groups: ['腿'] },
  { name: '腿弯举', groups: ['腿'] },
  { name: '罗马尼亚硬拉', groups: ['腿', '臀'] },
  { name: '臀推', groups: ['臀'] },
  { name: '杠铃臀桥', groups: ['臀'] },
  { name: '绳索后踢腿', groups: ['臀'] },
  { name: '杠铃站姿推举', groups: ['肩'] },
  { name: '哑铃坐姿推举', groups: ['肩'] },
  { name: '哑铃侧平举', groups: ['肩'] },
  { name: '绳索侧平举', groups: ['肩'] },
  { name: '面拉', groups: ['肩', '背'] },
  { name: '俯身飞鸟', groups: ['肩'] },
  { name: '反向蝴蝶机', groups: ['肩'] },
  { name: '杠铃弯举', groups: ['手臂'] },
  { name: '哑铃交替弯举', groups: ['手臂'] },
  { name: '锤式弯举', groups: ['手臂'] },
  { name: '牧师凳弯举', groups: ['手臂'] },
  { name: '绳索下压', groups: ['手臂'] },
  { name: '仰卧臂屈伸', groups: ['手臂'] },
  { name: '窄距卧推', groups: ['手臂', '胸'] },
  { name: '卷腹', groups: ['核心'] },
  { name: '悬垂举腿', groups: ['核心'] },
  { name: '俄罗斯转体', groups: ['核心'] },
];

const RPE_OPTIONS = ['', 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

const METRICS = [
  { key: 'e1rm', label: '估算1RM', fmt: v => fmtKg(v) },
  { key: 'volume', label: '总容量', fmt: v => fmtKg(v) },
  { key: 'top', label: '最重一组', fmt: v => fmtKg(v) },
];

/* ===== ② 存储层 ===== */
let storageOK = true;
let data = null;

function freshData() {
  return { version: CURRENT_VERSION, workouts: [], customExercises: [] };
}

function validGroups(arr) {
  const g = [];
  if (Array.isArray(arr)) {
    for (const x of arr) if (MUSCLE_GROUPS.includes(x) && !g.includes(x)) g.push(x);
  }
  if (!g.length) g.push('其他');
  return g;
}

function toNum(x) {
  const n = typeof x === 'number' ? x : (typeof x === 'string' && x.trim() !== '' ? Number(x) : NaN);
  return isFinite(n) ? n : null;
}

function cleanRpe(x) {
  const n = toNum(x);
  if (n === null || n < 5 || n > 10) return null;
  return Math.round(n * 2) / 2;
}

function cleanWorkout(w) {
  if (!w || typeof w !== 'object') return null;
  const date = typeof w.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.date) ? w.date : null;
  if (!date) return null;
  const exercises = [];
  if (Array.isArray(w.exercises)) {
    for (const ex of w.exercises) {
      if (!ex || typeof ex !== 'object') continue;
      const name = typeof ex.name === 'string' ? ex.name.trim() : '';
      if (!name) continue;
      const groups = validGroups(ex.muscleGroups);
      const sets = [];
      if (Array.isArray(ex.sets)) {
        for (const s of ex.sets) {
          if (!s || typeof s !== 'object') continue;
          const weight = toNum(s.weight), reps = toNum(s.reps);
          if (weight === null || reps === null) continue;
          const cw = clamp(weight, 0, 2000);
          const cr = Math.round(clamp(reps, 1, 200));
          if (!isFinite(cr) || cr < 1) continue;
          sets.push({ weight: cw, reps: cr, rpe: cleanRpe(s.rpe) });
        }
      }
      if (!sets.length) continue;
      exercises.push({
        id: typeof ex.id === 'string' ? ex.id : uid('e'),
        name, muscleGroups: groups, sets,
      });
    }
  }
  if (!exercises.length) return null;
  return {
    id: typeof w.id === 'string' ? w.id : uid('w'),
    date,
    isDeload: w.isDeload === true,
    note: typeof w.note === 'string' ? w.note.slice(0, 500) : '',
    exercises,
  };
}

function sanitizeData(obj) {
  const out = freshData();
  if (!obj || typeof obj !== 'object') return out;
  if (isFinite(obj.version)) out.version = Math.min(Math.max(Math.floor(obj.version), 0), CURRENT_VERSION);
  if (Array.isArray(obj.workouts)) {
    for (const w of obj.workouts) {
      const c = cleanWorkout(w);
      if (c) out.workouts.push(c);
    }
  }
  if (Array.isArray(obj.customExercises)) {
    for (const x of obj.customExercises) {
      if (!x || typeof x !== 'object') continue;
      const name = typeof x.name === 'string' ? x.name.trim() : '';
      if (!name) continue;
      if (out.customExercises.some(e => e.name === name)) continue;
      out.customExercises.push({
        id: typeof x.id === 'string' ? x.id : uid('x'),
        name, muscleGroups: validGroups(x.muscleGroups),
      });
    }
  }
  return out;
}

function setStorageUnavailable() {
  storageOK = false;
  const b = $('storage-banner'), w = $('storage-warn');
  if (b) b.hidden = false;
  if (w) w.hidden = false;
}

function save() {
  if (!storageOK) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    setStorageUnavailable();
    toast('浏览器存储不可用，请立即导出备份！', 'warn');
  }
}

function loadData() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { setStorageUnavailable(); }
  if (raw === null) return freshData();
  let obj = null;
  try { obj = JSON.parse(raw); } catch (e) { return freshData(); }
  if (isFinite(obj.version) && obj.version > CURRENT_VERSION) {
    setTimeout(() => toast('数据文件来自更新版本，已尽力导入兼容字段', 'warn'), 0);
  }
  return sanitizeData(obj);
}

/* ===== ③ 工具 ===== */
function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function dateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function todayStr() { return dateStr(new Date()); }
function addDays(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  return dateStr(new Date(y, m - 1, d + n));
}
function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function weekday(dateStr) {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][parseDate(dateStr).getDay()];
}
function monthLabel(dateStr) {
  const [y, m] = dateStr.split('-');
  return Number(y) + '年' + Number(m) + '月';
}
function shortDate(dateStr) { return dateStr.slice(5); }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function fmtNum(v, digits = 1) {
  return Number.isFinite(v) ? v.toLocaleString('zh-CN', { maximumFractionDigits: digits }) : '–';
}
function fmtKg(v) { return fmtNum(v) + ' kg'; }
function fmtPct(p) { return (p > 0 ? '+' : '') + p.toFixed(1) + '%'; }
function epley(w, r) { return r === 1 ? w : w * (1 + r / 30); }
function median(arr) {
  const a = [...arr].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function niceTicks(min, max, n = 4) {
  const span = max - min || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const norm = step0 / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const out = [];
  for (let v = lo; v <= max + step * 1e-6; v += step) out.push(v);
  return out;
}

function sortedWorkoutsDesc() {
  return data.workouts
    .map((w, i) => ({ w, i }))
    .sort((a, b) => b.w.date.localeCompare(a.w.date) || b.i - a.i)
    .map(x => x.w);
}

function allExercises() {
  const map = new Map();
  for (const e of PRESET_EXERCISES) map.set(e.name, e.groups);
  for (const e of data.customExercises) if (!map.has(e.name)) map.set(e.name, e.muscleGroups);
  return [...map.entries()].map(([name, groups]) => ({ name, groups }));
}

function recentExercises() {
  const seen = [];
  for (const w of sortedWorkoutsDesc()) {
    for (const ex of w.exercises) {
      if (!seen.includes(ex.name)) {
        seen.push(ex.name);
        if (seen.length >= 6) return seen;
      }
    }
  }
  return seen;
}

/* ===== ④ 路由与状态 ===== */
const state = {
  editingId: null,
  selectedExercise: null,
  metric: 'e1rm',
  subTab: 'progress',
  volGroup: '全身',
  historySearch: '',
  pendingImport: null,
  searchTimer: null,
};

let toastTimer = null;
function toast(msg, type) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  el.className = 'toast show' + (type === 'warn' ? ' warn' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function switchTab(name) {
  document.querySelectorAll('#tabbar .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
  if (name === 'history') renderHistory();
  else if (name === 'analysis') renderAnalysis();
  else if (name === 'library') renderLibrary();
  else if (name === 'settings') renderSettings();
  window.scrollTo(0, 0);
}

/* ===== ⑤ 记录视图 ===== */
function clearExercises() { $('ex-list').innerHTML = ''; }

function updateRecordEmptyState() {
  const list = $('ex-list');
  const has = list.querySelector('.ex-card');
  let ph = list.querySelector('.ex-empty');
  if (has) { if (ph) ph.remove(); return; }
  if (!ph) {
    ph = document.createElement('div');
    ph.className = 'empty ex-empty';
    ph.textContent = '还没有动作 — 点击下方「＋ 添加动作」开始';
    list.appendChild(ph);
  }
}

function resetRecordForm() {
  state.editingId = null;
  $('rec-date').value = todayStr();
  $('rec-deload').checked = false;
  $('rec-note').value = '';
  $('btn-cancel-edit').hidden = true;
  $('rec-edit-banner').hidden = true;
  $('rec-error').hidden = true;
  clearExercises();
  updateRecordEmptyState();
}

function fillWorkout(w) {
  state.editingId = w.id;
  $('rec-date').value = w.date;
  $('rec-deload').checked = !!w.isDeload;
  $('rec-note').value = w.note || '';
  $('btn-cancel-edit').hidden = false;
  const banner = $('rec-edit-banner');
  banner.hidden = false;
  banner.querySelector('b').textContent = shortDate(w.date);
  clearExercises();
  for (const ex of w.exercises) {
    addExerciseCard(ex.name, ex.muscleGroups, ex.sets.map(s => ({ weight: s.weight, reps: s.reps, rpe: s.rpe == null ? '' : s.rpe })));
  }
  updateRecordEmptyState();
}

function groupChipsHtml(selected) {
  return MUSCLE_GROUPS.map(g =>
    `<button type="button" class="chip${(selected || []).includes(g) ? ' on' : ''}" data-group="${g}">${g}</button>`
  ).join('');
}

function rpeOptionsHtml(sel) {
  return RPE_OPTIONS.map(v =>
    `<option value="${v}"${String(sel) === String(v) ? ' selected' : ''}>${v === '' ? '不填' : v}</option>`
  ).join('');
}

function addExerciseCard(name, groups, sets) {
  const card = document.createElement('div');
  card.className = 'ex-card';
  card.innerHTML = `
    <div class="ex-head">
      <input class="ex-name" type="text" value="${escapeHtml(name)}" placeholder="动作名称" maxlength="30">
      <button type="button" class="icon-btn ex-del" title="移除动作">✕</button>
    </div>
    <div class="ex-groups">${groupChipsHtml(groups)}</div>
    <div class="set-head"><span></span><span>重量 kg</span><span>次数</span><span>RPE</span><span></span></div>
    <div class="set-rows"></div>
    <button type="button" class="btn sm ghost add-set">＋ 添加一组</button>
    <div class="subtotal"></div>`;
  const n = sets && sets.length ? sets.length : 3;
  for (let i = 0; i < n; i++) addSetRow(card, sets && sets[i]);
  $('ex-list').appendChild(card);
  updateRecordEmptyState();
  updateSubtotal(card);
  return card;
}

function renumberSets(card) {
  card.querySelectorAll('.set-row').forEach((r, i) => { r.querySelector('.set-num').textContent = i + 1; });
}

function addSetRow(card, preset) {
  const rows = card.querySelector('.set-rows');
  const row = document.createElement('div');
  row.className = 'set-row';
  row.innerHTML = `
    <span class="set-num"></span>
    <input class="set-weight" type="text" inputmode="decimal" placeholder="重量">
    <input class="set-reps" type="text" inputmode="numeric" placeholder="次数">
    <select class="set-rpe">${rpeOptionsHtml('')}</select>
    <button type="button" class="icon-btn set-del" title="删除此组">✕</button>`;
  const wi = row.querySelector('.set-weight');
  const ri = row.querySelector('.set-reps');
  if (preset) {
    wi.value = preset.weight;
    ri.value = preset.reps;
    row.querySelector('.set-rpe').value = String(preset.rpe === undefined || preset.rpe === null ? '' : preset.rpe);
  } else {
    const prev = rows.querySelector('.set-row:last-of-type');
    if (prev) {
      wi.value = prev.querySelector('.set-weight').value;
      ri.value = prev.querySelector('.set-reps').value;
    }
  }
  rows.appendChild(row);
  renumberSets(card);
  return row;
}

function updateSubtotal(card) {
  let count = 0, volume = 0, best = null;
  for (const row of card.querySelectorAll('.set-row')) {
    const w = parseFloat(row.querySelector('.set-weight').value);
    const r = parseInt(row.querySelector('.set-reps').value, 10);
    if (!isFinite(w) || w < 0 || !isFinite(r) || r < 1) continue;
    count++;
    volume += w * r;
    const e1 = epley(w, r);
    if (best === null || e1 > best) best = e1;
  }
  const el = card.querySelector('.subtotal');
  el.textContent = count
    ? `共 ${count} 组 · 总容量 ${fmtNum(volume)} kg · 最佳估算1RM ≈ ${fmtNum(best)} kg`
    : '';
}

function collectRecord() {
  const date = $('rec-date').value;
  const isDeload = $('rec-deload').checked;
  const note = $('rec-note').value.trim();
  const exercises = [];
  let error = null;
  const cards = [...document.querySelectorAll('#ex-list .ex-card')];
  if (!cards.length) error = '请至少添加一个动作';
  cards.forEach((card, ci) => {
    const nameInput = card.querySelector('.ex-name');
    nameInput.classList.remove('invalid');
    const name = nameInput.value.trim();
    if (!name && !error) error = `第 ${ci + 1} 个动作缺少名称`;
    const groups = [...card.querySelectorAll('.ex-groups .chip.on')].map(c => c.dataset.group);
    if (!groups.length && !error) error = `请为「${name || '第 ' + (ci + 1) + ' 个动作'}」选择至少一个肌群`;
    const sets = [];
    card.querySelectorAll('.set-row').forEach((row, si) => {
      const wi = row.querySelector('.set-weight');
      const ri = row.querySelector('.set-reps');
      wi.classList.remove('invalid');
      ri.classList.remove('invalid');
      const wRaw = wi.value.trim(), rRaw = ri.value.trim();
      if (!wRaw && !rRaw) return; // 整行空白 = 未使用的预填槽位，跳过
      const w = parseFloat(wRaw), r = parseInt(rRaw, 10);
      if (wRaw === '' || rRaw === '' || !isFinite(w) || w < 0 || !isFinite(r) || r < 1) {
        wi.classList.add('invalid');
        ri.classList.add('invalid');
        if (!error) error = `第 ${ci + 1} 个动作第 ${si + 1} 组未填完整`;
        return;
      }
      const rpeRaw = row.querySelector('.set-rpe').value;
      sets.push({
        weight: clamp(w, 0, 2000),
        reps: clamp(Math.round(r), 1, 200),
        rpe: rpeRaw === '' ? null : parseFloat(rpeRaw),
      });
    });
    if (!sets.length && !error) error = `第 ${ci + 1} 个动作（${name}）至少填写一组`;
    exercises.push({ id: uid('e'), name, muscleGroups: groups, sets });
  });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) && !error) error = '请选择训练日期';
  return { ok: !error, error, date, isDeload, note, exercises };
}

function saveWorkout() {
  const res = collectRecord();
  const errEl = $('rec-error');
  if (!res.ok) {
    errEl.textContent = res.error;
    errEl.hidden = false;
    return;
  }
  errEl.hidden = true;
  const known = allExercises().map(e => e.name);
  for (const ex of res.exercises) {
    if (!known.includes(ex.name) && !data.customExercises.some(x => x.name === ex.name)) {
      data.customExercises.push({ id: uid('x'), name: ex.name, muscleGroups: ex.muscleGroups });
    }
  }
  const workout = {
    id: state.editingId || uid('w'),
    date: res.date,
    isDeload: res.isDeload,
    note: res.note,
    exercises: res.exercises,
  };
  if (state.editingId) {
    const i = data.workouts.findIndex(w => w.id === state.editingId);
    if (i >= 0) data.workouts[i] = workout;
  } else {
    data.workouts.push(workout);
  }
  save();
  toast('训练已保存 ✓');
  resetRecordForm();
}

function copyLastWorkout() {
  if (!data.workouts.length) { toast('还没有历史训练可以复制'); return; }
  const sorted = data.workouts
    .map((w, i) => ({ w, i }))
    .sort((a, b) => a.w.date.localeCompare(b.w.date) || a.i - b.i);
  const last = sorted[sorted.length - 1].w;
  $('rec-date').value = todayStr();
  $('rec-deload').checked = false;
  $('rec-note').value = '';
  state.editingId = null;
  $('btn-cancel-edit').hidden = true;
  $('rec-edit-banner').hidden = true;
  $('rec-error').hidden = true;
  clearExercises();
  for (const ex of last.exercises) {
    addExerciseCard(ex.name, ex.muscleGroups, ex.sets.map(s => ({ weight: s.weight, reps: s.reps, rpe: s.rpe == null ? '' : s.rpe })));
  }
  updateRecordEmptyState();
  toast('已复制上次训练，日期已设为今天');
}

/* —— 动作选择器弹窗 —— */
function openPicker() {
  const modal = $('picker-modal');
  modal.hidden = false;
  $('picker-search').value = '';
  $('picker-new').hidden = true;
  $('btn-toggle-new').textContent = '＋ 新建自定义动作';
  renderPicker();
  setTimeout(() => $('picker-search').focus(), 0);
}

function closePicker() { $('picker-modal').hidden = true; }

function renderPicker() {
  const q = $('picker-search').value.trim().toLowerCase();
  const recBox = $('picker-recent');
  recBox.innerHTML = '';
  const filteredRecent = recentExercises().filter(n => !q || n.toLowerCase().includes(q));
  if (filteredRecent.length) {
    recBox.innerHTML = '<div class="picker-label">最近使用</div>' +
      filteredRecent.map(n => `<button type="button" class="picker-item" data-name="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join('');
  }
  let html = '';
  for (const g of MUSCLE_GROUPS) {
    const items = allExercises().filter(e => e.groups.includes(g) && (!q || e.name.toLowerCase().includes(q)));
    if (items.length) {
      html += `<div class="picker-label">${g}</div>` + items.map(e =>
        `<button type="button" class="picker-item" data-name="${escapeHtml(e.name)}">${escapeHtml(e.name)}<span class="picker-groups">${e.groups.map(escapeHtml).join('·')}</span></button>`
      ).join('');
    }
  }
  $('picker-list').innerHTML = html || '<div class="empty" style="padding:16px">没有匹配的动作</div>';
}

function renderChips(container, selected) {
  container.innerHTML = MUSCLE_GROUPS.map(g =>
    `<button type="button" class="chip${selected.includes(g) ? ' on' : ''}" data-group="${g}">${g}</button>`
  ).join('');
  container.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => c.classList.toggle('on')));
}

function createCustomExercise(fromPicker) {
  const name = $('new-ex-name').value.trim();
  const groups = [...document.querySelectorAll('#new-ex-groups .chip.on')].map(c => c.dataset.group);
  if (!name) { toast('请输入动作名称', 'warn'); return; }
  if (!groups.length) { toast('请选择至少一个肌群', 'warn'); return; }
  if (allExercises().some(e => e.name === name)) { toast('动作库中已存在同名动作', 'warn'); return; }
  data.customExercises.push({ id: uid('x'), name, muscleGroups: groups });
  save();
  if (fromPicker) {
    const card = addExerciseCard(name, groups, null);
    card.querySelector('.ex-name').focus();
    closePicker();
  } else {
    renderLibrary();
  }
  toast('已添加动作「' + name + '」');
}

/* ===== ⑥ 历史视图 ===== */
function renderHistory() {
  const q = state.historySearch.trim().toLowerCase();
  const list = $('history-list');
  const workouts = sortedWorkoutsDesc().filter(w => !q || w.exercises.some(ex => ex.name.toLowerCase().includes(q)));
  if (!workouts.length) {
    list.innerHTML = q
      ? `<div class="empty">没有匹配「${escapeHtml(state.historySearch)}」的训练</div>`
      : '<div class="empty">还没有训练记录<br>点下方「记录」开始第一次训练吧</div>';
    return;
  }
  let html = '';
  let lastYM = '';
  for (const w of workouts) {
    const ym = w.date.slice(0, 7);
    if (ym !== lastYM) {
      html += `<div class="month-sep">${monthLabel(w.date)}</div>`;
      lastYM = ym;
    }
    html += historyCardHtml(w);
  }
  list.innerHTML = html;
}

function historyCardHtml(w) {
  const totalSets = w.exercises.reduce((t, e) => t + e.sets.length, 0);
  const volume = w.exercises.reduce((t, e) => t + e.sets.reduce((s, x) => s + x.weight * x.reps, 0), 0);
  const groups = [...new Set(w.exercises.flatMap(e => e.muscleGroups))];
  const rows = w.exercises.map(ex => {
    let best = null, exVolume = 0, top = null, topReps = -1;
    for (const s of ex.sets) {
      const e1 = epley(s.weight, s.reps);
      if (best === null || e1 > best) best = e1;
      exVolume += s.weight * s.reps;
      if (top === null || s.weight > top || (s.weight === top && s.reps > topReps)) { top = s.weight; topReps = s.reps; }
    }
    const setRows = ex.sets.map((s, i) =>
      `<tr><td>${i + 1}</td><td class="num">${fmtNum(s.weight)}</td><td class="num">${s.reps}</td><td class="num">${s.rpe == null ? '–' : s.rpe}</td><td class="num">${fmtNum(epley(s.weight, s.reps))}</td></tr>`
    ).join('');
    return `
      <div class="hist-ex">
        <div class="hist-ex-head"><b>${escapeHtml(ex.name)}</b><span class="hist-ex-meta">${ex.sets.length} 组 · 容量 ${fmtNum(exVolume)} kg · 最重 ${fmtNum(top)} kg · 最佳1RM ${fmtNum(best)} kg</span></div>
        <div class="table-scroll"><table class="data-table">
          <thead><tr><th>组</th><th>重量 kg</th><th>次数</th><th>RPE</th><th>估算1RM</th></tr></thead>
          <tbody>${setRows}</tbody>
        </table></div>
      </div>`;
  }).join('');
  return `
    <div class="card hist-card" data-id="${w.id}">
      <button type="button" class="hist-head">
        <span class="hist-date"><b>${shortDate(w.date)}</b> ${weekday(w.date)}</span>
        <span class="hist-summary">${w.exercises.length} 个动作 · ${totalSets} 组 · 总容量 ${fmtNum(volume)} kg</span>
        <span class="hist-tags">${w.isDeload ? '<i class="tag deload">减载</i>' : ''}${groups.map(g => `<i class="tag">${escapeHtml(g)}</i>`).join('')}<i class="chev">▾</i></span>
      </button>
      <div class="hist-body" hidden>
        ${w.note ? `<div class="hist-note">备注：${escapeHtml(w.note)}</div>` : ''}
        ${rows}
        <div class="hist-actions">
          <button type="button" class="btn sm" data-act="edit">编辑</button>
          <button type="button" class="btn sm danger-outline" data-act="delete">删除</button>
        </div>
      </div>
    </div>`;
}

function startEditWorkout(id) {
  const w = data.workouts.find(x => x.id === id);
  if (!w) return;
  fillWorkout(w);
  switchTab('record');
}

function deleteWorkout(id) {
  const w = data.workouts.find(x => x.id === id);
  if (!w) return;
  if (!confirm(`确定删除 ${shortDate(w.date)} 的训练？此操作不可恢复。`)) return;
  data.workouts = data.workouts.filter(x => x.id !== id);
  save();
  renderHistory();
  toast('已删除');
}

/* ===== ⑦ 动作库视图 ===== */
function renderLibrary() {
  const box = $('library-body');
  let html = '';
  for (const g of MUSCLE_GROUPS) {
    const presets = PRESET_EXERCISES.filter(e => e.groups.includes(g));
    const customs = data.customExercises.filter(e => e.muscleGroups.includes(g));
    if (!presets.length && !customs.length) continue;
    html += `<div class="picker-label" style="margin-top:12px">${g}</div>`;
    for (const e of presets) {
      html += `<div class="lib-row"><span class="lib-name">${escapeHtml(e.name)}</span><span class="lib-groups">${e.groups.map(escapeHtml).join('·')}</span><i class="tag preset">预设</i></div>`;
    }
    for (const e of customs) {
      html += `<div class="lib-row" data-id="${e.id}">
        <span class="lib-name">${escapeHtml(e.name)}</span><span class="lib-groups">${e.muscleGroups.map(escapeHtml).join('·')}</span>
        <button type="button" class="btn sm ghost" data-act="edit">编辑</button>
        <button type="button" class="btn sm danger-outline" data-act="delete">删除</button>
      </div>`;
    }
  }
  box.innerHTML = html;
}

function startLibraryEdit(ex) {
  const row = document.querySelector(`#library-body .lib-row[data-id="${ex.id}"]`);
  if (!row) return;
  row.innerHTML = `
    <div class="lib-edit">
      <input type="text" class="lib-edit-name" value="${escapeHtml(ex.name)}" maxlength="30">
      <div class="lib-edit-groups"></div>
      <div class="lib-edit-actions">
        <button type="button" class="btn sm primary" data-save="1">保存</button>
        <button type="button" class="btn sm ghost" data-cancel="1">取消</button>
      </div>
    </div>`;
  renderChips(row.querySelector('.lib-edit-groups'), [...ex.muscleGroups]);
  row.querySelector('.lib-edit-name').focus();
}

function newLibraryForm() {
  const box = $('library-body');
  if (box.querySelector('.lib-new-form')) return;
  const form = document.createElement('div');
  form.className = 'card lib-new-form';
  form.innerHTML = `
    <h3>新建动作</h3>
    <input type="text" id="lib-new-name" placeholder="动作名称" maxlength="30">
    <div id="lib-new-groups"></div>
    <div class="btn-row">
      <button type="button" class="btn primary" id="lib-new-save">创建</button>
      <button type="button" class="btn ghost" id="lib-new-cancel">取消</button>
    </div>`;
  box.prepend(form);
  renderChips(form.querySelector('#lib-new-groups'), []);
  form.querySelector('#lib-new-name').focus();
  form.querySelector('#lib-new-save').addEventListener('click', () => {
    const name = form.querySelector('#lib-new-name').value.trim();
    const groups = [...form.querySelectorAll('.chip.on')].map(c => c.dataset.group);
    if (!name) { toast('请输入动作名称', 'warn'); return; }
    if (!groups.length) { toast('请选择至少一个肌群', 'warn'); return; }
    if (allExercises().some(e => e.name === name)) { toast('动作库中已存在同名动作', 'warn'); return; }
    data.customExercises.push({ id: uid('x'), name, muscleGroups: groups });
    save();
    renderLibrary();
    toast('已添加动作「' + name + '」');
  });
  form.querySelector('#lib-new-cancel').addEventListener('click', () => form.remove());
}

/* ===== ⑧ 分析 · 进步趋势 ===== */
function exerciseSessions(name) {
  const out = [];
  data.workouts
    .map((w, i) => ({ w, i }))
    .sort((a, b) => a.w.date.localeCompare(b.w.date) || a.i - b.i)
    .forEach(({ w }) => {
      for (const ex of w.exercises) {
        if (ex.name !== name) continue;
        let e1 = null, vol = 0, top = null, topReps = -1, topRpe = null;
        for (const s of ex.sets) {
          const e = epley(s.weight, s.reps);
          if (e1 === null || e > e1) e1 = e;
          vol += s.weight * s.reps;
          if (top === null || s.weight > top || (s.weight === top && s.reps > topReps)) { top = s.weight; topReps = s.reps; topRpe = s.rpe; }
        }
        out.push({ date: w.date, isDeload: !!w.isDeload, e1rm: e1, volume: vol, top, topReps, topRpe, sets: ex.sets.length });
      }
    });
  return out;
}

function compareVal(cur, base) {
  if (base === null || base === undefined) return null;
  if (base === 0) return cur > 0 ? { dir: 'up', pct: null } : { dir: 'flat', pct: null };
  const d = (cur - base) / base;
  if (Math.abs(d) < 0.01) return { dir: 'flat', pct: d };
  return { dir: d > 0 ? 'up' : 'down', pct: d };
}

function deltaText(c) {
  if (!c) return null;
  const arrow = c.dir === 'up' ? '↑ ' : c.dir === 'down' ? '↓ ' : '→ ';
  const pct = c.pct === null ? (c.dir === 'flat' ? '持平' : '新增') : fmtPct(c.pct);
  return arrow + pct;
}

function progressComment(sessions, latest, dirs) {
  if (sessions.length < 2) return '新动作或数据不足：再记录一次即可开始对比。';
  if (latest.isDeload) return '本次为减载周，指标下降属预期；恢复训练后再看进步。';
  const comparable = sessions.filter(s => !s.isDeload).length;
  if (comparable < 2) return '可对比的非减载训练不足 2 次，再记录一次即可开始对比。';
  const score = ['e1rm', 'volume', 'top'].reduce((s, k) => s + (dirs[k] === 'up' ? 1 : dirs[k] === 'down' ? -1 : 0), 0);
  if (score >= 2) return '三项指标整体上升，进步明显，保持当前计划。';
  if (score <= -2) return '多项指标下滑：检查睡眠与饮食；连续两周下滑建议安排一次减载。';
  return '整体持平：可尝试小幅增加重量或次数。';
}

function progressOverview() {
  const names = new Map();
  for (const w of sortedWorkoutsDesc()) {
    for (const ex of w.exercises) {
      if (!names.has(ex.name)) names.set(ex.name, w.date);
    }
  }
  return [...names.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([name]) => {
      const sessions = exerciseSessions(name);
      const latest = sessions[sessions.length - 1];
      let baseIdx = -1;
      for (let i = sessions.length - 2; i >= 0; i--) {
        if (!sessions[i].isDeload) { baseIdx = i; break; }
      }
      const base = baseIdx >= 0 ? sessions[baseIdx] : null;
      const dirs = {}, pcts = {};
      for (const m of METRICS) {
        const c = compareVal(latest[m.key], base ? base[m.key] : null);
        dirs[m.key] = c ? c.dir : null;
        pcts[m.key] = c ? c.pct : null;
      }
      let lt = null;
      const nonDeload = sessions.filter(s => !s.isDeload);
      if (nonDeload.length >= 4) {
        const mean = arr => arr.reduce((s, x) => s + x.e1rm, 0) / arr.length;
        lt = compareVal(mean(nonDeload.slice(-2)), mean(nonDeload.slice(-4, -2)));
      }
      const pr = {};
      for (const m of METRICS) pr[m.key] = { v: -Infinity, date: null };
      for (const s of sessions) {
        for (const m of METRICS) {
          if (s[m.key] > pr[m.key].v) pr[m.key] = { v: s[m.key], date: s.date };
        }
      }
      const comment = progressComment(sessions, latest, dirs);
      return { name, latest, base, dirs, pcts, lt, pr, sessions, comment };
    });
}

function renderAnalysis(subName) {
  if (subName) state.subTab = subName;
  document.querySelectorAll('.sub-tab').forEach(b => b.classList.toggle('active', b.dataset.sub === state.subTab));
  const body = $('analysis-body');
  if (!data.workouts.length) {
    body.innerHTML = `<div class="empty">还没有训练记录<br>记录训练后，这里会显示进步趋势、增肌分析、下次训练目标与每周总结<br><button type="button" class="btn" id="go-record">去记录第一次训练</button></div>`;
    const btn = body.querySelector('#go-record');
    if (btn) btn.addEventListener('click', () => switchTab('record'));
    return;
  }
  if (state.subTab === 'progress') renderProgress(body);
  else if (state.subTab === 'hypertrophy') renderHypertrophy(body);
  else if (state.subTab === 'next') renderNextTarget(body);
  else if (state.subTab === 'weekly') renderWeeklySummary(body);
}

function renderProgress(body) {
  const rows = progressOverview();
  let html = `<div class="view-banner"><h2>📈 进步趋势</h2><p class="muted">每个动作的估算 1RM、总容量、最重一组，与上一次对比</p></div>
  <div class="card"><h3>各动作最近表现</h3><p class="muted">与上一次（非减载）训练对比 · 点击动作查看趋势图</p></div>`;
  for (const r of rows) {
    const metricsHtml = METRICS.map(m => {
      const dir = r.dirs[m.key];
      const pct = r.pcts[m.key];
      let dirPart = '';
      if (dir === 'up') dirPart = '<i class="arrow up">↑</i>';
      else if (dir === 'down') dirPart = '<i class="arrow down">↓</i>';
      else if (dir === 'flat') dirPart = '<i class="arrow flat">→</i>';
      const tail = dir
        ? (pct === null ? (dir === 'up' ? ' 新增' : '') : ' ' + fmtPct(pct))
        : ' <span class="muted">首次</span>';
      return `<span class="prog-metric">${m.label} ${m.fmt(r.latest[m.key])} ${dirPart}${tail}</span>`;
    }).join('');
    const lt = r.lt
      ? ` <span class="lt-chip ${r.lt.dir}">长期 ${r.lt.dir === 'up' ? '↑' : r.lt.dir === 'down' ? '↓' : '→'}</span>`
      : '';
    html += `<div class="card prog-row" data-name="${escapeHtml(r.name)}" tabindex="0" role="button">
      <div class="prog-head"><b>${escapeHtml(r.name)}</b><span class="muted">最近：${shortDate(r.latest.date)}</span></div>
      <div class="prog-metrics">${metricsHtml}</div>
      <div class="prog-comment">${escapeHtml(r.comment)}${lt}</div>
      <div class="prog-pr muted">历史最佳：1RM ${fmtKg(r.pr.e1rm.v)}（${shortDate(r.pr.e1rm.date)}）· 容量 ${fmtKg(r.pr.volume.v)} · 最重 ${fmtKg(r.pr.top.v)}</div>
    </div>`;
  }
  html += `<div class="card" id="prog-detail"></div>
    <details class="card details-card"><summary>口径说明</summary>
      <p>估算 1RM 使用 Epley 公式：重量 × (1 + 次数/30)。总容量 = Σ(重量 × 次数)。变化率与上一次非减载训练对比，±1% 以内视为持平。长期趋势取最近 2 次与再之前 2 次估算 1RM 均值的对比。减载周不参与对比基线，但会显示在趋势图中（空心点）。</p>
    </details>`;
  body.innerHTML = html;
  body.querySelectorAll('.prog-row').forEach(elRow => {
    const select = () => {
      state.selectedExercise = elRow.dataset.name;
      renderProgressDetail();
      elRow.scrollIntoView({ block: 'nearest' });
    };
    elRow.addEventListener('click', select);
    elRow.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
  });
  const names = rows.map(r => r.name);
  if (state.selectedExercise && !names.includes(state.selectedExercise)) state.selectedExercise = null;
  if (!state.selectedExercise) state.selectedExercise = names[0] || null;
  renderProgressDetail();
}

function renderProgressDetail() {
  const el = $('prog-detail');
  if (!el) return;
  const overview = progressOverview().find(r => r.name === state.selectedExercise);
  if (!overview) { el.innerHTML = ''; return; }
  const sessions = overview.sessions;
  const metric = METRICS.find(m => m.key === state.metric) || METRICS[0];
  let html = `<div class="prog-detail-head">
      <h3>${escapeHtml(overview.name)}</h3>
      <div class="metric-switch">` +
    METRICS.map(m =>
      `<button type="button" class="chip m-chip${m.key === state.metric ? ' on' : ''}" data-metric="${m.key}">${m.label}</button>`
    ).join('') + `</div>
    </div>
    <div class="pr-tiles">
      <div class="pr-tile"><span class="muted">历史最佳1RM</span><b>${fmtKg(overview.pr.e1rm.v)}</b><span class="muted">${shortDate(overview.pr.e1rm.date)}</span></div>
      <div class="pr-tile"><span class="muted">最大总容量</span><b>${fmtKg(overview.pr.volume.v)}</b><span class="muted">${shortDate(overview.pr.volume.date)}</span></div>
      <div class="pr-tile"><span class="muted">最重一组</span><b>${fmtKg(overview.pr.top.v)}</b><span class="muted">${shortDate(overview.pr.top.date)}</span></div>
    </div>
    <div class="chart-card">
      <div class="chart-title muted">${metric.label} 趋势（共 ${sessions.length} 次训练）</div>
      <div class="chart-wrap" id="line-chart"></div>
    </div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>日期</th><th>${metric.label}</th><th>较上次</th><th>组数</th></tr></thead>
      <tbody>` +
    sessions.slice(-8).map(s => {
      const idx = sessions.indexOf(s);
      let delta = '<span class="muted">–</span>';
      for (let j = idx - 1; j >= 0; j--) {
        if (!sessions[j].isDeload) {
          const c = compareVal(s[metric.key], sessions[j][metric.key]);
          if (c) delta = deltaText(c);
          break;
        }
      }
      return `<tr><td>${shortDate(s.date)}${s.isDeload ? ' <i class="tag deload">减载</i>' : ''}</td><td class="num">${metric.fmt(s[metric.key])}</td><td class="num">${delta}</td><td class="num">${s.sets}</td></tr>`;
    }).join('') + `</tbody></table></div>`;
  el.innerHTML = html;
  el.querySelectorAll('.m-chip').forEach(b => b.addEventListener('click', () => {
    state.metric = b.dataset.metric;
    renderProgressDetail();
  }));
  renderLineChart(el.querySelector('#line-chart'), sessions, metric);
}

function renderLineChart(container, sessions, metric) {
  if (sessions.length < 2) {
    container.innerHTML = `<div class="chart-nodata">当前值 ${metric.fmt(sessions[0][metric.key])} — 再记录一次即可开始画趋势图</div>`;
    return;
  }
  const W = 640, H = 300, padL = 56, padR = 24, padT = 20, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const values = sessions.map(s => s[metric.key]);
  let vMin = Math.min(...values), vMax = Math.max(...values);
  if (vMin === vMax) { vMin = vMin * 0.95 || 0; vMax = vMax * 1.05 || 1; }
  else { const pad = (vMax - vMin) * 0.12; vMin -= pad; vMax += pad; }
  const ticks = niceTicks(vMin, vMax, 4);
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const x = i => padL + i * plotW / (sessions.length - 1);
  const y = v => padT + plotH * (1 - (v - yMin) / (yMax - yMin || 1));
  const crossYear = sessions[0].date.slice(0, 4) !== sessions[sessions.length - 1].date.slice(0, 4);
  const labelStep = sessions.length > 8 ? 2 : 1;
  const labelIdx = new Set();
  for (let i = 0; i < sessions.length; i += labelStep) labelIdx.add(i);
  labelIdx.add(sessions.length - 1);

  let svg = `<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(metric.label)}趋势图">`;
  for (const t of ticks) {
    svg += `<line x1="${padL}" y1="${y(t).toFixed(1)}" x2="${W - padR}" y2="${y(t).toFixed(1)}" stroke="var(--grid)" stroke-width="1"/>`;
    svg += `<text x="${padL - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end" class="ax-text">${fmtNum(t)}</text>`;
  }
  for (const i of labelIdx) {
    const s = sessions[i];
    const lbl = (crossYear && i === 0) ? s.date : shortDate(s.date);
    svg += `<text x="${x(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="ax-text">${escapeHtml(lbl)}</text>`;
  }
  svg += `<line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="var(--axis)" stroke-width="1"/>`;
  const ptsStr = sessions.map((s, i) => `${x(i).toFixed(1)},${y(s[metric.key]).toFixed(1)}`).join(' ');
  svg += `<polygon points="${padL},${padT + plotH} ${ptsStr} ${x(sessions.length - 1).toFixed(1)},${padT + plotH}" fill="var(--series-1)" opacity="0.10"/>`;
  svg += `<polyline points="${ptsStr}" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  sessions.forEach((s, i) => {
    const cx = x(i).toFixed(1), cy = y(s[metric.key]).toFixed(1);
    svg += s.isDeload
      ? `<circle cx="${cx}" cy="${cy}" r="6" fill="var(--surface)"/><circle cx="${cx}" cy="${cy}" r="4.5" fill="none" stroke="var(--series-1)" stroke-width="2"/>`
      : `<circle cx="${cx}" cy="${cy}" r="6" fill="var(--surface)"/><circle cx="${cx}" cy="${cy}" r="4.5" fill="var(--series-1)"/>`;
  });
  const li = sessions.length - 1, ls = sessions[li];
  const lx = x(li), ly = y(ls[metric.key]);
  const anchor = lx > W - 96 ? 'end' : 'start';
  const ltx = lx > W - 96 ? lx - 10 : lx + 10;
  const lty = ly > 34 ? ly - 10 : ly + 18;
  svg += `<text x="${ltx.toFixed(1)}" y="${lty.toFixed(1)}" text-anchor="${anchor}" class="end-label">${metric.fmt(ls[metric.key])}</text>`;
  if (sessions.some(s => s.isDeload)) {
    svg += `<circle cx="${padL + 8}" cy="16" r="4.5" fill="none" stroke="var(--series-1)" stroke-width="2"/><text x="${padL + 16}" y="20" text-anchor="start" class="ax-text">减载周</text>`;
  }
  svg += `<line id="ch-line" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="var(--text-2)" stroke-width="1" opacity="0" pointer-events="none"/>`;
  svg += `</svg>`;
  container.innerHTML = svg;
  container.style.position = 'relative';
  const svgEl = container.querySelector('svg');
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.hidden = true;
  container.appendChild(tooltip);
  const chLine = container.querySelector('#ch-line');
  const deltas = sessions.map((s, i) => {
    for (let j = i - 1; j >= 0; j--) if (!sessions[j].isDeload) return compareVal(s[metric.key], sessions[j][metric.key]);
    return null;
  });
  function showTip(i) {
    const s = sessions[i];
    const parts = [shortDate(s.date), metric.fmt(s[metric.key])];
    if (s.isDeload) parts.push('减载周');
    if (deltas[i]) parts.push('较上次 ' + deltaText(deltas[i]));
    tooltip.textContent = parts.join(' · ');
    tooltip.hidden = false;
    const rect = container.getBoundingClientRect();
    const scale = rect.width / W;
    const px = clamp(x(i) * scale, 72, rect.width - 112);
    tooltip.style.left = px + 'px';
    tooltip.style.top = Math.max(0, y(s[metric.key]) * scale - 46) + 'px';
  }
  function hideTip() { tooltip.hidden = true; chLine.setAttribute('opacity', '0'); }
  const slotW = plotW / Math.max(sessions.length - 1, 1);
  const NS = 'http://www.w3.org/2000/svg';
  sessions.forEach((s, i) => {
    let rx = x(i) - slotW / 2, rw = slotW;
    if (i === 0) { rx = padL - 4; rw = slotW / 2 + 4; }
    if (i === sessions.length - 1) rw = slotW / 2 + 4;
    const rectEl = document.createElementNS(NS, 'rect');
    rectEl.setAttribute('x', rx.toFixed(1));
    rectEl.setAttribute('y', padT - 6);
    rectEl.setAttribute('width', rw.toFixed(1));
    rectEl.setAttribute('height', plotH + 12);
    rectEl.setAttribute('fill', 'transparent');
    rectEl.setAttribute('tabindex', '0');
    rectEl.setAttribute('aria-label', escapeHtml(s.date + ' ' + metric.fmt(s[metric.key])));
    const onEnter = () => {
      chLine.setAttribute('x1', x(i).toFixed(1));
      chLine.setAttribute('x2', x(i).toFixed(1));
      chLine.setAttribute('opacity', '0.6');
      showTip(i);
    };
    rectEl.addEventListener('pointermove', onEnter);
    rectEl.addEventListener('focus', onEnter);
    rectEl.addEventListener('blur', hideTip);
    svgEl.appendChild(rectEl);
  });
  svgEl.addEventListener('pointerleave', hideTip);
}

/* ===== ⑨ 分析 · 增肌 ===== */
// 各动作的历史最大重量（用于判断「有效组/硬组」：重量 ≥ 最大 30%）
function buildMaxWeights() {
  const m = {};
  for (const w of data.workouts) {
    for (const ex of w.exercises) {
      let mx = 0;
      for (const s of ex.sets) if (s.weight > mx) mx = s.weight;
      if (!(ex.name in m) || mx > m[ex.name]) m[ex.name] = mx;
    }
  }
  return m;
}

// 一个动作在某次训练里的有效组（硬组）；自重动作（历史最大为 0）全部计入
function hardSetsOf(ex, maxW) {
  const th = (maxW[ex.name] || 0) * 0.3;
  return ex.sets.filter(s => s.weight >= th);
}

// 某日期所在周的周一（作为周标识）
function weekMonday(s) {
  const d = parseDate(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateStr(d);
}

// 最近 n 周（含本周）的周一列表，从旧到新
function lastMondays(n) {
  const start = weekMonday(todayStr());
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(start, -7 * i));
  return out;
}

// 给定周列表，返回每组合计与各肌群的每周有效组数
function weeklyHardSets(weeks) {
  const maxW = buildMaxWeights();
  const total = weeks.map(() => 0);
  const byGroup = {};
  for (const g of MUSCLE_GROUPS) byGroup[g] = weeks.map(() => 0);
  for (const w of data.workouts) {
    const idx = weeks.indexOf(weekMonday(w.date));
    if (idx < 0) continue;
    for (const ex of w.exercises) {
      const hc = hardSetsOf(ex, maxW).length;
      total[idx] += hc;
      for (const g of ex.muscleGroups) byGroup[g][idx] += hc;
    }
  }
  return { total, byGroup };
}

function hypertrophyData() {
  const end = todayStr(), start = addDays(end, -6);
  const windowWorkouts = data.workouts.filter(w => w.date >= start && w.date <= end);
  const maxW = buildMaxWeights();
  const groups = {};
  for (const g of MUSCLE_GROUPS) {
    groups[g] = { name: g, sets: 0, days: new Set(), below: 0, above: 0, rpeSum: 0, rpeN: 0 };
  }
  for (const w of windowWorkouts) {
    for (const ex of w.exercises) {
      const hard = hardSetsOf(ex, maxW);
      for (const g of ex.muscleGroups) {
        const gg = groups[g];
        gg.sets += hard.length;
        gg.days.add(w.date);
        for (const s of hard) {
          if (s.reps < 5) gg.below++;
          else if (s.reps > 30) gg.above++;
          if (s.rpe != null) { gg.rpeSum += s.rpe; gg.rpeN++; }
        }
      }
    }
  }
  const list = MUSCLE_GROUPS.map(g => {
    const gg = groups[g];
    return {
      name: g, sets: gg.sets, days: gg.days.size,
      below: gg.below, above: gg.above,
      avgRpe: gg.rpeN ? gg.rpeSum / gg.rpeN : null, rpeN: gg.rpeN,
    };
  });
  return {
    start, end, list,
    totalSets: list.reduce((s, g) => s + g.sets, 0),
    trainedGroups: list.filter(g => g.sets > 0).length,
    onTarget: list.filter(g => g.sets >= 10 && g.sets <= 20).length,
  };
}

function setsStatus(sets) { return sets < 10 ? '不足' : sets <= 20 ? '适中' : '偏多'; }
function statusClass(st) { return st === '适中' ? 'st-good' : st === '不足' ? 'st-warn' : 'st-more'; }

function groupAdvice(g) {
  if (g.sets === 0) return '本周未训练该肌群：建议每周至少安排 1–2 次，保证每个肌群都有训练。';
  const parts = [];
  if (g.sets < 10) parts.push('周组数不足 10 组，建议逐步增加到 10 组以上');
  else if (g.sets <= 20) parts.push('组数在 10–20 组建议区间内，安排合理');
  else parts.push('组数超过 20 组：恢复良好可保持，长期疲劳建议减至 15 组左右');
  if (g.days < 2) parts.push('本周仅训练 1 次，建议拆分为每周至少 2 次');
  else if (g.days >= 4) parts.push('频率偏高（≥4 次/周），注意恢复与睡眠');
  if (g.avgRpe !== null && g.rpeN >= g.sets * 0.5) {
    if (g.avgRpe >= 8) parts.push('大部分组 RPE≥8，强度到位，接近力竭利于增肌');
    else if (g.avgRpe >= 6) parts.push('平均 RPE 在 6–7，建议适当加重、靠近力竭');
    else parts.push('平均 RPE 偏低（<6），负荷可能过轻，建议增加重量');
  }
  const out = g.below + g.above;
  if (out > 0) parts.push(`${out} 组次数在 5–30 有效区间外（低于 5 偏力量、高于 30 负荷偏轻）`);
  return parts.join('；') + '。';
}

function renderHypertrophy(body) {
  const h = hypertrophyData();
  const maxSets = Math.max(25, ...h.list.map(g => g.sets), 20);
  const bandL = 10 / maxSets * 100, bandW = 10 / maxSets * 100;
  let html = `<div class="view-banner"><h2>💪 增肌分析</h2><p class="muted">最近 7 天各肌群有效组数、训练频率、次数区间与 RPE 强度</p></div>
  <div class="card hero-card">
    <div class="hero-num">${h.totalSets}</div>
    <div class="muted">本周（${shortDate(h.start)} – ${shortDate(h.end)}）有效总组数</div>
    <div class="hero-sub">覆盖 ${h.trainedGroups} 个肌群 · ${h.onTarget} 个肌群达到 10–20 组建议区间</div>
  </div>
  <div class="card">
    <h3>各肌群本周组数</h3>
    <p class="muted">蓝色条 = 本周有效组数 · 浅蓝区域 = 建议区间 10–20 组</p>
    <div class="hbar-chart">` +
    h.list.map(g => {
      const st = setsStatus(g.sets);
      const pct = Math.min(100, g.sets / maxSets * 100);
      let fill = '';
      if (g.sets > 0) {
        const valStyle = pct > 78
          ? `style="left:${(pct - 3).toFixed(1)}%;transform:translate(-100%,-50%);color:#fff"`
          : `style="left:${(pct + 1.5).toFixed(1)}%"`;
        fill = `<div class="hbar-fill" style="width:${pct.toFixed(1)}%"></div><span class="hbar-val" ${valStyle}>${g.sets}</span>`;
      } else {
        fill = '<span class="hbar-val zero">0</span>';
      }
      return `<div class="hbar-row" tabindex="0" data-i="${h.list.indexOf(g)}">
        <span class="hbar-label">${g.name}</span>
        <div class="hbar-track">
          <div class="hbar-band" style="left:${bandL.toFixed(1)}%;width:${bandW.toFixed(1)}%"><span class="band-tick">10</span><span class="band-tick right">20</span></div>
          ${fill}
        </div>
        <span class="st-chip ${statusClass(st)}"><i></i>${st}</span>
      </div>`;
    }).join('') +
    `</div></div>
    <div id="vol-trend"></div>` +
    h.list.map(g => {
      const st = setsStatus(g.sets);
      const distText = g.sets > 0
        ? `${g.sets - g.below - g.above} 组在 5–30 次区间${g.below ? ' · ' + g.below + ' 组低于 5 次' : ''}${g.above ? ' · ' + g.above + ' 组高于 30 次' : ''}`
        : '';
      const rpeText = g.avgRpe !== null && g.rpeN >= g.sets * 0.5 ? ' · 平均 RPE ' + fmtNum(g.avgRpe) : '';
      return `<div class="card group-card">
        <div class="group-head"><b>${g.name}</b><span class="st-chip ${statusClass(st)}"><i></i>${st}</span></div>
        <div class="group-stats muted">本周 ${g.sets} 组 · 训练 ${g.days} 天${distText ? ' · ' + distText : ''}${rpeText}</div>
        <div class="group-advice">${escapeHtml(groupAdvice(g))}</div>
      </div>`;
    }).join('') +
    `<details class="card details-card"><summary>口径说明</summary>
      <p>统计窗口为最近 7 天。有效组（硬组）定义：该组重量 ≥ 该动作全部历史中最大重量的 30%；更轻的组视为热身，不计入周容量。自重动作（从未负重）的所有组都计入。复合动作的组数全额计入其每个肌群。建议区间参考常见研究共识（每肌群每周约 10–20 组）。RPE 只用于强度评估，不参与组数过滤。</p>
    </details>`;
  body.innerHTML = html;
  renderVolumeTrend();
  const chart = body.querySelector('.hbar-chart');
  const tip = document.createElement('div');
  tip.className = 'chart-tooltip hbar-tip';
  tip.hidden = true;
  chart.appendChild(tip);
  chart.querySelectorAll('.hbar-row').forEach(rowEl => {
    const g = h.list[Number(rowEl.dataset.i)];
    const show = () => {
      const parts = [`${g.name}：本周 ${g.sets} 组 · 训练 ${g.days} 天`];
      if (g.sets > 0) {
        parts.push(`${g.sets - g.below - g.above} 组在 5–30 次区间`);
        if (g.below) parts.push(`${g.below} 组低于 5 次`);
        if (g.above) parts.push(`${g.above} 组高于 30 次`);
        if (g.avgRpe !== null) parts.push('平均 RPE ' + fmtNum(g.avgRpe));
      }
      tip.textContent = parts.join(' · ');
      tip.hidden = false;
      tip.style.left = Math.min(chart.clientWidth * 0.45, 220) + 'px';
      tip.style.top = Math.max(0, rowEl.offsetTop - 36) + 'px';
    };
    rowEl.addEventListener('pointerenter', show);
    rowEl.addEventListener('focus', show);
    rowEl.addEventListener('pointerleave', () => { tip.hidden = true; });
    rowEl.addEventListener('blur', () => { tip.hidden = true; });
  });
  if (h.totalSets === 0) {
    body.insertAdjacentHTML('afterbegin', '<div class="card"><p class="muted">最近 7 天没有训练记录 — 先去「记录」页开始训练，这里会显示增肌分析。</p></div>');
  }
}

// 周容量趋势（近 8 周）—— 增肌分析内的一个区块，可切换肌群
function renderVolumeTrend() {
  const el = $('vol-trend');
  if (!el) return;
  const weeks = lastMondays(8);
  const { total, byGroup } = weeklyHardSets(weeks);
  const sel = state.volGroup === '全身' ? null : state.volGroup;
  const vals = sel ? byGroup[sel] : total;
  const showBand = !!sel;
  const maxV = Math.max(20, ...vals);
  const px = v => Math.round(v / maxV * 108);
  const chips = ['全身', ...MUSCLE_GROUPS].map(g =>
    `<button type="button" class="chip${state.volGroup === g ? ' on' : ''}" data-volgroup="${g}">${g}</button>`
  ).join('');
  const cols = weeks.map((w, i) => {
    const v = vals[i];
    const stCls = sel ? ' vbar-' + statusClass(setsStatus(v)).slice(3) : '';
    const val = v > 0 ? `<span class="vbar-val">${v}</span>` : '';
    return `<div class="vbar-col"><div class="vbar-bar${stCls}" style="height:${v > 0 ? Math.max(2, px(v)) : 0}px">${val}</div></div>`;
  }).join('');
  const labels = weeks.map(w => `<span class="vbar-label">${shortDate(w)}</span>`).join('');
  const band = showBand ? `<div class="vbar-band" style="bottom:${px(10)}px;height:${px(20) - px(10)}px"></div>` : '';
  el.innerHTML = `<div class="card">
    <h3>周容量趋势（近 8 周）</h3>
    <p class="muted">${sel ? escapeHtml(sel) + ' 每周有效组数 · 浅蓝区为建议区间 10–20 组' : '全部肌群合计的每周有效组数'}</p>
    <div class="vol-chips">${chips}</div>
    <div class="vchart"><div class="vchart-bars">${band}<div class="vbar-row">${cols}</div></div><div class="vbar-labels">${labels}</div></div>
  </div>`;
  el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    state.volGroup = c.dataset.volgroup;
    renderVolumeTrend();
  }));
}

/* ===== ⑨.5 分析 · 下次训练目标 ===== */
function repCapFor(sessions) {
  const reps = sessions.slice(-6).map(s => s.topReps).filter(r => r > 0);
  if (!reps.length) return 12;
  const med = median(reps);
  if (med <= 6) return 6;
  if (med <= 8) return 8;
  if (med <= 10) return 10;
  return 12;
}

function nextIncrement(w) { return w >= 15 ? 2.5 : 1.25; }

function nextWeight(w) {
  const step = nextIncrement(w);
  const nw = Math.round(w * 1.025 / step) * step;
  return nw > w ? Math.round(nw * 10) / 10 : w + step;
}

function nextTargetFor(name) {
  const sessions = exerciseSessions(name).filter(s => !s.isDeload);
  if (!sessions.length) return null;
  const last = sessions[sessions.length - 1];
  const prev = sessions.length >= 2 ? sessions[sessions.length - 2] : null;
  const w = last.top, r = last.topReps, rpe = last.topRpe;
  if (w == null || r == null) return null;
  const cap = repCapFor(sessions);
  let tag = '加次数', goal = '';
  const regress = prev && prev.e1rm > 0 && last.e1rm < prev.e1rm * 0.95;
  if (regress) {
    tag = '恢复';
    goal = `上次 ${fmtNum(w)} kg × ${r} 次较前次下滑，先回到 ${fmtNum(prev.top)} kg 并保证动作质量与恢复`;
  } else if (r >= cap) {
    tag = '加重';
    const nw = nextWeight(w);
    goal = `上次 ${fmtNum(w)} kg × ${r} 次已达上限 ${cap} 次，下次尝试 ${fmtKg(nw)}，目标 ${Math.max(5, cap - 4)}–${cap} 次`;
  } else {
    tag = '加次数';
    goal = `保持 ${fmtNum(w)} kg，下次目标 ${Math.min(r + 1, cap)} 次（比上次多 1 次）`;
  }
  let rpeNote = '';
  if (rpe !== null && tag !== '恢复') {
    if (rpe >= 9) rpeNote = ' · 上次接近力竭（RPE ' + rpe + '），可先维持重量、保守进阶';
    else if (rpe <= 6) rpeNote = ' · 上次 RPE ' + rpe + ' 偏低，还有余力，可放心进阶';
  }
  return { name, lastDate: last.date, w, r, rpe, e1rm: last.e1rm, cap, tag, goal: goal + rpeNote };
}

function renderNextTarget(body) {
  const names = new Map();
  for (const w of sortedWorkoutsDesc()) for (const ex of w.exercises) if (!names.has(ex.name)) names.set(ex.name, w.date);
  const rows = [...names.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([name]) => nextTargetFor(name)).filter(Boolean);
  if (!rows.length) {
    body.innerHTML = `<div class="empty">暂无足够数据<br>记录 1–2 次训练后，这里会给出每个动作的下次目标</div>`;
    return;
  }
  const nAdd = rows.filter(r => r.tag === '加重').length;
  const nRep = rows.filter(r => r.tag === '加次数').length;
  const nRec = rows.filter(r => r.tag === '恢复').length;
  let html = `<div class="view-banner"><h2>🎯 下次训练目标</h2><p class="muted">基于渐进超负荷（双进阶法）为每个动作给出下次的建议重量与次数</p></div>
    <div class="card hero-card"><div class="hero-sub">${rows.length} 个动作 · ${nAdd} 个建议加重 · ${nRep} 个建议加次数${nRec ? ' · ' + nRec + ' 个建议恢复' : ''}</div></div>`;
  for (const r of rows) {
    const tagCls = r.tag === '加重' ? 'up' : r.tag === '恢复' ? 'down' : 'flat';
    html += `<div class="card target-card">
      <div class="target-head"><b>${escapeHtml(r.name)}</b><span class="muted">上次 ${shortDate(r.lastDate)}</span><span class="lt-chip ${tagCls}">${r.tag}</span></div>
      <div class="target-meta muted">${fmtNum(r.w)} kg × ${r.r} 次${r.rpe != null ? ' · RPE ' + r.rpe : ''} · 估算1RM ${fmtNum(r.e1rm)} kg · 进阶上限 ${r.cap} 次</div>
      <div class="target-goal">${escapeHtml(r.goal)}</div>
    </div>`;
  }
  html += `<details class="card details-card"><summary>口径说明</summary><p>建议基于「双进阶法」：动作最近一组达到该动作的进阶次数上限时建议加重，否则建议同重量多做 1 次。次数上限由该动作近几次的常规次数推断（6 / 8 / 10 / 12）。加重幅度约为上次重量 +2.5%，四舍五入到最小可用增量（≥15kg 按 2.5kg、更轻按 1.25kg）。若上次估算 1RM 较前次下滑超过 5% 则优先建议恢复。RPE 仅作强度参考。</p></details>`;
  body.innerHTML = html;
}

/* ===== ⑨.6 分析 · 周总结 ===== */
function prsInWindow(start, end) {
  const before = {}, inWin = {};
  for (const w of data.workouts) {
    for (const ex of w.exercises) {
      let e1 = null, vol = 0, top = null, topReps = -1;
      for (const s of ex.sets) {
        const e = epley(s.weight, s.reps);
        if (e1 === null || e > e1) e1 = e;
        vol += s.weight * s.reps;
        if (top === null || s.weight > top || (s.weight === top && s.reps > topReps)) { top = s.weight; topReps = s.reps; }
      }
      const bucket = (w.date >= start && w.date <= end) ? inWin : before;
      if (!bucket[ex.name]) bucket[ex.name] = { e1rm: -Infinity, volume: -Infinity, top: -Infinity };
      const b = bucket[ex.name];
      if (e1 > b.e1rm) { b.e1rm = e1; b.e1rmDate = w.date; }
      if (vol > b.volume) { b.volume = vol; b.volumeDate = w.date; }
      if (top > b.top) { b.top = top; b.topDate = w.date; }
    }
  }
  const out = [];
  for (const name in inWin) {
    const prior = before[name];
    if (!prior) continue;
    const iw = inWin[name];
    if (iw.e1rm > prior.e1rm) out.push({ name, metric: 'e1rm', old: prior.e1rm, val: iw.e1rm, date: iw.e1rmDate });
    if (iw.volume > prior.volume) out.push({ name, metric: 'volume', old: prior.volume, val: iw.volume, date: iw.volumeDate });
    if (iw.top > prior.top) out.push({ name, metric: 'top', old: prior.top, val: iw.top, date: iw.topDate });
  }
  return out;
}

function renderWeeklySummary(body) {
  const end = todayStr(), start = addDays(end, -6);
  const windowWorkouts = data.workouts.filter(w => w.date >= start && w.date <= end);
  const maxW = buildMaxWeights();
  let totalSets = 0, totalVolume = 0;
  const days = new Set();
  const groupSets = {}, groupDays = {};
  for (const g of MUSCLE_GROUPS) { groupSets[g] = 0; groupDays[g] = new Set(); }
  for (const w of windowWorkouts) {
    days.add(w.date);
    for (const ex of w.exercises) {
      const hc = hardSetsOf(ex, maxW).length;
      totalSets += hc;
      for (const s of ex.sets) totalVolume += s.weight * s.reps;
      for (const g of ex.muscleGroups) { groupSets[g] += hc; groupDays[g].add(w.date); }
    }
  }
  const trainedGroups = MUSCLE_GROUPS.filter(g => groupSets[g] > 0);
  const prevWorkouts = data.workouts.filter(w => w.date >= addDays(start, -28) && w.date < start);
  const prevDays = new Set(prevWorkouts.map(w => w.date)).size;
  const avgPrev = prevDays / 4;
  let trendText = '（近 4 周无记录，暂无法对比）';
  if (prevDays > 0) {
    const cmp = days.size > avgPrev ? '高于' : days.size < avgPrev ? '低于' : '持平';
    trendText = `${cmp} 近 4 周平均 ${fmtNum(avgPrev)} 天/周`;
  }
  let html = `<div class="view-banner"><h2>📅 周总结</h2><p class="muted">近 7 天（${shortDate(start)} – ${shortDate(end)}）的训练量与进步</p></div>
    <div class="card hero-card">
      <div class="hero-num">${days.size}<span style="font-size:20px;color:var(--text-2)"> 天</span></div>
      <div class="muted">本周训练天数 · ${trendText}</div>
      <div class="hero-sub">${totalSets} 有效组 · 总容量 ${fmtNum(totalVolume)} kg · 覆盖 ${trainedGroups.length} 个肌群</div>
    </div>`;
  if (!windowWorkouts.length) {
    html += `<div class="card"><p class="muted">最近 7 天没有训练记录 — 先去「记录」页开始训练。</p></div>`;
    body.innerHTML = html;
    return;
  }
  html += `<div class="card"><h3>各肌群训练频率</h3><p class="muted">本周有效组数与训练天数</p>` +
    MUSCLE_GROUPS.map(g => `<div class="sum-group${groupSets[g] === 0 ? ' zero' : ''}"><span class="sg-name">${g}</span><span class="sg-stat">${groupSets[g] === 0 ? '未训练' : groupSets[g] + ' 组 · ' + groupDays[g].size + ' 天'}</span></div>`).join('') +
    `</div>`;
  const prs = prsInWindow(start, end);
  html += `<div class="card"><h3>本周破纪录</h3>` +
    (prs.length
      ? prs.map(p => {
          const m = METRICS.find(x => x.key === p.metric) || METRICS[0];
          return `<div class="pr-line"><span class="pr-ico">🏆</span><span><b>${escapeHtml(p.name)}</b> ${m.label} ${m.fmt(p.val)}</span><span class="muted">原最佳 ${m.fmt(p.old)}</span></div>`;
        }).join('')
      : '<p class="muted">本周暂无新纪录 — 继续加重量或次数吧</p>') +
    `</div>`;
  const missing = MUSCLE_GROUPS.filter(g => groupSets[g] === 0);
  if (missing.length) html += `<div class="card"><h3>本周未训练肌群</h3><p class="muted">${missing.join('、')} — 若长期缺失，建议下周加入对应动作以保持均衡</p></div>`;
  html += `<details class="card details-card"><summary>口径说明</summary><p>统计窗口为最近 7 天。有效组（硬组）定义与增肌分析一致：重量 ≥ 该动作历史最大重量的 30%。破纪录指本周该动作的估算 1RM、单次总容量或最重一组超过此前（本周以前）的历史最佳。训练天数一致性对比近 4 周（本周之前的 28 天）的周均训练天数。</p></details>`;
  body.innerHTML = html;
}

/* ===== ⑩ 设置 ===== */
function renderSettings() {
  const box = $('import-preview');
  if (box && !state.pendingImport) box.innerHTML = '';
  const st = $('storage-status');
  if (st) st.textContent = storageOK ? '浏览器存储正常' : '⚠️ 存储不可用';
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '训练记录备份-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('备份已导出');
}

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let obj;
    try { obj = JSON.parse(reader.result); } catch (e) {
      toast('文件不是有效的 JSON，导入失败', 'warn');
      return;
    }
    if (!obj || typeof obj !== 'object') { toast('文件内容格式不正确', 'warn'); return; }
    const cleaned = sanitizeData(obj);
    const newer = isFinite(obj.version) && obj.version > CURRENT_VERSION;
    const existingIds = new Set(data.workouts.map(w => w.id));
    const added = cleaned.workouts.filter(w => !existingIds.has(w.id));
    const skipped = cleaned.workouts.length - added.length;
    const newCustom = cleaned.customExercises.filter(x => !allExercises().some(e => e.name === x.name));
    state.pendingImport = { cleaned, added, skipped, newCustom, newer };
    const box = $('import-preview');
    box.innerHTML = `
      <div class="card import-preview" style="margin-top:12px">
        <h3>导入预览</h3>
        <p>文件包含 ${cleaned.workouts.length} 条训练记录，其中 <b>${added.length}</b> 条新记录、${skipped} 条与现有重复（将跳过），${newCustom.length} 个新动作。</p>
        ${newer ? '<p class="warn-text">⚠️ 文件来自更新版本的软件，已尽力导入兼容字段。</p>' : ''}
        <div class="btn-row">
          <button type="button" class="btn primary" id="import-merge">合并导入（推荐）</button>
          <button type="button" class="btn danger-outline" id="import-overwrite">覆盖当前数据</button>
          <button type="button" class="btn ghost" id="import-cancel">取消</button>
        </div>
      </div>`;
    box.querySelector('#import-merge').addEventListener('click', doMergeImport);
    box.querySelector('#import-overwrite').addEventListener('click', doOverwriteImport);
    box.querySelector('#import-cancel').addEventListener('click', () => {
      state.pendingImport = null;
      box.innerHTML = '';
    });
  };
  reader.readAsText(file, 'utf-8');
}

function doMergeImport() {
  const p = state.pendingImport;
  if (!p) return;
  for (const w of p.added) data.workouts.push(w);
  for (const x of p.newCustom) data.customExercises.push(x);
  save();
  state.pendingImport = null;
  renderSettings();
  toast(`合并完成：新增 ${p.added.length} 条训练（跳过 ${p.skipped} 条重复）`);
}

function doOverwriteImport() {
  const p = state.pendingImport;
  if (!p) return;
  if (!confirm('覆盖后当前数据将被替换。覆盖前会自动下载当前数据备份，确定继续？')) return;
  exportBackup();
  data = p.cleaned;
  save();
  state.pendingImport = null;
  renderSettings();
  toast('已用导入数据覆盖当前数据');
}

/* ===== ⑪ 初始化 ===== */
function init() {
  data = loadData();

  // 导航
  document.querySelectorAll('#tabbar .tab').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });
  document.querySelectorAll('.sub-tab').forEach(b => {
    b.addEventListener('click', () => renderAnalysis(b.dataset.sub));
  });

  // 记录视图
  $('btn-add-ex').addEventListener('click', openPicker);
  $('btn-save').addEventListener('click', saveWorkout);
  $('btn-copy-last').addEventListener('click', copyLastWorkout);
  $('btn-cancel-edit').addEventListener('click', () => {
    resetRecordForm();
    toast('已取消编辑');
  });
  $('record-view').addEventListener('input', () => {
    const err = $('rec-error');
    if (!err.hidden) err.hidden = true;
  });

  const exList = $('ex-list');
  exList.addEventListener('click', e => {
    const card = e.target.closest('.ex-card');
    if (!card) return;
    if (e.target.closest('.ex-del')) {
      card.remove();
      updateRecordEmptyState();
    } else if (e.target.closest('.set-del')) {
      const row = e.target.closest('.set-row');
      if (card.querySelectorAll('.set-row').length > 1) {
        row.remove();
        renumberSets(card);
        updateSubtotal(card);
      } else {
        row.querySelector('.set-weight').value = '';
        row.querySelector('.set-reps').value = '';
        row.querySelector('.set-rpe').value = '';
        updateSubtotal(card);
      }
    } else if (e.target.closest('.add-set')) {
      const row = addSetRow(card);
      row.querySelector('.set-weight').focus();
      updateSubtotal(card);
    } else if (e.target.classList.contains('chip')) {
      e.target.classList.toggle('on');
    }
  });
  exList.addEventListener('input', e => {
    const card = e.target.closest('.ex-card');
    if (!card) return;
    if (['set-weight', 'set-reps', 'set-rpe'].includes(e.target.className)) {
      updateSubtotal(card);
    }
  });
  exList.addEventListener('keydown', e => {
    const card = e.target.closest('.ex-card');
    if (!card || e.key !== 'Enter') return;
    if (e.target.classList.contains('set-weight')) {
      e.preventDefault();
      e.target.closest('.set-row').querySelector('.set-reps').focus();
    } else if (e.target.classList.contains('set-reps')) {
      e.preventDefault();
      const row = e.target.closest('.set-row');
      const rows = card.querySelectorAll('.set-row');
      if (row === rows[rows.length - 1]) {
        const nr = addSetRow(card);
        nr.querySelector('.set-weight').focus();
        updateSubtotal(card);
      } else {
        row.nextElementSibling.querySelector('.set-weight').focus();
      }
    }
  });

  // 动作选择器
  const pickerModal = $('picker-modal');
  pickerModal.addEventListener('click', e => {
    if (e.target.closest('#picker-close') || e.target === pickerModal) { closePicker(); return; }
    const item = e.target.closest('.picker-item');
    if (item) {
      const name = item.dataset.name;
      if ([...exList.querySelectorAll('.ex-name')].some(i => i.value.trim() === name)) {
        toast('该动作已在本次训练中');
        return;
      }
      const entry = allExercises().find(e => e.name === name);
      const card = addExerciseCard(name, entry ? entry.groups : ['其他'], null);
      card.querySelector('.ex-name').focus();
      closePicker();
      return;
    }
    const t = e.target.closest('#btn-toggle-new');
    if (t) {
      const box = $('picker-new');
      box.hidden = !box.hidden;
      t.textContent = box.hidden ? '＋ 新建自定义动作' : '收起';
      if (!box.hidden) {
        $('new-ex-name').value = '';
        renderChips($('new-ex-groups'), []);
        $('new-ex-name').focus();
      }
      return;
    }
    if (e.target.closest('#new-ex-confirm')) createCustomExercise(true);
  });
  $('picker-search').addEventListener('input', renderPicker);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !pickerModal.hidden) closePicker();
  });

  // 历史
  const histSearch = $('hist-search');
  histSearch.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => {
      state.historySearch = histSearch.value;
      renderHistory();
    }, 200);
  });
  $('history-list').addEventListener('click', e => {
    const card = e.target.closest('.hist-card');
    if (!card) return;
    const act = e.target.closest('[data-act]');
    if (act) {
      if (act.dataset.act === 'edit') startEditWorkout(card.dataset.id);
      else if (act.dataset.act === 'delete') deleteWorkout(card.dataset.id);
      return;
    }
    if (e.target.closest('.hist-head')) {
      const body = card.querySelector('.hist-body');
      body.hidden = !body.hidden;
      card.querySelector('.chev').textContent = body.hidden ? '▾' : '▴';
    }
  });

  // 动作库
  $('btn-new-ex').addEventListener('click', newLibraryForm);
  $('library-body').addEventListener('click', e => {
    const saveBtn = e.target.closest('[data-save]');
    if (saveBtn) {
      const row = saveBtn.closest('.lib-row');
      const ex = data.customExercises.find(x => x.id === row.dataset.id);
      if (!ex) return;
      const newName = row.querySelector('.lib-edit-name').value.trim();
      const newGroups = [...row.querySelectorAll('.chip.on')].map(c => c.dataset.group);
      if (!newName) { toast('名称不能为空', 'warn'); return; }
      if (!newGroups.length) { toast('请选择至少一个肌群', 'warn'); return; }
      if (ex.name !== newName && allExercises().some(x => x.name === newName)) { toast('已存在同名动作', 'warn'); return; }
      if (ex.name !== newName && !confirm(`改名后，新训练将按「${newName}」统计；历史记录保留旧名字「${ex.name}」（可在历史中逐条修改）。确定改名？`)) return;
      ex.name = newName;
      ex.muscleGroups = newGroups;
      save();
      renderLibrary();
      toast('已保存');
      return;
    }
    if (e.target.closest('[data-cancel]')) { renderLibrary(); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const row = act.closest('.lib-row');
    const ex = data.customExercises.find(x => x.id === row.dataset.id);
    if (!ex) return;
    if (act.dataset.act === 'delete') {
      if (!confirm(`确定从动作库删除「${ex.name}」？历史训练记录不受影响。`)) return;
      data.customExercises = data.customExercises.filter(x => x.id !== ex.id);
      save();
      renderLibrary();
      toast('已删除');
    } else if (act.dataset.act === 'edit') {
      startLibraryEdit(ex);
    }
  });

  // 设置
  $('btn-export').addEventListener('click', exportBackup);
  $('btn-import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) handleImportFile(f);
    e.target.value = '';
  });
  $('btn-clear').addEventListener('click', () => {
    if (!confirm('确定清空所有训练数据？此操作不可恢复，建议先导出备份。')) return;
    if (!confirm('再次确认：真的要清空所有数据吗？')) return;
    data = freshData();
    save();
    resetRecordForm();
    toast('已清空所有数据');
  });

  resetRecordForm();
  renderHistory();
}

init();
