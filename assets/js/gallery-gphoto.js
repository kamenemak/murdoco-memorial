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

  // DOM
  const galleryImg = document.getElementById('gallery-img');
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

      if (!folderId || folderId === 'TU_GOOGLE_DRIVE_FOLDER_ID') {
        log('⚠️ googleDriveFolderId no configurado en config.js');
        showError('Configura tu carpeta de Google Drive en config.js');
        return;
      }

      log(`📸 Cargando fotos de Google Drive: ${folderId}`);

      // Usar la API de Google Photos
      let token = localStorage.getItem('murdoco_gdrive_token');

      if (!token) {
        log('⏳ Sin token, esperando autorización...');
        // Esperar a que se obtenga el token
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          token = localStorage.getItem('murdoco_gdrive_token');
          if (token) {
            log('✓ Token obtenido');
            break;
          }
        }

        if (!token) {
          log('⚠️ Sin token después de esperar. Necesitas autorizar Google primero');
          showError('Necesitas autorizar Google primero');
          return;
        }
      }

      // Google Drive API - Query correcta
      const query = `mimeType contains 'image/' and '${folderId}' in parents and trashed=false`;

      log(`🔍 Buscando imágenes con query: ${query.substring(0, 50)}...`);

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=100&fields=files(id,name,thumbnailLink,mimeType)&orderBy=modifiedTime%20desc`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
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
      // Usar thumbnailLink y reemplazar el tamaño por =s0 para resolución original
      images = files.map((file, idx) => {
        let imageUrl = file.thumbnailLink || `https://drive.google.com/uc?export=view&id=${file.id}`;

        // Reemplazar tamaño de miniatura por resolución original
        imageUrl = imageUrl.replace(/=s\d+$/, '=s0');

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

  function initGallery() {
    if (images.length === 0) return;

    log(`🎬 Galería inicializada con ${images.length} foto(s)`);

    // Precargar la primera y segunda imagen
    preloadImage(0);
    preloadImage(1);

    goTo(0);
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

    // Visibilidad
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearInterval(timer);
      } else if (isPlaying) {
        startTimer();
      }
    });
  }

  function goTo(index) {
    currentIndex = ((index % images.length) + images.length) % images.length;
    const img = images[currentIndex];

    galleryImg.classList.add('fade-out');

    setTimeout(() => {
      galleryImg.src = img.src;
      galleryImg.onerror = () => {
        log(`⚠️ Error cargando foto: ${img.title}`);
      };

      counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
      galleryImg.classList.remove('fade-out');

      // Precargar la siguiente imagen sin saltos
      const nextIndex = (currentIndex + 1) % images.length;
      setTimeout(() => {
        preloadImage(nextIndex);
      }, 500);
    }, 1000); // Transición más lenta y elegante
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

  function showAuthButton() {
    const section = document.getElementById('gallery-section');
    const button = document.createElement('button');
    button.textContent = '🔐 Autorizar Google Fotos';
    button.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 1rem 2rem;
      background: var(--rust);
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      z-index: 100;
      font-weight: 600;
    `;
    button.onmouseover = () => button.style.opacity = '0.8';
    button.onmouseout = () => button.style.opacity = '1';

    button.onclick = async () => {
      log('🔐 Abriendo autorización de Google...');
      // Abrir ventana de login de Google
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.googleClientId}&redirect_uri=${encodeURIComponent(window.location.origin + window.location.pathname)}&response_type=code&scope=https://www.googleapis.com/auth/photoslibrary.readonly`;
    };

    section.appendChild(button);
    log('✓ Botón de autorización mostrado');
  }

  function init() {
    if (!galleryImg) return;

    log('🚀 Inicializando GALLERY_GPHOTO...');

    // Verificar si hay un token válido
    const token = localStorage.getItem('murdoco_gdrive_token');
    if (token) {
      loadPhotosFromAlbum();
    } else {
      log('⚠️ Sin token de autorización');
      showAuthButton();
    }
  }

  return { init };
})();

// Iniciar cuando DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 Iniciando galería de Google Fotos...');
  GALLERY_GPHOTO.init();
});
