/**
 * notebook.js — Cuaderno con efecto de pasar páginas + Google Docs
 * ──────────────────────────────────────────────────────────────────
 * CÓMO CONECTAR TU GOOGLE DOC (configuración en config.js):
 *
 *   1. Crea o abre tu documento en Google Docs
 *   2. Compartir → "Cualquier persona con el enlace" → Lector
 *   3. Copia el enlace del documento (o solo el ID)
 *   4. Pégalo en config.js → googleDocsId
 *
 * El cuaderno reparte el contenido en hojas AUTOMÁTICAMENTE midiendo
 * la altura real de cada página. Además:
 *   • Un salto de página en el Doc (Ctrl+Enter) fuerza una hoja nueva
 *   • Se conservan negritas, cursivas, títulos, listas y fotos
 *   • Se actualiza solo cada AUTO_REFRESH_SECONDS sin perder la hoja
 *     en la que estás leyendo
 */

const NOTEBOOK = (() => {

  // ─── CONFIGURACIÓN ─────────────────────────────────────────────────────────

  const CFG     = typeof config !== 'undefined' ? config : {};
  const RAW_DOC = String(CFG.googleDocsId || '').trim();
  const API_KEY = String(CFG.googleApiKey || '').trim();

  /**
   * Proxy CORS de respaldo (solo se usa si la API key falla o el doc
   * se configuró como URL "publicada en la web").
   */
  const CORS_PROXY = 'https://api.allorigins.win/get?url=';

  /** Intervalo de refresco automático en segundos (0 = desactivado) */
  const AUTO_REFRESH_SECONDS = 300; // 5 minutos

  /** Clave de caché local para mostrar el cuaderno al instante al recargar */
  const CACHE_KEY = 'murdoco-notebook-cache';

  // Contenido de demostración (se usa mientras no haya Doc configurado)
  const DEMO_PAGES = [
    `<h1>El Cuaderno de Murdoco</h1>
<p>Este cuaderno guardará cartas, recuerdos y mensajes para Sebastian.</p>
<p>Aún no está conectado a Google Docs. Cuando lo conectes, todo lo que se escriba en el documento aparecerá aquí, hoja por hoja, de forma automática.</p>`,

    `<h2>¿Cómo conectarlo?</h2>
<p>1. Crea un documento en Google Docs.</p>
<p>2. Compártelo: "Cualquier persona con el enlace" → Lector.</p>
<p>3. Copia el enlace del documento y pégalo en <strong>config.js</strong>, en <strong>googleDocsId</strong>.</p>
<p>El cuaderno se actualiza solo cada 5 minutos.</p>`,

    `<h2>Consejos para escribir</h2>
<p>• Usa títulos en el Doc para iniciar secciones.</p>
<p>• Inserta un salto de página (Ctrl+Enter) para forzar una hoja nueva.</p>
<p>• Las fotos que pegues en el documento también aparecen en el cuaderno.</p>
<p>• Negritas y cursivas se conservan tal cual.</p>`,
  ];
  // ───────────────────────────────────────────────────────────────────────────

  // Estado
  let pages        = [];   // array de strings HTML (una por hoja)
  let currentPage  = 0;
  let pageFlip     = null; // instancia de StPageFlip
  let refreshTimer = null;
  let resizeTimer  = null;
  let lastDocHtml  = '';   // para no re-renderizar si el Doc no cambió
  let isSyncing    = false; // lock para evitar applyDocHtml concurrente

  // Elementos DOM
  const bookEl       = document.getElementById('book');
  const prevBtn      = document.getElementById('btn-prev-page');
  const nextBtn      = document.getElementById('btn-next-page');
  const pageIndEl    = document.getElementById('page-indicator');
  const syncStatus   = document.getElementById('sync-status');
  const syncIcon     = document.getElementById('sync-icon');
  const syncText     = document.getElementById('sync-text');
  const refreshBtn   = document.getElementById('btn-refresh-doc');

  // ─── Utilidades ────────────────────────────────────────────────────────────
  function setSyncState(state, msg) {
    syncStatus.className = state;
    const icons = { syncing: '↻', synced: '✓', error: '✗', idle: '○' };
    syncIcon.textContent = icons[state] || '○';
    syncText.textContent = msg;
  }

  function formatDate() {
    return new Date().toLocaleDateString('es-CL', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  /**
   * Interpreta lo que haya en config.googleDocsId:
   *   • URL publicada en la web (…/d/e/XXXX/pub)  → se lee vía proxy
   *   • URL normal del documento (…/d/ID/edit)    → se usa el ID
   *   • Solo el ID                                → se usa directo
   */
  function resolveDocSource(raw) {
    if (!raw || raw === 'TU_GOOGLE_DOCS_ID') return null;
    if (/\/d\/e\//.test(raw) || /\/pub\b/.test(raw)) {
      return { type: 'published', url: raw };
    }
    const m  = raw.match(/\/d\/([-\w]{20,})/);
    const id = m ? m[1] : (/^[-\w]{20,}$/.test(raw) ? raw : null);
    return id ? { type: 'doc', id } : null;
  }

  // ─── Descarga del Google Doc ───────────────────────────────────────────────
  async function fetchDocHtml(src) {
    // Vía 1: Drive API con la misma API key de la galería (sin proxy)
    if (src.type === 'doc' && API_KEY) {
      try {
        const url = `https://www.googleapis.com/drive/v3/files/${src.id}/export?mimeType=text/html&key=${API_KEY}`;
        const r   = await fetch(url, { cache: 'no-cache' });
        if (r.ok) return await r.text();
        console.warn('[Notebook] Drive API respondió', r.status, '— probando proxy');
      } catch (e) {
        console.warn('[Notebook] Drive API falló — probando proxy', e);
      }
    }

    // Vía 2: proxy CORS (URL publicada o export directo del doc)
    const target = src.type === 'published'
      ? src.url
      : `https://docs.google.com/document/d/${src.id}/export?format=html`;
    const r = await fetch(CORS_PROXY + encodeURIComponent(target), { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (!data.contents) throw new Error('Respuesta vacía del proxy');
    return data.contents;
  }

  // ─── Limpieza del HTML que entrega Google ──────────────────────────────────

  /**
   * Google Docs expresa negrita/cursiva/subrayado con clases CSS (.c1, .c2…).
   * Leemos sus <style> para saber qué clase significa qué.
   */
  function buildClassStyles(doc) {
    const map = {};
    doc.querySelectorAll('style').forEach(styleEl => {
      const css = styleEl.textContent || '';
      const re  = /\.([\w-]+)\s*\{([^}]*)\}/g;
      let m;
      while ((m = re.exec(css)) !== null) {
        const cls   = m[1];
        const rules = m[2];
        const entry = map[cls] || (map[cls] = {});
        if (/font-weight\s*:\s*(700|bold)/i.test(rules))   entry.bold      = true;
        if (/font-style\s*:\s*italic/i.test(rules))        entry.italic    = true;
        if (/text-decoration\s*:\s*underline/i.test(rules)) entry.underline = true;
      }
    });
    return map;
  }

  /** Desenvuelve los links de redirección de Google (google.com/url?q=REAL) */
  function cleanLink(a) {
    try {
      const u = new URL(a.href);
      if (u.hostname.endsWith('google.com') && u.pathname === '/url') {
        const real = u.searchParams.get('q');
        if (real) a.setAttribute('href', real);
      }
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    } catch (_) { /* href inválido: se deja tal cual */ }
  }

  /**
   * Convierte el HTML crudo del Doc en una lista de nodos de bloque limpios,
   * conservando formato (strong/em/u), títulos, listas, fotos y saltos de
   * página (los <hr> de Google marcan salto de página manual).
   */
  function extractDocNodes(html) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');
    const styles = buildClassStyles(doc);

    const root = doc.querySelector('#contents') || doc.body;
    if (!root || root.textContent.trim().length === 0) return [];

    // Aplicar formato según clases ANTES de borrarlas
    root.querySelectorAll('[class]').forEach(el => {
      let bold = false, italic = false, underline = false;
      el.classList.forEach(cls => {
        const s = styles[cls];
        if (!s) return;
        bold      = bold || !!s.bold;
        italic    = italic || !!s.italic;
        underline = underline || !!s.underline;
      });
      if ((bold || italic || underline) && el.textContent.trim()) {
        let inner = el.innerHTML;
        if (underline) inner = `<u>${inner}</u>`;
        if (italic)    inner = `<em>${inner}</em>`;
        if (bold && !/^H[1-6]$/.test(el.tagName)) inner = `<strong>${inner}</strong>`;
        el.innerHTML = inner;
      }
    });

    // Quitar estilos/clases inline de Google que rompen el diseño
    root.querySelectorAll('[style]').forEach(e => e.removeAttribute('style'));
    root.querySelectorAll('[class]').forEach(e => e.removeAttribute('class'));
    root.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));

    // Links e imágenes
    root.querySelectorAll('a[href]').forEach(cleanLink);
    root.querySelectorAll('img').forEach(img => {
      img.removeAttribute('width');
      img.removeAttribute('height');
      img.setAttribute('loading', 'eager');
    });

    return Array.from(root.children).filter(node => {
      if (node.tagName === 'HR') return true;               // salto de página
      if (node.querySelector && node.querySelector('img')) return true;
      if ((node.textContent || '').trim().length > 0) return true;
      if (node.tagName === 'P') {                           // p vacío = línea en blanco
        node.innerHTML = '';
        return true;
      }
      return false;
    });
  }

  // ─── Paginación automática midiendo altura real ────────────────────────────

  /** Espera a que carguen las imágenes para poder medir su altura */
  function waitForImages(container, timeoutMs = 4000) {
    const imgs = Array.from(container.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();
    const all = imgs.map(img => new Promise(resolve => {
      if (img.complete) return resolve();
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', () => { img.remove(); resolve(); }, { once: true });
    }));
    return Promise.race([
      Promise.all(all),
      new Promise(resolve => setTimeout(resolve, timeoutMs)),
    ]);
  }

  /** Crea una hoja invisible con la misma estructura para medir contenido */
  function createMeasurer() {
    const page = document.createElement('div');
    page.className = 'page measuring';
    page.innerHTML = `
      <div class="page-lines"></div>
      <div class="page-margin"></div>
      <div class="page-header">
        <span class="date">${formatDate()}</span>
        <span class="page-num">— 0 —</span>
      </div>
      <div class="page-content"></div>
    `;
    bookEl.appendChild(page);
    return page;
  }

  /** Divide un párrafo más alto que la hoja en trozos que sí quepan */
  function splitOversizedNode(node, contentEl, flushPage) {
    const words = (node.textContent || '').split(/\s+/).filter(Boolean);
    let chunk = [];
    words.forEach(word => {
      chunk.push(word);
      contentEl.innerHTML = `<p>${chunk.join(' ')}</p>`;
      if (contentEl.scrollHeight > contentEl.clientHeight && chunk.length > 1) {
        chunk.pop();
        flushPage(`<p>${chunk.join(' ')}</p>`);
        chunk = [word];
      }
    });
    contentEl.innerHTML = chunk.length ? `<p>${chunk.join(' ')}</p>` : '';
  }

  /**
   * Reparte los nodos en hojas según la altura real disponible.
   * Devuelve un array de strings HTML (una por hoja).
   */
  async function paginate(nodes) {
    const measurer  = createMeasurer();
    const contentEl = measurer.querySelector('.page-content');

    // Esperar fuentes con timeout — en iOS/Safari puede no resolver nunca
    await Promise.race([
      document.fonts.ready.catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);

    // Si por algún motivo la hoja no es medible, repartir por caracteres
    if (contentEl.clientHeight < 50) {
      measurer.remove();
      return paginateByChars(nodes);
    }

    const result = [];
    const flushPage = (extraHtml) => {
      const html = extraHtml !== undefined ? extraHtml : contentEl.innerHTML;
      if (html.trim()) result.push(html);
      contentEl.innerHTML = '';
    };

    for (const node of nodes) {
      if (node.tagName === 'HR') {        // salto de página manual del Doc
        if (contentEl.innerHTML.trim()) flushPage();
        continue;
      }

      const clone = node.cloneNode(true);
      contentEl.appendChild(clone);
      if (clone.querySelector && clone.querySelector('img')) {
        await waitForImages(clone);
      }

      if (contentEl.scrollHeight > contentEl.clientHeight) {
        contentEl.removeChild(clone);

        if (!contentEl.innerHTML.trim()) {
          // El nodo solo ya es más alto que la hoja
          if (clone.querySelector && clone.querySelector('img')) {
            flushPage(clone.outerHTML);   // imagen gigante: hoja propia
          } else {
            splitOversizedNode(clone, contentEl, flushPage);
          }
        } else {
          flushPage();
          contentEl.appendChild(clone);
          if (contentEl.scrollHeight > contentEl.clientHeight) {
            contentEl.removeChild(clone);
            splitOversizedNode(clone, contentEl, flushPage);
          }
        }
      }
    }
    flushPage();

    measurer.remove();
    return result.length > 0 ? result : ['<p>Sin contenido</p>'];
  }

  /** Respaldo: división aproximada por cantidad de caracteres */
  function paginateByChars(nodes, charsPerPage = 900) {
    const result = [];
    let chunk = '';
    nodes.forEach(node => {
      if (node.tagName === 'HR') {
        if (chunk.trim()) { result.push(chunk); chunk = ''; }
        return;
      }
      const html = node.outerHTML || node.textContent || '';
      const len  = (node.textContent || '').length;
      if (chunk.length > 0 && chunk.length + len > charsPerPage) {
        result.push(chunk);
        chunk = html;
      } else {
        chunk += html;
      }
    });
    if (chunk.trim()) result.push(chunk);
    return result.length > 0 ? result : ['<p>Sin contenido</p>'];
  }

  // ─── Render de páginas ─────────────────────────────────────────────────────
  function renderBook() {
    // Destruir instancia anterior antes de limpiar el DOM
    if (pageFlip) { try { pageFlip.destroy(); } catch (_) {} pageFlip = null; }
    bookEl.innerHTML = '';

    pages.forEach((content, i) => {
      const page = document.createElement('div');
      page.className = 'page';
      page.innerHTML = `
        <div class="page-lines"></div>
        <div class="page-margin"></div>
        <div class="page-header">
          <span class="date">${formatDate()}</span>
          <span class="page-num">— ${i + 1} —</span>
        </div>
        <div class="page-content">${content}</div>
      `;
      bookEl.appendChild(page);
    });

    updatePageIndicator();

    // Diferir StPageFlip al siguiente ciclo de layout (doble rAF garantiza
    // que el navegador haya calculado dimensiones reales antes de medir)
    requestAnimationFrame(() => requestAnimationFrame(() => initPageFlip()));
  }

  function initPageFlip() {
    if (typeof St === 'undefined' || pageFlip) return;

    const w = bookEl.offsetWidth  || bookEl.parentElement?.offsetWidth || 780;
    const h = bookEl.offsetHeight || 520;

    // Si el elemento aún no tiene dimensiones reales, esperar a que sea visible
    if (w < 50) {
      const retryObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          retryObserver.disconnect();
          requestAnimationFrame(() => initPageFlip());
        }
      }, { threshold: 0.1 });
      retryObserver.observe(bookEl);
      return;
    }

    try {
      pageFlip = new St.PageFlip(bookEl, {
        width:               w,
        height:              h,
        size:                'fixed',
        usePortrait:         true,
        showCover:           false,
        drawShadow:          true,
        flippingTime:        900,
        maxShadowOpacity:    0.7,
        showPageCorners:     true,
        useMouseEvents:      true,
        mobileScrollSupport: true,
        swipeDistance:       40,
        disableFlipByClick:  true,
      });
      pageFlip.loadFromHTML(bookEl.querySelectorAll('.page'));
      pageFlip.on('flip', (e) => {
        currentPage = e.data;
        updatePageIndicator();
      });
      if (currentPage > 0 && currentPage < pages.length) {
        pageFlip.turnToPage(currentPage);
      }
    } catch (err) {
      console.warn('[Notebook] StPageFlip init falló:', err);
      pageFlip = null;
    }
  }

  function updatePageIndicator() {
    pageIndEl.textContent = `Página ${currentPage + 1} de ${pages.length}`;
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= pages.length - 1;
  }

  // ─── Paso de página ────────────────────────────────────────────────────────
  let isAnimating = false;

  function turnPage(direction) {
    if (!pageFlip || isAnimating) return;
    const target = currentPage + direction;
    if (target < 0 || target >= pages.length) return;

    if (direction > 0) {
      // Hacia adelante: StPageFlip tiene el curl nativo
      pageFlip.flip(target);
    } else {
      // Hacia atrás: overlay CSS porque StPageFlip portrait no anima backward
      isAnimating = true;
      const bookContainer = bookEl.parentElement; // #book-container

      // Clonar la página actual como overlay que girará
      const sourceEl = bookEl.querySelector('.page');
      const overlay  = document.createElement('div');
      overlay.id = 'book-flip-back-overlay';
      overlay.innerHTML = `
        <div class="page-lines"></div>
        <div class="page-margin"></div>
        <div class="page-content" style="padding:1rem 2rem 1.5rem 4rem;font-family:var(--font-mono);font-size:0.9rem;line-height:2rem;color:var(--ink);">${pages[currentPage]}</div>
        <div class="page-gloss-back"></div>
      `;
      bookEl.style.position = 'relative';
      bookEl.appendChild(overlay);

      // Cambiar la página real a la mitad de la animación (en el punto ciego ~90°)
      setTimeout(() => {
        pageFlip.turnToPrevPage();
        currentPage = target;
        updatePageIndicator();
      }, 420);

      // Limpiar el overlay al terminar
      overlay.addEventListener('animationend', () => {
        overlay.remove();
        isAnimating = false;
      }, { once: true });
      setTimeout(() => { overlay.remove(); isAnimating = false; }, 950);
    }
  }

  // ─── Sincronización con Google Docs ────────────────────────────────────────
  const docSource = resolveDocSource(RAW_DOC);

  async function applyDocHtml(html, { keepPage = false } = {}) {
    if (isSyncing) return; // evitar ejecución concurrente (corrompe el measurer)
    isSyncing = true;
    try {
      const nodes = extractDocNodes(html);
      if (nodes.length === 0) throw new Error('Documento vacío');
      const newPages = await paginate(nodes);

      const previousPage = currentPage;
      pages       = newPages;
      currentPage = keepPage ? Math.min(previousPage, pages.length - 1) : 0;
      renderBook();
    } finally {
      isSyncing = false;
    }
  }

  async function syncDoc({ silent = false } = {}) {
    if (!docSource) return;
    if (!silent) setSyncState('syncing', 'Sincronizando…');

    try {
      const html = await fetchDocHtml(docSource);

      const now = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      if (html === lastDocHtml && pages.length > 0) {
        setSyncState('synced', `Sin cambios — revisado a las ${now}`);
        return;
      }
      lastDocHtml = html;

      await applyDocHtml(html, { keepPage: true }); // preservar página actual tras sync
      try { localStorage.setItem(CACHE_KEY, html); } catch (_) { /* sin espacio */ }
      setSyncState('synced', `Actualizado a las ${now}`);

    } catch (err) {
      console.error('[Notebook] Error al cargar Google Doc:', err);
      setSyncState('error', 'Error al sincronizar — revisa que el Doc esté compartido');
      if (pages.length === 0) {
        pages = DEMO_PAGES;
        currentPage = 0;
        renderBook();
      }
    }
  }

  function startAutoRefresh() {
    if (AUTO_REFRESH_SECONDS <= 0) return;
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => syncDoc({ silent: true }), AUTO_REFRESH_SECONDS * 1000);
  }

  /** Al cambiar el tamaño de la ventana, recalcular las hojas */
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => {
      if (!lastDocHtml) return;
      try { await applyDocHtml(lastDocHtml, { keepPage: true }); } catch (_) { /* mantener actual */ }
    }, 350);
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    if (!bookEl) return;

    // Registrar controles ANTES de la sincronización (que es async y puede tardar)
    nextBtn.addEventListener('click', () => turnPage(1));
    prevBtn.addEventListener('click', () => turnPage(-1));
    refreshBtn.addEventListener('click', () => syncDoc());

    document.addEventListener('keydown', (e) => {
      const inNotebook = window.scrollY + window.innerHeight / 2 >
                         document.getElementById('notebook-section').offsetTop;
      if (!inNotebook) return;
      if (e.key === 'ArrowRight') turnPage(1);
      if (e.key === 'ArrowLeft')  turnPage(-1);
    });

    window.addEventListener('resize', onResize);

    if (docSource) {
      // Mostrar al instante la última versión en caché mientras sincroniza
      let cached = null;
      try { cached = localStorage.getItem(CACHE_KEY); } catch (_) { /* sin acceso */ }
      if (cached) {
        lastDocHtml = cached;
        try { await applyDocHtml(cached); } catch (_) { lastDocHtml = ''; }
      }
      await syncDoc();
      startAutoRefresh();
    } else {
      // Demo
      pages = DEMO_PAGES;
      currentPage = 0;
      renderBook();
      setSyncState('idle', 'Demo — conecta tu Google Doc en config.js (googleDocsId)');
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', NOTEBOOK.init);
