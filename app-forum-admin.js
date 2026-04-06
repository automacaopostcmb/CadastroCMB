const FORUM_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxbGyybng6XMTGwAIbDCrZPFLQkbKyoYwegRbDBog-1DmYaoswskb3tzsO4adRm0ZE/exec";

let forumAdminUser = {
  codigo: "",
  nome: ""
};

const PAGE_SIZE = 5;

const forumAdminState = {
  paraResponder: [],
  paraCompartilhar: [],
  publicas: [],
  paginaResponder: 1,
  paginaCompartilhar: 1,
  paginaPublicas: 1
};

function setOverlayText(text) {
  const el = document.querySelector('#overlay .loader-text');
  if (el) el.textContent = text || 'Carregando...';
}

function showOverlay(text) {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.classList.remove('auth');
  overlay.style.display = 'grid';
  setOverlayText(text || 'Carregando...');
}

function hideOverlay() {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.classList.remove('auth');
  overlay.style.display = 'none';
  setOverlayText('Carregando...');
}

function showAuthOverlay(message) {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  overlay.classList.add('auth');
  overlay.style.display = 'grid';
  setOverlayText(message || 'Acesso negado.');
}

function blockAndRedirect(message, url = 'index.html') {
  showAuthOverlay(message);
  setTimeout(() => {
    window.location.href = url;
  }, 1600);
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function nl2brSafe(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function formatarDataForum(value) {
  if (!value) return '';
  const d = new Date(value);

  if (isNaN(d.getTime())) return value;

  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();

  let horas = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, '0');

  const ampm = horas >= 12 ? 'pm' : 'am';
  horas = horas % 12;
  if (horas === 0) horas = 12;

  const horaStr = String(horas).padStart(2, '0');

return `${dia}/${mes}/${ano} - ${horaStr}:${minutos}${ampm}`;
}

function getMetaResposta(item) {
  if (item.quem_respondeu) {
    return `Respondido por ${item.quem_respondeu}${item.data_resposta ? ' em ' + formatarDataForum(item.data_resposta) : ''}`;
  }
  return item.data_resposta ? formatarDataForum(item.data_resposta) : '';
}

function getMetaTreplica(item) {
  if (item.quem_respondeu_treplica) {
    return `Respondido por ${item.quem_respondeu_treplica}${item.data_treplica ? ' em ' + formatarDataForum(item.data_treplica) : ''}`;
  }
  return item.data_treplica ? formatarDataForum(item.data_treplica) : '';
}

function montarBolha(label, classe, conteudo, extraMeta = '', tituloExtra = '') {
  if (!conteudo && !tituloExtra) return '';

  return `
    <div class="bubble ${classe}">
      <span class="bubble-label">${label}</span>
      ${tituloExtra ? `<div class="bubble-title-inline">${escapeHtml(tituloExtra)}</div>` : ''}
      <div class="bubble-text">${nl2brSafe(String(conteudo || '').trim())}</div>
      ${extraMeta ? `<div class="question-meta bubble-meta">${escapeHtml(extraMeta)}</div>` : ''}
    </div>
  `;
}

async function postJSON(payload) {
  const response = await fetch(FORUM_WEBAPP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('Resposta inválida do Apps Script: ' + raw);
  }
}

async function checkForumAdminAccess() {
  const codigo = (localStorage.getItem('chave') || '').trim();

  if (!codigo) {
    blockAndRedirect('Faça login primeiro.', 'index.html');
    return false;
  }

  showOverlay('Validando acesso...');

  try {
    const result = await postJSON({
      action: 'validarAcessoForumAdmin',
      codigo
    });

    if (result.status !== 'success' || !result.permitido) {
      blockAndRedirect(result.message || 'Você não tem permissão para acessar esta página.', 'index.html');
      return false;
    }

    forumAdminUser.codigo = result.codigo || codigo;
    forumAdminUser.nome = result.nome || '';

    return true;
  } catch (error) {
    console.error(error);
    blockAndRedirect('Falha ao validar seu acesso. Faça login novamente.', 'index.html');
    return false;
  } finally {
    hideOverlay();
  }
}

function getPageItems(items, page, pageSize = PAGE_SIZE) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function getTotalPages(items, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil((items?.length || 0) / pageSize));
}

function renderPaginacao({ totalItems, currentPage, type }) {
  if (totalItems <= PAGE_SIZE) return '';

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return `
    <div class="forum-pagination">
      <div class="forum-pagination-buttons">
        <button
          class="btn-nav btn-voltar"
          type="button"
          onclick="irPaginaAnterior('${type}')"
          ${currentPage <= 1 ? 'disabled' : ''}
        >
          Anteriores
        </button>

        <button
          class="btn-nav btn-proximo"
          type="button"
          onclick="irProximaPagina('${type}')"
          ${currentPage >= totalPages ? 'disabled' : ''}
        >
          Próximas
        </button>
      </div>

      <div class="forum-pagination-info">
        Página ${currentPage} de ${totalPages}
      </div>
    </div>
  `;
}

function toggleAccordionByType(type, index) {
  const item = document.querySelector(`.accordion-item[data-type="${type}"][data-acc="${index}"]`);
  if (!item) return;
  item.classList.toggle('open');
}

function renderResponder(items) {
  const container = document.getElementById('listaResponder');
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="empty-state">Nenhuma pergunta aguardando resposta.</div>`;
    return;
  }

  const totalPages = getTotalPages(items);
  if (forumAdminState.paginaResponder > totalPages) forumAdminState.paginaResponder = totalPages;
  if (forumAdminState.paginaResponder < 1) forumAdminState.paginaResponder = 1;

  const pageItems = getPageItems(items, forumAdminState.paginaResponder);

  const listaHtml = pageItems.map((item, index) => {
    const globalIndex = (forumAdminState.paginaResponder - 1) * PAGE_SIZE + index;
    const precisaTreplica = !!String(item.replica || '').trim() && !String(item.treplica || '').trim();

    return `
      <div class="accordion-item" data-type="responder" data-acc="${globalIndex}">
        <button class="accordion-btn" type="button" onclick="toggleAccordionByType('responder', ${globalIndex})">
          <span>
            <div class="question-title">${escapeHtml(item.titulo || 'Sem título')}</div>
            <div class="question-meta">${escapeHtml(item.nome || '')} • Código ${escapeHtml(item.codigo || '')}</div>
          </span>
          <span class="accordion-arrow">⌄</span>
        </button>

        <div class="accordion-content">
          ${montarBolha(
            'Pergunta',
            'bubble-pergunta',
            item.descricao,
            item.data_pergunta ? formatarDataForum(item.data_pergunta) : '',
            item.titulo || ''
          )}

          ${montarBolha(
            'Resposta anterior',
            'bubble-resposta',
            item.resposta,
            getMetaResposta(item)
          )}

          ${montarBolha(
            'Réplica',
            'bubble-replica',
            item.replica,
            item.data_replica ? formatarDataForum(item.data_replica) : ''
          )}

          <div class="forum-field">
            <label for="adminResposta_${escapeHtml(item.id)}">
              ${precisaTreplica ? 'Responder réplica' : 'Responder pergunta'}
            </label>
            <textarea
              id="adminResposta_${escapeHtml(item.id)}"
              maxlength="3000"
              placeholder="${precisaTreplica ? 'Escreva a resposta para a réplica' : 'Escreva a resposta para a pergunta'}"
            ></textarea>
          </div>

          <button class="btn-nav btn-proximo btn-full" type="button" onclick="responderPergunta('${escapeHtml(item.id)}')">
            ${precisaTreplica ? 'Enviar tréplica' : 'Enviar resposta'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = listaHtml + renderPaginacao({
    totalItems: items.length,
    currentPage: forumAdminState.paginaResponder,
    type: 'responder'
  });
}

function renderCompartilhar(items) {
  const container = document.getElementById('listaCompartilhar');
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="empty-state">Nenhuma pergunta pronta para compartilhamento.</div>`;
    return;
  }

  const totalPages = getTotalPages(items);
  if (forumAdminState.paginaCompartilhar > totalPages) forumAdminState.paginaCompartilhar = totalPages;
  if (forumAdminState.paginaCompartilhar < 1) forumAdminState.paginaCompartilhar = 1;

  const pageItems = getPageItems(items, forumAdminState.paginaCompartilhar);

  const listaHtml = pageItems.map((item, index) => {
    const globalIndex = (forumAdminState.paginaCompartilhar - 1) * PAGE_SIZE + index;
    const podeCompartilhar = String(item.status || '').trim().toLowerCase() === 'respondida';

    return `
      <div class="accordion-item" data-type="compartilhar" data-acc="${globalIndex}">
        <button class="accordion-btn" type="button" onclick="toggleAccordionByType('compartilhar', ${globalIndex})">
          <span>
            <div class="question-title">${escapeHtml(item.titulo || 'Sem título')}</div>
            <div class="question-meta">${escapeHtml(item.nome || '')} • Código ${escapeHtml(item.codigo || '')}</div>
          </span>
          <span class="accordion-arrow">⌄</span>
        </button>

        <div class="accordion-content">
          ${montarBolha(
            'Pergunta',
            'bubble-pergunta',
            item.descricao,
            item.data_pergunta ? formatarDataForum(item.data_pergunta) : '',
            item.titulo || ''
          )}

         ${montarBolha(
  'Resposta',
  'bubble-resposta',
  item.resposta,
  getMetaResposta(item)
)}

${item.replica ? montarBolha(
  'Réplica',
  'bubble-replica',
  item.replica,
  item.data_replica ? formatarDataForum(item.data_replica) : ''
) : ''}

${item.treplica ? montarBolha(
  'Tréplica',
  'bubble-treplica',
  item.treplica,
  getMetaTreplica(item)
) : ''}

          <div style="margin-top:12px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span class="status-badge ${podeCompartilhar ? 'status-respondida' : 'status-bloqueado'}">
              ${podeCompartilhar ? 'artista confirmou' : 'aguardando confirmação do artista'}
            </span>
          </div>

          <div style="margin-top:12px;">
            <button
              class="btn-nav btn-proximo btn-full"
              type="button"
              onclick="compartilharPergunta('${escapeHtml(item.id)}')"
              ${podeCompartilhar ? '' : 'disabled'}
            >
              Compartilhar pergunta
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = listaHtml + renderPaginacao({
    totalItems: items.length,
    currentPage: forumAdminState.paginaCompartilhar,
    type: 'compartilhar'
  });
}

function renderPublicas(items) {
  const container = document.getElementById('listaPublicas');
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="empty-state">Ainda não existem perguntas públicas respondidas.</div>`;
    return;
  }

  const totalPages = getTotalPages(items);
  if (forumAdminState.paginaPublicas > totalPages) forumAdminState.paginaPublicas = totalPages;
  if (forumAdminState.paginaPublicas < 1) forumAdminState.paginaPublicas = 1;

  const pageItems = getPageItems(items, forumAdminState.paginaPublicas);

  const listaHtml = pageItems.map((item, index) => {
    const globalIndex = (forumAdminState.paginaPublicas - 1) * PAGE_SIZE + index;

    return `
      <div class="accordion-item" data-type="publicas" data-acc="${globalIndex}">
        <button class="accordion-btn" type="button" onclick="toggleAccordionByType('publicas', ${globalIndex})">
          <span>
            <div class="question-title">${escapeHtml(item.titulo || 'Sem título')}</div>
            <div class="question-meta">${escapeHtml(item.nome || 'Anônimo')} • Código ${escapeHtml(item.codigo || '')}</div>
          </span>
          <span class="accordion-arrow">⌄</span>
        </button>

        <div class="accordion-content">
          ${montarBolha(
            'Pergunta',
            'bubble-pergunta',
            item.descricao,
            item.data_pergunta ? formatarDataForum(item.data_pergunta) : '',
            item.titulo || ''
          )}

          ${montarBolha(
  'Resposta',
  'bubble-resposta',
  item.resposta,
  getMetaResposta(item)
)}

${item.replica ? montarBolha(
  'Réplica',
  'bubble-replica',
  item.replica,
  item.data_replica ? formatarDataForum(item.data_replica) : ''
) : ''}

${item.treplica ? montarBolha(
  'Tréplica',
  'bubble-treplica',
  item.treplica,
  getMetaTreplica(item)
) : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = listaHtml + renderPaginacao({
    totalItems: items.length,
    currentPage: forumAdminState.paginaPublicas,
    type: 'publicas'
  });
}

function perguntaEstaPendenteDeVerdade(item) {
  const status = String(item.status || '').trim().toLowerCase();
  const temResposta = !!String(item.resposta || '').trim();
  const temReplica = !!String(item.replica || '').trim();
  const temTreplica = !!String(item.treplica || '').trim();

  if (temReplica && !temTreplica) return true;
  if (!temResposta) return true;
  if (status === 'pendente') return true;
  if (status === 'aguardando_confirmacao') return false;

  return false;
}

function perguntaVaiParaCompartilhar(item) {
  const status = String(item.status || '').trim().toLowerCase();
  const temResposta = !!String(item.resposta || '').trim();
  const temReplica = !!String(item.replica || '').trim();
  const temTreplica = !!String(item.treplica || '').trim();
  const publica = String(item.publica || '').trim().toUpperCase();

  if (publica === 'SIM') return false;
  if (status === 'aguardando_confirmacao') return true;
  if (status === 'respondida' && temResposta && !temReplica) return true;
  if (status === 'respondida' && temReplica && temTreplica) return true;

  return false;
}

async function carregarPerguntasAdmin() {
  const responderEl = document.getElementById('listaResponder');
  const compartilharEl = document.getElementById('listaCompartilhar');
  const publicasEl = document.getElementById('listaPublicas');

  if (responderEl) {
    responderEl.innerHTML = `<div class="loading-box loading-publico">Carregando perguntas para responder...</div>`;
  }

  if (compartilharEl) {
    compartilharEl.innerHTML = `<div class="loading-box loading-publico">Carregando perguntas para compartilhar...</div>`;
  }

  if (publicasEl) {
    publicasEl.innerHTML = `<div class="loading-box loading-publico">Carregando perguntas públicas...</div>`;
  }

  try {
    const result = await postJSON({
      action: 'listarPerguntasAdmin',
      codigo: forumAdminUser.codigo
    });

    if (result.status !== 'success') {
      throw new Error(result.message || 'Erro ao carregar perguntas do admin.');
    }

    const todas = Array.isArray(result.perguntas) ? result.perguntas : [];

    forumAdminState.paraResponder = todas.filter(perguntaEstaPendenteDeVerdade);
    forumAdminState.paraCompartilhar = todas.filter(perguntaVaiParaCompartilhar);
    forumAdminState.publicas = todas.filter(item => String(item.publica || '').trim().toUpperCase() === 'SIM');

    forumAdminState.paginaResponder = 1;
    forumAdminState.paginaCompartilhar = 1;
    forumAdminState.paginaPublicas = 1;

    renderResponder(forumAdminState.paraResponder);
    renderCompartilhar(forumAdminState.paraCompartilhar);
    renderPublicas(forumAdminState.publicas);
  } catch (error) {
    console.error(error);

    if (responderEl) {
      responderEl.innerHTML = `<div class="empty-state">Não foi possível carregar as perguntas para responder.</div>`;
    }

    if (compartilharEl) {
      compartilharEl.innerHTML = `<div class="empty-state">Não foi possível carregar as perguntas para compartilhar.</div>`;
    }

    if (publicasEl) {
      publicasEl.innerHTML = `<div class="empty-state">Não foi possível carregar as perguntas públicas.</div>`;
    }
  }
}

async function responderPergunta(id) {
  const textarea = document.getElementById(`adminResposta_${id}`);
  const resposta = (textarea?.value || '').trim();

  if (!resposta) {
    alert('Escreva uma resposta antes de enviar.');
    return;
  }

  const item =
    forumAdminState.paraResponder.find(p => String(p.id) === String(id)) ||
    forumAdminState.paraCompartilhar.find(p => String(p.id) === String(id)) ||
    forumAdminState.publicas.find(p => String(p.id) === String(id));

  const temReplica = !!String(item?.replica || '').trim();
  const temTreplica = !!String(item?.treplica || '').trim();
  const action = temReplica && !temTreplica ? 'salvarTreplicaAdmin' : 'salvarRespostaAdmin';

  showOverlay(temReplica && !temTreplica ? 'Enviando tréplica...' : 'Enviando resposta...');

  try {
    const result = await postJSON({
      action,
      id,
      codigo: forumAdminUser.codigo,
      nomeAdmin: forumAdminUser.nome,
      resposta
    });

    if (result.status !== 'success') {
      throw new Error(result.message || 'Erro ao salvar a resposta.');
    }

    await carregarPerguntasAdmin();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao salvar a resposta.');
  } finally {
    hideOverlay();
  }
}

async function compartilharPergunta(id) {
  showOverlay('Compartilhando pergunta...');

  try {
    const result = await postJSON({
      action: 'compartilharPerguntaAdmin',
      id,
      codigo: forumAdminUser.codigo
    });

    if (result.status !== 'success') {
      throw new Error(result.message || 'Erro ao compartilhar a pergunta.');
    }

    await carregarPerguntasAdmin();
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao compartilhar a pergunta.');
  } finally {
    hideOverlay();
  }
}

function irProximaPagina(type) {
  if (type === 'responder') {
    const totalPages = getTotalPages(forumAdminState.paraResponder);
    if (forumAdminState.paginaResponder < totalPages) {
      forumAdminState.paginaResponder++;
      renderResponder(forumAdminState.paraResponder);
    }
    return;
  }

  if (type === 'compartilhar') {
    const totalPages = getTotalPages(forumAdminState.paraCompartilhar);
    if (forumAdminState.paginaCompartilhar < totalPages) {
      forumAdminState.paginaCompartilhar++;
      renderCompartilhar(forumAdminState.paraCompartilhar);
    }
    return;
  }

  if (type === 'publicas') {
    const totalPages = getTotalPages(forumAdminState.publicas);
    if (forumAdminState.paginaPublicas < totalPages) {
      forumAdminState.paginaPublicas++;
      renderPublicas(forumAdminState.publicas);
    }
  }
}

function irPaginaAnterior(type) {
  if (type === 'responder') {
    if (forumAdminState.paginaResponder > 1) {
      forumAdminState.paginaResponder--;
      renderResponder(forumAdminState.paraResponder);
    }
    return;
  }

  if (type === 'compartilhar') {
    if (forumAdminState.paginaCompartilhar > 1) {
      forumAdminState.paginaCompartilhar--;
      renderCompartilhar(forumAdminState.paraCompartilhar);
    }
    return;
  }

  if (type === 'publicas') {
    if (forumAdminState.paginaPublicas > 1) {
      forumAdminState.paginaPublicas--;
      renderPublicas(forumAdminState.publicas);
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await checkForumAdminAccess();
  if (!ok) return;

  await carregarPerguntasAdmin();
});

window.toggleAccordionByType = toggleAccordionByType;
window.responderPergunta = responderPergunta;
window.compartilharPergunta = compartilharPergunta;
window.irProximaPagina = irProximaPagina;
window.irPaginaAnterior = irPaginaAnterior;

    
