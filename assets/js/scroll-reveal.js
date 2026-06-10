/**
 * scroll-reveal.js — Animar elementos al entrar en viewport
 * ════════════════════════════════════════════════════════
 * Usa Intersection Observer para reveal suave al scrollear
 */

const ScrollReveal = (() => {
  const options = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
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

    // Observar secciones
    document.querySelectorAll('section').forEach(section => {
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

// Iniciar
ScrollReveal.init();
