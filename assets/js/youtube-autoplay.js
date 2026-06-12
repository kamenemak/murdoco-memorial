/**
 * youtube-autoplay.js — Control de autoplay y volumen máximo en YouTube
 * ════════════════════════════════════════════════════════════════════
 * Solución elegante para políticas de autoplay de navegadores modernos:
 * 1. Inicia silenciado (para que no se pause automáticamente)
 * 2. Espera interacción del usuario (clic o toque)
 * 3. En el primer clic, desbloquea el audio al máximo
 */

let ytPlayer = null;
let audioDesbloqueado = false;

// Cargar la API de YouTube
function loadYouTubeAPI() {
  if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  }
}

// Callback que YouTube llama cuando la API está lista
window.onYouTubeIframeAPIReady = function() {
  console.log('✅ YouTube IFrame API está lista');

  // Obtener el iframe que ya está en el HTML
  const iframeEl = document.getElementById('yt-player-iframe');

  if (iframeEl) {
    // Crear objeto player que controle el iframe embebido
    ytPlayer = new window.YT.Player(iframeEl, {
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
  }
};

// Cuando el reproductor está completamente listo
function onPlayerReady(event) {
  console.log('🎬 Reproductor listo');

  setTimeout(() => {
    try {
      // 1. Iniciar SILENCIADO para que el navegador NO lo pause automáticamente
      event.target.mute();
      console.log('🔇 Iniciando silenciado (política de navegador)');

      // 2. Iniciar reproducción
      event.target.playVideo();
      console.log('▶️ Reproducción iniciada en silencio');

      // 3. Esperar al primer clic/toque del usuario para desbloquear audio
      console.log('👂 Esperando interacción del usuario...');
      document.addEventListener('click', desbloquearAudio, { once: true });
      document.addEventListener('touchstart', desbloquearAudio, { once: true });

    } catch (e) {
      console.warn('⚠️ Error al inicializar reproductor:', e);
    }
  }, 500);
}

// Cuando el estado del video cambia
function onPlayerStateChange(event) {
  const state = event.data;
  const states = {
    '-1': 'Sin inicializar',
    '0': 'Finalizado',
    '1': 'Reproduciendo',
    '2': 'Pausado',
    '3': 'Buffering',
    '5': 'Pista de video'
  };

  console.log(`📊 Estado: ${states[state] || state}`);

  // Si aún no está desbloqueado, mantener silenciado
  if (!audioDesbloqueado && state === window.YT.PlayerState.PAUSED) {
    console.log('⏸️ Video pausado — esperando interacción para desbloquear audio');
  }
}

/**
 * Se ejecuta cuando el usuario hace clic o toca cualquier parte de la página
 * Esto desbloquea el audio al máximo
 */
function desbloquearAudio() {
  if (audioDesbloqueado) return; // Solo una vez

  console.log('🎯 ¡Interacción del usuario detectada!');

  if (ytPlayer && typeof ytPlayer.unMute === 'function') {
    try {
      // 1. Quitar silencio
      ytPlayer.unMute();
      console.log('🔊 Silencio removido');

      // 2. Volumen lo maneja ytDuck en audio-whatsapp.js; aquí solo se desmutea

      // 3. Asegurar reproducción
      ytPlayer.playVideo();
      console.log('▶️ Reproducción al máximo volumen');

      audioDesbloqueado = true;

      // 4. Ocultar el banner de audio unlock
      const banner = document.getElementById('audio-unlock-banner');
      if (banner) {
        banner.classList.add('hidden');
        console.log('👋 Banner de audio ocultado');
      }

    } catch (e) {
      console.warn('⚠️ Error al desbloquear audio:', e);
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Iniciando YouTube Autoplay con Gesture Detection...');
  loadYouTubeAPI();
});
