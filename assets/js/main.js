/**
 * main.js — Coordinador principal
 * Inicializa efectos globales y pequeñas mejoras de UX.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Intersection Observer: animaciones al entrar en viewport ───────────
  const fadeTargets = document.querySelectorAll('.section-eyebrow, .section-sub, #player-box, #notebook-wrapper');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity   = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  fadeTargets.forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
    observer.observe(el);
  });

  // ─── Indicador de sección activa en los hints de scroll ─────────────────
  const sections = document.querySelectorAll('section');
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.title = `${entry.target.dataset.title || 'Portafolio'} — JuanMa Bobadilla`;
      }
    });
  }, { threshold: 0.5 });

  const sectionTitles = {
    'gallery-section':  'Galería',
    'music-section':    'Música',
    'notebook-section': 'Cuaderno',
  };
  sections.forEach(sec => {
    sec.dataset.title = sectionTitles[sec.id] || 'Portafolio';
    scrollObserver.observe(sec);
  });

  // ─── Console Easter Egg ──────────────────────────────────────────────────
  console.log('%c📒 Portafolio de JuanMa Bobadilla', 'font-size:1.2rem;font-weight:bold;color:#b8860b;');
  console.log('%cHecho con HTML + CSS + JS vanilla · GitHub Pages', 'color:#8b6f47;');
});
