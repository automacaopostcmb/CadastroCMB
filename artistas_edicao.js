const WEBAPP_URL = "COLE_AQUI_SUA_URL_DO_WEBAPP"; 
// mesma base que você usa, só adicionando ?action=listArtists

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

    const artistas = data.artists || [];

    loading.style.display = 'none';

    if (!artistas.length) {
      emptyBox.style.display = 'block';
      return;
    }

    grid.style.display = 'grid';
    renderArtists(artistas, grid);

  } catch (err) {
    console.error(err);
    loading.style.display = 'none';
    errorBox.style.display = 'block';
    errorBox.textContent = 'Erro ao carregar artistas.';
  }
}

function renderArtists(lista, container) {
  container.innerHTML = '';

  lista.forEach((artista) => {
    const card = document.createElement('div');
    card.className = 'artist-card';

    const photo = buildPhoto(artista.foto);
    const name = `<h3 class="artist-name">${escapeHtml(artista.nome)}</h3>`;
    const bio = `<p class="artist-bio">${escapeHtml(artista.bio || '')}</p>`;
    const social = buildSocial(artista.insta);

    card.innerHTML = `
      <div class="artist-photo-wrap">
        ${photo}
      </div>
      <div class="artist-content">
        ${name}
        ${bio}
        ${social}
      </div>
    `;

    container.appendChild(card);
  });
}

function buildPhoto(url) {
  if (!url) {
    return `<div class="artist-fallback">Sem imagem</div>`;
  }

  const finalUrl = convertDriveUrl(url);

  return `<img class="artist-photo" src="${finalUrl}" alt="Artista" loading="lazy" />`;
}

function buildSocial(insta) {
  if (!insta) return '';

  let username = insta.trim();

  // remove @ se tiver
  username = username.replace('@', '');

  const link = `https://instagram.com/${username}`;

  return `
    <div class="artist-social">
      <a href="${link}" target="_blank" rel="noopener">
        @${username}
      </a>
    </div>
  `;
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

document.addEventListener('DOMContentLoaded', fetchArtists);
