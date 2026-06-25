const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz3PYKBtve9BvPSONcwTY35H53qpzaLL14RUCkDyFbV4s3wxRb_X-gVpX3fsNGOIu4G/exec";

let artistsData = [];

async function fetchArtists() {
  const loading = document.getElementById('artistsLoading');
  const errorBox = document.getElementById('artistsError');
  const emptyBox = document.getElementById('artistsEmpty');
  const grid = document.getElementById('artistsGrid');

  try {
    const resp = await fetch(WEBAPP_URL + '?action=listArtists');
    const data = await resp.json();

    if (data.status !== 'success') {
      throw new Error(data.message || 'Erro ao carregar artistas');
    }

    artistsData = data.artists || [];
    loading.style.display = 'none';

    if (!artistsData.length) {
      emptyBox.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    renderArtists(artistsData, grid);

  } catch (err) {
    console.error(err);
    loading.style.display = 'none';
    errorBox.style.display = 'block';
    errorBox.textContent = 'Erro ao carregar artistas.';
  }
}

function renderArtists(lista, container) {
  container.innerHTML = '';

  lista.forEach((artista, index) => {
    const card = document.createElement('div');
    card.className = 'artist-card';

    const photo = buildPhoto(artista.foto);
    const instaLabel = formatInstagramLabel(artista.insta);

    card.innerHTML = `
      <div class="artist-photo-wrap">
        ${photo}
      </div>

      <div class="artist-content">
        <h3 class="artist-name">${escapeHtml(artista.nome)}</h3>

        <p class="artist-bio">${escapeHtml(artista.bio || '')}</p>

        <button class="artist-readmore" type="button" data-index="${index}" style="display:none;">
          ler mais
        </button>

        ${buildSocial(artista.insta, instaLabel)}
      </div>
    `;

    container.appendChild(card);
  });

  requestAnimationFrame(checkReadMoreButtons);
}

function checkReadMoreButtons() {
  document.querySelectorAll('.artist-card').forEach((card) => {
    const bio = card.querySelector('.artist-bio');
    const btn = card.querySelector('.artist-readmore');

    if (!bio || !btn) return;

    if (bio.scrollHeight > bio.clientHeight + 2) {
      btn.style.display = 'block';
    }
  });
}

function buildPhoto(url) {
  if (!url) {
    return `<div class="artist-fallback">Sem imagem</div>`;
  }

  return `
    <img
      class="artist-photo"
      src="${escapeHtml(url)}"
      alt="Artista"
      loading="lazy"
      onerror="this.parentElement.innerHTML='<div class=&quot;artist-fallback&quot;>Sem imagem</div>'"
    />
  `;
}

function buildSocial(insta, label) {
  if (!insta) return '';

  let user = String(insta).trim();

  if (user.startsWith('@')) {
    user = user.slice(1);
  }

  const url = user.includes('instagram.com')
    ? user
    : `https://instagram.com/${user}`;

  return `
    <div class="artist-social">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(label)}">
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

function formatInstagramLabel(insta) {
  if (!insta) return 'Instagram';

  let text = String(insta).trim();

  if (text.includes('instagram.com')) {
    text = text
      .replace('https://', '')
      .replace('http://', '')
      .replace('www.', '')
      .replace('instagram.com/', '')
      .split(/[/?#]/)[0];
  }

  if (!text.startsWith('@')) {
    text = '@' + text;
  }

  return text;
}

function openArtistModal(index) {
  const artista = artistsData[index];
  if (!artista) return;

  const modal = document.getElementById('artistModal');
  const modalImage = document.getElementById('artistModalImage');
  const modalName = document.getElementById('artistModalName');
  const modalBio = document.getElementById('artistModalBio');

  modalImage.innerHTML = artista.foto
    ? `<img class="artist-modal-img" src="${escapeHtml(artista.foto)}" alt="${escapeHtml(artista.nome)}">`
    : `<div class="artist-modal-img artist-fallback">Sem imagem</div>`;

  modalName.textContent = artista.nome || '';
  modalBio.textContent = artista.bio || '';

  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeArtistModal() {
  const modal = document.getElementById('artistModal');

  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function convertDriveUrl(url) {
  try {
    const match = url.match(/[-\w]{25,}/);
    if (match) {
      const fileId = match[0];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  } catch (e) {}

  return url;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  fetchArtists();

  document.addEventListener('click', (e) => {
    const readMore = e.target.closest('.artist-readmore');
    if (readMore) {
      openArtistModal(readMore.dataset.index);
      return;
    }

    if (
      e.target.id === 'artistModal' ||
      e.target.closest('.artist-modal-close')
    ) {
      closeArtistModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeArtistModal();
    }
  });
});
