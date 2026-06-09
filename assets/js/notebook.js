/**
 * notebook.js — Cuaderno con efecto de pasar páginas + Google Docs
 * ──────────────────────────────────────────────────────────────────
 * CÓMO CONECTAR TU GOOGLE DOC:
 *
 *   1. Abre tu Google Doc
 *   2. Archivo → Compartir → Publicar en la web
 *   3. Elige "Página web" y haz clic en "Publicar"
 *   4. Copia la URL que aparece (termina en /pub)
 *   5. Pégala en GOOGLE_DOC_URL abajo
 *
 * La sincronización tarda ~2-5 min tras guardar el Doc.
 * El cuaderno divide el contenido en páginas automáticamente.
 *
 * CARACTERES POR PÁGINA:
 *   Ajusta CHARS_PER_PAGE según el tamaño de letra que uses.
 */

const NOTEBOOK = (() => {

  // ─── CONFIGURA AQUÍ ────────────────────────────────────────────────────────

  /**
   * URL de tu Google Doc publicado como página web.
   * Ejemplo: 'https://docs.google.com/document/d/XXXXX/pub'
   * Deja en blanco para ver el contenido de demo.
   */
  const GOOGLE_DOC_URL = '';

  /**
   * Proxy CORS para acceder al Doc desde el navegador.
   * allorigins es gratuito y no requiere cuenta.
   * Alternativa: https://corsproxy.io/?
   */
  const CORS_PROXY = 'https://api.allorigins.win/get?url=';

  /** Caracteres aproximados de contenido por página del cuaderno */
  const CHARS_PER_PAGE = 900;

  /** Intervalo de refresco automático en segundos (0 = desactivado) */
  const AUTO_REFRESH_SECONDS = 300; // 5 minutos

  // Contenido de demostración (se usa cuando GOOGLE_DOC_URL está vacío)
  const DEMO_PAGES = [
    `<h1>Mi Portafolio</h1>
<p>Bienvenido a mi cuaderno digital. Aquí documento mis proyectos, ideas y aprendizajes como profesional TI.</p>
<p>Conecta tu Google Doc para reemplazar este contenido con el tuyo propio. Las instrucciones están en notebook.js.</p>`,

    `<h2>Proyectos Destacados</h2>
<p>• Middleware de pagos — Integración Subdere / Tesorería</p>
<p>• Sistema de gestión municipal</p>
<p>• APIs REST para servicios internos</p>
<p>• Automatización de procesos administrativos</p>`,

    `<h2>Tecnologías</h2>
<p>C# · ASP.NET MVC · Razor · SQL Server</p>
<p>Clean Architecture · REST APIs · SOAP / WSDL</p>
<p>HTML · CSS · JavaScript · GitHub Pages</p>`,

    `<h2>Sobre mí</h2>
<p>Encargado de Informática en Municipalidad de Quilicura.</p>
<p>Especializado en integraciones de sistemas públicos, desarrollo de aplicativos internos y coordinación con proveedores tecnológicos del Estado.</p>`,
  ];
  // ───────────────────────────────────────────────────────────────────────────

  // Estado
  let pages        = [];   // array de strings HTML
  let currentPage  = 0;
  let isTurning    = false;
  let refreshTimer = null;

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
   * Divide un array de nodos del DOM en grupos de ~CHARS_PER_PAGE caracteres.
   * Así cada página del cuaderno tiene contenido balanceado.
   */
  function splitContentIntoPages(htmlString) {
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlString;

    const result = [];
    let currentChunk = '';

    tmp.childNodes.forEach(node => {
      const text = node.textContent || '';
      if (currentChunk.length + text.length > CHARS_PER_PAGE && currentChunk.length > 0) {
        result.push(currentChunk);
        currentChunk = node.outerHTML || node.textContent || '';
      } else {
        currentChunk += (node.outerHTML || node.textContent || '');
      }
    });

    if (currentChunk.trim()) result.push(currentChunk);
    return result.length > 0 ? result : ['<p>Sin contenido</p>'];
  }

  /** Extrae el cuerpo del HTML que retorna el Doc publicado */
  function extractDocContent(html) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');

    // Google Docs usa varias clases según el tipo de doc
    const selectors = ['#contents', '.c5', 'article', 'main', 'body'];
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent.trim().length > 20) {
        // Limpiar estilos inline de Google que rompen el diseño del cuaderno
        el.querySelectorAll('[style]').forEach(e => e.removeAttribute('style'));
        el.querySelectorAll('[class]').forEach(e => e.removeAttribute('class'));
        return el.innerHTML;
      }
    }
    return '<p>No se pudo extraer el contenido del documento.</p>';
  }

  // ─── Render de páginas ─────────────────────────────────────────────────────
  function renderBook() {
    bookEl.innerHTML = '';
    pages.forEach((content, i) => {
      const page = document.createElement('div');
      page.className = 'page' + (i !== currentPage ? ' hidden' : '');
      page.dataset.index = i;
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
  }

  function updatePageIndicator() {
    pageIndEl.textContent = `Página ${currentPage + 1} de ${pages.length}`;
  }

  // ─── Animación de paso de página ───────────────────────────────────────────
  function turnPage(direction) {
    if (isTurning) return;

    const next = currentPage + direction;
    if (next < 0 || next >= pages.length) return;

    isTurning = true;
    const currentEl = bookEl.querySelector(`.page[data-index="${currentPage}"]`);
    const nextEl    = bookEl.querySelector(`.page[data-index="${next}"]`);

    if (!currentEl || !nextEl) { isTurning = false; return; }

    if (direction > 0) {
      // Pasar hacia adelante
      nextEl.classList.remove('hidden');
      nextEl.style.zIndex = '1';
      currentEl.style.zIndex = '2';
      currentEl.classList.add('turning');

      currentEl.addEventListener('transitionend', () => {
        currentEl.classList.add('hidden');
        currentEl.classList.remove('turning');
        currentEl.style.zIndex = '';
        nextEl.style.zIndex = '';
        currentPage = next;
        updatePageIndicator();
        isTurning = false;
      }, { once: true });

    } else {
      // Pasar hacia atrás
      nextEl.classList.remove('hidden');
      nextEl.style.transform = 'rotateY(-160deg)';
      nextEl.style.zIndex = '2';
      currentEl.style.zIndex = '1';

      // Forzar reflow para que la transición funcione
      nextEl.getBoundingClientRect();

      nextEl.style.transition = 'transform 0.8s cubic-bezier(0.645, 0.045, 0.355, 1)';
      nextEl.style.transform  = 'rotateY(0deg)';

      nextEl.addEventListener('transitionend', () => {
        currentEl.classList.add('hidden');
        nextEl.style.transform  = '';
        nextEl.style.transition = '';
        nextEl.style.zIndex     = '';
        currentEl.style.zIndex  = '';
        currentPage = next;
        updatePageIndicator();
        isTurning = false;
      }, { once: true });
    }
  }

  // ─── Carga de Google Docs ──────────────────────────────────────────────────
  async function fetchGoogleDoc() {
    setSyncState('syncing', 'Sincronizando…');
    try {
      const url      = `${CORS_PROXY}${encodeURIComponent(GOOGLE_DOC_URL)}`;
      const response = await fetch(url, { cache: 'no-cache' });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data    = await response.json();
      const content = extractDocContent(data.contents || '');
      pages         = splitContentIntoPages(content);
      currentPage   = 0;
      renderBook();

      const now = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      setSyncState('synced', `Actualizado a las ${now}`);

    } catch (err) {
      console.error('[Notebook] Error al cargar Google Doc:', err);
      setSyncState('error', 'Error al sincronizar — verifica la URL');
      // Mantener el contenido actual si hay
      if (pages.length === 0) {
        pages = DEMO_PAGES;
        renderBook();
      }
    }
  }

  function startAutoRefresh() {
    if (AUTO_REFRESH_SECONDS <= 0) return;
    clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchGoogleDoc, AUTO_REFRESH_SECONDS * 1000);
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    if (!bookEl) return;

    if (GOOGLE_DOC_URL.trim()) {
      await fetchGoogleDoc();
      startAutoRefresh();
    } else {
      // Demo
      pages = DEMO_PAGES;
      currentPage = 0;
      renderBook();
      setSyncState('idle', 'Demo local — agrega tu Google Doc URL en notebook.js');
    }

    // Controles de navegación
    nextBtn.addEventListener('click', () => turnPage(1));
    prevBtn.addEventListener('click', () => turnPage(-1));
    refreshBtn.addEventListener('click', () => {
      if (GOOGLE_DOC_URL.trim()) fetchGoogleDoc();
    });

    // Teclado
    document.addEventListener('keydown', (e) => {
      const inNotebook = window.scrollY + window.innerHeight / 2 >
                         document.getElementById('notebook-section').offsetTop;
      if (!inNotebook) return;
      if (e.key === 'ArrowRight') turnPage(1);
      if (e.key === 'ArrowLeft')  turnPage(-1);
    });

    // Swipe en móvil
    let touchStartX = 0;
    bookEl.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    bookEl.addEventListener('touchend',   (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) turnPage(dx < 0 ? 1 : -1);
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', NOTEBOOK.init);
