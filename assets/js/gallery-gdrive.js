/**
 * gallery-gdrive.js — Galería con carga automática desde Google Drive
 * ═════════════════════════════════════════════════════════════════════
 * Carga automáticamente todas las imágenes de una carpeta de Google Drive
 *
 * Requiere: config.js con googleClientId y googleDriveFolderId
 */

const GALLERY_GDRIVE = (() => {

  // Estado
  let images = [];
  let currentIndex = 0;
  let isPlaying = true;
  let timer = null;
  let tokenClient = null;
  let accessToken = null;
  const INTERVAL_MS = 5000;

  // DOM
  const galleryImg = document.getElementById('gallery-img');
  const titleEl = document.getElementById('gallery-title');
  const counterEl = document.getElementById('gallery-counter');
  const btnPrev = document.getElementById('prev-img');
  const btnPause = document.getElementById('pause-img');
  const btnNext = document.getElementById('next-img');

  // ─────────────────────────────────────────────────────────────────
  // GOOGLE API INITIALIZATION (Nueva forma)
  // ─────────────────────────────────────────────────────────────────

  function initGoogleAPI() {
    log('🔐 Inicializando Google API...');

    // Crear token client para OAuth
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: config.googleClientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: handleTokenResponse,
    });

    // Intentar cargar token del localStorage
    const savedToken = localStorage.getItem('murdoco_gdrive_token');
    if (savedToken) {
      log('✓ Token guardado encontrado, intentando cargar...');
      accessToken = savedToken;
      loadImagesFromDrive();
    } else {
      log('⚠️ Sin token de acceso, solicitando autorización...');
      showAuthButton();
    }
  }

  function handleTokenResponse(response) {
    if (response.access_token) {
      accessToken = response.access_token;
      localStorage.setItem('murdoco_gdrive_token', accessToken);
      log('✓ Token obtenido y guardado');

      // Remover botón de autorización
      document.querySelector('#gallery-section button')?.remove();

      // Cargar imágenes
      loadImagesFromDrive();
    }
  }

  function showAuthButton() {
    const section = document.getElementById('gallery-section');
    const button = document.createElement('button');
    button.textContent = '🔓 Autorizar Google Drive';
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
      transition: all 0.3s;
      font-weight: 600;
    `;
    button.onmouseover = () => button.style.opacity = '0.8';
    button.onmouseout = () => button.style.opacity = '1';
    button.onclick = authorizeGoogle;
    section.appendChild(button);

    log('✓ Botón de autorización mostrado');
  }

  function authorizeGoogle() {
    log('🔐 Solicitando autorización...');
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  // ─────────────────────────────────────────────────────────────────
  // CARGAR IMÁGENES DESDE GOOGLE DRIVE
  // ─────────────────────────────────────────────────────────────────

  async function loadImagesFromDrive() {
    try {
      if (!accessToken) {
        logError('❌ No hay token de acceso');
        return;
      }

      log(`📁 Buscando imágenes en carpeta: ${config.googleDriveFolderId}`);

      // Buscar archivos con la API REST
      const query = `'${config.googleDriveFolderId}' in parents and trashed=false and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/gif' or mimeType='image/webp')`;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&pageSize=1000&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime%20desc`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const files = data.files || [];
      log(`📸 Encontradas ${files.length} imágenes`);

      if (files.length === 0) {
        log('⚠️ No hay imágenes en Google Drive, usando imagen local...');
        images = [{
          id: 'local-murdoco',
          title: 'Murdoco — Sebastian Antonio Bobadilla Rivas',
          src: 'assets/images/murdoco.png'
        }];
        initGallery();
        return;
      }

      // Convertir archivos a formato de imágenes
      images = files.map(file => ({
        id: file.id,
        title: file.name.replace(/\.[^.]+$/, ''), // Quitar extensión
        src: `https://drive.google.com/uc?export=view&id=${file.id}`
      }));

      log(`✓ ${images.length} imágenes cargadas desde Google Drive`);
      initGallery();
    } catch (error) {
      logError('❌ Error cargando imágenes:', error);

      // Fallback: usar imagen local
      log('⚠️ Usando imagen local como respaldo...');
      images = [{
        id: 'local-murdoco',
        title: 'Murdoco — Sebastian Antonio Bobadilla Rivas',
        src: 'assets/images/murdoco.png'
      }];
      initGallery();
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // GALERÍA
  // ─────────────────────────────────────────────────────────────────

  function initGallery() {
    if (images.length === 0) return;

    log(`🎬 Galería inicializada con ${images.length} imagen(es)`);

    // Mostrar primera imagen
    goTo(0);
    startTimer();

    // Event listeners
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
        log(`⚠️ Error cargando imagen: ${img.title}`);
        console.warn(`La imagen "${img.title}" no se pudo cargar. Verifica que esté compartida públicamente en Google Drive.`);
      };
      titleEl.textContent = img.title;
      counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
      galleryImg.classList.remove('fade-out');
    }, 400);
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

  // ─────────────────────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────────────────────

  function log(msg) {
    console.log(msg);
    if (config.debug) console.log('[DEBUG]', msg);
  }

  function logError(msg, err) {
    console.error(msg, err);
  }

  // ─────────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────────

  function init() {
    if (!galleryImg) {
      logError('❌ Elemento #gallery-img no encontrado');
      return;
    }

    if (!config.googleClientId || config.googleClientId === 'TU_CLIENT_ID.apps.googleusercontent.com') {
      showError('⚠️ googleClientId no configurado en config.js');
      titleEl.textContent = 'Configura Google Drive API';
      return;
    }

    if (!config.googleDriveFolderId || config.googleDriveFolderId === 'TU_GOOGLE_DRIVE_FOLDER_ID') {
      showError('⚠️ googleDriveFolderId no configurado en config.js');
      titleEl.textContent = 'Configura la carpeta de Google Drive';
      return;
    }

    log('🚀 Inicializando GALLERY_GDRIVE...');
    initGoogleAPI();
  }

  // Función para esperar a que Google esté disponible
  function waitForGoogle() {
    if (window.google && window.google.accounts) {
      log('✓ Google API disponible');
      init();
    } else {
      log('⏳ Esperando Google API...');
      setTimeout(waitForGoogle, 100);
    }
  }

  return {
    init: waitForGoogle,
    directInit: init
  };
})();

// Cargar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM cargado, iniciando galería...');
  GALLERY_GDRIVE.init();
});
