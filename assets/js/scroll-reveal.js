/**
 * scroll-reveal.js — Parallax 3D sofisticado y scroll reveal
 * ════════════════════════════════════════════════════════
 */

const ParallaxEffect = (() => {
  let heroSection = null;
  let cloudsBack = null;
  let cloudsFront = null;
  let murdocoContainer = null;
  let heroText = null;

  function init() {
    heroSection = document.getElementById('hero-section');
    cloudsBack = document.getElementById('cloudsBack');
    cloudsFront = document.getElementById('cloudsFront');
    murdocoContainer = document.querySelector('.hero-content');
    heroText = document.getElementById('heroText');

    if (!heroSection) return;

    window.addEventListener('scroll', onScroll);
    onScroll(); // Inicial
  }

  function onScroll() {
    const scrollY = window.scrollY;
    const heroHeight = heroSection.offsetHeight;
    const progress = Math.min(scrollY / heroHeight, 1); // 0 a 1

    // NUBES DE FONDO: Suben lentamente y se expanden
    if (cloudsBack) {
      const backMove = scrollY * 0.4;
      cloudsBack.style.transform = `translateY(-${backMove}px)`;
    }

    // NUBES DE ADELANTE: Suben rápido y se expanden hacia afuera
    if (cloudsFront) {
      const frontMove = scrollY * 0.9;
      const scale = 1 + (progress * 0.15); // Se hacen un poco más grandes

      // Expansión hacia afuera (izquierda y derecha)
      const expandX = progress * 40;

      cloudsFront.style.transform = `translateY(-${frontMove}px) scale(${scale})`;

      // Cada nube se expande en su dirección
      document.querySelectorAll('.cloud-front-1, .cloud-front-3, .cloud-front-4').forEach(cloud => {
        cloud.style.transform = `translateX(-${expandX}px)`;
      });
      document.querySelectorAll('.cloud-front-2, .cloud-front-5').forEach(cloud => {
        cloud.style.transform = `translateX(${expandX}px)`;
      });
    }

    // MURDOCO: Fade out gradual, pero DESPUÉS que las nubes hayan subido
    if (murdocoContainer) {
      // Murdoco empieza a desaparecer después del 30% del scroll
      const murdocoProgress = Math.max(0, (progress - 0.3) / 0.7);
      murdocoContainer.style.opacity = Math.max(1 - murdocoProgress * 1.2, 0);
    }

    // TEXTO "MURDOCO": Aparece cuando Murdoco desaparece
    if (heroText) {
      const textProgress = Math.max(0, (progress - 0.3) / 0.7);
      heroText.style.opacity = Math.min(textProgress * 1.5, 1);
    }
  }

  return { init };
})();

// Scroll reveal para otras secciones
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
