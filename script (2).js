'use strict';
/* =========================================================
   Edzésnapló 2.0
   Az adatok a régi verzióval azonos localStorage kulcsokban
   vannak (workouts, bodyRecords, customTemplates,
   customExercises), így a korábbi bejegyzéseid megmaradnak.
   ========================================================= */

/* ---------- Segédfüggvények ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
            if (v == null || v === false) continue;
            if (k === 'class') el.className = v;
            else if (k === 'style') el.style.cssText = v;
            else if (k === 'html') el.innerHTML = v;
            else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
            else el.setAttribute(k, v === true ? '' : v);
        }
    }
    for (const kid of kids.flat()) {
        if (kid == null || kid === false) continue;
        el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
}
const icon = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const pad = n => String(n).padStart(2, '0');
const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = d => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const dtf = o => new Intl.DateTimeFormat('hu-HU', o);
const F = {
    long: dtf({ weekday: 'long', month: 'long', day: 'numeric' }),
    longY: dtf({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    short: dtf({ month: 'short', day: 'numeric' }),
    shortY: dtf({ year: 'numeric', month: 'short', day: 'numeric' }),
    month: dtf({ year: 'numeric', month: 'long' })
};
function prettyDate(iso) {
    const today = isoDate();
    if (iso === today) return 'Ma';
    if (iso === isoDate(addDays(new Date(), -1))) return 'Tegnap';
    const d = parseISO(iso);
    return cap((d.getFullYear() === new Date().getFullYear() ? F.long : F.longY).format(d));
}
function shortDate(iso) {
    const d = parseISO(iso);
    return (d.getFullYear() === new Date().getFullYear() ? F.short : F.shortY).format(d);
}
function daysAgoText(iso) {
    const diff = Math.round((parseISO(isoDate()) - parseISO(iso)) / 86400000);
    if (diff <= 0) return 'ma';
    if (diff === 1) return 'tegnap';
    return `${diff} napja`;
}

const nf = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 });
const fmt = n => nf.format(Math.round(n * 10) / 10);
const num = v => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};
const raw = n => String(Math.round(n * 10) / 10);
const exKey = s => String(s || '').trim().toLowerCase();
const mmss = ms => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    return hh ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
};
const fmtDur = sec => sec < 60 ? `${sec} mp` : `${Math.floor(sec / 60)}:${pad(sec % 60)}`;

let lastId = 0;
const uid = () => (lastId = Math.max(lastId + 1, Date.now()));

const MUSCLES = ['Mell', 'Bicepsz', 'Hát', 'Tricepsz', 'Váll', 'Láb', 'Popsi', 'Has', 'Kardió'];
const MKEY = { Mell: 'mell', Bicepsz: 'bicepsz', 'Hát': 'hat', Tricepsz: 'tricepsz', 'Váll': 'vall', 'Láb': 'lab', Popsi: 'popsi', Has: 'has', 'Kardió': 'kardio' };
const mcls = m => 'm-' + (MKEY[m] || 'egyeb');

/* ---------- Tárolás ---------- */
const LS = {
    get(key, fallback) {
        try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
        catch (e) { return fallback; }
    },
    set(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); return true; }
        catch (e) { toast('Nem sikerült menteni. Lehet, hogy tele van a tárhely.'); return false; }
    }
};

const defaultExercises = {
    'Mell': ['Fekvenyomás', 'Incline Fekvenyomás', 'Tárogatás'],
    'Bicepsz': ['Bicepsz állva franciarúddal', 'Kalapács hajlítás'],
    'Hát': ['Mellhez húzás csigán', 'Evezés döntött törzzsel', 'Húzódzkodás'],
    'Tricepsz': ['Tricepsz letolás csigán', 'Lónyomás'],
    'Váll': ['Vállból nyomás kézisúlyzóval', 'Oldalemelés'],
    'Láb': ['Guggolás', 'Lábnyomás', 'Lábhajlítás gépen'],
    'Popsi': ['Csípőemelés (Hip Thrust)', 'Bolgár guggolás', 'Glute Bridge (Híd)', 'Kickback csigán', 'Román felhúzás'],
    'Has': ['Hasprés', 'Lábelemelés függeszkedve'],
    'Kardió': ['Futópad (Incline walking)', 'Lépcsőzőgép', 'Szobakerékpár']
};
const defaultTemplates = [
    { name: 'A nap: Mell - Tricepsz', muscleGroups: ['Mell', 'Tricepsz'], exercises: [
        { name: 'Fekvenyomás', muscleGroup: 'Mell' }, { name: 'Incline Fekvenyomás', muscleGroup: 'Mell' },
        { name: 'Tárogatás', muscleGroup: 'Mell' }, { name: 'Tricepsz letolás csigán', muscleGroup: 'Tricepsz' }] },
    { name: 'B nap: Hát - Bicepsz', muscleGroups: ['Hát', 'Bicepsz'], exercises: [
        { name: 'Húzódzkodás', muscleGroup: 'Hát' }, { name: 'Mellhez húzás csigán', muscleGroup: 'Hát' },
        { name: 'Evezés döntött törzzsel', muscleGroup: 'Hát' }, { name: 'Bicepsz állva franciarúddal', muscleGroup: 'Bicepsz' }] },
    { name: 'C nap: Láb - Váll', muscleGroups: ['Láb', 'Váll'], exercises: [
        { name: 'Guggolás', muscleGroup: 'Láb' }, { name: 'Lábnyomás', muscleGroup: 'Láb' },
        { name: 'Vállból nyomás kézisúlyzóval', muscleGroup: 'Váll' }, { name: 'Oldalemelés', muscleGroup: 'Váll' }] }
];
const clone = o => JSON.parse(JSON.stringify(o));

const validWorkout = w => w && typeof w.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.date) && typeof w.exercise === 'string';

let _workouts = null, _sorted = null, _an = null;
function getWorkouts() {
    if (!_workouts) {
        const r = LS.get('workouts', []);
        _workouts = Array.isArray(r) ? r.filter(validWorkout) : [];
    }
    return _workouts;
}
function setWorkouts(arr) { _workouts = arr; _sorted = null; _an = null; LS.set('workouts', arr); }
function sortedWorkouts() {
    if (!_sorted) _sorted = [...getWorkouts()].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id || 0) - (b.id || 0));
    return _sorted;
}
const getBody = () => { const r = LS.get('bodyRecords', []); return Array.isArray(r) ? r : []; };
const setBody = arr => LS.set('bodyRecords', arr);
const getTemplates = () => LS.get('customTemplates', null) || clone(defaultTemplates);
const setTemplates = arr => LS.set('customTemplates', arr);
const getExercises = () => LS.get('customExercises', null) || clone(defaultExercises);
const setExercises = obj => LS.set('customExercises', obj);

const DEFAULT_SETTINGS = { weeklyGoal: 3, restSeconds: 90, autoRest: true, sound: true, wakeLock: false };
let settings = { ...DEFAULT_SETTINGS, ...LS.get('settings', {}) };
const saveSettings = () => LS.set('settings', settings);

/* ---------- Elemzés: rekordok, napi értékek, összesítők ---------- */
const e1rm = (w, r) => (w <= 0 || r <= 0) ? 0 : (r === 1 ? w : w * (1 + r / 30));

function analyze() {
    if (_an) return _an;
    const list = sortedWorkouts();
    const byDate = new Map(), ex = new Map(), prIds = new Set();
    let sets = 0, volume = 0, cardioMin = 0, cardioCount = 0;

    for (const w of list) {
        if (!byDate.has(w.date)) byDate.set(w.date, []);
        byDate.get(w.date).push(w);
        if (w.isCardio) { cardioCount++; cardioMin += num(w.time) || 0; continue; }
        const key = exKey(w.exercise);
        let e = ex.get(key);
        if (!e) {
            e = { key, name: w.exercise.trim(), muscle: w.muscleGroup || '', hasWeight: false, days: new Map(),
                  best: 0, bestSet: null, bestDate: null, best1rm: 0, lastDate: null };
            ex.set(key, e);
        }
        e.name = w.exercise.trim();
        if (w.muscleGroup) e.muscle = w.muscleGroup;
        if ((num(w.weight) || 0) > 0) e.hasWeight = true;
        if (!e.days.has(w.date)) e.days.set(w.date, { date: w.date, sets: [] });
        e.days.get(w.date).sets.push(w);
        sets++;
        volume += (num(w.weight) || 0) * (num(w.reps) || 0);
    }

    for (const e of ex.values()) {
        let runMax = 0;
        e.daysList = [];
        for (const d of e.days.values()) {
            let dayMax = 0, dayMaxSet = null, best1 = 0, vol = 0;
            for (const s of d.sets) {
                const wt = num(s.weight) || 0, rp = num(s.reps) || 0;
                const sc = e.hasWeight ? wt : rp;
                if (sc > dayMax) { dayMax = sc; dayMaxSet = s; }
                best1 = Math.max(best1, e1rm(wt, rp));
                vol += e.hasWeight ? wt * rp : rp;
            }
            d.max = dayMax; d.e1rm = best1; d.volume = vol;
            if (dayMax > runMax) {
                if (runMax > 0 && dayMaxSet) prIds.add(dayMaxSet.id);
                runMax = dayMax; e.best = dayMax; e.bestSet = dayMaxSet; e.bestDate = d.date;
            }
            e.best1rm = Math.max(e.best1rm, best1);
            e.daysList.push(d);
        }
        e.lastDate = e.daysList[e.daysList.length - 1].date;
    }
    return (_an = { list, byDate, ex, prIds, sets, volume, cardioMin, cardioCount });
}

function weeklyCounts() {
    const counts = new Map();
    for (const date of analyze().byDate.keys()) {
        const k = isoDate(startOfWeek(parseISO(date)));
        counts.set(k, (counts.get(k) || 0) + 1);
    }
    return counts;
}
function weeklyStreak() {
    const counts = weeklyCounts(), goal = settings.weeklyGoal;
    let ws = startOfWeek(new Date()), streak = 0;
    if ((counts.get(isoDate(ws)) || 0) >= goal) streak++;
    ws = addDays(ws, -7);
    while ((counts.get(isoDate(ws)) || 0) >= goal) { streak++; ws = addDays(ws, -7); }
    return streak;
}

/* ---------- Felület: értesítés, megerősítés, lapok, konfetti ---------- */
function toast(msg, { action, onAction, icon: ic, ms = 3800 } = {}) {
    const wrap = $('#toasts');
    while (wrap.children.length >= 2) wrap.firstChild.remove();
    const el = h('div', { class: 'toast', role: 'status' });
    if (ic) el.insertAdjacentHTML('beforeend', icon(ic));
    el.append(h('span', {}, msg));
    const kill = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 220); };
    if (action) el.append(h('button', { type: 'button', class: 'toast-act', onClick: () => { kill(); if (onAction) onAction(); } }, action));
    wrap.append(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(kill, ms);
}

function confirmDialog(message, { title = 'Biztos vagy benne?', ok = 'Rendben', cancel = 'Mégse', danger = false } = {}) {
    return new Promise(resolve => {
        const done = v => { box.remove(); resolve(v); };
        const okBtn = h('button', { type: 'button', class: 'btn grow ' + (danger ? 'danger' : 'primary'), onClick: () => done(true) }, ok);
        const box = h('div', { class: 'confirm', role: 'alertdialog', 'aria-modal': 'true', onClick: e => { if (e.target === box) done(false); } },
            h('div', { class: 'confirm-box' },
                h('h3', {}, title), h('p', {}, message),
                h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn grow', onClick: () => done(false) }, cancel), okBtn)));
        document.body.append(box);
        okBtn.focus();
    });
}

const openSheets = new Set();
function openSheet(id) {
    const s = document.getElementById(id);
    s.classList.add('open'); s.setAttribute('aria-hidden', 'false'); s.scrollTop = 0;
    openSheets.add(id);
    $('#backdrop').classList.add('show');
    document.body.classList.add('locked');
}
function closeSheet(id) {
    const s = document.getElementById(id);
    s.classList.remove('open'); s.setAttribute('aria-hidden', 'true');
    openSheets.delete(id);
    if (!openSheets.size) { $('#backdrop').classList.remove('show'); document.body.classList.remove('locked'); }
}
const closeAllSheets = () => [...openSheets].forEach(closeSheet);

function confetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#3ee6a0', '#ffc54d', '#5aabff', '#ff85bd', '#b892ff', '#ff7a6b'];
    const box = h('div', { class: 'confetti' });
    for (let i = 0; i < 36; i++) {
        box.append(h('i', { style: `left:${(Math.random() * 100).toFixed(1)}%;background:${colors[i % colors.length]};--dx:${(Math.random() * 160 - 80).toFixed(0)}px;--rot:${(Math.random() * 720 - 360).toFixed(0)}deg;animation-delay:${(Math.random() * 0.3).toFixed(2)}s` }));
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 2400);
}

/* ---------- Hang, rezgés, ébren tartás ---------- */
let audioCtx = null;
function ensureAudio() {
    try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* nincs hang */ }
}
function beep(freq, dur, when = 0) {
    if (!audioCtx || !settings.sound) return;
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.05);
}
const buzz = p => { if (settings.sound && navigator.vibrate) navigator.vibrate(p); };

let wakeLock = null;
async function updateWakeLock() {
    try {
        if (settings.wakeLock && document.visibilityState === 'visible' && 'wakeLock' in navigator) {
            if (!wakeLock) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            }
        } else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
}

/* ---------- Időzítő és stopper (időbélyeg alapú, zárolt képernyőn is pontos) ---------- */
const RING_C = 2 * Math.PI * 100;
const T = { cd: { total: settings.restSeconds, left: settings.restSeconds * 1000, running: false, endAt: 0, finished: false },
            sw: { running: false, startAt: 0, elapsed: 0 } };
let tickId = null, timerTab = 'countdown';

(function restoreTimers() {
    const saved = LS.get('timers', null);
    if (!saved) return;
    if (saved.cd) {
        Object.assign(T.cd, saved.cd, { finished: false });
        if (T.cd.running && T.cd.endAt <= Date.now()) { T.cd.running = false; T.cd.left = T.cd.total * 1000; }
    }
    if (saved.sw) Object.assign(T.sw, saved.sw);
})();

const persistTimers = () => LS.set('timers', T);
const cdLeft = () => T.cd.running ? Math.max(0, T.cd.endAt - Date.now()) : T.cd.left;
const swElapsed = () => T.sw.running ? T.sw.elapsed + (Date.now() - T.sw.startAt) : T.sw.elapsed;

function ensureTick() {
    if (!tickId && (T.cd.running || T.sw.running)) tickId = setInterval(tick, 250);
}
function tick() {
    if (T.cd.running && cdLeft() <= 0) finishCountdown();
    renderTimers();
    if (!T.cd.running && !T.sw.running && tickId) { clearInterval(tickId); tickId = null; }
}
function startCountdown(seconds) {
    ensureAudio();
    if (seconds) { T.cd.total = seconds; T.cd.left = seconds * 1000; }
    if (T.cd.left <= 0) T.cd.left = T.cd.total * 1000;
    T.cd.running = true; T.cd.finished = false; T.cd.endAt = Date.now() + T.cd.left;
    persistTimers(); ensureTick(); renderTimers();
}
function pauseCountdown() {
    T.cd.left = cdLeft(); T.cd.running = false; persistTimers(); renderTimers();
}
function resetCountdown() {
    T.cd.running = false; T.cd.finished = false; T.cd.left = T.cd.total * 1000;
    persistTimers(); renderTimers();
}
function finishCountdown() {
    T.cd.running = false; T.cd.left = 0; T.cd.finished = true;
    persistTimers();
    buzz([300, 120, 300, 120, 500]);
    beep(880, 0.18, 0); beep(880, 0.18, 0.28); beep(1175, 0.4, 0.56);
    toast('Letelt a pihenő. Mehet a következő sorozat.', { icon: 'timer' });
    setTimeout(() => { T.cd.finished = false; renderTimers(); }, 5000);
}
function adjustCountdown(deltaSec) {
    if (T.cd.running) {
        T.cd.endAt = Math.max(Date.now() + 1000, T.cd.endAt + deltaSec * 1000);
        T.cd.total = Math.max(T.cd.total, Math.ceil(cdLeft() / 1000));
    } else {
        T.cd.left = Math.max(15000, T.cd.left + deltaSec * 1000);
        T.cd.total = Math.round(T.cd.left / 1000);
        T.cd.finished = false;
    }
    persistTimers(); renderTimers();
}
function toggleStopwatch() {
    if (T.sw.running) { T.sw.elapsed = swElapsed(); T.sw.running = false; }
    else { T.sw.startAt = Date.now(); T.sw.running = true; ensureTick(); }
    persistTimers(); renderTimers();
}
function resetStopwatch() { T.sw = { running: false, startAt: 0, elapsed: 0 }; persistTimers(); renderTimers(); }

function setPlayButton(btn, running, idleText) {
    btn.innerHTML = `${icon(running ? 'pause' : 'play')}<span>${running ? 'Szünet' : idleText}</span>`;
}
function renderTimers() {
    const left = cdLeft(), total = T.cd.total * 1000;
    $('#countdown-display').textContent = mmss(left);
    const prog = $('#ring-prog');
    prog.style.strokeDasharray = RING_C;
    prog.style.strokeDashoffset = RING_C * (1 - (total ? Math.min(1, left / total) : 0));
    prog.classList.toggle('done', T.cd.finished);
    $('#countdown-sub').textContent = T.cd.running ? 'Pihenő fut' : T.cd.finished ? 'Letelt' : (left < total ? 'Szünetel' : `${fmtDur(T.cd.total)} pihenő`);
    setPlayButton($('#cd-start'), T.cd.running, left <= 0 || T.cd.finished ? 'Újra' : 'Indítás');
    $('#stopwatch-display').textContent = mmss(swElapsed());
    setPlayButton($('#sw-start'), T.sw.running, 'Indítás');

    const chip = $('#timer-chip'), txt = $('#timer-chip-text');
    chip.classList.toggle('running', T.cd.running || T.sw.running);
    chip.classList.toggle('finished', T.cd.finished);
    txt.textContent = T.cd.running ? mmss(left) : T.cd.finished ? 'Vége' : T.sw.running ? mmss(swElapsed()) : 'Időzítő';
}
function setTimerTab(tab) {
    timerTab = tab;
    $('#tab-countdown').classList.toggle('on', tab === 'countdown');
    $('#tab-stopwatch').classList.toggle('on', tab === 'stopwatch');
    $('#countdown-view').classList.toggle('hidden', tab !== 'countdown');
    $('#stopwatch-view').classList.toggle('hidden', tab !== 'stopwatch');
}
function initTimerUI() {
    const pr = $('#cd-presets');
    [30, 60, 90, 120, 180, 300].forEach(s => pr.append(h('button', { type: 'button', class: 'chip accent', onClick: () => startCountdown(s) }, fmtDur(s))));
    $('#cd-start').addEventListener('click', () => { T.cd.running ? pauseCountdown() : startCountdown(T.cd.finished || T.cd.left <= 0 ? T.cd.total : 0); });
    $('#cd-reset').addEventListener('click', resetCountdown);
    $('#cd-minus').addEventListener('click', () => adjustCountdown(-15));
    $('#cd-plus').addEventListener('click', () => adjustCountdown(15));
    $('#sw-start').addEventListener('click', () => { ensureAudio(); toggleStopwatch(); });
    $('#sw-reset').addEventListener('click', resetStopwatch);
    $('#tab-countdown').addEventListener('click', () => setTimerTab('countdown'));
    $('#tab-stopwatch').addEventListener('click', () => setTimerTab('stopwatch'));
    $('#timer-chip').addEventListener('click', () => { setTimerTab(!T.cd.running && T.sw.running ? 'stopwatch' : 'countdown'); openSheet('sheet-timer'); });
    renderTimers(); ensureTick();
}

/* =========================================================
   REGISZTRÁCIÓ: állapot
   ========================================================= */
const L = { muscle: '' };
let session = LS.get('activeSession', null);
let quickEdit = false;
let currentTab = 'workout';
let currentDay = null;
let editingId = null;
let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const hist = { muscle: 'Összes', q: '', limit: 14 };

/* ---------- Kis építőelemek ---------- */
function setPill(s, { isPR = false } = {}) {
    let kids;
    if (s.isCardio) {
        kids = [];
        if (num(s.time)) kids.push(h('span', { class: 'g' }, h('span', {}, fmt(num(s.time))), h('small', {}, 'perc')));
        if (num(s.speed)) kids.push(h('span', { class: 'g' }, h('span', {}, fmt(num(s.speed))), h('small', {}, 'km/h')));
        if (s.incline) kids.push(h('span', { class: 'g' }, h('small', {}, 'dőlés'), h('span', {}, s.incline)));
        if (!kids.length) kids.push(h('span', {}, 'Kardió'));
    } else {
        const w = num(s.weight) || 0, r = num(s.reps) || 0;
        kids = w > 0
            ? [h('span', {}, fmt(w)), h('small', {}, 'kg'), h('span', { class: 'times' }, '×'), h('span', {}, String(r))]
            : [h('span', {}, String(r)), h('small', {}, 'ism.')];
    }
    if (isPR) kids.push(h('span', { html: icon('trophy'), style: 'display:inline-flex' }));
    return h('button', { type: 'button', class: 'pill' + (isPR ? ' pr' : ''), 'aria-label': 'Tétel szerkesztése', onClick: () => openEditSheet(s.id) }, kids);
}

function exerciseBlocks(items) {
    const an = analyze(), groups = new Map();
    for (const w of items) {
        const k = exKey(w.exercise);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(w);
    }
    return [...groups.values()].map(sets => {
        const first = sets[0];
        const notes = [...new Set(sets.map(s => (s.note || '').trim()).filter(Boolean))];
        return h('div', { class: `ex-block ${mcls(first.muscleGroup)}` },
            h('div', { class: 'ex-head' },
                h('span', { class: 'ex-name' }, first.exercise),
                first.muscleGroup ? h('span', { class: 'ex-muscle' }, first.muscleGroup) : null,
                h('span', { class: 'grow' }),
                h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Gyakorlat törlése', html: icon('trash', 'sm'),
                    onClick: () => deleteWorkouts(sets.map(s => s.id), `${first.exercise} törölve`) })),
            h('div', { class: 'pill-row' }, sets.map(s => setPill(s, { isPR: an.prIds.has(s.id) }))),
            notes.length ? h('div', { class: 'ex-note' }, notes.join(' / ')) : null);
    });
}

function dayStats(items) {
    const ex = new Set(items.map(w => exKey(w.exercise)));
    const sets = items.filter(w => !w.isCardio);
    const vol = sets.reduce((a, w) => a + (num(w.weight) || 0) * (num(w.reps) || 0), 0);
    return h('div', { class: 'day-stats' },
        h('span', {}, h('b', {}, ex.size), ' gyakorlat'),
        sets.length ? h('span', {}, h('b', {}, sets.length), ' sorozat') : null,
        vol > 0 ? h('span', {}, h('b', {}, fmt(vol)), ' kg') : null);
}

function deleteWorkouts(ids, label) {
    const set = new Set(ids);
    const all = getWorkouts();
    const removed = all.filter(w => set.has(w.id));
    if (!removed.length) return;
    setWorkouts(all.filter(w => !set.has(w.id)));
    refreshAll();
    toast(label || `${removed.length} tétel törölve`, {
        action: 'Visszavonás',
        onAction: () => { setWorkouts([...getWorkouts(), ...removed]); refreshAll(); }
    });
}

/* =========================================================
   HÉTI KÁRTYA
   ========================================================= */
function renderTop() { $('#top-date').textContent = cap(F.long.format(new Date())); }

function renderWeek() {
    const an = analyze(), today = isoDate(), ws = startOfWeek(new Date());
    const strip = $('#week-strip');
    strip.innerHTML = '';
    const dow = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'];
    let done = 0;
    for (let i = 0; i < 7; i++) {
        const d = addDays(ws, i), iso = isoDate(d), items = an.byDate.get(iso);
        if (items) done++;
        const groups = items ? [...new Set(items.map(w => w.muscleGroup).filter(Boolean))].slice(0, 3) : [];
        strip.append(h('button', {
            type: 'button', class: 'wd' + (items ? ' trained' : '') + (iso === today ? ' today' : '') + (iso > today ? ' future' : ''),
            'aria-label': prettyDate(iso), onClick: () => openDaySheet(iso)
        },
            h('span', { class: 'dow' }, dow[i]),
            h('span', { class: 'dnum' }, String(d.getDate())),
            h('span', { class: 'dots' }, groups.map(g => h('i', { class: mcls(g) })))));
    }
    const goal = settings.weeklyGoal;
    $('#week-text').textContent = done >= goal ? `Heti cél teljesítve ${done} / ${goal}` : `Heti cél ${done} / ${goal}`;
    $('#week-bar').style.width = Math.min(100, done / goal * 100) + '%';
    const st = weeklyStreak(), badge = $('#streak-badge');
    badge.className = 'streak' + (st ? ' on' : '');
    badge.innerHTML = `${icon('flame')}<span>${st ? st + ' hét sorozatban' : 'Kezdj sorozatot'}</span>`;
}

/* =========================================================
   RÖGZÍTŐ ŰRLAP
   ========================================================= */
function renderMusclePicker() {
    const box = $('#muscle-picker');
    box.innerHTML = '';
    MUSCLES.forEach(m => box.append(h('button', {
        type: 'button', class: `chip dot ${mcls(m)}${L.muscle === m ? ' on' : ''}`,
        role: 'radio', 'aria-checked': String(L.muscle === m), onClick: () => setMuscle(m)
    }, m)));
}

function setMuscle(m, { keepExercise = false, keepSets = false } = {}) {
    const changed = L.muscle !== m;
    L.muscle = m;
    localStorage.setItem('lastMuscle', m);
    renderMusclePicker();
    renderQuickExercises();
    const cardio = m === 'Kardió';
    $('#resistance-fields').classList.toggle('hidden', cardio);
    $('#cardio-fields').classList.toggle('hidden', !cardio);
    if (changed && !keepExercise) $('#exercise').value = '';
    if (changed && !keepSets) resetSets();
    updateLastBox();
    saveDraft();
}

function renderQuickExercises() {
    const box = $('#quick-exercises');
    box.innerHTML = '';
    $('#quick-edit-btn').textContent = quickEdit ? 'Kész' : 'Lista szerkesztése';
    if (!L.muscle) { box.append(h('span', { class: 'quiet', style: 'font-size:.85rem' }, 'Válassz izomcsoportot.')); return; }
    const list = getExercises()[L.muscle] || [];
    if (!list.length) box.append(h('span', { class: 'quiet', style: 'font-size:.85rem' }, 'Még nincs mentett gyakorlat. Az első mentés után itt jelenik meg.'));
    list.forEach(name => {
        const chip = h('button', { type: 'button', class: 'chip small', onClick: () => { if (!quickEdit) { $('#exercise').value = name; onExerciseChosen(); } } }, name);
        if (quickEdit) {
            chip.append(h('span', { class: 'x', html: icon('x', 'sm'), 'aria-label': `${name} törlése`,
                onClick: e => { e.stopPropagation(); removeQuickExercise(L.muscle, name); } }));
        }
        box.append(chip);
    });
}
function removeQuickExercise(group, name) {
    const all = getExercises();
    all[group] = (all[group] || []).filter(x => x !== name);
    setExercises(all);
    renderQuickExercises();
}
function addQuickExercise(group, name) {
    const all = getExercises();
    if (!all[group]) all[group] = [];
    if (!all[group].some(x => x.toLowerCase() === name.toLowerCase())) { all[group].push(name); setExercises(all); }
}
function renderExerciseDatalist() {
    const names = new Set();
    Object.values(getExercises()).forEach(l => l.forEach(n => names.add(n)));
    analyze().ex.forEach(e => names.add(e.name));
    const dl = $('#exercise-list');
    dl.innerHTML = '';
    [...names].sort((a, b) => a.localeCompare(b, 'hu')).forEach(n => dl.append(h('option', { value: n })));
}
function findMuscleForExercise(name, fallback) {
    const all = getExercises();
    for (const g in all) if (all[g].some(x => x.toLowerCase() === name.toLowerCase())) return g;
    const e = analyze().ex.get(exKey(name));
    return (e && e.muscle) || fallback || L.muscle || 'Mell';
}

/* --- sorozatok --- */
const setRows = () => $$('.set-row', $('#sets-container'));

function bump(input, delta, min = 0) {
    const cur = input.value !== '' ? num(input.value) : num(input.placeholder);
    const next = Math.max(min, Math.round(((cur || 0) + delta) * 10) / 10);
    input.value = raw(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}
function makeSetRow(w = '', r = '', done = false) {
    const wIn = h('input', { class: 'set-weight', type: 'number', inputmode: 'decimal', step: 'any', min: '0', placeholder: 'kg', value: w, 'aria-label': 'Súly kilogrammban' });
    const rIn = h('input', { class: 'set-reps', type: 'number', inputmode: 'numeric', step: '1', min: '0', placeholder: 'ism.', value: r, 'aria-label': 'Ismétlésszám' });
    const stepper = (input, step) => h('div', { class: 'stepper' },
        h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Csökkentés', html: icon('minus'), onClick: () => bump(input, -step) }),
        input,
        h('button', { type: 'button', class: 'step-btn', 'aria-label': 'Növelés', html: icon('plus'), onClick: () => bump(input, step) }));
    const row = h('div', { class: 'set-row' + (done ? ' done' : '') });
    const check = h('button', { type: 'button', class: 'check-btn', 'aria-label': 'Sorozat kész', html: icon('check'), onClick: () => {
        const nowDone = !row.classList.contains('done');
        row.classList.toggle('done', nowDone);
        if (nowDone) {
            if (wIn.value === '' && num(wIn.placeholder) !== null) wIn.value = raw(num(wIn.placeholder));
            if (rIn.value === '' && num(rIn.placeholder) !== null) rIn.value = raw(num(rIn.placeholder));
            buzz(15);
            if (settings.autoRest) startCountdown(settings.restSeconds);
        }
        saveDraft();
    } });
    row.append(h('span', { class: 'set-num' }), stepper(wIn, 2.5), stepper(rIn, 1), check);
    return row;
}
function renumber() {
    const rows = setRows();
    rows.forEach((r, i) => { $('.set-num', r).textContent = i + 1; });
    $('#remove-set-btn').disabled = rows.length <= 1;
}
function addSetRow(vals = {}, copyPrev = false) {
    let w = vals.w ?? '', r = vals.r ?? '';
    if (copyPrev) {
        const last = setRows().pop();
        if (last) { w = $('.set-weight', last).value; r = $('.set-reps', last).value; }
    }
    $('#sets-container').append(makeSetRow(w, r, !!vals.done));
    renumber();
    refreshPlaceholders();
}
function resetSets(n = 1) {
    $('#sets-container').innerHTML = '';
    for (let i = 0; i < n; i++) addSetRow();
}

function getPrevSession() {
    if (L.muscle === 'Kardió') return null;
    const name = $('#exercise').value.trim();
    if (!name) return null;
    const e = analyze().ex.get(exKey(name));
    if (!e) return null;
    const date = $('#workout-date').value || isoDate();
    for (let i = e.daysList.length - 1; i >= 0; i--) {
        if (e.daysList[i].date < date) return { e, day: e.daysList[i], sets: e.daysList[i].sets };
    }
    return null;
}
function getPrevCardio() {
    const name = $('#exercise').value.trim(), date = $('#workout-date').value || isoDate();
    if (!name) return null;
    const list = analyze().list;
    for (let i = list.length - 1; i >= 0; i--) {
        const w = list[i];
        if (w.isCardio && exKey(w.exercise) === exKey(name) && w.date < date) return w;
    }
    return null;
}
function refreshPlaceholders() {
    const prev = getPrevSession();
    setRows().forEach((row, i) => {
        const s = prev ? (prev.sets[i] || prev.sets[prev.sets.length - 1]) : null;
        $('.set-weight', row).placeholder = s ? fmt(num(s.weight) || 0) : 'kg';
        $('.set-reps', row).placeholder = s ? String(num(s.reps) || 0) : 'ism.';
    });
}
function makeTip(prev) {
    if (!prev.e.hasWeight) return 'Tipp: próbálj eggyel több ismétlést.';
    const top = prev.day.max;
    const topSets = prev.sets.filter(s => (num(s.weight) || 0) === top);
    const minReps = Math.min(...topSets.map(s => num(s.reps) || 0));
    return minReps >= 10
        ? `Tipp: a ${fmt(top)} kg mind a 10 ismétlést elérte, próbálj ${fmt(top + 2.5)} kg-ot.`
        : `Tipp: ${fmt(top)} kg-mal próbálj eggyel több ismétlést.`;
}
function updateLastBox() {
    const box = $('#last-box'), pills = $('#last-sets');
    pills.innerHTML = ''; $('#tip-text').textContent = '';
    if (L.muscle === 'Kardió') {
        const c = getPrevCardio();
        box.classList.toggle('hidden', !c);
        if (c) { $('#last-title').textContent = `Legutóbb, ${shortDate(c.date)}`; pills.append(setPill(c)); }
        return;
    }
    const prev = getPrevSession();
    box.classList.toggle('hidden', !prev);
    if (!prev) return;
    $('#last-title').textContent = `Legutóbb, ${shortDate(prev.day.date)}`;
    prev.sets.forEach(s => pills.append(setPill(s)));
    $('#tip-text').textContent = makeTip(prev);
}
function loadLast() {
    if (L.muscle === 'Kardió') {
        const c = getPrevCardio();
        if (!c) return;
        $('#cardio-time').value = c.time || ''; $('#cardio-speed').value = c.speed || ''; $('#cardio-incline').value = c.incline || '';
    } else {
        const prev = getPrevSession();
        if (!prev) return;
        $('#sets-container').innerHTML = '';
        prev.sets.slice(0, 10).forEach(s => addSetRow({ w: raw(num(s.weight) || 0), r: raw(num(s.reps) || 0) }));
    }
    saveDraft();
}
function onExerciseChosen() {
    const prev = getPrevSession();
    const empty = setRows().every(r => !$('.set-weight', r).value && !$('.set-reps', r).value);
    if (empty) resetSets(prev ? Math.min(Math.max(prev.sets.length, 1), 8) : 1);
    updateLastBox(); refreshPlaceholders(); saveDraft();
}

/* --- piszkozat: újratöltés után sem vész el, amit beírtál --- */
let draftTimer = null;
function collectDraft() {
    return {
        date: $('#workout-date').value, muscle: L.muscle, exercise: $('#exercise').value, note: $('#note').value,
        sets: setRows().map(r => ({ w: $('.set-weight', r).value, r: $('.set-reps', r).value, done: r.classList.contains('done') })),
        cardio: { t: $('#cardio-time').value, s: $('#cardio-speed').value, i: $('#cardio-incline').value }
    };
}
function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
        const d = collectDraft();
        const empty = !d.exercise && !d.note && !d.cardio.t && !d.cardio.s && !d.cardio.i && d.sets.every(s => !s.w && !s.r);
        if (empty) localStorage.removeItem('draft'); else LS.set('draft', d);
    }, 250);
}
function restoreDraft() {
    const d = LS.get('draft', null);
    if (!d) return false;
    if (d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date)) $('#workout-date').value = d.date;
    if (d.muscle) setMuscle(d.muscle, { keepExercise: true, keepSets: true });
    $('#exercise').value = d.exercise || '';
    $('#note').value = d.note || '';
    $('#cardio-time').value = d.cardio?.t || ''; $('#cardio-speed').value = d.cardio?.s || ''; $('#cardio-incline').value = d.cardio?.i || '';
    $('#sets-container').innerHTML = '';
    (d.sets && d.sets.length ? d.sets : [{}]).forEach(s => addSetRow(s));
    return true;
}

function resetLogger() {
    $('#exercise').value = ''; $('#note').value = '';
    $('#cardio-time').value = ''; $('#cardio-speed').value = ''; $('#cardio-incline').value = '';
    resetSets();
    localStorage.removeItem('draft');
    updateLastBox();
}

function onSubmit(e) {
    e.preventDefault();
    const date = $('#workout-date').value || isoDate();
    const name = $('#exercise').value.trim();
    if (!L.muscle) { toast('Válassz izomcsoportot.'); return; }
    if (!name) { toast('Add meg a gyakorlat nevét.'); $('#exercise').focus(); return; }
    const isCardio = L.muscle === 'Kardió';
    const note = $('#note').value.trim();
    const recs = [];

    if (isCardio) {
        const time = $('#cardio-time').value, speed = $('#cardio-speed').value, incline = $('#cardio-incline').value.trim();
        if (!time && !speed && !incline) { toast('Add meg legalább az időt.'); return; }
        recs.push({ id: uid(), date, muscleGroup: L.muscle, exercise: name, isCardio: true, time, incline, speed, note });
    } else {
        setRows().forEach(row => {
            const w = $('.set-weight', row).value, r = $('.set-reps', row).value;
            if (w !== '' || r !== '') recs.push({ id: uid(), date, muscleGroup: L.muscle, exercise: name, isCardio: false, weight: w || '0', reps: r || '0', note: recs.length ? '' : note });
        });
        if (!recs.length) { toast('Írj be legalább egy sorozatot.'); return; }
    }

    // PR ellenőrzés mentés előtt
    let isPR = false, prText = '';
    if (!isCardio) {
        const ex = analyze().ex.get(exKey(name));
        const useWeight = recs.some(r => num(r.weight) > 0) || (ex && ex.hasWeight);
        const newBest = Math.max(...recs.map(r => useWeight ? num(r.weight) || 0 : num(r.reps) || 0));
        if (ex && ex.best > 0 && newBest > ex.best) { isPR = true; prText = useWeight ? `${fmt(newBest)} kg` : `${newBest} ismétlés`; }
    }

    setWorkouts([...getWorkouts(), ...recs]);
    addQuickExercise(L.muscle, name);

    if (session) {
        const idx = session.exercises.findIndex((x, i) => exKey(x.name) === exKey(name) && !session.done.includes(i));
        session.savedIds.push(...recs.map(r => r.id));
        if (isPR) session.prs.push({ name, text: prText });
        if (idx >= 0) {
            session.done.push(idx); session.index = idx;
            persistSession();
        }
    }

    resetLogger();
    if (isPR) { confetti(); toast(`Új rekord: ${name}, ${prText}`, { icon: 'trophy', ms: 5000 }); buzz([40, 60, 40]); }
    else toast(isCardio ? `${name} mentve` : `${name}, ${recs.length} sorozat mentve`);

    if (session) {
        const nx = nextSessionIndex();
        if (nx < 0) { finishSession(); return; }
        goToSessionExercise(nx);
    }
    refreshAll();
}

function initLogger() {
    $('#workout-date').value = isoDate();
    $('#workout-form').addEventListener('submit', onSubmit);
    $('#workout-form').addEventListener('input', () => saveDraft());
    $('#workout-date').addEventListener('change', () => { updateLastBox(); refreshPlaceholders(); renderDayLog(); });
    $('#add-set-btn').addEventListener('click', () => addSetRow({}, true));
    $('#remove-set-btn').addEventListener('click', () => { const rows = setRows(); if (rows.length > 1) { rows[rows.length - 1].remove(); renumber(); saveDraft(); } });
    $('#load-last-btn').addEventListener('click', loadLast);
    $('#quick-edit-btn').addEventListener('click', () => { quickEdit = !quickEdit; renderQuickExercises(); });
    $('#exercise').addEventListener('input', () => {
        const name = $('#exercise').value.trim();
        if (name) {
            const g = findMuscleForExercise(name, '');
            const known = getExercises()[g] && getExercises()[g].some(x => x.toLowerCase() === name.toLowerCase());
            if (g && known && g !== L.muscle) setMuscle(g, { keepExercise: true, keepSets: true });
        }
        updateLastBox(); refreshPlaceholders();
    });
    $('#exercise').addEventListener('change', onExerciseChosen);
    renderMusclePicker();
    const restored = restoreDraft();
    if (!restored) {
        const lm = localStorage.getItem('lastMuscle');
        if (lm && MUSCLES.includes(lm)) setMuscle(lm, { keepExercise: true, keepSets: true });
        resetSets();
    }
    renderQuickExercises();
    updateLastBox(); refreshPlaceholders();
}

function renderDayLog() {
    const date = $('#workout-date').value || isoDate();
    const items = analyze().byDate.get(date) || [];
    $('#day-log-section').classList.toggle('hidden', !items.length);
    if (!items.length) return;
    $('#day-log-title').textContent = date === isoDate() ? 'Ma rögzítve' : `Rögzítve: ${prettyDate(date)}`;
    const box = $('#day-log');
    box.innerHTML = '';
    box.append(h('div', { class: 'day' }, h('div', { class: 'day-head' }, dayStats(items)), exerciseBlocks(items)));
}

/* =========================================================
   SABLONOK ÉS AKTÍV EDZÉS
   ========================================================= */
const normEx = ex => typeof ex === 'string'
    ? { name: ex, muscleGroup: findMuscleForExercise(ex) }
    : { name: ex.name, muscleGroup: ex.muscleGroup || findMuscleForExercise(ex.name) };

function templateLastDone(t) {
    const an = analyze(), keys = new Set(t.exercises.map(x => exKey(typeof x === 'string' ? x : x.name)));
    const need = Math.max(1, Math.ceil(keys.size / 2));
    let last = null;
    for (const [date, items] of an.byDate) {
        const hit = new Set(items.filter(w => keys.has(exKey(w.exercise))).map(w => exKey(w.exercise)));
        if (hit.size >= need && (!last || date > last)) last = date;
    }
    return last;
}

function renderTemplates() {
    const box = $('#template-list');
    box.innerHTML = '';
    getTemplates().forEach((t, i) => {
        const groups = [...new Set(t.exercises.map(x => normEx(x).muscleGroup))].slice(0, 5);
        const last = templateLastDone(t);
        const active = session && session.name === t.name;
        box.append(h('div', { class: 'tpl-card' + (active ? ' active' : '') },
            h('button', { type: 'button', class: 'tpl-main', onClick: () => startTemplate(i) },
                h('span', { class: 'tpl-name' }, t.name),
                h('span', { class: 'tpl-meta' }, `${t.exercises.length} gyakorlat`),
                h('span', { class: 'tpl-meta' }, last ? `Utoljára ${daysAgoText(last)}` : 'Még nem csináltad'),
                h('span', { class: 'tpl-foot' },
                    h('span', { class: 'tpl-dots' }, groups.map(g => h('i', { class: mcls(g) }))),
                    h('span', { class: 'tpl-play', html: icon('play') }))),
            h('button', { type: 'button', class: 'icon-btn sm tpl-edit', 'aria-label': `${t.name} szerkesztése`, html: icon('pencil', 'sm'), onClick: () => openTemplateBuilder(i) })));
    });
    box.append(h('button', { type: 'button', class: 'tpl-card tpl-new', onClick: () => openTemplateBuilder(null) },
        h('span', { html: icon('plus') }), 'Új sablon'));
}

async function startTemplate(i) {
    const t = getTemplates()[i];
    if (!t) return;
    if (session && session.savedIds.length) {
        const ok = await confirmDialog('Már fut egy edzés. Ha újat indítasz, a jelenlegi lezárul összefoglaló nélkül.', { title: 'Új edzés indítása?', ok: 'Újat indítok' });
        if (!ok) return;
    }
    session = { name: t.name, exercises: t.exercises.map(normEx), index: 0, done: [], startedAt: Date.now(), savedIds: [], prs: [] };
    persistSession();
    goToSessionExercise(0);
    $('#workout-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const persistSession = () => session ? LS.set('activeSession', session) : localStorage.removeItem('activeSession');

function goToSessionExercise(i) {
    session.index = i;
    persistSession();
    const ex = session.exercises[i];
    setMuscle(ex.muscleGroup, { keepExercise: true, keepSets: true });
    $('#exercise').value = ex.name;
    $('#note').value = '';
    $('#cardio-time').value = ''; $('#cardio-speed').value = ''; $('#cardio-incline').value = '';
    resetSets(1);
    onExerciseChosen();
    renderSession();
}
function nextSessionIndex() {
    const n = session.exercises.length;
    for (let s = 1; s <= n; s++) {
        const idx = (session.index + s) % n;
        if (!session.done.includes(idx)) return idx;
    }
    return -1;
}
function renderSession() {
    const card = $('#session-card');
    if (!session) { card.classList.add('hidden'); renderTemplates(); return; }
    card.classList.remove('hidden');
    const total = session.exercises.length, done = session.done.length;
    $('#session-name').textContent = session.name;
    $('#session-sub').textContent = `${done} / ${total} gyakorlat kész`;
    $('#session-bar').style.width = (done / total * 100) + '%';
    const steps = $('#session-steps');
    steps.innerHTML = '';
    session.exercises.forEach((ex, i) => {
        const isDone = session.done.includes(i);
        steps.append(h('button', { type: 'button', class: 'step' + (isDone ? ' done' : '') + (i === session.index ? ' current' : ''), onClick: () => goToSessionExercise(i) },
            isDone ? h('span', { html: icon('check', 'sm'), style: 'display:inline-flex' }) : null, ex.name));
    });
    const cur = $('.current', steps);
    if (cur) steps.scrollLeft = cur.offsetLeft - steps.clientWidth / 2 + cur.clientWidth / 2;
    renderTemplates();
}
function finishSession() {
    const s = session;
    session = null;
    persistSession();
    renderSession();
    if (!s) return;
    if (!s.savedIds.length) { toast('Edzés lezárva.'); return; }
    showSummary(s);
    refreshAll();
}
function showSummary(s) {
    const ids = new Set(s.savedIds);
    const recs = getWorkouts().filter(w => ids.has(w.id));
    const sets = recs.filter(w => !w.isCardio);
    const vol = sets.reduce((a, w) => a + (num(w.weight) || 0) * (num(w.reps) || 0), 0);
    const mins = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
    const exCount = new Set(recs.map(w => exKey(w.exercise))).size;
    $('#summary-sub').textContent = s.name;
    const body = $('#summary-body');
    body.innerHTML = '';
    const tile = (v, l) => h('div', { class: 'bm' }, h('div', { class: 'l' }, l), h('b', {}, v));
    body.append(h('div', { class: 'sum-grid' },
        tile(`${mins} perc`, 'Időtartam'), tile(String(exCount), 'Gyakorlat'),
        tile(String(sets.length), 'Sorozat'), tile(`${fmt(vol)} kg`, 'Megmozgatott súly')));
    s.prs.forEach(p => body.append(h('div', { class: 'sum-pr' }, h('span', { html: icon('trophy') }), h('span', {}, p.name), h('b', {}, p.text))));
    openSheet('sheet-summary');
    if (s.prs.length) confetti();
}

/* --- sablonszerkesztő --- */
const B = { index: null, muscles: [], exercises: [] };

function openTemplateBuilder(index) {
    B.index = index;
    const t = index !== null ? getTemplates()[index] : null;
    $('#template-form-title').textContent = t ? 'Sablon szerkesztése' : 'Új sablon';
    $('#new-template-name').value = t ? t.name : '';
    B.muscles = t && t.muscleGroups ? [...t.muscleGroups] : [];
    B.exercises = t ? t.exercises.map(normEx) : [];
    $('#delete-template-btn').classList.toggle('hidden', !t);
    renderBuilder();
    openSheet('sheet-template');
}
function renderBuilder() {
    const mc = $('#template-muscle-chips');
    mc.innerHTML = '';
    MUSCLES.forEach(g => mc.append(h('button', { type: 'button', class: `chip small dot ${mcls(g)}${B.muscles.includes(g) ? ' on' : ''}`,
        onClick: () => { B.muscles = B.muscles.includes(g) ? B.muscles.filter(m => m !== g) : [...B.muscles, g]; renderBuilder(); } }, g)));

    const all = getExercises(), av = $('#template-available-exercises');
    av.innerHTML = '';
    const groups = B.muscles.length ? B.muscles : Object.keys(all);
    const seen = new Set();
    groups.forEach(g => (all[g] || []).forEach(name => {
        if (seen.has(name)) return;
        seen.add(name);
        av.append(h('button', { type: 'button', class: 'chip small', onClick: () => addBuilderExercise(name, g) }, `+ ${name}`));
    }));

    const sel = $('#template-selected-exercises');
    sel.innerHTML = '';
    if (!B.exercises.length) sel.append(h('div', { class: 'quiet', style: 'padding:10px;font-size:.85rem' }, 'Még nincs kiválasztott gyakorlat.'));
    B.exercises.forEach((ex, i) => sel.append(h('div', { class: `sel-item ${mcls(ex.muscleGroup)}` },
        h('span', { class: 'nm' }, `${i + 1}. ${ex.name}`, h('small', {}, ex.muscleGroup)),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Feljebb', html: icon('up', 'sm'), disabled: i === 0 ? '' : null, onClick: () => moveBuilder(i, -1) }),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Lejjebb', html: icon('down', 'sm'), disabled: i === B.exercises.length - 1 ? '' : null, onClick: () => moveBuilder(i, 1) }),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Eltávolítás', html: icon('x', 'sm'), onClick: () => { B.exercises.splice(i, 1); renderBuilder(); } }))));
}
function addBuilderExercise(name, group) {
    if (B.exercises.some(x => exKey(x.name) === exKey(name))) { toast('Ez a gyakorlat már szerepel a sablonban.'); return; }
    B.exercises.push({ name, muscleGroup: group || findMuscleForExercise(name, B.muscles[0]) });
    renderBuilder();
}
function moveBuilder(i, d) {
    const j = i + d;
    if (j < 0 || j >= B.exercises.length) return;
    [B.exercises[i], B.exercises[j]] = [B.exercises[j], B.exercises[i]];
    renderBuilder();
}
function initTemplates() {
    $('#add-custom-template-ex-btn').addEventListener('click', () => {
        const inp = $('#custom-template-ex-input'), v = inp.value.trim();
        if (!v) return;
        addBuilderExercise(v, findMuscleForExercise(v, B.muscles[0] || L.muscle || 'Mell'));
        inp.value = '';
    });
    $('#save-new-template-btn').addEventListener('click', () => {
        const name = $('#new-template-name').value.trim();
        if (!name) { toast('Adj nevet a sablonnak.'); return; }
        if (!B.exercises.length) { toast('Válassz legalább egy gyakorlatot.'); return; }
        const data = { name, muscleGroups: B.muscles, exercises: B.exercises.map(x => ({ ...x })) };
        const list = getTemplates();
        if (B.index !== null) list[B.index] = data; else list.push(data);
        setTemplates(list);
        closeSheet('sheet-template');
        renderTemplates();
        toast('Sablon mentve.');
    });
    $('#delete-template-btn').addEventListener('click', async () => {
        const list = getTemplates(), t = list[B.index];
        if (!t) return;
        if (!(await confirmDialog(`A(z) „${t.name}” sablon törlődik. A korábbi edzéseid megmaradnak.`, { title: 'Sablon törlése', ok: 'Törlés', danger: true }))) return;
        list.splice(B.index, 1);
        setTemplates(list);
        closeSheet('sheet-template');
        renderTemplates();
    });
    $('#session-finish').addEventListener('click', finishSession);
    $('#session-skip').addEventListener('click', () => { const nx = nextSessionIndex(); if (nx >= 0 && session.exercises.length > 1) goToSessionExercise(nx); });
}

/* =========================================================
   NAPLÓ: naptár, lista, nap részletei, szerkesztés
   ========================================================= */
function renderCalendar() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    $('#calendar-month-title').textContent = cap(F.month.format(calMonth));
    const grid = $('#calendar-days');
    grid.innerHTML = '';
    let first = new Date(y, m, 1).getDay();
    first = first === 0 ? 6 : first - 1;
    const total = new Date(y, m + 1, 0).getDate();
    const an = analyze(), today = isoDate();
    for (let i = 0; i < first; i++) grid.append(h('div', { class: 'cal-day empty' }));
    let days = 0, sets = 0;
    for (let d = 1; d <= total; d++) {
        const iso = `${y}-${pad(m + 1)}-${pad(d)}`, items = an.byDate.get(iso);
        let dots = [];
        if (items) {
            days++; sets += items.filter(w => !w.isCardio).length;
            dots = [...new Set(items.map(w => w.muscleGroup).filter(Boolean))].slice(0, 3);
        }
        grid.append(h('button', { type: 'button', class: 'cal-day' + (items ? ' has' : '') + (iso === today ? ' today' : '') + (iso > today ? ' future' : ''),
            'aria-label': prettyDate(iso), onClick: () => openDaySheet(iso) },
            String(d), h('span', { class: 'dots' }, dots.map(g => h('i', { class: mcls(g) })))));
    }
    $('#cal-foot').textContent = days ? `${days} edzésnap, ${sets} sorozat ebben a hónapban` : 'Ebben a hónapban még nincs edzés.';
}

function renderHistory() {
    renderCalendar();
    const chips = $('#history-filter-chips');
    chips.innerHTML = '';
    ['Összes', ...MUSCLES].forEach(m => chips.append(h('button', { type: 'button',
        class: `chip small ${m === 'Összes' ? 'accent' : 'dot ' + mcls(m)}${hist.muscle === m ? ' on' : ''}`,
        onClick: () => { hist.muscle = m; hist.limit = 14; renderHistory(); } }, m)));

    const an = analyze(), q = hist.q.trim().toLowerCase();
    const match = w => (hist.muscle === 'Összes' || w.muscleGroup === hist.muscle) &&
        (!q || `${w.exercise} ${w.note || ''} ${w.muscleGroup || ''} ${w.date} ${shortDate(w.date)}`.toLowerCase().includes(q));
    const feed = $('#history-feed');
    feed.innerHTML = '';
    let shown = 0, more = false;
    for (const date of [...an.byDate.keys()].sort().reverse()) {
        const items = an.byDate.get(date).filter(match);
        if (!items.length) continue;
        if (shown >= hist.limit) { more = true; break; }
        shown++;
        feed.append(h('div', { class: 'day' },
            h('div', { class: 'day-head' }, h('div', {}, h('div', { class: 'day-title' }, prettyDate(date)), dayStats(items))),
            exerciseBlocks(items)));
    }
    if (!shown) feed.append(h('div', { class: 'empty' }, h('b', {}, an.list.length ? 'Nincs találat' : 'Még nincs bejegyzés'),
        an.list.length ? 'Próbálj más szűrőt vagy keresőszót.' : 'Az első mentett gyakorlatod itt fog megjelenni.'));
    $('#feed-more').classList.toggle('hidden', !more);

    const last = LS.get('lastExport', 0);
    $('#backup-nudge').classList.toggle('hidden', !(an.list.length >= 5 && Date.now() - last > 30 * 86400000));
}

function openDaySheet(iso) { currentDay = iso; renderDaySheet(iso); openSheet('sheet-day'); }
function renderDaySheet(iso) {
    const items = analyze().byDate.get(iso) || [];
    $('#day-sheet-title').textContent = prettyDate(iso);
    const body = $('#day-sheet-body'), foot = $('#day-sheet-foot');
    body.innerHTML = ''; foot.innerHTML = '';
    if (items.length) {
        body.append(dayStats(items), ...exerciseBlocks(items));
    } else {
        body.append(h('div', { class: 'empty' }, h('b', {}, 'Erre a napra nincs bejegyzés'), iso > isoDate() ? 'Ez a nap még nem jött el.' : 'Utólag is rögzíthetsz edzést.'));
    }
    if (items.length && iso !== isoDate()) {
        foot.append(h('button', { type: 'button', class: 'btn grow', html: `${icon('copy')}<span>Másolás mára</span>`, onClick: () => copyDayToToday(iso) }));
    }
    if (iso <= isoDate()) {
        foot.append(h('button', { type: 'button', class: 'btn primary grow', html: `${icon('plus')}<span>Rögzítés erre a napra</span>`, onClick: () => {
            $('#workout-date').value = iso;
            closeAllSheets(); switchTab('workout');
            updateLastBox(); refreshPlaceholders(); renderDayLog(); saveDraft();
            $('#workout-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } }));
    }
}
function copyDayToToday(iso) {
    const today = isoDate();
    const copies = (analyze().byDate.get(iso) || []).map(w => ({ ...w, id: uid(), date: today }));
    if (!copies.length) return;
    setWorkouts([...getWorkouts(), ...copies]);
    const ids = copies.map(c => c.id);
    closeAllSheets(); refreshAll();
    toast(`Átmásolva mára: ${copies.length} tétel`, { action: 'Visszavonás', onAction: () => { const s = new Set(ids); setWorkouts(getWorkouts().filter(w => !s.has(w.id))); refreshAll(); } });
}

function openEditSheet(id) {
    const w = getWorkouts().find(x => x.id === id);
    if (!w) return;
    editingId = id;
    $('#edit-title').textContent = w.exercise;
    $('#edit-sub').textContent = w.muscleGroup || '';
    const f = $('#edit-fields');
    f.innerHTML = '';
    const field = (label, inp) => h('div', { class: 'field' }, h('label', {}, label), inp);
    const inp = (idn, type, val, extra = {}) => h('input', { id: idn, class: 'inp', type, value: val ?? '', ...extra });
    f.append(field('Dátum', inp('ef-date', 'date', w.date, { required: '' })));
    if (w.isCardio) {
        f.append(h('div', { class: 'form-row' },
            field('Idő (perc)', inp('ef-time', 'number', w.time, { inputmode: 'decimal' })),
            field('Sebesség (km/h)', inp('ef-speed', 'number', w.speed, { inputmode: 'decimal', step: 'any' }))));
        f.append(field('Dőlésszög / fokozat', inp('ef-incline', 'text', w.incline)));
    } else {
        f.append(h('div', { class: 'form-row' },
            field('Súly (kg)', inp('ef-weight', 'number', w.weight, { inputmode: 'decimal', step: 'any' })),
            field('Ismétlés', inp('ef-reps', 'number', w.reps, { inputmode: 'numeric' }))));
    }
    f.append(field('Megjegyzés', inp('ef-note', 'text', w.note)));
    openSheet('sheet-edit');
}
function initEditSheet() {
    $('#edit-form').addEventListener('submit', e => {
        e.preventDefault();
        const list = getWorkouts(), i = list.findIndex(x => x.id === editingId);
        if (i < 0) return;
        const w = { ...list[i], date: $('#ef-date').value || list[i].date, note: $('#ef-note').value.trim() };
        if (w.isCardio) { w.time = $('#ef-time').value; w.speed = $('#ef-speed').value; w.incline = $('#ef-incline').value.trim(); }
        else { w.weight = $('#ef-weight').value || '0'; w.reps = $('#ef-reps').value || '0'; }
        const next = [...list]; next[i] = w;
        setWorkouts(next);
        closeSheet('sheet-edit');
        refreshAll();
        toast('Módosítva.');
    });
    $('#edit-delete').addEventListener('click', () => { closeSheet('sheet-edit'); deleteWorkouts([editingId], 'Tétel törölve'); });
    $('#cal-prev').addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); renderCalendar(); });
    $('#cal-next').addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); renderCalendar(); });
    $('#search-filter').addEventListener('input', e => { hist.q = e.target.value; hist.limit = 14; renderHistory(); });
    $('#feed-more').addEventListener('click', () => { hist.limit += 14; renderHistory(); });
}

/* =========================================================
   GRAFIKONOK
   ========================================================= */
let chartSeq = 0;

function niceTicks(min, max, n = 3) {
    const span = max - min || 1, rawStep = span / n, mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(+v.toFixed(6));
    return ticks;
}

/* data: [{ t: ms, v: szám, label: 'szept. 18.' }] */
function drawLine(container, readout, data, { unit = '', rangeLabel = '' } = {}) {
    container.innerHTML = '';
    readout.innerHTML = '';
    if (!data.length) {
        container.append(h('div', { class: 'chart-empty' }, 'Ehhez még nincs adat.'));
        return;
    }
    const W = 340, H = 180, pl = 38, pr = 14, pt = 14, pb = 26;
    const ys = data.map(d => d.v), xs = data.map(d => d.t);
    let minY = Math.min(...ys), maxY = Math.max(...ys);
    if (minY === maxY) { minY -= 1; maxY += 1; }
    const padY = (maxY - minY) * 0.18;
    minY -= padY; maxY += padY;
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const X = t => data.length === 1 || maxX === minX ? pl + (W - pl - pr) / 2 : pl + (t - minX) / (maxX - minX) * (W - pl - pr);
    const Y = v => pt + (1 - (v - minY) / (maxY - minY)) * (H - pt - pb);
    const gid = 'g' + (++chartSeq);

    const pts = data.map(d => ({ ...d, px: X(d.t), py: Y(d.v) }));
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join('');
    const area = `${line}L${pts[pts.length - 1].px.toFixed(1)} ${H - pb}L${pts[0].px.toFixed(1)} ${H - pb}Z`;
    const grid = niceTicks(minY, maxY).map(v =>
        `<line class="ch-grid" x1="${pl}" x2="${W - pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>` +
        `<text class="ch-txt" x="${pl - 6}" y="${(Y(v) + 3.5).toFixed(1)}" text-anchor="end">${fmt(v)}</text>`).join('');
    const dots = pts.length <= 30 ? pts.map(p => `<circle class="ch-dot" cx="${p.px.toFixed(1)}" cy="${p.py.toFixed(1)}" r="3"/>`).join('') : '';
    const xl = pts.length > 1
        ? `<text class="ch-txt" x="${pl}" y="${H - 6}" text-anchor="start">${pts[0].label}</text><text class="ch-txt" x="${W - pr}" y="${H - 6}" text-anchor="end">${pts[pts.length - 1].label}</text>`
        : `<text class="ch-txt" x="${W / 2}" y="${H - 6}" text-anchor="middle">${pts[0].label}</text>`;

    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafikon">
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3ee6a0" stop-opacity="0.28"/><stop offset="1" stop-color="#3ee6a0" stop-opacity="0"/></linearGradient></defs>
        ${grid}
        <path d="${area}" fill="url(#${gid})"/>
        <path class="ch-line" d="${line}"/>
        ${dots}
        <line class="ch-cursor" id="${gid}c" x1="0" x2="0" y1="${pt}" y2="${H - pb}" style="display:none"/>
        <circle class="ch-active" id="${gid}m" r="5.5" cx="0" cy="0"/>
        ${xl}
    </svg>`;
    const svg = $('svg', container), cursor = $('#' + gid + 'c', container), mark = $('#' + gid + 'm', container);

    const first = pts[0];
    const show = (p, interactive) => {
        const diff = p.v - first.v;
        const dTxt = pts.length > 1 && p !== first
            ? `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${fmt(Math.abs(diff))} ${unit}`.trim() + (interactive ? ' az elejéhez képest' : rangeLabel ? ` ${rangeLabel}` : '')
            : '';
        readout.innerHTML = '';
        readout.append(
            h('div', {}, h('span', { class: 'big' }, fmt(p.v), h('small', {}, unit)),
                dTxt ? h('div', { class: 'delta ' + (diff > 0 ? 'up' : diff < 0 ? 'down' : '') }, dTxt) : null),
            h('div', { class: 'when' }, p.label));
        mark.setAttribute('cx', p.px.toFixed(1)); mark.setAttribute('cy', p.py.toFixed(1));
        cursor.setAttribute('x1', p.px.toFixed(1)); cursor.setAttribute('x2', p.px.toFixed(1));
        cursor.style.display = interactive ? '' : 'none';
    };
    show(pts[pts.length - 1], false);
    const pick = e => {
        const r = svg.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * W;
        let best = pts[0];
        for (const p of pts) if (Math.abs(p.px - x) < Math.abs(best.px - x)) best = p;
        show(best, true);
    };
    svg.addEventListener('pointerdown', pick);
    svg.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') pick(e); });
}

/* =========================================================
   FEJLŐDÉS (statisztika)
   ========================================================= */
const S = { ex: '', metric: 'max', range: 90, prAll: false };
const METRICS = {
    max: { label: 'Max súly', labelBW: 'Max ismétlés', unit: 'kg', unitBW: 'ism.', key: 'max' },
    e1rm: { label: 'Becsült 1RM', unit: 'kg', key: 'e1rm' },
    vol: { label: 'Volumen', unit: 'kg', unitBW: 'ism.', key: 'volume' }
};

function segButtons(container, items, activeVal, onPick, extraClass = 'accent') {
    container.innerHTML = '';
    items.forEach(([val, label]) => container.append(h('button', { type: 'button', class: `chip ${extraClass}${val === activeVal ? ' on' : ''}`, onClick: () => onPick(val) }, label)));
}

function renderStats() {
    const an = analyze();
    const monthKey = isoDate().slice(0, 7);
    const monthDays = [...an.byDate.keys()].filter(d => d.startsWith(monthKey)).length;
    const vol = an.volume >= 10000 ? `${fmt(an.volume / 1000)} t` : `${fmt(an.volume)} kg`;
    const totals = $('#totals');
    totals.innerHTML = '';
    [[an.byDate.size, 'edzésnap összesen'], [an.sets, 'sorozat'], [vol, 'megmozgatott súly'], [monthDays, 'edzésnap ebben a hónapban']]
        .forEach(([v, l]) => totals.append(h('div', { class: 'tot' }, h('b', {}, String(v)), h('span', {}, l))));

    /* --- fejlődés grafikon --- */
    const exList = [...an.ex.values()].sort((a, b) => a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : a.name.localeCompare(b.name, 'hu'));
    const sel = $('#chart-exercise-select');
    sel.innerHTML = '';
    if (!exList.length) {
        sel.disabled = true;
        sel.append(h('option', {}, 'Még nincs gyakorlat'));
        $('#metric-seg').innerHTML = ''; $('#range-seg').innerHTML = '';
        drawLine($('#chart-container'), $('#chart-readout'), []);
    } else {
        sel.disabled = false;
        if (!an.ex.has(S.ex)) S.ex = exList[0].key;
        exList.forEach(e => sel.append(h('option', { value: e.key, selected: e.key === S.ex ? '' : null }, e.name)));
        sel.value = S.ex;
        const e = an.ex.get(S.ex);
        if (S.metric === 'e1rm' && !e.hasWeight) S.metric = 'max';
        const metrics = [['max', e.hasWeight ? METRICS.max.label : METRICS.max.labelBW]];
        if (e.hasWeight) metrics.push(['e1rm', METRICS.e1rm.label]);
        metrics.push(['vol', METRICS.vol.label]);
        segButtons($('#metric-seg'), metrics, S.metric, v => { S.metric = v; renderStats(); });
        segButtons($('#range-seg'), [[30, '30 nap'], [90, '90 nap'], [0, 'Mind']], S.range, v => { S.range = v; renderStats(); });

        const cutoff = S.range ? isoDate(addDays(new Date(), -S.range)) : '';
        const m = METRICS[S.metric];
        const data = e.daysList.filter(d => d.date >= cutoff).map(d => ({ t: parseISO(d.date).getTime(), v: d[m.key], label: shortDate(d.date) })).filter(p => p.v > 0);
        const unit = e.hasWeight ? m.unit : (m.unitBW || m.unit);
        drawLine($('#chart-container'), $('#chart-readout'), data, { unit, rangeLabel: S.range ? `az elmúlt ${S.range} napban` : 'összesen' });
    }

    /* --- rekordok --- */
    const prs = [...an.ex.values()].filter(e => e.best > 0).sort((a, b) => a.bestDate < b.bestDate ? 1 : -1);
    const box = $('#pr-summary-container');
    box.innerHTML = '';
    const fresh = isoDate(addDays(new Date(), -14));
    if (!prs.length) box.append(h('div', { class: 'empty' }, h('b', {}, 'Még nincs rekord'), 'Az első mentett sorozatok után itt jelennek meg.'));
    (S.prAll ? prs : prs.slice(0, 6)).forEach(e => {
        const bs = e.bestSet;
        const val = e.hasWeight
            ? h('div', { class: 'pr-val' }, e.bestDate >= fresh ? h('span', { class: 'fresh', html: icon('trophy', 'sm') }) : null, fmt(e.best), h('small', {}, ` kg × ${num(bs.reps) || 0}`))
            : h('div', { class: 'pr-val' }, e.bestDate >= fresh ? h('span', { class: 'fresh', html: icon('trophy', 'sm') }) : null, String(e.best), h('small', {}, ' ism.'));
        box.append(h('div', { class: `pr-row ${mcls(e.muscle)}` },
            h('span', { class: 'pr-dot' }),
            h('div', {}, h('div', { class: 'pr-name' }, e.name),
                h('div', { class: 'pr-sub' }, shortDate(e.bestDate) + (e.hasWeight ? `, becsült 1RM ${fmt(e.best1rm)} kg` : ''))),
            val));
    });
    const more = $('#pr-more');
    more.classList.toggle('hidden', prs.length <= 6);
    more.textContent = S.prAll ? 'Kevesebb' : `Mind a ${prs.length} rekord`;

    /* --- heti edzésnapok (8 hét) --- */
    const counts = weeklyCounts(), goal = settings.weeklyGoal;
    const weeks = [];
    for (let i = 7; i >= 0; i--) { const ws = addDays(startOfWeek(new Date()), -7 * i); weeks.push({ ws, n: counts.get(isoDate(ws)) || 0 }); }
    const maxV = Math.max(goal, ...weeks.map(w => w.n), 1);
    const wc = $('#weeks-chart');
    wc.innerHTML = '';
    const grid = h('div', { class: 'weeks' });
    weeks.forEach(w => grid.append(h('div', { class: 'wk' + (w.n >= goal ? ' met' : '') },
        w.n ? h('span', { class: 'v' }, String(w.n)) : null,
        h('div', { class: 'col', style: `height:${(w.n / maxV * 84).toFixed(0)}px` }),
        h('span', { class: 'lb' }, `${w.ws.getMonth() + 1}.${w.ws.getDate()}.`))));
    grid.append(h('div', { class: 'goal-line', style: `bottom:${(22 + goal / maxV * 84).toFixed(0)}px` }, h('span', {}, `cél: ${goal}`)));
    wc.append(grid);

    /* --- izomcsoportok, 30 nap --- */
    const cutoff30 = isoDate(addDays(new Date(), -30));
    const dist = new Map();
    let cardioN = 0, cardioMin = 0;
    for (const w of an.list) {
        if (w.date < cutoff30) continue;
        if (w.isCardio) { cardioN++; cardioMin += num(w.time) || 0; continue; }
        const g = w.muscleGroup || 'Egyéb';
        dist.set(g, (dist.get(g) || 0) + 1);
    }
    const md = $('#muscle-dist');
    md.innerHTML = '';
    const rows = [...dist.entries()].sort((a, b) => b[1] - a[1]);
    const maxD = rows.length ? rows[0][1] : 1;
    if (!rows.length) md.append(h('div', { class: 'empty' }, 'Az elmúlt 30 napban nincs mentett sorozat.'));
    rows.forEach(([g, n]) => md.append(h('div', { class: `hbar ${mcls(g)}` },
        h('span', { class: 'nm' }, g), h('div', { class: 'tr' }, h('i', { style: `width:${(n / maxD * 100).toFixed(0)}%` })), h('span', { class: 'ct' }, String(n)))));
    if (cardioN) md.append(h('p', { class: 'data-info', style: 'margin:12px 0 0' }, `Kardió: ${cardioN} alkalom, ${fmt(cardioMin)} perc`));
}

/* =========================================================
   TEST
   ========================================================= */
const BODY_FIELDS = [
    { k: 'weight', label: 'Súly', unit: 'kg', id: 'body-weight' },
    { k: 'fat', label: 'Testzsír', unit: '%', id: 'body-fat' },
    { k: 'chest', label: 'Mellkas', unit: 'cm', id: 'body-chest' },
    { k: 'arm', label: 'Kar', unit: 'cm', id: 'body-arm' },
    { k: 'waist', label: 'Derék', unit: 'cm', id: 'body-waist' },
    { k: 'thigh', label: 'Comb', unit: 'cm', id: 'body-thigh' }
];
let bodyMetric = 'weight', editingBodyId = null;

const bodySorted = () => [...getBody()].filter(r => r && r.date).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id || 0) - (b.id || 0));
function metricSeries(k) {
    return bodySorted().map(r => ({ date: r.date, v: num(r[k]) })).filter(p => p.v !== null);
}
function deltaEl(cur, prev, unit) {
    if (prev === undefined || prev === null) return h('span', { class: 'delta' }, 'első mérés');
    const d = Math.round((cur - prev) * 10) / 10;
    if (d === 0) return h('span', { class: 'delta' }, 'nem változott');
    return h('span', { class: 'delta ' + (d > 0 ? 'up' : 'down') }, `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))} ${unit}`);
}

function renderBody() {
    const hero = $('#body-hero');
    hero.innerHTML = '';
    const recs = bodySorted();
    if (!recs.length) {
        hero.append(h('div', { class: 'empty' }, h('b', {}, 'Még nincs mérésed'), 'Rögzítsd az első mérésed, és itt követheted a változást.'));
    } else {
        const w = metricSeries('weight');
        const lastW = w[w.length - 1];
        hero.append(h('div', { class: 'body-main' },
            h('div', {}, h('div', { class: 'lab' }, lastW ? `Súly, ${shortDate(lastW.date)}` : 'Testsúly'),
                h('div', { class: 'big' }, lastW ? fmt(lastW.v) : '–', lastW ? h('small', {}, 'kg') : null)),
            lastW ? deltaEl(lastW.v, w.length > 1 ? w[w.length - 2].v : null, 'kg') : null));
        const grid = h('div', { class: 'body-grid' });
        BODY_FIELDS.filter(f => f.k !== 'weight').forEach(f => {
            const s = metricSeries(f.k), last = s[s.length - 1];
            grid.append(h('div', { class: 'bm' }, h('div', { class: 'l' }, f.label),
                h('b', {}, last ? fmt(last.v) : '–', last ? h('small', {}, ` ${f.unit}`) : null),
                last ? deltaEl(last.v, s.length > 1 ? s[s.length - 2].v : null, f.unit) : h('span', { class: 'delta' }, 'nincs adat')));
        });
        hero.append(grid);
    }

    segButtons($('#body-metric-seg'), BODY_FIELDS.map(f => [f.k, f.label]), bodyMetric, v => { bodyMetric = v; renderBody(); }, 'accent');
    $$('#body-metric-seg .chip').forEach(c => { c.style.flex = 'none'; });
    const f = BODY_FIELDS.find(x => x.k === bodyMetric);
    const data = metricSeries(bodyMetric).map(p => ({ t: parseISO(p.date).getTime(), v: p.v, label: shortDate(p.date) }));
    drawLine($('#body-chart'), $('#body-readout'), data, { unit: f.unit, rangeLabel: 'összesen' });

    const list = $('#body-list');
    list.innerHTML = '';
    if (!recs.length) list.append(h('div', { class: 'empty' }, 'Itt jelennek meg a korábbi méréseid.'));
    [...recs].reverse().forEach(r => {
        const pills = BODY_FIELDS.filter(x => num(r[x.k]) !== null).map(x => h('span', { class: 'pill' }, h('small', {}, x.label), h('span', {}, fmt(num(r[x.k]))), h('small', {}, x.unit)));
        list.append(h('div', { class: 'rec' },
            h('button', { type: 'button', class: 'rec-main', style: 'text-align:left', onClick: () => openBodySheet(r.id) },
                h('div', { class: 'rec-date' }, prettyDate(r.date)), h('div', { class: 'pill-row' }, pills)),
            h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Mérés törlése', html: icon('trash', 'sm'), onClick: () => deleteBody(r.id) })));
    });
}

function deleteBody(id) {
    const all = getBody(), rec = all.find(r => r.id === id);
    if (!rec) return;
    setBody(all.filter(r => r.id !== id));
    renderBody();
    toast('Mérés törölve', { action: 'Visszavonás', onAction: () => { setBody([...getBody(), rec]); renderBody(); } });
}

function openBodySheet(id = null) {
    editingBodyId = id;
    const rec = id ? getBody().find(r => r.id === id) : null;
    $('#body-sheet-title').textContent = rec ? 'Mérés szerkesztése' : 'Új mérés';
    $('#body-date').value = rec ? rec.date : isoDate();
    BODY_FIELDS.forEach(f => { $('#' + f.id).value = rec && num(rec[f.k]) !== null ? raw(num(rec[f.k])) : ''; });
    openSheet('sheet-body');
}
function initBody() {
    $('#open-body-sheet').addEventListener('click', () => openBodySheet());
    $('#body-form').addEventListener('submit', e => {
        e.preventDefault();
        const date = $('#body-date').value || isoDate();
        const vals = {};
        BODY_FIELDS.forEach(f => { const v = $('#' + f.id).value; vals[f.k] = v === '' ? '-' : v; });
        if (BODY_FIELDS.every(f => vals[f.k] === '-')) { toast('Adj meg legalább egy értéket.'); return; }
        const all = getBody();
        let target = editingBodyId ? all.find(r => r.id === editingBodyId) : all.find(r => r.date === date);
        if (target) {
            if (editingBodyId) Object.assign(target, { date, ...vals });
            else BODY_FIELDS.forEach(f => { if (vals[f.k] !== '-') target[f.k] = vals[f.k]; });
        } else {
            all.push({ id: uid(), date, ...vals });
        }
        setBody(all);
        closeSheet('sheet-body');
        renderBody();
        toast('Mérés mentve.');
    });
}

/* =========================================================
   BEÁLLÍTÁSOK, MENTÉS, BETÖLTÉS
   ========================================================= */
function renderSettings() {
    const g = $('#settings-group');
    g.innerHTML = '';
    const item = (title, desc, control) => h('div', { class: 'set-item' }, h('div', {}, h('div', { class: 't' }, title), desc ? h('div', { class: 'd' }, desc) : null), control);
    const stepper = (get, min, max, step, show, set) => {
        const val = h('b', {}, show(get()));
        return h('div', { class: 'mini-stepper' },
            h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Csökkentés', html: icon('minus', 'sm'), onClick: () => { set(Math.max(min, get() - step)); val.textContent = show(get()); } }),
            val,
            h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': 'Növelés', html: icon('plus', 'sm'), onClick: () => { set(Math.min(max, get() + step)); val.textContent = show(get()); } }));
    };
    const toggle = key => {
        const b = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!settings[key]) });
        b.addEventListener('click', () => {
            settings[key] = !settings[key];
            b.setAttribute('aria-checked', String(settings[key]));
            saveSettings();
            if (key === 'wakeLock') updateWakeLock();
            if (key === 'sound' && settings.sound) { ensureAudio(); buzz(20); }
        });
        return b;
    };
    g.append(
        item('Heti edzéscél', 'Ennyi edzésnap számít teljesítettnek', stepper(() => settings.weeklyGoal, 1, 7, 1, v => `${v}`, v => { settings.weeklyGoal = v; saveSettings(); renderWeek(); })),
        item('Alap pihenőidő', 'Ennyi indul a sorozat kipipálásakor', stepper(() => settings.restSeconds, 15, 600, 15, fmtDur, v => {
            settings.restSeconds = v; saveSettings();
            if (!T.cd.running) { T.cd.total = v; T.cd.left = v * 1000; T.cd.finished = false; persistTimers(); renderTimers(); }
        })),
        item('Pihenő automatikus indítása', 'Sorozat kipipálásakor elindul az időzítő', toggle('autoRest')),
        item('Hang és rezgés', 'Jelzés, amikor letelik a pihenő', toggle('sound')),
        item('Képernyő ébren tartása', 'Amíg az app nyitva van, nem alszik el a kijelző', toggle('wakeLock')));

    const last = LS.get('lastExport', 0);
    $('#data-info').textContent = `${getWorkouts().length} mentett sorozat és ${getBody().length} mérés. ` +
        (last ? `Utolsó mentés: ${shortDate(isoDate(new Date(last)))}.` : 'Még nem készítettél mentést.');
}

async function shareOrDownload(blob, filename) {
    try {
        const file = new File([blob], filename, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Edzésnapló' });
            return true;
        }
    } catch (e) { if (e && e.name === 'AbortError') return false; }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
}

async function exportJSON() {
    const data = { app: 'edzesnaplo', version: 2, exportedAt: new Date().toISOString(),
        workouts: getWorkouts(), bodyRecords: getBody(), templates: getTemplates(), exercises: getExercises() };
    const ok = await shareOrDownload(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `edzesnaplo_mentes_${isoDate()}.json`);
    if (ok) { LS.set('lastExport', Date.now()); renderSettings(); if (currentTab === 'history') renderHistory(); toast('Mentés kész.'); }
}
async function exportCSV() {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const n = v => (num(v) === null ? '' : String(num(v)).replace('.', ','));
    const rows = [['Dátum', 'Izomcsoport', 'Gyakorlat', 'Súly (kg)', 'Ismétlés', 'Idő (perc)', 'Sebesség (km/h)', 'Dőlés', 'Megjegyzés'].join(';')];
    sortedWorkouts().forEach(w => rows.push([w.date, q(w.muscleGroup), q(w.exercise), n(w.weight), n(w.reps), n(w.time), n(w.speed), q(w.incline), q(w.note)].join(';')));
    await shareOrDownload(new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv' }), `edzesnaplo_${isoDate()}.csv`);
}

async function handleImport(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { toast('Ezt a fájlt nem tudtam beolvasni.'); return; }
    const inW = Array.isArray(data) ? data : (data && Array.isArray(data.workouts) ? data.workouts : null);
    if (!inW) { toast('Ez nem edzésnapló mentés.'); return; }
    const inB = data && Array.isArray(data.bodyRecords) ? data.bodyRecords : [];
    const inT = data && Array.isArray(data.templates) ? data.templates : [];
    const inE = data && data.exercises && typeof data.exercises === 'object' && !Array.isArray(data.exercises) ? data.exercises : null;

    const wIds = new Set(getWorkouts().map(w => w.id));
    const newW = [];
    inW.filter(validWorkout).forEach(w => {
        const rec = w.id == null ? { ...w, id: uid() } : w;
        if (!wIds.has(rec.id)) { wIds.add(rec.id); newW.push(rec); }
    });
    const bIds = new Set(getBody().map(r => r.id));
    const newB = inB.filter(r => r && r.date && !bIds.has(r.id));
    const tNames = new Set(getTemplates().map(t => t.name));
    const newT = inT.filter(t => t && t.name && Array.isArray(t.exercises) && !tNames.has(t.name));
    if (!newW.length && !newB.length && !newT.length) { toast('Nincs új adat a fájlban.'); return; }

    const ok = await confirmDialog(`${newW.length} új sorozat, ${newB.length} új mérés és ${newT.length} új sablon kerül a naplóba. A meglévő adataid megmaradnak.`, { title: 'Betöltés', ok: 'Betöltés' });
    if (!ok) return;
    setWorkouts([...getWorkouts(), ...newW]);
    if (newB.length) setBody([...getBody(), ...newB]);
    if (newT.length) setTemplates([...getTemplates(), ...newT]);
    if (inE) {
        const ex = getExercises();
        for (const g in inE) {
            if (!Array.isArray(inE[g])) continue;
            ex[g] = ex[g] || [];
            inE[g].forEach(n => { if (typeof n === 'string' && !ex[g].some(x => x.toLowerCase() === n.toLowerCase())) ex[g].push(n); });
        }
        setExercises(ex);
    }
    closeAllSheets();
    renderQuickExercises(); renderExerciseDatalist();
    refreshAll();
    toast(`Betöltve: ${newW.length} sorozat, ${newB.length} mérés.`);
}

function initSettings() {
    $('#open-settings').addEventListener('click', () => { renderSettings(); openSheet('sheet-settings'); });
    $('#export-btn').addEventListener('click', exportJSON);
    $('#csv-btn').addEventListener('click', exportCSV);
    $('#nudge-backup').addEventListener('click', exportJSON);
    $('#import-btn').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) handleImport(f); });
}

/* =========================================================
   FÜLEK, FRISSÍTÉS, INDÍTÁS
   ========================================================= */
function switchTab(tab) {
    currentTab = tab;
    $$('.app-view').forEach(v => v.classList.toggle('hidden', v.id !== 'view-' + tab));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'history') renderHistory();
    if (tab === 'stats') renderStats();
    if (tab === 'body') renderBody();
    window.scrollTo(0, 0);
}

function refreshAll() {
    renderTop(); renderWeek(); renderTemplates(); renderDayLog(); renderExerciseDatalist();
    updateLastBox(); refreshPlaceholders();
    if (currentTab === 'history') renderHistory();
    if (currentTab === 'stats') renderStats();
    if (currentTab === 'body') renderBody();
    if (currentDay && openSheets.has('sheet-day')) renderDaySheet(currentDay);
}

function init() {
    initTimerUI();
    initLogger();
    initTemplates();
    initEditSheet();
    initBody();
    initSettings();

    $$('.nav-item').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    $('#backdrop').addEventListener('click', closeAllSheets);
    document.addEventListener('click', e => {
        const c = e.target.closest('[data-close]');
        if (c) closeSheet(c.closest('.sheet').id);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && openSheets.size) closeSheet([...openSheets].pop());
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') { updateWakeLock(); renderTop(); renderWeek(); renderTimers(); }
    });

    renderTop(); renderWeek(); renderExerciseDatalist();
    renderSession();
    renderDayLog();
    updateWakeLock();

    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

init();
