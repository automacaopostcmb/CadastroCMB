/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */
const FRAME_URL =
  'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/Framee_learning.png';

const TARJAS = {
  professor: { src: 'assets/learning_professor.png', x: 28, y: 57, scale: 0.2 },
  professora: { src: 'assets/learning_professoraa.png', x: 28, y: 57, scale: 0.2 },
  outro: null
};
 
const PHONE_ALLOWED_LENGTHS = [10, 11];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

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
const step6Messages = { errors: [] };

const validationFlags = {
  overflowNome: false,
  overflowRotulo: false,
  overflowAulas: false
};

const accordionFlags = {
  rostoAjustado: false,
  apoioAjustado: false
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
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src + bust;
  });
}

function getTipoTarjaSelecionada() {
  return document.querySelector('input[name="tipoTarja"]:checked')?.value || '';
}

function updateStep6Warning() {
  const aviso = document.getElementById('avisoTexto');
  if (!aviso) return;

  if (!step6Messages.errors.length) {
    aviso.innerHTML = '';
    aviso.style.display = 'none';
    return;
  }

  aviso.innerHTML = step6Messages.errors.map(msg => `<div>• ${msg}</div>`).join('');
  aviso.style.display = 'block';
}

function markAccordionAsOpened(type) {
  if (type === 'rosto') accordionFlags.rostoAjustado = true;
  if (type === 'apoio') accordionFlags.apoioAjustado = true;

  updateAccordionErrorState();
  revalidateStepNav();
}

function updateAccordionErrorState() {
  const accordionRosto = document.getElementById('accRosto');
  const accordionApoio = document.getElementById('accApoio');

  if (accordionRosto) {
    accordionRosto.classList.toggle('erro', !accordionFlags.rostoAjustado);
    accordionRosto.classList.toggle('opened-once', accordionFlags.rostoAjustado);
  }

  if (accordionApoio) {
    accordionApoio.classList.toggle('erro', !accordionFlags.apoioAjustado);
    accordionApoio.classList.toggle('opened-once', accordionFlags.apoioAjustado);
  }
}

function updateTarjaErrorState() {
  const group = document.getElementById('tipoTarjaGroup');
  if (!group) return;
  const hasSelected = !!getTipoTarjaSelecionada();
  group.classList.toggle('erro', !hasSelected);
}

function toggleAula2() {
  const qtd = document.getElementById('quantidade_aulas')?.value;
  const wrapAula2 = document.getElementById('wrapAula2');
  const aulasContent = document.getElementById('aulasContent');

  if (aulasContent) {
    aulasContent.style.display = qtd ? 'block' : 'none';
  }

  if (wrapAula2) {
    wrapAula2.style.display = qtd === '2' ? 'block' : 'none';
  }
}

function clearAula2IfHidden() {
  const qtd = document.getElementById('quantidade_aulas')?.value;
  if (qtd === '2') return;

  ['aula2_nome', 'aula2_dia', 'aula2_periodo', 'aula2_descricao'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.classList.remove('invalid');
  });
}

/* ===========================
   LEGENDA / DADOS DE DIVULGAÇÃO
   =========================== */
function getNomeDivulgacao() {
  return (document.getElementById('nome_div')?.value || '').trim();
}

function getRotuloDivulgacao() {
  return (document.getElementById('rotulo')?.value || '').trim();
}

function getAulasPreviewText() {
  const qtd = (document.getElementById('quantidade_aulas')?.value || '').trim();
  const aula1 = (document.getElementById('aula1_nome')?.value || '').trim();
  const aula2 = (document.getElementById('aula2_nome')?.value || '').trim();

  const aulas = [];
  if (aula1) aulas.push(aula1);
  if (qtd === '2' && aula2) aulas.push(aula2);

  return aulas.join(' • ');
}

function buildCaptionFromForm() {
  const nomeDiv = getNomeDivulgacao();
  const rotulo = getRotuloDivulgacao();
  const aulas = getAulasPreviewText();

  const { handle } = normalizeInstagram(document.getElementById('insta')?.value || '');
  const instaHandle = handle ? '@' + handle : '';

  const textoComp = (document.getElementById('texto_complementar')?.value || '').trim();
  const descAula1 = (document.getElementById('aula1_descricao')?.value || '').trim();
  const descricao = textoComp || descAula1 || '';

  const head = `${nomeDiv || 'Professor(a) confirmado(a)'} ${instaHandle || ''} no Comic Learning @comicmarketbrasil`;
  const role = rotulo || '';
  const aulasTexto = aulas ? `Aulas: ${aulas}` : '';
  const tags = '#ComicLearning #ComicMarketBrasil #QuadrinhosNacionais #QuadrinhosBrasileiros #hqbr #mangabr #historiaemquadrinhos #fapcom';

  return [head, role, aulasTexto, '', descricao, '', tags].filter(Boolean).join('\n');
}

/* ===========================
   VARS DO CANVAS / PREVIEW
   =========================== */
let canvas, ctx, frameImg, rostoImg, apoioImg;
let tarjaImg = null;
let currentTarjaType = '';

/* ===========================
   CANVAS
   =========================== */

function drawNomeDivulgacaoTarja(c, text, x, y, scale = 1) {
  if (!text) return;

  const s = scale;

  const PADDING_X = 22 * s;
  const PADDING_Y = 12 * s;
  const BORDER    = 4  * s;
  const RADIUS    = 4  * s;
  const SHADOW_X  = -5 * s;
  const SHADOW_Y  = 5  * s;
  const MAX_WIDTH = 500 * s;

  let fontSize = 34 * s;
  c.font = `700 ${fontSize}px "Comic Relief", Arial, sans-serif`;

  let metrics = c.measureText(text);
  while (metrics.width > MAX_WIDTH && fontSize > 14 * s) {
    fontSize -= 1;
    c.font = `700 ${fontSize}px "Comic Relief", Arial, sans-serif`;
    metrics = c.measureText(text);
  }

  const ascent  = metrics.actualBoundingBoxAscent ?? fontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.2;
  const textH   = ascent + descent;

  const rectW = Math.ceil(metrics.width + PADDING_X * 2);
  const rectH = Math.ceil(textH + PADDING_Y * 2);

  c.save();

  // sombra
  drawRoundedRect(c, x + SHADOW_X, y + SHADOW_Y, rectW, rectH, RADIUS);
  c.fillStyle = '#000';
  c.fill();

  // caixa amarela
  drawRoundedRect(c, x, y, rectW, rectH, RADIUS);
  c.fillStyle = '#ffd400';
  c.fill();

  // borda
  c.lineWidth = BORDER;
  c.strokeStyle = '#000';
  c.stroke();

  // texto
  c.fillStyle = '#111';
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  const textX = x + PADDING_X;
  const textY = y + (rectH - textH) / 2 + ascent;
  c.fillText(text, textX, textY);

  c.restore();
}

function drawRoundedRect(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}


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
    'nome_div', 'rotulo', 'aula1_nome', 'aula2_nome', 'quantidade_aulas'
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', gerarPost);
    document.getElementById(id)?.addEventListener('change', gerarPost);
  });

  document.querySelectorAll('input[name="tipoTarja"]').forEach((radio) => {
    radio.addEventListener('change', async () => {
      currentTarjaType = getTipoTarjaSelecionada();
      tarjaImg = null;
      await carregarTarja(currentTarjaType);
      updateTarjaErrorState();
      gerarPost();
      revalidateStepNav();
    });
  });

  document.fonts?.ready?.then(gerarPost);
}

async function carregarTarja(tipo) {
  currentTarjaType = tipo || '';
  tarjaImg = null;

  const cfg = TARJAS[currentTarjaType];
  if (!cfg) {
    gerarPost();
    return;
  }

  try {
    tarjaImg = await loadImage(cfg.src);
    gerarPost();
  } catch (e) {
    console.error('Não foi possível carregar a tarja:', currentTarjaType, cfg.src, e);
    tarjaImg = null;
    gerarPost();
  }
}

function drawCoverImage(img, anchorX, anchorY, scale, offsetX, offsetY) {
  if (!img) return;

  const w = img.width * scale;
  const h = img.height * scale;
  const drawX = anchorX + offsetX - w / 2;
  const drawY = anchorY + offsetY - h / 2;

  ctx.drawImage(img, drawX, drawY, w, h);
}

// NOVA FUNÇÃO COM MÁSCARA
function drawCoverImageMasked(img, anchorX, anchorY, scale, offsetX, offsetY, mask) {
  if (!img || !mask) return;

  const w = img.width * scale;
  const h = img.height * scale;
  const drawX = anchorX + offsetX - w / 2;
  const drawY = anchorY + offsetY - h / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(mask.x, mask.y, mask.w, mask.h);
  ctx.clip();

  ctx.drawImage(img, drawX, drawY, w, h);

  ctx.restore();
}

function gerarPost() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);


// === IMAGEM DE APOIO (COM MÁSCARA)
if (apoioImg) {
  const baseScale = 1;
  const sliderScale = parseFloat(document.getElementById('apoioScale')?.value || '1');
  const scale = baseScale * sliderScale;

  const offsetX = parseInt(document.getElementById('apoioX')?.value || '0', 10);
  const offsetY = parseInt(document.getElementById('apoioY')?.value || '0', 10);

  drawCoverImageMasked(
    apoioImg,
    120, 430, // centro da imagem esquerda (ajuste fino depois)
    scale,
    offsetX,
    offsetY,
    { x: 0, y: 0, w: 223, h: canvas.height }
  );
}

// === FOTO PRINCIPAL (COM MÁSCARA)
if (rostoImg) {
  const baseScale = 2.2; // tamanho inicial padrão
  const sliderScale = parseFloat(document.getElementById('rostoScale')?.value || '1');
  const scale = baseScale * sliderScale;

  const offsetX = parseInt(document.getElementById('rostoX')?.value || '0', 10);
  const offsetY = parseInt(document.getElementById('rostoY')?.value || '0', 10);
   
 drawCoverImageMasked(
  rostoImg,
  656, 454,
  scale,
  offsetX,
  offsetY,
  { x: 212, y: 0, w: canvas.width - 212, h: canvas.height }
);
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

const nomeDivulgacao = (document.getElementById('nomeDivulgacao')?.value || '').trim();

if (nomeDivulgacao) {
  drawNomeDivulgacaoTarja(ctx, nomeDivulgacao, 150, 760, 1);
}
  const rotulo = getRotuloDivulgacao();
  const aulasTexto = getAulasPreviewText();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.font = 'bold 52px "Comic Relief"';
  ctx.fillStyle = '#000';

  const nomeX = canvas.width / 2;
  const nomeY = 825;
  const nomeMaxWidth = 860;
  const nomeMaxLinhas = 2;
  const nomeLineHeight = 58;

  const linhasNome = wrapText(nome, nomeMaxWidth, ctx);
  const overflowNome = linhasNome.length > nomeMaxLinhas;
  const nomeSlice = linhasNome.slice(0, nomeMaxLinhas);

  nomeSlice.forEach((linha, i) => {
    ctx.fillText(linha, nomeX, nomeY + i * nomeLineHeight);
  });

  ctx.font = '32px "Comic Relief"';
  ctx.fillStyle = '#111';

  const rotuloY = nomeY + (nomeSlice.length * nomeLineHeight) + 14;
  const linhasRotulo = wrapText(rotulo, 860, ctx);
  const overflowRotulo = linhasRotulo.length > 2;
  linhasRotulo.slice(0, 2).forEach((linha, i) => {
    ctx.fillText(linha, nomeX, rotuloY + i * 38);
  });

  ctx.font = '28px "Comic Relief"';
  ctx.fillStyle = '#333';

  const aulasX = 120;
  const aulasMaxWidth = 940;
  const aulasMaxLinhas = 3;
  const aulasLineHeight = 38;
  const aulasY = 1080;
  const aulasCenterX = aulasX + (aulasMaxWidth / 2);

  const linhasAulas = wrapText(aulasTexto, aulasMaxWidth, ctx);
  const overflowAulas = linhasAulas.length > aulasMaxLinhas;
  const aulasSlice = linhasAulas.slice(0, aulasMaxLinhas);

  if (aulasSlice.length <= 2) {
    ctx.textAlign = 'center';
    aulasSlice.forEach((linha, i) => {
      ctx.fillText(linha, aulasCenterX, aulasY + i * aulasLineHeight);
    });
  } else {
    ctx.textAlign = 'left';
    aulasSlice.forEach((linha, i) => {
      ctx.fillText(linha, aulasX, aulasY + i * aulasLineHeight);
    });
  }

  ctx.textAlign = 'left';

  validationFlags.overflowNome = overflowNome;
  validationFlags.overflowRotulo = overflowRotulo;
  validationFlags.overflowAulas = overflowAulas;

  updateStep6Warning();
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
      for (const char of palavra) {
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
    'nome', 'nome_div', 'rotulo', 'email', 'telefone',
    'site', 'insta',
    'quantidade_aulas',
    'aula1_nome', 'aula1_dia', 'aula1_periodo', 'aula1_descricao',
    'foto_rosto', 'foto_apoio'
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

      const step9 = document.getElementById('step9');
      if (step9) step9.style.display = 'none';

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
  2: ['nome', 'nome_div', 'rotulo', 'email', 'telefone'],
  3: ['site', 'insta'],
  4: ['quantidade_aulas', 'aula1_nome', 'aula1_dia', 'aula1_periodo', 'aula1_descricao'],
  5: ['foto_rosto', 'foto_apoio'],
  6: [],
  7: [],
  8: [],
  9: []
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

    return okEmail && okTel;
  },

  3: () => {
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

    return okSite && okInsta;
  },

  4: () => {
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

  6: () => {
    let ok = true;
    step6Messages.errors = [];

    if (!getTipoTarjaSelecionada()) {
      step6Messages.errors.push('Selecione a tarja de divulgação.');
      ok = false;
    }

    if (!accordionFlags.rostoAjustado) {
      step6Messages.errors.push('Abra e ajuste sua foto principal.');
      ok = false;
    }

    if (!accordionFlags.apoioAjustado) {
      step6Messages.errors.push('Abra e ajuste a imagem de apoio.');
      ok = false;
    }

    if (validationFlags.overflowNome) {
      step6Messages.errors.push('O nome para divulgação ultrapassou o limite da arte.');
      ok = false;
    }

    if (validationFlags.overflowRotulo) {
      step6Messages.errors.push('O rótulo ultrapassou o limite da arte.');
      ok = false;
    }

    if (validationFlags.overflowAulas) {
      step6Messages.errors.push('O nome da aula ultrapassou o limite da arte.');
      ok = false;
    }

    updateAccordionErrorState();
    updateTarjaErrorState();
    updateStep6Warning();
    return ok;
  },

  9: () => {
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

  if (stepNumber === 4 && (document.getElementById('quantidade_aulas')?.value || '') === '2') {
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
    try {
      img.src = canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Erro ao gerar preview:', err);
    }
  });
}

function showStep(n) {
  currentStep = Math.max(1, Math.min(totalSteps, n));
  steps.forEach((el, idx) => el.classList.toggle('active', idx === currentStep - 1));

  if (currentStep === 6) {
    updateAccordionErrorState();
    updateTarjaErrorState();
    updateStep6Warning();
    gerarPost();
  }

  if (currentStep === 7) updateConfirmPreview();
  if (currentStep === 9) buildReview();

  updateWizardHeader();
  revalidateStepNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildReview() {
  const box = document.getElementById('review-list');
  if (!box) return;

  const qtd = (document.getElementById('quantidade_aulas')?.value || '').trim();
  const textoComplementar = (document.getElementById('texto_complementar')?.value || '').trim();

  const sobreVoceItens = [
    ['Nome completo', document.getElementById('nome')?.value || '—'],
    ['Nome para divulgação', document.getElementById('nome_div')?.value || '—'],
    ['E-mail', document.getElementById('email')?.value || '—'],
    ['Telefone', document.getElementById('telefone')?.value || '—']
  ];

  const grupos = [
    {
      titulo: 'Sobre você',
      itens: sobreVoceItens
    },
    {
      titulo: 'Empresa e redes',
      itens: [
        ['Empresa', document.getElementById('empresa')?.value || '—'],
        ['Site/Portfólio', normalizeUrlMaybe(document.getElementById('site')?.value || '') || '—'],
        ['Instagram', normalizeInstagram(document.getElementById('insta')?.value || '').url || '—']
      ]
    },
    {
      titulo: 'Aula 1',
      itens: [
        ['Nome da aula 1', document.getElementById('aula1_nome')?.value || '—'],
        ['Dia da aula 1', document.getElementById('aula1_dia')?.value || '—'],
        ['Período aula 1', document.getElementById('aula1_periodo')?.value || '—'],
        ['Descrição da aula 1', document.getElementById('aula1_descricao')?.value || '—']
      ]
    }
  ];

  if (qtd === '2') {
    grupos.push({
      titulo: 'Aula 2',
      itens: [
        ['Nome da aula 2', document.getElementById('aula2_nome')?.value || '—'],
        ['Dia da aula 2', document.getElementById('aula2_dia')?.value || '—'],
        ['Período aula 2', document.getElementById('aula2_periodo')?.value || '—'],
        ['Descrição da aula 2', document.getElementById('aula2_descricao')?.value || '—']
      ]
    });
  }

  grupos.push({
    titulo: 'Observações',
    itens: [
      ['Observações de agenda', document.getElementById('observacoes_agenda')?.value || '—']
    ]
  });

  if (textoComplementar) {
    grupos.push({
      titulo: 'Informações adicionais',
      itens: [
        ['Texto complementar', textoComplementar]
      ]
    });
  }

  box.innerHTML = grupos.map((grupo) => `
    <div class="review-group">
      <h3>${escapeHtml(grupo.titulo)}</h3>
      ${grupo.itens.map(([label, value]) => `
        <div class="review-item">
          <span class="review-label">${escapeHtml(label)}:</span>
          <div class="review-value">${escapeHtml(value || '—')}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
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
    gerarPost();
  });

  ['nome_div', 'rotulo', 'aula1_nome', 'aula2_nome'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', gerarPost);
  });

  initCanvas();
  checkAuth();
  toggleAula2();

  document.getElementById('btnAjustar')?.addEventListener('click', () => showStep(6));
  document.getElementById('btnConfirmar')?.addEventListener('click', () => showStep(8));

  document.getElementById('accRosto')?.addEventListener('toggle', (e) => {
    if (e.target.open) markAccordionAsOpened('rosto');
  });

  document.getElementById('accApoio')?.addEventListener('toggle', (e) => {
    if (e.target.open) markAccordionAsOpened('apoio');
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
