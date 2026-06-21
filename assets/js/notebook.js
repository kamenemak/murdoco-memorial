const NOTEBOOK = (() => {
  'use strict';

  const DOC_ID  = (typeof config !== 'undefined') ? String(config.googleDocsId  || '').trim() : '';
  const API_KEY = (typeof config !== 'undefined') ? String(config.googleApiKey  || '').trim() : '';
  const PROXY   = 'https://api.allorigins.win/get?url=';

  const MIN_W = 280, MAX_W = 420;
  const RATIO = 1.414;

  // Padding inside each page (must match CSS .page__inner padding)
  const PAD_X = 48;   // left(24) + right(24)
  const PAD_Y = 72;   // top(24) + bottom(48) — bottom leaves room for page number

  let pageFlip      = null;
  let lastHtml      = '';
  let lastBucket    = '';
  let currentPage   = 0;
  let totalPagesG   = 0;
  let isPortrait    = false;
  let didFirstFit   = false;   // re-paginación automática solo en la primera carga

  // ── Helpers ─────────────────────────────────────────────────────────

  function pageSize() {
    const ctr = document.getElementById('book-container');
    let avail = ctr ? (ctr.clientWidth - 64) : (window.innerWidth - 80);
    if (avail < 50) avail = window.innerWidth - 80;
    const twoPage = avail >= MIN_W * 2;
    const w = Math.min(MAX_W, Math.max(MIN_W, twoPage ? Math.floor(avail / 2) : avail));
    const h = Math.round(w * RATIO);
    return { w, h, twoPage, bucket: `${twoPage}:${Math.round(w / 20)}` };
  }

  // ── Fetch ────────────────────────────────────────────────────────────

  const PUB_URL = 'https://docs.google.com/document/d/e/2PACX-1vQzq57f9HHTAErCHk8daedFGSsTa06yYmZ03hPBP2oYb2DQ1IdYLSlBpp9eHAcVfHkK_DYEgNfcmplP/pub';

  let APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwyB1UKUjmFz5lyrbom-t8S4bmh0h_n72rb1LO9sn7SjcPvXkUPlX87fXH3GZ-NjRJX/exec';

  async function fetchDoc() {
    return new Promise((resolve, reject) => {
      const cbName = '__nb_cb_' + Date.now();
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        window[cbName] = () => {};   // no-op: deja el callback vivo por si llega tarde
        script.remove();
        reject(new Error('JSONP timeout'));
      }, 60000);

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        script.remove();
      }

      window[cbName] = html => {
        cleanup();
        if (html && html.length > 100) resolve(html);
        else reject(new Error('Respuesta vacía'));
      };

      script.onerror = () => { cleanup(); reject(new Error('JSONP error')); };
      script.src = APPS_SCRIPT_URL + '?callback=' + cbName;
      document.head.appendChild(script);
    });
  }

  // ── Parse ────────────────────────────────────────────────────────────

  function parseBlocks(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const blocks = [];
    for (const n of doc.body.children) {
      blocks.push(n);
    }
    return blocks;
  }

  // ── Paginate ─────────────────────────────────────────────────────────

  async function paginate(blocks) {
    const { w, h } = pageSize();
    const cW = w - PAD_X;
    const cH = h - PAD_Y;

    const measurer = document.createElement('div');
    measurer.id = '__nb_measurer';
    measurer.style.cssText = [
      'position:absolute', 'left:-9999px', 'top:0', 'visibility:hidden',
      `width:${cW}px`, `height:${cH}px`,
      'overflow:hidden', 'box-sizing:border-box',
      "font-family:'Georgia',serif", 'font-size:0.92rem', 'line-height:1.75',
      'word-break:break-word',
    ].join(';');
    const measurerStyle = document.createElement('style');
    // Forzamos height explícito en imágenes para que el measurer las cuente correctamente
    // antes de que el navegador las pinte (evita que Safari iOS las mida en 0px)
    measurerStyle.textContent = '#__nb_measurer img{width:55%;height:160px;max-width:55%;max-height:160px;object-fit:contain;display:block;}';
    document.head.appendChild(measurerStyle);
    document.body.appendChild(measurer);

    try {
      await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]);
    } catch (_) {}

    if (measurer.clientHeight < 40) {
      measurer.remove();
      return paginateByChars(blocks);
    }

    const fits  = () => measurer.scrollHeight <= measurer.clientHeight + 2;
    const pages = [];
    let current = '';

    const flush = html => {
      const v = html !== undefined ? html : current;
      if (v.trim()) pages.push(v);
      current = '';
    };

    for (const block of blocks) {
      if (block.tagName === 'HR') { flush(); continue; }

      const html = block.outerHTML || '';
      measurer.innerHTML = current + html;

      if (fits()) {
        current += html;
        continue;
      }

      // Doesn't fit — close current page and try block alone
      flush();
      measurer.innerHTML = html;

      if (fits()) {
        current = html;
        continue;
      }

      // Bloque con imagen (suelta o envuelta en párrafo): va sola en su página
      if (block.tagName === 'IMG' || (block.querySelector && block.querySelector('img'))) {
        flush(html);
        continue;
      }

      // Block itself overflows — split word by word preserving <br>
      const tag   = /^H[1-6]$/.test(block.tagName) ? block.tagName.toLowerCase() : 'p';
      const BR_TOKEN = '||BR||';
      const words = block.innerHTML
        .replace(/<br\s*\/?>/gi, ' ' + BR_TOKEN + ' ')
        .replace(/<\/\w+>/g, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .split(/\s+/).filter(Boolean);
      let   chunk  = [];

      const joinChunk = c => c.join(' ').replace(/\|\|BR\|\|/g, '<br>');
      for (const word of words) {
        chunk.push(word);
        measurer.innerHTML = `<${tag}>${joinChunk(chunk)}</${tag}>`;
        if (!fits() && chunk.length > 1) {
          chunk.pop();
          flush(`<${tag}>${joinChunk(chunk)}</${tag}>`);
          chunk = [word];
          measurer.innerHTML = `<${tag}>${joinChunk(chunk)}</${tag}>`;
        }
      }
      current = chunk.length ? `<${tag}>${joinChunk(chunk)}</${tag}>` : '';
    }

    flush();
    measurer.remove();
    measurerStyle.remove();
    return pages.length ? pages : ['<p>Sin contenido todavía.</p>'];
  }

  function paginateByChars(blocks, perPage = 800) {
    const pages = [];
    let cur = '';
    for (const n of blocks) {
      if (n.tagName === 'HR') { if (cur.trim()) { pages.push(cur); cur = ''; } continue; }
      const html = n.outerHTML || '';
      if (cur && cur.length + html.length > perPage) { pages.push(cur); cur = html; }
      else cur += html;
    }
    if (cur.trim()) pages.push(cur);
    return pages.length ? pages : ['<p>Sin contenido todavía.</p>'];
  }

  // ── Render ───────────────────────────────────────────────────────────

  function roseSvg(cls) {
    return `<img class="nb-portada-rose ${cls}" src="assets/images/rosa-esquina.webp" alt="" aria-hidden="true">`;
  }

  function buildDom(pageHtmls) {
    const book = document.getElementById('book');
    book.innerHTML = '';

    // ── Portada izquierda (marca de agua con nombre) ──
    const pLeft = document.createElement('div');
    pLeft.className = 'nb-page nb-page--hard nb-portada';
    pLeft.innerHTML = `<div class="nb-portada__inner nb-portada__inner--foto">
      <img class="nb-portada-foto" src="assets/images/SantaMuerte.jpg" alt="Santa Muerte">
    </div>`;
    book.appendChild(pLeft);

    // ── Portada derecha (cover chicana con nombre) ──
    const pRight = document.createElement('div');
    pRight.className = 'nb-page nb-page--hard nb-portada';
    pRight.innerHTML = `<div class="nb-portada__inner nb-portada__inner--right">
      ${roseSvg('nb-portada-rose--tl')}
      ${roseSvg('nb-portada-rose--tr')}
      ${roseSvg('nb-portada-rose--bl')}
      ${roseSvg('nb-portada-rose--br')}
      <div class="nb-portada-frame">
        <div class="nb-portada-name">
          <div class="nb-portada-star-top">★</div>
          <div class="nb-portada-name__line">SEBASTIAN</div>
          <div class="nb-portada-name__line nb-portada-name__line--mid">★ ANTONIO ★</div>
          <div class="nb-portada-name__line">BOBADILLA</div>
          <div class="nb-portada-name__line nb-portada-name__line--mid">★ RIVAS ★</div>
        </div>
      </div>
    </div>`;
    book.appendChild(pRight);

    // ── Páginas de contenido ──
    const totalPages = pageHtmls.length + 4;
    pageHtmls.forEach((html, i) => {
      const div = document.createElement('div');
      div.className = 'nb-page';
      div.innerHTML = `<div class="nb-page__inner">
        <div class="nb-page__content">${html}</div>
        <span class="nb-page__num">${i + 1}</span>
      </div>`;
      book.appendChild(div);
    });

    // ── Contraportada nombre con rosas (espejo de pRight) ──
    const pBack = document.createElement('div');
    pBack.className = 'nb-page nb-page--hard nb-portada';
    pBack.innerHTML = `<div class="nb-portada__inner nb-portada__inner--right">
      ${roseSvg('nb-portada-rose--tl')}
      ${roseSvg('nb-portada-rose--tr')}
      ${roseSvg('nb-portada-rose--bl')}
      ${roseSvg('nb-portada-rose--br')}
      <div class="nb-portada-frame">
        <div class="nb-portada-name">
          <div class="nb-portada-star-top">★</div>
          <div class="nb-portada-name__line">SEBASTIAN</div>
          <div class="nb-portada-name__line nb-portada-name__line--mid">★ ANTONIO ★</div>
          <div class="nb-portada-name__line">BOBADILLA</div>
          <div class="nb-portada-name__line nb-portada-name__line--mid">★ RIVAS ★</div>
        </div>
      </div>
    </div>`;
    book.appendChild(pBack);

    // ── Última hoja: Santa Muerte (espejo de pLeft) ──
    const pBackLeft = document.createElement('div');
    pBackLeft.className = 'nb-page nb-page--hard nb-portada';
    pBackLeft.innerHTML = `<div class="nb-portada__inner nb-portada__inner--foto">
      <img class="nb-portada-foto" src="assets/images/SantaMuerte.jpg" alt="Santa Muerte">
    </div>`;
    book.appendChild(pBackLeft);

    return totalPages;
  }

  function mount(pageHtmls) {
    if (pageFlip) { try { pageFlip.destroy(); } catch (_) {} pageFlip = null; }

    // StPageFlip.destroy() remueve el #book del DOM — recrearlo si hace falta
    if (!document.getElementById('book')) {
      const book = document.createElement('div');
      book.id = 'book';
      document.getElementById('book-container').appendChild(book);
    }

    const totalPages = buildDom(pageHtmls);

    const { w, h } = pageSize();

    pageFlip = new St.PageFlip(document.getElementById('book'), {
      width:   w,
      height:  h,
      size:    'stretch',
      minWidth:  MIN_W,
      maxWidth:  MAX_W,
      minHeight: Math.round(MIN_W * RATIO),
      maxHeight: Math.round(MAX_W * RATIO),
      usePortrait:         true,
      autoSize:            true,
      showCover:           true,
      drawShadow:          true,
      flippingTime:        700,
      maxShadowOpacity:    0.4,
      showPageCorners:     true,
      mobileScrollSupport: false,
      disableFlipByClick:  false,
      swipeDistance:       25,
    });

    pageFlip.loadFromHTML(document.querySelectorAll('#book .nb-page'));

    // Fix reverso blanco de tapas duras generado por StPageFlip con inline style
    setTimeout(() => {
      document.querySelectorAll('#book-container div').forEach(el => {
        if (!el.children.length || el.querySelector('.nb-page__inner, .nb-portada__inner--right, .nb-portada__inner--foto') === null) {
          const bg = window.getComputedStyle(el).backgroundColor;
          if (bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 1)') {
            el.style.backgroundColor = '#2c1f12';
          }
        }
      });
    }, 100);

    currentPage = 0;
    totalPagesG = totalPages;
    isPortrait  = !pageSize().twoPage;

    pageFlip.on('flip', e => {
      currentPage = e.data;
      updateControls(currentPage, totalPages);
    });

    pageFlip.on('changeOrientation', e => {
      isPortrait = e.data === 'portrait';
      document.getElementById('book')
        .classList.toggle('nb--two-page', e.data === 'landscape');
    });
    updateControls(0, totalPages);
    lastBucket = pageSize().bucket;
  }

  function updateControls(cur, total) {
    const ind  = document.getElementById('page-indicator');
    const prev = document.getElementById('btn-prev-page');
    const next = document.getElementById('btn-next-page');
    if (ind)  ind.textContent  = `${cur + 1} / ${total}`;
    if (prev) prev.disabled    = cur === 0;
    if (next) next.disabled    = cur >= total - 1;

  }

  function setStatus(msg, cls) {
    const el = document.getElementById('sync-status');
    if (!el) return;
    el.textContent = msg;
    el.className   = cls || '';
  }

  // ── Load / Reload ────────────────────────────────────────────────────

  // Precarga y decodifica todas las imágenes del HTML antes de paginar/montar,
  // para que StPageFlip las mida correctamente desde la primera carga
  // (sin esto, las imágenes solo aparecen tras pulsar "recargar").
  async function preloadImages(html) {
    const doc  = new DOMParser().parseFromString(html, 'text/html');
    const srcs = Array.from(doc.querySelectorAll('img')).map(i => i.getAttribute('src')).filter(Boolean);
    await Promise.all(srcs.map(src => new Promise(res => {
      const img = new Image();
      img.onload = img.onerror = () => res();
      img.src = src;
    })));
  }

  // Re-pagina y re-monta usando el HTML ya cargado. Es lo mismo que pulsar
  // "recargar", pero sin volver a pedir el documento.
  async function repaginate() {
    if (!lastHtml) return;
    const blocks = parseBlocks(lastHtml);
    const pages  = await paginate(blocks);
    mount(pages);
  }

  async function load() {
    setStatus('Cargando cuaderno…', 'loading');
    try {
      const html   = await fetchDoc();
      lastHtml     = html;
      await preloadImages(html);
      const blocks = parseBlocks(html);
      const pages  = await paginate(blocks);
      mount(pages);
      setStatus('', '');

      // El contenedor puede no estar en su tamaño definitivo en la primera
      // carga, lo que produce menos páginas de las debidas. Una vez que el
      // layout, las fuentes y las imágenes están estables, re-paginamos una
      // sola vez para acomodar todo (equivale a pulsar "recargar").
      if (!didFirstFit) {
        didFirstFit = true;
        requestAnimationFrame(() => requestAnimationFrame(() => { repaginate(); }));
      }
    } catch (err) {
      console.error('[Notebook]', err);
      setStatus('No se pudo cargar el cuaderno. Verifica que el Doc sea público.', 'error');
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────

  function init() {
    if (!document.getElementById('book')) return;

    const goNext = e => {
      e.preventDefault();
      if (!pageFlip) return;
      isPortrait ? pageFlip.flip(currentPage + 1) : pageFlip.flipNext();
    };
    const goPrev = e => {
      e.preventDefault();
      if (!pageFlip) return;
      isPortrait ? pageFlip.flip(currentPage - 1) : pageFlip.flipPrev();
    };

    document.getElementById('btn-prev-page')?.addEventListener('click', goPrev);
    document.getElementById('btn-next-page')?.addEventListener('click', goNext);
    document.getElementById('btn-side-prev')?.addEventListener('click', goPrev);
    document.getElementById('btn-side-next')?.addEventListener('click', goNext);
    document.getElementById('btn-refresh-doc')
      ?.addEventListener('click', e => { e.preventDefault(); load(); });

    document.addEventListener('keydown', e => {
      const sec = document.getElementById('notebook-section');
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) return;
      if (e.key === 'ArrowRight' && pageFlip) isPortrait ? pageFlip.flip(currentPage + 1) : pageFlip.flipNext();
      if (e.key === 'ArrowLeft'  && pageFlip) isPortrait ? pageFlip.flip(currentPage - 1) : pageFlip.flipPrev();
    });

    // Re-paginate on significant resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!lastHtml || !pageFlip) return;
        const { bucket } = pageSize();
        if (bucket === lastBucket) return;
        const blocks = parseBlocks(lastHtml);
        paginate(blocks).then(pages => mount(pages));
      }, 300);
    });

    load();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', NOTEBOOK.init);
