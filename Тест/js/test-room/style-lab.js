/* test-room/style-lab: витрина рисовки, монах по спекам */
(function () {
  const BASE = 'assets/style-lab/monk/brewmaster/';
  const STYLES = [
    { file: '00_card.png', title: 'Карточка', text: 'Как в лобби. Эталон.' },
    { file: '01_pixel.png', title: 'Пиксель', text: 'Перерисовка. Мелкий пиксель-иллюстрация, не крупный SNES как у мага.' },
    { file: '02_outline.png', title: 'Контур', text: 'Жирная обводка, плоские заливки.' },
    { file: '03_ink.png', title: 'Тушь', text: 'Бумага, кисть, размыв.' },
    { file: '04_flat.png', title: 'Плоский', text: 'Вектор, два тона, без меха.' },
    { file: '05_cel.png', title: 'Аниме', text: 'Жёсткий контур и большие глаза. Морда добрее карточки.' },
  ];

  function $(id) { return document.getElementById(id); }

  function renderGrid() {
    const grid = $('style-grid');
    if (!grid) return;
    grid.innerHTML = STYLES.map((s, i) => (
      '<button type="button" class="style-card" data-i="' + i + '">' +
        '<img src="' + BASE + s.file + '" alt="' + s.title + '">' +
        '<b>' + s.title + '</b>' +
        '<span>' + s.text + '</span>' +
      '</button>'
    )).join('');
    grid.querySelectorAll('.style-card').forEach((btn) => {
      btn.addEventListener('click', () => openLb(+btn.dataset.i));
    });
  }

  function openLb(i) {
    const s = STYLES[i];
    if (!s) return;
    const box = $('style-lightbox');
    const img = $('style-lightbox-img');
    const cap = $('style-lightbox-cap');
    if (img) img.src = BASE + s.file;
    if (cap) cap.textContent = s.title + ' · ' + s.text;
    box?.classList.remove('hidden');
    if (box) box.setAttribute('aria-hidden', 'false');
  }

  function closeLb() {
    const box = $('style-lightbox');
    box?.classList.add('hidden');
    if (box) box.setAttribute('aria-hidden', 'true');
  }

  function openStyleLab() {
    if (typeof hideAllMainScreens === 'function') hideAllMainScreens();
    document.getElementById('end-modal')?.classList.add('hidden');
    $('test-style')?.classList.remove('hidden');
    renderGrid();
  }

  function bind() {
    $('btn-style-hub')?.addEventListener('click', () => {
      if (typeof openTestHub === 'function') openTestHub();
    });
    $('btn-style-lb-close')?.addEventListener('click', closeLb);
    $('style-lightbox')?.addEventListener('click', (e) => {
      if (e.target.id === 'style-lightbox') closeLb();
    });
    document.addEventListener('keydown', (e) => {
      const box = $('test-style');
      if (!box || box.classList.contains('hidden')) return;
      if (e.key === 'Escape') {
        if ($('style-lightbox') && !$('style-lightbox').classList.contains('hidden')) closeLb();
        else if (typeof openTestHub === 'function') openTestHub();
      }
    });
  }

  window.openStyleLab = openStyleLab;
  try { bind(); } catch (err) { console.error('[style-lab]', err); }
})();
