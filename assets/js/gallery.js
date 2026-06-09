/**
 * gallery.js — Galería de imágenes con pase aleatorio
 * ────────────────────────────────────────────────────
 * CÓMO AGREGAR TUS IMÁGENES:
 *   1. Sube los archivos a la carpeta  assets/images/
 *   2. Agrega cada imagen al array IMAGES con su nombre de archivo y título
 *
 * Formatos soportados: jpg, jpeg, png, webp, gif
 */

const GALLERY = (() => {

  // ─── CONFIGURA TUS IMÁGENES AQUÍ ───────────────────────────────────────────
  // Opción 1: URLs directas (de Google Drive, Imgur, etc.)
  // Para Google Drive: Descarga > Copia el link compartible
  // Reemplaza en la URL "sharing" por "uc?export=view&id="
  // Ej: https://drive.google.com/uc?export=view&id=ARCHIVO_ID

  const IMAGES = [
    { src: 'assets/images/placeholder.jpg', title: 'Murdoco' },
    // Agrega tus imágenes aquí:
    // { src: 'https://drive.google.com/uc?export=view&id=ARCHIVO_ID', title: 'Título' },
    // { src: 'assets/images/foto2.jpg', title: 'Otro título' },
  ];

  // Intervalo entre imágenes (milisegundos)
  const INTERVAL_MS = 5000;
  // ───────────────────────────────────────────────────────────────────────────

  // Estado interno
  let shuffled  = [];
  let current   = 0;
  let timer     = null;
  let isPaused  = false;

  // Elementos del DOM
  const img        = document.getElementById('gallery-img');
  const titleEl    = document.getElementById('gallery-title');
  const counterEl  = document.getElementById('gallery-counter');
  const btnPrev    = document.getElementById('prev-img');
  const btnPause   = document.getElementById('pause-img');
  const btnNext    = document.getElementById('next-img');

  /** Fisher-Yates shuffle */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Transición suave entre imágenes */
  function goTo(index, direction = 1) {
    // Normalizar índice
    current = ((index % shuffled.length) + shuffled.length) % shuffled.length;
    const item = shuffled[current];

    img.classList.add('fade-out');

    setTimeout(() => {
      img.src      = item.src;
      titleEl.textContent   = item.title;
      counterEl.textContent = `${current + 1} / ${shuffled.length}`;
      img.classList.remove('fade-out');
    }, 400); // mitad del transition de CSS
  }

  function next()  { goTo(current + 1); }
  function prev()  { goTo(current - 1); }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(next, INTERVAL_MS);
  }

  function togglePause() {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? '▶' : '⏸';
    btnPause.setAttribute('aria-label', isPaused ? 'Reanudar' : 'Pausar');
    if (isPaused) {
      clearInterval(timer);
    } else {
      startTimer();
    }
  }

  /** Inicialización */
  function init() {
    if (!img) return; // Elemento no encontrado

    // Si no hay imágenes configuradas, mostrar placeholder y salir
    if (IMAGES.length === 0) {
      titleEl.textContent   = 'Agrega tus imágenes en gallery.js';
      counterEl.textContent = '0 / 0';
      return;
    }

    shuffled = shuffle(IMAGES);
    goTo(0);
    startTimer();

    // Eventos de navegación
    btnNext.addEventListener('click', () => { goTo(current + 1); startTimer(); });
    btnPrev.addEventListener('click', () => { goTo(current - 1); startTimer(); });
    btnPause.addEventListener('click', togglePause);

    // Pausa automática cuando la pestaña no está visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearInterval(timer);
      } else if (!isPaused) {
        startTimer();
      }
    });

    // Soporte teclado (← →) cuando el foco está en la galería
    document.getElementById('gallery-section')
      .addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { goTo(current + 1); startTimer(); }
        if (e.key === 'ArrowLeft')  { goTo(current - 1); startTimer(); }
        if (e.key === ' ')          { togglePause(); }
      });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', GALLERY.init);
