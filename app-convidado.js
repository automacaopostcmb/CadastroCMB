const AUTH_URL = 'https://script.google.com/macros/s/AKfycbyMbkkFdzYC_BfMsi5WKW6xbOKdjbNbW635vovOLYHGXdso2S_1a2Wdfvur790y0BM46g/exec';
const SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby-u-jy3rrb3bE-1MwqL-ecD9-bNnRMinetfUrA8qNaVReX2fp6uV6jxsy2mLPSEWZf/exec';
const PAGINA = 'convidado';

let steps = [];
let currentStep = 1;
let totalSteps = 9;
let wizardDone = false;

const canvas = document.getElementById('canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const userImg = new Image();
let userImgLoaded = false;

const frameImg = new Image();
let frameLoaded = false;
let frameError = false;

const state = {
  imgScale: 1.2,
  imgX: 0,
  imgY: 0
};

/*
  ============================================
  AJUSTE DE POSIÇÃO E TAMANHO SÓ POR CÓDIGO
  ============================================
*/
const TEXT_LAYOUT = {
  nome: {
    x: 540,
    y: 1035,
    font: '700 88px "Fredoka", "Comic Relief", sans-serif',
    maxWidth: 860,

    frontFill: '#f3f3f3',
    frontStroke: '#000000',
    frontStrokeWidth: 10,

    yellowFill: '#f3b233',
    yellowOffsetY: 8,
    yellowLayers: [4, 8, 12, 16, 20],
    yellowSideOffsets: [-6, -3, 0, 3, 6],

    innerShadowColor: '#777777',
    innerShadowOffsetY: 6,

    textAlign: 'center',
    textBaseline: 'middle'
  },

  rotulo: {
    x: 540,
    y: 1130,
    font: '700 46px "Fredoka", "Comic Relief", sans-serif',
    maxWidth: 760,
    fillStyle: '#000000',
    textAlign: 'center',
    textBaseline: 'middle'
  }
};

const REQUIRED_BY_STEP = {
  1: [],
  2: ['nome', 'rotulo'],
  3: ['biografia'],
  4: ['dia'],
  5: [],
  6: ['fotoDivulgacao'],
  7: [],
  8: [],
  9: []
};

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

function showOverlay(text = 'Carregando...') {
  const overlay = qs('overlay');
  const textEl = overlay?.querySelector('.loader-text');
  if (textEl) textEl.textContent = text;
  if (overlay) overlay.style.display = 'flex';
}

function hideOverlay() {
  const overlay = qs('overlay');
  if (overlay) overlay.style.display = 'none';
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

  if (currentStep === 7) {
    gerarPost();
  }

  if (currentStep === 8) {
    updateConfirmPreview();
  }

  if (currentStep === 9) {
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
    console.error('Não foi possível carregar assets/convidado.png');

    const msg = qs('mensagem');
    if (msg) {
      msg.textContent = '❌ Não foi possível carregar a moldura do post.';
      msg.style.color = 'red';
      msg.style.display = 'block';
    }
  };

  frameImg.src = 'assets/convidado.png';

  const fotoInput = qs('fotoDivulgacao');
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

function fitTextToWidth(text, font, maxWidth) {
  if (!ctx) return font;

  const match = String(font).match(/(\d+)px/);
  if (!match) return font;

  let size = Number(match[1]);
  const minSize = 18;
  let currentFont = font;

  ctx.font = currentFont;

  while (ctx.measureText(text).width > maxWidth && size > minSize) {
    size -= 2;
    currentFont = font.replace(/\d+px/, `${size}px`);
    ctx.font = currentFont;
  }

  return currentFont;
}

function drawNomeEstilizado(text, cfg) {
  const value = String(text || '').trim();
  if (!value) return;

  ctx.save();

  const finalFont = fitTextToWidth(value, cfg.font, cfg.maxWidth || 9999);
  ctx.font = finalFont;
  ctx.textAlign = cfg.textAlign || 'center';
  ctx.textBaseline = cfg.textBaseline || 'middle';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.miterLimit = 2;

  const x = cfg.x;
  const y = cfg.y;

  // camada amarela de volume para baixo
  ctx.fillStyle = cfg.yellowFill;

  for (const sideX of cfg.yellowSideOffsets) {
    for (const downY of cfg.yellowLayers) {
      ctx.fillText(
        value,
        x + sideX,
        y + cfg.yellowOffsetY + downY
      );
    }
  }

  // camada preta grossa
  ctx.lineWidth = cfg.frontStrokeWidth + 10;
  ctx.strokeStyle = '#000000';
  ctx.strokeText(value, x, y + 2);

  // camada branca com contorno preto
  ctx.lineWidth = cfg.frontStrokeWidth;
  ctx.strokeStyle = cfg.frontStroke;
  ctx.strokeText(value, x, y);

  ctx.fillStyle = cfg.frontFill;
  ctx.fillText(value, x, y);

  // branco interno com sombra cinza leve
  ctx.fillStyle = cfg.frontFill;
  ctx.shadowColor = cfg.innerShadowColor;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = cfg.innerShadowOffsetY;
  ctx.fillText(value, x, y);

  ctx.restore();
}

function drawRotuloSimples(text, cfg) {
  const value = String(text || '').trim();
  if (!value) return;

  ctx.save();

  const finalFont = fitTextToWidth(value, cfg.font, cfg.maxWidth || 9999);
  ctx.font = finalFont;
  ctx.textAlign = cfg.textAlign || 'center';
  ctx.textBaseline = cfg.textBaseline || 'middle';
  ctx.fillStyle = cfg.fillStyle || '#000000';

  ctx.fillText(value, cfg.x, cfg.y);

  ctx.restore();
}

function drawTextOverlay() {
  const nome = (qs('nome')?.value || '').trim();
  const rotulo = (qs('rotulo')?.value || '').trim();

  drawNomeEstilizado(nome, TEXT_LAYOUT.nome);
  drawRotuloSimples(rotulo, TEXT_LAYOUT.rotulo);
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

  drawTextOverlay();
}

function updateConfirmPreview() {
  const img = qs('confirmPreview');
  if (!img || !canvas) return;
  img.src = canvas.toDataURL('image/png');
}

function formatDiaLegenda(valor) {
  const dia = String(valor || '').trim();

  if (dia === 'Sábado') return 'no sábado';
  if (dia === 'Domingo') return 'no domingo';
  if (dia === 'Os dois') return 'no sábado e domingo';

  return 'no CMB 2026';
}

function buildReview() {
  const box = qs('review-list');
  if (!box) return;

  const nome = (qs('nome')?.value || '').trim() || '—';
  const rotulo = (qs('rotulo')?.value || '').trim() || '—';
  const biografia = (qs('biografia')?.value || '').trim() || '—';
  const dia = (qs('dia')?.value || '').trim() || '—';
  const estande = (qs('estande')?.value || '').trim() || '—';
  const estandeInsta = (qs('estandeInsta')?.value || '').trim() || '—';

  box.innerHTML = `
    <div class="review-item">
      <span class="review-label">Nome:</span>
      <div class="review-value">${escapeHtml(nome)}</div>
    </div>
    <div class="review-item">
      <span class="review-label">Rótulo:</span>
      <div class="review-value">${escapeHtml(rotulo)}</div>
    </div>
    <div class="review-item">
      <span class="review-label">Biografia:</span>
      <div class="review-value">${escapeHtml(biografia)}</div>
    </div>
    <div class="review-item">
      <span class="review-label">Dia:</span>
      <div class="review-value">${escapeHtml(dia)}</div>
    </div>
    <div class="review-item">
      <span class="review-label">Estande:</span>
      <div class="review-value">${escapeHtml(estande)}</div>
    </div>
    <div class="review-item">
      <span class="review-label">Instagram do estande:</span>
      <div class="review-value">${escapeHtml(estandeInsta)}</div>
    </div>
  `;
}

function buildCaptionFromForm() {
  const nome = (qs('nome')?.value || '').trim();
  const rotulo = (qs('rotulo')?.value || '').trim();
  const biografia = (qs('biografia')?.value || '').trim();
  const dia = (qs('dia')?.value || '').trim();
  const estande = (qs('estande')?.value || '').trim();
  const estandeInsta = (qs('estandeInsta')?.value || '').trim();

  const diaTexto = formatDiaLegenda(dia);

  let primeiraLinha = `Estarei no @comicmarketbrasil ${diaTexto}!`;

  if (estande) {
    if (estandeInsta) {
      primeiraLinha += ` A convite do ${estande} ${estandeInsta}.`;
    } else {
      primeiraLinha += ` A convite do ${estande}.`;
    }
  }

  const blocoIdentidade = [nome, rotulo].filter(Boolean).join(' — ');

  return [
    primeiraLinha,
    '',
    blocoIdentidade,
    '',
    biografia,
    '',
    '📍 FAPCOM – Vila Mariana, São Paulo',
    '📅 Dias 15 e 16 de agosto de 2026',
    '',
    '🎟️ Mais informações e ingressos:',
    'comicmarketbrasil.com.br',
    '',
    '#ComicMarketBrasil #QuadrinhosNacionais #QuadrinhosBrasileiros #hqbr #mangabr #historiaemquadrinhos #desenhistabrasileiro #ilustradorbrasileiro #fapcom'
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
      const file = new File([blob], 'convidado-cmb-2026.png', { type: 'image/png' });

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
  link.download = 'convidado-cmb-2026.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  const wrap = qs('captionWrap');
  const box = qs('captionBox');

  if (box) box.value = buildCaptionFromForm();
  if (wrap) wrap.style.display = 'block';
}

async function enviarParaGoogle() {
  const nome = (qs('nome')?.value || '').trim();
  const rotulo = (qs('rotulo')?.value || '').trim();
  const biografia = (qs('biografia')?.value || '').trim();
  const dia = (qs('dia')?.value || '').trim();
  const estande = (qs('estande')?.value || '').trim();
  const estandeInsta = (qs('estandeInsta')?.value || '').trim();
  const fotoInput = qs('fotoDivulgacao');

  if (!nome || !rotulo || !biografia || !dia || !fotoInput?.files?.length) {
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
      rotulo,
      biografia,
      dia,
      estande,
      estandeInsta,
      legenda: buildCaptionFromForm(),
      fotoDivulgacao: imagemB64,
      preview: previewBase64
    };

    showOverlay('Finalizando...');

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
    }
  } catch (err) {
    hideOverlay();

    const msg = qs('mensagemFinalDados');
    if (msg) {
      msg.textContent = '❌ ' + err.message;
      msg.style.color = 'red';
      msg.style.display = 'block';
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
  const isWizardPage =
    !!document.querySelector('.step') &&
    !!document.getElementById('wizardStepCount');

  if (!isWizardPage) return;

  showOverlay('Verificando acesso...');

  const autorizado = await checkAuth();
  if (!autorizado) return;

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

  ['nome', 'rotulo', 'biografia', 'dia', 'estande', 'estandeInsta'].forEach(id => {
    const el = qs(id);
    if (!el) return;

    el.addEventListener('input', () => {
      showFieldError(id, '');
      refreshStepButtons(currentStep);

      if (id === 'nome' || id === 'rotulo') {
        gerarPost();
      }
    });

    el.addEventListener('change', () => {
      showFieldError(id, '');
      refreshStepButtons(currentStep);

      if (id === 'nome' || id === 'rotulo') {
        gerarPost();
      }
    });

    el.addEventListener('blur', () => {
      refreshStepButtons(currentStep);
    });
  });

  const fotoInput = qs('fotoDivulgacao');
  if (fotoInput) {
    fotoInput.addEventListener('change', () => {
      showFieldError('fotoDivulgacao', '');
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
