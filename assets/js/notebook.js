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

  let pageFlip   = null;
  let lastHtml   = '';
  let lastBucket = '';

  // ── Helpers ─────────────────────────────────────────────────────────

  function pageSize() {
    const ctr = document.getElementById('book-container');
    let avail = ctr ? (ctr.clientWidth - 64) : (window.innerWidth - 80);
    if (avail < 50) avail = window.innerWidth - 80;
    const twoPage = avail >= MIN_W * 2;
    const w = Math.min(MAX_W, Math.max(MIN_W, twoPage ? Math.floor(avail / 2) : avail));
    const h = Math.round(w * RATIO);
    return { w, h, bucket: `${twoPage}:${Math.round(w / 20)}` };
  }

  // ── Fetch ────────────────────────────────────────────────────────────

  async function fetchDoc() {
    if (API_KEY) {
      try {
        const url = `https://www.googleapis.com/drive/v3/files/${DOC_ID}/export?mimeType=text/html&key=${API_KEY}`;
        const r = await fetch(url, { cache: 'no-cache' });
        if (r.ok) return r.text();
      } catch (_) {}
    }
    const exportUrl = `https://docs.google.com/document/d/${DOC_ID}/export?format=html`;
    const r = await fetch(PROXY + encodeURIComponent(exportUrl), { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!data.contents) throw new Error('Respuesta vacía del proxy');
    return data.contents;
  }

  // ── Parse ────────────────────────────────────────────────────────────

  function parseBlocks(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Map Google's CSS classes to bold/italic/underline
    const fmtMap = {};
    doc.querySelectorAll('style').forEach(s => {
      const re = /\.([\w-]+)\s*\{([^}]*)\}/g;
      let m;
      while ((m = re.exec(s.textContent || ''))) {
        const cls = m[1], r = m[2];
        fmtMap[cls] = fmtMap[cls] || {};
        if (/font-weight\s*:\s*(700|bold)/i.test(r))    fmtMap[cls].b = true;
        if (/font-style\s*:\s*italic/i.test(r))         fmtMap[cls].i = true;
        if (/text-decoration\s*:\s*underline/i.test(r)) fmtMap[cls].u = true;
      }
    });

    const root = doc.querySelector('#contents') || doc.body;

    // Apply semantic tags for formatting
    root.querySelectorAll('[class]').forEach(el => {
      let b = false, i = false, u = false;
      el.classList.forEach(c => {
        const s = fmtMap[c];
        if (s) { b = b || !!s.b; i = i || !!s.i; u = u || !!s.u; }
      });
      if ((b || i || u) && el.textContent.trim()) {
        let inner = el.innerHTML;
        if (u) inner = `<u>${inner}</u>`;
        if (i) inner = `<em>${inner}</em>`;
        if (b && !/^H[1-6]$/.test(el.tagName)) inner = `<strong>${inner}</strong>`;
        el.innerHTML = inner;
      }
    });

    root.querySelectorAll('[style],[class],[id]').forEach(el => {
      el.removeAttribute('style');
      el.removeAttribute('class');
      el.removeAttribute('id');
    });

    root.querySelectorAll('a[href]').forEach(a => {
      try {
        const u = new URL(a.href);
        if (u.hostname.endsWith('google.com') && u.pathname === '/url') {
          a.setAttribute('href', u.searchParams.get('q') || a.href);
        }
      } catch (_) {}
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });

    root.querySelectorAll('img').forEach(img => {
      img.removeAttribute('width');
      img.removeAttribute('height');
    });

    return Array.from(root.children).filter(n => {
      if (n.tagName === 'HR') return true;
      if (n.querySelector && n.querySelector('img')) return true;
      return (n.textContent || '').trim().length > 0;
    });
  }

  // ── Paginate ─────────────────────────────────────────────────────────

  async function paginate(blocks) {
    const { w, h } = pageSize();
    const cW = w - PAD_X;
    const cH = h - PAD_Y;

    const measurer = document.createElement('div');
    measurer.id = '__nb_measurer';
    measurer.style.cssText = [
      'position:fixed', 'left:-9999px', 'top:0',
      `width:${cW}px`, `height:${cH}px`,
      'overflow:hidden', 'box-sizing:border-box',
      "font-family:'Georgia',serif", 'font-size:0.92rem', 'line-height:1.75',
      'word-break:break-word',
    ].join(';');
    // Inyectar el mismo límite de imagen que el CSS de las páginas reales,
    // para que la paginación mida el tamaño correcto y las imágenes quepan con texto.
    const measurerStyle = document.createElement('style');
    measurerStyle.textContent = '#__nb_measurer img{max-width:55%;max-height:160px;object-fit:contain;display:block;}';
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
      const prev = current;
      flush();
      measurer.innerHTML = html;

      if (fits()) {
        current = html;
        continue;
      }

      if (prev.trim()) pages.push(prev);   // push what was accumulated

      // Bloque con imagen: no se puede dividir por palabras, va solo en su página
      if (block.querySelector && block.querySelector('img')) {
        flush(html);
        continue;
      }

      // Block itself overflows — split word by word
      const tag   = /^H[1-6]$/.test(block.tagName) ? block.tagName.toLowerCase() : 'p';
      // Usar innerHTML con espacios en los tags de cierre para evitar
      // que spans adyacentes sin espacio se concatenen ("tengoHola")
      const words = block.innerHTML
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/\w+>/g, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .split(/\s+/).filter(Boolean);
      let   chunk  = [];

      for (const word of words) {
        chunk.push(word);
        measurer.innerHTML = `<${tag}>${chunk.join(' ')}</${tag}>`;
        if (!fits() && chunk.length > 1) {
          chunk.pop();
          flush(`<${tag}>${chunk.join(' ')}</${tag}>`);
          chunk = [word];
          measurer.innerHTML = `<${tag}>${chunk.join(' ')}</${tag}>`;
        }
      }
      current = chunk.length ? `<${tag}>${chunk.join(' ')}</${tag}>` : '';
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

    pageFlip.on('flip', e => updateControls(e.data, totalPages));


    pageFlip.on('changeOrientation', e => {
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

  async function load() {
    setStatus('Cargando cuaderno…', 'loading');
    try {
      const html   = await fetchDoc();
      lastHtml     = html;
      const blocks = parseBlocks(html);
      const pages  = await paginate(blocks);
      mount(pages);
      setStatus('', '');
    } catch (err) {
      console.error('[Notebook]', err);
      setStatus('No se pudo cargar el cuaderno. Verifica que el Doc sea público.', 'error');
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────

  function init() {
    if (!document.getElementById('book')) return;

    document.getElementById('btn-prev-page')
      ?.addEventListener('click', e => { e.preventDefault(); pageFlip?.flipPrev(); });
    document.getElementById('btn-next-page')
      ?.addEventListener('click', e => { e.preventDefault(); pageFlip?.flipNext(); });
    document.getElementById('btn-side-prev')
      ?.addEventListener('click', e => { e.preventDefault(); pageFlip?.flipPrev(); });
    document.getElementById('btn-side-next')
      ?.addEventListener('click', e => { e.preventDefault(); pageFlip?.flipNext(); });
    document.getElementById('btn-refresh-doc')
      ?.addEventListener('click', e => { e.preventDefault(); load(); });

    document.addEventListener('keydown', e => {
      const sec = document.getElementById('notebook-section');
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) return;
      if (e.key === 'ArrowRight') pageFlip?.flipNext();
      if (e.key === 'ArrowLeft')  pageFlip?.flipPrev();
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
