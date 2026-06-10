/**
 * main-effects.js
 * Efecto de fade: Solo Murdoco desaparece con scroll
 * Efecto de nube flotante: cloud-front-3 se mueve suavemente
 */

document.addEventListener('DOMContentLoaded', () => {
  const heroSection = document.getElementById('hero-section');
  const heroText = document.querySelector('.hero-text');
  const murdocoImg = document.querySelector('.murdoco-image');

  // Todas las nubes
  const clouds = {
    // Nubes de atrás
    back1: document.querySelector('.cloud-back-1'),
    back1Mirror: document.querySelector('.cloud-back-1-mirror'),
    back2: document.querySelector('.cloud-back-2'),
    back2Mirror: document.querySelector('.cloud-back-2-mirror'),
    back3: document.querySelector('.cloud-back-3'),
    back3Mirror: document.querySelector('.cloud-back-3-mirror'),
    // Nubes de adelante
    front1: document.querySelector('.cloud-front-1'),
    front1Mirror: document.querySelector('.cloud-front-1-mirror'),
    front2: document.querySelector('.cloud-front-2'),
    front2Mirror: document.querySelector('.cloud-front-2-mirror'),
    front3: document.querySelector('.cloud-front-3'),
    front3Mirror: document.querySelector('.cloud-front-3-mirror'),
    front4: document.querySelector('.cloud-front-4'),
    front4Mirror: document.querySelector('.cloud-front-4-mirror'),
    front5: document.querySelector('.cloud-front-5'),
    front5Mirror: document.querySelector('.cloud-front-5-mirror'),
  };

  if (!heroSection) return;

  const viewportHeight = window.innerHeight;

  // Determinar el scale una sola vez según el tamaño de la pantalla
  const getCloudScale = () => {
    let scaleValue = 1.6;
    if (window.innerWidth <= 1599) scaleValue = 1.5;
    if (window.innerWidth <= 1400) scaleValue = 1.4;
    if (window.innerWidth <= 1200) scaleValue = 1.2;
    if (window.innerWidth <= 768) scaleValue = 1.0;
    if (window.innerWidth <= 480) scaleValue = 1.2;
    return scaleValue;
  };

  let cloudScale = getCloudScale();

  // Inicializar las nubes desde el principio con escala correcta
  const initializeClouds = () => {

    // Nubes front (1, 2, 4, 5) con scale
    [clouds.front1, clouds.front2, clouds.front4, clouds.front5].forEach(cloud => {
      if (cloud) cloud.style.transform = `scale(${cloudScale}) translateX(0px) translateY(0px)`;
    });

    // Cloud front 3 sin scale
    if (clouds.front3) clouds.front3.style.transform = `translateX(0px) translateY(0px)`;

    // Nubes front mirrors (1, 2, 4, 5) con scale
    [clouds.front1Mirror, clouds.front2Mirror, clouds.front4Mirror, clouds.front5Mirror].forEach(cloud => {
      if (cloud) cloud.style.transform = `scaleX(-1) scale(${cloudScale}) translateX(0px) translateY(0px)`;
    });

    // Cloud front 3 mirror sin scale
    if (clouds.front3Mirror) clouds.front3Mirror.style.transform = `scaleX(-1) translateX(0px) translateY(0px)`;

    // Nubes back (1, 2, 3) con scale 1.5
    [clouds.back1, clouds.back2, clouds.back3].forEach(cloud => {
      if (cloud) cloud.style.transform = `scale(1.5) translateX(0px)`;
    });

    // Nubes back mirrors con scale 1.5
    [clouds.back1Mirror, clouds.back2Mirror, clouds.back3Mirror].forEach(cloud => {
      if (cloud) cloud.style.transform = `scaleX(-1) scale(1.5) translateX(0px)`;
    });
  };

  initializeClouds();

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const progress = Math.min(scrollY / viewportHeight, 1);

    // Murdoco desaparece más rápido (x2)
    if (murdocoImg) {
      murdocoImg.style.opacity = Math.max(0, 1 - progress * 2);
    }

    // Texto 3D aparece más rápido (x2)
    if (heroText) {
      heroText.style.opacity = Math.min(1, progress * 2);

      const h1 = heroText.querySelector('h1');
      if (h1) {
        h1.style.opacity = Math.min(1, Math.max(0, progress * 1.2 - 0.3));
      }

      const p = heroText.querySelector('p');
      if (p) {
        p.style.opacity = Math.max(0, progress * 2 - 0.6);
      }
    }

    // Cálculos de movimiento
    const moveUp = Math.min(scrollY * 0.01, 25);
    const sideMove = Math.min(scrollY * 0.005, 10);
    const moveDown = Math.max(scrollY * -0.01, -25);
    const sideMoveOpposite = sideMove * -1;

    // Movimiento para nubes de atrás (sin límite, mucho más largo)
    const sideBackMove = scrollY * 0.02;

    // Aplicar movimiento a nubes normales (bajan a derecha)
    if (clouds.front1) clouds.front1.style.transform = `scale(${cloudScale}) translateX(${sideMove}px) translateY(${moveUp}px)`;
    if (clouds.front2) clouds.front2.style.transform = `scale(${cloudScale}) translateX(${sideMove}px) translateY(${moveUp}px)`;
    if (clouds.front3) clouds.front3.style.transform = `translateX(${sideMove}px) translateY(${moveUp}px)`;
    if (clouds.front4) clouds.front4.style.transform = `scale(${cloudScale}) translateX(${sideMove}px) translateY(${moveUp}px)`;
    if (clouds.front5) clouds.front5.style.transform = `scale(${cloudScale}) translateX(${sideMove}px) translateY(${moveUp}px)`;

    // Aplicar movimiento a mirrors (suben a izquierda)
    if (clouds.front1Mirror) clouds.front1Mirror.style.transform = `scaleX(-1) scale(${cloudScale}) translateX(${sideMoveOpposite}px) translateY(${moveDown}px)`;
    if (clouds.front2Mirror) clouds.front2Mirror.style.transform = `scaleX(-1) scale(${cloudScale}) translateX(${sideMoveOpposite}px) translateY(${moveDown}px)`;
    if (clouds.front3Mirror) clouds.front3Mirror.style.transform = `scaleX(-1) translateX(${sideMoveOpposite}px) translateY(${moveDown}px)`;
    if (clouds.front4Mirror) clouds.front4Mirror.style.transform = `scaleX(-1) scale(${cloudScale}) translateX(${sideMoveOpposite}px) translateY(${moveDown}px)`;
    if (clouds.front5Mirror) clouds.front5Mirror.style.transform = `scaleX(-1) scale(${cloudScale}) translateX(${sideMoveOpposite}px) translateY(${moveDown}px)`;

    // Movimiento solo horizontal para nubes de atrás (sin límite, continuo)
    if (clouds.back1) clouds.back1.style.transform = `scale(1.5) translateX(${sideBackMove}px)`;
    if (clouds.back2) clouds.back2.style.transform = `scale(1.5) translateX(${sideBackMove}px)`;
    if (clouds.back3) clouds.back3.style.transform = `scale(1.5) translateX(${sideBackMove}px)`;

    if (clouds.back1Mirror) clouds.back1Mirror.style.transform = `scaleX(-1) scale(1.5) translateX(${-sideBackMove}px)`;
    if (clouds.back2Mirror) clouds.back2Mirror.style.transform = `scaleX(-1) scale(1.5) translateX(${-sideBackMove}px)`;
    if (clouds.back3Mirror) clouds.back3Mirror.style.transform = `scaleX(-1) scale(1.5) translateX(${-sideBackMove}px)`;
  });
});
