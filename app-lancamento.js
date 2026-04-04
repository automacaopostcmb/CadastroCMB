const AUTH_URL = 'https://script.google.com/macros/s/AKfycbyMbkkFdzYC_BfMsi5WKW6xbOKdjbNbW635vovOLYHGXdso2S_1a2Wdfvur790y0BM46g/exec';
const SUBMIT_URL = 'https://script.google.com/macros/s/AKfycbyHzp8x1x48GQ65SsbebbLjzt0FhnwdbBO9Fj714cDTbUt2ANCuv7LUIajKIi3bsyVq/exec';
const PAGINA = 'lancamento';

let steps = [];
let currentStep = 1;
let totalSteps = 6;
let wizardDone = false;

const canvas = document.getElementById('canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const userImg = new Image();
let userImgLoaded = false;

const frameImg = new Image();
let frameLoaded = false;
let frameError = false;

let fontsReady = false;

const state = {
  imgScale: 1.1,
  imgX: 0,
  imgY: 0
};

/*
  ==========================================================
  CONTROLES IMPORTANTES DO TEXTO DO PREVIEW
  ==========================================================
  Ajuste aqui:
  - posição
  - largura máxima da obra em px
  - fonte base
  - fonte mínima
  - plaquinha do nome
*/

const PREVIEW_CONFIG = {
  obra: {
    x: 25,
    y: 1192,
    fontBaseSize: 88,
    fontMinSize: 28,
    maxWidth: 715,
    fontFamily: '"Comic Relief", Arial, sans-serif',

    frontFill: '#f3f3f3',
    frontStroke: '#000000',
    frontStrokeWidth: 10,

    yellowFill: '#f3b233',
    yellowOffsetY: 1,
    yellowLayers: [4, 8, 12, 16, 20],
    yellowSideOffsets: [-10, -6, -3, 0, 3, 6, 10],

    innerShadowColor: '#777777',
    innerShadowOffsetY: 6,

    textAlign: 'left',
    textBaseline: 'middle'
  },

  nomePlaquinha: {
    x: 25,
    y: 1090,
    scale: 0.42,
    maxWidth: 715
  }
};

const REQUIRED_BY_STEP = {
  1: [],
  2: ['nome', 'insta'],
  3: ['obra', 'descricao', 'imagemDivulgacao'],
  4: [],
  5: [],
  6: []
};

const OVERLAY_STEPS = [
  { after: 0,      msg: "Finalizando seu lançamento..." },
  { after: 6000,   msg: "Salvando a sua imagem..." },
  { after: 12000,  msg: "Quase lá!" },
  { after: 25000,  msg: "Só mais um pouco…" },
  { after: 40000,  msg: "Finalizando..." },
  { after: 50000,  msg: "Só mais um pouco…" },
  { after: 80000,  msg: "Está demorando mais do que o normal." },
  { after: 100000, msg: "Imagem é pesada ou sua internet está ruim?" },
  { after: 155000, msg: "Demorou mais do que o normal. Tente trocar de rede e reenviar." },
];

let overlayTimers = [];

function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showFieldError(id, message) {
  const box = qs(id + 'Error');
  if (box) box.textContent = message || '';
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
          return {
            url: `https://www.instagram.com/${handle}`,
            handle
          };
        }
      }
    } catch (e) {}

    return { url: '', handle: '' };
  }

  const handle = v.replace(/^@+/, '').toLowerCase();
  if (/^[a-z0-9._]{1,30}$/.test(handle)) {
    return {
      url: `https://www.instagram.com/${handle}`,
      handle
    };
  }

  return { url: '', handle: '' };
}

function stopOverlayMessages() {
  overlayTimers.forEach(clearTimeout);
  overlayTimers = [];
}

function setOverlayText(text) {
  const overlay = qs('overlay');
  const textEl = overlay?.querySelector('.loader-text');
  if (textEl) textEl.textContent = text || 'Carregando...';
}

function showOverlay(text = 'Carregando...') {
  const overlay = qs('overlay');
  const textEl = overlay?.querySelector('.loader-text');
  if (textEl) textEl.textContent = text;
  if (overlay) overlay.style.display = 'flex';
}

function hideOverlay() {
  stopOverlayMessages();
  const overlay = qs('overlay');
  if (overlay) overlay.style.display = 'none';
}

function startOverlayMessages(customSteps = OVERLAY_STEPS) {
  stopOverlayMessages();
  const first = customSteps?.[0]?.msg || 'Enviando...';
  showOverlay(first);

  overlayTimers = (customSteps || []).map((step) => {
    return setTimeout(() => {
      setOverlayText(step.msg);
    }, Math.max(0, Number(step.after) || 0));
  });
}

function denyAccess(message, url = 'index.html') {
  showOverlay(message);
  setTimeout(() => {
    window.location.href = url;
  }, 1200);
}

async function checkAuth() {
  const chave = (localStorage.getItem('chave') || '').trim();

  if (!chave) {
    denyAccess('Faça login primeiro.', 'index.html');
    return false;
  }

  try {
    showOverlay('Verificando acesso...');

    const url = `${AUTH_URL}?chave=${encodeURIComponent(chave)}&pagina=${encodeURIComponent(PAGINA)}&v=${Date.now()}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data || !data.permitido) {
      denyAccess('Você não tem permissão para acessar esta página.', 'index.html');
      return false;
    }

    hideOverlay();
    return true;
  } catch (e) {
    denyAccess('Falha de rede. Faça login novamente.', 'index.html');
    return false;
  }
}

function updateWizardHeader() {
  const count = qs('wizardStepCount');
  const title = qs('wizardStepTitle');

  if (wizardDone) {
    if (count) count.textContent = '';
    if (title) title.textContent = 'PRONTO!';
    return;
  }

  const stepEl = steps[currentStep - 1];
  const stepTitle = stepEl?.dataset?.title || '';

  if (count) count.textContent = `ETAPA ${currentStep} DE ${totalSteps}`;
  if (title) title.textContent = stepTitle.toUpperCase();
}

function showStep(stepNumber) {
  if (stepNumber < 1 || stepNumber > totalSteps) return;

  steps.forEach(s => s.classList.remove('active'));
  currentStep = stepNumber;

  const step = steps[currentStep - 1];
  if (step) step.classList.add('active');

  if (currentStep === 4) {
    gerarPost();
  }

  if (currentStep === 5) {
    updateConfirmPreview();
  }

  if (currentStep === 6) {
    buildReview();
  }

  updateWizardHeader();
  refreshStepButtons(currentStep);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
  const required = REQUIRED_BY_STEP[step] || [];
  let isValid = true;

  for (const id of required) {
    const el = qs(id);
    if (!el) continue;

    if (el.type === 'file') {
      if (!el.files || !el.files.length) {
        showFieldError(id, 'Envie um arquivo.');
        isValid = false;
      } else {
        showFieldError(id, '');
      }
    } else {
      const value = (el.value || '').trim();
      if (!value) {
        showFieldError(id, 'Preencha este campo.');
        isValid = false;
      } else {
        showFieldError(id, '');
      }
    }
  }

  const insta = qs('insta');
  if (step === 2 && insta) {
    const norm = normalizeInstagram(insta.value);
    if (!norm.url) {
      showFieldError('insta', 'Digite um Instagram válido.');
      isValid = false;
    }
  }

  refreshStepButtons(step);
  return isValid;
}

function validateStepSilently(step) {
  const required = REQUIRED_BY_STEP[step] || [];

  for (const id of required) {
    const el = qs(id);
    if (!el) continue;

    if (el.type === 'file') {
      if (!el.files || !el.files.length) return false;
    } else {
      const value = (el.value || '').trim();
      if (!value) return false;
    }
  }

  if (step === 2) {
    const insta = qs('insta');
    if (!insta) return false;
    const norm = normalizeInstagram(insta.value);
    if (!norm.url) return false;
  }

  return true;
}

function getStepNextButton(step) {
  const stepEl = document.getElementById(`step${step}`);
  if (!stepEl) return null;
  return stepEl.querySelector('[data-next]');
}

function refreshStepButtons(step = currentStep) {
  const nextBtn = getStepNextButton(step);
  if (!nextBtn) return;

  const isValid = validateStepSilently(step);
  nextBtn.disabled = !isValid;
}

function initCanvas() {
  if (!canvas || !ctx) return;

  frameImg.onload = () => {
    frameLoaded = true;
    frameError = false;
    gerarPost();
  };

  frameImg.onerror = () => {
    frameLoaded = false;
    frameError = true;
    console.error('Não foi possível carregar assets/lancamento.png');

    const msg = qs('mensagem');
    if (msg) {
      msg.textContent = '❌ Não foi possível carregar a moldura do post.';
      msg.style.color = 'red';
      msg.style.display = 'block';
    }
  };

  frameImg.src = 'assets/lancamento.png';

  const fotoInput = qs('imagemDivulgacao');
  if (fotoInput) {
    fotoInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        userImgLoaded = false;
        gerarPost();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        userImg.onload = () => {
          userImgLoaded = true;
          gerarPost();
        };
        userImg.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  ['imgScale', 'imgX', 'imgY'].forEach(id => {
    const input = qs(id);
    if (!input) return;

    input.addEventListener('input', () => {
      state[id] = Number(input.value || 0);
      gerarPost();
    });
  });

  document.fonts?.ready?.then(() => {
    fontsReady = true;
    gerarPost();
  });
}

function drawCoverImage(img, xOffset, yOffset, scale) {
  const cw = canvas.width;
  const ch = canvas.height;

  const iw = img.width;
  const ih = img.height;

  const baseScale = Math.max(cw / iw, ch / ih);
  const finalScale = baseScale * scale;

  const dw = iw * finalScale;
  const dh = ih * finalScale;

  const dx = (cw - dw) / 2 + xOffset;
  const dy = (ch - dh) / 2 - 100 + yOffset;

  ctx.drawImage(img, dx, dy, dw, dh);
}

function getFittedFont(fontBaseSize, fontMinSize, fontFamily, text, maxWidth) {
  let size = Number(fontBaseSize || 80);
  const min = Number(fontMinSize || 18);
  let font = `700 ${size}px ${fontFamily}`;
  ctx.font = font;

  while (ctx.measureText(text).width > maxWidth && size > min) {
    size -= 2;
    font = `700 ${size}px ${fontFamily}`;
    ctx.font = font;
  }

  return {
    font,
    size
  };
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

function drawPlaquinhaCanvas(c, text, x, y, scale = 0.42, maxWidth = 940) {
  const value = String(text || '').trim();
  if (!value) return;

  const s = scale;

  const PADDING_X = 28 * s;
  const PADDING_Y = 18 * s;
  const BORDER = 5 * s;
  const RADIUS = 6 * s;
  const SHADOW_X = -7 * s;
  const SHADOW_Y = 5 * s;
  const LIMIT = maxWidth * s;

  let fontSize = 64 * s;
  c.font = `700 ${fontSize}px "Comic Relief", Arial, sans-serif`;
  if (!fontsReady) c.font = `700 ${fontSize}px Arial, sans-serif`;

  let metrics = c.measureText(value);
  while (metrics.width > LIMIT && fontSize > 16 * s) {
    fontSize -= 2;
    c.font = `700 ${fontSize}px "Comic Relief", Arial, sans-serif`;
    if (!fontsReady) c.font = `700 ${fontSize}px Arial, sans-serif`;
    metrics = c.measureText(value);
  }

  const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.8;
  const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.2;
  const textH = ascent + descent;

  const rectW = Math.ceil(metrics.width + PADDING_X * 2);
  const rectH = Math.ceil(textH + PADDING_Y * 2);

 const leftX = x;

  drawRoundedRect(c, leftX + SHADOW_X, y + SHADOW_Y, rectW, rectH, RADIUS);
  c.fillStyle = '#000';
  c.fill();

  drawRoundedRect(c, leftX, y, rectW, rectH, RADIUS);
  c.fillStyle = '#ffd400';
  c.fill();

  c.lineWidth = BORDER;
  c.strokeStyle = '#000';
  c.stroke();

  c.fillStyle = '#111';
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  const textX = leftX + PADDING_X;
  const textY = y + (rectH - textH) / 2 + ascent;
  c.fillText(value, textX, textY);
}

function drawStyledTitle(text, cfg) {
  const value = String(text || '').trim();
  if (!value) return null;

  ctx.save();

  const fitted = getFittedFont(
    cfg.fontBaseSize,
    cfg.fontMinSize,
    cfg.fontFamily,
    value,
    cfg.maxWidth || 9999
  );

  ctx.font = fitted.font;
  ctx.textAlign = cfg.textAlign || 'center';
  ctx.textBaseline = cfg.textBaseline || 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;

  const x = cfg.x;
  const y = cfg.y;

  ctx.fillStyle = cfg.yellowFill;
  for (const sideX of cfg.yellowSideOffsets) {
    for (const downY of cfg.yellowLayers) {
      ctx.fillText(value, x + sideX, y + cfg.yellowOffsetY + downY);
    }
  }

  const dynamicOuterStroke = Math.max(6, fitted.size * 0.12);
  const dynamicInnerStroke = Math.max(3, fitted.size * 0.07);
  const dynamicShadow = fitted.size * 0.06;

  ctx.lineWidth = dynamicOuterStroke;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(value, x, y + 2);

  ctx.lineWidth = dynamicInnerStroke;
  ctx.strokeStyle = cfg.frontStroke;
  ctx.strokeText(value, x, y);

  ctx.fillStyle = cfg.frontFill;
  ctx.fillText(value, x, y);

  ctx.fillStyle = cfg.frontFill;
  ctx.shadowColor = cfg.innerShadowColor;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = dynamicShadow;
  ctx.fillText(value, x, y);

  ctx.restore();
  return fitted.size;
}

function drawTextOverlay() {
  const obra = (qs('obra')?.value || '').trim();
  const nome = (qs('nome')?.value || '').trim();

  const finalTitleSize = drawStyledTitle(obra, PREVIEW_CONFIG.obra);

  if (nome) {
    const baseFont = PREVIEW_CONFIG.obra.fontBaseSize;
    const sizeDiff = Math.max(0, baseFont - (finalTitleSize || baseFont));

    const dynamicPlaquinhaY = PREVIEW_CONFIG.nomePlaquinha.y + (sizeDiff * 0.5);

    drawPlaquinhaCanvas(
      ctx,
      nome,
      PREVIEW_CONFIG.nomePlaquinha.x,
      dynamicPlaquinhaY,
      PREVIEW_CONFIG.nomePlaquinha.scale,
      PREVIEW_CONFIG.nomePlaquinha.maxWidth
    );
  }
}

function gerarPost() {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#f1f1f1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (userImgLoaded) {
    drawCoverImage(userImg, state.imgX, state.imgY, state.imgScale);
  }

  if (frameLoaded) {
    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
  }
// DEBUG HITBOX
//ctx.strokeStyle = 'red';
//ctx.lineWidth = 2;
//ctx.strokeRect(25, 1113 - 40, 715, 80);
  drawTextOverlay();
}

function updateConfirmPreview() {
  const img = qs('confirmPreview');
  if (!img || !canvas) return;
  img.src = canvas.toDataURL('image/png');
}

function buildReview() {
  const box = qs('review-list');
  if (!box) return;

  const nome = (qs('nome')?.value || '').trim() || '—';
  const insta = (qs('insta')?.value || '').trim() || '—';
  const obra = (qs('obra')?.value || '').trim() || '—';
  const descricao = (qs('descricao')?.value || '').trim() || '—';

  box.innerHTML = `
    <div class="review-item">
      <span class="review-label">Nome:</span>
      <div class="review-value">${escapeHtml(nome)}</div>
    </div>
    <div class="review-item">
      <span class="review-label">Instagram:</span>
      <div class="review-value">${escapeHtml(insta)}</div>
    </div>
    <div class="review-item">
      <span class="review-label">Obra:</span>
      <div class="review-value">${escapeHtml(obra)}</div>
    </div>
    <div class="review-item">
      <span class="review-label">Descrição:</span>
      <div class="review-value">${escapeHtml(descricao)}</div>
    </div>
  `;
}

function buildCaptionFromForm() {
  const obra = (qs('obra')?.value || '').trim();
  const descricao = (qs('descricao')?.value || '').trim();

  return [
    'Lançamento no @comicmarketbrasil 2026!!!',
    '',
    `${obra}:`,
    descricao,
    '',
    '🎟️ Mais informações e ingressos:',
    'comicmarketbrasil.com.br',
    '',
    '📍 FAPCOM – Vila Mariana, São Paulo',
    'Dia 16 e 17 de agosto',
    '',
    '#ComicMarketBrasil #QuadrinhosNacionais #CMB #evento #quadrinhos'
  ].join('\n');
}

function getCanvasBlob() {
  return new Promise((resolve) => {
    if (!canvas) return resolve(null);
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

async function shareNative() {
  const text = (qs('captionBox')?.value || '').trim() || buildCaptionFromForm();

  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch (e) {}

  try {
    const blob = await getCanvasBlob();

    if (blob && window.File && navigator.canShare) {
      const file = new File([blob], 'lancamento-cmb-2026.png', { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ text, files: [file] });
      } else if (navigator.share) {
        await navigator.share({ text });
      } else {
        throw new Error('Web Share não suportado');
      }
    } else if (navigator.share) {
      await navigator.share({ text });
    } else {
      throw new Error('Web Share não suportado');
    }
  } catch (err) {
    alert('Seu navegador não suporta compartilhamento direto. A legenda já foi copiada; compartilhe a imagem e cole o texto.');
    return;
  }

  const btn = qs('btnShareNative');
  if (btn) {
    const old = btn.textContent;
    btn.textContent = copied ? 'Compartilhar (texto copiado ✔)' : 'Compartilhar';

      setTimeout(() => (btn.textContent = old), 1800);
  }
}

function baixarImagem() {
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = 'lancamento-cmb-2026.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  const wrap = qs('captionWrap');
  const box = qs('captionBox');

  if (box) box.value = buildCaptionFromForm();
  if (wrap) wrap.style.display = 'block';
}

async function enviarParaGoogle() {
  const nome = (qs('nome')?.value || '').trim();
  const instaRaw = (qs('insta')?.value || '').trim();
  const instaNorm = normalizeInstagram(instaRaw);
  const insta = instaNorm.url;

  const obra = (qs('obra')?.value || '').trim();
  const descricao = (qs('descricao')?.value || '').trim();

  const fotoInput = qs('imagemDivulgacao');
  const btnEnviar = qs('botao-enviar');

  if (!nome || !insta || !obra || !descricao || !fotoInput?.files?.length) {
    const msg = qs('mensagemFinalDados');
    if (msg) {
      msg.textContent = '❌ Preencha os campos obrigatórios.';
      msg.style.color = 'red';
      msg.style.display = 'block';
    }
    return;
  }

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => res(r.result);
    r.onerror = rej;
  });

  try {
    if (btnEnviar) {
      btnEnviar.disabled = true;
      btnEnviar.textContent = 'Enviando...';
    }

    const file = fotoInput.files[0];
    const b64 = await toBase64(file);

    const imagemB64 = {
      name: file.name,
      type: file.type,
      content: b64.split(',')[1]
    };

    let previewBase64 = null;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      previewBase64 = {
        name: 'preview.png',
        type: 'image/png',
        content: dataURL.split(',')[1]
      };
    }

    const dados = {
      nome,
      insta,
      obra,
      descricao,
      legenda: buildCaptionFromForm(),
      imagemDivulgacao: imagemB64,
      preview: previewBase64
    };

    startOverlayMessages();

    const response = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(dados)
    });

    const raw = await response.text();
    console.log('Resposta do Apps Script:', raw);

    let result;
    try {
      result = JSON.parse(raw);
    } catch (e) {
      throw new Error('Resposta inválida do Apps Script: ' + raw);
    }

    const msg = qs('mensagemFinalDados');
    if (msg) msg.style.display = 'block';

    if (result.status === 'success') {
      if (msg) {
        msg.textContent = '✅ Enviado com sucesso!';
        msg.style.color = 'green';
      }
      hideOverlay();
      showFinalScreen();
    } else {
      hideOverlay();
      if (msg) {
        msg.textContent = '❌ Erro ao enviar: ' + (result.message || 'Tente novamente.');
        msg.style.color = 'red';
      }

      if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Confirmar e finalizar';
      }
    }
  } catch (err) {
    hideOverlay();

    const msg = qs('mensagemFinalDados');
    if (msg) {
      msg.textContent = '❌ ' + err.message;
      msg.style.color = 'red';
      msg.style.display = 'block';
    }

    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Confirmar e finalizar';
    }

    console.error(err);
  }
}

function showFinalScreen() {
  wizardDone = true;

  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

  const final = qs('final-screen');
  if (final) final.style.display = 'block';

  const fp = qs('finalPreview');
  if (fp && canvas) {
    fp.src = canvas.toDataURL('image/png');
    fp.style.display = 'block';
  }

  const count = qs('wizardStepCount');
  if (count) count.style.display = 'none';

  updateWizardHeader();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToMenu() {
  const base = location.href.replace(/[^/]+$/, '');
  window.location.href = base + 'index.html?back=1';
}

document.addEventListener('DOMContentLoaded', async () => {
  showOverlay('Verificando acesso...');

  const autorizado = await checkAuth();
  if (!autorizado) return;

  const isWizardPage =
    !!document.querySelector('.step') &&
    !!document.getElementById('wizardStepCount');

  if (!isWizardPage) {
    hideOverlay();
    return;
  }

  steps = Array.from(document.querySelectorAll('.step'));
  totalSteps = steps.length;

  initCanvas();
  updateWizardHeader();

  document.addEventListener('click', (e) => {
    if (wizardDone) return;

    if (e.target.matches('[data-next]')) {
      if (!validateStep(currentStep)) return;
      showStep(currentStep + 1);
    }

    if (e.target.matches('[data-prev]')) {
      showStep(currentStep - 1);
    }
  });

  ['nome', 'insta', 'obra', 'descricao'].forEach(id => {
    const el = qs(id);
    if (!el) return;

    el.addEventListener('input', () => {
      showFieldError(id, '');
      refreshStepButtons(currentStep);

      if (id === 'nome' || id === 'obra') {
        gerarPost();
      }
    });

    el.addEventListener('change', () => {
      showFieldError(id, '');
      refreshStepButtons(currentStep);

      if (id === 'nome' || id === 'obra') {
        gerarPost();
      }
    });

    el.addEventListener('blur', () => {
      refreshStepButtons(currentStep);
    });
  });

  const instaInput = qs('insta');
  if (instaInput) {
    const applyInstagramNormalization = () => {
      const norm = normalizeInstagram(instaInput.value);
      if (norm.url) {
        instaInput.value = norm.url;
        showFieldError('insta', '');
      } else if ((instaInput.value || '').trim()) {
        showFieldError('insta', 'Digite um Instagram válido.');
      }
      refreshStepButtons(currentStep);
    };

    instaInput.addEventListener('blur', applyInstagramNormalization);
    instaInput.addEventListener('change', applyInstagramNormalization);
  }

  const fotoInput = qs('imagemDivulgacao');
  if (fotoInput) {
    fotoInput.addEventListener('change', () => {
      showFieldError('imagemDivulgacao', '');
      refreshStepButtons(currentStep);
    });
  }

  const btnCopy = qs('btnCopyCaption');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      const box = qs('captionBox');
      if (!box) return;

      try {
        await navigator.clipboard.writeText(box.value);
        btnCopy.textContent = 'Copiado ✔';
        setTimeout(() => btnCopy.textContent = 'Copiar', 1500);
      } catch (e) {
        box.select();
        document.execCommand('copy');
        btnCopy.textContent = 'Copiado ✔';
        setTimeout(() => btnCopy.textContent = 'Copiar', 1500);
      }
    });
  }

  const btnShare = qs('btnShareNative');
  if (btnShare) btnShare.addEventListener('click', shareNative);

  showStep(1);
  hideOverlay();
});

window.goToMenu = goToMenu;
window.enviarParaGoogle = enviarParaGoogle;
window.baixarImagem = baixarImagem;
