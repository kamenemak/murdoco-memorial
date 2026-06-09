/**
 * player.js — Reproductor de música con lista de reproducción
 * ────────────────────────────────────────────────────────────
 * MODO A — Archivos propios (MP3 en assets/music/)
 *   Configura USE_YOUTUBE = false y llena el array TRACKS
 *
 * MODO B — YouTube (sin ocupar espacio en el repo)
 *   Configura USE_YOUTUBE = true y llena el array TRACKS con videoId de YouTube
 */

const PLAYER = (() => {

  // ─── CONFIGURA AQUÍ ────────────────────────────────────────────────────────

  /** true = YouTube IFrame API | false = archivos MP3 locales */
  const USE_YOUTUBE = false;

  /**
   * YOUTUBE: src → ID del video (la parte después de v= en la URL)
   * Ej: https://www.youtube.com/watch?v=dQw4w9WgXcQ → src: 'dQw4w9WgXcQ'
   *
   * Para agregar tu playlist:
   * 1. Ve a tu playlist en YouTube
   * 2. Haz clic en cada video
   * 3. Copia el ID (después de ?v=) y el título
   * 4. Agrega las líneas aquí
   */
  const TRACKS = [
    // Agrega tus videos de YouTube aquí:
    // { title: 'Nombre de la canción', src: 'VIDEO_ID_AQUI', duration: '3:42' },
    // { title: 'Otra canción', src: 'OTRO_ID', duration: '4:15' },
  ];
  // ───────────────────────────────────────────────────────────────────────────

  // Estado
  let currentTrack = 0;
  let isPlaying    = false;
  let isShuffle    = false;
  let ytPlayer     = null;
  let shuffleOrder = [];

  // Elementos DOM
  const audio        = document.getElementById('audio-player');
  const playlistEl   = document.getElementById('playlist');
  const nowPlayingEl = document.getElementById('now-playing');
  const nowShortEl   = document.getElementById('now-playing-short');
  const vinylEl      = document.getElementById('vinyl-disc');
  const btnPlay      = document.getElementById('btn-play');
  const btnPrev      = document.getElementById('btn-prev-track');
  const btnNext      = document.getElementById('btn-next-track');
  const btnShuffle   = document.getElementById('btn-shuffle');
  const volumeSlider = document.getElementById('volume-slider');

  // ─── Utilidades ────────────────────────────────────────────────────────────
  function buildShuffleOrder() {
    shuffleOrder = [...Array(TRACKS.length).keys()]
      .sort(() => Math.random() - 0.5);
  }

  function getEffectiveIndex(i) {
    return isShuffle ? shuffleOrder[i] : i;
  }

  function updateUI(trackIndex) {
    const t = TRACKS[trackIndex];
    nowPlayingEl.textContent  = t.title;
    nowShortEl.textContent    = t.title.charAt(0).toUpperCase();

    document.querySelectorAll('#playlist li').forEach((li, i) => {
      li.classList.toggle('active', i === trackIndex);
    });
  }

  function setVinylSpinning(state) {
    vinylEl.classList.toggle('spinning', state);
    btnPlay.textContent = state ? '⏸' : '▶';
    btnPlay.setAttribute('aria-label', state ? 'Pausar' : 'Reproducir');
  }

  // ─── MODO A: Audio HTML5 ───────────────────────────────────────────────────
  function loadLocalTrack(index) {
    const t = TRACKS[index];
    audio.src = `assets/music/${t.src}`;
    audio.volume = parseFloat(volumeSlider.value);
    updateUI(index);
    if (isPlaying) audio.play().catch(() => {});
  }

  // ─── MODO B: YouTube ───────────────────────────────────────────────────────
  function loadYouTubeTrack(index) {
    const t = TRACKS[index];
    updateUI(index);
    if (ytPlayer && ytPlayer.loadVideoById) {
      ytPlayer.loadVideoById(t.src);
    }
  }

  function initYouTubeAPI() {
    document.getElementById('yt-player-container').style.display = 'block';
    // Cargar script de YouTube si no existe
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      ytPlayer = new window.YT.Player('yt-player', {
        height: '0', width: '0',
        playerVars: { autoplay: 0, controls: 0 },
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) setVinylSpinning(true);
            if (e.data === window.YT.PlayerState.PAUSED)  setVinylSpinning(false);
            if (e.data === window.YT.PlayerState.ENDED)   nextTrack();
          }
        }
      });
    };
  }

  // ─── Controles ─────────────────────────────────────────────────────────────
  function playTrack(index) {
    currentTrack = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length;
    if (USE_YOUTUBE) {
      loadYouTubeTrack(currentTrack);
      isPlaying = true;
      setVinylSpinning(true);
    } else {
      loadLocalTrack(currentTrack);
    }
  }

  function togglePlay() {
    if (USE_YOUTUBE) {
      if (!ytPlayer) return;
      if (isPlaying) { ytPlayer.pauseVideo(); isPlaying = false; setVinylSpinning(false); }
      else           { ytPlayer.playVideo();  isPlaying = true;  setVinylSpinning(true); }
    } else {
      if (audio.paused) {
        audio.play().then(() => { isPlaying = true; setVinylSpinning(true); }).catch(() => {});
      } else {
        audio.pause(); isPlaying = false; setVinylSpinning(false);
      }
    }
  }

  function nextTrack() {
    const next = (currentTrack + 1) % TRACKS.length;
    playTrack(next);
  }
  function prevTrack() {
    const prev = ((currentTrack - 1) + TRACKS.length) % TRACKS.length;
    playTrack(prev);
  }

  function toggleShuffle() {
    isShuffle = !isShuffle;
    btnShuffle.classList.toggle('active', isShuffle);
    if (isShuffle) buildShuffleOrder();
  }

  // ─── Render de la playlist ─────────────────────────────────────────────────
  function renderPlaylist() {
    playlistEl.innerHTML = '';
    TRACKS.forEach((t, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="track-name">${t.title}</span>
        <span class="track-duration">${t.duration || ''}</span>
      `;
      li.addEventListener('click', () => { isPlaying = true; playTrack(i); });
      playlistEl.appendChild(li);
    });
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    if (!playlistEl) return;

    if (TRACKS.length === 0) {
      playlistEl.innerHTML = '<li style="opacity:0.4;cursor:default;">Agrega pistas en player.js</li>';
      return;
    }

    renderPlaylist();
    buildShuffleOrder();

    if (USE_YOUTUBE) {
      initYouTubeAPI();
    } else {
      // Eventos del elemento audio
      audio.addEventListener('ended', nextTrack);
      audio.addEventListener('play',  () => { isPlaying = true;  setVinylSpinning(true);  });
      audio.addEventListener('pause', () => { isPlaying = false; setVinylSpinning(false); });
      audio.volume = parseFloat(volumeSlider.value);
      // Pre-cargar primera pista sin auto-reproducir (política de navegadores)
      updateUI(0);
      audio.src = `assets/music/${TRACKS[0].src}`;
    }

    // Botones
    btnPlay.addEventListener('click', togglePlay);
    btnNext.addEventListener('click', () => { isPlaying = true; nextTrack(); });
    btnPrev.addEventListener('click', () => { isPlaying = true; prevTrack(); });
    btnShuffle.addEventListener('click', toggleShuffle);
    volumeSlider.addEventListener('input', () => {
      if (!USE_YOUTUBE) audio.volume = parseFloat(volumeSlider.value);
      // Para YouTube: ytPlayer.setVolume(val * 100)
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', PLAYER.init);
