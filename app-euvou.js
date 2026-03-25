const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbw9g5VGrXZAcTVPcfl0sIIRhPMOlzTI8_hx053Nv2YPwRtJLAhBwBgN3GCBCtRA9dMC/exec';
const PAGINA = 'euvou';

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
frameImg.src = 'assets/euvou.png';

const state = {
  imgScale: 1.2,
  imgX: 0,
  imgY: 0
};

const REQUIRED_BY_STEP = {
  1: [],
  2: ['nomeArtistico'],
  3: ['fotoDivulgacao'],
  4: ['biografia'],
  5: [],
  6: []
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

function blockAndRedirect(message, url) {
  alert(message);
  window.location.href = url || 'index.html';
}

async function checkAuth() {
  const chave = (localStorage.getItem('chave') || '').trim();

  if (!chave) {
    blockAndRedirect('Faça login primeiro.', 'index.html');
    return;
  }

  try {
    const url = `${WEBAPP_URL}?chave=${encodeURIComponent(chave)}&pagina=${encodeURIComponent(PAGINA)}&v=${Date.now()}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.permitido) {
      blockAndRedirect('Você não tem permissão para acessar esta página.', 'index.html');
    }
  } catch (e) {
    blockAndRedirect('Falha de rede. Faça login novamente.', 'index.html');
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

  if (currentStep === 5) {
    gerarPost();
  }

  if (currentStep === 6) {
    updateConfirmPreview();
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
function initCanvas() {
  if (!canvas || !ctx) return;

  frameImg.onload = () => {
    frameLoaded = true;
    gerarPost();
  };

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
}

function updateConfirmPreview() {
  const img = qs('confirmPreview');
  if (!img || !canvas) return;
  img.src = canvas.toDataURL('image/png');
}

function buildReview() {
  const box = qs('review-list');
  if (!box) return;

  const nomeArtistico = (qs('nomeArtistico')?.value || '').trim() || '—';
  const biografia = (qs('biografia')?.value || '').trim() || '—';

  box.innerHTML = `
    <div class="review-item">
      <span class="review-label">Nome de divulgação:</span>
      <div class="review-value">${escapeHtml(nomeArtistico)}</div>
    </div>
    <div class="review-item">
      <span class="review-label">Biografia:</span>
      <div class="review-value">${escapeHtml(biografia)}</div>
    </div>
  `;
}

function buildCaptionFromForm() {
  const biografia = (qs('biografia')?.value || '').trim();
  
const head = `Eu vou para o CMB 2026!!! @comicmarketbrasil!`;

const body = biografia;

return [
  head,
  '',
  body,
  '',
  '📍 FAPCOM – Vila Mariana, São Paulo',
  '📅 Dias 15 e 16 de agosto de 2026',
  '',
  '🎟️ Mais informações e ingressos:',
  'comicmarketbrasil.com.br',
  '',
  '#ComicMarketBrasil #CMB #QuadrinhosBrasileiros #quadrinhos #evento'
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
      const file = new File([blob], 'eu-vou-cmb-2026.png', { type: 'image/png' });

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
  link.download = 'eu-vou-cmb-2026.png';
  link.href = canvas.toDataURL('image/png');
  link.click();

  const wrap = qs('captionWrap');
  const box = qs('captionBox');

  if (box) box.value = buildCaptionFromForm();
  if (wrap) wrap.style.display = 'block';
}

async function enviarParaGoogle() {
  const msg = qs('mensagem');
  const overlay = qs('overlay');

  if (!validateStep(6)) return;

  const nomeArtistico = (qs('nomeArtistico')?.value || '').trim();
  const biografia = (qs('biografia')?.value || '').trim();
  const foto = qs('fotoDivulgacao')?.files?.[0];

  if (!nomeArtistico || !biografia || !foto) {
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
    if (overlay) overlay.style.display = 'flex';

    const fotoB64 = await toBase64(foto);
    const previewURL = canvas.toDataURL('image/png');

    const payload = {
      nomeArtistico,
      biografia,
      legenda: buildCaptionFromForm(),
      fotoDivulgacao: {
        name: foto.name,
        type: foto.type,
        content: fotoB64.split(',')[1]
      },
      preview: {
        name: 'preview.png',
        type: 'image/png',
        content: previewURL.split(',')[1]
      }
    };

    const resp = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();

    if (data.status === 'success') {
      showFinalScreen();
    } else {
      throw new Error(data.message || 'Erro ao enviar.');
    }
  } catch (err) {
    if (msg) {
      msg.textContent = '❌ Erro ao enviar. Tente novamente.';
      msg.style.color = 'red';
      msg.style.display = 'block';
    }
    console.error(err);
  } finally {
    if (overlay) overlay.style.display = 'none';
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

document.addEventListener('DOMContentLoaded', () => {
  const isWizardPage =
    !!document.querySelector('.step') &&
    !!document.getElementById('wizardStepCount');

  if (!isWizardPage) return;

  steps = Array.from(document.querySelectorAll('.step'));
  totalSteps = steps.length;

  initCanvas();
  checkAuth();
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

  ['nomeArtistico', 'biografia'].forEach(id => {
    const el = qs(id);
    if (!el) return;

    el.addEventListener('input', () => {
      showFieldError(id, '');
      refreshStepButtons(currentStep);
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
});

window.goToMenu = goToMenu;
window.enviarParaGoogle = enviarParaGoogle;
window.baixarImagem = baixarImagem;
