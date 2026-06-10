/**
 * gallery-gphoto.js — Galería automática con Google Fotos
 * ════════════════════════════════════════════════════════
 * Carga automáticamente fotos de un álbum de Google Fotos
 *
 * Requiere: config.js con googlePhotosAlbumId
 */

const GALLERY_GPHOTO = (() => {

  let images = [];
  let currentIndex = 0;
  let isPlaying = true;
  let timer = null;
  const INTERVAL_MS = 5000;
  let preloadedImages = {}; // Cache de imágenes precargadas
  const MAX_VISIBLE_IMAGES = 7; // 3 a cada lado + 1 centro
  const SIDES = 3;
  let touchStartX = 0;
  let touchEndX = 0;

  // DOM
  const galleryImg = document.getElementById('gallery-img');
  const galleryContainer = document.querySelector('.gallery-container');
  const titleEl = document.getElementById('gallery-title');
  const counterEl = document.getElementById('gallery-counter');
  const btnPrev = document.getElementById('prev-img');
  const btnPause = document.getElementById('pause-img');
  const btnNext = document.getElementById('next-img');

  function log(msg) {
    console.log(msg);
  }

  // ────────────────────────────────────────────────────────
  // PRECARGAR IMÁGENES (LAZY LOADING)
  // ────────────────────────────────────────────────────────

  function preloadImage(index) {
    const img = images[index];
    if (!img || preloadedImages[img.id]) return; // Ya precargada

    const imgElement = new Image();
    imgElement.onload = () => {
      preloadedImages[img.id] = true;
      log(`✓ Imagen precargada: ${img.title}`);
    };
    imgElement.onerror = () => {
      log(`⚠️ Error precargando: ${img.title}`);
    };
    imgElement.src = img.src;
  }

  // ────────────────────────────────────────────────────────
  // CARGAR FOTOS DE GOOGLE FOTOS
  // ────────────────────────────────────────────────────────

  async function loadPhotosFromAlbum() {
    try {
      const folderId = config.googleDriveFolderId;
      const apiKey = config.googleApiKey;

      if (!folderId || folderId === 'TU_GOOGLE_DRIVE_FOLDER_ID') {
        log('⚠️ googleDriveFolderId no configurado en config.js');
        showError('Configura tu carpeta de Google Drive en config.js');
        return;
      }

      if (!apiKey) {
        log('⚠️ googleApiKey no configurado en config.js');
        showError('Configura tu API Key de Google en config.js');
        return;
      }

      log(`📸 Cargando fotos de Google Drive: ${folderId}`);

      // Google Drive API - Query correcta
      const query = `mimeType contains 'image/' and '${folderId}' in parents and trashed=false`;

      log(`🔍 Buscando imágenes con query: ${query.substring(0, 50)}...`);

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=100&fields=files(id,name,thumbnailLink,mimeType)&orderBy=modifiedTime%20desc&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      const files = data.files || [];

      log(`📷 Encontradas ${files.length} fotos`);

      if (files.length === 0) {
        log('⚠️ El álbum está vacío');
        showError('No hay fotos en tu álbum de Google Fotos');
        return;
      }

      // Convertir a formato de galería
      // Usar Google Drive API v3 con alt=media para API Key pública
      images = files.map((file, idx) => {
        // URL oficial de Google Drive API v3 que funciona con API Key
        const imageUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${config.googleApiKey}`;

        return {
          id: file.id,
          title: file.name || `Foto ${idx + 1}`,
          src: imageUrl
        };
      });

      log(`✅ ${images.length} fotos cargadas desde Google Fotos`);
      initGallery();

    } catch (error) {
      logError('Error cargando fotos:', error);

      // Fallback: imagen local
      log('⚠️ Usando imagen local como respaldo...');
      images = [{
        id: 'local-murdoco',
        title: 'Murdoco — Sebastian Antonio Bobadilla Rivas',
        src: 'assets/images/murdoco.png'
      }];
      initGallery();
    }
  }

  function logError(msg, err) {
    console.error(msg, err);
  }

  // ────────────────────────────────────────────────────────
  // GALERÍA
  // ────────────────────────────────────────────────────────

  function createCarousel() {
    if (!galleryContainer) return;

    // Limpiar
    galleryContainer.innerHTML = '';

    // Crear carousel
    const carousel = document.createElement('div');
    carousel.className = 'gallery-carousel';

    // Mostrar 7 imágenes (3 a cada lado + 1 centro)
    for (let i = -SIDES; i <= SIDES; i++) {
      const index = (currentIndex + i + images.length) % images.length;
      const img = images[index];

      const strip = document.createElement('div');
      strip.className = 'gallery-strip';
      strip.dataset.position = i;

      const imgEl = document.createElement('img');
      imgEl.src = img.src;
      imgEl.alt = img.title;
      imgEl.onerror = () => {
        log(`⚠️ Error cargando foto: ${img.title}`);
      };

      strip.appendChild(imgEl);

      // Click para cambiar
      strip.addEventListener('click', () => {
        const targetIndex = (currentIndex + i + images.length) % images.length;
        goTo(targetIndex);
        startTimer();
      });

      carousel.appendChild(strip);
    }

    galleryContainer.appendChild(carousel);
    updateCarouselClasses();
  }

  function updateCarouselClasses() {
    const strips = document.querySelectorAll('.gallery-strip');

    // Primero, fade out las imágenes
    strips.forEach((strip) => {
      const img = strip.querySelector('img');
      if (img) {
        img.style.opacity = '0';
      }
    });

    // Cambiar las clases para la transición de tamaño
    strips.forEach((strip, idx) => {
      const position = idx - SIDES;
      const distance = Math.abs(position);

      strip.classList.remove('center', 'near-1', 'near-2', 'far');

      if (position === 0) {
        strip.classList.add('center');
      } else if (distance === 1) {
        strip.classList.add('near-1');
      } else if (distance === 2) {
        strip.classList.add('near-2');
      } else {
        strip.classList.add('far');
      }
    });

    // Después de 150ms (fade out completo), cambiar las imágenes
    setTimeout(() => {
      strips.forEach((strip, idx) => {
        const position = idx - SIDES;
        const imageIndex = (currentIndex + position + images.length) % images.length;
        const img = strip.querySelector('img');
        if (img) {
          img.src = images[imageIndex].src;
          img.alt = images[imageIndex].title;
        }
      });

      // Después de cambiar el src, fade in
      setTimeout(() => {
        strips.forEach((strip) => {
          const img = strip.querySelector('img');
          if (img) {
            img.style.opacity = '1';
          }
        });
      }, 50);
    }, 150);

    counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
  }

  function renderCarousel() {
    updateCarouselClasses();
  }

  function initGallery() {
    if (images.length === 0) return;

    log(`🎬 Galería inicializada con ${images.length} foto(s)`);

    // Precargar imágenes
    for (let i = 0; i < Math.min(10, images.length); i++) {
      preloadImage(i);
    }

    createCarousel();
    startTimer();

    // Eventos
    btnNext.addEventListener('click', () => { goTo(currentIndex + 1); startTimer(); });
    btnPrev.addEventListener('click', () => { goTo(currentIndex - 1); startTimer(); });
    btnPause.addEventListener('click', togglePause);

    // Teclado
    document.getElementById('gallery-section')?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { goTo(currentIndex + 1); startTimer(); }
      if (e.key === 'ArrowLeft') { goTo(currentIndex - 1); startTimer(); }
      if (e.key === ' ') { togglePause(); }
    });

    // Touch/Swipe
    galleryContainer?.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, false);

    galleryContainer?.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, false);

    // Visibilidad
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearInterval(timer);
      } else if (isPlaying) {
        startTimer();
      }
    });
  }

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe izquierda = siguiente
        goTo(currentIndex + 1);
      } else {
        // Swipe derecha = anterior
        goTo(currentIndex - 1);
      }
      startTimer();
    }
  }

  function goTo(index) {
    currentIndex = ((index % images.length) + images.length) % images.length;
    renderCarousel();

    // Precargar próximas imágenes
    for (let i = 1; i < SIDES + 1; i++) {
      preloadImage((currentIndex + i) % images.length);
      preloadImage((currentIndex - i + images.length) % images.length);
    }
  }

  function startTimer() {
    clearInterval(timer);
    if (isPlaying && images.length > 1) {
      timer = setInterval(() => goTo(currentIndex + 1), INTERVAL_MS);
    }
  }

  function togglePause() {
    isPlaying = !isPlaying;
    btnPause.textContent = isPlaying ? '⏸' : '▶';
    btnPause.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reanudar');
    if (isPlaying) {
      startTimer();
    } else {
      clearInterval(timer);
    }
  }

  function showError(message) {
    const section = document.getElementById('gallery-section');
    const error = document.createElement('div');
    error.textContent = message;
    error.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 1.5rem 2rem;
      background: rgba(192, 57, 43, 0.2);
      border: 1px solid #c0392b;
      color: #f5f0e8;
      border-radius: 0.5rem;
      text-align: center;
      max-width: 400px;
      z-index: 100;
    `;
    section.appendChild(error);
  }

  // ────────────────────────────────────────────────────────
  // INIT
  // ────────────────────────────────────────────────────────

  function init() {
    if (!galleryImg) return;

    log('🚀 Inicializando GALLERY_GPHOTO con API Key...');
    log('📌 Sin necesidad de autorización OAuth');

    // Cargar fotos automáticamente con API Key
    loadPhotosFromAlbum();
  }

  return { init };
})();

// Iniciar cuando DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 Iniciando galería de Google Fotos...');
  GALLERY_GPHOTO.init();
});
