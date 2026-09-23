/* cloud: облачные сохранения по логину и паролю (Supabase). Только Тест.
 * Сервер — Тест/облако/supabase.sql. Сейв — тот же JSON, что «Экспорт сейва» (collectFullSave / applyFullSave).
 * Пока вошёл: раз в 30 с и при сворачивании окна изменения уходят в облако.
 * Если в облаке сейв новее того, от которого играешь (другой компьютер), ничего не затираем — спрашиваем. */
(function () {
  'use strict';

  const LS_KEY = 'mkCloud_v1';
  const LS_DEVICE = 'mkCloudDevice_v1';
  const SYNC_MS = 30000;
  const cfg = window.MK_CLOUD || {};
  const baseUrl = String(cfg.url || '').trim().replace(/\/+$/, '');
  const apiKey = String(cfg.anonKey || '').trim();

  const ERR = {
    mk_bad_login: 'Логин: от 3 до 24 символов — буквы, цифры, _ . -',
    mk_short_password: 'Пароль — не короче 6 символов',
    mk_login_taken: 'Такой логин уже занят',
    mk_bad_credentials: 'Неверный логин или пароль',
    mk_locked: 'Слишком много неверных попыток — подожди 5 минут',
    mk_bad_session: 'Вход устарел — войди снова',
    mk_save_too_big: 'Сейв слишком большой для облака',
    network: 'Нет связи с облаком',
  };

  /* ключ service_role / secret даёт полный доступ к базе — в игре его быть не должно */
  function keyProblem() {
    if (!baseUrl || !apiKey) return 'off';
    if (/^sb_secret_/i.test(apiKey)) return 'secret';
    if (/^eyJ/.test(apiKey)) {
      try {
        const payload = JSON.parse(atob(apiKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload && payload.role === 'service_role') return 'secret';
      } catch (_) {}
    }
    return '';
  }
  const problem = keyProblem();
  const enabled = !problem;

  let st = readState();
  let busy = false;
  let online = true;

  function readState() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch (_) { return {}; }
  }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (_) {}
  }
  function say(msg) { try { if (typeof toast === 'function') toast(msg); } catch (_) {} }
  function loggedIn() { return !!(st.login && st.token); }

  function deviceName() {
    let id = '';
    try { id = localStorage.getItem(LS_DEVICE) || ''; } catch (_) {}
    if (!id) {
      id = Math.random().toString(16).slice(2, 6).toUpperCase();
      try { localStorage.setItem(LS_DEVICE, id); } catch (_) {}
    }
    const launcher = location.port === '47619' || location.port === '47620';
    return (launcher ? 'Лаунчер' : 'Браузер') + ' · ' + id;
  }

  function when(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    const today = new Date().toDateString() === d.toDateString();
    return today
      ? 'сегодня в ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  class CloudError extends Error {
    constructor(code) { super(ERR[code] || code); this.code = code; }
  }

  async function rpc(fn, args) {
    const headers = { 'Content-Type': 'application/json', apikey: apiKey };
    if (/^eyJ/.test(apiKey)) headers.Authorization = 'Bearer ' + apiKey; /* старый формат ключа */
    let r;
    try {
      r = await fetch(baseUrl + '/rest/v1/rpc/' + fn, { method: 'POST', headers, body: JSON.stringify(args) });
    } catch (_) {
      online = false;
      throw new CloudError('network');
    }
    online = true;
    let body = null;
    try { body = await r.json(); } catch (_) {}
    if (!r.ok) {
      const code = (body && body.message) || ('HTTP ' + r.status);
      if (r.status === 404) throw new CloudError('Облако не настроено: выполни Тест/облако/supabase.sql в Supabase');
      throw new CloudError(code);
    }
    if (body && body.error) throw new CloudError(body.error);
    return body;
  }

  /* ── сейв ── */
  /* отпечаток сейва без даты экспорта: одинаковый сейв — одинаковый отпечаток */
  function hashOf(data) {
    const s = JSON.stringify(Object.assign({}, data, { exportedAt: null }));
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16) + ':' + s.length;
  }
  function snapshot() {
    const data = collectFullSave();
    return { data, hash: hashOf(data) };
  }

  function hasLocalProgress(d) {
    return !!(d && (d.run || (d.history && d.history.length) || d.bestKey > 0 || d.igorHero
      || (d.profile && Array.isArray(d.profile.party) && d.profile.party.length)));
  }

  function runInProgress() {
    try { return typeof run !== 'undefined' && run && !run.finished; } catch (_) { return false; }
  }

  function dropSession(msg) {
    st = {};
    saveState();
    render();
    if (msg) say(msg);
  }

  /* opts.now — отправить, даже если не менялось; opts.overwrite — заменить облако, даже если там новее.
     true — облако совпадает с этим компьютером. */
  async function push(opts) {
    opts = opts || {};
    if (!enabled || !loggedIn() || busy) return false;
    if (st.conflict && !opts.overwrite) return false;
    const snap = snapshot();
    if (!opts.now && !opts.overwrite && snap.hash === st.lastHash) return true;
    busy = true;
    let ok = false;
    try {
      const r = await rpc('mk_save_put', {
        p_token: st.token, p_data: snap.data, p_device: deviceName(), p_base: st.base || null, p_force: !!opts.overwrite,
      });
      if (r && r.conflict) {
        st.conflict = { updated_at: r.updated_at, device: r.device || '' };
      } else if (r && r.ok) {
        st.base = r.updated_at;
        st.lastHash = snap.hash;
        st.conflict = null;
        st.lastSync = r.updated_at;
        ok = true;
      }
      saveState();
    } catch (e) {
      if (e.code === 'mk_bad_session') dropSession(ERR.mk_bad_session);
      else if (opts.now || opts.overwrite) say(e.message);
    } finally {
      busy = false;
      render();
    }
    if (st.conflict && opts.now) openChoice();
    return ok;
  }

  async function pull() {
    if (runInProgress()) { say('Сначала закончи или сдай ключ — потом загружай из облака'); return; }
    busy = true;
    render();
    try {
      const g = await rpc('mk_save_get', { p_token: st.token });
      if (!g || !g.data) { say('В облаке пока пусто'); return; }
      applyFullSave(g.data);
      st.base = g.updated_at;
      st.lastSync = g.updated_at;
      st.conflict = null;
      st.lastHash = snapshot().hash;
      saveState();
      say('Загружено из облака: ' + when(g.updated_at));
    } catch (e) {
      if (e.code === 'mk_bad_session') dropSession(ERR.mk_bad_session);
      else say(e.message);
    } finally {
      busy = false;
      render();
    }
  }

  /* после входа: облако пустое → отправить своё; тут пусто → взять из облака; оба есть и разные → спросить */
  async function afterLogin() {
    const g = await rpc('mk_save_get', { p_token: st.token });
    const local = snapshot();
    if (!g || !g.data) {
      st.base = null;
      saveState();
      if (await push({ now: true })) say('Вошёл. Сейв отправлен в облако');
      return;
    }
    if (!hasLocalProgress(local.data) && !runInProgress()) {
      busy = false;
      await pull();
      return;
    }
    if (hashOf(g.data) === local.hash) {
      st.base = g.updated_at;
      st.lastHash = local.hash;
      st.lastSync = g.updated_at;
      saveState();
      say('Вошёл. Облако и этот компьютер совпадают');
      return;
    }
    st.base = null; /* не видели этот облачный сейв своими глазами — запись без спроса не пройдёт */
    st.conflict = { updated_at: g.updated_at, device: g.device || '', firstLogin: true };
    saveState();
    openChoice();
  }

  /* ── интерфейс ── */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(text, onClick, cls) {
    const b = el('button', 'btn btn-sm' + (cls ? ' ' + cls : ''), text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function box() {
    let b = document.getElementById('cloud-box');
    if (b) return b;
    const anchor = document.getElementById('save-io-hint') || document.getElementById('save-io');
    if (!anchor) return null;
    b = el('div', 'cloud-box');
    b.id = 'cloud-box';
    anchor.insertAdjacentElement('afterend', b);
    return b;
  }

  function render() {
    const b = box();
    if (!b) return;
    b.textContent = '';
    const head = el('div', 'cloud-head');
    const dot = el('span', 'cloud-dot');
    const line = el('span', 'cloud-line');
    head.append(dot, line);
    b.append(head);
    const row = el('div', 'cloud-actions');
    if (problem === 'off') {
      b.dataset.state = 'off';
      line.textContent = 'Облако: не подключено';
      b.append(el('p', 'cloud-note', 'Сейв живёт только на этом компьютере. Как подключить — Тест/облако/README.md'));
      return;
    }
    if (problem === 'secret') {
      b.dataset.state = 'error';
      line.textContent = 'Облако выключено: в cloud-config.js секретный ключ';
      b.append(el('p', 'cloud-note', 'Нужен ключ «anon public» / «publishable», не service_role и не secret.'));
      return;
    }
    if (!loggedIn()) {
      b.dataset.state = 'out';
      line.textContent = 'Облако: не вошёл';
      row.append(btn('Войти или создать аккаунт', openLogin, 'btn-ok'));
      b.append(row);
      return;
    }
    if (st.conflict) {
      b.dataset.state = 'conflict';
      line.textContent = 'Облако: ' + st.login + ' · ждёт решения';
      b.append(el('p', 'cloud-note',
        'В облаке другой сейв' + (st.conflict.device ? ' («' + st.conflict.device + '»)' : '') + ' от ' + when(st.conflict.updated_at)
        + '. Пока не выберешь, этот компьютер в облако не пишет.'));
      row.append(btn('Выбрать…', openChoice, 'btn-ok'));
      row.append(btn('Выйти', logout));
      b.append(row);
      return;
    }
    b.dataset.state = online ? 'ok' : 'offline';
    line.textContent = 'Облако: ' + st.login + ' · ' + (busy ? 'синхронизация…'
      : !online ? 'нет связи, сейв ждёт'
        : st.lastSync ? 'сохранено ' + when(st.lastSync) : 'ещё не сохраняли');
    row.append(btn('Сохранить сейчас', async () => { if (await push({ now: true })) say('Сохранено в облако'); }));
    row.append(btn('Загрузить из облака', pull));
    row.append(btn('Выйти', logout));
    b.append(row);
  }

  function modal() {
    let m = document.getElementById('cloud-modal');
    if (m) return m;
    m = el('div', 'modal-back hidden');
    m.id = 'cloud-modal';
    const card = el('div', 'modal cloud-modal');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    m.append(card);
    m.addEventListener('click', (e) => { if (e.target === m && !(st.conflict && st.conflict.firstLogin)) closeModal(); });
    document.body.append(m);
    return m;
  }
  function closeModal() {
    const m = document.getElementById('cloud-modal');
    if (m) m.classList.add('hidden');
  }

  function openLogin() {
    const m = modal();
    const card = m.firstChild;
    card.textContent = '';
    card.append(el('h2', null, 'Облачное сохранение'));
    card.append(el('p', 'hint', 'Логин и пароль — сейв поедет за тобой на любой компьютер. Почта не нужна.'));
    const form = el('form', 'cloud-form');
    const lblL = el('label', null, 'Логин');
    const inL = el('input');
    inL.id = 'cloud-login';
    inL.autocomplete = 'username';
    inL.maxLength = 24;
    inL.required = true;
    inL.value = st.lastLogin || '';
    lblL.htmlFor = 'cloud-login';
    const lblP = el('label', null, 'Пароль');
    const inP = el('input');
    inP.id = 'cloud-pass';
    inP.type = 'password';
    inP.autocomplete = 'current-password';
    inP.required = true;
    lblP.htmlFor = 'cloud-pass';
    const err = el('p', 'cloud-err');
    err.setAttribute('role', 'alert');
    const actions = el('div', 'cloud-actions');
    const bIn = el('button', 'btn btn-ok', 'Войти');
    bIn.type = 'submit';
    const bReg = el('button', 'btn', 'Создать аккаунт');
    bReg.type = 'button';
    const bCancel = el('button', 'btn', 'Отмена');
    bCancel.type = 'button';
    bCancel.addEventListener('click', closeModal);
    actions.append(bIn, bReg, bCancel);
    form.append(lblL, inL, lblP, inP, err, actions);
    card.append(form);
    card.append(el('p', 'cloud-note', 'Логин: 3–24 символа, буквы, цифры, _ . -  Пароль: от 6 символов. Пароль хранится в облаке только хешем.'));

    async function go(register) {
      err.textContent = '';
      const login = inL.value.trim();
      const pass = inP.value;
      if (!login || !pass) { err.textContent = 'Введи логин и пароль'; return; }
      bIn.disabled = bReg.disabled = true;
      try {
        const r = await rpc(register ? 'mk_register' : 'mk_login', { p_login: login, p_password: pass });
        st = { login: r.login, token: r.token, lastLogin: r.login };
        saveState();
        closeModal();
        render();
        await afterLogin().catch((e2) => say(e2.message));
      } catch (e) {
        err.textContent = e.message;
      } finally {
        bIn.disabled = bReg.disabled = false;
        render();
      }
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); go(false); });
    bReg.addEventListener('click', () => { inP.autocomplete = 'new-password'; go(true); });
    m.classList.remove('hidden');
    setTimeout(() => (inL.value ? inP : inL).focus(), 30);
  }

  function openChoice() {
    if (!st.conflict) return;
    const m = modal();
    const card = m.firstChild;
    card.textContent = '';
    card.append(el('h2', null, 'Какой сейв оставить?'));
    const c = st.conflict;
    card.append(el('p', 'hint', 'В облаке и на этом компьютере разные сейвы. Второй будет заменён.'));
    /* section, а не div: правило игры «.modal > div» с !important обвело бы их рамкой */
    const grid = el('section', 'cloud-choice');
    const cloudCard = el('div', 'cloud-opt');
    cloudCard.append(el('b', null, 'В облаке'));
    cloudCard.append(el('span', null, (c.device ? c.device + ' · ' : '') + when(c.updated_at)));
    const localCard = el('div', 'cloud-opt');
    localCard.append(el('b', null, 'На этом компьютере'));
    localCard.append(el('span', null, runInProgress() ? 'идёт ключ — загрузить облако можно после него' : 'текущий отряд, шмот и история'));
    grid.append(cloudCard, localCard);
    card.append(grid);
    const actions = el('section', 'cloud-actions');
    const bCloud = btn('Взять из облака', async () => { closeModal(); await pull(); });
    bCloud.classList.add('btn-ok');
    if (runInProgress()) bCloud.disabled = true;
    const bLocal = btn('Оставить этот (заменить облако)', async () => {
      closeModal();
      if (await push({ overwrite: true })) say('Облако заменено сейвом с этого компьютера');
    });
    actions.append(bCloud, bLocal);
    if (!c.firstLogin) actions.append(btn('Решу позже', closeModal));
    card.append(actions);
    m.classList.remove('hidden');
  }

  async function logout() {
    const token = st.token;
    const last = st.login;
    if (loggedIn() && !st.conflict) await push();
    st = { lastLogin: last };
    saveState();
    render();
    say('Вышел из облака. Сейв на этом компьютере остался');
    if (token) rpc('mk_logout', { p_token: token }).catch(() => {});
  }

  /* ── запуск ── */
  function boot() {
    render();
    if (!enabled) return;
    setInterval(() => { if (loggedIn()) push(); }, SYNC_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && loggedIn()) push();
    });
    if (loggedIn() && st.conflict) openChoice();
    else if (loggedIn()) push();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.mkCloud = { push, pull, openLogin, state: () => Object.assign({}, st), enabled };
})();
