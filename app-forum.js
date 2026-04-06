const FORUM_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw1A1guXNDwoNoD_3fvy3b-8l4ZDLC9gXS_Yl_lXEwDeMfThITYRzP3l77Li6t_8LifJg/exec";

let forumUser = {
  codigo: "",
  nome: ""
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

function formatDateBr(value) {
  if (!value) return '';
  return String(value);
}

function statusClass(status) {
  const s = String(status || '').trim().toLowerCase();
  return s === 'respondida' ? 'status-respondida' : 'status-pendente';
}

function updateSendButtonState() {
  const titulo = (document.getElementById('tituloPergunta')?.value || '').trim();
  const descricao = (document.getElementById('descricaoPergunta')?.value || '').trim();
  const check = !!document.getElementById('checkPublica')?.checked;
  const btn = document.getElementById('btnEnviarPergunta');

  if (btn) {
    btn.disabled = !(titulo && descricao && check);
  }
}

function showMessage(elementId, type, text) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.className = `inline-msg ${type || ''}`;
  el.textContent = text || '';
  el.style.display = text ? 'block' : 'none';
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

async function checkForumAccess() {
  const codigo = (localStorage.getItem('chave') || '').trim();

  if (!codigo) {
    blockAndRedirect('Faça login primeiro.', 'index.html');
    return false;
  }

  showOverlay('Validando acesso...');

  try {
    const result = await postJSON({
      action: 'validarAcessoForum',
      codigo
    });

    if (result.status !== 'success' || !result.permitido) {
      blockAndRedirect(result.message || 'Você não tem permissão para acessar esta página.', 'index.html');
      return false;
    }

    forumUser.codigo = result.codigo || codigo;
    forumUser.nome = result.nome || '';

    return true;
  } catch (error) {
    console.error(error);
    blockAndRedirect('Falha ao validar seu acesso. Faça login novamente.', 'index.html');
    return false;
  } finally {
    hideOverlay();
  }
}

async function enviarPergunta() {
  const titulo = (document.getElementById('tituloPergunta')?.value || '').trim();
  const descricao = (document.getElementById('descricaoPergunta')?.value || '').trim();
  const autorizoPublica = !!document.getElementById('checkPublica')?.checked;

  if (!titulo || !descricao || !autorizoPublica) {
    showMessage('msgPergunta', 'error', 'Preencha título, descrição e marque a autorização.');
    return;
  }

  showMessage('msgPergunta', '', '');
  showOverlay('Enviando sua pergunta...');

  try {
    const result = await postJSON({
      action: 'inserirPergunta',
      codigo: forumUser.codigo,
      titulo,
      descricao,
      autorizoPublica
    });

    if (result.status !== 'success') {
      throw new Error(result.message || 'Erro ao enviar a pergunta.');
    }

    document.getElementById('tituloPergunta').value = '';
    document.getElementById('descricaoPergunta').value = '';
    document.getElementById('checkPublica').checked = false;

    updateSendButtonState();
    showMessage('msgPergunta', 'success', 'Pergunta enviada com sucesso.');

    await Promise.all([
      carregarPerguntasUsuario(),
      carregarPerguntasPublicas()
    ]);
  } catch (error) {
    console.error(error);
    showMessage('msgPergunta', 'error', error.message || 'Erro ao enviar a pergunta.');
  } finally {
    hideOverlay();
  }
}

function montarBolha(label, classe, conteudo, extraMeta = '') {
  if (!conteudo) return '';
  return `
    <div class="bubble ${classe}">
      <span class="bubble-label">${label}</span>
      ${extraMeta ? `<div class="question-meta">${escapeHtml(extraMeta)}</div>` : ''}
      ${nl2brSafe(conteudo)}
    </div>
  `;
}

function renderMinhasPerguntas(items) {
  const container = document.getElementById('listaMinhasPerguntas');
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="empty-state">Você ainda não enviou nenhuma pergunta.</div>`;
    return;
  }

  container.innerHTML = items.map((item) => {
    const hasResposta = !!String(item.resposta || '').trim();
    const hasReplica = !!String(item.replica || '').trim();
    const podeReplicar = hasResposta && !hasReplica;

    const visibilityText = String(item.visibilidade || '').toUpperCase() === 'SIM'
      ? 'Autorizada para possível publicação pública'
      : 'Não autorizada para publicação pública';

    return `
      <div class="question-card">
        <div class="question-top">
          <h3 class="question-title">${escapeHtml(item.titulo || 'Sem título')}</h3>
          <span class="status-badge ${statusClass(item.status)}">${escapeHtml(item.status || 'pendente')}</span>
        </div>

        <div class="question-meta">
          Enviada em: ${escapeHtml(formatDateBr(item.data_pergunta || ''))}
        </div>

        ${montarBolha('Pergunta', 'bubble-pergunta', item.descricao)}
        ${montarBolha('Resposta', 'bubble-resposta', item.resposta, item.quem_respondeu ? `Respondido por ${item.quem_respondeu}${item.data_resposta ? ' em ' + item.data_resposta : ''}` : (item.data_resposta ? `Respondido em ${item.data_resposta}` : ''))}
        ${montarBolha('Réplica', 'bubble-replica', item.replica, item.data_replica ? `Enviada em ${item.data_replica}` : '')}
        ${montarBolha('Tréplica', 'bubble-treplica', item.treplica, item.quem_respondeu_treplica ? `Respondido por ${item.quem_respondeu_treplica}${item.data_treplica ? ' em ' + item.data_treplica : ''}` : (item.data_treplica ? `Respondido em ${item.data_treplica}` : ''))}

        <div class="forum-visibility">${escapeHtml(visibilityText)}</div>

        ${podeReplicar ? `
          <div class="replica-box">
            <textarea id="replica_${escapeHtml(item.id)}" maxlength="3000" placeholder="Escreva sua réplica"></textarea>
            <button class="btn-nav btn-proximo btn-full" onclick="salvarReplica('${escapeHtml(item.id)}')">Enviar réplica</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderPerguntasPublicas(items) {
  const container = document.getElementById('listaPublicas');
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="empty-state">Ainda não existem perguntas públicas respondidas.</div>`;
    return;
  }

  container.innerHTML = items.map((item, index) => `
    <div class="accordion-item" data-acc="${index}">
      <button class="accordion-btn" type="button" onclick="toggleAccordion(${index})">
        <span>${escapeHtml(item.titulo || 'Sem título')}</span>
        <span class="accordion-arrow">⌄</span>
      </button>
      <div class="accordion-content">
        ${montarBolha('Pergunta', 'bubble-pergunta', item.descricao)}
        ${montarBolha('Resposta', 'bubble-resposta', item.resposta, item.quem_respondeu ? `Respondido por ${item.quem_respondeu}${item.data_resposta ? ' em ' + item.data_resposta : ''}` : (item.data_resposta ? `Respondido em ${item.data_resposta}` : ''))}
        ${montarBolha('Réplica', 'bubble-replica', item.replica, item.data_replica ? `Enviada em ${item.data_replica}` : '')}
        ${montarBolha('Tréplica', 'bubble-treplica', item.treplica, item.quem_respondeu_treplica ? `Respondido por ${item.quem_respondeu_treplica}${item.data_treplica ? ' em ' + item.data_treplica : ''}` : (item.data_treplica ? `Respondido em ${item.data_treplica}` : ''))}
      </div>
    </div>
  `).join('');
}

async function carregarPerguntasUsuario() {
  const container = document.getElementById('listaMinhasPerguntas');
  if (container) {
    container.innerHTML = `<div class="loading-box">Carregando suas perguntas...</div>`;
  }

  try {
    const result = await postJSON({
      action: 'listarPerguntasUsuario',
      codigo: forumUser.codigo
    });

    if (result.status !== 'success') {
      throw new Error(result.message || 'Erro ao carregar suas perguntas.');
    }

    renderMinhasPerguntas(result.perguntas || []);
  } catch (error) {
    console.error(error);
    if (container) {
      container.innerHTML = `<div class="empty-state">Não foi possível carregar suas perguntas.</div>`;
    }
  }
}

async function carregarPerguntasPublicas() {
  const container = document.getElementById('listaPublicas');
  if (container) {
    container.innerHTML = `<div class="loading-box">Carregando perguntas públicas...</div>`;
  }

  try {
    const result = await postJSON({
      action: 'listarPerguntasPublicas'
    });

    if (result.status !== 'success') {
      throw new Error(result.message || 'Erro ao carregar perguntas públicas.');
    }

    renderPerguntasPublicas(result.perguntas || []);
  } catch (error) {
    console.error(error);
    if (container) {
      container.innerHTML = `<div class="empty-state">Não foi possível carregar as perguntas públicas.</div>`;
    }
  }
}

async function salvarReplica(id) {
  const textarea = document.getElementById(`replica_${id}`);
  const replica = (textarea?.value || '').trim();

  if (!replica) {
    alert('Escreva sua réplica antes de enviar.');
    return;
  }

  showOverlay('Enviando réplica...');

  try {
    const result = await postJSON({
      action: 'salvarReplica',
      codigo: forumUser.codigo,
      id,
      replica
    });

    if (result.status !== 'success') {
      throw new Error(result.message || 'Erro ao salvar a réplica.');
    }

    await Promise.all([
      carregarPerguntasUsuario(),
      carregarPerguntasPublicas()
    ]);
  } catch (error) {
    console.error(error);
    alert(error.message || 'Erro ao salvar a réplica.');
  } finally {
    hideOverlay();
  }
}

function toggleAccordion(index) {
  const item = document.querySelector(`.accordion-item[data-acc="${index}"]`);
  if (!item) return;
  item.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await checkForumAccess();
  if (!ok) return;

  document.getElementById('tituloPergunta')?.addEventListener('input', updateSendButtonState);
  document.getElementById('descricaoPergunta')?.addEventListener('input', updateSendButtonState);
  document.getElementById('checkPublica')?.addEventListener('change', updateSendButtonState);
  document.getElementById('btnEnviarPergunta')?.addEventListener('click', enviarPergunta);

  updateSendButtonState();

  await Promise.all([
    carregarPerguntasUsuario(),
    carregarPerguntasPublicas()
  ]);
});

window.salvarReplica = salvarReplica;
window.toggleAccordion = toggleAccordion;
