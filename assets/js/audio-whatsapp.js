(function () {
  const OWNER = 'kamenemak';
  const REPO  = 'murdoco-memorial';
  const PATH  = 'assets/audio';
  const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

  function formatName(filename) {
    return filename
      .replace(/\.ogg$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function renderAudio(files) {
    const list = document.getElementById('audio-list');
    if (!files.length) {
      list.innerHTML = '<p class="audio-loading">No hay audios disponibles aún.</p>';
      return;
    }
    list.innerHTML = files.map((f, i) => `
      <div class="audio-item">
        <span class="audio-item__label">${formatName(f.name)}</span>
        <audio controls preload="none" src="${f.download_url}"></audio>
      </div>
    `).join('');
  }

  async function loadAudios() {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const oggs = data.filter(f => /\.ogg$/i.test(f.name));
      renderAudio(oggs);
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
