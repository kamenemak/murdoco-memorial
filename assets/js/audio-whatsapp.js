(function () {
  const OWNER = 'kamenemak';
  const REPO  = 'murdoco-memorial';
  const PATH  = 'assets/audio';
  const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

  let files = [];
  let currentIndex = -1;

  function formatName(filename) {
    return filename
      .replace(/(\.\w+)+$/i, '')   // quita todas las extensiones (ej: .m4a.mp4)
      .replace(/[-_]/g, ' ')
      .trim();
  }

  function loadTrack(index) {
    if (index < 0 || index >= files.length) return;
    currentIndex = index;
    const f = files[index];
    const player = document.getElementById('audio-main-player');
    const nameEl = document.getElementById('audio-now-name');
    player.src = f.download_url;
    nameEl.textContent = formatName(f.name);
    player.play();

    document.querySelectorAll('.audio-list-item').forEach((el, i) => {
      el.classList.toggle('audio-list-item--active', i === index);
    });
  }

  function renderList() {
    const list = document.getElementById('audio-list');
    if (!files.length) {
      list.innerHTML = '<p class="audio-loading">No hay audios disponibles aún.</p>';
      return;
    }
    list.innerHTML = files.map((f, i) => `
      <button class="audio-list-item" data-index="${i}" type="button">
        <span class="audio-list-item__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="audio-list-item__name">${formatName(f.name)}</span>
        <span class="audio-list-item__play" aria-hidden="true">▶</span>
      </button>
    `).join('');

    list.querySelectorAll('.audio-list-item').forEach(btn => {
      btn.addEventListener('click', () => loadTrack(+btn.dataset.index));
    });
  }

  async function loadAudios() {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      files = data.filter(f => /\.(ogg|mp3|m4a|wav|opus|aac|mp4)$/i.test(f.name));
      renderList();

      const player = document.getElementById('audio-main-player');
      player.addEventListener('ended', () => {
        if (currentIndex + 1 < files.length) loadTrack(currentIndex + 1);
      });
    } catch (e) {
      const list = document.getElementById('audio-list');
      if (list) list.innerHTML = '<p class="audio-loading">Audios no disponibles.</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAudios);
  } else {
    loadAudios();
  }
})();
