/**
 * gallery-full.js — Galería completa con carga inteligente
 * ════════════════════════════════════════════════════════════
 * - Trae el listado de archivos de Google Drive en UNA sola llamada
 *   (paginada solo si hay >1000 archivos). Eso es metadata liviana,
 *   no las imágenes.
 * - Las cards se renderizan en lotes (infinite scroll) para no crear
 *   miles de nodos de golpe.
 * - La imagen real de cada card solo se pide cuando la card entra al
 *   viewport (IntersectionObserver) y pasa por una cola con máximo de
 *   peticiones simultáneas, para no saturar/bloquear el CDN de Drive.
 * - El lightbox pide una resolución mayor solo de la foto abierta y
 *   precarga (con baja prioridad) solo la siguiente/anterior.
 *
 * Requiere: config.js con googleApiKey y googleDriveFolderId
 */

const GALLERY_FULL = (() => {

  // ── Config ──────────────────────────────────────────────────────
  const BATCH_SIZE      = 18;   // cards que se agregan al DOM por lote
  const MAX_CONCURRENT  = 4;    // peticiones de imagen simultáneas máx.
  const ROOT_MARGIN     = '400px 0px';

  // ── Estado ──────────────────────────────────────────────────────
  let files       = [];   // [{id, name, thumbnailLink}]
  let renderedUpTo = 0;
  let lightboxIndex = -1;

  // Cola de carga con concurrencia limitada
  const queue  = [];
  let   active = 0;

  // Cache de <img> ya cargadas (evita repedir)
  const loadedSrc = new Map();

  // ── DOM ─────────────────────────────────────────────────────────
  const grid       = document.getElementById('gfull-grid');
  const sentinel    = document.getElementById('gfull-sentinel');
  const statusEl    = document.getElementById('gfull-status');
  const lightbox    = document.getElementById('gfull-lightbox');
  const lbImg       = document.getElementById('gfull-lb-img');
  const lbCounter   = document.getElementById('gfull-lb-counter');
  const lbTitle     = document.getElementById('gfull-lb-title');
  const lbSpinner   = document.getElementById('gfull-lb-spinner');
  const btnClose    = document.getElementById('gfull-lb-close');
  const btnPrev     = document.getElementById('gfull-lb-prev');
  const btnNext     = document.getElementById('gfull-lb-next');

  function log(...a) { if (typeof config !== 'undefined' && config.debug) console.log('[GalleryFull]', ...a); }

  // ── Utilidades de URL de Drive ──────────────────────────────────
  // thumbnailLink viene como ...=s220 por defecto; le subimos la resolución
  function thumbUrl(file, size) {
    if (!file.thumbnailLink) return '';
    return file.thumbnailLink.replace(/=s\d+/, `=s${size}`);
  }

  // ── Cola de carga con concurrencia limitada ─────────────────────
  function enqueue(task) {
    queue.push(task);
    pump();
  }
  function pump() {
    while (active < MAX_CONCURRENT && queue.length) {
      const task = queue.shift();
      active++;
      task().finally(() => { active--; pump(); });
    }
  }
  function preload(src) {
    return new Promise(resolve => {
      if (!src || loadedSrc.has(src)) return resolve(src);
      const im = new Image();
      im.onload  = () => { loadedSrc.set(src, true); resolve(src); };
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  // ── Fetch del listado de Drive (paginado, solo metadata) ────────
  async function fetchAllFiles() {
    const folderId = config.googleDriveFolderId;
    const apiKey   = config.googleApiKey;
    const out = [];
    let pageToken = '';

    do {
      const query = `mimeType contains 'image/' and '${folderId}' in parents and trashed=false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}` +
        `&pageSize=1000&fields=nextPageToken,files(id,name,thumbnailLink)` +
        `&orderBy=modifiedTime%20desc&key=${apiKey}` +
        (pageToken ? `&pageToken=${pageToken}` : '');

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      out.push(...(data.files || []));
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    return out;
  }

  // ── Render de cards en lotes ────────────────────────────────────
  function renderNextBatch() {
    if (renderedUpTo >= files.length) {
      sentinel.style.display = 'none';
      return;
    }
    const slice = files.slice(renderedUpTo, renderedUpTo + BATCH_SIZE);
    slice.forEach((file, i) => {
      const idx = renderedUpTo + i;
      grid.appendChild(buildCard(file, idx));
    });
    renderedUpTo += slice.length;

    if (renderedUpTo >= files.length) sentinel.style.display = 'none';
  }

  function buildCard(file, idx) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gfull-card';
    card.setAttribute('aria-label', file.name || `Foto ${idx + 1}`);
    card.dataset.index = String(idx);

    const skeleton = document.createElement('div');
    skeleton.className = 'gfull-card__skeleton';
    card.appendChild(skeleton);

    const img = document.createElement('img');
    img.alt = file.name || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    card.appendChild(img);

    card.addEventListener('click', () => openLightbox(idx));

    cardObserver.observe(card);
    return card;
  }

  // ── IntersectionObserver: dispara la carga real de cada card ────
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      cardObserver.unobserve(card);
      enqueue(() => loadCardImage(card));
    });
  }, { rootMargin: ROOT_MARGIN, threshold: 0.01 });

  async function loadCardImage(card) {
    const idx  = Number(card.dataset.index);
    const file = files[idx];
    const src  = thumbUrl(file, 360);
    const ok   = await preload(src);
    const img  = card.querySelector('img');
    if (ok) {
      img.src = ok;
      card.classList.add('is-loaded');
    } else {
      card.classList.add('is-error');
    }
  }

  // ── Sentinel: dispara el siguiente lote al acercarse al final ───
  const sentinelObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) renderNextBatch();
  }, { rootMargin: '600px 0px' });

  // ── Lightbox ─────────────────────────────────────────────────────
  function openLightbox(idx) {
    lightboxIndex = idx;
    lightbox.classList.add('is-open');
    document.body.classList.add('gfull-noscroll');
    showLightboxImage(idx);
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.classList.remove('gfull-noscroll');
    lbImg.src = '';
  }

  function showLightboxImage(idx) {
    lightboxIndex = ((idx % files.length) + files.length) % files.length;
    const file = files[lightboxIndex];

    lbCounter.textContent = `${lightboxIndex + 1} / ${files.length}`;
    lbTitle.textContent   = file.name || '';
    lbSpinner.style.display = 'block';
    lbImg.classList.remove('is-ready');

    const fullSrc = thumbUrl(file, 1600);
    preload(fullSrc).then(ok => {
      if (lightboxIndex !== Number(lbImg.dataset.target)) return; // navegó mientras cargaba
      lbSpinner.style.display = 'none';
      if (ok) {
        lbImg.src = ok;
        lbImg.classList.add('is-ready');
      }
    });
    lbImg.dataset.target = String(lightboxIndex);

    // Precarga liviana de vecinos (no bloquea, baja prioridad en la cola)
    const nextFile = files[(lightboxIndex + 1) % files.length];
    const prevFile = files[(lightboxIndex - 1 + files.length) % files.length];
    enqueue(() => preload(thumbUrl(nextFile, 1600)));
    enqueue(() => preload(thumbUrl(prevFile, 1600)));
  }

  function lbNext() { showLightboxImage(lightboxIndex + 1); }
  function lbPrev() { showLightboxImage(lightboxIndex - 1); }

  // ── Touch/swipe en el lightbox ──────────────────────────────────
  let touchStartX = 0;
  function bindLightboxEvents() {
    btnClose.addEventListener('click', closeLightbox);
    btnNext.addEventListener('click', lbNext);
    btnPrev.addEventListener('click', lbPrev);

    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape')     closeLightbox();
      if (e.key === 'ArrowRight') lbNext();
      if (e.key === 'ArrowLeft')  lbPrev();
    });

    lightbox.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    lightbox.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) (diff > 0 ? lbNext() : lbPrev());
    }, { passive: true });
  }

  // ── Init ────────────────────────────────────────────────────────
  async function init() {
    if (!grid) return;

    if (!config || !config.googleApiKey || !config.googleDriveFolderId) {
      statusEl.textContent = '⚠️ Falta configurar googleApiKey / googleDriveFolderId en config.js';
      return;
    }

    statusEl.textContent = 'Cargando galería…';
    try {
      files = await fetchAllFiles();
    } catch (err) {
      console.error('[GalleryFull] Error cargando listado:', err);
      statusEl.textContent = 'No se pudo cargar la galería. Intenta de nuevo más tarde.';
      return;
    }

    if (files.length === 0) {
      statusEl.textContent = 'Aún no hay fotos en la galería.';
      sentinel.style.display = 'none';
      return;
    }

    statusEl.textContent = '';
    bindLightboxEvents();
    sentinelObserver.observe(sentinel);
    renderNextBatch();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', GALLERY_FULL.init);
