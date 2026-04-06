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

  if (s === 'respondida') return 'status-respondida';
  if (s === 'aguardando_confirmacao') return 'status-respondida';

  return 'status-pendente';
}

function getStatusEfetivo(item) {
  return String(item.status || 'pendente').trim().toLowerCase();
}

function getMetaResposta(item) {
  if (item.quem_respondeu) {
    return `Respondido por ${item.quem_respondeu}${item.data_resposta ? ' em ' + item.data_resposta : ''}`;
  }
  return item.data_resposta ? `Respondido em ${item.data_resposta}` : '';
}

function getMetaTreplica(item) {
  if (item.quem_respondeu_treplica) {
    return `Respondido por ${item.quem_respondeu_treplica}${item.data_treplica ? ' em ' + item.data_treplica : ''}`;
  }
  return item.data_treplica ? `Respondido em ${item.data_treplica}` : '';
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

function abrirComplementoPergunta(id) {
  const questionBox = document.getElementById(`confirmacaoBox_${id}`);
  const replicaBox = document.getElementById(`replicaBox_${id}`);

  if (questionBox) questionBox.style.display = 'none';
  if (replicaBox) replicaBox.style.display = 'block';
}

async function confirmarResposta(id, confirmado) {
  if (confirmado) {
    showOverlay('Confirmando resposta...');

    try {
      const result = await postJSON({
        action: 'confirmarRespostaUsuario',
        codigo: forumUser.codigo,
        id,
        confirmado: true
      });

      if (result.status !== 'success') {
        throw new Error(result.message || 'Erro ao confirmar resposta.');
      }

      await Promise.all([
        carregarPerguntasUsuario(),
        carregarPerguntasPublicas()
      ]);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao confirmar resposta.');
    } finally {
      hideOverlay();
    }

    return;
  }

  abrirComplementoPergunta(id);
}

function renderMinhasPerguntas(items) {
  const container = document.getElementById('listaMinhasPerguntas');
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = `<div class="empty-state">Você ainda não enviou nenhuma pergunta.</div>`;
    return;
  }

  container.innerHTML = items.map((item, index) => {
    const hasResposta = !!String(item.resposta || '').trim();
    const hasReplica = !!String(item.replica || '').trim();
    const hasTreplica = !!String(item.treplica || '').trim();
    const status = getStatusEfetivo(item);

    const mostrarConfirmacao =
      hasResposta &&
      !hasReplica &&
      !hasTreplica &&
      (status === 'aguardando_confirmacao' || status === 'pendente');

    const visibilityText = String(item.visibilidade || '').toUpperCase() === 'SIM'
      ? 'Autorizada para possível publicação pública'
      : 'Não autorizada para publicação pública';

    const labelStatus = mostrarConfirmacao
      ? 'respondida'
      : (status === 'aguardando_confirmacao' ? 'respondida' : status);

    const classeStatus = mostrarConfirmacao
      ? 'status-respondida'
      : statusClass(status);

return `
  <div class="accordion-item minha-pergunta-item ${classeStatus}" data-minha-acc="${index}">
    <button class="accordion-btn minha-pergunta-btn" type="button" onclick="toggleMinhaPergunta(${index})">
          <span class="minha-pergunta-head">
            <span class="question-title">${escapeHtml(item.titulo || 'Sem título')}</span>
            <span class="status-badge ${classeStatus}">${escapeHtml(labelStatus)}</span>
          </span>
          <span class="accordion-arrow">⌄</span>
        </button>

        <div class="accordion-content minha-pergunta-content">
          <div class="question-meta">
            Enviada em: ${escapeHtml(formatDateBr(item.data_pergunta || ''))}
          </div>

${montarBolha(
  'Pergunta',
  'bubble-pergunta',
  item.descricao,
  item.data_pergunta ? `Enviada em ${item.data_pergunta}` : '',
  item.titulo || ''
)}

          ${montarBolha(
            'Resposta',
            'bubble-resposta',
            item.resposta,
            getMetaResposta(item)
          )}

          ${montarBolha(
            'Réplica',
            'bubble-replica',
            item.replica,
            item.data_replica ? `Enviada em ${item.data_replica}` : ''
          )}

          ${montarBolha(
            'Tréplica',
            'bubble-treplica',
            item.treplica,
            getMetaTreplica(item)
          )}

          <div class="forum-visibility">${escapeHtml(visibilityText)}</div>

          ${mostrarConfirmacao ? `
            <div class="replica-box">
              <div id="confirmacaoBox_${escapeHtml(item.id)}">
                <div style="font-weight:700; margin-bottom:10px;">Sua dúvida foi respondida?</div>

                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
                  <button class="btn-nav btn-proximo" type="button" onclick="confirmarResposta('${escapeHtml(item.id)}', true)">Sim</button>
                  <button class="btn-nav btn-voltar" type="button" onclick="confirmarResposta('${escapeHtml(item.id)}', false)">Não</button>
                </div>
              </div>

              <div id="replicaBox_${escapeHtml(item.id)}" style="display:none; margin-top:10px;">
                <div style="font-weight:700; margin-bottom:10px;">Complemente a sua pergunta</div>
                <textarea id="replica_${escapeHtml(item.id)}" maxlength="3000" placeholder="Explique por que sua dúvida ainda não foi respondida"></textarea>
                <button class="btn-nav btn-proximo btn-full" onclick="salvarReplica('${escapeHtml(item.id)}')">Enviar réplica</button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}
function toggleMinhaPergunta(index) {
  const item = document.querySelector(`.minha-pergunta-item[data-minha-acc="${index}"]`);
  if (!item) return;
  item.classList.toggle('open');
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
      <button class="accordion-btn forum-publico-btn" type="button" onclick="toggleAccordion(${index})">
        <span class="forum-publico-head">
          <span class="forum-publico-titulo">${escapeHtml(item.titulo || 'Sem título')}</span>
          <span class="forum-publico-autor"> - ${escapeHtml(item.nome || 'Anônimo')}</span>
        </span>
        <span class="accordion-arrow">⌄</span>
      </button>
      <div class="accordion-content">
${montarBolha(
  'Pergunta',
  'bubble-pergunta',
  item.descricao,
  item.data_pergunta ? `Enviada em ${item.data_pergunta}` : '',
  item.titulo || ''
)}

        ${montarBolha(
          'Resposta',
          'bubble-resposta',
          item.resposta,
          getMetaResposta(item)
        )}

        ${montarBolha(
          'Réplica',
          'bubble-replica',
          item.replica,
          item.data_replica ? `Enviada em ${item.data_replica}` : ''
        )}

        ${montarBolha(
          'Tréplica',
          'bubble-treplica',
          item.treplica,
          getMetaTreplica(item)
        )}
      </div>
    </div>
  `).join('');
}

async function carregarPerguntasUsuario() {
  const container = document.getElementById('listaMinhasPerguntas');
  if (container) {
    container.innerHTML = `
  <div class="loading-box loading-publico">
    <span>Carregando suas perguntas...</span>
  </div>
`;
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
    container.innerHTML = `
  <div class="loading-box loading-publico">
    <span>Carregando perguntas públicas...</span>
  </div>
`;
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
window.confirmarResposta = confirmarResposta;
window.abrirComplementoPergunta = abrirComplementoPergunta;
window.toggleMinhaPergunta = toggleMinhaPergunta;
