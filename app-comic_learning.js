/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */
const FRAME_URL =
  'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/Framee_learning.png';

const TARJAS = {
  professor: { src: 'assets/learning_professor.png', x: 28, y: 57, scale: 0.2 },
  professora: { src: 'assets/learning_professora.png', x: 28, y: 57, scale: 0.2 },
  outro: null
};

const CHAR_LIMITS = {
  tituloDivulgacao: { min: 3, max: 60 }
};

const PHONE_ALLOWED_LENGTHS = [10, 11];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const REVIEW_FIELDS = [
  { id: 'nome', label: 'Nome completo' },
  { id: 'nome_div', label: 'Nome para divulgação' },
  { id: 'rotulo', label: 'Rótulo' },
  { id: 'email', label: 'E-mail' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'empresa', label: 'Empresa' },
  { id: 'site', label: 'Site/Portfólio', format: (v) => normalizeUrlMaybe(v) },
  { id: 'insta', label: 'Instagram', format: (v) => normalizeInstagram(v).url },
  { id: 'quantidade_aulas', label: 'Quantidade de aulas' },
  { id: 'aula1_nome', label: 'Aula 1 - Nome' },
  { id: 'aula1_dia', label: 'Aula 1 - Dia' },
  { id: 'aula1_periodo', label: 'Aula 1 - Período' },
  { id: 'aula1_descricao', label: 'Aula 1 - Descrição' },
  { id: 'aula2_nome', label: 'Aula 2 - Nome' },
  { id: 'aula2_dia', label: 'Aula 2 - Dia' },
  { id: 'aula2_periodo', label: 'Aula 2 - Período' },
  { id: 'aula2_descricao', label: 'Aula 2 - Descrição' },
  { id: 'observacoes_agenda', label: 'Observações de agenda' },
  { id: 'texto_complementar', label: 'Texto complementar' }
];

/* ===========================
   OVERLAY: mensagens rotativas
   =========================== */
const OVERLAY_STEPS = [
  { after: 0,      msg: "Separando informações..." },
  { after: 6000,   msg: "Enviando informações..." },
  { after: 12000,  msg: "Salvando imagens..." },
  { after: 25000,  msg: "Cadastrando professor..." },
  { after: 40000,  msg: "Quase lá!" },
  { after: 50000,  msg: "Finalizando..." },
  { after: 80000,  msg: "Está demorando mais do que o normal." },
  { after: 100000, msg: "Só mais um pouco..." },
  { after: 155000, msg: "Demorou mais do que o normal. Tente trocar de rede e reenviar." },
];

let overlayTimers = [];

function setOverlayText(text) {
  const el = document.querySelector('#overlay .loader-text');
  if (el) el.textContent = text || "Enviando...";
}

function startOverlayMessages(steps = OVERLAY_STEPS) {
  stopOverlayMessages();
  setOverlayText(steps?.[0]?.msg || "Enviando...");

  overlayTimers = (steps || []).map((s) =>
    setTimeout(() => setOverlayText(s.msg), Math.max(0, Number(s.after) || 0))
  );
}

function stopOverlayMessages() {
  overlayTimers.forEach((t) => clearTimeout(t));
  overlayTimers = [];
  setOverlayText("Enviando...");
}

/* ===========================
   ESTADO
   =========================== */
const step5Messages = { errors: [] };
const validationFlags = {
  overflowTitulo: false,
  overflowDescricao: false
};

const accordionFlags = {
  rostoAjustado: false,
  apoioAjustado: false,
  textoAjustado: false
};

function showAuthOverlay(message) {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;

  overlay.classList.remove('active');
  overlay.classList.add('auth');
  overlay.style.display = 'grid';

  const el = document.querySelector('#overlay .loader-text');
  if (el) el.textContent = message || 'Faça login primeiro.';
}

function hideAuthOverlay() {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;

  overlay.classList.remove('auth');
  overlay.style.display = 'none';

  const el = document.querySelector('#overlay .loader-text');
  if (el) el.textContent = 'Enviando...';
}

function blockAndRedirect(message, url = 'index.html', delay = 1500) {
  showAuthOverlay(message);
  setTimeout(() => { window.location.href = url; }, delay);
}

/* ===========================
   HELPERS
   =========================== */
function showFieldError(inputId, msg) {
  const box = document.getElementById(inputId + 'Error');
  const input = document.getElementById(inputId);
  if (box) {
    box.textContent = msg || '';
    box.style.display = msg ? 'block' : 'none';
  }
  if (input) input.classList.toggle('invalid', !!msg);
}

function formatPhone(digits) {
  if (digits.length <= 2) return '(' + digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function normalizeUrlMaybe(url) {
  let u = (url || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

function normalizeInstagram(raw) {
  let v = (raw || '').trim();
  if (!v) return { url: '', handle: '' };
  v = v.replace(/\s+/g, '');

  if (/^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\//i.test(v)) {
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
      const u = new URL(v);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'instagram.com' || host === 'instagr.am') {
        const seg = u.pathname.split('/').filter(Boolean)[0] || '';
        const handle = seg.replace(/^@+/, '').toLowerCase();
        if (/^[a-z0-9._]{1,30}$/.test(handle)) {
          return { url: `https://www.instagram.com/${handle}`, handle };
        }
      }
    } catch {}
    return { url: '', handle: '' };
  }

  const handle = v.replace(/^@+/, '').toLowerCase();
  if (/^[a-z0-9._]{1,30}$/.test(handle)) {
    return { url: `https://www.instagram.com/${handle}`, handle };
  }
  return { url: '', handle: '' };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function loadImage(src) {
  const bust = (/\?/.test(src) ? '&' : '?') + 'v=' + Date.now();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src + bust;
  });
}

function getTipoTarjaSelecionada() {
  return document.querySelector('input[name="tipoTarja"]:checked')?.value || 'professor';
}

function updateStep5Warning() {
  const aviso = document.getElementById('avisoTexto');
  if (!aviso) return;

  if (!step5Messages.errors.length) {
    aviso.innerHTML = '';
    aviso.style.display = 'none';
    return;
  }

  aviso.innerHTML = step5Messages.errors
    .map(msg => `<div>• ${msg}</div>`)
    .join('');

  aviso.style.display = 'block';
}

function markAccordionAsOpened(type) {
  if (type === 'rosto') accordionFlags.rostoAjustado = true;
  if (type === 'apoio') accordionFlags.apoioAjustado = true;
  if (type === 'texto') accordionFlags.textoAjustado = true;

  updateAccordionErrorState();
  revalidateStepNav();
}

function updateAccordionErrorState() {
  const accordionRosto = document.getElementById('accRosto');
  const accordionApoio = document.getElementById('accApoio');
  const accordionTexto = document.getElementById('accTextos');

  if (accordionRosto) {
    accordionRosto.classList.toggle('erro', !accordionFlags.rostoAjustado);
    accordionRosto.classList.toggle('opened-once', accordionFlags.rostoAjustado);
  }

  if (accordionApoio) {
    accordionApoio.classList.toggle('erro', !accordionFlags.apoioAjustado);
    accordionApoio.classList.toggle('opened-once', accordionFlags.apoioAjustado);
  }

  if (accordionTexto) {
    accordionTexto.classList.toggle('erro', !accordionFlags.textoAjustado);
    accordionTexto.classList.toggle('opened-once', accordionFlags.textoAjustado);
  }
}

function syncStep5TextFields() {
  const nomeDiv = document.getElementById('nome_div');
  const rotulo = document.getElementById('rotulo');
  const aula1Desc = document.getElementById('aula1_descricao');

  const tituloEl = document.getElementById('tituloDivulgacao');
  const subtituloEl = document.getElementById('subtituloDivulgacao');
  const descricaoEl = document.getElementById('descricaoDivulgacao');

  if (tituloEl && !tituloEl.value.trim()) tituloEl.value = nomeDiv?.value || '';
  if (subtituloEl && !subtituloEl.value.trim()) subtituloEl.value = rotulo?.value || '';
  if (descricaoEl && !descricaoEl.value.trim()) descricaoEl.value = aula1Desc?.value || '';
}

function buildCaptionFromForm() {
  const nomeDiv = (document.getElementById('nome_div')?.value || '').trim();
  const rotulo = (document.getElementById('rotulo')?.value || '').trim();
  const aula1 = (document.getElementById('aula1_nome')?.value || '').trim();
  const aula2 = (document.getElementById('aula2_nome')?.value || '').trim();
  const qtd = (document.getElementById('quantidade_aulas')?.value || '').trim();

  const { handle } = normalizeInstagram(document.getElementById('insta')?.value || '');
  const instaHandle = handle ? '@' + handle : '';

  const textoComp = (document.getElementById('texto_complementar')?.value || '').trim();
  const textoCurto = (document.getElementById('descricaoDivulgacao')?.value || '').trim();
  const descricao = textoComp || textoCurto || '';

  const aulas = [];
  if (aula1) aulas.push(aula1);
  if (qtd === '2' && aula2) aulas.push(aula2);

  const head = `${nomeDiv || 'Professor(a) confirmado(a)'} ${instaHandle || ''} no Comic Learning @comicmarketbrasil`;
  const role = rotulo ? rotulo : '';
  const aulasTexto = aulas.length ? `Aulas: ${aulas.join(' | ')}` : '';
  const tags =
    '#ComicLearning #ComicMarketBrasil #QuadrinhosNacionais #QuadrinhosBrasileiros #hqbr #mangabr #historiaemquadrinhos #fapcom';

  return [head, role, aulasTexto, '', descricao, '', tags].filter(Boolean).join('\n');
}

function toggleAula2() {
  const qtd = document.getElementById('quantidade_aulas')?.value;
  const bloco = document.getElementById('blocoAula2');
  if (!bloco) return;
  bloco.style.display = qtd === '2' ? 'block' : 'none';
}

function clearAula2IfHidden() {
  const qtd = document.getElementById('quantidade_aulas')?.value;
  if (qtd === '2') return;

  ['aula2_nome', 'aula2_dia', 'aula2_periodo', 'aula2_descricao'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.value = '';
    else el.value = '';
    el.classList.remove('invalid');
  });
}

/* ===========================
   VARS DO CANVAS / PREVIEW
   =========================== */
let canvas, ctx, frameImg, rostoImg, apoioImg;
let tarjaImg = null;
let currentTarjaType = 'professor';

/* ===========================
   CANVAS
   =========================== */
async function initCanvas() {
  canvas = document.getElementById('canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  await carregarTarja(getTipoTarjaSelecionada());

  frameImg = new Image();
  frameImg.crossOrigin = 'anonymous';
  frameImg.referrerPolicy = 'no-referrer';
  frameImg.onload = gerarPost;
  frameImg.onerror = () => console.error('Falha ao carregar frame:', FRAME_URL);
  frameImg.src = FRAME_URL + '?v=' + Date.now();

  const rostoInput = document.getElementById('foto_rosto');
  const apoioInput = document.getElementById('foto_apoio');

  rostoInput?.addEventListener('change', (e) => {
    const r = new FileReader();
    r.onload = (ev) => {
      rostoImg = new Image();
      rostoImg.onload = gerarPost;
      rostoImg.src = ev.target.result;
    };
    if (e.target.files && e.target.files[0]) r.readAsDataURL(e.target.files[0]);
  });

  apoioInput?.addEventListener('change', (e) => {
    const r = new FileReader();
    r.onload = (ev) => {
      apoioImg = new Image();
      apoioImg.onload = gerarPost;
      apoioImg.src = ev.target.result;
    };
    if (e.target.files && e.target.files[0]) r.readAsDataURL(e.target.files[0]);
  });

  [
    'rostoScale', 'rostoX', 'rostoY',
    'apoioScale', 'apoioX', 'apoioY',
    'tituloDivulgacao', 'subtituloDivulgacao', 'descricaoDivulgacao'
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', gerarPost);
  });

  document.querySelectorAll('input[name="tipoTarja"]').forEach((radio) => {
    radio.addEventListener('change', async () => {
      await carregarTarja(getTipoTarjaSelecionada());
      gerarPost();
      revalidateStepNav();
    });
  });

  document.fonts?.ready?.then(gerarPost);
}

async function carregarTarja(tipo) {
  currentTarjaType = tipo;
  tarjaImg = null;

  const cfg = TARJAS[tipo];
  if (!cfg) {
    tarjaImg = null;
    return;
  }

  try {
    tarjaImg = await loadImage(cfg.src);
  } catch (e) {
    console.error('Não foi possível carregar a tarja:', e);
    tarjaImg = null;
  }
}

function drawCoverImage(img, anchorX, anchorY, scale, offsetX, offsetY, maxW = null, maxH = null) {
  if (!img) return;

  let w = img.width * scale;
  let h = img.height * scale;

  if (maxW && maxH) {
    const s = Math.min(maxW / w, maxH / h);
    w *= s;
    h *= s;
  }

  const drawX = anchorX + offsetX - w / 2;
  const drawY = anchorY + offsetY - h / 2;
  ctx.drawImage(img, drawX, drawY, w, h);
}

function gerarPost() {
  if (!ctx || !canvas) return;

  syncStep5TextFields();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* Imagem de apoio ao fundo */
  if (apoioImg) {
    const scale = parseFloat(document.getElementById('apoioScale').value || '1');
    const offsetX = parseInt(document.getElementById('apoioX').value || '0', 10);
    const offsetY = parseInt(document.getElementById('apoioY').value || '0', 10);

    drawCoverImage(apoioImg, 220, 430, scale, offsetX, offsetY);
  }

  /* Foto principal */
  if (rostoImg) {
    const scale = parseFloat(document.getElementById('rostoScale').value || '1');
    const offsetX = parseInt(document.getElementById('rostoX').value || '0', 10);
    const offsetY = parseInt(document.getElementById('rostoY').value || '0', 10);

    drawCoverImage(rostoImg, 820, 420, scale, offsetX, offsetY, 430, 430);
  }

  if (frameImg?.complete && frameImg.naturalWidth) {
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  }

  const tarjaCfg = TARJAS[currentTarjaType];
  if (tarjaCfg && tarjaImg) {
    const w = tarjaImg.naturalWidth * tarjaCfg.scale;
    const h = tarjaImg.naturalHeight * tarjaCfg.scale;
    ctx.drawImage(tarjaImg, canvas.width - tarjaCfg.x - w, tarjaCfg.y, w, h);
  }

  const titulo = (document.getElementById('tituloDivulgacao')?.value || '').trim();
  const subtitulo = (document.getElementById('subtituloDivulgacao')?.value || '').trim();
  const descricao = (document.getElementById('descricaoDivulgacao')?.value || '').trim();

  /* Nome */
  ctx.font = 'bold 52px "Comic Relief"';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const tituloX = canvas.width / 2;
  const tituloY = 825;
  const tituloMaxWidth = 860;
  const tituloMaxLinhas = 2;
  const tituloLineHeight = 58;

  const linhasTitulo = wrapText(titulo, tituloMaxWidth, ctx);
  const ultrapassouTitulo = linhasTitulo.length > tituloMaxLinhas;
  const tituloSlice = linhasTitulo.slice(0, tituloMaxLinhas);

  tituloSlice.forEach((linha, i) => {
    ctx.fillText(linha, tituloX, tituloY + i * tituloLineHeight);
  });

  /* Rótulo */
  ctx.font = '32px "Comic Relief"';
  ctx.fillStyle = '#111';
  const subtituloY = tituloY + (tituloSlice.length * tituloLineHeight) + 14;
  const linhasSubtitulo = wrapText(subtitulo, 860, ctx).slice(0, 2);
  linhasSubtitulo.forEach((linha, i) => {
    ctx.fillText(linha, tituloX, subtituloY + i * 38);
  });

  /* Descrição */
  ctx.font = '28px "Comic Relief"';
  ctx.fillStyle = '#333';

  const descricaoX = 120;
  const descricaoMaxWidth = 940;
  const descricaoMaxLinhas = 4;
  const lineHeight = 38;

  const linhasManuais = descricao.split('\n');
  let todas = [];
  linhasManuais.forEach((l) => todas.push(...wrapText(l, descricaoMaxWidth, ctx)));

  const ultrapassouDescricao = todas.length > descricaoMaxLinhas;
  const linhasDescricao = todas.slice(0, descricaoMaxLinhas);

  let descricaoY = 1080;
  const descricaoCenterX = descricaoX + (descricaoMaxWidth / 2);

  if (linhasDescricao.length <= 2) {
    ctx.textAlign = 'center';
    linhasDescricao.forEach((linha, i) => {
      ctx.fillText(linha, descricaoCenterX, descricaoY + i * lineHeight);
    });
  } else {
    ctx.textAlign = 'left';
    linhasDescricao.forEach((linha, i) => {
      ctx.fillText(linha, descricaoX, descricaoY + i * lineHeight);
    });
  }

  ctx.textAlign = 'left';

  validationFlags.overflowTitulo = ultrapassouTitulo;
  validationFlags.overflowDescricao = ultrapassouDescricao;

  updateStep5Warning();
  if (typeof revalidateStepNav === 'function') revalidateStepNav();
}

function wrapText(text, maxWidth, context) {
  const linhas = [];
  const palavras = (text || '').split(' ');
  let linha = '';

  palavras.forEach((palavra) => {
    const teste = linha + palavra + ' ';
    const largura = context.measureText(teste).width;

    if (largura > maxWidth && linha !== '') {
      linhas.push(linha.trim());
      linha = palavra + ' ';
    } else if (context.measureText(palavra).width > maxWidth) {
      let parte = '';
      for (let char of palavra) {
        const testeParte = parte + char;
        if (context.measureText(testeParte).width > maxWidth) {
          linhas.push(parte);
          parte = char;
        } else {
          parte = testeParte;
        }
      }
      linha = parte + ' ';
    } else {
      linha = teste;
    }
  });

  if (linha.trim() !== '') linhas.push(linha.trim());
  return linhas;
}

function baixarImagem() {
  const link = document.createElement('a');
  link.download = 'post-learning.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ===========================
   ENVIO (Apps Script)
   =========================== */
async function enviarParaGoogle() {
  const obrig = [
    'nome', 'nome_div', 'rotulo', 'email', 'telefone', 'site', 'insta',
    'quantidade_aulas',
    'aula1_nome', 'aula1_dia', 'aula1_periodo', 'aula1_descricao',
    'foto_rosto', 'foto_apoio',
    'tituloDivulgacao', 'subtituloDivulgacao', 'descricaoDivulgacao'
  ];

  if ((document.getElementById('quantidade_aulas')?.value || '') === '2') {
    obrig.push('aula2_nome', 'aula2_dia', 'aula2_periodo', 'aula2_descricao');
  }

  let faltando = [];

  obrig.forEach((id) => {
    const el = document.getElementById(id);
    const v = (el && el.type !== 'file')
      ? (el.value || '').trim()
      : (el && el.files && el.files.length ? 'ok' : '');

    if (!v) faltando.push(id);
  });

  if (faltando.length) {
    const msg = document.getElementById('mensagem');
    msg.textContent = '❌ Preencha todos os campos obrigatórios.';
    msg.style.color = 'red';
    msg.style.display = 'block';
    return;
  }

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => res(r.result);
    r.onerror = rej;
  });

  async function processarImagem(id) {
    const f = document.getElementById(id)?.files?.[0];
    if (!f) return null;
    const b64 = await toBase64(f);
    return { name: f.name, type: f.type, content: b64.split(',')[1] };
  }

  const fotoRostoBase64 = await processarImagem('foto_rosto');
  const fotoApoioBase64 = await processarImagem('foto_apoio');
  const imagemExtraBase64 = await processarImagem('imagem_extra');

  let previewBase64 = null;
  if (canvas) {
    const dataURL = canvas.toDataURL('image/png');
    previewBase64 = { name: 'preview_learning.png', type: 'image/png', content: dataURL.split(',')[1] };
  }

  const instaParsed = normalizeInstagram(document.getElementById('insta').value);
  const legenda = buildCaptionFromForm();
  const qtd = document.getElementById('quantidade_aulas').value;

  const dados = {
    pagina: 'cadastro_masterclass',
    nome: document.getElementById('nome').value,
    nome_div: document.getElementById('nome_div').value,
    rotulo: document.getElementById('rotulo').value,
    email: document.getElementById('email').value,
    telefone: document.getElementById('telefone').value,
    empresa: document.getElementById('empresa').value,
    site: normalizeUrlMaybe(document.getElementById('site').value),
    insta: instaParsed.url,

    quantidade_aulas: qtd,
    aula1_nome: document.getElementById('aula1_nome').value,
    aula1_dia: document.getElementById('aula1_dia').value,
    aula1_periodo: document.getElementById('aula1_periodo').value,
    aula1_descricao: document.getElementById('aula1_descricao').value,

    aula2_nome: qtd === '2' ? document.getElementById('aula2_nome').value : '',
    aula2_dia: qtd === '2' ? document.getElementById('aula2_dia').value : '',
    aula2_periodo: qtd === '2' ? document.getElementById('aula2_periodo').value : '',
    aula2_descricao: qtd === '2' ? document.getElementById('aula2_descricao').value : '',

    observacoes_agenda: document.getElementById('observacoes_agenda').value,

    titulo_divulgacao: document.getElementById('tituloDivulgacao').value,
    subtitulo_divulgacao: document.getElementById('subtituloDivulgacao').value,
    descricao_divulgacao: document.getElementById('descricaoDivulgacao').value,
    texto_complementar: document.getElementById('texto_complementar').value,

    tipo_tarja: getTipoTarjaSelecionada(),
    legenda,

    foto_rosto: fotoRostoBase64,
    foto_apoio: fotoApoioBase64,
    imagem_extra: imagemExtraBase64,
    preview: previewBase64,

    categoria: 'comic_learning'
  };

  const overlay = document.getElementById('overlay');
  overlay.classList.remove('auth');
  overlay.classList.add('active');

  startOverlayMessages();

  try {
    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbyMbkkFdzYC_BfMsi5WKW6xbOKdjbNbW635vovOLYHGXdso2S_1a2Wdfvur790y0BM46g/exec',
      { method: 'POST', body: JSON.stringify(dados) }
    );

    const result = await response.json();
    const msg = document.getElementById('mensagem');
    msg.style.display = 'block';

    if (result.status === 'success') {
      msg.textContent = '✅ Enviado com sucesso!';
      msg.style.color = 'green';

      const step8 = document.getElementById('step8');
      if (step8) step8.style.display = 'none';

      const stepTitle = document.getElementById('wizardStepTitle');
      if (stepTitle) stepTitle.style.display = 'none';

      const countEl = document.getElementById('wizardStepCount');
      if (countEl) countEl.style.display = 'none';

      const finalScreen = document.getElementById('final-screen');
      if (finalScreen) finalScreen.style.display = 'block';

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      msg.textContent = '❌ Erro ao enviar: ' + (result.message || 'Tente novamente.');
      msg.style.color = 'red';
    }

  } catch (err) {
    const msg = document.getElementById('mensagem');
    msg.textContent = '❌ Erro de rede. Tente novamente.';
    msg.style.color = 'red';
    msg.style.display = 'block';
    console.error(err);

  } finally {
    stopOverlayMessages();
    overlay.classList.remove('active');

    setTimeout(() => {
      const msg = document.getElementById('mensagem');
      if (msg) msg.textContent = '';
    }, 5000);
  }
}

/* ===========================
   AUTENTICAÇÃO
   =========================== */
const API_URL =
  'https://script.google.com/macros/s/AKfycbyMbkkFdzYC_BfMsi5WKW6xbOKdjbNbW635vovOLYHGXdso2S_1a2Wdfvur790y0BM46g/exec';

/* Está usando o nome que você indicou como liberado */
const PAGINA = 'cadastro_masterclass';

async function checkAuth() {
  const chave = (localStorage.getItem('chave') || '').trim();

  if (!chave) {
    blockAndRedirect('Faça login primeiro.', 'index.html', 2000);
    return;
  }

  try {
    const resp = await fetch(`${API_URL}?chave=${encodeURIComponent(chave)}&pagina=${encodeURIComponent(PAGINA)}&v=${Date.now()}`);
    const data = await resp.json();

    if (!data.permitido) {
      blockAndRedirect('Você não tem permissão para acessar esta página.', 'index.html', 2200);
      return;
    }

  } catch (e) {
    blockAndRedirect('Falha de rede. Faça login novamente.', 'index.html', 2500);
  }
}

/* ===========================
   WIZARD / VALIDAÇÕES
   =========================== */
const REQUIRED_BY_STEP = {
  1: [],
  2: ['nome', 'nome_div', 'rotulo', 'email', 'telefone', 'site', 'insta'],
  3: ['quantidade_aulas', 'aula1_nome', 'aula1_dia', 'aula1_periodo', 'aula1_descricao'],
  4: ['foto_rosto', 'foto_apoio'],
  5: ['tituloDivulgacao', 'subtituloDivulgacao', 'descricaoDivulgacao'],
  6: [],
  7: [],
  8: []
};

const GLOBAL_VALIDATORS = [];

const STEP_VALIDATORS = {
  2: () => {
    const email = (document.getElementById('email').value || '').trim();
    const okEmail = EMAIL_REGEX.test(email);
    showFieldError('email', okEmail ? '' : 'Informe um e-mail válido.');

    const raw = (document.getElementById('telefone').value || '').replace(/\D/g, '');
    const okTel = PHONE_ALLOWED_LENGTHS.includes(raw.length);
    showFieldError('telefone', okTel ? '' : 'Telefone com DDD (10 ou 11 dígitos).');

    const siteInput = document.getElementById('site');
    let url = normalizeUrlMaybe(siteInput.value);
    let okSite = false;

    try {
      const u = new URL(url);
      okSite = !!u.hostname && u.hostname.includes('.');
      if (okSite) siteInput.value = url;
    } catch {
      okSite = false;
    }

    showFieldError('site', okSite ? '' : 'Digite um site válido. Ex.: https://seusite.com');

    const instaInput = document.getElementById('insta');
    const parsed = normalizeInstagram(instaInput.value);
    const okInsta = !!parsed.handle;
    showFieldError('insta', okInsta ? '' : 'Informe um Instagram válido (link ou @usuario).');
    if (okInsta) instaInput.value = parsed.url;

    return okEmail && okTel && okSite && okInsta;
  },

  3: () => {
    const qtd = document.getElementById('quantidade_aulas').value;
    let ok = !!qtd;

    if (qtd === '2') {
      ['aula2_nome', 'aula2_dia', 'aula2_periodo', 'aula2_descricao'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('invalid', !(el.value || '').trim());
      });

      ok = ok &&
        !!(document.getElementById('aula2_nome').value || '').trim() &&
        !!(document.getElementById('aula2_dia').value || '').trim() &&
        !!(document.getElementById('aula2_periodo').value || '').trim() &&
        !!(document.getElementById('aula2_descricao').value || '').trim();
    } else {
      clearAula2IfHidden();
    }

    return ok;
  },

  5: () => {
    const t = (document.getElementById('tituloDivulgacao').value || '').trim();
    const s = (document.getElementById('subtituloDivulgacao').value || '').trim();
    const d = (document.getElementById('descricaoDivulgacao').value || '').trim();

    let ok = true;
    step5Messages.errors = [];

    if (!t) {
      step5Messages.errors.push('Preencha o nome para divulgação.');
      ok = false;
    }

    if (!s) {
      step5Messages.errors.push('Preencha o rótulo.');
      ok = false;
    }

    if (!d) {
      step5Messages.errors.push('Preencha o texto curto.');
      ok = false;
    }

    if (t && t.length < CHAR_LIMITS.tituloDivulgacao.min) {
      step5Messages.errors.push('O nome para divulgação está muito curto.');
      ok = false;
    }

    if (validationFlags.overflowTitulo) {
      step5Messages.errors.push('O nome para divulgação ultrapassou o limite da arte.');
      ok = false;
    }

    if (validationFlags.overflowDescricao) {
      step5Messages.errors.push('O texto curto ultrapassou o limite da arte.');
      ok = false;
    }

    if (!accordionFlags.rostoAjustado) {
      step5Messages.errors.push('Abra e ajuste a foto de rosto.');
      ok = false;
    }

    if (!accordionFlags.apoioAjustado) {
      step5Messages.errors.push('Abra e ajuste a imagem de apoio.');
      ok = false;
    }

    if (!accordionFlags.textoAjustado) {
      step5Messages.errors.push('Abra e ajuste os textos.');
      ok = false;
    }

    updateAccordionErrorState();
    updateStep5Warning();
    return ok;
  },

  8: () => {
    buildReview();
    return true;
  }
};

function isFilled(id) {
  const el = document.getElementById(id);
  if (!el) return true;
  if (el.type === 'file') return el.files && el.files.length > 0;
  return (el.value || '').trim().length > 0;
}

function markValidity(ids = []) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('invalid');
    if (!isFilled(id)) el.classList.add('invalid');
  });
}

function validateStep(stepNumber) {
  const required = [...(REQUIRED_BY_STEP[stepNumber] || [])];

  if (stepNumber === 3 && (document.getElementById('quantidade_aulas')?.value || '') === '2') {
    required.push('aula2_nome', 'aula2_dia', 'aula2_periodo', 'aula2_descricao');
  }

  markValidity(required);

  let ok = required.every(isFilled);

  for (const fn of GLOBAL_VALIDATORS) {
    if (fn && fn(stepNumber) === false) ok = false;
  }

  const stepFn = STEP_VALIDATORS[stepNumber];
  if (stepFn && stepFn() === false) ok = false;

  return ok;
}

function revalidateStepNav() {
  const activeStep = steps[currentStep - 1];
  const isValid = validateStep(currentStep);
  const nextBtn = activeStep?.querySelector('[data-next]');
  if (nextBtn) nextBtn.disabled = !isValid;
}

let steps = [], totalSteps = 0, currentStep = 1;

function getStepTitle(stepNumber) {
  const el = steps?.[stepNumber - 1];
  const t = (el?.dataset?.title || '').trim();
  return t || `Etapa ${stepNumber}`;
}

function updateWizardHeader() {
  const countEl = document.getElementById('wizardStepCount');
  if (countEl) countEl.textContent = `ETAPA ${currentStep} DE ${totalSteps}`;

  const titleEl = document.getElementById('wizardStepTitle');
  if (titleEl) titleEl.textContent = getStepTitle(currentStep).toUpperCase();
}

function updateConfirmPreview() {
  const img = document.getElementById('confirmPreview');
  if (!img || !canvas) return;

  gerarPost();

  requestAnimationFrame(() => {
    img.src = canvas.toDataURL('image/png');
  });
}

function showStep(n) {
  currentStep = Math.max(1, Math.min(totalSteps, n));
  steps.forEach((el, idx) => el.classList.toggle('active', idx === currentStep - 1));

  if (currentStep === 5) {
    syncStep5TextFields();
    updateAccordionErrorState();
    updateStep5Warning();
    gerarPost();
  }

  if (currentStep === 6) updateConfirmPreview();
  if (currentStep === 8) buildReview();

  updateWizardHeader();
  revalidateStepNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildReview() {
  const box = document.getElementById('review-list');
  if (!box) return;

  const tipoTarja = getTipoTarjaSelecionada();

  const parts = REVIEW_FIELDS.map(({ id, label, format }) => {
    const el = document.getElementById(id);
    let val = '';

    if (el) {
      if (el.type === 'file') val = (el.files && el.files[0]) ? el.files[0].name : '—';
      else val = (el.value || '').trim();
    }

    if (typeof format === 'function') val = format(val);
    if (!val) val = '—';

    return `
      <div class="review-item">
        <span class="review-label">${label}:</span>
        <div class="review-value">${escapeHtml(val)}</div>
      </div>
    `;
  });

  parts.push(`
    <div class="review-item">
      <span class="review-label">Tarja de divulgação:</span>
      <div class="review-value">${escapeHtml(tipoTarja)}</div>
    </div>
  `);

  box.innerHTML = parts.join('');
}

/* ===========================
   MENU
   =========================== */
function goToMenu() {
  const base = location.href.replace(/[^/]+$/, '');
  window.location.href = base + 'index.html?back=1';
}

/* ===========================
   BOOTSTRAP
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  const isWizardPage = !!document.querySelector('.step') && !!document.getElementById('wizardStepCount');
  if (!isWizardPage) return;

  const telEl = document.getElementById('telefone');
  telEl?.addEventListener('input', (e) => {
    const only = e.target.value.replace(/\D/g, '').slice(0, 11);
    e.target.value = formatPhone(only);
  });

  document.getElementById('quantidade_aulas')?.addEventListener('change', () => {
    toggleAula2();
    revalidateStepNav();
  });

  document.getElementById('nome_div')?.addEventListener('input', syncStep5TextFields);
  document.getElementById('rotulo')?.addEventListener('input', syncStep5TextFields);
  document.getElementById('aula1_descricao')?.addEventListener('input', syncStep5TextFields);

  initCanvas();
  checkAuth();
  toggleAula2();

  document.getElementById('btnAjustar')?.addEventListener('click', () => showStep(5));
  document.getElementById('btnConfirmar')?.addEventListener('click', () => showStep(7));

  document.getElementById('accRosto')?.addEventListener('toggle', (e) => {
    if (e.target.open) markAccordionAsOpened('rosto');
  });

  document.getElementById('accApoio')?.addEventListener('toggle', (e) => {
    if (e.target.open) markAccordionAsOpened('apoio');
  });

  document.getElementById('accTextos')?.addEventListener('toggle', (e) => {
    if (e.target.open) markAccordionAsOpened('texto');
  });

  steps = Array.from(document.querySelectorAll('.step'));
  totalSteps = steps.length;

  updateWizardHeader();

  document.addEventListener('input', (e) => {
    const activeStep = steps[currentStep - 1];
    if (!activeStep?.contains(e.target)) return;
    revalidateStepNav();
  });

  document.addEventListener('change', (e) => {
    const activeStep = steps[currentStep - 1];
    if (!activeStep?.contains(e.target)) return;
    revalidateStepNav();
  });

  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-next]')) {
      if (validateStep(currentStep)) showStep(currentStep + 1);
    }
    if (e.target.matches('[data-prev]')) showStep(currentStep - 1);
  });

  showStep(1);
});

/* Expor globais */
window.enviarParaGoogle = enviarParaGoogle;
window.baixarImagem = baixarImagem;
window.goToMenu = goToMenu;
