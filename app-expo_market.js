/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */
const FRAME_URL =
  'https://cdn.jsdelivr.net/gh/automacaopostcmb-bit/CadastroCMB@main/assets/Framee_expo_market.png';

/* ===== TARJAS (AJUSTE AQUI) =====
   x e y = posição em px (0,0 no canto superior esquerdo do canvas)
   scale = multiplicador do tamanho (1 = 100%)
*/
const TARJAS = {
  artista: { src: 'assets/tarja-artista.png', x: 28, y: 57, scale: 0.2 },
  empresa: { src: 'assets/tarja-empresa.png', x: 28, y: 57, scale: 0.2 }
};

const CHAR_LIMITS = {
  titulo: { min: 25, max: 60 }
};
const PHONE_ALLOWED_LENGTHS = [10, 11];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const REVIEW_FIELDS = [
  { id: 'nome', label: 'Nome' },
  { id: 'email', label: 'E-mail' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'empresa', label: 'Empresa' },
  { id: 'site', label: 'Site', format: (v) => normalizeUrlMaybe(v) },
  { id: 'insta', label: 'Instagram', format: (v) => normalizeInstagram(v).url }
];

/* ===========================
   OVERLAY: mensagens rotativas
   =========================== */

const OVERLAY_STEPS = [
  { after: 0,      msg: "Separando informações..." },
  { after: 6000,   msg: "Enviando informações..." },
  { after: 12000,  msg: "Salvando imagens..." },
  { after: 25000,  msg: "Cadastrando expositor..." },
  { after: 40000,  msg: "Quase lá!" },
  { after: 50000,  msg: "Finalizando..." },
  { after: 80000,  msg: "Está demorando mais do que o normal." },
  { after: 100000, msg: "Só mais um pouco..." },
  { after: 155000, msg: "Demorou mais do que o normal. Tente trocar de rede e reenviar." },
];

let overlayTimers = [];

function setOverlayText(text) {
  // pega o texto do loader dentro do overlay (mesma estrutura da outra página)
  const el = document.querySelector('#overlay .loader-text');
  if (el) el.textContent = text || "Enviando...";
}

function startOverlayMessages(steps = OVERLAY_STEPS) {
  stopOverlayMessages(); // evita acumular timers em reenvio
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

const step5Messages = { errors: [] };
const validationFlags = {
  overflowTitulo: false,
  overflowDescricao: false
};

function showAuthOverlay(message) {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;

  // garante que não está no modo "envio"
  overlay.classList.remove('active');
  overlay.classList.add('auth');

  // força aparecer (se no seu CSS o .active controla display)
  overlay.style.display = 'grid';

  // texto
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
  setTimeout(() => { window.location.href = url; }, delay); // 👈 aqui ajusta o “tempo do popup”
}

/* ===========================
   HELPERS
   =========================== */
function showFieldError(inputId, msg) {
  const box = document.getElementById(inputId + 'Error');
  const input = document.getElementById(inputId);
  if (box) { box.textContent = msg || ''; box.style.display = msg ? 'block' : 'none'; }
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
/* Instagram: aceita link, @handle ou handle puro; retorna {url, handle} */
function normalizeInstagram(raw) {
  let v = (raw || '').trim();
  if (!v) return { url: '', handle: '' };
  v = v.replace(/\s+/g, '');

  // URL (com ou sem https)
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

  // handle / @handle
  const handle = v.replace(/^@+/, '').toLowerCase();
  if (/^[a-z0-9._]{1,30}$/.test(handle)) {
    return { url: `https://www.instagram.com/${handle}`, handle };
  }
  return { url: '', handle: '' };
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


function buildCaptionFromForm() {
  const empresa = (document.getElementById('empresa')?.value || '').trim();
  const { handle } = normalizeInstagram(document.getElementById('insta')?.value || '');
  const instaHandle = handle ? '@' + handle : '';

  const descLonga = (document.getElementById('descricaolonga')?.value || '').trim();
  const descCurta = (document.getElementById('descricao')?.value || '').trim();
  const descricao = descLonga || descCurta || '';

  const head = `Expositor confirmado! ${empresa || '—'} ${instaHandle || ''} no CMB @comicmarketbrasil`;
  const tags =
    '#ComicMarketBrasil #QuadrinhosNacionais #QuadrinhosBrasileiros #hqbr #mangabr #historiaemquadrinhos #desenhistabrasileiro #ilustradorbrasileiro #fapcom';
  return [head, '', descricao, '', tags].join('\n');
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

/* ===========================
   VARS DO CANVAS / PREVIEW
   =========================== */
let canvas, ctx, frameImg, logoImg, lateralImg;
let tarjaImg = null, tarjaCfg = null, categoriaSelecionada = null;

/* ===========================
   CANVAS
   =========================== */
function initCanvas() {
  canvas = document.getElementById('canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // frame
  frameImg = new Image();
  frameImg.crossOrigin = 'anonymous';
  frameImg.referrerPolicy = 'no-referrer';
  frameImg.onload = gerarPost;
  frameImg.onerror = () => console.error('Falha ao carregar frame:', FRAME_URL);
  frameImg.src = FRAME_URL + '?v=' + Date.now();

  // uploads
  const logoInput = document.getElementById('logo');
  const lateralInput = document.getElementById('lateral');

  logoInput?.addEventListener('change', (e) => {
    const r = new FileReader();
    r.onload = (ev) => { logoImg = new Image(); logoImg.onload = gerarPost; logoImg.src = ev.target.result; };
    if (e.target.files && e.target.files[0]) r.readAsDataURL(e.target.files[0]);
  });

  lateralInput?.addEventListener('change', (e) => {
    const r = new FileReader();
    r.onload = (ev) => { lateralImg = new Image(); lateralImg.onload = gerarPost; lateralImg.src = ev.target.result; };
    if (e.target.files && e.target.files[0]) r.readAsDataURL(e.target.files[0]);
  });

  // sliders imagem de apoio + textos
  ['imgScale', 'imgX', 'imgY', 'titulo', 'descricao'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', gerarPost);
  });

  bindCategoriaRadios();
  document.fonts?.ready?.then(gerarPost);
}

/* ---- radios + tarja (sem sliders) ---- */
function bindCategoriaRadios() {
  const radios = document.querySelectorAll('input[name="categoria"]');
  radios.forEach((radio) => {
    radio.addEventListener('change', () => selectCategoria(radio.value));
  });

  const pre = document.querySelector('input[name="categoria"]:checked');
  if (pre) selectCategoria(pre.value);
}
async function selectCategoria(value) {
  categoriaSelecionada = value;
  tarjaCfg = { ...TARJAS[value] };

  const catWrap = document.getElementById('categoriaWrap');

  if (catWrap) {
    catWrap.classList.remove('erro');
  }

  try {
    tarjaImg = await loadImage(tarjaCfg.src);
  } catch (e) {
    console.error('Não foi possível carregar a tarja:', e);
    tarjaImg = null;
  }

  gerarPost();
  revalidateStepNav();
}

/* ---- desenho ---- */
function gerarPost() {
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // imagem de apoio
  if (lateralImg) {
    const scale = parseFloat(document.getElementById('imgScale').value || '1');
    const anchorPointX = 112, anchorPointY = 433;
    const offsetX = parseInt(document.getElementById('imgX').value || '0', 10);
    const offsetY = parseInt(document.getElementById('imgY').value || '0', 10);
    const w = lateralImg.width * scale, h = lateralImg.height * scale;
    const drawX = anchorPointX + offsetX - w / 2;
    const drawY = anchorPointY + offsetY - h / 2;
    ctx.drawImage(lateralImg, drawX, drawY, w, h);
  }

  // frame
  if (frameImg?.complete && frameImg.naturalWidth) {
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  }

  // tarja
  if (tarjaCfg) {
    if (tarjaImg) {
      const w = tarjaImg.naturalWidth * tarjaCfg.scale;
      const h = tarjaImg.naturalHeight * tarjaCfg.scale;
      ctx.drawImage(tarjaImg, canvas.width - tarjaCfg.x - w, tarjaCfg.y, w, h);
    } else {
      ctx.fillStyle = '#ffd400';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 10;
      ctx.fillRect(tarjaCfg.x, tarjaCfg.y, 460 * tarjaCfg.scale, 92 * tarjaCfg.scale);
      ctx.strokeRect(tarjaCfg.x, tarjaCfg.y, 460 * tarjaCfg.scale, 92 * tarjaCfg.scale);
    }
  }

  // logo
if (logoImg) {
  const maxWidth = 445, maxHeight = 350;

  const s = Math.min(maxWidth / logoImg.width, maxHeight / logoImg.height);
  const w = logoImg.width * s;
  const h = logoImg.height * s;

  const logoCenterX = 657; // centro horizontal
  const logoCenterY = 415; // centro vertical

  const drawX = logoCenterX - w / 2;
  const drawY = logoCenterY - h / 2;

  ctx.drawImage(logoImg, drawX, drawY, w, h);
}

  // título
  const titulo = (document.getElementById('titulo').value || '').trim();
  ctx.font = 'bold 48px "Comic Relief"';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

const tituloX = canvas.width / 2, tituloYBase = 830;
  const tituloMaxWidth = 815, tituloMaxLinhas = 2;
  const linhasTitulo = wrapText(titulo, tituloMaxWidth, ctx);
  const ultrapassouTitulo = linhasTitulo.length > tituloMaxLinhas;
  const linhasTituloSlice = linhasTitulo.slice(0, tituloMaxLinhas);
  let offsetY = (linhasTituloSlice.length === 1) ? 30 : 0;
  linhasTituloSlice.forEach((linha, i) => ctx.fillText(linha, tituloX, tituloYBase + i * 54 + offsetY));

  // descrição

const descricao = (document.getElementById('descricao').value || '').trim();
ctx.font = '28px "Comic Relief"';
ctx.fillStyle = '#333';

const descricaoX = 128;
const descricaoMaxWidth = 934;
const descricaoMaxLinhas = 4;
const lineHeight = 40;

// centro vertical da área amarela
const centroY = canvas.height - 280; // 1070

const linhasManuais = descricao.split('\n');
let todas = [];
linhasManuais.forEach((l) => todas.push(...wrapText(l, descricaoMaxWidth, ctx)));

const ultrapassouDescricao = todas.length > descricaoMaxLinhas;
const linhasDescricao = todas.slice(0, descricaoMaxLinhas);

// altura total do bloco de texto
const textBlockHeight = linhasDescricao.length * lineHeight;

// Y inicial para centralizar o bloco
let descricaoY = centroY - (textBlockHeight / 2) + (lineHeight * 0.8);

// limite máximo para manter o comportamento atual quando estiver cheio
const maxTopY = 1018;
if (linhasDescricao.length >= descricaoMaxLinhas && descricaoY > maxTopY) {
  descricaoY = maxTopY;
}

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
  const palavras = text.split(' ');
  const linhas = [];
  let linha = '';
  palavras.forEach((p) => {
    const teste = linha + p + ' ';
    const largura = context.measureText(teste).width;
    if (largura > maxWidth && linha !== '') {
      linhas.push(linha.trim());
      linha = p + ' ';
    } else {
      linha = teste;
    }
  });
  if (linha !== '') linhas.push(linha.trim());
  return linhas;
}

function baixarImagem() {
  const link = document.createElement('a');
  link.download = 'post.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* ===========================
   ENVIO (Apps Script)
   =========================== */
async function enviarParaGoogle() {
  const obrig = ['nome','email','telefone','empresa','site','insta','logo','lateral','titulo','descricao'];
  let faltando = [];
  obrig.forEach((id) => {
    const el = document.getElementById(id);
    const v = (el && el.type !== 'file') ? (el.value || '').trim() : (el && el.files && el.files.length ? 'ok' : '');
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
    const r = new FileReader(); r.readAsDataURL(file);
    r.onload = () => res(r.result); r.onerror = rej;
  });
  async function processarImagem(id) {
    const f = document.getElementById(id).files[0];
    if (!f) return null;
    const b64 = await toBase64(f);
    return { name: f.name, type: f.type, content: b64.split(',')[1] };
  }

  const logoBase64 = await processarImagem('logo');
  const lateralBase64 = await processarImagem('lateral');
  const backgroundBase64 = await processarImagem('background');

  let previewBase64 = null;
  if (canvas) {
    const dataURL = canvas.toDataURL('image/png');
    previewBase64 = { name: 'preview.png', type: 'image/png', content: dataURL.split(',')[1] };
  }

  const instaParsed = normalizeInstagram(document.getElementById('insta').value);
  const legenda = buildCaptionFromForm();

  const dados = {
    nome: document.getElementById('nome').value,
    email: document.getElementById('email').value,
    telefone: document.getElementById('telefone').value,
    empresa: document.getElementById('empresa').value,
    site: document.getElementById('site').value,
    insta: instaParsed.url,
    titulo: document.getElementById('titulo').value,
    descricao: document.getElementById('descricao').value,
    descricaolonga: document.getElementById('descricaolonga').value,
    legenda,
    logo: logoBase64,
    lateral: lateralBase64,
    background: backgroundBase64,
    preview: previewBase64,
    categoria: categoriaSelecionada || ''
  };

const overlay = document.getElementById('overlay');

// 🔒 garante que não ficou em modo "auth" (bloqueio/login)
overlay.classList.remove('auth');

// 🚀 ativa modo normal de envio
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
  stopOverlayMessages();           // ✅ para e reseta mensagens
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
const PAGINA = 'expo_market';
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

    // se quiser, ao passar auth, garante overlay sumido
    // hideAuthOverlay();

  } catch (e) {
    blockAndRedirect('Falha de rede. Faça login novamente.', 'index.html', 2500);
  }
}

/* ===========================
   WIZARD / VALIDAÇÕES
   =========================== */
const REQUIRED_BY_STEP = {
  1: [],
  2: ['nome','email','telefone'],
  3: ['empresa','site','insta'],
  4: ['logo','lateral'],
  5: ['titulo','descricao'],
  6: [], // confirmar imagem
  7: [], // informações adicionais
  8: []  // review
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
    } catch { okSite = false; }
    showFieldError('site', okSite ? '' : 'Digite um site válido. Ex.: https://suaempresa.com');

    const instaInput = document.getElementById('insta');
    const parsed = normalizeInstagram(instaInput.value);
    const okInsta = !!parsed.handle;
    showFieldError('insta', okInsta ? '' : 'Informe um Instagram válido (link ou @usuario).');
    if (okInsta) instaInput.value = parsed.url;

    return okSite && okInsta;
  },
5: () => {
  const t = (document.getElementById('titulo').value || '').trim();
  const d = (document.getElementById('descricao').value || '').trim();

  let ok = true;
  step5Messages.errors = [];

  const hasTitulo = t.length > 0;
  const hasDescricao = d.length > 0;

  if (hasTitulo && t.length < CHAR_LIMITS.titulo.min) {
    step5Messages.errors.push('O título tem que ser maior');
    ok = false;
  }

  if (t.length > CHAR_LIMITS.titulo.max || validationFlags.overflowTitulo) {
    step5Messages.errors.push('O título tem que ser menor');
    ok = false;
  }

  if (hasDescricao && validationFlags.overflowDescricao) {
    step5Messages.errors.push('Sua descrição ultrapassou o limite, por favor ajuste!');
    ok = false;
  }

  const selected = document.querySelector('input[name="categoria"]:checked');
  const catWrap = document.getElementById('categoriaWrap');

  if (!selected) {
    ok = false;
    step5Messages.errors.push('Selecione a sua categoria.');

    if (catWrap) {
      catWrap.classList.add('erro');
    }
  } else {
    if (catWrap) {
      catWrap.classList.remove('erro');
    }
  }

  updateStep5Warning();
  return ok;
},
8: () => { buildReview(); return true; }
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
  const required = REQUIRED_BY_STEP[stepNumber] || [];
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

  // garante render final
  gerarPost();

  requestAnimationFrame(() => {
    img.src = canvas.toDataURL('image/png');
  });
}

function showStep(n) {
  currentStep = Math.max(1, Math.min(totalSteps, n));
  steps.forEach((el, idx) => el.classList.toggle('active', idx === currentStep - 1));

if (currentStep === 6) { updateConfirmPreview(); }
if (currentStep === 8) { buildReview(); }

  updateWizardHeader();
  revalidateStepNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildReview() {
  const box = document.getElementById('review-list');
  if (!box) return;
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

  initCanvas();
  checkAuth();

   document.getElementById('btnAjustar')?.addEventListener('click', () => showStep(5));
document.getElementById('btnConfirmar')?.addEventListener('click', () => showStep(7));
   
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
    if (e.target.matches('[data-next]')) { if (validateStep(currentStep)) showStep(currentStep + 1); }
    if (e.target.matches('[data-prev]')) showStep(currentStep - 1);
  });

  showStep(1);
});

/* Expor globais */
window.enviarParaGoogle = enviarParaGoogle;
window.baixarImagem = baixarImagem;
window.goToMenu = goToMenu;


















