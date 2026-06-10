/**
 * scroll-reveal.js — Parallax 3D sofisticado y scroll reveal
 * ════════════════════════════════════════════════════════
 */

const ParallaxEffect = (() => {
  // Desactivado: El movimiento de nubes se maneja ahora de forma independiente
  return { init: () => {} };
})();

// Scroll reveal para otras secciones
const ScrollReveal = (() => {
  const options = {
    threshold: 0.01,
    rootMargin: '0px 0px 0px 0px'
  };

  function initObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, options);

    // Observar secciones (excepto hero)
    document.querySelectorAll('section:not(#hero-section)').forEach(section => {
      observer.observe(section);
    });
  }

  return {
    init: () => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initObserver);
      } else {
        initObserver();
      }
    }
  };
})();

// Iniciar todo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ParallaxEffect.init();
    ScrollReveal.init();
  });
} else {
  ParallaxEffect.init();
  ScrollReveal.init();
}
