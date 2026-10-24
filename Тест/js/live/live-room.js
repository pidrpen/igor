/* live-room: вход в живой бой из лобби. Phaser и скрипты боя грузятся по клику, не при старте игры */
(function () {
  const LIVE_SCRIPTS = [
    'js/vendor/phaser.min.js',
    'js/live/live-inst.js?v=0.9',
    'js/live/live-kits.js?v=0.8',
    'js/live/live-dungeon.js?v=1.2',
    'js/live/live-fight.js?v=1.1',
  ];

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (src.indexOf('phaser.min.js') >= 0 && window.Phaser) { resolve(); return; }
      if (src.indexOf('live-fight.js') >= 0 && window.bootLiveFight) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(src));
      document.head.appendChild(s);
    });
  }

  function showOnly(id) {
    ['lobby', 'run-screen', 'live-screen'].forEach((k) => {
      document.getElementById(k)?.classList.toggle('hidden', k !== id);
    });
    document.getElementById('end-modal')?.classList.add('hidden');
  }

  function openLiveFight() {
    showOnly('live-screen');
    document.body.classList.add('live-open');
    const err = document.getElementById('live-boot-error');
    if (err) { err.textContent = ''; err.classList.add('hidden'); }
    LIVE_SCRIPTS.reduce((p, src) => p.then(() => loadScriptOnce(src)), Promise.resolve())
      .then(() => new Promise((r) => requestAnimationFrame(() => r())))
      .then(() => {
        if (typeof bootLiveFight === 'function') bootLiveFight();
        else throw new Error('bootLiveFight missing');
      })
      .catch((e) => {
        if (!err) return;
        err.textContent = 'Не загрузилось поле. Открой игру через сервер (не file://). ' + (e && e.message ? e.message : '');
        err.classList.remove('hidden');
      });
  }

  function closeLiveFight() {
    try { if (typeof destroyLiveFight === 'function') destroyLiveFight(); } catch (_) {}
    document.body.classList.remove('live-open');
    showOnly('lobby');
  }

  document.getElementById('btn-live-fight')?.addEventListener('click', openLiveFight);
  document.getElementById('btn-live-back')?.addEventListener('click', closeLiveFight);
  if (/[?&]live=1(?:&|$)/.test(location.search || '')) setTimeout(openLiveFight, 0);

  window.openLiveFight = openLiveFight;
  window.closeLiveFight = closeLiveFight;
})();
